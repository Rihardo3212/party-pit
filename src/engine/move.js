// Move games: party games played by moving your phone (shake, spin, tilt, blow, swing...).
// One engine runs all of them; the mode id is the game. Every phone measures its own motion and
// sends a score (higher is better) plus a label, so wifi lag doesn't matter. The big screen ranks them.
// Three games need the big screen to referee: High Noon (when to draw), Ping Pong (the ball), Tug of War (the rope).
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const MOVE_IDS = ['noon', 'soda', 'egg', 'spin', 'balloon', 'reel', 'pong', 'tug', 'flip', 'maze', 'beat'];

// time: how long "go" lasts on the phones (ms). kind: how the big screen shows it.
export const GAMES = {
  noon: { kind: 'noon', time: 9000, hold: 'Hold your phone down by your hip, like a holster.' },
  soda: { kind: 'lanes', time: 10000, hold: 'Grip your phone tight. Shake it like a soda can!', unit: 'fizz' },
  egg: { kind: 'lanes', time: 20000, hold: 'Hold your phone flat, like a spoon with an egg on it.' },
  spin: { kind: 'lanes', time: 10000, hold: 'Hold your phone in front of you and spin around on the spot!' },
  balloon: { kind: 'lanes', time: 15000, hold: 'Hold the bottom of your phone (the mic) near your mouth.' },
  reel: { kind: 'lanes', time: 25000, hold: 'Hold your phone like a fishing rod.' },
  pong: { kind: 'pong', time: 60000, hold: 'Hold your phone like a paddle.' },
  tug: { kind: 'tug', time: 20000, hold: 'Grip your phone with both hands, like a rope.' },
  flip: { kind: 'lanes', time: 20000, hold: 'Hold your phone flat, like a frying pan.' },
  maze: { kind: 'lanes', time: 40000, hold: 'Hold your phone flat and tilt it to roll the ball.' },
  beat: { kind: 'lanes', time: 16000, hold: 'Hold your phone ready to shake (or tap) on the beat.' }
};

export const BEAT = { bpm: 96, count: 16, lead: 4 }; // 4 count-in beats, then 16 to hit
export const FLIPS = 3;
export const EGG_TASKS = [
  'Walk to the door and back! 🚶',
  'Turn around twice! 🔄',
  'Crouch down and stand up! 🧎',
  'High five someone (gently)! 🙌',
  'Walk around a chair! 🪑',
  'Stand on one leg! 🦩'
];
export const T = { intro: 2500, ready: 6000, result: 6500, serve: 2400 };
const RANK_POINTS = [1000, 700, 500, 350, 250, 150, 100];
export const TUG = { win: 100, perPull: 7, botRate: 2.4 }; // rope moves perPull × (pulls per player difference)

const ids = (o) => Object.keys(o || {});

function waitingOn(g) {
  const v = g.state.move;
  return g.playersHere().filter((pid) => !v.res[pid]);
}

function startRound(g) {
  const s = g.state;
  const v = s.move;
  v.round += 1;
  v.res = {};
  v.prog = {};
  v.points = {};
  v.best = {};
  v.gained = {};
  v.seed = Math.floor(Math.random() * 1e9);
  v.readyUntil = g.now() + (v.round === 1 ? T.intro : 0) + T.ready;
  v.until = null;
  v.drawAt = null;
  v.ball = null;
  v.out = {};
  v.rope = 0;
  v.sides = null;
  v.winSide = null;
  s.phase = 'vready';
  g.save();
}

function startGo(g) {
  const s = g.state;
  const v = s.move;
  const now = g.now();
  const game = GAMES[v.game];
  v.goAt = now;
  v.until = now + game.time + 2500;
  if (v.game === 'noon') {
    v.drawAt = now + Math.round(2500 + Math.random() * 4000);
    v.until = v.drawAt + 4000;
  }
  if (v.game === 'pong') {
    const alive = g.playersHere();
    v.rally = 0;
    serve(g, alive[Math.floor(Math.random() * alive.length)], now + T.serve);
  }
  if (v.game === 'tug') v.sides = makeSides(g);
  s.phase = 'vgo';
  g.save();
}

// ---------- Ping Pong ----------
const pongAlive = (g) => g.playersHere().filter((p) => !g.state.move.out[p]);

function serve(g, to, hitAt) {
  const v = g.state.move;
  v.ball = { from: null, to, sentAt: g.now(), hitAt, n: v.rally || 0 };
}

function swing(g, from, input) {
  const s = g.state;
  const v = s.move;
  if (s.phase !== 'vgo' || v.game !== 'pong' || !v.ball || v.ball.to !== from) return;
  const at = Number(input.at) || g.now();
  const early = v.ball.hitAt - at;
  if (early > 500) return; // way too early: ignore (swing again)
  if (early < -380) return; // too late: the tick handles the miss
  // Hit! Send it to someone else.
  v.rally = (v.rally || 0) + 1;
  g.stat(from, 'pong');
  const alive = pongAlive(g).filter((p) => p !== from);
  const to = alive.length ? alive[Math.floor(Math.random() * alive.length)] : from; // alone: against the wall
  const flight = Math.max(850, 2000 - v.rally * 70);
  v.ball = { from, to, sentAt: g.now(), hitAt: g.now() + flight, n: v.rally };
  g.save();
}

function pongTick(g, now) {
  const v = g.state.move;
  const b = v.ball;
  if (!b) return;
  if (!g.isHere(b.to) && !v.out[b.to]) {
    // The player left: serve to someone else.
    const alive = pongAlive(g).filter((p) => p !== b.to);
    if (alive.length) { serve(g, alive[0], now + T.serve); g.save(); }
    else score(g);
    return;
  }
  if (now > b.hitAt + 380) {
    v.out[b.to] = Object.keys(v.out).length + 1;
    const alive = pongAlive(g);
    const solo = g.playersHere().length === 1;
    if (solo || alive.length <= 1) { score(g); return; }
    serve(g, alive[Math.floor(Math.random() * alive.length)], now + T.serve);
    v.rally = 0;
    v.ball.n = 0;
    g.save();
  }
}

// ---------- Tug of War ----------
// Units split into two sides. A single player pulls against Lewis.
function makeSides(g) {
  const s = g.state;
  const units = s.unitOrder.filter((u) => g.unitHere(u));
  if (units.length <= 1) return { a: units, b: ['bot'] };
  // Strongest score against the rest, alternating, so it stays fair.
  const sorted = [...units].sort((x, y) => (s.units[y].score || 0) - (s.units[x].score || 0));
  const a = [], b = [];
  sorted.forEach((u, i) => ((i % 2 === 0 ? a : b).push(u)));
  return { a, b };
}

function sideAvg(g, side) {
  const s = g.state;
  const v = s.move;
  if (side.includes('bot')) return ((g.now() - v.goAt) / 1000) * TUG.botRate;
  const pids = g.playersHere().filter((p) => side.includes(g.unitOf(p)));
  if (!pids.length) return 0;
  return pids.reduce((t, p) => t + (v.prog[p]?.p || 0), 0) / pids.length;
}

function tugTick(g, now) {
  const v = g.state.move;
  if (!v.sides || now < v.goAt) return;
  const rope = Math.max(-TUG.win, Math.min(TUG.win, (sideAvg(g, v.sides.a) - sideAvg(g, v.sides.b)) * TUG.perPull));
  if (Math.round(rope) !== Math.round(v.rope)) { v.rope = rope; g.save(); }
  if (Math.abs(rope) >= TUG.win || now >= v.goAt + GAMES.tug.time) score(g);
}

// ---------- inputs ----------
function progress(g, from, input) {
  const s = g.state;
  const v = s.move;
  if (s.phase !== 'vgo' || !g.unitOf(from) || v.res[from]) return;
  const p = Math.max(0, Math.min(v.game === 'tug' ? 9999 : 100, Number(input.p) || 0));
  v.prog[from] = { p, x: String(input.x ?? '').slice(0, 24) };
  if (v.game !== 'tug') g.save(); // tug saves from its tick
}

function result(g, from, input) {
  const s = g.state;
  const v = s.move;
  if (s.phase !== 'vgo' || !g.unitOf(from) || v.res[from] || ['pong', 'tug'].includes(v.game)) return;
  const res = { score: Math.max(-1, Math.min(1e6, Math.round(Number(input.score) || 0))), label: String(input.label || '').slice(0, 32) };
  if (input.foul) res.foul = true;
  if (v.game === 'noon' && !res.foul && g.now() < v.drawAt - 150) res.foul = true; // no cheating the clock
  v.res[from] = res;
  if (!waitingOn(g).length) score(g);
  else g.save();
}

// ---------- scoring ----------
function score(g) {
  const s = g.state;
  const v = s.move;
  v.ball = null;
  const byPlayer = {};
  if (v.game === 'tug') {
    const side = v.rope > 0 ? 'a' : v.rope < 0 ? 'b' : null;
    v.winSide = side;
    for (const pid of g.playersHere()) {
      const u = g.unitOf(pid);
      const mine = v.sides?.a.includes(u) ? 'a' : 'b';
      v.res[pid] = { score: v.prog[pid]?.p || 0, label: `${v.prog[pid]?.p || 0} pulls` };
      g.stat(pid, 'pulls', v.prog[pid]?.p || 0);
      if (side === mine) byPlayer[pid] = 1000;
      else if (!side) byPlayer[pid] = 400;
    }
  } else {
    if (v.game === 'pong') {
      const n = g.playersHere().length;
      for (const pid of g.playersHere()) {
        const o = v.out[pid];
        v.res[pid] = n === 1 ? { score: v.rally || 0, label: `${v.rally || 0} hits` } : { score: o ? o : 99, label: o ? `Out #${o}` : '🏓 Last one standing!' };
      }
    }
    const ranked = Object.entries(v.res)
      .filter(([, r]) => !r.foul && r.score >= 0)
      .sort((a, b) => b[1].score - a[1].score);
    let place = 0;
    ranked.forEach(([pid, r], i) => {
      if (i > 0 && r.score !== ranked[i - 1][1].score) place = i;
      byPlayer[pid] = v.game === 'pong' && g.playersHere().length === 1 ? Math.min(1000, r.score * 100) : RANK_POINTS[place] ?? 50;
    });
  }
  for (const [pid, pts] of Object.entries(byPlayer)) v.points[pid] = pts;
  g.statTop(byPlayer, 'moveTop');
  const best = g.awardBest(byPlayer, v.gained);
  for (const [uid, b] of Object.entries(best)) v.best[uid] = b.by;
  v.nextAt = g.now() + T.result + Math.min(3000, ids(v.res).length * 250);
  s.phase = 'vresult';
  g.save();
}

function next(g) {
  const v = g.state.move;
  if (v.round >= v.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.move = s.move ?? null;
    if (s.move) {
      const v = s.move;
      for (const k of ['res', 'prog', 'points', 'best', 'gained', 'out']) v[k] = v[k] || {};
      v.ball = v.ball ?? null;
      v.sides = v.sides ?? null;
      if (v.sides) { v.sides.a = v.sides.a || []; v.sides.b = v.sides.b || []; }
      v.rope = v.rope || 0;
      v.winSide = v.winSide ?? null;
      for (const k of ['until', 'drawAt', 'goAt', 'readyUntil', 'nextAt']) v[k] = v[k] ?? null;
    }
  },
  reset(s) { s.move = null; },
  start(g) {
    const s = g.state;
    const game = s.settings.sub || s.settings.game;
    s.move = {
      game, rounds: lengthOf(s.settings).rounds, round: 0,
      res: {}, prog: {}, points: {}, best: {}, gained: {}, out: {},
      ball: null, sides: null, rope: 0, winSide: null, rally: 0,
      until: null, drawAt: null, goAt: null, readyUntil: null, nextAt: null, seed: 0,
      tasks: shuffle(EGG_TASKS)
    };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'vprog') progress(g, from, input);
    else if (input.type === 'vres') result(g, from, input);
    else if (input.type === 'vswing') swing(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'vready') startGo(g);
    else if (s.phase === 'vgo') score(g);
    else if (s.phase === 'vresult') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const v = s.move;
    if (!v) return;
    if (s.phase === 'vready' && now >= v.readyUntil) startGo(g);
    else if (s.phase === 'vgo') {
      if (v.game === 'pong') pongTick(g, now);
      else if (v.game === 'tug') tugTick(g, now);
      if (s.phase === 'vgo' && now >= v.until) score(g);
    } else if (s.phase === 'vresult' && now >= v.nextAt) next(g);
  }
};
