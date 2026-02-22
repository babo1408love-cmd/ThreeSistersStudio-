// ============================================================
// 💾 몽글벨 웹엔진 - 세이브/로드 시스템 (2/8)
// ============================================================
// 자동저장 + 수동저장 3슬롯 + 데이터 압축 + 무결성 검증
//
// Claude Code: js/core/save-system.js 에 넣으세요
// ============================================================

const SaveSystem = {

  SAVE_KEY: 'monglebel_save',
  MAX_SLOTS: 3,
  AUTO_SAVE_INTERVAL: 60000, // 1분마다 자동저장
  _autoSaveTimer: null,
  _dirty: false,

  // ========== 초기화 ==========
  init() {
    this._startAutoSave();
    console.log('[SaveSystem] 초기화 ✅');
  },

  // ========== 저장 ==========
  save(slot, gameData) {
    if (slot < 0 || slot >= this.MAX_SLOTS) slot = 0;

    const saveData = {
      version: '2.0',
      slot,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('ko-KR'),
      playtime: gameData.playtime || 0,

      // 핵심 데이터
      player: {
        name: gameData.playerName || '몽글벨',
        level: gameData.level || 1,
        exp: gameData.exp || 0,
        gold: gameData.gold || 0,
        diamond: gameData.diamond || 0,
        fragments: gameData.fragments || 0
      },

      // 파티
      heroes: gameData.heroes || [],
      pet: gameData.pet || null,
      spirits: gameData.spirits || [],
      inventory: gameData.inventory || [],

      // 진행도
      progress: {
        currentStage: gameData.currentStage || 1,
        maxStage: gameData.maxStage || 1,
        stagesCleared: gameData.stagesCleared || {},
        achievements: gameData.achievements || [],
        quests: gameData.quests || {}
      },

      // 설정
      settings: gameData.settings || {
        bgmVolume: 0.7,
        sfxVolume: 0.8,
        language: 'ko',
        quality: 'high'
      },

      // 가챠 피티
      pityData: gameData.pityData || {},

      // 체크섬 (무결성 검증)
      _checksum: ''
    };

    // 체크섬 생성
    saveData._checksum = this._generateChecksum(saveData);

    try {
      const compressed = this._compress(JSON.stringify(saveData));
      localStorage.setItem(`${this.SAVE_KEY}_${slot}`, compressed);
      this._dirty = false;
      console.log(`[SaveSystem] 슬롯 ${slot} 저장 완료 (${(compressed.length / 1024).toFixed(1)}KB)`);
      return { success: true, slot, size: compressed.length };
    } catch (e) {
      console.error('[SaveSystem] 저장 실패:', e);
      return { success: false, error: e.message };
    }
  },

  // ========== 로드 ==========
  load(slot) {
    try {
      const raw = localStorage.getItem(`${this.SAVE_KEY}_${slot}`);
      if (!raw) return { success: false, error: '세이브 없음' };

      const json = this._decompress(raw);
      const data = JSON.parse(json);

      // 체크섬 검증
      const savedChecksum = data._checksum;
      data._checksum = '';
      const currentChecksum = this._generateChecksum(data);
      data._checksum = savedChecksum;

      if (savedChecksum !== currentChecksum) {
        console.warn('[SaveSystem] 체크섬 불일치! 데이터 변조 가능성');
      }

      console.log(`[SaveSystem] 슬롯 ${slot} 로드 완료 (${data.dateStr})`);
      return { success: true, data };
    } catch (e) {
      console.error('[SaveSystem] 로드 실패:', e);
      return { success: false, error: e.message };
    }
  },

  // ========== 자동 저장 ==========
  autoSave(gameData) {
    return this.save(0, { ...gameData, _isAutoSave: true });
  },

  _startAutoSave() {
    if (this._autoSaveTimer) clearInterval(this._autoSaveTimer);
    this._autoSaveTimer = setInterval(() => {
      if (this._dirty && this._currentGameData) {
        this.autoSave(this._currentGameData);
      }
    }, this.AUTO_SAVE_INTERVAL);
  },

  markDirty(gameData) {
    this._dirty = true;
    this._currentGameData = gameData;
  },

  // ========== 슬롯 정보 ==========
  getSlotInfo(slot) {
    try {
      const raw = localStorage.getItem(`${this.SAVE_KEY}_${slot}`);
      if (!raw) return { empty: true, slot };

      const data = JSON.parse(this._decompress(raw));
      return {
        empty: false,
        slot,
        playerName: data.player?.name || '???',
        level: data.player?.level || 1,
        stage: data.progress?.currentStage || 1,
        playtime: data.playtime || 0,
        playtimeStr: this._formatTime(data.playtime || 0),
        dateStr: data.dateStr || '알 수 없음',
        heroCount: data.heroes?.length || 0
      };
    } catch (e) {
      return { empty: true, slot, error: true };
    }
  },

  getAllSlotInfo() {
    const slots = [];
    for (let i = 0; i < this.MAX_SLOTS; i++) {
      slots.push(this.getSlotInfo(i));
    }
    return slots;
  },

  // ========== 삭제 ==========
  deleteSlot(slot) {
    localStorage.removeItem(`${this.SAVE_KEY}_${slot}`);
    console.log(`[SaveSystem] 슬롯 ${slot} 삭제`);
  },

  deleteAll() {
    for (let i = 0; i < this.MAX_SLOTS; i++) {
      localStorage.removeItem(`${this.SAVE_KEY}_${i}`);
    }
  },

  // ========== 내보내기/가져오기 (백업) ==========
  exportSave(slot) {
    const raw = localStorage.getItem(`${this.SAVE_KEY}_${slot}`);
    if (!raw) return null;
    return btoa(raw); // Base64
  },

  importSave(slot, base64Data) {
    try {
      const raw = atob(base64Data);
      JSON.parse(this._decompress(raw)); // 유효성 검사
      localStorage.setItem(`${this.SAVE_KEY}_${slot}`, raw);
      return { success: true };
    } catch (e) {
      return { success: false, error: '잘못된 세이브 데이터' };
    }
  },

  // ========== 유틸 ==========
  _compress(str) {
    // 간단한 RLE 압축
    return str.replace(/(.)\1{3,}/g, (match, char) => `${char}§${match.length}§`);
  },

  _decompress(str) {
    return str.replace(/(.)§(\d+)§/g, (_, char, count) => char.repeat(parseInt(count)));
  },

  _generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  _formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    return `${hr}시간 ${min % 60}분`;
  },

  connectToEngine() { console.log('[SaveSystem] 세이브 시스템 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.SaveSystem = SaveSystem;
if (typeof module !== 'undefined') module.exports = SaveSystem;
