<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T, formatNum, questionById } from '../../engine/closest.js';

  let { s, avatars, now } = $props();

  const c = $derived(s.close);
  const q = $derived(c ? questionById(c.id) : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map((pid) => ({ id: pid, ...s.players[pid] })));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const fmt = (n) => formatNum(n, q);
  const unitText = $derived(c?.unit ? ` ${c.unit}` : '');

  // Results, best first.
  const rows = $derived(
    c && s.phase === 'creveal'
      ? players
          .filter((p) => c.guesses[p.id] !== undefined)
          .map((p) => ({ ...p, n: c.guesses[p.id], ...c.results[p.id], best: c.best[p.unit] === p.id }))
          .sort((a, b) => b.pts - a.pts || Math.abs(a.n - c.answer) - Math.abs(b.n - c.answer))
      : []
  );

  // Number line: where each guess and the answer sit, 0–100%.
  // Big spreads (like 10 vs 100,000) use a log scale so the close guesses don't all bunch up.
  const line = $derived.by(() => {
    if (!c || s.phase !== 'creveal' || c.answer === null) return null;
    const vals = [c.answer, ...rows.map((r) => r.n)];
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const log = !c.year && lo > 0 && hi / lo > 20;
    const f = (v) => (log ? Math.log10(v) : v);
    let a = f(lo);
    let b = f(hi);
    if (a === b) { a -= 1; b += 1; }
    const pad = (b - a) * 0.15;
    a -= pad;
    b += pad;
    const pos = (v) => (log && v <= 0 ? 0 : ((f(v) - a) / (b - a)) * 100);
    // Guesses that land close together get stacked in different rows.
    const marks = [...rows].sort((x, y) => x.n - y.n).map((r) => ({ ...r, x: pos(r.n) }));
    const lastX = [-99, -99, -99];
    for (const m of marks) {
      let row = lastX.findIndex((x) => m.x - x > 7);
      if (row < 0) row = lastX.indexOf(Math.min(...lastX));
      m.row = row;
      lastX[row] = m.x;
    }
    return { marks, answerX: pos(c.answer), lo, hi };
  });
</script>

{#if c && q}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#06b6d4; --cd:#0e7490">🎯 Closest Call</span>
      <span class="chip sun">Question {c.round} of {c.rounds}</span>
      {#if c.double}<span class="chip" style="--c:var(--red); --cd:var(--red-dark)">⚡ Double points!</span>{/if}
    </div>

    {#key c.id}
      <div class="qcard pop-in" class:small={s.phase === 'creveal'}>
        <h1>{c.q}</h1>
        <span class="sticker tilt-r unit">{c.year ? '📅 Answer with a year' : `🔢 Answer in ${c.unit}`}</span>
      </div>
    {/key}

    {#if s.phase === 'cguess'}
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={c.guesses[p.id] !== undefined}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={54} />
            <span>{c.guesses[p.id] !== undefined ? '🔒' : '🤔'}</span>
          </div>
        {/each}
      </div>
      <div class="tw">
        <Timer until={c.until} total={T.guess + T.intro} {now} /><span class="secs-big">{secs(c.until)}</span>
      </div>

    {:else if s.phase === 'creveal' && line}
      <div class="nline">
        <div class="track"></div>
        {#each line.marks as m, i (m.id)}
          <div class="mark slide-down" style="left:{m.x}%; --row:{m.row}; --c:{colorOf(m)}; animation-delay:{200 + i * 220}ms">
            <Avatar src={avatars[m.id]} color={colorOf(m)} name={m.name} size={46} />
            <span class="mval">{fmt(m.n)}</span>
            <span class="stem"></span>
          </div>
        {/each}
        <div class="answer" style="left:{line.answerX}%; animation-delay:{600 + line.marks.length * 220}ms">
          <span class="flag">{fmt(c.answer)}{unitText}</span>
        </div>
      </div>

      <div class="results">
        {#each rows as r, i (r.id)}
          <div class="res slide-up" class:faded={!r.best} style="animation-delay:{1600 + rows.length * 220 + i * 200}ms; --c:{colorOf(r)}">
            <span class="rank">{i + 1}</span>
            <Avatar src={avatars[r.id]} color={colorOf(r)} name={r.name} size={36} />
            <span class="rn">{r.name}</span>
            <span class="rg">{fmt(r.n)}{r.spot ? ' 🎯' : ''}</span>
            <span class="rp">{r.best ? `+${r.pts}` : ''}</span>
          </div>
        {:else}
          <p class="nobody">Nobody guessed! It was <b>{fmt(c.answer)}{unitText}</b>.</p>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1.1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .qcard {
    background: #fff; color: #2b2240; border-radius: 30px; padding: 1.6rem 2.4rem 1.9rem; max-width: 1100px;
    text-align: center; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); position: relative;
  }
  .qcard h1 { margin: 0; font-size: clamp(2rem, calc(3.6 * var(--vw)), 3.4rem); line-height: 1.15; }
  .qcard.small { padding: 1rem 1.8rem 1.4rem; }
  .qcard.small h1 { font-size: clamp(1.5rem, calc(2.4 * var(--vw)), 2.2rem); }
  .unit { position: absolute; bottom: -0.9rem; right: 1.6rem; font-size: 1.15rem; background: #06b6d4; color: #fff; }
  .locks { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 0.8rem; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }

  /* number line */
  .nline { position: relative; width: 100%; max-width: 1150px; height: 250px; margin-top: 0.4rem; }
  .track {
    position: absolute; left: 0; right: 0; top: 190px; height: 12px; border-radius: 99px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0.25));
  }
  .mark {
    position: absolute; top: calc(var(--row) * 56px); transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; animation-fill-mode: both; z-index: 1;
  }
  .mval {
    font-family: var(--font-display); font-size: 1rem; background: var(--c); color: #fff; border-radius: 99px;
    padding: 0 0.55rem; margin-top: 0.2rem; white-space: nowrap; position: relative; z-index: 1; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  }
  .stem { width: 3px; background: var(--c); height: calc(196px - var(--row) * 56px - 74px); border-radius: 2px; }
  .answer {
    position: absolute; top: 170px; transform: translateX(-50%); z-index: 2;
    display: flex; flex-direction: column; align-items: center;
    animation: drop-in 0.6s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  .answer::before { content: ''; width: 6px; height: 52px; background: var(--green); border-radius: 3px; box-shadow: 0 0 18px var(--green); }
  .flag {
    font-family: var(--font-display); font-size: 2rem; background: var(--green); color: #fff; border-radius: 18px;
    padding: 0.1rem 1rem 0.2rem; white-space: nowrap; box-shadow: 0 10px 26px -6px rgba(34, 197, 94, 0.8);
  }
  @keyframes drop-in { from { opacity: 0; transform: translate(-50%, -160px) scale(1.4); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
  .slide-down { animation: slide-down 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
  @keyframes slide-down { from { opacity: 0; transform: translate(-50%, -40px); } to { opacity: 1; transform: translate(-50%, 0); } }

  .results { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.45rem; width: 100%; max-width: 1150px; margin-top: 2.6rem; }
  .res {
    display: flex; align-items: center; gap: 0.5rem; background: #fff; color: #2b2240; border-radius: 14px; padding: 0.3rem 0.7rem;
    font-weight: 900; animation-fill-mode: both;
  }
  .res.faded { opacity: 0.55; }
  .rank { font-family: var(--font-display); width: 1.4rem; text-align: center; color: var(--c); font-size: 1.3rem; }
  .rn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rg { color: #5b5270; }
  .rp { font-family: var(--font-display); color: var(--green-dark); min-width: 3.4rem; text-align: right; font-size: 1.2rem; }
  .nobody { font-size: 1.4rem; text-align: center; grid-column: 1 / -1; }
</style>
