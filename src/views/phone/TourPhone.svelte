<script>
  import ReactBar from '../../components/ReactBar.svelte';
  import StepFlow from '../../components/StepFlow.svelte';
  import { MODES } from '../../lib/modes.js';
  import { POINTS, ITEMS, itemsOf } from '../../engine/tour.js';
  import { sfx } from '../../lib/sound.js';

  let { s, myUnit, send, now, react } = $props();

  const t = $derived(s.tour);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const mine = $derived(t?.rolls?.[myUnit]);
  const chooser = $derived(!!t && t.chooser === myUnit);
  const ev = $derived(t?.events?.[myUnit]);
  const mode = $derived(t?.mode ? MODES[t.mode] : null);
  const DICE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  let rolling = $state(false);
  const myItems = $derived(t ? itemsOf(t, myUnit) : []);
  const used = $derived(t?.used?.[myUnit]);
  // Steal needs someone else with points.
  const canSteal = $derived(!!s.unitOrder.find((u) => u !== myUnit && s.units[u].score > 0));
  function useItem(k) {
    sfx.pick();
    navigator.vibrate?.(40);
    send('titem', { k });
  }

  function roll() {
    if (rolling) return;
    rolling = true;
    sfx.pop();
    navigator.vibrate?.([30, 40, 30, 40, 60]);
    send('troll');
    setTimeout(() => (rolling = false), 1500);
  }
</script>

{#if t}
  {#if s.phase === 'troll'}
    <div class="stack center">
      <p class="qmini">🗺️ Round {t.round} of {t.rounds} · ⏱ {secs(t.until)}</p>
      {#if mine}
        <div class="die pop-in">{(t.dice?.[myUnit] || [mine]).map((d) => DICE[d]).join('')}</div>
        <h2>{s.teamMode ? 'Your team rolled' : 'You rolled'} {mine}!</h2>
        <p class="muted">Watch your piece on the big screen.</p>
        <ReactBar onReact={react} />
      {:else}
        {#if chooser}<p class="crown">👑 Your roll picks the next game!</p>{/if}
        {#if used}
          <p class="using">{ITEMS[used.k].icon} {ITEMS[used.k].name} used!</p>
        {:else if myItems.length}
          <div class="items">
            {#each myItems as [k, n] (k)}
              {#if k === 'shield'}
                <div class="item passive"><span>{ITEMS[k].icon}</span><b>Shield{n > 1 ? ` ×${n}` : ''}</b><small>Ready</small></div>
              {:else}
                <button class="item" disabled={k === 'steal' && !canSteal} onclick={() => useItem(k)}><span>{ITEMS[k].icon}</span><b>{ITEMS[k].name}</b><small>{ITEMS[k].what}</small></button>
              {/if}
            {/each}
          </div>
          <p class="muted tip">Use an item before you roll (one per turn).</p>
        {/if}
        <button class="btn sun huge" class:shake={rolling} onclick={roll}>🎲<br />Roll!</button>
        {#if s.teamMode}<p class="muted">Anyone in your team can roll.</p>{/if}
      {/if}
    </div>

  {:else if s.phase === 'tmove'}
    <div class="stack center">
      <div class="bigemoji bounce">👀</div>
      <h2>Watch the board!</h2>
      {#if ev}
        <p>
          {#if ev.lap}🏁 Lap bonus +{POINTS.lap}! {/if}
          {#if ev.kind === 'bonus'}⭐ Bonus space +{POINTS.bonus}!{:else if ev.kind === 'trap'}{ev.shield ? '🛡️ Your shield blocked the trap!' : '💀 Trap space!'}{:else if ev.item}{ITEMS[ev.item].icon} You got {ITEMS[ev.item].name}!{:else if ev.full}🎒 Your bag is full!{:else if ev.broke}🛒 Not enough points for the shop!{:else if ev.kind === 'mode'}{MODES[t.board[ev.to].m].icon} {MODES[t.board[ev.to].m].name} space{/if}
        </p>
      {/if}
      <ReactBar onReact={react} />
    </div>

  {:else if s.phase === 'tpick' && mode}
    <div class="stack center" style="--mc:{mode.color}">
      <p class="muted">Next game</p>
      <span class="icon-tile" style="--sz:72px">{mode.icon}</span>
      <h2 style="color:{mode.color}">{mode.name}</h2>
      <div class="wide"><StepFlow steps={mode.steps} color={mode.color} size="small" animate /></div>
      <p class="muted">Starting in {secs(t.until)}…</p>
    </div>

  {:else if s.phase === 'tscore'}
    <div class="stack center pop-in">
      <div class="bigemoji">{t.place[myUnit] >= 500 ? '🏆' : t.place[myUnit] ? '👏' : '😅'}</div>
      <h2>{t.place[myUnit] >= 500 ? 'You won that one!' : t.place[myUnit] ? 'Nice!' : 'No points this time'}</h2>
      {#if t.place[myUnit]}<p class="pts">+{t.place[myUnit]}</p>{/if}
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .qmini { margin: 0; text-align: center; }
  .crown { margin: 0; font-weight: 900; color: #ffc400; }
  .btn.huge { font-size: 2.4rem; line-height: 1.1; padding: 1.4rem 2.6rem; border-radius: 32px; }
  .shake { animation: shake 0.4s; }
  @keyframes shake { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-12deg); } 75% { transform: rotate(12deg); } }
  .die { font-size: 6rem; line-height: 1; }
  .wide { width: 100%; }
  .using { margin: 0; font-weight: 900; }
  .items { display: flex; gap: 0.6rem; width: 100%; }
  .item {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.1rem; padding: 0.6rem 0.4rem; border-radius: 18px;
    border: none; background: var(--surface-hi); color: var(--ink); font: inherit; cursor: pointer;
    box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.5); transition: transform 0.15s;
  }
  .item:active:not(:disabled) { transform: scale(0.95); }
  .item:disabled { opacity: 0.45; }
  .item span { font-size: 1.8rem; }
  .item small { opacity: 0.75; font-size: 0.75rem; line-height: 1.1; text-align: center; }
  .item.passive { opacity: 0.8; }
  .tip { margin: 0; font-size: 0.85rem; }
  .pts { font-family: var(--font-display); font-size: 2.2rem; color: var(--green); margin: 0; }
</style>
