/**
 * rarity-manager.js — 등급 시스템 매니저
 * 모든 등급 관련 상수, 스탯, 함수를 중앙 관리
 */

// ── 등급 정의 (5등급) ──
export const RARITY = {
  COMMON:    { id: 1, name: '커먼',   nameEN: 'Common',    color: '#b2bec3', border: '#636e72', emoji: '⬜', stars: '★☆☆☆☆' },
  RARE:      { id: 2, name: '레어',   nameEN: 'Rare',      color: '#74b9ff', border: '#0984e3', emoji: '🟦', stars: '★★☆☆☆' },
  EPIC:      { id: 3, name: '에픽',   nameEN: 'Epic',      color: '#a29bfe', border: '#6c5ce7', emoji: '🟪', stars: '★★★☆☆' },
  LEGENDARY: { id: 4, name: '레전드', nameEN: 'Legendary', color: '#ffeaa7', border: '#fdcb6e', emoji: '🟨', stars: '★★★★☆' },
  MYTHIC:    { id: 5, name: '신화',   nameEN: 'Mythic',    color: '#ff7675', border: '#d63031', emoji: '🟥', stars: '★★★★★' },
};

// 소환에서 나올 수 있는 최대 등급
export const SUMMON_MAX_RARITY = 3;  // 에픽까지만

// 펫진화에서 나올 수 있는 등급
export const PET_EVOLUTION_RARITY = 4;  // 레전드 고정

// ── 등급별 방어력 (= 맞을 수 있는 횟수) ──
export const RARITY_DEFENSE = {
  1: 1,   // 커먼: 1번 맞으면 귀환
  2: 2,   // 레어: 2번
  3: 3,   // 에픽: 3번
  4: 5,   // 레전드: 5번 (펫진화 전용)
  5: 8,   // 신화: 8번 (미래 컨텐츠)
};

// ── 등급별 공격력 ──
export const RARITY_ATK = {
  1: 10,  2: 18,  3: 28,  4: 40,  5: 60,
};

// ── 등급별 공격속도 (초) ──
export const RARITY_ATK_SPEED = {
  1: 2.0,  2: 1.5,  3: 1.0,  4: 0.8,  5: 0.5,
};

// ── 등급별 이동속도 (배율) ──
export const RARITY_MOVE_SPEED = {
  1: 1.0,  2: 1.0,  3: 1.3,  4: 1.5,  5: 2.0,
};

// ── 등급별 스킬 보유 여부 ──
export const RARITY_HAS_SKILL = {
  1: false,  2: false,  3: true,  4: true,  5: true,
};

// ── 소환 확률 ──
export function rollSummonRarity() {
  const r = Math.random() * 100;
  if (r < 45) return 1;    // 커먼 45%
  if (r < 75) return 2;    // 레어 30%
  return 3;                 // 에픽 25%
  // 4, 5는 절대 안 나옴
}

// ── 등급 정보 가져오기 (id → RARITY 객체) ──
export function getRarityInfo(id) {
  return Object.values(RARITY).find(r => r.id === id) || RARITY.COMMON;
}

// ── 등급 이름 가져오기 (id → name) ──
export function getRarityName(id) {
  return getRarityInfo(id).name;
}

// ── 등급 색상 가져오기 (id → color) ──
export function getRarityColor(id) {
  return getRarityInfo(id).color;
}

// ── 등급이 소환 가능한지 체크 ──
export function isSummonable(rarityId) {
  return rarityId <= SUMMON_MAX_RARITY;
}

// ── 등급별 전체 스탯 가져오기 ──
export function getRarityStats(rarityId) {
  return {
    defense: RARITY_DEFENSE[rarityId] || 1,
    atk: RARITY_ATK[rarityId] || 10,
    atkSpeed: RARITY_ATK_SPEED[rarityId] || 2.0,
    moveSpeed: RARITY_MOVE_SPEED[rarityId] || 1.0,
    hasSkill: RARITY_HAS_SKILL[rarityId] || false,
  };
}
