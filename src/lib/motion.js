// Shared motion helpers: scene keys and the springy Svelte transitions used between screens.
import { backOut, elasticOut } from 'svelte/easing';

export const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const FRAME = ['lobby', 'teamdraw', 'intro', 'end'];

// Every engine keeps a "round" counter in its own state object (s.hot.round, s.tour.round...).
// Joining them gives a key that changes on every new round, of the mode or of the Party Tour.
export function roundKey(s) {
  if (!s) return '';
  let k = '';
  for (const [name, v] of Object.entries(s)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.round === 'number') k += `${name}${v.round}`;
  }
  return k;
}

// Big screen: a new scene for each frame phase, game and round (stages stay mounted inside a round,
// so canvases, maps and tunes are never restarted mid-round).
export function hostScene(s) {
  if (!s) return 'none';
  if (FRAME.includes(s.phase)) return s.phase;
  return `${s.settings.sub || s.settings.game}|${roundKey(s)}`;
}

// Phones swap on every phase, so each step feels like a new card.
export const phoneScene = (s) => (s ? `${s.phase}|${roundKey(s)}` : 'none');

// Springy zoom up into place.
export function sceneIn(node, { delay = 0 } = {}) {
  if (reduced()) return { duration: 0 };
  return {
    delay,
    duration: 620,
    css: (t) => {
      const e = backOut(t);
      return `transform: translateY(${(1 - e) * 36}px) scale(${0.92 + 0.08 * e}); opacity: ${Math.min(1, t * 2.2)}; filter: blur(${(1 - t) * 6}px)`;
    }
  };
}

// Phone card flip: swings in like a card turning over.
export function flipIn(node, { delay = 0 } = {}) {
  if (reduced()) return { duration: 0 };
  return {
    delay,
    duration: 560,
    css: (t) => {
      const e = backOut(t);
      return `transform: perspective(900px) rotateY(${(1 - e) * -70}deg) translateX(${(1 - e) * 24}px) scale(${0.9 + 0.1 * e}); opacity: ${Math.min(1, t * 2.5)}`;
    }
  };
}

// A little wobbly bounce for single items (score cards, chips).
export function boing(node, { delay = 0, duration = 700 } = {}) {
  if (reduced()) return { duration: 0 };
  return { delay, duration, css: (t) => `transform: scale(${elasticOut(t) * 0.999 + 0.001})` };
}
