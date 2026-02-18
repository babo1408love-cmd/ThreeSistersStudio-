// Candy Match Engine - Puzzle & Dragons style drag (8-direction, diagonal)
// Marble tile border on ALL 4 sides (board game path with items)
// Hero miniature moves along marble path by dice sum
// 3x3 treasure area at bottom center: 8 chests + dice cell
// Auto dice roll → chest suspense → hero movement → candy match
// Animated match resolution: explosion → gravity → new tiles → chain
// Spirit item drops from matches → fly to inventory
import GameState from '../core/game-state.js';
import EventBus from '../core/event-bus.js';
import SPIRITS, { RARITY_COLORS, RARITY_NAMES, RARITY_BG, rollSpiritItemRarity, getSpiritsByRarity } from '../data/spirits.js';
import { showComboText, showScoreFloat, showConfetti, showToast } from '../ui/toast.js';
import { BOARD_SLOT_LAYOUT, EQUIP_SLOT_MAP, INVENTORY_CONFIG, HERO_SLOT_CONFIG, PET_SLOT_CONFIG, canEquipHero, isSlotUnlocked, isPetSlotUnlocked } from '../data/inventory-config.js';
import { RAGE_GAUGE, ATTRIBUTES } from '../data/hero-config.js';
import { rollMarbleDrop as rollMarbleDropNew, placeMimicsOnPath, checkMimicNearby, isRareDrop, DROP_ANIMATION } from '../data/marble-drops-config.js';
import { GOLDEN_MIMIC, generateMimicReward } from '../data/golden-mimic-config.js';
import { createSpiritPartItem } from '../data/spirit-parts-config.js';
import { showMimicTutorialOnBoard, hasMimicTutorialSeen } from '../ui/mimic-tutorial.js';
import { MATCH_TIERS, MATCH_SPIRIT_DROP, SPECIAL_TILE_SYSTEM, getMatchTier, rollSpiritRarityByTier } from '../data/match-tiers-config.js';
import { MOTHER_OF_WORLD, isHelperActive, biasedGemIndex, getTileTarget } from '../data/beginner-helper-config.js';

const GEMS = ['🧚', '🍄', '💎', '⭐', '🌈', '🍬'];
const HERO_EMOJI = '🧚';

// Marble drop: uses marble-drops-config.js (세계관 전체 아이템 랜덤)
function rollMarbleDrop() {
  return rollMarbleDropNew();
}

export default class CandyMatch {
  constructor(container, options = {}) {
    this.container = container;
    this.targetScore = options.targetScore || 500;
    this.maxMoves = options.moves || 20;
    this.cols = options.cols || 7;
    this.rows = options.rows || 11;
    this.onComplete = options.onComplete || (() => {});
    this.onTurnEnd = options.onTurnEnd || null; // 매 턴 종료 콜백

    this.board = [];
    this.moves = this.maxMoves;
    this.score = 0;
    this.comboCount = 0;
    this.totalCombo = 0;
    this.isProcessing = false;
    this._destroyed = false;

    // 3x3 special area: 8 chests + 1 dice cell
    this._chests = {};
    this._diceCell = null;
    this._chestsOpened = 0;
    this._totalChests = 8;
    this._dice = [0, 0];
    this._diceSum = 0;
    this._diceRolled = false;
    this._introPhase = options.skipIntro ? false : true;
    this._introStep = 'dice'; // dice → chests → move → play

    // Marble path (board game path around candy grid)
    this._marblePath = [];
    this._heroPos = 0;
    this._heroMoving = false;
    this._collectedItems = [];

    // P&D drag state
    this._dragging = false;
    this._dragFrom = null;
    this._dragCur = null;
    this._dragTrail = [];
    this._floatingOrb = null;
    this._cellElements = {};
    this._dragGemIdx = -1;
    this._dragMaxTime = 16000;    // 16 seconds drag time limit (2x)
    this._dragTimerId = null;
    this._dragTimeLeft = 0;

    // 매치 카운트 기반 클리어 (60매치)
    this._matchCount = 0;
    this._matchTarget = 60;
    this._fragmentSets = 0;       // 완성된 조각 세트 수 (매치 6개당 1세트)
    this._fragmentProgress = 0;   // 현재 조각 진행 (0~5)

    // 초보자 도우미 상태
    this._helperActive = isHelperActive(GameState);
    this._tilesDestroyed = 0;
    this._helperMsg = MOTHER_OF_WORLD.dialogues.greeting;
    if (this._helperActive) {
      this.maxMoves += MOTHER_OF_WORLD.bonuses.extraMoves;
      this.moves = this.maxMoves;
      this._tileTarget = getTileTarget(GameState.currentStage);
    }

    // 외부 잠금 (주사위/마블 진행 중 드래그 비활성화)
    this._externalLock = false;

    // Bind handlers (mouse + touch)
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onTouchMove = this._handleTouchMove.bind(this);
    this._onTouchEnd = this._handleMouseUp.bind(this);

    this._initBoard();
  }

  _initBoard() {
    this.board = [];
    for (let r = 0; r < this.rows; r++) {
      this.board[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.board[r][c] = this._helperActive
          ? biasedGemIndex(GEMS.length)
          : Math.floor(Math.random() * GEMS.length);
      }
    }

    // Place 3x3 special area at bottom center
    const centerCol = Math.floor(this.cols / 2);
    const bottomRow = this.rows - 1;
    this._chests = {};
    this._chestsOpened = 0;

    for (let dr = 0; dr < 3; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = bottomRow - dr;
        const c = centerCol + dc;
        if (dr === 1 && dc === 0) {
          this._diceCell = r + ',' + c;
          this.board[r][c] = -2;
        } else {
          this._chests[r + ',' + c] = { opened: false, rarity: null, spirit: null };
          this.board[r][c] = -1;
        }
      }
    }

    // Mark equipment slots (left of treasure): board value -3
    for (const [r, c] of BOARD_SLOT_LAYOUT.equipmentPositions) {
      if (r < this.rows && c < this.cols) {
        this.board[r][c] = BOARD_SLOT_LAYOUT.boardMarkers.equipment;
      }
    }
    // Mark hero slots: board value -4
    for (const [r, c] of BOARD_SLOT_LAYOUT.heroSlotPositions) {
      if (r < this.rows && c < this.cols) {
        this.board[r][c] = BOARD_SLOT_LAYOUT.boardMarkers.heroSlot;
      }
    }
    // Mark pet slot: board value -5
    const [petR, petC] = BOARD_SLOT_LAYOUT.petSlotPosition;
    if (petR < this.rows && petC < this.cols) {
      this.board[petR][petC] = BOARD_SLOT_LAYOUT.boardMarkers.petSlot;
    }

    this._removeInitialMatches();
    this._generateMarblePath();

    // skipIntro가 아닌 경우에만 인트로 실행 (보물상자/주사위/영웅이동)
    // skipIntro 시에는 constructor에서 이미 _introPhase = false 설정됨
    if (this._introPhase) {
      this._introStep = 'dice';
      this._diceRolled = false;
      this._heroPos = 0;
      this._collectedItems = [];
      this._renderIntro();
    } else {
      this._heroPos = 0;
      this._collectedItems = [];
      this._render();
    }
  }

  // --- Marble Path Generation ---

  _generateMarblePath() {
    const totalCols = this.cols + 2;
    const totalRows = this.rows + 2;
    this._marblePath = [];

    // Top row: left to right
    for (let c = 0; c < totalCols; c++) {
      this._marblePath.push({ gr: 0, gc: c, drop: rollMarbleDrop(), collected: false });
    }
    // Right column: top+1 to bottom
    for (let r = 1; r < totalRows; r++) {
      this._marblePath.push({ gr: r, gc: totalCols - 1, drop: rollMarbleDrop(), collected: false });
    }
    // Bottom row: right-1 to left
    for (let c = totalCols - 2; c >= 0; c--) {
      this._marblePath.push({ gr: totalRows - 1, gc: c, drop: rollMarbleDrop(), collected: false });
    }
    // Left column: bottom-1 to top+1
    for (let r = totalRows - 2; r >= 1; r--) {
      this._marblePath.push({ gr: r, gc: 0, drop: rollMarbleDrop(), collected: false });
    }

    // 황금 미믹 배치 (최소 1개 보장)
    placeMimicsOnPath(this._marblePath);
  }

  _getPathTileAt(gr, gc) {
    return this._marblePath.find(t => t.gr === gr && t.gc === gc);
  }

  // --- Intro Phases ---

  _renderIntro() {
    if (this._destroyed) return;

    if (this._introStep === 'dice') {
      this._renderDicePhase();
    } else if (this._introStep === 'chests') {
      this._renderChestPhase();
    } else if (this._introStep === 'move') {
      this._renderMovePhase();
    }
  }

  _renderDicePhase() {
    this.container.innerHTML = `
      <div class="candy-scene" style="animation:fadeIn .5s ease-out;">
        <div class="scene-title" style="color:var(--pink);">🍬 캔디 매치!</div>
        <div class="scene-subtitle">주사위가 굴러갑니다...</div>
        <div style="display:flex;gap:20px;justify-content:center;align-items:center;margin:32px 0;">
          <div class="dice-container" id="dice-container-0">
            <div class="intro-dice" id="intro-dice0">?</div>
          </div>
          <div style="font-size:2em;color:var(--gold);font-weight:900;">+</div>
          <div class="dice-container" id="dice-container-1">
            <div class="intro-dice" id="intro-dice1">?</div>
          </div>
        </div>
        <div id="dice-result" style="min-height:60px;"></div>
      </div>
    `;
    setTimeout(() => this._autoRollDice(), 500);
  }

  _autoRollDice() {
    if (this._destroyed || this._diceRolled) return;

    const dc0 = this.container.querySelector('#dice-container-0');
    const dc1 = this.container.querySelector('#dice-container-1');
    const d0 = this.container.querySelector('#intro-dice0');
    const d1 = this.container.querySelector('#intro-dice1');
    if (!dc0 || !dc1) return;

    dc0.classList.add('dice-throw');
    setTimeout(() => dc1.classList.add('dice-throw'), 150);

    let count = 0;
    const interval = setInterval(() => {
      if (this._destroyed) { clearInterval(interval); return; }
      this._dice[0] = Math.floor(Math.random() * 6) + 1;
      this._dice[1] = Math.floor(Math.random() * 6) + 1;
      if (d0) d0.textContent = this._dice[0];
      if (d1) d1.textContent = this._dice[1];
      count++;

      if (count >= 20) {
        clearInterval(interval);
        this._diceRolled = true;
        this._diceSum = this._dice[0] + this._dice[1];

        dc0.classList.remove('dice-throw');
        dc1.classList.remove('dice-throw');
        dc0.classList.add('dice-land');
        dc1.classList.add('dice-land');

        const resultEl = this.container.querySelector('#dice-result');
        if (resultEl) {
          resultEl.innerHTML = `
            <div style="font-size:1.4em;color:var(--gold);font-weight:900;animation:fadeIn .5s ease-out;">
              🎲 주사위 합: ${this._diceSum} → 영웅 이동 ${this._diceSum}칸!
            </div>
          `;
        }
        EventBus.emit('dice:rolled', { sum: this._diceSum });
        showConfetti();

        setTimeout(() => {
          this._introStep = 'chests';
          this._renderIntro();
        }, 1500);
      }
    }, 60);
  }

  _renderChestPhase() {
    this.container.innerHTML = `
      <div class="candy-scene" style="animation:fadeIn .3s ease-out;">
        <div class="scene-title" style="color:var(--gold);">🎁 보물상자 오픈!</div>
        <div id="chest-grid" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:400px;margin:16px auto;"></div>
        <div id="chest-next-area" style="margin-top:20px;"></div>
      </div>
    `;

    const chestKeys = Object.keys(this._chests);
    const grid = this.container.querySelector('#chest-grid');

    chestKeys.forEach((key, idx) => {
      const rarity = rollSpiritItemRarity();
      const spiritsOfRarity = getSpiritsByRarity(rarity);
      const spirit = spiritsOfRarity[Math.floor(Math.random() * spiritsOfRarity.length)];
      this._chests[key].rarity = rarity;
      this._chests[key].spirit = spirit;

      const cell = document.createElement('div');
      cell.className = 'chest-reveal-cell chest-flicker';
      cell.id = `chest-reveal-${idx}`;
      cell.textContent = '🎁';
      cell.style.animationDelay = (idx * 0.1) + 's';
      grid.appendChild(cell);
    });

    this._revealChestsSequentially(0, chestKeys);
  }

  _revealChestsSequentially(idx, chestKeys) {
    if (this._destroyed) return;
    if (idx >= chestKeys.length) {
      GameState.addGold(200); // 보물상자 보너스 → 골드로 지급 (캔디 스코어 X)
      const area = this.container.querySelector('#chest-next-area');
      if (area) {
        area.innerHTML = `<button class="btn btn-primary btn-lg touch-btn" id="go-move-btn" style="animation:fadeIn .5s;"><span class="touch-icon">👆</span> 🧚 영웅 이동 시작!</button>`;
        area.querySelector('#go-move-btn').onclick = () => {
          this._introStep = 'move';
          this._renderIntro();
        };
      }
      return;
    }

    const key = chestKeys[idx];
    const chest = this._chests[key];
    chest.opened = true;
    this._chestsOpened++;

    // 파츠 시스템으로 생성
    const partItem = createSpiritPartItem(chest.spirit.key, chest.spirit.name, chest.spirit.emoji, chest.rarity);
    GameState.addSpiritItem(partItem);
    GameState.addGold(15 + Math.floor(Math.random() * 20));

    const cell = this.container.querySelector(`#chest-reveal-${idx}`);
    if (cell) {
      cell.classList.remove('chest-flicker');
      const rarityColor = RARITY_COLORS[chest.rarity];
      const rarityBg = RARITY_BG[chest.rarity];
      const partDef = partItem.partEmoji || '';
      cell.className = 'chest-reveal-cell chest-revealed';
      cell.style.borderColor = rarityColor;
      cell.style.background = rarityBg;
      cell.style.boxShadow = `0 0 12px ${rarityColor}`;
      cell.innerHTML = `
        <div style="font-size:22px;">${chest.spirit.emoji}</div>
        <div style="font-size:9px;color:var(--text-secondary);">${partDef} ${partItem.part}</div>
        <div style="font-size:9px;color:${rarityColor};font-weight:700;">${RARITY_NAMES[chest.rarity]}</div>
      `;

      // Magnet pull animation for chest item
      setTimeout(() => this._animateFlyToInventory(chest.spirit.emoji, cell), 200);
    }

    setTimeout(() => this._revealChestsSequentially(idx + 1, chestKeys), 500);
  }

  // --- Hero Movement Phase ---

  _renderMovePhase() {
    if (this._destroyed) return;

    const totalCols = this.cols + 2;
    const totalRows = this.rows + 2;
    const cellSize = 40;

    this.container.innerHTML = `
      <div class="candy-scene" style="animation:fadeIn .3s ease-out;">
        <div class="scene-title" style="color:var(--purple);">🧚 영웅 이동!</div>
        <div class="scene-subtitle">남은 이동: <span id="move-remaining" style="color:var(--gold);font-weight:900;">${this._diceSum}</span>칸</div>
        <div class="candy-board-wrapper" id="move-board"></div>
        <div id="collected-display" style="margin-top:8px;min-height:40px;"></div>
        <div id="move-done-area" class="move-done-sticky"></div>
      </div>
    `;

    const wrapper = this.container.querySelector('#move-board');
    wrapper.style.cssText = `
      display:inline-grid;
      grid-template-columns:repeat(${totalCols}, ${cellSize}px);
      grid-template-rows:repeat(${totalRows}, ${cellSize}px);
      gap:2px;justify-content:center;position:relative;user-select:none;
    `;

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const isBorder = r === 0 || r === totalRows - 1 || c === 0 || c === totalCols - 1;
        const cell = document.createElement('div');
        cell.style.width = cellSize + 'px';
        cell.style.height = cellSize + 'px';

        if (isBorder) {
          const tile = this._getPathTileAt(r, c);
          cell.className = 'marble-path-tile';

          if (tile) {
            const isHere = this._marblePath[this._heroPos] === tile;

            if (tile.collected) {
              cell.classList.add('tile-collected');
              cell.textContent = '·';
            } else if (tile.drop.type === 'empty') {
              cell.textContent = '·';
              cell.style.opacity = '0.4';
            } else if (tile.isMimic) {
              // 황금 미믹 타일 — 특별 연출
              cell.classList.add('mimic-tile');
              cell.textContent = GOLDEN_MIMIC.emoji;
            } else if (tile.drop.rare) {
              // 희귀 아이템 타일
              cell.classList.add('rare-drop-tile');
              cell.textContent = tile.drop.emoji;
            } else {
              cell.textContent = tile.drop.emoji;
            }

            if (isHere) {
              cell.classList.add('hero-tile');
              cell.innerHTML = `<span class="hero-fairy">${HERO_EMOJI}</span>`;
            }
          }
        } else {
          const cr = r - 1;
          const cc = c - 1;
          if (cr >= 0 && cr < this.rows && cc >= 0 && cc < this.cols) {
            if (this._isEquipmentSlot(cr, cc)) {
              this._renderEquipSlotCell(cell, cr, cc);
            } else if (this._isPetSlot(cr, cc)) {
              this._renderPetSlotCell(cell);
            } else if (this._isHeroSlot(cr, cc)) {
              this._renderHeroSlotCell(cell, cr, cc);
            } else if (this.board[cr][cc] === -1) {
              cell.className = 'candy-cell';
              cell.style.opacity = '0.3';
              cell.style.pointerEvents = 'none';
              cell.textContent = '🎁';
            } else if (this.board[cr][cc] === -2) {
              cell.className = 'candy-cell';
              cell.style.opacity = '0.3';
              cell.style.pointerEvents = 'none';
              cell.textContent = '🎲';
            } else if (this._isSpecialTile(cr, cc)) {
              const info = this._getSpecialTileInfo(this.board[cr][cc]);
              cell.className = 'candy-cell special-tile';
              cell.style.opacity = '0.3';
              cell.style.pointerEvents = 'none';
              cell.textContent = info ? info.emoji : '💫';
            } else {
              cell.className = 'candy-cell';
              cell.style.opacity = '0.3';
              cell.style.pointerEvents = 'none';
              cell.textContent = GEMS[this.board[cr][cc]] || '';
            }
          } else {
            cell.className = 'candy-cell';
            cell.style.opacity = '0.3';
            cell.style.pointerEvents = 'none';
          }
        }
        wrapper.appendChild(cell);
      }
    }

    this._updateCollectedDisplay();

    if (!this._heroMoving && this._diceSum > 0) {
      // 미믹 타일이 있고 튜토리얼 미확인 시 → 보드 아래에서 요정이 소개
      const hasMimic = this._marblePath.some(t => t.isMimic && !t.collected);
      const tutArea = this.container.querySelector('#move-done-area');
      if (hasMimic && !hasMimicTutorialSeen() && tutArea) {
        showMimicTutorialOnBoard(tutArea).then(() => {
          if (!this._destroyed) {
            this._heroMoving = true;
            this._moveHeroStep(this._diceSum);
          }
        });
      } else {
        this._heroMoving = true;
        setTimeout(() => this._moveHeroStep(this._diceSum), 600);
      }
    } else if (this._diceSum <= 0) {
      this._showMoveDoneButton();
    }
  }

  _moveHeroStep(remaining) {
    if (this._destroyed || remaining <= 0) {
      // Landing! Collect item on the final tile
      const landTile = this._marblePath[this._heroPos];
      if (landTile && !landTile.collected && landTile.drop.type !== 'empty') {
        landTile.collected = true;
        this._collectDrop(landTile.drop);
        this._collectedItems.push(landTile.drop);
        if (landTile.drop.type !== 'golden_mimic') showConfetti();

        // Magnet pull animation → inventory
        this._animateMagnetPull(landTile);
      }
      this._heroMoving = false;
      this._diceSum = 0;
      this._renderMovePhase();

      // 착지 후: 미믹 근처 감지 → 보너스 주사위 이벤트
      const mimicNearby = checkMimicNearby(this._heroPos, this._marblePath);
      if (mimicNearby) {
        this._triggerMimicDiceEvent(mimicNearby);
      } else {
        this._showMoveDoneButton();
      }
      return;
    }

    this._heroPos = (this._heroPos + 1) % this._marblePath.length;

    // 지나가는 중에 미믹 타일이면 자동 수집 (passThrough)
    const passTile = this._marblePath[this._heroPos];
    if (passTile && passTile.isMimic && !passTile.collected) {
      passTile.collected = true;
      this._collectDrop(passTile.drop);
      this._collectedItems.push(passTile.drop);
      this._animateMagnetPull(passTile);
    }

    remaining--;
    this._diceSum = remaining;
    this._renderMovePhase();
    setTimeout(() => this._moveHeroStep(remaining), 250);
  }

  // 아이템 → 인벤토리 자석 흡수 연출
  _animateMagnetPull(tile) {
    const wrapper = this.container.querySelector('#move-board');
    if (!wrapper) return;
    const totalCols = this.cols + 2;
    const idx = tile.gr * totalCols + tile.gc;
    const cells = wrapper.children;
    if (!cells[idx]) return;

    const emoji = tile.drop.emoji || '✨';
    const rect = cells[idx].getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const flyEl = document.createElement('div');
    flyEl.className = 'magnet-pull-item';
    flyEl.textContent = emoji;
    flyEl.style.left = startX + 'px';
    flyEl.style.top = startY + 'px';
    document.body.appendChild(flyEl);

    // Phase 1: float up briefly
    requestAnimationFrame(() => {
      flyEl.style.transform = 'translateY(-15px) scale(1.2)';
      flyEl.style.opacity = '1';
    });

    // Phase 2: pull to inventory area (left side of board)
    setTimeout(() => {
      const targetX = 60;
      const targetY = window.innerHeight * 0.7;
      flyEl.style.transition = `all ${DROP_ANIMATION.magnetPull.pullDuration}ms ${DROP_ANIMATION.magnetPull.pullEasing}`;
      flyEl.style.left = targetX + 'px';
      flyEl.style.top = targetY + 'px';
      flyEl.style.transform = 'scale(0.3)';
      flyEl.style.opacity = '0';
    }, DROP_ANIMATION.magnetPull.floatUpDuration);

    setTimeout(() => flyEl.remove(), DROP_ANIMATION.magnetPull.floatUpDuration + DROP_ANIMATION.magnetPull.pullDuration + 100);
  }

  // 황금 미믹 근처 도착 → 보너스 주사위 이벤트
  _triggerMimicDiceEvent(mimicInfo) {
    const area = this.container.querySelector('#move-done-area');
    if (!area) { this._showMoveDoneButton(); return; }

    area.innerHTML = `
      <div class="mimic-event" style="animation:fadeIn .3s;">
        <div style="font-size:36px;margin-bottom:8px;animation:pulse 0.8s infinite;">${GOLDEN_MIMIC.emoji}</div>
        <div style="color:var(--gold);font-weight:700;font-size:0.95em;">👑 황금 미믹 발견!</div>
        <div style="font-size:0.8em;color:var(--text-secondary);margin:6px 0;">
          ${mimicInfo.distance}칸 앞에 황금 미믹이! 보너스 주사위를 굴려 도달하세요!
        </div>
        <button class="btn btn-gold btn-lg touch-btn" id="mimic-dice-btn">
          <span class="touch-icon">👆</span> 🎲 보너스 주사위!
        </button>
      </div>
    `;

    this._scrollToArea(area);

    area.querySelector('#mimic-dice-btn').onclick = () => {
      // 주사위 1개 굴리기
      const roll = Math.floor(Math.random() * 6) + 1;
      area.innerHTML = `
        <div style="color:var(--gold);font-weight:900;font-size:1.5em;animation:fadeIn .3s;">
          🎲 ${roll}!
        </div>
      `;

      this._diceSum = roll;
      this._heroMoving = true;
      setTimeout(() => this._moveHeroStep(roll), 600);
    };
  }

  _collectDrop(drop) {
    switch (drop.type) {
      case 'gold':
        GameState.addGold(drop.value);
        break;
      case 'score':
        if (this._introPhase) {
          GameState.addGold(drop.value); // 인트로 중엔 골드로 전환
        } else {
          this.score += drop.value;
        }
        showScoreFloat(drop.value);
        break;
      case 'potion':
        GameState.player.hp = Math.min(GameState.player.maxHp, GameState.player.hp + drop.value);
        break;
      case 'buff':
        // 버프 아이템 — 소비 아이템으로 인벤토리에 추가
        GameState.addItem({
          name: drop.name, emoji: drop.emoji,
          type: 'consumable', effect: 'buff_' + drop.buffStat,
          value: drop.value, duration: drop.duration
        });
        break;
      case 'equip':
        // 장비 아이템 — 바로 인벤토리에 추가
        GameState.addItem({
          name: drop.name, emoji: drop.emoji,
          slot: drop.slot, rarity: drop.rarity || 'common',
          stats: drop.stats || {}
        });
        break;
      case 'item':
        // 레거시 호환
        GameState.addItem({
          name: drop.name, emoji: drop.emoji,
          slot: drop.subtype || 'arms', rarity: 'common',
          stats: drop.subtype === 'arms' ? { attack: 2 } : drop.subtype === 'body' ? { defense: 2 } : { speed: 1 }
        });
        break;
      case 'gem':
        GameState.addGold(drop.value);
        break;
      case 'spirit_part': {
        // 정령 파츠 — 새 파츠 시스템
        const rarity = rollSpiritItemRarity();
        const spirits = getSpiritsByRarity(rarity);
        if (spirits.length > 0) {
          const spirit = spirits[Math.floor(Math.random() * spirits.length)];
          const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
          GameState.addSpiritItem(partItem);
        }
        break;
      }
      case 'spirit': {
        // 레거시 호환 — 정령 아이템 (파츠 시스템으로 변환)
        const rarity = rollSpiritItemRarity();
        const spirits = getSpiritsByRarity(rarity);
        if (spirits.length > 0) {
          const spirit = spirits[Math.floor(Math.random() * spirits.length)];
          const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
          GameState.addSpiritItem(partItem);
        }
        break;
      }
      case 'golden_mimic':
        // 황금 미믹 — 특별 보상 처리
        this._collectMimicReward();
        break;
    }
  }

  _collectMimicReward() {
    showConfetti();
    showComboText('👑 황금 미믹!!');

    const rewards = generateMimicReward('marble');
    for (const reward of rewards) {
      switch (reward.type) {
        case 'gold':
          GameState.addGold(reward.value);
          showScoreFloat(reward.value);
          break;
        case 'score':
          this.score += reward.value;
          showScoreFloat(reward.value);
          break;
        case 'equipment': {
          // 등급에 맞는 랜덤 장비 생성 (6부위 슬롯)
          const equipSlots = ['head', 'body', 'arms', 'wings', 'legs', 'shoes'];
          const slot = equipSlots[Math.floor(Math.random() * equipSlots.length)];
          const slotNames = { head: '머리', body: '몸통', arms: '팔', wings: '날개', legs: '다리', shoes: '신발' };
          const mult = { rare: 1.8, magic: 2.8, epic: 4, legendary: 6 }[reward.rarity] || 1;
          const baseStats = { head: { defense: 3, maxHp: 20 }, body: { defense: 5 },
            arms: { attack: 5, critRate: 2 }, wings: { rageGainRate: 10, speed: 1 },
            legs: { defense: 3, speed: 1 }, shoes: { speed: 2 } }[slot] || {};
          const scaledStats = {};
          for (const [k, v] of Object.entries(baseStats)) {
            scaledStats[k] = Math.round(v * mult);
          }
          GameState.addItem({
            name: `미믹의 ${slotNames[slot] || slot}`, emoji: '👑',
            slot, rarity: reward.rarity, stats: scaledStats
          });
          break;
        }
        case 'spirit_part': {
          const rarity = rollSpiritItemRarity();
          const spirits = getSpiritsByRarity(rarity);
          if (spirits.length > 0) {
            const spirit = spirits[Math.floor(Math.random() * spirits.length)];
            const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
            GameState.addSpiritItem(partItem);
          }
          break;
        }
      }
    }
  }

  _updateCollectedDisplay() {
    const el = this.container.querySelector('#collected-display');
    if (!el) return;
    if (this._collectedItems.length === 0) {
      el.innerHTML = '<div style="color:var(--text-muted);font-size:0.85em;">아이템을 수집합니다...</div>';
    } else {
      el.innerHTML = `
        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
          ${this._collectedItems.map(d => `
            <span class="collected-item-badge">${d.emoji}</span>
          `).join('')}
        </div>
      `;
    }
  }

  _showMoveDoneButton() {
    const area = this.container.querySelector('#move-done-area');
    if (!area) return;
    area.innerHTML = `
      <div style="color:var(--green);font-size:1.1em;margin-bottom:8px;">이동 완료! 아이템 ${this._collectedItems.length}개 수집!</div>
      <button class="btn btn-primary btn-lg touch-btn" id="start-candy-btn" style="animation:fadeIn .5s;">
        <span class="touch-icon">👆</span> 🍬 캔디 매치 시작!
      </button>
    `;
    this._scrollToArea(area);
    const btn = area.querySelector('#start-candy-btn');
    if (btn) {
      btn.onclick = () => {
        this._introPhase = false;
        this.score = 0; // 캔디 매치 스코어는 0부터 시작 (인트로 보너스는 골드로 지급됨)
        this._render();
      };
    }
  }

  // 영역을 화면에 보이도록 스크롤
  _scrollToArea(el) {
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // --- Helpers ---

  _isSpecial(r, c) {
    return this._isChest(r, c) || this._isDice(r, c) || this._isEquipmentSlot(r, c) || this._isHeroSlot(r, c) || this._isPetSlot(r, c);
  }

  _isEquipmentSlot(r, c) {
    return this.board[r] && this.board[r][c] === BOARD_SLOT_LAYOUT.boardMarkers.equipment;
  }

  _isHeroSlot(r, c) {
    return this.board[r] && this.board[r][c] === BOARD_SLOT_LAYOUT.boardMarkers.heroSlot;
  }

  _isPetSlot(r, c) {
    return this.board[r] && this.board[r][c] === BOARD_SLOT_LAYOUT.boardMarkers.petSlot;
  }

  // --- Special Tile Helpers ---
  // Special tiles: board value >= 100 (stores 100 + originalGemIndex * 10 + specialType)
  // This encoding preserves which gem it originated from so it can match with the same type

  _isSpecialTile(r, c) {
    return this.board[r] && this.board[r][c] >= SPECIAL_TILE_SYSTEM.boardValueOffset;
  }

  _getSpecialTileGem(val) {
    // Extract original gem index from special tile value
    return Math.floor((val - SPECIAL_TILE_SYSTEM.boardValueOffset) / 10);
  }

  _getSpecialTileType(val) {
    // Extract special type (0=line, 1=area, 2=lightning, 3=rainbow, 4=cross, 5=mega)
    return (val - SPECIAL_TILE_SYSTEM.boardValueOffset) % 10;
  }

  _encodeSpecialTile(gemIdx, specialTypeIdx) {
    return SPECIAL_TILE_SYSTEM.boardValueOffset + gemIdx * 10 + specialTypeIdx;
  }

  _getSpecialTileInfo(val) {
    const typeIdx = this._getSpecialTileType(val);
    const types = Object.values(SPECIAL_TILE_SYSTEM.tiles);
    return types[typeIdx] || null;
  }

  _isChest(r, c) {
    return this._chests.hasOwnProperty(r + ',' + c);
  }

  _isChestOpened(r, c) {
    const ch = this._chests[r + ',' + c];
    return ch && ch.opened;
  }

  _isDice(r, c) {
    return (r + ',' + c) === this._diceCell;
  }

  _removeInitialMatches() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.board[r][c] < 0) continue;
          if (c < this.cols - 2) {
            const a = this.board[r][c], b = this.board[r][c + 1], d = this.board[r][c + 2];
            if (a >= 0 && b >= 0 && d >= 0 && a === b && b === d) {
              this.board[r][c] = (a + 1 + Math.floor(Math.random() * (GEMS.length - 1))) % GEMS.length;
              changed = true;
            }
          }
          if (r < this.rows - 2) {
            const a = this.board[r][c], b = this.board[r + 1][c], d = this.board[r + 2][c];
            if (a >= 0 && b >= 0 && d >= 0 && a === b && b === d) {
              this.board[r][c] = (a + 1 + Math.floor(Math.random() * (GEMS.length - 1))) % GEMS.length;
              changed = true;
            }
          }
        }
      }
    }
  }

  // --- Main Game Render ---

  _render() {
    if (this._destroyed) return;
    if (this._introPhase) { this._renderIntro(); return; }

    const cleared = this._matchCount >= this._matchTarget;
    const progress = Math.min(100, this._matchCount / this._matchTarget * 100);
    const totalCols = this.cols + 2;
    const totalRows = this.rows + 2;
    const cellSize = 40;

    const ragePhase = this._getRagePhase();
    const ragePercent = Math.min(100, GameState.rageGauge);

    // 도우미 활성 시 대사 업데이트
    if (this._helperActive) {
      if (cleared) this._helperMsg = MOTHER_OF_WORLD.dialogues.cleared;
      else if (progress >= 80) this._helperMsg = MOTHER_OF_WORLD.dialogues.almostClear;
    }

    // 조각 진행 바 (6개 중 현재까지)
    const fragBar = Array.from({length: 6}, (_, i) =>
      i < this._fragmentProgress ? '▶️' : '⬛'
    ).join('');

    const infoText = `🔗 매치: ${this._matchCount}/${this._matchTarget} | 남은 이동: ${this.moves} | 🔮 조각: ${fragBar} (${this._fragmentProgress}/6) | 세트: ${this._fragmentSets}`;

    const helperBarHtml = this._helperActive ? `
        <div class="helper-bar" id="helper-bar">
          <span class="helper-emoji">🌍</span>
          <span class="helper-msg">${this._helperMsg}</span>
          <button class="helper-dismiss-btn" id="helper-dismiss">혼자 할래요</button>
        </div>` : '';

    this.container.innerHTML = `
      <div class="candy-scene">
        <div class="scene-title" style="color:var(--pink);">🍬 캔디 매치!</div>
        <div class="scene-subtitle">보석을 드래그하여 이동! (8방향, ${this._dragMaxTime / 1000}초 제한)</div>
        ${helperBarHtml}
        <div class="info-bar" id="candy-info">${infoText}</div>
        <div class="progress-bar" style="margin:0 auto 6px;">
          <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        <div class="rage-gauge-bar">
          <span class="rage-icon ${ragePercent >= 100 ? 'rage-full-pulse' : ''}">${ragePhase.emoji}</span>
          <div class="rage-track">
            <div class="rage-fill" style="width:${ragePercent}%;background:${ragePhase.color};"></div>
          </div>
          <span class="rage-label">${Math.floor(ragePercent)}%</span>
        </div>
        <div class="pad-drag-timer" id="drag-timer" style="display:none;">
          <div class="pad-drag-timer-fill" id="drag-timer-fill"></div>
        </div>
        <div class="candy-board-wrapper" id="candy-board-wrapper"></div>
        ${cleared ? '<button class="btn btn-primary" id="candy-clear-btn" style="margin-top:12px;">🎉 클리어! 다음으로</button>' : ''}
        ${!cleared && this.moves <= 0 ? '<button class="btn btn-gold" id="candy-retry-btn" style="margin-top:12px;">🔄 다시 하기</button>' : ''}
      </div>
    `;

    const wrapper = this.container.querySelector('#candy-board-wrapper');
    wrapper.style.cssText = `
      display:inline-grid;
      grid-template-columns:repeat(${totalCols}, ${cellSize}px);
      grid-template-rows:repeat(${totalRows}, ${cellSize}px);
      gap:2px;justify-content:center;margin-bottom:var(--gap-md);
      position:relative;user-select:none;touch-action:none;
    `;

    this._cellElements = {};

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < totalCols; c++) {
        const isBorder = r === 0 || r === totalRows - 1 || c === 0 || c === totalCols - 1;
        const cell = document.createElement('div');
        cell.style.width = cellSize + 'px';
        cell.style.height = cellSize + 'px';

        if (isBorder) {
          const tile = this._getPathTileAt(r, c);
          cell.className = 'marble-path-tile';
          if (tile) {
            const isHere = this._marblePath[this._heroPos] === tile;
            if (tile.collected || tile.drop.type === 'empty') {
              cell.textContent = '·';
              cell.style.opacity = tile.collected ? '0.35' : '0.5';
            } else if (tile.isMimic) {
              cell.classList.add('mimic-tile');
              cell.textContent = GOLDEN_MIMIC.emoji;
            } else if (tile.drop.rare) {
              cell.classList.add('rare-drop-tile');
              cell.textContent = tile.drop.emoji;
            } else {
              cell.textContent = tile.drop.emoji;
            }
            if (isHere) {
              cell.classList.add('hero-tile');
              cell.innerHTML = `<span class="hero-fairy">${HERO_EMOJI}</span>`;
            }
          }
        } else {
          const cr = r - 1;
          const cc = c - 1;

          if (this._isEquipmentSlot(cr, cc)) {
            this._renderEquipSlotCell(cell, cr, cc);
          } else if (this._isPetSlot(cr, cc)) {
            this._renderPetSlotCell(cell);
          } else if (this._isHeroSlot(cr, cc)) {
            this._renderHeroSlotCell(cell, cr, cc);
          } else if (this._isDice(cr, cc)) {
            cell.className = 'candy-dice-cell';
            cell.innerHTML = `<span>${this._dice[0]}</span><span>${this._dice[1]}</span>`;
          } else if (this._isChest(cr, cc)) {
            const opened = this._isChestOpened(cr, cc);
            const chest = this._chests[cr + ',' + cc];
            cell.className = 'candy-chest' + (opened ? ' opened' : '');
            if (opened && chest.spirit) {
              cell.textContent = chest.spirit.emoji;
              cell.style.borderColor = RARITY_COLORS[chest.rarity];
            } else {
              cell.textContent = opened ? '✨' : '🎁';
            }
          } else {
            // Special tile (encoded value >= 100) or normal candy
            if (this._isSpecialTile(cr, cc)) {
              const info = this._getSpecialTileInfo(this.board[cr][cc]);
              cell.className = 'candy-cell special-tile';
              cell.textContent = info ? info.emoji : '💫';
            } else {
              cell.className = 'candy-cell';
              cell.textContent = GEMS[this.board[cr][cc]];
            }
            cell.dataset.r = cr;
            cell.dataset.c = cc;
            this._cellElements[cr + ',' + cc] = cell;

            cell.addEventListener('mousedown', (e) => {
              e.preventDefault();
              this._handleMouseDown(cr, cc, e);
            });
            cell.addEventListener('touchstart', (e) => {
              e.preventDefault();
              const t = e.touches[0];
              this._handleMouseDown(cr, cc, t);
            }, { passive: false });
          }
        }
        wrapper.appendChild(cell);
      }
    }

    // Global mouse + touch events
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
    if (!this.isProcessing && this.moves > 0 && !cleared) {
      document.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('mouseup', this._onMouseUp);
      document.addEventListener('touchmove', this._onTouchMove, { passive: false });
      document.addEventListener('touchend', this._onTouchEnd);
    }

    if (cleared) {
      this.container.querySelector('#candy-clear-btn').onclick = () => {
        this._cleanup();
        this.onComplete({ score: this.score, combo: this.totalCombo, diceSum: this._dice[0] + this._dice[1] });
      };
    }

    if (!cleared && this.moves <= 0) {
      this.container.querySelector('#candy-retry-btn').onclick = () => {
        this.score = 200;
        this.moves = this.maxMoves;
        this.comboCount = 0;
        this.totalCombo = 0;
        this._dragging = false;
        this._dragFrom = null;
        this._dragCur = null;
        this._dragTrail = [];
        this.isProcessing = false;
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            if (this.board[r][c] >= 0) {
              this.board[r][c] = this._helperActive
                ? biasedGemIndex(GEMS.length)
                : Math.floor(Math.random() * GEMS.length);
            }
          }
        }
        this._removeInitialMatches();
        if (this._helperActive) this._tilesDestroyed = 0;
        this._matchCount = 0;
        this._fragmentSets = 0;
        this._fragmentProgress = 0;
        this._render();
      };
    }

    // 도우미 해제 버튼
    const dismissBtn = this.container.querySelector('#helper-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        GameState.dismissHelper();
        this._helperActive = false;
        this._helperMsg = MOTHER_OF_WORLD.dialogues.farewell;
        this._render();
      };
    }
  }

  // Update a single cell's visual during drag (no full re-render)
  _updateCellVisual(r, c) {
    const el = this._cellElements[r + ',' + c];
    if (!el || this.board[r][c] < 0) return;
    if (this._isSpecialTile(r, c)) {
      const info = this._getSpecialTileInfo(this.board[r][c]);
      el.textContent = info ? info.emoji : '💫';
    } else {
      el.textContent = GEMS[this.board[r][c]];
    }

    el.classList.remove('dragging', 'trail', 'pad-empty');

    if (this._dragging) {
      if (this._dragCur && this._dragCur[0] === r && this._dragCur[1] === c) {
        el.classList.add('pad-empty');
        el.textContent = '';
      }
      if (this._dragTrail.some(t => t[0] === r && t[1] === c)) {
        el.classList.add('trail');
      }
    }
  }

  // Update board DOM in-place (no full re-render) with animation hints
  _updateBoardDOM(animHints = {}) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const key = r + ',' + c;
        const el = this._cellElements[key];
        if (!el) continue;
        if (this.board[r][c] < 0) continue;

        // Special tile rendering
        if (this._isSpecialTile(r, c)) {
          const info = this._getSpecialTileInfo(this.board[r][c]);
          el.textContent = info ? info.emoji : '💫';
          el.className = 'candy-cell special-tile';
        } else {
          el.textContent = GEMS[this.board[r][c]];
          el.className = 'candy-cell';
        }
        el.style.opacity = '';
        el.style.background = '';
        el.style.borderStyle = '';

        if (animHints.exploding && animHints.exploding.has(key)) {
          el.classList.add('exploding');
        }
        if (animHints.falling && animHints.falling.has(key)) {
          el.classList.add('gem-falling');
        }
        if (animHints.newTile && animHints.newTile.has(key)) {
          el.classList.add('gem-new');
        }
        if (animHints.cleared && animHints.cleared.has(key)) {
          el.classList.add('gem-cleared');
          el.textContent = '';
        }
      }
    }
    this._updateInfoBar();
  }

  _updateInfoBar() {
    const info = this.container.querySelector('#candy-info');
    if (info) {
      const fragBar = Array.from({length: 6}, (_, i) =>
        i < this._fragmentProgress ? '▶️' : '⬛'
      ).join('');
      info.textContent = `🔗 매치: ${this._matchCount}/${this._matchTarget} | 남은 이동: ${this.moves} | 🔮 ${this._fragmentProgress}/6 | 세트: ${this._fragmentSets}`;
    }
    // Update progress bar too
    const fill = this.container.querySelector('.progress-fill');
    if (fill) {
      const pct = Math.min(100, this._matchCount / this._matchTarget * 100);
      fill.style.width = pct + '%';
    }
  }

  // --- P&D Drag (Puzzle & Dragons style) ---

  _handleMouseDown(r, c, e) {
    if (this._externalLock || this.isProcessing || this.moves <= 0 || this._matchCount >= this._matchTarget) return;
    if (this._isSpecial(r, c)) return;

    this._dragging = true;
    this._dragFrom = [r, c];
    this._dragCur = [r, c];
    this._dragTrail = [[r, c]];
    this._dragGemIdx = this.board[r][c];

    this._createFloatingOrb(e.clientX, e.clientY, this._dragGemIdx, this._isSpecialTile(r, c));
    this._updateCellVisual(r, c);
    this._startDragTimer();
  }

  _handleMouseMove(e) {
    if (!this._dragging) { return; }

    if (this._floatingOrb) {
      this._floatingOrb.style.left = (e.clientX - 22) + 'px';
      this._floatingOrb.style.top = (e.clientY - 22) + 'px';
    }

    const wrapper = this.container.querySelector('#candy-board-wrapper');
    if (!wrapper) return;

    if (this._floatingOrb) this._floatingOrb.style.display = 'none';
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (this._floatingOrb) this._floatingOrb.style.display = '';
    if (!el || (!el.classList.contains('candy-cell') && !el.classList.contains('pad-empty') && !el.classList.contains('trail'))) return;

    const nr = parseInt(el.dataset.r);
    const nc = parseInt(el.dataset.c);
    if (isNaN(nr) || isNaN(nc)) return;

    if (this._dragCur[0] !== nr || this._dragCur[1] !== nc) {
      const dr = Math.abs(this._dragCur[0] - nr);
      const dc = Math.abs(this._dragCur[1] - nc);

      if (dr <= 1 && dc <= 1 && (dr + dc > 0)) {
        if (this._isSpecial(nr, nc)) return;

        const [cr, cc] = this._dragCur;
        this.board[cr][cc] = this.board[nr][nc];
        this.board[nr][nc] = this._dragGemIdx;

        // Update dragCur BEFORE visual updates so old position
        // no longer matches the "current drag" check
        this._dragCur = [nr, nc];
        this._dragTrail.push([nr, nc]);

        this._updateCellVisual(cr, cc);  // old pos: shows swapped gem
        this._updateCellVisual(nr, nc);  // new pos: shows empty (gem on cursor)
      }
    }
  }

  async _handleMouseUp() {
    if (!this._dragging) return;

    const didMove = this._dragTrail.length > 1;

    this._removeFloatingOrb();
    this._stopDragTimer();

    // Restore dragged gem to current position
    if (this._dragCur) {
      const [r, c] = this._dragCur;
      this.board[r][c] = this._dragGemIdx;
    }

    this._dragging = false;
    this._dragFrom = null;
    this._dragCur = null;
    this._dragTrail = [];
    this._dragGemIdx = -1;

    if (didMove) {
      this.moves--;
      const prevMatchCount = this._matchCount;
      this.isProcessing = true;
      try {
        this._render();
        await this._wait(150);
        await this._resolveMatches();
      } catch (err) {
        console.error('[CandyMatch] resolve error:', err);
      } finally {
        // ALWAYS reset processing state and re-render
        if (!this._destroyed) {
          this.isProcessing = false;
          this._render();

          // 턴 종료 콜백 (매치가 있었을 때만)
          const matchesMade = this._matchCount - prevMatchCount;
          if (this.onTurnEnd && matchesMade > 0) {
            this.onTurnEnd({
              matchCount: matchesMade,
              totalMatches: this._matchCount,
              combo: this.totalCombo,
              cleared: this._matchCount >= this._matchTarget,
            });
          }
        }
      }
    } else {
      this._render();
    }
  }

  _handleTouchMove(e) {
    if (!this._dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    this._handleMouseMove(t);
  }

  _createFloatingOrb(x, y, gemIdx, isSpecial) {
    this._removeFloatingOrb();
    const orb = document.createElement('div');
    orb.className = 'pad-floating-orb';
    if (isSpecial) {
      const info = this._getSpecialTileInfo(gemIdx);
      orb.textContent = info ? info.emoji : '💫';
      orb.classList.add('special-orb');
    } else {
      orb.textContent = GEMS[gemIdx];
    }
    orb.style.left = (x - 22) + 'px';
    orb.style.top = (y - 22) + 'px';
    document.body.appendChild(orb);
    this._floatingOrb = orb;
  }

  _removeFloatingOrb() {
    if (this._floatingOrb) {
      this._floatingOrb.remove();
      this._floatingOrb = null;
    }
  }

  _startDragTimer() {
    this._dragTimeLeft = this._dragMaxTime;
    const timerBar = this.container.querySelector('#drag-timer');
    const timerFill = this.container.querySelector('#drag-timer-fill');
    if (timerBar) timerBar.style.display = 'block';

    if (this._dragTimerId) clearInterval(this._dragTimerId);
    this._dragTimerId = setInterval(() => {
      this._dragTimeLeft -= 50;
      const pct = Math.max(0, this._dragTimeLeft / this._dragMaxTime * 100);
      if (timerFill) timerFill.style.width = pct + '%';

      if (this._dragTimeLeft <= 0) {
        this._handleMouseUp();
      }
    }, 50);
  }

  _stopDragTimer() {
    if (this._dragTimerId) {
      clearInterval(this._dragTimerId);
      this._dragTimerId = null;
    }
    const timerBar = this.container.querySelector('#drag-timer');
    if (timerBar) timerBar.style.display = 'none';
  }

  _cleanup() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('touchmove', this._onTouchMove);
    document.removeEventListener('touchend', this._onTouchEnd);
  }

  // --- Async Utility ---

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Match Detection ---

  // Get effective gem index (normal gem or special tile's original gem)
  _gemAt(r, c) {
    const v = this.board[r][c];
    if (v < 0) return -1;
    if (v >= SPECIAL_TILE_SYSTEM.boardValueOffset) return this._getSpecialTileGem(v);
    return v;
  }

  _findMatches() {
    const matchGroups = [];
    const allMatched = {};

    // Horizontal
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const gem = this._gemAt(r, c);
        if (gem < 0) { c++; continue; }
        let end = c + 1;
        while (end < this.cols && this._gemAt(r, end) === gem) end++;
        const len = end - c;
        if (len >= 3) {
          const group = [];
          for (let i = c; i < end; i++) { group.push([r, i]); allMatched[r + ',' + i] = true; }
          matchGroups.push({ type: 'h', len, cells: group, gem });
        }
        c = end;
      }
    }

    // Vertical
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const gem = this._gemAt(r, c);
        if (gem < 0) { r++; continue; }
        let end = r + 1;
        while (end < this.rows && this._gemAt(end, c) === gem) end++;
        const len = end - r;
        if (len >= 3) {
          const group = [];
          for (let i = r; i < end; i++) { group.push([i, c]); allMatched[i + ',' + c] = true; }
          matchGroups.push({ type: 'v', len, cells: group, gem });
        }
        r = end;
      }
    }

    return { matchGroups, matchedKeys: Object.keys(allMatched), allMatched };
  }

  // --- Gravity Application ---

  _applyGravity(matchedSet) {
    const matchedByCol = {};
    for (const key of matchedSet) {
      const [mr, mc] = key.split(',').map(Number);
      if (!matchedByCol[mc]) matchedByCol[mc] = [];
      matchedByCol[mc].push(mr);
    }

    const fallenCells = [];
    const newCells = [];

    for (const col in matchedByCol) {
      const c = parseInt(col);
      const removedSet = new Set(matchedByCol[c]);

      // Save original state
      const original = [];
      for (let r = 0; r < this.rows; r++) {
        original[r] = this.board[r][c];
      }

      // Collect remaining gems bottom-up (skip special cells)
      const remaining = [];
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this._isSpecial(r, c)) continue;
        if (!removedSet.has(r)) remaining.push(this.board[r][c]);
      }

      // Place remaining from bottom, then new tiles on top
      let ri = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this._isSpecial(r, c)) continue;
        if (ri < remaining.length) {
          this.board[r][c] = remaining[ri];
          if (this.board[r][c] !== original[r]) {
            fallenCells.push(r + ',' + c);
          }
        } else {
          this.board[r][c] = this._helperActive
            ? biasedGemIndex(GEMS.length)
            : Math.floor(Math.random() * GEMS.length);
          newCells.push(r + ',' + c);
        }
        ri++;
      }
    }

    return { fallenCells, newCells };
  }

  // --- Animated Match Resolution ---

  async _resolveMatches() {
    if (this._destroyed) return;

    let chainCount = 0;
    let totalMatchedCells = 0;
    const matchedGemTypes = new Set();

    while (true) {
      if (this._destroyed) return;

      const { matchGroups, matchedKeys, allMatched } = this._findMatches();
      if (matchedKeys.length === 0) break;

      chainCount++;
      totalMatchedCells += matchedKeys.length;
      if (this._helperActive) this._tilesDestroyed += matchedKeys.length;
      this.comboCount++;

      // 매치 그룹 수만큼 매치 카운트 증가 + 조각 진행
      this._matchCount += matchGroups.length;

      // ★ 60매치 달성 시 즉시 루프 종료 (강제 클리어)
      if (this._matchCount >= this._matchTarget) {
        this.comboCount = 0;
        return;
      }

      for (let mg = 0; mg < matchGroups.length; mg++) {
        this._fragmentProgress++;
        if (this._fragmentProgress >= 6) {
          this._fragmentProgress = 0;
          this._fragmentSets++;
          showToast(`✨ 정령 조각 완성! (보유: ${this._fragmentSets}세트)`);
        }
      }
      this.totalCombo = Math.max(this.totalCombo, this.comboCount);

      // Track which gem types were matched (for spirit item generation)
      for (const group of matchGroups) {
        matchedGemTypes.add(group.gem);
      }

      // --- 매치 단계 판정 ---
      let bestTier = null;
      let bestGroup = null;
      for (const group of matchGroups) {
        const tier = getMatchTier(group.len);
        if (tier && (!bestTier || tier.tier > bestTier.tier)) {
          bestTier = tier;
          bestGroup = group;
        }
      }

      // Calculate score with tier multiplier
      const tierMult = bestTier ? bestTier.scoreMultiplier : 1.0;
      let basePoints = matchedKeys.length * 15;
      let bonusPoints = 0;
      let bonusText = '';

      if (bestTier && bestTier.tier >= 2) {
        bonusText = `${bestTier.emoji} ${bestTier.name}!`;
        bonusPoints += Math.floor(basePoints * (tierMult - 1));
      }

      // T/L shape check
      for (let i = 0; i < matchGroups.length; i++) {
        for (let j = i + 1; j < matchGroups.length; j++) {
          const a = matchGroups[i], b = matchGroups[j];
          if (a.gem !== b.gem || a.type === b.type) continue;
          const intersects = a.cells.some(ac => b.cells.some(bc => ac[0] === bc[0] && ac[1] === bc[1]));
          if (intersects) { bonusPoints += 50; bonusText = 'T/L 매치 보너스!'; }
        }
      }

      const comboBonus = this.comboCount > 1 ? this.comboCount * 15 : 0;
      const totalPoints = basePoints + bonusPoints + comboBonus;
      this.score += totalPoints;

      // --- Rage Gauge fill ---
      this._addRageFromMatch(matchedKeys, this.comboCount);

      // --- Phase 1: Explosion Animation ---
      const matchedSet = new Set(matchedKeys);
      this._updateBoardDOM({ exploding: matchedSet });
      showScoreFloat(totalPoints);
      if (this.comboCount >= 2) showComboText('✨ ' + this.comboCount + 'x 콤보!');
      if (bonusText) showComboText('💥 ' + bonusText);

      // --- 매치 단계 연출 (tier 2+) ---
      if (bestTier && bestTier.tier >= 2) {
        this._showMatchTierEffect(bestTier, bestGroup);
        if (this._helperActive) this._helperMsg = MOTHER_OF_WORLD.dialogues.bigMatch;
      }

      await this._wait(bestTier && bestTier.tier >= 3 ? 550 : 420);

      // --- 매치 시 정령 파츠 드랍 ---
      if (bestTier && MATCH_SPIRIT_DROP.enabled) {
        await this._dropSpiritPartsFromMatch(bestTier, bestGroup);
      }

      if (this._destroyed) return;

      // --- Phase 1.5a: Trigger special tiles caught in this match (chain reaction) ---
      const triggeredExtra = new Set();
      const toCheck = [...matchedKeys];
      const alreadyTriggered = new Set();
      while (toCheck.length > 0) {
        const key = toCheck.shift();
        if (alreadyTriggered.has(key)) continue;
        const [mr, mc] = key.split(',').map(Number);
        if (this._isSpecialTile(mr, mc)) {
          alreadyTriggered.add(key);
          const extraCells = this._triggerSpecialTile(mr, mc);
          for (const ek of extraCells) {
            triggeredExtra.add(ek);
            // 연쇄: 효과로 맞은 셀도 특수 타일이면 추가 발동
            if (!alreadyTriggered.has(ek)) toCheck.push(ek);
          }
        }
      }

      // Add triggered cells to matched set
      if (triggeredExtra.size > 0) {
        for (const ek of triggeredExtra) matchedSet.add(ek);
        this._updateBoardDOM({ exploding: triggeredExtra });
        this.score += triggeredExtra.size * 20;
        showScoreFloat(triggeredExtra.size * 20);
        await this._wait(350);
        if (this._destroyed) return;
      }

      // --- Phase 1.5b: Create special tile for tier 2+ ---
      if (bestTier && bestTier.ability && bestTier.ability.createSpecialTile && bestGroup) {
        this._placeSpecialTile(bestTier, bestGroup, matchedSet);
      }

      // --- Phase 1.5c: Tier 8 purify (no special tile, immediate board clear) ---
      if (bestTier && bestTier.ability && bestTier.ability.type === 'purify') {
        const purgeExtra = this._purifyBoard(bestTier.ability.clearPercent, matchedSet);
        for (const ek of purgeExtra) matchedSet.add(ek);
        if (purgeExtra.size > 0) {
          this._updateBoardDOM({ exploding: purgeExtra });
          this.score += purgeExtra.size * 15;
          showScoreFloat(purgeExtra.size * 15);
          await this._wait(500);
          if (this._destroyed) return;
        }
      }

      // --- Phase 1.5d: Clear exploded cells visually ---
      this._updateBoardDOM({ cleared: matchedSet });
      await this._wait(100);

      if (this._destroyed) return;

      // --- Phase 2: Apply gravity to board array ---
      const { fallenCells, newCells } = this._applyGravity(matchedSet);

      // --- Phase 3: Show fall + new tile animations ---
      this._updateBoardDOM({
        falling: new Set(fallenCells),
        newTile: new Set(newCells)
      });
      await this._wait(350);

      if (this._destroyed) return;
    }

    // All chains resolved
    this.comboCount = 0;

    // Generate bonus spirit rewards from long chains (기존 보너스 유지)
    if (chainCount > 0 && totalMatchedCells >= 15) {
      await this._showMatchSpiritRewards(chainCount, totalMatchedCells);
    }

    // NOTE: isProcessing reset and final _render() handled by caller's finally block
  }

  // --- Spirit Item Rewards from Matches ---

  async _showMatchSpiritRewards(chainCount, totalMatched) {
    if (this._destroyed) return;

    let numItems = 0;
    if (totalMatched >= 20 || chainCount >= 4) numItems = 3;
    else if (totalMatched >= 12 || chainCount >= 3) numItems = 2;
    else if (totalMatched >= 6) numItems = 1;

    if (numItems <= 0) return;

    const items = [];
    for (let i = 0; i < numItems; i++) {
      const rarity = rollSpiritItemRarity();
      const spiritsOfRarity = getSpiritsByRarity(rarity);
      if (!spiritsOfRarity || spiritsOfRarity.length === 0) continue;
      const spirit = spiritsOfRarity[Math.floor(Math.random() * spiritsOfRarity.length)];
      if (!spirit) continue;
      // 파츠 시스템으로 생성
      const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
      GameState.addSpiritItem(partItem);
      items.push({ ...partItem, rarityColor: RARITY_COLORS[rarity], rarityName: RARITY_NAMES[rarity] });
    }

    if (items.length === 0) return;

    // Show reward popup
    let popup = null;
    try {
      popup = document.createElement('div');
      popup.className = 'spirit-reward-popup';
      popup.innerHTML = `
        <div style="color:var(--gold);font-weight:700;margin-bottom:8px;">✨ 정령 파츠 획득!</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          ${items.map(it => `
            <div style="text-align:center;">
              <div style="font-size:28px;">${it.emoji}</div>
              <div style="font-size:9px;color:var(--text-secondary);">${it.partEmoji || ''} ${it.part || ''}</div>
              <div style="font-size:10px;color:${it.rarityColor};font-weight:700;">${it.rarityName}</div>
            </div>
          `).join('')}
        </div>
      `;
      document.body.appendChild(popup);

      await this._wait(1200);
      if (this._destroyed) return;

      // Fly each item to inventory
      const popupRect = popup.getBoundingClientRect();
      for (let i = 0; i < items.length; i++) {
        this._animateFlyToInventory(
          items[i].emoji,
          null,
          popupRect.left + (i + 1) * (popupRect.width / (items.length + 1)),
          popupRect.top + popupRect.height / 2
        );
        await this._wait(150);
      }

      await this._wait(600);
    } finally {
      if (popup) popup.remove();
    }
  }

  // --- Fly-to-Inventory Animation ---

  _animateFlyToInventory(emoji, fromEl, fromX, fromY) {
    let startX, startY;

    if (fromEl) {
      const rect = fromEl.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    } else {
      startX = fromX || window.innerWidth / 2;
      startY = fromY || window.innerHeight / 2;
    }

    const flyEl = document.createElement('div');
    flyEl.className = 'fly-to-inventory';
    flyEl.textContent = emoji;
    flyEl.style.left = startX + 'px';
    flyEl.style.top = startY + 'px';
    document.body.appendChild(flyEl);

    const targetX = window.innerWidth - 50;
    const targetY = 20;
    const dx = targetX - startX;
    const dy = targetY - startY;

    requestAnimationFrame(() => {
      flyEl.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
      flyEl.classList.add('fly-active');
    });

    setTimeout(() => flyEl.remove(), 900);
  }

  // --- Equipment Slot Rendering (신체 부위별 장비 슬롯) ---

  _getEquipSlotInfo(r, c) {
    return EQUIP_SLOT_MAP.find(s => s.pos[0] === r && s.pos[1] === c) || null;
  }

  _getHeroSlotIndex(r, c) {
    return BOARD_SLOT_LAYOUT.heroSlotPositions.findIndex(p => p[0] === r && p[1] === c);
  }

  _renderEquipSlotCell(cell, r, c) {
    const slotInfo = this._getEquipSlotInfo(r, c);
    if (!slotInfo) return;
    const slotKey = slotInfo.key;
    const equippedItem = GameState.equipped[slotKey] || null;

    cell.className = 'board-equip-slot';
    cell.dataset.slotType = 'equipment';
    cell.dataset.slotKey = slotKey;

    if (equippedItem) {
      const rarityColor = RARITY_COLORS[equippedItem.rarity] || '#86efac';
      cell.innerHTML = `<span class="equip-slot-emoji">${equippedItem.emoji}</span>
        <span class="equip-slot-label" style="color:${rarityColor};">${slotInfo.name}</span>`;
      cell.style.borderColor = rarityColor;
      cell.title = `${slotInfo.name}: ${equippedItem.name} (${RARITY_NAMES[equippedItem.rarity] || '일반'})`;
    } else {
      cell.innerHTML = `<span class="equip-slot-empty">${slotInfo.emptyEmoji}</span>
        <span class="equip-slot-label">${slotInfo.name}</span>`;
      cell.title = `${slotInfo.name} — 비어있음`;
    }

    cell.onclick = () => this._onEquipSlotClick(slotKey, equippedItem, slotInfo);
  }

  _renderHeroSlotCell(cell, r, c) {
    const idx = this._getHeroSlotIndex(r, c);
    const hero = GameState.heroSlots[idx] || null;
    const unlocked = isSlotUnlocked(idx, GameState.currentStage, GameState.heroLevel);
    const slotNum = idx + 1; // 1-based display

    cell.className = 'board-hero-slot';
    cell.dataset.slotType = 'hero';
    cell.dataset.slotIdx = idx;

    if (!unlocked) {
      cell.classList.add('slot-locked');
      cell.innerHTML = `<span class="hero-slot-locked">${HERO_SLOT_CONFIG.display.lockedSlotEmoji}</span>`;
      cell.title = HERO_SLOT_CONFIG.slotUnlock[idx]?.label || '잠김';
    } else if (hero) {
      const rarityColor = RARITY_COLORS[hero.rarity] || '#9b8aff';
      const attr = ATTRIBUTES[hero.attribute];
      const attrEmoji = attr ? attr.emoji : '';
      const heroLv = hero.level || 1;
      cell.innerHTML = `
        <span class="hero-slot-emoji">${hero.emoji}</span>
        <span class="hero-slot-name" style="font-size:8px;color:${rarityColor};position:absolute;bottom:1px;left:50%;transform:translateX(-50%);white-space:nowrap;">${hero.name}</span>
        <span class="hero-slot-attr-badge" style="color:${attr?.color || '#fff'};">${attrEmoji}</span>
      `;
      cell.style.borderColor = rarityColor;
      cell.title = `영웅${slotNum}: ${hero.name} Lv.${heroLv} (${RARITY_NAMES[hero.rarity] || '일반'}) [${attr?.name || ''}]`;
    } else {
      cell.innerHTML = `<span class="hero-slot-empty" style="font-size:16px;">⚔️</span><span style="font-size:8px;color:#9b8aff;position:absolute;bottom:2px;left:50%;transform:translateX(-50%);">영웅${slotNum}</span>`;
      cell.title = `영웅 ${slotNum} — 비어있음`;
    }

    cell.onclick = () => this._onHeroSlotClick(idx, hero, unlocked);
  }

  _renderPetSlotCell(cell) {
    const pet = GameState.petSlot;
    const unlocked = isPetSlotUnlocked(GameState.currentStage);

    cell.className = 'board-pet-slot';
    cell.dataset.slotType = 'pet';

    if (!unlocked) {
      cell.classList.add('slot-locked');
      cell.innerHTML = `<span class="pet-slot-locked">${PET_SLOT_CONFIG.display.lockedSlotEmoji}</span>`;
      cell.title = PET_SLOT_CONFIG.unlock.label || '잠김';
    } else if (pet) {
      const rarityColor = RARITY_COLORS[pet.rarity] || '#86efac';
      cell.innerHTML = `<span class="pet-slot-emoji">${pet.emoji}</span>`;
      cell.style.borderColor = rarityColor;
      cell.title = `${pet.name} (${pet.ability?.description || ''})`;
    } else {
      cell.innerHTML = `<span class="pet-slot-empty">${PET_SLOT_CONFIG.display.emptySlotEmoji}</span>`;
      cell.title = PET_SLOT_CONFIG.display.emptySlotLabel;
    }

    cell.onclick = () => {
      if (this.isProcessing || this._dragging) return;
      if (!unlocked) { showToast('🔒 펫 슬롯 — 추후 해금'); return; }
      if (!pet) { showToast('🐾 빈 펫 슬롯 — 펫을 장착하세요'); return; }
      showToast(`🐾 ${pet.name}: ${pet.ability?.description || ''}`);
    };
  }

  _onEquipSlotClick(slotKey, equippedItem, slotInfo) {
    if (this.isProcessing || this._dragging) return;
    if (!equippedItem) {
      showToast(`${slotInfo.emptyEmoji} ${slotInfo.name} — 비어있음`);
      return;
    }
    // Show item detail popup
    this._showItemDetailPopup(equippedItem);
  }

  _onHeroSlotClick(idx, hero, unlocked) {
    if (this.isProcessing || this._dragging) return;
    if (!unlocked) {
      const unlock = HERO_SLOT_CONFIG.slotUnlock[idx];
      showToast(`🔒 ${unlock?.label || '잠김'}`);
      return;
    }
    if (!hero) {
      showToast('👤 빈 영웅 슬롯 — 영웅을 장착하세요');
      return;
    }
    // Show hero detail popup
    this._showHeroDetailPopup(hero, idx);
  }

  _showItemDetailPopup(item) {
    const existing = document.querySelector('.slot-detail-popup');
    if (existing) existing.remove();

    const rarityColor = RARITY_COLORS[item.rarity] || '#86efac';
    const popup = document.createElement('div');
    popup.className = 'slot-detail-popup';
    popup.innerHTML = `
      <div class="slot-detail-header" style="border-bottom:2px solid ${rarityColor};">
        <span style="font-size:32px;">${item.emoji}</span>
        <div>
          <div style="font-weight:700;">${item.name}</div>
          <div style="font-size:11px;color:${rarityColor};">${RARITY_NAMES[item.rarity] || '일반'} ${item.slot ? '(' + item.slot + ')' : ''}</div>
        </div>
      </div>
      ${item.stats ? `<div class="slot-detail-stats">
        ${Object.entries(item.stats).map(([k, v]) => `<span>${k}: ${v > 0 ? '+' : ''}${v}</span>`).join(' ')}
      </div>` : ''}
      <button class="btn btn-sm" id="slot-popup-close" style="margin-top:8px;">닫기</button>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#slot-popup-close').onclick = () => popup.remove();
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 5000);
  }

  _showHeroDetailPopup(hero, slotIdx) {
    const existing = document.querySelector('.slot-detail-popup');
    if (existing) existing.remove();

    const rarityColor = RARITY_COLORS[hero.rarity] || '#9b8aff';
    const attr = ATTRIBUTES[hero.attribute];
    const attrName = attr?.name || hero.attribute || '?';
    const attrEmoji = attr?.emoji || '';

    // 중복 제한 여부 표시
    const isRestricted = HERO_SLOT_CONFIG.duplication.restrictedRarities.includes(hero.rarity);
    const dupInfo = isRestricted
      ? `<div class="dup-rule-badge dup-restricted">⚠️ 같은 등급+속성 중복 불가</div>`
      : `<div class="dup-rule-badge dup-free">✅ 중복 제한 없음</div>`;

    // 현재 장착된 같은 등급 영웅들 표시
    let occupiedList = '';
    if (isRestricted) {
      const sameRarity = GameState.heroSlots.filter((h, i) => h && i !== slotIdx && h.rarity === hero.rarity);
      if (sameRarity.length > 0) {
        occupiedList = `<div class="dup-occupied-list">
          <div style="font-size:10px;color:var(--text-muted);margin-bottom:3px;">같은 등급 장착 중:</div>
          ${sameRarity.map(h => {
            const hAttr = ATTRIBUTES[h.attribute];
            const conflict = h.attribute === hero.attribute;
            return `<span class="dup-occupied-chip ${conflict ? 'dup-conflict' : ''}">${h.emoji} ${hAttr?.emoji || ''} ${hAttr?.name || ''}</span>`;
          }).join(' ')}
        </div>`;
      }
    }

    const popup = document.createElement('div');
    popup.className = 'slot-detail-popup';
    popup.innerHTML = `
      <div class="slot-detail-header" style="border-bottom:2px solid ${rarityColor};">
        <span style="font-size:32px;" class="hero-fairy">${hero.emoji}</span>
        <div>
          <div style="font-weight:700;">${hero.name}</div>
          <div style="font-size:11px;color:${rarityColor};">${RARITY_NAMES[hero.rarity] || '일반'} · ${attrEmoji} ${attrName}</div>
        </div>
      </div>
      ${dupInfo}
      ${occupiedList}
      ${hero.passiveSkill ? `<div class="slot-detail-skill">
        <div style="color:var(--gold);font-size:11px;font-weight:600;">패시브: ${hero.passiveSkill.name}</div>
        <div style="font-size:10px;color:var(--text-secondary);">${hero.passiveSkill.description}</div>
      </div>` : ''}
      ${hero.activeSkill ? `<div class="slot-detail-skill">
        <div style="color:var(--pink);font-size:11px;font-weight:600;">액티브: ${hero.activeSkill.name}</div>
        <div style="font-size:10px;color:var(--text-secondary);">${hero.activeSkill.description}</div>
      </div>` : ''}
      <button class="btn btn-sm touch-btn" id="slot-popup-close" style="margin-top:8px;"><span class="touch-icon">👆</span> 닫기</button>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#slot-popup-close').onclick = () => popup.remove();
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 8000);
  }

  // 중복 장착 경고 팝업 (equipHeroToSlot 실패 시 호출)
  _showDuplicateWarning(hero, conflictHero) {
    const existing = document.querySelector('.dup-warning-popup');
    if (existing) existing.remove();

    const heroAttr = ATTRIBUTES[hero.attribute];
    const conflictAttr = ATTRIBUTES[conflictHero.attribute];
    const rarityColor = RARITY_COLORS[hero.rarity] || '#ff6b6b';

    const popup = document.createElement('div');
    popup.className = 'dup-warning-popup';
    popup.innerHTML = `
      <div class="dup-warning-icon">🚫</div>
      <div class="dup-warning-title">중복 장착 불가!</div>
      <div class="dup-warning-body">
        <div class="dup-warning-row">
          <span class="dup-warning-hero" style="border-color:${rarityColor};">
            ${hero.emoji}<br><span style="font-size:10px;">${hero.name}</span>
          </span>
          <span class="dup-warning-vs">⚡</span>
          <span class="dup-warning-hero" style="border-color:${rarityColor};">
            ${conflictHero.emoji}<br><span style="font-size:10px;">${conflictHero.name}</span>
          </span>
        </div>
        <div class="dup-warning-reason">
          같은 등급 <span style="color:${rarityColor};font-weight:700;">${RARITY_NAMES[hero.rarity] || ''}</span>
          + 같은 속성 <span style="color:${heroAttr?.color || '#fff'};font-weight:700;">${heroAttr?.emoji || ''} ${heroAttr?.name || ''}</span>
        </div>
        <div class="dup-warning-hint">💡 다른 속성의 영웅을 장착하세요!</div>
      </div>
      <button class="btn btn-sm touch-btn" id="dup-warning-close"><span class="touch-icon">👆</span> 확인</button>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#dup-warning-close').onclick = () => popup.remove();
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 6000);
  }

  // --- Special Tile Logic ---

  // Place a special tile at the center of the matched group
  _placeSpecialTile(tier, group, matchedSet) {
    if (!group || !group.cells || group.cells.length === 0) return;

    // Find center cell of the match group
    const mid = Math.floor(group.cells.length / 2);
    const [pr, pc] = group.cells[mid];

    // Map ability type to special tile index (7 types)
    // 0=h_line, 1=v_line, 2=area, 3=lightning, 4=rainbow, 5=cross, 6=mega
    const typeMap = { area_bomb: 2, lightning: 3, rainbow: 4, cross_bomb: 5, mega_bomb: 6 };
    let typeIdx;
    if (tier.ability.specialTileType === 'line_bomb') {
      // 가로매치 → 가로라인(행 제거), 세로매치 → 세로라인(열 제거)
      typeIdx = group.type === 'h' ? 0 : 1;
    } else {
      typeIdx = typeMap[tier.ability.specialTileType] ?? 2;
    }

    // Encode: preserve original gem + special type
    const encoded = this._encodeSpecialTile(group.gem, typeIdx);
    this.board[pr][pc] = encoded;

    // Remove this cell from the matched set so it survives gravity
    matchedSet.delete(pr + ',' + pc);
  }

  // Trigger a special tile's effect, returns set of extra cell keys to clear
  _triggerSpecialTile(r, c) {
    const val = this.board[r][c];
    const typeIdx = this._getSpecialTileType(val);
    const gem = this._getSpecialTileGem(val);
    const extra = new Set();

    switch (typeIdx) {
      case 0: // h_line_bomb — 가로 라인 (행 전체 제거)
        for (let i = 0; i < this.cols; i++) {
          if (!this._isSpecial(r, i) && this.board[r][i] >= 0) extra.add(r + ',' + i);
        }
        break;

      case 1: // v_line_bomb — 세로 라인 (열 전체 제거)
        for (let i = 0; i < this.rows; i++) {
          if (!this._isSpecial(i, c) && this.board[i][c] >= 0) extra.add(i + ',' + c);
        }
        break;

      case 2: { // area_bomb — 3×3
        const radius = 1;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !this._isSpecial(nr, nc) && this.board[nr][nc] >= 0) {
              extra.add(nr + ',' + nc);
            }
          }
        }
        break;
      }

      case 3: { // lightning — random 5 extra tiles
        const candidates = [];
        for (let rr = 0; rr < this.rows; rr++) {
          for (let cc = 0; cc < this.cols; cc++) {
            if (!this._isSpecial(rr, cc) && this.board[rr][cc] >= 0 && (rr !== r || cc !== c)) {
              candidates.push(rr + ',' + cc);
            }
          }
        }
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        for (let i = 0; i < Math.min(5, candidates.length); i++) {
          extra.add(candidates[i]);
        }
        break;
      }

      case 4: { // rainbow — clear all tiles of the same gem type
        for (let rr = 0; rr < this.rows; rr++) {
          for (let cc = 0; cc < this.cols; cc++) {
            if (this._isSpecial(rr, cc)) continue;
            if (this._gemAt(rr, cc) === gem) extra.add(rr + ',' + cc);
          }
        }
        break;
      }

      case 5: // cross_bomb — 십자 (행+열 동시 제거)
        for (let i = 0; i < this.cols; i++) {
          if (!this._isSpecial(r, i) && this.board[r][i] >= 0) extra.add(r + ',' + i);
        }
        for (let i = 0; i < this.rows; i++) {
          if (!this._isSpecial(i, c) && this.board[i][c] >= 0) extra.add(i + ',' + c);
        }
        break;

      case 6: { // mega_bomb — 5×5
        const radius = 2;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !this._isSpecial(nr, nc) && this.board[nr][nc] >= 0) {
              extra.add(nr + ',' + nc);
            }
          }
        }
        break;
      }
    }

    return extra;
  }

  // Purify: clear a percentage of the board (tier 8)
  _purifyBoard(clearPercent, alreadyMatched) {
    const candidates = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const key = r + ',' + c;
        if (this._isSpecial(r, c) || this.board[r][c] < 0 || alreadyMatched.has(key)) continue;
        candidates.push(key);
      }
    }
    // Shuffle and take clearPercent
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const count = Math.floor(candidates.length * clearPercent);
    const extra = new Set();
    for (let i = 0; i < count; i++) extra.add(candidates[i]);
    return extra;
  }

  // --- Match Tier Effects ---

  _showMatchTierEffect(tier, group) {
    if (!tier || !tier.animation || this._destroyed) return;

    const wrapper = this.container.querySelector('#candy-board-wrapper');
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();

    // 매치 중심점 계산
    let cx = wrapperRect.left + wrapperRect.width / 2;
    let cy = wrapperRect.top + wrapperRect.height / 2;
    if (group && group.cells.length > 0) {
      const midCell = group.cells[Math.floor(group.cells.length / 2)];
      const totalCols = this.cols + 2;
      const gridIdx = (midCell[0] + 1) * totalCols + (midCell[1] + 1);
      const cellEl = wrapper.children[gridIdx];
      if (cellEl) {
        const cellRect = cellEl.getBoundingClientRect();
        cx = cellRect.left + cellRect.width / 2;
        cy = cellRect.top + cellRect.height / 2;
      }
    }

    // 파티클 생성
    const anim = tier.animation;
    const emojis = anim.particleEmojis || ['✨'];
    const count = Math.min(anim.particles || 5, 20);

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'match-tier-particle';
      p.textContent = emojis[i % emojis.length];
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.color = tier.color;
      const angle = (i / count) * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      p.style.animationDelay = (i * 30) + 'ms';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), (anim.duration || 600) + 200);
    }

    // 단계 텍스트 표시 (tier 3+)
    if (tier.tier >= 3) {
      const label = document.createElement('div');
      label.className = 'match-tier-label';
      label.style.left = cx + 'px';
      label.style.top = cy + 'px';
      label.style.color = tier.color;
      label.innerHTML = `<span class="match-tier-emoji">${tier.emoji}</span><span>${tier.name}</span>`;
      document.body.appendChild(label);
      setTimeout(() => label.remove(), 1200);
    }

    // 화면 흔들림 (tier 4+)
    if (tier.tier >= 4 && wrapper) {
      wrapper.classList.add('match-tier-shake');
      setTimeout(() => wrapper.classList.remove('match-tier-shake'), 300);
    }

    // 화면 플래시 (tier 6+)
    if (tier.tier >= 6) {
      const flash = document.createElement('div');
      flash.className = 'match-tier-flash';
      flash.style.background = `radial-gradient(circle, ${tier.color}40, ${tier.color}00 70%)`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 500);
    }
  }

  // --- 매치 시 정령 파츠 드랍 ---

  async _dropSpiritPartsFromMatch(tier, group) {
    if (this._destroyed || !tier) return;

    // 드랍 확률 체크 (도우미 활성 시 +30%)
    let dropChance = tier.spiritDropChance;
    if (this._helperActive) dropChance += MOTHER_OF_WORLD.bonuses.spiritDropBonus * 100;
    const roll = Math.random() * 100;
    if (roll > dropChance) return;

    // 도우미 활성 시 드랍 메시지
    if (this._helperActive) this._helperMsg = MOTHER_OF_WORLD.dialogues.spiritDrop;

    // 드랍 개수: 기본 1 + 보너스
    const dropCount = 1 + (tier.spiritDropBonus || 0);

    // 매치 중심점 찾기
    const wrapper = this.container.querySelector('#candy-board-wrapper');
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    if (wrapper && group && group.cells.length > 0) {
      const midCell = group.cells[Math.floor(group.cells.length / 2)];
      const totalCols = this.cols + 2;
      const gridIdx = (midCell[0] + 1) * totalCols + (midCell[1] + 1);
      const cellEl = wrapper.children[gridIdx];
      if (cellEl) {
        const rect = cellEl.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
    }

    const items = [];
    for (let i = 0; i < dropCount; i++) {
      // tier에 따라 등급 롤
      const rarity = rollSpiritRarityByTier(tier.tier);
      const spiritsOfRarity = getSpiritsByRarity(rarity);
      if (!spiritsOfRarity || spiritsOfRarity.length === 0) continue;
      const spirit = spiritsOfRarity[Math.floor(Math.random() * spiritsOfRarity.length)];
      if (!spirit) continue;

      const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
      GameState.addSpiritItem(partItem);
      items.push({ ...partItem, rarityColor: RARITY_COLORS[rarity] });
    }

    if (items.length === 0) return;

    // 드랍 연출: 매치 위치에서 떠오른 후 인벤토리로 이동
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const dropEl = document.createElement('div');
      dropEl.className = 'match-drop-spirit';
      dropEl.innerHTML = `<span>${item.emoji}</span><span class="match-drop-part">${item.partEmoji || ''}</span>`;
      dropEl.style.left = (startX + (i - items.length / 2) * 24) + 'px';
      dropEl.style.top = startY + 'px';
      dropEl.style.borderColor = item.rarityColor;
      document.body.appendChild(dropEl);

      // Phase 1: 위로 떠오르기
      await this._wait(80);
      dropEl.classList.add('match-drop-float');

      // Phase 2: 인벤토리로 이동
      setTimeout(() => {
        if (dropEl.parentNode) {
          dropEl.classList.remove('match-drop-float');
          dropEl.classList.add('match-drop-fly');
          const targetX = window.innerWidth - 50 - parseFloat(dropEl.style.left);
          const targetY = 20 - parseFloat(dropEl.style.top);
          dropEl.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.3)`;
          dropEl.style.opacity = '0';
        }
      }, MATCH_SPIRIT_DROP.dropAnimation.floatUpDuration);

      setTimeout(() => { if (dropEl.parentNode) dropEl.remove(); },
        MATCH_SPIRIT_DROP.dropAnimation.floatUpDuration + MATCH_SPIRIT_DROP.dropAnimation.flyToInventoryDuration + 100);
    }

    // 드랍 텍스트 표시
    const dropText = document.createElement('div');
    dropText.className = 'match-drop-text';
    dropText.style.left = startX + 'px';
    dropText.style.top = (startY - 30) + 'px';
    dropText.textContent = `✨ 정령 파츠 ×${items.length}`;
    document.body.appendChild(dropText);
    setTimeout(() => dropText.remove(), 1000);
  }

  // --- Rage Gauge ---

  _addRageFromMatch(matchedKeys, comboCount) {
    if (!RAGE_GAUGE) return;
    const rates = RAGE_GAUGE.fillRates.stage1;
    let rage = 0;

    // Base: per tile cleared
    rage += matchedKeys.length * rates.candyTileClear;

    // Combo bonus
    if (comboCount > 1) {
      rage += rates.comboBonus * (comboCount - 1);
    }

    if (rage > 0) {
      GameState.addRage(rage);
      this._checkRageTrigger();
    }
  }

  _checkRageTrigger() {
    if (GameState.rageGauge >= 100) {
      // Rage skill auto-trigger!
      this._triggerRageSkill();
    }
  }

  _triggerRageSkill() {
    this.isProcessing = true;
    const wrapper = this.container.querySelector('#candy-board-wrapper');
    if (!wrapper) { this.isProcessing = false; GameState.resetRage(); return; }

    // ── 1. 주사위 셀 위치 찾기 (주인공 출발점) ──
    const [diceR, diceC] = this._diceCell.split(',').map(Number);
    const totalCols = this.cols + 2;
    const diceGridIdx = (diceR + 1) * totalCols + (diceC + 1); // +1 for border
    const diceEl = wrapper.children[diceGridIdx];
    const wrapperRect = wrapper.getBoundingClientRect();
    const centerX = wrapperRect.left + wrapperRect.width / 2;
    const centerY = wrapperRect.top + wrapperRect.height / 2;

    // ── 2. 주인공 플라이 엘리먼트 생성 ──
    const heroFly = document.createElement('div');
    heroFly.className = 'rage-fly-hero';
    heroFly.innerHTML = `<span class="hero-fairy">${HERO_EMOJI}</span>`;
    const diceRect = diceEl ? diceEl.getBoundingClientRect() : { left: centerX - 20, top: centerY - 20, width: 40, height: 40 };
    heroFly.style.left = (diceRect.left + diceRect.width / 2) + 'px';
    heroFly.style.top = (diceRect.top + diceRect.height / 2) + 'px';
    document.body.appendChild(heroFly);

    showComboText('💢 정화의 빛!');

    // ── 3. 주인공 → 화면 중앙으로 비행 ──
    requestAnimationFrame(() => {
      heroFly.classList.add('rage-fly-to-center');
      heroFly.style.left = centerX + 'px';
      heroFly.style.top = centerY + 'px';
    });

    // ── 4. 슬롯 영웅들 수집 + 자리 위치 계산 ──
    const slotHeroFlies = [];
    GameState.heroSlots.forEach((hero, idx) => {
      if (!hero) return;
      const pos = BOARD_SLOT_LAYOUT.heroSlotPositions[idx];
      if (!pos) return;
      const gridIdx = (pos[0] + 1) * totalCols + (pos[1] + 1);
      const slotEl = wrapper.children[gridIdx];
      if (!slotEl) return;

      const slotRect = slotEl.getBoundingClientRect();
      const fly = document.createElement('div');
      fly.className = 'rage-fly-slot-hero';
      fly.innerHTML = `<span style="font-size:20px;">${hero.emoji}</span>`;
      fly.style.left = (slotRect.left + slotRect.width / 2) + 'px';
      fly.style.top = (slotRect.top + slotRect.height / 2) + 'px';
      fly.dataset.originX = slotRect.left + slotRect.width / 2;
      fly.dataset.originY = slotRect.top + slotRect.height / 2;
      document.body.appendChild(fly);
      slotHeroFlies.push(fly);
    });

    // ── 5. 타이밍 체인 ──
    const FLY_DUR = 400;
    const IMPACT_DELAY = 100;
    const SLOT_DELAY = 200;
    const IMPACT_DUR = 600;
    const WAVE_DUR = 600;
    const RETURN_DUR = 350;

    // 5a. 주인공 도착 후 → 임팩트 시작
    setTimeout(() => {
      // 화면 흔들기
      wrapper.classList.add('rage-screen-shake');
      setTimeout(() => wrapper.classList.remove('rage-screen-shake'), 300);

      // 화면 플래시
      const flash = document.createElement('div');
      flash.className = 'rage-flash';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 400);

      // 중앙 임팩트 폭발 링
      this._createImpactRings(centerX, centerY);

      // 주인공 임팩트 포즈
      heroFly.classList.add('rage-hero-impact');

    }, FLY_DUR + IMPACT_DELAY);

    // 5b. 슬롯 영웅들 제자리에서 버스트
    setTimeout(() => {
      slotHeroFlies.forEach((fly, i) => {
        setTimeout(() => {
          fly.classList.add('rage-slot-burst');
        }, i * 80);
      });
    }, FLY_DUR + SLOT_DELAY);

    // 5c. 캔디 타일 광범위 제거 (금빛 파동)
    setTimeout(() => {
      this._rageWaveClearBoard(wrapper);
    }, FLY_DUR + IMPACT_DELAY + 200);

    // 5d. 주인공 → 주사위 위치로 귀환
    setTimeout(() => {
      heroFly.classList.remove('rage-hero-impact');
      heroFly.classList.add('rage-fly-return');
      heroFly.style.left = (diceRect.left + diceRect.width / 2) + 'px';
      heroFly.style.top = (diceRect.top + diceRect.height / 2) + 'px';
    }, FLY_DUR + IMPACT_DELAY + IMPACT_DUR);

    // 5e. 슬롯 영웅들 귀환
    setTimeout(() => {
      slotHeroFlies.forEach(fly => {
        fly.classList.remove('rage-slot-burst');
        fly.classList.add('rage-slot-return');
      });
    }, FLY_DUR + SLOT_DELAY + 500);

    // ── 6. 정리 + 보드 재렌더 ──
    const totalTime = FLY_DUR + IMPACT_DELAY + IMPACT_DUR + RETURN_DUR + 200;
    setTimeout(() => {
      heroFly.remove();
      slotHeroFlies.forEach(f => f.remove());
      showConfetti();
      GameState.resetRage();
      this.isProcessing = false;
      this._render();
    }, totalTime);
  }

  // 임팩트 폭발 링 생성 (3겹 방사형)
  _createImpactRings(cx, cy) {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const ring = document.createElement('div');
        ring.className = 'rage-impact-ring';
        ring.style.left = cx + 'px';
        ring.style.top = cy + 'px';
        document.body.appendChild(ring);
        setTimeout(() => ring.remove(), 800);
      }, i * 120);
    }
    // 이모지 파편들
    const emojis = ['✨', '💫', '⚡', '🔥', '💥', '✨', '💫', '⚡'];
    emojis.forEach((em, i) => {
      const frag = document.createElement('div');
      frag.className = 'rage-impact-fragment';
      frag.textContent = em;
      const angle = (i / emojis.length) * Math.PI * 2;
      frag.style.left = cx + 'px';
      frag.style.top = cy + 'px';
      frag.style.setProperty('--tx', Math.cos(angle) * 120 + 'px');
      frag.style.setProperty('--ty', Math.sin(angle) * 120 + 'px');
      document.body.appendChild(frag);
      setTimeout(() => frag.remove(), 900);
    });
  }

  // 분노 스킬 — 캔디 타일 광범위 제거 (금빛 파동)
  _rageWaveClearBoard(wrapper) {
    const centerR = Math.floor(this.rows / 2);
    const centerC = Math.floor(this.cols / 2);
    let clearedCount = 0;
    const totalCandyCells = [];

    // 모든 일반 캔디 셀 수집 + 중심 거리 계산
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] >= 0) {
          const dist = Math.abs(r - centerR) + Math.abs(c - centerC);
          totalCandyCells.push({ r, c, dist });
        }
      }
    }

    // 75% 제거 (가까운 것부터 우선)
    totalCandyCells.sort((a, b) => a.dist - b.dist);
    const clearCount = Math.ceil(totalCandyCells.length * 0.75);
    const toClear = totalCandyCells.slice(0, clearCount);

    toClear.forEach(({ r, c, dist }, idx) => {
      const delay = dist * 50 + idx * 15;
      setTimeout(() => {
        const totalCols = this.cols + 2;
        const gridIdx = (r + 1) * totalCols + (c + 1);
        const cellEl = wrapper.children[gridIdx];
        if (cellEl) {
          cellEl.classList.add('rage-tile-explode');
        }
        this.board[r][c] = this._helperActive
          ? biasedGemIndex(GEMS.length)
          : Math.floor(Math.random() * GEMS.length); // 새 타일로 교체
        clearedCount++;
        this.score += 10; // 타일당 보너스 점수
      }, delay);
    });

    // 점수 표시
    const bonusDamage = GameState.player.attack * 3;
    this.score += bonusDamage;
    showScoreFloat(bonusDamage + clearCount * 10);
  }

  _getRagePhase() {
    const rage = GameState.rageGauge;
    const phases = RAGE_GAUGE.icon.chargingPhases;
    let current = phases[0];
    for (const p of phases) {
      if (rage >= p.threshold) current = p;
    }
    return current;
  }

  /** 외부에서 보드 잠금/해제 (주사위/마블 진행 중) */
  setLocked(locked) {
    this._externalLock = locked;
  }

  /** 현재 매치 수 조회 */
  getMatchCount() {
    return this._matchCount;
  }

  /** 클리어 여부 조회 */
  isCleared() {
    return this._matchCount >= this._matchTarget;
  }

  destroy() {
    this._destroyed = true;
    this._cleanup();
    this._removeFloatingOrb();
    this._stopDragTimer();
    // 오류 방지: document.body에 남은 팝업/오버레이 정리
    this._cleanupOrphanPopups();
  }

  /** document.body에 남은 게임 팝업/오버레이 제거 */
  _cleanupOrphanPopups() {
    const selectors = [
      '.spirit-reward-popup',
      '.marble-event-overlay',
      '.match-tier-particle',
      '.match-tier-label',
      '.match-tier-flash',
      '.match-drop-spirit',
      '.match-drop-text',
      '.fly-to-inventory',
      '.magnet-pull-item',
      '.rage-fly-hero',
      '.rage-fly-slot-hero',
      '.rage-impact-ring',
      '.rage-impact-fragment',
      '.rage-flash',
      '.pet-fly-heal',
      '.pet-heal-ring',
      '.pet-heal-particle',
      '.pet-heal-flash',
      '.heal-number-float',
      '.pad-floating-orb',
      '.summon-tutorial-overlay',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => el.remove());
    }
  }
}
