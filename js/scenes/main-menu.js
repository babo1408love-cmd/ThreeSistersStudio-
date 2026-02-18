// Main Menu Scene
import SceneManager from '../core/scene-manager.js';
import SaveManager from '../core/save-manager.js';
import GameState from '../core/game-state.js';

export default class MainMenuScene {
  onCreate() {
    this._particles = [];
  }

  render() {
    const hasSave = SaveManager.hasSave();

    this.el.innerHTML = `
      <div class="main-menu">
        <div class="main-menu__particles" id="menu-particles"></div>
        <div class="main-menu__logo"><span class="hero-fairy hero-fairy-lg">🧚</span></div>
        <div class="main-menu__title">몽글벨</div>
        <div class="main-menu__subtitle">버섯돌이 대마왕의 포자를 정화하라!</div>
        <div class="main-menu__buttons">
          <button class="btn btn-primary btn-lg" id="btn-new-game">✨ 새 게임</button>
          ${hasSave ? '<button class="btn btn-blue btn-lg" id="btn-continue">▶️ 이어하기</button>' : ''}
          ${hasSave ? '<button class="btn btn-secondary" id="btn-summon-tree">🌳 소환의 나무</button>' : ''}
        </div>
        <div class="main-menu__version">v1.0 — 몽글벨</div>
      </div>
    `;

    // Bind events
    this.el.querySelector('#btn-new-game').onclick = () => this._newGame();
    if (hasSave) {
      this.el.querySelector('#btn-continue').onclick = () => this._continueGame();
      const treeBtn = this.el.querySelector('#btn-summon-tree');
      if (treeBtn) treeBtn.onclick = () => this._openSummonTree();
    }
  }

  onEnter() {
    this._startParticles();
  }

  onLeave() {
    this._stopParticles();
  }

  _newGame() {
    SaveManager.deleteSave();
    GameState.reset();
    GameState.currentPhase = 'candy';
    SceneManager.go('stage1');
  }

  _continueGame() {
    SaveManager.load();
    const phase = GameState.currentPhase;
    if (phase === 'summoning') {
      SceneManager.go('summoning');
    } else if (phase === 'combat') {
      // If was in combat, restart from summoning checkpoint
      if (SaveManager.hasCheckpoint()) {
        SaveManager.loadCheckpoint();
      }
      SceneManager.go('summoning');
    } else {
      SceneManager.go('stage1');
    }
  }

  _openSummonTree() {
    SaveManager.load();
    SceneManager.go('summoning');
  }

  _startParticles() {
    const container = this.el.querySelector('#menu-particles');
    if (!container) return;
    const emojis = ['🧚', '🍄', '💎', '⭐', '🌈', '🍬', '🌙', '💧', '✨'];
    this._particleInterval = setInterval(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (6 + Math.random() * 8) + 's';
      p.style.animationDelay = '0s';
      container.appendChild(p);
      setTimeout(() => p.remove(), 14000);
    }, 800);
  }

  _stopParticles() {
    if (this._particleInterval) {
      clearInterval(this._particleInterval);
      this._particleInterval = null;
    }
  }
}
