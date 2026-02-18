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
import { BOSS_ROOM_CONFIG } from '../data/combat-config.js';

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
  }

  // ── 게이트 위치 설정 (맵 우측 끝) ──
  setGatePosition(mapW, mapH) {
    this.gate.x = mapW - 100;
    this.gate.y = mapH / 2;
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

    // 아레나 생성
    const theme = this.config.theme || 'fairy_garden';
    const arenaConf = BOSS_ROOM_CONFIG.arena;
    this.arena = new BattleArena(theme, {
      width: arenaConf.width,
      height: arenaConf.height,
    });

    // 보스 생성 (비활성 상태)
    const bossType = this.config.bossType;
    const bossDef = ARENA_BOSSES[bossType];
    if (bossDef) {
      this.boss = this.arena.spawnBoss(bossType);
      this.bossMaxHp = this.boss.maxHp;
    } else {
      // ARENA_BOSSES에 없으면 기본 enemy.js 보스 사용
      this.boss = {
        id: `boss_${Date.now()}`,
        name: bossType,
        emoji: '👹',
        currentHp: 300,
        maxHp: 300,
        hp: 300,
        atk: 20,
        def: 10,
        speed: 1.5,
        size: 3,
        x: arenaConf.width * 0.7,
        y: arenaConf.height * 0.4,
        alive: true,
        currentPhase: 0,
        patterns: [],
        phases: [],
      };
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
        // 보스 HP 체크
        if (this.boss && (this.boss.currentHp || this.boss.hp) <= 0) {
          this.phase = PHASE.VICTORY;
          this.phaseTimer = 0;
          this.boss.alive = false;
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

    // 보스 이동 (플레이어 방향)
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spd = (boss.speed || 1.5) * (boss._spdMult || 1) * (dt / 16) * 0.6;
    if (dist > 50) {
      boss.x += (dx / dist) * spd;
      boss.y += (dy / dist) * spd;
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
        if (this._bossHpBarVisible || this.phase === PHASE.ACTIVE) {
          this._drawBossHpBar(ctx);
        }
        if (this.phase === PHASE.AWAKENING) {
          this._drawAwakeningOverlay(ctx);
        }
        if (this.phase === PHASE.VICTORY) {
          this._drawVictoryOverlay(ctx);
        }
        break;
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

  // ── 아레나 배경 렌더링 ──
  _drawArena(ctx) {
    if (!this.arena) return;
    ctx.save();
    // 아레나를 캔버스에 맞춰 스케일
    const scaleX = ctx.canvas.width / this.arena.width;
    const scaleY = ctx.canvas.height / this.arena.height;
    const scale = Math.min(scaleX, scaleY);
    ctx.scale(scale, scale);
    this.arena.render(ctx);
    ctx.restore();
  }

  // ── 보스 렌더링 ──
  _drawBoss(ctx) {
    if (!this.boss) return;
    const bossHp = this.boss.currentHp !== undefined ? this.boss.currentHp : this.boss.hp;
    if (bossHp <= 0 && this.phase !== PHASE.VICTORY) return;

    const scaleX = ctx.canvas.width / (this.arena ? this.arena.width : 800);
    const scaleY = ctx.canvas.height / (this.arena ? this.arena.height : 600);
    const scale = Math.min(scaleX, scaleY);
    const sx = this.boss.x * scale;
    const sy = this.boss.y * scale;
    const bossSize = (this.boss.size || 3) * 14;

    ctx.save();

    // 보스 본체
    const fontSize = bossSize * scale;
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

    // "보스 출현!" 텍스트
    if (this._awakeningStep >= 2) {
      ctx.save();
      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,0,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText(`${this.boss?.emoji || '👹'} ${this.boss?.name || '보스'} 출현!`, W / 2, H * 0.3);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
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

    // "승리!" 텍스트
    if (t > 0.5) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 28px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(251,191,36,0.6)';
      ctx.shadowBlur = 15;
      ctx.fillText('🎉 보스 처치!', W / 2, H * 0.4);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
