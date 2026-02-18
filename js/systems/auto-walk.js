/**
 * AutoWalk -- 영웅 자동 전진 시스템
 *
 * 뱀서류/서바이벌 공통 모듈.
 * 영웅이 자동으로 오른쪽으로 걸어가며, 3분에 보스와 만나는 속도로 계산됨.
 * 수동 입력(WASD/터치)과 합산되어 적용됨.
 *
 * ★ 속도 계산:
 *   보스가 3분간 좌측으로 이동하는 거리 = (bossSpeed*T + 0.5*bossAccel*T^2) / 16
 *   플레이어가 커버해야 하는 거리 = mapWidth - bossDist - margin
 *   autoWalkSpeed = playerDist * 16 / T  (일정 속도, px/frame @60fps)
 *
 * 사용법:
 *   import AutoWalk from '../systems/auto-walk.js';
 *   const walk = new AutoWalk({ mapWidth, stageLevel });
 *   walk.start();
 *   // 매 프레임 _updatePlayer 에서:
 *   walk.update(dt, player);  // player.x 직접 증가
 */

import { BOSS_APPROACH_CONFIG } from '../data/combat-config.js';

export default class AutoWalk {
  /**
   * @param {object} options
   * @param {number}  options.mapWidth      - 맵 너비 px (필수)
   * @param {number}  options.stageLevel    - 스테이지 레벨 (기본 1)
   * @param {number}  options.timerDuration - 타이머 시간 ms (기본 180000 = 3분)
   */
  constructor(options = {}) {
    this.mapWidth = options.mapWidth;
    this.stageLevel = options.stageLevel || 1;
    this.timerDuration = options.timerDuration || 180000;

    this.running = false;
    this._paused = false;

    // 보스 접근 속도 설정 (스테이지별 오버라이드)
    const cfg = BOSS_APPROACH_CONFIG;
    const override = cfg.stageOverrides[this.stageLevel] || {};
    this._bossBaseSpeed = override.baseSpeed ?? cfg.baseSpeed;
    this._bossAccel = override.accel ?? cfg.accel;

    // 3분에 보스를 만나는 속도 계산
    this.speed = this._calculateSpeed();
  }

  /**
   * 3분 동안 보스+플레이어가 맵 전체를 커버하도록 플레이어 속도 계산
   * @returns {number} px/frame @60fps (dt=16 기준)
   */
  _calculateSpeed() {
    const T = this.timerDuration; // ms

    // 보스가 T ms 동안 좌측으로 이동하는 총 거리 (px)
    // distance = integral_0^T (baseSpeed + t*accel) * (1/16) dt
    //          = (baseSpeed * T + 0.5 * accel * T^2) / 16
    const bossDist = (this._bossBaseSpeed * T + 0.5 * this._bossAccel * T * T) / 16;

    // 플레이어가 커버해야 하는 거리 (양쪽 마진 200px 제외)
    const playerDist = Math.max(0, this.mapWidth - bossDist - 200);

    // 일정 속도 (px/frame @60fps)
    // totalFrames = T / 16, speed = playerDist / totalFrames
    return (playerDist * 16) / T;
  }

  start() { this.running = true; }
  pause() { this._paused = true; }
  resume() { this._paused = false; }
  stop() { this.running = false; this._paused = false; }

  /**
   * 매 프레임 호출 -- 플레이어를 자동 전진시킴
   * @param {number} dt - 밀리초
   * @param {{x:number}} player - 플레이어 객체 (x 직접 수정)
   */
  update(dt, player) {
    if (!this.running || this._paused) return;
    player.x += this.speed * (dt / 16);
  }

  /** 현재 자동 전진 속도 */
  getSpeed() { return this.speed; }
}
