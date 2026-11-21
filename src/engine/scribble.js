// Scribble Chain: everyone writes a silly prompt. Each chain then passes along:
// the next player draws the prompt, the next describes the drawing, the next draws that, and so on.
// Then each chain is replayed step by step on the TV and everyone votes for their favorite step (+300 per vote).
// Chain i is started by order[i]; step k of chain i is done by order[(i + k) % N]. Text lives in state,
// drawings at rooms/CODE/chain/r{round}/c{i}s{k}.
import { STARTERS } from '../content/chain.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, pick } from './util.js';

export const T = { write: 45000, draw: 60000, desc: 30000, showText: 3500, showDraw: 5000, vote: 15000, tally: 3500, intro: 2500, grace: 800 };
export const POINTS = { vote: 300 };

export const kindOf = (k) => (k === 0 ? 'write' : k % 2 ? 'draw' : 'desc');
export const PHASE_OF = { write: 'scwrite', draw: 'scdraw', desc: 'scdesc' };
export const key = (i, k) => `c${i}s${k}`;
// Which chain this player works on at step k.
export const chainOf = (c, pid, k) => {
  const n = c.order.length;
  const me = c.order.indexOf(pid);
  return me < 0 ? -1 : (me - k + n * 10) % n;
};
export const authorOf = (c, i, k) => c.order[(i + k) % c.order.length];

function startRound(g) {
  const s = g.state;
  const c = s.chain;
  c.round += 1;
  c.order = shuffle(g.playersHere());
  c.len = Math.max(2, Math.min(c.order.length, c.steps));
  c.path = `chain/r${c.round}`;
  g.db.remove(g.path(c.path));
  c.texts = {};
  c.drawn = {};
  c.votes = {};
  c.gained = {};
  c.step = -1;
  nextStep(g, c.round === 1 ? T.intro : 0);
}

function nextStep(g, extra = 0) {
  const s = g.state;
  const c = s.chain;
  c.step += 1;
  c.done = {};
  if (c.step >= c.len) { startShow(g); return; }
  const kind = kindOf(c.step);
  c.until = g.now() + extra + T[kind];
  s.phase = PHASE_OF[kind];
  g.save();
}

const waitingOn = (g) => {
  const c = g.state.chain;
  return g.playersHere().filter((p) => c.order.includes(p) && !c.done[p]);
};

function stepInput(g, from, text) {
  const s = g.state;
  const c = s.chain;
  if (!['scwrite', 'scdraw', 'scdesc'].includes(s.phase) || c.done[from]) return;
  const i = chainOf(c, from, c.step);
  if (i < 0) return;
  const kind = kindOf(c.step);
  if (kind === 'draw') c.drawn[key(i, c.step)] = true;
  else {
    const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 70);
    if (!clean) return;
    c.texts[key(i, c.step)] = clean;
  }
  c.done[from] = true;
  if (!waitingOn(g).length) endStep(g);
  else g.save();
}

function endStep(g) {
  const c = g.state.chain;
  // Out of time on the first step: give the chain a random starting prompt.
  if (c.step === 0) {
    for (let i = 0; i < c.order.length; i++) if (!c.texts[key(i, 0)]) c.texts[key(i, 0)] = pick(STARTERS);
  }
  nextStep(g);
}

function startShow(g) {
  const s = g.state;
  const c = s.chain;
  c.showIdx = 0;
  c.showStep = 0;
  c.votes = {};
  c.tallied = false;
  c.until = g.now() + T.showText;
  s.phase = 'scshow';
  g.save();
}

function advanceShow(g) {
  const s = g.state;
  const c = s.chain;
  if (c.showStep + 1 < c.len) {
    c.showStep += 1;
    c.until = g.now() + (kindOf(c.showStep) === 'draw' ? T.showDraw : T.showText);
    g.save();
    return;
  }
  c.votes = {};
  c.tallied = false;
  c.until = g.now() + T.vote;
  s.phase = 'scvote';
  g.save();
}

// Players who can vote on the chain being shown: everyone here with at least one step that isn't theirs.
const voters = (g) => {
  const c = g.state.chain;
  return g.playersHere().filter((p) => c.order.includes(p));
};

function vote(g, from, k) {
  const s = g.state;
  const c = s.chain;
  if (s.phase !== 'scvote' || c.tallied || c.votes[from] !== undefined || !c.order.includes(from)) return;
  k = Number(k);
  if (!Number.isInteger(k) || k < 0 || k >= c.len) return;
  if (authorOf(c, c.showIdx, k) === from) return;
  c.votes[from] = k;
  if (voters(g).every((p) => c.votes[p] !== undefined)) tally(g);
  else g.save();
}

function tally(g) {
  const c = g.state.chain;
  c.gained = {};
  for (const k of Object.values(c.votes)) { const a = authorOf(c, c.showIdx, k); g.award(a, POINTS.vote, c.gained); g.stat(a, 'art'); }
  c.tallied = true;
  c.until = g.now() + T.tally;
  g.save();
}

function nextChain(g) {
  const s = g.state;
  const c = s.chain;
  if (c.showIdx + 1 < c.order.length) {
    c.showIdx += 1;
    c.showStep = 0;
    c.votes = {};
    c.gained = {};
    c.tallied = false;
    c.until = g.now() + T.showText;
    s.phase = 'scshow';
    g.save();
  } else if (c.round >= c.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.chain = s.chain ?? null;
    if (s.chain) {
      const c = s.chain;
      for (const k of ['texts', 'drawn', 'done', 'votes', 'gained']) c[k] = c[k] || {};
      c.order = c.order || [];
      c.tallied = !!c.tallied;
    }
  },
  reset(s) { s.chain = null; },
  start(g) {
    const s = g.state;
    const len = lengthOf(s.settings);
    s.chain = { rounds: len.rounds, steps: len.steps, round: 0 };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'scstep') stepInput(g, from, input.text);
    if (input.type === 'scvote') vote(g, from, input.k);
  },
  skip(g) {
    const s = g.state;
    const c = s.chain;
    if (['scwrite', 'scdraw', 'scdesc'].includes(s.phase)) endStep(g);
    else if (s.phase === 'scshow') advanceShow(g);
    else if (s.phase === 'scvote') { if (c.tallied) nextChain(g); else tally(g); }
  },
  tick(g, now) {
    const s = g.state;
    const c = s.chain;
    if (!c) return;
    if (['scwrite', 'scdesc'].includes(s.phase) && now >= c.until) endStep(g);
    else if (s.phase === 'scdraw' && now >= c.until + T.grace) endStep(g);
    else if (s.phase === 'scshow' && now >= c.until) advanceShow(g);
    else if (s.phase === 'scvote' && now >= c.until) { if (c.tallied) nextChain(g); else tally(g); }
  }
};
