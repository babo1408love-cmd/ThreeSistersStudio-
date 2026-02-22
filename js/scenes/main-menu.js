// Main Menu Scene — 세계수어머니 (World Tree Mother) 중심 메인화면
import SceneManager from '../core/scene-manager.js';
import SaveManager from '../core/save-manager.js';
import GameState from '../core/game-state.js';
import StaminaSystem from '../systems/stamina-system.js';
import CurrencySystem from '../systems/currency-system.js';
import RewardSystem from '../systems/reward-system.js';
import { openSettings } from '../ui/settings-ui.js';

export default class MainMenuScene {
  onCreate() {
    this._flyers = [];
    this._time = 0;
    this._animId = null;
  }

  render() {
    const hasSave = SaveManager.hasSave();

    if (hasSave) {
      SaveManager.load();
      StaminaSystem.processRegen();
      CurrencySystem.init();
      const loginResult = RewardSystem.checkDailyLogin();
      this._loginReward = loginResult;
    }

    const gold = hasSave ? CurrencySystem.get('gold') : 0;
    const diamond = hasSave ? CurrencySystem.get('diamond') : 0;
    const stamina = hasSave ? StaminaSystem.get() : 100;
    const maxStamina = StaminaSystem.getMax();
    const level = GameState.heroLevel || 1;

    const ib = (id, emoji, label) =>
      `<button class="mm2-ib" id="${id}"><span class="mm2-ib-e">${emoji}</span><span class="mm2-ib-l">${label}</span></button>`;

    this.el.innerHTML = `
      <div class="mm2">
        <canvas id="mm-tree-cv"></canvas>
        <div class="mm2-ui">
          ${hasSave ? `
          <div class="mm2-status">
            <span>Lv.${level}</span>
            <span>💰${gold.toLocaleString()}</span>
            <span>💎${diamond.toLocaleString()}</span>
            <span>⚡${stamina}/${maxStamina}</span>
          </div>` : ''}

          <div class="mm2-title">몽글벨</div>
          <div class="mm2-sub">정령과 함께하는 모험</div>

          <div class="mm2-center">
            <div class="mm2-side mm2-left">
              ${hasSave ? [
                ib('btn-worldmap','🗺️','월드맵'),
                ib('btn-dungeon','🏰','던전'),
                ib('btn-hero','🧚','영웅'),
                ib('btn-gacha','🎰','소환'),
                ib('btn-settings','⚙️','설정'),
              ].join('') : ''}
            </div>
            <div class="mm2-tree-gap"></div>
            <div class="mm2-side mm2-right">
              ${hasSave ? [
                ib('btn-survival','⚔️','서바이벌'),
                ib('btn-gunfight','🔫','총싸움'),
                ib('btn-summon-tree','🌳','소환나무'),
                ib('btn-inventory','🎒','인벤'),
                ib('btn-ranking','🏆','랭킹'),
              ].join('') : ''}
            </div>
          </div>

          ${hasSave ? `
          <div class="mm2-bnav">
            ${ib('btn-quest','📋','퀘스트')}
            ${ib('btn-shop','🏪','상점')}
            ${ib('btn-arena','🏟️','아레나')}
            ${ib('btn-codex','📖','도감')}
          </div>` : ''}

          <div class="mm2-actions">
            <button class="mm2-btn mm2-btn-pri" id="btn-new-game">✨ 새 게임</button>
            ${hasSave ? '<button class="mm2-btn mm2-btn-sec" id="btn-continue">▶️ 이어하기</button>' : ''}
          </div>

          ${hasSave ? `
          <div class="mm2-test-toggle" id="mm-test-toggle">🔧 테스트</div>
          <div class="mm2-test-area" id="mm-test-area" style="display:none;">
            <button class="mm2-test-b" id="btn-test-vamp">🧚 요정 서바이버</button>
            <button class="mm2-test-b" id="btn-test-surv">💀 서바이벌</button>
            <button class="mm2-test-b" id="btn-test-gun">🔫 총싸움</button>
            <button class="mm2-test-b" id="btn-test-boss">👹 보스전</button>
            <button class="mm2-test-b" id="btn-test-aerial">✈️ 요정의 분노</button>
          </div>` : ''}

          <div class="mm2-ver">v2.0 — 몽글벨</div>
        </div>
      </div>
    `;

    this._setupCanvas();
    this._initFlyers();
    this._bindEvents(hasSave);

    if (this._loginReward) {
      this._showLoginReward(this._loginReward);
      this._loginReward = null;
    }
  }

  onEnter() {
    this._startAnim();
  }

  onLeave() {
    this._stopAnim();
  }

  // ── Canvas ──

  _setupCanvas() {
    const cv = this.el.querySelector('#mm-tree-cv');
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const w = APP_W;
    const h = APP_H;
    if (w <= 0 || h <= 0) return;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = w * dpr;
    cv.height = h * dpr;
    this._cv = cv;
    this._ctx = cv.getContext('2d');
    this._ctx.scale(dpr, dpr);
    this._cw = w;
    this._ch = h;
  }

  // ── Flying Fairies & Spirits ──

  _initFlyers() {
    this._flyers = [];
    const fC = [[245,194,231],[192,132,252],[251,191,36],[134,239,172],[103,232,249],[255,180,180]];
    for (let i = 0; i < 6; i++) {
      this._flyers.push({
        t: 'f', angle: Math.random() * Math.PI * 2,
        speed: 0.30 + Math.random() * 0.45,
        rx: 0.12 + Math.random() * 0.25,
        ry: 0.10 + Math.random() * 0.18,
        c: fC[i], ph: Math.random() * Math.PI * 2,
        sz: 4 + Math.random() * 3,
        yOff: (Math.random() - 0.5) * 0.12,
      });
    }
    const sC = [[255,107,107],[155,138,255],[134,239,172],[251,191,36],[103,232,249]];
    for (let i = 0; i < 5; i++) {
      this._flyers.push({
        t: 's', angle: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.30,
        rx: 0.14 + Math.random() * 0.18,
        ry: 0.12 + Math.random() * 0.15,
        c: sC[i], ph: Math.random() * Math.PI * 2,
        sz: 3.5 + Math.random() * 2,
        yOff: (Math.random() - 0.5) * 0.10,
      });
    }
  }

  // ── Animation Loop ──

  _startAnim() {
    const loop = (ts) => {
      this._time = ts;
      this._draw();
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  _draw() {
    const ctx = this._ctx;
    if (!ctx) return;
    const w = this._cw, h = this._ch, t = this._time;
    ctx.clearRect(0, 0, w, h);
    this._drawTree(ctx, w, h, t);
    this._drawFlyers(ctx, w, h, t);
  }

  // ── 세계수어머니 (World Tree Mother) ──

  _drawTree(ctx, w, h, t) {
    const cx = w / 2;
    const baseY = h * 0.70;
    const topY = h * 0.20;
    const canopyCY = h * 0.32;

    // Background aura (warm golden center)
    const aura = ctx.createRadialGradient(cx, h * 0.38, 0, cx, h * 0.38, w * 0.55);
    aura.addColorStop(0, 'rgba(251,191,36,0.12)');
    aura.addColorStop(0.3, 'rgba(192,132,252,0.07)');
    aura.addColorStop(0.6, 'rgba(134,239,172,0.04)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    // Ground glow (soft green beneath tree)
    const gnd = ctx.createRadialGradient(cx, baseY + 5, 0, cx, baseY + 5, w * 0.40);
    gnd.addColorStop(0, 'rgba(134,239,172,0.10)');
    gnd.addColorStop(0.5, 'rgba(134,239,172,0.04)');
    gnd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, baseY - 15, w, 40);

    // Roots (thick, spreading)
    ctx.save();
    ctx.lineCap = 'round';
    const roots = [
      [-0.38, 0.18, 5],  [-0.28, 0.14, 4],  [-0.15, 0.10, 3],
      [0.15, 0.10, 3],   [0.28, 0.14, 4],   [0.38, 0.18, 5],
    ];
    roots.forEach(([dx, lenR, lw], i) => {
      ctx.lineWidth = lw;
      ctx.strokeStyle = `rgba(80,50,25,${0.5 + Math.sin(t * 0.001 + i) * 0.1})`;
      const startX = cx + dx * w * 0.25;
      const endX = cx + dx * w;
      const endY = baseY + lenR * h * 0.2;
      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      ctx.quadraticCurveTo((startX + endX) / 2, baseY + 6, endX, endY);
      ctx.stroke();
    });
    ctx.restore();

    // Trunk (wide, majestic)
    const tw = w * 0.10;     // half-width at base
    const ttw = w * 0.045;   // half-width at top
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - tw, baseY);
    ctx.bezierCurveTo(
      cx - tw * 0.9, baseY - (baseY - topY) * 0.3,
      cx - ttw * 1.8, baseY - (baseY - topY) * 0.65,
      cx - ttw, topY + h * 0.06
    );
    ctx.lineTo(cx + ttw, topY + h * 0.06);
    ctx.bezierCurveTo(
      cx + ttw * 1.8, baseY - (baseY - topY) * 0.65,
      cx + tw * 0.9, baseY - (baseY - topY) * 0.3,
      cx + tw, baseY
    );
    ctx.closePath();

    // Trunk color gradient
    const tg = ctx.createLinearGradient(cx - tw, 0, cx + tw, 0);
    tg.addColorStop(0, '#1e1008');
    tg.addColorStop(0.2, '#4a2d18');
    tg.addColorStop(0.5, '#7a5035');
    tg.addColorStop(0.8, '#4a2d18');
    tg.addColorStop(1, '#1e1008');
    ctx.fillStyle = tg;
    ctx.fill();

    // Trunk edge highlight
    ctx.strokeStyle = 'rgba(139,94,60,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trunk inner glow (pulsing golden life energy)
    const ga = 0.18 + Math.sin(t * 0.0015) * 0.10;
    const ig = ctx.createLinearGradient(cx, baseY, cx, topY);
    ig.addColorStop(0, 'rgba(251,191,36,0)');
    ig.addColorStop(0.2, `rgba(251,191,36,${ga * 0.5})`);
    ig.addColorStop(0.45, `rgba(251,191,36,${ga})`);
    ig.addColorStop(0.6, `rgba(134,239,172,${ga * 0.8})`);
    ig.addColorStop(0.8, `rgba(251,191,36,${ga * 0.4})`);
    ig.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = ig;
    ctx.fill();
    ctx.restore();

    // Branches (extending outward from trunk edges)
    const branches = [
      { side: -1, yP: 0.42, angle: -0.5, len: 0.22, lw: 4 },
      { side: 1,  yP: 0.38, angle: 0.4,  len: 0.25, lw: 4 },
      { side: -1, yP: 0.48, angle: -0.8, len: 0.16, lw: 3 },
      { side: 1,  yP: 0.46, angle: 0.7,  len: 0.18, lw: 3 },
      { side: -1, yP: 0.34, angle: -0.3, len: 0.20, lw: 3.5 },
      { side: 1,  yP: 0.32, angle: 0.2,  len: 0.22, lw: 3.5 },
      { side: -1, yP: 0.54, angle: -1.0, len: 0.12, lw: 2.5 },
      { side: 1,  yP: 0.52, angle: 0.9,  len: 0.14, lw: 2.5 },
      { side: -1, yP: 0.28, angle: -0.2, len: 0.15, lw: 2.5 },
      { side: 1,  yP: 0.26, angle: 0.15, len: 0.16, lw: 2.5 },
    ];
    ctx.save();
    ctx.lineCap = 'round';
    branches.forEach(b => {
      // Start from trunk edge
      const sy = h * b.yP;
      const trunkHW = ttw + (tw - ttw) * ((sy - topY) / (baseY - topY));
      const startX = cx + b.side * trunkHW * 0.85;
      const endX = startX + Math.cos(b.angle) * w * b.len;
      const endY = sy + Math.sin(b.angle) * h * 0.06;
      const cpX = startX + (endX - startX) * 0.5;
      const cpY = sy - 6;
      ctx.strokeStyle = '#3d2510';
      ctx.lineWidth = b.lw;
      ctx.beginPath();
      ctx.moveTo(startX, sy);
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.stroke();
    });
    ctx.restore();

    // Canopy (large, lush ethereal glow clusters)
    const canopy = [
      // [dx, dy, radius, R, G, B, alpha]
      [0,     0,     0.38, 134,239,172, 0.30],   // center green (biggest)
      [-0.15, 0.04,  0.28, 103,232,249, 0.22],   // left cyan
      [0.15,  0.04,  0.28, 103,232,249, 0.22],   // right cyan
      [0,     0.10,  0.25, 134,239,172, 0.20],   // lower green
      [-0.10, -0.08, 0.22, 245,194,231, 0.18],   // upper-left pink
      [0.10,  -0.08, 0.22, 245,194,231, 0.18],   // upper-right pink
      [0,     -0.14, 0.18, 251,191,36,  0.16],   // crown gold
      [-0.22, 0.08,  0.18, 192,132,252, 0.12],   // far-left purple
      [0.22,  0.08,  0.18, 192,132,252, 0.12],   // far-right purple
      [0,     -0.20, 0.12, 255,255,200, 0.12],   // tip glow
    ];
    canopy.forEach(([dx, dy, r, cr, cg, cb, al]) => {
      const px = cx + dx * w;
      const py = canopyCY + dy * h;
      const rr = r * w;
      const pa = al + Math.sin(t * 0.0008 + dx * 8 + dy * 4) * 0.03;
      const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${pa})`);
      g.addColorStop(0.5, `rgba(${cr},${cg},${cb},${pa * 0.45})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.fill();
    });

    // Leaf sparkles (scattered in canopy area)
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 + t * 0.0004;
      const d = w * 0.04 + Math.sin(i * 2.1 + t * 0.0006) * w * 0.16;
      const px = cx + Math.cos(a) * d;
      const py = canopyCY + Math.sin(a * 0.7) * d * 0.55;
      const al = 0.5 + Math.sin(t * 0.003 + i * 1.7) * 0.35;
      if (al <= 0) continue;
      const sz = 1.0 + Math.sin(t * 0.004 + i * 0.9) * 0.5;
      ctx.fillStyle = `rgba(255,255,210,${al})`;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.4, sz), 0, Math.PI * 2);
      ctx.fill();
    }

    // Crown top light (divine light from above)
    const clA = 0.15 + Math.sin(t * 0.0012) * 0.06;
    const cl = ctx.createRadialGradient(cx, canopyCY - h * 0.12, 0, cx, canopyCY - h * 0.12, w * 0.12);
    cl.addColorStop(0, `rgba(255,255,255,${clA})`);
    cl.addColorStop(0.5, `rgba(255,255,220,${clA * 0.4})`);
    cl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cl;
    ctx.beginPath();
    ctx.arc(cx, canopyCY - h * 0.12, w * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Falling leaf particles
    for (let i = 0; i < 8; i++) {
      const seed = i * 137.5;
      const px = cx + Math.sin(t * 0.0005 + seed) * w * 0.3;
      const fallY = canopyCY + ((t * 0.02 + seed * 10) % (h * 0.45));
      const al = 0.3 + Math.sin(t * 0.002 + i) * 0.15;
      const colors = [[134,239,172],[245,194,231],[103,232,249],[251,191,36]];
      const [cr,cg,cb] = colors[i % 4];
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${al})`;
      ctx.beginPath();
      ctx.arc(px, fallY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Flying Fairies & Spirits ──

  _drawFlyers(ctx, w, h, t) {
    const cx = w / 2;
    const cy = h * 0.38;  // orbit center near canopy

    this._flyers.forEach(f => {
      f.angle += f.speed * 0.0012;
      const ox = cx + Math.cos(f.angle + f.ph) * f.rx * w;
      const oy = cy + Math.sin(f.angle * 0.75 + f.ph) * f.ry * h + f.yOff * h;
      const [r, g, b] = f.c;

      ctx.save();
      if (f.t === 'f') {
        // Fairy: body + flapping wings
        const wingW = f.sz * (1.2 + Math.sin(t * 0.008 + f.ph) * 0.5);
        // Wings (semi-transparent)
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
        ctx.beginPath();
        ctx.ellipse(ox - wingW * 0.7, oy - 1, wingW * 0.55, f.sz * 0.22, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ox + wingW * 0.7, oy - 1, wingW * 0.55, f.sz * 0.22, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Body glow
        ctx.globalAlpha = 1;
        ctx.shadowColor = `rgb(${r},${g},${b})`;
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(ox, oy, f.sz * 0.45, 0, Math.PI * 2);
        ctx.fill();
        // Core white
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(ox, oy, f.sz * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Spirit: glowing element orb
        const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, f.sz * 2.5);
        grd.addColorStop(0, `rgba(${r},${g},${b},0.7)`);
        grd.addColorStop(0.4, `rgba(${r},${g},${b},0.15)`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(ox, oy, f.sz * 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Core
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(ox, oy, f.sz * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ── Events ──

  _bindEvents(hasSave) {
    const bind = (id, fn) => {
      const el = this.el.querySelector(id);
      if (el) el.onclick = fn;
    };

    bind('#btn-new-game', () => this._newGame());
    if (!hasSave) return;

    bind('#btn-continue', () => this._continueGame());
    bind('#btn-worldmap', () => SceneManager.go('worldmap'));
    bind('#btn-survival', () => SceneManager.go('survival'));
    bind('#btn-gunfight', () => SceneManager.go('gunfight'));
    bind('#btn-dungeon', () => SceneManager.go('dungeon'));
    bind('#btn-summon-tree', () => { SaveManager.load(); SceneManager.go('summoning'); });
    bind('#btn-gacha', () => SceneManager.go('gacha'));
    bind('#btn-hero', () => {
      import('../ui/hero-screen.js').then(m => m.openHeroScreen());
    });
    bind('#btn-inventory', () => {
      import('../ui/inventory-ui.js').then(m => m.openInventory());
    });
    bind('#btn-quest', () => SceneManager.go('quest'));
    bind('#btn-shop', () => SceneManager.go('shop'));
    bind('#btn-arena', () => SceneManager.go('arena'));
    bind('#btn-codex', () => SceneManager.go('codex'));
    bind('#btn-settings', () => openSettings());
    bind('#btn-ranking', () => SceneManager.go('ranking'));

    // Test section toggle
    bind('#mm-test-toggle', () => {
      const area = this.el.querySelector('#mm-test-area');
      if (area) area.style.display = area.style.display === 'none' ? 'flex' : 'none';
    });
    bind('#btn-test-vamp', () => SceneManager.go('stage2'));
    bind('#btn-test-surv', () => SceneManager.go('survival'));
    bind('#btn-test-gun', () => SceneManager.go('gunfight'));
    bind('#btn-test-boss', () => SceneManager.go('stage2', { bossTest: true }));
    bind('#btn-test-aerial', () => SceneManager.go('stage2', { aerialTest: true }));
  }

  // ── Core Actions ──

  _newGame() {
    SaveManager.deleteSave();
    GameState.reset();
    GameState.currentPhase = 'candy';
    SceneManager.go('stage1');
  }

  _continueGame() {
    SaveManager.load();
    const phase = GameState.currentPhase;
    if (phase === 'summoning') {
      SceneManager.go('summoning');
    } else if (phase === 'combat') {
      if (SaveManager.hasCheckpoint()) {
        SaveManager.loadCheckpoint();
      }
      SceneManager.go('summoning');
    } else {
      SceneManager.go('stage1');
    }
  }

  _showLoginReward(result) {
    if (!result || !result.rewards) return;
    const rewardText = Object.entries(result.rewards)
      .map(([k, v]) => `${k}: +${v}`)
      .join(', ');

    const popup = document.createElement('div');
    popup.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.7);z-index:5000;display:flex;align-items:center;justify-content:center;';
    popup.innerHTML = `
      <div style="background:#1a1a2e;border-radius:16px;padding:clamp(16px,5vw,24px);text-align:center;border:2px solid #FFD700;max-width:280px;">
        <div style="font-size:clamp(15px,4.5vw,20px);color:#FFD700;margin-bottom:10px;">🎁 출석 보상 (${result.streak}일차)</div>
        <div style="font-size:var(--label-lg);color:#ddd;margin-bottom:16px;">${rewardText}</div>
        <button class="btn btn-primary btn-sm" id="mm-login-ok">확인</button>
      </div>
    `;
    this.el.appendChild(popup);
    popup.querySelector('#mm-login-ok').onclick = () => popup.remove();
    popup.onclick = e => { if (e.target === popup) popup.remove(); };
  }
}
