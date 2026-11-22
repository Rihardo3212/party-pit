// Hot Take: a statement appears. Everyone secretly rates how much they agree (0-10) and guesses
// the group's average. Closest guess to the real average scores the most; the rating furthest
// from the average gets a "hottest take" bonus. Every player plays; in teams the points go to their team.
import { HOT_TAKES } from '../content/hottakes.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const T = { rate: 40000, intro: 2500, reveal: 10000 };
export const POINTS = { max: 1000, hot: 300 };
// Guess points fade with distance from the average: spot on 1000, 1 off 750, 4+ off 0.
export const guessPoints = (d) => Math.round(POINTS.max * Math.max(0, 1 - d / 4));
const HOT_GAP = 2.5; // a rating this far from the average can win the hottest take bonus

const seen = new Set();
function choose(n) {
  const all = HOT_TAKES.map((_, i) => i);
  const list = [...shuffle(all.filter((i) => !seen.has(i))), ...shuffle(all.filter((i) => seen.has(i)))].slice(0, n);
  list.forEach((i) => seen.add(i));
  if (seen.size > HOT_TAKES.length - 10) seen.clear();
  return list;
}

const waitingOn = (g) => g.playersHere().filter((pid) => !g.state.hot.votes[pid]);

function startRound(g) {
  const s = g.state;
  const h = s.hot;
  h.round += 1;
  h.text = HOT_TAKES[h.list[h.round - 1]];
  h.votes = {};
  h.avg = null;
  h.results = {};
  h.hot = null;
  h.gained = {};
  h.until = g.now() + (h.round === 1 ? T.intro : 0) + T.rate;
  s.phase = 'hrate';
  g.save();
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function vote(g, from, input) {
  const s = g.state;
  const h = s.hot;
  if (s.phase !== 'hrate' || !g.unitOf(from) || h.votes[from]) return;
  const r = Number(input.rate);
  const gs = Number(input.guess);
  if (!Number.isFinite(r) || !Number.isFinite(gs)) return;
  h.votes[from] = { r: clamp(Math.round(r), 0, 10), g: clamp(Math.round(gs * 10) / 10, 0, 10) };
  if (!waitingOn(g).length) reveal(g);
  else g.save();
}

function reveal(g) {
  const s = g.state;
  const h = s.hot;
  const ids = Object.keys(h.votes);
  h.gained = {};
  if (ids.length) {
    const avg = ids.reduce((a, p) => a + h.votes[p].r, 0) / ids.length;
    h.avg = Math.round(avg * 10) / 10;
    const byPlayer = {};
    for (const p of ids) {
      const d = Math.abs(h.votes[p].g - h.avg);
      const pts = guessPoints(d);
      h.results[p] = { d: Math.round(d * 10) / 10, pts };
      byPlayer[p] = pts;
      g.award(p, pts, h.gained);
    }
    g.statTop(byPlayer, 'close');
    // Hottest take: the one rating furthest from the average (no bonus on a tie or with 2 players).
    if (ids.length >= 3) {
      const far = ids.map((p) => ({ p, d: Math.abs(h.votes[p].r - h.avg) })).sort((a, b) => b.d - a.d);
      if (far[0].d >= HOT_GAP && (!far[1] || far[1].d < far[0].d)) {
        h.hot = far[0].p;
        g.award(h.hot, POINTS.hot, h.gained);
        g.stat(h.hot, 'hot');
      }
    }
  }
  h.until = g.now() + T.reveal + Math.min(3000, ids.length * 250);
  s.phase = 'hreveal';
  g.save();
}

function next(g) {
  const h = g.state.hot;
  if (h.round >= h.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.hot = s.hot ?? null;
    if (s.hot) {
      const h = s.hot;
      for (const k of ['votes', 'results', 'gained']) h[k] = h[k] || {};
      for (const v of Object.values(h.votes)) { v.r = v.r || 0; v.g = v.g || 0; }
      h.list = h.list || [];
      h.avg = h.avg ?? null;
      h.hot = h.hot ?? null;
    }
  },
  reset(s) { s.hot = null; },
  start(g) {
    const s = g.state;
    const list = choose(lengthOf(s.settings).rounds);
    s.hot = { rounds: list.length, round: 0, list };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'hvote') vote(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'hrate') reveal(g);
    else if (s.phase === 'hreveal') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const h = s.hot;
    if (!h) return;
    if (s.phase === 'hrate' && now >= h.until) reveal(g);
    else if (s.phase === 'hreveal' && now >= h.until) next(g);
  }
};
