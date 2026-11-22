<script>
  import Avatar from '../../components/Avatar.svelte';
  import ModePicker from '../../components/ModePicker.svelte';
  import PackForm from '../../components/PackForm.svelte';
  import { MAX_SOLO, TEAMS, TEAM_KEYS } from '../../lib/room.js';
  import { MODES } from '../../lib/modes.js';
  import { sfx } from '../../lib/sound.js';

  let { s, id, me, avatars, send, isCtrl, onRedraw } = $props();
  const n = $derived(s.order.length);
  const mode = $derived(MODES[s.settings.game]);
</script>

<div class="stack center">
  {#if isCtrl || n > MAX_SOLO}
    <!-- compact row, so the game picker / team buttons fit on the screen -->
    <div class="merow">
      <div class="pop-in"><Avatar src={avatars[id]} color={me.color} name={me.name} size={64} crown={s.vip === id && s.mode === 'party'} /></div>
      <div class="mtxt">
        <h3>You're in, {me.name}!</h3>
        <button class="btn ghost small" onclick={onRedraw}>✏️ Redraw</button>
      </div>
    </div>
  {:else}
    <div class="pop-in"><Avatar src={avatars[id]} color={me.color} name={me.name} size={120} crown={s.vip === id && s.mode === 'party'} /></div>
    <h2>You're in, {me.name}!</h2>
    <button class="btn ghost small" onclick={onRedraw}>✏️ Redraw</button>
  {/if}

  {#if n > MAX_SOLO}
    <div class="card stack wide">
      <h3>Pick your team</h3>
      <div class="teams">
        {#each TEAM_KEYS as k}
          <button class="tbtn" class:on={me.team === k} style="--c:{TEAMS[k].color}" onclick={() => { sfx.pop(); send('pickTeam', { team: k }); }}>
            <span class="te">{TEAMS[k].emoji}</span>{TEAMS[k].name}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if mode.needsPack}
    <div class="wide"><PackForm {s} {id} {send} {isCtrl} /></div>
  {/if}

  {#if isCtrl}
    <div class="wide"><ModePicker {s} {send} title="You're the VIP 👑 Pick a game" /></div>
  {:else}
    <div class="card wide modecard" style="--mc:{mode.color}">
      <span class="icon-tile" style="--sz:54px">{mode.icon}</span>
      <div><b>{mode.name}</b><br /><span class="muted">{mode.tagline}</span></div>
    </div>
    <p class="muted">{s.mode === 'host' ? `🎤 ${s.hostName} will start the game.` : `Waiting for ${s.players[s.vip]?.name} to start…`}</p>
  {/if}
</div>

<style>
  .merow { display: flex; align-items: center; gap: 0.9rem; text-align: left; }
  .mtxt { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; }
  .mtxt h3 { font-size: 1.3rem; }
  .teams { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
  .tbtn {
    border-radius: 18px; padding: 0.65rem 0.4rem; font-family: var(--font-display); font-size: 0.95rem;
    display: flex; flex-direction: column; align-items: center; gap: 0.15rem;
    background: var(--surface-hi); box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.5);
    border: 3px solid transparent;
  }
  .tbtn .te { font-size: 1.7rem; }
  .tbtn.on {
    color: #fff; border-color: #fff;
    background: var(--c);
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--c) 70%, transparent), 0 0 0 3px var(--c);
  }
  @media (max-height: 800px) {
    .tbtn { flex-direction: row; justify-content: center; gap: 0.35rem; padding: 0.4rem 0.3rem; border-radius: 14px; }
    .tbtn .te { font-size: 1.25rem; }
  }
  .modecard { display: flex; align-items: center; gap: 0.8rem; text-align: left; }
  .modecard b { font-family: var(--font-display); font-weight: 400; font-size: 1.3rem; }
</style>
