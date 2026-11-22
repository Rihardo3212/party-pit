// Party Tour: a dice board that links the other modes.
// Each round everyone rolls on their phone at once, the pieces move one by one, and the space where
// this round's chooser lands decides the next mini game: one short round of another mode.
// Mini games are scored by place (1st +500, 2nd +300...), so every mode counts the same.
// Board spaces: ⭐ bonus, 💀 trap, 🎁 free item, 🛒 shop (buys an item), and passing START gives a lap bonus.
// Items are used on the phone before rolling: 🎲 two dice, 🔄 swap spots, 💰 steal from the leader, 🛡️ shield.
// The board comes in a few loop sizes (layouts). Most points wins.
//
// While a mini game runs, settings.sub holds its mode id. lengthOf() then returns that mode's short
// "tour" length, and every input and tick is passed to that mode's engine. The engine's finish()
// is caught and brings the game back to the board.
import { MODES } from '../lib/modes.js';
import { shuffle } from './util.js';

export const TOUR_MODES = ['closest', 'timeline', 'pindrop', 'reflex', 'sketch', 'oddone', 'wedge', 'board', 'hottake', 'peek', 'hum', 'bomb', 'know'];
// Loop layouts: c columns × r rows around the edge of a grid (the middle shows what's going on).
export const LAYOUTS = [
  { id: 'classic', name: 'Classic Loop', c: 7, r: 5 },
  { id: 'grand', name: 'Grand Tour', c: 8, r: 5 },
  { id: 'speedway', name: 'Speedway', c: 6, r: 5 }
];
export const layoutOf = (t) => LAYOUTS.find((l) => l.id === t?.layout) || LAYOUTS[0];
export const spacesOf = (l) => 2 * l.c + 2 * l.r - 4;
// Space i of the loop → [row, column], clockwise from the top left.
export function cellOf(i, { c, r }) {
  if (i < c) return [1, i + 1];
  if (i < c + r - 2) return [i - c + 2, c];
  if (i < 2 * c + r - 2) return [r, c - (i - (c + r - 2))];
  return [r - 1 - (i - (2 * c + r - 2)), 1];
}
export const T = { roll: 15000, firstRoll: 2500, step: 2600, pick: 8000, score: 7000 };
export const PLACE = [500, 300, 200, 100];
export const LAST_PLACE = 50;
export const POINTS = { bonus: 300, trap: 200, lap: 400, steal: 200, shop: 150 };
export const ITEMS = {
  double: { icon: '🎲', name: 'Double Dice', what: 'Roll two dice' },
  swap: { icon: '🔄', name: 'Swap', what: 'Swap spots with a random player' },
  steal: { icon: '💰', name: 'Steal', what: `Take ${POINTS.steal} from the leader` },
  shield: { icon: '🛡️', name: 'Shield', what: 'Blocks the next trap or steal' }
};
export const MAX_ITEMS = 2;
const randomItem = () => { const k = Object.keys(ITEMS); return k[Math.floor(Math.random() * k.length)]; };
export const itemsOf = (t, uid) => Object.entries(t?.items?.[uid] || {}).filter(([, n]) => n > 0);
const itemCount = (t, uid) => itemsOf(t, uid).reduce((a, [, n]) => a + n, 0);
function giveItem(t, uid, k) {
  if (itemCount(t, uid) >= MAX_ITEMS) return false;
  const mine = (t.items[uid] = t.items[uid] || {});
  mine[k] = (mine[k] || 0) + 1;
  return true;
}
function takeItem(t, uid, k) {
  const mine = t.items[uid];
  if (!mine?.[k]) return false;
  mine[k] -= 1;
  if (!mine[k]) delete mine[k];
  return true;
}
export const TOUR_PHASES = ['troll', 'tmove', 'tpick', 'tscore'];

// core.js hands over its engine list (importing it here would be circular).
let ENGINES = {};
export const setEngines = (e) => (ENGINES = e);

// The first mode space at or after this space.
export function modeAt(board, from) {
  for (let i = 0; i < board.length; i++) {
    const sp = board[(from + i) % board.length];
    if (sp?.k === 'mode') return sp.m;
  }
  return 'closest';
}

function makeBoard(players, spaces) {
  const modes = TOUR_MODES.filter((m) => players >= (MODES[m].min || 1));
  const specials = ['bonus', 'bonus', 'bonus', 'trap', 'trap', 'item', 'item', 'shop'].map((k) => ({ k }));
  const nModes = spaces - 1 - specials.length;
  const modeSpaces = [];
  while (modeSpaces.length < nModes) modeSpaces.push(...shuffle(modes));
  let rest = shuffle([...specials, ...modeSpaces.slice(0, nModes).map((m) => ({ k: 'mode', m }))]);
  // No two specials side by side, and no two same modes side by side (a few tries is plenty).
  for (let t = 0; t < 30; t++) {
    const bad = rest.some((sp, i) => i > 0 && (sp.k !== 'mode' ? rest[i - 1].k !== 'mode' : rest[i - 1].m === sp.m));
    if (!bad) break;
    rest = shuffle(rest);
  }
  return [{ k: 'start' }, ...rest];
}

// The engine for the running mini game, with finish() sending the game back to the board.
function subG(g) {
  const sg = Object.create(g);
  sg.finish = () => endSub(g);
  return sg;
}
const subEngine = (s) => (s.settings.sub ? ENGINES[s.settings.sub] : null);

function startRound(g) {
  const s = g.state;
  const t = s.tour;
  t.round += 1;
  t.rolls = {};
  t.events = {};
  t.chooser = s.unitOrder[(t.round - 1) % s.unitOrder.length];
  t.mode = null;
  t.mini = {};
  t.place = {};
  t.used = {};
  t.dice = {};
  t.flash = null;
  t.until = g.now() + T.roll + (t.round === 1 ? T.firstRoll : 0);
  s.phase = 'troll';
  g.save();
}

const unitsHere = (g) => g.state.unitOrder.filter((u) => g.unitHere(u));

function roll(g, from) {
  const s = g.state;
  const t = s.tour;
  const uid = g.unitOf(from);
  if (s.phase !== 'troll' || !uid || t.rolls[uid]) return;
  rollFor(t, uid);
  t.rolledBy[uid] = from;
  if (unitsHere(g).every((u) => t.rolls[u])) startMove(g);
  else g.save();
}

const die = () => 1 + Math.floor(Math.random() * 6);
function rollFor(t, uid) {
  t.dice[uid] = t.used[uid]?.k === 'double' ? [die(), die()] : [die()];
  t.rolls[uid] = t.dice[uid].reduce((a, b) => a + b, 0);
}

// Items are used during the roll phase, before rolling. One per round. The shield works by itself.
function useItem(g, from, k) {
  const s = g.state;
  const t = s.tour;
  const uid = g.unitOf(from);
  if (s.phase !== 'troll' || !uid || t.rolls[uid] || t.used[uid] || !ITEMS[k] || k === 'shield') return;
  if (!t.items[uid]?.[k]) return;
  const flash = { uid, k, at: g.now() };
  if (k === 'steal') {
    // From the leader in points (not you). Their shield blocks it.
    const others = s.unitOrder.filter((u) => u !== uid);
    const top = Math.max(...others.map((u) => s.units[u].score));
    const leader = others.find((u) => s.units[u].score === top);
    if (!leader || top <= 0) return;
    flash.target = leader;
    if (takeItem(t, leader, 'shield')) flash.blocked = true;
    else {
      const pts = Math.min(POINTS.steal, s.units[leader].score);
      s.units[leader].score -= pts;
      s.units[uid].score += pts;
      flash.pts = pts;
    }
  } else if (k === 'swap') {
    const others = s.unitOrder.filter((u) => u !== uid);
    if (!others.length) return;
    const other = others[Math.floor(Math.random() * others.length)];
    [t.pos[uid], t.pos[other]] = [t.pos[other] || 0, t.pos[uid] || 0];
    flash.target = other;
  }
  takeItem(t, uid, k);
  t.used[uid] = { k };
  t.flash = flash;
  g.save();
}

function startMove(g) {
  const s = g.state;
  const t = s.tour;
  for (const u of s.unitOrder) if (!t.rolls[u]) rollFor(t, u);
  // The chooser moves last, for suspense.
  t.moveOrder = [...s.unitOrder.filter((u) => u !== t.chooser), t.chooser];
  t.moveIdx = -1;
  nextMove(g);
}

function nextMove(g) {
  const s = g.state;
  const t = s.tour;
  t.moveIdx += 1;
  if (t.moveIdx >= t.moveOrder.length) { startPick(g); return; }
  const uid = t.moveOrder[t.moveIdx];
  const from = t.pos[uid] || 0;
  const steps = t.rolls[uid];
  const n = t.board.length;
  const to = (from + steps) % n;
  const lap = from + steps >= n;
  const kind = t.board[to].k;
  const ev = { roll: steps, from, to, lap, kind };
  let pts = 0;
  if (lap) pts += POINTS.lap;
  if (kind === 'bonus') pts += POINTS.bonus;
  const unit = s.units[uid];
  if (kind === 'trap') {
    if (takeItem(t, uid, 'shield')) ev.shield = true;
    else pts -= Math.min(POINTS.trap, unit.score + pts);
  }
  if (kind === 'item') {
    const k = randomItem();
    if (giveItem(t, uid, k)) ev.item = k;
    else ev.full = true;
  }
  if (kind === 'shop') {
    // Auto-buy: a random item for 150 points, if you can afford it and have room.
    const k = randomItem();
    if (itemCount(t, uid) >= MAX_ITEMS) ev.full = true;
    else if (unit.score + pts < POINTS.shop) ev.broke = true;
    else { giveItem(t, uid, k); pts -= POINTS.shop; ev.item = k; ev.bought = true; }
  }
  unit.score += pts;
  t.pos[uid] = to;
  ev.pts = pts;
  t.events[uid] = ev;
  t.until = g.now() + T.step;
  s.phase = 'tmove';
  g.save();
}

function startPick(g) {
  const s = g.state;
  const t = s.tour;
  t.mode = modeAt(t.board, t.pos[t.chooser] || 0);
  t.until = g.now() + T.pick;
  s.phase = 'tpick';
  g.save();
}

function startSub(g) {
  const s = g.state;
  const t = s.tour;
  t.saved = {};
  for (const u of s.unitOrder) {
    t.saved[u] = s.units[u].score;
    s.units[u].score = 0; // the score bar shows this mini game's points while it runs
    s.units[u].wedges = {};
  }
  s.pscore = {};
  s.settings.sub = t.mode;
  g.mem = {};
  ENGINES[t.mode].start(subG(g));
}

function endSub(g) {
  const s = g.state;
  const t = s.tour;
  const sub = subEngine(s);
  sub?.stop?.(g);
  sub?.reset(s);
  delete s.settings.sub;
  s.turn = null;
  t.mini = {};
  t.place = {};
  for (const u of s.unitOrder) t.mini[u] = s.units[u].score;
  // Points by place; ties share a place, nothing for 0 points.
  const ranked = [...s.unitOrder].sort((a, b) => t.mini[b] - t.mini[a]);
  ranked.forEach((u, i) => {
    if (t.mini[u] <= 0) { t.place[u] = 0; return; }
    const first = ranked.findIndex((v) => t.mini[v] === t.mini[u]);
    t.place[u] = first < PLACE.length ? PLACE[first] : LAST_PLACE;
  });
  for (const u of s.unitOrder) {
    s.units[u].score = (t.saved[u] || 0) + t.place[u];
    s.units[u].wedges = {};
  }
  s.pscore = {};
  t.until = g.now() + T.score;
  s.phase = 'tscore';
  g.save();
}

function next(g) {
  const t = g.state.tour;
  if (t.round >= t.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.tour = s.tour ?? null;
    if (s.tour) {
      const t = s.tour;
      for (const k of ['pos', 'rolls', 'rolledBy', 'events', 'mini', 'place', 'saved', 'items', 'used', 'dice']) t[k] = t[k] || {};
      t.flash = t.flash ?? null;
      t.layout = t.layout || 'classic';
      t.board = t.board || [];
      t.moveOrder = t.moveOrder || [];
      t.mode = t.mode ?? null;
    }
  },
  reset(s) {
    if (s.settings.sub) ENGINES[s.settings.sub]?.reset(s);
    delete s.settings.sub;
    s.tour = null;
  },
  start(g) {
    const s = g.state;
    const len = MODES.tour.lengths[s.settings.length] || MODES.tour.lengths.quick;
    const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
    s.tour = {
      rounds: len.rounds, round: 0, layout: layout.id, board: makeBoard(g.playersHere().length, spacesOf(layout)), items: {},
      pos: Object.fromEntries(s.unitOrder.map((u) => [u, 0])), rolls: {}, rolledBy: {}, events: {}, moveOrder: [], moveIdx: -1
    };
    startRound(g);
  },
  stop(g) { subEngine(g.state)?.stop?.(g); },
  input(g, from, input) {
    const s = g.state;
    if (s.settings.sub) { subEngine(s).input(subG(g), from, input); return; }
    if (input.type === 'troll') roll(g, from);
    else if (input.type === 'titem') useItem(g, from, input.k);
  },
  skip(g) {
    const s = g.state;
    if (s.settings.sub) { subEngine(s).skip?.(subG(g)); return; }
    if (s.phase === 'troll') startMove(g);
    else if (s.phase === 'tmove') nextMove(g);
    else if (s.phase === 'tpick') startSub(g);
    else if (s.phase === 'tscore') next(g);
  },
  tick(g, now) {
    const s = g.state;
    if (s.settings.sub) { subEngine(s).tick(subG(g), now); return; }
    const t = s.tour;
    if (!t || now < t.until) return;
    if (s.phase === 'troll') startMove(g);
    else if (s.phase === 'tmove') nextMove(g);
    else if (s.phase === 'tpick') startSub(g);
    else if (s.phase === 'tscore') next(g);
  }
};

