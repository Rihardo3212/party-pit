// Pin Drop: a photo of a place appears on the big screen, everyone drops a pin on a world map.
// The closer the pin, the more points. In teams, every player pins and the team's closest pin counts.
import { PLACES } from '../content/places.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const T = { guess: 45000, intro: 2500, reveal: 12000 };
export const BULLSEYE_KM = 25;
export const MAX_POINTS = 1000;
// Each locked pin keeps 65% of the time left, but never drops it below 8 seconds.
export const RUSH = { keep: 0.65, min: 8000 };

// Places shown recently in this browser, so a rematch gets new photos.
const seen = new Set();

export const placeById = (id) => PLACES.find((p) => p.id === id) || null;
export const photoUrl = (id) => `places/${id}.webp`;

// Great-circle distance in km.
export function distanceKm(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// 1000 for a bullseye, then fading: ~780 at 500 km, ~370 at 2000 km, ~80 at 5000 km.
export function pointsFor(km) {
  if (km <= BULLSEYE_KM) return MAX_POINTS;
  return Math.round(MAX_POINTS * Math.exp(-km / 2000));
}

export function formatKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en')} km`;
}

// Easy places first, hard ones at the end.
function choosePlaces(len) {
  const [e, m, h] = len.mix;
  const out = [];
  for (const [diff, n] of [[1, e], [2, m], [3, h]]) {
    const all = PLACES.filter((p) => p.diff === diff);
    const fresh = shuffle(all.filter((p) => !seen.has(p.id)));
    const old = shuffle(all.filter((p) => seen.has(p.id)));
    out.push(...[...fresh, ...old].slice(0, n));
  }
  out.forEach((p) => seen.add(p.id));
  if (seen.size > PLACES.length - 12) seen.clear();
  return out.map((p) => p.id);
}

// Players who still need to pin (present, in a scoring unit).
function waitingOn(g) {
  const s = g.state;
  return s.order.filter((pid) => s.players[pid]?.unit && g.isHere(pid) && !s.pin.pins[pid]);
}

function startRound(g) {
  const s = g.state;
  const f = s.pin;
  f.round += 1;
  f.id = f.list[f.round - 1];
  f.double = f.round === f.rounds && f.rounds > 1;
  const place = placeById(f.id);
  f.answer = s.mode === 'host' ? reveal(place) : null; // only the host sees it early
  f.hint = null;
  f.rush = 0;
  f.rushBy = null;
  f.pins = {};
  f.results = {};
  f.best = {};
  f.gained = {};
  const start = g.now();
  f.until = start + T.intro + T.guess;
  f.hintAt = start + T.intro + T.guess / 2;
  s.phase = 'pguess';
  g.save();
}

const reveal = (p) => ({ name: p.name, where: p.where, lat: p.lat, lng: p.lng, fact: p.fact });

function dropPin(g, from, input) {
  const s = g.state;
  const f = s.pin;
  if (s.phase !== 'pguess' || !g.unitOf(from) || f.pins[from]) return;
  let lat = Number(input.lat);
  let lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  lat = Math.max(-85, Math.min(85, lat));
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;
  f.pins[from] = { lat: Math.round(lat * 1e4) / 1e4, lng: Math.round(lng * 1e4) / 1e4 };
  if (!waitingOn(g).length) { startReveal(g); return; }
  // Pressure: every locked pin cuts the time left for everyone else.
  const now = g.now();
  const left = f.until - now;
  const cut = Math.max(RUSH.min, Math.round(left * RUSH.keep));
  if (cut < left) {
    f.until = now + cut;
    f.rush = (f.rush || 0) + 1;
    f.rushBy = from;
  }
  g.save();
}

function startReveal(g) {
  const s = g.state;
  const f = s.pin;
  const place = placeById(f.id);
  f.answer = reveal(place);
  f.hint = place.hint;
  const mult = f.double ? 2 : 1;
  for (const [pid, pin] of Object.entries(f.pins)) {
    const km = distanceKm(pin, place);
    f.results[pid] = { km: Math.round(km * 10) / 10, pts: pointsFor(km) * mult };
  }
  g.statTop(Object.fromEntries(Object.entries(f.results).map(([pid, r]) => [pid, r.km])), 'close', true);
  // Each unit scores with its closest pin.
  for (const uid of s.unitOrder) {
    const mine = Object.keys(f.results).filter((pid) => s.players[pid]?.unit === uid);
    if (!mine.length) continue;
    const best = mine.reduce((a, b) => (f.results[b].km < f.results[a].km ? b : a));
    f.best[uid] = best;
    f.gained[uid] = f.results[best].pts;
    s.units[uid].score += f.results[best].pts;
  }
  f.nextAt = g.now() + T.reveal + Math.min(4000, Object.keys(f.pins).length * 400);
  s.phase = 'preveal';
  g.save();
}

function next(g) {
  const f = g.state.pin;
  if (f.round >= f.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.pin = s.pin ?? null;
    if (s.pin) {
      const f = s.pin;
      for (const k of ['pins', 'results', 'best', 'gained']) f[k] = f[k] || {};
      f.list = f.list || [];
      f.answer = f.answer ?? null;
      f.hint = f.hint ?? null;
      f.double = !!f.double;
      f.rush = f.rush || 0;
      f.rushBy = f.rushBy ?? null;
    }
  },
  reset(s) { s.pin = null; },
  start(g) {
    const s = g.state;
    const len = lengthOf(s.settings);
    const list = choosePlaces(len);
    s.pin = { rounds: list.length, round: 0, list };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'pin') dropPin(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'pguess') startReveal(g);
    else if (s.phase === 'preveal') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const f = s.pin;
    if (!f) return;
    if (s.phase === 'pguess') {
      // The hint only helps when nobody has a clue yet.
      if (!f.hint && now >= f.hintAt && !Object.keys(f.pins).length) { f.hint = placeById(f.id).hint; g.save(); }
      if (now >= f.until) startReveal(g);
    } else if (s.phase === 'preveal' && now >= f.nextAt) next(g);
  }
};
