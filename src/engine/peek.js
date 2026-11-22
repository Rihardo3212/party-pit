// Pixel Peek: a photo starts zoomed in and pixelated, and slowly zooms out. Buzz in and pick what it is.
// Uses the Pin Drop photos (famous places). The earlier you get it right, the more points.
import { PLACES } from '../content/places.js';
import { makeBuzzPick, optionsWith } from './buzzpick.js';
import { shuffle } from './util.js';

export const T = { play: 18000, answer: 8000, reveal: 6000, intro: 2500 };
const byId = Object.fromEntries(PLACES.map((pl) => [pl.id, pl]));

const seen = new Set();
// Easier places first, harder ones later in the game.
function choose(n) {
  const fresh = (list) => [...shuffle(list.filter((pl) => !seen.has(pl.id))), ...shuffle(list.filter((pl) => seen.has(pl.id)))];
  const easy = fresh(PLACES.filter((pl) => pl.diff === 1));
  const rest = fresh(PLACES.filter((pl) => pl.diff > 1));
  const out = [];
  for (let i = 0; i < n; i++) out.push((i < Math.ceil(n / 2) ? easy : rest).shift() || easy.shift() || rest.shift());
  out.forEach((pl) => seen.add(pl.id));
  if (seen.size > PLACES.length - 15) seen.clear();
  return out.map((pl) => pl.id);
}

function item(id) {
  const pl = byId[id];
  // Wrong options from places of the same difficulty, so the choice isn't too easy.
  const same = PLACES.filter((x) => x.diff === pl.diff).map((x) => x.name);
  return { answer: pl.name, options: optionsWith(pl.name, same.length >= 4 ? same : PLACES.map((x) => x.name)) };
}

export const peekPlace = (id) => byId[id] || null;

export default makeBuzzPick({
  key: 'peek', p: 'x', T, choose, item,
  // Where the zoom starts: somewhere near the middle of the photo.
  extra: () => ({ fx: Math.round((0.3 + Math.random() * 0.4) * 100) / 100, fy: Math.round((0.3 + Math.random() * 0.4) * 100) / 100 }),
  normalize(r) { r.fx = r.fx ?? 0.5; r.fy = r.fy ?? 0.5; }
});
