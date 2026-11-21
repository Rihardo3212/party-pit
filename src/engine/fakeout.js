// Fake Out: everyone writes a believable lie for a weird fact, then tries to spot the truth.
import { FAKEOUT } from '../content/fakeout.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, pick, squash } from './util.js';

export const T = { lie: 60000, pick: 25000, step: 3600, after: 3000, intro: 2500 };
export const POINTS = { truth: 1000, fool: 500 };

function truthsOf(p) { return [p.truth, ...(p.alts || [])]; }

function startRound(g) {
  const s = g.state;
  const f = s.fake;
  f.round += 1;
  const free = FAKEOUT.map((_, i) => i).filter((i) => !f.used[i]);
  const idx = pick(free.length ? free : FAKEOUT.map((_, i) => i));
  f.used[idx] = true;
  f.idx = idx;
  f.text = FAKEOUT[idx].text;
  f.truth = s.mode === 'host' ? FAKEOUT[idx].truth : null;
  f.lies = {};
  f.rejects = {};
  f.options = [];
  f.picks = {};
  f.order = [];
  f.step = -1;
  f.gained = {};
  f.until = g.now() + T.intro + T.lie;
  s.phase = 'lie';
  g.save();
}

function submitLie(g, from, text) {
  const s = g.state;
  const f = s.fake;
  const uid = g.unitOf(from);
  if (s.phase !== 'lie' || !uid || f.lies[uid]) return;
  const clean = String(text || '').trim().slice(0, 40);
  if (!clean) return;
  const p = FAKEOUT[f.idx];
  if (truthsOf(p).some((t) => squash(t) === squash(clean))) {
    f.rejects[uid] = (f.rejects[uid] || 0) + 1; // phone says "that's the real answer, write a fake one"
    g.save();
    return;
  }
  f.lies[uid] = { text: clean, by: from };
  if (s.unitOrder.every((u) => f.lies[u] || !g.unitHere(u))) startPick(g);
  else g.save();
}

function startPick(g) {
  const s = g.state;
  const f = s.fake;
  const p = FAKEOUT[f.idx];
  const opts = [{ id: 't', text: p.truth, kind: 'truth', authors: [] }];
  const byText = {};
  for (const u of s.unitOrder) {
    const l = f.lies[u];
    if (!l) continue;
    const k = squash(l.text);
    if (byText[k]) byText[k].authors.push(u);
    else {
      byText[k] = { id: `l${Object.keys(byText).length}`, text: l.text, kind: 'lie', authors: [u] };
      opts.push(byText[k]);
    }
  }
  for (const h of shuffle(p.lies)) {
    if (opts.length >= Math.max(4, s.unitOrder.length + 1)) break;
    if (!opts.some((o) => squash(o.text) === squash(h))) opts.push({ id: `h${opts.length}`, text: h, kind: 'house', authors: [] });
  }
  f.options = shuffle(opts);
  f.picks = {};
  f.until = g.now() + T.pick;
  s.phase = 'pick';
  g.save();
}

function choose(g, from, optId) {
  const s = g.state;
  const f = s.fake;
  const uid = g.unitOf(from);
  if (s.phase !== 'pick' || !uid || f.picks[uid]) return;
  const opt = f.options.find((o) => o.id === optId);
  if (!opt || opt.authors.includes(uid)) return;
  f.picks[uid] = { id: optId, by: from };
  if (s.unitOrder.every((u) => f.picks[u] || !g.unitHere(u))) startReveal(g);
  else g.save();
}

function startReveal(g) {
  const s = g.state;
  const f = s.fake;
  const pickedBy = (id) => s.unitOrder.filter((u) => f.picks[u]?.id === id);
  // Lies that fooled someone first, then the truth.
  f.order = f.options.filter((o) => o.kind !== 'truth' && pickedBy(o.id).length).map((o) => o.id);
  f.order.push('t');
  f.step = -1;
  f.truth = FAKEOUT[f.idx].truth;
  f.gained = {};
  f.nextAt = g.now() + 1200;
  s.phase = 'freveal';
  g.save();
}

function revealStep(g) {
  const s = g.state;
  const f = s.fake;
  f.step += 1;
  if (f.step >= f.order.length) {
    if (f.round >= f.rounds) g.finish();
    else startRound(g);
    return;
  }
  const opt = f.options.find((o) => o.id === f.order[f.step]);
  const pickers = s.unitOrder.filter((u) => f.picks[u]?.id === opt.id);
  if (opt.kind === 'truth') {
    for (const u of pickers) { s.units[u].score += POINTS.truth; f.gained[u] = (f.gained[u] || 0) + POINTS.truth; g.stat(u, 'eye'); }
  } else if (opt.kind === 'lie') {
    for (const a of opt.authors) {
      const pts = POINTS.fool * pickers.length;
      s.units[a].score += pts;
      f.gained[a] = (f.gained[a] || 0) + pts;
      g.stat(a, 'fooled', pickers.length);
    }
    for (const u of pickers) g.stat(u, 'gotFooled');
  }
  f.nextAt = g.now() + (f.step === f.order.length - 1 ? T.step + T.after : T.step);
  g.save();
}

export default {
  normalize(s) {
    s.fake = s.fake ?? null;
    if (s.fake) {
      const f = s.fake;
      for (const k of ['lies', 'rejects', 'picks', 'gained', 'used']) f[k] = f[k] || {};
      f.options = (f.options || []).map((o) => ({ ...o, authors: o.authors || [] }));
      f.order = f.order || [];
      f.truth = f.truth ?? null;
    }
  },
  reset(s) { s.fake = null; },
  start(g) {
    const s = g.state;
    s.fake = { rounds: lengthOf(s.settings).rounds, round: 0, used: {} };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'lie') submitLie(g, from, input.text);
    if (input.type === 'fpick') choose(g, from, input.id);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'lie') startPick(g);
    else if (s.phase === 'pick') startReveal(g);
  },
  tick(g, now) {
    const s = g.state;
    const f = s.fake;
    if (!f) return;
    if (s.phase === 'lie' && now >= f.until) startPick(g);
    else if (s.phase === 'pick' && now >= f.until) startReveal(g);
    else if (s.phase === 'freveal' && now >= f.nextAt) revealStep(g);
  }
};
