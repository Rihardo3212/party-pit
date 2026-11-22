<script>
  import { REACTIONS } from '../lib/room.js';
  let { onReact } = $props();
  let last = 0;
  let bumped = $state(null);
  let flies = $state([]);
  let fid = 0;
  function tap(e) {
    const t = Date.now();
    if (t - last < 350) return;
    last = t;
    bumped = null;
    requestAnimationFrame(() => (bumped = e));
    const f = { id: ++fid, e };
    flies = [...flies, f];
    setTimeout(() => (flies = flies.filter((x) => x.id !== f.id)), 900);
    navigator.vibrate?.(15);
    onReact(e);
  }
</script>

<div class="bar">
  {#each REACTIONS as e}
    <button class:bump={bumped === e} onclick={() => tap(e)} aria-label="react {e}">
      {e}
      {#each flies.filter((f) => f.e === e) as f (f.id)}<span class="fly" aria-hidden="true">{e}</span>{/each}
    </button>
  {/each}
</div>

<style>
  .bar {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;
    background: var(--surface-hi); border-radius: 24px; padding: 0.55rem;
    box-shadow: var(--shadow); width: 100%;
  }
  button {
    font-size: 1.75rem; height: 54px; border-radius: 18px;
    background: var(--surface-hi);
    box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5);
    position: relative;
    transition: transform 0.15s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  button:active { transform: scale(0.9); }
  .bump { animation: tapjelly 0.4s cubic-bezier(0.2, 1.6, 0.4, 1); }
  @keyframes tapjelly { 0% { transform: scale(0.88); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } }
  /* a little copy of the emoji floats up from the button: "sent!" */
  .fly { position: absolute; left: 50%; top: 0; pointer-events: none; animation: fly 0.9s ease-out forwards; }
  @keyframes fly { from { transform: translate(-50%, 0) scale(0.8); opacity: 1; } to { transform: translate(-50%, -70px) scale(1.3); opacity: 0; } }
</style>
