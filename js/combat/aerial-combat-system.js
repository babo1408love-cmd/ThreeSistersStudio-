/**
 * AerialCombatSystem — 공중전 모드 관리
 *
 * 보스방에서 특정 조건 시 공중전으로 전환:
 *   바닥 사라짐 → 하늘 배경 → 부스터 질주(분노게이지) → 보스 추격 공격
 *
 * aerial-effects.js의 워프/스킬 이펙트를 사용
 * battle-arena.js의 sky 테마를 사용
 */
import { BattleArena, ARENA_THEMES } from '../generators/battle-arena.js';
import { WARP_EFFECTS, renderWarpEffect } from '../generators/aerial-effects.js';

// ══════════════════════════════════════════════════════
//  공중전 속도 시스템 (뱀서류 속도 시스템 기반)
//  원거리: 빠르게 접근 → 근거리: 동일 속도 (뱀서류와 동일 구조)
//  공중전 특화: 전체적으로 1.5배 빠름 + 수직 이동 자유
// ══════════════════════════════════════════════════════

// ── 공중전 적 속도 설정 (뱀서류 ENEMY_SPEED_CONFIG 복사 + 공중전 특화) ──
export const AERIAL_SPEED_CONFIG = {
  // 원거리 속도 배율 (플레이어 속도 대비) — 공중이라 더 빠름
  farSpeedMultiplier: 2.0,        // 원거리: 플레이어의 200% (빠르게 접근)
  // 근거리 속도 배율 (플레이어 속도 대비)
  nearSpeedMultiplier: 1.2,       // 근거리: 플레이어의 120% (살짝 빠름)
  // 근접 판정 거리 (px) — 이 이내면 nearSpeed 적용
  proximityRadius: 60,
  // 원거리 판정 거리 (px) — 이 이상이면 farSpeed 적용
  farRadius: 250,
  // 보스 전용 오버라이드
  boss: {
    farSpeedMultiplier: 1.6,      // 보스 원거리: 160% (묵직하지만 공중답게)
    nearSpeedMultiplier: 1.1,     // 보스 근거리: 110% (동일 속도)
    proximityRadius: 50,
    farRadius: 300,
  },
  // 워프 거리 (이 이상이면 플레이어 근처로 순간이동)
  warpDistance: 500,
  warpMinDist: 200,
  warpMaxDist: 350,
};

// ── 공중전 자동 스크롤 (하늘 바람이 밀려옴) ──
// ★ 지상 뱀서류의 절반 거리: 44,156px in 3분
//   검증: (0.325 * 180000 + 0.5 * 0.00004 * 180000²) / 16 = 44,156px ✓
export const AERIAL_SCROLL_CONFIG = {
  speed: 0.325,                   // 절반 거리 맞춤 (지상 0.65 의 50%)
  direction: 'horizontal',
  startBoundary: 0,
  warningZone: 100,               // 경고 구간 좁음 (빠른 반응 필요)
  damagePerSec: 30,               // 하늘 바깥 데미지 (높음)
  pushForce: 2.5,                 // 강한 바람 밀어내기
  accel: 0.00004,                 // 절반 거리 맞춤 (지상 0.00008 의 50%)
};

// ── 공중전 자동 전진 (보스와 3분에 만남) ──
// ★ autoWalkSpeed 계산:
//   맵 총 폭 ≈ 50,160px, 보스 이동거리 ≈ 16,875px
//   플레이어 커버 = 50,160 - 16,875 - 200 = 33,085px
//   speed = 33,085 × 16 / 180,000 ≈ 2.94 px/frame
export const AERIAL_WALK_CONFIG = {
  timerDuration: 180000,          // 3분
  autoWalkSpeed: 2.94,            // 절반 맵용 자동전진 속도 (px/frame @60fps)
};

// ── 공중전 보스 접근 (절반 거리 맞춤) ──
// ★ 보스 이동거리 계산:
//   (0.15 * 180000 + 0.5 * 0.000015 * 180000²) / 16 = 16,875px
//   플레이어 33,085px + 보스 16,875px + 마진 200px ≈ 50,160px (맵 전체) ✓
export const AERIAL_BOSS_APPROACH_CONFIG = {
  baseSpeed: 0.15,                // 절반 맵용 (지상 0.3 의 50%)
  accel: 0.000015,                // 절반 맵용 가속
  warningZone: 120,
  timerAccelMultiplier: 5.0,      // 타이머 종료 후 5배 속도
  timerAccelMinSpeed: 8.0,        // 최소 속도
  minGap: 250,                    // 스크롤과 최소 간격
  arenaFormDuration: 1200,        // 아레나 형성 빠름
  meetingDuration: 400,
  startDelay: 3000,               // 3초 후 시작
  bossRoomTimeLimit: 300000,
  visual: {
    fogColorInner: 'rgba(30,0,60,0.9)',   // 보라색 하늘 안개
    fogColorOuter: 'rgba(80,20,120,0)',
    particleColor: '#aa44ff',              // 보라 파티클
    bossEmoji: '\uD83D\uDC32',            // 🐲
    warningEmoji: '\u26A1',                // ⚡
  },
  stageOverrides: {
    1: { baseSpeed: 0.12, accel: 0.000012 },
    2: { baseSpeed: 0.15, accel: 0.000015 },
    3: { baseSpeed: 0.18, accel: 0.000018 },
    4: { baseSpeed: 0.20, accel: 0.000020 },
  },
};

// ── 공중전 적 속도 계산 (거리 기반 보간) ──
export function calcAerialEnemySpeed(dist, playerSpeed, isBoss = false) {
  const cfg = isBoss ? AERIAL_SPEED_CONFIG.boss : AERIAL_SPEED_CONFIG;
  const farR = cfg.farRadius;
  const nearR = cfg.proximityRadius;
  const farMul = cfg.farSpeedMultiplier;
  const nearMul = cfg.nearSpeedMultiplier;

  let t; // 0=near, 1=far
  if (dist <= nearR) {
    t = 0;
  } else if (dist >= farR) {
    t = 1;
  } else {
    t = (dist - nearR) / (farR - nearR);
  }
  const multiplier = nearMul + (farMul - nearMul) * t;
  return playerSpeed * multiplier;
}

// 공중전 페이즈
const AERIAL_PHASE = {
  INACTIVE: 'inactive',
  TRANSITIONING: 'transitioning',  // 지상→공중 전환 연출
  FLIGHT: 'flight',                // 공중 전투 (일반)
  BOOSTER: 'booster',              // 부스터 질주 (분노게이지 발동)
  BOOSTER_END: 'booster_end',      // 부스터 종료 → 일반 전투 복귀
};

export { AERIAL_PHASE };

// 부스터 설정
const BOOSTER_CONFIG = {
  trigger: 'rage_gauge',           // 분노 게이지 100%로 발동
  duration: 4000,                  // 4초간 질주
  speedMultiplier: 3.0,            // 속도 3배
  attackMultiplier: 2.5,           // 공격력 2.5배
  autoAttackInterval: 150,         // 연속 공격 간격 (ms)
  warpEffect: 'star_warp',        // 워프 연출
  // 보스 후퇴 설정
  bossRetreat: {
    speed: 2.0,                    // 보스 후퇴 속도 (플레이어보다 약간 느림)
    facingPlayer: true,            // 정면(플레이어) 응시
  },
  // 주인공 추격 설정
  heroChase: {
    ghostTrailCount: 5,            // 잔상 개수
    ghostTrailInterval: 80,        // 잔상 간격 (ms)
    ghostAlpha: 0.3,               // 잔상 투명도
  },
};

export { BOOSTER_CONFIG };

export default class AerialCombatSystem {
  constructor(engine) {
    this.engine = engine;
    this.phase = AERIAL_PHASE.INACTIVE;
    this.phaseTimer = 0;

    // 하늘 아레나
    this.skyArena = null;

    // 부스터 상태
    this.boosterTimer = 0;
    this.boosterActive = false;

    // 워프 이펙트 진행도
    this._warpProgress = 0;
    this._warpDuration = 1500; // 워프 연출 시간

    // 전환 연출
    this._transitionProgress = 0;
    this._floorFadeAlpha = 1; // 바닥 투명도 (1→0)

    // 파티클 (구름, 별 스트릭)
    this._cloudParticles = [];
    this._speedStreaks = [];
    this._ghostTrail = [];

    // 보스 참조
    this._boss = null;
    this._bossRetreatDir = { x: 1, y: 0 };

    // 부스터 자동공격 타이머
    this._boosterAttackTimer = 0;
  }

  // ── 공중전 활성화 (보스방에서 호출) ──
  activate(boss, skyTheme) {
    if (this.phase !== AERIAL_PHASE.INACTIVE) return;
    this.phase = AERIAL_PHASE.TRANSITIONING;
    this.phaseTimer = 0;
    this._transitionProgress = 0;
    this._boss = boss;

    // 하늘 아레나 생성
    const theme = skyTheme || 'sky';
    this.skyArena = new BattleArena(theme, {
      width: this.engine.W,
      height: this.engine.H,
      startHour: 12, // 낮
    });

    // 구름 파티클 초기화
    this._initCloudParticles();
  }

  // ── 비활성화 ──
  deactivate() {
    this.phase = AERIAL_PHASE.INACTIVE;
    this.boosterActive = false;
    this.skyArena = null;
    this._cloudParticles = [];
    this._speedStreaks = [];
    this._ghostTrail = [];
  }

  // ── 부스터 발동 (분노 게이지 100% 시 호출) ──
  triggerBooster() {
    if (this.phase !== AERIAL_PHASE.FLIGHT) return;
    this.phase = AERIAL_PHASE.BOOSTER;
    this.phaseTimer = 0;
    this.boosterTimer = BOOSTER_CONFIG.duration;
    this.boosterActive = true;
    this._warpProgress = 0;
    this._boosterAttackTimer = 0;
    this._ghostTrail = [];

    // 보스 후퇴 방향 계산
    if (this._boss && this.engine.player) {
      const dx = this._boss.x - this.engine.player.x;
      const dy = this._boss.y - this.engine.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      this._bossRetreatDir = { x: dx / dist, y: dy / dist };
    }
  }

  // ── 활성 여부 ──
  isActive() {
    return this.phase !== AERIAL_PHASE.INACTIVE;
  }

  isInBooster() {
    return this.phase === AERIAL_PHASE.BOOSTER;
  }

  // ── 프레임 업데이트 ──
  update(dt) {
    if (this.phase === AERIAL_PHASE.INACTIVE) return;

    this.phaseTimer += dt;

    switch (this.phase) {
      case AERIAL_PHASE.TRANSITIONING:
        this._updateTransition(dt);
        break;

      case AERIAL_PHASE.FLIGHT:
        if (this.skyArena) this.skyArena.update(dt);
        this._updateCloudParticles(dt);
        break;

      case AERIAL_PHASE.BOOSTER:
        this._updateBooster(dt);
        break;

      case AERIAL_PHASE.BOOSTER_END:
        // 감속 연출 (0.5초)
        if (this.phaseTimer >= 500) {
          this.phase = AERIAL_PHASE.FLIGHT;
          this.phaseTimer = 0;
        }
        if (this.skyArena) this.skyArena.update(dt);
        break;
    }
  }

  // ── 지상→공중 전환 ──
  _updateTransition(dt) {
    this._transitionProgress = Math.min(1, this.phaseTimer / 2000);
    this._floorFadeAlpha = 1 - this._transitionProgress;

    if (this.skyArena) this.skyArena.update(dt);

    if (this._transitionProgress >= 1) {
      this.phase = AERIAL_PHASE.FLIGHT;
      this.phaseTimer = 0;
    }
  }

  // ── 부스터 업데이트 ──
  _updateBooster(dt) {
    this.boosterTimer -= dt;
    if (this.skyArena) this.skyArena.update(dt);

    // 워프 연출 진행
    if (this._warpProgress < 1) {
      this._warpProgress = Math.min(1, this.phaseTimer / this._warpDuration);
    }

    // 속도 스트릭 생성
    this._updateSpeedStreaks(dt);

    // 보스 후퇴
    this._updateBossRetreat(dt);

    // 주인공 잔상
    this._updateGhostTrail(dt);

    // 부스터 자동공격
    this._boosterAttackTimer -= dt;
    if (this._boosterAttackTimer <= 0) {
      this._boosterAttackTimer = BOOSTER_CONFIG.autoAttackInterval;
      this._fireBoosterAttack();
    }

    // 부스터 종료
    if (this.boosterTimer <= 0) {
      this.boosterActive = false;
      this.phase = AERIAL_PHASE.BOOSTER_END;
      this.phaseTimer = 0;
      this._speedStreaks = [];
    }
  }

  // ── 보스 후퇴 (앞을 보며 뒤로) ──
  _updateBossRetreat(dt) {
    if (!this._boss) return;
    const spd = BOOSTER_CONFIG.bossRetreat.speed * (dt / 16);
    this._boss.x += this._bossRetreatDir.x * spd;
    this._boss.y += this._bossRetreatDir.y * spd * 0.3; // 상하는 약하게
    // 화면 안에 유지
    const W = this.engine.W || 800;
    const H = this.engine.H || 600;
    this._boss.x = Math.max(50, Math.min(W - 50, this._boss.x));
    this._boss.y = Math.max(50, Math.min(H - 50, this._boss.y));
  }

  // ── 잔상 업데이트 ──
  _updateGhostTrail(dt) {
    const player = this.engine.player;
    if (!player) return;

    // 새 잔상 추가
    this._ghostTrailTimer = (this._ghostTrailTimer || 0) + dt;
    if (this._ghostTrailTimer >= BOOSTER_CONFIG.heroChase.ghostTrailInterval) {
      this._ghostTrailTimer = 0;
      this._ghostTrail.push({
        x: player.x,
        y: player.y,
        alpha: BOOSTER_CONFIG.heroChase.ghostAlpha,
        life: 400,
      });
      // 최대 개수 제한
      while (this._ghostTrail.length > BOOSTER_CONFIG.heroChase.ghostTrailCount) {
        this._ghostTrail.shift();
      }
    }

    // 잔상 페이드
    this._ghostTrail = this._ghostTrail.filter(g => {
      g.life -= dt;
      g.alpha = BOOSTER_CONFIG.heroChase.ghostAlpha * (g.life / 400);
      return g.life > 0;
    });
  }

  // ── 부스터 연속 공격 ──
  _fireBoosterAttack() {
    if (!this._boss || !this.engine.player) return;
    const player = this.engine.player;
    const dx = this._boss.x - player.x;
    const dy = this._boss.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const angle = Math.atan2(dy, dx);

    // 빠른 투사체 발사
    this.engine.projectiles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
      damage: player.attack * BOOSTER_CONFIG.attackMultiplier,
      source: 'player',
      radius: player.projSize * 1.5,
      emoji: '💫',
      pierce: 2,
      homing: true,
      target: this._boss,
    });
  }

  // ── 속도 스트릭 (별이 길게 늘어나는 연출) ──
  _updateSpeedStreaks(dt) {
    // 새 스트릭 생성
    if (Math.random() < 0.3) {
      const W = this.engine.W || 800;
      const H = this.engine.H || 600;
      this._speedStreaks.push({
        x: W + 10,
        y: Math.random() * H,
        length: 20 + Math.random() * 60,
        speed: 8 + Math.random() * 12,
        alpha: 0.3 + Math.random() * 0.5,
        color: ['#ffffff', '#ffd700', '#87ceeb', '#ff69b4'][Math.floor(Math.random() * 4)],
      });
    }

    // 스트릭 이동
    this._speedStreaks = this._speedStreaks.filter(s => {
      s.x -= s.speed * (dt / 16);
      return s.x + s.length > 0;
    });
  }

  // ── 구름 파티클 초기화 ──
  _initCloudParticles() {
    this._cloudParticles = [];
    const W = this.engine.W || 800;
    const H = this.engine.H || 600;
    for (let i = 0; i < 8; i++) {
      this._cloudParticles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: 30 + Math.random() * 50,
        speed: 0.2 + Math.random() * 0.5,
        alpha: 0.1 + Math.random() * 0.2,
      });
    }
  }

  _updateCloudParticles(dt) {
    const W = this.engine.W || 800;
    this._cloudParticles.forEach(c => {
      c.x -= c.speed * (dt / 16);
      if (c.x + c.size < 0) c.x = W + c.size;
    });
  }

  // ── Canvas 렌더링 ──
  draw(ctx) {
    if (this.phase === AERIAL_PHASE.INACTIVE) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    switch (this.phase) {
      case AERIAL_PHASE.TRANSITIONING:
        this._drawTransition(ctx, W, H);
        break;

      case AERIAL_PHASE.FLIGHT:
        this._drawSkyBackground(ctx, W, H);
        this._drawCloudParticles(ctx);
        break;

      case AERIAL_PHASE.BOOSTER:
        this._drawSkyBackground(ctx, W, H);
        this._drawSpeedStreaks(ctx);
        this._drawGhostTrail(ctx);
        // 워프 이펙트 오버레이
        if (this._warpProgress < 1) {
          renderWarpEffect(
            ctx, BOOSTER_CONFIG.warpEffect, this._warpProgress,
            W, H,
            this.engine.player?.x || W / 2, this.engine.player?.y || H / 2,
            this._boss?.x || W * 0.7, this._boss?.y || H * 0.4,
          );
        }
        break;

      case AERIAL_PHASE.BOOSTER_END:
        this._drawSkyBackground(ctx, W, H);
        this._drawCloudParticles(ctx);
        // 감속 잔상 페이드아웃
        this._drawGhostTrail(ctx);
        break;
    }
  }

  // ── 전환 연출 ──
  _drawTransition(ctx, W, H) {
    const t = this._transitionProgress;

    // 하늘 배경이 서서히 나타남
    if (this.skyArena) {
      ctx.save();
      ctx.globalAlpha = t;
      const scaleX = W / this.skyArena.width;
      const scaleY = H / this.skyArena.height;
      const scale = Math.min(scaleX, scaleY);
      ctx.scale(scale, scale);
      this.skyArena.render(ctx);
      ctx.restore();
    }

    // "공중전!" 텍스트
    if (t > 0.5) {
      const textAlpha = Math.min(1, (t - 0.5) * 4);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = '#87ceeb';
      ctx.font = 'bold 28px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(135,206,235,0.6)';
      ctx.shadowBlur = 20;
      ctx.fillText('☁️ 공중전 돌입!', W / 2, H * 0.3);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ── 하늘 배경 ──
  _drawSkyBackground(ctx, W, H) {
    if (!this.skyArena) return;
    ctx.save();
    const scaleX = W / this.skyArena.width;
    const scaleY = H / this.skyArena.height;
    const scale = Math.min(scaleX, scaleY);
    ctx.scale(scale, scale);
    this.skyArena.render(ctx);
    ctx.restore();
  }

  // ── 구름 파티클 ──
  _drawCloudParticles(ctx) {
    ctx.save();
    this._cloudParticles.forEach(c => {
      ctx.globalAlpha = c.alpha;
      ctx.font = `${c.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☁️', c.x, c.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 속도 스트릭 (부스터 워프 연출) ──
  _drawSpeedStreaks(ctx) {
    ctx.save();
    this._speedStreaks.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.length, s.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── 잔상 (주인공 고스트 트레일) ──
  _drawGhostTrail(ctx) {
    if (!this.engine.player) return;
    const camera = this.engine.camera || { x: 0, y: 0 };

    ctx.save();
    this._ghostTrail.forEach(g => {
      ctx.globalAlpha = g.alpha;
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.engine.player.emoji, g.x - camera.x, g.y - camera.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
