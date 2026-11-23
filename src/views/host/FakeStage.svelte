<script>
  import Avatar from '../../components/Avatar.svelte';
  import Marquee from '../../components/Marquee.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T, POINTS } from '../../engine/fakeout.js';

  let { s, avatars, now } = $props();

  const f = $derived(s.fake);
  const units = $derived(s.unitOrder.map((id) => ({ id, ...s.units[id] })));
  const U = (id) => (id && s.units[id] ? { id, ...s.units[id] } : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const parts = $derived(f ? f.text.split('____') : ['', '']);
  const pickersOf = (id) => units.filter((u) => f.picks[u.id]?.id === id);
  const current = $derived(f && s.phase === 'freveal' && f.step >= 0 ? f.options.find((o) => o.id === f.order[f.step]) : null);
  const revealed = $derived(f && s.phase === 'freveal' ? new Set(f.order.slice(0, f.step + 1)) : new Set());
</script>

{#if f}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:var(--purple); --cd:var(--purple-dark)">🤥 Fake Out</span>
      <span class="chip sun">Fact {f.round} of {f.rounds}</span>
    </div>

    <div class="qwrap pop-in">
      <Marquee color="#c084fc" lit={s.phase !== 'freveal'}>
        <h1 class="qtext">
          {parts[0]}<span class="blank" class:filled={s.phase === 'freveal' && current}>{s.phase === 'freveal' && current ? current.text : '_____'}</span>{parts[1]}
        </h1>
      </Marquee>
    </div>

    {#if s.phase === 'lie'}
      <div class="sticker big">✍️ Write a fake answer that sounds real!</div>
      <div class="locks">
        {#each units as u (u.id)}
          <div class="lock" class:on={!!f.lies[u.id]}>
            <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={56} />
            <span>{f.lies[u.id] ? '🔒 Lie locked' : '🤔'}</span>
          </div>
        {/each}
      </div>
      <div class="tw"><Timer until={f.until} total={T.lie + T.intro} {now} /><span class="secs-big">{secs(f.until)}</span></div>

    {:else if s.phase === 'pick'}
      <div class="sticker big tilt-r">🕵️ Which one is the TRUTH?</div>
      <div class="options" class:many={f.options.length > 4}>
        {#each f.options as o, i (o.id)}
          <div class="opt big flip-in" style="animation-delay:{i * 80}ms"><span class="coin l{i % 4}">{i + 1}</span>{o.text}</div>
        {/each}
      </div>
      <div class="locks">
        {#each units as u (u.id)}
          <div class="lock" class:on={!!f.picks[u.id]}>
            <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={44} />
            <span>{f.picks[u.id] ? '🔒' : '…'}</span>
          </div>
        {/each}
      </div>
      <div class="tw"><Timer until={f.until} total={T.pick} {now} /><span class="secs-big">{secs(f.until)}</span></div>

    {:else if s.phase === 'freveal'}
      {#if current}
        {#key current.id}
          <div class="reveal pop-in" class:truth={current.kind === 'truth'}>
            <div class="rtext">"{current.text}"</div>
            <div class="rwho">
              {#if current.kind === 'truth'}
                <span class="stamp good">✅ THE TRUTH!</span>
              {:else if current.kind === 'house'}
                <span class="stamp bad">🏠 Our lie!</span>
              {:else}
                <span class="stamp bad">🤥 A LIE by</span>
                {#each current.authors as a}<span class="author"><Avatar src={avatars[a]} color={U(a)?.color} name={U(a)?.name} size={44} /> {U(a)?.name}</span>{/each}
              {/if}
            </div>
            <div class="rpick">
              {#if pickersOf(current.id).length}
                <span class="muted">{current.kind === 'truth' ? 'Found it:' : 'Fooled:'}</span>
                {#each pickersOf(current.id) as u (u.id)}
                  <span class="picker"><Avatar src={avatars[u.id]} color={u.color} name={u.name} size={40} /> {u.name}</span>
                {/each}
                <span class="pts">{current.kind === 'truth' ? `+${POINTS.truth} each` : current.kind === 'lie' ? `+${POINTS.fool * pickersOf(current.id).length} for the liar` : ''}</span>
              {:else}
                <span class="muted">Nobody picked it.</span>
              {/if}
            </div>
          </div>
        {/key}
      {:else}
        <div class="sticker big bounce">🥁 Let's see who fooled who…</div>
      {/if}
      <div class="mini">
        {#each f.options as o (o.id)}
          <span class="mopt" class:shown={revealed.has(o.id)} class:t={o.kind === 'truth' && revealed.has(o.id)}>{o.text}</span>
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
  .qwrap { width: 100%; max-width: 1150px; }
  .qtext { font-size: clamp(1.9rem, calc(3.2 * var(--vw)), 3rem); line-height: 1.2; padding: 1.9rem 2.2rem; text-align: center; }
  .blank {
    display: inline-block; min-width: 3.5em; color: var(--purple);
    border-bottom: 0.1em dashed var(--purple); padding: 0 0.2em; margin: 0 0.1em;
  }
  .blank.filled { border-bottom-style: solid; animation: pop-in 0.4s cubic-bezier(0.2, 1.6, 0.4, 1); }
  .sticker.big { font-size: 1.9rem; }
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; width: 100%; max-width: 1150px; }
  .options.many .opt.big { font-size: 1.3rem; }
  .opt.big { font-size: 1.55rem; }
  .locks { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }
  .reveal {
    display: flex; flex-direction: column; align-items: center; gap: 0.7rem;
    background: #ffffff; color: #2b2240; border-radius: 30px; padding: 1.2rem 2rem;
    box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.35), 0 18px 40px rgba(0, 0, 0, 0.4);
  }
  .reveal.truth { box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--green) 70%, transparent), 0 0 50px rgba(34, 197, 94, 0.6); }
  .rtext { font-family: var(--font-display); font-size: 2.8rem; }
  .rwho, .rpick { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: center; font-weight: 900; font-size: 1.2rem; }
  .stamp { font-family: var(--font-display); font-size: 1.8rem; padding: 0.1em 0.7em; border-radius: 14px; color: #fff; transform: rotate(-3deg); }
  .stamp.good { background: var(--green); box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--green) 70%, transparent); }
  .stamp.bad { background: var(--purple); box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--purple) 70%, transparent); }
  .author, .picker { display: inline-flex; align-items: center; gap: 0.35rem; }
  .pts { color: var(--green-dark); font-family: var(--font-display); font-size: 1.5rem; }
  .mini { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; max-width: 1100px; }
  .mopt { background: rgba(255, 255, 255, 0.12); color: #fff; border-radius: 999px; padding: 0.25rem 0.9rem; opacity: 0.6; }
  .mopt.shown { opacity: 1; text-decoration: line-through; }
  .mopt.t { background: var(--green); text-decoration: none; }
</style>
