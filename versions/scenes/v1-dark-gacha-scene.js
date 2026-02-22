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
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="gacha-back">← 돌아가기</button>
          <h2>소환</h2>
          <div class="pg-wallet">💰${gold.toLocaleString()} 💎${diamond.toLocaleString()}</div>
        </div>

        <div class="pg-list">
          <div class="pg-banner" data-type="normal">
            <div class="pg-banner-title">🎰 일반 소환</div>
            <div class="pg-banner-desc">골드로 소환 (커먼~레어)</div>
            <div class="pg-banner-btns">
              <button class="pg-btn pg-btn-pri" data-pull="1" data-type="normal">1회 (💰500)</button>
              <button class="pg-btn pg-btn-pri" data-pull="10" data-type="normal">10연차 (💰4500)</button>
            </div>
          </div>

          <div class="pg-banner pg-card-premium">
            <div class="pg-banner-title">💎 고급 소환</div>
            <div class="pg-banner-desc">다이아로 소환 (레어~레전더리)</div>
            <div class="pg-banner-btns">
              <button class="pg-btn pg-btn-sec" data-pull="1" data-type="premium">1회 (💎30)</button>
              <button class="pg-btn pg-btn-sec" data-pull="10" data-type="premium">10연차 (💎270)</button>
            </div>
          </div>

          <div class="pg-banner pg-card-gold">
            <div class="pg-banner-title">⭐ 픽업 소환</div>
            <div class="pg-banner-desc">특정 영웅 확률 UP!</div>
            <div class="pg-banner-btns">
              <button class="pg-btn pg-btn-pri" data-pull="1" data-type="pickup">1회 (💎30)</button>
              <button class="pg-btn pg-btn-sec" data-pull="10" data-type="pickup">10연차 (💎270)</button>
            </div>
          </div>
        </div>

        <div class="pg-pity">
          천장: ${GachaSystem.getPityCount?.() || 0}/90 (레전더리 보장)
        </div>

        <div id="gacha-result" class="pg-gacha-result"></div>
      </div>
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
      this.render();
    }
  }

  _showResults(results) {
    const resultEl = this.el.querySelector('#gacha-result');
    if (!resultEl) return;
    resultEl.className = 'pg-gacha-result show';
    const rarityMap = { common: 'pg-gacha-common', rare: 'pg-gacha-rare', epic: 'pg-gacha-epic', legendary: 'pg-gacha-legendary', mythic: 'pg-gacha-mythic' };
    resultEl.innerHTML = results.map(r => `
      <div class="pg-gacha-item ${rarityMap[r.rarity] || 'pg-gacha-common'}">
        <div class="pg-gacha-item-emoji">${r.emoji || '❓'}</div>
        <div class="pg-gacha-item-name">${r.name || '알 수 없음'}</div>
      </div>
    `).join('');
  }

  onEnter() {}
  onLeave() {}
}
