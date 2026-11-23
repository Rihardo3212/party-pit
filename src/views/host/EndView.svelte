<script>
  import Avatar from '../../components/Avatar.svelte';
  import Pie from '../../components/Pie.svelte';
  import AwardCards from '../../components/AwardCards.svelte';
  import { MODES } from '../../lib/modes.js';
  import { AWARDS_AT, REVEAL_AT } from '../../lib/awards.js';

  let { s, avatars } = $props();
  const U = (id) => (id && s.units[id] ? { id, ...s.units[id] } : null);
  const ctrlName = $derived(s.mode === 'host' ? s.hostName : s.players[s.vip]?.name);
  const hasAwards = $derived((s.results.awards || []).length > 0);
  // Drum roll: "And the winner is…" holds the stage until the podium pops in.
  let suspense = $state(true);
  $effect(() => { const t = setTimeout(() => (suspense = false), REVEAL_AT); return () => clearTimeout(t); });
</script>

<section class="main">
  {#if suspense}
    <div class="suspense" aria-hidden="true"><span class="drum">🥁</span><h2>And the winner is…</h2></div>
  {/if}
  <div class="sticker modename">{MODES[s.settings.game].icon} {MODES[s.settings.game].name}</div>
  <h1 class="win-title pop-in" style="animation-delay:{REVEAL_AT}ms">
    {#if s.results.winners.length > 1}It's a tie!{:else}{U(s.results.winners[0])?.name} {s.teamMode ? 'win' : 'wins'}!{/if}
  </h1>
  <div class="podium">
    {#each s.results.ranked as id, i (id)}
      {@const u = U(id)}
      {@const won = s.results.winners.includes(id)}
      <div class="place card pop-in" class:won style="animation-delay:{REVEAL_AT + 300 + i * 180}ms">
        {#if won}<div class="trophy">🏆</div>{:else}<div class="rank">#{i + 1}</div>{/if}
        <Avatar src={avatars[id]} color={u.color} name={u.name} size={won ? (hasAwards ? 120 : 150) : hasAwards ? 80 : 96} />
        <div class="pname">{u.name}</div>
        {#if s.teamMode}<div class="mem muted">{u.members.map((m) => s.players[m]?.name).join(', ')}</div>{/if}
        {#if s.settings.game === 'wedge'}<Pie wedges={u.wedges} size={won ? 70 : 52} />{/if}
        <div class="score">{u.score}</div>
      </div>
    {/each}
  </div>
  <AwardCards {s} {avatars} delay={AWARDS_AT(s)} />
  <p class="muted pop-in" style="animation-delay:{REVEAL_AT + 600}ms">{ctrlName} can start a new round from their phone.</p>
</section>

<style>
  .main { flex: 1; display: flex; flex-direction: column; gap: 1.2rem; align-items: center; justify-content: center; text-align: center; padding: 1rem 2rem; }
  .main { position: relative; }
  .modename { font-size: 1.3rem; }
  .suspense { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 0.6rem; pointer-events: none; }
  .suspense h2 { font-size: clamp(2.2rem, 4.5vw, 3.6rem); animation: throb 0.3s ease-in-out infinite alternate; }
  .drum { font-size: 5rem; animation: hop 0.18s ease-in-out infinite alternate; }
  @media (prefers-reduced-motion: reduce) { .suspense h2, .drum { animation: none; } }
  .win-title {
    font-size: clamp(3rem, 6.5vw, 5.4rem); color: var(--sun);
    text-shadow: 0 3px 0 #ff8a00, 0 6px 0 #d96800, 0 10px 30px -8px rgba(224, 33, 58, 0.6), 0 14px 22px rgba(0, 0, 0, 0.35);
  }
  .podium { display: flex; gap: 1.6rem; align-items: flex-end; justify-content: center; flex-wrap: wrap; }
  .place { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 1.1rem 1.6rem; }
  .place.won { box-shadow: 0 0 0 6px var(--sun), var(--shadow); }
  .pname { font-family: var(--font-display); font-size: 1.6rem; }
  .mem { font-size: 0.9rem; max-width: 220px; }
  .rank { font-family: var(--font-display); font-size: 2rem; color: var(--muted); }
  .trophy { font-size: 3.2rem; animation: hop 0.8s ease-in-out infinite alternate; filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.3)); }
  @keyframes hop { to { transform: translateY(-8px) rotate(8deg); } }
  .score {
    font-family: var(--font-display); font-size: 1.8rem; color: #3a2a00;
    background: var(--sun); border-radius: 999px; padding: 0.05rem 1.2rem 0.15rem;
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--sun) 70%, transparent);
  }
</style>
