<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T, POINTS } from '../../engine/oddone.js';

  let { s, avatars, now } = $props();

  const o = $derived(s.odd);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const P = (pid) => ({ id: pid, ...s.players[pid] });
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map(P));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const votersFor = (pid) => Object.keys(o.votes).filter((v) => o.votes[v] === pid);
  const caughtNames = $derived(o ? o.caught.map((p) => s.players[p]?.name).join(' & ') : '');
  const escaped = $derived(o ? o.spies.filter((p) => !o.caught.includes(p)) : []);
  const showClues = $derived(s.phase !== 'oclue');
  const isResult = $derived(s.phase === 'oresult');
</script>

{#if o}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#8b5cf6; --cd:#6d28d9">🕵️ Odd One Out</span>
      <span class="chip sun">Round {o.round} of {o.rounds}</span>
      {#if o.spies.length > 1}<span class="chip">2 spies!</span>{/if}
    </div>

    <div class="cat pop-in">
      <span class="ci">{o.icon}</span>
      <span class="cl">Category</span>
      <span class="cn">{o.cat}</span>
      {#if isResult}<span class="word pop-in">The word was <b>{o.word}</b></span>{/if}
    </div>

    {#if s.phase === 'oclue'}
      <div class="sticker big tilt-r">🤫 Everyone got the secret word… except the spy!</div>
      <p class="hint">Type ONE word on your phone that fits the secret word. Not too obvious!</p>
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={!!o.clues[p.id]}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={58} />
            <span>{o.clues[p.id] ? '✅' : '✍️'}</span>
          </div>
        {/each}
      </div>
      <div class="tw"><Timer until={o.until} total={T.clue} {now} /><span class="secs-big">{secs(o.until)}</span></div>
    {/if}

    {#if showClues}
      {#if s.phase === 'ovote'}<div class="sticker big tilt-r">🔎 Who is the spy? Vote on your phone!</div>{/if}
      {#if s.phase === 'oguess'}<div class="sticker big tilt-r">🚨 Caught: {caughtNames}! One guess at the word for +{POINTS.steal}…</div>{/if}
      {#if isResult}
        <div class="sticker big tilt-r">
          {#if escaped.length}😎 {escaped.map((p) => s.players[p]?.name).join(' & ')} escaped! +{POINTS.escaped}{:else}🎉 Spy caught! Everyone else +{POINTS.caught}{/if}
        </div>
      {/if}
      <div class="clues">
        {#each players as p (p.id)}
          {@const spy = isResult && o.spies.includes(p.id)}
          <div class="clue" class:spy class:dim={isResult && !spy} class:caught={(s.phase === 'oguess' || isResult) && o.caught.includes(p.id)}>
            <div class="bubble">{o.clues[p.id] || '…'}</div>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={spy ? 92 : 66} />
            <span class="cn2">{spy ? '🕵️ ' : ''}{p.name}</span>
            {#if s.phase === 'ovote'}
              <span class="mark">{o.votes[p.id] ? '🗳️' : ''}</span>
            {:else}
              <span class="votes">
                {#each votersFor(p.id) as v (v)}
                  <Avatar src={avatars[v]} color={colorOf(P(v))} name={s.players[v]?.name} size={24} />
                {/each}
              </span>
            {/if}
            {#if isResult && o.guesses[p.id] !== undefined}
              <span class="pill" class:ok={o.stole[p.id]}>Guessed “{o.guesses[p.id]}” {o.stole[p.id] ? `✅ +${POINTS.steal}` : '❌'}</span>
            {/if}
          </div>
        {/each}
      </div>
      {#if s.phase === 'ovote'}
        <div class="tw"><Timer until={o.until} total={T.vote} {now} /><span class="secs-big">{secs(o.until)}</span></div>
      {:else if s.phase === 'oguess'}
        <div class="tw"><Timer until={o.until} total={T.guess} {now} /><span class="secs-big">{secs(o.until)}</span></div>
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
  .cat {
    display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; justify-content: center;
    background: #fff; color: #2b2240; border-radius: 30px; padding: 0.9rem 2.2rem; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
  }
  .ci { font-size: 3rem; }
  .cl { font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; }
  .cn { font-family: var(--font-display); font-size: clamp(2rem, calc(3.6 * var(--vw)), 3.4rem); }
  .word { font-size: 1.6rem; background: #8b5cf6; color: #fff; border-radius: 18px; padding: 0.3rem 1rem; }
  .word b { font-family: var(--font-display); font-weight: 400; font-size: 2rem; }
  .sticker.big { font-size: 1.7rem; }
  .hint { margin: 0; font-size: 1.3rem; opacity: 0.85; }
  .locks, .clues { display: flex; gap: 1.2rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .clue { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; transition: all 0.35s; }
  .clue.dim { opacity: 0.5; }
  .clue.caught .bubble { background: #ff3b4f; color: #fff; }
  .clue.spy .bubble { background: #8b5cf6; color: #fff; }
  .bubble {
    font-family: var(--font-display); font-size: clamp(1.4rem, calc(2.2 * var(--vw)), 2.1rem); background: var(--surface-hi); border-radius: 18px;
    padding: 0.35rem 1rem; max-width: 260px; text-align: center; word-break: break-word; box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.5);
  }
  .cn2 { font-weight: 900; }
  .mark, .votes { display: flex; gap: 0.15rem; min-height: 24px; }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }
  .pill.ok { background: var(--green); color: #fff; }
</style>
