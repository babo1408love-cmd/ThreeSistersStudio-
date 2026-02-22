// ====================================================
// 인벤토리 & 영웅 장착 슬롯 & 펫 슬롯 시스템 설정
// 스테이지1 캔디 보드 내 배치 + 독립 UI 설정
// ====================================================

// --- 보드 내 배치 ---
// 캔디 보드 하단부: 3×3 보물상자 영역(중앙) 양쪽
// 좌측 = 인벤토리 슬롯 (6칸)
// 우측 = 영웅 장착 슬롯 (기존 6 + 확장 4 = 10칸, 그 중 1칸 = 펫)
// Row 7: 확장 슬롯 (보물상자 바로 윗줄 양쪽)
// ※ 캔디 타일 스타일 제거, 독립된 슬롯 UI로 표시

// --- 신체 부위별 장비 슬롯 매핑 (보드 좌측 6칸) ---
export const EQUIP_SLOT_MAP = [
  { key: 'head',  pos: [8, 0],  name: '머리', emoji: '👒', emptyEmoji: '👒' },
  { key: 'body',  pos: [8, 1],  name: '몸통', emoji: '🛡️', emptyEmoji: '🛡️' },
  { key: 'arms',  pos: [9, 0],  name: '팔',   emoji: '⚔️', emptyEmoji: '⚔️' },
  { key: 'wings', pos: [9, 1],  name: '날개', emoji: '🪽', emptyEmoji: '🪽' },
  { key: 'legs',  pos: [10, 0], name: '다리', emoji: '🦿', emptyEmoji: '🦿' },
  { key: 'shoes', pos: [10, 1], name: '신발', emoji: '👟', emptyEmoji: '👟' },
];

export const BOARD_SLOT_LAYOUT = {
  // 보드 내 장비 슬롯 위치 (캔디 내부 좌표: row, col)
  // cols=7 기준, 3×3 treasure가 row 8~10, col 2~4
  // 좌측: row 8~10, col 0~1 (6칸) — 신체 부위별 장비 슬롯
  equipmentPositions: [
    [8, 0], [8, 1],
    [9, 0], [9, 1],
    [10, 0], [10, 1],
  ],

  // 영웅 장착 슬롯 (펫 슬롯 기준 2×3 블록, 펫 제외 = 5칸)
  // ※ [10,6]은 펫 슬롯으로 분리
  heroSlotPositions: [
    [8, 5],                       // 슬롯 0: 좌상단
    [8, 6],                       // 슬롯 1: 우상단
    [9, 5],                       // 슬롯 2: 좌중간
    [9, 6],                       // 슬롯 3: 우중간
    [10, 5],                      // 슬롯 4: 좌하단 (펫 왼쪽)
  ],

  // 펫 슬롯 (제일 하단 제일 오른쪽)
  petSlotPosition: [10, 6],

  // 보드 값 마커
  boardMarkers: {
    equipment: -3,     // board[r][c] = -3 → 장비 슬롯 (신체 부위별)
    heroSlot: -4,      // board[r][c] = -4 → 영웅 장착 슬롯
    petSlot: -5,       // board[r][c] = -5 → 펫 장착 슬롯
  },
};


// --- 인벤토리 시스템 ---
export const INVENTORY_CONFIG = {
  // 스테이지 보드 내 슬롯 수 (6부위 장비 슬롯)
  boardSlots: 6,

  // 전체 인벤토리 최대 크기 (확장 가능)
  maxCapacity: 30,

  // 보드 슬롯 표시 규칙
  display: {
    // 보드에 표시할 모드: 장비 슬롯 (신체 부위별)
    showMode: 'equipment',        // 'equipment' — 부위별 장비 슬롯
    emptySlotEmoji: '📦',        // 빈 슬롯 이모지 (fallback)
    emptySlotLabel: '빈 슬롯',
    // 슬롯 클릭 시 동작
    onClick: 'show_equip_detail', // 장비 상세/교체 팝업
    onLongPress: 'quick_equip',   // 길게 누르면 빠른 장착
  },

  // 슬롯 비주얼
  style: {
    background: 'rgba(30, 35, 55, 0.9)',
    border: '2px solid rgba(103, 232, 249, 0.4)',
    borderRadius: '8px',
    hoverBorder: 'rgba(103, 232, 249, 0.8)',
    emptyOpacity: 0.5,
    // 등급별 테두리 색상은 RARITY_COLORS 참조
  },
};


// --- 영웅 장착 슬롯 시스템 ---
export const HERO_SLOT_CONFIG = {
  // 보드 내 슬롯 수 (5칸 영웅 + 1칸 펫 = 6칸 총)
  boardSlots: 5,

  // 빈 슬롯 표시
  display: {
    emptySlotEmoji: '👤',
    emptySlotLabel: '영웅 슬롯',
    lockedSlotEmoji: '🔒',
    lockedSlotLabel: '잠김',
    onClick: 'show_hero_detail',
  },

  // 슬롯 해금 조건 (5슬롯)
  slotUnlock: [
    { slot: 0, condition: 'stage', value: 1, label: '기본 해금' },
    { slot: 1, condition: 'stage', value: 1, label: '기본 해금' },
    { slot: 2, condition: 'stage', value: 1, label: '기본 해금' },
    { slot: 3, condition: 'stage', value: 2, label: '스테이지 2 클리어' },
    { slot: 4, condition: 'stage', value: 2, label: '스테이지 2 클리어' },
  ],

  // --- 중복 장착 제한 규칙 ---
  duplication: {
    // 적용 등급: 에픽 + 레전드리만
    restrictedRarities: ['epic', 'legendary'],
    // 제한 조건: 같은 등급(rarity) + 같은 속성(attribute)은 중복 불가
    restrictFields: ['rarity', 'attribute'],
    // 자유 등급: 일반, 레어, 매직은 중복 제한 없음
    freeRarities: ['common', 'rare', 'magic'],
    // 에러 메시지
    errorMessage: '같은 등급과 같은 속성의 영웅은 중복 착용할 수 없습니다!',
  },

  // 슬롯 비주얼
  style: {
    background: 'rgba(40, 25, 55, 0.9)',
    border: '2px solid rgba(155, 138, 255, 0.4)',
    borderRadius: '8px',
    hoverBorder: 'rgba(155, 138, 255, 0.8)',
    emptyOpacity: 0.5,
    lockedOpacity: 0.3,
  },
};


// --- 펫 슬롯 시스템 ---
// 기본 구조: 영웅과 동일 (추후 펫 전용 업데이트 예정)
export const PET_SLOT_CONFIG = {
  boardSlots: 1,

  display: {
    emptySlotEmoji: '🐾',
    emptySlotLabel: '펫 슬롯',
    lockedSlotEmoji: '🔒',
    lockedSlotLabel: '잠김',
    onClick: 'show_pet_detail',
  },

  // 해금 조건
  unlock: { condition: 'stage', value: 1, label: '기본 해금' },

  // 슬롯 비주얼 (녹색 계열)
  style: {
    background: 'rgba(25, 50, 35, 0.9)',
    border: '2px solid rgba(134, 239, 172, 0.5)',
    borderRadius: '8px',
    hoverBorder: 'rgba(134, 239, 172, 0.8)',
    emptyOpacity: 0.6,
  },
};


// ====================================================
// 펫 시스템 설정 (사라지지 않는 정령 — 회복 전문)
// ※ 펫 = 영구적 동반 정령, 죽지 않음 (사라지지 않는 속성)
// ※ 핵심 역할: 회복 (공격이 아닌 치유)
// ※ 분노 게이지와 동일한 게이지 시스템 → "치유 게이지"로 운용
// ====================================================

export const PET_SYSTEM = {
  // 펫 = 사라지지 않는 정령 동반자
  // ※ 전투에서 절대 죽지 않음 (HP 0이 되면 잠시 휴식 후 자동 부활)
  immortal: true,
  reviveDelay: 5000,             // ms — HP 0 시 5초 후 자동 부활
  reviveHpPercent: 0.5,          // 부활 시 HP 50%

  maxLevel: 30,

  // 기본 스탯 (회복 중심)
  baseStats: {
    maxHp: 60,
    healPower: 8,                // 회복력 (치유 스킬 계수)
    defense: 4,
    speed: 5,
    healEfficiency: 100,         // 치유 효율 (%) — 장비로 증가 가능
  },

  // 레벨당 성장
  growthPerLevel: {
    maxHp: 5,
    healPower: 1.5,
    defense: 0.8,
    speed: 0.2,
    healEfficiency: 0,           // 장비로만 증가
  },

  // 펫 능력 타입 (회복 중심)
  abilityTypes: [
    'heal_burst',          // 즉시 회복 (게이지 100% 시 발동)
    'heal_over_time',      // 지속 회복 (패시브)
    'shield_grant',        // 보호막 부여
    'cleanse',             // 디버프 해제
    'regen_aura',          // 주변 아군 지속 회복 아우라
  ],

  // 펫 등급 (영웅과 동일)
  rarities: ['common', 'rare', 'magic', 'epic', 'legendary'],

  // 스테이지1 효과: 패시브 회복만
  stage1: {
    passiveActive: true,         // 패시브 치유 ON
    activeActive: false,         // 게이지 스킬 OFF
    healOverTime: {
      enabled: true,
      interval: 8000,            // 8초마다
      healPercent: 0.03,         // 최대 HP의 3% 회복
    },
  },
  // 스테이지2 효과: 전투에서 동행 + 치유 게이지 발동
  stage2: {
    passiveActive: true,
    activeActive: true,          // 치유 게이지 스킬 ON
    followPlayer: true,
    healOverTime: {
      enabled: true,
      interval: 5000,            // 5초마다
      healPercent: 0.05,         // 최대 HP의 5% 회복
    },
  },
};


// ====================================================
// 펫 치유 게이지 시스템 (분노 게이지와 동일 구조)
// ※ 공격 대신 회복 스킬 발동
// ====================================================

export const PET_HEAL_GAUGE = {
  maxGauge: 100,
  startGauge: 0,

  // --- 게이지 충전 조건 ---
  fillRates: {
    // 스테이지1 (캔디 퍼즐)
    stage1: {
      candyTileClear: 1,          // 타일 1개 제거 시 +1%
      match3: 4,                  // 3매치 +4%
      match4: 7,                  // 4매치 +7%
      match5: 12,                 // 5매치 +12%
      match6plus: 18,             // 6+매치 +18%
      comboBonus: 3,              // 콤보당 +3%
    },
    // 스테이지2 (전투)
    stage2: {
      playerDamaged: 10,          // 플레이어 피격 시 +10% (위기에 치유)
      allyDamaged: 5,             // 아군 피격 시 +5%
      enemyKill: 4,               // 적 처치 시 +4%
      timeElapsed: 2,             // 10초마다 +2% (자연 충전)
    },
  },

  // --- 자동 발동 (100%) ---
  autoTrigger: {
    enabled: true,
    threshold: 100,
    resetAfterTrigger: true,
    resetTo: 0,
    cooldownAfterTrigger: 600,     // ms (회복 연출 시간)
  },

  // --- 치유 스킬 연출 ---
  skillAnimation: {
    // ✦ 스테이지1 (캔디 보드)
    stage1: {
      // 펫이 보드 중앙으로 날아감 → 회복 파동 → 돌아옴
      petFly: {
        startFrom: 'pet_slot_cell',
        flyToCenter: true,
        flightDuration: 350,
        impactDelay: 80,
        returnDuration: 300,
      },
      // 회복 임팩트 (초록빛 파동)
      impact: {
        type: 'heal_wave',
        emoji: '💚',
        rings: 2,
        ringDelay: 150,
        ringColor: 'rgba(134, 239, 172, 0.6)',
        screenFlash: true,
        flashColor: '#dcfce7',      // 밝은 초록빛
        flashDuration: 200,
        particleEmojis: ['💚', '🌿', '✨', '🍀', '💫', '🌸'],
      },
      // 효과: 플레이어 HP 회복
      effect: {
        type: 'heal_player',
        healPercent: 0.25,          // 최대 HP의 25% 회복
        bonusPerPetLevel: 0.005,    // 펫 레벨당 +0.5%
      },
    },

    // ✦ 스테이지2 (전투)
    stage2: {
      petFly: {
        flyToPlayer: true,
        flightDuration: 300,
        impactDuration: 600,
        returnDuration: 250,
      },
      // 치유 파동 (전체 아군)
      impact: {
        type: 'heal_aoe',
        emoji: '💚',
        rings: 3,
        ringColor: 'rgba(134, 239, 172, 0.5)',
        particleEmojis: ['💚', '🌿', '✨', '🍀'],
      },
      // 효과: 전체 아군 HP 회복
      effect: {
        type: 'heal_all_allies',
        healPercent: 0.20,           // 최대 HP의 20%
        bonusPerPetLevel: 0.004,     // 레벨당 +0.4%
        shieldPercent: 0.05,         // 추가 보호막 5%
      },
    },
  },

  // --- 치유 게이지 아이콘 연출 ---
  icon: {
    normalEmoji: '🐾',
    chargingPhases: [
      { threshold: 0,   emoji: '🐾', label: '평온',   color: '#86efac', effect: 'none' },
      { threshold: 25,  emoji: '🌱', label: '싹트기', color: '#a3e635', effect: 'slight_glow' },
      { threshold: 50,  emoji: '🌿', label: '성장',   color: '#67e8f9', effect: 'pulse_glow' },
      { threshold: 75,  emoji: '🍀', label: '치유력', color: '#34d399', effect: 'heal_aura' },
      { threshold: 100, emoji: '💚', label: '대치유', color: '#22c55e', effect: 'heal_ready' },
    ],
    triggerAnimation: {
      emoji: '💚',
      screenFlash: true,
      flashColor: '#dcfce7',
      flashDuration: 300,
    },
    resetAnimation: {
      emoji: '🐾',
      duration: 500,
      fadeBack: true,
    },
  },

  // --- 치유 게이지 UI ---
  ui: {
    position: 'below-rage',        // 분노 게이지 아래에 표시
    width: 120,
    height: 10,
    borderRadius: 5,
    gradientStops: [
      { at: 0,   color: '#86efac' },   // 연초록
      { at: 25,  color: '#a3e635' },   // 라임
      { at: 50,  color: '#67e8f9' },   // 시안
      { at: 75,  color: '#34d399' },   // 에메랄드
      { at: 100, color: '#22c55e' },   // 진초록
    ],
    showPhaseIcon: true,
    iconSize: 18,
    fullEffect: 'pulse_border',
    fullBorderColor: '#22c55e',
  },
};


// ====================================================
// 펫 장비 슬롯 시스템 (4슬롯)
// ※ 날개 + 외모(스킨) 변경 + 악세서리
// ※ 장비 변경 시 외형(이모지) 변경됨
// ====================================================

export const PET_EQUIPMENT_SLOTS = [
  {
    key: 'wings',
    name: '날개',
    emoji: '🪽',
    description: '펫의 날개 장착 — 이동속도 + 외형 변경',
    primaryStat: 'speed',
    secondaryStat: 'healEfficiency',
    changesAppearance: true,       // 외형 변경 여부
  },
  {
    key: 'skin',
    name: '외모',
    emoji: '🎨',
    description: '펫의 외형(스킨) 변경 — 특수효과',
    primaryStat: 'healPower',
    changesAppearance: true,
  },
  {
    key: 'collar',
    name: '목줄',
    emoji: '📿',
    description: '치유력 + 방어력 강화',
    primaryStat: 'healPower',
    secondaryStat: 'defense',
    changesAppearance: false,
  },
  {
    key: 'charm_pet',
    name: '부적',
    emoji: '🧿',
    description: '치유 효율 + 특수효과',
    primaryStat: 'healEfficiency',
    changesAppearance: false,
  },
];


// ====================================================
// 외형 변경 시스템 (영웅 & 펫 공통)
// ※ 장비를 바꾸면 외형(이모지/비주얼)이 변경되는 시스템
// ====================================================

export const APPEARANCE_SYSTEM = {
  enabled: true,

  // --- 외형 변경 규칙 ---
  // 장비에 appearanceOverride가 있으면 해당 이모지/효과 적용
  // 없으면 기본 이모지 유지
  rules: {
    // 외형 우선순위: skin > wings > 기본 (높은 우선순위가 이기)
    priorityOrder: ['skin', 'wings'],
    // 복합 외형: 여러 장비가 부분적으로 적용
    compositeMode: false,           // true면 파츠별 합성 (추후 확장)
  },

  // --- 영웅 외형 변경 ---
  hero: {
    // 장비에 의한 외형 변경이 가능한 슬롯
    changeableSlots: ['head', 'body', 'wings', 'arms'],
    // 외형 변경 연출
    changeAnimation: {
      type: 'sparkle_transform',
      duration: 600,                // ms
      particleEmojis: ['✨', '💫', '⭐'],
      flashColor: 'rgba(255, 215, 0, 0.3)',
    },
  },

  // --- 펫 외형 변경 ---
  pet: {
    changeableSlots: ['wings', 'skin'],
    changeAnimation: {
      type: 'sparkle_transform',
      duration: 500,
      particleEmojis: ['✨', '🌿', '💚'],
      flashColor: 'rgba(134, 239, 172, 0.3)',
    },
  },

  // --- 외형 데이터 구조 ---
  // 각 장비 아이템은 선택적으로 appearanceOverride를 가질 수 있음
  // 예: { ..., appearanceOverride: { emoji: '🔮', glowColor: '#9b8aff', trail: 'sparkle' } }
  overrideFields: {
    emoji: 'string',               // 기본 이모지 교체
    glowColor: 'string',           // 아우라 색상 변경
    trail: 'string',               // 이동 잔상 효과 (sparkle, flame, shadow 등)
    scale: 'number',               // 크기 배율 (기본 1.0)
    animation: 'string',           // 특수 애니메이션 (bounce, spin, pulse 등)
  },
};


// ====================================================
// 펫 날개 아이템 데이터
// ====================================================

export const PET_WING_ITEMS = [
  {
    key: 'leaf_wings',
    name: '나뭇잎 날개',
    emoji: '🍃',
    rarity: 'common',
    stats: { speed: 2, healEfficiency: 5 },
    appearanceOverride: { emoji: '🍃', glowColor: 'rgba(134, 239, 172, 0.4)', trail: 'leaf' },
    description: '나뭇잎으로 만든 작은 날개',
  },
  {
    key: 'crystal_wings',
    name: '수정 날개',
    emoji: '💎',
    rarity: 'rare',
    stats: { speed: 3, healEfficiency: 10 },
    appearanceOverride: { emoji: '💎', glowColor: 'rgba(103, 232, 249, 0.5)', trail: 'sparkle' },
    description: '수정으로 빛나는 투명한 날개',
  },
  {
    key: 'fairy_wings',
    name: '요정 날개',
    emoji: '🧚',
    rarity: 'magic',
    stats: { speed: 5, healEfficiency: 15 },
    appearanceOverride: { emoji: '🧚', glowColor: 'rgba(245, 194, 231, 0.5)', trail: 'sparkle', animation: 'fairy_flutter' },
    description: '요정의 빛나는 날개',
  },
  {
    key: 'phoenix_wings',
    name: '불사조 날개',
    emoji: '🔥',
    rarity: 'epic',
    stats: { speed: 7, healEfficiency: 20, healPower: 3 },
    appearanceOverride: { emoji: '🔥', glowColor: 'rgba(251, 191, 36, 0.6)', trail: 'flame', animation: 'fire_pulse' },
    description: '불사조의 영원한 날개 — 부활 시간 50% 감소',
    bonusEffect: { reviveDelayReduction: 0.5 },
  },
  {
    key: 'celestial_wings',
    name: '천상의 날개',
    emoji: '👼',
    rarity: 'legendary',
    stats: { speed: 10, healEfficiency: 30, healPower: 5 },
    appearanceOverride: { emoji: '👼', glowColor: 'rgba(255, 248, 184, 0.7)', trail: 'holy', scale: 1.15, animation: 'celestial_glow' },
    description: '천상에서 내려온 신성한 날개',
    bonusEffect: { healGaugeBonus: 10 },  // 치유 게이지 충전률 +10%
  },
];


// ====================================================
// 펫 스킨(외모) 아이템 데이터
// ====================================================

export const PET_SKIN_ITEMS = [
  {
    key: 'forest_form',
    name: '숲의 형상',
    emoji: '🌿',
    rarity: 'common',
    stats: { healPower: 2 },
    appearanceOverride: { emoji: '🌿', glowColor: 'rgba(134, 239, 172, 0.4)' },
    description: '숲의 정령 형상으로 변신',
  },
  {
    key: 'flower_form',
    name: '꽃의 형상',
    emoji: '🌸',
    rarity: 'rare',
    stats: { healPower: 4, maxHp: 10 },
    appearanceOverride: { emoji: '🌸', glowColor: 'rgba(245, 194, 231, 0.5)', trail: 'petal' },
    description: '꽃잎을 두른 아름다운 형상',
  },
  {
    key: 'water_form',
    name: '물의 형상',
    emoji: '💧',
    rarity: 'magic',
    stats: { healPower: 6, defense: 3 },
    appearanceOverride: { emoji: '💧', glowColor: 'rgba(96, 165, 250, 0.5)', trail: 'water_drop', animation: 'water_ripple' },
    description: '맑은 물방울로 이루어진 형상',
  },
  {
    key: 'moonlight_form',
    name: '달빛 형상',
    emoji: '🌙',
    rarity: 'epic',
    stats: { healPower: 10, healEfficiency: 15, defense: 5 },
    appearanceOverride: { emoji: '🌙', glowColor: 'rgba(200, 200, 255, 0.6)', trail: 'moonbeam', animation: 'moon_glow' },
    description: '달의 축복을 받은 신비로운 형상',
    bonusEffect: { nightHealBonus: 0.15 },  // 밤(후반 스테이지) 회복력 15% 증가
  },
  {
    key: 'sacred_tree_form',
    name: '신성한 나무 형상',
    emoji: '🌳',
    rarity: 'legendary',
    stats: { healPower: 15, healEfficiency: 25, maxHp: 30, defense: 8 },
    appearanceOverride: { emoji: '🌳', glowColor: 'rgba(34, 197, 94, 0.7)', trail: 'sacred_leaf', scale: 1.2, animation: 'tree_breath' },
    description: '세계수의 축복을 받은 신성한 형상 — 모든 치유 효과 20% 증가',
    bonusEffect: { globalHealBonus: 0.2 },
  },
];


// ====================================================
// 펫 로스터 (회복 전문 정령들)
// ※ 모든 펫은 "사라지지 않는 정령" — 영구 동반
// ※ 핵심 역할: 회복 (각자 고유 회복 스타일)
// ====================================================

export const PET_ROSTER = [
  {
    key: 'healing_wisp',
    name: '치유의 위습',
    emoji: '💚',
    attribute: 'light',
    rarity: 'common',
    immortalTitle: '사라지지 않는 빛의 조각',
    healSkill: {
      name: '작은 치유',
      type: 'heal_burst',
      healPercent: 0.15,
      description: '주인 HP의 15% 즉시 회복',
    },
    passiveSkill: {
      name: '빛의 온기',
      type: 'heal_over_time',
      healPercent: 0.02,
      interval: 8000,
      description: '8초마다 HP 2% 회복',
    },
  },
  {
    key: 'forest_spirit',
    name: '숲의 정령이',
    emoji: '🌿',
    attribute: 'earth',
    rarity: 'rare',
    immortalTitle: '사라지지 않는 대지의 숨결',
    healSkill: {
      name: '자연의 포옹',
      type: 'heal_burst',
      healPercent: 0.20,
      bonusShield: 0.05,
      description: 'HP 20% 회복 + 5% 보호막',
    },
    passiveSkill: {
      name: '숲의 생명력',
      type: 'regen_aura',
      healPercent: 0.03,
      interval: 6000,
      aoeRange: 2,
      description: '6초마다 주변 아군 HP 3% 회복',
    },
  },
  {
    key: 'water_sprite',
    name: '맑은 물의 정령',
    emoji: '💧',
    attribute: 'water',
    rarity: 'magic',
    immortalTitle: '사라지지 않는 맑은 물방울',
    healSkill: {
      name: '생명의 샘',
      type: 'heal_burst',
      healPercent: 0.25,
      cleanse: true,
      description: 'HP 25% 회복 + 디버프 해제',
    },
    passiveSkill: {
      name: '정수의 보호',
      type: 'shield_grant',
      shieldPercent: 0.08,
      interval: 10000,
      description: '10초마다 최대HP 8% 보호막 부여',
    },
  },
  {
    key: 'moonlight_fairy',
    name: '달빛 요정',
    emoji: '🌙',
    attribute: 'light',
    rarity: 'epic',
    immortalTitle: '사라지지 않는 달의 축복',
    healSkill: {
      name: '달빛 세례',
      type: 'heal_burst',
      healPercent: 0.30,
      aoe: true,
      description: '전체 아군 HP 30% 회복',
    },
    passiveSkill: {
      name: '달의 가호',
      type: 'heal_over_time',
      healPercent: 0.04,
      interval: 5000,
      description: '5초마다 HP 4% 회복',
    },
  },
  {
    key: 'world_tree_spirit',
    name: '세계수의 정령',
    emoji: '🌳',
    attribute: 'earth',
    rarity: 'legendary',
    immortalTitle: '사라지지 않는 세계수의 영혼',
    healSkill: {
      name: '세계수의 은총',
      type: 'heal_burst',
      healPercent: 0.40,
      aoe: true,
      bonusShield: 0.10,
      cleanse: true,
      revive: true,               // 쓰러진 아군 부활 가능
      description: '전체 아군 HP 40% 회복 + 10% 보호막 + 디버프 해제 + 부활',
    },
    passiveSkill: {
      name: '세계수의 축복',
      type: 'regen_aura',
      healPercent: 0.05,
      interval: 4000,
      aoeRange: 5,
      description: '4초마다 전체 아군 HP 5% 회복',
    },
  },
];


// --- 중복 착용 검증 함수 ---
export function canEquipHero(hero, equippedHeroes) {
  if (!hero) return { allowed: true };

  const { restrictedRarities, restrictFields, freeRarities } = HERO_SLOT_CONFIG.duplication;

  if (freeRarities.includes(hero.rarity)) {
    return { allowed: true };
  }

  if (restrictedRarities.includes(hero.rarity)) {
    const duplicate = equippedHeroes.find(h => {
      if (!h) return false;
      return restrictFields.every(field => h[field] === hero[field]);
    });

    if (duplicate) {
      return {
        allowed: false,
        reason: HERO_SLOT_CONFIG.duplication.errorMessage,
        conflictWith: duplicate,
      };
    }
  }

  return { allowed: true };
}


// --- 슬롯 해금 검증 함수 ---
export function isSlotUnlocked(slotIndex, currentStage, playerLevel) {
  const unlock = HERO_SLOT_CONFIG.slotUnlock[slotIndex];
  if (!unlock) return false;

  if (unlock.condition === 'stage') {
    return currentStage >= unlock.value;
  }
  if (unlock.condition === 'level') {
    return playerLevel >= unlock.value;
  }
  return false;
}

// --- 펫 슬롯 해금 검증 ---
export function isPetSlotUnlocked(currentStage) {
  const { condition, value } = PET_SLOT_CONFIG.unlock;
  if (condition === 'stage') return currentStage >= value;
  return false;
}
