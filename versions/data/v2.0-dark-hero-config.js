// ====================================================
// 영웅(Hero) 시스템 설정
// 모든 영웅 관련 설정을 시스템화하여 보관
// 차후 구현 시 이 파일을 기반으로 작업
// ====================================================

// --- 영웅 기본 설정 ---
// 영웅 = 요정 (🧚)
// 기본적으로 날아다니는 연출 (공중에 떠서 이동)
// 날개가 가끔 움직여 공중에 떠 있는 것을 연출
export const HERO_BASE = {
  emoji: '🧚',
  name: '빛의 요정',
  title: '정화의 수호자',
  attribute: 'light',           // 속성: 빛
  rarity: 'legendary',          // 주인공은 레전드리급
  description: '버섯돌이 대마왕의 포자를 정화하는 빛의 요정',

  // 기본 스탯 (레벨 1)
  baseStats: {
    maxHp: 100,
    hp: 100,
    attack: 10,
    defense: 5,
    speed: 3,
    critRate: 5,                // 치명타 확률 (%)
    critDamage: 150,            // 치명타 데미지 (%)
    rageGainRate: 100,          // 분노 획득률 (%) — 기본 100%, 장비로 증가 가능
  },

  // 레벨당 스탯 성장 (밸런스: 레벨 50 기준 적절한 파워 커브)
  growthPerLevel: {
    maxHp: 8,                   // Lv50: 100 + 392 = 492
    attack: 2,                  // Lv50: 10 + 98 = 108
    defense: 1.5,               // Lv50: 5 + 73 = 78
    speed: 0.3,                 // Lv50: 3 + 14.7 = 17.7
    critRate: 0.1,              // Lv50: 5 + 4.9 = 9.9%
    critDamage: 1,              // Lv50: 150 + 49 = 199%
  },

  // 레벨 시스템
  levelSystem: {
    maxLevel: 50,
    // 필요 경험치 공식: baseExp * level^expCurve
    baseExp: 100,
    expCurve: 1.35,             // Lv2: 100, Lv10: 2239, Lv25: 18,119, Lv50: 100,000+
  },
};

// --- 비주얼 연출 설정 ---
export const HERO_VISUAL = {
  // 날아다니는 연출 (CSS fairyFloat 시스템)
  floating: {
    enabled: true,
    bobAmplitude: 6,            // 상하 부유 높이 (px)
    bobSpeed: 2.2,              // 부유 속도 (초)
    swayAmplitude: 1.5,         // 좌우 흔들림 (px)
    swaySpeed: 3.5,             // 좌우 속도 (초)
  },

  // 날개 움직임 연출
  wings: {
    enabled: true,
    // 날개가 가끔 펄럭이는 연출
    flapInterval: 3000,         // ms — 3초마다 날개 펄럭임
    flapDuration: 600,          // ms — 펄럭임 지속시간
    flapScale: 1.08,            // 펄럭임 시 크기 변화
    // CSS 클래스: .hero-fairy-wings-flap
    idleWingAngle: 15,          // 기본 날개 각도 (도)
    flapWingAngle: 45,          // 펄럭임 시 날개 각도 (도)
  },

  // 빛 이펙트 (요정 아우라)
  glow: {
    enabled: true,
    color: 'rgba(255, 182, 255, 0.3)',  // 핑크빛 아우라
    pulseSpeed: 2.5,            // 초
    radius: 25,                 // 아우라 반경 (px)
  },

  // 그림자 (지면에 그림자로 떠 있는 느낌)
  shadow: {
    enabled: true,
    blur: 8,
    offsetY: 12,                // 떠 있는 높이만큼 그림자 아래
    opacity: 0.25,
    color: 'rgba(180, 120, 255, 0.35)',
  },
};

// --- 장비 슬롯 6개 (신체 부위별) ---
// 머리·몸통·팔·날개·다리·신발 6부위 장비 슬롯
// 보드 좌측 6칸에 신체 부위 아이콘으로 표시
// 클릭하면 장비 상세/교체 팝업
export const EQUIPMENT_SLOTS = [
  { key: 'head',  name: '머리', emoji: '👒', description: '방어력 + 체력', primaryStat: 'defense', secondaryStat: 'maxHp' },
  { key: 'body',  name: '몸통', emoji: '🛡️', description: '방어력 중심', primaryStat: 'defense' },
  { key: 'arms',  name: '팔',   emoji: '⚔️', description: '공격력 + 치명타', primaryStat: 'attack', secondaryStat: 'critRate' },
  { key: 'wings', name: '날개', emoji: '🪽', description: '분노 획득률 + 속도', primaryStat: 'rageGainRate', secondaryStat: 'speed' },
  { key: 'legs',  name: '다리', emoji: '🦿', description: '방어력 + 속도', primaryStat: 'defense', secondaryStat: 'speed' },
  { key: 'shoes', name: '신발', emoji: '👟', description: '이동속도 중심', primaryStat: 'speed' },
];

// --- 장비 아이템 데이터 (8슬롯 대응) ---
// 등급별 스탯 범위 (밸런스 설계)
export const EQUIPMENT_BALANCE = {
  // common: 기본 파워, 쉽게 얻을 수 있음
  common: {
    statMultiplier: 1.0,
    dropWeight: 50,
    color: '#86efac',
  },
  // rare: 괜찮은 성능
  rare: {
    statMultiplier: 1.8,
    dropWeight: 25,
    color: '#9b8aff',
  },
  // magic: 뚜렷한 강화
  magic: {
    statMultiplier: 2.8,
    dropWeight: 13,
    color: '#67e8f9',
  },
  // epic: 강력한 성능 + 세트효과 가능
  epic: {
    statMultiplier: 4.0,
    dropWeight: 8,
    color: '#fbbf24',
  },
  // legendary: 최고 성능 + 고유 효과
  legendary: {
    statMultiplier: 6.0,
    dropWeight: 4,
    color: '#ff6b6b',
  },
};

// 슬롯별 기본 스탯 (common 기준, statMultiplier 적용)
export const SLOT_BASE_STATS = {
  head:   { defense: 3, maxHp: 20 },
  body:   { defense: 5 },
  arms:   { attack: 5, critRate: 2 },
  wings:  { rageGainRate: 10, speed: 1 },
  legs:   { defense: 3, speed: 1 },
  shoes:  { speed: 2 },
};

// 장비 강화 시스템
export const UPGRADE_SYSTEM = {
  maxUpgradeLevel: 10,
  // 강화 1레벨당 스탯 증가률 (%)
  statIncreasePerLevel: 8,      // +8% per upgrade
  // 강화 비용 (골드) = baseCost * level^costCurve
  baseCost: 50,
  costCurve: 1.5,
  // 강화 성공률 (%)
  successRate: {
    1: 100, 2: 100, 3: 95, 4: 90,
    5: 80,  6: 70,  7: 60, 8: 50,
    9: 40,  10: 30,
  },
  // 실패 시: 강화 레벨 유지 (파괴 없음, 요정세계 세계관: 평화적)
  onFail: 'keep',
};


// ====================================================
// 스킬 시스템
// ====================================================

// --- 스킬 유형 ---
// 1. 패시브 스킬: 자동 발동, 조건부 상시 적용
// 2. 액티브 스킬: 분노 게이지 100% 시 자동 발동 (수동 클릭 없음)

export const SKILL_SYSTEM = {
  // 주인공 영웅의 액티브 스킬
  heroActiveSkill: {
    name: '정화의 빛',
    emoji: '✨',
    description: '분노 게이지 100% 시 자동 발동. 모든 적에게 강력한 빛의 폭발을 일으킨다.',
    type: 'active',
    triggerType: 'rage_auto',     // 분노 게이지 자동 발동
    // 데미지 공식: (attack * multiplier) + (level * levelScaling)
    damageMultiplier: 3.0,        // 기본 공격력의 3배
    levelScaling: 2,              // 레벨당 추가 데미지 +2
    // 연출
    effectType: 'screen_flash',   // 화면 전체 빛 폭발
    effectColor: '#fff8b8',       // 밝은 금빛
    effectDuration: 800,          // ms
    // 효과 범위
    aoe: true,                    // 전체 범위 (화면 내 모든 적)
    // 추가 효과
    bonusEffects: {
      purify: true,               // 정화 효과 (오염된 정령에게 추가 데미지 20%)
      heal: 0.1,                  // 최대 HP의 10% 회복
    },
  },

  // 주인공 패시브 스킬 (주인공 본인에게는 스테이지1 미적용)
  heroPassiveSkill: {
    name: '빛의 축복',
    description: '빛 속성 동료의 공격력 10% 증가',
    type: 'passive',
    // ※ 스테이지1에서는 주인공 본인 패시브 미적용
    // ※ 다른 영웅을 영웅 슬롯에 장착했을 때만 작동
    stage1Active: false,          // 스테이지1에서 본인 패시브 비활성
    combatActive: true,           // 전투(스테이지2)에서는 활성
    effect: {
      target: 'ally_same_attribute', // 같은 속성 동료에게 적용
      stat: 'attack',
      modifier: 1.10,               // 10% 증가
    },
  },
};


// ====================================================
// 분노 게이지 시스템
// ====================================================

export const RAGE_GAUGE = {
  maxRage: 100,
  startRage: 0,

  // --- 게이지 충전 조건 ---
  fillRates: {
    // 스테이지 1 (캔디 퍼즐)
    stage1: {
      candyTileClear: 2,         // 타일 1개 제거 시 +2%
      match3: 6,                 // 3매치 +6%
      match4: 10,                // 4매치 +10%
      match5: 16,                // 5매치 +16%
      match6plus: 24,            // 6+매치 +24%
      comboBonus: 4,             // 콤보당 추가 +4%
      tShapeLShape: 8,           // T/L 매치 보너스 +8%
    },
    // 스테이지 2 (전투)
    stage2: {
      enemyKill: 12,             // 일반 적 처치 +12%
      bossHit: 5,                // 보스 타격 시 +5%
      allyAbilityHit: 3,        // 동료 정령 능력 적중 +3%
      playerDamaged: 8,          // 피격 시 +8% (역전 요소)
    },
  },

  // --- 분노 게이지 자동 발동 ---
  autoTrigger: {
    enabled: true,
    threshold: 100,               // 100%에서 발동
    // 발동 후 게이지 리셋
    resetAfterTrigger: true,
    resetTo: 0,
    // 발동 후 쿨타임 (즉시 다시 충전 가능)
    cooldownAfterTrigger: 500,    // ms (연출 시간)
  },

  // --- 분노 스킬 연출 시스템 ---
  skillAnimation: {
    // ✦ 스테이지1 (캔디 보드)
    stage1: {
      // 주인공: 주사위 셀 → 화면 중앙 → 임팩트 → 돌아옴
      mainHero: {
        startFrom: 'dice_cell',          // 주사위 위치에서 출발
        flyToCenter: true,
        flightDuration: 400,             // ms — 중앙 도달
        impactDelay: 100,                // ms — 중앙 도착 후 대기
        impactDuration: 600,             // ms — 스킬 임팩트 연출
        returnDuration: 350,             // ms — 원래 자리 귀환
      },
      // 슬롯 영웅: 각 영웅슬롯 → 그 자리에서 연출 → 돌아옴
      slotHeroes: {
        enabled: true,
        startFrom: 'hero_slot_cell',     // 각자 영웅슬롯 위치
        activateDelay: 200,              // ms — 주인공 도착 후 대기
        animationType: 'burst_in_place', // 제자리에서 확대+빛 폭발
        burstScale: 1.8,                 // 확대 비율
        burstDuration: 500,              // ms
        returnDuration: 300,             // ms
      },
      // 임팩트 (화면 중앙 폭발)
      impact: {
        type: 'radial_burst',            // 방사형 폭발
        emoji: '✨',
        rings: 3,                        // 폭발 파동 3겹
        ringDelay: 120,                  // ms — 파동 간격
        screenShake: true,
        shakeDuration: 300,
        shakeIntensity: 6,               // px
        flashColor: '#fff8b8',
        flashDuration: 200,
      },
      // 효과: 캔디 타일 광범위 제거
      effect: {
        type: 'clear_candy_tiles',
        clearPercent: 0.75,              // 전체 캔디 타일의 75% 제거
        clearAnimation: 'golden_wave',   // 금빛 파동으로 퍼져나가며 제거
        waveDuration: 600,               // ms
        waveDelay: 50,                   // ms — 타일 간 딜레이
        scorePerTile: 10,                // 제거된 타일당 보너스 점수
      },
    },

    // ✦ 스테이지2 (전투)
    stage2: {
      // 주인공 + 슬롯 영웅 전원 동시 발동
      allHeroes: true,
      mainHero: {
        flyToCenter: true,
        flightDuration: 350,
        impactDuration: 800,
        returnDuration: 300,
      },
      slotHeroes: {
        enabled: true,
        formationType: 'v_shape',        // V진형으로 주인공 뒤에 배치
        chargeDelay: 150,                // ms — 주인공 발동 후
        chargeDuration: 600,
      },
      // 효과: 전체 몬스터 대상 광범위 공격
      effect: {
        type: 'aoe_all_enemies',
        damageMultiplier: 3.0,           // 주인공 ATK × 3
        slotHeroDamageMultiplier: 1.5,   // 슬롯 영웅 ATK × 1.5
        bossReduction: 0.5,              // 보스에게는 50% 감소
        screenEffect: 'golden_flash',
        healPercent: 0.1,                // 발동 후 HP 10% 회복
      },
    },
  },

  // --- 분노 게이지 아이콘 연출 ---
  // 주인공 얼굴에 분노가 이글거리는 연출
  icon: {
    // 기본 상태: 평화로운 요정 얼굴 🧚
    normalEmoji: '🧚',
    // 분노 충전 중: 점점 화가 나는 연출
    chargingPhases: [
      { threshold: 0,   emoji: '🧚', label: '평온', color: '#86efac',  effect: 'none' },
      { threshold: 25,  emoji: '😤', label: '집중', color: '#67e8f9',  effect: 'slight_glow' },
      { threshold: 50,  emoji: '😠', label: '분노', color: '#fbbf24',  effect: 'pulse_glow' },
      { threshold: 75,  emoji: '🤬', label: '격노', color: '#ff8c00',  effect: 'fire_aura' },
      { threshold: 100, emoji: '💢', label: '폭발', color: '#ff3333',  effect: 'explode_ready' },
    ],
    // 분노 게이지 분출 시 연출
    triggerAnimation: {
      emoji: '🔥',
      screenShake: true,
      flashColor: '#fff8b8',
      flashDuration: 300,         // ms
      soundEffect: 'rage_burst',  // 효과음 키
    },
    // 분출 후 다시 평온으로 돌아감
    resetAnimation: {
      emoji: '🧚',
      duration: 500,              // ms
      fadeBack: true,
    },
  },

  // --- 분노 게이지 UI ---
  ui: {
    position: 'below-hp',         // HP바 아래에 표시
    width: 120,
    height: 12,
    borderRadius: 6,
    // 게이지 색상 그라데이션 (충전 단계별)
    gradientStops: [
      { at: 0,   color: '#86efac' },  // 초록 (평온)
      { at: 25,  color: '#67e8f9' },  // 시안 (집중)
      { at: 50,  color: '#fbbf24' },  // 골드 (분노)
      { at: 75,  color: '#ff8c00' },  // 오렌지 (격노)
      { at: 100, color: '#ff3333' },  // 빨강 (폭발 직전)
    ],
    // 게이지 옆 미니 아이콘 (현재 분노 단계 이모지)
    showPhaseIcon: true,
    iconSize: 20,
    // 가득 찼을 때 반짝이는 효과
    fullEffect: 'pulse_border',
    fullBorderColor: '#ff3333',
  },
};


// ====================================================
// 패시브 스킬 전투 시스템 (스테이지2 전용)
// ====================================================

// 패시브 스킬은 스테이지2 전투에서 핵심 역할
// ※ 반대 속성 영웅이 해당 속성 적에게 추가 데미지 (상성 시스템 강화)
// ※ 출현 빈도: 반대 속성 적이 더 자주 등장하여 전략적 영웅 선택을 유도

export const PASSIVE_COMBAT_SYSTEM = {
  // 속성 상성 강화 (패시브 적용 시)
  attributeAdvantage: {
    enabled: true,
    // 유리 속성 추가 데미지 (기본 1.3배에 패시브 보너스 추가)
    passiveBonusDamage: 0.2,       // 패시브 보유 시 상성 데미지 +20% → 총 1.5배
    // 불리 속성 데미지 감소 경감
    passiveResistReduction: 0.1,   // 불리 데미지 0.7 → 0.8로 경감
  },

  // 출현 빈도 시스템 (전투에서 적 속성 분배)
  enemySpawnBias: {
    enabled: true,
    // 플레이어 파티의 반대 속성 적이 더 자주 출현
    // 이유: 플레이어가 올바른 영웅을 배치하면 보상 (전략적 플레이 유도)
    counterAttributeWeight: 1.5,   // 반대 속성 적 출현 가중치 ×1.5
    neutralAttributeWeight: 1.0,   // 중립 속성 적 기본 가중치
    sameAttributeWeight: 0.8,      // 같은 속성 적 약간 적게
  },

  // 슬롯 영웅 패시브 효과 중첩 규칙
  stackingRules: {
    sameStat: 'additive',          // 같은 스탯 버프 → 가산 (10% + 8% = 18%)
    differentStat: 'independent',  // 다른 스탯 버프 → 독립 적용
    maxStackPercent: 50,           // 최대 스탯 증가 제한: 50%
  },
};


// ====================================================
// 영웅 장착 슬롯 (다른 영웅 장착 — 차후 업데이트)
// ====================================================

// 주인공 외의 다른 영웅을 장착하여 패시브 스킬을 받는 시스템
// ※ 스테이지1에서만 패시브 적용 (주인공의 패시브는 미적용)
// ※ 스테이지2 전투에서는 동료로 직접 참전

export const HERO_SLOT_SYSTEM = {
  // 영웅 장착 슬롯 수 (5칸)
  maxSlots: 5,

  // 슬롯 해금 조건 (inventory-config.js와 동기화)
  slotUnlock: {
    slot1: { stage: 1 },         // 기본 해금
    slot2: { stage: 1 },         // 기본 해금
    slot3: { stage: 2 },         // 스테이지 2 클리어 후 해금
    slot4: { stage: 3 },         // 스테이지 3 클리어 후 해금
    slot5: { stage: 4 },         // 스테이지 4 클리어 후 해금
    slot6: { level: 30 },        // 영웅 레벨 30 달성 시 해금
  },

  // --- 중복 장착 제한 ---
  // 같은 등급 + 같은 속성의 영웅은 중복 장착 금지
  // ※ 에픽(epic) 및 레전드리(legendary)만 적용
  // ※ 일반(common), 레어(rare), 매직(magic)은 중복 제한 없음
  duplicationRules: {
    // 중복 체크가 적용되는 등급
    restrictedRarities: ['epic', 'legendary'],
    // 중복 체크 조건: 같은 rarity + 같은 attribute → 장착 불가
    checkFields: ['rarity', 'attribute'],
    // 자유로운 등급 (중복 제한 없음)
    freeRarities: ['common', 'rare', 'magic'],
  },

  // --- 장착 영웅의 패시브 효과 적용 규칙 ---
  passiveRules: {
    // 스테이지1: 장착된 다른 영웅의 패시브만 적용 (주인공 패시브 미적용)
    stage1: {
      mainHeroPassive: false,     // 주인공 패시브 OFF
      equippedHeroPassive: true,  // 장착 영웅 패시브 ON
      mainHeroActive: true,       // 주인공 액티브(분노) ON
      equippedHeroActive: false,  // 장착 영웅 액티브 OFF
    },
    // 스테이지2 (전투): 모두 적용
    stage2: {
      mainHeroPassive: true,
      equippedHeroPassive: true,
      mainHeroActive: true,
      equippedHeroActive: true,   // 전투에서는 동료로 참전하므로 액티브도 사용
    },
  },
};


// ====================================================
// 속성 시스템 (영웅 & 정령 공유)
// ====================================================

export const ATTRIBUTES = {
  light:  { name: '빛',  emoji: '✨', color: '#fff8b8', strong: 'dark',  weak: 'dark'  },
  dark:   { name: '어둠', emoji: '🌑', color: '#8b5cf6', strong: 'light', weak: 'light' },
  fire:   { name: '불',  emoji: '🔥', color: '#ff6b6b', strong: 'earth', weak: 'water' },
  water:  { name: '물',  emoji: '💧', color: '#60a5fa', strong: 'fire',  weak: 'earth' },
  earth:  { name: '땅',  emoji: '🪨', color: '#a3e635', strong: 'water', weak: 'fire'  },
  wind:   { name: '바람', emoji: '🌪️', color: '#67e8f9', strong: 'earth', weak: 'fire'  },
};

// 속성 상성 데미지 배율
export const ATTRIBUTE_MULTIPLIER = {
  strong: 1.3,                    // 유리 속성: 데미지 30% 증가
  weak: 0.7,                      // 불리 속성: 데미지 30% 감소
  neutral: 1.0,                   // 중립: 보정 없음
};


// ====================================================
// 추가 영웅 목록 (차후 업데이트 — 가챠/이벤트 획득)
// ====================================================

export const HERO_ROSTER = [
  // --- 메인 영웅 (기본 보유) ---
  {
    key: 'fairy_of_light',
    name: '빛의 요정',
    emoji: '🧚',
    attribute: 'light',
    rarity: 'legendary',
    isMainHero: true,
    activeSkill: {
      name: '정화의 빛',
      emoji: '✨',
      description: '화면 내 모든 적에게 빛 폭발 (공격력 ×3)',
      damageMultiplier: 3.0,
      aoe: true,
    },
    passiveSkill: {
      name: '빛의 축복',
      description: '빛 속성 동료 공격력 10% 증가',
      effect: { target: 'ally_same_attribute', stat: 'attack', modifier: 1.10 },
    },
  },

  // --- 에픽 영웅 ---
  {
    key: 'flame_fairy',
    name: '화염의 요정',
    emoji: '🔥',
    attribute: 'fire',
    rarity: 'epic',
    activeSkill: {
      name: '불꽃 폭풍',
      emoji: '🌋',
      description: '전방 넓은 범위 화염 데미지 (공격력 ×2.5)',
      damageMultiplier: 2.5,
      aoe: true,
    },
    passiveSkill: {
      name: '불꽃의 의지',
      description: '불 속성 동료 공격력 8% 증가',
      effect: { target: 'ally_same_attribute', stat: 'attack', modifier: 1.08 },
    },
  },
  {
    key: 'ice_fairy',
    name: '얼음의 요정',
    emoji: '❄️',
    attribute: 'water',
    rarity: 'epic',
    activeSkill: {
      name: '빙결의 숨결',
      emoji: '🧊',
      description: '적 전체 3초간 이동속도 50% 감소 + 데미지 (공격력 ×2)',
      damageMultiplier: 2.0,
      aoe: true,
      debuff: { stat: 'speed', modifier: 0.5, duration: 3000 },
    },
    passiveSkill: {
      name: '서리의 보호',
      description: '물 속성 동료 방어력 12% 증가',
      effect: { target: 'ally_same_attribute', stat: 'defense', modifier: 1.12 },
    },
  },
  {
    key: 'storm_fairy',
    name: '폭풍의 요정',
    emoji: '⚡',
    attribute: 'wind',
    rarity: 'epic',
    activeSkill: {
      name: '번개 연쇄',
      emoji: '⚡',
      description: '무작위 적 5회 연쇄 번개 (공격력 ×1.5 × 5)',
      damageMultiplier: 1.5,
      hitCount: 5,
      targetType: 'random',
    },
    passiveSkill: {
      name: '질풍의 가호',
      description: '모든 동료 이동속도 15% 증가',
      effect: { target: 'all_allies', stat: 'speed', modifier: 1.15 },
    },
  },

  // --- 레전드리 영웅 ---
  {
    key: 'shadow_fairy',
    name: '그림자 요정',
    emoji: '🌑',
    attribute: 'dark',
    rarity: 'legendary',
    activeSkill: {
      name: '어둠의 포옹',
      emoji: '🌀',
      description: '가장 강한 적 1기에게 공격력 ×5 단일 데미지 + HP 흡수 30%',
      damageMultiplier: 5.0,
      aoe: false,
      targetType: 'strongest',
      lifesteal: 0.3,
    },
    passiveSkill: {
      name: '그림자의 속삭임',
      description: '전체 동료 치명타 확률 5% 증가',
      effect: { target: 'all_allies', stat: 'critRate', modifier: 5 },
    },
  },
  {
    key: 'earth_guardian',
    name: '대지의 수호자',
    emoji: '🌿',
    attribute: 'earth',
    rarity: 'legendary',
    activeSkill: {
      name: '대지의 분노',
      emoji: '🪨',
      description: '전체 적에게 공격력 ×2.5 + 아군 전원 방어력 30% 증가 5초',
      damageMultiplier: 2.5,
      aoe: true,
      buff: { target: 'all_allies', stat: 'defense', modifier: 1.3, duration: 5000 },
    },
    passiveSkill: {
      name: '대지의 축복',
      description: '전체 동료 최대HP 15% 증가',
      effect: { target: 'all_allies', stat: 'maxHp', modifier: 1.15 },
    },
  },

  // --- 레어 영웅 (중복 제한 없음) ---
  {
    key: 'flower_sprite',
    name: '꽃의 정령',
    emoji: '🌸',
    attribute: 'earth',
    rarity: 'rare',
    activeSkill: {
      name: '꽃잎 비',
      emoji: '🌸',
      description: '전체 아군 HP 20% 회복',
      healPercent: 0.2,
      aoe: true,
    },
    passiveSkill: {
      name: '꽃의 치유',
      description: '전투 시작 시 전체 아군 HP 5% 회복',
      effect: { target: 'all_allies', stat: 'hp', modifier: 0.05, trigger: 'battle_start' },
    },
  },
  {
    key: 'spark_spirit',
    name: '불꽃 정령',
    emoji: '🕯️',
    attribute: 'fire',
    rarity: 'rare',
    activeSkill: {
      name: '작은 화염',
      emoji: '🔥',
      description: '가장 가까운 적에게 공격력 ×2 데미지',
      damageMultiplier: 2.0,
      targetType: 'nearest',
    },
    passiveSkill: {
      name: '불꽃의 온기',
      description: '공격력 5% 증가',
      effect: { target: 'self', stat: 'attack', modifier: 1.05 },
    },
  },

  // --- 매직 영웅 (중복 제한 없음) ---
  {
    key: 'crystal_fairy',
    name: '수정 요정',
    emoji: '💎',
    attribute: 'light',
    rarity: 'magic',
    activeSkill: {
      name: '수정 파편',
      emoji: '💎',
      description: '주변 적 3기에게 공격력 ×2 데미지',
      damageMultiplier: 2.0,
      targetCount: 3,
    },
    passiveSkill: {
      name: '수정의 반사',
      description: '피격 시 10% 확률로 데미지 반사',
      effect: { trigger: 'on_hit', chance: 0.1, reflectPercent: 0.5 },
    },
  },
  {
    key: 'mist_fairy',
    name: '안개 요정',
    emoji: '🌫️',
    attribute: 'water',
    rarity: 'magic',
    activeSkill: {
      name: '안개 장막',
      emoji: '🌫️',
      description: '전체 아군 3초간 회피율 30% 증가',
      buff: { target: 'all_allies', stat: 'evasion', modifier: 0.3, duration: 3000 },
    },
    passiveSkill: {
      name: '안개의 은신',
      description: '이동속도 8% 증가',
      effect: { target: 'self', stat: 'speed', modifier: 1.08 },
    },
  },
];


// ====================================================
// 영웅 정보 패널 설정 (장비 슬롯 클릭 시 표시)
// ====================================================

export const HERO_INFO_PANEL = {
  // 패널 구성 요소
  sections: [
    'portrait',                   // 영웅 초상화 (이모지 + 날아다니는 연출)
    'basic_info',                 // 이름, 레벨, 경험치 바
    'stats',                      // 공/방/속/치명타/분노획득률
    'equipment_slots',            // 8개 장비 슬롯 (원형 배치)
    'active_skill',               // 액티브 스킬 정보 + 분노 게이지
    'passive_skill',              // 패시브 스킬 정보
    'hero_slots',                 // 영웅 장착 슬롯 (4개, 차후 업데이트)
  ],
  // 장비 슬롯 배치: 영웅 초상화를 중심으로 8방향 원형 배치
  slotLayout: 'circular',         // 'circular' | 'grid'
  slotRadius: 80,                 // 원형 배치 반경 (px)
};


// ====================================================
// 외형 변경 시스템 (영웅 & 펫 공통)
// ※ 장비를 바꾸면 외형(이모지/비주얼)이 바뀌는 시스템
// ※ 구현: 장비 아이템에 appearanceOverride가 있으면 적용
// ====================================================

export const HERO_APPEARANCE_SYSTEM = {
  enabled: true,

  // 외형 변경이 가능한 영웅 장비 슬롯
  changeableSlots: ['head', 'body', 'wings', 'arms'],

  // 외형 우선순위 (높을수록 우선)
  slotPriority: {
    head: 4,       // 가장 높은 우선순위 (머리 장식)
    body: 3,       // 본체 색상
    wings: 2,      // 배경 효과
    arms: 1,       // 무기 아이콘 (옆에 표시)
  },

  // 외형 변경 연출
  changeAnimation: {
    type: 'sparkle_transform',
    duration: 600,
    particleEmojis: ['✨', '💫', '⭐'],
    flashColor: 'rgba(255, 215, 0, 0.3)',
    // 변신 시퀀스: 현재 → 빛 폭발 → 새 외형
    sequence: [
      { at: 0, action: 'shrink', scale: 0.8 },
      { at: 200, action: 'flash' },
      { at: 400, action: 'reveal_new', scale: 1.2 },
      { at: 600, action: 'settle', scale: 1.0 },
    ],
  },

  // --- 장비별 외형 변경 데이터 예시 ---
  // 머리: 영웅 이모지 위에 작은 장식 표시 또는 이모지 교체
  headDisplay: {
    position: 'top',
    size: 0.4,
    offsetY: -10,
  },
  // 몸통: 아우라 색상 변경
  bodyDisplay: {
    type: 'glow_color_override',   // 아우라 색상을 갑옷 색상으로
  },
  // 날개: 뒤쪽 잔상 효과
  wingsDisplay: {
    type: 'trail_effect',
    trailLength: 3,
    trailOpacity: 0.3,
  },
  // 팔: 영웅 옆에 무기 아이콘 표시
  armsDisplay: {
    position: 'right',             // 오른쪽에 작은 아이콘
    size: 0.5,                     // 영웅 크기의 50%
    offsetX: 8,
    offsetY: -4,
  },
};

// 영웅 장비에 의한 외형 변경 아이템 예시 데이터
export const HERO_APPEARANCE_ITEMS = {
  // 머리 (head)
  heads: [
    { key: 'crown_of_light', name: '빛의 왕관', emoji: '👑', rarity: 'legendary',
      appearanceOverride: { emoji: '👑', glowColor: 'rgba(255, 215, 0, 0.6)', animation: 'crown_glow' } },
    { key: 'iron_helm', name: '강철 투구', emoji: '⛑️', rarity: 'common',
      appearanceOverride: { emoji: '⛑️' } },
    { key: 'mystic_hood', name: '신비의 후드', emoji: '🧙', rarity: 'epic',
      appearanceOverride: { emoji: '🧙', glowColor: 'rgba(155, 138, 255, 0.5)', trail: 'mystic' } },
  ],
  // 팔 (arms)
  arms: [
    { key: 'light_staff', name: '빛의 지팡이', emoji: '🪄', rarity: 'epic',
      appearanceOverride: { emoji: '🪄', glowColor: 'rgba(255, 248, 184, 0.5)' } },
    { key: 'flame_sword', name: '화염의 검', emoji: '🗡️', rarity: 'legendary',
      appearanceOverride: { emoji: '🗡️', glowColor: 'rgba(255, 107, 107, 0.6)', trail: 'flame' } },
  ],
  // 날개 (wings)
  wings: [
    { key: 'wind_cape', name: '바람의 망토', emoji: '🧣', rarity: 'rare',
      appearanceOverride: { trail: 'wind', glowColor: 'rgba(103, 232, 249, 0.4)' } },
    { key: 'shadow_cape', name: '그림자 망토', emoji: '🖤', rarity: 'epic',
      appearanceOverride: { trail: 'shadow', glowColor: 'rgba(139, 92, 246, 0.5)', animation: 'shadow_flicker' } },
  ],
};


// ====================================================
// 밸런스 요약 (개발 참고용)
// ====================================================

// [파워 커브 — 레벨 기준]
// Lv1:   HP 100, ATK 10,  DEF 5,   SPD 3
// Lv10:  HP 172, ATK 28,  DEF 18,  SPD 5.7
// Lv25:  HP 292, ATK 58,  DEF 41,  SPD 10.2
// Lv50:  HP 492, ATK 108, DEF 78,  SPD 17.7
//
// [장비 보정 (6슬롯 풀장착 — epic 기준)]
// Head: DEF +12 / HP +80, Body: DEF +20
// Arms: ATK +20 / CRIT +8, Wings: RAGE +40 / SPD +4
// Legs: DEF +12 / SPD +4, Shoes: SPD +8
// → 총 보정: ATK +20, DEF +44, HP +80, SPD +16, CRIT +8, RAGE +40
//
// [분노 게이지 충전 속도]
// 스테이지1: 3매치 3회 + 콤보 2회 = 6*3 + 4*2 = 26% → 약 4턴에 1회 발동
// 스테이지2: 적 5기 처치 = 60% + 피격 3회 = 24% + 보스 2타 = 10% → 약 94%
// → 전투 중 1~2회 발동 (게임 체인저, 남발 불가)
//
// [중복 제한 예시]
// ✅ 에픽 불 + 에픽 물 → OK (속성 다름)
// ❌ 에픽 불 + 에픽 불 → 불가 (같은 등급 + 같은 속성)
// ✅ 레어 불 + 레어 불 → OK (레어는 제한 없음)
// ❌ 레전드리 빛 + 레전드리 빛 → 불가 (주인공과 중복)
