// ============================================================
// 💎 몽글벨 공식팩 4/6 — 등급스탯 + 스킬파워 + 공중전
// ============================================================
// 시스템 10: 등급별 스탯 (rarity-manager 교체용)
// 시스템 11: HeroBattleAI 스킬 파워 (hero-ai-battle 교체용)
// 시스템 12: 공중전 부스터 (aerial-combat 교체용)
//
// Claude Code: js/ai/formula-pack-4.js 에 넣으세요
// ============================================================

const FormulaPack4 = {

  // =============================================================
  // 💎 시스템 10: 등급별 스탯 공식
  // =============================================================
  RARITY_CONFIG: {
    // 등급별 기본값 (레벨 1 기준)
    base: {
      1: { def: 1,  atk: 10, atkSpd: 1200, moveSpd: 1.0 },  // Common
      2: { def: 2,  atk: 18, atkSpd: 1050, moveSpd: 1.1 },  // Rare
      3: { def: 3,  atk: 28, atkSpd: 900,  moveSpd: 1.2 },  // Epic
      4: { def: 5,  atk: 40, atkSpd: 750,  moveSpd: 1.35 }, // Legendary
      5: { def: 8,  atk: 60, atkSpd: 600,  moveSpd: 1.5 }   // Mythic
    },

    // 레벨당 성장률 (등급별)
    levelGrowth: {
      1: { def: 0.3,  atk: 1.5, atkSpd: -8,  moveSpd: 0.005 },
      2: { def: 0.5,  atk: 2.5, atkSpd: -12, moveSpd: 0.008 },
      3: { def: 0.8,  atk: 4.0, atkSpd: -15, moveSpd: 0.010 },
      4: { def: 1.2,  atk: 6.0, atkSpd: -18, moveSpd: 0.013 },
      5: { def: 1.8,  atk: 9.0, atkSpd: -22, moveSpd: 0.016 }
    },

    // 공격속도 하한 (ms) — 너무 빨라지면 안 됨
    minAtkSpeed: 300,
    // 이동속도 상한
    maxMoveSpeed: 3.0
  },

  getRarityStat(rarityId, level, statName) {
    const c = this.RARITY_CONFIG;
    const base = c.base[rarityId]?.[statName] ?? 0;
    const growth = c.levelGrowth[rarityId]?.[statName] ?? 0;

    // 제곱근 감쇠 성장
    const lvlFactor = level * Math.sqrt(level) * 0.3;
    let value = base + growth * lvlFactor;

    // 하한/상한
    if (statName === 'atkSpd') value = Math.max(c.minAtkSpeed, value);
    if (statName === 'moveSpd') value = Math.min(c.maxMoveSpeed, value);

    return statName === 'moveSpd'
      ? Math.round(value * 100) / 100
      : Math.round(value);
  },

  getAllRarityStats(rarityId, level) {
    return {
      def:     this.getRarityStat(rarityId, level, 'def'),
      atk:     this.getRarityStat(rarityId, level, 'atk'),
      atkSpd:  this.getRarityStat(rarityId, level, 'atkSpd'),
      moveSpd: this.getRarityStat(rarityId, level, 'moveSpd')
    };
  },

  // =============================================================
  // ⚡ 시스템 11: 스킬 파워 공식
  // =============================================================
  SKILL_CONFIG: {
    // 레벨당 성장률
    levelGrowth: 0.05,     // 5%/레벨
    // 스테이지 보정
    stageBonus:  0.02,     // 2%/스테이지
    // 스킬 티어 배율
    tierMult: {
      1: 1.0,   // 기본 스킬
      2: 1.5,   // 중급 스킬
      3: 2.2,   // 고급 스킬
      4: 3.5    // 궁극기
    },
    // 소프트캡
    maxTotalMult: 8.0  // 최대 8배까지
  },

  getSkillPower(basePower, heroLevel, stageLevel, skillTier) {
    const c = this.SKILL_CONFIG;
    const tierMult = c.tierMult[skillTier] || 1.0;

    // 레벨 성장 (제곱근 감쇠)
    const lvlMult = 1 + heroLevel * c.levelGrowth * Math.sqrt(heroLevel) * 0.3;

    // 스테이지 보정
    const stageMult = 1 + Math.log2(Math.max(1, stageLevel)) * c.stageBonus;

    // 최종 (소프트캡)
    const totalMult = Math.min(c.maxTotalMult, lvlMult * stageMult * tierMult);

    return Math.round(basePower * totalMult);
  },

  // =============================================================
  // ✈️ 시스템 12: 공중전 부스터 공식
  // =============================================================
  AERIAL_CONFIG: {
    // 기본값
    baseSpeedMult:  3.0,
    baseATKMult:    2.5,
    baseInterval:   150,    // ms

    // 스테이지 스케일링
    speedPerStage:  0.03,   // 스테이지당 +3%
    atkPerStage:    0.025,  // 스테이지당 +2.5%
    intervalDecay:  0.005,  // 스테이지당 공격간격 -0.5%

    // 상한
    maxSpeedMult:   6.0,
    maxATKMult:     5.0,
    minInterval:    80      // 최소 80ms
  },

  getAerialBooster(stageLevel, playerSpeed, playerATK) {
    const c = this.AERIAL_CONFIG;

    const spdMult = Math.min(c.maxSpeedMult,
      c.baseSpeedMult * (1 + stageLevel * c.speedPerStage));

    const atkMult = Math.min(c.maxATKMult,
      c.baseATKMult * (1 + stageLevel * c.atkPerStage));

    const interval = Math.max(c.minInterval,
      Math.round(c.baseInterval * (1 - stageLevel * c.intervalDecay)));

    return {
      speedMultiplier: Math.round(spdMult * 100) / 100,
      attackMultiplier: Math.round(atkMult * 100) / 100,
      autoAttackInterval: interval,
      effectiveSpeed: Math.round(playerSpeed * spdMult * 100) / 100,
      effectiveATK: Math.round(playerATK * atkMult)
    };
  },

  // 디버그
  debugRarityScaling() {
    console.log('\n=== 등급별 스탯 (레벨 1/10/25/50) ===');
    [1, 2, 3, 4, 5].forEach(r => {
      const names = ['Common', 'Rare', 'Epic', 'Legend', 'Mythic'];
      console.log(`\n--- ${names[r-1]} (등급 ${r}) ---`);
      [1, 10, 25, 50].forEach(lv => {
        const s = this.getAllRarityStats(r, lv);
        console.log(`  Lv${lv}: DEF=${s.def} ATK=${s.atk} AtkSpd=${s.atkSpd}ms MoveSpd=${s.moveSpd}`);
      });
    });
  },

  connectToEngine() {
    console.log('[FormulaPack4] 등급스탯 + 스킬파워 + 공중전 공식 ✅');
  }
};

if (typeof window !== 'undefined') window.FormulaPack4 = FormulaPack4;
if (typeof module !== 'undefined') module.exports = FormulaPack4;
