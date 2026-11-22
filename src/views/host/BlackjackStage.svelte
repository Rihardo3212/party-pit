<script>
  import Avatar from '../../components/Avatar.svelte';
  import PlayCard from '../../components/PlayCard.svelte';
  import { total, isBlackjack, DEALER } from '../../engine/blackjack.js';

  let { s, avatars, now } = $props();

  const b = $derived(s.bj);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit && !s.players[pid]?.away).map((pid) => ({ id: pid, ...s.players[pid] })));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const dealerShown = $derived(b ? b.dealer.slice(0, b.shown) : []);
  const dTotal = $derived(total(dealerShown));
  const OUT = { win: 'WIN', blackjack: 'BLACKJACK', push: 'PUSH', lose: 'LOSE', bust: 'BUST' };
  const cardSize = $derived(players.length > 6 ? 44 : players.length > 4 ? 54 : 66);
</script>

{#if b}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#15803d">🃏 Blackjack</span>
      <span class="chip sun">Hand {b.round} of {b.rounds}</span>
      {#if ['bjbet', 'bjplay'].includes(s.phase)}<span class="chip">⏱️ {secs(b.until)}</span>{/if}
    </div>

    <div class="felt">
      <div class="dealer">
        <div class="bot" class:think={s.phase === 'bjdealer'}>{DEALER.icon}</div>
        <div class="dside">
          <span class="dname">{DEALER.name}, the dealer</span>
          <div class="cards">
            {#if s.phase === 'bjbet'}
              <span class="hint">Place your bets on your phones!</span>
            {:else}
              {#each b.dealer as c, i (i)}
                <PlayCard card={i < b.shown ? c : null} size={86} delay={i * 120} />
              {/each}
            {/if}
          </div>
        </div>
        {#if s.phase !== 'bjbet' && b.dealer.length}
          <div class="dtot" class:bust={dTotal > 21}>{b.shown < 2 ? `${dTotal} + ?` : dTotal > 21 ? `${dTotal} BUST` : isBlackjack(b.dealer) ? 'BLACKJACK' : dTotal}</div>
        {/if}
      </div>

      <div class="seats">
        {#each players as p (p.id)}
          {@const h = b.hands[p.id]}
          {@const cards = h && h.cards?.[0] !== '?' ? h.cards : []}
          {@const t = total(cards)}
          <div class="seat" class:done={h?.done && s.phase === 'bjplay'} class:best={s.phase === 'bjresult' && b.best[p.unit] === p.id && b.points[p.id]} style="--c:{colorOf(p)}">
            <div class="who">
              <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={42} />
              <span class="nm">{p.name}</span>
              {#if h?.bet}<span class="bet">🪙 {h.bet}</span>{/if}
            </div>
            <div class="cards small">
              {#each cards as c, i (i)}<PlayCard card={c} size={cardSize} delay={i * 90} />{/each}
              {#if !cards.length}<span class="hint">{h?.bet ? '✅' : '…'}</span>{/if}
            </div>
            {#if cards.length}
              <div class="ptot" class:bust={t > 21}>
                {#if s.phase === 'bjresult' && h.out}
                  <span class="out {h.out}">{OUT[h.out]}</span> {b.points[p.id] ? `+${b.points[p.id]}` : ''}
                {:else}
                  {t > 21 ? 'BUST' : isBlackjack(cards) ? '21!' : t}{h.done && s.phase === 'bjplay' ? ' ✋' : ''}
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 0.9rem; align-items: center; justify-content: center;
    padding: 0.3rem 2rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.35rem; }
  .felt {
    width: 100%; border-radius: 40px 40px 200px 200px / 40px 40px 120px 120px; padding: 1.4rem 1.6rem 2rem;
    background: radial-gradient(ellipse at 50% 20%, #1f8a4c, #0f5130 75%); box-shadow: inset 0 0 0 8px #7c4a1e, 0 24px 40px -20px #000;
    display: flex; flex-direction: column; gap: 1.4rem; align-items: center;
  }
  .dealer { display: flex; align-items: center; gap: 1.2rem; }
  .bot { font-size: 5rem; filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.3)); }
  .bot.think { animation: think 0.5s ease-in-out infinite alternate; }
  @keyframes think { to { transform: rotate(8deg) translateY(-4px); } }
  .dside { display: flex; flex-direction: column; gap: 0.4rem; }
  .dname { font-weight: 900; opacity: 0.85; }
  .cards { display: flex; gap: 0.4rem; min-height: 60px; align-items: center; }
  .cards.small { gap: 0.25rem; flex-wrap: wrap; justify-content: center; }
  .dtot { font-family: var(--font-display); font-size: 3rem; min-width: 5rem; }
  .bust { color: #fca5a5; }
  .hint { font-weight: 900; font-size: 1.3rem; opacity: 0.85; }
  .seats { display: flex; flex-wrap: wrap; gap: 0.9rem; justify-content: center; width: 100%; }
  .seat {
    background: rgba(0, 0, 0, 0.22); border-radius: 22px; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.4rem;
    align-items: center; min-width: 170px; transition: transform 0.25s, background 0.25s;
  }
  .seat.done { opacity: 0.75; }
  .seat.best { background: color-mix(in srgb, var(--c) 35%, rgba(0, 0, 0, 0.2)); transform: translateY(-6px); }
  .who { display: flex; align-items: center; gap: 0.4rem; font-weight: 900; }
  .nm { max-width: 8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bet { font-size: 0.95rem; background: rgba(0, 0, 0, 0.3); border-radius: 99px; padding: 0 0.5rem; }
  .ptot { font-family: var(--font-display); font-size: 1.7rem; }
  .out { border-radius: 10px; padding: 0 0.5rem; background: #475569; }
  .out.win, .out.blackjack { background: #16a34a; }
  .out.push { background: #ca8a04; }
  .out.lose, .out.bust { background: #b91c1c; }
  @media (max-height: 760px) { .bot { font-size: 3.6rem; } .felt { padding: 1rem; gap: 0.8rem; } }
  @media (prefers-reduced-motion: reduce) { .bot.think { animation: none; } }
</style>
