// Phone sensors for the motion games and the Party Tour dice: motion (accelerometer + gyroscope),
// orientation (tilt) and the microphone. iPhones need a tap to allow motion, so phones show an
// "Allow motion" button when needed. Everything has a touch fallback (laptops, old phones).

const hasMotion = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
const needsAsk = hasMotion && typeof DeviceMotionEvent.requestPermission === 'function';

export const sensors = $state({
  ask: needsAsk, // true until the player taps "Allow motion" (iPhone)
  live: false, // a real motion event has arrived
  denied: false,
  mic: false
});

// ---------- motion ----------
// One shared listener; games subscribe with onMotion(cb).
// cb gets { a: {x,y,z} without gravity, g: {x,y,z} with gravity, r: {a,b,g} rotation deg/s, dt: seconds }
const subs = new Set();
let listening = false;
let lastT = 0;

function handle(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x === null) return;
  sensors.live = true;
  const a = e.acceleration && e.acceleration.x !== null ? e.acceleration : null;
  const now = performance.now();
  const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016;
  lastT = now;
  const ev = {
    g: { x: g.x, y: g.y, z: g.z },
    a: a ? { x: a.x, y: a.y, z: a.z } : null,
    r: e.rotationRate ? { a: e.rotationRate.alpha || 0, b: e.rotationRate.beta || 0, g: e.rotationRate.gamma || 0 } : { a: 0, b: 0, g: 0 },
    dt
  };
  for (const cb of subs) cb(ev);
}

function listen() {
  if (listening || !hasMotion) return;
  listening = true;
  window.addEventListener('devicemotion', handle);
}

export function onMotion(cb) {
  listen();
  subs.add(cb);
  return () => subs.delete(cb);
}

// Must be called from a tap on iPhone.
export async function askMotion() {
  if (!needsAsk) { listen(); return true; }
  try {
    const res = await DeviceMotionEvent.requestPermission();
    try { await DeviceOrientationEvent?.requestPermission?.(); } catch { /* not needed everywhere */ }
    sensors.ask = false;
    sensors.denied = res !== 'granted';
    listen();
    return res === 'granted';
  } catch {
    sensors.ask = false;
    sensors.denied = true;
    return false;
  }
}

// ---------- orientation (tilt) ----------
// beta = front/back tilt (-180..180, 0 = flat, 90 = upright), gamma = left/right (-90..90).
// Same signs on iPhone and Android, unlike raw acceleration.
const tiltSubs = new Set();
let tiltOn = false;
function handleTilt(e) {
  if (e.beta === null || e.beta === undefined) return;
  sensors.live = true;
  for (const cb of tiltSubs) cb({ beta: e.beta, gamma: e.gamma || 0 });
}
export function onTilt(cb) {
  if (!tiltOn && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
    tiltOn = true;
    window.addEventListener('deviceorientation', handleTilt);
  }
  tiltSubs.add(cb);
  return () => tiltSubs.delete(cb);
}

// ---------- helpers built on motion ----------
const mag = (v) => Math.hypot(v.x, v.y, v.z);

// Linear acceleration (gravity removed). Uses the phone's own value, or a high-pass of the raw one.
export function linear() {
  let grav = null;
  return (ev) => {
    if (ev.a) return ev.a;
    grav = grav ? { x: grav.x * 0.9 + ev.g.x * 0.1, y: grav.y * 0.9 + ev.g.y * 0.1, z: grav.z * 0.9 + ev.g.z * 0.1 } : { ...ev.g };
    return { x: ev.g.x - grav.x, y: ev.g.y - grav.y, z: ev.g.z - grav.z };
  };
}

// Calls cb() once per shake (a hard jolt), with a short cooldown.
export function onShake(cb, { threshold = 14, cooldown = 350 } = {}) {
  const lin = linear();
  let last = 0;
  return onMotion((ev) => {
    const m = mag(lin(ev));
    const t = performance.now();
    if (m > threshold && t - last > cooldown) {
      last = t;
      cb(m);
    }
  });
}

// Tilt in degrees from gravity: x = left/right (gamma-like), y = forward/back (beta-like). Flat on a table = 0, 0.
export function tiltOf(g) {
  const m = mag(g) || 1;
  return {
    x: (Math.asin(Math.max(-1, Math.min(1, g.x / m))) * 180) / Math.PI,
    y: (Math.asin(Math.max(-1, Math.min(1, g.y / m))) * 180) / Math.PI,
    flat: (Math.acos(Math.max(-1, Math.min(1, Math.abs(g.z) / m))) * 180) / Math.PI // 0 = flat, 90 = upright
  };
}

// Turning speed around the up/down axis (deg/s): spinning on the spot while holding the phone.
export function yawRate(ev) {
  const m = mag(ev.g) || 1;
  // rotationRate: alpha = z, beta = x, gamma = y (device axes)
  return (ev.r.b * ev.g.x + ev.r.g * ev.g.y + ev.r.a * ev.g.z) / m;
}

// ---------- microphone ----------
let micStream = null;
let analyser = null;
let buf = null;

// Must be called from a tap. Returns true if the mic works.
export async function openMic() {
  if (analyser) return true;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const c = new Ctx();
    const src = c.createMediaStreamSource(micStream);
    analyser = c.createAnalyser();
    analyser.fftSize = 1024;
    buf = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    sensors.mic = true;
    return true;
  } catch {
    sensors.mic = false;
    return false;
  }
}

// Loudness 0..1 right now (blowing into the mic is loud and noisy).
export function micLevel() {
  if (!analyser) return 0;
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(sum / buf.length) * 4);
}

export function closeMic() {
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  analyser = null;
  sensors.mic = false;
}
