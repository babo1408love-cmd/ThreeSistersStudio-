/**
 * StageDirector — 스테이지 진입 시 상황 맞춤 자동 생성 오케스트레이터
 *
 * stages.js REGIONS 데이터를 읽고, 맵/몹/보스/사물/환경을
 * 스테이지 레벨·타입·지역에 맞게 계산하여 생성 계획(plan)을 반환.
 * CombatEngine/SurvivalEngine이 이 plan을 받아 실행.
 */
import { getStage, REGIONS } from '../data/stages.js';
import { STAGE_DIFFICULTY } from '../data/balance-config.js';
import { ENEMIES, BOSSES } from '../generators/enemy-drop-generator.js';

// ── 환경 조건 ──
const WEATHER = ['clear', 'fog', 'rain', 'snow', 'storm', 'spore_mist'];
const LIGHTING = ['day', 'dusk', 'night', 'dawn', 'eclipse'];

// ── 테마별 오브젝트 밀도 ──
const THEME_DENSITY = {
  fairy_garden: { trees: 0.08, rocks: 0.03, flowers: 0.06, mushrooms: 0.04 },
  desert:       { trees: 0.01, rocks: 0.08, flowers: 0.01, mushrooms: 0.00 },
  crystal_cave: { trees: 0.00, rocks: 0.05, flowers: 0.02, mushrooms: 0.01 },
  volcano:      { trees: 0.01, rocks: 0.10, flowers: 0.00, mushrooms: 0.00 },
  frozen:       { trees: 0.04, rocks: 0.05, flowers: 0.01, mushrooms: 0.00 },
  dark_forest:  { trees: 0.12, rocks: 0.04, flowers: 0.02, mushrooms: 0.08 },
  sky:          { trees: 0.00, rocks: 0.02, flowers: 0.03, mushrooms: 0.00 },
  ocean:        { trees: 0.00, rocks: 0.03, flowers: 0.04, mushrooms: 0.00 },
  demon_castle: { trees: 0.02, rocks: 0.06, flowers: 0.00, mushrooms: 0.03 },
};

// ── 스테이지 타입별 몬스터 수 배율 ──
const MOB_COUNT_MULT = {
  normal: 1.0,
  elite: 1.2,
  miniboss: 1.5,
  boss: 1.3,
};

// ── 웨이브 수 ──
const WAVE_COUNTS = {
  normal: 3,
  elite: 3,
  miniboss: 3,
  boss: 4,
};

export default class StageDirector {
  /**
   * 스테이지 진입 시 전체 생성 계획 수립
   * @param {number} stageLevel — 전역 스테이지 번호 (1~200)
   * @param {Object} options — 추가 옵션 (mode:'combat'|'survival', ...)
   * @returns {Object} plan — 생성 계획
   */
  static prepare(stageLevel, options = {}) {
    const stage = getStage(stageLevel);
    const regionIdx = stage.regionIdx ?? Math.floor((stageLevel - 1) / 20);
    const region = REGIONS[regionIdx] || REGIONS[0];
    const stageNum = stage.stageNum ?? ((stageLevel - 1) % 20) + 1;
    const stageType = stage.type || _inferType(stageNum);

    // ── 맵 설정 ──
    const mapTheme = stage.mapTheme || region.mapTheme || 'fairy_garden';
    // ★ 절반 거리 맵 (3분 동안 ~35,000px 스크롤)
    const scrollSpeed = 0.3 + stageLevel * 0.01;
    const scrollAccel = 0.00003 + stageLevel * 0.000001;
    const density = THEME_DENSITY[mapTheme] || THEME_DENSITY.fairy_garden;

    // 스테이지 진행에 따라 밀도 조정 (후반 스테이지 = 더 복잡한 지형)
    const densityMult = 1 + regionIdx * 0.1;
    const adjustedDensity = {};
    for (const key in density) {
      adjustedDensity[key] = density[key] * densityMult;
    }

    // ── 몬스터 구성 ──
    const mobPool = _resolveMobPool(region, stageType);
    const baseMobCount = 3 + Math.floor(stageNum / 4);
    const mobCountPerWave = Math.min(10, Math.round(baseMobCount * (MOB_COUNT_MULT[stageType] || 1)));
    const waveCount = WAVE_COUNTS[stageType] || 3;

    // 몬스터 스탯 스케일링
    const baseHp = 40 + regionIdx * 30;
    const baseAtk = 5 + regionIdx * 4;
    const scaleFactor = 1 + (stageNum - 1) * 0.12;
    const mobHp = Math.round(baseHp * scaleFactor);
    const mobAtk = Math.round(baseAtk * scaleFactor);

    // ── 보스 결정 ──
    let bossType = null;
    let bossConfig = null;
    if (stageType === 'boss') {
      bossType = region.regionBoss;
      bossConfig = { hp: mobHp * 10, atk: mobAtk * 3, scale: 3.5 };
    } else if (stageType === 'miniboss') {
      bossType = region.miniBoss;
      bossConfig = { hp: mobHp * 5, atk: mobAtk * 2, scale: 2.5 };
    }

    // ── 환경 조건 (시드 기반 결정) ──
    const seed = (stageLevel * 7919 + regionIdx * 104729) % 100000;
    const weatherIdx = seed % WEATHER.length;
    const lightIdx = Math.floor(seed / 10) % LIGHTING.length;
    const weather = WEATHER[weatherIdx];
    const lighting = LIGHTING[lightIdx];

    // 후반 지역 특수 환경
    let envOverrides = {};
    if (regionIdx >= 8) envOverrides.sporeIntensity = 0.3 + regionIdx * 0.05;
    if (mapTheme === 'frozen') envOverrides.weather = 'snow';
    if (mapTheme === 'volcano') envOverrides.weather = 'storm';
    if (mapTheme === 'dark_forest') envOverrides.lighting = 'night';

    // ── 보상 ──
    const rewards = stage.rewards || {
      gold: Math.round((100 + regionIdx * 200) * scaleFactor),
      exp: Math.round((30 + regionIdx * 50) * scaleFactor),
    };

    return {
      // 메타
      stageLevel,
      stageNum,
      stageType,
      regionIdx,
      regionId: region.id,
      regionName: region.name,
      stageName: stage.name,

      // 맵 생성 파라미터
      map: {
        themeId: mapTheme,
        stageLevel,
        scrollSpeed,
        scrollAccel,
        objectDensity: adjustedDensity,
        seed,
      },

      // 몬스터 생성 파라미터
      enemies: {
        pool: mobPool,          // 이 스테이지에 등장할 몹 ID 배열
        countPerWave: mobCountPerWave,
        waveCount,
        baseHp: mobHp,
        baseAtk: mobAtk,
        scaleFactor,
      },

      // 보스 파라미터
      boss: bossType ? {
        type: bossType,
        ...bossConfig,
      } : null,

      // 환경
      environment: {
        weather: envOverrides.weather || weather,
        lighting: envOverrides.lighting || lighting,
        sporeIntensity: envOverrides.sporeIntensity || 0,
        ...envOverrides,
      },

      // 보상
      rewards,

      // 원본 스테이지 데이터 참조
      _stageData: stage,
      _regionData: region,
    };
  }

  /**
   * 서바이벌 모드용 생성 계획
   * @param {Object} biome — 서바이벌 바이옴 설정
   * @param {number} stageLevel
   */
  static prepareSurvival(biome, stageLevel = 1) {
    const regionIdx = Math.min(9, Math.floor(stageLevel / 20));
    const region = REGIONS[regionIdx] || REGIONS[0];
    const mapTheme = biome.theme || region.mapTheme || 'fairy_garden';

    const plan = StageDirector.prepare(stageLevel, { mode: 'survival' });

    // 서바이벌 오버라이드: 몹 수 3배, HP 절반
    plan.enemies.countPerWave = Math.round(plan.enemies.countPerWave * 3);
    plan.enemies.baseHp = Math.round(plan.enemies.baseHp * 0.5);
    plan.map.themeId = mapTheme;
    plan.stageType = 'survival';

    return plan;
  }

  /**
   * 생성 계획에서 실제 웨이브 데이터 배열 생성
   * CombatEngine의 generateWave 대체용
   */
  static buildWaveFromPlan(plan, waveNum) {
    const { pool, countPerWave, baseHp, baseAtk, scaleFactor } = plan.enemies;

    // 웨이브가 진행될수록 수/스탯 증가
    const waveScale = 1 + (waveNum - 1) * 0.1;
    const count = Math.round(countPerWave * waveScale);
    const enemies = [];

    for (let i = 0; i < count; i++) {
      const mobId = pool[Math.floor(Math.random() * pool.length)];
      const baseDef = ENEMIES[mobId] || Object.values(ENEMIES)[0];

      enemies.push({
        ...baseDef,
        hp: Math.round(baseHp * waveScale * (0.9 + Math.random() * 0.2)),
        atk: Math.round(baseAtk * waveScale),
        attack: Math.round(baseAtk * waveScale),
      });
    }

    // 중간 웨이브 (4+) 에 엘리트 추가
    let boss = null;
    if (waveNum >= 4 && plan.boss) {
      boss = {
        ...BOSSES[plan.boss.type] || Object.values(BOSSES)[0],
        hp: plan.boss.hp,
        atk: plan.boss.atk,
        attack: plan.boss.atk,
        scale: plan.boss.scale,
        isBoss: true,
      };
    }

    return { waveNum, enemies, boss, scaling: scaleFactor };
  }
}

// ── 내부 헬퍼 ──

function _inferType(stageNum) {
  if (stageNum <= 15) return 'normal';
  if (stageNum <= 18) return 'elite';
  if (stageNum === 19) return 'miniboss';
  return 'boss';
}

function _resolveMobPool(region, stageType) {
  const mobs = region.mobs || [];
  const elites = region.elites || [];

  // ENEMIES 키와 매핑 시도 → 실패 시 랜덤 슬라임 풀백
  const allSlimeKeys = Object.keys(ENEMIES);

  // 지역 몹 ID → ENEMIES 키 매핑
  const mapToEnemy = (mobId) => {
    if (ENEMIES[mobId]) return mobId;
    // 슬라임 풀백 (지역 몹이 슬라임 데이터에 없을 때)
    return allSlimeKeys[Math.abs(_simpleHash(mobId)) % allSlimeKeys.length];
  };

  switch (stageType) {
    case 'normal':
      return mobs.map(mapToEnemy);
    case 'elite':
      return [...mobs, ...elites].map(mapToEnemy);
    case 'miniboss':
      return [...mobs, ...elites].map(mapToEnemy);
    case 'boss':
      return [...elites, ...mobs.slice(0, 2)].map(mapToEnemy);
    default:
      return mobs.map(mapToEnemy);
  }
}

function _simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
