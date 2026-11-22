// Party Tour "Toy Island": turns a board layout into stepping-stone positions along a smooth path,
// plus the island outline and scenery. Coordinates are in SVG units (viewBox W × H).

const TAU = Math.PI * 2;

// Curves per layout: f(u) for u in 0..1 → [x, y].
const CURVES = {
  loop: { W: 160, H: 100, closed: true, f: (u) => {
    const a = -Math.PI * 0.82 + u * TAU; // start top-left, go clockwise
    return [80 + 63 * Math.cos(a) * (1 + 0.05 * Math.sin(3 * a)), 50 + 33 * Math.sin(a) * (1 + 0.06 * Math.cos(2 * a))];
  } },
  eight: { W: 120, H: 100, closed: true, gap: 1.6, f: (u) => {
    const a = u * TAU;
    return [60 + 50 * Math.sin(a), 50 + 34 * Math.sin(2 * a)];
  } },
  spiral: { W: 110, H: 100, closed: false, f: (u) => {
    const a = -Math.PI * 0.75 + u * Math.PI * 3.1;
    const r = 1 - u * 0.8;
    return [55 + 48 * r * Math.cos(a), 50 + 42 * r * Math.sin(a)];
  } }
};

export const curveFor = (layout) => (layout.id === 'hourglass' ? 'eight' : layout.id === 'spiral' ? 'spiral' : 'loop');

// n points spread evenly along the curve (by length).
export function stones(kind, n) {
  const C = CURVES[kind];
  const N = 900;
  const P = [];
  for (let i = 0; i <= N; i++) P.push(C.f(i / N));
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = cum[N];
  // gap: a stretch with no stones where the road crosses itself (a bridge goes over).
  const step = C.closed ? L / (n + (C.gap || 0)) : L / Math.max(1, n - 1);
  const start = C.gap ? C.gap / 2 + 0.5 : C.offset || 0;
  const out = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const target = Math.min(L, (k + start) * step);
    while (j < N && cum[j] < target) j++;
    const seg = cum[j] - cum[j - 1] || 1;
    const f = (target - cum[j - 1]) / seg;
    out.push([P[j - 1][0] + (P[j][0] - P[j - 1][0]) * f, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * f]);
  }
  return { W: C.W, H: C.H, closed: C.closed, pts: out, r: Math.min(7, step * 0.36), cross: !!C.gap };
}

// Smooth path through points (Catmull-Rom → cubic Bézier).
export function smooth(pts, closed) {
  if (pts.length < 2) return '';
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return closed ? d + 'Z' : d;
}

// A wobbly blob around the middle of the board: the island.
export function islandPath(W, H, pad = 4, seed = 3) {
  const pts = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const w = 1 + 0.035 * Math.sin(a * 3 + seed) + 0.025 * Math.cos(a * 5 + seed * 2);
    pts.push([W / 2 + (W / 2 - pad) * Math.cos(a) * w, H / 2 + (H / 2 - pad) * Math.sin(a) * w]);
  }
  return smooth(pts, true);
}

// The lowest stretch of road (for the bridge over the river).
export function bridgeAt(pts, cross = false) {
  if (cross) {
    const a = pts[pts.length - 1], b = pts[0];
    return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ang: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI, cross: true, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  }
  let best = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const y = (pts[i][1] + pts[i + 1][1]) / 2;
    const yb = (pts[best][1] + pts[best + 1][1]) / 2;
    if (y > yb) best = i;
  }
  const a = pts[best], b = pts[best + 1];
  return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, ang: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
}
