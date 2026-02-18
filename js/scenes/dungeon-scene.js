/**
 * dungeon-scene.js — 특수 던전 (일일/이벤트/무한탑/시련)
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import StaminaSystem from '../systems/stamina-system.js';

const DAILY_DUNGEONS = [
  { id: 'dg_gold', name: '황금 미궁', emoji: '💰', day: 1, dayName: '월', reward: '골드 대량', stamina: 10 },
  { id: 'dg_exp', name: '경험의 전당', emoji: '📖', day: 2, dayName: '화', reward: '경험치 대량', stamina: 10 },
  { id: 'dg_stone', name: '강화석 광산', emoji: '💎', day: 3, dayName: '수', reward: '강화석', stamina: 10 },
  { id: 'dg_skill', name: '스킬서 서고', emoji: '📜', day: 4, dayName: '목', reward: '스킬서', stamina: 10 },
  { id: 'dg_mat', name: '재료 수확지', emoji: '🌿', day: 5, dayName: '금', reward: '재료', stamina: 10 },
  { id: 'dg_all', name: '종합 던전', emoji: '🌟', day: 0, dayName: '토/일', reward: '전부', stamina: 10 },
];

const SPECIAL_DUNGEONS = [
  { id: 'tower', name: '무한의 탑', emoji: '🏰', desc: '1~999층, 10층마다 보스' },
  { id: 'trial', name: '시련의 방', emoji: '⚔️', desc: 'HP1, 시간제한 등 특수 조건' },
  { id: 'event_dg', name: '이벤트 던전', emoji: '🎪', desc: '시즌별 특별 맵' },
];

export default class DungeonScene {
  onCreate() {}

  render() {
    const todayDay = new Date().getDay(); // 0=Sun, 1=Mon...
    const currentStamina = StaminaSystem.get();
    const maxStamina = StaminaSystem.getMax();

    // Tower progress
    const towerFloor = GameState.stats?.towerFloor || 1;

    let dailyCards = DAILY_DUNGEONS.map(d => {
      // day: 0 = Sat+Sun, 1=Mon, 2=Tue...
      const available = d.day === 0 ? (todayDay === 0 || todayDay === 6) : d.day === todayDay;
      return `
        <div class="dg-card ${available ? 'dg-available' : 'dg-unavailable'}" data-dg="${d.id}">
          <div class="dg-emoji">${d.emoji}</div>
          <div class="dg-info">
            <div class="dg-name">${d.name} <span class="dg-day">(${d.dayName})</span></div>
            <div class="dg-reward">${d.reward}</div>
          </div>
          <div class="dg-cost">⚡${d.stamina}</div>
        </div>
      `;
    }).join('');

    let specialCards = SPECIAL_DUNGEONS.map(d => `
      <div class="dg-card dg-special" data-dg="${d.id}">
        <div class="dg-emoji">${d.emoji}</div>
        <div class="dg-info">
          <div class="dg-name">${d.name}</div>
          <div class="dg-reward">${d.desc}</div>
        </div>
        ${d.id === 'tower' ? `<div class="dg-floor">${towerFloor}층</div>` : ''}
      </div>
    `).join('');

    this.el.innerHTML = `
      <div class="dungeon-page">
        <div class="dg-header">
          <button class="btn btn-secondary" id="dg-back">← 돌아가기</button>
          <h2>던전</h2>
          <div class="dg-stamina">⚡ ${currentStamina}/${maxStamina}</div>
        </div>
        <h3 class="dg-section-title">일일 던전</h3>
        <div class="dg-list">${dailyCards}</div>
        <h3 class="dg-section-title">특수 던전</h3>
        <div class="dg-list">${specialCards}</div>
      </div>
      <style>
        .dungeon-page { padding: 12px; max-width: 500px; margin: 0 auto; }
        .dg-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .dg-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .dg-stamina { font-size: 13px; color: #FFD700; white-space: nowrap; }
        .dg-section-title { font-size: 14px; color: #aaa; margin: 12px 0 6px; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .dg-list { display: flex; flex-direction: column; gap: 6px; }
        .dg-card {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          background: rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1); transition: background 0.2s;
        }
        .dg-card:hover { background: rgba(255,255,255,0.1); }
        .dg-unavailable { opacity: 0.4; cursor: not-allowed; }
        .dg-special { border-color: rgba(255,215,0,0.3); }
        .dg-emoji { font-size: 28px; }
        .dg-info { flex: 1; }
        .dg-name { font-size: 14px; color: #f0e6d2; font-weight: bold; }
        .dg-day { font-size: 11px; color: #888; font-weight: normal; }
        .dg-reward { font-size: 11px; color: #aaa; }
        .dg-cost { font-size: 12px; color: #FFD700; }
        .dg-floor { font-size: 12px; color: #4CAF50; }
      </style>
    `;

    this.el.querySelector('#dg-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.dg-card.dg-available, .dg-card.dg-special').forEach(el => {
      el.onclick = () => {
        const dgId = el.dataset.dg;
        if (dgId === 'tower') {
          this._enterTower();
        } else if (dgId === 'trial') {
          this._enterTrial();
        } else {
          this._enterDailyDungeon(dgId);
        }
      };
    });
  }

  _enterDailyDungeon(dgId) {
    if (!StaminaSystem.spend('dungeon')) {
      alert('스태미나가 부족합니다!');
      return;
    }
    // Route to combat with dungeon config
    GameState.currentPhase = 'combat';
    SceneManager.go('stage2', { mode: 'dungeon', dungeonId: dgId });
  }

  _enterTower() {
    if (!StaminaSystem.spend('dungeon')) {
      alert('스태미나가 부족합니다!');
      return;
    }
    GameState.currentPhase = 'combat';
    SceneManager.go('stage2', { mode: 'tower', floor: GameState.stats?.towerFloor || 1 });
  }

  _enterTrial() {
    if (!StaminaSystem.spend('dungeon')) {
      alert('스태미나가 부족합니다!');
      return;
    }
    GameState.currentPhase = 'combat';
    SceneManager.go('stage2', { mode: 'trial' });
  }

  onEnter() {}
  onLeave() {}
}
