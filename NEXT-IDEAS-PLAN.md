# Party Pit — next ideas plan

4 new modes + 4 party features. **Everything below is built** (not committed yet). Lewis stays quiet for the new
modes and awards until his lines batch.

## Status
| Idea | Status |
|---|---|
| End-game awards 🏆 | ✅ shipped (commit 410d876) |
| Hot Take 🌶️ | ✅ built |
| Pixel Peek 🔍 | ✅ built |
| Hum Hunt 🎶 | ✅ built |
| Bomb Pass 💣 | ✅ built |
| Who Knows Who 🤝 | ✅ built (own mode + Party Tour pool) |
| Party Tour upgrades 🎲 | ✅ built (items, 🎁 / 🛒 spaces, 3 layouts) |
| Audience mode 👀 | ✅ built |
| Lewis lines for all of the above | ✅ shipped (commit 76db40b) |

---

## New modes (as built)

### Pixel Peek 🔍 (Trivia, min 1) — `engine/peek.js`
- TV shows a Pin Drop photo zoomed in and pixelated; it slowly zooms out (18 s).
- Buzz in, then pick from 4 options. Earlier = more points (1000 → 200). Wrong = locked out, the photo keeps going.
- Easier photos first; wrong options come from the same difficulty. Photo credit shown on the reveal.
- Shares `engine/buzzpick.js` with Hum Hunt.

### Hot Take 🌶️ (Social, min 3) — `engine/hottake.js`
- Statement on TV. Phone: rate it 0–10, and guess the group average (one screen).
- Guess points fade with distance (spot on 1000, 4+ off 0). Hottest take: +300 for the rating furthest
  from the average (2.5+ away, no ties, 3+ players).
- ~100 statements in `content/hottakes.js`.

### Bomb Pass 💣 (Action, min 3) — `engine/bomb.js`
- Category on TV, one player holds the bomb. Type a word that fits to pass it on. No repeats.
- Words on the list (`content/bombcats.js`, 31 categories) pass straight away, small typos are fine.
  Other words go to a thumbs up/down vote by the others (fuse paused, 9 s, ties count as yes).
  In host mode the host decides.
- Hidden fuse 20–45 s. Holder at the boom: −300. Everyone else +200 (in teams: +200 per other team).
- Teams: the bomb hops between teams.

### Hum Hunt 🎶 (Trivia/music, min 1) — `engine/hum.js`
- The synth plays a public-domain tune (`content/tunes.js`, 45 tunes, player in `lib/tuneplayer.js`).
- Buzz in, then pick from 4 titles. Later rounds are faster and on sillier instruments.
- Background music stops while tunes play.

---

## Party features (as built)

### End-game awards 🏆 — `lib/awards.js`
- Up to 3 cards under the podium. New ones: 📣 Crowd Favourite (first in the list), 🌶️ Spice Lord,
  💣 Butterfingers, 🤝 Best Friend, 📖 Open Book.

### Who Knows Who 🤝 (Social, min 3) — `engine/know.js`
- Everyone answers 1–3 questions about themselves (`content/aboutme.js`, 40 questions with decoy answers).
- TV: "What's Ann's dream holiday spot?" with 4 options (her answer + friends' answers + decoys).
- Right guess +500. The player it's about gets +250 per friend who knew.
- Everyone gets asked about once before anyone gets a second question; capped (Quick 8 / Full 12 questions).

### Party Tour upgrades 🎲 — `engine/tour.js`
- **Items** (bag holds 2, one used per turn, before rolling): 🎲 Double Dice, 🔄 Swap (spots with a random player),
  💰 Steal 200 from the leader, 🛡️ Shield (blocks the next trap or steal, works by itself).
- **Spaces**: 🎁 free item, 🛒 shop (auto-buys a random item for 150 if you can afford it).
- **Layouts**: Classic Loop (20 spaces), Grand Tour (22), Speedway (18), picked at random.
  (A figure-8 or spiral would need a new board drawing; loops of different sizes were the simple version.)
- New modes are in the Tour pool: Hot Take, Pixel Peek, Hum Hunt, Bomb Pass, Who Knows Who.

### Audience mode 👀
- Phones that join after the game started (or when the room is full) join the **audience**.
  The join screen also has a "👀 Just watch" button.
- Audience can react and cheer for one player. The most cheered player gets 📣 Crowd Favourite at the end.
- TV header shows "👀 N watching" and the top cheered players. Audience can join as players in the next lobby.
- Not done (on purpose, simpler): audience votes in social modes.

---

## Content this time (done)
- Brain Board / Wedge Rush trivia: +10 questions in each of the 11 categories.
- Brain Board finals: 10 → 40. Fake Out: 47 → ~90 prompts. Lewis voice clips for all of these.
- Not done: more Pin Drop places (each needs a properly licensed photo).

## Round 3 (built)
- **Quick Party 🎉** (`mix`, uses the Tour engine with no board): 3 / 6 random mini games back to back.
- **Inside Jokes 🤫** (Social, min 2): everyone writes questions + answers in the lobby; buzz-in pick 1 of 4.
  Wrong options come from the other answers. The author (and their team) can't buzz. Kept only in the room.
- **Party Tour boards**: Figure Eight (pinched loop) and Spiral Star (inward spiral to a 🌟 goal, +500).
- **Audience votes**: Hot Take ratings and Bomb Pass thumbs count half.
- **Content**: Hot Takes 141, Bomb categories 46, Who Knows Who prompts 60.
- **Fixes**: lazy-loaded pages (no chunk over 500 KB), Host.svelte warning.
- **Motion pass**: color wipes for new modes/rounds, curtains for results, springy scene changes,
  phone card flips, living backdrop pulsing with the music, scores count up and race, +points fly,
  options flip in, avatars bob, squishy buttons, Lewis waves.

## Next
- Pin Drop places (needs properly licensed photos).
- Maybe: audience votes in Fake Out, more board shapes, a real playtest with friends.
