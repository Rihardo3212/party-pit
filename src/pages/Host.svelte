<script>
  // The big screen: runs the game engine and shows the room.
  // With `watch` set (#/watch/CODE) it only mirrors another big screen's room, for friends playing remotely.
  import { onMount, onDestroy } from 'svelte';
  import QRCode from 'qrcode';
  import Logo from '../components/Logo.svelte';
  import FxLayer from '../components/FxLayer.svelte';
  import LobbyView from '../views/host/LobbyView.svelte';
  import TeamDrawView from '../views/host/TeamDrawView.svelte';
  import IntroView from '../views/host/IntroView.svelte';
  import BoardStage from '../views/host/BoardStage.svelte';
  import WedgeStage from '../views/host/WedgeStage.svelte';
  import FakeStage from '../views/host/FakeStage.svelte';
  import DoodleStage from '../views/host/DoodleStage.svelte';
  import PinStage from '../views/host/PinStage.svelte';
  import ClosestStage from '../views/host/ClosestStage.svelte';
  import TourStage from '../views/host/TourStage.svelte';
  import ScribbleStage from '../views/host/ScribbleStage.svelte';
  import OddStage from '../views/host/OddStage.svelte';
  import WhoStage from '../views/host/WhoStage.svelte';
  import ReflexStage from '../views/host/ReflexStage.svelte';
  import SketchStage from '../views/host/SketchStage.svelte';
  import TimelineStage from '../views/host/TimelineStage.svelte';
  import EndView from '../views/host/EndView.svelte';
  import ScoreBar from '../views/host/ScoreBar.svelte';
  import { getDb, isLocal } from '../lib/db.js';
  import { newRoomCode, joinUrl, cleanCode } from '../lib/room.js';
  import { GameHost, normalize } from '../engine/core.js';
  import { MODES } from '../lib/modes.js';
  import { TOUR_PHASES } from '../engine/tour.js';
  import { WEDGES } from '../content/wedges.js';
  import { topWins } from '../lib/wins.js';
  import { AWARDS_AT, AWARD_GAP } from '../lib/awards.js';
  import { sfx, isMuted, setMuted, unlockAudio, audioReady } from '../lib/sound.js';
  import { play as playMusic, stopMusic, musicEnabled, setMusicEnabled } from '../lib/music.js';
  import { fx } from '../lib/fx.js';
  import { getTheme, toggleTheme } from '../lib/theme.js';
  import { DEVELOPER } from '../lib/brand.js';
  import Lewis from '../components/Lewis.svelte';
  import { lewis, setLewisOn, hush } from '../lib/presenter.svelte.js';
  import { lewisReact, lewisHurry } from '../lib/presenter-cues.js';
  import { fit } from '../lib/fit.js';

  let { arg = '', watch = '' } = $props();
  const watching = !!watch;
  let lost = $state(false); // watch mode: no room with that code

  let s = $state(null);
  let presence = $state({});
  let avatars = $state({});
  let qr = $state('');
  let url = $state('');
  let now = $state(Date.now());
  let muted = $state(isMuted());
  let music = $state(musicEnabled());
  let theme = $state(getTheme());
  let wins = $state(topWins());
  let soundOn = $state(audioReady());
  let db = $state(null);

  let host;
  let clock;
  let unsubAvatars;
  let prev = null;
  let lastTick = null;

  async function openRoom(resume) {
    host?.stop();
    unsubAvatars?.();
    prev = null;
    let code = resume ? sessionStorage.getItem('bb-host-code') : null;
    if (!code) {
      code = newRoomCode();
      sessionStorage.setItem('bb-host-code', code);
    }
    url = joinUrl(code);
    qr = await QRCode.toDataURL(url, { margin: 1, width: 420, color: { dark: '#1b1530', light: '#ffffff' } });
    const allowTiny = arg === 'tiny';
    host = new GameHost(db, code, {
      allowTiny,
      onChange: (st, pr) => {
        const next = JSON.parse(JSON.stringify(st));
        react(prev, next);
        prev = next;
        s = next;
        presence = { ...(pr || {}) };
      },
      onReact: (r) => { fx.react(r.e, r.color); sfx.react(); }
    });
    unsubAvatars = db.onValue(`rooms/${code}/avatars`, (a) => (avatars = a || {}));
    await host.start(!!resume);
    if (allowTiny && host.state.phase === 'lobby') { host.state.settings.length = 'tiny'; host.save(); }
  }

  // Watch mode: no engine here, just follow the room's state like a phone does.
  let watchUnsubs = [];
  async function openWatch() {
    const code = cleanCode(watch);
    url = joinUrl(code);
    qr = await QRCode.toDataURL(url, { margin: 1, width: 420, color: { dark: '#1b1530', light: '#ffffff' } });
    const opened = Date.now();
    watchUnsubs = [
      db.onValue(`rooms/${code}/state`, (raw) => {
        if (!raw) { lost = true; return; }
        const st = normalize(raw); // the database drops empty lists, put them back
        lost = false;
        react(prev, st);
        prev = st;
        s = st;
      }),
      db.onValue(`rooms/${code}/presence`, (pr) => (presence = { ...(pr || {}) })),
      db.onValue(`rooms/${code}/avatars`, (a) => (avatars = a || {})),
      db.onChildAdded(`rooms/${code}/reacts`, (_k, r) => {
        if (r && r.t > opened - 2000 && r.t > Date.now() - 4000) { fx.react(r.e, r.color); sfx.react(); }
      })
    ];
  }

  onMount(async () => {
    db = await getDb();
    if (watching) await openWatch();
    else await openRoom(true);
    clock = setInterval(() => {
      now = db.now();
      countdownTicks();
      soundOn = audioReady();
    }, 100);
  });

  onDestroy(() => {
    host?.stop();
    unsubAvatars?.();
    watchUnsubs.forEach((u) => u && u());
    clearInterval(clock);
    stopMusic();
    hush();
  });

  /* ---------- music, sounds and effects when the game changes ---------- */

  const MUSIC_FOR = {
    lobby: 'lobby', teamdraw: 'lobby', intro: 'lobby',
    board: 'board', question: 'think', answer: 'think', reveal: 'think',
    finalBet: 'final', finalQ: 'final', finalJudge: 'final', finalReveal: 'final',
    spin: 'board', wq: 'think', wreveal: 'think',
    lie: 'sneaky', pick: 'sneaky', freveal: 'sneaky',
    dchoose: 'chill', ddraw: 'chill', dreveal: 'chill',
    pguess: 'think', preveal: 'think',
    cguess: 'think', creveal: 'think',
    tguess: 'think', treveal: 'think',
    troll: 'board', tmove: 'board', tpick: 'board', tscore: 'board',
    scwrite: 'chill', scdraw: 'chill', scdesc: 'chill', scshow: 'chill', scvote: 'chill',
    oclue: 'sneaky', ovote: 'sneaky', oguess: 'sneaky', oresult: 'sneaky',
    wwrite: 'sneaky', wguess: 'sneaky', wshow: 'sneaky',
    rready: 'board', rgo: 'think', rresult: 'board',
    mlook: 'think', mdraw: 'chill', mreveal: 'chill'
  };
  const STAGE = new Set(['question', 'answer', 'reveal', 'finalBet', 'finalQ', 'finalJudge', 'finalReveal', 'spin', 'wq', 'wreveal', 'lie', 'pick', 'freveal', 'dchoose', 'ddraw', 'dreveal', 'pguess', 'preveal', 'cguess', 'creveal', 'tguess', 'treveal', 'troll', 'tmove', 'tpick', 'tscore', 'scwrite', 'scdraw', 'scdesc', 'scshow', 'scvote', 'oclue', 'ovote', 'oguess', 'oresult', 'wwrite', 'wguess', 'wshow', 'rready', 'rgo', 'rresult', 'mlook', 'mdraw', 'mreveal', 'tpick', 'tscore']);
  const count = (o) => Object.keys(o || {}).length;

  function react(a, b) {
    if (!b) return;
    if (!a) { playMusic(MUSIC_FOR[b.phase] ?? 'lobby'); return; }

    if (b.order.length > a.order.length) sfx.join();
    if (b.mode !== a.mode && b.phase === 'lobby') sfx.ding();
    if (b.settings.game !== a.settings.game && b.phase === 'lobby') sfx.pop();

    if (a.phase !== b.phase) {
      if (b.phase !== 'end' && MUSIC_FOR[b.phase]) playMusic(MUSIC_FOR[b.phase]);
      if (a.phase === 'intro') { sfx.fanfare(); fx.stamp("LET'S PARTY!", MODES[b.settings.game].color, MODES[b.settings.game].name); }
      phaseEffects(a, b);
    }
    stepEffects(a, b);
    lewisReact(a, b);
  }

  function phaseEffects(a, b) {
    const cb = b.current;
    switch (b.phase) {
      case 'teamdraw': sfx.whoosh(); fx.stamp('TEAM TIME!', '#2f8cff'); break;
      case 'intro': sfx.whoosh(); setTimeout(() => sfx.reveal(), 400); break;
      case 'question': if (a.phase === 'board') sfx.whoosh(); break;
      case 'answer': {
        const u = b.units[cb.buzzUnit];
        sfx.buzz(Math.max(0, b.unitOrder.indexOf(cb.buzzUnit)));
        fx.stamp('BUZZ!', u?.color || '#ff3b4f', b.players[cb.buzzer]?.name || '');
        break;
      }
      case 'reveal':
        if (cb.result === 'correct') {
          const u = b.units[cb.winner];
          sfx.correct();
          setTimeout(() => sfx.applause(1.4), 250);
          fx.stamp('CORRECT!', '#22c55e', `+${cb.value} ${u?.name || ''}`);
          fx.confetti(110, [u?.color || '#ffc400', '#ffc400', '#ffffff']);
        } else {
          sfx.sadTrombone();
          fx.stamp(cb.wrongs.length ? 'NOBODY!' : "TIME'S UP!", '#4b3f72', `It was: ${cb.answer}`);
        }
        break;
      case 'finalBet':
        sfx.rise();
        setTimeout(() => sfx.fanfare(), 600);
        fx.stamp('FINAL ROUND!', '#ff3b4f', 'Place your bets!');
        break;
      case 'finalQ': case 'wq': case 'pick': case 'ddraw': sfx.ding(); break;
      case 'finalReveal': sfx.drumroll(2); break;
      case 'spin': case 'lie': case 'dchoose': case 'pguess': case 'cguess': case 'tguess': sfx.whoosh(); break;
      case 'scwrite': case 'scdesc': sfx.whoosh(); break;
      case 'scdraw': sfx.ding(); break;
      case 'scshow': sfx.reveal(); break;
      case 'scvote': sfx.ding(); break;
      case 'oclue': sfx.whoosh(); break;
      case 'ovote': sfx.ding(); break;
      case 'oguess': sfx.stamp(); fx.stamp('CAUGHT!', '#ff3b4f', b.odd.caught.map((p) => b.players[p]?.name).join(' & ')); break;
      case 'oresult': {
        const o = b.odd;
        const away = o.spies.filter((p) => !o.caught.includes(p));
        sfx.drumroll(0.6);
        setTimeout(() => {
          if (away.length) { sfx.sadTrombone(); fx.stamp('SPY ESCAPED!', '#8b5cf6', away.map((p) => b.players[p]?.name).join(' & ')); }
          else { sfx.correct(); fx.confetti(60, ['#8b5cf6', '#ffffff']); fx.stamp(o.word.toUpperCase(), '#8b5cf6', 'was the word'); }
        }, 700);
        break;
      }
      case 'wwrite': sfx.whoosh(); break;
      case 'wguess': sfx.ding(); break;
      case 'wshow': {
        const w = b.who;
        const right = Object.values(w.guesses).filter((p) => p === w.author).length;
        sfx.drumroll(0.6);
        setTimeout(() => {
          if (right) { sfx.correct(); fx.confetti(60, ['#14b8a6', '#ffffff']); }
          else { sfx.stamp(); }
          fx.stamp(`${b.players[w.author]?.name || '???'}!`, '#14b8a6', right ? `${right} got it` : 'Fooled everyone!');
        }, 700);
        break;
      }
      case 'rready': sfx.whoosh(); break;
      case 'rgo': if (b.reflex.game !== 'green') sfx.open(); break;
      case 'rresult': {
        const r = b.reflex;
        const win = Object.entries(r.points).filter(([, p]) => p === 1000).map(([pid]) => b.players[pid]?.name);
        if (win.length) { sfx.correct(); fx.stamp('WINNER!', '#f97316', win.join(' & ')); fx.confetti(70, ['#f97316', '#ffc400', '#ffffff']); }
        else sfx.sadTrombone();
        break;
      }
      case 'mlook': sfx.whoosh(); break;
      case 'mdraw': sfx.ding(); break;
      case 'mreveal': {
        const m = b.sketch;
        sfx.drumroll(0.8);
        const top = Object.entries(m.results).filter(([, r]) => r.pts >= 800);
        setTimeout(() => {
          if (top.length) {
            sfx.correct();
            setTimeout(() => sfx.applause(1.2), 250);
            fx.confetti(90, ['#ec4899', '#ffffff', '#ffc400']);
            fx.stamp('MASTERPIECE!', '#ec4899', top.map(([pid]) => b.players[pid]?.name).join(' & '));
          } else if (count(m.results)) sfx.reveal();
          else sfx.sadTrombone();
        }, 900);
        break;
      }
      case 'treveal': {
        const l = b.line;
        sfx.drumroll(0.8);
        l.answer.forEach((_, i) => setTimeout(() => sfx.pinDrop(), 300 + i * 550));
        const perfect = Object.entries(l.results).filter(([, r]) => r.perfect);
        setTimeout(() => {
          if (perfect.length) {
            sfx.correct();
            setTimeout(() => sfx.applause(1.3), 250);
            fx.confetti(100, ['#eab308', '#ffffff', '#ffc400']);
            fx.stamp('PERFECT!', '#eab308', perfect.map(([pid]) => b.players[pid]?.name).join(' & '));
          } else if (count(l.orders)) sfx.reveal();
          else sfx.sadTrombone();
        }, 500 + l.answer.length * 550);
        break;
      }
      case 'creveal': {
        const c = b.close;
        const n = Object.keys(c.guesses).length;
        sfx.drumroll(1.1);
        for (let i = 0; i < n; i++) setTimeout(() => sfx.bloop(), 200 + i * 220);
        const spots = Object.entries(c.results).filter(([, r]) => r.spot);
        setTimeout(() => {
          sfx.pinDrop();
          if (spots.length) {
            sfx.correct();
            setTimeout(() => sfx.applause(1.4), 250);
            fx.confetti(110, ['#06b6d4', '#ffc400', '#ffffff']);
            fx.stamp('SPOT ON!', '#06b6d4', spots.map(([pid]) => b.players[pid]?.name).join(' & '));
          } else if (n) sfx.reveal();
          else sfx.sadTrombone();
        }, 600 + n * 220);
        break;
      }
      case 'preveal': {
        const p = b.pin;
        sfx.drumroll(1.1);
        const n = Object.keys(p.results).length;
        for (let i = 0; i < n; i++) setTimeout(() => sfx.pinDrop(), 250 + i * 150);
        const t = 1300 + n * 150;
        const hits = Object.entries(p.results).filter(([, r]) => r.km <= 25);
        setTimeout(() => {
          if (hits.length) {
            sfx.correct();
            setTimeout(() => sfx.applause(1.4), 250);
            fx.confetti(110, ['#ff8a1f', '#ffc400', '#ffffff']);
            fx.stamp('BULLSEYE!', '#ff8a1f', hits.map(([pid]) => b.players[pid]?.name).join(' & '));
          } else if (n) sfx.reveal();
          else sfx.sadTrombone();
        }, t);
        break;
      }
      case 'wreveal': {
        const w = b.wedge;
        const cat = WEDGES[w.spin.to];
        if (w.winner) {
          sfx.correct();
          setTimeout(() => sfx.applause(1.2), 250);
          fx.confetti(100, [cat.color, '#ffffff', '#ffc400']);
          fx.stamp('WEDGE!', cat.color, b.units[w.winner]?.name || '');
        } else {
          sfx.wrong();
        }
        break;
      }
      case 'freveal': sfx.drumroll(1.2); break;
      case 'dreveal': {
        const d = b.doodle;
        if (count(d.guessed)) { sfx.reveal(); fx.confetti(70, [b.players[d.drawer]?.color || '#22c55e', '#ffffff']); }
        else sfx.sadTrombone();
        fx.stamp(String(d.reveal || '').toUpperCase(), '#22c55e', count(d.guessed) ? `${count(d.guessed)} got it!` : 'Nobody got it!');
        break;
      }
      case 'end':
        stopMusic();
        sfx.fanfare();
        setTimeout(() => sfx.applause(2.4), 400);
        fx.confetti(260);
        setTimeout(() => fx.confetti(200), 900);
        (b.results?.awards || []).forEach((_, i) => setTimeout(() => sfx.ding(), AWARDS_AT(b) + i * AWARD_GAP));
        setTimeout(() => playMusic('lobby'), 4500);
        wins = topWins();
        break;
    }
  }

  function stepEffects(a, b) {
    // Party Tour board (phase changes and each move).
    if (b.tour && TOUR_PHASES.includes(b.phase)) {
      const t = b.tour;
      const moved = b.phase === 'tmove' && (a.phase !== 'tmove' || a.tour?.moveIdx !== t.moveIdx);
      if (b.phase === 'troll' && a.phase !== 'troll') sfx.whoosh();
      if (b.phase === 'troll' && a.phase === 'troll' && count(t.rolls) > count(a.tour?.rolls)) sfx.bloop();
      if (moved) {
        const ev = t.events[t.moveOrder[t.moveIdx]];
        sfx.pop();
        if (ev?.lap) setTimeout(() => sfx.rise(), 200);
        if (ev?.kind === 'bonus') setTimeout(() => { sfx.correct(); fx.confetti(30, ['#ffc400', '#ffffff']); }, 350);
        if (ev?.kind === 'trap') setTimeout(() => sfx.sadTrombone(), 350);
      }
      if (b.phase === 'tpick' && a.phase !== 'tpick' && t.mode) {
        sfx.drumroll(0.8);
        setTimeout(() => { sfx.fanfare(); fx.stamp(MODES[t.mode].name.toUpperCase(), MODES[t.mode].color, 'Next game!'); }, 800);
      }
      if (b.phase === 'tscore' && a.phase !== 'tscore') {
        const top = Object.keys(t.place).filter((u) => t.place[u] === 500).map((u) => b.units[u]?.name);
        if (top.length) { sfx.correct(); fx.stamp('ROUND WON!', '#22c55e', top.join(' & ')); }
        else sfx.stamp();
      }
    }
    const ca = a.current, cb = b.current;
    // Brain Board
    if (b.phase === 'question' && cb?.open && !(ca?.open && a.phase === 'question')) sfx.open();
    if (cb && ca && cb.wrongs.length > ca.wrongs.length && b.phase === 'question') {
      sfx.wrong();
      const w = cb.wrongs[cb.wrongs.length - 1];
      fx.stamp('NOPE!', '#ff3b4f', `-${cb.value} ${b.units[w.uid]?.name || ''}`);
    }
    if (b.final && a.final) {
      if (count(b.final.bets) > count(a.final.bets) && b.phase === 'finalBet') sfx.bloop();
      if (count(b.final.answers) > count(a.final.answers)) sfx.bloop();
      if (b.phase === 'finalReveal' && b.final.revealIdx > a.final.revealIdx && b.final.revealIdx < b.final.order.length) {
        const uid = b.final.order[b.final.revealIdx];
        if (b.final.judged[uid]) { sfx.correct(); fx.confetti(70, [b.units[uid].color, '#ffc400']); }
        else sfx.wrong();
        if (b.final.revealIdx + 1 < b.final.order.length) setTimeout(() => sfx.drumroll(1.6), 1700);
      }
    }
    // Wedge Rush
    if (b.wedge && a.wedge && b.phase === 'wq' && count(b.wedge.answers) > count(a.wedge.answers)) sfx.bloop();
    // Fake Out
    if (b.fake && a.fake) {
      if (b.phase === 'lie' && count(b.fake.lies) > count(a.fake.lies)) sfx.bloop();
      if (b.phase === 'pick' && count(b.fake.picks) > count(a.fake.picks)) sfx.bloop();
      if (b.phase === 'freveal' && b.fake.step > a.fake.step && b.fake.step < b.fake.order.length) {
        const opt = b.fake.options.find((o) => o.id === b.fake.order[b.fake.step]);
        if (opt?.kind === 'truth') { sfx.correct(); setTimeout(() => sfx.applause(1), 200); fx.confetti(80, ['#22c55e', '#ffffff', '#ffc400']); }
        else { sfx.stamp(); setTimeout(() => sfx.wrong(), 150); }
      }
    }
    // Pin Drop
    if (b.pin && a.pin && b.phase === 'pguess' && a.phase === 'pguess') {
      if (count(b.pin.pins) > count(a.pin.pins)) sfx.bloop();
      if (b.pin.rush > a.pin.rush) setTimeout(() => sfx.rise(), 120);
      if (b.pin.hint && !a.pin.hint) sfx.reveal();
    }
    // Closest Call
    if (b.close && a.close && b.phase === 'cguess' && count(b.close.guesses) > count(a.close.guesses)) sfx.bloop();
    // Scribble Chain
    if (b.chain && a.chain) {
      if (['scwrite', 'scdraw', 'scdesc'].includes(b.phase) && count(b.chain.done) > count(a.chain.done)) sfx.bloop();
      if (b.phase === 'scshow' && a.phase === 'scshow' && b.chain.showStep > a.chain.showStep) sfx.reveal();
      if (b.phase === 'scvote' && b.chain.tallied && !a.chain.tallied) {
        const top = Math.max(0, ...Object.values(b.chain.gained));
        if (top) { sfx.correct(); fx.confetti(40, ['#a855f7', '#ffffff']); } else sfx.stamp();
      }
    }
    // Odd One Out
    if (b.odd && a.odd && ['oclue', 'ovote'].includes(b.phase) && (count(b.odd.clues) > count(a.odd.clues) || count(b.odd.votes) > count(a.odd.votes))) sfx.bloop();
    // Who Wrote That?
    if (b.who && a.who && ['wwrite', 'wguess'].includes(b.phase) && (count(b.who.answers) > count(a.who.answers) || count(b.who.guesses) > count(a.who.guesses))) sfx.bloop();
    // Reflex Rumble
    if (b.reflex && a.reflex && b.phase === 'rgo' && count(b.reflex.results) > count(a.reflex.results)) sfx.bloop();
    // Memory Sketch
    if (b.sketch && a.sketch && b.phase === 'mdraw' && count(b.sketch.done) > count(a.sketch.done)) sfx.bloop();
    // Timeline
    if (b.line && a.line && b.phase === 'tguess' && count(b.line.orders) > count(a.line.orders)) sfx.bloop();
    // Doodle Dash
    if (b.doodle && a.doodle && b.phase === 'ddraw' && a.phase === 'ddraw') {
      if (count(b.doodle.guessed) > count(a.doodle.guessed)) sfx.correct();
      else if (b.doodle.feed.length && b.doodle.feed.at(-1)?.kind === 'close' && JSON.stringify(b.doodle.feed) !== JSON.stringify(a.doodle.feed)) sfx.bloop();
      if (b.doodle.hint !== a.doodle.hint) sfx.reveal();
    }
  }

  function deadline() {
    if (!s) return null;
    switch (s.phase) {
      case 'question': return s.current?.open ? s.current.closeAt : null;
      case 'answer': return s.mode === 'party' ? s.current?.answerUntil : null;
      case 'finalBet': return s.final?.betUntil;
      case 'finalQ': return s.final?.until;
      case 'teamdraw': return s.drawUntil;
      case 'wq': return s.wedge?.until;
      case 'lie': case 'pick': return s.fake?.until;
      case 'ddraw': return s.doodle?.until;
      case 'pguess': return s.pin?.until;
      case 'cguess': return s.close?.until;
      case 'troll': return s.tour?.until;
      case 'scwrite': return s.chain?.until;
      case 'scdraw': return s.chain?.until;
      case 'scdesc': return s.chain?.until;
      case 'scvote': return s.chain?.tallied ? null : s.chain?.until;
      case 'oclue': return s.odd?.until;
      case 'ovote': return s.odd?.until;
      case 'oguess': return s.odd?.until;
      case 'wwrite': return s.who?.until;
      case 'wguess': return s.who?.until;
      case 'rready': return s.reflex?.readyUntil;
      case 'mdraw': return s.sketch?.until;
      case 'tguess': return s.line?.until;
      default: return null;
    }
  }
  function countdownTicks() {
    const d = deadline();
    if (!d) { lastTick = null; return; }
    const left = Math.ceil((d - now) / 1000);
    if (left !== lastTick && left > 0 && left <= 5) left % 2 ? sfx.tick() : sfx.tock();
    if (left !== lastTick && left === 5 && lastTick !== null) lewisHurry(s);
    lastTick = left;
  }

  /* ---------- header buttons ---------- */

  function newRoom() {
    if (!s || s.phase === 'lobby' || s.phase === 'end' || window.confirm('Start a new room? The current game ends.')) openRoom(false);
  }
  function enableSound() {
    unlockAudio();
    soundOn = true;
    if (s) playMusic(MUSIC_FOR[s.phase] ?? 'lobby', true);
  }
  function toggleMusic() {
    music = !music;
    unlockAudio();
    setMusicEnabled(music);
    if (music && s) playMusic(MUSIC_FOR[s.phase] ?? 'lobby', true);
  }
  function toggleSfx() {
    muted = !muted;
    setMuted(muted);
    unlockAudio();
  }

  const here = (pid) => isLocal || !!presence[pid];
  const stage = $derived(!!s && STAGE.has(s.phase));
  const game = $derived(s?.settings.sub || s?.settings.game); // Party Tour: the running mini game
</script>

<div class="screen" class:stage>
  {#if stage}
    <div class="beams" aria-hidden="true"><span></span><span></span><span></span></div>
  {/if}
  <FxLayer />

  <header>
    <a href="#/" class="home" aria-label="Home"><Logo size={0.5} /></a>
    {#if s}
      <span class="sticker code">Room <b>{s.code}</b></span>
      <span class="pill mode">{s.mode === 'host' ? `🎤 Host: ${s.hostName}` : '🎉 Party mode'}</span>
      {#if watching}<span class="pill mode">👀 Watching</span>{/if}
    {/if}
    <div class="right">
      {#if !soundOn}
        <button class="btn sun small" onclick={enableSound}>🔊 Turn on sound</button>
      {/if}
      <button class="icon-btn" onclick={() => (theme = toggleTheme())} aria-label="Theme" title="Light / dark">{theme === 'dark' ? '☀️' : '🌙'}</button>
      <button class="icon-btn" class:off={!lewis.on} onclick={() => { unlockAudio(); setLewisOn(!lewis.on); }} aria-label="Lewis the presenter" title="Lewis, the presenter">🎙️</button>
      <button class="icon-btn" class:off={!music} onclick={toggleMusic} aria-label="Music" title="Music">🎵</button>
      <button class="icon-btn" onclick={toggleSfx} aria-label="Sound effects" title="Sound effects">{muted ? '🔇' : '🔊'}</button>
      {#if !watching}
        <button class="icon-btn" onclick={newRoom} aria-label="New room" title="New room">↻</button>
      {/if}
    </div>
  </header>

  <div class="fit-box" use:fit={{ min: 0.45 }}><div class="fit-in">
  {#if lost}
    <div class="center"><div class="lost"><h2>No room {cleanCode(watch)} right now</h2><p class="muted">Check the code on the big screen. This page updates by itself once the room is open.</p><a class="btn" href="#/">Home</a></div></div>
  {:else if !s}
    <div class="center"><h2>{watching ? 'Connecting to the big screen…' : 'Opening room…'}</h2></div>
  {:else if s.phase === 'lobby'}
    <LobbyView {s} {avatars} {qr} {url} {wins} {here} {watching} />
  {:else if s.phase === 'teamdraw'}
    <TeamDrawView {s} {avatars} {db} {now} />
  {:else if s.phase === 'intro'}
    <IntroView {s} {now} />
  {:else if s.phase === 'end' && s.results}
    <EndView {s} {avatars} />
  {:else if game === 'board'}
    <BoardStage {s} {avatars} {now} />
  {:else if game === 'wedge'}
    <WedgeStage {s} {avatars} {now} />
  {:else if game === 'fakeout'}
    <FakeStage {s} {avatars} {now} />
  {:else if game === 'doodle'}
    <DoodleStage {s} {avatars} {now} {db} />
  {:else if game === 'pindrop'}
    <PinStage {s} {avatars} {now} />
  {:else if game === 'sketch'}
    <SketchStage {s} {avatars} {now} {db} />
  {:else if game === 'reflex'}
    <ReflexStage {s} {avatars} {now} />
  {:else if game === 'whowrote'}
    <WhoStage {s} {avatars} {now} />
  {:else if game === 'oddone'}
    <OddStage {s} {avatars} {now} />
  {:else if game === 'scribble'}
    <ScribbleStage {s} {avatars} {now} {db} />
  {:else if game === 'tour'}
    <TourStage {s} {avatars} {now} />
  {:else if game === 'closest'}
    <ClosestStage {s} {avatars} {now} />
  {:else if game === 'timeline'}
    <TimelineStage {s} {avatars} {now} />
  {/if}
  </div></div>

  {#if s && !['lobby', 'end', 'teamdraw', 'intro'].includes(s.phase)}
    <ScoreBar {s} {avatars} {here} />
  {:else}
    <footer class="footer">a {DEVELOPER} game</footer>
  {/if}

  {#if lewis.on && s}
    <div class="presenter" class:low={!['lobby', 'end', 'teamdraw', 'intro'].includes(s.phase)} class:quiet={!lewis.speaking}>
      <Lewis level={lewis.level} talking={lewis.speaking} size={130} />
      {#if lewis.speaking}
        <div class="says">{lewis.text}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .screen { height: 100vh; height: 100dvh; display: flex; flex-direction: column; position: relative; overflow: hidden; }

  /* Game-show stage for questions and rounds */
  .screen.stage {
    background:
      radial-gradient(ellipse at 50% 120%, rgba(255, 59, 79, 0.35) 0%, transparent 45%),
      radial-gradient(ellipse at 50% 110%, #5b2bd6 0%, #2a1468 38%, #120a33 72%, #08051a 100%);
    color: #fff;
  }
  .beams { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .beams span {
    position: absolute; top: -20%; width: 34vw; height: 140%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 75%);
    clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
    transform-origin: 50% 0; filter: blur(6px);
  }
  .beams span:nth-child(1) { left: 2%; animation: sweep 7s ease-in-out infinite alternate; }
  .beams span:nth-child(2) { left: 33%; animation: sweep 9s ease-in-out infinite alternate-reverse; opacity: 0.7; }
  .beams span:nth-child(3) { right: 2%; animation: sweep 6s ease-in-out infinite alternate; animation-delay: -2s; }
  @keyframes sweep { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }

  header { display: flex; align-items: center; gap: 0.9rem; padding: 1rem 1.5rem 0.6rem; position: relative; z-index: 2; flex-wrap: wrap; }
  .home { text-decoration: none; margin-right: 0.4rem; }
  .code { font-size: 1.2rem; }
  .code b { color: var(--red); letter-spacing: 0.14em; }
  .right { margin-left: auto; display: flex; gap: 0.55rem; align-items: center; }
  .center { flex: 1; display: grid; place-items: center; }
  .lost { text-align: center; display: grid; gap: 0.8rem; justify-items: center; }
  .fit-box { overflow: hidden; } /* nobody scrolls a TV: content is zoomed to fit instead */
  .stage .pill { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: none; }
  .stage .footer { color: rgba(255, 255, 255, 0.6); }

  /* Lewis lives in the bottom-left corner, above the score bar during rounds. */
  .presenter {
    position: fixed; left: 14px; bottom: 10px; z-index: 5;
    display: flex; align-items: flex-end; gap: 0.6rem; pointer-events: none;
    transition: transform 0.35s cubic-bezier(0.2, 1.4, 0.4, 1), opacity 0.3s;
  }
  .presenter.low { bottom: 104px; }
  .presenter.quiet { transform: scale(0.86); transform-origin: bottom left; opacity: 0.92; }
  .says {
    max-width: min(420px, 40vw); margin-bottom: 70px;
    background: var(--surface); color: var(--ink);
    border-radius: 20px 20px 20px 6px; padding: 0.7rem 1rem;
    font-size: 1.1rem; line-height: 1.3; box-shadow: var(--lift);
    animation: pop-in 0.3s cubic-bezier(0.2, 1.6, 0.4, 1) both;
  }
</style>
