// ============================================================
// 🤖 몽글벨 웹엔진 - 주인공 AI 코어 (1/3)
// ============================================================
// 영웅 최대 5명 + 정령 최대 10마리(소모품) + 펫 1마리
// 스테이지 입장 전 전체 유닛 소환 + 능력 계산
// 장비 → 외모 반영, 정령 → 소환의 나무에서 소환
//
// Claude Code: js/ai/hero-ai-core.js 에 넣으세요
// ============================================================

const HeroAI = {

  // ========== 파티 구조 ==========
  party: {
    heroes: [],      // 최대 5명
    spirits: [],     // 최대 10마리 (소모품 - 소환의 나무에서 획득)
    pet: null,        // 최대 1마리
    _calculated: false
  },

  // ========== 원소 상성 ==========
  ELEMENT_CHART: {
    fire:    { strong: ['grass', 'ice'], weak: ['water', 'earth'] },
    water:   { strong: ['fire', 'earth'], weak: ['thunder', 'grass'] },
    grass:   { strong: ['water', 'earth'], weak: ['fire', 'ice'] },
    thunder: { strong: ['water', 'ice'], weak: ['earth', 'grass'] },
    ice:     { strong: ['grass', 'thunder'], weak: ['fire', 'water'] },
    earth:   { strong: ['thunder', 'fire'], weak: ['water', 'grass'] },
    light:   { strong: ['dark'], weak: ['dark'] },
    dark:    { strong: ['light'], weak: ['light'] }
  },

  // ========== 클래스별 기본 스탯 성장 ==========
  CLASS_GROWTH: {
    warrior:   { hp: 12, mp: 3, atk: 8, def: 7, spd: 4, luk: 3, role: 'tank_dps' },
    mage:      { hp: 6,  mp: 10, atk: 10, def: 3, spd: 5, luk: 4, role: 'magic_dps' },
    archer:    { hp: 7,  mp: 5, atk: 9, def: 4, spd: 8, luk: 5, role: 'ranged_dps' },
    knight:    { hp: 14, mp: 3, atk: 5, def: 10, spd: 3, luk: 3, role: 'tank' },
    cleric:    { hp: 8,  mp: 9, atk: 4, def: 5, spd: 5, luk: 6, role: 'healer' },
    rogue:     { hp: 7,  mp: 5, atk: 8, def: 3, spd: 10, luk: 8, role: 'assassin' },
    summoner:  { hp: 6,  mp: 12, atk: 6, def: 4, spd: 5, luk: 5, role: 'support' },
    alchemist: { hp: 8,  mp: 8, atk: 6, def: 5, spd: 5, luk: 7, role: 'utility' }
  },

  // =============================================================
  // 🦸 영웅 생성/관리
  // =============================================================
  createHero(data) {
    const growth = this.CLASS_GROWTH[data.class] || this.CLASS_GROWTH.warrior;
    const level = data.level || 1;

    const hero = {
      id: data.id || 'hero_' + Date.now(),
      name: data.name || '영웅',
      class: data.class || 'warrior',
      element: data.element || 'fire',
      rarity: data.rarity || 'rare',
      level: level,
      exp: data.exp || 0,

      // 기본 스탯 (레벨 반영)
      baseStats: {
        hp:  50 + growth.hp * level,
        mp:  20 + growth.mp * level,
        atk: 10 + growth.atk * level,
        def: 8  + growth.def * level,
        spd: 5  + growth.spd * level,
        luk: 3  + growth.luk * level
      },

      // 최종 스탯 (장비 + 정령 + 펫 보너스 합산 후)
      finalStats: {},

      // 장비 슬롯
      equipment: {
        weapon:    data.weapon || null,
        armor:     data.armor || null,
        helmet:    data.helmet || null,
        boots:     data.boots || null,
        accessory: data.accessory || null,
        ring:      data.ring || null
      },

      // 스킬 (최대 4개 장착)
      skills: data.skills || [],

      // 외모 데이터
      appearance: {
        skinTone: data.skinTone || 'light',
        hairStyle: data.hairStyle || 'short',
        hairColor: data.hairColor || null,
        gender: data.gender || 'neutral',
        // 장비 외모 (장비 변경 시 자동 업데이트)
        equipVisual: {
          weaponModel: null,
          armorModel: null,
          helmetModel: null,
          bootsModel: null
        }
      },

      role: growth.role,
      isAlive: true,
      currentHp: 0,
      currentMp: 0,

      // AI 성향
      aiPersonality: data.aiPersonality || 'balanced'
      // balanced, aggressive, defensive, support, tactical
    };

    // 최종 스탯 계산
    this._calculateHeroStats(hero);
    hero.currentHp = hero.finalStats.hp;
    hero.currentMp = hero.finalStats.mp;

    return hero;
  },

  // 영웅 파티에 추가 (최대 5명)
  addHero(hero) {
    if (this.party.heroes.length >= 5) {
      console.warn('[HeroAI] 영웅은 최대 5명까지!');
      return false;
    }
    this.party.heroes.push(hero);
    this.party._calculated = false;
    return true;
  },

  // 영웅 파티에서 제거
  removeHero(heroId) {
    this.party.heroes = this.party.heroes.filter(h => h.id !== heroId);
    this.party._calculated = false;
  },

  // =============================================================
  // 🧚 정령 관리 (소모품 - 소환의 나무에서 소환)
  // =============================================================
  createSpirit(data) {
    const spirit = {
      id: data.id || 'spirit_' + Date.now(),
      name: data.name || '정령',
      element: data.element || 'fire',
      rarity: data.rarity || 'rare',
      level: data.level || 1,
      isConsumable: true, // 소모품!

      // 정령 스탯 (영웅에게 보너스로 적용)
      bonusStats: {
        hp:  data.bonusHp  || Math.floor(5 + data.level * 2),
        mp:  data.bonusMp  || Math.floor(3 + data.level * 1),
        atk: data.bonusAtk || Math.floor(2 + data.level * 1.5),
        def: data.bonusDef || Math.floor(2 + data.level * 1),
        spd: data.bonusSpd || Math.floor(1 + data.level * 0.5),
        luk: data.bonusLuk || Math.floor(1 + data.level * 0.5)
      },

      // 정령 고유 스킬 (영웅에게 부여)
      skill: data.skill || null,

      // 정령 외모
      appearance: {
        coreColor: data.coreColor || null,  // 핵 색상
        wingType: data.wingType || 'energy', // energy, butterfly, feather
        glowIntensity: data.glowIntensity || 0.5,
        size: data.size || 'small' // small, medium, large
      },

      // 소환 시 사용 횟수
      usesRemaining: data.uses || 1,

      // 등급별 보너스 배율
      _rarityMultiplier: { common: 1.0, uncommon: 1.2, rare: 1.5, epic: 2.0, legendary: 2.8, mythic: 4.0 }[data.rarity || 'rare']
    };

    // 등급 배율 적용
    Object.keys(spirit.bonusStats).forEach(stat => {
      spirit.bonusStats[stat] = Math.floor(spirit.bonusStats[stat] * spirit._rarityMultiplier);
    });

    return spirit;
  },

  // 정령 추가 (최대 10마리)
  addSpirit(spirit) {
    if (this.party.spirits.length >= 10) {
      console.warn('[HeroAI] 정령은 최대 10마리까지!');
      return false;
    }
    this.party.spirits.push(spirit);
    this.party._calculated = false;
    return true;
  },

  // 정령 소모 (사용 후 제거)
  consumeSpirit(spiritId) {
    const spirit = this.party.spirits.find(s => s.id === spiritId);
    if (!spirit) return false;

    spirit.usesRemaining--;
    if (spirit.usesRemaining <= 0) {
      this.party.spirits = this.party.spirits.filter(s => s.id !== spiritId);
      console.log(`[HeroAI] 정령 "${spirit.name}" 소모됨`);
    }
    this.party._calculated = false;
    return true;
  },

  // =============================================================
  // 🐾 펫 관리 (최대 1마리)
  // =============================================================
  createPet(data) {
    const pet = {
      id: data.id || 'pet_' + Date.now(),
      name: data.name || '펫',
      type: data.type || 'cat', // cat, dog, bird, dragon, slime, fox, rabbit, wolf
      element: data.element || 'light',
      rarity: data.rarity || 'rare',
      level: data.level || 1,

      // 펫 스탯 보너스 (파티 전체에 적용)
      partyBonus: {
        hp:  data.bonusHp  || Math.floor(3 + data.level * 1),
        mp:  data.bonusMp  || Math.floor(2 + data.level * 0.5),
        atk: data.bonusAtk || Math.floor(1 + data.level * 1),
        def: data.bonusDef || Math.floor(1 + data.level * 0.8),
        spd: data.bonusSpd || Math.floor(1 + data.level * 0.3),
        luk: data.bonusLuk || Math.floor(2 + data.level * 1)
      },

      // 펫 고유 스킬
      skill: data.skill || null,

      // 펫 장비
      equipment: {
        collar: data.collar || null,  // 목걸이
        charm:  data.charm || null    // 부적
      },

      // 펫 외모
      appearance: {
        bodyColor: data.bodyColor || null,
        eyeColor: data.eyeColor || null,
        size: data.size || 'small',
        accessoryVisual: null // 장비 외모
      },

      // 펫 패시브 (전투 중 자동 발동)
      passive: data.passive || null,

      _rarityMultiplier: { common: 1.0, uncommon: 1.2, rare: 1.5, epic: 2.0, legendary: 2.8, mythic: 4.0 }[data.rarity || 'rare']
    };

    Object.keys(pet.partyBonus).forEach(stat => {
      pet.partyBonus[stat] = Math.floor(pet.partyBonus[stat] * pet._rarityMultiplier);
    });

    return pet;
  },

  setPet(pet) {
    this.party.pet = pet;
    this.party._calculated = false;
  },

  removePet() {
    this.party.pet = null;
    this.party._calculated = false;
  },

  // =============================================================
  // 📊 스탯 계산 (스테이지 입장 직전 호출)
  // =============================================================
  calculateAll() {
    console.log('[HeroAI] ═══ 스테이지 입장 전 전체 계산 시작 ═══');

    // 1. 각 영웅 기본 스탯 계산
    this.party.heroes.forEach(hero => {
      this._calculateHeroStats(hero);
    });

    // 2. 정령 보너스 분배
    this._distributeSpiritBonuses();

    // 3. 펫 보너스 적용
    this._applyPetBonus();

    // 4. 파티 시너지 계산
    this._calculatePartySynergy();

    // 5. 외모 업데이트 (장비 반영)
    this._updateAllAppearances();

    // 6. 현재 HP/MP 풀 회복
    this.party.heroes.forEach(hero => {
      hero.currentHp = hero.finalStats.hp;
      hero.currentMp = hero.finalStats.mp;
      hero.isAlive = true;
    });

    this.party._calculated = true;
    console.log('[HeroAI] ═══ 전체 계산 완료 ═══');
    this._logPartyInfo();

    return this.getPartyData();
  },

  // ========== 영웅 스탯 계산 ==========
  _calculateHeroStats(hero) {
    const base = { ...hero.baseStats };
    const equipBonus = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, luk: 0 };

    // 장비 스탯 합산
    Object.values(hero.equipment).forEach(item => {
      if (!item) return;
      if (item.stats) {
        Object.keys(item.stats).forEach(stat => {
          if (equipBonus[stat] !== undefined) {
            equipBonus[stat] += item.stats[stat];
          }
        });
      }
    });

    // 등급 배율
    const rarityMult = {
      common: 1.0, uncommon: 1.1, rare: 1.25,
      epic: 1.5, legendary: 1.8, mythic: 2.2
    }[hero.rarity] || 1.0;

    // 최종 스탯
    hero.finalStats = {};
    Object.keys(base).forEach(stat => {
      hero.finalStats[stat] = Math.floor((base[stat] + equipBonus[stat]) * rarityMult);
    });

    // 원소 보너스 (해당 원소 스탯 +10%)
    if (hero.element === 'fire') hero.finalStats.atk = Math.floor(hero.finalStats.atk * 1.1);
    if (hero.element === 'water') hero.finalStats.hp = Math.floor(hero.finalStats.hp * 1.1);
    if (hero.element === 'grass') hero.finalStats.def = Math.floor(hero.finalStats.def * 1.1);
    if (hero.element === 'thunder') hero.finalStats.spd = Math.floor(hero.finalStats.spd * 1.1);
    if (hero.element === 'ice') hero.finalStats.mp = Math.floor(hero.finalStats.mp * 1.1);
    if (hero.element === 'earth') hero.finalStats.def = Math.floor(hero.finalStats.def * 1.15);
    if (hero.element === 'light') hero.finalStats.luk = Math.floor(hero.finalStats.luk * 1.15);
    if (hero.element === 'dark') hero.finalStats.atk = Math.floor(hero.finalStats.atk * 1.15);
  },

  // ========== 정령 보너스 분배 ==========
  _distributeSpiritBonuses() {
    if (this.party.spirits.length === 0 || this.party.heroes.length === 0) return;

    this.party.spirits.forEach(spirit => {
      // 같은 원소 영웅에게 우선 분배, 없으면 전체 분배
      const sameElementHeroes = this.party.heroes.filter(h => h.element === spirit.element);
      const targets = sameElementHeroes.length > 0 ? sameElementHeroes : this.party.heroes;

      targets.forEach(hero => {
        const share = 1 / targets.length; // 균등 분배
        Object.keys(spirit.bonusStats).forEach(stat => {
          if (hero.finalStats[stat] !== undefined) {
            hero.finalStats[stat] += Math.floor(spirit.bonusStats[stat] * share);
          }
        });
      });

      // 정령 스킬 부여 (같은 원소 영웅에게)
      if (spirit.skill && sameElementHeroes.length > 0) {
        const target = sameElementHeroes[0];
        if (!target._spiritSkills) target._spiritSkills = [];
        target._spiritSkills.push(spirit.skill);
      }
    });

    console.log(`[HeroAI] 정령 ${this.party.spirits.length}마리 보너스 분배 완료`);
  },

  // ========== 펫 보너스 적용 ==========
  _applyPetBonus() {
    if (!this.party.pet) return;
    const pet = this.party.pet;

    // 펫 장비 스탯
    const petEquipBonus = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, luk: 0 };
    Object.values(pet.equipment).forEach(item => {
      if (!item || !item.stats) return;
      Object.keys(item.stats).forEach(stat => {
        if (petEquipBonus[stat] !== undefined) {
          petEquipBonus[stat] += item.stats[stat];
        }
      });
    });

    // 파티 전체에 펫 보너스 적용
    this.party.heroes.forEach(hero => {
      Object.keys(pet.partyBonus).forEach(stat => {
        if (hero.finalStats[stat] !== undefined) {
          hero.finalStats[stat] += pet.partyBonus[stat] + petEquipBonus[stat];
        }
      });
    });

    console.log(`[HeroAI] 펫 "${pet.name}" 보너스 적용 완료`);
  },

  // ========== 파티 시너지 ==========
  _calculatePartySynergy() {
    const heroes = this.party.heroes;
    if (heroes.length < 2) return;

    // 같은 원소 시너지
    const elementCount = {};
    heroes.forEach(h => {
      elementCount[h.element] = (elementCount[h.element] || 0) + 1;
    });

    Object.entries(elementCount).forEach(([element, count]) => {
      if (count >= 2) {
        const bonus = count >= 3 ? 0.15 : 0.08; // 3명 이상 15%, 2명 8%
        heroes.filter(h => h.element === element).forEach(hero => {
          hero.finalStats.atk = Math.floor(hero.finalStats.atk * (1 + bonus));
          hero.finalStats.def = Math.floor(hero.finalStats.def * (1 + bonus));
        });
        console.log(`[HeroAI] ${element} 원소 시너지 x${count} (+${bonus * 100}%)`);
      }
    });

    // 역할 시너지
    const roles = heroes.map(h => h.role);
    const hasRole = role => roles.includes(role);
    if (hasRole('tank') && hasRole('healer')) {
      heroes.forEach(h => { h.finalStats.def += 5; });
      console.log('[HeroAI] 탱크+힐러 시너지: DEF+5');
    }
    if (hasRole('tank_dps') && hasRole('magic_dps')) {
      heroes.forEach(h => { h.finalStats.atk += 5; });
      console.log('[HeroAI] 물리+마법 시너지: ATK+5');
    }
    if (hasRole('assassin') && hasRole('ranged_dps')) {
      heroes.forEach(h => { h.finalStats.spd += 3; });
      console.log('[HeroAI] 암살+원거리 시너지: SPD+3');
    }
  },

  // ========== 외모 업데이트 (장비 반영) ==========
  _updateAllAppearances() {
    this.party.heroes.forEach(hero => {
      this._updateHeroAppearance(hero);
    });

    if (this.party.pet) {
      this._updatePetAppearance(this.party.pet);
    }
  },

  _updateHeroAppearance(hero) {
    const ev = hero.appearance.equipVisual;

    // 무기 외모
    if (hero.equipment.weapon) {
      ev.weaponModel = {
        type: hero.equipment.weapon.visualType || 'sword',
        color: hero.equipment.weapon.visualColor || null,
        effect: hero.equipment.weapon.visualEffect || null,
        rarity: hero.equipment.weapon.rarity || hero.rarity
      };
    } else {
      ev.weaponModel = null;
    }

    // 갑옷 외모
    if (hero.equipment.armor) {
      ev.armorModel = {
        type: hero.equipment.armor.visualType || 'plate',
        color: hero.equipment.armor.visualColor || null,
        effect: hero.equipment.armor.visualEffect || null,
        rarity: hero.equipment.armor.rarity || hero.rarity
      };
    } else {
      ev.armorModel = null;
    }

    // 투구 외모
    if (hero.equipment.helmet) {
      ev.helmetModel = {
        type: hero.equipment.helmet.visualType || 'helm',
        color: hero.equipment.helmet.visualColor || null,
        rarity: hero.equipment.helmet.rarity || hero.rarity
      };
    } else {
      ev.helmetModel = null;
    }

    // 부츠 외모
    if (hero.equipment.boots) {
      ev.bootsModel = {
        type: hero.equipment.boots.visualType || 'boots',
        color: hero.equipment.boots.visualColor || null,
        rarity: hero.equipment.boots.rarity || hero.rarity
      };
    } else {
      ev.bootsModel = null;
    }
  },

  _updatePetAppearance(pet) {
    if (pet.equipment.collar) {
      pet.appearance.accessoryVisual = {
        type: 'collar',
        color: pet.equipment.collar.visualColor || null,
        effect: pet.equipment.collar.visualEffect || null
      };
    }
  },

  // ========== 파티 정보 가져오기 ==========
  getPartyData() {
    return {
      heroes: this.party.heroes.map(h => ({
        id: h.id, name: h.name, class: h.class,
        element: h.element, rarity: h.rarity, level: h.level,
        stats: { ...h.finalStats },
        skills: [...h.skills, ...(h._spiritSkills || [])],
        appearance: h.appearance,
        role: h.role
      })),
      spirits: this.party.spirits.map(s => ({
        id: s.id, name: s.name, element: s.element,
        rarity: s.rarity, usesRemaining: s.usesRemaining
      })),
      pet: this.party.pet ? {
        id: this.party.pet.id, name: this.party.pet.name,
        type: this.party.pet.type, element: this.party.pet.element,
        skill: this.party.pet.skill, passive: this.party.pet.passive,
        appearance: this.party.pet.appearance
      } : null,
      totalPower: this._calculateTotalPower()
    };
  },

  _calculateTotalPower() {
    let power = 0;
    this.party.heroes.forEach(h => {
      const s = h.finalStats;
      power += s.hp + s.mp + s.atk * 3 + s.def * 2 + s.spd * 2 + s.luk;
    });
    return power;
  },

  _logPartyInfo() {
    console.log('--- 파티 정보 ---');
    this.party.heroes.forEach(h => {
      console.log(`[${h.name}] Lv.${h.level} ${h.class}(${h.element}) HP:${h.finalStats.hp} ATK:${h.finalStats.atk} DEF:${h.finalStats.def} SPD:${h.finalStats.spd}`);
    });
    if (this.party.pet) {
      console.log(`[펫: ${this.party.pet.name}] ${this.party.pet.type}(${this.party.pet.element})`);
    }
    console.log(`정령: ${this.party.spirits.length}마리 | 총 전투력: ${this._calculateTotalPower()}`);
  },

  connectToEngine() {
    console.log('[HeroAI] 주인공 AI 코어 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.HeroAI = HeroAI;
if (typeof module !== 'undefined') module.exports = HeroAI;
