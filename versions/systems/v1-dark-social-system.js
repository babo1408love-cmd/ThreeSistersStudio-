/**
 * social-system.js — Social features
 * Friends, guild, chat, mentoring
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const GUILD_MAX_LEVEL = 20;
const FRIEND_POINTS_DAILY = 10;
const GUILD_MEMBERS_BASE = 20;

class SocialSystem {
  constructor() {
    this._chatLog = []; // { channel, from, message, timestamp }
  }

  // -- Init (ensure GameState.social exists) --
  init() {
    if (!GameState.social) {
      GameState.social = {
        friends: [],           // [{ id, name, level, lastPointsSent, online }]
        friendPoints: 0,
        pendingRequests: [],   // [{ id, name, timestamp }]
        guild: null,           // { id, name, level, exp, members[], war, boss, shop }
        mentoring: null,       // { mentorId, menteeId, progress, rewards }
      };
    }
    EventBus.on('daily:reset', () => this._resetDailyFriendPoints());
  }

  // ── Friends ──
  addFriend(id) {
    const s = GameState.social;
    if (s.friends.find(f => f.id === id)) return { success: false, error: '이미 친구입니다' };
    if (s.friends.length >= 50) return { success: false, error: '친구 목록이 가득 찼습니다' };
    s.friends.push({ id, name: `Player_${id}`, level: 1, lastPointsSent: 0, online: false });
    EventBus.emit('social:friendAdded', { id });
    return { success: true };
  }

  removeFriend(id) {
    const s = GameState.social;
    const idx = s.friends.findIndex(f => f.id === id);
    if (idx === -1) return { success: false, error: '친구를 찾을 수 없습니다' };
    s.friends.splice(idx, 1);
    EventBus.emit('social:friendRemoved', { id });
    return { success: true };
  }

  sendFriendPoints() {
    const s = GameState.social;
    const now = Date.now();
    const DAY = 86400000;
    let sent = 0;
    for (const f of s.friends) {
      if (now - f.lastPointsSent >= DAY) {
        f.lastPointsSent = now;
        sent++;
      }
    }
    s.friendPoints += sent * FRIEND_POINTS_DAILY;
    EventBus.emit('social:friendPointsSent', { sent, total: s.friendPoints });
    return { sent, total: s.friendPoints };
  }

  getFriendSummon() {
    const s = GameState.social;
    const cost = 100;
    if (s.friendPoints < cost) return { success: false, error: '포인트 부족' };
    s.friendPoints -= cost;
    const mercenary = { id: Date.now(), name: '용병', level: GameState.heroLevel, duration: 3600000 };
    EventBus.emit('social:friendSummon', mercenary);
    return { success: true, mercenary };
  }

  // ── Guild ──
  createGuild(name) {
    const s = GameState.social;
    if (s.guild) return { success: false, error: '이미 길드에 가입되어 있습니다' };
    s.guild = {
      id: Date.now(), name, level: 1, exp: 0,
      members: [{ id: 'self', name: GameState.playerName, role: 'master' }],
      maxMembers: GUILD_MEMBERS_BASE,
      war: { wins: 0, losses: 0, season: 1 },
      boss: { currentHp: 10000, maxHp: 10000, lastAttempt: 0 },
      shop: [],
    };
    EventBus.emit('social:guildCreated', { name });
    return { success: true, guild: s.guild };
  }

  joinGuild(id) {
    const s = GameState.social;
    if (s.guild) return { success: false, error: '이미 길드에 가입되어 있습니다' };
    s.guild = {
      id, name: `Guild_${id}`, level: 1, exp: 0,
      members: [{ id: 'self', name: GameState.playerName, role: 'member' }],
      maxMembers: GUILD_MEMBERS_BASE,
      war: { wins: 0, losses: 0, season: 1 },
      boss: { currentHp: 10000, maxHp: 10000, lastAttempt: 0 },
      shop: [],
    };
    EventBus.emit('social:guildJoined', { id });
    return { success: true };
  }

  leaveGuild() {
    const s = GameState.social;
    if (!s.guild) return { success: false, error: '길드에 가입되어 있지 않습니다' };
    const name = s.guild.name;
    s.guild = null;
    EventBus.emit('social:guildLeft', { name });
    return { success: true };
  }

  getGuildInfo() {
    const s = GameState.social;
    if (!s.guild) return null;
    const g = s.guild;
    const expNeeded = g.level * 1000;
    return { ...g, expNeeded, canLevelUp: g.exp >= expNeeded && g.level < GUILD_MAX_LEVEL };
  }

  addGuildExp(amount) {
    const g = GameState.social?.guild;
    if (!g) return;
    g.exp += amount;
    const expNeeded = g.level * 1000;
    if (g.exp >= expNeeded && g.level < GUILD_MAX_LEVEL) {
      g.exp -= expNeeded;
      g.level++;
      g.maxMembers = GUILD_MEMBERS_BASE + g.level * 2;
      EventBus.emit('social:guildLevelUp', { level: g.level });
    }
  }

  // ── Chat (data only) ──
  sendChat(channel, message) {
    const entry = { channel, from: GameState.playerName, message, timestamp: Date.now() };
    this._chatLog.push(entry);
    if (this._chatLog.length > 500) this._chatLog.splice(0, 100);
    EventBus.emit('social:chat', entry);
    return entry;
  }

  getChatLog(channel) {
    return this._chatLog.filter(c => c.channel === channel);
  }

  // ── Mentoring ──
  startMentoring(menteeId) {
    const s = GameState.social;
    if (GameState.heroLevel < 10) return { success: false, error: '레벨 10 이상이어야 멘토가 될 수 있습니다' };
    s.mentoring = { mentorId: 'self', menteeId, progress: 0, rewards: [] };
    EventBus.emit('social:mentoringStarted', { menteeId });
    return { success: true };
  }

  completeMentoring() {
    const s = GameState.social;
    if (!s.mentoring) return { success: false };
    const rewards = { mentorGold: 5000, menteeGold: 3000, mentorExp: 500 };
    s.mentoring.rewards.push(rewards);
    s.mentoring = null;
    EventBus.emit('social:mentoringCompleted', rewards);
    return { success: true, rewards };
  }

  // ── Internal ──
  _resetDailyFriendPoints() {
    const s = GameState.social;
    if (!s) return;
    for (const f of s.friends) f.lastPointsSent = 0;
  }
}

export default new SocialSystem();
