<script>
  // Shared live drawing. Strokes are sent in small chunks while drawing, so everyone
  // watching the same path (teammates, the big screen) sees them appear live.
  // Used for team pictures and for Doodle Dash.
  import { onMount, onDestroy } from 'svelte';
  import { drawStroke } from '../engine/util.js';

  let { db, path, color = '#888', readOnly = false, fill = false } = $props();

  const COLORS = ['#2b2240', '#ff3b4f', '#ffb400', '#22c55e', '#2f8cff', '#a855f7', '#8b5a2b', '#ffffff'];
  const SIZE = 320;

  let canvas;
  let ctx;
  let pen = $state(COLORS[0]);
  let width = $state(10);
  let drawing = false;
  let buf = [];
  let lastSent = null;
  let flushTimer = null;
  const unsubs = [];

  function clearCanvas() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    clearCanvas();
    let v = null;
    unsubs.push(db.onValue(`${path}/v`, (val) => {
      if (v !== null && val !== v) clearCanvas();
      v = val;
    }));
    unsubs.push(db.onChildAdded(`${path}/s`, (_k, st) => st && drawStroke(ctx, st, SIZE)));
  });
  onDestroy(() => { unsubs.forEach((u) => u && u()); clearInterval(flushTimer); });

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000);
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000);
    return [Math.max(0, Math.min(1000, x)), Math.max(0, Math.min(1000, y))];
  }

  function flush() {
    if (buf.length < 2) return;
    const st = { c: pen, w: width, p: lastSent ? [...lastSent, ...buf] : [...buf] };
    lastSent = buf.slice(-2);
    buf = [];
    db.push(`${path}/s`, st);
  }

  function down(e) {
    if (readOnly) return;
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    lastSent = null;
    buf = pos(e);
    drawStroke(ctx, { c: pen, w: width, p: buf }, SIZE);
    flushTimer = setInterval(flush, 120);
  }
  function move(e) {
    if (!drawing) return;
    const p = pos(e);
    const prev = buf.length ? buf.slice(-2) : lastSent;
    if (prev) drawStroke(ctx, { c: pen, w: width, p: [...prev, ...p] }, SIZE);
    buf.push(...p);
  }
  function up() {
    if (!drawing) return;
    drawing = false;
    clearInterval(flushTimer);
    if (buf.length === 2 && !lastSent) db.push(`${path}/s`, { c: pen, w: width, p: buf });
    else flush();
    buf = [];
    lastSent = null;
  }

  async function wipe() {
    await db.remove(`${path}/s`);
    await db.set(`${path}/v`, Date.now());
  }
</script>

<div class="lc" class:ro={readOnly} class:fill>
  <div class="frame" style="--c:{color}">
    <canvas
      bind:this={canvas}
      data-nofit={readOnly ? undefined : true}
      width={SIZE}
      height={SIZE}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
    ></canvas>
  </div>
  {#if !readOnly}
    <div class="colors card">
      {#each COLORS as c}
        <button class="swatch" class:on={pen === c} style="background:{c}" aria-label="color {c}" onclick={() => (pen = c)}></button>
      {/each}
    </div>
    <div class="tools">
      {#each [5, 10, 20] as w}
        <button class="icon-btn" class:on={width === w} onclick={() => (width = w)} aria-label="brush {w}">
          <span class="dot" style="width:{w}px;height:{w}px"></span>
        </button>
      {/each}
      <button class="btn ghost small" onclick={wipe}>🧽 Clear</button>
    </div>
  {/if}
</div>

<style>
  .lc { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; width: 100%; }
  .frame {
    padding: 8px;
    border-radius: 30px;
    background: var(--c);
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--c) 70%, transparent), 0 14px 26px rgba(0, 0, 0, 0.3);
  }
  canvas {
    display: block;
    width: min(calc(80 * var(--vw)), 330px, calc(calc(100 * var(--dvh)) - 400px)); min-width: 200px; aspect-ratio: 1; background: #fff;
    border-radius: 22px; touch-action: none;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.2);
  }
  .ro canvas { width: 100%; }
  .fill .frame { width: 100%; }
  .colors { display: flex; gap: 0.45rem; flex-wrap: wrap; justify-content: center; padding: 0.55rem 0.8rem; border-radius: 999px; }
  .swatch { width: min(32px, calc(7.4 * var(--vw))); height: min(32px, calc(7.4 * var(--vw))); border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.7); box-shadow: 0 3px 0 rgba(0, 0, 0, 0.3); transition: transform 0.1s; }
  .swatch.on { transform: scale(1.22) translateY(-2px); box-shadow: 0 0 0 3px var(--ring), 0 4px 0 rgba(0, 0, 0, 0.3); }
  .tools { display: flex; gap: 0.5rem; align-items: center; }
  .icon-btn.on { box-shadow: 0 0 0 3px var(--ring), 0 6px 16px -6px rgba(0, 0, 0, 0.5); }
  .dot { background: var(--ink); border-radius: 50%; display: block; }
</style>
