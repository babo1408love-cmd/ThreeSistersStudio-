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
  gameplay: { autoBattle: true, autoSkill: true, autoPotion: true },
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

    // 저장된 언어 복원
    if (this._settings.language && this._settings.language.current && window.TextI18n) {
      window.TextI18n.setLanguage(this._settings.language.current);
    }

    this._overlay = document.createElement('div');
    this._overlay.className = 'settings-overlay';
    this._overlay.innerHTML = this._renderContent();
    document.getElementById('app').appendChild(this._overlay);

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
    // 다국어 옵션 생성
    const langs = (typeof window !== 'undefined' && window.TextI18n)
      ? window.TextI18n.getAvailableLanguages() : [];
    const curLang = (typeof window !== 'undefined' && window.TextI18n)
      ? window.TextI18n.getLanguage() : 'ko';
    const langOptions = langs.map(l =>
      `<option value="${l.code}" ${l.code === curLang ? 'selected' : ''}>${l.nativeName}</option>`
    ).join('');

    return `
      <div class="settings-panel">
        <div class="settings-header">
          <h2>설정</h2>
          <button class="settings-close" id="settings-close">✕</button>
        </div>

        <div class="settings-section">
          <h3>🌐 언어 / Language</h3>
          <div class="settings-row">
            <span>언어</span>
            <select id="set-language">${langOptions}</select>
          </div>
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
          <div class="settings-row" style="color:#8f8;font-size:var(--label-md);">
            <span>⚔️ 자동전투 / 자동스킬 / 자동포션 항상 활성</span>
          </div>
        </div>

        <div class="settings-section">
          <h3>계정</h3>
          <div class="settings-row">
            <button class="btn btn-secondary btn-sm" id="set-save">💾 수동 저장</button>
            <button class="btn btn-secondary btn-sm" id="set-reset">🗑️ 데이터 초기화</button>
          </div>
        </div>

        <div class="settings-section">
          <h3>정보</h3>
          <div class="settings-row">
            <button class="btn btn-secondary btn-sm" id="set-terms">📜 이용약관</button>
            <button class="btn btn-secondary btn-sm" id="set-privacy">🔒 개인정보처리방침</button>
          </div>
          <div class="settings-row" style="font-size:var(--label-md);color:#666;">
            <span>몽글벨 v2.0</span>
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
          background: #1a1a2e; border-radius: 16px; padding: clamp(14px, 4vw, 20px);
          max-width: 400px; width: 90%; max-height: 80vh; overflow-y: auto;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .settings-header h2 { color: #f0e6d2; margin: 0; font-size: var(--icon-md); }
        .settings-close { background: none; border: none; color: #888; font-size: var(--icon-md); cursor: pointer; }
        .settings-section { margin-bottom: 16px; }
        .settings-section h3 { font-size: var(--label-lg); color: #888; margin: 0 0 clamp(4px, 1.5vw, 8px); border-bottom: 1px solid #333; padding-bottom: 4px; }
        .settings-row {
          display: flex; align-items: center; gap: clamp(4px, 1.5vw, 8px); padding: clamp(4px, 1.2vw, 6px) 0;
          font-size: clamp(12px, 3.2vw, 15px); color: #ddd;
        }
        .settings-row span:first-child { flex: 1; }
        .settings-row select, .settings-row input[type=range] { accent-color: #FFD700; }
        .settings-row select { background: #2a2a3e; color: #ddd; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; }
        .settings-val { width: 28px; text-align: right; font-size: var(--label-md); color: #aaa; }
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

    // Language
    const langSel = ov.querySelector('#set-language');
    if (langSel) {
      langSel.onchange = e => {
        const lang = e.target.value;
        if (typeof window !== 'undefined' && window.TextI18n) {
          window.TextI18n.setLanguage(lang);
        }
        if (!this._settings.language) this._settings.language = {};
        this._settings.language.current = lang;
      };
    }

    // Graphics
    ov.querySelector('#set-quality').onchange = e => { this._settings.graphics.quality = e.target.value; };
    ov.querySelector('#set-fps').onchange = e => { this._settings.graphics.fps = parseInt(e.target.value); };
    ov.querySelector('#set-effects').onchange = e => { this._settings.graphics.effects = e.target.checked; };

    // Sound — 슬라이더 → SoundEngine 실시간 반영
    const bindRange = (id, path, engineMethod) => {
      ov.querySelector(id).oninput = e => {
        const val = parseInt(e.target.value);
        const keys = path.split('.');
        this._settings[keys[0]][keys[1]] = val;
        e.target.nextElementSibling.textContent = val;
        // SoundEngine에 실시간 볼륨 적용 (0~100 → 0~1)
        if (typeof SoundEngine !== 'undefined' && SoundEngine._initialized && engineMethod) {
          engineMethod(val / 100);
        }
      };
    };
    bindRange('#set-bgm', 'sound.bgm', v => SoundEngine.setMusicVolume(v));
    bindRange('#set-sfx', 'sound.sfx', v => { SoundEngine.setSfxVolume(v); SoundEngine.setUIVolume(v); });

    // Gameplay — 항상 자동 (토글 없음)
    this._settings.gameplay.autoBattle = true;
    this._settings.gameplay.autoSkill = true;
    this._settings.gameplay.autoPotion = true;

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

    // 이용약관 / 개인정보처리방침
    ov.querySelector('#set-terms').onclick = () => this._showInfoPopup('terms');
    ov.querySelector('#set-privacy').onclick = () => this._showInfoPopup('privacy');
  }

  _showInfoPopup(type) {
    const isTerms = type === 'terms';
    const title = isTerms ? '📜 이용약관' : '🔒 개인정보처리방침';
    const content = isTerms ? `
<b>몽글벨 이용약관</b>
최종 수정일: 2025년 1월 1일

<b>제1조 (목적)</b>
본 약관은 몽글벨(이하 "게임")의 이용과 관련하여 필요한 사항을 규정합니다.

<b>제2조 (정의)</b>
1. "게임"이란 몽글벨 웹 게임 서비스를 의미합니다.
2. "이용자"란 본 약관에 동의하고 게임을 이용하는 자를 의미합니다.

<b>제3조 (서비스 이용)</b>
1. 게임은 무료로 제공되며, 별도의 회원가입 없이 이용 가능합니다.
2. 게임 데이터는 이용자의 브라우저(localStorage)에 저장됩니다.
3. 브라우저 데이터 삭제 시 게임 진행 데이터가 초기화될 수 있습니다.

<b>제4조 (이용자의 의무)</b>
1. 이용자는 게임을 비상업적 개인 용도로만 이용할 수 있습니다.
2. 게임의 소스코드, 리소스 등을 무단 복제/배포할 수 없습니다.

<b>제5조 (면책)</b>
1. 게임은 "있는 그대로" 제공되며, 데이터 손실에 대한 책임을 지지 않습니다.
2. 서비스는 사전 공지 없이 변경/중단될 수 있습니다.

<b>제6조 (기타)</b>
본 약관에 명시되지 않은 사항은 관련 법령에 따릅니다.
    ` : `
<b>몽글벨 개인정보처리방침</b>
최종 수정일: 2025년 1월 1일

<b>1. 수집하는 개인정보</b>
몽글벨은 별도의 개인정보를 수집하지 않습니다.
- 회원가입 없음
- 서버 전송 없음
- 모든 데이터는 이용자의 브라우저(localStorage)에만 저장

<b>2. 데이터 저장</b>
게임 진행 데이터(레벨, 아이템, 설정 등)는 이용자의 브라우저에 로컬로 저장됩니다.
- 저장 위치: 브라우저 localStorage
- 외부 서버 전송: 없음
- 제3자 제공: 없음

<b>3. 쿠키 및 추적</b>
몽글벨은 쿠키, 분석 도구, 광고 추적기를 사용하지 않습니다.

<b>4. 데이터 삭제</b>
브라우저의 사이트 데이터를 삭제하거나, 게임 내 "데이터 초기화" 기능을 사용하면 모든 데이터가 삭제됩니다.

<b>5. 문의</b>
본 방침에 대한 문의사항이 있으시면 게임 내 피드백을 이용해주세요.
    `;

    const popup = document.createElement('div');
    popup.className = 'settings-overlay';
    popup.style.zIndex = '9500';
    popup.innerHTML = `
      <div class="settings-panel" style="max-height:80vh;">
        <div class="settings-header">
          <h2 style="font-size:clamp(14px, 4vw, 18px);">${title}</h2>
          <button class="settings-close" id="info-close">✕</button>
        </div>
        <div style="font-size:var(--label-md);color:#ccc;line-height:1.8;white-space:pre-line;max-height:60vh;overflow-y:auto;">
          ${content.trim()}
        </div>
        <button class="btn btn-primary btn-sm" id="info-ok" style="width:100%;margin-top:clamp(10px, 3vw, 14px);">확인</button>
      </div>
    `;
    document.getElementById('app').appendChild(popup);

    popup.querySelector('#info-close').onclick = () => popup.remove();
    popup.querySelector('#info-ok').onclick = () => popup.remove();
    popup.addEventListener('click', e => { if (e.target === popup) popup.remove(); });
  }
}

const settingsUI = new SettingsUI();
export function openSettings() { settingsUI.open(); }
export function closeSettings() { settingsUI.close(); }
export default settingsUI;
