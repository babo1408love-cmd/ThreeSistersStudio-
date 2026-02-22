/**
 * trade-system.js — Trading & auction house
 * Auction listings, bidding, currency exchange
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const COMMISSION_RATE = 0.05;  // 5% auction commission
const MAX_LISTINGS = 20;       // per player
const LISTING_DURATION = 86400000; // 24 hours

const EXCHANGE_RATES = {
  gold_to_iron:    { from: 'gold', to: 'iron',    ratio: 10 },   // 10 gold → 1 iron
  gold_to_wood:    { from: 'gold', to: 'wood',    ratio: 5 },    // 5 gold → 1 wood
  gold_to_crystal: { from: 'gold', to: 'crystal', ratio: 25 },   // 25 gold → 1 crystal
  iron_to_gold:    { from: 'iron', to: 'gold',    ratio: 0.08 }, // 1 iron → 12 gold (inverse w/ loss)
  wood_to_gold:    { from: 'wood', to: 'gold',    ratio: 0.15 }, // 1 wood → 6 gold
  crystal_to_gold: { from: 'crystal', to: 'gold', ratio: 0.03 }, // 1 crystal → 33 gold
};

class TradeSystem {
  constructor() {
    this._log = []; // { action, details, timestamp }
  }

  // ── Init ──
  init() {
    if (!GameState.trade) {
      GameState.trade = {
        listings: [],    // [{ id, sellerId, itemId, itemName, emoji, price, currency, bids[], createdAt, expiresAt, status }]
        myListings: [],  // own listing ids
        materials: { iron: 0, wood: 0, crystal: 0 },
        history: [],     // [{ type, itemName, price, timestamp }]
      };
    }
    EventBus.on('daily:reset', () => this._expireListings());
  }

  // ── Auction: List item ──
  listItem(itemId, price, currency = 'gold') {
    this.init();
    const t = GameState.trade;
    if (t.myListings.length >= MAX_LISTINGS) {
      return { success: false, error: `최대 ${MAX_LISTINGS}개까지 등록 가능합니다` };
    }
    const item = GameState.inventory.find(i => i.id === itemId);
    if (!item) return { success: false, error: '아이템을 찾을 수 없습니다' };
    if (price <= 0) return { success: false, error: '가격은 0보다 커야 합니다' };

    const listing = {
      id: Date.now() + Math.random(),
      sellerId: 'self',
      itemId: item.id,
      itemName: item.name || '아이템',
      emoji: item.emoji || '📦',
      price,
      currency,
      currentBid: 0,
      highBidder: null,
      bids: [],
      createdAt: Date.now(),
      expiresAt: Date.now() + LISTING_DURATION,
      status: 'active',
    };

    // Remove from inventory
    GameState.removeItem(itemId);
    t.listings.push(listing);
    t.myListings.push(listing.id);
    this._addLog('list', { itemName: listing.itemName, price });
    EventBus.emit('trade:listed', { listing });
    return { success: true, listing };
  }

  // ── Auction: Bid ──
  bid(listingId, amount) {
    this.init();
    const t = GameState.trade;
    const listing = t.listings.find(l => l.id === listingId);
    if (!listing) return { success: false, error: '매물을 찾을 수 없습니다' };
    if (listing.status !== 'active') return { success: false, error: '종료된 경매입니다' };
    if (listing.sellerId === 'self') return { success: false, error: '자신의 매물에 입찰할 수 없습니다' };
    if (amount <= listing.currentBid) return { success: false, error: '현재 입찰가보다 높아야 합니다' };
    if (Date.now() > listing.expiresAt) {
      listing.status = 'expired';
      return { success: false, error: '경매가 만료되었습니다' };
    }

    // Check currency
    const cur = GameState.currencies?.[listing.currency] ?? GameState.gold ?? 0;
    if (cur < amount) return { success: false, error: '재화가 부족합니다' };

    listing.bids.push({ bidder: 'self', amount, timestamp: Date.now() });
    listing.currentBid = amount;
    listing.highBidder = 'self';
    this._addLog('bid', { listingId, amount });
    EventBus.emit('trade:bid', { listingId, amount });
    return { success: true, currentBid: amount };
  }

  // ── Auction: Complete sale (settle highest bid) ──
  completeListing(listingId) {
    this.init();
    const t = GameState.trade;
    const listing = t.listings.find(l => l.id === listingId);
    if (!listing || listing.status !== 'active') return { success: false };

    if (listing.currentBid > 0) {
      const commission = Math.floor(listing.currentBid * COMMISSION_RATE);
      const proceeds = listing.currentBid - commission;
      listing.status = 'sold';
      t.history.push({ type: 'sold', itemName: listing.itemName, price: proceeds, timestamp: Date.now() });
      EventBus.emit('trade:sold', { listing, proceeds, commission });
      return { success: true, proceeds, commission };
    }
    listing.status = 'expired';
    return { success: false, error: '입찰자가 없습니다' };
  }

  // ── Get active listings ──
  getListings(filter = {}) {
    this.init();
    let results = GameState.trade.listings.filter(l => l.status === 'active');
    if (filter.currency) results = results.filter(l => l.currency === filter.currency);
    if (filter.minPrice) results = results.filter(l => l.price >= filter.minPrice);
    if (filter.maxPrice) results = results.filter(l => l.price <= filter.maxPrice);
    return results;
  }

  getMyListings() {
    this.init();
    const ids = new Set(GameState.trade.myListings);
    return GameState.trade.listings.filter(l => ids.has(l.id));
  }

  // ── Currency exchange ──
  exchangeCurrency(fromType, toType, amount) {
    this.init();
    const key = `${fromType}_to_${toType}`;
    const rate = EXCHANGE_RATES[key];
    if (!rate) return { success: false, error: '지원하지 않는 교환입니다' };
    if (amount <= 0) return { success: false, error: '수량은 0보다 커야 합니다' };

    const t = GameState.trade;
    // Check source: gold from GameState.gold, materials from trade.materials
    const sourcePool = fromType === 'gold' ? 'gold' : 'materials';
    const available = sourcePool === 'gold' ? GameState.gold : (t.materials[fromType] || 0);
    if (available < amount) return { success: false, error: '재료가 부족합니다' };

    const received = Math.floor(amount / rate.ratio);
    if (received <= 0) return { success: false, error: '교환할 수량이 너무 적습니다' };

    // Deduct source
    if (sourcePool === 'gold') GameState.gold -= amount;
    else t.materials[fromType] -= amount;

    // Add target
    const targetPool = toType === 'gold' ? 'gold' : 'materials';
    if (targetPool === 'gold') GameState.addGold(received);
    else t.materials[toType] = (t.materials[toType] || 0) + received;

    this._addLog('exchange', { fromType, toType, spent: amount, received });
    EventBus.emit('trade:exchanged', { fromType, toType, spent: amount, received });
    return { success: true, spent: amount, received };
  }

  // ── Internal ──
  _expireListings() {
    const now = Date.now();
    for (const l of (GameState.trade?.listings || [])) {
      if (l.status === 'active' && now > l.expiresAt) {
        l.status = 'expired';
        EventBus.emit('trade:expired', { listing: l });
      }
    }
  }

  _addLog(action, details) {
    this._log.push({ action, details, timestamp: Date.now() });
    if (this._log.length > 200) this._log.splice(0, 50);
  }

  getTradeHistory() {
    return GameState.trade?.history || [];
  }
}

export { COMMISSION_RATE, EXCHANGE_RATES };
export default new TradeSystem();
