// Bomb Pass: a category appears and one player holds a ticking bomb. Type a word that fits to pass it on.
// Words on the list pass straight away; anything else goes to a quick thumbs up/down vote (the fuse pauses).
// The fuse is hidden (20-45 s). Whoever holds the bomb when it goes off loses points; everyone else scores.
import { BOMB_CATS } from '../content/bombcats.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, squash, matchGuess } from './util.js';

export const T = { intro: 3500, vote: 9000, boom: 6500, fuseMin: 20000, fuseMax: 45000 };
export const POINTS = { boom: -300, safe: 200 };

// All runs of 1-4 words from each list, so "ice cream" and "ice" both count. Tiny glue words don't.
const GLUE = new Set(['and', 'or', 'of', 'o', 'to', 'in', 'a', 'the', 'at']);
const LISTS = BOMB_CATS.map((c) => {
  const w = c.words.split(/\s+/);
  const out = new Set();
  for (let i = 0; i < w.length; i++) {
    for (let n = 1; n <= 4 && i + n <= w.length; n++) {
      const phrase = w.slice(i, i + n).join(' ');
      if (n === 1 && GLUE.has(phrase)) continue;
      out.add(phrase);
    }
  }
  return [...out];
});
export const catOf = (i) => BOMB_CATS[i] || null;
export const onList = (cat, word) => !!matchGuess(word, LISTS[cat] || []);

const seen = new Set();
function choose(n) {
  const all = BOMB_CATS.map((_, i) => i);
  const list = [...shuffle(all.filter((i) => !seen.has(i))), ...shuffle(all.filter((i) => seen.has(i)))].slice(0, n);
  list.forEach((i) => seen.add(i));
  if (seen.size > BOMB_CATS.length - 6) seen.clear();
  return list;
}

// Pass order: shuffled, and in teams the bomb hops between teams.
function passOrder(g) {
  const byUnit = {};
  for (const p of shuffle(g.playersHere())) (byUnit[g.unitOf(p)] = byUnit[g.unitOf(p)] || []).push(p);
  const groups = shuffle(Object.values(byUnit));
  const out = [];
  for (let i = 0; out.length < groups.flat().length; i++) for (const gr of groups) if (gr[i]) out.push(gr[i]);
  return out;
}

function nextHolder(g, from) {
  const b = g.state.bomb;
  const here = b.order.filter((p) => g.isHere(p));
  if (!here.length) return from;
  const i = b.order.indexOf(from);
  for (let k = 1; k <= b.order.length; k++) {
    const p = b.order[(i + k) % b.order.length];
    if (g.isHere(p) && p !== from) return p;
  }
  return from;
}

const fuse = () => T.fuseMin + Math.floor(Math.random() * (T.fuseMax - T.fuseMin));

function startRound(g, starter) {
  const s = g.state;
  const b = s.bomb;
  b.round += 1;
  b.cat = b.list[b.round - 1];
  b.order = passOrder(g);
  b.holder = starter && b.order.includes(starter) ? starter : b.order[0] || null;
  b.used = {};
  b.words = [];
  b.vote = null;
  b.flash = null;
  b.gained = {};
  b.passes = 0;
  b.startAt = g.now() + T.intro;
  b.endsAt = b.startAt + fuse(); // hidden! only the big screen's engine reads it
  b.left = null;
  b.until = null;
  b.boom = null;
  s.phase = 'bplay';
  g.save();
}

const live = (g) => g.state.phase === 'bplay' && !g.state.bomb.vote && g.now() >= g.state.bomb.startAt;

function pass(g, word) {
  const b = g.state.bomb;
  b.used[squash(word)] = 1;
  b.words.push({ w: word, by: b.holder });
  if (b.words.length > 8) b.words.shift();
  b.passes += 1;
  g.stat(b.holder, 'pass');
  b.holder = nextHolder(g, b.holder);
  b.flash = { t: 'pass', at: g.now() };
}

function word(g, from, input) {
  const s = g.state;
  const b = s.bomb;
  if (s.phase !== 'bplay' || from !== b.holder || b.vote || g.now() < b.startAt) return;
  const w = String(input.w || '').trim().slice(0, 40);
  const sq = squash(w);
  if (!sq) return;
  if (b.used[sq]) { b.flash = { t: 'used', w, at: g.now() }; g.save(); return; }
  if (onList(b.cat, w)) { pass(g, w); g.save(); return; }
  // Not on the list: pause the fuse and let the others (or the host) decide.
  b.left = Math.max(1500, b.endsAt - g.now());
  b.endsAt = null;
  b.vote = { w, by: from, yes: {}, no: {}, until: g.now() + T.vote };
  g.save();
}

const voters = (g) => g.playersHere().filter((p) => p !== g.state.bomb.vote?.by);

function settle(g, ok) {
  const b = g.state.bomb;
  const v = b.vote;
  b.vote = null;
  b.endsAt = g.now() + (b.left || 3000);
  b.left = null;
  if (ok) pass(g, v.w);
  else { b.used[squash(v.w)] = 1; b.flash = { t: 'no', w: v.w, at: g.now() }; }
  g.save();
}
// More thumbs up than down passes the bomb. A tie, or nobody voting, gives the benefit of the doubt.
const verdict = (v) => Object.keys(v.yes).length >= Object.keys(v.no).length;

function castVote(g, from, input) {
  const s = g.state;
  const b = s.bomb;
  const v = b.vote;
  if (s.phase !== 'bplay' || !v) return;
  if (from === s.hostId) { settle(g, !!input.ok); return; } // the host's call is final
  if (from === v.by || !g.unitOf(from) || v.yes[from] || v.no[from]) return;
  (input.ok ? v.yes : v.no)[from] = 1;
  if (voters(g).every((p) => v.yes[p] || v.no[p])) settle(g, verdict(v));
  else g.save();
}

function boom(g) {
  const s = g.state;
  const b = s.bomb;
  b.vote = null;
  b.endsAt = null;
  b.left = null;
  b.gained = {};
  const loser = b.holder;
  b.boom = loser;
  if (loser) {
    g.award(loser, POINTS.boom, b.gained);
    g.stat(loser, 'boom');
    // Everyone else is safe: +200 each (in teams, once per team, so big teams don't get more).
    const paid = new Set([g.unitOf(loser)]);
    for (const p of g.playersHere()) {
      const u = g.unitOf(p);
      if (paid.has(u)) continue;
      if (s.teamMode) paid.add(u);
      g.award(p, POINTS.safe, b.gained);
    }
  }
  b.until = g.now() + T.boom;
  s.phase = 'bboom';
  g.save();
}

function next(g) {
  const b = g.state.bomb;
  if (b.round >= b.rounds) g.finish();
  else startRound(g, b.boom); // whoever blew up starts the next one
}

export default {
  normalize(s) {
    s.bomb = s.bomb ?? null;
    if (s.bomb) {
      const b = s.bomb;
      b.used = b.used || {};
      b.gained = b.gained || {};
      b.words = b.words || [];
      b.order = b.order || [];
      b.list = b.list || [];
      for (const k of ['vote', 'flash', 'holder', 'endsAt', 'left', 'until', 'boom']) b[k] = b[k] ?? null;
      if (b.vote) { b.vote.yes = b.vote.yes || {}; b.vote.no = b.vote.no || {}; }
      b.passes = b.passes || 0;
    }
  },
  reset(s) { s.bomb = null; },
  start(g) {
    const s = g.state;
    const list = choose(lengthOf(s.settings).rounds);
    s.bomb = { rounds: list.length, round: 0, list };
    startRound(g, null);
  },
  input(g, from, input) {
    if (input.type === 'bword') word(g, from, input);
    else if (input.type === 'bvote') castVote(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'bplay') boom(g);
    else if (s.phase === 'bboom') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const b = s.bomb;
    if (!b) return;
    if (s.phase === 'bplay') {
      if (b.vote && (now >= b.vote.until || !g.isHere(b.vote.by))) settle(g, verdict(b.vote));
      else if (live(g) && b.holder && !g.isHere(b.holder)) { b.holder = nextHolder(g, b.holder); g.save(); }
      else if (live(g) && b.endsAt && now >= b.endsAt) boom(g);
    } else if (s.phase === 'bboom' && now >= b.until) next(g);
  }
};
