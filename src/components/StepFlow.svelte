<script>
  // A row of big picture steps (icon tile + a few words), used for How to play and game intros.
  let { steps, color = 'var(--red)', size = 'big', animate = false } = $props();
</script>

<div class="flow {size}" class:animate style="--mc:{color}">
  {#each steps as st, i}
    <div class="step" style="--d:{300 + i * 700}ms">
      <div class="num">{i + 1}</div>
      <span class="icon-tile">{st.icon}</span>
      <div class="label">{st.label}</div>
      {#if st.tag}<span class="tag">{st.tag}</span>{/if}
    </div>
    {#if i < steps.length - 1}<div class="arrow" style="--d:{600 + i * 700}ms">➜</div>{/if}
  {/each}
</div>

<style>
  .flow { display: flex; align-items: stretch; justify-content: center; gap: 0.8rem; width: 100%; }
  .step {
    position: relative; flex: 1; max-width: 250px;
    display: flex; flex-direction: column; align-items: center; gap: 0.7rem; text-align: center;
    background: var(--surface); border-radius: 26px; padding: 1.6rem 1rem 1.3rem;
    box-shadow: 0 14px 30px -12px rgba(0, 0, 0, 0.55);
  }
  .num {
    position: absolute; top: -12px; left: -8px; width: 38px; height: 38px; border-radius: 50%;
    display: grid; place-items: center; font-family: var(--font-display); font-size: 1.2rem;
    background: #fff; color: #2b2240; box-shadow: 0 6px 14px -6px rgba(0, 0, 0, 0.5);
  }
  .step .icon-tile { --sz: 96px; }
  .label { font-family: var(--font-display); font-size: 1.45rem; line-height: 1.15; color: var(--ink); }
  .tag {
    font-family: var(--font-display); color: #fff; background: var(--green); border-radius: 999px; padding: 0.1em 0.8em;
    box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--green) 80%, transparent);
  }
  .arrow { align-self: center; font-size: 2rem; color: var(--muted); }

  .animate .step { animation: step-in 0.55s cubic-bezier(0.2, 1.5, 0.4, 1) both; animation-delay: var(--d); }
  .animate .arrow { animation: fade 0.4s both; animation-delay: var(--d); }
  @keyframes step-in { from { transform: translateY(40px) scale(0.6); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes fade { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }

  /* compact: phones and small cards */
  .small { flex-direction: column; gap: 0.5rem; }
  .small .step { flex-direction: row; max-width: none; padding: 0.6rem 0.9rem 0.6rem 1.4rem; border-radius: 20px; text-align: left; gap: 0.8rem; }
  .small .num { top: 50%; left: -10px; transform: translateY(-50%); width: 28px; height: 28px; font-size: 0.95rem; }
  .small .step .icon-tile { --sz: 46px; }
  .small .label { font-size: 1.1rem; flex: 1; }
  .small .arrow { display: none; }
  .small.animate .step { animation-delay: calc(var(--d) / 3); }

  /* mini: one tight row of icons for the TV lobby card */
  .mini { gap: 0.5rem; }
  .mini .step { padding: 1rem 0.6rem 0.8rem; border-radius: 20px; gap: 0.45rem; background: rgba(255, 255, 255, 0.06); box-shadow: none; }
  .mini .num { width: 28px; height: 28px; font-size: 0.95rem; top: -8px; left: -6px; }
  .mini .step .icon-tile { --sz: 58px; }
  .mini .label { font-size: 1.05rem; }
  .mini .tag { font-size: 0.85rem; }
  .mini .arrow { font-size: 1.3rem; }

  @media (max-width: 760px) {
    .big { flex-wrap: wrap; }
    .big .step { flex: 1 1 40%; }
    .big .arrow { display: none; }
    .big .step .icon-tile { --sz: 70px; }
    .big .label { font-size: 1.15rem; }
  }
</style>
