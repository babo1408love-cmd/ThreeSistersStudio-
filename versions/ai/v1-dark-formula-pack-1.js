// ============================================================
// 🔮 몽글벨 공식팩 1/6 — 정령 스킬 + 적 스케일링 + 드롭률
// ============================================================
// 시스템 1: 정령 스킬 데미지 (spirit-attack-generator 교체용)
// 시스템 2: 적 스탯 스케일링 (enemy-drop-generator 교체용)
// 시스템 3: 드롭률 스케일링
//
// Claude Code: js/ai/formula-pack-1.js 에 넣으세요
// ============================================================

const FormulaPack1 = {

  // =============================================================
  // 🔮 시스템 1: 정령 스킬 데미지 공식
  // =============================================================
  SPIRIT_CONFIG: {
    // 등급 배율 (Common~Mythic)
    rarityMult:   { 1: 1.0, 2: 1.5, 3: 2.2, 4: 3.5, 5: 6.0 },
    // 레벨당 성장률 (복리)
    levelGrowth:  0.08,      // 8%/레벨
    // 레벨 소프트캡 (이후 감쇠)
    levelSoftCap: 30,
    softCapDecay: 0.5,       // 소프트캡 이후 성장 50%
    // 원소 시너지 보너스
    synergyBonus: 0.25,      // 같은 원소 영웅 +25%
    // 쿨다운 등급별 단축률
    cdReduction:  { 1: 1.0, 2: 0.9, 3: 0.8, 4: 0.65, 5: 0.5 },
    // AOE 등급별 확대
    aoeMult:      { 1: 1.0, 2: 1.1, 3: 1.25, 4: 1.4, 5: 1.6 }
  },

  // 정령 스킬 최종 데미지
  getSpiritDamage(baseDmg, spiritLevel, rarityId, hasSynergy) {
    const c = this.SPIRIT_CONFIG;
    const rMult = c.rarityMult[rarityId] || 1.0;

    // 레벨 성장 (소프트캡 적용)
    let lvlMult;
    if (spiritLevel <= c.levelSoftCap) {
      lvlMult = 1 + spiritLevel * c.levelGrowth;
    } else {
      const base = 1 + c.levelSoftCap * c.levelGrowth;
      const over = (spiritLevel - c.levelSoftCap) * c.levelGrowth * c.softCapDecay;
      lvlMult = base + over;
    }

    // 시너지
    const synMult = hasSynergy ? (1 + c.synergyBonus) : 1.0;

    return Math.round(baseDmg * rMult * lvlMult * synMult);
  },

  // 정령 스킬 쿨다운
  getSpiritCooldown(baseCd, rarityId) {
    const reduction = this.SPIRIT_CONFIG.cdReduction[rarityId] || 1.0;
    return Math.round(baseCd * reduction * 100) / 100;
  },

  // 정령 스킬 AOE 범위
  getSpiritAOE(baseAoe, rarityId) {
    const mult = this.SPIRIT_CONFIG.aoeMult[rarityId] || 1.0;
    return Math.round(baseAoe * mult);
  },

  // 전체 정령 스킬 스케일링 (한번에)
  scaleSpiritSkill(skill, spiritLevel, rarityId, hasSynergy) {
    return {
      dmg:   this.getSpiritDamage(skill.dmg, spiritLevel, rarityId, hasSynergy),
      cd:    this.getSpiritCooldown(skill.cd, rarityId),
      range: Math.round(skill.range * (1 + spiritLevel * 0.01)),
      aoe:   this.getSpiritAOE(skill.aoe, rarityId)
    };
  },

  // =============================================================
  // 🧟 시스템 2: 적 스탯 스케일링 공식
  // =============================================================
  ENEMY_CONFIG: {
    // 스테이지당 기본 성장 (로그 곡선 — 200스테이지까지 자연스러움)
    // HP = base × (1 + log2(stage) × growth)
    hpGrowth:  0.35,
    atkGrowth: 0.25,
    defGrowth: 0.20,
    spdGrowth: 0.05,
    goldGrowth: 0.30,

    // 웨이브 보너스 (웨이브 1~6)
    waveBonus: { 1: 1.0, 2: 1.05, 3: 1.12, 4: 1.20, 5: 1.30, 6: 1.40 },

    // 소프트캡 (이 스테이지 이후 성장 둔화)
    softCapStage: 100,
    softCapDecay: 0.6,

    // 지역 배율 (5지역)
    regionMult: {
      forest:  { hp: 1.0, atk: 1.0, def: 1.0 },  // 1~10
      cave:    { hp: 1.3, atk: 1.2, def: 1.4 },  // 11~20
      desert:  { hp: 1.5, atk: 1.5, def: 1.2 },  // 21~30
      volcano: { hp: 1.8, atk: 1.8, def: 1.6 },  // 31~40
      castle:  { hp: 2.2, atk: 2.0, def: 2.0 }   // 41~50+
    }
  },

  // 적 스탯 스케일링 (핵심)
  scaleEnemyStat(baseStat, stageLevel, statType, waveNum) {
    const c = this.ENEMY_CONFIG;
    const growth = c[statType + 'Growth'] || 0.25;

    // 로그 곡선 성장 (초반 빠르고 후반 완만)
    let stageMult;
    if (stageLevel <= c.softCapStage) {
      stageMult = 1 + Math.log2(Math.max(1, stageLevel)) * growth;
    } else {
      // 소프트캡 이후 감쇠
      const capValue = 1 + Math.log2(c.softCapStage) * growth;
      const overGrowth = Math.log2(stageLevel / c.softCapStage) * growth * c.softCapDecay;
      stageMult = capValue + overGrowth;
    }

    // 웨이브 보너스
    const waveMult = c.waveBonus[waveNum] || 1.0;

    // 지역 배율
    const region = this._getRegion(stageLevel);
    const regionMult = c.regionMult[region]?.[statType === 'gold' ? 'atk' : statType] || 1.0;

    return Math.round(baseStat * stageMult * waveMult * regionMult);
  },

  // 적 전체 스탯 한번에
  scaleEnemy(enemy, stageLevel, waveNum) {
    return {
      hp:   this.scaleEnemyStat(enemy.hp, stageLevel, 'hp', waveNum),
      atk:  this.scaleEnemyStat(enemy.atk, stageLevel, 'atk', waveNum),
      def:  this.scaleEnemyStat(enemy.def, stageLevel, 'def', waveNum),
      spd:  Math.round((enemy.spd * (1 + Math.log2(Math.max(1, stageLevel)) * this.ENEMY_CONFIG.spdGrowth)) * 100) / 100,
      gold: this.scaleEnemyStat(enemy.gold, stageLevel, 'gold', waveNum)
    };
  },

  // =============================================================
  // 💎 시스템 3: 드롭률 스케일링 공식
  // =============================================================
  DROP_CONFIG: {
    // 기본 드롭률
    baseEquipDrop:    0.10,  // 10%
    baseConsumeDrop:  0.15,  // 15%

    // 스테이지 보너스 (높을수록 드롭 증가, 상한 있음)
    stageDropBonus:   0.003, // 스테이지당 +0.3%
    maxDropBonus:     0.20,  // 최대 +20%

    // 적 등급별 드롭 배율
    enemyRarityDrop:  { normal: 1.0, elite: 2.5, boss: 5.0, miniboss: 3.5 },

    // 등급별 드롭 확률 (장비 등급)
    rarityDropChance: {
      1: 0.60,   // Common 60%
      2: 0.25,   // Rare 25%
      3: 0.10,   // Epic 10%
      4: 0.04,   // Legendary 4%
      5: 0.01    // Mythic 1%
    },

    // 골드 스케일링
    goldVariance: 0.20,     // ±20%
    goldStageGrowth: 0.05   // 스테이지당 +5%
  },

  // 장비 드롭률
  getEquipDropRate(stageLevel, enemyType) {
    const c = this.DROP_CONFIG;
    const stageBonus = Math.min(c.maxDropBonus, stageLevel * c.stageDropBonus);
    const enemyMult = c.enemyRarityDrop[enemyType] || 1.0;
    return Math.min(0.80, (c.baseEquipDrop + stageBonus) * enemyMult);
  },

  // 드롭 아이템 등급 결정
  getDropRarity(stageLevel) {
    const c = this.DROP_CONFIG;
    // 스테이지 높을수록 높은 등급 확률 약간 증가
    const boost = Math.min(0.05, stageLevel * 0.0003);
    const roll = Math.random();
    let cum = 0;

    // Mythic부터 역순 체크
    cum += c.rarityDropChance[5] + boost;
    if (roll < cum) return 5;
    cum += c.rarityDropChance[4] + boost * 0.8;
    if (roll < cum) return 4;
    cum += c.rarityDropChance[3] + boost * 0.5;
    if (roll < cum) return 3;
    cum += c.rarityDropChance[2];
    if (roll < cum) return 2;
    return 1;
  },

  // 골드 보상
  getGoldReward(baseGold, stageLevel) {
    const c = this.DROP_CONFIG;
    const stageMult = 1 + stageLevel * c.goldStageGrowth;
    const variance = 1 + (Math.random() * 2 - 1) * c.goldVariance;
    return Math.round(baseGold * stageMult * variance);
  },

  // =============================================================
  _getRegion(stage) {
    if (stage <= 10) return 'forest';
    if (stage <= 20) return 'cave';
    if (stage <= 30) return 'desert';
    if (stage <= 40) return 'volcano';
    return 'castle';
  },

  // 디버그
  debugEnemyScaling(enemyName, baseStats, maxStage) {
    console.log(`\n=== ${enemyName} 스케일링 (스테이지 1~${maxStage}) ===`);
    console.log('스테이지 | HP     | ATK   | DEF  | 골드  | 지역');
    console.log('─'.repeat(55));
    for (let s = 1; s <= maxStage; s += 10) {
      const scaled = this.scaleEnemy(baseStats, s, 1);
      const region = this._getRegion(s);
      console.log(`${s.toString().padStart(5)}    | ${scaled.hp.toString().padStart(6)} | ${scaled.atk.toString().padStart(5)} | ${scaled.def.toString().padStart(4)} | ${scaled.gold.toString().padStart(5)} | ${region}`);
    }
  },

  connectToEngine() {
    console.log('[FormulaPack1] 정령스킬 + 적스케일링 + 드롭률 공식 ✅');
  }
};

if (typeof window !== 'undefined') window.FormulaPack1 = FormulaPack1;
if (typeof module !== 'undefined') module.exports = FormulaPack1;
