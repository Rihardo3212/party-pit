<script>
  // One playing card. card = 'A♠', '10♥'... or null/'?' for face down.
  import { rankOf, suitOf, isRed } from '../engine/blackjack.js';
  let { card = null, size = 90, delay = 0 } = $props();
  const down = $derived(!card || card === '?');
</script>

<div class="card-x" class:down class:red={!down && isRed(card)} style="--w:{size}px; animation-delay:{delay}ms">
  {#if !down}
    <span class="r">{rankOf(card)}</span>
    <span class="s">{suitOf(card)}</span>
  {:else}
    <span class="back">🤖</span>
  {/if}
</div>

<style>
  .card-x {
    width: var(--w); height: calc(var(--w) * 1.4); border-radius: calc(var(--w) * 0.12); background: #fffdf7; color: #1f2937;
    display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
    box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.6); font-family: var(--font-display); line-height: 1;
    animation: deal 0.35s cubic-bezier(0.2, 1.4, 0.5, 1) both;
  }
  .card-x.red { color: #dc2626; }
  .card-x.down { background: repeating-linear-gradient(45deg, #15803d 0 8px, #166534 8px 16px); border: 4px solid #fffdf7; }
  .r { font-size: calc(var(--w) * 0.42); }
  .s { font-size: calc(var(--w) * 0.38); }
  .back { font-size: calc(var(--w) * 0.4); }
  @keyframes deal { from { transform: translateY(-30px) rotate(-8deg); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .card-x { animation: none; } }
</style>
