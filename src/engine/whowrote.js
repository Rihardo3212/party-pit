// Who Wrote That?: everyone answers a prompt, then the answers are shown one by one with no names
// and everyone guesses who wrote each one. Every player plays for themselves; in teams the points go to their team.
import { PROMPTS } from '../content/whowrote.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const T = { write: 60000, guess: 20000, show: 5500, intro: 2500 };
export const POINTS = { right: 500, fooled: 250 };
export const MAX_ANSWERS = 6; // per prompt, so big groups don't wait forever

const seen = new Set();
function choosePrompts(n) {
  const all = PROMPTS.map((_, i) => i);
  const list = [...shuffle(all.filter((i) => !seen.has(i))), ...shuffle(all.filter((i) => seen.has(i)))].slice(0, n);
  list.forEach((i) => seen.add(i));
  if (seen.size > PROMPTS.length - 10) seen.clear();
  return list;
}

const writersLeft = (g) => g.playersHere().filter((pid) => !g.state.who.answers[pid]);

function startRound(g) {
  const s = g.state;
  const w = s.who;
  w.round += 1;
  w.prompt = PROMPTS[w.list[w.round - 1]];
  w.answers = {};
  w.queue = [];
  w.idx = -1;
  w.author = null;
  w.text = null;
  w.guesses = {};
  w.gained = {};
  w.until = g.now() + (w.round === 1 ? T.intro : 0) + T.write;
  s.phase = 'wwrite';
  g.save();
}

function write(g, from, text) {
  const s = g.state;
  const w = s.who;
  if (s.phase !== 'wwrite' || !g.unitOf(from) || w.answers[from]) return;
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!clean) return;
  w.answers[from] = clean;
  if (!writersLeft(g).length) startGuessing(g);
  else g.save();
}

function startGuessing(g) {
  const w = g.state.who;
  w.queue = shuffle(Object.keys(w.answers)).slice(0, MAX_ANSWERS);
  w.idx = -1;
  if (w.queue.length < 2) { endRound(g); return; } // nothing to guess with fewer than 2 answers
  nextAnswer(g);
}

function nextAnswer(g) {
  const s = g.state;
  const w = s.who;
  w.idx += 1;
  if (w.idx >= w.queue.length) { endRound(g); return; }
  w.author = null; // hidden until the reveal
  w.text = w.answers[w.queue[w.idx]];
  w.guesses = {};
  w.gained = {};
  w.until = g.now() + T.guess;
  s.phase = 'wguess';
  g.save();
}

function guess(g, from, pid) {
  const s = g.state;
  const w = s.who;
  const author = w.queue[w.idx];
  if (s.phase !== 'wguess' || !g.unitOf(from) || from === author || w.guesses[from]) return;
  if (!w.queue.includes(pid) || pid === from) return;
  w.guesses[from] = pid;
  // Everyone except the writer guesses.
  const left = g.playersHere().filter((p) => p !== author && !w.guesses[p]);
  if (!left.length) reveal(g);
  else g.save();
}

function reveal(g) {
  const s = g.state;
  const w = s.who;
  const author = w.queue[w.idx];
  w.author = author;
  w.gained = {};
  for (const [pid, pick] of Object.entries(w.guesses)) {
    if (pick === author) { g.award(pid, POINTS.right, w.gained); g.stat(pid, 'eye'); }
    else { g.award(author, POINTS.fooled, w.gained); g.stat(author, 'fooled'); g.stat(pid, 'gotFooled'); }
  }
  w.until = g.now() + T.show;
  s.phase = 'wshow';
  g.save();
}

function endRound(g) {
  const w = g.state.who;
  if (w.round >= w.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.who = s.who ?? null;
    if (s.who) {
      const w = s.who;
      for (const k of ['answers', 'guesses', 'gained']) w[k] = w[k] || {};
      w.queue = w.queue || [];
      w.list = w.list || [];
      w.author = w.author ?? null;
      w.text = w.text ?? null;
    }
  },
  reset(s) { s.who = null; },
  start(g) {
    const s = g.state;
    const list = choosePrompts(lengthOf(s.settings).rounds);
    s.who = { rounds: list.length, round: 0, list };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'wwrite') write(g, from, input.text);
    if (input.type === 'wguess') guess(g, from, String(input.pid || ''));
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'wwrite') startGuessing(g);
    else if (s.phase === 'wguess') reveal(g);
    else if (s.phase === 'wshow') nextAnswer(g);
  },
  tick(g, now) {
    const s = g.state;
    const w = s.who;
    if (!w) return;
    if (s.phase === 'wwrite' && now >= w.until) startGuessing(g);
    else if (s.phase === 'wguess' && now >= w.until) reveal(g);
    else if (s.phase === 'wshow' && now >= w.until) nextAnswer(g);
  }
};

