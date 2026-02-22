/**
 * characters.js — 영웅 20종, 인간 병사 4종, NPC 4종
 * 각 캐릭터: 6스탯(HP,ATK,DEF,SPD,CRIT,LUCK) + 스킬/궁극기/패시브
 */

// ── 영웅(신) 20종 ──
export const HEROES = [
  // ── 전사 계열 ──
  { id:'berserker', name:'버서커', emoji:'⚔️', cls:'warrior', rarity:'epic',
    stats:{hp:1200,atk:85,def:40,spd:30,crit:15,luck:5},
    skills:['berserker_rage','whirlwind','blood_strike'],
    ultimate:'blood_frenzy', passives:['atk_up_10','lifesteal_5'] },
  { id:'paladin', name:'성기사', emoji:'🛡️', cls:'warrior', rarity:'epic',
    stats:{hp:1400,atk:60,def:70,spd:25,crit:10,luck:8},
    skills:['divine_strike','holy_shield','judgment'],
    ultimate:'divine_judgment', passives:['def_up_10','heal_on_hit'] },
  { id:'dark_knight', name:'다크나이트', emoji:'🖤', cls:'warrior', rarity:'legendary',
    stats:{hp:1100,atk:90,def:45,spd:35,crit:20,luck:5},
    skills:['dark_slash','shadow_step','soul_drain'],
    ultimate:'eclipse_blade', passives:['crit_up_5','dark_resist'] },
  { id:'sword_saint', name:'검제', emoji:'🗡️', cls:'warrior', rarity:'legendary',
    stats:{hp:1000,atk:95,def:35,spd:40,crit:25,luck:8},
    skills:['flash_cut','sword_dance','ultimate_slash'],
    ultimate:'thousand_blades', passives:['spd_up_10','counter_rate'] },
  { id:'musashi', name:'무사', emoji:'⛩️', cls:'warrior', rarity:'epic',
    stats:{hp:1050,atk:80,def:50,spd:35,crit:18,luck:7},
    skills:['iai_slash','parry','blade_storm'],
    ultimate:'way_of_sword', passives:['focus_strike','bushido'] },

  // ── 마법 계열 ──
  { id:'archmage', name:'아크메이지', emoji:'🔮', cls:'mage', rarity:'epic',
    stats:{hp:750,atk:100,def:25,spd:30,crit:15,luck:10},
    skills:['fireball','ice_storm','meteor'],
    ultimate:'armageddon', passives:['magic_amp_10','mana_regen'] },
  { id:'elementalist', name:'정령사', emoji:'🌊', cls:'mage', rarity:'epic',
    stats:{hp:800,atk:85,def:30,spd:35,crit:12,luck:12},
    skills:['summon_fire','summon_water','summon_earth'],
    ultimate:'elemental_convergence', passives:['elem_boost','spirit_bond'] },
  { id:'necromancer', name:'네크로맨서', emoji:'💀', cls:'mage', rarity:'legendary',
    stats:{hp:850,atk:80,def:30,spd:28,crit:10,luck:15},
    skills:['raise_dead','bone_spear','curse'],
    ultimate:'army_of_dead', passives:['undead_army','soul_harvest'] },
  { id:'chronomancer', name:'시간술사', emoji:'⏳', cls:'mage', rarity:'legendary',
    stats:{hp:700,atk:90,def:20,spd:45,crit:18,luck:20},
    skills:['time_stop','rewind','haste'],
    ultimate:'temporal_rift', passives:['time_warp','chrono_shield'] },
  { id:'alchemist', name:'연금술사', emoji:'⚗️', cls:'mage', rarity:'epic',
    stats:{hp:900,atk:70,def:35,spd:30,crit:10,luck:18},
    skills:['acid_bomb','transmute','elixir'],
    ultimate:'philosophers_stone', passives:['potion_master','gold_touch'] },

  // ── 궁수 계열 ──
  { id:'ranger', name:'레인저', emoji:'🏹', cls:'archer', rarity:'epic',
    stats:{hp:800,atk:80,def:30,spd:40,crit:20,luck:10},
    skills:['multi_shot','rain_of_arrows','eagle_eye'],
    ultimate:'storm_of_arrows', passives:['crit_up_5','nature_sense'] },
  { id:'sniper', name:'스나이퍼', emoji:'🎯', cls:'archer', rarity:'epic',
    stats:{hp:700,atk:95,def:20,spd:30,crit:30,luck:8},
    skills:['aimed_shot','headshot','stealth'],
    ultimate:'one_shot_kill', passives:['piercing_shot','steady_aim'] },
  { id:'hunter', name:'사냥꾼', emoji:'🪃', cls:'archer', rarity:'rare',
    stats:{hp:850,atk:75,def:35,spd:35,crit:15,luck:12},
    skills:['trap_set','beast_call','net_throw'],
    ultimate:'legendary_hunt', passives:['tracker','beast_tamer'] },
  { id:'marksman', name:'저격수', emoji:'🔫', cls:'archer', rarity:'epic',
    stats:{hp:650,atk:100,def:18,spd:28,crit:35,luck:5},
    skills:['snipe','smoke_bomb','explosive_round'],
    ultimate:'bullet_time', passives:['long_range','quick_reload'] },
  { id:'trapper', name:'함정사', emoji:'🪤', cls:'archer', rarity:'rare',
    stats:{hp:900,atk:65,def:40,spd:32,crit:12,luck:15},
    skills:['bear_trap','poison_dart','caltrops'],
    ultimate:'death_zone', passives:['trap_mastery','evasion'] },

  // ── 지원 계열 ──
  { id:'priest', name:'성직자', emoji:'⛪', cls:'support', rarity:'epic',
    stats:{hp:1000,atk:45,def:45,spd:25,crit:5,luck:15},
    skills:['heal','group_heal','purify'],
    ultimate:'divine_resurrection', passives:['heal_amp','blessing'] },
  { id:'bard', name:'음유시인', emoji:'🎵', cls:'support', rarity:'rare',
    stats:{hp:850,atk:55,def:35,spd:35,crit:10,luck:18},
    skills:['inspire','war_song','lullaby'],
    ultimate:'symphony_of_war', passives:['party_buff','encore'] },
  { id:'dancer', name:'댄서', emoji:'💃', cls:'support', rarity:'rare',
    stats:{hp:750,atk:65,def:30,spd:45,crit:15,luck:12},
    skills:['blade_dance','charm','acrobatics'],
    ultimate:'dance_of_death', passives:['evasion_up','grace'] },
  { id:'samurai_s', name:'사무라이', emoji:'🥷', cls:'support', rarity:'legendary',
    stats:{hp:950,atk:78,def:42,spd:38,crit:22,luck:8},
    skills:['zen_cut','meditate','bushido_stance'],
    ultimate:'final_form', passives:['resolve','honor'] },
  { id:'ninja', name:'닌자', emoji:'🌑', cls:'support', rarity:'legendary',
    stats:{hp:700,atk:88,def:25,spd:50,crit:28,luck:15},
    skills:['shuriken','shadow_clone','vanish'],
    ultimate:'assassinate', passives:['stealth_mastery','agility'] },
];

// ── 인간 병사 4종 ──
export const SOLDIERS = [
  { id:'infantry', name:'보병', emoji:'🛡️', role:'tanker', rarity:'common',
    stats:{hp:600,atk:25,def:40,spd:20,crit:5,luck:5},
    skill:'shield_wall', desc:'전열 방어, 데미지 감소' },
  { id:'archer_s', name:'궁수', emoji:'🏹', role:'dealer', rarity:'common',
    stats:{hp:350,atk:45,def:15,spd:35,crit:15,luck:8},
    skill:'volley', desc:'원거리 일제 사격' },
  { id:'cavalry', name:'기병', emoji:'🐴', role:'charge', rarity:'common',
    stats:{hp:500,atk:40,def:25,spd:45,crit:10,luck:5},
    skill:'charge_attack', desc:'돌격 데미지 2배' },
  { id:'mage_s', name:'마법사', emoji:'🪄', role:'aoe', rarity:'common',
    stats:{hp:300,atk:55,def:10,spd:25,crit:10,luck:12},
    skill:'aoe_blast', desc:'광역 마법 공격' },
];

// ── NPC 4종 ──
export const NPCS = [
  { id:'barto', name:'바르토', emoji:'🏪', role:'shop',
    greeting:'어서오세요! 좋은 물건 많습니다!',
    services:['buy','sell','special_deal'] },
  { id:'priest_npc', name:'성직자', emoji:'⛪', role:'buff',
    greeting:'신의 축복이 함께 하시길.',
    services:['buff_hp','buff_atk','buff_def','purify'] },
  { id:'blacksmith', name:'대장장이', emoji:'🔨', role:'enhance',
    greeting:'뭘 만들어 줄까?',
    services:['enhance','craft','repair','dismantle'] },
  { id:'alchemist_npc', name:'연금술사', emoji:'⚗️', role:'potion',
    greeting:'특별한 물약이 필요한가?',
    services:['hp_potion','mp_potion','buff_potion','holy_water'] },
];

// ── 클래스별 기본 색상 ──
export const CLASS_COLORS = {
  warrior: '#ff4444',
  mage: '#4488ff',
  archer: '#44bb44',
  support: '#ffbb44',
};

export default { HEROES, SOLDIERS, NPCS, CLASS_COLORS };
