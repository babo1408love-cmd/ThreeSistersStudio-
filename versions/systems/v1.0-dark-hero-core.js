/**
 * HeroCore — 주인공 중심 통합 허브 시스템
 *
 * 모든 생성기·시스템·가챠·인벤토리가 주인공에게 탑재됨.
 * 다른 시스템은 HeroCore를 통해 주인공의 모든 것에 접근.
 *
 * ┌─────────────────────────────────────────────────┐
 * │                   HeroCore                       │
 * │                                                  │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
 * │  │Generators│  │ Systems  │  │  Gacha   │       │
 * │  │ spirit   │  │ rage     │  │ summon   │       │
 * │  │ attack   │  │ engine   │  │ evolve   │       │
 * │  │ upgrade  │  │ rarity   │  │ roll     │       │
 * │  │ summon   │  │ stage    │  └──────────┘       │
 * │  │ map      │  │ timer    │                      │
 * │  │ enemy    │  │ scroll   │  ┌──────────┐       │
 * │  └──────────┘  │ approach │  │Inventory │       │
 * │                │ walk     │  │ equipped │       │
 * │                └──────────┘  │ heroes   │       │
 * │                              │ spirits  │       │
 * │  ┌────────────────────────┐  │ pet      │       │
 * │  │    Combat Entities     │  │ fragments│       │
 * │  │ player, allies, pet    │  └──────────┘       │
 * │  └────────────────────────┘                      │
 * │                                                  │
 * │  ┌──────────────────────────────────────────┐   │
 * │  │       EventBus (내부 통신)                │   │
 * │  │  levelUp · equipChange · summon · rage   │   │
 * │  │  stageStart · combatMount · systemMount  │   │
 * │  └──────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────┘
 *
 * 사용법:
 *   import HeroCore from '../systems/hero-core.js';
 *   const hero = HeroCore.getInstance();
 *   hero.mountCombat(canvas, { stageLevel, plan });
 *   hero.on('levelUp', result => { ... });
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import UnitFactory from '../data/unit-factory.js';
import StageDirector from './stage-director.js';

// ── 생성기 ──
import { generateSpirit, generateFairy, drawSpirit, drawFairy } from '../generators/spirit-generator.js';
import { renderAttack, getSkillByTier, getAvailableSkills } from '../generators/spirit-attack-generator.js';
import { generateMap, renderMap, generateSurvivorMap, renderSurvivorMap, generateAerialMap } from '../generators/map-generator.js';
import { ENEMIES, BOSSES, generateWave, generateDrop } from '../generators/enemy-drop-generator.js';
import { HeroManager, HERO_CLASSES } from '../generators/hero-upgrade.js';
import { SummonTree, FRAGMENT_PARTS } from '../generators/summon-evolution.js';

// ── 시스템 ──
import RageSystem from './rage-system.js';
import HeroEngine from './hero-engine.js';
import StageTimer from './stage-timer.js';
import AutoScroll from './auto-scroll.js';
import AutoWalk from './auto-walk.js';
import { RARITY, rollSummonRarity, getRarityInfo, getRarityStats, getRarityColor } from './rarity-manager.js';
import { PET_EVOLUTION, PET_EVOLUTION_POOL } from './pet-evolution-system.js';
import HeroAIRegistry from './hero-ai-registry.js';
import CombatAIBalance from './combat-ai-balance.js';
import EquipmentScalingAI from './equipment-scaling-ai.js';

// ── 공중전 설정 ──
import { AERIAL_SCROLL_CONFIG, AERIAL_WALK_CONFIG, AERIAL_BOSS_APPROACH_CONFIG } from '../combat/aerial-combat-system.js';

// ── 가챠 ──
import { autoMatchParts, countLegendFragments, determineSummonResult } from '../data/spirit-parts-config.js';

// ══════════════════════════════════════════════════════
//  싱글턴 인스턴스
// ══════════════════════════════════════════════════════
let _instance = null;

export default class HeroCore {
  /**
   * 싱글턴 접근 — 전역에서 `HeroCore.getInstance()` 로 접근
   */
  static getInstance() {
    if (!_instance) _instance = new HeroCore();
    return _instance;
  }

  /** 테스트용 리셋 */
  static resetInstance() {
    if (_instance) _instance.destroy();
    _instance = null;
  }

  constructor() {
    // ══════════════════════════════════════
    //  생성기 탑재 (Generators)
    // ══════════════════════════════════════
    this.generators = {
      // 정령 생성/그리기
      spirit: {
        generate: generateSpirit,
        generateFairy,
        draw: drawSpirit,
        drawFairy,
      },
      // 전투 이펙트
      attack: {
        render: renderAttack,
        getSkillByTier,
        getAvailableSkills,
      },
      // 맵 생성/렌더
      map: {
        generate: generateMap,
        render: renderMap,
        generateSurvivor: generateSurvivorMap,
        renderSurvivor: renderSurvivorMap,
      },
      // 적/보스/드롭
      enemy: {
        ENEMIES,
        BOSSES,
        generateWave,
        generateDrop,
      },
      // 영웅 레벨업/업그레이드
      upgrade: this._loadHeroManager(),
      // 소환나무 (파편 관리)
      summon: this._loadSummonTree(),
    };

    // ══════════════════════════════════════
    //  시스템 탑재 (Systems)
    // ══════════════════════════════════════
    this.systems = {
      // 등급 관리
      rarity: { RARITY, roll: rollSummonRarity, getInfo: getRarityInfo, getStats: getRarityStats, getColor: getRarityColor },
      // 스테이지 계획
      stage: StageDirector,
      // 펫 진화
      petEvolution: { ...PET_EVOLUTION, pool: PET_EVOLUTION_POOL },
      // ── 전투 전용 (mountCombat 시 생성) ──
      rage: null,
      heroEngine: null,
      timer: null,
      autoScroll: null,
      autoWalk: null,
    };

    // ══════════════════════════════════════
    //  가챠 (Gacha)
    // ══════════════════════════════════════
    this.gacha = {
      /** 정령 소환: 일반 조각 6개 → 정령 (커먼45%/레어30%/에픽25%) */
      summonSpirit: () => this._gachaSummonSpirit(),
      /** 펫 진화: 레전드 조각 6개 → 레전드 펫 */
      evolvePet: () => this._gachaEvolvePet(),
      /** 가챠 가능 여부 */
      canSummon: () => autoMatchParts(GameState.spiritItems || []).success,
      canEvolvePet: () => PET_EVOLUTION.canEvolve(GameState.spiritItems || []),
      /** 레전드 조각 수 */
      legendFragmentCount: () => countLegendFragments(GameState.spiritItems || []),
    };

    // ══════════════════════════════════════
    //  인벤토리 (Inventory — GameState 참조)
    // ══════════════════════════════════════
    this.inventory = {
      get equipped()   { return GameState.equipped; },
      get heroSlots()  { return GameState.heroSlots; },
      get petSlot()    { return GameState.petSlot; },
      get spirits()    { return GameState.spirits; },
      get items()      { return GameState.spiritItems || []; },
      get gold()       { return GameState.gold; },
      get heroLevel()  { return GameState.heroLevel; },
      get heroExp()    { return GameState.heroExp; },

      equipItem: (itemId) => GameState.equipItem(itemId),
      equipPet: (pet) => GameState.equipPet(pet),
      equipHero: (idx, hero) => GameState.equipHeroToSlot(idx, hero),
      addGold: (n) => GameState.addGold(n),
      addSpirit: (s) => GameState.summonSpirit(s),
    };

    // ══════════════════════════════════════
    //  전투 엔티티 (Combat Entities)
    //  mountCombat 시 생성됨
    // ══════════════════════════════════════
    this.combat = {
      active: false,
      player: null,
      allies: [],
      spirits: [],
      pet: null,
      map: null,
      plan: null,
    };

    // ══════════════════════════════════════
    //  AI 레지스트리 (모든 AI 자동 활성화)
    // ══════════════════════════════════════
    this.aiRegistry = null;  // mountCombat 시 생성

    // ══════════════════════════════════════
    //  내부 이벤트 버스
    // ══════════════════════════════════════
    this._listeners = {};

    // ══════════════════════════════════════
    //  웹엔진 글로벌 시스템 마운트
    // ══════════════════════════════════════
    this.engine = {
      get sceneEngine()   { return typeof SceneManager !== 'undefined' && SceneManager.TRANSITIONS ? SceneManager : null; },
      get saveSystem()    { return typeof SaveSystem !== 'undefined' ? SaveSystem : null; },
      get input()         { return typeof InputManager !== 'undefined' ? InputManager : null; },
      get camera()        { return typeof CameraController !== 'undefined' ? CameraController : null; },
      get responsive()    { return typeof Responsive !== 'undefined' ? Responsive : null; },
      get timerSystem()   { return typeof TimerSystem !== 'undefined' ? TimerSystem : null; },
      get dialogue()      { return typeof DialogueSystem !== 'undefined' ? DialogueSystem : null; },
      get tween()         { return typeof TweenEngine !== 'undefined' ? TweenEngine : null; },
    };

    // ══════════════════════════════════════
    //  가챠 시스템 (글로벌 GachaSystem 연결)
    // ══════════════════════════════════════
    this.gachaSystem = {
      /** GachaSystem.pull 래핑 — 소환의 나무에서 호출 */
      pull: (type, playerData) => {
        if (typeof GachaSystem === 'undefined') return null;
        return GachaSystem.pull(type, playerData || this._getPlayerData());
      },
      pullMulti: (type, playerData) => {
        if (typeof GachaSystem === 'undefined') return null;
        return GachaSystem.pullMulti(type, playerData || this._getPlayerData());
      },
      /** 피티 정보 */
      getPityInfo: (type) => {
        if (typeof PitySystem === 'undefined') return null;
        return PitySystem.getInfo(this._getPlayerId(), type || 'pet');
      },
      /** 확률 정보 */
      getRateInfo: (type) => {
        if (typeof GachaSystem === 'undefined') return null;
        return GachaSystem.getRateInfo(this._getPlayerId(), type || 'pet');
      },
      /** UI 데이터 */
      getUIData: () => {
        if (typeof GachaUI === 'undefined') return null;
        return GachaUI.getUIData(this._getPlayerId());
      },
      /** 재화 충분 여부 */
      canPull: (count) => {
        if (typeof GachaSystem === 'undefined') return false;
        return GachaSystem.canPull(GameState.diamond || 0, count || 1);
      },
    };

    // ══════════════════════════════════════
    //  확장 슬롯 (미래 콘텐츠용)
    // ══════════════════════════════════════
    this._extensions = {};

    // 글로벌 접근 등록
    if (typeof window !== 'undefined') {
      window.HeroCore = this;
    }
  }

  // ══════════════════════════════════════════════════════
  //  전투 마운트 / 언마운트
  // ══════════════════════════════════════════════════════

  /**
   * 전투 시작 시 모든 전투 시스템 마운트
   * @param {object} opts — { stageLevel, plan, mapWidth, mapHeight, map }
   * @returns {object} combat — { player, allies, spirits, pet, map, plan }
   */
  mountCombat(opts = {}) {
    const stageLevel = opts.stageLevel || GameState.currentStage || 1;
    const isAerial = opts.aerial || false;

    this.combat.stageLevel = stageLevel;

    // 스테이지 계획
    const plan = opts.plan || StageDirector.prepare(stageLevel);
    this.combat.plan = plan;

    // 맵 생성
    if (opts.map) {
      this.combat.map = opts.map;
    } else if (isAerial) {
      // 공중전: 절반 거리 맵
      this.combat.map = generateAerialMap({
        themeId: plan.map.themeId || 'cloud_realm',
        stageLevel: plan.map.stageLevel,
      });
    } else {
      this.combat.map = generateSurvivorMap({
        themeId: plan.map.themeId,
        stageLevel: plan.map.stageLevel,
        scrollSpeed: plan.map.scrollSpeed,
        scrollAccel: plan.map.scrollAccel,
      });
    }
    const map = this.combat.map;

    // 플레이어 엔티티
    this.combat.player = UnitFactory.createPlayerEntity(GameState, { mapW: map.mapW, mapH: map.mapH });

    // 슬롯 영웅 엔티티
    this.combat.allies = GameState.heroSlots
      .filter(h => h != null)
      .slice(0, 5)
      .map((h, i) => UnitFactory.createAlly(h, {
        combatRole: 'slotHero',
        index: i,
        playerPos: this.combat.player,
      }));

    // 정령 엔티티
    this.combat.spirits = GameState.spirits.map((s, i) =>
      UnitFactory.createSpirit({ ...s, combatMode: true, orbitIndex: i }));

    // 펫 엔티티
    this.combat.pet = null;
    if (GameState.petSlot) {
      const p = GameState.petSlot;
      this.combat.pet = UnitFactory.createPet({
        ...p,
        emoji: GameState.petAppearance?.emoji || p.emoji || '💚',
        combatMode: true,
        x: this.combat.player.x - 20,
        y: this.combat.player.y - 20,
      });
    }

    // ── 전투 시스템 마운트 ──
    // ── 항상 활성화 옵션 (모든 시스템에 전파) ──
    const alwaysActive = true;

    // 분노 시스템 (전투 시작 시 게이지 0으로 리셋)
    GameState.rageGauge = 0;
    this.systems.rage = new RageSystem({
      alwaysActive,
      initialGauge: 0,
      maxTriggers: RageSystem.resolveMaxTriggers(GameState),
      gainRate: (GameState.player.rageGainRate || 100) / 100,
    });

    // 영웅 엔진 (AI + 레벨업 + 스킬)
    this.systems.heroEngine = new HeroEngine(this.combat.player, {
      alwaysActive,
      mapWidth: map.mapW,
      mapHeight: map.mapH,
      stageLevel,
    });

    // 스테이지 타이머
    this.systems.timer = new StageTimer({ alwaysActive, duration: 180000 });

    // 자동 스크롤
    if (isAerial) {
      // 공중전: 절반 거리 설정
      this.systems.autoScroll = new AutoScroll({
        alwaysActive,
        speed: AERIAL_SCROLL_CONFIG.speed,
        direction: AERIAL_SCROLL_CONFIG.direction,
        startBoundary: 0,
        warningZone: AERIAL_SCROLL_CONFIG.warningZone,
        damagePerSec: AERIAL_SCROLL_CONFIG.damagePerSec,
        pushForce: AERIAL_SCROLL_CONFIG.pushForce,
        accel: AERIAL_SCROLL_CONFIG.accel,
      });
      this.systems.autoWalk = new AutoWalk({
        alwaysActive,
        mapWidth: map.mapW,
        stageLevel,
        autoWalkSpeed: AERIAL_WALK_CONFIG.autoWalkSpeed,
      });
    } else {
      this.systems.autoScroll = new AutoScroll({
        alwaysActive,
        speed: plan.map.scrollSpeed,
        direction: 'vertical',
        startBoundary: map.mapH,
        warningZone: 120,
        damagePerSec: 20 + stageLevel * 2,
        pushForce: 2.0,
        accel: plan.map.scrollAccel,
      });
      this.systems.autoWalk = new AutoWalk({
        alwaysActive,
        mapHeight: map.mapH,
        stageLevel,
      });
    }

    // ── AI 레지스트리 — 모든 AI 자동 등록/활성화 ──
    this.aiRegistry = new HeroAIRegistry(this.combat.player);

    // 장비/슬롯영웅 분리 스케일링 AI (적은 맨몸 스탯 기준)
    this._equipScalingAI = new EquipmentScalingAI(this.combat.player, GameState);
    this.aiRegistry.register('equipScaling', this._equipScalingAI, { updateOrder: 0 });

    // 실시간 공격력 밸런스 AI
    this.aiRegistry.register('combatBalance', new CombatAIBalance(this.combat.player), { updateOrder: 1 });

    // 글로벌 AI 시스템 래핑 등록 (window 객체 기반)
    if (typeof window !== 'undefined') {
      if (window.SpeedAI)       this.aiRegistry.register('speedAI',       this._wrapGlobalAI(window.SpeedAI, 'SpeedAI'),       { updateOrder: 2 });
      if (window.HeroAI)        this.aiRegistry.register('heroAI',        this._wrapGlobalAI(window.HeroAI, 'HeroAI'),         { updateOrder: 3 });
      if (window.HeroBattleAI)  this.aiRegistry.register('heroBattleAI',  this._wrapGlobalAI(window.HeroBattleAI, 'HeroBattleAI'), { updateOrder: 4 });
      if (window.HeroAIVisual)  this.aiRegistry.register('heroAIVisual',  this._wrapGlobalAI(window.HeroAIVisual, 'HeroAIVisual'), { updateOrder: 5 });
      if (window.FormationAI)   this.aiRegistry.register('formationAI',   this._wrapGlobalAI(window.FormationAI, 'FormationAI'),   { updateOrder: 6 });
      if (window.BalanceAI)     this.aiRegistry.register('balanceAI',     this._wrapGlobalAI(window.BalanceAI, 'BalanceAI'),    { updateOrder: 7 });
      if (window.SurvivorBalance) this.aiRegistry.register('survivorBalance', this._wrapGlobalAI(window.SurvivorBalance, 'SurvivorBalance'), { updateOrder: 8 });
      if (window.MasterDirector)  this.aiRegistry.register('masterDirector',  this._wrapGlobalAI(window.MasterDirector, 'MasterDirector'),   { updateOrder: 9 });
    }

    // 대기 중인 외부 AI 등록
    if (this._pendingAI) {
      for (const { name, ai, options } of this._pendingAI) {
        if (!this.aiRegistry.get(name)) {
          this.aiRegistry.register(name, ai, options);
        }
      }
    }

    // 모든 AI 강제 활성화
    this.aiRegistry.activateAll();

    this.combat.active = true;
    this.emit('combatMount', { stageLevel, plan });

    return this.combat;
  }

  /**
   * 전투 종료 시 전투 시스템 언마운트
   */
  unmountCombat() {
    if (this.systems.heroEngine) {
      this.systems.heroEngine.destroy();
      this.systems.heroEngine = null;
    }
    this.systems.rage = null;
    this.systems.timer = null;
    this.systems.autoScroll = null;
    this.systems.autoWalk = null;

    // AI 레지스트리 정리
    if (this.aiRegistry) {
      this.aiRegistry.destroyAll();
      this.aiRegistry = null;
    }
    this._equipScalingAI = null;

    this.combat.active = false;
    this.combat.player = null;
    this.combat.allies = [];
    this.combat.spirits = [];
    this.combat.pet = null;
    this.combat.map = null;
    this.combat.plan = null;

    this.emit('combatUnmount');
  }

  // ══════════════════════════════════════════════════════
  //  스테이지 계획
  // ══════════════════════════════════════════════════════

  /** 스테이지 생성 계획 수립 */
  prepareStagePlan(stageLevel) {
    return StageDirector.prepare(stageLevel || GameState.currentStage);
  }

  /** 서바이벌 계획 */
  prepareSurvivalPlan(biome, stageLevel) {
    return StageDirector.prepareSurvival(biome, stageLevel);
  }

  /** 웨이브 데이터 생성 */
  buildWave(plan, waveNum) {
    return StageDirector.buildWaveFromPlan(plan, waveNum);
  }

  // ══════════════════════════════════════════════════════
  //  전투 엔티티 생성 (UnitFactory 래핑)
  // ══════════════════════════════════════════════════════

  createEnemy(def, x, y) {
    const stageLevel = this.combat?.stageLevel || GameState.currentStage || 1;
    const enemy = UnitFactory.createEnemy(def, 1, { x, y, combatMode: true, stageLevel });
    if (this.systems.heroEngine) {
      this.systems.heroEngine.registerMob(enemy, x, y);
    }
    return enemy;
  }

  createBoss(def, scaling, opts) {
    return UnitFactory.createBoss(def, scaling, opts);
  }

  // ══════════════════════════════════════════════════════
  //  가챠 (내부 구현)
  // ══════════════════════════════════════════════════════

  _gachaSummonSpirit() {
    const items = GameState.spiritItems || [];
    const match = autoMatchParts(items);
    if (!match.success) return { success: false, message: match.message };

    // 조각 소모
    const result = determineSummonResult(match.selectedParts, []);

    // GameState에서 사용된 조각 제거
    const usedIds = new Set(match.usedIds);
    GameState.spiritItems = items.filter(item => !usedIds.has(item.id));

    // 비주얼 생성
    const spiritVisual = generateSpirit();
    const spirit = {
      ...result,
      ...spiritVisual,
      id: `spirit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };

    // GameState에 추가
    GameState.summonSpirit(spirit);
    this.emit('spiritSummon', { spirit });

    return { success: true, spirit };
  }

  _gachaEvolvePet() {
    const items = GameState.spiritItems || [];
    const result = PET_EVOLUTION.evolve(items);
    if (!result.success) return { success: false, message: '레전드 조각이 부족합니다' };

    // 조각 소모 반영
    GameState.spiritItems = result.remaining;

    // 펫 장착
    GameState.equipPet(result.pet);
    this.emit('petEvolve', { pet: result.pet });

    return { success: true, pet: result.pet };
  }

  // ══════════════════════════════════════════════════════
  //  레벨업 / 스탯
  // ══════════════════════════════════════════════════════

  /** 경험치 추가 (전투 중 호출) */
  addExp(amount) {
    if (this.systems.heroEngine) {
      this.systems.heroEngine.addExp(amount);
    } else {
      // 전투 밖에서도 EXP 추가 가능
      GameState.heroExp += amount;
    }
  }

  /** 현재 레벨 */
  getLevel() {
    return this.systems.heroEngine?.getLevel() || GameState.heroLevel || 1;
  }

  /** 전투력 계산 */
  getCombatPower() {
    const p = GameState.player;
    return Math.round(
      (p.attack * 2) +
      (p.defense * 1.5) +
      (p.maxHp * 0.3) +
      (p.speed * 3) +
      (p.critRate * 2) +
      (p.critDamage * 0.5)
    );
  }

  /**
   * 맨몸 전투력 (적 스케일링용)
   * 장비/슬롯영웅 보너스 제외, 순수 레벨 성장 스탯만
   */
  getNakedPower() {
    if (this._equipScalingAI) {
      return this._equipScalingAI.getNakedPower();
    }
    // 전투 밖: GameState.getBaseStats()로 직접 계산
    const base = GameState.getBaseStats();
    return Math.round((base.attack * base.speed * 0.8) + (base.maxHp * 0.3) + (base.defense * 0.5));
  }

  /** 주인공 풀힐 */
  fullHeal() {
    GameState.fullHeal();
    this.emit('fullHeal');
  }

  // ══════════════════════════════════════════════════════
  //  이벤트 시스템
  // ══════════════════════════════════════════════════════

  /**
   * 이벤트 등록
   * @param {string} event — 이벤트명
   * @param {function} callback
   * @returns {function} unsubscribe
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const list = this._listeners[event];
    if (!list) return;
    const idx = list.indexOf(callback);
    if (idx >= 0) list.splice(idx, 1);
  }

  emit(event, data) {
    const list = this._listeners[event];
    if (list) list.forEach(cb => { try { cb(data); } catch(e) { console.warn(`[HeroCore] event '${event}' error:`, e); } });
    // 글로벌 EventBus도 전파
    EventBus.emit(`hero:${event}`, data);
  }

  // ══════════════════════════════════════════════════════
  //  확장 시스템 (미래 콘텐츠 탑재)
  // ══════════════════════════════════════════════════════

  /**
   * 시스템 마운트 (미래 콘텐츠용)
   * @param {string} name — 시스템 이름
   * @param {object} system — 시스템 객체
   * @example hero.mount('crafting', new CraftingSystem());
   */
  mount(name, system) {
    this.systems[name] = system;
    this._extensions[name] = { type: 'system', mounted: Date.now() };
    this.emit('systemMount', { name, system });
  }

  /**
   * 생성기 마운트 (미래 콘텐츠용)
   * @param {string} name — 생성기 이름
   * @param {object} generator — 생성기 객체
   * @example hero.mountGenerator('weapon', weaponGenerator);
   */
  mountGenerator(name, generator) {
    this.generators[name] = generator;
    this._extensions[name] = { type: 'generator', mounted: Date.now() };
    this.emit('generatorMount', { name, generator });
  }

  /**
   * 마운트된 시스템/생성기 제거
   */
  unmount(name) {
    if (this.systems[name]) {
      if (typeof this.systems[name].destroy === 'function') this.systems[name].destroy();
      delete this.systems[name];
    }
    if (this.generators[name]) delete this.generators[name];
    delete this._extensions[name];
    this.emit('unmount', { name });
  }

  /**
   * 마운트된 모든 것 목록
   */
  listMounted() {
    return {
      generators: Object.keys(this.generators),
      systems: Object.keys(this.systems).filter(k => this.systems[k] != null),
      extensions: { ...this._extensions },
      combat: this.combat.active,
    };
  }

  // ══════════════════════════════════════════════════════
  //  주인공 상태 스냅샷
  // ══════════════════════════════════════════════════════

  /**
   * 주인공의 전체 상태 스냅샷 (디버그/UI용)
   */
  snapshot() {
    return {
      level: this.getLevel(),
      combatPower: this.getCombatPower(),
      stats: { ...GameState.player },
      equipped: { ...GameState.equipped },
      heroSlots: [...GameState.heroSlots],
      petSlot: GameState.petSlot ? { ...GameState.petSlot } : null,
      spirits: GameState.spirits.length,
      fragments: (GameState.spiritItems || []).length,
      legendFragments: countLegendFragments(GameState.spiritItems || []),
      gold: GameState.gold,
      canSummon: this.gacha.canSummon(),
      canEvolvePet: this.gacha.canEvolvePet(),
      rage: this.systems.rage ? {
        gauge: this.systems.rage.gauge,
        active: this.systems.rage.active,
        triggers: this.systems.rage.getTriggersRemaining(),
      } : null,
      mounted: this.listMounted(),
      engine: {
        sceneEngine: !!this.engine.sceneEngine,
        saveSystem: !!this.engine.saveSystem,
        input: !!this.engine.input,
        camera: !!this.engine.camera,
        responsive: !!this.engine.responsive,
        timerSystem: !!this.engine.timerSystem,
        dialogue: !!this.engine.dialogue,
        tween: !!this.engine.tween,
      },
      gachaPity: this.gachaSystem.getPityInfo('pet'),
    };
  }

  // ══════════════════════════════════════════════════════
  //  내부 헬퍼
  // ══════════════════════════════════════════════════════

  /** 가챠용 플레이어 데이터 */
  _getPlayerData() {
    return {
      id: this._getPlayerId(),
      diamond: GameState.diamond || 0,
      fragments: (GameState.spiritItems || []).length,
      ownedItems: (GameState.spirits || []).map(s => s.id)
        .concat((GameState.heroSlots || []).filter(Boolean).map(h => h.id)),
    };
  }

  _getPlayerId() {
    return GameState.playerName || 'player_1';
  }

  _loadHeroManager() {
    const mgr = new HeroManager();
    if (GameState.heroUpgrade) {
      try { mgr.fromJSON(GameState.heroUpgrade); } catch(e) { /* fresh start */ }
    }
    return mgr;
  }

  _loadSummonTree() {
    const tree = new SummonTree();
    if (GameState.summonTree) {
      try { tree.fromJSON(GameState.summonTree); } catch(e) { /* fresh start */ }
    }
    return tree;
  }

  // ══════════════════════════════════════════════════════
  //  AI 마운트 / 래핑
  // ══════════════════════════════════════════════════════

  /**
   * 외부 AI 모듈 등록 (미래 AI 자동 활성화)
   * 전투 중이면 즉시 등록, 아니면 다음 mountCombat 시 자동 등록
   * @param {string} name — AI 이름
   * @param {object} ai — AI 인스턴스 (init/update/destroy)
   * @param {object} [options] — { updateOrder }
   */
  mountAI(name, ai, options = {}) {
    if (this.aiRegistry) {
      this.aiRegistry.register(name, ai, options);
    }
    // 대기열에 저장 — 다음 mountCombat 시 자동 등록
    if (!this._pendingAI) this._pendingAI = [];
    this._pendingAI.push({ name, ai, options });
    this.emit('aiMount', { name });
    return this;
  }

  /**
   * 글로벌(window) AI 객체 → 레지스트리 호환 래퍼
   * window.SpeedAI 등 전역 AI는 init/update/destroy 메서드가 없을 수 있으므로 래핑
   * @param {object} globalAI — window.SpeedAI 등
   * @param {string} name — 디버그용 이름
   * @returns {object} — { init, update, destroy } 인터페이스
   */
  _wrapGlobalAI(globalAI, name) {
    return {
      _wrapped: globalAI,
      _name: name,
      init: (player) => {
        if (typeof globalAI.init === 'function') {
          globalAI.init(player);
        }
      },
      update: (dt, context) => {
        if (typeof globalAI.update === 'function') {
          globalAI.update(dt, context);
        } else if (typeof globalAI.tick === 'function') {
          globalAI.tick(dt, context);
        }
      },
      destroy: () => {
        if (typeof globalAI.destroy === 'function') {
          globalAI.destroy();
        } else if (typeof globalAI.reset === 'function') {
          globalAI.reset();
        }
      },
    };
  }

  /**
   * 전체 파괴 (테스트용)
   */
  destroy() {
    this.unmountCombat();
    this._listeners = {};
    this._extensions = {};
    if (typeof window !== 'undefined' && window.HeroCore === this) {
      delete window.HeroCore;
    }
    _instance = null;
  }
}
