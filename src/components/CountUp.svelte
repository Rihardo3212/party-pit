<script>
  // A number that counts up (or down) to its new value, with a little bump when it changes.
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { reduced } from '../lib/motion.js';

  let { value = 0 } = $props();
  // svelte-ignore state_referenced_locally
  const t = new Tween(value, { duration: 900, easing: cubicOut });
  let bump = $state(0);
  let last = value;
  $effect(() => {
    const v = value;
    if (v === last) return;
    last = v;
    t.set(v, { duration: reduced() ? 0 : Math.min(1400, 500 + Math.abs(v - t.current) / 3) });
    bump += 1;
  });
</script>

{#key bump}<span class="n" class:go={bump > 0}>{Math.round(t.current)}</span>{/key}

<style>
  .n { display: inline-block; }
  .go { animation: bump 0.6s cubic-bezier(0.2, 1.8, 0.4, 1); }
  @keyframes bump { 0% { transform: scale(1); } 30% { transform: scale(1.35, 1.2); } 100% { transform: scale(1); } }
</style>
