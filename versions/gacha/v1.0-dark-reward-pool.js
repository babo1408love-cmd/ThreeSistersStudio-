// ============================================================
// 🎰 몽글벨 보상 풀 (3/5)
// ============================================================
// 장비/펫/마블 3종 가챠 아이템 데이터베이스
// 등급별 아이템 + 스탯 + 외모 데이터
//
// Claude Code: js/gacha/reward-pool.js 에 넣으세요
// ============================================================

const RewardPool = {

  // =============================================================
  // ⚔️ 장비 가챠 풀
  // =============================================================
  EQUIPMENT: [
    // === Common (65%) ===
    { id: 'eq_w001', name: '나무 검', rarity: 'common', type: 'weapon', subType: 'sword', element: 'none', stats: { atk: 5 }, visualType: 'sword', visualColor: 0x886644 },
    { id: 'eq_w002', name: '나무 활', rarity: 'common', type: 'weapon', subType: 'bow', element: 'none', stats: { atk: 4, spd: 1 }, visualType: 'bow', visualColor: 0x886644 },
    { id: 'eq_w003', name: '나무 지팡이', rarity: 'common', type: 'weapon', subType: 'staff', element: 'none', stats: { atk: 3, mp: 5 }, visualType: 'staff', visualColor: 0x886644 },
    { id: 'eq_a001', name: '가죽 갑옷', rarity: 'common', type: 'armor', element: 'none', stats: { def: 5, hp: 10 }, visualType: 'leather', visualColor: 0x885533 },
    { id: 'eq_a002', name: '천 로브', rarity: 'common', type: 'armor', element: 'none', stats: { def: 3, mp: 8 }, visualType: 'robe', visualColor: 0x444488 },
    { id: 'eq_h001', name: '가죽 모자', rarity: 'common', type: 'helmet', element: 'none', stats: { def: 3 }, visualType: 'cap', visualColor: 0x885533 },
    { id: 'eq_b001', name: '가죽 부츠', rarity: 'common', type: 'boots', element: 'none', stats: { spd: 2 }, visualType: 'boots', visualColor: 0x664422 },
    { id: 'eq_c001', name: '구리 반지', rarity: 'common', type: 'accessory', element: 'none', stats: { luk: 2 }, visualType: 'ring', visualColor: 0xCC8844 },

    // === Rare (23%) ===
    { id: 'eq_w010', name: '강철 검', rarity: 'rare', type: 'weapon', subType: 'sword', element: 'none', stats: { atk: 15, def: 3 }, visualType: 'sword', visualColor: 0xAABBCC },
    { id: 'eq_w011', name: '화염 단검', rarity: 'rare', type: 'weapon', subType: 'dagger', element: 'fire', stats: { atk: 12, spd: 5 }, visualType: 'dagger', visualColor: 0xFF4422, visualEffect: 'fire' },
    { id: 'eq_w012', name: '얼음 활', rarity: 'rare', type: 'weapon', subType: 'bow', element: 'ice', stats: { atk: 13, spd: 3 }, visualType: 'bow', visualColor: 0x44CCFF, visualEffect: 'ice' },
    { id: 'eq_w013', name: '번개 지팡이', rarity: 'rare', type: 'weapon', subType: 'staff', element: 'thunder', stats: { atk: 10, mp: 15 }, visualType: 'staff', visualColor: 0xFFDD00, visualEffect: 'thunder' },
    { id: 'eq_a010', name: '강철 갑옷', rarity: 'rare', type: 'armor', element: 'none', stats: { def: 15, hp: 30 }, visualType: 'plate', visualColor: 0xAABBCC },
    { id: 'eq_a011', name: '마법 로브', rarity: 'rare', type: 'armor', element: 'none', stats: { def: 8, mp: 25, atk: 5 }, visualType: 'robe', visualColor: 0x6644AA },
    { id: 'eq_h010', name: '강철 투구', rarity: 'rare', type: 'helmet', element: 'none', stats: { def: 8, hp: 15 }, visualType: 'helm', visualColor: 0xAABBCC },
    { id: 'eq_b010', name: '바람의 장화', rarity: 'rare', type: 'boots', element: 'grass', stats: { spd: 8, def: 3 }, visualType: 'boots', visualColor: 0x44AA44, visualEffect: 'wind' },

    // === Epic (9%) ===
    { id: 'eq_w020', name: '드래곤 슬레이어', rarity: 'epic', type: 'weapon', subType: 'sword', element: 'fire', stats: { atk: 35, def: 10, hp: 20 }, visualType: 'greatsword', visualColor: 0xFF4400, visualEffect: 'fire' },
    { id: 'eq_w021', name: '폭풍의 지팡이', rarity: 'epic', type: 'weapon', subType: 'staff', element: 'thunder', stats: { atk: 30, mp: 40, spd: 5 }, visualType: 'staff', visualColor: 0xFFDD00, visualEffect: 'thunder' },
    { id: 'eq_w022', name: '그림자 단검', rarity: 'epic', type: 'weapon', subType: 'dagger', element: 'dark', stats: { atk: 28, spd: 15, luk: 10 }, visualType: 'dagger', visualColor: 0x6622CC, visualEffect: 'dark' },
    { id: 'eq_w023', name: '빙하의 활', rarity: 'epic', type: 'weapon', subType: 'bow', element: 'ice', stats: { atk: 32, spd: 10 }, visualType: 'bow', visualColor: 0x44CCFF, visualEffect: 'ice' },
    { id: 'eq_a020', name: '미스릴 갑옷', rarity: 'epic', type: 'armor', element: 'none', stats: { def: 35, hp: 60, spd: 3 }, visualType: 'plate', visualColor: 0x88AADD, visualEffect: 'shine' },
    { id: 'eq_a021', name: '대마법사의 로브', rarity: 'epic', type: 'armor', element: 'light', stats: { def: 20, mp: 50, atk: 15 }, visualType: 'robe', visualColor: 0xFFDD44, visualEffect: 'light' },
    { id: 'eq_h020', name: '왕관', rarity: 'epic', type: 'helmet', element: 'light', stats: { def: 15, mp: 20, luk: 10 }, visualType: 'crown', visualColor: 0xFFDD00, visualEffect: 'light' },
    { id: 'eq_b020', name: '그림자 걸음', rarity: 'epic', type: 'boots', element: 'dark', stats: { spd: 20, def: 8, luk: 8 }, visualType: 'boots', visualColor: 0x553388, visualEffect: 'dark' },

    // === Legendary (3%) ===
    { id: 'eq_w030', name: '엑스칼리버', rarity: 'legendary', type: 'weapon', subType: 'sword', element: 'light', stats: { atk: 80, def: 20, hp: 50, mp: 30 }, visualType: 'holy_sword', visualColor: 0xFFDD44, visualEffect: 'holy' },
    { id: 'eq_w031', name: '아크메이지 스태프', rarity: 'legendary', type: 'weapon', subType: 'staff', element: 'thunder', stats: { atk: 70, mp: 80, spd: 10 }, visualType: 'staff', visualColor: 0xAA44FF, visualEffect: 'arcane' },
    { id: 'eq_w032', name: '사신의 낫', rarity: 'legendary', type: 'weapon', subType: 'scythe', element: 'dark', stats: { atk: 85, spd: 20, luk: 15 }, visualType: 'scythe', visualColor: 0x220044, visualEffect: 'death' },
    { id: 'eq_w033', name: '세계수의 활', rarity: 'legendary', type: 'weapon', subType: 'bow', element: 'grass', stats: { atk: 75, spd: 25, hp: 40 }, visualType: 'bow', visualColor: 0x22AA44, visualEffect: 'nature' },
    { id: 'eq_a030', name: '용제의 갑옷', rarity: 'legendary', type: 'armor', element: 'fire', stats: { def: 70, hp: 120, atk: 20 }, visualType: 'dragon_armor', visualColor: 0xFF4400, visualEffect: 'dragon' },
    { id: 'eq_a031', name: '성녀의 로브', rarity: 'legendary', type: 'armor', element: 'light', stats: { def: 40, mp: 100, hp: 80, luk: 20 }, visualType: 'holy_robe', visualColor: 0xFFEEDD, visualEffect: 'holy' },
  ],

  // =============================================================
  // 🐾 펫 가챠 풀
  // =============================================================
  PET: [
    // Common
    { id: 'pet_001', name: '아기 고양이', rarity: 'common', type: 'cat', element: 'none', stats: { luk: 3 }, skill: 'pet_cheer', visualColor: 0xFFAA44 },
    { id: 'pet_002', name: '아기 강아지', rarity: 'common', type: 'dog', element: 'none', stats: { def: 3 }, skill: 'pet_bite', visualColor: 0xBB8844 },
    { id: 'pet_003', name: '작은 새', rarity: 'common', type: 'bird', element: 'none', stats: { spd: 3 }, skill: 'pet_cheer', visualColor: 0x44AAFF },
    { id: 'pet_004', name: '슬라임', rarity: 'common', type: 'slime', element: 'water', stats: { hp: 5 }, skill: 'pet_heal_lick', visualColor: 0x44DD88 },

    // Rare
    { id: 'pet_010', name: '화염 고양이', rarity: 'rare', type: 'cat', element: 'fire', stats: { atk: 8, luk: 5 }, skill: 'pet_bite', visualColor: 0xFF4422, passive: 'atk_boost_3' },
    { id: 'pet_011', name: '얼음 늑대', rarity: 'rare', type: 'wolf', element: 'ice', stats: { atk: 10, spd: 5 }, skill: 'pet_bite', visualColor: 0x88DDFF, passive: 'slow_enemy' },
    { id: 'pet_012', name: '치유 토끼', rarity: 'rare', type: 'rabbit', element: 'light', stats: { hp: 10, luk: 8 }, skill: 'pet_heal_lick', visualColor: 0xFFDDEE, passive: 'heal_tick' },
    { id: 'pet_013', name: '번개 여우', rarity: 'rare', type: 'fox', element: 'thunder', stats: { spd: 12, luk: 5 }, skill: 'pet_bite', visualColor: 0xFFDD00, passive: 'spd_boost_5' },

    // Epic
    { id: 'pet_020', name: '아기 드래곤', rarity: 'epic', type: 'dragon', element: 'fire', stats: { atk: 20, def: 10, hp: 15 }, skill: 'pet_bite', visualColor: 0xFF2200, passive: 'burn_enemy' },
    { id: 'pet_021', name: '정령 여우', rarity: 'epic', type: 'fox', element: 'grass', stats: { mp: 20, luk: 15, spd: 10 }, skill: 'pet_heal_lick', visualColor: 0x44FF88, passive: 'mp_regen' },
    { id: 'pet_022', name: '그림자 고양이', rarity: 'epic', type: 'cat', element: 'dark', stats: { atk: 18, spd: 15, luk: 12 }, skill: 'pet_bite', visualColor: 0x442266, passive: 'crit_boost_10' },

    // Legendary
    { id: 'pet_030', name: '성수 유니콘', rarity: 'legendary', type: 'unicorn', element: 'light', stats: { hp: 30, mp: 30, def: 20, luk: 25 }, skill: 'pet_heal_lick', visualColor: 0xFFDDFF, passive: 'party_heal_5', visualEffect: 'holy' },
    { id: 'pet_031', name: '고대 드래곤', rarity: 'legendary', type: 'dragon', element: 'fire', stats: { atk: 40, def: 25, hp: 30 }, skill: 'pet_bite', visualColor: 0xDD0000, passive: 'dragon_breath', visualEffect: 'dragon' },
    { id: 'pet_032', name: '구미호', rarity: 'legendary', type: 'fox', element: 'dark', stats: { atk: 35, spd: 30, luk: 25 }, skill: 'pet_bite', visualColor: 0xAA22FF, passive: 'nine_tails', visualEffect: 'dark' },
    { id: 'pet_033', name: '피닉스', rarity: 'legendary', type: 'bird', element: 'fire', stats: { atk: 30, hp: 40, mp: 20 }, skill: 'pet_heal_lick', visualColor: 0xFF8800, passive: 'revive_once', visualEffect: 'fire' },
  ],

  // =============================================================
  // 🎲 마블 보너스 가챠 풀
  // =============================================================
  MARBLE: [
    // Common
    { id: 'mb_001', name: '골드 주머니 (소)', rarity: 'common', type: 'gold', value: 500, icon: '💰' },
    { id: 'mb_002', name: '경험치 물약 (소)', rarity: 'common', type: 'exp', value: 200, icon: '📗' },
    { id: 'mb_003', name: '체력 물약', rarity: 'common', type: 'potion_hp', value: 3, icon: '❤️' },
    { id: 'mb_004', name: '마나 물약', rarity: 'common', type: 'potion_mp', value: 3, icon: '💙' },

    // Rare
    { id: 'mb_010', name: '골드 주머니 (중)', rarity: 'rare', type: 'gold', value: 2000, icon: '💰' },
    { id: 'mb_011', name: '경험치 물약 (중)', rarity: 'rare', type: 'exp', value: 800, icon: '📘' },
    { id: 'mb_012', name: '정령 조각 x10', rarity: 'rare', type: 'spirit_fragment', value: 10, icon: '🔮' },
    { id: 'mb_013', name: '강화석', rarity: 'rare', type: 'enhance_stone', value: 5, icon: '💎' },

    // Epic
    { id: 'mb_020', name: '골드 보따리', rarity: 'epic', type: 'gold', value: 10000, icon: '💰' },
    { id: 'mb_021', name: '정령 조각 x50', rarity: 'epic', type: 'spirit_fragment', value: 50, icon: '🔮' },
    { id: 'mb_022', name: '다이아 x50', rarity: 'epic', type: 'diamond', value: 50, icon: '💎' },
    { id: 'mb_023', name: '스킬 초기화 주문서', rarity: 'epic', type: 'skill_reset', value: 1, icon: '📜' },

    // Legendary
    { id: 'mb_030', name: '다이아 x300', rarity: 'legendary', type: 'diamond', value: 300, icon: '💎' },
    { id: 'mb_031', name: '레전더리 선택권', rarity: 'legendary', type: 'legendary_ticket', value: 1, icon: '🎫' },
    { id: 'mb_032', name: '정령 조각 x200', rarity: 'legendary', type: 'spirit_fragment', value: 200, icon: '🔮' },
  ],

  // =============================================================
  // 🔍 풀 조회
  // =============================================================
  getPool(gachaType) {
    switch (gachaType) {
      case 'equipment': return this.EQUIPMENT;
      case 'pet':       return this.PET;
      case 'marble':    return this.MARBLE;
      default:          return this.EQUIPMENT;
    }
  },

  getItemById(itemId) {
    const allItems = [...this.EQUIPMENT, ...this.PET, ...this.MARBLE];
    return allItems.find(item => item.id === itemId) || null;
  },

  getItemsByRarity(gachaType, rarity) {
    return this.getPool(gachaType).filter(item => item.rarity === rarity);
  },

  // 조각 상점: 100조각 = 원하는 Legendary 선택
  FRAGMENT_COST: {
    legendary: 100,
    epic: 40,
    rare: 15
  },

  getSelectableItems(rarity, gachaType) {
    return this.getPool(gachaType).filter(item => item.rarity === rarity);
  },

  connectToEngine() {
    console.log(`[RewardPool] 보상 풀 로드 완료 ✅`);
    console.log(`  장비: ${this.EQUIPMENT.length}종, 펫: ${this.PET.length}종, 마블: ${this.MARBLE.length}종`);
  }
};

if (typeof window !== 'undefined') window.RewardPool = RewardPool;
if (typeof module !== 'undefined') module.exports = RewardPool;
