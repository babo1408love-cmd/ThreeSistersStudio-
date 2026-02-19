/**
 * wave-scaling-config.js — 시간대별 몹 웨이브 스케일링 시스템
 *
 * 핵심 설계:
 *   - 아이템 드롭률은 몹 한 마리당 항상 동일 (DROP_CHANCE_PER_MOB)
 *   - 시간대에 따라 몹 수만 변화
 *   - 초반: 몹 적음 → 아이템 상대적으로 풍족 (입문 보상감)
 *   - 후반: 몹 넘침 → 아이템 상대적으로 귀함 (긴장감)
 */

// ── 시간대별 몹 수 배율 ──
// { until: 경과 초, spawnMult: 몹 수 배율 }
// 마지막 항목은 until: Infinity (이후 계속 적용)
export const WAVE_PHASES = [
  { until: 20,       spawnMult: 0.5, label: '초반 적응기' },
  { until: 120,      spawnMult: 1.0, label: '중반 정상전투' },
  { until: Infinity, spawnMult: 1.5, label: '후반 대혼전' },
];

// ── 아이템 드롭 (몹 한 마리당 고정) ──
export const DROP_CHANCE_PER_MOB = 0.09;   // 9% — 시간대 무관 고정
export const BOSS_DROP_GUARANTEED = true;   // 보스는 항상 확정 드롭

/**
 * 현재 경과 시간(초)에 해당하는 페이즈를 반환
 * @param {number} elapsedSec — 전투 경과 초
 * @returns {{ spawnMult: number, label: string }}
 */
export function getWavePhase(elapsedSec) {
  for (const phase of WAVE_PHASES) {
    if (elapsedSec < phase.until) return phase;
  }
  return WAVE_PHASES[WAVE_PHASES.length - 1];
}

/**
 * 원본 적 배열에 spawnMult를 적용하여 조정된 배열 반환
 * @param {Array} enemies — 원본 적 정의 배열
 * @param {number} spawnMult — 몹 수 배율
 * @returns {Array} 조정된 적 배열 (최소 1마리)
 */
export function applySpawnMult(enemies, spawnMult) {
  if (spawnMult === 1) return enemies;
  const count = Math.max(1, Math.round(enemies.length * spawnMult));
  if (count <= enemies.length) {
    return enemies.slice(0, count);
  }
  // 2배 이상: 기존 몹을 순환 복사
  const result = [...enemies];
  for (let i = enemies.length; i < count; i++) {
    result.push(enemies[i % enemies.length]);
  }
  return result;
}
