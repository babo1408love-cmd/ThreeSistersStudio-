/**
 * spirit-generator.js — HD 정령/요정 외모 랜덤 생성기 (v2)
 * 128px+ 고품질 Canvas 2D 렌더링
 * 멀티레이어 컴포지팅, 그라디언트, 안티앨리어스, 애니메이션 지원
 * UnitFactory 연동 유지
 */
import UnitFactory from '../data/unit-factory.js';

// ── 8속성 ──
export const ATTRIBUTES = ['fire','water','earth','wind','light','dark','nature','ice'];
export const ATTR_INFO = {
  fire:   { name:'불',  emoji:'🔥', color:'#FF4500', glow:'rgba(255,69,0,0.5)',
            grad:['#FF6B35','#FF4500','#CC3700'], accent:'#FFD700', particle:'#FF8844' },
  water:  { name:'물',  emoji:'💧', color:'#1E90FF', glow:'rgba(30,144,255,0.5)',
            grad:['#5BB5FF','#1E90FF','#0066CC'], accent:'#87CEEB', particle:'#44BBFF' },
  earth:  { name:'땅',  emoji:'🪨', color:'#8B6914', glow:'rgba(139,105,20,0.5)',
            grad:['#B8860B','#8B6914','#6B4F0A'], accent:'#DEB887', particle:'#D2B48C' },
  wind:   { name:'바람', emoji:'🌪️', color:'#66CDAA', glow:'rgba(102,205,170,0.5)',
            grad:['#98FB98','#66CDAA','#3CB371'], accent:'#E0FFE0', particle:'#AAFFCC' },
  light:  { name:'빛',  emoji:'✨', color:'#FFD700', glow:'rgba(255,215,0,0.5)',
            grad:['#FFEC80','#FFD700','#DAA520'], accent:'#FFFFF0', particle:'#FFEE88' },
  dark:   { name:'어둠', emoji:'🌑', color:'#7B2FBE', glow:'rgba(123,47,190,0.5)',
            grad:['#9B59B6','#7B2FBE','#5B1F9E'], accent:'#DDA0DD', particle:'#BB77FF' },
  nature: { name:'자연', emoji:'🌿', color:'#228B22', glow:'rgba(34,139,34,0.5)',
            grad:['#3CB371','#228B22','#006400'], accent:'#90EE90', particle:'#66DD66' },
  ice:    { name:'얼음', emoji:'❄️', color:'#00CED1', glow:'rgba(0,206,209,0.5)',
            grad:['#B0E0E6','#00CED1','#008B8B'], accent:'#E0FFFF', particle:'#88EEFF' },
};

// ── 6몸체 형태 (HD) ──
export const BODY_SHAPES = [
  { id:'round',    name:'둥근형'   },
  { id:'slim',     name:'슬림형'   },
  { id:'star',     name:'별형'     },
  { id:'teardrop', name:'물방울'   },
  { id:'cloud',    name:'구름형'   },
  { id:'diamond',  name:'다이아'   },
];

// ── 6눈 스타일 ──
export const EYE_STYLES = [
  { id:'dot',     name:'점눈'     },
  { id:'round',   name:'동그란눈' },
  { id:'happy',   name:'행복눈'   },
  { id:'star',    name:'별눈'     },
  { id:'sleepy',  name:'졸린눈'   },
  { id:'sparkle', name:'반짝눈'   },
];

// ── 9장식 ──
export const DECORATIONS = [
  { id:'none',    name:'없음'   },
  { id:'crown',   name:'왕관'   },
  { id:'flower',  name:'꽃'     },
  { id:'ribbon',  name:'리본'   },
  { id:'halo',    name:'후광'   },
  { id:'horns',   name:'뿔'     },
  { id:'antenna', name:'더듬이' },
  { id:'scarf',   name:'스카프' },
  { id:'gem',     name:'보석'   },
];

// ── 6날개 타입 ──
export const WING_TYPES = [
  { id:'none',      name:'없음'       },
  { id:'fairy',     name:'요정날개'   },
  { id:'butterfly', name:'나비날개'   },
  { id:'angel',     name:'천사날개'   },
  { id:'leaf',      name:'나뭇잎날개' },
  { id:'flame',     name:'불꽃날개'   },
];

// ── 레어도 1~5 ──
export const RARITY_LEVELS = [
  { level:1, name:'일반',  color:'#9ca3af', multiplier:1.0, glowSize:0,  glowAlpha:0    },
  { level:2, name:'희귀',  color:'#3b82f6', multiplier:1.4, glowSize:8,  glowAlpha:0.25 },
  { level:3, name:'마법',  color:'#a855f7', multiplier:2.0, glowSize:14, glowAlpha:0.35 },
  { level:4, name:'전설',  color:'#f59e0b', multiplier:3.0, glowSize:20, glowAlpha:0.45 },
  { level:5, name:'신화',  color:'#ef4444', multiplier:5.0, glowSize:28, glowAlpha:0.55 },
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

// ══════════════════════════════════════════════
//  HD CANVAS 렌더링 — 몸체
// ══════════════════════════════════════════════

function _drawBodyHD(ctx, shape, x, y, s, grad, attr) {
  const g0 = grad[0], g1 = grad[1], g2 = grad[2];

  switch (shape) {
    case 'round': {
      const rg = ctx.createRadialGradient(x - s * 0.1, y - s * 0.12, s * 0.05, x, y, s * 0.45);
      rg.addColorStop(0, g0);
      rg.addColorStop(0.6, g1);
      rg.addColorStop(1, g2);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.4, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // 내부 하이라이트
      const hg = ctx.createRadialGradient(x - s * 0.08, y - s * 0.15, 0, x - s * 0.08, y - s * 0.15, s * 0.2);
      hg.addColorStop(0, 'rgba(255,255,255,0.35)');
      hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.ellipse(x - s * 0.05, y - s * 0.1, s * 0.22, s * 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'slim': {
      const rg = ctx.createRadialGradient(x, y - s * 0.1, s * 0.05, x, y, s * 0.5);
      rg.addColorStop(0, g0);
      rg.addColorStop(0.6, g1);
      rg.addColorStop(1, g2);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.28, s * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // 하이라이트
      _drawHighlight(ctx, x - s * 0.04, y - s * 0.2, s * 0.14, s * 0.18);
      break;
    }
    case 'star': {
      _drawStarPath(ctx, x, y, s * 0.4, 5);
      const rg = ctx.createRadialGradient(x, y, s * 0.05, x, y, s * 0.4);
      rg.addColorStop(0, g0);
      rg.addColorStop(0.7, g1);
      rg.addColorStop(1, g2);
      ctx.fillStyle = rg;
      ctx.fill();
      _drawHighlight(ctx, x - s * 0.06, y - s * 0.12, s * 0.12, s * 0.1);
      break;
    }
    case 'teardrop': {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.5);
      ctx.bezierCurveTo(x + s * 0.42, y - s * 0.08, x + s * 0.38, y + s * 0.42, x, y + s * 0.47);
      ctx.bezierCurveTo(x - s * 0.38, y + s * 0.42, x - s * 0.42, y - s * 0.08, x, y - s * 0.5);
      const rg = ctx.createRadialGradient(x, y - s * 0.1, s * 0.05, x, y + s * 0.1, s * 0.45);
      rg.addColorStop(0, g0);
      rg.addColorStop(0.6, g1);
      rg.addColorStop(1, g2);
      ctx.fillStyle = rg;
      ctx.fill();
      _drawHighlight(ctx, x - s * 0.05, y - s * 0.25, s * 0.12, s * 0.15);
      break;
    }
    case 'cloud': {
      const r = s * 0.2;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.3, r * 1.3, 0, Math.PI * 2);
      ctx.arc(x - r * 1.1, y + r * 0.4, r, 0, Math.PI * 2);
      ctx.arc(x + r * 1.1, y + r * 0.4, r, 0, Math.PI * 2);
      ctx.arc(x, y + r * 0.8, r * 1.1, 0, Math.PI * 2);
      const rg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.5, 0, x, y, r * 2.2);
      rg.addColorStop(0, g0);
      rg.addColorStop(0.5, g1);
      rg.addColorStop(1, g2);
      ctx.fillStyle = rg;
      ctx.fill();
      _drawHighlight(ctx, x - r * 0.4, y - r * 0.6, r * 0.7, r * 0.5);
      break;
    }
    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.5);
      ctx.lineTo(x + s * 0.35, y);
      ctx.lineTo(x, y + s * 0.5);
      ctx.lineTo(x - s * 0.35, y);
      ctx.closePath();
      const lg = ctx.createLinearGradient(x - s * 0.35, y - s * 0.5, x + s * 0.35, y + s * 0.5);
      lg.addColorStop(0, g0);
      lg.addColorStop(0.5, g1);
      lg.addColorStop(1, g2);
      ctx.fillStyle = lg;
      ctx.fill();
      // 보석 커팅 하이라이트
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.5);
      ctx.lineTo(x + s * 0.15, y - s * 0.1);
      ctx.lineTo(x - s * 0.15, y - s * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  // 공통 외곽 테두리 (부드러운 그림자)
  ctx.strokeStyle = g2 + '88';
  ctx.lineWidth = s * 0.015;
  ctx.stroke();
}

function _drawHighlight(ctx, x, y, rx, ry) {
  const hg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  hg.addColorStop(0, 'rgba(255,255,255,0.4)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.25, 0, Math.PI * 2);
  ctx.fill();
}

function _drawStarPath(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ══════════════════════════════════════════════
//  HD CANVAS 렌더링 — 눈
// ══════════════════════════════════════════════

function _drawEyesHD(ctx, style, x, y, s, accent) {
  const lx = x - s * 0.12, rx = x + s * 0.12;
  const ey = y - s * 0.06;

  switch (style) {
    case 'dot': {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(lx, ey, s * 0.045, 0, Math.PI * 2);
      ctx.arc(rx, ey, s * 0.045, 0, Math.PI * 2);
      ctx.fill();
      // 미세 반짝임
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(lx + s * 0.015, ey - s * 0.02, s * 0.012, 0, Math.PI * 2);
      ctx.arc(rx + s * 0.015, ey - s * 0.02, s * 0.012, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'round': {
      // 흰자
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(lx, ey, s * 0.075, s * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(rx, ey, s * 0.075, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = s * 0.008;
      ctx.beginPath();
      ctx.ellipse(lx, ey, s * 0.075, s * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(rx, ey, s * 0.075, s * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 홍채 (속성 색)
      const ig = ctx.createRadialGradient(lx, ey, 0, lx, ey, s * 0.04);
      ig.addColorStop(0, accent);
      ig.addColorStop(1, accent + '88');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(lx, ey + s * 0.01, s * 0.04, 0, Math.PI * 2);
      ctx.arc(rx, ey + s * 0.01, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
      // 동공
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(lx, ey + s * 0.01, s * 0.02, 0, Math.PI * 2);
      ctx.arc(rx, ey + s * 0.01, s * 0.02, 0, Math.PI * 2);
      ctx.fill();
      // 반짝임 (크기 2개)
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(lx - s * 0.02, ey - s * 0.015, s * 0.018, 0, Math.PI * 2);
      ctx.arc(rx - s * 0.02, ey - s * 0.015, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx + s * 0.025, ey + s * 0.02, s * 0.008, 0, Math.PI * 2);
      ctx.arc(rx + s * 0.025, ey + s * 0.02, s * 0.008, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'happy': {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = s * 0.025;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(lx, ey, s * 0.06, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rx, ey, s * 0.06, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      // 볼 터치
      ctx.fillStyle = 'rgba(255,150,150,0.25)';
      ctx.beginPath();
      ctx.ellipse(lx - s * 0.06, ey + s * 0.06, s * 0.045, s * 0.03, 0, 0, Math.PI * 2);
      ctx.ellipse(rx + s * 0.06, ey + s * 0.06, s * 0.045, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'star': {
      [lx, rx].forEach(ex => {
        // 별 배경
        _drawStarPath(ctx, ex, ey, s * 0.07, 4);
        const sg = ctx.createRadialGradient(ex, ey, 0, ex, ey, s * 0.07);
        sg.addColorStop(0, '#FFD700');
        sg.addColorStop(1, accent);
        ctx.fillStyle = sg;
        ctx.fill();
        // 중심 반짝임
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex, ey, s * 0.015, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'sleepy': {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = s * 0.022;
      ctx.lineCap = 'round';
      // 반쪽 감은 눈
      ctx.beginPath();
      ctx.moveTo(lx - s * 0.06, ey);
      ctx.quadraticCurveTo(lx, ey - s * 0.015, lx + s * 0.06, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx - s * 0.06, ey);
      ctx.quadraticCurveTo(rx, ey - s * 0.015, rx + s * 0.06, ey);
      ctx.stroke();
      // zzz
      ctx.fillStyle = 'rgba(100,100,255,0.3)';
      ctx.font = `${s * 0.08}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('z', rx + s * 0.12, ey - s * 0.1);
      ctx.font = `${s * 0.06}px sans-serif`;
      ctx.fillText('z', rx + s * 0.16, ey - s * 0.16);
      break;
    }
    case 'sparkle': {
      [lx, rx].forEach(ex => {
        // 흰자
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, s * 0.07, s * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = s * 0.005;
        ctx.stroke();
        // 홍채 (보라빛 그라디언트)
        const ig = ctx.createRadialGradient(ex, ey, 0, ex, ey, s * 0.045);
        ig.addColorStop(0, '#e879f9');
        ig.addColorStop(0.5, '#c084fc');
        ig.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.arc(ex, ey + s * 0.005, s * 0.045, 0, Math.PI * 2);
        ctx.fill();
        // 동공
        ctx.fillStyle = '#2e1065';
        ctx.beginPath();
        ctx.arc(ex, ey + s * 0.005, s * 0.018, 0, Math.PI * 2);
        ctx.fill();
        // 별 형태 반짝임 (큰거)
        ctx.fillStyle = '#fff';
        _drawStarPath(ctx, ex - s * 0.025, ey - s * 0.02, s * 0.02, 4);
        ctx.fill();
        // 작은 반짝임
        ctx.beginPath();
        ctx.arc(ex + s * 0.02, ey + s * 0.02, s * 0.008, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
  }
}

// ══════════════════════════════════════════════
//  HD CANVAS 렌더링 — 날개
// ══════════════════════════════════════════════

function _drawWingsHD(ctx, type, x, y, s, attr) {
  const color = attr.color;
  const grad = attr.grad;

  switch (type) {
    case 'none': break;
    case 'fairy': {
      [-1, 1].forEach(dx => {
        const wx = x + dx * s * 0.46;
        const wg = ctx.createRadialGradient(wx, y - s * 0.05, 0, wx, y - s * 0.05, s * 0.35);
        wg.addColorStop(0, grad[0] + '66');
        wg.addColorStop(0.5, grad[1] + '44');
        wg.addColorStop(1, grad[2] + '11');
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.ellipse(wx, y - s * 0.08, s * 0.2, s * 0.36, dx * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // 날개 맥
        ctx.strokeStyle = color + '33';
        ctx.lineWidth = s * 0.008;
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.2, y);
        ctx.quadraticCurveTo(wx, y - s * 0.15, wx + dx * s * 0.05, y - s * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.2, y);
        ctx.quadraticCurveTo(wx + dx * s * 0.05, y + s * 0.05, wx + dx * s * 0.08, y + s * 0.2);
        ctx.stroke();
      });
      break;
    }
    case 'butterfly': {
      [-1, 1].forEach(dx => {
        [[-1, -0.15], [1, 0.15]].forEach(([dy, offy]) => {
          const wx = x + dx * s * 0.44;
          const wy = y + dy * s * 0.13 + offy * s;
          const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, s * 0.22);
          wg.addColorStop(0, grad[0] + '77');
          wg.addColorStop(0.6, grad[1] + '55');
          wg.addColorStop(1, grad[2] + '22');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.ellipse(wx, wy, s * 0.18, s * 0.22, dx * 0.3, 0, Math.PI * 2);
          ctx.fill();
          // 무늬 동심원
          ctx.strokeStyle = attr.accent + '44';
          ctx.lineWidth = s * 0.006;
          ctx.beginPath();
          ctx.arc(wx, wy, s * 0.1, 0, Math.PI * 2);
          ctx.stroke();
        });
      });
      break;
    }
    case 'angel': {
      [-1, 1].forEach(dx => {
        // 깃털 레이어 (5개)
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + dx * (i / 5) * Math.PI * 0.55;
          const r = s * 0.28 + i * s * 0.025;
          const fx = x + dx * s * 0.28 + Math.cos(a) * r * 0.3;
          const fy = y - s * 0.05 + Math.sin(a) * r * 0.4;
          const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 0.12);
          fg.addColorStop(0, 'rgba(255,255,255,0.6)');
          fg.addColorStop(1, 'rgba(255,255,255,0.05)');
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.ellipse(fx, fy, s * 0.08, s * 0.12, a + Math.PI / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      break;
    }
    case 'leaf': {
      [-1, 1].forEach(dx => {
        const lg = ctx.createLinearGradient(x, y - s * 0.2, x + dx * s * 0.5, y + s * 0.1);
        lg.addColorStop(0, '#3CB37166');
        lg.addColorStop(1, '#22882200');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.2, y);
        ctx.quadraticCurveTo(x + dx * s * 0.55, y - s * 0.3, x + dx * s * 0.3, y - s * 0.15);
        ctx.quadraticCurveTo(x + dx * s * 0.55, y + s * 0.1, x + dx * s * 0.2, y);
        ctx.fill();
        // 잎맥
        ctx.strokeStyle = '#22882244';
        ctx.lineWidth = s * 0.006;
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.22, y - s * 0.02);
        ctx.quadraticCurveTo(x + dx * s * 0.4, y - s * 0.15, x + dx * s * 0.35, y - s * 0.12);
        ctx.stroke();
      });
      break;
    }
    case 'flame': {
      [-1, 1].forEach(dx => {
        const fg = ctx.createRadialGradient(
          x + dx * s * 0.35, y - s * 0.05, 0,
          x + dx * s * 0.35, y - s * 0.05, s * 0.32
        );
        fg.addColorStop(0, '#FFDD0088');
        fg.addColorStop(0.3, '#FF660066');
        fg.addColorStop(0.7, '#FF440033');
        fg.addColorStop(1, '#FF440000');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.2, y + s * 0.15);
        ctx.quadraticCurveTo(x + dx * s * 0.5, y - s * 0.1, x + dx * s * 0.38, y - s * 0.35);
        ctx.quadraticCurveTo(x + dx * s * 0.6, y - s * 0.05, x + dx * s * 0.48, y + s * 0.18);
        ctx.quadraticCurveTo(x + dx * s * 0.38, y + s * 0.22, x + dx * s * 0.2, y + s * 0.15);
        ctx.fill();
      });
      break;
    }
  }
}

// ══════════════════════════════════════════════
//  HD CANVAS 렌더링 — 장식
// ══════════════════════════════════════════════

function _drawDecoHD(ctx, deco, x, y, s, accent) {
  switch (deco) {
    case 'none': break;
    case 'crown': {
      const cg = ctx.createLinearGradient(x - s * 0.15, y - s * 0.55, x + s * 0.15, y - s * 0.42);
      cg.addColorStop(0, '#FFD700');
      cg.addColorStop(0.5, '#FFF8DC');
      cg.addColorStop(1, '#DAA520');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.16, y - s * 0.42);
      ctx.lineTo(x - s * 0.12, y - s * 0.54);
      ctx.lineTo(x - s * 0.04, y - s * 0.45);
      ctx.lineTo(x + s * 0.04, y - s * 0.56);
      ctx.lineTo(x + s * 0.12, y - s * 0.45);
      ctx.lineTo(x + s * 0.16, y - s * 0.54);
      ctx.lineTo(x + s * 0.16, y - s * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = s * 0.008;
      ctx.stroke();
      // 보석
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.48, s * 0.02, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'flower': {
      // 꽃잎 (5개, 그라디언트)
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(a) * s * 0.09;
        const py = y - s * 0.49 + Math.sin(a) * s * 0.09;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, s * 0.055);
        pg.addColorStop(0, '#FFB6C1');
        pg.addColorStop(1, '#FF69B4');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, py, s * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
      // 꽃 중앙
      const fg = ctx.createRadialGradient(x, y - s * 0.49, 0, x, y - s * 0.49, s * 0.035);
      fg.addColorStop(0, '#FFEE88');
      fg.addColorStop(1, '#FFD700');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.49, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ribbon': {
      const rg = ctx.createLinearGradient(x - s * 0.2, y - s * 0.52, x + s * 0.2, y - s * 0.42);
      rg.addColorStop(0, '#FF4444');
      rg.addColorStop(1, '#FF6B6B');
      ctx.fillStyle = rg;
      // 왼쪽 리본
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.43);
      ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.55, x - s * 0.2, y - s * 0.52);
      ctx.lineTo(x - s * 0.06, y - s * 0.43);
      ctx.closePath();
      ctx.fill();
      // 오른쪽 리본
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.43);
      ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.2, y - s * 0.52);
      ctx.lineTo(x + s * 0.06, y - s * 0.43);
      ctx.closePath();
      ctx.fill();
      // 매듭
      ctx.fillStyle = '#CC3333';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.43, s * 0.025, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'halo': {
      ctx.save();
      const hg = ctx.createLinearGradient(x - s * 0.2, y - s * 0.55, x + s * 0.2, y - s * 0.55);
      hg.addColorStop(0, 'rgba(255,215,0,0.3)');
      hg.addColorStop(0.5, 'rgba(255,255,200,0.6)');
      hg.addColorStop(1, 'rgba(255,215,0,0.3)');
      ctx.strokeStyle = hg;
      ctx.lineWidth = s * 0.025;
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.53, s * 0.2, s * 0.065, 0, 0, Math.PI * 2);
      ctx.stroke();
      // 글로우
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = s * 0.06;
      ctx.strokeStyle = 'rgba(255,215,0,0.15)';
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.53, s * 0.2, s * 0.065, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'horns': {
      [-1, 1].forEach(dx => {
        const hg = ctx.createLinearGradient(
          x + dx * s * 0.15, y - s * 0.38,
          x + dx * s * 0.25, y - s * 0.6
        );
        hg.addColorStop(0, '#9B59B6');
        hg.addColorStop(1, '#6C3483');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.12, y - s * 0.38);
        ctx.quadraticCurveTo(x + dx * s * 0.3, y - s * 0.5, x + dx * s * 0.25, y - s * 0.6);
        ctx.quadraticCurveTo(x + dx * s * 0.18, y - s * 0.48, x + dx * s * 0.08, y - s * 0.4);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    case 'antenna': {
      [-1, 1].forEach(dx => {
        ctx.strokeStyle = '#66BB66';
        ctx.lineWidth = s * 0.012;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + dx * s * 0.08, y - s * 0.45);
        ctx.quadraticCurveTo(x + dx * s * 0.15, y - s * 0.65, x + dx * s * 0.13, y - s * 0.62);
        ctx.stroke();
        // 끝 구슬
        const ag = ctx.createRadialGradient(
          x + dx * s * 0.13, y - s * 0.62, 0,
          x + dx * s * 0.13, y - s * 0.62, s * 0.03
        );
        ag.addColorStop(0, '#AAFFAA');
        ag.addColorStop(1, '#44BB44');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(x + dx * s * 0.13, y - s * 0.62, s * 0.028, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'scarf': {
      const sg = ctx.createLinearGradient(x - s * 0.35, y + s * 0.12, x + s * 0.35, y + s * 0.25);
      sg.addColorStop(0, '#67E8F9');
      sg.addColorStop(0.5, '#22D3EE');
      sg.addColorStop(1, '#06B6D4');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.ellipse(x, y + s * 0.16, s * 0.36, s * 0.08, 0, 0, Math.PI);
      ctx.fill();
      // 꼬리
      ctx.beginPath();
      ctx.moveTo(x + s * 0.1, y + s * 0.22);
      ctx.quadraticCurveTo(x + s * 0.2, y + s * 0.32, x + s * 0.22, y + s * 0.42);
      ctx.lineTo(x + s * 0.14, y + s * 0.38);
      ctx.quadraticCurveTo(x + s * 0.14, y + s * 0.3, x + s * 0.06, y + s * 0.22);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'gem': {
      // 보석 (다이아몬드 커팅)
      const gy = y - s * 0.08;
      const gg = ctx.createLinearGradient(x - s * 0.06, gy - s * 0.08, x + s * 0.06, gy + s * 0.04);
      gg.addColorStop(0, '#E8B4F8');
      gg.addColorStop(0.5, '#C084FC');
      gg.addColorStop(1, '#8B5CF6');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(x, gy - s * 0.1);
      ctx.lineTo(x + s * 0.07, gy - s * 0.02);
      ctx.lineTo(x + s * 0.04, gy + s * 0.06);
      ctx.lineTo(x - s * 0.04, gy + s * 0.06);
      ctx.lineTo(x - s * 0.07, gy - s * 0.02);
      ctx.closePath();
      ctx.fill();
      // 빛 반사
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(x, gy - s * 0.1);
      ctx.lineTo(x + s * 0.03, gy - s * 0.02);
      ctx.lineTo(x - s * 0.03, gy - s * 0.02);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

// ══════════════════════════════════════════════
//  HD CANVAS 렌더링 — 입
// ══════════════════════════════════════════════

function _drawMouthHD(ctx, x, y, s) {
  ctx.strokeStyle = 'rgba(60,30,30,0.5)';
  ctx.lineWidth = s * 0.014;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y + s * 0.06, s * 0.055, 0.1, Math.PI - 0.1);
  ctx.stroke();
}

// ══════════════════════════════════════════════
//  메인 드로잉 함수
// ══════════════════════════════════════════════

/**
 * HD 정령 그리기
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} spirit — { attribute, rarity, bodyShape, eyeStyle, decoration, wingType }
 * @param {number} x — 중심 X
 * @param {number} y — 중심 Y
 * @param {number} size — 크기 (기본 128)
 */
export function drawSpirit(ctx, spirit, x, y, size = 128) {
  const attr = ATTR_INFO[spirit.attribute] || ATTR_INFO.light;
  const rarity = RARITY_LEVELS[(spirit.rarity || 1) - 1] || RARITY_LEVELS[0];
  const bodyShape = spirit.bodyShape || 'round';
  const eyeStyle = spirit.eyeStyle || 'round';
  const deco = spirit.decoration || 'none';
  const wingType = spirit.wingType || 'none';

  ctx.save();

  // 레이어 1: 외부 글로우 (레어도 기반)
  if (rarity.glowSize > 0) {
    const gg = ctx.createRadialGradient(x, y, size * 0.2, x, y, size * 0.6 + rarity.glowSize);
    gg.addColorStop(0, attr.glow.replace('0.5', String(rarity.glowAlpha)));
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6 + rarity.glowSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 레이어 2: 그림자 (바닥)
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.42, size * 0.25, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // 레이어 3: 날개 (몸체 뒤)
  _drawWingsHD(ctx, wingType, x, y, size, attr);

  // 레이어 4: 몸체 (그라디언트)
  _drawBodyHD(ctx, bodyShape, x, y, size, attr.grad, attr);

  // 레이어 5: 눈
  _drawEyesHD(ctx, eyeStyle, x, y, size, attr.accent);

  // 레이어 6: 입
  _drawMouthHD(ctx, x, y, size);

  // 레이어 7: 장식
  _drawDecoHD(ctx, deco, x, y, size, attr.accent);

  // 레이어 8: 레어도 테두리 광택 (전설+)
  if (rarity.level >= 4) {
    ctx.strokeStyle = rarity.color + '55';
    ctx.lineWidth = size * 0.02;
    ctx.setLineDash([size * 0.04, size * 0.03]);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

/**
 * HD 요정 그리기 (인간형 실루엣)
 */
export function drawFairy(ctx, fairy, x, y, size = 128) {
  const attr = ATTR_INFO[fairy.attribute] || ATTR_INFO.light;
  const rarity = RARITY_LEVELS[(fairy.rarity || 1) - 1] || RARITY_LEVELS[0];

  ctx.save();

  // 글로우
  if (rarity.glowSize > 0) {
    const gg = ctx.createRadialGradient(x, y, size * 0.15, x, y, size * 0.5 + rarity.glowSize);
    gg.addColorStop(0, attr.glow.replace('0.5', String(rarity.glowAlpha)));
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5 + rarity.glowSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.45, size * 0.15, size * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  // 날개
  const wingType = fairy.wingType || 'fairy';
  _drawWingsHD(ctx, wingType, x, y - size * 0.1, size, attr);

  // 머리
  const headY = y - size * 0.25;
  const hg = ctx.createRadialGradient(x - size * 0.03, headY - size * 0.04, 0, x, headY, size * 0.2);
  hg.addColorStop(0, '#FFE8D0');
  hg.addColorStop(1, '#FFDAB9');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(x, headY, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = attr.color + '44';
  ctx.lineWidth = size * 0.008;
  ctx.stroke();

  // 머리카락
  ctx.fillStyle = attr.color + 'BB';
  ctx.beginPath();
  ctx.ellipse(x, headY - size * 0.12, size * 0.2, size * 0.1, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // 옆머리
  [-1, 1].forEach(dx => {
    ctx.beginPath();
    ctx.ellipse(x + dx * size * 0.14, headY + size * 0.02, size * 0.06, size * 0.12, dx * 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 드레스 (그라디언트)
  const dg = ctx.createLinearGradient(x, y - size * 0.08, x, y + size * 0.3);
  dg.addColorStop(0, attr.grad[0] + 'DD');
  dg.addColorStop(0.5, attr.grad[1] + 'CC');
  dg.addColorStop(1, attr.grad[2] + 'BB');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.15, y - size * 0.08);
  ctx.lineTo(x + size * 0.15, y - size * 0.08);
  ctx.quadraticCurveTo(x + size * 0.28, y + size * 0.15, x + size * 0.24, y + size * 0.28);
  ctx.quadraticCurveTo(x, y + size * 0.32, x - size * 0.24, y + size * 0.28);
  ctx.quadraticCurveTo(x - size * 0.28, y + size * 0.15, x - size * 0.15, y - size * 0.08);
  ctx.closePath();
  ctx.fill();

  // 다리
  const lg = ctx.createLinearGradient(x, y + size * 0.28, x, y + size * 0.44);
  lg.addColorStop(0, '#FFDAB9');
  lg.addColorStop(1, '#F4C9A8');
  ctx.strokeStyle = lg;
  ctx.lineWidth = size * 0.04;
  ctx.lineCap = 'round';
  [-1, 1].forEach(dx => {
    ctx.beginPath();
    ctx.moveTo(x + dx * size * 0.06, y + size * 0.27);
    ctx.lineTo(x + dx * size * 0.08, y + size * 0.43);
    ctx.stroke();
  });

  // 눈
  const eyeStyle = fairy.eyeStyle || 'sparkle';
  _drawEyesHD(ctx, eyeStyle, x, y - size * 0.2, size * 0.7, attr.accent);

  // 입
  _drawMouthHD(ctx, x, y - size * 0.16, size * 0.6);

  // 장식
  const deco = fairy.decoration || 'none';
  _drawDecoHD(ctx, deco, x, y - size * 0.15, size * 0.7, attr.accent);

  ctx.restore();
}

// ══════════════════════════════════════════════
//  정령 랜덤 생성
// ══════════════════════════════════════════════

export function generateSpirit(opts = {}) {
  const attr = opts.attribute || _pick(ATTRIBUTES);
  const rarity = opts.rarity || _rand(1, 5);
  const bodyShape = opts.bodyShape || _pick(BODY_SHAPES).id;
  const eyeStyle = opts.eyeStyle || _pick(EYE_STYLES).id;
  const decoration = opts.decoration || _pick(DECORATIONS).id;
  const wingType = opts.wingType || _pick(WING_TYPES).id;
  const name = _pick(NAME_PREFIX[attr]) + _pick(NAME_SUFFIX);

  const spirit = UnitFactory.createSpirit({
    name, attribute: attr, rarity, level: 1,
    bodyShape, eyeStyle, decoration, wingType,
    emoji: ATTR_INFO[attr].emoji,
    with3D: opts.with3D || false,
  });

  return spirit;
}

export function generateFairy(opts = {}) {
  const attr = opts.attribute || _pick(ATTRIBUTES);
  const rarity = opts.rarity || _rand(1, 3);
  const r = RARITY_LEVELS[rarity - 1];
  const baseStats = { hp: 50, attack: 8, defense: 5, speed: 4, healPower: 4 };
  for (const k in baseStats) baseStats[k] = Math.round(baseStats[k] * r.multiplier * (0.9 + Math.random() * 0.2));
  return {
    id: 'fairy_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
    name: _pick(NAME_PREFIX[attr]) + ' 요정',
    attribute: attr, rarity, level: 1,
    bodyShape: 'slim',
    eyeStyle: opts.eyeStyle || _pick(EYE_STYLES).id,
    decoration: opts.decoration || _pick(DECORATIONS).id,
    wingType: opts.wingType || (Math.random() < 0.3 ? 'angel' : 'fairy'),
    stats: baseStats, emoji: '🧚', isFairy: true,
  };
}

export function generateSpiritBatch(count = 10, opts = {}) {
  const batch = [];
  for (let i = 0; i < count; i++) batch.push(generateSpirit(opts));
  return batch;
}
