/**
 * shisen-match.js — 사천성 미니게임 (스테이지1 마블 슈팅 대체)
 * shisen-toolkit.js를 활용한 DOM 렌더링 사천성
 */
import GameState from '../core/game-state.js';
import { rollMarbleLoot } from '../data/loot-tables.js';
import { showComboText, showScoreFloat, showToast } from '../ui/toast.js';
import {
  SHISEN_TILES, ShisenGame, SCORING, generateShisenBoard,
  pathToPixels, drawConnectionLine, drawConnectionLineAnimated,
} from './shisen-toolkit.js';

export default class ShisenMatch {
  constructor(container, options = {}) {
    this.container = container;
    this.stageId = options.stageId || 1;
    this.onComplete = options.onComplete || (() => {});

    // 스테이지에 따라 난이도 조절
    const stage = this.stageId;
    let cols, rows;
    if (stage <= 2) { cols = 8; rows = 4; }       // 32칸 = 16쌍
    else if (stage <= 4) { cols = 10; rows = 4; }  // 40칸 = 20쌍
    else { cols = 10; rows = 6; }                   // 60칸 = 30쌍

    // 난이도 선택 후 커스텀 보드 크기로 재생성
    const difficulty = stage <= 2 ? 'easy' : 'normal';
    this.game = new ShisenGame(difficulty);
    this._regenerateBoard(cols, rows);

    this._destroyed = false;
    this._lootCollected = [];
    this._canvas = null;
    this._animTimer = null;
    this._lastTime = 0;

    this._render();
    this._startTimer();
  }

  _regenerateBoard(cols, rows) {
    // ShisenGame 내부 상태를 직접 재설정
    const g = this.game;
    const { board } = generateShisenBoard(cols, rows);
    g.board = board;
    g.cols = cols;
    g.rows = rows;
    g.totalPairs = (cols * rows) / 2;
    g.matchCount = 0;
    g.score = 0;
    g.combo = 0;
    g.selected = null;
    g.currentPath = null;
    g.hintHighlight = null;
    g.gameOver = false;
    g.cleared = false;
    g.timeLeft = g.config.timeLimit;
    g.hintsLeft = g.config.hints;
    g.shufflesLeft = g.config.shuffles;
  }

  _render() {
    if (this._destroyed) return;
    const g = this.game;
    const state = g.getBoardState();
    const { board, cols, rows, selected, hintHighlight, score, combo,
            timeLeft, hintsLeft, shufflesLeft, matchCount, totalPairs,
            gameOver, cleared, lastMessage } = state;

    const tileSize = Math.min(40, Math.floor((APP_W - 40) / cols));
    const boardW = cols * tileSize;
    const boardH = rows * tileSize;
    const progress = Math.round((matchCount / totalPairs) * 100);
    const timeStr = `${Math.floor(timeLeft / 60)}:${String(Math.floor(timeLeft % 60)).padStart(2, '0')}`;

    this.container.innerHTML = `
      <div class="shisen-scene" style="animation:fadeIn .3s ease-out;">
        <div class="scene-title" style="color:var(--blue);">🀄 사천성!</div>
        <div class="info-bar">
          🀄 점수: ${score} | ⏰ ${timeStr} | 🔗 ${matchCount}/${totalPairs}
          ${combo > 1 ? ` | 🔥x${combo}` : ''}
        </div>
        <div class="progress-bar" style="margin:0 auto 8px;">
          <div class="progress-fill" style="width:${progress}%;background:linear-gradient(90deg,var(--blue),var(--purple));"></div>
        </div>
        <div class="shisen-board-wrap">
          <canvas id="shisen-canvas" width="${boardW}" height="${boardH}"></canvas>
          <div class="shisen-board" id="shisen-board"
               style="width:${boardW}px;height:${boardH}px;grid-template-columns:repeat(${cols},${tileSize}px);"></div>
        </div>
        <div class="shisen-controls">
          <button class="btn btn-secondary btn-sm" id="shisen-hint">💡 힌트 (${hintsLeft})</button>
          <button class="btn btn-secondary btn-sm" id="shisen-shuffle">🔄 셔플 (${shufflesLeft})</button>
        </div>
        ${lastMessage ? `<div class="shisen-msg">${lastMessage}</div>` : ''}
        ${(gameOver || cleared) ? '<div id="shisen-result" style="margin-top:8px;"></div>' : ''}
      </div>
      <style>
        .shisen-scene { text-align: center; }
        .shisen-board-wrap { position: relative; display: inline-block; margin: 0 auto; }
        #shisen-canvas {
          position: absolute; top: 0; left: 0; pointer-events: none; z-index: 2;
        }
        .shisen-board {
          display: grid; gap: 0; position: relative; z-index: 1;
          background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden;
        }
        .shisen-tile {
          width: ${tileSize}px; height: ${tileSize}px;
          display: flex; align-items: center; justify-content: center;
          font-size: clamp(14px, ${Math.max(16, tileSize - 10)}px, ${Math.max(20, tileSize - 6)}px);
          cursor: pointer; transition: background 0.15s, transform 0.15s;
          border: 1px solid rgba(255,255,255,0.05);
          user-select: none;
        }
        .shisen-tile:hover { background: rgba(255,255,255,0.1); }
        .shisen-tile.selected { background: rgba(255,215,0,0.3); border-color: #FFD700; transform: scale(1.1); }
        .shisen-tile.hint { background: rgba(0,255,128,0.2); border-color: #00ff80; }
        .shisen-tile.empty { cursor: default; opacity: 0; }
        .shisen-controls { margin-top: 8px; display: flex; gap: 8px; justify-content: center; }
        .shisen-msg { font-size: clamp(12px,3.2vw,15px); color: #fbbf24; margin-top: 6px; min-height: 20px; }
      </style>
    `;

    // Board tiles
    const boardEl = this.container.querySelector('#shisen-board');
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileId = board[y][x];
        const tile = document.createElement('div');
        tile.className = 'shisen-tile';

        if (tileId === -1) {
          tile.classList.add('empty');
        } else {
          tile.textContent = SHISEN_TILES[tileId]?.emoji || '?';
          // Selected?
          if (selected && selected.x === x && selected.y === y) {
            tile.classList.add('selected');
          }
          // Hint?
          if (hintHighlight &&
              ((hintHighlight.x1 === x && hintHighlight.y1 === y) ||
               (hintHighlight.x2 === x && hintHighlight.y2 === y))) {
            tile.classList.add('hint');
          }
          tile.onclick = () => this._onTileClick(x, y, tileSize);
        }
        boardEl.appendChild(tile);
      }
    }

    // Canvas for connection lines
    this._canvas = this.container.querySelector('#shisen-canvas');
    this._tileSize = tileSize;
    if (state.currentPath) {
      this._drawPath(state.currentPath, tileSize);
    }

    // Buttons
    const hintBtn = this.container.querySelector('#shisen-hint');
    if (hintBtn) hintBtn.onclick = () => { g.useHint(); this._render(); };
    const shuffleBtn = this.container.querySelector('#shisen-shuffle');
    if (shuffleBtn) shuffleBtn.onclick = () => { g.useShuffle(); this._render(); };

    // Result
    if (gameOver || cleared) {
      this._showResult();
    }
  }

  _onTileClick(x, y, tileSize) {
    const result = this.game.onTileSelect(x, y);
    if (!result) return;

    if (result.action === 'match') {
      // Show combo
      if (result.combo > 1) showComboText(`🔥 x${result.combo} 콤보!`);
      showScoreFloat(result.points);

      // Draw path then re-render
      this._render();
      if (result.path) {
        this._drawPath(result.path, tileSize);
        // After path animation, re-render to clear tiles
        setTimeout(() => this._render(), 400);
      }
    } else {
      this._render();
    }
  }

  _drawPath(path, tileSize) {
    const canvas = this._canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pixelPath = pathToPixels(path, tileSize, tileSize, 0, 0);
    drawConnectionLine(ctx, pixelPath, '#ffd700', 3, 0.8);
  }

  _startTimer() {
    this._lastTime = performance.now();
    const tick = () => {
      if (this._destroyed) return;
      const now = performance.now();
      const dt = (now - this._lastTime) / 1000;
      this._lastTime = now;
      this.game.updateTime(dt);

      // Update timer display without full re-render
      const timeLeft = this.game.timeLeft;
      const timeStr = `${Math.floor(timeLeft / 60)}:${String(Math.floor(timeLeft % 60)).padStart(2, '0')}`;
      const infoBar = this.container.querySelector('.info-bar');
      if (infoBar && !this.game.gameOver && !this.game.cleared) {
        const g = this.game;
        infoBar.textContent = `🀄 점수: ${g.score} | ⏰ ${timeStr} | 🔗 ${g.matchCount}/${g.totalPairs}${g.combo > 1 ? ` | 🔥x${g.combo}` : ''}`;
      }

      if (this.game.gameOver) {
        this._render();
        return;
      }
      this._animTimer = requestAnimationFrame(tick);
    };
    this._animTimer = requestAnimationFrame(tick);
  }

  _showResult() {
    const resultDiv = this.container.querySelector('#shisen-result');
    if (!resultDiv) return;
    if (this._animTimer) cancelAnimationFrame(this._animTimer);

    const r = this.game.getResult();

    // Roll loot (same as marble shoot)
    const loot = rollMarbleLoot(r.score, this.stageId);
    this._lootCollected = loot;

    // Apply loot
    loot.forEach(item => {
      if (item.type === 'gold') GameState.addGold(item.value);
      else GameState.addItem(item);
    });

    resultDiv.innerHTML = `
      <div style="color:var(--green);font-size:var(--label-lg);font-weight:700;margin-bottom:12px;">
        ${r.cleared ? '🎉 완벽 클리어!' : '⏰ 종료!'} 총 ${r.score}점
      </div>
      <div style="color:var(--text-secondary);font-size:var(--label-md);margin-bottom:4px;">
        매칭: ${r.matchCount}/${r.totalPairs} | 남은시간: ${Math.floor(r.timeLeft)}초
      </div>
      <div style="color:var(--text-secondary);font-size:var(--label-md);margin-bottom:8px;">획득 아이템:</div>
      <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
        ${loot.map(l => `<span style="padding:clamp(3px,1vw,5px) clamp(6px,2.5vw,12px);background:var(--bg-card);border-radius:8px;font-size:var(--label-md);">${l.emoji} ${l.name}${l.value ? ' +' + l.value : ''}</span>`).join('')}
      </div>
      <button class="btn btn-primary" id="shisen-done-btn">다음으로 →</button>
    `;

    resultDiv.querySelector('#shisen-done-btn').onclick = () => {
      this.onComplete({ score: r.score, loot: this._lootCollected });
    };
  }

  destroy() {
    this._destroyed = true;
    if (this._animTimer) cancelAnimationFrame(this._animTimer);
  }
}
