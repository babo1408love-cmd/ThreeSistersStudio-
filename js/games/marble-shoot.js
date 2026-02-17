// Marble Shooting Engine (modularized from marble-game.html)
import GameState from '../core/game-state.js';
import { rollMarbleLoot } from '../data/loot-tables.js';
import { showComboText, showScoreFloat, showToast } from '../ui/toast.js';

const GEMS = ['🧚', '🍄', '💎', '⭐', '🌈', '🍬', '🌙', '💧'];

export default class MarbleShoot {
  constructor(container, options = {}) {
    this.container = container;
    this.maxShots = options.shots || 20;
    this.gridSize = options.gridSize || 5;
    this.stageId = options.stageId || 1;
    this.onComplete = options.onComplete || (() => {});

    this.totalTargets = this.gridSize * this.gridSize;
    this.shots = this.maxShots;
    this.score = 0;
    this.targets = [];
    this._destroyed = false;
    this._lootCollected = [];

    this._init();
  }

  _init() {
    this.targets = [];
    for (let i = 0; i < this.totalTargets; i++) {
      this.targets.push({ emoji: GEMS[Math.floor(Math.random() * GEMS.length)], alive: true });
    }
    this.score = 0;
    this.shots = this.maxShots;
    this._lootCollected = [];
    this._render();
  }

  _render() {
    if (this._destroyed) return;
    const killed = this.targets.filter(t => !t.alive).length;
    const progress = Math.round(killed / this.totalTargets * 100);
    const allDead = killed === this.totalTargets;
    const noShots = this.shots <= 0;
    const done = allDead || noShots;

    this.container.innerHTML = `
      <div class="marble-scene" style="animation:fadeIn .3s ease-out;">
        <div class="scene-title" style="color:var(--blue);">🔮 마블 슈팅!</div>
        <div class="scene-subtitle">구슬을 터치하면 인접한 같은 종류도 연쇄 폭발!</div>
        <div class="info-bar">🔮 점수: ${this.score} | 남은 발사: ${this.shots}</div>
        <div class="progress-bar" style="margin:0 auto 14px;">
          <div class="progress-fill" style="width:${progress}%;background:linear-gradient(90deg,var(--blue),var(--purple));"></div>
        </div>
        <div class="marble-grid" id="marble-grid" style="grid-template-columns:repeat(${this.gridSize},52px)"></div>
        ${done ? '<div id="marble-result" style="margin-top:12px;"></div>' : ''}
      </div>
    `;

    const grid = this.container.querySelector('#marble-grid');
    for (let i = 0; i < this.targets.length; i++) {
      const t = this.targets[i];
      const orb = document.createElement('div');
      orb.className = 'marble-orb' + (!t.alive ? ' dead' : '');
      if (!t.alive) {
        orb.textContent = '💨';
      } else {
        orb.textContent = t.emoji;
        orb.style.animation = `float ${(1 + Math.random() * 2).toFixed(1)}s ease-in-out infinite alternate`;
        orb.onclick = () => this._shoot(i);
      }
      grid.appendChild(orb);
    }

    if (done) {
      this._showResult();
    }
  }

  _shoot(i) {
    if (this.shots <= 0 || !this.targets[i].alive) return;

    const emoji = this.targets[i].emoji;
    this.targets[i].alive = false;
    this.shots--;
    let chain = 1;
    this.score += 30;

    // Chain explosion — 8-directional adjacent same type
    const gs = this.gridSize;
    const neighbors = [i - 1, i + 1, i - gs, i + gs, i - gs - 1, i - gs + 1, i + gs - 1, i + gs + 1];

    neighbors.forEach(j => {
      if (j >= 0 && j < this.totalTargets && this.targets[j] && this.targets[j].alive && this.targets[j].emoji === emoji) {
        // Check row adjacency for left/right
        const iRow = Math.floor(i / gs);
        const jRow = Math.floor(j / gs);
        if (Math.abs(iRow - jRow) > 1) return;
        const iCol = i % gs;
        const jCol = j % gs;
        if (Math.abs(iCol - jCol) > 1) return;

        this.targets[j].alive = false;
        this.score += 25;
        chain++;

        // Secondary chain
        [j - 1, j + 1, j - gs, j + gs].forEach(k => {
          if (k >= 0 && k < this.totalTargets && this.targets[k] && this.targets[k].alive && this.targets[k].emoji === emoji) {
            const kRow = Math.floor(k / gs);
            const kCol = k % gs;
            if (Math.abs(jRow - kRow) <= 1 && Math.abs((j % gs) - kCol) <= 1) {
              this.targets[k].alive = false;
              this.score += 20;
              chain++;
            }
          }
        });
      }
    });

    if (chain >= 2) showComboText('💥 x' + chain + ' 콤보!');
    showScoreFloat(chain * 25);
    this._render();
  }

  _showResult() {
    const resultDiv = this.container.querySelector('#marble-result');
    if (!resultDiv) return;

    const alive = this.targets.filter(t => t.alive).length;
    if (alive === 0) {
      this.score += this.shots * 50;
    }

    // Roll loot
    const loot = rollMarbleLoot(this.score, this.stageId);
    this._lootCollected = loot;

    // Apply loot to game state
    loot.forEach(item => {
      if (item.type === 'gold') {
        GameState.addGold(item.value);
      } else {
        GameState.addItem(item);
      }
    });

    resultDiv.innerHTML = `
      <div style="color:var(--green);font-size:1.1em;font-weight:700;margin-bottom:12px;">
        ${alive === 0 ? '🎉 완벽 클리어!' : '⏰ 종료!'} 총 ${this.score}점
      </div>
      <div style="color:var(--text-secondary);font-size:0.85em;margin-bottom:8px;">획득 아이템:</div>
      <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
        ${loot.map(l => `<span style="padding:4px 10px;background:var(--bg-card);border-radius:8px;font-size:0.85em;">${l.emoji} ${l.name}${l.value ? ' +' + l.value : ''}</span>`).join('')}
      </div>
      <button class="btn btn-primary" id="marble-done-btn">다음으로 →</button>
    `;

    resultDiv.querySelector('#marble-done-btn').onclick = () => {
      this.onComplete({ score: this.score, loot: this._lootCollected });
    };
  }

  destroy() {
    this._destroyed = true;
  }
}
