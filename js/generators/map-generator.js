/**
 * map-generator.js — 맵 자동 생성기
 * 6테마, 바닥노이즈, 사물배치(겹침방지), 시냇물, 앰비언트파티클, 길, 스폰포인트
 *
 * ★ 뱀서류 서바이벌 맵 시스템 (generateSurvivorMap)
 *   — 3분 자동전진에 맞춘 대형 맵 생성
 *   — 열(column) 기반 공간 분할로 오브젝트 렌더링 최적화
 *   — 끝부분에 배틀 아레나 영역 배치
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
  // ── 추가 테마 (stages.js 지역별 mapTheme 지원) ──
  desert: {
    name:'사막 유적', bgColor:'#2a1e0a', floorColors:['#c2a55a','#b89848','#d4b462'],
    objects:[
      {emoji:'🏛️',freq:0.02,solid:true,w:45,h:55},{emoji:'🪨',freq:0.06,solid:true,w:30,h:25},
      {emoji:'🌵',freq:0.04,solid:true,w:20,h:35},{emoji:'💀',freq:0.02,solid:false,w:15,h:15},
      {emoji:'🏺',freq:0.03,solid:false,w:18,h:22},{emoji:'⚱️',freq:0.02,solid:false,w:15,h:18},
    ],
    water:null,
    particles:{type:'sand',color:'#d4a853',count:12,speed:0.4,size:2},
  },
  volcano: {
    name:'화산 지대', bgColor:'#1a0a0a', floorColors:['#2a1010','#331515','#3a1a0a'],
    objects:[
      {emoji:'🪨',freq:0.08,solid:true,w:30,h:25},{emoji:'🌋',freq:0.02,solid:true,w:40,h:45},
      {emoji:'🔥',freq:0.06,solid:false,w:15,h:20},{emoji:'💀',freq:0.02,solid:false,w:15,h:15},
    ],
    water:{color:'#FF450066',flowDir:1,width:30},
    particles:{type:'ember',color:'#FF4500',count:15,speed:0.6,size:2},
  },
  frozen: {
    name:'얼어붙은 동토', bgColor:'#0a1520', floorColors:['#b8d4e8','#c4dff0','#a8c8d8'],
    objects:[
      {emoji:'🌲',freq:0.04,solid:true,w:30,h:45},{emoji:'⛄',freq:0.02,solid:true,w:25,h:30},
      {emoji:'🪨',freq:0.03,solid:true,w:25,h:20},{emoji:'❄️',freq:0.06,solid:false,w:12,h:12},
      {emoji:'🧊',freq:0.03,solid:true,w:20,h:20},
    ],
    water:{color:'#87CEEB44',flowDir:1,width:35},
    particles:{type:'snow',color:'#fff',count:25,speed:0.5,size:3},
  },
  dark_forest: {
    name:'어둠의 숲', bgColor:'#0a0a12', floorColors:['#1a1a24','#1e1e2a','#161620'],
    objects:[
      {emoji:'🌲',freq:0.07,solid:true,w:35,h:50},{emoji:'🍄',freq:0.05,solid:false,w:18,h:18},
      {emoji:'🕸️',freq:0.04,solid:false,w:25,h:25},{emoji:'💀',freq:0.02,solid:false,w:15,h:15},
      {emoji:'🪨',freq:0.03,solid:true,w:25,h:20},{emoji:'🦇',freq:0.03,solid:false,w:12,h:12},
    ],
    water:null,
    particles:{type:'firefly',color:'#9333ea',count:10,speed:0.2,size:2},
  },
  sky: {
    name:'하늘 왕국', bgColor:'#1a2a4a', floorColors:['#5a7ab0','#6888c0','#4a6a9a'],
    objects:[
      {emoji:'☁️',freq:0.08,solid:false,w:50,h:30},{emoji:'⭐',freq:0.03,solid:false,w:12,h:12},
      {emoji:'🌈',freq:0.01,solid:false,w:60,h:30},{emoji:'🕊️',freq:0.02,solid:false,w:15,h:15},
    ],
    water:null,
    particles:{type:'aurora',color:'#67e8f9',count:12,speed:0.15,size:4},
  },
  ocean: {
    name:'심해 영역', bgColor:'#040820', floorColors:['#0a1835','#0c1c40','#081530'],
    objects:[
      {emoji:'🪸',freq:0.05,solid:false,w:25,h:20},{emoji:'🐚',freq:0.04,solid:false,w:15,h:15},
      {emoji:'🪨',freq:0.04,solid:true,w:30,h:25},{emoji:'🌊',freq:0.03,solid:false,w:20,h:15},
      {emoji:'🫧',freq:0.06,solid:false,w:10,h:10},
    ],
    water:{color:'#1E90FF33',flowDir:1,width:50},
    particles:{type:'sparkle',color:'#22d3ee',count:15,speed:0.15,size:2},
  },
  demon_castle: {
    name:'마왕성', bgColor:'#0a0008', floorColors:['#1a0a14','#220e1a','#180812'],
    objects:[
      {emoji:'🏰',freq:0.01,solid:true,w:50,h:60},{emoji:'⚔️',freq:0.03,solid:false,w:20,h:25},
      {emoji:'🔥',freq:0.05,solid:false,w:15,h:20},{emoji:'💀',freq:0.04,solid:false,w:15,h:15},
      {emoji:'🪨',freq:0.04,solid:true,w:25,h:20},{emoji:'⛓️',freq:0.02,solid:false,w:15,h:20},
    ],
    water:{color:'#8B000044',flowDir:1,width:25},
    particles:{type:'ember',color:'#dc2626',count:12,speed:0.4,size:2},
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

// ══════════════════════════════════════════════════════════════
//  뱀서류 서바이벌 맵 시스템
// ══════════════════════════════════════════════════════════════

/**
 * 자동전진(AutoScroll) 3분간 총 이동 거리 계산
 * boundary(T) = (baseSpeed * T + 0.5 * accel * T²) / 16
 * @param {number} baseSpeed - 초기 속도 (px/frame)
 * @param {number} accel     - 가속 계수 (per ms)
 * @param {number} durationMs - 밀리초 (기본 180000 = 3분)
 * @returns {number} 총 이동 거리 (px)
 */
function _calcScrollDistance(baseSpeed, accel, durationMs = 180000) {
  return (baseSpeed * durationMs + 0.5 * accel * durationMs * durationMs) / 16;
}

/**
 * 뱀서류 서바이벌 맵 생성
 * — 3분 자동전진에 맞춘 초대형 맵
 * — 열(column) 기반 오브젝트 공간 분할
 * — 끝부분 배틀 아레나 영역
 *
 * @param {object} options
 * @param {string}  options.themeId     - 테마 키 (기본 'fairy_garden')
 * @param {number}  options.stageLevel  - 스테이지 레벨 (속도 계산용)
 * @param {number}  options.duration    - 게임 시간 ms (기본 180000)
 * @param {number}  options.scrollSpeed - 자동전진 기본 속도 (기본 계산)
 * @param {number}  options.scrollAccel - 자동전진 가속 (기본 0.00008)
 * @param {number}  options.height      - 맵 높이 타일 수 (기본 25)
 * @param {number}  options.arenaWidth  - 배틀아레나 폭 타일 (기본 100 = 4000px)
 * @param {number}  options.arenaHeight - 배틀아레나 높이 타일 (기본 50 = 2000px)
 * @param {number}  options.seed        - 시드
 * @returns {object} 서바이벌 맵 데이터
 */
export function generateSurvivorMap(options = {}) {
  const themeId = options.themeId || 'fairy_garden';
  const theme = THEMES[themeId] || THEMES.fairy_garden;
  const stageLevel = options.stageLevel || 1;
  const duration = options.duration || 180000;
  const baseSpeed = options.scrollSpeed || (0.6 + stageLevel * 0.05);
  const accel = options.scrollAccel || 0.00008;
  const seed = options.seed || Date.now();
  const tileSize = 40;

  // ── 맵 크기 계산 ──
  // 자동전진 총 거리 + 시작 여유 + 아레나 여유
  const scrollDist = _calcScrollDistance(baseSpeed, accel, duration);
  const bufferPx = 2000; // 화면폭 + 여유
  const arenaTilesW = options.arenaWidth || 100;  // 배틀아레나 100타일 = 4000px
  const arenaTilesH = options.arenaHeight || 50;   // 배틀아레나 50타일 = 2000px

  const fieldTilesW = Math.ceil((scrollDist + bufferPx) / tileSize);
  const totalWidth = fieldTilesW + arenaTilesW;
  const height = Math.max(options.height || 25, arenaTilesH);

  const mapW = totalWidth * tileSize;
  const mapH = height * tileSize;

  // ── 배틀 아레나 영역 (맵 끝 부분) ──
  const arenaStartX = fieldTilesW * tileSize;
  const arenaCenterX = arenaStartX + (arenaTilesW * tileSize) / 2;
  const arenaCenterY = mapH / 2;

  // ── 바닥 타일 생성 (노이즈 기반) ──
  const floor = [];
  for (let y = 0; y < height; y++) {
    floor[y] = [];
    for (let x = 0; x < totalWidth; x++) {
      const n = _noise(x, y, seed);
      const inArena = x >= fieldTilesW;

      if (inArena) {
        // 배틀아레나 바닥: 약간 밝은 변형
        const ci = Math.floor(n * theme.floorColors.length) % theme.floorColors.length;
        const baseColor = theme.floorColors[ci];
        floor[y][x] = { color: baseColor, variant: n, arena: true };
      } else {
        const ci = Math.floor(n * theme.floorColors.length) % theme.floorColors.length;
        floor[y][x] = { color: theme.floorColors[ci], variant: n, arena: false };
      }
    }
  }

  // ── 오브젝트 배치 (열 기반 공간 분할) ──
  // 대형 맵에서 전체 순회 방지 — 열 버킷으로 관리
  const BUCKET_COLS = 10; // 버킷 하나당 10타일
  const bucketCount = Math.ceil(totalWidth / BUCKET_COLS);
  const objectBuckets = new Array(bucketCount);
  for (let b = 0; b < bucketCount; b++) objectBuckets[b] = [];

  const allObjects = [];
  const occupied = new Set();

  // 샘플링 간격: 대형 맵에서 성능 보장 (4타일마다 체크)
  const sampleStep = Math.max(1, Math.floor(totalWidth / 600));

  for (const objDef of theme.objects) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < totalWidth; x += sampleStep) {
        const key = `${x},${y}`;
        if (occupied.has(key)) continue;

        const n = _noise(x * 3.7, y * 5.3, seed + objDef.emoji.charCodeAt(0));
        // 빈도 보정: sampleStep만큼 빈도 높임
        if (n < objDef.freq * sampleStep) {
          const px = x * tileSize + tileSize / 2;
          const py = y * tileSize + tileSize / 2;
          const obj = {
            emoji: objDef.emoji,
            x: px, y: py,
            w: objDef.w, h: objDef.h,
            solid: objDef.solid,
          };
          allObjects.push(obj);

          // 버킷에 등록
          const bi = Math.min(bucketCount - 1, Math.floor(x / BUCKET_COLS));
          objectBuckets[bi].push(obj);

          if (objDef.solid) {
            occupied.add(key);
            occupied.add(`${x+1},${y}`);
            occupied.add(`${x},${y+1}`);
          }
        }
      }
    }
  }

  // ── 배틀아레나 특수 장식 (기둥, 횃불 등) ──
  const arenaDecorations = [
    { emoji: '🏛️', freq: 0.015, solid: true, w: 50, h: 60 },  // 기둥
    { emoji: '🔥', freq: 0.02,  solid: false, w: 20, h: 25 },  // 횃불
    { emoji: '⚔️', freq: 0.008, solid: false, w: 25, h: 25 },  // 무기 장식
  ];
  // 아레나 경계 장식 (가장자리에만 배치)
  for (const decor of arenaDecorations) {
    for (let y = 0; y < height; y++) {
      for (let x = fieldTilesW; x < totalWidth; x += 3) {
        // 가장자리만 (상하단 2타일, 좌우단 2타일)
        const isEdge = y < 2 || y >= height - 2 || x < fieldTilesW + 2 || x >= totalWidth - 2;
        if (!isEdge) continue;

        const n = _noise(x * 7.1, y * 3.3, seed + decor.emoji.charCodeAt(0) + 999);
        if (n < decor.freq * 3) {
          const px = x * tileSize + tileSize / 2;
          const py = y * tileSize + tileSize / 2;
          const obj = { emoji: decor.emoji, x: px, y: py, w: decor.w, h: decor.h, solid: decor.solid };
          allObjects.push(obj);
          const bi = Math.min(bucketCount - 1, Math.floor(x / BUCKET_COLS));
          objectBuckets[bi].push(obj);
        }
      }
    }
  }

  // ── 시냇물 (필드 영역만) ──
  let stream = null;
  if (theme.water) {
    const sy = Math.floor(height * 0.4) * tileSize;
    stream = { color: theme.water.color, y: sy, width: theme.water.width, points: [] };
    // 필드 영역만 시냇물 (아레나 제외)
    for (let x = 0; x < fieldTilesW; x += 2) {
      const wobble = Math.sin(x * 0.3 + seed * 0.01) * tileSize;
      stream.points.push({ x: x * tileSize, y: sy + wobble });
    }
  }

  // ── 앰비언트 파티클 (카메라 주변에 리스폰하는 방식) ──
  // 대형 맵에서 파티클이 카메라 밖으로 날아가지 않도록
  // 초기값은 맵 시작 근처에 배치
  const ambientParticles = [];
  if (theme.particles) {
    // 화면 크기 기준 파티클 수 (맵 크기와 무관)
    const count = Math.max(theme.particles.count, 20);
    for (let i = 0; i < count; i++) {
      ambientParticles.push({
        x: Math.random() * 1200, // 초기 화면 영역
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

  // ── 게이트 포인트 (필드→아레나 전환 지점) ──
  const gatePosition = {
    x: arenaStartX - tileSize * 2,
    y: mapH / 2,
  };

  // ── 스폰 포인트 ──
  const spawnPoints = {
    player: { x: tileSize * 3, y: mapH / 2 },
    enemies: [
      { x: mapW * 0.2, y: mapH * 0.3 },
      { x: mapW * 0.3, y: mapH * 0.7 },
      { x: mapW * 0.5, y: mapH * 0.5 },
    ],
    boss: { x: arenaCenterX, y: arenaCenterY },
  };

  return {
    themeId, theme, width: totalWidth, height, tileSize,
    mapW, mapH, floor,
    objects: allObjects,
    objectBuckets, bucketCols: BUCKET_COLS,
    stream, ambientParticles, spawnPoints, seed,
    // 서바이벌 전용 필드
    survivorMode: true,
    fieldWidth: fieldTilesW,  // 필드 타일 수
    fieldWidthPx: fieldTilesW * tileSize,
    arenaStartX,
    arenaCenterX, arenaCenterY,
    arenaWidth: arenaTilesW * tileSize,
    arenaHeight: arenaTilesH * tileSize,
    gatePosition,
    scrollDistance: scrollDist,
  };
}

/**
 * 서바이벌 맵 렌더링 (열 기반 최적화)
 * — 보이는 열의 오브젝트만 렌더링
 * — 배틀아레나 영역 시각적 강조
 * — 앰비언트 파티클 카메라 리스폰
 */
export function renderSurvivorMap(ctx, map, camera) {
  const { theme, floor, objectBuckets, bucketCols, stream,
    ambientParticles, tileSize, mapW, mapH,
    arenaStartX, arenaWidth, arenaHeight,
    fieldWidthPx } = map;

  const cx = camera.x || 0;
  const cy = camera.y || 0;
  const vw = ctx.canvas.width;
  const vh = ctx.canvas.height;

  // ── 배경 ──
  ctx.fillStyle = theme.bgColor;
  ctx.fillRect(0, 0, vw, vh);

  // ── 바닥 타일 (보이는 영역만) ──
  const startCol = Math.max(0, Math.floor(cx / tileSize));
  const endCol = Math.min(map.width, Math.ceil((cx + vw) / tileSize));
  const startRow = Math.max(0, Math.floor(cy / tileSize));
  const endRow = Math.min(map.height, Math.ceil((cy + vh) / tileSize));

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = floor[r][c];
      ctx.fillStyle = tile.color;
      ctx.fillRect(c * tileSize - cx, r * tileSize - cy, tileSize + 1, tileSize + 1);
      // 미세한 텍스처
      if (tile.variant > 0.7) {
        ctx.fillStyle = tile.arena
          ? 'rgba(255,215,0,0.04)'   // 아레나: 살짝 금빛
          : 'rgba(255,255,255,0.03)'; // 필드: 살짝 밝음
        ctx.fillRect(c * tileSize - cx + 5, r * tileSize - cy + 5, tileSize - 10, tileSize - 10);
      }
    }
  }

  // ── 배틀아레나 경계선 ──
  const arenaBorderX = arenaStartX - cx;
  if (arenaBorderX > -100 && arenaBorderX < vw + 100) {
    // 세로 경계선 (점선)
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(arenaBorderX, 0);
    ctx.lineTo(arenaBorderX, vh);
    ctx.stroke();
    ctx.setLineDash([]);

    // 게이트 표시
    const gateY = mapH / 2 - cy;
    if (gateY > -50 && gateY < vh + 50) {
      ctx.font = '32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚪', arenaBorderX, gateY);
    }
  }

  // ── 아레나 영역 배경 오버레이 ──
  const arenaScreenL = Math.max(0, arenaStartX - cx);
  const arenaScreenR = Math.min(vw, arenaStartX + arenaWidth - cx);
  if (arenaScreenR > 0 && arenaScreenL < vw) {
    // 살짝 다른 배경톤 (어두운 금빛)
    ctx.fillStyle = 'rgba(255,180,0,0.03)';
    ctx.fillRect(arenaScreenL, 0, arenaScreenR - arenaScreenL, vh);
  }

  // ── 시냇물 (필드 영역만, 보이는 부분만) ──
  if (stream && stream.points.length > 1) {
    // 보이는 시냇물 포인트만 그리기
    const streamStartIdx = Math.max(0, Math.floor((cx - 100) / (tileSize * 2)));
    const streamEndIdx = Math.min(stream.points.length, Math.ceil((cx + vw + 100) / (tileSize * 2)));

    if (streamEndIdx > streamStartIdx) {
      ctx.strokeStyle = stream.color;
      ctx.lineWidth = stream.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const p0 = stream.points[streamStartIdx];
      ctx.moveTo(p0.x - cx, p0.y - cy);
      for (let i = streamStartIdx + 1; i < streamEndIdx; i++) {
        const p = stream.points[i];
        ctx.lineTo(p.x - cx, p.y - cy);
      }
      ctx.stroke();

      // 반짝임
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      const t = Date.now() * 0.001;
      for (let i = streamStartIdx; i < streamEndIdx; i += 2) {
        const p = stream.points[i];
        const sx = p.x - cx + Math.sin(t + i) * 5;
        const sy = p.y - cy;
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy);
        ctx.lineTo(sx + 5, sy);
        ctx.stroke();
      }
    }
  }

  // ── 오브젝트 (열 기반 버킷 — 보이는 버킷만) ──
  const bucketTilePx = bucketCols * tileSize;
  const startBucket = Math.max(0, Math.floor((cx - 60) / bucketTilePx));
  const endBucket = Math.min(objectBuckets.length, Math.ceil((cx + vw + 60) / bucketTilePx));

  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let b = startBucket; b < endBucket; b++) {
    for (const obj of objectBuckets[b]) {
      const sx = obj.x - cx;
      const sy = obj.y - cy;
      if (sx > -50 && sx < vw + 50 && sy > -50 && sy < vh + 50) {
        ctx.fillText(obj.emoji, sx, sy);
      }
    }
  }

  // ── 앰비언트 파티클 (카메라 주변 리스폰) ──
  const now = Date.now() * 0.001;
  for (const p of ambientParticles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.type === 'firefly' || p.type === 'butterfly') {
      p.x += Math.sin(now * 2 + p.phase) * 0.3;
      p.y += Math.cos(now * 1.5 + p.phase) * 0.2;
    }
    // 카메라 주변 리스폰 (화면 밖으로 벗어나면 반대편으로)
    if (p.x < cx - 100) p.x = cx + vw + Math.random() * 50;
    if (p.x > cx + vw + 100) p.x = cx - Math.random() * 50;
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
