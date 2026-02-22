/**
 * character-visual-system.js
 * 캐릭터 이미지 시스템 — 실제 PNG 이미지를 게임에서 사용
 *
 * 기능:
 * 1. character-catalog.json 로드
 * 2. 캐릭터 타입/속성/등급에 맞는 이미지 검색
 * 3. Canvas에 이미지 렌더링 (없으면 기존 Canvas 드로잉으로 폴백)
 * 4. 이미지 캐시 관리
 *
 * 사용법:
 *   import CharacterVisualSystem from '../systems/character-visual-system.js';
 *   const cvs = new CharacterVisualSystem();
 *   await cvs.init();
 *   cvs.drawCharacter(ctx, 'spirit', { element: '불', rarity: 'Rare' }, x, y, size);
 */

export default class CharacterVisualSystem {
  constructor() {
    this.catalog = null;
    this.imageCache = new Map();   // file → HTMLImageElement
    this.catalogByElement = {};    // element → [entries]
    this.catalogByRarity = {};     // rarity → [entries]
    this.ready = false;
  }

  // ─────────────────────────────────────────────
  // 초기화
  // ─────────────────────────────────────────────
  async init() {
    try {
      const resp = await fetch('js/data/character-catalog.json');
      if (!resp.ok) throw new Error('카탈로그 파일 없음');
      this.catalog = await resp.json();
      this._buildIndex();
      this.ready = true;
      console.log(`[CharacterVisual] ✅ 캐릭터 ${this.catalog.total}개 로드됨`);
    } catch (e) {
      console.warn('[CharacterVisual] ⚠️ 카탈로그 로드 실패 (Canvas 드로잉 사용):', e.message);
      this.catalog = { characters: [], total: 0 };
      this.ready = false;
    }
    return this;
  }

  _buildIndex() {
    if (!this.catalog?.characters) return;
    this.catalogByElement = {};
    this.catalogByRarity = {};

    for (const c of this.catalog.characters) {
      // 속성 인덱스
      if (!this.catalogByElement[c.element]) {
        this.catalogByElement[c.element] = [];
      }
      this.catalogByElement[c.element].push(c);

      // 등급 인덱스
      if (!this.catalogByRarity[c.rarity]) {
        this.catalogByRarity[c.rarity] = [];
      }
      this.catalogByRarity[c.rarity].push(c);
    }
  }

  // ─────────────────────────────────────────────
  // 캐릭터 검색
  // ─────────────────────────────────────────────

  /**
   * 속성 + 등급으로 랜덤 캐릭터 이미지 찾기
   * @param {string} element  속성 (불/물/풀/번개/빛/어둠/얼음/바람)
   * @param {string} rarity   등급 (Common/Rare/Epic/Legendary)
   * @returns {object|null}   카탈로그 엔트리
   */
  findByElementAndRarity(element, rarity) {
    if (!this.ready) return null;

    let pool = this.catalogByElement[element] || [];

    // 정확한 등급 먼저, 없으면 같은 속성에서 랜덤
    const exact = pool.filter(c => c.rarity === rarity);
    if (exact.length > 0) {
      return exact[Math.floor(Math.random() * exact.length)];
    }
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // 속성도 없으면 전체에서 등급 일치 찾기
    const byRarity = this.catalogByRarity[rarity] || [];
    if (byRarity.length > 0) {
      return byRarity[Math.floor(Math.random() * byRarity.length)];
    }

    // 그것도 없으면 완전 랜덤
    const all = this.catalog.characters;
    return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
  }

  /**
   * ID로 특정 캐릭터 찾기
   * @param {number} id
   */
  findById(id) {
    if (!this.ready) return null;
    return this.catalog.characters.find(c => c.id === id) || null;
  }

  // ─────────────────────────────────────────────
  // 이미지 로딩
  // ─────────────────────────────────────────────

  /**
   * 이미지 로드 (캐시 활용)
   * @param {string} filePath  예: "images/characters/char_0001_common.png"
   * @returns {Promise<HTMLImageElement|null>}
   */
  async loadImage(filePath) {
    if (this.imageCache.has(filePath)) {
      return this.imageCache.get(filePath);
    }
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(filePath, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[CharacterVisual] 이미지 로드 실패: ${filePath}`);
        resolve(null);
      };
      img.src = filePath;
    });
  }

  // ─────────────────────────────────────────────
  // Canvas 렌더링
  // ─────────────────────────────────────────────

  /**
   * 캐릭터를 Canvas에 그리기
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} type         'spirit' | 'hero' | 'enemy'
   * @param {object} options      { element, rarity, id, size, flipX }
   * @param {number} x            중앙 x
   * @param {number} y            중앙 y
   * @param {number} size         크기 (px)
   */
  async drawCharacter(ctx, type, options = {}, x, y, size = 80) {
    const { element = '빛', rarity = 'Common', id = null, flipX = false } = options;

    let entry = null;
    if (id !== null) {
      entry = this.findById(id);
    } else {
      entry = this.findByElementAndRarity(element, rarity);
    }

    if (!entry) return false;  // 이미지 없음 → 폴백 사용

    const img = await this.loadImage(entry.file);
    if (!img) return false;

    ctx.save();
    ctx.translate(x, y);
    if (flipX) ctx.scale(-1, 1);

    // 이미지 중앙 정렬로 그리기
    const half = size / 2;
    ctx.drawImage(img, -half, -half, size, size);

    ctx.restore();
    return true;
  }

  /**
   * 동기 버전 (이미 캐시된 이미지만 사용)
   * @returns {boolean} 성공 여부
   */
  drawCharacterSync(ctx, entry, x, y, size = 80, options = {}) {
    if (!entry) return false;
    const { flipX = false, alpha = 1, scale = 1 } = options;

    const img = this.imageCache.get(entry.file);
    if (!img) return false;

    const actualSize = size * scale;
    const half = actualSize / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -half, -half, actualSize, actualSize);
    ctx.restore();
    return true;
  }

  // ─────────────────────────────────────────────
  // 프리로드 (씬 시작 전 사용)
  // ─────────────────────────────────────────────

  /**
   * 특정 조건의 이미지들을 미리 로드
   * @param {string} element   속성 필터 (null이면 전체)
   * @param {number} maxCount  최대 로드 개수
   */
  async preload(element = null, maxCount = 20) {
    if (!this.ready) return;
    let targets = element
      ? (this.catalogByElement[element] || [])
      : this.catalog.characters;

    targets = targets.slice(0, maxCount);
    await Promise.all(targets.map(entry => this.loadImage(entry.file)));
    console.log(`[CharacterVisual] 프리로드 완료: ${targets.length}개`);
  }

  // ─────────────────────────────────────────────
  // 유틸
  // ─────────────────────────────────────────────

  /** 전체 캐릭터 수 */
  get totalCount() {
    return this.catalog?.total || 0;
  }

  /** 속성별 캐릭터 목록 */
  getByElement(element) {
    return this.catalogByElement[element] || [];
  }

  /** 등급별 캐릭터 목록 */
  getByRarity(rarity) {
    return this.catalogByRarity[rarity] || [];
  }

  /** 캐시 비우기 (메모리 절약) */
  clearCache() {
    this.imageCache.clear();
  }
}

// 싱글턴 인스턴스 (전역에서 공유)
export const characterVisualSystem = new CharacterVisualSystem();
