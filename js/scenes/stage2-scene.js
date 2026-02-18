/**
 * Stage2Scene — 스테이지2 전투 화면
 * Canvas 횡스크롤 전투, 소환나무 UI 포함
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import { getStage, getMaxStage } from '../data/stages.js';
import CombatEngine from '../combat/combat-engine.js';
import { showConfetti } from '../ui/toast.js';

export default class Stage2Scene {
  onCreate() {
    this._engine = null;
    this._stage = getStage(GameState.currentStage);
    this._showingSummonTree = false;
  }

  render() {
    this.el.innerHTML = '';
    this.el.className = 'scene combat-scene';

    // Canvas (full viewport)
    const canvas = document.createElement('canvas');
    canvas.className = 'combat-canvas';
    canvas.width = Math.min(window.innerWidth, 900);
    canvas.height = Math.min(window.innerHeight - 40, 600);
    canvas.id = 'combat-canvas';
    this.el.appendChild(canvas);

    // Bottom control bar
    const controlBar = document.createElement('div');
    controlBar.className = 'combat-control-bar';
    controlBar.innerHTML = `
      <button class="combat-ctrl-btn" id="btn-back-menu">
        <span class="combat-ctrl-icon">←</span>
        <span class="combat-ctrl-label">메뉴</span>
      </button>
      <button class="combat-ctrl-btn" id="btn-summon-tree">
        <span class="combat-ctrl-icon">🌳</span>
        <span class="combat-ctrl-label">소환나무</span>
      </button>
      <div class="combat-ctrl-info">
        <span id="stage-label">스테이지 ${GameState.currentStage}: ${this._stage.name}</span>
      </div>
      <button class="combat-ctrl-btn" id="btn-pause">
        <span class="combat-ctrl-icon">⏸️</span>
        <span class="combat-ctrl-label">일시정지</span>
      </button>
    `;
    this.el.appendChild(controlBar);

    // Bind controls
    controlBar.querySelector('#btn-back-menu').onclick = () => {
      if (this._engine) this._engine.running = false;
      SaveManager.save();
      SceneManager.go('menu');
    };
    controlBar.querySelector('#btn-summon-tree').onclick = () => this._showSummonTree();
    controlBar.querySelector('#btn-pause').onclick = () => this._togglePause();

    this._startCombat(canvas);
  }

  _startCombat(canvas) {
    // HeroAI: 스테이지 입장 직전 전체 계산 (소환의 방에서 안 왔을 경우 대비)
    if (typeof HeroAI !== 'undefined' && !HeroAI.party._calculated) {
      try { HeroAI.calculateAll(); } catch(e) { console.warn('[HeroAI] calculateAll 실패:', e); }
    }

    // Determine wave count from stage
    const waveCount = this._stage.combat?.waves?.length || 4;

    this._engine = new CombatEngine(canvas, {
      stageLevel: GameState.currentStage,
      maxWaves: waveCount,
      mapTheme: this._stage.mapTheme || 'fairy_garden',
      onVictory: (result) => this._onVictory(result),
      onDeath: () => this._onDeath(),
    });
    this._engine.start();
  }

  _togglePause() {
    if (!this._engine) return;
    this._engine.running = !this._engine.running;
    const btn = this.el.querySelector('#btn-pause');
    if (btn) {
      btn.querySelector('.combat-ctrl-icon').textContent = this._engine.running ? '⏸️' : '▶️';
      btn.querySelector('.combat-ctrl-label').textContent = this._engine.running ? '일시정지' : '계속하기';
    }
    if (this._engine.running) {
      this._engine._lastTime = performance.now();
      this._engine._loop();
    }
  }

  _onVictory(result) {
    showConfetti();
    const rewards = this._stage.rewards;
    GameState.addGold(rewards.gold);
    GameState.stats.stagesCleared++;

    // XP 보상
    const expReward = rewards.exp || 50;
    GameState.heroExp += expReward;

    const isLastStage = GameState.currentStage >= getMaxStage();

    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-overlay__title">🎉 승리!</div>
      <div style="color:var(--text-secondary);font-size:1em;">
        스테이지 ${GameState.currentStage}: ${this._stage.name} 클리어!
      </div>
      <div class="victory-stats">
        <span>💀 처치: ${result.enemiesKilled}</span>
        <span>💰 +${result.goldEarned + rewards.gold}G</span>
        <span>❤️ HP: ${Math.round(result.hpRemaining)}</span>
        <span>⭐ +${expReward} EXP</span>
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;">
        ${isLastStage
          ? '<button class="btn btn-gold btn-lg" id="victory-end">🏆 게임 클리어!</button>'
          : '<button class="btn btn-primary btn-lg" id="victory-next">다음 스테이지 →</button>'
        }
      </div>
    `;
    this.el.appendChild(overlay);

    if (isLastStage) {
      overlay.querySelector('#victory-end').onclick = () => {
        SaveManager.deleteSave();
        SceneManager.go('gameover', { victory: true });
      };
    } else {
      overlay.querySelector('#victory-next').onclick = () => {
        GameState.currentStage++;
        GameState.resetStageProgress();
        SaveManager.save();
        SceneManager.go('stage1');
      };
    }
  }

  _onDeath() {
    const overlay = document.createElement('div');
    overlay.className = 'death-overlay';
    overlay.innerHTML = `
      <div class="death-overlay__title">🌳 소환의 나무로 귀환...</div>
      <div style="color:var(--text-secondary);font-size:1em;margin-top:8px;">
        요정은 쓰러지지 않아요. 소환의 나무에서 다시 시작합니다
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;">
        <button class="btn btn-primary btn-lg" id="death-retry">🌳 소환의 방으로 →</button>
        <button class="btn btn-secondary" id="death-menu">메인 메뉴</button>
      </div>
    `;
    this.el.appendChild(overlay);

    overlay.querySelector('#death-retry').onclick = () => {
      if (SaveManager.hasCheckpoint()) {
        SaveManager.loadCheckpoint();
      }
      GameState.fullHeal();
      SceneManager.go('summoning');
    };

    overlay.querySelector('#death-menu').onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  // ── 소환나무 UI ──
  _showSummonTree() {
    if (this._showingSummonTree) return;
    this._showingSummonTree = true;
    if (this._engine) this._engine.running = false;

    const overlay = document.createElement('div');
    overlay.className = 'summon-tree-overlay';
    overlay.id = 'summon-tree-panel';
    overlay.innerHTML = `
      <div class="summon-tree-panel">
        <div class="summon-tree-header">
          <span>🌳 소환의 나무</span>
          <button class="btn btn-sm btn-secondary" id="close-summon-tree">✕ 닫기</button>
        </div>
        <div class="summon-tree-body">
          <div class="summon-tree-visual">
            <div class="summon-tree-emoji">🌳</div>
            <div class="summon-tree-desc">
              정령은 쓰러져도 소환의 나무로 귀환합니다.<br>
              30초 후 재소환이 가능합니다.
            </div>
          </div>
          <div class="summon-tree-spirits">
            <div style="font-weight:700;margin-bottom:8px;">소환된 정령</div>
            ${this._renderSpiritList()}
          </div>
          <div class="summon-tree-fragments">
            <div style="font-weight:700;margin-bottom:8px;">보유 파편</div>
            <div class="fragment-grid">
              ${this._renderFragments()}
            </div>
          </div>
        </div>
      </div>
    `;
    this.el.appendChild(overlay);

    overlay.querySelector('#close-summon-tree').onclick = () => {
      overlay.remove();
      this._showingSummonTree = false;
      if (this._engine) {
        this._engine.running = true;
        this._engine._lastTime = performance.now();
        this._engine._loop();
      }
    };
  }

  _renderSpiritList() {
    const spirits = GameState.spirits;
    if (!spirits || spirits.length === 0) {
      return '<div style="color:var(--text-muted);font-size:0.85em;">소환된 정령이 없습니다</div>';
    }
    return spirits.map(s => `
      <div class="summon-spirit-card">
        <span style="font-size:1.5em;">${s.emoji || '✨'}</span>
        <div>
          <div style="font-weight:700;">${s.name || '정령'}</div>
          <div style="font-size:0.8em;color:var(--text-secondary);">Lv.${s.level || 1} | ${s.attribute || '?'}</div>
        </div>
      </div>
    `).join('');
  }

  _renderFragments() {
    const parts = ['head','body','wings','legs','aura','core'];
    const partEmoji = { head:'🧩', body:'🫀', wings:'🪶', legs:'🦵', aura:'✨', core:'💎' };
    const partName = { head:'머리', body:'몸통', wings:'날개', legs:'다리', aura:'오라', core:'핵심' };
    // TODO: integrate with SummonTree instance when connected
    return parts.map(p => `
      <div class="fragment-cell">
        <span style="font-size:1.3em;">${partEmoji[p]}</span>
        <span style="font-size:0.75em;">${partName[p]}</span>
        <span style="font-size:0.7em;color:var(--text-muted);">0개</span>
      </div>
    `).join('');
  }

  onLeave() {
    if (this._engine) {
      this._engine.stop();
      this._engine = null;
    }
    this._showingSummonTree = false;
  }
}
