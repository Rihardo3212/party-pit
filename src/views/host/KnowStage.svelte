<script>
  // Who Knows Who on the big screen: writing, then "What's Ann's ...?" with 4 options and who picked what.
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T, promptOf } from '../../engine/know.js';

  let { s, avatars, now } = $props();
  const k = $derived(s.know);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const P = (pid) => ({ id: pid, ...s.players[pid] });
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map(P));
  const subject = $derived(k?.subject ? P(k.subject) : null);
  const prompt = $derived(k && s.phase !== 'kwrite' ? promptOf(s, k.slot) : null);
  const question = $derived(prompt && subject ? prompt.q.replace('{name}', subject.name) : '');
  const guessers = $derived(players.filter((p) => p.id !== k?.subject));
  const pickersOf = (i) => guessers.filter((p) => k.picks[p.id] === i);
  const knew = $derived(k ? Object.values(k.picks).filter((i) => i === k.correct).length : 0);
</script>

{#if k}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#8b5cf6; --cd:#6d28d9">🤝 Who Knows Who</span>
      {#if s.phase !== 'kwrite'}<span class="chip sun">Question {k.idx + 1} of {k.queue.length}</span>{/if}
    </div>

    {#if s.phase === 'kwrite'}
      <div class="sticker big tilt-r">📱 Answer a few questions about yourself!</div>
      <div class="prompts">
        {#each k.prompts as _, i}
          <div class="prompt slide-up" style="animation-delay:{i * 120}ms">{promptOf(s, i)?.me}</div>
        {/each}
      </div>
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={!!k.answers[p.id]}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={54} />
            <span>{k.answers[p.id] ? '✅' : '✍️'}</span>
          </div>
        {/each}
      </div>
      <div class="tw"><Timer until={k.until} total={T.write} {now} /><span class="secs-big">{secs(k.until)}</span></div>
    {:else if subject}
      <div class="ask pop-in">
        <Avatar src={avatars[subject.id]} color={colorOf(subject)} name={subject.name} size={110} />
        <h1>{question}</h1>
      </div>

      <div class="options">
        {#each k.options as o, i (`${k.idx}-${i}`)}
          <div
            class="opt flip-in"
            style="animation-delay:{150 + i * 90}ms"
            class:correct={s.phase === 'kreveal' && i === k.correct}
            class:faded={s.phase === 'kreveal' && i !== k.correct}
          >
            <span class="coin l{i}">{'ABCD'[i]}</span> {o}
            {#if s.phase === 'kreveal'}
              <span class="pickers">
                {#each pickersOf(i) as p (p.id)}<Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={34} />{/each}
              </span>
            {/if}
          </div>
        {/each}
      </div>

      {#if s.phase === 'kguess'}
        <div class="locks">
          {#each guessers as p (p.id)}
            <div class="lock" class:on={k.picks[p.id] !== undefined}>
              <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={46} />
              <span>{k.picks[p.id] !== undefined ? '✅' : '🤔'}</span>
            </div>
          {/each}
        </div>
        <div class="tw"><Timer until={k.until} total={T.guess} {now} /><span class="secs-big">{secs(k.until)}</span></div>
      {:else}
        <div class="sticker big pop-in">
          {knew ? `${knew} ${knew === 1 ? 'friend' : 'friends'} knew! ${subject.name} +${k.gained[subject.id] || 0}` : `Nobody knew ${subject.name}! 🙈`}
        </div>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .prompts { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
  .prompt {
    font-family: var(--font-display); font-size: clamp(1.4rem, 2.6vw, 2.2rem); background: #8b5cf6; color: #fff;
    padding: 0.4rem 1.4rem; border-radius: 20px;
  }
  .ask { display: flex; align-items: center; gap: 1.2rem; max-width: 1100px; }
  .ask h1 { margin: 0; font-size: clamp(1.8rem, 3.6vw, 3rem); line-height: 1.15; }
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; width: 100%; max-width: 1000px; }
  .opt { font-size: 1.35rem; position: relative; }
  .pickers { margin-left: auto; display: flex; gap: 0.2rem; }
  .locks { display: flex; flex-wrap: wrap; gap: 0.8rem; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; opacity: 0.55; transition: opacity 0.2s; }
  .lock.on { opacity: 1; }
  .tw { display: flex; align-items: center; gap: 0.8rem; width: min(100%, 620px); }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5ch; }
</style>
