// ============================================================
// 🎰 몽글벨 가챠 시스템 코어 (1/5)
// ============================================================
// 기본 철학: 가챠는 확률 게임이 아닌 "체감 진행 시스템"
// 기대감 → 근접감 → 보상감 3단계 심리 설계
//
// Claude Code: js/gacha/gacha-system.js 에 넣으세요
// ============================================================

const GachaSystem = {

  // ========== 기본 확률 (절대 안정형) ==========
  BASE_RATES: {
    common:    0.65,  // 65%
    rare:      0.23,  // 23%
    epic:      0.09,  // 9%
    legendary: 0.03   // 3% (심리적 황금 비율)
  },

  // ========== 가챠 화폐 ==========
  COST: {
    single: 100,      // 1회 = 100 다이아
    multi:  900,       // 10회 = 900 다이아 (10% 보너스)
    multiCount: 10
  },

  // ========== 가챠 타입 (3종 분리) ==========
  GACHA_TYPES: {
    equipment: { name: '장비 가챠', icon: '⚔️', pool: 'equipment' },
    pet:       { name: '펫 가챠',   icon: '🐾', pool: 'pet' },
    marble:    { name: '마블 가챠', icon: '🎲', pool: 'marble' }
  },

  // =============================================================
  // 🎯 핵심: 1회 뽑기
  // =============================================================
  pull(gachaType, playerData) {
    const pity = PitySystem.getState(playerData.id, gachaType);
    const pool = RewardPool.getPool(gachaType);

    // 1. 등급 결정 (피티 반영)
    const rarity = this._determineRarity(pity);

    // 2. 해당 등급에서 아이템 선택 (중복 방지)
    const item = this._selectItem(rarity, pool, playerData, gachaType);

    // 3. 중복 체크 + 조각 전환
    const result = this._handleDuplicate(item, playerData);

    // 4. 피티 업데이트
    if (rarity === 'legendary') {
      PitySystem.reset(playerData.id, gachaType);
    } else {
      PitySystem.increment(playerData.id, gachaType);
    }

    // 5. 통계 기록
    this._recordStats(playerData.id, gachaType, result);

    return result;
  },

  // =============================================================
  // 🎯 10연차 (보너스 포함)
  // =============================================================
  pullMulti(gachaType, playerData) {
    const results = [];
    let hasRareOrAbove = false;

    for (let i = 0; i < this.COST.multiCount; i++) {
      const result = this.pull(gachaType, playerData);
      results.push(result);
      if (result.rarity !== 'common') hasRareOrAbove = true;
    }

    // 10연차 최소 보장: Rare 이상 없으면 마지막을 Rare로
    if (!hasRareOrAbove) {
      const pool = RewardPool.getPool(gachaType);
      const rareItem = this._selectItem('rare', pool, playerData, gachaType);
      const rareResult = this._handleDuplicate(rareItem, playerData);
      results[results.length - 1] = rareResult;
    }

    return {
      results,
      totalCost: this.COST.multi,
      bestRarity: this._getBestRarity(results),
      legendaryCount: results.filter(r => r.rarity === 'legendary').length,
      epicCount: results.filter(r => r.rarity === 'epic').length,
      isMulti: true
    };
  },

  // =============================================================
  // 🎲 등급 결정 (소프트/하드 피티 반영)
  // =============================================================
  _determineRarity(pityState) {
    const failCount = pityState.failCount;

    // 하드 피티: 25연 실패 → 확정 Legendary
    if (failCount >= 25) {
      return 'legendary';
    }

    // 소프트 피티: 실패할수록 Legendary 확률 증가
    const pityBonus = failCount * 0.004; // n × 0.4%
    const legendaryRate = Math.min(1.0, this.BASE_RATES.legendary + pityBonus);

    // 나머지 확률 비례 조정
    const remainingRate = 1.0 - legendaryRate;
    const baseRemaining = this.BASE_RATES.common + this.BASE_RATES.rare + this.BASE_RATES.epic;
    const epicRate = (this.BASE_RATES.epic / baseRemaining) * remainingRate;
    const rareRate = (this.BASE_RATES.rare / baseRemaining) * remainingRate;
    const commonRate = (this.BASE_RATES.common / baseRemaining) * remainingRate;

    // 주사위 굴리기
    const roll = Math.random();
    let cumulative = 0;

    cumulative += legendaryRate;
    if (roll < cumulative) return 'legendary';

    cumulative += epicRate;
    if (roll < cumulative) return 'epic';

    cumulative += rareRate;
    if (roll < cumulative) return 'rare';

    return 'common';
  },

  // =============================================================
  // 🎁 아이템 선택 (중복 점감 확률)
  // =============================================================
  _selectItem(rarity, pool, playerData, gachaType) {
    const items = pool.filter(item => item.rarity === rarity);
    if (items.length === 0) return { id: 'empty', name: '없음', rarity, isNew: true };

    // 중복 점감: 이미 보유한 아이템 확률 50%로
    const owned = playerData.ownedItems || [];
    const weighted = items.map(item => ({
      ...item,
      weight: owned.includes(item.id) ? 0.5 : 1.0
    }));

    // 가중치 랜덤 선택
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;

    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        return {
          ...item,
          isNew: !owned.includes(item.id)
        };
      }
    }

    return { ...weighted[0], isNew: !owned.includes(weighted[0].id) };
  },

  // =============================================================
  // ♻️ 중복 처리 (조각 전환형)
  // =============================================================
  _handleDuplicate(item, playerData) {
    const owned = playerData.ownedItems || [];
    const isDuplicate = owned.includes(item.id);

    if (!isDuplicate) {
      return {
        ...item,
        isDuplicate: false,
        fragments: 0,
        message: `새로운 ${item.name} 획득!`
      };
    }

    // 중복 → 조각 전환
    const fragmentAmounts = {
      common: 5,
      rare: 15,
      epic: 40,
      legendary: 100
    };
    const fragments = fragmentAmounts[item.rarity] || 5;

    return {
      ...item,
      isDuplicate: true,
      fragments,
      message: `${item.name} 중복! → 조각 ${fragments}개 전환`
    };
  },

  // ========== 유틸 ==========
  _getBestRarity(results) {
    const order = ['legendary', 'epic', 'rare', 'common'];
    for (const rarity of order) {
      if (results.some(r => r.rarity === rarity)) return rarity;
    }
    return 'common';
  },

  _recordStats(playerId, gachaType, result) {
    // 통계 저장 (localStorage 등)
    const key = `gacha_stats_${playerId}_${gachaType}`;
    try {
      const stats = JSON.parse(localStorage.getItem(key) || '{}');
      stats.totalPulls = (stats.totalPulls || 0) + 1;
      stats[result.rarity] = (stats[result.rarity] || 0) + 1;
      if (result.rarity === 'legendary') {
        stats.lastLegendaryAt = stats.totalPulls;
      }
      localStorage.setItem(key, JSON.stringify(stats));
    } catch (e) {}
  },

  // ========== 확률 정보 (법적 표시용) ==========
  getRateInfo(playerId, gachaType) {
    const pity = PitySystem.getState(playerId, gachaType);
    const failCount = pity.failCount;
    const pityBonus = failCount * 0.004;

    return {
      baseRates: { ...this.BASE_RATES },
      currentLegendaryRate: Math.min(1.0, this.BASE_RATES.legendary + pityBonus),
      pityBonus: pityBonus,
      failCount: failCount,
      hardPityAt: 25,
      remainingToHardPity: Math.max(0, 25 - failCount),
      // 법적 표시용 (한국/일본/중국 대응)
      displayRates: {
        common:    `${((1.0 - Math.min(1.0, this.BASE_RATES.legendary + pityBonus)) * (this.BASE_RATES.common / 0.97) * 100).toFixed(1)}%`,
        rare:      `${((1.0 - Math.min(1.0, this.BASE_RATES.legendary + pityBonus)) * (this.BASE_RATES.rare / 0.97) * 100).toFixed(1)}%`,
        epic:      `${((1.0 - Math.min(1.0, this.BASE_RATES.legendary + pityBonus)) * (this.BASE_RATES.epic / 0.97) * 100).toFixed(1)}%`,
        legendary: `${(Math.min(1.0, this.BASE_RATES.legendary + pityBonus) * 100).toFixed(1)}%`
      }
    };
  },

  // ========== 재화 체크 ==========
  canPull(playerDiamond, count) {
    const cost = count === 1 ? this.COST.single : this.COST.multi;
    return playerDiamond >= cost;
  },

  getCost(count) {
    return count === 1 ? this.COST.single : this.COST.multi;
  },

  connectToEngine() {
    console.log('[GachaSystem] 가챠 시스템 코어 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.GachaSystem = GachaSystem;
if (typeof module !== 'undefined') module.exports = GachaSystem;
