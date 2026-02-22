/**
 * enhance-system.js — 장비 강화 / 각성 / 초월 / 재련 / 룬 시스템
 * 강화 +0~+20, 보호 주문서, 각성 1~5차, 초월 1~6성, 재련, 룬 세트
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { RANDOM_OPTION_POOL } from '../data/items.js';

// ── 강화 성공률 테이블 (+0~+20) ──
const ENHANCE_RATES = [
  100,100,100,100,100,100,100,100,100,100, // +0→+10: 100%
  80, 70, 60, 55, 50,                       // +10→+15
  50, 45, 40, 35, 30                        // +15→+20
];

// ── 강화 비용 (레벨 × 기본가) ──
const ENHANCE_COST_BASE = 500;

// ── 각성 레벨 데이터 ──
const AWAKENING_LEVELS = [
  { level:1, materials:3, gold:5000,  statMult:1.10, skill:'각성 오라' },
  { level:2, materials:5, gold:10000, statMult:1.20, skill:'각성 쉴드' },
  { level:3, materials:8, gold:20000, statMult:1.35, skill:'각성 폭발' },
  { level:4, materials:12,gold:40000, statMult:1.50, skill:'각성 연쇄' },
  { level:5, materials:20,gold:80000, statMult:1.75, skill:'각성 궁극기' },
];

// ── 초월 성급 보너스 ──
const TRANSCEND_STARS = [
  { star:1, statBonus:0.05 },
  { star:2, statBonus:0.12 },
  { star:3, statBonus:0.20 },
  { star:4, statBonus:0.30 },
  { star:5, statBonus:0.45 },
  { star:6, statBonus:0.65 },
];

// ── 룬 세트 효과 ──
const RUNE_SETS = {
  power:   { count:2, name:'힘의 룬', effect:{atkPct:12} },
  guard:   { count:2, name:'수호의 룬', effect:{defPct:12} },
  swift:   { count:2, name:'신속의 룬', effect:{spdPct:15} },
  rage:    { count:4, name:'분노의 룬', effect:{critRate:10,critDamage:20} },
  vampire: { count:4, name:'흡혈의 룬', effect:{lifestealPct:8} },
  destiny: { count:6, name:'운명의 룬', effect:{allStatPct:8} },
};

class EnhanceSystem {
  init() {
    if (!GameState.enhance) {
      GameState.enhance = {
        enhanceLevels: {},   // { itemId: level }
        awakenings: {},      // { heroId: level }
        transcends: {},      // { heroId: star }
        runes: {},           // { heroId: [runeId, ...] }
        reforgeCount: 0,
      };
    }
  }

  // ── 장비 강화 ──
  enhance(itemId) {
    this.init();
    const item = GameState.inventory.find(i => i.id === itemId)
      || Object.values(GameState.equipped).find(i => i && i.id === itemId);
    if (!item) return { success:false, error:'아이템을 찾을 수 없습니다' };

    const level = GameState.enhance.enhanceLevels[itemId] || 0;
    if (level >= 20) return { success:false, error:'최대 강화 단계입니다' };

    const cost = ENHANCE_COST_BASE * (level + 1);
    if (GameState.gold < cost) return { success:false, error:'골드가 부족합니다' };

    GameState.gold -= cost;
    const rate = ENHANCE_RATES[level];
    const roll = Math.random() * 100;
    const succeeded = roll < rate;

    if (succeeded) {
      GameState.enhance.enhanceLevels[itemId] = level + 1;
      EventBus.emit('enhance:success', { itemId, level: level + 1 });
    } else {
      // 보호 주문서 체크
      const hasProtect = GameState.inventory.some(i => i.type === 'protect_scroll');
      if (hasProtect && level > 10) {
        GameState.inventory = GameState.inventory.filter(i => {
          if (i.type === 'protect_scroll') { return false; } // 1개 소비
          return true;
        });
        EventBus.emit('enhance:protected', { itemId, level });
      } else if (level > 10) {
        GameState.enhance.enhanceLevels[itemId] = Math.max(0, level - 1);
        EventBus.emit('enhance:downgrade', { itemId, level: level - 1 });
      }
      EventBus.emit('enhance:fail', { itemId, level });
    }

    EventBus.emit('gold:changed', GameState.gold);
    return { success: succeeded, level: GameState.enhance.enhanceLevels[itemId] || 0 };
  }

  getEnhanceLevel(itemId) {
    this.init();
    return GameState.enhance.enhanceLevels[itemId] || 0;
  }

  getEnhanceRate(itemId) {
    const level = this.getEnhanceLevel(itemId);
    return level < 20 ? ENHANCE_RATES[level] : 0;
  }

  // ── 영웅 각성 ──
  awaken(heroId, level) {
    this.init();
    const cur = GameState.enhance.awakenings[heroId] || 0;
    if (level !== cur + 1 || level > 5) return { success:false, error:'잘못된 각성 단계' };

    const req = AWAKENING_LEVELS[level - 1];
    const matCount = GameState.inventory.filter(i => i.type === 'awakening_material').length;
    if (matCount < req.materials) return { success:false, error:'각성 재료 부족' };
    if (GameState.gold < req.gold) return { success:false, error:'골드 부족' };

    // 재료 소비
    let consumed = 0;
    GameState.inventory = GameState.inventory.filter(i => {
      if (i.type === 'awakening_material' && consumed < req.materials) { consumed++; return false; }
      return true;
    });
    GameState.gold -= req.gold;

    GameState.enhance.awakenings[heroId] = level;
    EventBus.emit('enhance:awaken', { heroId, level, skill: req.skill, statMult: req.statMult });
    EventBus.emit('gold:changed', GameState.gold);
    return { success:true, level, skill: req.skill };
  }

  getAwakeningLevel(heroId) {
    this.init();
    return GameState.enhance.awakenings[heroId] || 0;
  }

  // ── 초월 (같은 영웅 합성) ──
  transcend(heroId, materialHeroId) {
    this.init();
    const hero = GameState.heroSlots.find(h => h && h.id === heroId);
    const mat = GameState.inventory.find(h => h.id === materialHeroId && h.type === 'hero');
    if (!hero) return { success:false, error:'영웅을 찾을 수 없습니다' };
    if (!mat || mat.baseId !== hero.baseId) return { success:false, error:'같은 영웅이 필요합니다' };

    const curStar = GameState.enhance.transcends[heroId] || 0;
    if (curStar >= 6) return { success:false, error:'최대 초월 단계입니다' };

    GameState.inventory = GameState.inventory.filter(i => i.id !== materialHeroId);
    const newStar = curStar + 1;
    GameState.enhance.transcends[heroId] = newStar;
    const bonus = TRANSCEND_STARS[newStar - 1].statBonus;

    EventBus.emit('enhance:transcend', { heroId, star: newStar, statBonus: bonus });
    EventBus.emit('inventory:changed', GameState.inventory);
    return { success:true, star: newStar, statBonus: bonus };
  }

  getTranscendStar(heroId) {
    this.init();
    return GameState.enhance.transcends[heroId] || 0;
  }

  // ── 재련 (랜덤 옵션 재부여) ──
  reforge(itemId) {
    this.init();
    const item = GameState.inventory.find(i => i.id === itemId)
      || Object.values(GameState.equipped).find(i => i && i.id === itemId);
    if (!item) return { success:false, error:'아이템을 찾을 수 없습니다' };

    const cost = 2000 + GameState.enhance.reforgeCount * 200;
    if (GameState.gold < cost) return { success:false, error:'골드 부족' };
    GameState.gold -= cost;
    GameState.enhance.reforgeCount++;

    // 1~3개 랜덤 옵션 부여
    const count = 1 + Math.floor(Math.random() * 3);
    const totalWeight = RANDOM_OPTION_POOL.reduce((s, o) => s + o.weight, 0);
    const options = [];
    for (let i = 0; i < count; i++) {
      let r = Math.random() * totalWeight;
      for (const opt of RANDOM_OPTION_POOL) {
        r -= opt.weight;
        if (r <= 0) {
          const value = opt.min + Math.floor(Math.random() * (opt.max - opt.min + 1));
          options.push({ id: opt.id, name: opt.name, value });
          break;
        }
      }
    }

    item.randomOptions = options;
    EventBus.emit('enhance:reforge', { itemId, options });
    EventBus.emit('gold:changed', GameState.gold);
    return { success:true, options };
  }

  // ── 룬 장착 ──
  addRune(heroId, runeId) {
    this.init();
    const rune = GameState.inventory.find(i => i.id === runeId && i.type === 'rune');
    if (!rune) return { success:false, error:'룬을 찾을 수 없습니다' };

    if (!GameState.enhance.runes[heroId]) GameState.enhance.runes[heroId] = [];
    if (GameState.enhance.runes[heroId].length >= 6) return { success:false, error:'룬 슬롯이 가득 찼습니다' };

    GameState.inventory = GameState.inventory.filter(i => i.id !== runeId);
    GameState.enhance.runes[heroId].push(rune);

    const setEffect = this._checkRuneSet(heroId);
    EventBus.emit('enhance:rune_added', { heroId, rune, setEffect });
    EventBus.emit('inventory:changed', GameState.inventory);
    return { success:true, rune, setEffect };
  }

  getHeroRunes(heroId) {
    this.init();
    return GameState.enhance.runes[heroId] || [];
  }

  _checkRuneSet(heroId) {
    const runes = GameState.enhance.runes[heroId] || [];
    const setCounts = {};
    runes.forEach(r => { setCounts[r.setId] = (setCounts[r.setId] || 0) + 1; });

    const active = [];
    for (const [setId, count] of Object.entries(setCounts)) {
      const set = RUNE_SETS[setId];
      if (set && count >= set.count) active.push({ ...set, setId });
    }
    return active;
  }
}

export { ENHANCE_RATES, AWAKENING_LEVELS, TRANSCEND_STARS, RUNE_SETS };
export default new EnhanceSystem();
