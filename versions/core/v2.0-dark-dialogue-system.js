// ============================================================
// 💬 몽글벨 웹엔진 - 대화 시스템 (7/8)
// ============================================================
// NPC 대화, 스토리, 선택지, 초상화, 타이핑 효과
//
// Claude Code: js/core/dialogue-system.js 에 넣으세요
// ============================================================

const DialogueSystem = {

  _active: false,
  _queue: [],
  _current: null,
  _charIndex: 0,
  _typingSpeed: 40,
  _typingTimer: null,
  _waitingForInput: false,
  _onComplete: null,
  _choices: [],
  _history: [],

  // ========== 초기화 ==========
  init() {
    // 입력 연결
    if (typeof InputManager !== 'undefined') {
      InputManager.on('keydown', e => {
        if (this._active && (e.key === 'Enter' || e.key === ' ')) {
          this.advance();
        }
      });
      InputManager.on('tap', () => {
        if (this._active) this.advance();
      });
    }
    console.log('[DialogueSystem] 초기화 ✅');
  },

  // ========== 대화 시작 ==========
  start(dialogueData, onComplete) {
    this._queue = Array.isArray(dialogueData) ? [...dialogueData] : [dialogueData];
    this._onComplete = onComplete || null;
    this._active = true;
    this._history = [];
    this._next();
  },

  // ========== 다음 대사 ==========
  _next() {
    if (this._queue.length === 0) {
      this.close();
      return;
    }

    this._current = this._queue.shift();
    this._charIndex = 0;
    this._waitingForInput = false;
    this._choices = this._current.choices || [];

    // 타이핑 시작
    this._startTyping();

    // 사운드
    if (typeof SoundSFX !== 'undefined') {
      SoundSFX.play('dialogue_open');
    }
  },

  // ========== 타이핑 효과 ==========
  _startTyping() {
    if (this._typingTimer) clearInterval(this._typingTimer);

    const text = this._current.text || '';
    const speed = this._current.speed || this._typingSpeed;

    this._typingTimer = setInterval(() => {
      this._charIndex++;
      if (this._charIndex >= text.length) {
        clearInterval(this._typingTimer);
        this._typingTimer = null;
        this._waitingForInput = true;
        // 선택지 없으면 자동 진행 대기
      }
    }, speed);
  },

  // ========== 진행 (터치/엔터) ==========
  advance() {
    if (!this._active || !this._current) return;

    const text = this._current.text || '';

    // 타이핑 중이면 스킵 (전체 표시)
    if (this._charIndex < text.length) {
      clearInterval(this._typingTimer);
      this._typingTimer = null;
      this._charIndex = text.length;
      this._waitingForInput = true;
      return;
    }

    // 선택지가 있으면 선택 대기
    if (this._choices.length > 0) return;

    // 기록
    this._history.push({
      speaker: this._current.speaker,
      text: this._current.text
    });

    // 다음 대사
    this._next();
  },

  // ========== 선택지 선택 ==========
  selectChoice(index) {
    if (!this._active || this._choices.length === 0) return;
    if (index < 0 || index >= this._choices.length) return;

    const choice = this._choices[index];

    this._history.push({
      speaker: '선택',
      text: choice.text
    });

    // 선택 결과 처리
    if (choice.next) {
      // 다음 대화 삽입
      const nextDialogues = Array.isArray(choice.next) ? choice.next : [choice.next];
      this._queue = [...nextDialogues, ...this._queue];
    }
    if (choice.callback) choice.callback(choice);
    if (choice.setFlag) {
      // 플래그 설정 (게임 상태)
      this._setFlag(choice.setFlag, choice.flagValue !== undefined ? choice.flagValue : true);
    }

    this._choices = [];
    this._next();
  },

  // ========== 닫기 ==========
  close() {
    this._active = false;
    this._current = null;
    this._choices = [];
    if (this._typingTimer) {
      clearInterval(this._typingTimer);
      this._typingTimer = null;
    }
    if (this._onComplete) this._onComplete(this._history);
  },

  // ========== UI 데이터 (렌더링용) ==========
  getUIData() {
    if (!this._active || !this._current) return null;

    const text = this._current.text || '';
    const visibleText = text.substring(0, this._charIndex);

    return {
      active: true,
      speaker: this._current.speaker || '',
      speakerColor: this._current.speakerColor || '#FFFFFF',
      text: visibleText,
      fullText: text,
      isTyping: this._charIndex < text.length,
      portrait: this._current.portrait || null,
      portraitSide: this._current.portraitSide || 'left',
      emotion: this._current.emotion || 'normal',
      choices: this._waitingForInput ? this._choices.map((c, i) => ({
        index: i, text: c.text
      })) : [],
      hasChoices: this._choices.length > 0,
      waitingForInput: this._waitingForInput && this._choices.length === 0,
      bgColor: this._current.bgColor || 'rgba(0,0,0,0.8)',
      textColor: this._current.textColor || '#FFFFFF'
    };
  },

  // ========== 플래그 ==========
  _flags: {},
  _setFlag(key, value) { this._flags[key] = value; },
  getFlag(key) { return this._flags[key]; },
  setFlag(key, value) { this._flags[key] = value; },

  // ========== 유틸 ==========
  isActive() { return this._active; },
  getHistory() { return [...this._history]; },

  // 빠른 대화 생성 헬퍼
  quick(speaker, text, portrait) {
    return { speaker, text, portrait };
  },

  quickChoice(speaker, text, choices) {
    return { speaker, text, choices };
  },

  connectToEngine() { console.log('[DialogueSystem] 대화 시스템 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.DialogueSystem = DialogueSystem;
if (typeof module !== 'undefined') module.exports = DialogueSystem;
