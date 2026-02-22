// Game Over / Victory scene
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import { showConfetti } from '../ui/toast.js';

export default class GameOverScene {
  onCreate(params) {
    this._victory = params?.victory || false;
  }

  render() {
    const stats = GameState.stats;
    const isVictory = this._victory;

    this.el.innerHTML = `
      <div class="pg-gameover">
        <div class="pg-gameover-icon">${isVictory ? '🏆' : '🌳'}</div>
        <div class="pg-gameover-title" style="color:${isVictory ? 'var(--gold)' : 'var(--purple)'};">
          ${isVictory ? '포자의 저주를 풀었습니다!' : '소환의 나무로 귀환...'}
        </div>
        <div class="pg-gameover-desc">${isVictory ? '버섯돌이 대마왕을 정화하고 요정세계에 평화가 돌아왔습니다!' : '요정은 쓰러지지 않아요. 다시 도전하세요!'}</div>

        <div class="pg-gameover-stats">
          <div class="pg-gameover-stats-title">📊 최종 기록</div>
          <div class="pg-gameover-stats-body">
            💰 총 골드 획득: ${stats.totalGold}G<br>
            🗡️ 클리어 스테이지: ${stats.stagesCleared}<br>
            🧚 소환한 정령: ${stats.spiritsSummoned}<br>
            🌳 정화한 정령: ${stats.enemiesDefeated}
          </div>
        </div>

        <div class="pg-row pg-row-center">
          <button class="pg-btn pg-btn-pri" id="gameover-restart">🔄 처음부터</button>
          <button class="pg-btn pg-btn-sec" id="gameover-menu">메인 메뉴</button>
        </div>
      </div>
    `;

    this.el.querySelector('#gameover-restart').onclick = () => {
      SaveManager.deleteSave();
      GameState.reset();
      GameState.currentPhase = 'candy';
      SceneManager.go('stage1');
    };

    this.el.querySelector('#gameover-menu').onclick = () => {
      SceneManager.go('menu');
    };
  }

  onEnter(params) {
    if (this._victory) {
      setTimeout(() => showConfetti(), 500);
    }
  }
}
