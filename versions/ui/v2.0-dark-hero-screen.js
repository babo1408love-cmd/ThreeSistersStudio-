// Hero Screen — 영웅창 오버레이 UI
// 영웅 정보/스탯/장비/동료/업그레이드/스킬을 한 화면에서 관리
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import { RARITY_COLORS, RARITY_NAMES } from '../data/spirits.js';
import {
  HERO_BASE, EQUIPMENT_SLOTS, EQUIPMENT_BALANCE,
  SKILL_SYSTEM, ATTRIBUTES, HERO_ROSTER, HERO_SLOT_SYSTEM
} from '../data/hero-config.js';
import {
  HERO_CLASSES, UPGRADE_PATHS, getRequiredExp, HeroManager, MAX_LEVEL
} from '../generators/hero-upgrade.js';
import {
  HERO_SLOT_CONFIG, isSlotUnlocked, canEquipHero,
  isPetSlotUnlocked, PET_EQUIPMENT_SLOTS, PET_ROSTER, PET_SLOT_CONFIG
} from '../data/inventory-config.js';

let overlayEl = null;
let heroMgr = null;

// ── 공개 API ──

export function openHeroScreen() {
  if (overlayEl) return;
  _ensureHeroManager();

  overlayEl = document.createElement('div');
  overlayEl.className = 'overlay';
  overlayEl.innerHTML = `<div class="overlay-panel hero-screen" id="hero-screen-panel"></div>`;
  document.getElementById('app').appendChild(overlayEl);

  _injectStyles();
  _renderAll();

  // 첫 방문 튜토리얼
  if (!localStorage.getItem('monglebel_hero_screen_tutorial_seen')) {
    setTimeout(() => _showTutorial(), 350);
  }
}

export function closeHeroScreen() {
  if (!overlayEl) return;
  _saveHeroManager();
  overlayEl.remove();
  overlayEl = null;
}

// ── HeroManager 동기화 ──

function _ensureHeroManager() {
  heroMgr = new HeroManager();
  if (GameState.heroUpgrade) {
    heroMgr.fromJSON(GameState.heroUpgrade);
  }
}

function _saveHeroManager() {
  if (heroMgr) {
    GameState.heroUpgrade = heroMgr.toJSON();
    GameState.heroLevel = heroMgr.level;
    GameState.heroExp = heroMgr.exp;
    SaveManager.save();
  }
}

// ── 전체 렌더 ──

function _renderAll() {
  const panel = document.getElementById('hero-screen-panel');
  if (!panel) return;

  const cls = heroMgr.getClass();
  const stats = heroMgr.computeCombatStats(HERO_BASE.baseStats, GameState.equipped);
  const reqExp = getRequiredExp(heroMgr.level);
  const expPct = heroMgr.level >= MAX_LEVEL ? 100 : Math.min(100, Math.round(heroMgr.exp / reqExp * 100));
  const attr = ATTRIBUTES[HERO_BASE.attribute] || {};

  panel.innerHTML = `
    <!-- 헤더 -->
    <div class="hs-header" data-tut-step="0">
      <div class="hs-title">🧚 영웅 정보</div>
      <button class="btn btn-sm btn-secondary" id="hs-close">✕ 닫기</button>
    </div>

    <!-- 영웅 초상화 + 기본 정보 -->
    <div class="hs-portrait-card" data-tut-step="1">
      <div class="hs-portrait">
        <span class="hero-fairy hero-fairy-lg">🧚</span>
      </div>
      <div class="hs-basic">
        <div class="hs-name">${HERO_BASE.name} — Lv.${heroMgr.level}</div>
        <div class="hs-class-row">
          ${attr.emoji || '✨'} ${attr.name || '빛'} 속성 &nbsp;|&nbsp;
          ${cls.emoji} ${cls.name} 클래스
          <button class="btn-tiny" id="hs-change-class" title="클래스 변경">🔄</button>
        </div>
        <div class="hs-exp-row">
          <div class="hs-exp-bar"><div class="hs-exp-fill" style="width:${expPct}%"></div></div>
          <span class="hs-exp-text">${heroMgr.level >= MAX_LEVEL ? 'MAX' : `EXP ${heroMgr.exp}/${reqExp}`}</span>
        </div>
      </div>
    </div>

    <!-- 스탯 패널 -->
    <div class="hs-section" data-tut-step="2">
      <div class="hs-section-title">전투 능력치</div>
      <div class="hs-stats-grid">
        ${_statCell('❤️', 'HP', stats.maxHp)}
        ${_statCell('⚔️', '공격', stats.attack)}
        ${_statCell('🛡️', '방어', stats.defense)}
        ${_statCell('💨', '속도', typeof stats.speed === 'number' ? stats.speed.toFixed(1) : stats.speed)}
        ${_statCell('🎯', '치명타', (stats.critRate || 0).toFixed(1) + '%')}
        ${_statCell('💥', '치명뎀', (stats.critDamage || 150) + '%')}
        ${_statCell('😤', '분노율', (stats.rageGainRate || 100) + '%')}
      </div>
    </div>

    <!-- 장비 슬롯 (6부위) -->
    <div class="hs-section" data-tut-step="3">
      <div class="hs-section-title">장비 (6부위)</div>
      <div class="hs-equip-grid" id="hs-equip-grid">
        ${EQUIPMENT_SLOTS.map(s => _renderEquipSlot(s)).join('')}
      </div>
    </div>

    <!-- 동료 영웅 슬롯 (5칸) -->
    <div class="hs-section" data-tut-step="4">
      <div class="hs-section-title">동료 영웅 (최대 ${HERO_SLOT_SYSTEM.maxSlots})</div>
      <div class="hs-hero-slots" id="hs-hero-slots">
        ${_renderHeroSlots()}
      </div>
    </div>

    <!-- 펫 슬롯 + 펫 장비 -->
    <div class="hs-section" data-tut-step="pet">
      <div class="hs-section-title">🐾 펫</div>
      <div class="hs-pet-area">
        ${_renderPetSlot()}
        ${_renderPetEquipSlots()}
      </div>
    </div>

    <!-- 업그레이드 경로 -->
    <div class="hs-section" data-tut-step="5">
      <div class="hs-section-title">업그레이드 경로 <span class="hs-points">남은 포인트: ${heroMgr.upgradePoints}</span></div>
      <div class="hs-upgrade-grid" id="hs-upgrade-grid">
        ${Object.values(UPGRADE_PATHS).map(p => _renderUpgradePath(p)).join('')}
      </div>
    </div>

    <!-- 스킬 정보 -->
    <div class="hs-section" data-tut-step="6">
      <div class="hs-section-title">스킬</div>
      <div class="hs-skills">
        <div class="hs-skill-card">
          <span class="hs-skill-type active">액티브</span>
          <span class="hs-skill-emoji">${SKILL_SYSTEM.heroActiveSkill.emoji}</span>
          <b>${SKILL_SYSTEM.heroActiveSkill.name}</b>
          <div class="hs-skill-desc">${SKILL_SYSTEM.heroActiveSkill.description}</div>
        </div>
        <div class="hs-skill-card">
          <span class="hs-skill-type passive">패시브</span>
          <span class="hs-skill-emoji">✨</span>
          <b>${SKILL_SYSTEM.heroPassiveSkill.name}</b>
          <div class="hs-skill-desc">${SKILL_SYSTEM.heroPassiveSkill.description}</div>
        </div>
      </div>
    </div>
  `;

  // 이벤트 바인딩
  panel.querySelector('#hs-close').onclick = closeHeroScreen;
  panel.querySelector('#hs-change-class').onclick = _showClassPicker;

  // 장비 슬롯 클릭
  panel.querySelectorAll('.hs-equip-slot').forEach(el => {
    el.onclick = () => _showEquipPicker(el.dataset.slot);
  });

  // 영웅 슬롯 클릭
  panel.querySelectorAll('.hs-hero-slot').forEach(el => {
    const idx = parseInt(el.dataset.idx);
    if (el.classList.contains('locked')) return;
    el.onclick = () => _showHeroPicker(idx);
  });

  // 펫 슬롯 클릭
  const petSlotEl = panel.querySelector('.hs-pet-slot:not(.locked)');
  if (petSlotEl) petSlotEl.onclick = () => _showPetPicker();

  // 펫 장비 슬롯 클릭
  panel.querySelectorAll('.hs-pet-equip-slot').forEach(el => {
    el.onclick = () => _showPetEquipPicker(el.dataset.slot);
  });

  // 업그레이드 클릭
  panel.querySelectorAll('.hs-upgrade-btn').forEach(el => {
    el.onclick = () => {
      const pathId = el.dataset.path;
      const result = heroMgr.investPath(pathId);
      if (result.success) {
        _saveHeroManager();
        GameState.recalcStats();
        _renderAll();
        if (result.milestone) {
          _showToast(`🎉 마일스톤 달성: ${result.milestone.name}!`);
        }
      }
    };
  });
}

// ── 스탯 셀 ──

function _statCell(emoji, label, value) {
  return `<div class="hs-stat-cell"><span class="hs-stat-icon">${emoji}</span><span class="hs-stat-label">${label}</span><span class="hs-stat-val">${value}</span></div>`;
}

// ── 장비 슬롯 렌더 ──

function _renderEquipSlot(slotDef) {
  const item = GameState.equipped[slotDef.key];
  const rarity = item?.rarity || '';
  const borderColor = rarity ? (EQUIPMENT_BALANCE[rarity]?.color || 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.1)';
  return `
    <div class="hs-equip-slot" data-slot="${slotDef.key}" style="border-color:${borderColor};">
      <div class="hs-equip-emoji">${item ? (item.emoji || slotDef.emoji) : slotDef.emoji}</div>
      <div class="hs-equip-name">${item ? item.name : slotDef.name}</div>
      ${item ? `<div class="hs-equip-rarity" style="color:${borderColor}">${RARITY_NAMES[rarity] || ''}</div>` : '<div class="hs-equip-empty">빈 슬롯</div>'}
    </div>`;
}

// ── 영웅 슬롯 렌더 ──

function _renderHeroSlots() {
  return Array.from({ length: HERO_SLOT_SYSTEM.maxSlots }, (_, i) => {
    const unlocked = isSlotUnlocked(i, GameState.currentStage, heroMgr.level);
    const hero = GameState.heroSlots[i];
    if (!unlocked) {
      const cond = HERO_SLOT_CONFIG.slotUnlock[i];
      return `<div class="hs-hero-slot locked" data-idx="${i}">
        <div class="hs-hero-emoji">🔒</div>
        <div class="hs-hero-label">${cond ? cond.label : '잠김'}</div>
      </div>`;
    }
    if (hero) {
      const rc = RARITY_COLORS[hero.rarity] || '#ddd';
      return `<div class="hs-hero-slot filled" data-idx="${i}" style="border-color:${rc};">
        <div class="hs-hero-emoji">${hero.emoji}</div>
        <div class="hs-hero-label" style="color:${rc};">${hero.name}</div>
      </div>`;
    }
    return `<div class="hs-hero-slot empty" data-idx="${i}">
      <div class="hs-hero-emoji">👤</div>
      <div class="hs-hero-label">빈 슬롯</div>
    </div>`;
  }).join('');
}

// ── 업그레이드 경로 렌더 ──

function _renderUpgradePath(path) {
  const curLv = heroMgr.paths[path.id] || 0;
  const pct = Math.round(curLv / path.max * 100);
  const canInvest = heroMgr.upgradePoints > 0 && curLv < path.max;
  // 다음 마일스톤 찾기
  let nextMs = null;
  for (const lvl of Object.keys(path.milestones).map(Number).sort((a, b) => a - b)) {
    if (curLv < lvl) { nextMs = { lvl, ...path.milestones[lvl] }; break; }
  }
  return `
    <div class="hs-upgrade-card">
      <div class="hs-upgrade-top">
        <span>${path.emoji} ${path.name}</span>
        <span class="hs-upgrade-lv">${curLv}/${path.max}</span>
      </div>
      <div class="hs-upgrade-bar"><div class="hs-upgrade-fill" style="width:${pct}%"></div></div>
      ${nextMs ? `<div class="hs-upgrade-next">다음: Lv.${nextMs.lvl} ${nextMs.name}</div>` : ''}
      <button class="btn-tiny hs-upgrade-btn${canInvest ? '' : ' disabled'}" data-path="${path.id}" ${canInvest ? '' : 'disabled'}>+1 투자</button>
    </div>`;
}

// ── 장비 선택 팝업 ──

function _showEquipPicker(slotKey) {
  const slotDef = EQUIPMENT_SLOTS.find(s => s.key === slotKey);
  if (!slotDef) return;
  const currentItem = GameState.equipped[slotKey];
  // 인벤토리에서 해당 슬롯에 장착 가능한 아이템 필터
  const candidates = GameState.inventory.filter(i => i.slot === slotKey);

  _showSubPopup(`
    <div class="hs-popup-title">${slotDef.emoji} ${slotDef.name} — 장비 선택</div>
    ${currentItem ? `
      <div class="hs-popup-current">
        <span>현재: ${currentItem.emoji} ${currentItem.name}</span>
        <button class="btn btn-sm btn-secondary" id="hs-unequip">해제</button>
      </div>` : '<div class="hs-popup-current" style="color:var(--text-muted);">장착된 장비 없음</div>'}
    <div class="hs-popup-list" id="hs-equip-list">
      ${candidates.length === 0
        ? '<div style="color:var(--text-muted);padding:10px;">장착 가능한 아이템이 없습니다</div>'
        : candidates.map(item => {
          const uid = item._uid || item.id;
          const rc = RARITY_COLORS[item.rarity] || '#ddd';
          return `<div class="hs-popup-item" data-uid="${uid}">
            <span class="hs-popup-item-emoji" style="border-color:${rc};">${item.emoji}</span>
            <div class="hs-popup-item-info">
              <div style="font-weight:700;">${item.name} <span style="color:${rc};font-size:var(--label-sm);">${RARITY_NAMES[item.rarity] || ''}</span></div>
              <div style="font-size:var(--label-sm);color:var(--text-secondary);">${_formatStats(item.stats)}</div>
            </div>
            <button class="btn btn-sm btn-primary hs-pick-equip" data-uid="${uid}">장착</button>
          </div>`;
        }).join('')}
    </div>
  `, (popup) => {
    // 해제 버튼
    const unequipBtn = popup.querySelector('#hs-unequip');
    if (unequipBtn) {
      unequipBtn.onclick = () => {
        if (currentItem) {
          GameState.addItem(currentItem);
          GameState.equipped[slotKey] = null;
          GameState.recalcStats();
          GameState.recalcHeroAppearance();
        }
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    }
    // 장착 버튼들
    popup.querySelectorAll('.hs-pick-equip').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const uid = parseFloat(btn.dataset.uid);
        GameState.equipItem(uid);
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    });
  });
}

// ── 동료 영웅 선택 팝업 ──

function _showHeroPicker(slotIdx) {
  const currentHero = GameState.heroSlots[slotIdx];
  // 보유 영웅: HERO_ROSTER에서 현재 장착되지 않은 것들 (메인 영웅 제외)
  const equippedKeys = GameState.heroSlots.filter(Boolean).map(h => h.key);
  const available = HERO_ROSTER.filter(h => !h.isMainHero && !equippedKeys.includes(h.key));

  _showSubPopup(`
    <div class="hs-popup-title">동료 영웅 — 슬롯 ${slotIdx + 1}</div>
    ${currentHero ? `
      <div class="hs-popup-current">
        <span>${currentHero.emoji} ${currentHero.name}</span>
        <button class="btn btn-sm btn-secondary" id="hs-unequip-hero">해제</button>
      </div>` : '<div class="hs-popup-current" style="color:var(--text-muted);">배치된 영웅 없음</div>'}
    <div class="hs-popup-list" id="hs-hero-list">
      ${available.length === 0
        ? '<div style="color:var(--text-muted);padding:10px;">배치 가능한 영웅이 없습니다</div>'
        : available.map(hero => {
          const rc = RARITY_COLORS[hero.rarity] || '#ddd';
          const check = canEquipHero(hero, GameState.heroSlots);
          const attrInfo = ATTRIBUTES[hero.attribute] || {};
          return `<div class="hs-popup-item${check.allowed ? '' : ' disabled-row'}">
            <span class="hs-popup-item-emoji" style="border-color:${rc};">${hero.emoji}</span>
            <div class="hs-popup-item-info">
              <div style="font-weight:700;">${hero.name} <span style="color:${rc};font-size:var(--label-sm);">${RARITY_NAMES[hero.rarity] || ''}</span></div>
              <div style="font-size:var(--label-sm);color:var(--text-secondary);">${attrInfo.emoji || ''} ${attrInfo.name || ''} | ${hero.passiveSkill?.name || ''}</div>
              ${!check.allowed ? `<div style="font-size:var(--label-xs);color:#ff6b6b;">${check.reason}</div>` : ''}
            </div>
            ${check.allowed ? `<button class="btn btn-sm btn-primary hs-pick-hero" data-key="${hero.key}">배치</button>` : ''}
          </div>`;
        }).join('')}
    </div>
  `, (popup) => {
    // 해제
    const unequipBtn = popup.querySelector('#hs-unequip-hero');
    if (unequipBtn) {
      unequipBtn.onclick = () => {
        GameState.equipHeroToSlot(slotIdx, null);
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    }
    // 배치
    popup.querySelectorAll('.hs-pick-hero').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const heroKey = btn.dataset.key;
        const hero = HERO_ROSTER.find(h => h.key === heroKey);
        if (!hero) return;
        const result = GameState.equipHeroToSlot(slotIdx, hero);
        if (!result.success) {
          _showToast(result.error);
          return;
        }
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    });
  });
}

// ── 펫 슬롯 렌더 ──

function _renderPetSlot() {
  const unlocked = isPetSlotUnlocked(GameState.currentStage);
  const pet = GameState.petSlot;
  if (!unlocked) {
    return `<div class="hs-pet-slot locked">
      <div class="hs-pet-emoji">🔒</div>
      <div class="hs-pet-label">펫 잠김</div>
    </div>`;
  }
  if (pet) {
    const rc = RARITY_COLORS[pet.rarity] || '#86efac';
    return `<div class="hs-pet-slot filled" style="border-color:${rc};">
      <div class="hs-pet-emoji">${pet.emoji}</div>
      <div class="hs-pet-label" style="color:${rc};">${pet.name}</div>
      <div class="hs-pet-sub">${pet.immortalTitle || '사라지지 않는 정령'}</div>
    </div>`;
  }
  return `<div class="hs-pet-slot empty">
    <div class="hs-pet-emoji">🐾</div>
    <div class="hs-pet-label">펫 배치</div>
  </div>`;
}

function _renderPetEquipSlots() {
  if (!GameState.petSlot) {
    return '<div class="hs-pet-equip-empty">펫을 먼저 배치하세요</div>';
  }
  return `<div class="hs-pet-equip-grid">
    ${PET_EQUIPMENT_SLOTS.map(s => {
      const item = GameState.petEquipped[s.key];
      const rc = item ? (RARITY_COLORS[item.rarity] || 'rgba(255,255,255,0.1)') : 'rgba(134,239,172,0.2)';
      return `<div class="hs-pet-equip-slot" data-slot="${s.key}" style="border-color:${rc};">
        <div class="hs-pet-equip-emoji">${item ? (item.emoji || s.emoji) : s.emoji}</div>
        <div class="hs-pet-equip-name">${item ? item.name : s.name}</div>
        ${item ? `<div class="hs-pet-equip-rarity" style="color:${rc}">${RARITY_NAMES[item.rarity] || ''}</div>` : '<div class="hs-pet-equip-hint">빈 슬롯</div>'}
      </div>`;
    }).join('')}
  </div>`;
}

// ── 펫 선택 팝업 ──

function _showPetPicker() {
  const currentPet = GameState.petSlot;

  _showSubPopup(`
    <div class="hs-popup-title">🐾 펫 선택</div>
    ${currentPet ? `
      <div class="hs-popup-current">
        <span>${currentPet.emoji} ${currentPet.name}</span>
        <button class="btn btn-sm btn-secondary" id="hs-unequip-pet">해제</button>
      </div>` : '<div class="hs-popup-current" style="color:var(--text-muted);">배치된 펫 없음</div>'}
    <div class="hs-popup-list">
      ${PET_ROSTER.map(pet => {
        const rc = RARITY_COLORS[pet.rarity] || '#86efac';
        const isCur = currentPet && currentPet.key === pet.key;
        const attrInfo = ATTRIBUTES[pet.attribute] || {};
        return `<div class="hs-popup-item${isCur ? ' current-class' : ''}">
          <span class="hs-popup-item-emoji" style="border-color:${rc};">${pet.emoji}</span>
          <div class="hs-popup-item-info">
            <div style="font-weight:700;">${pet.name} <span style="color:${rc};font-size:var(--label-sm);">${RARITY_NAMES[pet.rarity] || ''}</span></div>
            <div style="font-size:var(--label-sm);color:var(--text-secondary);">${attrInfo.emoji || ''} ${attrInfo.name || ''} | ${pet.healSkill?.name || ''}</div>
            <div style="font-size:var(--label-xs);color:var(--text-muted);">${pet.healSkill?.description || ''}</div>
          </div>
          ${!isCur ? `<button class="btn btn-sm btn-primary hs-pick-pet" data-key="${pet.key}">배치</button>` : '<span style="font-size:var(--label-xs);color:#67e8f9;">현재</span>'}
        </div>`;
      }).join('')}
    </div>
  `, (popup) => {
    const unequipBtn = popup.querySelector('#hs-unequip-pet');
    if (unequipBtn) {
      unequipBtn.onclick = () => {
        GameState.petSlot = null;
        GameState.recalcPetAppearance();
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    }
    popup.querySelectorAll('.hs-pick-pet').forEach(btn => {
      btn.onclick = () => {
        const pet = PET_ROSTER.find(p => p.key === btn.dataset.key);
        if (!pet) return;
        GameState.equipPet(pet);
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    });
  });
}

// ── 펫 장비 선택 팝업 ──

function _showPetEquipPicker(slotKey) {
  const slotDef = PET_EQUIPMENT_SLOTS.find(s => s.key === slotKey);
  if (!slotDef) return;
  const currentItem = GameState.petEquipped[slotKey];
  const candidates = GameState.inventory.filter(i => i.petSlot === slotKey);

  _showSubPopup(`
    <div class="hs-popup-title">${slotDef.emoji} 펫 ${slotDef.name} — 장비 선택</div>
    ${currentItem ? `
      <div class="hs-popup-current">
        <span>현재: ${currentItem.emoji} ${currentItem.name}</span>
        <button class="btn btn-sm btn-secondary" id="hs-unequip-pet-item">해제</button>
      </div>` : '<div class="hs-popup-current" style="color:var(--text-muted);">장착된 장비 없음</div>'}
    <div class="hs-popup-list">
      ${candidates.length === 0
        ? '<div style="color:var(--text-muted);padding:10px;">장착 가능한 펫 장비가 없습니다</div>'
        : candidates.map(item => {
          const uid = item._uid || item.id;
          const rc = RARITY_COLORS[item.rarity] || '#ddd';
          return `<div class="hs-popup-item" data-uid="${uid}">
            <span class="hs-popup-item-emoji" style="border-color:${rc};">${item.emoji}</span>
            <div class="hs-popup-item-info">
              <div style="font-weight:700;">${item.name} <span style="color:${rc};font-size:var(--label-sm);">${RARITY_NAMES[item.rarity] || ''}</span></div>
              <div style="font-size:var(--label-sm);color:var(--text-secondary);">${_formatStats(item.stats)}</div>
            </div>
            <button class="btn btn-sm btn-primary hs-pick-pet-equip" data-uid="${uid}">장착</button>
          </div>`;
        }).join('')}
    </div>
  `, (popup) => {
    const unequipBtn = popup.querySelector('#hs-unequip-pet-item');
    if (unequipBtn) {
      unequipBtn.onclick = () => {
        if (currentItem) {
          GameState.addItem(currentItem);
          GameState.petEquipped[slotKey] = null;
          GameState.recalcPetAppearance();
        }
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    }
    popup.querySelectorAll('.hs-pick-pet-equip').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const uid = parseFloat(btn.dataset.uid);
        GameState.equipPetItem(uid);
        _closeSubPopup();
        _saveHeroManager();
        _renderAll();
      };
    });
  });
}

// ── 클래스 변경 팝업 ──

function _showClassPicker() {
  const currentId = heroMgr.heroClass;
  _showSubPopup(`
    <div class="hs-popup-title">클래스 변경</div>
    <div class="hs-popup-list">
      ${Object.values(HERO_CLASSES).map(cls => {
        const isCur = cls.id === currentId;
        const growthText = Object.entries(cls.growth).map(([k, v]) => {
          const labels = { maxHp: 'HP', attack: '공격', defense: '방어', speed: '속도', critRate: '치명타' };
          return `${labels[k] || k}+${v}`;
        }).join(', ');
        return `<div class="hs-popup-item${isCur ? ' current-class' : ''}">
          <span class="hs-popup-item-emoji" style="border-color:${cls.color};">${cls.emoji}</span>
          <div class="hs-popup-item-info">
            <div style="font-weight:700;">${cls.name} ${isCur ? '<span style="color:#67e8f9;">(현재)</span>' : ''}</div>
            <div style="font-size:var(--label-sm);color:var(--text-secondary);">레벨당: ${growthText}</div>
          </div>
          ${!isCur ? `<button class="btn btn-sm btn-primary hs-pick-class" data-class="${cls.id}">선택</button>` : ''}
        </div>`;
      }).join('')}
    </div>
  `, (popup) => {
    popup.querySelectorAll('.hs-pick-class').forEach(btn => {
      btn.onclick = () => {
        heroMgr.setClass(btn.dataset.class);
        _closeSubPopup();
        _saveHeroManager();
        GameState.recalcStats();
        _renderAll();
      };
    });
  });
}

// ── 서브 팝업 유틸 ──

let subPopupEl = null;

function _showSubPopup(html, bindFn) {
  _closeSubPopup();
  subPopupEl = document.createElement('div');
  subPopupEl.className = 'hs-sub-popup-overlay';
  subPopupEl.innerHTML = `<div class="hs-sub-popup">${html}<button class="btn btn-sm btn-secondary hs-sub-close" style="margin-top:12px;width:100%;">닫기</button></div>`;
  document.getElementById('app').appendChild(subPopupEl);

  subPopupEl.querySelector('.hs-sub-close').onclick = _closeSubPopup;
  subPopupEl.addEventListener('click', e => { if (e.target === subPopupEl) _closeSubPopup(); });

  if (bindFn) bindFn(subPopupEl);
}

function _closeSubPopup() {
  if (subPopupEl) { subPopupEl.remove(); subPopupEl = null; }
}

// ── 토스트 ──

function _showToast(msg) {
  const t = document.createElement('div');
  t.className = 'hs-toast';
  t.textContent = msg;
  document.getElementById('app').appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ── 포맷 ──

function _formatStats(stats) {
  if (!stats) return '';
  const labels = { attack: '공격', defense: '방어', speed: '속도', maxHp: 'HP', critRate: '치명타', rageGainRate: '분노율', critDamage: '치명뎀' };
  return Object.entries(stats).map(([k, v]) => `${labels[k] || k} ${v > 0 ? '+' : ''}${v}`).join(', ');
}

// ── 튜토리얼 ──

function _showTutorial() {
  const steps = [
    { step: 1, title: '영웅 기본 정보', desc: '이곳에서 영웅의 레벨, 클래스, 속성을 확인합니다.' },
    { step: 2, title: '전투 능력치', desc: '영웅의 전투 능력치입니다. 장비와 업그레이드로 강화됩니다.' },
    { step: 3, title: '장비 슬롯', desc: '6개 부위에 장비를 장착하세요. 탭하면 인벤토리에서 선택할 수 있습니다.' },
    { step: 4, title: '동료 영웅', desc: '다른 영웅을 배치하면 패시브 스킬 효과를 받고, 전투에서 함께 싸웁니다.' },
    { step: 'pet', title: '펫', desc: '사라지지 않는 정령 동반자입니다. 펫은 전투에서 회복을 담당하며, 장비로 강화할 수 있습니다.' },
    { step: 5, title: '업그레이드', desc: '레벨업으로 얻은 포인트를 투자하여 영웅을 더 강하게 만드세요.' },
  ];

  let currentStep = 0;

  const tutOverlay = document.createElement('div');
  tutOverlay.className = 'hs-tut-overlay';
  document.getElementById('app').appendChild(tutOverlay);

  function renderStep() {
    const s = steps[currentStep];
    const isLast = currentStep === steps.length - 1;

    // 해당 섹션 하이라이트
    document.querySelectorAll('[data-tut-step]').forEach(el => el.classList.remove('hs-tut-highlight'));
    const target = document.querySelector(`[data-tut-step="${s.step}"]`);
    if (target) target.classList.add('hs-tut-highlight');

    tutOverlay.innerHTML = `
      <div class="hs-tut-card">
        <div class="hs-tut-step">${currentStep + 1} / ${steps.length}</div>
        <div class="hs-tut-title">${s.title}</div>
        <div class="hs-tut-desc">${s.desc}</div>
        <div class="hs-tut-buttons">
          ${currentStep > 0 ? '<button class="btn btn-sm btn-secondary" id="hs-tut-prev">← 이전</button>' : '<span></span>'}
          <button class="btn btn-sm btn-primary" id="hs-tut-next">${isLast ? '시작하기!' : '다음 →'}</button>
        </div>
      </div>`;

    // 하이라이트된 영역으로 스크롤
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const nextBtn = tutOverlay.querySelector('#hs-tut-next');
    const prevBtn = tutOverlay.querySelector('#hs-tut-prev');

    nextBtn.onclick = () => {
      if (isLast) {
        closeTutorial();
      } else {
        currentStep++;
        renderStep();
      }
    };
    if (prevBtn) {
      prevBtn.onclick = () => {
        currentStep--;
        renderStep();
      };
    }
  }

  function closeTutorial() {
    document.querySelectorAll('[data-tut-step]').forEach(el => el.classList.remove('hs-tut-highlight'));
    tutOverlay.remove();
    localStorage.setItem('monglebel_hero_screen_tutorial_seen', '1');
  }

  renderStep();
}

// ── 스타일 주입 ──

function _injectStyles() {
  if (document.getElementById('hero-screen-styles')) return;
  const style = document.createElement('style');
  style.id = 'hero-screen-styles';
  style.textContent = `
    .hero-screen {
      width: clamp(280px, 85vw, 420px); max-height: 85vh; overflow-y: auto;
      padding: clamp(12px, 3.5vw, 18px); scrollbar-width: thin;
    }
    .hs-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: clamp(10px, 3vw, 14px);
    }
    .hs-title { font-size: clamp(15px, 4.5vw, 20px); font-weight: 700; }

    /* 초상화 카드 */
    .hs-portrait-card {
      display: flex; gap: clamp(10px, 3vw, 14px); align-items: center;
      padding: clamp(10px, 3vw, 14px); background: var(--bg-card, rgba(30,35,55,0.9));
      border-radius: 14px; margin-bottom: clamp(10px, 3vw, 14px);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .hs-portrait { font-size: var(--icon-xxl); }
    .hs-basic { flex: 1; }
    .hs-name { font-size: var(--label-lg); font-weight: 700; margin-bottom: 4px; }
    .hs-class-row { font-size: var(--label-md); color: var(--text-secondary, #aaa); margin-bottom: 6px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .hs-exp-row { display: flex; align-items: center; gap: clamp(6px, 2vw, 8px); }
    .hs-exp-bar { flex: 1; height: clamp(8px, 2.5vw, 10px); background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden; }
    .hs-exp-fill { height: 100%; background: linear-gradient(90deg, #67e8f9, #9b8aff); border-radius: 5px; transition: width 0.3s; }
    .hs-exp-text { font-size: var(--label-sm); color: var(--text-secondary, #aaa); white-space: nowrap; }

    /* 섹션 */
    .hs-section { margin-bottom: clamp(10px, 3vw, 14px); }
    .hs-section-title {
      font-size: clamp(12px, 3.2vw, 15px); font-weight: 700; margin-bottom: clamp(6px, 1.5vw, 8px);
      display: flex; justify-content: space-between; align-items: center;
    }
    .hs-points { font-size: var(--label-md); color: #fbbf24; font-weight: 400; }

    /* 스탯 그리드 */
    .hs-stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(4px, 1.5vw, 6px);
      padding: clamp(8px, 2.5vw, 10px); background: var(--bg-card, rgba(30,35,55,0.9));
      border-radius: 10px; border: 1px solid rgba(255,255,255,0.06);
    }
    .hs-stat-cell { text-align: center; font-size: var(--label-md); }
    .hs-stat-icon { display: block; font-size: clamp(16px, 4.5vw, 22px); margin-bottom: 2px; }
    .hs-stat-label { display: block; color: var(--text-muted, #888); font-size: var(--label-sm); }
    .hs-stat-val { display: block; font-weight: 700; color: #ddd; }

    /* 장비 그리드 */
    .hs-equip-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(6px, 2vw, 8px); }
    .hs-equip-slot {
      text-align: center; padding: clamp(8px, 2.5vw, 10px) clamp(4px, 1.5vw, 6px); cursor: pointer;
      background: var(--bg-card, rgba(30,35,55,0.9)); border: 2px dashed rgba(255,255,255,0.15);
      border-radius: 10px; transition: all 0.2s;
    }
    .hs-equip-slot:hover { background: rgba(255,255,255,0.08); transform: scale(1.03); }
    .hs-equip-emoji { font-size: var(--icon-md); margin-bottom: 2px; }
    .hs-equip-name { font-size: var(--label-md); font-weight: 600; }
    .hs-equip-rarity { font-size: var(--label-sm); }
    .hs-equip-empty { font-size: var(--label-sm); color: var(--text-muted, #888); }

    /* 영웅 슬롯 */
    .hs-hero-slots { display: flex; gap: clamp(6px, 2vw, 8px); flex-wrap: wrap; }
    .hs-hero-slot {
      flex: 1 1 clamp(48px, 13vw, 60px); min-width: clamp(48px, 13vw, 60px); max-width: clamp(58px, 16vw, 72px);
      text-align: center; padding: clamp(6px, 2vw, 8px) clamp(3px, 1vw, 4px); cursor: pointer;
      background: var(--bg-card, rgba(30,35,55,0.9)); border: 2px dashed rgba(155,138,255,0.3);
      border-radius: 10px; transition: all 0.2s;
    }
    .hs-hero-slot:hover:not(.locked) { background: rgba(155,138,255,0.12); transform: scale(1.03); }
    .hs-hero-slot.locked { opacity: 0.4; cursor: default; border-color: rgba(255,255,255,0.08); }
    .hs-hero-slot.filled { border-style: solid; }
    .hs-hero-emoji { font-size: var(--icon-md); }
    .hs-hero-label { font-size: var(--label-sm); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* 펫 영역 */
    .hs-pet-area { display: flex; gap: clamp(8px, 2.5vw, 10px); align-items: flex-start; flex-wrap: wrap; }
    .hs-pet-slot {
      text-align: center; padding: clamp(8px, 2.5vw, 10px) clamp(10px, 3vw, 14px); cursor: pointer;
      background: var(--bg-card, rgba(30,35,55,0.9)); border: 2px dashed rgba(134,239,172,0.3);
      border-radius: 12px; transition: all 0.2s; min-width: clamp(65px, 18vw, 85px);
    }
    .hs-pet-slot:hover:not(.locked) { background: rgba(134,239,172,0.1); transform: scale(1.03); }
    .hs-pet-slot.locked { opacity: 0.4; cursor: default; border-color: rgba(255,255,255,0.08); }
    .hs-pet-slot.filled { border-style: solid; }
    .hs-pet-emoji { font-size: var(--icon-lg); }
    .hs-pet-label { font-size: var(--label-md); font-weight: 600; margin-top: 2px; }
    .hs-pet-sub { font-size: clamp(8px, 2.2vw, 11px); color: var(--text-muted, #888); margin-top: 2px; }
    .hs-pet-equip-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; min-width: clamp(140px, 40vw, 170px); }
    .hs-pet-equip-slot {
      text-align: center; padding: clamp(6px, 2vw, 8px) clamp(3px, 1vw, 4px); cursor: pointer;
      background: var(--bg-card, rgba(30,35,55,0.9)); border: 2px dashed rgba(134,239,172,0.2);
      border-radius: 8px; transition: all 0.2s;
    }
    .hs-pet-equip-slot:hover { background: rgba(134,239,172,0.08); transform: scale(1.03); }
    .hs-pet-equip-emoji { font-size: clamp(16px, 4.5vw, 22px); }
    .hs-pet-equip-name { font-size: var(--label-sm); font-weight: 600; }
    .hs-pet-equip-rarity { font-size: clamp(8px, 2.2vw, 11px); }
    .hs-pet-equip-hint { font-size: clamp(8px, 2.2vw, 11px); color: var(--text-muted, #888); }
    .hs-pet-equip-empty { font-size: var(--label-md); color: var(--text-muted, #888); padding: clamp(8px, 2.5vw, 10px); flex: 1; }

    /* 업그레이드 그리드 */
    .hs-upgrade-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(6px, 2vw, 8px); }
    .hs-upgrade-card {
      padding: clamp(6px, 2vw, 8px) clamp(8px, 2.5vw, 10px); background: var(--bg-card, rgba(30,35,55,0.9));
      border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
    }
    .hs-upgrade-top { display: flex; justify-content: space-between; font-size: var(--label-md); margin-bottom: 4px; }
    .hs-upgrade-lv { color: var(--text-secondary, #aaa); }
    .hs-upgrade-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
    .hs-upgrade-fill { height: 100%; background: linear-gradient(90deg, #86efac, #67e8f9); border-radius: 3px; transition: width 0.3s; }
    .hs-upgrade-next { font-size: var(--label-sm); color: #fbbf24; margin-bottom: 4px; }
    .hs-upgrade-btn { font-size: var(--label-sm); padding: clamp(2px, 0.5vw, 3px) clamp(6px, 2vw, 8px); }
    .hs-upgrade-btn.disabled { opacity: 0.3; cursor: default; }

    /* 스킬 */
    .hs-skills { display: flex; flex-direction: column; gap: clamp(6px, 2vw, 8px); }
    .hs-skill-card {
      padding: clamp(8px, 2.5vw, 10px) clamp(10px, 3vw, 12px); background: var(--bg-card, rgba(30,35,55,0.9));
      border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; font-size: var(--label-md);
    }
    .hs-skill-type {
      font-size: var(--label-sm); padding: 1px clamp(4px, 1.5vw, 6px); border-radius: 4px; margin-right: 6px; font-weight: 700;
    }
    .hs-skill-type.active { background: rgba(255,107,107,0.2); color: #ff6b6b; }
    .hs-skill-type.passive { background: rgba(103,232,249,0.2); color: #67e8f9; }
    .hs-skill-emoji { margin-right: 4px; }
    .hs-skill-desc { font-size: var(--label-md); color: var(--text-secondary, #aaa); margin-top: 4px; }

    /* 서브 팝업 */
    .hs-sub-popup-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 6000;
      display: flex; align-items: center; justify-content: center;
    }
    .hs-sub-popup {
      background: #1a1a2e; border-radius: 16px; padding: clamp(14px, 4vw, 20px);
      max-width: clamp(280px, 85vw, 400px); width: 90%; max-height: 75vh; overflow-y: auto;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .hs-popup-title { font-size: var(--label-lg); font-weight: 700; margin-bottom: clamp(8px, 2.5vw, 12px); }
    .hs-popup-current {
      display: flex; justify-content: space-between; align-items: center;
      padding: clamp(6px, 2vw, 8px) clamp(8px, 2.5vw, 10px); background: rgba(255,255,255,0.04); border-radius: 8px; margin-bottom: clamp(8px, 2.5vw, 10px); font-size: clamp(12px, 3.2vw, 15px);
    }
    .hs-popup-list { display: flex; flex-direction: column; gap: clamp(4px, 1.5vw, 6px); max-height: clamp(240px, 50vh, 320px); overflow-y: auto; }
    .hs-popup-item {
      display: flex; align-items: center; gap: clamp(8px, 2.5vw, 10px); padding: clamp(6px, 2vw, 8px) clamp(8px, 2.5vw, 10px);
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px; font-size: var(--label-md); transition: background 0.15s;
    }
    .hs-popup-item:hover { background: rgba(255,255,255,0.07); }
    .hs-popup-item.disabled-row { opacity: 0.5; }
    .hs-popup-item.current-class { border-color: rgba(103,232,249,0.4); }
    .hs-popup-item-emoji {
      font-size: var(--icon-md); width: clamp(32px, 9vw, 42px); height: clamp(32px, 9vw, 42px); display: flex; align-items: center; justify-content: center;
      border: 2px solid rgba(255,255,255,0.1); border-radius: 8px; flex-shrink: 0;
    }
    .hs-popup-item-info { flex: 1; min-width: 0; }

    /* 토스트 */
    .hs-toast {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(30,35,55,0.95); color: #fbbf24; padding: clamp(6px, 2vw, 8px) clamp(14px, 4vw, 20px);
      border-radius: 20px; font-size: var(--label-md); z-index: 7000;
      border: 1px solid rgba(251,191,36,0.3);
      animation: hs-toast-in 0.3s ease;
    }
    @keyframes hs-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

    /* 튜토리얼 */
    .hs-tut-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.65); z-index: 8000;
      display: flex; align-items: flex-end; justify-content: center; padding-bottom: clamp(30px, 8vw, 40px);
    }
    .hs-tut-card {
      background: #1a1a2e; border: 2px solid #67e8f9; border-radius: 16px;
      padding: clamp(14px, 4vw, 22px); max-width: clamp(260px, 80vw, 360px); width: 90%; text-align: center;
    }
    .hs-tut-step { font-size: var(--label-sm); color: #67e8f9; margin-bottom: 6px; }
    .hs-tut-title { font-size: var(--label-lg); font-weight: 700; margin-bottom: clamp(6px, 2vw, 8px); }
    .hs-tut-desc { font-size: clamp(12px, 3.2vw, 15px); color: #ccc; margin-bottom: clamp(10px, 3vw, 14px); line-height: 1.5; }
    .hs-tut-buttons { display: flex; justify-content: space-between; gap: clamp(8px, 2.5vw, 10px); }
    .hs-tut-buttons > * { flex: 1; }

    /* 하이라이트 */
    .hs-tut-highlight {
      position: relative; z-index: 8001;
      box-shadow: 0 0 0 4px rgba(103,232,249,0.5), 0 0 20px rgba(103,232,249,0.3);
      border-radius: 12px;
    }

    /* 작은 버튼 */
    .btn-tiny {
      font-size: var(--label-sm); padding: clamp(2px, 0.5vw, 3px) clamp(6px, 2vw, 8px); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px; background: rgba(255,255,255,0.06); color: #ddd;
      cursor: pointer; transition: background 0.15s;
    }
    .btn-tiny:hover { background: rgba(255,255,255,0.12); }
    .btn-tiny:disabled, .btn-tiny.disabled { opacity: 0.3; cursor: default; pointer-events: none; }
  `;
  document.head.appendChild(style);
}
