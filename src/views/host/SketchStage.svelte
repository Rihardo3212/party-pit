<script>
  import { onDestroy } from 'svelte';
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import StrokeView from '../../components/StrokeView.svelte';
  import { T } from '../../engine/sketch.js';
  import { figureFor, figureName } from '../../content/sketches.js';

  let { s, avatars, now, db } = $props();

  const m = $derived(s.sketch);
  const figure = $derived(m ? figureFor(m.target) : []);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map((pid) => ({ id: pid, ...s.players[pid] })));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;

  // Everyone's drawings for this round, read straight from the database.
  let drawings = $state({});
  let unsub = null;
  let watching = null;
  $effect(() => {
    const path = m && s.phase === 'mreveal' ? `rooms/${s.code}/${m.path}` : null;
    if (path === watching) return;
    unsub?.();
    unsub = null;
    drawings = {};
    watching = path;
    if (path) unsub = db.onValue(path, (v) => (drawings = v || {}));
  });
  onDestroy(() => unsub?.());

  const rows = $derived(
    m && s.phase === 'mreveal'
      ? players
          .filter((p) => m.results[p.id])
          .map((p) => ({ ...p, pts: m.results[p.id].pts, best: m.best[p.unit] === p.id, strokes: Object.values(drawings[p.id] || {}) }))
          .sort((a, b) => b.pts - a.pts)
      : []
  );
  const big = $derived(rows.length <= 4 ? 230 : rows.length <= 8 ? 175 : 140);
</script>

{#if m}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#ec4899; --cd:#9d174d">🧠 Memory Sketch</span>
      <span class="chip sun">Drawing {m.round} of {m.rounds}</span>
    </div>

    {#if s.phase === 'mlook'}
      {@const lookStart = m.lookUntil - m.look}
      {#if now < lookStart}
        <div class="ready pop-in">
          <div class="sticker big tilt-r">👀 Get ready to memorize…</div>
          <div class="count">{secs(lookStart)}</div>
        </div>
      {:else}
        <div class="look pop-in">
          <div class="sticker big tilt-r">Memorize this! {secs(m.lookUntil)}</div>
          <StrokeView strokes={figure} size={440} border="#ec4899" />
        </div>
      {/if}

    {:else if s.phase === 'mdraw'}
      <div class="hidden pop-in">
        <div class="q">❓</div>
        <div class="sticker big tilt-r">✏️ Draw it from memory!</div>
      </div>
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={!!m.done[p.id]}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={50} />
            <span>{m.done[p.id] ? '✅' : '✏️'}</span>
          </div>
        {/each}
      </div>
      <div class="tw">
        <Timer until={m.until} total={T.draw} {now} /><span class="secs-big">{secs(m.until)}</span>
      </div>

    {:else if s.phase === 'mreveal'}
      <div class="reveal">
        <div class="orig slide-up">
          <span class="sticker">The original: {figureName(m.target)}</span>
          <StrokeView strokes={figure} size={260} border="#22c55e" />
        </div>
        <div class="grid">
          {#each rows as r, i (r.id)}
            <div class="tile pop-in" class:faded={!r.best} style="animation-delay:{400 + i * 250}ms">
              <StrokeView strokes={r.strokes} ghost={figure} size={big} border={colorOf(r)} />
              <div class="tag" style="--c:{colorOf(r)}">
                <Avatar src={avatars[r.id]} color={colorOf(r)} name={r.name} size={30} />
                <span class="rn">{r.name}</span>
                <b>{r.best ? `+${r.pts}` : r.pts}</b>
              </div>
            </div>
          {:else}
            <p class="nobody">Nobody drew anything!</p>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1500px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .sticker.big { font-size: 1.8rem; }
  .ready, .look, .hidden { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .count { font-family: var(--font-display); font-size: 9rem; line-height: 1; color: #ec4899; text-shadow: 0 8px 0 rgba(0, 0, 0, 0.25); }
  .q {
    width: 300px; height: 300px; border-radius: 30px; background: rgba(255, 255, 255, 0.1); display: grid; place-items: center;
    font-size: 9rem; border: 5px dashed rgba(255, 255, 255, 0.35);
  }
  .locks { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }
  .reveal { display: flex; gap: 2rem; align-items: center; justify-content: center; width: 100%; }
  .orig { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
  .grid { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; max-width: 1050px; }
  .tile { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; animation-fill-mode: both; }
  .tile.faded { opacity: 0.6; }
  .tag { display: flex; align-items: center; gap: 0.4rem; background: #fff; color: #2b2240; border-radius: 13px; padding: 4px 0.7rem 4px 4px; font-weight: 900; }
  .tag b { font-family: var(--font-display); font-weight: 400; color: var(--green-dark); font-size: 1.15rem; }
  .rn { max-width: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nobody { font-size: 1.4rem; }
</style>
