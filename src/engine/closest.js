// Closest Call: a number question, everyone guesses on their phone, closest guess wins the most.
// In teams, every player guesses and the team scores with its best guess. The last question counts double.
import { NUMERIC } from '../content/numeric.js';
import { CLOSEST } from '../content/closest.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const T = { guess: 30000, intro: 2500, reveal: 9000 };
export const MAX_POINTS = 1000;

// Every question: Wedge Rush's number questions plus Closest Call's own. unit '' = a year.
export const QUESTIONS = [
  ...Object.entries(NUMERIC).flatMap(([cat, list]) => list.map((q, i) => ({ id: `n-${cat}-${i}`, ...q }))),
  ...CLOSEST.map((q, i) => ({ id: `c-${i}`, ...q }))
];
const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
export const questionById = (id) => byId[id] || null;
export const isYear = (q) => !q.unit;

// Points fade with distance. Years: by years off (5 off ≈ 780, 20 off ≈ 370).
// Other numbers: by how many times too big or small (10% off ≈ 790, 2× off ≈ 180).
export function score(guess, q) {
  const a = q.a;
  if (isYear(q)) {
    const d = Math.abs(guess - a);
    return { pts: Math.round(MAX_POINTS * Math.exp(-d / 20)), spot: d === 0 };
  }
  if (!(guess > 0)) return { pts: 0, spot: false };
  if (Math.abs(guess - a) / a <= 0.005) return { pts: MAX_POINTS, spot: true };
  const off = Math.abs(Math.log(guess / a));
  return { pts: Math.round(MAX_POINTS * Math.exp(-2.5 * off)), spot: false };
}

export function formatNum(n, q) {
  if (n === null || n === undefined) return '?';
  if (q && isYear(q)) return String(n);
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

// Questions shown recently in this browser, so a rematch gets new ones.
const seen = new Set();

// About one year question in three, mixed in between the others.
function chooseQuestions(n) {
  const fresh = (list) => [...shuffle(list.filter((q) => !seen.has(q.id))), ...shuffle(list.filter((q) => seen.has(q.id)))];
  const years = fresh(QUESTIONS.filter(isYear));
  const nums = fresh(QUESTIONS.filter((q) => !isYear(q)));
  const yCount = Math.round(n / 3);
  const out = [];
  for (let i = 0; i < n; i++) {
    const wantYear = Math.floor(((i + 1) * yCount) / n) > Math.floor((i * yCount) / n);
    out.push((wantYear ? years : nums).shift() || years.shift() || nums.shift());
  }
  out.forEach((q) => seen.add(q.id));
  if (seen.size > QUESTIONS.length - 20) seen.clear();
  return out.map((q) => q.id);
}

function waitingOn(g) {
  const c = g.state.close;
  return g.playersHere().filter((pid) => c.guesses[pid] === undefined);
}

function startRound(g) {
  const s = g.state;
  const c = s.close;
  c.round += 1;
  c.id = c.list[c.round - 1];
  const q = questionById(c.id);
  c.q = q.q;
  c.unit = q.unit;
  c.year = isYear(q);
  c.double = c.round === c.rounds && c.rounds > 1;
  c.answer = s.mode === 'host' ? q.a : null; // only the host sees it early
  c.guesses = {};
  c.results = {};
  c.best = {};
  c.gained = {};
  c.until = g.now() + T.intro + T.guess;
  s.phase = 'cguess';
  g.save();
}

function guess(g, from, input) {
  const s = g.state;
  const c = s.close;
  if (s.phase !== 'cguess' || !g.unitOf(from) || c.guesses[from] !== undefined) return;
  const n = Number(input.n);
  if (!Number.isFinite(n) || Math.abs(n) > 1e12) return;
  c.guesses[from] = Math.round(n * 1000) / 1000;
  if (!waitingOn(g).length) startReveal(g);
  else g.save();
}

function startReveal(g) {
  const s = g.state;
  const c = s.close;
  const q = questionById(c.id);
  c.answer = q.a;
  const mult = c.double ? 2 : 1;
  const byPlayer = {};
  for (const [pid, n] of Object.entries(c.guesses)) {
    const r = score(n, q);
    c.results[pid] = { pts: r.pts * mult, spot: r.spot };
    byPlayer[pid] = r.pts * mult;
  }
  g.statTop(byPlayer, 'close');
  const best = g.awardBest(byPlayer, c.gained);
  for (const [uid, b] of Object.entries(best)) c.best[uid] = b.by;
  c.nextAt = g.now() + T.reveal + Math.min(4000, Object.keys(c.guesses).length * 400);
  s.phase = 'creveal';
  g.save();
}

function next(g) {
  const c = g.state.close;
  if (c.round >= c.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.close = s.close ?? null;
    if (s.close) {
      const c = s.close;
      for (const k of ['guesses', 'results', 'best', 'gained']) c[k] = c[k] || {};
      c.list = c.list || [];
      c.answer = c.answer ?? null;
      c.unit = c.unit || '';
      c.year = !!c.year;
      c.double = !!c.double;
    }
  },
  reset(s) { s.close = null; },
  start(g) {
    const s = g.state;
    const list = chooseQuestions(lengthOf(s.settings).rounds);
    s.close = { rounds: list.length, round: 0, list };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'cguess') guess(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'cguess') startReveal(g);
    else if (s.phase === 'creveal') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const c = s.close;
    if (!c) return;
    if (s.phase === 'cguess' && now >= c.until) startReveal(g);
    else if (s.phase === 'creveal' && now >= c.nextAt) next(g);
  }
};
