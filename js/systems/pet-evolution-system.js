/**
 * pet-evolution-system.js — 펫 진화 시스템
 * 레전드 조각 6개를 합성하면 레전드 등급 펫 획득
 * 일반 소환과 완전 별개 시스템
 */

import { PET_EVOLUTION_RARITY, getRarityInfo, getRarityStats } from './rarity-manager.js';

// ── 펫 진화 풀 (8종) ──
export const PET_EVOLUTION_POOL = [
  { name: '불꽃 드래곤', emoji: '🐉', element: 'fire',      passive: 'ATK+15%',   passiveType: 'atk',    passiveVal: 0.15 },
  { name: '얼음 유니콘', emoji: '🦄', element: 'ice',       passive: 'DEF+15%',   passiveType: 'def',    passiveVal: 0.15 },
  { name: '번개 피닉스', emoji: '🦅', element: 'lightning',  passive: 'SPD+20%',   passiveType: 'spd',    passiveVal: 0.20 },
  { name: '자연 거북이', emoji: '🐢', element: 'nature',     passive: 'HP+20%',    passiveType: 'hp',     passiveVal: 0.20 },
  { name: '그림자 고양이', emoji: '🐈‍⬛', element: 'dark',   passive: 'CRIT+10%',  passiveType: 'crit',   passiveVal: 0.10 },
  { name: '바람 매',     emoji: '🦅', element: 'wind',       passive: 'DODGE+10%', passiveType: 'dodge',  passiveVal: 0.10 },
  { name: '물 해마',     emoji: '🐠', element: 'water',      passive: 'HEAL+5/s',  passiveType: 'heal',   passiveVal: 5 },
  { name: '대지 곰',     emoji: '🐻', element: 'earth',      passive: 'ARMOR+20%', passiveType: 'armor',  passiveVal: 0.20 },
];

// ── 펫 진화 설정 ──
export const PET_EVOLUTION = {
  REQUIRED_FRAGMENTS: 6,        // 필요 조각 수
  FRAGMENT_RARITY: 'legendary', // 레전드 조각만 사용
  RESULT_RARITY: PET_EVOLUTION_RARITY, // 4 = 레전드

  // 진화 가능 체크
  canEvolve(spiritItems) {
    const legendFragments = spiritItems.filter(f => f.rarity === 'legendary');
    return legendFragments.length >= this.REQUIRED_FRAGMENTS;
  },

  // 진화 실행 — 조각 소모 + 펫 생성
  evolve(spiritItems) {
    if (!this.canEvolve(spiritItems)) return { success: false, pet: null, remaining: spiritItems };

    // 레전드 조각 6개 소모
    const legendFragments = spiritItems.filter(f => f.rarity === 'legendary');
    const toRemoveIds = new Set(legendFragments.slice(0, this.REQUIRED_FRAGMENTS).map(f => f.id));
    const remaining = spiritItems.filter(item => !toRemoveIds.has(item.id));

    // 랜덤 펫 생성
    const petDef = PET_EVOLUTION_POOL[Math.floor(Math.random() * PET_EVOLUTION_POOL.length)];
    const stats = getRarityStats(this.RESULT_RARITY);
    const rarityInfo = getRarityInfo(this.RESULT_RARITY);

    const pet = {
      id: `pet_${Date.now()}`,
      ...petDef,
      rarity: 'legendary',
      rarityId: this.RESULT_RARITY,
      rarityLabel: `${rarityInfo.emoji} ${rarityInfo.name} ${rarityInfo.stars}`,
      level: 1,
      defense: stats.defense,
      atk: stats.atk,
      atkSpeed: stats.atkSpeed,
      moveSpeed: stats.moveSpeed,
      isPet: true,
      permanent: true,
    };

    return { success: true, pet, remaining };
  },
};

export default PET_EVOLUTION;
