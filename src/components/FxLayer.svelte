<script>
  // Full-screen effects for the big screen: confetti, stamps and floating reactions.
  import { onMount, onDestroy } from 'svelte';
  import { onFx } from '../lib/fx.js';

  const COLORS = ['#ff3c28', '#0ab9e6', '#ffc400', '#22c55e', '#a855f7', '#ff6fb5', '#ffffff'];

  let canvas;
  let parts = [];
  let raf = null;
  let stamps = $state([]);
  let floats = $state([]);
  let uid = 0;
  let off;

  // Confetti: a light shower of paper that flutters down from the top (fewer pieces, softer motion).
  function confetti(amount, colors) {
    const w = canvas.width, h = canvas.height;
    const n = Math.min(110, Math.round(amount * 0.45));
    const k = h / 900;
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * w,
        y: -20 - Math.random() * h * 0.5, // staggered, so it keeps falling for a moment
        vx: (Math.random() - 0.5) * 1.2 * k,
        vy: (1.5 + Math.random() * 2) * k,
        sway: 0.6 + Math.random() * 1.4,
        ph: Math.random() * Math.PI * 2,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.12,
        s: (8 + Math.random() * 7) * Math.max(0.7, k),
        round: Math.random() < 0.25,
        c: (colors || COLORS)[Math.floor(Math.random() * (colors || COLORS).length)],
        life: 0
      });
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const k = canvas.height / 900;
    parts = parts.filter((p) => p.y < canvas.height + 30 && p.life < 900);
    for (const p of parts) {
      p.life++;
      p.vy = Math.min(p.vy + 0.03 * k, 3.6 * k); // gentle, like paper in the air
      p.x += p.vx + Math.sin(p.ph + p.life / 22) * p.sway * k;
      p.y += p.vy;
      p.r += p.vr;
      const flip = Math.cos(p.ph + p.life / 9); // the piece turns over as it falls
      ctx.save();
      ctx.globalAlpha = Math.min(1, (canvas.height + 30 - p.y) / 120);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.round) {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s * 0.35, p.s * 0.35 * Math.abs(flip) + 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.s / 2, (-p.s / 3) * Math.abs(flip), p.s, (p.s / 1.5) * Math.abs(flip) + 0.5);
      }
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(frame) : null;
    if (!raf) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
    off = onFx((e) => {
      if (e.type === 'confetti') confetti(e.amount, e.colors);
      if (e.type === 'stamp') {
        const id = ++uid;
        stamps = [{ id, ...e, rot: (Math.random() * 14 - 7).toFixed(1) }]; // newest stamp replaces the old one
        setTimeout(() => (stamps = stamps.filter((s) => s.id !== id)), 1500);
      }
      if (e.type === 'react') {
        const id = ++uid;
        floats = [...floats, { id, e: e.e, color: e.color, x: 8 + Math.random() * 84, d: (Math.random() * 1.2 + 2.6).toFixed(2), sway: (Math.random() * 60 - 30).toFixed(0) }];
        setTimeout(() => (floats = floats.filter((f) => f.id !== id)), 4200);
      }
    });
  });
  onDestroy(() => {
    off?.();
    window.removeEventListener('resize', resize);
    if (raf) cancelAnimationFrame(raf);
  });
</script>

<div class="fx">
  <canvas bind:this={canvas}></canvas>
  {#each stamps as s (s.id)}
    <div class="stamp" style="--c:{s.color}; --rot:{s.rot}deg">
      <span class="txt">{s.text}</span>
      {#if s.sub}<span class="sub">{s.sub}</span>{/if}
    </div>
  {/each}
  {#each floats as f (f.id)}
    <div class="float" style="left:{f.x}%; --d:{f.d}s; --sway:{f.sway}px; --c:{f.color}">
      <div class="wig"><span>{f.e}</span></div>
    </div>
  {/each}
</div>

<style>
  .fx { position: fixed; inset: 0; pointer-events: none; z-index: 50; overflow: hidden; }
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  .stamp {
    position: absolute; left: 50%; top: 42%;
    display: flex; flex-direction: column; align-items: center;
    transform: translate(-50%, -50%) rotate(var(--rot));
    animation: stamp 1.5s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  .txt {
    font-family: var(--font-display);
    font-size: clamp(4rem, 10vw, 9rem);
    color: #fff;
    background: var(--c);
    padding: 0.08em 0.5em 0.14em;
    border-radius: 0.32em;
    border: 0.07em solid #fff;
    text-shadow: 0 0.05em 0 rgba(0, 0, 0, 0.3);
    box-shadow: inset 0 0.05em 0 rgba(255, 255, 255, 0.4), 0 0.09em 0 color-mix(in srgb, var(--c) 50%, #000), 0 0.2em 0.6em rgba(0, 0, 0, 0.4);
    line-height: 1;
    white-space: nowrap;
  }
  .sub {
    margin-top: 0.7rem; font-family: var(--font-display); font-size: 2.1rem; color: #2b2240;
    background: #fff; padding: 0.1em 0.9em; border-radius: 16px; transform: rotate(2deg);
    box-shadow: 0 5px 0 rgba(0, 0, 0, 0.25);
  }
  @keyframes stamp {
    0% { transform: translate(-50%, -50%) rotate(var(--rot)) scale(3); opacity: 0; }
    18% { transform: translate(-50%, -50%) rotate(var(--rot)) scale(0.92); opacity: 1; }
    26% { transform: translate(-50%, -50%) rotate(var(--rot)) scale(1.04); }
    80% { transform: translate(-50%, -50%) rotate(var(--rot)) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) rotate(var(--rot)) scale(1.1); opacity: 0; }
  }
  /* Reactions: the emoji bubbles up from the bottom with a soft glow in the player's color,
     swaying gently like a balloon, then fades out. */
  .float {
    position: absolute; bottom: 40px;
    animation: rise var(--d) cubic-bezier(0.25, 0.6, 0.35, 1) forwards;
  }
  .wig { animation: wig 1.6s ease-in-out infinite alternate; }
  .float span {
    display: block; font-size: 64px; line-height: 1;
    filter: drop-shadow(0 0 14px var(--c)) drop-shadow(0 4px 0 rgba(0, 0, 0, 0.25));
    animation: popin 0.45s cubic-bezier(0.2, 1.8, 0.4, 1) both;
  }
  @keyframes popin { from { transform: scale(0.2); } to { transform: scale(1); } }
  @keyframes wig { from { transform: translateX(calc(var(--sway) * -0.4)) rotate(-10deg); } to { transform: translateX(calc(var(--sway) * 0.4)) rotate(10deg); } }
  @keyframes rise {
    0% { transform: translateY(0); opacity: 0; }
    8% { opacity: 1; }
    70% { opacity: 1; }
    100% { transform: translateY(-58vh); opacity: 0; }
  }
</style>
