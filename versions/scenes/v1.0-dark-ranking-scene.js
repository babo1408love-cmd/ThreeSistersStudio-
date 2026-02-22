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
    const displayRankings = rankings.length > 0 ? rankings : this._sampleRankings();

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="rank-back">← 돌아가기</button>
          <h2>🏆 랭킹</h2>
        </div>
        <div class="pg-tabs">
          ${TABS.map(t => `
            <button class="pg-tab ${this._tab===t.id?'active':''}" data-tab="${t.id}">${t.name}</button>
          `).join('')}
        </div>
        <div class="pg-text-center pg-text-green" style="margin-bottom:10px;">내 순위: ${myRank}</div>
        <div class="pg-list">
          ${displayRankings.map((r, i) => `
            <div class="pg-rank-row ${i < 3 ? 'pg-rank-top' : ''}">
              <span class="pg-rank-pos">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)}</span>
              <span class="pg-rank-name">${r.name}</span>
              <span class="pg-rank-score">${r.score.toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.el.querySelector('#rank-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.pg-tab').forEach(tab => {
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
