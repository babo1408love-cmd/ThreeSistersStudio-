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

    // Generate fake opponents
    const opponents = this._generateOpponents(level);

    this.el.innerHTML = `
      <div class="arena-page">
        <div class="arena-header">
          <button class="btn btn-secondary" id="arena-back">← 돌아가기</button>
          <h2>🏟️ 아레나</h2>
        </div>

        <div class="arena-stats">
          <div class="arena-stat">
            <span class="arena-stat-label">랭크</span>
            <span class="arena-stat-value">${rank}</span>
          </div>
          <div class="arena-stat">
            <span class="arena-stat-label">포인트</span>
            <span class="arena-stat-value">${points}</span>
          </div>
          <div class="arena-stat">
            <span class="arena-stat-label">전적</span>
            <span class="arena-stat-value">${wins}승 ${losses}패</span>
          </div>
        </div>

        <h3 class="arena-section-title">대전 상대</h3>
        <div class="arena-opponents">
          ${opponents.map((op, i) => `
            <div class="arena-opponent" data-idx="${i}">
              <div class="arena-op-emoji">${op.emoji}</div>
              <div class="arena-op-info">
                <div class="arena-op-name">${op.name}</div>
                <div class="arena-op-power">전투력: ${op.power.toLocaleString()}</div>
              </div>
              <button class="btn btn-primary btn-sm arena-fight-btn" data-idx="${i}">⚔️ 도전</button>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-secondary" id="arena-refresh" style="width:100%;margin-top:10px;">🔄 상대 갱신</button>
      </div>
      <style>
        .arena-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .arena-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .arena-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .arena-stats { display: flex; gap: 8px; margin-bottom: 16px; }
        .arena-stat {
          flex: 1; text-align: center; padding: 10px;
          background: rgba(255,255,255,0.05); border-radius: 10px;
        }
        .arena-stat-label { display: block; font-size: 11px; color: #888; }
        .arena-stat-value { display: block; font-size: 16px; color: #FFD700; margin-top: 4px; }
        .arena-section-title { font-size: 14px; color: #aaa; margin: 0 0 8px; }
        .arena-opponents { display: flex; flex-direction: column; gap: 6px; }
        .arena-opponent {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          background: rgba(255,255,255,0.05); border-radius: 10px;
        }
        .arena-op-emoji { font-size: 32px; }
        .arena-op-info { flex: 1; }
        .arena-op-name { font-size: 14px; color: #f0e6d2; }
        .arena-op-power { font-size: 11px; color: #888; }
      </style>
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
