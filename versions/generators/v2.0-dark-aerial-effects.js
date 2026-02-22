// ============================================================
// ✨ 몽글벨 - 공중전 연출 & 스킬 이펙트 시스템 (aerial-effects.js)
// ============================================================
// 복사: monglebel/js/generators/aerial-effects.js
// ============================================================

// ─── 워프/돌진 연출 시스템 ───
export const WARP_EFFECTS = {

  // 🌟 우주 워프 (중앙만 또렷, 별빛이 길어짐)
  star_warp: {
    name: '별빛 워프',
    type: 'warp',
    duration: 1.5,  // 초
    phases: [
      // 0~0.3: 집중 (중앙 또렷, 주변 흐려짐)
      { t: [0, 0.3], effect: 'focus_zoom', centerClear: 1.0, edgeBlur: 0.8, starStretch: 0 },
      // 0.3~0.7: 워프 (별빛 늘어남, 속도감)
      { t: [0.3, 0.7], effect: 'star_stretch', centerClear: 1.0, edgeBlur: 1.0, starStretch: 1.0, speedLines: true },
      // 0.7~1.0: 도착 (플래시 + 정상 복귀)
      { t: [0.7, 1.0], effect: 'flash_arrive', flash: true, shake: true },
    ],
    starCount: 80,
    starColors: ['#ffffff', '#ffd700', '#87ceeb', '#ff69b4', '#55efc4'],
    speedLineColor: '#ffffff40',
    speedLineCount: 30,
  },

  // ⭐ 별모양 샥샥샥 공격
  star_slash: {
    name: '별 가르기',
    type: 'slash',
    duration: 0.8,
    phases: [
      { t: [0, 0.15], effect: 'dash_to_target', trail: true },
      { t: [0.15, 0.3], effect: 'star_cut_1', angle: -30, slash: '⭐' },
      { t: [0.3, 0.45], effect: 'star_cut_2', angle: 30, slash: '⭐' },
      { t: [0.45, 0.6], effect: 'star_cut_3', angle: 0, slash: '🌟' },
      { t: [0.6, 0.8], effect: 'star_explosion', particles: 20 },
    ],
    slashColor: '#ffd700',
    trailColor: '#ffeaa7',
    impactEmoji: '💫',
  },

  // 🌀 나선 돌진
  spiral_charge: {
    name: '나선 돌격',
    type: 'charge',
    duration: 1.0,
    phases: [
      { t: [0, 0.2], effect: 'spin_up', rotations: 2 },
      { t: [0.2, 0.6], effect: 'spiral_dash', speed: 15, trailType: 'spiral' },
      { t: [0.6, 1.0], effect: 'impact_burst', radius: 60, shockwave: true },
    ],
    spiralColor: '#c084fc',
    trailWidth: 8,
  },

  // 💨 순간이동 연타
  teleport_combo: {
    name: '순간이동 연타',
    type: 'teleport_attack',
    duration: 1.2,
    hits: 5,
    phases: [
      { t: [0, 0.1], effect: 'vanish', fadeOut: true },
      { t: [0.1, 0.3], effect: 'appear_slash', pos: 'right', dmgMult: 0.6 },
      { t: [0.3, 0.5], effect: 'appear_slash', pos: 'left', dmgMult: 0.6 },
      { t: [0.5, 0.7], effect: 'appear_slash', pos: 'above', dmgMult: 0.6 },
      { t: [0.7, 0.9], effect: 'appear_slash', pos: 'below', dmgMult: 0.6 },
      { t: [0.9, 1.0], effect: 'final_appear', pos: 'front', dmgMult: 1.5, flash: true },
    ],
    afterimageColor: '#a29bfe80',
    slashColor: '#ffffff',
  },
};

// ─── 속성별 스킬 이펙트 템플릿 ───
const SKILL_TEMPLATES = {
  // 투사체 계열
  projectile: {
    shapes: ['circle', 'diamond', 'star', 'arrow', 'crescent'],
    trails: ['straight', 'wavy', 'spiral', 'zigzag', 'fade'],
    impacts: ['explode', 'splash', 'shatter', 'ripple', 'flash'],
    sizes: ['tiny', 'small', 'medium', 'large', 'massive'],
  },
  // 범위 계열
  area: {
    shapes: ['circle', 'ring', 'star_pattern', 'cross', 'hexagon'],
    fills: ['solid', 'gradient', 'pulse', 'spiral_fill', 'particle_fill'],
    edges: ['smooth', 'jagged', 'flame', 'electric', 'sparkle'],
  },
  // 빔/레이저 계열
  beam: {
    widths: ['thin', 'normal', 'wide', 'massive'],
    patterns: ['straight', 'wave', 'helix', 'branch', 'pulse'],
    cores: ['solid', 'hollow', 'multi_line', 'particle_stream'],
  },
  // 근접/슬래시 계열
  melee: {
    swings: ['horizontal', 'vertical', 'diagonal', 'x_cross', 'spin_360', 'uppercut'],
    trails: ['arc', 'crescent', 'star_trail', 'flame_trail', 'ice_trail'],
    finishers: ['shockwave', 'explosion', 'impale', 'launch', 'freeze'],
  },
  // 소환 계열
  summon: {
    circles: ['magic_circle', 'rune_ring', 'star_gate', 'flower_bloom', 'void_portal'],
    animations: ['rise_up', 'fall_down', 'materialize', 'burst_out', 'grow'],
  },
  // 버프/힐 계열
  buff: {
    auras: ['glow', 'ring', 'particles', 'wings', 'armor_glow'],
    animations: ['pulse', 'rotate', 'expand', 'sparkle', 'flow_up'],
  },
};

// ─── 속성별 비주얼 설정 ───
const ELEMENT_VISUALS = {
  fire:   { colors: ['#ff6b6b','#ff4500','#ffa07a','#ffd700'], particle:'🔥', glow:'#ff4500', trailType:'flame' },
  water:  { colors: ['#74b9ff','#0984e3','#a8d8ea','#dfe6e9'], particle:'💧', glow:'#0984e3', trailType:'bubble' },
  earth:  { colors: ['#a8e6cf','#55efc4','#00b894','#deb887'], particle:'🍃', glow:'#00b894', trailType:'leaf' },
  wind:   { colors: ['#dfe6e9','#81ecec','#55efc4','#ffffff'], particle:'💨', glow:'#81ecec', trailType:'wind' },
  light:  { colors: ['#ffeaa7','#fdcb6e','#f9ca24','#ffffff'], particle:'✨', glow:'#f9ca24', trailType:'sparkle' },
  dark:   { colors: ['#a29bfe','#6c5ce7','#5f27cd','#fd79a8'], particle:'🌙', glow:'#6c5ce7', trailType:'shadow' },
  nature: { colors: ['#55efc4','#00b894','#00cec9','#ffeaa7'], particle:'🌿', glow:'#00b894', trailType:'vine' },
  ice:    { colors: ['#c7ecee','#7ed6df','#dff9fb','#ffffff'], particle:'❄️', glow:'#7ed6df', trailType:'frost' },
};

// ============================================================
// 핵심: 스킬 이펙트 자동생성기
// ============================================================
export function generateSkillEffect(options = {}) {
  const element = options.element || randomPick(Object.keys(ELEMENT_VISUALS));
  const skillType = options.skillType || randomPick(Object.keys(SKILL_TEMPLATES));
  const rarity = options.rarity || rollRarity();
  const level = options.level || 1;
  const vis = ELEMENT_VISUALS[element];
  const template = SKILL_TEMPLATES[skillType];

  const effect = {
    id: `sfx_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    name: generateSkillName(element, skillType, rarity),
    element,
    type: skillType,
    rarity,
    level,

    // 비주얼
    visual: {
      primaryColor: vis.colors[0],
      secondaryColor: vis.colors[1],
      glowColor: vis.glow,
      particleEmoji: vis.particle,
      trailType: vis.trailType,
      colors: vis.colors,
    },

    // 형태 (타입별 랜덤 선택)
    shape: generateShapeData(skillType, template, rarity),

    // 타이밍
    timing: {
      castTime: 0.2 + (5 - rarity) * 0.1,
      duration: 0.5 + rarity * 0.3,
      cooldown: Math.max(1, 8 - rarity - level * 0.2),
    },

    // 데미지 (레벨 & 레어도 기반)
    damage: {
      base: 10 + rarity * 8 + level * 2,
      multiplier: 1 + rarity * 0.15,
      critChance: 5 + rarity * 3,
      critMultiplier: 150 + rarity * 10,
    },

    // 특수 효과
    special: generateSpecialEffects(element, rarity),

    // 연출 데이터 (render 함수에서 사용)
    render: generateRenderData(skillType, element, rarity),

    // 사운드 힌트
    soundHint: getSoundHint(skillType, element),
  };

  // 레어도 5(레전더리)면 워프 연출 추가
  if (rarity >= 5) {
    effect.warpEffect = randomPick(Object.keys(WARP_EFFECTS));
    effect.hasScreenEffect = true;
  }

  // 레어도 4(에픽)이면 화면 흔들림 추가
  if (rarity >= 4) {
    effect.screenShake = { intensity: rarity * 2, duration: 0.3 };
  }

  return effect;
}

// ============================================================
// 캐릭터별 스킬셋 자동생성
// ============================================================
export function generateCharacterSkillSet(character) {
  const element = character.element || 'fire';
  const rarity = character.rarity || 1;
  const level = character.level || 1;
  const charType = character.type || 'spirit'; // spirit / fairy / hero

  const skillCount = 2 + Math.floor(rarity / 2); // 레어도에 따라 2~4개
  const skills = [];

  // 기본 공격 (항상 포함)
  skills.push(generateSkillEffect({
    element,
    skillType: 'projectile',
    rarity: Math.max(1, rarity - 1),
    level,
  }));

  // 속성 스킬
  const availableTypes = ['projectile', 'area', 'beam', 'melee', 'summon', 'buff'];
  for (let i = 1; i < skillCount; i++) {
    const type = availableTypes[i % availableTypes.length];
    skills.push(generateSkillEffect({
      element,
      skillType: type,
      rarity: Math.min(5, rarity + Math.floor(i / 2)),
      level,
    }));
  }

  // 궁극기 (레어도 3 이상)
  if (rarity >= 3) {
    const ultimate = generateSkillEffect({
      element,
      skillType: randomPick(['area', 'beam']),
      rarity: Math.min(5, rarity + 1),
      level,
    });
    ultimate.isUltimate = true;
    ultimate.timing.cooldown *= 2;
    ultimate.damage.multiplier *= 1.5;
    ultimate.warpEffect = randomPick(Object.keys(WARP_EFFECTS));
    ultimate.hasScreenEffect = true;
    ultimate.screenShake = { intensity: 8, duration: 0.5 };
    skills.push(ultimate);
  }

  return {
    characterId: character.id,
    element,
    skills,
    autoAttackIdx: 0,  // 자동 공격으로 사용할 스킬 인덱스
  };
}

// ============================================================
// Canvas 렌더링: 워프 이펙트
// ============================================================
export function renderWarpEffect(ctx, effectName, progress, canvasW, canvasH, sourceX, sourceY, targetX, targetY) {
  const warp = WARP_EFFECTS[effectName];
  if (!warp) return;

  const t = Math.max(0, Math.min(1, progress));
  ctx.save();

  // 현재 페이즈 찾기
  const phase = warp.phases.find(p => t >= p.t[0] && t < p.t[1]);
  if (!phase) { ctx.restore(); return; }

  const phaseT = (t - phase.t[0]) / (phase.t[1] - phase.t[0]);

  switch (phase.effect) {
    case 'focus_zoom':
      // 중앙만 또렷, 가장자리 어두워짐
      _renderFocusZoom(ctx, canvasW, canvasH, phaseT, phase);
      break;

    case 'star_stretch':
      // 별빛이 길어지는 워프
      _renderStarStretch(ctx, canvasW, canvasH, phaseT, warp);
      // 속도선
      if (phase.speedLines) {
        _renderSpeedLines(ctx, canvasW, canvasH, phaseT, warp);
      }
      break;

    case 'flash_arrive':
      // 플래시 + 도착
      if (phase.flash) {
        const flashAlpha = 1 - phaseT;
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.8})`;
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
      if (phase.shake) {
        const shakeX = (Math.random() - 0.5) * 10 * (1 - phaseT);
        const shakeY = (Math.random() - 0.5) * 10 * (1 - phaseT);
        ctx.translate(shakeX, shakeY);
      }
      break;

    case 'dash_to_target':
      // 대상에게 돌진
      if (phase.trail) {
        _renderDashTrail(ctx, sourceX, sourceY, targetX, targetY, phaseT, warp);
      }
      break;

    case 'star_cut_1': case 'star_cut_2': case 'star_cut_3':
      // 별 모양 베기
      _renderStarSlash(ctx, targetX, targetY, phase.angle || 0, phaseT, warp);
      break;

    case 'star_explosion':
      // 별 폭발
      _renderStarExplosion(ctx, targetX, targetY, phaseT, phase.particles || 20, warp);
      break;

    case 'spin_up':
      // 회전 충전
      _renderSpinUp(ctx, sourceX, sourceY, phaseT, phase.rotations, warp);
      break;

    case 'spiral_dash':
      // 나선 돌진
      _renderSpiralDash(ctx, sourceX, sourceY, targetX, targetY, phaseT, warp);
      break;

    case 'impact_burst':
      // 충돌 폭발
      _renderImpactBurst(ctx, targetX, targetY, phaseT, phase, warp);
      break;

    case 'vanish':
      // 사라짐
      ctx.globalAlpha = 1 - phaseT;
      break;

    case 'appear_slash':
      // 순간이동 + 베기
      _renderTeleportSlash(ctx, targetX, targetY, phase.pos, phaseT, warp);
      break;

    case 'final_appear':
      // 최종 등장
      if (phase.flash) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - phaseT) * 0.6})`;
        ctx.fillRect(0, 0, canvasW, canvasH);
      }
      break;
  }

  ctx.restore();
}

// ============================================================
// Canvas 렌더링: 스킬 이펙트
// ============================================================
export function renderSkillEffect(ctx, skill, x, y, targetX, targetY, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const vis = skill.visual;
  const render = skill.render;

  ctx.save();

  switch (skill.type) {
    case 'projectile':
      _renderProjectileSkill(ctx, skill, x, y, targetX, targetY, t);
      break;
    case 'area':
      _renderAreaSkill(ctx, skill, targetX, targetY, t);
      break;
    case 'beam':
      _renderBeamSkill(ctx, skill, x, y, targetX, targetY, t);
      break;
    case 'melee':
      _renderMeleeSkill(ctx, skill, x, y, targetX, targetY, t);
      break;
    case 'summon':
      _renderSummonSkill(ctx, skill, targetX, targetY, t);
      break;
    case 'buff':
      _renderBuffSkill(ctx, skill, x, y, t);
      break;
  }

  ctx.restore();
}

// ─── 렌더링 헬퍼들 ───

function _renderFocusZoom(ctx, w, h, t, phase) {
  const cx = w / 2, cy = h / 2;
  const blurAmount = phase.edgeBlur * t;
  const grad = ctx.createRadialGradient(cx, cy, w * 0.15, cx, cy, w * 0.6);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${blurAmount * 0.7})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function _renderStarStretch(ctx, w, h, t, warp) {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < warp.starCount; i++) {
    const angle = (i / warp.starCount) * Math.PI * 2 + i * 0.5;
    const dist = 50 + (i * 137.5) % (w * 0.5);
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const stretch = t * 40 + 2;
    const alpha = 0.3 + t * 0.5;

    ctx.strokeStyle = warp.starColors[i % warp.starColors.length];
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1 + t;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * stretch, sy + Math.sin(angle) * stretch);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function _renderSpeedLines(ctx, w, h, t, warp) {
  const cx = w / 2, cy = h / 2;
  ctx.strokeStyle = warp.speedLineColor;
  ctx.lineWidth = 1;
  for (let i = 0; i < warp.speedLineCount; i++) {
    const angle = (i / warp.speedLineCount) * Math.PI * 2;
    const innerR = 30 + t * 20;
    const outerR = innerR + 50 + t * 150;
    ctx.globalAlpha = 0.3 + t * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
    ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function _renderDashTrail(ctx, sx, sy, tx, ty, t, warp) {
  const px = sx + (tx - sx) * t;
  const py = sy + (ty - sy) * t;
  const trailLen = 5;
  for (let i = 0; i < trailLen; i++) {
    const tt = Math.max(0, t - i * 0.05);
    const trx = sx + (tx - sx) * tt;
    const try_ = sy + (ty - sy) * tt;
    ctx.globalAlpha = (1 - i / trailLen) * 0.5;
    ctx.fillStyle = warp.trailColor || '#ffeaa7';
    ctx.beginPath();
    ctx.arc(trx, try_, 8 - i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function _renderStarSlash(ctx, tx, ty, angle, t, warp) {
  const rad = angle * Math.PI / 180;
  const len = 60 * t;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(rad);

  // 베기 궤적
  ctx.strokeStyle = warp.slashColor || '#ffd700';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 1 - t * 0.3;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();

  // 별 이펙트
  ctx.font = `${20 + t * 10}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText('⭐', len * 0.5, 0);

  ctx.restore();
}

function _renderStarExplosion(ctx, tx, ty, t, count, warp) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = t * 80;
    const px = tx + Math.cos(angle) * dist;
    const py = ty + Math.sin(angle) * dist;
    const size = (1 - t) * 12;

    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = warp.slashColor || '#ffd700';
    _drawStar(ctx, px, py, size, 5);
  }

  // 중앙 💫
  ctx.globalAlpha = 1 - t;
  ctx.font = `${30 * (1 - t * 0.5)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(warp.impactEmoji || '💫', tx, ty);
  ctx.globalAlpha = 1;
}

function _renderSpinUp(ctx, x, y, t, rotations, warp) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * rotations * Math.PI * 2);

  const size = 15 + t * 10;
  ctx.strokeStyle = warp.spiralColor || '#c084fc';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5 + t * 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();

  // 에너지 파티클
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 10;
    const d = size + 5;
    ctx.fillStyle = warp.spiralColor || '#c084fc';
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _renderSpiralDash(ctx, sx, sy, tx, ty, t, warp) {
  const px = sx + (tx - sx) * t;
  const py = sy + (ty - sy) * t;
  const angle = Math.atan2(ty - sy, tx - sx);

  // 나선 궤적
  ctx.strokeStyle = warp.spiralColor || '#c084fc';
  ctx.lineWidth = warp.trailWidth || 6;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const tt = t * (i / 20);
    const trx = sx + (tx - sx) * tt;
    const try_ = sy + (ty - sy) * tt;
    const spiralR = 15 * Math.sin(tt * Math.PI * 6);
    const perpX = -Math.sin(angle) * spiralR;
    const perpY = Math.cos(angle) * spiralR;
    if (i === 0) ctx.moveTo(trx + perpX, try_ + perpY);
    else ctx.lineTo(trx + perpX, try_ + perpY);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 선두 글로우
  const grad = ctx.createRadialGradient(px, py, 0, px, py, 20);
  grad.addColorStop(0, (warp.spiralColor || '#c084fc') + 'cc');
  grad.addColorStop(1, (warp.spiralColor || '#c084fc') + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, 20, 0, Math.PI * 2);
  ctx.fill();
}

function _renderImpactBurst(ctx, tx, ty, t, phase, warp) {
  const r = (phase.radius || 60) * t;

  // 충격파
  if (phase.shockwave) {
    ctx.strokeStyle = (warp.spiralColor || '#c084fc') + '80';
    ctx.lineWidth = 3 * (1 - t);
    ctx.beginPath();
    ctx.arc(tx, ty, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 폭발 파티클
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const dist = r * 0.8;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = warp.spiralColor || '#c084fc';
    ctx.beginPath();
    ctx.arc(tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist, 4 * (1 - t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function _renderTeleportSlash(ctx, tx, ty, pos, t, warp) {
  const offsets = { right: [50, 0], left: [-50, 0], above: [0, -50], below: [0, 50], front: [0, 0] };
  const [ox, oy] = offsets[pos] || [0, 0];
  const px = tx + ox;
  const py = ty + oy;

  // 잔상
  ctx.fillStyle = warp.afterimageColor || '#a29bfe80';
  ctx.globalAlpha = 0.5 * (1 - t);
  ctx.beginPath();
  ctx.arc(px, py, 15, 0, Math.PI * 2);
  ctx.fill();

  // 슬래시
  ctx.strokeStyle = warp.slashColor || '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1 - t * 0.5;
  const slashLen = 30 * t;
  ctx.beginPath();
  ctx.moveTo(px - slashLen, py - slashLen);
  ctx.lineTo(px + slashLen, py + slashLen);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ─── 스킬 렌더링 (타입별) ───

function _renderProjectileSkill(ctx, skill, x, y, tx, ty, t) {
  const px = x + (tx - x) * t;
  const py = y + (ty - y) * t;
  const vis = skill.visual;
  const size = skill.render.projectileSize || 10;

  // 글로우
  const grad = ctx.createRadialGradient(px, py, 0, px, py, size * 2.5);
  grad.addColorStop(0, vis.glowColor + 'aa');
  grad.addColorStop(1, vis.glowColor + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 본체
  ctx.fillStyle = vis.primaryColor;
  _drawShape(ctx, px, py, size, skill.render.shape);

  // 꼬리
  const trailLen = 5;
  for (let i = 1; i <= trailLen; i++) {
    const tt = Math.max(0, t - i * 0.03);
    const trx = x + (tx - x) * tt;
    const try_ = y + (ty - y) * tt;
    ctx.globalAlpha = (1 - i / trailLen) * 0.4;
    ctx.fillStyle = vis.secondaryColor;
    ctx.beginPath();
    ctx.arc(trx, try_, size * (1 - i * 0.15), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 이모지 파티클
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.fillText(vis.particleEmoji, px + (Math.random()-0.5)*10, py + (Math.random()-0.5)*10);
}

function _renderAreaSkill(ctx, skill, tx, ty, t) {
  const vis = skill.visual;
  const radius = (skill.render.areaRadius || 60) * t;
  const alpha = 1 - t * 0.4;

  // 외곽
  ctx.strokeStyle = vis.primaryColor;
  ctx.lineWidth = 3;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(tx, ty, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 내부
  const grad = ctx.createRadialGradient(tx, ty, 0, tx, ty, radius);
  grad.addColorStop(0, vis.glowColor + '60');
  grad.addColorStop(0.6, vis.primaryColor + '30');
  grad.addColorStop(1, vis.primaryColor + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(tx, ty, radius, 0, Math.PI * 2);
  ctx.fill();

  // 파티클
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + t * 5;
    const dist = radius * 0.7;
    ctx.font = `${12 + t * 5}px serif`;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillText(vis.particleEmoji, tx + Math.cos(angle) * dist, ty + Math.sin(angle) * dist);
  }
  ctx.globalAlpha = 1;
}

function _renderBeamSkill(ctx, skill, x, y, tx, ty, t) {
  const vis = skill.visual;
  const width = (skill.render.beamWidth || 15) * Math.min(1, t * 4);
  const alpha = t < 0.8 ? 0.9 : (1 - t) * 5;

  ctx.globalAlpha = alpha;

  // 외곽 빔
  ctx.strokeStyle = vis.primaryColor;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // 내부 밝은 빔
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width * 0.3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // 타격점 글로우
  const impactGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, width * 2);
  impactGrad.addColorStop(0, vis.glowColor + 'cc');
  impactGrad.addColorStop(1, vis.glowColor + '00');
  ctx.fillStyle = impactGrad;
  ctx.beginPath();
  ctx.arc(tx, ty, width * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function _renderMeleeSkill(ctx, skill, x, y, tx, ty, t) {
  const vis = skill.visual;
  const angle = Math.atan2(ty - y, tx - x);

  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(angle + (t - 0.5) * Math.PI);

  // 슬래시 아크
  const arcRadius = 40 + t * 20;
  ctx.strokeStyle = vis.primaryColor;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 1 - t * 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius, -Math.PI * 0.4, Math.PI * 0.4);
  ctx.stroke();

  // 트레일
  ctx.strokeStyle = vis.glowColor + '80';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius - 5, -Math.PI * 0.3 * t, Math.PI * 0.3 * t);
  ctx.stroke();

  ctx.restore();
}

function _renderSummonSkill(ctx, skill, tx, ty, t) {
  const vis = skill.visual;
  const size = 40 * t;

  // 마법진
  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(t * Math.PI * 2);

  ctx.strokeStyle = vis.primaryColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;

  // 외곽 원
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();

  // 내부 별
  _drawStar(ctx, 0, 0, size * 0.7, 6);
  ctx.strokeStyle = vis.secondaryColor;
  ctx.stroke();

  // 내부 원
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();

  // 상승 파티클
  for (let i = 0; i < 5; i++) {
    const px = tx + (Math.random() - 0.5) * size;
    const py = ty - t * 30 * (i + 1) * 0.3;
    ctx.globalAlpha = (1 - t) * 0.6;
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(vis.particleEmoji, px, py);
  }
  ctx.globalAlpha = 1;
}

function _renderBuffSkill(ctx, skill, x, y, t) {
  const vis = skill.visual;
  const pulseSize = 25 + Math.sin(t * Math.PI * 4) * 8;

  // 오라 링
  ctx.strokeStyle = vis.primaryColor + '80';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
  ctx.stroke();

  // 글로우
  const grad = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
  grad.addColorStop(0, vis.glowColor + '30');
  grad.addColorStop(1, vis.glowColor + '00');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
  ctx.fill();

  // 회전 파티클
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + t * 8;
    const px = x + Math.cos(angle) * pulseSize;
    const py = y + Math.sin(angle) * pulseSize;
    ctx.fillStyle = vis.primaryColor;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── 도형 그리기 헬퍼 ───

function _drawStar(ctx, x, y, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    if (i === 0) ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    else ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

function _drawShape(ctx, x, y, size, shape) {
  switch (shape) {
    case 'star':
      _drawStar(ctx, x, y, size, 5);
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.7, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size * 0.7, y);
      ctx.closePath();
      ctx.fill();
      break;
    case 'crescent':
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    default:
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
  }
}

// ─── 내부 생성 헬퍼 ───

function generateShapeData(type, template, rarity) {
  const data = {};
  if (type === 'projectile') {
    data.shape = randomPick(template.shapes);
    data.trail = randomPick(template.trails);
    data.impact = randomPick(template.impacts);
    data.size = template.sizes[Math.min(rarity - 1, template.sizes.length - 1)];
  } else if (type === 'area') {
    data.shape = randomPick(template.shapes);
    data.fill = randomPick(template.fills);
    data.edge = randomPick(template.edges);
  } else if (type === 'beam') {
    data.width = randomPick(template.widths);
    data.pattern = randomPick(template.patterns);
    data.core = randomPick(template.cores);
  } else if (type === 'melee') {
    data.swing = randomPick(template.swings);
    data.trail = randomPick(template.trails);
    data.finisher = randomPick(template.finishers);
  } else if (type === 'summon') {
    data.circle = randomPick(template.circles);
    data.animation = randomPick(template.animations);
  } else if (type === 'buff') {
    data.aura = randomPick(template.auras);
    data.animation = randomPick(template.animations);
  }
  return data;
}

function generateRenderData(type, element, rarity) {
  return {
    projectileSize: 8 + rarity * 3,
    areaRadius: 40 + rarity * 15,
    beamWidth: 10 + rarity * 5,
    shape: randomPick(['circle','star','diamond']),
    particleCount: 5 + rarity * 3,
    glowIntensity: 0.3 + rarity * 0.15,
  };
}

function generateSpecialEffects(element, rarity) {
  const effects = [];
  const elementEffects = {
    fire: ['burn','ignite','melt_armor'],
    water: ['slow','heal_splash','freeze_chance'],
    earth: ['stun','knockback','armor_up'],
    wind: ['push','speed_up','dodge_boost'],
    light: ['blind','purify','crit_up'],
    dark: ['fear','drain_hp','curse'],
    nature: ['poison','root','regen'],
    ice: ['freeze','slow','shatter'],
  };
  const pool = elementEffects[element] || ['none'];
  const count = Math.min(pool.length, Math.floor(rarity / 2) + 1);
  for (let i = 0; i < count; i++) {
    effects.push({ name: pool[i], chance: 0.1 + rarity * 0.05, duration: 2 + rarity });
  }
  return effects;
}

function generateSkillName(element, type, rarity) {
  const elNames = { fire:'화염',water:'물결',earth:'대지',wind:'질풍',light:'성광',dark:'암영',nature:'자연',ice:'빙결' };
  const typeNames = { projectile:'탄',area:'진',beam:'광선',melee:'참격',summon:'소환',buff:'축복' };
  const rarityPrefix = ['','강화 ','상급 ','극 ','궁극의 '][Math.min(rarity-1, 4)];
  return `${rarityPrefix}${elNames[element] || ''}의 ${typeNames[type] || '스킬'}`;
}

function getSoundHint(type, element) {
  const hints = {
    projectile: 'whoosh', area: 'boom', beam: 'zap', melee: 'slash', summon: 'magic_circle', buff: 'chime',
  };
  return `${hints[type] || 'magic'}_${element}`;
}

function rollRarity() {
  const r = Math.random() * 100;
  if (r < 40) return 1;
  if (r < 70) return 2;
  if (r < 88) return 3;
  if (r < 97) return 4;
  return 5;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
