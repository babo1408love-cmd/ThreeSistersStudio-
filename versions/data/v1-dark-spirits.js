// Spirit definitions - 5 rarity tiers
const SPIRITS = [
  // --- Common (일반) ---
  {
    key: 'fairy', name: '빛의 요정', emoji: '🧚', rarity: 'common', summonCost: 1,
    stats: { attack: 8, defense: 3, speed: 5 },
    ability: { name: '빛의 축복', type: 'heal', value: 20, cooldown: 8000, description: '아군 체력 20 회복' }
  },
  {
    key: 'mushroom', name: '독버섯 정령', emoji: '🍄', rarity: 'common', summonCost: 1,
    stats: { attack: 12, defense: 6, speed: 3 },
    ability: { name: '독 포자', type: 'aoe', value: 15, radius: 80, cooldown: 6000, description: '주변 적에게 15 피해' }
  },
  {
    key: 'candy', name: '사탕 힐러', emoji: '🍬', rarity: 'common', summonCost: 1,
    stats: { attack: 5, defense: 5, speed: 4 },
    ability: { name: '달콤한 치료', type: 'heal', value: 30, cooldown: 10000, description: '아군 체력 30 회복' }
  },
  {
    key: 'water', name: '물방울 정령', emoji: '💧', rarity: 'common', summonCost: 1,
    stats: { attack: 10, defense: 8, speed: 4 },
    ability: { name: '물결 파동', type: 'aoe', value: 12, radius: 100, cooldown: 7000, description: '주변 적에게 12 피해 + 감속' }
  },
  // --- Rare (레어) ---
  {
    key: 'diamond', name: '다이아 수호자', emoji: '💎', rarity: 'rare', summonCost: 2,
    stats: { attack: 6, defense: 15, speed: 2 },
    ability: { name: '수정 방어막', type: 'shield', value: 30, cooldown: 10000, description: '아군에게 방어막 30 부여' }
  },
  {
    key: 'star', name: '별빛 마법사', emoji: '⭐', rarity: 'rare', summonCost: 2,
    stats: { attack: 18, defense: 4, speed: 4 },
    ability: { name: '유성우', type: 'aoe', value: 25, radius: 120, cooldown: 12000, description: '넓은 범위에 25 피해' }
  },
  {
    key: 'moon', name: '달빛 암살자', emoji: '🌙', rarity: 'rare', summonCost: 2,
    stats: { attack: 22, defense: 3, speed: 8 },
    ability: { name: '그림자 일격', type: 'single', value: 40, cooldown: 8000, description: '단일 대상 40 피해' }
  },
  // --- Magic (매직) ---
  {
    key: 'thunder', name: '번개 정령', emoji: '⚡', rarity: 'magic', summonCost: 3,
    stats: { attack: 24, defense: 8, speed: 7 },
    ability: { name: '천둥벼락', type: 'aoe', value: 30, radius: 110, cooldown: 9000, description: '광역 30 피해 + 마비' }
  },
  {
    key: 'blossom', name: '벚꽃 정령', emoji: '🌸', rarity: 'magic', summonCost: 3,
    stats: { attack: 15, defense: 12, speed: 5 },
    ability: { name: '꽃비', type: 'heal', value: 45, cooldown: 11000, description: '아군 체력 45 회복 + 방어↑' }
  },
  {
    key: 'crystal', name: '수정 마도사', emoji: '🔮', rarity: 'magic', summonCost: 3,
    stats: { attack: 20, defense: 10, speed: 6 },
    ability: { name: '수정 폭발', type: 'beam', value: 35, cooldown: 10000, description: '관통 빔 35 피해' }
  },
  // --- Epic (에픽) ---
  {
    key: 'rainbow', name: '무지개 드래곤', emoji: '🌈', rarity: 'epic', summonCost: 5,
    stats: { attack: 28, defense: 14, speed: 6 },
    ability: { name: '무지개 브레스', type: 'beam', value: 50, cooldown: 10000, description: '직선 관통 50 피해' }
  },
  {
    key: 'fire', name: '불꽃 피닉스', emoji: '🔥', rarity: 'epic', summonCost: 5,
    stats: { attack: 32, defense: 10, speed: 5 },
    ability: { name: '화염 폭발', type: 'aoe', value: 55, radius: 120, cooldown: 14000, description: '대폭발 55 피해' }
  },
  {
    key: 'ice', name: '얼음 여왕', emoji: '❄️', rarity: 'epic', summonCost: 5,
    stats: { attack: 25, defense: 18, speed: 3 },
    ability: { name: '빙결', type: 'freeze', value: 35, radius: 100, cooldown: 12000, description: '주변 적 동결 + 35 피해' }
  },
  // --- Legendary (레전드리) ---
  {
    key: 'cosmos', name: '우주의 창조자', emoji: '🌌', rarity: 'legendary', summonCost: 8,
    stats: { attack: 40, defense: 20, speed: 8 },
    ability: { name: '빅뱅', type: 'aoe', value: 80, radius: 200, cooldown: 18000, description: '전체 적에게 80 피해' }
  },
  {
    key: 'phoenix_lord', name: '불사조 군주', emoji: '🦅', rarity: 'legendary', summonCost: 8,
    stats: { attack: 35, defense: 25, speed: 7 },
    ability: { name: '영원의 불꽃', type: 'heal', value: 100, cooldown: 20000, description: '아군 전체 회복 + 부활' }
  },
  {
    key: 'void_dragon', name: '공허의 용', emoji: '🐲', rarity: 'legendary', summonCost: 8,
    stats: { attack: 45, defense: 15, speed: 9 },
    ability: { name: '차원의 숨결', type: 'beam', value: 100, cooldown: 16000, description: '관통 100 피해 + 방어 무시' }
  }
];

export const RARITY_COLORS = {
  common: '#86efac',
  rare: '#9b8aff',
  magic: '#67e8f9',
  epic: '#fbbf24',
  legendary: '#ff6b6b'
};

export const RARITY_NAMES = {
  common: '일반',
  rare: '레어',
  magic: '매직',
  epic: '에픽',
  legendary: '레전드리'
};

export const RARITY_BG = {
  common: 'rgba(134,239,172,0.15)',
  rare: 'rgba(155,138,255,0.15)',
  magic: 'rgba(103,232,249,0.15)',
  epic: 'rgba(251,191,36,0.15)',
  legendary: 'rgba(255,107,107,0.2)'
};

// Drop rates for spirit items from chests
export const SPIRIT_ITEM_RATES = [
  { rarity: 'common', weight: 50 },
  { rarity: 'rare', weight: 25 },
  { rarity: 'magic', weight: 13 },
  { rarity: 'epic', weight: 8 },
  { rarity: 'legendary', weight: 4 }
];

export function rollSpiritItemRarity() {
  const total = SPIRIT_ITEM_RATES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const tier of SPIRIT_ITEM_RATES) {
    roll -= tier.weight;
    if (roll <= 0) return tier.rarity;
  }
  return 'common';
}

export function getSpiritByKey(key) {
  return SPIRITS.find(s => s.key === key);
}

export function getSpiritsByRarity(rarity) {
  return SPIRITS.filter(s => s.rarity === rarity);
}

export default SPIRITS;
