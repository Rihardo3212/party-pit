<script>
  import Avatar from '../../components/Avatar.svelte';
  import Timer from '../../components/Timer.svelte';
  import PinMap from '../../components/PinMap.svelte';
  import { T, photoUrl, placeById, formatKm, BULLSEYE_KM } from '../../engine/pindrop.js';

  let { s, avatars, now } = $props();

  const f = $derived(s.pin);
  const place = $derived(f ? placeById(f.id) : null);
  const secs = (until) => Math.max(0, Math.ceil((until - now) / 1000));
  const players = $derived(s.order.filter((pid) => s.players[pid]?.unit).map((pid) => ({ id: pid, ...s.players[pid] })));
  const colorOf = (p) => (s.teamMode ? s.units[p.unit]?.color : p.color) || p.color;

  // Results, closest first.
  const rows = $derived(
    f && s.phase === 'preveal'
      ? players
          .filter((p) => f.results[p.id])
          .map((p) => ({ ...p, ...f.results[p.id], best: f.best[p.unit] === p.id }))
          .sort((a, b) => a.km - b.km)
      : []
  );
  const pins = $derived(
    f && s.phase === 'preveal'
      ? rows.map((r) => ({ id: r.id, lat: f.pins[r.id].lat, lng: f.pins[r.id].lng, color: colorOf(r), avatar: avatars[r.id], name: r.name, best: r.best }))
      : []
  );
</script>

{#if f && place}
  <section class="main">
    <div class="qhead">
      <span class="chip" style="--c:#ff8a1f; --cd:#b35400">📍 Pin Drop</span>
      <span class="chip sun">Photo {f.round} of {f.rounds}</span>
      {#if f.double}<span class="chip" style="--c:var(--red); --cd:var(--red-dark)">🎯 Double points!</span>{/if}
    </div>

    {#if s.phase === 'pguess'}
      {#key f.id}
        <figure class="photo pop-in">
          <img src={photoUrl(f.id)} alt="Where is this?" />
          <figcaption>📷 {place.credit} · Wikimedia Commons</figcaption>
        </figure>
      {/key}
      <div class="under">
        <div class="sticker big tilt-r">🗺️ Where in the world is this?</div>
        {#if f.hint}<div class="sticker hint pop-in">🧭 Hint: {f.hint}</div>{/if}
        {#if f.rush > 0}
          {#key f.rush}<div class="sticker rush pop-in">⏩ {s.players[f.rushBy]?.name || 'Someone'} locked in. Faster!</div>{/key}
        {/if}
      </div>
      <div class="locks">
        {#each players as p (p.id)}
          <div class="lock" class:on={!!f.pins[p.id]}>
            <Avatar src={avatars[p.id]} color={colorOf(p)} name={p.name} size={48} />
            <span>{f.pins[p.id] ? '📍' : '🤔'}</span>
          </div>
        {/each}
      </div>
      <div class="tw" class:rushed={f.rush > 0}>
        <Timer until={f.until} total={T.guess + T.intro} {now} /><span class="secs-big">{secs(f.until)}</span>
      </div>

    {:else if s.phase === 'preveal' && f.answer}
      <div class="reveal">
        <div class="mapcard">
          <PinMap mode="show" {pins} answer={{ lat: f.answer.lat, lng: f.answer.lng }} />
        </div>
        <aside class="side slide-up">
          <img class="thumb" src={photoUrl(f.id)} alt={f.answer.name} />
          <h2 class="pname">{f.answer.name}</h2>
          <p class="where">📌 {f.answer.where}</p>
          <p class="fact">💡 {f.answer.fact}</p>
          <div class="results">
            {#each rows as r, i (r.id)}
              <div class="res slide-up" class:faded={!r.best} style="animation-delay:{1200 + i * 250}ms; --c:{colorOf(r)}">
                <span class="rank">{i + 1}</span>
                <Avatar src={avatars[r.id]} color={colorOf(r)} name={r.name} size={38} />
                <span class="rn">{r.name}</span>
                <span class="km">{r.km <= BULLSEYE_KM ? '🎯' : formatKm(r.km)}</span>
                <span class="rp">{r.best ? `+${r.pts}` : ''}</span>
              </div>
            {:else}
              <p class="muted">Nobody dropped a pin!</p>
            {/each}
          </div>
        </aside>
      </div>
    {/if}
  </section>
{/if}

<style>
  .main {
    flex: 1; display: flex; flex-direction: column; gap: 0.9rem; align-items: center; justify-content: center;
    padding: 0.3rem 2.5rem 1rem; max-width: 1500px; width: 100%; margin: 0 auto; position: relative; z-index: 1; min-height: 0;
  }
  .qhead { display: flex; gap: 0.7rem; font-size: 1.45rem; }
  .photo { margin: 0; position: relative; max-width: 100%; display: flex; flex-direction: column; align-items: center; }
  .photo img {
    max-height: max(200px, calc(100vh - 480px)); max-width: min(100%, 1150px); border-radius: 26px; display: block; object-fit: contain;
    border: 6px solid #fff; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
  }
  figcaption { font-size: 0.8rem; opacity: 0.6; margin-top: 0.35rem; text-align: center; }
  .under { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; justify-content: center; }
  .sticker.big { font-size: 1.7rem; }
  .hint { font-size: 1.4rem; background: var(--sun); color: #3a2a00; }
  .locks { display: flex; gap: 0.9rem; flex-wrap: wrap; justify-content: center; }
  .lock { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; opacity: 0.5; transition: all 0.2s; }
  .lock.on { opacity: 1; transform: translateY(-4px); }
  .tw { width: 100%; max-width: 640px; display: flex; align-items: center; gap: 1rem; position: relative; }
  .tw.rushed .secs-big { color: #ff8a1f; animation: rush-beat 0.5s ease-in-out infinite alternate; }
  .rush { font-size: 1.4rem; background: #ff8a1f; color: #fff; box-shadow: 0 8px 20px -6px rgba(255, 138, 31, 0.7); }
  @keyframes rush-beat { to { transform: scale(1.18); } }
  .secs-big { font-family: var(--font-display); font-size: 1.8rem; min-width: 2.5rem; }

  .reveal { display: grid; grid-template-columns: 1fr 380px; gap: 1.2rem; width: 100%; height: max(320px, calc(100vh - 250px)); }
  .mapcard { border-radius: 26px; border: 6px solid #fff; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5); overflow: hidden; }
  .side {
    background: #fff; color: #2b2240; border-radius: 26px; padding: 1rem; display: flex; flex-direction: column; gap: 0.45rem;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); overflow: hidden; min-height: 0;
  }
  .side > * { flex: none; }
  /* The photo gives way first, so every result row always fits (nobody scrolls a TV). */
  .side > .thumb { flex: 0 1 150px; min-height: 56px; width: 100%; object-fit: cover; border-radius: 16px; }
  .pname { margin: 0; font-size: 1.9rem; line-height: 1.1; color: #ff8a1f; }
  .where { margin: 0; font-weight: 900; }
  .fact { margin: 0; font-size: 0.98rem; color: #5b5270; }
  .results { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.3rem; }
  .res {
    display: flex; align-items: center; gap: 0.5rem; background: #f3eefc; border-radius: 14px; padding: 0.3rem 0.6rem;
    font-weight: 900; animation-fill-mode: both;
  }
  .res.faded { opacity: 0.55; }
  .rank { font-family: var(--font-display); width: 1.4rem; text-align: center; color: var(--c); font-size: 1.3rem; }
  .rn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .km { color: #5b5270; }
  .rp { font-family: var(--font-display); color: var(--green-dark); min-width: 3.4rem; text-align: right; font-size: 1.2rem; }
</style>
