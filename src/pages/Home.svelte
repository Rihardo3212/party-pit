<script>
  import Logo from '../components/Logo.svelte';
  import { cleanCode } from '../lib/room.js';
  import { isLocal } from '../lib/db.js';
  import { DEVELOPER } from '../lib/brand.js';
  import { MODES, GROUP_LIST, modesIn } from '../lib/modes.js';
  import { unlockAudio } from '../lib/sound.js';

  let code = $state('');

  function join(e) {
    e.preventDefault();
    unlockAudio();
    if (cleanCode(code).length === 4) location.hash = `#/join/${cleanCode(code)}`;
  }
  function watchRoom() {
    unlockAudio();
    if (cleanCode(code).length === 4) location.hash = `#/watch/${cleanCode(code)}`;
  }
</script>

<main>
  <div class="hero pop-in"><Logo size={1.35} /></div>
  <p class="tag">The party game where your phone is the controller.</p>

  <div class="choices">
    <section class="card choice">
      <div class="emoji">📺</div>
      <h2>Big screen</h2>
      <p class="muted">Open the game on a laptop or TV everyone can see.</p>
      <a class="btn big block" href="#/host" onclick={unlockAudio}>Host a game</a>
    </section>

    <section class="card choice">
      <div class="emoji">📱</div>
      <h2>Phone</h2>
      <p class="muted">Got a room code? Jump in.</p>
      <form onsubmit={join}>
        <input class="field code" placeholder="ABCD" maxlength="4" autocapitalize="characters" autocomplete="off" bind:value={code} oninput={() => (code = cleanCode(code))} />
        <button class="btn blue big block" disabled={code.length !== 4}>Join</button>
      </form>
      {#if !isLocal}
        <button class="btn ghost block" disabled={code.length !== 4} onclick={watchRoom}>📺 Show the big screen here</button>
        <p class="muted hint">Playing remotely? Open this on your computer, and join with your phone.</p>
      {/if}
    </section>
  </div>

  {#each GROUP_LIST as g}
    <h3 class="ghead"><span>{g.icon}</span> {g.label}</h3>
    <div class="modes">
      {#each modesIn(g.id) as id, i}
        {@const m = MODES[id]}
        <div class="mode card slide-up" style="--mc:{m.color}; animation-delay:{Math.min(i, 5) * 60}ms">
          <span class="icon-tile" style="--sz:52px">{m.icon}</span>
          <span class="mtext"><b>{m.name}</b><span class="muted">{m.tagline}</span></span>
        </div>
      {/each}
    </div>
  {/each}

  <a class="btn ghost" href="#/how">How to play</a>

  {#if isLocal}
    <p class="notice">Local test mode: Firebase is not set up, so host and players have to be tabs in this browser.</p>
  {/if}

  <footer class="footer">a {DEVELOPER} game</footer>
</main>

<style>
  main { max-width: 900px; margin: 0 auto; padding: 3.2rem 1.2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; text-align: center; }
  .hero { margin-bottom: 0.4rem; }
  @media (max-width: 520px) { main { padding-top: 4.4rem; } }
  .tag { font-size: 1.3rem; margin: 0; font-weight: 800; }
  .choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.3rem; width: 100%; }
  .choice { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
  .choice h2 { font-size: 1.9rem; }
  .choice p { margin: 0 0 0.4rem; }
  .emoji { font-size: 2.8rem; filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.25)); }
  form { display: flex; flex-direction: column; gap: 0.8rem; width: 100%; }
  .code { letter-spacing: 0.4em; text-transform: uppercase; }
  .hint { font-size: 0.85rem; margin: 0; }
  .ghead { margin: 0.4rem 0 -0.6rem; font-size: 1.5rem; width: 100%; text-align: left; }
  .modes { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.8rem; width: 100%; }
  .mode { display: flex; align-items: center; gap: 0.9rem; padding: 0.8rem 1rem; text-align: left; }
  .mtext { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
  .mode b { font-family: var(--font-display); font-weight: 400; font-size: 1.25rem; color: var(--mc); line-height: 1.1; }
  .mode .muted { font-size: 0.88rem; line-height: 1.25; }
  /* Phones: two small tiles per row, name only, so the list is short to scroll */
  @media (max-width: 520px) {
    .modes { grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .mode { padding: 0.6rem 0.7rem; gap: 0.55rem; border-radius: 18px; }
    .mode .icon-tile { --sz: 38px !important; }
    .mode b { font-size: 1.02rem; }
    .mode .muted { display: none; }
    .ghead { font-size: 1.25rem; }
  }
</style>
