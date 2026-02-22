/**
 * pvp-system.js — PvP: 아레나(1v1), 전장(3v3/10v10), 길드전
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 랭크 티어 ──
const RANK_TIERS = [
  { id: 'bronze',   name: '브론즈',   min: 0,    max: 999,  icon: '🥉' },
  { id: 'silver',   name: '실버',     min: 1000, max: 1999, icon: '🥈' },
  { id: 'gold',     name: '골드',     min: 2000, max: 2999, icon: '🥇' },
  { id: 'platinum', name: '플래티넘', min: 3000, max: 3999, icon: '💎' },
  { id: 'diamond',  name: '다이아',   min: 4000, max: Infinity, icon: '👑' },
];

// ── 시즌 보상 (티어별) ──
const SEASON_REWARDS = {
  bronze:   { gold: 1000,  diamond: 10,  honorPoint: 50 },
  silver:   { gold: 3000,  diamond: 30,  honorPoint: 150 },
  gold:     { gold: 6000,  diamond: 60,  honorPoint: 300 },
  platinum: { gold: 10000, diamond: 100, honorPoint: 500 },
  diamond:  { gold: 20000, diamond: 200, honorPoint: 1000 },
};

// ── 전장 모드 ──
const BATTLEFIELD_MODES = [
  { id: 'team_3v3', name: '팀 전투', size: 3, desc: '3vs3 팀 대결' },
  { id: 'capture_10v10', name: '점령전', size: 10, desc: '10vs10 거점 점령' },
];

const SEASON_DURATION_DAYS = 30;

class PvpSystem {
  init() {
    if (!GameState.pvp) {
      GameState.pvp = {
        arenaPoints: 0,
        arenaWins: 0,
        arenaLosses: 0,
        arenaHistory: [],
        seasonStart: Date.now(),
        seasonRewardClaimed: false,
        guildWar: { wins: 0, losses: 0, capturePoints: 0 },
        battlefieldStats: { team_3v3: { wins: 0, losses: 0 }, capture_10v10: { wins: 0, losses: 0 } },
      };
    }
  }

  // ── 아레나 1v1 ──
  startArenaMatch() {
    this.init();
    const pvp = GameState.pvp;
    const opponentPower = (GameState.player.attack + GameState.player.defense) * (0.8 + Math.random() * 0.4);
    const playerPower = GameState.player.attack + GameState.player.defense + Math.random() * 10;
    const won = playerPower >= opponentPower;

    if (won) {
      pvp.arenaPoints = Math.max(0, pvp.arenaPoints + 30);
      pvp.arenaWins++;
    } else {
      pvp.arenaPoints = Math.max(0, pvp.arenaPoints - 20);
      pvp.arenaLosses++;
    }

    const result = { won, pointsDelta: won ? 30 : -20, newPoints: pvp.arenaPoints, tier: this._getTierByPoints(pvp.arenaPoints) };
    pvp.arenaHistory.unshift({ ...result, timestamp: Date.now() });
    if (pvp.arenaHistory.length > 50) pvp.arenaHistory.length = 50;

    EventBus.emit('pvp:arena_result', result);
    return result;
  }

  getArenaRank() {
    this.init();
    const p = GameState.pvp;
    return {
      points: p.arenaPoints,
      tier: this._getTierByPoints(p.arenaPoints),
      wins: p.arenaWins,
      losses: p.arenaLosses,
      winRate: p.arenaWins + p.arenaLosses > 0
        ? Math.round(p.arenaWins / (p.arenaWins + p.arenaLosses) * 100) : 0,
    };
  }

  // ── 시즌 ──
  getSeasonInfo() {
    this.init();
    const elapsed = Date.now() - GameState.pvp.seasonStart;
    const remaining = Math.max(0, SEASON_DURATION_DAYS * 86400000 - elapsed);
    const daysLeft = Math.ceil(remaining / 86400000);
    const tier = this._getTierByPoints(GameState.pvp.arenaPoints);
    return { daysLeft, tier, reward: SEASON_REWARDS[tier.id], claimed: GameState.pvp.seasonRewardClaimed };
  }

  claimSeasonReward() {
    this.init();
    const info = this.getSeasonInfo();
    if (info.claimed) return null;
    if (info.daysLeft > 0) return null;
    GameState.pvp.seasonRewardClaimed = true;
    EventBus.emit('pvp:season_reward', info.reward);
    return info.reward;
  }

  resetSeason() {
    this.init();
    const pvp = GameState.pvp;
    pvp.arenaPoints = Math.floor(pvp.arenaPoints * 0.5);
    pvp.arenaHistory = [];
    pvp.seasonStart = Date.now();
    pvp.seasonRewardClaimed = false;
    EventBus.emit('pvp:season_reset');
  }

  // ── 전장 ──
  getBattlefieldModes() { return BATTLEFIELD_MODES; }

  recordBattlefield(modeId, won) {
    this.init();
    const stats = GameState.pvp.battlefieldStats[modeId];
    if (!stats) return;
    won ? stats.wins++ : stats.losses++;
    EventBus.emit('pvp:battlefield_result', { modeId, won });
  }

  // ── 길드전 ──
  recordGuildWar(won, capturePoints = 0) {
    this.init();
    const gw = GameState.pvp.guildWar;
    won ? gw.wins++ : gw.losses++;
    gw.capturePoints += capturePoints;
    EventBus.emit('pvp:guildwar_result', { won, capturePoints });
  }

  // ── 헬퍼 ──
  _getTierByPoints(pts) {
    return RANK_TIERS.find(t => pts >= t.min && pts <= t.max) || RANK_TIERS[0];
  }
}

export { RANK_TIERS, SEASON_REWARDS, BATTLEFIELD_MODES };
export default new PvpSystem();
