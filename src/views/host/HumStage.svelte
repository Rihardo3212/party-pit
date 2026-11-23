<script>
  // Hum Hunt on the big screen: plays the tune, shows the options and who buzzed.
  import { onDestroy } from 'svelte';
  import BuzzPickPanel from '../../components/BuzzPickPanel.svelte';
  import { T, tuneById } from '../../engine/hum.js';
  import { playTune, tuneMs } from '../../lib/tuneplayer.js';
  import { TUNE_CATS } from '../../content/tunes.js';

  let { s, avatars, now } = $props();
  const r = $derived(s.hum);
  const PH = { play: 'uplay', answer: 'uanswer', reveal: 'ureveal' };
  const tune = $derived(r ? tuneById(r.id) : null);
  const started = $derived(!!r && now >= r.startAt);
  const playing = $derived(s.phase === PH.play && started);

  let stop = null;
  let playingKey = null;
  const halt = () => { stop?.(); stop = null; playingKey = null; };

  // Play while the clue runs; stop when someone buzzes; play it once more, normally, on the reveal.
  $effect(() => {
    if (!r || !tune) { halt(); return; }
    const key = `${s.phase}|${r.round}|${r.wrongs.length}|${playing}`;
    if (key === playingKey) return;
    if (playing) {
      halt();
      playingKey = key;
      stop = playTune(tune, { wave: r.wave, speed: r.speed, repeat: Math.max(1, Math.ceil(T.play / (tuneMs(tune, r.speed) + 500))) });
    } else if (s.phase === PH.reveal) {
      halt();
      playingKey = key;
      stop = playTune(tune, { wave: 'triangle', speed: 1 });
    } else {
      halt();
      playingKey = key;
    }
  });
  onDestroy(halt);
</script>

{#if r}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#10b981; --cd:#047857">🎶 Hum Hunt</span>
      <span class="chip sun">Tune {r.round} of {r.rounds}</span>
      {#if r.speed > 1.05}<span class="chip">⏩ ×{r.speed}</span>{/if}
    </div>

    <div class="stage-box pop-in">
      {#if s.phase === PH.reveal && tune}
        <div class="title pop-in">🎵 {tune.title}</div>
        <div class="muted by">{tune.by} · {TUNE_CATS[tune.cat]}</div>
      {:else}
        <div class="eq" class:on={playing}>
          {#each Array(9) as _, i}<span style="animation-delay:{i * 90}ms"></span>{/each}
        </div>
        <div class="ask">{playing ? 'Name that tune!' : s.phase === PH.answer ? 'Paused…' : 'Listen…'}</div>
      {/if}
    </div>

    <BuzzPickPanel {s} {r} {avatars} {now} {PH} {T} />
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .stage-box {
    width: min(100%, 760px); min-height: 230px; border-radius: 30px; background: #10b981; color: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; padding: 1.2rem;
    box-shadow: 0 18px 46px -10px rgba(16, 185, 129, 0.8);
  }
  .eq { display: flex; align-items: flex-end; gap: 10px; height: 120px; }
  .eq span { width: 22px; height: 20%; border-radius: 8px; background: #fff; opacity: 0.9; }
  .eq.on span { animation: bounce-eq 0.55s ease-in-out infinite alternate; }
  @keyframes bounce-eq { from { height: 15%; } to { height: 100%; } }
  .ask { font-family: var(--font-display); font-size: 2.2rem; }
  .title { font-family: var(--font-display); font-size: clamp(2rem, calc(4 * var(--vw)), 3.4rem); text-align: center; }
  .by { color: #eafff6; font-size: 1.2rem; }
</style>
