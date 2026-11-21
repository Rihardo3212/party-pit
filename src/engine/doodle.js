// Doodle Dash: one player draws a secret word live, everyone else guesses on their phone.
import { DOODLE, DIFFICULTY } from '../content/doodle.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, pick, matchGuess } from './util.js';

export const T = { choose: 12000, draw: 75000, reveal: 5000 };
const FEED = 9;

function chooseWords(d) {
  const out = [];
  for (const diff of ['easy', 'medium', 'hard']) {
    const free = DOODLE[diff].filter((w) => !d.used[w]);
    const word = pick(free.length ? free : DOODLE[diff]);
    d.used[word] = true;
    out.push({ word, diff });
  }
  return out;
}

function maskWord(word, shown) {
  return [...word].map((ch, i) => (ch === ' ' ? ' ' : shown[i] ? ch.toUpperCase() : '_')).join('');
}

function startRound(g) {
  const s = g.state;
  const d = s.doodle;
  d.round += 1;
  // Skip artists who left.
  let drawer = null;
  for (let k = 0; k < d.artists.length; k++) {
    const cand = d.artists[(d.round - 1 + k) % d.artists.length];
    if (g.isHere(cand) && s.players[cand]) { drawer = cand; break; }
  }
  if (!drawer) drawer = d.artists[(d.round - 1) % d.artists.length];
  d.drawer = drawer;
  d.choices = chooseWords(d);
  d.word = null;
  d.diff = null;
  d.hint = '';
  d.shown = {};
  d.guessed = {};
  d.close = {};
  d.feed = [];
  d.until = g.now() + T.choose;
  d.canvas = `doodle/r${d.round}`;
  g.db.remove(g.path(d.canvas));
  s.phase = 'dchoose';
  g.save();
}

function chooseWord(g, i) {
  const s = g.state;
  const d = s.doodle;
  const c = d.choices[i] || d.choices[1];
  d.word = c.word;
  d.diff = c.diff;
  d.shown = {};
  d.hint = maskWord(d.word, d.shown);
  d.startAt = g.now();
  d.until = g.now() + T.draw;
  d.hintsGiven = 0;
  s.phase = 'ddraw';
  g.save();
}

function guessers(g) {
  const s = g.state;
  return s.order.filter((p) => p !== s.doodle.drawer && g.isHere(p));
}

function guess(g, from, text) {
  const s = g.state;
  const d = s.doodle;
  if (s.phase !== 'ddraw' || from === d.drawer || !s.players[from] || d.guessed[from]) return;
  const now = Date.now();
  g.mem.lastGuess = g.mem.lastGuess || {};
  if (now - (g.mem.lastGuess[from] || 0) < 500) return;
  g.mem.lastGuess[from] = now;
  const clean = String(text || '').trim().slice(0, 30);
  if (!clean) return;

  const m = matchGuess(clean, [d.word]);
  if (m === 'exact') {
    const t = g.now() - d.startAt;
    const mult = DIFFICULTY[d.diff].mult;
    const order = Object.keys(d.guessed).length;
    const pts = Math.round((100 + 400 * Math.max(0, 1 - t / T.draw) + Math.max(0, 100 - order * 25)) * mult);
    d.guessed[from] = { pts, order };
    const uid = g.unitOf(from);
    if (uid) s.units[uid].score += pts;
    const artistUnit = g.unitOf(d.drawer);
    const artistPts = Math.round(100 * mult);
    if (artistUnit) s.units[artistUnit].score += artistPts;
    g.stat(from, 'eye');
    g.stat(d.drawer, 'art');
    d.artistPts = (d.artistPts || 0) + artistPts;
    d.feed = [...d.feed, { pid: from, kind: 'ok' }].slice(-FEED);
    const left = guessers(g).filter((p) => !d.guessed[p]);
    if (!left.length) { endDrawing(g); return; }
  } else if (m === 'close') {
    d.close[from] = (d.close[from] || 0) + 1;
    d.feed = [...d.feed, { pid: from, kind: 'close' }].slice(-FEED);
  } else {
    d.feed = [...d.feed, { pid: from, kind: 'wrong', text: clean }].slice(-FEED);
  }
  g.save();
}

function endDrawing(g) {
  const s = g.state;
  const d = s.doodle;
  d.reveal = d.word;
  d.until = g.now() + T.reveal;
  s.phase = 'dreveal';
  g.save();
}

function giveHint(g) {
  const d = g.state.doodle;
  const hidden = [...d.word].map((ch, i) => i).filter((i) => d.word[i] !== ' ' && !d.shown[i]);
  if (hidden.length <= 1) return;
  d.shown[pick(hidden)] = true;
  d.hint = maskWord(d.word, d.shown);
  d.hintsGiven += 1;
  g.save();
}

export default {
  normalize(s) {
    s.doodle = s.doodle ?? null;
    if (s.doodle) {
      const d = s.doodle;
      for (const k of ['guessed', 'close', 'shown', 'used']) d[k] = d[k] || {};
      d.feed = d.feed || [];
      d.choices = d.choices || [];
      d.artists = d.artists || [];
      for (const k of ['word', 'diff', 'reveal', 'drawer']) d[k] = d[k] ?? null;
    }
  },
  reset(s) { s.doodle = null; },
  start(g) {
    const s = g.state;
    const len = lengthOf(s.settings);
    const artists = shuffle(s.order);
    const rounds = Math.max(len.minRounds, Math.min(len.maxRounds, artists.length * len.perPlayer));
    s.doodle = { rounds, round: 0, artists, used: {}, feed: [], guessed: {}, close: {}, shown: {}, choices: [] };
    startRound(g);
  },
  input(g, from, input) {
    const s = g.state;
    if (input.type === 'dChoose' && s.phase === 'dchoose' && from === s.doodle.drawer) chooseWord(g, input.i);
    if (input.type === 'guess') guess(g, from, input.text);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'dchoose') chooseWord(g, 1);
    else if (s.phase === 'ddraw') endDrawing(g);
  },
  tick(g, now) {
    const s = g.state;
    const d = s.doodle;
    if (!d) return;
    if (s.phase === 'dchoose' && now >= d.until) chooseWord(g, 1);
    else if (s.phase === 'ddraw') {
      const frac = (now - d.startAt) / T.draw;
      if (frac >= 0.5 && d.hintsGiven < 1) giveHint(g);
      else if (frac >= 0.75 && d.hintsGiven < 2) giveHint(g);
      if (now >= d.until) endDrawing(g);
    } else if (s.phase === 'dreveal' && now >= d.until) {
      if (d.round >= d.rounds) g.finish();
      else startRound(g);
    }
  }
};
