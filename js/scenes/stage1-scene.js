/**
 * Stage 1 Integrated Scene — 캔디매치 → 주사위 → 마블 보드 통합
 * 한 화면에서 끊김 없이 순환:
 *   ① 캔디매치 드래그 (퍼즐앤드래곤)
 *   ② 매치 있으면 → 자동 주사위 (1.5초)
 *   ③ 주사위 결과 → 마블 보드 이동 (칸당 0.3초)
 *   ④ 도착 칸 이벤트 실행
 *   ⑤ 이벤트 끝 → 다시 캔디매치
 *   매치 60개 달성 → 스테이지 클리어!
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import { getStage } from '../data/stages.js';
import { createHudBar } from '../ui/hud.js';
import { showToast, showConfetti } from '../ui/toast.js';
import CandyMatch from '../games/candy-match.js';
import DiceSystem from '../games/dice-system.js';
import MarbleBoard from '../games/marble-board.js';
import { executeTileEvent } from '../games/marble-events.js';

const PHASE_LABELS = {
  candy:  '🍬 보석을 드래그하세요!',
  dice:   '🎲 주사위 굴리는 중...',
  marble: '🎯 이동 중...',
  event:  '📦 이벤트!',
  clear:  '🎉 스테이지 클리어!',
};

export default class Stage1Scene {
  onCreate(params) {
    this._stage = getStage(GameState.currentStage);
    this._phase = 'candy'; // candy | dice | marble | event | clear
    this._candyMatch = null;
    this._dice = new DiceSystem();
    this._marble = new MarbleBoard();
    this._lastDiceValue = 0;
    GameState.initFirstPlay();
    GameState.resetStageProgress();
  }

  render() {
    this.el.innerHTML = '';

    // HUD
    const hud = createHudBar();
    this.el.appendChild(hud);

    // 통합 레이아웃
    const layout = document.createElement('div');
    layout.id = 'stage1-integrated';
    layout.innerHTML = `
      <div class="s1-phase-bar" id="s1-phase-bar">
        <span class="s1-phase-label" id="s1-phase-label">${PHASE_LABELS.candy}</span>
      </div>
      <div class="s1-candy-area" id="s1-candy-area"></div>
      <div class="s1-dice-area" id="s1-dice-area"></div>
      <div class="s1-marble-area" id="s1-marble-area"></div>
      <div class="s1-status-bar" id="s1-status-bar"></div>
    `;
    this.el.appendChild(layout);

    // 각 영역 참조
    this._candyArea = layout.querySelector('#s1-candy-area');
    this._diceArea = layout.querySelector('#s1-dice-area');
    this._marbleArea = layout.querySelector('#s1-marble-area');
    this._phaseLabel = layout.querySelector('#s1-phase-label');
    this._statusBar = layout.querySelector('#s1-status-bar');

    // 주사위 시스템 렌더링
    this._dice.renderTo(this._diceArea);

    // 마블 보드 렌더링
    this._marble.renderTo(this._marbleArea);

    // 캔디매치 생성 (통합 모드: skipIntro, onTurnEnd)
    this._candyMatch = new CandyMatch(this._candyArea, {
      targetScore: this._stage.candy.targetScore,
      moves: this._stage.candy.moves,
      cols: this._stage.candy.cols,
      rows: this._stage.candy.rows,
      skipIntro: true,
      onTurnEnd: (result) => this._onCandyTurnEnd(result),
      onComplete: (result) => this._onStageClear(result),
    });

    this._updateStatusBar();
  }

  // ── 캔디매치 턴 종료 → 주사위/마블 연동 ──

  _onCandyTurnEnd(result) {
    // 클리어 체크
    if (result.cleared) {
      this._onStageClear(result);
      return;
    }

    // 매치 있으면 → 주사위
    if (result.matchCount > 0) {
      this._startDicePhase(result);
    }
    // 매치 없으면 그냥 다시 캔디 (아무것도 안 함)
  }

  // ── Phase 1: 주사위 ──

  _startDicePhase(matchResult) {
    this._phase = 'dice';
    this._updatePhaseLabel();
    this._candyMatch.setLocked(true);

    // 콤보 5 이상이면 보너스 +1
    const bonus = matchResult.combo >= 5 ? 1 : 0;

    // 0.5초 후 주사위 굴리기 (매치 애니메이션 여운)
    setTimeout(() => {
      this._dice.roll(bonus, (diceValue) => {
        this._lastDiceValue = diceValue;
        this._updateStatusBar();
        this._startMarblePhase(diceValue);
      });
    }, 500);
  }

  // ── Phase 2: 마블 이동 ──

  _startMarblePhase(diceValue) {
    this._phase = 'marble';
    this._updatePhaseLabel();

    // 0.5초 후 이동 시작
    setTimeout(() => {
      this._marble.movePlayer(diceValue, (landedTile) => {
        this._updateStatusBar();
        this._startEventPhase(landedTile);
      });
    }, 500);
  }

  // ── Phase 3: 칸 이벤트 ──

  _startEventPhase(tile) {
    this._phase = 'event';
    this._updatePhaseLabel();

    // 시작 칸은 팝업 없이 즉시 처리
    if (tile.type === 'start') {
      executeTileEvent(tile, () => {
        this._onEventComplete();
      });
      return;
    }

    // 0.3초 후 이벤트 실행
    setTimeout(() => {
      executeTileEvent(tile, () => {
        this._onEventComplete();
      });
    }, 300);
  }

  // ── 이벤트 완료 → 다시 캔디매치 ──

  _onEventComplete() {
    // 클리어 체크
    if (this._candyMatch && this._candyMatch.isCleared()) {
      this._onStageClear({});
      return;
    }

    this._phase = 'candy';
    this._updatePhaseLabel();
    this._dice.hide();
    this._candyMatch.setLocked(false);
    this._updateStatusBar();
  }

  // ── 스테이지 클리어 ──

  _onStageClear(result) {
    if (this._phase === 'clear') return; // 중복 호출 방지
    this._phase = 'clear';
    this._updatePhaseLabel();
    if (this._candyMatch) this._candyMatch.setLocked(true);

    // 보상 지급
    const goldReward = (result && result.score) || 200;
    GameState.addGold(goldReward);

    showConfetti();

    // 클리어 팝업
    const overlay = document.createElement('div');
    overlay.className = 'marble-event-overlay';
    overlay.innerHTML = `
      <div class="marble-event-card" style="max-width:340px;">
        <div class="marble-event-emoji">🎉</div>
        <div class="marble-event-title">스테이지 클리어!</div>
        <div class="marble-event-body">
          매치 60개 달성! 🍬<br>
          보상: +${goldReward}G 💰<br>
          마블 탐험: ${this._marble.playerPos + 1}/30칸 🎯
        </div>
        <button class="btn btn-primary marble-event-btn" id="s1-clear-btn">소환의 방으로 →</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    overlay.querySelector('#s1-clear-btn').onclick = () => {
      overlay.remove();
      // 스테이지 진행 완료 처리
      GameState.stageProgress.candyCleared = true;
      GameState.stageProgress.marbleCleared = true;
      GameState.stageProgress.treasureCleared = true;
      SaveManager.save();
      SceneManager.go('summoning');
    };
  }

  // ── UI 업데이트 ──

  _updatePhaseLabel() {
    if (this._phaseLabel) {
      this._phaseLabel.textContent = PHASE_LABELS[this._phase] || '';
    }
  }

  _updateStatusBar() {
    if (!this._statusBar) return;
    const matchCount = this._candyMatch ? this._candyMatch.getMatchCount() : 0;
    const diceVal = this._lastDiceValue > 0 ? `🎲 ${this._lastDiceValue}` : '🎲 -';
    const marblePos = `📍 ${this._marble.playerPos + 1}/30`;
    this._statusBar.textContent = `매치: ${matchCount}/60 | ${diceVal} | ${marblePos}`;
  }

  onLeave() {
    if (this._candyMatch && this._candyMatch.destroy) {
      this._candyMatch.destroy();
    }
    if (this._dice) this._dice.destroy();
    if (this._marble) this._marble.destroy();
  }
}
