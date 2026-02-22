/**
 * dice-system.js — 주사위 시스템 (DOM 기반)
 * 캔디매치 턴 종료 후 자동 주사위 굴림
 * 1~6 랜덤 결과, 1.5초 애니메이션
 */

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default class DiceSystem {
  constructor() {
    this.value = 0;
    this.rolling = false;
    this._animTimer = null;
    this._el = null;         // 렌더링 컨테이너
    this._valueEl = null;    // 주사위 숫자 표시 엘리먼트
  }

  /**
   * 주사위를 표시할 컨테이너에 렌더링
   * @param {HTMLElement} container
   */
  renderTo(container) {
    this._el = container;
    this._el.innerHTML = `
      <div class="dice-display" id="dice-display" style="display:none;">
        <div class="dice-face" id="dice-face">🎲</div>
        <div class="dice-label" id="dice-label"></div>
      </div>
    `;
    this._faceEl = this._el.querySelector('#dice-face');
    this._labelEl = this._el.querySelector('#dice-label');
    this._displayEl = this._el.querySelector('#dice-display');
  }

  /**
   * 주사위 굴리기
   * @param {number} bonus 보너스 (콤보 5+ 시 +1)
   * @param {function} callback 결과 콜백 (value)
   */
  roll(bonus = 0, callback) {
    if (this.rolling) return;
    this.rolling = true;

    // 결과 미리 결정 (1~6)
    this.value = Math.floor(Math.random() * 6) + 1 + bonus;
    this.value = Math.min(this.value, 6);

    // UI 표시
    if (this._displayEl) this._displayEl.style.display = 'flex';

    // 애니메이션: 1.5초간 빠르게 숫자 변경
    const duration = 1500;
    const start = Date.now();
    let interval = 60; // 처음엔 빠르게

    const animate = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        // 결과 확정
        this._showFace(this.value, false);
        if (this._labelEl) this._labelEl.textContent = `🎲 ${this.value}!`;
        this.rolling = false;

        // 0.8초 후 콜백
        setTimeout(() => {
          if (callback) callback(this.value);
        }, 800);
        return;
      }

      // 속도 점점 느려짐
      const progress = elapsed / duration;
      interval = 60 + Math.floor(progress * 200);

      // 랜덤 숫자 표시 (흔들림 효과)
      const fake = Math.floor(Math.random() * 6) + 1;
      this._showFace(fake, true);

      this._animTimer = setTimeout(animate, interval);
    };

    animate();
  }

  _showFace(value, shaking) {
    if (!this._faceEl) return;
    this._faceEl.textContent = DICE_FACES[value - 1] || '🎲';
    this._faceEl.style.fontSize = '48px';

    if (shaking) {
      const rx = (Math.random() - 0.5) * 8;
      const ry = (Math.random() - 0.5) * 8;
      const rot = (Math.random() - 0.5) * 15;
      this._faceEl.style.transform = `translate(${rx}px, ${ry}px) rotate(${rot}deg)`;
    } else {
      this._faceEl.style.transform = 'scale(1.2)';
      setTimeout(() => {
        if (this._faceEl) this._faceEl.style.transform = 'scale(1)';
      }, 200);
    }
  }

  /** 결과만 간단히 표시 (이미 굴린 후) */
  showResult() {
    if (this._displayEl) this._displayEl.style.display = 'flex';
    if (this.value > 0) {
      this._showFace(this.value, false);
      if (this._labelEl) this._labelEl.textContent = `🎲 ${this.value}`;
    }
  }

  /** 주사위 숨기기 */
  hide() {
    if (this._displayEl) this._displayEl.style.display = 'none';
  }

  /** 리셋 */
  reset() {
    this.value = 0;
    this.rolling = false;
    if (this._animTimer) clearTimeout(this._animTimer);
    this.hide();
  }

  destroy() {
    if (this._animTimer) clearTimeout(this._animTimer);
    this.rolling = false;
  }
}
