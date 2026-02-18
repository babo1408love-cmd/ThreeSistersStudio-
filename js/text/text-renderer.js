// ============================================================
// 🌐 몽글벨 웹엔진 - 고퀄 텍스트 렌더러 (2/3)
// ============================================================
// 게임용 고품질 텍스트 그리기 (외곽선/그림자/그라데이션/이펙트)
// Canvas2D + 3D 텍스트 (Three.js 텍스처)
//
// Claude Code: js/text/text-renderer.js 에 넣으세요
// ============================================================

const TextRenderer = {

  // ========== 텍스트 스타일 프리셋 ==========
  STYLES: {
    title: {
      size: 48, weight: 900, style: 'display',
      fill: { type: 'gradient', colors: ['#FFD700', '#FF8800', '#FFD700'] },
      stroke: { color: '#442200', width: 4 },
      shadow: { color: '#000000', blur: 8, offsetX: 3, offsetY: 3 },
      letterSpacing: 2
    },
    subtitle: {
      size: 28, weight: 700, style: 'display',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: { color: '#222244', width: 2 },
      shadow: { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 },
      letterSpacing: 1
    },
    characterName: {
      size: 18, weight: 700, style: 'bold',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: { color: '#000000', width: 3 },
      shadow: { color: '#000000', blur: 2, offsetX: 1, offsetY: 1 },
      letterSpacing: 0
    },
    dialogue: {
      size: 16, weight: 400, style: 'body',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: null,
      shadow: { color: '#000000', blur: 2, offsetX: 1, offsetY: 1 },
      letterSpacing: 0
    },
    damage: {
      size: 28, weight: 900, style: 'bold',
      fill: { type: 'solid', color: '#FF4444' },
      stroke: { color: '#000000', width: 3 },
      shadow: { color: '#660000', blur: 4, offsetX: 2, offsetY: 2 },
      letterSpacing: 1
    },
    critical: {
      size: 36, weight: 900, style: 'bold',
      fill: { type: 'gradient', colors: ['#FF4400', '#FFDD00', '#FF4400'] },
      stroke: { color: '#000000', width: 4 },
      shadow: { color: '#FF0000', blur: 12, offsetX: 0, offsetY: 0 },
      letterSpacing: 2
    },
    heal: {
      size: 24, weight: 700, style: 'bold',
      fill: { type: 'solid', color: '#44FF44' },
      stroke: { color: '#004400', width: 2 },
      shadow: { color: '#00FF00', blur: 8, offsetX: 0, offsetY: 0 },
      letterSpacing: 1
    },
    gold: {
      size: 20, weight: 700, style: 'bold',
      fill: { type: 'gradient', colors: ['#FFEE44', '#FFD700', '#FFEE44'] },
      stroke: { color: '#553300', width: 2 },
      shadow: { color: '#000000', blur: 3, offsetX: 1, offsetY: 1 },
      letterSpacing: 0
    },
    system: {
      size: 14, weight: 400, style: 'body',
      fill: { type: 'solid', color: '#AAAAAA' },
      stroke: null,
      shadow: null,
      letterSpacing: 0
    },
    button: {
      size: 16, weight: 600, style: 'body',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: null,
      shadow: { color: '#000000', blur: 2, offsetX: 1, offsetY: 1 },
      letterSpacing: 0.5
    },
    bossName: {
      size: 32, weight: 900, style: 'fantasy',
      fill: { type: 'gradient', colors: ['#FF2222', '#FF6644', '#FF2222'] },
      stroke: { color: '#000000', width: 4 },
      shadow: { color: '#FF0000', blur: 15, offsetX: 0, offsetY: 0 },
      letterSpacing: 3
    },
    itemName: {
      size: 14, weight: 600, style: 'body',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: { color: '#000000', width: 2 },
      shadow: null,
      letterSpacing: 0
    },
    quest: {
      size: 14, weight: 400, style: 'body',
      fill: { type: 'solid', color: '#FFDD88' },
      stroke: { color: '#000000', width: 1.5 },
      shadow: null,
      letterSpacing: 0
    },
    stageNumber: {
      size: 60, weight: 900, style: 'display',
      fill: { type: 'gradient', colors: ['#FFFFFF', '#AABBCC', '#FFFFFF'] },
      stroke: { color: '#223344', width: 5 },
      shadow: { color: '#000000', blur: 10, offsetX: 4, offsetY: 4 },
      letterSpacing: 4
    },
    levelUp: {
      size: 40, weight: 900, style: 'bold',
      fill: { type: 'gradient', colors: ['#FFEE00', '#FFFFFF', '#FFEE00'] },
      stroke: { color: '#886600', width: 4 },
      shadow: { color: '#FFDD00', blur: 20, offsetX: 0, offsetY: 0 },
      letterSpacing: 3
    },
    combo: {
      size: 30, weight: 900, style: 'bold',
      fill: { type: 'gradient', colors: ['#FF4400', '#FFDD00', '#FF4400'] },
      stroke: { color: '#000000', width: 3 },
      shadow: { color: '#FF4400', blur: 10, offsetX: 0, offsetY: 0 },
      letterSpacing: 2
    },
    pixel: {
      size: 16, weight: 400, style: 'pixel',
      fill: { type: 'solid', color: '#FFFFFF' },
      stroke: { color: '#000000', width: 2 },
      shadow: null,
      letterSpacing: 1
    }
  },

  // ========== 등급별 색상 ==========
  RARITY_COLORS: {
    common:    { fill: '#CCCCCC', stroke: '#666666', glow: null },
    uncommon:  { fill: '#44DD44', stroke: '#226622', glow: null },
    rare:      { fill: '#4488FF', stroke: '#223388', glow: '#4488FF' },
    epic:      { fill: '#AA44FF', stroke: '#552288', glow: '#AA44FF' },
    legendary: { fill: '#FF8800', stroke: '#884400', glow: '#FF8800' },
    mythic:    { fill: '#FF2244', stroke: '#881122', glow: '#FF2244' }
  },

  // =============================================================
  // 메인 렌더 함수
  // =============================================================
  draw(ctx, text, x, y, options = {}) {
    if (!text || !ctx) return;

    const preset = options.preset ? this.STYLES[options.preset] : {};
    const config = { ...preset, ...options };
    const lang = options.lang || (typeof TextEngine !== 'undefined' ? TextEngine.detectLanguage(text) : 'en');

    const fontStr = (typeof TextEngine !== 'undefined')
      ? TextEngine.getFont({ text, lang, size: config.size, weight: config.weight, style: config.style, italic: config.italic })
      : (config.weight || 400) + ' ' + (config.size || 16) + 'px sans-serif';

    ctx.save();

    const dir = (typeof TextEngine !== 'undefined') ? TextEngine.getTextDirection(text) : 'ltr';
    if (dir === 'rtl') {
      ctx.direction = 'rtl';
    }

    ctx.font = fontStr;
    ctx.textAlign = options.align || 'left';
    ctx.textBaseline = options.baseline || 'top';

    const letterSpacing = config.letterSpacing || 0;
    if (letterSpacing > 0) {
      this._drawWithSpacing(ctx, text, x, y, letterSpacing, config);
    } else {
      this._drawText(ctx, text, x, y, config);
    }

    ctx.restore();
  },

  _drawWithSpacing(ctx, text, x, y, spacing, config) {
    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      this._drawText(ctx, char, currentX, y, config);
      currentX += ctx.measureText(char).width + spacing;
    }
  },

  _drawText(ctx, text, x, y, config) {
    if (config.shadow) {
      ctx.shadowColor = config.shadow.color || '#000000';
      ctx.shadowBlur = config.shadow.blur || 0;
      ctx.shadowOffsetX = config.shadow.offsetX || 0;
      ctx.shadowOffsetY = config.shadow.offsetY || 0;
    }

    if (config.stroke) {
      ctx.strokeStyle = config.stroke.color || '#000000';
      ctx.lineWidth = config.stroke.width || 2;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(text, x, y);
    }

    if (config.shadow && config.stroke) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    if (config.fill) {
      if (config.fill.type === 'gradient') {
        const colors = config.fill.colors || ['#FFFFFF', '#CCCCCC'];
        const metrics = ctx.measureText(text);
        const grad = config.fill.direction === 'horizontal'
          ? ctx.createLinearGradient(x, y, x + metrics.width, y)
          : ctx.createLinearGradient(x, y, x, y + (config.size || 16));

        colors.forEach((c, i) => {
          grad.addColorStop(i / (colors.length - 1), c);
        });
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = config.fill.color || config.fill || '#FFFFFF';
      }
      ctx.fillText(text, x, y);
    }
  },

  // =============================================================
  // 게임용 특수 텍스트
  // =============================================================

  drawFloatingText(ctx, text, x, y, options = {}) {
    const startTime = Date.now();
    const duration = options.duration || 1200;
    const floatHeight = options.floatHeight || 60;
    const preset = options.preset || 'damage';
    const scale = options.startScale || 1.5;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress >= 1) {
        if (options.onComplete) options.onComplete();
        return;
      }

      const currentY = y - progress * floatHeight;
      const alpha = 1 - Math.pow(progress, 1.5);
      const currentScale = scale - (scale - 1) * Math.min(1, progress * 3);

      ctx.save();
      ctx.globalAlpha = alpha;

      if (currentScale !== 1) {
        ctx.translate(x, currentY);
        ctx.scale(currentScale, currentScale);
        ctx.translate(-x, -currentY);
      }

      this.draw(ctx, text, x, currentY, {
        preset, align: 'center', baseline: 'middle',
        ...options
      });

      ctx.restore();
      requestAnimationFrame(animate);
    };
    animate();
  },

  drawTypingText(ctx, text, x, y, options = {}) {
    const speed = options.speed || 50;
    const preset = options.preset || 'dialogue';
    let charIndex = 0;

    const type = () => {
      charIndex++;
      if (charIndex > text.length) {
        if (options.onComplete) options.onComplete();
        return;
      }

      const visibleText = text.substring(0, charIndex);

      if (options.clearArea) {
        const area = options.clearArea;
        ctx.clearRect(area.x, area.y, area.width, area.height);
      }

      if (typeof TextEngine !== 'undefined' && options.maxWidth) {
        const lines = TextEngine.wrapText(visibleText, options.maxWidth, { size: options.size });
        const lineHeight = (options.size || 16) * 1.4;
        lines.forEach((line, i) => {
          this.draw(ctx, line, x, y + i * lineHeight, { preset, ...options });
        });
      } else {
        this.draw(ctx, visibleText, x, y, { preset, ...options });
      }

      setTimeout(type, speed);
    };
    type();
  },

  drawShakingText(ctx, text, x, y, options = {}) {
    const intensity = options.intensity || 3;
    const preset = options.preset || 'bossName';

    const shakeX = x + (Math.random() - 0.5) * intensity;
    const shakeY = y + (Math.random() - 0.5) * intensity;

    this.draw(ctx, text, shakeX, shakeY, { preset, ...options, align: 'center', baseline: 'middle' });
  },

  drawRainbowText(ctx, text, x, y, options = {}) {
    const size = options.size || 24;
    const time = Date.now() * 0.003;

    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const hue = ((i / text.length) * 360 + time * 50) % 360;
      const color = 'hsl(' + hue + ', 100%, 60%)';

      this.draw(ctx, text[i], currentX, y, {
        ...options,
        fill: { type: 'solid', color },
        stroke: { color: '#000000', width: 2 },
        size
      });

      ctx.font = (typeof TextEngine !== 'undefined')
        ? TextEngine.getFont({ text: text[i], size, weight: options.weight || 700 })
        : '700 ' + size + 'px sans-serif';
      currentX += ctx.measureText(text[i]).width + (options.letterSpacing || 1);
    }
  },

  drawWaveText(ctx, text, x, y, options = {}) {
    const size = options.size || 20;
    const amplitude = options.amplitude || 5;
    const speed = options.speed || 3;
    const time = Date.now() * 0.001 * speed;

    let currentX = x;
    for (let i = 0; i < text.length; i++) {
      const waveY = y + Math.sin(time + i * 0.5) * amplitude;

      this.draw(ctx, text[i], currentX, waveY, {
        ...options,
        size
      });

      ctx.font = (typeof TextEngine !== 'undefined')
        ? TextEngine.getFont({ text: text[i], size, weight: options.weight || 400 })
        : '400 ' + size + 'px sans-serif';
      currentX += ctx.measureText(text[i]).width + (options.letterSpacing || 0);
    }
  },

  // ========== 아이템 등급 텍스트 ==========
  drawRarityText(ctx, text, x, y, rarity, options = {}) {
    const rarityStyle = this.RARITY_COLORS[rarity] || this.RARITY_COLORS.common;

    const config = {
      ...options,
      preset: 'itemName',
      fill: { type: 'solid', color: rarityStyle.fill },
      stroke: { color: rarityStyle.stroke, width: 2 }
    };

    if (rarityStyle.glow) {
      config.shadow = { color: rarityStyle.glow, blur: 8, offsetX: 0, offsetY: 0 };
    }

    this.draw(ctx, text, x, y, config);
  },

  // =============================================================
  // Three.js 3D 텍스트 (월드 스페이스) — 3D기반 2D 게임용
  // =============================================================
  create3DText(text, options = {}) {
    if (typeof THREE === 'undefined') return null;

    const size = options.size || 24;
    const preset = options.preset || 'characterName';
    const padding = 8;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const fontStr = (typeof TextEngine !== 'undefined')
      ? TextEngine.getFont({ text, size, weight: 700, style: 'bold' })
      : '700 ' + size + 'px sans-serif';
    ctx.font = fontStr;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width + padding * 2;
    const textHeight = size * 1.5 + padding * 2;

    // 2의 거듭제곱 크기 (GPU 텍스처 최적화)
    canvas.width = Math.pow(2, Math.ceil(Math.log2(textWidth)));
    canvas.height = Math.pow(2, Math.ceil(Math.log2(textHeight)));

    if (options.background) {
      ctx.fillStyle = options.background;
      this._roundRect3D(ctx, 0, 0, textWidth, textHeight, 6);
      ctx.fill();
    }

    this.draw(ctx, text, padding, padding, { preset, size, ...options });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);

    const worldScale = options.worldScale || 0.01;
    sprite.scale.set(canvas.width * worldScale, canvas.height * worldScale, 1);

    return sprite;
  },

  // 3D 이름표 — 캐릭터 머리 위에 떠있는 이름 (3D기반 2D 스프라이트 캡처 시 유용)
  create3DNameplate(name, options = {}) {
    if (typeof THREE === 'undefined') return null;

    const rarity = options.rarity || 'common';
    const rarityStyle = this.RARITY_COLORS[rarity] || this.RARITY_COLORS.common;

    return this.create3DText(name, {
      preset: 'characterName',
      size: options.size || 16,
      fill: { type: 'solid', color: rarityStyle.fill },
      stroke: { color: rarityStyle.stroke, width: 2 },
      shadow: rarityStyle.glow ? { color: rarityStyle.glow, blur: 6, offsetX: 0, offsetY: 0 } : null,
      background: 'rgba(0,0,0,0.5)',
      worldScale: options.worldScale || 0.008,
      ...options,
    });
  },

  _roundRect3D(ctx, x, y, w, h, r) {
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

  connectToEngine() {
    console.log('[TextRenderer] 텍스트 렌더러 준비 완료');
  }
};

if (typeof window !== 'undefined') window.TextRenderer = TextRenderer;
if (typeof module !== 'undefined') module.exports = TextRenderer;
