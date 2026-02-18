// ====================================================
// 스테이지 2: 횡스크롤 서바이벌 전투 시스템 설계
// 스테이지 1 완료 후 구현 예정
// ====================================================

// --- 전투 참가자 ---
// 아군: 영웅 요정(🧚) + 소환의 나무에서 소환된 정령들
// 적군: 오염된 정령 + 아기 버섯돌이 (일반몹) → 오염된 요정 (보스)

// --- 시각 연출 규칙 ---
// 요정/정령 (아군+적 요정): 날아다니는 연출 (공중, fairyFloat 시스템 적용)
// 버섯돌이 (적 일반몹): 땅에서 걸어 내려오는 연출 (지상, 걸어다님)

// --- 전투 흐름 ---
// Phase 1: 일반몹 웨이브 (오염된 정령 + 아기 버섯돌이)
//   - 횡스크롤 서바이벌 방식, 넓은 필드
//   - 모든 일반몹 처치 시 Phase 2로 전환
// Phase 2: 배틀 아레나 (보스전 - 오염된 요정)
//   - 독립된 전투 공간으로 전환
//   - 축구장처럼 넓은 타일 공간
//   - 전방향 이동 가능 (좌우뿐 아니라 상하좌우 대각선 모두)
//   - 자동 공격: 적 영웅을 향해 계속 공격
//   - 공중전 모드: 요정 설정에 맞는 공중 전투 (점진적 해금)
// Phase 3: 스테이지 마무리
//   - 적 요정 처치 → 승리
//   - 아이템 수집 화면 연출 (아이템이 날아오는 애니메이션)
//   - 화면 전환 → 다음 화면에서 아이템 확인 (수집 중에는 확인 불가)

// --- 배틀 아레나 시스템 ---
export const BATTLE_ARENA_CONFIG = {
  // 아레나 크기 (캔버스 기준)
  width: 800,
  height: 600,
  // 타일이 아닌 자유 이동 공간
  movementType: 'free',        // 'free' = 전방향 이동
  // 자동 공격 시스템
  autoAttack: true,
  autoAttackInterval: 800,     // ms 단위 공격 간격
  // 공중전 모드
  aerialCombat: {
    enabled: true,
    // 차차 해금되는 시스템 (스테이지별)
    unlockStage: 3,            // 스테이지 3부터 공중전 해금
  }
};

// --- 해금 시스템 ---
// 유저가 재미를 느끼도록 점진적으로 해금
export const UNLOCK_PROGRESSION = {
  stage1: {
    battleArena: false,        // 스테이지 1: 아레나 없음, 일반 서바이벌만
    aerialCombat: false,
    bossType: null,            // 보스 없음
  },
  stage2: {
    battleArena: true,         // 스테이지 2: 배틀 아레나 해금!
    aerialCombat: false,       // 공중전은 아직 잠김
    bossType: 'ground',        // 지상 보스전
  },
  stage3: {
    battleArena: true,
    aerialCombat: true,        // 스테이지 3: 공중전 해금!
    bossType: 'aerial',        // 공중 보스전
  },
  stage4: {
    battleArena: true,
    aerialCombat: true,
    bossType: 'aerial_boss',   // 최종보스: 버섯돌이 대마왕 공중전
  }
};

// ====================================================
// 보스방 (Boss Room) — 스테이지 끝 독립 전투 공간
// ====================================================
// 일반몹 → 보스방 입구 도달 → 진입 → 보스 활성화 → 전투 → 아이템 → 마무리
// 나중에 공중전(aerial_combat)도 이 공간에서 치른다

export const BOSS_ROOM_CONFIG = {

  // --- 보스방 공간 설계 (전맵 크기) ---
  arena: {
    // 전맵 규모 배틀아레나
    width: 4000,               // 캔버스 논리 너비 (카메라 스크롤)
    height: 2000,              // 캔버스 논리 높이 (카메라 스크롤)
    // 실제 이동 가능 영역 (벽 안쪽)
    playArea: {
      x: 60,
      y: 60,
      width: 3880,             // 4000 - 60*2
      height: 1880,            // 2000 - 60*2
    },
    movementType: 'free',      // 전방향 자유 이동

    // 배경 테마 (스테이지별 다름)
    themes: {
      forest_clearing: {
        name: '숲속 공터',
        floorColor: '#1a2e1a',
        wallColor: '#0d1f0d',
        ambientParticles: ['🍃', '✨'],
        bgMusic: 'boss_forest',
      },
      crystal_cave: {
        name: '수정 동굴',
        floorColor: '#1a1a2e',
        wallColor: '#0d0d1f',
        ambientParticles: ['💎', '✨'],
        bgMusic: 'boss_crystal',
      },
      mushroom_throne: {
        name: '버섯 왕좌',
        floorColor: '#2e1a1a',
        wallColor: '#1f0d0d',
        ambientParticles: ['🍄', '☠️'],
        bgMusic: 'boss_final',
      },
      sky_platform: {
        name: '하늘 전투장',
        floorColor: '#1a1a3e',
        wallColor: '#0d0d2f',
        ambientParticles: ['☁️', '⭐', '✨'],
        bgMusic: 'boss_aerial',
      },
    },
  },

  // --- 보스방 입구 (게이트) ---
  gate: {
    // 일반 전투 필드 우측 끝에 보스방 입구 표시
    emoji: '🚪',
    width: 80,
    height: 120,
    // 입구 활성 조건: 해당 웨이브의 일반몹 전멸
    activateOnAllEnemiesDefeated: true,
    // 게이트 비활성 시각
    inactiveStyle: {
      opacity: 0.3,
      glow: null,
      label: '???',
    },
    // 게이트 활성 시각
    activeStyle: {
      opacity: 1.0,
      glow: 'rgba(251, 191, 36, 0.6)',
      label: '보스 출현!',
      pulseAnimation: true,
    },
    // 플레이어가 게이트 영역에 닿으면 진입
    enterRadius: 60,
  },

  // --- 보스 활성화 시퀀스 ---
  bossActivation: {
    // 진입 직후 보스는 비활성 (연출용)
    initialState: 'dormant',   // dormant → awakening → active
    // 각 상태 지속 시간
    dormantDuration: 1000,     // 1초: 보스방 전경 보여주기
    awakeningDuration: 2000,   // 2초: 보스 깨어남 연출

    // 깨어남 연출
    awakeningSequence: [
      { at: 0,    action: 'camera_pan_to_boss',   desc: '카메라가 보스 위치로 이동' },
      { at: 500,  action: 'boss_eye_open',         desc: '보스 눈뜨기 (이모지 변화)' },
      { at: 1000, action: 'boss_roar',             desc: '보스 포효 (화면 흔들림 + 이펙트)' },
      { at: 1500, action: 'boss_hp_bar_appear',    desc: 'HP바 등장 (상단 슬라이드)' },
      { at: 2000, action: 'combat_start',          desc: '전투 시작 — 보스 active' },
    ],

    // 보스 포효 이펙트
    roarEffect: {
      screenShake: { intensity: 6, duration: 400 },
      flash: { color: 'rgba(255, 100, 100, 0.3)', duration: 300 },
      particles: { emojis: ['💀', '💢', '🔥'], count: 12, spread: 200 },
      soundCue: 'boss_roar',
    },
  },

  // --- 보스 HP 바 (상단 고정) ---
  bossHpBar: {
    position: 'top',           // 화면 상단 고정 (HUD 패널 아래)
    height: 28,
    margin: 88,                // HUD 영역(~84px) 아래에 배치
    showName: true,            // 보스 이름 표시
    showEmoji: true,           // 보스 이모지 표시
    // 단계별 색상 변화
    colorPhases: [
      { threshold: 0.6, color: '#22c55e', label: '' },           // 60%+ 초록
      { threshold: 0.3, color: '#fbbf24', label: '분노!' },     // 30%+ 노랑
      { threshold: 0.0, color: '#ff6b6b', label: '폭주!!' },    // 0%+ 빨강
    ],
    // 보스 HP 낮을 때 행동 변화
    enrageThreshold: 0.3,      // HP 30% 이하: 분노 모드
  },

  // --- 스테이지별 보스방 매핑 ---
  stageMapping: {
    // stage1: 보스 없음 (null)
    1: null,
    // stage2: 감염된 숲의 장로 — 숲속 공터
    2: {
      bossType: 'boss_infected_elder',
      theme: 'forest_clearing',
      combatMode: 'ground',        // 지상전
      modifiers: [],
    },
    // stage3: 오염된 호수 정령 — 수정 동굴
    3: {
      bossType: 'boss_lake_corruption',
      theme: 'crystal_cave',
      combatMode: 'ground',        // 지상전 (공중전 해금되면 aerial)
      modifiers: ['poison_floor'],  // 바닥에 독 웅덩이 생성
    },
    // stage4: 버섯돌이 대마왕 — 버섯 왕좌
    4: {
      bossType: 'boss_mushroom_king',
      theme: 'mushroom_throne',
      combatMode: 'ground',        // 1페이즈 지상 → 2페이즈 공중전
      modifiers: ['spore_rain', 'minion_summon'],
      // 2페이즈 전환 (HP 50% 이하 시)
      phaseTransition: {
        hpThreshold: 0.5,
        switchTo: 'aerial',        // 공중전 모드로 전환
        theme: 'sky_platform',     // 하늘 전투장으로 배경 전환
        cutscene: 'boss_takes_flight', // 보스가 날아오르는 컷씬
      },
    },
  },

  // --- 보스방 환경 요소 ---
  environment: {
    // 장애물 (보스별 배치)
    obstacles: {
      pillar:       { emoji: '🪨', radius: 25, destructible: false, blockProjectile: true },
      crystal:      { emoji: '💎', radius: 20, destructible: true, hp: 50, dropOnBreak: 'heal_orb' },
      mushroom_cap: { emoji: '🍄', radius: 30, destructible: true, hp: 30, dropOnBreak: 'poison_cloud' },
    },
    // 바닥 효과 (보스 스킬로 생성)
    floorEffects: {
      poison_pool:  { emoji: '💚', radius: 40, damage: 5, tickRate: 1000, duration: 5000 },
      fire_zone:    { emoji: '🔥', radius: 35, damage: 8, tickRate: 800,  duration: 4000 },
      heal_zone:    { emoji: '💚', radius: 30, healAmount: 3, tickRate: 1000, duration: 6000, forPlayer: true },
    },
    // 아이템 오브 (보스전 중 생성)
    orbs: {
      heal_orb:     { emoji: '💚', healAmount: 20, lifetime: 8000 },
      rage_orb:     { emoji: '🔥', rageAmount: 15, lifetime: 6000 },
      speed_orb:    { emoji: '⚡', speedBoost: 1.5, duration: 5000, lifetime: 8000 },
    },
  },

  // --- 보스 처치 후 시퀀스 ---
  victorySequence: {
    // 보스 폭발 연출
    bossDeathAnimation: {
      duration: 1500,
      phases: [
        { at: 0,    effect: 'boss_stagger',  desc: '보스 비틀거림' },
        { at: 500,  effect: 'boss_flash',    desc: '보스 깜빡임 (빠르게)' },
        { at: 1000, effect: 'boss_explode',  desc: '보스 폭발 (파티클 + 화면 흔들림)' },
        { at: 1200, effect: 'loot_burst',    desc: '아이템 쏟아짐' },
      ],
    },
    // 아이템 수집 시간
    lootCollectDuration: 3000,
    // 아이템 자동 흡수 (자석처럼 플레이어로)
    autoCollectItems: true,
    autoCollectDelay: 1000,      // 1초 후 자동 흡수 시작
    // 스테이지 클리어 전환
    clearTransitionDelay: 2000,  // 수집 후 2초 뒤 클리어 화면
  },

  // --- 공중전 확장 슬롯 (나중에 aerial_combat 구현 시 사용) ---
  aerialExtension: {
    // 공중전 시 보스방 변환
    transitionToAerial: {
      // 바닥 사라지고 하늘 배경으로
      floorFade: true,
      skyBackground: true,
      // 구름 파티클 추가
      cloudParticles: true,
      // 이동 축 변경: 좌우 → 좌우+상하 자유비행
      movementAxes: 'both',
      // 부스터 질주 사용 가능
      boosterEnabled: true,
    },
    // content-backlog.js의 aerial_combat 참조
    backlogRef: 'aerial_combat',
  },
};

// ====================================================
// 보스 접근 시스템 (Boss Approach) — 우측에서 보스가 다가옴
// ====================================================
// 좌측 포자안개(AutoScroll) + 우측 보스접근(BossApproach) → 집게 효과
// 플레이어 영역 점점 축소 → 만남 → 배틀아레나 동적 생성 → 보스전
export const BOSS_APPROACH_CONFIG = {
  baseSpeed: 0.3,              // px/frame @60fps
  accel: 0.00004,              // 가속도/ms
  warningZone: 150,            // 경고 구간 px
  timerAccelMultiplier: 5.0,   // 타이머 종료 후 속도 배율
  timerAccelMinSpeed: 8.0,     // 타이머 종료 후 최소 속도
  minGap: 300,                 // AutoScroll과 최소 간격 px
  arenaFormDuration: 1500,     // 아레나 형성 시간 ms
  meetingDuration: 500,        // 만남 전환 시간 ms
  startDelay: 5000,            // 스테이지 시작 후 접근 시작 딜레이 ms
  bossRoomTimeLimit: 300000,   // 보스방 최대 시간 ms (5분) → 초과 시 자동 클리어
  visual: {
    fogColorInner: 'rgba(60,0,0,0.9)',
    fogColorOuter: 'rgba(120,20,30,0)',
    particleColor: '#ff4444',
    bossEmoji: '\uD83C\uDF44',    // 🍄
    warningEmoji: '\u2620\uFE0F', // ☠️
  },
  stageOverrides: {
    1: { baseSpeed: 0.2, accel: 0.00003 },
    2: { baseSpeed: 0.3, accel: 0.00004 },
    3: { baseSpeed: 0.35, accel: 0.00005 },
    4: { baseSpeed: 0.4, accel: 0.00006 },
  },
};

// --- 적 유닛 분류 ---
export const ENEMY_MOVEMENT_TYPE = {
  // 지상 유닛 (걸어다님)
  ground: ['spore_fairy', 'moss_golem', 'bark_knight', 'boss_mushroom_king'],
  // 공중 유닛 (날아다님 - fairyFloat 적용)
  aerial: ['thorn_sprite', 'fungal_beast', 'spore_caster',
           'boss_infected_elder', 'boss_lake_corruption'],
};

// --- 전투 완료 후 ---
// 1. 적 요정(보스) 처치
// 2. 아이템 수집 화면 연출 (아이템들이 화면 중앙으로 날아옴)
// 3. 화면 전환 (아이템은 다음 화면에서 확인)
// 4. 스테이지 클리어 → 다음 스테이지 or 게임 클리어

export const VICTORY_SEQUENCE = {
  // 아이템 수집 연출 시간 (ms)
  itemCollectDuration: 2000,
  // 아이템 확인은 다음 화면에서
  showItemsOnNextScreen: true,
  // 수집 연출: 아이템이 중앙으로 모이는 애니메이션
  collectAnimation: 'fly-to-center',
};
