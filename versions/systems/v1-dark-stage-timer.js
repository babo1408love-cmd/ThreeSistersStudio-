/**
 * StageTimer — 스테이지 공용 타이머 시스템
 *
 * 모든 스테이지에 3분 카운트다운 + 시계 아이콘 표시
 * Canvas(HUD) / DOM 양쪽 렌더링 지원
 *
 * 사용법:
 *   import StageTimer from '../systems/stage-timer.js';
 *   const timer = new StageTimer({ duration: 180000, onTimeUp: () => {...} });
 *   timer.start();
 *   // 매 프레임: timer.update(dt);  timer.drawHUD(ctx, x, y);
 *   // DOM:       timer.createDOM();  timer.updateDOM();
 */

const DEFAULT_DURATION = 180000; // 3분

export default class StageTimer {
  /**
   * @param {object} options
   * @param {number} options.duration   - 타이머 시간 (ms, 기본 180000 = 3분)
   * @param {Function} options.onTimeUp - 시간 종료 콜백
   * @param {boolean}  options.countUp  - true면 카운트업 (경과 시간), false면 카운트다운
   */
  constructor(options = {}) {
    this.duration = options.duration || DEFAULT_DURATION;
    this.remaining = this.duration;
    this.elapsed = 0;
    this.running = false;
    this.finished = false;
    this.countUp = options.countUp || false;
    this.onTimeUp = options.onTimeUp || null;
    this.alwaysActive = options.alwaysActive ?? true;

    // DOM 요소 (Stage1 등 DOM 기반 씬용)
    this._domEl = null;
  }

  start() {
    this.running = true;
    this.finished = false;
  }

  pause() { if (this.alwaysActive) return; this.running = false; }
  resume() { this.running = true; }

  /** 매 프레임 호출 (dt = ms) */
  update(dt) {
    if (!this.running || this.finished) return;
    this.elapsed += dt;
    this.remaining -= dt;

    if (this.remaining <= 0) {
      this.remaining = 0;
      this.finished = true;
      this.running = false;
      if (this.onTimeUp) this.onTimeUp();
    }
  }

  /** 남은 시간 "M:SS" 포맷 */
  getDisplay() {
    const src = this.countUp ? this.elapsed : this.remaining;
    const totalSec = Math.max(0, Math.ceil(src / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  /** 남은 비율 0~1 */
  getRatio() { return Math.max(0, this.remaining / this.duration); }

  /** 남은 초 */
  getSeconds() { return Math.max(0, Math.ceil(this.remaining / 1000)); }

  // ══════════════════════════════════════
  //  Canvas HUD 렌더링 (작은 시계 아이콘)
  // ══════════════════════════════════════
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x - 시계 아이콘 중심 X
   * @param {number} y - 시계 아이콘 중심 Y
   */
  drawHUD(ctx, x, y) {
    const display = this.getDisplay();
    const isLow = this.remaining < 30000; // 30초 이하 경고
    const isCritical = this.remaining < 10000; // 10초 이하 위험

    ctx.save();

    // 배경 패널
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 11);
    ctx.lineTo(x + 52, y - 11);
    ctx.arcTo(x + 56, y - 11, x + 56, y - 7, 4);
    ctx.lineTo(x + 56, y + 7);
    ctx.arcTo(x + 56, y + 11, x + 52, y + 11, 4);
    ctx.lineTo(x - 6, y + 11);
    ctx.arcTo(x - 10, y + 11, x - 10, y + 7, 4);
    ctx.lineTo(x - 10, y - 7);
    ctx.arcTo(x - 10, y - 11, x - 6, y - 11, 4);
    ctx.closePath();
    ctx.fill();

    // 시계 이모지
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⏰', x + 2, y);

    // 타이머 숫자
    ctx.fillStyle = isCritical ? '#ff4444' : isLow ? '#fbbf24' : '#ffffff';
    ctx.font = `bold ${isCritical ? '13' : '12'}px "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(display, x + 14, y + 1);

    // 위험 시 깜빡임
    if (isCritical && Math.floor(this.remaining / 400) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,68,68,0.25)';
      ctx.fillRect(x - 10, y - 11, 66, 22);
    }

    ctx.restore();
  }

  // ══════════════════════════════════════
  //  DOM 렌더링 (Stage1 등)
  // ══════════════════════════════════════
  createDOM() {
    const el = document.createElement('span');
    el.className = 'stage-timer-dom';
    el.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      font-size:var(--label-lg);font-weight:700;padding:clamp(1px, 0.5vw, 2px) clamp(4px, 1.5vw, 8px);
      border-radius:6px;background:rgba(0,0,0,0.3);
    `;
    el.innerHTML = `<span style="font-size:clamp(14px, 4vw, 18px);">⏰</span><span class="st-text"></span>`;
    this._domEl = el;
    return el;
  }

  updateDOM() {
    if (!this._domEl) return;
    const textEl = this._domEl.querySelector('.st-text');
    if (!textEl) return;

    const display = this.getDisplay();
    const isLow = this.remaining < 30000;
    const isCritical = this.remaining < 10000;

    textEl.textContent = display;
    textEl.style.color = isCritical ? '#ff4444' : isLow ? '#fbbf24' : '#fff';

    if (isCritical) {
      this._domEl.style.background = Math.floor(this.remaining / 400) % 2 === 0
        ? 'rgba(255,68,68,0.25)' : 'rgba(0,0,0,0.3)';
    }
  }

  /** 타이머 리셋 */
  reset(newDuration) {
    if (newDuration !== undefined) this.duration = newDuration;
    this.remaining = this.duration;
    this.elapsed = 0;
    this.finished = false;
    this.running = false;
  }
}
