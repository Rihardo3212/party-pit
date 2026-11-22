<script>
  // Game mode + length picker and the Start button (VIP phone or host phone).
  import { MODES, GROUP_LIST, modesIn } from '../lib/modes.js';
  import { MAX_SOLO } from '../lib/room.js';
  import { sfx } from '../lib/sound.js';

  let { s, send, title = 'Pick a game' } = $props();
  const n = $derived(s.order.length);
  const mode = $derived(MODES[s.settings.game]);
  const lengths = $derived(Object.entries(mode.lengths).filter(([k, l]) => !l.hidden || s.settings.length === k));
  // Which group tab is open. Starts on the group of the chosen game.
  let picked = $state(null);
  const tab = $derived(picked || mode.group);
</script>

<div class="picker card">
  <h3>{title}</h3>
  {#if GROUP_LIST.length > 1}
    <div class="tabs">
      {#each GROUP_LIST as g}
        <button class="tab" class:on={tab === g.id} onclick={() => { sfx.pop(); picked = g.id; }}>
          <span>{g.icon}</span>{g.label}
        </button>
      {/each}
    </div>
  {/if}
  <div class="modes">
    {#each modesIn(tab) as id}
      {@const m = MODES[id]}
      <button class="mode" class:on={s.settings.game === id} style="--mc:{m.color}" onclick={() => { sfx.pop(); send('settings', { game: id }); }}>
        <span class="mi">{m.icon}</span>
        <span class="mn">{m.name}</span>
        <span class="mt">{m.tagline}</span>
      </button>
    {/each}
  </div>
  <div class="lengths">
    {#each lengths as [key, l]}
      <button class="len" class:on={s.settings.length === key} onclick={() => send('settings', { length: key })}>
        <b>{l.label}</b><span>{l.detail}</span>
      </button>
    {/each}
  </div>
  {#if n < mode.min}
    <p class="warn">{mode.name} needs at least {mode.min} players.</p>
  {:else if mode.needsPack && !Object.keys(s.pack || {}).length}
    <p class="warn">Write at least one question first ✍️</p>
  {/if}
  <button class="btn green big block" disabled={n < mode.min || (mode.needsPack && !Object.keys(s.pack || {}).length)} onclick={() => send('start')}>
    ▶ Start {mode.name}{n > MAX_SOLO ? ' (teams)' : ''}
  </button>
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 0.75rem; text-align: center; }
  .tabs { display: flex; gap: 0.35rem; background: var(--well); padding: 0.3rem; border-radius: 16px; box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.25); }
  .tab {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.05rem;
    padding: 0.35rem 0.2rem; border-radius: 12px; font-weight: 900; font-size: 0.8rem; color: var(--muted);
  }
  .tab span { font-size: 1.1rem; }
  .tab.on { background: var(--surface-hi); color: inherit; box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.5); }
  .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
  .mode {
    display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
    padding: 0.7rem 0.4rem; border-radius: 20px;
    background: var(--surface-hi);
    box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5);
    border: 3px solid transparent; transition: transform 0.1s;
  }
  .mode:active { transform: translateY(3px); }
  .mode.on {
    border-color: #fff;
    background: var(--mc);
    color: #fff; box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--mc) 70%, transparent), 0 0 0 3px var(--mc);
  }
  .mi { font-size: 1.9rem; }
  .mn { font-family: var(--font-display); font-size: 1.15rem; }
  .mt { font-size: 0.72rem; opacity: 0.85; line-height: 1.2; }
  .lengths { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .len {
    background: var(--well); border-radius: 16px; padding: 0.55rem; display: flex; flex-direction: column;
    border: 3px solid transparent; box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.25);
  }
  .len b { font-family: var(--font-display); font-weight: 400; font-size: 1.1rem; }
  .len span { font-size: 0.75rem; color: var(--muted); }
  .len.on { border-color: var(--ring); }
  .warn { color: var(--sun); margin: 0; font-weight: 900; }

  /* Shorter phones: icon next to the name, no tagline, so the whole picker fits without scrolling. */
  @media (max-height: 800px) {
    .picker { gap: 0.6rem; padding: 0.9rem; }
    .mode { flex-direction: row; justify-content: center; gap: 0.4rem; padding: 0.55rem 0.3rem; border-radius: 16px; }
    .mi { font-size: 1.35rem; }
    .mn { font-size: 1rem; }
    .mt { display: none; }
    .len { padding: 0.35rem; border-radius: 14px; }
    .len b { font-size: 1rem; }
  }
</style>
