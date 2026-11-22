<script>
  // Score cards along the bottom: they count up, race into score order, and +points fly up from them.
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { backOut } from 'svelte/easing';
  import Avatar from '../../components/Avatar.svelte';
  import Pie from '../../components/Pie.svelte';
  import CountUp from '../../components/CountUp.svelte';
  import { reduced } from '../../lib/motion.js';

  let { s, avatars, here } = $props();
  const order = $derived(s.unitOrder);
  // Highest score first; ties keep the join order.
  const units = $derived(
    order.map((id, i) => ({ id, i, ...s.units[id] })).sort((a, b) => (b.score || 0) - (a.score || 0) || a.i - b.i)
  );
  const cur = $derived(s.current);
  const unitHere = (u) => (u.members || []).some(here);
  const busy = (uid) => {
    if (s.phase === 'answer') return cur?.buzzUnit === uid;
    if (s.phase === 'board') return s.turn === uid;
    if (s.phase === 'ddraw' || s.phase === 'dchoose') return s.players[s.doodle?.drawer]?.unit === uid;
    return false;
  };

  // Floating "+300" bubbles when a score changes.
  let floats = $state([]);
  let prev = {};
  let fid = 0;
  $effect(() => {
    const next = {};
    for (const u of units) next[u.id] = u.score || 0;
    untrack(() => {
      for (const [id, v] of Object.entries(next)) {
        const d = v - (prev[id] ?? v);
        if (d) {
          const f = { id: ++fid, uid: id, d };
          floats = [...floats, f];
          setTimeout(() => (floats = floats.filter((x) => x.id !== f.id)), 1600);
        }
      }
      prev = next;
    });
  });
  const fdur = reduced() ? 0 : 650;
</script>

<footer class="scores">
  {#each units as u, rank (u.id)}
    <div
      class="sc"
      class:busy={busy(u.id)}
      class:lead={rank === 0 && (u.score || 0) > 0 && units.length > 1}
      class:out={cur?.lockedOut?.[u.id] && (s.phase === 'question' || s.phase === 'answer')}
      style="--c:{u.color}"
      animate:flip={{ duration: fdur, easing: backOut }}
    >
      <span class="bob" style="animation-delay:{-u.i * 0.37}s">
        <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={50} dim={!unitHere(u)} />
      </span>
      <div>
        <div class="sname">{u.name}</div>
        <div class="spts" class:neg={u.score < 0}><CountUp value={u.score || 0} /></div>
      </div>
      {#if (s.settings.sub || s.settings.game) === 'wedge'}<Pie wedges={u.wedges} size={40} />{/if}
      {#each floats.filter((f) => f.uid === u.id) as f (f.id)}
        <span class="float" class:minus={f.d < 0}>{f.d > 0 ? '+' : '−'}{Math.abs(f.d)}</span>
      {/each}
      {#if rank === 0 && (u.score || 0) > 0 && units.length > 1}<span class="crown">👑</span>{/if}
    </div>
  {/each}
</footer>

<style>
  .scores { display: flex; justify-content: center; gap: 0.9rem; flex-wrap: wrap; padding: 0.7rem 1rem 1.2rem; position: relative; z-index: 2; }
  .sc {
    position: relative;
    display: flex; align-items: center; gap: 0.7rem; color: #2b2240;
    background: #ffffff;
    box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.35), 0 10px 18px rgba(0, 0, 0, 0.25);
    /* Rounded rectangle whose corners follow the avatar's (30% of 50px + the padding), so the
       square avatar sits inside the card instead of poking out of a round pill. */
    border-radius: 22px; padding: 7px 1.2rem 10px 7px;
    transition: transform 0.35s cubic-bezier(0.2, 1.6, 0.4, 1), box-shadow 0.25s, opacity 0.25s;
  }
  .sc.busy { transform: translateY(-7px) scale(1.05); box-shadow: 0 0 0 4px var(--c), 0 0 26px var(--c), 0 6px 16px -6px rgba(0, 0, 0, 0.35); }
  .sc.out { opacity: 0.4; }
  .bob { display: inline-block; animation: bob 2.6s ease-in-out infinite; }
  @keyframes bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-4px) rotate(2deg); } }
  .sname { font-weight: 800; font-size: 0.95rem; opacity: 0.7; }
  .spts { font-family: var(--font-display); font-size: 1.5rem; line-height: 1; }
  .spts.neg { color: var(--red); }
  .crown { position: absolute; top: -18px; left: 8px; font-size: 1.4rem; transform: rotate(-14deg); animation: crown 0.6s cubic-bezier(0.2, 1.8, 0.4, 1) both; }
  @keyframes crown { from { transform: translateY(-20px) rotate(-40deg) scale(0.3); opacity: 0; } }
  .float {
    position: absolute; left: 50%; top: -6px; font-family: var(--font-display); font-size: 1.7rem; color: #fff;
    background: var(--green); border-radius: 999px; padding: 0 0.6rem 0.08rem; white-space: nowrap;
    box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.4); pointer-events: none;
    animation: fly 1.6s cubic-bezier(0.2, 1.2, 0.4, 1) both;
  }
  .float.minus { background: var(--red); }
  @keyframes fly {
    0% { transform: translate(-50%, 10px) scale(0.3); opacity: 0; }
    18% { transform: translate(-50%, -34px) scale(1.15); opacity: 1; }
    70% { transform: translate(-50%, -52px) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -76px) scale(0.9); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bob, .float, .crown { animation: none !important; }
  }
</style>
