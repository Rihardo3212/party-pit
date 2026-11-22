<script>
  // Phone for "buzz in, then pick 1 of 4" modes (Pixel Peek, Hum Hunt).
  import Avatar from '../../components/Avatar.svelte';
  import ReactBar from '../../components/ReactBar.svelte';
  import { sfx, unlockAudio } from '../../lib/sound.js';
  import { ownJoke } from '../../engine/jokes.js';

  let { s, id, myUnit, avatars, send, now, react, k, p, icon, ask } = $props();

  const r = $derived(s[k]);
  const PH = $derived({ play: `${p}play`, answer: `${p}answer`, reveal: `${p}reveal` });
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const U = (uid) => (uid && s.units[uid] ? { id: uid, ...s.units[uid] } : null);
  const locked = $derived(!!r?.lockedOut?.[myUnit]);
  const started = $derived(r && now >= r.startAt);
  // Inside Jokes: the question text, and whether I wrote it (then I can't buzz).
  const joke = $derived(k === 'jokes' && r ? s.pack?.[r.id] : null);
  const own = $derived(!!joke && ownJoke(s, id, r.id));
  const ownTeam = $derived(own && joke.by !== id);

  let buzzedLocal = $state(false);
  $effect(() => {
    const key = `${s.phase}|${r?.round}|${r?.wrongs?.length}`;
    key;
    buzzedLocal = false;
  });

  function buzz() {
    unlockAudio();
    if (!r || locked || buzzedLocal || !started) return;
    buzzedLocal = true;
    navigator.vibrate?.(60);
    sfx.buzz(Math.max(0, s.unitOrder.indexOf(myUnit)));
    send(`${p}buzz`);
  }
  function choose(i) {
    navigator.vibrate?.(30);
    send(`${p}pick`, { i });
  }
</script>

{#if r}
  {#if s.phase === PH.play}
    {#if own}
      <div class="stack center">
        <div class="bigemoji bounce">🤫</div>
        <h2>{ownTeam ? 'Your team wrote this one!' : "This one's yours!"}</h2>
        <p class="muted">Sit back and watch who gets it.</p>
        <ReactBar onReact={react} />
      </div>
    {:else if locked}
      <div class="stack center">
        <div class="bigemoji">🔒</div>
        <h2>Locked out</h2>
        <p class="muted">The others can still buzz.</p>
        <ReactBar onReact={react} />
      </div>
    {:else}
      <div class="stack center">
        <p class="qmini">{icon} {r.round} of {r.rounds} · {ask}</p>
        {#if joke}<p class="jq">{joke.q}</p>{/if}
        <button class="buzzer" class:open={started} class:sent={buzzedLocal} onpointerdown={buzz}>
          <span>{#if buzzedLocal}Buzzed!{:else if started}BUZZ!{:else}Wait…{/if}</span>
        </button>
        <p class="muted">Earlier = more points</p>
      </div>
    {/if}

  {:else if s.phase === PH.answer}
    {#if r.buzzer === id}
      <div class="stack">
        <h2 class="center-text">You buzzed! Pick: <span class="muted">{secs(r.until)}</span></h2>
        {#each r.options as o, i}
          {#if !r.wrongs.some((w) => w.i === i)}
            <button class="opt" onclick={() => choose(i)}><span class="coin l{i}">{'ABCD'[i]}</span>{o}</button>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="stack center">
        <Avatar src={avatars[r.buzzer] || avatars[r.buzzUnit]} color={U(r.buzzUnit)?.color} name={s.players[r.buzzer]?.name} size={100} />
        <h2>{r.buzzUnit === myUnit && r.buzzer !== id ? `Your teammate ${s.players[r.buzzer]?.name}` : s.players[r.buzzer]?.name} is answering…</h2>
        <ReactBar onReact={react} />
      </div>
    {/if}

  {:else if s.phase === PH.reveal}
    {@const won = r.result === 'right' && r.winner === myUnit}
    {@const lost = r.wrongs.some((w) => w.uid === myUnit)}
    <div class="stack center pop-in">
      <div class="bigemoji">{won ? '🎉' : lost ? '😬' : '👀'}</div>
      {#if won}<h2>+{r.pts}! Nice!</h2>{/if}
      <p class="muted">The answer was</p>
      <p class="answertext">{r.answer}</p>
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .qmini { margin: 0; text-align: center; }
  .jq { margin: 0; text-align: center; font-weight: 900; font-size: 1.15rem; }
</style>
