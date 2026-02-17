// Item definitions — 6부위 장비 슬롯 (head, body, arms, wings, legs, shoes)
export const WEAPONS = [
  { name: '나무 검', emoji: '🗡️', slot: 'arms', rarity: 'common', stats: { attack: 3 } },
  { name: '마법 지팡이', emoji: '🪄', slot: 'arms', rarity: 'common', stats: { attack: 4 } },
  { name: '크리스탈 검', emoji: '⚔️', slot: 'arms', rarity: 'rare', stats: { attack: 8 } },
  { name: '용의 창', emoji: '🔱', slot: 'arms', rarity: 'rare', stats: { attack: 10, speed: 1 } },
  { name: '전설의 활', emoji: '🏹', slot: 'arms', rarity: 'epic', stats: { attack: 15, speed: 2 } }
];

export const ARMORS = [
  { name: '가죽 갑옷', emoji: '🧥', slot: 'body', rarity: 'common', stats: { defense: 3 } },
  { name: '철 갑옷', emoji: '🛡️', slot: 'body', rarity: 'common', stats: { defense: 5, speed: -1 } },
  { name: '마법 로브', emoji: '👘', slot: 'body', rarity: 'rare', stats: { defense: 6, maxHp: 20 } },
  { name: '미스릴 갑옷', emoji: '🦺', slot: 'body', rarity: 'rare', stats: { defense: 10 } },
  { name: '드래곤 아머', emoji: '⚜️', slot: 'body', rarity: 'epic', stats: { defense: 15, maxHp: 30 } }
];

export const ACCESSORIES = [
  { name: '행운의 반지', emoji: '💍', slot: 'arms', rarity: 'common', stats: { critRate: 2, attack: 1 } },
  { name: '체력 목걸이', emoji: '📿', slot: 'head', rarity: 'common', stats: { maxHp: 15 } },
  { name: '속도의 부적', emoji: '🧿', slot: 'wings', rarity: 'rare', stats: { rageGainRate: 8, speed: 2 } },
  { name: '생명의 왕관', emoji: '👑', slot: 'head', rarity: 'epic', stats: { maxHp: 50, defense: 5 } }
];

export const LEGS = [
  { name: '가죽 각반', emoji: '🦿', slot: 'legs', rarity: 'common', stats: { defense: 2, speed: 1 } },
  { name: '철 경갑', emoji: '⚙️', slot: 'legs', rarity: 'common', stats: { defense: 4 } },
  { name: '마법 레깅스', emoji: '🩲', slot: 'legs', rarity: 'rare', stats: { defense: 5, speed: 2 } },
  { name: '미스릴 각반', emoji: '🔩', slot: 'legs', rarity: 'rare', stats: { defense: 8, speed: 1 } },
  { name: '드래곤 다리갑', emoji: '🐉', slot: 'legs', rarity: 'epic', stats: { defense: 12, speed: 3 } },
];

export const RESOURCES = [
  { name: '작은 포션', emoji: '🧪', type: 'consumable', effect: 'heal', value: 30 },
  { name: '큰 포션', emoji: '⚗️', type: 'consumable', effect: 'heal', value: 60 },
  { name: '공격력 부스트', emoji: '💪', type: 'consumable', effect: 'buff_attack', value: 5, duration: 30000 },
  { name: '방어력 부스트', emoji: '🛡️', type: 'consumable', effect: 'buff_defense', value: 5, duration: 30000 }
];

export const ALL_ITEMS = [...WEAPONS, ...ARMORS, ...ACCESSORIES, ...LEGS];

export function getItemsByRarity(rarity) {
  return ALL_ITEMS.filter(i => i.rarity === rarity);
}
