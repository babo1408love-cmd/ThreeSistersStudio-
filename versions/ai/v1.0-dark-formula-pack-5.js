// ============================================================
// 🌫️ 몽글벨 공식팩 5/6 — 포자안개 + 보스접근 + 분노 + 간격들
// ============================================================
// 시스템 13: 포자안개 데미지 (auto-scroll 교체용)
// 시스템 14: 보스 접근 속도 (boss-approach 교체용)
// 시스템 15: 분노 게이지 배율 (rage-system 교체용)
// 시스템 16: 영웅 행동 간격 (hero-engine 교체용)
// 시스템 17: 자동공격 간격 (combat-config 교체용)
// 시스템 18: 몬스터 성장 (balance-ai 교체용)
//
// Claude Code: js/ai/formula-pack-5.js 에 넣으세요
// ============================================================

const FormulaPack5 = {

  // =============================================================
  // 🌫️ 시스템 13: 포자안개 데미지
  // =============================================================
  SPORE_CONFIG: {
    baseDmg:        20,
    stageGrowth:    0.15,   // 로그 스케일링
    // 시간에 따른 증가 (3분 내)
    timeGrowth:     0.005,  // 초당 0.5%
    lateTimeMult:   1.5,    // 2분 이후 가속
    lateTimeThreshold: 120, // 2분
    // 밀어내는 힘
    basePush:       0.5,
    pushGrowth:     0.01,
    // 가속
    baseAccel:      0.0001,
    accelGrowth:    0.00001
  },

  getSporeFogDamage(stageLevel, elapsedSec) {
    const c = this.SPORE_CONFIG;
    const stageMult = 1 + Math.log2(Math.max(1, stageLevel)) * c.stageGrowth;
    let timeMult = 1 + elapsedSec * c.timeGrowth;

    // 후반 가속
    if (elapsedSec > c.lateTimeThreshold) {
      timeMult *= 1 + (elapsedSec - c.lateTimeThreshold) * 0.003;
    }

    return {
      damagePerSec: Math.round(c.baseDmg * stageMult * timeMult),
      pushForce: Math.round((c.basePush + stageLevel * c.pushGrowth) * 100) / 100,
      accel: c.baseAccel + stageLevel * c.accelGrowth
    };
  },

  // =============================================================
  // 👹 시스템 14: 보스 접근 속도
  // =============================================================
  BOSS_APPROACH_CONFIG: {
    baseSpeed:      0.3,
    speedPerStage:  0.008,  // 스테이지당 +0.8%
    maxSpeed:       1.5,
    baseAccel:      0.00008,
    accelPerStage:  0.000003,
    // 타이머 가속
    timerAccelBase: 1.0,
    timerAccelPerStage: 0.015
  },

  getBossApproach(stageLevel) {
    const c = this.BOSS_APPROACH_CONFIG;
    return {
      baseSpeed: Math.min(c.maxSpeed,
        Math.round((c.baseSpeed + stageLevel * c.speedPerStage) * 1000) / 1000),
      accel: c.baseAccel + stageLevel * c.accelPerStage,
      timerAccelMultiplier: Math.round((c.timerAccelBase + stageLevel * c.timerAccelPerStage) * 100) / 100
    };
  },

  // =============================================================
  // 🔥 시스템 15: 분노 게이지 데미지 배율
  // =============================================================
  RAGE_CONFIG: {
    baseMult:       2.0,
    // 등급별 추가
    rarityBonus:    { 1: 0, 2: 0.2, 3: 0.5, 4: 0.8, 5: 1.2 },
    // 레벨 보너스
    levelBonus:     0.015,  // 레벨당 +1.5%
    maxMult:        5.0
  },

  getRageDamageMultiplier(heroRarity, heroLevel) {
    const c = this.RAGE_CONFIG;
    const rarityBonus = c.rarityBonus[heroRarity] || 0;
    const levelBonus = heroLevel * c.levelBonus;
    return Math.min(c.maxMult,
      Math.round((c.baseMult + rarityBonus + levelBonus) * 100) / 100);
  },

  // =============================================================
  // ⏱️ 시스템 16: 영웅 행동 간격
  // =============================================================
  ACTION_CONFIG: {
    base:        800,    // 기본 800ms
    minInterval: 300,    // 최소 300ms
    // SPD 스탯 영향
    spdReduction: 15,    // SPD 1당 -15ms
    // 레벨 영향
    levelReduction: 3    // 레벨당 -3ms
  },

  getActionInterval(heroLevel, heroSpeed) {
    const c = this.ACTION_CONFIG;
    const reduction = heroSpeed * c.spdReduction + heroLevel * c.levelReduction;
    return Math.max(c.minInterval, Math.round(c.base - reduction));
  },

  // =============================================================
  // 🔫 시스템 17: 배틀아레나 자동공격 간격
  // =============================================================
  AUTO_ATTACK_CONFIG: {
    base:         800,    // 기본 800ms
    minInterval:  250,    // 최소 250ms
    // atkSpeed 스탯 (ms 기반) — 낮을수록 빠름
    atkSpeedWeight: 0.6,  // 60% 반영
    // 스테이지 보너스 (약간)
    stageReduction: 1     // 스테이지당 -1ms
  },

  getAutoAttackInterval(playerAtkSpeed, stageLevel) {
    const c = this.AUTO_ATTACK_CONFIG;
    // atkSpeed가 직접 ms인 경우
    const fromAtkSpd = playerAtkSpeed * c.atkSpeedWeight;
    const stageBonus = stageLevel * c.stageReduction;
    const base = Math.max(fromAtkSpd, c.base - stageBonus);
    return Math.max(c.minInterval, Math.round(base));
  },

  // =============================================================
  // 🧟 시스템 18: BalanceAI 몬스터 성장
  // =============================================================
  MONSTER_GROWTH_CONFIG: {
    // 타입별 성장률
    typeGrowth: {
      slime:    { hp: 0.10, atk: 0.08, def: 0.06 },
      goblin:   { hp: 0.09, atk: 0.10, def: 0.07 },
      skeleton: { hp: 0.08, atk: 0.09, def: 0.10 },
      wolf:     { hp: 0.07, atk: 0.12, def: 0.05 },
      spider:   { hp: 0.08, atk: 0.11, def: 0.06 },
      golem:    { hp: 0.15, atk: 0.06, def: 0.12 },
      ghost:    { hp: 0.06, atk: 0.10, def: 0.04 },
      orc:      { hp: 0.12, atk: 0.10, def: 0.09 },
      dragon:   { hp: 0.13, atk: 0.13, def: 0.11 },
      default:  { hp: 0.10, atk: 0.10, def: 0.08 }
    },

    // 소프트캡
    softCapLevel: 80,
    softCapDecay: 0.5
  },

  getMonsterStat(baseStat, level, monsterType, statName) {
    const c = this.MONSTER_GROWTH_CONFIG;
    const typeData = c.typeGrowth[monsterType] || c.typeGrowth.default;
    const growth = typeData[statName] || 0.10;

    let mult;
    if (level <= c.softCapLevel) {
      // 로그 곡선 성장
      mult = 1 + Math.log2(Math.max(1, level)) * growth * 1.5;
    } else {
      // 소프트캡 이후 감쇠
      const capMult = 1 + Math.log2(c.softCapLevel) * growth * 1.5;
      const overGrowth = Math.log2(level / c.softCapLevel) * growth * 1.5 * c.softCapDecay;
      mult = capMult + overGrowth;
    }

    return Math.round(baseStat * mult);
  },

  getMonsterAllStats(baseStats, level, monsterType) {
    return {
      hp:  this.getMonsterStat(baseStats.hp, level, monsterType, 'hp'),
      atk: this.getMonsterStat(baseStats.atk, level, monsterType, 'atk'),
      def: this.getMonsterStat(baseStats.def, level, monsterType, 'def')
    };
  },

  // =============================================================
  // 디버그
  // =============================================================
  debugAllFormulas(stageLevel, heroLevel) {
    console.log(`\n========== 공식팩 5 디버그 (스테이지=${stageLevel}, 영웅Lv=${heroLevel}) ==========`);

    const fog = this.getSporeFogDamage(stageLevel, 90);
    console.log(`포자안개(90초): ${fog.damagePerSec}/초, 밀기=${fog.pushForce}`);

    const boss = this.getBossApproach(stageLevel);
    console.log(`보스접근: 속도=${boss.baseSpeed}, 가속=${boss.accel}`);

    console.log(`분노배율: 커먼=${this.getRageDamageMultiplier(1, heroLevel)}, 레전드=${this.getRageDamageMultiplier(4, heroLevel)}`);

    console.log(`행동간격: SPD3=${this.getActionInterval(heroLevel, 3)}ms, SPD10=${this.getActionInterval(heroLevel, 10)}ms`);

    console.log(`자동공격: AtkSpd800=${this.getAutoAttackInterval(800, stageLevel)}ms, AtkSpd600=${this.getAutoAttackInterval(600, stageLevel)}ms`);

    const slime = this.getMonsterAllStats({hp:30,atk:4,def:1}, stageLevel, 'slime');
    console.log(`슬라임 Lv${stageLevel}: HP=${slime.hp} ATK=${slime.atk} DEF=${slime.def}`);
  },

  connectToEngine() {
    console.log('[FormulaPack5] 포자+보스접근+분노+간격+몬스터성장 공식 ✅');
  }
};

if (typeof window !== 'undefined') window.FormulaPack5 = FormulaPack5;
if (typeof module !== 'undefined') module.exports = FormulaPack5;
