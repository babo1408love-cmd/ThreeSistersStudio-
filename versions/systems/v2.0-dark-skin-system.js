/**
 * skin-system.js — 영웅/무기/이펙트 스킨, 한정/가챠 스킨 관리
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 스킨 정의 ──
const SKIN_DEFS = [
  // 영웅 스킨
  { id: 'hero_knight_gold', name: '황금 기사', type: 'hero', rarity: 'epic', heroId: 'knight', emoji: '🏅', limited: false },
  { id: 'hero_mage_ice', name: '빙결 마법사', type: 'hero', rarity: 'rare', heroId: 'mage', emoji: '🧊', limited: false },
  { id: 'hero_archer_forest', name: '숲의 궁수', type: 'hero', rarity: 'rare', heroId: 'archer', emoji: '🌿', limited: false },
  { id: 'hero_healer_angel', name: '천사 힐러', type: 'hero', rarity: 'epic', heroId: 'healer', emoji: '👼', limited: false },
  { id: 'hero_assassin_shadow', name: '그림자 암살자', type: 'hero', rarity: 'legendary', heroId: 'assassin', emoji: '🌑', limited: false },
  // 시즌 한정 스킨
  { id: 'skin_summer_01', name: '여름 해변 기사', type: 'hero', rarity: 'epic', heroId: 'knight', emoji: '🏖️', limited: true, season: 'summer' },
  { id: 'skin_summer_02', name: '여름 서퍼 궁수', type: 'hero', rarity: 'epic', heroId: 'archer', emoji: '🏄', limited: true, season: 'summer' },
  { id: 'skin_halloween_01', name: '호박 마법사', type: 'hero', rarity: 'legendary', heroId: 'mage', emoji: '🎃', limited: true, season: 'halloween' },
  { id: 'skin_halloween_02', name: '뱀파이어 암살자', type: 'hero', rarity: 'legendary', heroId: 'assassin', emoji: '🧛', limited: true, season: 'halloween' },
  { id: 'skin_xmas_01', name: '산타 힐러', type: 'hero', rarity: 'epic', heroId: 'healer', emoji: '🎅', limited: true, season: 'christmas' },
  { id: 'skin_xmas_02', name: '눈꽃 마법사', type: 'hero', rarity: 'legendary', heroId: 'mage', emoji: '❄️', limited: true, season: 'christmas' },
  { id: 'skin_spring_01', name: '벚꽃 궁수', type: 'hero', rarity: 'epic', heroId: 'archer', emoji: '🌸', limited: true, season: 'spring' },
  // 무기 스킨
  { id: 'wpn_flame_sword', name: '불꽃 검', type: 'weapon', rarity: 'epic', emoji: '🔥', limited: false },
  { id: 'wpn_crystal_staff', name: '수정 지팡이', type: 'weapon', rarity: 'rare', emoji: '🔮', limited: false },
  { id: 'wpn_dark_bow', name: '어둠의 활', type: 'weapon', rarity: 'legendary', emoji: '🏹', limited: false },
  // 이펙트 스킨
  { id: 'fx_rainbow_trail', name: '무지개 트레일', type: 'effect', rarity: 'epic', emoji: '🌈', limited: false },
  { id: 'fx_star_burst', name: '별빛 폭발', type: 'effect', rarity: 'rare', emoji: '⭐', limited: false },
  { id: 'fx_shadow_aura', name: '그림자 오라', type: 'effect', rarity: 'legendary', emoji: '🖤', limited: false },
];

// ── 가챠 확률 ──
const GACHA_RATES = { rare: 0.60, epic: 0.30, legendary: 0.10 };

class SkinSystem {
  init() {
    if (!GameState.skins) {
      GameState.skins = {
        owned: {},       // { skinId: { unlockedAt } }
        equipped: {},    // { heroId: skinId }
        weaponSkin: null,
        effectSkin: null,
      };
    }
  }

  // ── 스킨 해금 ──
  unlock(skinId) {
    this.init();
    const def = SKIN_DEFS.find(s => s.id === skinId);
    if (!def) return false;
    if (GameState.skins.owned[skinId]) return false;
    GameState.skins.owned[skinId] = { unlockedAt: Date.now() };
    EventBus.emit('skin:unlocked', def);
    return true;
  }

  // ── 스킨 장착 ──
  equip(heroId, skinId) {
    this.init();
    if (!GameState.skins.owned[skinId]) return false;
    const def = SKIN_DEFS.find(s => s.id === skinId);
    if (!def) return false;
    if (def.type === 'hero') {
      GameState.skins.equipped[heroId] = skinId;
    } else if (def.type === 'weapon') {
      GameState.skins.weaponSkin = skinId;
    } else if (def.type === 'effect') {
      GameState.skins.effectSkin = skinId;
    }
    EventBus.emit('skin:equipped', { heroId, skinId });
    return true;
  }

  // ── 보유 스킨 목록 ──
  getOwnedSkins() {
    this.init();
    return Object.keys(GameState.skins.owned).map(id => {
      const def = SKIN_DEFS.find(s => s.id === id);
      return def ? { ...def, owned: true } : null;
    }).filter(Boolean);
  }

  // ── 스킨 상점 (미보유 스킨) ──
  getSkinShop() {
    this.init();
    return SKIN_DEFS.filter(s => !s.limited && !GameState.skins.owned[s.id]);
  }

  // ── 가챠 스킨 뽑기 ──
  pullGacha() {
    this.init();
    const roll = Math.random();
    let rarity;
    if (roll < GACHA_RATES.legendary) rarity = 'legendary';
    else if (roll < GACHA_RATES.legendary + GACHA_RATES.epic) rarity = 'epic';
    else rarity = 'rare';
    const pool = SKIN_DEFS.filter(s => s.rarity === rarity && !GameState.skins.owned[s.id]);
    if (pool.length === 0) return null;
    const skin = pool[Math.floor(Math.random() * pool.length)];
    this.unlock(skin.id);
    EventBus.emit('skin:gacha', skin);
    return skin;
  }

  // ── 스킨 정보 ──
  getSkinDef(skinId) {
    return SKIN_DEFS.find(s => s.id === skinId) || null;
  }

  getEquippedSkin(heroId) {
    this.init();
    const skinId = GameState.skins.equipped[heroId];
    return skinId ? this.getSkinDef(skinId) : null;
  }
}

export { SKIN_DEFS, GACHA_RATES };
export default new SkinSystem();
