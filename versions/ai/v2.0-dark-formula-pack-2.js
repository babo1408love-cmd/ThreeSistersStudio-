// ============================================================
// ⚔️ 몽글벨 공식팩 2/6 — 업그레이드 + 전투밸런스 + 보스방
// ============================================================
// 시스템 4: 업그레이드 아이템 스케일링 (combat-engine 교체용)
// 시스템 5: 실시간 공격력 밸런스 (combat-ai-balance 교체용)
// 시스템 6: 보스방 보스 스탯 (boss-room-system 교체용)
//
// Claude Code: js/ai/formula-pack-2.js 에 넣으세요
// ============================================================

const FormulaPack2 = {

  // =============================================================
  // ⬆️ 시스템 4: 업그레이드 아이템 스케일링
  // =============================================================
  UPGRADE_CONFIG: {
    // 스테이지 보너스 (로그 곡선)
    stageScaling: 0.15,

    // 중복 획득 감쇠 (diminishing returns)
    // 스택 n에서의 효과 = base × (1 / (1 + diminish × (n-1)))
    diminish: {
      fast_attack:    0.3,  // 공속은 빠르게 감쇠
      strong_attack:  0.2,
      long_range:     0.15,
      double_shot:    0.0,  // 연속발사는 감쇠 없음 (최대 4발 하드캡)
      pierce:         0.0,  // 관통도 하드캡
      homing:         0.0,  // on/off
      hp_restore:     0.25,
      defense_up:     0.2
    },

    // 하드캡
    hardCap: {
      fast_attack:   0.4,   // 최소 공격간격 비율 (기본의 40%)
      strong_attack: 3.0,   // 최대 탄환 크기 배율
      long_range:    2.5,   // 최대 사거리 배율
      double_shot:   4,     // 최대 발사 수
      pierce:        4,     // 최대 관통
      defense_up:    50     // 최대 방어 추가분
    }
  },

  getUpgradeEffect(upgradeType, stageLevel, stackCount) {
    const c = this.UPGRADE_CONFIG;
    const stageMult = 1 + Math.log2(Math.max(1, stageLevel)) * c.stageScaling;
    const dim = c.diminish[upgradeType] || 0.2;
    const n = Math.max(1, stackCount);

    // 감쇠 적용: 스택이 쌓일수록 효과 감소
    const dimMult = 1 / (1 + dim * (n - 1));

    switch (upgradeType) {
      case 'fast_attack': {
        // 공속: 0.8^스택 → 감쇠 적용 → 하드캡
        const mult = Math.max(c.hardCap.fast_attack, Math.pow(0.8, n * dimMult));
        return { type: 'atkSpeed_mult', value: mult, display: `공속 ×${(1/mult).toFixed(1)}` };
      }
      case 'strong_attack': {
        // 탄환 크기: 1.5 + 스테이지 보너스 → 감쇠
        const size = Math.min(c.hardCap.strong_attack, 1 + 0.5 * n * dimMult * stageMult);
        return { type: 'projSize_mult', value: size, display: `크기 ×${size.toFixed(1)}` };
      }
      case 'long_range': {
        const range = Math.min(c.hardCap.long_range, 1 + 0.3 * n * dimMult * stageMult);
        return { type: 'projSpeed_mult', value: range, display: `사거리 ×${range.toFixed(1)}` };
      }
      case 'double_shot': {
        const shots = Math.min(c.hardCap.double_shot, n + 1);
        return { type: 'shotCount', value: shots, display: `${shots}연발` };
      }
      case 'pierce': {
        const p = Math.min(c.hardCap.pierce, n + 1);
        return { type: 'pierce', value: p, display: `${p}관통` };
      }
      case 'homing': {
        return { type: 'homing', value: true, display: '추적탄 ON' };
      }
      case 'hp_restore': {
        // 회복량: 30% + 스테이지 보너스, 감쇠
        const pct = 0.30 * dimMult * stageMult;
        return { type: 'heal_pct', value: Math.min(0.5, pct), display: `HP ${(pct*100).toFixed(0)}% 회복` };
      }
      case 'defense_up': {
        // 방어: 5 + 스테이지 보너스, 감쇠
        const def = Math.min(c.hardCap.defense_up, Math.round(5 * n * dimMult * stageMult));
        return { type: 'defense_add', value: def, display: `DEF +${def}` };
      }
      default:
        return { type: 'unknown', value: 0, display: '???' };
    }
  },

  // =============================================================
  // 💥 시스템 5: 실시간 공격력 밸런스
  // =============================================================
  COMBAT_BALANCE_CONFIG: {
    // HP비율 기반 데미지 (낮을수록 약해짐)
    minDamageMult:   0.4,   // HP 0%에서 최소 배율
    maxDamageMult:   1.4,   // HP 100%에서 최대 배율

    // 머시(피격 보호): 2초 내 3피격 → 배율 감소
    mercyThreshold:  3,     // 피격 횟수
    mercyWindow:     2.0,   // 초
    mercyMult:       0.6,   // 배율

    // 그레이스(시작 보호): 무적→풀파워
    graceBaseDuration: 10,  // 기본 10초
    graceMinDuration:  3,   // 스테이지 높으면 최소 3초
    graceStageDecay:   0.15,// 스테이지당 0.15초 단축

    // 분노 배율
    rageMult: 1.3,

    // 스테이지별 범위 조정
    stageMinFloor: 0.3,     // 고스테이지 최소배율 하한
    stageMaxCeil:  1.5,     // 고스테이지 최대배율 상한
    mercyDecayPerStage: 0.008 // 스테이지당 머시 약화
  },

  getCombatDamageMultiplier(stageLevel, hpRatio, hitCount2Sec, elapsedSec, rageActive) {
    const c = this.COMBAT_BALANCE_CONFIG;

    // 1. HP 비율 기반
    let mult = c.minDamageMult + hpRatio * (c.maxDamageMult - c.minDamageMult);

    // 2. 그레이스 (시작 보호) — 스테이지 높을수록 짧아짐
    const graceDur = Math.max(c.graceMinDuration,
      c.graceBaseDuration - stageLevel * c.graceStageDecay);
    if (elapsedSec < graceDur) {
      const graceRatio = elapsedSec / graceDur;
      mult *= (0.5 + graceRatio * 0.5); // 50%→100%
    }

    // 3. 머시 (피격 보호) — 스테이지 높을수록 약화
    if (hitCount2Sec >= c.mercyThreshold) {
      const mercyStr = Math.max(0.8, c.mercyMult + stageLevel * c.mercyDecayPerStage);
      mult *= mercyStr;
    }

    // 4. 분노
    if (rageActive) mult *= c.rageMult;

    // 5. 최종 범위 제한
    const minFloor = c.stageMinFloor;
    const maxCeil = c.stageMaxCeil;
    mult = Math.max(minFloor, Math.min(maxCeil, mult));

    return Math.round(mult * 1000) / 1000;
  },

  // =============================================================
  // 👹 시스템 6: 보스방 보스 스탯
  // =============================================================
  BOSS_CONFIG: {
    // 보스 = 플레이어 맨몸 전투력의 배수
    hpMultBase:   15,       // HP = 플레이어HP × 15
    atkMultBase:  2.5,      // ATK = 플레이어ATK × 2.5
    defMultBase:  1.8,      // DEF = 플레이어DEF × 1.8

    // 스테이지 성장 (로그)
    stageGrowth:  0.20,

    // 분노모드 (HP 30% 이하)
    rageThreshold: 0.30,
    rageATKBoost:  1.5,     // ATK 50% 증가
    rageSPDBoost:  1.3,     // SPD 30% 증가

    // 킬타임 목표: 30~60초
    minKillTime: 30,
    maxKillTime: 60,

    // 페이즈 (3단계)
    phases: [
      { hpThreshold: 1.0, atkMult: 1.0, spdMult: 1.0, name: '1페이즈' },
      { hpThreshold: 0.5, atkMult: 1.2, spdMult: 1.1, name: '2페이즈' },
      { hpThreshold: 0.3, atkMult: 1.5, spdMult: 1.3, name: '분노' }
    ]
  },

  getBossStats(stageLevel, playerPower) {
    const c = this.BOSS_CONFIG;
    const pHP  = playerPower?.hp || 250;
    const pATK = playerPower?.atk || 12;
    const pDEF = playerPower?.def || 7;
    const pDPS = playerPower?.dps || pATK * 2;

    const stageMult = 1 + Math.log2(Math.max(1, stageLevel)) * c.stageGrowth;

    // 킬타임 기반 HP (DPS × 목표초)
    const targetKillTime = Math.min(c.maxKillTime,
      c.minKillTime + stageLevel * 0.3);
    const hpFromKillTime = pDPS * targetKillTime;
    const hpFromMult = pHP * c.hpMultBase * stageMult;
    const finalHP = Math.round(Math.max(hpFromKillTime, hpFromMult));

    return {
      hp:   finalHP,
      atk:  Math.round(pATK * c.atkMultBase * stageMult),
      def:  Math.round(pDEF * c.defMultBase * stageMult),
      spd:  0.6, // 보스는 항상 느림
      phases: c.phases,
      rageThreshold: c.rageThreshold,
      estimatedKillTime: Math.round(finalHP / pDPS),
      stageLevel
    };
  },

  // 보스 현재 페이즈
  getBossPhase(hpRatio) {
    const phases = this.BOSS_CONFIG.phases;
    for (let i = phases.length - 1; i >= 0; i--) {
      if (hpRatio <= phases[i].hpThreshold) return phases[i];
    }
    return phases[0];
  },

  // 디버그
  debugBossScaling(playerPower, maxStage) {
    console.log(`\n=== 보스 스케일링 (스테이지 1~${maxStage}) ===`);
    console.log('스테이지 | 보스HP    | 보스ATK | 킬타임(초)');
    console.log('─'.repeat(45));
    for (let s = 1; s <= maxStage; s += 5) {
      const boss = this.getBossStats(s, playerPower);
      console.log(`${s.toString().padStart(5)}    | ${boss.hp.toString().padStart(8)} | ${boss.atk.toString().padStart(7)} | ~${boss.estimatedKillTime}초`);
    }
  },

  connectToEngine() {
    console.log('[FormulaPack2] 업그레이드 + 전투밸런스 + 보스방 공식 ✅');
  }
};

if (typeof window !== 'undefined') window.FormulaPack2 = FormulaPack2;
if (typeof module !== 'undefined') module.exports = FormulaPack2;
