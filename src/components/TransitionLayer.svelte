<script>
  // Big moments on the big screen:
  //  - a diagonal color wipe (mode color + icon) for a new game or a new round
  //  - stage curtains that close and open again for the final results
  import { untrack } from 'svelte';
  import { MODES } from '../lib/modes.js';
  import { reduced } from '../lib/motion.js';
  import { sfx } from '../lib/sound.js';

  let { s } = $props();

  let show = $state(null); // { kind, id, color, icon, title, sub, big }
  let seq = 0;
  let timer = null;

  function play(x) {
    if (reduced()) return;
    clearTimeout(timer);
    show = { ...x, id: ++seq };
    timer = setTimeout(() => (show = null), x.kind === 'curtain' ? 2900 : x.big ? 1500 : 1050);
    try { sfx.whoosh(); } catch { /* sound is optional */ }
  }

  // The round counter of the mode on screen (or of the Party Tour board).
  function roundOf(st) {
    const sub = st.settings.sub;
    const game = sub || st.settings.game;
    if (!sub && (game === 'tour' || game === 'mix')) return st.tour?.round || 0;
    for (const v of Object.values(st)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && v !== st.tour && typeof v.round === 'number' && typeof v.rounds === 'number') return v.round;
    }
    return 0;
  }

  let prev = null;
  $effect(() => {
    const st = s;
    if (!st) return;
    const now = { phase: st.phase, sub: st.settings.sub || null, game: st.settings.game, round: roundOf(st), tourRound: st.tour?.round || 0 };
    untrack(() => {
      const a = prev;
      prev = now;
      if (!a) return;
      if (now.phase === 'end' && a.phase !== 'end') {
        play({ kind: 'curtain' });
        return;
      }
      if (now.phase === 'intro' && a.phase !== 'intro') {
        const m = MODES[now.game];
        if (m) play({ kind: 'wipe', big: true, color: m.color, icon: m.icon, title: m.name, sub: m.tagline });
        return;
      }
      if (['lobby', 'teamdraw', 'intro', 'end'].includes(now.phase)) return;
      // A Party Tour / Quick Party mini game begins.
      if (now.sub && now.sub !== a.sub) {
        const m = MODES[now.sub];
        if (m) play({ kind: 'wipe', big: true, color: m.color, icon: m.icon, title: m.name, sub: 'Mini game!' });
        return;
      }
      // Back on the Party Tour board for a new round.
      if (!now.sub && a.sub && (now.game === 'tour' || now.game === 'mix')) return;
      if (!now.sub && (now.game === 'tour' || now.game === 'mix') && now.tourRound > a.tourRound && now.tourRound > 1) {
        const m = MODES[now.game];
        play({ kind: 'wipe', color: m.color, icon: m.icon, title: `${now.game === 'mix' ? 'Game' : 'Round'} ${now.tourRound}` });
        return;
      }
      // A new round inside a mode.
      if (now.sub === a.sub && now.round > a.round && now.round > 1) {
        const m = MODES[now.sub || now.game];
        if (m) play({ kind: 'wipe', color: m.color, icon: m.icon, title: `Round ${now.round}` });
      }
    });
  });
</script>

{#if show}
  {#key show.id}
    {#if show.kind === 'wipe'}
      <div class="wipe" class:big={show.big} style="--c:{show.color}" aria-hidden="true">
        <div class="band b1"></div>
        <div class="band b2"></div>
        <div class="band b3">
          <div class="label">
            <span class="ic">{show.icon}</span>
            <span class="tt">{show.title}</span>
            {#if show.sub}<span class="st">{show.sub}</span>{/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="curtains" aria-hidden="true">
        <div class="cur left"></div>
        <div class="cur right"></div>
        <div class="valance"></div>
        <div class="ctitle"><span class="drum">🥁</span>And the winner is…</div>
      </div>
    {/if}
  {/key}
{/if}

<style>
  .wipe { position: fixed; inset: 0; z-index: 60; pointer-events: none; overflow: hidden; --d: 1.05s; }
  .wipe.big { --d: 1.5s; }
  .band {
    position: absolute; top: -20%; bottom: -20%; left: -40%; width: 180%;
    transform: skewX(-14deg) translateX(-110%);
    animation: wipe var(--d) cubic-bezier(0.7, 0, 0.3, 1) both;
  }
  .b1 { background: color-mix(in srgb, var(--c) 55%, #fff); animation-delay: 0s; }
  .b2 { background: color-mix(in srgb, var(--c) 70%, #000); animation-delay: 0.05s; }
  .b3 { background: var(--c); animation-delay: 0.1s; display: grid; place-items: center; }
  @keyframes wipe {
    0% { transform: skewX(-14deg) translateX(-110%); }
    34%, 64% { transform: skewX(-14deg) translateX(0); }
    100% { transform: skewX(-14deg) translateX(110%); }
  }
  .label {
    transform: skewX(14deg); display: flex; flex-direction: column; align-items: center; color: #fff; text-align: center;
    animation: label var(--d) cubic-bezier(0.2, 1.6, 0.4, 1) both; animation-delay: 0.1s;
  }
  @keyframes label {
    0%, 22% { transform: skewX(14deg) scale(0.3) rotate(-8deg); opacity: 0; }
    40% { transform: skewX(14deg) scale(1.08) rotate(2deg); opacity: 1; }
    52%, 64% { transform: skewX(14deg) scale(1) rotate(0); opacity: 1; }
    80%, 100% { transform: skewX(14deg) scale(1.2); opacity: 0; }
  }
  .ic { font-size: clamp(4rem, calc(11 * var(--vw)), 9rem); line-height: 1; filter: drop-shadow(0 10px 0 rgba(0, 0, 0, 0.2)); }
  .tt { font-family: var(--font-display); font-size: clamp(2.6rem, calc(7 * var(--vw)), 6rem); line-height: 1; text-shadow: 0 6px 0 rgba(0, 0, 0, 0.2); }
  .st { font-weight: 900; font-size: clamp(1rem, calc(2 * var(--vw)), 1.6rem); opacity: 0.9; margin-top: 0.4rem; }
  .wipe:not(.big) .ic { font-size: clamp(3rem, calc(7 * var(--vw)), 6rem); }
  .wipe:not(.big) .tt { font-size: clamp(2rem, calc(5 * var(--vw)), 4.4rem); }

  .drum { display: block; text-align: center; font-size: 1.3em; animation: drum 0.12s ease-in-out infinite alternate; }
  @keyframes drum { from { transform: rotate(-8deg) translateY(0); } to { transform: rotate(8deg) translateY(-6px); } }
  .curtains { position: fixed; inset: 0; z-index: 60; pointer-events: none; overflow: hidden; }
  .cur {
    position: absolute; top: 0; bottom: 0; width: 52%;
    background:
      repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.28) 0 calc(2.2 * var(--vw)), rgba(255, 255, 255, 0.06) calc(2.2 * var(--vw)) calc(3.2 * var(--vw)), rgba(0, 0, 0, 0) calc(3.2 * var(--vw)) calc(5.4 * var(--vw))),
      linear-gradient(180deg, #e0213a, #9e0f24);
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.6);
  }
  .left { left: 0; transform-origin: left; animation: cl 2.9s cubic-bezier(0.6, 0, 0.3, 1) both; }
  .right { right: 0; transform-origin: right; animation: cr 2.9s cubic-bezier(0.6, 0, 0.3, 1) both; }
  @keyframes cl { 0% { transform: translateX(-100%); } 16%, 76% { transform: translateX(0); } 100% { transform: translateX(-100%) scaleX(0.6); } }
  @keyframes cr { 0% { transform: translateX(100%); } 16%, 76% { transform: translateX(0); } 100% { transform: translateX(100%) scaleX(0.6); } }
  .valance {
    position: absolute; top: 0; left: 0; right: 0; height: calc(9 * var(--vh));
    background: radial-gradient(circle at 50% 0, #ffd84d 0 30%, transparent 31%) 0 100% / calc(6 * var(--vw)) calc(3 * var(--vh)) repeat-x, linear-gradient(#b80f27, #7d0a1b);
    border-bottom: 6px solid #ffc400; animation: val 2.9s ease both;
  }
  @keyframes val { 0% { transform: translateY(-100%); } 12%, 86% { transform: none; } 100% { transform: translateY(-100%); } }
  .ctitle {
    position: absolute; inset: 0; display: grid; place-items: center; color: #fff;
    font-family: var(--font-display); font-size: clamp(2.4rem, calc(6 * var(--vw)), 5rem); text-shadow: 0 6px 0 rgba(0, 0, 0, 0.35);
    animation: ct 2.9s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  @keyframes ct { 0%, 14% { transform: scale(0.3); opacity: 0; } 24%, 68% { transform: scale(1); opacity: 1; } 76%, 100% { transform: scale(1.3); opacity: 0; } }
</style>
