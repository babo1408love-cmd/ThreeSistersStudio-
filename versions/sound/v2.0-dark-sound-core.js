// ============================================================
// 🔊 몽글벨 웹엔진 - 사운드 엔진 코어 (1/3)
// ============================================================
// Web Audio API 기반 - 용량 0! 코드로 모든 소리 합성
// 
// Claude Code: js/sound/sound-core.js 에 넣으세요
// ============================================================

const SoundEngine = {

  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  uiGain: null,
  compressor: null,
  reverb: null,
  _initialized: false,
  _muted: false,
  _volumes: { master: 0.7, music: 0.5, sfx: 0.8, ui: 0.6 },

  // ========== 초기화 ==========
  init() {
    if (this._initialized) return true;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error('[SoundEngine] Web Audio API 미지원!');
      return false;
    }

    // === 마스터 체인 ===
    // 소스 → 카테고리 게인 → 컴프레서 → 리버브(습) + 드라이 → 마스터 게인 → 출력

    // 마스터 게인
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._volumes.master;
    this.masterGain.connect(this.ctx.destination);

    // 컴프레서 (음량 균일화)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.masterGain);

    // 리버브 (공간감)
    this._createReverb().then(reverb => {
      this.reverb = reverb;
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.value = 0.15;
      this.reverb.connect(reverbGain);
      reverbGain.connect(this.compressor);
      this._reverbSend = this.ctx.createGain();
      this._reverbSend.gain.value = 1.0;
      this._reverbSend.connect(this.reverb);
    });

    // 카테고리별 게인 노드
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this._volumes.music;
    this.musicGain.connect(this.compressor);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this._volumes.sfx;
    this.sfxGain.connect(this.compressor);

    this.uiGain = this.ctx.createGain();
    this.uiGain.gain.value = this._volumes.ui;
    this.uiGain.connect(this.compressor);

    this._initialized = true;
    console.log('[SoundEngine] 코어 초기화 완료 ✅');
    return true;
  },

  // 사용자 인터랙션 후 resume (브라우저 정책)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  // ========== 리버브 생성 (임펄스 응답 합성) ==========
  async _createReverb() {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 1.5; // 1.5초 리버브
    const impulse = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // 지수 감쇠 + 랜덤 노이즈 = 자연스러운 공간감
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }

    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  },

  // ========== 기본 사운드 프리미티브 ==========

  // 오실레이터 생성
  _osc(type, freq, startTime, duration, gainNode) {
    const osc = this.ctx.createOscillator();
    osc.type = type; // sine, square, sawtooth, triangle
    osc.frequency.value = freq;
    
    const env = this.ctx.createGain();
    env.gain.value = 0;
    
    osc.connect(env);
    env.connect(gainNode || this.sfxGain);
    
    // 리버브 센드
    if (this._reverbSend) {
      const send = this.ctx.createGain();
      send.gain.value = 0.2;
      osc.connect(send);
      send.connect(this._reverbSend);
    }

    osc.start(startTime);
    osc.stop(startTime + duration);

    return { osc, env };
  },

  // ADSR 엔벨로프 (Attack, Decay, Sustain, Release)
  _adsr(gainParam, startTime, a, d, s, r, peak, duration) {
    const t = startTime;
    gainParam.setValueAtTime(0, t);
    gainParam.linearRampToValueAtTime(peak || 1.0, t + a);           // Attack
    gainParam.linearRampToValueAtTime((s || 0.5) * (peak || 1.0), t + a + d);  // Decay → Sustain
    gainParam.setValueAtTime((s || 0.5) * (peak || 1.0), t + duration - r);     // Hold
    gainParam.linearRampToValueAtTime(0, t + duration);              // Release
  },

  // 노이즈 생성 (타격음, 바람 등에 사용)
  _noise(startTime, duration, gainNode, type) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
      // 핑크 노이즈 (부드러운)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      // 브라운 노이즈 (깊은 저음)
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * white) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    } else {
      // 화이트 노이즈
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const env = this.ctx.createGain();
    env.gain.value = 0;
    source.connect(env);
    env.connect(gainNode || this.sfxGain);

    source.start(startTime);
    source.stop(startTime + duration);

    return { source, env };
  },

  // 필터 생성
  _filter(type, freq, q, gainNode) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type; // lowpass, highpass, bandpass, notch
    filter.frequency.value = freq;
    filter.Q.value = q || 1;
    if (gainNode) filter.connect(gainNode);
    return filter;
  },

  // 음계 (주파수 변환)
  _noteToFreq(note, octave) {
    const notes = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const semitone = notes[note.charAt(0).toUpperCase()] + (note.includes('#') ? 1 : note.includes('b') ? -1 : 0);
    return 440 * Math.pow(2, (semitone - 9) / 12 + (octave - 4));
  },

  // 코드 (화음) 재생
  _chord(notes, startTime, duration, type, gainNode, volume) {
    notes.forEach(noteStr => {
      const note = noteStr.slice(0, -1);
      const octave = parseInt(noteStr.slice(-1));
      const freq = this._noteToFreq(note, octave);
      const { osc, env } = this._osc(type || 'sine', freq, startTime, duration, gainNode);
      this._adsr(env.gain, startTime, 0.02, 0.1, 0.6, 0.15, volume || 0.15, duration);
    });
  },

  // ========== 볼륨 컨트롤 ==========
  setMasterVolume(v) {
    this._volumes.master = Math.max(0, Math.min(1, v));
    if (this.masterGain) this.masterGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.05);
  },
  setMusicVolume(v) {
    this._volumes.music = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.05);
  },
  setSfxVolume(v) {
    this._volumes.sfx = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.05);
  },
  setUIVolume(v) {
    this._volumes.ui = Math.max(0, Math.min(1, v));
    if (this.uiGain) this.uiGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.05);
  },
  mute() {
    this._muted = true;
    if (this.masterGain) this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
  },
  unmute() {
    this._muted = false;
    if (this.masterGain) this.masterGain.gain.linearRampToValueAtTime(this._volumes.master, this.ctx.currentTime + 0.1);
  },
  toggleMute() { this._muted ? this.unmute() : this.mute(); }
};

// Export
if (typeof window !== 'undefined') window.SoundEngine = SoundEngine;
if (typeof module !== 'undefined') module.exports = SoundEngine;
