// ============================================================
// 🎰 몽글벨 가챠 UI 컨트롤러 (5/5)
// ============================================================
// 가챠 UI 상태 관리 + 연출 데이터 + 확률 공개
// 법적 대응 (한국/일본/중국)
//
// Claude Code: js/gacha/gacha-ui.js 에 넣으세요
// ============================================================

const GachaUI = {

  // ========== UI 상태 ==========
  _currentTab: 'equipment',  // equipment, pet, marble
  _currentBanner: null,      // 이벤트 배너 ID
  _isAnimating: false,
  _lastResults: [],

  // ========== 등급별 연출 데이터 ==========
  RARITY_EFFECTS: {
    common: {
      bgColor: '#666666',
      glowColor: null,
      particleColor: '#AAAAAA',
      shakeIntensity: 0,
      flashDuration: 0,
      sound: 'common_get',
      animDuration: 500
    },
    rare: {
      bgColor: '#2244AA',
      glowColor: '#4488FF',
      particleColor: '#4488FF',
      shakeIntensity: 2,
      flashDuration: 200,
      sound: 'rare_get',
      animDuration: 800
    },
    epic: {
      bgColor: '#6622AA',
      glowColor: '#AA44FF',
      particleColor: '#AA44FF',
      shakeIntensity: 5,
      flashDuration: 400,
      sound: 'epic_get',
      animDuration: 1200
    },
    legendary: {
      bgColor: '#AA6600',
      glowColor: '#FFD700',
      particleColor: '#FFD700',
      shakeIntensity: 10,
      flashDuration: 800,
      sound: 'legendary_get',
      animDuration: 2500,
      specialCutscene: true  // 특별 컷씬!
    }
  },

  // ========== 별 색상 ==========
  RARITY_STARS: {
    common:    { count: 1, color: '#AAAAAA' },
    rare:      { count: 2, color: '#4488FF' },
    epic:      { count: 3, color: '#AA44FF' },
    legendary: { count: 4, color: '#FFD700' }
  },

  // =============================================================
  // 🎮 뽑기 실행 (UI에서 호출)
  // =============================================================
  executePull(playerData, count) {
    if (this._isAnimating) return { error: '연출 중...' };

    const gachaType = this._currentBanner
      ? this._activeBannerType()
      : this._currentTab;

    // 비용 확인
    const cost = GachaSystem.getCost(count);
    if (playerData.diamond < cost) {
      return { error: '다이아가 부족합니다!', needed: cost, current: playerData.diamond };
    }

    // 차감
    playerData.diamond -= cost;

    // 뽑기 실행
    let result;
    if (this._currentBanner) {
      result = count === 1
        ? EventBanner.pull(this._currentBanner, playerData)
        : EventBanner.pullMulti(this._currentBanner, playerData);
    } else {
      result = count === 1
        ? GachaSystem.pull(gachaType, playerData)
        : GachaSystem.pullMulti(gachaType, playerData);
    }

    // 아이템 지급
    if (count === 1) {
      this._giveReward(result, playerData);
      this._lastResults = [result];
    } else {
      result.results.forEach(r => this._giveReward(r, playerData));
      this._lastResults = result.results;
    }

    // 연출 데이터 생성
    const animData = this._createAnimationData(count === 1 ? [result] : result.results);

    return {
      ...result,
      cost,
      remainingDiamond: playerData.diamond,
      animationData: animData
    };
  },

  // =============================================================
  // 🎁 보상 지급
  // =============================================================
  _giveReward(result, playerData) {
    if (!result || !result.item) return;

    if (result.isDuplicate) {
      // 조각 지급
      playerData.fragments = (playerData.fragments || 0) + result.fragments;
    } else {
      // 새 아이템 지급
      if (!playerData.ownedItems) playerData.ownedItems = [];
      playerData.ownedItems.push(result.item.id || result.id);
    }

    // 마일스톤 보상
    if (result.milestoneReward) {
      // 별도 보상 처리
    }
  },

  // =============================================================
  // ✨ 연출 데이터 생성
  // =============================================================
  _createAnimationData(results) {
    const animations = results.map((result, index) => {
      const rarity = result.rarity || 'common';
      const effect = this.RARITY_EFFECTS[rarity];
      const stars = this.RARITY_STARS[rarity];

      return {
        index,
        delay: index * 300, // 순차 공개
        rarity,
        itemName: result.item?.name || result.name || '???',
        itemIcon: result.item?.icon || result.icon || '❓',
        isNew: result.isNew,
        isDuplicate: result.isDuplicate,
        isPickup: result.isPickup,
        fragments: result.fragments || 0,

        // 연출
        bgColor: effect.bgColor,
        glowColor: effect.glowColor,
        particleColor: effect.particleColor,
        shakeIntensity: effect.shakeIntensity,
        flashDuration: effect.flashDuration,
        animDuration: effect.animDuration,
        specialCutscene: effect.specialCutscene || false,

        // 별
        starCount: stars.count,
        starColor: stars.color,

        // 사운드
        sound: effect.sound
      };
    });

    // 정렬: Legendary부터 보여줄지, 순서대로 보여줄지
    return {
      items: animations,
      totalDuration: animations.reduce((sum, a) => sum + a.animDuration, 0),
      bestRarity: results.reduce((best, r) => {
        const order = { legendary: 4, epic: 3, rare: 2, common: 1 };
        return (order[r.rarity] || 0) > (order[best] || 0) ? r.rarity : best;
      }, 'common'),
      hasLegendary: results.some(r => r.rarity === 'legendary'),
      hasPickup: results.some(r => r.isPickup)
    };
  },

  // =============================================================
  // 📊 UI 정보 (화면 표시용)
  // =============================================================
  getUIData(playerId) {
    const gachaType = this._currentTab;
    const pityInfo = PitySystem.getInfo(playerId, gachaType);
    const rateInfo = GachaSystem.getRateInfo(playerId, gachaType);

    return {
      // 탭
      currentTab: this._currentTab,
      tabs: Object.entries(GachaSystem.GACHA_TYPES).map(([key, val]) => ({
        id: key, name: val.name, icon: val.icon
      })),

      // 피티 진행
      pity: {
        ...pityInfo,
        barWidth: `${pityInfo.progressBar * 100}%`,
        barColor: pityInfo.failCount > 20 ? '#FFD700' :
                  pityInfo.failCount > 15 ? '#FF8800' :
                  pityInfo.failCount > 10 ? '#FFAA00' : '#4488FF'
      },

      // 확률 (법적 표시)
      rates: rateInfo.displayRates,
      currentLegendaryRate: rateInfo.currentLegendaryRate,

      // 비용
      singleCost: GachaSystem.COST.single,
      multiCost: GachaSystem.COST.multi,

      // 이벤트 배너
      activeBanners: EventBanner.getActiveBanners().map(b => EventBanner.getBannerInfo(b.id)),

      // 조각 상점
      fragments: {
        legendaryCost: RewardPool.FRAGMENT_COST.legendary,
        epicCost: RewardPool.FRAGMENT_COST.epic,
        rareCost: RewardPool.FRAGMENT_COST.rare
      }
    };
  },

  // =============================================================
  // 📋 확률 공개 (법적 필수 - 한국/일본/중국 대응)
  // =============================================================
  getLegalRateDisplay(playerId, gachaType) {
    const rateInfo = GachaSystem.getRateInfo(playerId, gachaType);
    const pool = RewardPool.getPool(gachaType);

    // 등급별 아이템 목록 + 개별 확률
    const itemRates = {};
    ['common', 'rare', 'epic', 'legendary'].forEach(rarity => {
      const items = pool.filter(i => i.rarity === rarity);
      const baseRate = rarity === 'legendary'
        ? rateInfo.currentLegendaryRate
        : GachaSystem.BASE_RATES[rarity];
      const perItem = items.length > 0 ? baseRate / items.length : 0;

      itemRates[rarity] = {
        totalRate: `${(baseRate * 100).toFixed(2)}%`,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          rate: `${(perItem * 100).toFixed(4)}%`
        }))
      };
    });

    return {
      gachaType,
      displayName: GachaSystem.GACHA_TYPES[gachaType]?.name || gachaType,
      rates: rateInfo.displayRates,
      detailedRates: itemRates,
      pitySystem: {
        softPity: `연속 미획득 시 레전더리 확률 매회 +${PitySystem.SOFT_PITY_RATE * 100}%씩 증가`,
        hardPity: `${PitySystem.HARD_PITY_COUNT}회 연속 미획득 시 레전더리 확정`,
        currentCount: rateInfo.failCount,
        currentBonus: `+${(rateInfo.pityBonus * 100).toFixed(1)}%`
      },
      duplicatePolicy: '이미 보유한 아이템 획득 시 조각으로 전환됩니다. 조각 100개로 원하는 레전더리를 선택할 수 있습니다.',
      multiGuarantee: '10연차 시 Rare 등급 이상 1개 보장',
      lastUpdated: new Date().toISOString()
    };
  },

  // ========== 탭/배너 전환 ==========
  setTab(tab) {
    this._currentTab = tab;
    this._currentBanner = null;
  },

  setBanner(bannerId) {
    this._currentBanner = bannerId;
  },

  _activeBannerType() {
    const banner = EventBanner._activeBanners.find(b => b.id === this._currentBanner);
    return banner ? banner.type : this._currentTab;
  },

  // ========== 조각 상점 ==========
  exchangeFragments(playerData, rarity, gachaType, targetItemId) {
    const cost = RewardPool.FRAGMENT_COST[rarity];
    if (!cost) return { error: '잘못된 등급' };

    if ((playerData.fragments || 0) < cost) {
      return { error: `조각이 부족합니다 (필요: ${cost}, 보유: ${playerData.fragments || 0})` };
    }

    const item = RewardPool.getItemById(targetItemId);
    if (!item || item.rarity !== rarity) {
      return { error: '아이템을 찾을 수 없습니다' };
    }

    playerData.fragments -= cost;
    if (!playerData.ownedItems) playerData.ownedItems = [];
    playerData.ownedItems.push(item.id);

    return {
      success: true,
      item,
      remainingFragments: playerData.fragments,
      message: `${item.name} 획득! (조각 ${cost}개 사용)`
    };
  },

  connectToEngine() {
    console.log('[GachaUI] 가챠 UI 컨트롤러 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.GachaUI = GachaUI;
if (typeof module !== 'undefined') module.exports = GachaUI;
