// ============================================================
// 🎮 몽글벨 웹엔진 - 입력 처리 매니저 (3/8)
// ============================================================
// 키보드 + 마우스 + 터치 통합, 키 바인딩, 제스처
//
// Claude Code: js/core/input-manager.js 에 넣으세요
// ============================================================

const InputManager = {

  _keys: {},
  _keysDown: {},
  _keysUp: {},
  _mouse: { x: 0, y: 0, dx: 0, dy: 0, buttons: 0, wheel: 0 },
  _touch: { active: false, x: 0, y: 0, startX: 0, startY: 0, count: 0 },
  _bindings: {},
  _listeners: [],
  _enabled: true,
  _isMobile: false,

  // ========== 기본 키 바인딩 ==========
  DEFAULT_BINDINGS: {
    moveUp:    ['w', 'W', 'ArrowUp'],
    moveDown:  ['s', 'S', 'ArrowDown'],
    moveLeft:  ['a', 'A', 'ArrowLeft'],
    moveRight: ['d', 'D', 'ArrowRight'],
    confirm:   ['Enter', ' '],
    cancel:    ['Escape', 'Backspace'],
    attack:    ['j', 'J', 'z', 'Z'],
    skill:     ['k', 'K', 'x', 'X'],
    dash:      ['Shift', 'l', 'L'],
    interact:  ['e', 'E', 'f', 'F'],
    inventory: ['i', 'I', 'Tab'],
    map:       ['m', 'M'],
    pause:     ['Escape', 'p', 'P'],
    debug:     ['F3']
  },

  // ========== 초기화 ==========
  init(canvas) {
    this._canvas = canvas || document.body;
    this._isMobile = 'ontouchstart' in window;
    this._bindings = { ...this.DEFAULT_BINDINGS };

    // 키보드
    window.addEventListener('keydown', e => this._onKeyDown(e));
    window.addEventListener('keyup', e => this._onKeyUp(e));

    // 마우스
    this._canvas.addEventListener('mousemove', e => this._onMouseMove(e));
    this._canvas.addEventListener('mousedown', e => this._onMouseDown(e));
    this._canvas.addEventListener('mouseup', e => this._onMouseUp(e));
    this._canvas.addEventListener('wheel', e => this._onWheel(e));
    this._canvas.addEventListener('contextmenu', e => e.preventDefault());

    // 터치
    this._canvas.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
    this._canvas.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
    this._canvas.addEventListener('touchend', e => this._onTouchEnd(e));

    console.log(`[InputManager] 초기화 ✅ (${this._isMobile ? '모바일' : 'PC'})`);
  },

  // ========== 매 프레임 끝에 호출 ==========
  update() {
    this._keysDown = {};
    this._keysUp = {};
    this._mouse.dx = 0;
    this._mouse.dy = 0;
    this._mouse.wheel = 0;
  },

  // ========== 입력 체크 API ==========
  // 액션 바인딩으로 체크
  isAction(action) { // 누르고 있는 중
    const keys = this._bindings[action];
    return keys ? keys.some(k => this._keys[k]) : false;
  },
  isActionDown(action) { // 방금 누름
    const keys = this._bindings[action];
    return keys ? keys.some(k => this._keysDown[k]) : false;
  },
  isActionUp(action) { // 방금 뗌
    const keys = this._bindings[action];
    return keys ? keys.some(k => this._keysUp[k]) : false;
  },

  // 직접 키 체크
  isKey(key) { return !!this._keys[key]; },
  isKeyDown(key) { return !!this._keysDown[key]; },
  isKeyUp(key) { return !!this._keysUp[key]; },

  // 마우스
  getMousePos() { return { x: this._mouse.x, y: this._mouse.y }; },
  getMouseDelta() { return { dx: this._mouse.dx, dy: this._mouse.dy }; },
  isMouseButton(btn) { return !!(this._mouse.buttons & (1 << btn)); },
  getMouseWheel() { return this._mouse.wheel; },

  // 터치
  isTouching() { return this._touch.active; },
  getTouchPos() { return { x: this._touch.x, y: this._touch.y }; },

  // 이동 벡터 (WASD/화살표 → -1~1)
  getMoveVector() {
    let x = 0, y = 0;
    if (this.isAction('moveLeft'))  x -= 1;
    if (this.isAction('moveRight')) x += 1;
    if (this.isAction('moveUp'))    y -= 1;
    if (this.isAction('moveDown'))  y += 1;
    // 정규화
    const len = Math.sqrt(x * x + y * y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y };
  },

  // ========== 제스처 ==========
  getSwipe() {
    if (!this._touch.active) return null;
    const dx = this._touch.x - this._touch.startX;
    const dy = this._touch.y - this._touch.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 30) return null;

    const angle = Math.atan2(dy, dx);
    if (angle > -0.75 && angle < 0.75) return 'right';
    if (angle > 0.75 && angle < 2.35) return 'down';
    if (angle > 2.35 || angle < -2.35) return 'left';
    return 'up';
  },

  getPinchScale() {
    return this._touch._pinchScale || 1;
  },

  // ========== 키 바인딩 변경 ==========
  setBinding(action, keys) {
    this._bindings[action] = Array.isArray(keys) ? keys : [keys];
  },

  resetBindings() {
    this._bindings = { ...this.DEFAULT_BINDINGS };
  },

  getBindings() { return { ...this._bindings }; },

  // ========== 이벤트 리스너 ==========
  on(event, callback) {
    this._listeners.push({ event, callback });
  },

  _emit(event, data) {
    this._listeners.filter(l => l.event === event).forEach(l => l.callback(data));
  },

  // ========== 내부 이벤트 ==========
  _onKeyDown(e) {
    if (!this._enabled) return;
    if (!this._keys[e.key]) this._keysDown[e.key] = true;
    this._keys[e.key] = true;
    this._emit('keydown', { key: e.key, code: e.code });
  },

  _onKeyUp(e) {
    if (!this._enabled) return;
    this._keys[e.key] = false;
    this._keysUp[e.key] = true;
    this._emit('keyup', { key: e.key, code: e.code });
  },

  _onMouseMove(e) {
    const rect = this._canvas.getBoundingClientRect ? this._canvas.getBoundingClientRect() : { left: 0, top: 0 };
    this._mouse.dx = e.movementX || 0;
    this._mouse.dy = e.movementY || 0;
    this._mouse.x = e.clientX - rect.left;
    this._mouse.y = e.clientY - rect.top;
  },

  _onMouseDown(e) {
    this._mouse.buttons = e.buttons;
    this._emit('click', { x: this._mouse.x, y: this._mouse.y, button: e.button });
  },

  _onMouseUp(e) { this._mouse.buttons = e.buttons; },
  _onWheel(e) { this._mouse.wheel = Math.sign(e.deltaY); },

  _onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    this._touch.active = true;
    this._touch.count = e.touches.length;
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;
    this._touch.startX = t.clientX;
    this._touch.startY = t.clientY;
    this._emit('touchstart', { x: t.clientX, y: t.clientY });

    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._touch._pinchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
  },

  _onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    this._touch.x = t.clientX;
    this._touch.y = t.clientY;

    if (e.touches.length === 2 && this._touch._pinchStartDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this._touch._pinchScale = dist / this._touch._pinchStartDist;
    }
  },

  _onTouchEnd(e) {
    this._touch.active = e.touches.length > 0;
    this._touch.count = e.touches.length;
    if (!this._touch.active) {
      this._emit('tap', { x: this._touch.x, y: this._touch.y });
      const swipe = this.getSwipe();
      if (swipe) this._emit('swipe', { direction: swipe });
      this._touch._pinchScale = 1;
    }
  },

  enable() { this._enabled = true; },
  disable() { this._enabled = false; this._keys = {}; },

  connectToEngine() { console.log('[InputManager] 입력 매니저 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.InputManager = InputManager;
if (typeof module !== 'undefined') module.exports = InputManager;
