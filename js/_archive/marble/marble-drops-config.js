// ====================================================
// 마블 보드 아이템 드랍 시스템
// 세계관 모든 아이템이 랜덤 출현 (시스템 부담 최소화)
// 황금 미믹 특수 타일 포함
// ====================================================

import { GOLDEN_MIMIC } from './golden-mimic-config.js';
import { MARBLE_SCALING } from './balance-config.js';

// --- 마블 타일 드랍 테이블 ---
// weight: 등장 가중치 (전체 합 대비 확률)
// 시스템 부담 최소화: 단순 가중치 배열, 복잡한 조건문 없음

export const MARBLE_DROP_TABLE = [
  // ==========================================
  // 골드 (총 weight 30)
  // ==========================================
  { emoji: '💰', name: '금화',      type: 'gold', value: 30,  weight: 18 },
  { emoji: '💰', name: '금화 더미',  type: 'gold', value: 60,  weight: 8 },
  { emoji: '💰', name: '금화 보따리', type: 'gold', value: 120, weight: 4 },

  // ==========================================
  // 소비 아이템 (총 weight 18)
  // ==========================================
  { emoji: '🧪', name: '작은 포션',     type: 'potion',  value: 20,  weight: 8 },
  { emoji: '⚗️', name: '큰 포션',       type: 'potion',  value: 40,  weight: 5 },
  { emoji: '💪', name: '공격력 부스트',  type: 'buff',    buffStat: 'attack',  value: 5, duration: 30000, weight: 3 },
  { emoji: '🛡️', name: '방어력 부스트', type: 'buff',    buffStat: 'defense', value: 5, duration: 30000, weight: 2 },

  // ==========================================
  // 점수 (총 weight 10)
  // ==========================================
  { emoji: '⭐', name: '보너스 점수', type: 'score', value: 50,  weight: 7 },
  { emoji: '🌟', name: '큰 점수',    type: 'score', value: 150, weight: 3 },

  // ==========================================
  // 장비 아이템 — 일반 (총 weight ~14)
  // ==========================================
  { emoji: '🗡️', name: '낡은 검',       type: 'equip', slot: 'arms',    rarity: 'common', stats: { attack: 3 },             weight: 2.5 },
  { emoji: '🧥', name: '가죽 갑옷',     type: 'equip', slot: 'body',    rarity: 'common', stats: { defense: 3 },            weight: 2.5 },
  { emoji: '👒', name: '가죽 모자',     type: 'equip', slot: 'head',    rarity: 'common', stats: { defense: 2, maxHp: 10 }, weight: 2 },
  { emoji: '👟', name: '여행자의 신발',  type: 'equip', slot: 'shoes',   rarity: 'common', stats: { speed: 1 },              weight: 2 },
  { emoji: '🦿', name: '가죽 각반',     type: 'equip', slot: 'legs',    rarity: 'common', stats: { defense: 2, speed: 1 },  weight: 2 },
  { emoji: '🪽', name: '깃털 장식',     type: 'equip', slot: 'wings',   rarity: 'common', stats: { rageGainRate: 5 },       weight: 1 },

  // ==========================================
  // 장비 아이템 — 레어 (총 weight ~5)
  // ==========================================
  { emoji: '⚔️', name: '크리스탈 검',     type: 'equip', slot: 'arms',    rarity: 'rare', stats: { attack: 8 },                    weight: 1.0 },
  { emoji: '👘', name: '마법 로브',        type: 'equip', slot: 'body',    rarity: 'rare', stats: { defense: 6, maxHp: 20 },        weight: 0.8 },
  { emoji: '🪽', name: '바람의 날개',      type: 'equip', slot: 'wings',   rarity: 'rare', stats: { rageGainRate: 10, speed: 2 },   weight: 0.8 },
  { emoji: '👒', name: '마법사의 모자',    type: 'equip', slot: 'head',    rarity: 'rare', stats: { defense: 5, maxHp: 25 },        weight: 0.6 },
  { emoji: '🥾', name: '민첩의 장화',      type: 'equip', slot: 'shoes',   rarity: 'rare', stats: { speed: 3 },                     weight: 0.6 },
  { emoji: '🩲', name: '마법 레깅스',      type: 'equip', slot: 'legs',    rarity: 'rare', stats: { defense: 5, speed: 2 },         weight: 0.6 },

  // ==========================================
  // 정령 파츠 (총 weight 10)
  // ==========================================
  { emoji: '🌸', name: '정령의 꽃',     type: 'spirit_part', weight: 5 },
  { emoji: '💠', name: '정령의 파편',   type: 'spirit_part', weight: 3 },
  { emoji: '💎', name: '정령의 결정',   type: 'spirit_part', weight: 2 },  // 높은 등급 파츠 확률↑

  // ==========================================
  // 빈 타일 (총 weight 8)
  // ==========================================
  { emoji: '', name: '', type: 'empty', weight: 8 },

  // ==========================================
  // 희귀 아이템 — 에픽/레전드리 (총 weight 2)
  // 이 아이템은 황금 미믹 이벤트를 유발할 수 있음
  // ==========================================
  { emoji: '🏹', name: '전설의 활',       type: 'equip', slot: 'arms',   rarity: 'epic',      stats: { attack: 15, speed: 2 },    weight: 0.8, rare: true },
  { emoji: '⚜️', name: '드래곤 아머',     type: 'equip', slot: 'body',   rarity: 'epic',      stats: { defense: 15, maxHp: 30 },  weight: 0.5, rare: true },
  { emoji: '👑', name: '생명의 왕관',      type: 'equip', slot: 'head',   rarity: 'epic',      stats: { maxHp: 50, defense: 5 },   weight: 0.4, rare: true },
  { emoji: '🐉', name: '드래곤 다리갑',    type: 'equip', slot: 'legs',   rarity: 'epic',      stats: { defense: 12, speed: 3 },   weight: 0.3, rare: true },
  { emoji: '🌌', name: '우주의 날개',      type: 'equip', slot: 'wings',  rarity: 'legendary', stats: { rageGainRate: 40, speed: 5 }, weight: 0.15, rare: true },
  { emoji: '🐲', name: '용의 팔찌',        type: 'equip', slot: 'arms',   rarity: 'legendary', stats: { critRate: 12, attack: 8 },  weight: 0.05, rare: true },
];

// --- 드랍 총 가중치 (캐싱) ---
const _totalWeight = MARBLE_DROP_TABLE.reduce((s, d) => s + d.weight, 0);


// --- 마블 드랍 롤 함수 ---
export function rollMarbleDrop() {
  let roll = Math.random() * _totalWeight;
  for (const drop of MARBLE_DROP_TABLE) {
    roll -= drop.weight;
    if (roll <= 0) return { ...drop };
  }
  return { ...MARBLE_DROP_TABLE[0] };
}


// --- 스케일링된 마블 드랍 (스테이지별 골드/등급 보정) ---
export function rollMarbleDropScaled(stageId, comboCount = 0) {
  const drop = rollMarbleDrop();

  // 골드 스케일링
  if (drop.type === 'gold') {
    drop.value = MARBLE_SCALING.goldReward(stageId, comboCount);
  }

  // 장비 등급 스케일링: 스테이지에 맞는 등급으로 업그레이드 가능
  if (drop.type === 'equip' && !drop.rare) {
    const rolledRarity = MARBLE_SCALING.rollRarity(stageId);
    const rarityOrder = ['common', 'rare', 'epic', 'legendary'];
    const currentIdx = rarityOrder.indexOf(drop.rarity);
    const rolledIdx = rarityOrder.indexOf(rolledRarity);
    if (rolledIdx > currentIdx) {
      drop.rarity = rolledRarity;
      // 등급 상승 시 스탯 보정
      const mult = 1 + rolledIdx * 0.5;
      if (drop.stats) {
        for (const key of Object.keys(drop.stats)) {
          drop.stats[key] = Math.round(drop.stats[key] * mult);
        }
      }
    }
  }

  return drop;
}


// --- 희귀 아이템 판별 ---
export function isRareDrop(drop) {
  return drop.rare === true;
}


// --- 황금 미믹 타일 생성 ---
export function createMimicTile() {
  return {
    emoji: GOLDEN_MIMIC.emoji,
    name: GOLDEN_MIMIC.name,
    type: 'golden_mimic',
    weight: 0,  // 직접 드랍 테이블에서 나오지 않음 (별도 배치)
    rare: true,
    isMimic: true,
  };
}


// --- 마블 경로 생성 시 미믹 배치 ---
// marblePath: 마블 경로 배열 (이미 드랍이 할당된 상태)
// 반환: 수정된 marblePath
export function placeMimicsOnPath(marblePath) {
  const mimicChance = GOLDEN_MIMIC.marble.spawnChance;
  const maxMimics = GOLDEN_MIMIC.marble.maxCount;
  let mimicCount = 0;

  // 랜덤 배치
  for (let i = 0; i < marblePath.length && mimicCount < maxMimics; i++) {
    if (marblePath[i].drop.type === 'empty' || marblePath[i].drop.type === 'gold') {
      if (Math.random() < mimicChance) {
        marblePath[i].drop = createMimicTile();
        marblePath[i].isMimic = true;
        mimicCount++;
      }
    }
  }

  // 최소 1개 보장
  if (GOLDEN_MIMIC.marble.guaranteeOne && mimicCount === 0) {
    // 빈 타일 또는 금화 타일 중 랜덤 하나를 미믹으로 교체
    const candidates = marblePath.filter(t =>
      !t.isMimic && (t.drop.type === 'empty' || t.drop.type === 'gold')
    );
    if (candidates.length > 0) {
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      target.drop = createMimicTile();
      target.isMimic = true;
    }
  }

  return marblePath;
}


// --- 희귀 아이템 근처 도착 감지 ---
// heroPos: 현재 영웅 위치 인덱스
// marblePath: 마블 경로 배열
// 반환: 근처에 미믹이 있으면 미믹 타일 정보, 없으면 null
export function checkMimicNearby(heroPos, marblePath) {
  const dist = GOLDEN_MIMIC.marble.triggerDistance;
  for (let offset = 1; offset <= dist; offset++) {
    const checkIdx = (heroPos + offset) % marblePath.length;
    const tile = marblePath[checkIdx];
    if (tile && tile.isMimic && !tile.collected) {
      return { tile, index: checkIdx, distance: offset };
    }
  }
  return null;
}


// --- 아이템 드랍 → 인벤토리 자석 흡수 연출 설정 ---
export const DROP_ANIMATION = {
  // 모든 스테이지1 아이템: 드랍 즉시 인벤토리로 빨려감
  magnetPull: {
    enabled: true,
    // 아이템이 떠오른 후 인벤토리 방향으로 가속하며 빨려감
    floatUpDuration: 200,         // ms — 잠깐 위로 뜬 후
    pullDuration: 500,            // ms — 인벤토리로 빨려가는 시간
    pullEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // 빨려가면서 크기 줄어듦
    scaleStart: 1.2,
    scaleEnd: 0.3,
    // 빨려가면서 투명해짐
    opacityEnd: 0,
    // 도착 시 인벤토리 슬롯 반짝임
    slotFlashDuration: 300,
    slotFlashColor: 'rgba(103, 232, 249, 0.6)',
  },
  // 황금 미믹 보상: 더 화려한 연출
  mimicCollect: {
    burstParticles: 12,           // 황금 파티클 수
    burstColor: '#fbbf24',
    screenShake: true,
    screenShakeDuration: 200,
    collectDelay: 500,            // 폭발 연출 후 수집 시작
  },
};
