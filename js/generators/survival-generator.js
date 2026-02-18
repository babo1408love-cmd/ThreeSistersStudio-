/**
 * SurvivalPursuer — 서바이벌 추격전 제너레이터
 *
 * 원본: survival-pursuer-v1.html (독립형 게임)
 * 변환: ES6 모듈 클래스 (monglebel 통합용)
 *
 * 컨셉: 보스를 쫓아가는 추격전
 *   - 거리 게이지(0~100): 0에 가까울수록 보스 제압, 100이면 탈출
 *   - 모멘텀 시스템: 적 처치 → 모멘텀 상승 → 속도 레벨 → 공격력 배율
 *   - 보스 AI: ESCAPE → ABSORB(엘리트 흡수) → PANIC(근접 시)
 *   - 자동공격 + 터치/마우스 좌우 이동
 */

// ── 설정 ──
export const SURVIVAL_CONFIG = {
  // 플레이어
  player: {
    size: 20,
    horizontalRange: 3,       // 좌우 이동 범위 배율
    moveSmoothness: 12,       // Lerp 속도
    baseYRatio: 0.8,          // 화면 하단 80%
    hp: 100,
    damage: 10,
    fireRate: 200,            // ms
    bulletSpeed: 600,
    bulletSize: 5,
  },

  // 보스
  boss: {
    size: 40,
    startDistance: 50,
    escapeRate: 0.5,          // 초당 도망 속도
    absorbTime: 3000,         // 흡수 시간 ms
    emoji: '👹',
  },

  // 거리 시스템
  distance: {
    min: 0,
    max: 100,
    winThreshold: 10,         // ≤10이면 승리
    loseThreshold: 95,        // ≥95이면 패배
  },

  // 모멘텀 시스템
  momentum: {
    max: 100,
    decayRate: 5,             // 초당 감소
    killValue: 10,            // 적 처치당 획득
    hitPenalty: 30,           // 피격 시 손실
  },

  // 속도 레벨
  speed: {
    thresholds: [0, 20, 40, 60, 80, 100],
    damageMultipliers: [1.0, 1.15, 1.3, 1.5, 1.75, 2.0],
    overdriveThreshold: 80,
  },

  // 적
  enemy: {
    size: 15,
    baseHp: 20,
    spawnInterval: 2000,      // ms
    maxCount: 15,
    baseSpeed: 100,
    speedVariance: 50,
    eliteChance: 0.1,
    eliteMinTime: 30,         // 30초 이후부터 엘리트 출현
    eliteHpMultiplier: 3,
    eliteSpeed: 70,
    eliteMomentumMultiplier: 2,
  },

  // 카메라
  camera: {
    baseFOV: 1.0,
    fovMomentumFactor: 0.002,
  },

  // 입력
  input: {
    touchSensitivity: 2.0,
    inputSmoothing: 0.85,
  },

  // 색상
  colors: {
    background: '#0a0a1e',
    player: '#00FF00',
    boss: '#FF0000',
    bossAbsorb: '#FF00FF',
    bossPanic: '#FFFF00',
    enemy: '#FF8800',
    elite: '#9D00FF',
    bullet: '#00FFFF',
    hpBarBg: '#FF0000',
    hpBarFill: '#00FF00',
    distBarSafe: '#00FF00',
    distBarWarn: '#FFFF00',
    distBarDanger: '#FF0000',
    momentumBar: '#00FFFF',
    momentumOverdrive: '#FF00FF',
  },
};

// ── 보스 AI 상태 ──
export const BOSS_STATE = {
  ESCAPE: 'escape',
  ABSORB: 'absorb',
  PANIC: 'panic',
};

// ── 메인 클래스 ──
export class SurvivalPursuer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} options - { onVictory, onDefeat, stageLevel }
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;

    this.onVictory = options.onVictory || (() => {});
    this.onDefeat = options.onDefeat || (() => {});
    this.stageLevel = options.stageLevel || 1;

    // ── State ──
    this.running = false;
    this.gameOver = false;
    this.victory = false;
    this.time = 0;
    this._lastTime = 0;
    this._animFrame = null;

    // ── Player ──
    const cfg = SURVIVAL_CONFIG.player;
    this.player = {
      x: 0,
      y: this.H * cfg.baseYRatio,
      targetX: 0,
      velocityX: 0,
      hp: cfg.hp,
      hpMax: cfg.hp,
      lastFireTime: 0,
      emoji: '🧚',
    };

    // ── Boss ──
    const bCfg = SURVIVAL_CONFIG.boss;
    this.boss = {
      x: 0,
      y: this.H * 0.2,
      state: BOSS_STATE.ESCAPE,
      stateTimer: 0,
      absorbTarget: null,
      absorbProgress: 0,
      emoji: bCfg.emoji,
    };

    // ── Systems ──
    this.distance = bCfg.startDistance;
    this.momentum = 0;
    this.speedLevel = 0;

    // ── Entities ──
    this.enemies = [];
    this.bullets = [];
    this.particles = [];

    // ── Spawn timer ──
    this._spawnTimer = 0;

    // ── Stats ──
    this.stats = {
      killCount: 0,
      maxSpeedLevel: 0,
      damageDealt: 0,
    };

    // ── Camera ──
    this.camera = {
      shake: 0,
      fov: SURVIVAL_CONFIG.camera.baseFOV,
      targetFOV: SURVIVAL_CONFIG.camera.baseFOV,
    };

    // ── Input ──
    this._input = {
      isDragging: false,
      startX: 0,
      currentX: 0,
      normalizedInput: 0,
    };
    this._keys = {};

    this._bindInput();
  }

  // ══════════════════════════════════════
  //  LIFECYCLE
  // ══════════════════════════════════════

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this._unbindInput();
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;
    this.time += dt;

    this._update(dt);
    this._draw();
    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  // ══════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════

  _update(dt) {
    this._updatePlayer(dt);
    this._updateMomentum(dt);
    this._updateDistance(dt);
    this._updateBossAI(dt);
    this._updateEnemySpawn(dt);
    this._updateEnemies(dt);
    this._updateBullets(dt);
    this._updateParticles(dt);
    this._updateCamera(dt);
  }

  // ── Player ──
  _updatePlayer(dt) {
    const p = this.player;
    const cfg = SURVIVAL_CONFIG.player;
    const inp = SURVIVAL_CONFIG.input;

    // 키보드 입력 병합
    let kbInput = 0;
    if (this._keys['d'] || this._keys['arrowright']) kbInput += 1;
    if (this._keys['a'] || this._keys['arrowleft']) kbInput -= 1;

    const rawInput = this._input.normalizedInput + kbInput;
    const clampedInput = Math.max(-1, Math.min(1, rawInput));

    // 타겟 X
    p.targetX = clampedInput * cfg.horizontalRange * (this.W / 2);

    // Smooth Lerp
    const lerpFactor = cfg.moveSmoothness * dt;
    p.x += (p.targetX - p.x) * lerpFactor;

    // 관성 감쇠
    p.velocityX *= inp.inputSmoothing;

    // 화면 범위 제한
    const maxX = this.W / 2 - cfg.size;
    p.x = Math.max(-maxX, Math.min(maxX, p.x));

    // 고정 Y
    p.y = this.H * cfg.baseYRatio;

    // 자동 발사
    const currentTime = this.time * 1000;
    if (currentTime - p.lastFireTime >= cfg.fireRate) {
      p.lastFireTime = currentTime;
      this._firePlayerBullet();
    }
  }

  _firePlayerBullet() {
    const p = this.player;
    const cfg = SURVIVAL_CONFIG.player;

    // 가장 가까운 적 탐색
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = e;
      }
    }

    // 발사 각도 (적이 없으면 위쪽)
    let angle = -Math.PI / 2;
    if (nearest) {
      angle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    }

    // 속도 레벨 기반 공격력
    const mult = SURVIVAL_CONFIG.speed.damageMultipliers[this.speedLevel] || 1.0;
    const finalDmg = cfg.damage * mult;

    this.bullets.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * cfg.bulletSpeed,
      vy: Math.sin(angle) * cfg.bulletSpeed,
      damage: finalDmg,
      lifetime: 3000,
    });
  }

  // ── Momentum ──
  _updateMomentum(dt) {
    const cfg = SURVIVAL_CONFIG.momentum;
    const spdCfg = SURVIVAL_CONFIG.speed;

    // 자연 감소
    this.momentum -= cfg.decayRate * dt;
    this.momentum = Math.max(0, Math.min(cfg.max, this.momentum));

    // 속도 레벨 계산
    let level = 0;
    for (let i = spdCfg.thresholds.length - 1; i >= 0; i--) {
      if (this.momentum >= spdCfg.thresholds[i]) {
        level = i;
        break;
      }
    }
    this.speedLevel = level;
    if (level > this.stats.maxSpeedLevel) {
      this.stats.maxSpeedLevel = level;
    }

    // 카메라 FOV
    const camCfg = SURVIVAL_CONFIG.camera;
    this.camera.targetFOV = camCfg.baseFOV + this.momentum * camCfg.fovMomentumFactor;
    this.camera.fov += (this.camera.targetFOV - this.camera.fov) * 0.1;
  }

  _addMomentum(value) {
    this.momentum = Math.min(SURVIVAL_CONFIG.momentum.max, this.momentum + value);
  }

  _reduceMomentum(value) {
    this.momentum = Math.max(0, this.momentum - value);
  }

  // ── Distance ──
  _updateDistance(dt) {
    const dCfg = SURVIVAL_CONFIG.distance;
    const bCfg = SURVIVAL_CONFIG.boss;

    // 보스 도주 + 플레이어 추격 압력
    const basePressure = 2;
    const momentumPressure = this.momentum * 0.02;
    const totalPressure = basePressure + momentumPressure;

    this.distance += bCfg.escapeRate * dt;
    this.distance -= totalPressure * dt;
    this.distance = Math.max(dCfg.min, Math.min(dCfg.max, this.distance));

    // 승패 체크
    if (this.distance <= dCfg.winThreshold) {
      this._onVictory();
    } else if (this.distance >= dCfg.loseThreshold) {
      this._onDefeat();
    }
  }

  _onVictory() {
    if (this.victory || this.gameOver) return;
    this.victory = true;
    this.running = false;
    this.onVictory({
      time: Math.floor(this.time),
      kills: this.stats.killCount,
      maxSpeedLevel: this.stats.maxSpeedLevel,
    });
  }

  _onDefeat() {
    if (this.gameOver || this.victory) return;
    this.gameOver = true;
    this.running = false;
    this.onDefeat({
      time: Math.floor(this.time),
      kills: this.stats.killCount,
      maxSpeedLevel: this.stats.maxSpeedLevel,
    });
  }

  // ── Boss AI ──
  _updateBossAI(dt) {
    const boss = this.boss;
    const bCfg = SURVIVAL_CONFIG.boss;
    const dCfg = SURVIVAL_CONFIG.distance;

    boss.stateTimer += dt;

    switch (boss.state) {
      case BOSS_STATE.ESCAPE:
        this._bossEscapeState(dt);
        break;
      case BOSS_STATE.ABSORB:
        this._bossAbsorbState(dt);
        break;
      case BOSS_STATE.PANIC:
        this._bossPanicState(dt);
        break;
    }

    // 거리 기반 Y 위치
    const distPercent = this.distance / dCfg.max;
    boss.y = this.H * (0.1 + distPercent * 0.3);
    boss.x = 0; // 중앙 유지
  }

  _bossEscapeState(dt) {
    const boss = this.boss;

    // 엘리트 흡수 시도
    const nearbyElites = this.enemies.filter(e =>
      e.isElite && !e.dead && this.distance > 40 &&
      this._entityDist(boss, e) < 200
    );
    if (nearbyElites.length > 0 && boss.stateTimer > 5) {
      boss.state = BOSS_STATE.ABSORB;
      boss.stateTimer = 0;
      boss.absorbTarget = nearbyElites[0];
      boss.absorbProgress = 0;
    }

    // 근접 패닉
    if (this.distance < 20) {
      boss.state = BOSS_STATE.PANIC;
      boss.stateTimer = 0;
    }
  }

  _bossAbsorbState(dt) {
    const boss = this.boss;
    const bCfg = SURVIVAL_CONFIG.boss;

    if (!boss.absorbTarget || boss.absorbTarget.dead) {
      boss.state = BOSS_STATE.ESCAPE;
      boss.absorbTarget = null;
      return;
    }

    boss.absorbProgress += dt;

    // 흡수 대상 쪽으로 이동
    const dx = boss.absorbTarget.x - boss.x;
    boss.x += dx * 0.5 * dt;

    // 흡수 완료
    if (boss.absorbProgress >= bCfg.absorbTime / 1000) {
      boss.absorbTarget.dead = true;
      this.distance += 15;
      boss.state = BOSS_STATE.ESCAPE;
      boss.absorbTarget = null;
    }

    // 플레이어 압력으로 취소
    if (this.momentum > 60) {
      boss.state = BOSS_STATE.ESCAPE;
      boss.absorbTarget = null;
    }
  }

  _bossPanicState(dt) {
    const boss = this.boss;
    const bCfg = SURVIVAL_CONFIG.boss;

    // 도주 속도 증가
    this.distance += bCfg.escapeRate * 1.5 * dt;

    if (boss.stateTimer > 3 || this.distance > 30) {
      boss.state = BOSS_STATE.ESCAPE;
      boss.stateTimer = 0;
    }
  }

  // ── Enemy Spawn ──
  _updateEnemySpawn(dt) {
    const eCfg = SURVIVAL_CONFIG.enemy;
    this._spawnTimer += dt;

    if (this._spawnTimer >= eCfg.spawnInterval / 1000) {
      this._spawnTimer = 0;
      if (this.enemies.length < eCfg.maxCount) {
        this._spawnWave();
      }
    }
  }

  _spawnWave() {
    const count = Math.floor(1 + Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this._spawnEnemy(false);
    }

    // 엘리트 확률
    const eCfg = SURVIVAL_CONFIG.enemy;
    if (Math.random() < eCfg.eliteChance && this.time > eCfg.eliteMinTime) {
      this._spawnEnemy(true);
    }
  }

  _spawnEnemy(isElite) {
    const eCfg = SURVIVAL_CONFIG.enemy;
    const x = (Math.random() - 0.5) * (this.W * 0.8);
    const y = -eCfg.size * (isElite ? 1.5 : 1);

    const hp = isElite ? eCfg.baseHp * eCfg.eliteHpMultiplier : eCfg.baseHp;
    const speed = isElite ? eCfg.eliteSpeed : eCfg.baseSpeed + Math.random() * eCfg.speedVariance;

    this.enemies.push({
      x, y, hp, hpMax: hp, speed, isElite, dead: false,
      emoji: isElite ? '👾' : '🩷',
    });
  }

  // ── Enemies ──
  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead) { this.enemies.splice(i, 1); continue; }

      // 아래로 이동
      e.y += e.speed * dt;

      // 화면 밖 제거
      if (e.y > this.H + 100) {
        this.enemies.splice(i, 1);
        continue;
      }

      // 플레이어 충돌
      const eCfg = SURVIVAL_CONFIG.enemy;
      const pCfg = SURVIVAL_CONFIG.player;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < eCfg.size + pCfg.size) {
        this.player.hp -= 10;
        this._reduceMomentum(SURVIVAL_CONFIG.momentum.hitPenalty);
        e.dead = true;
        this.camera.shake = 10;

        // 사망 파티클
        this._spawnDeathParticles(e.x, e.y, '#ff6b6b');

        if (this.player.hp <= 0) {
          this._onDefeat();
        }
      }
    }
  }

  // ── Bullets ──
  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.lifetime -= dt * 1000;

      if (b.lifetime <= 0 || b.y < -50 || b.y > this.H + 50 ||
          b.x < -this.W / 2 - 50 || b.x > this.W / 2 + 50) {
        this.bullets.splice(i, 1);
        continue;
      }

      // 적 충돌
      let hit = false;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SURVIVAL_CONFIG.enemy.size + SURVIVAL_CONFIG.player.bulletSize) {
          e.hp -= b.damage;
          this.stats.damageDealt += b.damage;

          if (e.hp <= 0) {
            e.dead = true;
            this.stats.killCount++;
            const eCfg = SURVIVAL_CONFIG.enemy;
            const gain = e.isElite
              ? SURVIVAL_CONFIG.momentum.killValue * eCfg.eliteMomentumMultiplier
              : SURVIVAL_CONFIG.momentum.killValue;
            this._addMomentum(gain);
            this._spawnDeathParticles(e.x, e.y, e.isElite ? '#9D00FF' : '#FF8800');
          }

          hit = true;
          break;
        }
      }
      if (hit) {
        this.bullets.splice(i, 1);
      }
    }
  }

  // ── Particles ──
  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.life -= dt * 1000;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  _spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (80 + Math.random() * 60),
        vy: Math.sin(angle) * (80 + Math.random() * 60),
        life: 400 + Math.random() * 300,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  // ── Camera ──
  _updateCamera(dt) {
    if (this.camera.shake > 0.1) {
      this.camera.shake *= 0.9;
    } else {
      this.camera.shake = 0;
    }
  }

  // ══════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════

  _draw() {
    const ctx = this.ctx;
    const colors = SURVIVAL_CONFIG.colors;

    // 배경
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.save();
    ctx.translate(this.W / 2, this.H / 2);

    // 카메라 흔들림
    if (this.camera.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.camera.shake,
        (Math.random() - 0.5) * this.camera.shake,
      );
    }

    // FOV 스케일
    ctx.scale(this.camera.fov, this.camera.fov);

    // 보스
    this._drawBoss(ctx);
    // 적
    this._drawEnemies(ctx);
    // 총알
    this._drawBullets(ctx);
    // 파티클
    this._drawParticles(ctx);
    // 플레이어
    this._drawPlayer(ctx);

    ctx.restore();

    // HUD (카메라 변환 없이)
    this._drawHUD(ctx);

    // 위험 플래시
    if (this.distance >= 80) {
      const intensity = (this.distance - 80) / 20;
      ctx.fillStyle = `rgba(255,0,0,${intensity * 0.2})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }

  _drawPlayer(ctx) {
    const p = this.player;
    const size = SURVIVAL_CONFIG.player.size;
    const colors = SURVIVAL_CONFIG.colors;

    // 오버드라이브 글로우
    if (this.momentum >= SURVIVAL_CONFIG.speed.overdriveThreshold) {
      ctx.shadowBlur = 30;
      ctx.shadowColor = colors.momentumOverdrive;
    } else {
      ctx.shadowBlur = 20;
      ctx.shadowColor = colors.player;
    }

    // 이모지 렌더링
    ctx.font = `${size * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, p.x, p.y - this.H / 2);
    ctx.shadowBlur = 0;
  }

  _drawBoss(ctx) {
    const boss = this.boss;
    const size = SURVIVAL_CONFIG.boss.size;
    const colors = SURVIVAL_CONFIG.colors;

    // 상태별 글로우
    let glowColor = colors.boss;
    if (boss.state === BOSS_STATE.ABSORB) glowColor = colors.bossAbsorb;
    if (boss.state === BOSS_STATE.PANIC) glowColor = colors.bossPanic;

    ctx.shadowBlur = 30;
    ctx.shadowColor = glowColor;

    // 보스 이모지
    ctx.font = `${size * 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(boss.emoji, boss.x, boss.y - this.H / 2);

    // 흡수 연결선
    if (boss.state === BOSS_STATE.ABSORB && boss.absorbTarget) {
      ctx.strokeStyle = colors.bossAbsorb;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y - this.H / 2);
      ctx.lineTo(boss.absorbTarget.x, boss.absorbTarget.y - this.H / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.shadowBlur = 0;
  }

  _drawEnemies(ctx) {
    const eCfg = SURVIVAL_CONFIG.enemy;
    const colors = SURVIVAL_CONFIG.colors;

    this.enemies.forEach(e => {
      if (e.dead) return;
      const color = e.isElite ? colors.elite : colors.enemy;
      const size = e.isElite ? eCfg.size * 1.5 : eCfg.size;

      ctx.shadowBlur = e.isElite ? 15 : 10;
      ctx.shadowColor = color;

      // 이모지 렌더링
      ctx.font = `${size * 2}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.emoji, e.x, e.y - this.H / 2);

      // HP 바
      if (e.hp < e.hpMax) {
        const barW = size * 2;
        const barH = 3;
        const hpPct = e.hp / e.hpMax;
        ctx.fillStyle = colors.hpBarBg;
        ctx.fillRect(e.x - barW / 2, e.y - this.H / 2 - size - 10, barW, barH);
        ctx.fillStyle = colors.hpBarFill;
        ctx.fillRect(e.x - barW / 2, e.y - this.H / 2 - size - 10, barW * hpPct, barH);
      }
    });
    ctx.shadowBlur = 0;
  }

  _drawBullets(ctx) {
    const colors = SURVIVAL_CONFIG.colors;
    const bSize = SURVIVAL_CONFIG.player.bulletSize;

    ctx.fillStyle = colors.bullet;
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.bullet;

    this.bullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y - this.H / 2, bSize, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  _drawParticles(ctx) {
    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life / 700);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - this.H / 2, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ── HUD (화면 고정) ──
  _drawHUD(ctx) {
    const pad = 10;
    const dCfg = SURVIVAL_CONFIG.distance;
    const mCfg = SURVIVAL_CONFIG.momentum;
    const colors = SURVIVAL_CONFIG.colors;

    // ── 거리 게이지 (상단 중앙) ──
    const distBarW = Math.min(300, this.W * 0.7);
    const distBarH = 20;
    const distBarX = (this.W - distBarW) / 2;
    const distBarY = pad;
    const distPct = this.distance / dCfg.max;

    // 배경
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this._roundRect(ctx, distBarX - 2, distBarY - 2, distBarW + 4, distBarH + 4, 10);
    ctx.fill();

    // 게이지
    const distColor = distPct < 0.4 ? colors.distBarSafe
      : distPct < 0.7 ? colors.distBarWarn : colors.distBarDanger;
    ctx.fillStyle = 'rgba(30,30,50,0.9)';
    this._roundRect(ctx, distBarX, distBarY, distBarW, distBarH, 8);
    ctx.fill();
    ctx.fillStyle = distColor;
    this._roundRect(ctx, distBarX, distBarY, distBarW * distPct, distBarH, 8);
    ctx.fill();

    // 텍스트
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`거리: ${Math.floor(this.distance)}`, this.W / 2, distBarY + distBarH / 2);

    // ── 모멘텀 게이지 (하단 중앙) ──
    const momBarW = Math.min(250, this.W * 0.6);
    const momBarH = 14;
    const momBarX = (this.W - momBarW) / 2;
    const momBarY = this.H - 60;
    const momPct = this.momentum / mCfg.max;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this._roundRect(ctx, momBarX - 2, momBarY - 2, momBarW + 4, momBarH + 4, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(30,30,50,0.9)';
    this._roundRect(ctx, momBarX, momBarY, momBarW, momBarH, 6);
    ctx.fill();
    const momColor = this.momentum >= SURVIVAL_CONFIG.speed.overdriveThreshold
      ? colors.momentumOverdrive : colors.momentumBar;
    ctx.fillStyle = momColor;
    this._roundRect(ctx, momBarX, momBarY, momBarW * momPct, momBarH, 6);
    ctx.fill();

    // 모멘텀 라벨
    ctx.fillStyle = momColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MOMENTUM: ${Math.floor(this.momentum)}`, this.W / 2, momBarY - 8);

    // ── Stats (좌상단) ──
    const statsX = pad;
    const statsY = distBarY + distBarH + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this._roundRect(ctx, statsX - 4, statsY - 4, 130, 68, 6);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '12px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`⏱ ${Math.floor(this.time)}초`, statsX, statsY);
    ctx.fillText(`⚡ 속도 Lv.${this.speedLevel}`, statsX, statsY + 16);
    ctx.fillText(`💀 ${this.stats.killCount}`, statsX, statsY + 32);

    // 보스 상태
    const stateLabel = {
      [BOSS_STATE.ESCAPE]: '🏃 도주중',
      [BOSS_STATE.ABSORB]: '🔮 흡수중',
      [BOSS_STATE.PANIC]: '😱 패닉!',
    };
    ctx.fillText(stateLabel[this.boss.state] || '', statsX, statsY + 48);

    // ── HP 바 (우상단) ──
    const hpBarW = 100;
    const hpBarH = 10;
    const hpBarX = this.W - hpBarW - pad;
    const hpBarY = distBarY + distBarH + 14;
    const hpPct = Math.max(0, this.player.hp / this.player.hpMax);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this._roundRect(ctx, hpBarX - 2, hpBarY - 2, hpBarW + 4, hpBarH + 4, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(30,30,50,0.9)';
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.fillStyle = hpPct > 0.5 ? '#86efac' : hpPct > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);

    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`❤️ ${Math.round(this.player.hp)}`, hpBarX + hpBarW / 2, hpBarY + hpBarH + 10);
  }

  // ══════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════

  _roundRect(ctx, x, y, w, h, r) {
    if (w < 0) w = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  _entityDist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ══════════════════════════════════════
  //  INPUT
  // ══════════════════════════════════════

  _bindInput() {
    // Touch
    this._onTouchStart = e => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      this._input.isDragging = true;
      this._input.startX = e.touches[0].clientX;
      this._input.currentX = e.touches[0].clientX;
    };
    this._onTouchMove = e => {
      e.preventDefault();
      if (!this._input.isDragging || e.touches.length === 0) return;
      this._input.currentX = e.touches[0].clientX;
      this._calcInput();
    };
    this._onTouchEnd = e => {
      e.preventDefault();
      this._input.isDragging = false;
      this._input.normalizedInput = 0;
    };

    // Mouse
    this._mouseDown = false;
    this._onMouseDown = e => {
      this._mouseDown = true;
      this._input.isDragging = true;
      this._input.startX = e.clientX;
      this._input.currentX = e.clientX;
    };
    this._onMouseMove = e => {
      if (!this._mouseDown) return;
      this._input.currentX = e.clientX;
      this._calcInput();
    };
    this._onMouseUp = () => {
      this._mouseDown = false;
      this._input.isDragging = false;
      this._input.normalizedInput = 0;
    };

    // Keyboard
    this._onKeyDown = e => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this._keys[e.key.toLowerCase()] = false; };

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _unbindInput() {
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  _calcInput() {
    const deltaX = this._input.currentX - this._input.startX;
    let normalized = (deltaX / this.W) * SURVIVAL_CONFIG.input.touchSensitivity;
    this._input.normalizedInput = Math.max(-1, Math.min(1, normalized));
  }
}

// ── 기본 export ──
export default SurvivalPursuer;
