/**
 * raid-system.js — 레이드: 일반/하드/월드보스/길드레이드
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 레이드 타입 ──
const RAID_TYPES = [
  { id: 'normal_4',   name: '일반 레이드',   size: 4,  desc: '4인 일반 던전' },
  { id: 'hard_8',     name: '하드 레이드',   size: 8,  desc: '8인 상급 던전' },
  { id: 'world_16',   name: '월드 보스',     size: 16, desc: '16인 월드 보스' },
  { id: 'guild_raid', name: '길드 레이드',   size: 20, desc: '길드 전용 레이드' },
];

// ── 보스 ──
const RAID_BOSSES = [
  { id: 'ancient_dragon',  name: '고대 드래곤',   emoji: '🐉', hp: 500000,  atk: 300, def: 150, phases: 5 },
  { id: 'fallen_god',      name: '타락한 신',     emoji: '👹', hp: 800000,  atk: 400, def: 200, phases: 5 },
  { id: 'dimension_lord',  name: '차원의 군주',   emoji: '🌀', hp: 1200000, atk: 500, def: 250, phases: 5 },
  { id: 'final_boss',      name: '최종 보스',     emoji: '💀', hp: 2000000, atk: 700, def: 350, phases: 5 },
];

// ── 난이도 ──
const DIFFICULTIES = [
  { id: 'story',  name: '스토리', hpMul: 0.5, atkMul: 0.5, rewardMul: 0.5, timeLimit: 600 },
  { id: 'normal', name: '일반',   hpMul: 1.0, atkMul: 1.0, rewardMul: 1.0, timeLimit: 480 },
  { id: 'hard',   name: '하드',   hpMul: 2.0, atkMul: 1.5, rewardMul: 2.0, timeLimit: 360 },
  { id: 'hell',   name: '지옥',   hpMul: 4.0, atkMul: 2.5, rewardMul: 4.0, timeLimit: 300 },
];

// ── 역할 ──
const ROLES = ['tank', 'dealer', 'healer'];

// ── 보상 풀 ──
const REWARD_POOL = {
  story:  { gold: 1000,  legendaryChance: 0.01, materials: 2, coins: 10 },
  normal: { gold: 3000,  legendaryChance: 0.05, materials: 5, coins: 25 },
  hard:   { gold: 8000,  legendaryChance: 0.15, materials: 10, coins: 50 },
  hell:   { gold: 20000, legendaryChance: 0.30, materials: 20, coins: 100 },
};

let _nextRaidId = 1;

class RaidSystem {
  init() {
    if (!GameState.raids) {
      GameState.raids = {
        active: null,
        history: [],
        weeklyClears: {},
        totalClears: 0,
      };
    }
  }

  createRaid(typeId, difficultyId) {
    this.init();
    const type = RAID_TYPES.find(t => t.id === typeId);
    const diff = DIFFICULTIES.find(d => d.id === difficultyId);
    if (!type || !diff) return null;

    const boss = RAID_BOSSES[Math.floor(Math.random() * RAID_BOSSES.length)];
    const raid = {
      id: `raid_${_nextRaidId++}`,
      type, difficulty: diff, boss: { ...boss },
      scaledHp: Math.floor(boss.hp * diff.hpMul),
      scaledAtk: Math.floor(boss.atk * diff.atkMul),
      currentHp: Math.floor(boss.hp * diff.hpMul),
      currentPhase: 1,
      members: [{ name: GameState.playerName, role: 'dealer' }],
      maxMembers: type.size,
      timeLimit: diff.timeLimit,
      status: 'waiting',
      createdAt: Date.now(),
    };

    GameState.raids.active = raid;
    EventBus.emit('raid:created', raid);
    return raid;
  }

  joinRaid(raidId) {
    this.init();
    const raid = GameState.raids.active;
    if (!raid || raid.id !== raidId) return { success: false, error: '레이드 없음' };
    if (raid.members.length >= raid.maxMembers) return { success: false, error: '정원 초과' };
    if (raid.status !== 'waiting') return { success: false, error: '이미 시작됨' };

    const npc = { name: `NPC_${raid.members.length}`, role: ROLES[raid.members.length % 3] };
    raid.members.push(npc);
    EventBus.emit('raid:member_joined', npc);
    return { success: true, member: npc };
  }

  startRaid() {
    this.init();
    const raid = GameState.raids.active;
    if (!raid || raid.status !== 'waiting') return false;
    raid.status = 'in_progress';
    raid.startedAt = Date.now();

    // 시뮬레이션: DPS = 멤버 수 * 플레이어 공격력
    const totalDps = raid.members.length * GameState.player.attack * 100;
    const timeNeeded = raid.scaledHp / totalDps;
    const cleared = timeNeeded <= raid.timeLimit;

    raid.status = cleared ? 'cleared' : 'failed';
    raid.clearTime = cleared ? Math.ceil(timeNeeded) : raid.timeLimit;
    if (cleared) GameState.raids.totalClears++;

    const result = { cleared, clearTime: raid.clearTime, boss: raid.boss.name };
    GameState.raids.history.unshift({ ...result, raidId: raid.id, timestamp: Date.now() });
    if (GameState.raids.history.length > 30) GameState.raids.history.length = 30;

    EventBus.emit('raid:finished', result);
    return result;
  }

  getRaidRewards() {
    this.init();
    const raid = GameState.raids.active;
    if (!raid || raid.status !== 'cleared') return null;

    const pool = REWARD_POOL[raid.difficulty.id];
    const rewards = {
      gold: Math.floor(pool.gold * raid.difficulty.rewardMul),
      materials: pool.materials,
      raidCoins: pool.coins,
      legendaryDrop: Math.random() < pool.legendaryChance,
    };

    raid.status = 'rewarded';
    EventBus.emit('raid:rewards', rewards);
    return rewards;
  }

  getActiveRaid() { this.init(); return GameState.raids.active; }
  getRaidHistory() { this.init(); return GameState.raids.history; }
}

export { RAID_TYPES, RAID_BOSSES, DIFFICULTIES, ROLES };
export default new RaidSystem();
