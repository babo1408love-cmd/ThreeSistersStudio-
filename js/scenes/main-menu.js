// Main Menu Scene — 전체 시스템 진입점
import SceneManager from '../core/scene-manager.js';
import SaveManager from '../core/save-manager.js';
import GameState from '../core/game-state.js';
import StaminaSystem from '../systems/stamina-system.js';
import CurrencySystem from '../systems/currency-system.js';
import RewardSystem from '../systems/reward-system.js';
import { openSettings } from '../ui/settings-ui.js';

export default class MainMenuScene {
  onCreate() {
    this._particles = [];
  }

  render() {
    const hasSave = SaveManager.hasSave();

    // Init systems if save exists
    if (hasSave) {
      SaveManager.load();
      StaminaSystem.processRegen();
      CurrencySystem.init();
      // Check daily login
      const loginResult = RewardSystem.checkDailyLogin();
      this._loginReward = loginResult;
    }

    const gold = hasSave ? CurrencySystem.get('gold') : 0;
    const diamond = hasSave ? CurrencySystem.get('diamond') : 0;
    const stamina = hasSave ? StaminaSystem.get() : 100;
    const maxStamina = StaminaSystem.getMax();
    const level = GameState.heroLevel || 1;

    this.el.innerHTML = `
      <div class="main-menu">
        <div class="main-menu__particles" id="menu-particles"></div>
        <div class="main-menu__logo"><span class="hero-fairy hero-fairy-lg">🧚</span></div>
        <div class="main-menu__title">몽글벨</div>
        <div class="main-menu__subtitle">버섯돌이 대마왕의 포자를 정화하라!</div>

        ${hasSave ? `
        <div class="mm-status-bar">
          <span>Lv.${level}</span>
          <span>💰${gold.toLocaleString()}</span>
          <span>💎${diamond.toLocaleString()}</span>
          <span>⚡${stamina}/${maxStamina}</span>
        </div>` : ''}

        <div class="main-menu__buttons">
          <button class="btn btn-primary btn-lg" id="btn-new-game">✨ 새 게임</button>
          ${hasSave ? '<button class="btn btn-blue btn-lg" id="btn-continue">▶️ 이어하기</button>' : ''}
        </div>

        ${hasSave ? `
        <div class="mm-nav-grid">
          <button class="mm-nav-btn" id="btn-worldmap">🗺️<br>월드맵</button>
          <button class="mm-nav-btn" id="btn-survival">⚔️<br>서바이벌</button>
          <button class="mm-nav-btn" id="btn-dungeon">🏰<br>던전</button>
          <button class="mm-nav-btn" id="btn-summon-tree">🌳<br>소환나무</button>
          <button class="mm-nav-btn" id="btn-gacha">🎰<br>소환</button>
          <button class="mm-nav-btn" id="btn-hero">🧚<br>영웅</button>
          <button class="mm-nav-btn" id="btn-inventory">🎒<br>인벤</button>
          <button class="mm-nav-btn" id="btn-quest">📋<br>퀘스트</button>
          <button class="mm-nav-btn" id="btn-shop">🏪<br>상점</button>
          <button class="mm-nav-btn" id="btn-arena">🏟️<br>아레나</button>
          <button class="mm-nav-btn" id="btn-codex">📖<br>도감</button>
          <button class="mm-nav-btn" id="btn-settings">⚙️<br>설정</button>
          <button class="mm-nav-btn" id="btn-ranking">🏆<br>랭킹</button>
        </div>
        <!-- ★ TEST SECTION — 나중에 이 블록 전체 제거 ★ -->
        <div class="mm-test-section">
          <div class="mm-test-label">🔧 테스트</div>
          <div class="mm-test-grid">
            <button class="mm-test-btn" id="btn-test-vamp">🧛<br>뱀서<br>맵테스트</button>
            <button class="mm-test-btn" id="btn-test-surv">💀<br>서바이벌<br>테스트</button>
          </div>
        </div>
        <!-- ★ /TEST SECTION ★ -->
        ` : ''}

        <div class="main-menu__version">v2.0 — 몽글벨</div>
      </div>
      <style>
        .mm-status-bar {
          display: flex; justify-content: center; gap: 12px;
          font-size: 12px; color: #aaa; margin: 6px 0 10px;
          background: rgba(0,0,0,0.3); padding: 6px 16px; border-radius: 20px;
        }
        .mm-nav-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
          max-width: 340px; margin: 16px auto 0;
        }
        .mm-nav-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 10px 4px; font-size: 12px; line-height: 1.3;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: #ddd; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .mm-nav-btn:hover { background: rgba(255,255,255,0.12); transform: scale(1.05); }
        .mm-nav-btn:active { transform: scale(0.95); }
        /* ★ TEST SECTION 스타일 — 나중에 제거 ★ */
        .mm-test-section {
          max-width: 340px; margin: 12px auto 0;
          border: 2px dashed rgba(255,100,100,0.4); border-radius: 12px;
          padding: 8px; background: rgba(255,50,50,0.05);
        }
        .mm-test-label {
          font-size: 10px; color: #ff6666; text-align: center;
          margin-bottom: 6px; letter-spacing: 2px; font-weight: 700;
        }
        .mm-test-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        }
        .mm-test-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 10px 4px; font-size: 11px; line-height: 1.3;
          background: rgba(255,100,100,0.1); border: 1px solid rgba(255,100,100,0.3);
          border-radius: 12px; color: #ff9999; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .mm-test-btn:hover { background: rgba(255,100,100,0.2); transform: scale(1.05); }
        .mm-test-btn:active { transform: scale(0.95); }
      </style>
    `;

    // Bind core events
    this.el.querySelector('#btn-new-game').onclick = () => this._newGame();
    if (hasSave) {
      this.el.querySelector('#btn-continue').onclick = () => this._continueGame();

      // Navigation buttons
      const bind = (id, fn) => {
        const el = this.el.querySelector(id);
        if (el) el.onclick = fn;
      };
      bind('#btn-worldmap', () => SceneManager.go('worldmap'));
      bind('#btn-survival', () => SceneManager.go('survival'));
      bind('#btn-dungeon', () => SceneManager.go('dungeon'));
      bind('#btn-summon-tree', () => { SaveManager.load(); SceneManager.go('summoning'); });
      bind('#btn-gacha', () => SceneManager.go('gacha'));
      bind('#btn-hero', () => {
        import('../ui/hero-screen.js').then(m => m.openHeroScreen());
      });
      bind('#btn-inventory', () => {
        import('../ui/inventory-ui.js').then(m => m.openInventory());
      });
      bind('#btn-quest', () => SceneManager.go('quest'));
      bind('#btn-shop', () => SceneManager.go('shop'));
      bind('#btn-arena', () => SceneManager.go('arena'));
      bind('#btn-codex', () => SceneManager.go('codex'));
      bind('#btn-settings', () => openSettings());
      bind('#btn-ranking', () => SceneManager.go('ranking'));
      // ★ TEST BUTTONS — 나중에 제거 ★
      bind('#btn-test-vamp', () => SceneManager.go('stage2'));
      bind('#btn-test-surv', () => SceneManager.go('survival'));
    }

    // Show login reward popup
    if (this._loginReward) {
      this._showLoginReward(this._loginReward);
      this._loginReward = null;
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
      if (SaveManager.hasCheckpoint()) {
        SaveManager.loadCheckpoint();
      }
      SceneManager.go('summoning');
    } else {
      SceneManager.go('stage1');
    }
  }

  _showLoginReward(result) {
    if (!result || !result.rewards) return;
    const rewardText = Object.entries(result.rewards)
      .map(([k, v]) => `${k}: +${v}`)
      .join(', ');

    const popup = document.createElement('div');
    popup.className = 'mm-login-popup';
    popup.innerHTML = `
      <div class="mm-login-inner">
        <div class="mm-login-title">🎁 출석 보상 (${result.streak}일차)</div>
        <div class="mm-login-rewards">${rewardText}</div>
        <button class="btn btn-primary btn-sm" id="mm-login-ok">확인</button>
      </div>
      <style>
        .mm-login-popup {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); z-index: 5000;
          display: flex; align-items: center; justify-content: center;
        }
        .mm-login-inner {
          background: #1a1a2e; border-radius: 16px; padding: 24px; text-align: center;
          border: 2px solid #FFD700; max-width: 300px;
        }
        .mm-login-title { font-size: 18px; color: #FFD700; margin-bottom: 10px; }
        .mm-login-rewards { font-size: 14px; color: #ddd; margin-bottom: 16px; }
      </style>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#mm-login-ok').onclick = () => popup.remove();
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
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
