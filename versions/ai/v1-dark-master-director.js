// ============================================================
// 🧠 몽글벨 웹엔진 - 마스터 디렉터 AI
// ============================================================
// 모든 생성기를 감시하고 현재 난이도에 맞는
// 몹/아이템/드롭/보스를 자동 생산하는 중앙 AI
//
// 작동 원리:
//   1. 현재 게임 상태 전체 스캔 (60fps)
//   2. 난이도 등급 실시간 판정
//   3. 각 생성기에 "이거 만들어" 명령 전달
//   4. 너무 쉬우면 ↑, 너무 어려우면 ↓ 자동 조절
//
// Claude Code: js/ai/master-director.js 에 넣으세요
// ============================================================

const MasterDirector = {

  // ========== 상태 ==========
  _enabled: true,
  _alwaysActive: true,
  _gameState: null,
  _difficultyScore: 1.0,    // 0.5(쉬움) ~ 2.0(극한)
  _difficultyGrade: 'normal',
  _adjustSpeed: 0.02,        // 난이도 조절 속도
  _scanInterval: 500,         // 0.5초마다 전체 스캔
  _lastScan: 0,
  _history: [],               // 최근 30초 기록
  _generators: {},            // 등록된 생성기들

  // ========== 난이도 등급 ==========
  GRADES: {
    trivial:  { min: 0.0, max: 0.5, label: '너무쉬움', color: '#88FF88' },
    easy:     { min: 0.5, max: 0.8, label: '쉬움',     color: '#44CC44' },
    normal:   { min: 0.8, max: 1.1, label: '적정',     color: '#4488FF' },
    hard:     { min: 1.1, max: 1.3, label: '어려움',   color: '#FF8800' },
    extreme:  { min: 1.3, max: 1.6, label: '극한',     color: '#FF4400' },
    death:    { min: 1.6, max: 9.9, label: '사망구간', color: '#FF0000' }
  },

  // ========== 생성기 타입 정의 ==========
  GENERATOR_TYPES: {
    mob_spawner:      { name: '몹 생성기',      priority: 1 },
    elite_spawner:    { name: '엘리트 생성기',   priority: 2 },
    boss_spawner:     { name: '보스 생성기',     priority: 3 },
    item_dropper:     { name: '아이템 드롭',     priority: 4 },
    upgrade_spawner:  { name: '업그레이드 생성',  priority: 5 },
    gold_spawner:     { name: '골드 드롭',       priority: 6 },
    heal_spawner:     { name: '회복 아이템',     priority: 7 },
    obstacle_spawner: { name: '장애물 생성',     priority: 8 },
    event_trigger:    { name: '이벤트 트리거',   priority: 9 }
  },

  // ========== 난이도별 생성 규칙 ==========
  PRODUCTION_RULES: {
    trivial: {
      mobSpawnMult:     1.5,    // 더 많이 생성 (쉬우니까)
      mobStrengthMult:  0.7,    // 약한 몹
      eliteChance:      0.02,
      itemDropMult:     0.8,    // 아이템 적게
      upgradeDropMult:  0.7,
      healDropMult:     0.5,    // 회복 적게 (필요없으니)
      goldMult:         0.8,
      bossDelayMult:    0.8     // 보스 빨리
    },
    easy: {
      mobSpawnMult:     1.2,
      mobStrengthMult:  0.85,
      eliteChance:      0.05,
      itemDropMult:     0.9,
      upgradeDropMult:  0.85,
      healDropMult:     0.7,
      goldMult:         0.9,
      bossDelayMult:    0.9
    },
    normal: {
      mobSpawnMult:     1.0,    // 기준값
      mobStrengthMult:  1.0,
      eliteChance:      0.10,
      itemDropMult:     1.0,
      upgradeDropMult:  1.0,
      healDropMult:     1.0,
      goldMult:         1.0,
      bossDelayMult:    1.0
    },
    hard: {
      mobSpawnMult:     0.9,    // 약간 줄임 (이미 강하니까)
      mobStrengthMult:  1.15,
      eliteChance:      0.15,
      itemDropMult:     1.2,    // 보상 증가!
      upgradeDropMult:  1.3,
      healDropMult:     1.5,    // 회복 더 자주
      goldMult:         1.3,
      bossDelayMult:    1.1
    },
    extreme: {
      mobSpawnMult:     0.8,
      mobStrengthMult:  1.1,
      eliteChance:      0.20,
      itemDropMult:     1.5,    // 보상 대폭 증가
      upgradeDropMult:  1.5,
      healDropMult:     2.0,    // 회복 2배
      goldMult:         1.5,
      bossDelayMult:    1.2
    },
    death: {
      mobSpawnMult:     0.6,    // 몹 줄임 (생존 불가 방지)
      mobStrengthMult:  1.0,    // 강화 중지
      eliteChance:      0.15,
      itemDropMult:     2.0,    // 보상 대폭!
      upgradeDropMult:  2.0,
      healDropMult:     3.0,    // 회복 3배!
      goldMult:         2.0,
      bossDelayMult:    1.5     // 보스 늦게
    }
  },

  // ========== 몹 타입별 난이도 가중치 ==========
  MOB_DIFFICULTY_WEIGHT: {
    normal:   1.0,
    fast:     0.8,
    tank:     1.5,
    ranged:   1.3,
    exploder: 1.8,
    swarm:    0.4,
    healer:   2.0,   // 힐러는 난이도를 크게 올림
    summoner: 2.5,
    elite:    4.0,
    boss:     15.0,
    miniboss: 8.0
  },

  // =============================================================
  // 🚀 초기화
  // =============================================================
  init(gameState) {
    this._gameState = gameState || {};
    this._difficultyScore = 1.0;
    this._difficultyGrade = 'normal';
    this._history = [];
    this._generators = {};
    console.log('[MasterDirector] 마스터 디렉터 AI 초기화 ✅');
    console.log('[MasterDirector] 모든 생성기를 감시합니다.');
  },

  // =============================================================
  // 📡 생성기 등록
  // =============================================================
  registerGenerator(id, type, config) {
    this._generators[id] = {
      id,
      type,
      config: config || {},
      active: true,
      lastProduced: 0,
      totalProduced: 0,
      currentOutput: []
    };
    console.log(`[MasterDirector] 생성기 등록: ${id} (${this.GENERATOR_TYPES[type]?.name || type})`);
  },

  removeGenerator(id) {
    delete this._generators[id];
  },

  // =============================================================
  // 🧠 매 프레임 업데이트 (핵심)
  // =============================================================
  update(dt, gameState) {
    if (!this._enabled) return;
    this._gameState = gameState;
    const now = Date.now();

    // 0.5초마다 전체 스캔
    if (now - this._lastScan >= this._scanInterval) {
      this._lastScan = now;
      this._fullScan(gameState);
    }
  },

  // =============================================================
  // 🔍 전체 스캔 (게임 상태 분석)
  // =============================================================
  _fullScan(gs) {
    // 1. 플레이어 상태 파악
    const player = this._analyzePlayer(gs);

    // 2. 현재 적 상태 파악
    const enemies = this._analyzeEnemies(gs);

    // 3. 난이도 점수 계산
    this._calculateDifficulty(player, enemies, gs);

    // 4. 난이도 등급 판정
    this._updateGrade();

    // 5. 기록
    this._history.push({
      time: Date.now(),
      score: this._difficultyScore,
      grade: this._difficultyGrade,
      playerHP: player.hpRatio,
      enemyCount: enemies.count,
      dps: player.dps
    });
    // 최근 60개만 유지 (30초)
    if (this._history.length > 60) this._history.shift();

    // 6. 각 생성기에 명령
    this._commandGenerators();
  },

  // ========== 플레이어 분석 ==========
  _analyzePlayer(gs) {
    const hero = gs.hero || gs.player || {};
    return {
      hp:       hero.hp || 250,
      maxHp:    hero.maxHp || hero.maxHP || 250,
      hpRatio:  (hero.hp || 250) / (hero.maxHp || hero.maxHP || 250),
      atk:      hero.atk || hero.ATK || 12,
      def:      hero.def || hero.DEF || 7,
      spd:      hero.spd || hero.SPD || 3,
      dps:      hero.dps || (hero.atk || 12) * 2,
      level:    hero.level || 1,
      killCount:  gs.killCount || 0,
      deathCount: gs.deathCount || 0,
      hitsTaken:  gs.hitsTaken || 0,
      healUsed:   gs.healUsed || 0,
      comboCount: gs.comboCount || 0
    };
  },

  // ========== 적 분석 ==========
  _analyzeEnemies(gs) {
    const mobs = gs.enemies || gs.mobs || [];
    let totalDifficulty = 0;
    let totalHP = 0;
    let typeCount = {};

    for (let i = 0; i < mobs.length; i++) {
      const mob = mobs[i];
      if (!mob || !mob.alive) continue;
      const type = mob.type || mob.mobType || 'normal';
      const weight = this.MOB_DIFFICULTY_WEIGHT[type] || 1.0;
      totalDifficulty += weight;
      totalHP += mob.hp || 0;
      typeCount[type] = (typeCount[type] || 0) + 1;
    }

    return {
      count: mobs.filter(m => m && m.alive !== false).length,
      totalDifficulty,
      totalHP,
      typeCount,
      hasBoss: !!(typeCount.boss || typeCount.miniboss),
      hasHealer: !!typeCount.healer,
      hasElite: !!typeCount.elite
    };
  },

  // ========== 난이도 계산 ==========
  _calculateDifficulty(player, enemies, gs) {
    const elapsed = gs.elapsed || gs.elapsedTime || 0;
    const stageLevel = gs.stageLevel || gs.stage || 1;

    // 위험도 기본 (적 위협 / 플레이어 DPS)
    const threatLevel = enemies.totalDifficulty * 2;
    const baseDifficulty = threatLevel / Math.max(1, player.dps * 0.1);

    // 플레이어 HP 상태 반영
    const hpFactor = player.hpRatio < 0.3 ? 1.5 :  // 빈사 → 어려움↑
                     player.hpRatio < 0.5 ? 1.2 :
                     player.hpRatio > 0.9 ? 0.8 : 1.0; // 풀피 → 쉬움

    // 최근 피격 빈도
    const recentHits = this._getRecentHitRate(gs);
    const hitFactor = recentHits > 5 ? 1.3 :  // 많이 맞으면 어려움↑
                      recentHits > 2 ? 1.1 : 1.0;

    // 킬 속도 (킬이 빠르면 쉬운 것)
    const killRate = (gs.recentKills || 0) / Math.max(1, elapsed);
    const killFactor = killRate > 3 ? 0.8 :  // 빠른 킬 → 쉬움
                       killRate < 0.5 ? 1.3 : 1.0; // 느린 킬 → 어려움

    // 적 수 (많으면 어려움)
    const countFactor = enemies.count > 50 ? 1.4 :
                        enemies.count > 30 ? 1.2 :
                        enemies.count < 5  ? 0.7 : 1.0;

    // 종합
    let rawScore = baseDifficulty * hpFactor * hitFactor * killFactor * countFactor;

    // 부드러운 전환 (급격한 변화 방지)
    const target = Math.max(0.3, Math.min(2.5, rawScore));
    this._difficultyScore += (target - this._difficultyScore) * this._adjustSpeed;
  },

  _getRecentHitRate(gs) {
    // 최근 5초 피격 횟수
    const recent = this._history.slice(-10);
    if (recent.length < 2) return 0;
    return (gs.hitsTaken || 0) - (recent[0]?.playerHits || 0);
  },

  // ========== 등급 판정 ==========
  _updateGrade() {
    const score = this._difficultyScore;
    for (const [grade, range] of Object.entries(this.GRADES)) {
      if (score >= range.min && score < range.max) {
        this._difficultyGrade = grade;
        return;
      }
    }
    this._difficultyGrade = 'death';
  },

  // =============================================================
  // 📢 생성기에 명령 전달 (핵심!)
  // =============================================================
  _commandGenerators() {
    const rules = this.PRODUCTION_RULES[this._difficultyGrade] || this.PRODUCTION_RULES.normal;
    const gs = this._gameState;
    const stageLevel = gs.stageLevel || gs.stage || 1;
    const elapsed = gs.elapsed || 0;

    Object.values(this._generators).forEach(gen => {
      if (!gen.active) return;

      switch (gen.type) {
        case 'mob_spawner':
          gen.currentOutput = this._decideMobSpawn(rules, stageLevel, elapsed);
          break;
        case 'elite_spawner':
          gen.currentOutput = this._decideEliteSpawn(rules, stageLevel);
          break;
        case 'boss_spawner':
          gen.currentOutput = this._decideBossSpawn(rules, stageLevel, elapsed);
          break;
        case 'item_dropper':
          gen.currentOutput = this._decideItemDrop(rules, stageLevel);
          break;
        case 'upgrade_spawner':
          gen.currentOutput = this._decideUpgradeDrop(rules, stageLevel);
          break;
        case 'gold_spawner':
          gen.currentOutput = this._decideGoldDrop(rules, stageLevel);
          break;
        case 'heal_spawner':
          gen.currentOutput = this._decideHealDrop(rules, stageLevel);
          break;
        case 'obstacle_spawner':
          gen.currentOutput = this._decideObstacle(rules, stageLevel);
          break;
        case 'event_trigger':
          gen.currentOutput = this._decideEvent(rules, stageLevel, elapsed);
          break;
      }

      gen.totalProduced += gen.currentOutput.length;
      gen.lastProduced = Date.now();
    });
  },

  // =============================================================
  // 🧟 각 생성기의 생산 결정
  // =============================================================

  // 몹 생성 결정
  _decideMobSpawn(rules, stageLevel, elapsed) {
    const baseCount = this._getBaseSpawnCount(stageLevel, elapsed);
    const adjusted = baseCount * rules.mobSpawnMult;
    // 소수점은 확률로 처리 (2.3 → 2마리 확정 + 30% 확률로 1마리 추가)
    const count = Math.floor(adjusted) + (Math.random() < (adjusted % 1) ? 1 : 0);

    const mobs = [];
    for (let i = 0; i < count; i++) {
      // 난이도에 따라 몹 타입 선택
      const type = this._selectMobType(rules);
      mobs.push({
        action: 'spawn_mob',
        type,
        strengthMult: rules.mobStrengthMult,
        stageLevel
      });
    }
    return mobs;
  },

  _selectMobType(rules) {
    const roll = Math.random();
    const grade = this._difficultyGrade;

    // 쉬울수록 약한 몹, 어려울수록 다양한 몹
    if (grade === 'trivial' || grade === 'easy') {
      if (roll < 0.70) return 'normal';
      if (roll < 0.90) return 'fast';
      return 'swarm';
    }
    if (grade === 'normal') {
      if (roll < 0.50) return 'normal';
      if (roll < 0.70) return 'fast';
      if (roll < 0.85) return 'tank';
      if (roll < 0.95) return 'ranged';
      return 'exploder';
    }
    // hard / extreme / death
    if (roll < 0.30) return 'normal';
    if (roll < 0.45) return 'fast';
    if (roll < 0.55) return 'tank';
    if (roll < 0.65) return 'ranged';
    if (roll < 0.75) return 'exploder';
    if (roll < 0.85) return 'swarm';
    if (roll < 0.92) return 'healer';
    return 'summoner';
  },

  _getBaseSpawnCount(stageLevel, elapsed) {
    if (typeof SurvivorBalance !== 'undefined') {
      // getSpawnRate = 초당 스폰 수, scanInterval = 500ms → 0.5초당 스폰 수
      const rate = SurvivorBalance.getSpawnRate(elapsed, stageLevel);
      return rate * (this._scanInterval / 1000);
    }
    return 1 + stageLevel * 0.05;
  },

  // 엘리트 생성
  _decideEliteSpawn(rules, stageLevel) {
    if (Math.random() > rules.eliteChance) return [];
    return [{
      action: 'spawn_elite',
      strengthMult: rules.mobStrengthMult * 2,
      stageLevel
    }];
  },

  // 보스 생성
  _decideBossSpawn(rules, stageLevel, elapsed) {
    // 보스는 2분 40초 근처에서만
    const bossTime = 160 * rules.bossDelayMult;
    if (Math.abs(elapsed - bossTime) > 2) return [];

    let bossStats = null;
    if (typeof FormulaPack2 !== 'undefined') {
      const player = this._analyzePlayer(this._gameState);
      bossStats = FormulaPack2.getBossStats(stageLevel, {
        hp: player.hp, atk: player.atk, def: player.def, dps: player.dps
      });
    }

    return [{
      action: 'spawn_boss',
      stats: bossStats,
      stageLevel,
      warning: true,
      warningDuration: 3
    }];
  },

  // 아이템 드롭
  _decideItemDrop(rules, stageLevel) {
    const baseRate = 0.10;
    const rate = baseRate * rules.itemDropMult;
    if (Math.random() > rate) return [];

    let rarity = 1;
    if (typeof FormulaPack1 !== 'undefined') {
      rarity = FormulaPack1.getDropRarity(stageLevel);
    } else {
      const roll = Math.random();
      if (roll < 0.01) rarity = 5;
      else if (roll < 0.05) rarity = 4;
      else if (roll < 0.15) rarity = 3;
      else if (roll < 0.40) rarity = 2;
    }

    // 어려울수록 높은 등급 보정
    if (this._difficultyGrade === 'hard' || this._difficultyGrade === 'extreme') {
      rarity = Math.min(5, rarity + (Math.random() < 0.2 ? 1 : 0));
    }

    return [{
      action: 'drop_item',
      rarity,
      stageLevel,
      type: this._selectItemType()
    }];
  },

  _selectItemType() {
    const roll = Math.random();
    if (roll < 0.30) return 'weapon';
    if (roll < 0.55) return 'armor';
    if (roll < 0.70) return 'helmet';
    if (roll < 0.80) return 'boots';
    if (roll < 0.90) return 'accessory';
    return 'ring';
  },

  // 업그레이드 드롭
  _decideUpgradeDrop(rules, stageLevel) {
    const baseRate = 0.03;
    const rate = baseRate * rules.upgradeDropMult;
    if (Math.random() > rate) return [];

    const types = ['fast_attack', 'strong_attack', 'long_range', 'double_shot',
                   'pierce', 'homing', 'hp_restore', 'defense_up'];

    // 어려울 때 → 방어/회복 우선
    let type;
    if (this._difficultyGrade === 'extreme' || this._difficultyGrade === 'death') {
      const defTypes = ['hp_restore', 'defense_up', 'hp_restore'];
      type = Math.random() < 0.5
        ? defTypes[Math.floor(Math.random() * defTypes.length)]
        : types[Math.floor(Math.random() * types.length)];
    } else {
      type = types[Math.floor(Math.random() * types.length)];
    }

    return [{
      action: 'drop_upgrade',
      upgradeType: type,
      stageLevel
    }];
  },

  // 골드 드롭
  _decideGoldDrop(rules, stageLevel) {
    const baseGold = 5 + stageLevel * 2;
    let gold = baseGold * rules.goldMult;
    if (typeof FormulaPack1 !== 'undefined') {
      gold = FormulaPack1.getGoldReward(baseGold, stageLevel) * rules.goldMult;
    }
    return [{ action: 'drop_gold', amount: Math.round(gold) }];
  },

  // 회복 아이템
  _decideHealDrop(rules, stageLevel) {
    const player = this._analyzePlayer(this._gameState);
    // HP 낮을수록 회복 아이템 더 자주
    let healChance = 0.05 * rules.healDropMult;
    if (player.hpRatio < 0.3) healChance *= 3;
    else if (player.hpRatio < 0.5) healChance *= 2;

    if (Math.random() > healChance) return [];

    // 회복량도 난이도에 비례
    const healPct = player.hpRatio < 0.2 ? 0.40 : // 위급: 40%
                    player.hpRatio < 0.5 ? 0.25 : 0.15; // 보통: 15%

    return [{
      action: 'drop_heal',
      healPercent: healPct,
      stageLevel
    }];
  },

  // 장애물
  _decideObstacle(rules, stageLevel) {
    if (this._difficultyGrade === 'trivial') return []; // 너무 쉬우면 장애물 없음
    if (Math.random() > 0.02) return [];
    return [{ action: 'spawn_obstacle', stageLevel }];
  },

  // 이벤트
  _decideEvent(rules, stageLevel, elapsed) {
    // 특수 이벤트는 SurvivorBalance에서 관리
    if (typeof SurvivorBalance !== 'undefined') {
      const decision = SurvivorBalance.getSpawnDecision(
        elapsed, stageLevel,
        this._analyzeEnemies(this._gameState).count,
        this._analyzePlayer(this._gameState).dps,
        this._analyzePlayer(this._gameState).spd
      );
      if (decision.event) {
        return [{ action: 'trigger_event', event: decision.event }];
      }
    }
    return [];
  },

  // =============================================================
  // 📊 외부 API
  // =============================================================

  // 생성기의 현재 출력 가져오기
  getOutput(generatorId) {
    const gen = this._generators[generatorId];
    if (!gen) return [];
    const output = gen.currentOutput;
    gen.currentOutput = []; // 가져가면 비움
    return output;
  },

  // 모든 생성기의 출력 한번에
  getAllOutputs() {
    const all = {};
    Object.keys(this._generators).forEach(id => {
      const output = this.getOutput(id);
      if (output.length > 0) all[id] = output;
    });
    return all;
  },

  // 현재 난이도 정보
  getDifficultyInfo() {
    const grade = this.GRADES[this._difficultyGrade] || this.GRADES.normal;
    return {
      score: Math.round(this._difficultyScore * 100) / 100,
      grade: this._difficultyGrade,
      label: grade.label,
      color: grade.color,
      rules: this.PRODUCTION_RULES[this._difficultyGrade],
      generatorCount: Object.keys(this._generators).length,
      history: this._history.slice(-10)
    };
  },

  // 수동 난이도 오버라이드
  setDifficulty(score) {
    this._difficultyScore = Math.max(0.3, Math.min(2.5, score));
    this._updateGrade();
  },

  // 활성화/비활성화
  enable() { this._enabled = true; },
  disable() { if (this._alwaysActive) return; this._enabled = false; },

  // 디버그
  debugStatus() {
    const info = this.getDifficultyInfo();
    console.log(`\n=== 마스터 디렉터 AI ===`);
    console.log(`난이도: ${info.label} (${info.score})`);
    console.log(`등록된 생성기: ${info.generatorCount}개`);
    console.log('--- 생성기 목록 ---');
    Object.values(this._generators).forEach(g => {
      console.log(`  ${g.id}: ${this.GENERATOR_TYPES[g.type]?.name || g.type} (총 ${g.totalProduced}개 생산)`);
    });
    console.log('--- 현재 규칙 ---');
    const rules = info.rules;
    if (rules) {
      console.log(`  몹 스폰: ×${rules.mobSpawnMult}, 몹 강도: ×${rules.mobStrengthMult}`);
      console.log(`  엘리트: ${(rules.eliteChance*100)}%, 아이템: ×${rules.itemDropMult}`);
      console.log(`  회복: ×${rules.healDropMult}, 골드: ×${rules.goldMult}`);
    }
  },

  connectToEngine() {
    console.log('[MasterDirector] 마스터 디렉터 AI 준비 완료 ✅');
    console.log('[MasterDirector] 9종 생성기 감시 + 6단계 난이도 자동 조절');
  }
};

if (typeof window !== 'undefined') window.MasterDirector = MasterDirector;
if (typeof module !== 'undefined') module.exports = MasterDirector;
