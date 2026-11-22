// Shared engine for "buzz in, then pick 1 of 4" modes (Pixel Peek, Hum Hunt).
// A clue plays out on the big screen (a photo zooming out, a tune playing). Anyone can buzz;
// the first buzzer picks from 4 options. Right = points that shrink the longer the clue has played.
// Wrong = that player's unit is locked out and the clue carries on for everyone else.
// Teams: any teammate can buzz, the whole team is locked out after a wrong pick.
//
// cfg: {
//   key: state key ('peek'), p: phase prefix ('x' → xplay / xanswer / xreveal),
//   T: { play, answer, reveal, intro },
//   choose(n, s) → list of item ids, item(id, s) → { answer, options: [4 strings] },
//   canBuzz(s, from, round) → false to keep someone out (optional),
//   extra(item, round, rounds) → extra fields for the round (optional)
// }
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const PTS = { max: 1000, min: 200 };
export const pointsAt = (elapsed, play) => Math.round(PTS.max - (PTS.max - PTS.min) * Math.min(1, Math.max(0, elapsed / play)));
const SETTLE = 250; // compare buzz times this long after the first buzz

// Up to 3 wrong options from a pool of names, never the answer, no repeats.
export function optionsWith(answer, pool) {
  const wrong = shuffle([...new Set(pool.filter((x) => x && x !== answer))]).slice(0, 3);
  return shuffle([answer, ...wrong]);
}

export function makeBuzzPick(cfg) {
  const { key, p, T } = cfg;
  const PH = { play: `${p}play`, answer: `${p}answer`, reveal: `${p}reveal` };
  const save = (g) => g.save();

  function startRound(g) {
    const s = g.state;
    const r = s[key];
    r.round += 1;
    r.id = r.list[r.round - 1];
    const it = cfg.item(r.id, s);
    r.options = it.options;
    r.answer = s.mode === 'host' ? it.answer : null; // only the host sees it early
    r.correctIndex = null;
    r.lockedOut = {};
    r.wrongs = [];
    r.buzzer = null;
    r.buzzUnit = null;
    r.chosen = null;
    r.result = null;
    r.winner = null;
    r.pts = 0;
    r.gained = {};
    r.elapsed = 0;
    Object.assign(r, cfg.extra?.(it, r.round, r.rounds) || {});
    r.startAt = g.now() + (r.round === 1 ? T.intro : 1500);
    r.until = r.startAt + T.play;
    g.mem.pending = [];
    s.phase = PH.play;
    save(g);
  }

  function buzz(g, from, ts) {
    const s = g.state;
    const r = s[key];
    const uid = g.unitOf(from);
    const now = g.now();
    if (s.phase !== PH.play || !uid || r.lockedOut[uid] || now < r.startAt) return;
    if (cfg.canBuzz && !cfg.canBuzz(s, from, r)) return;
    const pending = (g.mem.pending = g.mem.pending || []);
    if (pending.some((b) => b.id === from)) return;
    pending.push({ id: from, uid, ts: typeof ts === 'number' ? Math.max(ts, r.startAt) : now });
    if (!g.mem.buzzTimer) g.mem.buzzTimer = setTimeout(() => settle(g), SETTLE);
  }

  function settle(g) {
    g.mem.buzzTimer = null;
    const s = g.state;
    const r = s[key];
    const pending = g.mem.pending || [];
    g.mem.pending = [];
    if (s.phase !== PH.play || !pending.length) return;
    const first = [...pending].sort((a, b) => a.ts - b.ts)[0];
    r.buzzer = first.id;
    r.buzzUnit = first.uid;
    r.elapsed = Math.min(T.play, Math.max(0, first.ts - r.startAt));
    r.until = g.now() + T.answer;
    s.phase = PH.answer;
    save(g);
  }

  function answer(g, from, i) {
    const s = g.state;
    const r = s[key];
    if (s.phase !== PH.answer || r.buzzer !== from || !Number.isInteger(i) || i < 0 || i >= r.options.length) return;
    if (r.wrongs.some((w) => w.i === i)) return;
    const it = cfg.item(r.id, s);
    if (r.options[i] === it.answer) {
      r.chosen = i;
      r.pts = pointsAt(r.elapsed, T.play);
      r.winner = r.buzzUnit;
      r.gained = {};
      g.award(from, r.pts, r.gained);
      g.stat(from, 'right');
      g.statMin(from, 'buzz', r.elapsed);
      reveal(g, 'right');
    } else {
      wrong(g, i);
    }
  }

  // Wrong pick or ran out of time: lock that unit out, carry on with the clue.
  function wrong(g, i = null) {
    const s = g.state;
    const r = s[key];
    g.stat(r.buzzer, 'wrong');
    r.lockedOut[r.buzzUnit] = true;
    r.wrongs = [...r.wrongs, { id: r.buzzer, uid: r.buzzUnit, i }];
    r.buzzer = null;
    r.buzzUnit = null;
    const left = s.unitOrder.filter((u) => !r.lockedOut[u] && g.unitHere(u));
    if (!left.length || r.elapsed >= T.play) { reveal(g, 'nobody'); return; }
    // Resume where the clue stopped.
    r.startAt = g.now() + 800 - r.elapsed;
    r.until = r.startAt + T.play;
    s.phase = PH.play;
    save(g);
  }

  function reveal(g, result) {
    const s = g.state;
    const r = s[key];
    const it = cfg.item(r.id, s);
    r.answer = it.answer;
    r.correctIndex = r.options.indexOf(it.answer);
    r.result = result;
    r.until = g.now() + T.reveal;
    s.phase = PH.reveal;
    save(g);
  }

  function next(g) {
    const r = g.state[key];
    if (r.round >= r.rounds) g.finish();
    else startRound(g);
  }

  return {
    PH,
    normalize(s) {
      s[key] = s[key] ?? null;
      const r = s[key];
      if (r) {
        r.list = r.list || [];
        r.options = r.options || [];
        r.lockedOut = r.lockedOut || {};
        r.wrongs = r.wrongs || [];
        r.gained = r.gained || {};
        for (const k of ['answer', 'correctIndex', 'buzzer', 'buzzUnit', 'chosen', 'result', 'winner']) r[k] = r[k] ?? null;
        r.elapsed = r.elapsed || 0;
        r.pts = r.pts || 0;
        cfg.normalize?.(r);
      }
    },
    reset(s) { s[key] = null; },
    stop(g) { clearTimeout(g.mem.buzzTimer); g.mem.buzzTimer = null; },
    start(g) {
      const s = g.state;
      const list = cfg.choose(lengthOf(s.settings).rounds, s);
      s[key] = { rounds: list.length, round: 0, list };
      startRound(g);
    },
    input(g, from, input) {
      if (input.type === `${p}buzz`) buzz(g, from, input.ts);
      if (input.type === `${p}pick`) answer(g, from, Number(input.i));
    },
    skip(g) {
      const s = g.state;
      if (s.phase === PH.play) reveal(g, 'nobody');
      else if (s.phase === PH.answer) wrong(g);
      else if (s.phase === PH.reveal) next(g);
    },
    tick(g, now) {
      const s = g.state;
      const r = s[key];
      if (!r) return;
      if (s.phase === PH.play && now >= r.until && !g.mem.buzzTimer) { r.elapsed = T.play; reveal(g, 'nobody'); }
      else if (s.phase === PH.answer && now >= r.until) wrong(g);
      else if (s.phase === PH.reveal && now >= r.until) next(g);
    }
  };
}
