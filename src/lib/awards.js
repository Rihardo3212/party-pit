// End-game awards: fun titles shown under the podium.
// Engines count stats with g.stat(who, key) / g.statMin / g.statTop (see engine/core.js).
// "who" is a player id, or a team unit id when a mode only knows the team (Fake Out, Wedge Rush, finals).
// The list is in priority order: the first awards that someone earned are the ones shown.

export const AWARDS = [
  { key: 'crowd', icon: '📣', name: 'Crowd Favourite', color: '#ff4fa3', min: 1, what: (v) => (v === 1 ? '1 fan in the audience' : `${v} fans in the audience`) },
  { key: 'spy', icon: '🕵️', name: 'Super Spy', color: '#a855f7', min: 1, what: (v) => (v === 1 ? 'Got away with it' : `Got away with it ${v} times`) },
  { key: 'fooled', icon: '🤥', name: 'Master Liar', color: '#ff4fa3', min: 2, what: (v) => `Fooled people ${v} times` },
  { key: 'art', icon: '🎨', name: 'Star Artist', color: '#ff7a1a', min: 2, what: (v) => `Wowed the crowd ${v} times` },
  { key: 'buzz', icon: '⚡', name: 'Fastest Finger', color: '#ffc400', low: true, what: (v) => `Right in ${(v / 1000).toFixed(2)} s` },
  { key: 'moveTop', icon: '🤸', name: 'Mover & Shaker', color: '#06b6d4', min: 2, what: (v) => `Won ${v} move games` },
  { key: 'pong', icon: '🏓', name: 'Rally Master', color: '#f43f5e', min: 4, what: (v) => `Returned ${v} balls` },
  { key: 'pulls', icon: '💪', name: 'Muscles', color: '#a16207', min: 30, what: (v) => `${v} rope pulls` },
  { key: 'bj21', icon: '🂡', name: 'Card Shark', color: '#15803d', min: 2, what: (v) => `${v} blackjacks` },
  { key: 'bust', icon: '💥', name: 'Bust Buster', color: '#f97316', min: 3, what: (v) => `Went bust ${v} times` },
  { key: 'reflex', icon: '🏎️', name: 'Lightning Reflexes', color: '#2f8cff', min: 2, what: (v) => `Won ${v} reflex games` },
  { key: 'close', icon: '🎯', name: 'Bullseye', color: '#e0213a', min: 2, what: (v) => `Closest ${v} times` },
  { key: 'hot', icon: '🌶️', name: 'Spice Lord', color: '#e0213a', min: 2, what: (v) => `Hottest take ${v} times` },
  { key: 'boom', icon: '💣', name: 'Butterfingers', color: '#ff7a1a', min: 2, what: (v) => `Blew up ${v} times` },
  { key: 'bff', icon: '🤝', name: 'Best Friend', color: '#8b5cf6', min: 2, what: (v) => `Knew a friend's answer ${v} times` },
  { key: 'open', icon: '📖', name: 'Open Book', color: '#8b5cf6', min: 3, what: (v) => `Friends guessed them right ${v} times` },
  { key: 'eye', icon: '👀', name: 'Sharp Eye', color: '#22c55e', min: 2, what: (v) => `Saw through it ${v} times` },
  { key: 'right', icon: '🧠', name: 'Know-It-All', color: '#2f8cff', min: 3, what: (v) => `${v} right answers` },
  { key: 'gotFooled', icon: '🙈', name: 'Easily Fooled', color: '#a855f7', min: 2, what: (v) => `Fell for it ${v} times` },
  { key: 'wrong', icon: '😬', name: 'Oops!', color: '#ff7a1a', min: 2, what: (v) => `${v} wrong answers` }
];

// The end screen, step by step: the places pop up one by one from last place, then a drum roll,
// then the winner gets the big podium. All times are ms from the moment the end screen shows.
export const END_FIRST = 900; // first place card, after the curtains
export const END_STEP = 1100; // between places
export const DRUM = 2400; // drum roll before the winner
// Units grouped by shared place, best first: [[ids at place 1], [ids at place 2], ...].
export function placeGroups(s) {
  const r = s.results || {};
  const groups = [];
  for (const id of r.ranked || []) {
    const p = r.winners?.includes(id) ? 1 : r.places?.[id] || (r.ranked.indexOf(id) + 1);
    const g = groups.find((x) => x.place === p);
    if (g) g.ids.push(id);
    else groups.push({ place: p, ids: [id] });
  }
  return groups.sort((a, b) => a.place - b.place);
}
// When the k-th non-winner group shows (k = 0 is the group revealed first, the lowest place).
export const placeAt = (k) => END_FIRST + k * END_STEP;
export const drumAt = (s) => (placeGroups(s).length > 1 ? placeAt(placeGroups(s).length - 1) + 300 : 600);
export const revealAt = (s) => drumAt(s) + DRUM;
// When the first award card pops in (ms), after the winner's celebration. Cards follow every AWARD_GAP.
export const AWARDS_AT = (s) => revealAt(s) + 2600;
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
