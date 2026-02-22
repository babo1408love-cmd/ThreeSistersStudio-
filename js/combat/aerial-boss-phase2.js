/**
 * AerialBossPhase2 — 공중전 Phase 2: 요정 보스의 분노
 *
 * 보스방에서 보스 HP 50% 이하 → 비행기 슈팅 스타일 공중전 전환
 * - 아래에서 올려다보는 카메라, 바닥 패럴랙스 스크롤
 * - 화면 상단 거대 보스, 하단 플레이어 자유이동
 * - 5종 보스 공격 패턴 순환 + 분노 게이지 연동
 *
 * GoldenMimicBelly 패턴 — 자체 update/draw 루프 독립 모듈
 * CombatEngine에서 인스턴스 생성 → update(dt)/draw(ctx) 위임
 */
import { BOSS_ROOM_CONFIG } from '../data/combat-config.js';

const CFG = () => BOSS_ROOM_CONFIG.aerialPhase2;

// ── 페이즈 상수 ──
const PHASE = {
  TRANSITION_IN: 'transition_in',
  COMBAT: 'combat',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
};

// ── 보스 공격 패턴 이름 ──
const PATTERN = {
  NONE: 'none',
  SPORE_RAIN: 'sporeRain',
  LASER_BEAM: 'laserBeam',
  DIVE_BOMB: 'diveBomb',
  SUMMON_MINIONS: 'summonMinions',
  BARRAGE: 'barrage',
};

export default class AerialBossPhase2 {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.W = canvas.width;
    this.H = canvas.height;

    // 외부 공유 참조
    this.boss = options.boss;
    this.bossMaxHp = options.bossMaxHp || this.boss.maxHp || this.boss.hp;
    this.player = options.player;
    this.stageLevel = options.stageLevel || 1;
    this.rageSystem = options.rageSystem || null;
    this.onVictory = options.onVictory || (() => {});
    this.onDeath = options.onDeath || (() => {});

    // 입력 공유
    this._keys = options.sharedKeys || {};
    this._touchDir = options.sharedTouchDir || { x: 0, y: 0 };

    // 페이즈
    this.phase = PHASE.TRANSITION_IN;
    this._phaseTimer = 0;
    this._elapsed = 0;

    // 보스 스크린 좌표
    const cfg = CFG();
    this._bossScreenX = this.W / 2;
    this._bossScreenY = this.H * cfg.boss.yRange[0];
    this._bossScale = cfg.boss.scale;

    // 플레이어 스크린 좌표
    this._playerScreenX = this.W / 2;
    this._playerScreenY = this.H * 0.72;
    this._playerSpeed = (this.player.speed || 3) * cfg.player.speedMult;
    this._playerBobPhase = 0;    // 둥둥 떠다니는 위아래 바운스
    this._playerBobAmp = 6;      // 바운스 진폭 px
    this._playerBobFreq = 0.003; // 바운스 주파수

    // 자동공격
    this._atkTimer = 0;
    this._playerAtkSpeed = this.player.atkSpeed || 600;

    // 보스 공격 패턴
    this._patternCooldown = 0;
    this._currentPattern = PATTERN.NONE;
    this._patternTimer = 0;
    this._patternData = null;

    // 투사체 (플레이어 → 보스)
    this._playerProjectiles = [];
    // 적 투사체 (보스 → 플레이어)
    this._enemyProjectiles = [];
    // 미니적 (패턴4 소환)
    this._minions = [];
    // 파티클
    this._particles = [];
    // 데미지 숫자
    this._damageNumbers = [];

    // 배경: 실제 뱀서 맵 + 나뭇가지 캐노피
    this._map = options.map || null;
    this._renderMapFn = options.renderMapFn || null;
    this._mapCamera = { x: 0, y: 0 }; // 맵 스크롤 카메라
    this._mapScrollSpeed = 4;          // px/frame — 쏜살같이 지나가는 속도

    // 나뭇가지 오브젝트 (화면 양쪽에서 스쳐지나감)
    this._branches = this._initBranches();

    // 기존 배경 요소
    this._speedLines = this._initSpeedLines();
    this._clouds = this._initClouds();
    this._parallaxOffset = 0;

    // 레이저빔 상태
    this._laserAngle = 0;
    this._laserWarningTimer = 0;
    this._laserActive = false;
    this._laserSweepDir = 1;

    // 돌진 상태
    this._diveBossY = this._bossScreenY;
    this._diveReturning = false;

    // 승리/패배 연출
    this._resultTimer = 0;
    this._explosionParticles = [];

    // 분노 게이지 발동 상태 (공중전 전용)
    this._rageActive = false;
    this._rageTimer = 0;
  }

  // ══════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════
  start() {
    this.phase = PHASE.TRANSITION_IN;
    this._phaseTimer = 0;
  }

  update(dt) {
    this._elapsed += dt;

    switch (this.phase) {
      case PHASE.TRANSITION_IN:
        this._updateTransition(dt);
        break;
      case PHASE.COMBAT:
        this._updateCombat(dt);
        break;
      case PHASE.VICTORY:
        this._updateVictory(dt);
        break;
      case PHASE.DEFEAT:
        this._updateDefeat(dt);
        break;
    }
  }

  draw(ctx) {
    ctx.save();
    switch (this.phase) {
      case PHASE.TRANSITION_IN:
        this._drawTransition(ctx);
        break;
      case PHASE.COMBAT:
        this._drawCombat(ctx);
        break;
      case PHASE.VICTORY:
        this._drawCombat(ctx);
        this._drawVictoryOverlay(ctx);
        break;
      case PHASE.DEFEAT:
        this._drawCombat(ctx);
        this._drawDefeatOverlay(ctx);
        break;
    }
    ctx.restore();
  }

  destroy() {
    this._playerProjectiles = [];
    this._enemyProjectiles = [];
    this._minions = [];
    this._particles = [];
    this._damageNumbers = [];
    this._explosionParticles = [];
  }

  // ══════════════════════════════════════
  //  TRANSITION IN (2초)
  // ══════════════════════════════════════
  _updateTransition(dt) {
    this._phaseTimer += dt;
    const cfg = CFG().transition;
    if (this._phaseTimer >= cfg.duration) {
      this.phase = PHASE.COMBAT;
      this._phaseTimer = 0;
      this._patternCooldown = 1500; // 전투 시작 후 1.5초 뒤 첫 패턴
    }
  }

  _drawTransition(ctx) {
    const cfg = CFG().transition;
    const t = this._phaseTimer;
    const W = this.W;
    const H = this.H;

    // Phase 1: 0~500ms — 화면 어두워짐
    if (t < cfg.fadeOutDur) {
      const alpha = Math.min(1, t / cfg.fadeOutDur);
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // Phase 2: 500~1000ms — 하늘 배경 전환 (어두운 채로 하늘이 보이기 시작)
    if (t < cfg.fadeOutDur + cfg.skySweepDur) {
      this._drawBackground(ctx);
      const fadeIn = (t - cfg.fadeOutDur) / cfg.skySweepDur;
      ctx.fillStyle = `rgba(0,0,0,${1 - fadeIn * 0.7})`;
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // Phase 3: 1000~1500ms — 텍스트 표시
    if (t < cfg.fadeOutDur + cfg.skySweepDur + cfg.textDur) {
      this._drawBackground(ctx);
      // 텍스트 글로우
      const textT = (t - cfg.fadeOutDur - cfg.skySweepDur) / cfg.textDur;
      const alpha = textT < 0.5 ? textT * 2 : 2 - textT * 2;
      ctx.save();
      ctx.globalAlpha = Math.max(0.2, alpha);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 20;
      ctx.fillText(cfg.text, W / 2, H / 2);
      ctx.restore();
      return;
    }

    // Phase 4: 1500~2000ms — 보스/플레이어 등장
    this._drawBackground(ctx);
    const spawnT = (t - cfg.fadeOutDur - cfg.skySweepDur - cfg.textDur) / cfg.spawnDur;
    // 보스: 위에서 내려옴
    const bossTargetY = this.H * CFG().boss.yRange[0] + (CFG().boss.yRange[1] - CFG().boss.yRange[0]) * 0.3 * this.H;
    const bossY = -60 + (bossTargetY + 60) * Math.min(1, spawnT);
    this._drawBossAt(ctx, this.W / 2, bossY, Math.min(1, spawnT));
    // 플레이어: 아래에서 올라옴
    const playerTargetY = this._playerScreenY;
    const playerY = this.H + 60 - (this.H + 60 - playerTargetY) * Math.min(1, spawnT);
    this._drawPlayerAt(ctx, this.W / 2, playerY);
  }

  // ══════════════════════════════════════
  //  COMBAT UPDATE
  // ══════════════════════════════════════
  _updateCombat(dt) {
    this._phaseTimer += dt;

    // 배경 스크롤
    this._parallaxOffset += dt * 0.1;
    this._updateMapScroll(dt);
    this._updateBranches(dt);

    // 스피드라인 + 구름 업데이트
    this._updateSpeedLines(dt);
    this._updateClouds(dt);

    // 플레이어 이동
    this._updatePlayerMovement(dt);

    // 보스 이동 (플레이어 X 추적 + 수직 바운스)
    this._updateBossMovement(dt);

    // 플레이어 자동공격
    this._updatePlayerAttack(dt);

    // 보스 패턴
    this._updateBossPatterns(dt);

    // 투사체 업데이트
    this._updatePlayerProjectiles(dt);
    this._updateEnemyProjectiles(dt);

    // 미니적 업데이트
    this._updateMinions(dt);

    // 파티클
    this._updateParticles(dt);
    this._updateDamageNumbers(dt);

    // 분노 게이지
    this._updateRage(dt);

    // 승리/패배 체크
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    if (bossHp <= 0) {
      this.phase = PHASE.VICTORY;
      this._phaseTimer = 0;
      this._spawnExplosion();
    }
    if (this.player.hp <= 0) {
      this.phase = PHASE.DEFEAT;
      this._phaseTimer = 0;
    }
  }

  // ── 플레이어 이동 ──
  _updatePlayerMovement(dt) {
    const spd = this._playerSpeed * (dt / 16);
    let dx = 0, dy = 0;

    // WASD / 방향키
    if (this._keys['ArrowLeft'] || this._keys['a'] || this._keys['A']) dx -= 1;
    if (this._keys['ArrowRight'] || this._keys['d'] || this._keys['D']) dx += 1;
    if (this._keys['ArrowUp'] || this._keys['w'] || this._keys['W']) dy -= 1;
    if (this._keys['ArrowDown'] || this._keys['s'] || this._keys['S']) dy += 1;

    // 터치 입력
    if (this._touchDir.x || this._touchDir.y) {
      dx += this._touchDir.x;
      dy += this._touchDir.y;
    }

    // 정규화
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx = (dx / len) * spd;
      dy = (dy / len) * spd;
    }

    const cfg = CFG().player;
    this._playerScreenX = Math.max(20, Math.min(this.W - 20, this._playerScreenX + dx));
    this._playerScreenY = Math.max(this.H * cfg.yRange[0], Math.min(this.H * cfg.yRange[1] - 20, this._playerScreenY + dy));

    // 둥둥 떠다니는 바운스 업데이트
    this._playerBobPhase += this._playerBobFreq * dt;
  }

  // ── 보스 이동 ──
  _updateBossMovement(dt) {
    const cfg = CFG().boss;
    // X: 플레이어 추적 (느슨하게)
    const targetX = this._playerScreenX;
    this._bossScreenX += (targetX - this._bossScreenX) * cfg.trackLerp * (dt / 16);
    this._bossScreenX = Math.max(80, Math.min(this.W - 80, this._bossScreenX));

    // Y: 수직 바운스 (돌진 중이 아닐 때)
    if (this._currentPattern !== PATTERN.DIVE_BOMB) {
      const baseY = this.H * (cfg.yRange[0] + cfg.yRange[1]) * 0.5;
      this._bossScreenY = baseY + Math.sin(this._elapsed * cfg.vertBounceFreq) * cfg.vertBounceAmp;
    }
  }

  // ── 플레이어 자동공격 ──
  _updatePlayerAttack(dt) {
    this._atkTimer += dt;
    if (this._atkTimer >= this._playerAtkSpeed) {
      this._atkTimer = 0;
      this._firePlayerProjectile();
    }
  }

  _firePlayerProjectile() {
    const cfg = CFG().attack;
    const rageActive = this._rageActive || (this.rageSystem && this.rageSystem.isActive());
    const isCrit = Math.random() < (this.player.critRate || 0.1);

    let emoji = cfg.emoji;
    if (rageActive) emoji = cfg.rageEmoji;
    else if (isCrit) emoji = cfg.critEmoji;

    this._playerProjectiles.push({
      x: this._playerScreenX,
      y: this._playerScreenY - 20,
      vy: -cfg.projSpeed,
      radius: cfg.projRadius,
      emoji,
      isCrit,
      rageActive,
    });
  }

  // ── 플레이어 투사체 → 보스 충돌 ──
  _updatePlayerProjectiles(dt) {
    const cfg = CFG().boss;
    const bossHitR = cfg.baseFontSize * cfg.scale * 0.5;

    for (let i = this._playerProjectiles.length - 1; i >= 0; i--) {
      const p = this._playerProjectiles[i];
      p.y += p.vy * (dt / 16);

      // 화면 밖 제거
      if (p.y < -20) {
        this._playerProjectiles.splice(i, 1);
        continue;
      }

      // 보스 히트 체크
      const dx = p.x - this._bossScreenX;
      const dy = p.y - this._bossScreenY;
      if (dx * dx + dy * dy < bossHitR * bossHitR) {
        this._playerProjectiles.splice(i, 1);
        this._dealDamageToBoss(p);
      }
    }
  }

  _dealDamageToBoss(proj) {
    let baseDmg = this.player.attack || 12;
    if (proj.isCrit) baseDmg *= (this.player.critDamage || 1.5);
    if (proj.rageActive) baseDmg *= CFG().rage.damageMultiplier;

    const bossDef = this.boss.def || this.boss.defense || 0;
    const dmg = Math.max(1, Math.round(baseDmg - bossDef * 0.3));

    if (this.boss.currentHp !== undefined) {
      this.boss.currentHp -= dmg;
    } else {
      this.boss.hp -= dmg;
    }

    // 데미지 숫자
    const color = proj.rageActive ? '#ff4444' : proj.isCrit ? '#fbbf24' : '#ffffff';
    this._damageNumbers.push({
      x: this._bossScreenX + (Math.random() - 0.5) * 40,
      y: this._bossScreenY - 20,
      value: dmg,
      color,
      life: 800,
      vy: -1.5,
      scale: proj.isCrit ? 1.4 : 1.0,
    });

    // 히트 파티클
    for (let i = 0; i < 3; i++) {
      this._particles.push({
        x: this._bossScreenX + (Math.random() - 0.5) * 30,
        y: this._bossScreenY + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 400,
        color: color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  // ── 적 투사체 → 플레이어 충돌 ──
  _updateEnemyProjectiles(dt) {
    const playerR = 12;

    for (let i = this._enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this._enemyProjectiles[i];
      p.x += (p.vx || 0) * (dt / 16);
      p.y += (p.vy || 0) * (dt / 16);
      if (p.driftX) p.x += p.driftX * (dt / 16);
      p.life -= dt;

      // 화면 밖 또는 수명 초과
      if (p.y > this.H + 20 || p.y < -20 || p.x < -20 || p.x > this.W + 20 || p.life <= 0) {
        this._enemyProjectiles.splice(i, 1);
        continue;
      }

      // 플레이어 충돌
      const dx = p.x - this._playerScreenX;
      const dy = p.y - this._playerScreenY;
      const hitR = playerR + (p.radius || 5);
      if (dx * dx + dy * dy < hitR * hitR) {
        this._enemyProjectiles.splice(i, 1);
        this._damagePlayerAerial(p.damage);
      }
    }
  }

  // ── 미니적 업데이트 ──
  _updateMinions(dt) {
    const playerR = 12;

    for (let i = this._minions.length - 1; i >= 0; i--) {
      const m = this._minions[i];

      // 플레이어 추적
      const dx = this._playerScreenX - m.x;
      const dy = this._playerScreenY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const spd = m.speed * (dt / 16);
        m.x += (dx / dist) * spd;
        m.y += (dy / dist) * spd;
      }

      // 플레이어 충돌
      if (dist < playerR + m.radius) {
        this._damagePlayerAerial(m.damage);
        m.hp = 0;
      }

      // 사망 체크
      if (m.hp <= 0) {
        this._minions.splice(i, 1);
        // 처치 이펙트
        for (let j = 0; j < 5; j++) {
          this._particles.push({
            x: m.x, y: m.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 500,
            color: '#aa44cc',
            size: 2 + Math.random() * 2,
          });
        }
        // 분노 게이지 충전
        const rageCfg = CFG().rage;
        if (this.rageSystem) this.rageSystem.add(rageCfg.onMinionKillGain);
      }
    }

    // 플레이어 투사체 → 미니적 충돌
    for (let pi = this._playerProjectiles.length - 1; pi >= 0; pi--) {
      const p = this._playerProjectiles[pi];
      for (let mi = this._minions.length - 1; mi >= 0; mi--) {
        const m = this._minions[mi];
        const dx = p.x - m.x;
        const dy = p.y - m.y;
        if (dx * dx + dy * dy < (p.radius + m.radius) * (p.radius + m.radius)) {
          m.hp -= 1;
          this._playerProjectiles.splice(pi, 1);
          break;
        }
      }
    }
  }

  // ── 플레이어 피격 ──
  _damagePlayerAerial(damage) {
    // 분노 무적 체크
    if (this._rageActive || (this.rageSystem && this.rageSystem.isActive())) {
      if (CFG().rage.invincible) return;
    }

    const def = this.player.defense || 7;
    const dmg = Math.max(1, Math.round(damage - def * 0.3));
    this.player.hp -= dmg;
    if (this.player.hp < 0) this.player.hp = 0;

    // 피격 파티클
    for (let i = 0; i < 5; i++) {
      this._particles.push({
        x: this._playerScreenX + (Math.random() - 0.5) * 20,
        y: this._playerScreenY + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 400,
        color: '#ff6b6b',
        size: 2 + Math.random() * 2,
      });
    }

    // 분노 게이지 충전
    if (this.rageSystem) this.rageSystem.add(CFG().rage.onHitGain);
  }

  // ── 분노 게이지 ──
  _updateRage(dt) {
    if (this.rageSystem) {
      this.rageSystem.update(dt);
      this._rageActive = this.rageSystem.isActive();
    }
  }

  // ══════════════════════════════════════
  //  BOSS ATTACK PATTERNS
  // ══════════════════════════════════════
  _updateBossPatterns(dt) {
    // 쿨다운 관리
    if (this._currentPattern === PATTERN.NONE) {
      this._patternCooldown -= dt;
      if (this._patternCooldown <= 0) {
        this._selectPattern();
      }
      return;
    }

    // 현재 패턴 진행
    this._patternTimer += dt;
    switch (this._currentPattern) {
      case PATTERN.SPORE_RAIN: this._updateSporeRain(dt); break;
      case PATTERN.LASER_BEAM: this._updateLaserBeam(dt); break;
      case PATTERN.DIVE_BOMB: this._updateDiveBomb(dt); break;
      case PATTERN.SUMMON_MINIONS: this._updateSummonMinions(dt); break;
      case PATTERN.BARRAGE: this._updateBarrage(dt); break;
    }

    // 패턴 종료 체크
    const patCfg = CFG().patterns[this._currentPattern];
    if (patCfg && this._patternTimer >= patCfg.duration) {
      this._endPattern();
    }
  }

  _selectPattern() {
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    const hpRatio = bossHp / this.bossMaxHp;
    const enraged = hpRatio <= CFG().boss.enrageThreshold;

    const weights = enraged ? CFG().patternWeights.enraged : CFG().patternWeights.normal;
    const patterns = Object.keys(weights);
    const totalW = patterns.reduce((s, p) => s + weights[p], 0);

    let roll = Math.random() * totalW;
    let chosen = patterns[0];
    for (const p of patterns) {
      roll -= weights[p];
      if (roll <= 0) { chosen = p; break; }
    }

    this._currentPattern = chosen;
    this._patternTimer = 0;
    this._patternData = {};
    this._initPattern(chosen);
  }

  _endPattern() {
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    const hpRatio = bossHp / this.bossMaxHp;
    const enraged = hpRatio <= CFG().boss.enrageThreshold;

    this._currentPattern = PATTERN.NONE;
    this._patternTimer = 0;
    this._patternData = null;
    this._laserActive = false;
    this._diveReturning = false;
    this._patternCooldown = enraged ? CFG().patterns.enrageCooldown : CFG().patterns.cooldown;
  }

  _initPattern(pattern) {
    const cfg = CFG().patterns;
    switch (pattern) {
      case PATTERN.SPORE_RAIN: {
        const c = cfg.sporeRain;
        const count = c.count[0] + Math.floor(Math.random() * (c.count[1] - c.count[0] + 1));
        this._patternData.totalSpores = count;
        this._patternData.spawned = 0;
        this._patternData.spawnInterval = c.duration / count;
        this._patternData.nextSpawn = 0;
        break;
      }
      case PATTERN.LASER_BEAM: {
        this._laserAngle = -cfg.laserBeam.sweepAngle / 2;
        this._laserWarningTimer = 0;
        this._laserActive = false;
        this._laserSweepDir = Math.random() < 0.5 ? 1 : -1;
        break;
      }
      case PATTERN.DIVE_BOMB: {
        this._patternData.phase = 'telegraph'; // telegraph → dive → return
        this._patternData.phaseTimer = 0;
        this._diveBossY = this._bossScreenY;
        this._patternData.targetX = this._playerScreenX; // 텔레그래프 시점의 플레이어 위치
        break;
      }
      case PATTERN.SUMMON_MINIONS: {
        const c = cfg.summonMinions;
        const count = c.count[0] + Math.floor(Math.random() * (c.count[1] - c.count[0] + 1));
        this._patternData.toSpawn = count;
        this._patternData.spawned = 0;
        this._patternData.spawnInterval = 300;
        this._patternData.nextSpawn = 500; // 0.5초 뒤 첫 스폰
        break;
      }
      case PATTERN.BARRAGE: {
        this._patternData.wave = 0;
        this._patternData.nextWave = 300;
        break;
      }
    }
  }

  // ── 패턴 1: 포자비 ──
  _updateSporeRain(dt) {
    const cfg = CFG().patterns.sporeRain;
    const d = this._patternData;
    d.nextSpawn -= dt;

    if (d.nextSpawn <= 0 && d.spawned < d.totalSpores) {
      d.nextSpawn = d.spawnInterval;
      d.spawned++;

      const bossAtk = this.boss.atk || this.boss.attack || 20;
      this._enemyProjectiles.push({
        x: this._bossScreenX + (Math.random() - 0.5) * this.W * 0.6,
        y: this._bossScreenY + 30,
        vx: 0,
        vy: cfg.speed,
        driftX: (Math.random() - 0.5) * cfg.driftX,
        damage: bossAtk * cfg.damageRatio,
        radius: cfg.radius,
        emoji: cfg.emoji,
        life: 5000,
      });
    }
  }

  // ── 패턴 2: 레이저빔 ──
  _updateLaserBeam(dt) {
    const cfg = CFG().patterns.laserBeam;

    if (this._patternTimer < cfg.warningDur) {
      // 경고선
      this._laserWarningTimer = this._patternTimer;
      this._laserActive = false;
    } else {
      // 빔 활성 + 좌우 스윕
      this._laserActive = true;
      const sweepT = (this._patternTimer - cfg.warningDur) / (cfg.duration - cfg.warningDur);
      this._laserAngle = (-cfg.sweepAngle / 2 + sweepT * cfg.sweepAngle) * this._laserSweepDir;

      // 틱 데미지
      if (!this._patternData._lastTick) this._patternData._lastTick = 0;
      this._patternData._lastTick += dt;
      if (this._patternData._lastTick >= cfg.tickInterval) {
        this._patternData._lastTick = 0;
        // 빔-플레이어 충돌 체크
        if (this._checkLaserHit()) {
          const bossAtk = this.boss.atk || this.boss.attack || 20;
          this._damagePlayerAerial(bossAtk * cfg.damageRatio);
        }
      }
    }
  }

  _checkLaserHit() {
    // 빔: 보스 위치에서 각도 방향으로 무한 연장
    const angleRad = (this._laserAngle + 90) * Math.PI / 180; // 90도 = 아래 방향
    const cfg = CFG().patterns.laserBeam;
    const halfW = cfg.beamWidth / 2;

    // 빔 중심선: 보스 → 각도 방향
    const bx = this._bossScreenX;
    const by = this._bossScreenY + 30;
    const dirX = Math.cos(angleRad);
    const dirY = Math.sin(angleRad);

    // 플레이어까지 수직 거리
    const px = this._playerScreenX - bx;
    const py = this._playerScreenY - by;
    const proj = px * dirX + py * dirY;
    if (proj < 0) return false; // 보스 뒤

    const perpDist = Math.abs(px * dirY - py * dirX);
    return perpDist < halfW + 12; // 12 = 플레이어 반경
  }

  // ── 패턴 3: 돌진 ──
  _updateDiveBomb(dt) {
    const cfg = CFG().patterns.diveBomb;
    const d = this._patternData;
    d.phaseTimer += dt;

    if (d.phase === 'telegraph') {
      // 텔레그래프: 빨간 ! 마크 + 쉐이크
      if (d.phaseTimer >= cfg.telegraphDur) {
        d.phase = 'dive';
        d.phaseTimer = 0;
        d.targetX = this._playerScreenX; // 돌진 목표
      }
    } else if (d.phase === 'dive') {
      // 돌진: 보스가 아래로 빠르게 내려감
      const diveTargetY = this.H * cfg.diveTargetY;
      const diveDur = 600;
      const t = Math.min(1, d.phaseTimer / diveDur);
      const eased = t * t; // easeIn
      this._bossScreenY = this._diveBossY + (diveTargetY - this._diveBossY) * eased;
      this._bossScreenX += (d.targetX - this._bossScreenX) * 0.1;

      // 접촉 데미지 체크
      const dx = this._bossScreenX - this._playerScreenX;
      const dy = this._bossScreenY - this._playerScreenY;
      const hitR = CFG().boss.baseFontSize * CFG().boss.scale * 0.4;
      if (dx * dx + dy * dy < (hitR + 12) * (hitR + 12)) {
        if (!d._hitPlayer) {
          d._hitPlayer = true;
          const bossAtk = this.boss.atk || this.boss.attack || 20;
          this._damagePlayerAerial(bossAtk * cfg.damageRatio);
        }
      }

      if (d.phaseTimer >= diveDur) {
        d.phase = 'return';
        d.phaseTimer = 0;
      }
    } else if (d.phase === 'return') {
      // 복귀: 천천히 원래 위치로
      const baseY = this.H * (CFG().boss.yRange[0] + CFG().boss.yRange[1]) * 0.5;
      this._bossScreenY += (baseY - this._bossScreenY) * cfg.returnSpeed * (dt / 1000);
      this._diveBossY = this._bossScreenY;
    }
  }

  // ── 패턴 4: 소환 ──
  _updateSummonMinions(dt) {
    const cfg = CFG().patterns.summonMinions;
    const d = this._patternData;
    d.nextSpawn -= dt;

    if (d.nextSpawn <= 0 && d.spawned < d.toSpawn) {
      d.nextSpawn = d.spawnInterval;
      d.spawned++;

      const side = Math.random() < 0.5 ? -10 : this.W + 10;
      const spawnY = this.H * 0.3 + Math.random() * this.H * 0.5;
      const bossAtk = this.boss.atk || this.boss.attack || 20;

      this._minions.push({
        x: side,
        y: spawnY,
        hp: cfg.minionHp,
        speed: cfg.minionSpeed,
        radius: cfg.minionRadius,
        emoji: cfg.minionEmoji,
        damage: bossAtk * cfg.damageRatio,
      });
    }
  }

  // ── 패턴 5: 폭주 (HP<30% 전용) ──
  _updateBarrage(dt) {
    const cfg = CFG().patterns.barrage;
    const d = this._patternData;
    d.nextWave -= dt;

    if (d.nextWave <= 0 && d.wave < cfg.waves) {
      d.nextWave = cfg.waveDelay;
      d.wave++;

      const bossAtk = this.boss.atk || this.boss.attack || 20;
      const count = cfg.bulletCount;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        this._enemyProjectiles.push({
          x: this._bossScreenX,
          y: this._bossScreenY + 20,
          vx: Math.cos(angle) * cfg.bulletSpeed,
          vy: Math.sin(angle) * cfg.bulletSpeed,
          damage: bossAtk * cfg.damageRatio,
          radius: cfg.bulletRadius,
          emoji: cfg.emoji,
          life: 4000,
        });
      }
    }
  }

  // ══════════════════════════════════════
  //  VICTORY / DEFEAT
  // ══════════════════════════════════════
  _updateVictory(dt) {
    this._phaseTimer += dt;
    this._updateParticles(dt);
    this._updateExplosionParticles(dt);

    const cfg = CFG().victory;
    const totalDur = cfg.explosionDuration + cfg.flashDuration + cfg.itemRainDuration + cfg.resultDelay;
    if (this._phaseTimer >= totalDur) {
      this.onVictory();
    }
  }

  _updateDefeat(dt) {
    this._phaseTimer += dt;
    const cfg = CFG().defeat;
    if (this._phaseTimer >= cfg.slowMoDuration + cfg.fadeDuration) {
      this.onDeath();
    }
  }

  _spawnExplosion() {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this._explosionParticles.push({
        x: this._bossScreenX,
        y: this._bossScreenY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1500,
        color: ['#ff4444', '#fbbf24', '#ff8800', '#ffffff'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 5,
      });
    }
  }

  _updateExplosionParticles(dt) {
    for (let i = this._explosionParticles.length - 1; i >= 0; i--) {
      const p = this._explosionParticles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt;
      if (p.life <= 0) this._explosionParticles.splice(i, 1);
    }
  }

  // ══════════════════════════════════════
  //  BACKGROUND ELEMENTS
  // ══════════════════════════════════════

  // ── 나뭇가지 캐노피 (양쪽에서 쏜살같이 지나감) ──
  _initBranches() {
    const branches = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      branches.push(this._makeBranch(Math.random() * this.H));
    }
    return branches;
  }

  _makeBranch(y) {
    const fromLeft = Math.random() < 0.5;
    const depth = 0.3 + Math.random() * 0.7; // 0.3=먼 가지, 1.0=가까운 가지
    // 다크 팔레트 — 어둠의 숲 느낌
    const darkColors = ['#0a0a14', '#0e0e1a', '#12101e', '#080812', '#141020'];
    const leafDark = ['#0c0c18', '#100e1e', '#0a0816'];
    return {
      x: fromLeft ? -(20 + Math.random() * 80) : this.W + 20 + Math.random() * 80,
      y,
      fromLeft,
      depth,
      length: 80 + depth * 140,
      thickness: 2 + depth * 5,
      angle: fromLeft ? (-20 + Math.random() * 40) : (140 + Math.random() * 40),
      leafCount: Math.floor(3 + depth * 6),
      speed: 4 + depth * 10,               // 더 빠르게 (쏜살같이)
      alpha: 0.3 + depth * 0.55,
      color: darkColors[Math.floor(Math.random() * darkColors.length)],
      leafColor: leafDark[Math.floor(Math.random() * leafDark.length)],
    };
  }

  _updateBranches(dt) {
    for (let i = this._branches.length - 1; i >= 0; i--) {
      const b = this._branches[i];
      b.y += b.speed * (dt / 16);
      // 화면 밖 → 상단에서 리스폰
      if (b.y > this.H + b.length) {
        this._branches[i] = this._makeBranch(-b.length - Math.random() * 100);
      }
    }
  }

  _updateMapScroll(dt) {
    if (!this._map) return;
    // 맵 카메라: 위에서 아래로 빠르게 스크롤 (아래를 내려다보는 효과)
    this._mapCamera.y += this._mapScrollSpeed * (dt / 16);
    // 맵 끝에 도달하면 루프
    const mapH = this._map.mapH || 1000;
    if (this._mapCamera.y > mapH - this.H) {
      this._mapCamera.y = 0;
    }
    // X도 약간 흔들림 (바람/회전 느낌)
    this._mapCamera.x = (this._map.mapW || 400) * 0.3 + Math.sin(this._elapsed * 0.0005) * 40;
  }

  _initSpeedLines() {
    const cfg = CFG().background;
    const lines = [];
    for (let i = 0; i < cfg.speedLineCount; i++) {
      lines.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        speed: cfg.speedLineSpeed[0] + Math.random() * (cfg.speedLineSpeed[1] - cfg.speedLineSpeed[0]),
        alpha: cfg.speedLineAlpha[0] + Math.random() * (cfg.speedLineAlpha[1] - cfg.speedLineAlpha[0]),
        length: 20 + Math.random() * 40,
      });
    }
    return lines;
  }

  _updateSpeedLines(dt) {
    for (const line of this._speedLines) {
      line.y += line.speed * (dt / 16);
      if (line.y > this.H + line.length) {
        line.y = -line.length;
        line.x = Math.random() * this.W;
      }
    }
  }

  _initClouds() {
    const cfg = CFG().background;
    const clouds = [];
    for (let i = 0; i < cfg.cloudCount; i++) {
      clouds.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        speed: cfg.cloudSpeed[0] + Math.random() * (cfg.cloudSpeed[1] - cfg.cloudSpeed[0]),
        alpha: cfg.cloudAlpha[0] + Math.random() * (cfg.cloudAlpha[1] - cfg.cloudAlpha[0]),
        size: cfg.cloudSizeRange[0] + Math.random() * (cfg.cloudSizeRange[1] - cfg.cloudSizeRange[0]),
      });
    }
    return clouds;
  }

  _updateClouds(dt) {
    for (const cloud of this._clouds) {
      cloud.y += cloud.speed * (dt / 16);
      if (cloud.y > this.H + cloud.size) {
        cloud.y = -cloud.size;
        cloud.x = Math.random() * this.W;
      }
    }
  }

  _updateParticles(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt;
      if (p.life <= 0) this._particles.splice(i, 1);
    }
  }

  _updateDamageNumbers(dt) {
    for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
      const d = this._damageNumbers[i];
      d.y += d.vy * (dt / 16);
      d.life -= dt;
      if (d.life <= 0) this._damageNumbers.splice(i, 1);
    }
  }

  // ══════════════════════════════════════
  //  DRAW — COMBAT
  // ══════════════════════════════════════
  _drawCombat(ctx) {
    // 배경
    this._drawBackground(ctx);

    // 적 투사체
    this._drawEnemyProjectiles(ctx);

    // 미니적
    this._drawMinions(ctx);

    // 플레이어 투사체
    this._drawPlayerProjectiles(ctx);

    // 보스
    this._drawBoss(ctx);

    // 플레이어
    this._drawPlayer(ctx);

    // 레이저빔 (보스 위에)
    if (this._currentPattern === PATTERN.LASER_BEAM) {
      this._drawLaserBeam(ctx);
    }

    // 돌진 텔레그래프
    if (this._currentPattern === PATTERN.DIVE_BOMB && this._patternData?.phase === 'telegraph') {
      this._drawDiveTelegraph(ctx);
    }

    // 파티클
    this._drawParticles(ctx);
    this._drawExplosionParticles(ctx);

    // 데미지 숫자
    this._drawDamageNumbers(ctx);

    // 나뭇가지 전경 (카메라 가까이 — 엔티티 위에 오버레이)
    this._drawBranches(ctx);

    // 비네팅
    this._drawVignette(ctx);

    // HUD
    this._drawHUD(ctx);
  }

  // ── 배경 (뱀서 맵 + 나뭇가지 캐노피) ──
  _drawBackground(ctx) {
    const W = this.W;
    const H = this.H;
    const cfg = CFG().background;

    // ══ Layer 0: 하늘 ══
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const colors = cfg.skyGradient;
    for (let i = 0; i < colors.length; i++) {
      grad.addColorStop(i / (colors.length - 1), colors[i]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ══ Layer 1: 실제 뱀서 맵 (아래 내려다보는 바닥) ══
    if (this._map && this._renderMapFn) {
      ctx.save();

      // 맵을 화면 하단 45%에 사다리꼴로 그리기 (로우뷰 원근)
      const floorTop = H * 0.45;
      const floorBot = H;
      const vanishX = W * 0.5;
      const topW = W * 0.15;     // 상단 좁은 폭 (먼 곳)
      const botW = W * 1.1;      // 하단 넓은 폭 (가까운 곳 — 약간 오버)

      // 사다리꼴 클리핑 경로
      ctx.beginPath();
      ctx.moveTo(vanishX - topW / 2, floorTop);
      ctx.lineTo(vanishX + topW / 2, floorTop);
      ctx.lineTo(vanishX + botW / 2, floorBot);
      ctx.lineTo(vanishX - botW / 2, floorBot);
      ctx.closePath();
      ctx.clip();

      // 맵 렌더링 (자체 카메라 사용 — 빠르게 스크롤)
      ctx.globalAlpha = 0.55;
      // 원근 변환: 상단 축소, 하단 확대
      const scaleY = (floorBot - floorTop) / H;
      const scaleX = (botW + topW) / (2 * W);
      ctx.translate(vanishX, floorTop);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-W / 2, 0);
      this._renderMapFn(ctx, this._map, this._mapCamera);

      ctx.restore();

      // 맵 위 어둠 안개 (다크 포레스트 — 보라빛 안개)
      ctx.save();
      const fogGrad = ctx.createLinearGradient(0, floorTop - 30, 0, floorBot);
      fogGrad.addColorStop(0, 'rgba(8,5,16,0.7)');
      fogGrad.addColorStop(0.3, 'rgba(12,8,24,0.4)');
      fogGrad.addColorStop(1, 'rgba(10,5,20,0.2)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, floorTop - 30, W, floorBot - floorTop + 30);
      ctx.restore();
    }

    // ══ Layer 2: 스피드라인 (나뭇가지 사이를 뚫고 지나가는 속도감) ══
    ctx.save();
    for (const line of this._speedLines) {
      ctx.globalAlpha = line.alpha;
      ctx.strokeStyle = '#9966cc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x, line.y + line.length);
      ctx.stroke();
    }
    ctx.restore();

    // ══ Layer 3: 구름 (먼 구름) ══
    ctx.save();
    for (const cloud of this._clouds) {
      const depthT = cloud.y / H;
      const scale = 0.3 + depthT * 0.7;
      ctx.globalAlpha = cloud.alpha * (0.4 + depthT * 0.4);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cloud.x, cloud.y, cloud.size * 0.6 * scale, cloud.size * 0.25 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Layer 4 (나뭇가지 캐노피)는 _drawCombat에서 전경으로 렌더링
  }

  // ── 나뭇가지 렌더링 ──
  _drawBranches(ctx) {
    ctx.save();
    for (const b of this._branches) {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.translate(b.x, b.y);
      const rad = b.angle * Math.PI / 180;
      ctx.rotate(rad);

      // 가지 본체 (굵은 선)
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.thickness;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // 약간 휘어진 가지
      const cx1 = b.length * 0.3;
      const cy1 = b.thickness * 2 * (b.fromLeft ? 1 : -1);
      ctx.quadraticCurveTo(cx1, cy1, b.length, b.thickness * 0.5);
      ctx.stroke();

      // 잔가지 (2~3개)
      ctx.lineWidth = Math.max(1, b.thickness * 0.4);
      const subCount = Math.min(3, Math.floor(b.leafCount * 0.4));
      for (let s = 0; s < subCount; s++) {
        const t = 0.3 + s * 0.25;
        const sx = b.length * t;
        const sy = cy1 * t * 0.5;
        const subAngle = (Math.random() - 0.5) * 0.8;
        const subLen = b.length * (0.15 + Math.random() * 0.2);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(subAngle) * subLen, sy + Math.sin(subAngle) * subLen);
        ctx.stroke();
      }

      // 잎사귀 (어둠의 숲 다크 톤)
      ctx.fillStyle = b.leafColor || (b.depth > 0.5 ? '#0c0c18' : '#141020');
      for (let l = 0; l < b.leafCount; l++) {
        const lt = 0.2 + (l / b.leafCount) * 0.7;
        const lx = b.length * lt + (Math.random() - 0.5) * 15;
        const ly = cy1 * lt + (Math.random() - 0.5) * 10;
        const leafSize = 3 + b.depth * 6;
        // 타원형 잎
        ctx.beginPath();
        ctx.ellipse(lx, ly, leafSize, leafSize * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  // ── 비네팅 ──
  _drawVignette(ctx) {
    const cfg = CFG().vignette;
    const W = this.W;
    const H = this.H;
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);

    const grad = ctx.createRadialGradient(cx, cy, maxR * cfg.innerRadius, cx, cy, maxR * cfg.outerRadius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${cfg.opacity})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 보스 렌더링 ──
  _drawBoss(ctx) {
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    if (this.phase === PHASE.VICTORY && this._phaseTimer > CFG().victory.explosionDuration) return;

    this._drawBossAt(ctx, this._bossScreenX, this._bossScreenY, 1);
  }

  _drawBossAt(ctx, x, y, alpha) {
    const cfg = CFG().boss;
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    const hpRatio = bossHp / this.bossMaxHp;
    const enraged = hpRatio <= cfg.enrageThreshold;
    const fontSize = cfg.baseFontSize * cfg.scale;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 분노 글로우
    if (enraged) {
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, fontSize);
      glowGrad.addColorStop(0, 'rgba(255,60,20,0.4)');
      glowGrad.addColorStop(0.5, 'rgba(255,100,0,0.2)');
      glowGrad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, fontSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 분노 흔들림
    let sx = x, sy = y;
    if (enraged) {
      sx += (Math.random() - 0.5) * cfg.enrageShake * 2;
      sy += (Math.random() - 0.5) * cfg.enrageShake * 2;
    }

    // 승리 시 폭발 축소
    if (this.phase === PHASE.VICTORY) {
      const vt = Math.min(1, this._phaseTimer / CFG().victory.explosionDuration);
      ctx.globalAlpha = alpha * (1 - vt);
      const scale = 1 + vt * 0.5;
      ctx.translate(sx, sy);
      ctx.scale(scale, scale);
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.boss.emoji || '\uD83D\uDC79', 0, 0);
    } else {
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.boss.emoji || '\uD83D\uDC79', sx, sy);
    }

    ctx.restore();
  }

  // ── 플레이어 렌더링 ──
  _drawPlayer(ctx) {
    this._drawPlayerAt(ctx, this._playerScreenX, this._playerScreenY);
  }

  _drawPlayerAt(ctx, x, y) {
    const rageActive = this._rageActive || (this.rageSystem && this.rageSystem.isActive());
    const fontSize = CFG().player.fontSize;

    // 둥둥 떠다니는 높이 오프셋
    const bobOffset = Math.sin(this._playerBobPhase) * this._playerBobAmp;
    const floatY = y + bobOffset;

    ctx.save();

    // ── 바닥 그림자 (떠있는 느낌 강조) ──
    const shadowScale = 1 - bobOffset / 30; // 높이 오를수록 그림자 작아짐
    ctx.save();
    ctx.globalAlpha = 0.25 * shadowScale;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 16 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 날개 잔상 (좌우 펄럭임) ──
    const wingPhase = this._elapsed * 0.008;
    const wingSpread = 12 + Math.sin(wingPhase) * 5;
    ctx.save();
    ctx.globalAlpha = 0.3;
    // 왼쪽 날개
    ctx.fillStyle = rageActive ? 'rgba(255,180,50,0.5)' : 'rgba(200,230,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(x - wingSpread, floatY - 4, 10, 6, -0.3 + Math.sin(wingPhase) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // 오른쪽 날개
    ctx.beginPath();
    ctx.ellipse(x + wingSpread, floatY - 4, 10, 6, 0.3 - Math.sin(wingPhase) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── 비행 글로우 (발 아래 빛) ──
    const glowGrad = ctx.createRadialGradient(x, floatY + 10, 0, x, floatY + 10, 20);
    if (rageActive) {
      glowGrad.addColorStop(0, 'rgba(255,200,50,0.5)');
      glowGrad.addColorStop(1, 'rgba(255,100,0,0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(150,220,255,0.35)');
      glowGrad.addColorStop(1, 'rgba(100,180,255,0)');
    }
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, floatY + 10, 20, 0, Math.PI * 2);
    ctx.fill();

    // ── 분노 전체 글로우 ──
    if (rageActive) {
      const rGlow = ctx.createRadialGradient(x, floatY, 0, x, floatY, 35);
      rGlow.addColorStop(0, 'rgba(255,200,50,0.4)');
      rGlow.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = rGlow;
      ctx.beginPath();
      ctx.arc(x, floatY, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 요정 본체 ──
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uD83E\uDDDA', x, floatY); // 🧚

    // ── 비행 파티클 트레일 (발 아래 작은 빛) ──
    if (Math.random() < 0.3) {
      this._particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: floatY + 15,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 1 + Math.random(),
        life: 400,
        color: rageActive ? '#ffcc44' : '#aaddff',
        size: 1 + Math.random() * 2,
      });
    }

    ctx.restore();
  }

  // ── 플레이어 투사체 ──
  _drawPlayerProjectiles(ctx) {
    ctx.save();
    for (const p of this._playerProjectiles) {
      ctx.font = `${p.radius * 4}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 발광 이펙트
      ctx.shadowColor = p.rageActive ? '#ff4444' : '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.fillText(p.emoji, p.x, p.y);
    }
    ctx.restore();
  }

  // ── 적 투사체 ──
  _drawEnemyProjectiles(ctx) {
    ctx.save();
    for (const p of this._enemyProjectiles) {
      const alpha = Math.min(1, p.life / 500);
      ctx.globalAlpha = alpha;
      ctx.font = `${(p.radius || 5) * 3}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji || '\uD83D\uDCA0', p.x, p.y);
    }
    ctx.restore();
  }

  // ── 미니적 ──
  _drawMinions(ctx) {
    ctx.save();
    for (const m of this._minions) {
      ctx.font = `${m.radius * 3}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 글로우
      ctx.shadowColor = '#aa44cc';
      ctx.shadowBlur = 6;
      ctx.fillText(m.emoji, m.x, m.y);
    }
    ctx.restore();
  }

  // ── 레이저빔 ──
  _drawLaserBeam(ctx) {
    const cfg = CFG().patterns.laserBeam;
    const bx = this._bossScreenX;
    const by = this._bossScreenY + 30;
    const angleRad = (this._laserAngle + 90) * Math.PI / 180;
    const endDist = this.H * 1.5;
    const ex = bx + Math.cos(angleRad) * endDist;
    const ey = by + Math.sin(angleRad) * endDist;

    ctx.save();

    if (!this._laserActive) {
      // 경고선
      const warnAlpha = 0.2 + Math.sin(this._patternTimer * 0.01) * 0.15;
      ctx.strokeStyle = cfg.warningColor;
      ctx.globalAlpha = warnAlpha;
      ctx.lineWidth = cfg.beamWidth * 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    } else {
      // 실제 빔
      ctx.globalAlpha = 0.8;
      const beamGrad = ctx.createLinearGradient(bx, by, ex, ey);
      beamGrad.addColorStop(0, cfg.color);
      beamGrad.addColorStop(0.5, '#ff8888');
      beamGrad.addColorStop(1, 'rgba(255,0,0,0.1)');
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = cfg.beamWidth;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // 내부 밝은 코어
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = cfg.beamWidth * 0.3;
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── 돌진 텔레그래프 ──
  _drawDiveTelegraph(ctx) {
    const d = this._patternData;
    if (!d || d.phase !== 'telegraph') return;

    ctx.save();
    const alpha = 0.3 + Math.sin(this._patternTimer * 0.015) * 0.2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2757', this._bossScreenX, this._bossScreenY - 60); // ❗
    ctx.restore();
  }

  // ── 파티클 ──
  _drawParticles(ctx) {
    ctx.save();
    for (const p of this._particles) {
      const alpha = Math.max(0, p.life / 500);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawExplosionParticles(ctx) {
    ctx.save();
    for (const p of this._explosionParticles) {
      const alpha = Math.max(0, p.life / 1500);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 데미지 숫자 ──
  _drawDamageNumbers(ctx) {
    ctx.save();
    for (const d of this._damageNumbers) {
      const alpha = Math.max(0, d.life / 800);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.font = `bold ${Math.round(14 * d.scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(`-${d.value}`, d.x, d.y);
    }
    ctx.restore();
  }

  // ══════════════════════════════════════
  //  HUD
  // ══════════════════════════════════════
  _drawHUD(ctx) {
    const W = this.W;
    const H = this.H;
    const hudCfg = CFG().hud;

    // ── 보스 HP바 (상단 중앙) ──
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    const hpRatio = Math.max(0, bossHp / this.bossMaxHp);

    const barW = W * hudCfg.bossHpBarWidthRatio;
    const barX = (W - barW) / 2;
    const barY = hudCfg.bossHpBarY;
    const barH = hudCfg.bossHpBarHeight;

    // 색상 결정 (BossRoomSystem 스타일)
    let barColor = '#22c55e';
    let label = '';
    const colorPhases = BOSS_ROOM_CONFIG.bossHpBar.colorPhases;
    for (const phase of colorPhases) {
      if (hpRatio >= phase.threshold) {
        barColor = phase.color;
        label = phase.label;
        break;
      }
    }

    ctx.save();
    // 배경
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
    // 바 배경
    ctx.fillStyle = 'rgba(30,30,50,0.9)';
    ctx.fillRect(barX, barY, barW, barH);
    // HP
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    // 보스 이름
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameText = `${this.boss.emoji || '\uD83D\uDC79'} ${this.boss.name || '\uBCF4\uC2A4'}`;
    ctx.fillText(nameText, W / 2, barY + barH / 2);
    // 분노 라벨
    if (label) {
      ctx.fillStyle = barColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, barX + barW, barY - 2);
    }
    ctx.restore();

    // ── 플레이어 HP바 (하단 좌측) ──
    const pHpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    const phX = hudCfg.playerHpBarX;
    const phY = H + hudCfg.playerHpBarY;
    const phW = hudCfg.playerHpBarW;
    const phH = hudCfg.playerHpBarH;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(phX - 2, phY - 2, phW + 4, phH + 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(phX, phY, phW, phH);
    ctx.fillStyle = pHpRatio > 0.3 ? '#22c55e' : '#ff6b6b';
    ctx.fillRect(phX, phY, phW * pHpRatio, phH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HP ${Math.ceil(this.player.hp)}/${this.player.maxHp}`, phX + 4, phY + phH / 2);
    ctx.restore();

    // ── 분노 게이지 (하단 우측) ──
    if (this.rageSystem) {
      const rageRatio = this.rageSystem.gauge !== undefined
        ? this.rageSystem.gauge / 100
        : 0;
      const rActive = this._rageActive || this.rageSystem.isActive();
      const rX = W + hudCfg.rageBarX;
      const rY = H + hudCfg.rageBarY;
      const rW = hudCfg.rageBarW;
      const rH = hudCfg.rageBarH;

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(rX - 2, rY - 2, rW + 4, rH + 4);
      ctx.fillStyle = '#333';
      ctx.fillRect(rX, rY, rW, rH);
      ctx.fillStyle = rActive ? '#ff4444' : '#ff8800';
      ctx.fillRect(rX, rY, rW * rageRatio, rH);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rActive ? '\uD83D\uDD25 \uBD84\uB178!' : `\uD83D\uDD25 ${Math.floor(rageRatio * 100)}%`, rX + rW / 2, rY + rH / 2);
      ctx.restore();
    }

    // ── 패턴 경고 ──
    if (this._currentPattern === PATTERN.LASER_BEAM && !this._laserActive) {
      ctx.save();
      ctx.fillStyle = '#ff4444';
      ctx.globalAlpha = 0.5 + Math.sin(this._elapsed * 0.01) * 0.3;
      ctx.font = 'bold 14px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u26A0\uFE0F \uB808\uC774\uC800 \uACBD\uACE0!', W / 2, H * 0.5); // ⚠️ 레이저 경고!
      ctx.restore();
    }
    if (this._currentPattern === PATTERN.DIVE_BOMB && this._patternData?.phase === 'telegraph') {
      ctx.save();
      ctx.fillStyle = '#ff4444';
      ctx.globalAlpha = 0.5 + Math.sin(this._elapsed * 0.015) * 0.3;
      ctx.font = 'bold 14px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('\u26A0\uFE0F \uB3CC\uC9C4 \uACBD\uACE0!', W / 2, H * 0.5); // ⚠️ 돌진 경고!
      ctx.restore();
    }
  }

  // ══════════════════════════════════════
  //  VICTORY / DEFEAT OVERLAYS
  // ══════════════════════════════════════
  _drawVictoryOverlay(ctx) {
    const W = this.W;
    const H = this.H;
    const cfg = CFG().victory;
    const t = this._phaseTimer;

    ctx.save();

    // 화면 플래시
    if (t > cfg.explosionDuration && t < cfg.explosionDuration + cfg.flashDuration) {
      const ft = (t - cfg.explosionDuration) / cfg.flashDuration;
      ctx.fillStyle = `rgba(255,255,200,${0.6 * (1 - ft)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // 아이템 비 연출
    if (t > cfg.explosionDuration + cfg.flashDuration) {
      const rainT = (t - cfg.explosionDuration - cfg.flashDuration) / cfg.itemRainDuration;
      if (rainT < 1) {
        const items = ['\uD83D\uDC8E', '\u2B50', '\uD83C\uDF1F', '\uD83C\uDFC6', '\uD83D\uDD2E']; // 💎⭐🌟🏆🔮
        for (let i = 0; i < 8; i++) {
          const ix = W * 0.15 + (W * 0.7 / 8) * i + Math.sin(this._elapsed * 0.003 + i) * 10;
          const iy = -20 + (H + 40) * Math.min(1, rainT * 1.5 - i * 0.05);
          if (iy > -20 && iy < H + 20) {
            ctx.font = '24px serif';
            ctx.textAlign = 'center';
            ctx.fillText(items[i % items.length], ix, iy);
          }
        }
      }
    }

    // 승리 텍스트
    if (t > cfg.explosionDuration + cfg.flashDuration + 500) {
      const alpha = Math.min(1, (t - cfg.explosionDuration - cfg.flashDuration - 500) / 500);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 32px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 15;
      ctx.fillText('\uD83C\uDF89 \uC2B9\uB9AC!', W / 2, H * 0.4); // 🎉 승리!
    }

    ctx.restore();
  }

  _drawDefeatOverlay(ctx) {
    const W = this.W;
    const H = this.H;
    const cfg = CFG().defeat;
    const t = this._phaseTimer;

    ctx.save();

    // 슬로모션 → 빨간 페이드
    if (t < cfg.slowMoDuration) {
      // 슬로모션: 약간의 빨간 틴트
      const st = t / cfg.slowMoDuration;
      ctx.fillStyle = `rgba(100,0,0,${st * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      // 빨간 페이드
      const ft = Math.min(1, (t - cfg.slowMoDuration) / cfg.fadeDuration);
      ctx.fillStyle = `rgba(60,0,0,${0.3 + ft * 0.7})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }
}
