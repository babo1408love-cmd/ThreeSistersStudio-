/**
 * hero-upgrade.js — 영웅 업그레이드 시스템
 * HeroManager 클래스, 6클래스, 6업그레이드경로
 * 장비/정령/펫 장착, 경험치 레벨업
 */

// ── 6클래스 ──
export const HERO_CLASSES = {
  warrior:  {id:'warrior', name:'전사',  emoji:'⚔️',color:'#FF4444',
    growth:{maxHp:12,attack:4,defense:3,speed:1,critRate:0.5}},
  mage:     {id:'mage',    name:'마법사',emoji:'🪄',color:'#8844FF',
    growth:{maxHp:6, attack:5,defense:1,speed:2,critRate:0.8}},
  ranger:   {id:'ranger',  name:'궁수',  emoji:'🏹',color:'#44BB44',
    growth:{maxHp:7, attack:3,defense:1,speed:4,critRate:1.2}},
  guardian: {id:'guardian', name:'수호자',emoji:'🛡️',color:'#4488FF',
    growth:{maxHp:15,attack:2,defense:5,speed:1,critRate:0.3}},
  assassin: {id:'assassin',name:'암살자',emoji:'🗡️',color:'#AA44AA',
    growth:{maxHp:5, attack:3,defense:1,speed:3,critRate:1.5}},
  healer:   {id:'healer',  name:'치유사',emoji:'💚',color:'#44CC88',
    growth:{maxHp:10,attack:2,defense:2,speed:2,critRate:0.4},healPower:0.3},
};

// ── 6업그레이드 경로 ──
export const UPGRADE_PATHS = {
  attack:      {id:'attack',     name:'공격의 길',emoji:'⚔️',max:20,bonus:{attack:2},
    milestones:{5:{name:'강타',eff:{atkMul:0.1}},10:{name:'분쇄',eff:{critDmg:0.2}},20:{name:'전쟁신',eff:{atkMul:0.25}}}},
  defense:     {id:'defense',    name:'방어의 길',emoji:'🛡️',max:20,bonus:{defense:2},
    milestones:{5:{name:'철벽',eff:{dmgReduce:0.08}},10:{name:'재생',eff:{hpRegen:0.03}},20:{name:'요새',eff:{defMul:0.3}}}},
  hp:          {id:'hp',         name:'생명의 길',emoji:'❤️',max:20,bonus:{maxHp:8},
    milestones:{5:{name:'활력',eff:{hpMul:0.1}},10:{name:'불굴',eff:{lastStand:true}},20:{name:'불사',eff:{hpMul:0.25}}}},
  speed:       {id:'speed',      name:'민첩의 길',emoji:'💨',max:20,bonus:{speed:1,critRate:0.3},
    milestones:{5:{name:'질풍',eff:{spdMul:0.15}},10:{name:'잔상',eff:{evasion:0.15}},20:{name:'섬광',eff:{spdMul:0.3}}}},
  luck:        {id:'luck',       name:'행운의 길',emoji:'🍀',max:20,bonus:{critRate:0.5},
    milestones:{5:{name:'행운',eff:{dropRate:0.1}},10:{name:'재물운',eff:{goldMul:0.2}},20:{name:'전설행운',eff:{epicDrop:2}}}},
  spirit_bond: {id:'spirit_bond',name:'교감의 길',emoji:'🧚',max:20,bonus:{attack:1},
    milestones:{5:{name:'교감',eff:{spiritDmg:0.1}},10:{name:'공명',eff:{spiritCd:0.15}},20:{name:'초월',eff:{spiritDmg:0.25}}}},
};

// ── 경험치 테이블 ──
const MAX_LEVEL = 50;
const BASE_EXP = 100;
const EXP_GROWTH = 1.15;

export function getRequiredExp(level) {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(BASE_EXP * Math.pow(EXP_GROWTH, level - 1));
}

// ── HeroManager 클래스 ──
export class HeroManager {
  constructor() {
    this.heroClass = 'warrior';
    this.level = 1;
    this.exp = 0;
    this.upgradePoints = 0;
    this.paths = {};  // { pathId: level }
    this.activeEffects = {}; // computed from milestones
  }

  setClass(classId) {
    if (!HERO_CLASSES[classId]) return false;
    this.heroClass = classId;
    return true;
  }

  getClass() {
    return HERO_CLASSES[this.heroClass];
  }

  // ── 경험치 추가 & 레벨업 ──
  addExp(amount) {
    const results = { leveledUp: false, levels: 0, statGains: {}, points: 0 };
    this.exp += amount;

    while (this.level < MAX_LEVEL) {
      const needed = getRequiredExp(this.level);
      if (this.exp < needed) break;
      this.exp -= needed;
      this.level++;
      results.leveledUp = true;
      results.levels++;

      // 업그레이드 포인트
      let pts = 1;
      if (this.level % 10 === 0) pts = 3;
      else if (this.level % 5 === 0) pts = 2;
      this.upgradePoints += pts;
      results.points += pts;

      // 클래스 성장치
      const cls = HERO_CLASSES[this.heroClass];
      if (cls) {
        for (const [stat, growth] of Object.entries(cls.growth)) {
          results.statGains[stat] = (results.statGains[stat] || 0) + growth;
        }
      }
    }
    return results;
  }

  // ── 업그레이드 포인트 투자 ──
  investPath(pathId) {
    const path = UPGRADE_PATHS[pathId];
    if (!path) return { success: false };
    const curLv = this.paths[pathId] || 0;
    if (curLv >= path.max || this.upgradePoints < 1) return { success: false };
    this.upgradePoints--;
    this.paths[pathId] = curLv + 1;
    const newLv = curLv + 1;
    const milestone = path.milestones[newLv] || null;
    if (milestone) {
      Object.assign(this.activeEffects, milestone.eff);
    }
    return { success: true, bonuses: { ...path.bonus }, milestone, newLevel: newLv };
  }

  // ── 총 보너스 스탯 계산 ──
  getTotalBonuses() {
    const bonuses = {};
    for (const [pathId, lv] of Object.entries(this.paths)) {
      const path = UPGRADE_PATHS[pathId];
      if (!path) continue;
      for (const [stat, val] of Object.entries(path.bonus)) {
        bonuses[stat] = (bonuses[stat] || 0) + val * lv;
      }
    }
    return bonuses;
  }

  // ── 전투 스탯 계산 (기본 + 장비 + 업그레이드) ──
  computeCombatStats(baseStats, equippedItems = {}) {
    const cls = HERO_CLASSES[this.heroClass];
    const lvl = this.level - 1;
    const stats = { ...baseStats };

    // 레벨 성장
    if (cls) {
      for (const [stat, growth] of Object.entries(cls.growth)) {
        stats[stat] = (stats[stat] || 0) + growth * lvl;
      }
    }

    // 장비 스탯
    for (const item of Object.values(equippedItems)) {
      if (item && item.stats) {
        for (const [k, v] of Object.entries(item.stats)) {
          stats[k] = (stats[k] || 0) + v;
        }
      }
    }

    // 업그레이드 경로 보너스
    const pathBonuses = this.getTotalBonuses();
    for (const [k, v] of Object.entries(pathBonuses)) {
      stats[k] = (stats[k] || 0) + v;
    }

    // 효과 적용 (multipliers)
    const eff = this.activeEffects;
    if (eff.atkMul) stats.attack = Math.round(stats.attack * (1 + eff.atkMul));
    if (eff.defMul) stats.defense = Math.round(stats.defense * (1 + eff.defMul));
    if (eff.hpMul) stats.maxHp = Math.round(stats.maxHp * (1 + eff.hpMul));
    if (eff.spdMul) stats.speed = Math.round(stats.speed * (1 + eff.spdMul));

    return stats;
  }

  // ── 전투 보상 경험치 ──
  static calcWaveExp(enemies, stageLevel = 1) {
    let exp = 0;
    for (const e of enemies) {
      const base = 10 + (e.gold || 5) * 0.5;
      const bossBonus = e.isBoss ? 5 : 1;
      exp += Math.round(base * bossBonus);
    }
    return Math.round(exp * (1 + (stageLevel - 1) * 0.05));
  }

  // ── 직렬화 ──
  toJSON() {
    return {
      heroClass: this.heroClass,
      level: this.level,
      exp: this.exp,
      upgradePoints: this.upgradePoints,
      paths: { ...this.paths },
      activeEffects: { ...this.activeEffects },
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.heroClass = data.heroClass || 'warrior';
    this.level = data.level || 1;
    this.exp = data.exp || 0;
    this.upgradePoints = data.upgradePoints || 0;
    this.paths = data.paths || {};
    this.activeEffects = data.activeEffects || {};
  }

  reset() {
    this.heroClass = 'warrior';
    this.level = 1;
    this.exp = 0;
    this.upgradePoints = 0;
    this.paths = {};
    this.activeEffects = {};
  }
}

export { MAX_LEVEL };
