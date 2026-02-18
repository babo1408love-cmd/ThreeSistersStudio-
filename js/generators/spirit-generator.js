/**
 * spirit-generator.js — 정령/요정 외모 랜덤 생성기
 * 8속성, 6몸체, 6눈, 9장식, 6날개, Canvas draw, 레어도 1~5
 * UnitFactory 연동: 스탯은 UnitFactory.createSpirit()으로 생성, 비주얼은 유지
 */
import UnitFactory from '../data/unit-factory.js';

// ── 8속성 ──
export const ATTRIBUTES = ['fire','water','earth','wind','light','dark','nature','ice'];
export const ATTR_INFO = {
  fire:   { name:'불',  emoji:'🔥', color:'#FF4500', glow:'rgba(255,69,0,0.5)' },
  water:  { name:'물',  emoji:'💧', color:'#1E90FF', glow:'rgba(30,144,255,0.5)' },
  earth:  { name:'땅',  emoji:'🪨', color:'#8B4513', glow:'rgba(139,69,19,0.5)' },
  wind:   { name:'바람', emoji:'🌪️', color:'#98FB98', glow:'rgba(152,251,152,0.5)' },
  light:  { name:'빛',  emoji:'✨', color:'#FFD700', glow:'rgba(255,215,0,0.5)' },
  dark:   { name:'어둠', emoji:'🌑', color:'#6A0DAD', glow:'rgba(106,13,173,0.5)' },
  nature: { name:'자연', emoji:'🌿', color:'#228B22', glow:'rgba(34,139,34,0.5)' },
  ice:    { name:'얼음', emoji:'❄️', color:'#00CED1', glow:'rgba(0,206,209,0.5)' },
};

// ── 6몸체 형태 ──
export const BODY_SHAPES = [
  { id:'round',   name:'둥근형', draw:(ctx,x,y,s)=>{ctx.beginPath();ctx.ellipse(x,y,s*0.4,s*0.45,0,0,Math.PI*2);ctx.fill();ctx.stroke();}},
  { id:'slim',    name:'슬림형', draw:(ctx,x,y,s)=>{ctx.beginPath();ctx.ellipse(x,y,s*0.28,s*0.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();}},
  { id:'star',    name:'별형',   draw:(ctx,x,y,s)=>{_drawStar(ctx,x,y,s*0.4,5);ctx.fill();ctx.stroke();}},
  { id:'teardrop',name:'물방울', draw:(ctx,x,y,s)=>{ctx.beginPath();ctx.moveTo(x,y-s*0.5);ctx.bezierCurveTo(x+s*0.4,y-s*0.1,x+s*0.35,y+s*0.4,x,y+s*0.45);ctx.bezierCurveTo(x-s*0.35,y+s*0.4,x-s*0.4,y-s*0.1,x,y-s*0.5);ctx.fill();ctx.stroke();}},
  { id:'cloud',   name:'구름형', draw:(ctx,x,y,s)=>{const r=s*0.2;ctx.beginPath();ctx.arc(x,y,r*1.2,0,Math.PI*2);ctx.arc(x-r,y+r*0.4,r,0,Math.PI*2);ctx.arc(x+r,y+r*0.4,r,0,Math.PI*2);ctx.arc(x,y+r*0.8,r*0.9,0,Math.PI*2);ctx.fill();ctx.stroke();}},
  { id:'diamond', name:'다이아', draw:(ctx,x,y,s)=>{ctx.beginPath();ctx.moveTo(x,y-s*0.5);ctx.lineTo(x+s*0.35,y);ctx.lineTo(x,y+s*0.5);ctx.lineTo(x-s*0.35,y);ctx.closePath();ctx.fill();ctx.stroke();}},
];

// ── 6눈 스타일 ──
export const EYE_STYLES = [
  { id:'dot',    name:'점눈',   draw:(ctx,x,y,s)=>{ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-s*0.1,y-s*0.05,s*0.04,0,Math.PI*2);ctx.arc(x+s*0.1,y-s*0.05,s*0.04,0,Math.PI*2);ctx.fill();}},
  { id:'round',  name:'동그란눈',draw:(ctx,x,y,s)=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-s*0.1,y-s*0.05,s*0.07,0,Math.PI*2);ctx.arc(x+s*0.1,y-s*0.05,s*0.07,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(x-s*0.1,y-s*0.04,s*0.035,0,Math.PI*2);ctx.arc(x+s*0.1,y-s*0.04,s*0.035,0,Math.PI*2);ctx.fill();}},
  { id:'happy',  name:'행복눈', draw:(ctx,x,y,s)=>{ctx.strokeStyle='#111';ctx.lineWidth=s*0.02;ctx.beginPath();ctx.arc(x-s*0.1,y-s*0.06,s*0.05,Math.PI,0);ctx.stroke();ctx.beginPath();ctx.arc(x+s*0.1,y-s*0.06,s*0.05,Math.PI,0);ctx.stroke();}},
  { id:'star',   name:'별눈',   draw:(ctx,x,y,s)=>{ctx.fillStyle='#FFD700';_drawStar(ctx,x-s*0.1,y-s*0.05,s*0.06,4);ctx.fill();_drawStar(ctx,x+s*0.1,y-s*0.05,s*0.06,4);ctx.fill();}},
  { id:'sleepy', name:'졸린눈', draw:(ctx,x,y,s)=>{ctx.strokeStyle='#111';ctx.lineWidth=s*0.02;ctx.beginPath();ctx.moveTo(x-s*0.14,y-s*0.05);ctx.lineTo(x-s*0.06,y-s*0.05);ctx.stroke();ctx.beginPath();ctx.moveTo(x+s*0.06,y-s*0.05);ctx.lineTo(x+s*0.14,y-s*0.05);ctx.stroke();}},
  { id:'sparkle',name:'반짝눈', draw:(ctx,x,y,s)=>{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-s*0.1,y-s*0.05,s*0.065,0,Math.PI*2);ctx.arc(x+s*0.1,y-s*0.05,s*0.065,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c084fc';ctx.beginPath();ctx.arc(x-s*0.1,y-s*0.04,s*0.04,0,Math.PI*2);ctx.arc(x+s*0.1,y-s*0.04,s*0.04,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-s*0.08,y-s*0.06,s*0.015,0,Math.PI*2);ctx.arc(x+s*0.12,y-s*0.06,s*0.015,0,Math.PI*2);ctx.fill();}},
];

// ── 9장식 ──
export const DECORATIONS = [
  { id:'none',    name:'없음',   draw:()=>{} },
  { id:'crown',   name:'왕관',   draw:(ctx,x,y,s)=>{ctx.fillStyle='#FFD700';ctx.beginPath();ctx.moveTo(x-s*0.15,y-s*0.42);ctx.lineTo(x-s*0.1,y-s*0.52);ctx.lineTo(x-s*0.03,y-s*0.44);ctx.lineTo(x+s*0.03,y-s*0.54);ctx.lineTo(x+s*0.1,y-s*0.44);ctx.lineTo(x+s*0.15,y-s*0.52);ctx.lineTo(x+s*0.15,y-s*0.42);ctx.closePath();ctx.fill();}},
  { id:'flower',  name:'꽃',     draw:(ctx,x,y,s)=>{ctx.fillStyle='#f5c2e7';for(let i=0;i<5;i++){const a=i/5*Math.PI*2-Math.PI/2;ctx.beginPath();ctx.arc(x+Math.cos(a)*s*0.08,y-s*0.48+Math.sin(a)*s*0.08,s*0.05,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(x,y-s*0.48,s*0.03,0,Math.PI*2);ctx.fill();}},
  { id:'ribbon',  name:'리본',   draw:(ctx,x,y,s)=>{ctx.fillStyle='#ff6b6b';ctx.beginPath();ctx.moveTo(x,y-s*0.42);ctx.lineTo(x-s*0.18,y-s*0.52);ctx.lineTo(x-s*0.06,y-s*0.42);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(x,y-s*0.42);ctx.lineTo(x+s*0.18,y-s*0.52);ctx.lineTo(x+s*0.06,y-s*0.42);ctx.closePath();ctx.fill();}},
  { id:'halo',    name:'후광',   draw:(ctx,x,y,s)=>{ctx.strokeStyle='rgba(255,215,0,0.6)';ctx.lineWidth=s*0.02;ctx.beginPath();ctx.ellipse(x,y-s*0.52,s*0.18,s*0.06,0,0,Math.PI*2);ctx.stroke();}},
  { id:'horns',   name:'뿔',     draw:(ctx,x,y,s)=>{ctx.fillStyle='#c084fc';ctx.beginPath();ctx.moveTo(x-s*0.2,y-s*0.38);ctx.lineTo(x-s*0.25,y-s*0.58);ctx.lineTo(x-s*0.1,y-s*0.4);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(x+s*0.2,y-s*0.38);ctx.lineTo(x+s*0.25,y-s*0.58);ctx.lineTo(x+s*0.1,y-s*0.4);ctx.closePath();ctx.fill();}},
  { id:'antenna', name:'더듬이', draw:(ctx,x,y,s)=>{ctx.strokeStyle='#86efac';ctx.lineWidth=s*0.015;ctx.beginPath();ctx.moveTo(x-s*0.08,y-s*0.45);ctx.quadraticCurveTo(x-s*0.15,y-s*0.65,x-s*0.12,y-s*0.6);ctx.stroke();ctx.beginPath();ctx.moveTo(x+s*0.08,y-s*0.45);ctx.quadraticCurveTo(x+s*0.15,y-s*0.65,x+s*0.12,y-s*0.6);ctx.stroke();ctx.fillStyle='#86efac';ctx.beginPath();ctx.arc(x-s*0.12,y-s*0.6,s*0.025,0,Math.PI*2);ctx.arc(x+s*0.12,y-s*0.6,s*0.025,0,Math.PI*2);ctx.fill();}},
  { id:'scarf',   name:'스카프', draw:(ctx,x,y,s)=>{ctx.fillStyle='#67e8f9';ctx.beginPath();ctx.ellipse(x,y+s*0.15,s*0.35,s*0.08,0,0,Math.PI);ctx.fill();ctx.beginPath();ctx.moveTo(x+s*0.1,y+s*0.2);ctx.lineTo(x+s*0.2,y+s*0.4);ctx.lineTo(x+s*0.08,y+s*0.35);ctx.closePath();ctx.fill();}},
  { id:'gem',     name:'보석',   draw:(ctx,x,y,s)=>{ctx.fillStyle='#c084fc';ctx.beginPath();ctx.moveTo(x,y-s*0.12);ctx.lineTo(x+s*0.06,y-s*0.06);ctx.lineTo(x,y);ctx.lineTo(x-s*0.06,y-s*0.06);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=s*0.01;ctx.stroke();}},
];

// ── 6날개 타입 ──
export const WING_TYPES = [
  { id:'none',      name:'없음',   draw:()=>{} },
  { id:'fairy',     name:'요정날개',draw:(ctx,x,y,s,c)=>{ctx.fillStyle=c+'44';ctx.strokeStyle=c;ctx.lineWidth=s*0.01;ctx.beginPath();ctx.ellipse(x-s*0.45,y-s*0.1,s*0.2,s*0.35,Math.PI*0.15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(x+s*0.45,y-s*0.1,s*0.2,s*0.35,-Math.PI*0.15,0,Math.PI*2);ctx.fill();ctx.stroke();}},
  { id:'butterfly', name:'나비날개',draw:(ctx,x,y,s,c)=>{ctx.fillStyle=c+'55';ctx.strokeStyle=c;ctx.lineWidth=s*0.01;[[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([dx,dy])=>{ctx.beginPath();ctx.ellipse(x+dx*s*0.42,y+dy*s*0.12,s*0.18,s*0.22,dx*0.3,0,Math.PI*2);ctx.fill();ctx.stroke();});}},
  { id:'angel',     name:'천사날개',draw:(ctx,x,y,s,c)=>{ctx.fillStyle='#fff8';ctx.strokeStyle='#fff';ctx.lineWidth=s*0.01;[-1,1].forEach(dx=>{ctx.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+dx*(i/4)*Math.PI*0.6;const r=s*0.3+i*s*0.03;ctx.arc(x+dx*s*0.3,y-s*0.05,r,a-0.15,a+0.15);}ctx.fill();ctx.stroke();});}},
  { id:'leaf',      name:'나뭇잎날개',draw:(ctx,x,y,s,c)=>{ctx.fillStyle='#228B2266';ctx.strokeStyle='#228B22';ctx.lineWidth=s*0.01;[-1,1].forEach(dx=>{ctx.beginPath();ctx.moveTo(x+dx*s*0.2,y);ctx.quadraticCurveTo(x+dx*s*0.55,y-s*0.3,x+dx*s*0.3,y-s*0.15);ctx.quadraticCurveTo(x+dx*s*0.55,y+s*0.1,x+dx*s*0.2,y);ctx.fill();ctx.stroke();});}},
  { id:'flame',     name:'불꽃날개',draw:(ctx,x,y,s,c)=>{[-1,1].forEach(dx=>{const grd=ctx.createRadialGradient(x+dx*s*0.35,y,0,x+dx*s*0.35,y,s*0.3);grd.addColorStop(0,'#FF450088');grd.addColorStop(1,'#FF450000');ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(x+dx*s*0.2,y+s*0.1);ctx.quadraticCurveTo(x+dx*s*0.5,y-s*0.15,x+dx*s*0.35,y-s*0.35);ctx.quadraticCurveTo(x+dx*s*0.55,y-s*0.1,x+dx*s*0.45,y+s*0.15);ctx.quadraticCurveTo(x+dx*s*0.35,y+s*0.2,x+dx*s*0.2,y+s*0.1);ctx.fill();});}},
];

// ── 레어도 1~5 ──
export const RARITY_LEVELS = [
  { level:1, name:'일반',  color:'#9ca3af', multiplier:1.0, glowSize:0 },
  { level:2, name:'희귀',  color:'#3b82f6', multiplier:1.4, glowSize:5 },
  { level:3, name:'마법',  color:'#a855f7', multiplier:2.0, glowSize:10 },
  { level:4, name:'전설',  color:'#f59e0b', multiplier:3.0, glowSize:15 },
  { level:5, name:'신화',  color:'#ef4444', multiplier:5.0, glowSize:20 },
];

// ── 이름 파츠 ──
const NAME_PREFIX = {
  fire:['불꽃','화염','용암','태양'],
  water:['물방울','파도','안개','이슬'],
  earth:['바위','모래','산','흙'],
  wind:['바람','폭풍','산들바람','회오리'],
  light:['빛','별빛','달빛','햇살'],
  dark:['그림자','암흑','밤','월식'],
  nature:['초록','숲','나뭇잎','꽃'],
  ice:['얼음','서리','눈','빙하'],
};
const NAME_SUFFIX = ['이','돌이','별','꿈','솜','비','봄','달','귀'];

function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function _drawStar(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.5;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ── Canvas 정령 그리기 ──
export function drawSpirit(ctx, spirit, x, y, size = 60) {
  const attr = ATTR_INFO[spirit.attribute];
  const rarity = RARITY_LEVELS[spirit.rarity - 1] || RARITY_LEVELS[0];
  const bodyDef = BODY_SHAPES.find(b => b.id === spirit.bodyShape) || BODY_SHAPES[0];
  const eyeDef = EYE_STYLES.find(e => e.id === spirit.eyeStyle) || EYE_STYLES[0];
  const decoDef = DECORATIONS.find(d => d.id === spirit.decoration) || DECORATIONS[0];
  const wingDef = WING_TYPES.find(w => w.id === spirit.wingType) || WING_TYPES[0];

  ctx.save();
  // Glow
  if (rarity.glowSize > 0) {
    ctx.shadowColor = attr.glow;
    ctx.shadowBlur = rarity.glowSize;
  }
  // Wings (behind body)
  wingDef.draw(ctx, x, y, size, attr.color);
  // Body
  ctx.fillStyle = attr.color + 'bb';
  ctx.strokeStyle = attr.color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  bodyDef.draw(ctx, x, y, size);
  // Eyes
  eyeDef.draw(ctx, x, y, size);
  // Decoration
  decoDef.draw(ctx, x, y, size);
  // Mouth
  ctx.strokeStyle = '#333';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(x, y + size * 0.05, size * 0.05, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

// ── Canvas 요정 그리기 (인간형 실루엣) ──
export function drawFairy(ctx, fairy, x, y, size = 60) {
  const attr = ATTR_INFO[fairy.attribute];
  const rarity = RARITY_LEVELS[fairy.rarity - 1] || RARITY_LEVELS[0];
  ctx.save();
  if (rarity.glowSize > 0) {
    ctx.shadowColor = attr.glow;
    ctx.shadowBlur = rarity.glowSize;
  }
  // Wings
  const wingDef = WING_TYPES.find(w => w.id === fairy.wingType) || WING_TYPES[1];
  wingDef.draw(ctx, x, y - size * 0.1, size, attr.color);
  ctx.shadowBlur = 0;
  // Head
  ctx.fillStyle = '#ffe4c4';
  ctx.strokeStyle = attr.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.25, size * 0.18, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Body (dress)
  ctx.fillStyle = attr.color + 'cc';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.15, y - size * 0.08);
  ctx.lineTo(x + size * 0.15, y - size * 0.08);
  ctx.lineTo(x + size * 0.22, y + size * 0.25);
  ctx.lineTo(x - size * 0.22, y + size * 0.25);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Legs
  ctx.strokeStyle = '#ffe4c4';
  ctx.lineWidth = size * 0.04;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.06, y + size * 0.25);
  ctx.lineTo(x - size * 0.08, y + size * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.06, y + size * 0.25);
  ctx.lineTo(x + size * 0.08, y + size * 0.42);
  ctx.stroke();
  // Eyes
  const eyeDef = EYE_STYLES.find(e => e.id === fairy.eyeStyle) || EYE_STYLES[1];
  eyeDef.draw(ctx, x, y - size * 0.2, size * 0.7);
  // Decoration
  const decoDef = DECORATIONS.find(d => d.id === fairy.decoration) || DECORATIONS[0];
  decoDef.draw(ctx, x, y - size * 0.15, size * 0.7);
  ctx.restore();
}

// ── 정령 랜덤 생성 (UnitFactory 경유) ──
export function generateSpirit(opts = {}) {
  const attr = opts.attribute || _pick(ATTRIBUTES);
  const rarity = opts.rarity || _rand(1, 5);
  const bodyShape = opts.bodyShape || _pick(BODY_SHAPES).id;
  const eyeStyle = opts.eyeStyle || _pick(EYE_STYLES).id;
  const decoration = opts.decoration || _pick(DECORATIONS).id;
  const wingType = opts.wingType || _pick(WING_TYPES).id;
  const name = _pick(NAME_PREFIX[attr]) + _pick(NAME_SUFFIX);

  // UnitFactory로 밸런스된 스탯 생성
  const spirit = UnitFactory.createSpirit({
    name,
    attribute: attr,
    rarity,
    level: 1,
    bodyShape,
    eyeStyle,
    decoration,
    wingType,
    emoji: ATTR_INFO[attr].emoji,
    with3D: opts.with3D || false,
  });

  return spirit;
}

// ── 요정 랜덤 생성 ──
export function generateFairy(opts = {}) {
  const attr = opts.attribute || _pick(ATTRIBUTES);
  const rarity = opts.rarity || _rand(1, 3);
  const r = RARITY_LEVELS[rarity - 1];
  const baseStats = { hp: 50, attack: 8, defense: 5, speed: 4, healPower: 4 };
  for (const k in baseStats) baseStats[k] = Math.round(baseStats[k] * r.multiplier * (0.9 + Math.random() * 0.2));
  return {
    id: 'fairy_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
    name: _pick(NAME_PREFIX[attr]) + ' 요정',
    attribute: attr,
    rarity,
    level: 1,
    bodyShape: 'slim',
    eyeStyle: opts.eyeStyle || _pick(EYE_STYLES).id,
    decoration: opts.decoration || _pick(DECORATIONS).id,
    wingType: opts.wingType || (Math.random() < 0.3 ? 'angel' : 'fairy'),
    stats: baseStats,
    emoji: '🧚',
    isFairy: true,
  };
}

// ── 배치 생성 ──
export function generateSpiritBatch(count = 10, opts = {}) {
  const batch = [];
  for (let i = 0; i < count; i++) batch.push(generateSpirit(opts));
  return batch;
}
