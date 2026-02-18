/**
 * drag-tutorial.js — 캔디 드래그 튜토리얼 시스템
 * 각 단계마다 2페이즈: ① 글 설명 카드 → ② 타일 보드 시각 데모
 * 3단계: 밑→위 / 좌→우 / 매치 완성
 */

const TUTORIAL_KEY = 'monglebel_drag_tutorial_seen';

const G = ['🧚', '🍄', '💎', '⭐', '🌈', '🍬']; // 0~5

// ══════════════════════════════════════════
// 3단계 × 2페이즈 (글 설명 + 시각 데모)
// ══════════════════════════════════════════
const STEPS = [
  {
    // ──── Step 1: 밑에서 위로 ────
    text: {
      emoji: '👆',
      title: '보석 드래그 방법',
      lines: [
        '보석을 <b>길~게 꾹</b> 누르면',
        '손가락에 보석이 <b>붙습니다!</b>',
        '',
        '붙은 채로 <b>상하좌우 + 대각선</b>',
        '<b>8방향</b> 어디든 이동 가능!',
        '',
        '지나가는 칸의 보석과 <b>자동 교환</b>돼요',
      ],
    },
    demo: {
      title: '⬆️ 밑에서 위로 끝까지!',
      board: [
        [0, 1, 2, 3, 4],
        [3, 4, 0, 5, 1],
        [5, 2, 1, 4, 3],
        [1, 3, 5, 0, 2],
        [4, 0, 3, 2, 5],
      ],
      handPath: [
        { r: 4, c: 2, delay: 800 },
        { r: 3, c: 2, delay: 400 },
        { r: 2, c: 2, delay: 400 },
        { r: 1, c: 2, delay: 400 },
        { r: 0, c: 2, delay: 400 },
      ],
      hintTexts: [
        '👆 맨 아래를 꾹!',
        '⬆️ 위로! 보석이 교환!',
        '⬆️ 계속 위로!',
        '⬆️ 멈추지 말고!',
        '⬆️ 끝까지 도착!',
      ],
      endHint: '🎉 끝에서 끝까지 드래그 성공!',
      matchCells: null,
    },
  },
  {
    // ──── Step 2: 좌에서 우로 ────
    text: {
      emoji: '↔️',
      title: '가로 드래그!',
      lines: [
        '이번엔 <b>옆으로</b> 드래그!',
        '왼쪽 끝에서 오른쪽 끝까지!',
        '',
        '드래그 시간은 <b>8초</b>!',
        '8초 안에 자유롭게 움직이세요',
        '',
        '<b>대각선</b>도 가능해요!',
      ],
    },
    demo: {
      title: '➡️ 좌에서 우로 끝까지!',
      board: [
        [2, 4, 1, 0, 3],
        [0, 5, 3, 1, 4],
        [3, 1, 4, 5, 2],
        [5, 0, 2, 3, 1],
        [1, 3, 5, 4, 0],
      ],
      handPath: [
        { r: 2, c: 0, delay: 800 },
        { r: 2, c: 1, delay: 400 },
        { r: 2, c: 2, delay: 400 },
        { r: 2, c: 3, delay: 400 },
        { r: 2, c: 4, delay: 400 },
      ],
      hintTexts: [
        '👆 왼쪽 끝을 꾹!',
        '➡️ 오른쪽으로! 교환!',
        '➡️ 계속!',
        '➡️ 거의 다!',
        '➡️ 끝까지 도착!',
      ],
      endHint: '🎉 끝에서 끝까지 성공!',
      matchCells: null,
    },
  },
  {
    // ──── Step 3: 매치 만들기 ────
    text: {
      emoji: '✨',
      title: '매치를 만들자!',
      lines: [
        '같은 색 보석 <b>3개 이상</b>',
        '가로 또는 세로로 나란히 놓으면',
        '<b>매치 성공!</b> 보석이 터져요!',
        '',
        '한 번의 드래그로',
        '<b>여러 매치 = 콤보!</b>',
        '',
        '콤보가 높을수록 보상 UP!',
      ],
    },
    demo: {
      title: '✨ ⭐ 3개를 나란히!',
      // row2=[⭐,💎,⭐,...] row3=[🍄,⭐,...] → (3,1)⭐를 (2,1)로 올리면 ⭐⭐⭐
      board: [
        [0, 1, 2, 5, 4],
        [2, 5, 0, 1, 3],
        [3, 2, 3, 0, 5],
        [1, 3, 5, 4, 0],
        [4, 0, 1, 2, 3],
      ],
      handPath: [
        { r: 3, c: 1, delay: 800 },
        { r: 2, c: 1, delay: 600 },
      ],
      hintTexts: [
        '👆 이 ⭐을 위로 올리면...',
        '⬆️ ⭐⭐⭐ 가로 매치!',
      ],
      endHint: '💥 매치 성공! 보석이 터져요!',
      matchCells: [[2, 0], [2, 1], [2, 2]],
    },
  },
];

// ══════════════════════════════════════════
// 메인 함수
// ══════════════════════════════════════════
export function showDragTutorial() {
  return new Promise((resolve) => {
    if (localStorage.getItem(TUTORIAL_KEY)) { resolve(); return; }

    let stepIdx = 0;   // 0~2 (3단계)
    let phase = 'text'; // 'text' | 'demo'
    let timeouts = [];

    const overlay = document.createElement('div');
    overlay.className = 'dtut-overlay';
    injectStyles();

    function clear() {
      timeouts.forEach(t => clearTimeout(t));
      timeouts = [];
    }

    function later(fn, ms) {
      const id = setTimeout(fn, ms);
      timeouts.push(id);
      return id;
    }

    // ── 텍스트 설명 카드 ──
    function showTextCard() {
      clear();
      phase = 'text';
      const s = STEPS[stepIdx].text;
      const totalPages = STEPS.length * 2; // 글+데모 합계
      const pageNum = stepIdx * 2 + 1;

      overlay.innerHTML = `
        <div class="dtut-card">
          <div class="dtut-progress">${pageNum} / ${totalPages}</div>
          <div class="dtut-text-emoji">${s.emoji}</div>
          <div class="dtut-title">${s.title}</div>
          <div class="dtut-text-body">${s.lines.join('<br>')}</div>
          <button class="btn btn-primary dtut-btn" id="dtut-next">시각 예시 보기 →</button>
        </div>
      `;

      overlay.querySelector('#dtut-next').onclick = () => showDemoBoard();
    }

    // ── 시각 데모 보드 ──
    function showDemoBoard() {
      clear();
      phase = 'demo';
      const step = STEPS[stepIdx].demo;
      const size = step.board.length;
      const cellPx = 52;
      const gap = 3;
      const totalPages = STEPS.length * 2;
      const pageNum = stepIdx * 2 + 2;

      let boardHtml = '';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          boardHtml += `<div class="dtut-cell" id="dtut-${r}-${c}">${G[step.board[r][c]]}</div>`;
        }
      }

      const isLast = stepIdx >= STEPS.length - 1;

      overlay.innerHTML = `
        <div class="dtut-card">
          <div class="dtut-progress">${pageNum} / ${totalPages}</div>
          <div class="dtut-title">${step.title}</div>
          <div class="dtut-board-wrap">
            <div class="dtut-board" style="
              display:grid;
              grid-template-columns:repeat(${size},${cellPx}px);
              grid-template-rows:repeat(${size},${cellPx}px);
              gap:${gap}px;position:relative;
            ">
              ${boardHtml}
              <div class="dtut-hand" id="dtut-hand">👆</div>
            </div>
          </div>
          <div class="dtut-hint" id="dtut-hint"></div>
          <button class="btn btn-primary dtut-btn" id="dtut-next">
            ${isLast ? '게임 시작!' : '다음 →'}
          </button>
        </div>
      `;

      overlay.querySelector('#dtut-next').onclick = () => {
        clear();
        stepIdx++;
        if (stepIdx >= STEPS.length) {
          localStorage.setItem(TUTORIAL_KEY, '1');
          overlay.classList.remove('show');
          later(() => { overlay.remove(); resolve(); }, 300);
        } else {
          showTextCard();
        }
      };

      runAnimation(step, cellPx, gap);
    }

    // ── 손가락 드래그 애니메이션 엔진 ──
    function runAnimation(step, cellPx, gap) {
      const hand = overlay.querySelector('#dtut-hand');
      const hint = overlay.querySelector('#dtut-hint');
      if (!hand) return;

      const path = step.handPath;
      const live = step.board.map(row => [...row]);
      let idx = 0;
      let activeR = -1, activeC = -1;

      function pos(r, c) {
        return {
          x: c * (cellPx + gap) + cellPx / 2 - 14,
          y: r * (cellPx + gap) + cellPx / 2 - 14,
        };
      }

      function setCell(r, c, gi) {
        const el = overlay.querySelector(`#dtut-${r}-${c}`);
        if (el) el.textContent = G[gi];
      }

      function addC(r, c, cls) {
        const el = overlay.querySelector(`#dtut-${r}-${c}`);
        if (el) el.classList.add(cls);
      }

      function rmC(r, c, cls) {
        const el = overlay.querySelector(`#dtut-${r}-${c}`);
        if (el) el.classList.remove(cls);
      }

      function clearAll() {
        overlay.querySelectorAll('.dtut-cell').forEach(el => {
          el.classList.remove('dtut-pick', 'dtut-trail', 'dtut-match', 'dtut-explode', 'dtut-active', 'dtut-empty');
        });
      }

      function tick() {
        if (idx >= path.length) {
          if (activeR >= 0) rmC(activeR, activeC, 'dtut-active');
          hand.classList.add('dtut-hand-release');

          if (step.matchCells) {
            if (hint) hint.textContent = step.endHint;
            later(() => {
              step.matchCells.forEach(([r, c]) => addC(r, c, 'dtut-match'));
              later(() => {
                step.matchCells.forEach(([r, c]) => addC(r, c, 'dtut-explode'));
                later(() => restart(), 1400);
              }, 900);
            }, 500);
          } else {
            if (hint) hint.textContent = step.endHint;
            later(() => restart(), 1800);
          }
          return;
        }

        const node = path[idx];
        const p = pos(node.r, node.c);
        hand.style.transform = `translate(${p.x}px, ${p.y}px)`;

        if (hint && step.hintTexts && step.hintTexts[idx]) {
          hint.textContent = step.hintTexts[idx];
        }

        if (idx === 0) {
          hand.classList.remove('dtut-hand-release');
          hand.classList.add('dtut-hand-press');
          addC(node.r, node.c, 'dtut-pick');
          addC(node.r, node.c, 'dtut-empty');
          activeR = node.r; activeC = node.c;
        } else {
          hand.classList.remove('dtut-hand-press');
          hand.classList.add('dtut-hand-drag');
          const prev = path[idx - 1];

          if (activeR >= 0) rmC(activeR, activeC, 'dtut-active');

          const temp = live[node.r][node.c];
          live[node.r][node.c] = live[prev.r][prev.c];
          live[prev.r][prev.c] = temp;
          setCell(node.r, node.c, live[node.r][node.c]);
          setCell(prev.r, prev.c, live[prev.r][prev.c]);

          rmC(prev.r, prev.c, 'dtut-empty');
          rmC(prev.r, prev.c, 'dtut-pick');
          addC(prev.r, prev.c, 'dtut-trail');
          addC(node.r, node.c, 'dtut-empty');
          addC(node.r, node.c, 'dtut-active');
          activeR = node.r; activeC = node.c;
        }

        idx++;
        later(tick, node.delay);
      }

      function restart() {
        clearAll();
        idx = 0;
        activeR = -1; activeC = -1;
        for (let r = 0; r < step.board.length; r++) {
          for (let c = 0; c < step.board[r].length; c++) {
            live[r][c] = step.board[r][c];
            setCell(r, c, step.board[r][c]);
          }
        }
        hand.classList.remove('dtut-hand-press', 'dtut-hand-drag', 'dtut-hand-release');
        const s = pos(path[0].r, path[0].c);
        hand.style.transform = `translate(${s.x}px, ${s.y}px)`;
        later(tick, 900);
      }

      const s = pos(path[0].r, path[0].c);
      hand.style.transform = `translate(${s.x}px, ${s.y}px)`;
      later(tick, 700);
    }

    // ── 시작 ──
    showTextCard();
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
  });
}

// ══════════════════════════════════════════
// 스타일 삽입 (1회)
// ══════════════════════════════════════════
function injectStyles() {
  if (document.getElementById('dtut-style')) return;
  const style = document.createElement('style');
  style.id = 'dtut-style';
  style.textContent = `
    .dtut-overlay {
      position:fixed;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.88);z-index:9500;
      display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity 0.3s;
    }
    .dtut-overlay.show { opacity:1; }

    .dtut-card {
      background:linear-gradient(135deg,#1a1a3e,#2a1a4e);
      border-radius:20px;padding:22px 18px;
      max-width:360px;width:92%;text-align:center;
      border:2px solid rgba(255,215,0,0.4);
      box-shadow:0 0 50px rgba(255,215,0,0.12);
    }
    .dtut-progress { font-size:11px;color:#666;letter-spacing:2px;margin-bottom:4px; }
    .dtut-title { font-size:22px;font-weight:bold;color:#FFD700;margin-bottom:8px; }

    /* ── 텍스트 페이즈 ── */
    .dtut-text-emoji {
      font-size:56px;margin-bottom:8px;
      animation:dtTextBounce 1.5s ease-in-out infinite;
    }
    @keyframes dtTextBounce {
      0%,100% { transform:scale(1); }
      50% { transform:scale(1.15); }
    }
    .dtut-text-body {
      font-size:15px;color:#ddd;line-height:1.8;
      margin-bottom:18px;text-align:left;padding:0 10px;
    }
    .dtut-text-body b { color:#7df;font-weight:bold; }

    /* ── 데모 페이즈 ── */
    .dtut-board-wrap {
      display:flex;justify-content:center;margin-bottom:8px;
    }
    .dtut-board {
      background:rgba(0,0,0,0.45);border-radius:12px;padding:6px;
      position:relative;overflow:visible;
    }

    .dtut-cell {
      display:flex;align-items:center;justify-content:center;
      font-size:26px;border-radius:8px;
      background:rgba(30,30,55,0.95);
      border:2px solid rgba(255,255,255,0.12);
      transition:all 0.28s ease;
      user-select:none;
    }
    .dtut-cell.dtut-pick {
      border-color:#FFD700;
      box-shadow:0 0 18px rgba(255,215,0,0.8);
      transform:scale(1.18);z-index:2;
    }
    .dtut-cell.dtut-trail {
      border-color:#7df;
      box-shadow:0 0 14px rgba(119,221,255,0.6);
      background:rgba(119,221,255,0.15);
    }
    .dtut-cell.dtut-empty {
      opacity:0.35;
      border:2px dashed rgba(255,215,0,0.5);
      background:rgba(255,215,0,0.05);
    }
    .dtut-cell.dtut-active {
      border-color:#FFD700;
      box-shadow:0 0 20px rgba(255,215,0,0.8);
      transform:scale(1.1);z-index:2;
      opacity:1;
    }
    .dtut-cell.dtut-match {
      border-color:#ff6b6b;
      box-shadow:0 0 22px rgba(255,107,107,0.9);
      animation:dtPulse 0.45s ease infinite alternate;
    }
    .dtut-cell.dtut-explode {
      animation:dtExplode 0.6s ease forwards;
    }
    @keyframes dtPulse {
      from { transform:scale(1); }
      to   { transform:scale(1.15); }
    }
    @keyframes dtExplode {
      0%   { transform:scale(1.15);opacity:1; }
      40%  { transform:scale(1.5);opacity:0.6;filter:brightness(2); }
      100% { transform:scale(0);opacity:0; }
    }

    .dtut-hand {
      position:absolute;top:0;left:0;
      font-size:30px;z-index:10;
      pointer-events:none;
      transition:transform 0.38s cubic-bezier(0.25,0.8,0.25,1);
      filter:drop-shadow(0 3px 8px rgba(0,0,0,0.6));
    }
    .dtut-hand.dtut-hand-press {
      animation:dtPress 0.5s ease;
      filter:drop-shadow(0 0 14px rgba(255,215,0,0.7));
    }
    .dtut-hand.dtut-hand-drag {
      filter:drop-shadow(0 4px 14px rgba(255,215,0,0.5));
    }
    .dtut-hand.dtut-hand-release {
      opacity:0.3;transition:opacity 0.4s;
    }
    @keyframes dtPress {
      0%   { transform:scale(1); }
      50%  { transform:scale(1.3); }
      100% { transform:scale(1); }
    }

    .dtut-hint {
      font-size:14px;color:#FFD700;min-height:22px;
      margin-bottom:10px;font-weight:bold;
    }
    .dtut-btn {
      font-size:16px;padding:10px 36px;
      border-radius:12px;cursor:pointer;
    }
  `;
  document.head.appendChild(style);
}

/** 튜토리얼 본 적 있는지 */
export function hasDragTutorialSeen() {
  return !!localStorage.getItem(TUTORIAL_KEY);
}

/** 튜토리얼 리셋 (디버그용) */
export function resetDragTutorial() {
  localStorage.removeItem(TUTORIAL_KEY);
}

export default { showDragTutorial, hasDragTutorialSeen, resetDragTutorial };
