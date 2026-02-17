// Combat Engine - Canvas-based requestAnimationFrame loop
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { Player } from './player.js';
import { Enemy, ENEMY_TYPES } from './enemy.js';
import { SpiritAlly } from './spirit-ally.js';
import { Projectile } from './projectile.js';
import { checkCollision, checkCircleCollision } from './collision.js';

export default class CombatEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.waves = options.waves || [];
    this.bossWave = options.bossWave || null;
    this.onVictory = options.onVictory || (() => {});
    this.onDeath = options.onDeath || (() => {});

    // Entities
    this.player = null;
    this.enemies = [];
    this.allies = [];
    this.projectiles = [];
    this.particles = [];

    // State
    this.running = false;
    this.paused = false;
    this.currentWaveIndex = 0;
    this.waveTimer = 0;
    this.totalEnemiesSpawned = 0;
    this.totalEnemiesKilled = 0;
    this._animFrame = null;
    this._lastTime = 0;
    this._keys = {};
    this._touchDir = { x: 0, y: 0 };
    this._elapsed = 0; // total elapsed ms

    // Input
    this._bindInput();
  }

  start() {
    // Create player
    const ps = GameState.player;
    this.player = new Player(this.width / 2, this.height / 2, ps);

    // Create spirit allies
    GameState.spirits.forEach((spirit, i) => {
      const angle = (i / Math.max(GameState.spirits.length, 1)) * Math.PI * 2;
      const ax = this.player.x + Math.cos(angle) * 60;
      const ay = this.player.y + Math.sin(angle) * 60;
      this.allies.push(new SpiritAlly(ax, ay, spirit, this));
    });

    this.running = true;
    this._lastTime = performance.now();
    this._elapsed = 0;
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
    const dt = Math.min(now - this._lastTime, 50); // cap delta
    this._lastTime = now;

    if (!this.paused) {
      this._elapsed += dt;
      this._update(dt);
    }
    this._draw();

    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    // Spawn waves
    this._updateWaves();

    // Update player
    const moveX = (this._keys['d'] || this._keys['arrowright'] ? 1 : 0) - (this._keys['a'] || this._keys['arrowleft'] ? 1 : 0) + this._touchDir.x;
    const moveY = (this._keys['s'] || this._keys['arrowdown'] ? 1 : 0) - (this._keys['w'] || this._keys['arrowup'] ? 1 : 0) + this._touchDir.y;
    this.player.update(dt, moveX, moveY, this.width, this.height);

    // Auto-attack: player fires at nearest enemy
    this.player.attackTimer -= dt;
    if (this.player.attackTimer <= 0 && this.enemies.length > 0) {
      const nearest = this._findNearest(this.player, this.enemies);
      if (nearest) {
        const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
        this.projectiles.push(new Projectile(
          this.player.x, this.player.y,
          Math.cos(angle) * 5, Math.sin(angle) * 5,
          GameState.player.attack, 'player', '⚡'
        ));
        this.player.attackTimer = 500; // ms between attacks
      }
    }

    // Update enemies
    this.enemies.forEach(e => e.update(dt, this.player, this));

    // Update allies
    this.allies.forEach(a => a.update(dt, this.player, this.enemies, this));

    // Update projectiles
    this.projectiles.forEach(p => p.update(dt));

    // Collision: player projectiles → enemies
    this.projectiles = this.projectiles.filter(p => {
      if (p.source === 'player' || p.source === 'ally') {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (checkCircleCollision(p.x, p.y, 6, e.x, e.y, e.radius)) {
            e.hp -= p.damage;
            this._spawnHitParticle(e.x, e.y);
            if (e.hp <= 0) {
              this._onEnemyDeath(e);
              this.enemies.splice(i, 1);
            }
            return false;
          }
        }
      }
      // Enemy projectiles → player
      if (p.source === 'enemy') {
        if (checkCircleCollision(p.x, p.y, 6, this.player.x, this.player.y, this.player.radius)) {
          this._damagePlayer(p.damage);
          return false;
        }
      }
      // Out of bounds
      return p.x > -20 && p.x < this.width + 20 && p.y > -20 && p.y < this.height + 20;
    });

    // Collision: enemies touching player
    this.enemies.forEach(e => {
      if (checkCircleCollision(e.x, e.y, e.radius, this.player.x, this.player.y, this.player.radius)) {
        if (e.contactTimer <= 0) {
          this._damagePlayer(e.attack);
          e.contactTimer = 1000;
        }
      }
    });

    // Update particles
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      return p.life > 0;
    });

    // Check victory
    if (this._allWavesSpawned() && this.enemies.length === 0) {
      this.running = false;
      this.onVictory({
        enemiesKilled: this.totalEnemiesKilled,
        hpRemaining: this.player.hp
      });
    }
  }

  _updateWaves() {
    const allWaves = [...this.waves];
    if (this.bossWave) allWaves.push(this.bossWave);

    for (let i = this.currentWaveIndex; i < allWaves.length; i++) {
      const wave = allWaves[i];
      if (this._elapsed >= wave.delay && !wave._spawned) {
        wave._spawned = true;
        this.currentWaveIndex = i + 1;
        wave.enemies.forEach(group => {
          for (let j = 0; j < group.count; j++) {
            const type = ENEMY_TYPES[group.type] || ENEMY_TYPES.slime;
            // Spawn at random edge
            const side = Math.floor(Math.random() * 4);
            let sx, sy;
            if (side === 0) { sx = Math.random() * this.width; sy = -20; }
            else if (side === 1) { sx = this.width + 20; sy = Math.random() * this.height; }
            else if (side === 2) { sx = Math.random() * this.width; sy = this.height + 20; }
            else { sx = -20; sy = Math.random() * this.height; }

            this.enemies.push(new Enemy(sx, sy, type));
            this.totalEnemiesSpawned++;
          }
        });
      }
    }
  }

  _allWavesSpawned() {
    const allWaves = [...this.waves];
    if (this.bossWave) allWaves.push(this.bossWave);
    return allWaves.every(w => w._spawned);
  }

  _damagePlayer(damage) {
    const def = GameState.player.defense;
    const reduced = Math.max(1, damage - def * 0.5);
    this.player.hp -= reduced;
    GameState.player.hp = Math.max(0, this.player.hp);
    this._spawnHitParticle(this.player.x, this.player.y, '#ff6b6b');
    EventBus.emit('player:damaged', { hp: this.player.hp, maxHp: this.player.maxHp });

    if (this.player.hp <= 0) {
      this.running = false;
      this.onDeath();
    }
  }

  _onEnemyDeath(enemy) {
    this.totalEnemiesKilled++;
    GameState.stats.enemiesDefeated++;
    // Small gold reward
    GameState.addGold(enemy.goldDrop || 5);
    // Purification particles — green/gold sparkles (spirit returns to Summoning Tree)
    const purifyColors = ['#86efac', '#fbbf24', '#c084fc', '#86efac'];
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1, // float upward (returning to tree)
        life: 600,
        color: purifyColors[i % purifyColors.length],
        size: 3 + Math.random() * 3
      });
    }
  }

  _spawnHitParticle(x, y, color = '#fbbf24') {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 300,
        color,
        size: 2 + Math.random() * 2
      });
    }
  }

  _findNearest(from, list) {
    let nearest = null;
    let minDist = Infinity;
    list.forEach(e => {
      const dx = e.x - from.x;
      const dy = e.y - from.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    });
    return nearest;
  }

  // Add projectile from ally
  addProjectile(proj) {
    this.projectiles.push(proj);
  }

  // Add particles (for ally abilities)
  addParticles(arr) {
    this.particles.push(...arr);
  }

  // Heal player (from ally ability)
  healPlayer(amount) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    GameState.player.hp = this.player.hp;
    EventBus.emit('player:healed', { hp: this.player.hp });
  }

  // Shield player
  shieldPlayer(amount) {
    this.player.shield = (this.player.shield || 0) + amount;
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Background
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(50,50,80,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Draw enemies
    this.enemies.forEach(e => e.draw(ctx));

    // Draw projectiles
    this.projectiles.forEach(p => p.draw(ctx));

    // Draw allies
    this.allies.forEach(a => a.draw(ctx));

    // Draw player
    this.player.draw(ctx);

    // Draw particles
    this.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / 400);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw wave indicator
    ctx.fillStyle = '#fbbf24';
    ctx.font = '14px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    const waveText = `웨이브 ${Math.min(this.currentWaveIndex, this.waves.length + (this.bossWave ? 1 : 0))}/${this.waves.length + (this.bossWave ? 1 : 0)}`;
    ctx.fillText(waveText, 10, 20);

    // HP bar on canvas (backup)
    const hpRatio = this.player.hp / this.player.maxHp;
    ctx.fillStyle = 'rgba(30,30,50,0.8)';
    ctx.fillRect(10, 30, 120, 10);
    ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(10, 30, 120 * hpRatio, 10);
    ctx.strokeStyle = 'rgba(80,80,120,0.5)';
    ctx.strokeRect(10, 30, 120, 10);

    // Shield bar
    if (this.player.shield > 0) {
      ctx.fillStyle = 'rgba(103,232,249,0.6)';
      const shieldW = Math.min(120, (this.player.shield / 50) * 120);
      ctx.fillRect(10, 42, shieldW, 5);
    }
  }

  // Input handling
  _bindInput() {
    this._onKeyDown = (e) => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = (e) => { this._keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _unbindInput() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  setTouchDirection(x, y) {
    this._touchDir = { x, y };
  }
}
