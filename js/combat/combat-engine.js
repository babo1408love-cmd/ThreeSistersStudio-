/**
 * CombatEngine — 스테이지2 Canvas 횡스크롤 전투
 * 귀여운 슬라임, 자동공격, 업그레이드 드롭, 분노게이지, 펫회복
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { ENEMIES, BOSSES, generateWave, generateDrop } from '../generators/enemy-drop-generator.js';
import { generateMap, renderMap, generateSurvivorMap, renderSurvivorMap } from '../generators/map-generator.js';
import { renderAttack, getSkillByTier } from '../generators/spirit-attack-generator.js';
import BossRoomSystem, { BOSS_ROOM_PHASE } from './boss-room-system.js';
import AerialCombatSystem from './aerial-combat-system.js';
import UnitFactory from '../data/unit-factory.js';
import StageTimer from '../systems/stage-timer.js';
import AutoScroll from '../systems/auto-scroll.js';
import BossApproachSystem from '../systems/boss-approach.js';
import AutoWalk from '../systems/auto-walk.js';
import RageSystem from '../systems/rage-system.js';
import { ENEMY_SPEED_CONFIG, calcEnemySpeed } from '../data/combat-config.js';
import HeroEngine from '../systems/hero-engine.js';

// ── 업그레이드 아이템 정의 ──
const UPGRADE_ITEMS = [
  {id:'fast_attack',  name:'빠른공격',  emoji:'🔴',color:'#FF4444',desc:'공격속도+20%',  apply:(p)=>{p.atkSpeed*=0.8;}},
  {id:'strong_attack', name:'강한공격',  emoji:'🟠',color:'#FF8800',desc:'공격크기1.5배',  apply:(p)=>{p.projSize*=1.5;}},
  {id:'long_range',    name:'먼공격',    emoji:'🟡',color:'#FFDD00',desc:'사거리+30%',    apply:(p)=>{p.projSpeed*=1.3;}},
  {id:'double_shot',   name:'연속발사',  emoji:'🟢',color:'#44BB44',desc:'2발씩 발사',    apply:(p)=>{p.shotCount=Math.min(p.shotCount+1,4);}},
  {id:'pierce',        name:'관통공격',  emoji:'🔵',color:'#4488FF',desc:'2마리 관통',    apply:(p)=>{p.pierce=Math.min(p.pierce+1,4);}},
  {id:'homing',        name:'호밍공격',  emoji:'🟣',color:'#AA44CC',desc:'적 추적',       apply:(p)=>{p.homing=true;}},
  {id:'hp_heal',       name:'HP회복',    emoji:'⚪',color:'#FFFFFF',desc:'즉시30% 회복',  apply:(p,eng)=>{eng.healPlayer(Math.round(p.maxHp*0.3));}},
  {id:'def_up',        name:'방어강화',  emoji:'🟤',color:'#8B4513',desc:'방어력+5',      apply:(p)=>{p.defense+=5;}},
];

export default class CombatEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;

    // Options
    this.stageLevel = options.stageLevel || 1;
    this.maxWaves = options.maxWaves || 4;
    this.onVictory = options.onVictory || (() => {});
    this.onDeath = options.onDeath || (() => {});

    // Map — 3분 자동전진에 맞춘 서바이벌 맵 (바닥+사물+배틀아레나)
    const scrollBaseSpeed = 0.6 + this.stageLevel * 0.05;
    const scrollAccel = 0.00008;
    this.map = generateSurvivorMap({
      themeId: options.mapTheme || 'fairy_garden',
      stageLevel: this.stageLevel,
      scrollSpeed: scrollBaseSpeed,
      scrollAccel,
    });
    this.camera = { x: 0, y: 0 };

    // Player (UnitFactory 경유)
    this.player = UnitFactory.createPlayerEntity(GameState, { mapH: this.map.mapH });

    // HeroAI 파티 데이터 연동 — 원소 정보 + 시너지 보너스 적용
    if (typeof HeroAI !== 'undefined' && HeroAI.party._calculated) {
      const pd = window._heroAIPartyData;
      if (pd && pd.heroes.length > 0) {
        this.player.element = pd.heroes[0].element || 'light';
      }
    } else {
      this.player.element = 'light';
    }

    // Slot heroes (최대 5, UnitFactory 경유)
    this.slotHeroes = GameState.heroSlots.filter(h => h != null).slice(0, 5)
      .map((h, i) => UnitFactory.createAlly(h, { combatRole: 'slotHero', index: i, playerPos: this.player }));

    // Spirits (정령 소환, UnitFactory 경유)
    this.spirits = GameState.spirits.map((s, i) =>
      UnitFactory.createSpirit({ ...s, combatMode: true, orbitIndex: i }));

    // Pet (UnitFactory 경유)
    this.pet = null;
    if (GameState.petSlot) {
      const p = GameState.petSlot;
      this.pet = UnitFactory.createPet({
        ...p,
        emoji: GameState.petAppearance?.emoji || p.emoji || '💚',
        combatMode: true,
        x: this.player.x - 20,
        y: this.player.y - 20,
      });
    }

    // Entities
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.droppedItems = [];  // floor upgrade items
    this.activeAttackFx = []; // spirit attack effects

    // State
    this.running = false;
    this.currentWave = 0;
    this.waveSpawned = false;
    this.waveTimer = 0;
    this.waveDelay = 3000; // ms between waves
    this.totalKills = 0;
    this.totalGold = 0;
    this._animFrame = null;
    this._lastTime = 0;
    this._elapsed = 0;
    this._keys = {};
    this._touchStart = null;
    this._touchDir = { x: 0, y: 0 };

    // Rage (등급별 발동 횟수 제한: Legendary 3, Epic 2, 나머지 1)
    this.rageSystem = new RageSystem({
      initialGauge: GameState.rageGauge || 0,
      maxTriggers: RageSystem.resolveMaxTriggers(GameState),
      gainRate: (GameState.player.rageGainRate || 100) / 100,
    });

    // Pet heal gauge
    this.petHealGauge = GameState.petHealGauge || 0;

    // 보스방 시스템
    this.bossRoomSystem = new BossRoomSystem(this, this.stageLevel);
    this.bossRoomSystem.setGatePosition(this.map.mapW, this.map.mapH);

    // 공중전 시스템
    this.aerialSystem = new AerialCombatSystem(this);

    // ⏰ 스테이지 타이머 (3분)
    this.stageTimer = new StageTimer({
      duration: 180000, // 3분
      onTimeUp: () => this._onTimerEnd(),
    });

    // 🌫️ 자동 전진 (뱀서류 강제 전진 — 포자 안개가 뒤에서 밀려옴)
    this.autoScroll = new AutoScroll({
      speed: 0.6 + this.stageLevel * 0.05, // 스테이지 레벨에 따라 속도 증가
      direction: 'horizontal',
      startBoundary: 0,
      warningZone: 120,
      damagePerSec: 20 + this.stageLevel * 2,
      pushForce: 2.0,
      accel: 0.00008,
    });

    // 화면 흔들림 상태
    this._screenShake = null;

    // 보스 접근 시스템 (우측에서 보스가 다가옴)
    this.bossApproach = new BossApproachSystem(this, {
      mapWidth: this.map.mapW,
      mapHeight: this.map.mapH,
      stageLevel: this.stageLevel,
      autoScroll: this.autoScroll,
    });

    // 🚶 자동 전진 (3분에 보스와 만나는 속도)
    this.autoWalk = new AutoWalk({
      mapWidth: this.map.mapW,
      stageLevel: this.stageLevel,
    });

    this._bindInput();

    // ⚡ HeroEngine — 모든 생성기 통합 영웅 시스템
    this.heroEngine = new HeroEngine(this.player, {
      mapWidth: this.map.mapW,
      mapHeight: this.map.mapH,
      stageLevel: this.stageLevel,
    });
    // 레벨업 시 파티클 이펙트
    this.heroEngine.onLevelUp = (result) => {
      this.particles.push({
        x: this.player.x, y: this.player.y - 40,
        text: `⬆️ Lv.${this.heroEngine.getLevel()}!`, color: '#fbbf24', type: 'text',
        life: 2500, vy: -0.6, vx: 0,
      });
    };
  }

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this.currentWave = 1;
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
    if (this.heroEngine) this.heroEngine.destroy();
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
    // ⏰ 스테이지 타이머 업데이트
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

    // 보스방 시스템 업데이트
    if (this.bossRoomSystem.enabled) {
      this.bossRoomSystem.update(dt);
    }

    // 공중전 시스템 업데이트
    this.aerialSystem.update(dt);

    // ⚡ HeroEngine: SpeedAI 동기화 + 전술 AI + 스킬 쿨다운 + 위험도
    if (!this.bossApproach.isBlocking()) {
      this.heroEngine.update(dt, this.enemies, this.bossApproach.isInBossPhase());
    }

    // 보스 접근 시스템이 보스전 페이즈 → 보스방 전투 위임
    if (this.bossApproach.isInBossPhase()) {
      this._updatePlayer(dt);
      this._updateSlotHeroes(dt);
      this._updateSpirits(dt);
      this._updatePet(dt);
      this._updateAutoAttack(dt);
      this._updateEnemies(dt);
      this._updateProjectiles(dt);
      this._updateAttackFx(dt);
      this._updateDroppedItems();
      this._updateParticles(dt);
      this._updateRage(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 보스 접근 시스템이 블로킹 중 (MEETING/ARENA_FORMING) → 전투 중단
    if (this.bossApproach.isBlocking()) {
      this._updateParticles(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 보스방 내부에서는 자동전진 스킵, 필드 맵 위에서 전투
    if (this.bossRoomSystem.isInBossRoom()) {
      this._updateWaves(dt);
      this._updatePlayer(dt);
      this._updateSlotHeroes(dt);
      this._updateSpirits(dt);
      this._updatePet(dt);
      this._updateAutoAttack(dt);
      this._updateEnemies(dt);
      this._updateProjectiles(dt);
      this._updateAttackFx(dt);
      this._updateDroppedItems();
      this._updateParticles(dt);
      this._updateRage(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 🌫️ 자동 전진 (포자 안개)
    const scrollResult = this.autoScroll.update(dt, this.player);
    if (scrollResult.damage > 0) {
      this._damagePlayer(scrollResult.damage);
    }
    if (scrollResult.pushX) {
      this.player.x += scrollResult.pushX;
    }

    // Wave management
    this._updateWaves(dt);
    // Player movement
    this._updatePlayer(dt);
    // Slot heroes follow
    this._updateSlotHeroes(dt);
    // Spirits orbit
    this._updateSpirits(dt);
    // Pet follow + heal
    this._updatePet(dt);
    // Auto-attack
    this._updateAutoAttack(dt);
    // Enemies
    this._updateEnemies(dt);
    // Projectiles
    this._updateProjectiles(dt);
    // Attack effects
    this._updateAttackFx(dt);
    // Dropped items
    this._updateDroppedItems();
    // Particles
    this._updateParticles(dt);
    // Rage
    this._updateRage(dt);
    // Camera
    this._updateCamera();
    // Victory check
    this._checkVictory();
  }

  _updateWaves(dt) {
    // 보스 접근 블로킹 또는 보스전 중에는 새 웨이브 스폰 중단
    if (this.bossApproach.isBlocking() || this.bossApproach.isInBossPhase()) return;

    if (this.enemies.length === 0 && this.waveSpawned) {
      // 마지막 웨이브 클리어 → 보스방 게이트 활성화 (배틀아레나 진입)
      if (this.currentWave >= this.maxWaves && this.bossRoomSystem.enabled) {
        this.bossRoomSystem.activateGate();
        return;
      }

      this.waveTimer += dt;
      if (this.waveTimer >= this.waveDelay) {
        this.currentWave++;
        // 타이머 남아있으면 maxWaves 이후에도 계속 웨이브 스폰
        if (this.currentWave <= this.maxWaves || !this.stageTimer.finished) {
          this._spawnWave();
        }
      }
    }
  }

  _spawnWave() {
    this.waveSpawned = true;
    this.waveTimer = 0;
    // BalanceAI: 플레이어 전투력 전달 → 자동 밸런싱
    const playerPower = (this.player.attack * this.player.speed * 0.8) + (this.player.maxHp * 0.3) + (this.player.defense * 0.5);
    const wave = generateWave(this.currentWave, this.stageLevel, playerPower);

    // 일반몹: 플레이어 뒤쪽(왼쪽) + 상하에서 등장
    wave.enemies.forEach((eDef, i) => {
      const side = i % 3; // 뒤(좌), 위, 아래 — 정면(우) 제외
      let sx, sy;
      const offset = 40 + Math.random() * 60;
      if (side === 0) { sx = this.player.x - this.W * 0.5 - offset; sy = this.player.y + (Math.random() - 0.5) * this.H; }
      else if (side === 1) { sx = this.player.x + (Math.random() - 0.5) * this.W * 0.6; sy = this.player.y - this.H * 0.5 - offset; }
      else { sx = this.player.x + (Math.random() - 0.5) * this.W * 0.6; sy = this.player.y + this.H * 0.5 + offset; }

      sx = Math.max(20, Math.min(this.map.mapW - 20, sx));
      sy = Math.max(20, Math.min(this.map.mapH - 20, sy));
      this.enemies.push(this._createEnemy(eDef, sx, sy));
    });

    // 중간보스 — 정면(오른쪽)에서만 등장, 비선공 + 속도 1.5배
    if (wave.boss) {
      const bx = Math.min(this.map.mapW - 50, this.player.x + this.W * 0.5 + 60);
      const by = this.player.y + (Math.random() - 0.5) * 100;
      const bossEntity = this._createEnemy(wave.boss, bx, by);
      bossEntity.passive = true;   // 비선공 플래그
      bossEntity.fixedSpeedMul = 1.5; // 플레이어 속도의 1.5배 고정
      this.enemies.push(bossEntity);
    }
  }

  _createEnemy(def, x, y) {
    const enemy = UnitFactory.createEnemy(def, 1, { x, y, combatMode: true });
    // ⚡ HeroEngine에 몹 등록 (SpeedAI 추격/포위 AI)
    this.heroEngine.registerMob(enemy, x, y);
    return enemy;
  }

  _updatePlayer(dt) {
    // 🚶 자동 전진 (보스전 진입 시 정지)
    if (this.bossApproach.isBlocking() || this.bossApproach.isInBossPhase()) {
      this.autoWalk.pause();
    } else {
      this.autoWalk.resume();
    }
    this.autoWalk.update(dt, this.player);

    let mx = (this._keys['d'] || this._keys['arrowright'] ? 1 : 0) - (this._keys['a'] || this._keys['arrowleft'] ? 1 : 0) + this._touchDir.x;
    let my = (this._keys['s'] || this._keys['arrowdown'] ? 1 : 0) - (this._keys['w'] || this._keys['arrowup'] ? 1 : 0) + this._touchDir.y;
    const mag = Math.sqrt(mx * mx + my * my);
    if (mag > 1) { mx /= mag; my /= mag; }

    const spd = this.player.speed * (dt / 16);
    this.player.x += mx * spd;
    this.player.y += my * spd;

    // Clamp to map bounds (자동전진 경계 이후로만 이동 가능)
    const minX = Math.max(16, this.autoScroll.getBoundary() + 10);
    // 보스 접근 시 우측 경계도 클램핑
    const maxX = this.bossApproach.getPhase() !== 'dormant'
      ? Math.min(this.map.mapW - 16, this.bossApproach.getBoundary() - 20)
      : this.map.mapW - 16;
    this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    this.player.y = Math.max(16, Math.min(this.map.mapH - 16, this.player.y));

    // Bob animation
    this.player.bobPhase += dt * 0.004;

    // 보스방 게이트 진입 체크
    if (this.bossRoomSystem.checkGateEntry(this.player.x, this.player.y)) {
      this.bossRoomSystem.enterBossRoom();
    }
  }

  _updateSlotHeroes(dt) {
    // V-Formation: 5영웅 배치 (플레이어 뒤쪽 V자 대형)
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

      // Auto-attack (HeroBattleAI 원소 상성 지원)
      h.atkTimer -= dt;
      if (h.atkTimer <= 0 && this.enemies.length > 0) {
        const nearest = this._findNearest(h, this.enemies);
        if (nearest && this._dist(h, nearest) < 500) {
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

  _updateSpirits(dt) {
    // 속성별 미사일 이모지
    const SPIRIT_PROJ_EMOJI = {
      fire:'🔥', water:'💧', lightning:'⚡', dark:'🌑',
      light:'✨', nature:'🌿', ice:'❄️', wind:'💨',
    };
    // 속성 → 원소 매핑 (HeroAI 원소 상성용)
    const ATTR_TO_ELEMENT = {
      fire:'fire', water:'water', lightning:'thunder', dark:'dark',
      light:'light', nature:'grass', ice:'ice', wind:'thunder',
    };

    this.spirits.forEach(s => {
      // Orbit around player
      s.orbitAngle += dt * 0.0015;
      const orbitR = 40 + (this.spirits.length > 6 ? 15 : 0);
      s.x = this.player.x + Math.cos(s.orbitAngle) * orbitR;
      s.y = this.player.y + Math.sin(s.orbitAngle) * orbitR;

      // 정령 미사일 발사 — 정령 수만큼 미사일이 날아감!
      s.atkTimer -= dt;
      if (s.atkTimer <= 0 && this.enemies.length > 0) {
        const nearest = this._findNearest(s, this.enemies);
        if (nearest && this._dist(s, nearest) < 600) {
          const baseDmg = 5 + s.rarity * 3 + s.level;
          const dmg = baseDmg * this.rageSystem.getDamageMultiplier();
          const angle = Math.atan2(nearest.y - s.y, nearest.x - s.x);
          const projEmoji = SPIRIT_PROJ_EMOJI[s.attribute] || '✨';
          const projSpeed = 5 + s.rarity * 0.5;

          // 미사일 발사! (실제 투사체 생성 + 원소 정보)
          this.projectiles.push({
            x: s.x, y: s.y,
            vx: Math.cos(angle) * projSpeed,
            vy: Math.sin(angle) * projSpeed,
            damage: dmg,
            source: 'ally',
            radius: 4 + s.rarity,
            emoji: projEmoji,
            pierce: 0,
            homing: s.rarity >= 3, // 매직 이상은 호밍
            target: s.rarity >= 3 ? nearest : null,
            spiritName: s.name,
            element: ATTR_TO_ELEMENT[s.attribute] || s.attribute || null,
          });

          // 발사 이펙트 (작은 반짝임)
          this.particles.push({
            x: s.x, y: s.y,
            vx: Math.cos(angle) * 0.5, vy: Math.sin(angle) * 0.5,
            life: 200, color: '#fbbf24', size: 3, type: 'circle',
          });

          s.atkTimer = s.atkCooldown;
        }
      }
    });
  }

  _updatePet(dt) {
    if (!this.pet) return;
    // Follow behind player
    const tx = this.player.x - 25;
    const ty = this.player.y - 25;
    this.pet.x += (tx - this.pet.x) * 0.06;
    this.pet.y += (ty - this.pet.y) * 0.06;

    // Auto-heal every 5s
    this.pet.healTimer += dt;
    if (this.pet.healTimer >= this.pet.healInterval) {
      this.pet.healTimer = 0;
      if (this.player.hp < this.player.maxHp) {
        const heal = this.pet.healAmount;
        this.healPlayer(heal);
        if (typeof SoundSFX !== 'undefined' && SoundSFX.petHeal) SoundSFX.petHeal();
        // Green +HP effect
        this.particles.push({
          x: this.player.x, y: this.player.y - 20,
          text: `+${heal}`, color: '#86efac', type: 'text',
          life: 1200, vy: -0.5, vx: 0,
        });
        // Green sparkles
        for (let i = 0; i < 4; i++) {
          this.particles.push({
            x: this.player.x + (Math.random() - 0.5) * 20,
            y: this.player.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1, vy: -Math.random() * 1.5,
            life: 600, color: '#86efac', size: 3, type: 'circle',
          });
        }
      }
    }
  }

  _updateAutoAttack(dt) {
    // ⚡ HeroEngine 스킬 자동 발동 (행동 연계)
    const pendingSkill = this.heroEngine.getPendingSkill();
    if (pendingSkill && this.enemies.length > 0) {
      const skillTarget = this._findNearest(this.player, this.enemies);
      if (skillTarget && this._dist(this.player, skillTarget) < 500) {
        const result = this.heroEngine.fireSkill(skillTarget);
        if (result) {
          this.particles.push({
            x: this.player.x, y: this.player.y - 30,
            text: `✨${result.skill.name}`, color: '#c084fc', type: 'text',
            life: 1200, vy: -0.8, vx: 0,
          });
        }
      }
    }

    this.player.atkTimer -= dt;
    if (this.player.atkTimer <= 0 && this.enemies.length > 0) {
      const nearest = this._findNearest(this.player, this.enemies);
      if (nearest) {
        for (let i = 0; i < this.player.shotCount; i++) {
          const spread = (i - (this.player.shotCount - 1) / 2) * 0.15;
          const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x) + spread;
          this.projectiles.push({
            x: this.player.x, y: this.player.y,
            vx: Math.cos(angle) * this.player.projSpeed,
            vy: Math.sin(angle) * this.player.projSpeed,
            damage: this.player.attack * this.rageSystem.getDamageMultiplier(),
            source: 'player',
            radius: this.player.projSize,
            emoji: this.rageSystem.isActive() ? '💢' : '⚡',
            pierce: this.player.pierce,
            homing: this.player.homing,
            target: this.player.homing ? nearest : null,
            element: this.player.element || 'light',
          });
        }
        this.player.atkTimer = this.player.atkSpeed;
      }
    }
  }

  _updateEnemies(dt) {
    this.enemies.forEach(e => {
      // Bounce animation
      e.bobPhase += dt * 0.005 * (e.bounceSpeed || 2);
      e.bounceY = Math.abs(Math.sin(e.bobPhase)) * 8 * (e.scale || 1);

      // Move toward player (SpeedAI가 활성이면 이동은 SpeedAI에 위임)
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
        } else if (dist > e.radius + this.player.radius) {
          const spd = e.fixedSpeedMul
            ? this.player.speed * e.fixedSpeedMul * (dt / 16)
            : calcEnemySpeed(dist, this.player.speed, e.isBoss) * (dt / 16);
          e.x += (dx / dist) * spd;
          e.y += (dy / dist) * spd;
        }
      }

      // Clamp to map bounds
      e.x = Math.max(0, Math.min(this.map.mapW, e.x));
      e.y = Math.max(0, Math.min(this.map.mapH, e.y));

      // Contact damage — passive 몹은 선공 안 함
      if (!e.passive) {
        if (e.contactTimer === undefined) e.contactTimer = 0;
        e.contactTimer -= dt;
        if (dist < (e.radius || 14) + this.player.radius && e.contactTimer <= 0) {
          this._damagePlayer(e.attack || e.atk || 5);
          e.contactTimer = 1000;
        }
      }

      // 보스 원거리 공격 (3초 쿨타임, 사거리 400px 이내) — passive 보스는 공격 안 함
      if (e.isBoss && !e.passive && dist < 400) {
        if (!e._bossAtkTimer) e._bossAtkTimer = 0;
        e._bossAtkTimer -= dt;
        if (e._bossAtkTimer <= 0) {
          e._bossAtkTimer = 2500; // 2.5초 간격
          const angle = Math.atan2(-dy, -dx); // 플레이어 방향
          const projSpd = 4;
          // 보스 투사체 3발 부채꼴
          for (let i = -1; i <= 1; i++) {
            const a = angle + i * 0.25;
            this.projectiles.push({
              x: e.x, y: e.y,
              vx: Math.cos(a) * projSpd,
              vy: Math.sin(a) * projSpd,
              damage: Math.round((e.attack || e.atk || 15) * 0.8),
              source: 'enemy',
              radius: 6,
              emoji: e.isBoss ? '💥' : '🔴',
              pierce: 0, homing: false, target: null,
            });
          }
          // 발사 이펙트
          this.particles.push({
            x: e.x, y: e.y - (e.radius || 14),
            text: '💢', color: '#ff4444', type: 'text',
            life: 500, vy: -0.5, vx: 0,
          });
        }
      }

      // 일반 적도 근거리에서 원거리 공격 (5초 쿨타임, rare 이상) — passive 제외
      if (!e.isBoss && !e.passive && (e.rarity === 'rare' || e.rarity === 'magic' || e.rarity === 'epic' || e.rarity === 'legendary') && dist < 300 && dist > 80) {
        if (!e._rangedAtkTimer) e._rangedAtkTimer = 1000 + Math.random() * 3000;
        e._rangedAtkTimer -= dt;
        if (e._rangedAtkTimer <= 0) {
          e._rangedAtkTimer = 4000 + Math.random() * 2000;
          const angle = Math.atan2(-dy, -dx);
          this.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            damage: Math.round((e.attack || e.atk || 5) * 0.6),
            source: 'enemy',
            radius: 4,
            emoji: '🔴',
            pierce: 0, homing: false, target: null,
          });
        }
      }
    });
  }

  _updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(p => {
      // Homing
      if (p.homing && p.target && p.target.hp > 0) {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const homingStr = 0.08;
          const angle = Math.atan2(dy, dx);
          const curAngle = Math.atan2(p.vy, p.vx);
          const newAngle = curAngle + (angle - curAngle) * homingStr;
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(newAngle) * spd;
          p.vy = Math.sin(newAngle) * spd;
        }
      }

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      // Hit enemies
      if (p.source === 'player' || p.source === 'ally') {
        // 보스방 보스에게 투사체 히트
        if (this.bossRoomSystem.isInBossRoom() && this.bossRoomSystem.boss) {
          const boss = this.bossRoomSystem.boss;
          const bossRadius = (boss.size || 3) * 14;
          const dx = p.x - boss.x;
          const dy = p.y - boss.y;
          const rr = (p.radius || 5) + bossRadius;
          if (dx * dx + dy * dy < rr * rr && boss.alive) {
            const dmg = this.bossRoomSystem.damageBoss(p.damage);
            this._spawnHitParticles(boss.x, boss.y, '#ff6b6b');
            this.particles.push({
              x: boss.x, y: boss.y - bossRadius - 5,
              text: `-${Math.round(dmg)}`, color: '#fbbf24', type: 'text',
              life: 800, vy: -1, vx: (Math.random() - 0.5) * 0.5,
            });
            if (p.pierce > 0) { p.pierce--; } else { return false; }
          }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (this._circleHit(p, e)) {
            // HeroBattleAI 원소 상성 적용
            let elementMult = 1.0;
            if (typeof HeroBattleAI !== 'undefined' && typeof HeroAI !== 'undefined' && p.element) {
              const chart = HeroAI.ELEMENT_CHART[p.element];
              if (chart && e.element) {
                if (chart.strong.includes(e.element)) elementMult = 1.5;
                else if (chart.weak.includes(e.element)) elementMult = 0.7;
              }
            }
            const dmg = Math.max(1, (p.damage - e.defense * 0.3) * elementMult);
            e.hp -= dmg;
            this._spawnHitParticles(e.x, e.y, e.color);
            // 투사체 적중 효과음 (100ms 쓰로틀)
            const now = Date.now();
            if (typeof SoundSFX !== 'undefined' && SoundSFX.projectileHit && (!this._lastHitSfx || now - this._lastHitSfx > 100)) {
              SoundSFX.projectileHit();
              this._lastHitSfx = now;
            }
            // Damage number (원소 상성 색상: 효과적=초록, 저항=빨강, 일반=금색)
            const dmgColor = elementMult > 1 ? '#44ff88' : elementMult < 1 ? '#ff6666' : '#fbbf24';
            const dmgPrefix = elementMult > 1 ? '⚡' : elementMult < 1 ? '🛡️' : '';
            this.particles.push({
              x: e.x, y: e.y - e.radius - 5,
              text: `${dmgPrefix}-${Math.round(dmg)}`, color: dmgColor, type: 'text',
              life: 800, vy: -1, vx: (Math.random() - 0.5) * 0.5,
            });
            if (e.hp <= 0) {
              this._onEnemyDeath(e);
              this.enemies.splice(i, 1);
            }
            if (p.pierce > 0) { p.pierce--; continue; }
            return false;
          }
        }
      }
      // Enemy projectiles → player
      if (p.source === 'enemy') {
        if (this._circleHit(p, this.player)) {
          this._damagePlayer(p.damage);
          return false;
        }
      }
      // Out of map (범위를 넓혀서 먼 적에게도 미사일이 도달)
      return p.x > this.camera.x - 400 && p.x < this.camera.x + this.W + 400 &&
             p.y > this.camera.y - 400 && p.y < this.camera.y + this.H + 400;
    });
  }

  _updateAttackFx(dt) {
    this.activeAttackFx = this.activeAttackFx.filter(fx => {
      fx.progress += dt / fx.duration;
      // Hit at progress 0.5
      if (!fx.hit && fx.progress >= 0.5 && fx.targetEnemy && fx.targetEnemy.hp > 0) {
        fx.hit = true;
        const dmg = Math.max(1, fx.damage - fx.targetEnemy.defense * 0.3);
        fx.targetEnemy.hp -= dmg;
        this._spawnHitParticles(fx.targetEnemy.x, fx.targetEnemy.y, fx.targetEnemy.color);
        this.particles.push({
          x: fx.targetEnemy.x, y: fx.targetEnemy.y - 15,
          text: `-${Math.round(dmg)}`, color: '#c084fc', type: 'text',
          life: 800, vy: -1, vx: 0,
        });
        if (fx.targetEnemy.hp <= 0) {
          const idx = this.enemies.indexOf(fx.targetEnemy);
          if (idx !== -1) {
            this._onEnemyDeath(fx.targetEnemy);
            this.enemies.splice(idx, 1);
          }
        }
      }
      return fx.progress < 1;
    });
  }

  _updateDroppedItems() {
    this.droppedItems = this.droppedItems.filter(item => {
      // Check player pickup (touch distance)
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        // Apply upgrade
        const upg = UPGRADE_ITEMS.find(u => u.id === item.upgradeId);
        if (upg) {
          upg.apply(this.player, this);
          if (typeof SoundSFX !== 'undefined' && SoundSFX.upgradePickup) SoundSFX.upgradePickup();
          // Pickup effect
          this.particles.push({
            x: this.player.x, y: this.player.y - 30,
            text: upg.desc, color: upg.color, type: 'text',
            life: 1500, vy: -0.8, vx: 0,
          });
          for (let i = 0; i < 6; i++) {
            this.particles.push({
              x: item.x, y: item.y,
              vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
              life: 400, color: upg.color, size: 3, type: 'circle',
            });
          }
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
    const ended = this.rageSystem.update(dt);
    if (ended) {
      if (typeof SoundSFX !== 'undefined' && SoundSFX.rageEnd) SoundSFX.rageEnd();
    }
  }

  _updateCamera() {
    // 뱀서류: 플레이어를 화면 좌측 35%에 배치 → 전방 65% 시야 확보
    const targetX = this.player.x - this.W * 0.35;
    const targetY = this.player.y - this.H / 2;
    this.camera.x += (targetX - this.camera.x) * 0.08;
    this.camera.y += (targetY - this.camera.y) * 0.08;
    this.camera.x = Math.max(0, Math.min(this.map.mapW - this.W, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.map.mapH - this.H, this.camera.y));
  }

  /** 타이머 종료 → 보스 접근 급가속 */
  _onTimerEnd() {
    if (!this.running) return;
    // 보스 접근 시스템에 타이머 종료 알림 → 급가속
    this.bossApproach.onTimerEnd();
  }

  _checkVictory() {
    // 유일한 클리어 조건: 보스 처치 (또는 보스방 5분 자동 클리어)
    if (this.bossApproach.getPhase() === 'complete') {
      this.running = false;
      GameState.player.hp = this.player.hp;
      this.onVictory({
        enemiesKilled: this.totalKills,
        goldEarned: this.totalGold,
        hpRemaining: this.player.hp,
        wavesCleared: this.currentWave,
        bossDefeated: true,
      });
    }
  }

  // ══════════════════════════════════════
  //  COMBAT ACTIONS
  // ══════════════════════════════════════
  _damagePlayer(damage) {
    const dmg = Math.max(1, damage - this.player.defense * 0.5);
    this.player.hp -= dmg;
    if (this.player.hp < 0) this.player.hp = 0;
    GameState.player.hp = this.player.hp;
    this._spawnHitParticles(this.player.x, this.player.y, '#ff6b6b');

    // 피격 효과음
    if (typeof SoundSFX !== 'undefined' && SoundSFX.playerHit) SoundSFX.playerHit();

    // Rage charge on damage
    this._addRage(8);
    // Pet heal gauge charge
    this.petHealGauge = Math.min(100, this.petHealGauge + 10);

    if (this.player.hp <= 0) {
      this.running = false;
      if (typeof SoundSFX !== 'undefined' && SoundSFX.defeat) SoundSFX.defeat();
      this.onDeath();
    }
  }

  healPlayer(amount) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    GameState.player.hp = this.player.hp;
  }

  _onEnemyDeath(enemy) {
    // ⚡ HeroEngine: EXP + SpeedAI 제거
    this.heroEngine.onEnemyKill(enemy);
    this.totalKills++;
    GameState.stats.enemiesDefeated++;
    // 적 처치 효과음 (150ms 쓰로틀)
    const now = Date.now();
    if (typeof SoundSFX !== 'undefined' && SoundSFX.enemyDeath && (!this._lastDeathSfx || now - this._lastDeathSfx > 150)) {
      SoundSFX.enemyDeath();
      this._lastDeathSfx = now;
    }

    // Gold
    const gold = enemy.gold || 5;
    GameState.addGold(gold);
    this.totalGold += gold;

    // Gold text
    this.particles.push({
      x: enemy.x, y: enemy.y - 10,
      text: `+${gold}G`, color: '#fbbf24', type: 'text',
      life: 1000, vy: -1.2, vx: 0,
    });

    // Death particles (purification sparkles)
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5,
        life: 800, color: i % 2 === 0 ? '#86efac' : '#fbbf24', size: 3 + Math.random() * 2,
        type: 'circle',
      });
    }

    // Rage on kill
    this._addRage(12);
    this.petHealGauge = Math.min(100, this.petHealGauge + 4);

    // Drop upgrade item (15% chance, boss guaranteed)
    if (enemy.isBoss || Math.random() < 0.15) {
      const upg = UPGRADE_ITEMS[Math.floor(Math.random() * UPGRADE_ITEMS.length)];
      this.droppedItems.push({
        x: enemy.x, y: enemy.y,
        upgradeId: upg.id,
        emoji: upg.emoji,
        color: upg.color,
        life: 10000,
        bobPhase: 0,
      });
    }
  }

  _addRage(amount) {
    const shouldTrigger = this.rageSystem.add(amount);
    GameState.rageGauge = this.rageSystem.getGauge();

    if (shouldTrigger) {
      this._triggerRage();
    }
  }

  _triggerRage() {
    // 분노 폭발 효과음
    if (typeof SoundSFX !== 'undefined' && SoundSFX.rageActivation) SoundSFX.rageActivation();

    // 공중전 모드에서는 부스터 발동
    if (this.aerialSystem.isActive()) {
      this.rageSystem.trigger(); // 횟수 차감
      GameState.rageGauge = 0;
      this.aerialSystem.triggerBooster();
      this.particles.push({
        x: this.player.x, y: this.player.y - 40,
        text: '\uD83D\uDE80 \uBD80\uC2A4\uD130 \uC9C8\uC8FC!', color: '#87ceeb', type: 'text',
        life: 2000, vy: -0.5, vx: 0,
      });
      return;
    }

    // 분노 발동 (횟수 제한 체크 포함)
    if (!this.rageSystem.trigger()) return;
    GameState.rageGauge = 0;

    const remaining = this.rageSystem.getTriggersRemaining();
    const maxT = this.rageSystem.getMaxTriggers();

    // Screen flash
    this.particles.push({
      x: this.player.x, y: this.player.y - 40,
      text: `\uD83D\uDCA2 \uBD84\uB178 \uD3ED\uBC1C! (${maxT - remaining}/${maxT})`,
      color: '#ff6b6b', type: 'text',
      life: 2000, vy: -0.5, vx: 0,
    });

    // AoE damage to all nearby enemies
    this.enemies.forEach(e => {
      const dist = this._dist(this.player, e);
      if (dist < 200) {
        const dmg = this.player.attack * 3;
        e.hp -= dmg;
        this._spawnHitParticles(e.x, e.y, '#ff6b6b');
        this.particles.push({
          x: e.x, y: e.y - 15,
          text: `-${dmg}`, color: '#ff6b6b', type: 'text',
          life: 800, vy: -1, vx: 0,
        });
      }
    });
    // Remove dead
    this.enemies = this.enemies.filter(e => {
      if (e.hp <= 0) { this._onEnemyDeath(e); return false; }
      return true;
    });

    // Shockwave effect
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
        life: 600, color: '#ff6b6b', size: 4, type: 'circle',
      });
    }
  }

  _spawnHitParticles(x, y, color) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 300, color, size: 2 + Math.random() * 2, type: 'circle',
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

    // 보스방에서도 필드맵 렌더링 (전맵 배틀아레나)
    if (this.bossRoomSystem.isInBossRoom()) {
      // 배틀아레나 배경 (전맵 크기, 카메라 스크롤)
      this.bossRoomSystem.draw(ctx, this.camera);
      // 공중전 오버레이
      this.aerialSystem.draw(ctx);
    } else {
      // 일반 필드 맵 배경 (서바이벌 맵: 열 기반 최적화 렌더링)
      if (this.map.survivorMode) {
        renderSurvivorMap(ctx, this.map, this.camera);
      } else {
        renderMap(ctx, this.map, this.camera);
      }
    }

    // 보스방 진입 전환 연출
    if (this.bossRoomSystem.phase === BOSS_ROOM_PHASE.ENTERING) {
      this.bossRoomSystem.draw(ctx, this.camera);
    }

    // 🌫️ 자동전진 어둠 벽 (맵 위에 오버레이)
    this.autoScroll.draw(ctx, this.camera, this.W, this.H);

    // 🍄 보스 접근 붉은 안개 (우측에서 접근)
    this.bossApproach.draw(ctx, this.camera, this.W, this.H);

    // ⚡ HeroEngine 스킬 이펙트
    this.heroEngine.drawSkillFx(ctx, this.camera);

    // Dropped items (on ground)
    this.droppedItems.forEach(item => {
      item.bobPhase += 0.05;
      const sx = item.x - cx;
      const sy = item.y - cy + Math.sin(item.bobPhase) * 3;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Glow
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 8;
      ctx.fillText(item.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Enemies (draw behind player)
    this.enemies.forEach(e => this._drawSlime(ctx, e, cx, cy));

    // Spirit attack effects
    this.activeAttackFx.forEach(fx => {
      const origin = { x: fx.origin.x - cx, y: fx.origin.y - cy };
      const target = { x: fx.target.x - cx, y: fx.target.y - cy };
      renderAttack(ctx, fx.skill, origin, target, fx.progress);
    });

    // Projectiles (정령 미사일 포함 — 정령 수만큼 미사일이 날아감!)
    this.projectiles.forEach(p => {
      const sx = p.x - cx;
      const sy = p.y - cy;
      // 아군 미사일은 빛나는 이펙트
      if (p.source === 'ally') {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 6;
      }
      ctx.font = `${Math.round(p.radius * 3)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Spirits (정령들 — 아주 작은 크기)
    this.spirits.forEach(s => {
      const sx = s.x - cx;
      const sy = s.y - cy;
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Glow ring
      ctx.strokeStyle = (ATTR_GLOW[s.attribute] || 'rgba(255,255,255,0.3)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(s.emoji, sx, sy);
    });

    // Slot heroes (장착 영웅)
    this.slotHeroes.forEach(h => {
      const sx = h.x - cx;
      const sy = h.y - cy;
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 약한 글로우
      ctx.shadowColor = 'rgba(255,200,100,0.4)';
      ctx.shadowBlur = 6;
      ctx.fillText(h.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Pet
    if (this.pet) {
      const sx = this.pet.x - cx;
      const sy = this.pet.y - cy;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Green aura
      ctx.shadowColor = 'rgba(134,239,172,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(this.pet.emoji, sx, sy);
      ctx.shadowBlur = 0;
    }

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
      ctx.beginPath();
      ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 보스방 게이트 (일반 필드에서 표시)
    // 보스방 게이트 (일반 필드에서 표시)
    if (this.bossRoomSystem.phase === BOSS_ROOM_PHASE.GATE_ACTIVE) {
      this.bossRoomSystem.draw(ctx, this.camera);
    }

    // HUD (on top)
    this._drawHUD(ctx);

    // 보스 오버레이 (HUD 위에 렌더링 — 보스 HP바, 출현/승리 텍스트, 조우/아레나 형성)
    if (this.bossRoomSystem.isInBossRoom()) {
      this.bossRoomSystem.drawOverlays(ctx);
    }
    if (this.bossApproach.isInBossPhase() && this.bossApproach.bossRoomSystem) {
      this.bossApproach.bossRoomSystem.drawOverlays(ctx);
    }
    this.bossApproach.drawOverlays(ctx, this.camera, this.W, this.H);
  }

  // ── 보스방 내 엔티티 렌더링 ──
  _drawBossRoomEntities(ctx, cx, cy) {
    // Projectiles (보스방에서도 정령 미사일 빛남)
    this.projectiles.forEach(p => {
      const sx = p.x - cx;
      const sy = p.y - cy;
      if (p.source === 'ally') { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6; }
      ctx.font = `${Math.round(p.radius * 3)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Spirits
    this.spirits.forEach(s => {
      const sx = s.x - cx;
      const sy = s.y - cy;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = (ATTR_GLOW[s.attribute] || 'rgba(255,255,255,0.3)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(s.emoji, sx, sy);
    });

    // Slot heroes
    this.slotHeroes.forEach(h => {
      const sx = h.x - cx;
      const sy = h.y - cy;
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.emoji, sx, sy);
    });

    // Pet
    if (this.pet) {
      const sx = this.pet.x - cx;
      const sy = this.pet.y - cy;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(134,239,172,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(this.pet.emoji, sx, sy);
      ctx.shadowBlur = 0;
    }

    // Player
    this._drawPlayer(ctx, cx, cy);

    // Particles (텍스트 자막 비활성화 — 보스방 내부)
    this.particles.forEach(p => {
      if (p.type === 'text') return;
      const sx = p.x - cx;
      const sy = p.y - cy;
      const alpha = Math.max(0, p.life / 1200);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HUD
    this._drawHUD(ctx);
  }

  _drawSlime(ctx, e, cx, cy) {
    const sx = e.x - cx;
    const sy = e.y - cy - e.bounceY;
    const r = e.radius;

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx, e.y - cy + r * 0.3, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (round slime)
    ctx.fillStyle = e.color;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(sx - r * 0.25, sy - r * 0.3, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sx - r * 0.25, sy - r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.arc(sx + r * 0.25, sy - r * 0.15, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(sx - r * 0.2, sy - r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.arc(sx + r * 0.3, sy - r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy + r * 0.15, r * 0.15, 0, Math.PI);
    ctx.stroke();

    // Boss crown
    if (e.isBoss) {
      ctx.font = `${Math.round(r)}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText('👑', sx, sy - r - 5);
    }

    // HP bar
    if (e.hp < e.maxHp) {
      const barW = r * 2;
      const barH = 3;
      const hpRatio = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - barW / 2, sy - r - 8, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
      ctx.fillRect(sx - barW / 2, sy - r - 8, barW * hpRatio, barH);
    }

    ctx.restore();
  }

  _drawPlayer(ctx, cx, cy) {
    const p = this.player;
    const sx = p.x - cx;
    const sy = p.y - cy + Math.sin(p.bobPhase) * 3;

    // Rage glow
    if (this.rageSystem.isActive()) {
      ctx.shadowColor = 'rgba(255,50,50,0.6)';
      ctx.shadowBlur = 20;
    }

    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, sx, sy);
    ctx.shadowBlur = 0;
  }

  _drawHUD(ctx) {
    const pad = 10;
    const barW = 140;
    const barH = 12;

    // Background panel
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this._fillRoundRect(ctx, pad - 4, pad - 4, barW + 8, 70, 8);

    // Wave text
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`웨이브 ${this.currentWave}/${this.maxWaves}`, pad, pad + 10);

    // HP bar
    const hpY = pad + 20;
    const hpRatio = this.player.hp / this.player.maxHp;
    ctx.fillStyle = 'rgba(30,30,50,0.8)';
    ctx.fillRect(pad, hpY, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(pad, hpY, barW * hpRatio, barH);
    ctx.strokeStyle = 'rgba(80,80,120,0.5)';
    ctx.strokeRect(pad, hpY, barW, barH);
    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.player.hp)}/${this.player.maxHp}`, pad + barW / 2, hpY + 9);

    // Rage bar (red under HP)
    const rageY = hpY + barH + 4;
    ctx.fillStyle = 'rgba(30,30,50,0.8)';
    ctx.fillRect(pad, rageY, barW, 6);
    const rageIsActive = this.rageSystem.isActive();
    const rageExhausted = this.rageSystem.isExhausted();
    const rageColor = rageExhausted ? '#555' : rageIsActive ? '#ff3333' : '#ff6b6b';
    ctx.fillStyle = rageColor;
    ctx.fillRect(pad, rageY, barW * (this.rageSystem.getGauge() / 100), 6);
    // 상태 표시: RAGE! / 소진 / 남은 횟수
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    if (rageIsActive) {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('\uD83D\uDCA2 RAGE!', pad + barW + 4, rageY + 5);
    } else if (rageExhausted) {
      ctx.fillStyle = '#666';
      ctx.fillText('\uD83D\uDCA2 \uC18C\uC9C4', pad + barW + 4, rageY + 5);
    } else {
      ctx.fillStyle = '#ff6b6b';
      const rem = this.rageSystem.getTriggersRemaining();
      const max = this.rageSystem.getMaxTriggers();
      ctx.fillText(`\u26A1\u00D7${rem}/${max}`, pad + barW + 4, rageY + 5);
    }

    // Pet heal indicator
    if (this.pet) {
      const petY = rageY + 10;
      ctx.fillStyle = 'rgba(30,30,50,0.8)';
      ctx.fillRect(pad, petY, barW, 6);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(pad, petY, barW * (this.petHealGauge / 100), 6);
      ctx.fillStyle = '#86efac';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💚', pad - 1, petY + 6);
    }

    // ⏰ 타이머 (상단 중앙)
    this.stageTimer.drawHUD(ctx, this.W / 2 - 22, pad + 10);

    // Kill count (top right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`💀 ${this.totalKills}  💰 ${this.totalGold}G`, this.W - pad, pad + 12);

    // Spirit count (정령 미사일 표시)
    if (this.spirits.length > 0) {
      ctx.fillStyle = '#c084fc';
      ctx.font = '10px sans-serif';
      ctx.fillText(`✨ 정령 ${this.spirits.length}체 전투 중`, this.W - pad, pad + 26);
    }

    // Upgrade item count
    if (this.droppedItems.length > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px sans-serif';
      ctx.fillText(`🎁 ${this.droppedItems.length}개 아이템!`, this.W - pad, pad + 40);
    }
  }

  // ══════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════
  _fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }

  _findNearest(from, list) {
    let nearest = null, minDist = Infinity;
    for (const e of list) {
      const d = this._dist(from, e);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    return nearest;
  }

  _dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  _circleHit(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rr = (a.radius || 5) + (b.radius || 5);
    return dx * dx + dy * dy < rr * rr;
  }

  // ══════════════════════════════════════
  //  INPUT
  // ══════════════════════════════════════
  _bindInput() {
    this._onKeyDown = e => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this._keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Touch
    this._onTouchStart = e => {
      const t = e.touches[0];
      this._touchStart = { x: t.clientX, y: t.clientY };
    };
    this._onTouchMove = e => {
      if (!this._touchStart) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 10) {
        this._touchDir = { x: dx / mag, y: dy / mag };
      }
    };
    this._onTouchEnd = () => {
      this._touchStart = null;
      this._touchDir = { x: 0, y: 0 };
    };
    // Mouse drag
    this._mouseDown = false;
    this._onMouseDown = e => {
      this._mouseDown = true;
      this._touchStart = { x: e.clientX, y: e.clientY };
    };
    this._onMouseMove = e => {
      if (!this._mouseDown || !this._touchStart) return;
      const dx = e.clientX - this._touchStart.x;
      const dy = e.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 10) {
        this._touchDir = { x: dx / mag, y: dy / mag };
      }
    };
    this._onMouseUp = () => {
      this._mouseDown = false;
      this._touchStart = null;
      this._touchDir = { x: 0, y: 0 };
    };

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

// Attr glow colors for spirit ring
const ATTR_GLOW = {
  fire: 'rgba(255,69,0,0.5)', water: 'rgba(30,144,255,0.5)',
  earth: 'rgba(139,69,19,0.5)', wind: 'rgba(152,251,152,0.5)',
  light: 'rgba(255,215,0,0.5)', dark: 'rgba(106,13,173,0.5)',
  nature: 'rgba(34,139,34,0.5)', ice: 'rgba(0,206,209,0.5)',
};
