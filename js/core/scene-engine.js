// ============================================================
// 🎬 몽글벨 웹엔진 - 씬 전환 매니저 (1/8)
// ============================================================
// 타이틀→맵→전투→상점 씬 전환 + 페이드/슬라이드/줌 효과
//
// Claude Code: js/core/scene-manager.js 에 넣으세요
// ============================================================

const SceneManager = {

  _scenes: {},
  _currentScene: null,
  _previousScene: null,
  _transitioning: false,
  _overlay: null,
  _sceneStack: [],
  _preloaded: new Set(),
  _onTransition: null,

  // ========== 전환 효과 ==========
  TRANSITIONS: {
    fade:      { duration: 600 },
    fadeWhite: { duration: 800 },
    slide:     { duration: 500 },
    zoom:      { duration: 700 },
    circle:    { duration: 900 },
    none:      { duration: 0 }
  },

  // ========== 초기화 ==========
  init(container) {
    this._container = container || document.body;
    this._createOverlay();
    console.log('[SceneManager] 초기화 ✅');
    return this;
  },

  _createOverlay() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'scene-transition-overlay';
    this._overlay.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      z-index:9999; pointer-events:none; opacity:0;
      transition: opacity 0.3s ease;
    `;
    this._container.appendChild(this._overlay);
  },

  // ========== 씬 등록 ==========
  register(name, sceneObj) {
    this._scenes[name] = {
      name,
      instance: sceneObj,
      loaded: false
    };
  },

  // ========== 씬 전환 ==========
  async goTo(sceneName, transition, data) {
    if (this._transitioning) return;
    if (!this._scenes[sceneName]) {
      console.warn(`[SceneManager] 씬 없음: ${sceneName}`);
      return;
    }

    this._transitioning = true;
    const trans = transition || 'fade';
    const duration = this.TRANSITIONS[trans]?.duration || 600;
    const half = duration / 2;

    // 전환 시작 콜백
    if (this._onTransition) this._onTransition('start', sceneName);

    // 1단계: 화면 가리기
    await this._transitionIn(trans, half);

    // 2단계: 씬 교체
    if (this._currentScene) {
      const curr = this._scenes[this._currentScene];
      if (curr?.instance?.onExit) curr.instance.onExit();
      this._previousScene = this._currentScene;
    }

    this._currentScene = sceneName;
    this._sceneStack.push(sceneName);

    const next = this._scenes[sceneName];
    if (next?.instance?.onEnter) next.instance.onEnter(data);

    // 3단계: 화면 보이기
    await this._transitionOut(trans, half);

    this._transitioning = false;
    if (this._onTransition) this._onTransition('end', sceneName);

    // 사운드 연동
    this._playSceneBGM(sceneName);
  },

  // ========== 뒤로가기 ==========
  async goBack(transition) {
    if (this._sceneStack.length < 2) return;
    this._sceneStack.pop();
    const prev = this._sceneStack[this._sceneStack.length - 1];
    this._sceneStack.pop(); // goTo에서 다시 push 됨
    await this.goTo(prev, transition || 'slide');
  },

  // ========== 전환 효과 구현 ==========
  _transitionIn(type, duration) {
    return new Promise(resolve => {
      const ov = this._overlay;
      ov.style.pointerEvents = 'all';

      switch (type) {
        case 'fade':
          ov.style.background = '#000000';
          ov.style.transition = `opacity ${duration}ms ease-in`;
          ov.style.opacity = '1';
          break;
        case 'fadeWhite':
          ov.style.background = '#FFFFFF';
          ov.style.transition = `opacity ${duration}ms ease-in`;
          ov.style.opacity = '1';
          break;
        case 'slide':
          ov.style.background = '#000000';
          ov.style.opacity = '1';
          ov.style.transform = 'translateX(-100%)';
          ov.style.transition = `transform ${duration}ms ease-in`;
          requestAnimationFrame(() => { ov.style.transform = 'translateX(0)'; });
          break;
        case 'zoom':
          ov.style.background = '#000000';
          ov.style.borderRadius = '50%';
          ov.style.transform = 'scale(0)';
          ov.style.opacity = '1';
          ov.style.transition = `transform ${duration}ms ease-in`;
          requestAnimationFrame(() => { ov.style.transform = 'scale(3)'; });
          break;
        case 'circle':
          ov.style.background = `radial-gradient(circle, transparent 0%, #000 0%)`;
          ov.style.opacity = '1';
          let progress = 100;
          const shrink = setInterval(() => {
            progress -= 5;
            ov.style.background = `radial-gradient(circle, transparent ${progress}%, #000 ${progress}%)`;
            if (progress <= 0) { clearInterval(shrink); resolve(); return; }
          }, duration / 20);
          return;
        case 'none':
          resolve();
          return;
      }

      setTimeout(resolve, duration);
    });
  },

  _transitionOut(type, duration) {
    return new Promise(resolve => {
      const ov = this._overlay;

      switch (type) {
        case 'fade':
        case 'fadeWhite':
          ov.style.transition = `opacity ${duration}ms ease-out`;
          ov.style.opacity = '0';
          break;
        case 'slide':
          ov.style.transition = `transform ${duration}ms ease-out`;
          ov.style.transform = 'translateX(100%)';
          break;
        case 'zoom':
          ov.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
          ov.style.transform = 'scale(0)';
          ov.style.opacity = '0';
          ov.style.borderRadius = '0';
          break;
        case 'circle':
          let progress = 0;
          const expand = setInterval(() => {
            progress += 5;
            ov.style.background = `radial-gradient(circle, transparent ${progress}%, #000 ${progress}%)`;
            if (progress >= 100) { clearInterval(expand); ov.style.opacity = '0'; resolve(); return; }
          }, duration / 20);
          return;
        case 'none':
          ov.style.opacity = '0';
          resolve();
          return;
      }

      setTimeout(() => {
        ov.style.pointerEvents = 'none';
        ov.style.transform = '';
        resolve();
      }, duration);
    });
  },

  // ========== BGM 자동 전환 ==========
  _playSceneBGM(sceneName) {
    if (typeof SoundBGM === 'undefined') return;
    const bgmMap = {
      title: 'title', map: 'map', battle: 'battle', boss: 'boss',
      shop: 'shop', rest: 'rest', victory: 'victory', defeat: 'defeat',
      gacha: 'gacha', puzzle: 'puzzle'
    };
    const bgm = bgmMap[sceneName];
    if (bgm) SoundBGM.crossFade(bgm, 1.0);
  },

  // ========== 유틸 ==========
  getCurrent() { return this._currentScene; },
  getPrevious() { return this._previousScene; },
  isTransitioning() { return this._transitioning; },
  onTransition(fn) { this._onTransition = fn; },

  connectToEngine() { console.log('[SceneManager] 씬 매니저 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.SceneManager = SceneManager;
if (typeof module !== 'undefined') module.exports = SceneManager;
