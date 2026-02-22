/**
 * BossApproachSystem -- 보스 접근 시스템 (맵 연동)
 *
 * 뱀서류/서바이벌 공통 모듈.
 * 실제 보스 엔티티가 맵 오른쪽 끝에서 스폰하여 플레이어를 향해 전진한다.
 * 좌측 포자안개(AutoScroll)와 "집게 효과" — 양쪽에서 영역 축소.
 * 보스가 플레이어에 도달하면 배틀아레나를 동적 생성하고 보스전 돌입.
 *
 * ★ 이동 방식:
 *   - 보스 X축: speed(가속) 기반 좌측 이동 (플레이어를 향해)
 *   - 보스 Y축: 플레이어 Y를 부드럽게 추적 (lerp 0.002)
 *   - boundary: 보스 X 위치 + 여백 (플레이어 우측 이동 제한)
 *   - 타이머 종료 후 속도 5배 급가속
 *
 * Phase: DORMANT -> APPROACHING -> WARNING -> MEETING(500ms) -> ARENA_FORMING(1500ms) -> BOSS_FIGHT -> COMPLETE
 */

import { BOSS_APPROACH_CONFIG, BOSS_ROOM_CONFIG } from '../data/combat-config.js';
import BossRoomSystem from '../combat/boss-room-system.js';

const PHASE = {
  DORMANT: 'dormant',
  APPROACHING: 'approaching',
  WARNING: 'warning',
  MEETING: 'meeting',
  ARENA_FORMING: 'arena_forming',
  BOSS_FIGHT: 'boss_fight',
  COMPLETE: 'complete',
};

export { PHASE as BOSS_APPROACH_PHASE };

export default class BossApproachSystem {
  /**
   * @param {object} engine - CombatEngine 또는 SurvivalEngine 인스턴스
   * @param {object} options
   * @param {number}  options.mapWidth   - 맵 너비 px (필수)
   * @param {number}  options.mapHeight  - 맵 높이 px (필수)
   * @param {number}  options.stageLevel - 스테이지 레벨 (기본 1)
   * @param {object}  options.autoScroll - AutoScroll 참조 (null 가능)
   * @param {string}  options.bossTheme  - 보스방 테마 키
   * @param {string}  options.bossType   - 보스 타입 키
   */
  constructor(engine, options = {}) {
    this.engine = engine;
    this.mapWidth = options.mapWidth;
    this.mapHeight = options.mapHeight;
    this.stageLevel = options.stageLevel || 1;
    this.autoScroll = options.autoScroll || null;

    // 보스방 설정
    const stageMapping = BOSS_ROOM_CONFIG.stageMapping[this.stageLevel];
    this.bossTheme = options.bossTheme || stageMapping?.theme || 'forest_clearing';
    this.bossType = options.bossType || stageMapping?.bossType || 'boss_infected_elder';

    // ── 보스 속도 자동 계산: 플레이어(고정)까지 ~3분에 도달 ──
    // 보스 시작 y=100, 플레이어 y≈mapH-120 → 거리 = mapH-220
    const cfg = options.approachConfig || BOSS_APPROACH_CONFIG;
    const bossDistance = Math.max(500, this.mapHeight - 220);
    const targetFrames = 170 * 60; // ~2분50초 (여유 10초)
    const avgSpeed = bossDistance / targetFrames;
    this.baseSpeed = avgSpeed * 0.7;   // 초반 느리게 시작
    this.accel = (avgSpeed * 0.6) / 180000; // 3분에 걸쳐 점진 가속
    this.speed = this.baseSpeed;
    this.alwaysActive = options.alwaysActive ?? true;

    // 설정 값
    this.warningZone = cfg.warningZone || 150;
    this.timerAccelMultiplier = cfg.timerAccelMultiplier || 5.0;
    this.timerAccelMinSpeed = cfg.timerAccelMinSpeed || 8.0;
    this.minGap = cfg.minGap || 300;
    this.arenaFormDuration = cfg.arenaFormDuration || 1500;
    this.meetingDuration = cfg.meetingDuration || 500;
    this.startDelay = cfg.startDelay || 5000;
    this.bossRoomTimeLimit = cfg.bossRoomTimeLimit || 300000;
    this.visual = cfg.visual || BOSS_APPROACH_CONFIG.visual;

    // 상태
    this.phase = PHASE.DORMANT;
    this.boundary = 0;  // 종스크롤: Y축 상단 경계 (보스가 위에서 내려옴)
    this._elapsed = 0;
    this._phaseTimer = 0;
    this._timerEnded = false;
    this._started = false;
    this._paused = false;
    this._pulsePhase = 0;

    // ★ 보스 엔티티 (맵 위 실제 오브젝트) — 종스크롤: 상단에서 아래로 접근
    this.boss = {
      x: this.mapWidth / 2,             // 맵 가로 중앙
      y: 100,                           // 맵 상단
      emoji: this.visual.bossEmoji,    // 🍄
      size: 48,                        // 이모지 크기 px
      bobPhase: 0,                     // 통통 뜀 위상
      glowPhase: 0,                    // 글로우 위상
      xTrackSpeed: 0.002,              // X축 플레이어 추적 강도
    };

    // 만남 지점
    this._meetingX = 0;
    this._meetingY = 0;

    // 아레나 형성 진행도 (0~1)
    this._arenaFormProgress = 0;

    // 보스방 시스템 (MEETING 시 생성)
    this.bossRoomSystem = null;
  }

  /** 접근 시작 (보통 스테이지 시작 5초 후 호출) */
  start() {
    this._started = true;
    this.phase = PHASE.APPROACHING;
  }

  pause() { if (this.alwaysActive) return; this._paused = true; }
  resume() { this._paused = false; }

  stop() {
    if (this.alwaysActive) return;
    this._started = false;
    this._paused = true;
    this.phase = PHASE.DORMANT;
  }

  // ══════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════

  /** 매 프레임 호출 */
  update(dt) {
    if (!this._started || this._paused) return;

    this._pulsePhase += dt * 0.005;

    switch (this.phase) {
      case PHASE.APPROACHING:
        this._updateBossMovement(dt);
        this._updateBoundary();
        this._checkWarning();
        this._checkMeeting();
        break;

      case PHASE.WARNING:
        this._updateBossMovement(dt);
        this._updateBoundary();
        this._checkMeeting();
        break;

      case PHASE.MEETING:
        this._phaseTimer += dt;
        if (this._phaseTimer >= this.meetingDuration) {
          this._enterArenaForming();
        }
        break;

      case PHASE.ARENA_FORMING:
        this._phaseTimer += dt;
        this._arenaFormProgress = Math.min(1, this._phaseTimer / this.arenaFormDuration);
        if (this._phaseTimer >= this.arenaFormDuration) {
          this._enterBossFight();
        }
        break;

      case PHASE.BOSS_FIGHT:
        this._phaseTimer += dt;
        if (this.bossRoomSystem) {
          this.bossRoomSystem.update(dt);
          if (this.bossRoomSystem.phase === 'complete') {
            this.phase = PHASE.COMPLETE;
          }
        }
        // 보스방 최대 5분 → 자동 클리어
        if (this._phaseTimer >= this.bossRoomTimeLimit) {
          this.phase = PHASE.COMPLETE;
        }
        break;
    }
  }

  // ══════════════════════════════════
  //  DRAW (엔티티 레이어)
  // ══════════════════════════════════

  /** Canvas 렌더링 — 맵 위 보스 엔티티 */
  draw(ctx, camera, W, H) {
    if (!this._started) return;

    switch (this.phase) {
      case PHASE.APPROACHING:
      case PHASE.WARNING:
        this._drawBossOnMap(ctx, camera, W, H);
        break;

      case PHASE.MEETING:
        this._drawBossOnMap(ctx, camera, W, H);
        break;

      case PHASE.BOSS_FIGHT:
        if (this.bossRoomSystem) {
          this.bossRoomSystem.draw(ctx, camera);
        }
        break;
    }
  }

  /** HUD 위에 그려야 하는 오버레이 (조우 텍스트, 아레나 형성) */
  drawOverlays(ctx, camera, W, H) {
    if (!this._started) return;

    if (this.phase === PHASE.MEETING) {
      this._drawMeetingOverlay(ctx, W, H);
    } else if (this.phase === PHASE.ARENA_FORMING) {
      this._drawArenaForming(ctx, camera, W, H);
    }
  }

  // ══════════════════════════════════
  //  QUERY API
  // ══════════════════════════════════

  /** 현재 우측 경계 X좌표 */
  getBoundary() { return this.boundary; }

  /** 현재 Phase 문자열 */
  getPhase() { return this.phase; }

  /** BOSS_FIGHT 이후 true */
  isInBossPhase() {
    return this.phase === PHASE.BOSS_FIGHT || this.phase === PHASE.COMPLETE;
  }

  /** MEETING/ARENA_FORMING 중 true (웨이브 중단) */
  isBlocking() {
    return this.phase === PHASE.MEETING || this.phase === PHASE.ARENA_FORMING;
  }

  /** 타이머 종료 시 호출 → 급가속 */
  onTimerEnd() {
    this._timerEnded = true;

    // 화면 흔들림
    this.engine._screenShake = { intensity: 4, duration: 400, timer: 0 };
  }

  // ══════════════════════════════════
  //  INTERNAL: Boss Movement (맵 연동)
  // ══════════════════════════════════

  /**
   * 보스 엔티티 이동 — 맵 좌표계에서 플레이어를 향해 전진 (종스크롤)
   * Y축: speed(가속) 기반 아래쪽 이동 (상단에서 플레이어를 향해)
   * X축: 플레이어 X를 부드럽게 추적 (lerp)
   */
  _updateBossMovement(dt) {
    this._elapsed += dt;

    // 속도 계산 (시간에 따라 가속)
    this.speed = this.baseSpeed + this._elapsed * this.accel;

    // 타이머 종료 후 급가속
    if (this._timerEnded) {
      this.speed = Math.max(this.speed * this.timerAccelMultiplier, this.timerAccelMinSpeed);
    }

    const player = this.engine.player;

    // ── Y축: 플레이어를 향해 아래쪽 이동 ──
    this.boss.y += this.speed * (dt / 16);

    // AutoScroll 경계와 최소 간격 유지
    const autoScrollBound = this.autoScroll ? this.autoScroll.getBoundary() : this.mapHeight;
    const maxBossY = autoScrollBound - this.minGap;
    this.boss.y = Math.min(maxBossY, this.boss.y);

    // ── X축: 플레이어 X를 부드럽게 추적 ──
    const dx = player.x - this.boss.x;
    this.boss.x += dx * (this.boss.xTrackSpeed || 0.002) * dt;
    // 맵 범위 클램프
    this.boss.x = Math.max(40, Math.min(this.mapWidth - 40, this.boss.x));

    // 애니메이션 위상
    this.boss.bobPhase += dt * 0.003;
    this.boss.glowPhase += dt * 0.005;
  }

  /** boundary를 보스 위치 기반으로 갱신 (종스크롤: Y축) */
  _updateBoundary() {
    // 경계 = 보스 Y - 여백 (플레이어가 보스 위로 못 감)
    this.boundary = this.boss.y - 60;
  }

  _checkWarning() {
    const player = this.engine.player;
    // 종스크롤: 플레이어 Y와 보스 Y 차이 (보스가 위에서 내려옴)
    const distToBoss = player.y - this.boss.y;

    if (distToBoss <= this.warningZone && this.phase === PHASE.APPROACHING) {
      this.phase = PHASE.WARNING;
    }
  }

  _checkMeeting() {
    const player = this.engine.player;

    // 조건 1: 보스와 플레이어 거리 < 100px (2D 거리)
    const dx = this.boss.x - player.x;
    const dy = this.boss.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      this._triggerMeeting();
      return;
    }

    // 조건 2: 보스 Y가 플레이어 Y 근접 (Y축 기준, 보스가 위에서 내려옴)
    if (-dy < 50) {
      this._triggerMeeting();
      return;
    }

    // 조건 3: AutoScroll과 보스 간격 < minGap
    if (this.autoScroll) {
      const gap = this.autoScroll.getBoundary() - this.boss.y;
      if (gap <= this.minGap) {
        this._triggerMeeting();
      }
    }
  }

  _triggerMeeting() {
    this.phase = PHASE.MEETING;
    this._phaseTimer = 0;

    // 만남 지점 = 보스와 플레이어 사이
    const player = this.engine.player;
    this._meetingX = (player.x + this.boss.x) / 2;
    this._meetingY = (player.y + this.boss.y) / 2;

    // AutoScroll 정지
    if (this.autoScroll) {
      this.autoScroll.pause();
    }

    // 잔여 적 전멸 (폭발 이펙트)
    if (this.engine.enemies) {
      for (const e of this.engine.enemies) {
        if (this.engine.particles) {
          for (let i = 0; i < 6; i++) {
            this.engine.particles.push({
              x: e.x, y: e.y,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2.5,
              life: 600, color: '#ff6b6b', size: 3, type: 'circle',
            });
          }
        }
      }
      this.engine.enemies.length = 0;
    }

    // 화면 흔들림
    this.engine._screenShake = { intensity: 6, duration: 500, timer: 0 };

    if (typeof SoundSFX !== 'undefined' && SoundSFX.bossAppear) SoundSFX.bossAppear();
  }

  _enterArenaForming() {
    this.phase = PHASE.ARENA_FORMING;
    this._phaseTimer = 0;
    this._arenaFormProgress = 0;

    this.bossRoomSystem = new BossRoomSystem(this.engine, this.stageLevel);
    this.bossRoomSystem.activateAtPosition(this._meetingX, this._meetingY, this.bossTheme);
  }

  _enterBossFight() {
    this.phase = PHASE.BOSS_FIGHT;
    this._phaseTimer = 0;
  }

  // ══════════════════════════════════
  //  INTERNAL: Rendering
  // ══════════════════════════════════

  /**
   * 맵 위 보스 엔티티 렌더링 (카메라 좌표 변환)
   * — 보스 이모지 + 글로우 + 통통 뜀 + 이름표 + 포자 파티클
   */
  _drawBossOnMap(ctx, camera, W, H) {
    const rawSx = this.boss.x - camera.x;
    const rawSy = this.boss.y - camera.y;

    // 원근법 변환 (엔진에 _persp가 있으면 사용)
    let sx = rawSx, sy = rawSy, sc = 1;
    if (this.engine._persp) {
      const p = this.engine._persp(rawSx, rawSy);
      sx = p.px; sy = p.py; sc = p.s;
    }

    // 화면 밖이면 방향 화살표만 표시 (종스크롤: 상단 밖)
    if (rawSy < -60) {
      this._drawOffscreenIndicator(ctx, W, H, sx);
      return;
    }
    if (sx < -60 || sx > W + 60 || sy > H + 60) return;

    const bob = Math.sin(this.boss.bobPhase) * 5 * sc;
    const glowAlpha = 0.3 + Math.sin(this.boss.glowPhase) * 0.2;
    const bossSize = this.boss.size * sc;
    const glowR = 60 * sc;

    ctx.save();

    // ── 지면 그림자 ──
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 25 * sc, 22 * sc, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── 붉은 글로우 오라 ──
    const grad = ctx.createRadialGradient(sx, sy + bob, 0, sx, sy + bob, glowR);
    grad.addColorStop(0, `rgba(255,50,50,${glowAlpha * 0.4})`);
    grad.addColorStop(0.5, `rgba(255,20,20,${glowAlpha * 0.15})`);
    grad.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy + bob, glowR, 0, Math.PI * 2);
    ctx.fill();

    // ── 포자 파티클 (보스 주변에 흩날림) ──
    ctx.fillStyle = this.visual.particleColor;
    for (let i = 0; i < 6; i++) {
      const angle = this._pulsePhase * 1.3 + i * (Math.PI * 2 / 6);
      const dist = (30 + Math.sin(this._pulsePhase * 2 + i) * 15) * sc;
      const px = sx + Math.cos(angle) * dist;
      const py = sy + bob + Math.sin(angle) * dist * 0.6;
      const size = (2 + Math.sin(this._pulsePhase + i * 0.8) * 1.5) * sc;
      ctx.globalAlpha = 0.4 + Math.sin(this._pulsePhase + i) * 0.3;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── 보스 이모지 (원근 크기, 통통 뜀) ──
    ctx.shadowColor = `rgba(255,0,0,${glowAlpha + 0.2})`;
    ctx.shadowBlur = 25 * sc;
    ctx.font = `${Math.round(bossSize)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.boss.emoji, sx, sy + bob);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /** 보스가 화면 상단 밖에 있을 때 방향 표시 (종스크롤) */
  _drawOffscreenIndicator(ctx, W, H, sx) {
    const arrowX = Math.max(30, Math.min(W - 30, sx));
    const pulse = 0.5 + Math.sin(this._pulsePhase * 3) * 0.3;

    ctx.save();
    ctx.globalAlpha = pulse;

    // 빨간 위쪽 화살표 + 보스 이모지 축소
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('\u25B2', arrowX, 18);  // ▲

    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.boss.emoji, arrowX, 40);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 오버레이 (HUD 위) ──

  _drawMeetingOverlay(ctx, W, H) {}

  _drawArenaForming(ctx, camera, W, H) {
    ctx.save();

    const cx = this._meetingX - camera.x;
    const cy = this._meetingY - camera.y;
    const maxRadius = Math.max(W, H);
    const radius = maxRadius * this._arenaFormProgress;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(251,191,36,0.15)');
    grad.addColorStop(0.7, 'rgba(251,191,36,0.08)');
    grad.addColorStop(1, 'rgba(251,191,36,0.3)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `rgba(251,191,36,${0.6 + Math.sin(this._pulsePhase * 3) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }
}
