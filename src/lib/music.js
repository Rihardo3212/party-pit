// Background music: a tiny step sequencer that plays original game-show style loops
// with synthesized instruments. Tracks: lobby, board, think, final, sneaky, chill.

import { ac, noise } from './sound.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

let master = null;
let current = null;      // track name
let track = null;        // track object
let step = 0;
let nextTime = 0;
let timer = null;
let enabled = localStorage.getItem('bb-music') !== '0';
const VOL = 0.5;

export function musicEnabled() { return enabled; }
export function setMusicEnabled(on) {
  enabled = on;
  localStorage.setItem('bb-music', on ? '1' : '0');
  if (!on) stopLoop();
  else if (current) play(current, true);
}

function ensure() {
  const c = ac();
  if (!c) return null;
  if (!master) {
    master = c.createGain();
    master.gain.value = VOL;
    duckGain = c.createGain();
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(duckGain).connect(comp).connect(c.destination);
  }
  return c;
}

// Turn the music down while the presenter talks.
let duckGain = null;
export function duck(on) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime;
  duckGain.gain.cancelScheduledValues(t);
  duckGain.gain.setValueAtTime(duckGain.gain.value, t);
  duckGain.gain.linearRampToValueAtTime(on ? 0.28 : 1, t + (on ? 0.15 : 0.6));
}

/* ---------- instruments ---------- */

function env(g, t, a, peak, d, sustain = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}

function osc(c, type, freq, t, dur, vol, dest, { attack = 0.005, filter = null, q = 1, detune = 0 } = {}) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  const g = c.createGain();
  env(g, t, attack, vol, dur);
  let node = o;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filter, t);
    f.Q.value = q;
    o.connect(f);
    node = f;
  }
  node.connect(g).connect(dest);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

const I = {
  kick(c, t) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    env(g, t, 0.003, 0.9, 0.22);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.3);
  },
  snare(c, t, vol = 0.35) {
    const n = noise();
    const f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1400;
    const g = c.createGain();
    env(g, t, 0.002, vol, 0.14);
    n.connect(f).connect(g).connect(master);
    n.start(t, Math.random()); n.stop(t + 0.2);
    osc(c, 'triangle', 190, t, 0.07, vol * 0.5, master);
  },
  clap(c, t) {
    for (let k = 0; k < 3; k++) {
      const n = noise();
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.9;
      const g = c.createGain();
      env(g, t + k * 0.012, 0.002, 0.28, 0.08);
      n.connect(f).connect(g).connect(master);
      n.start(t + k * 0.012, Math.random()); n.stop(t + 0.15);
    }
  },
  hat(c, t, open = false, vol = 0.09) {
    const n = noise();
    const f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7500;
    const g = c.createGain();
    env(g, t, 0.002, vol, open ? 0.18 : 0.035);
    n.connect(f).connect(g).connect(master);
    n.start(t, Math.random()); n.stop(t + 0.25);
  },
  bass(c, t, m, dur, vol = 0.28) {
    osc(c, 'sawtooth', mtof(m), t, dur, vol, master, { filter: 520, q: 7 });
    osc(c, 'sine', mtof(m), t, dur, vol * 0.7, master);
  },
  stab(c, t, notes, dur = 0.12, vol = 0.05) {
    for (const m of notes) {
      osc(c, 'sawtooth', mtof(m), t, dur, vol, master, { filter: 2600, q: 2, detune: -6 });
      osc(c, 'square', mtof(m), t, dur, vol * 0.6, master, { filter: 2600, detune: 6 });
    }
  },
  pluck(c, t, m, dur = 0.25, vol = 0.09) {
    osc(c, 'triangle', mtof(m), t, dur, vol, master);
    osc(c, 'sine', mtof(m + 12), t, dur * 0.6, vol * 0.4, master);
  },
  bell(c, t, m, dur = 0.6, vol = 0.07) {
    osc(c, 'sine', mtof(m), t, dur, vol, master);
    osc(c, 'sine', mtof(m) * 2.76, t, dur * 0.4, vol * 0.35, master);
  },
  pad(c, t, notes, dur, vol = 0.035) {
    for (const m of notes) {
      osc(c, 'sawtooth', mtof(m), t, dur, vol, master, { attack: 0.35, filter: 900, detune: -8 });
      osc(c, 'sawtooth', mtof(m), t, dur, vol, master, { attack: 0.35, filter: 900, detune: 8 });
    }
  },
  tom(c, t, m = 40, vol = 0.5) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(mtof(m) * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.08);
    env(g, t, 0.003, vol, 0.45);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.6);
  },
  block(c, t, hi = true) {
    osc(c, 'sine', hi ? 1700 : 1250, t, 0.035, 0.12, master);
  }
};

/* ---------- tracks (all original) ---------- */
// Each track: bpm, swing, bars, and play(c, t, step, bar, stepDur).
// Step = 16th note within the bar (0-15).

const TRACKS = {
  // Funky game-show groove: Dm7 – G7 – Em7 – A7
  lobby: {
    bpm: 108, swing: 0.14, bars: 4,
    play(c, t, s, bar, sd) {
      const roots = [38, 43, 40, 45];
      const chords = [[62, 65, 69, 72], [59, 62, 65, 67], [59, 62, 64, 67], [61, 64, 67, 69]];
      const r = roots[bar];
      if (s === 0 || s === 10) I.kick(c, t);
      if (s === 7 && bar % 2 === 1) I.kick(c, t);
      if (s === 4 || s === 12) I.snare(c, t, 0.3);
      if (s % 2 === 0) I.hat(c, t, s === 14, s % 4 === 2 ? 0.1 : 0.06);
      const bassLine = { 0: 0, 3: 12, 6: 0, 8: 7, 10: 10, 11: 12, 14: 7 };
      if (bassLine[s] !== undefined) I.bass(c, t, r + bassLine[s], sd * (s === 0 ? 2.2 : 1.2));
      if (s === 2 || s === 7 || s === 10) I.stab(c, t, chords[bar], 0.11);
      // little bell hook on the 4th bar
      const hook = { 0: 81, 2: 79, 4: 76, 6: 74, 8: 76, 12: 81 };
      if (bar === 3 && hook[s]) I.bell(c, t, hook[s], 0.4, 0.05);
      if (bar === 1 && (s === 12 || s === 14)) I.bell(c, t, s === 12 ? 74 : 77, 0.35, 0.045);
    }
  },
  // Bouncy board music: C – Am – F – G
  board: {
    bpm: 120, swing: 0.05, bars: 4,
    play(c, t, s, bar, sd) {
      const roots = [36, 33, 41, 43];
      const arps = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
      const r = roots[bar];
      if (s % 4 === 0) I.kick(c, t);
      if (s === 4 || s === 12) I.clap(c, t);
      if (s % 4 === 2) I.hat(c, t, false, 0.08);
      if (s % 4 === 0) I.bass(c, t, r + (s === 8 ? 12 : 0), sd * 1.6, 0.24);
      if (s % 4 === 2) I.bass(c, t, r + 12, sd * 0.8, 0.14);
      if (s % 2 === 0) I.pluck(c, t, arps[bar][(s / 2) % 4] + 12, 0.18, 0.05);
      if (bar === 3 && s >= 12 && s % 2 === 0) I.pluck(c, t, 79 + (s - 12), 0.15, 0.06);
    }
  },
  // Quiet thinking pulse while a question is up
  think: {
    bpm: 100, swing: 0, bars: 4,
    play(c, t, s, bar, sd) {
      const root = bar === 3 ? 46 : 45;
      if (s % 2 === 0) I.bass(c, t, root, sd * 0.9, 0.16);
      if (s % 4 === 2) I.block(c, t, s % 8 === 2);
      if (s === 0) I.kick(c, t);
      if (s === 0 && bar === 0) I.pad(c, t, [57, 60, 64], sd * 30, 0.02);
      if (s === 0 && bar === 2) I.pad(c, t, [57, 62, 65], sd * 30, 0.02);
    }
  },
  // Sneaky tiptoe groove for Fake Out (A minor)
  sneaky: {
    bpm: 98, swing: 0.18, bars: 4,
    play(c, t, s, bar, sd) {
      const walk = [[45, 48, 52, 55], [41, 45, 48, 52], [38, 41, 45, 48], [40, 44, 47, 44]];
      if (s % 4 === 0) I.bass(c, t, walk[bar][s / 4], sd * 1.4, 0.22);
      if (s === 4 || s === 12) I.clap(c, t);
      if (s % 2 === 0) I.hat(c, t, false, 0.05);
      const tip = { 2: 76, 6: 77, 10: 76, 14: 75 };
      if (bar % 2 === 0 && tip[s]) I.pluck(c, t, tip[s], 0.12, 0.07);
      if (bar === 3 && (s === 8 || s === 11 || s === 14)) I.pluck(c, t, s === 14 ? 69 : 72, 0.18, 0.07);
      if (bar === 1 && s === 0) I.bell(c, t, 81, 0.5, 0.04);
    }
  },
  // Laid-back lo-fi for Doodle Dash: Fmaj7 – Em7 – Dm7 – Cmaj7
  chill: {
    bpm: 84, swing: 0.16, bars: 4,
    play(c, t, s, bar, sd) {
      const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
      const roots = [29, 28, 26, 24];
      if (s === 0 || s === 10) I.kick(c, t);
      if (s === 8) I.snare(c, t, 0.16);
      if (s % 2 === 0) I.hat(c, t, false, 0.045);
      if (s === 0) I.pad(c, t, chords[bar], sd * 15, 0.022);
      if (s === 0 || s === 10) I.bass(c, t, roots[bar] + 12, sd * 4, 0.18);
      const mel = [{ 4: 72, 7: 74 }, { 2: 71, 6: 67 }, { 4: 69, 6: 72, 10: 74 }, { 0: 71, 8: 67 }];
      if (mel[bar][s]) I.bell(c, t, mel[bar][s], 0.7, 0.04);
    }
  },
  // Dramatic final round: Am – F – Dm – E
  final: {
    bpm: 84, swing: 0, bars: 4,
    play(c, t, s, bar, sd) {
      const chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
      const roots = [33, 29, 26, 28];
      if (s === 0) I.pad(c, t, chords[bar], sd * 16, 0.03);
      if (s === 0 || s === 8) I.tom(c, t, roots[bar] + 12, 0.45);
      if (s % 2 === 0) I.block(c, t, s % 4 === 0);
      if (s === 0) I.bass(c, t, roots[bar] + 12, sd * 14, 0.2);
      if (bar === 3 && s >= 8 && s % 2 === 0) I.pluck(c, t, 64 + (s - 8), 0.25, 0.06);
    }
  }
};

/* ---------- transport ---------- */

function schedule() {
  const c = ac();
  if (!c || !track) return;
  const sd = 60 / track.bpm / 4;
  while (nextTime < c.currentTime + 0.15) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % track.bars;
    const swing = s % 2 === 1 ? track.swing * sd : 0;
    try { track.play(c, nextTime + swing, s, bar, sd); } catch { /* ignore */ }
    nextTime += sd;
    step += 1;
  }
}

function stopLoop() {
  clearInterval(timer);
  timer = null;
}

export function play(name, force = false) {
  if (name === current && timer && !force) return;
  current = name;
  if (!enabled || !name) { stopLoop(); return; }
  const c = ensure();
  if (!c) return;
  const startNew = () => {
    if (current !== name || !enabled) return;
    track = TRACKS[name];
    step = 0;
    nextTime = c.currentTime + 0.05;
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(0.0001, c.currentTime);
    master.gain.exponentialRampToValueAtTime(VOL, c.currentTime + 0.4);
    if (!timer) timer = setInterval(schedule, 25);
  };
  if (timer) {
    // quick fade between tracks
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(master.gain.value, c.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
    stopLoop();
    setTimeout(startNew, 260);
  } else {
    startNew();
  }
}

// Beats per minute of the loop that is playing right now (0 = silent). The background pulses to it.
export function musicBpm() { return timer && track && enabled ? track.bpm : 0; }

export function stopMusic() {
  current = null;
  stopLoop();
}
