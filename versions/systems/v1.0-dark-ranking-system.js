/**
 * ranking-system.js — Rankings & leaderboards
 * Individual (combat/PvP/dungeon/tower), guild, season rewards
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const RANKING_TYPES = {
  combatPower:  { name: '전투력',       emoji: '⚔️', individual: true },
  pvp:          { name: 'PvP 순위',     emoji: '🏟️', individual: true },
  dungeon:      { name: '던전 클리어',   emoji: '🏰', individual: true },
  infiniteTower:{ name: '무한의 탑',     emoji: '🗼', individual: true },
  guildLevel:   { name: '길드 레벨',     emoji: '🏛️', individual: false },
  guildPower:   { name: '길드 전투력',   emoji: '🛡️', individual: false },
  guildWar:     { name: '길드전 승수',   emoji: '🏆', individual: false },
};

const SEASON_DURATION_MS = 30 * 86400000; // 30 days
const LEADERBOARD_SIZE = 100;

const SEASON_REWARDS = [
  { rankMin: 1,  rankMax: 1,  rewards: [{ type: 'diamond', amount: 5000 }, { type: 'title', name: '전설의 챔피언' }] },
  { rankMin: 2,  rankMax: 3,  rewards: [{ type: 'diamond', amount: 3000 }, { type: 'title', name: '위대한 전사' }] },
  { rankMin: 4,  rankMax: 10, rewards: [{ type: 'diamond', amount: 2000 }, { type: 'frame', name: '엘리트 프레임' }] },
  { rankMin: 11, rankMax: 50, rewards: [{ type: 'diamond', amount: 1000 }] },
  { rankMin: 51, rankMax: 100,rewards: [{ type: 'diamond', amount: 500 }] },
];

class RankingSystem {
  constructor() {
    this._boards = {}; // { type: [{ id, name, score, timestamp }] }
  }

  // ── Init ──
  init() {
    if (!GameState.rankings) {
      GameState.rankings = {
        myScores: {},       // { type: score }
        seasonNumber: 1,
        seasonStartedAt: Date.now(),
        seasonRewardsClaimed: false,
        history: [],        // [{ season, type, rank, score }]
      };
    }
    // Initialize leaderboards for each type
    for (const type of Object.keys(RANKING_TYPES)) {
      if (!this._boards[type]) {
        this._boards[type] = this._generateNpcEntries(type);
      }
    }
    EventBus.on('combat:ended', (data) => {
      if (data?.score) this.addScore('combatPower', data.score);
    });
    EventBus.on('dungeon:cleared', (data) => {
      if (data?.floor) this.addScore('dungeon', data.floor);
    });
  }

  // ── Get ranking (leaderboard) ──
  getRanking(type) {
    this.init();
    if (!RANKING_TYPES[type]) return null;
    const board = this._boards[type] || [];
    // Insert player's own score
    const myScore = GameState.rankings.myScores[type] || 0;
    const combined = [...board];
    const myEntry = { id: 'self', name: GameState.playerName, score: myScore, timestamp: Date.now() };
    const existing = combined.findIndex(e => e.id === 'self');
    if (existing !== -1) combined[existing] = myEntry;
    else combined.push(myEntry);
    combined.sort((a, b) => b.score - a.score);
    return combined.slice(0, LEADERBOARD_SIZE).map((entry, idx) => ({
      rank: idx + 1, ...entry,
    }));
  }

  // ── Get my rank for a type ──
  getMyRank(type) {
    this.init();
    const board = this.getRanking(type);
    if (!board) return null;
    const me = board.find(e => e.id === 'self');
    return me || { rank: board.length + 1, id: 'self', name: GameState.playerName, score: 0 };
  }

  // ── Add score ──
  addScore(type, score) {
    this.init();
    if (!RANKING_TYPES[type]) return { success: false, error: '잘못된 랭킹 타입입니다' };
    const prev = GameState.rankings.myScores[type] || 0;
    // Keep highest for dungeon/tower, accumulate for pvp/combat
    if (type === 'dungeon' || type === 'infiniteTower') {
      GameState.rankings.myScores[type] = Math.max(prev, score);
    } else {
      GameState.rankings.myScores[type] = prev + score;
    }
    const current = GameState.rankings.myScores[type];
    const rank = this.getMyRank(type);
    EventBus.emit('ranking:scoreChanged', { type, prev, current, rank: rank?.rank });
    return { success: true, prev, current, rank: rank?.rank };
  }

  // ── Season management ──
  checkSeasonEnd() {
    this.init();
    const elapsed = Date.now() - GameState.rankings.seasonStartedAt;
    return elapsed >= SEASON_DURATION_MS;
  }

  getSeasonInfo() {
    this.init();
    const r = GameState.rankings;
    const elapsed = Date.now() - r.seasonStartedAt;
    const remaining = Math.max(0, SEASON_DURATION_MS - elapsed);
    return {
      season: r.seasonNumber,
      daysRemaining: Math.ceil(remaining / 86400000),
      ended: elapsed >= SEASON_DURATION_MS,
      rewardsClaimed: r.seasonRewardsClaimed,
    };
  }

  getSeasonRewards() {
    this.init();
    const r = GameState.rankings;
    if (r.seasonRewardsClaimed) return { success: false, error: '이미 보상을 수령했습니다' };
    if (!this.checkSeasonEnd()) return { success: false, error: '시즌이 아직 종료되지 않았습니다' };

    const allRewards = [];
    for (const type of Object.keys(RANKING_TYPES)) {
      if (!RANKING_TYPES[type].individual) continue;
      const rank = this.getMyRank(type);
      if (!rank) continue;
      const tier = SEASON_REWARDS.find(s => rank.rank >= s.rankMin && rank.rank <= s.rankMax);
      if (tier) {
        allRewards.push({ type, rank: rank.rank, rewards: tier.rewards });
        r.history.push({ season: r.seasonNumber, type, rank: rank.rank, score: rank.score });
      }
    }

    r.seasonRewardsClaimed = true;
    EventBus.emit('ranking:seasonRewardsClaimed', { season: r.seasonNumber, rewards: allRewards });
    return { success: true, season: r.seasonNumber, rewards: allRewards };
  }

  resetSeason() {
    this.init();
    const r = GameState.rankings;
    r.seasonNumber++;
    r.seasonStartedAt = Date.now();
    r.seasonRewardsClaimed = false;
    // Soft reset: keep 50% of scores
    for (const type of Object.keys(r.myScores)) {
      r.myScores[type] = Math.floor(r.myScores[type] * 0.5);
    }
    // Regenerate NPC boards
    for (const type of Object.keys(RANKING_TYPES)) {
      this._boards[type] = this._generateNpcEntries(type);
    }
    EventBus.emit('ranking:seasonReset', { season: r.seasonNumber });
  }

  // ── Get ranking type info ──
  getRankingTypes() {
    return { ...RANKING_TYPES };
  }

  // ── NPC entry generation (simulated leaderboard) ──
  _generateNpcEntries(type) {
    const names = ['별빛요정','달빛정령','숲의수호자','바람의노래','불꽃전사',
      '얼음마법사','그림자도적','황금기사','은하탐험가','수정연금술사',
      '번개사냥꾼','대지의힘','파도의왕','하늘의검','용의후예',
      '꽃의여왕','철벽수비','빛의창','어둠의눈','폭풍의날개'];
    const base = type === 'guildWar' ? 20 : type === 'guildLevel' ? 15 : 5000;
    const variance = type === 'guildWar' ? 5 : type === 'guildLevel' ? 5 : 3000;
    return names.map((name, i) => ({
      id: `npc_${i}`,
      name,
      score: Math.max(1, Math.floor(base + (Math.random() - 0.3) * variance - i * (variance / 20))),
      timestamp: Date.now() - Math.random() * 86400000,
    })).sort((a, b) => b.score - a.score);
  }
}

export { RANKING_TYPES, SEASON_REWARDS };
export default new RankingSystem();
