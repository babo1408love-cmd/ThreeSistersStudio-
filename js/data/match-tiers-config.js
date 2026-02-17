// ====================================================
// 매치 단계별 특수 타일 & 능력 & 연출 시스템
// 3매치부터 10+매치까지 10단계
// ※ 매치 성공 시마다 정령 파츠 드랍 → 인벤토리 이동
// ====================================================

// --- 매치 단계 정의 (3~10+) ---
export const MATCH_TIERS = [
  {
    tier: 1,
    matchCount: 3,
    name: '기본 매치',
    emoji: '✨',
    color: '#86efac',
    // 기본 제거 (특수 능력 없음)
    ability: null,
    // 점수 배율
    scoreMultiplier: 1.0,
    // 정령 파츠 드랍 확률 (%)
    spiritDropChance: 30,
    // 연출
    animation: {
      type: 'sparkle',
      duration: 400,
      particles: 3,
      particleEmojis: ['✨'],
    },
  },
  {
    tier: 2,
    matchCount: 4,
    name: '라인 클리어',
    emoji: '💫',
    color: '#67e8f9',
    // 4매치: 특수 타일 생성 (가로/세로 라인 클리어)
    ability: {
      type: 'line_clear',
      description: '한 줄 전체를 제거하는 특수 타일 생성',
      createSpecialTile: true,
      specialTileEmoji: '💫',
      specialTileType: 'line_bomb',
      // 발동 시: 해당 타일의 가로 또는 세로 한 줄 전체 제거
      triggerEffect: 'clear_line',
    },
    scoreMultiplier: 1.5,
    spiritDropChance: 50,
    animation: {
      type: 'line_flash',
      duration: 500,
      particles: 5,
      particleEmojis: ['💫', '⭐'],
      screenEffect: 'subtle_shake',
    },
  },
  {
    tier: 3,
    matchCount: 5,
    name: '폭탄 생성',
    emoji: '💣',
    color: '#fbbf24',
    // 5매치: 폭탄 타일 생성 (3×3 범위 폭발)
    ability: {
      type: 'bomb',
      description: '주변 3×3 범위를 폭발시키는 폭탄 타일 생성',
      createSpecialTile: true,
      specialTileEmoji: '💣',
      specialTileType: 'area_bomb',
      triggerEffect: 'explode_3x3',
      radius: 1,
    },
    scoreMultiplier: 2.0,
    spiritDropChance: 70,
    animation: {
      type: 'explosion_burst',
      duration: 600,
      particles: 8,
      particleEmojis: ['💣', '💥', '🔥'],
      screenEffect: 'shake',
    },
  },
  {
    tier: 4,
    matchCount: 6,
    name: '번개 폭풍',
    emoji: '⚡',
    color: '#a78bfa',
    // 6매치: 번개 타일 (랜덤 5개 타일 추가 제거)
    ability: {
      type: 'lightning',
      description: '번개가 랜덤 타일 5개를 추가로 제거',
      createSpecialTile: true,
      specialTileEmoji: '⚡',
      specialTileType: 'lightning',
      triggerEffect: 'random_clear',
      extraClearCount: 5,
    },
    scoreMultiplier: 2.5,
    spiritDropChance: 85,
    animation: {
      type: 'lightning_chain',
      duration: 700,
      particles: 10,
      particleEmojis: ['⚡', '💜', '✨'],
      screenEffect: 'flash_shake',
    },
  },
  {
    tier: 5,
    matchCount: 7,
    name: '무지개 폭발',
    emoji: '🌈',
    color: '#f472b6',
    // 7매치: 무지개 타일 (같은 종류 젬 전체 제거)
    ability: {
      type: 'rainbow',
      description: '보드 위 같은 종류 젬을 모두 제거하는 무지개 타일 생성',
      createSpecialTile: true,
      specialTileEmoji: '🌈',
      specialTileType: 'rainbow',
      triggerEffect: 'clear_same_gem',
    },
    scoreMultiplier: 3.0,
    spiritDropChance: 100,
    animation: {
      type: 'rainbow_wave',
      duration: 800,
      particles: 12,
      particleEmojis: ['🌈', '❤️', '💛', '💚', '💙', '💜'],
      screenEffect: 'rainbow_flash',
    },
  },
  {
    tier: 6,
    matchCount: 8,
    name: '십자 폭발',
    emoji: '✝️',
    color: '#fb923c',
    // 8매치: 십자 타일 (가로+세로 동시 라인 클리어)
    ability: {
      type: 'cross',
      description: '가로+세로 십자 방향 전체를 제거하는 특수 타일 생성',
      createSpecialTile: true,
      specialTileEmoji: '✝️',
      specialTileType: 'cross_bomb',
      triggerEffect: 'clear_cross',
    },
    scoreMultiplier: 4.0,
    spiritDropChance: 100,
    spiritDropBonus: 1,           // 추가 파츠 +1
    animation: {
      type: 'cross_explosion',
      duration: 900,
      particles: 16,
      particleEmojis: ['✝️', '💥', '⭐', '✨'],
      screenEffect: 'heavy_shake',
    },
  },
  {
    tier: 7,
    matchCount: 9,
    name: '메가 폭탄',
    emoji: '🌟',
    color: '#ef4444',
    // 9매치: 메가 폭탄 (5×5 범위 폭발)
    ability: {
      type: 'mega_bomb',
      description: '주변 5×5 범위를 폭발시키는 메가 폭탄 생성',
      createSpecialTile: true,
      specialTileEmoji: '🌟',
      specialTileType: 'mega_bomb',
      triggerEffect: 'explode_5x5',
      radius: 2,
    },
    scoreMultiplier: 5.0,
    spiritDropChance: 100,
    spiritDropBonus: 2,
    animation: {
      type: 'mega_explosion',
      duration: 1000,
      particles: 20,
      particleEmojis: ['🌟', '💥', '🔥', '⭐', '✨'],
      screenEffect: 'mega_shake',
    },
  },
  {
    tier: 8,
    matchCount: 10,
    name: '정화의 빛',
    emoji: '👼',
    color: '#fbbf24',
    // 10+매치: 정화 폭발 (보드 전체 75% 제거 + 대량 보상)
    ability: {
      type: 'purify',
      description: '정화의 빛! 보드 전체의 75%를 제거하고 대량의 정령 파츠 획득',
      createSpecialTile: false,
      triggerEffect: 'clear_board_75',
      clearPercent: 0.75,
    },
    scoreMultiplier: 8.0,
    spiritDropChance: 100,
    spiritDropBonus: 3,           // 추가 파츠 +3
    animation: {
      type: 'purify_wave',
      duration: 1200,
      particles: 30,
      particleEmojis: ['👼', '✨', '💫', '⭐', '🌈', '💚'],
      screenEffect: 'purify_flash',
    },
  },
];


// --- 매치 시 정령 파츠 드랍 설정 ---
export const MATCH_SPIRIT_DROP = {
  enabled: true,

  // 기본 드랍: 매치 성공 시마다 확률 체크
  // tier별 spiritDropChance 사용
  // 최소 3매치부터 드랍 가능

  // 등급별 드랍 가중치 (매치 단계가 높을수록 높은 등급)
  rarityWeightsByTier: {
    // tier 1~3: 주로 common/rare
    low: { common: 60, rare: 30, magic: 8, epic: 2, legendary: 0 },
    // tier 4~6: magic 확률 증가
    mid: { common: 30, rare: 35, magic: 25, epic: 8, legendary: 2 },
    // tier 7~8: epic/legendary 확률 증가
    high: { common: 10, rare: 20, magic: 30, epic: 28, legendary: 12 },
  },

  // tier → 등급 테이블 매핑
  tierToRarityTable: {
    1: 'low', 2: 'low', 3: 'low',
    4: 'mid', 5: 'mid', 6: 'mid',
    7: 'high', 8: 'high',
  },

  // 드랍 연출
  dropAnimation: {
    // 매치된 위치에서 파츠 이모지가 떠오른 후 인벤토리로 이동
    floatUpDuration: 400,          // ms — 위로 떠오르기
    floatUpHeight: 40,             // px
    flyToInventoryDuration: 600,   // ms — 인벤토리로 날아가기
    delayBetweenDrops: 200,        // ms — 드랍 간 딜레이
  },
};


// --- 특수 타일 시스템 ---
export const SPECIAL_TILE_SYSTEM = {
  // 특수 타일은 보드에 배치되어 다음 매치 시 능력 발동
  // 보드 값: 100 + gemIdx * 10 + typeIdx
  // typeIdx: 0=가로라인, 1=세로라인, 2=범위, 3=번개, 4=무지개, 5=십자, 6=메가
  boardValueOffset: 100,

  // 특수 타일 목록 (typeIdx 순서대로)
  tiles: {
    h_line_bomb: { typeIdx: 0, emoji: '➡️', name: '가로 라인' },
    v_line_bomb: { typeIdx: 1, emoji: '⬇️', name: '세로 라인' },
    area_bomb:   { typeIdx: 2, emoji: '💣', name: '범위 폭탄' },
    lightning:   { typeIdx: 3, emoji: '⚡', name: '번개' },
    rainbow:     { typeIdx: 4, emoji: '🌈', name: '무지개' },
    cross_bomb:  { typeIdx: 5, emoji: '✝️', name: '십자 폭탄' },
    mega_bomb:   { typeIdx: 6, emoji: '🌟', name: '메가 폭탄' },
  },

  // 특수 타일 생성 위치: 매치된 그룹의 중앙
  placementRule: 'center_of_match',

  // 특수 타일 활성화: 매치에 포함되거나 인접할 때
  activationRule: 'on_match_or_adjacent',
};


// --- 매치 단계 판정 함수 ---
export function getMatchTier(matchCount) {
  // 10 이상은 tier 8 (정화의 빛)
  const clamped = Math.min(matchCount, 10);
  const tier = MATCH_TIERS.find(t => t.matchCount === clamped);
  if (tier) return tier;
  // 3 미만은 매치 아님
  if (matchCount < 3) return null;
  // 기본: 가장 높은 tier
  return MATCH_TIERS[MATCH_TIERS.length - 1];
}

// --- 매치 티어로 정령 등급 가중치 얻기 ---
export function getSpiritRarityWeights(tier) {
  const tableKey = MATCH_SPIRIT_DROP.tierToRarityTable[tier] || 'low';
  return MATCH_SPIRIT_DROP.rarityWeightsByTier[tableKey];
}

// --- 가중치 기반 등급 롤 ---
export function rollSpiritRarityByTier(tierNum) {
  const weights = getSpiritRarityWeights(tierNum);
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}
