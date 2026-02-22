/**
 * AutoWalk -- 영웅 자동 전진 시스템 (종스크롤: 아래→위)
 *
 * 뱀서류/서바이벌 공통 모듈.
 * 영웅이 자동으로 위쪽으로 걸어가며, 3분에 보스와 만나는 속도로 계산됨.
 * 수동 입력(WASD/터치)과 합산되어 적용됨.
 *
 * ★ 속도 계산:
 *   보스가 3분간 아래쪽으로 이동하는 거리 = (bossSpeed*T + 0.5*bossAccel*T^2) / 16
 *   플레이어가 커버해야 하는 거리 = mapHeight - bossDist - margin
 *   autoWalkSpeed = playerDist * 16 / T  (일정 속도, px/frame @60fps)
 *
 * 사용법:
 *   import AutoWalk from '../systems/auto-walk.js';
 *   const walk = new AutoWalk({ mapHeight, stageLevel });
 *   walk.start();
 *   // 매 프레임 _updatePlayer 에서:
 *   walk.update(dt, player);  // player.y 직접 감소 (위로)
 */

import { BOSS_APPROACH_CONFIG } from '../data/combat-config.js';

export default class AutoWalk {
  /**
   * @param {object} options
   * @param {number}  options.mapHeight     - 맵 높이 px (필수, 종스크롤)
   * @param {number}  options.mapWidth      - 맵 너비 px (하위 호환, mapHeight 우선)
   * @param {number}  options.stageLevel    - 스테이지 레벨 (기본 1)
   * @param {number}  options.timerDuration - 타이머 시간 ms (기본 180000 = 3분)
   */
  constructor(options = {}) {
    this.mapHeight = options.mapHeight || options.mapWidth;
    this.stageLevel = options.stageLevel || 1;
    this.timerDuration = options.timerDuration || 180000;
    this.alwaysActive = options.alwaysActive ?? true;

    this.running = false;
    this._paused = false;

    // autoWalkSpeed 직접 지정 시 계산 생략 (공중전 등)
    if (options.autoWalkSpeed) {
      this.speed = options.autoWalkSpeed;
    } else {
      // 보스 접근 속도 설정 (스테이지별 오버라이드)
      const bossConfig = options.bossApproachConfig || BOSS_APPROACH_CONFIG;
      const override = bossConfig.stageOverrides?.[this.stageLevel] || {};
      this._bossBaseSpeed = override.baseSpeed ?? bossConfig.baseSpeed;
      this._bossAccel = override.accel ?? bossConfig.accel;

      // 3분에 보스를 만나는 속도 계산
      this.speed = this._calculateSpeed();
    }
  }

  /**
   * 3분 동안 보스+플레이어가 맵 전체를 커버하도록 플레이어 속도 계산
   * @returns {number} px/frame @60fps (dt=16 기준)
   */
  _calculateSpeed() {
    const T = this.timerDuration; // ms

    // 보스가 T ms 동안 아래쪽으로 이동하는 총 거리 (px)
    const bossDist = (this._bossBaseSpeed * T + 0.5 * this._bossAccel * T * T) / 16;

    // 플레이어가 커버해야 하는 거리 (양쪽 마진 200px 제외)
    const playerDist = Math.max(0, this.mapHeight - bossDist - 200);

    // 일정 속도 (px/frame @60fps)
    return (playerDist * 16) / T;
  }

  start() { this.running = true; }
  pause() { if (this.alwaysActive) return; this._paused = true; }
  resume() { this._paused = false; }
  stop() { if (this.alwaysActive) return; this.running = false; this._paused = false; }

  /**
   * 매 프레임 호출 -- 플레이어를 자동 전진시킴 (Y축 위로)
   * @param {number} dt - 밀리초
   * @param {{y:number}} player - 플레이어 객체 (y 직접 수정)
   */
  update(dt, player) {
    if (!this.running || this._paused) return;
    player.y -= this.speed * (dt / 16);
  }

  /** 현재 자동 전진 속도 */
  getSpeed() { return this.speed; }
}
