<script>
  // End-game award cards under the podium (big screen).
  import Avatar from './Avatar.svelte';
  import { awardInfo, AWARD_GAP } from '../lib/awards.js';

  let { s, avatars, delay = 0 } = $props();
  // who is a player id, or a team unit id.
  const whoOf = (id) => {
    const p = s.players[id];
    if (p) return { name: p.name, color: p.color, team: s.teamMode ? s.units[p.unit]?.name : null };
    const u = s.units[id];
    return u ? { name: u.name, color: u.color, team: null } : { name: '?', color: '#888', team: null };
  };
  const list = $derived((s.results?.awards || []).map((a) => ({ ...a, info: awardInfo(a.key), p: whoOf(a.who) })).filter((a) => a.info));
</script>

{#if list.length}
  <div class="awards">
    {#each list as a, i (a.key)}
      <div class="award card pop-in" style="animation-delay:{delay + i * AWARD_GAP}ms; --mc:{a.info.color}">
        <div class="icon-tile" style="--sz:54px">{a.info.icon}</div>
        <div class="txt">
          <div class="aname">{a.info.name}</div>
          <div class="who">
            <Avatar src={avatars[a.who]} color={a.p.color} name={a.p.name} size={34} />
            <b>{a.p.name}</b>
            {#if a.p.team}<span class="muted team">{a.p.team}</span>{/if}
          </div>
          <div class="muted what">{a.info.what(a.value)}</div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .awards { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
  .award { display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 1.1rem 0.7rem 0.8rem; text-align: left; min-width: 230px; }
  .aname { font-family: var(--font-display); font-size: 1.35rem; color: var(--mc); line-height: 1.1; }
  .who { display: flex; align-items: center; gap: 0.4rem; margin: 0.2rem 0; font-size: 1.05rem; }
  .team { font-size: 0.85rem; }
  .what { font-size: 0.9rem; }
</style>
