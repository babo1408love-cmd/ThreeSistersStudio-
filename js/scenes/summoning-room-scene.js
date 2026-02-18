// Summoning Room Scene — 조각 6개 = 정령 소환 + 펫 진화 탭
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import SPIRITS, { RARITY_COLORS, RARITY_NAMES, RARITY_BG } from '../data/spirits.js';
import { SPIRIT_PARTS, PART_KEYS, autoMatchParts, countLegendFragments, determineSummonResult } from '../data/spirit-parts-config.js';
import { createHudBar, updateHud } from '../ui/hud.js';
import { showConfetti, showToast } from '../ui/toast.js';
import { getRarityInfo } from '../systems/rarity-manager.js';
import { PET_EVOLUTION, PET_EVOLUTION_POOL } from '../systems/pet-evolution-system.js';
import { hasSummonTutorialSeen, showSummonTutorial } from '../ui/summon-tutorial.js';

export default class SummoningRoomScene {
  onCreate() {
    this._revealOverlay = null;
    this._activeTab = 'summon'; // 'summon' | 'pet'
  }

  render() {
    this.el.innerHTML = '';
    const hud = createHudBar();
    this.el.appendChild(hud);

    const container = document.createElement('div');
    container.className = 'summoning-scene';
    container.id = 'summoning-container';
    this.el.appendChild(container);

    this._renderContent(container);
  }

  _renderContent(container) {
    const spiritItems = GameState.spiritItems;
    const spirits = GameState.spirits;

    // 조각 수 계산
    const normalFragments = spiritItems.filter(item => item.rarity !== 'legendary');
    const legendFragments = countLegendFragments(spiritItems);
    const spiritsFull = spirits.length >= (GameState.MAX_SPIRITS || 10);
    const canSummon = normalFragments.length >= 6 && !spiritsFull;

    // 펫 진화 가능 여부
    const canEvolvePet = legendFragments >= 6;

    // 탭 활성 상태
    const tab = this._activeTab;

    container.innerHTML = `
      <div class="scene-title" style="color:var(--purple);">🌳 소환의 나무</div>

      <!-- 탭 -->
      <div style="display:flex;gap:4px;justify-content:center;margin-bottom:12px;">
        <button class="btn ${tab === 'summon' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-summon">
          🌳 정령 소환
        </button>
        <button class="btn ${tab === 'pet' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="tab-pet">
          🐉 펫 진화
        </button>
      </div>

      <div id="tab-content"></div>

      <!-- 소환된 정령 -->
      <div style="margin:16px 0 8px;">
        <div style="color:var(--text-secondary);font-size:0.85em;margin-bottom:8px;">
          소환된 정령 (${spirits.length}/${GameState.MAX_SPIRITS || 10}마리)${GameState.petSlot ? ` | 펫: ${GameState.petSlot.emoji} ${GameState.petSlot.name}` : ''}
        </div>
        <div class="spirit-slots" id="spirit-slots" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
          ${spirits.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85em;">아직 소환된 정령이 없습니다</div>' : ''}
          ${this._renderSpiritStacks(spirits)}
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px;">
        <button class="btn btn-primary btn-lg" id="btn-depart">⚔️ 전투 출발!</button>
      </div>
    `;

    // 탭 전환
    container.querySelector('#tab-summon').onclick = () => {
      this._activeTab = 'summon';
      this._renderContent(container);
    };
    container.querySelector('#tab-pet').onclick = () => {
      this._activeTab = 'pet';
      this._renderContent(container);
    };

    // 탭 컨텐츠 렌더
    const tabContent = container.querySelector('#tab-content');
    if (tab === 'summon') {
      this._renderSummonTab(tabContent, normalFragments, legendFragments, canSummon);
    } else {
      this._renderPetTab(tabContent, legendFragments, canEvolvePet);
    }

    // 출발 버튼
    container.querySelector('#btn-depart').onclick = () => {
      GameState.currentPhase = 'combat';
      GameState.fullHeal();
      SaveManager.saveCheckpoint();
      SaveManager.save();
      SceneManager.go('stage2');
    };
  }

  // ── 정령 소환 탭 ──
  _renderSummonTab(el, normalFragments, legendFragments, canSummon) {
    const normalCount = normalFragments.length;
    const fragBar = Array.from({length: 6}, (_, i) =>
      i < (normalCount % 6 || (normalCount >= 6 ? 6 : 0)) ? '▶️' : '⬛'
    ).join('');
    const setsAvailable = Math.floor(normalCount / 6);
    const spiritsFull = GameState.spirits.length >= (GameState.MAX_SPIRITS || 10);

    el.innerHTML = `
      <div class="summoning-tree" id="summon-tree" style="font-size:60px;margin:8px 0;">🌳</div>

      <div style="font-size:0.9em;color:var(--text-secondary);margin-bottom:8px;">
        조각 6개를 모으면 정령을 소환할 수 있어요!
      </div>

      ${spiritsFull ? `
        <div style="margin-bottom:12px;padding:10px;background:rgba(255,100,100,0.15);border:1px solid rgba(255,100,100,0.4);border-radius:8px;">
          <div style="font-size:0.95em;color:#ff6b6b;font-weight:700;text-align:center;">
            더이상 소환할수 없습니다
          </div>
          <div style="font-size:0.8em;color:var(--text-secondary);text-align:center;margin-top:4px;">
            정령 보유 한도 ${GameState.MAX_SPIRITS || 10}마리에 도달했습니다
          </div>
        </div>
      ` : ''}

      <div style="margin-bottom:12px;">
        <div style="font-size:0.85em;margin-bottom:4px;">
          일반 조각: <b style="color:var(--green);">${normalCount}</b>개
          ${normalCount >= 6 && !spiritsFull ? `(${setsAvailable}회 소환 가능!)` : normalCount >= 6 && spiritsFull ? '(정령 한도 초과)' : `(${6 - normalCount % 6}개 더 필요)`}
        </div>
        <div style="font-size:0.85em;color:var(--text-muted);">
          레전드 조각: <b style="color:var(--gold);">${legendFragments}</b>개 (펫 진화용)
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:0.85em;color:var(--text-muted);margin-bottom:4px;">소환 확률</div>
        <div style="display:flex;gap:8px;justify-content:center;font-size:0.8em;">
          <span style="color:#b2bec3;">⬜ 커먼 45%</span>
          <span style="color:#74b9ff;">🟦 레어 30%</span>
          <span style="color:#a29bfe;">🟪 에픽 25%</span>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <button class="btn ${canSummon ? 'btn-primary' : 'btn-disabled'} btn-lg" id="btn-summon"
          ${canSummon ? '' : 'disabled'} style="${canSummon ? 'animation:pulse 1.5s infinite;' : 'opacity:0.4;'}">
          🌳 정령 소환! (조각 6개)
        </button>
      </div>
    `;

    const summonBtn = el.querySelector('#btn-summon');
    if (canSummon && summonBtn) {
      summonBtn.onclick = () => this._doAutoSummon();
    }
  }

  // ── 펫 진화 탭 ──
  _renderPetTab(el, legendCount, canEvolve) {
    const fragSlots = Array.from({length: 6}, (_, i) =>
      i < legendCount ? '🟨' : '⬛'
    ).join('');
    const pets = GameState.spirits.filter(s => s.isPet);
    const equippedPet = GameState.petSlot;

    el.innerHTML = `
      <div style="font-size:60px;margin:8px 0;">🐉</div>

      <div style="font-size:0.9em;color:var(--text-secondary);margin-bottom:8px;">
        레전드 조각 6개를 모아 펫으로 진화시키세요!
      </div>

      <div style="margin-bottom:12px;">
        <div style="font-size:0.85em;margin-bottom:4px;">
          레전드 조각: <b style="color:var(--gold);">${legendCount}</b>/6 필요
        </div>
        <div style="font-size:1.5em;letter-spacing:4px;margin:8px 0;">${fragSlots}</div>
      </div>

      <div style="margin-bottom:16px;">
        <button class="btn ${canEvolve ? 'btn-primary' : 'btn-disabled'} btn-lg" id="btn-evolve"
          ${canEvolve ? '' : 'disabled'} style="${canEvolve ? 'animation:pulse 1.5s infinite;' : 'opacity:0.4;'}">
          🐉 펫 진화! (레전드 조각 6개)
        </button>
        ${!canEvolve ? `<div style="font-size:0.75em;color:var(--text-muted);margin-top:6px;">
          💡 보스를 처치하면 레전드 조각을 얻을 수 있어요!
        </div>` : ''}
      </div>

      <div style="border-top:1px solid var(--border-subtle);padding-top:12px;">
        <div style="color:var(--text-secondary);font-size:0.85em;margin-bottom:8px;">보유 펫</div>
        ${equippedPet ? `
          <div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-bottom:8px;">
            <span style="font-size:28px;">${equippedPet.emoji}</span>
            <div style="text-align:left;">
              <div style="font-weight:700;color:var(--gold);">${equippedPet.name}</div>
              <div style="font-size:0.8em;color:var(--text-secondary);">${equippedPet.passive || ''}</div>
            </div>
          </div>
        ` : '<div style="color:var(--text-muted);font-size:0.85em;">아직 펫이 없어요</div>'}
      </div>

      <div style="margin-top:12px;font-size:0.75em;color:var(--text-muted);border:1px solid var(--border-subtle);border-radius:8px;padding:8px;">
        <div style="font-weight:700;margin-bottom:4px;">정령 vs 펫 비교</div>
        <div>🌳 정령: 조각 6개 → 커먼~에픽 → 1판만 참전</div>
        <div>🐉 펫: 레전드 조각 6개 → 레전드 고정 → 영구 장착!</div>
      </div>
    `;

    const evolveBtn = el.querySelector('#btn-evolve');
    if (canEvolve && evolveBtn) {
      evolveBtn.onclick = () => this._doPetEvolve();
    }
  }

  // ── 정령 스택 렌더 (같은 속성+등급 묶기) ──
  _renderSpiritStacks(spirits) {
    if (spirits.length === 0) return '';
    const stacks = {};
    for (const s of spirits) {
      const key = `${s.key || s.name}_${s.rarity}`;
      if (!stacks[key]) stacks[key] = { spirit: s, count: 0 };
      stacks[key].count++;
    }
    return Object.values(stacks).map(({ spirit, count }) => {
      const rColor = RARITY_COLORS[spirit.rarity] || '#86efac';
      return `<div class="spirit-slot filled" style="border-color:${rColor};position:relative;" title="${spirit.name} (${RARITY_NAMES[spirit.rarity] || spirit.rarity})${spirit.ability ? '\n' + spirit.ability.description : ''}">
        ${spirit.emoji}
        ${count > 1 ? `<span style="position:absolute;top:-4px;right:-4px;background:${rColor};color:#000;font-size:10px;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-weight:700;">×${count}</span>` : ''}
      </div>`;
    }).join('');
  }

  // ── 자동 매칭 소환 ──
  _doAutoSummon() {
    if (GameState.spirits.length >= (GameState.MAX_SPIRITS || 10)) {
      showToast('더이상 소환할수 없습니다');
      return;
    }

    const matchResult = autoMatchParts(GameState.spiritItems);
    if (!matchResult.success) {
      showToast('조각이 부족합니다!');
      return;
    }

    // 소환 결과 결정 (랜덤 등급)
    const resultSpirit = determineSummonResult(matchResult.selectedParts, SPIRITS);
    if (!resultSpirit) {
      showToast('소환 실패...');
      return;
    }

    // 사용된 조각 제거
    const usedIdSet = new Set(matchResult.usedIds);
    GameState.spiritItems = GameState.spiritItems.filter(item => !usedIdSet.has(item.id));

    // 정령 인스턴스 생성
    const spirit = {
      ...resultSpirit,
      id: Date.now(),
      level: 1,
      exp: 0
    };
    GameState.summonSpirit(spirit);

    // 소환 연출
    this._showSummonReveal(spirit);
  }

  // ── 펫 진화 ──
  _doPetEvolve() {
    const result = PET_EVOLUTION.evolve(GameState.spiritItems);
    if (!result.success) {
      showToast('레전드 조각이 부족합니다!');
      return;
    }

    // 조각 업데이트 + 펫 장착
    GameState.spiritItems = result.remaining;
    GameState.equipPet(result.pet);

    // 연출
    this._showPetEvolveReveal(result.pet);
  }

  _showSummonReveal(spirit) {
    showConfetti();

    const rarityId = spirit.rarityId || 1;
    const rarityInfo = getRarityInfo(rarityId);
    const badgeClass = ({common:'green',rare:'purple',magic:'cyan',epic:'gold',legendary:'red'})[spirit.rarity] || 'green';

    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.innerHTML = `
      <div class="summon-reveal__spirit" style="font-size:80px;">${spirit.emoji}</div>
      <div class="summon-reveal__name" style="font-size:1.3em;font-weight:700;margin:8px 0;">${spirit.name}</div>
      <div style="margin:8px 0;">
        <span class="badge badge-${badgeClass}" style="font-size:1em;">
          ${rarityInfo.emoji} ${rarityInfo.name} ${rarityInfo.stars}
        </span>
      </div>
      <div style="font-size:0.85em;margin-top:8px;">
        방어: ${spirit.defense || 1} | 공격: ${spirit.spiritAtk || spirit.stats?.attack || 10} | 공속: ${spirit.spiritAtkSpeed || 2.0}초
      </div>
      ${spirit.ability ? `<div style="margin-top:4px;font-size:0.85em;color:var(--gold);">${spirit.ability.name}: ${spirit.ability.description}</div>` : ''}
      <button class="btn btn-primary" style="margin-top:24px;" id="reveal-close">확인</button>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#reveal-close').onclick = () => {
      overlay.remove();
      const c = this.el.querySelector('#summoning-container');
      if (c) this._renderContent(c);
    };
  }

  _showPetEvolveReveal(pet) {
    showConfetti();

    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.innerHTML = `
      <div style="font-size:80px;animation:pulse 1s infinite;">${pet.emoji}</div>
      <div style="font-size:1.5em;font-weight:700;color:var(--gold);margin:12px 0;">🌟 펫 진화 성공! 🌟</div>
      <div style="font-size:1.2em;font-weight:700;">${pet.name}</div>
      <div style="margin:8px 0;">
        <span class="badge badge-gold" style="font-size:1em;">🟨 레전드 ★★★★☆</span>
      </div>
      <div style="font-size:0.9em;margin-top:8px;">
        패시브: <b style="color:var(--green);">${pet.passive}</b>
      </div>
      <div style="font-size:0.85em;color:var(--text-secondary);margin-top:4px;">
        방어: ${pet.defense} | 공격: ${pet.atk} | 공속: ${pet.atkSpeed}초
      </div>
      <div style="font-size:0.8em;color:var(--text-muted);margin-top:12px;">
        💕 펫은 영구 동반자! 항상 함께해요!
      </div>
      <button class="btn btn-primary" style="margin-top:24px;" id="reveal-close">확인</button>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#reveal-close').onclick = () => {
      overlay.remove();
      const c = this.el.querySelector('#summoning-container');
      if (c) this._renderContent(c);
    };
  }

  onEnter() {
    GameState.currentPhase = 'summoning';
    updateHud();

    // 첫 방문 시 소환/펫 진화 튜토리얼
    if (!hasSummonTutorialSeen()) {
      showSummonTutorial();
    }
  }
}
