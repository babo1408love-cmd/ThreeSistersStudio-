/**
 * HeroEngine — 모든 생성기 통합 영웅 시스템
 *
 * 탑재된 시스템:
 *   ① SpeedAI       — 100유닛 추격/차단/포위 AI + 영웅 이동 모드
 *   ② HeroAI        — 파티 시너지, 원소 상성 계산
 *   ③ HeroBattleAI  — 전술 행동 결정 (공격/스킬/회복/방어)
 *   ④ HeroVisualAI  — 스킬 시각 이펙트
 *   ⑤ HeroManager   — 레벨업, 클래스, 업그레이드 경로
 *   ⑥ SpiritAttack  — 8속성×5티어 = 40 스킬 + Canvas 이펙트
 *   ⑦ BalanceAI     — 자동 밸런스
 *   ⑧ ArtEngine     — 고급 셰이더/재질 (연결 시)
 *
 * 행동 연계 (Behavior Chain):
 *   위험도 판단 → 이동 모드 전환 → 전술 결정 → 스킬 발동 → 이펙트 → EXP
 */
import GameState from '../core/game-state.js';
import { getAvailableSkills, renderAttack } from '../generators/spirit-attack-generator.js';
import { HeroManager, HERO_CLASSES } from '../generators/hero-upgrade.js';

// SpeedAI ↔ 게임 좌표 변환 (1 AI unit = 40px)
const SAI_SCALE = 40;

// ── 위험도 레벨 ──
const DANGER = { SAFE: 0, ALERT: 1, CRITICAL: 2 };

// ── 행동 타입 ──
const ACTION = { ATTACK: 'attack', SKILL: 'skill', HEAL: 'heal', DEFEND: 'defend' };

// ── 게임 적 → SpeedAI 몹타입 매핑 ──
function _mobType(e) {
  if (e.isBoss) return 'boss_demon';
  if (e.isElite) return 'mob_orc';
  if (e.fixedSpeedMul && e.fixedSpeedMul > 1.3) return 'mob_wolf';
  return 'mob_goblin';
}

export default class HeroEngine {
  /**
   * @param {object} player  — UnitFactory.createPlayerEntity() 결과
   * @param {object} opts
   *   mapWidth, mapHeight, stageLevel
   */
  constructor(player, opts = {}) {
    this.player = player;
    this.mapW   = opts.mapWidth  || 10000;
    this.mapH   = opts.mapHeight || 1000;
    this.stage  = opts.stageLevel || 1;

    // ── SpeedAI ──
    this._saiReady = false;
    this._saiIdCnt = 0;

    // ── HeroManager (레벨/업그레이드) ──
    this.heroMgr = new HeroManager();
    if (GameState.heroUpgrade) {
      try { this.heroMgr.fromJSON(GameState.heroUpgrade); } catch(e) {}
    }
    this.heroClass = this.heroMgr.heroClass || 'warrior';

    // ── 원소 / 스킬 ──
    this.element = player.element || 'light';
    this.skills = [];
    this._skillCD = {};      // { skillId: remaining_ms }

    // ── 행동 연계 (Behavior Chain) ──
    this._actionTimer    = 0;
    this._actionInterval = 800;  // 0.8초마다 전술 판단
    this._action = null;         // 현재 결정된 행동
    this._pendingSkill = null;   // 발동 대기 스킬

    // ── 위험도 ──
    this._danger     = DANGER.SAFE;
    this._dangerTimer = 0;
    this._moveMode   = 'run';

    // ── 스킬 이펙트 큐 ──
    this.skillFx = [];

    // ── 전투 통계 ──
    this.stats = { dmgDealt: 0, skillsUsed: 0, kills: 0, exp: 0 };

    // ── 레벨업 이벤트 콜백 ──
    this.onLevelUp = null;  // (levelUpResult) => void

    // 초기화
    this._boot();
  }

  // ══════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════
  _boot() {
    this._initSpeedAI();
    this._initHeroAI();
    this._loadSkills();
  }

  _initSpeedAI() {
    if (!window.SpeedAI) return;
    const S = SAI_SCALE;
    SpeedAI.init(Math.ceil(this.mapW / S), Math.ceil(this.mapH / S));
    SpeedAI.registerHero({
      id: 'hero',
      class: this.heroClass,
      x: this.player.x / S,
      y: this.player.y / S,
      spdStat: Math.round(this.player.speed * 3),
    });
    this._saiReady = true;
  }

  _initHeroAI() {
    if (typeof HeroAI === 'undefined') return;
    if (!HeroAI.party._calculated) {
      try { HeroAI.calculateAll(); } catch(e) {}
    }
    const pd = window._heroAIPartyData;
    if (pd?.heroes?.[0]?.element) {
      this.player.element = pd.heroes[0].element;
      this.element = pd.heroes[0].element;
    }
  }

  _loadSkills() {
    try {
      this.skills = getAvailableSkills(this.element, this.heroMgr.level || 1) || [];
    } catch(e) { this.skills = []; }
    this._skillCD = {};
    for (const sk of this.skills) this._skillCD[sk.id] = 0;
  }

  // ══════════════════════════════════════
  //  UPDATE — 매 프레임 호출
  // ══════════════════════════════════════
  /**
   * @param {number} dt - ms
   * @param {object[]} enemies - 현재 필드의 적 배열
   * @param {boolean} [skipAI=false] - 보스전 등 AI 일시정지
   */
  update(dt, enemies = [], skipAI = false) {
    // ① SpeedAI 동기화 (몹 위치 계산)
    this._tickSpeedAI(dt, enemies);
    // ② 위험도 판단 → 이동 모드 전환
    if (!skipAI) this._tickDanger(dt, enemies);
    // ③ 스킬 쿨다운 감소
    this._tickCooldowns(dt);
    // ④ 행동 결정 (전술 AI)
    if (!skipAI) this._tickAction(dt, enemies);
    // ⑤ 스킬 이펙트
    this._tickFx(dt);
  }

  _tickSpeedAI(dt, enemies) {
    if (!this._saiReady) return;
    const S = SAI_SCALE;
    // 영웅 위치 → SpeedAI
    SpeedAI._hero.x = this.player.x / S;
    SpeedAI._hero.y = this.player.y / S;
    SpeedAI.setHeroTarget(this.player.x / S, this.player.y / S);
    SpeedAI.update(dt / 1000);
    // SpeedAI 몹 위치 → 게임 엔티티
    for (const e of enemies) {
      if (!e._speedAIMob || !e._speedAIMob.isAlive) continue;
      // 정화 상태(survival)는 건너뜀
      if (e.purifyState !== undefined && e.purifyState !== 0) continue;
      e.x = e._speedAIMob.x * S;
      e.y = e._speedAIMob.y * S;
    }
  }

  _tickDanger(dt, enemies) {
    this._dangerTimer += dt;
    if (this._dangerTimer < 500) return;
    this._dangerTimer = 0;

    const hpRatio = this.player.hp / this.player.maxHp;
    let nearCnt = 0;
    for (const e of enemies) {
      const dx = e.x - this.player.x, dy = e.y - this.player.y;
      if (dx * dx + dy * dy < 150 * 150) nearCnt++;
    }

    if (hpRatio < 0.3 || nearCnt >= 8) {
      this._danger = DANGER.CRITICAL;
    } else if (hpRatio < 0.6 || nearCnt >= 4) {
      this._danger = DANGER.ALERT;
    } else {
      this._danger = DANGER.SAFE;
    }

    // SpeedAI 이동 모드 연동
    if (this._saiReady) {
      const mode = this._danger === DANGER.CRITICAL ? 'sprint' : 'run';
      SpeedAI.setHeroMoveMode(mode);
      this._moveMode = mode;
    }
  }

  _tickCooldowns(dt) {
    for (const id in this._skillCD) {
      if (this._skillCD[id] > 0) this._skillCD[id] -= dt;
    }
  }

  _tickAction(dt, enemies) {
    this._actionTimer += dt;
    if (this._actionTimer < this._actionInterval || enemies.length === 0) return;
    this._actionTimer = 0;

    // ── HeroBattleAI 기반 전술 결정 ──
    if (typeof HeroBattleAI !== 'undefined') {
      const hero = this._heroFormat();
      const foes = enemies.slice(0, 5).map(e => ({
        id: e._speedAIId || 'e',
        element: e.element || 'dark',
        stats: { hp: e.maxHp || 50, atk: e.attack || e.atk || 10, def: e.defense || 0, spd: 10 },
        currentHp: e.hp, isAlive: e.hp > 0,
      }));
      try {
        this._action = HeroBattleAI.decideTurn(hero, foes, [], { turn: 1 });
      } catch(e) {
        this._action = { type: ACTION.ATTACK };
      }
    } else {
      this._action = { type: ACTION.ATTACK };
    }

    // 스킬 발동 결정
    if (this._action.type === ACTION.SKILL && this._action.skillId) {
      const sk = this.skills.find(s => s.id === this._action.skillId);
      if (sk && this._skillCD[sk.id] <= 0) {
        this._pendingSkill = sk;
        return;
      }
    }
    // 기본: 가장 강한 쿨다운 완료 스킬 자동 발동
    this._pendingSkill = this._bestSkill();
  }

  _heroFormat() {
    return {
      id: 'player', name: '주인공', class: this.heroClass,
      element: this.element, level: this.heroMgr?.level || 1,
      stats: {
        hp: this.player.maxHp, mp: 100,
        atk: this.player.attack, def: this.player.defense,
        spd: this.player.speed * 10, luk: 10,
      },
      currentHp: this.player.hp, currentMp: 100,
      skills: this.skills.map(s => s.id),
      equipment: GameState.equipped || {},
      aiPersonality: 'balanced',
    };
  }

  _bestSkill() {
    let best = null;
    for (const sk of this.skills) {
      if (this._skillCD[sk.id] <= 0 && (!best || sk.dmg > best.dmg)) best = sk;
    }
    return best;
  }

  _tickFx(dt) {
    this.skillFx = this.skillFx.filter(fx => {
      fx.progress += dt / fx.duration;
      // 50% 지점에서 데미지 적용
      if (!fx.hit && fx.progress >= 0.5 && fx.enemy && fx.enemy.hp > 0) {
        fx.hit = true;
        fx.enemy.hp -= fx.damage;
      }
      return fx.progress < 1;
    });
  }

  // ══════════════════════════════════════
  //  PUBLIC API — 행동 연계
  // ══════════════════════════════════════

  /**
   * 대기 중인 스킬 발동 → 이펙트 + 데미지 반환
   * combat-engine의 _updateAutoAttack에서 호출
   */
  fireSkill(target) {
    if (!this._pendingSkill || !target) return null;
    const skill = this._pendingSkill;
    this._pendingSkill = null;
    this._skillCD[skill.id] = skill.cd;

    // 데미지 계산 (스킬 기본 + 공격력 보너스 + 원소 상성)
    let dmg = skill.dmg + this.player.attack * 0.5;
    if (typeof HeroAI !== 'undefined' && HeroAI.ELEMENT_CHART) {
      const chart = HeroAI.ELEMENT_CHART[this.element];
      if (chart && target.element) {
        if (chart.strong?.includes(target.element)) dmg *= 1.5;
        else if (chart.weak?.includes(target.element)) dmg *= 0.7;
      }
    }
    dmg = Math.round(dmg);

    // 이펙트 큐
    this.skillFx.push({
      skill,
      origin: { x: this.player.x, y: this.player.y },
      target: { x: target.x, y: target.y },
      progress: 0, duration: 600,
      enemy: target, damage: dmg, hit: false,
    });

    this.stats.skillsUsed++;
    this.stats.dmgDealt += dmg;

    // HeroVisualAI 시각 이펙트
    if (typeof HeroAIVisual !== 'undefined') {
      try {
        HeroAIVisual.playSkillEffect(
          { animation: { type: skill.fx || 'projectile' }, ...skill },
          this.player, target, null
        );
      } catch(e) {}
    }

    return { skill, damage: dmg };
  }

  /** 스킬 이펙트 Canvas 렌더링 */
  drawSkillFx(ctx, camera) {
    for (const fx of this.skillFx) {
      const o = { x: fx.origin.x - camera.x, y: fx.origin.y - camera.y };
      const t = { x: fx.target.x - camera.x, y: fx.target.y - camera.y };
      try { renderAttack(ctx, fx.skill, o, t, fx.progress); } catch(e) {}
    }
  }

  // ── 몹 관리 ──

  /** 적 등록 (SpeedAI) */
  registerMob(enemy, x, y) {
    if (!this._saiReady) return;
    const S = SAI_SCALE;
    enemy._speedAIId = `mob_${++this._saiIdCnt}`;
    enemy._speedAIMob = SpeedAI.registerMob({
      id: enemy._speedAIId,
      mobType: _mobType(enemy),
      x: (x ?? enemy.x) / S,
      y: (y ?? enemy.y) / S,
      level: this.stage,
      aggroRange: 200,
      attackRange: 1,
      patrolRadius: 5,
    });
    if (enemy._speedAIMob) SpeedAI.setMobAI(enemy._speedAIId, 'chase');
  }

  /** 적 제거 (SpeedAI) */
  removeMob(enemy) {
    if (!this._saiReady || !enemy._speedAIId) return;
    SpeedAI.removeMob(enemy._speedAIId);
    enemy._speedAIMob = null;
  }

  /** 모든 적 AI 상태 변경 */
  setAllMobsAI(state) {
    if (!this._saiReady) return;
    SpeedAI.setAllMobsAI(state);
  }

  // ── 적 처치 ──

  /** 적 처치 시 호출 → EXP + SpeedAI 제거 */
  onEnemyKill(enemy) {
    this.stats.kills++;
    const exp = 10 + (enemy.level || this.stage) * 5;
    this.stats.exp += exp;
    this.removeMob(enemy);
    return this.addExp(exp);
  }

  // ── 레벨업 ──

  /** EXP 추가 → 레벨업 체크 */
  addExp(amount) {
    if (!this.heroMgr) return null;
    let result;
    try { result = this.heroMgr.addExp(amount); } catch(e) { return null; }
    if (result?.leveledUp) {
      this._loadSkills();
      const g = HERO_CLASSES?.[this.heroClass]?.growth;
      if (g) {
        this.player.maxHp  += g.maxHp  || 5;
        this.player.hp      = Math.min(this.player.hp + (g.maxHp || 5), this.player.maxHp);
        this.player.attack  += g.attack || 1;
        this.player.defense += g.defense || 1;
      }
      try { GameState.heroUpgrade = this.heroMgr.toJSON(); } catch(e) {}
      if (this.onLevelUp) this.onLevelUp(result);
    }
    return result;
  }

  // ── 조회 ──

  /** 위험도 (SAFE=0, ALERT=1, CRITICAL=2) */
  getDanger()       { return this._danger; }
  /** 이동 모드 (walk/run/sprint) */
  getMoveMode()     { return this._moveMode; }
  /** 현재 전술 행동 */
  getAction()       { return this._action; }
  /** 대기 중 스킬 */
  getPendingSkill() { return this._pendingSkill; }
  /** SpeedAI 활성 여부 */
  isReady()         { return this._saiReady; }
  /** 영웅 레벨 */
  getLevel()        { return this.heroMgr?.level || 1; }
  /** 사용 가능 스킬 목록 */
  getSkills()       { return this.skills; }
  /** 전투 통계 */
  getStats()        { return this.stats; }

  // ── 클린업 ──

  /** 씬 전환 시 호출 */
  destroy() {
    if (this._saiReady && window.SpeedAI) {
      SpeedAI._units = [];
      SpeedAI._hero = null;
    }
    this._saiReady = false;
  }
}

// export constants for external use
export { DANGER, ACTION, SAI_SCALE };
