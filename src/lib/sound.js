// Synthesized sound effects (no audio files). Shares one AudioContext with the music.

let ctx = null;
let sfxGain = null;
let noiseBuf = null;
let muted = localStorage.getItem('bb-muted') === '1';

export function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    sfxGain = ctx.createGain();
    sfxGain.gain.value = muted ? 0 : 0.9;
    sfxGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function audioReady() { return !!ctx && ctx.state === 'running'; }
export function unlockAudio() { ac(); }

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  localStorage.setItem('bb-muted', m ? '1' : '0');
  if (sfxGain) sfxGain.gain.value = m ? 0 : 0.9;
}

export function noise() {
  const c = ac();
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  return src;
}

function out() { return sfxGain; }

function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo = null, dest = null) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || out());
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(start, dur, vol, type = 'bandpass', f1 = 2000, f2 = null, q = 1) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + start;
  const n = noise();
  const flt = c.createBiquadFilter();
  flt.type = type;
  flt.Q.value = q;
  flt.frequency.setValueAtTime(f1, t);
  if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(flt).connect(g).connect(out());
  n.start(t, Math.random());
  n.stop(t + dur + 0.05);
}

const BUZZ_PITCH = [196, 233, 262, 294, 330, 175, 220, 247];

export const sfx = {
  pop: () => tone(660, 0, 0.12, 'triangle', 0.2, 990),
  bloop: () => tone(420, 0, 0.1, 'sine', 0.18, 720),
  join: () => { tone(523, 0, 0.12, 'triangle'); tone(784, 0.09, 0.12, 'triangle'); tone(1047, 0.18, 0.2, 'triangle', 0.14); },
  ding: () => { tone(1568, 0, 0.6, 'sine', 0.16); tone(2093, 0, 0.45, 'sine', 0.08); },
  pick: () => { tone(392, 0, 0.09, 'square', 0.07); tone(587, 0.07, 0.09, 'square', 0.07); tone(784, 0.14, 0.18, 'square', 0.07); },
  whoosh: () => hiss(0, 0.45, 0.25, 'bandpass', 400, 4000, 1.5),
  buzz: (i = 0) => {
    const f = BUZZ_PITCH[i % BUZZ_PITCH.length];
    tone(f, 0, 0.45, 'sawtooth', 0.13);
    tone(f * 1.5, 0, 0.45, 'square', 0.06);
  },
  open: () => { tone(880, 0, 0.08, 'sine', 0.14); tone(1320, 0.08, 0.14, 'sine', 0.12); },
  correct: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle', 0.16));
    tone(1568, 0.32, 0.5, 'sine', 0.08);
  },
  applause: (dur = 1.6) => {
    const c = ac();
    if (!c || muted) return;
    for (let i = 0; i < 70; i++) {
      const t = Math.random() * dur;
      hiss(t, 0.05 + Math.random() * 0.05, 0.09 * (1 - t / (dur * 1.3)), 'bandpass', 1200 + Math.random() * 1800, null, 1.2);
    }
  },
  sadTrombone: () => {
    const c = ac();
    if (!c || muted) return;
    const notes = [[392, 0, 0.35], [370, 0.38, 0.35], [349, 0.76, 0.35], [330, 1.14, 1.0]];
    for (const [f, s, d] of notes) {
      const t = c.currentTime + s;
      const o = c.createOscillator();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      const flt = c.createBiquadFilter();
      const g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f / 2;
      lfo.frequency.value = d > 0.5 ? 6 : 0;
      lg.gain.value = d > 0.5 ? 4 : 0;
      lfo.connect(lg).connect(o.frequency);
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(500, t);
      flt.frequency.linearRampToValueAtTime(1100, t + 0.08);
      flt.frequency.linearRampToValueAtTime(600, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
      g.gain.setValueAtTime(0.22, t + d - 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(flt).connect(g).connect(out());
      o.start(t); lfo.start(t);
      o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
    }
  },
  wrong: () => { tone(220, 0, 0.16, 'square', 0.1); tone(155, 0.14, 0.32, 'square', 0.1); },
  boom: () => { tone(95, 0, 0.7, 'sine', 0.45, 30); hiss(0, 1.1, 0.45, 'lowpass', 2600, 180); },
  tick: () => tone(1250, 0, 0.04, 'sine', 0.08),
  tock: () => tone(900, 0, 0.05, 'sine', 0.08),
  stamp: () => { tone(110, 0, 0.18, 'sine', 0.35, 50); hiss(0, 0.12, 0.2, 'lowpass', 900); },
  drumroll: (dur = 2) => {
    const c = ac();
    if (!c || muted) return;
    const hits = Math.floor(dur * 22);
    for (let i = 0; i < hits; i++) {
      const t = (i / hits) * dur;
      hiss(t, 0.06, 0.05 + 0.18 * (i / hits), 'bandpass', 1800, null, 0.8);
    }
  },
  rise: () => tone(220, 0, 0.9, 'sawtooth', 0.07, 880),
  reveal: () => { tone(330, 0, 0.12, 'triangle', 0.14); tone(494, 0.1, 0.12, 'triangle', 0.14); tone(659, 0.2, 0.4, 'triangle', 0.14); },
  fanfare: () => {
    const seq = [[523, 0, 0.15], [523, 0.16, 0.08], [523, 0.26, 0.08], [659, 0.36, 0.2], [523, 0.58, 0.15], [659, 0.75, 0.15], [784, 0.92, 0.7]];
    for (const [f, s, d] of seq) { tone(f, s, d, 'square', 0.08); tone(f * 2, s, d, 'triangle', 0.05); }
    [523, 659, 784].forEach((f) => tone(f, 0.92, 0.9, 'sawtooth', 0.04));
  },
  react: () => tone(900 + Math.random() * 500, 0, 0.08, 'sine', 0.07, 1500),
  // falling whistle + thunk, for a map pin landing
  pinDrop: () => { tone(1500, 0, 0.32, 'sine', 0.1, 450); tone(170, 0.3, 0.16, 'sine', 0.32, 60); hiss(0.3, 0.08, 0.12, 'lowpass', 1200); }
};
