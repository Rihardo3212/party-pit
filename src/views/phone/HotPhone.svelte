<script>
  import ReactBar from '../../components/ReactBar.svelte';
  import { sfx } from '../../lib/sound.js';

  let { s, id, send, now, react } = $props();

  const h = $derived(s.hot);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const mine = $derived(h?.votes?.[id]);
  let rate = $state(5);
  let guess = $state(5);
  let lastRound = null;
  $effect(() => { if (h && h.round !== lastRound) { lastRound = h.round; rate = 5; guess = 5; } });
  const face = (v) => ['🙅', '🙅', '😒', '😒', '😐', '😐', '🙂', '🙂', '😍', '🔥', '🔥'][Math.round(v)];

  function submit() {
    sfx.pop();
    navigator.vibrate?.(30);
    send('hvote', { rate: Number(rate), guess: Number(guess) });
  }
  const gained = $derived(h?.gained?.[id] || 0);
</script>

{#if h}
  {#if s.phase === 'hrate'}
    {#if mine}
      <div class="stack center pop-in">
        <div class="bigemoji">{face(mine.r)}</div>
        <h2>You said {mine.r}, guessed {mine.g}</h2>
        <p class="muted">Waiting for the others… {secs(h.until)}</p>
        <ReactBar onReact={react} />
      </div>
    {:else}
      <div class="stack">
        <p class="qmini">🌶️ Take {h.round} of {h.rounds} · ⏱ {secs(h.until)}</p>
        <h3 class="take">“{h.text}”</h3>
        <div class="card stack sl">
          <div class="lab"><b>1. How much do you agree?</b><span class="val">{face(rate)} {rate}</span></div>
          <input type="range" min="0" max="10" step="1" bind:value={rate} />
          <div class="ends muted"><span>Nope</span><span>Totally</span></div>
        </div>
        <div class="card stack sl">
          <div class="lab"><b>2. Guess the group's average</b><span class="val">{Number(guess).toFixed(1)}</span></div>
          <input type="range" min="0" max="10" step="0.5" bind:value={guess} />
          <div class="ends muted"><span>0</span><span>10</span></div>
        </div>
        <button class="btn green big block" onclick={submit}>Lock it in</button>
      </div>
    {/if}

  {:else if s.phase === 'hreveal'}
    <div class="stack center pop-in">
      {#if mine}
        <div class="bigemoji">{gained >= 750 ? '🎯' : h.hot === id ? '🌶️' : gained ? '👍' : '😅'}</div>
        <h2>The average was {h.avg}</h2>
        <p>You guessed {mine.g}{h.hot === id ? ' · and you had the hottest take!' : ''}</p>
        {#if gained}<p class="pts">+{gained}</p>{/if}
      {:else}
        <div class="bigemoji">🌶️</div>
        <h2>The average was {h.avg ?? '?'}</h2>
      {/if}
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .qmini { margin: 0; text-align: center; }
  .take { margin: 0; font-size: 1.35rem; line-height: 1.25; text-align: center; }
  .sl { gap: 0.35rem; padding: 0.8rem 1rem; }
  .lab { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .val { font-family: var(--font-display); font-size: 1.5rem; white-space: nowrap; }
  input[type='range'] { width: 100%; height: 36px; accent-color: #e0213a; }
  .ends { display: flex; justify-content: space-between; font-size: 0.85rem; }
  .pts { font-family: var(--font-display); font-size: 2.2rem; color: var(--green); margin: 0; }
</style>
