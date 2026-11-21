// Brain Board: Jeopardy-style board, buzzers and a betting final round.
import { CATEGORIES, getQuestion, questionsForTier } from '../content/trivia.js';
import { FINALS } from '../content/finals.js';
import { lengthOf } from '../lib/modes.js';
import { shuffle, pick } from './util.js';

export const T = {
  buzz: 10000,          // buzzers stay open
  answerParty: 10000,   // pick an option after buzzing
  answerHost: 30000,    // safety timeout while the host judges
  reveal: 3800,         // answer stays on screen
  bet: 30000,           // final round: time to bet
  finalParty: 30000,    // final round: time to answer (options)
  finalHost: 45000,     // final round: time to type an answer
  finalIntro: 1500,
  revealStep: 3600,     // final round: time per unit in the reveal
  settle: 250           // compare buzz times this long after the first buzz
};

export const MIN_BET = 500; // everyone may bet at least this much (comeback bets)
export const maxBet = (s, uid) => Math.max(s.units[uid]?.score || 0, MIN_BET);

function questionOf(s, cur) {
  return getQuestion(s.board.cats[cur.c].id, s.board.q[`${cur.c}-${cur.r}`]);
}

function save(g) { g.save(); }

function newBoard(g) {
  const s = g.state;
  const len = lengthOf(s.settings);
  const cats = shuffle(CATEGORIES).slice(0, len.cats);
  const q = {};
  for (let c = 0; c < cats.length; c++) {
    for (let r = 0; r < len.rows; r++) q[`${c}-${r}`] = pick(questionsForTier(cats[c].id, r));
  }
  s.board = { cats: cats.map((c) => ({ id: c.id, name: c.name, icon: c.icon })), rows: len.rows, used: {}, q, noFinal: !!len.noFinal };
  s.turn = pick(s.unitOrder);
  s.current = null;
  s.final = null;
  s.phase = 'board';
}

function pickTile(g, from, c, r) {
  const s = g.state;
  const uid = g.unitOf(from);
  if (s.phase !== 'board' || !uid) return;
  if (uid !== s.turn && g.unitHere(s.turn)) return;
  if (!s.board.cats[c] || r < 0 || r >= s.board.rows || s.board.used[`${c}-${r}`]) return;

  const cat = s.board.cats[c];
  const q = getQuestion(cat.id, s.board.q[`${c}-${r}`]);
  const readMs = Math.min(5500, 1800 + q.q.length * 35);
  s.current = {
    c, r,
    cat: cat.name,
    icon: cat.icon,
    value: (r + 1) * 100,
    q: q.q,
    options: shuffle([q.a, ...q.w]),
    answer: s.mode === 'host' ? q.a : null, // the host phone needs it; the big screen hides it
    openAt: g.now() + readMs,
    open: false,
    closeAt: null,
    lockedOut: {},
    buzzer: null,
    buzzUnit: null,
    answerUntil: null,
    wrongs: [],
    correctIndex: null,
    result: null,
    chosen: null,
    winner: null,
    revealUntil: null
  };
  s.phase = 'question';
  g.mem.pendingBuzzes = [];
  save(g);
}

function buzz(g, from, ts) {
  const s = g.state;
  const cur = s.current;
  const uid = g.unitOf(from);
  if (s.phase !== 'question' || !cur || !cur.open || !uid || cur.lockedOut[uid]) return;
  const pending = (g.mem.pendingBuzzes = g.mem.pendingBuzzes || []);
  if (pending.some((b) => b.id === from)) return;
  pending.push({ id: from, uid, ts: typeof ts === 'number' ? ts : g.now() });
  if (!g.mem.buzzTimer) g.mem.buzzTimer = setTimeout(() => settleBuzz(g), T.settle);
}

function settleBuzz(g) {
  g.mem.buzzTimer = null;
  const s = g.state;
  const pending = g.mem.pendingBuzzes || [];
  g.mem.pendingBuzzes = [];
  if (s.phase !== 'question' || !pending.length) return;
  const first = [...pending].sort((a, b) => a.ts - b.ts)[0];
  s.current.buzzer = first.id;
  s.current.buzzUnit = first.uid;
  // How fast they buzzed after the buzzers opened (for the Fastest Finger award).
  g.mem.buzzMs = s.current.closeAt ? first.ts - (s.current.closeAt - T.buzz) : null;
  s.current.answerUntil = g.now() + (s.mode === 'host' ? T.answerHost : T.answerParty);
  s.phase = 'answer';
  save(g);
}

function resolve(g, right, chosen) {
  const s = g.state;
  const cur = s.current;
  const uid = cur.buzzUnit;
  const unit = s.units[uid];
  if (!unit) return;

  if (right) {
    unit.score += cur.value;
    g.stat(cur.buzzer, 'right');
    if (typeof g.mem.buzzMs === 'number' && g.mem.buzzMs >= 0) g.statMin(cur.buzzer, 'buzz', g.mem.buzzMs);
    s.turn = uid;
    reveal(g, 'correct', chosen, uid);
    return;
  }

  unit.score -= cur.value;
  g.stat(cur.buzzer, 'wrong');
  cur.lockedOut[uid] = true;
  cur.wrongs.push({ id: cur.buzzer, uid, i: chosen });
  cur.buzzer = null;
  cur.buzzUnit = null;
  cur.answerUntil = null;

  const left = s.unitOrder.filter((u) => !cur.lockedOut[u] && g.unitHere(u));
  if (!left.length) {
    reveal(g, 'nobody');
  } else {
    s.phase = 'question';
    cur.open = true;
    cur.closeAt = g.now() + T.buzz;
    save(g);
  }
}

function reveal(g, result, chosen = null, winner = null) {
  const s = g.state;
  const cur = s.current;
  const q = questionOf(s, cur);
  cur.answer = q.a;
  cur.correctIndex = cur.options.indexOf(q.a);
  cur.result = result;
  cur.chosen = chosen;
  cur.winner = winner;
  cur.revealUntil = g.now() + T.reveal;
  s.phase = 'reveal';
  save(g);
}

/* ---------- final round ---------- */

function startFinal(g) {
  const s = g.state;
  const fi = Math.floor(Math.random() * FINALS.length);
  const fq = FINALS[fi];
  s.final = {
    fi,
    cat: fq.cat,
    icon: fq.icon,
    q: fq.q,
    options: shuffle([fq.a, ...fq.w]),
    answer: s.mode === 'host' ? fq.a : null,
    bets: {},
    betBy: {},
    answers: {},
    judged: {},
    deltas: {},
    betUntil: g.now() + T.finalIntro + T.bet,
    until: null,
    order: [],
    revealIdx: -1,
    nextAt: null,
    correctIndex: null
  };
  s.current = null;
  s.phase = 'finalBet';
  save(g);
}

function bet(g, from, amount) {
  const s = g.state;
  const uid = g.unitOf(from);
  if (s.phase !== 'finalBet' || !uid || s.final.bets[uid] !== undefined) return;
  s.final.bets[uid] = Math.max(0, Math.min(maxBet(s, uid), Math.round(Number(amount) || 0)));
  s.final.betBy[uid] = from;
  if (s.unitOrder.every((u) => s.final.bets[u] !== undefined)) startFinalQuestion(g);
  else save(g);
}

function startFinalQuestion(g) {
  const s = g.state;
  for (const u of s.unitOrder) if (s.final.bets[u] === undefined) s.final.bets[u] = 0;
  s.final.until = g.now() + (s.mode === 'host' ? T.finalHost : T.finalParty);
  s.phase = 'finalQ';
  save(g);
}

function finalAnswer(g, from, input) {
  const s = g.state;
  const uid = g.unitOf(from);
  if (s.phase !== 'finalQ' || !uid || s.final.answers[uid]) return;
  if (s.mode === 'host') {
    const text = String(input.text || '').trim().slice(0, 60);
    if (!text) return;
    s.final.answers[uid] = { text, by: from };
  } else {
    if (!Number.isInteger(input.i) || input.i < 0 || input.i > 3) return;
    s.final.answers[uid] = { i: input.i, by: from };
  }
  if (s.unitOrder.every((u) => s.final.answers[u])) endFinalQuestion(g);
  else save(g);
}

function endFinalQuestion(g) {
  const s = g.state;
  const fq = FINALS[s.final.fi];
  if (s.mode === 'host') {
    s.phase = 'finalJudge';
    save(g);
    return;
  }
  for (const u of s.unitOrder) {
    const a = s.final.answers[u];
    s.final.judged[u] = !!a && s.final.options[a.i] === fq.a;
  }
  startFinalReveal(g);
}

function startFinalReveal(g) {
  const s = g.state;
  const fq = FINALS[s.final.fi];
  for (const u of s.unitOrder) if (s.final.judged[u] === undefined) s.final.judged[u] = false;
  s.final.answer = fq.a;
  s.final.correctIndex = s.final.options.indexOf(fq.a);
  s.final.order = [...s.unitOrder].sort((a, b) => s.units[a].score - s.units[b].score);
  s.final.revealIdx = -1;
  s.final.nextAt = g.now() + 2200;
  s.phase = 'finalReveal';
  save(g);
}

/* ---------- engine interface ---------- */

export default {
  normalize(s) {
    s.board = s.board ?? null;
    s.current = s.current ?? null;
    s.final = s.final ?? null;
    if (s.board) { s.board.used = s.board.used || {}; s.board.q = s.board.q || {}; }
    if (s.current) {
      const c = s.current;
      c.lockedOut = c.lockedOut || {};
      c.wrongs = c.wrongs || [];
      for (const k of ['buzzer', 'buzzUnit', 'chosen', 'correctIndex', 'answer', 'result', 'winner']) c[k] = c[k] ?? null;
    }
    if (s.final) {
      const f = s.final;
      for (const k of ['bets', 'betBy', 'answers', 'judged', 'deltas']) f[k] = f[k] || {};
      f.order = f.order || [];
      f.options = f.options || [];
      for (const k of ['answer', 'correctIndex']) f[k] = f[k] ?? null;
    }
  },

  reset(s) {
    s.board = null;
    s.current = null;
    s.final = null;
  },

  start(g) {
    newBoard(g);
    save(g);
  },

  stop(g) {
    clearTimeout(g.mem.buzzTimer);
  },

  input(g, from, input) {
    const s = g.state;
    switch (input.type) {
      case 'pick': pickTile(g, from, input.c, input.r); break;
      case 'buzz': buzz(g, from, input.ts); break;
      case 'answer':
        if (s.mode !== 'party' || s.phase !== 'answer' || s.current.buzzer !== from) return;
        if (!Number.isInteger(input.i) || input.i < 0 || input.i > 3) return;
        resolve(g, s.current.options[input.i] === questionOf(s, s.current).a, input.i);
        break;
      case 'judge':
        if (from !== s.hostId || s.phase !== 'answer') return;
        resolve(g, !!input.ok, null);
        break;
      case 'bet': bet(g, from, input.amount); break;
      case 'finalAnswer': finalAnswer(g, from, input); break;
      case 'finalJudge':
        if (from !== s.hostId || s.phase !== 'finalJudge' || !s.units[input.uid]) return;
        s.final.judged[input.uid] = !!input.ok;
        save(g);
        break;
      case 'finalDone':
        if (from !== s.hostId || s.phase !== 'finalJudge') return;
        startFinalReveal(g);
        break;
    }
  },

  skip(g) {
    const s = g.state;
    if (s.phase === 'question' || s.phase === 'answer') reveal(g, 'nobody');
  },

  tick(g, now) {
    const s = g.state;
    const cur = s.current;
    const f = s.final;
    switch (s.phase) {
      case 'question':
        if (!cur) break;
        if (!cur.open && now >= cur.openAt) {
          cur.open = true;
          cur.closeAt = now + T.buzz;
          save(g);
        } else if (cur.open && cur.closeAt && now >= cur.closeAt && !g.mem.buzzTimer) {
          reveal(g, 'nobody');
        }
        break;
      case 'answer':
        if (cur && now >= cur.answerUntil) resolve(g, false, null);
        break;
      case 'reveal':
        if (cur && now >= cur.revealUntil) {
          s.board.used[`${cur.c}-${cur.r}`] = true;
          s.current = null;
          if (Object.keys(s.board.used).length >= s.board.cats.length * s.board.rows) { if (s.board.noFinal) g.finish(); else startFinal(g); }
          else { s.phase = 'board'; save(g); }
        }
        break;
      case 'finalBet':
        if (f && now >= f.betUntil) startFinalQuestion(g);
        break;
      case 'finalQ':
        if (f && now >= f.until) endFinalQuestion(g);
        break;
      case 'finalReveal':
        if (f && now >= f.nextAt) {
          f.revealIdx += 1;
          if (f.revealIdx < f.order.length) {
            const uid = f.order[f.revealIdx];
            const delta = f.judged[uid] ? f.bets[uid] : -f.bets[uid];
            s.units[uid].score += delta;
            f.deltas[uid] = delta;
            if (f.judged[uid]) g.stat(uid, 'right');
            f.nextAt = now + T.revealStep;
            save(g);
          } else {
            g.finish();
          }
        }
        break;
    }
  }
};
