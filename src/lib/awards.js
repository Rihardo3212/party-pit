// End-game awards: fun titles shown under the podium.
// Engines count stats with g.stat(who, key) / g.statMin / g.statTop (see engine/core.js).
// "who" is a player id, or a team unit id when a mode only knows the team (Fake Out, Wedge Rush, finals).
// The list is in priority order: the first awards that someone earned are the ones shown.

export const AWARDS = [
  { key: 'spy', icon: '🕵️', name: 'Super Spy', color: '#a855f7', min: 1, what: (v) => (v === 1 ? 'Got away with it' : `Got away with it ${v} times`) },
  { key: 'fooled', icon: '🤥', name: 'Master Liar', color: '#ff4fa3', min: 2, what: (v) => `Fooled people ${v} times` },
  { key: 'art', icon: '🎨', name: 'Star Artist', color: '#ff7a1a', min: 2, what: (v) => `Wowed the crowd ${v} times` },
  { key: 'buzz', icon: '⚡', name: 'Fastest Finger', color: '#ffc400', low: true, what: (v) => `Right in ${(v / 1000).toFixed(2)} s` },
  { key: 'reflex', icon: '🏎️', name: 'Lightning Reflexes', color: '#2f8cff', min: 2, what: (v) => `Won ${v} reflex games` },
  { key: 'close', icon: '🎯', name: 'Bullseye', color: '#e0213a', min: 2, what: (v) => `Closest ${v} times` },
  { key: 'eye', icon: '👀', name: 'Sharp Eye', color: '#22c55e', min: 2, what: (v) => `Saw through it ${v} times` },
  { key: 'right', icon: '🧠', name: 'Know-It-All', color: '#2f8cff', min: 3, what: (v) => `${v} right answers` },
  { key: 'gotFooled', icon: '🙈', name: 'Easily Fooled', color: '#a855f7', min: 2, what: (v) => `Fell for it ${v} times` },
  { key: 'wrong', icon: '😬', name: 'Oops!', color: '#ff7a1a', min: 2, what: (v) => `${v} wrong answers` }
];

// When the first award card pops in on the end screen (ms), after the podium. Cards follow every 450 ms.
export const AWARDS_AT = (s) => 300 + (s.results?.ranked?.length || 0) * 180 + 900;
export const AWARD_GAP = 450;

export const awardInfo =(key) => AWARDS.find((a) => a.key === key);

// stats: { key: { who: value } } → up to `max` awards, each to a different winner.
// A tie for first place gives no award (nobody wants to share "Oops!").
export function pickAwards(stats, max = 3) {
  const out = [];
  const taken = new Set();
  for (const a of AWARDS) {
    if (out.length >= max) break;
    const entries = Object.entries(stats?.[a.key] || {}).filter(([, v]) => typeof v === 'number' && (a.low || v >= (a.min || 1)));
    if (!entries.length) continue;
    entries.sort((x, y) => (a.low ? x[1] - y[1] : y[1] - x[1]));
    if (entries[1] && entries[1][1] === entries[0][1]) continue;
    const [who, value] = entries[0];
    if (taken.has(who)) continue;
    taken.add(who);
    out.push({ key: a.key, who, value });
  }
  return out;
}
