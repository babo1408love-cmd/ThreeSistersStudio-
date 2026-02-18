/**
 * stages.js — 10지역 × 20스테이지 = 200스테이지
 * 기존 4스테이지 유지 + 200스테이지 확장 시스템
 *
 * 각 지역별:
 *   1~15: 일반전투(웨이브3개), 16~18: 엘리트, 19: 미니보스, 20: 지역보스(3페이즈)
 * 난이도: normal/hard/hell/nightmare
 * 별 3개: 클리어/무피해/시간내
 */

// ── 기존 스테이지 (레거시 호환) ──
const LEGACY_STAGES = [
  { id:1, name:'포자의 숲 입구', description:'평화롭던 숲에 포자의 기운이 퍼지기 시작했다',
    candy:{targetScore:800,moves:40,cols:7,rows:11}, marble:{shots:20,gridSize:5},
    combat:{ waves:[
      {enemies:[{type:'spore_fairy',count:5}],delay:0},
      {enemies:[{type:'spore_fairy',count:4},{type:'thorn_sprite',count:2}],delay:15000},
      {enemies:[{type:'spore_fairy',count:3},{type:'thorn_sprite',count:3}],delay:30000}
    ], bossWave:null },
    rewards:{gold:200,expBonus:50} },
  { id:2, name:'감염된 동굴', description:'포자에 깊이 잠식된 어둠의 동굴',
    candy:{targetScore:1200,moves:35,cols:7,rows:11}, marble:{shots:18,gridSize:5},
    combat:{ waves:[
      {enemies:[{type:'thorn_sprite',count:6}],delay:0},
      {enemies:[{type:'thorn_sprite',count:4},{type:'moss_golem',count:3}],delay:12000},
      {enemies:[{type:'moss_golem',count:5},{type:'thorn_sprite',count:2}],delay:24000}
    ], bossWave:{enemies:[{type:'boss_infected_elder',count:1}],delay:40000} },
    rewards:{gold:400,expBonus:100} },
  { id:3, name:'오염된 호수', description:'대마왕의 포자에 오염된 신비의 호수',
    candy:{targetScore:1500,moves:30,cols:7,rows:11}, marble:{shots:16,gridSize:5},
    combat:{ waves:[
      {enemies:[{type:'moss_golem',count:5},{type:'fungal_beast',count:2}],delay:0},
      {enemies:[{type:'fungal_beast',count:4},{type:'spore_caster',count:2}],delay:12000},
      {enemies:[{type:'spore_caster',count:3},{type:'fungal_beast',count:3}],delay:24000}
    ], bossWave:{enemies:[{type:'boss_lake_corruption',count:1},{type:'spore_caster',count:2}],delay:38000} },
    rewards:{gold:600,expBonus:150} },
  { id:4, name:'버섯돌이 대마왕의 성', description:'모든 감염의 근원, 대마왕과의 최후의 결전',
    candy:{targetScore:2000,moves:30,cols:7,rows:11}, marble:{shots:15,gridSize:5},
    combat:{ waves:[
      {enemies:[{type:'fungal_beast',count:4},{type:'spore_caster',count:3}],delay:0},
      {enemies:[{type:'bark_knight',count:3},{type:'spore_caster',count:2}],delay:10000},
      {enemies:[{type:'bark_knight',count:5}],delay:20000},
      {enemies:[{type:'bark_knight',count:3},{type:'fungal_beast',count:3},{type:'spore_caster',count:2}],delay:32000}
    ], bossWave:{enemies:[{type:'boss_mushroom_king',count:1}],delay:45000} },
    rewards:{gold:1000,expBonus:300} },
];

// ── 10개 지역 정의 ──
export const REGIONS = [
  { id:'forest_village', idx:0, name:'시작의 마을 숲', emoji:'🌲', color:'#228B22',
    desc:'튜토리얼 지역. 슬라임과 고블린이 출몰하는 평화로운 숲.',
    mobs:['s_slime','s_goblin','s_bat'], elites:['s_golem','s_wolf'],
    miniBoss:'zombie_tank', regionBoss:'zombie_lord', mapTheme:'fairy_garden' },
  { id:'ancient_ruins', idx:1, name:'고대 유적지', emoji:'🏛️', color:'#B8860B',
    desc:'스켈레톤과 골렘이 배회하는 함정 가득한 유적.',
    mobs:['s_skeleton','s_golem','s_ghost'], elites:['death_knight','s_gargoyle'],
    miniBoss:'lich', regionBoss:'zombie_lord', mapTheme:'desert' },
  { id:'crystal_cave', idx:2, name:'수정 동굴', emoji:'💎', color:'#6A5ACD',
    desc:'빛나는 수정과 어둠이 교차하는 미로 같은 동굴.',
    mobs:['s_bat','s_spider','s_ghost'], elites:['s_mimic','s_gargoyle'],
    miniBoss:'s_wraith', regionBoss:'fallen_angel', mapTheme:'crystal_cave' },
  { id:'volcano_land', idx:3, name:'화산 지대', emoji:'🌋', color:'#FF4500',
    desc:'용암이 흐르고 화염 몬스터가 사는 위험한 화산.',
    mobs:['s_fire_elem','zombie_bomber','s_goblin'], elites:['s_golem','death_knight'],
    miniBoss:'necro_mob', regionBoss:'undead_dragon', mapTheme:'volcano' },
  { id:'frozen_tundra', idx:4, name:'얼어붙은 동토', emoji:'❄️', color:'#00CED1',
    desc:'만년설과 얼음 몬스터, 눈폭풍이 시야를 가린다.',
    mobs:['s_ice_elem','s_wolf','zombie_normal'], elites:['lich','s_gargoyle'],
    miniBoss:'zombie_tank', regionBoss:'fallen_angel', mapTheme:'frozen' },
  { id:'dark_forest', idx:5, name:'어둠의 숲', emoji:'🌑', color:'#2F4F4F',
    desc:'안개 속 언데드와 네크로맨서가 도사리는 저주받은 숲.',
    mobs:['zombie_normal','zombie_runner','s_ghost'], elites:['necro_mob','s_wraith'],
    miniBoss:'death_knight', regionBoss:'undead_dragon', mapTheme:'dark_forest' },
  { id:'sky_kingdom', idx:6, name:'하늘 왕국', emoji:'☁️', color:'#87CEEB',
    desc:'구름 위의 왕국, 비행 몬스터와의 공중전.',
    mobs:['s_bat','s_gargoyle','s_ghost'], elites:['s_wraith','s_fire_elem'],
    miniBoss:'lich', regionBoss:'fallen_angel', mapTheme:'sky' },
  { id:'deep_ocean', idx:7, name:'심해 영역', emoji:'🌊', color:'#000080',
    desc:'깊은 바다 속, 수압과 해양 몬스터의 위협.',
    mobs:['s_slime','s_spider','s_ice_elem'], elites:['s_golem','s_mimic'],
    miniBoss:'zombie_tank', regionBoss:'undead_dragon', mapTheme:'ocean' },
  { id:'demon_outskirts', idx:8, name:'마왕성 외곽', emoji:'🏰', color:'#8B0000',
    desc:'마왕성으로 향하는 길, 악마와 암흑기사가 가로막는다.',
    mobs:['zombie_runner','zombie_spitter','s_skeleton'], elites:['death_knight','necro_mob'],
    miniBoss:'s_wraith', regionBoss:'fallen_angel', mapTheme:'demon_castle' },
  { id:'demon_castle', idx:9, name:'마왕성 내부', emoji:'👿', color:'#4B0082',
    desc:'최종 결전, 대마왕과의 마지막 전투.',
    mobs:['zombie_tank','zombie_bomber','s_wraith'], elites:['death_knight','necro_mob'],
    miniBoss:'fallen_angel', regionBoss:'death_god', mapTheme:'demon_castle' },
];

// ── 난이도 배율 ──
export const DIFFICULTY = {
  normal:    { hpMult:1.0, atkMult:1.0, goldMult:1.0, expMult:1.0, label:'노말' },
  hard:      { hpMult:1.5, atkMult:1.3, goldMult:1.5, expMult:1.5, label:'하드' },
  hell:      { hpMult:2.5, atkMult:1.8, goldMult:2.0, expMult:2.0, label:'헬' },
  nightmare: { hpMult:4.0, atkMult:2.5, goldMult:3.0, expMult:3.0, label:'나이트메어' },
};

// ── 별 3개 조건 ──
export const STAR_CONDITIONS = {
  star1: { type:'clear', desc:'스테이지 클리어' },
  star2: { type:'no_damage', desc:'무피해 클리어' },
  star3: { type:'time_limit', desc:'제한 시간 내 클리어' },
};

// ── 스테이지 자동 생성기 (200개) ──
function _generateRegionStages(region, regionIdx) {
  const stages = [];
  const baseGold = 100 + regionIdx * 200;
  const baseExp = 30 + regionIdx * 50;
  const baseHp = 40 + regionIdx * 30;
  const baseAtk = 5 + regionIdx * 4;

  for (let s = 1; s <= 20; s++) {
    const globalId = regionIdx * 20 + s;
    const scaleFactor = 1 + (s - 1) * 0.12;
    const mobHp = Math.round(baseHp * scaleFactor);
    const mobAtk = Math.round(baseAtk * scaleFactor);
    const mobCount = Math.min(8, 3 + Math.floor(s / 4));

    let stageType, stageName, waves, bossWave = null;

    if (s <= 15) {
      // 일반 전투 (웨이브 3개)
      stageType = 'normal';
      stageName = `${region.name} ${s}`;
      const mobs = region.mobs;
      waves = [
        { enemies: _pickMobs(mobs, mobCount, mobHp, mobAtk), delay: 0 },
        { enemies: _pickMobs(mobs, mobCount + 1, mobHp, mobAtk), delay: 12000 },
        { enemies: _pickMobs(mobs, mobCount + 2, mobHp * 1.1, mobAtk * 1.1), delay: 24000 },
      ];
    } else if (s <= 18) {
      // 엘리트 전투
      stageType = 'elite';
      stageName = `${region.name} 엘리트 ${s - 15}`;
      const elites = region.elites;
      waves = [
        { enemies: _pickMobs(region.mobs, mobCount, mobHp, mobAtk), delay: 0 },
        { enemies: _pickMobs(elites, 2, mobHp * 2, mobAtk * 1.5), delay: 10000 },
        { enemies: _pickMobs([...region.mobs, ...elites], mobCount + 2, mobHp * 1.3, mobAtk * 1.3), delay: 22000 },
      ];
    } else if (s === 19) {
      // 미니보스
      stageType = 'miniboss';
      stageName = `${region.name} 미니보스`;
      waves = [
        { enemies: _pickMobs(region.mobs, mobCount + 2, mobHp, mobAtk), delay: 0 },
        { enemies: _pickMobs(region.elites, 3, mobHp * 1.5, mobAtk * 1.3), delay: 12000 },
      ];
      bossWave = { enemies: [{ type: region.miniBoss, count: 1, hp: mobHp * 5, atk: mobAtk * 2 }], delay: 25000 };
    } else {
      // 지역보스 (20)
      stageType = 'boss';
      stageName = `${region.name} 보스`;
      waves = [
        { enemies: _pickMobs(region.elites, 4, mobHp * 1.5, mobAtk * 1.3), delay: 0 },
        { enemies: _pickMobs(region.elites, 3, mobHp * 2, mobAtk * 1.5), delay: 15000 },
      ];
      bossWave = { enemies: [{ type: region.regionBoss, count: 1, hp: mobHp * 10, atk: mobAtk * 3 }], delay: 30000 };
    }

    const goldReward = Math.round(baseGold * scaleFactor * (stageType === 'boss' ? 3 : stageType === 'miniboss' ? 2 : 1));
    const expReward = Math.round(baseExp * scaleFactor * (stageType === 'boss' ? 3 : stageType === 'miniboss' ? 2 : 1));
    const timeLimit = 60 + regionIdx * 5 + s * 2; // 별3 시간제한(초)

    stages.push({
      id: globalId,
      regionId: region.id,
      regionIdx,
      stageNum: s,
      name: stageName,
      type: stageType,
      description: `${region.desc}`,
      mapTheme: region.mapTheme,
      candy: {
        targetScore: 600 + globalId * 60,
        moves: Math.max(20, 45 - Math.floor(globalId / 10)),
        cols: 7, rows: 11,
      },
      marble: { shots: Math.max(10, 22 - Math.floor(globalId / 15)), gridSize: 5 },
      combat: { waves, bossWave },
      staminaCost: 6,
      rewards: { gold: goldReward, exp: expReward, firstClear: { diamonds: stageType === 'boss' ? 50 : 10 } },
      starConditions: {
        star1: 'clear',
        star2: 'no_damage',
        star3_timeLimit: timeLimit,
      },
    });
  }
  return stages;
}

function _pickMobs(pool, count, baseHp, baseAtk) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const type = pool[Math.floor(Math.random() * pool.length)] || pool[0];
    // type이 string이면 id, 아니면 이미 객체
    const typeId = typeof type === 'string' ? type : type.id || type;
    result.push({ type: typeId, count: 1, hp: Math.round(baseHp * (0.9 + Math.random() * 0.2)), atk: Math.round(baseAtk) });
  }
  // 같은 타입 합치기
  const merged = {};
  result.forEach(r => {
    if (merged[r.type]) { merged[r.type].count++; }
    else { merged[r.type] = { ...r }; }
  });
  return Object.values(merged);
}

// ── 200 스테이지 생성 ──
const GENERATED_STAGES = [];
REGIONS.forEach((region, idx) => {
  GENERATED_STAGES.push(..._generateRegionStages(region, idx));
});

// ── 통합 스테이지 배열 (레거시 + 확장) ──
const STAGES = [...LEGACY_STAGES, ...GENERATED_STAGES];

// ── API ──
export function getStage(id) {
  return STAGES.find(s => s.id === id) || STAGES[0];
}

export function getMaxStage() {
  return STAGES.length;
}

export function getRegionStages(regionId) {
  return GENERATED_STAGES.filter(s => s.regionId === regionId);
}

export function getRegion(regionId) {
  return REGIONS.find(r => r.id === regionId) || null;
}

export function getRegionByIndex(idx) {
  return REGIONS[idx] || null;
}

export { LEGACY_STAGES };
export default STAGES;
