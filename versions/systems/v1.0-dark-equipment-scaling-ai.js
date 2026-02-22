/**
 * EquipmentScalingAI — 장비/슬롯영웅 분리 스케일링 AI
 *
 * ★ 핵심 원칙:
 *   장비와 슬롯영웅이 주는 보너스는 적 스케일링에 반영하지 않는다.
 *   적은 주인공의 "맨몸 스탯"(레벨 성장만)에 맞춰 강해진다.
 *   → 장비/슬롯영웅을 모을수록 실질적 이점이 생김.
 *
 * 사용법:
 *   import EquipmentScalingAI from '../systems/equipment-scaling-ai.js';
 *   const ai = new EquipmentScalingAI(player, gameState);
 *   const nakedPower = ai.getNakedPower();      // 적 스케일링용
 *   const totalPower = ai.getTotalPower();       // 실제 전투력
 *   const advantage  = ai.getAdvantageRatio();   // 장비 이점 배율
 *
 * HeroAIRegistry 자동 등록:
 *   registry.register('equipScaling', ai, { updateOrder: 0 });
 */
export default class EquipmentScalingAI {
  /**
   * @param {object} player — 전투 플레이어 엔티티 (combat.player)
   * @param {object} gameState — GameState 싱글턴
   */
  constructor(player, gameState) {
    this.player = player;
    this.gs = gameState;

    // 캐시
    this._nakedPower = 0;
    this._totalPower = 0;
    this._equipBonus = { attack: 0, defense: 0, maxHp: 0, speed: 0 };
    this._slotHeroBonus = { attack: 0, defense: 0 };
    this._dirty = true;

    this._recalc();
  }

  // ── HeroAIRegistry 인터페이스 ──

  init(player) {
    this.player = player;
    this._dirty = true;
  }

  update(dt, context) {
    // 매 프레임 재계산은 비효율 → 1초마다 갱신
    this._tickTimer = (this._tickTimer || 0) + dt;
    if (this._tickTimer >= 1000) {
      this._tickTimer = 0;
      this._dirty = true;
    }
    if (this._dirty) this._recalc();
  }

  destroy() {
    this.player = null;
    this.gs = null;
  }

  // ── 공개 API ──

  /**
   * 맨몸 전투력 (적 스케일링용)
   * 장비/슬롯영웅 보너스 제외
   */
  getNakedPower() {
    if (this._dirty) this._recalc();
    return this._nakedPower;
  }

  /**
   * 총 전투력 (실제 전투 능력)
   * 장비+슬롯영웅 포함
   */
  getTotalPower() {
    if (this._dirty) this._recalc();
    return this._totalPower;
  }

  /**
   * 장비 이점 배율 (total / naked)
   * 1.0 = 장비 없음, 1.3 = 30% 이점
   */
  getAdvantageRatio() {
    if (this._dirty) this._recalc();
    return this._nakedPower > 0
      ? this._totalPower / this._nakedPower
      : 1.0;
  }

  /**
   * 장비 보너스 합계
   */
  getEquipmentBonus() {
    if (this._dirty) this._recalc();
    return { ...this._equipBonus };
  }

  /**
   * 슬롯영웅 보너스 합계
   */
  getSlotHeroBonus() {
    if (this._dirty) this._recalc();
    return { ...this._slotHeroBonus };
  }

  /**
   * 상태 스냅샷 (디버그/UI용)
   */
  getState() {
    if (this._dirty) this._recalc();
    return {
      nakedPower: this._nakedPower,
      totalPower: this._totalPower,
      advantage: this.getAdvantageRatio(),
      equipBonus: { ...this._equipBonus },
      slotHeroBonus: { ...this._slotHeroBonus },
    };
  }

  // ── 내부 계산 ──

  _recalc() {
    this._dirty = false;
    const gs = this.gs;
    if (!gs) return;

    // ① 맨몸 스탯 (레벨 성장만, 장비 제외)
    const base = gs.getBaseStats();
    this._nakedPower = this._calcPower(
      base.maxHp, base.attack, base.defense, base.speed
    );

    // ② 장비 보너스
    const eq = gs.getEquipmentBonus();
    this._equipBonus = {
      attack: eq.attack || 0,
      defense: eq.defense || 0,
      maxHp: eq.maxHp || 0,
      speed: eq.speed || 0,
    };

    // ③ 슬롯영웅 보너스 합산
    let slotAtk = 0, slotDef = 0;
    const slots = gs.heroSlots || [];
    for (const hero of slots) {
      if (!hero) continue;
      slotAtk += (hero.attack || hero.atk || 0);
      slotDef += (hero.defense || hero.def || 0);
    }
    this._slotHeroBonus = { attack: slotAtk, defense: slotDef };

    // ④ 총 전투력 (장비+슬롯영웅 포함)
    const p = gs.player;
    this._totalPower = this._calcPower(
      p.maxHp + this._slotHeroBonus.attack * 0, // 슬롯영웅은 별도 엔티티이므로 HP에는 미반영
      p.attack,
      p.defense,
      p.speed
    );
  }

  /**
   * BalanceAI와 동일한 전투력 공식
   * power = (atk × speed × 0.8) + (hp × 0.3) + (def × 0.5)
   */
  _calcPower(hp, atk, def, speed) {
    return Math.round((atk * speed * 0.8) + (hp * 0.3) + (def * 0.5));
  }
}
