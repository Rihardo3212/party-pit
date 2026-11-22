<script>
  // Bomb Pass on the big screen: the category, who holds the bomb, the words so far, votes and the boom.
  import Avatar from '../../components/Avatar.svelte';
  import { catOf, T } from '../../engine/bomb.js';
  import { sfx } from '../../lib/sound.js';

  let { s, avatars, now } = $props();
  const b = $derived(s.bomb);
  const cat = $derived(b ? catOf(b.cat) : null);
  const P = (pid) => ({ id: pid, ...s.players[pid] });
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;
  const ring = $derived(b ? b.order.filter((pid) => s.players[pid]).map(P) : []);
  const holder = $derived(b?.holder ? P(b.holder) : null);
  const live = $derived(!!b && s.phase === 'bplay' && !b.vote && now >= b.startAt);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const fresh = (f, ms = 1600) => f && now - f.at < ms;

  // Tick-tock while the fuse burns (same speed all the way, so nobody can tell when it blows).
  let lastBeat = -1;
  $effect(() => {
    if (!live) return;
    const beat = Math.floor((now - b.startAt) / 500);
    if (beat !== lastBeat) { lastBeat = beat; (beat % 2 ? sfx.tock : sfx.tick)(); }
  });
  // Spot on the ring for each player.
  const spot = (i, n) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
    return `left:${50 + 42 * Math.cos(a)}%; top:${50 + 40 * Math.sin(a)}%`;
  };
</script>

{#if b && cat}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#f97316; --cd:#c2410c">💣 Bomb Pass</span>
      <span class="chip sun">Round {b.round} of {b.rounds}</span>
    </div>

    <div class="cat pop-in"><span class="ic">{cat.icon}</span> {cat.cat}</div>

    <div class="arena">
      {#each ring as p, i (p.id)}
        <div class="seat" class:hot={p.id === b.holder} class:gone={s.phase === 'bboom' && p.id === b.boom} style={spot(i, ring.length)}>
          <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={p.id === b.holder ? 84 : 58} />
          <span class="nm">{p.name}</span>
          {#if s.phase === 'bboom' && b.gained[p.id]}
            <span class="pts" class:neg={b.gained[p.id] < 0}>{b.gained[p.id] > 0 ? '+' : ''}{b.gained[p.id]}</span>
          {/if}
        </div>
      {/each}

      <div class="center">
        {#if s.phase === 'bboom'}
          <div class="boom">💥</div>
          <div class="say pop-in">BOOM! {holder?.name || ''}</div>
        {:else if now < b.startAt}
          <div class="bomb">💣</div>
          <div class="say">Get ready… {secs(b.startAt)}</div>
        {:else if b.vote}
          <div class="vote pop-in">
            <div class="muted">Does it count?</div>
            <div class="vw">“{b.vote.w}”</div>
            <div class="tally">👍 {Object.keys(b.vote.yes).length} · 👎 {Object.keys(b.vote.no).length} · {secs(b.vote.until)}s</div>
            {#if Object.keys(b.vote.cyes || {}).length + Object.keys(b.vote.cno || {}).length}<div class="crowdt">📣 Crowd: 👍 {Object.keys(b.vote.cyes || {}).length} · 👎 {Object.keys(b.vote.cno || {}).length}</div>{/if}
          </div>
        {:else}
          <div class="bomb shake" class:fast={b.passes > 6}>💣</div>
          {#if fresh(b.flash) && b.flash.t === 'used'}<div class="say bad pop-in">“{b.flash.w}” was used!</div>
          {:else if fresh(b.flash) && b.flash.t === 'no'}<div class="say bad pop-in">“{b.flash.w}” voted out!</div>
          {:else if holder}<div class="say">{holder.name}, type a word!</div>{/if}
        {/if}
      </div>
    </div>

    <div class="words">
      {#each b.words as w, i (i + w.w)}
        <span class="word slide-up">{w.w}</span>
      {/each}
      {#if !b.words.length}<span class="muted">No words yet</span>{/if}
    </div>
  </section>
{/if}

<style>
  .crowdt { font-weight: 800; opacity: 0.8; font-size: 1rem; }
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 0.8rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .cat {
    font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3.2rem); background: #f97316; color: #fff;
    padding: 0.3rem 1.6rem; border-radius: 24px; box-shadow: 0 16px 40px -12px rgba(249, 115, 22, 0.8);
  }
  .ic { display: inline-block; transform: translateY(2px); }
  .arena { position: relative; width: min(100%, 760px); height: min(48vh, 440px); }
  .seat {
    position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;
    gap: 0.2rem; transition: all 0.35s cubic-bezier(.3, 1.4, .5, 1);
  }
  .seat.hot { filter: drop-shadow(0 0 18px rgba(249, 115, 22, 0.9)); }
  .seat.gone { filter: grayscale(1) brightness(0.6); }
  .nm { font-weight: 800; font-size: 1rem; }
  .pts { font-family: var(--font-display); font-size: 1.4rem; color: var(--green); }
  .pts.neg { color: var(--red); }
  .center {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column;
    align-items: center; gap: 0.4rem; text-align: center; width: 60%;
  }
  .bomb { font-size: 7rem; line-height: 1; }
  .bomb.shake { animation: wobble 0.5s ease-in-out infinite; }
  .bomb.shake.fast { animation-duration: 0.3s; }
  .boom { font-size: 9rem; line-height: 1; animation: blast 0.6s cubic-bezier(.3, 1.6, .5, 1); }
  .say { font-family: var(--font-display); font-size: 1.7rem; }
  .say.bad { color: var(--red); }
  .vote { background: var(--surface-hi); border-radius: 24px; padding: 0.8rem 1.4rem; }
  .vw { font-family: var(--font-display); font-size: 2.4rem; }
  .tally { font-size: 1.3rem; font-weight: 800; }
  .words { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; max-width: 1000px; min-height: 2.6rem; }
  .word { background: var(--surface-hi); border-radius: 999px; padding: 0.3rem 1rem; font-weight: 800; font-size: 1.2rem; }
  @keyframes wobble { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
  @keyframes blast { from { transform: scale(0.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
