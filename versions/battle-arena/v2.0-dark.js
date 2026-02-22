// ============================================================
// 🏟️ 몽글벨 - 배틀아레나 종합 시스템 (battle-arena.js)
// ============================================================
// UnitFactory 연동: 보스/적 생성 시 UnitFactory 사용
// ============================================================
import UnitFactory from '../data/unit-factory.js';
import { getWavePhase } from '../data/wave-scaling-config.js';

// ─── 아레나 테마 ───
export const ARENA_THEMES = {
  desert: {
    name: '잊혀진 사막의 투기장',
    groundColors: ['#d4a574','#c9956b','#deb887','#c4a265','#b8935a'],
    skyGradient: {
      day:['#87CEEB','#f0e68c','#daa520'], night:['#0a0a2e','#1a1a4e','#2d1b4e'],
      dawn:['#ff7f50','#ffa07a','#87CEEB'], dusk:['#ff6347','#ff4500','#1a0a2e'],
    },
    sun: { color:'#ffd700', glow:'#fff8dc', size:40 },
    moon: { color:'#f0f0ff', glow:'#b0c4de', size:30 },
    objects: [
      { type:'cactus', emoji:'🌵', w:1, h:2, solid:true, freq:0.15 },
      { type:'rock', emoji:'🪨', w:2, h:1, solid:true, freq:0.2 },
      { type:'skull', emoji:'💀', w:1, h:1, solid:false, freq:0.05 },
      { type:'oasis', emoji:'🌴', w:3, h:3, solid:true, freq:0.03, glow:'#00bfff' },
      { type:'pyramid', emoji:'🔺', w:5, h:4, solid:false, freq:0.02, layer:'bg' },
    ],
    ambientDay: [
      { type:'sand_wind', color:'#d4a57440', count:15, speed:2.0, size:4, dir:'right' },
      { type:'heat_shimmer', color:'#ffffff20', count:8, speed:0.3, size:20 },
      { type:'tumble_weed', emoji:'🌿', count:2, speed:1.5, size:8 },
    ],
    ambientNight: [
      { type:'star', emoji:'⭐', color:'#ffd700', count:50, speed:0.05, size:2, twinkle:true },
      { type:'shooting_star', color:'#ffffff', count:1, speed:8, size:2 },
      { type:'firefly', emoji:'✨', color:'#55efc4', count:8, speed:0.4, size:3 },
    ],
    weather: ['clear','sandstorm','heat_wave'],
  },

  sky: {
    name: '구름 위의 전장',
    groundColors: ['#e8eeff','#dde4ff','#d0d8f8','#c8d4ff','#f0f4ff'],
    skyGradient: {
      day:['#4a90d9','#87CEEB','#b0e0e6'], night:['#0a0a3e','#1a1a5e','#2a2a6e'],
      dawn:['#ff9a9e','#fad0c4','#87CEEB'], dusk:['#a18cd1','#fbc2eb','#1a1a3e'],
    },
    sun: { color:'#fff44f', glow:'#ffeaa7', size:50 },
    moon: { color:'#f5f5ff', glow:'#c8d6e5', size:35 },
    objects: [
      { type:'cloud_platform', emoji:'☁️', w:4, h:2, solid:true, freq:0.2, floating:true },
      { type:'cloud_small', emoji:'☁️', w:2, h:1, solid:false, freq:0.3, layer:'bg', floating:true },
      { type:'rainbow', emoji:'🌈', w:6, h:3, solid:false, freq:0.02, layer:'bg' },
      { type:'float_island', emoji:'🏝️', w:3, h:2, solid:true, freq:0.05, floating:true },
      { type:'wind_chime', emoji:'🎐', w:1, h:2, solid:false, freq:0.1 },
    ],
    ambientDay: [
      { type:'bird', emoji:'🐦', count:5, speed:1.2, size:8, pattern:'fly_circle' },
      { type:'cloud_drift', emoji:'☁️', color:'#ffffff60', count:6, speed:0.3, size:30 },
      { type:'wind', emoji:'💨', color:'#b2bec340', count:12, speed:1.5, size:3, dir:'right' },
      { type:'petal', emoji:'🌸', color:'#ff69b4', count:8, speed:0.5, size:5 },
    ],
    ambientNight: [
      { type:'star', emoji:'⭐', color:'#ffd700', count:80, speed:0.03, size:2, twinkle:true },
      { type:'shooting_star', color:'#ffffff', count:2, speed:10, size:2 },
      { type:'moon_glow', color:'#f0f0ff20', count:1, speed:0, size:80 },
    ],
    weather: ['clear','windy','thunderstorm','aurora'],
    isAerial: true,
  },

  volcano: {
    name: '불타는 화산의 심장',
    groundColors: ['#2d1b0e','#3d2010','#4a2808','#1e0f05','#5c3015'],
    skyGradient: {
      day:['#4a1a0a','#8b3a1a','#c0392b'], night:['#0a0000','#1a0505','#2d0a0a'],
      dawn:['#ff4500','#ff6347','#8b3a1a'], dusk:['#8b0000','#ff4500','#0a0000'],
    },
    sun: { color:'#ff4500', glow:'#ff6347', size:45 },
    moon: { color:'#cd5c5c', glow:'#8b000080', size:30 },
    objects: [
      { type:'lava_pool', emoji:'🟠', w:3, h:2, solid:true, freq:0.1, glow:'#ff4500', damage:true },
      { type:'fire_geyser', emoji:'🔥', w:1, h:3, solid:true, freq:0.08, glow:'#ff6347' },
      { type:'obsidian', emoji:'⬛', w:2, h:2, solid:true, freq:0.15 },
      { type:'charred_tree', emoji:'🥀', w:2, h:3, solid:true, freq:0.05 },
      { type:'fire_crystal', emoji:'💎', w:1, h:1, solid:false, freq:0.07, glow:'#ff4500' },
    ],
    ambientDay: [
      { type:'ember', emoji:'🔥', color:'#ff4500', count:25, speed:0.8, size:4, rise:true },
      { type:'smoke', emoji:'💨', color:'#636e7240', count:10, speed:0.2, size:15, rise:true },
      { type:'ash', color:'#888888', count:20, speed:0.3, size:2 },
    ],
    ambientNight: [
      { type:'ember', emoji:'🔥', color:'#ff4500', count:30, speed:0.8, size:4, rise:true },
      { type:'lava_glow', color:'#ff440030', count:5, speed:0.1, size:40 },
    ],
    weather: ['clear','ash_rain','eruption'],
  },

  ocean: {
    name: '깊은 바다의 전장',
    groundColors: ['#1a3c5e','#0f2b4a','#1e4d6e','#0a2040','#2a5478'],
    skyGradient: {
      day:['#006994','#0099cc','#00bcd4'], night:['#001122','#002244','#003366'],
      dawn:['#004466','#006688','#0099cc'], dusk:['#003355','#005577','#001122'],
    },
    sun: { color:'#00bcd4', glow:'#80deea', size:35 },
    moon: { color:'#b0bec5', glow:'#607d8b', size:25 },
    objects: [
      { type:'coral', emoji:'🪸', w:2, h:2, solid:true, freq:0.15 },
      { type:'seaweed', emoji:'🌿', w:1, h:2, solid:false, freq:0.2 },
      { type:'shell', emoji:'🐚', w:1, h:1, solid:false, freq:0.1 },
      { type:'treasure', emoji:'🪙', w:1, h:1, solid:false, freq:0.03, glow:'#ffd700' },
      { type:'ship', emoji:'🚢', w:4, h:3, solid:true, freq:0.02, layer:'bg' },
    ],
    ambientDay: [
      { type:'bubble', color:'#ffffff60', count:20, speed:0.5, size:4, rise:true },
      { type:'fish', emoji:'🐟', count:6, speed:0.8, size:8, pattern:'swim' },
      { type:'light_ray', color:'#ffffff15', count:4, speed:0.05, size:60 },
      { type:'jellyfish', emoji:'🪼', count:3, speed:0.2, size:12, floating:true },
    ],
    ambientNight: [
      { type:'bioluminescence', color:'#00ff8840', count:15, speed:0.3, size:5, twinkle:true },
      { type:'deep_bubble', color:'#ffffff30', count:10, speed:0.3, size:3, rise:true },
    ],
    weather: ['clear','current','deep_pressure'],
    isUnderwater: true,
  },

  fairy_garden: {
    name: '꽃피는 요정의 정원',
    groundColors: ['#2d5016','#3a6b1e','#4a7c2e','#356028','#2e5522'],
    skyGradient: {
      day:['#87CEEB','#98d8c8','#b0e0e6'], night:['#0f0f3e','#1a1a5e','#2d1b6e'],
      dawn:['#fbc2eb','#a6c1ee','#87CEEB'], dusk:['#a18cd1','#f5c2e7','#1a1a3e'],
    },
    sun: { color:'#ffd700', glow:'#fff8dc', size:45 },
    moon: { color:'#e8d8ff', glow:'#c084fc40', size:35 },
    objects: [
      { type:'magic_tree', emoji:'🌳', w:3, h:4, solid:true, freq:0.08, glow:'#ff69b4' },
      { type:'giant_flower', emoji:'🌺', w:2, h:2, solid:true, freq:0.12 },
      { type:'toadstool', emoji:'🍄', w:1, h:1, solid:false, freq:0.15, glow:'#ff69b4' },
      { type:'fairy_ring', emoji:'⭕', w:3, h:3, solid:false, freq:0.03, glow:'#dda0dd' },
      { type:'well', emoji:'⛲', w:2, h:2, solid:true, freq:0.02 },
      { type:'rainbow_bush', emoji:'🌈', w:2, h:1, solid:false, freq:0.1 },
    ],
    ambientDay: [
      { type:'butterfly', emoji:'🦋', color:'#ff69b4', count:8, speed:0.6, size:8 },
      { type:'petal', emoji:'🌸', color:'#ff69b4', count:15, speed:0.3, size:5 },
      { type:'fairy_dust', emoji:'✨', color:'#ffd700', count:20, speed:0.4, size:3, twinkle:true },
      { type:'ladybug', emoji:'🐞', count:3, speed:0.3, size:5 },
    ],
    ambientNight: [
      { type:'firefly', emoji:'✨', color:'#55efc4', count:30, speed:0.4, size:3, twinkle:true },
      { type:'moon_petal', emoji:'🌸', color:'#f5c2e780', count:8, speed:0.2, size:5 },
      { type:'star', emoji:'⭐', color:'#ffd700', count:40, speed:0.03, size:2, twinkle:true },
    ],
    weather: ['clear','light_rain','rainbow','pollen'],
  },
};

// ─── 시간대 시스템 ───
export const TIME_SYSTEM = {
  GAME_MINUTE_MS: 1000, // 1초 = 게임 1분 (24초 = 1일)

  getTimeOfDay(gameTime) {
    const h = Math.floor((gameTime / 1000 / 60) % 24);
    if (h >= 6 && h < 8) return 'dawn';
    if (h >= 8 && h < 18) return 'day';
    if (h >= 18 && h < 20) return 'dusk';
    return 'night';
  },

  getHour(gameTime) {
    return Math.floor((gameTime / 1000 / 60) % 24);
  },

  getSunMoonPos(gameTime, w, h) {
    const hour = (gameTime / 1000 / 60) % 24;
    const sunAng = ((hour - 6) / 12) * Math.PI;
    const moonAng = (((hour - 18 + 24) % 24) / 12) * Math.PI;
    return {
      sun: {
        x: w * 0.1 + (w * 0.8) * ((hour - 6) / 12),
        y: Math.max(20, h * 0.1 + Math.sin(sunAng) * (-h * 0.3)),
        visible: hour >= 6 && hour < 18,
      },
      moon: {
        x: w * 0.1 + (w * 0.8) * (((hour - 18 + 24) % 24) / 12),
        y: Math.max(20, h * 0.1 + Math.sin(moonAng) * (-h * 0.3)),
        visible: hour >= 18 || hour < 6,
      },
    };
  },
};

// ─── 보스 정의 ───
export const ARENA_BOSSES = {
  sand_worm: {
    name:'사막 대지렁이', emoji:'🪱', hp:500, atk:35, def:15, speed:2.0, size:3, element:'earth',
    patterns: [
      { name:'모래 잠수', type:'burrow', dur:2, dmg:0 },
      { name:'모래 폭풍', type:'aoe', radius:120, dmg:25, cd:6 },
      { name:'꼬리 후려치기', type:'cone', angle:90, range:80, dmg:40, cd:3 },
      { name:'지진', type:'screen_shake', dur:1, dmg:15, cd:8 },
    ],
    phases: [
      { hp:100, name:'출현', spdM:1.0, atkM:1.0 },
      { hp:60, name:'분노', spdM:1.3, atkM:1.3, minions:{ type:'sand_beetle', n:3 } },
      { hp:25, name:'폭주', spdM:1.6, atkM:1.8, minions:{ type:'sand_beetle', n:5 }, special:'sand_tsunami' },
    ],
    drops: { gold:[500,1000], equip:'desert_crown', summon:'earth_legendary' },
  },
  storm_dragon: {
    name:'폭풍의 드래곤', emoji:'🐉', hp:800, atk:45, def:20, speed:3.0, size:4, element:'wind',
    patterns: [
      { name:'번개 숨결', type:'beam', w:40, range:250, dmg:50, cd:5 },
      { name:'폭풍 날개', type:'aoe', radius:150, dmg:30, cd:4, knockback:5 },
      { name:'급강하', type:'dive', speed:15, dmg:60, cd:8 },
      { name:'번개 비', type:'rain', count:12, radius:200, dmg:20, cd:7 },
      { name:'날갯짓', type:'wind_push', force:3, dur:2, cd:6 },
    ],
    phases: [
      { hp:100, name:'비행', spdM:1.0, atkM:1.0, flying:true },
      { hp:50, name:'번개 폭풍', spdM:1.5, atkM:1.5, weather:'thunderstorm', minions:{ type:'storm_bird', n:4 } },
      { hp:20, name:'최후의 포효', spdM:2.0, atkM:2.0, special:'mega_lightning' },
    ],
    drops: { gold:[800,1500], equip:'storm_wings', summon:'wind_legendary' },
  },
  magma_golem: {
    name:'마그마 골렘', emoji:'🗿', hp:1000, atk:55, def:35, speed:1.2, size:4, element:'fire',
    patterns: [
      { name:'용암 분출', type:'pillar', count:5, dmg:35, cd:4 },
      { name:'화염 방사', type:'cone', angle:60, range:120, dmg:30, cd:3 },
      { name:'지면 강타', type:'aoe', radius:80, dmg:50, cd:5, stun:1.0 },
      { name:'용암 파도', type:'wave', w:300, speed:3, dmg:25, cd:6 },
    ],
    phases: [
      { hp:100, name:'깨어남', spdM:0.8, atkM:1.0 },
      { hp:60, name:'과열', spdM:1.0, atkM:1.5, aura:{ type:'fire', dmg:5, r:50 } },
      { hp:30, name:'용암 폭발', spdM:1.3, atkM:2.0, minions:{ type:'lava_slime', n:6 }, special:'eruption' },
    ],
    drops: { gold:[1000,2000], equip:'magma_armor', summon:'fire_legendary' },
  },
  kraken: {
    name:'크라켄', emoji:'🐙', hp:700, atk:40, def:18, speed:2.5, size:5, element:'water',
    patterns: [
      { name:'촉수 공격', type:'multi_hit', count:6, dmg:15, cd:3 },
      { name:'먹물', type:'aoe', radius:100, dmg:10, cd:5, blind:3.0 },
      { name:'해일', type:'wave', w:400, speed:5, dmg:35, cd:7 },
      { name:'소용돌이', type:'vortex', radius:80, dur:3, dmg:10, cd:6, pull:4 },
    ],
    phases: [
      { hp:100, name:'등장', spdM:1.0, atkM:1.0, tentacles:4 },
      { hp:50, name:'격노', spdM:1.3, atkM:1.5, tentacles:6, weather:'current' },
      { hp:20, name:'심해의 분노', spdM:1.8, atkM:2.0, tentacles:8, special:'tidal_wave' },
    ],
    drops: { gold:[700,1300], equip:'kraken_tentacle', summon:'water_legendary' },
  },
  dark_fairy_queen: {
    name:'타락한 요정 여왕', emoji:'🧚', hp:600, atk:50, def:12, speed:3.5, size:3, element:'dark',
    patterns: [
      { name:'그림자 나비', type:'projectile_spread', count:8, speed:6, dmg:15, cd:2 },
      { name:'저주의 가시', type:'line', range:150, w:20, dmg:35, cd:3, slow:0.5 },
      { name:'어둠의 꽃', type:'delayed_aoe', radius:50, dmg:40, cd:5, delay:1.5, count:3 },
      { name:'매혹', type:'cc', range:100, dur:2, cd:8 },
      { name:'분신 소환', type:'summon_clone', count:2, cd:10 },
    ],
    phases: [
      { hp:100, name:'우아한 등장', spdM:1.0, atkM:1.0, teleport:true },
      { hp:50, name:'본색', spdM:1.5, atkM:1.5, minions:{ type:'shadow_fairy', n:4 } },
      { hp:20, name:'절망의 꽃', spdM:2.0, atkM:2.0, special:'dark_garden', aura:{ type:'dark', dmg:3, r:60 } },
    ],
    drops: { gold:[600,1200], equip:'fairy_crown', summon:'dark_legendary' },
  },
};

// ─── 귀여운 슬라임 몹 정의 ───
export const CUTE_SLIMES = {
  pink:   { name:'핑크 슬라임', emoji:'🩷', hp:50, atk:5, def:2, speed:1.5, gold:[5,15], color:'#ff69b4' },
  blue:   { name:'파란 슬라임', emoji:'💙', hp:70, atk:8, def:3, speed:1.8, gold:[8,20], color:'#74b9ff', element:'water' },
  green:  { name:'초록 슬라임', emoji:'💚', hp:100,atk:6, def:5, speed:1.2, gold:[10,25], color:'#55efc4', element:'nature', poison:true },
  purple: { name:'보라 슬라임', emoji:'💜', hp:80, atk:12,def:3, speed:2.0, gold:[12,30], color:'#a29bfe', element:'dark' },
  gold:   { name:'금색 슬라임', emoji:'💛', hp:60, atk:3, def:1, speed:3.0, gold:[50,100], color:'#ffd700', rare:true, fleeOnHit:true },
  red:    { name:'빨강 슬라임', emoji:'❤️', hp:90, atk:15,def:4, speed:2.2, gold:[15,35], color:'#ff6b6b', element:'fire' },
  ice:    { name:'얼음 슬라임', emoji:'🩵', hp:75, atk:10,def:6, speed:1.0, gold:[12,28], color:'#87ceeb', element:'ice', slow:true },
  // 보스 슬라임
  king:   { name:'킹 슬라임',   emoji:'👑', hp:500,atk:25,def:10,speed:1.0, gold:[200,500], color:'#ffd700', size:3, isBoss:true },
};

// ============================================================
// 핵심: BattleArena 클래스
// ============================================================
export class BattleArena {
  constructor(theme = 'fairy_garden', options = {}) {
    this.alwaysActive = options?.alwaysActive ?? true;
    this.theme = ARENA_THEMES[theme] || ARENA_THEMES.fairy_garden;
    this.themeName = theme;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.tileSize = options.tileSize || 32;

    this.gameTime = options.startHour ? options.startHour * 60 * 1000 : 8 * 60 * 1000; // 기본 오전 8시
    this.timeSpeed = options.timeSpeed || 1; // 시간 흐름 속도

    this.ground = this._generateGround();
    this.objects = this._placeObjects();
    this.ambientParticles = [];
    this.weatherState = 'clear';

    this._initAmbient();
  }

  // 바닥 생성
  _generateGround() {
    const cols = Math.ceil(this.width / this.tileSize);
    const rows = Math.ceil(this.height / this.tileSize);
    const colors = this.theme.groundColors;
    const ground = [];

    for (let y = 0; y < rows; y++) {
      ground[y] = [];
      for (let x = 0; x < cols; x++) {
        const noise = this._noise(x * 0.3, y * 0.3);
        const idx = Math.floor(Math.abs(noise) * colors.length) % colors.length;
        ground[y][x] = {
          color: colors[idx],
          variation: Math.random() * 15 - 7,
          hasDetail: Math.random() < 0.08,
        };
      }
    }
    return ground;
  }

  // 사물 배치
  _placeObjects() {
    const objects = [];
    const occupied = new Set();

    this.theme.objects.forEach(def => {
      const maxCount = Math.floor((this.width / this.tileSize) * (this.height / this.tileSize) * def.freq * 0.1);
      for (let i = 0; i < maxCount; i++) {
        if (Math.random() > def.freq) continue;
        const tx = Math.floor(Math.random() * (this.width / this.tileSize - def.w));
        const ty = Math.floor(Math.random() * (this.height / this.tileSize - def.h));
        const key = `${tx},${ty}`;
        if (occupied.has(key)) continue;

        for (let ox = 0; ox < def.w; ox++)
          for (let oy = 0; oy < def.h; oy++)
            occupied.add(`${tx+ox},${ty+oy}`);

        objects.push({
          ...def,
          x: tx * this.tileSize + (def.w * this.tileSize) / 2,
          y: ty * this.tileSize + (def.h * this.tileSize) / 2,
          baseY: ty * this.tileSize + (def.h * this.tileSize) / 2,
          scale: 0.8 + Math.random() * 0.4,
          floatPhase: Math.random() * Math.PI * 2,
        });
      }
    });

    return objects.sort((a, b) => a.y - b.y);
  }

  // 앰비언트 초기화
  _initAmbient() {
    const tod = TIME_SYSTEM.getTimeOfDay(this.gameTime);
    const effects = (tod === 'night' || tod === 'dusk') ? this.theme.ambientNight : this.theme.ambientDay;
    if (!effects) return;

    this.ambientParticles = [];
    effects.forEach(eff => {
      for (let i = 0; i < eff.count; i++) {
        this.ambientParticles.push({
          ...eff,
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (eff.dir === 'right' ? eff.speed : (Math.random() - 0.5) * eff.speed * 2),
          vy: eff.rise ? -eff.speed : (Math.random() - 0.5) * eff.speed * 2,
          alpha: 0.3 + Math.random() * 0.7,
          phase: Math.random() * Math.PI * 2,
          baseSize: eff.size * (0.5 + Math.random() * 0.5),
        });
      }
    });
  }

  // 프레임 업데이트
  update(dt) {
    this.gameTime += dt * this.timeSpeed;

    // 떠다니는 사물 업데이트
    const time = this.gameTime * 0.001;
    this.objects.forEach(obj => {
      if (obj.floating) {
        obj.y = obj.baseY + Math.sin(time + obj.floatPhase) * 5;
      }
    });

    // 앰비언트 파티클 업데이트
    this.ambientParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha = 0.3 + Math.sin(time * 2 + p.phase) * 0.4;
      if (p.twinkle) p.alpha = 0.2 + Math.abs(Math.sin(time * 3 + p.phase)) * 0.8;

      // 화면 밖이면 리셋
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;
    });
  }

  // Canvas 렌더링 (viewport 컬링: 카메라 영역만 렌더)
  render(ctx, viewport) {
    // viewport = { x, y, w, h } — 카메라가 보는 영역 (월드 좌표)
    const vx = viewport ? viewport.x : 0;
    const vy = viewport ? viewport.y : 0;
    const vw = viewport ? viewport.w : this.width;
    const vh = viewport ? viewport.h : this.height;

    const tod = TIME_SYSTEM.getTimeOfDay(this.gameTime);
    const skyColors = this.theme.skyGradient[tod] || this.theme.skyGradient.day;

    // 1. 하늘 그라디언트 (보이는 영역만)
    const skyGrad = ctx.createLinearGradient(vx, vy, vx, vy + vh);
    skyColors.forEach((c, i) => skyGrad.addColorStop(i / (skyColors.length - 1), c));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(vx, vy, vw, vh);

    // 2. 해/달
    const celestial = TIME_SYSTEM.getSunMoonPos(this.gameTime, this.width, this.height);
    if (celestial.sun.visible) this._drawCelestial(ctx, celestial.sun, this.theme.sun);
    if (celestial.moon.visible) this._drawCelestial(ctx, celestial.moon, this.theme.moon);

    // 3. 별 (밤에만)
    if (tod === 'night') this._drawStars(ctx);

    // 4. 바닥 (보이는 타일만)
    this._renderGround(ctx, vx, vy, vw, vh);

    // 5+6. 사물 (보이는 것만)
    const pad = 64;
    const objL = vx - pad, objR = vx + vw + pad, objT = vy - pad, objB = vy + vh + pad;
    for (const o of this.objects) {
      if (o.x >= objL && o.x <= objR && o.y >= objT && o.y <= objB) {
        this._renderObject(ctx, o);
      }
    }

    // 7. 앰비언트 파티클 (보이는 것만)
    this._renderAmbient(ctx, vx, vy, vw, vh);
  }

  _drawCelestial(ctx, pos, config) {
    // 글로우
    const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, config.size * 2);
    grad.addColorStop(0, config.glow + 'aa');
    grad.addColorStop(1, config.glow + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, config.size * 2, 0, Math.PI * 2);
    ctx.fill();
    // 본체
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, config.size, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawStars(ctx) {
    const time = this.gameTime * 0.001;
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5 + 50) % this.width;
      const y = (i * 97.3 + 30) % (this.height * 0.6);
      const alpha = 0.3 + Math.abs(Math.sin(time * 0.5 + i * 0.7)) * 0.7;
      const size = 1 + (i % 3);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _renderGround(ctx, vx, vy, vw, vh) {
    const ts = this.tileSize;
    // 보이는 타일 범위만 렌더링
    const startCol = Math.max(0, Math.floor((vx || 0) / ts));
    const endCol = Math.min(this.ground[0]?.length || 0, Math.ceil(((vx || 0) + (vw || this.width)) / ts) + 1);
    const startRow = Math.max(0, Math.floor((vy || 0) / ts));
    const endRow = Math.min(this.ground.length, Math.ceil(((vy || 0) + (vh || this.height)) / ts) + 1);

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = this.ground[y][x];
        if (!tile) continue;
        ctx.fillStyle = this._adjustColor(tile.color, tile.variation);
        ctx.fillRect(x * ts, y * ts, ts, ts);
      }
    }
  }

  _renderObject(ctx, obj) {
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.scale(obj.scale, obj.scale);

    if (obj.glow) {
      const time = this.gameTime * 0.001;
      const a = 0.2 + Math.sin(time * 2) * 0.1;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, obj.w * this.tileSize);
      grad.addColorStop(0, obj.glow + Math.floor(a * 255).toString(16).padStart(2, '0'));
      grad.addColorStop(1, obj.glow + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, obj.w * this.tileSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const fontSize = Math.min(obj.w, obj.h) * this.tileSize * 0.7;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(obj.emoji, 0, 0);

    ctx.restore();
  }

  _renderAmbient(ctx, vx, vy, vw, vh) {
    const pad = 20;
    const L = (vx || 0) - pad, R = (vx || 0) + (vw || this.width) + pad;
    const T = (vy || 0) - pad, B = (vy || 0) + (vh || this.height) + pad;
    for (const p of this.ambientParticles) {
      if (p.x < L || p.x > R || p.y < T || p.y > B) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      if (p.emoji) {
        ctx.font = `${p.baseSize * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // 보스 생성 (UnitFactory 경유)
  spawnBoss(bossType) {
    const def = ARENA_BOSSES[bossType];
    if (!def) return null;
    const boss = UnitFactory.createArenaBoss(def, {
      x: this.width * 0.7,
      y: this.height * 0.4,
    });
    boss.id = `boss_${Date.now()}`;
    boss.currentPhase = 0;
    return boss;
  }

  // 슬라임 웨이브 생성 (UnitFactory 경유)
  spawnSlimeWave(waveNum, options = {}) {
    const enemies = [];
    let baseCount = 5 + waveNum * 2;

    // WAVE_PHASES spawnMult 적용
    if (options.elapsedSec !== undefined) {
      const phase = getWavePhase(options.elapsedSec);
      baseCount = Math.max(1, Math.round(baseCount * phase.spawnMult));
    }

    const count = baseCount;
    const types = Object.keys(CUTE_SLIMES).filter(k => !CUTE_SLIMES[k].isBoss);
    const scale = 1 + (waveNum - 1) * 0.1;

    for (let i = 0; i < count; i++) {
      let type;
      if (Math.random() < 0.05) type = 'gold';
      else if (waveNum >= 3 && Math.random() < 0.2) type = types[Math.floor(Math.random() * types.length)];
      else type = waveNum <= 1 ? 'pink' : types[Math.floor(Math.random() * Math.min(types.length, waveNum + 1))];

      const def = CUTE_SLIMES[type];
      const slime = UnitFactory.createArenaEnemy(def, scale);
      slime.id = `slime_${Date.now()}_${i}`;
      slime.type = type;
      slime.x = this.width + 50 + Math.random() * 200;
      slime.y = 100 + Math.random() * (this.height - 200);
      slime.bouncePhase = Math.random() * Math.PI * 2;
      enemies.push(slime);
    }

    // 5웨이브마다 보스
    if (waveNum % 5 === 0) {
      const king = CUTE_SLIMES.king;
      const bossSlime = UnitFactory.createArenaEnemy(king, scale);
      bossSlime.id = `boss_${Date.now()}`;
      bossSlime.type = 'king';
      bossSlime.x = this.width + 100;
      bossSlime.y = this.height * 0.4;
      bossSlime.bouncePhase = 0;
      enemies.push(bossSlime);
    }

    return { waveNum, enemies, count: enemies.length };
  }

  // 유틸
  _noise(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  _adjustColor(hex, amount) {
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
    return `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)})`;
  }

  // JSON 저장
  toJSON() {
    return JSON.stringify({
      theme: this.themeName,
      gameTime: this.gameTime,
      width: this.width,
      height: this.height,
    });
  }
}
