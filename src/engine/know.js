// Who Knows Who: everyone secretly answers a few questions about themselves. Then the big screen asks
// "What's Ann's dream holiday spot?" with 4 options (her real answer plus the others' answers and a few decoys).
// Guess right: +500. And the player it's about gets +250 for every friend who knew.
import { ABOUT_ME } from '../content/aboutme.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, squash } from './util.js';

export const T = { write: 75000, guess: 20000, reveal: 7000, intro: 2500 };
export const POINTS = { right: 500, known: 250 };
const slot = (k) => `p${k}`; // object keys, not array indexes (Firebase turns 0,1,2 keys into arrays)

const seen = new Set();
function choose(n) {
  const all = ABOUT_ME.map((_, i) => i);
  const list = [...shuffle(all.filter((i) => !seen.has(i))), ...shuffle(all.filter((i) => seen.has(i)))].slice(0, n);
  list.forEach((i) => seen.add(i));
  if (seen.size > ABOUT_ME.length - 6) seen.clear();
  return list;
}

export const promptOf = (s, k) => ABOUT_ME[s.know?.prompts?.[k]] || null;
const writersLeft = (g) => g.playersHere().filter((p) => !g.state.know.answers[p]);

function write(g, from, input) {
  const s = g.state;
  const k = s.know;
  if (s.phase !== 'kwrite' || !g.unitOf(from) || k.answers[from]) return;
  const list = Array.isArray(input.a) ? input.a : [];
  const mine = {};
  k.prompts.forEach((_, i) => {
    const t = String(list[i] || '').trim().slice(0, 50);
    if (t) mine[slot(i)] = t;
  });
  if (!Object.keys(mine).length) return;
  k.answers[from] = mine;
  if (!writersLeft(g).length) startGuessing(g);
  else g.save();
}

// Questions: one prompt at a time, every player once per prompt, capped so big groups don't take forever.
function startGuessing(g) {
  const s = g.state;
  const k = s.know;
  const queue = [];
  k.prompts.forEach((_, i) => {
    for (const p of shuffle(Object.keys(k.answers))) if (k.answers[p][slot(i)]) queue.push({ s: p, k: i });
  });
  // Make sure everyone gets asked about at least once before anyone gets a second question.
  const firsts = [];
  const rest = [];
  const asked = new Set();
  for (const q of queue) (asked.has(q.s) ? rest : firsts).push(q), asked.add(q.s);
  k.queue = [...firsts, ...rest].slice(0, k.max);
  k.idx = -1;
  if (k.queue.length) nextQuestion(g);
  else g.finish();
}

function nextQuestion(g) {
  const s = g.state;
  const k = s.know;
  k.idx += 1;
  const { s: who, k: i } = k.queue[k.idx];
  const real = k.answers[who][slot(i)];
  const used = new Set([squash(real)]);
  const decoys = [];
  const add = (t) => {
    const sq = squash(t);
    if (!sq || used.has(sq) || decoys.length >= 3) return;
    used.add(sq);
    decoys.push(t);
  };
  for (const p of shuffle(Object.keys(k.answers))) if (p !== who) add(k.answers[p][slot(i)]);
  for (const h of shuffle(ABOUT_ME[k.prompts[i]].house)) add(h);
  const options = shuffle([real, ...decoys]);
  k.subject = who;
  k.slot = i;
  k.options = options;
  k.correct = options.indexOf(real);
  k.picks = {};
  k.gained = {};
  k.until = g.now() + T.guess;
  s.phase = 'kguess';
  g.save();
}

const guessers = (g) => g.playersHere().filter((p) => p !== g.state.know.subject);

function pick(g, from, input) {
  const s = g.state;
  const k = s.know;
  const i = Number(input.i);
  if (s.phase !== 'kguess' || from === k.subject || !g.unitOf(from) || k.picks[from] !== undefined) return;
  if (!Number.isInteger(i) || i < 0 || i >= k.options.length) return;
  k.picks[from] = i;
  if (guessers(g).every((p) => k.picks[p] !== undefined)) reveal(g);
  else g.save();
}

function reveal(g) {
  const s = g.state;
  const k = s.know;
  k.gained = {};
  let knew = 0;
  for (const [p, i] of Object.entries(k.picks)) {
    if (i !== k.correct) continue;
    knew += 1;
    g.award(p, POINTS.right, k.gained);
    g.stat(p, 'bff');
  }
  if (knew) {
    g.award(k.subject, POINTS.known * knew, k.gained);
    g.stat(k.subject, 'open', knew);
  }
  k.until = g.now() + T.reveal;
  s.phase = 'kreveal';
  g.save();
}

function next(g) {
  const k = g.state.know;
  if (k.idx + 1 >= k.queue.length) g.finish();
  else nextQuestion(g);
}

export default {
  normalize(s) {
    s.know = s.know ?? null;
    if (s.know) {
      const k = s.know;
      for (const key of ['answers', 'picks', 'gained']) k[key] = k[key] || {};
      for (const key of ['prompts', 'queue', 'options']) k[key] = k[key] || [];
      for (const key of ['subject', 'until']) k[key] = k[key] ?? null;
      k.idx = k.idx ?? -1;
      k.slot = k.slot || 0;
      k.correct = k.correct || 0;
    }
  },
  reset(s) { s.know = null; },
  start(g) {
    const s = g.state;
    const len = lengthOf(s.settings);
    s.know = {
      prompts: choose(len.rounds), max: len.qs || 8, idx: -1, until: g.now() + T.intro + T.write,
      answers: {}, picks: {}, gained: {}, queue: [], options: [], subject: null, slot: 0, correct: 0
    };
    s.phase = 'kwrite';
    g.save();
  },
  input(g, from, input) {
    if (input.type === 'kwrite') write(g, from, input);
    else if (input.type === 'kpick') pick(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'kwrite') startGuessing(g);
    else if (s.phase === 'kguess') reveal(g);
    else if (s.phase === 'kreveal') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const k = s.know;
    if (!k || !k.until || now < k.until) return;
    if (s.phase === 'kwrite') startGuessing(g);
    else if (s.phase === 'kguess') reveal(g);
    else if (s.phase === 'kreveal') next(g);
  }
};
