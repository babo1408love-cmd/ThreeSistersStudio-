/**
 * worldmap-scene.js — 10지역 월드맵 UI
 * 각 지역 잠금/해제, 지역별 분위기, 스테이지 선택
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import { REGIONS } from '../data/stages.js';

export default class WorldmapScene {
  onCreate() {}

  render() {
    const maxCleared = GameState.currentStage || 1;
    const unlockedRegions = Math.min(10, Math.ceil(maxCleared / 20) + 1);

    let regionCards = '';
    REGIONS.forEach((r, i) => {
      const locked = i >= unlockedRegions;
      const stageStart = i * 20 + 1;
      const stageEnd = (i + 1) * 20;
      const progress = Math.max(0, Math.min(20, maxCleared - i * 20));
      const progressPct = Math.round((progress / 20) * 100);
      regionCards += `
        <div class="pg-region ${locked ? 'pg-region-locked' : ''}"
             data-region="${i}" style="--region-color:${r.color}">
          <div class="pg-region-emoji">${locked ? '🔒' : r.emoji}</div>
          <div class="pg-region-name">${r.name}</div>
          <div class="pg-region-desc">${locked ? '???' : r.desc}</div>
          <div class="pg-progress">
            <div class="pg-progress-bar">
              <div class="pg-progress-fill" style="width:${locked ? 0 : progressPct}%;background:var(--region-color,var(--purple))"></div>
            </div>
            <span class="pg-progress-text">${locked ? '잠김' : `${progress}/20`}</span>
          </div>
          ${!locked ? `<div class="pg-region-stages">스테이지 ${stageStart}~${stageEnd}</div>` : ''}
        </div>
      `;
    });

    this.el.innerHTML = `
      <div class="pg">
        <div class="pg-hdr">
          <button class="pg-back" id="wm-back">← 돌아가기</button>
          <h2>월드맵</h2>
          <div class="pg-info">Lv.${GameState.heroLevel} | 스테이지 ${maxCleared}</div>
        </div>
        <div class="pg-grid">${regionCards}</div>
        <div class="pg-text-center pg-text-muted pg-text-sm" style="margin-top:12px;">
          🗺️ 해금 지역: ${unlockedRegions}/10
        </div>
      </div>
    `;

    this.el.querySelector('#wm-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.pg-region:not(.pg-region-locked)').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.region);
        this._selectRegion(idx);
      };
    });
  }

  _selectRegion(regionIdx) {
    const region = REGIONS[regionIdx];
    if (!region) return;
    const stageStart = regionIdx * 20 + 1;
    const maxCleared = GameState.currentStage || 1;

    let stageList = '';
    for (let i = 0; i < 20; i++) {
      const stageId = stageStart + i;
      const cleared = stageId < maxCleared;
      const current = stageId === maxCleared;
      const locked = stageId > maxCleared;
      let label = `스테이지 ${stageId}`;
      if (i >= 18) label += ' (보스)';
      else if (i >= 15) label += ' (엘리트)';
      const stars = cleared ? '⭐⭐⭐' : current ? '▶️' : '🔒';
      stageList += `
        <div class="pg-stage ${locked ? 'pg-stage-locked' : cleared ? 'pg-stage-cleared' : 'pg-stage-current'}"
             data-stage="${stageId}">
          <span>${label}</span><span>${stars}</span>
        </div>
      `;
    }

    const gridEl = this.el.querySelector('.pg-grid');
    gridEl.innerHTML = `
      <div style="grid-column:1/-1;">
        <div class="pg-hdr" style="margin-bottom:10px;">
          <button class="pg-back" id="wm-region-back">← 지역목록</button>
          <h2>${region.emoji} ${region.name}</h2>
        </div>
        <div class="pg-list" style="max-height:60vh;overflow-y:auto;">${stageList}</div>
      </div>
    `;

    this.el.querySelector('#wm-region-back').onclick = () => this.render();
    this.el.querySelectorAll('.pg-stage:not(.pg-stage-locked)').forEach(el => {
      el.onclick = () => {
        const sid = parseInt(el.dataset.stage);
        GameState.currentStage = sid;
        GameState.currentPhase = 'candy';
        GameState.resetStageProgress();
        SaveManager.save();
        SceneManager.go('stage1');
      };
    });
  }

  onEnter() {}
  onLeave() {}
}
