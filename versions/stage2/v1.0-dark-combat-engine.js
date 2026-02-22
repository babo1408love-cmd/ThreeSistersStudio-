/**
 * CombatEngine — 스테이지2 Canvas 횡스크롤 전투
 * 귀여운 슬라임, 자동공격, 업그레이드 드롭, 분노게이지, 펫회복
 *
 * HeroCore 허브 시스템 경유:
 *   모든 생성기·시스템이 주인공에게 탑재되어 HeroCore를 통해 접근
 */
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import { ENEMIES, BOSSES, generateWave, generateDrop } from '../generators/enemy-drop-generator.js';
import { generateMap, renderMap, generateSurvivorMap, renderSurvivorMap } from '../generators/map-generator.js';
import { renderAttack, getSkillByTier } from '../generators/spirit-attack-generator.js';
import BossRoomSystem, { BOSS_ROOM_PHASE } from './boss-room-system.js';
import AerialCombatSystem, { AERIAL_BOSS_APPROACH_CONFIG } from './aerial-combat-system.js';
import UnitFactory from '../data/unit-factory.js';
import BossApproachSystem from '../systems/boss-approach.js';
import { ENEMY_SPEED_CONFIG, calcEnemySpeed } from '../data/combat-config.js';
import HeroCore from '../systems/hero-core.js';
import StageDirector from '../systems/stage-director.js';
import { getWavePhase, applySpawnMult, DROP_CHANCE_PER_MOB, BOSS_DROP_GUARANTEED } from '../data/wave-scaling-config.js';
import CombatAIBalance from '../systems/combat-ai-balance.js';

// ── 업그레이드 아이템 정의 ──
const UPGRADE_ITEMS = [
  {id:'fast_attack',  name:'빠른공격',  emoji:'🔴',color:'#FF4444',desc:'공격속도 증가',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.fast_attack = (p._upgradeStacks.fast_attack||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('fast_attack', eng?.stageLevel||1, p._upgradeStacks.fast_attack);
        p.atkSpeed = Math.round(p.atkSpeed * eff.value);
      } else { p.atkSpeed*=0.8; }
    }},
  {id:'strong_attack', name:'강한공격',  emoji:'🟠',color:'#FF8800',desc:'공격크기 증가',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.strong_attack = (p._upgradeStacks.strong_attack||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('strong_attack', eng?.stageLevel||1, p._upgradeStacks.strong_attack);
        p.projSize = Math.round(p.projSize * eff.value);
      } else { p.projSize=Math.min(p.projSize*1.5, p.radius * 5); }
    }},
  {id:'long_range',    name:'먼공격',    emoji:'🟡',color:'#FFDD00',desc:'사거리 증가',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.long_range = (p._upgradeStacks.long_range||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('long_range', eng?.stageLevel||1, p._upgradeStacks.long_range);
        p.projSpeed = Math.round(p.projSpeed * eff.value);
      } else { p.projSpeed*=1.3; }
    }},
  {id:'double_shot',   name:'연속발사',  emoji:'🟢',color:'#44BB44',desc:'연속 발사',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.double_shot = (p._upgradeStacks.double_shot||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('double_shot', eng?.stageLevel||1, p._upgradeStacks.double_shot);
        p.shotCount = eff.value;
      } else { p.shotCount=Math.min(p.shotCount+1,4); }
    }},
  {id:'pierce',        name:'관통공격',  emoji:'🔵',color:'#4488FF',desc:'관통 공격',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.pierce = (p._upgradeStacks.pierce||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('pierce', eng?.stageLevel||1, p._upgradeStacks.pierce);
        p.pierce = eff.value;
      } else { p.pierce=Math.min(p.pierce+1,4); }
    }},
  {id:'homing',        name:'유도탄',    emoji:'🟣',color:'#AA44CC',desc:'유도 미사일!',
    apply:(p,eng)=>{
      p.homing = true;
      p.homingProjectile = true;  // 비행 중 유도 활성화
      // 슬롯 영웅 + 정령도 유도 활성화
      if (eng) eng._homingUnlocked = true;
    }},
  {id:'hp_heal',       name:'HP회복',    emoji:'⚪',color:'#FFFFFF',desc:'HP 회복',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.hp_restore = (p._upgradeStacks.hp_restore||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('hp_restore', eng?.stageLevel||1, p._upgradeStacks.hp_restore);
        eng.healPlayer(Math.round(p.maxHp * eff.value));
      } else { eng.healPlayer(Math.round(p.maxHp*0.3)); }
    }},
  {id:'def_up',        name:'방어강화',  emoji:'🟤',color:'#8B4513',desc:'방어력 강화',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.defense_up = (p._upgradeStacks.defense_up||0)+1;
      if(typeof FormulaPack2!=='undefined'){
        const eff = FormulaPack2.getUpgradeEffect('defense_up', eng?.stageLevel||1, p._upgradeStacks.defense_up);
        p.defense += eff.value;
      } else { p.defense+=5; }
    }},
  // ── 신규 다양한 드롭 아이템 ──
  {id:'atk_boost',     name:'공격력 증가', emoji:'⚔️',color:'#FF6666',desc:'공격력 +15%',
    apply:(p,eng)=>{
      if(!p._upgradeStacks) p._upgradeStacks={};
      p._upgradeStacks.atk_boost = (p._upgradeStacks.atk_boost||0)+1;
      const stacks = p._upgradeStacks.atk_boost;
      p.attack = Math.round(p.attack * (1 + 0.15 * stacks) / (1 + 0.15 * (stacks - 1)));
    }},
  {id:'crit_rate',     name:'크리티컬',   emoji:'💥',color:'#FF00FF',desc:'치명타 확률 +10%',
    apply:(p,eng)=>{
      p.critRate = Math.min((p.critRate || 0) + 0.10, 0.80);
    }},
  {id:'crit_dmg',      name:'치명타 강화', emoji:'🔥',color:'#FF4500',desc:'치명타 데미지 +30%',
    apply:(p,eng)=>{
      p.critDamage = (p.critDamage || 1.5) + 0.30;
    }},
  {id:'speed_up',      name:'이동속도',   emoji:'👟',color:'#00DDFF',desc:'이동속도 증가',
    apply:(p,eng)=>{
      p.speed = Math.min((p.speed || 3) * 1.2, 8);
    }},
  {id:'magnet',        name:'자석',       emoji:'🧲',color:'#44DDFF',desc:'아이템 흡수 범위↑',
    apply:(p,eng)=>{
      if (eng) eng._magnetBonus = (eng._magnetBonus || 0) + 40;
    }},
  {id:'shield',        name:'보호막',     emoji:'🛡️',color:'#66CCFF',desc:'보호막 생성!',
    apply:(p,eng)=>{
      p._shieldHp = (p._shieldHp || 0) + Math.round(p.maxHp * 0.25);
    }},
  {id:'rage_charge',   name:'분노 충전',  emoji:'😡',color:'#CC0000',desc:'분노 +40%',
    apply:(p,eng)=>{
      if (eng) eng._addRage(40);
    }},
  {id:'bomb',          name:'폭탄',       emoji:'💣',color:'#FF3300',desc:'주변 적 폭발!',
    apply:(p,eng)=>{
      if (!eng) return;
      const bombDmg = p.attack * 3;
      const bombR = 150;
      eng.enemies.forEach(e => {
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx*dx+dy*dy < bombR*bombR) {
          e.hp -= bombDmg;
          eng._spawnHitParticles(e.x, e.y, '#FF3300');
        }
      });
      // 폭발 이펙트
      for (let i = 0; i < 15; i++) {
        eng.particles.push({
          x: p.x, y: p.y,
          vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6,
          life: 600, color: i%2===0?'#FF3300':'#FFAA00', size: 4+Math.random()*4, type:'circle',
        });
      }
      eng._screenShake = { timer: 0, duration: 300, intensity: 5 };
    }},
  {id:'exp_boost',     name:'경험치 부스트', emoji:'📚',color:'#22CC88',desc:'경험치 +50',
    apply:(p,eng)=>{
      if (eng && eng.heroEngine) eng.heroEngine.addExp(50);
    }},
  {id:'gold_rush',     name:'골드 러쉬',  emoji:'💰',color:'#FFD700',desc:'골드 +100',
    apply:(p,eng)=>{
      GameState.addGold(100);
      if (eng) eng.totalGold += 100;
    }},
];

// ── 드롭 가중치 (높을수록 자주 드롭) ──
const UPGRADE_WEIGHTS = {
  fast_attack: 10, strong_attack: 10, long_range: 8, double_shot: 6,
  pierce: 6, homing: 3, hp_heal: 12, def_up: 8,
  atk_boost: 8, crit_rate: 5, crit_dmg: 4, speed_up: 7,
  magnet: 5, shield: 4, rage_charge: 6, bomb: 3,
  exp_boost: 7, gold_rush: 8,
};
const _totalWeight = UPGRADE_ITEMS.reduce((s, u) => s + (UPGRADE_WEIGHTS[u.id] || 5), 0);
function pickWeightedUpgrade() {
  let r = Math.random() * _totalWeight;
  for (const u of UPGRADE_ITEMS) {
    r -= (UPGRADE_WEIGHTS[u.id] || 5);
    if (r <= 0) return u;
  }
  return UPGRADE_ITEMS[0];
}

export default class CombatEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = canvas.width;
    this.H = canvas.height;

    // Options
    this.stageLevel = options.stageLevel || 1;
    this.maxWaves = options.maxWaves || 4;
    this.onVictory = options.onVictory || (() => {});
    this.onDeath = options.onDeath || (() => {});
    this._aerial = options.aerial || false;
    this._bossTest = options.bossTest || false;

    // ══════════════════════════════════════
    //  HeroCore 허브 — 모든 것이 주인공에 탑재
    // ══════════════════════════════════════
    this.hero = HeroCore.getInstance();

    // HeroCore.mountCombat → 전투 엔티티 + 시스템 일괄 생성
    const combatData = this.hero.mountCombat({
      stageLevel: this.stageLevel,
      plan: options.plan,
      map: options.map,
      aerial: options.aerial,
    });

    // 전투 데이터를 로컬 참조 (기존 코드 호환)
    this._plan = combatData.plan;
    this.map = combatData.map;
    this.camera = { x: 0, y: 0 };
    this.player = combatData.player;
    this.slotHeroes = combatData.allies;
    this.spirits = combatData.spirits;
    this.pet = combatData.pet;

    // HeroAI 파티 데이터 연동 — 원소 정보
    if (typeof HeroAI !== 'undefined' && HeroAI.party._calculated) {
      const pd = window._heroAIPartyData;
      if (pd && pd.heroes.length > 0) {
        this.player.element = pd.heroes[0].element || 'light';
      }
    } else {
      this.player.element = 'light';
    }

    // 영웅 기본 조준: 적 방향으로 발사하되 직선 비행 (비행 중 유도 OFF)
    this.player.homing = true;           // 조준: 적 방향으로 발사
    this.player.homingProjectile = false; // 비행 중 유도: 아이템 획득 전 OFF

    // Entities
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.droppedItems = [];
    this.activeAttackFx = [];

    // 유도탄: 아이템 획득 전 OFF + 자석 보너스
    this._homingUnlocked = false;
    this._magnetBonus = 0;

    // ══════════════════════════════════════
    //  🌲 원근법 (Perspective) 시스템
    //  하단(가까운 곳) 넓고 크게, 상단(먼 곳) 좁고 작게
    // ══════════════════════════════════════
    this._perspEnabled = true;

    // 3가지 시선각 프리셋
    // normal: 기본 뷰, high: 위에서 → 넓은 전장, low: 아래서 → 좁지만 멀리 보임
    this.PERSP_PRESETS = {
      normal: { minDepth: 0.18, topW: 0.18, botW: 0.96, label: '기본 시야' },
      high:   { minDepth: 0.35, topW: 0.35, botW: 0.98, label: '탑뷰 (넓은)' },
      low:    { minDepth: 0.08, topW: 0.08, botW: 0.94, label: '로우뷰 (깊은)' },
    };
    this._perspMode = options.perspMode || 'normal';
    this._perspPreset = this.PERSP_PRESETS[this._perspMode];

    // 스테이지별 숲 테마
    const STAGE_FOREST_THEME = ['forest','forest','dark_forest','mushroom','crystal','autumn'];
    const forestTheme = STAGE_FOREST_THEME[Math.min(this.stageLevel, STAGE_FOREST_THEME.length - 1)] || 'forest';
    this._perspTrees = this._generateForestTrees({ theme: forestTheme, seed: Date.now() % 100000 });

    // 바닥 스크롤 (전진 환각 효과)
    // _bgScroll: 0~1 yNorm 누적, 배경이 아래로 흘러감 → 플레이어가 앞으로 걷는 것처럼 보임
    this._bgScroll = 0;
    this._bgScrollSpeed = 0.05; // yNorm/초 (20초 만에 화면 1회 순환)

    // 유닛 대형 (포메이션) 스폰 설정
    this._formationRow = 0;         // 현재 배열 행
    this._formationWave = 0;        // 웨이브 내 대형 번호

    // State
    this.running = false;
    this.currentWave = 0;
    this.waveSpawned = false;
    this.waveTimer = 0;
    this.waveDelay = 2500;   // 2.5초마다 웨이브
    this.totalKills = 0;
    this.totalGold = 0;
    this._animFrame = null;
    this._lastTime = 0;
    this._elapsed = 0;
    this._keys = {};
    this._touchStart = null;
    this._touchDir = { x: 0, y: 0 };

    // 실시간 AI 공격력 밸런스
    this.aiBalance = new CombatAIBalance(this.player);

    // HeroCore 경유 시스템 참조 (기존 코드 호환)
    this.rageSystem = this.hero.systems.rage;
    this.heroEngine = this.hero.systems.heroEngine;
    this.stageTimer = this.hero.systems.timer;
    this.autoScroll = this.hero.systems.autoScroll;
    this.autoWalk = this.hero.systems.autoWalk;

    // 타이머 콜백 연결
    this.stageTimer.onTimeUp = () => this._onTimerEnd();

    // Pet heal gauge
    this.petHealGauge = GameState.petHealGauge || 0;

    // 보스방 시스템
    this.bossRoomSystem = new BossRoomSystem(this, this.stageLevel);
    this.bossRoomSystem.setGatePosition(this.map.mapW, this.map.mapH);

    // 공중전 시스템
    this.aerialSystem = new AerialCombatSystem(this);

    // 화면 흔들림 상태
    this._screenShake = null;

    // 보스 접근 시스템 (우측에서 보스가 다가옴)
    this.bossApproach = new BossApproachSystem(this, {
      alwaysActive: true,
      mapWidth: this.map.mapW,
      mapHeight: this.map.mapH,
      stageLevel: this.stageLevel,
      autoScroll: this.autoScroll,
      approachConfig: this._aerial ? AERIAL_BOSS_APPROACH_CONFIG : undefined,
    });

    // 보스전 테스트 모드: 타이머 10초 + 보스 접근 즉시 시작
    if (this._bossTest) {
      this.stageTimer.duration = 10000;
      this.stageTimer.remaining = 10000;
      this.bossApproach.startDelay = 1000;
    }

    // ══════════════════════════════════════
    //  🧠 MasterDirector AI — 중앙 두뇌 초기화
    // ══════════════════════════════════════
    this._hitsTaken = 0;        // 피격 횟수 추적
    this._recentKills = 0;      // 최근 킬 카운터
    if (typeof MasterDirector !== 'undefined') {
      MasterDirector.init({
        hero: {
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          atk: this.player.attack,
          def: this.player.defense,
          spd: this.player.speed,
          dps: this._calcPlayerDPS(),
          level: GameState.heroLevel || 1,
        },
        enemies: this.enemies,
        elapsed: 0,
        stageLevel: this.stageLevel,
        killCount: 0,
        hitsTaken: 0,
      });

      // 7개 생성기 등록
      MasterDirector.registerGenerator('mob',     'mob_spawner');
      MasterDirector.registerGenerator('elite',   'elite_spawner');
      MasterDirector.registerGenerator('boss',    'boss_spawner');
      MasterDirector.registerGenerator('item',    'item_dropper');
      MasterDirector.registerGenerator('upgrade', 'upgrade_spawner');
      MasterDirector.registerGenerator('gold',    'gold_spawner');
      MasterDirector.registerGenerator('heal',    'heal_spawner');
      console.log('[CombatEngine] MasterDirector AI 연동 완료 — 7개 생성기 등록');
    }

    this._bindInput();

    // 레벨업 시 이벤트
    this.heroEngine.onLevelUp = (result) => {
    };
  }

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this.currentWave = 1;

    // FormationAI: 초기 배치 계산
    if (typeof FormationAI !== 'undefined') {
      const partyData = {
        heroes: [
          { id: 'main', class: GameState.heroUpgrade?.currentClass || 'warrior', role: 'tank_dps' },
          ...this.slotHeroes.map((h, i) => ({ id: `slot_${i}`, class: h.class || 'warrior', role: h.role || 'tank_dps' }))
        ],
        pet: this.pet ? { id: 'pet', type: this.pet.type || 'cat', rarity: this.pet.rarity || 'common' } : null,
        spirits: this.spirits.map((s, i) => ({ id: `spirit_${i}`, element: s.element || s.attribute, rarity: s.rarity || 'common' }))
      };
      this._formation = FormationAI.calculateFormation(partyData, { x: this.player.x, y: 0, z: this.player.y });
      // 전투 모드로 전환
      FormationAI.switchFormation(this._formation, 'combat', { x: this.player.x, z: this.player.y });
    }

    // 초기 웨이브 — _updateWaves()에서 SurvivorBalance/MasterDirector가 관리
    // this._spawnWave(); // 기존 메서드 제거됨 — _updateWaves로 대체
    this.stageTimer.start();
    this.autoScroll.start();
    this.autoWalk.start();
    // 5초 후 보스 접근 시작
    setTimeout(() => {
      if (this.running) this.bossApproach.start();
    }, this.bossApproach.startDelay);
    this._loop();
  }

  stop() {
    this.running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this._unbindInput();
    // HeroCore 경유 전투 시스템 일괄 언마운트
    this.hero.unmountCombat();
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(now - this._lastTime, 50);
    this._lastTime = now;
    this._elapsed += dt;
    this._update(dt);
    this._draw();
    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  // ══════════════════════════════════════
  //  UPDATE
  // ══════════════════════════════════════
  _update(dt) {
    // 🧠 MasterDirector AI — 매 프레임 게임 상태 전달
    if (typeof MasterDirector !== 'undefined' && MasterDirector._enabled) {
      MasterDirector.update(dt, {
        hero: {
          hp: this.player.hp,
          maxHp: this.player.maxHp,
          atk: this.player.attack,
          def: this.player.defense,
          spd: this.player.speed,
          dps: this._calcPlayerDPS(),
          level: GameState.heroLevel || 1,
        },
        enemies: this.enemies,
        elapsed: this._elapsed / 1000,
        stageLevel: this.stageLevel,
        killCount: this.totalKills,
        hitsTaken: this._hitsTaken,
        recentKills: this._recentKills,
      });
    }

    // ⏰ 스테이지 타이머 업데이트
    this.stageTimer.update(dt);

    // Screen shake update
    if (this._screenShake) {
      this._screenShake.timer += dt;
      if (this._screenShake.timer >= this._screenShake.duration) {
        this._screenShake = null;
      }
    }

    // 보스 접근 시스템 업데이트
    this.bossApproach.update(dt);

    // 🚶 바닥 스크롤 — 전진하는 것처럼 보이는 환각 효과
    if (this._perspEnabled && !this._getActiveBRS()) {
      this._bgScroll = (this._bgScroll + this._bgScrollSpeed * (dt / 1000)) % 1;
    }

    // 보스방 시스템 업데이트
    if (this.bossRoomSystem.enabled) {
      this.bossRoomSystem.update(dt);
    }

    // 공중전 시스템 업데이트
    this.aerialSystem.update(dt);

    // FormationAI: 정령 공전 + 파티 따라가기
    if (this._formation && typeof FormationAI !== 'undefined') {
      FormationAI.update(this._formation, { x: this.player.x, y: 0, z: this.player.y }, dt / 1000);
    }

    // ⚡ HeroEngine: SpeedAI 동기화 + 전술 AI + 스킬 쿨다운 + 위험도
    if (!this.bossApproach.isBlocking()) {
      this.heroEngine.update(dt, this.enemies);
    }

    // 보스 접근 시스템이 보스전 페이즈 → 보스방 전투 위임
    if (this.bossApproach.isInBossPhase()) {
      this._updatePlayer(dt);
      this._updateSlotHeroes(dt);
      this._updateSpirits(dt);
      this._updatePet(dt);
      this._updateAutoAttack(dt);
      this._updateEnemies(dt);
      this._updateProjectiles(dt);
      this._updateAttackFx(dt);
      this._updateDroppedItems();
      this._updateParticles(dt);
      this._updateRage(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 보스 접근 시스템이 블로킹 중 (MEETING/ARENA_FORMING) → 전투 중단
    if (this.bossApproach.isBlocking()) {
      this._updateParticles(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 보스방 내부에서는 자동전진 스킵, 전방향 자유이동 전투
    const activeBRS = this._getActiveBRS();
    if (activeBRS) {
      // BossApproach 경유 보스방도 업데이트
      if (activeBRS !== this.bossRoomSystem && activeBRS.enabled) {
        activeBRS.update(dt);
      }
      this._updateWaves(dt);
      this._updatePlayer(dt);
      this._updateSlotHeroes(dt);
      this._updateSpirits(dt);
      this._updatePet(dt);
      this._updateAutoAttack(dt);
      this._updateEnemies(dt);
      this._updateProjectiles(dt);
      this._updateAttackFx(dt);
      this._updateDroppedItems();
      this._updateParticles(dt);
      this._updateRage(dt);
      this._updateCamera();
      this._checkVictory();
      return;
    }

    // 🌫️ 자동 전진 (포자 안개, 종스크롤: 위에서 내려옴)
    const scrollResult = this.autoScroll.update(dt, this.player);
    if (scrollResult.damage > 0) {
      this._damagePlayer(scrollResult.damage);
    }
    if (scrollResult.pushY) {
      this.player.y += scrollResult.pushY;
    }

    // Wave management
    this._updateWaves(dt);
    // 포메이션 큐 잔여분 플러시 (500ms마다)
    if (this._formationQueue && this._formationQueue.length > 0) {
      if (!this._formFlushTimer) this._formFlushTimer = 0;
      this._formFlushTimer += dt;
      if (this._formFlushTimer >= 500) {
        this._formFlushTimer = 0;
        const batch = this._formationQueue.splice(0, this._formationQueue.length);
        if (batch.length > 0) {
          this._spawnFormation(batch[0], batch.length, Math.min(batch.length, 6));
        }
      }
    }
    // Player movement
    this._updatePlayer(dt);
    // Slot heroes follow
    this._updateSlotHeroes(dt);
    // Spirits orbit
    this._updateSpirits(dt);
    // Pet follow + heal
    this._updatePet(dt);
    // Auto-attack
    this._updateAutoAttack(dt);
    // Enemies
    this._updateEnemies(dt);
    // 🏆 황금 미믹
    this._updateMimic(dt);
    // Projectiles
    this._updateProjectiles(dt);
    // Attack effects
    this._updateAttackFx(dt);
    // Dropped items
    this._updateDroppedItems();
    // Particles
    this._updateParticles(dt);
    // Rage
    this._updateRage(dt);
    // Camera
    this._updateCamera();
    // Victory check
    this._checkVictory();
  }

  _updateWaves(dt) {
    // 보스 접근 블로킹 또는 보스전 중에는 새 웨이브 스폰 중단
    if (this.bossApproach.isBlocking() || this.bossApproach.isInBossPhase()) return;

    // ══════════════════════════════════════
    // 🧠 MasterDirector AI 기반 스폰 (기존 SurvivorBalance 직접호출 교체)
    // ══════════════════════════════════════
    if (typeof MasterDirector !== 'undefined' && MasterDirector._enabled) {
      // 몹 스폰 — MasterDirector가 난이도에 맞게 결정
      const mobCommands = MasterDirector.getOutput('mob');
      for (const cmd of mobCommands) {
        // MasterDirector 명령 → SurvivorBalance 호환 mobData 변환
        const timeSec = this._elapsed / 1000;
        const playerDPS = this._calcPlayerDPS();
        const SB = typeof SurvivorBalance !== 'undefined' ? SurvivorBalance : null;
        let mobData;
        if (SB) {
          // SurvivorBalance에서 스탯 계산 후 MasterDirector 배율 적용
          const baseDecision = SB.getSpawnDecision(
            timeSec, this.stageLevel, this.enemies.length,
            playerDPS, this.player.speed
          );
          if (baseDecision.mobs && baseDecision.mobs.length > 0) {
            mobData = { ...baseDecision.mobs[0] };
          } else {
            mobData = { type: cmd.type || 'normal', hp: 50, atk: 5, spd: 1.5, size: 1, xpReward: 10 };
          }
        } else {
          mobData = { type: cmd.type || 'normal', hp: 50, atk: 5, spd: 1.5, size: 1, xpReward: 10 };
        }
        // MasterDirector 배율 적용
        mobData.type = cmd.type || mobData.type;
        mobData.hp = Math.round((mobData.hp || 50) * (cmd.strengthMult || 1.0));
        mobData.atk = Math.round((mobData.atk || 5) * (cmd.strengthMult || 1.0));
        this._spawnSurvivorMob(mobData);
      }

      // 엘리트 스폰
      const eliteCommands = MasterDirector.getOutput('elite');
      for (const cmd of eliteCommands) {
        const timeSec = this._elapsed / 1000;
        const SB = typeof SurvivorBalance !== 'undefined' ? SurvivorBalance : null;
        const baseHP = SB ? SB.getMonsterHP(this._elapsed / 1000, this.stageLevel, 'normal', this._calcPlayerDPS()) : 100;
        this._spawnSurvivorMob({
          type: 'elite',
          hp: Math.round(baseHP * 3 * (cmd.strengthMult || 2)),
          atk: Math.round(this.player.attack * 0.8 * (cmd.strengthMult || 2)),
          spd: 1.2,
          size: 1.5,
          xpReward: 30,
        });
      }

      // 보스 스폰 (MasterDirector가 타이밍 결정)
      const bossCommands = MasterDirector.getOutput('boss');
      for (const cmd of bossCommands) {
        if (cmd.warning) {
          this._screenShake = { timer: 0, duration: 500, intensity: 8 };
        }
        const stats = cmd.stats || { hp: 500, atk: 20, def: 10 };
        this._handleSurvivorEvent({
          type: 'boss',
          name: '필드 보스',
          hp: stats.hp,
          atk: stats.atk,
          spd: 0.6,
          size: 2.5,
          xpReward: 100,
          warning: false, // 이미 위에서 처리
        });
      }

      // 이벤트 (군집러시 등)
      const eventCommands = MasterDirector.getOutput('event');
      for (const cmd of eventCommands) {
        if (cmd.event) this._handleSurvivorEvent(cmd.event);
      }

      return; // MasterDirector가 활성 → 기존 로직 스킵
    }

    // ── 폴백: MasterDirector 없으면 기존 SurvivorBalance 직접 호출 ──
    const SB = typeof SurvivorBalance !== 'undefined' ? SurvivorBalance : null;
    if (!SB) return;

    const timeSec = this._elapsed / 1000;
    const playerDPS = this._calcPlayerDPS();
    const decision = SB.getSpawnDecision(
      timeSec, this.stageLevel, this.enemies.length,
      playerDPS, this.player.speed
    );

    // 일반 몹 스폰
    if (decision.spawn && decision.mobs.length > 0) {
      for (const mobData of decision.mobs) {
        this._spawnSurvivorMob(mobData);
      }
    }

    // 특수 이벤트 (미니보스/보스/군집러시)
    if (decision.event) {
      this._handleSurvivorEvent(decision.event);
    }
  }

  /** 플레이어 DPS 계산 (SurvivorBalance 킬타임 HP 산정용) */
  _calcPlayerDPS() {
    const p = this.player;
    const atkInterval = (p.atkSpeed || 800) / 1000; // 초 단위
    const shotsPerSec = (p.shotCount || 1) / atkInterval;
    return Math.round(p.attack * shotsPerSec);
  }

  /**
   * 포메이션(대형) 스폰 — 여러 마리를 행렬로 촘촘히 배치
   * @param {object} mobData - 몹 데이터
   * @param {number} count   - 한 대형에 몇 마리 (기본 6~10)
   * @param {number} cols    - 열 수 (기본 5~8)
   */
  _spawnFormation(mobData, count, cols) {
    count = count || (5 + Math.floor(Math.random() * 4)); // 5~8
    cols = cols || Math.min(count, 6);
    const rows = Math.ceil(count / cols);
    const mapW = this.map.mapW;
    const pp = this._perspPreset || this.PERSP_PRESETS.normal;

    // 대형 기준 Y (플레이어 전방, 화면 바깥)
    this._formationRow++;
    const baseY = this.player.y - this.H * (0.8 + this._formationRow * 0.15);

    // 대형 간격 (원근에 따라 조절)
    const rowGap = 28 + (1 - pp.minDepth) * 8;  // 행 간격
    const colGap = 30 + pp.minDepth * 10;         // 열 간격

    // 대형 중앙 X
    const centerX = mapW * 0.5;
    const formationWidth = (cols - 1) * colGap;

    let spawned = 0;
    for (let r = 0; r < rows; r++) {
      const colsInRow = Math.min(cols, count - spawned);
      const rowWidth = (colsInRow - 1) * colGap;
      for (let c = 0; c < colsInRow; c++) {
        const sx = centerX - rowWidth / 2 + c * colGap + (Math.random() - 0.5) * 4;
        const sy = baseY - r * rowGap + (Math.random() - 0.5) * 4;
        const clampedX = Math.max(20, Math.min(mapW - 20, sx));
        const clampedY = Math.max(20, Math.min(this.map.mapH - 20, sy));

        const entity = this._createFormationUnit(mobData, clampedX, clampedY);
        this.enemies.push(entity);
        spawned++;
      }
    }
    // 5대형마다 리셋 (너무 먼 곳에 스폰 방지)
    if (this._formationRow >= 5) this._formationRow = 0;
  }

  /** 포메이션 유닛 개별 생성 */
  _createFormationUnit(mobData, sx, sy) {
    const MOB_VISUAL = {
      normal:   { emoji: '🩷', color: '#FF69B4' },
      fast:     { emoji: '💛', color: '#FFD700' },
      tank:     { emoji: '💙', color: '#4488FF' },
      ranged:   { emoji: '💜', color: '#AA44CC' },
      exploder: { emoji: '🧡', color: '#FF6600' },
      swarm:    { emoji: '💚', color: '#44BB44' },
      healer:   { emoji: '🤍', color: '#EEEEFF' },
      summoner: { emoji: '🖤', color: '#444466' },
      elite:    { emoji: '❤️‍🔥', color: '#FF3333' },
      miniboss: { emoji: '👹', color: '#9D00FF' },
      boss:     { emoji: '👿', color: '#FF0000' },
    };
    const visual = MOB_VISUAL[mobData.type] || MOB_VISUAL.normal;

    const def = {
      id: `sb_${mobData.type}`,
      name: mobData.type,
      hp: mobData.hp,
      atk: Math.round(mobData.atk),
      def: 0,
      spd: Math.round(mobData.spd * 10),
      color: visual.color,
      emoji: visual.emoji,
      isBoss: mobData.type === 'boss' || mobData.type === 'miniboss',
      scale: mobData.size || 1,
      rarity: mobData.type === 'elite' ? 'epic' : (mobData.type === 'boss' ? 'legendary' : 'common'),
    };

    const entity = this._createEnemy(def, sx, sy);
    if (mobData.type === 'elite' || mobData.type === 'miniboss' || mobData.type === 'boss') {
      entity.isElite = true;
      entity.scale = mobData.size || 1.5;
    }
    if (mobData.type === 'exploder') entity._explodeOnDeath = true;
    if (mobData.xpReward) entity.xpReward = mobData.xpReward;
    return entity;
  }

  /** SurvivorBalance 몹 데이터 → 전투 엔티티 스폰 (포메이션 대형) */
  _spawnSurvivorMob(mobData) {
    // ── 포메이션 스폰: 3마리마다 대형으로 묶어 스폰 ──
    if (!this._formationQueue) this._formationQueue = [];
    this._formationQueue.push(mobData);

    // 3~6마리 모이면 대형으로 일괄 스폰
    const formSize = 4 + Math.floor(Math.random() * 3); // 4~6
    if (this._formationQueue.length >= formSize) {
      const batch = this._formationQueue.splice(0, this._formationQueue.length);
      const base = batch[0]; // 첫 번째 몹 데이터 기준
      this._spawnFormation(base, batch.length, Math.min(batch.length, 6));
      return;
    }

    // 큐에 남아있으면 기존 방식으로 개별 스폰 (폴백)
    // → 아래의 기존 로직은 더이상 직접 실행 안 됨 (포메이션 우선)
    return;

    // (기존 개별 스폰 — 참고용으로 보존)
    const margin = 20;
    let sy = this.player.y - this.H * (0.7 + Math.random() * 0.4);
    if (this._nextLane === undefined) this._nextLane = 0;
    const mapW = this.map.mapW;
    const laneX = this._nextLane === 0
      ? mapW * 0.25 + (Math.random() - 0.5) * 80
      : mapW * 0.75 + (Math.random() - 0.5) * 80;
    this._nextLane ^= 1;
    let sx = laneX;
    sx = Math.max(margin, Math.min(mapW - margin, sx));
    sy = Math.max(margin, Math.min(this.map.mapH - margin, sy));

    // SurvivorBalance 몹타입 → 슬라임 이모지/색상 매핑
    const MOB_VISUAL = {
      normal:   { emoji: '🩷', color: '#FF69B4' },
      fast:     { emoji: '💛', color: '#FFD700', },
      tank:     { emoji: '💙', color: '#4488FF' },
      ranged:   { emoji: '💜', color: '#AA44CC' },
      exploder: { emoji: '🧡', color: '#FF6600' },
      swarm:    { emoji: '💚', color: '#44BB44' },
      healer:   { emoji: '🤍', color: '#EEEEFF' },
      summoner: { emoji: '🖤', color: '#444466' },
      elite:    { emoji: '❤️‍🔥', color: '#FF3333' },
      miniboss: { emoji: '👹', color: '#9D00FF' },
      boss:     { emoji: '👿', color: '#FF0000' },
    };
    const visual = MOB_VISUAL[mobData.type] || MOB_VISUAL.normal;

    // 적 정의 객체 생성 (기존 _createEnemy 호환)
    const def = {
      id: `sb_${mobData.type}`,
      name: mobData.type,
      hp: mobData.hp,
      atk: Math.round(mobData.atk),
      def: 0,
      spd: Math.round(mobData.spd * 10),
      color: visual.color,
      emoji: visual.emoji,
      isBoss: mobData.type === 'boss' || mobData.type === 'miniboss',
      scale: mobData.size || 1,
      rarity: mobData.type === 'elite' ? 'epic' : (mobData.type === 'boss' ? 'legendary' : 'common'),
    };

    const entity = this._createEnemy(def, sx, sy);

    // 타입별 특수 속성
    if (mobData.type === 'elite' || mobData.type === 'miniboss' || mobData.type === 'boss') {
      entity.isElite = true;
      entity.scale = mobData.size || 1.5;
    }
    if (mobData.type === 'exploder') {
      entity._explodeOnDeath = true;
    }
    if (mobData.xpReward) {
      entity.xpReward = mobData.xpReward;
    }

    this.enemies.push(entity);
  }

  /** SurvivorBalance 이벤트 처리 (보스/미니보스/군집러시) */
  _handleSurvivorEvent(event) {
    if (event.type === 'swarm_rush') {
      // 군집 러시: 대형으로 촘촘하게 스폰
      const count = event.count || 30;
      const mobData = {
        type: event.mobType || 'swarm',
        hp: event.hp, atk: event.atk, spd: event.spd,
        size: 0.4, xpReward: 3,
      };
      // 여러 대형으로 분할 (6~8마리씩)
      const perFormation = 7;
      for (let i = 0; i < count; i += perFormation) {
        const batchSize = Math.min(perFormation, count - i);
        this._spawnFormation(mobData, batchSize, Math.min(batchSize, 6));
      }
    } else if (event.type === 'boss' || event.type === 'miniboss') {
      // 보스/미니보스: 전방 중앙에서 등장
      const bx = this.player.x + (Math.random() - 0.5) * 100;
      const by = Math.max(50, this.player.y - this.H * 0.5 - 60);
      const def = {
        id: `sb_${event.type}`,
        name: event.name,
        hp: event.hp,
        atk: Math.round(event.atk),
        def: 0,
        spd: Math.round(event.spd * 10),
        color: event.type === 'boss' ? '#FF0000' : '#9D00FF',
        emoji: event.type === 'boss' ? '👿' : '👹',
        isBoss: true,
        scale: event.size || 2.0,
        rarity: 'legendary',
      };
      const entity = this._createEnemy(def, bx, by);
      entity.isElite = true;
      entity.scale = event.size || 2.0;
      entity.xpReward = event.xpReward || 50;
      this.enemies.push(entity);

      // 보스 경고 연출
      if (event.warning) {
        this._screenShake = { timer: 0, duration: 500, intensity: 8 };
      }
    }
  }

  // ══════════════════════════════════════
  //  🏆 황금 미믹 시스템
  // ══════════════════════════════════════

  /** 황금 미믹 스폰 */
  _spawnGoldenMimic() {
    // 기본 몹 HP 기준 × 15 (매우 높은 HP)
    const baseHp = 60 + this.stageLevel * 20;
    const mimicHp = Math.round(baseHp * 15);

    // 좌/우 랜덤 레인에 출현 — 화면 위 먼 곳에서 스폰
    const mapW = this.map.mapW;
    const lane = Math.random() < 0.5 ? 0 : 1;
    const sx = lane === 0
      ? mapW * 0.25 + (Math.random() - 0.5) * 60
      : mapW * 0.75 + (Math.random() - 0.5) * 60;
    const sy = this.player.y - this.H * 1.2; // 화면 위 먼 곳

    const def = {
      id: 'golden_mimic',
      name: '황금 미믹',
      hp: mimicHp,
      atk: 0,
      def: 0,
      spd: 8,
      color: '#FFD700',
      emoji: '🏆',
      isBoss: false,
      scale: 1.8,
      rarity: 'legendary',
    };

    const entity = this._createEnemy(def, Math.max(20, Math.min(mapW - 20, sx)), Math.max(20, sy));
    entity.isMimic = true;
    entity.passive = true;         // 선공 안 함
    entity.fixedSpeedMul = 0;      // 자체 이동 비활성 (페이즈에서 직접 제어)
    entity._mimicNearbyKills = 0;  // 근처 일반몹 처치 카운트
    entity._fleeing = false;
    entity._mimicSpawnTime = Date.now();
    entity.gold = 50;              // 기본 골드 (처치 시 10배 보너스 별도)

    // ── 5단계 페이즈 시스템 ──
    // approach → taunt → retreat → wait → flee
    entity._mimicPhase = 'approach';    // 현재 페이즈
    entity._mimicPhaseTimer = 0;        // 페이즈 내 경과시간
    entity._mimicSpawnY = sy;           // 원래 스폰 위치 (retreat 목표)
    entity._mimicTargetY = this.player.y + 30; // 영웅 앞까지 접근 목표
    entity._mimicJumpVel = 0;           // 점프 속도
    entity._mimicJumpScale = 1;         // 점프 시 스케일 효과

    this.enemies.push(entity);
    this._activeMimic = entity;

    // 출현 연출
    this._screenShake = { timer: 0, duration: 300, intensity: 4 };
  }

  /** 매 프레임 미믹 업데이트 — 5단계 페이즈 */
  _updateMimic(dt) {
    // 스폰 주기 체크 (30초마다 15% 확률, 동시 1마리만)
    if (!this._mimicSpawnTimer) this._mimicSpawnTimer = 0;
    this._mimicSpawnTimer += dt;

    if (!this._activeMimic && this._mimicSpawnTimer >= 30000) {
      this._mimicSpawnTimer = 0;
      if (Math.random() < 0.15) {
        this._spawnGoldenMimic();
      }
    }

    const m = this._activeMimic;
    if (!m) return;

    // 미믹이 이미 enemies에서 제거되었으면 참조 해제
    if (!this.enemies.includes(m)) {
      this._activeMimic = null;
      return;
    }

    m._mimicPhaseTimer += dt;
    const spd = dt / 16; // 프레임 보정

    switch (m._mimicPhase) {
      // ── 1) APPROACH: 영웅 앞까지 내려옴 ──
      case 'approach': {
        const approachSpd = this.player.speed * 1.8 * spd;
        m.y += approachSpd; // 아래로 이동
        // 영웅 Y 근처 도달 시 → taunt
        if (m.y >= this.player.y - 60) {
          m.y = this.player.y - 60;
          m._mimicPhase = 'taunt';
          m._mimicPhaseTimer = 0;
          m._mimicJumpVel = -12; // 점프 초기 속도 (위로)
          m._mimicJumpScale = 1;
        }
        break;
      }

      // ── 2) TAUNT: 돌아서서 점프 연출 (도발) ──
      case 'taunt': {
        // 점프 물리
        m._mimicJumpVel += 0.6 * spd; // 중력
        m.y += m._mimicJumpVel * spd;

        // 스케일 연출: 점프 중 커졌다 작아졌다
        const jumpProgress = m._mimicPhaseTimer / 1200;
        m._mimicJumpScale = 1 + Math.sin(jumpProgress * Math.PI) * 0.4;

        // 1.2초 후 → retreat
        if (m._mimicPhaseTimer >= 1200) {
          m._mimicPhase = 'retreat';
          m._mimicPhaseTimer = 0;
          m._mimicJumpScale = 1;
          // retreat 목표: 현재 카메라 기준 화면 위쪽
          m._mimicSpawnY = this.camera.y + this.H * 0.1;
        }
        break;
      }

      // ── 3) RETREAT: 스폰 지역으로 되돌아감 ──
      case 'retreat': {
        const retreatSpd = this.player.speed * 1.5 * spd;
        m.y -= retreatSpd; // 위로 이동
        // 스폰 위치 도달 시 → wait
        if (m.y <= m._mimicSpawnY) {
          m.y = m._mimicSpawnY;
          m._mimicPhase = 'wait';
          m._mimicPhaseTimer = 0;
        }
        break;
      }

      // ── 4) WAIT: 잠시 대기 (3초) ──
      case 'wait': {
        // 통통 튀는 애니메이션만 (bobPhase가 알아서 처리)
        // 3초 대기 후 → flee
        if (m._mimicPhaseTimer >= 3000) {
          m._mimicPhase = 'flee';
          m._mimicPhaseTimer = 0;
          m._fleeing = true;
        }
        break;
      }

      // ── 5) FLEE: 최종 도주 ──
      case 'flee': {
        const fleeSpd = this.player.speed * 2.5 * spd;
        m.y -= fleeSpd;

        // 화면 밖 제거
        if (m.y < this.camera.y - this.H) {
          const idx = this.enemies.indexOf(m);
          if (idx >= 0) {
            this.heroEngine.removeMob(m);
            this.enemies.splice(idx, 1);
          }
          this._activeMimic = null;
        }
        break;
      }
    }
  }

  _createEnemy(def, x, y) {
    // HeroCore 경유 — 적 생성 + HeroEngine SpeedAI 자동 등록
    return this.hero.createEnemy(def, x, y);
  }

  _updatePlayer(dt) {
    // 자동 전진 제거 — 영웅은 제자리에서 이동
    this.autoWalk.pause();

    let mx = (this._keys['d'] || this._keys['arrowright'] ? 1 : 0) - (this._keys['a'] || this._keys['arrowleft'] ? 1 : 0) + this._touchDir.x;
    if (mx > 1) mx = 1;
    if (mx < -1) mx = -1;

    const spd = this.player.speed * (dt / 16);
    this.player.x += mx * spd;

    const brs = this._getActiveBRS();
    if (brs) {
      // ── 보스방: 전방향 자유이동 (WASD + 방향키 + 터치) ──
      let my = (this._keys['s'] || this._keys['arrowdown'] ? 1 : 0) - (this._keys['w'] || this._keys['arrowup'] ? 1 : 0) + (this._touchDir.y || 0);
      if (my > 1) my = 1;
      if (my < -1) my = -1;
      this.player.y += my * spd;

      // 아레나 경계 클램핑
      const arena = brs.arena;
      const aw = arena ? arena.width : 4000;
      const ah = arena ? arena.height : 2000;
      this.player.x = Math.max(30, Math.min(aw - 30, this.player.x));
      this.player.y = Math.max(30, Math.min(ah - 30, this.player.y));
    } else {
      // ── 일반 필드: 좌우만 이동, 종스크롤 경계 ──
      const minY = this.bossApproach.getPhase() !== 'dormant'
        ? Math.max(16, this.bossApproach.getBoundary() + 20)
        : 16;
      const maxY = Math.min(this.map.mapH - 16, this.autoScroll.getBoundary() - 10);
      this.player.x = Math.max(16, Math.min(Math.min(this.W, this.map.mapW) - 16, this.player.x));
      this.player.y = Math.max(minY, Math.min(maxY, this.player.y));
    }

    // Bob animation
    this.player.bobPhase += dt * 0.004;

    // 보스방 게이트 진입 체크
    if (this.bossRoomSystem.checkGateEntry(this.player.x, this.player.y)) {
      this.bossRoomSystem.enterBossRoom();
    }
  }

  _updateSlotHeroes(dt) {
    // V-Formation: 5영웅 배치 (플레이어 뒤쪽(아래) V자 대형, 아래→위 진행)
    const V_POS = [
      { dx: -15, dy:  12 },  // 0: 좌후
      { dx:  15, dy:  12 },  // 1: 우후
      { dx:  -8, dy:  22 },  // 2: 좌후방
      { dx:   8, dy:  22 },  // 3: 우후방
      { dx:   0, dy:  28 },  // 4: 최후방 중앙
    ];
    this.slotHeroes.forEach((h, i) => {
      const pos = V_POS[i] || V_POS[V_POS.length - 1];
      const targetX = this.player.x + pos.dx;
      const targetY = this.player.y + pos.dy;
      h.x += (targetX - h.x) * 0.08;
      h.y += (targetY - h.y) * 0.08;

      // Auto-attack — 항상 적 방향으로 발사, 유도탄 획득 시 비행 중 추적
      h.atkTimer -= dt;
      if (h.atkTimer <= 0) {
        const hNearest = this.enemies.length > 0 ? this._findNearest(h, this.enemies) : null;
        const hAngle = hNearest ? Math.atan2(hNearest.y - h.y, hNearest.x - h.x) : -Math.PI / 2;
        this.projectiles.push({
          x: h.x, y: h.y,
          vx: Math.cos(hAngle) * 4, vy: Math.sin(hAngle) * 4,
          damage: h.attack, source: 'ally', radius: 4,
          emoji: this._homingUnlocked ? '🟣' : '⚡',
          pierce: 0, homing: !!this._homingUnlocked,
          target: this._homingUnlocked && hNearest ? hNearest : null,
          element: h.attribute || h.element || null,
        });
        h.atkTimer = h.atkSpeed;
      }
    });
  }

  _updateSpirits(dt) {
    // 속성별 미사일 이모지
    const SPIRIT_PROJ_EMOJI = {
      fire:'🔥', water:'💧', lightning:'⚡', dark:'🌑',
      light:'✨', nature:'🌿', ice:'❄️', wind:'💨',
    };
    // 속성 → 원소 매핑 (HeroAI 원소 상성용)
    const ATTR_TO_ELEMENT = {
      fire:'fire', water:'water', lightning:'thunder', dark:'dark',
      light:'light', nature:'grass', ice:'ice', wind:'thunder',
    };

    this.spirits.forEach(s => {
      // Orbit around player
      s.orbitAngle += dt * 0.0015;
      const orbitR = 20 + (this.spirits.length > 6 ? 8 : 0);
      s.x = this.player.x + Math.cos(s.orbitAngle) * orbitR;
      s.y = this.player.y + Math.sin(s.orbitAngle) * orbitR;

      // 정령 미사일 발사 — 항상 적 방향 발사, 유도탄 획득 시 비행 중 추적
      s.atkTimer -= dt;
      if (s.atkTimer <= 0) {
        const baseDmg = 5 + s.rarity * 3 + s.level;
        const dmg = baseDmg * this.rageSystem.getDamageMultiplier();
        const sNearest = this.enemies.length > 0 ? this._findNearest(s, this.enemies) : null;
        const sAngle = sNearest ? Math.atan2(sNearest.y - s.y, sNearest.x - s.x) : -Math.PI / 2;
        const projEmoji = SPIRIT_PROJ_EMOJI[s.attribute] || '✨';
        const projSpeed = 5 + s.rarity * 0.5;

        this.projectiles.push({
          x: s.x, y: s.y,
          vx: Math.cos(sAngle) * projSpeed,
          vy: Math.sin(sAngle) * projSpeed,
          damage: dmg,
          source: 'ally',
          radius: 4 + s.rarity,
          emoji: projEmoji,
          pierce: 0,
          homing: !!this._homingUnlocked,
          target: this._homingUnlocked && sNearest ? sNearest : null,
          spiritName: s.name,
          element: ATTR_TO_ELEMENT[s.attribute] || s.attribute || null,
        });

        // 발사 이펙트
        this.particles.push({
          x: s.x, y: s.y,
          vx: 0, vy: -0.5,
          life: 200, color: '#fbbf24', size: 3, type: 'circle',
        });

        s.atkTimer = s.atkCooldown;
      }
    });
  }

  _updatePet(dt) {
    if (!this.pet) return;
    // Follow behind player
    const tx = this.player.x - 12;
    const ty = this.player.y - 12;
    this.pet.x += (tx - this.pet.x) * 0.06;
    this.pet.y += (ty - this.pet.y) * 0.06;

    // Auto-heal every 5s
    this.pet.healTimer += dt;
    if (this.pet.healTimer >= this.pet.healInterval) {
      this.pet.healTimer = 0;
      if (this.player.hp < this.player.maxHp) {
        const heal = this.pet.healAmount;
        this.healPlayer(heal);
        if (typeof SoundSFX !== 'undefined' && SoundSFX.petHeal) SoundSFX.petHeal();
        // Green sparkles
        for (let i = 0; i < 4; i++) {
          this.particles.push({
            x: this.player.x + (Math.random() - 0.5) * 20,
            y: this.player.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1, vy: -Math.random() * 1.5,
            life: 600, color: '#86efac', size: 3, type: 'circle',
          });
        }
      }
    }
  }

  // ── 현재 활성 보스방 보스 찾기 (엔진 자체 or BossApproach 경유) ──
  _getActiveBossTarget() {
    const brs = this._getActiveBRS();
    if (brs && brs.boss?.alive) return brs.boss;
    return null;
  }

  _updateAutoAttack(dt) {
    // 자동공격 대상: enemies 배열 + 보스방 보스
    const bossTarget = this._getActiveBossTarget();
    const hasTargets = this.enemies.length > 0 || bossTarget;

    // ⚡ HeroEngine 스킬 자동 발동 (행동 연계)
    const pendingSkill = this.heroEngine.getPendingSkill();
    if (pendingSkill && hasTargets) {
      const skillTarget = this.enemies.length > 0
        ? this._findNearest(this.player, this.enemies)
        : bossTarget;
      if (skillTarget && this._dist(this.player, skillTarget) < 500) {
        const result = this.heroEngine.fireSkill(skillTarget);
      }
    }

    this.player.atkTimer -= dt;
    // 적 유무와 관계없이 항상 공격 지속
    if (this.player.atkTimer <= 0) {
      const nearest = bossTarget
        || (this.enemies.length > 0 ? this._findNearest(this.player, this.enemies) : null);
      // 유도탄 획득 시 적 방향 추적, 아니면 직진(위)
      const useHoming = this.player.homing && nearest;
      const baseAngle = useHoming
        ? Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x)
        : -Math.PI / 2;
      // 크리티컬 판정
      const critRate = this.player.critRate || 0;
      const critDmg = this.player.critDamage || 1.5;
      const isCrit = Math.random() < critRate;
      const dmgMult = this.rageSystem.getDamageMultiplier() * (isCrit ? critDmg : 1);

      for (let i = 0; i < this.player.shotCount; i++) {
        const spread = (i - (this.player.shotCount - 1) / 2) * 0.15;
        const angle = baseAngle + spread;
        const hasHomingProj = !!this.player.homingProjectile;
        this.projectiles.push({
          x: this.player.x, y: this.player.y,
          vx: Math.cos(angle) * this.player.projSpeed,
          vy: Math.sin(angle) * this.player.projSpeed,
          damage: this.player.attack * dmgMult,
          source: 'player',
          radius: this.player.projSize,
          emoji: isCrit ? '💥' : this.rageSystem.isActive() ? '💢' : hasHomingProj ? '🟣' : '⚡',
          pierce: this.player.pierce,
          homing: hasHomingProj,
          target: hasHomingProj && nearest ? nearest : null,
          element: this.player.element || 'light',
          _isCrit: isCrit,
        });
      }
      this.player.atkTimer = this.player.atkSpeed;
    }
  }

  _updateEnemies(dt) {
    this.enemies.forEach(e => {
      // Bounce animation
      e.bobPhase += dt * 0.005 * (e.bounceSpeed || 2);
      e.bounceY = Math.abs(Math.sin(e.bobPhase)) * 8 * (e.scale || 1);

      // 미믹은 모든 페이즈에서 일반 추적 스킵 (_updateMimic에서 직접 이동 처리)
      if (e.isMimic) return;

      // ══════════════════════════════════════
      //  🛡️ 고정 수비대 — 스폰 위치에 서서 영웅을 기다림
      //  몹은 이동하지 않고 제자리에서 통통 튀기만 한다.
      // ══════════════════════════════════════
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const contactDist = (e.radius || 14) + this.player.radius;

      // Contact damage — 영웅이 접촉하면 데미지
      if (!e.passive) {
        if (e.contactTimer === undefined) e.contactTimer = 0;
        e.contactTimer -= dt;
        if (dist < contactDist && e.contactTimer <= 0) {
          this._damagePlayer(e.attack || e.atk || 5);
          e.contactTimer = 1000;
        }
      }

      // 보스 원거리 공격 (3초 쿨타임, 사거리 400px 이내) — passive 보스는 공격 안 함
      if (e.isBoss && !e.passive && dist < 400) {
        if (!e._bossAtkTimer) e._bossAtkTimer = 0;
        e._bossAtkTimer -= dt;
        if (e._bossAtkTimer <= 0) {
          e._bossAtkTimer = 2500; // 2.5초 간격
          const angle = Math.atan2(-dy, -dx); // 플레이어 방향
          const projSpd = 4;
          // 보스 투사체 3발 부채꼴
          for (let i = -1; i <= 1; i++) {
            const a = angle + i * 0.25;
            this.projectiles.push({
              x: e.x, y: e.y,
              vx: Math.cos(a) * projSpd,
              vy: Math.sin(a) * projSpd,
              damage: Math.round((e.attack || e.atk || 15) * 0.8),
              source: 'enemy',
              radius: 6,
              emoji: e.isBoss ? '💥' : '🔴',
              pierce: 0, homing: false, target: null,
            });
          }
        }
      }

      // 일반 적도 근거리에서 원거리 공격 (5초 쿨타임, rare 이상) — passive 제외
      if (!e.isBoss && !e.passive && (e.rarity === 'rare' || e.rarity === 'magic' || e.rarity === 'epic' || e.rarity === 'legendary') && dist < 300 && dist > 80) {
        if (!e._rangedAtkTimer) e._rangedAtkTimer = 1000 + Math.random() * 3000;
        e._rangedAtkTimer -= dt;
        if (e._rangedAtkTimer <= 0) {
          e._rangedAtkTimer = 4000 + Math.random() * 2000;
          const angle = Math.atan2(-dy, -dx);
          this.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            damage: Math.round((e.attack || e.atk || 5) * 0.6),
            source: 'enemy',
            radius: 4,
            emoji: '🔴',
            pierce: 0, homing: false, target: null,
          });
        }
      }
    });
  }

  _updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter(p => {
      // Homing — 타겟 사망 시 새 타겟 자동 추적
      if (p.homing && (p.source === 'player' || p.source === 'ally')) {
        // 타겟이 없거나 죽었으면 가장 가까운 적 재탐색
        if (!p.target || p.target.hp <= 0) {
          p.target = this.enemies.length > 0 ? this._findNearest(p, this.enemies) : null;
        }
        if (p.target && p.target.hp > 0) {
          const dx = p.target.x - p.x;
          const dy = p.target.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 1) {
            const homingStr = 0.12; // 유도 강도 강화
            const angle = Math.atan2(dy, dx);
            const curAngle = Math.atan2(p.vy, p.vx);
            // 각도 차이를 -π ~ π 범위로 정규화
            let diff = angle - curAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const newAngle = curAngle + diff * homingStr;
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            p.vx = Math.cos(newAngle) * spd;
            p.vy = Math.sin(newAngle) * spd;
          }
        }
      }

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      // Hit enemies
      if (p.source === 'player' || p.source === 'ally') {
        // 보스방 보스에게 투사체 히트 (_getActiveBRS 통합 사용)
        const activeBRS = this._getActiveBRS();

        if (activeBRS && activeBRS.boss) {
          const boss = activeBRS.boss;
          const bossRadius = (boss.size || 3) * 14;
          const dx = p.x - boss.x;
          const dy = p.y - boss.y;
          const rr = (p.radius || 5) + bossRadius;
          if (dx * dx + dy * dy < rr * rr && boss.alive) {
            const dmg = activeBRS.damageBoss(p.damage);
            this._spawnHitParticles(boss.x, boss.y, '#ff6b6b');
            if (p.pierce > 0) { p.pierce--; } else { return false; }
          }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (!e || !e.alive === false) continue;
          if (this._circleHit(p, e)) {
            // HeroBattleAI 원소 상성 적용
            let elementMult = 1.0;
            if (typeof HeroBattleAI !== 'undefined' && typeof HeroAI !== 'undefined' && p.element) {
              const chart = HeroAI.ELEMENT_CHART[p.element];
              if (chart && e.element) {
                if (chart.strong.includes(e.element)) elementMult = 1.5;
                else if (chart.weak.includes(e.element)) elementMult = 0.7;
              }
            }
            const dmg = Math.max(1, (p.damage - e.defense * 0.3) * elementMult);
            e.hp -= dmg;
            this._spawnHitParticles(e.x, e.y, e.color);
            // 투사체 적중 효과음 (100ms 쓰로틀)
            const now = Date.now();
            if (typeof SoundSFX !== 'undefined' && SoundSFX.projectileHit && (!this._lastHitSfx || now - this._lastHitSfx > 100)) {
              SoundSFX.projectileHit();
              this._lastHitSfx = now;
            }
            if (e.hp <= 0) {
              this._onEnemyDeath(e);
              this.enemies.splice(i, 1);
            }
            if (p.pierce > 0) { p.pierce--; continue; }
            return false;
          }
        }
      }
      // Enemy projectiles → player
      if (p.source === 'enemy') {
        if (this.player && this._circleHit(p, this.player)) {
          this._damagePlayer(p.damage);
          return false;
        }
      }
      // Out of map (범위를 넓혀서 먼 적에게도 미사일이 도달)
      return p.x > this.camera.x - 400 && p.x < this.camera.x + this.W + 400 &&
             p.y > this.camera.y - 400 && p.y < this.camera.y + this.H + 400;
    });
  }

  _updateAttackFx(dt) {
    this.activeAttackFx = this.activeAttackFx.filter(fx => {
      fx.progress += dt / fx.duration;
      // Hit at progress 0.5
      if (!fx.hit && fx.progress >= 0.5 && fx.targetEnemy && fx.targetEnemy.hp > 0) {
        fx.hit = true;
        const dmg = Math.max(1, fx.damage - fx.targetEnemy.defense * 0.3);
        fx.targetEnemy.hp -= dmg;
        this._spawnHitParticles(fx.targetEnemy.x, fx.targetEnemy.y, fx.targetEnemy.color);
        if (fx.targetEnemy.hp <= 0) {
          const idx = this.enemies.indexOf(fx.targetEnemy);
          if (idx !== -1) {
            this._onEnemyDeath(fx.targetEnemy);
            this.enemies.splice(idx, 1);
          }
        }
      }
      return fx.progress < 1;
    });
  }

  _updateDroppedItems() {
    const MAGNET_RADIUS = 400 + (this._magnetBonus || 0);   // 자석 흡인 범위 (px)
    const MAGNET_SPEED = 8.0;    // 자석 흡인 속도 (px/frame)
    const AUTO_COLLECT_DELAY = 2000; // 2초 후 자동 수집 시작

    this.droppedItems = this.droppedItems.filter(item => {
      // 드롭 후 시간 추적
      if (item._age === undefined) item._age = 0;
      item._age += 16;

      // 자석 효과: 범위 안 또는 2초 경과 시 플레이어에게 끌어당김
      const mdx = item.x - this.player.x;
      const mdy = item.y - this.player.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const attracting = mDist < MAGNET_RADIUS || item._age > AUTO_COLLECT_DELAY;
      if (attracting && mDist > 5) {
        const speed = item._age > AUTO_COLLECT_DELAY ? Math.max(MAGNET_SPEED, mDist * 0.15) : MAGNET_SPEED;
        item.x -= (mdx / mDist) * speed;
        item.y -= (mdy / mDist) * speed;
      }

      // Check player pickup (touch distance)
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        // 장비/소비 아이템 수집
        if (item.dropType === 'equipment' && item.dropData) {
          GameState.addItem({ ...item.dropData });
          if (typeof SoundSFX !== 'undefined' && SoundSFX.upgradePickup) SoundSFX.upgradePickup();
          return false;
        }
        if (item.dropType === 'consumable' && item.dropData) {
          // 소비 아이템: 즉시 사용 (회복/버프)
          const eff = item.dropData.effect;
          if (eff && eff.type === 'heal') {
            this.healPlayer(eff.val);
          }
          if (typeof SoundSFX !== 'undefined' && SoundSFX.upgradePickup) SoundSFX.upgradePickup();
          return false;
        }
        // 업그레이드 아이템 수집
        const upg = UPGRADE_ITEMS.find(u => u.id === item.upgradeId);
        if (upg) {
          upg.apply(this.player, this);
          if (typeof SoundSFX !== 'undefined' && SoundSFX.upgradePickup) SoundSFX.upgradePickup();
          for (let i = 0; i < 6; i++) {
            this.particles.push({
              x: item.x, y: item.y,
              vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2,
              life: 400, color: upg.color, size: 3, type: 'circle',
            });
          }
        }
        return false;
      }
      item.life -= 16;
      return item.life > 0;
    });
  }

  _updateParticles(dt) {
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += (p.vx || 0) * (dt / 16);
      p.y += (p.vy || 0) * (dt / 16);
      if (p.type === 'circle') p.vy += 0.03;
      return p.life > 0;
    });
  }

  _updateRage(dt) {
    const ended = this.rageSystem.update(dt);
    if (ended) {
      if (typeof SoundSFX !== 'undefined' && SoundSFX.rageEnd) SoundSFX.rageEnd();
    }
  }

  _updateCamera() {
    const brs = this._getActiveBRS();
    if (brs) {
      // 보스방: 플레이어 중심 자유 스크롤 (4000×2000 아레나)
      const arena = brs.arena;
      const aw = arena ? arena.width : 4000;
      const ah = arena ? arena.height : 2000;
      const targetX = this.player.x - this.W * 0.5;
      const targetY = this.player.y - this.H * 0.5;
      this.camera.x += (targetX - this.camera.x) * 0.08;
      this.camera.y += (targetY - this.camera.y) * 0.08;
      this.camera.x = Math.max(0, Math.min(aw - this.W, this.camera.x));
      this.camera.y = Math.max(0, Math.min(ah - this.H, this.camera.y));
    } else {
      // 일반 필드: 종스크롤 (X 고정)
      this.camera.x = 0;
      const targetY = this.player.y - this.H * 0.9;
      this.camera.y += (targetY - this.camera.y) * 0.08;
      this.camera.y = Math.max(0, Math.min(this.map.mapH - this.H, this.camera.y));
    }
  }

  // ── 활성 보스방 시스템 반환 (엔진 자체 or BossApproach 경유) ──
  _getActiveBRS() {
    if (this.bossRoomSystem.isInBossRoom()) return this.bossRoomSystem;
    if (this.bossApproach.bossRoomSystem?.isInBossRoom()) return this.bossApproach.bossRoomSystem;
    return null;
  }

  /** 타이머 종료 → 보스 접근 급가속 */
  _onTimerEnd() {
    if (!this.running) return;
    // 보스 접근 시스템에 타이머 종료 알림 → 급가속
    this.bossApproach.onTimerEnd();
  }

  _checkVictory() {
    // 유일한 클리어 조건: 보스 처치 (또는 보스방 5분 자동 클리어)
    if (this.bossApproach.getPhase() === 'complete') {
      this.running = false;
      GameState.player.hp = this.player.hp;
      this.onVictory({
        enemiesKilled: this.totalKills,
        goldEarned: this.totalGold,
        hpRemaining: this.player.hp,
        wavesCleared: this.currentWave,
        bossDefeated: true,
      });
    }
  }

  // ══════════════════════════════════════
  //  COMBAT ACTIONS
  // ══════════════════════════════════════

  _damagePlayer(damage) {
    this._hitsTaken++;   // MasterDirector 피격 추적
    this.aiBalance.recordHit();
    this.aiBalance.setRageActive(this.rageSystem?.isActive() || false);
    const aiMult = this.aiBalance.getDamageMult();
    const adjusted = Math.round(damage * aiMult);
    let dmg = Math.max(1, adjusted - this.player.defense * 0.5);
    // 보호막 흡수
    if (this.player._shieldHp > 0) {
      const absorbed = Math.min(dmg, this.player._shieldHp);
      this.player._shieldHp -= absorbed;
      dmg -= absorbed;
      if (dmg <= 0) return; // 전부 흡수됨
    }
    this.player.hp -= dmg;
    if (this.player.hp < 0) this.player.hp = 0;
    GameState.player.hp = this.player.hp;
    this._spawnHitParticles(this.player.x, this.player.y, '#ff6b6b');

    // 피격 효과음
    if (typeof SoundSFX !== 'undefined' && SoundSFX.playerHit) SoundSFX.playerHit();

    // Rage charge on damage — 수비대에게 맞으면 분노 충전
    this._addRage(15);
    // Pet heal gauge charge
    this.petHealGauge = Math.min(100, this.petHealGauge + 10);

    if (this.player.hp <= 0) {
      this.running = false;
      if (typeof SoundSFX !== 'undefined' && SoundSFX.defeat) SoundSFX.defeat();
      this.onDeath();
    }
  }

  healPlayer(amount) {
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
    GameState.player.hp = this.player.hp;
  }

  _onEnemyDeath(enemy) {
    // ⚡ HeroEngine: EXP + SpeedAI 제거
    this.heroEngine.onEnemyKill(enemy);
    this.totalKills++;
    GameState.stats.enemiesDefeated++;
    // 적 처치 효과음 (150ms 쓰로틀)
    const now = Date.now();
    if (typeof SoundSFX !== 'undefined' && SoundSFX.enemyDeath && (!this._lastDeathSfx || now - this._lastDeathSfx > 150)) {
      SoundSFX.enemyDeath();
      this._lastDeathSfx = now;
    }

    // 킬 카운터 (MasterDirector용)
    this._recentKills++;

    // ── 🏆 미믹 처치 / 일반몹 처치 시 미믹 도주 트리거 ──
    if (enemy.isMimic) {
      // 미믹 처치 보상: 골드 ×10 + 장비 드롭 보장 + 트로피 이펙트
      const mimicGold = (enemy.gold || 50) * 10;
      GameState.addGold(mimicGold);
      this.totalGold += mimicGold;
      // 화려한 골드 폭발 파티클
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: enemy.x, y: enemy.y,
          vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4,
          life: 1200, color: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FFA500' : '#FFEC8B',
          size: 3 + Math.random() * 3, type: 'circle',
        });
      }
      // 장비 확정 드롭 (2개)
      for (let i = 0; i < 2; i++) {
        const upg = pickWeightedUpgrade();
        this.droppedItems.push({
          x: enemy.x + (Math.random() - 0.5) * 40,
          y: enemy.y + (Math.random() - 0.5) * 40,
          upgradeId: upg.id, emoji: upg.emoji, color: upg.color,
          life: 15000, bobPhase: Math.random() * Math.PI * 2,
        });
      }
      this._screenShake = { timer: 0, duration: 400, intensity: 6 };
      this._activeMimic = null;
      return; // 미믹은 일반 보상 스킵
    }

    // 일반몹 사망 시 미믹 도주 트리거 (wait 페이즈에서만 즉시 도주)
    if (this._activeMimic && !this._activeMimic._fleeing) {
      this._activeMimic._mimicNearbyKills++;
      if (this._activeMimic._mimicNearbyKills >= 3 && this._activeMimic._mimicPhase === 'wait') {
        this._activeMimic._mimicPhase = 'flee';
        this._activeMimic._fleeing = true;
      }
    }

    // ── 골드 드롭 (MasterDirector 연동) ──
    let gold = enemy.gold || 5;
    if (typeof MasterDirector !== 'undefined' && MasterDirector._enabled) {
      const goldCommands = MasterDirector.getOutput('gold');
      if (goldCommands.length > 0) {
        gold = goldCommands[0].amount || gold;
      }
    }
    // const gold = enemy.gold || 5;  // 기존 고정값
    GameState.addGold(gold);
    this.totalGold += gold;

    // Death particles (purification sparkles)
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 2.5,
        life: 800, color: i % 2 === 0 ? '#86efac' : '#fbbf24', size: 3 + Math.random() * 2,
        type: 'circle',
      });
    }

    // Rage on kill — 수비대 돌파 시 분노 대폭 충전
    this._addRage(20);
    this.petHealGauge = Math.min(100, this.petHealGauge + 4);

    // ── 장비/소비 아이템 드롭 (generateDrop) ──
    try {
      const drops = generateDrop(enemy.baseDef || enemy, enemy.wave || 1);
      for (const drop of drops) {
        if (drop.type === 'gold') continue; // 골드는 위에서 이미 처리
        this.droppedItems.push({
          x: enemy.x + (Math.random() - 0.5) * 20,
          y: enemy.y + (Math.random() - 0.5) * 20,
          dropType: drop.type,  // 'equipment' | 'consumable'
          dropData: drop.item || drop,
          emoji: drop.item?.emoji || '📦',
          color: drop.type === 'equipment' ? '#60a5fa' : '#4ade80',
          life: 15000, bobPhase: Math.random() * Math.PI * 2,
        });
      }
    } catch(e) { /* generateDrop 실패 시 무시 */ }

    // ── 업그레이드 아이템 드롭 (MasterDirector 연동) ──
    if (typeof MasterDirector !== 'undefined' && MasterDirector._enabled) {
      // MasterDirector가 업그레이드 드롭 결정
      const upgradeCommands = MasterDirector.getOutput('upgrade');
      for (const cmd of upgradeCommands) {
        const upg = UPGRADE_ITEMS.find(u => u.id === cmd.upgradeType) ||
                    pickWeightedUpgrade();
        this.droppedItems.push({
          x: enemy.x, y: enemy.y,
          upgradeId: upg.id, emoji: upg.emoji, color: upg.color,
          life: 10000, bobPhase: 0,
        });
      }

      // MasterDirector가 회복 아이템 드롭 결정
      const healCommands = MasterDirector.getOutput('heal');
      for (const cmd of healCommands) {
        const healAmount = Math.round(this.player.maxHp * (cmd.healPercent || 0.15));
        this.healPlayer(healAmount);
      }

      // 보스 처치 시 확정 드롭은 유지
      if (BOSS_DROP_GUARANTEED && enemy.isBoss) {
        const upg = pickWeightedUpgrade();
        this.droppedItems.push({
          x: enemy.x, y: enemy.y,
          upgradeId: upg.id, emoji: upg.emoji, color: upg.color,
          life: 10000, bobPhase: 0,
        });
      }
    } else {
      // 폴백: 기존 고정 확률 드롭
      // Drop upgrade item (몹 한 마리당 고정 확률, 보스 확정)
      if ((BOSS_DROP_GUARANTEED && enemy.isBoss) || Math.random() < DROP_CHANCE_PER_MOB) {
        const upg = pickWeightedUpgrade();
        this.droppedItems.push({
          x: enemy.x, y: enemy.y,
          upgradeId: upg.id, emoji: upg.emoji, color: upg.color,
          life: 10000, bobPhase: 0,
        });
      }
    }
  }

  _addRage(amount) {
    const shouldTrigger = this.rageSystem.add(amount);
    GameState.rageGauge = this.rageSystem.getGauge();

    if (shouldTrigger) {
      this._triggerRage();
    }
  }

  _triggerRage() {
    // 분노 폭발 효과음
    if (typeof SoundSFX !== 'undefined' && SoundSFX.rageActivation) SoundSFX.rageActivation();

    // 공중전 모드에서는 부스터 발동
    if (this.aerialSystem.isActive()) {
      this.rageSystem.trigger(); // 횟수 차감
      GameState.rageGauge = 0;
      this.aerialSystem.triggerBooster();
      return;
    }

    // 분노 발동 (횟수 제한 체크 포함)
    if (!this.rageSystem.trigger()) return;
    GameState.rageGauge = 0;

    const remaining = this.rageSystem.getTriggersRemaining();
    const maxT = this.rageSystem.getMaxTriggers();

    // AoE damage to all nearby enemies
    this.enemies.forEach(e => {
      const dist = this._dist(this.player, e);
      if (dist < 200) {
        const dmg = this.player.attack * 3;
        e.hp -= dmg;
        this._spawnHitParticles(e.x, e.y, '#ff6b6b');
      }
    });
    // Remove dead
    this.enemies = this.enemies.filter(e => {
      if (e.hp <= 0) { this._onEnemyDeath(e); return false; }
      return true;
    });

    // Shockwave effect
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: this.player.x, y: this.player.y,
        vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
        life: 600, color: '#ff6b6b', size: 4, type: 'circle',
      });
    }
  }

  _spawnHitParticles(x, y, color) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 300, color, size: 2 + Math.random() * 2, type: 'circle',
      });
    }
  }

  // ══════════════════════════════════════
  //  DRAW
  // ══════════════════════════════════════
  _draw() {
    const ctx = this.ctx;

    // 화면 흔들림 오프셋 적용
    let shakeX = 0, shakeY = 0;
    if (this._screenShake) {
      const t = this._screenShake.timer / this._screenShake.duration;
      const fade = 1 - t;
      const intensity = this._screenShake.intensity * fade;
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
    }

    const cx = this.camera.x + shakeX;
    const cy = this.camera.y + shakeY;

    // ── 🌲 원근법 숲 배경 (보스방 외 기본 필드) ──
    const drawBRS = this._getActiveBRS();
    if (drawBRS) {
      drawBRS.draw(ctx, this.camera);
      this.aerialSystem.draw(ctx);
    } else if (this._perspEnabled) {
      this._drawPerspForest(ctx);
    } else {
      if (this.map.survivorMode) {
        renderSurvivorMap(ctx, this.map, this.camera);
      } else {
        renderMap(ctx, this.map, this.camera);
      }
    }

    // 보스방 진입 전환 연출
    if (this.bossRoomSystem.phase === BOSS_ROOM_PHASE.ENTERING) {
      this.bossRoomSystem.draw(ctx, this.camera);
    }

    // 🌫️ 자동전진 어둠 벽 (맵 위에 오버레이)
    this.autoScroll.draw(ctx, this.camera, this.W, this.H);

    // 🍄 보스 접근 붉은 안개 (보스방 활성 시 BRS는 이미 위에서 렌더링 → 중복 방지)
    if (!drawBRS) {
      this.bossApproach.draw(ctx, this.camera, this.W, this.H);
    }

    // ⚡ HeroEngine 스킬 이펙트
    this.heroEngine.drawSkillFx(ctx, this.camera);

    // Dropped items (on ground) — 원근 적용
    this.droppedItems.forEach(item => {
      item.bobPhase += 0.05;
      const rawSx = item.x - cx;
      const rawSy = item.y - cy + Math.sin(item.bobPhase) * 3;
      const { px, py, s } = this._persp(rawSx, rawSy);
      ctx.font = `${Math.round(20 * s)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 8 * s;
      ctx.fillText(item.emoji, px, py);
      ctx.shadowBlur = 0;
    });

    // Enemies (draw behind player) — 보스방 활성 시 아레나 슬라임은 _drawArena에서 이미 렌더링됨
    if (!drawBRS) {
      this.enemies.forEach(e => this._drawSlime(ctx, e, cx, cy));
    }

    // Spirit attack effects — 원근 적용
    this.activeAttackFx.forEach(fx => {
      const oRaw = { x: fx.origin.x - cx, y: fx.origin.y - cy };
      const tRaw = { x: fx.target.x - cx, y: fx.target.y - cy };
      const op = this._persp(oRaw.x, oRaw.y);
      const tp = this._persp(tRaw.x, tRaw.y);
      renderAttack(ctx, fx.skill, { x: op.px, y: op.py }, { x: tp.px, y: tp.py }, fx.progress);
    });

    // Projectiles — 원근 적용
    this.projectiles.forEach(p => {
      const rawSx = p.x - cx;
      const rawSy = p.y - cy;
      const { px, py, s } = this._persp(rawSx, rawSy);
      if (p.source === 'ally') {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 6 * s;
      }
      ctx.font = `${Math.round(p.radius * 3 * s)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, px, py);
      ctx.shadowBlur = 0;
    });

    // Spirits — 원근 적용
    this.spirits.forEach(sp => {
      const rawSx = sp.x - cx;
      const rawSy = sp.y - cy;
      const { px, py, s } = this._persp(rawSx, rawSy);
      ctx.font = `${Math.round(10 * s)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = (ATTR_GLOW[sp.attribute] || 'rgba(255,255,255,0.3)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 7 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(sp.emoji, px, py);
    });

    // Slot heroes — 원근 적용
    this.slotHeroes.forEach(h => {
      const rawSx = h.x - cx;
      const rawSy = h.y - cy;
      const { px, py, s } = this._persp(rawSx, rawSy);
      ctx.font = `${Math.round(14 * s)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255,200,100,0.4)';
      ctx.shadowBlur = 6 * s;
      ctx.fillText(h.emoji, px, py);
      ctx.shadowBlur = 0;
    });

    // Pet — 원근 적용
    if (this.pet) {
      const rawSx = this.pet.x - cx;
      const rawSy = this.pet.y - cy;
      const { px, py, s } = this._persp(rawSx, rawSy);
      ctx.font = `${Math.round(16 * s)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(134,239,172,0.5)';
      ctx.shadowBlur = 8 * s;
      ctx.fillText(this.pet.emoji, px, py);
      ctx.shadowBlur = 0;
    }

    // Player — 원근은 _drawPlayer 내부에서 처리
    this._drawPlayer(ctx, cx, cy);

    // Particles — 원근 적용
    this.particles.forEach(p => {
      if (p.type === 'text') return;
      const rawSx = p.x - cx;
      const rawSy = p.y - cy;
      const { px, py, s } = this._persp(rawSx, rawSy);
      const alpha = Math.max(0, p.life / 1200);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, (p.size || 2) * s, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 보스방 게이트
    if (this.bossRoomSystem.phase === BOSS_ROOM_PHASE.GATE_ACTIVE) {
      this.bossRoomSystem.draw(ctx, this.camera);
    }

    // HUD (on top — 원근 미적용)
    this._drawHUD(ctx);

    // 보스 오버레이
    const overlayBRS = this._getActiveBRS();
    if (overlayBRS) {
      overlayBRS.drawOverlays(ctx);
    }
    this.bossApproach.drawOverlays(ctx, this.camera, this.W, this.H);
  }

  // ── 보스방 내 엔티티 렌더링 ──
  _drawBossRoomEntities(ctx, cx, cy) {
    // Projectiles (보스방에서도 정령 미사일 빛남)
    this.projectiles.forEach(p => {
      const sx = p.x - cx;
      const sy = p.y - cy;
      if (p.source === 'ally') { ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6; }
      ctx.font = `${Math.round(p.radius * 3)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, sx, sy);
      ctx.shadowBlur = 0;
    });

    // Spirits
    this.spirits.forEach(s => {
      const sx = s.x - cx;
      const sy = s.y - cy;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = (ATTR_GLOW[s.attribute] || 'rgba(255,255,255,0.3)');
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText(s.emoji, sx, sy);
    });

    // Slot heroes
    this.slotHeroes.forEach(h => {
      const sx = h.x - cx;
      const sy = h.y - cy;
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.emoji, sx, sy);
    });

    // Pet
    if (this.pet) {
      const sx = this.pet.x - cx;
      const sy = this.pet.y - cy;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(134,239,172,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(this.pet.emoji, sx, sy);
      ctx.shadowBlur = 0;
    }

    // Player
    this._drawPlayer(ctx, cx, cy);

    // Particles (텍스트 자막 비활성화 — 보스방 내부)
    this.particles.forEach(p => {
      if (p.type === 'text') return;
      const sx = p.x - cx;
      const sy = p.y - cy;
      const alpha = Math.max(0, p.life / 1200);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size || 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // HUD
    this._drawHUD(ctx);
  }

  _drawSlime(ctx, e, cx, cy) {
    if (!e || e.x == null || e.y == null || !isFinite(e.x) || !isFinite(e.y)) return;
    const rawSx = e.x - cx;
    const rawSy = e.y - cy - (e.bounceY || 0);
    const { px: sx, py: sy, s: sc } = this._persp(rawSx, rawSy);
    const r = (e.radius || 12) * sc;
    if (!isFinite(r) || r <= 0) return;

    // 바운스 스퀴시 변형 (착지 시 넓고 납작하게)
    const bouncePhase = Math.abs(Math.sin(e.bobPhase || 0));
    const squishX = 1 + bouncePhase * 0.12;  // 가로 확장
    const squishY = 1 - bouncePhase * 0.08;  // 세로 압축

    ctx.save();

    // 🏆 미믹: 페이즈별 시각 이펙트
    if (e.isMimic) {
      // taunt 점프 스케일 효과
      if (e._mimicPhase === 'taunt' && e._mimicJumpScale) {
        const js = e._mimicJumpScale;
        ctx.translate(sx, sy);
        ctx.scale(js, js);
        ctx.translate(-sx, -sy);
      }
      // 도주 / 후퇴 중 잔상 이펙트
      if (e._mimicPhase === 'flee' || e._mimicPhase === 'retreat') {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#FFD700';
        const dir = e._mimicPhase === 'flee' ? 1 : -1; // flee: 위로 잔상, retreat: 아래로
        for (let g = 1; g <= 3; g++) {
          ctx.beginPath();
          ctx.ellipse(sx, sy + g * 12 * dir, r * squishX * (1 - g * 0.1), r * squishY * (1 - g * 0.1), 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // approach: 위에서 내려오는 ✨ 반짝이 파티클
      if (e._mimicPhase === 'approach') {
        const t = Date.now() * 0.004;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 5; i++) {
          const sparkX = sx + Math.sin(t + i * 1.3) * r * 1.5;
          const sparkY = sy - r + i * 8;
          ctx.font = `${Math.round(r * 0.25)}px serif`;
          ctx.textAlign = 'center';
          ctx.fillText('✨', sparkX, sparkY);
        }
        ctx.globalAlpha = 1;
      }
    }

    // 🏆 미믹: 금빛 펄스 글로우
    if (e.isMimic) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5; // 0~1 맥동
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12 + pulse * 10;
    }

    // 레어도 글로우 (희귀 이상, 미믹은 위에서 처리)
    if (!e.isMimic) {
      const rarityGlow = {
        'rare': { color: '#3b82f6', blur: 6 },
        'magic': { color: '#a855f7', blur: 8 },
        'epic': { color: '#f59e0b', blur: 12 },
        'legendary': { color: '#ef4444', blur: 16 },
      };
      const glow = rarityGlow[e.rarity];
      if (glow) {
        ctx.shadowColor = glow.color;
        ctx.shadowBlur = glow.blur;
      }
    }

    // 그림자 (스퀴시에 반응)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(sx, e.y - cy + r * 0.35, r * 0.75 * squishX, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 몸체 (방사형 그라디언트 — 젤리 느낌)
    const bodyGrad = ctx.createRadialGradient(
      sx - r * 0.15 * squishX, sy - r * 0.2 * squishY, r * 0.1,
      sx, sy, r * Math.max(squishX, squishY)
    );
    bodyGrad.addColorStop(0, _lightenColor(e.color, 40));
    bodyGrad.addColorStop(0.5, e.color);
    bodyGrad.addColorStop(1, _darkenColor(e.color, 30));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * squishX, r * squishY, 0, 0, Math.PI * 2);
    ctx.fill();

    // 엘리트: 빨간 빛나는 테두리
    if (e.isElite) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * squishX + 2, r * squishY + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 🏆 미믹: 금빛 테두리 + 💰 주변 코인 파티클
    if (e.isMimic) {
      // 금빛 펄스 테두리
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
      ctx.strokeStyle = `rgba(255,215,0,${0.6 + pulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8 + pulse * 8;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * squishX + 3, r * squishY + 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 주변 회전 코인 파티클 (💰)
      const t = Date.now() * 0.003;
      for (let i = 0; i < 4; i++) {
        const angle = t + i * (Math.PI / 2);
        const orbitR = r * 1.6;
        const cx2 = sx + Math.cos(angle) * orbitR;
        const cy2 = sy + Math.sin(angle) * orbitR * 0.6;
        ctx.font = `${Math.round(r * 0.35)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.7 + Math.sin(t + i) * 0.3;
        ctx.fillText('💰', cx2, cy2);
      }
      ctx.globalAlpha = 1;
    }

    // 젤리 투명 오버레이
    const gelGrad = ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * squishX);
    gelGrad.addColorStop(0, 'rgba(255,255,255,0)');
    gelGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = gelGrad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * squishX, r * squishY, 0, 0, Math.PI * 2);
    ctx.fill();

    // 스펙큘러 하이라이트 (큰 빛)
    const hlGrad = ctx.createRadialGradient(
      sx - r * 0.2, sy - r * 0.25 * squishY, 0,
      sx - r * 0.2, sy - r * 0.25 * squishY, r * 0.35
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.ellipse(sx - r * 0.2, sy - r * 0.22 * squishY, r * 0.3, r * 0.2 * squishY, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 작은 스펙큘러 (보조 반짝임)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(sx + r * 0.15, sy - r * 0.35 * squishY, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 눈 (흰자 + 홍채 + 동공 + 반짝임)
    const eyeLx = sx - r * 0.22, eyeRx = sx + r * 0.22;
    const eyeY = sy - r * 0.12 * squishY;
    const eyeR = r * 0.18;

    // 흰자
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(eyeLx, eyeY, eyeR, eyeR * 1.1 * squishY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeRx, eyeY, eyeR, eyeR * 1.1 * squishY, 0, 0, Math.PI * 2);
    ctx.fill();

    // 동공 (플레이어 방향 추적)
    const dx = this.player.x - e.x;
    const dy = this.player.y - e.y;
    const lookDist = Math.min(r * 0.06, Math.sqrt(dx * dx + dy * dy) * 0.01);
    const lookAngle = Math.atan2(dy, dx);
    const pupilOx = Math.cos(lookAngle) * lookDist;
    const pupilOy = Math.sin(lookAngle) * lookDist;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(eyeLx + pupilOx, eyeY + pupilOy, eyeR * 0.55, 0, Math.PI * 2);
    ctx.arc(eyeRx + pupilOx, eyeY + pupilOy, eyeR * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // 눈 반짝임
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(eyeLx - eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.arc(eyeRx - eyeR * 0.2, eyeY - eyeR * 0.25, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 입 (미소)
    ctx.strokeStyle = 'rgba(40,20,20,0.4)';
    ctx.lineWidth = r * 0.06;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(sx, sy + r * 0.15 * squishY, r * 0.14, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // 타입별 특수 이펙트
    if (e.color === '#FF4500' || e.id === 'fire_slime') {
      // 불 슬라임: 작은 불꽃 파티클
      const t = Date.now() * 0.005;
      for (let i = 0; i < 3; i++) {
        const fa = t + i * 2.1;
        const fx = sx + Math.sin(fa) * r * 0.5;
        const fy = sy - r * 0.8 - Math.abs(Math.sin(fa * 0.7)) * r * 0.3;
        ctx.fillStyle = `rgba(255,${100 + Math.sin(fa) * 50},0,${0.3 + Math.sin(fa) * 0.2})`;
        ctx.beginPath();
        ctx.arc(fx, fy, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (e.color === '#00CED1' || e.id === 'ice_slime') {
      // 얼음 슬라임: 서리 결정
      ctx.strokeStyle = 'rgba(200,240,255,0.3)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r * 0.6, sy + Math.sin(a) * r * 0.6 * squishY);
        ctx.lineTo(sx + Math.cos(a) * r * 0.9, sy + Math.sin(a) * r * 0.9 * squishY);
        ctx.stroke();
      }
    }

    // 보스 왕관 (Canvas 그리기)
    if (e.isBoss) {
      const crownY = sy - r * squishY - r * 0.3;
      const crownW = r * 0.6;
      const cg = ctx.createLinearGradient(sx - crownW, crownY, sx + crownW, crownY);
      cg.addColorStop(0, '#DAA520');
      cg.addColorStop(0.5, '#FFD700');
      cg.addColorStop(1, '#DAA520');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(sx - crownW, crownY + r * 0.15);
      ctx.lineTo(sx - crownW * 0.7, crownY - r * 0.1);
      ctx.lineTo(sx - crownW * 0.3, crownY + r * 0.05);
      ctx.lineTo(sx, crownY - r * 0.18);
      ctx.lineTo(sx + crownW * 0.3, crownY + r * 0.05);
      ctx.lineTo(sx + crownW * 0.7, crownY - r * 0.1);
      ctx.lineTo(sx + crownW, crownY + r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 왕관 보석
      ctx.fillStyle = '#FF4444';
      ctx.beginPath();
      ctx.arc(sx, crownY - r * 0.05, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP 바 (그라디언트)
    if (e.hp < e.maxHp) {
      const barW = r * 2.2;
      const barH = 4;
      const barY = sy - r * squishY - (e.isBoss ? r * 0.55 : 10);
      const hpRatio = Math.max(0, e.hp / e.maxHp);
      // 배경
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this._fillRoundRect(ctx, sx - barW / 2, barY, barW, barH, 2);
      // HP 색상
      const hpColor = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
      const hpGrad = ctx.createLinearGradient(sx - barW / 2, barY, sx - barW / 2, barY + barH);
      hpGrad.addColorStop(0, _lightenColor(hpColor, 30));
      hpGrad.addColorStop(1, hpColor);
      ctx.fillStyle = hpGrad;
      this._fillRoundRect(ctx, sx - barW / 2, barY, barW * hpRatio, barH, 2);
    }

    ctx.restore();
  }

  // ══════════════════════════════════════
  //  🌲 원근법 (Perspective) 시스템
  // ══════════════════════════════════════

  /** 화면 좌표 → 원근 변환 (sx, sy는 이미 카메라 보정된 스크린 좌표) */
  _persp(sx, sy) {
    if (!this._perspEnabled) return { px: sx, py: sy, s: 1 };
    const p = this._perspPreset || this.PERSP_PRESETS.normal;
    const t = Math.max(0, Math.min(1, sy / this.H));
    const depth = p.minDepth + (1 - p.minDepth) * t;
    const cx = this.W * 0.5;
    const px = cx + (sx - cx) * depth;
    return { px, py: sy, s: depth };
  }

  /** 시선각 변경 */
  setPerspMode(mode) {
    if (this.PERSP_PRESETS[mode]) {
      this._perspMode = mode;
      this._perspPreset = this.PERSP_PRESETS[mode];
    }
  }

  /**
   * 배경 나무 데이터 사전 생성
   * @param {object} opts - 생성 옵션
   *   seed: 랜덤 시드 (기본 42)
   *   treeCount: 양쪽 나무 수 (기본 50)
   *   decoCount: 길 위 장식 수 (기본 30)
   *   theme: 'forest'|'dark_forest'|'mushroom'|'crystal'|'autumn' (기본 forest)
   */
  _generateForestTrees(opts = {}) {
    const trees = [];
    const seed = opts.seed || (Date.now() % 100000);
    const treeCount = opts.treeCount || 50;
    const decoCount = opts.decoCount || 30;
    const theme = opts.theme || 'forest';

    const rng = (s) => { let v = s; return () => { v = (v * 16807 + 0) % 2147483647; return v / 2147483647; }; };
    const rand = rng(seed);

    // 테마별 색상/타입 가중치
    const THEMES = {
      forest:      { hueBase: 90, hueRange: 40, treeTypes: [0,1,1,2,2,3], decoTypes: [4,4,5,5,6], lightBase: 18 },
      dark_forest: { hueBase: 110, hueRange: 20, treeTypes: [0,0,1,2,3,3], decoTypes: [5,5,6,6,3], lightBase: 10 },
      mushroom:    { hueBase: 300, hueRange: 60, treeTypes: [3,3,3,2,1,0], decoTypes: [4,4,4,5,6], lightBase: 15 },
      crystal:     { hueBase: 200, hueRange: 60, treeTypes: [0,1,2,2,2,2], decoTypes: [6,6,6,5,4], lightBase: 20 },
      autumn:      { hueBase: 30, hueRange: 50, treeTypes: [1,1,1,0,2,3], decoTypes: [4,4,5,6,6], lightBase: 16 },
    };
    const th = THEMES[theme] || THEMES.forest;

    // 양쪽 나무
    for (let i = 0; i < treeCount * 2; i++) {
      const side = i < treeCount ? -1 : 1;
      const yNorm = rand();
      const size = 0.5 + rand() * 0.8;
      const type = th.treeTypes[Math.floor(rand() * th.treeTypes.length)];
      const offsetX = 0.05 + rand() * 0.15;
      const hue = th.hueBase + Math.floor(rand() * th.hueRange - th.hueRange / 2);
      trees.push({ side, yNorm, size, type, offsetX, hue, sway: rand() * Math.PI * 2, lightBase: th.lightBase });
    }
    // 길 위 장식
    for (let i = 0; i < decoCount; i++) {
      const yNorm = rand();
      const xNorm = -0.3 + rand() * 0.6;
      const type = th.decoTypes[Math.floor(rand() * th.decoTypes.length)];
      trees.push({ side: 0, yNorm, size: 0.3 + rand() * 0.4, type, offsetX: xNorm, hue: th.hueBase, sway: rand() * Math.PI * 2, lightBase: th.lightBase });
    }
    return trees;
  }

  /** 🌲 원근법 숲 배경 렌더링 */
  _drawPerspForest(ctx) {
    const W = this.W, H = this.H;
    const cx = W * 0.5;
    const now = Date.now() * 0.001;

    // ── 1. 하늘 + 안개 그라디언트 (스테이지별 테마) ──
    const SKY_THEMES = {
      1: ['#1a2a1a','#1e3a1e','#2d4a2d','#3a5c3a'],   // 숲
      2: ['#1a2a1a','#1e3a1e','#2d4a2d','#3a5c3a'],   // 숲
      3: ['#0f1a0f','#121e12','#1a2a1a','#222e22'],   // 어두운 숲
      4: ['#1a1020','#2a1830','#3a2040','#4a2850'],   // 버섯 숲
      5: ['#0a1a2a','#102030','#183040','#204050'],   // 수정 동굴
    };
    const skyColors = SKY_THEMES[this.stageLevel] || SKY_THEMES[1];
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, skyColors[0]);
    skyGrad.addColorStop(0.3, skyColors[1]);
    skyGrad.addColorStop(0.6, skyColors[2]);
    skyGrad.addColorStop(1, skyColors[3]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. 수렴하는 길 (트라페조이드) — 시선각에 따라 폭 변경 ──
    const pp = this._perspPreset || this.PERSP_PRESETS.normal;
    const topW = W * pp.topW;   // 맨위 길 폭
    const botW = W * pp.botW;   // 맨아래 길 폭

    // 길 바닥 (흙길)
    const pathGrad = ctx.createLinearGradient(0, 0, 0, H);
    pathGrad.addColorStop(0, '#3a3020');
    pathGrad.addColorStop(0.5, '#4a3c28');
    pathGrad.addColorStop(1, '#5a4c32');
    ctx.fillStyle = pathGrad;
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, 0);
    ctx.lineTo(cx + topW / 2, 0);
    ctx.lineTo(cx + botW / 2, H);
    ctx.lineTo(cx - botW / 2, H);
    ctx.closePath();
    ctx.fill();

    // 길 테두리 (풀 경계선)
    ctx.strokeStyle = 'rgba(100, 180, 80, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, 0);
    ctx.lineTo(cx - botW / 2, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + topW / 2, 0);
    ctx.lineTo(cx + botW / 2, H);
    ctx.stroke();

    // ── 3. 레인 구분선 (점선) — 스크롤 애니메이션 ──
    const dashLen = 8, gapLen = 12;
    ctx.setLineDash([dashLen, gapLen]);
    ctx.lineDashOffset = -this._bgScroll * H * 6; // 대시 패턴이 아래로 흐름
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    // 중앙선
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();
    // 좌 레인선
    ctx.beginPath();
    ctx.moveTo(cx - topW * 0.25, 0);
    ctx.lineTo(cx - botW * 0.25, H);
    ctx.stroke();
    // 우 레인선
    ctx.beginPath();
    ctx.moveTo(cx + topW * 0.25, 0);
    ctx.lineTo(cx + botW * 0.25, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // ── 4. 수평 깊이선 (거리감) — 스크롤로 아래로 흐름 ──
    const lineGap = 1 / 13;
    const scrollOff = this._bgScroll % lineGap; // 한 칸 내 스크롤 오프셋
    for (let i = 0; i <= 13; i++) {
      const t = (i * lineGap + scrollOff) % 1;
      if (t < 0.05 || t > 0.98) continue; // 가장자리 클리핑
      const y = t * H;
      const lw = topW / 2 + (botW / 2 - topW / 2) * t;
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + t * 0.02})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - lw, y);
      ctx.lineTo(cx + lw, y);
      ctx.stroke();
    }

    // ── 5. 양쪽 나무 + 장식 렌더링 — 스크롤로 아래로 흐름 ──
    // 스크롤 적용된 yNorm 계산 (0~1 래핑 → 먼 곳에서 가까운 곳으로 이동)
    const bgS = this._bgScroll;
    const sorted = [...this._perspTrees]
      .map(tr => ({ ...tr, _scrollY: (tr.yNorm + bgS) % 1 }))
      .sort((a, b) => a._scrollY - b._scrollY);
    for (const tree of sorted) {
      const t = tree._scrollY;
      const y = t * H;
      const depth = 0.18 + 0.82 * t;
      const halfW = (topW / 2 + (botW / 2 - topW / 2) * t);
      const baseSize = tree.size * depth * 30;

      if (tree.type <= 3) {
        // 나무 (길 바깥)
        const edgeX = tree.side < 0
          ? cx - halfW - tree.offsetX * W * depth
          : cx + halfW + tree.offsetX * W * depth;
        const sway = Math.sin(now * 0.5 + tree.sway) * 2 * depth;

        if (tree.type === 0) {
          // 침엽수 (삼각형)
          const h = baseSize * 2;
          ctx.fillStyle = `hsl(${tree.hue}, 50%, ${(tree.lightBase || 18) + t * 12}%)`;
          ctx.beginPath();
          ctx.moveTo(edgeX + sway, y - h);
          ctx.lineTo(edgeX - baseSize * 0.5, y);
          ctx.lineTo(edgeX + baseSize * 0.5, y);
          ctx.closePath();
          ctx.fill();
          // 줄기
          ctx.fillStyle = '#4a3520';
          ctx.fillRect(edgeX - 2 * depth, y, 4 * depth, baseSize * 0.3);
        } else if (tree.type === 1) {
          // 활엽수 (원형 관)
          ctx.fillStyle = '#3a2818';
          ctx.fillRect(edgeX - 2 * depth, y - baseSize * 0.3, 4 * depth, baseSize * 0.5);
          ctx.fillStyle = `hsl(${tree.hue}, 45%, ${(tree.lightBase || 18) + 4 + t * 10}%)`;
          ctx.beginPath();
          ctx.arc(edgeX + sway, y - baseSize * 0.8, baseSize * 0.7, 0, Math.PI * 2);
          ctx.fill();
        } else if (tree.type === 2) {
          // 관목 (작은 덤불)
          ctx.fillStyle = `hsl(${tree.hue}, 40%, ${(tree.lightBase || 18) + 2 + t * 10}%)`;
          ctx.beginPath();
          ctx.ellipse(edgeX + sway, y - baseSize * 0.2, baseSize * 0.6, baseSize * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 버섯 🍄
          ctx.fillStyle = '#eee';
          ctx.fillRect(edgeX - 1.5 * depth, y - baseSize * 0.2, 3 * depth, baseSize * 0.3);
          ctx.fillStyle = `hsl(${350 + tree.hue * 0.3}, 60%, 45%)`;
          ctx.beginPath();
          ctx.ellipse(edgeX, y - baseSize * 0.35, baseSize * 0.35, baseSize * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          // 점
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(edgeX - baseSize * 0.1, y - baseSize * 0.38, 1.5 * depth, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 길 위 장식
        const laneX = cx + tree.offsetX * halfW * 2;
        if (tree.type === 4) {
          // 꽃
          const colors = ['#ff9ecc', '#ffeb3b', '#bb86fc', '#64ffda'];
          ctx.fillStyle = colors[Math.floor(tree.sway * 2) % 4];
          ctx.globalAlpha = 0.4 + depth * 0.3;
          ctx.beginPath();
          ctx.arc(laneX, y, baseSize * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (tree.type === 5) {
          // 이끼
          ctx.fillStyle = `rgba(80,140,60,${0.15 + depth * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(laneX, y, baseSize * 0.5, baseSize * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 돌
          ctx.fillStyle = `rgba(120,115,110,${0.3 + depth * 0.2})`;
          ctx.beginPath();
          ctx.ellipse(laneX, y, baseSize * 0.25, baseSize * 0.15, 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ── 6. 안개 오버레이 (먼 곳 = 밝은 안개) ──
    const fogGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    fogGrad.addColorStop(0, 'rgba(180,200,180,0.25)');
    fogGrad.addColorStop(1, 'rgba(180,200,180,0)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, W, H * 0.5);

    // ── 7. 빛줄기 (God rays) ──
    ctx.save();
    ctx.globalAlpha = 0.04 + Math.sin(now * 0.3) * 0.02;
    ctx.fillStyle = '#ffffaa';
    for (let i = 0; i < 3; i++) {
      const rx = W * (0.2 + i * 0.3) + Math.sin(now * 0.2 + i) * 20;
      ctx.beginPath();
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx - 30, H);
      ctx.lineTo(rx + 30, H);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // ── 8. 🍄 보스 접근 시 포자 오염 효과 ──
    const bossPhase = this.bossApproach.getPhase();
    if (bossPhase === 'approaching' || bossPhase === 'warning') {
      const bossY = this.bossApproach.boss.y;
      const playerY = this.player.y;
      // 보스가 가까울수록 corruption 강해짐 (0~1)
      const totalDist = Math.max(1, this.map.mapH - 220);
      const traveled = Math.max(0, bossY - 100);
      const corruption = Math.min(1, traveled / totalDist);

      // 상단에서 내려오는 붉은/보라 포자 안개
      const fogDepth = H * (0.1 + corruption * 0.5); // 10%~60% 화면 덮음
      const corruptGrad = ctx.createLinearGradient(0, 0, 0, fogDepth);
      corruptGrad.addColorStop(0, `rgba(120,20,40,${0.15 + corruption * 0.25})`);
      corruptGrad.addColorStop(0.5, `rgba(80,10,60,${0.08 + corruption * 0.15})`);
      corruptGrad.addColorStop(1, 'rgba(80,10,60,0)');
      ctx.fillStyle = corruptGrad;
      ctx.fillRect(0, 0, W, fogDepth);

      // 포자 파티클 (상단에서 떨어짐)
      ctx.fillStyle = 'rgba(200,80,120,0.4)';
      const sporeCount = Math.floor(3 + corruption * 12);
      for (let i = 0; i < sporeCount; i++) {
        const seed = i * 137.5 + now * 40;
        const sx = (Math.sin(seed) * 0.5 + 0.5) * W;
        const syOff = ((seed * 0.01 + now * 0.3) % 1) * fogDepth;
        const sz = 1 + Math.sin(seed * 0.7) * 1.5;
        ctx.globalAlpha = 0.2 + Math.sin(seed) * 0.15;
        ctx.beginPath();
        ctx.arc(sx, syOff, Math.max(0.5, sz), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // WARNING 단계: 화면 가장자리 붉은 맥동
      if (bossPhase === 'warning') {
        const pulse = 0.15 + Math.sin(now * 4) * 0.1;
        ctx.fillStyle = `rgba(200,30,30,${pulse})`;
        ctx.fillRect(0, 0, 8, H);
        ctx.fillRect(W - 8, 0, 8, H);
        ctx.fillRect(0, 0, W, 4);
      }
    }
  }

  _drawPlayer(ctx, cx, cy) {
    const p = this.player;
    const rawSx = p.x - cx;
    const rawSy = p.y - cy + Math.sin(p.bobPhase) * 3;
    const { px: sx, py: sy, s: sc } = this._persp(rawSx, rawSy);

    // Rage glow
    if (this.rageSystem.isActive()) {
      ctx.shadowColor = 'rgba(255,50,50,0.6)';
      ctx.shadowBlur = 20 * sc;
    }
    // 유도탄 활성 시 보라 글로우
    else if (this._homingUnlocked) {
      ctx.shadowColor = 'rgba(170,68,204,0.5)';
      ctx.shadowBlur = 14 * sc;
    }
    // 보호막 활성 시 파란 글로우
    if (p._shieldHp > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, 22 * sc, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(102,204,255,${0.3 + Math.sin(Date.now() * 0.005) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.font = `${Math.round(28 * sc)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, sx, sy);
    ctx.shadowBlur = 0;
  }

  _drawHUD(ctx) {
    const pad = 10;
    const barW = 140;
    const barH = 12;

    // Background panel
    const panelH = this.player._shieldHp > 0 ? 80 : 70;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this._fillRoundRect(ctx, pad - 4, pad - 4, barW + 8, panelH, 8);

    // Wave text
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`웨이브 ${this.currentWave}/${this.maxWaves}`, pad, pad + 10);

    // HP bar
    const hpY = pad + 20;
    const hpRatio = this.player.hp / this.player.maxHp;
    ctx.fillStyle = 'rgba(30,30,50,0.8)';
    ctx.fillRect(pad, hpY, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#86efac' : hpRatio > 0.25 ? '#fbbf24' : '#ff6b6b';
    ctx.fillRect(pad, hpY, barW * hpRatio, barH);
    ctx.strokeStyle = 'rgba(80,80,120,0.5)';
    ctx.strokeRect(pad, hpY, barW, barH);
    // HP text
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(this.player.hp)}/${this.player.maxHp}`, pad + barW / 2, hpY + 9);

    // Shield bar (보호막 — HP 바 아래)
    if (this.player._shieldHp > 0) {
      const shY = hpY + barH + 2;
      ctx.fillStyle = 'rgba(30,30,50,0.8)';
      ctx.fillRect(pad, shY, barW, 5);
      ctx.fillStyle = '#66CCFF';
      const shMax = this.player.maxHp * 0.5;
      ctx.fillRect(pad, shY, barW * Math.min(this.player._shieldHp / shMax, 1), 5);
      ctx.fillStyle = '#66CCFF';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🛡️${Math.round(this.player._shieldHp)}`, pad + barW + 4, shY + 5);
    }

    // Rage bar (red under HP)
    const rageY = hpY + barH + (this.player._shieldHp > 0 ? 11 : 4);
    ctx.fillStyle = 'rgba(30,30,50,0.8)';
    ctx.fillRect(pad, rageY, barW, 6);
    const rageIsActive = this.rageSystem.isActive();
    const rageExhausted = this.rageSystem.isExhausted();
    const rageColor = rageExhausted ? '#555' : rageIsActive ? '#ff3333' : '#ff6b6b';
    ctx.fillStyle = rageColor;
    ctx.fillRect(pad, rageY, barW * (this.rageSystem.getGauge() / 100), 6);
    // 상태 표시: RAGE! / 소진 / 남은 횟수
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    if (rageIsActive) {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('\uD83D\uDCA2 RAGE!', pad + barW + 4, rageY + 5);
    } else if (rageExhausted) {
      ctx.fillStyle = '#666';
      ctx.fillText('\uD83D\uDCA2 \uC18C\uC9C4', pad + barW + 4, rageY + 5);
    } else {
      ctx.fillStyle = '#ff6b6b';
      const rem = this.rageSystem.getTriggersRemaining();
      const max = this.rageSystem.getMaxTriggers();
      ctx.fillText(`\u26A1\u00D7${rem}/${max}`, pad + barW + 4, rageY + 5);
    }

    // Pet heal indicator
    if (this.pet) {
      const petY = rageY + 10;
      ctx.fillStyle = 'rgba(30,30,50,0.8)';
      ctx.fillRect(pad, petY, barW, 6);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(pad, petY, barW * (this.petHealGauge / 100), 6);
      ctx.fillStyle = '#86efac';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('💚', pad - 1, petY + 6);
    }

    // ⏰ 타이머 (상단 중앙)
    this.stageTimer.drawHUD(ctx, this.W / 2 - 22, pad + 10);

    // Kill count (top right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`💀 ${this.totalKills}  💰 ${this.totalGold}G`, this.W - pad, pad + 12);

    // Spirit count (정령 미사일 표시)
    if (this.spirits.length > 0) {
      ctx.fillStyle = '#c084fc';
      ctx.font = '10px sans-serif';
      ctx.fillText(`✨ 정령 ${this.spirits.length}체 전투 중`, this.W - pad, pad + 26);
    }

    // Upgrade item count
    if (this.droppedItems.length > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px sans-serif';
      ctx.fillText(`🎁 ${this.droppedItems.length}개 아이템!`, this.W - pad, pad + 40);
    }

    // 🏆 미믹 HUD (화면 상단 중앙)
    const mimic = this._activeMimic;
    if (mimic && this.enemies.includes(mimic)) {
      const mimicBarW = 160;
      const mimicBarH = 10;
      const mimicX = (this.W - mimicBarW) / 2;
      const mimicY = pad + 28;

      // 배경 패널
      ctx.fillStyle = 'rgba(40,30,0,0.75)';
      this._fillRoundRect(ctx, mimicX - 8, mimicY - 14, mimicBarW + 16, 32, 6);

      // 제목
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      const phaseLabels = {
        approach: '🔽 접근중!', taunt: '🤸 점프!',
        retreat: '🔼 후퇴중!', wait: '⏳ 대기중...',
        flee: '💨 도주중!',
      };
      const phaseText = phaseLabels[mimic._mimicPhase] || '';
      ctx.fillText(`🏆 황금 미믹!  ${phaseText}`, this.W / 2, mimicY - 3);

      // HP 바
      const hpRatio = Math.max(0, mimic.hp / mimic.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      this._fillRoundRect(ctx, mimicX, mimicY + 2, mimicBarW, mimicBarH, 3);
      const mimicHpGrad = ctx.createLinearGradient(mimicX, mimicY + 2, mimicX + mimicBarW * hpRatio, mimicY + 2);
      mimicHpGrad.addColorStop(0, '#FFD700');
      mimicHpGrad.addColorStop(1, '#FFA500');
      ctx.fillStyle = mimicHpGrad;
      this._fillRoundRect(ctx, mimicX, mimicY + 2, mimicBarW * hpRatio, mimicBarH, 3);

      // HP 텍스트
      ctx.fillStyle = '#fff';
      ctx.font = '8px sans-serif';
      ctx.fillText(`${Math.round(mimic.hp)}/${mimic.maxHp}`, this.W / 2, mimicY + 9);
    }
  }

  // ══════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════
  _fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
  }

  _findNearest(from, list) {
    let nearest = null, minDist = Infinity;
    for (const e of list) {
      const d = this._dist(from, e);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    return nearest;
  }

  _dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  _circleHit(a, b) {
    if (!a || !b || a.x == null || b.x == null) return false;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const rr = (a.radius || 5) + (b.radius || 5);
    return dx * dx + dy * dy < rr * rr;
  }

  // ══════════════════════════════════════
  //  INPUT
  // ══════════════════════════════════════
  _bindInput() {
    this._onKeyDown = e => { this._keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = e => { this._keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Touch
    this._onTouchStart = e => {
      const t = e.touches[0];
      this._touchStart = { x: t.clientX, y: t.clientY };
    };
    this._onTouchMove = e => {
      if (!this._touchStart) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 10) {
        this._touchDir = { x: dx / mag, y: dy / mag };
      }
    };
    this._onTouchEnd = () => {
      this._touchStart = null;
      this._touchDir = { x: 0, y: 0 };
    };
    // Mouse drag
    this._mouseDown = false;
    this._onMouseDown = e => {
      this._mouseDown = true;
      this._touchStart = { x: e.clientX, y: e.clientY };
    };
    this._onMouseMove = e => {
      if (!this._mouseDown || !this._touchStart) return;
      const dx = e.clientX - this._touchStart.x;
      const dy = e.clientY - this._touchStart.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      if (mag > 10) {
        this._touchDir = { x: dx / mag, y: dy / mag };
      }
    };
    this._onMouseUp = () => {
      this._mouseDown = false;
      this._touchStart = null;
      this._touchDir = { x: 0, y: 0 };
    };

    this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _unbindInput() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }
}

// ── 색상 유틸리티 ──
function _lightenColor(hex, amount) {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(c.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(c.substring(4, 6), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function _darkenColor(hex, amount) {
  const c = hex.replace('#', '');
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

// Attr glow colors for spirit ring
const ATTR_GLOW = {
  fire: 'rgba(255,69,0,0.5)', water: 'rgba(30,144,255,0.5)',
  earth: 'rgba(139,69,19,0.5)', wind: 'rgba(152,251,152,0.5)',
  light: 'rgba(255,215,0,0.5)', dark: 'rgba(106,13,173,0.5)',
  nature: 'rgba(34,139,34,0.5)', ice: 'rgba(0,206,209,0.5)',
};
