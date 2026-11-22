<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import StepFlow from '../../components/StepFlow.svelte';
  import { MODES } from '../../lib/modes.js';
  import { T, POINTS, ITEMS, layoutOf, cellOf, itemsOf } from '../../engine/tour.js';

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
    shop: { icon: '🛒', label: `Shop −${POINTS.shop}`, c: '#0ea5e9', fg: '#ffffff' }
  };
  const fresh = (f) => f && now - f.at < 3000;
  const look = (sp) => (sp.k === 'mode' ? { icon: MODES[sp.m].icon, label: MODES[sp.m].name, c: MODES[sp.m].color, fg: '#fff' } : SPACE[sp.k]);
  const at = (i) => units.filter((u) => (t.pos[u.id] || 0) === i);
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
</script>

{#if t}
  <section class="main">
    <div class="board" style="--cols:{layout.c}; --rows:{layout.r}">
      {#each t.board as sp, i (i)}
        {@const L = look(sp)}
        {@const [r, c] = cellOf(i, layout)}
        <div class="space" class:hot={ev && ev.to === i} class:pickme={s.phase === 'tpick' && i === pickIdx}
          style="grid-row:{r}; grid-column:{c}; --c:{L.c}; --fg:{L.fg}">
          <span class="si">{L.icon}</span>
          <span class="sl">{L.label}</span>
          <div class="tokens">
            {#each at(i) as u (u.id)}
              <span class="tok" class:moving={mover?.id === u.id}><Avatar src={avatars[u.id]} color={u.color} name={u.name} size={30} /></span>
            {/each}
          </div>
        </div>
      {/each}

      <div class="center" style="grid-row:2 / {layout.r}; grid-column:2 / {layout.c}">
        <div class="qhead">
          <span class="chip" style="--c:#22c55e; --cd:#15803d">🗺️ Party Tour</span>
          <span class="chip sun">Round {t.round} of {t.rounds}</span>
          {#if t.round === 1 && s.phase === 'troll'}<span class="chip" style="--c:#6d5bd0; --cd:#4c3ba8">🗺️ {layout.name}</span>{/if}
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
      </div>
    </div>
  </section>
{/if}

<style>
  .main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 0.3rem 1.5rem 0.6rem 150px; /* room for Lewis on the left */ width: 100%; position: relative; z-index: 1; }
  .board {
    display: grid; grid-template-columns: repeat(var(--cols), 1fr); grid-template-rows: repeat(var(--rows), 1fr); gap: 0.55rem;
    width: min(100%, 1500px); height: min(72vh, 760px);
  }
  .space {
    position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.1rem;
    background: var(--c); color: var(--fg); border-radius: 18px; padding: 0.3rem; text-align: center; min-width: 0;
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.22), 0 12px 24px -8px rgba(0, 0, 0, 0.5); transition: transform 0.25s;
  }
  .space.hot, .space.pickme { transform: translateY(-6px) scale(1.06); box-shadow: 0 0 0 4px #fff, 0 0 30px var(--c), 0 8px 0 rgba(0, 0, 0, 0.22); z-index: 2; }
  .si { font-size: clamp(1.3rem, 2.2vw, 2.1rem); line-height: 1; }
  .sl { font-weight: 900; font-size: clamp(0.6rem, 0.85vw, 0.85rem); line-height: 1.05; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tokens { position: absolute; bottom: -10px; left: 0; right: 0; display: flex; justify-content: center; flex-wrap: wrap; gap: 0; }
  .tok { margin: 0 -4px; transition: transform 0.3s; }
  .tok.moving { transform: translateY(-8px) scale(1.25); z-index: 3; }
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
  .res { display: flex; align-items: center; gap: 0.7rem; background: var(--surface); border-radius: 999px; padding: 0.25rem 0.9rem 0.25rem 0.3rem; }
  .rn { font-weight: 900; flex: 1; }
  .rm { opacity: 0.75; font-weight: 800; }
  .pill.ok { background: var(--green); color: #fff; }
  .pill.bad { background: #ff3b4f; color: #fff; }
  .pill.sun { background: #ffc400; color: #2b2240; }
</style>
