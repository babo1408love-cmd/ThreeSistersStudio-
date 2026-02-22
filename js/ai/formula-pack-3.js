// ============================================================
// 📊 몽글벨 공식팩 3/6 — 경험치 + 펫진화 + 스테이지 디렉터
// ============================================================
// 시스템 7: 경험치 테이블 + 스탯 성장 (hero-upgrade 교체용)
// 시스템 8: 펫 진화/성장 (pet-evolution 교체용)
// 시스템 9: 스테이지 디렉터 몹 스케일링 (stage-director 교체용)
//
// Claude Code: js/ai/formula-pack-3.js 에 넣으세요
// ============================================================

const FormulaPack3 = {

  // =============================================================
  // 📈 시스템 7: 경험치 테이블 + 스탯 성장
  // =============================================================
  EXP_CONFIG: {
    maxLevel: 50,
    // EXP = base × level^exponent × classMult
    // 후반이 확실히 어려운 지수 곡선
    base:     80,
    exponent: 1.65,   // 1.65승 → 레벨50에서 ~34,000

    // 클래스별 EXP 배율 (탱커/힐러 약간 빠름)
    classMult: {
      warrior:  1.0,
      mage:     1.05,
      ranger:   1.0,
      healer:   0.95,
      assassin: 1.1,   // 극딜은 느리게 성장
      paladin:  0.95
    },

    // 스탯 성장 (제곱근 감쇠 곡선)
    // finalStat = baseStat + (growth × level × sqrt(level) × 0.5)
    // → 초반 빠르고 후반 완만
    classGrowth: {
      warrior:  { hp: 1.2, atk: 1.0, def: 1.3, spd: 0.8 },
      mage:     { hp: 0.7, atk: 1.4, def: 0.6, spd: 1.0 },
      ranger:   { hp: 0.8, atk: 1.1, def: 0.7, spd: 1.4 },
      healer:   { hp: 0.9, atk: 0.6, def: 1.0, spd: 0.9 },
      assassin: { hp: 0.6, atk: 1.5, def: 0.5, spd: 1.5 },
      paladin:  { hp: 1.1, atk: 0.8, def: 1.2, spd: 0.7 }
    },

    // 기본 스탯
    baseStats: { hp: 250, atk: 12, def: 7, spd: 3 }
  },

  // 필요 경험치
  getRequiredEXP(level, classId) {
    const c = this.EXP_CONFIG;
    if (level >= c.maxLevel) return Infinity;
    const classMult = c.classMult[classId] || 1.0;
    return Math.round(c.base * Math.pow(level, c.exponent) * classMult);
  },

  // 레벨별 누적 경험치
  getTotalEXP(targetLevel, classId) {
    let total = 0;
    for (let lv = 1; lv < targetLevel; lv++) {
      total += this.getRequiredEXP(lv, classId);
    }
    return total;
  },

  // 레벨별 스탯 (제곱근 감쇠)
  getStatAtLevel(statName, level, classId) {
    const c = this.EXP_CONFIG;
    const base = c.baseStats[statName] || 10;
    const growth = c.classGrowth[classId]?.[statName] || 1.0;

    // 제곱근 감쇠: 초반 빠르고 후반 완만
    const statGain = growth * level * Math.sqrt(level) * 0.5;
    return Math.round(base + statGain);
  },

  // 전체 스탯 한번에
  getAllStatsAtLevel(level, classId) {
    return {
      hp:  this.getStatAtLevel('hp', level, classId),
      atk: this.getStatAtLevel('atk', level, classId),
      def: this.getStatAtLevel('def', level, classId),
      spd: this.getStatAtLevel('spd', level, classId)
    };
  },

  // =============================================================
  // 🐾 시스템 8: 펫 진화/성장
  // =============================================================
  PET_CONFIG: {
    // 등급별 기본 스탯 배율
    rarityBase: {
      1: { hp: 20,  atk: 3,  def: 2,  spd: 1, healPer5s: 5 },
      2: { hp: 35,  atk: 5,  def: 3,  spd: 1.2, healPer5s: 8 },
      3: { hp: 55,  atk: 9,  def: 5,  spd: 1.5, healPer5s: 14 },
      4: { hp: 85,  atk: 15, def: 8,  spd: 1.8, healPer5s: 22 },
      5: { hp: 140, atk: 25, def: 14, spd: 2.2, healPer5s: 35 }
    },

    // 펫 레벨 성장 (플레이어 레벨 동기화)
    // petStat = rarityBase × (1 + playerLevel × growth)
    levelGrowth: 0.04,      // 플레이어 레벨당 4%
    stageGrowth: 0.008,     // 스테이지당 0.8%

    // 진화 시 레벨 유지 비율
    evolutionLevelKeep: 0.7, // 진화하면 레벨 70% 유지

    // 힐량 스케일링
    healGrowth: 0.03         // 레벨당 3%
  },

  getPetStats(petRarity, playerLevel, stageLevel) {
    const c = this.PET_CONFIG;
    const base = c.rarityBase[petRarity] || c.rarityBase[1];
    const lvlMult = 1 + playerLevel * c.levelGrowth + stageLevel * c.stageGrowth;

    return {
      hp:       Math.round(base.hp * lvlMult),
      atk:      Math.round(base.atk * lvlMult),
      def:      Math.round(base.def * lvlMult),
      spd:      Math.round(base.spd * (1 + playerLevel * 0.01) * 100) / 100,
      healPer5s: Math.round(base.healPer5s * (1 + playerLevel * c.healGrowth))
    };
  },

  // 진화 후 펫 레벨
  getEvolutionLevel(currentLevel) {
    return Math.max(1, Math.round(currentLevel * this.PET_CONFIG.evolutionLevelKeep));
  },

  // =============================================================
  // 🗺️ 시스템 9: 스테이지 디렉터 몹 스케일링
  // =============================================================
  STAGE_CONFIG: {
    // 연속 곡선: scaleFactor = 1 + ln(stage) × growth
    // → 12% 선형 대신 로그 곡선 (초반 빠르고 후반 완만)
    hpGrowth:  0.45,
    atkGrowth: 0.35,
    defGrowth: 0.25,

    // 지역 전환 보너스 (부드러운 3스테이지 블렌딩)
    regions: [
      { name: '숲',     start: 1,  end: 10, mult: { hp: 1.0, atk: 1.0, def: 1.0 } },
      { name: '동굴',   start: 11, end: 20, mult: { hp: 1.4, atk: 1.3, def: 1.5 } },
      { name: '사막',   start: 21, end: 30, mult: { hp: 1.8, atk: 1.7, def: 1.4 } },
      { name: '화산',   start: 31, end: 40, mult: { hp: 2.3, atk: 2.2, def: 1.8 } },
      { name: '마왕성', start: 41, end: 999, mult: { hp: 3.0, atk: 2.8, def: 2.5 } }
    ],
    blendStages: 3  // 지역 전환 시 3스테이지에 걸쳐 블렌딩
  },

  getStageScaleFactor(stageLevel, statType) {
    const c = this.STAGE_CONFIG;
    const growth = c[statType + 'Growth'] || 0.35;

    // 로그 곡선 기본 배율
    const logMult = 1 + Math.log(Math.max(1, stageLevel)) * growth;

    // 지역 배율 (블렌딩)
    const regionMult = this._getRegionMult(stageLevel, statType);

    return Math.round(logMult * regionMult * 100) / 100;
  },

  _getRegionMult(stage, stat) {
    const regions = this.STAGE_CONFIG.regions;
    const blend = this.STAGE_CONFIG.blendStages;

    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      if (stage >= r.start && stage <= r.end) {
        const baseMult = r.mult[stat] || 1.0;

        // 지역 시작 부분 블렌딩
        if (i > 0 && stage < r.start + blend) {
          const prev = regions[i - 1].mult[stat] || 1.0;
          const t = (stage - r.start) / blend;
          const smooth = t * t * (3 - 2 * t); // smoothstep
          return prev + (baseMult - prev) * smooth;
        }
        return baseMult;
      }
    }
    return regions[regions.length - 1].mult[stat] || 1.0;
  },

  getStageAllFactors(stageLevel) {
    return {
      hp:  this.getStageScaleFactor(stageLevel, 'hp'),
      atk: this.getStageScaleFactor(stageLevel, 'atk'),
      def: this.getStageScaleFactor(stageLevel, 'def'),
      region: this._getCurrentRegion(stageLevel)
    };
  },

  _getCurrentRegion(stage) {
    for (const r of this.STAGE_CONFIG.regions) {
      if (stage >= r.start && stage <= r.end) return r.name;
    }
    return '마왕성';
  },

  // 디버그
  debugEXPTable(classId) {
    console.log(`\n=== ${classId} EXP 테이블 ===`);
    console.log('레벨 | 필요EXP | 누적EXP  | HP   | ATK | DEF | SPD');
    console.log('─'.repeat(55));
    for (let lv = 1; lv <= 50; lv += 5) {
      const exp = this.getRequiredEXP(lv, classId);
      const total = this.getTotalEXP(lv, classId);
      const stats = this.getAllStatsAtLevel(lv, classId);
      console.log(`${lv.toString().padStart(4)} | ${exp.toString().padStart(7)} | ${total.toString().padStart(8)} | ${stats.hp.toString().padStart(4)} | ${stats.atk.toString().padStart(3)} | ${stats.def.toString().padStart(3)} | ${stats.spd}`);
    }
  },

  debugStageScaling(maxStage) {
    console.log(`\n=== 스테이지 디렉터 (1~${maxStage}) ===`);
    console.log('스테이지 | HP배율 | ATK배율 | DEF배율 | 지역');
    console.log('─'.repeat(50));
    for (let s = 1; s <= maxStage; s += 5) {
      const f = this.getStageAllFactors(s);
      console.log(`${s.toString().padStart(5)}    | ${f.hp.toFixed(2).padStart(6)} | ${f.atk.toFixed(2).padStart(7)} | ${f.def.toFixed(2).padStart(7)} | ${f.region}`);
    }
  },

  connectToEngine() {
    console.log('[FormulaPack3] 경험치 + 펫진화 + 스테이지디렉터 공식 ✅');
  }
};

if (typeof window !== 'undefined') window.FormulaPack3 = FormulaPack3;
if (typeof module !== 'undefined') module.exports = FormulaPack3;
