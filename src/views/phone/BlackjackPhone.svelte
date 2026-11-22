<script>
  import ReactBar from '../../components/ReactBar.svelte';
  import PlayCard from '../../components/PlayCard.svelte';
  import { BETS, total, isBlackjack, DEALER } from '../../engine/blackjack.js';
  import { sfx } from '../../lib/sound.js';

  let { s, id, myUnit, send, react } = $props();

  const b = $derived(s.bj);
  const h = $derived(b?.hands?.[id]);
  const mine = $derived(h && h.cards?.[0] !== '?' ? h.cards : []);
  const t = $derived(total(mine));
  const OUT = { win: ['🎉', 'You win!'], blackjack: ['🂡', 'BLACKJACK!'], push: ['🤝', 'Tie: half back'], lose: ['😬', `${DEALER.name} wins`], bust: ['💥', 'Bust!'] };

  function bet(v) { sfx.pick(); send('bjbet', { bet: v }); }
  function act(move) { sfx.pop(); navigator.vibrate?.(20); send('bjact', { move }); }
</script>

{#if b}
  {#if s.phase === 'bjbet'}
    <div class="stack center pop-in">
      <h2>🪙 Place your bet</h2>
      {#if h?.bet}
        <div class="bigemoji">✅</div>
        <p class="muted">You bet {h.bet}. Waiting for the others…</p>
      {:else}
        <div class="bets">
          {#each BETS as v, i}
            <button class="chipbtn" style="--c:{['#2563eb', '#dc2626', '#111827'][i]}" onclick={() => bet(v)}>{v}</button>
          {/each}
        </div>
        <p class="muted">Win = 2× your bet. Lose = 0.</p>
      {/if}
    </div>

  {:else if ['bjplay', 'bjdealer'].includes(s.phase)}
    <div class="stack center">
      <div class="dealer"><span>{DEALER.icon} {DEALER.name} shows</span><PlayCard card={b.dealer[0]} size={46} /></div>
      <div class="hand">
        {#each mine as c, i (i)}<PlayCard card={c} size={78} delay={i * 80} />{/each}
      </div>
      <div class="tot" class:bust={t > 21}>{t > 21 ? `${t} · BUST` : isBlackjack(mine) ? 'BLACKJACK!' : t}</div>
      <p class="muted">Bet: {h?.bet || 0}{h?.doubled ? ' (doubled)' : ''}</p>
      {#if s.phase === 'bjplay' && h && !h.done}
        <div class="acts">
          <button class="btn big green" onclick={() => act('hit')}>👆 Hit</button>
          <button class="btn big blue" onclick={() => act('stand')}>✋ Stand</button>
        </div>
        {#if mine.length === 2}<button class="btn sun block" onclick={() => act('double')}>✌️ Double (bet {h.bet * 2}, one card)</button>{/if}
      {:else}
        <p class="muted">{s.phase === 'bjdealer' ? `${DEALER.name} is drawing… watch the big screen!` : 'Waiting for the others…'}</p>
      {/if}
    </div>

  {:else if s.phase === 'bjresult'}
    <div class="stack center pop-in">
      {#if h?.out}
        <div class="bigemoji">{OUT[h.out][0]}</div>
        <h2>{OUT[h.out][1]}</h2>
        <p class="muted">You {t} · {DEALER.name} {total(b.dealer)}</p>
        {#if b.points[id] && b.best[myUnit] === id}<p class="pts">+{b.points[id]}</p>
        {:else if b.points[id]}<p class="muted">{b.points[id]} points. A teammate did better.</p>{/if}
      {:else}
        <div class="bigemoji">👀</div><h2>Next hand soon!</h2>
      {/if}
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .bets { display: flex; gap: 0.9rem; }
  .chipbtn {
    width: 88px; height: 88px; border-radius: 50%; border: 6px dashed #fff; background: var(--c); color: #fff;
    font-family: var(--font-display); font-size: 1.6rem; box-shadow: 0 10px 22px -8px var(--c); cursor: pointer;
    transition: transform 0.15s;
  }
  .chipbtn:active { transform: scale(0.92); }
  .dealer { display: flex; align-items: center; gap: 0.6rem; font-weight: 900; opacity: 0.85; }
  .hand { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; }
  .tot { font-family: var(--font-display); font-size: 3rem; line-height: 1; }
  .tot.bust { color: var(--red); }
  .acts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; width: 100%; }
  .pts { font-family: var(--font-display); font-size: 2.2rem; color: var(--green); margin: 0; }
</style>
