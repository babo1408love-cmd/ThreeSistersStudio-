/**
 * RageSystem -- 분노 게이지 모듈
 *
 * 게이지가 100에 도달하면 분노 발동 (5초간 공격력 2배).
 * **세션(전투) 당 발동 횟수 제한** — 등급에 따라 차등:
 *   Legendary(4) / Mythic(5) : 최대 3회
 *   Epic(3)                  : 최대 2회
 *   Common(1) / Rare(2)      : 최대 1회
 *
 * 사용법:
 *   import RageSystem from '../systems/rage-system.js';
 *   const rage = new RageSystem({
 *     maxTriggers: RageSystem.resolveMaxTriggers(GameState),
 *   });
 *   // 매 프레임:
 *   rage.update(dt);
 *   // 게이지 충전:
 *   if (rage.add(12)) engine._triggerRage();
 *   // 피해 배율:
 *   const dmg = baseDmg * rage.getDamageMultiplier();
 */

// 등급 문자열 → 숫자 매핑
const RARITY_MAP = {
  common: 1, rare: 2, magic: 2, epic: 3, legendary: 4, mythic: 5,
};

export default class RageSystem {
  /**
   * @param {object} options
   * @param {number}  options.maxTriggers     - 세션 당 최대 발동 횟수 (기본 1)
   * @param {number}  options.initialGauge    - 초기 게이지 (기본 0)
   * @param {number}  options.duration        - 분노 지속 시간 ms (기본 5000)
   * @param {number}  options.damageMultiplier - 분노 중 공격 배율 (기본 2.0)
   * @param {number}  options.gainRate        - 게이지 충전 배율 (기본 1.0)
   */
  constructor(options = {}) {
    this.gauge = options.initialGauge || 0;
    this.maxGauge = 100;
    this.active = false;
    this.timer = 0;
    this.duration = options.duration || 5000;
    this.damageMultiplier = options.damageMultiplier || 2.0;

    // 세션 당 발동 제한
    this.maxTriggers = options.maxTriggers || 1;
    this.triggerCount = 0;

    // 충전 배율 (GameState.player.rageGainRate / 100)
    this.gainRate = options.gainRate || 1.0;
  }

  // ══════════════════════════════════
  //  Static helpers — 등급 → 최대 발동 횟수
  // ══════════════════════════════════

  /**
   * 등급(숫자 또는 문자열) → 최대 분노 발동 횟수
   * @param {number|string} rarity
   * @returns {number} 1~3
   */
  static getMaxTriggers(rarity) {
    const r = typeof rarity === 'string'
      ? (RARITY_MAP[rarity] || 1)
      : (rarity || 1);
    if (r >= 4) return 3;  // Legendary / Mythic
    if (r >= 3) return 2;  // Epic
    return 1;              // Common / Rare
  }

  /**
   * GameState에서 영웅 등급을 자동 추론 → 최대 발동 횟수
   *
   * 1) heroSlots에 장착된 영웅 중 가장 높은 등급 사용
   * 2) 없으면 heroLevel 기반 (20+ → 3, 10+ → 2, else 1)
   * @param {object} gameState - GameState 싱글턴
   * @returns {number} 1~3
   */
  static resolveMaxTriggers(gameState) {
    // 1. 슬롯 영웅 등급 확인
    const slots = gameState.heroSlots || [];
    let bestRarity = 0;
    for (const h of slots) {
      if (!h) continue;
      const r = typeof h.rarity === 'string'
        ? (RARITY_MAP[h.rarity] || 0)
        : (h.rarity || 0);
      if (r > bestRarity) bestRarity = r;
    }
    if (bestRarity > 0) return RageSystem.getMaxTriggers(bestRarity);

    // 2. heroLevel 기반 폴백
    const level = gameState.heroLevel || 1;
    if (level >= 20) return 3; // Legendary tier
    if (level >= 10) return 2; // Epic tier
    return 1;                  // Common/Rare tier
  }

  // ══════════════════════════════════
  //  Core API
  // ══════════════════════════════════

  /**
   * 게이지 충전. 100 도달 시 true 반환 (발동 준비).
   * 이미 분노 활성 중이거나 발동 횟수 소진 시 충전 불가 → false.
   * @param {number} amount - 충전량 (gainRate 적용 전)
   * @returns {boolean} true = 게이지 만땅, 발동 가능
   */
  add(amount) {
    if (this.active) return false;
    if (this.triggerCount >= this.maxTriggers) return false;

    this.gauge = Math.min(this.maxGauge, this.gauge + amount * this.gainRate);

    if (this.gauge >= this.maxGauge) {
      return true; // 호출자가 _triggerRage() 호출
    }
    return false;
  }

  /**
   * 분노 발동. 발동 횟수 차감 + 게이지 초기화 + 타이머 시작.
   * 발동 불가 시 false.
   * @returns {boolean} 발동 성공 여부
   */
  trigger() {
    if (this.triggerCount >= this.maxTriggers) return false;
    if (this.active) return false;

    this.active = true;
    this.gauge = 0;
    this.timer = this.duration;
    this.triggerCount++;
    return true;
  }

  /**
   * 매 프레임 호출. 분노 타이머 업데이트.
   * @param {number} dt - ms
   * @returns {boolean} true = 이번 프레임에 분노 종료됨
   */
  update(dt) {
    if (!this.active) return false;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.active = false;
      this.timer = 0;
      return true; // 방금 종료됨
    }
    return false;
  }

  // ══════════════════════════════════
  //  Query API
  // ══════════════════════════════════

  /** 분노 활성 중인가 */
  isActive() { return this.active; }

  /** 게이지 충전 가능한가 (비활성 + 횟수 남음) */
  canCharge() { return !this.active && this.triggerCount < this.maxTriggers; }

  /** 현재 게이지 (0~100) */
  getGauge() { return this.gauge; }

  /** 남은 발동 횟수 */
  getTriggersRemaining() { return Math.max(0, this.maxTriggers - this.triggerCount); }

  /** 최대 발동 횟수 */
  getMaxTriggers() { return this.maxTriggers; }

  /** 현재 공격 배율 (비활성=1.0, 활성=damageMultiplier) */
  getDamageMultiplier() { return this.active ? this.damageMultiplier : 1.0; }

  /** 발동 횟수 소진 여부 */
  isExhausted() { return this.triggerCount >= this.maxTriggers; }

  // ══════════════════════════════════
  //  Utility
  // ══════════════════════════════════

  /** 세션 리셋 (새 전투 시작 시) */
  reset() {
    this.gauge = 0;
    this.active = false;
    this.timer = 0;
    this.triggerCount = 0;
  }

  /** 직렬화 */
  toJSON() {
    return {
      gauge: this.gauge,
      triggerCount: this.triggerCount,
      maxTriggers: this.maxTriggers,
    };
  }
}
