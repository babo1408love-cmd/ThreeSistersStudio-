/**
 * currency-system.js — 재화 관리
 * 기본: 골드, 다이아, 기도포인트, 영혼파편
 * 특수: 명예포인트, 길드코인, 이벤트티켓, VIP포인트
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const CURRENCIES = {
  gold:         { name:'골드',       emoji:'💰', cap:999999999 },
  diamond:      { name:'다이아',     emoji:'💎', cap:999999 },
  prayerPoint:  { name:'기도포인트', emoji:'🙏', cap:99999 },
  soulShard:    { name:'영혼파편',   emoji:'👻', cap:99999 },
  honorPoint:   { name:'명예포인트', emoji:'🏆', cap:99999 },
  guildCoin:    { name:'길드코인',   emoji:'🏰', cap:99999 },
  eventTicket:  { name:'이벤트티켓', emoji:'🎫', cap:9999 },
  vipPoint:     { name:'VIP포인트',  emoji:'⭐', cap:99999 },
};

class CurrencySystem {
  constructor() {
    this._log = []; // { type, currencyId, amount, reason, timestamp }
  }

  // ── 초기화 (GameState에 필드 확보) ──
  init() {
    if (!GameState.currencies) {
      GameState.currencies = {};
    }
    for (const id of Object.keys(CURRENCIES)) {
      if (GameState.currencies[id] === undefined) {
        GameState.currencies[id] = 0;
      }
    }
  }

  // ── 잔액 ──
  get(currencyId) {
    this.init();
    return GameState.currencies[currencyId] || 0;
  }

  // ── 추가 ──
  add(currencyId, amount, reason = '') {
    this.init();
    if (!CURRENCIES[currencyId] || amount <= 0) return false;
    const prev = GameState.currencies[currencyId];
    GameState.currencies[currencyId] = Math.min(prev + amount, CURRENCIES[currencyId].cap);
    const actual = GameState.currencies[currencyId] - prev;
    this._logAction('add', currencyId, actual, reason);
    EventBus.emit('currency:changed', { id: currencyId, prev, current: GameState.currencies[currencyId], delta: actual });
    return true;
  }

  // ── 소비 ──
  spend(currencyId, amount, reason = '') {
    this.init();
    if (!CURRENCIES[currencyId] || amount <= 0) return false;
    if (GameState.currencies[currencyId] < amount) return false;
    const prev = GameState.currencies[currencyId];
    GameState.currencies[currencyId] -= amount;
    this._logAction('spend', currencyId, amount, reason);
    EventBus.emit('currency:changed', { id: currencyId, prev, current: GameState.currencies[currencyId], delta: -amount });
    return true;
  }

  // ── 충분한지 체크 ──
  canAfford(currencyId, amount) {
    return this.get(currencyId) >= amount;
  }

  // ── 정보 ──
  getInfo(currencyId) {
    return CURRENCIES[currencyId] || null;
  }

  getAllBalances() {
    this.init();
    const result = {};
    for (const id of Object.keys(CURRENCIES)) {
      result[id] = { ...CURRENCIES[id], amount: GameState.currencies[id] || 0 };
    }
    return result;
  }

  // ── 로그 ──
  _logAction(type, currencyId, amount, reason) {
    this._log.push({ type, currencyId, amount, reason, timestamp: Date.now() });
    if (this._log.length > 200) this._log.shift();
  }

  getLog() { return [...this._log]; }
}

export { CURRENCIES };
export default new CurrencySystem();
