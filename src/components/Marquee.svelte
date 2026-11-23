<script>
  // Game-show marquee: a plastic frame with chasing light bulbs around the edge.
  let { children, color = '#ffc400', lit = true } = $props();
  // The bulb track is the frame inset by 12px, so its corners are rounded with
  // radius R (36px frame radius - 12px). Straight rows stop where the curve starts,
  // and each corner gets one bulb on the arc so nothing pokes out of the frame.
  const TOP = 20, SIDE = 5, R = 24, C = Math.round(R * (1 - Math.SQRT1_2)); // C ≈ 7px
  const at = (pct, px) => `calc(${pct}% + ${px}px)`;
  const along = (i, n) => [(i / (n - 1)) * 100, R - (i / (n - 1)) * 2 * R]; // R..(100% - R)
  const bulbs = [];
  bulbs.push({ x: at(0, C), y: at(0, C) });
  for (let i = 0; i < TOP; i++) { const [p, o] = along(i, TOP); bulbs.push({ x: at(p, o), y: at(0, 0) }); }
  bulbs.push({ x: at(100, -C), y: at(0, C) });
  for (let i = 0; i < SIDE; i++) { const [p, o] = along(i, SIDE); bulbs.push({ x: at(100, 0), y: at(p, o) }); }
  bulbs.push({ x: at(100, -C), y: at(100, -C) });
  for (let i = TOP - 1; i >= 0; i--) { const [p, o] = along(i, TOP); bulbs.push({ x: at(p, o), y: at(100, 0) }); }
  bulbs.push({ x: at(0, C), y: at(100, -C) });
  for (let i = SIDE - 1; i >= 0; i--) { const [p, o] = along(i, SIDE); bulbs.push({ x: at(0, 0), y: at(p, o) }); }
</script>

<div class="marquee" class:lit style="--b:{color}">
  <div class="lights">
    {#each bulbs as b, i}
      <span class="bulb" class:odd={i % 2} style="left:{b.x}; top:{b.y}"></span>
    {/each}
  </div>
  <div class="inner">{@render children()}</div>
</div>

<style>
  .marquee {
    position: relative;
    padding: 24px;
    border-radius: 36px;
    background: #e0213a;
    box-shadow: 0 10px 30px -8px rgba(224, 33, 58, 0.6), 0 22px 50px rgba(0, 0, 0, 0.5);
    width: 100%;
  }
  .lights { position: absolute; inset: 12px; pointer-events: none; }
  .bulb {
    position: absolute; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px;
    border-radius: 50%; background: #7a1020; box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.4);
  }
  .lit .bulb { animation: chase 0.7s steps(1) infinite; }
  .lit .bulb.odd { animation-delay: 0.35s; }
  @keyframes chase {
    0% { background: radial-gradient(circle at 35% 35%, #fff, var(--b) 60%); box-shadow: 0 0 12px 3px var(--b); }
    50% { background: #7a1020; box-shadow: inset 0 2px 2px rgba(0, 0, 0, 0.4); }
  }
  .inner {
    background: #ffffff;
    color: #2b2240;
    border-radius: 22px;
    position: relative;
    box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.12);
  }
</style>
