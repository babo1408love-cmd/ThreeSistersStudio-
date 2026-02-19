/**
 * AerialScene — 공중전 테스트 씬
 *
 * 뱀서류 엔진(CombatEngine)을 사용하되 절반 거리 하늘 맵으로 실행.
 * cloud_realm 테마, 자동전진 속도 절반, 보스접근 속도 절반.
 * 인공지능(BalanceAI) 미사용 — 고정 설정값 기반.
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import { getStage, getMaxStage } from '../data/stages.js';
import CombatEngine from '../combat/combat-engine.js';
import HeroCore from '../systems/hero-core.js';
import { generateAerialMap } from '../generators/map-generator.js';
import { showConfetti } from '../ui/toast.js';

export default class AerialScene {
  onCreate() {
    this._engine = null;
    this._stage = getStage(GameState.currentStage);
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
      <div class="combat-ctrl-info">
        <span id="stage-label">☁️ 공중전 테스트 (스테이지 ${GameState.currentStage})</span>
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
    controlBar.querySelector('#btn-pause').onclick = () => this._togglePause();

    this._startCombat(canvas);
  }

  _startCombat(canvas) {
    const hero = HeroCore.getInstance();
    const plan = hero.prepareStagePlan(GameState.currentStage);

    // 공중전 맵 테마 오버라이드
    plan.map.themeId = 'cloud_realm';

    // 공중전 맵 직접 생성 (AI 미사용)
    const aerialMap = generateAerialMap({
      themeId: 'cloud_realm',
      stageLevel: GameState.currentStage,
    });

    const waveCount = plan.enemies.waveCount || this._stage.combat?.waves?.length || 4;

    this._engine = new CombatEngine(canvas, {
      stageLevel: GameState.currentStage,
      maxWaves: waveCount,
      plan,
      map: aerialMap,     // 절반 거리 공중전 맵
      aerial: true,       // 공중전 모드 플래그
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
    const hero = HeroCore.getInstance();
    const rewards = hero.combat.plan?.rewards || this._stage.rewards;
    hero.inventory.addGold(rewards.gold);
    GameState.stats.stagesCleared++;

    const expReward = rewards.exp || 50;
    hero.addExp(expReward);

    // 정령 소모 처리
    const consumedCount = GameState.spirits.length;
    GameState.spirits = [];

    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-overlay__title">☁️ 공중전 승리!</div>
      <div style="color:var(--text-secondary);font-size:1em;">
        하늘 위의 전투에서 승리했습니다!
      </div>
      <div class="victory-stats">
        <span>💀 처치: ${result.enemiesKilled}</span>
        <span>💰 +${result.goldEarned + rewards.gold}G</span>
        <span>❤️ HP: ${Math.round(result.hpRemaining)}</span>
        <span>⭐ +${expReward} EXP</span>
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;">
        <button class="btn btn-primary btn-lg" id="victory-menu">메인 메뉴로</button>
      </div>
    `;
    this.el.appendChild(overlay);

    overlay.querySelector('#victory-menu').onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  _onDeath() {
    const overlay = document.createElement('div');
    overlay.className = 'death-overlay';
    overlay.innerHTML = `
      <div class="death-overlay__title">🌳 소환의 나무로 귀환...</div>
      <div style="color:var(--text-secondary);font-size:1em;margin-top:8px;">
        하늘에서 추락했지만, 소환의 나무가 지켜줍니다
      </div>
      <div style="margin-top:20px;display:flex;gap:8px;">
        <button class="btn btn-primary btn-lg" id="death-retry">🌳 소환의 방으로 →</button>
        <button class="btn btn-secondary" id="death-menu">메인 메뉴</button>
      </div>
    `;
    this.el.appendChild(overlay);

    overlay.querySelector('#death-retry').onclick = () => {
      GameState.fullHeal();
      SceneManager.go('summoning');
    };
    overlay.querySelector('#death-menu').onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  onLeave() {
    if (this._engine) {
      this._engine.stop();
      this._engine = null;
    }
  }
}
