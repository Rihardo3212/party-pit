<script>
  // A player's phone (or the host's phone in Host mode).
  import { onMount, onDestroy } from 'svelte';
  import Logo from '../components/Logo.svelte';
  import DrawPad from '../components/DrawPad.svelte';
  import LiveCanvas from '../components/LiveCanvas.svelte';
  import HostRemote from '../components/HostRemote.svelte';
  import PhoneLobby from '../views/phone/PhoneLobby.svelte';
  import BoardPhone from '../views/phone/BoardPhone.svelte';
  import WedgePhone from '../views/phone/WedgePhone.svelte';
  import FakePhone from '../views/phone/FakePhone.svelte';
  import DoodlePhone from '../views/phone/DoodlePhone.svelte';
  import PinPhone from '../views/phone/PinPhone.svelte';
  import ClosestPhone from '../views/phone/ClosestPhone.svelte';
  import TourPhone from '../views/phone/TourPhone.svelte';
  import ScribblePhone from '../views/phone/ScribblePhone.svelte';
  import OddPhone from '../views/phone/OddPhone.svelte';
  import WhoPhone from '../views/phone/WhoPhone.svelte';
  import HotPhone from '../views/phone/HotPhone.svelte';
  import BuzzPickPhone from '../views/phone/BuzzPickPhone.svelte';
  import BombPhone from '../views/phone/BombPhone.svelte';
  import KnowPhone from '../views/phone/KnowPhone.svelte';
  import AudiencePhone from '../views/phone/AudiencePhone.svelte';
  import ReflexPhone from '../views/phone/ReflexPhone.svelte';
  import MovePhone from '../views/phone/MovePhone.svelte';
  import BlackjackPhone from '../views/phone/BlackjackPhone.svelte';
  import SketchPhone from '../views/phone/SketchPhone.svelte';
  import TimelinePhone from '../views/phone/TimelinePhone.svelte';
  import EndPhone from '../views/phone/EndPhone.svelte';
  import StepFlow from '../components/StepFlow.svelte';
  import { MODES } from '../lib/modes.js';
  import { getDb } from '../lib/db.js';
  import { myId, cleanCode, MAX_PLAYERS } from '../lib/room.js';
  import { normalize, controllerOf } from '../engine/core.js';
  import { sfx, unlockAudio } from '../lib/sound.js';
  import { fit } from '../lib/fit.js';
  import Backdrop from '../components/Backdrop.svelte';
  import { phoneScene, slideIn } from '../lib/motion.js';

  let { code: rawCode = '' } = $props();
  // svelte-ignore state_referenced_locally
  const code = cleanCode(rawCode);

  const id = myId();
  let db = $state(null);
  let s = $state(undefined); // undefined = loading, null = no room
  let avatars = $state({});
  let name = $state(localStorage.getItem('bb-name') || '');
  let joining = $state(false);
  let redraw = $state(false);
  let codeInput = $state('');
  let now = $state(Date.now());
  let clock;
  const unsubs = [];

  onMount(async () => {
    if (!code) { s = null; return; }
    db = await getDb();
    unsubs.push(db.onValue(`rooms/${code}/state`, (v) => (s = normalize(v))));
    unsubs.push(db.onValue(`rooms/${code}/avatars`, (a) => (avatars = a || {})));
    unsubs.push(db.onConnection((ok) => {
      if (!ok) return;
      db.set(`rooms/${code}/presence/${id}`, true);
      db.removeOnDisconnect(`rooms/${code}/presence/${id}`);
    }));
    clock = setInterval(() => (now = db.now()), 250);
  });
  onDestroy(() => { unsubs.forEach((u) => u && u()); clearInterval(clock); });

  function send(type, data = {}) {
    return db.push(`rooms/${code}/inputs`, { type, from: id, ts: db.serverTime(), ...data });
  }
  const react = (e) => send('react', { e });

  const me = $derived(s?.players?.[id]);
  const isHost = $derived(!!s && s.hostId === id);
  const watcher = $derived(!!s?.audience?.[id]);
  const isCtrl = $derived(!!s && controllerOf(s) === id);
  const myUnit = $derived(me?.unit || null);
  const unit = $derived(myUnit && s?.units?.[myUnit] ? s.units[myUnit] : null);
  const game = $derived(s?.settings?.sub || s?.settings?.game); // Party Tour: the running mini game
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));

  function join(e) {
    e?.preventDefault();
    unlockAudio();
    const n = name.trim();
    if (!n) return;
    localStorage.setItem('bb-name', n);
    joining = true;
    send('join', { name: n });
  }
  function watch(e) {
    e?.preventDefault();
    unlockAudio();
    const n = name.trim() || 'Fan';
    localStorage.setItem('bb-name', n);
    joining = true;
    send('watch', { name: n });
  }
  // A late joiner becomes audience; joining from the audience back into the lobby needs the button again.
  $effect(() => { if (watcher) joining = false; });
  function joinAsHost() {
    unlockAudio();
    const n = name.trim() || 'Host';
    localStorage.setItem('bb-name', n);
    joining = true;
    send('joinHost', { name: n });
  }
  async function saveDrawing(dataUrl) {
    await db.set(`rooms/${code}/avatars/${id}`, dataUrl);
    send('avatarDone');
    redraw = false;
    sfx.pop();
  }

  // Little buzz when something needs this phone
  let prevPhase = null;
  $effect(() => {
    if (!s) return;
    if (s.phase !== prevPhase) {
      if (s.phase === 'answer' && s.current?.buzzer === id) navigator.vibrate?.([80, 40, 80]);
      if (s.phase === 'reveal' && s.current?.result === 'correct' && s.current?.winner === myUnit) { sfx.correct(); navigator.vibrate?.([40, 30, 40, 30, 120]); }
      if (s.phase === 'board' && s.turn === myUnit) navigator.vibrate?.(100);
      if (['finalBet', 'wq', 'lie', 'pick', 'pguess', 'cguess', 'tguess', 'troll', 'scwrite', 'scdraw', 'scdesc', 'scvote', 'oclue', 'ovote', 'wwrite', 'wguess', 'rready', 'mdraw', 'hrate', 'xplay', 'uplay', 'jplay', 'kwrite', 'kguess', 'vready', 'vgo', 'bjbet', 'bjplay'].includes(s.phase)) navigator.vibrate?.([60, 40, 60]);
      if (s.phase === 'dchoose' && s.doodle?.drawer === id) navigator.vibrate?.([100, 50, 100]);
      if (s.phase === 'wreveal' && s.wedge?.winner === myUnit) sfx.correct();
    }
    prevPhase = s.phase;
  });

  function goCode(e) {
    e.preventDefault();
    if (cleanCode(codeInput).length === 4) location.hash = `#/join/${cleanCode(codeInput)}`;
  }
</script>

<div class="phone" style="--me:{(unit?.color || me?.color) ?? '#ffc400'}">
  <header>
    <a href="#/" aria-label="Home"><Logo size={0.4} /></a>
    <div class="hright">
      {#if me}
        <div class="me">
          <span class="mname">{me.name}</span>
          <span class="mscore">{unit ? unit.score : 0}</span>
        </div>
      {/if}
    </div>
  </header>

  <Backdrop lite />
  <main class="fit-box" use:fit={{ min: 0.6 }}><div class="fit-in">
    {#key phoneScene(s) + (me ? '1' : '0') + (isHost ? 'h' : '')}<div class="scene" in:slideIn>
    {#if s === undefined}
      <p class="center-text">Connecting…</p>

    {:else if s === null}
      <div class="card stack center pop-in">
        <h2>{code ? `Room ${code} not found` : 'Enter room code'}</h2>
        <p class="muted">Check the code on the big screen.</p>
        <form onsubmit={goCode} class="stack wide">
          <input class="field code" maxlength="4" placeholder="ABCD" bind:value={codeInput} oninput={() => (codeInput = cleanCode(codeInput))} />
          <button class="btn block" disabled={codeInput.length !== 4}>Join</button>
        </form>
      </div>

    {:else if isHost}
      <HostRemote {s} {send} {avatars} />

    {:else if !me && watcher}
      <AudiencePhone {s} {id} {avatars} {send} {react} />

    {:else if !me}
      {#if s.phase !== 'lobby' || s.order.length >= MAX_PLAYERS}
        <form class="card stack center pop-in" onsubmit={watch}>
          <h2>{s.phase !== 'lobby' ? 'Game in progress' : 'Room is full'}</h2>
          <p class="muted">Join the audience: react, and cheer for your favourite!{s.phase !== 'lobby' ? ' You can play in the next game.' : ''}</p>
          <input class="field" maxlength="14" autocomplete="off" bind:value={name} placeholder="Name" />
          <button class="btn big block" disabled={!name.trim() || joining}>👀 Watch & cheer</button>
        </form>
      {:else}
        <form class="card stack center pop-in" onsubmit={join}>
          <h2>Room {code}</h2>
          <label for="name" class="muted">Your name</label>
          <input id="name" class="field" maxlength="14" autocomplete="off" bind:value={name} placeholder="Name" />
          <button class="btn big block" disabled={!name.trim() || joining}>{joining ? 'Joining…' : "I'm in!"}</button>
          {#if !s.hostId}
            <button type="button" class="btn ghost block" disabled={joining} onclick={joinAsHost}>🎤 Be the host instead</button>
            <p class="muted tiny">The host runs the show but doesn't play.</p>
          {/if}
          <button type="button" class="btn ghost block" disabled={joining} onclick={watch}>👀 Just watch</button>
        </form>
      {/if}

    {:else if !me.ready || redraw}
      <DrawPad color={me.color} onDone={saveDrawing} />

    {:else if s.phase === 'lobby'}
      <PhoneLobby {s} {id} {me} {avatars} {send} {isCtrl} onRedraw={() => (redraw = true)} />

    {:else if s.phase === 'teamdraw' && unit}
      <div class="stack center">
        <h2 style="color:{unit.color}">{unit.emoji} {unit.name}</h2>
        <p class="muted">Draw your team picture together! ⏱ {secs(s.drawUntil)}</p>
        <LiveCanvas {db} path={`rooms/${s.code}/teamdraw/${unit.team}`} color={unit.color} />
        {#if s.teamReady[myUnit]}
          <p>✓ Your team is done. Waiting for the others…</p>
        {:else}
          <button class="btn green big block" onclick={() => send('teamDone')}>We're done!</button>
        {/if}
      </div>

    {:else if s.phase === 'intro'}
      {@const m = MODES[game]}
      <div class="stack center" style="--mc:{m.color}">
        <span class="icon-tile" style="--sz:76px">{m.icon}</span>
        <h2 style="color:{m.color}">{m.name}</h2>
        <p class="muted">Here's how it works:</p>
        <div class="wide"><StepFlow steps={m.steps} color={m.color} size="small" animate /></div>
        {#if isCtrl}
          <button class="btn green big block" onclick={() => send('skipIntro')}>Got it, start! ▶</button>
        {:else}
          <p class="muted">Starting in {secs(s.introUntil)}…</p>
        {/if}
      </div>

    {:else if s.phase === 'end' && s.results}
      <EndPhone {s} myId={id} {myUnit} {unit} {send} {isCtrl} {react} />

    {:else if game === 'board'}
      <BoardPhone {s} {id} {myUnit} {unit} {avatars} {send} {now} {react} />
    {:else if game === 'wedge'}
      <WedgePhone {s} {myUnit} {unit} {send} {now} {react} />
    {:else if game === 'fakeout'}
      <FakePhone {s} {myUnit} {send} {now} {react} />
    {:else if game === 'doodle'}
      <DoodlePhone {s} {id} {avatars} {send} {now} {react} {db} />
    {:else if game === 'pindrop'}
      <PinPhone {s} {id} {myUnit} {unit} {send} {now} {react} />
    {:else if game === 'sketch'}
      <SketchPhone {s} {id} {myUnit} {send} {now} {react} {db} />
    {:else if game === 'reflex'}
      <ReflexPhone {s} {id} {myUnit} {send} {react} />
    {:else if MODES[game]?.move}
      <MovePhone {s} {id} {myUnit} {send} {react} {db} />
    {:else if game === 'blackjack'}
      <BlackjackPhone {s} {id} {myUnit} {send} {react} />
    {:else if game === 'whowrote'}
      <WhoPhone {s} {id} {avatars} {send} {now} {react} />
    {:else if game === 'oddone'}
      <OddPhone {s} {id} {avatars} {send} {now} {react} />
    {:else if game === 'scribble'}
      <ScribblePhone {s} {id} {send} {now} {react} {db} />
    {:else if game === 'tour' || game === 'mix'}
      <TourPhone {s} {myUnit} {send} {now} {react} />
    {:else if game === 'closest'}
      <ClosestPhone {s} {id} {myUnit} {send} {now} {react} />
    {:else if game === 'timeline'}
      <TimelinePhone {s} {id} {myUnit} {send} {now} {react} />
    {:else if game === 'hottake'}
      <HotPhone {s} {id} {send} {now} {react} />
    {:else if game === 'peek'}
      <BuzzPickPhone {s} {id} {myUnit} {avatars} {send} {now} {react} k="peek" p="x" icon="🔍" ask="What is it?" />
    {:else if game === 'hum'}
      <BuzzPickPhone {s} {id} {myUnit} {avatars} {send} {now} {react} k="hum" p="u" icon="🎶" ask="Name that tune!" />
    {:else if game === 'bomb'}
      <BombPhone {s} {id} {send} {now} {react} />
    {:else if game === 'know'}
      <KnowPhone {s} {id} {send} {now} {react} />
    {:else if game === 'jokes'}
      <BuzzPickPhone {s} {id} {myUnit} {avatars} {send} {now} {react} k="jokes" p="j" icon="🤫" ask="Who? What? When?" />
    {/if}
    </div>{/key}
  </div></main>
</div>

<style>
  .scene { flex: 1 0 auto; display: flex; flex-direction: column; justify-content: center; }
  main { position: relative; z-index: 1; }
  .phone { position: relative; height: 100vh; height: 100dvh; display: flex; flex-direction: column; max-width: 520px; margin: 0 auto; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
  header { display: flex; align-items: center; justify-content: space-between; padding: max(0.7rem, env(safe-area-inset-top)) 1rem 0.4rem; gap: 0.5rem; flex-shrink: 0; }
  header a { text-decoration: none; }
  .hright { display: flex; align-items: center; gap: 0.5rem; }
  .icon-btn.sm { width: 40px; height: 40px; font-size: 1.05rem; }
  .me { display: flex; align-items: center; gap: 0.5rem; background: var(--surface-hi); box-shadow: var(--shine), 0 6px 16px -6px rgba(0, 0, 0, 0.5); border-radius: 999px; padding: 0.25rem 0.3rem 0.25rem 0.9rem; }
  .mname { font-weight: 900; max-width: 7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mscore { font-family: var(--font-display); background: var(--me); color: #fff; border-radius: 999px; padding: 0.05rem 0.75rem 0.12rem; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.2); }
  .fit-in { padding: 0.4rem 1.1rem max(1rem, env(safe-area-inset-bottom)); justify-content: center; }
  .code { letter-spacing: 0.4em; text-transform: uppercase; }
  .tiny { font-size: 0.85rem; margin: 0; }
</style>
