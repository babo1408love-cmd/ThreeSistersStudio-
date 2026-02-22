/**
 * skill-system.js — 스킬 실행, 콤보, 원소 효과 관리
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { ACTIVE_SKILLS, ULTIMATES, PASSIVES, COMBO_CONFIG, ELEMENT_EFFECTS, getSkillById } from '../data/skills.js';

class SkillSystem {
  constructor() {
    this.cooldowns = {};      // { skillId: remainingMs }
    this.activeBuffs = [];    // [{ id, effect, endTime }]
    this.combo = { count: 0, lastHitTime: 0 };
    this.activeDebuffs = new Map(); // target → [{ effect, endTime }]
  }

  // ── 쿨다운 갱신 (매 프레임 호출) ──
  update(dt) {
    // 쿨다운 감소
    for (const id in this.cooldowns) {
      this.cooldowns[id] -= dt;
      if (this.cooldowns[id] <= 0) delete this.cooldowns[id];
    }

    // 버프 만료
    const now = performance.now();
    this.activeBuffs = this.activeBuffs.filter(b => {
      if (now >= b.endTime) {
        EventBus.emit('buff:expired', b);
        return false;
      }
      return true;
    });

    // 콤보 디케이
    if (this.combo.count > 0 && now - this.combo.lastHitTime > COMBO_CONFIG.decayTime) {
      this.combo.count = 0;
      EventBus.emit('combo:reset');
    }
  }

  // ── 스킬 사용 가능 여부 ──
  canUse(skillId) {
    return !this.cooldowns[skillId];
  }

  // ── 스킬 실행 ──
  useSkill(skillId, caster, target) {
    const skill = getSkillById(skillId);
    if (!skill) return null;
    if (this.cooldowns[skillId]) return null;

    // 쿨다운 등록
    const cdReduction = this._getPassiveValue(caster, 'cdReduction') || 0;
    const cd = (skill.cd || 0) * (1 - cdReduction / 100);
    if (cd > 0) this.cooldowns[skillId] = cd;

    // 패시브 적용 공격력
    const skillDmgBonus = 1 + (this._getPassiveValue(caster, 'skillDmgPct') || 0) / 100;

    const result = {
      skillId, skill,
      damage: 0,
      healed: 0,
      effects: [],
    };

    switch (skill.type) {
      case 'single':
      case 'projectile':
        result.damage = Math.round((skill.damage || 0) * (caster.atk || caster.attack || 10) / 100 * skillDmgBonus);
        if (skill.lifesteal && target) {
          result.healed = Math.round(result.damage * skill.lifesteal);
        }
        break;
      case 'aoe':
        result.damage = Math.round((skill.damage || 0) * (caster.atk || caster.attack || 10) / 100 * skillDmgBonus);
        result.radius = skill.radius || 100;
        result.hitCount = skill.hitCount || 1;
        break;
      case 'heal':
        result.healed = Math.round((caster.hp || caster.maxHp || 100) * (skill.healPct || 0.25));
        break;
      case 'self_buff':
      case 'party_buff':
        this._applyBuff(skill, caster);
        result.effects.push('buff');
        break;
      case 'cc':
        result.effects.push('cc');
        result.ccDuration = skill.duration || 2000;
        break;
      case 'debuff':
        if (target) this._applyDebuff(skill, target);
        result.effects.push('debuff');
        break;
      case 'summon':
        result.effects.push('summon');
        result.summonCount = skill.count || 1;
        result.summonDuration = skill.duration || 15000;
        break;
      case 'counter':
        this._applyBuff(skill, caster);
        result.effects.push('counter');
        break;
      case 'dash':
        result.effects.push('dash');
        result.distance = skill.distance || 100;
        result.iFrames = skill.iFrames || 0;
        break;
    }

    // 원소 효과
    if (skill.element && skill.element !== 'none' && ELEMENT_EFFECTS[skill.element]) {
      result.elementEffect = { ...ELEMENT_EFFECTS[skill.element] };
      result.effects.push('element');
    }

    EventBus.emit('skill:used', { skillId, result });
    return result;
  }

  // ── 궁극기 실행 ──
  useUltimate(heroId, caster, targets) {
    const ult = ULTIMATES.find(u => u.heroId === heroId);
    if (!ult) return null;
    return this.useSkill(ult.id, caster, targets?.[0] || null);
  }

  // ── 콤보 카운터 ──
  addCombo() {
    this.combo.count++;
    this.combo.lastHitTime = performance.now();

    const result = { combo: this.combo.count, dmgMult: 1.0, label: null, finisher: false };

    // 콤보 보너스 체크
    for (const [threshold, bonus] of Object.entries(COMBO_CONFIG.bonuses).sort((a, b) => Number(b[0]) - Number(a[0]))) {
      if (this.combo.count >= Number(threshold)) {
        result.dmgMult = bonus.dmgMult;
        result.label = bonus.label;
        break;
      }
    }

    // 피니셔 체크
    if (this.combo.count > 0 && this.combo.count % COMBO_CONFIG.finisherThreshold === 0) {
      result.finisher = true;
    }

    EventBus.emit('combo:update', result);
    return result;
  }

  // ── 패시브 효과 합산 ──
  getPassiveEffects(heroOrPassiveIds) {
    const ids = Array.isArray(heroOrPassiveIds) ? heroOrPassiveIds : (heroOrPassiveIds?.passives || []);
    const combined = {};
    ids.forEach(pid => {
      const p = PASSIVES.find(x => x.id === pid);
      if (!p) return;
      for (const [k, v] of Object.entries(p.effect)) {
        combined[k] = (combined[k] || 0) + v;
      }
    });
    return combined;
  }

  _getPassiveValue(caster, key) {
    if (!caster?._passiveCache) return 0;
    return caster._passiveCache[key] || 0;
  }

  _applyBuff(skill, target) {
    const endTime = performance.now() + (skill.duration || 5000);
    const buff = { id: skill.id, effect: skill.effect || {}, endTime, skill };
    this.activeBuffs.push(buff);
    EventBus.emit('buff:applied', buff);
  }

  _applyDebuff(skill, target) {
    const endTime = performance.now() + (skill.duration || 5000);
    const debuffs = this.activeDebuffs.get(target) || [];
    debuffs.push({ id: skill.id, effect: { atkReduce: skill.atkReduce, defReduce: skill.defReduce }, endTime });
    this.activeDebuffs.set(target, debuffs);
    EventBus.emit('debuff:applied', { target, skill });
  }

  // ── 버프 합산 (현재 활성 버프) ──
  getActiveBuffMultipliers() {
    const mults = { atkMult: 1, defMult: 1, spdMult: 1, critBonus: 0 };
    this.activeBuffs.forEach(b => {
      if (b.effect?.atkMult) mults.atkMult *= b.effect.atkMult;
      if (b.effect?.defMult) mults.defMult *= b.effect.defMult;
      if (b.effect?.spdMult) mults.spdMult *= b.effect.spdMult;
      if (b.effect?.critBonus) mults.critBonus += b.effect.critBonus;
      if (b.skill?.atkMult) mults.atkMult *= b.skill.atkMult;
      if (b.skill?.defMult) mults.defMult *= b.skill.defMult;
      if (b.skill?.spdMult) mults.spdMult *= b.skill.spdMult;
    });
    return mults;
  }

  reset() {
    this.cooldowns = {};
    this.activeBuffs = [];
    this.combo = { count: 0, lastHitTime: 0 };
    this.activeDebuffs.clear();
  }
}

export default new SkillSystem();
