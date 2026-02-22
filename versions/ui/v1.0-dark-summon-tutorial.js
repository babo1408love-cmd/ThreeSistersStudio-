/**
 * summon-tutorial.js — 정령 소환 & 펫 진화 튜토리얼
 * 4단계 말풍선 튜토리얼 + 비교표
 * 첫 레전드 조각 획득 시 or 소환나무 첫 방문 시 트리거
 */
import GameState from '../core/game-state.js';
import { showToast } from './toast.js';

const TUTORIAL_STEPS = [
  {
    title: '🌳 정령 소환 복습',
    lines: [
      '조각 6개를 모으면 정령을 소환할 수 있어요! 🌳',
      '정령은 커먼~에픽 등급이 랜덤으로 정해져요.',
      '정령은 한 판만 도와주고 소환나무로 돌아가요.',
    ],
    visual: '일반 조각 ×6 → ✨ → 정령 탄생!',
    emoji: '🌳',
  },
  {
    title: '✨ 레전드 조각!',
    lines: [
      '✨ 축하해요! 레전드 조각을 획득했어요! ✨',
      '레전드 조각은 특별해요. 일반 소환에서는 사용할 수 없어요.',
      '대신... 더 대단한 걸 만들 수 있답니다!',
    ],
    visual: '🟨 레전드 조각 반짝임',
    emoji: '🟨',
  },
  {
    title: '🐉 펫 진화!',
    lines: [
      '🐉 레전드 조각 6개를 모으면 \'펫 진화\'를 할 수 있어요!',
      '펫은 정령과 달라요:',
      '  ● 정령: 한 판 도움 → 귀환',
      '  ● 펫: 영구 동반자! 항상 함께해요! 💕',
      '펫은 전투에 참여하지 않지만 강력한 패시브 효과를 줘요.',
    ],
    visual: '레전드 조각 ×6 → 🌟진화!🌟 → 🐉 펫!',
    emoji: '🐉',
  },
  {
    title: '📋 정리',
    lines: [
      '정리하면:',
    ],
    table: `
┌──────────┬─────────────┬─────────────┐
│          │ 🌳 정령     │ 🐉 펫       │
├──────────┼─────────────┼─────────────┤
│ 재료     │ 일반조각 6개 │ 레전드조각 6개│
│ 등급     │ 커먼~에픽   │ 레전드 고정  │
│ 사용     │ 1판만 참전  │ 영구 장착!   │
│ 효과     │ 직접 공격   │ 패시브 버프  │
│ 사망     │ 나무로 귀환 │ 죽지 않음    │
└──────────┴─────────────┴─────────────┘`,
    closingLine: '레전드 조각을 모아서 멋진 펫을 만들어보세요! 🎉',
    emoji: '📋',
    reward: true,
  },
];

// 튜토리얼 본 적 있는지 체크
export function hasSummonTutorialSeen() {
  return GameState._summonTutorialSeen === true;
}

// 튜토리얼 표시
export function showSummonTutorial(onComplete) {
  if (hasSummonTutorialSeen()) {
    if (onComplete) onComplete();
    return;
  }

  let stepIdx = 0;

  function renderStep() {
    const step = TUTORIAL_STEPS[stepIdx];
    // Remove existing overlay
    const existing = document.querySelector('.summon-tutorial-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'summon-tutorial-overlay';
    overlay.style.cssText = `
      position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;
      background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;
      animation:fadeIn 0.3s ease-out;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background:var(--bg-card,#1e2337);border-radius:16px;padding:clamp(16px, 5vw, 24px);
      max-width:360px;width:90%;text-align:center;border:2px solid var(--border-subtle,#333);
    `;

    // Title
    card.innerHTML = `
      <div style="font-size:var(--icon-xl);margin-bottom:clamp(4px, 1.5vw, 8px);">${step.emoji}</div>
      <div style="font-size:var(--label-lg);font-weight:700;color:var(--gold,#fbbf24);margin-bottom:clamp(8px, 2.5vw, 14px);">${step.title}</div>
    `;

    // Lines
    for (const line of step.lines) {
      const p = document.createElement('div');
      p.style.cssText = 'font-size:clamp(12px, 3.2vw, 15px);color:var(--text-secondary,#aaa);margin-bottom:clamp(4px, 1.2vw, 6px);text-align:left;padding:0 clamp(4px, 1.5vw, 8px);';
      p.textContent = line;
      card.appendChild(p);
    }

    // Visual
    if (step.visual) {
      const vis = document.createElement('div');
      vis.style.cssText = 'font-size:var(--label-md);color:var(--green,#86efac);margin:clamp(8px, 2.5vw, 14px) 0;padding:clamp(4px, 1.5vw, 8px);background:rgba(134,239,172,0.1);border-radius:8px;';
      vis.textContent = step.visual;
      card.appendChild(vis);
    }

    // Table
    if (step.table) {
      const pre = document.createElement('pre');
      pre.style.cssText = 'font-size:var(--label-sm);color:var(--text-secondary,#aaa);text-align:left;margin:clamp(8px, 2.5vw, 14px) 0;line-height:1.4;overflow-x:auto;';
      pre.textContent = step.table;
      card.appendChild(pre);
    }

    // Closing line
    if (step.closingLine) {
      const cl = document.createElement('div');
      cl.style.cssText = 'font-size:clamp(12px, 3.2vw, 15px);color:var(--gold,#fbbf24);margin:clamp(4px, 1.5vw, 8px) 0;font-weight:700;';
      cl.textContent = step.closingLine;
      card.appendChild(cl);
    }

    // Progress
    const progress = document.createElement('div');
    progress.style.cssText = 'font-size:var(--label-sm);color:var(--text-muted,#666);margin:clamp(8px, 2.5vw, 14px) 0 clamp(4px, 1.5vw, 8px);';
    progress.textContent = `${stepIdx + 1} / ${TUTORIAL_STEPS.length}`;
    card.appendChild(progress);

    // Button
    const isLast = stepIdx === TUTORIAL_STEPS.length - 1;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = isLast ? '✅ 튜토리얼 완료!' : '다음 →';
    btn.style.cssText = 'margin-top:8px;';
    btn.onclick = () => {
      if (isLast) {
        overlay.remove();
        GameState._summonTutorialSeen = true;

        // 보상: 다이아 30개
        if (step.reward) {
          GameState.addGold(300);
          showToast('🎁 튜토리얼 보상: 💰 300골드!');
        }

        if (onComplete) onComplete();
      } else {
        stepIdx++;
        renderStep();
      }
    };
    card.appendChild(btn);

    // Skip button
    const skip = document.createElement('button');
    skip.className = 'btn btn-secondary btn-sm';
    skip.textContent = '건너뛰기';
    skip.style.cssText = 'margin-top:clamp(4px, 1.5vw, 8px);margin-left:clamp(4px, 1.5vw, 8px);font-size:var(--label-md);';
    skip.onclick = () => {
      overlay.remove();
      GameState._summonTutorialSeen = true;
      if (onComplete) onComplete();
    };
    card.appendChild(skip);

    overlay.appendChild(card);
    document.getElementById('app').appendChild(overlay);
  }

  renderStep();
}
