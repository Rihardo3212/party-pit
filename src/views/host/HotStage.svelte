<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T } from '../../engine/hottake.js';

  let { s, avatars, now } = $props();

  const h = $derived(s.hot);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const P = (pid) => ({ id: pid, ...s.players[pid] });
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map(P));
  const voters = $derived(h ? Object.keys(h.votes).map(P) : []);
  // Ratings stacked by value: { 0: [p, p], 7: [p] }
  const stacks = $derived.by(() => {
    const out = {};
    for (const p of voters) (out[h.votes[p.id].r] ||= []).push(p);
    return out;
  });
  const ranked = $derived(h ? [...voters].sort((a, b) => (h.results[a.id]?.d ?? 99) - (h.results[b.id]?.d ?? 99)) : []);
  const pct = (v) => `${v * 10}%`;
</script>

{#if h}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#e0213a; --cd:#a3162a">🌶️ Hot Take</span>
      <span class="chip sun">Take {h.round} of {h.rounds}</span>
    </div>

    <div class="take pop-in" class:small={s.phase === 'hreveal'}>“{h.text}”</div>

    {#if s.phase === 'hrate'}
      <div class="sticker big tilt-r">📱 Rate it 0–10, then guess the group's average!</div>
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={!!h.votes[p.id]}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={54} />
            <span>{h.votes[p.id] ? '✅' : '🤔'}</span>
          </div>
        {/each}
      </div>
      <div class="tw"><Timer until={h.until} total={T.rate} {now} /><span class="secs-big">{secs(h.until)}</span></div>

    {:else if s.phase === 'hreveal'}
      <div class="meter">
        <div class="stacks">
          {#each Object.entries(stacks) as [v, ps] (v)}
            <div class="stack-col" style="left:{pct(v)}">
              {#each ps as p, i (p.id)}
                <div class="dot pop-in" style="animation-delay:{200 + i * 120}ms">
                  <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={46} />
                  {#if h.hot === p.id}<span class="chili">🌶️</span>{/if}
                </div>
              {/each}
            </div>
          {/each}
        </div>
        <div class="bar">
          {#each Array(11) as _, i}<span class="tick" style="left:{pct(i)}">{i}</span>{/each}
          {#if h.avg !== null}
            <div class="avg drop" style="left:{pct(h.avg)}"><b>{h.avg}</b><span>average</span></div>
            {#if h.crowdAvg !== null}<div class="crowdavg drop" style="left:{pct(h.crowdAvg)}">📣 {h.crowdAvg}</div>{/if}
          {/if}
        </div>
        <div class="ends"><span>🙅 Nope</span><span>Totally 🔥</span></div>
      </div>

      <div class="ranks">
        {#each ranked as p, i (p.id)}
          {@const r = h.results[p.id]}
          <div class="rk pop-in" class:first={i === 0 && r?.pts} style="animation-delay:{1400 + i * 150}ms">
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={34} />
            <span class="nm">{p.name}</span>
            <span class="muted">guessed {h.votes[p.id].g}</span>
            <span class="pts">+{(r?.pts || 0) + (h.hot === p.id ? 300 : 0)}</span>
          </div>
        {/each}
      </div>
      {#if h.hot}<div class="sticker pop-in hotnote" style="animation-delay:1800ms">🌶️ Hottest take: {s.players[h.hot]?.name} +300</div>{/if}
    {/if}
  </section>
{/if}

<style>
  .crowdavg { position: absolute; top: -2.6rem; transform: translateX(-50%); background: #ff4fa3; color: #fff; font-weight: 900; border-radius: 999px; padding: 0.1rem 0.6rem; font-size: 0.95rem; white-space: nowrap; }
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1.1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .take {
    background: #fff; color: #2b2240; border-radius: 30px; padding: 1.4rem 2.4rem; max-width: 1100px; text-align: center;
    font-family: var(--font-display); font-size: clamp(2rem, calc(3.8 * var(--vw)), 3.6rem); line-height: 1.15; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  }
  .take.small { font-size: clamp(1.3rem, calc(2 * var(--vw)), 1.9rem); padding: 0.7rem 1.6rem; }
  .sticker.big { font-size: 1.6rem; }
  .locks { display: flex; gap: 1.1rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }

  .meter { width: 100%; max-width: 1000px; padding: 0 2rem; }
  .stacks { position: relative; height: 170px; }
  .stack-col { position: absolute; bottom: 6px; transform: translateX(-50%); display: flex; flex-direction: column-reverse; align-items: center; gap: 2px; }
  .dot { position: relative; }
  .chili { position: absolute; top: -10px; right: -12px; font-size: 1.4rem; }
  .bar {
    position: relative; height: 22px; border-radius: 999px;
    background: linear-gradient(90deg, #2f8cff, #a855f7, #ff4fa3, #e0213a);
    box-shadow: 0 10px 24px -8px rgba(224, 33, 58, 0.6);
  }
  .tick { position: absolute; top: 28px; transform: translateX(-50%); font-weight: 900; color: var(--muted); }
  .avg {
    position: absolute; top: 56px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;
    background: var(--sun); color: #3a2a00; border-radius: 16px; padding: 0.15rem 0.8rem; line-height: 1.05; z-index: 2;
    box-shadow: 0 10px 22px -6px rgba(255, 196, 0, 0.7);
  }
  .avg b { font-family: var(--font-display); font-size: 1.8rem; }
  .avg span { font-size: 0.75rem; font-weight: 900; }
  .avg::after { content: ''; position: absolute; top: -12px; border: 6px solid transparent; border-bottom-color: var(--sun); }
  .avg::before { content: ''; position: absolute; top: -60px; width: 4px; height: 50px; border-radius: 4px; background: var(--sun); }
  .drop { animation: drop 0.6s 0.9s cubic-bezier(0.3, 1.6, 0.5, 1) both; }
  @keyframes drop { from { opacity: 0; transform: translate(-50%, 60px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .ends { display: flex; justify-content: space-between; margin-top: 5rem; font-weight: 900; color: var(--muted); }
  .tick { z-index: 1; }

  .ranks { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; max-width: 1100px; }
  .rk { display: flex; align-items: center; gap: 0.5rem; background: var(--surface-hi); border-radius: 15px; padding: 5px 0.9rem 5px 5px; }
  .rk.first { box-shadow: 0 0 0 3px var(--sun); }
  .nm { font-weight: 900; }
  .pts { font-family: var(--font-display); color: var(--green); font-size: 1.2rem; }
  .hotnote { font-size: 1.3rem; }
</style>
