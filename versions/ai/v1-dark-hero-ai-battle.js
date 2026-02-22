// ============================================================
// 🤖 몽글벨 웹엔진 - 전투 AI (2/3)
// ============================================================
// 영웅+정령+펫 연계 전투 의사결정
// 스킬 선택, 원소 콤보, 타겟 선택, 자동전투
//
// Claude Code: js/ai/hero-ai-battle.js 에 넣으세요
// ============================================================

const HeroBattleAI = {

  // ========== AI 성향별 가중치 ==========
  PERSONALITY: {
    balanced:   { attackW: 1.0, defendW: 1.0, healW: 1.0, skillW: 1.0, comboW: 1.0 },
    aggressive: { attackW: 1.5, defendW: 0.5, healW: 0.7, skillW: 1.3, comboW: 1.2 },
    defensive:  { attackW: 0.7, defendW: 1.5, healW: 1.3, skillW: 0.8, comboW: 0.8 },
    support:    { attackW: 0.6, defendW: 1.0, healW: 1.8, skillW: 1.2, comboW: 1.0 },
    tactical:   { attackW: 1.0, defendW: 1.0, healW: 1.0, skillW: 1.5, comboW: 1.5 }
  },

  // ========== 스킬 데이터베이스 ==========
  SKILLS: {
    // === 전사 스킬 ===
    'slash': {
      name: { ko: '베기', en: 'Slash' }, class: 'warrior', element: 'none',
      type: 'physical', target: 'single', mpCost: 5,
      power: 120, effect: null,
      animation: { type: 'slash', color: '#FFFFFF', duration: 0.5 }
    },
    'heavy_strike': {
      name: { ko: '강타', en: 'Heavy Strike' }, class: 'warrior', element: 'none',
      type: 'physical', target: 'single', mpCost: 12,
      power: 200, effect: { type: 'stun', chance: 0.3, duration: 1 },
      animation: { type: 'impact', color: '#FF8800', duration: 0.8, shake: true }
    },
    'whirlwind': {
      name: { ko: '회전 참격', en: 'Whirlwind' }, class: 'warrior', element: 'none',
      type: 'physical', target: 'all', mpCost: 20,
      power: 150, effect: null,
      animation: { type: 'spin', color: '#CCCCCC', duration: 1.0, particles: 'slash' }
    },
    'war_cry': {
      name: { ko: '전쟁의 함성', en: 'War Cry' }, class: 'warrior', element: 'none',
      type: 'buff', target: 'party', mpCost: 15,
      power: 0, effect: { type: 'buff_atk', value: 0.2, duration: 3 },
      animation: { type: 'aura', color: '#FF4444', duration: 0.8 }
    },

    // === 마법사 스킬 ===
    'fireball': {
      name: { ko: '파이어볼', en: 'Fireball' }, class: 'mage', element: 'fire',
      type: 'magic', target: 'single', mpCost: 10,
      power: 150, effect: { type: 'burn', chance: 0.3, damage: 10, duration: 3 },
      animation: { type: 'projectile', color: '#FF4400', duration: 0.6, particles: 'fire', trail: true }
    },
    'ice_storm': {
      name: { ko: '아이스 스톰', en: 'Ice Storm' }, class: 'mage', element: 'ice',
      type: 'magic', target: 'all', mpCost: 25,
      power: 130, effect: { type: 'slow', chance: 0.5, value: 0.3, duration: 2 },
      animation: { type: 'area', color: '#44CCFF', duration: 1.2, particles: 'ice' }
    },
    'thunder_bolt': {
      name: { ko: '썬더볼트', en: 'Thunder Bolt' }, class: 'mage', element: 'thunder',
      type: 'magic', target: 'single', mpCost: 15,
      power: 180, effect: { type: 'paralyze', chance: 0.2, duration: 1 },
      animation: { type: 'lightning', color: '#FFDD00', duration: 0.4, flash: true }
    },
    'arcane_blast': {
      name: { ko: '비전 폭발', en: 'Arcane Blast' }, class: 'mage', element: 'light',
      type: 'magic', target: 'all', mpCost: 35,
      power: 200, effect: null,
      animation: { type: 'explosion', color: '#AA44FF', duration: 1.5, particles: 'light', screenFlash: true }
    },

    // === 궁수 스킬 ===
    'quick_shot': {
      name: { ko: '속사', en: 'Quick Shot' }, class: 'archer', element: 'none',
      type: 'physical', target: 'single', mpCost: 5,
      power: 110, effect: null,
      animation: { type: 'arrow', color: '#88AACC', duration: 0.3 }
    },
    'rain_of_arrows': {
      name: { ko: '화살 비', en: 'Rain of Arrows' }, class: 'archer', element: 'none',
      type: 'physical', target: 'all', mpCost: 20,
      power: 100, effect: null,
      animation: { type: 'rain', color: '#88AACC', duration: 1.0, count: 12 }
    },
    'poison_arrow': {
      name: { ko: '독화살', en: 'Poison Arrow' }, class: 'archer', element: 'grass',
      type: 'physical', target: 'single', mpCost: 12,
      power: 90, effect: { type: 'poison', chance: 0.6, damage: 8, duration: 4 },
      animation: { type: 'arrow', color: '#44DD44', duration: 0.4, trail: true }
    },

    // === 기사 스킬 ===
    'shield_wall': {
      name: { ko: '방패 방벽', en: 'Shield Wall' }, class: 'knight', element: 'none',
      type: 'buff', target: 'party', mpCost: 15,
      power: 0, effect: { type: 'buff_def', value: 0.3, duration: 3 },
      animation: { type: 'shield', color: '#4488FF', duration: 0.8 }
    },
    'provoke': {
      name: { ko: '도발', en: 'Provoke' }, class: 'knight', element: 'none',
      type: 'debuff', target: 'all', mpCost: 10,
      power: 0, effect: { type: 'taunt', duration: 2 },
      animation: { type: 'aura', color: '#FF4444', duration: 0.6 }
    },

    // === 성직자 스킬 ===
    'heal': {
      name: { ko: '치유', en: 'Heal' }, class: 'cleric', element: 'light',
      type: 'heal', target: 'single_ally', mpCost: 10,
      power: 150, effect: null,
      animation: { type: 'heal', color: '#44FF44', duration: 0.8, particles: 'heal' }
    },
    'group_heal': {
      name: { ko: '단체 치유', en: 'Group Heal' }, class: 'cleric', element: 'light',
      type: 'heal', target: 'party', mpCost: 25,
      power: 100, effect: null,
      animation: { type: 'area_heal', color: '#88FF88', duration: 1.0, particles: 'heal' }
    },
    'resurrect': {
      name: { ko: '부활', en: 'Resurrect' }, class: 'cleric', element: 'light',
      type: 'resurrect', target: 'single_ally', mpCost: 40,
      power: 50, effect: null, // HP 50%로 부활
      animation: { type: 'resurrect', color: '#FFDD44', duration: 1.5, screenFlash: true }
    },

    // === 도적 스킬 ===
    'backstab': {
      name: { ko: '배후 공격', en: 'Backstab' }, class: 'rogue', element: 'none',
      type: 'physical', target: 'single', mpCost: 8,
      power: 180, effect: { type: 'crit_boost', value: 0.5 },
      animation: { type: 'dash', color: '#553388', duration: 0.3, vanish: true }
    },
    'smoke_bomb': {
      name: { ko: '연막탄', en: 'Smoke Bomb' }, class: 'rogue', element: 'dark',
      type: 'debuff', target: 'all', mpCost: 12,
      power: 0, effect: { type: 'blind', chance: 0.5, duration: 2 },
      animation: { type: 'smoke', color: '#444444', duration: 1.0, particles: 'dark' }
    },

    // === 소환사 스킬 ===
    'spirit_burst': {
      name: { ko: '정령 폭발', en: 'Spirit Burst' }, class: 'summoner', element: 'none',
      type: 'magic', target: 'all', mpCost: 20,
      power: 140, effect: null,
      animation: { type: 'spirits', color: '#88DDFF', duration: 1.2, particles: 'light' }
    },
    'elemental_sync': {
      name: { ko: '원소 동조', en: 'Elemental Sync' }, class: 'summoner', element: 'none',
      type: 'buff', target: 'party', mpCost: 18,
      power: 0, effect: { type: 'element_boost', value: 0.25, duration: 3 },
      animation: { type: 'sync', color: '#FFFFFF', duration: 1.0 }
    },

    // === 연금술사 스킬 ===
    'acid_flask': {
      name: { ko: '산성 플라스크', en: 'Acid Flask' }, class: 'alchemist', element: 'earth',
      type: 'magic', target: 'single', mpCost: 12,
      power: 120, effect: { type: 'def_break', value: 0.2, duration: 3 },
      animation: { type: 'throw', color: '#88CC44', duration: 0.6, splash: true }
    },
    'elixir': {
      name: { ko: '엘릭서', en: 'Elixir' }, class: 'alchemist', element: 'none',
      type: 'heal', target: 'single_ally', mpCost: 15,
      power: 120, effect: { type: 'buff_all', value: 0.1, duration: 2 },
      animation: { type: 'potion', color: '#FF88CC', duration: 0.8 }
    },

    // === 정령 스킬 (정령이 영웅에게 부여) ===
    'fire_spirit_strike': {
      name: { ko: '화염 정령격', en: 'Fire Spirit Strike' }, class: 'spirit', element: 'fire',
      type: 'magic', target: 'single', mpCost: 8,
      power: 130, effect: { type: 'burn', chance: 0.4, damage: 12, duration: 3 },
      animation: { type: 'spirit_attack', color: '#FF4400', duration: 0.7, spiritAppear: true }
    },
    'water_spirit_shield': {
      name: { ko: '수호 정령막', en: 'Water Spirit Shield' }, class: 'spirit', element: 'water',
      type: 'buff', target: 'single_ally', mpCost: 10,
      power: 0, effect: { type: 'shield', value: 50, duration: 3 },
      animation: { type: 'spirit_shield', color: '#4488FF', duration: 0.8, spiritAppear: true }
    },
    'thunder_spirit_chain': {
      name: { ko: '뇌전 정령 연쇄', en: 'Thunder Spirit Chain' }, class: 'spirit', element: 'thunder',
      type: 'magic', target: 'all', mpCost: 15,
      power: 110, effect: { type: 'paralyze', chance: 0.3, duration: 1 },
      animation: { type: 'chain_lightning', color: '#FFDD00', duration: 1.0, spiritAppear: true }
    },

    // === 펫 스킬 ===
    'pet_bite': {
      name: { ko: '펫 물기', en: 'Pet Bite' }, class: 'pet', element: 'none',
      type: 'physical', target: 'single', mpCost: 0,
      power: 60, effect: null,
      animation: { type: 'pet_attack', color: '#FFAA44', duration: 0.4 }
    },
    'pet_heal_lick': {
      name: { ko: '힐링 핥기', en: 'Healing Lick' }, class: 'pet', element: 'light',
      type: 'heal', target: 'single_ally', mpCost: 0,
      power: 40, effect: null,
      animation: { type: 'pet_heal', color: '#88FF88', duration: 0.5 }
    },
    'pet_cheer': {
      name: { ko: '응원', en: 'Cheer' }, class: 'pet', element: 'none',
      type: 'buff', target: 'party', mpCost: 0,
      power: 0, effect: { type: 'buff_all', value: 0.05, duration: 2 },
      animation: { type: 'pet_buff', color: '#FFDD44', duration: 0.6 }
    }
  },

  // =============================================================
  // 🧠 전투 AI 의사결정
  // =============================================================
  decideTurn(hero, enemies, allies, battleState) {
    const personality = this.PERSONALITY[hero.aiPersonality] || this.PERSONALITY.balanced;
    const availableSkills = this._getAvailableSkills(hero);
    const actions = [];

    // 1. 긴급 상황 체크
    const emergency = this._checkEmergency(hero, allies, battleState);
    if (emergency) return emergency;

    // 2. 각 행동의 점수 계산
    // --- 일반 공격 ---
    const weakestEnemy = this._findWeakestEnemy(enemies);
    actions.push({
      type: 'attack',
      target: weakestEnemy,
      score: 50 * personality.attackW
    });

    // --- 스킬 사용 ---
    availableSkills.forEach(skill => {
      const skillData = this.SKILLS[skill] || skill;
      if (!skillData) return;

      let score = 60;

      // 타입별 점수
      if (skillData.type === 'physical' || skillData.type === 'magic') {
        score = skillData.power * 0.5 * personality.attackW;

        // 원소 상성 보너스
        if (skillData.element && skillData.element !== 'none') {
          const chart = HeroAI.ELEMENT_CHART[skillData.element];
          if (chart && weakestEnemy) {
            if (chart.strong.includes(weakestEnemy.element)) score *= 1.5;
            if (chart.weak.includes(weakestEnemy.element)) score *= 0.5;
          }
        }

        // 전체 공격 보너스 (적이 많을 때)
        if (skillData.target === 'all' && enemies.length >= 3) {
          score *= 1.3 * personality.comboW;
        }
      }

      if (skillData.type === 'heal') {
        const lowestAlly = this._findLowestHpAlly(allies);
        if (lowestAlly && lowestAlly.currentHp / lowestAlly.finalStats.hp < 0.4) {
          score = 150 * personality.healW;
        } else {
          score = 30 * personality.healW;
        }
      }

      if (skillData.type === 'buff') {
        score = 70 * personality.defendW;
        if (battleState.turn <= 2) score *= 1.5; // 초반 버프 우선
      }

      if (skillData.type === 'debuff') {
        score = 65 * personality.skillW;
      }

      // MP 부족하면 점수 0
      if (hero.currentMp < (skillData.mpCost || 0)) {
        score = 0;
      }

      actions.push({
        type: 'skill',
        skillId: typeof skill === 'string' ? skill : skill.id,
        skillData: skillData,
        target: this._selectTarget(skillData, enemies, allies),
        score: score
      });
    });

    // --- 방어 ---
    if (hero.currentHp / hero.finalStats.hp < 0.3) {
      actions.push({
        type: 'defend',
        score: 80 * personality.defendW
      });
    }

    // 3. 최고 점수 행동 선택 (약간의 랜덤)
    actions.sort((a, b) => b.score - a.score);
    const topActions = actions.slice(0, 3);
    const chosen = topActions[Math.floor(Math.random() * Math.min(2, topActions.length))];

    return chosen;
  },

  // ========== 긴급 상황 ==========
  _checkEmergency(hero, allies, state) {
    // 아군이 죽을 것 같으면 힐 우선
    if (hero.role === 'healer' || hero.role === 'support') {
      const dying = allies.find(a => a.isAlive && a.currentHp / a.finalStats.hp < 0.2);
      if (dying) {
        const healSkill = hero.skills.find(s => {
          const data = this.SKILLS[s];
          return data && data.type === 'heal' && hero.currentMp >= data.mpCost;
        });
        if (healSkill) {
          return {
            type: 'skill', skillId: healSkill,
            skillData: this.SKILLS[healSkill],
            target: dying, score: 999,
            reason: 'emergency_heal'
          };
        }
      }
    }

    // 본인 HP 10% 이하면 방어
    if (hero.currentHp / hero.finalStats.hp < 0.1 && hero.role !== 'tank') {
      return { type: 'defend', score: 999, reason: 'near_death' };
    }

    return null;
  },

  // ========== 타겟 선택 ==========
  _findWeakestEnemy(enemies) {
    const alive = enemies.filter(e => e.isAlive);
    if (alive.length === 0) return null;
    return alive.reduce((min, e) => e.currentHp < min.currentHp ? e : min, alive[0]);
  },

  _findLowestHpAlly(allies) {
    const alive = allies.filter(a => a.isAlive);
    if (alive.length === 0) return null;
    return alive.reduce((min, a) => {
      const ratioA = a.currentHp / a.finalStats.hp;
      const ratioMin = min.currentHp / min.finalStats.hp;
      return ratioA < ratioMin ? a : min;
    }, alive[0]);
  },

  _selectTarget(skillData, enemies, allies) {
    if (!skillData) return null;
    switch (skillData.target) {
      case 'single': return this._findWeakestEnemy(enemies);
      case 'all': return enemies;
      case 'single_ally': return this._findLowestHpAlly(allies);
      case 'party': return allies;
      default: return this._findWeakestEnemy(enemies);
    }
  },

  _getAvailableSkills(hero) {
    return [...(hero.skills || []), ...(hero._spiritSkills || [])];
  },

  // ========== 데미지 계산 ==========
  calculateDamage(attacker, defender, skillData) {
    let baseDamage;

    if (skillData && (skillData.type === 'physical')) {
      baseDamage = (attacker.finalStats.atk * (skillData.power / 100)) - defender.finalStats.def * 0.5;
    } else if (skillData && skillData.type === 'magic') {
      baseDamage = (attacker.finalStats.atk * (skillData.power / 100)) - defender.finalStats.def * 0.3;
    } else {
      baseDamage = attacker.finalStats.atk - defender.finalStats.def * 0.5;
    }

    // 원소 상성
    let elementMult = 1.0;
    if (skillData && skillData.element && skillData.element !== 'none') {
      const chart = HeroAI.ELEMENT_CHART[skillData.element];
      if (chart) {
        if (chart.strong.includes(defender.element)) elementMult = 1.5;
        if (chart.weak.includes(defender.element)) elementMult = 0.7;
      }
    }

    // 크리티컬
    const critChance = Math.min(0.5, attacker.finalStats.luk * 0.01);
    const isCrit = Math.random() < critChance;
    const critMult = isCrit ? 1.5 : 1.0;

    // 랜덤 변동 (±10%)
    const variance = 0.9 + Math.random() * 0.2;

    const finalDamage = Math.max(1, Math.floor(baseDamage * elementMult * critMult * variance));

    return {
      damage: finalDamage,
      isCrit,
      elementMult,
      element: skillData ? skillData.element : 'none',
      isEffective: elementMult > 1,
      isResisted: elementMult < 1
    };
  },

  // ========== 힐량 계산 ==========
  calculateHeal(healer, target, skillData) {
    const baseHeal = healer.finalStats.atk * (skillData.power / 100) * 0.8;
    const variance = 0.9 + Math.random() * 0.2;
    return Math.floor(baseHeal * variance);
  },

  // ========== 펫 자동 행동 (매 턴) ==========
  petAutoAction(pet, allies, enemies) {
    if (!pet || !pet.skill) return null;

    // 아군 HP 낮으면 힐, 아니면 공격 or 버프
    const lowestAlly = this._findLowestHpAlly(allies);
    const healNeeded = lowestAlly && lowestAlly.currentHp / lowestAlly.finalStats.hp < 0.5;

    const petSkill = this.SKILLS[pet.skill] || this.SKILLS['pet_bite'];

    if (healNeeded && petSkill.type === 'heal') {
      return { type: 'skill', skillId: pet.skill, target: lowestAlly, source: 'pet' };
    }

    // 패시브 발동 체크
    if (pet.passive) {
      const passiveChance = 0.3;
      if (Math.random() < passiveChance) {
        return { type: 'passive', passiveId: pet.passive, source: 'pet' };
      }
    }

    // 기본: 약한 적 공격
    return { type: 'skill', skillId: pet.skill || 'pet_bite', target: this._findWeakestEnemy(enemies), source: 'pet' };
  },

  connectToEngine() {
    console.log('[HeroBattleAI] 전투 AI 준비 완료 ✅');
  },

  // ========== FormulaPack4 연동: 스킬 파워 스케일링 ==========
  getScaledSkillPower(skillId, heroLevel, stageLevel) {
    const skill = this.SKILLS[skillId];
    if (!skill) return 0;
    // const basePower = skill.power; // 기존 고정값
    if (typeof FormulaPack4 !== 'undefined') {
      const tier = skill.type === 'buff' ? 2 : (skill.target === 'all' ? 3 : 1);
      return FormulaPack4.getSkillPower(skill.power, heroLevel || 1, stageLevel || 1, tier);
    }
    return skill.power; // 폴백
  },
};

if (typeof window !== 'undefined') window.HeroBattleAI = HeroBattleAI;
if (typeof module !== 'undefined') module.exports = HeroBattleAI;
