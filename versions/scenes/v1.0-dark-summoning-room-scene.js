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
import { HERO_ROSTER } from '../data/hero-config.js';
import { HERO_SLOT_CONFIG, isSlotUnlocked, canEquipHero } from '../data/inventory-config.js';
import { drawSpirit, ATTR_INFO, BODY_SHAPES, EYE_STYLES, DECORATIONS, WING_TYPES } from '../generators/spirit-generator.js';
import HeroCore from '../systems/hero-core.js';

// 등급 문자열 → 숫자 매핑 (spirit-generator는 숫자 rarity 사용)
const RARITY_TO_NUM = { common: 1, rare: 2, magic: 3, epic: 4, legendary: 5 };
// 정령 키 → 속성 매핑 (spirits.js에 attribute 필드가 없으므로)
const KEY_TO_ATTR = {
  fairy:'light', mushroom:'nature', candy:'light', water:'water',
  diamond:'ice', star:'light', moon:'dark', thunder:'lightning',
  blossom:'nature', crystal:'ice', rainbow:'light', fire:'fire',
  ice:'ice', cosmos:'dark', phoenix_lord:'fire', void_dragon:'dark',
};

// ── 정령 비주얼 생성 (spirit-generator 연동) ──
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/** 소환된 정령에 시각 속성 부여 (bodyShape, eyeStyle 등) */
function enrichSpiritVisual(spirit) {
  if (spirit.bodyShape) return spirit; // 이미 비주얼 있으면 스킵
  const attr = spirit.attribute || KEY_TO_ATTR[spirit.key] || 'light';
  spirit.attribute = attr;
  spirit.bodyShape = _pick(BODY_SHAPES).id;
  spirit.eyeStyle = _pick(EYE_STYLES).id;
  spirit.decoration = _pick(DECORATIONS).id;
  spirit.wingType = _pick(WING_TYPES).id;
  spirit.rarityNum = RARITY_TO_NUM[spirit.rarity] || 1;
  return spirit;
}

/** 정령을 Canvas에 그려서 dataURL 반환 (캐싱용) */
function renderSpiritToImage(spirit, size = 80) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const drawData = {
    ...spirit,
    rarity: spirit.rarityNum || RARITY_TO_NUM[spirit.rarity] || 1,
  };
  drawSpirit(ctx, drawData, size / 2, size / 2, size * 0.8);
  return canvas.toDataURL();
}

export default class SummoningRoomScene {
  onCreate() {
    this._revealOverlay = null;
    this._activeTab = 'summon'; // 'summon' | 'pet' | 'party'
    this._spiritImageCache = {}; // id → dataURL 캐시
  }

  render() {
    this.el.innerHTML = '';
    const hud = createHudBar();
    this.el.appendChild(hud);

    const container = document.createElement('div');
    container.className = 'pg';
    container.style.textAlign = 'center';
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
      <div class="pg-hdr" style="justify-content:center;">
        <h2>🌳 소환의 나무</h2>
      </div>

      <!-- 탭 -->
      <div class="pg-tabs">
        <button class="pg-tab ${tab === 'summon' ? 'active' : ''}" id="tab-summon">🌳 정령 소환</button>
        <button class="pg-tab ${tab === 'pet' ? 'active' : ''}" id="tab-pet">🐉 펫 진화</button>
        <button class="pg-tab ${tab === 'party' ? 'active' : ''}" id="tab-party">⚔️ 파티</button>
      </div>

      <div id="tab-content"></div>

      <div class="pg-row pg-row-center" style="margin-top:clamp(8px,3vw,14px);">
        <button class="pg-btn pg-btn-pri" id="btn-depart" style="padding:clamp(6px,2.5vw,12px) clamp(16px,6vw,28px);font-size:var(--label-lg);">⚔️ 전투 출발!</button>
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
    container.querySelector('#tab-party').onclick = () => {
      this._activeTab = 'party';
      this._renderContent(container);
    };

    // 탭 컨텐츠 렌더
    const tabContent = container.querySelector('#tab-content');
    if (tab === 'summon') {
      this._renderSummonTab(tabContent, normalFragments, legendFragments, canSummon, spirits);
    } else if (tab === 'pet') {
      this._renderPetTab(tabContent, legendFragments, canEvolvePet);
    } else if (tab === 'party') {
      this._renderPartyTab(tabContent, container);
    }

    // 출발 버튼
    container.querySelector('#btn-depart').onclick = () => {
      GameState.currentPhase = 'combat';
      GameState.fullHeal();

      // HeroAI 파티 동기화 + 스탯 계산
      this._syncHeroAI();

      SaveManager.saveCheckpoint();
      SaveManager.save();
      SceneManager.go('stage2');
    };
  }

  // ── 정령 소환 탭 ──
  _renderSummonTab(el, normalFragments, legendFragments, canSummon, spirits) {
    const normalCount = normalFragments.length;
    const maxSpirits = GameState.MAX_SPIRITS || 10;
    const currentCount = GameState.spirits.length;
    const remaining = maxSpirits - currentCount;
    const spiritsFull = remaining <= 0;
    const setsAvailable = Math.floor(normalCount / 6);
    const summonableCount = Math.min(setsAvailable, remaining);

    el.innerHTML = `
      <div class="summoning-tree" id="summon-tree" style="font-size:var(--icon-hero);margin:clamp(6px,2.5vw,12px) 0;">🌳</div>

      <div class="pg-text-sm" style="color:var(--text-secondary);margin-bottom:clamp(4px,2vw,10px);">
        조각 6개를 모으면 정령을 소환할 수 있어요!
      </div>

      <!-- 보유 현황 -->
      <div class="pg-card" style="justify-content:center;margin-bottom:clamp(4px,2vw,10px);cursor:default;">
        <div class="pg-card-info" style="text-align:center;">
          <div class="pg-card-name">정령 보유: <span style="color:${spiritsFull ? '#ff6b6b' : 'var(--green)'};">${currentCount}</span> / ${maxSpirits}마리</div>
          ${!spiritsFull ? `<div class="pg-card-desc">(${remaining}마리 소환 가능)</div>` : ''}
        </div>
      </div>

      ${spiritsFull ? `
        <div class="pg-card" style="border-color:rgba(255,100,100,0.4);background:rgba(255,100,100,0.1);cursor:default;margin-bottom:clamp(4px,2vw,10px);">
          <div class="pg-card-info" style="text-align:center;">
            <div class="pg-card-name" style="color:#ff6b6b;">정령이 가득 찼습니다</div>
            <div class="pg-card-desc">정령을 해방하거나 전투에서 소모한 후 다시 소환하세요</div>
          </div>
        </div>
      ` : ''}

      <div style="margin-bottom:clamp(8px,3vw,14px);">
        <div class="pg-text-sm">
          일반 조각: <b class="pg-text-green">${normalCount}</b>개
          ${setsAvailable >= 1 && !spiritsFull ? `(${summonableCount}회 소환 가능!)` : setsAvailable >= 1 && spiritsFull ? '(정령 가득 참)' : `(${6 - normalCount % 6}개 더 필요)`}
        </div>
        <div class="pg-text-sm pg-text-muted">
          레전드 조각: <b class="pg-text-gold">${legendFragments}</b>개 (펫 진화용)
        </div>
      </div>

      <div style="margin-bottom:clamp(8px,3vw,14px);">
        <div class="pg-text-sm pg-text-muted" style="margin-bottom:clamp(2px,1vw,6px);">소환 확률</div>
        <div style="display:flex;gap:clamp(4px,2vw,10px);justify-content:center;font-size:var(--label-md);">
          <span style="color:#b2bec3;">⬜ 커먼 45%</span>
          <span style="color:#74b9ff;">🟦 레어 30%</span>
          <span style="color:#a29bfe;">🟪 에픽 25%</span>
        </div>
      </div>

      ${this._renderPityBar('pet')}

      <div style="margin-bottom:clamp(10px,4vw,18px);display:flex;flex-direction:column;gap:clamp(4px,2vw,10px);align-items:center;">
        <button class="pg-btn pg-btn-pri" id="btn-summon"
          ${canSummon && !spiritsFull ? '' : 'disabled'} style="padding:clamp(6px,2.5vw,12px) clamp(14px,5vw,24px);${canSummon && !spiritsFull ? 'animation:pulse 1.5s infinite;' : 'opacity:0.4;'}">
          🌳 정령 소환! (조각 6개)
        </button>
        ${summonableCount >= 2 ? `
          <button class="pg-btn pg-btn-pri" id="btn-summon-all"
            style="padding:clamp(6px,2.5vw,12px) clamp(14px,5vw,24px);background:linear-gradient(135deg,var(--purple),var(--gold));border:none;">
            🌟 모두 소환! (${summonableCount}회)
          </button>
        ` : ''}
      </div>
    `;

    // 소환된 정령 목록
    const spiritSection = document.createElement('div');
    spiritSection.innerHTML = `
      <div class="pg-section" style="text-align:left;margin-top:clamp(8px,3vw,14px);">
        소환된 정령 (${spirits.length}/${GameState.MAX_SPIRITS || 10}마리)${GameState.petSlot ? ` | 펫: ${GameState.petSlot.emoji} ${GameState.petSlot.name}` : ''}
      </div>
      <div class="spirit-slots" id="spirit-slots" style="display:flex;gap:clamp(4px,1.5vw,8px);justify-content:center;flex-wrap:wrap;">
        ${spirits.length === 0 ? '<div class="pg-text-muted pg-text-sm">아직 소환된 정령이 없습니다</div>' : ''}
        ${this._renderSpiritStacks(spirits)}
      </div>
    `;
    el.appendChild(spiritSection);

    const summonBtn = el.querySelector('#btn-summon');
    if (canSummon && summonBtn) {
      summonBtn.onclick = () => this._doAutoSummon();
    }
    const summonAllBtn = el.querySelector('#btn-summon-all');
    if (summonAllBtn) {
      summonAllBtn.onclick = () => this._doSummonAll();
    }

    // 정령 삭제 버튼 바인딩
    el.querySelectorAll('.spirit-delete-badge').forEach(badge => {
      badge.onclick = (e) => {
        e.stopPropagation();
        const slot = badge.closest('.spirit-slot');
        const spiritId = Number(slot?.dataset?.spiritId);
        const spiritKey = slot?.dataset?.spiritKey;
        const spiritRarity = slot?.dataset?.spiritRarity;
        if (spiritId) this._deleteSpirit(spiritId, spiritKey, spiritRarity, this.el.querySelector('#summoning-container'));
      };
    });
  }

  // ── 펫 진화 탭 ──
  _renderPetTab(el, legendCount, canEvolve) {
    const fragSlots = Array.from({length: 6}, (_, i) =>
      i < legendCount ? '🟨' : '⬛'
    ).join('');
    const equippedPet = GameState.petSlot;

    el.innerHTML = `
      <div style="font-size:var(--icon-hero);margin:clamp(6px,2.5vw,12px) 0;">🐉</div>

      <div class="pg-text-sm" style="color:var(--text-secondary);margin-bottom:clamp(4px,2vw,10px);">
        레전드 조각 6개를 모아 펫으로 진화시키세요!
      </div>

      <div style="margin-bottom:clamp(8px,3vw,14px);">
        <div class="pg-text-sm">
          레전드 조각: <b class="pg-text-gold">${legendCount}</b>/6 필요
        </div>
        <div style="font-size:var(--icon-lg);letter-spacing:4px;margin:clamp(4px,2vw,10px) 0;">${fragSlots}</div>
      </div>

      <div style="margin-bottom:clamp(10px,4vw,18px);display:flex;flex-direction:column;gap:clamp(4px,2vw,10px);align-items:center;">
        <button class="pg-btn pg-btn-pri" id="btn-evolve"
          ${canEvolve ? '' : 'disabled'} style="padding:clamp(6px,2.5vw,12px) clamp(14px,5vw,24px);${canEvolve ? 'animation:pulse 1.5s infinite;' : 'opacity:0.4;'}">
          🐉 펫 진화! (레전드 조각 6개)
        </button>
        ${!canEvolve ? `<div class="pg-text-sm pg-text-muted" style="margin-top:clamp(2px,1vw,6px);">
          💡 보스를 처치하면 레전드 조각을 얻을 수 있어요!
        </div>` : ''}
      </div>

      <div class="pg-section" style="text-align:left;">보유 펫</div>
      ${equippedPet ? `
        <div class="pg-card" style="justify-content:center;cursor:default;">
          <div class="pg-emoji">${equippedPet.emoji}</div>
          <div class="pg-card-info">
            <div class="pg-card-name pg-text-gold">${equippedPet.name}</div>
            <div class="pg-card-desc">${equippedPet.passive || ''}</div>
          </div>
        </div>
      ` : '<div class="pg-text-muted pg-text-sm" style="padding:clamp(8px,3vw,14px) 0;">아직 펫이 없어요</div>'}

      <div class="pg-card" style="margin-top:clamp(6px,2.5vw,12px);cursor:default;text-align:left;">
        <div class="pg-card-info">
          <div class="pg-card-name" style="font-size:var(--label-md);">정령 vs 펫 비교</div>
          <div class="pg-card-desc">🌳 정령: 조각 6개 → 커먼~에픽 → 1판만 참전</div>
          <div class="pg-card-desc">🐉 펫: 레전드 조각 6개 → 레전드 고정 → 영구 장착!</div>
        </div>
      </div>
    `;

    const evolveBtn = el.querySelector('#btn-evolve');
    if (canEvolve && evolveBtn) {
      evolveBtn.onclick = () => this._doPetEvolve();
    }
  }

  // ── 파티 편성 탭 ──
  _renderPartyTab(el, container) {
    const heroCount = GameState.heroSlots.filter(h => h).length;
    const petCount = GameState.petSlot ? 1 : 0;

    el.innerHTML = `
      <div style="font-size:var(--icon-xxl);margin:clamp(4px,2vw,10px) 0;">⚔️</div>

      <div class="pg-text-sm" style="color:var(--text-secondary);margin-bottom:clamp(8px,3vw,14px);">
        전투에 함께할 영웅과 펫을 편성하세요!
      </div>

      <div class="pg-card" style="justify-content:center;margin-bottom:clamp(8px,3vw,14px);cursor:default;">
        <div class="pg-card-info" style="text-align:center;">
          <div class="pg-card-name">영웅 <span style="color:var(--purple);">${heroCount}</span>/5 | 펫 <span style="color:var(--green);">${petCount}</span>/1</div>
        </div>
      </div>

      <div style="margin:clamp(8px,3.5vw,16px) 0 clamp(4px,2vw,10px);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:clamp(4px,2vw,10px);">
          <div class="pg-text-sm" style="color:var(--text-secondary);">
            ⚔️ 파티 편성
          </div>
          <button class="pg-btn pg-btn-sec" id="btn-auto-party" style="font-size:var(--label-xs);padding:clamp(2px,1vw,6px) clamp(4px,2vw,10px);">✨ 모두 편성</button>
        </div>
        <div style="display:flex;gap:clamp(4px,1.5vw,8px);justify-content:center;flex-wrap:wrap;" id="party-slots">
          ${this._renderPartySlots()}
        </div>
      </div>

      <div class="pg-card" style="margin-top:clamp(6px,2.5vw,12px);cursor:default;text-align:left;">
        <div class="pg-card-info">
          <div class="pg-card-name" style="font-size:var(--label-md);">파티 안내</div>
          <div class="pg-card-desc">👤 슬롯 클릭 → 영웅 선택/해제</div>
          <div class="pg-card-desc">🐾 펫 슬롯 클릭 → 펫 정보 확인</div>
          <div class="pg-card-desc">✨ "모두 편성" → 최강 영웅 자동 배치</div>
        </div>
      </div>
    `;

    // 파티 슬롯 클릭 바인딩 (영웅 선택)
    el.querySelectorAll('.party-hero-slot').forEach(slot => {
      slot.onclick = () => {
        const idx = Number(slot.dataset.slotIdx);
        this._showHeroPicker(idx, container);
      };
    });
    // 펫 슬롯 클릭
    const petSlotEl = el.querySelector('.party-pet-slot');
    if (petSlotEl) {
      petSlotEl.onclick = () => this._showPetInfo(container);
    }
    // 모두 편성 버튼
    const autoPartyBtn = el.querySelector('#btn-auto-party');
    if (autoPartyBtn) {
      autoPartyBtn.onclick = () => this._autoAssignParty(container);
    }
  }

  // ── 정령 스택 렌더 (Canvas 비주얼 + 삭제 버튼) ──
  _renderSpiritStacks(spirits) {
    if (spirits.length === 0) return '';
    const stacks = {};
    for (const s of spirits) {
      enrichSpiritVisual(s);
      const key = `${s.key || s.name}_${s.rarity}`;
      if (!stacks[key]) stacks[key] = { spirit: s, count: 0, ids: [] };
      stacks[key].count++;
      stacks[key].ids.push(s.id);
    }
    return Object.values(stacks).map(({ spirit, count, ids }) => {
      const rColor = RARITY_COLORS[spirit.rarity] || '#86efac';
      const firstId = ids[0];
      const attrInfo = ATTR_INFO[spirit.attribute] || { emoji:'✨', color:'#FFD700' };

      const cacheKey = `${spirit.key}_${spirit.rarity}_${spirit.bodyShape}`;
      if (!this._spiritImageCache[cacheKey]) {
        this._spiritImageCache[cacheKey] = renderSpiritToImage(spirit, 56);
      }
      const imgUrl = this._spiritImageCache[cacheKey];

      return `<div class="spirit-slot filled" style="border-color:${rColor};position:relative;cursor:pointer;flex-direction:column;gap:clamp(1px,0.5vw,3px);" title="${spirit.name} (${RARITY_NAMES[spirit.rarity] || spirit.rarity})${spirit.ability ? '\n' + spirit.ability.description : ''}\n클릭: 삭제" data-spirit-id="${firstId}" data-spirit-key="${spirit.key || spirit.name}" data-spirit-rarity="${spirit.rarity}">
        <img src="${imgUrl}" width="48" height="48" style="image-rendering:pixelated;filter:drop-shadow(0 0 4px ${attrInfo.color});">
        <span style="font-size:clamp(0.45em,1.5vw,0.65em);color:${rColor};white-space:nowrap;overflow:hidden;max-width:60px;text-align:center;">${spirit.name}</span>
        ${count > 1 ? `<span style="position:absolute;top:-4px;right:-4px;background:${rColor};color:#000;font-size:clamp(12px,3.2vw,15px);border-radius:50%;width:clamp(16px,5vw,22px);height:clamp(16px,5vw,22px);display:flex;align-items:center;justify-content:center;font-weight:700;">×${count}</span>` : ''}
        <span class="spirit-delete-badge" style="position:absolute;bottom:-4px;right:-4px;background:#ff4444;color:#fff;font-size:var(--label-md);border-radius:50%;width:clamp(14px,4.5vw,20px);height:clamp(14px,4.5vw,20px);display:flex;align-items:center;justify-content:center;font-weight:700;cursor:pointer;">✕</span>
      </div>`;
    }).join('');
  }

  // ── 1회 소환 ──
  _doAutoSummon() {
    if (GameState.spirits.length >= (GameState.MAX_SPIRITS || 10)) {
      showToast('정령이 가득 찼습니다!');
      return;
    }

    const matchResult = autoMatchParts(GameState.spiritItems);
    if (!matchResult.success) {
      showToast('조각이 부족합니다!');
      return;
    }

    const resultSpirit = determineSummonResult(matchResult.selectedParts, SPIRITS);
    if (!resultSpirit) {
      showToast('소환 실패...');
      return;
    }

    // 조각 소모
    const usedIdSet = new Set(matchResult.usedIds);
    GameState.spiritItems = GameState.spiritItems.filter(item => !usedIdSet.has(item.id));

    // 정령 생성
    const spirit = enrichSpiritVisual({
      ...resultSpirit,
      id: Date.now(),
      level: 1,
      exp: 0
    });
    GameState.summonSpirit(spirit);
    try { this._absorbSpiritToHero(spirit); } catch(e) { console.warn('[Summon] absorb:', e); }

    // 소환 연출 (연속 뽑기와 동일 — 리스트 형식 + 자동 닫힘)
    showConfetti();
    const attrInfo = ATTR_INFO[spirit.attribute] || { name:'빛', emoji:'✨', color:'#FFD700' };
    const rarityId = spirit.rarityId || 1;
    const ri = getRarityInfo(rarityId);
    const badgeClass = ({common:'green',rare:'purple',magic:'cyan',epic:'gold',legendary:'red'})[spirit.rarity] || 'green';

    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.innerHTML = `
      <div style="font-size:clamp(1em,4vw,1.8em);font-weight:700;margin-bottom:clamp(8px,3vw,14px);">🌳 소환 완료!</div>
      <div style="display:flex;align-items:center;gap:clamp(8px,3vw,14px);padding:clamp(8px,3vw,14px);background:rgba(255,255,255,0.05);border-radius:12px;">
        <span style="font-size:var(--icon-lg);">${attrInfo.emoji}</span>
        <div style="flex:1;text-align:left;">
          <div style="font-weight:700;font-size:var(--label-lg);">${spirit.name}</div>
          <div style="font-size:var(--label-md);color:${attrInfo.color};">${attrInfo.name} 속성</div>
        </div>
        <span class="badge badge-${badgeClass}">${ri.emoji}${ri.stars}</span>
      </div>
      <div class="pg-card" style="margin-top:clamp(8px,3vw,14px);cursor:default;border-color:rgba(100,255,150,0.4);background:rgba(100,255,150,0.1);">
        <div class="pg-card-info" style="text-align:center;">
          <div class="pg-card-name" style="color:#66ffaa;">🧚 주인공에게 자동 흡수!</div>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      this.render();
    }, 2500);

    showToast(`${attrInfo.emoji} ${spirit.name} 소환!`);
  }

  // ── 모두 소환 ──
  async _doSummonAll() {
    const maxSpirits = GameState.MAX_SPIRITS || 10;
    const summoned = [];

    while (GameState.spirits.length < maxSpirits) {
      const matchResult = autoMatchParts(GameState.spiritItems);
      if (!matchResult.success) break;

      const resultSpirit = determineSummonResult(matchResult.selectedParts, SPIRITS);
      if (!resultSpirit) break;

      const usedIdSet = new Set(matchResult.usedIds);
      GameState.spiritItems = GameState.spiritItems.filter(item => !usedIdSet.has(item.id));

      const spirit = enrichSpiritVisual({ ...resultSpirit, id: Date.now() + summoned.length, level: 1, exp: 0 });
      GameState.summonSpirit(spirit);
      this._absorbSpiritToHero(spirit);
      summoned.push(spirit);
    }

    if (summoned.length === 0) {
      showToast('소환할 조각이 부족합니다!');
      return;
    }

    showConfetti();
    const listHtml = summoned.map(s => {
      const attrInfo = ATTR_INFO[s.attribute] || { name:'빛', emoji:'✨', color:'#FFD700' };
      const rarityId = s.rarityId || 1;
      const ri = getRarityInfo(rarityId);
      const badgeClass = ({common:'green',rare:'purple',magic:'cyan',epic:'gold',legendary:'red'})[s.rarity] || 'green';
      return `<div style="display:flex;align-items:center;gap:clamp(4px,2vw,10px);padding:clamp(4px,1.5vw,8px) 0;border-bottom:1px solid rgba(255,255,255,0.1);">
        <span style="font-size:clamp(16px,4.5vw,22px);">${attrInfo.emoji}</span>
        <span style="flex:1;font-weight:600;">${s.name}</span>
        <span class="badge badge-${badgeClass}" style="font-size:var(--label-md);">${ri.emoji}${ri.stars}</span>
      </div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.innerHTML = `
      <div style="font-size:clamp(1em,4vw,1.8em);font-weight:700;margin-bottom:clamp(8px,3vw,14px);">🌟 ${summoned.length}마리 소환 완료!</div>
      <div style="max-height:300px;overflow-y:auto;width:100%;padding:0 clamp(4px,2vw,10px);">${listHtml}</div>
      <div class="pg-card" style="margin-top:clamp(8px,3vw,14px);cursor:default;border-color:rgba(100,255,150,0.4);background:rgba(100,255,150,0.1);">
        <div class="pg-card-info" style="text-align:center;">
          <div class="pg-card-name" style="color:#66ffaa;">🧚 모두 주인공에게 자동 흡수!</div>
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      this.render();
    }, 3000);

    showToast(`🌟 ${summoned.length}마리 자동 흡수 완료!`);
  }

  // ── 펫 진화 (HeroCore 가챠 경유) ──
  _doPetEvolve() {
    const hero = HeroCore.getInstance();
    const result = hero.gacha.evolvePet();
    if (!result.success) {
      showToast('레전드 조각이 부족합니다!');
      return;
    }
    this._showPetEvolveReveal(result.pet);
  }

  // _showSummonReveal 제거됨 — 개별 소환 연출이 _doAutoSummon에 통합

  _showPetEvolveReveal(pet) {
    showConfetti();

    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.innerHTML = `
      <div style="font-size:clamp(60px,22vw,100px);animation:pulse 1s infinite;">${pet.emoji}</div>
      <div style="font-size:var(--icon-lg);font-weight:700;color:var(--gold);margin:clamp(8px,3vw,14px) 0;">🌟 펫 진화 성공! 🌟</div>
      <div style="font-size:clamp(16px,4.5vw,22px);font-weight:700;">${pet.name}</div>
      <div style="margin:clamp(4px,2vw,10px) 0;">
        <span class="badge badge-gold" style="font-size:clamp(12px,3.2vw,15px);">🟨 레전드 ★★★★☆</span>
      </div>
      <div class="pg-text-sm" style="margin-top:clamp(4px,2vw,10px);">
        패시브: <b class="pg-text-green">${pet.passive}</b>
      </div>
      <div class="pg-text-sm" style="color:var(--text-secondary);margin-top:clamp(2px,1vw,6px);">
        방어: ${pet.defense} | 공격: ${pet.atk} | 공속: ${pet.atkSpeed}초
      </div>
      <div class="pg-text-sm pg-text-muted" style="margin-top:clamp(8px,3vw,14px);">
        💕 펫은 영구 동반자! 항상 함께해요!
      </div>
      <button class="pg-btn pg-btn-pri" style="margin-top:clamp(16px,6vw,28px);" id="reveal-close">확인</button>
    `;
    document.getElementById('app').appendChild(overlay);

    overlay.querySelector('#reveal-close').onclick = () => {
      overlay.remove();
      const c = this.el.querySelector('#summoning-container');
      if (c) this._renderContent(c);
    };
  }

  // ── 가챠 피티 진행률 바 ──
  _renderPityBar(gachaType) {
    if (typeof PitySystem === 'undefined') return '';
    const hero = HeroCore.getInstance();
    const info = hero.gachaSystem.getPityInfo(gachaType);
    if (!info) return '';

    const pct = Math.round(info.progressBar * 100);
    const barColor = info.failCount > 20 ? '#FFD700' :
                     info.failCount > 15 ? '#FF8800' :
                     info.failCount > 10 ? '#FFAA00' : '#4488FF';

    return `
      <div style="margin-bottom:clamp(8px,3vw,14px);padding:clamp(4px,2vw,10px);background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
        <div class="pg-text-sm pg-text-muted" style="margin-bottom:clamp(3px,1.5vw,8px);">
          피티 진행: ${info.failCount}/${info.hardPityAt} ${info.message}
        </div>
        <div style="width:100%;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px;transition:width 0.5s ease;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:clamp(2px,1vw,6px);">
          <span class="pg-text-sm" style="color:${barColor};">레전더리 확률: ${info.currentRatePercent}</span>
          <span class="pg-text-sm pg-text-muted">${info.bonusPercent} 보너스</span>
        </div>
        ${info.totalPulls > 0 ? `<div class="pg-text-sm pg-text-muted" style="margin-top:clamp(1px,0.5vw,3px);">총 ${info.totalPulls}회 소환 · 레전더리 ${info.legendaryCount}회</div>` : ''}
      </div>
    `;
  }

  // ── 정령 → 주인공 흡수 (소환 시 자동 호출) ──
  _absorbSpiritToHero(spirit) {
    if (typeof HeroAI === 'undefined') return;

    const elementMap = {
      fairy:'light', mushroom:'earth', candy:'light', water:'water',
      diamond:'ice', star:'light', moon:'dark', thunder:'thunder',
      blossom:'grass', crystal:'ice', rainbow:'fire', fire:'fire',
      ice:'ice', cosmos:'dark', phoenix_lord:'fire', void_dragon:'dark',
    };

    const aiSpirit = HeroAI.createSpirit({
      id: 'spirit_' + spirit.id,
      name: spirit.name || '정령',
      element: elementMap[spirit.key] || spirit.attribute || 'light',
      rarity: spirit.rarity || 'common',
      level: spirit.level || 1,
      skill: spirit.ability?.type === 'aoe' ? 'spirit_burst'
           : spirit.ability?.type === 'heal' ? 'water_spirit_shield'
           : spirit.ability?.type === 'beam' ? 'thunder_spirit_chain'
           : 'fire_spirit_strike',
      uses: 1,
    });
    HeroAI.addSpirit(aiSpirit);
    HeroAI.party._calculated = false;

    if (typeof HeroAIVisual !== 'undefined') {
      HeroAIVisual.playSpiritSummon(aiSpirit, null);
    }

    console.log(`[HeroAI] 정령 "${spirit.name}" → 주인공 흡수 완료`);
  }

  // ── 정령 삭제 (소환 해제) ──
  _deleteSpirit(spiritId, spiritKey, spiritRarity, container) {
    const spirit = GameState.spirits.find(s => s.id === spiritId);
    if (!spirit) return;

    const name = spirit.name || spiritKey || '정령';

    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
      <div style="font-size:var(--icon-xxl);">${spirit.emoji || '✨'}</div>
      <div style="font-size:var(--label-lg);font-weight:700;margin:clamp(4px,2vw,10px) 0;color:#ff6b6b;">정령 해방</div>
      <div class="pg-text-sm" style="color:var(--text-secondary);margin-bottom:clamp(4px,2vw,10px);">
        "${name}"을(를) 해방하시겠습니까?<br>
        <span style="color:#ff4444;">해방된 정령은 소환의 나무로 돌아갑니다</span>
      </div>
      <div class="pg-row pg-row-center" style="margin-top:clamp(10px,4vw,18px);">
        <button class="pg-btn pg-btn-sec" id="del-cancel">취소</button>
        <button class="pg-btn" style="background:#ff4444;color:#fff;" id="del-confirm">해방</button>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);

    overlay.querySelector('#del-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#del-confirm').onclick = () => {
      GameState.spirits = GameState.spirits.filter(s => s.id !== spiritId);
      if (typeof HeroAI !== 'undefined') {
        HeroAI.consumeSpirit('spirit_' + spiritId);
        HeroAI.party._calculated = false;
      }
      overlay.remove();
      showToast(`🌳 ${name} 해방! 소환의 나무로 돌아갔습니다`);
      if (container) this._renderContent(container);
    };
  }

  // ── 파티 편성 UI ──

  _renderPartySlots() {
    const slots = GameState.heroSlots;
    const currentStage = GameState.currentStage || 1;
    const playerLevel = GameState.heroLevel || 1;
    let html = '';

    // 5 영웅 슬롯
    for (let i = 0; i < 5; i++) {
      const hero = slots[i];
      const unlocked = isSlotUnlocked(i, currentStage, playerLevel);

      if (!unlocked) {
        const unlockInfo = (HERO_SLOT_CONFIG.slotUnlock[i] || {});
        html += `<div class="party-hero-slot party-slot-locked" style="width:clamp(36px,12vw,52px);height:clamp(36px,12vw,52px);display:flex;align-items:center;justify-content:center;background:rgba(40,40,60,0.7);border:2px dashed rgba(100,100,140,0.4);border-radius:8px;opacity:0.4;cursor:default;" title="${unlockInfo.label || '잠김'}">
          <span style="font-size:var(--icon-md);">🔒</span>
        </div>`;
      } else if (hero) {
        const rarityColor = RARITY_COLORS[hero.rarity] || '#aaa';
        html += `<div class="party-hero-slot" data-slot-idx="${i}" style="width:clamp(36px,12vw,52px);height:clamp(36px,12vw,52px);display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(40,30,60,0.8);border:2px solid ${rarityColor};border-radius:8px;cursor:pointer;position:relative;" title="${hero.name}">
          <span style="font-size:clamp(1em,4vw,1.8em);">${hero.emoji || '🧚'}</span>
          <span style="font-size:clamp(0.5em,1.6vw,0.7em);color:${rarityColor};white-space:nowrap;overflow:hidden;max-width:44px;">${hero.name}</span>
        </div>`;
      } else {
        html += `<div class="party-hero-slot" data-slot-idx="${i}" style="width:clamp(36px,12vw,52px);height:clamp(36px,12vw,52px);display:flex;align-items:center;justify-content:center;background:rgba(40,30,60,0.5);border:2px dashed rgba(155,138,255,0.4);border-radius:8px;cursor:pointer;" title="영웅 배치">
          <span style="font-size:var(--icon-md);opacity:0.5;">👤</span>
        </div>`;
      }
    }

    // 1 펫 슬롯
    const pet = GameState.petSlot;
    if (pet) {
      html += `<div class="party-pet-slot" style="width:clamp(36px,12vw,52px);height:clamp(36px,12vw,52px);display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(25,50,35,0.8);border:2px solid rgba(134,239,172,0.6);border-radius:8px;cursor:pointer;" title="${pet.name}">
        <span style="font-size:clamp(1em,4vw,1.8em);">${pet.emoji || '🐾'}</span>
        <span style="font-size:clamp(0.5em,1.6vw,0.7em);color:#86efac;white-space:nowrap;overflow:hidden;max-width:44px;">${pet.name}</span>
      </div>`;
    } else {
      html += `<div class="party-pet-slot" style="width:clamp(36px,12vw,52px);height:clamp(36px,12vw,52px);display:flex;align-items:center;justify-content:center;background:rgba(25,50,35,0.5);border:2px dashed rgba(134,239,172,0.3);border-radius:8px;cursor:pointer;" title="펫 배치">
        <span style="font-size:var(--icon-md);opacity:0.5;">🐾</span>
      </div>`;
    }

    return html;
  }

  _showHeroPicker(slotIdx, container) {
    const currentStage = GameState.currentStage || 1;
    const playerLevel = GameState.heroLevel || 1;
    if (!isSlotUnlocked(slotIdx, currentStage, playerLevel)) {
      showToast('🔒 이 슬롯은 아직 해금되지 않았습니다');
      return;
    }

    const equipped = GameState.heroSlots.filter(h => h != null);
    const available = HERO_ROSTER.filter(hero => {
      const check = canEquipHero(hero, equipped.filter((h, i) => i !== slotIdx && h));
      return check.allowed;
    });

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.cssText = 'z-index:9999;';
    overlay.innerHTML = `
      <div style="background:rgba(10,10,30,0.95);border:2px solid var(--purple);border-radius:12px;padding:clamp(10px,4vw,18px);max-width:360px;max-height:80vh;overflow-y:auto;">
        <div class="pg-hdr" style="margin-bottom:clamp(6px,2.5vw,12px);">
          <h2 style="font-size:var(--label-lg);">⚔️ 영웅 선택 (슬롯 ${slotIdx + 1})</h2>
          <button class="pg-back" id="picker-close">✕</button>
        </div>
        ${GameState.heroSlots[slotIdx] ? `
          <button class="pg-btn" style="background:#ff4444;color:#fff;margin-bottom:clamp(4px,2vw,10px);width:100%;font-size:var(--label-md);" id="picker-remove">
            🚫 현재 영웅 해제 (${GameState.heroSlots[slotIdx].name})
          </button>
        ` : ''}
        <div class="pg-list" id="hero-list">
          ${available.map(hero => {
            const rarityColor = RARITY_COLORS[hero.rarity] || '#aaa';
            const isEquipped = equipped.some(h => h && h.key === hero.key);
            return `<div class="pg-card ${isEquipped ? 'pg-card-disabled' : ''}" data-hero-key="${hero.key}" style="border-color:${rarityColor};">
              <div class="pg-emoji">${hero.emoji}</div>
              <div class="pg-card-info">
                <div class="pg-card-name" style="color:${rarityColor};">${hero.name}</div>
                <div class="pg-card-desc">${hero.passiveSkill?.description || ''}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
    document.getElementById('app').appendChild(overlay);

    overlay.querySelector('#picker-close').onclick = () => overlay.remove();

    const removeBtn = overlay.querySelector('#picker-remove');
    if (removeBtn) {
      removeBtn.onclick = () => {
        GameState.heroSlots[slotIdx] = null;
        SaveManager.save();
        overlay.remove();
        this._renderContent(container);
      };
    }

    overlay.querySelectorAll('#hero-list .pg-card:not(.pg-card-disabled)').forEach(card => {
      card.onclick = () => {
        const key = card.dataset.heroKey;
        const hero = HERO_ROSTER.find(h => h.key === key);
        if (hero) {
          GameState.equipHeroToSlot(slotIdx, { ...hero, hp: 100, attack: hero.rarity === 'legendary' ? 20 : hero.rarity === 'epic' ? 15 : 10, defense: 5 });
          SaveManager.save();
        }
        overlay.remove();
        this._renderContent(container);
      };
    });
  }

  _showPetInfo(container) {
    const pet = GameState.petSlot;
    if (!pet) {
      showToast('🐾 펫이 없습니다! 펫 진화 탭에서 진화시키세요');
      return;
    }
    showToast(`🐾 ${pet.emoji} ${pet.name} (${pet.rarity || 'common'}) — 5초마다 HP 회복`);
  }

  _autoAssignParty(container) {
    const currentStage = GameState.currentStage || 1;
    const playerLevel = GameState.heroLevel || 1;

    const rarityOrder = { legendary: 5, epic: 4, magic: 3, rare: 2, common: 1 };
    const sorted = [...HERO_ROSTER].sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));

    const nonMain = sorted.filter(h => !h.isMainHero);

    for (let i = 0; i < 5; i++) {
      if (!isSlotUnlocked(i, currentStage, playerLevel)) continue;
      if (GameState.heroSlots[i]) continue;

      const equipped = GameState.heroSlots.filter(h => h != null);
      for (const hero of nonMain) {
        if (equipped.some(h => h.key === hero.key)) continue;
        const check = canEquipHero(hero, equipped);
        if (check.allowed) {
          GameState.equipHeroToSlot(i, { ...hero, hp: 100, attack: hero.rarity === 'legendary' ? 20 : hero.rarity === 'epic' ? 15 : 10, defense: 5 });
          break;
        }
      }
    }

    SaveManager.save();
    showToast('✨ 파티 자동 편성 완료!');
    this._renderContent(container);
  }

  // ── HeroAI 파티 동기화 (출발 시 호출) ──
  _syncHeroAI() {
    if (typeof HeroAI === 'undefined') return;

    HeroAI.party.heroes = [];
    HeroAI.party.spirits = [];
    HeroAI.party.pet = null;
    HeroAI.party._calculated = false;

    const elementMap = {
      fairy:'light', mushroom:'earth', candy:'light', water:'water',
      diamond:'ice', star:'light', moon:'dark', thunder:'thunder',
      blossom:'grass', crystal:'ice', rainbow:'fire', fire:'fire',
      ice:'ice', cosmos:'dark', phoenix_lord:'fire', void_dragon:'dark',
    };
    const classMap = {
      common:'warrior', rare:'archer', magic:'mage',
      epic:'rogue', legendary:'summoner',
    };

    GameState.heroSlots.filter(h => h != null).forEach(h => {
      const hero = HeroAI.createHero({
        id: 'hero_slot_' + (h.key || h.name || Date.now()),
        name: h.name || '영웅',
        class: classMap[h.rarity] || 'warrior',
        element: elementMap[h.key] || h.attribute || 'fire',
        rarity: h.rarity || 'common',
        level: h.level || GameState.heroLevel || 1,
        aiPersonality: 'balanced',
        weapon: GameState.equipped.arms || null,
        armor: GameState.equipped.body || null,
      });
      HeroAI.addHero(hero);
    });

    if (HeroAI.party.heroes.length === 0) {
      const mainHero = HeroAI.createHero({
        id: 'hero_main',
        name: '요정',
        class: 'warrior',
        element: 'light',
        rarity: 'rare',
        level: GameState.heroLevel || 1,
        weapon: GameState.equipped.arms || null,
        armor: GameState.equipped.body || null,
        aiPersonality: 'balanced',
      });
      HeroAI.addHero(mainHero);
    }

    GameState.spirits.forEach(s => {
      const spirit = HeroAI.createSpirit({
        id: 'spirit_' + (s.id || Date.now()),
        name: s.name || '정령',
        element: elementMap[s.key] || s.attribute || 'light',
        rarity: s.rarity || 'common',
        level: s.level || 1,
        skill: s.ability?.type === 'aoe' ? 'spirit_burst'
             : s.ability?.type === 'heal' ? 'water_spirit_shield'
             : s.ability?.type === 'beam' ? 'thunder_spirit_chain'
             : 'fire_spirit_strike',
        uses: 1,
      });
      HeroAI.addSpirit(spirit);
    });

    if (GameState.petSlot) {
      const p = GameState.petSlot;
      const pet = HeroAI.createPet({
        id: 'pet_' + (p.name || Date.now()),
        name: p.name || '펫',
        type: p.type || 'cat',
        element: p.attribute || 'light',
        rarity: p.rarity || 'rare',
        level: p.level || 1,
        skill: 'pet_heal_lick',
        passive: p.passive || 'luck_boost',
      });
      HeroAI.setPet(pet);
    }

    const partyData = HeroAI.calculateAll();

    if (partyData && partyData.heroes.length > 0) {
      const mainStats = partyData.heroes[0].stats;
      GameState.player.attack += Math.floor((mainStats.atk || 0) * 0.1);
      GameState.player.defense += Math.floor((mainStats.def || 0) * 0.1);
      GameState.player.maxHp += Math.floor((mainStats.hp || 0) * 0.05);
      GameState.player.hp = GameState.player.maxHp;
    }

    window._heroAIPartyData = partyData;
    console.log('[HeroAI] 파티 동기화 완료 — 총 전투력:', partyData?.totalPower || 0);
  }

  onEnter() {
    GameState.currentPhase = 'summoning';
    updateHud();

    if (!hasSummonTutorialSeen()) {
      showSummonTutorial();
    }
  }
}
