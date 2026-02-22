/**
 * pet-system.js — 펫 20종, 레벨업, 진화, 합성, 펫 하우스
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 펫 20종 정의 ──
const PET_DEFS = [
  // 전투 펫 (combat)
  { id: 'pet_fire_cat',     name: '불꽃 고양이',   emoji: '🐱', type: 'combat',     rarity: 'rare',   skills: ['fire_scratch','flame_pounce'],  baseStats: { atk:8, def:3, spd:5 } },
  { id: 'pet_ice_wolf',     name: '얼음 늑대',     emoji: '🐺', type: 'combat',     rarity: 'epic',   skills: ['ice_bite','frost_howl'],        baseStats: { atk:12, def:5, spd:6 } },
  { id: 'pet_thunder_hawk', name: '번개 매',       emoji: '🦅', type: 'combat',     rarity: 'epic',   skills: ['thunder_dive','storm_wing'],    baseStats: { atk:14, def:2, spd:10 } },
  { id: 'pet_shadow_bat',   name: '그림자 박쥐',   emoji: '🦇', type: 'combat',     rarity: 'rare',   skills: ['shadow_bite','dark_screech'],   baseStats: { atk:10, def:2, spd:8 } },
  { id: 'pet_dragon_baby',  name: '아기 드래곤',   emoji: '🐉', type: 'combat',     rarity: 'legendary', skills: ['dragon_breath','tail_smash','inferno'], baseStats: { atk:18, def:8, spd:5 } },
  { id: 'pet_stone_golem',  name: '돌 골렘',       emoji: '🪨', type: 'combat',     rarity: 'epic',   skills: ['rock_slam','earth_shield'],     baseStats: { atk:6, def:15, spd:2 } },
  { id: 'pet_poison_snake', name: '독 뱀',         emoji: '🐍', type: 'combat',     rarity: 'rare',   skills: ['venom_bite','poison_spit'],     baseStats: { atk:9, def:3, spd:7 } },
  // 수집 펫 (collection)
  { id: 'pet_gold_hamster', name: '황금 햄스터',   emoji: '🐹', type: 'collection', rarity: 'rare',   skills: ['gold_dig','treasure_sense'],    baseStats: { atk:2, def:4, spd:6 } },
  { id: 'pet_fairy_rabbit', name: '요정 토끼',     emoji: '🐰', type: 'collection', rarity: 'epic',   skills: ['lucky_hop','item_magnet'],      baseStats: { atk:3, def:5, spd:8 } },
  { id: 'pet_crystal_fox',  name: '수정 여우',     emoji: '🦊', type: 'collection', rarity: 'epic',   skills: ['gem_sniff','crystal_dig'],      baseStats: { atk:5, def:4, spd:9 } },
  { id: 'pet_leaf_squirrel',name: '잎사귀 다람쥐', emoji: '🐿️', type: 'collection', rarity: 'common', skills: ['nut_gather'],                   baseStats: { atk:2, def:3, spd:7 } },
  { id: 'pet_star_beetle',  name: '별빛 딱정벌레', emoji: '🪲', type: 'collection', rarity: 'rare',   skills: ['star_collect','luminous_find'], baseStats: { atk:3, def:6, spd:4 } },
  { id: 'pet_pearl_turtle', name: '진주 거북이',   emoji: '🐢', type: 'collection', rarity: 'epic',   skills: ['pearl_dive','shell_store'],     baseStats: { atk:2, def:12, spd:2 } },
  { id: 'pet_rainbow_bird', name: '무지개 새',     emoji: '🐦', type: 'collection', rarity: 'legendary', skills: ['rainbow_gather','sky_survey','rare_find'], baseStats: { atk:4, def:4, spd:12 } },
  // 버프 펫 (buff)
  { id: 'pet_holy_unicorn', name: '성스러운 유니콘', emoji: '🦄', type: 'buff',     rarity: 'legendary', skills: ['holy_aura','heal_pulse','blessing'], baseStats: { atk:5, def:8, spd:7 } },
  { id: 'pet_moon_owl',     name: '달빛 부엉이',   emoji: '🦉', type: 'buff',       rarity: 'epic',   skills: ['wisdom_aura','night_vision'],   baseStats: { atk:4, def:6, spd:5 } },
  { id: 'pet_sun_phoenix',  name: '태양 피닉스',   emoji: '🐦‍🔥', type: 'buff',     rarity: 'legendary', skills: ['sun_blessing','rebirth','flame_aura'], baseStats: { atk:10, def:6, spd:8 } },
  { id: 'pet_wind_sprite',  name: '바람 정령',     emoji: '🌬️', type: 'buff',       rarity: 'rare',   skills: ['speed_aura','evasion_up'],      baseStats: { atk:3, def:3, spd:10 } },
  { id: 'pet_earth_bear',   name: '대지 곰',       emoji: '🐻', type: 'buff',       rarity: 'epic',   skills: ['defense_aura','endure'],        baseStats: { atk:6, def:12, spd:3 } },
  { id: 'pet_water_otter',  name: '물 수달',       emoji: '🦦', type: 'buff',       rarity: 'rare',   skills: ['regen_aura','splash_heal'],     baseStats: { atk:4, def:5, spd:7 } },
];

const EXP_PER_LEVEL = 100;
const MAX_LEVEL = 30;
const MAX_AFFINITY = 100;
const EVOLUTION_LEVEL = 15;
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

class PetSystem {
  init() {
    if (!GameState.pets) {
      GameState.pets = {
        owned: {},       // { petId: { level, exp, affinity, evolved, skills } }
        equipped: null,  // petId
      };
    }
  }

  // ── 펫 목록 ──
  getPets() {
    this.init();
    return PET_DEFS.map(def => {
      const data = GameState.pets.owned[def.id];
      return { ...def, owned: !!data, ...(data || {}) };
    });
  }

  getOwnedPets() {
    this.init();
    return PET_DEFS.filter(d => GameState.pets.owned[d.id]).map(def => ({
      ...def, ...GameState.pets.owned[def.id],
    }));
  }

  // ── 펫 획득 ──
  addPet(petId) {
    this.init();
    const def = PET_DEFS.find(p => p.id === petId);
    if (!def) return false;
    if (GameState.pets.owned[petId]) return false;
    GameState.pets.owned[petId] = {
      level: 1, exp: 0, affinity: 0, evolved: false,
      skills: [def.skills[0]],
    };
    EventBus.emit('pet:acquired', def);
    return true;
  }

  // ── 경험치 부여 ──
  addPetExp(petId, amount) {
    this.init();
    const pet = GameState.pets.owned[petId];
    if (!pet || pet.level >= MAX_LEVEL) return false;
    pet.exp += amount;
    while (pet.exp >= EXP_PER_LEVEL && pet.level < MAX_LEVEL) {
      pet.exp -= EXP_PER_LEVEL;
      pet.level++;
      const def = PET_DEFS.find(p => p.id === petId);
      // 스킬 해금
      if (def && def.skills[pet.level <= 10 ? 0 : pet.level <= 20 ? 1 : 2]) {
        const skillIdx = pet.level <= 10 ? 0 : pet.level <= 20 ? 1 : 2;
        if (!pet.skills.includes(def.skills[skillIdx])) {
          pet.skills.push(def.skills[skillIdx]);
          EventBus.emit('pet:skillLearned', { petId, skill: def.skills[skillIdx] });
        }
      }
      EventBus.emit('pet:levelup', { petId, level: pet.level });
    }
    return true;
  }

  // ── 먹이 주기 (친밀도 상승 + 경험치) ──
  feedPet(petId) {
    this.init();
    const pet = GameState.pets.owned[petId];
    if (!pet) return false;
    pet.affinity = Math.min(MAX_AFFINITY, pet.affinity + 5);
    this.addPetExp(petId, 20);
    EventBus.emit('pet:fed', { petId, affinity: pet.affinity });
    return true;
  }

  // ── 진화 (레벨 15 이상 + 진화석) ──
  evolvePet(petId) {
    this.init();
    const pet = GameState.pets.owned[petId];
    if (!pet || pet.evolved) return false;
    if (pet.level < EVOLUTION_LEVEL) return false;
    pet.evolved = true;
    // 진화 시 스탯 1.5배 적용 (보너스 플래그)
    EventBus.emit('pet:evolved', { petId });
    return true;
  }

  // ── 합성 (동일 타입 2마리 → 상위 등급) ──
  mergePets(id1, id2) {
    this.init();
    const pet1 = GameState.pets.owned[id1];
    const pet2 = GameState.pets.owned[id2];
    if (!pet1 || !pet2 || id1 === id2) return null;
    const def1 = PET_DEFS.find(p => p.id === id1);
    const def2 = PET_DEFS.find(p => p.id === id2);
    if (!def1 || !def2 || def1.type !== def2.type) return null;
    // 상위 등급 펫 찾기
    const curRarity = RARITY_ORDER.indexOf(def1.rarity);
    const nextRarity = RARITY_ORDER[Math.min(curRarity + 1, RARITY_ORDER.length - 1)];
    const candidates = PET_DEFS.filter(p => p.type === def1.type && p.rarity === nextRarity && !GameState.pets.owned[p.id]);
    if (candidates.length === 0) return null;
    const result = candidates[Math.floor(Math.random() * candidates.length)];
    // 소재 제거, 결과 추가
    delete GameState.pets.owned[id1];
    delete GameState.pets.owned[id2];
    if (GameState.pets.equipped === id1 || GameState.pets.equipped === id2) {
      GameState.pets.equipped = null;
    }
    this.addPet(result.id);
    EventBus.emit('pet:merged', { consumed: [id1, id2], result: result.id });
    return result;
  }

  // ── 펫 장착 ──
  equipPet(petId) {
    this.init();
    if (!GameState.pets.owned[petId]) return false;
    GameState.pets.equipped = petId;
    const def = PET_DEFS.find(p => p.id === petId);
    // GameState.petSlot 동기화
    if (def) {
      const pet = GameState.pets.owned[petId];
      const evolved = pet.evolved ? 1.5 : 1;
      GameState.equipPet({
        id: petId, name: def.name, emoji: def.emoji,
        rarity: def.rarity, type: def.type,
        stats: {
          atk: Math.round(def.baseStats.atk * evolved * (1 + pet.level * 0.05)),
          def: Math.round(def.baseStats.def * evolved * (1 + pet.level * 0.05)),
          spd: Math.round(def.baseStats.spd * evolved * (1 + pet.level * 0.05)),
        },
        skills: pet.skills, healEfficiency: 100 + pet.affinity,
      });
    }
    EventBus.emit('pet:equipped', { petId });
    return true;
  }

  // ── 펫 스탯 계산 ──
  getPetStats(petId) {
    this.init();
    const pet = GameState.pets.owned[petId];
    const def = PET_DEFS.find(p => p.id === petId);
    if (!pet || !def) return null;
    const evolved = pet.evolved ? 1.5 : 1;
    return {
      atk: Math.round(def.baseStats.atk * evolved * (1 + pet.level * 0.05)),
      def: Math.round(def.baseStats.def * evolved * (1 + pet.level * 0.05)),
      spd: Math.round(def.baseStats.spd * evolved * (1 + pet.level * 0.05)),
    };
  }

  // ── 친밀도 보너스 ──
  getAffinityBonus(petId) {
    this.init();
    const pet = GameState.pets.owned[petId];
    if (!pet) return {};
    const aff = pet.affinity;
    if (aff >= 80) return { atkPct: 10, defPct: 10, spdPct: 5 };
    if (aff >= 50) return { atkPct: 5, defPct: 5 };
    if (aff >= 20) return { atkPct: 2 };
    return {};
  }

  getPetDef(petId) {
    return PET_DEFS.find(p => p.id === petId) || null;
  }
}

export { PET_DEFS, MAX_LEVEL, EVOLUTION_LEVEL };
export default new PetSystem();
