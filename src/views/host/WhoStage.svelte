<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T } from '../../engine/whowrote.js';

  let { s, avatars, now } = $props();

  const w = $derived(s.who);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const P = (pid) => ({ id: pid, ...s.players[pid] });
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map(P));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const suspects = $derived(w ? w.queue.map(P) : []);
  const author = $derived(w?.author ? P(w.author) : null);
  const right = $derived(w && author ? Object.keys(w.guesses).filter((pid) => w.guesses[pid] === w.author).map(P) : []);
  const fooled = $derived(w && author ? Object.keys(w.guesses).filter((pid) => w.guesses[pid] !== w.author).length : 0);
</script>

{#if w}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#14b8a6; --cd:#0f766e">📝 Who Wrote That?</span>
      <span class="chip sun">Prompt {w.round} of {w.rounds}</span>
      {#if s.phase !== 'wwrite'}<span class="chip">Answer {w.idx + 1} of {w.queue.length}</span>{/if}
    </div>

    <div class="prompt pop-in" class:small={s.phase !== 'wwrite'}>{w.prompt}</div>

    {#if s.phase === 'wwrite'}
      <div class="sticker big tilt-r">✍️ Write your answer on your phone!</div>
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={!!w.answers[p.id]}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={54} />
            <span>{w.answers[p.id] ? '✅' : '✍️'}</span>
          </div>
        {/each}
      </div>
      <div class="tw"><Timer until={w.until} total={T.write} {now} /><span class="secs-big">{secs(w.until)}</span></div>

    {:else if s.phase === 'wguess' || s.phase === 'wshow'}
      {#key w.idx}
        <div class="answer pop-in">“{w.text}”</div>
      {/key}
      <div class="sticker big tilt-r">{s.phase === 'wguess' ? '🤔 Who wrote that?' : `It was ${author?.name}!`}</div>
      <div class="suspects">
        {#each suspects as p (p.id)}
          <div class="sus" class:it={s.phase === 'wshow' && p.id === w.author} class:dim={s.phase === 'wshow' && p.id !== w.author}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={s.phase === 'wshow' && p.id === w.author ? 110 : 70} />
            <span class="sn">{p.name}</span>
            {#if s.phase === 'wshow'}
              <span class="votes">
                {#each Object.keys(w.guesses).filter((g) => w.guesses[g] === p.id) as gid}
                  <Avatar src={avatars[gid]} color={colorOf(P(gid))} name={s.players[gid]?.name} size={26} />
                {/each}
              </span>
            {/if}
          </div>
        {/each}
      </div>
      {#if s.phase === 'wguess'}
        <div class="tw"><Timer until={w.until} total={T.guess} {now} /><span class="secs-big">{secs(w.until)}</span></div>
      {:else}
        <div class="score pop-in">
          {#if right.length}<span class="pill ok">✅ {right.map((p) => p.name).join(', ')} +500</span>{/if}
          {#if fooled}<span class="pill sly">😈 {author?.name} fooled {fooled} +{fooled * 250}</span>{/if}
          {#if !right.length && !fooled}<span class="pill">Nobody guessed!</span>{/if}
        </div>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1.1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .prompt {
    background: #fff; color: #2b2240; border-radius: 30px; padding: 1.4rem 2.4rem; max-width: 1100px; text-align: center;
    font-family: var(--font-display); font-size: clamp(2rem, calc(3.8 * var(--vw)), 3.6rem); line-height: 1.15; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  }
  .prompt.small { font-size: clamp(1.3rem, calc(2 * var(--vw)), 1.9rem); padding: 0.7rem 1.6rem; opacity: 0.9; }
  .sticker.big { font-size: 1.7rem; }
  .answer {
    font-family: var(--font-display); font-size: clamp(2.2rem, calc(4.5 * var(--vw)), 4.4rem); text-align: center; max-width: 1100px; line-height: 1.15;
    color: #fff; background: #14b8a6; border-radius: 30px; padding: 1.2rem 2.4rem; box-shadow: 0 18px 46px -10px rgba(20, 184, 166, 0.8);
  }
  .locks, .suspects { display: flex; gap: 1.1rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .sus { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; transition: all 0.35s; }
  .sus.dim { opacity: 0.45; }
  .sus.it { transform: scale(1.05); }
  .sn { font-weight: 900; }
  .votes { display: flex; gap: 0.15rem; min-height: 26px; }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }
  .score { display: flex; gap: 0.8rem; flex-wrap: wrap; justify-content: center; font-size: 1.4rem; }
  .pill.ok { background: var(--green); color: #fff; }
  .pill.sly { background: var(--purple); color: #fff; }
</style>
