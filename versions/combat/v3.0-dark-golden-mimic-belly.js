/**
 * GoldenMimicBelly — 황금 미믹 뱃속 미니게임
 *
 * 미믹이 영웅을 잡아먹은 후 진입하는 특별 이벤트 씬.
 * - 미믹 뱃속 테마 미니맵 (분홍+금색 내장 테마)
 * - 보상: 골드, 장비 등이 맵에 흩어져 있음
 * - 아기 황금 미믹 5~10마리 사냥 미니게임
 * - 5분(300초) 타이머 → 시간 초과 시 자동 탈출
 *
 * CombatEngine에서 인스턴스 생성 → update(dt)/draw(ctx) 호출
 */

// ── 아기 미믹 타입 ──
const BABY_MIMIC_TYPES = [
  { name: '꼬마 미믹', color: '#FFD700', size: 0.8, hp: 3, speed: 1.5, gold: 30, emoji: '🏆' },
  { name: '은빛 미믹', color: '#C0C0C0', size: 0.7, hp: 2, speed: 2.0, gold: 20, emoji: '🥈' },
  { name: '루비 미믹', color: '#FF4444', size: 0.9, hp: 4, speed: 1.2, gold: 40, emoji: '🔴' },
  { name: '에메랄드 미믹', color: '#44FF88', size: 0.75, hp: 3, speed: 1.8, gold: 35, emoji: '💚' },
  { name: '다이아 미믹', color: '#88CCFF', size: 1.0, hp: 5, speed: 1.0, gold: 50, emoji: '💎' },
];

// ── 등급 시스템 (5단계) ──
const BELLY_RARITIES = [
  { name: 'Common',    label: '커먼',   color: '#aaaaaa', glow: 0,  weight: 35, goldMul: 1,   statMul: 1.0 },
  { name: 'Rare',      label: '레어',   color: '#3b82f6', glow: 5,  weight: 28, goldMul: 2,   statMul: 1.3 },
  { name: 'Epic',      label: '에픽',   color: '#a855f7', glow: 10, weight: 20, goldMul: 4,   statMul: 1.7 },
  { name: 'Legendary', label: '레전드', color: '#f59e0b', glow: 16, weight: 12, goldMul: 8,   statMul: 2.5 },
  { name: 'Mythic',    label: '신화',   color: '#ef4444', glow: 22, weight: 5,  goldMul: 15,  statMul: 4.0 },
];
const _rarityTotalW = BELLY_RARITIES.reduce((s, r) => s + r.weight, 0);
function _pickRarity() {
  let roll = Math.random() * _rarityTotalW;
  for (const r of BELLY_RARITIES) {
    roll -= r.weight;
    if (roll <= 0) return r;
  }
  return BELLY_RARITIES[0];
}

// ── 보상 아이템 타입 ──
const BELLY_REWARDS = [
  { type: 'gold',    emoji: '💰', baseValue: 50,  weight: 30 },
  { type: 'gold',    emoji: '💰', baseValue: 100, weight: 15 },
  { type: 'gold',    emoji: '💎', baseValue: 200, weight: 5 },
  { type: 'upgrade', emoji: '⚔️', id: 'atk_boost',     weight: 8 },
  { type: 'upgrade', emoji: '🛡️', id: 'shield',        weight: 8 },
  { type: 'upgrade', emoji: '💥', id: 'crit_rate',     weight: 6 },
  { type: 'upgrade', emoji: '🔥', id: 'crit_dmg',      weight: 5 },
  { type: 'upgrade', emoji: '👟', id: 'speed_up',      weight: 7 },
  { type: 'upgrade', emoji: '🔴', id: 'fast_attack',   weight: 8 },
  { type: 'upgrade', emoji: '🟠', id: 'strong_attack', weight: 6 },
  { type: 'upgrade', emoji: '🟢', id: 'double_shot',   weight: 4 },
  { type: 'heal',    emoji: '❤️', baseValue: 0.3, weight: 10 },
];

const BELLY_DURATION = 240000; // 4분

export default class GoldenMimicBelly {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.W = canvas.width;
    this.H = canvas.height;
    this.stageLevel = options.stageLevel || 1;
    this.onComplete = options.onComplete || (() => {});

    // 미니맵 크기 (화면의 80%)
    this.mapW = this.W * 3;
    this.mapH = this.H * 3;

    // 플레이어
    this.player = {
      x: this.mapW / 2,
      y: this.mapH / 2,
      speed: (options.playerStats?.speed || 3) * 1.2,
      attack: options.playerStats?.attack || 12,
      defense: options.playerStats?.defense || 7,
      maxHp: options.playerStats?.maxHp || 250,
      hp: options.playerStats?.hp || 250,
      radius: 12,
      bobPhase: 0,
      atkTimer: 0,
      atkSpeed: 600, // ms
    };

    // 카메라
    this.camera = { x: 0, y: 0 };

    // 타이머
    this.timer = BELLY_DURATION;
    this.running = false;
    this._elapsed = 0;

    // 키 입력 — CombatEngine의 _keys 공유 (이벤트 충돌 방지)
    this._keys = options.sharedKeys || {};
    this._touchDir = options.sharedTouchDir || { x: 0, y: 0 };

    // 아기 미믹
    this.babyMimics = [];
    this._spawnBabyMimics();

    // 맵 보상 아이템
    this.rewardItems = [];
    this._scatterRewards();

    // 수집한 보상
    this.collectedGold = 0;
    this.collectedUpgrades = [];
    this.collectedHp = 0;
    this.killCount = 0;

    // 투사체
    this.projectiles = [];
    this.particles = [];

    // 배경 장식 (내장 벽 등)
    this._bgDecor = this._generateBellyDecor();

    // 진입 연출
    this._introTimer = 1500; // 1.5초 인트로
    this._outroTimer = 0;
    this._exiting = false;

    // 입력: CombatEngine _keys 공유 시 별도 바인딩 불필요
    if (!options.sharedKeys) {
      this._bindInput();
    }
  }

  _spawnBabyMimics() {
    const count = 5 + Math.floor(Math.random() * 6); // 5~10
    for (let i = 0; i < count; i++) {
      const type = BABY_MIMIC_TYPES[Math.floor(Math.random() * BABY_MIMIC_TYPES.length)];
      const margin = 80;
      this.babyMimics.push({
        x: margin + Math.random() * (this.mapW - margin * 2),
        y: margin + Math.random() * (this.mapH - margin * 2),
        type: type.name,
        color: type.color,
        emoji: type.emoji,
        size: type.size,
        radius: 10 * type.size,
        hp: type.hp + Math.floor(this.stageLevel * 0.5),
        maxHp: type.hp + Math.floor(this.stageLevel * 0.5),
        speed: type.speed,
        gold: type.gold * (1 + this.stageLevel * 0.1),
        bobPhase: Math.random() * Math.PI * 2,
        direction: Math.random() * Math.PI * 2,
        changeTimer: 0,
        fleeing: false,
      });
    }
  }

  _scatterRewards() {
    // 20~35개 보상 아이템 배치 — 각각 랜덤 등급
    const count = 20 + Math.floor(Math.random() * 16);
    const totalWeight = BELLY_REWARDS.reduce((s, r) => s + r.weight, 0);
    const margin = 60;

    for (let i = 0; i < count; i++) {
      // 가중치 기반 랜덤 선택
      let roll = Math.random() * totalWeight;
      let reward = BELLY_REWARDS[0];
      for (const r of BELLY_REWARDS) {
        roll -= r.weight;
        if (roll <= 0) { reward = r; break; }
      }

      // 랜덤 등급 부여
      const rarity = _pickRarity();

      // 등급 적용: 골드는 배수, 힐은 배수, 업그레이드는 등급 표시
      let value = reward.baseValue || 0;
      if (reward.type === 'gold') value = Math.round(value * rarity.goldMul);
      if (reward.type === 'heal') value = Math.min(reward.baseValue * rarity.statMul, 1.0);

      this.rewardItems.push({
        x: margin + Math.random() * (this.mapW - margin * 2),
        y: margin + Math.random() * (this.mapH - margin * 2),
        type: reward.type,
        emoji: reward.emoji,
        id: reward.id || null,
        color: rarity.color,        // 등급 색상
        rarity: rarity,             // 등급 정보
        value: value,
        collected: false,
        bobPhase: Math.random() * Math.PI * 2,
        glowPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  _generateBellyDecor() {
    const decor = [];
    // 벽면 주름 (분홍색 오간 느낌)
    for (let i = 0; i < 40; i++) {
      decor.push({
        type: 'wall_fold',
        x: Math.random() * this.mapW,
        y: Math.random() * this.mapH,
        size: 30 + Math.random() * 50,
        rotation: Math.random() * Math.PI * 2,
        alpha: 0.05 + Math.random() * 0.08,
      });
    }
    // 금화 더미
    for (let i = 0; i < 15; i++) {
      decor.push({
        type: 'gold_pile',
        x: Math.random() * this.mapW,
        y: Math.random() * this.mapH,
        size: 20 + Math.random() * 30,
      });
    }
    return decor;
  }

  start() {
    this.running = true;
  }

  update(dt) {
    if (!this.running) return;

    // 인트로 카운트다운
    if (this._introTimer > 0) {
      this._introTimer -= dt;
      return;
    }

    // 탈출 연출
    if (this._exiting) {
      this._outroTimer += dt;
      if (this._outroTimer >= 2000) {
        this._finish();
      }
      return;
    }

    // 타이머
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0;
      this._startExit();
      return;
    }

    this._elapsed += dt;

    // 플레이어 이동
    this._updatePlayer(dt);

    // 카메라
    this.camera.x = this.player.x - this.W / 2;
    this.camera.y = this.player.y - this.H / 2;
    this.camera.x = Math.max(0, Math.min(this.mapW - this.W, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.mapH - this.H, this.camera.y));

    // 아기 미믹 AI
    this._updateBabyMimics(dt);

    // 자동 공격
    this._updateAutoAttack(dt);

    // 투사체
    this._updateProjectiles(dt);

    // 보상 아이템 수집 (근접)
    this._collectNearbyRewards();

    // 파티클
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      return p.life > 0;
    });
  }

  _updatePlayer(dt) {
    const spd = this.player.speed * (dt / 16);
    let mx = 0, my = 0;

    if (this._keys['d'] || this._keys['arrowright']) mx += 1;
    if (this._keys['a'] || this._keys['arrowleft']) mx -= 1;
    if (this._keys['s'] || this._keys['arrowdown']) my += 1;
    if (this._keys['w'] || this._keys['arrowup']) my -= 1;
    mx += this._touchDir.x;
    my += this._touchDir.y;

    // 정규화
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }

    this.player.x += mx * spd;
    this.player.y += my * spd;
    this.player.x = Math.max(16, Math.min(this.mapW - 16, this.player.x));
    this.player.y = Math.max(16, Math.min(this.mapH - 16, this.player.y));
    this.player.bobPhase += dt * 0.004;
  }

  _updateBabyMimics(dt) {
    const spd = dt / 16;
    for (const m of this.babyMimics) {
      m.bobPhase += dt * 0.005;

      // 플레이어와의 거리
      const dx = this.player.x - m.x;
      const dy = this.player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 도망 판정: 플레이어가 가까우면 도망
      if (dist < 120) {
        m.fleeing = true;
        m.direction = Math.atan2(-dy, -dx); // 반대 방향
      } else if (dist > 200) {
        m.fleeing = false;
      }

      // 방향 변경 타이머
      m.changeTimer -= dt;
      if (m.changeTimer <= 0 && !m.fleeing) {
        m.direction += (Math.random() - 0.5) * Math.PI;
        m.changeTimer = 1000 + Math.random() * 2000;
      }

      // 이동
      const moveSpd = m.speed * spd * (m.fleeing ? 1.8 : 1);
      m.x += Math.cos(m.direction) * moveSpd;
      m.y += Math.sin(m.direction) * moveSpd;

      // 경계 반사
      if (m.x < 20 || m.x > this.mapW - 20) {
        m.direction = Math.PI - m.direction;
        m.x = Math.max(20, Math.min(this.mapW - 20, m.x));
      }
      if (m.y < 20 || m.y > this.mapH - 20) {
        m.direction = -m.direction;
        m.y = Math.max(20, Math.min(this.mapH - 20, m.y));
      }
    }
  }

  _updateAutoAttack(dt) {
    this.player.atkTimer -= dt;
    if (this.player.atkTimer > 0) return;

    // 가장 가까운 미믹 찾기
    let nearest = null, minDist = Infinity;
    for (const m of this.babyMimics) {
      const d = Math.sqrt((m.x - this.player.x) ** 2 + (m.y - this.player.y) ** 2);
      if (d < 200 && d < minDist) {
        nearest = m;
        minDist = d;
      }
    }
    if (!nearest) return;

    this.player.atkTimer = this.player.atkSpeed;
    const angle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);

    this.projectiles.push({
      x: this.player.x,
      y: this.player.y,
      vx: Math.cos(angle) * 5,
      vy: Math.sin(angle) * 5,
      radius: 4,
      damage: this.player.attack,
      life: 2000,
      emoji: '⚡',
      color: '#FFD700',
    });
  }

  _updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(p => {
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt;
      if (p.life <= 0) return false;

      // 미믹 충돌 체크
      for (let i = this.babyMimics.length - 1; i >= 0; i--) {
        const m = this.babyMimics[i];
        const dx = p.x - m.x, dy = p.y - m.y;
        if (dx * dx + dy * dy < (p.radius + m.radius) ** 2) {
          m.hp--;
          // 히트 파티클
          for (let j = 0; j < 4; j++) {
            this.particles.push({
              x: m.x, y: m.y,
              vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
              life: 500, color: m.color, size: 2 + Math.random() * 2,
            });
          }
          if (m.hp <= 0) {
            this._onBabyMimicDeath(m, i);
          }
          return false; // 투사체 소멸
        }
      }
      return true;
    });
  }

  _onBabyMimicDeath(mimic, index) {
    this.babyMimics.splice(index, 1);
    this.killCount++;
    this.collectedGold += Math.round(mimic.gold);

    // 처치 파티클
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: mimic.x, y: mimic.y,
        vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        life: 800, color: i % 2 === 0 ? '#FFD700' : mimic.color,
        size: 3 + Math.random() * 2,
      });
    }

    // 전부 처치 시 탈출
    if (this.babyMimics.length === 0) {
      // 보너스 시간: 남은 시간 동안 보상 수집 가능 (바로 끝내지 않음)
    }
  }

  _collectNearbyRewards() {
    const collectR = 30;
    for (const item of this.rewardItems) {
      if (item.collected) continue;
      const dx = this.player.x - item.x;
      const dy = this.player.y - item.y;
      if (dx * dx + dy * dy < collectR * collectR) {
        item.collected = true;
        if (item.type === 'gold') {
          this.collectedGold += item.value;
        } else if (item.type === 'upgrade') {
          this.collectedUpgrades.push(item.id);
        } else if (item.type === 'heal') {
          this.collectedHp += Math.round(this.player.maxHp * item.value);
        }
        // 수집 파티클
        for (let i = 0; i < 6; i++) {
          this.particles.push({
            x: item.x, y: item.y,
            vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2,
            life: 600, color: item.color, size: 2 + Math.random() * 2,
          });
        }
      }
    }
  }

  _startExit() {
    this._exiting = true;
    this._outroTimer = 0;
  }

  _finish() {
    this.running = false;
    if (this._onKeyDown) this._unbindInput();
    this.onComplete({
      gold: this.collectedGold,
      upgrades: this.collectedUpgrades,
      hp: this.collectedHp,
      kills: this.killCount,
    });
  }

  // ══════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════

  draw(ctx) {
    const W = this.W, H = this.H;
    ctx.save();

    // ── 인트로 연출 ──
    if (this._introTimer > 0) {
      this._drawIntro(ctx);
      ctx.restore();
      return;
    }

    // ── 탈출 연출 ──
    if (this._exiting) {
      this._drawOutro(ctx);
      ctx.restore();
      return;
    }

    const cx = this.camera.x;
    const cy = this.camera.y;

    // ── 배경: 미믹 뱃속 테마 ──
    this._drawBellyBackground(ctx, cx, cy);

    // ── 장식 ──
    this._drawDecor(ctx, cx, cy);

    // ── 보상 아이템 ──
    this._drawRewardItems(ctx, cx, cy);

    // ── 아기 미믹 ──
    this._drawBabyMimics(ctx, cx, cy);

    // ── 투사체 ──
    this._drawProjectiles(ctx, cx, cy);

    // ── 플레이어 ──
    this._drawPlayer(ctx, cx, cy);

    // ── 파티클 ──
    this._drawParticles(ctx, cx, cy);

    // ── HUD ──
    this._drawBellyHUD(ctx);

    // ── 미니맵 ──
    this._drawMinimap(ctx);

    ctx.restore();
  }

  _drawBellyBackground(ctx, cx, cy) {
    const W = this.W, H = this.H;
    const t = Date.now() * 0.001;

    // 어두운 붉은/분홍 배경 (미믹 내장)
    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
    bgGrad.addColorStop(0, '#3a1520');
    bgGrad.addColorStop(0.5, '#2a0e18');
    bgGrad.addColorStop(1, '#1a0810');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 맥동하는 벽면 효과
    const pulse = Math.sin(t * 1.5) * 0.03;
    ctx.fillStyle = `rgba(180,40,60,${0.04 + pulse})`;
    for (let i = 0; i < 8; i++) {
      const wx = (Math.sin(t * 0.3 + i * 0.8) * W * 0.4 + W / 2) - cx * 0.1;
      const wy = (Math.cos(t * 0.2 + i * 1.1) * H * 0.4 + H / 2) - cy * 0.1;
      ctx.beginPath();
      ctx.ellipse(wx, wy, 80 + Math.sin(t + i) * 20, 60 + Math.cos(t + i) * 15, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 금빛 반짝이 (보물이 가득한 뱃속)
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 20; i++) {
      const sparkX = ((i * 137.5 + t * 10) % W);
      const sparkY = ((i * 97.3 + t * 8) % H);
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1 + Math.sin(t * 2 + i) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawDecor(ctx, cx, cy) {
    const t = Date.now() * 0.001;
    for (const d of this._bgDecor) {
      const sx = d.x - cx;
      const sy = d.y - cy;
      if (sx < -80 || sx > this.W + 80 || sy < -80 || sy > this.H + 80) continue;

      if (d.type === 'wall_fold') {
        ctx.globalAlpha = d.alpha + Math.sin(t * 0.8 + d.rotation) * 0.02;
        ctx.fillStyle = '#8a3050';
        ctx.beginPath();
        ctx.ellipse(sx, sy, d.size, d.size * 0.4, d.rotation, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (d.type === 'gold_pile') {
        ctx.globalAlpha = 0.3;
        ctx.font = `${Math.round(d.size * 0.5)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💰', sx, sy);
        ctx.globalAlpha = 1;
      }
    }
  }

  _drawRewardItems(ctx, cx, cy) {
    const t = Date.now() * 0.001;
    for (const item of this.rewardItems) {
      if (item.collected) continue;
      const sx = item.x - cx;
      const sy = item.y - cy;
      if (sx < -30 || sx > this.W + 30 || sy < -30 || sy > this.H + 30) continue;

      item.bobPhase += 0.03;
      item.glowPhase += 0.02;
      const bob = Math.sin(item.bobPhase) * 3;
      const r = item.rarity;

      // 등급별 글로우
      ctx.shadowColor = r.color;
      ctx.shadowBlur = (r.glow || 4) + Math.sin(item.glowPhase) * 3;

      // 에픽 이상: 바닥 빛 원
      if (r.glow >= 10) {
        ctx.globalAlpha = 0.12 + Math.sin(item.glowPhase) * 0.05;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(sx, sy + 6, 14 + r.glow * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 이모지
      const fontSize = r.glow >= 16 ? 20 : r.glow >= 10 ? 18 : 16;
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.emoji, sx, sy + bob);
      ctx.shadowBlur = 0;

      // 등급 라벨 (레어 이상)
      if (r.glow > 0) {
        ctx.font = 'bold 8px "Noto Sans KR", sans-serif';
        ctx.fillStyle = r.color;
        ctx.fillText(r.label, sx, sy + bob + 14);
      }
    }
  }

  _drawBabyMimics(ctx, cx, cy) {
    const t = Date.now() * 0.001;
    for (const m of this.babyMimics) {
      const sx = m.x - cx;
      const sy = m.y - cy;
      if (sx < -40 || sx > this.W + 40 || sy < -40 || sy > this.H + 40) continue;

      const bounce = Math.abs(Math.sin(m.bobPhase));
      const squishX = 1 + bounce * 0.1;
      const squishY = 1 - bounce * 0.06;
      const r = m.radius;

      ctx.save();

      // 금빛 글로우
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 6 + Math.sin(t * 3 + m.bobPhase) * 3;

      // 몸체
      const bodyGrad = ctx.createRadialGradient(
        sx - r * 0.15, sy - r * 0.2, r * 0.1,
        sx, sy, r * squishX
      );
      bodyGrad.addColorStop(0, _lightenBellyColor(m.color, 40));
      bodyGrad.addColorStop(0.5, m.color);
      bodyGrad.addColorStop(1, _darkenBellyColor(m.color, 30));
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * squishX, r * squishY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 눈
      const eyeR = r * 0.2;
      const eyeY = sy - r * 0.1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(sx - r * 0.2, eyeY, eyeR, eyeR * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + r * 0.2, eyeY, eyeR, eyeR * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // 동공
      ctx.fillStyle = '#1a1a2e';
      const lookAngle = Math.atan2(this.player.y - m.y, this.player.x - m.x);
      const pOx = Math.cos(lookAngle) * r * 0.04;
      const pOy = Math.sin(lookAngle) * r * 0.04;
      ctx.beginPath();
      ctx.arc(sx - r * 0.2 + pOx, eyeY + pOy, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + r * 0.2 + pOx, eyeY + pOy, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 도망 중 표시
      if (m.fleeing) {
        ctx.font = `${Math.round(r * 0.5)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('💦', sx + r, sy - r);
      }

      // HP 바
      if (m.hp < m.maxHp) {
        const barW = r * 2;
        const barH = 3;
        const barY = sy - r - 6;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sx - barW / 2, barY, barW, barH);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(sx - barW / 2, barY, barW * Math.max(0, m.hp / m.maxHp), barH);
      }

      ctx.restore();
    }
  }

  _drawProjectiles(ctx, cx, cy) {
    for (const p of this.projectiles) {
      const sx = p.x - cx;
      const sy = p.y - cy;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.font = `${p.radius * 3}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, sx, sy);
      ctx.shadowBlur = 0;
    }
  }

  _drawPlayer(ctx, cx, cy) {
    const p = this.player;
    const sx = p.x - cx;
    const sy = p.y - cy;
    const bob = Math.sin(p.bobPhase) * 2;

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 12, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 영웅
    ctx.font = '22px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#88CCFF';
    ctx.shadowBlur = 8;
    ctx.fillText('🧚', sx, sy + bob);
    ctx.shadowBlur = 0;
  }

  _drawParticles(ctx, cx, cy) {
    for (const p of this.particles) {
      const sx = p.x - cx;
      const sy = p.y - cy;
      const alpha = Math.max(0, p.life / 800);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawBellyHUD(ctx) {
    const W = this.W, H = this.H;
    const pad = 10;

    // 상단 중앙: 타이머
    const sec = Math.ceil(this.timer / 1000);
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    const timeStr = `${min}:${s.toString().padStart(2, '0')}`;
    const timeColor = sec <= 30 ? '#ff6b6b' : sec <= 60 ? '#fbbf24' : '#fff';

    // 타이머 배경
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this._roundRect(ctx, W / 2 - 40, pad, 80, 22, 6);
    ctx.fill();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = timeColor;
    ctx.fillText(`⏰ ${timeStr}`, W / 2, pad + 14);

    // 왼쪽 상단: 보상 카운터
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this._roundRect(ctx, pad, pad, 120, 42, 6);
    ctx.fill();
    ctx.font = '11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`💰 ${this.collectedGold}G`, pad + 6, pad + 14);
    ctx.fillStyle = '#86efac';
    ctx.fillText(`🏆 처치: ${this.killCount}/${this.killCount + this.babyMimics.length}`, pad + 6, pad + 30);

    // 오른쪽 상단: 미믹 뱃속 테마 표시
    ctx.fillStyle = 'rgba(40,20,0,0.7)';
    this._roundRect(ctx, W - pad - 100, pad, 100, 22, 6);
    ctx.fill();
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('🏆 미믹의 뱃속', W - pad - 50, pad + 14);

    // 수집 아이템 목록 (하단)
    if (this.collectedUpgrades.length > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this._roundRect(ctx, pad, H - pad - 22, 180, 20, 4);
      ctx.fill();
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`📦 장비 ${this.collectedUpgrades.length}개 획득!`, pad + 6, H - pad - 8);
    }
  }

  _drawMinimap(ctx) {
    const W = this.W, H = this.H;
    const mmW = 60, mmH = 60;
    const mmX = W - mmW - 10;
    const mmY = H - mmH - 10;

    // 배경
    ctx.fillStyle = 'rgba(30,10,20,0.7)';
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 1;
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    const scaleX = mmW / this.mapW;
    const scaleY = mmH / this.mapH;

    // 보상 아이템 (점)
    for (const item of this.rewardItems) {
      if (item.collected) continue;
      ctx.fillStyle = item.color;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(mmX + item.x * scaleX, mmY + item.y * scaleY, 1, 1);
    }
    ctx.globalAlpha = 1;

    // 아기 미믹 (금색 점)
    for (const m of this.babyMimics) {
      ctx.fillStyle = m.color;
      ctx.fillRect(mmX + m.x * scaleX - 1, mmY + m.y * scaleY - 1, 3, 3);
    }

    // 플레이어 (흰색 점)
    ctx.fillStyle = '#fff';
    ctx.fillRect(mmX + this.player.x * scaleX - 1, mmY + this.player.y * scaleY - 1, 3, 3);
  }

  _drawIntro(ctx) {
    const W = this.W, H = this.H;
    const progress = 1 - this._introTimer / 1500;

    // 검은 배경 → 서서히 밝아짐
    ctx.fillStyle = `rgba(0,0,0,${1 - progress * 0.7})`;
    ctx.fillRect(0, 0, W, H);

    // 텍스트
    ctx.globalAlpha = Math.min(progress * 2, 1);
    ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillText('🏆 미믹의 뱃속!', W / 2, H * 0.4);
    ctx.shadowBlur = 0;

    ctx.font = '14px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('보물을 모으고 아기 미믹을 사냥하라!', W / 2, H * 0.52);

    ctx.font = '12px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('제한시간: 5분', W / 2, H * 0.62);

    ctx.globalAlpha = 1;
  }

  _drawOutro(ctx) {
    const W = this.W, H = this.H;
    const progress = Math.min(this._outroTimer / 2000, 1);

    // 기존 화면 위에 밝아지는 오버레이
    ctx.fillStyle = `rgba(255,215,0,${progress * 0.3})`;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = `rgba(255,255,255,${progress})`;
    ctx.fillRect(0, 0, W, H);

    // 탈출 텍스트
    if (progress > 0.3) {
      ctx.globalAlpha = Math.min((progress - 0.3) / 0.5, 1);
      ctx.font = 'bold 20px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#B8860B';
      ctx.fillText('미믹의 뱃속에서 탈출!', W / 2, H * 0.4);

      ctx.font = '14px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#8B6914';
      ctx.fillText(`💰 ${this.collectedGold}G  🏆 처치 ${this.killCount}`, W / 2, H * 0.52);
      if (this.collectedUpgrades.length > 0) {
        ctx.fillText(`📦 장비 ${this.collectedUpgrades.length}개`, W / 2, H * 0.6);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── HELPERS ──
  _roundRect(ctx, x, y, w, h, r) {
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

  _bindInput() {
    this._onKeyDown = e => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this._keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // 터치
    this._onTouchStart = e => {
      const t = e.touches[0];
      this._touchStartPos = { x: t.clientX, y: t.clientY };
    };
    this._onTouchMove = e => {
      if (!this._touchStartPos) return;
      const t = e.touches[0];
      const dx = t.clientX - this._touchStartPos.x;
      const dy = t.clientY - this._touchStartPos.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 10) {
        this._touchDir = { x: dx / len, y: dy / len };
      }
    };
    this._onTouchEnd = () => {
      this._touchDir = { x: 0, y: 0 };
      this._touchStartPos = null;
    };
    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: true });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
  }

  _unbindInput() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
  }
}

// ── 색상 유틸 ──
function _lightenBellyColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

function _darkenBellyColor(hex, amount) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
}
