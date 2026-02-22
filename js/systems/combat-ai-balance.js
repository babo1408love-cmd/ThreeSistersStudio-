/**
 * CombatAIBalance — 실시간 AI 전투 밸런스 시스템
 *
 * 모든 전투 모드(Stage2, Survival, BossRoom, Gunfight 등)에서 공용으로 사용.
 * 플레이어 상태를 실시간 분석하여 몹 공격력을 자동 조절.
 *
 * ★ 핵심 로직:
 *   1. HP 비율 기반: 여유→강하게, 위기→약하게
 *   2. 연속 피격 자비: 2초 내 3회+ 피격 시 추가 감소
 *   3. 시간 경과 보정: 초반 약하게 → 점진 증가
 *   4. 분노 모드 보정: 분노 발동 중 몹 공격력 증가 (밸런스)
 *
 * 사용법:
 *   import CombatAIBalance from '../systems/combat-ai-balance.js';
 *   const aiBalance = new CombatAIBalance(player);
 *   // _damagePlayer에서:
 *   const mult = aiBalance.getDamageMult();
 *   const adjusted = Math.round(rawDamage * mult);
 */

export default class CombatAIBalance {
  /**
   * @param {object} player - 플레이어 객체 { hp, maxHp }
   * @param {object} [options]
   * @param {number}  options.mercyWindow   - 자비 판정 시간 (ms, 기본 2000)
   * @param {number}  options.mercyHits     - 자비 발동 피격 횟수 (기본 3)
   * @param {number}  options.mercyMult     - 자비 발동 시 추가 배율 (기본 0.6)
   * @param {number}  options.minMult       - 최소 배율 (기본 0.3)
   * @param {number}  options.maxMult       - 최대 배율 (기본 1.5)
   * @param {number}  options.graceTime     - 초반 유예 시간 (ms, 기본 10000)
   */
  constructor(player, options = {}) {
    this.player = player;
    this.mercyWindow = options.mercyWindow || 2000;
    this.mercyHits = options.mercyHits || 3;
    this.mercyMult = options.mercyMult || 0.6;
    this.minMult = options.minMult || 0.3;
    this.maxMult = options.maxMult || 1.5;
    this.graceTime = options.graceTime || 10000;
    this._stageLevel = options.stageLevel || 1;

    this._hitLog = [];
    this._startTime = Date.now();
    this._rageActive = false;
  }

  /**
   * 분노 모드 상태 설정 (외부에서 호출)
   */
  setRageActive(active) {
    this._rageActive = active;
  }

  /**
   * 피격 기록 (getDamageMult 호출 전에 반드시 호출)
   */
  recordHit() {
    this._hitLog.push(Date.now());
  }

  /**
   * 실시간 AI 데미지 배율 계산
   * @returns {number} 0.3 ~ 1.5 범위의 배율
   */
  getDamageMult() {
    const now = Date.now();
    const hpRatio = this.player.hp / this.player.maxHp;
    const elapsed = (now - this._startTime) / 1000; // seconds

    // 피격 기록 정리
    this._hitLog = this._hitLog.filter(t => now - t < this.mercyWindow);
    const hitCount2Sec = this._hitLog.length;

    if (typeof FormulaPack2 !== 'undefined') {
      return FormulaPack2.getCombatDamageMultiplier(
        this._stageLevel || 1,
        hpRatio,
        hitCount2Sec,
        elapsed,
        this._rageActive
      );
    }

    // ── 기존 고정값 (폴백) ──
    // let mult = 0.4 + hpRatio * 1.0;
    // if (this._hitLog.length >= this.mercyHits) mult *= this.mercyMult;
    // if (elapsed * 1000 < this.graceTime) { mult *= 0.5 + (elapsed * 1000 / this.graceTime) * 0.5; }
    // if (this._rageActive) mult *= 1.3;
    // return Math.max(this.minMult, Math.min(this.maxMult, mult));
    let mult = 0.4 + hpRatio * 1.0;
    if (hitCount2Sec >= this.mercyHits) mult *= this.mercyMult;
    const elapsedMs = now - this._startTime;
    if (elapsedMs < this.graceTime) { mult *= 0.5 + (elapsedMs / this.graceTime) * 0.5; }
    if (this._rageActive) mult *= 1.3;
    return Math.max(this.minMult, Math.min(this.maxMult, mult));
  }

  /**
   * 현재 AI 상태 스냅샷 (디버그/HUD용)
   */
  getState() {
    const hpRatio = this.player.hp / this.player.maxHp;
    const mult = this.getDamageMult();
    const recentHits = this._hitLog.length;
    return { hpRatio, mult, recentHits, rageActive: this._rageActive };
  }
}
