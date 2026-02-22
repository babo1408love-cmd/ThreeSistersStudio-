// ============================================================
// 🎭 몽글벨 웹엔진 - 트윈/애니메이션 엔진 (8/8)
// ============================================================
// 이징 함수 30종 + 속성 애니메이션 + 체인 + UI 트랜지션
//
// Claude Code: js/core/tween-engine.js 에 넣으세요
// ============================================================

const TweenEngine = {

  _tweens: [],
  _nextId: 1,

  // ========== 이징 함수 (30종) ==========
  EASE: {
    linear: t => t,
    // Quad
    inQuad: t => t * t,
    outQuad: t => t * (2 - t),
    inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    // Cubic
    inCubic: t => t * t * t,
    outCubic: t => (--t) * t * t + 1,
    inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    // Quart
    inQuart: t => t * t * t * t,
    outQuart: t => 1 - (--t) * t * t * t,
    inOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    // Sine
    inSine: t => 1 - Math.cos(t * Math.PI / 2),
    outSine: t => Math.sin(t * Math.PI / 2),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    // Expo
    inExpo: t => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    inOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    // Circ
    inCirc: t => 1 - Math.sqrt(1 - t * t),
    outCirc: t => Math.sqrt(1 - (--t) * t),
    // Back
    inBack: t => 2.70158 * t * t * t - 1.70158 * t * t,
    outBack: t => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    inOutBack: t => {
      const c = 1.70158 * 1.525;
      return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
    },
    // Elastic
    inElastic: t => t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (2 * Math.PI / 3)),
    outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
    inOutElastic: t => {
      const c = (2 * Math.PI) / 4.5;
      return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
    },
    // Bounce
    outBounce: t => {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    inBounce: t => 1 - TweenEngine.EASE.outBounce(1 - t),
    // Spring
    spring: t => 1 - Math.cos(t * 4.5 * Math.PI) * Math.exp(-t * 6),
    // Smooth
    smooth: t => t * t * (3 - 2 * t),
    smoother: t => t * t * t * (t * (t * 6 - 15) + 10)
  },

  // ========== 매 프레임 업데이트 ==========
  update(dt) {
    const dtMs = dt * 1000;
    for (let i = this._tweens.length - 1; i >= 0; i--) {
      const tw = this._tweens[i];
      if (tw.paused || tw.delay > 0) {
        tw.delay -= dtMs;
        continue;
      }

      tw.elapsed += dtMs;
      const progress = Math.min(1, tw.elapsed / tw.duration);
      const easedProgress = tw.easeFn(progress);

      // 속성 업데이트
      Object.keys(tw.from).forEach(key => {
        const start = tw.from[key];
        const end = tw.to[key];
        tw.target[key] = start + (end - start) * easedProgress;
      });

      // 콜백
      if (tw.onUpdate) tw.onUpdate(easedProgress, tw.target);

      // 완료
      if (progress >= 1) {
        if (tw.yoyo && !tw._yoyoBack) {
          // 요요: 돌아가기
          const temp = { ...tw.from };
          tw.from = { ...tw.to };
          tw.to = temp;
          tw.elapsed = 0;
          tw._yoyoBack = true;
          tw.repeat--;
        } else if (tw.repeat > 0 || tw.repeat === -1) {
          tw.elapsed = 0;
          tw._yoyoBack = false;
          if (tw.repeat > 0) tw.repeat--;
          if (tw.yoyo) {
            const temp = { ...tw.from };
            tw.from = { ...tw.to };
            tw.to = temp;
          }
        } else {
          if (tw.onComplete) tw.onComplete(tw.target);
          // 체인 실행
          if (tw._chain) {
            tw._chain.forEach(c => this._startTween(c));
          }
          this._tweens.splice(i, 1);
        }
      }
    }
  },

  // ========== 트윈 생성 ==========
  to(target, props, duration, options) {
    const from = {};
    const to = {};
    Object.keys(props).forEach(key => {
      from[key] = target[key] !== undefined ? target[key] : 0;
      to[key] = props[key];
    });

    const opt = options || {};
    const tween = {
      id: this._nextId++,
      target,
      from, to,
      duration: duration || 1000,
      elapsed: 0,
      delay: opt.delay || 0,
      easeFn: typeof opt.ease === 'function' ? opt.ease : (this.EASE[opt.ease] || this.EASE.outQuad),
      repeat: opt.repeat || 0,
      yoyo: opt.yoyo || false,
      _yoyoBack: false,
      paused: false,
      onUpdate: opt.onUpdate || null,
      onComplete: opt.onComplete || null,
      _chain: []
    };

    this._tweens.push(tween);
    return this._createChainable(tween);
  },

  from(target, props, duration, options) {
    const original = {};
    Object.keys(props).forEach(key => {
      original[key] = target[key] !== undefined ? target[key] : 0;
      target[key] = props[key];
    });
    return this.to(target, original, duration, options);
  },

  // ========== 체인 ==========
  _createChainable(tween) {
    return {
      id: tween.id,
      then: (target, props, duration, options) => {
        const from = {};
        const to = {};
        Object.keys(props).forEach(key => {
          from[key] = target[key] !== undefined ? target[key] : 0;
          to[key] = props[key];
        });
        const opt = options || {};
        const next = {
          id: this._nextId++, target, from, to,
          duration: duration || 1000, elapsed: 0,
          delay: opt.delay || 0,
          easeFn: typeof opt.ease === 'function' ? opt.ease : (this.EASE[opt.ease] || this.EASE.outQuad),
          repeat: opt.repeat || 0, yoyo: opt.yoyo || false, _yoyoBack: false, paused: false,
          onUpdate: opt.onUpdate || null, onComplete: opt.onComplete || null, _chain: []
        };
        tween._chain.push(next);
        return this._createChainable(next);
      },
      pause: () => { tween.paused = true; return this._createChainable(tween); },
      resume: () => { tween.paused = false; return this._createChainable(tween); },
      kill: () => { this.cancel(tween.id); }
    };
  },

  _startTween(tween) { this._tweens.push(tween); },

  // ========== 제어 ==========
  cancel(tweenId) {
    this._tweens = this._tweens.filter(t => t.id !== tweenId);
  },
  cancelTarget(target) {
    this._tweens = this._tweens.filter(t => t.target !== target);
  },
  cancelAll() { this._tweens = []; },

  // ========== UI 헬퍼 ==========
  fadeIn(element, duration, ease) {
    if (!element || !element.style) return;
    element.style.opacity = '0';
    element.style.display = '';
    const obj = { opacity: 0 };
    return this.to(obj, { opacity: 1 }, duration || 300, {
      ease: ease || 'outQuad',
      onUpdate: () => { element.style.opacity = obj.opacity; }
    });
  },

  fadeOut(element, duration, ease) {
    if (!element || !element.style) return;
    const obj = { opacity: parseFloat(element.style.opacity) || 1 };
    return this.to(obj, { opacity: 0 }, duration || 300, {
      ease: ease || 'inQuad',
      onUpdate: () => { element.style.opacity = obj.opacity; },
      onComplete: () => { element.style.display = 'none'; }
    });
  },

  slideIn(element, from, duration) {
    if (!element || !element.style) return;
    const dir = from || 'bottom';
    const axis = (dir === 'left' || dir === 'right') ? 'X' : 'Y';
    const start = (dir === 'right' || dir === 'bottom') ? 100 : -100;
    const obj = { v: start };
    element.style.display = '';
    return this.to(obj, { v: 0 }, duration || 400, {
      ease: 'outBack',
      onUpdate: () => { element.style.transform = `translate${axis}(${obj.v}%)`; }
    });
  },

  popIn(element, duration) {
    if (!element || !element.style) return;
    const obj = { s: 0, o: 0 };
    element.style.display = '';
    return this.to(obj, { s: 1, o: 1 }, duration || 400, {
      ease: 'outBack',
      onUpdate: () => {
        element.style.transform = `scale(${obj.s})`;
        element.style.opacity = obj.o;
      }
    });
  },

  shake(element, intensity, duration) {
    if (!element || !element.style) return;
    const obj = { x: 0, t: 0 };
    return this.to(obj, { t: 1 }, duration || 400, {
      ease: 'linear',
      onUpdate: (p) => {
        const decay = 1 - p;
        const shake = Math.sin(p * 30) * (intensity || 5) * decay;
        element.style.transform = `translateX(${shake}px)`;
      },
      onComplete: () => { element.style.transform = ''; }
    });
  },

  pulse(element, scale, duration) {
    const obj = { s: 1 };
    return this.to(obj, { s: scale || 1.2 }, (duration || 600) / 2, {
      ease: 'inOutSine', yoyo: true, repeat: 1,
      onUpdate: () => { if (element?.style) element.style.transform = `scale(${obj.s})`; }
    });
  },

  connectToEngine() { console.log('[TweenEngine] 트윈 엔진 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.TweenEngine = TweenEngine;
if (typeof module !== 'undefined') module.exports = TweenEngine;
