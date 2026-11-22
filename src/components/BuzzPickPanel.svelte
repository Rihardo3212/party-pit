<script>
  // Big-screen options + buzz status for "buzz in, then pick 1 of 4" modes (Pixel Peek, Hum Hunt).
  import Avatar from './Avatar.svelte';
  import Timer from './Timer.svelte';
  import { pointsAt } from '../engine/buzzpick.js';

  let { s, r, avatars, now, PH, T } = $props();
  const U = (uid) => (uid && s.units[uid] ? { id: uid, ...s.units[uid] } : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const live = $derived(s.phase === PH.play ? pointsAt(now - r.startAt, T.play) : pointsAt(r.elapsed, T.play));
</script>

<div class="options">
  {#each r.options as o, i}
    {@const wrongBy = r.wrongs.find((w) => w.i === i)}
    <div
      class="opt slide-up"
      style="animation-delay:{150 + i * 90}ms"
      class:correct={s.phase === PH.reveal && i === r.correctIndex}
      class:wrong={!!wrongBy}
      class:faded={s.phase === PH.reveal && i !== r.correctIndex}
    >
      <span class="coin l{i}">{'ABCD'[i]}</span> {o}
      {#if wrongBy}<span class="by"><Avatar src={avatars[wrongBy.id] || avatars[wrongBy.uid]} color={U(wrongBy.uid)?.color} name={s.players[wrongBy.id]?.name} size={32} /></span>{/if}
    </div>
  {/each}
</div>

<div class="status">
  {#if s.phase === PH.play}
    {#if now < r.startAt}
      <div class="spill dim">Get ready…</div>
    {:else}
      <div class="spill go">BUZZ NOW! <span class="worth">worth {live}</span></div>
      <Timer until={r.until} total={T.play} {now} />
    {/if}
  {:else if s.phase === PH.answer}
    {@const u = U(r.buzzUnit)}
    <div class="buzzed pop-in">
      <Avatar src={avatars[r.buzzer] || avatars[u?.id]} color={u?.color} name={s.players[r.buzzer]?.name} size={64} />
      <div class="spill" style="background:{u?.color}; color:#fff">{s.players[r.buzzer]?.name} is picking… {secs(r.until)}</div>
    </div>
  {:else if s.phase === PH.reveal}
    {#if r.result === 'right'}
      {@const u = U(r.winner)}
      <div class="spill pop-in" style="background:var(--green); color:#fff">✅ {s.players[r.buzzer]?.name || u?.name}{s.teamMode ? ` (${u?.name})` : ''} +{r.pts}</div>
    {:else}
      <div class="spill dim pop-in">Nobody got it!</div>
    {/if}
  {/if}
</div>

<style>
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; width: 100%; max-width: 1000px; }
  .opt { font-size: 1.35rem; position: relative; }
  .by { margin-left: auto; }
  .status { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; max-width: 640px; min-height: 64px; }
  .spill { font-family: var(--font-display); font-size: 1.5rem; padding: 0.3rem 1.2rem; border-radius: 999px; background: var(--surface-hi); }
  .spill.go { background: var(--red); color: #fff; }
  .spill.dim { opacity: 0.8; }
  .worth { font-size: 1rem; opacity: 0.9; margin-left: 0.4rem; }
  .buzzed { display: flex; align-items: center; gap: 0.8rem; }
</style>
