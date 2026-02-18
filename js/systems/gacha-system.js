/**
 * gacha-system.js — 가챠/소환 시스템
 * 4종류: normal(골드), premium(다이아), pickup(픽업), event(이벤트)
 * 등급별 확률, 천장(pity), 10연차 보장
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { HEROES } from '../data/characters.js';

// ── 가챠 종류별 설정 ──
const GACHA_TYPES = {
  normal:  { name:'일반 소환',     cost:{ currency:'gold',    amount:3000 }, multi:10 },
  premium: { name:'프리미엄 소환', cost:{ currency:'diamond',  amount:300  }, multi:10 },
  pickup:  { name:'픽업 소환',     cost:{ currency:'diamond',  amount:300  }, multi:10 },
  event:   { name:'이벤트 소환',   cost:{ currency:'eventTicket', amount:1 }, multi:10 },
};

// ── 등급별 기본 확률 (%) ──
const BASE_RATES = {
  common:    60,
  rare:      25,
  epic:      10,
  legendary:  4,
  mythic:     1,
};

// ── 천장 시스템 ──
const PITY_LEGENDARY = 90;   // 90연차 레전더리 보장
const PITY_MYTHIC    = 180;  // 180연차 미씩 보장

// ── 등급 → 영웅 풀 매핑 ──
function getPoolByRarity(rarity) {
  return HEROES.filter(h => h.rarity === rarity);
}

class GachaSystem {
  init() {
    if (!GameState.gacha) {
      GameState.gacha = {
        pity: { normal:0, premium:0, pickup:0, event:0 },
        history: [],        // { heroId, rarity, type, timestamp }
        pickupHeroId: null, // 현재 픽업 영웅 ID
        totalPulls: { normal:0, premium:0, pickup:0, event:0 },
      };
    }
  }

  // ── 뽑기 실행 ──
  pull(type, count = 1) {
    this.init();
    const config = GACHA_TYPES[type];
    if (!config) return { success:false, error:'잘못된 소환 타입' };

    const totalCost = config.cost.amount * count;
    const { currency } = config.cost;

    // 재화 체크 (gold는 GameState.gold, 나머지는 currencies)
    if (currency === 'gold') {
      if (GameState.gold < totalCost) return { success:false, error:'골드가 부족합니다' };
      GameState.gold -= totalCost;
      EventBus.emit('gold:changed', GameState.gold);
    } else {
      if (!GameState.currencies) GameState.currencies = {};
      const bal = GameState.currencies[currency] || 0;
      if (bal < totalCost) return { success:false, error:`${currency} 부족` };
      GameState.currencies[currency] = bal - totalCost;
      EventBus.emit('currency:changed', { id: currency, current: GameState.currencies[currency] });
    }

    const results = [];
    let hasRare = false;

    for (let i = 0; i < count; i++) {
      const result = this._singlePull(type);
      results.push(result);
      if (result.rarity !== 'common') hasRare = true;
    }

    // 10연차 보장: rare 이상 1개 없으면 마지막을 rare로 교체
    if (count >= 10 && !hasRare) {
      const rarePool = getPoolByRarity('rare');
      if (rarePool.length > 0) {
        const forced = rarePool[Math.floor(Math.random() * rarePool.length)];
        results[results.length - 1] = this._makeResult(forced, 'rare', type);
      }
    }

    // 히스토리 저장
    results.forEach(r => {
      GameState.gacha.history.push(r);
      GameState.gacha.totalPulls[type] = (GameState.gacha.totalPulls[type] || 0) + 1;
    });

    // 히스토리 상한
    if (GameState.gacha.history.length > 500) {
      GameState.gacha.history = GameState.gacha.history.slice(-500);
    }

    EventBus.emit('gacha:pull', { type, count, results });
    return { success:true, results };
  }

  // ── 단일 뽑기 로직 ──
  _singlePull(type) {
    this.init();
    GameState.gacha.pity[type] = (GameState.gacha.pity[type] || 0) + 1;
    const pity = GameState.gacha.pity[type];

    // 천장 체크
    if (pity >= PITY_MYTHIC) {
      GameState.gacha.pity[type] = 0;
      return this._pickFromRarity('mythic', type);
    }
    if (pity >= PITY_LEGENDARY && pity % PITY_LEGENDARY === 0) {
      GameState.gacha.pity[type] = pity; // 레전더리 천장 후 미씩 천장까지 유지
      return this._pickFromRarity('legendary', type);
    }

    // 확률 기반 뽑기
    let roll = Math.random() * 100;
    const rarities = ['mythic', 'legendary', 'epic', 'rare', 'common'];
    for (const rarity of rarities) {
      if (roll < BASE_RATES[rarity]) {
        if (rarity === 'legendary' || rarity === 'mythic') {
          GameState.gacha.pity[type] = 0; // 천장 초기화
        }
        return this._pickFromRarity(rarity, type);
      }
      roll -= BASE_RATES[rarity];
    }
    return this._pickFromRarity('common', type);
  }

  _pickFromRarity(rarity, type) {
    // 픽업 타입: legendary/mythic 시 50% 확률로 픽업 영웅
    if (type === 'pickup' && GameState.gacha.pickupHeroId) {
      if (rarity === 'legendary' || rarity === 'mythic') {
        if (Math.random() < 0.5) {
          const pickup = HEROES.find(h => h.id === GameState.gacha.pickupHeroId);
          if (pickup) return this._makeResult(pickup, rarity, type);
        }
      }
    }

    // 풀에서 고르기 (mythic은 legendary에서 선택)
    let pool = getPoolByRarity(rarity);
    if (pool.length === 0) pool = getPoolByRarity('legendary');
    if (pool.length === 0) pool = getPoolByRarity('epic');

    const hero = pool[Math.floor(Math.random() * pool.length)];
    return this._makeResult(hero, rarity, type);
  }

  _makeResult(hero, rarity, type) {
    return {
      heroId: hero.id,
      name: hero.name,
      emoji: hero.emoji,
      rarity,
      type,
      timestamp: Date.now(),
    };
  }

  // ── 천장 카운트 조회 ──
  getPityCount(type) {
    this.init();
    const pity = GameState.gacha.pity[type] || 0;
    return {
      current: pity,
      untilLegendary: Math.max(0, PITY_LEGENDARY - (pity % PITY_LEGENDARY)),
      untilMythic: Math.max(0, PITY_MYTHIC - pity),
    };
  }

  // ── 히스토리 조회 ──
  getHistory(type = null, limit = 50) {
    this.init();
    let list = GameState.gacha.history;
    if (type) list = list.filter(h => h.type === type);
    return list.slice(-limit);
  }

  // ── 픽업 영웅 설정 ──
  setPickupHero(heroId) {
    this.init();
    GameState.gacha.pickupHeroId = heroId;
    EventBus.emit('gacha:pickup_changed', heroId);
  }

  // ── 총 뽑기 횟수 ──
  getTotalPulls(type) {
    this.init();
    return GameState.gacha.totalPulls[type] || 0;
  }
}

export { GACHA_TYPES, BASE_RATES, PITY_LEGENDARY, PITY_MYTHIC };
export default new GachaSystem();
