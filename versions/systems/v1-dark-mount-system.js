/**
 * mount-system.js — 탈것 4종, 등급 강화, 외형 변경, 스킬
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 탈것 정의 ──
const MOUNT_DEFS = [
  {
    id: 'mount_horse', name: '전장의 군마', emoji: '🐴', type: 'horse',
    rarity: 'rare', desc: '이동 속도 30% 증가',
    bonus: { spdPct: 30 },
    grades: ['일반','고급','영웅','전설'],
    skills: ['sprint','charge','trample'],
  },
  {
    id: 'mount_wings', name: '천사의 날개', emoji: '🪽', type: 'wings',
    rarity: 'epic', desc: '비행 이동, 지형 무시',
    bonus: { spdPct: 20, flight: true },
    grades: ['일반','고급','영웅','전설'],
    skills: ['glide','aerial_dash','wind_burst'],
  },
  {
    id: 'mount_mech', name: '강철 기갑', emoji: '🤖', type: 'mech',
    rarity: 'epic', desc: '방어력 20% 증가, 넉백 면역',
    bonus: { defPct: 20, knockbackImmune: true },
    grades: ['일반','고급','영웅','전설'],
    skills: ['shield_ram','missile_barrage','fortress_mode'],
  },
  {
    id: 'mount_dragon', name: '고대 비룡', emoji: '🐲', type: 'dragon',
    rarity: 'legendary', desc: '모든 능력치 15% 증가, 비행',
    bonus: { atkPct: 15, defPct: 15, spdPct: 15, flight: true },
    grades: ['일반','고급','영웅','전설','신화'],
    skills: ['dragon_flight','breath_attack','dragon_roar','ancient_fury'],
  },
];

// ── 한정 탈것 ──
const LIMITED_MOUNTS = [
  { id: 'mount_reindeer', name: '루돌프 순록', emoji: '🦌', type: 'horse', rarity: 'epic', bonus: { spdPct: 35 }, season: 'christmas', grades: ['일반','고급','영웅'], skills: ['dash','gift_drop'] },
  { id: 'mount_broom', name: '마녀의 빗자루', emoji: '🧹', type: 'wings', rarity: 'epic', bonus: { spdPct: 25, flight: true }, season: 'halloween', grades: ['일반','고급','영웅'], skills: ['sweep','hex_trail'] },
];

const ALL_MOUNTS = [...MOUNT_DEFS, ...LIMITED_MOUNTS];
const GRADE_COST = [0, 500, 2000, 8000, 25000];

class MountSystem {
  init() {
    if (!GameState.mounts) {
      GameState.mounts = {
        owned: {},       // { mountId: { grade, appearance, skillLevel } }
        equipped: null,  // mountId
      };
    }
  }

  // ── 탈것 목록 ──
  getMounts() {
    this.init();
    return ALL_MOUNTS.map(def => {
      const data = GameState.mounts.owned[def.id];
      return { ...def, owned: !!data, ...(data || {}) };
    });
  }

  // ── 탈것 획득 ──
  addMount(mountId) {
    this.init();
    const def = ALL_MOUNTS.find(m => m.id === mountId);
    if (!def || GameState.mounts.owned[mountId]) return false;
    GameState.mounts.owned[mountId] = { grade: 0, appearance: 0, skillLevel: 1 };
    EventBus.emit('mount:acquired', def);
    return true;
  }

  // ── 탈것 장착 ──
  equipMount(id) {
    this.init();
    if (!GameState.mounts.owned[id]) return false;
    GameState.mounts.equipped = id;
    EventBus.emit('mount:equipped', { mountId: id });
    return true;
  }

  unequipMount() {
    this.init();
    GameState.mounts.equipped = null;
    EventBus.emit('mount:unequipped');
  }

  // ── 등급 강화 ──
  upgradeMount(id) {
    this.init();
    const mount = GameState.mounts.owned[id];
    const def = ALL_MOUNTS.find(m => m.id === id);
    if (!mount || !def) return false;
    if (mount.grade >= def.grades.length - 1) return false;
    const cost = GRADE_COST[mount.grade + 1] || 9999;
    if (GameState.gold < cost) return false;
    GameState.addGold(-cost);
    mount.grade++;
    // 스킬 해금
    if (def.skills[mount.grade] && mount.skillLevel <= mount.grade) {
      mount.skillLevel = mount.grade + 1;
      EventBus.emit('mount:skillUnlocked', { mountId: id, skill: def.skills[mount.grade] });
    }
    EventBus.emit('mount:upgraded', { mountId: id, grade: mount.grade, gradeName: def.grades[mount.grade] });
    return true;
  }

  // ── 외형 변경 ──
  changeAppearance(id, appearanceIndex) {
    this.init();
    const mount = GameState.mounts.owned[id];
    if (!mount) return false;
    mount.appearance = appearanceIndex;
    EventBus.emit('mount:appearanceChanged', { mountId: id, appearance: appearanceIndex });
    return true;
  }

  // ── 현재 장착 보너스 ──
  getMountBonus() {
    this.init();
    const id = GameState.mounts.equipped;
    if (!id) return {};
    const def = ALL_MOUNTS.find(m => m.id === id);
    const mount = GameState.mounts.owned[id];
    if (!def || !mount) return {};
    // 등급에 따른 보너스 배율 (1.0 ~ 2.0)
    const gradeMult = 1 + mount.grade * 0.25;
    const bonus = {};
    for (const [k, v] of Object.entries(def.bonus)) {
      bonus[k] = typeof v === 'number' ? Math.round(v * gradeMult) : v;
    }
    return bonus;
  }

  // ── 탈것 도감 ──
  getMountCodex() {
    this.init();
    const total = ALL_MOUNTS.length;
    const owned = Object.keys(GameState.mounts.owned).length;
    return { total, owned, rate: total > 0 ? Math.round(owned / total * 100) : 0 };
  }

  getEquippedMount() {
    this.init();
    const id = GameState.mounts.equipped;
    if (!id) return null;
    const def = ALL_MOUNTS.find(m => m.id === id);
    return def ? { ...def, ...GameState.mounts.owned[id] } : null;
  }
}

export { MOUNT_DEFS, LIMITED_MOUNTS, ALL_MOUNTS };
export default new MountSystem();
