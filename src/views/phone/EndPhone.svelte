<script>
  import ReactBar from '../../components/ReactBar.svelte';
  import { awardInfo } from '../../lib/awards.js';
  let { s, myId, myUnit, unit, send, isCtrl, react } = $props();
  const place = $derived(s.results.ranked.indexOf(myUnit) + 1);
  const won = $derived(s.results.winners.includes(myUnit));
  // Awards for me, or for my team when the mode only counted the team.
  const mine = $derived((s.results.awards || []).filter((a) => a.who === myId || a.who === myUnit).map((a) => awardInfo(a.key)).filter(Boolean));
</script>

<div class="stack center pop-in">
  <div class="bigemoji bounce">{won ? '🏆' : place === 2 ? '🥈' : place === 3 ? '🥉' : '🙃'}</div>
  <h2>{won ? (s.teamMode ? 'Your team wins!' : 'You win!') : `#${place}`}</h2>
  <p class="muted">{unit?.score ?? 0} points</p>
  {#each mine as a (a.key)}
    <div class="badge card" style="--mc:{a.color}"><span class="icon-tile" style="--sz:36px">{a.icon}</span> {a.name}</div>
  {/each}
  {#if isCtrl}
    <button class="btn green big" onclick={() => send('again')}>Play again</button>
  {:else}
    <p class="muted">Waiting for {s.mode === 'host' ? s.hostName : s.players[s.vip]?.name}…</p>
  {/if}
  <ReactBar onReact={react} />
</div>

<style>
  .badge { display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.45rem 1rem 0.45rem 0.55rem; font-family: var(--font-display); font-size: 1.2rem; color: var(--mc); }
</style>
