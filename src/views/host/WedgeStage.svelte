<script>
  import Avatar from '../../components/Avatar.svelte';
  import Marquee from '../../components/Marquee.svelte';
  import Timer from '../../components/Timer.svelte';
  import Wheel from '../../components/Wheel.svelte';
  import Pie from '../../components/Pie.svelte';
  import { WEDGES } from '../../content/wedges.js';
  import { T } from '../../engine/wedge.js';

  let { s, avatars, now } = $props();

  const w = $derived(s.wedge);
  const units = $derived(s.unitOrder.map((id) => ({ id, ...s.units[id] })));
  const cat = $derived(w?.spin ? WEDGES[w.spin.to] : null);
  const U = (id) => (id && s.units[id] ? { id, ...s.units[id] } : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : n);
  const numRanking = $derived(
    w?.q?.type === 'num' && s.phase === 'wreveal'
      ? units.filter((u) => w.answers[u.id]).sort((a, b) => w.results[a.id].dist - w.results[b.id].dist)
      : []
  );
</script>

{#if w}
  {#if s.phase === 'spin'}
    <section class="main spin">
      <div class="round sticker">Round {w.round} · first to {w.need} wedge{w.need > 1 ? 's' : ''}</div>
      {#key w.round}
        <Wheel target={w.spin.to} turns={w.spin.turns} duration={T.spin - 400} size={430} />
      {/key}
      {#if now >= w.spin.until - 450 && cat}
        <div class="landed pop-in" style="--c:{cat.color}">{cat.icon} {cat.name}!</div>
      {:else}
        <div class="landed dim">Spinning…</div>
      {/if}
    </section>

  {:else if (s.phase === 'wq' || s.phase === 'wreveal') && w.q && cat}
    <section class="main q">
      <div class="qhead">
        <span class="chip" style="--c:{cat.color}; --cd:color-mix(in srgb, {cat.color} 55%, #000)">{cat.icon} {cat.name}</span>
        <span class="chip sun">{w.q.type === 'num' ? '🎯 Closest wins' : 'Everyone answers!'}</span>
      </div>
      <div class="qwrap pop-in">
        <Marquee color={cat.color} lit={s.phase === 'wq'}><h1 class="qtext">{w.q.text}</h1></Marquee>
      </div>

      {#if w.q.type === 'mc'}
        <div class="options">
          {#each w.q.options as o, i}
            <div
              class="opt big flip-in"
              style="animation-delay:{150 + i * 90}ms"
              class:correct={s.phase === 'wreveal' && i === w.q.correctIndex}
              class:faded={s.phase === 'wreveal' && i !== w.q.correctIndex}
            >
              <span class="coin l{i}">{'ABCD'[i]}</span> {o}
              {#if s.phase === 'wreveal'}
                <span class="pickers">
                  {#each units.filter((u) => w.answers[u.id]?.i === i) as u}<Avatar src={avatars[u.id]} color={u.color} name={u.name} size={34} />{/each}
                </span>
              {/if}
            </div>
          {/each}
        </div>
      {:else if s.phase === 'wq'}
        <div class="numhint sticker">Type a number on your phone{w.q.unit ? ` (${w.q.unit})` : ''}!</div>
      {:else}
        <div class="numans pop-in">✅ {fmt(w.q.answer)} {w.q.unit}</div>
        <div class="guesses">
          {#each numRanking as u, i (u.id)}
            <div class="guess card slide-up" class:best={w.results[u.id].ok} style="animation-delay:{i * 120}ms">
              <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={42} />
              <span class="gname">{u.name}</span>
              <span class="gval">{fmt(w.answers[u.id].n)}</span>
              <span class="gdist muted">off by {fmt(w.results[u.id].dist)}</span>
            </div>
          {/each}
        </div>
      {/if}

      {#if s.phase === 'wq'}
        <div class="status">
          <div class="locks">
            {#each units as u (u.id)}
              <div class="lock" class:on={!!w.answers[u.id]}>
                <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={44} />
                <span>{w.answers[u.id] ? '🔒' : '…'}</span>
              </div>
            {/each}
          </div>
          <Timer until={w.until} total={w.q.type === 'num' ? T.num : T.mc} {now} />
          <div class="secs-big">{secs(w.until)}</div>
        </div>
      {:else}
        <div class="status">
          {#if w.winner}
            {@const win = U(w.winner)}
            <div class="wedgewin pop-in" style="--c:{cat.color}">
              <Avatar src={avatars[win.id]} color={win.color} name={win.name} size={70} />
              <div>
                <div class="ww-title">{win.name} {s.teamMode ? 'grab' : 'grabs'} the {cat.name} wedge!</div>
                <div class="ww-sub">+{w.results[win.id]?.pts || 0} points</div>
              </div>
              <Pie wedges={win.wedges} size={74} glow={cat.id} />
            </div>
          {:else}
            <div class="spill dim">Nobody won the wedge this time 😬</div>
          {/if}
        </div>
      {/if}
    </section>
  {/if}
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1.1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .round { font-size: 1.4rem; margin-bottom: 1.6rem; }
  .landed {
    font-family: var(--font-display); font-size: 3rem; color: #fff;
    background: var(--c);
    border-radius: 999px; padding: 0.1em 0.9em 0.18em;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--c) 70%, transparent);
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.25);
  }
  .landed.dim { background: none; box-shadow: none; opacity: 0.85; }
  .qhead { display: flex; gap: 0.7rem; align-items: center; font-size: 1.45rem; }
  .qwrap { width: 100%; max-width: 1150px; }
  .qtext { font-size: clamp(2rem, 3.4vw, 3.2rem); line-height: 1.15; padding: 1.9rem 2.2rem; text-align: center; }
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; max-width: 1150px; }
  .opt.big { font-size: 1.55rem; }
  .pickers { margin-left: auto; display: flex; gap: 0.25rem; }
  .numhint { font-size: 1.9rem; }
  .numans {
    font-family: var(--font-display); font-size: 3rem; color: #fff;
    background: var(--green); padding: 0.15rem 1.8rem 0.25rem; border-radius: 999px;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--green) 70%, transparent);
  }
  .guesses { display: flex; flex-wrap: wrap; gap: 0.7rem; justify-content: center; }
  .guess { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 1rem 0.5rem 0.5rem; color: var(--ink); }
  .guess.best { box-shadow: 0 0 0 4px var(--green), var(--shadow); }
  .gname { font-family: var(--font-display); font-size: 1.2rem; }
  .gval { font-family: var(--font-display); font-size: 1.6rem; color: var(--blue); }
  .status { min-height: 7rem; display: flex; flex-direction: column; align-items: center; gap: 0.7rem; width: 100%; max-width: 720px; }
  .locks { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; opacity: 0.55; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .secs-big { font-family: var(--font-display); font-size: 2rem; }
  .wedgewin {
    display: flex; align-items: center; gap: 1.1rem; color: #fff;
    background: var(--c);
    padding: 0.7rem 1.4rem 0.7rem 0.8rem; border-radius: 28px;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--c) 70%, transparent), 0 0 40px color-mix(in srgb, var(--c) 60%, transparent);
  }
  .ww-title { font-family: var(--font-display); font-size: 1.9rem; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.25); }
  .ww-sub { font-weight: 900; font-size: 1.15rem; }
  .spill { font-family: var(--font-display); font-size: 1.8rem; border-radius: 999px; padding: 0.35rem 1.6rem; }
  .spill.dim { background: rgba(255, 255, 255, 0.12); color: #fff; }
</style>
