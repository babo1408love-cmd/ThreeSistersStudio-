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
      <div class="quest-item ${q.completed ? 'quest-done' : ''}">
        <div class="quest-info">
          <div class="quest-name">${q.name}</div>
          <div class="quest-desc">${q.desc}</div>
          ${type !== 'main' ? `
            <div class="quest-progress-bar">
              <div class="quest-progress-fill" style="width:${Math.min(100, (q.current/q.target)*100)}%"></div>
            </div>
            <div class="quest-progress-text">${q.current || 0}/${q.target}</div>
          ` : ''}
        </div>
        <div class="quest-reward">
          ${Object.entries(q.rewards).map(([k,v]) => `<span>${k}:${v}</span>`).join(' ')}
        </div>
        <div class="quest-status">${q.completed ? '✅' : '⬜'}</div>
      </div>
    `).join('');

    this.el.innerHTML = `
      <div class="quest-page">
        <div class="quest-header">
          <button class="btn btn-secondary" id="quest-back">← 돌아가기</button>
          <h2>퀘스트</h2>
        </div>
        <div class="quest-tabs">
          <button class="quest-tab ${this._tab==='daily'?'active':''}" data-tab="daily">일일</button>
          <button class="quest-tab ${this._tab==='weekly'?'active':''}" data-tab="weekly">주간</button>
          <button class="quest-tab ${this._tab==='main'?'active':''}" data-tab="main">메인</button>
        </div>
        <div class="quest-list">
          ${this._tab === 'daily' ? renderList(dailies, 'daily') : ''}
          ${this._tab === 'weekly' ? renderList(weeklies, 'weekly') : ''}
          ${this._tab === 'main' ? renderList(mainQuests, 'main') : ''}
        </div>
      </div>
      <style>
        .quest-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .quest-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .quest-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .quest-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
        .quest-tab {
          flex: 1; padding: 8px; text-align: center; font-size: 13px;
          background: rgba(255,255,255,0.05); border: 1px solid #333;
          border-radius: 8px; color: #888; cursor: pointer;
        }
        .quest-tab.active { background: rgba(255,215,0,0.15); border-color: #FFD700; color: #FFD700; }
        .quest-list { display: flex; flex-direction: column; gap: 6px; }
        .quest-item {
          display: flex; align-items: center; gap: 8px; padding: 10px;
          background: rgba(255,255,255,0.05); border-radius: 10px;
        }
        .quest-done { opacity: 0.5; }
        .quest-info { flex: 1; }
        .quest-name { font-size: 14px; color: #f0e6d2; font-weight: bold; }
        .quest-desc { font-size: 11px; color: #888; margin: 2px 0; }
        .quest-progress-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 4px; }
        .quest-progress-fill { height: 100%; background: #4CAF50; border-radius: 2px; }
        .quest-progress-text { font-size: 10px; color: #aaa; }
        .quest-reward { font-size: 10px; color: #FFD700; display: flex; flex-direction: column; gap: 2px; }
        .quest-status { font-size: 18px; }
      </style>
    `;

    this.el.querySelector('#quest-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.quest-tab').forEach(tab => {
      tab.onclick = () => {
        this._tab = tab.dataset.tab;
        this.render();
      };
    });
  }

  onEnter() {}
  onLeave() {}
}
