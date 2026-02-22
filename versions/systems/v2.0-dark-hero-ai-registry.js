/**
 * HeroAIRegistry — 주인공 AI 자동 등록/활성화 시스템
 *
 * 모든 AI 모듈을 중앙 관리하고, 새로 탑재되는 AI도 자동 활성화.
 * HeroCore에 탑재되어 전투 시작 시 모든 AI를 일괄 초기화.
 *
 * ★ 핵심 원칙:
 *   1. 모든 등록된 AI는 항상 활성 (skipAI 없음)
 *   2. 새 AI 등록 시 자동 init() 호출
 *   3. 매 프레임 update() 일괄 호출
 *   4. 전투 종료 시 일괄 destroy()
 *
 * 사용법:
 *   import HeroAIRegistry from '../systems/hero-ai-registry.js';
 *   const registry = new HeroAIRegistry(player);
 *   registry.register('combatBalance', aiBalanceInstance);
 *   registry.register('formation', formationAI, { updateOrder: 5 });
 *   // 매 프레임:
 *   registry.updateAll(dt, context);
 *   // 전투 종료:
 *   registry.destroyAll();
 */

export default class HeroAIRegistry {
  constructor(player) {
    this.player = player;
    /** @type {Map<string, {ai:object, order:number, active:boolean}>} */
    this._registry = new Map();
    this._sorted = [];  // order 정렬된 배열 캐시
    this._dirty = false;
  }

  /**
   * AI 모듈 등록 — 즉시 활성화
   * @param {string} name — 고유 이름 (예: 'speedAI', 'formation', 'combatBalance')
   * @param {object} ai — AI 인스턴스 (init/update/destroy 메서드 지원)
   * @param {object} [options]
   * @param {number}  options.updateOrder — update 호출 순서 (낮을수록 먼저, 기본 10)
   * @param {boolean} options.active — 초기 활성 상태 (기본 true)
   */
  register(name, ai, options = {}) {
    if (!ai) return;
    const entry = {
      ai,
      order: options.updateOrder ?? 10,
      active: options.active !== false,  // 기본 true
    };
    this._registry.set(name, entry);
    this._dirty = true;

    // 자동 초기화
    if (entry.active && typeof ai.init === 'function') {
      try { ai.init(this.player); } catch (e) {
        console.warn(`[AIRegistry] ${name}.init() 실패:`, e);
      }
    }

    return this;
  }

  /**
   * AI 모듈 제거
   */
  unregister(name) {
    const entry = this._registry.get(name);
    if (entry && typeof entry.ai.destroy === 'function') {
      try { entry.ai.destroy(); } catch (e) { /* ignore */ }
    }
    this._registry.delete(name);
    this._dirty = true;
  }

  /**
   * AI 가져오기
   */
  get(name) {
    const entry = this._registry.get(name);
    return entry ? entry.ai : null;
  }

  /**
   * AI 활성/비활성 토글
   */
  setActive(name, active) {
    const entry = this._registry.get(name);
    if (entry) entry.active = active;
  }

  /**
   * 모든 AI가 항상 활성 (skipAI 개념 제거)
   */
  activateAll() {
    for (const entry of this._registry.values()) {
      entry.active = true;
    }
  }

  /**
   * 매 프레임 — 모든 활성 AI update() 호출
   * @param {number} dt — 밀리초
   * @param {object} context — { enemies, player, allies, spirits, camera, ... }
   */
  updateAll(dt, context) {
    if (this._dirty) {
      this._sorted = [...this._registry.entries()]
        .sort((a, b) => a[1].order - b[1].order);
      this._dirty = false;
    }

    for (const [name, entry] of this._sorted) {
      if (!entry.active) continue;
      if (typeof entry.ai.update === 'function') {
        try {
          entry.ai.update(dt, context);
        } catch (e) {
          console.warn(`[AIRegistry] ${name}.update() 오류:`, e);
        }
      }
    }
  }

  /**
   * 전투 종료 — 모든 AI destroy() 호출
   */
  destroyAll() {
    for (const [name, entry] of this._registry) {
      if (typeof entry.ai.destroy === 'function') {
        try { entry.ai.destroy(); } catch (e) { /* ignore */ }
      }
    }
    this._registry.clear();
    this._sorted = [];
    this._dirty = false;
  }

  /**
   * 등록된 AI 목록 (디버그/스냅샷용)
   */
  list() {
    const result = [];
    for (const [name, entry] of this._registry) {
      result.push({
        name,
        active: entry.active,
        order: entry.order,
        hasUpdate: typeof entry.ai.update === 'function',
        hasDestroy: typeof entry.ai.destroy === 'function',
      });
    }
    return result.sort((a, b) => a.order - b.order);
  }

  /**
   * 등록된 AI 수
   */
  get size() { return this._registry.size; }
}
