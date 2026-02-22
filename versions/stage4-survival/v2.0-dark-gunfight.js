/**
 * gunfight-scene.js — 요정들의 총싸움
 *
 * 뱀서류 탑다운 슈터:
 *   - 플레이어 화면 정중앙 (보통 뱀서 시점)
 *   - WASD/방향키/터치 전방향 이동
 *   - 자동 공격 + 정령/슬롯영웅 동시 전투
 *   - 무한 웨이브, 업그레이드 드롭
 *   - 3분 타이머 → 보스전
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import SceneManager from '../core/scene-manager.js';
import SaveManager from '../core/save-manager.js';
import { generateSurvivorMap, renderSurvivorMap } from '../generators/map-generator.js';
import { generateDrop } from '../generators/enemy-drop-generator.js';
import StageTimer from '../systems/stage-timer.js';
import AutoScroll from '../systems/auto-scroll.js';
import AutoWalk from '../systems/auto-walk.js';
import BossApproachSystem from '../systems/boss-approach.js';
import RageSystem from '../systems/rage-system.js';
import HeroEngine from '../systems/hero-engine.js';
import UnitFactory from '../data/unit-factory.js';
import { ENEMY_SPEED_CONFIG, calcEnemySpeed } from '../data/combat-config.js';
import { getWavePhase, applySpawnMult, DROP_CHANCE_PER_MOB } from '../data/wave-scaling-config.js';
import CombatAIBalance from '../systems/combat-ai-balance.js';

// ── 업그레이드 아이템 10종 ──
const UPGRADES = [
  { id:'fast_atk',   emoji:'🔴', name:'빠른공격',   desc:'공격속도+20%',   apply:(p)=>{p.atkSpeed*=0.8;} },
  { id:'strong_atk', emoji:'🟠', name:'강한공격',   desc:'데미지+15%',     apply:(p)=>{p.attack=Math.round(p.attack*1.15);} },
  { id:'long_range', emoji:'🟡', name:'먼공격',     desc:'사거리+30%',     apply:(p)=>{p.projSpeed*=1.3;} },
  { id:'multi_shot', emoji:'🟢', name:'연속발사',   desc:'발사체+1',       apply:(p)=>{p.shotCount=Math.min((p.shotCount||1)+1,5);} },
  { id:'pierce',     emoji:'🔵', name:'관통',       desc:'2마리 관통',     apply:(p)=>{p.pierce=(p.pierce||0)+2;} },
  { id:'homing',     emoji:'🟣', name:'호밍',       desc:'적 추적',        apply:(p)=>{p.homing=true;} },
  { id:'hp_heal',    emoji:'⚪', name:'HP회복',     desc:'즉시 30% 회복',  apply:(p,eng)=>{eng.healPlayer(Math.round(p.maxHp*0.3));} },
  { id:'def_up',     emoji:'🟤', name:'방어강화',   desc:'DEF+5',          apply:(p)=>{p.defense+=5;} },
  { id:'proj_size',  emoji:'💜', name:'탄환확대',   desc:'탄환 크기+50%',  apply:(p)=>{p.projSize=Math.min(p.projSize*1.5, p.radius*5);} },
  { id:'speed_up',   emoji:'💚', name:'이동강화',   desc:'이속+15%',       apply:(p)=>{p.speed*=1.15;} },
];

// ── 적 종류 ──
const ENEMY_POOL = [
  { id:'slime_pink',   emoji:'🩷', stats:{hp:40,atk:5,def:0,spd:8},   rarity:'common', element:'light' },
  { id:'slime_blue',   emoji:'💙', stats:{hp:50,atk:6,def:2,spd:7},   rarity:'common', element:'water' },
  { id:'slime_green',  emoji:'💚', stats:{hp:45,atk:5,def:1,spd:9},   rarity:'common', element:'nature' },
  { id:'slime_purple', emoji:'💜', stats:{hp:55,atk:8,def:3,spd:6},   rarity:'rare',   element:'dark' },
  { id:'slime_gold',   emoji:'💛', stats:{hp:35,atk:4,def:0,spd:12},  rarity:'rare',   element:'thunder' },
  { id:'mush_red',     emoji:'🍄', stats:{hp:60,atk:10,def:4,spd:5},  rarity:'rare',   element:'fire' },
  { id:'mush_ice',     emoji:'🧊', stats:{hp:65,atk:9,def:5,spd:4},   rarity:'epic',   element:'ice' },
  { id:'bat_dark',     emoji:'🦇', stats:{hp:30,atk:7,def:1,spd:14},  rarity:'common', element:'dark' },
];

const BOSS_DEF = {
  id:'boss_mushroom', emoji:'👿', stats:{hp:500,atk:25,def:12,spd:4}, rarity:'legendary', element:'dark'
};

// ═══════════════════════════════════════
//  GunfightEngine — 전투 엔진
// ═══════════════════════════════════════
class GunfightEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;
    this.onGameOver = options.onGameOver || (() => {});
    this.stageLevel = options.stageLevel || GameState.currentStage || 1;

    // 맵 생성
    this.map = generateSurvivorMap({
      themeId: options.theme || 'fairy_garden',
      stageLevel: this.stageLevel,
      scrollSpeed: 0.5,
      scrollAccel: 0.00006,
    });

    // 플레이어
    const ps = GameState.player;
    this.player = {
      x: 120, y: this.map.mapH / 2,
      hp: ps.maxHp || 250, maxHp: ps.maxHp || 250,
      attack: ps.attack || 12, defense: ps.defense || 7,
      speed: ps.speed || 3, radius: UnitFactory.HERO_BASE_RADIUS,
      atkSpeed: 300, atkTimer: 0,
      projSize: UnitFactory._unitRadius('projSize'),
      projSpeed: 8, shotCount: 1, pierce: 0, homing: false,
      emoji: GameState.heroAppearance?.emoji || '🧚',
      bobPhase: 0, element: 'light',
    };

    // 카메라: 첫 프레임부터 플레이어 중앙
    this.camera = {
      x: Math.max(0, this.player.x - this.W * 0.5),
      y: Math.max(0, this.player.y - this.H * 0.5),
    };

    // 슬롯 영웅
    this.slotHeroes = GameState.heroSlots.filter(h => h != null).slice(0, 5)
      .map((h, i) => UnitFactory.createAlly(h, { combatRole: 'slotHero', index: i, playerPos: this.player }));

    // 정령
    this.spirits = GameState.spirits.map((s, i) =>
      UnitFactory.createSpirit({ ...s, combatMode: true, orbitIndex: i }));

    // 엔티티
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.droppedItems = [];

    // 웨이브
    this.running = false;
    this.currentWave = 0;
    this.waveTimer = 0;
    this.waveInterval = 25000;
    this._elapsed = 0;
    this._lastTime = 0;
    this._animFrame = null;

    // 통계
    this.totalKills = 0;
    this.totalGold = 0;

    // 분노
    this.rageSystem = new RageSystem({
      maxTriggers: RageSystem.resolveMaxTriggers(GameState),
    });

    // 실시간 AI 공격력 밸런스
    this.aiBalance = new CombatAIBalance(this.player);

    // 입력
    this._keys = {};
    this._touchDir = { x: 0, y: 0 };
    this._touchStart = null;
    this._mouseDown = false;

    // 타이머 (3분)
    this.stageTimer = new StageTimer({
      duration: 180000,
      onTimeUp: () => this._onTimerEnd(),
    });

    // 자동 전진
    this.autoScroll = new AutoScroll({
      speed: 0.5, direction: 'horizontal', startBoundary: 0,
      warningZone: 100, damagePerSec: 20, pushForce: 1.8, accel: 0.00006,
    });

    // 보스 접근
    this.bossApproach = new BossApproachSystem(this, {
      mapWidth: this.map.mapW, mapHeight: this.map.mapH,
      stageLevel: this.stageLevel, autoScroll: this.autoScroll,
    });

    // 자동 걷기
    this.autoWalk = new AutoWalk({ mapWidth: this.map.mapW, stageLevel: this.stageLevel });

    // HeroEngine
    this.heroEngine = new HeroEngine(this.player, {
      mapWidth: this.map.mapW, mapHeight: this.map.mapH, stageLevel: this.stageLevel,
    });
    this.heroEngine.onLevelUp = (result) => {
      this.particles.push({
        x: this.player.x, y: this.player.y - 40,
        text: `⬆️ Lv.${this.heroEngine.getLevel()}!`, color: '#fbbf24', type: 'text',
        life: 2500, vy: -0.6, vx: 0,
      });
    };

    this._bindInput();
  }

  // ── 시작/종료 ──
  start() {
    this.running = true;
    this._lastTime = performance.now();
    this._spawnWave();
    this.stageTimer.start();
    this.autoScroll.start();
    this.autoWalk.start();
    setTimeout(() => { if (this.running) this.bossApproach.start(); }, 5000);
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this.stageTimer.stop();
    this.autoScroll.stop();
    this.autoWalk.stop();
    this.bossApproach.stop();
    this.heroEngine.destroy();
    this._unbindInput();
  }

  // ── 메인 루프 ──
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

  // ═════════════════════════
  //  UPDATE
  // ═════════════════════════
  _update(dt) {
    this.stageTimer.update(dt);
    this.bossApproach.update(dt);

    if (!this.bossApproach.isBlocking()) {
      this.heroEngine.update(dt, this.enemies);
    }

    if (this.bossApproach.isInBossPhase()) {
      this._updatePlayer(dt);
      this._updateAutoAttack(dt);
      this._updateEnemies(dt);
      this._updateProjectiles(dt);
      this._updateDroppedItems();
      this._updateParticles(dt);
      this._updateRage(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    if (this.bossApproach.isBlocking()) {
      this._updateParticles(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    const scrollResult = this.autoScroll.update(dt, this.player);
    if (scrollResult.damage > 0) this._damagePlayer(scrollResult.damage);
    if (scrollResult.pushX) this.player.x += scrollResult.pushX;

    this._updateWaveTimer(dt);
    this._updatePlayer(dt);
    this._updateSlotHeroes(dt);
    this._updateSpirits(dt);
    this._updateAutoAttack(dt);
    this._updateEnemies(dt);
    this._updateProjectiles(dt);
    this._updateDroppedItems();
    this._updateParticles(dt);
    this._updateRage(dt);
    this._updateCamera();
  }

  // ── 웨이브 ──
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
    const stageHpMult = Math.pow(1.2, this.stageLevel - 1);
    const baseCount = Math.min(15, 3 + this.currentWave);

    // 시간 기반 웨이브 스케일링
    const phase = getWavePhase(this._elapsed / 1000);
    const count = Math.max(1, Math.round(baseCount * phase.spawnMult));

    for (let i = 0; i < count; i++) {
      const def = ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)];
      this._spawnEnemy(def, waveScale, stageHpMult, false);
    }

    // 5웨이브마다 엘리트
    if (this.currentWave % 5 === 0) {
      const rareDefs = ENEMY_POOL.filter(m => m.rarity !== 'common');
      const def = rareDefs[Math.floor(Math.random() * rareDefs.length)] || ENEMY_POOL[0];
      this._spawnEnemy(def, waveScale * 2.5, stageHpMult, true);
    }

    // 10웨이브마다 보스
    if (this.currentWave % 10 === 0) {
      this._spawnEnemy(BOSS_DEF, waveScale * 3, stageHpMult, true);
    }

    EventBus.emit('gunfight:wave', { wave: this.currentWave });
  }

  _spawnEnemy(def, scale, stageHpMult, isElite) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 300 + Math.random() * 200;
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    const hp = Math.round((def.stats.hp || 50) * scale * 0.6 * stageHpMult);
    const enemy = {
      x, y, hp, maxHp: hp,
      attack: Math.round((def.stats.atk || 5) * scale),
      defense: def.stats.def || 0,
      speed: (def.stats.spd || 10) / 10,
      radius: isElite ? UnitFactory._unitRadius('enemy', 1.5) : UnitFactory._unitRadius('enemy'),
      emoji: def.emoji,
      color: isElite ? '#9D00FF' : '#FF8800',
      element: def.element || 'dark',
      isElite, isBoss: def.id === 'boss_mushroom',
      bobPhase: Math.random() * Math.PI * 2,
      contactTimer: 0,
      scale: isElite ? 1.5 : 1,
    };

    // 5% 확률 엘리트 추가
    if (!isElite && Math.random() < 0.05) {
      enemy.hp *= 3; enemy.maxHp *= 3;
      enemy.scale = 1.5;
      enemy.radius *= 1.5;
      enemy.isElite = true;
      enemy.color = '#FF3333';
    }

    this.heroEngine.registerMob(enemy, x, y);
    this.enemies.push(enemy);
  }

  // ── 플레이어 (전방향 이동) ──
  _updatePlayer(dt) {
    if (this.bossApproach.isBlocking() || this.bossApproach.isInBossPhase()) {
      this.autoWalk.pause();
    } else {
      this.autoWalk.resume();
    }
    this.autoWalk.update(dt, this.player);

    let mx = (this._keys['d'] || this._keys['arrowright'] ? 1 : 0)
           - (this._keys['a'] || this._keys['arrowleft'] ? 1 : 0) + this._touchDir.x;
    let my = (this._keys['s'] || this._keys['arrowdown'] ? 1 : 0)
           - (this._keys['w'] || this._keys['arrowup'] ? 1 : 0) + this._touchDir.y;

    if (mx !== 0 && my !== 0) {
      const len = Math.sqrt(mx * mx + my * my);
      mx /= len; my /= len;
    }

    const spd = this.player.speed * (dt / 16);
    this.player.x += mx * spd;
    this.player.y += my * spd;

    const minX = Math.max(this.player.radius, this.autoScroll.getBoundary() + 10);
    const maxX = this.bossApproach.getPhase() !== 'dormant'
      ? Math.min(this.map.mapW - this.player.radius, this.bossApproach.getBoundary() - 20)
      : this.map.mapW - this.player.radius;
    this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.map.mapH - this.player.radius, this.player.y));
    this.player.bobPhase += dt * 0.004;
  }

  // ── 자동 공격 ──
  _updateAutoAttack(dt) {
    // HeroEngine 스킬
    const pendingSkill = this.heroEngine.getPendingSkill();
    if (pendingSkill && this.enemies.length > 0) {
      let nearest = null, minD = Infinity;
      for (const e of this.enemies) {
        const d = this._dist(this.player, e);
        if (d < minD) { minD = d; nearest = e; }
      }
      if (nearest && minD < 500) {
        const result = this.heroEngine.fireSkill(nearest);
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
    if (this.player.atkTimer > 0) return;
    this.player.atkTimer = this.player.atkSpeed;

    if (this.enemies.length === 0) return;
    let nearest = null, minDist = Infinity;
    for (const e of this.enemies) {
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
        homing: !!this.player.homingProjectile, target: this.player.homingProjectile ? nearest : null,
        element: this.player.element,
      });
    }
  }

  // ── 슬롯 영웅 ──
  _updateSlotHeroes(dt) {
    const V = [{ dx:-25,dy:-35 },{ dx:-25,dy:35 },{ dx:-45,dy:-18 },{ dx:-45,dy:18 },{ dx:-60,dy:0 }];
    this.slotHeroes.forEach((h, i) => {
      const pos = V[i] || V[V.length - 1];
      h.x += (this.player.x + pos.dx - h.x) * 0.08;
      h.y += (this.player.y + pos.dy - h.y) * 0.08;
      h.atkTimer -= dt;
      if (h.atkTimer <= 0 && this.enemies.length > 0) {
        let nearest = null, nd = Infinity;
        for (const e of this.enemies) {
          const d = this._dist(h, e);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest && nd < 500) {
          const angle = Math.atan2(nearest.y - h.y, nearest.x - h.x);
          this.projectiles.push({
            x: h.x, y: h.y, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
            damage: h.attack, source: 'ally', radius: 4, emoji: '⚡',
            pierce: 0, homing: false, target: null, element: h.attribute || null,
          });
          h.atkTimer = h.atkSpeed;
        }
      }
    });
  }

  // ── 정령 ──
  _updateSpirits(dt) {
    const PROJ = { fire:'🔥', water:'💧', lightning:'⚡', dark:'🌑', light:'✨', nature:'🌿', ice:'❄️', wind:'💨' };
    this.spirits.forEach(s => {
      s.orbitAngle += dt * 0.0015;
      const r = 40 + (this.spirits.length > 6 ? 15 : 0);
      s.x = this.player.x + Math.cos(s.orbitAngle) * r;
      s.y = this.player.y + Math.sin(s.orbitAngle) * r;
      s.atkTimer -= dt;
      if (s.atkTimer <= 0 && this.enemies.length > 0) {
        let nearest = null, nd = Infinity;
        for (const e of this.enemies) {
          const d = this._dist(s, e);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest && nd < 600) {
          const dmg = 5 + (s.rarity || 1) * 3 + (s.level || 1);
          const angle = Math.atan2(nearest.y - s.y, nearest.x - s.x);
          this.projectiles.push({
            x: s.x, y: s.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
            damage: dmg, source: 'ally', radius: 3,
            emoji: PROJ[s.attribute] || '✨',
            pierce: 0, homing: false, target: null, element: s.attribute || null,
          });
          s.atkTimer = s.atkCooldown || 800;
        }
      }
    });
  }

  // ── 적 ──
  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.bobPhase += dt * 0.003;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > ENEMY_SPEED_CONFIG.warpDistance) {
        const angle = Math.atan2(dy, dx) + Math.PI;
        const wd = ENEMY_SPEED_CONFIG.warpMinDist + Math.random() * (ENEMY_SPEED_CONFIG.warpMaxDist - ENEMY_SPEED_CONFIG.warpMinDist);
        e.x = this.player.x + Math.cos(angle) * wd;
        e.y = this.player.y + Math.sin(angle) * wd;
      } else if (dist > (e.radius || 14) + this.player.radius) {
        const spd = calcEnemySpeed(dist, this.player.speed, e.isBoss) * (dt / 16);
        e.x += (dx / dist) * spd;
        e.y += (dy / dist) * spd;
      }

      e.contactTimer -= dt;
      if (dist < e.radius + this.player.radius && e.contactTimer <= 0) {
        this._damagePlayer(e.attack);
        e.contactTimer = 1000;
      }
    }
  }

  // ── 발사체 ──
  _updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(p => {
      if (p.homing && p.target && p.target.hp > 0) {
        const dx = p.target.x - p.x, dy = p.target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const a = Math.atan2(dy, dx);
          const ca = Math.atan2(p.vy, p.vx);
          const na = ca + (a - ca) * 0.08;
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          p.vx = Math.cos(na) * spd;
          p.vy = Math.sin(na) * spd;
        }
      }

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      if (p.source === 'player' || p.source === 'ally') {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (this._circleHit(p, e)) {
            const dmg = Math.max(1, p.damage - e.defense * 0.3);
            e.hp -= dmg;
            this._spawnHitParticles(e.x, e.y, e.color);
            this.particles.push({
              x: e.x, y: e.y - e.radius - 5,
              text: `-${Math.round(dmg)}`, color: '#fbbf24', type: 'text',
              life: 800, vy: -1, vx: (Math.random() - 0.5) * 0.5,
            });
            if (e.hp <= 0) this._onEnemyDeath(e, i);
            if (p.pierce > 0) { p.pierce--; continue; }
            return false;
          }
        }
      }

      return p.x > this.camera.x - 200 && p.x < this.camera.x + this.W + 200 &&
             p.y > this.camera.y - 200 && p.y < this.camera.y + this.H + 200;
    });
  }

  // ── 적 사망 ──
  _onEnemyDeath(enemy, index) {
    this.heroEngine.onEnemyKill(enemy);
    this.totalKills++;
    const gold = Math.round((5 + Math.random() * 10));
    this.totalGold += gold;
    GameState.addGold(gold);

    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5,
        life: 600, color: '#86efac', size: 3, type: 'circle',
      });
    }
    this._addRage(8);
    this.enemies.splice(index, 1);

    // 장비/소비 아이템 드롭 (generateDrop)
    try {
      const drops = generateDrop(enemy.baseDef || enemy, enemy.wave || 1);
      for (const drop of drops) {
        if (drop.type === 'gold') continue;
        this.droppedItems.push({
          x: enemy.x + (Math.random() - 0.5) * 20,
          y: enemy.y + (Math.random() - 0.5) * 20,
          dropType: drop.type, dropData: drop.item || drop,
          emoji: drop.item?.emoji || '📦',
          color: drop.type === 'equipment' ? '#60a5fa' : '#4ade80',
          life: 15000, bobPhase: Math.random() * Math.PI * 2,
        });
      }
    } catch(e) { /* 무시 */ }

    // 업그레이드 아이템 드롭
    if (Math.random() < DROP_CHANCE_PER_MOB || enemy.isBoss) {
      const upg = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
      this.droppedItems.push({
        x: enemy.x, y: enemy.y, upgradeId: upg.id,
        emoji: upg.emoji, color: '#fbbf24', bobPhase: 0, life: 10000,
      });
    }
  }

  // ── 드롭 아이템 ──
  _updateDroppedItems() {
    const MAGNET_RADIUS = 400;
    const MAGNET_SPEED = 8.0;
    const AUTO_COLLECT_DELAY = 2000;

    this.droppedItems = this.droppedItems.filter(item => {
      if (item._age === undefined) item._age = 0;
      item._age += 16;
      const mdx = item.x - this.player.x;
      const mdy = item.y - this.player.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const attracting = mDist < MAGNET_RADIUS || item._age > AUTO_COLLECT_DELAY;
      if (attracting && mDist > 5) {
        const speed = item._age > AUTO_COLLECT_DELAY ? Math.max(MAGNET_SPEED, mDist * 0.15) : MAGNET_SPEED;
        item.x -= (mdx / mDist) * speed;
        item.y -= (mdy / mDist) * speed;
      }

      const dx = item.x - this.player.x, dy = item.y - this.player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        if (item.dropType === 'equipment' && item.dropData) {
          GameState.addItem({ ...item.dropData });
          this.particles.push({
            x: this.player.x, y: this.player.y - 30,
            text: `${item.dropData.emoji} ${item.dropData.name}`, color: '#60a5fa', type: 'text',
            life: 2000, vy: -0.8, vx: 0,
          });
          return false;
        }
        if (item.dropType === 'consumable' && item.dropData) {
          const eff = item.dropData.effect;
          if (eff && eff.type === 'heal') this.player.hp = Math.min(this.player.maxHp, this.player.hp + eff.val);
          this.particles.push({
            x: this.player.x, y: this.player.y - 30,
            text: `${item.dropData.emoji} ${item.dropData.name}`, color: '#4ade80', type: 'text',
            life: 2000, vy: -0.8, vx: 0,
          });
          return false;
        }
        const upg = UPGRADES.find(u => u.id === item.upgradeId);
        if (upg) {
          upg.apply(this.player, this);
          this.particles.push({
            x: this.player.x, y: this.player.y - 30,
            text: upg.desc, color: '#fbbf24', type: 'text', life: 1500, vy: -0.8, vx: 0,
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

  _updateRage(dt) { this.rageSystem.update(dt); }

  _addRage(amount) {
    const shouldTrigger = this.rageSystem.add(amount);
    if (shouldTrigger && this.rageSystem.trigger()) {
      this.particles.push({
        x: this.player.x, y: this.player.y - 40,
        text: '💢 분노 폭발!', color: '#ff6b6b', type: 'text', life: 2000, vy: -0.5, vx: 0,
      });
    }
  }

  _updateCamera() {
    const targetX = this.player.x - this.W * 0.5;
    const targetY = this.player.y - this.H * 0.5;
    this.camera.x += (targetX - this.camera.x) * 0.08;
    this.camera.y += (targetY - this.camera.y) * 0.08;
    this.camera.x = Math.max(0, Math.min(this.map.mapW - this.W, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.map.mapH - this.H, this.camera.y));
  }

  _damagePlayer(damage) {
    this.aiBalance.recordHit();
    this.aiBalance.setRageActive(this.rageSystem?.isActive() || false);
    const aiMult = this.aiBalance.getDamageMult();
    const adjusted = Math.round(damage * aiMult);
    const dmg = Math.max(1, adjusted - this.player.defense * 0.5);
    this.player.hp -= dmg;
    if (this.player.hp < 0) this.player.hp = 0;
    this._spawnHitParticles(this.player.x, this.player.y, '#ff6b6b');
    this._addRage(12);
    if (this.player.hp <= 0) {
      this.running = false;
      this.onGameOver({ wave: this.currentWave, kills: this.totalKills, gold: this.totalGold });
    }
  }

  healPlayer(amount) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
  }

  _onTimerEnd() {
    if (!this.running) return;
    this.bossApproach.onTimerEnd();
  }

  _checkVictory() {
    if (this.bossApproach.getPhase() === 'complete') {
      this.running = false;
      this.onGameOver({ wave: this.currentWave, kills: this.totalKills, gold: this.totalGold, bossDefeated: true });
    }
  }

  // ═════════════════════════
  //  DRAW
  // ═════════════════════════
  _draw() {
    const ctx = this.ctx;
    const cx = this.camera.x, cy = this.camera.y;

    // 맵
    if (this.map.survivorMode) {
      renderSurvivorMap(ctx, this.map, this.camera);
    }

    // 안개/보스
    this.autoScroll.draw(ctx, this.camera, this.W, this.H);
    this.bossApproach.draw(ctx, this.camera, this.W, this.H);

    // HeroEngine 스킬 이펙트
    this.heroEngine.drawSkillFx(ctx, this.camera);

    // 드롭 아이템
    this.droppedItems.forEach(item => {
      item.bobPhase += 0.05;
      ctx.font = '18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = item.color; ctx.shadowBlur = 8;
      ctx.fillText(item.emoji, item.x - cx, item.y - cy + Math.sin(item.bobPhase) * 3);
      ctx.shadowBlur = 0;
    });

    // 적
    this.enemies.forEach(e => {
      const sx = e.x - cx, sy = e.y - cy + Math.sin(e.bobPhase) * 2;
      ctx.font = `${e.radius * 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (e.isElite || e.isBoss) { ctx.shadowColor = e.color; ctx.shadowBlur = 12; }
      ctx.fillText(e.emoji, sx, sy);
      ctx.shadowBlur = 0;
      if (e.hp < e.maxHp) {
        const bw = e.radius * 2, ratio = e.hp / e.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw, 3);
        ctx.fillStyle = ratio > 0.5 ? '#86efac' : '#ff6b6b';
        ctx.fillRect(sx - bw / 2, sy - e.radius - 8, bw * ratio, 3);
      }
    });

    // 슬롯 영웅
    this.slotHeroes.forEach(h => {
      ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(h.emoji, h.x - cx, h.y - cy);
    });

    // 정령
    this.spirits.forEach(s => {
      ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji, s.x - cx, s.y - cy);
    });

    // 발사체
    this.projectiles.forEach(p => {
      ctx.font = `${Math.max(8, p.radius * 2)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, p.x - cx, p.y - cy);
    });

    // 플레이어
    const floatY = Math.sin(this.player.bobPhase) * 4;
    const px = this.player.x - cx, py = this.player.y - cy + floatY;

    // 글로우
    const grad = ctx.createRadialGradient(px, py, 2, px, py, this.player.radius + 8);
    grad.addColorStop(0, 'rgba(245,194,231,0.25)');
    grad.addColorStop(1, 'rgba(245,194,231,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(px, py, this.player.radius + 8, 0, Math.PI * 2); ctx.fill();

    // 분노 이펙트
    if (this.rageSystem.isActive()) {
      ctx.strokeStyle = 'rgba(255,100,100,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, this.player.radius + 12, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.player.emoji, px, py);

    // HP 바
    const barW = 30, barH = 4, hpR = this.player.hp / this.player.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(px - barW / 2, py - this.player.radius - 14, barW, barH);
    ctx.fillStyle = hpR > 0.5 ? '#86efac' : hpR > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(px - barW / 2, py - this.player.radius - 14, barW * hpR, barH);

    // 파티클
    this.particles.forEach(p => {
      if (p.type === 'text') {
        const alpha = Math.min(1, p.life / 300);
        ctx.globalAlpha = alpha;
        ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x - cx, p.y - cy);
        ctx.globalAlpha = 1;
      } else {
        const alpha = Math.min(1, p.life / 200);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x - cx, p.y - cy, p.size || 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    // HUD
    this.stageTimer.drawHUD(ctx, this.W - 80, 10);

    // 분노 게이지 바
    const rg = this.rageSystem;
    if (rg.gauge > 0 || rg.isActive()) {
      const rgW = 80, rgH = 6, rgX = 10, rgY = 10;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(rgX, rgY, rgW, rgH);
      ctx.fillStyle = rg.isActive() ? '#ff4444' : '#ff8844';
      ctx.fillRect(rgX, rgY, rgW * (rg.gauge / 100), rgH);
      ctx.font = '9px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(`💢 ${Math.round(rg.gauge)}%`, rgX, rgY + rgH + 10);
    }

    // 킬 카운트
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#f0e6d2'; ctx.textAlign = 'left';
    ctx.fillText(`💀 ${this.totalKills}  💰 ${this.totalGold}  🌊 W${this.currentWave}`, 10, this.H - 12);
  }

  // ═════════════════════════
  //  HELPERS
  // ═════════════════════════
  _dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
  _circleHit(a, b) {
    if (!a || !b) return false;
    const dx = a.x - b.x, dy = a.y - b.y;
    const rr = (a.radius || 5) + (b.radius || 5);
    return dx * dx + dy * dy < rr * rr;
  }
  _spawnHitParticles(x, y, color) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({ x, y, vx:(Math.random()-0.5)*2, vy:(Math.random()-0.5)*2, life:300, color, size:2+Math.random()*2, type:'circle' });
    }
  }

  // ── INPUT ──
  _bindInput() {
    this._onKeyDown = e => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this._keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._onTouchStart = e => { this._touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    this._onTouchMove = e => {
      if (!this._touchStart) return; e.preventDefault();
      const t = e.touches[0], dx = t.clientX - this._touchStart.x, dy = t.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx*dx+dy*dy);
      if (mag > 10) this._touchDir = { x: dx/mag, y: dy/mag };
    };
    this._onTouchEnd = () => { this._touchStart = null; this._touchDir = { x:0, y:0 }; };
    this._onMouseDown = e => { this._mouseDown = true; this._touchStart = { x: e.clientX, y: e.clientY }; };
    this._onMouseMove = e => {
      if (!this._mouseDown || !this._touchStart) return;
      const dx = e.clientX - this._touchStart.x, dy = e.clientY - this._touchStart.y;
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

// ═══════════════════════════════════════
//  GunfightScene — SceneManager 래퍼
// ═══════════════════════════════════════
export default class GunfightScene {
  onCreate(params) {
    this._engine = null;
  }

  render() {
    this.el.innerHTML = '';
    this.el.className = 'scene gunfight-scene';

    const canvas = document.createElement('canvas');
    canvas.className = 'combat-canvas';
    canvas.width = APP_W;
    canvas.height = APP_H - 40;
    this.el.appendChild(canvas);

    const bar = document.createElement('div');
    bar.className = 'combat-control-bar';
    bar.innerHTML = `
      <div class="combat-ctrl-info"><span>🔫 요정들의 총싸움</span></div>
      <button class="btn btn-secondary btn-sm" id="gf-quit">포기</button>
    `;
    this.el.appendChild(bar);
    bar.querySelector('#gf-quit').onclick = () => {
      if (confirm('총싸움을 포기하시겠습니까?')) this._onEnd();
    };

    this._engine = new GunfightEngine(canvas, {
      onGameOver: (result) => this._onEnd(result),
    });
    this._engine.start();
  }

  _onEnd(result) {
    if (this._engine) { this._engine.stop(); this._engine = null; }
    const wave = result?.wave || 0;
    const kills = result?.kills || 0;
    const gold = result?.gold || 0;

    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-overlay__title">🔫 요정들의 총싸움 ${result?.bossDefeated ? '승리!' : '종료'}</div>
      <div class="victory-stats" style="margin:10px 0;">
        <span>🌊 웨이브: ${wave}</span>
        <span>💀 처치: ${kills}</span>
        <span>💰 골드: ${gold}</span>
      </div>
      <button class="btn btn-primary btn-lg" id="gf-return">메인으로 돌아가기</button>
    `;
    this.el.appendChild(overlay);
    overlay.querySelector('#gf-return').onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  onEnter() {}
  onLeave() {
    if (this._engine) { this._engine.stop(); this._engine = null; }
  }
}
