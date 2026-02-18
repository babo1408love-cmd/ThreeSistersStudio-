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
import WorldmapScene from './scenes/worldmap-scene.js';
import SurvivalScene from './scenes/survival-scene.js';
import DungeonScene from './scenes/dungeon-scene.js';
import GachaScene from './scenes/gacha-scene.js';
import QuestScene from './scenes/quest-scene.js';
import ShopScene from './scenes/shop-scene.js';
import ArenaScene from './scenes/arena-scene.js';
import CodexScene from './scenes/codex-scene.js';
import RankingScene from './scenes/ranking-scene.js';

// UI
import { openInventory, closeInventory } from './ui/inventory-ui.js';

// 씬 → BGM 매핑 (SoundBGM.SCENES 키 참조)
const SCENE_BGM = {
  menu:       'title',
  stage1:     'puzzle',
  summoning:  'gacha',
  stage2:     'battle',
  gameover:   'defeat',
  worldmap:   'map',
  survival:   'battle',
  dungeon:    'battle',
  gacha:      'gacha',
  quest:      'map',
  shop:       'shop',
  arena:      'boss',
  codex:      'rest',
  ranking:    'rest',
};

// Initialize
function init() {
  const app = document.getElementById('app');
  SceneManager.init(app);

  // 사운드 초기화 (첫 사용자 인터랙션에서 활성화 — 브라우저 정책)
  const initSound = () => {
    if (window.SoundEngine && !SoundEngine._initialized) {
      SoundEngine.init();
      // 저장된 볼륨 설정 복원
      const savedSound = GameState.settings && GameState.settings.sound;
      if (savedSound) {
        SoundEngine.setMusicVolume((savedSound.bgm ?? 80) / 100);
        SoundEngine.setSfxVolume((savedSound.sfx ?? 80) / 100);
        SoundEngine.setUIVolume((savedSound.sfx ?? 80) / 100);
      }
      console.log('[Main] SoundEngine 초기화 완료');
    }
    if (window.SoundEngine) SoundEngine.resume();
    document.removeEventListener('click', initSound);
    document.removeEventListener('touchstart', initSound);
    document.removeEventListener('keydown', initSound);
  };
  document.addEventListener('click', initSound, { once: false });
  document.addEventListener('touchstart', initSound, { once: false });
  document.addEventListener('keydown', initSound, { once: false });

  // 미술 엔진 초기화 (ArtEngine ↔ MonglelbelEngine 연동 + ArtUI 오버레이)
  if (window.ArtEngine) {
    ArtEngine.connectToEngine();
  }
  if (window.ArtEnvironment) {
    ArtEnvironment.connectToEngine();
  }
  if (window.ArtUI) {
    ArtUI.init();
  }

  // 텍스트 엔진 초기화 (다국어 폰트 + 렌더러 + i18n)
  if (window.TextEngine) {
    TextEngine.init({ lang: 'ko' });
  }
  if (window.TextRenderer) {
    TextRenderer.connectToEngine();
  }
  if (window.TextI18n) {
    TextI18n.setLanguage('ko');
  }

  // Register all scenes
  SceneManager.register('menu', MainMenuScene);
  SceneManager.register('stage1', Stage1Scene);
  SceneManager.register('summoning', SummoningRoomScene);
  SceneManager.register('stage2', Stage2Scene);
  SceneManager.register('gameover', GameOverScene);
  SceneManager.register('worldmap', WorldmapScene);
  SceneManager.register('survival', SurvivalScene);
  SceneManager.register('dungeon', DungeonScene);
  SceneManager.register('gacha', GachaScene);
  SceneManager.register('quest', QuestScene);
  SceneManager.register('shop', ShopScene);
  SceneManager.register('arena', ArenaScene);
  SceneManager.register('codex', CodexScene);
  SceneManager.register('ranking', RankingScene);

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

  // 씬 전환 시 BGM 크로스페이드 + UI SFX
  EventBus.on('scene:changed', ({ from, to, params }) => {
    // BGM 전환
    if (window.SoundBGM && SoundEngine._initialized) {
      const bgmKey = SCENE_BGM[to] || 'map';

      // gameover는 승리/패배에 따라 분기
      if (to === 'gameover' && params && params.victory) {
        SoundBGM.crossFade('victory', 1.0);
      } else if (from) {
        SoundBGM.crossFade(bgmKey, 1.2);
      } else {
        SoundBGM.play(bgmKey);
      }
    }
    // 씬 전환 UI 사운드
    if (window.SoundSFX && SoundEngine._initialized) {
      SoundSFX.menuOpen();
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
