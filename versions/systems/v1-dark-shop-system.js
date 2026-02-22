/**
 * shop-system.js — Shop & packages
 * Normal shop (gold/diamond/event), special shop (guild/PvP/season), packages
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const SHOP_DEFS = {
  gold: {
    name: '골드 상점', refreshHours: 6,
    items: [
      { id: 'hp_potion_s',  name: '소형 HP 포션',   emoji: '🧪', cost: { currency: 'gold', amount: 200 },  stock: 10, type: 'consumable' },
      { id: 'hp_potion_m',  name: '중형 HP 포션',   emoji: '🧴', cost: { currency: 'gold', amount: 500 },  stock: 5,  type: 'consumable' },
      { id: 'hp_potion_l',  name: '대형 HP 포션',   emoji: '🏺', cost: { currency: 'gold', amount: 1200 }, stock: 3,  type: 'consumable' },
      { id: 'mat_iron',     name: '철 광석',        emoji: '🪨', cost: { currency: 'gold', amount: 300 },  stock: 20, type: 'material' },
      { id: 'mat_wood',     name: '목재',           emoji: '🪵', cost: { currency: 'gold', amount: 150 },  stock: 20, type: 'material' },
      { id: 'mat_crystal',  name: '수정 파편',      emoji: '🔮', cost: { currency: 'gold', amount: 800 },  stock: 10, type: 'material' },
    ],
  },
  diamond: {
    name: '다이아 상점', refreshHours: 24,
    items: [
      { id: 'summon_ticket',  name: '소환 티켓',     emoji: '🎟️', cost: { currency: 'diamond', amount: 300 },  stock: 5,  type: 'ticket' },
      { id: 'stamina_refill', name: '스태미나 충전',  emoji: '⚡',  cost: { currency: 'diamond', amount: 100 },  stock: 3,  type: 'consumable' },
      { id: 'gold_box',       name: '골드 상자',     emoji: '📦', cost: { currency: 'diamond', amount: 200 },  stock: 1,  type: 'box' },
    ],
  },
  event: {
    name: '이벤트 상점', refreshHours: 0,
    items: [
      { id: 'evt_skin',  name: '한정 스킨',   emoji: '🎭', cost: { currency: 'eventTicket', amount: 100 }, stock: 1, type: 'cosmetic' },
      { id: 'evt_pet',   name: '이벤트 펫',   emoji: '🐣', cost: { currency: 'eventTicket', amount: 200 }, stock: 1, type: 'pet' },
    ],
  },
  guild: {
    name: '길드 상점', refreshHours: 168,
    items: [
      { id: 'guild_box',    name: '길드 상자',    emoji: '🎁', cost: { currency: 'guildCoin', amount: 500 },  stock: 3, type: 'box' },
      { id: 'guild_buff',   name: '길드 공격 버프', emoji: '⚔️', cost: { currency: 'guildCoin', amount: 300 },  stock: 1, type: 'buff' },
    ],
  },
  pvp: {
    name: 'PvP 상점', refreshHours: 168,
    items: [
      { id: 'pvp_weapon',  name: '명예의 검',    emoji: '🗡️', cost: { currency: 'honorPoint', amount: 1000 }, stock: 1, type: 'equipment' },
      { id: 'pvp_armor',   name: '명예의 갑옷',  emoji: '🛡️', cost: { currency: 'honorPoint', amount: 800 },  stock: 1, type: 'equipment' },
    ],
  },
  season: {
    name: '시즌 상점', refreshHours: 0,
    items: [
      { id: 'season_frame', name: '시즌 프레임',  emoji: '🖼️', cost: { currency: 'diamond', amount: 500 },  stock: 1, type: 'cosmetic' },
      { id: 'season_title', name: '시즌 칭호',   emoji: '📛', cost: { currency: 'diamond', amount: 300 },  stock: 1, type: 'cosmetic' },
    ],
  },
};

const PACKAGES = [
  { id: 'pkg_beginner', name: '초보자 패키지',  emoji: '🌱', cost: { currency: 'diamond', amount: 500 },  once: true,  contents: [{ id: 'hp_potion_l', qty: 5 }, { id: 'summon_ticket', qty: 3 }] },
  { id: 'pkg_growth',   name: '성장 패키지',   emoji: '🌿', cost: { currency: 'diamond', amount: 1000 }, once: true,  contents: [{ id: 'mat_crystal', qty: 20 }, { id: 'gold_box', qty: 3 }] },
  { id: 'pkg_limited',  name: '한정 패키지',   emoji: '🔥', cost: { currency: 'diamond', amount: 2000 }, once: false, contents: [{ id: 'summon_ticket', qty: 10 }, { id: 'stamina_refill', qty: 5 }] },
  { id: 'pkg_season',   name: '시즌 패키지',   emoji: '🌸', cost: { currency: 'diamond', amount: 1500 }, once: false, contents: [{ id: 'season_frame', qty: 1 }, { id: 'gold_box', qty: 5 }] },
];

class ShopSystem {
  constructor() {
    this._purchaseLog = [];
  }

  init() {
    if (!GameState.shop) {
      GameState.shop = { purchases: {}, refreshTimers: {}, packagesPurchased: [] };
    }
  }

  // ── Get shop data with stock remaining ──
  getShop(shopId) {
    this.init();
    const def = SHOP_DEFS[shopId];
    if (!def) return null;
    const purchases = GameState.shop.purchases[shopId] || {};
    const items = def.items.map(item => ({
      ...item,
      remaining: item.stock - (purchases[item.id] || 0),
    }));
    const lastRefresh = GameState.shop.refreshTimers[shopId] || 0;
    const refreshMs = def.refreshHours * 3600000;
    const canRefresh = refreshMs > 0 && (Date.now() - lastRefresh >= refreshMs);
    return { id: shopId, name: def.name, items, canRefresh };
  }

  // ── Buy item ──
  buy(shopId, itemId) {
    this.init();
    const def = SHOP_DEFS[shopId];
    if (!def) return { success: false, error: '상점을 찾을 수 없습니다' };
    const item = def.items.find(i => i.id === itemId);
    if (!item) return { success: false, error: '아이템을 찾을 수 없습니다' };
    if (!GameState.shop.purchases[shopId]) GameState.shop.purchases[shopId] = {};
    const bought = GameState.shop.purchases[shopId][itemId] || 0;
    if (bought >= item.stock) return { success: false, error: '재고 소진' };
    // Spend currency via event (currency-system listens)
    const canSpend = EventBus.emit('currency:trySpend', {
      currency: item.cost.currency, amount: item.cost.amount, reason: `shop:${shopId}:${itemId}`
    });
    // Direct fallback: check GameState.currencies
    const cur = GameState.currencies?.[item.cost.currency] ?? 0;
    if (cur < item.cost.amount) return { success: false, error: '재화가 부족합니다' };
    GameState.currencies[item.cost.currency] -= item.cost.amount;
    GameState.shop.purchases[shopId][itemId] = bought + 1;
    this._purchaseLog.push({ shopId, itemId, timestamp: Date.now() });
    EventBus.emit('shop:purchased', { shopId, itemId, cost: item.cost });
    return { success: true, item };
  }

  // ── Refresh shop stock ──
  refreshShop(shopId) {
    this.init();
    const def = SHOP_DEFS[shopId];
    if (!def) return false;
    GameState.shop.purchases[shopId] = {};
    GameState.shop.refreshTimers[shopId] = Date.now();
    EventBus.emit('shop:refreshed', { shopId });
    return true;
  }

  // ── Packages ──
  getPackages() {
    this.init();
    return PACKAGES.map(p => ({
      ...p,
      purchased: GameState.shop.packagesPurchased.includes(p.id),
      available: !p.once || !GameState.shop.packagesPurchased.includes(p.id),
    }));
  }

  buyPackage(packageId) {
    this.init();
    const pkg = PACKAGES.find(p => p.id === packageId);
    if (!pkg) return { success: false, error: '패키지를 찾을 수 없습니다' };
    if (pkg.once && GameState.shop.packagesPurchased.includes(packageId)) {
      return { success: false, error: '이미 구매한 패키지입니다' };
    }
    const cur = GameState.currencies?.[pkg.cost.currency] ?? 0;
    if (cur < pkg.cost.amount) return { success: false, error: '재화가 부족합니다' };
    GameState.currencies[pkg.cost.currency] -= pkg.cost.amount;
    GameState.shop.packagesPurchased.push(packageId);
    EventBus.emit('shop:packagePurchased', { packageId, contents: pkg.contents });
    return { success: true, contents: pkg.contents };
  }
}

export { SHOP_DEFS, PACKAGES };
export default new ShopSystem();
