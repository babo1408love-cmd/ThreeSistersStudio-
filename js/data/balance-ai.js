// ============================================================
// 🎮 몽글벨 (Monglebel) - UNIVERSAL BALANCE AI GENERATOR
// ============================================================
// 이 파일을 monglebel 프로젝트의 js/data/ 폴더에 넣으세요.
// 모든 생명체, 펫, 몬스터, 보스를 자동으로 밸런스 맞춰 생성합니다.
// ============================================================

const BalanceAI = {

  // ========== 핵심 상수 ==========
  BALANCE_TARGET: 0.95,        // 목표 밸런스지수 B
  BALANCE_SAFE_MIN: 0.9,       // 안전 범위 최소
  BALANCE_SAFE_MAX: 1.05,      // 안전 범위 최대
  ENEMY_GROWTH_BONUS: 0.04,    // 적은 항상 4% 더 강함
  LINEAR_CAP: 50,              // 선형→지수 전환 레벨
  EXP_DAMPEN: 0.7,             // 지수 성장 완화계수

  // ========== 원소 상성표 ==========
  ELEMENTS: {
    fire:    { emoji: '🔥', strong: ['grass','ice'],    weak: ['water','earth'],   candy: 'red',     buff: { atk: 0.15 } },
    water:   { emoji: '💧', strong: ['fire','earth'],   weak: ['grass','thunder'], candy: 'blue',    buff: { heal: 0.15 } },
    grass:   { emoji: '🌿', strong: ['water','earth'],  weak: ['fire','ice'],      candy: 'green',   buff: { regen: 0.05 } },
    thunder: { emoji: '⚡', strong: ['water','flying'], weak: ['earth','grass'],   candy: 'yellow',  buff: { speed: 0.20 } },
    ice:     { emoji: '❄️', strong: ['grass','flying'], weak: ['fire','earth'],    candy: 'skyblue', buff: { slow: 0.15 } },
    earth:   { emoji: '🪨', strong: ['thunder','fire'], weak: ['water','grass'],   candy: 'brown',   buff: { def: 0.20 } },
    light:   { emoji: '✨', strong: ['dark'],           weak: [],                  candy: 'gold',    buff: { crit: 0.10 } },
    dark:    { emoji: '🌑', strong: ['light'],          weak: [],                  candy: 'purple',  buff: { lifesteal: 0.10 } },
    wind:    { emoji: '🌪️', strong: ['grass','earth'],  weak: ['ice','thunder'],   candy: 'cyan',    buff: { speed: 0.15 } },
    nature:  { emoji: '🌱', strong: ['water','earth'],  weak: ['fire','ice'],      candy: 'green',   buff: { regen: 0.08 } }
  },

  // ========== 등급 정의 ==========
  RARITIES: {
    common:    { stars: 1, emoji: '⬜', hpBase: 100, atkBase: 15,  defBase: 8,   skills: 1, dropRate: 0.45, color: '#CCCCCC', maxLevel: 20 },
    uncommon:  { stars: 2, emoji: '🟢', hpBase: 180, atkBase: 28,  defBase: 15,  skills: 1, dropRate: 0.30, color: '#4CAF50', maxLevel: 40 },
    rare:      { stars: 3, emoji: '🟦', hpBase: 300, atkBase: 45,  defBase: 25,  skills: 2, dropRate: 0.15, color: '#2196F3', maxLevel: 60 },
    epic:      { stars: 4, emoji: '🟪', hpBase: 500, atkBase: 75,  defBase: 42,  skills: 2, dropRate: 0.07, color: '#9C27B0', maxLevel: 80 },
    legendary: { stars: 5, emoji: '🟨', hpBase: 850, atkBase: 120, defBase: 68,  skills: 3, dropRate: 0.025, color: '#FF9800', maxLevel: 100 },
    mythic:    { stars: 6, emoji: '🔴', hpBase: 1500, atkBase: 200, defBase: 110, skills: 3, dropRate: 0.005, color: '#F44336', maxLevel: 120 }
  },

  // ========== 클래스 정의 ==========
  CLASSES: {
    warrior:   { emoji: '🗡️', hp: 1.3, atk: 1.0, def: 1.2, spd: 0.8, trait: '근접, 높은 HP/방어' },
    mage:      { emoji: '🔮', hp: 0.7, atk: 1.5, def: 0.5, spd: 1.0, trait: '원거리, 높은 공격' },
    archer:    { emoji: '🏹', hp: 0.8, atk: 1.3, def: 0.7, spd: 1.3, trait: '원거리, 높은 속도' },
    cleric:    { emoji: '✝️', hp: 1.0, atk: 0.6, def: 1.0, spd: 0.8, trait: '회복 특화' },
    rogue:     { emoji: '🗡️', hp: 0.8, atk: 1.2, def: 0.6, spd: 1.5, trait: '치명타/회피 특화' },
    knight:    { emoji: '🛡️', hp: 1.5, atk: 0.7, def: 1.5, spd: 0.5, trait: '탱커, 최고 방어' },
    summoner:  { emoji: '📖', hp: 0.7, atk: 0.8, def: 0.4, spd: 1.0, trait: '정령 강화 특화' },
    alchemist: { emoji: '⚗️', hp: 0.9, atk: 1.1, def: 0.7, spd: 1.0, trait: '디버프/버프 특화' }
  },

  // ========== 성장 공식 (하이브리드) ==========
  calcGrowth(baseStat, level, cap) {
    const linearCap = cap || this.LINEAR_CAP;
    if (level <= linearCap) {
      return Math.round(baseStat * (1 + level * 0.1));
    } else {
      return Math.round(baseStat * Math.pow(1.08, level) * this.EXP_DAMPEN);
    }
  },

  // ========== 전투력 계산 ==========
  calcPower(hp, atk, def, speed) {
    return Math.round((atk * speed * 0.8) + (hp * 0.3) + (def * 0.5));
  },

  // ========== 🧚 정령 생성 ==========
  generateSpirit(options = {}) {
    const name = options.name || '이름없는 정령';
    const element = options.element || this._randomKey(this.ELEMENTS);
    const rarity = options.rarity || this._weightedRarity();
    const level = options.level || 1;

    const rarityData = this.RARITIES[rarity] || this.RARITIES.common;
    const elemData = this.ELEMENTS[element] || this.ELEMENTS.light;

    const hp = this.calcGrowth(rarityData.hpBase, level, rarityData.maxLevel);
    const atk = this.calcGrowth(rarityData.atkBase, level, rarityData.maxLevel);
    const def = this.calcGrowth(rarityData.defBase, level, rarityData.maxLevel);
    const speed = 3 + Math.floor(level / 10);
    const power = this.calcPower(hp, atk, def, speed);

    return {
      type: 'spirit',
      name,
      element,
      elementEmoji: elemData.emoji,
      rarity,
      rarityEmoji: rarityData.emoji,
      stars: rarityData.stars,
      level,
      maxLevel: rarityData.maxLevel,
      stats: { hp, atk, def, speed },
      power,
      skills: rarityData.skills,
      elementBuff: elemData.buff,
      candyColor: elemData.candy,
      color: rarityData.color
    };
  },

  // ========== 🦋 요정 생성 ==========
  generateFairy(options = {}) {
    const FAIRY_TYPES = {
      gold:     { emoji: '💛', baseBuff: 'goldBonus',    baseValue: 0.20, maxValue: 1.00, desc: '골드 획득 +20%' },
      item:     { emoji: '💜', baseBuff: 'itemGradeUp',  baseValue: 0.05, maxValue: 0.25, desc: '아이템 등급 업 +5%' },
      luck:     { emoji: '💚', baseBuff: 'diceMinUp',    baseValue: 1,    maxValue: 3,    desc: '주사위 최소값 +1' },
      speed:    { emoji: '💙', baseBuff: 'moveBonus',    baseValue: 1,    maxValue: 3,    desc: '이동 보너스 +1칸' },
      guard:    { emoji: '🤍', baseBuff: 'trapReduce',   baseValue: 0.30, maxValue: 1.00, desc: '함정 피해 -30%' },
      explore:  { emoji: '🧡', baseBuff: 'hiddenFind',   baseValue: 0.10, maxValue: 0.50, desc: '숨은 칸 발견 +10%' },
      heal:     { emoji: '💗', baseBuff: 'turnHeal',     baseValue: 0.02, maxValue: 0.08, desc: '턴마다 HP 2% 회복' },
      star:     { emoji: '⭐', baseBuff: 'expBonus',     baseValue: 0.15, maxValue: 0.75, desc: '경험치 +15%' }
    };

    const fairyType = options.type || this._randomKey(FAIRY_TYPES);
    const level = options.level || 1;
    const data = FAIRY_TYPES[fairyType];

    const currentValue = Math.min(
      data.baseValue * (1 + level * 0.1),
      data.maxValue
    );
    const upgradeCost = Math.round(100 * Math.pow(1.5, level));

    return {
      type: 'fairy',
      fairyType,
      emoji: data.emoji,
      level,
      maxLevel: 20,
      buff: data.baseBuff,
      currentValue: Math.round(currentValue * 1000) / 1000,
      maxValue: data.maxValue,
      desc: data.desc,
      upgradeCost
    };
  },

  // ========== ⚔️ 영웅 생성 ==========
  generateHero(options = {}) {
    const name = options.name || '영웅';
    const heroClass = options.class || this._randomKey(this.CLASSES);
    const rarity = options.rarity || 'rare';
    const level = options.level || 1;
    const element = options.element || this._randomKey(this.ELEMENTS);

    const rarityData = this.RARITIES[rarity];
    const classData = this.CLASSES[heroClass];
    const elemData = this.ELEMENTS[element];

    const hp = Math.round(this.calcGrowth(rarityData.hpBase * classData.hp, level, rarityData.maxLevel));
    const atk = Math.round(this.calcGrowth(rarityData.atkBase * classData.atk, level, rarityData.maxLevel));
    const def = Math.round(this.calcGrowth(rarityData.defBase * classData.def, level, rarityData.maxLevel));
    const speed = Math.round((3 + Math.floor(level / 10)) * classData.spd);
    const power = this.calcPower(hp, atk, def, speed);

    const expToNext = Math.round(100 * Math.pow(level, 1.5));

    return {
      type: 'hero',
      name,
      class: heroClass,
      classEmoji: classData.emoji,
      classTrait: classData.trait,
      element,
      elementEmoji: elemData.emoji,
      rarity,
      rarityEmoji: rarityData.emoji,
      stars: rarityData.stars,
      level,
      maxLevel: rarityData.maxLevel,
      stats: { hp, atk, def, speed },
      power,
      skills: rarityData.skills,
      elementBuff: elemData.buff,
      equipment: { head: null, body: null, weapon: null, shield: null, necklace: null, ring: null },
      expToNext,
      color: rarityData.color
    };
  },

  // ========== 👾 일반 몬스터 생성 ==========
  generateMonster(options = {}) {
    const MONSTER_TEMPLATES = {
      slime:      { emoji: '🟢', hp: 50,  atk: 8,  def: 3,  ability: '없음',                  stageMin: 1,  stageMax: 5 },
      goblin:     { emoji: '👺', hp: 100, atk: 15, def: 8,  ability: '골드 드랍 +50%',        stageMin: 3,  stageMax: 10 },
      skeleton:   { emoji: '💀', hp: 180, atk: 25, def: 20, ability: '방어 관통 10%',         stageMin: 5,  stageMax: 15 },
      spider:     { emoji: '🕷️', hp: 120, atk: 30, def: 5,  ability: '독: 3턴간 HP -5%',     stageMin: 8,  stageMax: 20 },
      orc:        { emoji: '👹', hp: 300, atk: 35, def: 25, ability: '분노: HP30%↓시 공격2배', stageMin: 10, stageMax: 25 },
      darkelf:    { emoji: '🧝', hp: 200, atk: 45, def: 15, ability: '마법 반사 20%',         stageMin: 15, stageMax: 30 },
      golem:      { emoji: '🪨', hp: 500, atk: 20, def: 50, ability: '물리 데미지 50% 감소',   stageMin: 20, stageMax: 35 },
      vampire:    { emoji: '🧛', hp: 250, atk: 40, def: 20, ability: '흡혈 30%',              stageMin: 25, stageMax: 40 },
      dragonkin:  { emoji: '🐉', hp: 400, atk: 55, def: 35, ability: '원소 브레스 (랜덤)',     stageMin: 30, stageMax: 50 },
      shadow:     { emoji: '👤', hp: 150, atk: 60, def: 5,  ability: '회피 40%',              stageMin: 35, stageMax: 50 }
    };

    const stage = options.stage || 1;
    const monsterType = options.type || this._pickMonsterForStage(MONSTER_TEMPLATES, stage);
    const template = MONSTER_TEMPLATES[monsterType];
    const element = options.element || this._randomKey(this.ELEMENTS);
    const playerPower = options.playerPower || 100;

    // 💡 핵심 공식: 적은 항상 플레이어보다 3~5% 강함
    const stageScale = 1 + stage * 0.12;
    const hp = Math.round(template.hp * stageScale);
    const atk = Math.round(template.atk * (1 + stage * 0.10));
    const def = Math.round(template.def * (1 + stage * 0.08));
    const speed = 2 + Math.floor(stage / 8);
    const power = this.calcPower(hp, atk, def, speed);

    // 자동 밸런스 보정: D = E/P 가 0.8~1.1 범위 유지
    const D = power / Math.max(playerPower, 1);
    let balanceMod = 1.0;
    if (D < 0.8) balanceMod = 0.85 / D;
    if (D > 1.3) balanceMod = 1.1 / D;

    return {
      type: 'monster',
      monsterType,
      emoji: template.emoji,
      element,
      elementEmoji: this.ELEMENTS[element].emoji,
      stage,
      stats: {
        hp: Math.round(hp * balanceMod),
        atk: Math.round(atk * balanceMod),
        def: Math.round(def * balanceMod),
        speed
      },
      power: Math.round(power * balanceMod),
      ability: template.ability,
      difficultyD: Math.round(D * balanceMod * 100) / 100,
      balanceStatus: this._getBalanceStatus(D * balanceMod),
      drops: this._generateDrops(stage)
    };
  },

  // ========== 🐲 보스 생성 (예외 규칙 적용!) ==========
  generateBoss(options = {}) {
    const BOSS_TEMPLATES = {
      slimeKing:   { stage: 5,  emoji: '👑🟢', name: '거대 슬라임 킹',  hpMult: 3,  pattern: '분열: HP50%시 2마리로 분리',     drop: '3성 정령 확정' },
      goblinKing:  { stage: 10, emoji: '👑👺', name: '고블린 왕',       hpMult: 5,  pattern: '소환: 매5턴 고블린 2마리 소환',   drop: '4성 장비 확정' },
      skeletonLord:{ stage: 15, emoji: '👑💀', name: '해골 기사장',     hpMult: 6,  pattern: '부활: 1회 HP30%로 부활',         drop: '4성 정령 확정' },
      poisonQueen: { stage: 20, emoji: '👑🕷️', name: '독의 여왕',       hpMult: 7,  pattern: '맹독: 전체 독 + 치유 봉인',      drop: '전설 소재' },
      orcGeneral:  { stage: 25, emoji: '👑👹', name: '오크 대장군',     hpMult: 8,  pattern: '광폭화: 5턴마다 공격×3',         drop: '5성 정령 확정' },
      darkSorcerer:{ stage: 30, emoji: '👑🧝', name: '어둠의 마법사',   hpMult: 10, pattern: '마법 폭풍: 전체 랜덤 원소 공격', drop: '전설 장비' },
      ancientGolem:{ stage: 40, emoji: '👑🪨', name: '고대 골렘',       hpMult: 12, pattern: '지진: 전체 스턴 + 보드 셔플',    drop: '신화 소재' },
      dragonLord:  { stage: 50, emoji: '👑🐉', name: '드래곤 로드',     hpMult: 15, pattern: '3속성 브레스 + 비행(2턴 무적)', drop: '6성 정령' }
    };

    const stage = options.stage || 5;
    const bossType = options.type || this._pickBossForStage(BOSS_TEMPLATES, stage);
    const template = BOSS_TEMPLATES[bossType];
    const playerPower = options.playerPower || 500;
    const element = options.element || this._randomKey(this.ELEMENTS);

    // ⚠️ 보스 예외 규칙: 일반 밸런스 공식 무시!
    // 보스는 플레이어의 130%~150% 전투력으로 고정
    const bossMultiplier = 1.3 + (stage / 100) * 0.2; // 1.3 ~ 1.5
    const targetPower = playerPower * bossMultiplier;

    const heroHp = playerPower * 2;
    const heroAtk = playerPower * 0.3;
    const heroDef = playerPower * 0.15;

    const hp = Math.round(heroHp * template.hpMult * (1 + stage * 0.15));
    const atk = Math.round(heroDef * 1.5);
    const def = Math.round(heroAtk * 0.3);
    const speed = 2;
    const power = this.calcPower(hp, atk, def, speed);

    // 3단계 페이즈 자동 생성
    const phases = [
      { phase: 1, hpRange: '100%~60%', atkMult: 1.0, pattern: '기본 패턴',              puzzleChange: '일반 보드' },
      { phase: 2, hpRange: '60%~30%',  atkMult: 1.5, pattern: '강화 + ' + template.pattern, puzzleChange: '방해 타일 등장' },
      { phase: 3, hpRange: '30%~0%',   atkMult: 2.0, pattern: '폭주 + 전체 공격',        puzzleChange: '보드 축소 + 시간제한' }
    ];

    return {
      type: 'boss',
      bossType,
      name: template.name,
      emoji: template.emoji,
      element,
      elementEmoji: this.ELEMENTS[element].emoji,
      stage: template.stage,
      stats: { hp, atk, def, speed },
      power,
      // ⚠️ 보스는 D값 제한 없음! (예외)
      difficultyD: Math.round((power / Math.max(playerPower, 1)) * 100) / 100,
      isException: true,
      exceptionReason: '보스는 일반 밸런스 공식(D 0.8~1.1) 적용 제외. 목표: 플레이어의 ' + Math.round(bossMultiplier * 100) + '%',
      pattern: template.pattern,
      phases,
      drop: template.drop,
      targetKillTurns: 30
    };
  },

  // ========== 🎲 주사위 시스템 ==========
  rollDice(options = {}) {
    const DICE_TYPES = {
      normal:  { emoji: '🎲', min: 1, max: 6, bonus: 0, desc: '일반 주사위' },
      bonus:   { emoji: '⭐', min: 1, max: 6, bonus: 1, desc: '보너스 주사위 (+1)' },
      golden:  { emoji: '🌟', min: 3, max: 6, bonus: 0, desc: '황금 주사위 (최소 3)' },
      diamond: { emoji: '💎', min: 4, max: 6, bonus: 0, desc: '다이아 주사위 (최소 4)' },
      flame:   { emoji: '🔥', min: 1, max: 6, bonus: 0, desc: '불꽃 주사위 (더블 이동)', doubleMove: true },
      ice:     { emoji: '❄️', min: 1, max: 3, bonus: 0, desc: '얼음 주사위 (이동 절반)' },
      lucky:   { emoji: '🍀', min: 1, max: 6, bonus: 0, desc: '행운 주사위 (더블)', forceDouble: true }
    };

    const diceType = options.type || 'normal';
    const dice = DICE_TYPES[diceType];

    let d1 = this._rand(dice.min, dice.max);
    let d2 = dice.forceDouble ? d1 : this._rand(dice.min, dice.max);
    let sum = d1 + d2 + dice.bonus;

    if (dice.doubleMove) sum *= 2;

    return {
      diceType,
      emoji: dice.emoji,
      dice1: d1,
      dice2: d2,
      bonus: dice.bonus,
      sum,
      desc: dice.desc,
      isDouble: d1 === d2
    };
  },

  // ========== 🗺️ 마블 타일 생성 ==========
  generateMarbleBoard(stage) {
    const tileCount = Math.min(30 + Math.floor(stage / 5) * 5, 60);
    const TILE_WEIGHTS = {
      gold:     { emoji: '💰', weight: 30, effect: '골드 획득' },
      item:     { emoji: '🎁', weight: 18, effect: '랜덤 아이템 획득' },
      bonus:    { emoji: '⭐', weight: 8,  effect: '주사위 한번 더' },
      trap:     { emoji: '💀', weight: 12, effect: '골드 감소/1턴 정지' },
      shop:     { emoji: '🏪', weight: 5,  effect: '아이템 구매 가능' },
      miniboss: { emoji: '👹', weight: 5,  effect: '퍼즐 미니게임' },
      treasure: { emoji: '🏆', weight: 8,  effect: '고급 아이템 확정' },
      spirit:   { emoji: '🧚', weight: 5,  effect: '정령 만남/합류' },
      warp:     { emoji: '🌀', weight: 4,  effect: '랜덤 위치 이동' },
      rest:     { emoji: '🏕️', weight: 5,  effect: 'HP 회복 + 버프' }
    };

    const tiles = [];
    for (let i = 0; i < tileCount; i++) {
      const tileType = this._weightedPick(TILE_WEIGHTS);
      const data = TILE_WEIGHTS[tileType];

      let reward = null;
      if (tileType === 'gold') {
        reward = Math.round(10 * Math.pow(1.2, stage));
      } else if (tileType === 'item') {
        reward = this._generateDrops(stage);
      } else if (tileType === 'treasure') {
        reward = this._generateDrops(stage, true); // 고급 확정
      }

      tiles.push({
        index: i,
        type: tileType,
        emoji: data.emoji,
        effect: data.effect,
        reward
      });
    }

    // 시작칸과 마지막칸 고정
    tiles[0] = { index: 0, type: 'start', emoji: '🏠', effect: '시작', reward: null };
    tiles[tileCount - 1] = { index: tileCount - 1, type: 'goal', emoji: '🏁', effect: '골!', reward: null };

    return { stage, tileCount, tiles };
  },

  // ========== 📊 스테이지 난이도 생성 ==========
  generateStageConfig(stage) {
    const targetMatches = Math.round(15 * (1 + stage * 0.15));
    const D = 0.75 + (stage / 50) * 0.68; // 0.75 → 1.43
    const moves = Math.round(targetMatches / D);

    let boardW, boardH, candyTypes, specialTiles, timeLimit;
    if (stage <= 5)       { boardW = 7; boardH = 7; candyTypes = 6; specialTiles = '없음'; timeLimit = 0; }
    else if (stage <= 10) { boardW = 8; boardH = 8; candyTypes = 7; specialTiles = '잠금 타일'; timeLimit = 0; }
    else if (stage <= 20) { boardW = 8; boardH = 10; candyTypes = 7; specialTiles = '잠금+얼음'; timeLimit = 16; }
    else if (stage <= 30) { boardW = 9; boardH = 10; candyTypes = 8; specialTiles = '잠금+얼음+독'; timeLimit = 14; }
    else                  { boardW = 10; boardH = 12; candyTypes = 8; specialTiles = '전부+보스타일'; timeLimit = 12; }

    return {
      stage,
      targetMatches,
      moves,
      difficultyD: Math.round(D * 100) / 100,
      board: { width: boardW, height: boardH },
      candyTypes,
      specialTiles,
      timeLimit,
      feeling: this._getDifficultyFeeling(D)
    };
  },

  // ========== 🏆 보상 계산 ==========
  calcReward(stage, maxCombo, grade) {
    const baseReward = stage * 50;
    const D = 0.75 + (stage / 50) * 0.68;
    const comboBonus = 1 + (maxCombo * 0.05);
    const gradeMultipliers = { S: 3.0, A: 2.0, B: 1.0, F: 0.2 };
    const gradeMult = gradeMultipliers[grade] || 1.0;

    const goldReward = Math.round(baseReward * Math.pow(D, 1.2) * comboBonus * gradeMult);
    const expReward = Math.round(goldReward * 0.8 * (grade === 'S' ? 2.0 : grade === 'A' ? 1.5 : 1.0));

    return {
      gold: goldReward,
      exp: expReward,
      grade,
      comboBonus: Math.round(comboBonus * 100) / 100,
      bonusItems: grade === 'S' ? this._generateDrops(stage, true) : null
    };
  },

  // ========== 🔄 자동 밸런스 모니터 ==========
  checkBalance(playerPower, enemyPower) {
    const B = playerPower / Math.max(enemyPower, 1);
    let action = '유지';
    let detail = '';

    if (B < 0.7) {
      action = '적 약화 + 보상 증가';
      detail = '플레이어가 너무 약합니다. 적 스탯 -15%, 보상 +30%';
    } else if (B >= 0.7 && B < 0.9) {
      action = '유지 (약간 긴장)';
      detail = '적절한 긴장감. 변경 불필요.';
    } else if (B >= 0.9 && B <= 1.05) {
      action = '유지 (이상적)';
      detail = '완벽한 밸런스!';
    } else if (B > 1.05 && B <= 1.3) {
      action = '적 강화';
      detail = '플레이어가 약간 강합니다. 적 스탯 +10%';
    } else {
      action = '적 대폭 강화 + 보상 감소';
      detail = '플레이어가 너무 강합니다. 적 스탯 +25%, 보상 -20%';
    }

    return {
      balanceIndex: Math.round(B * 100) / 100,
      status: this._getBalanceStatus(B),
      action,
      detail
    };
  },

  // ========== 내부 유틸리티 ==========
  _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

  _randomKey(obj) {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
  },

  _weightedRarity() {
    const r = Math.random();
    if (r < 0.45) return 'common';
    if (r < 0.75) return 'uncommon';
    if (r < 0.90) return 'rare';
    if (r < 0.97) return 'epic';
    if (r < 0.995) return 'legendary';
    return 'mythic';
  },

  _weightedPick(weights) {
    const total = Object.values(weights).reduce((sum, w) => sum + w.weight, 0);
    let r = Math.random() * total;
    for (const [key, data] of Object.entries(weights)) {
      r -= data.weight;
      if (r <= 0) return key;
    }
    return Object.keys(weights)[0];
  },

  _pickMonsterForStage(templates, stage) {
    const valid = Object.entries(templates).filter(([, t]) => stage >= t.stageMin && stage <= t.stageMax);
    if (valid.length === 0) return 'slime';
    return valid[Math.floor(Math.random() * valid.length)][0];
  },

  _pickBossForStage(templates, stage) {
    let best = null;
    let bestDiff = 999;
    for (const [key, t] of Object.entries(templates)) {
      const diff = Math.abs(t.stage - stage);
      if (diff < bestDiff) { bestDiff = diff; best = key; }
    }
    return best;
  },

  _generateDrops(stage, guaranteed) {
    const r = guaranteed ? Math.random() * 0.15 : Math.random();
    let grade;
    if (r < 0.03) grade = 'legendary';
    else if (r < 0.15) grade = 'epic';
    else if (r < 0.40) grade = 'rare';
    else grade = 'common';

    const baseValue = 10 * Math.pow(1.2, stage);
    const multipliers = { common: 1, rare: 3, epic: 8, legendary: 25 };

    return {
      grade,
      value: Math.round(baseValue * multipliers[grade]),
      emoji: this.RARITIES[grade]?.emoji || '⬜'
    };
  },

  _getBalanceStatus(D) {
    if (D < 0.7) return '🔴 너무 어려움';
    if (D < 0.9) return '🟡 약간 어려움';
    if (D <= 1.05) return '🟢 이상적';
    if (D <= 1.3) return '🟡 약간 쉬움';
    return '🔴 너무 쉬움';
  },

  _getDifficultyFeeling(D) {
    if (D < 0.80) return '매우 쉬움 (튜토리얼)';
    if (D < 0.90) return '쉬움';
    if (D < 1.00) return '보통';
    if (D < 1.10) return '어려움';
    if (D < 1.25) return '매우 어려움';
    if (D < 1.35) return '극한';
    return '전설';
  }
};

// Node.js export (Claude Code용)
if (typeof module !== 'undefined') module.exports = BalanceAI;
// Browser export (게임용)
if (typeof window !== 'undefined') window.BalanceAI = BalanceAI;
