/**
 * codex-scene.js — 도감 UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import CodexSystem from '../systems/codex-system.js';

export default class CodexScene {
  onCreate() { this._tab = 'hero'; }

  render() {
    const TABS = [
      { id: 'hero', name: '🧚 영웅' },
      { id: 'monster', name: '👾 몬스터' },
      { id: 'item', name: '⚔️ 아이템' },
    ];

    const entries = CodexSystem.getEntries?.(this._tab) || [];
    const total = CodexSystem.getTotal?.(this._tab) || 0;
    const discovered = CodexSystem.getDiscovered?.(this._tab) || 0;

    const placeholder = Array.from({length: 12}, () => `
      <div class="pg-grid-item pg-grid-item-dim">
        <div class="pg-grid-emoji">❓</div>
        <div class="pg-grid-name">???</div>
      </div>
    `).join('');

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="codex-back">← 돌아가기</button>
          <h2>📖 도감</h2>
          <div class="pg-info pg-text-green">${discovered}/${total}</div>
        </div>
        <div class="pg-tabs">
          ${TABS.map(t => `
            <button class="pg-tab ${this._tab===t.id?'active':''}" data-tab="${t.id}">${t.name}</button>
          `).join('')}
        </div>
        <div class="pg-grid pg-grid-4">
          ${entries.length > 0 ? entries.map(e => `
            <div class="pg-grid-item ${e.discovered ? '' : 'pg-grid-item-dim'}">
              <div class="pg-grid-emoji">${e.discovered ? (e.emoji || '❓') : '❓'}</div>
              <div class="pg-grid-name">${e.discovered ? e.name : '???'}</div>
            </div>
          `).join('') : placeholder}
        </div>
      </div>
    `;

    this.el.querySelector('#codex-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.pg-tab').forEach(tab => {
      tab.onclick = () => { this._tab = tab.dataset.tab; this.render(); };
    });
  }

  onEnter() {}
  onLeave() {}
}
