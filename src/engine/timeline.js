// Timeline: put 4 (later 5) events in order, oldest first.
// Points for every card in the right spot, a bonus for a perfect order (more when it's fast).
// In teams, everyone sorts and the team scores with its best order.
import { EVENTS } from '../content/timeline.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const T = { perCard: 10000, intro: 2500, reveal: 9500 };
export const POINTS = { card: 250, perfect: 250, speed: 100 };

export const eventById = (id) => EVENTS[Number(id.slice(1))] || null;
const ID = (i) => `e${i}`;

// Events shown recently in this browser, so a rematch gets new ones.
const seen = new Set();

// n events with different years, at least `gap` years apart.
function chooseEvents(n, gap) {
  const all = EVENTS.map((ev, i) => ({ ...ev, id: ID(i) }));
  const pool = [...shuffle(all.filter((e) => !seen.has(e.id))), ...shuffle(all.filter((e) => seen.has(e.id)))];
  for (let g = gap; g >= 0; g--) {
    const out = [];
    for (const ev of pool) {
      if (out.every((o) => Math.abs(o.y - ev.y) >= Math.max(1, g))) out.push(ev);
      if (out.length === n) break;
    }
    if (out.length === n) {
      out.forEach((e) => seen.add(e.id));
      if (seen.size > EVENTS.length - 30) seen.clear();
      return out;
    }
  }
  return pool.slice(0, n);
}

// Card count for a round: 5 cards in the second half of the game.
const sizeFor = (round, rounds) => (rounds > 2 && round > Math.ceil(rounds / 2) ? 5 : 4);

function waitingOn(g) {
  const l = g.state.line;
  return g.playersHere().filter((pid) => !l.orders[pid]);
}

function startRound(g) {
  const s = g.state;
  const l = s.line;
  l.round += 1;
  l.size = sizeFor(l.round, l.rounds);
  const late = l.round > l.rounds / 2;
  const evs = chooseEvents(l.size, late ? 4 : 12);
  l.cards = shuffle(evs.map((e) => ({ id: e.id, t: e.t, e: e.e })));
  l.answer = null; // the right order, filled in at the reveal
  l.years = s.mode === 'host' ? Object.fromEntries(evs.map((e) => [e.id, e.y])) : null; // the host sees them early
  l.orders = {};
  l.took = {};
  l.results = {};
  l.best = {};
  l.gained = {};
  l.startAt = g.now() + T.intro;
  l.until = l.startAt + T.perCard * l.size;
  s.phase = 'tguess';
  g.save();
}

function submit(g, from, input) {
  const s = g.state;
  const l = s.line;
  if (s.phase !== 'tguess' || !g.unitOf(from) || l.orders[from]) return;
  const ids = l.cards.map((c) => c.id);
  const order = Array.isArray(input.order) ? input.order.map(String) : [];
  if (order.length !== ids.length || new Set(order).size !== ids.length || !order.every((id) => ids.includes(id))) return;
  l.orders[from] = order;
  l.took[from] = Math.max(0, g.now() - l.startAt);
  if (!waitingOn(g).length) startReveal(g);
  else g.save();
}

function startReveal(g) {
  const s = g.state;
  const l = s.line;
  const answer = l.cards.map((c) => c.id).sort((a, b) => eventById(a).y - eventById(b).y);
  l.answer = answer;
  l.years = Object.fromEntries(l.cards.map((c) => [c.id, eventById(c.id).y]));
  const total = T.perCard * l.size;
  const byPlayer = {};
  for (const [pid, order] of Object.entries(l.orders)) {
    // A card counts as right when it sits in the same spot as in the real order.
    // Cards with the same year (never chosen together, but just in case) count either way.
    const right = order.filter((id, i) => id === answer[i] || l.years[id] === l.years[answer[i]]).length;
    const perfect = right === answer.length;
    const speed = perfect ? Math.round(POINTS.speed * Math.max(0, 1 - (l.took[pid] || total) / total)) : 0;
    const pts = right * POINTS.card + (perfect ? POINTS.perfect + speed : 0);
    l.results[pid] = { right, perfect, pts };
    if (perfect) g.stat(pid, 'right');
    byPlayer[pid] = pts;
  }
  const best = g.awardBest(byPlayer, l.gained);
  for (const [uid, b] of Object.entries(best)) l.best[uid] = b.by;
  l.nextAt = g.now() + T.reveal + l.size * 500;
  s.phase = 'treveal';
  g.save();
}

function next(g) {
  const l = g.state.line;
  if (l.round >= l.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.line = s.line ?? null;
    if (s.line) {
      const l = s.line;
      for (const k of ['orders', 'took', 'results', 'best', 'gained']) l[k] = l[k] || {};
      l.cards = l.cards || [];
      l.answer = l.answer ?? null;
      l.years = l.years ?? null;
    }
  },
  reset(s) { s.line = null; },
  start(g) {
    const s = g.state;
    s.line = { rounds: lengthOf(s.settings).rounds, round: 0 };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'torder') submit(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'tguess') startReveal(g);
    else if (s.phase === 'treveal') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const l = s.line;
    if (!l) return;
    if (s.phase === 'tguess' && now >= l.until) startReveal(g);
    else if (s.phase === 'treveal' && now >= l.nextAt) next(g);
  }
};
