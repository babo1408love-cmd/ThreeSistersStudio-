/**
 * tutorial-system.js — 10단계 초보자 가이드, 스킵 가능
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 튜토리얼 10단계 정의 ──
const TUTORIAL_STEPS = [
  { step: 1,  name: '몽글벨에 오신 것을 환영합니다!', desc: '요정 세계를 탐험하세요. 터치/클릭으로 이동합니다.', reward: { gold: 100 } },
  { step: 2,  name: '캔디 매치 배우기', desc: '캔디를 3개 이상 맞추어 점수를 올리세요.', reward: { gold: 200, exp: 50 } },
  { step: 3,  name: '구슬 슈팅 배우기', desc: '구슬을 터치하여 아이템을 획득하세요.', reward: { gold: 200, exp: 50 } },
  { step: 4,  name: '장비 장착하기', desc: '인벤토리에서 장비를 장착해 능력치를 올리세요.', reward: { gold: 300, soulShard: 5 } },
  { step: 5,  name: '정령 소환하기', desc: '소환의 나무에서 정령을 소환하세요.', reward: { diamond: 10, exp: 100 } },
  { step: 6,  name: '전투 기초', desc: '자동 공격과 스킬 사용법을 배우세요.', reward: { gold: 500, exp: 100 } },
  { step: 7,  name: '펫 동반하기', desc: '펫을 장착하여 전투 도움을 받으세요.', reward: { gold: 300, exp: 80 } },
  { step: 8,  name: '강화 시스템', desc: '장비를 강화하여 더 강해지세요.', reward: { gold: 500, soulShard: 10 } },
  { step: 9,  name: '퀘스트 수행', desc: '일일/주간 퀘스트를 확인하고 보상을 받으세요.', reward: { diamond: 20, exp: 150 } },
  { step: 10, name: '모험을 떠나세요!', desc: '튜토리얼 완료! 이제 자유롭게 모험하세요.', reward: { gold: 1000, diamond: 50, exp: 300 } },
];

class TutorialSystem {
  init() {
    if (!GameState.tutorial) {
      GameState.tutorial = {
        currentStep: 1,
        completed: {},     // { step: true }
        skipped: false,
      };
    }
  }

  // ── 현재 단계 ──
  getCurrentStep() {
    this.init();
    if (GameState.tutorial.skipped) return null;
    const step = GameState.tutorial.currentStep;
    if (step > TUTORIAL_STEPS.length) return null;
    return TUTORIAL_STEPS.find(s => s.step === step) || null;
  }

  // ── 단계 완료 ──
  completeStep(step) {
    this.init();
    if (GameState.tutorial.skipped) return null;
    if (GameState.tutorial.completed[step]) return null;
    const def = TUTORIAL_STEPS.find(s => s.step === step);
    if (!def) return null;
    GameState.tutorial.completed[step] = true;
    if (GameState.tutorial.currentStep === step) {
      GameState.tutorial.currentStep = step + 1;
    }
    EventBus.emit('tutorial:stepComplete', { step, reward: def.reward });
    // 전체 완료 체크
    if (step === TUTORIAL_STEPS.length) {
      EventBus.emit('tutorial:allComplete');
    }
    return def.reward;
  }

  // ── 스킵 ──
  skip() {
    this.init();
    GameState.tutorial.skipped = true;
    EventBus.emit('tutorial:skipped');
  }

  // ── 완료 여부 ──
  isComplete() {
    this.init();
    if (GameState.tutorial.skipped) return true;
    return GameState.tutorial.currentStep > TUTORIAL_STEPS.length;
  }

  // ── 단계별 보상 조회 ──
  getStepReward(step) {
    const def = TUTORIAL_STEPS.find(s => s.step === step);
    return def ? def.reward : null;
  }

  // ── 진행률 ──
  getProgress() {
    this.init();
    const done = Object.keys(GameState.tutorial.completed).length;
    return {
      completed: done,
      total: TUTORIAL_STEPS.length,
      percent: Math.round(done / TUTORIAL_STEPS.length * 100),
      skipped: GameState.tutorial.skipped,
    };
  }

  // ── 전체 단계 목록 ──
  getAllSteps() {
    this.init();
    return TUTORIAL_STEPS.map(s => ({
      ...s,
      completed: !!GameState.tutorial.completed[s.step],
      current: GameState.tutorial.currentStep === s.step,
    }));
  }

  // ── 보상 수령 여부 ──
  isStepCompleted(step) {
    this.init();
    return !!GameState.tutorial.completed[step];
  }
}

export { TUTORIAL_STEPS };
export default new TutorialSystem();
