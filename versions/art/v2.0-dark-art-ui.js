// ============================================================
// 🎨 몽글벨 웹엔진 - UI 미술 시스템 (3/3)
// ============================================================
// Canvas 2D 기반 게임 UI 아트 자동 생성
// HP바, 데미지 숫자, 초상화, 카드, 아이콘 등
//
// Claude Code: js/art/art-ui.js 에 넣으세요
// ============================================================

const ArtUI = {

  _canvas: null,
  _ctx: null,
  _uiElements: new Map(),

  // ========== 색상 정의 ==========
  COLORS: {
    hp:       { fill: '#44DD44', bg: '#224422', border: '#66FF66', low: '#FF4444', mid: '#FFAA00' },
    mp:       { fill: '#4488FF', bg: '#222244', border: '#66AAFF' },
    exp:      { fill: '#FFDD44', bg: '#443300', border: '#FFEE88' },
    boss:     { fill: '#FF2222', bg: '#440000', border: '#FF6666' },
    gold:     '#FFD700',
    damage:   { physical: '#FF4444', magic: '#AA44FF', heal: '#44FF44', crit: '#FF8800' },
    rarity: {
      common: '#CCCCCC', uncommon: '#44CC44', rare: '#4488FF',
      epic: '#AA44FF', legendary: '#FF8800', mythic: '#FF2244'
    },
    elements: {
      fire: '#FF4422', water: '#2266FF', grass: '#22AA44',
      thunder: '#FFDD00', ice: '#44BBFF', earth: '#886644',
      light: '#FFDD44', dark: '#6622CC'
    }
  },

  // ========== 초기화 ==========
  init(canvasId) {
    this._canvas = document.getElementById(canvasId) || this._createOverlayCanvas();
    this._ctx = this._canvas.getContext('2d');
    // 리사이즈 대응
    window.addEventListener('resize', () => {
      if (this._canvas && this._canvas.id === 'monglebel-ui-overlay') {
        this._canvas.width = APP_W;
        this._canvas.height = APP_H;
      }
    });
    console.log('[ArtUI] UI 미술 시스템 초기화 완료');
    return this;
  },

  _createOverlayCanvas() {
    const canvas = document.createElement('canvas');
    canvas.id = 'monglebel-ui-overlay';
    canvas.width = APP_W;
    canvas.height = APP_H;
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:1000;';
    document.getElementById('app').appendChild(canvas);
    return canvas;
  },

  // ========== 외부 Canvas에서 사용하기 위한 헬퍼 ==========
  getContext() { return this._ctx; },
  getCanvas()  { return this._canvas; },

  // 임시로 다른 ctx에 그리기 (combat canvas 등)
  withContext(ctx, fn) {
    const savedCtx = this._ctx;
    this._ctx = ctx;
    fn(this);
    this._ctx = savedCtx;
  },

  // ========== HP 바 ==========
  drawHPBar(x, y, width, height, current, max, options = {}) {
    const ctx = this._ctx;
    const ratio = Math.max(0, Math.min(1, current / max));
    const colors = this.COLORS.hp;
    const isLow = ratio < 0.25;
    const isMid = ratio < 0.5 && !isLow;

    // 배경
    ctx.save();
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = colors.bg;
    ctx.fill();

    // HP 채움
    if (ratio > 0) {
      const fillWidth = width * ratio;
      this._roundRect(ctx, x, y, fillWidth, height, height / 2);
      const grad = ctx.createLinearGradient(x, y, x, y + height);
      const fillColor = isLow ? colors.low : isMid ? colors.mid : colors.fill;
      grad.addColorStop(0, this._lighten(fillColor, 30));
      grad.addColorStop(0.5, fillColor);
      grad.addColorStop(1, this._darken(fillColor, 20));
      ctx.fillStyle = grad;
      ctx.fill();

      // 광택
      this._roundRect(ctx, x + 2, y + 1, fillWidth - 4, height * 0.35, height / 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
    }

    // 테두리
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 텍스트
    if (options.showText !== false) {
      ctx.font = `bold ${Math.max(10, height - 4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.fillText(`${current}/${max}`, x + width / 2, y + height / 2);
      ctx.shadowBlur = 0;
    }

    // 깜빡임 (저HP)
    if (isLow && Math.sin(Date.now() * 0.01) > 0) {
      this._roundRect(ctx, x, y, width * ratio, height, height / 2);
      ctx.fillStyle = 'rgba(255,0,0,0.15)';
      ctx.fill();
    }

    ctx.restore();
  },

  // ========== 보스 HP 바 (상단 고정형) ==========
  drawBossHPBar(x, y, width, height, current, max, options = {}) {
    const ctx = this._ctx;
    const ratio = Math.max(0, Math.min(1, current / max));
    const colors = this.COLORS.boss;

    ctx.save();

    // 배경 패널
    this._roundRect(ctx, x - 4, y - 4, width + 8, height + 20, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fill();
    ctx.strokeStyle = '#660000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 보스 이름
    if (options.name) {
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF6666';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(options.name, x + width / 2, y - 8);
      ctx.shadowBlur = 0;
    }

    // HP 바 배경
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = colors.bg;
    ctx.fill();

    // HP 채움 — 3단계 색상
    if (ratio > 0) {
      this._roundRect(ctx, x, y, width * ratio, height, height / 2);
      let fillColor;
      if (ratio > 0.5) fillColor = '#44CC44';
      else if (ratio > 0.25) fillColor = '#FFAA00';
      else fillColor = '#FF2222';

      const grad = ctx.createLinearGradient(x, y, x, y + height);
      grad.addColorStop(0, this._lighten(fillColor, 30));
      grad.addColorStop(0.5, fillColor);
      grad.addColorStop(1, this._darken(fillColor, 20));
      ctx.fillStyle = grad;
      ctx.fill();

      // 광택
      this._roundRect(ctx, x + 2, y + 1, width * ratio - 4, height * 0.3, height / 4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
    }

    // 테두리
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // HP 텍스트
    ctx.font = `bold ${Math.max(12, height - 2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(`${current} / ${max}`, x + width / 2, y + height / 2);
    ctx.shadowBlur = 0;

    ctx.restore();
  },

  // ========== MP 바 ==========
  drawMPBar(x, y, width, height, current, max) {
    const ctx = this._ctx;
    const ratio = Math.max(0, Math.min(1, current / max));
    const colors = this.COLORS.mp;

    ctx.save();
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = colors.bg;
    ctx.fill();

    if (ratio > 0) {
      this._roundRect(ctx, x, y, width * ratio, height, height / 2);
      const grad = ctx.createLinearGradient(x, y, x, y + height);
      grad.addColorStop(0, '#66AAFF');
      grad.addColorStop(1, '#2244AA');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },

  // ========== EXP 바 ==========
  drawEXPBar(x, y, width, height, current, max) {
    const ctx = this._ctx;
    const ratio = Math.max(0, Math.min(1, current / max));

    ctx.save();
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = this.COLORS.exp.bg;
    ctx.fill();

    if (ratio > 0) {
      this._roundRect(ctx, x, y, width * ratio, height, height / 2);
      const grad = ctx.createLinearGradient(x, y, x + width, y);
      grad.addColorStop(0, '#FFCC00');
      grad.addColorStop(1, '#FFEE44');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  },

  // ========== 분노 게이지 바 ==========
  drawRageBar(x, y, width, height, current, max) {
    const ctx = this._ctx;
    const ratio = Math.max(0, Math.min(1, current / max));
    const isFull = ratio >= 1.0;

    ctx.save();
    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.fillStyle = '#331100';
    ctx.fill();

    if (ratio > 0) {
      this._roundRect(ctx, x, y, width * ratio, height, height / 2);
      const grad = ctx.createLinearGradient(x, y, x + width * ratio, y);
      grad.addColorStop(0, '#FF4400');
      grad.addColorStop(1, isFull ? '#FFDD00' : '#FF6600');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // 가득 찼을 때 펄스
    if (isFull) {
      const pulse = Math.sin(Date.now() * 0.008) * 0.15 + 0.15;
      this._roundRect(ctx, x, y, width, height, height / 2);
      ctx.fillStyle = `rgba(255,255,100,${pulse})`;
      ctx.fill();
    }

    this._roundRect(ctx, x, y, width, height, height / 2);
    ctx.strokeStyle = isFull ? '#FFDD00' : '#FF6600';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  },

  // ========== 데미지 숫자 ==========
  drawDamageNumber(x, y, damage, type, callback) {
    const ctx = this._ctx;
    const color = this.COLORS.damage[type] || this.COLORS.damage.physical;
    const isCrit = type === 'crit';
    const isHeal = type === 'heal';
    const prefix = isHeal ? '+' : '-';
    const text = prefix + Math.abs(damage);
    const fontSize = isCrit ? 32 : 22;

    let frame = 0;
    const maxFrames = 40;
    const startY = y;

    const animate = () => {
      frame++;
      if (frame > maxFrames) { if (callback) callback(); return; }

      const progress = frame / maxFrames;
      const currentY = startY - progress * 60;
      const alpha = 1 - Math.pow(progress, 2);
      const scale = isCrit ? 1 + Math.sin(progress * Math.PI) * 0.3 : 1;
      const shake = isCrit ? Math.sin(frame * 0.5) * 3 : 0;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${fontSize * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 외곽선
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(text, x + shake, currentY);

      // 내부
      if (isCrit) {
        const grad = ctx.createLinearGradient(x - 30, currentY - 15, x + 30, currentY + 15);
        grad.addColorStop(0, '#FFDD00');
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, '#FFDD00');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillText(text, x + shake, currentY);

      // CRIT 텍스트
      if (isCrit && frame < 15) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFDD00';
        ctx.fillText('CRIT!', x, currentY - 25);
      }

      ctx.restore();
      requestAnimationFrame(animate);
    };
    animate();
  },

  // ========== 캐릭터 초상화 프레임 ==========
  drawPortraitFrame(x, y, size, options = {}) {
    const ctx = this._ctx;
    const rarity = options.rarity || 'common';
    const element = options.element || 'fire';
    const borderColor = this.COLORS.rarity[rarity];
    const elemColor = this.COLORS.elements[element];
    const borderWidth = options.borderWidth || 3;

    ctx.save();

    // 배경
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    const bgGrad = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
    bgGrad.addColorStop(0, this._lighten(elemColor, 40));
    bgGrad.addColorStop(1, this._darken(elemColor, 30));
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // 스프라이트 이미지 (3D→2D 렌더링 결과)
    if (options.sprite && options.sprite instanceof HTMLCanvasElement) {
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, size/2 - borderWidth, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(options.sprite, x + borderWidth, y + borderWidth, size - borderWidth*2, size - borderWidth*2);
    } else if (options.emoji) {
      ctx.font = `${size * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.emoji, x + size/2, y + size/2);
    }

    // 테두리
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2 - borderWidth/2, 0, Math.PI * 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.stroke();

    // 레전더리+ 빛나는 효과
    if (['legendary', 'mythic'].includes(rarity)) {
      const glowSize = size/2 + 5 + Math.sin(Date.now() * 0.005) * 3;
      ctx.beginPath();
      ctx.arc(x + size/2, y + size/2, glowSize, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.15;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 원소 아이콘 (우하단)
    ctx.beginPath();
    ctx.arc(x + size - 8, y + size - 8, 10, 0, Math.PI * 2);
    ctx.fillStyle = elemColor;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 별 (등급)
    const stars = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
    const starCount = stars[rarity] || 1;
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    const starY = y + size + 8;
    for (let i = 0; i < starCount; i++) {
      const starX = x + size/2 + (i - (starCount-1)/2) * 12;
      ctx.fillStyle = '#FFD700';
      ctx.fillText('\u2B50', starX, starY);
    }

    ctx.restore();
  },

  // ========== 카드 UI ==========
  drawCard(x, y, width, height, options = {}) {
    const ctx = this._ctx;
    const rarity = options.rarity || 'common';
    const element = options.element || 'fire';
    const name = options.name || '카드';
    const borderColor = this.COLORS.rarity[rarity];
    const elemColor = this.COLORS.elements[element];
    const r = 8; // 모서리 반지름

    ctx.save();

    // 카드 배경
    this._roundRect(ctx, x, y, width, height, r);
    const cardGrad = ctx.createLinearGradient(x, y, x, y + height);
    cardGrad.addColorStop(0, this._lighten(elemColor, 30));
    cardGrad.addColorStop(0.4, elemColor);
    cardGrad.addColorStop(1, this._darken(elemColor, 40));
    ctx.fillStyle = cardGrad;
    ctx.fill();

    // 카드 테두리
    this._roundRect(ctx, x, y, width, height, r);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = ['legendary','mythic'].includes(rarity) ? 3 : 2;
    ctx.stroke();

    // 이미지 영역
    this._roundRect(ctx, x + 6, y + 6, width - 12, height * 0.5, r - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // 스프라이트 이미지 (3D→2D 렌더링 결과)
    if (options.sprite && options.sprite instanceof HTMLCanvasElement) {
      ctx.save();
      this._roundRect(ctx, x + 6, y + 6, width - 12, height * 0.5, r - 2);
      ctx.clip();
      ctx.drawImage(options.sprite, x + 6, y + 6, width - 12, height * 0.5);
      ctx.restore();
    } else if (options.emoji) {
      ctx.font = `${width * 0.35}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.emoji, x + width/2, y + height * 0.3);
    }

    // 이름
    ctx.font = `bold ${Math.min(14, width * 0.12)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 3;
    ctx.fillText(name, x + width/2, y + height * 0.6);
    ctx.shadowBlur = 0;

    // 스탯
    if (options.stats) {
      ctx.font = `${Math.min(11, width * 0.09)}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#DDDDDD';
      const statY = y + height * 0.7;
      if (options.stats.atk) ctx.fillText(`\u2694\uFE0F ${options.stats.atk}`, x + 8, statY);
      if (options.stats.def) ctx.fillText(`\uD83D\uDEE1\uFE0F ${options.stats.def}`, x + 8, statY + 15);
      if (options.stats.hp)  ctx.fillText(`\u2764\uFE0F ${options.stats.hp}`, x + width/2, statY);
      if (options.stats.spd) ctx.fillText(`\uD83D\uDCA8 ${options.stats.spd}`, x + width/2, statY + 15);
    }

    // 등급 별
    const stars = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, mythic: 6 };
    const starCount = stars[rarity] || 1;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i < starCount; i++) {
      const starX = x + width/2 + (i - (starCount-1)/2) * 14;
      ctx.fillText('\u2B50', starX, y + height - 10);
    }

    // 레전더리 반짝임
    if (['legendary', 'mythic'].includes(rarity)) {
      const shimmer = (Date.now() % 2000) / 2000;
      const shimmerX = x + shimmer * width;
      const grad = ctx.createLinearGradient(shimmerX - 30, y, shimmerX + 30, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      this._roundRect(ctx, x, y, width, height, r);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  },

  // ========== 골드 표시 ==========
  drawGoldCounter(x, y, amount) {
    const ctx = this._ctx;
    ctx.save();
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000000';
    ctx.fillText(`\uD83D\uDCB0 ${amount.toLocaleString()}`, x + 1, y + 1);
    ctx.fillStyle = this.COLORS.gold;
    ctx.fillText(`\uD83D\uDCB0 ${amount.toLocaleString()}`, x, y);
    ctx.restore();
  },

  // ========== 콤보 카운터 ==========
  drawComboCounter(x, y, combo) {
    if (combo < 2) return;
    const ctx = this._ctx;
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.05;
    const size = Math.min(48, 24 + combo * 2);

    ctx.save();
    ctx.font = `bold ${size * pulse}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeText(`${combo}x COMBO!`, x, y);

    const grad = ctx.createLinearGradient(x - 60, y - 20, x + 60, y + 20);
    grad.addColorStop(0, '#FF4400');
    grad.addColorStop(0.5, '#FFDD00');
    grad.addColorStop(1, '#FF4400');
    ctx.fillStyle = grad;
    ctx.fillText(`${combo}x COMBO!`, x, y);
    ctx.restore();
  },

  // ========== 미니맵 ==========
  drawMinimap(x, y, size, tiles, playerPos) {
    const ctx = this._ctx;
    const tileCount = tiles.length;
    if (tileCount === 0) return;

    ctx.save();

    // 배경
    this._roundRect(ctx, x, y, size, size, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 타일 (원형 배치)
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size * 0.35;

    tiles.forEach((tile, i) => {
      const angle = (i / tileCount) * Math.PI * 2 - Math.PI / 2;
      const tx = centerX + Math.cos(angle) * radius;
      const ty = centerY + Math.sin(angle) * radius;
      const tileSize = 4;

      ctx.beginPath();
      ctx.arc(tx, ty, tileSize, 0, Math.PI * 2);

      const tileColors = {
        gold: '#FFD700', item: '#4488FF', trap: '#FF4444',
        shop: '#44DD88', treasure: '#FFAA00', start: '#44FF44', goal: '#FF2222'
      };
      ctx.fillStyle = tileColors[tile.type] || '#888888';
      ctx.fill();
    });

    // 플레이어 위치
    if (playerPos !== undefined && playerPos < tileCount) {
      const pAngle = (playerPos / tileCount) * Math.PI * 2 - Math.PI / 2;
      const px = centerX + Math.cos(pAngle) * radius;
      const py = centerY + Math.sin(pAngle) * radius;

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#44FF44';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  },

  // ========== 등급 뱃지 ==========
  drawGradeBadge(x, y, grade) {
    const ctx = this._ctx;
    const colors = { S: '#FFD700', A: '#44DD44', B: '#4488FF', F: '#FF4444' };
    const bgColors = { S: '#8B6914', A: '#226622', B: '#223388', F: '#881111' };
    const size = 30;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = bgColors[grade] || '#444444';
    ctx.fill();
    ctx.strokeStyle = colors[grade] || '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = colors[grade] || '#FFFFFF';
    ctx.fillText(grade, x, y);
    ctx.restore();
  },

  // ========== UI 전체 클리어 ==========
  clear() {
    if (this._ctx) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  },

  // ========== 유틸리티 ==========
  _roundRect(ctx, x, y, w, h, r) {
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
  },

  _lighten(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0xFF) + percent);
    const b = Math.min(255, (num & 0xFF) + percent);
    return `rgb(${r},${g},${b})`;
  },

  _darken(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0xFF) - percent);
    const b = Math.max(0, (num & 0xFF) - percent);
    return `rgb(${r},${g},${b})`;
  },

  connectToEngine() {
    console.log('[ArtUI] UI 미술 시스템 준비 완료');
  }
};

if (typeof window !== 'undefined') window.ArtUI = ArtUI;
if (typeof module !== 'undefined') module.exports = ArtUI;
