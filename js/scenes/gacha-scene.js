/**
 * gacha-scene.js — 가챠/소환 UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import GachaSystem from '../systems/gacha-system.js';
import CurrencySystem from '../systems/currency-system.js';

export default class GachaScene {
  onCreate() {}

  render() {
    const gold = CurrencySystem.get('gold');
    const diamond = CurrencySystem.get('diamond');

    this.el.innerHTML = `
      <div class="gacha-page">
        <div class="gacha-header">
          <button class="btn btn-secondary" id="gacha-back">← 돌아가기</button>
          <h2>소환</h2>
          <div class="gacha-wallet">💰${gold.toLocaleString()} 💎${diamond.toLocaleString()}</div>
        </div>

        <div class="gacha-banners">
          <div class="gacha-banner" data-type="normal">
            <div class="gacha-banner-title">🎰 일반 소환</div>
            <div class="gacha-banner-desc">골드로 소환 (커먼~레어)</div>
            <div class="gacha-banner-btns">
              <button class="btn btn-primary btn-sm" data-pull="1" data-type="normal">1회 (💰500)</button>
              <button class="btn btn-primary btn-sm" data-pull="10" data-type="normal">10연차 (💰4500)</button>
            </div>
          </div>

          <div class="gacha-banner gacha-premium">
            <div class="gacha-banner-title">💎 고급 소환</div>
            <div class="gacha-banner-desc">다이아로 소환 (레어~레전더리)</div>
            <div class="gacha-banner-btns">
              <button class="btn btn-blue btn-sm" data-pull="1" data-type="premium">1회 (💎30)</button>
              <button class="btn btn-blue btn-sm" data-pull="10" data-type="premium">10연차 (💎270)</button>
            </div>
          </div>

          <div class="gacha-banner gacha-pickup">
            <div class="gacha-banner-title">⭐ 픽업 소환</div>
            <div class="gacha-banner-desc">특정 영웅 확률 UP!</div>
            <div class="gacha-banner-btns">
              <button class="btn btn-primary btn-sm" data-pull="1" data-type="pickup">1회 (💎30)</button>
              <button class="btn btn-blue btn-sm" data-pull="10" data-type="pickup">10연차 (💎270)</button>
            </div>
          </div>
        </div>

        <div class="gacha-pity">
          천장: ${GachaSystem.getPityCount?.() || 0}/90 (레전더리 보장)
        </div>

        <div id="gacha-result" class="gacha-result"></div>
      </div>
      <style>
        .gacha-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .gacha-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .gacha-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .gacha-wallet { font-size: 12px; color: #aaa; white-space: nowrap; }
        .gacha-banners { display: flex; flex-direction: column; gap: 10px; }
        .gacha-banner {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 14px; text-align: center;
        }
        .gacha-premium { border-color: rgba(106,90,205,0.5); background: rgba(106,90,205,0.08); }
        .gacha-pickup { border-color: rgba(255,215,0,0.4); background: rgba(255,215,0,0.06); }
        .gacha-banner-title { font-size: 16px; color: #f0e6d2; margin-bottom: 4px; }
        .gacha-banner-desc { font-size: 12px; color: #888; margin-bottom: 10px; }
        .gacha-banner-btns { display: flex; gap: 8px; justify-content: center; }
        .gacha-pity { text-align: center; font-size: 12px; color: #888; margin: 12px 0; }
        .gacha-result {
          margin-top: 12px; padding: 12px; border-radius: 12px;
          background: rgba(0,0,0,0.3); min-height: 60px; display: none;
        }
        .gacha-result.show { display: block; }
        .gacha-item { display: inline-flex; flex-direction: column; align-items: center; margin: 4px 6px;
          padding: 8px; border-radius: 8px; font-size: 12px; }
        .gacha-item.rarity-common { background: rgba(150,150,150,0.2); }
        .gacha-item.rarity-rare { background: rgba(0,120,255,0.2); }
        .gacha-item.rarity-epic { background: rgba(160,32,240,0.2); }
        .gacha-item.rarity-legendary { background: rgba(255,215,0,0.2); border: 1px solid #FFD700; }
        .gacha-item.rarity-mythic { background: rgba(255,69,0,0.2); border: 1px solid #FF4500; }
        .gacha-item-emoji { font-size: 28px; }
        .gacha-item-name { font-size: 11px; color: #ddd; margin-top: 2px; }
      </style>
    `;

    this.el.querySelector('#gacha-back').onclick = () => SceneManager.go('menu');

    this.el.querySelectorAll('[data-pull]').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.type;
        const count = parseInt(btn.dataset.pull);
        this._doPull(type, count);
      };
    });
  }

  _doPull(type, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      const result = GachaSystem.pull?.(type);
      if (result) results.push(result);
      else {
        alert('재화가 부족합니다!');
        break;
      }
    }
    if (results.length > 0) {
      this._showResults(results);
      this.render(); // refresh currency display
    }
  }

  _showResults(results) {
    const resultEl = this.el.querySelector('#gacha-result');
    if (!resultEl) return;
    resultEl.className = 'gacha-result show';
    resultEl.innerHTML = results.map(r => `
      <div class="gacha-item rarity-${r.rarity || 'common'}">
        <div class="gacha-item-emoji">${r.emoji || '❓'}</div>
        <div class="gacha-item-name">${r.name || '알 수 없음'}</div>
      </div>
    `).join('');
  }

  onEnter() {}
  onLeave() {}
}
