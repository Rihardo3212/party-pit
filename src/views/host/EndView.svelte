<script>
  // The end screen: the places pop up one by one from last place, then a drum roll,
  // then the winner rises on the tall middle step with a crown, spotlight and confetti cannons.
  import Avatar from '../../components/Avatar.svelte';
  import Pie from '../../components/Pie.svelte';
  import AwardCards from '../../components/AwardCards.svelte';
  import { MODES } from '../../lib/modes.js';
  import { AWARDS_AT, placeGroups, placeAt, drumAt, revealAt } from '../../lib/awards.js';

  let { s, avatars } = $props();
  const U = (id) => (id && s.units[id] ? { id, ...s.units[id] } : null);
  const ctrlName = $derived(s.mode === 'host' ? s.hostName : s.players[s.vip]?.name);
  const hasAwards = $derived((s.results.awards || []).length > 0);

  const groups = $derived(placeGroups(s));
  // Podium order: 2nd left, 1st in the middle, 3rd right, then the rest.
  const order = $derived([groups[1], groups[0], groups[2], ...groups.slice(3)].filter(Boolean));
  // When each group shows: the winners at revealAt, the others from the bottom up.
  const showAt = (g) => {
    const i = groups.indexOf(g);
    return i === 0 ? revealAt(s) : placeAt(groups.length - 1 - i);
  };
  const STEP_H = { 1: 210, 2: 150, 3: 110 };
  // Toy-block colors per place: face, darker side.
  const BLOCK = { 1: ['#ffc400', '#c98a00'], 2: ['#cfd8ea', '#8e9bb8'], 3: ['#f08a4b', '#b4552a'] };
  const SUFFIX = { 1: 'st', 2: 'nd', 3: 'rd' };

  // A clock from the moment the end screen shows; it drives the step-by-step reveal.
  let t = $state(0);
  $effect(() => {
    const start = performance.now();
    const until = AWARDS_AT(s) + 500;
    const id = setInterval(() => {
      t = performance.now() - start;
      if (t > until) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  });
  const drumming = $derived(t >= drumAt(s) && t < revealAt(s));
  const won = $derived(t >= revealAt(s));
  const tie = $derived(s.results.winners.length > 1);
</script>

<section class="main">
  <div class="sticker modename">{MODES[s.settings.game].icon} {MODES[s.settings.game].name}</div>

  <div class="head">
    {#if won}
      <h1 class="win-title pop-in">
        {#if tie}It's a tie!{:else}{U(s.results.winners[0])?.name} {s.teamMode ? 'win' : 'wins'}!{/if}
      </h1>
    {:else if drumming}
      <h2 class="drum-line"><span class="drum">🥁</span> And the winner is…</h2>
    {:else}
      <h2 class="soon">The results are in…</h2>
    {/if}
  </div>

  <div class="stage" class:side={hasAwards}>
  <div class="podium" class:small={hasAwards}>
    {#each order as g (g.place)}
      {@const top = g.place === 1}
      {@const shown = t >= showAt(g)}
      {@const bc = BLOCK[g.place] || ['#4a3d7a', '#2f2556']}
      <div class="col" class:top class:shown class:low={g.place > 3} style="--h:{STEP_H[g.place] || 60}px; --bc:{bc[0]}; --bd:{bc[1]}">
        <div class="people">
          {#if top && shown}<div class="rays" aria-hidden="true"></div>{/if}
          {#if shown}
            {#each g.ids as id, j (id)}
              {@const u = U(id)}
              <div class="who drop" style="animation-delay:{j * 120}ms">
                {#if top}<div class="crown">👑</div>{/if}
                <Avatar src={avatars[id]} color={u.color} name={u.name} size={top ? (hasAwards ? 116 : 160) : hasAwards ? 78 : 108} />
                <div class="pname">{u.name}</div>
                {#if s.teamMode}<div class="mem muted">{u.members.map((m) => s.players[m]?.name).join(', ')}</div>{/if}
                {#if s.settings.game === 'wedge'}<Pie wedges={u.wedges} size={top ? 64 : 46} />{/if}
                <div class="score">{u.score}</div>
              </div>
            {/each}
          {:else if top}
            <div class="mystery" class:shake={drumming}>?</div>
          {/if}
        </div>
        <div class="step" class:up={shown || top}>
          <span class="num">{g.place}<small>{SUFFIX[g.place] || 'th'}</small></span>
        </div>
      </div>
    {/each}
  </div>

  {#if hasAwards}
    <!-- Awards sit beside the podium (space kept from the start, so the podium never jumps). -->
    <div class="awards-side">
      {#if won}<AwardCards {s} {avatars} column delay={AWARDS_AT(s) - revealAt(s)} />{/if}
    </div>
  {/if}
  </div>
  {#if t >= AWARDS_AT(s)}<p class="muted pop-in hint">{ctrlName} can start a new round from their phone.</p>{/if}
</section>

<style>
  .main { flex: 1; position: relative; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; justify-content: center; text-align: center; padding: 0.4rem 2rem; }
  .modename { font-size: 1.3rem; }
  .head { min-height: 4.5rem; display: grid; place-items: center; }
  .soon { font-size: clamp(1.8rem, calc(3.4 * var(--vw)), 2.8rem); color: var(--muted); }
  .drum-line { font-size: clamp(2.2rem, calc(4.5 * var(--vw)), 3.6rem); display: flex; align-items: center; gap: 0.6rem; animation: throb 0.3s ease-in-out infinite alternate; }
  .drum { display: inline-block; font-size: 1.3em; animation: hop 0.18s ease-in-out infinite alternate; }
  .win-title {
    font-size: clamp(3rem, calc(5.6 * var(--vw)), 5.4rem); color: var(--sun); margin: 0; line-height: 1.05;
    text-shadow: 0 3px 0 #ff8a00, 0 6px 0 #d96800, 0 10px 30px -8px rgba(224, 33, 58, 0.6), 0 14px 22px rgba(0, 0, 0, 0.35);
  }

  /* The podium: toy blocks of different heights. */
  .stage { display: flex; align-items: flex-end; justify-content: center; gap: 2rem; width: 100%; }
  .stage.side .podium { width: auto; }
  .awards-side { width: 290px; flex: none; align-self: center; }
  .podium { position: relative; isolation: isolate; display: flex; align-items: flex-end; justify-content: center; gap: 8px; width: 100%; }
  /* a soft floor shadow so the blocks stand on something */
  .podium::after {
    content: ''; position: absolute; left: 50%; bottom: -16px; width: min(110%, 1100px); height: 34px; transform: translateX(-50%);
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45), transparent 70%); pointer-events: none; z-index: -1;
  }
  .people { padding-inline: 0.5rem; }
  .col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: clamp(170px, calc(16 * var(--vw)), 250px); }
  .col.top { min-width: clamp(190px, calc(18 * var(--vw)), 280px); }
  .top .people { padding-top: 2.5rem; }
  .people { position: relative; display: flex; gap: 0.6rem; justify-content: center; align-items: flex-end; min-height: 4rem; padding-bottom: 0.6rem; }
  .who { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; position: relative; z-index: 1; }
  .pname { font-family: var(--font-display); font-size: 1.45rem; line-height: 1.05; }
  .top .pname { font-size: 2rem; }
  .mem { font-size: 0.85rem; max-width: 200px; }
  .score {
    font-family: var(--font-display); font-size: 1.4rem; color: #3a2a00;
    background: var(--sun); border-radius: 999px; padding: 0.02rem 1rem 0.1rem;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--sun) 70%, transparent);
  }
  .top .score { font-size: 1.9rem; }
  .crown { position: absolute; top: -2.6rem; font-size: 3rem; z-index: 2; animation: crown 0.9s ease-in-out infinite alternate; filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.3)); }
  @keyframes crown { from { transform: translateY(0) rotate(-8deg); } to { transform: translateY(-8px) rotate(8deg); } }

  /* Toy blocks: flat face color with a darker bottom side for depth (no gloss). */
  .step {
    position: relative; width: 100%; height: 0; overflow: hidden;
    border-radius: 18px 18px 10px 10px;
    background: var(--bc);
    box-shadow: inset 0 -12px 0 var(--bd), 0 18px 30px -14px rgba(0, 0, 0, 0.7);
    display: grid; place-items: center; padding-bottom: 12px;
    transition: height 0.6s cubic-bezier(0.25, 1.5, 0.45, 1);
  }
  .step.up { height: var(--h); }
  .top:not(.shown) .step { height: 70px; background: var(--surface-hi); box-shadow: inset 0 -12px 0 color-mix(in srgb, var(--surface-hi) 60%, #000); }
  .top.shown .step { box-shadow: inset 0 -12px 0 var(--bd), 0 0 70px -8px color-mix(in srgb, var(--sun) 75%, transparent); }
  .num { position: relative; font-family: var(--font-display); font-size: 3.4rem; line-height: 1; color: rgba(43, 34, 64, 0.85); }
  .num small { font-size: 0.42em; vertical-align: top; margin-left: 2px; }
  .top.shown .num { font-size: 4.8rem; }
  .top:not(.shown) .num, .low .num { color: rgba(255, 255, 255, 0.75); }
  .low .num { font-size: 2.2rem; }
  /* Sun rays turning slowly behind the winner. */
  .rays {
    position: absolute; left: 50%; top: 55%; width: 460px; height: 460px; margin: -230px 0 0 -230px;
    background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--sun) 40%, transparent) 0 9deg, transparent 9deg 22deg);
    -webkit-mask: radial-gradient(circle, #000 15%, transparent 68%); mask: radial-gradient(circle, #000 15%, transparent 68%);
    border-radius: 50%; pointer-events: none; z-index: -1;
    animation: spin 14s linear infinite, fade-in 0.8s ease both;
  }
  @keyframes spin { to { transform: rotate(1turn); } }
  @keyframes fade-in { from { opacity: 0; } }

  .mystery {
    width: 120px; height: 120px; border-radius: 30px; display: grid; place-items: center;
    font-family: var(--font-display); font-size: 4rem; color: var(--muted);
    background: var(--surface); border: 4px dashed var(--line, rgba(255, 255, 255, 0.18));
  }
  .mystery.shake { animation: wobble 0.12s ease-in-out infinite alternate; color: var(--sun); }
  @keyframes wobble { from { transform: rotate(-5deg) scale(1.02); } to { transform: rotate(5deg) scale(1.06); } }

  .drop { animation: drop 0.7s cubic-bezier(0.25, 1.6, 0.45, 1) both; }
  @keyframes drop { from { transform: translateY(-120px) scale(0.6); opacity: 0; } 60% { opacity: 1; } to { transform: none; opacity: 1; } }
  .top .drop { animation: rise 0.9s cubic-bezier(0.2, 1.7, 0.4, 1) both; }
  @keyframes rise { from { transform: scale(0.2) rotate(-12deg); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes hop { to { transform: translateY(-8px) rotate(8deg); } }

  .podium.small .col { min-width: clamp(140px, calc(13 * var(--vw)), 200px); }
  .podium.small .col.top { min-width: clamp(160px, calc(15 * var(--vw)), 230px); }
  .podium.small .step.up { height: calc(var(--h) * 0.72); }
  .podium.small .top:not(.shown) .step { height: 56px; }
  .podium.small .num { font-size: 2.6rem; }
  .podium.small .top.shown .num { font-size: 3.6rem; }
  .podium.small .low .num { font-size: 1.8rem; }
  .hint { margin: 0; }

  @media (prefers-reduced-motion: reduce) {
    .drum-line, .drum, .crown, .rays, .mystery.shake { animation: none; }
    .drop, .top .drop { animation-duration: 0.01s; }
  }
</style>
