// Hum Hunt: the big screen plays the start of a famous public-domain tune. Buzz in and pick its name.
// Later rounds play faster, on sillier instruments. The earlier you get it right, the more points.
import { TUNES } from '../content/tunes.js';
import { makeBuzzPick, optionsWith } from './buzzpick.js';
import { shuffle } from './util.js';

export const T = { play: 20000, answer: 8000, reveal: 7000, intro: 2500 };
const byId = Object.fromEntries(TUNES.map((t) => [t.id, t]));
export const tuneById = (id) => byId[id] || null;

// Instrument and speed per round: the game gets a bit harder as it goes.
const WAVES = ['triangle', 'square', 'sawtooth', 'sine'];
export function styleFor(round, rounds) {
  const late = rounds > 1 ? (round - 1) / (rounds - 1) : 0;
  return { wave: WAVES[(round - 1) % WAVES.length], speed: Math.round((1 + 0.35 * late) * 100) / 100 };
}

const seen = new Set();
function choose(n) {
  const list = [...shuffle(TUNES.filter((t) => !seen.has(t.id))), ...shuffle(TUNES.filter((t) => seen.has(t.id)))].slice(0, n);
  list.forEach((t) => seen.add(t.id));
  if (seen.size > TUNES.length - 10) seen.clear();
  return list.map((t) => t.id);
}

function item(id) {
  const t = byId[id];
  // Wrong options from the same kind of tune first, so it's not too easy.
  const same = TUNES.filter((x) => x.cat === t.cat && x.id !== t.id).map((x) => x.title);
  const pool = same.length >= 3 ? same : TUNES.map((x) => x.title);
  return { answer: t.title, options: optionsWith(t.title, pool) };
}

export default makeBuzzPick({
  key: 'hum', p: 'u', T, choose, item,
  extra: (it, round, rounds) => styleFor(round, rounds),
  normalize(r) { r.wave = r.wave || 'triangle'; r.speed = r.speed || 1; }
});
