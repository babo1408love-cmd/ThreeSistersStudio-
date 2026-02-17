// Stage configuration — 버섯돌이 대마왕의 포자 감염을 정화하는 여정
const STAGES = [
  {
    id: 1,
    name: '포자의 숲 입구',
    description: '평화롭던 숲에 포자의 기운이 퍼지기 시작했다',
    candy: { targetScore: 300, moves: 20, cols: 7, rows: 11 },
    marble: { shots: 20, gridSize: 5 },
    combat: {
      waves: [
        { enemies: [{ type: 'spore_fairy', count: 5 }], delay: 0 },
        { enemies: [{ type: 'spore_fairy', count: 4 }, { type: 'thorn_sprite', count: 2 }], delay: 15000 },
        { enemies: [{ type: 'spore_fairy', count: 3 }, { type: 'thorn_sprite', count: 3 }], delay: 30000 }
      ],
      bossWave: null
    },
    rewards: { gold: 200, expBonus: 50 }
  },
  {
    id: 2,
    name: '감염된 동굴',
    description: '포자에 깊이 잠식된 어둠의 동굴',
    candy: { targetScore: 500, moves: 18, cols: 7, rows: 11 },
    marble: { shots: 18, gridSize: 5 },
    combat: {
      waves: [
        { enemies: [{ type: 'thorn_sprite', count: 6 }], delay: 0 },
        { enemies: [{ type: 'thorn_sprite', count: 4 }, { type: 'moss_golem', count: 3 }], delay: 12000 },
        { enemies: [{ type: 'moss_golem', count: 5 }, { type: 'thorn_sprite', count: 2 }], delay: 24000 }
      ],
      bossWave: { enemies: [{ type: 'boss_infected_elder', count: 1 }], delay: 40000 }
    },
    rewards: { gold: 400, expBonus: 100 }
  },
  {
    id: 3,
    name: '오염된 호수',
    description: '대마왕의 포자에 오염된 신비의 호수',
    candy: { targetScore: 700, moves: 16, cols: 7, rows: 11 },
    marble: { shots: 16, gridSize: 5 },
    combat: {
      waves: [
        { enemies: [{ type: 'moss_golem', count: 5 }, { type: 'fungal_beast', count: 2 }], delay: 0 },
        { enemies: [{ type: 'fungal_beast', count: 4 }, { type: 'spore_caster', count: 2 }], delay: 12000 },
        { enemies: [{ type: 'spore_caster', count: 3 }, { type: 'fungal_beast', count: 3 }], delay: 24000 }
      ],
      bossWave: { enemies: [{ type: 'boss_lake_corruption', count: 1 }, { type: 'spore_caster', count: 2 }], delay: 38000 }
    },
    rewards: { gold: 600, expBonus: 150 }
  },
  {
    id: 4,
    name: '버섯돌이 대마왕의 성',
    description: '모든 감염의 근원, 대마왕과의 최후의 결전',
    candy: { targetScore: 1000, moves: 15, cols: 7, rows: 11 },
    marble: { shots: 15, gridSize: 5 },
    combat: {
      waves: [
        { enemies: [{ type: 'fungal_beast', count: 4 }, { type: 'spore_caster', count: 3 }], delay: 0 },
        { enemies: [{ type: 'bark_knight', count: 3 }, { type: 'spore_caster', count: 2 }], delay: 10000 },
        { enemies: [{ type: 'bark_knight', count: 5 }], delay: 20000 },
        { enemies: [{ type: 'bark_knight', count: 3 }, { type: 'fungal_beast', count: 3 }, { type: 'spore_caster', count: 2 }], delay: 32000 }
      ],
      bossWave: { enemies: [{ type: 'boss_mushroom_king', count: 1 }], delay: 45000 }
    },
    rewards: { gold: 1000, expBonus: 300 }
  }
];

export function getStage(id) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}

export function getMaxStage() {
  return STAGES.length;
}

export default STAGES;
