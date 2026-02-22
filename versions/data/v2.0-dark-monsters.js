/**
 * monsters.js — 좀비 5종, 중급 3종, 보스 4종, 서바이벌 전용몹 13종
 * 각 몹: AI행동패턴, 드롭테이블, 속성약점
 */

// ── 원소 약점 매핑 ──
export const ELEMENT_WEAKNESS = {
  fire:    { weak:'water', resist:'ice' },
  water:   { weak:'lightning', resist:'fire' },
  earth:   { weak:'wind', resist:'lightning' },
  wind:    { weak:'earth', resist:'water' },
  light:   { weak:'dark', resist:'nature' },
  dark:    { weak:'light', resist:'wind' },
  nature:  { weak:'fire', resist:'earth' },
  ice:     { weak:'fire', resist:'water' },
  lightning:{ weak:'earth', resist:'wind' },
  none:    { weak:null, resist:null },
};

// ── 좀비 5종 ──
export const ZOMBIES = [
  { id:'zombie_normal', name:'일반 좀비', emoji:'🧟', element:'dark',
    stats:{hp:80,atk:12,def:5,spd:8}, rarity:'common',
    ai:'chase_slow', behavior:'직선 추적, 느림',
    drops:[{id:'gold',chance:0.8,min:5,max:15},{id:'zombie_fang',chance:0.15}],
  },
  { id:'zombie_runner', name:'러너 좀비', emoji:'🏃', element:'dark',
    stats:{hp:50,atk:15,def:3,spd:25}, rarity:'common',
    ai:'chase_fast', behavior:'빠른 추적, 낮은 HP',
    drops:[{id:'gold',chance:0.8,min:5,max:12},{id:'speed_shard',chance:0.1}],
  },
  { id:'zombie_tank', name:'탱커 좀비', emoji:'🦍', element:'earth',
    stats:{hp:200,atk:8,def:15,spd:5}, rarity:'rare',
    ai:'chase_slow', behavior:'느리지만 매우 단단함',
    drops:[{id:'gold',chance:0.9,min:10,max:25},{id:'tough_hide',chance:0.2}],
  },
  { id:'zombie_bomber', name:'자폭 좀비', emoji:'💣', element:'fire',
    stats:{hp:40,atk:50,def:2,spd:18}, rarity:'common',
    ai:'suicide_rush', behavior:'근접 시 폭발, 범위 데미지',
    drops:[{id:'gold',chance:0.7,min:8,max:20},{id:'bomb_shard',chance:0.12}],
  },
  { id:'zombie_spitter', name:'스피터 좀비', emoji:'🤮', element:'nature',
    stats:{hp:60,atk:18,def:4,spd:10}, rarity:'common',
    ai:'ranged_stand', behavior:'원거리 독 뱉기, 이동 느림',
    drops:[{id:'gold',chance:0.8,min:5,max:15},{id:'venom_gland',chance:0.15}],
  },
];

// ── 중급 몹 3종 ──
export const MID_TIER = [
  { id:'necro_mob', name:'네크로맨서', emoji:'☠️', element:'dark',
    stats:{hp:300,atk:25,def:12,spd:12}, rarity:'rare',
    ai:'summon_support', behavior:'주기적으로 좀비 2마리 소환',
    summonId:'zombie_normal', summonInterval:8000, summonMax:4,
    drops:[{id:'gold',chance:1,min:30,max:60},{id:'dark_crystal',chance:0.25},{id:'skill_book',chance:0.05}],
  },
  { id:'lich', name:'리치', emoji:'🧙', element:'ice',
    stats:{hp:250,atk:40,def:10,spd:15}, rarity:'rare',
    ai:'ranged_kite', behavior:'원거리 마법, 거리 유지',
    drops:[{id:'gold',chance:1,min:25,max:50},{id:'frost_core',chance:0.2},{id:'spell_tome',chance:0.08}],
  },
  { id:'death_knight', name:'데스나이트', emoji:'⚔️', element:'dark',
    stats:{hp:400,atk:35,def:20,spd:10}, rarity:'epic',
    ai:'charge_attack', behavior:'돌격 후 강공, 방어력 높음',
    drops:[{id:'gold',chance:1,min:40,max:80},{id:'dark_steel',chance:0.3},{id:'knight_crest',chance:0.1}],
  },
];

// ── 보스 4종 ──
export const BOSSES = [
  { id:'zombie_lord', name:'좀비군주', emoji:'👑', element:'dark', isBoss:true,
    stats:{hp:3000,atk:60,def:30,spd:12}, rarity:'legendary', scale:3,
    ai:'boss_multi', behavior:'3페이즈 전투',
    phases:[
      {hpThreshold:1.0, pattern:'melee_combo', spdM:1, atkM:1},
      {hpThreshold:0.6, pattern:'summon_horde', spdM:1.2, atkM:1.3},
      {hpThreshold:0.3, pattern:'berserk_frenzy', spdM:1.5, atkM:1.8},
    ],
    drops:[{id:'gold',chance:1,min:200,max:500},{id:'zombie_crown',chance:0.5},{id:'legendary_shard',chance:0.1}],
  },
  { id:'undead_dragon', name:'언데드드래곤', emoji:'🐲', element:'dark', isBoss:true,
    stats:{hp:5000,atk:80,def:40,spd:15}, rarity:'legendary', scale:4,
    ai:'boss_multi', behavior:'비행+브레스+착지 공격',
    phases:[
      {hpThreshold:1.0, pattern:'breath_attack', spdM:1, atkM:1},
      {hpThreshold:0.5, pattern:'dive_bomb', spdM:1.3, atkM:1.5},
      {hpThreshold:0.2, pattern:'undead_storm', spdM:1.6, atkM:2.0},
    ],
    drops:[{id:'gold',chance:1,min:500,max:1000},{id:'dragon_bone',chance:0.4},{id:'legendary_shard',chance:0.2}],
  },
  { id:'fallen_angel', name:'타락천사', emoji:'😈', element:'dark', isBoss:true,
    stats:{hp:4000,atk:70,def:35,spd:20}, rarity:'legendary', scale:3,
    ai:'boss_multi', behavior:'마법+순간이동+광역',
    phases:[
      {hpThreshold:1.0, pattern:'holy_corruption', spdM:1, atkM:1},
      {hpThreshold:0.5, pattern:'teleport_slash', spdM:1.5, atkM:1.4},
      {hpThreshold:0.2, pattern:'apocalypse', spdM:1.2, atkM:2.5},
    ],
    drops:[{id:'gold',chance:1,min:400,max:800},{id:'angel_feather',chance:0.35},{id:'legendary_shard',chance:0.15}],
  },
  { id:'death_god', name:'죽음의신', emoji:'💀', element:'dark', isBoss:true,
    stats:{hp:8000,atk:100,def:50,spd:18}, rarity:'mythic', scale:4,
    ai:'boss_multi', behavior:'최종 보스, 5페이즈',
    phases:[
      {hpThreshold:1.0, pattern:'scythe_sweep', spdM:1, atkM:1},
      {hpThreshold:0.8, pattern:'soul_harvest', spdM:1.1, atkM:1.2},
      {hpThreshold:0.6, pattern:'death_zone', spdM:1.2, atkM:1.5},
      {hpThreshold:0.3, pattern:'reaper_form', spdM:1.5, atkM:2.0},
      {hpThreshold:0.1, pattern:'final_judgment', spdM:2.0, atkM:3.0},
    ],
    drops:[{id:'gold',chance:1,min:1000,max:3000},{id:'death_scythe',chance:0.2},{id:'mythic_shard',chance:0.05}],
  },
];

// ── 서바이벌 전용 몹 13종 ──
export const SURVIVAL_MOBS = [
  { id:'s_slime', name:'슬라임', emoji:'🩷', element:'none',
    stats:{hp:30,atk:5,def:2,spd:10}, rarity:'common',
    ai:'chase_slow', purifyChance:0.25 },
  { id:'s_bat', name:'박쥐', emoji:'🦇', element:'wind',
    stats:{hp:25,atk:8,def:1,spd:30}, rarity:'common',
    ai:'chase_fast', purifyChance:0.20 },
  { id:'s_skeleton', name:'스켈레톤', emoji:'💀', element:'dark',
    stats:{hp:50,atk:12,def:5,spd:12}, rarity:'common',
    ai:'chase_slow', purifyChance:0.20 },
  { id:'s_goblin', name:'고블린', emoji:'👺', element:'earth',
    stats:{hp:40,atk:10,def:3,spd:18}, rarity:'common',
    ai:'chase_fast', purifyChance:0.22 },
  { id:'s_wolf', name:'늑대', emoji:'🐺', element:'nature',
    stats:{hp:45,atk:14,def:4,spd:22}, rarity:'common',
    ai:'pack_chase', purifyChance:0.18 },
  { id:'s_golem', name:'골렘', emoji:'🗿', element:'earth',
    stats:{hp:120,atk:18,def:15,spd:5}, rarity:'rare',
    ai:'chase_slow', purifyChance:0.15 },
  { id:'s_ghost', name:'유령', emoji:'👻', element:'dark',
    stats:{hp:35,atk:15,def:0,spd:20}, rarity:'common',
    ai:'phase_through', purifyChance:0.20 },
  { id:'s_spider', name:'거미', emoji:'🕷️', element:'nature',
    stats:{hp:40,atk:11,def:3,spd:16}, rarity:'common',
    ai:'web_trap', purifyChance:0.22 },
  { id:'s_fire_elem', name:'화염 정령', emoji:'🔥', element:'fire',
    stats:{hp:60,atk:20,def:5,spd:15}, rarity:'rare',
    ai:'ranged_stand', purifyChance:0.15 },
  { id:'s_ice_elem', name:'얼음 정령', emoji:'🧊', element:'ice',
    stats:{hp:55,atk:18,def:8,spd:12}, rarity:'rare',
    ai:'ranged_kite', purifyChance:0.15 },
  { id:'s_mimic', name:'미믹', emoji:'📦', element:'none',
    stats:{hp:70,atk:22,def:10,spd:8}, rarity:'rare',
    ai:'ambush', purifyChance:0.12 },
  { id:'s_gargoyle', name:'가고일', emoji:'🗽', element:'earth',
    stats:{hp:90,atk:16,def:12,spd:14}, rarity:'rare',
    ai:'dive_attack', purifyChance:0.12 },
  { id:'s_wraith', name:'레이스', emoji:'☠️', element:'dark',
    stats:{hp:80,atk:25,def:3,spd:25}, rarity:'epic',
    ai:'teleport_attack', purifyChance:0.10 },
];

// ── AI 행동 패턴 정의 ──
export const AI_BEHAVIORS = {
  chase_slow:     { type:'chase', speed:0.5, attackRange:30 },
  chase_fast:     { type:'chase', speed:1.5, attackRange:30 },
  pack_chase:     { type:'chase', speed:1.2, attackRange:30, groupBonus:true },
  suicide_rush:   { type:'chase', speed:1.0, explodeOnContact:true, explodeRadius:60, explodeDmg:50 },
  ranged_stand:   { type:'ranged', speed:0.3, attackRange:200, projSpeed:4 },
  ranged_kite:    { type:'ranged', speed:0.8, attackRange:180, projSpeed:5, keepDist:120 },
  summon_support: { type:'summon', speed:0.4, attackRange:150 },
  charge_attack:  { type:'charge', speed:0.6, chargeSpeed:3.0, chargeRange:150, chargeCooldown:5000 },
  phase_through:  { type:'chase', speed:1.0, phaseWalls:true },
  web_trap:       { type:'trap', speed:0.8, trapCooldown:6000, trapDuration:2000 },
  ambush:         { type:'ambush', speed:0, revealRange:80, burstSpeed:2.5 },
  dive_attack:    { type:'dive', speed:0.5, diveSpeed:3.0, diveCooldown:4000 },
  teleport_attack:{ type:'teleport', speed:0, teleportRange:200, teleportCooldown:3000 },
  boss_multi:     { type:'boss', speed:0.6 },
};

// ── 전체 몹 목록 (통합 조회용) ──
export const ALL_MONSTERS = [...ZOMBIES, ...MID_TIER, ...BOSSES, ...SURVIVAL_MOBS];

export function getMonsterById(id) {
  return ALL_MONSTERS.find(m => m.id === id) || null;
}

export function getMonstersByElement(element) {
  return ALL_MONSTERS.filter(m => m.element === element);
}

export function getMonstersByRarity(rarity) {
  return ALL_MONSTERS.filter(m => m.rarity === rarity);
}

export default { ZOMBIES, MID_TIER, BOSSES, SURVIVAL_MOBS, AI_BEHAVIORS, ALL_MONSTERS, ELEMENT_WEAKNESS };
