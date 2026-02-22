// Sprite rendering helper (emoji-based)

export function drawEmoji(ctx, emoji, x, y, size = 24) {
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

export function drawShadow(ctx, x, y, radiusX = 12, radiusY = 4) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHealthBar(ctx, x, y, width, hp, maxHp) {
  const barH = 3;
  const ratio = hp / maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - width / 2, y, width, barH);
  ctx.fillStyle = ratio > 0.5 ? '#86efac' : ratio > 0.25 ? '#fbbf24' : '#ff6b6b';
  ctx.fillRect(x - width / 2, y, width * ratio, barH);
}
