/**
 * event-system.js — 기간 이벤트, 시즌 이벤트, 배틀패스 관리
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 기간 이벤트 정의 ──
const PERIOD_EVENTS = [
  { id: 'special_dungeon', name: '특별 던전 개방', desc: '한정 던전에서 희귀 재료 획득', type: 'dungeon', durationDays: 7, rewards: { diamond: 50, soulShard: 30 } },
  { id: 'double_exp', name: '2배 경험치', desc: '모든 경험치 획득량 2배', type: 'boost', durationDays: 3, multiplier: 2 },
  { id: 'drop_rate_up', name: '드롭률 증가', desc: '아이템 드롭률 50% 증가', type: 'boost', durationDays: 5, multiplier: 1.5 },
  { id: 'gold_rush', name: '골드 러시', desc: '골드 획득량 3배', type: 'boost', durationDays: 2, multiplier: 3 },
  { id: 'boss_challenge', name: '보스 챌린지', desc: '강화된 보스 출현, 특별 보상', type: 'dungeon', durationDays: 4, rewards: { diamond: 100, legendary_ticket: 1 } },
];

// ── 시즌 이벤트 정의 ──
const SEASON_EVENTS = [
  { id: 'summer', name: '여름 축제', desc: '해변 테마, 수영복 스킨 드롭', months: [6, 7, 8], theme: 'beach', skinIds: ['skin_summer_01', 'skin_summer_02'] },
  { id: 'halloween', name: '할로윈', desc: '호박 테마, 코스튬 스킨', months: [10], theme: 'spooky', skinIds: ['skin_halloween_01', 'skin_halloween_02'] },
  { id: 'christmas', name: '크리스마스', desc: '눈 테마, 산타 스킨', months: [12], theme: 'snow', skinIds: ['skin_xmas_01', 'skin_xmas_02'] },
  { id: 'spring', name: '봄맞이', desc: '벚꽃 테마, 꽃 스킨', months: [3, 4], theme: 'cherry_blossom', skinIds: ['skin_spring_01'] },
];

// ── 배틀패스 보상 (레벨 1~50) ──
const BATTLE_PASS_REWARDS = Array.from({ length: 50 }, (_, i) => {
  const lv = i + 1;
  const isMilestone = lv % 10 === 0;
  return {
    level: lv,
    free: isMilestone
      ? { diamond: lv * 5, gold: lv * 200 }
      : { gold: lv * 100, exp: lv * 20 },
    premium: isMilestone
      ? { diamond: lv * 10, skinTicket: 1, legendary_ticket: lv === 50 ? 1 : 0 }
      : { diamond: lv * 2, soulShard: lv },
  };
});

const BP_EXP_PER_LEVEL = 1000;

class EventSystem {
  init() {
    if (!GameState.events) {
      GameState.events = {
        activePeriods: {},   // { eventId: { startTime, endTime } }
        battlePass: { level: 1, exp: 0, premium: false, claimed: {} },
      };
    }
  }

  // ── 활성 이벤트 조회 ──
  getActiveEvents() {
    this.init();
    const now = Date.now();
    const active = [];
    // 기간 이벤트
    for (const [id, timing] of Object.entries(GameState.events.activePeriods)) {
      if (now >= timing.startTime && now <= timing.endTime) {
        const def = PERIOD_EVENTS.find(e => e.id === id);
        if (def) active.push({ ...def, ...timing, active: true });
      }
    }
    // 시즌 이벤트
    const month = new Date().getMonth() + 1;
    SEASON_EVENTS.forEach(se => {
      if (se.months.includes(month)) active.push({ ...se, active: true, isSeason: true });
    });
    return active;
  }

  // ── 기간 이벤트 시작 ──
  startPeriodEvent(eventId) {
    this.init();
    const def = PERIOD_EVENTS.find(e => e.id === eventId);
    if (!def) return false;
    const now = Date.now();
    GameState.events.activePeriods[eventId] = {
      startTime: now,
      endTime: now + def.durationDays * 86400000,
    };
    EventBus.emit('event:started', def);
    return true;
  }

  // ── 현재 시즌 테마 ──
  getCurrentSeasonTheme() {
    const month = new Date().getMonth() + 1;
    const season = SEASON_EVENTS.find(s => s.months.includes(month));
    return season ? season.theme : null;
  }

  // ── 배틀패스 ──
  getBattlePass() {
    this.init();
    const bp = GameState.events.battlePass;
    return {
      level: bp.level,
      exp: bp.exp,
      expToNext: BP_EXP_PER_LEVEL,
      premium: bp.premium,
      rewards: BATTLE_PASS_REWARDS,
      claimed: { ...bp.claimed },
    };
  }

  addBattlePassExp(amount) {
    this.init();
    const bp = GameState.events.battlePass;
    bp.exp += amount;
    while (bp.exp >= BP_EXP_PER_LEVEL && bp.level < 50) {
      bp.exp -= BP_EXP_PER_LEVEL;
      bp.level++;
      EventBus.emit('battlepass:levelup', bp.level);
    }
    if (bp.level >= 50) bp.exp = 0;
    EventBus.emit('battlepass:expGained', { level: bp.level, exp: bp.exp });
  }

  claimBattlePassReward(level) {
    this.init();
    const bp = GameState.events.battlePass;
    if (level > bp.level) return null;
    if (bp.claimed[level]) return null;
    const reward = BATTLE_PASS_REWARDS.find(r => r.level === level);
    if (!reward) return null;
    bp.claimed[level] = true;
    const result = bp.premium ? { ...reward.free, ...reward.premium } : { ...reward.free };
    EventBus.emit('battlepass:claimed', { level, reward: result });
    return result;
  }

  upgradeToPremium() {
    this.init();
    GameState.events.battlePass.premium = true;
    EventBus.emit('battlepass:premium');
  }

  // ── 부스트 배율 조회 ──
  getBoostMultiplier(type) {
    const events = this.getActiveEvents();
    let mult = 1;
    events.forEach(e => { if (e.type === 'boost' && e.multiplier) mult *= e.multiplier; });
    return mult;
  }
}

export { PERIOD_EVENTS, SEASON_EVENTS, BATTLE_PASS_REWARDS };
export default new EventSystem();
