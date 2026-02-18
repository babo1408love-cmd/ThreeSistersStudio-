// Inventory overlay panel
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { RARITY_COLORS } from '../data/spirits.js';

let overlayEl = null;

export function openInventory() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.className = 'overlay';
  overlayEl.innerHTML = `<div class="overlay-panel" style="min-width:320px;max-width:500px;" id="inv-panel"></div>`;
  document.body.appendChild(overlayEl);

  renderInventory();
}

export function closeInventory() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
}

function renderInventory() {
  const panel = document.getElementById('inv-panel');
  if (!panel) return;

  const inv = GameState.inventory;
  const equipped = GameState.equipped;
  const spirits = GameState.spirits;
  const player = GameState.player;

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:1.3em;font-weight:700;">🎒 인벤토리</div>
      <button class="btn btn-sm btn-secondary" id="inv-close">✕ 닫기</button>
    </div>

    <!-- Player Stats -->
    <div style="margin-bottom:16px;padding:10px;background:var(--bg-card);border-radius:var(--radius-md);">
      <div style="font-weight:700;font-size:0.9em;margin-bottom:6px;">🧚 ${GameState.playerName}</div>
      <div style="font-size:0.8em;color:var(--text-secondary);display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        <span>❤️ HP: ${player.hp}/${player.maxHp}</span>
        <span>⚔️ 공격: ${player.attack}</span>
        <span>🛡️ 방어: ${player.defense}</span>
        <span>💨 속도: ${player.speed}</span>
      </div>
    </div>

    <!-- Equipped (6부위) -->
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;font-size:0.9em;margin-bottom:6px;">장착 중</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${renderSlot('head', '👒 머리', equipped.head)}
        ${renderSlot('body', '🛡️ 몸통', equipped.body)}
        ${renderSlot('arms', '⚔️ 팔', equipped.arms)}
        ${renderSlot('wings', '🪽 날개', equipped.wings)}
        ${renderSlot('legs', '🦿 다리', equipped.legs)}
        ${renderSlot('shoes', '👟 신발', equipped.shoes)}
      </div>
    </div>

    <!-- Inventory Items -->
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;font-size:0.9em;margin-bottom:6px;">보유 아이템 (${inv.reduce((sum, i) => sum + (i.quantity || 1), 0)})</div>
      <div style="max-height:200px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;" id="inv-items">
        ${inv.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85em;">아이템이 없습니다</div>' : ''}
        ${inv.map(item => {
          const uid = item._uid || item.id;
          const qty = item.quantity || 1;
          return `
          <div class="inv-item" data-uid="${uid}" style="
            display:flex;align-items:center;gap:8px;padding:6px 10px;
            background:var(--bg-card);border:1px solid var(--border-subtle);
            border-radius:var(--radius-sm);cursor:pointer;font-size:0.85em;
            transition:all 0.15s;
          ">
            <span style="font-size:1.3em;position:relative;">${item.emoji}${qty > 1 ? '<span style="position:absolute;bottom:-2px;right:-6px;font-size:0.55em;background:#333;color:#fff;border-radius:6px;padding:0 3px;min-width:14px;text-align:center;">' + qty + '</span>' : ''}</span>
            <div style="flex:1;">
              <div style="font-weight:700;">${item.name}</div>
              <div style="font-size:0.8em;color:var(--text-secondary);">${formatStats(item.stats)}</div>
            </div>
            ${item.slot ? '<button class="btn btn-sm btn-secondary equip-btn" data-uid="' + uid + '">장착</button>' : ''}
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Spirits -->
    <div>
      <div style="font-weight:700;font-size:0.9em;margin-bottom:6px;">🧚 정령 (${spirits.length})</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${spirits.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85em;">소환된 정령이 없습니다</div>' : ''}
        ${spirits.map(s => `
          <div style="
            padding:6px 10px;background:var(--bg-card);border:1px solid var(--border-subtle);
            border-radius:var(--radius-sm);font-size:0.85em;text-align:center;
          ">
            <div style="font-size:1.5em;">${s.emoji}</div>
            <div style="font-size:0.75em;font-weight:700;">${s.name}</div>
            <div style="font-size:0.7em;color:var(--text-secondary);">Lv.${s.level}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Bind events
  panel.querySelector('#inv-close').onclick = closeInventory;

  panel.querySelectorAll('.equip-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const uid = parseFloat(btn.dataset.uid);
      GameState.equipItem(uid);
      renderInventory();
    };
  });
}

function renderSlot(slot, label, item) {
  return `
    <div style="
      padding:6px 10px;background:var(--bg-card);border:1px solid var(--border-subtle);
      border-radius:var(--radius-sm);font-size:0.85em;min-width:80px;text-align:center;
    ">
      <div style="font-size:0.7em;color:var(--text-muted);margin-bottom:2px;">${label}</div>
      ${item
        ? `<span style="font-size:1.2em;">${item.emoji}</span> <span style="font-size:0.75em;">${item.name}</span>`
        : '<span style="color:var(--text-muted);">—</span>'}
    </div>
  `;
}

function formatStats(stats) {
  if (!stats) return '';
  return Object.entries(stats)
    .map(([k, v]) => {
      const labels = { attack: '공격', defense: '방어', speed: '속도', maxHp: 'HP', critRate: '치명타', rageGainRate: '분노율' };
      return `${labels[k] || k} ${v > 0 ? '+' : ''}${v}`;
    })
    .join(', ');
}
