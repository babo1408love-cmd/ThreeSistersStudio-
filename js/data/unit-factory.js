/**
 * unit-factory.js — 중앙 유닛 팩토리 모듈
 * 모든 유닛 생성의 단일 진입점.
 * 글로벌 BalanceAI + MonglelbelEngine을 ES6 모듈에서 접근하는 래퍼.
 *
 * 사용법:
 *   import UnitFactory from '../data/unit-factory.js';
 *   const spirit = UnitFactory.createSpirit({ element:'fire', rarity:'rare' });
 *   const hero   = UnitFactory.createHero({ class:'warrior', with3D:true, container:el });
 *   const enemy  = UnitFactory.createEnemy(ENEMIES.pink_slime, 1.2, { x:100, y:200 });
 */
import GameState from '../core/game-state.js';

const UnitFactory = {

  // ══════════════════════════════════════
  //  주인공 기준 크기 시스템
  // ══════════════════════════════════════
  //  모든 유닛 크기는 주인공 신체 사이즈(HERO_BASE_RADIUS) 기반 비율
  HERO_BASE_RADIUS: 16,
  UNIT_SCALE: {
    spirit:     0.625,   // 10/16 — 정령: 주인공의 62.5%
    ally:       0.75,    // 12/16 — 동료: 주인공의 75%
    enemy:      0.875,   // 14/16 — 일반몹: 주인공의 87.5%
    boss:       3.0,     //        — 보스: 주인공의 3배 (scale 추가 적용)
    pet:        0.5,     //  8/16 — 펫: 주인공의 50%
    projSize:   0.375,   //  6/16 — 투사체: 주인공의 37.5%
  },

  /** 주인공 radius 기준으로 유닛 radius 계산 */
  _unitRadius(type, extraScale) {
    const base = this.HERO_BASE_RADIUS * (this.UNIT_SCALE[type] || 1);
    return extraScale ? base * extraScale : base;
  },

  // ══════════════════════════════════════
  //  등급 매핑 (5등급 ↔ 6등급)
  // ══════════════════════════════════════
  //  spirit-generator 5등급(1~5): common/rare/magic/epic/legendary
  //  BalanceAI 6등급: common/uncommon/rare/epic/legendary/mythic
  RARITY_5_TO_6: {
    1: 'common',     // 일반 → common
    2: 'uncommon',   // 희귀 → uncommon
    3: 'rare',       // 마법 → rare
    4: 'epic',       // 전설 → epic
    5: 'legendary',  // 신화 → legendary
  },
  RARITY_6_TO_5: {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythic: 5,       // mythic은 5등급 시스템에서 최고 등급으로 매핑
  },
  RARITY_NAME_TO_6: {
    'common': 'common',
    'uncommon': 'uncommon',
    'rare': 'rare',
    'magic': 'rare',     // magic(마법) = BalanceAI의 rare
    'epic': 'epic',
    'legendary': 'legendary',
    'mythic': 'mythic',
  },

  // ══════════════════════════════════════
  //  글로벌 엔진 접근
  // ══════════════════════════════════════
  _getBalanceAI() {
    return (typeof window !== 'undefined' && window.BalanceAI) ? window.BalanceAI : null;
  },

  _get3DEngine() {
    return (typeof window !== 'undefined' && window.MonglelbelEngine) ? window.MonglelbelEngine : null;
  },

  _getProModelGen() {
    return (typeof window !== 'undefined' && window.ProModelGen) ? window.ProModelGen : null;
  },

  _getArtEngine() {
    return (typeof window !== 'undefined' && window.ArtEngine) ? window.ArtEngine : null;
  },

  _getArtEnvironment() {
    return (typeof window !== 'undefined' && window.ArtEnvironment) ? window.ArtEnvironment : null;
  },

  _getArtUI() {
    return (typeof window !== 'undefined' && window.ArtUI) ? window.ArtUI : null;
  },

  _getTextEngine() {
    return (typeof window !== 'undefined' && window.TextEngine) ? window.TextEngine : null;
  },

  _getTextRenderer() {
    return (typeof window !== 'undefined' && window.TextRenderer) ? window.TextRenderer : null;
  },

  _getTextI18n() {
    return (typeof window !== 'undefined' && window.TextI18n) ? window.TextI18n : null;
  },

  _mapRarityTo6(rarity) {
    if (typeof rarity === 'number') return this.RARITY_5_TO_6[rarity] || 'common';
    return this.RARITY_NAME_TO_6[rarity] || rarity || 'common';
  },

  _mapRarityTo5(rarity) {
    if (typeof rarity === 'number') return rarity;
    return this.RARITY_6_TO_5[rarity] || 1;
  },

  // ══════════════════════════════════════
  //  📸 3D → 2D 스프라이트 헬퍼
  // ══════════════════════════════════════
  _renderSprite(model3d, width, height, cameraPreset) {
    const engine = this._get3DEngine();
    if (!engine || !engine.renderToSprite) return null;
    return engine.renderToSprite(model3d, width, height, cameraPreset);
  },

  // 스프라이트 시트 생성 (8방향 등)
  _renderSpriteSheet(model3d, frameCount, width, height, cameraPreset) {
    const engine = this._get3DEngine();
    if (!engine || !engine.renderSpriteSheet) return null;
    return engine.renderSpriteSheet(model3d, frameCount, width, height, cameraPreset);
  },

  // 환경 오브젝트 → 2D 스프라이트 (나무/건물/소품 등)
  renderEnvironmentSprite(type, options = {}) {
    const art = this._getArtEngine();
    if (art && art.renderEnvironmentSprite) {
      return art.renderEnvironmentSprite(type, options);
    }
    return null;
  },

  // ArtUI를 외부 Canvas에서 사용 (combat canvas 등)
  drawUIElement(canvasCtx, method, ...args) {
    const ui = this._getArtUI();
    if (!ui || !ui[method]) return;
    ui.withContext(canvasCtx, (artUI) => {
      artUI[method](...args);
    });
  },

  // 다국어 텍스트 렌더링 (Canvas에 게임 텍스트 출력)
  drawText(ctx, text, x, y, options = {}) {
    const renderer = this._getTextRenderer();
    if (renderer) {
      renderer.drawText(ctx, text, x, y, options);
    } else {
      // fallback: 기본 Canvas 텍스트
      ctx.fillStyle = options.color || '#fff';
      ctx.font = (options.size || 16) + 'px sans-serif';
      ctx.fillText(text, x, y);
    }
  },

  // i18n 번역 키 → 현재 언어 텍스트
  t(key, params) {
    const i18n = this._getTextI18n();
    if (i18n) return i18n.t(key, params);
    return key; // fallback: 키 그대로 반환
  },

  // 3D 네임플레이트 생성 (캐릭터 머리 위 이름표)
  createNameplate(name, options = {}) {
    const renderer = this._getTextRenderer();
    if (renderer && renderer.create3DNameplate) {
      return renderer.create3DNameplate(name, options);
    }
    return null;
  },

  // ══════════════════════════════════════
  //  🏗️ ProModelGen 고퀄 모델 빌더 (씬 추가 없이 독립 생성)
  // ══════════════════════════════════════

  // 고퀄 영웅 3D 모델 — ProModelGen(인체+갑옷+머리카락)
  _buildHeroModel(options) {
    const pmg = this._getProModelGen();
    if (!pmg || typeof THREE === 'undefined') return null;

    const group = new THREE.Group();
    group.name = options.name || 'Hero_' + Date.now();

    // 1. 인체 (디테일 두개골, 얼굴, 손가락, 발)
    const body = pmg.createHumanBody({
      skinTone: options.skinTone || 'light',
      bulk: options.bulk || 1.0,
      height: options.height || 1.0,
      gender: options.gender || 'neutral',
      element: options.element,
      class: options.class,
      race: options.race,
    });
    group.add(body);

    // 2. 갑옷 (클래스별 중갑/경갑, 등급별 발광)
    const armor = pmg.createArmor(body, {
      element: options.element || 'fire',
      rarity: options.rarity || 'rare',
      class: options.class || 'warrior',
    });
    group.add(armor);

    // ArtEngine 고급 재질 적용 (갑옷 파츠에 PBR 메탈/젬)
    const art = this._getArtEngine();
    if (art) {
      const elemColors = {
        fire: 0xFF4422, water: 0x2266FF, grass: 0x22AA44,
        thunder: 0xFFDD00, ice: 0x88DDFF, earth: 0x886644,
        light: 0xFFDD44, dark: 0x6622CC,
      };
      const elemColor = elemColors[options.element] || 0xCCCCCC;
      armor.traverse(child => {
        if (child.isMesh && child.name && child.name.includes('trim')) {
          child.material = art.createMetal(elemColor, { roughness: 0.2 });
        }
        if (child.isMesh && child.name && child.name.includes('gem')) {
          child.material = art.createGem(elemColor);
        }
      });
    }

    // 3. 머리카락 (클래스별 스타일)
    const hairStyle = ['mage', 'summoner'].includes(options.class) ? 'long' :
                     ['warrior', 'knight'].includes(options.class) ? 'spiky' : 'short';
    const hair = pmg.createHair({
      style: hairStyle,
      element: options.element,
      hairColor: options.hairColor,
    });
    hair.position.y = 1.62 * (options.height || 1.0);
    group.add(hair);

    group.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    return {
      name: group.name,
      model: group,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      setRotation: (y) => { group.rotation.y = y; },
      setScale: (s) => group.scale.setScalar(s),
      remove: () => { if (group.parent) group.parent.remove(group); },
    };
  },

  // 고퀄 몬스터 3D 모델 — MonglelbelEngine 기본 몬스터 빌더
  _buildMonsterModel(options) {
    const engine = this._get3DEngine();
    if (!engine) return null;
    return engine.createMonster({
      name: options.name || options.id,
      monsterType: options.monsterType || 'slime',
      element: options.element || 'earth',
      stage: options.stage || 1,
    });
  },

  // ══════════════════════════════════════
  //  🧚 정령 생성
  // ══════════════════════════════════════
  createSpirit(options = {}) {
    const ai = this._getBalanceAI();
    const rarity6 = this._mapRarityTo6(options.rarity);
    const rarity5 = this._mapRarityTo5(options.rarity);

    // BalanceAI로 밸런스된 스탯 생성
    let balanceStats = null;
    if (ai) {
      balanceStats = ai.generateSpirit({
        name: options.name,
        element: options.attribute || options.element,
        rarity: rarity6,
        level: options.level || 1,
      });
    }

    // 기본 스탯 (BalanceAI 없을 때 fallback)
    const stats = balanceStats ? balanceStats.stats : {
      hp: Math.round(30 * (rarity5 * 0.8 + 0.2)),
      atk: Math.round(5 * (rarity5 * 0.8 + 0.2)),
      def: Math.round(3 * (rarity5 * 0.8 + 0.2)),
      speed: 3 + Math.floor((options.level || 1) / 10),
    };

    // 기본 정령 객체 — spirit-generator의 비주얼 속성은 그대로 유지
    const spirit = {
      id: options.id || 'spirit_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      name: options.name || (balanceStats ? balanceStats.name : '정령'),
      attribute: options.attribute || options.element || 'light',
      rarity: rarity5,
      level: options.level || 1,
      bodyShape: options.bodyShape,
      eyeStyle: options.eyeStyle,
      decoration: options.decoration,
      wingType: options.wingType,
      stats: {
        hp: stats.hp,
        attack: stats.atk || stats.attack || 5,
        defense: stats.def || stats.defense || 3,
        speed: stats.speed || 3,
        healPower: options.healPower || Math.max(2, Math.round((stats.hp || 30) * 0.05)),
      },
      emoji: options.emoji || '✨',
      power: balanceStats ? balanceStats.power : null,
    };

    // 전투 모드용 추가 필드
    if (options.combatMode) {
      Object.assign(spirit, {
        x: options.x || 0,
        y: options.y || 0,
        orbitAngle: options.orbitAngle || (options.orbitIndex || 0) * Math.PI * 0.5,
        radius: this._unitRadius('spirit'),
        atkTimer: Math.random() * 300,
        atkCooldown: Math.max(400, 1200 - rarity5 * 150),
        currentSkillFx: null,
      });
    }

    // 3D 모델 + 2D 스프라이트 (3D기반 2D 게임용)
    if (options.with3D) {
      const engine = this._get3DEngine();
      if (engine) {
        spirit.model3d = engine.createSpirit({
          name: spirit.name, element: spirit.attribute, rarity: rarity6,
        });
        if (spirit.model3d) {
          spirit.sprite = this._renderSprite(spirit.model3d, options.spriteWidth || 128, options.spriteHeight || 128, 'spirit');
          if (options.spriteSheet) {
            spirit.spriteSheet = this._renderSpriteSheet(spirit.model3d, options.spriteFrames || 8, options.spriteWidth || 128, options.spriteHeight || 128, 'spirit');
          }
        }
      }
    }

    return spirit;
  },

  // ══════════════════════════════════════
  //  ⚔️ 영웅 생성
  // ══════════════════════════════════════
  createHero(options = {}) {
    const ai = this._getBalanceAI();
    const rarity6 = this._mapRarityTo6(options.rarity || 'rare');

    let balanceStats = null;
    if (ai) {
      balanceStats = ai.generateHero({
        name: options.name,
        class: options.class || 'warrior',
        element: options.element || 'fire',
        rarity: rarity6,
        level: options.level || 1,
      });
    }

    const hero = balanceStats ? { ...balanceStats } : {
      type: 'hero',
      name: options.name || '영웅',
      class: options.class || 'warrior',
      element: options.element || 'fire',
      rarity: rarity6,
      level: options.level || 1,
      stats: { hp: 200, atk: 12, def: 7, speed: 3 },
      power: 100,
    };

    // 3D 모델 + 2D 스프라이트 (3D기반 2D 게임용)
    if (options.with3D) {
      // ProModelGen이 있으면 AAA급 고퀄 모델, 없으면 MonglelbelEngine 기본
      const pmg = this._getProModelGen();
      if (pmg && typeof THREE !== 'undefined') {
        hero.model3d = this._buildHeroModel({
          name: hero.name, class: hero.class, element: hero.element,
          rarity: rarity6, skinTone: options.skinTone, gender: options.gender,
          race: options.race, hairColor: options.hairColor,
          bulk: options.bulk, height: options.height,
        });
      } else {
        const engine = this._get3DEngine();
        if (engine) {
          hero.model3d = engine.createHero({
            name: hero.name, class: hero.class,
            element: hero.element, rarity: rarity6,
          });
        }
      }
      // 3D → 2D 스프라이트 렌더링
      if (hero.model3d) {
        hero.sprite = this._renderSprite(hero.model3d, options.spriteWidth || 256, options.spriteHeight || 256, 'hero');
        if (options.spriteSheet) {
          hero.spriteSheet = this._renderSpriteSheet(hero.model3d, options.spriteFrames || 8, options.spriteWidth || 256, options.spriteHeight || 256, 'hero');
        }
      }
    }

    return hero;
  },

  // ══════════════════════════════════════
  //  👾 일반 적 생성
  // ══════════════════════════════════════
  createEnemy(baseDef, scaling = 1, options = {}) {
    const s = scaling;
    // 스테이지당 HP +20% 복리 증가
    const stageLevel = options.stageLevel || 1;
    const stageHpMult = Math.pow(1.2, stageLevel - 1);
    // 뱀서류 스타일: 적 HP 소폭 증가 (다수의 약한 적)
    const hpBase = Math.round((baseDef.hp || 50) * s * 0.6 * stageHpMult);
    const enemy = {
      ...baseDef,
      hp: hpBase,
      maxHp: hpBase,
      atk: Math.round((baseDef.atk || 5) * s),
      def: Math.round((baseDef.def || 2) * s),
    };

    // 전투 모드용 추가 필드
    if (options.combatMode) {
      Object.assign(enemy, {
        x: options.x || 0,
        y: options.y || 0,
        // combat-engine은 attack/defense 필드명 사용
        attack: enemy.atk || baseDef.atk || 5,
        defense: enemy.def || baseDef.def || 2,
        speed: baseDef.spd || 1,
        gold: baseDef.gold || 5,
        radius: baseDef.isBoss
          ? this._unitRadius('boss', baseDef.scale || 1)
          : this._unitRadius('enemy'),
        emoji: baseDef.emoji || '🩷',
        color: baseDef.color || '#FF69B4',
        isBoss: baseDef.isBoss || false,
        scale: baseDef.scale || 1,
        rarity: baseDef.rarity || 'common',
        contactTimer: 0,
        bobPhase: Math.random() * Math.PI * 2,
        bounceY: 0,
        bounceSpeed: 2 + Math.random() * 2,
      });
    }

    // BalanceAI 검증 (선택적)
    if (options.validateBalance) {
      const ai = this._getBalanceAI();
      if (ai && options.playerPower) {
        const enemyPower = ai.calcPower(enemy.hp, enemy.atk, enemy.def, baseDef.spd || 1);
        const check = ai.checkBalance(options.playerPower, enemyPower);
        enemy._balanceCheck = check;
      }
    }

    // 3D 모델 + 2D 스프라이트 (3D기반 2D 게임용)
    if (options.with3D) {
      enemy.model3d = this._buildMonsterModel({
        name: baseDef.name || baseDef.id,
        monsterType: options.monsterType || 'slime',
        element: options.element || 'earth',
        stage: options.stage || 1,
      });
      if (enemy.model3d) {
        enemy.sprite = this._renderSprite(enemy.model3d, options.spriteWidth || 96, options.spriteHeight || 96, 'monster');
      }
    }

    return enemy;
  },

  // ══════════════════════════════════════
  //  🐲 보스 생성
  // ══════════════════════════════════════
  createBoss(baseDef, scaling = 1, options = {}) {
    const s = scaling;
    const boss = {
      ...baseDef,
      isBoss: true,
      hp: Math.round((baseDef.hp || 500) * s),
      maxHp: Math.round((baseDef.hp || 500) * s),
      atk: Math.round((baseDef.atk || 15) * s),
      def: Math.round((baseDef.def || 8) * s),
    };

    // BalanceAI 보스 예외 규칙 적용 (선택적)
    if (options.useBalanceAI) {
      const ai = this._getBalanceAI();
      if (ai && options.playerPower) {
        const bossData = ai.generateBoss({
          stage: options.stage || 1,
          playerPower: options.playerPower,
          element: options.element,
        });
        // BalanceAI가 생성한 스탯을 override
        boss.hp = bossData.stats.hp;
        boss.maxHp = bossData.stats.hp;
        boss.atk = bossData.stats.atk;
        boss.def = bossData.stats.def;
        boss.power = bossData.power;
        boss.phases = bossData.phases;
        boss._balanceException = bossData.exceptionReason;
      }
    }

    // 3D 모델 + 2D 스프라이트 (3D기반 2D 게임용)
    if (options.with3D) {
      boss.model3d = this._buildMonsterModel({
        name: baseDef.name || baseDef.id,
        monsterType: options.monsterType || 'slime',
        element: options.element || 'earth',
        stage: options.stage || 1,
      });
      if (boss.model3d) {
        boss.model3d.setScale(baseDef.scale || 3);
        boss.sprite = this._renderSprite(boss.model3d, options.spriteWidth || 192, options.spriteHeight || 192, 'boss');
      }
    }

    return boss;
  },

  // ══════════════════════════════════════
  //  🌊 전투용 적 웨이브 생성
  // ══════════════════════════════════════
  createWave(waveNum, stageLevel, playerPower, enemiesDict, bossesDict) {
    const diffMod = GameState.getDifficultyMod ? GameState.getDifficultyMod() : 1;
    const scaling = (1 + (stageLevel - 1) * 0.05 + (waveNum - 1) * 0.06) * diffMod;

    // BalanceAI 자동 밸런싱
    let balanceMod = 1.0;
    const ai = this._getBalanceAI();
    if (playerPower > 0 && ai) {
      const testPower = 50 * scaling;
      const check = ai.checkBalance(playerPower, testPower);
      if (check.balanceIndex < 0.8) balanceMod = 0.85;
      else if (check.balanceIndex > 1.3) balanceMod = 1.25;
      else if (check.balanceIndex > 1.05) balanceMod = 1.1;
    }

    const enemyKeys = Object.keys(enemiesDict);
    let pool, count;
    // 뱀서류 스타일: 다수의 적 (기본의 3배)
    if (waveNum === 1) { pool = ['pink_slime']; count = 9; }
    else if (waveNum === 2) { pool = ['pink_slime','blue_slime','green_slime']; count = 12; }
    else if (waveNum === 3) { pool = ['pink_slime','blue_slime','green_slime','purple_slime','gold_slime']; count = 18; }
    else { pool = enemyKeys; count = (5 + waveNum) * 3; }

    const s = scaling * balanceMod;
    const enemies = [];
    for (let i = 0; i < count; i++) {
      const key = pool[Math.floor(Math.random() * pool.length)];
      const def = enemiesDict[key];
      if (def) enemies.push(this.createEnemy(def, s, {}));
    }

    // Gold slime guaranteed in wave 3+
    if (waveNum >= 3 && enemiesDict.gold_slime && !enemies.find(e => e.id === 'gold_slime')) {
      enemies.push(this.createEnemy(enemiesDict.gold_slime, s, {}));
    }

    // 5웨이브마다 보스
    let boss = null;
    if (bossesDict && waveNum > 0 && waveNum % 5 === 0) {
      const bossKeys = Object.keys(bossesDict);
      const idx = ((Math.floor(waveNum / 5) - 1) % bossKeys.length + bossKeys.length) % bossKeys.length;
      const bossKey = bossKeys[idx];
      const b = bossesDict[bossKey];
      if (b) {
        boss = this.createBoss(b, scaling * 1.04, {});
      }
    }

    return { waveNum, enemies, boss, scaling };
  },

  // ══════════════════════════════════════
  //  🐾 펫 생성
  // ══════════════════════════════════════
  createPet(options = {}) {
    const rarity5 = this._mapRarityTo5(options.rarity || 'common');

    const pet = {
      id: options.id || 'pet_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      name: options.name || '작은 정령',
      emoji: options.emoji || '💚',
      attribute: options.attribute || 'nature',
      rarity: options.rarity || 'common',
      level: options.level || 1,
      stats: options.stats || {
        maxHp: 40 + rarity5 * 10,
        healPower: 5 + rarity5 * 2,
        defense: 3 + rarity5,
        speed: 4,
      },
      evolutionStage: options.evolutionStage || 1,
    };

    // 전투 모드용 추가 필드
    if (options.combatMode) {
      const healRarityMap = { 'common':1, 'rare':2, 'magic':3, 'epic':4, 'legendary':5 };
      const healMult = healRarityMap[options.rarity] || rarity5 || 1;
      Object.assign(pet, {
        x: options.x || 0,
        y: options.y || 0,
        healTimer: 0,
        healInterval: 5000,
        healAmount: healMult * 5,
      });
    }

    return pet;
  },

  // ══════════════════════════════════════
  //  🤝 동료 생성
  // ══════════════════════════════════════
  createAlly(allyDef, options = {}) {
    const ally = {
      x: options.x || 0,
      y: options.y || 0,
      hp: allyDef.hp || 100,
      maxHp: allyDef.hp || 100,
      attack: allyDef.attack || allyDef.atk || 10,
      defense: allyDef.defense || allyDef.def || 4,
      radius: this._unitRadius('ally'),
      atkTimer: 0,
      atkSpeed: 500,
      emoji: allyDef.emoji || '🧚',
      name: allyDef.name || '동료',
      attribute: allyDef.attribute || 'light',
    };

    // combatRole에 따른 V-Formation 위치 (최대 5영웅)
    if (options.combatRole === 'slotHero' && options.playerPos) {
      const V_POS = [
        { dx: -25, dy: -35 }, { dx: -25, dy: 35 },
        { dx: -45, dy: -18 }, { dx: -45, dy: 18 },
        { dx: -60, dy: 0 },
      ];
      const pos = V_POS[options.index] || V_POS[V_POS.length - 1];
      ally.x = options.playerPos.x + pos.dx;
      ally.y = options.playerPos.y + pos.dy;
    }

    return ally;
  },

  // ══════════════════════════════════════
  //  🎮 전투 플레이어 엔티티 생성
  // ══════════════════════════════════════
  createPlayerEntity(gameState, options = {}) {
    const ps = gameState.player;
    const mapH = options.mapH || 200;
    return {
      x: 120,
      y: mapH / 2,
      hp: ps.hp || ps.maxHp || 200,
      maxHp: ps.maxHp || 200,
      attack: ps.attack || 10,
      defense: ps.defense || 5,
      speed: ps.speed || 3,
      radius: this.HERO_BASE_RADIUS,
      atkSpeed: 300,
      atkTimer: 0,
      projSize: this._unitRadius('projSize'),
      projSpeed: 8,
      shotCount: 1,
      pierce: 0,
      homing: false,
      emoji: gameState.heroAppearance?.emoji || '🧚',
      bobPhase: 0,
    };
  },

  // ══════════════════════════════════════
  //  🏟️ 아레나 적/보스 생성 (battle-arena 전용)
  // ══════════════════════════════════════
  createArenaEnemy(slimeDef, scaling = 1) {
    return {
      ...slimeDef,
      currentHp: Math.round((slimeDef.hp || 30) * scaling),
      maxHp: Math.round((slimeDef.hp || 30) * scaling),
      atk: Math.round((slimeDef.atk || 5) * scaling),
      alive: true,
      x: 0,
      y: 0,
    };
  },

  createArenaBoss(bossDef, options = {}) {
    const boss = {
      ...bossDef,
      currentHp: bossDef.hp,
      maxHp: bossDef.hp,
      alive: true,
      x: options.x || 0,
      y: options.y || 0,
    };

    // BalanceAI 보스 규칙
    if (options.useBalanceAI) {
      const ai = this._getBalanceAI();
      if (ai && options.playerPower) {
        const bossData = ai.generateBoss({
          stage: options.stage || 1,
          playerPower: options.playerPower,
        });
        boss.currentHp = bossData.stats.hp;
        boss.maxHp = bossData.stats.hp;
        boss.atk = bossData.stats.atk;
        boss.def = bossData.stats.def;
      }
    }

    // 3D 모델 + 2D 스프라이트 (3D기반 2D 게임용)
    if (options.with3D) {
      boss.model3d = this._buildMonsterModel({
        name: bossDef.name,
        monsterType: options.monsterType || 'slime',
        element: bossDef.element || 'earth',
        stage: options.stage || 1,
      });
      if (boss.model3d) {
        boss.model3d.setScale(bossDef.size || 3);
        boss.sprite = this._renderSprite(boss.model3d, options.spriteWidth || 192, options.spriteHeight || 192, 'boss');
      }
    }

    return boss;
  },

  // ══════════════════════════════════════
  //  🏃 서바이벌 플레이어/적 생성
  // ══════════════════════════════════════
  createSurvivalPlayer(config, canvasW, canvasH) {
    return {
      x: 0,
      y: canvasH * (config.baseYRatio || 0.8),
      targetX: 0,
      velocityX: 0,
      hp: config.hp || 100,
      hpMax: config.hp || 100,
      lastFireTime: 0,
      emoji: '🧚',
    };
  },

  createSurvivalEnemy(config, isElite, canvasW) {
    const baseSize = config.size || this._unitRadius('enemy');
    const size = isElite ? baseSize * 1.5 : baseSize;
    const hpMult = isElite ? (config.eliteHpMultiplier || 3) : 1;
    return {
      x: (Math.random() - 0.5) * (canvasW * 0.8),
      y: -size,
      size,
      hp: (config.baseHp || 20) * hpMult,
      maxHp: (config.baseHp || 20) * hpMult,
      speed: isElite
        ? (config.eliteSpeed || 70)
        : (config.baseSpeed || 50) + Math.random() * (config.speedVariance || 20),
      isElite,
      emoji: isElite ? '👾' : '🩷',
    };
  },
};

export default UnitFactory;
