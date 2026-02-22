// ============================================================
// 🎰 몽글벨 이벤트 배너 시스템 (4/5)
// ============================================================
// 한정 캐릭터/장비 배너 + 픽업 확률 + 2중 천장
// 배너 스케줄 관리
//
// Claude Code: js/gacha/event-banner.js 에 넣으세요
// ============================================================

const EventBanner = {

  _activeBanners: [],

  // =============================================================
  // 📋 배너 생성
  // =============================================================
  createBanner(data) {
    const banner = {
      id: data.id || `banner_${Date.now()}`,
      name: data.name || '이벤트 배너',
      type: data.type || 'equipment', // equipment, pet, marble
      description: data.description || '',
      icon: data.icon || '⭐',

      // 기간
      startDate: data.startDate || Date.now(),
      endDate: data.endDate || Date.now() + 14 * 24 * 60 * 60 * 1000, // 기본 14일

      // 픽업 아이템
      pickupItems: data.pickupItems || [],  // [{ id, name, rarity, ... }]
      pickupRate: data.pickupRate || 0.5,   // Legendary 중 픽업 50%

      // 확률 (기본과 다를 수 있음)
      rates: data.rates || {
        common: 0.65,
        rare: 0.23,
        epic: 0.09,
        legendary: 0.03
      },

      // 배너 전용 보너스
      firstPullBonus: data.firstPullBonus || null,  // 첫 뽑기 보너스
      milestoneRewards: data.milestoneRewards || {}, // { 10: item, 30: item, 50: item }

      isActive: true
    };

    this._activeBanners.push(banner);
    console.log(`[EventBanner] 배너 생성: ${banner.name}`);
    return banner;
  },

  // =============================================================
  // 🎯 이벤트 뽑기 (픽업 확률 적용)
  // =============================================================
  pull(bannerId, playerData) {
    const banner = this._activeBanners.find(b => b.id === bannerId);
    if (!banner || !banner.isActive) {
      return { error: '배너가 존재하지 않거나 종료됨' };
    }

    if (!this.isActive(bannerId)) {
      return { error: '배너 기간이 아닙니다' };
    }

    // 이벤트 피티 가져오기
    const pity = PitySystem.getEventState(playerData.id, bannerId);
    const failCount = pity.eventFailCount;

    // 등급 결정 (피티 반영)
    let rarity;
    if (failCount >= 25) {
      rarity = 'legendary';
    } else {
      const bonus = failCount * 0.004;
      const legendaryRate = Math.min(1.0, banner.rates.legendary + bonus);
      const roll = Math.random();
      if (roll < legendaryRate) rarity = 'legendary';
      else if (roll < legendaryRate + banner.rates.epic) rarity = 'epic';
      else if (roll < legendaryRate + banner.rates.epic + banner.rates.rare) rarity = 'rare';
      else rarity = 'common';
    }

    let item;
    let isPickup = false;

    if (rarity === 'legendary') {
      // Legendary → 픽업 판정
      const pickupResult = PitySystem.resolveEventPickup(playerData.id, bannerId);
      isPickup = pickupResult.isPickup;

      if (isPickup && banner.pickupItems.length > 0) {
        // 픽업 아이템 중 랜덤
        item = banner.pickupItems[Math.floor(Math.random() * banner.pickupItems.length)];
      } else {
        // 일반 Legendary
        const pool = RewardPool.getPool(banner.type);
        const legendaries = pool.filter(i => i.rarity === 'legendary' && !banner.pickupItems.some(p => p.id === i.id));
        item = legendaries[Math.floor(Math.random() * legendaries.length)] || banner.pickupItems[0];
      }

      PitySystem.resetEvent(playerData.id, bannerId);
    } else {
      // Legendary 아님 → 일반 풀에서
      const pool = RewardPool.getPool(banner.type);
      const items = pool.filter(i => i.rarity === rarity);
      item = items[Math.floor(Math.random() * items.length)];
      PitySystem.incrementEvent(playerData.id, bannerId);
    }

    // 마일스톤 체크
    const totalPulls = pity.totalPulls;
    const milestone = banner.milestoneRewards[totalPulls];

    const result = {
      item: item || { id: 'empty', name: '없음', rarity },
      rarity,
      isPickup,
      isEvent: true,
      bannerId,
      bannerName: banner.name,
      milestoneReward: milestone || null,
      pityInfo: PitySystem.getEventInfo(playerData.id, bannerId)
    };

    return result;
  },

  // 이벤트 10연차
  pullMulti(bannerId, playerData) {
    const results = [];
    let hasRareOrAbove = false;

    for (let i = 0; i < 10; i++) {
      const result = this.pull(bannerId, playerData);
      if (result.error) return result;
      results.push(result);
      if (result.rarity !== 'common') hasRareOrAbove = true;
    }

    // 10연차 Rare 보장
    if (!hasRareOrAbove && results.length > 0) {
      const pool = RewardPool.getPool(this._activeBanners.find(b => b.id === bannerId)?.type || 'equipment');
      const rares = pool.filter(i => i.rarity === 'rare');
      if (rares.length > 0) {
        results[results.length - 1] = {
          ...results[results.length - 1],
          item: rares[Math.floor(Math.random() * rares.length)],
          rarity: 'rare'
        };
      }
    }

    return {
      results,
      bestRarity: this._getBestRarity(results),
      pickupCount: results.filter(r => r.isPickup).length,
      legendaryCount: results.filter(r => r.rarity === 'legendary').length,
      isMulti: true,
      isEvent: true,
      bannerId
    };
  },

  // =============================================================
  // ⏰ 배너 관리
  // =============================================================
  isActive(bannerId) {
    const banner = this._activeBanners.find(b => b.id === bannerId);
    if (!banner) return false;
    const now = Date.now();
    return banner.isActive && now >= banner.startDate && now <= banner.endDate;
  },

  getActiveBanners() {
    return this._activeBanners.filter(b => this.isActive(b.id));
  },

  getBannerInfo(bannerId) {
    const banner = this._activeBanners.find(b => b.id === bannerId);
    if (!banner) return null;

    const now = Date.now();
    const remaining = Math.max(0, banner.endDate - now);
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
      ...banner,
      remainingDays: days,
      remainingHours: hours,
      remainingText: days > 0 ? `${days}일 ${hours}시간` : `${hours}시간`,
      isActive: this.isActive(bannerId),
      pickupItemNames: banner.pickupItems.map(p => p.name)
    };
  },

  closeBanner(bannerId) {
    const banner = this._activeBanners.find(b => b.id === bannerId);
    if (banner) banner.isActive = false;
  },

  // 만료된 배너 정리
  cleanup() {
    this._activeBanners = this._activeBanners.filter(b => this.isActive(b.id));
  },

  _getBestRarity(results) {
    const order = ['legendary', 'epic', 'rare', 'common'];
    for (const rarity of order) {
      if (results.some(r => r.rarity === rarity)) return rarity;
    }
    return 'common';
  },

  connectToEngine() {
    console.log('[EventBanner] 이벤트 배너 시스템 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.EventBanner = EventBanner;
if (typeof module !== 'undefined') module.exports = EventBanner;
