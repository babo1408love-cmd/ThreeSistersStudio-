// ============================================================
// 🧟 몽글벨 웹엔진 - 뱀서류 밸런스 AI
// ============================================================
// 3분 스테이지 기준 시간 t(초) 기반 난이도 스케일링
// 몬스터 공격력/속도/리스폰/킬타임 자동 계산
//
// Claude Code: js/ai/survivor-balance.js 에 넣으세요
// ============================================================

const SurvivorBalance = {

  // ========== 기본 설정 (3분 = 180초 기준) ==========
  CONFIG: {
    stageDuration: 180,     // 3분 (초)
    baseATK: 4,             // 적 공격력 (낮게 — 다수에 의한 누적 데미지)
    baseSPD: 1.0,
    baseSpawnRate: 1.5,     // 초당 1.5마리 (점진적 증가)
    baseHP: 20,

    // 증가율 (분당)
    atkGrowth: 0.08,        // 8%/분 (후반 압박)
    spdGrowth: 0.02,        // 2%/분
    spawnGrowth: 0.35,      // 35%/분 (빠른 램프업 → 3분에 충분한 압박)

    // 후반 압박 (2분 이후)
    lateGameATKBoost: 1.03,   // 2분 이후 지수 증가
    lateGameSpawnBoost: 1.06, // 1.5분 이후 스폰 폭증
    lateGameThreshold: 120,   // 2분 (초)
    spawnSurgeThreshold: 90,  // 1.5분 (초)

    // 안전장치
    maxSpeedRatio: 0.95,      // 몹 속도 ≤ 플레이어 × 0.95
    killTimeTarget: 1.0,      // 킬타임 1초 목표 (빠른 킬 = 뱀서 쾌감)
    killTimeMin: 0.5,
    killTimeMax: 2.5,
    maxSpawnCount: 60,        // 화면 최대 몹 수
    dangerIdeal: { min: 0.9, max: 1.1 } // 이상적 위험도
  },

  // ========== 스테이지 레벨별 보정 ==========
  STAGE_MULTIPLIER: {
    1:  { atk: 1.0, hp: 1.0,  spd: 1.0,  spawn: 1.0 },
    2:  { atk: 1.2, hp: 1.3,  spd: 1.05, spawn: 1.1 },
    3:  { atk: 1.4, hp: 1.6,  spd: 1.1,  spawn: 1.2 },
    4:  { atk: 1.7, hp: 2.0,  spd: 1.15, spawn: 1.3 },
    5:  { atk: 2.0, hp: 2.5,  spd: 1.2,  spawn: 1.4 },
    6:  { atk: 2.4, hp: 3.0,  spd: 1.25, spawn: 1.5 },
    7:  { atk: 2.8, hp: 3.5,  spd: 1.3,  spawn: 1.6 },
    8:  { atk: 3.3, hp: 4.2,  spd: 1.35, spawn: 1.7 },
    9:  { atk: 3.8, hp: 5.0,  spd: 1.4,  spawn: 1.8 },
    10: { atk: 4.5, hp: 6.0,  spd: 1.45, spawn: 2.0 }
  },

  // ========== 몬스터 타입별 보정 ==========
  MOB_TYPE: {
    // 일반
    normal:    { atkMult: 1.0, hpMult: 1.0, spdMult: 1.0, xpMult: 1.0, size: 1.0 },
    // 빠른 (약하지만 빠름)
    fast:      { atkMult: 0.6, hpMult: 0.5, spdMult: 1.6, xpMult: 0.8, size: 0.7 },
    // 탱커 (느리지만 단단)
    tank:      { atkMult: 1.3, hpMult: 3.0, spdMult: 0.6, xpMult: 2.0, size: 1.5 },
    // 원거리 (멀리서 공격)
    ranged:    { atkMult: 1.2, hpMult: 0.7, spdMult: 0.8, xpMult: 1.2, size: 0.9 },
    // 자폭 (닿으면 큰 데미지)
    exploder:  { atkMult: 3.0, hpMult: 0.3, spdMult: 1.3, xpMult: 1.5, size: 0.8 },
    // 군집 (작고 많이)
    swarm:     { atkMult: 0.3, hpMult: 0.2, spdMult: 1.2, xpMult: 0.3, size: 0.4 },
    // 치유 (다른 몹 치유)
    healer:    { atkMult: 0.5, hpMult: 1.5, spdMult: 0.9, xpMult: 2.0, size: 1.0 },
    // 소환 (새끼 소환)
    summoner:  { atkMult: 0.8, hpMult: 2.0, spdMult: 0.7, xpMult: 2.5, size: 1.2 },

    // 엘리트
    elite:     { atkMult: 2.0, hpMult: 5.0, spdMult: 1.1, xpMult: 5.0, size: 1.8 },

    // 보스
    boss:      { atkMult: 3.0, hpMult: 20.0, spdMult: 0.8, xpMult: 15.0, size: 2.5 },
    miniboss:  { atkMult: 2.5, hpMult: 10.0, spdMult: 0.9, xpMult: 8.0, size: 2.0 }
  },

  // ========== 웨이브 구성 (3분 = 6웨이브) ==========
  WAVE_SCHEDULE: [
    // 웨이브 1: 0~30초 (워밍업 — 여유롭게 적응)
    {
      startTime: 0, endTime: 30, name: '시작',
      mobs: [
        { type: 'normal', weight: 80 },
        { type: 'fast', weight: 20 }
      ],
      spawnMult: 0.4,  // ★ 아주 느리게 (0.6마리/초)
      eliteChance: 0,
      event: null
    },
    // 웨이브 2: 30~60초 (본격 시작)
    {
      startTime: 30, endTime: 60, name: '본격전투',
      mobs: [
        { type: 'normal', weight: 60 },
        { type: 'fast', weight: 25 },
        { type: 'tank', weight: 15 }
      ],
      spawnMult: 0.7,  // ★ 아직 여유 (1마리/초)
      eliteChance: 0.03,
      event: null
    },
    // 웨이브 3: 60~90초 (다양화)
    {
      startTime: 60, endTime: 90, name: '다양화',
      mobs: [
        { type: 'normal', weight: 40 },
        { type: 'fast', weight: 20 },
        { type: 'tank', weight: 15 },
        { type: 'ranged', weight: 15 },
        { type: 'exploder', weight: 10 }
      ],
      spawnMult: 1.0,  // 기준 (2마리/초)
      eliteChance: 0.08,
      event: { type: 'miniboss', time: 75 }
    },
    // 웨이브 4: 90~120초 (압박 시작)
    {
      startTime: 90, endTime: 120, name: '압박',
      mobs: [
        { type: 'normal', weight: 30 },
        { type: 'fast', weight: 15 },
        { type: 'tank', weight: 15 },
        { type: 'ranged', weight: 15 },
        { type: 'swarm', weight: 15 },
        { type: 'healer', weight: 5 },
        { type: 'summoner', weight: 5 }
      ],
      spawnMult: 1.4,  // 3~4마리/초
      eliteChance: 0.12,
      event: null
    },
    // 웨이브 5: 120~150초 (고조)
    {
      startTime: 120, endTime: 150, name: '고조',
      mobs: [
        { type: 'normal', weight: 25 },
        { type: 'fast', weight: 15 },
        { type: 'tank', weight: 15 },
        { type: 'exploder', weight: 15 },
        { type: 'swarm', weight: 20 },
        { type: 'healer', weight: 5 },
        { type: 'summoner', weight: 5 }
      ],
      spawnMult: 1.8,  // 5~6마리/초
      eliteChance: 0.18,
      event: { type: 'swarm_rush', time: 135 }
    },
    // 웨이브 6: 150~180초 (보스전)
    {
      startTime: 150, endTime: 180, name: '보스전',
      mobs: [
        { type: 'normal', weight: 20 },
        { type: 'fast', weight: 20 },
        { type: 'tank', weight: 15 },
        { type: 'swarm', weight: 30 },
        { type: 'exploder', weight: 15 }
      ],
      spawnMult: 2.0,  // 최대 압박
      eliteChance: 0.22,
      event: { type: 'boss', time: 160 }
    }
  ],

  // =============================================================
  // 🧠 핵심 계산 함수
  // =============================================================

  // 시간 t(초)에서의 몬스터 공격력
  getMonsterATK(timeSec, stageLevel, mobType) {
    const t = timeSec / 60; // 분 변환
    const c = this.CONFIG;
    const stageMult = this._getStageMult(stageLevel);
    const typeMult = this.MOB_TYPE[mobType || 'normal'].atkMult;

    let atk = c.baseATK * (1 + t * c.atkGrowth) * stageMult.atk * typeMult;

    // 후반 압박 (2분 이후)
    if (timeSec > c.lateGameThreshold) {
      const overtime = (timeSec - c.lateGameThreshold) / 60;
      atk *= Math.pow(c.lateGameATKBoost, overtime * 10);
    }

    return Math.round(atk * 10) / 10;
  },

  // 시간 t에서의 몬스터 속도
  getMonsterSPD(timeSec, stageLevel, mobType, playerSpeed) {
    const t = timeSec / 60;
    const c = this.CONFIG;
    const stageMult = this._getStageMult(stageLevel);
    const typeMult = this.MOB_TYPE[mobType || 'normal'].spdMult;

    let spd = c.baseSPD * (1 + t * c.spdGrowth) * stageMult.spd * typeMult;

    // 속도 상한: 플레이어의 95%
    if (playerSpeed) {
      spd = Math.min(spd, playerSpeed * c.maxSpeedRatio);
    }

    return Math.round(spd * 100) / 100;
  },

  // 시간 t에서의 리스폰 수 (초당)
  getSpawnRate(timeSec, stageLevel) {
    const t = timeSec / 60;
    const c = this.CONFIG;
    const stageMult = this._getStageMult(stageLevel);
    const wave = this._getCurrentWave(timeSec);
    const waveMult = wave ? wave.spawnMult : 1.0;

    let rate = c.baseSpawnRate * (1 + t * c.spawnGrowth) * stageMult.spawn * waveMult;

    // 스폰 폭증 (1.5분 이후)
    if (timeSec > c.spawnSurgeThreshold) {
      const overtime = (timeSec - c.spawnSurgeThreshold) / 60;
      rate *= Math.pow(c.lateGameSpawnBoost, overtime * 5);
    }

    return Math.round(Math.min(rate, c.maxSpawnCount / 3) * 10) / 10;
  },

  // 킬타임 고정 HP (플레이어 DPS 기반)
  getMonsterHP(timeSec, stageLevel, mobType, playerDPS) {
    const c = this.CONFIG;
    const stageMult = this._getStageMult(stageLevel);
    const typeMult = this.MOB_TYPE[mobType || 'normal'].hpMult;

    if (playerDPS && playerDPS > 0) {
      // 킬타임 고정: HP = DPS × 3초
      return Math.round(playerDPS * c.killTimeTarget * typeMult);
    }

    // DPS 모를 때 기본 공식
    const t = timeSec / 60;
    return Math.round(c.baseHP * (1 + t * 0.08) * stageMult.hp * typeMult);
  },

  // =============================================================
  // 📊 위험도 계산
  // =============================================================
  getDangerRating(timeSec, stageLevel, playerDPS, playerSpeed) {
    const spawnRate = this.getSpawnRate(timeSec, stageLevel);
    const monsterATK = this.getMonsterATK(timeSec, stageLevel, 'normal');
    const monsterSPD = this.getMonsterSPD(timeSec, stageLevel, 'normal', playerSpeed);
    const dps = playerDPS || 100;

    const R = (spawnRate * monsterATK * monsterSPD) / dps;

    let status;
    if (R < 0.8) status = 'easy';
    else if (R <= 1.1) status = 'ideal';
    else if (R <= 1.3) status = 'hard';
    else status = 'death';

    return {
      value: Math.round(R * 100) / 100,
      status,
      spawnRate,
      monsterATK,
      monsterSPD,
      label: { easy: '쉬움', ideal: '이상적', hard: '어려움', death: '사망구간' }[status]
    };
  },

  // =============================================================
  // 🎯 스폰 결정 (매 프레임 호출)
  // =============================================================
  getSpawnDecision(timeSec, stageLevel, currentMobCount, playerDPS, playerSpeed) {
    const c = this.CONFIG;
    const wave = this._getCurrentWave(timeSec);
    if (!wave) return { spawn: false, mobs: [], event: null };

    // 최대 몹 수 제한
    if (currentMobCount >= c.maxSpawnCount) {
      return { spawn: false, mobs: [], event: null, reason: 'max_count' };
    }

    // 스폰 수
    const rate = this.getSpawnRate(timeSec, stageLevel);
    const spawnCount = Math.floor(rate / 60); // 프레임당 스폰 (60fps 가정)
    const shouldSpawn = Math.random() < (rate / 60);

    if (!shouldSpawn && spawnCount < 1) {
      return { spawn: false, mobs: [], event: null };
    }

    // 몹 타입 결정 (가중치 랜덤)
    const mobs = [];
    const count = Math.max(1, spawnCount);
    for (let i = 0; i < count; i++) {
      let type = this._weightedRandom(wave.mobs);

      // 엘리트 확률
      if (Math.random() < wave.eliteChance) {
        type = 'elite';
      }

      const mobData = {
        type,
        hp: this.getMonsterHP(timeSec, stageLevel, type, playerDPS),
        atk: this.getMonsterATK(timeSec, stageLevel, type),
        spd: this.getMonsterSPD(timeSec, stageLevel, type, playerSpeed),
        xpReward: Math.round(10 * this.MOB_TYPE[type].xpMult * this._getStageMult(stageLevel).atk),
        size: this.MOB_TYPE[type].size
      };
      mobs.push(mobData);
    }

    // 이벤트 체크 (보스/미니보스/군집러시)
    let event = null;
    if (wave.event && Math.abs(timeSec - wave.event.time) < 1) {
      event = this._createEvent(wave.event, timeSec, stageLevel, playerDPS, playerSpeed);
    }

    return { spawn: true, mobs, event, wave: wave.name };
  },

  // =============================================================
  // 🔥 이벤트 생성 (보스/미니보스/러시)
  // =============================================================
  _createEvent(eventDef, timeSec, stageLevel, playerDPS, playerSpeed) {
    switch (eventDef.type) {
      case 'boss':
        return {
          type: 'boss',
          name: this._getBossName(stageLevel),
          hp: this.getMonsterHP(timeSec, stageLevel, 'boss', playerDPS),
          atk: this.getMonsterATK(timeSec, stageLevel, 'boss'),
          spd: this.getMonsterSPD(timeSec, stageLevel, 'boss', playerSpeed),
          size: this.MOB_TYPE.boss.size,
          xpReward: Math.round(100 * this._getStageMult(stageLevel).atk),
          warning: true, // 경고 연출
          warningDuration: 3 // 3초 경고
        };

      case 'miniboss':
        return {
          type: 'miniboss',
          name: '엘리트 대장',
          hp: this.getMonsterHP(timeSec, stageLevel, 'miniboss', playerDPS),
          atk: this.getMonsterATK(timeSec, stageLevel, 'miniboss'),
          spd: this.getMonsterSPD(timeSec, stageLevel, 'miniboss', playerSpeed),
          size: this.MOB_TYPE.miniboss.size,
          xpReward: Math.round(50 * this._getStageMult(stageLevel).atk),
          warning: true,
          warningDuration: 2
        };

      case 'swarm_rush':
        return {
          type: 'swarm_rush',
          name: '군집 러시!',
          mobType: 'swarm',
          count: 30, // 30마리 한꺼번에
          hp: this.getMonsterHP(timeSec, stageLevel, 'swarm', playerDPS),
          atk: this.getMonsterATK(timeSec, stageLevel, 'swarm'),
          spd: this.getMonsterSPD(timeSec, stageLevel, 'swarm', playerSpeed) * 1.3,
          warning: true,
          warningDuration: 2
        };

      default:
        return null;
    }
  },

  _getBossName(stageLevel) {
    const names = [
      '숲의 수호자', '감염된 결정체', '암흑 기사',
      '고대 골렘', '화염 드래곤', '빙하 마녀',
      '심연의 그림자', '폭풍 군주', '죽음의 군주', '혼돈의 왕'
    ];
    return names[Math.min(stageLevel - 1, names.length - 1)] || `보스 Lv.${stageLevel}`;
  },

  // =============================================================
  // 🔧 유틸
  // =============================================================
  _getStageMult(level) {
    return this.STAGE_MULTIPLIER[Math.min(level, 10)] || this.STAGE_MULTIPLIER[1];
  },

  _getCurrentWave(timeSec) {
    return this.WAVE_SCHEDULE.find(w => timeSec >= w.startTime && timeSec < w.endTime) || null;
  },

  _weightedRandom(items) {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.type;
    }
    return items[0].type;
  },

  // ========== 디버그: 3분 타임라인 출력 ==========
  debugTimeline(stageLevel, playerDPS, playerSpeed) {
    console.log(`\n=== 스테이지 ${stageLevel} 타임라인 (3분) ===`);
    console.log('시간 | 스폰/초 | 몹ATK | 몹SPD | 몹HP | 위험도');
    console.log('─'.repeat(55));

    for (let t = 0; t <= 180; t += 15) {
      const spawn = this.getSpawnRate(t, stageLevel);
      const atk = this.getMonsterATK(t, stageLevel, 'normal');
      const spd = this.getMonsterSPD(t, stageLevel, 'normal', playerSpeed);
      const hp = this.getMonsterHP(t, stageLevel, 'normal', playerDPS);
      const danger = this.getDangerRating(t, stageLevel, playerDPS, playerSpeed);

      const m = Math.floor(t / 60);
      const s = (t % 60).toString().padStart(2, '0');
      console.log(
        `${m}:${s}  | ${spawn.toFixed(1)}     | ${atk.toFixed(0).padStart(5)} | ${spd.toFixed(2).padStart(5)} | ${hp.toString().padStart(5)} | ${danger.value.toFixed(2)} ${danger.label}`
      );
    }
  },

  connectToEngine() {
    console.log('[SurvivorBalance] 뱀서류 밸런스 AI 준비 완료 ✅');
    console.log('[SurvivorBalance] 3분 스테이지 | 6웨이브 | 몹 8종 + 보스');
  }
};

if (typeof window !== 'undefined') window.SurvivorBalance = SurvivorBalance;
if (typeof module !== 'undefined') module.exports = SurvivorBalance;
