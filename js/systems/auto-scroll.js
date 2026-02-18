/**
 * AutoScroll — 뱀서류 자동 전진 시스템
 *
 * 맵이 영웅쪽으로 계속 밀려와서 앞으로 전진할 수밖에 없는 구조.
 * 뒤처지면 어둠 벽(포자 안개)에 잡혀 데미지를 받음.
 *
 * 사용법:
 *   import AutoScroll from '../systems/auto-scroll.js';
 *   const scroll = new AutoScroll({ speed: 0.8, direction: 'horizontal' });
 *   scroll.start();
 *   // 매 프레임:
 *   const result = scroll.update(dt, player);
 *   if (result.damage > 0) engine._damagePlayer(result.damage);
 *   // 렌더링:
 *   scroll.draw(ctx, camera, canvasW, canvasH);
 */

export default class AutoScroll {
  /**
   * @param {object} options
   * @param {number}  options.speed         - 전진 속도 (px/frame @60fps, 기본 0.8)
   * @param {string}  options.direction     - 'horizontal'(좌→우) | 'vertical'(상→하) | 'radial'(중심 수축)
   * @param {number}  options.startBoundary - 시작 경계 위치 (기본 0)
   * @param {number}  options.warningZone   - 경고 구간 폭 (px, 기본 120)
   * @param {number}  options.damagePerSec  - 경계 안에서 초당 데미지 (기본 25)
   * @param {number}  options.pushForce     - 경계 근처에서 플레이어를 밀어내는 힘 (기본 1.5)
   * @param {number}  options.accel         - 시간에 따른 가속 계수 (기본 0.0001)
   */
  constructor(options = {}) {
    this.speed = options.speed || 0.8;
    this.baseSpeed = this.speed;
    this.direction = options.direction || 'horizontal';
    this.boundary = options.startBoundary || 0;
    this.warningZone = options.warningZone || 120;
    this.damagePerSec = options.damagePerSec || 25;
    this.pushForce = options.pushForce || 1.5;
    this.accel = options.accel || 0.0001;

    this.running = false;
    this._elapsed = 0;
    this._damageTimer = 0;
    this._pulsePhase = 0;
  }

  start() { this.running = true; }
  pause() { this.running = false; }
  resume() { this.running = true; }

  /**
   * 매 프레임 호출
   * @param {number} dt - 밀리초
   * @param {{x:number, y:number}} player - 플레이어 위치
   * @returns {{ damage:number, inWarning:boolean, inDamage:boolean, pushX:number, pushY:number }}
   */
  update(dt, player) {
    const result = { damage: 0, inWarning: false, inDamage: false, pushX: 0, pushY: 0 };
    if (!this.running) return result;

    this._elapsed += dt;
    this._pulsePhase += dt * 0.005;

    // 시간에 따라 속도 점진적 증가
    this.speed = this.baseSpeed + this._elapsed * this.accel;

    // 경계 전진
    this.boundary += this.speed * (dt / 16);

    // 플레이어 위치 기준 체크
    const pos = this.direction === 'horizontal' ? player.x : player.y;
    const warningEdge = this.boundary + this.warningZone;

    result.inDamage = pos < this.boundary;
    result.inWarning = pos < warningEdge && !result.inDamage;

    // 데미지 구간: 0.5초마다 데미지
    if (result.inDamage) {
      this._damageTimer += dt;
      if (this._damageTimer >= 500) {
        this._damageTimer -= 500;
        result.damage = Math.round(this.damagePerSec * 0.5);
      }
      // 강제 밀어내기
      const pushStr = this.pushForce * (dt / 16);
      if (this.direction === 'horizontal') {
        result.pushX = pushStr;
      } else {
        result.pushY = pushStr;
      }
    }

    // 경고 구간: 약한 밀어내기
    if (result.inWarning) {
      const ratio = 1 - (pos - this.boundary) / this.warningZone;
      const pushStr = this.pushForce * 0.3 * ratio * (dt / 16);
      if (this.direction === 'horizontal') {
        result.pushX = pushStr;
      } else {
        result.pushY = pushStr;
      }
    }

    return result;
  }

  /**
   * Canvas에 어둠 벽(포자 안개) 렌더링
   * @param {CanvasRenderingContext2D} ctx
   * @param {{x:number, y:number}} camera
   * @param {number} W - 캔버스 폭
   * @param {number} H - 캔버스 높이
   */
  draw(ctx, camera, W, H) {
    // 안개 시각 효과 비활성화 (경계/데미지/밀어내기 로직은 유지)
    return;
  }

  _drawHorizontal(ctx, camera, W, H) {
    const bx = this.boundary - camera.x;

    // 어둠 벽 (왼쪽에서 밀려오는 안개)
    if (bx > -200) {
      // 짙은 안개 영역
      const grad = ctx.createLinearGradient(0, 0, Math.max(1, bx + 80), 0);
      grad.addColorStop(0, 'rgba(30,0,40,0.95)');
      grad.addColorStop(0.6, 'rgba(50,10,60,0.8)');
      grad.addColorStop(0.85, 'rgba(80,20,100,0.4)');
      grad.addColorStop(1, 'rgba(100,30,120,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, Math.max(1, bx + 80), H);

      // 포자 파티클 효과 (경계선 근처)
      const pulse = 0.5 + Math.sin(this._pulsePhase) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#c084fc';
      for (let i = 0; i < 6; i++) {
        const py = (H * (i + 0.5)) / 6 + Math.sin(this._pulsePhase + i * 1.2) * 15;
        const px = bx - 10 + Math.cos(this._pulsePhase * 1.3 + i) * 20;
        ctx.beginPath();
        ctx.arc(px, py, 3 + Math.sin(this._pulsePhase + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 경고 구간 표시
      const wx = this.boundary + this.warningZone - camera.x;
      if (wx > 0 && wx < W) {
        const warnGrad = ctx.createLinearGradient(Math.max(0, bx), 0, wx, 0);
        warnGrad.addColorStop(0, 'rgba(168,85,247,0.15)');
        warnGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = warnGrad;
        ctx.fillRect(Math.max(0, bx), 0, wx - Math.max(0, bx), H);
      }
    }

    // 경계선 맥동 라인
    if (bx > -10 && bx < W + 10) {
      const pulse = 0.4 + Math.sin(this._pulsePhase * 2) * 0.4;
      ctx.strokeStyle = `rgba(168,85,247,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 화면 좌측 "위험" 이모지
    if (bx > 20) {
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6 + Math.sin(this._pulsePhase * 3) * 0.3;
      ctx.fillText('☠️', bx - 25, H / 2);
      ctx.globalAlpha = 1;
    }
  }

  _drawVertical(ctx, camera, W, H) {
    const by = this.boundary - camera.y;

    if (by > -200) {
      const grad = ctx.createLinearGradient(0, 0, 0, Math.max(1, by + 80));
      grad.addColorStop(0, 'rgba(30,0,40,0.95)');
      grad.addColorStop(0.6, 'rgba(50,10,60,0.8)');
      grad.addColorStop(0.85, 'rgba(80,20,100,0.4)');
      grad.addColorStop(1, 'rgba(100,30,120,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, Math.max(1, by + 80));

      // 포자 파티클
      const pulse = 0.5 + Math.sin(this._pulsePhase) * 0.3;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#c084fc';
      for (let i = 0; i < 6; i++) {
        const px = (W * (i + 0.5)) / 6 + Math.sin(this._pulsePhase + i * 1.2) * 15;
        const py = by - 10 + Math.cos(this._pulsePhase * 1.3 + i) * 20;
        ctx.beginPath();
        ctx.arc(px, py, 3 + Math.sin(this._pulsePhase + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 경고 구간
      const wy = this.boundary + this.warningZone - camera.y;
      if (wy > 0 && wy < H) {
        const warnGrad = ctx.createLinearGradient(0, Math.max(0, by), 0, wy);
        warnGrad.addColorStop(0, 'rgba(168,85,247,0.15)');
        warnGrad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = warnGrad;
        ctx.fillRect(0, Math.max(0, by), W, wy - Math.max(0, by));
      }
    }

    // 경계선 맥동
    if (by > -10 && by < H + 10) {
      const pulse = 0.4 + Math.sin(this._pulsePhase * 2) * 0.4;
      ctx.strokeStyle = `rgba(168,85,247,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(W, by);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /** 현재 경계 위치 */
  getBoundary() { return this.boundary; }

  /** 경계 리셋 */
  reset(startBoundary) {
    this.boundary = startBoundary || 0;
    this._elapsed = 0;
    this._damageTimer = 0;
    this.speed = this.baseSpeed;
  }
}
