<script>
  // Move games on the phone. Each phone measures its own motion with its own clock and sends one
  // result at the end (plus progress for the big screen). Every game has a touch fallback.
  import { onDestroy } from 'svelte';
  import ReactBar from '../../components/ReactBar.svelte';
  import { GAMES, BEAT, FLIPS } from '../../engine/move.js';
  import { makeMaze } from '../../engine/maze.js';
  import { MODES } from '../../lib/modes.js';
  import { sensors, askMotion, onMotion, onTilt, onShake, linear, tiltOf, yawRate, openMic, micLevel, closeMic } from '../../lib/sensors.svelte.js';
  import { sfx } from '../../lib/sound.js';

  let { s, id, myUnit, send, react, db } = $props();

  const v = $derived(s.move);
  const mode = $derived(v ? MODES[v.game] : null);
  const game = $derived(v ? GAMES[v.game] : null);
  const mine = $derived(v?.res?.[id]);
  const out = $derived(v?.game === 'pong' && !!v?.out?.[id]);
  const sNow = () => (db?.now ? db.now() : Date.now());

  // ---------- per-round state ----------
  let t = $state(0); // ms since this phone saw "go"
  let startAt = 0;
  let timer = null;
  let sent = $state(false);
  let local = $state(null);
  let st = $state({});
  let offs = [];
  let lastProg = 0;

  const fresh = () => ({
    taps: 0, power: 0, fizz: 0, cracked: false, holding: false, turns: 0, air: 0, floor: 1, popped: false,
    phase: 'cast', dist: 0, rem: 0, tension: 0, tugUntil: 0, nextTug: 0, snaps: 0,
    pulls: 0, swingFlash: 0,
    flip: 0, flips: [], flying: false, landAt: 0, height: 0, flat: true, total: 0, flipMsg: '',
    bx: 0.5, by: 0.5, vx: 0, vy: 0, tx: 0, ty: 0, done: false, pct: 0,
    beatScore: 0, hits: [], beatIdx: -1, lastHit: '',
    raised: false, holstered: false, beta: 0, gamma: 0
  });

  function stopAll() {
    clearInterval(timer);
    timer = null;
    for (const off of offs) off();
    offs = [];
  }

  let goKey = null;
  $effect(() => {
    const key = v && s.phase === 'vgo' ? `${v.game}-${v.round}` : null;
    if (key === goKey) return;
    goKey = key;
    stopAll();
    sent = false;
    local = null;
    st = fresh();
    if (key) begin();
  });
  onDestroy(() => { stopAll(); closeMic(); });

  function finish(data) {
    if (sent) return;
    sent = true;
    local = data;
    if (!['pong', 'tug'].includes(v.game)) stopAll();
    send('vres', data);
  }

  function prog(p, x = '', every = 350) {
    const n = performance.now();
    if (n - lastProg < every) return;
    lastProg = n;
    send('vprog', { p: Math.round(p), x });
  }

  // ---------- start each game ----------
  function begin() {
    startAt = performance.now();
    t = 0;
    lastProg = 0;
    const g = v.game;
    const lin = linear();
    if (g === 'soda') {
      let last = null;
      offs.push(onMotion((e) => {
        if (sent || t > game.time) return;
        if (last) st.power += Math.hypot(e.g.x - last.x, e.g.y - last.y, e.g.z - last.z);
        last = e.g;
      }));
    }
    if (g === 'egg') {
      offs.push(onMotion((e) => {
        if (sent || st.cracked || t < 1200) return;
        const tl = tiltOf(e.g);
        const a = lin(e);
        if (tl.flat > 38 || Math.hypot(a.x, a.y, a.z) > 7.5) crack();
      }));
    }
    if (g === 'spin') {
      offs.push(onMotion((e) => {
        if (sent || t > game.time) return;
        const w = Math.abs(yawRate(e));
        if (w > 40) st.turns += (w * e.dt) / 360;
      }));
    }
    if (g === 'balloon') {
      openMic();
      st.floor = 1;
    }
    if (g === 'reel') {
      offs.push(onShake((m) => { if (st.phase === 'cast' && !sent) cast(m); }, { threshold: 11, cooldown: 600 }));
      offs.push(onMotion((e) => {
        if (st.phase !== 'reel' || sent) return;
        const w = Math.hypot(e.r.a, e.r.b, e.r.g);
        if (w > 90) reelBy(((w * e.dt) / 360) * 5, w > 160);
      }));
    }
    if (g === 'pong') {
      offs.push(onShake(() => swing(), { threshold: 12, cooldown: 450 }));
    }
    if (g === 'tug') {
      offs.push(onShake(() => pull(), { threshold: 11, cooldown: 230 }));
    }
    if (g === 'flip') {
      offs.push(onMotion((e) => {
        const tl = tiltOf(e.g);
        st.flat = tl.flat < 32;
        if (sent || st.flying || st.flip >= FLIPS) return;
        const a = lin(e);
        const m = Math.hypot(a.x, a.y, a.z);
        if (m > 11 && st.flat) toss(m);
      }));
    }
    if (g === 'maze') {
      maze = makeMaze(v.seed || 1);
      st.bx = 0.5; st.by = 0.5;
      offs.push(onTilt((o) => { st.tx = Math.max(-1, Math.min(1, o.gamma / 25)); st.ty = Math.max(-1, Math.min(1, o.beta / 25)); }));
    }
    if (g === 'beat') {
      offs.push(onShake(() => beatHit(), { threshold: 12, cooldown: 220 }));
    }
    if (g === 'noon') {
      offs.push(onTilt((o) => {
        st.beta = o.beta;
        if (o.beta < -40) st.holstered = true;
        st.raised = Math.abs(o.beta) < 40 || Math.abs(o.beta) > 140;
      }));
    }
    timer = setInterval(loop, 30);
  }

  let lastLoop = 0;
  function loop() {
    const n = performance.now();
    const dt = lastLoop ? Math.min(0.1, (n - lastLoop) / 1000) : 0.03;
    lastLoop = n;
    t = n - startAt;
    if (!v || s.phase !== 'vgo') return;
    const g = v.game;
    if (sent && !['pong', 'tug'].includes(g)) return;
    const end = t >= game.time;
    if (g === 'soda') {
      st.fizz = Math.round(st.power / 10) + st.taps * 6;
      prog(Math.min(100, st.fizz / 10), `${st.fizz}`);
      if (end) { finish({ score: st.fizz, label: `${st.fizz} fizz` }); sfx.ding(); }
    }
    if (g === 'egg') {
      if (!sensors.live && t > 1500 && !st.holding && !st.cracked) crack();
      prog((Math.min(t, game.time) / game.time) * 100, '🥚');
      if (end && !st.cracked) { finish({ score: game.time, label: '🥚 Survived!' }); sfx.correct(); }
    }
    if (g === 'spin') {
      prog(Math.min(100, st.turns * 8), st.turns.toFixed(1));
      if (end) { const tt = Math.round(st.turns * 10) / 10; finish({ score: Math.round(tt * 10), label: `${tt.toFixed(1)} turns` }); sfx.ding(); }
    }
    if (g === 'balloon') {
      if (sensors.mic) {
        const lvl = micLevel();
        if (t < 600) st.floor = Math.min(st.floor, lvl);
        else st.air += Math.max(0, lvl - st.floor - 0.06) * dt * 38;
      }
      if (st.air >= 100 && !st.popped) {
        st.popped = true;
        sfx.boom();
        navigator.vibrate?.(300);
        finish({ score: 100000 - Math.round(t), label: `Popped in ${(t / 1000).toFixed(1)} s` });
        return;
      }
      prog(st.air, '');
      if (end) finish({ score: Math.round(st.air), label: `${Math.round(st.air)}% full` });
    }
    if (g === 'reel') reelLoop(dt, end);
    if (g === 'flip') {
      if (st.flying && performance.now() >= st.landAt) land();
      if (end && !st.flying) finish({ score: st.total, label: `${st.total} cm` });
    }
    if (g === 'maze') mazeLoop(dt, end);
    if (g === 'beat') beatLoop(end);
    if (g === 'noon') noonLoop();
    if (g === 'tug') prog(st.pulls, '', 300);
  }

  // ---------- Egg Run ----------
  function crack() {
    if (st.cracked || sent) return;
    st.cracked = true;
    sfx.wrong();
    navigator.vibrate?.([200, 60, 200]);
    send('vprog', { p: Math.round((t / game.time) * 100), x: '🍳' });
    finish({ score: Math.round(t), label: `🍳 Cracked at ${(t / 1000).toFixed(1)} s` });
  }

  // ---------- Spin fallback: draw circles on a dial ----------
  let lastAng = null;
  function dialMove(e) {
    if (sensors.live || sent) return;
    const r = e.currentTarget.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    if (lastAng !== null) {
      let d = a - lastAng;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      st.turns += Math.abs(d) / (2 * Math.PI) / 2; // finger circles count half
    }
    lastAng = a;
  }

  // ---------- Reel It In ----------
  function cast(m) {
    st.dist = Math.round(Math.min(100, 30 + m * 2.5));
    st.rem = st.dist;
    st.phase = 'reel';
    st.nextTug = t + 2500 + Math.random() * 2000;
    sfx.whoosh();
    navigator.vibrate?.(60);
  }
  function reelBy(meters, hard) {
    if (t < st.tugUntil) {
      if (hard) st.tension += meters * 9;
      return;
    }
    st.rem = Math.max(0, st.rem - meters);
  }
  let reelHold = false;
  function reelLoop(dt, end) {
    if (st.phase === 'reel') {
      if (reelHold) reelBy(dt * 7, true);
      if (t >= st.nextTug && t > st.tugUntil) {
        st.tugUntil = t + 1300;
        st.nextTug = t + 1300 + 2200 + Math.random() * 2500;
        navigator.vibrate?.([120, 60, 120, 60, 120]);
        sfx.buzz();
      }
      if (t > st.tugUntil) st.tension = Math.max(0, st.tension - dt * 40);
      if (st.tension >= 100) {
        st.tension = 0;
        st.snaps += 1;
        st.rem = Math.min(st.dist, st.rem + 20);
        st.tugUntil = 0;
        sfx.wrong();
        navigator.vibrate?.(400);
      }
      if (st.rem <= 0) {
        sfx.fanfare();
        finish({ score: 100000 - Math.round(t), label: `🐟 Landed in ${(t / 1000).toFixed(1)} s` });
        return;
      }
      prog(((st.dist - st.rem) / st.dist) * 100, t < st.tugUntil ? 'tug' : '');
    }
    if (end) {
      const pct = st.dist ? Math.round(((st.dist - st.rem) / st.dist) * 100) : 0;
      finish({ score: pct, label: st.dist ? `${pct}% reeled` : 'No cast' });
    }
  }

  // ---------- Ping Pong ----------
  const ball = $derived(v?.ball);
  const myBall = $derived(ball && ball.to === id && s.phase === 'vgo');
  const ringK = $derived(myBall && t >= 0 ? Math.max(0, Math.min(1, (ball.hitAt - sNow()) / Math.max(1, ball.hitAt - ball.sentAt))) : 0);
  function swing() {
    if (!myBall || out) return;
    st.swingFlash = performance.now();
    sfx.pop();
    navigator.vibrate?.(30);
    send('vswing', { at: sNow() });
  }

  // ---------- Tug of War ----------
  function pull() {
    if (s.phase !== 'vgo') return;
    st.pulls += 1;
    navigator.vibrate?.(15);
  }
  const mySide = $derived(v?.sides ? (v.sides.a.includes(myUnit) ? 'a' : 'b') : null);

  // ---------- Pancake Flip ----------
  function toss(m) {
    st.height = Math.round(Math.min(150, 20 + m * 4));
    st.flying = true;
    st.landAt = performance.now() + 500 + st.height * 8;
    st.flipMsg = '';
    sfx.whoosh();
  }
  let flipPower = $state(0);
  function tapToss() {
    if (sensors.live || st.flying || st.flip >= FLIPS || sent) return;
    const p = Math.abs(Math.sin(performance.now() / 380)); // timing meter
    flipPower = p;
    toss(3 + p * 30);
  }
  let caughtTap = 0;
  function tapCatch() { caughtTap = performance.now(); }
  function land() {
    st.flying = false;
    st.flip += 1;
    const ok = sensors.live ? st.flat : Math.abs(caughtTap - st.landAt) < 450;
    if (ok) { st.total += st.height; st.flips = [...st.flips, st.height]; st.flipMsg = `🥞 +${st.height} cm`; sfx.correct(); }
    else { st.flips = [...st.flips, 0]; st.flipMsg = '💥 Dropped!'; sfx.wrong(); navigator.vibrate?.(200); }
    prog((st.flip / FLIPS) * 100, `${st.total}`, 0);
    if (st.flip >= FLIPS) finish({ score: st.total, label: `${st.total} cm` });
  }

  // ---------- Tilt Maze ----------
  let maze = null;
  let canvas = $state(null);
  let drag = null;
  function mazeDown(e) { drag = e; e.currentTarget.setPointerCapture?.(e.pointerId); }
  function mazeMove(e) { if (drag) drag = e; }
  function mazeUp() { drag = null; if (!sensors.live) { st.tx = 0; st.ty = 0; } }
  function mazeLoop(dt, end) {
    if (!maze) return;
    const { cols, rows, walls } = maze;
    if (drag && canvas) {
      const r = canvas.getBoundingClientRect();
      const fx = ((drag.clientX - r.left) / r.width) * cols;
      const fy = ((drag.clientY - r.top) / r.height) * rows;
      st.tx = Math.max(-1, Math.min(1, (fx - st.bx) / 1.5));
      st.ty = Math.max(-1, Math.min(1, (fy - st.by) / 1.5));
    }
    st.vx = (st.vx + st.tx * dt * 14) * 0.9;
    st.vy = (st.vy + st.ty * dt * 14) * 0.9;
    const rad = 0.28;
    const step = (axis, d) => {
      const cx = Math.floor(st.bx), cy = Math.floor(st.by);
      const w = walls[cy]?.[cx];
      if (!w) return;
      if (axis === 'x') {
        let nx = st.bx + d;
        if (d > 0 && w.e && nx + rad > cx + 1) { nx = cx + 1 - rad; st.vx = 0; }
        if (d < 0 && w.w && nx - rad < cx) { nx = cx + rad; st.vx = 0; }
        nx = Math.max(rad, Math.min(cols - rad, nx));
        // Keep away from wall corners when crossing between cells.
        if (Math.floor(nx) !== cx) {
          const fy = st.by - cy;
          if (fy < rad || fy > 1 - rad) { nx = d > 0 ? cx + 1 - rad : cx + rad; st.vx = 0; }
        }
        st.bx = nx;
      } else {
        let ny = st.by + d;
        if (d > 0 && w.s && ny + rad > cy + 1) { ny = cy + 1 - rad; st.vy = 0; }
        if (d < 0 && w.n && ny - rad < cy) { ny = cy + rad; st.vy = 0; }
        ny = Math.max(rad, Math.min(rows - rad, ny));
        if (Math.floor(ny) !== cy) {
          const fx = st.bx - cx;
          if (fx < rad || fx > 1 - rad) { ny = d > 0 ? cy + 1 - rad : cy + rad; st.vy = 0; }
        }
        st.by = ny;
      }
    };
    const max = 0.25;
    step('x', Math.max(-max, Math.min(max, st.vx * dt * 6)));
    step('y', Math.max(-max, Math.min(max, st.vy * dt * 6)));
    const cx = Math.floor(st.bx), cy = Math.floor(st.by);
    const d = maze.dist[cy]?.[cx] ?? maze.max;
    st.pct = Math.round(((maze.max - d) / maze.max) * 100);
    drawMaze();
    if (cx === cols - 1 && cy === rows - 1) {
      sfx.fanfare();
      finish({ score: 100000 - Math.round(t), label: `🏁 Out in ${(t / 1000).toFixed(1)} s` });
      return;
    }
    prog(st.pct, '');
    if (end) finish({ score: st.pct, label: `${st.pct}% of the way` });
  }
  function drawMaze() {
    if (!canvas || !maze) return;
    const { cols, rows, walls } = maze;
    const W = canvas.width, H = canvas.height;
    const cw = W / cols, ch = H / rows;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#1c1630';
    c.fillRect(0, 0, W, H);
    c.font = `${Math.floor(cw * 0.6)}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🏁', (cols - 0.5) * cw, (rows - 0.5) * ch);
    c.strokeStyle = '#a78bfa';
    c.lineWidth = Math.max(4, cw * 0.1);
    c.lineCap = 'round';
    c.beginPath();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const w = walls[y][x];
      const X = x * cw, Y = y * ch;
      if (w.n) { c.moveTo(X, Y); c.lineTo(X + cw, Y); }
      if (w.w) { c.moveTo(X, Y); c.lineTo(X, Y + ch); }
      if (y === rows - 1 && w.s) { c.moveTo(X, Y + ch); c.lineTo(X + cw, Y + ch); }
      if (x === cols - 1 && w.e) { c.moveTo(X + cw, Y); c.lineTo(X + cw, Y + ch); }
    }
    c.stroke();
    c.fillStyle = '#facc15';
    c.beginPath();
    c.arc(st.bx * cw, st.by * ch, Math.min(cw, ch) * 0.26, 0, Math.PI * 2);
    c.fill();
  }

  // ---------- Beat Keeper ----------
  const gap = 60000 / BEAT.bpm;
  function beatHit() {
    if (sent || t < (BEAT.lead - 0.5) * gap) return;
    const i = Math.round(t / gap) - BEAT.lead;
    if (i < 0 || i >= BEAT.count || st.hits.includes(i)) { st.lastHit = '❌'; return; }
    const off = Math.abs(t - (i + BEAT.lead) * gap);
    if (off > 260) { st.lastHit = '❌ Off beat'; return; }
    const pts = Math.round(100 * (1 - off / 260));
    st.hits = [...st.hits, i];
    st.beatScore += pts;
    st.lastHit = off < 70 ? '🎯 Perfect!' : off < 150 ? '👍 Good' : '😬 OK';
    navigator.vibrate?.(20);
  }
  function beatLoop(end) {
    const i = Math.floor(t / gap);
    if (i !== st.beatIdx && i < BEAT.lead + BEAT.count) {
      st.beatIdx = i;
      if (i < BEAT.lead) sfx.tock(); else sfx.tick();
    }
    prog(Math.min(100, st.beatScore / 16), `${st.beatScore}`);
    if (end || t > (BEAT.lead + BEAT.count + 1) * gap) finish({ score: st.beatScore, label: `${st.beatScore} pts · ${st.hits.length}/${BEAT.count} beats` });
  }
  const bounce = $derived(Math.abs(Math.sin((t / gap) * Math.PI)));

  // ---------- High Noon ----------
  const drawn = $derived(v?.drawAt && sNow() >= v.drawAt && t > 0);
  function noonLoop() {
    if (sent) return;
    if (v.drawAt && sNow() > v.drawAt + 3500) finish({ score: -1, label: '🐢 Too slow' });
  }
  function fire() {
    if (sent || s.phase !== 'vgo') return;
    const now = sNow();
    if (!v.drawAt || now < v.drawAt) {
      sfx.wrong();
      navigator.vibrate?.(300);
      finish({ score: -1, label: '🚫 Too early!', foul: true });
      return;
    }
    const ms = Math.round(now - v.drawAt);
    sfx.boom();
    navigator.vibrate?.(80);
    finish({ score: 10000 - ms, label: `💥 ${ms} ms` });
  }

  // ---------- taps ----------
  function tap(e) {
    e?.preventDefault?.();
    if (sent || s.phase !== 'vgo') return;
    const g = v.game;
    if (g === 'soda' && !sensors.live) { st.taps += 1; navigator.vibrate?.(8); }
    if (g === 'balloon' && !sensors.mic) { st.air = Math.min(100, st.air + 2.2); navigator.vibrate?.(8); }
    if (g === 'tug' && !sensors.live) pull();
    if (g === 'beat') beatHit();
  }

  const left = (ms) => Math.max(0, Math.ceil((ms - t) / 1000));
  const askNeeded = $derived(sensors.ask && !['balloon'].includes(v?.game));
  async function allow() { await askMotion(); }
  async function allowMic() { await openMic(); }
</script>

{#if v && game && mode}
  {#if s.phase === 'vready'}
    <div class="stack center pop-in">
      <span class="icon-tile" style="--sz:90px; --mc:{mode.color}">{mode.icon}</span>
      <h2>{mode.name}</h2>
      <p class="how">{game.hold}</p>
      {#if v.game === 'pong' || v.game === 'tug'}<p class="muted">{mode.how[1]}</p>{/if}
      {#if askNeeded}
        <button class="btn sun big block" onclick={allow}>📳 Allow motion</button>
      {/if}
      {#if v.game === 'balloon' && !sensors.mic}
        <button class="btn sun big block" onclick={allowMic}>🎤 Allow microphone</button>
      {/if}
      <p class="muted">Get ready…</p>
    </div>

  {:else if s.phase === 'vgo'}
    {#if out}
      <div class="stack center pop-in"><div class="bigemoji">😵</div><h2>You're out!</h2><p class="muted">Watch the rally on the big screen.</p></div>
    {:else if sent && !['tug'].includes(v.game)}
      <div class="stack center pop-in">
        <div class="bigemoji">{local?.foul ? '🚫' : local?.score < 0 ? '🐢' : '✅'}</div>
        <h2>{local?.label}</h2>
        <p class="muted">Waiting for the others…</p>
      </div>

    {:else if v.game === 'noon'}
      <button class="pad" class:draw={drawn} style="--pc:{drawn ? '#dc2626' : '#78350f'}" onpointerdown={fire}>
        {#if drawn}
          <span class="hugeT">FIRE!</span><span class="subT">{sensors.live && !st.raised ? 'Raise it and tap!' : 'TAP!'}</span>
        {:else}
          <span class="hugeT">🤠</span>
          <span class="subT">{sensors.live && !st.holstered ? 'Point your phone down at your hip' : 'Steady… wait for DRAW!'}</span>
        {/if}
      </button>

    {:else if v.game === 'soda'}
      <button class="pad" style="--pc:#16a34a" onpointerdown={tap}>
        <div class="can"><div class="fizz" style="height:{Math.min(100, st.fizz / 10)}%"></div><span>🥤</span></div>
        <span class="subT">{sensors.live ? 'SHAKE!' : 'No motion sensor: TAP!'} · {left(game.time)} s</span>
      </button>

    {:else if v.game === 'egg'}
      {#if sensors.live}
        <div class="pad" style="--pc:#ca8a04"><span class="hugeT egg" class:wob={st.cracked}>{st.cracked ? '🍳' : '🥚'}</span><span class="subT">Keep it flat! · {left(game.time)} s</span><span class="task">{v.tasks?.[Math.floor(t / 5000) % (v.tasks?.length || 1)]}</span></div>
      {:else}
        <button class="pad" style="--pc:#ca8a04" onpointerdown={() => (st.holding = true)} onpointerup={() => crack()} onpointerleave={() => st.holding && crack()}>
          <span class="hugeT">{st.holding ? '🥚' : '👇'}</span><span class="subT">{st.holding ? `Keep holding! · ${left(game.time)} s` : 'Hold your finger here!'}</span>
          <span class="task">{v.tasks?.[Math.floor(t / 5000) % (v.tasks?.length || 1)]}</span>
        </button>
      {/if}

    {:else if v.game === 'spin'}
      <div class="pad" style="--pc:#0891b2" onpointermove={dialMove} onpointerup={() => (lastAng = null)} role="presentation">
        <span class="hugeT spinny" style="transform:rotate({st.turns * 360}deg)">🌀</span>
        <span class="hugeT num">{st.turns.toFixed(1)}</span>
        <span class="subT">{sensors.live ? 'SPIN AROUND!' : 'Draw circles with your finger!'} · {left(game.time)} s</span>
      </div>

    {:else if v.game === 'balloon'}
      <button class="pad" style="--pc:#db2777" onpointerdown={tap}>
        <span class="balloon" style="transform:scale({0.4 + st.air / 100})">🎈</span>
        <span class="subT">{sensors.mic ? 'BLOW into the mic!' : 'No mic: TAP to pump!'} · {left(game.time)} s</span>
      </button>

    {:else if v.game === 'reel'}
      {#if st.phase === 'cast'}
        <button class="pad" style="--pc:#0284c7" onpointerdown={() => !sensors.live && cast(4 + Math.random() * 18)}>
          <span class="hugeT">🎣</span><span class="subT">{sensors.live ? 'FLICK your phone forward to cast!' : 'Tap to cast!'}</span>
        </button>
      {:else}
        <div class="pad" class:tug={t < st.tugUntil} style="--pc:#0284c7">
          <span class="hugeT">{t < st.tugUntil ? '⚠️ TUG!' : '🐟'}</span>
          <span class="subT">{Math.ceil(st.rem)} m to go · {left(game.time)} s</span>
          <div class="bar"><div style="width:{Math.min(100, st.tension)}%; background:#ef4444"></div></div>
          <span class="subT">{t < st.tugUntil ? 'STOP reeling!' : sensors.live ? 'Wind your phone in circles!' : ''}</span>
          {#if !sensors.live}
            <button class="btn sun big" onpointerdown={() => (reelHold = true)} onpointerup={() => (reelHold = false)} onpointerleave={() => (reelHold = false)}>Hold to reel</button>
          {/if}
        </div>
      {/if}

    {:else if v.game === 'pong'}
      <button class="pad" class:hit={myBall} style="--pc:{myBall ? '#e11d48' : '#475569'}" onpointerdown={swing}>
        {#if myBall}
          <div class="ring" style="--k:{ringK}"></div>
          <span class="hugeT">🏓</span><span class="subT">SWING when the ring closes!</span>
        {:else}
          <span class="hugeT">👀</span><span class="subT">Watch the ball on the big screen…</span>
        {/if}
      </button>

    {:else if v.game === 'tug'}
      <button class="pad" style="--pc:#a16207" onpointerdown={tap}>
        <span class="hugeT">💪 {st.pulls}</span>
        <span class="subT">{sensors.live ? 'YANK your phone towards you!' : 'TAP TAP TAP!'}</span>
        <div class="rope"><span class="knot" style="left:{50 + (mySide === 'b' ? v.rope : -v.rope) / 2}%">🎀</span></div>
        <span class="subT">◀ Pull it to your side!</span>
      </button>

    {:else if v.game === 'flip'}
      <div class="pad" style="--pc:#d97706">
        <span class="pan" class:up={st.flying} style="--h:{st.height}">🥞</span>
        <span class="subT">{st.flying ? (sensors.live ? 'Hold it FLAT to catch!' : 'Tap CATCH as it lands!') : st.flipMsg || (sensors.live ? 'Flick up to flip!' : 'Tap FLIP!')}</span>
        <span class="subT">Flip {Math.min(st.flip + 1, FLIPS)} of {FLIPS} · {st.total} cm</span>
        {#if !sensors.live}
          {#if st.flying}<button class="btn sun big" onpointerdown={tapCatch}>CATCH!</button>
          {:else}<button class="btn sun big" onpointerdown={tapToss}>FLIP!</button>{/if}
        {/if}
      </div>

    {:else if v.game === 'maze'}
      <div class="mazebox">
        <canvas bind:this={canvas} width="360" height="540" onpointerdown={mazeDown} onpointermove={mazeMove} onpointerup={mazeUp}></canvas>
        <span class="subT">{sensors.live ? 'Tilt to roll' : 'Drag towards where the ball should go'} · {st.pct}% · {left(game.time)} s</span>
      </div>

    {:else if v.game === 'beat'}
      <button class="pad" style="--pc:#4f46e5" onpointerdown={tap}>
        <div class="beatwrap"><span class="ball" style="transform:translateY({-bounce * 110}px)"></span><span class="floor"></span></div>
        <span class="hugeT num">{t < BEAT.lead * gap ? BEAT.lead - Math.floor(t / gap) : st.beatScore}</span>
        <span class="subT">{t < BEAT.lead * gap ? 'Get ready…' : st.lastHit || (sensors.live ? 'Shake on the beat!' : 'Tap on the beat!')}</span>
      </button>
    {/if}

  {:else if s.phase === 'vresult'}
    <div class="stack center pop-in">
      <div class="bigemoji">{v.points[id] === 1000 ? '🥇' : v.points[id] ? '👏' : '😵'}</div>
      <h2>{mine?.label || 'No score'}</h2>
      {#if v.points[id] && v.best[myUnit] === id}<p class="pts">+{v.points[id]}</p>
      {:else if v.points[id]}<p class="muted">{v.points[id]} points. A teammate did better.</p>{/if}
      <ReactBar onReact={react} />
    </div>
  {/if}
{/if}

<style>
  .how { font-size: 1.2rem; font-weight: 800; margin: 0; text-align: center; }
  .pad {
    width: 100%; height: calc(100dvh - 160px); min-height: 320px; border-radius: 32px; border: none;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.7rem;
    background: var(--pc); color: #fff; touch-action: none; user-select: none; position: relative; overflow: hidden;
    box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.6); padding: 1rem; font: inherit;
  }
  .pad.draw { animation: flash 0.25s ease-in-out 3; }
  @keyframes flash { 50% { filter: brightness(1.5); } }
  .pad.tug { animation: shake 0.12s linear infinite; }
  @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
  .hugeT { font-family: var(--font-display); font-size: 4.6rem; line-height: 1; }
  .num { font-size: 3.6rem; }
  .subT { font-weight: 900; font-size: 1.1rem; opacity: 0.95; text-align: center; }
  .task { background: rgba(0, 0, 0, 0.25); border-radius: 14px; padding: 0.4rem 0.8rem; font-weight: 900; }
  .can { width: 110px; height: 190px; border-radius: 26px; background: rgba(0, 0, 0, 0.25); position: relative; overflow: hidden; display: grid; place-items: center; font-size: 3.4rem; }
  .fizz { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(#bbf7d0, #4ade80); transition: height 0.2s; }
  .can span { position: relative; }
  .spinny { font-size: 5rem; transition: transform 0.1s linear; }
  .balloon { font-size: 6rem; transition: transform 0.15s; transform-origin: 50% 90%; }
  .egg.wob { animation: shake 0.2s linear 3; }
  .bar { width: 80%; height: 16px; border-radius: 99px; background: rgba(0, 0, 0, 0.3); overflow: hidden; }
  .bar div { height: 100%; transition: width 0.1s; }
  .ring {
    position: absolute; width: 260px; height: 260px; border-radius: 50%; border: 10px solid #fff;
    transform: scale(calc(0.35 + var(--k) * 1.4)); opacity: 0.8;
  }
  .rope { width: 90%; height: 10px; background: #fde68a; border-radius: 99px; position: relative; margin: 1rem 0; }
  .knot { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: 2rem; transition: left 0.3s; }
  .pan { font-size: 5rem; transition: transform 0.4s cubic-bezier(0.3, 1.6, 0.5, 1); }
  .pan.up { transform: translateY(calc(var(--h) * -1.3px)) rotate(540deg); transition-duration: 0.7s; }
  .mazebox { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  canvas { width: min(92vw, calc((100dvh - 210px) * 0.6667)); aspect-ratio: 2 / 3; border-radius: 20px; touch-action: none; }
  .beatwrap { position: relative; width: 120px; height: 150px; }
  .ball { position: absolute; bottom: 14px; left: 35px; width: 50px; height: 50px; border-radius: 50%; background: #facc15; }
  .floor { position: absolute; bottom: 0; left: 0; right: 0; height: 12px; border-radius: 99px; background: rgba(255, 255, 255, 0.5); }
  .pts { font-family: var(--font-display); font-size: 2.2rem; color: var(--green); margin: 0; }
  @media (prefers-reduced-motion: reduce) { .pad.tug, .pad.draw { animation: none; } }
</style>
