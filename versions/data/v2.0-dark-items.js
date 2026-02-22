// Item definitions — 무기 15종, 방어구 5슬롯, 장신구 4종, 소비템 5종
// 등급: common(1성) / rare(2성) / epic(3성) / legendary(4성) / mythic(5성)
export const WEAPONS = [
  // ── 기존 ──
  { id:'w_wood_sword', name:'나무 검', emoji:'🗡️', slot:'arms', type:'sword', rarity:'common', grade:1, stats:{attack:3} },
  { id:'w_magic_staff', name:'마법 지팡이', emoji:'🪄', slot:'arms', type:'staff', rarity:'common', grade:1, stats:{attack:4} },
  { id:'w_crystal_sword', name:'크리스탈 검', emoji:'⚔️', slot:'arms', type:'sword', rarity:'rare', grade:2, stats:{attack:8} },
  { id:'w_dragon_spear', name:'용의 창', emoji:'🔱', slot:'arms', type:'spear', rarity:'rare', grade:2, stats:{attack:10,speed:1} },
  { id:'w_legend_bow', name:'전설의 활', emoji:'🏹', slot:'arms', type:'bow', rarity:'epic', grade:3, stats:{attack:15,speed:2} },
  // ── 확장 15종 체계 ──
  { id:'w_iron_axe', name:'철 도끼', emoji:'🪓', slot:'arms', type:'axe', rarity:'common', grade:1, stats:{attack:5,critRate:2} },
  { id:'w_war_mace', name:'전투 메이스', emoji:'🔨', slot:'arms', type:'mace', rarity:'rare', grade:2, stats:{attack:9,defense:2} },
  { id:'w_machinegun', name:'기관총', emoji:'🔫', slot:'arms', type:'gun', rarity:'epic', grade:3, stats:{attack:12,speed:3} },
  { id:'w_shotgun', name:'산탄총', emoji:'💥', slot:'arms', type:'shotgun', rarity:'rare', grade:2, stats:{attack:14,speed:-1} },
  { id:'w_sniper_rifle', name:'저격총', emoji:'🎯', slot:'arms', type:'sniper', rarity:'epic', grade:3, stats:{attack:18,critRate:8} },
  { id:'w_magic_orb', name:'마법 오브', emoji:'🔮', slot:'arms', type:'orb', rarity:'rare', grade:2, stats:{attack:7,maxHp:10} },
  { id:'w_spellbook', name:'주문서', emoji:'📖', slot:'arms', type:'book', rarity:'epic', grade:3, stats:{attack:11,critDamage:10} },
  { id:'w_great_sword', name:'대검', emoji:'⚔️', slot:'arms', type:'greatsword', rarity:'legendary', grade:4, stats:{attack:22,critRate:5} },
  { id:'w_dual_blades', name:'쌍검', emoji:'🗡️', slot:'arms', type:'dual', rarity:'legendary', grade:4, stats:{attack:18,speed:5,critRate:8} },
  { id:'w_crossbow', name:'석궁', emoji:'🏹', slot:'arms', type:'crossbow', rarity:'epic', grade:3, stats:{attack:16,critDamage:15} },
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

// ── 투구 (head) ──
export const HELMETS = [
  { id:'h_leather_cap', name:'가죽 모자', emoji:'🧢', slot:'head', rarity:'common', grade:1, stats:{defense:2,maxHp:5} },
  { id:'h_iron_helm', name:'철 투구', emoji:'⛑️', slot:'head', rarity:'rare', grade:2, stats:{defense:5,maxHp:15} },
  { id:'h_mithril_helm', name:'미스릴 투구', emoji:'🪖', slot:'head', rarity:'epic', grade:3, stats:{defense:8,maxHp:25} },
  { id:'h_dragon_helm', name:'드래곤 투구', emoji:'🐲', slot:'head', rarity:'legendary', grade:4, stats:{defense:12,maxHp:40,critRate:3} },
];

// ── 장갑 (arms 보조) ──
export const GLOVES = [
  { id:'g_leather_glove', name:'가죽 장갑', emoji:'🧤', slot:'arms_sub', rarity:'common', grade:1, stats:{attack:1,speed:1} },
  { id:'g_iron_gauntlet', name:'철 건틀릿', emoji:'🤜', slot:'arms_sub', rarity:'rare', grade:2, stats:{attack:3,defense:2} },
  { id:'g_mage_glove', name:'마법 장갑', emoji:'✋', slot:'arms_sub', rarity:'epic', grade:3, stats:{attack:5,critRate:5} },
];

// ── 신발 (shoes) ──
export const SHOES = [
  { id:'s_sandal', name:'가죽 샌들', emoji:'👟', slot:'shoes', rarity:'common', grade:1, stats:{speed:2} },
  { id:'s_boots', name:'철 부츠', emoji:'🥾', slot:'shoes', rarity:'rare', grade:2, stats:{speed:3,defense:2} },
  { id:'s_wind_boots', name:'바람의 부츠', emoji:'👢', slot:'shoes', rarity:'epic', grade:3, stats:{speed:5,dodgePct:3} },
  { id:'s_dragon_boots', name:'드래곤 부츠', emoji:'🐉', slot:'shoes', rarity:'legendary', grade:4, stats:{speed:7,defense:4,dodgePct:5} },
];

// ── 망토 (cape) ──
export const CAPES = [
  { id:'c_cloth_cape', name:'천 망토', emoji:'🧣', slot:'cape', rarity:'common', grade:1, stats:{defense:1,maxHp:5} },
  { id:'c_magic_cape', name:'마법 망토', emoji:'🦸', slot:'cape', rarity:'rare', grade:2, stats:{defense:3,dodgePct:3} },
  { id:'c_shadow_cape', name:'그림자 망토', emoji:'🖤', slot:'cape', rarity:'epic', grade:3, stats:{defense:5,dodgePct:5,speed:2} },
];

// ── 장신구 4종 (반지/목걸이/귀걸이/부적) ──
export const JEWELRY = [
  { id:'j_luck_ring', name:'행운의 반지', emoji:'💍', slot:'ring', rarity:'common', grade:1, stats:{critRate:2,luck:3} },
  { id:'j_power_ring', name:'힘의 반지', emoji:'💍', slot:'ring', rarity:'rare', grade:2, stats:{attack:5,critRate:3} },
  { id:'j_hp_necklace', name:'체력 목걸이', emoji:'📿', slot:'necklace', rarity:'common', grade:1, stats:{maxHp:15} },
  { id:'j_mana_necklace', name:'마나 목걸이', emoji:'📿', slot:'necklace', rarity:'rare', grade:2, stats:{maxHp:25,cdReduction:5} },
  { id:'j_earring', name:'바람의 귀걸이', emoji:'💎', slot:'earring', rarity:'rare', grade:2, stats:{speed:3,dodgePct:2} },
  { id:'j_crystal_earring', name:'수정 귀걸이', emoji:'💎', slot:'earring', rarity:'epic', grade:3, stats:{critRate:5,critDamage:10} },
  { id:'j_holy_amulet', name:'성스러운 부적', emoji:'🧿', slot:'amulet', rarity:'epic', grade:3, stats:{defense:4,maxHp:30,darkResist:10} },
  { id:'j_luck_amulet', name:'행운의 부적', emoji:'🧿', slot:'amulet', rarity:'rare', grade:2, stats:{luck:10,goldPct:5} },
];

// ── 소비 아이템 5종 ──
export const CONSUMABLES = [
  { id:'c_holy_water', name:'성수', emoji:'💧', type:'consumable', effect:'weaken_enemy', value:30, duration:10000, desc:'주변 적 DEF -30% 10초' },
  { id:'c_ammo_box', name:'탄창', emoji:'🔫', type:'consumable', effect:'ammo_refill', value:50, desc:'투사체 +50발' },
  { id:'c_hp_potion', name:'HP 포션', emoji:'🧪', type:'consumable', effect:'heal', value:30, desc:'즉시 HP 30% 회복' },
  { id:'c_mp_potion', name:'MP 포션', emoji:'⚗️', type:'consumable', effect:'cooldown_reset', value:0, desc:'모든 스킬 쿨타임 초기화' },
  { id:'c_revive_stone', name:'부활석', emoji:'💎', type:'consumable', effect:'revive', value:50, desc:'사망 시 자동 부활 (HP 50%)' },
];

// ── 세트 효과 ──
export const SET_BONUSES = {
  dragon: { pieces:3, name:'드래곤 세트', effect:{atkPct:15,defPct:15,maxHpFlat:100}, desc:'3세트: ATK/DEF+15%, HP+100' },
  shadow: { pieces:2, name:'그림자 세트', effect:{spdPct:20,dodgePct:10}, desc:'2세트: SPD+20%, 회피+10%' },
  mithril: { pieces:2, name:'미스릴 세트', effect:{defPct:20,maxHpFlat:50}, desc:'2세트: DEF+20%, HP+50' },
  holy: { pieces:2, name:'성스러운 세트', effect:{healPct:20,darkResist:20}, desc:'2세트: 치유+20%, 어둠저항+20%' },
};

// ── 랜덤 옵션 풀 (강화/재련 시 사용) ──
export const RANDOM_OPTION_POOL = [
  { id:'ro_atk', name:'ATK+', min:1, max:10, weight:20 },
  { id:'ro_def', name:'DEF+', min:1, max:8, weight:20 },
  { id:'ro_hp', name:'HP+', min:5, max:50, weight:18 },
  { id:'ro_spd', name:'SPD+', min:1, max:5, weight:15 },
  { id:'ro_crit', name:'CRIT+', min:1, max:5, weight:12 },
  { id:'ro_critdmg', name:'치명타DMG+', min:2, max:15, weight:10 },
  { id:'ro_dodge', name:'회피+', min:1, max:3, weight:8 },
  { id:'ro_luck', name:'LUCK+', min:1, max:8, weight:10 },
];

export const ALL_ITEMS = [...WEAPONS, ...ARMORS, ...ACCESSORIES, ...LEGS, ...HELMETS, ...GLOVES, ...SHOES, ...CAPES, ...JEWELRY];
export const ALL_EQUIP = ALL_ITEMS; // alias

export function getItemsByRarity(rarity) {
  return ALL_ITEMS.filter(i => i.rarity === rarity);
}

export function getItemById(id) {
  return ALL_ITEMS.find(i => i.id === id) ||
         CONSUMABLES.find(i => i.id === id) || null;
}
