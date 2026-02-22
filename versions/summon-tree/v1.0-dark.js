/**
 * summon-evolution.js — 소환나무 보관함
 * 6부위 파편(head/body/wings/legs/aura/core) 수집
 * 레전드 6부위 모으면 소환, evolvePet, generatePetFromEvolution
 * UnitFactory 연동: 펫 생성 시 UnitFactory.createPet() 사용
 */
import UnitFactory from '../data/unit-factory.js';

export const FRAGMENT_PARTS = ['head','body','wings','legs','aura','core'];

export const PART_INFO = {
  head:  { name:'머리 파편', emoji:'🧩', color:'#f5c2e7' },
  body:  { name:'몸통 파편', emoji:'🫀', color:'#ff6b6b' },
  wings: { name:'날개 파편', emoji:'🪶', color:'#67e8f9' },
  legs:  { name:'다리 파편', emoji:'🦵', color:'#86efac' },
  aura:  { name:'오라 파편', emoji:'✨', color:'#c084fc' },
  core:  { name:'핵심 파편', emoji:'💎', color:'#fbbf24' },
};

export const RARITY_REQUIREMENTS = {
  common:    { perPart: 3, totalNeeded: 18 },
  rare:      { perPart: 5, totalNeeded: 30 },
  magic:     { perPart: 8, totalNeeded: 48 },
  epic:      { perPart: 12, totalNeeded: 72 },
  legendary: { perPart: 1, totalNeeded: 6 },
};

// ── 진화 재료 ──
export const EVOLUTION_MATERIALS = {
  evo_stone_s: { name:'소형 진화석', emoji:'🪨', rarity:'common' },
  evo_stone_m: { name:'중형 진화석', emoji:'💎', rarity:'rare' },
  evo_stone_l: { name:'대형 진화석', emoji:'🔮', rarity:'epic' },
  spirit_shard: { name:'정령 조각', emoji:'✨', rarity:'rare' },
  rainbow_shard: { name:'무지개 조각', emoji:'🌈', rarity:'legendary' },
  life_dew: { name:'생명의 이슬', emoji:'💧', rarity:'common' },
  moon_dust: { name:'달빛 가루', emoji:'🌙', rarity:'rare' },
  star_fragment: { name:'별 파편', emoji:'⭐', rarity:'epic' },
  world_seed: { name:'세계수 씨앗', emoji:'🌳', rarity:'legendary' },
};

// ── 진화 단계 ──
const EVOLUTION_STAGES = [
  { stage:1, name:'알', emoji:'🥚', req:null },
  { stage:2, name:'새싹', emoji:'🌱', req:{evo_stone_s:3, life_dew:2} },
  { stage:3, name:'성장', emoji:'🌿', req:{evo_stone_m:3, spirit_shard:2, moon_dust:1} },
  { stage:4, name:'개화', emoji:'🌸', req:{evo_stone_m:5, evo_stone_l:1, star_fragment:1} },
  { stage:5, name:'완성체', emoji:'🌳', req:{evo_stone_l:3, rainbow_shard:1, world_seed:1} },
];

// ── 소환나무 클래스 ──
export class SummonTree {
  constructor() {
    this.alwaysActive = true;
    this.fragments = {};   // { spiritTemplateId: { head:n, body:n, ... } }
    this.materials = {};   // { materialId: count }
    this.summonedSpirits = []; // 소환된 정령 목록
    this.returnedSpirits = []; // 귀환 중인 정령 { spirit, returnTime }
    this.petEvolutions = {};   // { petId: stageNum }
  }

  // ── 파편 관리 ──
  addFragment(spiritId, part, count = 1) {
    if (!FRAGMENT_PARTS.includes(part)) return false;
    if (!this.fragments[spiritId]) {
      this.fragments[spiritId] = {};
      FRAGMENT_PARTS.forEach(p => { this.fragments[spiritId][p] = 0; });
    }
    this.fragments[spiritId][part] += count;
    return true;
  }

  getFragments(spiritId) {
    return this.fragments[spiritId] || null;
  }

  getFragmentProgress(spiritId, rarity = 'legendary') {
    const req = RARITY_REQUIREMENTS[rarity];
    if (!req) return { complete: false, progress: 0, missing: {} };
    const frags = this.fragments[spiritId] || {};
    const missing = {};
    let collected = 0;
    let total = 0;
    for (const part of FRAGMENT_PARTS) {
      const have = frags[part] || 0;
      const need = req.perPart;
      collected += Math.min(have, need);
      total += need;
      if (have < need) missing[part] = need - have;
    }
    return {
      complete: Object.keys(missing).length === 0,
      progress: collected / total,
      missing,
    };
  }

  // ── 정령 소환 (레전드 6부위 완성) ──
  summonSpirit(spiritId, rarity = 'legendary') {
    const { complete } = this.getFragmentProgress(spiritId, rarity);
    if (!complete) return null;
    const req = RARITY_REQUIREMENTS[rarity];
    for (const part of FRAGMENT_PARTS) {
      this.fragments[spiritId][part] -= req.perPart;
    }
    const spirit = {
      id: spiritId + '_' + Date.now(),
      templateId: spiritId,
      rarity,
      level: 1,
      summonedAt: Date.now(),
      alive: true,
    };
    this.summonedSpirits.push(spirit);
    return spirit;
  }

  // ── 정령 귀환 (전투에서 쓰러짐 → 소환나무로 귀환) ──
  returnSpirit(spiritId) {
    const idx = this.summonedSpirits.findIndex(s => s.id === spiritId);
    if (idx === -1) return false;
    const spirit = this.summonedSpirits[idx];
    spirit.alive = false;
    this.returnedSpirits.push({
      spirit,
      returnTime: Date.now() + 30000, // 30초 후 재소환 가능
    });
    return true;
  }

  // ── 귀환 완료된 정령 재소환 가능 여부 ──
  getRecoverableSpirits() {
    const now = Date.now();
    return this.returnedSpirits
      .filter(r => now >= r.returnTime)
      .map(r => r.spirit);
  }

  // ── 정령 재소환 ──
  resummonSpirit(spiritId) {
    const now = Date.now();
    const idx = this.returnedSpirits.findIndex(r => r.spirit.id === spiritId && now >= r.returnTime);
    if (idx === -1) return null;
    const { spirit } = this.returnedSpirits.splice(idx, 1)[0];
    spirit.alive = true;
    return spirit;
  }

  // ── 재료 관리 ──
  addMaterial(matId, count = 1) {
    this.materials[matId] = (this.materials[matId] || 0) + count;
  }

  getMaterial(matId) {
    return this.materials[matId] || 0;
  }

  // ── 펫 진화 ──
  canEvolvePet(petId) {
    const currentStage = this.petEvolutions[petId] || 1;
    if (currentStage >= EVOLUTION_STAGES.length) return { can: false, next: null, missing: {} };
    const next = EVOLUTION_STAGES[currentStage]; // 0-indexed: stage2 = index 1
    if (!next || !next.req) return { can: false, next: null, missing: {} };
    const missing = {};
    let can = true;
    for (const [matId, need] of Object.entries(next.req)) {
      const have = this.materials[matId] || 0;
      if (have < need) { missing[matId] = need - have; can = false; }
    }
    return { can, next, missing };
  }

  evolvePet(petId) {
    const { can, next } = this.canEvolvePet(petId);
    if (!can || !next) return null;
    for (const [matId, need] of Object.entries(next.req)) {
      this.materials[matId] -= need;
    }
    this.petEvolutions[petId] = next.stage;
    return next;
  }

  // ── 일반 펫 습득 (진화 재료로 생성, UnitFactory 경유) ──
  generatePetFromEvolution(attribute = 'nature') {
    const cost = { evo_stone_s: 5, life_dew: 3 };
    for (const [matId, need] of Object.entries(cost)) {
      if ((this.materials[matId] || 0) < need) return null;
    }
    for (const [matId, need] of Object.entries(cost)) {
      this.materials[matId] -= need;
    }
    return UnitFactory.createPet({
      attribute,
      rarity: 'common',
      level: 1,
      evolutionStage: 1,
    });
  }

  // ── 직렬화 ──
  toJSON() {
    return {
      fragments: this.fragments,
      materials: this.materials,
      summonedSpirits: this.summonedSpirits,
      returnedSpirits: this.returnedSpirits,
      petEvolutions: this.petEvolutions,
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.fragments = data.fragments || {};
    this.materials = data.materials || {};
    this.summonedSpirits = data.summonedSpirits || [];
    this.returnedSpirits = data.returnedSpirits || [];
    this.petEvolutions = data.petEvolutions || {};
  }

  reset() {
    this.fragments = {};
    this.materials = {};
    this.summonedSpirits = [];
    this.returnedSpirits = [];
    this.petEvolutions = {};
  }
}

// ── 파편 드롭 유틸 ──
export function rollFragmentDrop(enemyRarity = 'common') {
  const rates = { common:0.15, rare:0.25, magic:0.35, epic:0.50, legendary:0.70 };
  if (Math.random() > (rates[enemyRarity] || 0.15)) return null;
  const part = FRAGMENT_PARTS[Math.floor(Math.random() * FRAGMENT_PARTS.length)];
  return { part, count: enemyRarity === 'legendary' ? 2 : 1 };
}

export function rollMaterialDrop(enemyRarity = 'common') {
  const matIds = Object.keys(EVOLUTION_MATERIALS);
  const tierMap = { common: 0, rare: 1, magic: 2, epic: 3, legendary: 4 };
  const tier = tierMap[enemyRarity] || 0;
  const maxIdx = Math.min(matIds.length - 1, 2 + tier * 2);
  if (Math.random() > 0.2 + tier * 0.1) return null;
  const matId = matIds[Math.floor(Math.random() * (maxIdx + 1))];
  return { matId, count: 1 };
}
