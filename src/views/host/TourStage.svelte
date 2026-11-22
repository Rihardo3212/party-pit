<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import StepFlow from '../../components/StepFlow.svelte';
  import { MODES } from '../../lib/modes.js';
  import { T, POINTS, ITEMS, layoutOf, itemsOf } from '../../engine/tour.js';
  import { stones, smooth, islandPath, bridgeAt, curveFor } from '../../lib/island.js';
  import { onDestroy } from 'svelte';

  let { s, avatars, now } = $props();

  const t = $derived(s.tour);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const U = (uid) => ({ id: uid, ...s.units[uid] });
  const units = $derived(s.unitOrder.map(U));

  const layout = $derived(layoutOf(t));
  const SPACE = {
    start: { icon: '🏁', label: `START +${POINTS.lap}`, c: '#ffffff', fg: '#2b2240' },
    bonus: { icon: '⭐', label: `+${POINTS.bonus}`, c: '#ffc400', fg: '#2b2240' },
    trap: { icon: '💀', label: `−${POINTS.trap}`, c: '#2b2240', fg: '#ffffff' },
    item: { icon: '🎁', label: 'Free item', c: '#22c55e', fg: '#ffffff' },
    shop: { icon: '🛒', label: `Shop −${POINTS.shop}`, c: '#0ea5e9', fg: '#ffffff' },
    goal: { icon: '🌟', label: `GOAL +${POINTS.goal}`, c: '#ff4fa3', fg: '#ffffff' }
  };
  const fresh = (f) => f && now - f.at < 3000;
  const look = (sp) => (sp.k === 'mode' ? { icon: MODES[sp.m].icon, label: MODES[sp.m].name, c: MODES[sp.m].color, fg: '#fff' } : SPACE[sp.k]);
  const mover = $derived(s.phase === 'tmove' ? U(t.moveOrder[t.moveIdx]) : null);
  const ev = $derived(mover ? t.events[mover.id] : null);
  const chooser = $derived(t ? U(t.chooser) : null);
  const mode = $derived(t?.mode ? MODES[t.mode] : null);
  const ranked = $derived(s.phase === 'tscore' ? [...units].sort((a, b) => (t.mini[b.id] || 0) - (t.mini[a.id] || 0)) : []);
  // The space the next game comes from: the chooser's space, or the next game space ahead of it.
  const pickIdx = $derived.by(() => {
    if (!t) return -1;
    const from = t.pos[t.chooser] || 0;
    const n = t.board.length;
    for (let k = 0; k < n; k++) if (t.board[(from + k) % n]?.k === 'mode') return (from + k) % n;
    return -1;
  });
  const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  // ---------- Toy Island ----------
  const geo = $derived(t && !t.mix ? stones(curveFor(layout), t.board.length) : null);
  const road = $derived(geo ? smooth(geo.pts, geo.closed) : '');
  const isle = $derived(geo ? islandPath(geo.W, geo.H, 3, layout.id.length) : '');
  const bridge = $derived(geo ? bridgeAt(geo.pts, geo.cross) : null);
  const pct = (p) => `left:${(p[0] / geo.W) * 100}%; top:${(p[1] / geo.H) * 100}%`;
  // Palm trees and shells just outside the road, pushed away from the middle.
  const scenery = $derived.by(() => {
    if (!geo) return [];
    const cx = geo.W / 2, cy = geo.H / 2;
    const out = [];
    const icons = ['🌴', '🌴', '🌺', '🌴', '🍄', '🌴', '🪨', '🌴'];
    const n = geo.pts.length;
    for (let k = 0; k < 8; k++) {
      const p = geo.pts[Math.floor(((k + 0.5) / 8) * n) % n];
      const dx = p[0] - cx, dy = p[1] - cy, m = Math.hypot(dx, dy) || 1;
      const off = geo.r * 1.9;
      out.push({ x: p[0] + (dx / m) * off, y: p[1] + (dy / m) * off, icon: icons[k] });
    }
    return out;
  });

  // Tokens hop space by space to where the engine put them.
  let shown = $state({});
  let hopping = $state({});
  let timers = [];
  $effect(() => {
    if (!t || t.mix) return;
    const n = t.board.length;
    for (const u of s.unitOrder) {
      const to = t.pos[u] || 0;
      const from = shown[u];
      if (from === undefined) { shown[u] = to; continue; }
      if (from === to || hopping[u]) continue;
      const ahead = (to - from + n) % n;
      if (ahead > 12) { shown[u] = to; continue; } // swaps and teleports jump straight there
      hopping[u] = true;
      const hop = () => {
        const cur = shown[u];
        const target = t.pos[u] || 0;
        if (cur === target) { hopping[u] = false; return; }
        shown[u] = (cur + 1) % n;
        timers.push(setTimeout(hop, 260));
      };
      timers.push(setTimeout(hop, 150));
    }
  });
  onDestroy(() => timers.forEach(clearTimeout));
  const tokenSpot = (u, i) => {
    const here = s.unitOrder.filter((x) => (shown[x] ?? 0) === (shown[u] ?? 0));
    const k = here.indexOf(u);
    const p = geo.pts[(shown[u] ?? 0) % geo.pts.length];
    if (here.length < 2) return pct([p[0], p[1] - geo.r * 0.9]);
    const a = (k / here.length) * Math.PI * 2 - Math.PI / 2;
    return pct([p[0] + Math.cos(a) * geo.r * 0.75, p[1] - geo.r * 0.6 + Math.sin(a) * geo.r * 0.6]);
  };
</script>

{#if t}
  <section class="main" class:side={layout.side && !t.mix}>
    {#if t.mix}
      <div class="center solo">{@render panel()}</div>
    {:else}
    <div class="island" class:shaped={layout.side} style="--ar:{geo.W} / {geo.H}; --sz:{(geo.r * 2 / geo.W) * 100}cqw">
      <svg viewBox="-12 -10 {geo.W + 24} {geo.H + 20}" class="map" aria-hidden="true" style="left:{(-12 / geo.W) * 100}%; top:-10%; width:{((geo.W + 24) / geo.W) * 100}%; height:120%">
        <defs>
          <radialGradient id="sea" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#22b8cf" /><stop offset="0.86" stop-color="#0e7fa8" /><stop offset="0.95" stop-color="#0b5f8a" stop-opacity="0.75" /><stop offset="1" stop-color="#0b4f7a" stop-opacity="0" /></radialGradient>
          <radialGradient id="grass" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#6fd36a" /><stop offset="1" stop-color="#2f9a4a" /></radialGradient>
        </defs>
        <ellipse cx={geo.W / 2} cy={geo.H / 2} rx={geo.W / 2 + 20} ry={geo.H / 2 + 15} fill="url(#sea)" />
        {#each [[-4, 6], [geo.W - 14, geo.H + 3], [geo.W * 0.3, geo.H + 5], [geo.W + 2, geo.H * 0.35]] as [wx, wy], i}
          <path class="wave" style="animation-delay:{i * 0.7}s" d="M{wx},{wy} q3,-3 6,0 t6,0 t6,0" />
        {/each}
        <!-- the island: shadow, sand rim, grass -->
        <path d={isle} fill="#0a3d5c" opacity="0.35" transform="translate(0 2.5)" />
        <path d={isle} fill="#f5d38a" />
        <path d={isle} fill="url(#grass)" transform="translate({geo.W / 2} {geo.H / 2}) scale(0.94) translate({-geo.W / 2} {-geo.H / 2})" />
        <!-- volcano islet -->
        <g transform="translate({geo.W - 3} 1)">
          <ellipse cx="0" cy="7" rx="11" ry="4" fill="#f5d38a" />
          <path d="M-9,7 L-2,-6 L2,-6 L9,7 Z" fill="#7c4a2a" />
          <path d="M-2,-6 L2,-6 L3,-3 L0,-1 L-3,-3 Z" fill="#ff6b2c" />
          <circle class="smoke" cx="0" cy="-9" r="2.2" fill="#e5e7eb" />
          <circle class="smoke" style="animation-delay:1.2s" cx="1" cy="-9" r="1.8" fill="#e5e7eb" />
        </g>
        <text x="-2" y={geo.H + 4} font-size="7" class="boat">⛵</text>
        <!-- river and bridge -->
        {#if bridge && !bridge.cross}
          <path d="M{bridge.x - 3},{bridge.y} C{bridge.x - 4},{bridge.y + 6} {bridge.x + 4},{bridge.y + 8} {bridge.x + 2},{geo.H + 10} L{bridge.x + 8},{geo.H + 10} C{bridge.x + 9},{bridge.y + 8} {bridge.x + 3},{bridge.y + 6} {bridge.x + 3},{bridge.y} Z" fill="#1aa3c8" />
        {/if}
        <!-- the road -->
        <path d={road} fill="none" stroke="#7a5230" stroke-width={geo.r * 1.25} stroke-linecap="round" stroke-linejoin="round" opacity="0.55" transform="translate(0 0.8)" />
        <path d={road} fill="none" stroke="#d9a866" stroke-width={geo.r * 1.1} stroke-linecap="round" stroke-linejoin="round" />
        <path d={road} fill="none" stroke="#f3d39a" stroke-width="0.7" stroke-dasharray="2 2.5" stroke-linecap="round" />
        {#if !geo.closed}
          <path d="M{geo.pts[geo.pts.length - 1][0]},{geo.pts[geo.pts.length - 1][1]} L{geo.pts[0][0]},{geo.pts[0][1]}" stroke="#fff" stroke-width="0.6" stroke-dasharray="1 2" opacity="0.5" fill="none" />
        {/if}
        {#if bridge}
          <g transform="translate({bridge.x} {bridge.y}) rotate({bridge.ang}) scale({bridge.cross ? bridge.len / (geo.r * 2.4) : 1} 1)">
            <rect x={-geo.r * 0.9} y={-geo.r * 0.75} width={geo.r * 1.8} height={geo.r * 1.5} rx="1" fill="#a0672f" />
            {#each [-0.6, -0.2, 0.2, 0.6] as k}<rect x={geo.r * k - 0.4} y={-geo.r * 0.75} width="0.8" height={geo.r * 1.5} fill="#7a4a1e" />{/each}
            <rect x={-geo.r * 0.95} y={-geo.r * 0.85} width={geo.r * 1.9} height="0.8" fill="#5b3714" />
            <rect x={-geo.r * 0.95} y={geo.r * 0.75} width={geo.r * 1.9} height="0.8" fill="#5b3714" />
          </g>
        {/if}
        {#each scenery as sc}
          <text x={sc.x} y={sc.y} font-size={geo.r * 1.3} text-anchor="middle" dominant-baseline="middle">{sc.icon}</text>
        {/each}
      </svg>

      {#each t.board as sp, i (i)}
        {@const L = look(sp)}
        <div class="stone" class:hot={ev && ev.to === i} class:pickme={s.phase === 'tpick' && i === pickIdx} class:special={sp.k !== 'mode'}
          style="{pct(geo.pts[i])}; --c:{L.c}; --fg:{L.fg}" title={L.label}>
          <span class="si">{L.icon}</span>
          {#if sp.k === 'start' || sp.k === 'goal'}<span class="sl">{sp.k === 'start' ? 'START' : 'GOAL'}</span>{/if}
        </div>
      {/each}

      {#each units as u, i (u.id)}
        <span class="tok" class:moving={mover?.id === u.id || hopping[u.id]} style={tokenSpot(u.id, i)}>
          <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={layout.side ? 30 : 36} />
        </span>
      {/each}

      {#if !layout.side}
        <div class="center inner">{@render panel()}</div>
      {/if}
    </div>
    {#if layout.side}<div class="center beside">{@render panel()}</div>{/if}
    {/if}
  </section>
{/if}

{#snippet panel()}
        <div class="qhead">
          {#if t.mix}<span class="chip" style="--c:#ff4fa3; --cd:#c0267a">🎉 Quick Party</span>
          {:else}<span class="chip" style="--c:#22c55e; --cd:#15803d">🗺️ Party Tour</span>{/if}
          <span class="chip sun">{t.mix ? 'Game' : 'Round'} {t.round} of {t.rounds}</span>
          {#if !t.mix && t.round === 1 && s.phase === 'troll'}<span class="chip" style="--c:#6d5bd0; --cd:#4c3ba8">🗺️ {layout.name}</span>{/if}
        </div>

        {#if s.phase === 'troll'}
          <div class="sticker big tilt-r">🎲 Roll the dice on your phone!</div>
          <p class="note"><b style="color:{chooser.color}">{chooser.name}</b>'s roll picks the next game</p>
          {#if fresh(t.flash)}
            {@const f = t.flash}
            {@const who = U(f.uid)}
            {@const tg = f.target ? U(f.target) : null}
            <div class="flash pop-in">
              {ITEMS[f.k].icon} <b style="color:{who.color}">{who.name}</b>
              {#if f.k === 'double'}will roll two dice!
              {:else if f.k === 'swap'}swapped spots with <b style="color:{tg?.color}">{tg?.name}</b>!
              {:else if f.k === 'steal' && f.blocked}tried to steal from <b style="color:{tg?.color}">{tg?.name}</b>… 🛡️ Blocked!
              {:else if f.k === 'steal'}stole {f.pts} from <b style="color:{tg?.color}">{tg?.name}</b>!{/if}
            </div>
          {/if}
          <div class="rolls">
            {#each units as u (u.id)}
              <div class="roll" class:on={!!t.rolls[u.id]}>
                <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={50} />
                <span class="die">{t.rolls[u.id] ? (t.dice[u.id] || [t.rolls[u.id]]).map((d) => DICE[d]).join('') : t.used[u.id]?.k === 'double' ? '🎲🎲' : '🎲'}</span>
                {#if itemsOf(t, u.id).length}
                  <span class="items">{#each itemsOf(t, u.id) as [k, n] (k)}{#each Array(n) as _}<span title={ITEMS[k].name}>{ITEMS[k].icon}</span>{/each}{/each}</span>
                {/if}
              </div>
            {/each}
          </div>
          <div class="tw"><Timer until={t.until} total={T.roll} {now} /><span class="secs-big">{secs(t.until)}</span></div>

        {:else if s.phase === 'tmove' && mover && ev}
          {#key t.moveIdx}
            <div class="move pop-in">
              <Avatar src={avatars[mover.id]} color={mover.color} name={mover.name} size={84} />
              <div>
                <div class="mname">{mover.name} rolled <span class="dnum">{ev.roll}</span></div>
                <div class="evs">
                  {#if ev.lap}<span class="pill ok">🏁 Lap! +{POINTS.lap}</span>{/if}
                  {#if ev.kind === 'bonus'}<span class="pill sun">⭐ Bonus! +{POINTS.bonus}</span>{/if}
                  {#if ev.kind === 'goal'}<span class="pill sun">🌟 GOAL! +{POINTS.goal}</span>{/if}
                  {#if ev.kind === 'trap' && ev.shield}<span class="pill ok">🛡️ Shield blocked the trap!</span>
                  {:else if ev.kind === 'trap'}{@const loss = (ev.lap ? POINTS.lap : 0) - ev.pts}<span class="pill bad">💀 Trap! {loss ? `−${loss}` : 'Nothing to lose!'}</span>{/if}
                  {#if ev.item}<span class="pill ok">{ev.bought ? `🛒 Bought (−${POINTS.shop})` : '🎁 Got'} {ITEMS[ev.item].icon} {ITEMS[ev.item].name}!</span>{/if}
                  {#if ev.full}<span class="pill">🎒 Bag full!</span>{/if}
                  {#if ev.broke}<span class="pill bad">🛒 Can't afford it!</span>{/if}
                  {#if ev.kind === 'mode'}<span class="pill" style="background:{MODES[t.board[ev.to].m].color}; color:#fff">{MODES[t.board[ev.to].m].icon} {MODES[t.board[ev.to].m].name}</span>{/if}
                  {#if mover.id === t.chooser}<span class="pill">👑 Picks the game!</span>{/if}
                </div>
              </div>
            </div>
          {/key}

        {:else if s.phase === 'tpick' && mode}
          {#if t.mix}<div class="sticker big tilt-r">🎰 The next game is…</div>{/if}
          <div class="pick pop-in" style="--mc:{mode.color}">
            <span class="pi">{mode.icon}</span>
            <div>
              <div class="pn">Next: {mode.name}</div>
              <div class="pt">{mode.tagline}</div>
            </div>
          </div>
          <div class="steps"><StepFlow steps={mode.steps} color={mode.color} size="small" animate /></div>
          <div class="tw"><Timer until={t.until} total={T.pick} {now} /><span class="secs-big">{secs(t.until)}</span></div>

        {:else if s.phase === 'tscore'}
          <div class="sticker big tilt-r">{mode?.icon} {mode?.name} results</div>
          <div class="results">
            {#each ranked as u, i (u.id)}
              <div class="res pop-in" style="animation-delay:{i * 0.12}s">
                <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={40} />
                <span class="rn">{u.name}</span>
                <span class="rm">{t.mini[u.id] || 0} pts</span>
                <span class="pill" class:ok={t.place[u.id] > 0}>{t.place[u.id] ? `+${t.place[u.id]}` : '+0'}</span>
              </div>
            {/each}
          </div>
        {/if}
{/snippet}

<style>
  .main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0.3rem 1.5rem 0.6rem 150px; /* room for Lewis on the left */ width: 100%; position: relative; z-index: 1; }
  /* Toy Island */
  .island {
    position: relative; container-type: inline-size; aspect-ratio: var(--ar);
    width: min(100%, 1500px, calc(min(74vh, 800px) * 1.6)); flex: 0 1 auto;
  }
  .island.shaped { width: min(60%, calc(min(74vh, 800px) * 1.15)); }
  .map { position: absolute; overflow: visible; filter: drop-shadow(0 18px 30px rgba(0, 0, 0, 0.45)); }
  .wave { fill: none; stroke: #bdf3ff; stroke-width: 0.8; stroke-linecap: round; opacity: 0.6; animation: wave 3.5s ease-in-out infinite; }
  @keyframes wave { 50% { transform: translateX(3px); opacity: 0.2; } }
  .smoke { animation: smoke 2.4s ease-out infinite; }
  @keyframes smoke { from { transform: translateY(0) scale(0.6); opacity: 0.9; } to { transform: translateY(-8px) scale(1.6); opacity: 0; } }
  .boat { animation: boat 4s ease-in-out infinite alternate; }
  @keyframes boat { to { transform: translate(4px, -1px) rotate(4deg); } }
  .stone {
    position: absolute; width: var(--sz); height: var(--sz); transform: translate(-50%, -50%); border-radius: 50%;
    background: var(--c); color: var(--fg); display: grid; place-items: center; z-index: 1;
    box-shadow: 0 0.35cqw 0 rgba(0, 0, 0, 0.3), inset 0 -0.3cqw 0 rgba(0, 0, 0, 0.18), 0 0 0 0.35cqw rgba(255, 255, 255, 0.85);
    transition: transform 0.25s;
  }
  .stone.special { box-shadow: 0 0.35cqw 0 rgba(0, 0, 0, 0.3), inset 0 -0.3cqw 0 rgba(0, 0, 0, 0.18), 0 0 0 0.35cqw #fff7d6; }
  .stone.hot, .stone.pickme { transform: translate(-50%, -60%) scale(1.25); box-shadow: 0 0 0 0.45cqw #fff, 0 0 2.5cqw var(--c); z-index: 3; }
  .si { font-size: calc(var(--sz) * 0.55); line-height: 1; }
  .sl {
    position: absolute; top: 100%; margin-top: 0.4cqw; font-family: var(--font-display); font-size: max(0.7rem, 1.1cqw);
    color: #fff; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5); white-space: nowrap;
  }
  .tok { position: absolute; transform: translate(-50%, -70%); z-index: 4; transition: left 0.24s ease, top 0.24s ease; }
  .tok.moving { z-index: 5; animation: hop 0.26s ease-in-out infinite; }
  @keyframes hop { 50% { transform: translate(-50%, -100%); } }
  .center.inner { position: absolute; left: 17%; right: 17%; top: 25.5%; bottom: 25.5%; z-index: 2; gap: 0.5rem; padding: 0.2rem 0.5rem; }
  .inner .qhead { font-size: 1.05rem; }
  .inner .sticker.big { font-size: 1.3rem; }
  .inner .note { font-size: 1.05rem; }
  .inner .tw { max-width: 88%; }
  .main.side { gap: 2.4rem; }
  @media (prefers-reduced-motion: reduce) { .wave, .smoke, .boat, .tok.moving { animation: none; } }
  .center.beside { flex: 1; min-width: 320px; max-width: 640px; align-self: stretch; }
  .beside .move { flex-direction: column; text-align: center; padding: 0.8rem 1rem; }
  .beside .mname { font-size: 1.5rem; }
  .beside .evs { justify-content: center; }
  .center.solo { width: min(100%, 1100px); min-height: 60vh; }
  .center {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.8rem;
    padding: 0.6rem 1rem; min-height: 0; overflow: hidden;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.3rem; }
  .sticker.big { font-size: 1.6rem; }
  .note { margin: 0; font-size: 1.2rem; }
  .rolls { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .roll { display: flex; flex-direction: column; align-items: center; opacity: 0.55; transition: all 0.2s; }
  .roll.on { opacity: 1; transform: translateY(-4px); }
  .die { font-size: 2.2rem; line-height: 1.1; }
  .items { font-size: 1.1rem; line-height: 1; }
  .flash { background: var(--surface); border-radius: 999px; padding: 0.4rem 1.2rem; font-size: 1.25rem; font-weight: 800; box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35); }
  .tw { width: 100%; max-width: 560px; display: flex; align-items: center; gap: 1rem; }
  .secs-big { font-family: var(--font-display); font-size: 1.7rem; min-width: 2.5rem; }
  .move { display: flex; align-items: center; gap: 1.2rem; background: var(--surface); border-radius: 28px; padding: 1rem 1.6rem; box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4); }
  .mname { font-family: var(--font-display); font-size: 2rem; }
  .dnum { display: inline-grid; place-items: center; width: 1.6em; height: 1.6em; background: #fff; color: #2b2240; border-radius: 12px; margin-left: 0.3rem; }
  .evs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; font-size: 1.15rem; }
  .pick { display: flex; align-items: center; gap: 1.2rem; background: var(--mc); color: #fff; border-radius: 28px; padding: 0.9rem 1.8rem; box-shadow: 0 18px 46px -10px var(--mc); }
  .pi { font-size: 4rem; }
  .pn { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.8rem); }
  .pt { font-weight: 800; opacity: 0.9; }
  .steps { width: 100%; max-width: 900px; }
  .results { display: flex; flex-direction: column; gap: 0.4rem; min-width: 380px; }
  .res { display: flex; align-items: center; gap: 0.7rem; background: var(--surface); border-radius: 17px; padding: 5px 0.9rem 5px 5px; }
  .rn { font-weight: 900; flex: 1; }
  .rm { opacity: 0.75; font-weight: 800; }
  .pill.ok { background: var(--green); color: #fff; }
  .pill.bad { background: #ff3b4f; color: #fff; }
  .pill.sun { background: #ffc400; color: #2b2240; }
</style>
