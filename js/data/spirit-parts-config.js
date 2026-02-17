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
  // 소환에 필요한 파츠 수: 6개 부위 각 1개씩
  requiredParts: 6,
  requiredPartKeys: ['head', 'body', 'arms', 'wings', 'legs', 'shoes'],

  // 등급 제한: 없음! 다른 등급 파츠를 섞어도 소환 가능
  // 예: common 머리 + epic 몸통 + rare 날개 + ... → 소환 OK
  rarityRestriction: false,

  // 부위별 구분: 반드시 6부위 모두 다른 부위여야 함
  partDistinctRequired: true,

  // 같은 정령의 파츠만 모아야 하는가?
  // false: 아무 정령의 파츠나 섞어서 소환 가능 (결과는 랜덤)
  // true: 같은 spiritKey의 파츠만 모아야 함
  sameSpiritRequired: false,

  // 소환 결과 결정 규칙
  resultDetermination: {
    // 사용된 파츠 중 가장 높은 등급 기준으로 소환 결과 등급 결정
    method: 'highest_rarity',
    // 같은 정령 파츠가 많을수록 해당 정령 소환 확률 증가
    sameSpiritBonus: true,
    sameSpiritBonusPercent: 20,  // 같은 정령 파츠 1개당 +20% 가중치
  },

  // 소환 후 사용된 파츠 제거, 미사용 파츠는 인벤토리에 잔류
  consumeUsedParts: true,
  keepUnusedParts: true,
};


// --- 자동 매칭 알고리즘 ---
// 소환의 나무에서 소환 아이콘 클릭 시 자동으로 최적 조합을 찾아 매칭
// 등급 상관없이 부위만 맞추면 됨
// 우선순위: 같은 정령의 파츠를 우선 매칭 → 없으면 아무 파츠로 채움

export function autoMatchParts(spiritItems) {
  // spiritItems: GameState.spiritItems 배열
  // 각 아이템: { spiritKey, part, rarity, emoji, name, ... }

  // 1. 부위별로 분류
  const byPart = {};
  for (const key of PART_KEYS) {
    byPart[key] = spiritItems.filter(item => item.part === key);
  }

  // 2. 모든 부위가 최소 1개씩 있는지 확인
  const canSummon = PART_KEYS.every(key => byPart[key].length > 0);
  if (!canSummon) {
    const missing = PART_KEYS.filter(key => byPart[key].length === 0);
    return {
      success: false,
      missing,
      message: `부족한 파츠: ${missing.map(k => SPIRIT_PARTS.find(p => p.key === k)?.name).join(', ')}`,
    };
  }

  // 3. 같은 정령 파츠 우선 매칭 시도
  // 각 정령별로 가지고 있는 부위를 카운트
  const spiritPartCounts = {};
  for (const item of spiritItems) {
    if (!spiritPartCounts[item.spiritKey]) spiritPartCounts[item.spiritKey] = new Set();
    spiritPartCounts[item.spiritKey].add(item.part);
  }

  // 가장 많은 부위를 가진 정령을 우선 타겟
  let bestSpiritKey = null;
  let bestCount = 0;
  for (const [key, parts] of Object.entries(spiritPartCounts)) {
    if (parts.size > bestCount) {
      bestCount = parts.size;
      bestSpiritKey = key;
    }
  }

  // 4. 매칭 구성: 우선 bestSpiritKey의 파츠 사용, 부족분은 아무 파츠로 채움
  const selected = [];
  const usedIds = new Set();

  for (const partKey of PART_KEYS) {
    // 우선: 같은 정령 파츠
    let pick = byPart[partKey].find(item => item.spiritKey === bestSpiritKey && !usedIds.has(item.id));
    if (!pick) {
      // 없으면: 아무 파츠 (등급 높은 것 우선)
      const rarityOrder = ['legendary', 'epic', 'magic', 'rare', 'common'];
      const sorted = [...byPart[partKey]]
        .filter(item => !usedIds.has(item.id))
        .sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
      pick = sorted[0];
    }
    if (!pick) {
      return { success: false, missing: [partKey], message: '파츠 매칭 실패' };
    }
    selected.push(pick);
    usedIds.add(pick.id);
  }

  return {
    success: true,
    selectedParts: selected,
    targetSpiritKey: bestSpiritKey,
    usedIds: [...usedIds],
  };
}


// --- 소환 결과 결정 ---
export function determineSummonResult(selectedParts, allSpirits) {
  // selectedParts: 6개의 선택된 파츠 배열

  // 가장 높은 등급 찾기
  const rarityOrder = ['common', 'rare', 'magic', 'epic', 'legendary'];
  let highestRarityIdx = 0;
  for (const part of selectedParts) {
    const idx = rarityOrder.indexOf(part.rarity);
    if (idx > highestRarityIdx) highestRarityIdx = idx;
  }
  const resultRarity = rarityOrder[highestRarityIdx];

  // 같은 정령 파츠 카운트 → 해당 정령 가중치 증가
  const spiritCounts = {};
  for (const part of selectedParts) {
    spiritCounts[part.spiritKey] = (spiritCounts[part.spiritKey] || 0) + 1;
  }

  // 해당 등급 정령 풀에서 가중치 기반 선택
  const spiritsOfRarity = allSpirits.filter(s => s.rarity === resultRarity);
  if (spiritsOfRarity.length === 0) {
    // 해당 등급 정령 없으면 한 단계 아래로
    const fallbackIdx = Math.max(0, highestRarityIdx - 1);
    const fallbackRarity = rarityOrder[fallbackIdx];
    const fallbackSpirits = allSpirits.filter(s => s.rarity === fallbackRarity);
    return fallbackSpirits[Math.floor(Math.random() * fallbackSpirits.length)];
  }

  // 가중치 계산
  const weights = spiritsOfRarity.map(s => {
    const baseWeight = 10;
    const bonus = (spiritCounts[s.key] || 0) * SUMMON_RULES.resultDetermination.sameSpiritBonusPercent / 100 * baseWeight;
    return { spirit: s, weight: baseWeight + bonus };
  });

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) return w.spirit;
  }

  return spiritsOfRarity[0];
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
