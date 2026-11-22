# Party Pit — plan

Rename **Brain Brawl → Party Pit** and add 7 new modes. Build everything, test, then release in one go.
Party Tour (board game linking all modes) comes later.

## Decisions so far
| Topic | Choice |
|---|---|
| Rename | Everything in the game **and** the GitHub repo (Pages link changes) |
| Teams in social modes | Everyone plays for themselves, points go to their team |
| Odd One Out clues | Typed on phone, shown on TV, then vote |
| Scribble Chain scoring | Vote for favorites after each chain replay |
| Mode picker | Grouped: Trivia / Social / Drawing / Action |
| Release | All together |
| Reflex Rumble games | Tap on green, Button mash, Stop at 5.00, Shake it |
| Lewis | Silent in new modes for now (lines added later in one batch) |

---

## Phase 0 — Rename to Party Pit — ✅ done (repo rename waits for release day)
- `brand.js` GAME_NAME, `index.html` title, `Logo.svelte` (new logo text), `README.md`, `package.json` name.
- Lewis: rewrite the 5 welcome lines in `presenter.js` that say "Brain Brawl" and regenerate only those clips.
  (Old "where brains go to brawl" joke needs a new one, e.g. "Party Pit, where friendships go to be tested.")
- Keep `bb-*` localStorage keys so people keep their wins count. Keep the Firebase project (its id is never shown).
- GitHub: rename repo to `party-pit` (Settings → Rename). Vite `base: './'` means no code change.
  **The old Pages link stops working**; share the new one.

## Phase 1 — Shared groundwork — ✅ done
1. **Mode groups** in `modes.js`: add `group` to each mode; `ModePicker` shows sections.
   - Trivia: Brain Board, Wedge Rush, Fake Out, Pin Drop, Closest Call, Timeline
   - Social: Who Wrote That?, Odd One Out
   - Drawing: Doodle Dash, Scribble Chain, Memory Sketch
   - Action: Reflex Rumble
2. **Per-player play with team scores.** Today most engines take one answer per unit (team = one answer).
   New helper in core: `playersOf(unit)`, `award(playerId, pts)` → adds to `unitOf(player)`. Used by the social modes.
   Results screens show both the player's avatar and the team colour.
3. **"Best of team" scoring helper** (like Pin Drop's closest pin) for Memory Sketch, Reflex, Closest Call, Timeline:
   everyone plays, the team gets its best player's score each round.
4. **Min players per mode** enforced in the lobby (Start greyed with "needs 3 players").
5. **Engine rule for future Party Tour:** every new engine can run a single round on its own
   (`startRound` → result → hand back). Costs nothing now, saves a rewrite later.
6. Lewis: `presenter-cues.js` must stay quiet (not crash) for unknown modes/phases.

---

## Phase 2 — The 7 modes

### 1. Who Wrote That? 📝 (Social, min 3) — ✅ built
- TV shows a prompt ("The worst gift you ever got"). Everyone types an answer (60 s).
- Answers are revealed one at a time with no names. Everyone taps the avatar of who they think wrote it.
- Points: **+500** for each correct guess, **+250** to the writer for each person fooled. You can't vote on your own.
- Teams: guess the *player*; points go to the team.
- Quick 4 prompts / Full 7. Host mode: host reads answers aloud, can skip.
- Content: `content/whowrote.js`, ~80 prompts (fun and safe, nothing too personal).

### 2. Odd One Out 🕵️ (Social, min 3, best with 4+) — ✅ built
- Everyone gets the secret word + its category ("Food: Pizza"). The spy only sees "You're the spy! Category: Food".
- Everyone types **one clue word** (40 s). The TV shows all clues with avatars.
- Vote for the spy (30 s). Spy caught → every non-spy **+500**. Spy escapes → spy **+1000**.
- Caught spy gets one guess at the word: right → **+500** steal-back.
- 7+ players: 2 spies (they don't know each other).
- Rule: clue can't be the word itself (fuzzy check like Fake Out).
- Quick 4 rounds / Full 7. Host mode: host sees word + spy and commentates.
- Content: `content/spywords.js`, ~150 words in ~15 categories.

### 4. Scribble Chain 🔗 (Drawing, min 3) — ✅ built
- Everyone writes a starting sentence (or taps "Random" for a house prompt).
- Steps alternate draw (60 s) → describe (30 s), each phone gets the previous step from another chain.
- Chain length: Quick = up to 4 steps, Full = up to 6 (or player count if smaller), so it never drags.
- Replay on TV chain by chain (Doodle `LiveCanvas` replays the strokes). After each chain everyone taps a favourite step → **+300** per vote to its author.
- Teams: works the same, points go to teams. Host mode: host narrates the replay.
- Strokes stored like Doodle (`chain/{chainId}/{step}`), not in `state` (keeps state small).

### 5. Memory Sketch 🧠✏️ (Drawing, min 1) — ✅ built
- TV shows a simple line drawing for **3 seconds**, then hides it. Everyone redraws it from memory (30 s).
- Auto score: draw both on a small grid, blur a little, compare overlap → 0–1000.
  The TV then shows every drawing on top of the original, best first.
- Later rounds: shorter look time or harder shapes. Teams: best drawing counts.
- Quick 5 / Full 8. Content: `content/sketches.js`, ~40 shapes stored as strokes (same format as Doodle).

### 7. Reflex Rumble ⚡ (Action, min 1) — ✅ built
Random micro-games, ~10 s each:
- **Tap on green**: wait, then tap. Too early = foul (0 points).
- **Button mash**: most taps in 5 s.
- **Stop at 5.00**: hidden timer, stop it as close to 5.00 as you can.
- **Shake it**: shake for 5 s, the motion sensor measures how hard.

Fairness: the TV sends "go", each **phone measures its own time locally** and sends the result, so wifi lag doesn't matter.
Points by rank: 1000 / 700 / 500 / 300…; teams = best player.
iPhone shake needs a permission tap; we ask on the intro screen. No sensor or denied → that player gets Button mash instead.
Quick 8 games / Full 15. Host mode: host commentates.

### 9. Closest Call 🎯 (Trivia, min 1) — ✅ built
- Number question ("How tall is the Eiffel Tower in metres?"). Answer with a number pad (units shown); years are typed too (more exact than a slider).
- Reveal: everyone's guesses slide onto a number line on TV, then the answer drops in.
- Points: up to 1000 based on % off (log scale so big numbers are fair); spot-on stamp for exact.
- Teams: best guess counts. Quick 6 / Full 10; last question ×2.
- Content: reuse `numeric.js` + write ~120 new fact-checked questions.

### 10. Timeline 📅 (Trivia, min 1) — ✅ built
- 4 events/inventions; tap them in order on the phone, oldest first (tap a placed card to take it back; 10 s per card).
- Points: **+250** per card in the right spot, **+250** bonus for all four, small speed bonus.
- Reveal: cards fly onto a timeline on TV with their years.
- Teams: best order counts. Quick 6 / Full 10 rounds (later rounds 5 cards).
- Content: `content/timeline.js`, ~150 dated events; picker makes sure years are not too close together.

---

## Phase 3 — Polish & release
- How to play page + StepFlow icons for all 7, intro screens, music track per mode (reuse existing tracks).
- Sound effects for new moments (spy reveal, chain reveal, reflex go/foul).
- Test every mode: solo (2–4 tabs), teams (5 players), host mode. Local backend + Firebase on real phones.
- Push to `main` → Pages deploy under the new repo name.

## Later
- **Lewis batch:** intro + reaction lines for all 7 modes, read prompts/questions, one GPU run.
- **Party Tour** (#12) — ✅ built: dice board (20 spaces, ⭐ +300, 💀 −200, lap +400), the chooser's space picks a short round of Closest Call, Timeline, Pin Drop, Reflex Rumble, Memory Sketch, Odd One Out, Wedge Rush or Brain Board; place points 500/300/200/100; Quick 6 / Full 12 rounds.

## Open questions
- Rough size: 7 modes ≈ 2–3× the current game code, plus ~550 new content items. Fine to build in that order: 9 → 10 → 5 → 7 → 1 → 2 → 4 (easiest first)?
