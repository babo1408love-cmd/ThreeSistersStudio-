/**
 * rebirth-system.js — 환생(전생) 시스템
 * 최대 레벨 달성 후 환생 → 레벨 1 리셋 + 영구 스탯 보너스
 * 환생 전용 재화 및 환생 상점
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 환생 조건 ──
const REBIRTH_MIN_LEVEL = 100;
const STAT_BONUS_PER_REBIRTH = 0.02; // +2% per rebirth

// ── 환생 보상 (환생 횟수별) ──
const REBIRTH_MILESTONES = [
  { count:1,  rebirthCoin:100,  bonus:'분노 게이지 +5%' },
  { count:3,  rebirthCoin:300,  bonus:'경험치 획득 +10%' },
  { count:5,  rebirthCoin:600,  bonus:'골드 획득 +15%' },
  { count:10, rebirthCoin:1500, bonus:'치명타율 +5%' },
  { count:20, rebirthCoin:4000, bonus:'모든 스탯 +10%' },
  { count:50, rebirthCoin:12000,bonus:'전설 스킬 해금' },
];

// ── 환생 상점 아이템 ──
const REBIRTH_SHOP = [
  { id:'rs_atk_gem',     name:'공격력 보석',    emoji:'🔴', cost:50,   effect:{type:'permanent_stat', stat:'attack', value:5},    desc:'영구 ATK +5' },
  { id:'rs_def_gem',     name:'방어력 보석',    emoji:'🔵', cost:50,   effect:{type:'permanent_stat', stat:'defense', value:5},   desc:'영구 DEF +5' },
  { id:'rs_hp_gem',      name:'생명력 보석',    emoji:'🟢', cost:50,   effect:{type:'permanent_stat', stat:'maxHp', value:25},    desc:'영구 HP +25' },
  { id:'rs_spd_gem',     name:'속도 보석',      emoji:'🟡', cost:50,   effect:{type:'permanent_stat', stat:'speed', value:2},     desc:'영구 SPD +2' },
  { id:'rs_crit_gem',    name:'치명타 보석',    emoji:'🟣', cost:80,   effect:{type:'permanent_stat', stat:'critRate', value:2},  desc:'영구 CRIT +2%' },
  { id:'rs_exp_scroll',  name:'경험치 스크롤',   emoji:'📜', cost:100,  effect:{type:'exp_mult', value:0.10},  desc:'경험치 획득 +10% (영구)' },
  { id:'rs_gold_scroll', name:'골드 스크롤',     emoji:'📜', cost:100,  effect:{type:'gold_mult', value:0.10}, desc:'골드 획득 +10% (영구)' },
  { id:'rs_rage_ring',   name:'분노의 반지',    emoji:'💍', cost:200,  effect:{type:'permanent_stat', stat:'rageGainRate', value:10}, desc:'분노 게이지 획득 +10%' },
  { id:'rs_protect',     name:'보호 주문서 팩',  emoji:'🛡️', cost:150,  effect:{type:'item', itemType:'protect_scroll', count:5}, desc:'보호 주문서 5개' },
  { id:'rs_awaken_mat',  name:'각성 재료 팩',   emoji:'✨', cost:300,  effect:{type:'item', itemType:'awakening_material', count:3}, desc:'각성 재료 3개' },
  { id:'rs_exclusive',   name:'환생자의 날개',   emoji:'🦋', cost:1000, effect:{type:'exclusive_equip', id:'rebirth_wings'}, desc:'환생 전용 장비 (날개)' },
  { id:'rs_pet_ticket',  name:'전설 펫 티켓',   emoji:'🎫', cost:800,  effect:{type:'pet_ticket', rarity:'legendary'}, desc:'전설 등급 펫 소환권' },
];

class RebirthSystem {
  init() {
    if (!GameState.rebirth) {
      GameState.rebirth = {
        count: 0,            // 환생 횟수
        rebirthCoin: 0,      // 환생 전용 재화
        permanentStats: {},  // { stat: bonusValue }
        expMult: 0,          // 추가 경험치 배율
        goldMult: 0,         // 추가 골드 배율
        purchased: {},       // { shopItemId: count }
        milestonesClaimed: [],
      };
    }
  }

  // ── 환생 가능 여부 ──
  canRebirth() {
    this.init();
    return GameState.heroLevel >= REBIRTH_MIN_LEVEL;
  }

  // ── 환생 실행 ──
  rebirth() {
    this.init();
    if (!this.canRebirth()) return { success:false, error:`레벨 ${REBIRTH_MIN_LEVEL} 이상 필요` };

    const prevCount = GameState.rebirth.count;
    GameState.rebirth.count = prevCount + 1;

    // 환생 코인 지급 (레벨 기반)
    const coinReward = Math.floor(GameState.heroLevel * 1.5) + (prevCount * 10);
    GameState.rebirth.rebirthCoin += coinReward;

    // 마일스톤 체크
    const newMilestones = [];
    REBIRTH_MILESTONES.forEach(m => {
      if (GameState.rebirth.count >= m.count && !GameState.rebirth.milestonesClaimed.includes(m.count)) {
        GameState.rebirth.milestonesClaimed.push(m.count);
        GameState.rebirth.rebirthCoin += m.rebirthCoin;
        newMilestones.push(m);
      }
    });

    // 레벨 리셋 (장비/영웅/인벤토리는 유지)
    GameState.heroLevel = 1;
    GameState.heroExp = 0;
    GameState.currentStage = 1;

    // 스탯 재계산 (영구 보너스 반영)
    GameState.recalcStats();

    EventBus.emit('rebirth:completed', {
      count: GameState.rebirth.count,
      coinReward,
      statBonus: this.getStatBonus(),
      milestones: newMilestones,
    });

    return {
      success: true,
      count: GameState.rebirth.count,
      coinReward,
      milestones: newMilestones,
    };
  }

  // ── 환생 횟수 ──
  getRebirthCount() {
    this.init();
    return GameState.rebirth.count;
  }

  // ── 영구 스탯 보너스 (%) ──
  getStatBonus() {
    this.init();
    const base = GameState.rebirth.count * STAT_BONUS_PER_REBIRTH;
    const permanent = { ...GameState.rebirth.permanentStats };
    return { percentBonus: base, flatBonus: permanent };
  }

  // ── 환생 코인 잔액 ──
  getRebirthCoin() {
    this.init();
    return GameState.rebirth.rebirthCoin;
  }

  // ── 환생 상점 ──
  getRebirthShop() {
    this.init();
    return REBIRTH_SHOP.map(item => ({
      ...item,
      purchased: GameState.rebirth.purchased[item.id] || 0,
      canAfford: GameState.rebirth.rebirthCoin >= item.cost,
    }));
  }

  // ── 환생 상점 구매 ──
  buyShopItem(shopItemId) {
    this.init();
    const item = REBIRTH_SHOP.find(i => i.id === shopItemId);
    if (!item) return { success:false, error:'아이템을 찾을 수 없습니다' };
    if (GameState.rebirth.rebirthCoin < item.cost) return { success:false, error:'환생 코인 부족' };

    GameState.rebirth.rebirthCoin -= item.cost;
    GameState.rebirth.purchased[shopItemId] = (GameState.rebirth.purchased[shopItemId] || 0) + 1;

    // 효과 적용
    const eff = item.effect;
    switch (eff.type) {
      case 'permanent_stat':
        GameState.rebirth.permanentStats[eff.stat] =
          (GameState.rebirth.permanentStats[eff.stat] || 0) + eff.value;
        GameState.recalcStats();
        break;
      case 'exp_mult':
        GameState.rebirth.expMult += eff.value;
        break;
      case 'gold_mult':
        GameState.rebirth.goldMult += eff.value;
        break;
      case 'item':
        for (let i = 0; i < (eff.count || 1); i++) {
          GameState.addItem({ type: eff.itemType, name: item.name, emoji: item.emoji });
        }
        break;
      case 'exclusive_equip':
        GameState.addItem({
          type:'equipment', id: eff.id, name: item.name, emoji: item.emoji,
          slot:'wings', rarity:'legendary',
          stats:{ defense:10, speed:5, maxHp:50 },
          exclusive: true,
        });
        break;
      case 'pet_ticket':
        GameState.addItem({ type:'pet_ticket', rarity: eff.rarity, name: item.name, emoji: item.emoji });
        break;
    }

    EventBus.emit('rebirth:shop_purchase', { item, remaining: GameState.rebirth.rebirthCoin });
    return { success:true, item };
  }

  // ── 현재 적용 중인 배율 ──
  getMultipliers() {
    this.init();
    return {
      exp: 1 + (GameState.rebirth.expMult || 0),
      gold: 1 + (GameState.rebirth.goldMult || 0),
      statPercent: GameState.rebirth.count * STAT_BONUS_PER_REBIRTH,
    };
  }
}

export { REBIRTH_MIN_LEVEL, STAT_BONUS_PER_REBIRTH, REBIRTH_SHOP, REBIRTH_MILESTONES };
export default new RebirthSystem();
