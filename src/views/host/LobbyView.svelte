<script>
  import Avatar from '../../components/Avatar.svelte';
  import { MAX_SOLO, TEAMS, TEAM_KEYS } from '../../lib/room.js';
  import { MODES, lengthOf } from '../../lib/modes.js';
  import { isLocal } from '../../lib/db.js';

  let { s, avatars, qr, url, wins, here, watching = false } = $props();

  const players = $derived(s.order.map((id) => ({ id, ...s.players[id] })));
  const mode = $derived(MODES[s.settings.game]);
  const len = $derived(lengthOf(s.settings));
  const ctrlName = $derived(s.mode === 'host' ? s.hostName : s.players[s.vip]?.name);
  const teamCount = (k) => players.filter((p) => p.team === k).length;
  const many = $derived(players.length > MAX_SOLO);
</script>

<section class="lobby">
  <div class="join card pop-in">
    <h2>Join on your phone</h2>
    {#if qr}<div class="qrwrap"><img class="qr" src={qr} alt="QR code to join" /></div>{/if}
    <p class="muted small">or open <b>{url.split('#')[0]}</b> and type</p>
    <div class="bigcode">{s.code}</div>
    {#if isLocal}
      <p class="notice">Local test mode: open the join link in another tab of this browser.</p>
    {:else if !watching}
      <p class="muted small remote">Playing from far away? Open <b>{url.split('#')[0]}#/watch/{s.code}</b> to get this screen on your own computer.</p>
    {/if}
  </div>

  <div class="side">
    {#key s.settings.game}
      <div class="mode card pop-in" style="--mc:{mode.color}">
        <div class="mhead">
          <span class="icon-tile" style="--sz:78px">{mode.icon}</span>
          <div>
            <h1>{mode.name}</h1>
            <p class="tag">{mode.tagline}</p>
          </div>
          <span class="sticker tilt-r len">{len.label}</span>
        </div>
        <ol class="how">
          {#each mode.how as line, i}<li style="animation-delay:{150 + i * 80}ms" class="slide-up">{line}</li>{/each}
        </ol>
        {#if mode.needsPack}
          {#key Object.keys(s.pack || {}).length}<p class="packn pop-in">✍️ <b>{Object.keys(s.pack || {}).length}</b> secret questions written</p>{/key}
        {/if}
      </div>
    {/key}

    <div class="slots" class:many>
      {#each players as p (p.id)}
        <div class="slot card pop-in">
          <span class="bob" style="animation-delay:-{(p.name?.length || 1) * 0.31}s"><Avatar src={avatars[p.id]} color={p.color} name={p.name} size={many ? 70 : 100} crown={s.vip === p.id && s.mode === 'party'} dim={!here(p.id)} /></span>
          <div class="pname">{p.name}</div>
          {#if many}
            <div class="tbadge" style="--c:{p.team ? TEAMS[p.team].color : '#8a85a6'}">{p.team ? TEAMS[p.team].emoji : '?'}</div>
          {:else}
            <div class="pstate">{p.ready ? 'Ready!' : 'drawing…'}</div>
          {/if}
        </div>
      {/each}
      {#each Array(Math.max(0, MAX_SOLO - players.length)) as _}
        <div class="slot empty-slot">
          <div class="empty wobble">?</div>
          <div class="pstate">waiting</div>
        </div>
      {/each}
    </div>

    {#if many}
      <div class="teams slide-up">
        <span class="tlabel">🎽 Team mode! Pick a team on your phone:</span>
        {#each TEAM_KEYS as k}
          <span class="chip" style="--c:{TEAMS[k].color}; --cd:color-mix(in srgb, {TEAMS[k].color} 55%, #000)">{TEAMS[k].emoji} {TEAMS[k].name} · {teamCount(k)}</span>
        {/each}
      </div>
    {/if}

    <div class="status">
      {#if s.mode === 'host'}
        <span class="sticker">🎤 {s.hostName} is hosting</span>
        <span class="muted">{mode.hostRole} The host starts the game.</span>
      {:else if players.length === 0}
        <span class="sticker">Waiting for players…</span>
        <span class="muted">First to join is the VIP 👑 and picks the game. Want a host? Tap "Be the host" when joining.</span>
      {:else}
        <span class="sticker">👑 {ctrlName} is the VIP</span>
        <span class="muted">The VIP picks the game and presses Start.</span>
      {/if}
      {#if players.length > 0 && players.length < mode.min}
        <span class="warn">{mode.name} needs at least {mode.min} players.</span>
      {/if}
    </div>

    {#if wins.length}
      <div class="wins">
        <span class="muted">🏆 Wins:</span>
        {#each wins as [name, n]}<span class="pill">{name} <b>{n}</b></span>{/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .packn { margin: 0.6rem 0 0; font-size: 1.3rem; font-weight: 800; }
  .lobby {
    flex: 1; display: grid; grid-template-columns: minmax(300px, 400px) 1fr; gap: 2.2rem;
    padding: 0.5rem 2.5rem 1rem; align-items: center; max-width: 1380px; margin: 0 auto; width: 100%;
  }
  .join { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }
  .join h2 { font-size: 1.8rem; }
  .qrwrap { background: #fff; padding: 12px; border-radius: 22px; box-shadow: 0 6px 0 #c9c2d9; }
  .qr { width: 100%; max-width: 250px; display: block; }
  .small { margin: 0; font-size: 0.95rem; word-break: break-all; }
  .remote { font-size: 0.85rem; max-width: 330px; }
  .bigcode {
    font-family: var(--font-display); font-size: 4.8rem; letter-spacing: 0.14em; line-height: 1; color: #fff;
    background: var(--red); border-radius: 22px; padding: 0.08em 0.3em 0.14em 0.44em;
    text-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--red) 70%, transparent), 0 14px 24px rgba(0, 0, 0, 0.3);
  }
  .side { display: flex; flex-direction: column; gap: 1.1rem; }
  .mhead { display: flex; align-items: center; gap: 1rem; }
  .mhead h1 { font-size: 2.4rem; color: var(--mc); text-shadow: 0 3px 0 rgba(0, 0, 0, 0.25); }
  .tag { margin: 0; color: var(--muted); font-size: 1.05rem; }
  .len { margin-left: auto; font-size: 1.2rem; }
  .how { margin: 0.8rem 0 0; padding-left: 1.4rem; display: grid; gap: 0.3rem; }
  .how li { font-size: 1.05rem; }
  .slots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.9rem; }
  .slots.many { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 0.7rem; }
  .slot { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; text-align: center; padding: 1.1rem 0.5rem 0.8rem; }
  .empty-slot { border-radius: var(--radius); border: 4px dashed color-mix(in srgb, var(--muted) 45%, transparent); }
  .empty {
    width: 100px; height: 100px; border-radius: 30%; display: grid; place-items: center;
    font-family: var(--font-display); font-size: 3rem; color: var(--muted);
  }
  .pname { font-family: var(--font-display); font-size: 1.3rem; }
  .pstate { color: var(--muted); }
  .tbadge {
    position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
    background: var(--c); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3);
  }
  .teams { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .tlabel { font-family: var(--font-display); font-size: 1.2rem; }
  .status { display: flex; flex-wrap: wrap; gap: 0.8rem; align-items: center; }
  .status .sticker { font-size: 1.3rem; }
  .warn { color: var(--sun); font-weight: 900; }
  .wins { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
</style>
