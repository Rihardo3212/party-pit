// Tiny event bus for visual effects on the big screen (confetti, stamps, floating emoji).
const listeners = new Set();
export function onFx(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(e) { listeners.forEach((l) => l(e)); }

export const fx = {
  confetti: (amount = 140, colors = null) => emit({ type: 'confetti', amount, colors }),
  // Two party cannons fire confetti up from the bottom corners.
  cannon: (amount = 140, colors = null) => emit({ type: 'cannon', amount, colors }),
  stamp: (text, color = '#e60012', sub = '') => emit({ type: 'stamp', text, color, sub }),
  react: (e, color) => emit({ type: 'react', e, color }),
  // A new question is on screen: let old confetti fade out fast so it never covers the text.
  calm: () => emit({ type: 'calm' })
};
