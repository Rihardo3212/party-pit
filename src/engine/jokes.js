// Inside Jokes: the players write their own questions in the lobby (question + answer, stored in s.pack).
// In the game each question shows on the big screen; buzz in and pick the answer from 4
// (the other answers in the pack make the wrong options). You can't buzz on your own question.
// The pack lives only in this room: it is never saved anywhere else.
import { makeBuzzPick } from './buzzpick.js';
import { shuffle, squash } from './util.js';

export const T = { play: 15000, answer: 8000, reveal: 6000, intro: 2500 };
export const MAX_PACK = 30;
export const MAX_Q = 120;
export const MAX_A = 40;

// Silly fillers for when the pack doesn't have enough answers yet.
const HOUSE = ['Nobody knows', 'Last Tuesday', 'A very confused goat', 'Your mum', '42', 'In the fridge', 'Absolutely nobody', 'Grandma', 'The cat did it', 'Never, ever'];

export const packList = (s) => Object.entries(s.pack || {}).map(([id, x]) => ({ id, ...x }));

function choose(n, s) {
  return shuffle(packList(s).map((x) => x.id)).slice(0, n);
}

// A shuffle that always gives the same order for the same seed, so a question's options never change.
function seeded(list, seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function item(id, s) {
  const x = s.pack?.[id];
  if (!x) return { answer: '?', options: ['?'] };
  const used = new Set([squash(x.a)]);
  const wrong = [];
  const add = (t) => {
    const k = squash(t);
    if (!k || used.has(k) || wrong.length >= 3) return;
    used.add(k);
    wrong.push(t);
  };
  const others = packList(s).filter((o) => o.id !== id).sort((p, q) => (p.id < q.id ? -1 : 1));
  for (const o of seeded(others, id)) add(o.a);
  for (const h of seeded(HOUSE, id)) add(h);
  return { answer: x.a, options: seeded([x.a, ...wrong], id + '!') };
}

export const jokeOf = (s, id) => s.pack?.[id] || null;
// Did this player (or, in teams, their team) write this question?
export function ownJoke(s, pid, id) {
  const by = s.pack?.[id]?.by;
  if (!by) return false;
  if (by === pid) return true;
  const u = s.players?.[by]?.unit;
  return !!(s.teamMode && u && u === s.players?.[pid]?.unit);
}

export default makeBuzzPick({
  key: 'jokes', p: 'j', T, choose, item,
  // The writer knows the answer, so they sit this one out (in teams: their whole team).
  canBuzz: (s, from, r) => !ownJoke(s, from, r.id),
  extra: () => ({})
});
