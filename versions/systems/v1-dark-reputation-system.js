/**
 * reputation-system.js — 평판: 4세력, 등급, 세력 상점
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 세력 ──
const FACTIONS = [
  { id: 'human',  name: '인간 왕국',   emoji: '👑', desc: '대륙 중심의 강대국' },
  { id: 'elf',    name: '엘프 동맹',   emoji: '🧝', desc: '숲을 수호하는 고결한 종족' },
  { id: 'dwarf',  name: '드워프 부족', emoji: '⛏️', desc: '대장장이의 산악 부족' },
  { id: 'angel',  name: '천사 기사단', emoji: '😇', desc: '신성한 빛의 수호자' },
];

// ── 평판 등급 ──
const REP_GRADES = [
  { id: 'hostile',   name: '적대',   min: -1000, max: -1,    color: '#e74c3c' },
  { id: 'neutral',   name: '중립',   min: 0,     max: 999,   color: '#95a5a6' },
  { id: 'friendly',  name: '우호',   min: 1000,  max: 2999,  color: '#2ecc71' },
  { id: 'respected', name: '존경',   min: 3000,  max: 5999,  color: '#3498db' },
  { id: 'revered',   name: '숭배',   min: 6000,  max: 10000, color: '#f1c40f' },
];

// ── 세력 상점 (등급별 해금) ──
const FACTION_SHOPS = {
  human: {
    neutral:   [{ id: 'h_potion',   name: '왕국의 물약',    cost: 100,  stats: { hp: 50 } }],
    friendly:  [{ id: 'h_sword',    name: '기사의 검',      cost: 2000, stats: { attack: 5 } }],
    respected: [{ id: 'h_armor',    name: '왕실 갑옷',      cost: 5000, stats: { defense: 10 } }],
    revered:   [{ id: 'h_crown',    name: '왕관',           cost: 15000, stats: { attack: 10, defense: 5 } }],
  },
  elf: {
    neutral:   [{ id: 'e_herb',     name: '엘프 약초',      cost: 80,   stats: { hp: 40 } }],
    friendly:  [{ id: 'e_bow',      name: '숲의 활',        cost: 2500, stats: { attack: 6, critRate: 3 } }],
    respected: [{ id: 'e_cloak',    name: '은빛 망토',      cost: 6000, stats: { speed: 2, defense: 5 } }],
    revered:   [{ id: 'e_tiara',    name: '세계수 왕관',    cost: 18000, stats: { attack: 8, speed: 3 } }],
  },
  dwarf: {
    neutral:   [{ id: 'd_ore',      name: '정제된 광석',    cost: 120,  stats: {} }],
    friendly:  [{ id: 'd_hammer',   name: '룬 망치',        cost: 2200, stats: { attack: 7 } }],
    respected: [{ id: 'd_shield',   name: '미스릴 방패',    cost: 5500, stats: { defense: 12 } }],
    revered:   [{ id: 'd_anvil',    name: '전설의 모루',    cost: 20000, stats: { attack: 12, defense: 8 } }],
  },
  angel: {
    neutral:   [{ id: 'a_blessing', name: '축복의 깃털',    cost: 150,  stats: { hp: 60 } }],
    friendly:  [{ id: 'a_staff',    name: '성스러운 지팡이', cost: 3000, stats: { attack: 5, critDamage: 10 } }],
    respected: [{ id: 'a_wings',    name: '빛의 날개',      cost: 7000, stats: { speed: 3, defense: 6 } }],
    revered:   [{ id: 'a_halo',     name: '천사의 후광',    cost: 25000, stats: { attack: 15, defense: 10, speed: 2 } }],
  },
};

class ReputationSystem {
  init() {
    if (!GameState.reputation) {
      GameState.reputation = {};
      FACTIONS.forEach(f => { GameState.reputation[f.id] = 0; });
    }
  }

  addReputation(factionId, amount) {
    this.init();
    if (GameState.reputation[factionId] === undefined) return;
    const before = this.getGrade(factionId);
    GameState.reputation[factionId] = Math.max(-1000, Math.min(10000, GameState.reputation[factionId] + amount));
    const after = this.getGrade(factionId);
    EventBus.emit('reputation:changed', { factionId, value: GameState.reputation[factionId], grade: after });
    if (before.id !== after.id) {
      EventBus.emit('reputation:grade_up', { factionId, from: before, to: after });
    }
  }

  getReputation(factionId) {
    this.init();
    return GameState.reputation[factionId] ?? 0;
  }

  getGrade(factionId) {
    this.init();
    const rep = GameState.reputation[factionId] ?? 0;
    return REP_GRADES.find(g => rep >= g.min && rep <= g.max) || REP_GRADES[0];
  }

  getAllFactions() {
    this.init();
    return FACTIONS.map(f => ({
      ...f,
      reputation: GameState.reputation[f.id],
      grade: this.getGrade(f.id),
    }));
  }

  getFactionShop(factionId) {
    this.init();
    const shop = FACTION_SHOPS[factionId];
    if (!shop) return [];
    const grade = this.getGrade(factionId);
    const gradeOrder = REP_GRADES.map(g => g.id);
    const gradeIdx = gradeOrder.indexOf(grade.id);
    const items = [];
    for (const [reqGrade, list] of Object.entries(shop)) {
      const reqIdx = gradeOrder.indexOf(reqGrade);
      const unlocked = gradeIdx >= reqIdx;
      list.forEach(item => items.push({ ...item, requiredGrade: reqGrade, unlocked }));
    }
    return items;
  }

  buyFactionItem(factionId, itemId) {
    this.init();
    const available = this.getFactionShop(factionId).filter(i => i.unlocked);
    const item = available.find(i => i.id === itemId);
    if (!item) return { success: false, error: '해금 필요' };
    if (GameState.gold < item.cost) return { success: false, error: '골드 부족' };
    GameState.addGold(-item.cost);
    EventBus.emit('reputation:item_bought', { factionId, item });
    return { success: true, item };
  }
}

export { FACTIONS, REP_GRADES, FACTION_SHOPS };
export default new ReputationSystem();
