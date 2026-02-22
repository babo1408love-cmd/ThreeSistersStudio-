/**
 * achievement-system.js — 업적/칭호 시스템
 * 전투/수집/특수(히든) 업적, 칭호 보상
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 전투 업적 ──
const BATTLE_ACHIEVEMENTS = [
  { id:'kill_100',    name:'초보 사냥꾼',    desc:'적 100마리 처치',        condition:{type:'kills', target:100},   rewards:{gold:1000} },
  { id:'kill_1000',   name:'숙련 사냥꾼',    desc:'적 1,000마리 처치',      condition:{type:'kills', target:1000},  rewards:{gold:5000, diamond:20} },
  { id:'kill_10000',  name:'전설의 사냥꾼',   desc:'적 10,000마리 처치',     condition:{type:'kills', target:10000}, rewards:{gold:20000, diamond:100, title:'학살자'} },
  { id:'boss_10',     name:'보스 킬러',       desc:'보스 10회 처치',         condition:{type:'boss_kills', target:10},  rewards:{gold:3000, diamond:30} },
  { id:'boss_50',     name:'보스 헌터',       desc:'보스 50회 처치',         condition:{type:'boss_kills', target:50},  rewards:{gold:10000, diamond:80, title:'보스 슬레이어'} },
  { id:'boss_100',    name:'보스 마스터',     desc:'보스 100회 처치',        condition:{type:'boss_kills', target:100}, rewards:{gold:30000, title:'마왕 사냥꾼'} },
  { id:'nodmg_1',     name:'완벽한 회피',     desc:'무피격 스테이지 1회 클리어', condition:{type:'no_damage_clear', target:1},  rewards:{gold:2000, diamond:10} },
  { id:'nodmg_10',    name:'무적의 전사',     desc:'무피격 스테이지 10회 클리어', condition:{type:'no_damage_clear', target:10}, rewards:{diamond:50, title:'무적'} },
];

// ── 수집 업적 ──
const COLLECTION_ACHIEVEMENTS = [
  { id:'hero_10',    name:'동료 수집가',     desc:'영웅 10종 수집',     condition:{type:'heroes_collected', target:10}, rewards:{gold:2000, diamond:15} },
  { id:'hero_20',    name:'영웅 매니아',     desc:'영웅 20종 수집',     condition:{type:'heroes_collected', target:20}, rewards:{gold:5000, diamond:40, title:'영웅 수집가'} },
  { id:'hero_50',    name:'전설의 소환사',    desc:'영웅 50종 수집',     condition:{type:'heroes_collected', target:50}, rewards:{gold:15000, diamond:100, title:'소환의 달인'} },
  { id:'item_50',    name:'아이템 수집 I',   desc:'아이템 50종 도감',    condition:{type:'item_codex', target:50},  rewards:{gold:3000} },
  { id:'item_100',   name:'아이템 수집 II',  desc:'아이템 100종 도감',   condition:{type:'item_codex', target:100}, rewards:{gold:8000, diamond:30, title:'감정사'} },
  { id:'monster_30',  name:'몬스터 도감 I',  desc:'몬스터 30종 도감',    condition:{type:'monster_codex', target:30},  rewards:{gold:2000} },
  { id:'monster_80',  name:'몬스터 도감 II', desc:'몬스터 80종 도감',    condition:{type:'monster_codex', target:80},  rewards:{gold:6000, diamond:25, title:'몬스터 박사'} },
];

// ── 히든 업적 20종 ──
const HIDDEN_ACHIEVEMENTS = [
  { id:'h_first_death', name:'첫 죽음',       desc:'처음으로 사망',          condition:{type:'deaths', target:1},  hidden:true, rewards:{gold:500} },
  { id:'h_rich',        name:'부자',           desc:'골드 100만 달성',        condition:{type:'gold_total', target:1000000}, hidden:true, rewards:{diamond:100, title:'부자'} },
  { id:'h_speed_clear', name:'스피드 클리어',   desc:'1분 안에 스테이지 클리어', condition:{type:'speed_clear_60s', target:1}, hidden:true, rewards:{diamond:20} },
  { id:'h_rage_100',    name:'분노 폭발',      desc:'분노게이지 100회 도달',   condition:{type:'rage_full', target:100}, hidden:true, rewards:{gold:5000} },
  { id:'h_pet_heal_50', name:'펫 치유사',      desc:'펫 힐 50회',             condition:{type:'pet_heals', target:50}, hidden:true, rewards:{gold:3000} },
  { id:'h_enhance_20',  name:'강화 마스터',     desc:'+20 강화 달성',          condition:{type:'max_enhance', target:1}, hidden:true, rewards:{diamond:200, title:'강화의 신'} },
  { id:'h_gacha_100',   name:'소환 중독',      desc:'가챠 100회 뽑기',         condition:{type:'gacha_pulls', target:100}, hidden:true, rewards:{diamond:30} },
  { id:'h_rebirth_1',   name:'환생자',         desc:'첫 환생 달성',            condition:{type:'rebirth', target:1}, hidden:true, rewards:{gold:10000} },
  { id:'h_all_class',   name:'만능 영웅',      desc:'모든 클래스 영웅 보유',    condition:{type:'all_classes', target:4}, hidden:true, rewards:{diamond:50, title:'만능인'} },
  { id:'h_lucky',       name:'행운아',         desc:'미씩 등급 자연 획득',      condition:{type:'mythic_pull', target:1}, hidden:true, rewards:{gold:8000} },
  { id:'h_combo_50',    name:'콤보 달인',      desc:'50콤보 달성',             condition:{type:'combo', target:50}, hidden:true, rewards:{gold:3000} },
  { id:'h_candy_clear', name:'사탕 마스터',     desc:'캔디매치 100회 클리어',    condition:{type:'candy_clear', target:100}, hidden:true, rewards:{diamond:15} },
  { id:'h_marble_ace',  name:'구슬 에이스',     desc:'마블슛 100회 클리어',     condition:{type:'marble_clear', target:100}, hidden:true, rewards:{diamond:15} },
  { id:'h_treasure',    name:'보물 사냥꾼',     desc:'보물상자 200개 개봉',     condition:{type:'chests_opened', target:200}, hidden:true, rewards:{diamond:25, title:'보물 사냥꾼'} },
  { id:'h_spirit_20',   name:'정령 친구',      desc:'정령 20마리 소환',        condition:{type:'spirits_summoned', target:20}, hidden:true, rewards:{gold:5000} },
  { id:'h_awaken_5',    name:'각성의 끝',      desc:'5차 각성 달성',           condition:{type:'max_awaken', target:1}, hidden:true, rewards:{diamond:150, title:'각성자'} },
  { id:'h_trans_6',     name:'초월의 극',      desc:'6성 초월 달성',           condition:{type:'max_transcend', target:1}, hidden:true, rewards:{diamond:300, title:'초월자'} },
  { id:'h_login_30',    name:'30일 출석',      desc:'30일 연속 접속',          condition:{type:'login_days', target:30}, hidden:true, rewards:{diamond:50} },
  { id:'h_no_enhance',  name:'무강화 클리어',   desc:'강화 없이 50스테이지',    condition:{type:'no_enhance_stage', target:50}, hidden:true, rewards:{diamond:100, title:'하드코어'} },
  { id:'h_full_rune',   name:'룬 마스터',      desc:'영웅에 룬 6개 장착',      condition:{type:'full_rune', target:1}, hidden:true, rewards:{diamond:80, title:'룬 마스터'} },
];

// ── 칭호 30종 (업적 보상에서 부여) ──
const ALL_TITLES = [
  '학살자','보스 슬레이어','마왕 사냥꾼','무적','영웅 수집가','소환의 달인',
  '감정사','몬스터 박사','부자','강화의 신','만능인','보물 사냥꾼','각성자',
  '초월자','하드코어','룬 마스터','전설의 모험가','별의 수호자','불꽃의 전사',
  '얼음의 현자','바람의 궁수','대지의 수호자','빛의 사제','어둠의 닌자',
  '시간의 지배자','운명의 연금술사','영혼의 음유시인','무사도의 끝','천상의 댄서','최강자',
];

const ALL_ACHIEVEMENTS = [...BATTLE_ACHIEVEMENTS, ...COLLECTION_ACHIEVEMENTS, ...HIDDEN_ACHIEVEMENTS];

class AchievementSystem {
  init() {
    if (!GameState.achievements) {
      GameState.achievements = {
        progress: {},    // { achievementId: currentValue }
        completed: {},   // { achievementId: true }
        claimed: {},     // { achievementId: true }
        titles: [],      // earned title strings
        activeTitle: null,
        codex: { items: [], monsters: [], heroes: [] },
      };
    }
  }

  // ── 업적 진행도 업데이트 ──
  addProgress(conditionType, amount = 1) {
    this.init();
    const relevant = ALL_ACHIEVEMENTS.filter(a => a.condition.type === conditionType);
    relevant.forEach(a => {
      if (GameState.achievements.completed[a.id]) return;
      const prev = GameState.achievements.progress[a.id] || 0;
      const next = prev + amount;
      GameState.achievements.progress[a.id] = next;
      if (next >= a.condition.target) {
        GameState.achievements.completed[a.id] = true;
        EventBus.emit('achievement:completed', a);
      }
    });
  }

  // ── 특정 업적 달성 체크 ──
  check(achievementId) {
    this.init();
    const ach = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!ach) return null;
    const prog = GameState.achievements.progress[ach.id] || 0;
    return {
      ...ach,
      current: prog,
      completed: !!GameState.achievements.completed[ach.id],
      claimed: !!GameState.achievements.claimed[ach.id],
    };
  }

  // ── 전체 업적 목록 ──
  getAll() {
    this.init();
    return ALL_ACHIEVEMENTS.map(a => {
      const isHidden = a.hidden && !GameState.achievements.completed[a.id];
      return {
        id: a.id,
        name: isHidden ? '???' : a.name,
        desc: isHidden ? '숨겨진 업적' : a.desc,
        hidden: !!a.hidden,
        current: GameState.achievements.progress[a.id] || 0,
        target: a.condition.target,
        completed: !!GameState.achievements.completed[a.id],
        claimed: !!GameState.achievements.claimed[a.id],
        rewards: isHidden ? {} : a.rewards,
      };
    });
  }

  // ── 완료된 업적 ──
  getCompleted() {
    this.init();
    return ALL_ACHIEVEMENTS
      .filter(a => GameState.achievements.completed[a.id])
      .map(a => ({ ...a, claimed: !!GameState.achievements.claimed[a.id] }));
  }

  // ── 보상 수령 ──
  claimReward(id) {
    this.init();
    if (!GameState.achievements.completed[id]) return { success:false, error:'미달성 업적' };
    if (GameState.achievements.claimed[id]) return { success:false, error:'이미 수령' };

    const ach = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return { success:false, error:'업적을 찾을 수 없습니다' };

    GameState.achievements.claimed[id] = true;
    const r = ach.rewards;
    if (r.gold) GameState.addGold(r.gold);
    if (r.diamond) {
      if (!GameState.currencies) GameState.currencies = {};
      GameState.currencies.diamond = (GameState.currencies.diamond || 0) + r.diamond;
      EventBus.emit('currency:changed', { id:'diamond', current: GameState.currencies.diamond });
    }
    if (r.title && !GameState.achievements.titles.includes(r.title)) {
      GameState.achievements.titles.push(r.title);
      EventBus.emit('achievement:title_earned', r.title);
    }

    EventBus.emit('achievement:claimed', { id, rewards: r });
    return { success:true, rewards: r };
  }

  // ── 칭호 설정 ──
  setActiveTitle(title) {
    this.init();
    if (!GameState.achievements.titles.includes(title)) return false;
    GameState.achievements.activeTitle = title;
    EventBus.emit('achievement:title_changed', title);
    return true;
  }

  getActiveTitle() {
    this.init();
    return GameState.achievements.activeTitle;
  }

  getTitles() {
    this.init();
    return [...GameState.achievements.titles];
  }

  // ── 도감 등록 ──
  registerCodex(category, id) {
    this.init();
    const list = GameState.achievements.codex[category];
    if (!list || list.includes(id)) return;
    list.push(id);
    this.addProgress(`${category.replace(/s$/, '')}_codex`, 1);
    EventBus.emit('achievement:codex_updated', { category, id });
  }
}

export { ALL_ACHIEVEMENTS, ALL_TITLES };
export default new AchievementSystem();
