<script>
  // Move games on the big screen: a get-ready card, then one live view per game kind, then the results.
  import Avatar from '../../components/Avatar.svelte';
  import { GAMES, TUG } from '../../engine/move.js';
  import { MODES } from '../../lib/modes.js';
  import { sfx } from '../../lib/sound.js';
  import { fx } from '../../lib/fx.js';

  let { s, avatars, now } = $props();

  const v = $derived(s.move);
  const mode = $derived(v ? MODES[v.game] : null);
  const game = $derived(v ? GAMES[v.game] : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit && !s.players[pid]?.away).map((pid) => ({ id: pid, ...s.players[pid] })));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const pOf = (pid) => v?.prog?.[pid]?.p || 0;
  const xOf = (pid) => v?.prog?.[pid]?.x || '';

  const rows = $derived(
    v && s.phase === 'vresult'
      ? players
          .filter((p) => v.res[p.id])
          .map((p) => ({ ...p, res: v.res[p.id], pts: v.points[p.id] || 0, best: v.best[p.unit] === p.id }))
          .sort((a, b) => b.pts - a.pts || b.res.score - a.res.score)
      : []
  );

  // Ping Pong: the ball flies from one avatar to the next.
  const seat = (pid) => {
    const i = players.findIndex((p) => p.id === pid);
    const n = Math.max(1, players.length);
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(a) * 40, y: 50 + Math.sin(a) * 38 };
  };
  const ballPos = $derived.by(() => {
    const b = v?.ball;
    if (!b) return null;
    const to = seat(b.to);
    const from = b.from ? seat(b.from) : { x: 50, y: 50 };
    const k = Math.max(0, Math.min(1, (now - b.sentAt) / Math.max(1, b.hitAt - b.sentAt)));
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 14, k };
  });

  // Tug: the two sides.
  const sideList = (side) => (side || []).flatMap((u) => (u === 'bot' ? [{ id: 'bot', name: 'Lewis', bot: true }] : players.filter((p) => p.unit === u)));
  const drawn = $derived(v?.drawAt && now >= v.drawAt);
  // High Noon: the big bang when it's time to draw.
  let drawKey = null;
  $effect(() => {
    const k = drawn && s.phase === 'vgo' ? v.round : null;
    if (k && k !== drawKey) { sfx.boom(); fx.stamp('DRAW!', '#dc2626'); }
    drawKey = k;
  });
  const task = $derived(v?.tasks?.length && v.goAt ? v.tasks[Math.floor(Math.max(0, now - v.goAt) / 5000) % v.tasks.length] : '');
  const lane = (pid) => {
    const p = pOf(pid);
    const x = xOf(pid);
    switch (v.game) {
      case 'soda': return { icon: '🥤', fill: p, text: `${x || 0} fizz` };
      case 'egg': return { icon: x === '🍳' ? '🍳' : '🥚', fill: p, text: x === '🍳' ? 'Cracked!' : 'Steady…' };
      case 'spin': return { icon: '🌀', fill: p, text: `${x || '0.0'} turns`, spin: Number(x) || 0 };
      case 'balloon': return { icon: '🎈', fill: p, text: `${Math.round(p)}%`, grow: p };
      case 'reel': return { icon: x === 'tug' ? '⚠️' : '🎣', fill: p, text: `${Math.round(p)}%` };
      case 'flip': return { icon: '🥞', fill: p, text: `${x || 0} cm` };
      case 'maze': return { icon: '🧭', fill: p, text: `${Math.round(p)}%` };
      case 'beat': return { icon: '🥁', fill: p, text: `${x || 0} pts` };
      default: return { icon: mode.icon, fill: p, text: '' };
    }
  };
</script>

{#if v && game && mode}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:{mode.color}">{mode.icon} {mode.name}</span>
      <span class="chip sun">Round {v.round} of {v.rounds}</span>
    </div>

    {#if s.phase === 'vready'}
      {#key v.round}
        <div class="intro pop-in">
          <span class="icon-tile" style="--sz:150px; --mc:{mode.color}">{mode.icon}</span>
          <h1>{mode.name}</h1>
          <p class="how">{game.hold}</p>
          <div class="count" style="color:{mode.color}">{secs(v.readyUntil)}</div>
        </div>
      {/key}

    {:else if s.phase === 'vgo' && game.kind === 'noon'}
      <div class="noon" class:drawn>
        <div class="noonsun"></div>
        <div class="cactus l">🌵</div><div class="cactus r">🌵</div>
        <div class="word">{drawn ? 'DRAW!' : 'Steady…'}</div>
        <div class="row">
          {#each players as p (p.id)}
            <div class="gun" class:shot={!!v.res[p.id]}>
              <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={70} />
              <span>{v.res[p.id] ? (v.res[p.id].foul ? '🚫' : '💥') : '🤠'}</span>
            </div>
          {/each}
        </div>
      </div>

    {:else if s.phase === 'vgo' && game.kind === 'pong'}
      <div class="table">
        <div class="net"></div>
        {#each players as p (p.id)}
          {@const at = seat(p.id)}
          <div class="seat" class:out={v.out[p.id]} class:target={v.ball?.to === p.id} style="left:{at.x}%; top:{at.y}%">
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={76} />
            <span class="nm">{v.out[p.id] ? '😵 Out' : p.name}</span>
          </div>
        {/each}
        {#if ballPos}
          <div class="pball" style="left:{ballPos.x}%; top:{ballPos.y}%"></div>
        {/if}
        <div class="rally">🏓 {v.rally || 0}</div>
      </div>

    {:else if s.phase === 'vgo' && game.kind === 'tug'}
      {@const A = sideList(v.sides?.a)}
      {@const B = sideList(v.sides?.b)}
      <div class="tug">
        <div class="team">
          {#each A as p (p.id)}{#if p.bot}<span class="bot">🎩</span>{:else}<Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={70} />{/if}{/each}
        </div>
        <div class="ropebox">
          <div class="line"></div>
          <div class="rope" style="transform:translateX({-v.rope * 2.4}px)"><span class="knot">🎀</span></div>
          <div class="meter"><div style="left:{50 - (v.rope / TUG.win) * 50}%"></div></div>
        </div>
        <div class="team">
          {#each B as p (p.id)}{#if p.bot}<span class="bot">🎩</span>{:else}<Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={70} />{/if}{/each}
        </div>
      </div>
      <p class="how">PULL! · {secs(v.goAt + game.time)} s</p>

    {:else if s.phase === 'vgo'}
      {#if v.game === 'egg' && task}<div class="task pop-in">{task}</div>{/if}
      <div class="lanes" class:two={players.length > 3}>
        {#each players as p (p.id)}
          {@const L = lane(p.id)}
          <div class="lanecard" class:done={!!v.res[p.id]} style="--c:{colorOf(p)}">
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={56} />
            <span class="lic" style="transform:{L.spin ? `rotate(${L.spin * 360}deg)` : L.grow !== undefined ? `scale(${0.6 + L.grow / 100})` : 'none'}">{L.icon}</span>
            <div class="track"><div class="fill" style="width:{Math.min(100, L.fill)}%"></div></div>
            <span class="lt">{v.res[p.id] ? v.res[p.id].label : L.text}</span>
          </div>
        {/each}
      </div>
      <p class="secsleft">{secs(v.goAt + game.time)} s</p>

    {:else if s.phase === 'vresult'}
      {#if game.kind === 'tug'}
        <h2 class="rtitle">{v.winSide ? '🏆 What a pull!' : '🤝 A draw!'}</h2>
      {:else}
        <h2 class="rtitle">{mode.icon} {mode.name}</h2>
      {/if}
      <div class="results">
        {#each rows as row, i (row.id)}
          <div class="res slide-up" class:faded={!row.best || !row.pts} style="animation-delay:{i * 200}ms; --c:{colorOf(row)}">
            <span class="rank">{row.pts ? i + 1 : '–'}</span>
            <Avatar src={avatars[row.id]} color={colorOf(row)} name={row.name} size={42} />
            <span class="rn">{row.name}</span>
            <span class="rv">{row.res.label}</span>
            <span class="rp">{row.best && row.pts ? `+${row.pts}` : ''}</span>
          </div>
        {:else}
          <p class="nobody">Nobody moved! Wake up! 😴</p>
        {/each}
      </div>
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1.1rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1300px; width: 100%; margin: 0 auto; position: relative; z-index: 1; min-height: 0;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.35rem; }
  .intro { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; text-align: center; }
  h1 { font-size: 4rem; margin: 0; }
  .how { font-size: 1.7rem; font-weight: 900; margin: 0; max-width: 900px; text-align: center; }
  .count { font-family: var(--font-display); font-size: 5.5rem; line-height: 1; text-shadow: 0 8px 0 rgba(0, 0, 0, 0.25); }

  /* High Noon */
  .noon {
    position: relative; width: 100%; max-width: 1100px; height: min(calc(60 * var(--vh)), 520px); border-radius: 32px; overflow: hidden;
    background: linear-gradient(#f59e0b 0%, #fb923c 55%, #b45309 56%, #78350f 100%);
    display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 2rem 1rem 1.5rem;
  }
  .noon.drawn { animation: flash 0.2s ease-in-out 3; }
  @keyframes flash { 50% { filter: brightness(1.6); } }
  .noonsun { position: absolute; top: 14%; left: 50%; width: 140px; height: 140px; margin-left: -70px; border-radius: 50%; background: #fef3c7; opacity: 0.8; }
  .cactus { position: absolute; bottom: 30%; font-size: 5rem; }
  .cactus.l { left: 6%; } .cactus.r { right: 7%; }
  .word { position: relative; font-family: var(--font-display); font-size: 7rem; color: #fff; text-shadow: 0 8px 0 rgba(0, 0, 0, 0.3); }
  .noon.drawn .word { color: #fef08a; transform: scale(1.15); }
  .row { position: relative; display: flex; gap: 1.6rem; flex-wrap: wrap; justify-content: center; }
  .gun { display: flex; flex-direction: column; align-items: center; font-size: 2rem; transition: transform 0.2s; }
  .gun.shot { transform: translateY(-10px); }

  /* Ping Pong */
  .table {
    position: relative; width: min(900px, 90%); height: min(calc(58 * var(--vh)), 520px); border-radius: 50%;
    background: radial-gradient(#1d7a4f, #145c3b); box-shadow: inset 0 0 0 10px #f1f5f9, 0 20px 40px -20px #000;
  }
  .net { position: absolute; left: 50%; top: 8%; bottom: 8%; width: 6px; margin-left: -3px; background: rgba(255, 255, 255, 0.7); }
  .seat { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; transition: opacity 0.3s; }
  .seat.out { opacity: 0.3; filter: grayscale(1); }
  .seat.target { animation: bob 0.5s ease-in-out infinite alternate; }
  @keyframes bob { to { transform: translate(-50%, -58%); } }
  .nm { font-weight: 900; background: rgba(0, 0, 0, 0.45); border-radius: 10px; padding: 0 0.5rem; }
  .pball { position: absolute; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%; background: #fff; box-shadow: 0 6px 10px rgba(0, 0, 0, 0.4); }
  .rally { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: var(--font-display); font-size: 3rem; color: #fff; opacity: 0.85; }

  /* Tug */
  .tug { display: flex; align-items: center; gap: 1.2rem; width: 100%; max-width: 1150px; }
  .team { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; min-width: 90px; }
  .bot { font-size: 4rem; }
  .ropebox { flex: 1; position: relative; height: 140px; overflow: hidden; }
  .line { position: absolute; left: 50%; top: 10px; bottom: 10px; width: 6px; margin-left: -3px; background: #fff; border-radius: 3px; opacity: 0.6; }
  .rope {
    position: absolute; left: -30%; right: -30%; top: 50%; height: 22px; margin-top: -11px; border-radius: 99px;
    background: repeating-linear-gradient(60deg, #d6a960 0 14px, #b07d3a 14px 28px); transition: transform 0.25s;
  }
  .knot { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 2.8rem; }
  .meter { position: absolute; left: 10%; right: 10%; bottom: 4px; height: 8px; border-radius: 99px; background: linear-gradient(90deg, var(--blue), #fff 50%, var(--red)); opacity: 0.6; }
  .meter div { position: absolute; top: -5px; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: #fff; transition: left 0.25s; }

  /* Lanes */
  .task { font-family: var(--font-display); font-size: 2.6rem; background: var(--surface, rgba(255, 255, 255, 0.08)); border-radius: 22px; padding: 0.4rem 1.4rem; }
  .lanes { display: grid; grid-template-columns: 1fr; gap: 0.7rem; width: 100%; max-width: 820px; }
  .lanes.two { grid-template-columns: 1fr 1fr; max-width: 1240px; }
  .lanecard {
    display: flex; align-items: center; gap: 0.8rem; background: rgba(255, 255, 255, 0.07); border-radius: 22px; padding: 0.55rem 1rem;
  }
  .lanecard.done { background: color-mix(in srgb, var(--c) 25%, transparent); }
  .lic { font-size: 2.6rem; width: 3.2rem; text-align: center; transition: transform 0.3s; }
  .track { flex: 1; height: 18px; border-radius: 99px; background: rgba(0, 0, 0, 0.3); overflow: hidden; }
  .fill { height: 100%; background: var(--c); border-radius: 99px; transition: width 0.35s; }
  .lt { font-weight: 900; font-size: 1.2rem; min-width: 7rem; text-align: right; white-space: nowrap; }
  .secsleft { font-family: var(--font-display); font-size: 2.4rem; margin: 0; opacity: 0.8; }

  /* Results */
  .rtitle { font-size: 2.6rem; margin: 0; }
  .results { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; max-width: 780px; }
  .res {
    display: flex; align-items: center; gap: 0.7rem; background: #fff; color: #2b2240; border-radius: 18px; padding: 0.4rem 0.9rem;
    font-weight: 900; font-size: 1.3rem; animation-fill-mode: both;
  }
  .res.faded { opacity: 0.6; }
  .rank { font-family: var(--font-display); width: 1.8rem; text-align: center; color: var(--c); font-size: 1.7rem; }
  .rn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rv { color: #5b5270; }
  .rp { font-family: var(--font-display); color: var(--green-dark); min-width: 4rem; text-align: right; font-size: 1.5rem; }
  .nobody { font-size: 1.6rem; text-align: center; }
  @media (max-height: 760px) { h1 { font-size: 3rem; } .noon, .table { height: calc(48 * var(--vh)); } .word { font-size: 5rem; } }
  @media (prefers-reduced-motion: reduce) { .noon.drawn, .seat.target { animation: none; } }
</style>
