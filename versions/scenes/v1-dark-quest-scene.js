/**
 * quest-scene.js — 퀘스트 UI 씬
 */
import SceneManager from '../core/scene-manager.js';
import QuestSystem from '../systems/quest-system.js';

export default class QuestScene {
  onCreate() { this._tab = 'daily'; }

  render() {
    const dailies = QuestSystem.getDailyMissions();
    const weeklies = QuestSystem.getWeeklyMissions();
    const mainQuests = QuestSystem.getMainQuests();

    const renderList = (quests, type) => quests.map(q => `
      <div class="pg-card ${q.completed ? 'pg-quest-done' : ''}">
        <div class="pg-card-info">
          <div class="pg-card-name">${q.name}</div>
          <div class="pg-card-desc">${q.desc}</div>
          ${type !== 'main' ? `
            <div class="pg-progress">
              <div class="pg-progress-bar">
                <div class="pg-progress-fill pg-progress-fill-green" style="width:${Math.min(100, (q.current/q.target)*100)}%"></div>
              </div>
              <span class="pg-progress-text">${q.current || 0}/${q.target}</span>
            </div>
          ` : ''}
        </div>
        <div class="pg-card-right">
          <div class="pg-card-badge">${Object.entries(q.rewards).map(([k,v]) => `${k}:${v}`).join(' ')}</div>
          <div class="pg-quest-status">${q.completed ? '✅' : '⬜'}</div>
        </div>
      </div>
    `).join('');

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="quest-back">← 돌아가기</button>
          <h2>퀘스트</h2>
        </div>
        <div class="pg-tabs">
          <button class="pg-tab ${this._tab==='daily'?'active':''}" data-tab="daily">일일</button>
          <button class="pg-tab ${this._tab==='weekly'?'active':''}" data-tab="weekly">주간</button>
          <button class="pg-tab ${this._tab==='main'?'active':''}" data-tab="main">메인</button>
        </div>
        <div class="pg-list">
          ${this._tab === 'daily' ? renderList(dailies, 'daily') : ''}
          ${this._tab === 'weekly' ? renderList(weeklies, 'weekly') : ''}
          ${this._tab === 'main' ? renderList(mainQuests, 'main') : ''}
        </div>
      </div>
    `;

    this.el.querySelector('#quest-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.pg-tab').forEach(tab => {
      tab.onclick = () => {
        this._tab = tab.dataset.tab;
        this.render();
      };
    });
  }

  onEnter() {}
  onLeave() {}
}
