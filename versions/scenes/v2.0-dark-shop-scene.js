/**
 * shop-scene.js — 상점 UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import ShopSystem from '../systems/shop-system.js';
import CurrencySystem from '../systems/currency-system.js';

export default class ShopScene {
  onCreate() { this._tab = 'general'; }

  render() {
    const gold = CurrencySystem.get('gold');
    const diamond = CurrencySystem.get('diamond');
    const items = ShopSystem.getItems?.(this._tab) || [];

    const TABS = [
      { id: 'general', name: '🏪 일반' },
      { id: 'premium', name: '💎 프리미엄' },
      { id: 'guild', name: '🏰 길드' },
      { id: 'pvp', name: '🏆 PvP' },
    ];

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="shop-back">← 돌아가기</button>
          <h2>상점</h2>
          <div class="pg-wallet">💰${gold.toLocaleString()} 💎${diamond.toLocaleString()}</div>
        </div>
        <div class="pg-tabs">
          ${TABS.map(t => `
            <button class="pg-tab ${this._tab===t.id?'active':''}" data-tab="${t.id}">${t.name}</button>
          `).join('')}
        </div>
        <div class="pg-grid">
          ${items.length > 0 ? items.map(item => `
            <div class="pg-grid-item" data-item="${item.id}">
              <div class="pg-grid-emoji">${item.emoji || '📦'}</div>
              <div class="pg-grid-name">${item.name}</div>
              <div class="pg-grid-price">${item.currency === 'diamond' ? '💎' : '💰'}${item.price}</div>
              <button class="pg-btn pg-btn-pri pg-btn-full shop-buy-btn" data-item="${item.id}">구매</button>
            </div>
          `).join('') : '<div class="pg-empty" style="grid-column:1/-1;">상점 준비 중...</div>'}
        </div>
      </div>
    `;

    this.el.querySelector('#shop-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.pg-tab').forEach(tab => {
      tab.onclick = () => { this._tab = tab.dataset.tab; this.render(); };
    });
    this.el.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.onclick = () => {
        const result = ShopSystem.buy?.(btn.dataset.item);
        if (result === false) alert('구매 실패 (재화 부족 또는 한도 초과)');
        else this.render();
      };
    });
  }

  onEnter() {}
  onLeave() {}
}
