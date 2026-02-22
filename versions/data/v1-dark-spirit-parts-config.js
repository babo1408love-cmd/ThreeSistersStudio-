// ====================================================
// 정령 소환 파츠 시스템 (Spirit Summoning Parts System)
// 정령 아이템은 6개 부위로 나뉘며, 각 부위를 모아 소환
// ====================================================

// --- 6 부위 정의 ---
export const SPIRIT_PARTS = [
  { key: 'head',    name: '머리',   emoji: '👑', description: '정령의 의지가 깃든 머리 파츠' },
  { key: 'body',    name: '몸통',   emoji: '💠', description: '정령의 힘이 담긴 몸통 파츠' },
  { key: 'arms',    name: '팔',     emoji: '🦾', description: '정령의 공격 능력이 담긴 팔 파츠' },
  { key: 'wings',   name: '날개',   emoji: '🪽', description: '정령의 비행 능력이 담긴 날개 파츠' },
  { key: 'legs',    name: '다리',   emoji: '🦿', description: '정령의 이동 능력이 담긴 다리 파츠' },
  { key: 'shoes',   name: '신발',   emoji: '👟', description: '정령의 속도가 깃든 신발 파츠' },
];

export const PART_KEYS = SPIRIT_PARTS.map(p => p.key);

// --- 파츠 드랍 규칙 ---
// 모든 정령 아이템은 spiritKey + part + rarity 조합으로 구성
// 예: { spiritKey: 'fairy', part: 'head', rarity: 'common', emoji: '🧚', name: '빛의 요정 머리' }
export const PART_DROP_CONFIG = {
  // 드랍 시 부위는 균등 랜덤
  partWeights: {
    head: 1,
    body: 1,
    arms: 1,
    wings: 1,
    legs: 1,
    shoes: 1,
  },
};

// --- 정령 소환 규칙 ---
export const SUMMON_RULES = {
  // 소환에 필요한 조각 수: 부위 상관없이 6개
  requiredFragments: 6,

  // 부위 구분 없음! 아무 조각 6개면 소환 가능
  partDistinctRequired: false,

  // 소환 결과: rollSummonRarity()로 등급 결정 (커먼45%/레어30%/에픽25%)
  // 레전드/신화는 절대 안 나옴 (rarity-manager.js 참조)
  resultDetermination: {
    method: 'random_rarity',
  },

  // 소환 후 사용된 조각 6개 제거
  consumeUsedParts: true,
  keepUnusedParts: true,
};


// --- 자동 매칭 알고리즘 ---
// 부위 상관없이 조각 6개만 있으면 소환 가능!
// 일반 조각만 사용 (레전드 조각은 펫 진화용이므로 제외)

export function autoMatchParts(spiritItems) {
  // spiritItems: GameState.spiritItems 배열
  // 일반 조각만 필터 (레전드 조각은 펫 진화용)
  const normalFragments = spiritItems.filter(item => item.rarity !== 'legendary');
  const required = SUMMON_RULES.requiredFragments;

  if (normalFragments.length < required) {
    return {
      success: false,
      missing: [],
      collected: normalFragments.length,
      required,
      message: `조각 ${normalFragments.length}/${required}개 — ${required - normalFragments.length}개 더 필요`,
    };
  }

  // 아무 조각 6개 선택 (먼저 들어온 순서)
  const selected = normalFragments.slice(0, required);
  const usedIds = selected.map(item => item.id);

  return {
    success: true,
    selectedParts: selected,
    targetSpiritKey: null,
    usedIds,
  };
}

// 레전드 조각 수 카운트
export function countLegendFragments(spiritItems) {
  return spiritItems.filter(item => item.rarity === 'legendary').length;
}


// --- 소환 결과 결정 ---
// rollSummonRarity()로 등급 결정 (커먼45%/레어30%/에픽25%)
// 레전드/신화는 절대 안 나옴!
import { rollSummonRarity, getRarityInfo, getRarityStats } from '../systems/rarity-manager.js';

export function determineSummonResult(selectedParts, allSpirits) {
  // 등급 랜덤 결정
  const rarityId = rollSummonRarity(); // 1=커먼, 2=레어, 3=에픽
  const rarityInfo = getRarityInfo(rarityId);

  // 등급 이름을 기존 시스템의 rarity 문자열로 변환
  const rarityNameMap = { 1: 'common', 2: 'rare', 3: 'epic' };
  const resultRarity = rarityNameMap[rarityId] || 'common';

  // 해당 등급 정령 풀에서 랜덤 선택
  let pool = allSpirits.filter(s => s.rarity === resultRarity);
  if (pool.length === 0) {
    // 해당 등급 정령 없으면 아무거나 (common 풀백)
    pool = allSpirits.filter(s => s.rarity === 'common');
    if (pool.length === 0) pool = allSpirits;
  }

  const spirit = pool[Math.floor(Math.random() * pool.length)];

  // 등급별 스탯 적용
  const stats = getRarityStats(rarityId);

  return {
    ...spirit,
    rarityId,
    rarityLabel: `${rarityInfo.emoji} ${rarityInfo.name} (${rarityInfo.stars})`,
    defense: stats.defense,
    spiritAtk: stats.atk,
    spiritAtkSpeed: stats.atkSpeed,
    spiritMoveSpeed: stats.moveSpeed,
    hasSkill: stats.hasSkill,
  };
}


// --- 정령 파츠 아이템 생성 헬퍼 ---
export function createSpiritPartItem(spiritKey, spiritName, spiritEmoji, rarity) {
  // 랜덤 부위 선택
  const partKeys = Object.keys(PART_DROP_CONFIG.partWeights);
  const totalWeight = Object.values(PART_DROP_CONFIG.partWeights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * totalWeight;
  let selectedPart = partKeys[0];
  for (const key of partKeys) {
    roll -= PART_DROP_CONFIG.partWeights[key];
    if (roll <= 0) { selectedPart = key; break; }
  }

  const partDef = SPIRIT_PARTS.find(p => p.key === selectedPart);

  return {
    id: Date.now() + Math.random(),
    name: `${spiritName} ${partDef.name}`,
    emoji: spiritEmoji,
    partEmoji: partDef.emoji,
    type: 'spirit_part',
    part: selectedPart,
    rarity: rarity,
    spiritKey: spiritKey,
  };
}
