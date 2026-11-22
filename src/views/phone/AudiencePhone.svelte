<script>
  // The audience: people watching (late joiners or "Just watch"). They react and cheer for one player.
  import Avatar from '../../components/Avatar.svelte';
  import ReactBar from '../../components/ReactBar.svelte';
  import { MODES } from '../../lib/modes.js';
  import { MAX_PLAYERS } from '../../lib/room.js';
  import { sfx } from '../../lib/sound.js';

  let { s, id, avatars, send, react } = $props();

  const me = $derived(s.audience[id]);
  const players = $derived(s.order.filter((pid) => s.players[pid]).map((pid) => ({ id: pid, ...s.players[pid] })));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const fans = (pid) => Object.values(s.audience).filter((a) => a.fan === pid).length;
  const game = $derived(MODES[s.settings.sub || s.settings.game]);
  const canJoin = $derived(s.phase === 'lobby' && s.order.length < MAX_PLAYERS);

  function cheer(pid) {
    sfx.pop();
    navigator.vibrate?.(30);
    send('cheer', { pid });
  }
</script>

{#if me}
  <div class="stack center">
    <div class="badge sticker">👀 You're in the audience</div>
    {#if s.phase !== 'lobby' && game}<p class="muted now">Now playing: <b>{game.icon} {game.name}</b></p>{/if}

    <h3>📣 Cheer for a player</h3>
    {#if players.length}
      <div class="grid">
        {#each players as p (p.id)}
          <button class="fan" class:on={me.fan === p.id} onclick={() => cheer(p.id)}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={50} />
            <span class="nm">{p.name}</span>
            {#if fans(p.id)}<span class="cnt">📣 {fans(p.id)}</span>{/if}
          </button>
        {/each}
      </div>
      <p class="muted tip">{me.fan ? `You're cheering for ${s.players[me.fan]?.name}! The most cheered player wins Crowd Favourite.` : 'Pick your favourite. You can change your mind.'}</p>
    {:else}
      <p class="muted">Nobody has joined yet.</p>
    {/if}

    <ReactBar onReact={react} />

    {#if canJoin}
      <button class="btn green block" onclick={() => send('join', { name: me.name })}>🎮 Join the game instead</button>
    {:else if s.phase !== 'lobby'}
      <p class="muted tip">You can join as a player when this game ends.</p>
    {/if}
  </div>
{/if}

<style>
  .now { margin: 0; }
  h3 { margin: 0.3rem 0 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 0.5rem; width: 100%; }
  .fan {
    display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.5rem 0.3rem; border-radius: 18px;
    border: 3px solid transparent; background: var(--surface-hi); color: var(--ink); font: inherit; cursor: pointer;
    transition: transform 0.15s;
  }
  .fan:active { transform: scale(0.95); }
  .fan.on { border-color: #ff4fa3; box-shadow: 0 0 18px -4px #ff4fa3; }
  .nm { font-weight: 800; font-size: 0.9rem; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cnt { font-size: 0.8rem; font-weight: 800; }
  .tip { margin: 0; font-size: 0.85rem; text-align: center; }
</style>
