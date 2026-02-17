// Enemy entity definitions — Infected fairies/spirits by 버섯돌이 대마왕's spores
// Defeated enemies don't die — they are "purified" and return to the Summoning Tree (소환의 나무)

export const ENEMY_TYPES = {
  spore_fairy: {
    name: '포자 요정', emoji: '🍄', color: '#a8e6a0',
    hp: 30, attack: 5, speed: 1, radius: 12, goldDrop: 5,
    behavior: 'chase'
  },
  thorn_sprite: {
    name: '가시 정령', emoji: '🌿', color: '#86efac',
    hp: 20, attack: 7, speed: 2.5, radius: 10, goldDrop: 7,
    behavior: 'chase'
  },
  moss_golem: {
    name: '이끼 골렘', emoji: '🪨', color: '#8b9a6b',
    hp: 50, attack: 10, speed: 1.5, radius: 13, goldDrop: 12,
    behavior: 'chase'
  },
  fungal_beast: {
    name: '균사 짐승', emoji: '🐛', color: '#c084fc',
    hp: 40, attack: 12, speed: 2.8, radius: 13, goldDrop: 10,
    behavior: 'chase'
  },
  spore_caster: {
    name: '포자 마법사', emoji: '🔮', color: '#9b8aff',
    hp: 35, attack: 15, speed: 1, radius: 12, goldDrop: 15,
    behavior: 'ranged'
  },
  bark_knight: {
    name: '나무껍질 기사', emoji: '🪵', color: '#d4a574',
    hp: 80, attack: 14, speed: 1.2, radius: 14, goldDrop: 18,
    behavior: 'chase'
  },
  boss_infected_elder: {
    name: '감염된 숲의 장로', emoji: '👹', color: '#86efac',
    hp: 200, attack: 18, speed: 1.2, radius: 22, goldDrop: 100,
    behavior: 'boss', projectileEmoji: '💜'
  },
  boss_lake_corruption: {
    name: '오염된 호수 정령', emoji: '🐙', color: '#c084fc',
    hp: 250, attack: 22, speed: 0.8, radius: 22, goldDrop: 150,
    behavior: 'boss', projectileEmoji: '💧'
  },
  boss_mushroom_king: {
    name: '버섯돌이 대마왕', emoji: '🍄', color: '#ff6b6b',
    hp: 500, attack: 30, speed: 1, radius: 28, goldDrop: 300,
    behavior: 'boss', projectileEmoji: '🍄'
  }
};

export class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.name = type.name;
    this.emoji = type.emoji;
    this.color = type.color;
    this.hp = type.hp;
    this.maxHp = type.hp;
    this.attack = type.attack;
    this.speed = type.speed;
    this.radius = type.radius;
    this.goldDrop = type.goldDrop;
    this.behavior = type.behavior;
    this.projectileEmoji = type.projectileEmoji || '💜';
    this.contactTimer = 0;
    this._rangedTimer = 0;
    this._bobPhase = Math.random() * Math.PI * 2;
    this._infectPulse = Math.random() * Math.PI * 2;
  }

  update(dt, player, engine) {
    this._bobPhase += dt * 0.004;
    this._infectPulse += dt * 0.003;
    if (this.contactTimer > 0) this.contactTimer -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (this.behavior === 'chase' || this.behavior === 'boss') {
      // Move toward player
      if (dist > this.radius + player.radius) {
        this.x += (dx / dist) * this.speed * (dt / 16);
        this.y += (dy / dist) * this.speed * (dt / 16);
      }

      // Boss special: fire spore projectiles periodically
      if (this.behavior === 'boss') {
        this._rangedTimer -= dt;
        if (this._rangedTimer <= 0) {
          this._rangedTimer = 2000;
          const angle = Math.atan2(dy, dx);
          const emoji = this.projectileEmoji;
          for (let i = -1; i <= 1; i++) {
            const a = angle + i * 0.3;
            engine.addProjectile({
              x: this.x, y: this.y,
              vx: Math.cos(a) * 3, vy: Math.sin(a) * 3,
              damage: this.attack * 0.5,
              source: 'enemy',
              emoji,
              update(dt) { this.x += this.vx * (dt / 16); this.y += this.vy * (dt / 16); },
              draw(ctx) {
                ctx.font = '14px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.emoji, this.x, this.y);
              }
            });
          }
        }
      }
    } else if (this.behavior === 'ranged') {
      // Keep distance, shoot spores
      const preferredDist = 150;
      if (dist < preferredDist - 20) {
        this.x -= (dx / dist) * this.speed * (dt / 16);
        this.y -= (dy / dist) * this.speed * (dt / 16);
      } else if (dist > preferredDist + 20) {
        this.x += (dx / dist) * this.speed * (dt / 16);
        this.y += (dy / dist) * this.speed * (dt / 16);
      }

      this._rangedTimer -= dt;
      if (this._rangedTimer <= 0 && dist < 300) {
        this._rangedTimer = 2500;
        const angle = Math.atan2(dy, dx);
        const emoji = this.projectileEmoji;
        engine.addProjectile({
          x: this.x, y: this.y,
          vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5,
          damage: this.attack,
          source: 'enemy',
          emoji,
          update(dt) { this.x += this.vx * (dt / 16); this.y += this.vy * (dt / 16); },
          draw(ctx) {
            ctx.font = '12px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.emoji, this.x, this.y);
          }
        });
      }
    }
  }

  draw(ctx) {
    const bob = Math.sin(this._bobPhase) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius + 2, this.radius * 0.7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Infection aura — pulsing purple/green glow
    const infectAlpha = 0.1 + Math.sin(this._infectPulse) * 0.06;
    const infectR = this.radius + 5 + Math.sin(this._infectPulse * 0.8) * 3;
    const grad = ctx.createRadialGradient(
      this.x, this.y + bob, 2,
      this.x, this.y + bob, infectR
    );
    grad.addColorStop(0, `rgba(138, 43, 226, ${infectAlpha + 0.05})`);
    grad.addColorStop(0.5, `rgba(75, 0, 130, ${infectAlpha})`);
    grad.addColorStop(1, 'rgba(75, 0, 130, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y + bob, infectR, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.font = (this.radius > 20 ? '32' : '20') + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, this.x, this.y + bob);

    // HP bar
    const barW = this.radius * 2;
    const barH = 3;
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8 + bob, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 8 + bob, barW * hpRatio, barH);
  }
}
