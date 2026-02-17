// Treasure Chest Event: 2 dice + 8 chests in circle
import GameState from '../core/game-state.js';
import { rollTreasureLoot } from '../data/loot-tables.js';
import { showConfetti, showToast } from '../ui/toast.js';

export default class TreasureEvent {
  constructor(container, options = {}) {
    this.container = container;
    this.stageId = options.stageId || 1;
    this.onComplete = options.onComplete || (() => {});

    this._dice = [0, 0];
    this._rolling = false;
    this._rolled = false;
    this._diceSum = 0;
    this._chests = Array(8).fill(false); // false = closed
    this._selectedChest = -1;
    this._loot = null;
    this._destroyed = false;

    this._render();
  }

  _render() {
    if (this._destroyed) return;

    this.container.innerHTML = `
      <div class="treasure-scene" style="animation:fadeIn .3s ease-out;">
        <div class="scene-title" style="color:var(--gold);">🎁 보물상자 이벤트!</div>
        <div class="scene-subtitle">주사위를 굴려 보물상자를 열어보세요!</div>

        <div class="dice-area">
          <div class="dice ${this._rolling ? 'rolling' : ''}" id="dice0">${this._dice[0] || '?'}</div>
          <div class="dice-sum">${this._rolled ? '= ' + this._diceSum : '+'}</div>
          <div class="dice ${this._rolling ? 'rolling' : ''}" id="dice1">${this._dice[1] || '?'}</div>
        </div>

        ${!this._rolled ? `<button class="btn btn-gold btn-lg touch-btn" id="roll-dice-btn"><span class="touch-icon">👆</span> 🎲 주사위 굴리기!</button>` : ''}
        ${this._rolled && this._selectedChest < 0 ? `<div style="color:var(--gold);font-size:0.95em;margin-bottom:8px;">주사위 합: ${this._diceSum}! <span class="touch-icon" style="font-size:1.2em;">👆</span> 상자를 선택하세요 🎁</div>` : ''}

        <div class="treasure-circle" id="treasure-circle"></div>

        ${this._loot ? '<div id="treasure-loot"></div>' : ''}
      </div>
    `;

    // Render chests in circle
    const circle = this.container.querySelector('#treasure-circle');
    const cx = 150, cy = 150, radius = 120;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius - 28;
      const y = cy + Math.sin(angle) * radius - 28;

      const chest = document.createElement('div');
      chest.className = 'treasure-chest';
      if (this._chests[i]) chest.classList.add('opened');
      if (this._selectedChest === i) chest.classList.add('selected');
      chest.style.left = x + 'px';
      chest.style.top = y + 'px';
      chest.textContent = this._chests[i] ? '✨' : '🎁';

      if (this._rolled && !this._chests[i] && this._selectedChest < 0) {
        chest.classList.add('chest-tappable');
        chest.onclick = () => this._selectChest(i);
      }

      circle.appendChild(chest);
    }

    // Bind roll button
    if (!this._rolled) {
      this.container.querySelector('#roll-dice-btn').onclick = () => this._rollDice();
    }

    // Show loot
    if (this._loot) {
      this._renderLoot();
    }
  }

  _rollDice() {
    if (this._rolling || this._rolled) return;
    this._rolling = true;
    this._render();

    let count = 0;
    const interval = setInterval(() => {
      this._dice[0] = Math.floor(Math.random() * 6) + 1;
      this._dice[1] = Math.floor(Math.random() * 6) + 1;
      const d0 = this.container.querySelector('#dice0');
      const d1 = this.container.querySelector('#dice1');
      if (d0) d0.textContent = this._dice[0];
      if (d1) d1.textContent = this._dice[1];
      count++;

      if (count >= 15) {
        clearInterval(interval);
        this._rolling = false;
        this._rolled = true;
        this._diceSum = this._dice[0] + this._dice[1];
        this._render();
      }
    }, 80);
  }

  _selectChest(index) {
    this._selectedChest = index;
    this._chests[index] = true;
    showConfetti();

    // Generate loot based on dice sum
    this._loot = rollTreasureLoot(this._diceSum, this.stageId);

    // Apply loot
    this._loot.forEach(item => {
      if (item.type === 'gold') {
        GameState.addGold(item.value);
      } else if (item.type === 'spirit_part') {
        GameState.addSpiritItem(item);
      } else {
        GameState.addItem(item);
      }
    });

    this._render();
  }

  _renderLoot() {
    const lootDiv = this.container.querySelector('#treasure-loot');
    if (!lootDiv || !this._loot) return;

    lootDiv.innerHTML = `
      <div style="margin-top:16px;animation:slideUp .3s ease-out;">
        <div style="color:var(--gold);font-size:1.1em;font-weight:700;margin-bottom:8px;">🎉 획득!</div>
        <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
          ${this._loot.map(l => `
            <span style="padding:6px 12px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:8px;font-size:0.85em;">
              ${l.emoji} ${l.partEmoji || ''} ${l.name}${l.value ? ' +' + l.value : ''}
            </span>
          `).join('')}
        </div>
        <button class="btn btn-primary btn-lg touch-btn" id="treasure-done-btn"><span class="touch-icon">👆</span> 다음으로 →</button>
      </div>
    `;

    lootDiv.querySelector('#treasure-done-btn').onclick = () => {
      this.onComplete();
    };
  }

  destroy() {
    this._destroyed = true;
  }
}
