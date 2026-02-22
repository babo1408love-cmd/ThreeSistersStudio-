// ====================================================
// 황금 미믹 (Golden Mimic) 시스템
// 마블 보드 + 횡스크롤 서바이벌 양쪽에 등장하는 보너스 이벤트
// ====================================================

export const GOLDEN_MIMIC = {
  // 기본 정보
  name: '황금 미믹',
  emoji: '👑',                    // 황금빛 상자 형태
  altEmoji: '📦',                 // 닫힌 상태
  openEmoji: '✨',                // 열린 상태
  description: '황금빛으로 빛나는 신비한 미믹. 엄청난 보물을 숨기고 있다!',

  // --- 비주얼 연출 ---
  visual: {
    glow: 'rgba(251, 191, 36, 0.6)',
    sparkle: true,                // 반짝이는 파티클 효과
    pulseSpeed: 0.8,              // 초 단위 반짝 속도 (빠르게)
    trailColor: '#fbbf24',
    aura: 'rgba(255, 215, 0, 0.3)',
    // 등장 연출
    spawnAnimation: 'golden_burst', // 황금빛 폭발과 함께 등장
    spawnSoundEffect: 'mimic_appear',
  },


  // ====================================================
  // 마블 보드 등장 설정
  // ====================================================
  marble: {
    // 등장 확률: 마블 타일 생성 시 확률 (전체 타일 수 대비)
    spawnChance: 0.04,            // 4% — 마블 경로 약 36칸 중 평균 1.4개
    // 최소 1개 보장 여부
    guaranteeOne: true,
    // 최대 동시 등장 수
    maxCount: 2,

    // --- 근처 도착 이벤트 ---
    // 영웅이 미믹 2칸 이내에 도착하면 이벤트 발동
    triggerDistance: 2,            // 칸 단위
    eventType: 'forced_dice',     // 강제 주사위 1회 추가
    // 주사위 이벤트 연출
    diceEvent: {
      message: '👑 황금 미믹 발견! 보너스 주사위를 굴려 미믹에게 도달하세요!',
      diceCount: 1,               // 주사위 1개 추가
      // 미믹 타일에 정확히 도착하면 보상
      exactLanding: false,        // 정확히 안 맞아도 미믹을 지나치면 획득
      passThrough: true,          // 지나가기만 해도 획득
    },

    // --- 미믹 보상 (마블) ---
    rewards: {
      gold: { min: 100, max: 300 },
      // 높은 등급 아이템 보장
      guaranteedItem: {
        minRarity: 'rare',        // 최소 레어 이상
        rarityWeights: {
          rare: 40,
          magic: 30,
          epic: 20,
          legendary: 10,
        },
      },
      // 정령 파츠 보너스
      spiritParts: { min: 1, max: 3 },
      // 추가 보너스 점수
      bonusScore: 200,
    },
  },


  // ====================================================
  // 횡스크롤 서바이벌(스테이지2) 등장 설정
  // ====================================================
  combat: {
    // 등장 조건: 웨이브 진행 중 적 요정 대신 랜덤 등장
    replaceEnemyChance: 0.03,     // 3% — 적 1기 스폰 시 미믹으로 교체될 확률
    // 최소 등장 보장: 3웨이브 이후 한번도 안 나왔으면 다음 웨이브에 강제 출현
    guaranteeAfterWave: 3,
    // 동시 최대 등장
    maxConcurrent: 1,

    // --- 전투 행동 ---
    behavior: {
      // 미믹은 공격하지 않음! 도망만 침
      aggressive: false,
      fleeSpeed: 4,               // 플레이어보다 빠르게 도망
      hp: 80,                     // 처치 가능 HP
      // 일정 시간 후 도망 (사라짐)
      fleeDuration: 8000,         // 8초 후 도주
      fleeWarning: 3000,          // 도주 3초 전 깜빡임 경고
    },

    // --- 처치 보상 (전투) ---
    rewards: {
      gold: { min: 200, max: 500 },
      guaranteedItem: {
        minRarity: 'magic',       // 최소 매직 이상
        rarityWeights: {
          magic: 30,
          epic: 40,
          legendary: 30,
        },
      },
      spiritParts: { min: 2, max: 4 },
      // 분노 게이지 보너스
      rageBonus: 30,              // +30% 분노 즉시 충전
      // 전체 아군 회복
      healAllPercent: 0.2,        // 전체 아군 HP 20% 회복
    },
  },


  // ====================================================
  // 보상 생성 함수 참조 규칙
  // ====================================================
  rewardGeneration: {
    // 금화: min~max 사이 랜덤
    // 아이템: guaranteedItem.rarityWeights 가중치로 등급 결정 후 해당 등급 아이템 랜덤
    // 정령 파츠: min~max 개수, 파츠 부위는 랜덤, 등급은 일반 드랍률 사용
    // 획득 연출: 황금빛 폭발 → 아이템들이 인벤토리로 빨려감
    collectAnimation: 'golden_burst_collect',
    collectDuration: 1500,        // ms
  },
};


// --- 황금 미믹 보상 생성 함수 ---
export function generateMimicReward(context = 'marble') {
  const config = context === 'combat' ? GOLDEN_MIMIC.combat.rewards : GOLDEN_MIMIC.marble.rewards;
  const rewards = [];

  // 1. 금화
  const goldAmount = config.gold.min + Math.floor(Math.random() * (config.gold.max - config.gold.min + 1));
  rewards.push({
    type: 'gold',
    emoji: '💰',
    name: `금화 ×${goldAmount}`,
    value: goldAmount,
  });

  // 2. 보장 아이템 (등급 가중치 기반)
  const itemConfig = config.guaranteedItem;
  const weights = itemConfig.rarityWeights;
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * totalWeight;
  let itemRarity = itemConfig.minRarity;
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) { itemRarity = rarity; break; }
  }
  rewards.push({
    type: 'equipment',
    rarity: itemRarity,
    // 실제 아이템은 items.js에서 해당 등급으로 랜덤 선택 (호출측에서 처리)
  });

  // 3. 정령 파츠
  const partCount = config.spiritParts.min +
    Math.floor(Math.random() * (config.spiritParts.max - config.spiritParts.min + 1));
  for (let i = 0; i < partCount; i++) {
    rewards.push({ type: 'spirit_part' });
    // 실제 파츠 생성은 호출측에서 createSpiritPartItem() 사용
  }

  // 4. 전투 전용 보너스
  if (context === 'combat') {
    if (config.rageBonus) {
      rewards.push({ type: 'rage_bonus', value: config.rageBonus });
    }
    if (config.healAllPercent) {
      rewards.push({ type: 'heal_all', value: config.healAllPercent });
    }
  }

  // 5. 보너스 점수 (마블 전용)
  if (context === 'marble' && config.bonusScore) {
    rewards.push({ type: 'score', value: config.bonusScore, emoji: '⭐' });
  }

  return rewards;
}
