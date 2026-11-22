<script>
  import Avatar from '../../components/Avatar.svelte';
  import Board from '../../components/Board.svelte';
  import Marquee from '../../components/Marquee.svelte';
  import Timer from '../../components/Timer.svelte';
  import { T } from '../../engine/board.js';

  let { s, avatars, now } = $props();

  const units = $derived(s.unitOrder.map((id) => ({ id, ...s.units[id] })));
  const cur = $derived(s.current);
  const fin = $derived(s.final);
  const U = (id) => (id && s.units[id] ? { id, ...s.units[id] } : null);
  const P = (id) => (id && s.players[id] ? { id, ...s.players[id] } : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
</script>

{#if s.phase === 'board'}
  <section class="main">
    {#if U(s.turn)}
      {@const t = U(s.turn)}
      <div class="turn pill pop-in">
        <Avatar src={avatars[t.id]} color={t.color} name={t.name} size={54} />
        <h2><span style="color:{t.color}">{t.name}</span> {s.teamMode ? 'pick' : 'picks'} the next question</h2>
      </div>
    {/if}
    {#key s.game}
      <Board board={s.board} intro={Object.keys(s.board.used).length === 0} />
    {/key}
  </section>

{:else if (s.phase === 'question' || s.phase === 'answer' || s.phase === 'reveal') && cur}
  <section class="main q">
    <div class="qhead">
      <span class="chip">{cur.icon} {cur.cat}</span>
      <span class="chip sun">{cur.value}</span>
    </div>
    <div class="qwrap pop-in">
      <Marquee lit={s.phase !== 'reveal'} color={s.phase === 'answer' ? U(cur.buzzUnit)?.color : '#ffe066'}>
        <h1 class="qtext">{cur.q}</h1>
      </Marquee>
    </div>

    {#if s.mode === 'party'}
      <div class="options">
        {#each cur.options as o, i}
          {@const wrongBy = cur.wrongs.find((w) => w.i === i)}
          <div
            class="opt big flip-in"
            style="animation-delay:{150 + i * 90}ms"
            class:correct={s.phase === 'reveal' && i === cur.correctIndex}
            class:wrong={wrongBy || (s.phase === 'reveal' && cur.chosen === i && i !== cur.correctIndex)}
            class:faded={s.phase === 'reveal' && i !== cur.correctIndex}
          >
            <span class="coin l{i}">{'ABCD'[i]}</span> {o}
            {#if wrongBy}<span class="by"><Avatar src={avatars[wrongBy.uid]} color={U(wrongBy.uid)?.color} name={U(wrongBy.uid)?.name} size={36} /></span>{/if}
          </div>
        {/each}
      </div>
    {:else if s.phase === 'reveal'}
      <div class="answer-reveal pop-in">✅ {cur.answer}</div>
    {/if}

    <div class="status">
      {#if s.phase === 'question' && !cur.open}
        <div class="spill dim">Read it… buzzers open soon</div>
      {:else if s.phase === 'question'}
        <div class="spill go">BUZZ NOW! <span class="secs">{secs(cur.closeAt)}</span></div>
        <Timer until={cur.closeAt} total={T.buzz} {now} />
      {:else if s.phase === 'answer'}
        {@const b = P(cur.buzzer)}
        {@const u = U(cur.buzzUnit)}
        <div class="buzzed pop-in">
          <div class="glow" style="--c:{u?.color}"><Avatar src={avatars[u?.id]} color={u?.color} name={u?.name} size={92} /></div>
          <div class="spill" style="background:{u?.color}; color:#fff">
            {b?.name}{s.teamMode ? ` (${u?.name})` : ''} {s.mode === 'host' ? 'answers out loud!' : 'is answering…'}
            {#if s.mode === 'party'}<span class="secs">{secs(cur.answerUntil)}</span>{/if}
          </div>
        </div>
      {/if}
    </div>
  </section>

{:else if s.phase === 'finalBet' && fin}
  <section class="main q">
    <h1 class="final-title pop-in">⚡ FINAL ROUND ⚡</h1>
    <div class="final-cat pop-in" style="animation-delay:250ms">
      <span class="fc-label">The category is</span>
      <span class="sticker fc-name">{fin.icon} {fin.cat}</span>
    </div>
    <p class="hint">Bet on your phones! You can bet up to your score, or up to 500 if you're low.</p>
    <div class="ulist">
      {#each units as u (u.id)}
        {@const locked = fin.bets[u.id] !== undefined}
        <div class="ucard card" class:locked>
          <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={66} />
          <div class="uname">{u.name}</div>
          <div class="uscore">{u.score}</div>
          <div class="ustate">{locked ? '🔒 Bet locked' : '🤔 thinking…'}</div>
        </div>
      {/each}
    </div>
    <div class="status">
      <div class="spill dim">⏱ {secs(fin.betUntil)}</div>
      <Timer until={fin.betUntil} total={T.bet} {now} />
    </div>
  </section>

{:else if (s.phase === 'finalQ' || s.phase === 'finalJudge') && fin}
  <section class="main q">
    <div class="qhead"><span class="chip">⚡ Final · {fin.icon} {fin.cat}</span></div>
    <div class="qwrap pop-in">
      <Marquee color="#ff3b4f"><h1 class="qtext">{fin.q}</h1></Marquee>
    </div>
    {#if s.mode === 'party'}
      <div class="options">
        {#each fin.options as o, i}
          <div class="opt big flip-in" style="animation-delay:{150 + i * 90}ms"><span class="coin l{i}">{'ABCD'[i]}</span> {o}</div>
        {/each}
      </div>
    {/if}
    <div class="ulist small">
      {#each units as u (u.id)}
        <div class="ucard card row" class:locked={!!fin.answers[u.id]}>
          <Avatar src={avatars[u.id]} color={u.color} name={u.name} size={46} />
          <div class="uname">{u.name}</div>
          <div class="ustate">{fin.answers[u.id] ? '🔒' : '✍️'}</div>
        </div>
      {/each}
    </div>
    <div class="status">
      {#if s.phase === 'finalQ'}
        <div class="spill go">Answer on your phone! <span class="secs">{secs(fin.until)}</span></div>
        <Timer until={fin.until} total={s.mode === 'host' ? T.finalHost : T.finalParty} {now} />
      {:else}
        <div class="spill dim">🎤 {s.hostName} is judging the answers…</div>
      {/if}
    </div>
  </section>

{:else if s.phase === 'finalReveal' && fin}
  <section class="main q">
    <div class="qhead"><span class="chip">⚡ Final · {fin.icon} {fin.cat}</span></div>
    <h2 class="fq">{fin.q}</h2>
    {#if fin.revealIdx >= 0}
      <div class="answer-reveal pop-in">✅ {fin.answer}</div>
    {:else}
      <div class="spill dim drum">🥁 Drumroll please…</div>
    {/if}
    <div class="ulist">
      {#each fin.order as uid, i (uid)}
        {@const u = U(uid)}
        {@const shown = i <= fin.revealIdx}
        {@const a = fin.answers[uid]}
        <div class="ucard card big" class:current={i === fin.revealIdx} class:ok={shown && fin.judged[uid]} class:no={shown && !fin.judged[uid]}>
          <Avatar src={avatars[uid]} color={u.color} name={u.name} size={i === fin.revealIdx ? 100 : 72} />
          <div class="uname">{u.name}</div>
          {#if shown}
            <div class="uans">{a ? (s.mode === 'party' ? fin.options[a.i] : a.text) : '— no answer —'}</div>
            <div class="udelta pop-in" class:neg={fin.deltas[uid] < 0}>{fin.judged[uid] ? '✓' : '✗'} {fin.deltas[uid] >= 0 ? '+' : ''}{fin.deltas[uid]}</div>
          {:else}
            <div class="uans muted">???</div>
          {/if}
          <div class="uscore">{u.score}</div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 1.1rem; align-items: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1400px; width: 100%; margin: 0 auto; position: relative; z-index: 1;
  }
  .q { justify-content: center; }
  .turn { padding: 0.4rem 1.6rem 0.4rem 0.45rem; }
  .turn h2 { font-size: 1.8rem; }
  .qhead { display: flex; gap: 0.7rem; align-items: center; font-size: 1.5rem; }
  .qwrap { width: 100%; max-width: 1150px; }
  .qtext { font-size: clamp(2rem, 3.5vw, 3.3rem); line-height: 1.15; padding: 2rem 2.2rem; text-align: center; }
  .options { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; max-width: 1150px; }
  .opt.big { font-size: 1.6rem; }
  .by { margin-left: auto; }
  .answer-reveal {
    font-family: var(--font-display); font-size: 2.5rem; color: #fff;
    background: var(--green); padding: 0.25rem 1.8rem 0.35rem; border-radius: 999px;
    text-shadow: 0 3px 0 rgba(0, 0, 0, 0.2);
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--green) 70%, transparent), 0 0 40px rgba(34, 197, 94, 0.5);
  }
  .status { min-height: 6.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.8rem; width: 100%; max-width: 640px; }
  .spill {
    font-family: var(--font-display); font-size: 1.85rem;
    background: #fff; color: #2b2240; border-radius: 999px; padding: 0.35rem 1.6rem 0.45rem;
    box-shadow: 0 6px 0 rgba(0, 0, 0, 0.35); display: flex; align-items: center; gap: 0.8rem;
  }
  .spill.dim { background: rgba(255, 255, 255, 0.12); color: #fff; box-shadow: none; }
  .spill.go {
    color: #fff; background: var(--red);
    box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--red) 70%, transparent);
    animation: throb 0.5s ease-in-out infinite alternate; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
  }
  .drum { animation: throb 0.25s ease-in-out infinite alternate; }
  .secs { background: rgba(0, 0, 0, 0.18); border-radius: 999px; min-width: 2.3rem; text-align: center; padding: 0 0.5rem; }
  .buzzed { display: flex; align-items: center; gap: 1rem; }
  .glow { border-radius: 30%; animation: glow 0.5s ease-in-out infinite alternate; }
  @keyframes glow { from { box-shadow: 0 0 0 0 var(--c); } to { box-shadow: 0 0 34px 12px var(--c); } }

  .final-title {
    font-size: clamp(3rem, 7vw, 6.2rem); color: var(--sun);
    text-shadow: 0 3px 0 #ff8a00, 0 6px 0 #d96800, 0 10px 30px -8px rgba(224, 33, 58, 0.6), 0 0 40px rgba(255, 196, 0, 0.5);
  }
  .final-cat { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .fc-label { font-size: 1.3rem; opacity: 0.85; }
  .fc-name { font-size: 2.8rem; }
  .hint { font-size: 1.25rem; opacity: 0.85; margin: 0; text-align: center; }
  .fq { font-size: 2rem; text-align: center; max-width: 1100px; }
  .ulist { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .ucard { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 150px; padding: 1rem 1.2rem; transition: all 0.3s; color: var(--ink); }
  .ucard.locked { box-shadow: 0 0 0 4px var(--ring), var(--shadow); }
  .ucard.row { flex-direction: row; min-width: 120px; padding: 0.55rem 0.9rem; gap: 0.6rem; }
  .uname { font-family: var(--font-display); font-size: 1.25rem; }
  .uscore { font-family: var(--font-display); font-size: 1.5rem; color: var(--sun); }
  .ustate { opacity: 0.85; }
  .ucard.big { min-width: 190px; }
  .ucard.current { transform: scale(1.08); }
  .ucard.ok { box-shadow: 0 0 0 5px var(--green), var(--shadow); }
  .ucard.no { box-shadow: 0 0 0 5px var(--red), var(--shadow); }
  .uans { font-size: 1.25rem; font-weight: 900; text-align: center; }
  .udelta { font-family: var(--font-display); font-size: 1.7rem; color: var(--green); }
  .udelta.neg { color: var(--red); }
</style>
