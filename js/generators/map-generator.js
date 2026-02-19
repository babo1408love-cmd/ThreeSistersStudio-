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

// ── 색상 유틸 ──
function _darken(hex, amount) {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substr(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substr(2, 2), 16) - amount);
  const b = Math.max(0, parseInt(c.substr(4, 2), 16) - amount);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

// ── 간단한 노이즈 ──
function _noise(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

// ══════════════════════════════════════════════
//  HD 오브젝트 Canvas 스프라이트 렌더링
// ══════════════════════════════════════════════

function _drawObject(ctx, obj, sx, sy) {
  const e = obj.emoji;
  const w = obj.w || 24;
  const h = obj.h || 24;

  switch (e) {
    case '🌳': _drawTree(ctx, sx, sy, w, h, '#2d6b2d', '#1a4a1a', '#3a8a3a'); break;
    case '🌲': _drawPineTree(ctx, sx, sy, w, h); break;
    case '🌿': _drawGrass(ctx, sx, sy, w); break;
    case '🍄': _drawMushroom(ctx, sx, sy, w); break;
    case '🪨': _drawRock(ctx, sx, sy, w, h); break;
    case '🌸': case '🌷': case '🌼': _drawFlower(ctx, sx, sy, w, e); break;
    case '🍀': _drawClover(ctx, sx, sy, w); break;
    case '🪷': _drawLotus(ctx, sx, sy, w); break;
    case '💎': _drawCrystal(ctx, sx, sy, w, h, '#8B5CF6'); break;
    case '🔮': _drawCrystal(ctx, sx, sy, w, h, '#C084FC'); break;
    case '✨': _drawSparkle(ctx, sx, sy, w); break;
    case '☁️': _drawCloud(ctx, sx, sy, w, h); break;
    case '⭐': _drawStarObj(ctx, sx, sy, w); break;
    case '🌙': _drawMoon(ctx, sx, sy, w); break;
    case '🌈': _drawRainbow(ctx, sx, sy, w, h); break;
    case '🌵': _drawCactus(ctx, sx, sy, w, h); break;
    case '🌋': _drawVolcano(ctx, sx, sy, w, h); break;
    case '🔥': _drawTorch(ctx, sx, sy, w, h); break;
    case '💀': _drawSkull(ctx, sx, sy, w); break;
    case '⛄': _drawSnowman(ctx, sx, sy, w, h); break;
    case '❄️': _drawSnowflake(ctx, sx, sy, w); break;
    case '🧊': _drawIceBlock(ctx, sx, sy, w); break;
    case '🕸️': _drawWeb(ctx, sx, sy, w); break;
    case '🦇': _drawBat(ctx, sx, sy, w); break;
    case '🪸': _drawCoral(ctx, sx, sy, w); break;
    case '🐚': _drawShell(ctx, sx, sy, w); break;
    case '🌊': _drawWave(ctx, sx, sy, w); break;
    case '🫧': _drawBubble(ctx, sx, sy, w); break;
    case '🏛️': _drawPillar(ctx, sx, sy, w, h); break;
    case '🏰': _drawCastle(ctx, sx, sy, w, h); break;
    case '🏺': case '⚱️': _drawVase(ctx, sx, sy, w); break;
    case '⚔️': _drawSwords(ctx, sx, sy, w); break;
    case '⛓️': _drawChain(ctx, sx, sy, w, h); break;
    case '🕊️': _drawBird(ctx, sx, sy, w); break;
    default:
      // 알 수 없는 이모지: 풀백
      ctx.font = `${w}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e, sx, sy);
  }
}

// ── 나무 (활엽수) ──
function _drawTree(ctx, x, y, w, h, leafColor, darkLeaf, lightLeaf) {
  const trunkW = w * 0.18, trunkH = h * 0.45;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.4, w * 0.3, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  // 줄기 (그라디언트)
  const tg = ctx.createLinearGradient(x - trunkW, y, x + trunkW, y);
  tg.addColorStop(0, '#5a3a1a');
  tg.addColorStop(0.5, '#8B6914');
  tg.addColorStop(1, '#4a2a0a');
  ctx.fillStyle = tg;
  ctx.fillRect(x - trunkW / 2, y, trunkW, trunkH);
  // 잎사귀 (3개 원, 그라디언트)
  const leafR = w * 0.35;
  const leafY = y - h * 0.15;
  const positions = [[0, -leafR * 0.3], [-leafR * 0.5, leafR * 0.15], [leafR * 0.5, leafR * 0.15]];
  positions.forEach(([dx, dy]) => {
    const lg = ctx.createRadialGradient(x + dx - 2, leafY + dy - 3, 0, x + dx, leafY + dy, leafR);
    lg.addColorStop(0, lightLeaf);
    lg.addColorStop(0.6, leafColor);
    lg.addColorStop(1, darkLeaf);
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(x + dx, leafY + dy, leafR, 0, Math.PI * 2);
    ctx.fill();
  });
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.arc(x - leafR * 0.15, leafY - leafR * 0.5, leafR * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// ── 소나무 ──
function _drawPineTree(ctx, x, y, w, h) {
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.42, w * 0.25, h * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // 줄기
  ctx.fillStyle = '#6B4226';
  ctx.fillRect(x - w * 0.08, y + h * 0.1, w * 0.16, h * 0.35);
  // 삼각형 잎 3단
  for (let i = 0; i < 3; i++) {
    const ty = y - h * 0.1 + i * h * 0.18;
    const tw = w * (0.4 - i * 0.06);
    const th = h * 0.28;
    const pg = ctx.createLinearGradient(x, ty - th, x, ty);
    pg.addColorStop(0, '#1a5a1a');
    pg.addColorStop(0.5, '#228B22');
    pg.addColorStop(1, '#145014');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(x, ty - th);
    ctx.lineTo(x + tw, ty);
    ctx.lineTo(x - tw, ty);
    ctx.closePath();
    ctx.fill();
  }
}

// ── 풀 ──
function _drawGrass(ctx, x, y, w) {
  const blades = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blades; i++) {
    const bx = x + (i - blades / 2) * w * 0.15;
    const sway = Math.sin(Date.now() * 0.002 + i) * 2;
    ctx.strokeStyle = i % 2 === 0 ? '#3CB371' : '#228B22';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, y + w * 0.2);
    ctx.quadraticCurveTo(bx + sway, y - w * 0.1, bx + sway * 0.5, y - w * 0.3);
    ctx.stroke();
  }
}

// ── 버섯 ──
function _drawMushroom(ctx, x, y, w) {
  // 줄기
  ctx.fillStyle = '#F5F5DC';
  ctx.fillRect(x - w * 0.1, y - w * 0.05, w * 0.2, w * 0.35);
  // 갓 (그라디언트)
  const mg = ctx.createRadialGradient(x - w * 0.05, y - w * 0.2, 0, x, y - w * 0.12, w * 0.28);
  mg.addColorStop(0, '#FF6B6B');
  mg.addColorStop(1, '#CC4444');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(x, y - w * 0.12, w * 0.28, w * 0.18, 0, Math.PI, 0);
  ctx.fill();
  // 점무늬
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - w * 0.08, y - w * 0.2, w * 0.04, 0, Math.PI * 2);
  ctx.arc(x + w * 0.1, y - w * 0.18, w * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

// ── 바위 ──
function _drawRock(ctx, x, y, w, h) {
  const rg = ctx.createRadialGradient(x - w * 0.1, y - h * 0.15, 0, x, y, w * 0.5);
  rg.addColorStop(0, '#9B9B9B');
  rg.addColorStop(0.6, '#6B6B6B');
  rg.addColorStop(1, '#4A4A4A');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, y + h * 0.1);
  ctx.quadraticCurveTo(x - w * 0.35, y - h * 0.3, x - w * 0.05, y - h * 0.35);
  ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.4, x + w * 0.38, y - h * 0.1);
  ctx.quadraticCurveTo(x + w * 0.42, y + h * 0.15, x, y + h * 0.2);
  ctx.quadraticCurveTo(x - w * 0.4, y + h * 0.2, x - w * 0.4, y + h * 0.1);
  ctx.fill();
  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(x - w * 0.1, y - h * 0.2, w * 0.12, h * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ── 꽃 ──
function _drawFlower(ctx, x, y, w, type) {
  const colors = {
    '🌸': ['#FFB6C1', '#FF69B4'],
    '🌷': ['#FF6B6B', '#CC3333'],
    '🌼': ['#FFD700', '#FFA500'],
  };
  const [light, dark] = colors[type] || colors['🌸'];
  // 줄기
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + w * 0.3);
  ctx.quadraticCurveTo(x + 2, y, x, y - w * 0.15);
  ctx.stroke();
  // 꽃잎
  const petals = type === '🌷' ? 3 : 5;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * w * 0.12;
    const py = y - w * 0.15 + Math.sin(a) * w * 0.12;
    const fg = ctx.createRadialGradient(px, py, 0, px, py, w * 0.1);
    fg.addColorStop(0, light);
    fg.addColorStop(1, dark);
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(px, py, w * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // 중심
  ctx.fillStyle = '#FFEE88';
  ctx.beginPath();
  ctx.arc(x, y - w * 0.15, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
}

// ── 클로버 ──
function _drawClover(ctx, x, y, w) {
  ctx.fillStyle = '#228B22';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * w * 0.12, y + Math.sin(a) * w * 0.12, w * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── 연꽃 ──
function _drawLotus(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(255,182,193,0.6)';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * w * 0.15, y + Math.sin(a) * w * 0.08, w * 0.12, w * 0.06, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x, y, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
}

// ── 크리스탈 ──
function _drawCrystal(ctx, x, y, w, h, color) {
  const cg = ctx.createLinearGradient(x - w * 0.3, y - h * 0.4, x + w * 0.3, y + h * 0.3);
  cg.addColorStop(0, color + 'CC');
  cg.addColorStop(0.5, color);
  cg.addColorStop(1, color + '88');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.45);
  ctx.lineTo(x + w * 0.3, y - h * 0.1);
  ctx.lineTo(x + w * 0.2, y + h * 0.3);
  ctx.lineTo(x - w * 0.2, y + h * 0.3);
  ctx.lineTo(x - w * 0.3, y - h * 0.1);
  ctx.closePath();
  ctx.fill();
  // 빛 반사
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.45);
  ctx.lineTo(x + w * 0.15, y - h * 0.1);
  ctx.lineTo(x - w * 0.05, y - h * 0.1);
  ctx.closePath();
  ctx.fill();
  // 글로우
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = color + '44';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ── 반짝임 ──
function _drawSparkle(ctx, x, y, w) {
  const t = Date.now() * 0.003;
  const alpha = 0.3 + Math.sin(t + x + y) * 0.3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFD700';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + t;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * w * 0.3, y + Math.sin(a) * w * 0.05);
    ctx.lineTo(x + Math.cos(a + 0.1) * w * 0.05, y + Math.sin(a + 0.1) * w * 0.3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── 구름 ──
function _drawCloud(ctx, x, y, w, h) {
  const cg = ctx.createRadialGradient(x, y, 0, x, y, w * 0.5);
  cg.addColorStop(0, 'rgba(255,255,255,0.3)');
  cg.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(x, y, w * 0.3, 0, Math.PI * 2);
  ctx.arc(x - w * 0.25, y + h * 0.08, w * 0.22, 0, Math.PI * 2);
  ctx.arc(x + w * 0.25, y + h * 0.08, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

// ── 별 (오브젝트) ──
function _drawStarObj(ctx, x, y, w) {
  const t = Date.now() * 0.002;
  const alpha = 0.4 + Math.sin(t + x) * 0.3;
  ctx.globalAlpha = alpha;
  const sg = ctx.createRadialGradient(x, y, 0, x, y, w * 0.4);
  sg.addColorStop(0, '#FFFFFF');
  sg.addColorStop(0.5, '#FFD700');
  sg.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(x, y, w * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // 십자 광채
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.3, y); ctx.lineTo(x + w * 0.3, y);
  ctx.moveTo(x, y - w * 0.3); ctx.lineTo(x, y + w * 0.3);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ── 달 ──
function _drawMoon(ctx, x, y, w) {
  const mg = ctx.createRadialGradient(x - w * 0.1, y - w * 0.1, 0, x, y, w * 0.4);
  mg.addColorStop(0, '#FFFFF0');
  mg.addColorStop(0.7, '#FFD700');
  mg.addColorStop(1, 'rgba(255,215,0,0.1)');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(x, y, w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  // 초승달 마스크
  ctx.fillStyle = 'rgba(0,0,20,0.7)';
  ctx.beginPath();
  ctx.arc(x + w * 0.15, y - w * 0.05, w * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// ── 무지개 ──
function _drawRainbow(ctx, x, y, w, h) {
  const colors = ['#FF0000', '#FF8800', '#FFFF00', '#00FF00', '#0088FF', '#8800FF'];
  colors.forEach((c, i) => {
    ctx.strokeStyle = c + '44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + h * 0.3, w * 0.4 - i * 3, Math.PI, 0);
    ctx.stroke();
  });
}

// ── 선인장 ──
function _drawCactus(ctx, x, y, w, h) {
  const cg = ctx.createLinearGradient(x - w * 0.15, y, x + w * 0.15, y);
  cg.addColorStop(0, '#1a6b1a');
  cg.addColorStop(0.5, '#228B22');
  cg.addColorStop(1, '#145014');
  ctx.fillStyle = cg;
  // 몸통
  _roundRect(ctx, x - w * 0.12, y - h * 0.2, w * 0.24, h * 0.55, 5);
  ctx.fill();
  // 팔
  ctx.fillRect(x + w * 0.12, y - h * 0.05, w * 0.15, w * 0.08);
  _roundRect(ctx, x + w * 0.22, y - h * 0.2, w * 0.1, h * 0.2, 3);
  ctx.fill();
}

// ── 화산 ──
function _drawVolcano(ctx, x, y, w, h) {
  const vg = ctx.createLinearGradient(x, y - h * 0.4, x, y + h * 0.3);
  vg.addColorStop(0, '#4A2A0A');
  vg.addColorStop(0.5, '#6B3A1A');
  vg.addColorStop(1, '#3A1A0A');
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.45, y + h * 0.3);
  ctx.lineTo(x - w * 0.12, y - h * 0.35);
  ctx.lineTo(x + w * 0.12, y - h * 0.35);
  ctx.lineTo(x + w * 0.45, y + h * 0.3);
  ctx.closePath();
  ctx.fill();
  // 용암
  const lg = ctx.createRadialGradient(x, y - h * 0.3, 0, x, y - h * 0.3, w * 0.15);
  lg.addColorStop(0, '#FFDD00');
  lg.addColorStop(0.5, '#FF6600');
  lg.addColorStop(1, '#FF4500');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.3, w * 0.12, h * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── 횃불 ──
function _drawTorch(ctx, x, y, w, h) {
  // 막대
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(x - w * 0.06, y - h * 0.1, w * 0.12, h * 0.5);
  // 불꽃
  const t = Date.now() * 0.005;
  const fg = ctx.createRadialGradient(x, y - h * 0.2, 0, x, y - h * 0.15, w * 0.2);
  fg.addColorStop(0, '#FFDD44');
  fg.addColorStop(0.5, '#FF6600');
  fg.addColorStop(1, 'rgba(255,68,0,0)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(x + Math.sin(t) * 2, y - h * 0.2, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

// ── 해골 ──
function _drawSkull(ctx, x, y, w) {
  ctx.fillStyle = '#DDD';
  ctx.beginPath();
  ctx.arc(x, y - w * 0.05, w * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(x - w * 0.08, y - w * 0.08, w * 0.05, 0, Math.PI * 2);
  ctx.arc(x + w * 0.08, y - w * 0.08, w * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - w * 0.04, y + w * 0.05, w * 0.03, w * 0.06);
  ctx.fillRect(x + w * 0.01, y + w * 0.05, w * 0.03, w * 0.06);
}

// ── 눈사람 ──
function _drawSnowman(ctx, x, y, w, h) {
  const sg = ctx.createRadialGradient(x, y, 0, x, y, w * 0.3);
  sg.addColorStop(0, '#FFFFFF');
  sg.addColorStop(1, '#DDD');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(x, y + h * 0.1, w * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - h * 0.1, w * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - h * 0.28, w * 0.15, 0, Math.PI * 2);
  ctx.fill();
  // 눈
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(x - w * 0.05, y - h * 0.3, 2, 0, Math.PI * 2);
  ctx.arc(x + w * 0.05, y - h * 0.3, 2, 0, Math.PI * 2);
  ctx.fill();
  // 코
  ctx.fillStyle = '#FF6600';
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.27);
  ctx.lineTo(x + w * 0.08, y - h * 0.25);
  ctx.lineTo(x, y - h * 0.23);
  ctx.fill();
}

// ── 눈결정 ──
function _drawSnowflake(ctx, x, y, w) {
  const t = Date.now() * 0.001;
  ctx.strokeStyle = 'rgba(200,220,255,0.6)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * w * 0.3, y + Math.sin(a) * w * 0.3);
    ctx.stroke();
  }
}

// ── 얼음 블록 ──
function _drawIceBlock(ctx, x, y, w) {
  const ig = ctx.createLinearGradient(x - w * 0.3, y - w * 0.3, x + w * 0.3, y + w * 0.3);
  ig.addColorStop(0, 'rgba(150,220,255,0.6)');
  ig.addColorStop(0.5, 'rgba(100,200,240,0.4)');
  ig.addColorStop(1, 'rgba(150,220,255,0.6)');
  ctx.fillStyle = ig;
  ctx.fillRect(x - w * 0.3, y - w * 0.3, w * 0.6, w * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x - w * 0.2, y - w * 0.25, w * 0.15, w * 0.1);
}

// ── 거미줄 ──
function _drawWeb(ctx, x, y, w) {
  ctx.strokeStyle = 'rgba(200,200,200,0.25)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * w * 0.4, y + Math.sin(a) * w * 0.4);
    ctx.stroke();
  }
  for (let r = 1; r <= 3; r++) {
    ctx.beginPath();
    ctx.arc(x, y, w * 0.12 * r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── 박쥐 ──
function _drawBat(ctx, x, y, w) {
  const t = Date.now() * 0.008;
  const wingAngle = Math.sin(t + x) * 0.3;
  ctx.fillStyle = '#333';
  // 몸
  ctx.beginPath();
  ctx.arc(x, y, w * 0.1, 0, Math.PI * 2);
  ctx.fill();
  // 날개
  [-1, 1].forEach(dx => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx * w * 0.25, y - w * 0.15 + wingAngle * 10, x + dx * w * 0.4, y + w * 0.05);
    ctx.quadraticCurveTo(x + dx * w * 0.2, y + w * 0.08, x, y);
    ctx.fill();
  });
}

// ── 산호 ──
function _drawCoral(ctx, x, y, w) {
  const cg = ctx.createRadialGradient(x, y, 0, x, y, w * 0.4);
  cg.addColorStop(0, '#FF6B6B');
  cg.addColorStop(1, '#CC3333');
  ctx.fillStyle = cg;
  for (let i = 0; i < 4; i++) {
    const bx = x + (Math.random() - 0.5) * w * 0.3;
    const by = y + (Math.random() - 0.5) * w * 0.2;
    ctx.beginPath();
    ctx.arc(bx, by, w * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── 조개 ──
function _drawShell(ctx, x, y, w) {
  const sg = ctx.createRadialGradient(x, y, 0, x, y, w * 0.3);
  sg.addColorStop(0, '#FFE4C4');
  sg.addColorStop(1, '#DEB887');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.25, w * 0.18, 0, 0, Math.PI);
  ctx.fill();
  // 줄무늬
  ctx.strokeStyle = 'rgba(139,90,43,0.3)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x, y + w * 0.02, w * 0.08 + i * w * 0.05, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
}

// ── 파도 ──
function _drawWave(ctx, x, y, w) {
  const t = Date.now() * 0.003;
  ctx.strokeStyle = 'rgba(30,144,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < w * 0.8; i++) {
    const wx = x - w * 0.4 + i;
    const wy = y + Math.sin(i * 0.2 + t) * 4;
    i === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
  }
  ctx.stroke();
}

// ── 거품 ──
function _drawBubble(ctx, x, y, w) {
  const t = Date.now() * 0.002;
  const alpha = 0.2 + Math.sin(t + y) * 0.1;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(100,200,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, w * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.arc(x - w * 0.06, y - w * 0.08, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ── 기둥 ──
function _drawPillar(ctx, x, y, w, h) {
  const pg = ctx.createLinearGradient(x - w * 0.2, y, x + w * 0.2, y);
  pg.addColorStop(0, '#8B8B7A');
  pg.addColorStop(0.3, '#C8C8B0');
  pg.addColorStop(0.7, '#C8C8B0');
  pg.addColorStop(1, '#8B8B7A');
  ctx.fillStyle = pg;
  ctx.fillRect(x - w * 0.15, y - h * 0.4, w * 0.3, h * 0.8);
  // 주두
  ctx.fillRect(x - w * 0.22, y - h * 0.42, w * 0.44, h * 0.06);
  ctx.fillRect(x - w * 0.22, y + h * 0.36, w * 0.44, h * 0.06);
}

// ── 성 ──
function _drawCastle(ctx, x, y, w, h) {
  const cg = ctx.createLinearGradient(x - w * 0.4, y, x + w * 0.4, y);
  cg.addColorStop(0, '#4A4A4A');
  cg.addColorStop(0.5, '#6B6B6B');
  cg.addColorStop(1, '#3A3A3A');
  ctx.fillStyle = cg;
  // 본체
  ctx.fillRect(x - w * 0.3, y - h * 0.15, w * 0.6, h * 0.45);
  // 탑 2개
  [-1, 1].forEach(dx => {
    ctx.fillRect(x + dx * w * 0.28, y - h * 0.4, w * 0.14, h * 0.7);
    // 성벽 톱니
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + dx * w * 0.28 - w * 0.01 + i * w * 0.05, y - h * 0.45, w * 0.04, h * 0.06);
    }
  });
  // 문
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(x, y + h * 0.15, w * 0.08, Math.PI, 0);
  ctx.fillRect(x - w * 0.08, y + h * 0.15, w * 0.16, h * 0.15);
  ctx.fill();
}

// ── 꽃병 ──
function _drawVase(ctx, x, y, w) {
  const vg = ctx.createLinearGradient(x - w * 0.2, y, x + w * 0.2, y);
  vg.addColorStop(0, '#8B6914');
  vg.addColorStop(0.5, '#B8860B');
  vg.addColorStop(1, '#6B4F0A');
  ctx.fillStyle = vg;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1, y - w * 0.25);
  ctx.quadraticCurveTo(x - w * 0.22, y, x - w * 0.15, y + w * 0.2);
  ctx.lineTo(x + w * 0.15, y + w * 0.2);
  ctx.quadraticCurveTo(x + w * 0.22, y, x + w * 0.1, y - w * 0.25);
  ctx.closePath();
  ctx.fill();
}

// ── 쌍검 ──
function _drawSwords(ctx, x, y, w) {
  ctx.strokeStyle = '#AAA';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  [-1, 1].forEach(dx => {
    ctx.beginPath();
    ctx.moveTo(x + dx * w * 0.05, y + w * 0.2);
    ctx.lineTo(x + dx * w * 0.2, y - w * 0.25);
    ctx.stroke();
    // 가드
    ctx.strokeStyle = '#8B6914';
    ctx.beginPath();
    ctx.moveTo(x + dx * w * 0.02, y + w * 0.12);
    ctx.lineTo(x + dx * w * 0.15, y + w * 0.12);
    ctx.stroke();
    ctx.strokeStyle = '#AAA';
  });
}

// ── 쇠사슬 ──
function _drawChain(ctx, x, y, w, h) {
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const cy2 = y - h * 0.3 + i * h * 0.18;
    ctx.beginPath();
    ctx.ellipse(x, cy2, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── 새 ──
function _drawBird(ctx, x, y, w) {
  const t = Date.now() * 0.005;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x - w * 0.1, y, w * 0.15, Math.PI + 0.3, Math.PI * 2 - 0.3 + Math.sin(t) * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + w * 0.1, y, w * 0.15, Math.PI + 0.3, Math.PI * 2 - 0.3 + Math.sin(t + 1) * 0.2);
  ctx.stroke();
}

// ── 둥근 사각형 헬퍼 ──
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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

  // Background (그라디언트)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, vh);
  bgGrad.addColorStop(0, theme.bgColor);
  bgGrad.addColorStop(1, _darken(theme.bgColor, 20));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, vw, vh);

  // Floor tiles (그라디언트+노이즈 텍스처)
  const startCol = Math.max(0, Math.floor(cx / tileSize));
  const endCol = Math.min(map.width, Math.ceil((cx + vw) / tileSize));
  const startRow = Math.max(0, Math.floor(cy / tileSize));
  const endRow = Math.min(map.height, Math.ceil((cy + vh) / tileSize));

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = floor[r][c];
      const tx = c * tileSize - cx;
      const ty = r * tileSize - cy;
      // 기본 색상
      ctx.fillStyle = tile.color;
      ctx.fillRect(tx, ty, tileSize + 1, tileSize + 1);
      // 노이즈 텍스처 오버레이 (타일 변이에 따라)
      if (tile.variant > 0.6) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);
      }
      if (tile.variant > 0.85) {
        // 밝은 점 (풀잎/먼지)
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(tx + tile.variant * 30, ty + tile.variant * 25, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (tile.variant < 0.15) {
        // 어두운 점 (그림자)
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(tx + 8, ty + 8, tileSize - 16, tileSize - 16);
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

  // Objects (HD Canvas 스프라이트)
  for (const obj of objects) {
    const sx = obj.x - cx;
    const sy = obj.y - cy;
    if (sx > -60 && sx < vw + 60 && sy > -60 && sy < vh + 60) {
      _drawObject(ctx, obj, sx, sy);
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

  // ── 배경 (그라디언트) ──
  const bgGrad = ctx.createLinearGradient(0, 0, 0, vh);
  bgGrad.addColorStop(0, theme.bgColor);
  bgGrad.addColorStop(1, _darken(theme.bgColor, 15));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, vw, vh);

  // ── 바닥 타일 (그라디언트+노이즈 텍스처) ──
  const startCol = Math.max(0, Math.floor(cx / tileSize));
  const endCol = Math.min(map.width, Math.ceil((cx + vw) / tileSize));
  const startRow = Math.max(0, Math.floor(cy / tileSize));
  const endRow = Math.min(map.height, Math.ceil((cy + vh) / tileSize));

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = floor[r][c];
      const tx = c * tileSize - cx;
      const ty = r * tileSize - cy;
      ctx.fillStyle = tile.color;
      ctx.fillRect(tx, ty, tileSize + 1, tileSize + 1);
      // 텍스처 오버레이
      if (tile.variant > 0.6) {
        ctx.fillStyle = tile.arena
          ? 'rgba(255,215,0,0.05)'
          : 'rgba(255,255,255,0.04)';
        ctx.fillRect(tx + 3, ty + 3, tileSize - 6, tileSize - 6);
      }
      if (tile.variant > 0.85) {
        ctx.fillStyle = tile.arena ? 'rgba(255,200,0,0.08)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(tx + tile.variant * 30, ty + tile.variant * 25, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (tile.variant < 0.15) {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(tx + 8, ty + 8, tileSize - 16, tileSize - 16);
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

  // Objects (HD Canvas 스프라이트 — 버킷 기반 최적화)
  for (let b = startBucket; b < endBucket; b++) {
    for (const obj of objectBuckets[b]) {
      const sx = obj.x - cx;
      const sy = obj.y - cy;
      if (sx > -60 && sx < vw + 60 && sy > -60 && sy < vh + 60) {
        _drawObject(ctx, obj, sx, sy);
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
