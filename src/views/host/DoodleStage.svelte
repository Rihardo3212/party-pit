<script>
  import Avatar from '../../components/Avatar.svelte';
  import LiveCanvas from '../../components/LiveCanvas.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T } from '../../engine/doodle.js';
  import { DIFFICULTY } from '../../content/doodle.js';

  let { s, avatars, now, db } = $props();

  const d = $derived(s.doodle);
  const artist = $derived(d?.drawer ? { id: d.drawer, ...s.players[d.drawer] } : null);
  const P = (id) => (id && s.players[id] ? { id, ...s.players[id] } : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const guessedList = $derived(d ? Object.entries(d.guessed).sort((a, b) => a[1].order - b[1].order) : []);
</script>

{#if d && artist}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:var(--green); --cd:var(--green-dark)">✏️ Doodle Dash</span>
      <span class="chip sun">Round {d.round} of {d.rounds}</span>
    </div>

    {#if s.phase === 'dchoose'}
      <div class="choosing pop-in">
        <Avatar src={avatars[artist.id]} color={artist.color} name={artist.name} size={140} />
        <h1>{artist.name} is the artist!</h1>
        <p class="sticker">🤫 Picking a secret word… {secs(d.until)}</p>
      </div>
    {:else}
      <div class="stage">
        <div class="canvas-side">
          {#key d.round}
            <LiveCanvas {db} path={`rooms/${s.code}/${d.canvas}`} color={artist.color} readOnly fill />
          {/key}
        </div>
        <div class="info">
          <div class="artist card">
            <Avatar src={avatars[artist.id]} color={artist.color} name={artist.name} size={56} />
            <div>
              <div class="muted">Artist</div>
              <div class="aname">{artist.name}</div>
            </div>
            {#if d.diff}<span class="sticker tilt-r diff">{DIFFICULTY[d.diff].label} ×{DIFFICULTY[d.diff].mult}</span>{/if}
          </div>

          {#if s.phase === 'ddraw'}
            <div class="hint">{d.hint}</div>
            <div class="tw"><Timer until={d.until} total={T.draw} {now} /><span class="secs-big">{secs(d.until)}</span></div>
          {:else}
            <div class="word pop-in">{d.reveal}</div>
          {/if}

          <div class="feed card">
            {#if !d.feed.length}
              <p class="muted">Type your guesses on your phone!</p>
            {/if}
            {#each d.feed as item, i (i + '-' + item.pid + '-' + item.kind + '-' + (item.text || ''))}
              {@const p = P(item.pid)}
              <div class="fi slide-up" class:ok={item.kind === 'ok'} class:close={item.kind === 'close'}>
                <Avatar src={avatars[item.pid]} color={p?.color} name={p?.name} size={34} />
                {#if item.kind === 'ok'}
                  <span><b>{p?.name}</b> guessed it! ✅</span>
                {:else if item.kind === 'close'}
                  <span><b>{p?.name}</b> is so close! 🔥</span>
                {:else}
                  <span class="bubble">{item.text}</span>
                {/if}
              </div>
            {/each}
          </div>

          {#if guessedList.length}
            <div class="got">
              {#each guessedList as [pid, g] (pid)}
                <span class="pill">{P(pid)?.name} <b>+{g.pts}</b></span>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.4rem; }
  .choosing { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .choosing h1 { font-size: 3rem; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); }
  .choosing .sticker { font-size: 1.6rem; }
  .stage { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 1fr); gap: 2rem; width: 100%; align-items: start; }
  .canvas-side { width: 100%; max-width: 640px; justify-self: center; }
  .info { display: flex; flex-direction: column; gap: 1rem; }
  .artist { display: flex; align-items: center; gap: 0.8rem; color: var(--ink); padding: 0.8rem 1rem; }
  .aname { font-family: var(--font-display); font-size: 1.6rem; }
  .diff { margin-left: auto; font-size: 1.1rem; }
  .hint { font-family: var(--font-display); font-size: 3.2rem; letter-spacing: 0.25em; text-align: center; white-space: pre-wrap; text-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); }
  .word {
    font-family: var(--font-display); font-size: 3.2rem; text-align: center; color: #fff;
    background: var(--green); border-radius: 26px; padding: 0.2rem 1rem 0.3rem;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--green) 70%, transparent); text-transform: uppercase;
  }
  .tw { display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }
  .feed { display: flex; flex-direction: column; gap: 0.45rem; min-height: 15rem; color: var(--ink); padding: 0.9rem; }
  .feed p { margin: 0; }
  .fi { display: flex; align-items: center; gap: 0.55rem; font-size: 1.15rem; }
  .fi.ok { color: var(--green); }
  .fi.close { color: var(--sun); }
  .bubble { background: var(--surface-2); border-radius: 14px 14px 14px 4px; padding: 0.2rem 0.75rem; font-weight: 800; }
  .got { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>
