<script>
  // Who Knows Who on the phone: answer about yourself, then guess your friends' answers.
  import ReactBar from '../../components/ReactBar.svelte';
  import { promptOf } from '../../engine/know.js';
  import { sfx } from '../../lib/sound.js';

  let { s, id, send, now, react } = $props();

  const k = $derived(s.know);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const subjectName = $derived(k?.subject ? s.players[k.subject]?.name : '');
  const prompt = $derived(k && s.phase !== 'kwrite' ? promptOf(s, k.slot) : null);
  const myPick = $derived(k?.picks?.[id]);
  const gained = $derived(k?.gained?.[id] || 0);

  let texts = $state(['', '', '', '']);
  const filled = $derived(k ? k.prompts.some((_, i) => texts[i]?.trim()) : false);

  function submit(e) {
    e.preventDefault();
    if (!filled) return;
    sfx.pop();
    send('kwrite', { a: k.prompts.map((_, i) => texts[i]?.trim() || '') });
  }
  function choose(i) {
    sfx.pop();
    navigator.vibrate?.(30);
    send('kpick', { i });
  }
</script>

{#if k}
  {#if s.phase === 'kwrite'}
    {#if k.answers[id]}
      <div class="stack center pop-in">
        <div class="bigemoji">🤫</div>
        <h2>Sent!</h2>
        <p class="muted">Waiting for the others… {secs(k.until)}</p>
        <ReactBar onReact={react} />
      </div>
    {:else}
      <form class="stack" onsubmit={submit}>
        <p class="qmini">🤝 All about you · ⏱ {secs(k.until)}</p>
        {#each k.prompts as _, i}
          <label class="stack q">
            <b>{promptOf(s, i)?.me}</b>
            <input class="field" maxlength="50" placeholder="Your answer" autocomplete="off" bind:value={texts[i]} />
          </label>
        {/each}
        <p class="muted tip">Be honest! Your friends will try to guess these.</p>
        <button class="btn green big block" disabled={!filled}>Send</button>
      </form>
    {/if}

  {:else if s.phase === 'kguess' && prompt}
    <div class="stack center">
      <p class="qmini">Question {k.idx + 1} of {k.queue.length} · ⏱ {secs(k.until)}</p>
      {#if k.subject === id}
        <div class="bigemoji">😳</div>
        <h2>This one's about you!</h2>
        <p class="muted">Every friend who knows gets you +250.</p>
        <ReactBar onReact={react} />
      {:else if myPick !== undefined}
        <h3>{prompt.q.replace('{name}', subjectName)}</h3>
        <p>You picked <b>{k.options[myPick]}</b>. Waiting…</p>
        <ReactBar onReact={react} />
      {:else}
        <h3>{prompt.q.replace('{name}', subjectName)}</h3>
        <div class="stack opts">
          {#each k.options as o, i}
            <button class="opt" onclick={() => choose(i)}><span class="coin l{i}">{'ABCD'[i]}</span>{o}</button>
          {/each}
        </div>
      {/if}
    </div>

  {:else if s.phase === 'kreveal'}
    <div class="stack center pop-in">
      {#if k.subject === id}
        <div class="bigemoji">{gained ? '🥰' : '🙈'}</div>
        <h2>{gained ? 'Your friends know you!' : 'Nobody knew!'}</h2>
      {:else}
        <div class="bigemoji">{myPick === k.correct ? '🎯' : '😅'}</div>
        <h2>{myPick === k.correct ? 'You knew it!' : `It was “${k.options[k.correct]}”`}</h2>
      {/if}
      {#if gained}<p class="pts">+{gained}</p>{/if}
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .qmini { margin: 0; text-align: center; }
  .q { gap: 0.3rem; }
  .tip { margin: 0; font-size: 0.9rem; text-align: center; }
  .opts { width: 100%; gap: 0.5rem; }
  h3 { margin: 0; text-align: center; }
  .pts { font-family: var(--font-display); font-size: 2.2rem; color: var(--green); margin: 0; }
</style>
