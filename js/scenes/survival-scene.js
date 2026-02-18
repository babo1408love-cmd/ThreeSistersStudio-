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
import { generateMap, renderMap } from '../generators/map-generator.js';

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

    // Map
    this.map = generateMap(this.biome.theme, 40, 8);
    this.camera = { x: 0, y: 0 };

    // Player
    const ps = GameState.player;
    this.player = {
      x: this.map.mapW / 2, y: this.map.mapH / 2,
      hp: ps.maxHp || 250, maxHp: ps.maxHp || 250,
      attack: ps.attack || 12, defense: ps.defense || 7,
      speed: 2.8, radius: 16,
      atkSpeed: 300, atkTimer: 0,
      projSize: 6, projSpeed: 8,
      shotCount: 1, pierce: 0, homing: false,
      emoji: GameState.heroAppearance?.emoji || '🧚',
      bobPhase: 0,
    };

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

    // Rage
    this.rageGauge = 0;
    this.rageActive = false;
    this.rageTimer = 0;

    // Input
    this._keys = {};
    this._touchDir = { x: 0, y: 0 };
    this._touchStart = null;
    this._mouseDown = false;

    this._bindInput();
  }

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this._spawnWave();
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
    this._updateWaveTimer(dt);
    this._updatePlayer(dt);
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

    this.enemies.push({
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
      allyDuration: isElite ? Infinity : 60000, // 엘리트=영구, 일반=60초
      bobPhase: Math.random() * Math.PI * 2,
      contactTimer: 0,
      stunSpinPhase: 0,
    });
  }

  // ── Player ──
  _updatePlayer(dt) {
    let mx = (this._keys['d'] || this._keys['arrowright'] ? 1 : 0) - (this._keys['a'] || this._keys['arrowleft'] ? 1 : 0) + this._touchDir.x;
    let my = (this._keys['s'] || this._keys['arrowdown'] ? 1 : 0) - (this._keys['w'] || this._keys['arrowup'] ? 1 : 0) + this._touchDir.y;
    const mag = Math.sqrt(mx * mx + my * my);
    if (mag > 1) { mx /= mag; my /= mag; }

    const spd = this.player.speed * (dt / 16);
    this.player.x += mx * spd;
    this.player.y += my * spd;
    this.player.x = Math.max(16, Math.min(this.map.mapW - 16, this.player.x));
    this.player.y = Math.max(16, Math.min(this.map.mapH - 16, this.player.y));
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
    const dmgMult = this.rageActive ? 2.0 : 1.0;

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
      });
    }
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

      // AI: 플레이어 추격
      e.bobPhase += dt * 0.003;
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const spd = e.speed * (dt / 16);
        e.x += (dx / dist) * spd;
        e.y += (dy / dist) * spd;
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
            const dmg = Math.max(1, p.damage - e.defense * 0.3);
            e.hp -= dmg;
            this._spawnHitParticles(e.x, e.y, e.color);
            this.particles.push({
              x: e.x, y: e.y - e.radius - 5,
              text: `-${Math.round(dmg)}`, color: '#fbbf24', type: 'text',
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
    this.rageGauge = Math.min(100, this.rageGauge + 8);

    // 정화 체크
    const purifyChance = Math.max(5, this.basePurifyChance - this.currentWave * 0.5 + this.purifyBonusChance);
    if (Math.random() * 100 < purifyChance) {
      // 정화 성공! 적을 죽이지 않고 빙빙 도는 상태로 전환
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
    if (this.rageActive) {
      this.rageTimer -= dt;
      if (this.rageTimer <= 0) this.rageActive = false;
    }
    if (!this.rageActive && this.rageGauge >= 100) {
      this.rageActive = true;
      this.rageGauge = 0;
      this.rageTimer = 5000;
      this.particles.push({
        x: this.player.x, y: this.player.y - 40,
        text: '💢 분노 폭발!', color: '#ff6b6b', type: 'text',
        life: 2000, vy: -0.5, vx: 0,
      });
    }
  }

  _updateCamera() {
    const targetX = this.player.x - this.W / 2;
    const targetY = this.player.y - this.H / 2;
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
    this.rageGauge = Math.min(100, this.rageGauge + 12);

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

  // ══════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════
  _draw() {
    const ctx = this.ctx;
    const cx = this.camera.x;
    const cy = this.camera.y;

    // Map
    renderMap(ctx, this.map, this.camera);

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

    // Player
    this._drawPlayer(ctx, cx, cy);

    // Particles
    this.particles.forEach(p => {
      const sx = p.x - cx;
      const sy = p.y - cy;
      const alpha = Math.max(0, p.life / 1200);
      ctx.globalAlpha = alpha;
      if (p.type === 'text') {
        ctx.font = 'bold 13px "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center'; ctx.fillStyle = p.color;
        ctx.fillText(p.text, sx, sy);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;

    // HUD
    this._drawHUD(ctx);
  }

  _drawPlayer(ctx, cx, cy) {
    const p = this.player;
    const sx = p.x - cx;
    const sy = p.y - cy + Math.sin(p.bobPhase) * 3;
    if (this.rageActive) { ctx.shadowColor = 'rgba(255,50,50,0.6)'; ctx.shadowBlur = 20; }
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
    ctx.fillStyle = this.rageActive ? '#ff3333' : '#ff6b6b';
    ctx.fillRect(pad, rageY, barW * (this.rageGauge / 100), 6);

    // Stats
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`💀${this.totalKills}  💰${this.totalGold}G  💚${this.purifiedAllies.length}아군`, pad, rageY + 18);

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
