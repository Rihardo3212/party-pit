// Reflex Rumble: quick micro-games on the phone. The big screen says "go", but every phone
// measures its own time and sends only the result, so wifi lag doesn't matter.
// Points by rank. In teams, everyone plays and the team's best player counts.
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const GAMES = {
  green: { name: 'Tap on green', icon: '🟢', how: 'Wait for GREEN, then tap as fast as you can. Too early = out!', better: 'low' },
  mash: { name: 'Button mash', icon: '👊', how: 'Tap the button as many times as you can in 5 seconds!', better: 'high' },
  stop5: { name: 'Stop at 5.00', icon: '⏱️', how: 'Stop the clock at exactly 5.00 seconds. The clock hides after 2!', better: 'low' },
  shake: { name: 'Shake it', icon: '📳', how: 'Shake your phone as hard as you can for 5 seconds! (No shake sensor? Tap instead.)', better: 'high' }
};
export const GAME_IDS = Object.keys(GAMES);
export const MASH_TIME = 5000;
export const SHAKE_TIME = 5000;
export const STOP_TARGET = 5000;
export const STOP_HIDE = 2000;
export const GREEN_WINDOW = 3000; // after green, how long you have to tap
export const TAP_AS_SHAKE = 12; // a tap counts as this much shake power (phones without a sensor)

export const T = { intro: 2500, ready: 4000, result: 6000 };
const RANK_POINTS = [1000, 700, 500, 350, 250, 150, 100];

// How long the round can run on the big screen (phones finish earlier).
function goTime(r) {
  if (r.game === 'green') return r.delay + GREEN_WINDOW + 2000;
  if (r.game === 'stop5') return 10000;
  return MASH_TIME + 2500;
}

// The number used for ranking. Lower is better for green and stop5.
export function rankValue(game, res) {
  if (!res || res.foul || res.miss) return null;
  if (game === 'stop5') return Math.abs(res.v - STOP_TARGET);
  return res.v;
}

export function formatResult(game, res) {
  if (!res) return '—';
  if (res.foul) return '🚫 Too early!';
  if (res.miss) return '💤 Missed';
  if (game === 'green') return `${(res.v / 1000).toFixed(3)} s`;
  if (game === 'mash') return `${res.v} taps`;
  if (game === 'stop5') {
    const d = (res.v - STOP_TARGET) / 1000;
    return `${(res.v / 1000).toFixed(2)} s (${d >= 0 ? '+' : ''}${d.toFixed(2)})`;
  }
  return `${res.v} power${res.alt ? ' (taps)' : ''}`;
}

function chooseGames(n) {
  const out = [];
  while (out.length < n) {
    const pack = shuffle(GAME_IDS);
    // No game twice in a row across packs.
    if (out.length && pack[0] === out[out.length - 1]) pack.push(pack.shift());
    out.push(...pack);
  }
  return out.slice(0, n);
}

function waitingOn(g) {
  const r = g.state.reflex;
  return g.playersHere().filter((pid) => !r.results[pid]);
}

function startRound(g) {
  const s = g.state;
  const r = s.reflex;
  r.round += 1;
  r.game = r.list[r.round - 1];
  r.delay = Math.round(1500 + Math.random() * 3500);
  r.results = {};
  r.points = {};
  r.best = {};
  r.gained = {};
  r.readyUntil = g.now() + (r.round === 1 ? T.intro : 0) + T.ready;
  s.phase = 'rready';
  g.save();
}

function startGo(g) {
  const s = g.state;
  const r = s.reflex;
  r.until = g.now() + goTime(r);
  s.phase = 'rgo';
  g.save();
}

function result(g, from, input) {
  const s = g.state;
  const r = s.reflex;
  if (s.phase !== 'rgo' || !g.unitOf(from) || r.results[from]) return;
  const v = Math.round(Number(input.v) || 0);
  const res = { v: 0 };
  if (input.foul) res.foul = true;
  else if (input.miss) res.miss = true;
  else if (r.game === 'green') { if (v < 80) res.foul = true; else res.v = Math.min(v, GREEN_WINDOW); }
  else if (r.game === 'mash') res.v = Math.max(0, Math.min(v, 150));
  else if (r.game === 'stop5') res.v = Math.max(0, Math.min(v, 20000));
  else res.v = Math.max(0, Math.min(v, 9999));
  if (r.game === 'shake' && input.alt) res.alt = true;
  r.results[from] = res;
  if (!waitingOn(g).length) score(g);
  else g.save();
}

function score(g) {
  const s = g.state;
  const r = s.reflex;
  const low = GAMES[r.game].better === 'low';
  const ranked = Object.entries(r.results)
    .map(([pid, res]) => ({ pid, x: rankValue(r.game, res) }))
    .filter((e) => e.x !== null)
    .sort((a, b) => (low ? a.x - b.x : b.x - a.x));
  const byPlayer = {};
  let place = 0;
  ranked.forEach((e, i) => {
    if (i > 0 && e.x !== ranked[i - 1].x) place = i; // ties share a place
    const pts = RANK_POINTS[place] ?? 50;
    r.points[e.pid] = pts;
    byPlayer[e.pid] = pts;
  });
  g.statTop(byPlayer, 'reflex');
  const best = g.awardBest(byPlayer, r.gained);
  for (const [uid, b] of Object.entries(best)) r.best[uid] = b.by;
  r.nextAt = g.now() + T.result + Math.min(3000, ranked.length * 250);
  s.phase = 'rresult';
  g.save();
}

function next(g) {
  const r = g.state.reflex;
  if (r.round >= r.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.reflex = s.reflex ?? null;
    if (s.reflex) {
      const r = s.reflex;
      for (const k of ['results', 'points', 'best', 'gained']) r[k] = r[k] || {};
      r.list = r.list || [];
    }
  },
  reset(s) { s.reflex = null; },
  start(g) {
    const s = g.state;
    s.reflex = { rounds: lengthOf(s.settings).rounds, round: 0, list: chooseGames(lengthOf(s.settings).rounds) };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'rres') result(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'rready') startGo(g);
    else if (s.phase === 'rgo') score(g);
    else if (s.phase === 'rresult') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const r = s.reflex;
    if (!r) return;
    if (s.phase === 'rready' && now >= r.readyUntil) startGo(g);
    else if (s.phase === 'rgo' && now >= r.until) score(g);
    else if (s.phase === 'rresult' && now >= r.nextAt) next(g);
  }
};
