/**
 * ranking-scene.js — 랭킹 UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import RankingSystem from '../systems/ranking-system.js';
import GameState from '../core/game-state.js';

export default class RankingScene {
  onCreate() { this._tab = 'power'; }

  render() {
    const TABS = [
      { id: 'power', name: '전투력' },
      { id: 'arena', name: '아레나' },
      { id: 'survival', name: '서바이벌' },
      { id: 'tower', name: '무한탑' },
    ];

    const rankings = RankingSystem.getRankings?.(this._tab) || [];
    const myRank = RankingSystem.getMyRank?.(this._tab) || '???';

    // Generate sample rankings if empty
    const displayRankings = rankings.length > 0 ? rankings : this._sampleRankings();

    this.el.innerHTML = `
      <div class="rank-page">
        <div class="rank-header">
          <button class="btn btn-secondary" id="rank-back">← 돌아가기</button>
          <h2>🏆 랭킹</h2>
        </div>
        <div class="rank-tabs">
          ${TABS.map(t => `
            <button class="rank-tab ${this._tab===t.id?'active':''}" data-tab="${t.id}">
              ${t.name}
            </button>
          `).join('')}
        </div>
        <div class="rank-myrank">내 순위: ${myRank}</div>
        <div class="rank-list">
          ${displayRankings.map((r, i) => `
            <div class="rank-row ${i < 3 ? 'rank-top' : ''}">
              <span class="rank-pos">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)}</span>
              <span class="rank-name">${r.name}</span>
              <span class="rank-score">${r.score.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <style>
        .rank-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .rank-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .rank-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .rank-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .rank-tab {
          flex: 1; padding: 8px; text-align: center; font-size: 12px;
          background: rgba(255,255,255,0.05); border: 1px solid #333;
          border-radius: 8px; color: #888; cursor: pointer;
        }
        .rank-tab.active { background: rgba(255,215,0,0.15); border-color: #FFD700; color: #FFD700; }
        .rank-myrank { text-align: center; font-size: 14px; color: #4CAF50; margin-bottom: 12px; }
        .rank-list { display: flex; flex-direction: column; gap: 4px; }
        .rank-row {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          background: rgba(255,255,255,0.04); border-radius: 8px; font-size: 13px;
        }
        .rank-top { background: rgba(255,215,0,0.08); }
        .rank-pos { width: 30px; text-align: center; font-size: 16px; }
        .rank-name { flex: 1; color: #f0e6d2; }
        .rank-score { color: #FFD700; }
      </style>
    `;

    this.el.querySelector('#rank-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.rank-tab').forEach(tab => {
      tab.onclick = () => { this._tab = tab.dataset.tab; this.render(); };
    });
  }

  _sampleRankings() {
    const names = ['별빛요정', '달빛전사', '숲의수호자', '불꽃마법사', '얼음궁수',
                    '바람닌자', '천둥검사', '대지성직자', '그림자도적', '빛의성기사'];
    return names.map((name, i) => ({
      name,
      score: Math.floor(50000 / (i + 1) + Math.random() * 1000),
    }));
  }

  onEnter() {}
  onLeave() {}
}
