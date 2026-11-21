// Odd One Out: everyone gets the same secret word, except the spy, who only knows the category.
// Everyone types a one-word clue, then votes for the spy. Catch the spy: every non-spy +500.
// The spy escapes: spy +1000. A caught spy can steal +500 back by guessing the word.
// 7+ players = 2 spies (they don't know each other). Everyone plays for themselves; in teams the points go to their team.
import { SPY_WORDS } from '../content/spywords.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, pick, squash, matchGuess } from './util.js';

export const T = { clue: 40000, vote: 30000, guess: 20000, result: 8000, intro: 2500 };
export const POINTS = { caught: 500, escaped: 1000, steal: 500 };

const usedWords = new Set();

function chooseWord() {
  const cat = pick(SPY_WORDS);
  const free = cat.words.filter((w) => !usedWords.has(w));
  const word = pick(free.length ? free : cat.words);
  usedWords.add(word);
  return { cat: cat.cat, icon: cat.icon, word };
}

const playing = (g) => g.playersHere();

function startRound(g) {
  const s = g.state;
  const o = s.odd;
  o.round += 1;
  const { cat, icon, word } = chooseWord();
  o.cat = cat;
  o.icon = icon;
  o.word = word;
  // Spies: players who were spy the least so far, picked at random.
  const pool = shuffle(playing(g)).sort((a, b) => (o.wasSpy[a] || 0) - (o.wasSpy[b] || 0));
  const n = pool.length >= 7 ? 2 : 1;
  o.spies = pool.slice(0, n);
  o.spies.forEach((p) => (o.wasSpy[p] = (o.wasSpy[p] || 0) + 1));
  o.clues = {};
  o.rejects = {};
  o.votes = {};
  o.caught = [];
  o.guesses = {};
  o.stole = {};
  o.gained = {};
  o.until = g.now() + (o.round === 1 ? T.intro : 0) + T.clue;
  s.phase = 'oclue';
  g.save();
}

function clue(g, from, text) {
  const s = g.state;
  const o = s.odd;
  if (s.phase !== 'oclue' || !g.unitOf(from) || o.clues[from]) return;
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!clean) return;
  // The clue can't give the word away.
  const w = squash(o.word);
  const c = squash(clean);
  if (c === w || (w.length >= 4 && c.includes(w)) || (c.length >= 4 && w.includes(c))) {
    o.rejects[from] = (o.rejects[from] || 0) + 1;
    g.save();
    return;
  }
  o.clues[from] = clean;
  if (playing(g).every((p) => o.clues[p])) startVote(g);
  else g.save();
}

function startVote(g) {
  const s = g.state;
  const o = s.odd;
  o.until = g.now() + T.vote;
  s.phase = 'ovote';
  g.save();
}

function vote(g, from, pid) {
  const s = g.state;
  const o = s.odd;
  if (s.phase !== 'ovote' || !g.unitOf(from) || o.votes[from] || pid === from || !s.players[pid]?.unit) return;
  o.votes[from] = pid;
  if (playing(g).every((p) => o.votes[p])) endVote(g);
  else g.save();
}

function endVote(g) {
  const s = g.state;
  const o = s.odd;
  const tally = {};
  for (const p of Object.values(o.votes)) tally[p] = (tally[p] || 0) + 1;
  // A spy is caught with more votes than any innocent player.
  const topInnocent = Math.max(0, ...Object.entries(tally).filter(([p]) => !o.spies.includes(p)).map(([, n]) => n));
  o.caught = o.spies.filter((p) => (tally[p] || 0) > topInnocent);
  o.tally = tally;
  if (o.caught.length) {
    o.until = g.now() + T.guess;
    s.phase = 'oguess';
    g.save();
  } else result(g);
}

function spyGuess(g, from, text) {
  const s = g.state;
  const o = s.odd;
  if (s.phase !== 'oguess' || !o.caught.includes(from) || o.guesses[from] !== undefined) return;
  o.guesses[from] = String(text || '').trim().slice(0, 30) || '…';
  if (o.caught.every((p) => o.guesses[p] !== undefined)) result(g);
  else g.save();
}

function result(g) {
  const s = g.state;
  const o = s.odd;
  o.gained = {};
  const innocents = Object.keys(s.players).filter((p) => s.players[p]?.unit && !o.spies.includes(p) && (o.clues[p] || o.votes[p]));
  for (const spy of o.spies) {
    if (o.caught.includes(spy)) {
      innocents.forEach((p) => g.award(p, POINTS.caught, o.gained));
      const guessed = o.guesses[spy];
      if (guessed && matchGuess(guessed, [o.word])) {
        o.stole[spy] = true;
        g.award(spy, POINTS.steal, o.gained);
      }
    } else {
      g.award(spy, POINTS.escaped, o.gained);
      g.stat(spy, 'spy');
    }
  }
  for (const [p, target] of Object.entries(o.votes || {})) if (!o.spies.includes(p) && o.spies.includes(target)) g.stat(p, 'eye');
  o.until = g.now() + T.result;
  s.phase = 'oresult';
  g.save();
}

function next(g) {
  const o = g.state.odd;
  if (o.round >= o.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.odd = s.odd ?? null;
    if (s.odd) {
      const o = s.odd;
      for (const k of ['clues', 'rejects', 'votes', 'guesses', 'stole', 'gained', 'wasSpy', 'tally']) o[k] = o[k] || {};
      o.spies = o.spies || [];
      o.caught = o.caught || [];
    }
  },
  reset(s) { s.odd = null; },
  start(g) {
    const s = g.state;
    s.odd = { rounds: lengthOf(s.settings).rounds, round: 0, wasSpy: {} };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'oclue') clue(g, from, input.text);
    if (input.type === 'ovote') vote(g, from, String(input.pid || ''));
    if (input.type === 'oguess') spyGuess(g, from, input.text);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'oclue') startVote(g);
    else if (s.phase === 'ovote') endVote(g);
    else if (s.phase === 'oguess') result(g);
    else if (s.phase === 'oresult') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const o = s.odd;
    if (!o) return;
    if (now < o.until) return;
    if (s.phase === 'oclue') startVote(g);
    else if (s.phase === 'ovote') endVote(g);
    else if (s.phase === 'oguess') result(g);
    else if (s.phase === 'oresult') next(g);
  }
};
