// Player entity for combat — Hero is a fairy (🧚) that floats/flies
export class Player {
  constructor(x, y, stats) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = stats.speed || 3;
    this.hp = stats.hp || 100;
    this.maxHp = stats.maxHp || 100;
    this.attack = stats.attack || 10;
    this.defense = stats.defense || 5;
    this.shield = 0;
    this.attackTimer = 0;
    this._bobPhase = 0;
    this._swayPhase = 0;
    this._glowPhase = 0;
  }

  update(dt, moveX, moveY, worldW, worldH) {
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
    }

    this.x += moveX * this.speed * (dt / 16);
    this.y += moveY * this.speed * (dt / 16);

    // Clamp to bounds
    this.x = Math.max(this.radius, Math.min(worldW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldH - this.radius, this.y));

    this._bobPhase += dt * 0.004;
    this._swayPhase += dt * 0.003;
    this._glowPhase += dt * 0.006;
  }

  draw(ctx) {
    // Fairy floating: more pronounced than walking bob
    const floatY = Math.sin(this._bobPhase) * 5 + Math.sin(this._bobPhase * 1.7) * 2;
    const swayX = Math.sin(this._swayPhase) * 1.5;

    // Ground shadow (smaller when floating higher)
    const shadowScale = 1 - (floatY + 7) / 20; // floatY range ~ -7 to +7
    ctx.fillStyle = 'rgba(245, 194, 231, 0.2)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius + 3, this.radius * 0.7 * Math.max(0.3, shadowScale), 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fairy glow aura
    const glowAlpha = 0.15 + Math.sin(this._glowPhase) * 0.08;
    const glowR = this.radius + 8 + Math.sin(this._glowPhase * 0.7) * 3;
    const grad = ctx.createRadialGradient(
      this.x + swayX, this.y + floatY, 2,
      this.x + swayX, this.y + floatY, glowR
    );
    grad.addColorStop(0, `rgba(245, 194, 231, ${glowAlpha + 0.1})`);
    grad.addColorStop(1, 'rgba(245, 194, 231, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x + swayX, this.y + floatY, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Shield glow
    if (this.shield > 0) {
      ctx.strokeStyle = 'rgba(103,232,249,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x + swayX, this.y + floatY, this.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body — fairy emoji
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧚', this.x + swayX, this.y + floatY);

    // HP bar above
    const barW = 30;
    const barH = 4;
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 14 + floatY, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(this.x - barW / 2, this.y - this.radius - 14 + floatY, barW * hpRatio, barH);
  }
}
