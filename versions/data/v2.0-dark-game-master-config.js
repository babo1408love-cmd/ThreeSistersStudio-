// ╔══════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║   몽글벨 (Monglebel) — 게임 마스터 설계서                      ║
// ║   Game Master Configuration & Blueprint                      ║
// ║                                                              ║
// ║   이 파일은 게임 전체의 "큰맥락"을 한 곳에 정리한 문서입니다.     ║
// ║   새로운 시스템을 추가하거나 밸런스를 조정할 때                   ║
// ║   항상 이 파일을 먼저 참고하세요.                               ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════╝

// ============================================================
// 1장. 세계관 (World Setting)
// ============================================================
//
// 【배경】
//   요정들이 화목하게 살던 마법의 세계.
//   어느 날 "버섯돌이 대마왕"이 나타나 포자를 뿌려
//   요정과 정령들을 감염시키기 시작했다.
//
// 【주인공】
//   플레이어 = 요정(🧚). 감염되지 않은 마지막 영웅.
//   소환의 나무에서 정령을 소환하고, 감염된 동료를 구출하며
//   대마왕을 물리치는 것이 목표.
//
// 【사망 설정 없음】
//   정령은 "죽지 않음" → HP 0이 되면 "소환의 나무로 귀환"
//   30초 후 재소환 가능 (어린이/전연령 타겟)
//
// 【적 세력】
//   - 일반몹: 감염된 슬라임 (10종) — 귀여운 디자인
//   - 중간보스: 감염된 정령 (boss_infected_elder 등)
//   - 최종보스: 버섯돌이 대마왕 (boss_mushroom_king)
//
// 【5대 지역】 (스테이지 진행순)
//   1~10:  요정의 숲 (Forest)     — 초록, 평화로운 시작
//   11~20: 수정 동굴 (Cave)       — 파랑, 어둡고 신비로운
//   21~30: 모래 사막 (Desert)     — 노랑, 건조하고 뜨거운
//   31~40: 불꽃 화산 (Volcano)    — 빨강, 위험하고 강력한
//   41+:   마왕성 (Demon Castle)  — 보라, 최종 결전

export const WORLD_SETTING = {
  regions: [
    { id: 'forest',  name: '요정의 숲',  stages: [1, 10],   theme: 'fairy_garden',  color: '#22c55e' },
    { id: 'cave',    name: '수정 동굴',  stages: [11, 20],  theme: 'crystal_cave',  color: '#3b82f6' },
    { id: 'desert',  name: '모래 사막',  stages: [21, 30],  theme: 'desert',        color: '#eab308' },
    { id: 'volcano', name: '불꽃 화산',  stages: [31, 40],  theme: 'volcano',       color: '#ef4444' },
    { id: 'castle',  name: '마왕성',     stages: [41, 999], theme: 'demon_castle',  color: '#7c3aed' },
  ],
  villain: '버섯돌이 대마왕',
  heroEmoji: '🧚',
  noDeathSetting: true,   // 정령은 죽지 않고 소환의 나무로 귀환
  respawnTime: 30,        // 초
};


// ============================================================
// 2장. 게임 플로우 (Game Flow)
// ============================================================
//
// 【메인 루프】 한 스테이지 = Stage1(퍼즐) → 소환실 → Stage2(전투)
//
//   ┌─────────────────────────────────────────────────────┐
//   │  메인 메뉴 (MainMenuScene)                          │
//   │    ├─ 새 게임 / 이어하기                             │
//   │    └─ 허브 접근 (월드맵, 던전, 서바이벌, 가챠 등)      │
//   └──────────────┬──────────────────────────────────────┘
//                  ▼
//   ┌─────────────────────────────────────────────────────┐
//   │  Stage 1: 퍼즐 (Stage1Scene)                        │
//   │    - 사천성 (Shisen Match) — 타일 매칭 퍼즐          │
//   │    - 매치 180개 클리어 (스테이지↑ +15%)             │
//   │    - 매치 6회 = 정령 조각 1세트                      │
//   │    - 3분 타이머 (StageTimer)                        │
//   │    → 클리어 시 소환실로 이동                         │
//   └──────────────┬──────────────────────────────────────┘
//                  ▼
//   ┌─────────────────────────────────────────────────────┐
//   │  소환실 (SummoningRoomScene) — 체크포인트            │
//   │    - 🌳 정령 소환 (조각 6개 → 정령 1마리)            │
//   │    - 🐉 펫 진화 (레전드 조각 6개 → 레전드 펫)        │
//   │    - 자동 세이브 (체크포인트)                         │
//   │    → 전투 준비 완료 → Stage 2로                      │
//   └──────────────┬──────────────────────────────────────┘
//                  ▼
//   ┌─────────────────────────────────────────────────────┐
//   │  Stage 2: 전투 (Stage2Scene) — Canvas 뱀서류         │
//   │    - 종스크롤 자동전진 (위→아래)                      │
//   │    - 포자안개(위에서) + 보스접근(아래에서) → 집게효과   │
//   │    - 웨이브: 다수의 약한 적 (HP절반, 수3배)           │
//   │    - 자동공격 + 영웅AI + 정령스킬                     │
//   │    - 8종 업그레이드 드롭                              │
//   │    - 3분 → 필드보스 → 처치 시 승리                   │
//   │    → 승리: 다음 스테이지                              │
//   │    → 패배: 소환실 체크포인트에서 복구                  │
//   └─────────────────────────────────────────────────────┘
//
// 【사이드 콘텐츠】 (메인 메뉴 허브에서 접근)
//   - 서바이벌 (SurvivalScene): 3분 생존 모드, 바이옴별
//   - 던전 (DungeonScene): 층별 도전
//   - 아레나 (ArenaScene): PvP/챌린지
//   - 공중전 (AerialScene): 비행 보스전
//   - 총격전 (GunfightScene): 횡스크롤 슈터

export const GAME_FLOW = {
  mainLoop: ['stage1', 'summoning', 'stage2'],
  sideContent: ['survival', 'dungeon', 'arena', 'aerial', 'gunfight'],
  hubContent: ['worldmap', 'gacha', 'quest', 'shop', 'codex', 'ranking'],
};


// ============================================================
// 3장. 씬 (Scenes) — 16개 등록씬 현재 상태
// ============================================================
//
// 상태 범례:
//   ✅ = 구현 완료 (플레이 가능)
//   🔨 = 구현 중 (기본 동작, 미완성 부분 있음)
//   📋 = 설계만 완료 (코드 골격만 존재)
//   ❌ = 미구현

export const SCENE_STATUS = {
  // ─── 핵심 플로우 (메인 루프) ───
  menu:       { status: '✅', file: 'main-menu.js',            desc: '메인 메뉴 + 허브' },
  stage1:     { status: '✅', file: 'stage1-scene.js',         desc: '사천성 퍼즐 (매치 클리어)' },
  summoning:  { status: '✅', file: 'summoning-room-scene.js', desc: '정령 소환 + 펫 진화 + 체크포인트' },
  stage2:     { status: '✅', file: 'stage2-scene.js',         desc: '뱀서류 전투 (종스크롤)' },
  gameover:   { status: '✅', file: 'game-over-scene.js',      desc: '승리/패배 결과 화면' },

  // ─── 사이드 콘텐츠 ───
  survival:   { status: '✅', file: 'survival-scene.js',       desc: '3분 서바이벌 모드' },
  worldmap:   { status: '🔨', file: 'worldmap-scene.js',       desc: '월드맵 탐험 허브' },
  dungeon:    { status: '📋', file: 'dungeon-scene.js',        desc: '던전 크롤 (층별 도전)' },
  arena:      { status: '📋', file: 'arena-scene.js',          desc: 'PvP/챌린지 배틀' },
  aerial:     { status: '📋', file: 'aerial-scene.js',         desc: '공중전 (비행 보스)' },
  gunfight:   { status: '📋', file: 'gunfight-scene.js',       desc: '총격전 (횡스크롤 슈터)' },

  // ─── 유틸 씬 ───
  gacha:      { status: '🔨', file: 'gacha-scene.js',          desc: '가챠/소환 UI' },
  quest:      { status: '📋', file: 'quest-scene.js',          desc: '일일/주간 퀘스트' },
  shop:       { status: '📋', file: 'shop-scene.js',           desc: '상점' },
  codex:      { status: '📋', file: 'codex-scene.js',          desc: '도감 (정령/아이템)' },
  ranking:    { status: '📋', file: 'ranking-scene.js',        desc: '랭킹/리더보드' },
};


// ============================================================
// 4장. 핵심 시스템 (Core Systems) — 현재 상태
// ============================================================
//
// ┌─────────────────────────────────────────────────────────┐
// │ HeroCore (싱글턴 허브) — 모든 시스템의 중심              │
// │   hero.generators  → 정령/공격/맵/적/영웅업/소환트리    │
// │   hero.systems     → 등급/스테이지/펫/분노/엔진/타이머   │
// │   hero.gacha       → 소환/진화                          │
// │   hero.inventory   → 장비/영웅슬롯/펫/정령/아이템/골드   │
// │   hero.combat      → 전투 중 엔티티+시스템              │
// └─────────────────────────────────────────────────────────┘

export const SYSTEM_STATUS = {

  // ─── 엔진 / 코어 ───
  sceneManager:     { status: '✅', file: 'core/scene-manager.js',    desc: '16씬 관리, 6종 전환효과' },
  gameState:        { status: '✅', file: 'core/game-state.js',       desc: '중앙 상태 싱글턴' },
  saveManager:      { status: '✅', file: 'core/save-manager.js',     desc: 'localStorage 세이브/체크포인트' },
  eventBus:         { status: '✅', file: 'core/event-bus.js',        desc: 'pub/sub 이벤트 통신' },
  inputManager:     { status: '✅', file: 'core/input-manager.js',    desc: '터치+마우스+키보드 입력' },
  cameraController: { status: '✅', file: 'core/camera-controller.js', desc: '카메라 추적/스크롤' },
  tweenEngine:      { status: '✅', file: 'core/tween-engine.js',     desc: '애니메이션 보간' },
  timerSystem:      { status: '✅', file: 'core/timer-system.js',     desc: '범용 타이머' },
  dialogueSystem:   { status: '✅', file: 'core/dialogue-system.js',  desc: '대화 시스템' },

  // ─── 전투 (Combat) ───
  combatEngine:     { status: '✅', file: 'combat/combat-engine.js',     desc: 'Canvas RAF 루프, 엔티티 관리' },
  bossRoomSystem:   { status: '✅', file: 'combat/boss-room-system.js',  desc: '4000×2000 보스방 아레나' },
  aerialCombat:     { status: '📋', file: 'combat/aerial-combat-system.js', desc: '공중전 (부스터/비행)' },
  collision:        { status: '✅', file: 'combat/collision.js',         desc: '원형/사각 충돌 판정' },

  // ─── 허브 시스템 (HeroCore 산하) ───
  heroCore:         { status: '✅', file: 'systems/hero-core.js',       desc: '싱글턴 허브 — 모든 것 통합' },
  heroEngine:       { status: '✅', file: 'systems/hero-engine.js',     desc: 'SpeedAI+HeroAI+스킬+EXP' },
  stageDirector:    { status: '✅', file: 'systems/stage-director.js',  desc: '맵/몹/보스/보상 생성 계획' },
  stageTimer:       { status: '✅', file: 'systems/stage-timer.js',     desc: '3분 카운트다운 (모든 스테이지 공용)' },
  autoScroll:       { status: '✅', file: 'systems/auto-scroll.js',     desc: '포자안개 강제 전진 (수직)' },
  autoWalk:         { status: '✅', file: 'systems/auto-walk.js',       desc: '자동 전진 이동 (수직)' },
  bossApproach:     { status: '✅', file: 'systems/boss-approach.js',   desc: '보스 접근 (하단에서)' },
  rageSystem:       { status: '✅', file: 'systems/rage-system.js',     desc: '분노 게이지 (등급별 횟수 제한)' },
  rarityManager:    { status: '✅', file: 'systems/rarity-manager.js',  desc: '5등급 시스템' },
  petEvolution:     { status: '✅', file: 'systems/pet-evolution-system.js', desc: '펫 진화 + 스탯' },
  combatAiBalance:  { status: '✅', file: 'systems/combat-ai-balance.js',   desc: '실시간 전투 밸런스 AI' },
  equipScalingAi:   { status: '✅', file: 'systems/equipment-scaling-ai.js', desc: '장비 스탯 스케일링' },

  // ─── AI 시스템 ───
  speedAI:          { status: '✅', file: 'ai/speed-ai.js',         desc: '100유닛 추격/차단/포위 AI' },
  heroAI:           { status: '✅', file: 'ai/hero-ai-core.js',     desc: '파티 관리 AI' },
  heroBattleAI:     { status: '✅', file: 'ai/hero-ai-battle.js',   desc: '전투 스킬 AI' },
  formationAI:      { status: '✅', file: 'ai/formation-ai.js',     desc: '파티 배치 AI' },
  survivorBalance:  { status: '✅', file: 'ai/survivor-balance.js', desc: '뱀서류 난이도 자동 조절' },
  balanceAI:        { status: '✅', file: 'data/balance-ai.js',     desc: '글로벌 자동 밸런스 (D값)' },

  // ─── 생성기 (Generators) ───
  spiritGenerator:  { status: '✅', file: 'generators/spirit-generator.js',       desc: '8속성×6몸체 정령 프로시저럴 생성' },
  spiritAttack:     { status: '✅', file: 'generators/spirit-attack-generator.js', desc: '8속성×5=40 스킬' },
  mapGenerator:     { status: '✅', file: 'generators/map-generator.js',          desc: '14테마 맵 + 서바이벌 맵' },
  enemyDropGen:     { status: '✅', file: 'generators/enemy-drop-generator.js',   desc: '슬라임 10종 + 보스 4종' },
  heroUpgrade:      { status: '✅', file: 'generators/hero-upgrade.js',           desc: '6클래스 레벨업' },
  summonEvolution:  { status: '✅', file: 'generators/summon-evolution.js',        desc: '6부위 파편 → 정령 소환' },

  // ─── 렌더링 ───
  characterEngine:  { status: '✅', file: 'render/character-engine-v2.js', desc: 'Three.js 3D 캐릭터' },
  proModelGen:      { status: '✅', file: 'render/pro-model-gen.js',      desc: '고퀄 프로시저럴 모델' },
  artEngine:        { status: '✅', file: 'art/art-core.js',              desc: '8종 셰이더 + PBR 재질' },
  artEnvironment:   { status: '✅', file: 'art/art-environment.js',       desc: '프로시저럴 환경 오브젝트' },
  artUI:            { status: '✅', file: 'art/art-ui.js',                desc: 'Canvas 2D UI (HP바, 데미지 등)' },

  // ─── 텍스트 / 사운드 ───
  textEngine:       { status: '✅', file: 'text/text-core.js',      desc: '8언어 다국어 폰트' },
  textRenderer:     { status: '✅', file: 'text/text-renderer.js',  desc: '14종 게임 텍스트 프리셋' },
  textI18n:         { status: '✅', file: 'text/text-i18n.js',      desc: '50+키 번역 사전' },
  soundEngine:      { status: '✅', file: 'sound/sound-core.js',    desc: 'Web Audio API 합성' },
  soundSFX:         { status: '✅', file: 'sound/sound-sfx.js',     desc: '효과음' },
  soundBGM:         { status: '✅', file: 'sound/sound-bgm.js',     desc: '배경음악' },

  // ─── 가챠 ───
  pitySystem:       { status: '✅', file: 'gacha/pity-system.js',   desc: '천장 시스템' },
  rewardPool:       { status: '✅', file: 'gacha/reward-pool.js',   desc: '보상 풀' },
  gachaSystem:      { status: '✅', file: 'gacha/gacha-system.js',  desc: '가챠 코어 확률' },
  eventBanner:      { status: '✅', file: 'gacha/event-banner.js',  desc: '이벤트 배너' },
  gachaUI:          { status: '✅', file: 'gacha/gacha-ui.js',      desc: '가챠 UI 연출' },

  // ─── 데이터 / 설정 ───
  unitFactory:      { status: '✅', file: 'data/unit-factory.js',       desc: '유닛 생성 단일 진입점' },
  balanceConfig:    { status: '✅', file: 'data/balance-config.js',     desc: '스테이지 난이도 + 콤보 + 주사위' },
  combatConfig:     { status: '✅', file: 'data/combat-config.js',      desc: '보스방 + 보스접근 + 속도 설정' },
  matchTiersConfig: { status: '✅', file: 'data/match-tiers-config.js', desc: '매치 티어별 드롭 테이블' },
  heroConfig:       { status: '🔨', file: 'data/hero-config.js',        desc: '영웅 클래스 정의' },
  beginnerHelper:   { status: '✅', file: 'data/beginner-helper-config.js', desc: '가이아 NPC 초보자 도우미' },
  contentBacklog:   { status: '✅', file: 'data/content-backlog.js',    desc: '미래 콘텐츠 백로그 등록부' },

  // ─── 밸런스 공식 (FormulaPack) ───
  formulaPack1:     { status: '✅', file: 'ai/formula-pack-1.js',   desc: '정령스킬 + 적스케일링 + 드롭률' },
  formulaPack2:     { status: '✅', file: 'ai/formula-pack-2.js',   desc: '업그레이드 + 전투밸런스 + 보스' },
  formulaPack3:     { status: '✅', file: 'ai/formula-pack-3.js',   desc: 'EXP + 펫진화 + 스테이지디렉터' },
  formulaPack4:     { status: '✅', file: 'ai/formula-pack-4.js',   desc: '등급스탯 + 스킬파워 + 공중전' },
  formulaPack5:     { status: '✅', file: 'ai/formula-pack-5.js',   desc: '포자안개 + 보스접근 + 분노 + 간격' },
  formulaDebug:     { status: '✅', file: 'ai/formula-debug.js',    desc: '콘솔 디버그 도구' },

  // ─── 미구현 / 계획 시스템 ───
  pvpSystem:        { status: '📋', file: 'systems/pvp-system.js',        desc: 'PvP 대전' },
  socialSystem:     { status: '📋', file: 'systems/social-system.js',     desc: '친구/길드' },
  tradeSystem:      { status: '📋', file: 'systems/trade-system.js',      desc: '거래' },
  staminaSystem:    { status: '📋', file: 'systems/stamina-system.js',    desc: '스태미나/에너지' },
  reputationSystem: { status: '📋', file: 'systems/reputation-system.js', desc: 'NPC 호감도' },
  storySystem:      { status: '📋', file: 'systems/story-system.js',      desc: '스토리 진행' },
  rebirthSystem:    { status: '📋', file: 'systems/rebirth-system.js',    desc: '뉴게임+' },
};


// ============================================================
// 5장. 난이도 설계 총정리 (Difficulty Design Overview)
// ============================================================
//
// 【설계 철학】
//   - "맨몸 전투력" 기준으로 적 스케일링 → 장비 = 순수 이점
//   - 킬타임 목표: 일반몹 3초, 보스 30~60초
//   - 로그/제곱근 감쇠 곡선 → 초반 빠르고 후반 완만
//   - 소프트캡으로 무한 성장 방지
//   - 자동 밸런스(BalanceAI): 3연승→난이도↑, 3연패→난이도↓
//
// 【공식팩 시스템】
//   FormulaPack1~5가 모든 수치 공식을 관리.
//   값을 바꾸려면 각 formula-pack-N.js의 CONFIG 상수만 수정.
//   콘솔에서 FormulaDebug.all() 으로 전체 난이도 확인 가능.

export const DIFFICULTY_OVERVIEW = {

  // ─── 플레이어 기본 스탯 (GameState.player 초기값) ───
  // 현재 난이도: 적절. 초반 생존은 넉넉, 후반은 장비 의존.
  playerBase: {
    maxHp: 250,       // 기본 체력 — FormulaPack3.EXP_CONFIG.baseStats.hp
    attack: 12,       // 기본 공격력
    defense: 7,       // 기본 방어력
    speed: 3,         // 기본 이동속도
    critRate: 5,      // 치명타 확률 (%)
    critDamage: 150,  // 치명타 배율 (%)
  },

  // ─── 영웅 성장 곡선 (FormulaPack3) ───
  // 현재 난이도: 초반 성장 빠르고 후반 완만 (제곱근 감쇠)
  // EXP = 80 × level^1.65 × classMult
  heroGrowth: {
    expFormula: '80 × level^1.65',
    maxLevel: 50,
    // Lv1:  HP=250, ATK=12,  DEF=7
    // Lv10: HP=269, ATK=21,  DEF=12
    // Lv25: HP=325, ATK=38,  DEF=23
    // Lv50: HP=426, ATK=55,  DEF=39  (전사 기준)
    softCap: '레벨30 이후 성장 감쇠 (제곱근)',
    classes: ['warrior', 'mage', 'ranger', 'healer', 'assassin', 'paladin'],
    classNote: '전사: 균형 / 마법사: 고ATK저HP / 암살자: 극딜 느린성장',
  },

  // ─── 적 스케일링 (FormulaPack1) ───
  // 현재 난이도: 맨몸 기준. 장비 착용 시 체감 난이도 하락.
  // HP = base × (1 + log2(stage) × 0.35) × regionMult
  enemyScaling: {
    growthType: '로그 곡선 (log2)',
    hpGrowth: 0.35,       // 스테이지당 HP 성장률
    atkGrowth: 0.25,      // 스테이지당 ATK 성장률
    defGrowth: 0.20,
    softCapStage: 100,    // 100스테이지 이후 성장 60% 감쇠
    // 핑크슬라임(기본) 기준 스케일링:
    // S1:  HP=30,   ATK=4
    // S10: HP=65,   ATK=8
    // S25: HP=116,  ATK=13
    // S50: HP=210,  ATK=19  (마왕성 지역 배율 포함)
    waveBonus: '웨이브1: ×1.0 → 웨이브6: ×1.4',
    regionMultNote: '숲×1.0 / 동굴×1.3 / 사막×1.5 / 화산×1.8 / 마왕성×2.2',
  },

  // ─── 보스 설계 (FormulaPack2) ───
  // 현재 난이도: 킬타임 30~60초 목표. 플레이어 DPS 기반 HP.
  bossDesign: {
    hpFormula: 'max(playerDPS × 킬타임, playerHP × 15 × stageMult)',
    atkMultBase: 2.5,     // 플레이어 ATK의 2.5배
    defMultBase: 1.8,     // 플레이어 DEF의 1.8배
    killTimeTarget: '30~60초',
    // 3단계 페이즈:
    // 1페이즈 (100~50%): ATK×1.0, SPD×1.0
    // 2페이즈 (50~30%):  ATK×1.2, SPD×1.1
    // 분노 (30% 이하):   ATK×1.5, SPD×1.3
    rageThreshold: 0.30,
  },

  // ─── 등급 시스템 (FormulaPack4) ───
  // 현재 난이도: 등급 격차가 확실. 신화 >>>>>> 커먼.
  raritySystem: {
    tiers: ['Common(1)', 'Rare(2)', 'Epic(3)', 'Legendary(4)', 'Mythic(5)'],
    // Common Lv1:  ATK=10, DEF=1, AtkSpd=1200ms
    // Mythic Lv1:  ATK=60, DEF=8, AtkSpd=600ms
    // Mythic Lv25: ATK=177, DEF=31, AtkSpd=300ms (하한)
    atkSpeedMin: 300,     // ms — 최소 공격 간격
    moveSpdMax: 3.0,      // 최대 이동속도
  },

  // ─── 업그레이드 아이템 (FormulaPack2) ───
  // 현재 난이도: 중복 획득 시 감쇠로 OP 방지.
  upgradeItems: {
    types: [
      '빠른공격🔴 — 공격속도 0.8^n (하한 40%)',
      '강한공격🟠 — 탄환 크기 ×1.5+n (상한 ×3)',
      '먼공격🟡   — 사거리 ×1.3+n (상한 ×2.5)',
      '연속발사🟢 — 발사수 n+1 (상한 4발)',
      '관통🔵     — 관통 n+1 (상한 4)',
      '호밍🟣     — 추적탄 ON/OFF',
      'HP회복⚪   — 30%+스테이지 보너스',
      '방어력🟤   — DEF +5×n (상한 50)',
    ],
    diminishingReturns: '스택 쌓일수록 효과 감소 (1/(1+dim×(n-1)))',
  },

  // ─── 포자안개 + 자동전진 (FormulaPack5) ───
  // 현재 난이도: 3분간 점점 빨라짐. 2분 이후 가속.
  sporeFog: {
    baseDamage: '20/초 (스테이지×로그 + 시간×0.5%)',
    lateAccel: '2분(120초) 이후 추가 가속 ×1.5',
    pushForce: '0.5 + stage×0.01',
    // S1 30초:  20/s → S1 180초: 26/s
    // S10 30초: 32/s → S10 180초: 47/s
    // S50 30초: 48/s → S50 180초: 121/s
  },

  // ─── 분노 게이지 (FormulaPack5) ───
  // 현재 난이도: 등급+레벨 비례. 세션당 횟수 제한.
  rageSystem: {
    baseMult: 2.0,        // 커먼 기본 배율
    // 커먼 Lv1:  ×2.0 / 레전드 Lv1:  ×2.8
    // 커먼 Lv25: ×2.4 / 레전드 Lv25: ×3.2
    // 커먼 Lv50: ×2.8 / 신화 Lv50:   ×3.9
    maxMult: 5.0,
    triggersPerSession: 'Legendary+=3회, Epic=2회, 나머지=1회',
    gainRate: '피격+12%, 처치+8%',
  },

  // ─── 드롭률 (FormulaPack1) ───
  // 현재 난이도: 장비 드롭 10%+. 스테이지↑ 드롭↑ (상한 80%).
  dropRates: {
    baseEquipDrop: 0.10,  // 10%
    stageBonus: '+0.3%/스테이지 (상한 +20%)',
    rarityChance: 'Common 60% / Rare 25% / Epic 10% / Legend 4% / Mythic 1%',
    goldVariance: '±20%',
  },

  // ─── 펫 시스템 (FormulaPack3) ───
  // 현재 난이도: 펫은 보조 역할. 5초마다 자동 힐.
  petSystem: {
    // 커먼 Lv20: HP=27, ATK=4, 힐=6/5초
    // 레전드 Lv20: HP=117, ATK=20, 힐=29/5초
    // 신화 Lv20: HP=192, ATK=34, 힐=46/5초
    healInterval: '5초',
    evolutionLevelKeep: '진화 시 레벨 70% 유지',
  },

  // ─── 행동/공격 간격 (FormulaPack5) ───
  // 현재 난이도: SPD 높으면 행동 빨라짐. 하한 있음.
  intervals: {
    heroAction: '800ms - (SPD×15 + Lv×3) → 최소 300ms',
    autoAttack: '800ms 기본, AtkSpd×0.6 반영 → 최소 250ms',
    // Lv1 SPD3:  755ms
    // Lv25 SPD6: 635ms
    // Lv50 SPD10: 500ms
  },

  // ─── 자동 밸런스 (BalanceAI) ───
  // 현재 난이도: 3연승/3연패 시 보정. 보스 5연패 → HP-10%.
  autoBalance: {
    difficultyMod: '-0.3 ~ +0.3',
    trigger: '3연S→+0.1 / 3연F→-0.1 / 보스5연패→-0.1',
    note: '적은 항상 맨몸 전투력 기준 3~5% 강하게 (ENEMY_GROWTH_BONUS: 0.04)',
  },

  // ─── 전투 밸런스 (FormulaPack2) ───
  // 현재 난이도: HP비율+머시+그레이스로 초보자 보호.
  combatBalance: {
    hpBasedDamage: '0.4(HP0%) ~ 1.4(HP100%) 배율',
    gracePeriod: '시작 10초간 보호 (스테이지↑ 짧아짐, 최소3초)',
    mercySystem: '2초내 3피격 → 데미지 ×0.6 (스테이지↑ 약화)',
    rageMult: 1.3,
  },

  // ─── 초보자 도우미 (가이아) ───
  // 현재 난이도: 첫 3일 + 스테이지2 이하. 쉬운 시작.
  beginnerHelper: {
    active: '첫 3일 + 스테이지 ≤2',
    benefits: '젬편향 40% / 매치 목표=타일파괴 / 이동+10 / 드랍+30%',
    dismissable: '수동 해제 가능',
  },
};


// ============================================================
// 6장. 콘텐츠 로드맵 (Content Roadmap)
// ============================================================
//
// 【우선순위 1: 핵심 루프 완성】
//   ✅ Stage1 퍼즐 (사천성)
//   ✅ 소환실 (정령 소환 + 펫 진화)
//   ✅ Stage2 전투 (뱀서류 종스크롤)
//   ✅ 보스방 시스템
//   ✅ 서바이벌 모드
//   ✅ 밸런스 공식 시스템 (FormulaPack 1~5)
//
// 【우선순위 2: 사이드 콘텐츠】
//   🔨 월드맵 (탐험 허브)
//   📋 던전 (층별 도전)
//   📋 아레나 (PvP)
//   📋 공중전 (비행 보스) — content-backlog 등록됨
//   📋 총격전 (횡스크롤 슈터)
//
// 【우선순위 3: 경제/소셜】
//   📋 상점 시스템
//   📋 퀘스트 (일일/주간)
//   📋 랭킹/리더보드
//   📋 도감 시스템
//   📋 PvP 대전
//   📋 친구/길드
//   📋 거래
//   📋 뉴게임+ (환생)

export const CONTENT_ROADMAP = {
  priority1_core: {
    label: '핵심 루프',
    status: '✅ 완료',
    items: [
      '사천성 퍼즐 (Stage1)',
      '정령 소환 + 펫 진화 (소환실)',
      '뱀서류 종스크롤 전투 (Stage2)',
      '보스방 시스템 (4000×2000)',
      '서바이벌 모드 (3분 생존)',
      '밸런스 공식 (FormulaPack 1~5, 18개 교체)',
      '자동 밸런스 AI (D값 조정)',
      '포자안개 + 보스접근 집게 효과',
    ],
  },
  priority2_side: {
    label: '사이드 콘텐츠',
    status: '🔨 진행 중',
    items: [
      { name: '월드맵 탐험',     status: '🔨', note: '기본 UI 구현, 스테이지 연결 필요' },
      { name: '던전 크롤',       status: '📋', note: '설계 완료, 구현 필요' },
      { name: '공중전',          status: '📋', note: 'content-backlog 등록, 부스터/비행 설계됨' },
      { name: '아레나 PvP',      status: '📋', note: '골격만 존재' },
      { name: '총격전',          status: '📋', note: '골격만 존재' },
    ],
  },
  priority3_economy: {
    label: '경제/소셜',
    status: '📋 계획',
    items: [
      { name: '상점',           status: '📋' },
      { name: '퀘스트',          status: '📋' },
      { name: '랭킹',           status: '📋' },
      { name: '도감',           status: '📋' },
      { name: 'PvP 대전',       status: '📋' },
      { name: '친구/길드',       status: '📋' },
      { name: '뉴게임+ (환생)',  status: '📋' },
    ],
  },
};


// ============================================================
// 7장. 데이터 흐름도 (Data Flow)
// ============================================================
//
// 【초기화 순서 (main.js)】
//   1. SoundEngine.init()          — Web Audio API
//   2. ArtEngine.connectToEngine()  — 셰이더 + 3D 연동
//   3. TextEngine.init({lang:'ko'}) — 다국어 폰트
//   4. HeroCore.getInstance()       — 모든 생성기+시스템 탑재
//   5. SceneManager.register(...)   — 16씬 등록
//   6. SceneManager.go('menu')      — 메인 메뉴 시작
//
// 【전투 시작 흐름】
//   Stage2Scene.onEnter()
//     → HeroCore.prepareStagePlan(stageLevel)    // StageDirector
//     → HeroCore.mountCombat({canvas, plan})      // 엔티티+시스템 일괄 생성
//       → CombatEngine 생성
//         → HeroEngine 생성 (SpeedAI + HeroAI + 스킬)
//         → AutoScroll 생성 (포자안개)
//         → AutoWalk 생성 (자동전진)
//         → BossApproach 생성 (보스 접근)
//         → StageTimer 생성 (3분)
//         → RageSystem 생성 (분노)
//     → CombatEngine.start() → RAF 루프 시작
//
// 【전투 종료 흐름】
//   CombatEngine 승리/패배 감지
//     → HeroCore.unmountCombat()    // 일괄 해제
//     → SceneManager.go('gameover') // 결과 화면

export const DATA_FLOW = {
  initOrder: [
    'SoundEngine',
    'ArtEngine + ArtEnvironment + ArtUI',
    'TextEngine + TextRenderer + TextI18n',
    'HeroCore (generators + systems)',
    'SceneManager (16 scenes)',
    'EventBus listeners (auto-save, BGM)',
  ],
  combatMountOrder: [
    'StageDirector.prepare()',
    'HeroCore.mountCombat()',
    'CombatEngine + HeroEngine + AutoScroll + AutoWalk + BossApproach + StageTimer + RageSystem',
    'CombatEngine.start() → RAF loop',
  ],
  savePoints: [
    '씬 전환 시 자동 세이브 (menu/gameover 제외)',
    '소환실에서 체크포인트 세이브',
    'Stage2 패배 → 체크포인트 복구',
  ],
};


// ============================================================
// 8장. 해금 시스템 (Unlock Progression)
// ============================================================
//
// 스테이지가 올라갈수록 새로운 시스템이 열림
//
// S1:  기본 전투 (웨이브만, 보스 없음)
// S2:  보스방 해금! (지상 보스전)
// S3:  공중전 해금! (비행 보스전)
// S4:  최종보스 (버섯돌이 대마왕, 지상→공중 페이즈 전환)
// S5+: 강화 콘텐츠 (서바이벌, 던전, 아레나)

export const UNLOCK_STAGES = {
  stage1: { unlocks: ['기본 전투', '사천성 퍼즐', '정령 소환'] },
  stage2: { unlocks: ['보스방 (지상)', '장비 드롭', '업그레이드 시스템'] },
  stage3: { unlocks: ['공중전', '고급 스킬', '펫 시스템 강화'] },
  stage4: { unlocks: ['최종보스', '페이즈 전환 (지상→공중)'] },
  stage5: { unlocks: ['서바이벌 모드', '일일 퀘스트'] },
};


// ============================================================
// 9장. 밸런스 점검 방법
// ============================================================
//
// 【콘솔 명령어】 (FormulaDebug — formula-debug.js)
//   FormulaDebug.all()       — 전체 난이도 한눈에
//   FormulaDebug.enemies()   — 적 스케일링 테이블
//   FormulaDebug.hero()      — 영웅 성장 테이블
//   FormulaDebug.boss()      — 보스 스탯 테이블
//   FormulaDebug.exp()       — EXP 곡선 (6클래스)
//   FormulaDebug.pet()       — 펫 스탯 (등급별)
//   FormulaDebug.rarity()    — 등급별 스탯 (Lv1 vs Lv25)
//   FormulaDebug.fog()       — 포자안개 데미지 (시간별)
//   FormulaDebug.rage()      — 분노 배율 (등급×레벨)
//   FormulaDebug.intervals() — 행동/공격 간격
//   FormulaDebug.upgrades()  — 업그레이드 감쇠
//
// 【치트 명령어】 (main.js window.cheat)
//   cheat.summon10()    — 정령 10마리 즉시 소환
//   cheat.gold(10000)   — 골드 추가
//   cheat.fragments(60) — 조각 60개 추가
//   cheat.aerial()      — 공중전 테스트 진입
//
// 【값 수정 방법】
//   각 formula-pack-N.js 파일의 CONFIG 상수만 수정.
//   코드 로직 변경 불필요 — 상수값만 튜닝.

export const DEBUG_COMMANDS = {
  formulaDebug: 'FormulaDebug.all()',
  cheat: {
    summon10: 'cheat.summon10()',
    gold: 'cheat.gold(10000)',
    fragments: 'cheat.fragments(60)',
    aerial: 'cheat.aerial()',
  },
  tuning: '각 formula-pack-N.js의 CONFIG 상수 수정',
};


// ============================================================
// 10장. 기술 스택 요약
// ============================================================

export const TECH_STACK = {
  framework: 'No build tools — 순수 HTML/CSS/JS',
  modules: 'ES6 <script type="module"> + 글로벌 스크립트 혼용',
  rendering: {
    menu: 'DOM + innerHTML',
    combat: 'HTML5 Canvas (60fps RAF)',
    '3d': 'Three.js r128 (CDN)',
  },
  storage: 'localStorage (JSON)',
  audio: 'Web Audio API (프로시저럴 합성)',
  i18n: '8언어 (TextEngine + Google Fonts CDN)',
  target: '모바일(PWA) + 데스크톱 브라우저',
};
