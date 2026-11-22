// Blackjack: everyone plays their own hand against Ace, the robot dealer (an NPC run by the big screen).
// Each round: bet (100/200/300) → two cards each → Hit / Stand / Double on your phone, all at once →
// Ace flips the hidden card and draws to 17 → payout. Points never go below zero: a lost bet just scores 0.
// Win = 2× bet, Blackjack (21 with two cards) = 3× bet, push = half the bet back. In teams the best hand counts.
import { lengthOf } from '../lib/modes.js';
import { shuffle } from './util.js';

export const BETS = [100, 200, 300];
export const T = { intro: 2500, bet: 15000, play: 30000, dealerStep: 1100, result: 7500 };
export const DEALER = { name: 'Ace', icon: '🤖' };
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function newShoe() {
  const cards = [];
  for (let d = 0; d < 4; d++) for (const s of SUITS) for (const r of RANKS) cards.push(r + s);
  return shuffle(cards);
}

export const rankOf = (c) => c.slice(0, -1);
export const suitOf = (c) => c.slice(-1);
export const isRed = (c) => ['♥', '♦'].includes(suitOf(c));

// Best total for a hand: aces count 11 unless that would bust.
export function total(cards) {
  let t = 0, aces = 0;
  for (const c of cards || []) {
    const r = rankOf(c);
    if (r === 'A') { aces++; t += 11; }
    else if (['J', 'Q', 'K'].includes(r)) t += 10;
    else t += Number(r);
  }
  while (t > 21 && aces) { t -= 10; aces--; }
  return t;
}
export const isBlackjack = (cards) => (cards || []).length === 2 && total(cards) === 21;

function draw(b) {
  if (b.shoe.length < 15) b.shoe = newShoe();
  return b.shoe.pop();
}

const waitingBet = (g) => g.playersHere().filter((p) => !g.state.bj.hands[p]?.bet);
const waitingPlay = (g) => g.playersHere().filter((p) => g.state.bj.hands[p] && !g.state.bj.hands[p].done);

function startRound(g) {
  const s = g.state;
  const b = s.bj;
  b.round += 1;
  b.hands = {};
  b.dealer = [];
  b.shown = 1;
  b.points = {};
  b.best = {};
  b.gained = {};
  b.until = g.now() + (b.round === 1 ? T.intro : 0) + T.bet;
  s.phase = 'bjbet';
  g.save();
}

function bet(g, from, input) {
  const s = g.state;
  const b = s.bj;
  if (s.phase !== 'bjbet' || !g.unitOf(from) || b.hands[from]?.bet) return;
  const amt = BETS.includes(Number(input.bet)) ? Number(input.bet) : BETS[0];
  b.hands[from] = { bet: amt, cards: ['?'], done: false };
  if (!waitingBet(g).length) deal(g);
  else g.save();
}

function deal(g) {
  const s = g.state;
  const b = s.bj;
  for (const p of g.playersHere()) {
    const h = b.hands[p] || { bet: BETS[0] }; // didn't bet in time: smallest bet
    h.cards = [draw(b), draw(b)];
    h.done = isBlackjack(h.cards);
    h.doubled = false;
    b.hands[p] = h;
  }
  b.dealer = [draw(b), draw(b)];
  b.shown = 1;
  b.until = g.now() + T.play;
  s.phase = 'bjplay';
  // Ace peeks: with a blackjack the hand ends right away.
  if (!waitingPlay(g).length || isBlackjack(b.dealer)) startDealer(g);
  else g.save();
}

function act(g, from, input) {
  const s = g.state;
  const b = s.bj;
  const h = b.hands[from];
  if (s.phase !== 'bjplay' || !h || h.done) return;
  if (input.move === 'hit') {
    h.cards.push(draw(b));
    if (total(h.cards) >= 21) h.done = true;
  } else if (input.move === 'double' && h.cards.length === 2) {
    h.bet *= 2;
    h.doubled = true;
    h.cards.push(draw(b));
    h.done = true;
  } else if (input.move === 'stand') h.done = true;
  if (total(h.cards) > 21) g.stat(from, 'bust');
  if (!waitingPlay(g).length) startDealer(g);
  else g.save();
}

function startDealer(g) {
  const s = g.state;
  const b = s.bj;
  for (const h of Object.values(b.hands)) h.done = true;
  b.shown = 2;
  b.until = g.now() + T.dealerStep;
  s.phase = 'bjdealer';
  g.save();
}

// Ace draws one card per step until 17 or more (also stops when every player has bust).
function dealerStep(g) {
  const s = g.state;
  const b = s.bj;
  const alive = Object.values(b.hands).some((h) => total(h.cards) <= 21 && !isBlackjack(h.cards));
  if (alive && total(b.dealer) < 17) {
    b.dealer.push(draw(b));
    b.shown = b.dealer.length;
    b.until = g.now() + T.dealerStep;
    g.save();
  } else settle(g);
}

function settle(g) {
  const s = g.state;
  const b = s.bj;
  const d = total(b.dealer);
  const dBJ = isBlackjack(b.dealer);
  const byPlayer = {};
  for (const [p, h] of Object.entries(b.hands)) {
    if (!h.cards || h.cards[0] === '?') continue;
    const t = total(h.cards);
    let out, pts;
    if (t > 21) { out = 'bust'; pts = 0; }
    else if (isBlackjack(h.cards) && !dBJ) { out = 'blackjack'; pts = h.bet * 3; }
    else if (dBJ && !isBlackjack(h.cards)) { out = 'lose'; pts = 0; }
    else if (d > 21 || t > d) { out = 'win'; pts = h.bet * 2; }
    else if (t === d) { out = 'push'; pts = Math.round(h.bet / 2); }
    else { out = 'lose'; pts = 0; }
    h.out = out;
    b.points[p] = pts;
    if (pts) byPlayer[p] = pts;
    if (out === 'blackjack') g.stat(p, 'bj21');
    if (out === 'win' || out === 'blackjack') g.stat(p, 'bjwins');
  }
  const best = g.awardBest(byPlayer, b.gained);
  for (const [uid, x] of Object.entries(best)) b.best[uid] = x.by;
  b.until = g.now() + T.result;
  s.phase = 'bjresult';
  g.save();
}

function next(g) {
  const b = g.state.bj;
  if (b.round >= b.rounds) g.finish();
  else startRound(g);
}

export default {
  normalize(s) {
    s.bj = s.bj ?? null;
    if (s.bj) {
      const b = s.bj;
      for (const k of ['hands', 'points', 'best', 'gained']) b[k] = b[k] || {};
      b.dealer = b.dealer || [];
      b.shoe = b.shoe || [];
      for (const h of Object.values(b.hands)) { h.cards = h.cards || []; h.done = !!h.done; }
    }
  },
  reset(s) { s.bj = null; },
  start(g) {
    const s = g.state;
    s.bj = { rounds: lengthOf(s.settings).rounds, round: 0, shoe: newShoe(), hands: {}, dealer: [], shown: 1, points: {}, best: {}, gained: {}, until: null };
    startRound(g);
  },
  input(g, from, input) {
    if (input.type === 'bjbet') bet(g, from, input);
    else if (input.type === 'bjact') act(g, from, input);
  },
  skip(g) {
    const s = g.state;
    if (s.phase === 'bjbet') deal(g);
    else if (s.phase === 'bjplay') startDealer(g);
    else if (s.phase === 'bjdealer') { for (let i = 0; i < 12 && s.phase === 'bjdealer'; i++) dealerStep(g); }
    else if (s.phase === 'bjresult') next(g);
  },
  tick(g, now) {
    const s = g.state;
    const b = s.bj;
    if (!b || !b.until || now < b.until) return;
    if (s.phase === 'bjbet') deal(g);
    else if (s.phase === 'bjplay') startDealer(g);
    else if (s.phase === 'bjdealer') dealerStep(g);
    else if (s.phase === 'bjresult') next(g);
  }
};
