// ============================================================
// ⚡ 몽글벨 웹엔진 - 속도 AI 계산기
// ============================================================
// 주인공 vs 몹 100마리 동시 속도 계산
// 추격/도주/차단/포위 AI 실시간 연산
//
// Claude Code: js/ai/speed-ai.js 에 넣으세요
// ============================================================

const SpeedAI = {

  // ========== 설정 ==========
  MAX_UNITS: 100,
  TICK_RATE: 60,           // 초당 계산 횟수
  _units: [],              // 전체 유닛 배열 (영웅 + 몹)
  _hero: null,
  _grid: null,             // 충돌 그리드
  _gridSize: 2,            // 그리드 셀 크기
  _mapWidth: 100,
  _mapHeight: 100,

  // ========== 유닛 타입별 기본 속도 ==========
  BASE_SPEEDS: {
    // 영웅
    hero_warrior:   { walk: 3.0, run: 5.5, sprint: 8.0, accel: 4.0, decel: 6.0 },
    hero_mage:      { walk: 2.5, run: 4.5, sprint: 6.5, accel: 3.0, decel: 5.0 },
    hero_archer:    { walk: 3.0, run: 5.8, sprint: 8.5, accel: 4.5, decel: 6.0 },
    hero_knight:    { walk: 2.0, run: 4.0, sprint: 6.0, accel: 2.5, decel: 4.0 },
    hero_rogue:     { walk: 3.5, run: 6.5, sprint: 10.0, accel: 6.0, decel: 7.0 },
    hero_cleric:    { walk: 2.5, run: 4.5, sprint: 6.5, accel: 3.0, decel: 5.0 },
    hero_summoner:  { walk: 2.5, run: 4.8, sprint: 7.0, accel: 3.5, decel: 5.0 },
    hero_alchemist: { walk: 2.8, run: 5.0, sprint: 7.0, accel: 3.5, decel: 5.5 },

    // 몹 - 일반
    mob_slime:      { walk: 1.0, run: 2.0, sprint: 3.0, accel: 1.5, decel: 3.0 },
    mob_goblin:     { walk: 2.5, run: 5.0, sprint: 7.0, accel: 4.0, decel: 5.0 },
    mob_skeleton:   { walk: 2.0, run: 4.0, sprint: 5.5, accel: 3.0, decel: 4.0 },
    mob_wolf:       { walk: 3.0, run: 7.0, sprint: 11.0, accel: 7.0, decel: 5.0 },
    mob_bat:        { walk: 2.0, run: 6.0, sprint: 9.0, accel: 8.0, decel: 8.0 },
    mob_golem:      { walk: 1.0, run: 2.5, sprint: 3.5, accel: 1.0, decel: 2.0 },
    mob_spider:     { walk: 3.0, run: 6.0, sprint: 8.5, accel: 5.0, decel: 6.0 },
    mob_ghost:      { walk: 2.0, run: 5.0, sprint: 8.0, accel: 10.0, decel: 10.0 },
    mob_orc:        { walk: 2.5, run: 5.0, sprint: 7.5, accel: 3.5, decel: 4.0 },
    mob_snake:      { walk: 2.0, run: 5.5, sprint: 9.0, accel: 6.0, decel: 7.0 },
    mob_treant:     { walk: 0.8, run: 1.5, sprint: 2.5, accel: 0.5, decel: 1.5 },
    mob_harpy:      { walk: 2.5, run: 6.5, sprint: 10.0, accel: 8.0, decel: 7.0 },

    // 몹 - 보스
    boss_dragon:    { walk: 2.0, run: 5.0, sprint: 9.0, accel: 3.0, decel: 3.0 },
    boss_demon:     { walk: 2.5, run: 6.0, sprint: 10.0, accel: 4.0, decel: 4.0 },
    boss_lich:      { walk: 1.5, run: 3.5, sprint: 5.0, accel: 2.0, decel: 3.0 },
    boss_titan:     { walk: 1.0, run: 3.0, sprint: 5.0, accel: 1.5, decel: 2.0 },

    // 펫
    pet_cat:        { walk: 3.0, run: 7.0, sprint: 12.0, accel: 8.0, decel: 6.0 },
    pet_dog:        { walk: 3.5, run: 7.5, sprint: 11.0, accel: 7.0, decel: 5.0 },
    pet_bird:       { walk: 2.0, run: 8.0, sprint: 14.0, accel: 10.0, decel: 9.0 },
    pet_dragon:     { walk: 2.5, run: 6.0, sprint: 10.0, accel: 5.0, decel: 4.0 }
  },

  // ========== 지형 속도 배율 ==========
  TERRAIN_MULT: {
    road:     1.0,    // 도로 - 기본
    grass:    0.85,   // 풀밭 - 약간 느림
    sand:     0.65,   // 모래 - 많이 느림
    mud:      0.5,    // 진흙 - 매우 느림
    water:    0.35,   // 얕은 물 - 아주 느림
    ice:      1.1,    // 얼음 - 미끄러워서 빠름 (제어 어려움)
    lava:     0.3,    // 용암 - 거의 못 걸음
    snow:     0.7,    // 눈 - 느림
    forest:   0.75,   // 숲 - 느림
    swamp:    0.45,   // 늪 - 매우 느림
    stone:    0.95,   // 돌바닥 - 약간 느림
    bridge:   1.0,    // 다리 - 기본
    stairs:   0.6     // 계단 - 느림
  },

  // ========== 상태 이상 속도 배율 ==========
  STATUS_MULT: {
    normal:   1.0,
    slow:     0.5,    // 둔화
    haste:    1.5,    // 가속
    freeze:   0.0,    // 빙결 - 정지
    stun:     0.0,    // 기절 - 정지
    poison:   0.8,    // 중독 - 약간 느림
    burn:     0.9,    // 화상 - 약간 느림
    bleed:    0.75,   // 출혈 - 느림
    root:     0.0,    // 속박 - 정지
    fear:     1.3,    // 공포 - 도주 시 빠름
    rage:     1.2,    // 분노 - 빠름
    exhaust:  0.6     // 탈진 - 느림
  },

  // =============================================================
  // 🎮 초기화
  // =============================================================
  init(mapWidth, mapHeight) {
    this._mapWidth = mapWidth || 100;
    this._mapHeight = mapHeight || 100;
    this._units = [];
    this._hero = null;
    this._initGrid();
    console.log(`[SpeedAI] 초기화 (맵: ${this._mapWidth}x${this._mapHeight}, 최대 ${this.MAX_UNITS}유닛)`);
  },

  _initGrid() {
    const cols = Math.ceil(this._mapWidth / this._gridSize);
    const rows = Math.ceil(this._mapHeight / this._gridSize);
    this._grid = new Array(cols * rows).fill(null).map(() => []);
  },

  // =============================================================
  // 📌 유닛 등록
  // =============================================================
  registerHero(data) {
    const speedData = this.BASE_SPEEDS[`hero_${data.class}`] || this.BASE_SPEEDS.hero_warrior;
    
    this._hero = {
      id: data.id || 'hero',
      type: 'hero',
      class: data.class || 'warrior',
      x: data.x || 0,
      y: data.y || 0,
      vx: 0,
      vy: 0,
      speed: { ...speedData },
      currentSpeed: 0,
      maxSpeed: speedData.run,
      targetX: data.x || 0,
      targetY: data.y || 0,
      direction: 0,         // 라디안
      terrain: 'road',
      status: 'normal',
      spdStat: data.spdStat || 10,  // 게임 SPD 스탯
      isMoving: false
    };

    // SPD 스탯 반영 (SPD가 높을수록 빠름)
    const spdBonus = 1 + (this._hero.spdStat - 10) * 0.02;
    this._hero.speed.walk *= spdBonus;
    this._hero.speed.run *= spdBonus;
    this._hero.speed.sprint *= spdBonus;

    return this._hero;
  },

  registerMob(data) {
    if (this._units.length >= this.MAX_UNITS) {
      console.warn('[SpeedAI] 최대 유닛 수 초과!');
      return null;
    }

    const speedData = this.BASE_SPEEDS[data.mobType] || this.BASE_SPEEDS.mob_goblin;
    const levelMult = 1 + (data.level || 1) * 0.01; // 레벨당 1% 빨라짐

    const mob = {
      id: data.id || `mob_${this._units.length}`,
      type: 'mob',
      mobType: data.mobType || 'mob_goblin',
      x: data.x || Math.random() * this._mapWidth,
      y: data.y || Math.random() * this._mapHeight,
      vx: 0,
      vy: 0,
      speed: {
        walk: speedData.walk * levelMult,
        run: speedData.run * levelMult,
        sprint: speedData.sprint * levelMult,
        accel: speedData.accel * levelMult,
        decel: speedData.decel * levelMult
      },
      currentSpeed: 0,
      maxSpeed: speedData.run * levelMult,
      targetX: 0,
      targetY: 0,
      direction: 0,
      terrain: 'road',
      status: 'normal',
      level: data.level || 1,

      // AI 행동
      aiState: 'idle',     // idle, patrol, chase, flee, surround, intercept
      aggroRange: data.aggroRange || 8,
      attackRange: data.attackRange || 1.5,
      _patrolCenter: { x: data.x || 0, y: data.y || 0 },
      _patrolRadius: data.patrolRadius || 5,
      _lastSawHero: 0,
      _loseAggroTime: 5000, // 5초 후 어그로 해제

      isAlive: true
    };

    this._units.push(mob);
    return mob;
  },

  registerMobs(mobsData) {
    return mobsData.map(data => this.registerMob(data));
  },

  removeMob(mobId) {
    this._units = this._units.filter(u => u.id !== mobId);
  },

  // =============================================================
  // ⚡ 핵심: 100유닛 동시 속도 계산 (매 프레임)
  // =============================================================
  update(dt) {
    if (!this._hero) return;
    const deltaTime = dt || (1 / this.TICK_RATE);

    // 1. 영웅 이동 업데이트
    this._updateHeroMovement(deltaTime);

    // 2. 그리드 초기화
    this._clearGrid();
    this._insertToGrid(this._hero);

    // 3. 모든 몹 AI + 이동 (100마리 동시)
    for (let i = 0; i < this._units.length; i++) {
      const mob = this._units[i];
      if (!mob.isAlive) continue;

      // AI 상태 결정
      this._updateMobAI(mob, deltaTime);

      // 속도 계산 + 이동
      this._updateMobMovement(mob, deltaTime);

      // 그리드 등록
      this._insertToGrid(mob);
    }

    // 4. 충돌 체크 (그리드 기반 - O(n) 성능)
    this._checkCollisions();
  },

  // ========== 영웅 이동 ==========
  _updateHeroMovement(dt) {
    const hero = this._hero;
    const dx = hero.targetX - hero.x;
    const dy = hero.targetY - hero.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      // 도착
      hero.isMoving = false;
      hero.currentSpeed = Math.max(0, hero.currentSpeed - hero.speed.decel * dt);
      hero.vx = 0;
      hero.vy = 0;
      return;
    }

    hero.isMoving = true;
    hero.direction = Math.atan2(dy, dx);

    // 지형 + 상태 배율
    const terrainMult = this.TERRAIN_MULT[hero.terrain] || 1.0;
    const statusMult = this.STATUS_MULT[hero.status] || 1.0;

    // 가속
    const targetSpeed = hero.maxSpeed * terrainMult * statusMult;
    if (hero.currentSpeed < targetSpeed) {
      hero.currentSpeed = Math.min(targetSpeed, hero.currentSpeed + hero.speed.accel * dt);
    } else {
      hero.currentSpeed = Math.max(targetSpeed, hero.currentSpeed - hero.speed.decel * dt);
    }

    // 이동
    const moveX = Math.cos(hero.direction) * hero.currentSpeed * dt;
    const moveY = Math.sin(hero.direction) * hero.currentSpeed * dt;
    hero.x += moveX;
    hero.y += moveY;
    hero.vx = moveX / dt;
    hero.vy = moveY / dt;

    // 맵 경계
    hero.x = Math.max(0, Math.min(this._mapWidth, hero.x));
    hero.y = Math.max(0, Math.min(this._mapHeight, hero.y));
  },

  // ========== 몹 AI 상태 결정 ==========
  _updateMobAI(mob, dt) {
    const hero = this._hero;
    const dx = hero.x - mob.x;
    const dy = hero.y - mob.y;
    const distToHero = Math.sqrt(dx * dx + dy * dy);
    const now = Date.now();

    switch (mob.aiState) {
      case 'idle':
        if (distToHero <= mob.aggroRange) {
          mob.aiState = 'chase';
          mob._lastSawHero = now;
        }
        break;

      case 'patrol':
        if (distToHero <= mob.aggroRange) {
          mob.aiState = 'chase';
          mob._lastSawHero = now;
        }
        // 순찰 지점으로 이동
        const patrolDist = Math.sqrt(
          (mob.x - mob._patrolCenter.x) ** 2 + (mob.y - mob._patrolCenter.y) ** 2
        );
        if (patrolDist > mob._patrolRadius) {
          mob.targetX = mob._patrolCenter.x;
          mob.targetY = mob._patrolCenter.y;
        } else if (!mob._patrolTarget || Math.random() < 0.01) {
          const angle = Math.random() * Math.PI * 2;
          mob._patrolTarget = {
            x: mob._patrolCenter.x + Math.cos(angle) * mob._patrolRadius * Math.random(),
            y: mob._patrolCenter.y + Math.sin(angle) * mob._patrolRadius * Math.random()
          };
          mob.targetX = mob._patrolTarget.x;
          mob.targetY = mob._patrolTarget.y;
        }
        break;

      case 'chase':
        mob._lastSawHero = now;
        
        if (distToHero <= mob.attackRange) {
          mob.aiState = 'attack';
          mob.targetX = mob.x;
          mob.targetY = mob.y;
          return;
        }

        if (distToHero > mob.aggroRange * 2) {
          mob.aiState = 'patrol';
          return;
        }

        // === 추격 AI: 주인공을 따라잡기 위한 속도 계산 ===
        const pursuitResult = this.calculatePursuit(mob, hero);
        mob.targetX = pursuitResult.interceptX;
        mob.targetY = pursuitResult.interceptY;
        mob.maxSpeed = pursuitResult.requiredSpeed;
        break;

      case 'attack':
        if (distToHero > mob.attackRange * 1.5) {
          mob.aiState = 'chase';
        }
        break;

      case 'flee':
        // 도주: 영웅 반대 방향
        mob.targetX = mob.x - dx;
        mob.targetY = mob.y - dy;
        mob.maxSpeed = mob.speed.sprint;
        if (distToHero > mob.aggroRange * 3) {
          mob.aiState = 'patrol';
        }
        break;

      case 'surround':
        // 포위: 영웅 주변 일정 거리 유지하며 원형 배치
        const surroundResult = this.calculateSurround(mob, hero, this._units);
        mob.targetX = surroundResult.x;
        mob.targetY = surroundResult.y;
        break;

      case 'intercept':
        // 차단: 영웅의 예상 경로를 차단
        const interceptResult = this.calculateIntercept(mob, hero);
        mob.targetX = interceptResult.x;
        mob.targetY = interceptResult.y;
        mob.maxSpeed = interceptResult.speed;
        break;
    }
  },

  // ========== 몹 이동 계산 ==========
  _updateMobMovement(mob, dt) {
    const dx = mob.targetX - mob.x;
    const dy = mob.targetY - mob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.2) {
      mob.currentSpeed = Math.max(0, mob.currentSpeed - mob.speed.decel * dt);
      mob.vx = 0;
      mob.vy = 0;
      return;
    }

    mob.direction = Math.atan2(dy, dx);

    const terrainMult = this.TERRAIN_MULT[mob.terrain] || 1.0;
    const statusMult = this.STATUS_MULT[mob.status] || 1.0;
    const targetSpeed = Math.min(mob.maxSpeed, mob.speed.sprint) * terrainMult * statusMult;

    if (mob.currentSpeed < targetSpeed) {
      mob.currentSpeed = Math.min(targetSpeed, mob.currentSpeed + mob.speed.accel * dt);
    } else {
      mob.currentSpeed = Math.max(targetSpeed, mob.currentSpeed - mob.speed.decel * dt);
    }

    mob.x += Math.cos(mob.direction) * mob.currentSpeed * dt;
    mob.y += Math.sin(mob.direction) * mob.currentSpeed * dt;
    mob.vx = Math.cos(mob.direction) * mob.currentSpeed;
    mob.vy = Math.sin(mob.direction) * mob.currentSpeed;

    mob.x = Math.max(0, Math.min(this._mapWidth, mob.x));
    mob.y = Math.max(0, Math.min(this._mapHeight, mob.y));
  },

  // =============================================================
  // 🧠 핵심 계산 함수들
  // =============================================================

  // 추격 계산: 몹이 영웅을 따라잡으려면 어느 속도/방향으로?
  calculatePursuit(mob, hero) {
    const dx = hero.x - mob.x;
    const dy = hero.y - mob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 영웅이 안 움직이면 직선 추격
    if (!hero.isMoving || hero.currentSpeed < 0.1) {
      return {
        interceptX: hero.x,
        interceptY: hero.y,
        requiredSpeed: mob.speed.run,
        timeToReach: dist / mob.speed.run,
        canCatch: true
      };
    }

    // === 차단점 예측 (리드 추격) ===
    // 영웅의 미래 위치를 예측해서 그쪽으로 이동
    const heroSpeed = hero.currentSpeed;
    const mobMaxSpeed = mob.speed.sprint;

    // 도달 시간 추정
    const estimatedTime = dist / mobMaxSpeed;

    // 영웅의 예측 위치
    const predictX = hero.x + hero.vx * estimatedTime;
    const predictY = hero.y + hero.vy * estimatedTime;

    // 예측 위치까지의 거리
    const pdx = predictX - mob.x;
    const pdy = predictY - mob.y;
    const predictDist = Math.sqrt(pdx * pdx + pdy * pdy);

    // 필요한 속도 계산
    const requiredSpeed = predictDist / estimatedTime;
    const canCatch = requiredSpeed <= mob.speed.sprint;

    // 따라잡을 수 없으면 최대 속도로 직선 추격
    if (!canCatch) {
      return {
        interceptX: hero.x + hero.vx * 0.5, // 0.5초 후 예측
        interceptY: hero.y + hero.vy * 0.5,
        requiredSpeed: mob.speed.sprint,
        timeToReach: dist / mob.speed.sprint,
        canCatch: false
      };
    }

    return {
      interceptX: predictX,
      interceptY: predictY,
      requiredSpeed: Math.min(requiredSpeed, mob.speed.sprint),
      timeToReach: estimatedTime,
      canCatch: true
    };
  },

  // 차단 계산: 영웅의 이동 경로를 끊으려면?
  calculateIntercept(mob, hero) {
    if (!hero.isMoving) {
      return { x: hero.x, y: hero.y, speed: mob.speed.run };
    }

    // 영웅의 이동 방향 앞에 위치
    const heroDir = hero.direction;
    const interceptDist = 5; // 5칸 앞에서 대기
    const interceptX = hero.x + Math.cos(heroDir) * interceptDist;
    const interceptY = hero.y + Math.sin(heroDir) * interceptDist;

    const dx = interceptX - mob.x;
    const dy = interceptY - mob.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 영웅보다 빨리 도착해야 함
    const heroTimeToPoint = interceptDist / hero.currentSpeed;
    const requiredSpeed = dist / heroTimeToPoint;

    return {
      x: interceptX,
      y: interceptY,
      speed: Math.min(requiredSpeed * 1.1, mob.speed.sprint), // 10% 여유
      canIntercept: requiredSpeed <= mob.speed.sprint
    };
  },

  // 포위 계산: 여러 몹이 영웅을 둘러싸려면?
  calculateSurround(mob, hero, allMobs) {
    const chaseMobs = allMobs.filter(m => 
      m.isAlive && (m.aiState === 'surround' || m.aiState === 'chase')
    );
    const mobIndex = chaseMobs.indexOf(mob);
    const totalMobs = chaseMobs.length;

    if (totalMobs === 0) return { x: hero.x, y: hero.y };

    // 원형 배치 (각 몹에게 고유 각도 배정)
    const radius = mob.attackRange * 1.2;
    const angle = (mobIndex / totalMobs) * Math.PI * 2;

    // 영웅의 이동 방향 고려 (앞쪽에 더 많이 배치)
    const heroDir = hero.direction;
    const biasAngle = angle + heroDir;

    return {
      x: hero.x + Math.cos(biasAngle) * radius,
      y: hero.y + Math.sin(biasAngle) * radius
    };
  },

  // =============================================================
  // 📊 분석 함수 (디버그/UI용)
  // =============================================================

  // 모든 몹의 추격 분석 (한번에)
  analyzeAllPursuits() {
    if (!this._hero) return [];

    const results = [];
    for (let i = 0; i < this._units.length; i++) {
      const mob = this._units[i];
      if (!mob.isAlive) continue;

      const dx = this._hero.x - mob.x;
      const dy = this._hero.y - mob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const pursuit = this.calculatePursuit(mob, this._hero);

      results.push({
        id: mob.id,
        mobType: mob.mobType,
        distance: Math.round(dist * 10) / 10,
        mobSpeed: Math.round(mob.currentSpeed * 10) / 10,
        heroSpeed: Math.round(this._hero.currentSpeed * 10) / 10,
        requiredSpeed: Math.round(pursuit.requiredSpeed * 10) / 10,
        maxSpeed: Math.round(mob.speed.sprint * 10) / 10,
        canCatch: pursuit.canCatch,
        timeToReach: Math.round(pursuit.timeToReach * 10) / 10,
        aiState: mob.aiState,
        terrain: mob.terrain,
        status: mob.status
      });
    }

    // 가까운 순 정렬
    results.sort((a, b) => a.distance - b.distance);
    return results;
  },

  // 영웅이 도주 가능한지 분석
  analyzeEscape() {
    if (!this._hero) return null;

    const threats = this.analyzeAllPursuits().filter(m => m.canCatch && m.distance < m.mobSpeed * 5);
    const fastestThreat = threats.reduce((max, m) => m.maxSpeed > max.maxSpeed ? m : max, { maxSpeed: 0 });
    const closestThreat = threats[0] || null;

    return {
      totalThreats: threats.length,
      closestThreat,
      fastestThreat,
      heroSpeed: this._hero.currentSpeed,
      heroMaxSprint: this._hero.speed.sprint,
      canEscape: !fastestThreat || this._hero.speed.sprint > fastestThreat.maxSpeed,
      escapeDirection: closestThreat ? Math.atan2(
        this._hero.y - closestThreat.distance, 
        this._hero.x - closestThreat.distance
      ) + Math.PI : 0,
      dangerLevel: threats.length === 0 ? 'safe' :
                   threats.length < 3 ? 'low' :
                   threats.length < 6 ? 'medium' :
                   threats.length < 10 ? 'high' : 'critical'
    };
  },

  // =============================================================
  // 🎯 외부 API
  // =============================================================

  // 영웅 이동 목표 설정
  setHeroTarget(x, y) {
    if (!this._hero) return;
    this._hero.targetX = x;
    this._hero.targetY = y;
  },

  // 영웅 달리기/걷기/스프린트 모드
  setHeroMoveMode(mode) {
    if (!this._hero) return;
    switch (mode) {
      case 'walk':   this._hero.maxSpeed = this._hero.speed.walk; break;
      case 'run':    this._hero.maxSpeed = this._hero.speed.run; break;
      case 'sprint': this._hero.maxSpeed = this._hero.speed.sprint; break;
    }
  },

  // 몹 AI 상태 강제 변경
  setMobAI(mobId, state) {
    const mob = this._units.find(u => u.id === mobId);
    if (mob) mob.aiState = state;
  },

  // 모든 몹을 특정 AI 상태로
  setAllMobsAI(state) {
    this._units.forEach(mob => { if (mob.isAlive) mob.aiState = state; });
  },

  // 지형 설정
  setUnitTerrain(unitId, terrain) {
    const unit = unitId === 'hero' ? this._hero : this._units.find(u => u.id === unitId);
    if (unit) unit.terrain = terrain;
  },

  // 상태 이상 설정
  setUnitStatus(unitId, status) {
    const unit = unitId === 'hero' ? this._hero : this._units.find(u => u.id === unitId);
    if (unit) unit.status = status;
  },

  // 전체 유닛 위치 가져오기 (렌더링용)
  getAllPositions() {
    const positions = [];
    if (this._hero) {
      positions.push({
        id: this._hero.id, type: 'hero',
        x: this._hero.x, y: this._hero.y,
        direction: this._hero.direction,
        speed: this._hero.currentSpeed,
        isMoving: this._hero.isMoving
      });
    }
    for (let i = 0; i < this._units.length; i++) {
      const m = this._units[i];
      if (!m.isAlive) continue;
      positions.push({
        id: m.id, type: 'mob', mobType: m.mobType,
        x: m.x, y: m.y,
        direction: m.direction,
        speed: m.currentSpeed,
        aiState: m.aiState
      });
    }
    return positions;
  },

  // =============================================================
  // 🔧 내부 유틸
  // =============================================================
  _clearGrid() {
    for (let i = 0; i < this._grid.length; i++) this._grid[i] = [];
  },

  _insertToGrid(unit) {
    const col = Math.floor(unit.x / this._gridSize);
    const row = Math.floor(unit.y / this._gridSize);
    const cols = Math.ceil(this._mapWidth / this._gridSize);
    const idx = row * cols + col;
    if (idx >= 0 && idx < this._grid.length) {
      this._grid[idx].push(unit);
    }
  },

  _checkCollisions() {
    // 그리드 기반 충돌 (같은 셀 + 인접 셀만 체크)
    // O(n) 성능으로 100유닛도 문제없음
    const cols = Math.ceil(this._mapWidth / this._gridSize);
    for (let i = 0; i < this._grid.length; i++) {
      if (this._grid[i].length < 2) continue;
      const units = this._grid[i];
      for (let a = 0; a < units.length; a++) {
        for (let b = a + 1; b < units.length; b++) {
          const dx = units[a].x - units[b].x;
          const dy = units[a].y - units[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.5) {
            // 밀어내기
            const pushX = dx / dist * 0.25;
            const pushY = dy / dist * 0.25;
            units[a].x += pushX;
            units[a].y += pushY;
            units[b].x -= pushX;
            units[b].y -= pushY;
          }
        }
      }
    }
  },

  connectToEngine() {
    console.log('[SpeedAI] 속도 AI 계산기 준비 완료 ✅');
    console.log('[SpeedAI] 최대 100유닛 동시 계산 가능');
  }
};

if (typeof window !== 'undefined') window.SpeedAI = SpeedAI;
if (typeof module !== 'undefined') module.exports = SpeedAI;
