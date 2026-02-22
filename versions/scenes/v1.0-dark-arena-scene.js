/**
 * arena-scene.js — 아레나/PvP UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import PvpSystem from '../systems/pvp-system.js';
import StaminaSystem from '../systems/stamina-system.js';

export default class ArenaScene {
  onCreate() {}

  render() {
    const pvpData = PvpSystem.getPlayerData?.() || {};
    const rank = pvpData.rank || 'Bronze';
    const points = pvpData.points || 0;
    const wins = pvpData.wins || 0;
    const losses = pvpData.losses || 0;
    const level = GameState.heroLevel || 1;

    const opponents = this._generateOpponents(level);

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="arena-back">← 돌아가기</button>
          <h2>🏟️ 아레나</h2>
        </div>

        <div class="pg-stat-row">
          <div class="pg-stat">
            <span class="pg-stat-label">랭크</span>
            <span class="pg-stat-value">${rank}</span>
          </div>
          <div class="pg-stat">
            <span class="pg-stat-label">포인트</span>
            <span class="pg-stat-value">${points}</span>
          </div>
          <div class="pg-stat">
            <span class="pg-stat-label">전적</span>
            <span class="pg-stat-value">${wins}승 ${losses}패</span>
          </div>
        </div>

        <div class="pg-section">대전 상대</div>
        <div class="pg-list">
          ${opponents.map((op, i) => `
            <div class="pg-card" data-idx="${i}">
              <div class="pg-emoji">${op.emoji}</div>
              <div class="pg-card-info">
                <div class="pg-card-name">${op.name}</div>
                <div class="pg-card-desc">전투력: ${op.power.toLocaleString()}</div>
              </div>
              <button class="pg-btn pg-btn-pri arena-fight-btn" data-idx="${i}">⚔️ 도전</button>
            </div>
          `).join('')}
        </div>

        <button class="pg-btn pg-btn-sec pg-btn-full" id="arena-refresh">🔄 상대 갱신</button>
      </div>
    `;

    this.el.querySelector('#arena-back').onclick = () => SceneManager.go('menu');
    this.el.querySelector('#arena-refresh').onclick = () => this.render();
    this.el.querySelectorAll('.arena-fight-btn').forEach(btn => {
      btn.onclick = () => {
        if (!StaminaSystem.spend('arena')) {
          alert('스태미나가 부족합니다!');
          return;
        }
        GameState.currentPhase = 'combat';
        SceneManager.go('stage2', { mode: 'arena' });
      };
    });
  }

  _generateOpponents(playerLevel) {
    const names = ['그림자검사', '불꽃마법사', '빙결궁수', '신성사제', '암흑기사'];
    const emojis = ['⚔️', '🔥', '🏹', '✨', '🗡️'];
    return Array.from({ length: 3 }, (_, i) => ({
      name: names[Math.floor(Math.random() * names.length)],
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      power: Math.floor((playerLevel * 100 + Math.random() * 200 - 100) * (0.8 + Math.random() * 0.4)),
    }));
  }

  onEnter() {}
  onLeave() {}
}
