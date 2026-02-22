// Isometric math helpers for Canvas rendering

// Convert 2D world coordinates to isometric screen coordinates
export function toIso(x, y) {
  return {
    x: (x - y) * 0.866,  // cos(30)
    y: (x + y) * 0.5     // sin(30)
  };
}

// Convert isometric screen coordinates back to 2D world
export function fromIso(sx, sy) {
  return {
    x: (sx / 0.866 + sy / 0.5) / 2,
    y: (sy / 0.5 - sx / 0.866) / 2
  };
}

// Draw an isometric tile (diamond shape) on canvas
export function drawIsoTile(ctx, x, y, size, color = 'rgba(50,50,80,0.3)', borderColor = 'rgba(80,80,120,0.2)') {
  const half = size / 2;
  const p = toIso(x, y);
  const px = p.x;
  const py = p.y;

  ctx.beginPath();
  ctx.moveTo(px, py - half * 0.5);
  ctx.lineTo(px + half * 0.866, py);
  ctx.lineTo(px, py + half * 0.5);
  ctx.lineTo(px - half * 0.866, py);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.stroke();
}
