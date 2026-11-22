<script>
  // Inside Jokes on the big screen: the player-written question, then the buzz-in options.
  import Avatar from '../../components/Avatar.svelte';
  import BuzzPickPanel from '../../components/BuzzPickPanel.svelte';
  import { T } from '../../engine/jokes.js';

  let { s, avatars, now } = $props();
  const r = $derived(s.jokes);
  const PH = { play: 'jplay', answer: 'janswer', reveal: 'jreveal' };
  const joke = $derived(r ? s.pack?.[r.id] : null);
  const author = $derived(joke ? s.players[joke.by] : null);
</script>

{#if r && joke}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#14b8a6; --cd:#0f766e">🤫 Inside Jokes</span>
      <span class="chip sun">Question {r.round} of {r.rounds}</span>
    </div>
    {#key r.id}
      <div class="qcard card pop-in">
        <p class="q">{joke.q}</p>
        {#if s.phase === PH.reveal && author}
          <div class="by pop-in">
            <Avatar src={avatars[joke.by]} color={author.color} name={author.name} size={44} />
            <span>Written by <b style="color:{author.color}">{author.name}</b></span>
          </div>
        {:else}
          <p class="hush">✍️ Written by someone in this room… 🤫</p>
        {/if}
      </div>
    {/key}
    <BuzzPickPanel {s} {r} {avatars} {now} {PH} {T} />
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .qcard { width: min(100%, 1000px); padding: 1.6rem 2rem; text-align: center; display: flex; flex-direction: column; gap: 0.8rem; align-items: center; }
  .q { margin: 0; font-family: var(--font-display); font-size: clamp(2rem, 3.6vw, 3.4rem); line-height: 1.12; }
  .hush { margin: 0; opacity: 0.65; font-weight: 800; }
  .by { display: flex; align-items: center; gap: 0.6rem; font-size: 1.25rem; font-weight: 800; }
</style>
