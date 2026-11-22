<script>
  // The host's phone in Host mode: picks the game, sees the answers, judges and skips.
  import Avatar from './Avatar.svelte';
  import ModePicker from './ModePicker.svelte';
  import { MAX_SOLO, TEAMS } from '../lib/room.js';
  import { WEDGES } from '../content/wedges.js';
  import { photoUrl } from '../engine/pindrop.js';
  import { formatNum, questionById } from '../engine/closest.js';
  import { MODES } from '../lib/modes.js';

  let { s, send, avatars = {} } = $props();

  const players = $derived(s.order.map((id) => ({ id, ...s.players[id] })));
  const units = $derived(s.unitOrder.map((id) => ({ id, ...s.units[id] })));
  const cur = $derived(s.current);
  const fin = $derived(s.final);
  const U = (id) => (id && s.units[id] ? { id, ...s.units[id] } : null);
  const P = (id) => (id && s.players[id] ? { id, ...s.players[id] } : null);
  const allJudged = $derived(fin ? units.every((u) => fin.judged[u.id] !== undefined) : false);
  const count = (o) => Object.keys(o || {}).length;
  const vibe = (ms = 30) => navigator.vibrate?.(ms);
  // Phases where the host can only skip ahead: [emoji, button text]
  const SKIPPABLE = {
    mlook: ['👀', 'Start drawing now'], mdraw: ['✏️', 'Reveal now'], mreveal: ['🖼️', 'Next drawing'],
    rready: ['⚡', 'Go now'], rgo: ['⏱️', 'End this game'], rresult: ['🏆', 'Next game'],
    hrate: ['🌶️', 'Reveal now'], hreveal: ['➡️', 'Next take'],
    xplay: ['🔍', 'Reveal now'], xanswer: ['⏱️', 'Time up for the buzzer'], xreveal: ['➡️', 'Next photo'],
    uplay: ['🎶', 'Reveal now'], uanswer: ['⏱️', 'Time up for the buzzer'], ureveal: ['➡️', 'Next tune'],
    bboom: ['➡️', 'Next round'],
    jplay: ['🤫', 'Reveal now'], janswer: ['⏱️', 'Time up for the buzzer'], jreveal: ['➡️', 'Next question'],
    kwrite: ['✍️', 'Start guessing now'], kguess: ['🤝', 'Reveal now'], kreveal: ['➡️', 'Next question']
  };
</script>

<div class="remote stack">
  <div class="badge sticker">🎤 You're the host</div>

  {#if s.phase === 'lobby'}
    <div class="card stack">
      <h3>Players ({players.length})</h3>
      {#if players.length === 0}
        <p class="muted">Waiting for players to join…</p>
      {:else}
        {#each players as p (p.id)}
          <div class="row">
            <Avatar src={avatars[p.id]} color={p.color} name={p.name} size={36} />
            <span>{p.name}</span>
            {#if players.length > MAX_SOLO}<span class="team" style="background:{p.team ? TEAMS[p.team].color : 'var(--surface-2)'}">{p.team ? TEAMS[p.team].emoji : '?'}</span>{/if}
            <span class="muted r">{p.ready ? 'ready' : 'drawing…'}</span>
          </div>
        {/each}
      {/if}
    </div>
    <ModePicker {s} {send} title="Pick a game" />
    <button class="btn ghost small" onclick={() => send('leaveHost')}>Stop hosting</button>

  {:else if s.phase === 'intro'}
    <div class="card stack center"><h3>Explain the rules while the big screen shows them!</h3></div>
    <button class="btn green big block" onclick={() => send('skipIntro')}>Start the game ▶</button>
  {:else if s.phase === 'teamdraw'}
    <div class="card stack center"><div class="bigemoji">🎨</div><h3>Teams are drawing their pictures…</h3></div>

  <!-- Brain Board -->
  {:else if s.phase === 'board'}
    <div class="card stack center"><h3>{U(s.turn)?.name} picks a question</h3><p class="muted">Read it out loud when it appears!</p></div>
  {:else if (s.phase === 'question' || s.phase === 'answer' || s.phase === 'reveal') && cur}
    <div class="card stack">
      <span class="muted">{cur.icon} {cur.cat} · {cur.value}</span>
      <h3>{cur.q}</h3>
      <div class="ans">✅ {cur.answer}</div>
    </div>
    {#if s.phase === 'question'}
      <p class="center-text">{cur.open ? '🔔 Buzzers are open!' : 'Read it out loud… buzzers open soon'}</p>
      <button class="btn ghost block" onclick={() => send('skip')}>Skip question</button>
    {:else if s.phase === 'answer'}
      {@const u = U(cur.buzzUnit)}
      <div class="who pop-in">
        <Avatar src={avatars[u?.id]} color={u?.color} name={u?.name} size={70} />
        <h2>{P(cur.buzzer)?.name}{s.teamMode ? ` (${u?.name})` : ''}</h2>
        <p class="muted">is answering out loud</p>
      </div>
      <div class="judge">
        <button class="btn green big" onclick={() => { vibe(); send('judge', { ok: true }); }}>✓ Right</button>
        <button class="btn big" onclick={() => { vibe(); send('judge', { ok: false }); }}>✗ Wrong</button>
      </div>
    {:else}
      <p class="center-text">{cur.result === 'correct' ? `🎉 ${U(cur.winner)?.name} got it!` : '😬 Nobody got it'}</p>
    {/if}
  {:else if s.phase === 'finalBet' && fin}
    <div class="card stack">
      <h3>⚡ Final round: {fin.icon} {fin.cat}</h3>
      {#each units as u (u.id)}<div class="row between">{u.name} <b>{fin.bets[u.id] !== undefined ? `🔒 ${fin.bets[u.id]}` : '…'}</b></div>{/each}
    </div>
  {:else if s.phase === 'finalQ' && fin}
    <div class="card stack">
      <h3>{fin.q}</h3>
      <div class="ans">✅ {fin.answer}</div>
      {#each units as u (u.id)}<div class="row between">{u.name} <b>{fin.answers[u.id] ? '🔒' : '✍️'}</b></div>{/each}
    </div>
  {:else if s.phase === 'finalJudge' && fin}
    <div class="card stack">
      <h3>Judge the answers</h3>
      <div class="ans">✅ {fin.answer}</div>
      {#each units as u (u.id)}
        {@const a = fin.answers[u.id]}
        <div class="jrow">
          <div class="jinfo">
            <b style="color:{u.color}">{u.name}</b>
            <span class="jtext">{a ? a.text : '— no answer —'}</span>
            <span class="muted">bet {fin.bets[u.id]}</span>
          </div>
          <button class="jb ok" class:on={fin.judged[u.id] === true} onclick={() => send('finalJudge', { uid: u.id, ok: true })}>✓</button>
          <button class="jb no" class:on={fin.judged[u.id] === false} onclick={() => send('finalJudge', { uid: u.id, ok: false })}>✗</button>
        </div>
      {/each}
      <button class="btn big block" disabled={!allJudged} onclick={() => send('finalDone')}>🥁 Reveal results!</button>
    </div>

  <!-- Wedge Rush -->
  {:else if s.phase === 'spin'}
    <div class="card stack center"><div class="bigemoji">🎡</div><h3>Spinning…</h3></div>
  {:else if (s.phase === 'wq' || s.phase === 'wreveal') && s.wedge?.q}
    {@const w = s.wedge}
    <div class="card stack">
      <span class="muted">{WEDGES[w.spin.to].icon} {WEDGES[w.spin.to].name}</span>
      <h3>{w.q.text}</h3>
      <div class="ans">✅ {w.q.answer} {w.q.type === 'num' ? w.q.unit : ''}</div>
      <p class="muted">{count(w.answers)} / {units.length} answered</p>
    </div>
    {#if s.phase === 'wq'}<button class="btn ghost block" onclick={() => send('skip')}>End question now</button>{/if}

  <!-- Fake Out -->
  {:else if (s.phase === 'lie' || s.phase === 'pick' || s.phase === 'freveal') && s.fake}
    {@const f = s.fake}
    <div class="card stack">
      <span class="muted">Fact {f.round} of {f.rounds}</span>
      <h3>{f.text}</h3>
      <div class="ans">✅ {f.truth}</div>
      {#if s.phase === 'lie'}
        <p class="muted">{count(f.lies)} / {units.length} lies written</p>
      {:else if s.phase === 'pick'}
        <p class="muted">{count(f.picks)} / {units.length} picked</p>
      {/if}
    </div>
    {#if s.phase === 'lie'}<button class="btn ghost block" onclick={() => send('skip')}>Go to picking now</button>{/if}
    {#if s.phase === 'pick'}<button class="btn ghost block" onclick={() => send('skip')}>Reveal now</button>{/if}

  <!-- Doodle Dash -->
  {:else if (s.phase === 'dchoose' || s.phase === 'ddraw' || s.phase === 'dreveal') && s.doodle}
    {@const d = s.doodle}
    <div class="card stack center">
      <span class="muted">Round {d.round} of {d.rounds} · artist: {P(d.drawer)?.name}</span>
      {#if s.phase === 'dchoose'}
        <h3>Picking a word…</h3>
      {:else}
        <div class="ans">✏️ {d.word}</div>
        <p class="muted">{count(d.guessed)} guessed it</p>
      {/if}
    </div>
    {#if s.phase !== 'dreveal'}<button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'dchoose' ? 'Pick for them' : 'End round now'}</button>{/if}

  <!-- Pin Drop -->
  {:else if (s.phase === 'pguess' || s.phase === 'preveal') && s.pin?.answer}
    {@const f = s.pin}
    <div class="card stack">
      <span class="muted">📍 Photo {f.round} of {f.rounds}{f.double ? ' · double points' : ''}</span>
      <img class="pthumb" src={photoUrl(f.id)} alt="" />
      <div class="ans">✅ {f.answer.name}</div>
      <p class="muted">📌 {f.answer.where}</p>
      <p>💡 {f.answer.fact}</p>
      {#if s.phase === 'pguess'}<p class="muted">{count(f.pins)} / {players.length} pins dropped{f.hint ? ` · hint shown: ${f.hint}` : ''}</p>{/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'pguess' ? 'Reveal now' : 'Next photo'}</button>

  <!-- Timeline -->
  {:else if (s.phase === 'tguess' || s.phase === 'treveal') && s.line?.years}
    {@const l = s.line}
    <div class="card stack">
      <span class="muted">📅 Round {l.round} of {l.rounds}</span>
      {#each [...l.cards].sort((a, b) => l.years[a.id] - l.years[b.id]) as c}
        <div class="row between"><span>{c.e} {c.t}</span><b>{l.years[c.id]}</b></div>
      {/each}
      {#if s.phase === 'tguess'}<p class="muted">{count(l.orders)} / {players.length} locked in</p>{/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'tguess' ? 'Reveal now' : 'Next round'}</button>

  <!-- Closest Call -->
  {:else if (s.phase === 'cguess' || s.phase === 'creveal') && s.close?.answer !== null && s.close}
    {@const c = s.close}
    <div class="card stack">
      <span class="muted">🎯 Question {c.round} of {c.rounds}{c.double ? ' · double points' : ''}</span>
      <h3>{c.q}</h3>
      <div class="ans">✅ {formatNum(c.answer, questionById(c.id))}{c.unit ? ` ${c.unit}` : ''}</div>
      {#if s.phase === 'cguess'}<p class="muted">{count(c.guesses)} / {players.length} guesses in</p>{/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'cguess' ? 'Reveal now' : 'Next question'}</button>

  <!-- Bomb Pass: the host decides odd words -->
  {:else if s.phase === 'bplay' && s.bomb}
    {@const b = s.bomb}
    <div class="card stack center">
      <div class="bigemoji">💣</div>
      <h3>Round {b.round} of {b.rounds}</h3>
      {#if b.vote}
        <p>Does <b>“{b.vote.w}”</b> count?</p>
        <div class="row">
          <button class="btn green big" onclick={() => { vibe(); send('bvote', { ok: true }); }}>👍 Yes</button>
          <button class="btn big" onclick={() => { vibe(); send('bvote', { ok: false }); }}>👎 No</button>
        </div>
      {:else}
        <p class="muted">{P(b.holder)?.name || '…'} has the bomb</p>
      {/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>💥 Blow it up now</button>

  <!-- Party Tour (the board; mini games use their own sections) -->
  {:else if ['troll', 'tmove', 'tpick', 'tscore'].includes(s.phase) && s.tour}
    {@const t = s.tour}
    <div class="card stack center">
      <div class="bigemoji">🗺️</div>
      <h3>Round {t.round} of {t.rounds}</h3>
      {#if s.phase === 'troll'}<p class="muted">{count(t.rolls)} / {s.unitOrder.length} rolled</p>{/if}
      {#if t.mode}<p>Next game: <b>{MODES[t.mode].icon} {MODES[t.mode].name}</b></p>{/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'troll' ? 'Roll for everyone now' : s.phase === 'tmove' ? 'Next move' : s.phase === 'tpick' ? 'Start the game' : 'Next round'}</button>

  <!-- Scribble Chain -->
  {:else if ['scwrite', 'scdraw', 'scdesc', 'scshow', 'scvote'].includes(s.phase) && s.chain}
    {@const c = s.chain}
    <div class="card stack center">
      <div class="bigemoji">🔗</div>
      {#if ['scwrite', 'scdraw', 'scdesc'].includes(s.phase)}
        <h3>Step {c.step + 1} of {c.len}</h3>
        <p class="muted">{count(c.done)} / {c.order.length} done</p>
      {:else}
        <h3>Chain {c.showIdx + 1} of {c.order.length}</h3>
        {#if s.phase === 'scvote'}<p class="muted">{c.tallied ? 'Votes counted' : `${count(c.votes)} votes in`}</p>{/if}
      {/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'scshow' ? 'Next step' : s.phase === 'scvote' ? (c.tallied ? 'Next chain' : 'Count the votes') : 'Move on now'}</button>

  <!-- Odd One Out -->
  {:else if ['oclue', 'ovote', 'oguess', 'oresult'].includes(s.phase) && s.odd}
    {@const o = s.odd}
    <div class="card stack">
      <span class="muted">🕵️ Round {o.round} of {o.rounds} · {o.icon} {o.cat}</span>
      <div class="ans">🤫 {o.word}</div>
      <p>🕵️ Spy: <b>{o.spies.map((p) => P(p)?.name).join(' & ')}</b></p>
      {#if s.phase === 'oclue'}<p class="muted">{count(o.clues)} / {players.length} clues in</p>{/if}
      {#if s.phase === 'ovote'}<p class="muted">{count(o.votes)} / {players.length} votes in</p>{/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'oclue' ? 'Start voting now' : s.phase === 'ovote' ? 'Count the votes' : s.phase === 'oguess' ? 'Show the result' : 'Next round'}</button>

  <!-- Who Wrote That? -->
  {:else if ['wwrite', 'wguess', 'wshow'].includes(s.phase) && s.who}
    {@const w = s.who}
    <div class="card stack">
      <span class="muted">📝 Prompt {w.round} of {w.rounds}</span>
      <h3>{w.prompt}</h3>
      {#if s.phase === 'wwrite'}
        <p class="muted">{count(w.answers)} / {players.length} answers in</p>
      {:else}
        <div class="ans">“{w.text}”</div>
        <p>✍️ Written by <b>{P(w.queue[w.idx])?.name}</b></p>
        {#if s.phase === 'wguess'}<p class="muted">{count(w.guesses)} guesses in</p>{/if}
      {/if}
    </div>
    <button class="btn ghost block" onclick={() => send('skip')}>{s.phase === 'wwrite' ? 'Start guessing now' : s.phase === 'wguess' ? 'Reveal now' : 'Next answer'}</button>

  <!-- Modes without secrets: just a skip button -->
  {:else if SKIPPABLE[s.phase]}
    <div class="card stack center"><div class="bigemoji">{SKIPPABLE[s.phase][0]}</div><h3>Watch the big screen!</h3></div>
    <button class="btn ghost block" onclick={() => send('skip')}>{SKIPPABLE[s.phase][1]}</button>

  {:else if s.phase === 'end'}
    <div class="card stack center">
      <div class="bigemoji">🏆</div>
      <h3>Game over!</h3>
      <button class="btn green big block" onclick={() => send('again')}>New round</button>
    </div>
  {:else}
    <div class="card stack center"><h3>Watch the big screen!</h3></div>
  {/if}
</div>

<style>
  .badge { align-self: center; font-size: 1.15rem; }
  .pthumb { width: 100%; max-height: 180px; object-fit: cover; border-radius: 14px; }
  .row { display: flex; align-items: center; gap: 0.6rem; }
  .row.between { justify-content: space-between; background: var(--well); border-radius: 12px; padding: 0.4rem 0.8rem; }
  .r { margin-left: auto; font-size: 0.9rem; }
  .team { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 0.85rem; }
  .ans {
    font-family: var(--font-display); font-size: 1.35rem; color: #fff;
    background: var(--green); border-radius: 16px; padding: 0.35rem 0.9rem;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--green) 70%, transparent);
  }
  .who { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; text-align: center; }
  .who p { margin: 0; }
  .judge { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
  .judge .btn { padding: 1.1em 0.5em; }
  .jrow { display: flex; align-items: center; gap: 0.5rem; background: var(--well); border-radius: 14px; padding: 0.6rem; }
  .jinfo { display: flex; flex-direction: column; flex: 1; min-width: 0; }
  .jtext { font-size: 1.15rem; font-weight: 900; word-break: break-word; }
  .jb { width: 48px; height: 48px; border-radius: 14px; font-size: 1.4rem; font-weight: 900; background: var(--surface-hi); box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5); }
  .jb.ok.on { background: var(--green); color: #fff; }
  .jb.no.on { background: var(--red); color: #fff; }
</style>
