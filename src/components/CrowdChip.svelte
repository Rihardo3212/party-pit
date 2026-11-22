<script>
  // Big-screen header: how many people are watching, and who the audience cheers for most.
  let { s } = $props();
  const crowd = $derived(Object.values(s.audience || {}));
  const top = $derived.by(() => {
    const n = {};
    for (const a of crowd) if (a.fan && s.players[a.fan]) n[a.fan] = (n[a.fan] || 0) + 1;
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3);
  });
</script>

{#if crowd.length}
  <span class="pill crowd pop-in" title="The audience">
    👀 {crowd.length} watching
    {#each top as [pid, n] (pid)}
      <span class="fan" style="--c:{s.players[pid].color}">📣 {s.players[pid].name} {n}</span>
    {/each}
  </span>
{/if}

<style>
  .crowd { display: inline-flex; align-items: center; gap: 0.5rem; }
  .fan { background: var(--c); color: #fff; border-radius: 999px; padding: 0.05rem 0.55rem; font-weight: 800; font-size: 0.9em; }
</style>
