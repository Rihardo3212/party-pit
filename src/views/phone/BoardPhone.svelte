<script>
  import Avatar from '../../components/Avatar.svelte';
  import Board from '../../components/Board.svelte';
  import ReactBar from '../../components/ReactBar.svelte';
  import { maxBet } from '../../engine/board.js';
  import { sfx, unlockAudio } from '../../lib/sound.js';

  let { s, id, myUnit, unit, avatars, send, now, react } = $props();

  let tooEarly = $state(false);
  let buzzedLocal = $state(false);
  let bet = $state(0);
  let finalText = $state('');

  const cur = $derived(s.current);
  const fin = $derived(s.final);
  const P = (pid) => (pid && s.players[pid] ? { id: pid, ...s.players[pid] } : null);
  const U = (uid) => (uid && s.units[uid] ? { id: uid, ...s.units[uid] } : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));

  function buzz() {
    unlockAudio();
    if (!cur || cur.lockedOut?.[myUnit] || buzzedLocal) return;
    if (!cur.open) {
      tooEarly = true;
      navigator.vibrate?.(200);
      setTimeout(() => (tooEarly = false), 700);
      return;
    }
    if (tooEarly) return;
    buzzedLocal = true;
    navigator.vibrate?.(60);
    sfx.buzz(Math.max(0, s.unitOrder.indexOf(myUnit)));
    send('buzz');
  }

  // Reset the local buzz flag whenever buzzers reopen or a new question starts.
  $effect(() => {
    const key = `${s.phase}|${cur?.c}|${cur?.r}|${cur?.wrongs?.length}`;
    key;
    buzzedLocal = false;
  });

  // Default bet: half of what you may bet.
  let betInitFor = null;
  $effect(() => {
    if (s.phase === 'finalBet' && myUnit && betInitFor !== s.game) {
      betInitFor = s.game;
      bet = Math.round(maxBet(s, myUnit) / 2 / 50) * 50;
      finalText = '';
    }
  });
</script>

{#if s.phase === 'board'}
  {#if s.turn === myUnit}
    <div class="stack">
      <h2 class="center-text bounce">{s.teamMode ? 'Your team picks!' : 'Your pick!'}</h2>
      <Board board={s.board} compact onPick={(c, r) => { sfx.pick(); send('pick', { c, r }); }} />
    </div>
  {:else}
    <div class="stack center">
      <Avatar src={avatars[s.turn]} color={U(s.turn)?.color} name={U(s.turn)?.name} size={100} />
      <h2>{U(s.turn)?.name} {s.teamMode ? 'are' : 'is'} picking…</h2>
      <p class="muted">Get your finger ready.</p>
      <ReactBar onReact={react} />
    </div>
  {/if}

{:else if s.phase === 'question' && cur}
  {#if cur.lockedOut?.[myUnit]}
    <div class="stack center">
      <div class="bigemoji">🔒</div>
      <h2>Locked out</h2>
      <p class="muted">The others can still buzz.</p>
      <ReactBar onReact={react} />
    </div>
  {:else}
    <div class="stack center">
      <p class="qmini">{cur.icon} {cur.cat} · {cur.value}</p>
      <button class="buzzer" class:open={cur.open && !tooEarly} class:early={tooEarly} class:sent={buzzedLocal} onpointerdown={buzz}>
        <span>{#if tooEarly}Too early!{:else if buzzedLocal}Buzzed!{:else if cur.open}BUZZ!{:else}Wait…{/if}</span>
      </button>
    </div>
  {/if}

{:else if s.phase === 'answer' && cur}
  {#if cur.buzzer === id}
    {#if s.mode === 'host'}
      <div class="stack center pop-in">
        <div class="bigemoji">🗣️</div>
        <h2>You buzzed first!</h2>
        <p class="say">Say your answer out loud!</p>
      </div>
    {:else}
      <div class="stack">
        <h2 class="center-text">You buzzed first! Pick:</h2>
        {#each cur.options as o, i}
          {#if !cur.wrongs.some((w) => w.i === i)}
            <button class="opt" onclick={() => { navigator.vibrate?.(30); send('answer', { i }); }}><span class="coin l{i}">{'ABCD'[i]}</span>{o}</button>
          {/if}
        {/each}
      </div>
    {/if}
  {:else}
    {@const b = P(cur.buzzer)}
    <div class="stack center">
      <Avatar src={avatars[cur.buzzUnit]} color={U(cur.buzzUnit)?.color} name={U(cur.buzzUnit)?.name} size={100} />
      <h2>{cur.buzzUnit === myUnit ? `Your teammate ${b?.name}` : b?.name} is answering…</h2>
      {#if cur.buzzUnit !== myUnit}<ReactBar onReact={react} />{/if}
    </div>
  {/if}

{:else if s.phase === 'reveal' && cur}
  {@const won = cur.result === 'correct' && cur.winner === myUnit}
  {@const lost = cur.wrongs.some((w) => w.uid === myUnit)}
  <div class="stack center pop-in">
    <div class="bigemoji">{won ? '🎉' : lost ? '😬' : '👀'}</div>
    {#if won}<h2>+{cur.value}! Nice!</h2>{:else if lost}<h2>-{cur.value}</h2>{/if}
    <p class="muted">The answer was</p>
    <p class="answertext">{cur.answer}</p>
    <ReactBar onReact={react} />
  </div>

{:else if s.phase === 'finalBet' && fin && unit}
  {@const max = maxBet(s, myUnit)}
  {#if fin.bets[myUnit] !== undefined}
    <div class="stack center pop-in">
      <div class="bigemoji">🔒</div>
      <h2>Bet locked: {fin.bets[myUnit]}</h2>
      {#if s.teamMode}<p class="muted">by {P(fin.betBy[myUnit])?.name}</p>{/if}
      <p class="muted">Waiting for the others… ⏱ {secs(fin.betUntil)}</p>
    </div>
  {:else}
    <div class="card stack wide pop-in">
      <h2>⚡ Final round</h2>
      <p class="muted">Category: <b class="on-bg">{fin.icon} {fin.cat}</b></p>
      <p class="muted">You have <b>{unit.score}</b>. Bet up to <b>{max}</b>.{s.teamMode ? ' Anyone on your team can lock it.' : ''}</p>
      <div class="betval">{bet}</div>
      <input class="slider" type="range" min="0" max={max} step="50" bind:value={bet} />
      <div class="quick">
        <button class="btn ghost small" onclick={() => (bet = 0)}>0</button>
        <button class="btn ghost small" onclick={() => (bet = Math.round(max / 2 / 50) * 50)}>Half</button>
        <button class="btn ghost small" onclick={() => (bet = max)}>All in!</button>
      </div>
      <button class="btn big block" onclick={() => { sfx.pop(); send('bet', { amount: bet }); }}>Lock bet · {secs(fin.betUntil)}</button>
    </div>
  {/if}

{:else if s.phase === 'finalQ' && fin && unit}
  {#if fin.answers[myUnit]}
    <div class="stack center pop-in">
      <div class="bigemoji">🔒</div>
      <h2>Answer locked in!</h2>
      {#if s.teamMode}<p class="muted">by {P(fin.answers[myUnit].by)?.name}</p>{/if}
      <p class="answertext">{s.mode === 'party' ? fin.options[fin.answers[myUnit].i] : fin.answers[myUnit].text}</p>
    </div>
  {:else}
    <div class="stack">
      <p class="qmini">{fin.icon} {fin.cat} · ⏱ {secs(fin.until)}</p>
      <h3 class="center-text">{fin.q}</h3>
      {#if s.mode === 'party'}
        {#each fin.options as o, i}
          <button class="opt" onclick={() => { navigator.vibrate?.(30); send('finalAnswer', { i }); }}><span class="coin l{i}">{'ABCD'[i]}</span>{o}</button>
        {/each}
      {:else}
        <form class="card stack" onsubmit={(e) => { e.preventDefault(); if (finalText.trim()) send('finalAnswer', { text: finalText }); }}>
          <input class="field" maxlength="60" placeholder="Type your answer" bind:value={finalText} />
          <button class="btn big block" disabled={!finalText.trim()}>Lock answer</button>
        </form>
      {/if}
    </div>
  {/if}

{:else if s.phase === 'finalJudge'}
  <div class="stack center"><div class="bigemoji">🧐</div><h2>{s.hostName} is judging…</h2></div>

{:else if s.phase === 'finalReveal' && fin}
  {@const idx = fin.order.indexOf(myUnit)}
  <div class="stack center">
    {#if idx >= 0 && idx <= fin.revealIdx}
      <div class="bigemoji pop-in">{fin.judged[myUnit] ? '🎉' : '😭'}</div>
      <h2>{fin.deltas[myUnit] >= 0 ? '+' : ''}{fin.deltas[myUnit]}</h2>
      <p class="muted">The answer was</p>
      <p class="answertext">{fin.answer}</p>
    {:else}
      <div class="bigemoji bounce">🥁</div>
      <h2>Look at the big screen!</h2>
    {/if}
    <ReactBar onReact={react} />
  </div>
{/if}
