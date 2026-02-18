/**
 * marble-board.js — 마블 보드 시스템 (DOM 기반)
 * 30칸 순환 보드, 말(영웅) 이동 애니메이션
 * 주사위 결과만큼 칸칸 이동 → 도착 칸 이벤트 실행
 */

// 칸 타입 정의
const TILE_TYPES = [
  { type: 'start',    emoji: '🏠', name: '시작',     color: '#4ade80' },
  { type: 'treasure', emoji: '🎁', name: '보물상자', color: '#fbbf24' },
  { type: 'battle',   emoji: '⚔️', name: '전투',     color: '#f87171' },
  { type: 'gold',     emoji: '💰', name: '골드',     color: '#fcd34d' },
  { type: 'shop',     emoji: '🏪', name: '상점',     color: '#a78bfa' },
  { type: 'trap',     emoji: '💀', name: '함정',     color: '#ef4444' },
  { type: 'heal',     emoji: '💚', name: '회복',     color: '#34d399' },
  { type: 'mystery',  emoji: '❓', name: '미스터리', color: '#818cf8' },
  { type: 'spirit',   emoji: '🌳', name: '소환나무', color: '#86efac' },
  { type: 'boss',     emoji: '👹', name: '보스',     color: '#dc2626' },
];

// 가중치 기반 랜덤 배치 (시작, 보스 제외)
const TILE_WEIGHTS = [
  // treasure, battle, gold, shop, trap, heal, mystery, spirit
  { type: 1, weight: 12 }, // treasure
  { type: 2, weight: 10 }, // battle
  { type: 3, weight: 15 }, // gold
  { type: 4, weight: 5 },  // shop
  { type: 5, weight: 8 },  // trap
  { type: 6, weight: 12 }, // heal
  { type: 7, weight: 10 }, // mystery
  { type: 8, weight: 8 },  // spirit
];

function weightedRandomTile() {
  const totalWeight = TILE_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * totalWeight;
  for (const w of TILE_WEIGHTS) {
    r -= w.weight;
    if (r <= 0) return TILE_TYPES[w.type];
  }
  return TILE_TYPES[1]; // fallback: treasure
}

export default class MarbleBoard {
  constructor() {
    this.tiles = this._generateTiles();
    this.playerPos = 0;
    this.moving = false;
    this._el = null;
    this._moveTimer = null;
    this._visitedEvents = []; // 방문한 이벤트 기록
  }

  _generateTiles() {
    const board = [];
    for (let i = 0; i < 30; i++) {
      if (i === 0) {
        board.push({ ...TILE_TYPES[0], index: i }); // 시작
      } else if (i === 29) {
        board.push({ ...TILE_TYPES[9], index: i }); // 보스
      } else if (i === 14) {
        board.push({ ...TILE_TYPES[4], index: i }); // 중간에 상점
      } else {
        const tileType = weightedRandomTile();
        board.push({ ...tileType, index: i });
      }
    }
    return board;
  }

  /**
   * 마블 보드를 컨테이너에 렌더링
   * @param {HTMLElement} container
   */
  renderTo(container) {
    this._el = container;
    this._renderBoard();
  }

  _renderBoard() {
    if (!this._el) return;

    // 보이는 범위: 플레이어 중심 ±5칸 (총 11칸)
    const viewRange = 5;
    const total = this.tiles.length;

    let html = '<div class="marble-strip">';

    for (let offset = -viewRange; offset <= viewRange; offset++) {
      let idx = this.playerPos + offset;
      // 순환 처리
      if (idx < 0) idx += total;
      if (idx >= total) idx -= total;

      const tile = this.tiles[idx];
      const isPlayer = offset === 0;
      const isVisited = this._visitedEvents.includes(idx);

      const tileClass = [
        'marble-tile',
        isPlayer ? 'marble-tile-active' : '',
        isVisited ? 'marble-tile-visited' : '',
      ].filter(Boolean).join(' ');

      html += `
        <div class="${tileClass}" style="--tile-color:${tile.color}">
          <div class="marble-tile-emoji">${tile.emoji}</div>
          ${isPlayer ? '<div class="marble-player">📍</div>' : ''}
          <div class="marble-tile-idx">${idx + 1}</div>
        </div>
      `;
    }

    html += '</div>';
    html += `<div class="marble-info">📍 위치: ${this.playerPos + 1}/${total} | ${this.tiles[this.playerPos].emoji} ${this.tiles[this.playerPos].name}</div>`;

    this._el.innerHTML = html;
  }

  /**
   * 말 이동 (칸당 0.3초 애니메이션)
   * @param {number} steps 이동할 칸 수
   * @param {function} callback 도착 시 콜백 (landedTile)
   */
  movePlayer(steps, callback) {
    if (this.moving || steps <= 0) {
      if (callback) callback(this.tiles[this.playerPos]);
      return;
    }

    this.moving = true;
    let remaining = steps;

    const step = () => {
      if (remaining <= 0) {
        this.moving = false;
        const landedTile = this.tiles[this.playerPos];
        this._visitedEvents.push(this.playerPos);
        this._renderBoard();
        if (callback) callback(landedTile);
        return;
      }

      this.playerPos = (this.playerPos + 1) % this.tiles.length;
      remaining--;
      this._renderBoard();

      // 이동 사운드 효과 (간단한 시각적 피드백)
      if (this._el) {
        const activeEl = this._el.querySelector('.marble-tile-active');
        if (activeEl) {
          activeEl.classList.add('marble-tile-bounce');
          setTimeout(() => activeEl.classList.remove('marble-tile-bounce'), 200);
        }
      }

      this._moveTimer = setTimeout(step, 300);
    };

    // 0.2초 후 시작
    this._moveTimer = setTimeout(step, 200);
  }

  /** 현재 타일 정보 */
  getCurrentTile() {
    return this.tiles[this.playerPos];
  }

  /** 보드 리셋 (새 게임) */
  reset() {
    this.tiles = this._generateTiles();
    this.playerPos = 0;
    this.moving = false;
    this._visitedEvents = [];
    if (this._moveTimer) clearTimeout(this._moveTimer);
    this._renderBoard();
  }

  destroy() {
    if (this._moveTimer) clearTimeout(this._moveTimer);
    this.moving = false;
  }
}
