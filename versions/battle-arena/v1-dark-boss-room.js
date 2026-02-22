/**
 * BossRoomSystem — 보스방 라이프사이클 관리
 *
 * 전투 흐름:
 *   일반 웨이브 전멸 → 게이트 활성 → 플레이어 진입 → 보스방 전환
 *   → dormant(1초) → awakening(2초) → active(전투) → victory(아이템)
 *
 * combat-engine.js에서 import하여 사용
 */
import { BattleArena, ARENA_BOSSES } from '../generators/battle-arena.js';
import { BOSS_ROOM_CONFIG, ARENA_WAVE_CONFIG } from '../data/combat-config.js';
import { getWavePhase } from '../data/wave-scaling-config.js';
import UnitFactory from '../data/unit-factory.js';

// 보스방 페이즈
const PHASE = {
  INACTIVE: 'inactive',       // 보스방 미진입 (일반 웨이브 진행 중)
  GATE_ACTIVE: 'gate_active', // 게이트 활성화 (일반몹 전멸)
  ENTERING: 'entering',       // 진입 연출 (화면 전환)
  DORMANT: 'dormant',         // 보스방 전경 보여주기
  AWAKENING: 'awakening',     // 보스 깨어남 연출
  ACTIVE: 'active',           // 보스전 진행 중
  VICTORY: 'victory',         // 보스 처치 → 아이템 수집
  COMPLETE: 'complete',       // 보스방 완료 → 스테이지 클리어
};

export { PHASE as BOSS_ROOM_PHASE };

export default class BossRoomSystem {
  constructor(engine, stageId) {
    this.alwaysActive = true;
    this.engine = engine;
    this.stageId = stageId;
    this.phase = PHASE.INACTIVE;
    this.phaseTimer = 0;

    // 스테이지별 보스방 설정
    const mapping = BOSS_ROOM_CONFIG.stageMapping[stageId];
    this.enabled = !!mapping;
    this.config = mapping;

    // 아레나 인스턴스 (진입 시 생성)
    this.arena = null;
    this.boss = null;
    this.bossMaxHp = 0;

    // 게이트 위치 (일반 필드 우측 끝)
    this.gate = {
      x: 0, y: 0,
      active: false,
      pulsePhase: 0,
    };

    // 깨어남 시퀀스 트래킹
    this._awakeningStep = 0;

    // 승리 시퀀스
    this._lootItems = [];
    this._lootCollected = false;

    // 카메라 전환용
    this._cameraPanTarget = null;
    this._cameraPanProgress = 0;

    // 아레나 슬라임 웨이브 상태
    this._arenaWaveNum = 0;
    this._arenaWaveTimer = 0;
    this._arenaSlimes = [];
    this._arenaElapsed = 0;
    this._arenaFirstWaveFired = false;
  }

  // ── 게이트 위치 설정 (맵 상단 중앙, 아래→위 진행) ──
  setGatePosition(mapW, mapH) {
    this.gate.x = mapW / 2;
    this.gate.y = 100;
  }

  // ── 일반몹 전멸 시 호출 → 게이트 활성화 ──
  activateGate() {
    if (!this.enabled || this.phase !== PHASE.INACTIVE) return;
    this.phase = PHASE.GATE_ACTIVE;
    this.gate.active = true;
  }

  // ── 플레이어가 게이트에 닿았는지 체크 ──
  checkGateEntry(playerX, playerY) {
    if (this.phase !== PHASE.GATE_ACTIVE) return false;
    const dx = playerX - this.gate.x;
    const dy = playerY - this.gate.y;
    const enterR = BOSS_ROOM_CONFIG.gate.enterRadius;
    return (dx * dx + dy * dy) < enterR * enterR;
  }

  // ── 보스방 진입 시작 ──
  enterBossRoom() {
    if (this.phase !== PHASE.GATE_ACTIVE) return;
    this.phase = PHASE.ENTERING;
    this.phaseTimer = 0;
    this._resetArenaWaves();

    // 아레나 생성
    const theme = this.config.theme || 'fairy_garden';
    const arenaConf = BOSS_ROOM_CONFIG.arena;
    this.arena = new BattleArena(theme, {
      width: arenaConf.width,
      height: arenaConf.height,
    });

    // 보스 생성 — 플레이어 전방(위)에 스폰 (전맵 배틀아레나, 아래→위 진행)
    const player = this.engine.player;
    const bossType = this.config.bossType;
    const bossDef = ARENA_BOSSES[bossType];
    const bossX = player.x;
    const bossY = player.y - this.engine.H * 0.4;
    if (bossDef) {
      this.boss = this.arena.spawnBoss(bossType);
      this.boss.x = bossX;
      this.boss.y = bossY;
      this.bossMaxHp = this.boss.maxHp;
    } else {
      // const fallbackDef = { name: bossType, emoji: '👹', hp: 300, atk: 20, def: 10, speed: 1.5, size: 3 };
      let fallbackDef;
      if (typeof FormulaPack2 !== 'undefined') {
        const playerPower = this.engine.player || { hp: 250, atk: 12, def: 7, dps: 24 };
        const bossStats = FormulaPack2.getBossStats(this.engine.stageLevel || 1, playerPower);
        fallbackDef = { name: bossType, emoji: '👹', hp: bossStats.hp, atk: bossStats.atk, def: bossStats.def, speed: 0.6, size: 3 };
      } else {
        fallbackDef = { name: bossType, emoji: '👹', hp: 300, atk: 20, def: 10, speed: 1.5, size: 3 };
      }
      this.boss = UnitFactory.createArenaBoss(fallbackDef, {
        x: bossX, y: bossY,
      });
      this.boss.id = `boss_${Date.now()}`;
      this.boss.currentPhase = 0;
      this.boss.patterns = [];
      this.boss.phases = [];
      this.bossMaxHp = this.boss.maxHp || this.boss.hp;
    }
  }

  // ── 프레임 업데이트 ──
  update(dt) {
    if (!this.enabled) return;

    this.phaseTimer += dt;

    switch (this.phase) {
      case PHASE.GATE_ACTIVE:
        this.gate.pulsePhase += dt * 0.003;
        break;

      case PHASE.ENTERING:
        // 화면 전환 연출 (0.5초)
        if (this.phaseTimer >= 500) {
          this.phase = PHASE.DORMANT;
          this.phaseTimer = 0;
        }
        break;

      case PHASE.DORMANT:
        // 보스방 전경 보여주기 (1초)
        if (this.arena) this.arena.update(dt);
        if (this.phaseTimer >= BOSS_ROOM_CONFIG.bossActivation.dormantDuration) {
          this.phase = PHASE.AWAKENING;
          this.phaseTimer = 0;
          this._awakeningStep = 0;
        }
        break;

      case PHASE.AWAKENING:
        // 보스 깨어남 시퀀스
        if (this.arena) this.arena.update(dt);
        this._updateAwakening(dt);
        if (this.phaseTimer >= BOSS_ROOM_CONFIG.bossActivation.awakeningDuration) {
          this.phase = PHASE.ACTIVE;
          this.phaseTimer = 0;
        }
        break;

      case PHASE.ACTIVE:
        // 보스전 진행
        if (this.arena) this.arena.update(dt);
        this._updateBossCombat(dt);
        this._updateArenaWaves(dt);
        this._updateArenaSlimes(dt);
        // 보스 HP 체크
        if (this.boss && (this.boss.currentHp || this.boss.hp) <= 0) {
          this.phase = PHASE.VICTORY;
          this.phaseTimer = 0;
          this.boss.alive = false;
          // 잔여 슬라임 제거
          this._clearArenaSlimes();
        }
        break;

      case PHASE.VICTORY:
        // 승리 시퀀스
        if (this.arena) this.arena.update(dt);
        if (this.phaseTimer >= BOSS_ROOM_CONFIG.victorySequence.lootCollectDuration +
            BOSS_ROOM_CONFIG.victorySequence.clearTransitionDelay) {
          this.phase = PHASE.COMPLETE;
        }
        break;
    }
  }

  // ── 깨어남 시퀀스 업데이트 ──
  _updateAwakening(dt) {
    const seq = BOSS_ROOM_CONFIG.bossActivation.awakeningSequence;
    for (const step of seq) {
      if (this.phaseTimer >= step.at && this._awakeningStep < seq.indexOf(step) + 1) {
        this._awakeningStep = seq.indexOf(step) + 1;
        this._executeAwakeningAction(step.action);
      }
    }
  }

  _executeAwakeningAction(action) {
    switch (action) {
      case 'camera_pan_to_boss':
        if (this.boss) {
          this._cameraPanTarget = { x: this.boss.x, y: this.boss.y };
          this._cameraPanProgress = 0;
        }
        break;
      case 'boss_eye_open':
        // 보스 시각 변경 (외부 렌더러에서 처리)
        break;
      case 'boss_roar':
        // 화면 흔들림 + 파티클 (engine에서 처리)
        this.engine._screenShake = {
          intensity: BOSS_ROOM_CONFIG.bossActivation.roarEffect.screenShake.intensity,
          duration: BOSS_ROOM_CONFIG.bossActivation.roarEffect.screenShake.duration,
          timer: 0,
        };
        break;
      case 'boss_hp_bar_appear':
        // HP바 등장 플래그
        this._bossHpBarVisible = true;
        break;
      case 'combat_start':
        // 전투 시작 — 보스가 움직이기 시작
        break;
    }
  }

  // ── 보스 전투 업데이트 ──
  _updateBossCombat(dt) {
    if (!this.boss || !this.boss.alive) return;

    const player = this.engine.player;
    const boss = this.boss;
    const bossHp = boss.currentHp !== undefined ? boss.currentHp : boss.hp;
    const bossMaxHp = boss.maxHp || this.bossMaxHp;
    const hpRatio = bossHp / bossMaxHp;

    // 페이즈 전환 체크
    if (boss.phases && boss.phases.length > 0) {
      let newPhaseIdx = 0;
      for (let i = boss.phases.length - 1; i >= 0; i--) {
        if (hpRatio * 100 <= boss.phases[i].hp) {
          newPhaseIdx = i;
        }
      }
      if (newPhaseIdx !== boss.currentPhase) {
        boss.currentPhase = newPhaseIdx;
        const p = boss.phases[newPhaseIdx];
        // 속도/공격력 배율 적용
        boss._spdMult = p.spdM || 1;
        boss._atkMult = p.atkM || 1;
      }
    }

    // 공중전 페이즈 전환 체크
    if (this.config.phaseTransition &&
        hpRatio <= this.config.phaseTransition.hpThreshold &&
        this.config.combatMode !== 'aerial') {
      this._triggerAerialTransition();
    }

    // 보스 이동 (플레이어 방향) — 최소 속도 보장
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const baseSpd = boss.speed || 1.5;
    const minSpd = (player.speed || 3) * 0.7;
    const spd = Math.max(baseSpd, minSpd) * (boss._spdMult || 1) * (dt / 16) * 0.6;
    if (dist > 50) {
      boss.x += (dx / dist) * spd;
      boss.y += (dy / dist) * spd;
    }

    // ── 보스 원거리 공격 (투사체) ──
    if (!boss._atkTimer) boss._atkTimer = 0;
    boss._atkTimer += dt;

    // 분노 모드: HP 30% 이하 → 공격 빈도 1.5배, 투사체 5개
    const enraged = hpRatio <= 0.3;
    const atkInterval = enraged ? 1500 : 2500; // ms
    const fanCount = enraged ? 5 : 3;
    const atkMult = (boss._atkMult || 1) * (enraged ? 1.5 : 1);

    if (boss._atkTimer >= atkInterval && dist < 500) {
      boss._atkTimer = 0;

      const bossAtk = (boss.atk || boss.attack || 20) * atkMult;
      const angle = Math.atan2(dy, dx);
      const fanSpread = Math.PI / 6; // 30도 부채꼴
      const projSpeed = 4;

      for (let i = 0; i < fanCount; i++) {
        const a = angle + (i - (fanCount - 1) / 2) * (fanSpread / Math.max(1, fanCount - 1));
        this.engine.projectiles.push({
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * projSpeed,
          vy: Math.sin(a) * projSpeed,
          damage: bossAtk * 0.4,
          radius: 6,
          source: 'enemy',
          color: enraged ? '#ff4444' : '#ff8800',
          emoji: enraged ? '💀' : '🔥',
          pierce: 0, homing: false, target: null,
        });
      }
    }

    // ── 접촉 데미지 (기존 기능 강화) ──
    if (dist < (boss.size || 3) * 14 + 20) {
      if (!boss._contactTimer) boss._contactTimer = 0;
      boss._contactTimer += dt;
      if (boss._contactTimer >= 800) {
        boss._contactTimer = 0;
        const contactDmg = (boss.atk || boss.attack || 20) * atkMult * 0.6;
        this.engine._damagePlayer(contactDmg);
      }
    }
  }

  // ── 공중전 전환 트리거 ──
  _triggerAerialTransition() {
    this.config.combatMode = 'aerial';
    // AerialCombatSystem이 있으면 활성화
    if (this.engine.aerialSystem) {
      this.engine.aerialSystem.activate(this.boss, this.config.phaseTransition.theme);
    }
  }

  // ── 보스에게 데미지 ──
  damageBoss(amount) {
    if (!this.boss || !this.boss.alive) return 0;
    const def = this.boss.def || 0;
    const dmg = Math.max(1, amount - def * 0.3);
    if (this.boss.currentHp !== undefined) {
      this.boss.currentHp -= dmg;
    } else {
      this.boss.hp -= dmg;
    }
    return dmg;
  }

  // ── 만남 지점에서 바로 보스방 활성화 (BossApproachSystem 전용) ──
  activateAtPosition(arenaX, arenaY, theme) {
    // GATE_ACTIVE/ENTERING 건너뛰고 바로 DORMANT로 진입
    this.enabled = true;

    // config가 없으면 스테이지 매핑에서 가져오거나 기본값
    if (!this.config) {
      const mapping = BOSS_ROOM_CONFIG.stageMapping[this.stageId];
      this.config = mapping || {
        bossType: 'boss_infected_elder',
        theme: theme || 'forest_clearing',
        combatMode: 'ground',
        modifiers: [],
      };
    }
    if (theme) this.config.theme = theme;

    // 아레나 생성
    const arenaConf = BOSS_ROOM_CONFIG.arena;
    this.arena = new BattleArena(theme || this.config.theme || 'fairy_garden', {
      width: arenaConf.width,
      height: arenaConf.height,
    });

    // 보스 생성 — 만남 지점 전방(위)에 스폰 (아래→위 진행)
    const player = this.engine.player;
    const bossType = this.config.bossType;
    const bossDef = ARENA_BOSSES[bossType];
    const bossX = arenaX;
    const bossY = arenaY - this.engine.H * 0.3;

    if (bossDef) {
      this.boss = this.arena.spawnBoss(bossType);
      this.boss.x = bossX;
      this.boss.y = bossY;
      this.bossMaxHp = this.boss.maxHp;
    } else {
      // const fallbackDef = { name: bossType, emoji: '\uD83D\uDC79', hp: 300, atk: 20, def: 10, speed: 1.5, size: 3 };
      let fallbackDef;
      if (typeof FormulaPack2 !== 'undefined') {
        const playerPower = this.engine.player || { hp: 250, atk: 12, def: 7, dps: 24 };
        const bossStats = FormulaPack2.getBossStats(this.engine.stageLevel || 1, playerPower);
        fallbackDef = { name: bossType, emoji: '\uD83D\uDC79', hp: bossStats.hp, atk: bossStats.atk, def: bossStats.def, speed: 0.6, size: 3 };
      } else {
        fallbackDef = { name: bossType, emoji: '\uD83D\uDC79', hp: 300, atk: 20, def: 10, speed: 1.5, size: 3 };
      }
      this.boss = UnitFactory.createArenaBoss(fallbackDef, {
        x: bossX, y: bossY,
      });
      this.boss.id = `boss_${Date.now()}`;
      this.boss.currentPhase = 0;
      this.boss.patterns = [];
      this.boss.phases = [];
      this.bossMaxHp = this.boss.maxHp || this.boss.hp;
    }

    // DORMANT 진입
    this.phase = PHASE.DORMANT;
    this.phaseTimer = 0;
    this._awakeningStep = 0;
    this._resetArenaWaves();
  }

  // ── 아레나 슬라임 웨이브 타이머 ──
  _updateArenaWaves(dt) {
    this._arenaElapsed += dt / 1000;
    this._arenaWaveTimer += dt;

    // 첫 웨이브 딜레이
    const delay = this._arenaFirstWaveFired
      ? ARENA_WAVE_CONFIG.waveInterval
      : ARENA_WAVE_CONFIG.firstWaveDelay;

    if (this._arenaWaveTimer >= delay) {
      this._arenaWaveTimer = 0;
      this._arenaFirstWaveFired = true;

      // 동시 최대 슬라임 수 확인
      if (this._arenaSlimes.length < ARENA_WAVE_CONFIG.maxSlimes) {
        this._spawnArenaWave();
      }
    }
  }

  // ── 슬라임 웨이브 스폰 ──
  _spawnArenaWave() {
    if (!this.arena) return;
    this._arenaWaveNum++;

    const wave = this.arena.spawnSlimeWave(this._arenaWaveNum, {
      elapsedSec: this._arenaElapsed,
    });

    const player = this.engine.player;
    for (const slime of wave.enemies) {
      // 플레이어 주변 300~500px 반경에 랜덤 배치
      const angle = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 200;
      slime.x = player.x + Math.cos(angle) * dist;
      slime.y = player.y + Math.sin(angle) * dist;
      slime.alive = true;
      // _drawSlime 호환 필드 보장
      if (slime.bounceY == null) slime.bounceY = 0;
      if (slime.bobPhase == null) slime.bobPhase = Math.random() * Math.PI * 2;
      if (slime.radius == null) slime.radius = (slime.size || 1) * 10;
      if (!slime.color) slime.color = '#ff69b4';

      this._arenaSlimes.push(slime);

      // engine.enemies에 등록 (투사체 충돌용)
      if (this.engine.enemies) {
        this.engine.enemies.push(slime);
      }
    }
  }

  // ── 슬라임 이동 + 접촉 데미지 ──
  _updateArenaSlimes(dt) {
    const player = this.engine.player;

    for (let i = this._arenaSlimes.length - 1; i >= 0; i--) {
      const s = this._arenaSlimes[i];

      // 사망 체크
      const hp = s.currentHp !== undefined ? s.currentHp : s.hp;
      if (hp <= 0 || !s.alive) {
        this._arenaSlimes.splice(i, 1);
        continue;
      }

      // 플레이어 방향으로 이동
      const dx = player.x - s.x;
      const dy = player.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const spd = (s.speed || 1.5) * (dt / 16);
      if (dist > 25) {
        s.x += (dx / dist) * spd;
        s.y += (dy / dist) * spd;
      }

      // bounce 애니메이션
      s.bouncePhase = (s.bouncePhase || 0) + dt * 0.005;

      // 접촉 데미지
      if (dist < 25) {
        if (!s._contactTimer) s._contactTimer = 0;
        s._contactTimer += dt;
        if (s._contactTimer >= 1000) {
          s._contactTimer = 0;
          const dmg = s.atk || s.attack || 5;
          if (this.engine._damagePlayer) {
            this.engine._damagePlayer(dmg);
          }
        }
      }
    }
  }

  // ── 잔여 슬라임 일괄 제거 (engine.enemies에서도 제거) ──
  _clearArenaSlimes() {
    if (this.engine.enemies) {
      for (const s of this._arenaSlimes) {
        const idx = this.engine.enemies.indexOf(s);
        if (idx !== -1) this.engine.enemies.splice(idx, 1);
      }
    }
    this._arenaSlimes = [];
  }

  // ── 아레나 웨이브 상태 초기화 ──
  _resetArenaWaves() {
    this._arenaWaveNum = 0;
    this._arenaWaveTimer = 0;
    this._arenaSlimes = [];
    this._arenaElapsed = 0;
    this._arenaFirstWaveFired = false;
  }

  // ── 보스방 활성 여부 ──
  isInBossRoom() {
    return this.phase === PHASE.DORMANT ||
           this.phase === PHASE.AWAKENING ||
           this.phase === PHASE.ACTIVE ||
           this.phase === PHASE.VICTORY;
  }

  // ── Canvas 렌더링 ──
  draw(ctx, camera) {
    if (!this.enabled) return;

    switch (this.phase) {
      case PHASE.GATE_ACTIVE:
        this._drawGate(ctx, camera);
        break;

      case PHASE.ENTERING:
        this._drawTransition(ctx);
        break;

      case PHASE.DORMANT:
      case PHASE.AWAKENING:
      case PHASE.ACTIVE:
      case PHASE.VICTORY:
        this._drawArena(ctx);
        this._drawBoss(ctx);
        // 오버레이(HP바, 텍스트)는 drawOverlays()에서 HUD 위에 렌더링
        break;
    }
  }

  /**
   * HUD 위에 그려야 하는 오버레이들 (보스 HP바, 깨어남/승리 연출).
   */
  drawOverlays(ctx) {
    if (!this.enabled) return;
    if (!this.isInBossRoom()) return;

    if (this._bossHpBarVisible || this.phase === PHASE.ACTIVE) {
      this._drawBossHpBar(ctx);
    }
    if (this.phase === PHASE.AWAKENING) {
      this._drawAwakeningOverlay(ctx);
    }
    if (this.phase === PHASE.VICTORY) {
      this._drawVictoryOverlay(ctx);
    }
  }

  // ── 게이트 렌더링 ──
  _drawGate(ctx, camera) {
    const gx = this.gate.x - camera.x;
    const gy = this.gate.y - camera.y;
    const gateConf = BOSS_ROOM_CONFIG.gate;
    const style = this.gate.active ? gateConf.activeStyle : gateConf.inactiveStyle;

    ctx.save();
    ctx.globalAlpha = style.opacity;

    // 게이트 글로우
    if (style.glow) {
      const pulse = 0.6 + Math.sin(this.gate.pulsePhase) * 0.4;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 60);
      grad.addColorStop(0, style.glow);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = pulse * 0.5;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = style.opacity;
    }

    // 게이트 이모지
    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gateConf.emoji, gx, gy);

    // 라벨
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
    ctx.fillText(style.label, gx, gy + 35);

    ctx.restore();
  }

  // ── 진입 전환 연출 ──
  _drawTransition(ctx) {
    const t = Math.min(1, this.phaseTimer / 500);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${t})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  // ── 아레나 배경 렌더링 (카메라 스크롤 + 뷰포트 컬링) ──
  _drawArena(ctx) {
    if (!this.arena) return;
    ctx.save();
    // 전맵 크기 아레나 — 카메라 오프셋으로 스크롤
    const cam = this.engine.camera;
    ctx.translate(-cam.x, -cam.y);
    // 카메라 뷰포트만 렌더링 (성능 최적화)
    const viewport = { x: cam.x, y: cam.y, w: this.engine.W, h: this.engine.H };
    this.arena.render(ctx, viewport);

    // 슬라임 렌더링
    for (const s of this._arenaSlimes) {
      const hp = s.currentHp !== undefined ? s.currentHp : s.hp;
      if (hp <= 0) continue;
      const bounce = Math.abs(Math.sin(s.bouncePhase || 0)) * 4;
      const size = (s.size || 1) * 18;
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji || '\uD83E\uDEB7', s.x, s.y - bounce);
    }

    ctx.restore();
  }

  // ── 보스 렌더링 (카메라 스크롤) ──
  _drawBoss(ctx) {
    if (!this.boss) return;
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    if (bossHp <= 0 && this.phase !== PHASE.VICTORY) return;

    const cam = this.engine.camera;
    const sx = this.boss.x - cam.x;
    const sy = this.boss.y - cam.y;
    const bossSize = (this.boss.size || 3) * 14;

    ctx.save();

    // 보스 본체
    const fontSize = bossSize;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 깨어남 중이면 깜빡임
    if (this.phase === PHASE.AWAKENING && this._awakeningStep < 3) {
      ctx.globalAlpha = 0.3 + Math.sin(this.phaseTimer * 0.01) * 0.3;
    }

    // 승리 시 폭발
    if (this.phase === PHASE.VICTORY) {
      const t = Math.min(1, this.phaseTimer / 1500);
      ctx.globalAlpha = 1 - t;
      const vScale = 1 + t * 0.5;
      ctx.translate(sx, sy);
      ctx.scale(vScale, vScale);
      ctx.fillText(this.boss.emoji, 0, 0);
    } else {
      ctx.fillText(this.boss.emoji, sx, sy);
    }

    ctx.restore();
  }

  // ── 보스 HP바 (상단 고정) ──
  _drawBossHpBar(ctx) {
    if (!this.boss) return;
    const conf = BOSS_ROOM_CONFIG.bossHpBar;
    const W = ctx.canvas.width;
    const barW = W * 0.6;
    const barX = (W - barW) / 2;
    const barY = conf.margin;

    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    const hpRatio = Math.max(0, bossHp / this.bossMaxHp);

    // 색상 결정
    let barColor = '#22c55e';
    let label = '';
    for (const phase of conf.colorPhases) {
      if (hpRatio >= phase.threshold) {
        barColor = phase.color;
        label = phase.label;
        break;
      }
    }

    ctx.save();

    // 배경
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 4, barY - 4, barW + 8, conf.height + 8);

    // HP 바
    ctx.fillStyle = 'rgba(30,30,50,0.9)';
    ctx.fillRect(barX, barY, barW, conf.height);
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * hpRatio, conf.height);

    // 보스 이름
    if (conf.showName && this.boss.name) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameText = conf.showEmoji
        ? `${this.boss.emoji} ${this.boss.name}`
        : this.boss.name;
      ctx.fillText(nameText, W / 2, barY + conf.height / 2);
    }

    // 분노 라벨
    if (label) {
      ctx.fillStyle = barColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(label, barX + barW, barY - 2);
    }

    ctx.restore();
  }

  // ── 깨어남 오버레이 ──
  _drawAwakeningOverlay(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // 포효 시 화면 흔들림 처리는 engine에서

    // 포효 시 붉은 플래시
    if (this._awakeningStep >= 3 && this._awakeningStep < 4) {
      const t = (this.phaseTimer - 1000) / 500;
      if (t > 0 && t < 1) {
        ctx.save();
        ctx.fillStyle = `rgba(255,100,100,${0.3 * (1 - t)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // "보스 출현!" 텍스트 — 실시간 자막 비활성화
  }

  // ── 승리 오버레이 ──
  _drawVictoryOverlay(ctx) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const t = Math.min(1, this.phaseTimer / 2000);

    ctx.save();

    // 밝아지는 효과
    if (t > 0.3) {
      ctx.fillStyle = `rgba(255,248,184,${(t - 0.3) * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }

    // "승리!" 텍스트 — 실시간 자막 비활성화
    if (false) {
    }

    ctx.restore();
  }
}
