/**
 * worldmap-scene.js — 10지역 월드맵 UI
 * 각 지역 잠금/해제, 지역별 분위기, 스테이지 선택
 */
import SceneManager from '../core/scene-manager.js';
import GameState from '../core/game-state.js';
import SaveManager from '../core/save-manager.js';
import { REGIONS } from '../data/stages.js';

const REGION_LAYOUT = [
  // [row, col] for grid layout (5x2)
  [0,0],[0,1],[0,2],[0,3],[0,4],
  [1,0],[1,1],[1,2],[1,3],[1,4],
];

export default class WorldmapScene {
  onCreate() {}

  render() {
    const maxCleared = GameState.currentStage || 1;
    // Determine which regions are unlocked (every 20 stages = 1 region)
    const unlockedRegions = Math.min(10, Math.ceil(maxCleared / 20) + 1);

    let regionCards = '';
    REGIONS.forEach((r, i) => {
      const locked = i >= unlockedRegions;
      const stageStart = i * 20 + 1;
      const stageEnd = (i + 1) * 20;
      const progress = Math.max(0, Math.min(20, maxCleared - i * 20));
      const progressPct = Math.round((progress / 20) * 100);
      regionCards += `
        <div class="wm-region ${locked ? 'wm-locked' : 'wm-unlocked'}"
             data-region="${i}" style="--region-color:${r.color}">
          <div class="wm-region-emoji">${locked ? '🔒' : r.emoji}</div>
          <div class="wm-region-name">${r.name}</div>
          <div class="wm-region-desc">${locked ? '???' : r.desc}</div>
          <div class="wm-region-progress">
            <div class="wm-progress-bar">
              <div class="wm-progress-fill" style="width:${locked ? 0 : progressPct}%"></div>
            </div>
            <span class="wm-progress-text">${locked ? '잠김' : `${progress}/20`}</span>
          </div>
          ${!locked ? `<div class="wm-region-stages">스테이지 ${stageStart}~${stageEnd}</div>` : ''}
        </div>
      `;
    });

    this.el.innerHTML = `
      <div class="worldmap">
        <div class="wm-header">
          <button class="btn btn-secondary" id="wm-back">← 돌아가기</button>
          <h2>월드맵</h2>
          <div class="wm-player-info">Lv.${GameState.heroLevel} | 스테이지 ${maxCleared}</div>
        </div>
        <div class="wm-grid">${regionCards}</div>
        <div class="wm-footer">
          <span>🗺️ 해금 지역: ${unlockedRegions}/10</span>
        </div>
      </div>
      <style>
        .worldmap { padding: 12px; max-width: 600px; margin: 0 auto; min-height: 100vh; }
        .wm-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .wm-header h2 { flex: 1; text-align: center; font-size: 20px; color: #f0e6d2; margin: 0; }
        .wm-player-info { font-size: 12px; color: #aaa; white-space: nowrap; }
        .wm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .wm-region {
          background: rgba(255,255,255,0.05);
          border: 2px solid var(--region-color, #444);
          border-radius: 12px;
          padding: 12px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .wm-region.wm-unlocked:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px color-mix(in srgb, var(--region-color) 40%, transparent);
        }
        .wm-region.wm-locked {
          opacity: 0.5; cursor: not-allowed;
          border-color: #333; filter: grayscale(0.8);
        }
        .wm-region-emoji { font-size: 32px; text-align: center; margin-bottom: 4px; }
        .wm-region-name { font-size: 14px; font-weight: bold; color: #f0e6d2; text-align: center; }
        .wm-region-desc { font-size: 11px; color: #888; text-align: center; margin: 4px 0; line-height: 1.3; }
        .wm-region-progress { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
        .wm-progress-bar { flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
        .wm-progress-fill { height: 100%; background: var(--region-color, #4CAF50); border-radius: 3px; transition: width 0.5s; }
        .wm-progress-text { font-size: 11px; color: #aaa; white-space: nowrap; }
        .wm-region-stages { font-size: 10px; color: #666; text-align: center; margin-top: 4px; }
        .wm-footer { text-align: center; margin-top: 16px; font-size: 13px; color: #888; }
        @media (max-width: 400px) { .wm-grid { grid-template-columns: 1fr; } }
      </style>
    `;

    // Events
    this.el.querySelector('#wm-back').onclick = () => SceneManager.go('menu');
    this.el.querySelectorAll('.wm-region.wm-unlocked').forEach(el => {
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

    // Show stage list for this region
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
        <div class="wm-stage ${locked ? 'wm-stage-locked' : cleared ? 'wm-stage-cleared' : 'wm-stage-current'}"
             data-stage="${stageId}">
          <span>${label}</span><span>${stars}</span>
        </div>
      `;
    }

    this.el.querySelector('.wm-grid').innerHTML = `
      <div class="wm-stage-panel" style="grid-column: 1/-1;">
        <div class="wm-stage-header">
          <button class="btn btn-secondary btn-sm" id="wm-region-back">← 지역목록</button>
          <span>${region.emoji} ${region.name}</span>
        </div>
        <div class="wm-stage-list">${stageList}</div>
      </div>
      <style>
        .wm-stage-panel { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 12px; }
        .wm-stage-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 16px; color: #f0e6d2; }
        .wm-stage-list { display: flex; flex-direction: column; gap: 4px; max-height: 60vh; overflow-y: auto; }
        .wm-stage { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px;
          background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px; cursor: pointer; }
        .wm-stage-cleared { color: #4CAF50; }
        .wm-stage-current { color: #FFD700; border: 1px solid #FFD700; }
        .wm-stage-locked { color: #555; cursor: not-allowed; }
        .wm-stage:not(.wm-stage-locked):hover { background: rgba(255,255,255,0.1); }
      </style>
    `;

    this.el.querySelector('#wm-region-back').onclick = () => this.render();
    this.el.querySelectorAll('.wm-stage:not(.wm-stage-locked)').forEach(el => {
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
