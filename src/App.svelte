<script>
  import Home from './pages/Home.svelte';

  // Pages load on demand, so a phone never downloads the big-screen code (and the other way round).
  const PAGES = {
    host: () => import('./pages/Host.svelte'),
    watch: () => import('./pages/Host.svelte'),
    join: () => import('./pages/Play.svelte'),
    how: () => import('./pages/How.svelte'),
    voice: () => import('./pages/Voice.svelte')
  };

  let hash = $state(location.hash);
  $effect(() => {
    const on = () => (hash = location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  });

  const route = $derived.by(() => {
    const parts = hash.replace(/^#\/?/, '').split('/');
    return { page: parts[0] || '', arg: parts[1] || '' };
  });
  const load = $derived(PAGES[route.page]?.());
</script>

{#if load}
  {#await load}
    <div class="loading" aria-busy="true"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
  {:then { default: Page }}
    {#if route.page === 'host'}
      <Page arg={route.arg} />
    {:else if route.page === 'watch'}
      {#key route.arg}<Page watch={route.arg} />{/key}
    {:else if route.page === 'join'}
      {#key route.arg}<Page code={route.arg} />{/key}
    {:else}
      <Page />
    {/if}
  {/await}
{:else}
  <Home />
{/if}

<style>
  .loading { min-height: 100vh; display: grid; place-content: center; grid-auto-flow: column; gap: 0.6rem; }
  .dot { width: 18px; height: 18px; border-radius: 50%; background: var(--sun, #ffc400); animation: hop 0.9s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.15s; background: var(--red, #ff3b4f); }
  .dot:nth-child(3) { animation-delay: 0.3s; background: var(--blue, #2f8cff); }
  @keyframes hop { 0%, 100% { transform: translateY(0) scale(1); } 40% { transform: translateY(-18px) scale(1.1, 0.9); } }
</style>
