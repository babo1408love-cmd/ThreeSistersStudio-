// ====================================================
// 밸런스 시스템 — 스테이지 난이도 / 주사위 / 마블 스케일링
// balance-system.md 설계서 기반
// ====================================================

// ── ② 스테이지 난이도 테이블 ──

export const STAGE_DIFFICULTY = {
  /** 목표 매치 수: 100 고정 (캔디는 정령 보너스 판) */
  matchTarget(stageId) {
    return 100;
  },

  /** 이동 횟수: matchTarget / D계수 (D = 0.75 ~ 1.43) */
  moves(stageId, matchTarget) {
    const dCoeff = Math.min(1.43, 0.75 + (stageId - 1) * 0.014);
    return Math.max(20, Math.round(matchTarget / dCoeff));
  },

  /** 보드 크기 — 스마트폰 화면 고정 (6×8) */
  boardSize(stageId) {
    return { cols: 6, rows: 8 };
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
