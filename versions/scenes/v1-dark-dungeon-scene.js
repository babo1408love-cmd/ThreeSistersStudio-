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
    const todayDay = new Date().getDay();
    const currentStamina = StaminaSystem.get();
    const maxStamina = StaminaSystem.getMax();
    const towerFloor = GameState.stats?.towerFloor || 1;

    let dailyCards = DAILY_DUNGEONS.map(d => {
      const available = d.day === 0 ? (todayDay === 0 || todayDay === 6) : d.day === todayDay;
      return `
        <div class="pg-card ${available ? '' : 'pg-card-disabled'}" data-dg="${d.id}">
          <div class="pg-emoji">${d.emoji}</div>
          <div class="pg-card-info">
            <div class="pg-card-name">${d.name} <span class="pg-card-sub">(${d.dayName})</span></div>
            <div class="pg-card-desc">${d.reward}</div>
          </div>
          <div class="pg-card-badge">⚡${d.stamina}</div>
        </div>
      `;
    }).join('');

    let specialCards = SPECIAL_DUNGEONS.map(d => `
      <div class="pg-card pg-card-accent" data-dg="${d.id}">
        <div class="pg-emoji">${d.emoji}</div>
        <div class="pg-card-info">
          <div class="pg-card-name">${d.name}</div>
          <div class="pg-card-desc">${d.desc}</div>
        </div>
        ${d.id === 'tower' ? `<div class="pg-card-badge">${towerFloor}층</div>` : ''}
      </div>
    `).join('');

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="dg-back">← 돌아가기</button>
          <h2>던전</h2>
          <div class="pg-info">⚡ ${currentStamina}/${maxStamina}</div>
        </div>
        <div class="pg-section">일일 던전</div>
        <div class="pg-list">${dailyCards}</div>
        <div class="pg-section">특수 던전</div>
        <div class="pg-list">${specialCards}</div>
      </div>
    `;

    this.el.querySelector('#dg-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.pg-card:not(.pg-card-disabled)').forEach(el => {
      el.onclick = () => {
        const dgId = el.dataset.dg;
        if (dgId === 'tower') this._enterTower();
        else if (dgId === 'trial') this._enterTrial();
        else this._enterDailyDungeon(dgId);
      };
    });
  }

  _enterDailyDungeon(dgId) {
    if (!StaminaSystem.spend('dungeon')) {
      alert('스태미나가 부족합니다!');
      return;
    }
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
