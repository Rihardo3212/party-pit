// Plays a Hum Hunt tune (see content/tunes.js) on the synth. Returns a stop() function.
import { ac, isMuted } from './sound.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function freqOf(name) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) return null;
  const semis = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}

export function parseTune(notes) {
  return notes.trim().split(/\s+/).map((tok) => {
    const [n, b] = tok.split('/');
    return { f: n === '-' ? null : freqOf(n), beats: Number(b) || 1 };
  });
}

// Length of one pass in ms.
export const tuneMs = (tune, speed = 1) => parseTune(tune.notes).reduce((a, n) => a + n.beats, 0) * (60000 / (tune.bpm * speed));

// wave: oscillator type; speed: 1 = normal; repeat: how many passes (with a short gap).
export function playTune(tune, { wave = 'triangle', speed = 1, repeat = 1, vol = 0.22 } = {}) {
  const c = ac();
  if (!c || isMuted()) return () => {};
  const notes = parseTune(tune.notes);
  const beat = 60 / (tune.bpm * speed);
  const master = c.createGain();
  master.gain.value = vol;
  master.connect(c.destination);
  let t = c.currentTime + 0.08;
  const oscs = [];
  for (let r = 0; r < repeat; r++) {
    for (const n of notes) {
      const dur = n.beats * beat;
      if (n.f) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = wave;
        o.frequency.setValueAtTime(n.f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(1, t + 0.015);
        g.gain.setValueAtTime(1, t + Math.max(0.03, dur * 0.7));
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.06, dur * 0.95));
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + dur);
        oscs.push(o);
      }
      t += dur;
    }
    t += beat * 2; // gap between passes
  }
  return () => {
    const now = c.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.05);
    oscs.forEach((o) => { try { o.stop(now + 0.06); } catch { /* already stopped */ } });
    setTimeout(() => master.disconnect(), 200);
  };
}
