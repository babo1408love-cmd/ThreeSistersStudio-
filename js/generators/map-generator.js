/**
 * map-generator.js — 맵 자동 생성기
 * 6테마, 바닥노이즈, 사물배치(겹침방지), 시냇물, 앰비언트파티클, 길, 스폰포인트
 */

// ── 6테마 ──
export const THEMES = {
  forest: {
    name:'숲', bgColor:'#1a2e1a', floorColors:['#2d4a2d','#3a5e3a','#345434'],
    objects:[
      {emoji:'🌳',freq:0.08,solid:true,w:40,h:50},{emoji:'🌲',freq:0.06,solid:true,w:30,h:45},
      {emoji:'🌿',freq:0.1,solid:false,w:20,h:15},{emoji:'🍄',freq:0.04,solid:false,w:15,h:15},
      {emoji:'🪨',freq:0.03,solid:true,w:25,h:20},{emoji:'🌸',freq:0.05,solid:false,w:15,h:15},
    ],
    water:{color:'#1E90FF44',flowDir:1,width:40},
    particles:{type:'firefly',color:'#86efac',count:20,speed:0.3,size:3},
  },
  crystal_cave: {
    name:'수정 동굴', bgColor:'#0d0d2b', floorColors:['#1a1a3a','#22224a','#181840'],
    objects:[
      {emoji:'💎',freq:0.06,solid:true,w:25,h:30},{emoji:'🔮',freq:0.04,solid:true,w:20,h:25},
      {emoji:'🪨',freq:0.08,solid:true,w:30,h:25},{emoji:'✨',freq:0.05,solid:false,w:10,h:10},
    ],
    water:null,
    particles:{type:'sparkle',color:'#c084fc',count:15,speed:0.2,size:2},
  },
  snow_field: {
    name:'설원', bgColor:'#c8d8e8', floorColors:['#e8f0f8','#d8e8f0','#f0f4f8'],
    objects:[
      {emoji:'🌲',freq:0.05,solid:true,w:30,h:45},{emoji:'⛄',freq:0.02,solid:true,w:25,h:30},
      {emoji:'🪨',freq:0.03,solid:true,w:25,h:20},{emoji:'❄️',freq:0.04,solid:false,w:12,h:12},
    ],
    water:{color:'#87CEEB44',flowDir:1,width:35},
    particles:{type:'snow',color:'#fff',count:30,speed:0.5,size:3},
  },
  lava_land: {
    name:'용암 지대', bgColor:'#1a0a0a', floorColors:['#2a1010','#331515','#3a1a0a'],
    objects:[
      {emoji:'🪨',freq:0.08,solid:true,w:30,h:25},{emoji:'🌋',freq:0.02,solid:true,w:40,h:45},
      {emoji:'🔥',freq:0.06,solid:false,w:15,h:20},{emoji:'💀',freq:0.02,solid:false,w:15,h:15},
    ],
    water:{color:'#FF450066',flowDir:1,width:30},
    particles:{type:'ember',color:'#FF4500',count:15,speed:0.6,size:2},
  },
  fairy_garden: {
    name:'요정 정원', bgColor:'#0f1a0f', floorColors:['#1e3a1e','#2a4e2a','#1a3520'],
    objects:[
      {emoji:'🌳',freq:0.04,solid:true,w:40,h:50},{emoji:'🌸',freq:0.08,solid:false,w:18,h:18},
      {emoji:'🌷',freq:0.06,solid:false,w:15,h:20},{emoji:'🍀',freq:0.05,solid:false,w:12,h:12},
      {emoji:'🪷',freq:0.03,solid:false,w:20,h:15},{emoji:'🦋',freq:0.03,solid:false,w:12,h:12},
    ],
    water:{color:'#87CEEB55',flowDir:1,width:45},
    particles:{type:'butterfly',color:'#f5c2e7',count:12,speed:0.4,size:4},
  },
  cloud_realm: {
    name:'구름 왕국', bgColor:'#1a1a3a', floorColors:['#2a2a5a','#333370','#282858'],
    objects:[
      {emoji:'☁️',freq:0.1,solid:false,w:50,h:30},{emoji:'⭐',freq:0.04,solid:false,w:15,h:15},
      {emoji:'🌙',freq:0.02,solid:false,w:25,h:25},{emoji:'🌈',freq:0.01,solid:false,w:60,h:30},
    ],
    water:null,
    particles:{type:'aurora',color:'#67e8f9',count:8,speed:0.15,size:5},
  },
};

// ── 간단한 노이즈 ──
function _noise(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// ── 맵 생성 ──
export function generateMap(themeId, width = 50, height = 10, seed = Date.now()) {
  const theme = THEMES[themeId] || THEMES.fairy_garden;
  const tileSize = 40;
  const mapW = width * tileSize;
  const mapH = height * tileSize;

  // Floor tiles (noise-based color variation)
  const floor = [];
  for (let y = 0; y < height; y++) {
    floor[y] = [];
    for (let x = 0; x < width; x++) {
      const n = _noise(x, y, seed);
      const ci = Math.floor(n * theme.floorColors.length) % theme.floorColors.length;
      floor[y][x] = { color: theme.floorColors[ci], variant: n };
    }
  }

  // Objects (with collision avoidance)
  const objects = [];
  const occupied = new Set();
  for (const objDef of theme.objects) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        if (occupied.has(key)) continue;
        const n = _noise(x * 3.7, y * 5.3, seed + objDef.emoji.charCodeAt(0));
        if (n < objDef.freq) {
          objects.push({
            emoji: objDef.emoji,
            x: x * tileSize + tileSize / 2,
            y: y * tileSize + tileSize / 2,
            w: objDef.w, h: objDef.h,
            solid: objDef.solid,
          });
          if (objDef.solid) {
            occupied.add(key);
            occupied.add(`${x+1},${y}`);
            occupied.add(`${x},${y+1}`);
          }
        }
      }
    }
  }

  // Stream / water
  let stream = null;
  if (theme.water) {
    const sy = Math.floor(height * 0.5) * tileSize;
    stream = {
      color: theme.water.color,
      y: sy,
      width: theme.water.width,
      points: [],
    };
    for (let x = 0; x < width; x++) {
      const wobble = Math.sin(x * 0.5 + seed * 0.01) * tileSize * 0.5;
      stream.points.push({ x: x * tileSize, y: sy + wobble });
    }
  }

  // Ambient particles
  const ambientParticles = [];
  if (theme.particles) {
    for (let i = 0; i < theme.particles.count; i++) {
      ambientParticles.push({
        x: Math.random() * mapW,
        y: Math.random() * mapH,
        vx: (Math.random() - 0.5) * theme.particles.speed,
        vy: theme.particles.type === 'snow' ? theme.particles.speed :
            theme.particles.type === 'ember' ? -theme.particles.speed * 0.5 :
            (Math.random() - 0.5) * theme.particles.speed,
        size: theme.particles.size * (0.5 + Math.random()),
        color: theme.particles.color,
        type: theme.particles.type,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Spawn points
  const spawnPoints = {
    player: { x: tileSize * 3, y: mapH / 2 },
    enemies: [
      { x: mapW * 0.4, y: mapH * 0.3 },
      { x: mapW * 0.6, y: mapH * 0.7 },
      { x: mapW * 0.75, y: mapH * 0.5 },
      { x: mapW * 0.9, y: mapH * 0.3 },
      { x: mapW * 0.9, y: mapH * 0.7 },
    ],
    items: [
      { x: mapW * 0.3, y: mapH * 0.5 },
      { x: mapW * 0.5, y: mapH * 0.2 },
      { x: mapW * 0.7, y: mapH * 0.8 },
    ],
  };

  return {
    themeId, theme, width, height, tileSize,
    mapW, mapH, floor, objects, stream, ambientParticles, spawnPoints, seed,
  };
}

// ── Canvas 맵 렌더링 ──
export function renderMap(ctx, map, camera) {
  const { theme, floor, objects, stream, ambientParticles, tileSize, mapW, mapH } = map;
  const cx = camera.x || 0;
  const cy = camera.y || 0;
  const vw = ctx.canvas.width;
  const vh = ctx.canvas.height;

  // Background
  ctx.fillStyle = theme.bgColor;
  ctx.fillRect(0, 0, vw, vh);

  // Floor tiles (only visible ones)
  const startCol = Math.max(0, Math.floor(cx / tileSize));
  const endCol = Math.min(map.width, Math.ceil((cx + vw) / tileSize));
  const startRow = Math.max(0, Math.floor(cy / tileSize));
  const endRow = Math.min(map.height, Math.ceil((cy + vh) / tileSize));

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = floor[r][c];
      ctx.fillStyle = tile.color;
      ctx.fillRect(c * tileSize - cx, r * tileSize - cy, tileSize + 1, tileSize + 1);
      // Subtle grass texture
      if (tile.variant > 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(c * tileSize - cx + 5, r * tileSize - cy + 5, tileSize - 10, tileSize - 10);
      }
    }
  }

  // Stream
  if (stream && stream.points.length > 1) {
    ctx.strokeStyle = stream.color;
    ctx.lineWidth = stream.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const p0 = stream.points[0];
    ctx.moveTo(p0.x - cx, p0.y - cy);
    for (let i = 1; i < stream.points.length; i++) {
      const p = stream.points[i];
      ctx.lineTo(p.x - cx, p.y - cy);
    }
    ctx.stroke();
    // Shimmer
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    const t = Date.now() * 0.001;
    for (let i = 0; i < stream.points.length; i += 3) {
      const p = stream.points[i];
      const sx = p.x - cx + Math.sin(t + i) * 5;
      const sy = p.y - cy;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy);
      ctx.lineTo(sx + 5, sy);
      ctx.stroke();
    }
  }

  // Objects
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const obj of objects) {
    const sx = obj.x - cx;
    const sy = obj.y - cy;
    if (sx > -50 && sx < vw + 50 && sy > -50 && sy < vh + 50) {
      ctx.fillText(obj.emoji, sx, sy);
    }
  }

  // Ambient particles
  const now = Date.now() * 0.001;
  for (const p of ambientParticles) {
    // Update position
    p.x += p.vx;
    p.y += p.vy;
    if (p.type === 'firefly' || p.type === 'butterfly') {
      p.x += Math.sin(now * 2 + p.phase) * 0.3;
      p.y += Math.cos(now * 1.5 + p.phase) * 0.2;
    }
    // Wrap
    if (p.x < 0) p.x = mapW;
    if (p.x > mapW) p.x = 0;
    if (p.y < 0) p.y = mapH;
    if (p.y > mapH) p.y = 0;

    const sx = p.x - cx;
    const sy = p.y - cy;
    if (sx < -10 || sx > vw + 10 || sy < -10 || sy > vh + 10) continue;

    const alpha = 0.4 + Math.sin(now * 3 + p.phase) * 0.3;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    if (p.type === 'butterfly') {
      ctx.font = `${Math.round(p.size * 3)}px serif`;
      ctx.fillText('🦋', sx, sy);
    } else {
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
