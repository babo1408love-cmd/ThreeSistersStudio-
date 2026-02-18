/**
 * settings-ui.js — 설정 UI
 * 그래픽/사운드/알림 설정 + 계정 관리
 */
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';

const DEFAULT_SETTINGS = {
  graphics: { quality: 'medium', fps: 60, effects: true },
  sound: { bgm: 80, sfx: 80, voice: 80 },
  notifications: { push: true, stamina: true, event: true },
  gameplay: { autoBattle: false, autoSkill: true, autoPotion: true },
};

class SettingsUI {
  constructor() {
    this._overlay = null;
    this._settings = null;
  }

  open() {
    if (this._overlay) return;

    // Load settings
    this._settings = GameState.settings ? { ...DEFAULT_SETTINGS, ...GameState.settings } : { ...DEFAULT_SETTINGS };

    this._overlay = document.createElement('div');
    this._overlay.className = 'settings-overlay';
    this._overlay.innerHTML = this._renderContent();
    document.body.appendChild(this._overlay);

    this._bindEvents();
  }

  close() {
    if (!this._overlay) return;
    // Save settings
    GameState.settings = { ...this._settings };
    SaveManager.save();
    this._overlay.remove();
    this._overlay = null;
  }

  _renderContent() {
    const s = this._settings;
    return `
      <div class="settings-panel">
        <div class="settings-header">
          <h2>설정</h2>
          <button class="settings-close" id="settings-close">✕</button>
        </div>

        <div class="settings-section">
          <h3>그래픽</h3>
          <div class="settings-row">
            <span>품질</span>
            <select id="set-quality">
              <option value="low" ${s.graphics.quality==='low'?'selected':''}>저</option>
              <option value="medium" ${s.graphics.quality==='medium'?'selected':''}>중</option>
              <option value="high" ${s.graphics.quality==='high'?'selected':''}>고</option>
            </select>
          </div>
          <div class="settings-row">
            <span>프레임</span>
            <select id="set-fps">
              <option value="30" ${s.graphics.fps===30?'selected':''}>30fps</option>
              <option value="60" ${s.graphics.fps===60?'selected':''}>60fps</option>
            </select>
          </div>
          <div class="settings-row">
            <span>이펙트</span>
            <label class="settings-toggle">
              <input type="checkbox" id="set-effects" ${s.graphics.effects?'checked':''}>
              <span class="settings-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>사운드</h3>
          <div class="settings-row">
            <span>BGM</span>
            <input type="range" id="set-bgm" min="0" max="100" value="${s.sound.bgm}">
            <span class="settings-val">${s.sound.bgm}</span>
          </div>
          <div class="settings-row">
            <span>효과음</span>
            <input type="range" id="set-sfx" min="0" max="100" value="${s.sound.sfx}">
            <span class="settings-val">${s.sound.sfx}</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>게임플레이</h3>
          <div class="settings-row">
            <span>자동전투</span>
            <label class="settings-toggle">
              <input type="checkbox" id="set-autobattle" ${s.gameplay.autoBattle?'checked':''}>
              <span class="settings-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>자동스킬</span>
            <label class="settings-toggle">
              <input type="checkbox" id="set-autoskill" ${s.gameplay.autoSkill?'checked':''}>
              <span class="settings-slider"></span>
            </label>
          </div>
          <div class="settings-row">
            <span>자동포션</span>
            <label class="settings-toggle">
              <input type="checkbox" id="set-autopotion" ${s.gameplay.autoPotion?'checked':''}>
              <span class="settings-slider"></span>
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>계정</h3>
          <div class="settings-row">
            <button class="btn btn-secondary btn-sm" id="set-save">💾 수동 저장</button>
            <button class="btn btn-secondary btn-sm" id="set-reset">🗑️ 데이터 초기화</button>
          </div>
        </div>
      </div>
      <style>
        .settings-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8); z-index: 9000;
          display: flex; align-items: center; justify-content: center;
        }
        .settings-panel {
          background: #1a1a2e; border-radius: 16px; padding: 20px;
          max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .settings-header h2 { color: #f0e6d2; margin: 0; font-size: 20px; }
        .settings-close { background: none; border: none; color: #888; font-size: 20px; cursor: pointer; }
        .settings-section { margin-bottom: 16px; }
        .settings-section h3 { font-size: 13px; color: #888; margin: 0 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .settings-row {
          display: flex; align-items: center; gap: 8px; padding: 6px 0;
          font-size: 13px; color: #ddd;
        }
        .settings-row span:first-child { flex: 1; }
        .settings-row select, .settings-row input[type=range] { accent-color: #FFD700; }
        .settings-row select { background: #2a2a3e; color: #ddd; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; }
        .settings-val { width: 28px; text-align: right; font-size: 12px; color: #aaa; }
        .settings-toggle { position: relative; width: 40px; height: 22px; }
        .settings-toggle input { opacity: 0; width: 0; height: 0; }
        .settings-slider {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: #444; border-radius: 11px; cursor: pointer; transition: 0.3s;
        }
        .settings-slider::before {
          content: ''; position: absolute; top: 2px; left: 2px;
          width: 18px; height: 18px; background: #ddd; border-radius: 50%; transition: 0.3s;
        }
        .settings-toggle input:checked + .settings-slider { background: #4CAF50; }
        .settings-toggle input:checked + .settings-slider::before { transform: translateX(18px); }
      </style>
    `;
  }

  _bindEvents() {
    const ov = this._overlay;
    ov.querySelector('#settings-close').onclick = () => this.close();
    ov.addEventListener('click', e => { if (e.target === ov) this.close(); });

    // Graphics
    ov.querySelector('#set-quality').onchange = e => { this._settings.graphics.quality = e.target.value; };
    ov.querySelector('#set-fps').onchange = e => { this._settings.graphics.fps = parseInt(e.target.value); };
    ov.querySelector('#set-effects').onchange = e => { this._settings.graphics.effects = e.target.checked; };

    // Sound
    const bindRange = (id, path) => {
      ov.querySelector(id).oninput = e => {
        const val = parseInt(e.target.value);
        const keys = path.split('.');
        this._settings[keys[0]][keys[1]] = val;
        e.target.nextElementSibling.textContent = val;
      };
    };
    bindRange('#set-bgm', 'sound.bgm');
    bindRange('#set-sfx', 'sound.sfx');

    // Gameplay
    ov.querySelector('#set-autobattle').onchange = e => { this._settings.gameplay.autoBattle = e.target.checked; };
    ov.querySelector('#set-autoskill').onchange = e => { this._settings.gameplay.autoSkill = e.target.checked; };
    ov.querySelector('#set-autopotion').onchange = e => { this._settings.gameplay.autoPotion = e.target.checked; };

    // Account
    ov.querySelector('#set-save').onclick = () => { SaveManager.save(); alert('저장 완료!'); };
    ov.querySelector('#set-reset').onclick = () => {
      if (confirm('정말 모든 데이터를 초기화하시겠습니까?')) {
        SaveManager.deleteSave();
        GameState.reset();
        this.close();
        location.reload();
      }
    };
  }
}

const settingsUI = new SettingsUI();
export function openSettings() { settingsUI.open(); }
export function closeSettings() { settingsUI.close(); }
export default settingsUI;
