/**
 * base-system.js — 기지/홈스테드: 건물, 방어, 친구 방문
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 건물 정의 ──
const BUILDINGS = [
  { id: 'forge',   name: '대장간',   emoji: '🔨', desc: '장비 제작 및 강화',
    baseCost: 500,  costMul: 1.8, baseRate: 10, rateMul: 1.3, maxLevel: 10 },
  { id: 'alchemy', name: '연금술 연구소', emoji: '⚗️', desc: '포션 및 소모품 제작',
    baseCost: 600,  costMul: 1.8, baseRate: 8,  rateMul: 1.3, maxLevel: 10 },
  { id: 'library', name: '도서관',   emoji: '📚', desc: '스킬 연구 및 해금',
    baseCost: 800,  costMul: 2.0, baseRate: 5,  rateMul: 1.4, maxLevel: 10 },
  { id: 'temple',  name: '신전',     emoji: '⛪', desc: '기도 포인트 생산',
    baseCost: 1000, costMul: 2.0, baseRate: 3,  rateMul: 1.5, maxLevel: 10 },
];

// ── 방어 시설 ──
const DEFENSES = [
  { id: 'tower',     name: '감시탑',   emoji: '🗼', baseCost: 300, maxLevel: 5, defPerLv: 10 },
  { id: 'trap',      name: '함정',     emoji: '🪤', baseCost: 200, maxLevel: 5, defPerLv: 8 },
  { id: 'mercenary', name: 'NPC 용병', emoji: '⚔️', baseCost: 500, maxLevel: 3, defPerLv: 20 },
];

// ── 장식 ──
const DECORATIONS = [
  { id: 'fountain', name: '분수대', emoji: '⛲', cost: 1000 },
  { id: 'garden',   name: '정원',   emoji: '🌷', cost: 800 },
  { id: 'statue',   name: '석상',   emoji: '🗿', cost: 1500 },
  { id: 'lantern',  name: '등불',   emoji: '🏮', cost: 500 },
];

class BaseSystem {
  init() {
    if (!GameState.base) {
      GameState.base = {
        buildings: {},
        defenses: {},
        decorations: [],
        lastCollected: {},
        visitors: 0,
        baseRank: 0,
      };
      BUILDINGS.forEach(b => { GameState.base.buildings[b.id] = { level: 1, stored: 0 }; });
      DEFENSES.forEach(d => { GameState.base.defenses[d.id] = { level: 0 }; });
    }
  }

  // ── 건물 ──
  getBuildings() {
    this.init();
    return BUILDINGS.map(def => {
      const state = GameState.base.buildings[def.id];
      return {
        ...def,
        level: state.level,
        stored: state.stored,
        upgradeCost: this._upgradeCost(def, state.level),
        productionRate: this.getProductionRate(def.id),
        canUpgrade: state.level < def.maxLevel,
      };
    });
  }

  upgradeBuilding(id) {
    this.init();
    const def = BUILDINGS.find(b => b.id === id);
    const state = GameState.base.buildings[id];
    if (!def || !state || state.level >= def.maxLevel) return { success: false, error: '최대 레벨' };

    const cost = this._upgradeCost(def, state.level);
    if (GameState.gold < cost) return { success: false, error: '골드 부족' };

    GameState.addGold(-cost);
    state.level++;
    EventBus.emit('base:building_upgraded', { id, level: state.level });
    return { success: true, newLevel: state.level };
  }

  getProductionRate(id) {
    this.init();
    const def = BUILDINGS.find(b => b.id === id);
    const state = GameState.base.buildings[id];
    if (!def || !state) return 0;
    return Math.floor(def.baseRate * Math.pow(def.rateMul, state.level - 1));
  }

  collect(buildingId) {
    this.init();
    const state = GameState.base.buildings[buildingId];
    if (!state) return 0;
    const last = GameState.base.lastCollected[buildingId] || Date.now();
    const elapsed = (Date.now() - last) / 60000; // minutes
    const rate = this.getProductionRate(buildingId);
    const produced = Math.floor(rate * elapsed);
    if (produced <= 0) return 0;

    state.stored = 0;
    GameState.base.lastCollected[buildingId] = Date.now();
    GameState.addGold(produced);
    EventBus.emit('base:collected', { buildingId, amount: produced });
    return produced;
  }

  // ── 방어 ──
  getDefenses() {
    this.init();
    return DEFENSES.map(def => {
      const state = GameState.base.defenses[def.id];
      return { ...def, level: state.level, totalDef: state.level * def.defPerLv,
        upgradeCost: Math.floor(def.baseCost * Math.pow(1.5, state.level)),
        canUpgrade: state.level < def.maxLevel };
    });
  }

  upgradeDefense(id) {
    this.init();
    const def = DEFENSES.find(d => d.id === id);
    const state = GameState.base.defenses[id];
    if (!def || !state || state.level >= def.maxLevel) return { success: false };
    const cost = Math.floor(def.baseCost * Math.pow(1.5, state.level));
    if (GameState.gold < cost) return { success: false, error: '골드 부족' };
    GameState.addGold(-cost);
    state.level++;
    EventBus.emit('base:defense_upgraded', { id, level: state.level });
    return { success: true, newLevel: state.level };
  }

  // ── 장식 ──
  getDecorations() { return DECORATIONS; }

  buyDecoration(id) {
    this.init();
    const dec = DECORATIONS.find(d => d.id === id);
    if (!dec || GameState.gold < dec.cost) return { success: false };
    GameState.addGold(-dec.cost);
    GameState.base.decorations.push(id);
    EventBus.emit('base:decoration_added', dec);
    return { success: true };
  }

  // ── 친구 방문 / 랭킹 ──
  visitFriend() {
    this.init();
    GameState.base.visitors++;
    EventBus.emit('base:friend_visited');
  }

  getBaseRank() {
    this.init();
    const totalLevel = Object.values(GameState.base.buildings).reduce((s, b) => s + b.level, 0);
    const defLevel = Object.values(GameState.base.defenses).reduce((s, d) => s + d.level, 0);
    GameState.base.baseRank = totalLevel * 100 + defLevel * 50 + GameState.base.decorations.length * 20;
    return GameState.base.baseRank;
  }

  // ── 내부 ──
  _upgradeCost(def, level) {
    return Math.floor(def.baseCost * Math.pow(def.costMul, level - 1));
  }
}

export { BUILDINGS, DEFENSES, DECORATIONS };
export default new BaseSystem();
