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

      // HeroAI 파티 동기화 + 스탯 계산
      this._syncHeroAI();

      SaveManager.saveCheckpoint();
      SaveManager.save();
      SceneManager.go('stage2');
    };

    // 정령 삭제 버튼 바인딩
    container.querySelectorAll('.spirit-delete-badge').forEach(badge => {
      badge.onclick = (e) => {
        e.stopPropagation();
        const slot = badge.closest('.spirit-slot');
        const spiritId = Number(slot?.dataset?.spiritId);
        const spiritKey = slot?.dataset?.spiritKey;
        const spiritRarity = slot?.dataset?.spiritRarity;
        if (spiritId) this._deleteSpirit(spiritId, spiritKey, spiritRarity, container);
      };
    });
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

      <div style="margin-bottom:16px;display:flex;flex-direction:column;gap:8px;align-items:center;">
        <button class="btn ${canSummon ? 'btn-primary' : 'btn-disabled'} btn-lg" id="btn-summon"
          ${canSummon ? '' : 'disabled'} style="${canSummon ? 'animation:pulse 1.5s infinite;' : 'opacity:0.4;'}">
          🌳 정령 소환! (조각 6개)
        </button>
        ${setsAvailable >= 2 && !spiritsFull ? `
          <button class="btn btn-primary btn-lg" id="btn-summon-all"
            style="background:linear-gradient(135deg,var(--purple),var(--gold));border:none;">
            🌟 모두 소환! (${setsAvailable}회)
          </button>
        ` : ''}
      </div>
    `;

    const summonBtn = el.querySelector('#btn-summon');
    if (canSummon && summonBtn) {
      summonBtn.onclick = () => this._doAutoSummon();
    }
    const summonAllBtn = el.querySelector('#btn-summon-all');
    if (summonAllBtn) {
      summonAllBtn.onclick = () => this._doSummonAll();
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

  // ── 정령 스택 렌더 (같은 속성+등급 묶기 + 삭제 버튼) ──
  _renderSpiritStacks(spirits) {
    if (spirits.length === 0) return '';
    const stacks = {};
    for (const s of spirits) {
      const key = `${s.key || s.name}_${s.rarity}`;
      if (!stacks[key]) stacks[key] = { spirit: s, count: 0, ids: [] };
      stacks[key].count++;
      stacks[key].ids.push(s.id);
    }
    return Object.values(stacks).map(({ spirit, count, ids }) => {
      const rColor = RARITY_COLORS[spirit.rarity] || '#86efac';
      const firstId = ids[0];
      return `<div class="spirit-slot filled" style="border-color:${rColor};position:relative;cursor:pointer;" title="${spirit.name} (${RARITY_NAMES[spirit.rarity] || spirit.rarity})${spirit.ability ? '\n' + spirit.ability.description : ''}\n클릭: 삭제" data-spirit-id="${firstId}" data-spirit-key="${spirit.key || spirit.name}" data-spirit-rarity="${spirit.rarity}">
        ${spirit.emoji}
        ${count > 1 ? `<span style="position:absolute;top:-4px;right:-4px;background:${rColor};color:#000;font-size:10px;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;font-weight:700;">×${count}</span>` : ''}
        <span class="spirit-delete-badge" style="position:absolute;bottom:-4px;right:-4px;background:#ff4444;color:#fff;font-size:8px;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-weight:700;cursor:pointer;">✕</span>
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

    // HeroAI 자동 등록 (주인공 흡수)
    this._absorbSpiritToHero(spirit);

    // 소환 연출
    this._showSummonReveal(spirit);
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

      const spirit = { ...resultSpirit, id: Date.now() + summoned.length, level: 1, exp: 0 };
      GameState.summonSpirit(spirit);
      this._absorbSpiritToHero(spirit);
      summoned.push(spirit);
    }

    if (summoned.length === 0) {
      showToast('소환할 조각이 부족합니다!');
      return;
    }

    // 연쇄 소환 연출
    for (let i = 0; i < summoned.length; i++) {
      this._showSummonReveal(summoned[i]);
      if (i < summoned.length - 1) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    showToast(`🌟 ${summoned.length}마리 연속 소환 완료!`);
    // 화면 갱신
    setTimeout(() => this.render(), 1500);
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

    // 흡수 보너스 표시
    const atkBonus = spirit.stats?.attack || 10;
    const defBonus = spirit.defense || 1;

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
        방어: ${defBonus} | 공격: ${atkBonus} | 공속: ${spirit.spiritAtkSpeed || 2.0}초
      </div>
      ${spirit.ability ? `<div style="margin-top:4px;font-size:0.85em;color:var(--gold);">${spirit.ability.name}: ${spirit.ability.description}</div>` : ''}
      <div style="margin-top:12px;padding:8px 12px;background:rgba(100,255,150,0.15);border:1px solid rgba(100,255,150,0.4);border-radius:8px;">
        <div style="font-size:0.95em;color:#66ffaa;font-weight:700;">🧚 주인공에게 흡수!</div>
        <div style="font-size:0.8em;color:var(--text-secondary);margin-top:4px;">
          ATK +${atkBonus} | DEF +${defBonus} | 전투 중 자동 공격
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:16px;" id="reveal-close">확인</button>
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
    HeroAI.party._calculated = false; // 다음 calculateAll() 시 재계산

    // HeroAIVisual 소환 연출
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

    // 확인 팝업
    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
      <div style="font-size:50px;">${spirit.emoji || '✨'}</div>
      <div style="font-size:1.1em;font-weight:700;margin:8px 0;color:#ff6b6b;">정령 해방</div>
      <div style="font-size:0.9em;color:var(--text-secondary);margin-bottom:8px;">
        "${name}"을(를) 해방하시겠습니까?<br>
        <span style="color:#ff4444;font-size:0.85em;">해방된 정령은 소환의 나무로 돌아갑니다</span>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
        <button class="btn btn-secondary btn-sm" id="del-cancel">취소</button>
        <button class="btn btn-sm" style="background:#ff4444;color:#fff;" id="del-confirm">해방</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#del-cancel').onclick = () => overlay.remove();
    overlay.querySelector('#del-confirm').onclick = () => {
      // GameState에서 제거
      GameState.spirits = GameState.spirits.filter(s => s.id !== spiritId);
      // HeroAI에서도 제거
      if (typeof HeroAI !== 'undefined') {
        HeroAI.consumeSpirit('spirit_' + spiritId);
        HeroAI.party._calculated = false;
      }
      overlay.remove();
      showToast(`🌳 ${name} 해방! 소환의 나무로 돌아갔습니다`);
      // 화면 갱신
      if (container) this._renderContent(container);
    };
  }

  // ── HeroAI 파티 동기화 (출발 시 호출) ──
  _syncHeroAI() {
    if (typeof HeroAI === 'undefined') return;

    // 파티 초기화
    HeroAI.party.heroes = [];
    HeroAI.party.spirits = [];
    HeroAI.party.pet = null;
    HeroAI.party._calculated = false;

    // 영웅 등록 (heroSlots에서 — 최대 5명)
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

    // 주인공 자체도 영웅 0번으로 등록 (항상)
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

    // 정령 등록 (소모품)
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

    // 펫 등록
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

    // 전체 스탯 계산
    const partyData = HeroAI.calculateAll();

    // 계산 결과를 GameState에 반영 (시너지+정령+펫 보너스 반영)
    if (partyData && partyData.heroes.length > 0) {
      const mainStats = partyData.heroes[0].stats;
      // 보너스 스탯을 기존 플레이어 스탯에 가산
      GameState.player.attack += Math.floor((mainStats.atk || 0) * 0.1);
      GameState.player.defense += Math.floor((mainStats.def || 0) * 0.1);
      GameState.player.maxHp += Math.floor((mainStats.hp || 0) * 0.05);
      GameState.player.hp = GameState.player.maxHp;
    }

    // 글로벌에 파티 데이터 저장 (combat-engine/survival에서 참조)
    window._heroAIPartyData = partyData;
    console.log('[HeroAI] 파티 동기화 완료 — 총 전투력:', partyData?.totalPower || 0);
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
