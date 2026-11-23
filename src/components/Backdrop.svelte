<script>
  // Living background: drifting toy shapes, floating confetti dust and (on the stage) sweeping light beams.
  // Everything pulses gently to the beat of the music that is playing.
  import { onMount } from 'svelte';
  import { musicBpm } from '../lib/music.js';

  let { stage = false, lite = false } = $props();

  const COLORS = ['#ff3b4f', '#ffc400', '#22c55e', '#0ea5e9', '#8b5cf6', '#ff4fa3', '#f97316'];
  const KINDS = ['dot', 'ring', 'star', 'tri', 'squig', 'plus'];
  // Fixed "random" layout so it doesn't jump around between renders.
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const shapes = Array.from({ length: lite ? 7 : 14 }, (_, i) => ({
    k: KINDS[i % KINDS.length],
    c: COLORS[(i * 3) % COLORS.length],
    x: Math.round(rnd() * 96),
    y: Math.round(rnd() * 92),
    sz: Math.round(26 + rnd() * (lite ? 30 : 54)),
    dur: Math.round(18 + rnd() * 22),
    del: -Math.round(rnd() * 30),
    rot: Math.round(rnd() * 360)
  }));
  const dust = Array.from({ length: lite ? 10 : 26 }, (_, i) => ({
    c: COLORS[i % COLORS.length],
    x: Math.round(rnd() * 100),
    dur: Math.round(14 + rnd() * 18),
    del: -Math.round(rnd() * 30),
    sz: Math.round(4 + rnd() * 7),
    sway: Math.round(20 + rnd() * 50)
  }));

  let beat = $state(0); // seconds per beat, 0 = no music
  onMount(() => {
    const read = () => { const b = musicBpm(); beat = b ? 60 / b : 0; };
    read();
    const t = setInterval(read, 1200);
    return () => clearInterval(t);
  });
</script>

<div class="backdrop" class:stage class:pulse={beat > 0} style="--beat:{beat || 1}s" aria-hidden="true">
  {#if stage}
    <div class="beams"><span></span><span></span><span></span></div>
  {/if}
  {#each shapes as sh}
    <div class="drift" style="left:{sh.x}%; top:{sh.y}%; --dur:{sh.dur}s; animation-delay:{sh.del}s">
      <div class="shape {sh.k}" style="--c:{sh.c}; --sz:{sh.sz}px; --rot:{sh.rot}deg"></div>
    </div>
  {/each}
  {#each dust as d}
    <span class="dust" style="left:{d.x}%; --c:{d.c}; --sz:{d.sz}px; --dur:{d.dur}s; --sway:{d.sway}px; animation-delay:{d.del}s"></span>
  {/each}
</div>

<style>
  .backdrop { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
  .drift { position: absolute; animation: drift var(--dur) ease-in-out infinite alternate; }
  @keyframes drift {
    0% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(calc(4 * var(--vw)), calc(-3 * var(--vh))) rotate(40deg); }
    100% { transform: translate(calc(-3 * var(--vw)), calc(4 * var(--vh))) rotate(-30deg); }
  }
  .shape { width: var(--sz); height: var(--sz); opacity: 0.16; transform: rotate(var(--rot)); }
  .stage .shape { opacity: 0.2; }
  .pulse .shape { animation: thump var(--beat) ease-out infinite; }
  @keyframes thump { 0% { scale: 1.12; } 40%, 100% { scale: 1; } }

  .dot { background: var(--c); border-radius: 50%; }
  .ring { border: calc(var(--sz) * 0.18) solid var(--c); border-radius: 50%; }
  .star { background: var(--c); clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
  .tri { background: var(--c); clip-path: polygon(50% 6%, 96% 90%, 4% 90%); border-radius: 20%; }
  .plus { background: var(--c); clip-path: polygon(36% 0, 64% 0, 64% 36%, 100% 36%, 100% 64%, 64% 64%, 64% 100%, 36% 100%, 36% 64%, 0 64%, 0 36%, 36% 36%); }
  .squig {
    height: calc(var(--sz) * 0.45); border-radius: 999px;
    background: radial-gradient(circle at 50% 120%, transparent 38%, var(--c) 39% 60%, transparent 61%) 0 0 / 33.4% 100% repeat-x;
  }

  .dust {
    position: absolute; bottom: -20px; width: var(--sz); height: var(--sz); border-radius: 3px; background: var(--c); opacity: 0;
    animation: rise var(--dur) linear infinite;
  }
  @keyframes rise {
    0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
    10% { opacity: 0.45; }
    50% { transform: translate(var(--sway), calc(-55 * var(--vh))) rotate(260deg); }
    90% { opacity: 0.35; }
    100% { transform: translate(calc(var(--sway) * -0.5), calc(-112 * var(--vh))) rotate(520deg); opacity: 0; }
  }

  .beams { position: absolute; inset: 0; }
  .beams span {
    position: absolute; top: -20%; width: calc(34 * var(--vw)); height: 140%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 75%);
    clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%);
    transform-origin: 50% 0; filter: blur(6px);
  }
  .beams span:nth-child(1) { left: 2%; animation: sweep 7s ease-in-out infinite alternate; }
  .beams span:nth-child(2) { left: 33%; animation: sweep 9s ease-in-out infinite alternate-reverse; opacity: 0.7; }
  .beams span:nth-child(3) { right: 2%; animation: sweep 6s ease-in-out infinite alternate; animation-delay: -2s; }
  .pulse .beams { animation: glow calc(var(--beat) * 2) ease-in-out infinite; }
  @keyframes glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.75; } }
  @keyframes sweep { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }

  @media (prefers-reduced-motion: reduce) {
    .drift, .shape, .dust, .beams, .beams span { animation: none !important; }
    .dust { display: none; }
  }
</style>
