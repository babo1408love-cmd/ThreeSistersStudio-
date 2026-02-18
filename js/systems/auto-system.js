/**
 * auto-system.js — 자동 전투/스킬/포션/반복 토글 시스템
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 지원 기능 목록 ──
const FEATURES = ['autoBattle', 'autoSkill', 'autoPotion', 'autoRepeat'];

const FEATURE_INFO = {
  autoBattle:  { name: '자동 전투', desc: '전투를 자동으로 진행합니다', icon: '⚔️' },
  autoSkill:   { name: '자동 스킬', desc: '스킬을 자동으로 사용합니다', icon: '✨' },
  autoPotion:  { name: '자동 포션', desc: 'HP가 낮을 때 포션을 자동 사용합니다', icon: '🧪' },
  autoRepeat:  { name: '자동 반복', desc: '스테이지 클리어 후 자동 재도전합니다', icon: '🔄' },
};

// ── 자동 포션 기본 임계값 ──
const DEFAULT_POTION_THRESHOLD = 30; // HP 30% 이하 시 자동 사용

class AutoSystem {
  init() {
    if (!GameState.autoSettings) {
      GameState.autoSettings = {
        autoBattle: false,
        autoSkill: false,
        autoPotion: false,
        autoRepeat: false,
        potionThreshold: DEFAULT_POTION_THRESHOLD,
      };
    }
    this._bindEvents();
  }

  _bindEvents() {
    EventBus.on('combat:tick', (dt) => this._onCombatTick(dt));
    EventBus.on('stage:cleared', () => this._onStageCleared());
  }

  // ── 기능 토글 ──
  toggle(feature) {
    if (!FEATURES.includes(feature)) return false;
    this.init();
    GameState.autoSettings[feature] = !GameState.autoSettings[feature];
    EventBus.emit('auto:toggled', { feature, enabled: GameState.autoSettings[feature] });
    return GameState.autoSettings[feature];
  }

  // ── 기능 활성 여부 ──
  isEnabled(feature) {
    this.init();
    return !!GameState.autoSettings[feature];
  }

  // ── 전체 설정 반환 ──
  getSettings() {
    this.init();
    return { ...GameState.autoSettings };
  }

  // ── 포션 임계값 설정 ──
  setPotionThreshold(percent) {
    this.init();
    GameState.autoSettings.potionThreshold = Math.max(10, Math.min(80, percent));
    EventBus.emit('auto:potionThreshold', GameState.autoSettings.potionThreshold);
  }

  // ── 기능 정보 ──
  getFeatureInfo(feature) {
    return FEATURE_INFO[feature] || null;
  }

  getAllFeatures() {
    return FEATURES.map(f => ({ id: f, ...FEATURE_INFO[f], enabled: this.isEnabled(f) }));
  }

  // ── 전투 틱 처리 ──
  _onCombatTick(dt) {
    if (!GameState.autoSettings) return;
    if (GameState.autoSettings.autoPotion) {
      const p = GameState.player;
      const threshold = GameState.autoSettings.potionThreshold || DEFAULT_POTION_THRESHOLD;
      if (p.hp / p.maxHp * 100 <= threshold) {
        EventBus.emit('auto:usePotion');
      }
    }
    if (GameState.autoSettings.autoSkill) {
      EventBus.emit('auto:useSkill');
    }
  }

  // ── 스테이지 클리어 시 자동 반복 ──
  _onStageCleared() {
    if (GameState.autoSettings?.autoRepeat) {
      EventBus.emit('auto:repeatStage');
    }
  }
}

export { FEATURES, FEATURE_INFO };
export default new AutoSystem();
