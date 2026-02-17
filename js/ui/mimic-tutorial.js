// ====================================================
// 황금 미믹 튜토리얼 시스템
// 마블 보드 위에서 미믹을 직접 보면서 요정이 소개
// ====================================================
import { GOLDEN_MIMIC } from '../data/golden-mimic-config.js';

const TUTORIAL_KEY = 'monglebel_mimic_tutorial_seen';

// 튜토리얼을 이미 봤는지 확인
export function hasMimicTutorialSeen() {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; }
  catch { return false; }
}

function markMimicTutorialSeen() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); }
  catch { /* ignore */ }
}

// ====================================================
// 마블 보드 인라인 튜토리얼 (보드 아래 영역에 렌더링)
// 마블 보드가 보이는 상태에서 미믹 타일이 반짝이며
// 요정이 아래에서 말풍선으로 소개
// ====================================================
export function showMimicTutorialOnBoard(targetArea) {
  return new Promise((resolve) => {
    if (hasMimicTutorialSeen()) {
      resolve();
      return;
    }

    // 보드 위 미믹 타일에 스포트라이트 강조 효과 추가
    document.querySelectorAll('.mimic-tile').forEach(el => {
      el.classList.add('mimic-spotlight');
    });

    // 단계 데이터
    const steps = [
      {
        icon: GOLDEN_MIMIC.emoji,
        iconAnim: '',
        title: '👑 황금 미믹 발견!',
        desc: '마블 보드 위에 <span style="color:var(--gold);font-weight:700;">황금빛으로 빛나는 타일</span>이 보이나요?',
        fairy: '저건... 황금 미믹이에요! 엄청난 보물을 숨기고 있대요!',
        btn: '다음 →',
        btnClass: 'btn-gold',
      },
      {
        icon: GOLDEN_MIMIC.emoji,
        iconAnim: 'animation:mimicGlow 0.8s infinite alternate;',
        title: '🎲 미믹을 잡는 방법',
        desc: '이동 후 미믹 근처에 멈추면<br><span style="color:var(--gold);font-weight:700;">보너스 주사위</span>를 굴릴 수 있어요!',
        fairy: '미믹을 지나가기만 해도 보물을 얻을 수 있어요! 놓치지 마세요~',
        btn: '다음 →',
        btnClass: 'btn-gold',
      },
      {
        icon: '',
        rewards: true,
        title: '💎 미믹의 보상',
        desc: '황금 미믹은 <span style="color:var(--gold);">대량의 금화</span>, <span style="color:var(--purple);">희귀 장비</span>, <span style="color:var(--cyan);">정령 파츠</span>를 줘요!',
        fairy: '전투에서도 미믹이 나타나요! 하지만 빨리 잡아야... 도망가거든요! 🏃',
        btn: '출발! 🧚',
        btnClass: 'btn-primary btn-lg',
      },
    ];

    let currentStep = 0;

    function renderStep() {
      const s = steps[currentStep];
      const isLast = currentStep === steps.length - 1;

      let iconHtml = '';
      if (s.rewards) {
        iconHtml = `
          <div class="mimic-board-rewards">
            <span class="mimic-reward-chip">💰 금화</span>
            <span class="mimic-reward-chip">⚔️ 레어 장비</span>
            <span class="mimic-reward-chip">💠 정령 파츠</span>
          </div>
        `;
      } else {
        iconHtml = `<div class="mimic-board-icon" style="${s.iconAnim}">${s.icon}</div>`;
      }

      targetArea.innerHTML = `
        <div class="mimic-board-tutorial" style="animation:slideUp .3s ease-out;">
          ${iconHtml}
          <div class="mimic-board-title">${s.title}</div>
          <div class="mimic-board-desc">${s.desc}</div>
          <div class="mimic-board-fairy-row">
            <span class="hero-fairy" style="font-size:26px;">🧚</span>
            <div class="mimic-board-bubble">${s.fairy}</div>
          </div>
          <button class="btn ${s.btnClass} touch-btn" id="mimic-tut-btn"
            style="${isLast ? 'animation:pulse 1.2s infinite;' : ''}">
            <span class="touch-icon">👆</span> ${s.btn}
          </button>
          <div class="mimic-board-dots">
            ${steps.map((_, i) => `<span class="mimic-dot${i === currentStep ? ' active' : ''}"></span>`).join('')}
          </div>
        </div>
      `;

      targetArea.querySelector('#mimic-tut-btn').onclick = () => {
        if (isLast) {
          markMimicTutorialSeen();
          // 스포트라이트 제거
          document.querySelectorAll('.mimic-spotlight').forEach(el => {
            el.classList.remove('mimic-spotlight');
          });
          targetArea.innerHTML = '';
          resolve();
        } else {
          currentStep++;
          renderStep();
        }
      };
    }

    renderStep();
  });
}

// ====================================================
// 전투 미믹 미니 알림 (전투 중 첫 등장 시)
// ====================================================
const COMBAT_MIMIC_KEY = 'monglebel_combat_mimic_seen';

export function showCombatMimicAlert() {
  try {
    if (localStorage.getItem(COMBAT_MIMIC_KEY) === '1') return;
    localStorage.setItem(COMBAT_MIMIC_KEY, '1');
  } catch { return; }

  const alert = document.createElement('div');
  alert.className = 'mimic-combat-alert';
  alert.innerHTML = `
    <span style="font-size:24px;">${GOLDEN_MIMIC.emoji}</span>
    <div>
      <div style="font-weight:700;color:var(--gold);">황금 미믹 출현!</div>
      <div style="font-size:11px;color:var(--text-secondary);">빨리 잡으세요! 8초 후 도망갑니다!</div>
    </div>
  `;
  document.body.appendChild(alert);
  setTimeout(() => {
    alert.classList.add('alert-fadeout');
    setTimeout(() => alert.remove(), 500);
  }, 3000);
}
