// Game modes: names, descriptions and lengths, used by the lobby and the How to play page.

export const MODES = {
  tour: {
    id: 'tour',
    group: 'mix',
    steps: [
      { icon: '🎲', label: 'Everyone rolls the dice' },
      { icon: '🗺️', label: 'Move around the board' },
      { icon: '👑', label: "The chooser's space picks a mini game" },
      { icon: '🏆', label: 'Win mini games', tag: '+500' }
    ],
    name: 'Party Tour',
    icon: '🗺️',
    color: '#22c55e',
    tagline: 'A board game of mini games.',
    how: [
      'Everyone rolls the dice on their phone at the same time, and the pieces move around the board.',
      "Each round one player (or team) is the chooser: the space they land on picks the next mini game.",
      'Mini games are short rounds of the other modes. 1st place gets +500, 2nd +300, 3rd +200, 4th +100.',
      '⭐ spaces give +300, 💀 spaces take 200, and passing START gives +400. Most points at the end wins!'
    ],
    min: 1,
    hostRole: 'The host keeps the tour moving and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '6 rounds · ~18 min', rounds: 6 },
      full: { label: 'Full', detail: '12 rounds · ~40 min', rounds: 12 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true }
    }
  },
  board: {
    id: 'board',
    group: 'trivia',
    steps: [
      { icon: '🎯', label: 'Pick a tile' },
      { icon: '🔔', label: 'Buzz first' },
      { icon: '✅', label: 'Answer right', tag: '+points' },
      { icon: '⚡', label: 'Bet it all in the final' }
    ],
    name: 'Brain Board',
    icon: '🧠',
    color: '#ff3b4f',
    tagline: 'Pick a tile, buzz first, answer fast.',
    how: [
      'The player (or team) in control picks a category and points.',
      'Buzz first when the buzzer lights up, then answer.',
      'Right = win the points and pick next. Wrong = lose them.',
      'Ends with a final round: bet your points on one last question.'
    ],
    min: 1,
    hostRole: 'The host reads the questions and judges spoken answers.',
    lengths: {
      quick: { label: 'Quick', detail: '4 × 4 board + final · ~15 min', cats: 4, rows: 4 },
      full: { label: 'Full', detail: '6 × 5 board + final · ~30 min', cats: 6, rows: 5 },
      tiny: { label: 'Tiny', detail: 'test board', cats: 2, rows: 1, hidden: true },
      tour: { label: 'Tour', detail: 'tour', cats: 2, rows: 2, noFinal: true, hidden: true }
    }
  },
  wedge: {
    id: 'wedge',
    group: 'trivia',
    steps: [
      { icon: '🎡', label: 'The wheel spins' },
      { icon: '📱', label: 'Everyone answers' },
      { icon: '🥧', label: 'Best answer grabs the wedge' },
      { icon: '🏆', label: 'Fill your pie first' }
    ],
    name: 'Wedge Rush',
    icon: '🥧',
    color: '#2f8cff',
    tagline: 'Spin, answer at once, grab the wedges.',
    how: [
      'The wheel spins and lands on a category.',
      'Everyone answers on their phone at the same time.',
      'The best answer from someone still missing that wedge wins it.',
      'Fill your pie first to win. Some rounds are "closest number wins".'
    ],
    min: 1,
    hostRole: 'The host reads the questions out loud and keeps the energy up.',
    lengths: {
      quick: { label: 'Quick', detail: 'First to 4 wedges · ~10 min', need: 4 },
      full: { label: 'Full', detail: 'Collect all 6 wedges · ~20 min', need: 6 },
      tiny: { label: 'Tiny', detail: 'test', need: 1, hidden: true },
      tour: { label: 'Tour', detail: 'tour', need: 99, max: 3, hidden: true }
    }
  },
  fakeout: {
    id: 'fakeout',
    group: 'trivia',
    steps: [
      { icon: '🤔', label: 'A weird true fact' },
      { icon: '🤥', label: 'Write a fake answer' },
      { icon: '🕵️', label: 'Spot the truth', tag: '+1000' },
      { icon: '😈', label: 'Fool your friends', tag: '+500 each' }
    ],
    name: 'Fake Out',
    icon: '🤥',
    color: '#a855f7',
    tagline: 'Write a believable lie. Find the truth.',
    how: [
      'A weird but true fact appears with a blank.',
      'Everyone secretly writes a fake answer that sounds real.',
      'Then everyone tries to pick the real answer.',
      '+1000 for finding the truth, +500 for every player you fool.'
    ],
    min: 2,
    hostRole: 'The host reads the facts and the answers out loud.',
    lengths: {
      quick: { label: 'Quick', detail: '5 facts · ~10 min', rounds: 5 },
      full: { label: 'Full', detail: '8 facts · ~18 min', rounds: 8 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 1, hidden: true }
    }
  },
  doodle: {
    id: 'doodle',
    group: 'drawing',
    steps: [
      { icon: '🤫', label: 'Pick a secret word' },
      { icon: '✏️', label: 'Draw it live' },
      { icon: '⌨️', label: 'Everyone guesses' },
      { icon: '⚡', label: 'Faster = more points' }
    ],
    name: 'Doodle Dash',
    icon: '✏️',
    color: '#22c55e',
    tagline: 'One draws, everyone else guesses.',
    how: [
      'The artist picks one of three secret words.',
      'They draw it on their phone; it appears live on the big screen.',
      'Everyone else types guesses. Faster = more points.',
      'The artist scores for every correct guess. Hard words pay double.'
    ],
    min: 2,
    hostRole: 'The host commentates. Everyone else draws and guesses.',
    lengths: {
      quick: { label: 'Quick', detail: 'Everyone draws once · ~8 min', perPlayer: 1, minRounds: 3, maxRounds: 6 },
      full: { label: 'Full', detail: 'Everyone draws twice · ~16 min', perPlayer: 2, minRounds: 6, maxRounds: 12 },
      tiny: { label: 'Tiny', detail: 'test', perPlayer: 1, minRounds: 1, maxRounds: 1, hidden: true }
    }
  },
  pindrop: {
    id: 'pindrop',
    group: 'trivia',
    steps: [
      { icon: '🗺️', label: 'Pin where the photo was taken' },
      { icon: '⏩', label: 'Lock in fast to rush the others' },
      { icon: '📏', label: 'Closer = more points', tag: 'up to 1000' },
      { icon: '🎯', label: 'Last photo counts double' }
    ],
    name: 'Pin Drop',
    icon: '📍',
    color: '#ff8a1f',
    tagline: 'Where in the world is this? Drop a pin.',
    how: [
      'A photo of a place appears on the big screen.',
      'Zoom the map on your phone and drop a pin where you think it is.',
      'Every pin that locks in cuts the clock for everyone else. Put on the pressure!',
      'The closer your pin, the more points (up to 1000). If nobody has pinned by halfway, a hint shows the region.',
      'In teams, everyone pins and the closest pin counts. The last photo is worth double.'
    ],
    min: 1,
    hostRole: 'The host sees the answer, teases the players and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '5 photos · ~8 min', mix: [2, 2, 1] },
      full: { label: 'Full', detail: '10 photos · ~15 min', mix: [3, 4, 3] },
      tiny: { label: 'Tiny', detail: 'test', mix: [1, 0, 0], hidden: true },
      tour: { label: 'Tour', detail: 'tour', mix: [1, 1, 0], hidden: true }
    }
  },
  closest: {
    id: 'closest',
    group: 'trivia',
    steps: [
      { icon: '🔢', label: 'A number question' },
      { icon: '📱', label: 'Everyone types a guess' },
      { icon: '🎯', label: 'Closer = more points', tag: 'up to 1000' },
      { icon: '⚡', label: 'Last question counts double' }
    ],
    name: 'Closest Call',
    icon: '🎯',
    color: '#06b6d4',
    tagline: 'Guess the number. Closest wins.',
    how: [
      'A question with a number for an answer appears: a year, a height, a count…',
      'Everyone types their best guess on their phone.',
      'The closer your guess, the more points (up to 1000). Spot on = bonus stamp!',
      'In teams, everyone guesses and the best guess counts. The last question is worth double.'
    ],
    min: 1,
    hostRole: 'The host reads the questions and sees the answer early.',
    lengths: {
      quick: { label: 'Quick', detail: '6 questions · ~6 min', rounds: 6 },
      full: { label: 'Full', detail: '10 questions · ~10 min', rounds: 10 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 3, hidden: true }
    }
  },
  timeline: {
    id: 'timeline',
    group: 'trivia',
    steps: [
      { icon: '🃏', label: 'Four events appear' },
      { icon: '👆', label: 'Tap them oldest to newest' },
      { icon: '✅', label: 'Right spot', tag: '+250 each' },
      { icon: '🏆', label: 'All right + fast', tag: 'bonus' }
    ],
    name: 'Timeline',
    icon: '📅',
    color: '#eab308',
    tagline: 'Put history in order. Oldest first!',
    how: [
      'Four events appear: inventions, movies, games, history…',
      'On your phone, tap them in order from oldest to newest.',
      '+250 for every card in the right spot, plus a bonus for a perfect order (more if you are fast).',
      'Later rounds have five cards. In teams, everyone sorts and the best order counts.'
    ],
    min: 1,
    hostRole: 'The host reads the cards out loud and sees the years early.',
    lengths: {
      quick: { label: 'Quick', detail: '6 rounds · ~6 min', rounds: 6 },
      full: { label: 'Full', detail: '10 rounds · ~10 min', rounds: 10 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 2, hidden: true }
    }
  },
  sketch: {
    id: 'sketch',
    group: 'drawing',
    steps: [
      { icon: '👀', label: 'Look for 3 seconds' },
      { icon: '🙈', label: 'It disappears' },
      { icon: '✏️', label: 'Draw it from memory' },
      { icon: '🎯', label: 'Closer match = more points', tag: 'up to 1000' }
    ],
    name: 'Memory Sketch',
    icon: '🧠',
    color: '#ec4899',
    tagline: 'Look, remember, redraw.',
    how: [
      'A drawing appears on the big screen for just 3 seconds.',
      'Then it disappears. Redraw it on your phone from memory.',
      'The game compares your drawing to the original: right shapes in the right places = up to 1000 points.',
      'It gets harder each round. In teams, the best drawing counts.'
    ],
    min: 1,
    hostRole: 'The host commentates and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '5 drawings · ~5 min', rounds: 5 },
      full: { label: 'Full', detail: '8 drawings · ~8 min', rounds: 8 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 2, hidden: true }
    }
  },
  reflex: {
    id: 'reflex',
    group: 'action',
    steps: [
      { icon: '🟢', label: 'Tap on green' },
      { icon: '👊', label: 'Button mash' },
      { icon: '⏱️', label: 'Stop at 5.00' },
      { icon: '📳', label: 'Shake it!' }
    ],
    name: 'Reflex Rumble',
    icon: '⚡',
    color: '#f97316',
    tagline: 'Fast fingers win. No brains needed.',
    how: [
      'Quick mini-games on your phone: tap on green, button mash, stop the clock at 5.00, shake it!',
      'The big screen shows which game is next. Get ready, then go!',
      'Fastest or best wins 1000, then 700, 500… Tapping too early on green = out.',
      'Your phone does the timing, so slow wifi is no excuse. In teams, the best player counts.'
    ],
    min: 1,
    hostRole: 'The host hypes it up and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '8 games · ~4 min', rounds: 8 },
      full: { label: 'Full', detail: '15 games · ~8 min', rounds: 15 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 4, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 3, hidden: true }
    }
  },
  oddone: {
    id: 'oddone',
    group: 'social',
    steps: [
      { icon: '🤫', label: 'Everyone gets a secret word' },
      { icon: '🕵️', label: 'Except the spy!' },
      { icon: '💬', label: 'Type a one-word clue' },
      { icon: '🗳️', label: 'Vote out the spy', tag: '+500' }
    ],
    name: 'Odd One Out',
    icon: '🕵️',
    color: '#8b5cf6',
    tagline: 'One of you is the spy. Who?',
    how: [
      'Everyone sees the same secret word, except the spy, who only sees the category.',
      'Everyone types a one-word clue. Not too obvious, or the spy learns the word!',
      'Vote for who you think the spy is. Catch them and everyone else gets +500.',
      'The spy gets +1000 for escaping, or +500 for guessing the word after being caught. 7+ players = 2 spies.'
    ],
    min: 3,
    hostRole: 'The host knows the word and the spy, and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '4 rounds · ~8 min', rounds: 4 },
      full: { label: 'Full', detail: '7 rounds · ~14 min', rounds: 7 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 1, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 1, hidden: true }
    }
  },
  scribble: {
    id: 'scribble',
    group: 'drawing',
    steps: [
      { icon: '✍️', label: 'Write a silly prompt' },
      { icon: '🎨', label: 'Next player draws it' },
      { icon: '🤔', label: 'Next one guesses what it is' },
      { icon: '⭐', label: 'Vote for the best step', tag: '+300' }
    ],
    name: 'Scribble Chain',
    icon: '🔗',
    color: '#a855f7',
    tagline: 'Draw it, guess it, pass it on.',
    how: [
      'Everyone writes a silly prompt, like "A cat driving a bus".',
      'Your prompt goes to the next player, who draws it. The next one sees only the drawing and writes what it is.',
      'Draw, guess, draw, guess… until the chain is done. Then watch each chain on the big screen!',
      'Vote for your favorite step in each chain: +300 per vote. In teams, your points go to your team.'
    ],
    min: 3,
    hostRole: 'The host shows the chains and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '4 steps · ~8 min', rounds: 1, steps: 4 },
      full: { label: 'Full', detail: '6 steps · ~14 min', rounds: 1, steps: 6 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 1, steps: 3, hidden: true }
    }
  },
  whowrote: {
    id: 'whowrote',
    group: 'social',
    steps: [
      { icon: '💬', label: 'Answer a fun prompt' },
      { icon: '🙈', label: 'Answers shown, no names' },
      { icon: '🎯', label: 'Guess who wrote it', tag: '+500' },
      { icon: '😈', label: 'Fool your friends', tag: '+250 each' }
    ],
    name: 'Who Wrote That?',
    icon: '📝',
    color: '#14b8a6',
    tagline: 'How well do you know your friends?',
    how: [
      'A fun prompt appears, like "The worst gift you ever got". Everyone writes an answer.',
      'The answers show up one by one, with no names.',
      'Tap who you think wrote it: +500 if you are right.',
      'The writer gets +250 for every friend they fool. In teams, your points go to your team.'
    ],
    min: 3,
    hostRole: 'The host reads the answers out loud and knows who wrote them.',
    lengths: {
      quick: { label: 'Quick', detail: '4 prompts · ~10 min', rounds: 4 },
      full: { label: 'Full', detail: '7 prompts · ~18 min', rounds: 7 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 1, hidden: true }
    }
  },
  peek: {
    id: 'peek',
    group: 'trivia',
    steps: [
      { icon: '🔍', label: 'A zoomed-in, blurry photo' },
      { icon: '🖼️', label: 'It slowly zooms out' },
      { icon: '🔔', label: 'Buzz when you know it' },
      { icon: '⚡', label: 'Earlier = more points', tag: 'up to 1000' }
    ],
    name: 'Pixel Peek',
    icon: '🔍',
    color: '#0ea5e9',
    tagline: 'What is it? Buzz before it gets easy.',
    how: [
      'A photo of a famous place appears, zoomed in and blocky. It slowly zooms out and gets sharper.',
      'Buzz on your phone as soon as you think you know it, then pick from 4 answers.',
      'Right: up to 1000 points, fewer the longer you wait. Wrong: you are locked out for that photo.',
      'In teams, anyone can buzz, but a wrong answer locks out the whole team.'
    ],
    min: 1,
    hostRole: 'The host sees the answer and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '6 photos · ~4 min', rounds: 6 },
      full: { label: 'Full', detail: '10 photos · ~7 min', rounds: 10 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 3, hidden: true }
    }
  },
  hum: {
    id: 'hum',
    group: 'trivia',
    steps: [
      { icon: '🎶', label: 'A famous tune plays' },
      { icon: '🔔', label: 'Buzz when you know it' },
      { icon: '🅰️', label: 'Pick the name' },
      { icon: '⏩', label: 'Later tunes play faster!', tag: 'up to 1000' }
    ],
    name: 'Hum Hunt',
    icon: '🎶',
    color: '#10b981',
    tagline: 'Name that tune!',
    how: [
      'The big screen plays the start of a famous tune: classical hits, kids songs, holiday songs.',
      'Buzz on your phone as soon as you know it, then pick its name from 4 options.',
      'Right: up to 1000 points, fewer the longer you wait. Wrong: you are locked out for that tune.',
      'Later tunes play faster and on sillier instruments. In teams, a wrong answer locks out the whole team.'
    ],
    min: 1,
    hostRole: 'The host sees the answer and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '6 tunes · ~4 min', rounds: 6 },
      full: { label: 'Full', detail: '10 tunes · ~7 min', rounds: 10 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 3, hidden: true }
    }
  },
  hottake: {
    id: 'hottake',
    group: 'social',
    steps: [
      { icon: '💬', label: 'A hot take appears' },
      { icon: '🌡️', label: 'Rate it 0 to 10' },
      { icon: '🎯', label: "Guess the group's average", tag: 'up to 1000' },
      { icon: '🌶️', label: 'Hottest take bonus', tag: '+300' }
    ],
    name: 'Hot Take',
    icon: '🌶️',
    color: '#e0213a',
    tagline: 'Do you know what your friends think?',
    how: [
      'A statement appears, like "Pineapple belongs on pizza".',
      'On your phone, secretly rate how much you agree, from 0 to 10.',
      "Then guess the group's average. The closer you are, the more points (up to 1000).",
      'The rating furthest from the average gets the "hottest take" bonus: +300. In teams, your points go to your team.'
    ],
    min: 3,
    hostRole: 'The host reads the takes out loud and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '5 takes · ~5 min', rounds: 5 },
      full: { label: 'Full', detail: '8 takes · ~8 min', rounds: 8 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 2, hidden: true }
    }
  },
  bomb: {
    id: 'bomb',
    group: 'action',
    steps: [
      { icon: '📋', label: 'A category appears' },
      { icon: '💣', label: 'Holding the bomb? Type a word' },
      { icon: '💨', label: 'It passes to the next player' },
      { icon: '💥', label: 'Holding it at the boom?', tag: '−300' }
    ],
    name: 'Bomb Pass',
    icon: '💣',
    color: '#f97316',
    tagline: 'Think fast. Pass the bomb!',
    how: [
      'A category appears, like "Fruits". One player holds a ticking bomb.',
      'Type a word that fits to pass it on. No repeats!',
      'Odd words go to a quick thumbs up or down vote (the fuse pauses).',
      'Nobody knows when it blows. Holding it at the boom: −300. Everyone else: +200 (in teams: +200 for each other team).'
    ],
    min: 3,
    hostRole: 'The host decides if odd words count and can blow the bomb early.',
    lengths: {
      quick: { label: 'Quick', detail: '5 bombs · ~5 min', rounds: 5 },
      full: { label: 'Full', detail: '8 bombs · ~8 min', rounds: 8 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 2, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 1, hidden: true }
    }
  },
  know: {
    id: 'know',
    group: 'social',
    steps: [
      { icon: '✍️', label: 'Answer questions about yourself' },
      { icon: '🤔', label: "Guess your friends' answers", tag: '+500' },
      { icon: '🥰', label: 'Friends knew you?', tag: '+250 each' }
    ],
    name: 'Who Knows Who',
    icon: '🤝',
    color: '#8b5cf6',
    tagline: 'How well do you know your friends?',
    how: [
      'Everyone secretly answers a few questions about themselves, like "Your dream holiday spot?".',
      'Then the big screen asks about one player, with 4 options to pick from.',
      'Guess right: +500. The player it is about gets +250 for every friend who knew.',
      'In teams, your points go to your team.'
    ],
    min: 3,
    hostRole: 'The host reads the questions out loud and can skip ahead.',
    lengths: {
      quick: { label: 'Quick', detail: '2 questions each · ~6 min', rounds: 2, qs: 8 },
      full: { label: 'Full', detail: '3 questions each · ~10 min', rounds: 3, qs: 12 },
      tiny: { label: 'Tiny', detail: 'test', rounds: 1, qs: 3, hidden: true },
      tour: { label: 'Tour', detail: 'tour', rounds: 1, qs: 4, hidden: true }
    }
  }
};

export const MODE_LIST = ['tour', 'board', 'wedge', 'fakeout', 'pindrop', 'closest', 'timeline', 'peek', 'hum', 'whowrote', 'oddone', 'hottake', 'know', 'doodle', 'scribble', 'sketch', 'reflex', 'bomb'];

// Mode groups for the picker, home page and How to play page.
export const GROUPS = [
  { id: 'mix', label: 'Mix', icon: '🎲' },
  { id: 'trivia', label: 'Trivia', icon: '🧠' },
  { id: 'social', label: 'Social', icon: '💬' },
  { id: 'drawing', label: 'Drawing', icon: '✏️' },
  { id: 'action', label: 'Action', icon: '⚡' }
];
export const modesIn = (g) => MODE_LIST.filter((id) => MODES[id].group === g);
export const GROUP_LIST = GROUPS.filter((g) => modesIn(g.id).length);

// Setup steps for the How to play page.
export const SETUP_STEPS = [
  { icon: '📺', label: 'Open on a big screen' },
  { icon: '📱', label: 'Scan the QR code' },
  { icon: '🎨', label: 'Draw yourself' },
  { icon: '👑', label: 'VIP picks a game' }
];
export const EXTRAS = [
  { icon: '🎽', label: '5+ players = teams' },
  { icon: '🎤', label: 'Optional host' },
  { icon: '😂', label: 'Send reactions' },
  { icon: '🌙', label: 'Light or dark' }
];

export function lengthOf(settings) {
  // Party Tour runs one short round of another mode at a time.
  if (settings.game === 'tour' && settings.sub && MODES[settings.sub]?.lengths.tour) return MODES[settings.sub].lengths.tour;
  const m = MODES[settings.game] || MODES.board;
  return m.lengths[settings.length] || m.lengths.quick;
}
