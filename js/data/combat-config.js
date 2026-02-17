// ====================================================
// 스테이지 2: 라스트워 서바이벌 전투 시스템 설계
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
//   - 라스트워 서바이벌 방식, 넓은 필드
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
