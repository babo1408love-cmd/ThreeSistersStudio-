// ============================================================
// ⏱️ 몽글벨 웹엔진 - 타이머/스케줄러 (6/8)
// ============================================================
// 쿨다운, 지연 실행, 반복, 이벤트 스케줄, 게임 시계
//
// Claude Code: js/core/timer-system.js 에 넣으세요
// ============================================================

const TimerSystem = {

  _timers: [],
  _cooldowns: {},
  _schedule: [],
  _gameTime: 0,
  _timeScale: 1,
  _paused: false,
  _nextId: 1,

  // ========== 매 프레임 업데이트 ==========
  update(dt) {
    if (this._paused) return;
    const scaledDt = dt * this._timeScale;
    this._gameTime += scaledDt * 1000;

    // 타이머 업데이트
    for (let i = this._timers.length - 1; i >= 0; i--) {
      const t = this._timers[i];
      if (t.paused) continue;

      t.elapsed += scaledDt * 1000;

      // 진행 콜백
      if (t.onProgress) {
        t.onProgress(Math.min(1, t.elapsed / t.duration), t);
      }

      if (t.elapsed >= t.duration) {
        t.callback(t);

        if (t.repeat > 0 || t.repeat === -1) {
          t.elapsed = 0;
          t.count++;
          if (t.repeat > 0) t.repeat--;
        } else {
          this._timers.splice(i, 1);
        }
      }
    }

    // 쿨다운 감소
    Object.keys(this._cooldowns).forEach(key => {
      this._cooldowns[key] -= scaledDt * 1000;
      if (this._cooldowns[key] <= 0) delete this._cooldowns[key];
    });

    // 스케줄 체크
    for (let i = this._schedule.length - 1; i >= 0; i--) {
      const ev = this._schedule[i];
      if (this._gameTime >= ev.triggerAt) {
        ev.callback(ev);
        this._schedule.splice(i, 1);
      }
    }
  },

  // ========== 타이머 생성 ==========
  // 한 번 실행
  after(durationMs, callback) {
    const id = this._nextId++;
    this._timers.push({
      id, duration: durationMs, elapsed: 0, callback,
      repeat: 0, count: 0, paused: false, onProgress: null
    });
    return id;
  },

  // 반복 실행
  every(intervalMs, callback, repeatCount) {
    const id = this._nextId++;
    this._timers.push({
      id, duration: intervalMs, elapsed: 0, callback,
      repeat: repeatCount || -1, count: 0, paused: false, onProgress: null
    });
    return id;
  },

  // 진행 바 타이머 (onProgress: 0~1)
  progress(durationMs, onProgress, onComplete) {
    const id = this._nextId++;
    this._timers.push({
      id, duration: durationMs, elapsed: 0,
      callback: onComplete || (() => {}),
      repeat: 0, count: 0, paused: false, onProgress
    });
    return id;
  },

  // 프레임 지연 (다음 프레임에 실행)
  nextFrame(callback) {
    return this.after(0, callback);
  },

  // ========== 쿨다운 ==========
  setCooldown(key, durationMs) {
    this._cooldowns[key] = durationMs;
  },

  isOnCooldown(key) {
    return (this._cooldowns[key] || 0) > 0;
  },

  getCooldownRemaining(key) {
    return Math.max(0, this._cooldowns[key] || 0);
  },

  getCooldownProgress(key, totalMs) {
    const remaining = this._cooldowns[key] || 0;
    return 1 - (remaining / totalMs);
  },

  // ========== 스케줄 ==========
  scheduleAt(gameTimeMs, callback, data) {
    const id = this._nextId++;
    this._schedule.push({
      id, triggerAt: gameTimeMs, callback, data
    });
    return id;
  },

  scheduleIn(delayMs, callback) {
    return this.scheduleAt(this._gameTime + delayMs, callback);
  },

  // ========== 타이머 제어 ==========
  cancel(timerId) {
    this._timers = this._timers.filter(t => t.id !== timerId);
    this._schedule = this._schedule.filter(s => s.id !== timerId);
  },

  cancelAll() {
    this._timers = [];
    this._schedule = [];
    this._cooldowns = {};
  },

  pauseTimer(timerId) {
    const t = this._timers.find(t => t.id === timerId);
    if (t) t.paused = true;
  },

  resumeTimer(timerId) {
    const t = this._timers.find(t => t.id === timerId);
    if (t) t.paused = false;
  },

  // ========== 전역 시간 ==========
  pause() { this._paused = true; },
  resume() { this._paused = false; },
  setTimeScale(scale) { this._timeScale = Math.max(0, scale); },
  getTimeScale() { return this._timeScale; },
  getGameTime() { return this._gameTime; },
  isPaused() { return this._paused; },

  // 포맷
  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  },

  formatTimeDetailed(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return `${h}:${(m % 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  },

  connectToEngine() { console.log('[TimerSystem] 타이머 시스템 준비 완료 ✅'); }
};

if (typeof window !== 'undefined') window.TimerSystem = TimerSystem;
if (typeof module !== 'undefined') module.exports = TimerSystem;
