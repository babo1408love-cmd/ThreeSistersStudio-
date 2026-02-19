/**
 * survival-scene.js — 서바이벌 모드 (탑다운 뷰)
 *
 * 핵심 특징:
 *   - 기존 전투시스템 기반 + 정화(Purify) 시스템
 *   - 적 처치 시 15~35% 확률로 정화 → 아군 편입
 *   - 무한 웨이브, 30초 간격
 *   - 로그라이크 업그레이드 드롭 10종
 *   - 탑다운(위에서 내려다보기) 시점
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { SURVIVAL_MOBS, AI_BEHAVIORS, getMonsterById } from '../data/monsters.js';
import { generateMap, renderMap, generateSurvivorMap, renderSurvivorMap } from '../generators/map-generator.js';
import StageTimer from '../systems/stage-timer.js';
import AutoScroll from '../systems/auto-scroll.js';
import BossApproachSystem from '../systems/boss-approach.js';
import AutoWalk from '../systems/auto-walk.js';
import RageSystem from '../systems/rage-system.js';
import { ENEMY_SPEED_CONFIG, calcEnemySpeed } from '../data/combat-config.js';
import UnitFactory from '../data/unit-factory.js';

// ── SpeedAI 좌표 변환 (1 AI unit = 40px) ──
const SPEED_AI_SCALE = 40;
function mapSurvivalMobType(enemy) {
  if (enemy.isBoss) return 'boss_demon';
  if (enemy.isElite) return 'mob_orc';
  return 'mob_goblin';
}

// ── 서바이벌 맵 10종 ──
const SURVIVAL_BIOMES = [
  { id:'forest',        name:'마법의 숲 서바이벌',     theme:'fairy_garden', emoji:'🌲' },
  { id:'crystal',       name:'수정 동굴 서바이벌',     theme:'crystal_cave', emoji:'💎' },
  { id:'autumn',        name:'가을 들판 서바이벌',     theme:'fairy_garden', emoji:'🍂' },
  { id:'frozen',        name:'얼어붙은 동토 서바이벌', theme:'frozen',       emoji:'❄️' },
  { id:'lava',          name:'용암 황무지 서바이벌',   theme:'volcano',      emoji:'🌋' },
  { id:'ruins',         name:'고대 유적 서바이벌',     theme:'desert',       emoji:'🏛️' },
  { id:'sky_island',    name:'하늘 섬 서바이벌',       theme:'sky',          emoji:'☁️' },
  { id:'deep_sea',      name:'심해 서바이벌',          theme:'ocean',        emoji:'🌊' },
  { id:'demon_outpost', name:'마왕성 외곽 서바이벌',   theme:'demon_castle', emoji:'🏰' },
  { id:'final_arena',   name:'최종 전장 서바이벌',     theme:'demon_castle', emoji:'👿' },
];

// ── 업그레이드 아이템 10종 ──
const SURVIVAL_UPGRADES = [
  { id:'fast_atk',     emoji:'🔴', name:'빠른공격',   desc:'공격속도+20%',    apply:(p)=>{p.atkSpeed*=0.8;} },
  { id:'strong_atk',   emoji:'🟠', name:'강한공격',   desc:'데미지+15%',      apply:(p)=>{p.attack=Math.round(p.attack*1.15);} },
  { id:'long_range',   emoji:'🟡', name:'먼공격',     desc:'사거리+30%',      apply:(p)=>{p.projSpeed*=1.3;} },
  { id:'multi_shot',   emoji:'🟢', name:'연속발사',   desc:'발사체+1',        apply:(p)=>{p.shotCount=Math.min((p.shotCount||1)+1,5);} },
  { id:'pierce',       emoji:'🔵', name:'관통',       desc:'2마리 관통',      apply:(p)=>{p.pierce=(p.pierce||0)+2;} },
  { id:'homing',       emoji:'🟣', name:'호밍',       desc:'적 추적',         apply:(p)=>{p.homing=true;} },
  { id:'hp_heal',      emoji:'⚪', name:'HP회복',     desc:'즉시 30% 회복',   apply:(p,eng)=>{eng.healPlayer(Math.round(p.maxHp*0.3));} },
  { id:'def_up',       emoji:'🟤', name:'방어강화',   desc:'DEF+5',           apply:(p)=>{p.defense+=5;} },
  { id:'purify_boost', emoji:'🩷', name:'정화부스트', desc:'정화확률+5%',     apply:(p,eng)=>{eng.purifyBonusChance+=5;} },
  { id:'gold_boost',   emoji:'💛', name:'골드부스트', desc:'골드획득+50%',    apply:(p,eng)=>{eng.goldMultiplier*=1.5;} },
];

// ── 정화 상태 ──
const PURIFY_STATE = {
  NONE: 0,
  STUNNED: 1,   // 빙빙 도는 중 (플레이어 접촉 대기)
  ALLIED: 2,    // 아군으로 편입됨
};

export { SURVIVAL_BIOMES, SURVIVAL_UPGRADES, PURIFY_STATE };

class SurvivalEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;

    this.biomeId = options.biomeId || 'forest';
    this.biome = SURVIVAL_BIOMES.find(b => b.id === this.biomeId) || SURVIVAL_BIOMES[0];
    this.onGameOver = options.onGameOver || (() => {});

    // Map — 3분 서바이벌 맵 (바닥+사물+배틀아레나 통합)
    this.map = generateSurvivorMap({
      themeId: this.biome.theme,
      stageLevel: 1,
      scrollSpeed: 0.5,
      scrollAccel: 0.00006,
    });
    this.camera = { x: 0, y: 0 };

    // HeroAI: 서바이벌 모드 입장 시 전체 계산
    if (typeof HeroAI !== 'undefined' && !HeroAI.party._calculated) {
      try { HeroAI.calculateAll(); } catch(e) { console.warn('[HeroAI] calculateAll 실패:', e); }
    }

    // Player (맵 시작점 근처, 수직 중앙)
    const ps = GameState.player;
    this.player = {
      x: 120, y: this.map.mapH / 2,
      hp: ps.maxHp || 250, maxHp: ps.maxHp || 250,
      attack: ps.attack || 12, defense: ps.defense || 7,
      speed: ps.speed || 3, radius: 16,
      atkSpeed: 300, atkTimer: 0,
      projSize: 6, projSpeed: 8,
      shotCount: 1, pierce: 0, homing: false,
      emoji: GameState.heroAppearance?.emoji || '🧚',
      bobPhase: 0,
      element: 'light',
    };
    // HeroAI 파티 데이터에서 원소 가져오기
    if (typeof HeroAI !== 'undefined' && HeroAI.party._calculated) {
      const pd = window._heroAIPartyData;
      if (pd && pd.heroes.length > 0) {
        this.player.element = pd.heroes[0].element || 'light';
      }
    }

    // 슬롯 영웅 (최대 5, UnitFactory 경유)
    this.slotHeroes = GameState.heroSlots.filter(h => h != null).slice(0, 5)
      .map((h, i) => UnitFactory.createAlly(h, { combatRole: 'slotHero', index: i, playerPos: this.player }));

    // 정령 (GameState에서 소환된 정령들)
    this.spirits = GameState.spirits.map((s, i) =>
      UnitFactory.createSpirit({ ...s, combatMode: true, orbitIndex: i }));

    // Entities
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.droppedItems = [];
    this.purifiedAllies = []; // 정화된 아군

    // Wave system
    this.running = false;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.waveInterval = 30000; // 30초
    this._elapsed = 0;
    this._lastTime = 0;
    this._animFrame = null;

    // Survival stats
    this.totalKills = 0;
    this.totalGold = 0;
    this.purifiedCount = 0;
    this.goldMultiplier = 1.0;
    this.purifyBonusChance = 0;

    // Purify base chance
    this.basePurifyChance = 25; // 25% base

    // Rage (등급별 발동 횟수 제한)
    this.rageSystem = new RageSystem({
      maxTriggers: RageSystem.resolveMaxTriggers(GameState),
    });

    // Input
    this._keys = {};
    this._touchDir = { x: 0, y: 0 };
    this._touchStart = null;
    this._mouseDown = false;

    // ⏰ 스테이지 타이머 (3분)
    this.stageTimer = new StageTimer({
      duration: 180000,
      onTimeUp: () => this._onTimerEnd(),
    });

    // 🌫️ 자동 전진 (포자 안개)
    this.autoScroll = new AutoScroll({
      speed: 0.5,
      direction: 'horizontal',
      startBoundary: 0,
      warningZone: 100,
      damagePerSec: 20,
      pushForce: 1.8,
      accel: 0.00006,
    });

    // 화면 흔들림 상태
    this._screenShake = null;

    // 보스 접근 시스템 (우측에서 보스가 다가옴)
    this.bossApproach = new BossApproachSystem(this, {
      mapWidth: this.map.mapW,
      mapHeight: this.map.mapH,
      stageLevel: 1,
      autoScroll: this.autoScroll,
    });

    // 🚶 자동 전진 (3분에 보스와 만나는 속도)
    this.autoWalk = new AutoWalk({
      mapWidth: this.map.mapW,
      stageLevel: 1,
    });

    this._bindInput();

    // ⚡ SpeedAI 초기화 (100유닛 동시 추격/차단/포위 AI)
    this._speedAIReady = false;
    this._speedAIIdCounter = 0;
    if (window.SpeedAI) {
      const S = SPEED_AI_SCALE;
      SpeedAI.init(
        Math.ceil(this.map.mapW / S),
        Math.ceil(this.map.mapH / S)
      );
      SpeedAI.registerHero({
        id: 'hero',
        class: 'warrior',
        x: this.player.x / S,
        y: this.player.y / S,
        spdStat: Math.round(this.player.speed * 3),
      });
      this._speedAIReady = true;
    }
  }

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this._spawnWave();
    this.stageTimer.start();
    this.autoScroll.start();
    this.autoWalk.start();
    // 5초 후 보스 접근 시작
    setTimeout(() => {
      if (this.running) this.bossApproach.start();
    }, this.bossApproach.startDelay);
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this._unbindInput();
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(now - this._lastTime, 50);
    this._lastTime = now;
    this._elapsed += dt;
    this._update(dt);
    this._draw();
    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  // ══════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════
  _update(dt) {
    // ⏰ 타이머
    this.stageTimer.update(dt);

    // Screen shake update
    if (this._screenShake) {
      this._screenShake.timer += dt;
      if (this._screenShake.timer >= this._screenShake.duration) {
        this._screenShake = null;
      }
    }

    // 보스 접근 시스템 업데이트
    this.bossApproach.update(dt);

    // ⚡ SpeedAI: 영웅 위치 동기화 + 전체 몹 AI 업데이트 + 위치 반영
    if (this._speedAIReady && !this.bossApproach.isBlocking()) {
      const S = SPEED_AI_SCALE;
      SpeedAI.setHeroTarget(this.player.x / S, this.player.y / S);
      SpeedAI._hero.x = this.player.x / S;
      SpeedAI._hero.y = this.player.y / S;
      SpeedAI.update(dt / 1000);
      // 몹 위치 역동기화 (SpeedAI → 게임 엔티티)
      for (const e of this.enemies) {
        if (!e._speedAIMob || !e._speedAIMob.isAlive) continue;
        if (e.purifyState !== PURIFY_STATE.NONE) continue; // 정화 중 이동 무시
        e.x = e._speedAIMob.x * S;
        e.y = e._speedAIMob.y * S;
      }
    }

    // 보스 접근이 보스전 페이즈 → 보스방 전투 위임
    if (this.bossApproach.isInBossPhase()) {
      this._updatePlayer(dt);
      this._updateAutoAttack(dt);
      this._updateEnemies(dt);
      this._updateProjectiles(dt);
      this._updatePurifiedAllies(dt);
      this._updateDroppedItems();
      this._updateParticles(dt);
      this._updateRage(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 보스 접근 블로킹 중 (MEETING/ARENA_FORMING)
    if (this.bossApproach.isBlocking()) {
      this._updateParticles(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 🌫️ 자동 전진
    const scrollResult = this.autoScroll.update(dt, this.player);
    if (scrollResult.damage > 0) {
      this._damagePlayer(scrollResult.damage);
    }
    if (scrollResult.pushX) {
      this.player.x += scrollResult.pushX;
    }

    this._updateWaveTimer(dt);
    this._updatePlayer(dt);
    this._updateSlotHeroes(dt);
    this._updateSpirits(dt);
    this._updateAutoAttack(dt);
    this._updateEnemies(dt);
    this._updateProjectiles(dt);
    this._updatePurifiedAllies(dt);
    this._updateDroppedItems();
    this._updateParticles(dt);
    this._updateRage(dt);
    this._updateCamera();
  }

  // ── Wave Timer ──
  _updateWaveTimer(dt) {
    this.waveTimer += dt;
    if (this.waveTimer >= this.waveInterval) {
      this.waveTimer = 0;
      this._spawnWave();
    }
  }

  _spawnWave() {
    this.currentWave++;
    const waveScale = 1 + (this.currentWave - 1) * 0.15;
    const count = Math.min(15, 3 + this.currentWave);

    // 일반 몹
    for (let i = 0; i < count; i++) {
      const def = SURVIVAL_MOBS[Math.floor(Math.random() * SURVIVAL_MOBS.length)];
      this._spawnEnemy(def, waveScale, false);
    }

    // 5웨이브마다 엘리트
    if (this.currentWave % 5 === 0) {
      const eliteDef = SURVIVAL_MOBS.filter(m => m.rarity === 'rare' || m.rarity === 'epic');
      const def = eliteDef[Math.floor(Math.random() * eliteDef.length)] || SURVIVAL_MOBS[0];
      this._spawnEnemy(def, waveScale * 2.5, true);
    }

    // 10웨이브마다 보스
    if (this.currentWave % 10 === 0) {
      const bossDef = { id:'s_boss', name:'웨이브 보스', emoji:'👹', element:'dark',
        stats:{hp:300,atk:30,def:15,spd:8}, rarity:'epic', ai:'chase_slow', purifyChance:0.35 };
      this._spawnEnemy(bossDef, waveScale * 3, true);
    }

    EventBus.emit('survival:wave', { wave: this.currentWave });
  }

  _spawnEnemy(def, scale, isElite) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 300 + Math.random() * 200;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const enemy = {
      x, y,
      hp: Math.round(def.stats.hp * scale),
      maxHp: Math.round(def.stats.hp * scale),
      attack: Math.round(def.stats.atk * scale),
      defense: def.stats.def || 0,
      speed: (def.stats.spd || 10) / 10,
      radius: isElite ? 18 : 12,
      emoji: def.emoji,
      color: isElite ? '#9D00FF' : '#FF8800',
      isElite,
      isBoss: def.id === 's_boss',
      purifyChance: def.purifyChance || 0.20,
      ai: def.ai || 'chase_slow',
      purifyState: PURIFY_STATE.NONE,
      purifyTimer: 0,
      allyDuration: isElite ? Infinity : 60000,
      bobPhase: Math.random() * Math.PI * 2,
      contactTimer: 0,
      stunSpinPhase: 0,
      _speedAIId: null,
      _speedAIMob: null,
    };

    // ⚡ SpeedAI 등록
    if (this._speedAIReady) {
      const S = SPEED_AI_SCALE;
      enemy._speedAIId = `sv_${++this._speedAIIdCounter}`;
      enemy._speedAIMob = SpeedAI.registerMob({
        id: enemy._speedAIId,
        mobType: mapSurvivalMobType(enemy),
        x: x / S,
        y: y / S,
        level: this.currentWave,
        aggroRange: 200,
        attackRange: 1,
        patrolRadius: 5,
      });
      if (enemy._speedAIMob) {
        SpeedAI.setMobAI(enemy._speedAIId, 'chase');
      }
    }

    this.enemies.push(enemy);
  }

  // ── Player (좌우 이동만) ──
  _updatePlayer(dt) {
    // 🚶 자동 전진 (보스전 진입 시 정지)
    if (this.bossApproach.isBlocking() || this.bossApproach.isInBossPhase()) {
      this.autoWalk.pause();
    } else {
      this.autoWalk.resume();
    }
    this.autoWalk.update(dt, this.player);

    let mx = (this._keys['d'] || this._keys['arrowright'] ? 1 : 0) - (this._keys['a'] || this._keys['arrowleft'] ? 1 : 0) + this._touchDir.x;
    if (mx > 1) mx = 1;
    if (mx < -1) mx = -1;

    const spd = this.player.speed * (dt / 16);
    this.player.x += mx * spd;
    const minX = Math.max(16, this.autoScroll.getBoundary() + 10);
    // 보스 접근 시 우측 경계도 클램핑
    const maxX = this.bossApproach.getPhase() !== 'dormant'
      ? Math.min(this.map.mapW - 16, this.bossApproach.getBoundary() - 20)
      : this.map.mapW - 16;
    this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    this.player.bobPhase += dt * 0.004;

    // 정화된 적 접촉 체크 (빙빙 도는 애 건드리면 아군 편입)
    for (const e of this.enemies) {
      if (e.purifyState !== PURIFY_STATE.STUNNED) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * dx + dy * dy < 40 * 40) {
        this._recruitAlly(e);
      }
    }
  }

  // ── Auto Attack ──
  _updateAutoAttack(dt) {
    this.player.atkTimer -= dt;
    if (this.player.atkTimer > 0) return;
    this.player.atkTimer = this.player.atkSpeed;

    // 가장 가까운 적 (정화 상태 아닌 것만)
    const activeEnemies = this.enemies.filter(e => e.purifyState === PURIFY_STATE.NONE);
    if (activeEnemies.length === 0) return;

    let nearest = null, minDist = Infinity;
    for (const e of activeEnemies) {
      const d = this._dist(this.player, e);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    if (!nearest || minDist > 300) return;

    const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
    const dmgMult = this.rageSystem.getDamageMultiplier();

    for (let i = 0; i < this.player.shotCount; i++) {
      const spread = (i - (this.player.shotCount - 1) / 2) * 0.15;
      this.projectiles.push({
        x: this.player.x, y: this.player.y,
        vx: Math.cos(angle + spread) * this.player.projSpeed,
        vy: Math.sin(angle + spread) * this.player.projSpeed,
        damage: this.player.attack * dmgMult,
        source: 'player', radius: this.player.projSize,
        emoji: '✨', pierce: this.player.pierce,
        homing: this.player.homing, target: nearest,
        element: this.player.element || 'light',
      });
    }
  }

  // ── Slot Heroes (V-Formation: 최대 5) ──
  _updateSlotHeroes(dt) {
    const V_POS = [
      { dx: -25, dy: -35 },  // 0: 좌상
      { dx: -25, dy:  35 },  // 1: 좌하
      { dx: -45, dy: -18 },  // 2: 후좌상
      { dx: -45, dy:  18 },  // 3: 후좌하
      { dx: -60, dy:   0 },  // 4: 최후방 중앙
    ];
    this.slotHeroes.forEach((h, i) => {
      const pos = V_POS[i] || V_POS[V_POS.length - 1];
      const targetX = this.player.x + pos.dx;
      const targetY = this.player.y + pos.dy;
      h.x += (targetX - h.x) * 0.08;
      h.y += (targetY - h.y) * 0.08;
      h.atkTimer -= dt;
      if (h.atkTimer <= 0 && this.enemies.length > 0) {
        let nearest = null, nd = Infinity;
        for (const e of this.enemies) {
          if (e.purifyState !== undefined && e.purifyState !== 0) continue;
          const d = Math.sqrt((h.x - e.x) ** 2 + (h.y - e.y) ** 2);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest && nd < 500) {
          const angle = Math.atan2(nearest.y - h.y, nearest.x - h.x);
          this.projectiles.push({
            x: h.x, y: h.y,
            vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
            damage: h.attack, source: 'ally', radius: 4,
            emoji: '⚡', pierce: 0, homing: false, target: null,
            element: h.attribute || h.element || null,
          });
          h.atkTimer = h.atkSpeed;
        }
      }
    });
  }

  // ── Spirits ──
  _updateSpirits(dt) {
    const SPIRIT_PROJ = { fire:'🔥', water:'💧', lightning:'⚡', dark:'🌑', light:'✨', nature:'🌿', ice:'❄️', wind:'💨' };
    const ATTR_TO_ELEM = { fire:'fire', water:'water', lightning:'thunder', dark:'dark', light:'light', nature:'grass', ice:'ice', wind:'thunder' };
    this.spirits.forEach(s => {
      s.orbitAngle += dt * 0.0015;
      const orbitR = 40 + (this.spirits.length > 6 ? 15 : 0);
      s.x = this.player.x + Math.cos(s.orbitAngle) * orbitR;
      s.y = this.player.y + Math.sin(s.orbitAngle) * orbitR;
      s.atkTimer -= dt;
      if (s.atkTimer <= 0 && this.enemies.length > 0) {
        let nearest = null, nd = Infinity;
        for (const e of this.enemies) {
          if (e.purifyState !== undefined && e.purifyState !== 0) continue;
          const d = Math.sqrt((s.x - e.x) ** 2 + (s.y - e.y) ** 2);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest && nd < 600) {
          const dmg = 5 + (s.rarity || 1) * 3 + (s.level || 1);
          const angle = Math.atan2(nearest.y - s.y, nearest.x - s.x);
          this.projectiles.push({
            x: s.x, y: s.y,
            vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
            damage: dmg, source: 'ally', radius: 3,
            emoji: SPIRIT_PROJ[s.attribute] || '✨',
            pierce: 0, homing: false, target: null,
            element: ATTR_TO_ELEM[s.attribute] || s.attribute || null,
          });
          s.atkTimer = s.atkSpeed || 800;
        }
      }
    });
  }

  // ── Enemies ──
  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.purifyState === PURIFY_STATE.STUNNED) {
        // 빙빙 도는 연출
        e.stunSpinPhase += dt * 0.008;
        e.purifyTimer += dt;
        if (e.purifyTimer > 15000) {
          // 15초간 접촉 안 하면 도망
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // AI: 플레이어 추격 — SpeedAI가 활성이면 이동은 SpeedAI에 위임
      e.bobPhase += dt * 0.003;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!e._speedAIMob) {
        // SpeedAI 미등록 적: 기존 이동 로직
        const warpCfg = ENEMY_SPEED_CONFIG;
        if (dist > warpCfg.warpDistance) {
          const angle = Math.atan2(dy, dx) + Math.PI;
          const warpDist = warpCfg.warpMinDist + Math.random() * (warpCfg.warpMaxDist - warpCfg.warpMinDist);
          e.x = this.player.x + Math.cos(angle) * warpDist;
          e.y = this.player.y + Math.sin(angle) * warpDist;
        } else if (dist > 1) {
          const spd = calcEnemySpeed(dist, this.player.speed, e.isBoss) * (dt / 16);
          e.x += (dx / dist) * spd;
          e.y += (dy / dist) * spd;
        }
      }

      // 접촉 데미지
      e.contactTimer -= dt;
      if (dist < e.radius + this.player.radius && e.contactTimer <= 0) {
        this._damagePlayer(e.attack);
        e.contactTimer = 1000;
      }
    }
  }

  // ── Projectiles ──
  _updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(p => {
      // Homing
      if (p.homing && p.target && p.target.hp > 0 && p.target.purifyState === PURIFY_STATE.NONE) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const angle = Math.atan2(dy, dx);
          const curAngle = Math.atan2(p.vy, p.vx);
          const newAngle = curAngle + (angle - curAngle) * 0.08;
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(newAngle) * spd;
          p.vy = Math.sin(newAngle) * spd;
        }
      }

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      if (p.source === 'player' || p.source === 'ally') {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.purifyState !== PURIFY_STATE.NONE) continue;
          if (this._circleHit(p, e)) {
            // HeroAI 원소 상성 적용
            let elementMult = 1.0;
            if (typeof HeroAI !== 'undefined' && p.element && e.element) {
              const chart = HeroAI.ELEMENT_CHART[p.element];
              if (chart) {
                if (chart.strong.includes(e.element)) elementMult = 1.5;
                else if (chart.weak.includes(e.element)) elementMult = 0.7;
              }
            }
            const dmg = Math.max(1, (p.damage - e.defense * 0.3) * elementMult);
            e.hp -= dmg;
            this._spawnHitParticles(e.x, e.y, e.color);
            const dmgColor = elementMult > 1 ? '#44ff88' : elementMult < 1 ? '#ff6666' : '#fbbf24';
            this.particles.push({
              x: e.x, y: e.y - e.radius - 5,
              text: `-${Math.round(dmg)}`, color: dmgColor, type: 'text',
              life: 800, vy: -1, vx: (Math.random() - 0.5) * 0.5,
            });
            if (e.hp <= 0) {
              this._onEnemyDeath(e, i);
            }
            if (p.pierce > 0) { p.pierce--; continue; }
            return false;
          }
        }
      }

      // Out of range
      return p.x > this.camera.x - 200 && p.x < this.camera.x + this.W + 200 &&
             p.y > this.camera.y - 200 && p.y < this.camera.y + this.H + 200;
    });
  }

  // ── Enemy Death → Purify Check ──
  _onEnemyDeath(enemy, index) {
    // ⚡ SpeedAI에서 제거
    if (this._speedAIReady && enemy._speedAIId) {
      SpeedAI.removeMob(enemy._speedAIId);
      enemy._speedAIMob = null;
    }
    this.totalKills++;
    const gold = Math.round((5 + Math.random() * 10) * this.goldMultiplier);
    this.totalGold += gold;
    GameState.addGold(gold);

    // Death particles
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5,
        life: 600, color: '#86efac', size: 3, type: 'circle',
      });
    }

    // Rage charge
    this._addRage(8);

    // 정화 체크
    const purifyChance = Math.max(5, this.basePurifyChance - this.currentWave * 0.5 + this.purifyBonusChance);
    if (Math.random() * 100 < purifyChance) {
      // 정화 성공! 적을 죽이지 않고 빙빙 도는 상태로 전환
      // ⚡ SpeedAI에서 제거 (정화 중 이동 안 함)
      if (this._speedAIReady && enemy._speedAIId) {
        SpeedAI.removeMob(enemy._speedAIId);
        enemy._speedAIMob = null;
      }
      enemy.hp = enemy.maxHp * 0.5;
      enemy.purifyState = PURIFY_STATE.STUNNED;
      enemy.purifyTimer = 0;
      enemy.stunSpinPhase = 0;

      this.particles.push({
        x: enemy.x, y: enemy.y - 20,
        text: '✨ 정화!', color: '#86efac', type: 'text',
        life: 1500, vy: -0.8, vx: 0,
      });
      return; // 제거하지 않음
    }

    // 드롭 체크 (15%)
    if (Math.random() < 0.15 || enemy.isBoss) {
      const upg = SURVIVAL_UPGRADES[Math.floor(Math.random() * SURVIVAL_UPGRADES.length)];
      this.droppedItems.push({
        x: enemy.x, y: enemy.y,
        upgradeId: upg.id, emoji: upg.emoji, color: '#fbbf24',
        life: 10000, bobPhase: 0,
      });
    }

    // 정화 안 됐으면 제거
    if (index !== undefined) this.enemies.splice(index, 1);
  }

  // ── Recruit Ally (정화된 적 → 아군 편입) ──
  _recruitAlly(enemy) {
    enemy.purifyState = PURIFY_STATE.ALLIED;
    this.purifiedCount++;

    // "!" 연출
    this.particles.push({
      x: enemy.x, y: enemy.y - 25,
      text: '❗ 아군!', color: '#00ff88', type: 'text',
      life: 1500, vy: -1, vx: 0,
    });

    // enemies에서 제거 → purifiedAllies로 이동
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) this.enemies.splice(idx, 1);

    this.purifiedAllies.push({
      x: enemy.x, y: enemy.y,
      hp: enemy.hp, maxHp: enemy.maxHp,
      attack: Math.round(enemy.attack * 0.7),
      speed: enemy.speed * 0.9,
      radius: enemy.radius,
      emoji: enemy.emoji,
      isElite: enemy.isElite,
      atkTimer: 0, atkSpeed: 800,
      duration: enemy.allyDuration,
      timer: 0,
      bobPhase: 0,
    });

    EventBus.emit('survival:recruit', { emoji: enemy.emoji, isElite: enemy.isElite });
  }

  // ── Purified Allies Update ──
  _updatePurifiedAllies(dt) {
    for (let i = this.purifiedAllies.length - 1; i >= 0; i--) {
      const ally = this.purifiedAllies[i];
      ally.timer += dt;
      ally.bobPhase += dt * 0.003;

      // 시간제 만료
      if (ally.duration !== Infinity && ally.timer >= ally.duration) {
        this.particles.push({
          x: ally.x, y: ally.y - 15,
          text: '💨 이탈', color: '#888', type: 'text',
          life: 1000, vy: -1, vx: 0,
        });
        this.purifiedAllies.splice(i, 1);
        continue;
      }

      // 플레이어 따라가기
      const dx = this.player.x - ally.x;
      const dy = this.player.y - ally.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const followDist = 40 + i * 15;
      if (dist > followDist) {
        const spd = ally.speed * 1.2 * (dt / 16);
        ally.x += (dx / dist) * spd;
        ally.y += (dy / dist) * spd;
      }

      // 자동 공격
      ally.atkTimer -= dt;
      if (ally.atkTimer <= 0) {
        const activeEnemies = this.enemies.filter(e => e.purifyState === PURIFY_STATE.NONE);
        if (activeEnemies.length > 0) {
          let nearest = null, minD = Infinity;
          for (const e of activeEnemies) {
            const d = this._dist(ally, e);
            if (d < minD) { minD = d; nearest = e; }
          }
          if (nearest && minD < 250) {
            const angle = Math.atan2(nearest.y - ally.y, nearest.x - ally.x);
            this.projectiles.push({
              x: ally.x, y: ally.y,
              vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
              damage: ally.attack, source: 'ally', radius: 4,
              emoji: '⚡', pierce: 0, homing: false, target: null,
            });
            ally.atkTimer = ally.atkSpeed;
          }
        }
      }
    }
  }

  // ── Dropped Items ──
  _updateDroppedItems() {
    this.droppedItems = this.droppedItems.filter(item => {
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        const upg = SURVIVAL_UPGRADES.find(u => u.id === item.upgradeId);
        if (upg) {
          upg.apply(this.player, this);
          this.particles.push({
            x: this.player.x, y: this.player.y - 30,
            text: upg.desc, color: '#fbbf24', type: 'text',
            life: 1500, vy: -0.8, vx: 0,
          });
        }
        return false;
      }
      item.life -= 16;
      return item.life > 0;
    });
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += (p.vx || 0) * (dt / 16);
      p.y += (p.vy || 0) * (dt / 16);
      if (p.type === 'circle') p.vy += 0.03;
      return p.life > 0;
    });
  }

  _updateRage(dt) {
    this.rageSystem.update(dt);
  }

  _addRage(amount) {
    const shouldTrigger = this.rageSystem.add(amount);
    if (shouldTrigger) {
      if (!this.rageSystem.trigger()) return; // 횟수 소진
      const remaining = this.rageSystem.getTriggersRemaining();
      const maxT = this.rageSystem.getMaxTriggers();
      this.particles.push({
        x: this.player.x, y: this.player.y - 40,
        text: `\uD83D\uDCA2 \uBD84\uB178 \uD3ED\uBC1C! (${maxT - remaining}/${maxT})`,
        color: '#ff6b6b', type: 'text',
        life: 2000, vy: -0.5, vx: 0,
      });
    }
  }

  _updateCamera() {
    // 서바이벌: 45도 뒤통수 카메라 — 플레이어를 화면 하단 65%에 배치
    // → 전방(위쪽) 65%, 뒤(아래) 35% 시야 = 뒤에서 내려다보는 느낌
    const targetX = this.player.x - this.W * 0.35;  // 약간 전방 오프셋
    const targetY = this.player.y - this.H * 0.65;  // 플레이어가 화면 아래쪽
    this.camera.x += (targetX - this.camera.x) * 0.08;
    this.camera.y += (targetY - this.camera.y) * 0.08;
    this.camera.x = Math.max(0, Math.min(this.map.mapW - this.W, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.map.mapH - this.H, this.camera.y));
  }

  _damagePlayer(damage) {
    const dmg = Math.max(1, damage - this.player.defense * 0.5);
    this.player.hp -= dmg;
    if (this.player.hp < 0) this.player.hp = 0;
    this._spawnHitParticles(this.player.x, this.player.y, '#ff6b6b');
    this._addRage(12);

    if (this.player.hp <= 0) {
      this.running = false;
      this.onGameOver({
        wave: this.currentWave,
        kills: this.totalKills,
        gold: this.totalGold,
        purified: this.purifiedCount,
      });
    }
  }

  healPlayer(amount) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }

  /** 타이머 종료 → 보스 접근 급가속 (3분 생존 후 보스 조우로 전환) */
  _onTimerEnd() {
    if (!this.running) return;
    // 보스 접근 시스템에 타이머 종료 알림 → 급가속
    this.bossApproach.onTimerEnd();
  }

  /** 보스 접근 시스템에서 호출하는 승리 체크 */
  _checkVictory() {
    if (this.bossApproach.getPhase() === 'complete') {
      this.running = false;
      this.onGameOver({
        wave: this.currentWave,
        kills: this.totalKills,
        gold: this.totalGold,
        purified: this.purifiedCount,
        bossDefeated: true,
      });
    }
  }

  // ══════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════
  _draw() {
    const ctx = this.ctx;

    // 화면 흔들림 오프셋 적용
    let shakeX = 0, shakeY = 0;
    if (this._screenShake) {
      const t = this._screenShake.timer / this._screenShake.duration;
      const fade = 1 - t;
      const intensity = this._screenShake.intensity * fade;
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
    }

    const cx = this.camera.x + shakeX;
    const cy = this.camera.y + shakeY;

    // Map (서바이벌 맵: 열 기반 최적화 렌더링)
    if (this.map.survivorMode) {
      renderSurvivorMap(ctx, this.map, this.camera);
    } else {
      renderMap(ctx, this.map, this.camera);
    }

    // 🌫️ 자동전진 어둠 벽
    this.autoScroll.draw(ctx, this.camera, this.W, this.H);

    // 🍄 보스 접근 붉은 안개 (우측에서 접근)
    this.bossApproach.draw(ctx, this.camera, this.W, this.H);

    // Dropped items
    this.droppedItems.forEach(item => {
      item.bobPhase += 0.05;
      const sx = item.x - cx;
      const sy = item.y - cy + Math.sin(item.bobPhase) * 3;
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = item.color; ctx.shadowBlur = 8;
      ctx.fillText(item.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Enemies
    this.enemies.forEach(e => {
      const sx = e.x - cx;
      const sy = e.y - cy + Math.sin(e.bobPhase) * 2;

      if (e.purifyState === PURIFY_STATE.STUNNED) {
        // 빙빙 도는 연출
        ctx.save();
        ctx.globalAlpha = 0.7 + Math.sin(e.stunSpinPhase * 2) * 0.3;
        ctx.font = `${e.radius * 2}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(e.emoji, sx, sy);

        // 별 빙빙
        const starCount = 3;
        for (let i = 0; i < starCount; i++) {
          const a = e.stunSpinPhase + (i / starCount) * Math.PI * 2;
          const sr = 20;
          const stx = sx + Math.cos(a) * sr;
          const sty = sy - e.radius - 5 + Math.sin(a) * 8;
          ctx.font = '12px serif';
          ctx.fillText(['⭐', '💫', '✨'][i], stx, sty);
        }
        ctx.restore();
        return;
      }

      // 일반 적
      ctx.font = `${e.radius * 2}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (e.isElite || e.isBoss) {
        ctx.shadowColor = e.color; ctx.shadowBlur = 12;
      }
      ctx.fillText(e.emoji, sx, sy);
      ctx.shadowBlur = 0;

      // HP bar
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const hpRatio = e.hp / e.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx - barW / 2, sy - e.radius - 8, barW, 3);
        ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : '#ff6b6b';
        ctx.fillRect(sx - barW / 2, sy - e.radius - 8, barW * hpRatio, 3);
      }
    });

    // Purified Allies
    this.purifiedAllies.forEach(a => {
      const sx = a.x - cx;
      const sy = a.y - cy + Math.sin(a.bobPhase) * 2;
      ctx.save();
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
      ctx.font = `${a.radius * 2}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(a.emoji, sx, sy);
      ctx.shadowBlur = 0;
      // 아군 표시
      ctx.fillStyle = '#00ff88'; ctx.font = '10px sans-serif';
      ctx.fillText('아군', sx, sy - a.radius - 4);
      ctx.restore();
    });

    // Projectiles
    this.projectiles.forEach(p => {
      const sx = p.x - cx;
      const sy = p.y - cy;
      ctx.font = `${Math.round(p.radius * 3)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, sx, sy);
    });

    // Spirits (아주 작게)
    const ATTR_GLOW = { fire:'rgba(255,100,50,0.5)', water:'rgba(100,150,255,0.5)', lightning:'rgba(255,255,100,0.5)', dark:'rgba(100,50,150,0.5)', light:'rgba(255,255,200,0.5)', nature:'rgba(100,200,100,0.5)', ice:'rgba(150,220,255,0.5)', wind:'rgba(200,255,200,0.5)' };
    this.spirits.forEach(s => {
      const sx = s.x - cx, sy = s.y - cy;
      ctx.font = '10px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = ATTR_GLOW[s.attribute] || 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.stroke();
      ctx.fillText(s.emoji, sx, sy);
    });

    // Slot heroes (장착 영웅)
    this.slotHeroes.forEach(h => {
      const sx = h.x - cx, sy = h.y - cy;
      ctx.font = '14px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,200,100,0.4)'; ctx.shadowBlur = 6;
      ctx.fillText(h.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Player
    this._drawPlayer(ctx, cx, cy);

    // Particles (텍스트 자막 비활성화 — 원형 이펙트만)
    this.particles.forEach(p => {
      if (p.type === 'text') return;
      const sx = p.x - cx;
      const sy = p.y - cy;
      const alpha = Math.max(0, p.life / 1200);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HUD
    this._drawHUD(ctx);

    // 보스 오버레이 (HUD 위에 렌더링 — 보스 HP바, 출현/승리 텍스트, 조우/아레나 형성)
    if (this.bossApproach.isInBossPhase() && this.bossApproach.bossRoomSystem) {
      this.bossApproach.bossRoomSystem.drawOverlays(ctx);
    }
    this.bossApproach.drawOverlays(ctx, this.camera, this.W, this.H);
  }

  _drawPlayer(ctx, cx, cy) {
    const p = this.player;
    const sx = p.x - cx;
    const sy = p.y - cy + Math.sin(p.bobPhase) * 3;
    if (this.rageSystem.isActive()) { ctx.shadowColor = 'rgba(255,50,50,0.6)'; ctx.shadowBlur = 20; }
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, sx, sy);
    ctx.shadowBlur = 0;
  }

  _drawHUD(ctx) {
    const pad = 10;
    const barW = 140;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(pad - 4, pad - 4, barW + 8, 80, 8);

    // Wave
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px "Noto Sans KR", sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`🌊 웨이브 ${this.currentWave}`, pad, pad + 10);

    // HP bar
    const hpY = pad + 20;
    const hpRatio = this.player.hp / this.player.maxHp;
    ctx.fillStyle = 'rgba(30,30,50,0.8)'; ctx.fillRect(pad, hpY, barW, 10);
    ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(pad, hpY, barW * hpRatio, 10);
    ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.player.hp)}/${this.player.maxHp}`, pad + barW / 2, hpY + 8);

    // Rage bar
    const rageY = hpY + 14;
    ctx.fillStyle = 'rgba(30,30,50,0.8)'; ctx.fillRect(pad, rageY, barW, 6);
    const svRageExhausted = this.rageSystem.isExhausted();
    ctx.fillStyle = svRageExhausted ? '#555' : this.rageSystem.isActive() ? '#ff3333' : '#ff6b6b';
    ctx.fillRect(pad, rageY, barW * (this.rageSystem.getGauge() / 100), 6);
    // 남은 횟수 표시
    const svRem = this.rageSystem.getTriggersRemaining();
    const svMax = this.rageSystem.getMaxTriggers();
    ctx.fillStyle = svRageExhausted ? '#666' : '#ff6b6b';
    ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(svRageExhausted ? '\uD83D\uDCA2\uC18C\uC9C4' : `\u26A1${svRem}/${svMax}`, pad + barW, rageY - 1);

    // Stats
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`💀${this.totalKills}  💰${this.totalGold}G  💚${this.purifiedAllies.length}아군`, pad, rageY + 18);

    // ⏰ 스테이지 타이머 (상단 중앙)
    this.stageTimer.drawHUD(ctx, this.W / 2 - 22, pad + 10);

    // Timer (다음 웨이브)
    const nextWaveSec = Math.ceil((this.waveInterval - this.waveTimer) / 1000);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`다음 웨이브: ${nextWaveSec}초`, this.W - pad, pad + 12);
  }

  // ══════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════
  _dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
  _circleHit(a, b) {
    const dx = a.x - b.x; const dy = a.y - b.y;
    const rr = (a.radius || 5) + (b.radius || 5);
    return dx * dx + dy * dy < rr * rr;
  }
  _spawnHitParticles(x, y, color) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({ x, y, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life: 300, color, size: 2+Math.random()*2, type: 'circle' });
    }
  }

  // ══════════════════════════════════════
  //  INPUT
  // ══════════════════════════════════════
  _bindInput() {
    this._onKeyDown = e => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this._keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this._onTouchStart = e => { const t = e.touches[0]; this._touchStart = { x: t.clientX, y: t.clientY }; };
    this._onTouchMove = e => {
      if (!this._touchStart) return; e.preventDefault();
      const t = e.touches[0]; const dx = t.clientX - this._touchStart.x; const dy = t.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx*dx+dy*dy);
      if (mag > 10) this._touchDir = { x: dx/mag, y: dy/mag };
    };
    this._onTouchEnd = () => { this._touchStart = null; this._touchDir = { x:0, y:0 }; };
    this._onMouseDown = e => { this._mouseDown = true; this._touchStart = { x: e.clientX, y: e.clientY }; };
    this._onMouseMove = e => {
      if (!this._mouseDown || !this._touchStart) return;
      const dx = e.clientX - this._touchStart.x; const dy = e.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx*dx+dy*dy);
      if (mag > 10) this._touchDir = { x: dx/mag, y: dy/mag };
    };
    this._onMouseUp = () => { this._mouseDown = false; this._touchStart = null; this._touchDir = { x:0, y:0 }; };

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _unbindInput() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}

// ══════════════════════════════════════
//  Scene Wrapper for SceneManager
// ══════════════════════════════════════
import SceneManager from '../core/scene-manager.js';
import SaveManager from '../core/save-manager.js';
import StaminaSystem from '../systems/stamina-system.js';
import CurrencySystem from '../systems/currency-system.js';

export default class SurvivalScene {
  onCreate(params) {
    this._engine = null;
    this._biomeId = params?.biomeId || null;
  }

  render() {
    if (!this._biomeId) {
      this._showBiomeSelect();
    } else {
      this._startSurvival(this._biomeId);
    }
  }

  _showBiomeSelect() {
    const maxRegion = Math.min(10, Math.ceil((GameState.currentStage || 1) / 20) + 1);

    this.el.innerHTML = `
      <div class="survival-select">
        <div class="sv-header">
          <button class="btn btn-secondary" id="sv-back">← 돌아가기</button>
          <h2>⚔️ 서바이벌 모드</h2>
        </div>
        <p class="sv-desc">무한 웨이브에 도전! 적을 정화하여 동료로 만드세요.</p>
        <div class="sv-biome-list">
          ${SURVIVAL_BIOMES.map((b, i) => {
            const locked = i >= maxRegion;
            return `
              <div class="sv-biome ${locked ? 'sv-locked' : ''}" data-biome="${b.id}">
                <span class="sv-biome-emoji">${locked ? '🔒' : b.emoji}</span>
                <span class="sv-biome-name">${locked ? '???' : b.name}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <style>
        .survival-select { padding: 12px; max-width: 500px; margin: 0 auto; }
        .sv-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .sv-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .sv-desc { font-size: 13px; color: #888; text-align: center; margin-bottom: 16px; }
        .sv-biome-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .sv-biome {
          display: flex; align-items: center; gap: 8px; padding: 12px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; cursor: pointer; transition: background 0.2s;
        }
        .sv-biome:hover:not(.sv-locked) { background: rgba(255,255,255,0.12); }
        .sv-locked { opacity: 0.4; cursor: not-allowed; }
        .sv-biome-emoji { font-size: 24px; }
        .sv-biome-name { font-size: 13px; color: #f0e6d2; }
      </style>
    `;

    this.el.querySelector('#sv-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.sv-biome:not(.sv-locked)').forEach(el => {
      el.onclick = () => {
        if (!StaminaSystem.spend('survival')) {
          alert('스태미나가 부족합니다!');
          return;
        }
        this._biomeId = el.dataset.biome;
        this._startSurvival(this._biomeId);
      };
    });
  }

  _startSurvival(biomeId) {
    this.el.innerHTML = '';
    this.el.className = 'scene survival-scene';

    const canvas = document.createElement('canvas');
    canvas.className = 'combat-canvas';
    canvas.width = Math.min(window.innerWidth, 900);
    canvas.height = Math.min(window.innerHeight - 40, 600);
    this.el.appendChild(canvas);

    const controlBar = document.createElement('div');
    controlBar.className = 'combat-control-bar';
    controlBar.innerHTML = `
      <div class="combat-ctrl-info"><span>서바이벌: ${SURVIVAL_BIOMES.find(b => b.id === biomeId)?.name || biomeId}</span></div>
      <button class="btn btn-secondary btn-sm" id="sv-quit">포기</button>
    `;
    this.el.appendChild(controlBar);

    controlBar.querySelector('#sv-quit').onclick = () => {
      if (confirm('서바이벌을 포기하시겠습니까?')) {
        this._onSurvivalEnd();
      }
    };

    this._engine = new SurvivalEngine(canvas, {
      biomeId,
      onGameOver: (result) => this._onSurvivalEnd(result),
    });
    this._engine.start();
  }

  _onSurvivalEnd(result) {
    if (this._engine) {
      this._engine.stop();
      this._engine = null;
    }

    const wave = result?.wave || 0;
    const kills = result?.kills || 0;
    const purified = result?.purified || 0;
    const gold = result?.gold || 0;

    // Grant rewards
    if (gold > 0) CurrencySystem.add('gold', gold, 'survival');

    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-overlay__title">⚔️ 서바이벌 종료</div>
      <div class="victory-stats" style="margin:10px 0;">
        <span>🌊 웨이브: ${wave}</span>
        <span>💀 처치: ${kills}</span>
        <span>💚 정화: ${purified}</span>
        <span>💰 골드: ${gold}</span>
      </div>
      <button class="btn btn-primary btn-lg" id="sv-return">메인으로 돌아가기</button>
    `;
    this.el.appendChild(overlay);
    overlay.querySelector('#sv-return').onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  onEnter() {}

  onLeave() {
    if (this._engine) {
      this._engine.stop();
      this._engine = null;
    }
  }
}
