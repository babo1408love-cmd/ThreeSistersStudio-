// ============================================================
// 🀄 몽글벨 - 사천성(Shisen-sho) 게임 도구 (shisen-toolkit.js)
// ============================================================
// 복사: monglebel/js/games/shisen-toolkit.js
// Claude Code가 사천성 게임을 만들 때 이 파일을 import해서 사용
// ============================================================

// ═══════════════════════════════════════════
// 도구 1: 보드 생성기
// ═══════════════════════════════════════════

// 사용할 타일 이모지 (15종, 확장 가능)
export const SHISEN_TILES = [
  { id: 0,  emoji: '🍎', name: '사과' },
  { id: 1,  emoji: '🍊', name: '오렌지' },
  { id: 2,  emoji: '🍋', name: '레몬' },
  { id: 3,  emoji: '🍇', name: '포도' },
  { id: 4,  emoji: '🍓', name: '딸기' },
  { id: 5,  emoji: '🍑', name: '복숭아' },
  { id: 6,  emoji: '🍒', name: '체리' },
  { id: 7,  emoji: '🥝', name: '키위' },
  { id: 8,  emoji: '🍌', name: '바나나' },
  { id: 9,  emoji: '🫐', name: '블루베리' },
  { id: 10, emoji: '🥭', name: '망고' },
  { id: 11, emoji: '🍍', name: '파인애플' },
  { id: 12, emoji: '🥥', name: '코코넛' },
  { id: 13, emoji: '🍈', name: '멜론' },
  { id: 14, emoji: '🍉', name: '수박' },
  // 추가 타일 (큰 보드용)
  { id: 15, emoji: '🌸', name: '벚꽃' },
  { id: 16, emoji: '🌺', name: '히비스커스' },
  { id: 17, emoji: '🌻', name: '해바라기' },
  { id: 18, emoji: '🌷', name: '튤립' },
  { id: 19, emoji: '💎', name: '보석' },
  { id: 20, emoji: '⭐', name: '별' },
  { id: 21, emoji: '🔮', name: '수정구' },
  { id: 22, emoji: '🎃', name: '호박' },
  { id: 23, emoji: '🦋', name: '나비' },
  { id: 24, emoji: '🐞', name: '무당벌레' },
];

/**
 * 보드 생성
 * @param {number} cols - 가로 타일 수 (기본 10, 짝수여야 함)
 * @param {number} rows - 세로 타일 수 (기본 6, 총 타일수가 짝수여야 함)
 * @returns {object} { board, cols, rows }
 *
 * board[y][x] = 타일ID (0~24) 또는 -1(빈칸)
 * 
 * ⚠️ 핵심: cols × rows는 반드시 짝수!
 * ⚠️ 핵심: 사용 타일 종류 = (cols × rows) / 2
 */
export function generateShisenBoard(cols = 10, rows = 6) {
  const totalCells = cols * rows;
  if (totalCells % 2 !== 0) {
    throw new Error('총 타일 수가 짝수여야 합니다!');
  }

  const pairCount = totalCells / 2;
  const tileTypes = Math.min(pairCount, SHISEN_TILES.length);

  // 타일 쌍 만들기
  const tiles = [];
  for (let i = 0; i < pairCount; i++) {
    const tileId = i % tileTypes;
    tiles.push(tileId, tileId); // 같은 타일 2개씩
  }

  // 셔플 (Fisher-Yates)
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }

  // 2D 보드 생성
  const board = [];
  let idx = 0;
  for (let y = 0; y < rows; y++) {
    board[y] = [];
    for (let x = 0; x < cols; x++) {
      board[y][x] = tiles[idx++];
    }
  }

  // 풀 수 있는지 확인, 안 되면 재생성
  if (!hasPossibleMatch(board, cols, rows)) {
    return generateShisenBoard(cols, rows); // 재귀 재생성
  }

  return { board, cols, rows };
}


// ═══════════════════════════════════════════
// 도구 2: 경로 탐색 알고리즘 ⭐핵심⭐
// ═══════════════════════════════════════════

/**
 * 두 타일 사이에 2번 이하 꺾는 경로가 있는지 확인
 * @param {number[][]} board - 2D 보드 (-1은 빈칸)
 * @param {number} cols - 가로 수
 * @param {number} rows - 세로 수
 * @param {number} x1 - 시작 x
 * @param {number} y1 - 시작 y
 * @param {number} x2 - 도착 x
 * @param {number} y2 - 도착 y
 * @returns {object|null} { path: [{x,y},...], turns: 0~2 } 또는 null
 *
 * ⚠️ 핵심 규칙:
 * 1. 같은 타일만 매칭 가능 (board[y1][x1] === board[y2][x2])
 * 2. 경로는 직선+꺾기로 구성, 최대 2번 꺾을 수 있음
 * 3. 경로 위에 다른 타일이 있으면 안 됨
 * 4. 보드 바깥(x=-1 또는 x=cols, y=-1 또는 y=rows)도 경로로 사용 가능!
 */
export function findPath(board, cols, rows, x1, y1, x2, y2) {
  // 같은 위치면 무시
  if (x1 === x2 && y1 === y2) return null;

  // 같은 타일인지 확인
  if (board[y1][x1] !== board[y2][x2]) return null;
  if (board[y1][x1] === -1) return null;

  // 1. 직선 연결 (0번 꺾기)
  const straight = _checkStraightLine(board, cols, rows, x1, y1, x2, y2);
  if (straight) return { path: straight, turns: 0 };

  // 2. 1번 꺾기 (L자형)
  const oneCorner = _checkOneCorner(board, cols, rows, x1, y1, x2, y2);
  if (oneCorner) return oneCorner;

  // 3. 2번 꺾기 (Z자형, U자형, ㄷ자형)
  const twoCorner = _checkTwoCorners(board, cols, rows, x1, y1, x2, y2);
  if (twoCorner) return twoCorner;

  return null;
}

// ─── 직선 체크 ───
function _checkStraightLine(board, cols, rows, x1, y1, x2, y2) {
  if (x1 === x2) {
    // 세로 직선
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY + 1; y < maxY; y++) {
      if (board[y][x1] !== -1) return null; // 장애물
    }
    // 경로 생성
    const path = [];
    for (let y = minY; y <= maxY; y++) path.push({ x: x1, y });
    return path;
  }

  if (y1 === y2) {
    // 가로 직선
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX + 1; x < maxX; x++) {
      if (board[y1][x] !== -1) return null; // 장애물
    }
    const path = [];
    for (let x = minX; x <= maxX; x++) path.push({ x, y: y1 });
    return path;
  }

  return null; // 직선이 아님
}

// ─── 셀이 비어있는지 (바깥도 OK) ───
function _isEmpty(board, cols, rows, x, y) {
  // 보드 바깥은 항상 빈칸 (사천성 규칙: 바깥 경로 허용)
  if (x < 0 || x >= cols || y < 0 || y >= rows) return true;
  return board[y][x] === -1;
}

// ─── 직선 통과 가능 체크 (시작/끝 제외) ───
function _canPassStraight(board, cols, rows, fx, fy, tx, ty) {
  if (fx === tx) {
    // 세로
    const minY = Math.min(fy, ty);
    const maxY = Math.max(fy, ty);
    for (let y = minY; y <= maxY; y++) {
      if (!_isEmpty(board, cols, rows, fx, y)) return false;
    }
    return true;
  }
  if (fy === ty) {
    // 가로
    const minX = Math.min(fx, tx);
    const maxX = Math.max(fx, tx);
    for (let x = minX; x <= maxX; x++) {
      if (!_isEmpty(board, cols, rows, x, fy)) return false;
    }
    return true;
  }
  return false;
}

// ─── 1번 꺾기 (L자) ───
function _checkOneCorner(board, cols, rows, x1, y1, x2, y2) {
  // 꺾는 점 2개 후보: (x1,y2) 와 (x2,y1)

  // 후보 1: (x1, y2)
  if (_isEmpty(board, cols, rows, x1, y2)) {
    // (x1,y1)→(x1,y2) 세로 직선 + (x1,y2)→(x2,y2) 가로 직선
    const vertOk = _canPassVertical(board, cols, rows, x1, y1, y2);
    const horizOk = _canPassHorizontal(board, cols, rows, y2, x1, x2);
    if (vertOk && horizOk) {
      return {
        path: _buildLPath(x1, y1, x1, y2, x2, y2),
        turns: 1,
      };
    }
  }

  // 후보 2: (x2, y1)
  if (_isEmpty(board, cols, rows, x2, y1)) {
    const horizOk = _canPassHorizontal(board, cols, rows, y1, x1, x2);
    const vertOk = _canPassVertical(board, cols, rows, x2, y1, y2);
    if (horizOk && vertOk) {
      return {
        path: _buildLPath(x1, y1, x2, y1, x2, y2),
        turns: 1,
      };
    }
  }

  return null;
}

// ─── 2번 꺾기 (Z/U/ㄷ자) ───
function _checkTwoCorners(board, cols, rows, x1, y1, x2, y2) {
  // 확장 범위: 보드 바깥 1칸까지 (-1 ~ cols, -1 ~ rows)

  // 가로선을 기준으로 스캔 (y = scanY인 수평선)
  for (let scanY = -1; scanY <= rows; scanY++) {
    // (x1, y1) → (x1, scanY) → (x2, scanY) → (x2, y2)
    //          세로        가로        세로
    if (scanY === y1 && scanY === y2) continue; // 이미 직선/1꺾기로 처리됨

    const corner1 = { x: x1, y: scanY };
    const corner2 = { x: x2, y: scanY };

    // corner1이 비어있어야 함 (시작점 자체는 제외)
    if (!(corner1.x === x1 && corner1.y === y1) && !_isEmpty(board, cols, rows, corner1.x, corner1.y)) continue;
    // corner2가 비어있어야 함 (도착점 자체는 제외)
    if (!(corner2.x === x2 && corner2.y === y2) && !_isEmpty(board, cols, rows, corner2.x, corner2.y)) continue;

    // 3개 직선 모두 통과 가능한지
    const seg1 = _canPassVerticalEx(board, cols, rows, x1, y1, scanY);
    const seg2 = _canPassHorizontalEx(board, cols, rows, scanY, x1, x2);
    const seg3 = _canPassVerticalEx(board, cols, rows, x2, scanY, y2);

    if (seg1 && seg2 && seg3) {
      return {
        path: _buildZPath(x1, y1, x1, scanY, x2, scanY, x2, y2),
        turns: 2,
      };
    }
  }

  // 세로선을 기준으로 스캔 (x = scanX인 수직선)
  for (let scanX = -1; scanX <= cols; scanX++) {
    // (x1, y1) → (scanX, y1) → (scanX, y2) → (x2, y2)
    //          가로        세로        가로
    if (scanX === x1 && scanX === x2) continue;

    const corner1 = { x: scanX, y: y1 };
    const corner2 = { x: scanX, y: y2 };

    if (!(corner1.x === x1 && corner1.y === y1) && !_isEmpty(board, cols, rows, corner1.x, corner1.y)) continue;
    if (!(corner2.x === x2 && corner2.y === y2) && !_isEmpty(board, cols, rows, corner2.x, corner2.y)) continue;

    const seg1 = _canPassHorizontalEx(board, cols, rows, y1, x1, scanX);
    const seg2 = _canPassVerticalEx(board, cols, rows, scanX, y1, y2);
    const seg3 = _canPassHorizontalEx(board, cols, rows, y2, scanX, x2);

    if (seg1 && seg2 && seg3) {
      return {
        path: _buildZPath(x1, y1, scanX, y1, scanX, y2, x2, y2),
        turns: 2,
      };
    }
  }

  return null;
}

// ─── 세로 통과 체크 (시작/끝점 제외, 바깥 허용) ───
function _canPassVertical(board, cols, rows, x, fromY, toY) {
  const minY = Math.min(fromY, toY) + 1;
  const maxY = Math.max(fromY, toY);
  for (let y = minY; y < maxY; y++) {
    if (!_isEmpty(board, cols, rows, x, y)) return false;
  }
  return true;
}

function _canPassHorizontal(board, cols, rows, y, fromX, toX) {
  const minX = Math.min(fromX, toX) + 1;
  const maxX = Math.max(fromX, toX);
  for (let x = minX; x < maxX; x++) {
    if (!_isEmpty(board, cols, rows, x, y)) return false;
  }
  return true;
}

// ─── 확장 통과 체크 (시작/끝점도 비어야 함, 시작점/끝점이 보드 내부일 때) ───
function _canPassVerticalEx(board, cols, rows, x, fromY, toY) {
  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);
  for (let y = minY; y <= maxY; y++) {
    // 시작점(fromY)과 끝점(toY)은 원본 타일이 있는 칸이므로 건너뜀
    if (y === fromY || y === toY) continue;
    if (!_isEmpty(board, cols, rows, x, y)) return false;
  }
  return true;
}

function _canPassHorizontalEx(board, cols, rows, y, fromX, toX) {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  for (let x = minX; x <= maxX; x++) {
    if (x === fromX || x === toX) continue;
    if (!_isEmpty(board, cols, rows, x, y)) return false;
  }
  return true;
}

// ─── 경로 빌더 ───
function _buildLPath(x1, y1, cx, cy, x2, y2) {
  const path = [{ x: x1, y: y1 }];
  // 시작→꺾는점
  if (x1 === cx) {
    const step = y1 < cy ? 1 : -1;
    for (let y = y1 + step; y !== cy; y += step) path.push({ x: x1, y });
  }
  path.push({ x: cx, y: cy });
  // 꺾는점→도착
  if (cx === x2) {
    const step = cy < y2 ? 1 : -1;
    for (let y = cy + step; y !== y2; y += step) path.push({ x: x2, y });
  } else {
    const step = cx < x2 ? 1 : -1;
    for (let x = cx + step; x !== x2; x += step) path.push({ x, y: y2 });
  }
  path.push({ x: x2, y: y2 });
  return path;
}

function _buildZPath(x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
  return [
    { x: x1, y: y1 },
    { x: cx1, y: cy1 },
    { x: cx2, y: cy2 },
    { x: x2, y: y2 },
  ];
}


// ═══════════════════════════════════════════
// 도구 3: 매칭 엔진
// ═══════════════════════════════════════════

/**
 * 두 타일 매칭 시도
 * @returns {object} { success, path, turns, message }
 */
export function tryMatch(board, cols, rows, x1, y1, x2, y2) {
  // 같은 위치
  if (x1 === x2 && y1 === y2) {
    return { success: false, path: null, turns: -1, message: '같은 타일입니다' };
  }

  // 빈칸 선택
  if (board[y1][x1] === -1 || board[y2][x2] === -1) {
    return { success: false, path: null, turns: -1, message: '빈칸입니다' };
  }

  // 다른 타일
  if (board[y1][x1] !== board[y2][x2]) {
    return { success: false, path: null, turns: -1, message: '다른 타일입니다' };
  }

  // 경로 찾기
  const result = findPath(board, cols, rows, x1, y1, x2, y2);
  if (!result) {
    return { success: false, path: null, turns: -1, message: '연결할 수 없습니다' };
  }

  return {
    success: true,
    path: result.path,
    turns: result.turns,
    message: result.turns === 0 ? '직선 연결!' : `${result.turns}번 꺾기 연결!`,
  };
}

/**
 * 매칭 성공 후 타일 제거
 */
export function removeTiles(board, x1, y1, x2, y2) {
  board[y1][x1] = -1;
  board[y2][x2] = -1;
}

/**
 * 보드가 비었는지 확인 (클리어 체크)
 */
export function isBoardClear(board, cols, rows) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (board[y][x] !== -1) return false;
    }
  }
  return true;
}


// ═══════════════════════════════════════════
// 도구 4: 힌트 시스템
// ═══════════════════════════════════════════

/**
 * 매칭 가능한 쌍이 있는지 확인
 */
export function hasPossibleMatch(board, cols, rows) {
  const match = findHint(board, cols, rows);
  return match !== null;
}

/**
 * 매칭 가능한 쌍 하나 찾기 (힌트용)
 * @returns {object|null} { x1, y1, x2, y2, path, turns }
 */
export function findHint(board, cols, rows) {
  // 같은 타일끼리 그룹화
  const groups = {};
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = board[y][x];
      if (tile === -1) continue;
      if (!groups[tile]) groups[tile] = [];
      groups[tile].push({ x, y });
    }
  }

  // 각 그룹에서 쌍 검사
  for (const tileId in groups) {
    const positions = groups[tileId];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const result = findPath(board, cols, rows, a.x, a.y, b.x, b.y);
        if (result) {
          return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, path: result.path, turns: result.turns };
        }
      }
    }
  }

  return null; // 매칭 가능한 쌍 없음
}

/**
 * 모든 매칭 가능한 쌍 찾기
 */
export function findAllHints(board, cols, rows) {
  const hints = [];
  const groups = {};
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = board[y][x];
      if (tile === -1) continue;
      if (!groups[tile]) groups[tile] = [];
      groups[tile].push({ x, y });
    }
  }

  for (const tileId in groups) {
    const positions = groups[tileId];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const result = findPath(board, cols, rows, a.x, a.y, b.x, b.y);
        if (result) {
          hints.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, turns: result.turns });
        }
      }
    }
  }

  return hints;
}


// ═══════════════════════════════════════════
// 도구 5: 셔플 시스템
// ═══════════════════════════════════════════

/**
 * 남은 타일 셔플 (매칭 불가 시 사용)
 * 위치는 유지하되 타일 값만 섞음
 * 셔플 후에도 매칭 가능하도록 보장
 */
export function shuffleBoard(board, cols, rows) {
  // 남은 타일 수집
  const remaining = [];
  const positions = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (board[y][x] !== -1) {
        remaining.push(board[y][x]);
        positions.push({ x, y });
      }
    }
  }

  // 최대 100번 시도
  for (let attempt = 0; attempt < 100; attempt++) {
    // 셔플
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    // 다시 배치
    for (let k = 0; k < positions.length; k++) {
      board[positions[k].y][positions[k].x] = remaining[k];
    }

    // 매칭 가능한지 확인
    if (hasPossibleMatch(board, cols, rows)) {
      return true; // 성공
    }
  }

  return false; // 100번 해도 안 됨 (매우 드묾)
}


// ═══════════════════════════════════════════
// 도구 6: 점수 계산기
// ═══════════════════════════════════════════

export const SCORING = {
  // 기본 점수
  MATCH_BASE: 100,
  // 꺾기 보너스 (적게 꺾을수록 높음)
  TURN_BONUS: { 0: 50, 1: 30, 2: 10 },
  // 콤보 보너스 (연속 매칭)
  COMBO_MULT: [1.0, 1.2, 1.5, 2.0, 2.5, 3.0],
  // 시간 보너스 (남은 시간 × 10)
  TIME_BONUS_PER_SEC: 10,
  // 힌트 사용 시 감점
  HINT_PENALTY: -50,
  // 셔플 사용 시 감점
  SHUFFLE_PENALTY: -100,

  calculate(turns, comboCount, timeLeftSec) {
    const base = this.MATCH_BASE;
    const turnBonus = this.TURN_BONUS[turns] || 0;
    const comboIdx = Math.min(comboCount, this.COMBO_MULT.length - 1);
    const comboMult = this.COMBO_MULT[comboIdx];
    return Math.floor((base + turnBonus) * comboMult);
  },
};


// ═══════════════════════════════════════════
// 도구 7: 난이도 설정
// ═══════════════════════════════════════════

export const DIFFICULTY = {
  easy: {
    name: '쉬움',
    cols: 8,
    rows: 4,
    timeLimit: 300,  // 5분
    tileTypes: 8,
    hints: 5,
    shuffles: 3,
  },
  normal: {
    name: '보통',
    cols: 10,
    rows: 6,
    timeLimit: 180,  // 3분
    tileTypes: 15,
    hints: 3,
    shuffles: 2,
  },
  hard: {
    name: '어려움',
    cols: 12,
    rows: 8,
    timeLimit: 120,  // 2분
    tileTypes: 24,
    hints: 1,
    shuffles: 1,
  },
  extreme: {
    name: '극한',
    cols: 14,
    rows: 8,
    timeLimit: 90,   // 1분 30초
    tileTypes: 25,
    hints: 0,
    shuffles: 0,
  },
};


// ═══════════════════════════════════════════
// 도구 8: 연결선 렌더링 가이드
// ═══════════════════════════════════════════

/**
 * 경로를 Canvas에 렌더링하기 위한 좌표 변환
 * @param {Array} path - [{x,y}, ...] 타일 좌표
 * @param {number} tileW - 타일 가로 크기 (px)
 * @param {number} tileH - 타일 세로 크기 (px)
 * @param {number} offsetX - 보드 시작 X (px)
 * @param {number} offsetY - 보드 시작 Y (px)
 * @returns {Array} [{px, py}, ...] 픽셀 좌표 (타일 중앙)
 */
export function pathToPixels(path, tileW, tileH, offsetX, offsetY) {
  return path.map(p => ({
    px: offsetX + p.x * tileW + tileW / 2,
    py: offsetY + p.y * tileH + tileH / 2,
  }));
}

/**
 * Canvas에 연결선 그리기
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} pixelPath - pathToPixels 결과
 * @param {string} color - 선 색상
 * @param {number} lineWidth - 선 두께
 * @param {number} alpha - 투명도 (0~1)
 */
export function drawConnectionLine(ctx, pixelPath, color = '#ffd700', lineWidth = 3, alpha = 0.8) {
  if (pixelPath.length < 2) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(pixelPath[0].px, pixelPath[0].py);
  for (let i = 1; i < pixelPath.length; i++) {
    ctx.lineTo(pixelPath[i].px, pixelPath[i].py);
  }
  ctx.stroke();

  // 꺾는 점에 동그라미
  ctx.fillStyle = color;
  for (let i = 1; i < pixelPath.length - 1; i++) {
    ctx.beginPath();
    ctx.arc(pixelPath[i].px, pixelPath[i].py, lineWidth + 1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Canvas에 연결선 애니메이션 그리기 (progress 0~1)
 */
export function drawConnectionLineAnimated(ctx, pixelPath, color, lineWidth, progress) {
  if (pixelPath.length < 2) return;

  ctx.save();
  ctx.strokeStyle = color || '#ffd700';
  ctx.lineWidth = lineWidth || 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 전체 길이 계산
  let totalLen = 0;
  for (let i = 1; i < pixelPath.length; i++) {
    const dx = pixelPath[i].px - pixelPath[i-1].px;
    const dy = pixelPath[i].py - pixelPath[i-1].py;
    totalLen += Math.sqrt(dx * dx + dy * dy);
  }

  const targetLen = totalLen * progress;
  let drawn = 0;

  ctx.beginPath();
  ctx.moveTo(pixelPath[0].px, pixelPath[0].py);

  for (let i = 1; i < pixelPath.length; i++) {
    const dx = pixelPath[i].px - pixelPath[i-1].px;
    const dy = pixelPath[i].py - pixelPath[i-1].py;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (drawn + segLen <= targetLen) {
      ctx.lineTo(pixelPath[i].px, pixelPath[i].py);
      drawn += segLen;
    } else {
      const remain = targetLen - drawn;
      const ratio = remain / segLen;
      const endX = pixelPath[i-1].px + dx * ratio;
      const endY = pixelPath[i-1].py + dy * ratio;
      ctx.lineTo(endX, endY);
      break;
    }
  }

  ctx.stroke();

  // 글로우 효과
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = (lineWidth || 3) * 3;
  ctx.stroke();

  ctx.restore();
}


// ═══════════════════════════════════════════
// 도구 9: 게임 상태 관리
// ═══════════════════════════════════════════

export class ShisenGame {
  constructor(difficulty = 'normal') {
    const config = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.difficulty = difficulty;
    this.config = config;

    // 보드 생성
    const { board, cols, rows } = generateShisenBoard(config.cols, config.rows);
    this.board = board;
    this.cols = cols;
    this.rows = rows;

    // 게임 상태
    this.selected = null;  // { x, y } 현재 선택된 타일
    this.score = 0;
    this.combo = 0;
    this.comboTimer = null;
    this.matchCount = 0;
    this.totalPairs = (cols * rows) / 2;

    // 아이템
    this.hintsLeft = config.hints;
    this.shufflesLeft = config.shuffles;

    // 시간
    this.timeLimit = config.timeLimit;
    this.timeLeft = config.timeLimit;
    this.startTime = null;
    this.gameOver = false;
    this.cleared = false;

    // 연출
    this.currentPath = null;     // 현재 표시 중인 경로
    this.pathTimer = 0;          // 경로 표시 타이머
    this.hintHighlight = null;   // 힌트 하이라이트
    this.lastMessage = '';       // 마지막 메시지
    this.removeAnimation = [];   // 제거 애니메이션 큐
  }

  // 타일 클릭/터치
  onTileSelect(x, y) {
    if (this.gameOver || this.cleared) return null;
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return null;
    if (this.board[y][x] === -1) return null;

    // 첫 번째 선택
    if (!this.selected) {
      this.selected = { x, y };
      this.hintHighlight = null;
      return { action: 'select', x, y, tile: this.board[y][x] };
    }

    // 같은 타일 재클릭 → 해제
    if (this.selected.x === x && this.selected.y === y) {
      this.selected = null;
      return { action: 'deselect' };
    }

    // 두 번째 선택 → 매칭 시도
    const result = tryMatch(
      this.board, this.cols, this.rows,
      this.selected.x, this.selected.y, x, y
    );

    if (result.success) {
      // 매칭 성공!
      const sx = this.selected.x, sy = this.selected.y;
      const tileId = this.board[sy][sx];

      // 점수 계산
      const points = SCORING.calculate(result.turns, this.combo, this.timeLeft);
      this.score += points;
      this.combo++;
      this.matchCount++;

      // 콤보 타이머 리셋 (3초 안에 다시 매칭하면 콤보 유지)
      if (this.comboTimer) clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => { this.combo = 0; }, 3000);

      // 타일 제거
      removeTiles(this.board, sx, sy, x, y);

      // 경로 저장 (연출용)
      this.currentPath = result.path;
      this.pathTimer = 500; // 0.5초간 표시

      this.selected = null;
      this.lastMessage = `${SHISEN_TILES[tileId]?.emoji || '?'} ${result.message} +${points}`;

      // 클리어 체크
      if (isBoardClear(this.board, this.cols, this.rows)) {
        this.cleared = true;
        const timeBonus = Math.floor(this.timeLeft * SCORING.TIME_BONUS_PER_SEC);
        this.score += timeBonus;
        this.lastMessage = `🎉 클리어! 시간 보너스 +${timeBonus}`;
      }
      // 매칭 가능한 쌍 없으면 자동 셔플 or 게임오버
      else if (!hasPossibleMatch(this.board, this.cols, this.rows)) {
        if (this.shufflesLeft > 0) {
          this.useShuffle();
          this.lastMessage += ' (자동 셔플!)';
        } else {
          this.gameOver = true;
          this.lastMessage = '매칭 가능한 쌍이 없습니다!';
        }
      }

      return {
        action: 'match',
        x1: sx, y1: sy, x2: x, y2: y,
        tileId,
        path: result.path,
        turns: result.turns,
        points,
        combo: this.combo,
        cleared: this.cleared,
      };
    } else {
      // 매칭 실패
      this.combo = 0;
      const prev = this.selected;
      this.selected = { x, y }; // 새로운 타일 선택으로 전환
      this.lastMessage = result.message;
      return {
        action: 'fail',
        x1: prev.x, y1: prev.y, x2: x, y2: y,
        message: result.message,
      };
    }
  }

  // 힌트 사용
  useHint() {
    if (this.hintsLeft <= 0 || this.gameOver || this.cleared) return null;
    this.hintsLeft--;
    this.score += SCORING.HINT_PENALTY;
    const hint = findHint(this.board, this.cols, this.rows);
    if (hint) {
      this.hintHighlight = { x1: hint.x1, y1: hint.y1, x2: hint.x2, y2: hint.y2 };
      this.lastMessage = `💡 힌트! (남은 ${this.hintsLeft}회)`;
    }
    return hint;
  }

  // 셔플 사용
  useShuffle() {
    if (this.shufflesLeft <= 0 || this.gameOver || this.cleared) return false;
    this.shufflesLeft--;
    this.score += SCORING.SHUFFLE_PENALTY;
    const ok = shuffleBoard(this.board, this.cols, this.rows);
    this.selected = null;
    this.hintHighlight = null;
    this.lastMessage = ok ? `🔄 셔플! (남은 ${this.shufflesLeft}회)` : '셔플 실패!';
    return ok;
  }

  // 시간 업데이트 (매 프레임 호출)
  updateTime(dt) {
    if (this.gameOver || this.cleared) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.gameOver = true;
      this.lastMessage = '⏰ 시간 초과!';
    }
    // 경로 표시 타이머
    if (this.pathTimer > 0) {
      this.pathTimer -= dt * 1000;
      if (this.pathTimer <= 0) {
        this.currentPath = null;
      }
    }
  }

  // 게임 결과
  getResult() {
    return {
      cleared: this.cleared,
      score: this.score,
      matchCount: this.matchCount,
      totalPairs: this.totalPairs,
      timeLeft: Math.max(0, this.timeLeft),
      combo: this.combo,
      difficulty: this.difficulty,
    };
  }

  // 보드 상태 (렌더링용)
  getBoardState() {
    return {
      board: this.board,
      cols: this.cols,
      rows: this.rows,
      selected: this.selected,
      currentPath: this.currentPath,
      hintHighlight: this.hintHighlight,
      score: this.score,
      combo: this.combo,
      timeLeft: this.timeLeft,
      hintsLeft: this.hintsLeft,
      shufflesLeft: this.shufflesLeft,
      matchCount: this.matchCount,
      totalPairs: this.totalPairs,
      gameOver: this.gameOver,
      cleared: this.cleared,
      lastMessage: this.lastMessage,
    };
  }
}
