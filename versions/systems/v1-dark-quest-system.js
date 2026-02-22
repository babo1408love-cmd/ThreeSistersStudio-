/**
 * quest-system.js — 메인/서브/일일/주간 퀘스트
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 메인 퀘스트 10챕터 ──
const MAIN_QUESTS = [
  { id:'mq_1', chapter:1, name:'여정의 시작', desc:'시작의 마을 숲 5스테이지 클리어', condition:{type:'stage_clear',stageId:5}, rewards:{gold:500,diamond:20,exp:100} },
  { id:'mq_2', chapter:2, name:'유적의 비밀', desc:'고대 유적지 진입', condition:{type:'stage_clear',stageId:21}, rewards:{gold:1000,diamond:30,exp:200} },
  { id:'mq_3', chapter:3, name:'수정의 심장', desc:'수정 동굴 보스 처치', condition:{type:'stage_clear',stageId:60}, rewards:{gold:2000,diamond:50,exp:400} },
  { id:'mq_4', chapter:4, name:'불의 시련', desc:'화산 지대 20스테이지 클리어', condition:{type:'stage_clear',stageId:80}, rewards:{gold:3000,diamond:50,exp:600} },
  { id:'mq_5', chapter:5, name:'얼어붙은 진실', desc:'동토 보스 처치', condition:{type:'stage_clear',stageId:100}, rewards:{gold:4000,diamond:80,exp:800} },
  { id:'mq_6', chapter:6, name:'어둠의 근원', desc:'어둠의 숲 보스 처치', condition:{type:'stage_clear',stageId:120}, rewards:{gold:5000,diamond:80,exp:1000} },
  { id:'mq_7', chapter:7, name:'하늘 위의 전쟁', desc:'하늘 왕국 보스 처치', condition:{type:'stage_clear',stageId:140}, rewards:{gold:6000,diamond:100,exp:1200} },
  { id:'mq_8', chapter:8, name:'심해의 비밀', desc:'심해 보스 처치', condition:{type:'stage_clear',stageId:160}, rewards:{gold:7000,diamond:100,exp:1500} },
  { id:'mq_9', chapter:9, name:'마왕의 그림자', desc:'마왕성 외곽 보스 처치', condition:{type:'stage_clear',stageId:180}, rewards:{gold:10000,diamond:150,exp:2000} },
  { id:'mq_10', chapter:10, name:'최후의 결전', desc:'마왕성 최종 보스 처치', condition:{type:'stage_clear',stageId:200}, rewards:{gold:20000,diamond:300,exp:5000} },
];

// ── 일일 미션 템플릿 ──
const DAILY_TEMPLATES = [
  { id:'daily_battle', name:'전투 3회', desc:'전투를 3회 수행', condition:{type:'battle_count',target:3}, rewards:{gold:200,exp:50} },
  { id:'daily_enhance', name:'강화 1회', desc:'장비를 1회 강화', condition:{type:'enhance_count',target:1}, rewards:{gold:100,soulShard:5} },
  { id:'daily_shop', name:'상점 구매', desc:'상점에서 1회 구매', condition:{type:'shop_buy',target:1}, rewards:{gold:150} },
  { id:'daily_dungeon', name:'던전 1회', desc:'던전 1회 클리어', condition:{type:'dungeon_clear',target:1}, rewards:{diamond:10,exp:100} },
  { id:'daily_friend', name:'친구 돕기', desc:'친구 1명 도움', condition:{type:'friend_help',target:1}, rewards:{gold:100,prayerPoint:10} },
];

// ── 주간 미션 템플릿 ──
const WEEKLY_TEMPLATES = [
  { id:'weekly_boss', name:'보스 처치', desc:'보스 몬스터 5회 처치', condition:{type:'boss_kill',target:5}, rewards:{diamond:50,soulShard:20} },
  { id:'weekly_arena', name:'아레나 10회', desc:'아레나 10회 참여', condition:{type:'arena_count',target:10}, rewards:{honorPoint:100,gold:2000} },
  { id:'weekly_gather', name:'재료 수집', desc:'재료 아이템 50개 수집', condition:{type:'material_count',target:50}, rewards:{gold:3000,diamond:30} },
];

class QuestSystem {
  init() {
    if (!GameState.quests) {
      GameState.quests = {
        mainProgress: {},    // { questId: completed }
        dailyProgress: {},   // { questId: { current, completed, date } }
        weeklyProgress: {},  // { questId: { current, completed, week } }
        subQuests: [],       // active sub quests
      };
    }
  }

  // ── 메인 퀘스트 ──
  getMainQuests() {
    this.init();
    return MAIN_QUESTS.map(q => ({
      ...q,
      completed: !!GameState.quests.mainProgress[q.id],
    }));
  }

  completeMainQuest(questId) {
    this.init();
    if (GameState.quests.mainProgress[questId]) return false;
    const quest = MAIN_QUESTS.find(q => q.id === questId);
    if (!quest) return false;
    GameState.quests.mainProgress[questId] = true;
    EventBus.emit('quest:main_complete', quest);
    return quest.rewards;
  }

  // ── 일일 미션 ──
  getDailyMissions() {
    this.init();
    const today = new Date().toDateString();
    return DAILY_TEMPLATES.map(t => {
      const prog = GameState.quests.dailyProgress[t.id] || {};
      const isToday = prog.date === today;
      return {
        ...t,
        current: isToday ? (prog.current || 0) : 0,
        target: t.condition.target,
        completed: isToday && prog.completed,
      };
    });
  }

  addDailyProgress(conditionType, amount = 1) {
    this.init();
    const today = new Date().toDateString();
    DAILY_TEMPLATES.forEach(t => {
      if (t.condition.type !== conditionType) return;
      let prog = GameState.quests.dailyProgress[t.id];
      if (!prog || prog.date !== today) {
        prog = { current: 0, completed: false, date: today };
      }
      if (prog.completed) return;
      prog.current = Math.min(prog.current + amount, t.condition.target);
      if (prog.current >= t.condition.target) {
        prog.completed = true;
        EventBus.emit('quest:daily_complete', t);
      }
      GameState.quests.dailyProgress[t.id] = prog;
    });
  }

  // ── 주간 미션 ──
  getWeeklyMissions() {
    this.init();
    const week = this._getWeekId();
    return WEEKLY_TEMPLATES.map(t => {
      const prog = GameState.quests.weeklyProgress[t.id] || {};
      const isWeek = prog.week === week;
      return {
        ...t,
        current: isWeek ? (prog.current || 0) : 0,
        target: t.condition.target,
        completed: isWeek && prog.completed,
      };
    });
  }

  addWeeklyProgress(conditionType, amount = 1) {
    this.init();
    const week = this._getWeekId();
    WEEKLY_TEMPLATES.forEach(t => {
      if (t.condition.type !== conditionType) return;
      let prog = GameState.quests.weeklyProgress[t.id];
      if (!prog || prog.week !== week) {
        prog = { current: 0, completed: false, week };
      }
      if (prog.completed) return;
      prog.current = Math.min(prog.current + amount, t.condition.target);
      if (prog.current >= t.condition.target) {
        prog.completed = true;
        EventBus.emit('quest:weekly_complete', t);
      }
      GameState.quests.weeklyProgress[t.id] = prog;
    });
  }

  _getWeekId() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
  }
}

export { MAIN_QUESTS, DAILY_TEMPLATES, WEEKLY_TEMPLATES };
export default new QuestSystem();
