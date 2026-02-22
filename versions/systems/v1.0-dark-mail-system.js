/**
 * mail-system.js — Mail (system, reward, friend)
 * 30-day retention, bulk collect, attachments
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

const MAIL_RETENTION_MS = 30 * 86400000; // 30 days
const MAIL_TYPES = { system: '시스템', reward: '보상', friend: '친구' };
const MAX_INBOX = 200;

class MailSystem {
  constructor() {
    this._unreadCount = 0;
  }

  // ── Init ──
  init() {
    if (!GameState.mail) {
      GameState.mail = {
        inbox: [],  // [{ id, type, from, subject, content, attachments[], read, collected, createdAt }]
        sent: [],
      };
    }
    this.deleteExpired();
    this._updateUnreadCount();
    EventBus.on('daily:reset', () => this.deleteExpired());
  }

  // ── Send mail ──
  send(type, to, content, attachments = []) {
    if (!MAIL_TYPES[type]) return { success: false, error: '잘못된 메일 타입입니다' };
    const mail = {
      id: Date.now() + Math.random(),
      type,
      from: type === 'system' ? '시스템' : GameState.playerName,
      to: to || 'self',
      subject: this._generateSubject(type, content),
      content,
      attachments: attachments.map(a => ({ ...a, collected: false })),
      read: false,
      collected: attachments.length === 0,
      createdAt: Date.now(),
    };
    // If sent to self or type is system/reward, add to inbox
    if (to === 'self' || type === 'system' || type === 'reward') {
      if (GameState.mail.inbox.length >= MAX_INBOX) {
        // Remove oldest read mail
        const oldest = GameState.mail.inbox.findIndex(m => m.read && m.collected);
        if (oldest !== -1) GameState.mail.inbox.splice(oldest, 1);
        else return { success: false, error: '우편함이 가득 찼습니다' };
      }
      GameState.mail.inbox.push(mail);
    }
    GameState.mail.sent.push({ id: mail.id, to, subject: mail.subject, createdAt: mail.createdAt });
    if (GameState.mail.sent.length > 50) GameState.mail.sent.shift();
    this._updateUnreadCount();
    EventBus.emit('mail:received', { mail });
    return { success: true, mail };
  }

  // ── Get inbox ──
  getInbox(filter = {}) {
    this.init();
    let inbox = [...GameState.mail.inbox].sort((a, b) => b.createdAt - a.createdAt);
    if (filter.type) inbox = inbox.filter(m => m.type === filter.type);
    if (filter.unreadOnly) inbox = inbox.filter(m => !m.read);
    if (filter.uncollectedOnly) inbox = inbox.filter(m => !m.collected);
    return inbox;
  }

  // ── Read a mail ──
  read(mailId) {
    this.init();
    const mail = GameState.mail.inbox.find(m => m.id === mailId);
    if (!mail) return { success: false, error: '메일을 찾을 수 없습니다' };
    mail.read = true;
    this._updateUnreadCount();
    EventBus.emit('mail:read', { mailId });
    return { success: true, mail };
  }

  // ── Collect single mail attachment ──
  collectAttachment(mailId) {
    this.init();
    const mail = GameState.mail.inbox.find(m => m.id === mailId);
    if (!mail) return { success: false, error: '메일을 찾을 수 없습니다' };
    if (mail.collected) return { success: false, error: '이미 수령했습니다' };

    const collected = [];
    for (const att of mail.attachments) {
      if (att.collected) continue;
      att.collected = true;
      collected.push(att);
      this._applyAttachment(att);
    }
    mail.collected = true;
    mail.read = true;
    this._updateUnreadCount();
    EventBus.emit('mail:collected', { mailId, collected });
    return { success: true, collected };
  }

  // ── Bulk collect all ──
  collectAll() {
    this.init();
    const results = [];
    for (const mail of GameState.mail.inbox) {
      if (mail.collected || mail.attachments.length === 0) continue;
      for (const att of mail.attachments) {
        if (att.collected) continue;
        att.collected = true;
        results.push(att);
        this._applyAttachment(att);
      }
      mail.collected = true;
      mail.read = true;
    }
    this._updateUnreadCount();
    EventBus.emit('mail:collectedAll', { count: results.length, items: results });
    return { success: true, count: results.length, items: results };
  }

  // ── Delete expired ──
  deleteExpired() {
    if (!GameState.mail) return 0;
    const now = Date.now();
    const before = GameState.mail.inbox.length;
    GameState.mail.inbox = GameState.mail.inbox.filter(m => now - m.createdAt < MAIL_RETENTION_MS);
    const deleted = before - GameState.mail.inbox.length;
    if (deleted > 0) {
      this._updateUnreadCount();
      EventBus.emit('mail:expiredDeleted', { count: deleted });
    }
    return deleted;
  }

  // ── Delete specific mail ──
  delete(mailId) {
    this.init();
    const idx = GameState.mail.inbox.findIndex(m => m.id === mailId);
    if (idx === -1) return { success: false, error: '메일을 찾을 수 없습니다' };
    const mail = GameState.mail.inbox[idx];
    if (!mail.collected && mail.attachments.length > 0) {
      return { success: false, error: '첨부물을 먼저 수령해주세요' };
    }
    GameState.mail.inbox.splice(idx, 1);
    this._updateUnreadCount();
    EventBus.emit('mail:deleted', { mailId });
    return { success: true };
  }

  // ── Unread count ──
  getUnreadCount() { return this._unreadCount; }

  // ── Internal ──
  _updateUnreadCount() {
    this._unreadCount = (GameState.mail?.inbox || []).filter(m => !m.read).length;
    EventBus.emit('mail:unreadChanged', { count: this._unreadCount });
  }

  _generateSubject(type, content) {
    if (type === 'system') return '시스템 안내';
    if (type === 'reward') return '보상 도착!';
    return typeof content === 'string' ? content.slice(0, 30) : '친구의 편지';
  }

  _applyAttachment(att) {
    // Apply attachment rewards to GameState
    switch (att.type) {
      case 'gold':
        GameState.addGold(att.amount || 0);
        break;
      case 'currency':
        if (GameState.currencies && att.currencyId) {
          GameState.currencies[att.currencyId] = (GameState.currencies[att.currencyId] || 0) + (att.amount || 0);
          EventBus.emit('currency:changed', { id: att.currencyId, delta: att.amount });
        }
        break;
      case 'item':
        if (att.item) GameState.addItem(att.item);
        break;
      default:
        break;
    }
  }
}

export { MAIL_TYPES, MAIL_RETENTION_MS };
export default new MailSystem();
