// Spirit Ally - follows player and auto-uses abilities in combat
import { Projectile } from './projectile.js';

export class SpiritAlly {
  constructor(x, y, spiritDef, engine) {
    this.x = x;
    this.y = y;
    this.name = spiritDef.name;
    this.emoji = spiritDef.emoji;
    this.stats = spiritDef.stats;
    this.ability = spiritDef.ability;
    this.level = spiritDef.level || 1;
    this.radius = 10;
    this.engine = engine;

    this._abilityCooldown = this.ability.cooldown * 0.5; // Start halfway charged
    this._bobPhase = Math.random() * Math.PI * 2;
    this._orbitAngle = Math.random() * Math.PI * 2;
  }

  update(dt, player, enemies, engine) {
    this._bobPhase += dt * 0.004;
    this._orbitAngle += dt * 0.001;

    // Orbit around player
    const orbitDist = 50;
    const targetX = player.x + Math.cos(this._orbitAngle) * orbitDist;
    const targetY = player.y + Math.sin(this._orbitAngle) * orbitDist;
    this.x += (targetX - this.x) * 0.05;
    this.y += (targetY - this.y) * 0.05;

    // Auto ability
    this._abilityCooldown -= dt;
    if (this._abilityCooldown <= 0 && enemies.length > 0) {
      this._useAbility(player, enemies, engine);
      this._abilityCooldown = this.ability.cooldown;
    }
  }

  _useAbility(player, enemies, engine) {
    const ab = this.ability;
    const levelMult = 1 + (this.level - 1) * 0.15;
    const value = Math.round(ab.value * levelMult);

    switch (ab.type) {
      case 'heal':
        engine.healPlayer(value);
        engine.addParticles(this._healParticles(player.x, player.y));
        break;

      case 'shield':
        engine.shieldPlayer(value);
        engine.addParticles(this._shieldParticles(player.x, player.y));
        break;

      case 'aoe': {
        const radius = ab.radius || 80;
        enemies.forEach(e => {
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          if (Math.sqrt(dx * dx + dy * dy) < radius) {
            e.hp -= value;
          }
        });
        engine.addParticles(this._aoeParticles(this.x, this.y, radius));
        break;
      }

      case 'beam': {
        const nearest = this._findNearest(enemies);
        if (nearest) {
          const angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
          engine.addProjectile(new Projectile(
            this.x, this.y,
            Math.cos(angle) * 6, Math.sin(angle) * 6,
            value, 'ally', this.emoji
          ));
        }
        break;
      }

      case 'single': {
        const target = this._findNearest(enemies);
        if (target) {
          target.hp -= value;
          engine.addParticles(this._hitParticles(target.x, target.y));
        }
        break;
      }

      case 'freeze': {
        const radius = ab.radius || 90;
        enemies.forEach(e => {
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          if (Math.sqrt(dx * dx + dy * dy) < radius) {
            e.hp -= value;
            e.speed *= 0.3; // slow
            setTimeout(() => { e.speed /= 0.3; }, 3000);
          }
        });
        engine.addParticles(this._aoeParticles(this.x, this.y, radius, '#67e8f9'));
        break;
      }
    }
  }

  _findNearest(enemies) {
    let nearest = null;
    let minDist = Infinity;
    enemies.forEach(e => {
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) { minDist = dist; nearest = e; }
    });
    return nearest;
  }

  _healParticles(x, y) {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        x, y: y + 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1 - Math.random() * 2,
        life: 500,
        color: '#86efac',
        size: 3 + Math.random() * 2
      });
    }
    return particles;
  }

  _shieldParticles(x, y) {
    const particles = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      particles.push({
        x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20,
        vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5,
        life: 600,
        color: '#67e8f9',
        size: 3
      });
    }
    return particles;
  }

  _aoeParticles(x, y, radius, color = '#fbbf24') {
    const particles = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      particles.push({
        x, y,
        vx: Math.cos(a) * (radius / 30),
        vy: Math.sin(a) * (radius / 30),
        life: 400,
        color,
        size: 3 + Math.random() * 3
      });
    }
    return particles;
  }

  _hitParticles(x, y) {
    const particles = [];
    for (let i = 0; i < 6; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 300,
        color: '#ff6b6b',
        size: 2 + Math.random() * 3
      });
    }
    return particles;
  }

  draw(ctx) {
    const bob = Math.sin(this._bobPhase) * 3;

    // Glow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(this.x, this.y + bob, this.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Emoji
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, this.x, this.y + bob);

    // Cooldown indicator
    const cdRatio = Math.max(0, this._abilityCooldown / this.ability.cooldown);
    if (cdRatio > 0) {
      ctx.strokeStyle = 'rgba(192,132,252,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bob, this.radius + 2, -Math.PI / 2, -Math.PI / 2 + (1 - cdRatio) * Math.PI * 2);
      ctx.stroke();
    }
  }
}
