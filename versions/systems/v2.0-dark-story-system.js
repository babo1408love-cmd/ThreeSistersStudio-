/**
 * story-system.js — 메인 스토리 10챕터, 영웅별 스토리, 관계도
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';

// ── 메인 스토리 10챕터 ──
const MAIN_CHAPTERS = [
  { id: 'ch1', chapter: 1, title: '여정의 시작', cutscene: [
    { speaker: '요정 엘라', text: '몽글벨에 오신 것을 환영해요! 이 세계는 지금 위기에 처해 있어요.' },
    { speaker: '요정 엘라', text: '버섯돌이 대마왕이 포자로 정령들을 감염시키고 있어요...' },
    { speaker: '주인공', text: '내가 도울 수 있는 일이 있다면 뭐든 할게!' },
  ]},
  { id: 'ch2', chapter: 2, title: '숲의 비밀', cutscene: [
    { speaker: '숲 정령', text: '이 숲에는 오래된 비밀이 숨겨져 있어요.' },
    { speaker: '숲 정령', text: '소환의 나무가 약해지고 있어요. 포자가 퍼지고 있습니다.' },
    { speaker: '주인공', text: '소환의 나무를 꼭 지켜야 해!' },
  ]},
  { id: 'ch3', chapter: 3, title: '수정 동굴의 시련', cutscene: [
    { speaker: '수정 정령', text: '이곳은 수정 동굴. 강력한 힘이 잠들어 있지요.' },
    { speaker: '주인공', text: '이 힘을 사용하면 대마왕에 대항할 수 있을까?' },
    { speaker: '수정 정령', text: '시련을 이겨내야만 힘을 얻을 수 있어요.' },
  ]},
  { id: 'ch4', chapter: 4, title: '불의 산', cutscene: [
    { speaker: '화염 수호자', text: '대마왕의 포자가 화산까지 침투했다!' },
    { speaker: '화염 수호자', text: '용암 속에서 봉인된 무기를 찾아야 해.' },
    { speaker: '주인공', text: '어떤 시련이든 이겨내겠어!' },
  ]},
  { id: 'ch5', chapter: 5, title: '얼어붙은 진실', cutscene: [
    { speaker: '빙결 현자', text: '동토에 봉인된 진실을 마주할 준비가 되었는가?' },
    { speaker: '주인공', text: '대마왕의 정체를 알아야 해.' },
    { speaker: '빙결 현자', text: '그는 한때... 이 세계의 수호자였다네.' },
  ]},
  { id: 'ch6', chapter: 6, title: '어둠의 숲', cutscene: [
    { speaker: '그림자 요정', text: '어둠의 숲에서 감염된 정령들이 방황하고 있어요.' },
    { speaker: '주인공', text: '정령들을 구해야 해. 절대 포기하지 않겠어!' },
    { speaker: '그림자 요정', text: '당신의 빛이 어둠을 물리칠 거예요.' },
  ]},
  { id: 'ch7', chapter: 7, title: '하늘 위의 전장', cutscene: [
    { speaker: '천공의 기사', text: '하늘 왕국이 침략당했다! 대마왕의 군대가 밀려온다!' },
    { speaker: '주인공', text: '하늘에서도 싸울 수 있어. 함께 가자!' },
    { speaker: '천공의 기사', text: '당신과 함께라면 이길 수 있을 거야!' },
  ]},
  { id: 'ch8', chapter: 8, title: '심해의 비밀', cutscene: [
    { speaker: '해저 현자', text: '바다 밑에 고대 병기가 잠들어 있지.' },
    { speaker: '주인공', text: '대마왕을 막을 수 있는 힘인가요?' },
    { speaker: '해저 현자', text: '그것은 양날의 검이야. 신중하게 사용해야 해.' },
  ]},
  { id: 'ch9', chapter: 9, title: '마왕성의 문앞에서', cutscene: [
    { speaker: '요정 엘라', text: '드디어 마왕성 앞에 왔어요. 모든 동료가 함께해요.' },
    { speaker: '주인공', text: '여기까지 온 건 모두의 힘이야. 마지막까지 함께 가자!' },
    { speaker: '요정 엘라', text: '꼭 이겨내야 해요. 몽글벨의 미래를 위해!' },
  ]},
  { id: 'ch10', chapter: 10, title: '최후의 결전', cutscene: [
    { speaker: '버섯돌이 대마왕', text: '어리석은 것들... 이 세계는 이미 내 것이다!' },
    { speaker: '주인공', text: '이 세계는 모두의 것이야! 네 야망은 여기서 끝이다!' },
    { speaker: '요정 엘라', text: '모든 정령의 힘을 모아! 지금이야!' },
    { speaker: '내레이션', text: '빛이 어둠을 감싸고, 몽글벨에 평화가 돌아왔다.' },
  ]},
];

// ── 영웅별 스토리 20종 ──
const HERO_STORIES = [
  { heroId: 'knight',    stories: [{ id: 'hs_knight_1', title: '기사의 맹세', text: '어린 시절 숲에서 요정을 만난 뒤, 평생 이 세계를 지키겠다 맹세했다.' }, { id: 'hs_knight_2', title: '잃어버린 검', text: '아버지의 검을 찾아 방황하던 중, 소환의 나무에서 새로운 힘을 얻었다.' }] },
  { heroId: 'mage',      stories: [{ id: 'hs_mage_1', title: '마법의 기원', text: '수정 동굴에서 태어난 마법사. 원소의 힘을 자유자재로 다룬다.' }, { id: 'hs_mage_2', title: '금지된 주문', text: '대마왕의 포자를 정화하는 금지된 주문을 해독하기 위해 고대 서적을 찾아 나섰다.' }] },
  { heroId: 'archer',    stories: [{ id: 'hs_archer_1', title: '숲의 수호자', text: '깊은 숲에서 자란 궁수. 바람과 대화하며 화살을 쏜다.' }, { id: 'hs_archer_2', title: '약속의 화살', text: '소중한 친구를 감염에서 구하겠다는 약속을 가슴에 품고 활시위를 당긴다.' }] },
  { heroId: 'healer',    stories: [{ id: 'hs_healer_1', title: '치유의 빛', text: '소환의 나무에서 태어난 치유사. 모든 생명을 소중히 여긴다.' }, { id: 'hs_healer_2', title: '눈물의 기적', text: '감염된 정령을 치료하다 자신도 위험에 빠졌지만, 동료들의 힘으로 극복했다.' }] },
  { heroId: 'assassin',  stories: [{ id: 'hs_assassin_1', title: '그림자의 길', text: '어둠 속에서 자란 암살자. 대마왕의 조직에서 탈출했다.' }, { id: 'hs_assassin_2', title: '속죄의 칼날', text: '과거의 잘못을 바로잡기 위해 빛의 편에 섰다.' }] },
  { heroId: 'guardian',  stories: [{ id: 'hs_guardian_1', title: '철벽의 수호자', text: '마을을 지키기 위해 방패를 들었다. 단 한 명도 다치게 하지 않겠다.' }, { id: 'hs_guardian_2', title: '부서진 방패', text: '방패가 부서져도 몸으로 동료를 지킨다. 그것이 수호자의 길.' }] },
  { heroId: 'berserker', stories: [{ id: 'hs_berserker_1', title: '분노의 전사', text: '마을이 포자에 감염되던 날, 분노가 폭발하며 각성했다.' }, { id: 'hs_berserker_2', title: '폭풍의 눈', text: '분노를 제어하는 법을 배우며 진정한 강함을 찾아간다.' }] },
  { heroId: 'elementalist', stories: [{ id: 'hs_elem_1', title: '원소의 아이', text: '4원소의 축복을 받고 태어났다. 세계의 균형을 위해 싸운다.' }, { id: 'hs_elem_2', title: '폭주', text: '감정이 폭발하면 원소가 폭주한다. 이를 제어하는 것이 가장 큰 과제.' }] },
  { heroId: 'necromancer', stories: [{ id: 'hs_necro_1', title: '죽음을 넘어', text: '소환의 나무가 보여준 영혼의 세계. 죽은 정령들의 목소리를 듣는다.' }, { id: 'hs_necro_2', title: '금지된 소환', text: '정령을 되살리는 힘, 그 대가는 크지만 포기할 수 없다.' }] },
  { heroId: 'bard',      stories: [{ id: 'hs_bard_1', title: '노래의 힘', text: '음악으로 정령들을 치유하는 음유시인. 노래가 세계를 바꿀 수 있다 믿는다.' }, { id: 'hs_bard_2', title: '최후의 선율', text: '대마왕과의 결전에서 울려 퍼질 희망의 노래를 완성하기 위해 여행한다.' }] },
];

// ── 영웅 관계도 ──
const RELATIONSHIPS = [
  { from: 'knight',   to: 'healer',    relation: '소꿉친구', desc: '어린 시절부터 함께 자란 사이' },
  { from: 'knight',   to: 'guardian',   relation: '라이벌',   desc: '실력을 겨루며 함께 성장' },
  { from: 'mage',     to: 'elementalist', relation: '스승과 제자', desc: '마법의 기초를 가르쳤다' },
  { from: 'archer',   to: 'bard',      relation: '여행 동반자', desc: '숲에서 만나 함께 여행' },
  { from: 'assassin', to: 'necromancer', relation: '과거 동료', desc: '어둠의 조직 시절 함께했다' },
  { from: 'healer',   to: 'berserker', relation: '치유 관계', desc: '폭주하는 그를 치유해주는 유일한 존재' },
  { from: 'guardian',  to: 'berserker', relation: '전우',     desc: '최전선에서 함께 싸우는 사이' },
  { from: 'bard',     to: 'necromancer', relation: '호기심',   desc: '영혼의 노래에 관심을 가지고 있다' },
  { from: 'mage',     to: 'assassin',  relation: '경계',     desc: '과거를 알기에 경계하지만 신뢰한다' },
  { from: 'elementalist', to: 'archer', relation: '협력',    desc: '원소와 바람의 합동 공격' },
];

class StorySystem {
  init() {
    if (!GameState.story) {
      GameState.story = {
        readChapters: {},   // { chapterId: true }
        readHeroStories: {},// { storyId: true }
        unlockedChapter: 1, // 해금된 최대 챕터
      };
    }
  }

  // ── 챕터 조회 ──
  getChapter(id) {
    const ch = MAIN_CHAPTERS.find(c => c.id === id || c.chapter === id);
    if (!ch) return null;
    this.init();
    return { ...ch, read: !!GameState.story.readChapters[ch.id], unlocked: ch.chapter <= GameState.story.unlockedChapter };
  }

  getAllChapters() {
    this.init();
    return MAIN_CHAPTERS.map(ch => ({
      ...ch, read: !!GameState.story.readChapters[ch.id],
      unlocked: ch.chapter <= GameState.story.unlockedChapter,
    }));
  }

  // ── 챕터 해금 ──
  unlockChapter(chapterNum) {
    this.init();
    if (chapterNum > GameState.story.unlockedChapter) {
      GameState.story.unlockedChapter = chapterNum;
      EventBus.emit('story:chapterUnlocked', chapterNum);
    }
  }

  // ── 영웅 스토리 ──
  getHeroStory(heroId) {
    this.init();
    const entry = HERO_STORIES.find(h => h.heroId === heroId);
    if (!entry) return null;
    return entry.stories.map(s => ({ ...s, read: !!GameState.story.readHeroStories[s.id] }));
  }

  // ── 관계도 ──
  getRelationships() {
    return RELATIONSHIPS.map(r => ({ ...r }));
  }

  getHeroRelationships(heroId) {
    return RELATIONSHIPS.filter(r => r.from === heroId || r.to === heroId);
  }

  // ── 읽음 표시 ──
  markRead(storyId) {
    this.init();
    // 챕터 or 영웅 스토리
    const chapter = MAIN_CHAPTERS.find(c => c.id === storyId);
    if (chapter) {
      GameState.story.readChapters[storyId] = true;
      EventBus.emit('story:chapterRead', storyId);
      return true;
    }
    const heroStory = HERO_STORIES.some(h => h.stories.some(s => s.id === storyId));
    if (heroStory) {
      GameState.story.readHeroStories[storyId] = true;
      EventBus.emit('story:heroStoryRead', storyId);
      return true;
    }
    return false;
  }

  // ── 진행률 ──
  getProgress() {
    this.init();
    const chaptersRead = Object.keys(GameState.story.readChapters).length;
    const heroStoriesRead = Object.keys(GameState.story.readHeroStories).length;
    const totalHeroStories = HERO_STORIES.reduce((sum, h) => sum + h.stories.length, 0);
    return {
      chapters: { read: chaptersRead, total: MAIN_CHAPTERS.length },
      heroStories: { read: heroStoriesRead, total: totalHeroStories },
    };
  }
}

export { MAIN_CHAPTERS, HERO_STORIES, RELATIONSHIPS };
export default new StorySystem();
