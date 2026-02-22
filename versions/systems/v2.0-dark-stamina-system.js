/**
 * stamina-system.js — 스태미나 관리
 * 최대100, 5분당1회복, 레벨업시 전체회복
 * 스테이지 6 소모, 던전 10 소모
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const STAMINA_CONFIG = {
  max: 100,
  regenInterval: 5 * 60 * 1000, // 5분 = 300000ms
  costs: {
    stage: 6,
    dungeon: 10,
    survival: 8,
    arena: 4,
    raid: 12,
  },
};

class StaminaSystem {
  init() {
    if (GameState.stamina === undefined) {
      GameState.stamina = { current: STAMINA_CONFIG.max, lastRegenTime: Date.now() };
    }
  }

  // ── 시간 경과분 회복 (앱 복귀 시 호출) ──
  processRegen() {
    this.init();
    const now = Date.now();
    const elapsed = now - (GameState.stamina.lastRegenTime || now);
    const regenCount = Math.floor(elapsed / STAMINA_CONFIG.regenInterval);
    if (regenCount > 0 && GameState.stamina.current < STAMINA_CONFIG.max) {
      const prev = GameState.stamina.current;
      GameState.stamina.current = Math.min(STAMINA_CONFIG.max, GameState.stamina.current + regenCount);
      GameState.stamina.lastRegenTime = now;
      if (GameState.stamina.current !== prev) {
        EventBus.emit('stamina:changed', { prev, current: GameState.stamina.current });
      }
    } else {
      GameState.stamina.lastRegenTime = now;
    }
  }

  get() {
    this.init();
    this.processRegen();
    return GameState.stamina.current;
  }

  getMax() { return STAMINA_CONFIG.max; }

  // ── 소모 ──
  spend(type) {
    this.init();
    this.processRegen();
    const cost = STAMINA_CONFIG.costs[type] || 0;
    if (GameState.stamina.current < cost) return false;
    const prev = GameState.stamina.current;
    GameState.stamina.current -= cost;
    EventBus.emit('stamina:changed', { prev, current: GameState.stamina.current, cost, type });
    return true;
  }

  canAfford(type) {
    this.init();
    this.processRegen();
    const cost = STAMINA_CONFIG.costs[type] || 0;
    return GameState.stamina.current >= cost;
  }

  // ── 전체 회복 (레벨업/아이템 사용) ──
  fullRestore() {
    this.init();
    GameState.stamina.current = STAMINA_CONFIG.max;
    GameState.stamina.lastRegenTime = Date.now();
    EventBus.emit('stamina:full_restore');
  }

  // ── 물약으로 추가 회복 ──
  addStamina(amount) {
    this.init();
    const prev = GameState.stamina.current;
    GameState.stamina.current = Math.min(STAMINA_CONFIG.max + 50, GameState.stamina.current + amount); // 최대 150까지 오버플로우 허용
    EventBus.emit('stamina:changed', { prev, current: GameState.stamina.current });
  }

  // ── 다음 회복까지 남은 시간(ms) ──
  getTimeToNextRegen() {
    this.init();
    if (GameState.stamina.current >= STAMINA_CONFIG.max) return 0;
    const elapsed = Date.now() - GameState.stamina.lastRegenTime;
    return Math.max(0, STAMINA_CONFIG.regenInterval - (elapsed % STAMINA_CONFIG.regenInterval));
  }
}

export { STAMINA_CONFIG };
export default new StaminaSystem();
