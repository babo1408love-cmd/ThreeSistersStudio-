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
    //  내부 이벤트 버스
    // ══════════════════════════════════════
    this._listeners = {};

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
    this.combat.player = UnitFactory.createPlayerEntity(GameState, { mapH: map.mapH });

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
    // 분노 시스템
    this.systems.rage = new RageSystem({
      initialGauge: GameState.rageGauge || 0,
      maxTriggers: RageSystem.resolveMaxTriggers(GameState),
      gainRate: (GameState.player.rageGainRate || 100) / 100,
    });

    // 영웅 엔진 (AI + 레벨업 + 스킬)
    this.systems.heroEngine = new HeroEngine(this.combat.player, {
      mapWidth: map.mapW,
      mapHeight: map.mapH,
      stageLevel,
    });

    // 스테이지 타이머
    this.systems.timer = new StageTimer({ duration: 180000 });

    // 자동 스크롤
    if (isAerial) {
      // 공중전: 절반 거리 설정
      this.systems.autoScroll = new AutoScroll({
        speed: AERIAL_SCROLL_CONFIG.speed,
        direction: AERIAL_SCROLL_CONFIG.direction,
        startBoundary: 0,
        warningZone: AERIAL_SCROLL_CONFIG.warningZone,
        damagePerSec: AERIAL_SCROLL_CONFIG.damagePerSec,
        pushForce: AERIAL_SCROLL_CONFIG.pushForce,
        accel: AERIAL_SCROLL_CONFIG.accel,
      });
      this.systems.autoWalk = new AutoWalk({
        mapWidth: map.mapW,
        stageLevel,
        autoWalkSpeed: AERIAL_WALK_CONFIG.autoWalkSpeed,
      });
    } else {
      this.systems.autoScroll = new AutoScroll({
        speed: plan.map.scrollSpeed,
        direction: 'horizontal',
        startBoundary: 0,
        warningZone: 120,
        damagePerSec: 20 + stageLevel * 2,
        pushForce: 2.0,
        accel: plan.map.scrollAccel,
      });
      this.systems.autoWalk = new AutoWalk({
        mapWidth: map.mapW,
        stageLevel,
      });
    }

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
    const enemy = UnitFactory.createEnemy(def, 1, { x, y, combatMode: true });
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
    };
  }

  // ══════════════════════════════════════════════════════
  //  내부 헬퍼
  // ══════════════════════════════════════════════════════

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
