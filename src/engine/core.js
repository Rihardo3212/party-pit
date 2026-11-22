// Game engine core. Runs only on the big screen.
// Phones push inputs to rooms/CODE/inputs, the engine updates rooms/CODE/state,
// and every screen draws itself from that state.
//
// The core handles the lobby, teams, team drawing, reactions and the end screen.
// Everything in between belongs to the chosen game mode (see ./board.js etc.).
//
// A "unit" is whoever scores: a single player (solo) or a team.
// Solo: unit id = player id. Teams: unit id = "team-red" etc.

import { PLAYER_COLORS, MAX_SOLO, MAX_PLAYERS, TEAMS, TEAM_KEYS, REACTIONS } from '../lib/room.js';
const MAX_AUDIENCE = 40;
import { MODES } from '../lib/modes.js';
import { addWin } from '../lib/wins.js';
import { pickAwards } from '../lib/awards.js';
import { shuffle, renderStrokes } from './util.js';
import board from './board.js';
import wedge from './wedge.js';
import fakeout from './fakeout.js';
import doodle from './doodle.js';
import pindrop from './pindrop.js';
import closest from './closest.js';
import tour, { setEngines } from './tour.js';
import scribble from './scribble.js';
import oddone from './oddone.js';
import whowrote from './whowrote.js';
import reflex from './reflex.js';
import sketch from './sketch.js';
import timeline from './timeline.js';
import hottake from './hottake.js';
import peek from './peek.js';
import hum from './hum.js';
import bomb from './bomb.js';
import know from './know.js';
import jokes, { MAX_PACK, MAX_Q, MAX_A } from './jokes.js';

export const ENGINES = { board, wedge, fakeout, doodle, pindrop, closest, timeline, tour, scribble, oddone, whowrote, reflex, sketch, hottake, peek, hum, bomb, know, jokes, mix: tour };
setEngines(ENGINES);
export const TEAM_DRAW_TIME = 45000;
export const INTRO_TIME = 14000; // how-to-play screen before each game

/* ---------- helpers shared with the UI ---------- */

export function normalize(s) {
  if (!s) return s;
  s.players = s.players || {};
  s.order = s.order || [];
  s.settings = { game: 'board', length: 'quick', ...(s.settings || {}) };
  s.units = s.units || {};
  s.unitOrder = s.unitOrder || [];
  s.teamReady = s.teamReady || {};
  s.pscore = s.pscore || {}; // points per player this game (social modes show them)
  s.stats = s.stats || {}; // award stats this game: { key: { who: value } }
  s.pack = s.pack || {}; // Inside Jokes questions written in the lobby: { id: { q, a, by } }
  s.audience = s.audience || {}; // watchers (late joiners or "Just watch"): { id: { name, fan } }
  for (const a of Object.values(s.audience)) a.fan = a.fan ?? null;
  for (const k of ['vip', 'turn', 'results', 'hostId', 'hostName', 'drawUntil', 'introUntil']) s[k] = s[k] ?? null;
  s.mode = s.mode || 'party';
  s.teamMode = !!s.teamMode;
  for (const u of Object.values(s.units)) {
    u.members = u.members || [];
    u.wedges = u.wedges || {};
  }
  if (s.results) {
    s.results.ranked = s.results.ranked || [];
    s.results.winners = s.results.winners || [];
    s.results.awards = s.results.awards || [];
  }
  for (const e of Object.values(ENGINES)) e.normalize(s);
  return s;
}

export const controllerOf = (s) => (s.mode === 'host' && s.hostId ? s.hostId : s.vip);
export const unitOf = (s, pid) => s.players[pid]?.unit || null;

export function newLobbyState(code) {
  return normalize({
    code,
    phase: 'lobby',
    mode: 'party',
    hostId: null,
    hostName: null,
    vip: null,
    settings: { game: 'board', length: 'quick' },
    players: {},
    order: [],
    teamMode: false,
    units: {},
    unitOrder: [],
    teamReady: {},
    drawUntil: null,
    turn: null,
    results: null,
    game: 0
  });
}

/* ---------- the engine ---------- */

export class GameHost {
  constructor(db, code, { onChange, onReact, allowTiny = false }) {
    this.db = db;
    this.code = code;
    this.onChange = onChange;
    this.onReact = onReact || (() => {});
    this.allowTiny = allowTiny;
    this.state = null;
    this.presence = {};
    this.lastReact = {};
    this.unsubs = [];
    this.busy = false;
    this.mem = {}; // per-mode scratch space that doesn't need saving
  }

  path(p) { return `rooms/${this.code}/${p}`; }
  now() { return this.db.now(); }
  isHere(pid) { return !!this.presence[pid]; }
  unitHere(uid) { return (this.state.units[uid]?.members || []).some((p) => this.isHere(p)); }
  unitOf(pid) { return unitOf(this.state, pid); }
  // Players in the game who are still connected (the host never plays).
  playersHere() { return this.state.order.filter((p) => this.state.players[p]?.unit && this.isHere(p)); }

  // Give points to one player. They count for the player's unit (themselves, or their team).
  // gained: optional map that collects this round's points per player.
  award(pid, pts, gained) {
    const s = this.state;
    const uid = this.unitOf(pid);
    if (!uid || !s.units[uid] || !pts) return;
    s.units[uid].score += pts;
    s.pscore[pid] = (s.pscore[pid] || 0) + pts;
    if (gained) gained[pid] = (gained[pid] || 0) + pts;
  }

  // "Best of team": everyone plays, each unit scores its best player's points.
  // byPlayer: { pid: points }. Returns { unitId: { pts, by } } and adds the points.
  awardBest(byPlayer, gained) {
    const best = {};
    for (const [pid, pts] of Object.entries(byPlayer)) {
      const uid = this.unitOf(pid);
      if (uid && (!best[uid] || pts > best[uid].pts)) best[uid] = { pts, by: pid };
    }
    for (const [uid, b] of Object.entries(best)) {
      if (!b.pts) continue;
      this.state.units[uid].score += b.pts;
      this.state.pscore[b.by] = (this.state.pscore[b.by] || 0) + b.pts;
      if (gained) gained[uid] = (gained[uid] || 0) + b.pts;
    }
    return best;
  }

  // Award stats (see lib/awards.js). who = player id or unit id.
  stat(who, key, n = 1) {
    if (!who || !n) return;
    const st = (this.state.stats[key] = this.state.stats[key] || {});
    st[who] = (st[who] || 0) + n;
  }
  // Keeps the lowest value, e.g. the fastest buzz in ms.
  statMin(who, key, v) {
    if (!who || typeof v !== 'number' || !isFinite(v)) return;
    const st = (this.state.stats[key] = this.state.stats[key] || {});
    st[who] = Math.min(st[who] ?? Infinity, Math.max(0, Math.round(v)));
  }
  // One point for whoever had the top value this round (all of them on a tie). byWho: { who: number }.
  statTop(byWho, key, low = false) {
    const vals = Object.values(byWho).filter((v) => typeof v === 'number');
    if (!vals.length) return;
    const top = low ? Math.min(...vals) : Math.max(...vals);
    if (!low && top <= 0) return;
    for (const [who, v] of Object.entries(byWho)) if (v === top) this.stat(who, key);
  }

  get engine() { return ENGINES[this.state?.settings.game] || board; }

  async start(resume) {
    const saved = resume ? await this.db.get(this.path('state')) : null;
    this.state = normalize(saved) || newLobbyState(this.code);
    if (!saved) {
      for (const p of ['inputs', 'avatars', 'teamdraw', 'doodle', 'sketch', 'chain', 'reacts']) await this.db.remove(this.path(p));
    }
    await this.save();
    this.unsubs.push(this.db.onValue(this.path('presence'), (p) => {
      this.presence = p || {};
      this.onChange(this.state, this.presence);
    }));
    this.unsubs.push(this.db.onChildAdded(this.path('inputs'), (key, input) => {
      this.db.remove(this.path(`inputs/${key}`));
      if (input) this.handle(input);
    }));
    this.ticker = setInterval(() => this.tick(), 200);
  }

  stop() {
    clearInterval(this.ticker);
    this.engine?.stop?.(this);
    this.unsubs.forEach((u) => u && u());
  }

  async save() {
    this.onChange(this.state, this.presence);
    await this.db.set(this.path('state'), this.state);
  }

  handle(input) {
    const s = this.state;
    const from = input.from;
    const p = s.players[from];
    const isCtrl = from === controllerOf(s);

    switch (input.type) {
      case 'join': {
        const name = String(input.name || '').trim().slice(0, 14);
        if (!name || from === s.hostId) return;
        if (p) { p.name = name; break; }
        // Too late or too full to play: you join the audience instead.
        if (s.phase !== 'lobby' || s.order.length >= MAX_PLAYERS) { this.addWatcher(from, name); break; }
        delete s.audience[from];
        const used = s.order.map((id) => s.players[id].color);
        s.players[from] = {
          name,
          color: PLAYER_COLORS.find((c) => !used.includes(c)) || PLAYER_COLORS[s.order.length % PLAYER_COLORS.length],
          ready: false,
          team: null,
          unit: null
        };
        s.order.push(from);
        if (!s.vip) s.vip = from;
        break;
      }
      case 'joinHost':
        if (s.phase !== 'lobby' || (s.hostId && s.hostId !== from)) return;
        if (p) this.removePlayer(from);
        s.hostId = from;
        s.hostName = String(input.name || 'Host').trim().slice(0, 14) || 'Host';
        s.mode = 'host';
        break;
      case 'leaveHost':
        if (from !== s.hostId || s.phase !== 'lobby') return;
        s.hostId = null;
        s.hostName = null;
        s.mode = 'party';
        break;
      case 'leave':
        if (s.audience[from]) { delete s.audience[from]; break; }
        if (!p || s.phase !== 'lobby') return;
        this.removePlayer(from);
        break;
      case 'watch': {
        // "Just watch": a player in the lobby (or anyone new) moves to the audience.
        if (from === s.hostId) return;
        if (p) {
          if (s.phase !== 'lobby') return;
          this.removePlayer(from);
        }
        this.addWatcher(from, String(input.name || p?.name || '').trim().slice(0, 14) || 'Fan');
        break;
      }
      case 'cheer': {
        // The audience backs one player (fans count for the Crowd Favourite award).
        const a = s.audience[from];
        if (!a || !s.players[input.pid]) return;
        a.fan = input.pid;
        break;
      }
      case 'avatarDone':
        if (!p) return;
        p.ready = true;
        break;
      case 'pickTeam':
        if (!p || s.phase !== 'lobby' || !TEAMS[input.team]) return;
        p.team = input.team;
        break;
      case 'settings': {
        if (!isCtrl || s.phase !== 'lobby') return;
        if (input.game && MODES[input.game] && input.game !== s.settings.game) {
          s.settings.game = input.game;
          if (!MODES[input.game].lengths[s.settings.length] || MODES[input.game].lengths[s.settings.length].hidden && !this.allowTiny) {
            s.settings.length = 'quick';
          }
        }
        const len = MODES[s.settings.game].lengths[input.length];
        if (len && (!len.hidden || this.allowTiny)) s.settings.length = input.length;
        break;
      }
      case 'packAdd': {
        // Inside Jokes: anyone in the lobby can add a question and its answer.
        const q = String(input.q || '').trim().slice(0, MAX_Q);
        const a = String(input.a || '').trim().slice(0, MAX_A);
        if (!p || s.phase !== 'lobby' || !q || !a || Object.keys(s.pack).length >= MAX_PACK) return;
        s.pack[`j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`] = { q, a, by: from };
        break;
      }
      case 'packDel': {
        const x = s.pack[input.id];
        if (!x || s.phase !== 'lobby' || (x.by !== from && !isCtrl)) return;
        delete s.pack[input.id];
        break;
      }
      case 'start':
        if (!isCtrl || s.phase !== 'lobby' || s.order.length < MODES[s.settings.game].min) return;
        if (MODES[s.settings.game].needsPack && !Object.keys(s.pack).length) return;
        this.startGame();
        return;
      case 'teamDone': {
        const uid = this.unitOf(from);
        if (s.phase !== 'teamdraw' || !uid) return;
        s.teamReady[uid] = true;
        if (s.unitOrder.every((u) => s.teamReady[u])) { this.finishTeamDraw(); return; }
        break;
      }
      case 'skipIntro':
        if (!isCtrl || s.phase !== 'intro') return;
        this.beginMode();
        return;
      case 'skip':
        if (from !== s.hostId) return;
        this.engine.skip?.(this);
        return;
      case 'again':
        if (!isCtrl || s.phase !== 'end') return;
        this.backToLobby();
        break;
      case 'react': {
        if (!REACTIONS.includes(input.e)) return;
        const t = Date.now();
        if (t - (this.lastReact[from] || 0) < 350) return;
        this.lastReact[from] = t;
        const r = { from, e: input.e, color: p?.color || '#888' };
        this.onReact(r);
        // Watch screens (#/watch/CODE) can't see inputs, so mirror reactions for them.
        this.db.push(this.path('reacts'), { ...r, t: Date.now() });
        return;
      }
      default:
        if (!['lobby', 'teamdraw', 'intro', 'end'].includes(s.phase)) this.engine.input(this, from, input);
        return;
    }
    this.save();
  }

  addWatcher(id, name) {
    const s = this.state;
    if (!s.audience[id] && Object.keys(s.audience).length >= MAX_AUDIENCE) return;
    s.audience[id] = { name, fan: s.audience[id]?.fan ?? null };
  }

  removePlayer(pid) {
    const s = this.state;
    delete s.players[pid];
    s.order = s.order.filter((id) => id !== pid);
    if (s.vip === pid) s.vip = s.order[0] || null;
  }

  /* ---------- start / teams ---------- */

  startGame() {
    const s = this.state;
    s.teamMode = s.order.length > MAX_SOLO;
    s.units = {};
    s.unitOrder = [];
    s.results = null;
    if (s.teamMode) {
      const teams = this.assignTeams();
      for (const [k, members] of Object.entries(teams)) {
        const uid = `team-${k}`;
        s.units[uid] = { name: TEAMS[k].name, color: TEAMS[k].color, emoji: TEAMS[k].emoji, team: k, score: 0, wedges: {}, members };
        s.unitOrder.push(uid);
        members.forEach((pid) => (s.players[pid].unit = uid));
      }
      s.teamReady = {};
      s.drawUntil = this.now() + TEAM_DRAW_TIME;
      this.db.remove(this.path('teamdraw'));
      s.phase = 'teamdraw';
      this.save();
    } else {
      for (const pid of s.order) {
        const p = s.players[pid];
        s.units[pid] = { name: p.name, color: p.color, score: 0, wedges: {}, members: [pid] };
        s.unitOrder.push(pid);
        p.unit = pid;
      }
      this.startIntro();
    }
  }

  // Show how the chosen mode works before it starts.
  startIntro() {
    const s = this.state;
    s.introUntil = this.now() + INTRO_TIME;
    s.phase = 'intro';
    this.save();
  }

  beginMode() {
    const s = this.state;
    s.unitOrder.forEach((u) => { s.units[u].score = 0; s.units[u].wedges = {}; });
    s.pscore = {};
    s.stats = {};
    s.game += 1;
    this.mem = {};
    this.engine.start(this);
  }

  assignTeams() {
    const s = this.state;
    const n = s.order.length;
    const picked = TEAM_KEYS.filter((k) => s.order.some((pid) => s.players[pid].team === k));
    const count = Math.min(4, Math.max(2, picked.length, Math.ceil(n / 4)));
    const used = [...picked];
    for (const k of TEAM_KEYS) if (used.length < count && !used.includes(k)) used.push(k);

    const teams = Object.fromEntries(used.map((k) => [k, []]));
    const unpicked = [];
    for (const pid of s.order) {
      const t = s.players[pid].team;
      if (t && teams[t]) teams[t].push(pid);
      else unpicked.push(pid);
    }
    const smallest = () => used.reduce((a, b) => (teams[b].length < teams[a].length ? b : a));
    const largest = () => used.reduce((a, b) => (teams[b].length > teams[a].length ? b : a));
    for (const pid of shuffle(unpicked)) teams[smallest()].push(pid);
    // No empty teams, and no team more than 2 players bigger than another.
    for (let guard = 0; guard < 50; guard++) {
      const big = largest();
      const small = smallest();
      if (teams[big].length - teams[small].length <= (teams[small].length === 0 ? 0 : 2)) break;
      teams[small].push(teams[big].pop());
    }
    for (const [k, members] of Object.entries(teams)) members.forEach((pid) => (s.players[pid].team = k));
    return teams;
  }

  async finishTeamDraw() {
    if (this.busy) return;
    this.busy = true;
    const s = this.state;
    try {
      const all = (await this.db.get(this.path('teamdraw'))) || {};
      for (const uid of s.unitOrder) {
        const u = s.units[uid];
        await this.db.set(this.path(`avatars/${uid}`), renderStrokes(all[u.team]?.s, u.emoji));
      }
    } catch (e) {
      console.warn('team picture failed', e);
    }
    this.busy = false;
    if (s.phase === 'teamdraw') this.startIntro();
  }

  /* ---------- end ---------- */

  // Modes call this when the game is over. rank: optional sort function for unit ids.
  finish(rank) {
    const s = this.state;
    const byScore = (a, b) => s.units[b].score - s.units[a].score;
    const ranked = [...s.unitOrder].sort(rank || byScore);
    const best = ranked[0];
    const winners = ranked.filter((u) => (rank || byScore)(u, best) === 0);
    // Crowd Favourite: fans in the audience (only the ones still watching).
    for (const [id, a] of Object.entries(s.audience)) if (a.fan && s.players[a.fan] && this.isHere(id)) this.stat(a.fan, 'crowd');
    let awards = [];
    try { awards = pickAwards(s.stats); } catch (e) { console.warn('awards failed', e); }
    s.results = { ranked, winners, awards };
    winners.forEach((u) => addWin(s.units[u].name));
    s.phase = 'end';
    this.save();
  }

  backToLobby() {
    const s = this.state;
    this.engine.stop?.(this);
    this.engine.reset(s);
    s.phase = 'lobby';
    s.units = {};
    s.unitOrder = [];
    s.teamMode = false;
    s.teamReady = {};
    s.results = null;
    s.turn = null;
    s.order.forEach((pid) => (s.players[pid].unit = null));
  }

  tick() {
    const s = this.state;
    if (!s) return;
    const now = this.now();
    if (s.phase === 'teamdraw') {
      if (now >= s.drawUntil) this.finishTeamDraw();
      return;
    }
    if (s.phase === 'intro') {
      if (now >= s.introUntil) this.beginMode();
      return;
    }
    if (s.phase === 'lobby' || s.phase === 'end') return;
    this.engine.tick(this, now);
  }
}
