<script>
  // The question board. Big on the main screen, compact on the picking phone.
  let { board, onPick = null, compact = false, intro = false } = $props();
</script>

<div class="board" class:compact class:intro style="--cols:{board.cats.length}">
  {#each board.cats as cat, c}
    <div class="cat" style="--d:{c * 90}ms">
      <span class="icon">{cat.icon}</span>
      <span class="name">{cat.name}</span>
    </div>
  {/each}
  {#each Array(board.rows) as _, r}
    {#each board.cats as _, c}
      {@const used = board.used[`${c}-${r}`]}
      <button
        style="--d:{(c + r) * 70 + 300}ms"
        class="cell"
        class:used
        disabled={used || !onPick}
        onclick={() => onPick && onPick(c, r)}
      >
        {#if !used}<span>{(r + 1) * 100}</span>{/if}
      </button>
    {/each}
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    gap: 0.8rem;
    width: 100%;
    perspective: 900px;
  }
  .cat {
    position: relative;
    background: var(--red);
    color: #fff;
    border-radius: 20px;
    padding: 0.6rem 0.4rem;
    text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.15rem;
    min-height: 5.6rem;
    box-shadow: 0 10px 22px -8px color-mix(in srgb, var(--red) 75%, transparent);
  }
  .icon { font-size: clamp(1.9rem, calc(calc(10 * var(--vw)) / var(--cols)), 3rem); filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.25)); }
  .name { font-family: var(--font-display); font-size: clamp(1.15rem, calc(calc(7 * var(--vw)) / var(--cols)), 1.9rem); line-height: 1.05; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.25); }

  /* flat blue tiles with a soft glow */
  .cell {
    position: relative;
    border-radius: 20px;
    min-height: 5.2rem;
    background: var(--blue);
    box-shadow: 0 10px 22px -8px color-mix(in srgb, var(--blue) 80%, transparent);
    transition: transform 0.15s cubic-bezier(0.3, 1.6, 0.5, 1), box-shadow 0.15s;
    overflow: hidden;
  }
  .cell span {
    position: relative;
    font-family: var(--font-display);
    font-size: 2.5rem;
    color: #fff;
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.18);
  }
  .cell:disabled { cursor: default; }
  .cell:not(:disabled):hover { transform: translateY(-4px); box-shadow: 0 16px 28px -8px color-mix(in srgb, var(--blue) 85%, transparent); }
  .cell:not(:disabled):active { transform: scale(0.95); }
  .cell.used { background: var(--well); box-shadow: none; }

  .intro .cat, .intro .cell { animation: flip-in 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) both; animation-delay: var(--d); }
  @keyframes flip-in { from { transform: rotateX(-95deg) scale(0.8); opacity: 0; } to { transform: none; opacity: 1; } }

  .compact { gap: 0.4rem; }
  .compact .cat { min-height: clamp(3.6rem, calc(calc(34 * var(--vw)) / var(--cols)), 5rem); border-radius: 13px; padding: 0.3rem 0.15rem; box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--red) 70%, transparent); }
  .compact .icon { font-size: clamp(1.1rem, calc(calc(26 * var(--vw)) / var(--cols)), 1.8rem); }
  .compact .name { font-size: clamp(0.68rem, calc(calc(18 * var(--vw)) / var(--cols)), 1.05rem); }
  .compact .cell { min-height: clamp(3.3rem, calc(calc(40 * var(--vw)) / var(--cols)), 5.5rem); border-radius: 13px; box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--blue) 70%, transparent); }
  .compact .cell span { font-size: clamp(1.2rem, calc(calc(34 * var(--vw)) / var(--cols)), 2rem); }
</style>
