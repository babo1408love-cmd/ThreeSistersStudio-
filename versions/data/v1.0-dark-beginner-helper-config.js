// 세계의 어머니 — 초보자 도우미 시스템
// 가이아 NPC가 첫 3일간 + 스테이지 2까지 동행하며 플레이를 도와줌

export const MOTHER_OF_WORLD = {
  name: '가이아',
  title: '세계의 어머니',
  emoji: '🌍',
  rarity: 'legendary',
  attribute: 'nature',

  // 활성 조건
  activation: {
    maxDays: 3,          // 첫 플레이 후 3일
    maxStage: 2,         // 스테이지 2까지
  },

  // 젬 편향: 특정 젬 인덱스를 40% 확률로 선택
  gemBias: {
    enabled: true,
    biasRate: 0.40,      // 40% 확률로 편향 젬
    biasGemIndex: 0,     // GEMS[0] = '🧚' (요정 젬)
  },

  // 클리어 조건 변경: 점수 → 타일 파괴 수
  clearCondition: {
    type: 'tiles_destroyed',
    targets: {
      1: 60,   // 스테이지 1: 타일 60개 파괴
      2: 80,   // 스테이지 2: 타일 80개 파괴
    },
    defaultTarget: 100,
  },

  // 보너스
  bonuses: {
    extraMoves: 10,            // 이동 횟수 +10
    spiritDropBonus: 0.30,     // 파츠 드랍 확률 +30%
  },

  // 대사
  dialogues: {
    greeting: '안녕, 작은 요정아! 내가 도와줄게 🌍',
    matchHint: '같은 모양을 3개 이상 모아봐!',
    bigMatch: '대단해! 큰 매치를 만들었구나!',
    spiritDrop: '정령 파츠를 얻었어! 모아서 소환하자!',
    almostClear: '거의 다 됐어! 조금만 더!',
    cleared: '잘했어! 정말 대단한 요정이야!',
    farewell: '이제 너 혼자서도 충분해. 항상 응원할게! 🌍💚',
  },
};

// 도우미 활성 여부 체크
export function isHelperActive(gameState) {
  if (gameState.helperDismissed) return false;
  if (!gameState.firstPlayDate) return false;

  const now = Date.now();
  const elapsed = now - gameState.firstPlayDate;
  const maxMs = MOTHER_OF_WORLD.activation.maxDays * 24 * 60 * 60 * 1000;
  if (elapsed > maxMs) return false;

  if (gameState.currentStage > MOTHER_OF_WORLD.activation.maxStage) return false;
  return true;
}

// 편향 젬 인덱스 생성
export function biasedGemIndex(gemsLength) {
  const cfg = MOTHER_OF_WORLD.gemBias;
  if (Math.random() < cfg.biasRate) {
    return cfg.biasGemIndex;
  }
  return Math.floor(Math.random() * gemsLength);
}

// 타일 파괴 목표 수
export function getTileTarget(stageId) {
  return MOTHER_OF_WORLD.clearCondition.targets[stageId]
    || MOTHER_OF_WORLD.clearCondition.defaultTarget;
}
