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
      <div style="text-align:center;animation:fadeIn .5s ease-out;">
        <div style="font-size:80px;margin-bottom:16px;">${isVictory ? '🏆' : '🌳'}</div>
        <div class="scene-title" style="color:${isVictory ? 'var(--gold)' : 'var(--purple)'};">
          ${isVictory ? '포자의 저주를 풀었습니다!' : '소환의 나무로 귀환...'}
        </div>
        <div class="scene-subtitle">${isVictory ? '버섯돌이 대마왕을 정화하고 요정세계에 평화가 돌아왔습니다!' : '요정은 쓰러지지 않아요. 다시 도전하세요!'}</div>

        <div style="margin:24px auto;max-width:300px;text-align:left;">
          <div class="card" style="padding:16px;">
            <div style="font-weight:700;margin-bottom:8px;color:var(--gold);">📊 최종 기록</div>
            <div style="font-size:0.9em;color:var(--text-secondary);line-height:1.8;">
              💰 총 골드 획득: ${stats.totalGold}G<br>
              🗡️ 클리어 스테이지: ${stats.stagesCleared}<br>
              🧚 소환한 정령: ${stats.spiritsSummoned}<br>
              🌳 정화한 정령: ${stats.enemiesDefeated}
            </div>
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:center;">
          <button class="btn btn-primary btn-lg" id="gameover-restart">🔄 처음부터</button>
          <button class="btn btn-secondary" id="gameover-menu">메인 메뉴</button>
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
