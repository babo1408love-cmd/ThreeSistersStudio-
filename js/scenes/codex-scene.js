/**
 * codex-scene.js — 도감 UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import CodexSystem from '../systems/codex-system.js';

export default class CodexScene {
  onCreate() { this._tab = 'hero'; }

  render() {
    const TABS = [
      { id: 'hero', name: '영웅', emoji: '🧚' },
      { id: 'monster', name: '몬스터', emoji: '👾' },
      { id: 'item', name: '아이템', emoji: '⚔️' },
    ];

    const entries = CodexSystem.getEntries?.(this._tab) || [];
    const total = CodexSystem.getTotal?.(this._tab) || 0;
    const discovered = CodexSystem.getDiscovered?.(this._tab) || 0;

    this.el.innerHTML = `
      <div class="codex-page">
        <div class="codex-header">
          <button class="btn btn-secondary" id="codex-back">← 돌아가기</button>
          <h2>📖 도감</h2>
          <div class="codex-count">${discovered}/${total}</div>
        </div>
        <div class="codex-tabs">
          ${TABS.map(t => `
            <button class="codex-tab ${this._tab===t.id?'active':''}" data-tab="${t.id}">
              ${t.emoji} ${t.name}
            </button>
          `).join('')}
        </div>
        <div class="codex-grid">
          ${entries.length > 0 ? entries.map(e => `
            <div class="codex-entry ${e.discovered ? '' : 'codex-undiscovered'}">
              <div class="codex-entry-emoji">${e.discovered ? (e.emoji || '❓') : '❓'}</div>
              <div class="codex-entry-name">${e.discovered ? e.name : '???'}</div>
            </div>
          `).join('') : `
            <div class="codex-placeholder">
              ${Array.from({length: 12}, () => `
                <div class="codex-entry codex-undiscovered">
                  <div class="codex-entry-emoji">❓</div>
                  <div class="codex-entry-name">???</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
      <style>
        .codex-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .codex-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .codex-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .codex-count { font-size: 13px; color: #4CAF50; }
        .codex-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .codex-tab {
          flex: 1; padding: 8px; text-align: center; font-size: 12px;
          background: rgba(255,255,255,0.05); border: 1px solid #333;
          border-radius: 8px; color: #888; cursor: pointer;
        }
        .codex-tab.active { background: rgba(139,69,19,0.2); border-color: #8B4513; color: #DEB887; }
        .codex-grid, .codex-placeholder {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        }
        .codex-entry {
          background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px;
          text-align: center;
        }
        .codex-undiscovered { opacity: 0.3; }
        .codex-entry-emoji { font-size: 28px; }
        .codex-entry-name { font-size: 10px; color: #aaa; margin-top: 4px; }
      </style>
    `;

    this.el.querySelector('#codex-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.codex-tab').forEach(tab => {
      tab.onclick = () => { this._tab = tab.dataset.tab; this.render(); };
    });
  }

  onEnter() {}
  onLeave() {}
}
