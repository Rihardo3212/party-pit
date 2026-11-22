// When Lewis speaks: compares the previous and next game state (like the sound effects in
// Host.svelte) and picks a line. In host mode a real person reads the questions, so Lewis
// only does the jokes.

import { say, hush, preload, lewis } from './presenter.svelte.js';
import { line, placeLine, bombCatLine } from '../content/presenter.js';
import { placeById } from '../engine/pindrop.js';
import { catOf } from '../engine/bomb.js';

const count = (o) => Object.keys(o || {}).length;
const chance = (p) => Math.random() < p;

// Team name for team games, null for solo (solo lines never say names).
const teamOf = (s, uid) => (s.teamMode && uid ? s.units[uid]?.name || null : null);
const byUnit = (s, uid, solo, team) => {
  const t = teamOf(s, uid);
  return t ? line(team, t) : line(solo);
};

function read(s, text, opts = {}) {
  if (s.mode === 'host' || !text) return;
  say(text, { interrupt: true, maxWait: 2500, ...opts });
}

export function lewisReact(a, b) {
  if (!b || !a) return;

  // Lobby: greet new players now and then.
  if (b.phase === 'lobby' && b.order.length > a.order.length) {
    if (a.order.length === 0) say(line('lobbyFirst'));
    else if (chance(0.5)) say(line('lobbyJoin'), { maxWait: 1500 });
  }

  // The audience: say hello to the first watcher, and now and then to more.
  const crowdA = count(a.audience), crowdB = count(b.audience);
  if (crowdB > crowdA && (crowdA === 0 || chance(0.3))) say(line('crowd'), { maxWait: 2500 });

  if (a.phase !== b.phase) phase(a, b);
  else step(a, b);
}

function phase(a, b) {
  switch (b.phase) {
    case 'lobby': hush(); break;
    case 'teamdraw': say(line('teamDraw'), { interrupt: true }); break;
    case 'intro':
      say(line('welcome'), { interrupt: true });
      say(line(`intro_${b.settings.game}`), { maxWait: 14000 });
      break;

    // Brain Board
    case 'board':
      say(byUnit(b, b.turn, 'pick', 'pickTeam'), { maxWait: a.phase === 'reveal' ? 3000 : 6000 });
      break;
    case 'question':
      if (a.phase === 'answer') say(line('wrong'), { interrupt: true });
      else read(b, b.current?.q);
      break;
    case 'answer':
      say(byUnit(b, b.current?.buzzUnit, 'buzz', 'buzzTeam'), { interrupt: true });
      break;
    case 'reveal': {
      const c = b.current;
      if (c?.result === 'correct') say(byUnit(b, c.winner, 'correct', 'correctTeam'), { interrupt: true });
      else say(line(c?.wrongs?.length ? 'nobody' : 'timeUp'), { interrupt: true });
      break;
    }
    case 'finalBet': say(line('finalBet'), { interrupt: true }); break;
    case 'finalQ': read(b, b.final?.q); break;
    case 'finalReveal': say(line('finalReveal'), { interrupt: true }); break;

    // Wedge Rush
    case 'spin': if (chance(0.6)) say(line('spin'), { interrupt: true }); break;
    case 'wq': {
      const q = b.wedge?.q;
      if (!q) break;
      if (q.type === 'num') { say(line('numeric'), { interrupt: true }); read(b, q.text, { interrupt: false, maxWait: 4000 }); }
      else read(b, q.text);
      break;
    }
    case 'wreveal': {
      const w = b.wedge;
      if (w?.winner) say(byUnit(b, w.winner, 'wedgeWin', 'wedgeWinTeam'), { interrupt: true });
      else say(line('wedgeNone'), { interrupt: true });
      break;
    }

    // Fake Out
    case 'lie':
      read(b, b.fake?.text);
      say(line('lie'), { maxWait: b.mode === 'host' ? 3000 : 12000 });
      break;
    case 'pick': say(line('fakePick'), { interrupt: true }); break;

    // Doodle Dash
    case 'dchoose': say(line('doodleChoose'), { interrupt: true }); break;
    case 'ddraw': say(line('doodleGo'), { interrupt: true }); break;
    case 'dreveal':
      say(line(count(b.doodle?.guessed) ? 'doodleReveal' : 'doodleNobody'), { interrupt: true });
      break;

    // Pin Drop
    case 'pguess': say(line(b.pin?.double ? 'pinDouble' : 'pinGo'), { interrupt: true }); break;
    case 'preveal': {
      const p = b.pin;
      const place = placeById(p?.id);
      const bullseye = Object.values(p?.results || {}).some((r) => r.km <= 25);
      if (place) preload(placeLine(place));
      say(line(bullseye ? 'pinBullseye' : 'pinReveal'), { interrupt: true });
      if (place) say(placeLine(place), { maxWait: 6000 });
      break;
    }

    // Closest Call
    case 'cguess':
      say(line(b.close?.double ? 'closeDouble' : 'closeGo'), { interrupt: true, maxWait: 2000 });
      read(b, b.close?.q, { interrupt: false, maxWait: 5000 });
      break;
    case 'creveal': {
      const spot = Object.values(b.close?.results || {}).some((r) => r.spot);
      say(line(spot ? 'closeSpot' : 'closeReveal'), { interrupt: true });
      break;
    }

    // Timeline
    case 'tguess': if (b.line?.round === 1 || chance(0.35)) say(line('lineGo'), { interrupt: true }); break;
    case 'treveal': {
      const perfect = Object.values(b.line?.results || {}).some((r) => r.perfect);
      say(line(perfect ? 'linePerfect' : 'lineReveal'), { interrupt: true });
      break;
    }

    // Who Wrote That?
    case 'wwrite':
      read(b, b.who?.prompt);
      say(line('whoWrite'), { maxWait: 6000 });
      break;
    case 'wguess': if (b.who?.idx === 0 || chance(0.3)) say(line('whoGuess'), { interrupt: true }); break;
    case 'wshow': {
      const w = b.who;
      const right = Object.values(w?.guesses || {}).filter((p) => p === w.author).length;
      if (!right && count(w?.guesses)) say(line('whoFooled'), { interrupt: true });
      else if (right && chance(0.6)) say(line('whoRight'), { interrupt: true });
      break;
    }

    // Odd One Out
    case 'oclue': say(line('oddClue'), { interrupt: true }); break;
    case 'ovote': say(line('oddVote'), { interrupt: true }); break;
    case 'oguess': say(line('oddCaught'), { interrupt: true }); break;
    case 'oresult': {
      const o = b.odd;
      if (!o) break;
      const away = o.spies.some((p) => !o.caught.includes(p));
      const stole = Object.keys(o.stole || {}).length;
      say(line(away ? 'oddEscaped' : stole ? 'oddStole' : 'oddWin'), { interrupt: true });
      break;
    }

    // Scribble Chain
    case 'scwrite': say(line('scWrite'), { interrupt: true }); break;
    case 'scdraw': say(line('scDraw'), { interrupt: true }); break;
    case 'scdesc': say(line('scDesc'), { interrupt: true }); break;
    case 'scshow': if (b.chain?.showIdx === 0 || chance(0.4)) say(line('scShow'), { interrupt: true, maxWait: 1500 }); break;
    case 'scvote': if (b.chain?.showIdx === 0 || chance(0.3)) say(line('scVote'), { interrupt: true }); break;

    // Memory Sketch
    case 'mlook': if (b.sketch?.round === 1 || chance(0.4)) say(line('memLook'), { interrupt: true, maxWait: 800 }); break;
    case 'mdraw': if (b.sketch?.round === 1 || chance(0.4)) say(line('memDraw'), { interrupt: true }); break;
    case 'mreveal': {
      const great = Object.values(b.sketch?.results || {}).some((r) => r.pts >= 800);
      say(line(great ? 'memGreat' : 'memReveal'), { interrupt: true });
      break;
    }

    // Reflex Rumble: explain each mini game before it starts, never during it.
    case 'rready': if (b.reflex?.game) say(line(`reflex_${b.reflex.game}`), { interrupt: true, maxWait: 1000 }); break;
    case 'rgo': hush(); break;
    case 'rresult': if (chance(0.5)) say(line('reflexWin'), { interrupt: true }); break;

    // Party Tour
    case 'troll': if (b.tour?.round === 1 || chance(0.4)) say(line('tourRoll'), { interrupt: true }); break;
    case 'tmove': tourMove(b); break;
    case 'tpick': if (b.tour?.mode) say(line(`tourPick_${b.tour.mode}`), { interrupt: true }); break;
    case 'tscore': if (chance(0.5)) say(line('tourScore'), { interrupt: true }); break;

    // Hot Take
    case 'hrate':
      read(b, b.hot?.text);
      if (b.hot?.round === 1 || chance(0.3)) say(line('hotRate'), { maxWait: 8000 });
      break;
    case 'hreveal':
      say(line(b.hot?.hot ? 'hotHot' : 'hotReveal'), { interrupt: true });
      break;

    // Pixel Peek (Lewis may talk over the photo; a buzz cuts him off)
    case 'xplay':
      if (a.phase === 'xanswer') say(line('wrong'), { interrupt: true, maxWait: 800 });
      else if (b.peek?.round === 1 || chance(0.35)) say(line('peekGo'), { interrupt: true });
      break;
    case 'xanswer': say(byUnit(b, b.peek?.buzzUnit, 'buzz', 'buzzTeam'), { interrupt: true, maxWait: 600 }); break;
    case 'xreveal': {
      const r = b.peek;
      if (r?.result === 'right') say(byUnit(b, r.winner, 'correct', 'correctTeam'), { interrupt: true });
      else say(line(chance(0.5) ? 'peekReveal' : 'nobody'), { interrupt: true });
      break;
    }

    // Inside Jokes (player-written questions, so Lewis can't read them: he only reacts)
    case 'jplay':
      if (a.phase === 'janswer') say(line('wrong'), { interrupt: true, maxWait: 800 });
      else if (b.jokes?.round === 1 || chance(0.3)) say(line('jokesGo'), { interrupt: true });
      break;
    case 'janswer': say(byUnit(b, b.jokes?.buzzUnit, 'buzz', 'buzzTeam'), { interrupt: true, maxWait: 600 }); break;
    case 'jreveal': {
      const r = b.jokes;
      if (r?.result === 'right') say(byUnit(b, r.winner, 'correct', 'correctTeam'), { interrupt: true });
      else say(line(chance(0.5) ? 'jokesReveal' : 'nobody'), { interrupt: true });
      break;
    }

    // Hum Hunt: never talk over the tune. Only the reveal.
    case 'uplay': case 'uanswer': hush(); break;
    case 'ureveal': {
      const r = b.hum;
      if (r?.result === 'right') say(byUnit(b, r.winner, 'correct', 'correctTeam'), { interrupt: true, maxWait: 1500 });
      else say(line('nobody'), { interrupt: true, maxWait: 1500 });
      if (chance(0.4)) say(line('humReveal'), { maxWait: 4000 });
      break;
    }

    // Bomb Pass
    case 'bplay': {
      const c = catOf(b.bomb?.cat);
      if (c) say(bombCatLine(c), { interrupt: true, maxWait: 2000 });
      break;
    }
    case 'bboom': say(line('bombBoom'), { interrupt: true }); break;

    // Who Knows Who
    case 'kwrite': say(line('knowWrite'), { interrupt: true }); break;
    case 'kguess': if (b.know?.idx === 0 || chance(0.3)) say(line('knowGuess'), { interrupt: true }); break;
    case 'kreveal': {
      const k = b.know;
      const knew = Object.values(k?.picks || {}).filter((i) => i === k.correct).length;
      if (!knew) say(line('knowNobody'), { interrupt: true });
      else if (chance(0.6)) say(line('knowKnew'), { interrupt: true });
      break;
    }

    case 'end': {
      const r = b.results;
      if (!r) break;
      hush();
      setTimeout(() => {
        if (r.winners.length > 1) say(line('tie'));
        else say(byUnit(b, r.winners[0], 'winner', 'winnerTeam'));
        // Then the awards, in the order the cards appear.
        if (r.awards?.length) {
          say(line('awards'), { maxWait: 9000 });
          for (const aw of r.awards) say(line(`award_${aw.key}`), { maxWait: 16000 });
        }
      }, 1200);
      break;
    }
  }
}

function step(a, b) {
  // Party Tour: each piece's move, and items used before rolling.
  if (b.phase === 'tmove' && b.tour && a.tour && b.tour.moveIdx !== a.tour.moveIdx) tourMove(b);
  const fl = b.tour?.flash;
  if (b.phase === 'troll' && fl && fl.at !== a.tour?.flash?.at) {
    const kind = fl.k === 'steal' ? (fl.blocked ? 'tourBlocked' : 'tourSteal') : fl.k === 'swap' ? 'tourSwap' : 'tourDouble';
    say(line(kind), { interrupt: true, maxWait: 1200 });
  }
  // Bomb Pass: a word goes to the vote, or gets voted out.
  const ba = a.bomb, bb = b.bomb;
  if (b.phase === 'bplay' && ba && bb) {
    if (bb.vote && !ba.vote) say(line('bombVote'), { interrupt: true, maxWait: 1000 });
    else if (bb.flash?.t === 'no' && bb.flash.at !== ba.flash?.at && chance(0.6)) say(line('bombNo'), { interrupt: true, maxWait: 800 });
  }
  // Fake Out reveal: each lie that fooled someone, then the truth.
  if (b.phase === 'freveal' && b.fake && a.fake && b.fake.step > a.fake.step && b.fake.step < b.fake.order.length) {
    const opt = b.fake.options.find((o) => o.id === b.fake.order[b.fake.step]);
    say(line(opt?.kind === 'truth' ? 'truth' : 'fooled'), { interrupt: true });
  }
  // Doodle Dash: first correct guess.
  if (b.phase === 'ddraw' && b.doodle && a.doodle && count(b.doodle.guessed) === 1 && count(a.doodle.guessed) === 0) {
    say(line('doodleGot'), { maxWait: 1500 });
  }
}

function tourMove(b) {
  const t = b.tour;
  const ev = t?.events?.[t.moveOrder?.[t.moveIdx]];
  if (!ev) return;
  if (ev.kind === 'trap') say(line(ev.shield ? 'tourShield' : 'tourTrap'), { interrupt: true, maxWait: 1200 });
  else if (ev.item) say(line(ev.bought ? 'tourShop' : 'tourItem'), { interrupt: true, maxWait: 1200 });
  else if (ev.kind === 'goal') say(line('tourGoal'), { interrupt: true, maxWait: 1200 });
  else if (ev.kind === 'bonus' && chance(0.7)) say(line('tourBonus'), { interrupt: true, maxWait: 1200 });
  else if (ev.lap && chance(0.6)) say(line('tourLap'), { interrupt: true, maxWait: 1200 });
}

// Long timed phases where a "hurry up" fits at 5 seconds left.
const HURRY = new Set(['lie', 'pick', 'ddraw', 'pguess', 'finalBet', 'finalQ', 'wq', 'cguess', 'tguess', 'wwrite', 'oclue', 'ovote', 'scdraw', 'mdraw', 'troll', 'hrate', 'kwrite', 'kguess']);

/** Call once when a countdown reaches 5 seconds. */
export function lewisHurry(s) {
  if (!s || !HURRY.has(s.phase) || lewis.speaking || !chance(0.5)) return;
  say(line('hurry'), { maxWait: 800 });
}
