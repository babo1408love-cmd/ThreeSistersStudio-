// Stage 2: Combat Phase Scene
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import { getStage, getMaxStage } from '../data/stages.js';
import CombatEngine from '../combat/combat-engine.js';
import { showConfetti } from '../ui/toast.js';

export default class Stage2Scene {
  onCreate() {
    this._engine = null;
    this._stage = getStage(GameState.currentStage);
  }

  render() {
    this.el.innerHTML = '';
    this.el.className = 'scene combat-scene';

    // Canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'combat-canvas';
    canvas.width = Math.min(window.innerWidth, 800);
    canvas.height = Math.min(window.innerHeight, 600);
    canvas.id = 'combat-canvas';
    this.el.appendChild(canvas);

    this._startCombat(canvas);
  }

  _startCombat(canvas) {
    // Clone waves to avoid mutation
    const waves = this._stage.combat.waves.map(w => ({
      ...w,
      enemies: w.enemies.map(e => ({ ...e })),
      _spawned: false
    }));
    const bossWave = this._stage.combat.bossWave ? {
      ...this._stage.combat.bossWave,
      enemies: this._stage.combat.bossWave.enemies.map(e => ({ ...e })),
      _spawned: false
    } : null;

    this._engine = new CombatEngine(canvas, {
      waves,
      bossWave,
      onVictory: (result) => this._onVictory(result),
      onDeath: () => this._onDeath()
    });
    this._engine.start();
  }

  _onVictory(result) {
    showConfetti();
    const rewards = this._stage.rewards;
    GameState.addGold(rewards.gold);
    GameState.stats.stagesCleared++;

    const isLastStage = GameState.currentStage >= getMaxStage();

    // Victory overlay
    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-overlay__title">🎉 승리!</div>
      <div style="color:var(--text-secondary);font-size:1em;">
        스테이지 ${GameState.currentStage}: ${this._stage.name} 클리어!
      </div>
      <div style="margin-top:12px;display:flex;gap:16px;justify-content:center;font-size:0.9em;">
        <span style="color:var(--gold);">💰 +${rewards.gold}G</span>
        <span style="color:var(--green);">🌳 정화: ${result.enemiesKilled}</span>
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;">
        ${isLastStage
          ? '<button class="btn btn-gold btn-lg" id="victory-end">🏆 게임 클리어!</button>'
          : '<button class="btn btn-primary btn-lg" id="victory-next">다음 스테이지 →</button>'
        }
      </div>
    `;
    this.el.appendChild(overlay);

    if (isLastStage) {
      overlay.querySelector('#victory-end').onclick = () => {
        SaveManager.deleteSave();
        SceneManager.go('gameover', { victory: true });
      };
    } else {
      overlay.querySelector('#victory-next').onclick = () => {
        GameState.currentStage++;
        GameState.resetStageProgress();
        SaveManager.save();
        SceneManager.go('stage1');
      };
    }
  }

  _onDeath() {
    const overlay = document.createElement('div');
    overlay.className = 'death-overlay';
    overlay.innerHTML = `
      <div class="death-overlay__title">🌳 소환의 나무로 귀환...</div>
      <div style="color:var(--text-secondary);font-size:1em;margin-top:8px;">
        요정은 쓰러지지 않아요. 소환의 나무에서 다시 시작합니다
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;">
        <button class="btn btn-primary btn-lg" id="death-retry">소환의 방으로 →</button>
        <button class="btn btn-secondary" id="death-menu">메인 메뉴</button>
      </div>
    `;
    this.el.appendChild(overlay);

    overlay.querySelector('#death-retry').onclick = () => {
      if (SaveManager.hasCheckpoint()) {
        SaveManager.loadCheckpoint();
      }
      SceneManager.go('summoning');
    };

    overlay.querySelector('#death-menu').onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  onLeave() {
    if (this._engine) {
      this._engine.stop();
      this._engine = null;
    }
  }
}
