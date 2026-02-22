// HUD (heads-up display) utilities
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import SceneManager from '../core/scene-manager.js';
import SaveManager from '../core/save-manager.js';

export function createHudBar() {
  const hud = document.createElement('div');
  hud.id = 'game-hud';
  hud.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    padding: 3px 6px;
    display: flex; justify-content: space-between; align-items: center;
    background: rgba(0,0,0,0.75);
    font-size: clamp(11px, 3.5vw, 15px); z-index: 50; pointer-events: none;
  `;
  hud.innerHTML = `
    <button id="hud-back-btn" class="btn btn-sm btn-secondary" style="pointer-events:auto;padding:4px 8px;font-size:clamp(10px,3vw,14px);">←</button>
    <span style="color:#fbbf24;">💰 <span id="hud-gold">${GameState.gold}</span></span>
    <span style="color:#8e92b8;">S<span id="hud-stage">${GameState.currentStage}</span></span>
    <button id="hud-inventory-btn" class="btn btn-sm btn-secondary" style="pointer-events:auto;padding:4px 8px;font-size:clamp(10px,3vw,14px);">🎒</button>
  `;

  // 뒤로가기 버튼 연결
  const backBtn = hud.querySelector('#hud-back-btn');
  if (backBtn) {
    backBtn.onclick = () => {
      SaveManager.save();
      SceneManager.go('menu');
    };
  }

  return hud;
}

export function updateHud() {
  const goldEl = document.getElementById('hud-gold');
  const stageEl = document.getElementById('hud-stage');
  if (goldEl) goldEl.textContent = GameState.gold;
  if (stageEl) stageEl.textContent = GameState.currentStage;
}

// Auto-update HUD on state changes
EventBus.on('gold:changed', updateHud);
EventBus.on('state:loaded', updateHud);
