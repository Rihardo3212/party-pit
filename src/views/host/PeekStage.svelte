<script>
  // Pixel Peek on the big screen: the photo zooms out and gets sharper over time.
  import { onMount } from 'svelte';
  import BuzzPickPanel from '../../components/BuzzPickPanel.svelte';
  import { T, peekPlace } from '../../engine/peek.js';
  import { photoUrl } from '../../engine/pindrop.js';

  let { s, avatars, now } = $props();
  const r = $derived(s.peek);
  const PH = { play: 'xplay', answer: 'xanswer', reveal: 'xreveal' };
  const place = $derived(r ? peekPlace(r.id) : null);

  let canvas = $state();
  let img = null;
  let imgFor = null;
  let ready = $state(false);
  // Smooth animation between "now" updates: remember the offset between game time and this clock.
  let offset = 0;
  $effect(() => { offset = now - performance.now(); });

  $effect(() => {
    if (!r || imgFor === r.id) return;
    imgFor = r.id;
    ready = false;
    const im = new Image();
    im.onload = () => { img = im; ready = true; };
    im.src = photoUrl(r.id);
  });

  // 0 = fully zoomed in and blocky, 1 = the whole photo, sharp.
  function progress(t) {
    if (!r) return 0;
    if (s.phase === PH.reveal) return 1;
    const el = s.phase === PH.answer ? r.elapsed : t - r.startAt;
    return Math.min(1, Math.max(0, el / T.play));
  }

  const small = document.createElement('canvas');
  function draw() {
    if (!canvas || !img || !ready || !r) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const p = progress(performance.now() + offset);
    const zoom = 1 + 5 * Math.pow(1 - p, 1.6);
    const cell = s.phase === PH.reveal ? 1 : Math.max(1, Math.round(1 + 44 * Math.pow(1 - p, 2)));
    // Crop: cover the canvas, then zoom in around (fx, fy).
    const scale = Math.max(W / img.width, H / img.height) * zoom;
    const cw = W / scale, ch = H / scale;
    const cx = Math.min(img.width - cw / 2, Math.max(cw / 2, r.fx * img.width));
    const cy = Math.min(img.height - ch / 2, Math.max(ch / 2, r.fy * img.height));
    const sw = Math.max(1, Math.round(W / cell)), sh = Math.max(1, Math.round(H / cell));
    small.width = sw; small.height = sh;
    const sc = small.getContext('2d');
    sc.imageSmoothingEnabled = true;
    sc.drawImage(img, cx - cw / 2, cy - ch / 2, cw, ch, 0, 0, sw, sh);
    ctx.imageSmoothingEnabled = cell <= 1;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(small, 0, 0, sw, sh, 0, 0, W, H);
  }

  onMount(() => {
    let raf;
    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
</script>

{#if r}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#0ea5e9; --cd:#0369a1">🔍 Pixel Peek</span>
      <span class="chip sun">Photo {r.round} of {r.rounds}</span>
    </div>
    <div class="frame pop-in">
      <canvas bind:this={canvas} width="960" height="540"></canvas>
      {#if !ready}<div class="loading">📷</div>{/if}
      {#if s.phase === PH.reveal && place}
        <div class="cap pop-in"><b>{place.name}</b> · {place.where}<span class="credit">📷 {place.credit}</span></div>
      {/if}
    </div>
    <BuzzPickPanel {s} {r} {avatars} {now} {PH} {T} />
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 0.9rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .frame { position: relative; width: min(100%, 860px); aspect-ratio: 16 / 9; border-radius: 26px; overflow: hidden; background: #000; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5); }
  canvas { width: 100%; height: 100%; display: block; }
  .loading { position: absolute; inset: 0; display: grid; place-items: center; font-size: 4rem; }
  .cap {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 0.7rem 1.2rem; color: #fff; font-size: 1.3rem;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8)); display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap;
  }
  .cap b { font-family: var(--font-display); font-size: 1.8rem; }
  .credit { margin-left: auto; font-size: 0.75rem; opacity: 0.8; }
</style>
