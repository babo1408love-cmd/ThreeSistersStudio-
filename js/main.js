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

// ── 디버그/치트 유틸 (콘솔에서 호출) ──
window.cheat = {
  /** 정령 10마리 즉시 소환: cheat.summon10() */
  summon10() {
    const CHEAT_SPIRITS = [
      { key:'fairy',    name:'빛의 요정',    emoji:'🧚', rarity:'common',    attribute:'light',     rarityId:1, stats:{attack:8,defense:3,speed:5},  ability:{name:'빛의 축복',type:'heal',value:20,cooldown:8000,description:'아군 체력 20 회복'},   defense:3, spiritAtk:8,  spiritAtkSpeed:2.0 },
      { key:'mushroom', name:'독버섯 정령',  emoji:'🍄', rarity:'common',    attribute:'nature',    rarityId:1, stats:{attack:12,defense:6,speed:3}, ability:{name:'독 포자',type:'aoe',value:15,radius:80,cooldown:6000,description:'주변 적에게 15 피해'}, defense:6, spiritAtk:12, spiritAtkSpeed:2.0 },
      { key:'water',    name:'물방울 정령',  emoji:'💧', rarity:'common',    attribute:'water',     rarityId:1, stats:{attack:10,defense:8,speed:4}, ability:{name:'물결 파동',type:'aoe',value:12,radius:100,cooldown:7000,description:'주변 적에게 12 피해 + 감속'}, defense:8, spiritAtk:10, spiritAtkSpeed:2.0 },
      { key:'diamond',  name:'다이아 수호자',emoji:'💎', rarity:'rare',      attribute:'ice',       rarityId:2, stats:{attack:6,defense:15,speed:2}, ability:{name:'수정 방어막',type:'shield',value:30,cooldown:10000,description:'아군에게 방어막 30 부여'}, defense:10,spiritAtk:12, spiritAtkSpeed:1.8 },
      { key:'star',     name:'별빛 마법사',  emoji:'⭐', rarity:'rare',      attribute:'light',     rarityId:2, stats:{attack:18,defense:4,speed:4}, ability:{name:'유성우',type:'aoe',value:25,radius:120,cooldown:12000,description:'넓은 범위에 25 피해'}, defense:8, spiritAtk:18, spiritAtkSpeed:1.8 },
      { key:'moon',     name:'달빛 암살자',  emoji:'🌙', rarity:'rare',      attribute:'dark',      rarityId:2, stats:{attack:22,defense:3,speed:8}, ability:{name:'그림자 일격',type:'single',value:40,cooldown:8000,description:'단일 대상 40 피해'}, defense:6, spiritAtk:22, spiritAtkSpeed:1.6 },
      { key:'thunder',  name:'번개 정령',    emoji:'⚡', rarity:'magic',     attribute:'lightning',  rarityId:3, stats:{attack:24,defense:8,speed:7}, ability:{name:'천둥벼락',type:'aoe',value:30,radius:110,cooldown:9000,description:'광역 30 피해 + 마비'}, defense:12,spiritAtk:24, spiritAtkSpeed:1.5 },
      { key:'fire',     name:'불꽃 피닉스',  emoji:'🔥', rarity:'epic',      attribute:'fire',      rarityId:3, stats:{attack:32,defense:10,speed:5},ability:{name:'화염 폭발',type:'aoe',value:55,radius:120,cooldown:14000,description:'대폭발 55 피해'}, defense:14,spiritAtk:32, spiritAtkSpeed:1.3 },
      { key:'ice',      name:'얼음 여왕',    emoji:'❄️', rarity:'epic',      attribute:'ice',       rarityId:3, stats:{attack:25,defense:18,speed:3},ability:{name:'빙결',type:'freeze',value:35,radius:100,cooldown:12000,description:'주변 적 동결 + 35 피해'}, defense:18,spiritAtk:25, spiritAtkSpeed:1.3 },
      { key:'rainbow',  name:'무지개 드래곤',emoji:'🌈', rarity:'epic',      attribute:'light',     rarityId:3, stats:{attack:28,defense:14,speed:6},ability:{name:'무지개 브레스',type:'beam',value:50,cooldown:10000,description:'직선 관통 50 피해'}, defense:14,spiritAtk:28, spiritAtkSpeed:1.3 },
    ];
    const max = GameState.MAX_SPIRITS || 10;
    const remaining = max - GameState.spirits.length;
    if (remaining <= 0) { console.log('정령이 이미 가득 찼습니다!'); return; }
    const toAdd = Math.min(remaining, CHEAT_SPIRITS.length);
    for (let i = 0; i < toAdd; i++) {
      const s = { ...CHEAT_SPIRITS[i], id: Date.now() + i, level: 1, exp: 0 };
      GameState.summonSpirit(s);
    }
    SaveManager.save();
    console.log(`✨ 정령 ${toAdd}마리 소환 완료! (${GameState.spirits.length}/${max})`);
    console.log(GameState.spirits.map(s => `${s.emoji} ${s.name} (${s.rarity})`).join('\n'));
  },
  /** 골드 추가: cheat.gold(10000) */
  gold(amount = 10000) { GameState.addGold(amount); SaveManager.save(); console.log(`+${amount}G → 총 ${GameState.gold}G`); },
  /** 조각 60개 추가: cheat.fragments() */
  fragments(count = 60) {
    for (let i = 0; i < count; i++) {
      GameState.spiritItems.push({ id: Date.now() + i, name: '치트 조각', emoji: '✨', type: 'spirit_part', part: ['head','body','wings','legs','aura','core'][i%6], rarity: 'common', spiritKey: 'fairy' });
    }
    SaveManager.save(); console.log(`조각 ${count}개 추가! 총 ${GameState.spiritItems.length}개`);
  },
};
