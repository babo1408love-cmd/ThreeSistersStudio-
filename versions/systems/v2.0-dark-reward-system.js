/**
 * reward-system.js — 전투/출석/랭킹/로그인룰렛 보상
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import CurrencySystem from './currency-system.js';

// ── 출석 보상 (7일) ──
const DAILY_LOGIN_REWARDS = [
  { day:1, rewards:{gold:500} },
  { day:2, rewards:{gold:500, soulShard:5} },
  { day:3, rewards:{diamond:10} },
  { day:4, rewards:{gold:1000} },
  { day:5, rewards:{diamond:20, soulShard:10} },
  { day:6, rewards:{gold:2000, prayerPoint:20} },
  { day:7, rewards:{diamond:50, gold:5000, soulShard:20} },
];

// ── 월간 누적 보상 ──
const MONTHLY_MILESTONES = [
  { days:7,  rewards:{diamond:30} },
  { days:14, rewards:{diamond:50, gold:5000} },
  { days:21, rewards:{diamond:80, soulShard:30} },
  { days:28, rewards:{diamond:150, gold:10000, soulShard:50} },
];

// ── 복귀 유저 보상 ──
const RETURNING_REWARD = { gold:10000, diamond:100, soulShard:50, prayerPoint:50 };

// ── 로그인 룰렛 ──
const ROULETTE_ITEMS = [
  { id:'r_gold_s', name:'골드 500', reward:{gold:500}, weight:30 },
  { id:'r_gold_m', name:'골드 2000', reward:{gold:2000}, weight:15 },
  { id:'r_gold_l', name:'골드 5000', reward:{gold:5000}, weight:5 },
  { id:'r_dia_s', name:'다이아 5', reward:{diamond:5}, weight:20 },
  { id:'r_dia_m', name:'다이아 20', reward:{diamond:20}, weight:8 },
  { id:'r_dia_l', name:'다이아 50', reward:{diamond:50}, weight:2 },
  { id:'r_soul', name:'영혼파편 10', reward:{soulShard:10}, weight:12 },
  { id:'r_prayer', name:'기도포인트 20', reward:{prayerPoint:20}, weight:8 },
];

class RewardSystem {
  init() {
    if (!GameState.rewardData) {
      GameState.rewardData = {
        loginStreak: 0,
        lastLoginDate: null,
        monthlyDays: 0,
        monthId: null,
        rouletteUsedToday: false,
        rouletteDate: null,
      };
    }
  }

  // ── 전투 보상 지급 ──
  grantBattleRewards(stageRewards, isFirstClear = false) {
    this.init();
    const granted = {};
    if (stageRewards.gold) {
      CurrencySystem.add('gold', stageRewards.gold, 'battle');
      granted.gold = stageRewards.gold;
    }
    if (stageRewards.exp) {
      granted.exp = stageRewards.exp;
    }
    if (isFirstClear && stageRewards.firstClear) {
      for (const [k, v] of Object.entries(stageRewards.firstClear)) {
        CurrencySystem.add(k === 'diamonds' ? 'diamond' : k, v, 'first_clear');
        granted[k] = v;
      }
    }
    EventBus.emit('reward:battle', granted);
    return granted;
  }

  // ── 출석 체크 ──
  checkDailyLogin() {
    this.init();
    const today = new Date().toDateString();
    const rd = GameState.rewardData;

    if (rd.lastLoginDate === today) return null; // 이미 출석

    // 연속 출석 체크
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (rd.lastLoginDate === yesterday) {
      rd.loginStreak = (rd.loginStreak % 7) + 1;
    } else {
      rd.loginStreak = 1;
    }
    rd.lastLoginDate = today;

    // 월간 누적
    const monthId = `${new Date().getFullYear()}-${new Date().getMonth()}`;
    if (rd.monthId !== monthId) {
      rd.monthId = monthId;
      rd.monthlyDays = 0;
    }
    rd.monthlyDays++;

    // 출석 보상
    const dayReward = DAILY_LOGIN_REWARDS.find(d => d.day === rd.loginStreak);
    if (dayReward) {
      for (const [k, v] of Object.entries(dayReward.rewards)) {
        CurrencySystem.add(k, v, 'daily_login');
      }
    }

    // 월간 마일스톤
    const milestone = MONTHLY_MILESTONES.find(m => m.days === rd.monthlyDays);
    if (milestone) {
      for (const [k, v] of Object.entries(milestone.rewards)) {
        CurrencySystem.add(k, v, 'monthly_milestone');
      }
    }

    // 룰렛 리셋
    if (rd.rouletteDate !== today) {
      rd.rouletteUsedToday = false;
      rd.rouletteDate = today;
    }

    EventBus.emit('reward:daily_login', { streak: rd.loginStreak, day: dayReward, milestone });
    return { streak: rd.loginStreak, rewards: dayReward?.rewards, milestone: milestone?.rewards };
  }

  // ── 로그인 룰렛 ──
  spinRoulette() {
    this.init();
    const rd = GameState.rewardData;
    const today = new Date().toDateString();
    if (rd.rouletteDate === today && rd.rouletteUsedToday) return null;

    // 가중 랜덤
    const totalWeight = ROULETTE_ITEMS.reduce((sum, i) => sum + i.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = ROULETTE_ITEMS[0];
    for (const item of ROULETTE_ITEMS) {
      roll -= item.weight;
      if (roll <= 0) { selected = item; break; }
    }

    // 지급
    for (const [k, v] of Object.entries(selected.reward)) {
      CurrencySystem.add(k, v, 'roulette');
    }

    rd.rouletteUsedToday = true;
    rd.rouletteDate = today;

    EventBus.emit('reward:roulette', selected);
    return selected;
  }

  // ── 복귀 보상 (7일 이상 미접속) ──
  checkReturningReward() {
    this.init();
    const rd = GameState.rewardData;
    if (!rd.lastLoginDate) return null;
    const lastDate = new Date(rd.lastLoginDate);
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
    if (daysSince >= 7) {
      for (const [k, v] of Object.entries(RETURNING_REWARD)) {
        CurrencySystem.add(k, v, 'returning_user');
      }
      EventBus.emit('reward:returning', RETURNING_REWARD);
      return RETURNING_REWARD;
    }
    return null;
  }
}

export { DAILY_LOGIN_REWARDS, MONTHLY_MILESTONES, ROULETTE_ITEMS };
export default new RewardSystem();
