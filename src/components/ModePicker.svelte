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
      </button>
    {/each}
  </div>
  <!-- One line about the chosen game, instead of a tagline on every tile -->
  {#key s.settings.game}<p class="about pop-in" style="--mc:{mode.color}"><b>{mode.icon} {mode.name}</b> {mode.tagline}</p>{/key}
  <div class="lengths">
    {#each lengths as [key, l]}
      <button class="len" class:on={s.settings.length === key} onclick={() => { sfx.pop(); send('settings', { length: key }); }}>{l.label}</button>
    {/each}
  </div>
  {#if lengths.find(([k]) => k === s.settings.length)}<p class="ldetail">{lengths.find(([k]) => k === s.settings.length)[1].detail}</p>{/if}
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
  .modes { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .mode {
    display: flex; align-items: center; gap: 0.55rem; text-align: left;
    padding: 0.5rem 0.6rem; border-radius: 18px; min-height: 3.4rem;
    background: var(--surface-hi);
    box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5);
    transition: transform 0.12s cubic-bezier(0.3, 1.6, 0.5, 1), background 0.2s, box-shadow 0.2s;
  }
  .mode:active { transform: scale(0.95); }
  .mode.on {
    background: var(--mc); color: #fff;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--mc) 70%, transparent), 0 0 0 3px #fff;
  }
  /* icon tile: the mode colour lives here, not on a strip */
  .mi {
    flex: none; width: 2.3rem; height: 2.3rem; border-radius: 12px; display: grid; place-items: center;
    font-size: 1.35rem; background: color-mix(in srgb, var(--mc) 30%, transparent);
  }
  .mode.on .mi { background: rgba(255, 255, 255, 0.25); }
  .mn { font-family: var(--font-display); font-size: 1.05rem; line-height: 1.1; }
  .about { margin: 0; font-size: 0.92rem; color: var(--muted); min-height: 2.4em; }
  .about b { color: var(--mc); font-family: var(--font-display); font-weight: 400; }
  .lengths { display: flex; gap: 0.3rem; background: var(--well); padding: 0.3rem; border-radius: 16px; box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.25); }
  .len { flex: 1; padding: 0.5rem; border-radius: 12px; font-family: var(--font-display); font-size: 1.1rem; color: var(--muted); }
  .len.on { background: var(--surface-hi); color: inherit; box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.5); }
  .ldetail { margin: -0.35rem 0 0; font-size: 0.8rem; color: var(--muted); }
  .warn { color: var(--sun); margin: 0; font-weight: 900; }

  @media (max-height: 700px) {
    .picker { gap: 0.55rem; padding: 0.9rem; }
    .mode { min-height: 2.9rem; padding: 0.4rem 0.5rem; }
    .mi { width: 2rem; height: 2rem; font-size: 1.15rem; }
    .about { min-height: 0; }
  }
</style>
