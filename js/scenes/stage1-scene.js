// Stage 1 Orchestrator Scene (Candy → Marble → Treasure)
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import { getStage } from '../data/stages.js';
import { createHudBar } from '../ui/hud.js';
import CandyMatch from '../games/candy-match.js';
import ShisenMatch from '../games/shisen-match.js';
import TreasureEvent from '../games/treasure-event.js';

export default class Stage1Scene {
  onCreate(params) {
    this._stage = getStage(GameState.currentStage);
    this._subGame = null;
    this._diceSum = 0; // dice sum from candy phase → marble shots
    GameState.initFirstPlay(); // 첫 플레이 시각 기록 (도우미 시스템용)
    GameState.resetStageProgress();
  }

  render() {
    this.el.innerHTML = '';
    // Add HUD
    const hud = createHudBar();
    this.el.appendChild(hud);

    // Sub-game container
    const container = document.createElement('div');
    container.id = 'stage1-container';
    container.style.cssText = 'text-align:center;width:100%;';
    this.el.appendChild(container);

    this._container = container;
    this._startNextPhase();
  }

  _startNextPhase() {
    const progress = GameState.stageProgress;

    if (!progress.candyCleared) {
      this._startCandy();
    } else if (!progress.marbleCleared) {
      this._startMarble();
    } else if (!progress.treasureCleared) {
      this._startTreasure();
    } else {
      // All phases done → go to summoning room
      SaveManager.save();
      SceneManager.go('summoning');
    }
  }

  _startCandy() {
    GameState.currentPhase = 'candy';
    this._subGame = new CandyMatch(this._container, {
      targetScore: this._stage.candy.targetScore,
      moves: this._stage.candy.moves,
      cols: this._stage.candy.cols,
      rows: this._stage.candy.rows,
      onComplete: (result) => {
        GameState.addGold(result.score);
        this._diceSum = result.diceSum || 6;
        GameState.stageProgress.candyCleared = true;
        this._showPhaseTransition(`캔디 매치 클리어! 🎲 마블 이동: ${this._diceSum}회`, '🍬', () => {
          this._startNextPhase();
        });
      }
    });
  }

  _startMarble() {
    GameState.currentPhase = 'marble';
    this._subGame = new ShisenMatch(this._container, {
      stageId: this._stage.id,
      onComplete: (result) => {
        GameState.addGold(Math.floor(result.score / 2));
        // Loot is handled inside shisen-match
        GameState.stageProgress.marbleCleared = true;
        this._showPhaseTransition('사천성 클리어!', '🀄', () => {
          this._startNextPhase();
        });
      }
    });
  }

  _startTreasure() {
    GameState.currentPhase = 'treasure';
    this._subGame = new TreasureEvent(this._container, {
      stageId: this._stage.id,
      onComplete: () => {
        GameState.stageProgress.treasureCleared = true;
        this._showPhaseTransition('보물 획득 완료!', '🎁', () => {
          this._startNextPhase();
        });
      }
    });
  }

  _showPhaseTransition(text, emoji, callback) {
    this._container.innerHTML = `
      <div style="animation:fadeIn .5s ease-out;">
        <div style="font-size:80px;margin-bottom:16px;">${emoji}</div>
        <div class="scene-title" style="color:var(--gold);">${text}</div>
        <div style="margin-top:24px;">
          <button class="btn btn-primary btn-lg" id="phase-next-btn">다음으로 →</button>
        </div>
      </div>
    `;
    this._container.querySelector('#phase-next-btn').onclick = callback;
  }

  onLeave() {
    if (this._subGame && this._subGame.destroy) {
      this._subGame.destroy();
    }
  }
}
