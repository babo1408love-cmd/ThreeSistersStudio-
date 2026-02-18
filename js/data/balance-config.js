// ====================================================
// 밸런스 시스템 — 스테이지 난이도 / 주사위 / 마블 스케일링
// balance-system.md 설계서 기반
// ====================================================

// ── ② 스테이지 난이도 테이블 ──

export const STAGE_DIFFICULTY = {
  /** 목표 매치 수: S1=180, 이후 스테이지마다 15% 증가 */
  matchTarget(stageId) {
    const base = 180;
    if (stageId <= 1) return base;
    return Math.round(base * (1 + (stageId - 1) * 0.15));
  },

  /** 이동 횟수: matchTarget / D계수 (D = 0.75 ~ 1.43) */
  moves(stageId, matchTarget) {
    const dCoeff = Math.min(1.43, 0.75 + (stageId - 1) * 0.014);
    return Math.max(20, Math.round(matchTarget / dCoeff));
  },

  /** 보드 크기 확장 */
  boardSize(stageId) {
    if (stageId <= 5)  return { cols: 7,  rows: 7  };
    if (stageId <= 10) return { cols: 8,  rows: 8  };
    if (stageId <= 20) return { cols: 8,  rows: 10 };
    if (stageId <= 30) return { cols: 9,  rows: 10 };
    return { cols: 10, rows: 12 };
  },

  /** 캔디(젬) 종류 수 */
  gemCount(stageId) {
    if (stageId <= 5)  return 6;
    if (stageId <= 20) return 7;
    return 8;
  },

  /** 보드+셀 크기에 맞는 적응형 셀 크기 (px) */
  cellSize(cols, rows, compact) {
    const maxDim = Math.max(cols, rows);
    if (compact) {
      if (maxDim <= 7) return 52;
      if (maxDim <= 8) return 46;
      if (maxDim <= 10) return 40;
      return 36;
    }
    // 비컴팩트: 마블 보더 포함 (cols+2, rows+2)
    if (maxDim + 2 <= 9)  return 40;
    if (maxDim + 2 <= 12) return 34;
    return 30;
  },
};


// ── 콤보 보너스 시스템 ──

export const COMBO_BONUSES = [
  { minCombo: 3,  multiplier: 1.15, bonus: null,            label: '3콤보!' },
  { minCombo: 5,  multiplier: 1.25, bonus: 'dice_bonus',    label: '5콤보! 주사위+1' },
  { minCombo: 10, multiplier: 1.50, bonus: 'treasure_sure', label: '10콤보! 보물 확정' },
  { minCombo: 15, multiplier: 1.75, bonus: null,            label: '15콤보! 대박!' },
  { minCombo: 20, multiplier: 2.00, bonus: 'golden_dice',   label: '20콤보! 황금주사위!' },
];

/**
 * 현재 콤보 수에 해당하는 보너스 단계 반환
 * @param {number} comboCount
 * @returns {object|null} { minCombo, multiplier, bonus, label }
 */
export function getComboBonus(comboCount) {
  let current = null;
  for (const cb of COMBO_BONUSES) {
    if (comboCount >= cb.minCombo) current = cb;
  }
  return current;
}


// ── ③ 주사위 타입 시스템 ──

export const DICE_TYPES = {
  normal:  { name: '일반 주사위',   emoji: '🎲', min: 1, max: 6, bonus: 0, special: null },
  bonus:   { name: '보너스 주사위', emoji: '⭐', min: 1, max: 6, bonus: 1, special: null },
  golden:  { name: '황금 주사위',   emoji: '🌟', min: 2, max: 6, bonus: 0, special: 'double_gold' },
  diamond: { name: '다이아 주사위', emoji: '💎', min: 3, max: 6, bonus: 0, special: 'guaranteed_drop' },
  fire:    { name: '불꽃 주사위',   emoji: '🔥', min: 1, max: 6, bonus: 0, special: 'burn_tiles' },
  ice:     { name: '얼음 주사위',   emoji: '❄️', min: 1, max: 3, bonus: 0, special: 'freeze_trap' },
  lucky:   { name: '행운 주사위',   emoji: '🍀', min: 4, max: 6, bonus: 0, special: 'rarity_up' },
};

/**
 * 주사위 2개 굴리기
 * @param {string} type1 - 첫 번째 주사위 타입
 * @param {string} type2 - 두 번째 주사위 타입
 * @returns {{ d1:number, d2:number, sum:number, specials:string[], types:string[] }}
 */
export function rollDicePair(type1 = 'normal', type2 = 'normal') {
  const t1 = DICE_TYPES[type1] || DICE_TYPES.normal;
  const t2 = DICE_TYPES[type2] || DICE_TYPES.normal;
  const d1 = Math.floor(Math.random() * (t1.max - t1.min + 1)) + t1.min + t1.bonus;
  const d2 = Math.floor(Math.random() * (t2.max - t2.min + 1)) + t2.min + t2.bonus;
  const specials = [t1.special, t2.special].filter(Boolean);
  return { d1, d2, sum: d1 + d2, specials, types: [type1, type2] };
}


// ── ④ 마블 타일 보상 스케일링 ──

export const MARBLE_SCALING = {
  /** 골드 보상: 10 × 1.2^stage × comboMult × luckMult */
  goldReward(stageId, comboCount = 0, luckMult = 1.0) {
    const base = 10;
    const stageScale = Math.pow(1.2, Math.min(stageId, 50));
    const comboMult = 1 + comboCount * 0.05;
    return Math.round(base * stageScale * comboMult * luckMult);
  },

  /** 스테이지별 아이템 등급 확률 */
  itemRarity(stageId) {
    if (stageId <= 5)  return { common: 60, rare: 25, epic: 12, legendary: 3 };
    if (stageId <= 15) return { common: 45, rare: 30, epic: 18, legendary: 7 };
    if (stageId <= 30) return { common: 30, rare: 30, epic: 25, legendary: 15 };
    return { common: 20, rare: 25, epic: 30, legendary: 25 };
  },

  /** 마블 타일 수: 30 + (stage/5)*5, max 60 */
  tileCount(stageId) {
    return Math.min(60, 30 + Math.floor(stageId / 5) * 5);
  },

  /** 등급 가중치로 등급 롤 */
  rollRarity(stageId) {
    const weights = this.itemRarity(stageId);
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [rarity, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return rarity;
    }
    return 'common';
  },
};
