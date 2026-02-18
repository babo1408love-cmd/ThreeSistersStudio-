/**
 * codex-system.js — 영웅/몬스터/아이템 도감 수집 및 보너스
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 도감 정의 ──
const CODEX_DEFS = {
  hero: {
    name: '영웅 도감',
    totalEntries: 40,
    bonuses: [
      { threshold: 5,  bonus: { atkPct: 2 },  desc: 'ATK +2%' },
      { threshold: 10, bonus: { atkPct: 5 },  desc: 'ATK +5%' },
      { threshold: 20, bonus: { atkPct: 8, hpPct: 3 },  desc: 'ATK +8%, HP +3%' },
      { threshold: 30, bonus: { atkPct: 12, defPct: 5 }, desc: 'ATK +12%, DEF +5%' },
      { threshold: 40, bonus: { atkPct: 15, hpPct: 5, defPct: 5 }, desc: 'ATK +15%, HP +5%, DEF +5%' },
    ],
    fields: ['name', 'class', 'rarity', 'story', 'illustration'],
  },
  monster: {
    name: '몬스터 도감',
    totalEntries: 60,
    bonuses: [
      { threshold: 10, bonus: { dropRatePct: 3 },  desc: '드롭률 +3%' },
      { threshold: 20, bonus: { dropRatePct: 5, goldPct: 3 },  desc: '드롭률 +5%, 골드 +3%' },
      { threshold: 30, bonus: { dropRatePct: 8, expPct: 5 },   desc: '드롭률 +8%, EXP +5%' },
      { threshold: 50, bonus: { dropRatePct: 12, goldPct: 5, expPct: 5 }, desc: '드롭률 +12%, 골드 +5%, EXP +5%' },
      { threshold: 60, bonus: { dropRatePct: 15, goldPct: 8, expPct: 8 }, desc: '전체 보너스 최대' },
    ],
    fields: ['name', 'type', 'weakness', 'drops', 'habitat'],
  },
  item: {
    name: '아이템 도감',
    totalEntries: 80,
    bonuses: [
      { threshold: 10, bonus: { defPct: 2 },  desc: 'DEF +2%' },
      { threshold: 20, bonus: { defPct: 4, hpPct: 2 },  desc: 'DEF +4%, HP +2%' },
      { threshold: 40, bonus: { defPct: 6, hpPct: 4, atkPct: 2 }, desc: 'DEF +6%, HP +4%, ATK +2%' },
      { threshold: 60, bonus: { defPct: 8, hpPct: 5, atkPct: 4 }, desc: 'DEF +8%, HP +5%, ATK +4%' },
      { threshold: 80, bonus: { defPct: 10, hpPct: 8, atkPct: 5 }, desc: '전체 보너스 최대' },
    ],
    fields: ['name', 'type', 'rarity', 'stats', 'description'],
  },
};

class CodexSystem {
  init() {
    if (!GameState.codex) {
      GameState.codex = {
        hero: {},     // { id: { discovered: true, ...fields } }
        monster: {},
        item: {},
      };
    }
  }

  // ── 도감 등록 ──
  discover(type, id, info = {}) {
    this.init();
    if (!CODEX_DEFS[type]) return false;
    if (!GameState.codex[type]) GameState.codex[type] = {};
    const isNew = !GameState.codex[type][id];
    GameState.codex[type][id] = { discovered: true, discoveredAt: Date.now(), ...info };
    if (isNew) {
      const count = Object.keys(GameState.codex[type]).length;
      EventBus.emit('codex:discovered', { type, id, count });
      // 보너스 달성 체크
      const def = CODEX_DEFS[type];
      const unlocked = def.bonuses.find(b => b.threshold === count);
      if (unlocked) {
        EventBus.emit('codex:bonusUnlocked', { type, bonus: unlocked });
      }
    }
    return isNew;
  }

  // ── 도감 조회 ──
  getCodex(type) {
    this.init();
    if (!CODEX_DEFS[type]) return null;
    const entries = GameState.codex[type] || {};
    return {
      name: CODEX_DEFS[type].name,
      entries: { ...entries },
      discovered: Object.keys(entries).length,
      total: CODEX_DEFS[type].totalEntries,
    };
  }

  // ── 수집 보너스 계산 ──
  getCollectionBonus(type) {
    this.init();
    if (!CODEX_DEFS[type]) return {};
    const count = Object.keys(GameState.codex[type] || {}).length;
    const def = CODEX_DEFS[type];
    let totalBonus = {};
    def.bonuses.forEach(b => {
      if (count >= b.threshold) {
        for (const [k, v] of Object.entries(b.bonus)) {
          totalBonus[k] = (totalBonus[k] || 0) + v;
        }
      }
    });
    return totalBonus;
  }

  // ── 전체 보너스 합산 ──
  getAllBonuses() {
    const combined = {};
    for (const type of Object.keys(CODEX_DEFS)) {
      const bonus = this.getCollectionBonus(type);
      for (const [k, v] of Object.entries(bonus)) {
        combined[k] = (combined[k] || 0) + v;
      }
    }
    return combined;
  }

  // ── 완성도 ──
  getCompletionRate(type) {
    this.init();
    if (!CODEX_DEFS[type]) return 0;
    const count = Object.keys(GameState.codex[type] || {}).length;
    return Math.round(count / CODEX_DEFS[type].totalEntries * 100);
  }

  // ── 전체 완성도 ──
  getTotalCompletionRate() {
    let total = 0, discovered = 0;
    for (const type of Object.keys(CODEX_DEFS)) {
      total += CODEX_DEFS[type].totalEntries;
      discovered += Object.keys(GameState.codex?.[type] || {}).length;
    }
    return total > 0 ? Math.round(discovered / total * 100) : 0;
  }

  // ── 특정 엔트리 조회 ──
  getEntry(type, id) {
    this.init();
    return GameState.codex[type]?.[id] || null;
  }

  // ── 보너스 목록 ──
  getBonusList(type) {
    if (!CODEX_DEFS[type]) return [];
    const count = Object.keys(GameState.codex?.[type] || {}).length;
    return CODEX_DEFS[type].bonuses.map(b => ({ ...b, unlocked: count >= b.threshold }));
  }
}

export { CODEX_DEFS };
export default new CodexSystem();
