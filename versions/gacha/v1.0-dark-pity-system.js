// ============================================================
// 🎰 몽글벨 피티 시스템 (2/5)
// ============================================================
// 소프트 피티 + 하드 피티 + 배너별 독립 카운트
// "운이 나빠도 손해는 아니다" 구현
//
// Claude Code: js/gacha/pity-system.js 에 넣으세요
// ============================================================

const PitySystem = {

  // ========== 설정 ==========
  SOFT_PITY_RATE: 0.004,   // 실패 1회당 +0.4%
  HARD_PITY_COUNT: 25,     // 25회 확정
  EVENT_PICKUP_RATE: 0.5,  // 픽업 50%
  EVENT_GUARANTEE: true,   // 2번째 레전더리 = 100% 픽업

  // 피티 저장소
  _states: {},

  // =============================================================
  // 📊 피티 상태 관리
  // =============================================================
  getState(playerId, gachaType) {
    const key = `${playerId}_${gachaType}`;
    if (!this._states[key]) {
      this._states[key] = this._loadState(key);
    }
    return this._states[key];
  },

  _loadState(key) {
    try {
      const saved = localStorage.getItem(`pity_${key}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return {
      failCount: 0,           // 연속 Legendary 미획득 횟수
      totalPulls: 0,          // 총 뽑기 횟수
      legendaryCount: 0,      // 획득한 Legendary 수
      lastLegendaryPull: 0,   // 마지막 Legendary 획득 시점
      // 이벤트 배너용
      eventFailCount: 0,      // 이벤트 배너 실패 횟수
      eventLostFiftyFifty: false, // 5050에서 졌는지
      eventPickupGuarantee: false // 다음 Legendary = 확정 픽업
    };
  },

  _saveState(key, state) {
    try {
      localStorage.setItem(`pity_${key}`, JSON.stringify(state));
    } catch (e) {}
  },

  // =============================================================
  // ⬆️ 실패 카운트 증가 (Legendary 아닐 때)
  // =============================================================
  increment(playerId, gachaType) {
    const key = `${playerId}_${gachaType}`;
    const state = this.getState(playerId, gachaType);

    state.failCount++;
    state.totalPulls++;
    this._states[key] = state;
    this._saveState(key, state);

    return state;
  },

  // =============================================================
  // 🔄 리셋 (Legendary 획득 시)
  // =============================================================
  reset(playerId, gachaType) {
    const key = `${playerId}_${gachaType}`;
    const state = this.getState(playerId, gachaType);

    state.lastLegendaryPull = state.totalPulls;
    state.legendaryCount++;
    state.failCount = 0; // 소프트 피티 초기화
    state.totalPulls++;

    // ⚠️ 이벤트 배너 카운트는 리셋하지 않음! (별도 관리)
    this._states[key] = state;
    this._saveState(key, state);

    return state;
  },

  // =============================================================
  // 🎪 이벤트 배너 피티 (별도 카운트)
  // =============================================================
  getEventState(playerId, bannerId) {
    const key = `${playerId}_event_${bannerId}`;
    if (!this._states[key]) {
      this._states[key] = this._loadState(key);
    }
    return this._states[key];
  },

  incrementEvent(playerId, bannerId) {
    const key = `${playerId}_event_${bannerId}`;
    const state = this.getEventState(playerId, bannerId);
    state.eventFailCount++;
    state.totalPulls++;
    this._states[key] = state;
    this._saveState(key, state);
    return state;
  },

  // 이벤트 Legendary 획득 시 픽업 판정
  resolveEventPickup(playerId, bannerId) {
    const key = `${playerId}_event_${bannerId}`;
    const state = this.getEventState(playerId, bannerId);

    let isPickup = false;

    if (state.eventPickupGuarantee) {
      // 2번째 Legendary → 100% 픽업 확정
      isPickup = true;
      state.eventPickupGuarantee = false;
      state.eventLostFiftyFifty = false;
    } else {
      // 1번째 Legendary → 50% 확률
      isPickup = Math.random() < this.EVENT_PICKUP_RATE;

      if (!isPickup) {
        // 5050 졌음 → 다음은 확정 픽업
        state.eventLostFiftyFifty = true;
        state.eventPickupGuarantee = true;
      }
    }

    // 이벤트 피티 리셋
    state.eventFailCount = 0;
    state.legendaryCount++;
    this._states[key] = state;
    this._saveState(key, state);

    return {
      isPickup,
      wasGuaranteed: state.eventPickupGuarantee,
      nextGuaranteed: state.eventPickupGuarantee
    };
  },

  resetEvent(playerId, bannerId) {
    const key = `${playerId}_event_${bannerId}`;
    const state = this.getEventState(playerId, bannerId);
    state.eventFailCount = 0;
    state.legendaryCount++;
    this._states[key] = state;
    this._saveState(key, state);
  },

  // =============================================================
  // 📊 피티 정보 (UI 표시용)
  // =============================================================
  getInfo(playerId, gachaType) {
    const state = this.getState(playerId, gachaType);
    const failCount = state.failCount;
    const bonus = failCount * this.SOFT_PITY_RATE;
    const currentRate = Math.min(1.0, 0.03 + bonus);

    return {
      failCount,
      hardPityAt: this.HARD_PITY_COUNT,
      remaining: Math.max(0, this.HARD_PITY_COUNT - failCount),
      currentLegendaryRate: currentRate,
      currentRatePercent: `${(currentRate * 100).toFixed(1)}%`,
      bonusPercent: `+${(bonus * 100).toFixed(1)}%`,
      totalPulls: state.totalPulls,
      legendaryCount: state.legendaryCount,
      avgPullsPerLegendary: state.legendaryCount > 0
        ? Math.round(state.totalPulls / state.legendaryCount)
        : 0,
      // 진행 바 (0~1)
      progressBar: failCount / this.HARD_PITY_COUNT,
      // 체감 메시지
      message: this._getPityMessage(failCount)
    };
  },

  _getPityMessage(failCount) {
    if (failCount === 0) return '행운을 빌어요! 🍀';
    if (failCount < 5) return '아직 시작이에요!';
    if (failCount < 10) return '조금씩 가까워지고 있어요...';
    if (failCount < 15) return '곧 좋은 게 나올 거예요! ✨';
    if (failCount < 20) return '거의 다 왔어요! 🔥';
    if (failCount < 23) return '확률이 많이 올랐어요!! 💎';
    if (failCount < 25) return '⚡ 레전더리가 코앞이에요!!!';
    return '🎉 확정 레전더리!!!';
  },

  // 이벤트 피티 정보
  getEventInfo(playerId, bannerId) {
    const state = this.getEventState(playerId, bannerId);
    return {
      failCount: state.eventFailCount,
      remaining: Math.max(0, this.HARD_PITY_COUNT - state.eventFailCount),
      isNextPickupGuaranteed: state.eventPickupGuarantee,
      lostFiftyFifty: state.eventLostFiftyFifty,
      message: state.eventPickupGuarantee
        ? '🎯 다음 레전더리 = 확정 픽업!'
        : '50/50 도전!'
    };
  },

  // =============================================================
  // 🗑️ 리셋/초기화
  // =============================================================
  clearAll(playerId) {
    Object.keys(this._states).forEach(key => {
      if (key.startsWith(playerId)) {
        delete this._states[key];
        try { localStorage.removeItem(`pity_${key}`); } catch (e) {}
      }
    });
  },

  connectToEngine() {
    console.log('[PitySystem] 피티 시스템 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.PitySystem = PitySystem;
if (typeof module !== 'undefined') module.exports = PitySystem;
