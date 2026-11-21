// Memory Sketch: a drawing shows on the big screen for a few seconds, then everyone redraws it from memory.
// The big screen compares each drawing with the original and gives 0–1000 points.
// Drawings go to rooms/CODE/sketch/r{round}/{playerId} (not in the game state, to keep it small).
import { ICONS } from '../content/sketches.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';
import { drawStroke } from './util.js';
import { figureFor } from '../content/sketches.js';

export const T = { intro: 2500, draw: 30000, reveal: 9000 };

// Icons shown recently in this browser, so a rematch gets new ones.
const seen = new Set();

// Alternate pictures and abstract shapes, getting harder towards the end.
function chooseTargets(rounds) {
  const out = [];
  for (let i = 0; i < rounds; i++) {
    const f = rounds > 1 ? i / (rounds - 1) : 0;
    if (i % 2 === 0) {
      const maxDiff = f < 0.34 ? 1 : f < 0.67 ? 2 : 3;
      const pool = ICONS.filter((ic) => ic.diff <= maxDiff && !out.some((o) => o.id === ic.id));
      const fresh = pool.filter((ic) => !seen.has(ic.id));
      const ic = shuffle(fresh.length ? fresh : pool)[0];
      seen.add(ic.id);
      out.push({ kind: 'icon', id: ic.id });
    } else {
      out.push({ kind: 'abs', seed: Math.floor(Math.random() * 1e9), n: 2 + Math.round(f * 2) });
    }
  }
  if (seen.size > ICONS.length - 6) seen.clear();
  return out;
}

/* ---------- scoring ---------- */

const GRID = 96;
function raster(strokes, grow) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = GRID;
  const ctx = cv.getContext('2d');
  for (const st of strokes) drawStroke(ctx, { ...st, c: '#000', w: (st.w || 10) + grow }, GRID);
  const px = ctx.getImageData(0, 0, GRID, GRID).data;
  const out = new Uint8Array(GRID * GRID);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4 + 3] > 40 ? 1 : 0;
  return out;
}

// How well a drawing matches the original: does the drawing sit on the original lines (precision),
// and does it cover all of them (recall)? Lines get some slack, nobody draws perfectly from memory.
export function compare(target, drawing) {
  if (!drawing?.length) return 0;
  const slack = 20; // extra line width in 320px-canvas units
  const t = raster(target, 0), tWide = raster(target, slack);
  const d = raster(drawing, 0), dWide = raster(drawing, slack);
  let dn = 0, dHit = 0, tn = 0, tHit = 0;
  for (let i = 0; i < t.length; i++) {
    if (d[i]) { dn++; if (tWide[i]) dHit++; }
    if (t[i]) { tn++; if (dWide[i]) tHit++; }
  }
  if (!dn || !tn) return 0;
  const p = dHit / dn;
  const r = tHit / tn;
  const f = (2 * p * r) / (p + r || 1);
  // A careful copy scores about 0.9, a different picture about 0.5–0.7.
  return Math.round(1000 * Math.max(0, Math.min(1, (f - 0.4) / 0.48)));
}

/* ---------- rounds ---------- */

function waitingOn(g) {
  const m = g.state.sketch;
  return g.playersHere().filter((pid) => !m.done[pid]);
}

function startRound(g) {
  const s = g.state;
  const m = s.sketch;
  m.round += 1;
  m.target = m.list[m.round - 1];
  m.look = m.round > m.rounds * 0.66 ? 2500 : 3000;
  m.done = {};
  m.results = {};
  m.best = {};
  m.gained = {};
  m.path = `sketch/r${m.round}`;
  g.db.remove(g.path(m.path));
  m.lookUntil = g.now() + T.intro + m.look;
  s.phase = 'mlook';
  g.save();
}

function startDraw(g) {
  const m = g.state.sketch;
  m.until = g.now() + T.draw;
  g.state.phase = 'mdraw';
  g.save();
}

function done(g, from) {
  const s = g.state;
  const m = s.sketch;
  if (s.phase !== 'mdraw' || !g.unitOf(from) || m.done[from]) return;
  m.done[from] = true;
  if (!waitingOn(g).length) startReveal(g);
  else g.save();
}

async function startReveal(g) {
  const s = g.state;
  const m = s.sketch;
  if (g.mem.scoring) return;
  g.mem.scoring = true;
  let drawings = {};
  try { drawings = (await g.db.get(g.path(m.path))) || {}; } catch { drawings = {}; }
  const target = figureFor(m.target);
  const byPlayer = {};
  for (const [pid, strokes] of Object.entries(drawings)) {
    if (!s.players[pid]?.unit) continue;
    const pts = compare(target, Object.values(strokes || {}));
    m.results[pid] = { pts };
    byPlayer[pid] = pts;
  }
  g.statTop(byPlayer, 'art');
  const best = g.awardBest(byPlayer, m.gained);
  for (const [uid, b] of Object.entries(best)) m.best[uid] = b.by;
  m.nextAt = g.now() + T.reveal + Math.min(4000, Object.keys(byPlayer).length * 300);
  g.mem.scoring = false;
  s.phase = 'mreveal';
  g.save();
}

function next(g) {
  const m = g.state.sketch;
  if (m.round >= m.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.sketch = s.sketch ?? null;
    if (s.sketch) {
      const m = s.sketch;
      for (const k of ['done', 'results', 'best', 'gained']) m[k] = m[k] || {};
      m.list = m.list || [];
      m.target = m.target ?? null;
    }
  },
  reset(s) { s.sketch = null; },
  start(g) {
    const s = g.state;
    const list = chooseTargets(lengthOf(s.settings).rounds);
    s.sketch = { rounds: list.length, round: 0, list };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'mdone') done(g, from);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'mlook') startDraw(g);
    else if (s.phase === 'mdraw') startReveal(g);
    else if (s.phase === 'mreveal') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const m = s.sketch;
    if (!m) return;
    if (s.phase === 'mlook' && now >= m.lookUntil) startDraw(g);
    // A little grace after the clock, so drawings sent at the last second still arrive.
    else if (s.phase === 'mdraw' && now >= m.until + 800) startReveal(g);
    else if (s.phase === 'mreveal' && now >= m.nextAt) next(g);
  }
};
