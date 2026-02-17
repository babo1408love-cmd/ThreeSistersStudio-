// Main entry point for Monglebel
import SceneManager from './core/scene-manager.js';
import GameState from './core/game-state.js';
import SaveManager from './core/save-manager.js';
import EventBus from './core/event-bus.js';

// Scenes
import MainMenuScene from './scenes/main-menu.js';
import Stage1Scene from './scenes/stage1-scene.js';
import SummoningRoomScene from './scenes/summoning-room-scene.js';
import Stage2Scene from './scenes/stage2-scene.js';
import GameOverScene from './scenes/game-over-scene.js';

// UI
import { openInventory, closeInventory } from './ui/inventory-ui.js';

// Initialize
function init() {
  const app = document.getElementById('app');
  SceneManager.init(app);

  // Register all scenes
  SceneManager.register('menu', MainMenuScene);
  SceneManager.register('stage1', Stage1Scene);
  SceneManager.register('summoning', SummoningRoomScene);
  SceneManager.register('stage2', Stage2Scene);
  SceneManager.register('gameover', GameOverScene);

  // Global inventory button handler
  document.addEventListener('click', (e) => {
    if (e.target.id === 'hud-inventory-btn' || e.target.closest('#hud-inventory-btn')) {
      openInventory();
    }
  });

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'i' || e.key === 'I') {
      // Toggle inventory (only outside combat)
      if (SceneManager.getCurrentName() !== 'stage2') {
        openInventory();
      }
    }
    if (e.key === 'Escape') {
      closeInventory();
    }
  });

  // Auto-save events
  EventBus.on('scene:changed', ({ to }) => {
    if (to !== 'menu' && to !== 'gameover') {
      SaveManager.save();
    }
  });

  // Start at main menu
  SceneManager.go('menu');
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
