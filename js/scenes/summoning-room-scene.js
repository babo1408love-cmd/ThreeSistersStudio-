// Summoning Room Scene — 파츠 기반 정령 소환
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import EventBus from '../core/event-bus.js';
import SPIRITS, { RARITY_COLORS, RARITY_NAMES, RARITY_BG } from '../data/spirits.js';
import { SPIRIT_PARTS, PART_KEYS, autoMatchParts, determineSummonResult } from '../data/spirit-parts-config.js';
import { createHudBar, updateHud } from '../ui/hud.js';
import { showConfetti, showToast } from '../ui/toast.js';

export default class SummoningRoomScene {
  onCreate() {
    this._revealOverlay = null;
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

    // 부위별 파츠 카운트
    const partCounts = {};
    for (const pk of PART_KEYS) partCounts[pk] = 0;
    spiritItems.forEach(item => {
      if (item.part && partCounts[item.part] !== undefined) {
        partCounts[item.part]++;
      }
    });

    // 자동 매칭 가능 여부
    const matchResult = autoMatchParts(spiritItems);
    const canSummon = matchResult.success;

    container.innerHTML = `
      <div class="scene-title" style="color:var(--purple);">🌳 소환의 나무</div>
      <div class="scene-subtitle">6부위 파츠를 모아 정령을 깨워 함께 싸우세요</div>

      <div class="summoning-tree" id="summon-tree">🌳</div>

      <div style="margin-bottom:12px;color:var(--text-secondary);font-size:0.9em;">
        보유 정령 파츠: ${spiritItems.length}개
      </div>

      <!-- 부위별 파츠 현황 -->
      <div id="parts-grid" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;max-width:360px;margin-left:auto;margin-right:auto;"></div>

      <!-- 소환 버튼 -->
      <div style="margin-bottom:16px;">
        <button class="btn ${canSummon ? 'btn-primary' : 'btn-disabled'} btn-lg" id="btn-summon"
          ${canSummon ? '' : 'disabled'} style="${canSummon ? 'animation:pulse 1.5s infinite;' : 'opacity:0.4;'}">
          🌳 정령 소환!
        </button>
        ${!canSummon && matchResult.missing ? `
          <div style="font-size:0.75em;color:var(--text-muted);margin-top:6px;">
            부족: ${matchResult.missing.map(k => {
              const p = SPIRIT_PARTS.find(sp => sp.key === k);
              return p ? p.emoji + p.name : k;
            }).join(', ')}
          </div>
        ` : ''}
      </div>

      <!-- 소환된 정령 -->
      <div style="margin-bottom:16px;">
        <div style="color:var(--text-secondary);font-size:0.85em;margin-bottom:8px;">
          소환된 정령 (${spirits.length}마리)
        </div>
        <div class="spirit-slots" id="spirit-slots">
          ${spirits.length === 0 ? '<div style="color:var(--text-muted);font-size:0.85em;">아직 소환된 정령이 없습니다</div>' : ''}
          ${spirits.map(s => `
            <div class="spirit-slot filled" title="${s.name}\n${s.ability.description}">
              ${s.emoji}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary btn-lg" id="btn-depart">⚔️ 전투 출발!</button>
      </div>
    `;

    // 부위별 파츠 현황 렌더링
    const partsGrid = container.querySelector('#parts-grid');
    SPIRIT_PARTS.forEach(partDef => {
      const count = partCounts[partDef.key] || 0;
      const hasIt = count > 0;
      const div = document.createElement('div');
      div.style.cssText = `
        display:flex;flex-direction:column;align-items:center;
        width:50px;padding:6px 4px;
        background:${hasIt ? 'rgba(134,239,172,0.12)' : 'rgba(30,30,50,0.6)'};
        border:2px solid ${hasIt ? 'var(--green)' : 'var(--border-subtle)'};
        border-radius:8px;opacity:${hasIt ? '1' : '0.5'};
        transition:all 0.2s;
      `;
      div.innerHTML = `
        <div style="font-size:18px;">${partDef.emoji}</div>
        <div style="font-size:10px;font-weight:700;color:${hasIt ? 'var(--green)' : 'var(--text-muted)'};">${partDef.name}</div>
        <div style="font-size:10px;color:var(--text-secondary);">×${count}</div>
      `;
      partsGrid.appendChild(div);
    });

    // 소환 버튼
    const summonBtn = container.querySelector('#btn-summon');
    if (canSummon && summonBtn) {
      summonBtn.onclick = () => this._doAutoSummon();
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

  // 자동 매칭 소환
  _doAutoSummon() {
    const matchResult = autoMatchParts(GameState.spiritItems);
    if (!matchResult.success) {
      showToast('파츠가 부족합니다!');
      return;
    }

    // 소환 결과 결정
    const resultSpirit = determineSummonResult(matchResult.selectedParts, SPIRITS);
    if (!resultSpirit) {
      showToast('소환 실패...');
      return;
    }

    // 사용된 파츠 제거 (미사용 파츠는 인벤토리에 잔류)
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
    this._showSummonReveal(spirit, matchResult.selectedParts);
  }

  _showSummonReveal(spirit, usedParts) {
    showConfetti();

    const badgeClass = ({common:'green',rare:'purple',magic:'cyan',epic:'gold',legendary:'red'})[spirit.rarity] || 'green';
    const overlay = document.createElement('div');
    overlay.className = 'summon-reveal';
    overlay.innerHTML = `
      <div class="summon-reveal__spirit">${spirit.emoji}</div>
      <div class="summon-reveal__name">${spirit.name}</div>
      <div class="summon-reveal__stats">
        <span class="badge badge-${badgeClass}">
          ${RARITY_NAMES[spirit.rarity]}
        </span>
        <div style="margin-top:8px;font-size:0.85em;">
          공격: ${spirit.stats.attack} | 방어: ${spirit.stats.defense} | 속도: ${spirit.stats.speed}
        </div>
        <div style="margin-top:4px;font-size:0.85em;color:var(--gold);">
          ${spirit.ability.name}: ${spirit.ability.description}
        </div>
      </div>
      ${usedParts ? `
        <div style="margin-top:12px;font-size:0.75em;color:var(--text-secondary);">
          사용된 파츠: ${usedParts.map(p => `${p.partEmoji || ''}${SPIRIT_PARTS.find(sp => sp.key === p.part)?.name || p.part}`).join(' + ')}
        </div>
      ` : ''}
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
  }
}
