// Scene manager: handles scene stack, transitions, lifecycle
import EventBus from './event-bus.js';

const SceneManager = {
  _scenes: {},      // registered scene classes
  _current: null,   // current active scene instance
  _currentName: '', // current scene name
  _container: null,  // DOM container (#app)

  init(container) {
    this._container = container;
  },

  register(name, sceneClass) {
    this._scenes[name] = sceneClass;
  },

  async go(name, params = {}) {
    if (!this._scenes[name]) {
      console.error(`Scene "${name}" not registered`);
      return;
    }

    const prevName = this._currentName;
    const prevScene = this._current;

    // Leave current scene
    if (prevScene) {
      if (prevScene.onLeave) prevScene.onLeave();
      const prevEl = prevScene.el;
      if (prevEl) {
        prevEl.classList.remove('active');
        prevEl.classList.add('leaving');
        // Wait for leave animation
        await new Promise(r => setTimeout(r, 400));
        prevEl.remove();
      }
    }

    // Create new scene
    const SceneClass = this._scenes[name];
    const scene = new SceneClass();
    this._current = scene;
    this._currentName = name;

    // Create scene element
    const el = document.createElement('div');
    el.className = 'scene';
    el.id = `scene-${name}`;
    this._container.appendChild(el);
    scene.el = el;

    // Enter new scene
    if (scene.onCreate) scene.onCreate(params);
    if (scene.render) scene.render();

    // Trigger enter animation
    requestAnimationFrame(() => {
      el.classList.add('entering');
      el.classList.add('active');
      setTimeout(() => {
        el.classList.remove('entering');
      }, 500);
    });

    if (scene.onEnter) scene.onEnter(params);

    EventBus.emit('scene:changed', { from: prevName, to: name, params });
  },

  getCurrentName() {
    return this._currentName;
  },

  getCurrent() {
    return this._current;
  }
};

export default SceneManager;
