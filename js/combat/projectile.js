// Projectile entity
export class Projectile {
  constructor(x, y, vx, vy, damage, source, emoji = '⚡') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.source = source; // 'player', 'ally', 'enemy'
    this.emoji = emoji;
  }

  update(dt) {
    this.x += this.vx * (dt / 16);
    this.y += this.vy * (dt / 16);
  }

  draw(ctx) {
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, this.x, this.y);
  }
}
