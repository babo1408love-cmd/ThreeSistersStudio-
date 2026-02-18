/**
 * Stage 1 Integrated Scene — 캔디매치 → 주사위 → 마블 보드 통합
 * 한 화면에서 끊김 없이 순환:
 *   ① 캔디매치 드래그 (퍼즐앤드래곤)
 *   ② 매치 있으면 → 보드 내 자동 주사위 + 영웅 이동
 *   ③ 도착 칸 아이템 자동 수집
 *   ④ 다시 캔디매치
 *   매치 180개 달성 → 스테이지 클리어!
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import { getStage } from '../data/stages.js';
import { createHudBar } from '../ui/hud.js';
import { showToast, showConfetti } from '../ui/toast.js';
import CandyMatch from '../games/candy-match.js';
import StageTimer from '../systems/stage-timer.js';
import { showDragTutorial } from '../systems/drag-tutorial.js';

const PHASE_LABELS = {
  candy:  '🍬 보석을 드래그하세요!',
  dice:   '🎲 주사위 굴리는 중...',
  marble: '🎯 이동 중...',
  clear:  '🎉 스테이지 클리어!',
};

export default class Stage1Scene {
  onCreate(params) {
    this._stage = getStage(GameState.currentStage);
    this._phase = 'candy'; // candy | dice | marble | clear
    this._isHeroMoving = false; // 마블 이동 중 플래그 (캔디 비차단)
    this._candyMatch = null;
    if (GameState.currentStage <= 2) {
      GameState.helperDismissed = false;  // 스테이지 1-2에서는 도우미 재활성
    }
    GameState.initFirstPlay();
    GameState.resetStageProgress();

    // ⏰ 3분 타이머
    this._stageTimer = new StageTimer({
      duration: 180000,
      onTimeUp: () => this._onTimerEnd(),
    });
    this._timerInterval = null;
  }

  render() {
    this.el.innerHTML = '';

    // HUD
    const hud = createHudBar();
    this.el.appendChild(hud);

    // 통합 레이아웃 (캔디 보드에 마블/인벤토리/보물상자 모두 포함)
    const layout = document.createElement('div');
    layout.id = 'stage1-integrated';
    layout.innerHTML = `
      <div class="s1-phase-bar" id="s1-phase-bar">
        <span class="s1-phase-label" id="s1-phase-label">${PHASE_LABELS.candy}</span>
        <span id="s1-timer-slot"></span>
      </div>
      <div class="s1-candy-area" id="s1-candy-area"></div>
      <div class="s1-status-bar" id="s1-status-bar"></div>
    `;
    this.el.appendChild(layout);

    // 각 영역 참조
    this._candyArea = layout.querySelector('#s1-candy-area');
    this._phaseLabel = layout.querySelector('#s1-phase-label');
    this._statusBar = layout.querySelector('#s1-status-bar');

    // ⏰ 타이머 DOM 삽입
    const timerSlot = layout.querySelector('#s1-timer-slot');
    if (timerSlot) {
      timerSlot.appendChild(this._stageTimer.createDOM());
    }

    // 캔디매치 생성 (풀 보드: 마블 보더 + 인벤토리 + 보물상자)
    this._candyMatch = new CandyMatch(this._candyArea, {
      targetScore: this._stage.candy.targetScore,
      moves: this._stage.candy.moves,
      cols: this._stage.candy.cols,
      rows: this._stage.candy.rows,
      matchTarget: this._stage.candy.matchTarget,
      gemCount: this._stage.candy.gemCount,
      skipIntro: true,
      compactMode: false,
      onTurnEnd: (result) => this._onCandyTurnEnd(result),
      onComplete: (result) => this._onStageClear(result),
    });

    // ★ 드래그 튜토리얼 (시스템) → 완료 후 타이머 시작
    this._candyMatch.setLocked(true);
    showDragTutorial().then(() => {
      this._candyMatch.setLocked(false);
      this._stageTimer.start();
      this._timerInterval = setInterval(() => {
        this._stageTimer.update(100);
        this._stageTimer.updateDOM();
      }, 100);
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

    // 마블 이동 중이면 주사위 안 굴림 (매치 카운트만 반영됨)
    if (this._isHeroMoving) return;

    // 매치 있으면 → 보드 내 주사위 + 영웅 이동
    if (result.matchCount > 0) {
      this._startDicePhase(result);
    }
    // 매치 없으면 그냥 다시 캔디 (아무것도 안 함)
  }

  // ── Phase: 주사위 + 마블 이동 (보드 내장) ──

  _startDicePhase(matchResult) {
    this._phase = 'dice';
    this._isHeroMoving = true;
    this._updatePhaseLabel();
    // ★ setLocked 하지 않음 — 마블 이동 중에도 캔디 드래그 가능

    // 콤보 5 이상이면 보너스 +1
    const bonus = matchResult.combo >= 5 ? 1 : 0;

    // 특수 주사위 소비 (있으면 사용)
    const specialType = GameState.useSpecialDice() || 'normal';

    // 0.5초 후 주사위 굴리기 + 영웅 이동 (candy-match 내장)
    setTimeout(() => {
      this._phase = 'marble';
      this._updatePhaseLabel();

      this._candyMatch.externalDiceRoll(bonus, () => {
        this._updateStatusBar();
        this._onMoveComplete();
      }, specialType, 'normal');
    }, 500);
  }

  // ── 이동 완료 → 다시 캔디매치 ──

  _onMoveComplete() {
    this._isHeroMoving = false;

    // 클리어 체크
    if (this._candyMatch && this._candyMatch.isCleared()) {
      this._onStageClear({});
      return;
    }

    this._phase = 'candy';
    this._updatePhaseLabel();
    // ★ setLocked 불필요 — 이미 잠기지 않았음
    this._updateStatusBar();
  }

  // ── 스테이지 클리어 ──

  _onStageClear(result) {
    if (this._phase === 'clear') return; // 중복 호출 방지
    this._phase = 'clear';
    this._updatePhaseLabel();
    if (this._candyMatch) this._candyMatch.setLocked(true);
    // 타이머 정지
    if (this._stageTimer) this._stageTimer.pause();
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }

    // BalanceAI 보상 계산
    const maxCombo = this._candyMatch ? this._candyMatch.totalCombo || 0 : 0;
    const movesUsed = this._candyMatch ? (this._candyMatch.maxMoves - this._candyMatch.moves) : 0;
    const movePct = this._candyMatch ? (movesUsed / this._candyMatch.maxMoves) : 1;
    const grade = (movePct <= 0.3 && maxCombo >= 10) ? 'S'
               : (movePct <= 0.5 && maxCombo >= 5) ? 'A'
               : 'B';

    let goldReward, expReward, gradeLabel;
    if (typeof window !== 'undefined' && window.BalanceAI) {
      const reward = window.BalanceAI.calcReward(GameState.currentStage, maxCombo, grade);
      goldReward = reward.gold;
      expReward = reward.exp;
      gradeLabel = grade;
    } else {
      goldReward = (result && result.score) || 200;
      expReward = Math.round(goldReward * 0.8);
      gradeLabel = grade;
    }
    GameState.addGold(goldReward);

    showConfetti();

    // 클리어 팝업
    const heroPos = this._candyMatch ? this._candyMatch.getHeroPos() + 1 : 1;
    const pathLen = this._candyMatch ? this._candyMatch.getMarblePathLength() : 30;
    const matchTarget = this._candyMatch ? this._candyMatch._matchTarget : 60;

    const overlay = document.createElement('div');
    overlay.className = 'marble-event-overlay';
    overlay.innerHTML = `
      <div class="marble-event-card" style="max-width:340px;">
        <div class="marble-event-emoji">🎉</div>
        <div class="marble-event-title">스테이지 클리어! <span style="color:${grade==='S'?'#FFD700':grade==='A'?'#4488FF':'#aaa'}">${gradeLabel}등급</span></div>
        <div class="marble-event-body">
          매치 ${matchTarget}개 달성! 🍬<br>
          최대 콤보: ${maxCombo}x ✨<br>
          보상: +${goldReward}G 💰 +${expReward}EXP<br>
          마블 탐험: ${heroPos}/${pathLen}칸 🎯
        </div>
        <button class="btn btn-primary marble-event-btn" id="s1-clear-btn">소환의 방으로 →</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    overlay.querySelector('#s1-clear-btn').onclick = () => {
      overlay.remove();
      // 밸런스 기록
      GameState.recordStageResult(gradeLabel);
      // 스테이지 진행 완료 처리
      GameState.stageProgress.candyCleared = true;
      GameState.stageProgress.marbleCleared = true;
      GameState.stageProgress.treasureCleared = true;
      SaveManager.save();
      SceneManager.go('summoning');
    };
  }

  /** 타이머 종료 → 스테이지 자동 클리어 */
  _onTimerEnd() {
    if (this._phase === 'clear') return;
    this._onStageClear({ timerClear: true });
  }

  // ── UI 업데이트 ──

  _updatePhaseLabel() {
    if (this._phaseLabel) {
      this._phaseLabel.textContent = PHASE_LABELS[this._phase] || '';
    }
  }

  _updateStatusBar() {
    if (!this._statusBar || !this._candyMatch) return;
    const progressText = this._candyMatch.getProgressText();
    const diceSum = this._candyMatch.getDiceSum();
    const diceVal = diceSum > 0 ? `🎲 ${diceSum}` : '🎲 -';
    const heroPos = this._candyMatch.getHeroPos() + 1;
    const pathLen = this._candyMatch.getMarblePathLength();
    this._statusBar.textContent = `${progressText} | ${diceVal} | 📍 ${heroPos}/${pathLen}`;
  }

  onLeave() {
    if (this._candyMatch && this._candyMatch.destroy) {
      this._candyMatch.destroy();
    }
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }
}
