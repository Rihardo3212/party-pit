<script>
  // Bomb Pass on the phone: type a word to pass the bomb, or vote on someone else's odd word.
  import ReactBar from '../../components/ReactBar.svelte';
  import { catOf } from '../../engine/bomb.js';
  import { sfx } from '../../lib/sound.js';

  let { s, id, send, now, react } = $props();

  const b = $derived(s.bomb);
  const cat = $derived(b ? catOf(b.cat) : null);
  const mine = $derived(!!b && b.holder === id);
  const holderName = $derived(b?.holder ? s.players[b.holder]?.name : '');
  const voted = $derived(!!b?.vote && (b.vote.yes[id] || b.vote.no[id]));
  const fresh = (f) => f && now - f.at < 1800;
  const gained = $derived(b?.gained?.[id] || 0);

  let text = $state('');
  let input = $state();
  // Buzz when the bomb lands on you.
  let had = false;
  $effect(() => {
    if (mine && !had && s.phase === 'bplay') { navigator.vibrate?.([120, 60, 120]); text = ''; queueMicrotask(() => input?.focus()); }
    had = mine;
  });

  function submit(e) {
    e.preventDefault();
    const w = text.trim();
    if (!w) return;
    sfx.pop();
    send('bword', { w });
    text = '';
  }
  const vote = (ok) => { navigator.vibrate?.(30); send('bvote', { ok }); };
</script>

{#if b && cat}
  <p class="qmini">💣 Round {b.round} of {b.rounds}</p>
  <div class="cat">{cat.icon} {cat.cat}</div>

  {#if s.phase === 'bplay'}
    {#if now < b.startAt}
      <div class="stack center pop-in">
        <div class="bigemoji">💣</div>
        <h2>{mine ? 'You start!' : `${holderName} starts`}</h2>
        <p class="muted">Think of words that fit…</p>
      </div>
    {:else if b.vote}
      <div class="stack center pop-in">
        <p class="muted">Does it count?</p>
        <h2 class="vw">“{b.vote.w}”</h2>
        {#if b.vote.by === id}
          <p class="muted">The others are voting… the fuse is paused.</p>
        {:else if s.hostId}
          <p class="muted">The host decides.</p>
        {:else if voted}
          <p class="muted">Vote sent! {b.vote.yes[id] ? '👍' : '👎'}</p>
        {:else}
          <div class="votes">
            <button class="btn green big" onclick={() => vote(true)}>👍</button>
            <button class="btn big" onclick={() => vote(false)}>👎</button>
          </div>
        {/if}
      </div>
    {:else if mine}
      <form class="stack center hot" onsubmit={submit}>
        <div class="bigemoji shake">💣</div>
        <h2>You have the bomb!</h2>
        {#if fresh(b.flash) && b.flash.t === 'used'}<p class="bad">“{b.flash.w}” was already used!</p>
        {:else if fresh(b.flash) && b.flash.t === 'no'}<p class="bad">“{b.flash.w}” didn't count! Try again.</p>{/if}
        <input class="field" bind:this={input} bind:value={text} maxlength="40" placeholder="Type a word…" autocomplete="off" autocapitalize="off" enterkeyhint="send" />
        <button class="btn big block" style="--c:#f97316" type="submit" disabled={!text.trim()}>Pass it! 💨</button>
      </form>
    {:else}
      <div class="stack center">
        <div class="bigemoji">😅</div>
        <h2>{holderName} has the bomb</h2>
        {#if b.words.length}<p class="muted">Last word: <b>{b.words[b.words.length - 1].w}</b></p>{/if}
        <ReactBar onReact={react} />
      </div>
    {/if}

  {:else if s.phase === 'bboom'}
    <div class="stack center pop-in">
      <div class="bigemoji">{b.boom === id ? '💥' : '😎'}</div>
      <h2>{b.boom === id ? 'BOOM! It blew up on you!' : `It blew up on ${s.players[b.boom]?.name || '…'}!`}</h2>
      {#if gained}<p class="pts" class:neg={gained < 0}>{gained > 0 ? '+' : ''}{gained}</p>{/if}
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .qmini { margin: 0; text-align: center; }
  .cat { font-family: var(--font-display); font-size: 1.6rem; text-align: center; margin: 0.2rem 0 0.6rem; }
  .vw { font-size: 2rem; margin: 0; }
  .votes { display: flex; gap: 1rem; }
  .votes .btn { font-size: 2.2rem; min-width: 110px; }
  .hot { gap: 0.6rem; }
  .field { font-size: 1.4rem; text-align: center; }
  .bad { color: var(--red); font-weight: 800; margin: 0; }
  .shake { animation: wobble 0.45s ease-in-out infinite; }
  @keyframes wobble { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
  .pts { font-family: var(--font-display); font-size: 2.2rem; color: var(--green); margin: 0; }
  .pts.neg { color: var(--red); }
</style>
