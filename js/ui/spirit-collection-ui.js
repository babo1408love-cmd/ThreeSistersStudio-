// Spirit Collection UI
import GameState from '../core/game-state.js';
import SPIRITS, { RARITY_COLORS, RARITY_NAMES } from '../data/spirits.js';

export function openSpiritCollection() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';

  const spirits = GameState.spirits;

  overlay.innerHTML = `
    <div class="overlay-panel" style="min-width:320px;max-width:500px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:1.3em;font-weight:700;">🧚 정령 도감</div>
        <button class="btn btn-sm btn-secondary" id="spirit-close">✕ 닫기</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;">
        ${SPIRITS.map(def => {
          const owned = spirits.find(s => s.key === def.key);
          return `
            <div style="
              padding:10px;background:var(--bg-card);border:1px solid ${owned ? RARITY_COLORS[def.rarity] : 'var(--border-subtle)'};
              border-radius:var(--radius-md);text-align:center;
              opacity:${owned ? '1' : '0.4'};
            ">
              <div style="font-size:2em;">${def.emoji}</div>
              <div style="font-weight:700;font-size:0.85em;margin-top:4px;">${def.name}</div>
              <div class="badge badge-${def.rarity === 'epic' ? 'gold' : def.rarity === 'rare' ? 'purple' : 'green'}" style="margin-top:4px;">
                ${RARITY_NAMES[def.rarity]}
              </div>
              ${owned ? `
                <div style="font-size:0.75em;color:var(--text-secondary);margin-top:4px;">
                  Lv.${owned.level} | ATK:${def.stats.attack} DEF:${def.stats.defense}
                </div>
                <div style="font-size:0.7em;color:var(--gold);margin-top:2px;">${def.ability.name}</div>
              ` : `<div style="font-size:0.75em;color:var(--text-muted);margin-top:4px;">미소환</div>`}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('#spirit-close').onclick = () => overlay.remove();
}
