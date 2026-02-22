// ============================================================
// 📱 몽글벨 웹엔진 - 반응형 시스템 (5/8)
// ============================================================
// 모바일/PC 자동 맞춤 + DPI + 가상 조이스틱
//
// Claude Code: js/core/responsive.js 에 넣으세요
// ============================================================

const Responsive = {

  _width: 0, _height: 0,
  _scale: 1, _dpr: 1,
  _isMobile: false, _isTablet: false,
  _orientation: 'landscape',
  _joystick: null,
  _buttons: [],
  _onResize: [],

  BREAKPOINTS: { mobile: 768, tablet: 1024 },
  BASE_WIDTH: 1280,
  BASE_HEIGHT: 720,

  // ========== 초기화 ==========
  init(canvas, uiCanvas) {
    this._canvas = canvas;
    this._uiCanvas = uiCanvas;
    this._dpr = Math.min(2, window.devicePixelRatio || 1);
    this._isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this._detect();
    this._resize();

    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this._resize(), 100);
    });

    if (this._isMobile) this._createVirtualControls();

    console.log(`[Responsive] ${this._isMobile ? '📱모바일' : '🖥️PC'} ${this._width}x${this._height} @${this._dpr}x`);
  },

  _detect() {
    const w = window.innerWidth;
    this._isTablet = w >= this.BREAKPOINTS.mobile && w < this.BREAKPOINTS.tablet;
    this._orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  },

  _resize() {
    this._detect();
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this._scale = Math.min(this._width / this.BASE_WIDTH, this._height / this.BASE_HEIGHT);

    // 3D 캔버스
    if (this._canvas) {
      this._canvas.width = this._width * this._dpr;
      this._canvas.height = this._height * this._dpr;
      this._canvas.style.width = this._width + 'px';
      this._canvas.style.height = this._height + 'px';
    }

    // UI 캔버스
    if (this._uiCanvas) {
      this._uiCanvas.width = this._width * this._dpr;
      this._uiCanvas.height = this._height * this._dpr;
      this._uiCanvas.style.width = this._width + 'px';
      this._uiCanvas.style.height = this._height + 'px';
      const ctx = this._uiCanvas.getContext('2d');
      if (ctx) ctx.scale(this._dpr, this._dpr);
    }

    // Three.js 렌더러
    if (typeof MonglelbelEngine !== 'undefined' && MonglelbelEngine.renderer) {
      MonglelbelEngine.renderer.setSize(this._width, this._height);
      MonglelbelEngine.renderer.setPixelRatio(this._dpr);
    }
    if (typeof CameraController !== 'undefined' && CameraController._camera) {
      CameraController._camera.aspect = this._width / this._height;
      CameraController._camera.updateProjectionMatrix();
    }

    this._onResize.forEach(fn => fn(this._width, this._height, this._scale));
  },

  // ========== 가상 조이스틱 (모바일) ==========
  _createVirtualControls() {
    const container = document.createElement('div');
    container.id = 'virtual-controls';
    container.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:40%;z-index:1000;pointer-events:none;';

    // 조이스틱
    this._joystick = this._createJoystick(container);

    // 액션 버튼
    const btnSize = Math.min(60, this._width * 0.08);
    const actions = [
      { id: 'btn_attack', label: '⚔️', x: '80%', y: '60%', action: 'attack' },
      { id: 'btn_skill', label: '✨', x: '90%', y: '45%', action: 'skill' },
      { id: 'btn_dash', label: '💨', x: '70%', y: '75%', action: 'dash' },
      { id: 'btn_interact', label: '❗', x: '85%', y: '30%', action: 'interact' }
    ];

    actions.forEach(btn => {
      const el = document.createElement('div');
      el.id = btn.id;
      el.style.cssText = `
        position:absolute; left:${btn.x}; top:${btn.y};
        width:${btnSize}px; height:${btnSize}px; border-radius:50%;
        background:rgba(255,255,255,0.2); border:2px solid rgba(255,255,255,0.4);
        display:flex; align-items:center; justify-content:center;
        font-size:${btnSize * 0.5}px; pointer-events:all; user-select:none;
        transform:translate(-50%,-50%);
      `;
      el.textContent = btn.label;
      el.addEventListener('touchstart', e => {
        e.preventDefault();
        el.style.background = 'rgba(255,255,255,0.5)';
        if (typeof InputManager !== 'undefined') InputManager._emit('virtualButton', { action: btn.action, state: 'down' });
      });
      el.addEventListener('touchend', () => {
        el.style.background = 'rgba(255,255,255,0.2)';
        if (typeof InputManager !== 'undefined') InputManager._emit('virtualButton', { action: btn.action, state: 'up' });
      });
      container.appendChild(el);
      this._buttons.push(el);
    });

    document.body.appendChild(container);
  },

  _createJoystick(container) {
    const size = Math.min(120, this._width * 0.15);
    const outer = document.createElement('div');
    outer.style.cssText = `
      position:absolute; left:15%; bottom:20%; width:${size}px; height:${size}px;
      border-radius:50%; background:rgba(255,255,255,0.15);
      border:2px solid rgba(255,255,255,0.3); pointer-events:all;
      transform:translate(-50%,-50%);
    `;
    const inner = document.createElement('div');
    inner.style.cssText = `
      position:absolute; left:50%; top:50%; width:${size * 0.4}px; height:${size * 0.4}px;
      border-radius:50%; background:rgba(255,255,255,0.5);
      transform:translate(-50%,-50%); transition:none;
    `;
    outer.appendChild(inner);
    container.appendChild(outer);

    const joystick = { outer, inner, active: false, x: 0, y: 0, maxDist: size * 0.35 };

    outer.addEventListener('touchstart', e => {
      e.preventDefault();
      joystick.active = true;
    }, { passive: false });

    outer.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!joystick.active) return;
      const rect = outer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const t = e.touches[0];
      let dx = t.clientX - cx;
      let dy = t.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > joystick.maxDist) {
        dx = dx / dist * joystick.maxDist;
        dy = dy / dist * joystick.maxDist;
      }
      inner.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      joystick.x = dx / joystick.maxDist;
      joystick.y = dy / joystick.maxDist;
    }, { passive: false });

    const resetJoystick = () => {
      joystick.active = false;
      joystick.x = 0; joystick.y = 0;
      inner.style.transform = 'translate(-50%,-50%)';
    };
    outer.addEventListener('touchend', resetJoystick);
    outer.addEventListener('touchcancel', resetJoystick);

    return joystick;
  },

  // ========== API ==========
  getSize() { return { width: this._width, height: this._height }; },
  getScale() { return this._scale; },
  getDPR() { return this._dpr; },
  isMobile() { return this._isMobile; },
  isTablet() { return this._isTablet; },
  isPortrait() { return this._orientation === 'portrait'; },
  getJoystick() { return this._joystick ? { x: this._joystick.x, y: this._joystick.y, active: this._joystick.active } : null; },

  // 폰트 크기 (반응형)
  fontSize(base) { return Math.round(base * this._scale); },
  // 거리 (반응형)
  px(base) { return Math.round(base * this._scale); },

  onResize(fn) { this._onResize.push(fn); },

  showControls() { const el = document.getElementById('virtual-controls'); if (el) el.style.display = ''; },
  hideControls() { const el = document.getElementById('virtual-controls'); if (el) el.style.display = 'none'; },

  connectToEngine() { console.log('[Responsive] 반응형 시스템 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.Responsive = Responsive;
if (typeof module !== 'undefined') module.exports = Responsive;
