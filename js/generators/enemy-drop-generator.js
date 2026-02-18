/**
 * enemy-drop-generator.js — 적/동료/드롭 생성기
 * 적 10종+보스 4종, 동료 6종, 드롭: 골드/장비15종/소비7종/파편/진화재료9종/소환서
 * generateWave 웨이브 시스템
 * BalanceAI 자동 밸런싱 연동
 */
import GameState from '../core/game-state.js';
import UnitFactory from '../data/unit-factory.js';

// ── 슬라임 적 10종 (귀여운 둥근) ──
export const ENEMIES = {
  pink_slime:   {id:'pink_slime',  name:'핑크 슬라임', emoji:'🩷',color:'#FF69B4',hp:30,atk:4, def:1, spd:1.5,gold:5, rarity:'common'},
  blue_slime:   {id:'blue_slime',  name:'파란 슬라임', emoji:'💙',color:'#4488FF',hp:40,atk:5, def:2, spd:1.2,gold:7, rarity:'common'},
  green_slime:  {id:'green_slime', name:'초록 슬라임', emoji:'💚',color:'#44BB44',hp:35,atk:4, def:2, spd:1.3,gold:6, rarity:'common'},
  purple_slime: {id:'purple_slime',name:'보라 슬라임', emoji:'💜',color:'#9944CC',hp:50,atk:6, def:2, spd:1.4,gold:8, rarity:'rare'},
  gold_slime:   {id:'gold_slime',  name:'금색 슬라임', emoji:'💛',color:'#FFD700',hp:70,atk:6, def:3, spd:1.0,gold:50,rarity:'rare'},
  fire_slime:   {id:'fire_slime',  name:'불 슬라임',   emoji:'🔥',color:'#FF4500',hp:45,atk:7, def:1, spd:1.6,gold:10,rarity:'rare'},
  ice_slime:    {id:'ice_slime',   name:'얼음 슬라임', emoji:'❄️',color:'#00CED1',hp:40,atk:5, def:4, spd:0.9,gold:9, rarity:'rare'},
  dark_slime:   {id:'dark_slime',  name:'어둠 슬라임', emoji:'🖤',color:'#333',   hp:60,atk:8, def:3, spd:1.5,gold:12,rarity:'magic'},
  nature_slime: {id:'nature_slime',name:'자연 슬라임', emoji:'🌿',color:'#228B22',hp:45,atk:4, def:3, spd:1.1,gold:8, rarity:'common', healer:true,healAmt:3},
  crystal_slime:{id:'crystal_slime',name:'수정 슬라임',emoji:'💎',color:'#c084fc',hp:65,atk:7, def:4, spd:0.8,gold:15,rarity:'magic'},
};

// ── 보스 4종 (거대 슬라임 3배 크기) ──
export const BOSSES = {
  king_slime:    {id:'king_slime',   name:'슬라임 킹',    emoji:'👑',color:'#FFD700',hp:500,atk:15,def:8, spd:0.6,gold:200,scale:3,rarity:'epic',
                  skills:['jump_attack','summon_minions','enrage']},
  shadow_slime:  {id:'shadow_slime', name:'그림자 슬라임', emoji:'👿',color:'#4B0082',hp:600,atk:18,def:6, spd:0.8,gold:300,scale:3,rarity:'epic',
                  skills:['shadow_dash','dark_pool','clone']},
  crystal_queen: {id:'crystal_queen',name:'크리스탈 여왕',  emoji:'👸',color:'#c084fc',hp:700,atk:12,def:15,spd:0.5,gold:400,scale:3,rarity:'legendary',
                  skills:['crystal_wall','reflect','heal_pulse']},
  mushroom_king: {id:'mushroom_king',name:'버섯돌이 대마왕',emoji:'🍄',color:'#8B4513',hp:1000,atk:20,def:10,spd:0.7,gold:500,scale:3.5,rarity:'legendary',
                  skills:['spore_rain','root_bind','mushroom_army','corruption']},
};

// ── 동료 6종 ──
export const ALLIES = {
  fairy_warrior: {id:'fairy_warrior',name:'요정 전사', emoji:'⚔️🧚',role:'tank',   hp:80, atk:10,def:12,spd:3,skill:{name:'수호',type:'shield',val:15}},
  fairy_mage:    {id:'fairy_mage',   name:'요정 마법사',emoji:'🪄🧚',role:'dps',    hp:40, atk:18,def:4, spd:5,skill:{name:'마법폭발',type:'aoe',val:25}},
  fairy_archer:  {id:'fairy_archer', name:'요정 궁수', emoji:'🏹🧚',role:'dps',    hp:45, atk:15,def:5, spd:7,skill:{name:'연사',type:'multi',val:3}},
  fairy_healer:  {id:'fairy_healer', name:'요정 치유사',emoji:'💚🧚',role:'healer', hp:50, atk:6, def:6, spd:4,skill:{name:'힐링오라',type:'heal',val:20}},
  fairy_scout:   {id:'fairy_scout',  name:'요정 정찰대',emoji:'👁️🧚',role:'support',hp:35, atk:8, def:3, spd:10,skill:{name:'약점간파',type:'debuff',val:0.2}},
  fairy_guardian: {id:'fairy_guardian',name:'요정 수호자',emoji:'🛡️🧚',role:'tank',  hp:100,atk:8, def:15,spd:2,skill:{name:'도발',type:'taunt',val:5}},
};

// ── 장비 15종 ──
export const EQUIPMENT_DROPS = [
  {name:'나무 검',   emoji:'🗡️',slot:'arms', rarity:'common',stats:{attack:3}},
  {name:'돌 방패',   emoji:'🛡️',slot:'body', rarity:'common',stats:{defense:3}},
  {name:'가죽 모자', emoji:'👒',slot:'head', rarity:'common',stats:{defense:2,maxHp:10}},
  {name:'가죽 각반', emoji:'🦿',slot:'legs', rarity:'common',stats:{defense:2,speed:1}},
  {name:'천 신발',   emoji:'👟',slot:'shoes',rarity:'common',stats:{speed:2}},
  {name:'마법 지팡이',emoji:'🪄',slot:'arms', rarity:'rare',  stats:{attack:8}},
  {name:'미스릴 갑옷',emoji:'🦺',slot:'body', rarity:'rare',  stats:{defense:8}},
  {name:'마법 왕관', emoji:'👑',slot:'head', rarity:'rare',  stats:{defense:5,maxHp:20}},
  {name:'날개 망토', emoji:'🪽',slot:'wings',rarity:'rare',  stats:{speed:3,rageGainRate:5}},
  {name:'철 경갑',   emoji:'⚙️',slot:'legs', rarity:'rare',  stats:{defense:6,speed:1}},
  {name:'크리스탈 검',emoji:'⚔️',slot:'arms', rarity:'epic',  stats:{attack:15,critRate:3}},
  {name:'드래곤 아머',emoji:'⚜️',slot:'body', rarity:'epic',  stats:{defense:15,maxHp:30}},
  {name:'천사 날개', emoji:'👼',slot:'wings',rarity:'epic',  stats:{speed:5,rageGainRate:10}},
  {name:'전설의 활', emoji:'🏹',slot:'arms', rarity:'legendary',stats:{attack:25,speed:3,critRate:5}},
  {name:'세계수 갑옷',emoji:'🌳',slot:'body', rarity:'legendary',stats:{defense:25,maxHp:50}},
];

// ── 소비 아이템 7종 ──
export const CONSUMABLES = [
  {id:'hp_potion_s', name:'소형 포션', emoji:'🧪',effect:{type:'heal',val:30},  rarity:'common'},
  {id:'hp_potion_m', name:'중형 포션', emoji:'🧴',effect:{type:'heal',val:60},  rarity:'rare'},
  {id:'hp_potion_l', name:'대형 포션', emoji:'🏺',effect:{type:'heal',val:120}, rarity:'epic'},
  {id:'atk_buff',    name:'공격 부스트',emoji:'⚔️',effect:{type:'buff_atk',val:1.3,dur:30},rarity:'rare'},
  {id:'def_buff',    name:'방어 부스트',emoji:'🛡️',effect:{type:'buff_def',val:1.3,dur:30},rarity:'rare'},
  {id:'spd_buff',    name:'속도 부스트',emoji:'💨',effect:{type:'buff_spd',val:1.5,dur:20},rarity:'rare'},
  {id:'revive',      name:'부활의 깃털',emoji:'🪶',effect:{type:'revive',val:0.5},rarity:'epic'},
];

// ── 드롭 생성 ──
export function generateDrop(enemyDef, waveNum = 1) {
  const drops = [];
  // Gold always
  const goldBase = enemyDef.gold || 5;
  const goldAmount = Math.round(goldBase * (0.8 + Math.random() * 0.4));
  drops.push({ type:'gold', amount: goldAmount });

  // Equipment (10% base, +5% per rarity tier)
  const rarityBonus = {common:0, rare:0.05, magic:0.1, epic:0.15, legendary:0.2};
  if (Math.random() < 0.10 + (rarityBonus[enemyDef.rarity]||0)) {
    const pool = EQUIPMENT_DROPS.filter(e => {
      if (enemyDef.rarity === 'common') return e.rarity === 'common';
      if (enemyDef.rarity === 'rare') return e.rarity !== 'epic' && e.rarity !== 'legendary';
      return true;
    });
    if (pool.length > 0) {
      const eq = pool[Math.floor(Math.random() * pool.length)];
      drops.push({ type:'equipment', item: { ...eq, id: Date.now() + Math.random() } });
    }
  }

  // Consumable (15%)
  if (Math.random() < 0.15) {
    const pool = CONSUMABLES.filter(c => c.rarity === 'common' || enemyDef.rarity !== 'common');
    const con = pool[Math.floor(Math.random() * pool.length)];
    drops.push({ type:'consumable', item: { ...con } });
  }

  return drops;
}

// ── 웨이브 생성 (UnitFactory 경유) ──
export function generateWave(waveNum, stageLevel = 1, playerPower = 0) {
  return UnitFactory.createWave(waveNum, stageLevel, playerPower, ENEMIES, BOSSES);
}

// ── 보스 전용 웨이브 (UnitFactory 경유) ──
export function generateBossWave(bossId, stageLevel = 1) {
  const b = BOSSES[bossId] || BOSSES.king_slime;
  const scaling = 1 + (stageLevel - 1) * 0.15;
  const boss = UnitFactory.createBoss(b, scaling, {});
  // Minions
  const minions = [];
  for (let i = 0; i < 3; i++) {
    const keys = Object.keys(ENEMIES);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const e = ENEMIES[key];
    minions.push(UnitFactory.createEnemy(e, scaling, {}));
  }
  return { waveNum: 'BOSS', enemies: minions, boss, scaling };
}
