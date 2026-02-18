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
      { id: 'general', name: '일반', emoji: '🏪' },
      { id: 'premium', name: '프리미엄', emoji: '💎' },
      { id: 'guild', name: '길드', emoji: '🏰' },
      { id: 'pvp', name: 'PvP', emoji: '🏆' },
    ];

    this.el.innerHTML = `
      <div class="shop-page">
        <div class="shop-header">
          <button class="btn btn-secondary" id="shop-back">← 돌아가기</button>
          <h2>상점</h2>
          <div class="shop-wallet">💰${gold.toLocaleString()} 💎${diamond.toLocaleString()}</div>
        </div>
        <div class="shop-tabs">
          ${TABS.map(t => `
            <button class="shop-tab ${this._tab===t.id?'active':''}" data-tab="${t.id}">
              ${t.emoji} ${t.name}
            </button>
          `).join('')}
        </div>
        <div class="shop-grid">
          ${items.length > 0 ? items.map(item => `
            <div class="shop-item" data-item="${item.id}">
              <div class="shop-item-emoji">${item.emoji || '📦'}</div>
              <div class="shop-item-name">${item.name}</div>
              <div class="shop-item-price">${item.currency === 'diamond' ? '💎' : '💰'}${item.price}</div>
              <button class="btn btn-primary btn-sm shop-buy-btn" data-item="${item.id}">구매</button>
            </div>
          `).join('') : '<div class="shop-empty">상점 준비 중...</div>'}
        </div>
      </div>
      <style>
        .shop-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .shop-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .shop-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .shop-wallet { font-size: 12px; color: #aaa; white-space: nowrap; }
        .shop-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .shop-tab {
          flex: 1; padding: 8px; text-align: center; font-size: 12px;
          background: rgba(255,255,255,0.05); border: 1px solid #333;
          border-radius: 8px; color: #888; cursor: pointer;
        }
        .shop-tab.active { background: rgba(76,175,80,0.15); border-color: #4CAF50; color: #4CAF50; }
        .shop-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .shop-item {
          background: rgba(255,255,255,0.05); border-radius: 10px; padding: 12px;
          text-align: center; border: 1px solid rgba(255,255,255,0.08);
        }
        .shop-item-emoji { font-size: 32px; margin-bottom: 4px; }
        .shop-item-name { font-size: 13px; color: #f0e6d2; }
        .shop-item-price { font-size: 12px; color: #FFD700; margin: 4px 0; }
        .shop-empty { grid-column: 1/-1; text-align: center; color: #666; padding: 40px; }
      </style>
    `;

    this.el.querySelector('#shop-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.shop-tab').forEach(tab => {
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
