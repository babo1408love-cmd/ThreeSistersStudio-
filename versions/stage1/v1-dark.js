/**
 * Stage 1 — 캔디매치 (퍼즐앤드래곤 스타일)
 * 매치 달성 → 스테이지 클리어!
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
  clear:  '🎉 스테이지 클리어!',
};

export default class Stage1Scene {
  onCreate(params) {
    this._stage = getStage(GameState.currentStage);
    this._phase = 'candy'; // candy | clear
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

    // 캔디매치 레이아웃
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

    // 캔디매치 생성 (6×8 캔디 + 하단 패널)
    this._candyMatch = new CandyMatch(this._candyArea, {
      targetScore: this._stage.candy.targetScore,
      moves: this._stage.candy.moves,
      cols: this._stage.candy.cols,
      rows: this._stage.candy.rows,
      matchTarget: this._stage.candy.matchTarget,
      gemCount: this._stage.candy.gemCount,
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

      // 정령 없으면 안내 토스트
      if (GameState.spirits.length === 0 && GameState.currentStage >= 2) {
        showToast('🌳 정령이 없습니다! 조각을 모아 소환하세요');
      }
    });

    this._updateStatusBar();
  }

  // ── 캔디매치 턴 종료 ──

  _onCandyTurnEnd(result) {
    if (result.cleared) {
      this._onStageClear(result);
      return;
    }
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
    const matchTarget = this._candyMatch ? this._candyMatch._matchTarget : 60;

    const overlay = document.createElement('div');
    overlay.className = 'stage-clear-overlay';
    overlay.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;transition:opacity .3s;';
    overlay.innerHTML = `
      <div style="background:rgba(20,20,40,0.95);border-radius:16px;padding:clamp(16px,5vw,24px);text-align:center;max-width:300px;border:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:var(--icon-xxl);margin-bottom:8px;">🎉</div>
        <div style="font-size:clamp(15px,4.5vw,20px);font-weight:700;color:#fff;margin-bottom:8px;">스테이지 클리어! <span style="color:${grade==='S'?'#FFD700':grade==='A'?'#4488FF':'#aaa'}">${gradeLabel}등급</span></div>
        <div style="font-size:clamp(12px,3.2vw,15px);color:#bbb;line-height:1.6;">
          매치 ${matchTarget}개 달성! 🍬<br>
          최대 콤보: ${maxCombo}x ✨<br>
          보상: +${goldReward}G 💰 +${expReward}EXP
        </div>
        <button class="btn btn-primary" id="s1-clear-btn" style="margin-top:16px;width:100%;">소환의 방으로 →</button>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);
    requestAnimationFrame(() => overlay.style.opacity = '1');

    overlay.querySelector('#s1-clear-btn').onclick = () => {
      overlay.remove();
      // 밸런스 기록
      GameState.recordStageResult(gradeLabel);
      // 스테이지 진행 완료 처리
      GameState.stageProgress.candyCleared = true;
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
    this._statusBar.textContent = progressText;
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
