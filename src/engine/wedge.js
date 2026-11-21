// Wedge Rush: spin a category, everyone answers at once, the best answer
// from someone still missing that wedge earns it. Fill your pie to win.
import { CATEGORIES } from '../content/trivia.js';
import { NUMERIC } from '../content/numeric.js';
import { WEDGES } from '../content/wedges.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, pick } from './util.js';

export const T = { spin: 4200, mc: 20000, num: 25000, reveal: 5500 };
const MAX_ROUNDS = 40;
const NUMERIC_CHANCE = 0.25;

const wedgeCount = (u) => Object.keys(u.wedges || {}).length;
export const rankWedge = (s) => (a, b) =>
  wedgeCount(s.units[b]) - wedgeCount(s.units[a]) || s.units[b].score - s.units[a].score;

function chooseCategory(s) {
  const w = s.wedge;
  const weights = WEDGES.map((c, i) => {
    if (i === w.lastCat && WEDGES.length > 1) return 0;
    const missing = s.unitOrder.filter((u) => !s.units[u].wedges[c.id]).length;
    return 1 + missing * 2;
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

function chooseQuestion(s, cat) {
  const used = s.wedge.used;
  const nums = (NUMERIC[cat.id] || []).map((q, i) => ({ q, key: `num:${cat.id}:${i}` })).filter((x) => !used[x.key]);
  if (nums.length && Math.random() < NUMERIC_CHANCE) {
    const { q, key } = pick(nums);
    used[key] = true;
    return { type: 'num', text: q.q, unit: q.unit, key };
  }
  const pool = [];
  for (const id of cat.from) {
    const c = CATEGORIES.find((x) => x.id === id);
    c.questions.forEach((q, i) => { const key = `mc:${id}:${i}`; if (!used[key]) pool.push({ q, key }); });
  }
  if (!pool.length) { // everything used: start over
    for (const k of Object.keys(used)) if (k.startsWith('mc:') && cat.from.includes(k.split(':')[1])) delete used[k];
    return chooseQuestion(s, cat);
  }
  const { q, key } = pick(pool);
  used[key] = true;
  return { type: 'mc', text: q.q, options: shuffle([q.a, ...q.w]), key };
}

function solution(key) {
  const [type, id, i] = key.split(':');
  if (type === 'num') return NUMERIC[id][Number(i)].a;
  return CATEGORIES.find((c) => c.id === id).questions[Number(i)].a;
}

function startSpin(g) {
  const s = g.state;
  const w = s.wedge;
  w.round += 1;
  const to = chooseCategory(s);
  w.spin = { to, until: g.now() + T.spin, turns: 3 + Math.floor(Math.random() * 2) };
  w.lastCat = to;
  w.q = null;
  w.answers = {};
  w.results = {};
  w.winner = null;
  s.phase = 'spin';
  g.save();
}

function startQuestion(g) {
  const s = g.state;
  const w = s.wedge;
  const cat = WEDGES[w.spin.to];
  const q = chooseQuestion(s, cat);
  w.q = { ...q, cat: cat.id, answer: s.mode === 'host' ? solution(q.key) : null, correctIndex: null };
  w.startAt = g.now();
  w.until = g.now() + (q.type === 'num' ? T.num : T.mc);
  s.phase = 'wq';
  g.save();
}

function answer(g, from, input) {
  const s = g.state;
  const w = s.wedge;
  const uid = g.unitOf(from);
  if (s.phase !== 'wq' || !uid || w.answers[uid]) return;
  const t = Math.max(0, g.now() - w.startAt);
  if (w.q.type === 'mc') {
    if (!Number.isInteger(input.i) || input.i < 0 || input.i > 3) return;
    w.answers[uid] = { i: input.i, t, by: from };
  } else {
    const n = Number(input.n);
    if (!Number.isFinite(n)) return;
    w.answers[uid] = { n: Math.round(n * 100) / 100, t, by: from };
  }
  if (s.unitOrder.every((u) => w.answers[u] || !g.unitHere(u))) reveal(g);
  else g.save();
}

function reveal(g) {
  const s = g.state;
  const w = s.wedge;
  const cat = WEDGES[w.spin.to];
  const truth = solution(w.q.key);
  const limit = w.q.type === 'num' ? T.num : T.mc;
  const results = {};
  let candidates = [];

  if (w.q.type === 'mc') {
    w.q.correctIndex = w.q.options.indexOf(truth);
    for (const u of s.unitOrder) {
      const a = w.answers[u];
      const ok = !!a && a.i === w.q.correctIndex;
      const pts = ok ? 100 + Math.round(400 * Math.max(0, 1 - a.t / limit)) : 0;
      results[u] = { ok, pts };
      if (ok) { g.stat(u, 'right'); g.statMin(u, 'buzz', a.t); } else if (a) g.stat(u, 'wrong');
      if (ok && !s.units[u].wedges[cat.id]) candidates.push({ u, key: a.t });
    }
  } else {
    const dists = {};
    for (const u of s.unitOrder) if (w.answers[u]) dists[u] = Math.abs(w.answers[u].n - truth);
    const best = Math.min(...Object.values(dists), Infinity);
    for (const u of s.unitOrder) {
      const d = dists[u];
      const ok = d !== undefined && d === best;
      const pts = ok ? (d === 0 ? 500 : 300) : 0;
      results[u] = { ok, pts, dist: d ?? null };
      if (ok) g.stat(u, 'close');
      if (d !== undefined && !s.units[u].wedges[cat.id]) candidates.push({ u, key: d * 1e6 + w.answers[u].t });
    }
  }

  for (const u of s.unitOrder) s.units[u].score += results[u].pts;
  candidates.sort((a, b) => a.key - b.key);
  w.winner = candidates.length ? candidates[0].u : null;
  if (w.winner) s.units[w.winner].wedges[cat.id] = true;
  w.q.answer = truth;
  w.results = results;
  w.revealUntil = g.now() + T.reveal;
  s.phase = 'wreveal';
  g.save();
}

export default {
  normalize(s) {
    s.wedge = s.wedge ?? null;
    if (s.wedge) {
      const w = s.wedge;
      w.answers = w.answers || {};
      w.results = w.results || {};
      w.used = w.used || {};
      w.q = w.q ?? null;
      w.winner = w.winner ?? null;
      if (w.q) { w.q.options = w.q.options || []; w.q.answer = w.q.answer ?? null; w.q.correctIndex = w.q.correctIndex ?? null; }
    }
  },
  reset(s) { s.wedge = null; },
  start(g) {
    const s = g.state;
    s.wedge = { need: lengthOf(s.settings).need, max: lengthOf(s.settings).max || MAX_ROUNDS, round: 0, used: {}, lastCat: -1, answers: {}, results: {}, q: null, winner: null };
    startSpin(g);
  },
  input(g, from, input) {
    if (input.type === 'wAnswer') answer(g, from, input);
  },
  skip(g) {
    if (g.state.phase === 'wq') reveal(g);
  },
  tick(g, now) {
    const s = g.state;
    const w = s.wedge;
    if (!w) return;
    if (s.phase === 'spin' && now >= w.spin.until) startQuestion(g);
    else if (s.phase === 'wq' && now >= w.until) reveal(g);
    else if (s.phase === 'wreveal' && now >= w.revealUntil) {
      const done = s.unitOrder.some((u) => Object.keys(s.units[u].wedges).length >= w.need);
      if (done || w.round >= (w.max || MAX_ROUNDS)) g.finish(rankWedge(s));
      else startSpin(g);
    }
  }
};
