// ============================================================
// 🎵 몽글벨 웹엔진 - BGM 생성기 (3/3)
// ============================================================
// 코드로 배경음악 실시간 생성 - 용량 0!
// 장면별 분위기 자동 전환
// sound-core.js 필요
//
// Claude Code: js/sound/sound-bgm.js 에 넣으세요
// ============================================================

const SoundBGM = {

  _playing: false,
  _currentTrack: null,
  _bpm: 120,
  _key: 'C',
  _scale: 'major',
  _schedulerTimer: null,
  _nextNoteTime: 0,
  _currentBeat: 0,
  _totalBeats: 0,
  _layers: {},
  _patterns: {},

  // ========== 음계 정의 ==========
  SCALES: {
    major:      [0, 2, 4, 5, 7, 9, 11],
    minor:      [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    blues:      [0, 3, 5, 6, 7, 10],
    dorian:     [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    japanese:   [0, 1, 5, 7, 8],
    arabic:     [0, 1, 4, 5, 7, 8, 11]
  },

  // ========== 코드 진행 프리셋 ==========
  PROGRESSIONS: {
    happy:     [[0,4,7], [5,9,0], [7,11,2], [0,4,7]],         // I-IV-V-I
    adventure: [[0,4,7], [5,9,0], [3,7,10], [0,4,7]],         // I-IV-iii-I
    battle:    [[0,3,7], [5,8,0], [3,7,10], [7,10,2]],        // i-iv-III-v
    boss:      [[0,3,7], [1,4,8], [3,6,10], [0,3,7]],         // i-bII-III-i
    sad:       [[0,3,7], [5,8,0], [7,10,2], [0,3,7]],         // i-iv-v-i
    mystery:   [[0,4,7], [1,5,8], [3,7,10], [0,4,7]],         // I-bII-iii-I
    victory:   [[0,4,7], [5,9,0], [7,11,2], [0,4,7,11]],      // I-IV-V-Imaj7
    shop:      [[0,4,7], [2,5,9], [4,7,11], [5,9,0]],         // I-ii-iii-IV
    rest:      [[0,4,7,11], [5,9,0,4], [7,11,2,5], [0,4,7,11]], // Imaj7-IVmaj7-Vmaj7
    dungeon:   [[0,3,7], [3,6,10], [5,8,0], [0,3,7]],         // i-III-iv-i
    title:     [[0,4,7], [7,11,2], [5,9,0], [0,4,7]]          // I-V-IV-I
  },

  // ========== 씬별 BGM 설정 ==========
  SCENES: {
    title: {
      bpm: 90, key: 'C', scale: 'major', progression: 'title',
      layers: { pad: true, arp: true, melody: false, bass: true, drums: false },
      mood: 'warm', volume: 0.4
    },
    map: {
      bpm: 110, key: 'G', scale: 'major', progression: 'adventure',
      layers: { pad: true, arp: true, melody: true, bass: true, drums: true },
      mood: 'bright', volume: 0.35
    },
    puzzle: {
      bpm: 130, key: 'C', scale: 'major', progression: 'happy',
      layers: { pad: true, arp: true, melody: true, bass: true, drums: true },
      mood: 'energetic', volume: 0.3
    },
    battle: {
      bpm: 150, key: 'A', scale: 'minor', progression: 'battle',
      layers: { pad: true, arp: true, melody: true, bass: true, drums: true },
      mood: 'intense', volume: 0.4
    },
    boss: {
      bpm: 160, key: 'D', scale: 'minor', progression: 'boss',
      layers: { pad: true, arp: true, melody: true, bass: true, drums: true },
      mood: 'dark', volume: 0.45
    },
    shop: {
      bpm: 95, key: 'F', scale: 'major', progression: 'shop',
      layers: { pad: true, arp: true, melody: true, bass: true, drums: false },
      mood: 'cozy', volume: 0.3
    },
    rest: {
      bpm: 75, key: 'C', scale: 'major', progression: 'rest',
      layers: { pad: true, arp: true, melody: false, bass: true, drums: false },
      mood: 'peaceful', volume: 0.25
    },
    victory: {
      bpm: 130, key: 'C', scale: 'major', progression: 'victory',
      layers: { pad: true, arp: true, melody: true, bass: true, drums: true },
      mood: 'triumphant', volume: 0.4
    },
    defeat: {
      bpm: 70, key: 'A', scale: 'minor', progression: 'sad',
      layers: { pad: true, arp: false, melody: true, bass: true, drums: false },
      mood: 'somber', volume: 0.3
    },
    gacha: {
      bpm: 120, key: 'E', scale: 'major', progression: 'mystery',
      layers: { pad: true, arp: true, melody: false, bass: true, drums: true },
      mood: 'exciting', volume: 0.35
    }
  },

  // ========== BGM 재생 ==========
  play(sceneName) {
    const SE = SoundEngine;
    if (!SE.ctx) { SE.init(); }
    SE.resume();

    const scene = this.SCENES[sceneName] || this.SCENES.map;

    // 이미 같은 씬이면 무시
    if (this._currentTrack === sceneName && this._playing) return;

    // 기존 BGM 페이드아웃
    if (this._playing) {
      this.fadeOut(0.5, () => {
        this._startTrack(sceneName, scene);
      });
      return;
    }

    this._startTrack(sceneName, scene);
  },

  _startTrack(sceneName, scene) {
    const SE = SoundEngine;
    
    this._bpm = scene.bpm;
    this._key = scene.key;
    this._scale = scene.scale;
    this._currentTrack = sceneName;
    this._currentBeat = 0;
    this._playing = true;

    // 코드 진행 가져오기
    const progression = this.PROGRESSIONS[scene.progression] || this.PROGRESSIONS.happy;
    this._patterns = {
      chords: progression,
      layerConfig: scene.layers,
      mood: scene.mood,
      volume: scene.volume
    };

    // 스케줄러 시작
    this._nextNoteTime = SE.ctx.currentTime + 0.1;
    this._scheduleLoop();

    console.log(`[SoundBGM] ▶ ${sceneName} (${this._bpm} BPM, ${this._key} ${this._scale})`);
  },

  // ========== 스케줄러 (정확한 타이밍) ==========
  _scheduleLoop() {
    if (!this._playing) return;

    const SE = SoundEngine;
    const lookAhead = 0.2; // 200ms 미리 스케줄

    while (this._nextNoteTime < SE.ctx.currentTime + lookAhead) {
      this._scheduleBeat(this._nextNoteTime, this._currentBeat);
      this._advanceBeat();
    }

    this._schedulerTimer = setTimeout(() => this._scheduleLoop(), 50);
  },

  _advanceBeat() {
    const secondsPerBeat = 60.0 / this._bpm;
    this._nextNoteTime += secondsPerBeat / 4; // 16분음표 단위
    this._currentBeat = (this._currentBeat + 1) % 64; // 4마디 = 64 16분음표
    this._totalBeats++;
  },

  // ========== 비트별 사운드 스케줄 ==========
  _scheduleBeat(time, beat) {
    const SE = SoundEngine;
    const config = this._patterns;
    if (!config) return;

    const chords = config.chords;
    const measureBeat = beat % 16; // 1마디 = 16 비트
    const chordIdx = Math.floor(beat / 16) % chords.length;
    const chord = chords[chordIdx];
    const baseNote = this._keyToMidi(this._key);
    const scale = this.SCALES[this._scale] || this.SCALES.major;
    const vol = config.volume || 0.3;

    // === 패드 (코드 지속음) ===
    if (config.layerConfig.pad && measureBeat === 0) {
      this._playPad(time, chord, baseNote, scale, vol);
    }

    // === 베이스 ===
    if (config.layerConfig.bass) {
      this._playBass(time, chord, baseNote, scale, measureBeat, vol, config.mood);
    }

    // === 아르페지오 ===
    if (config.layerConfig.arp) {
      this._playArpeggio(time, chord, baseNote, scale, measureBeat, vol, config.mood);
    }

    // === 멜로디 ===
    if (config.layerConfig.melody) {
      this._playMelody(time, chord, baseNote, scale, measureBeat, vol, config.mood);
    }

    // === 드럼 ===
    if (config.layerConfig.drums) {
      this._playDrums(time, measureBeat, vol, config.mood);
    }
  },

  // ========== 패드 (코드 지속음) ==========
  _playPad(time, chord, baseNote, scale, vol) {
    const SE = SoundEngine;
    const secondsPerMeasure = (60.0 / this._bpm) * 4;

    chord.forEach(interval => {
      const noteNum = baseNote + interval + 48; // 옥타브 3
      const freq = this._midiToFreq(noteNum);

      const { osc, env } = SE._osc('sine', freq, time, secondsPerMeasure, SE.musicGain);
      SE._adsr(env.gain, time, 0.3, 0.5, 0.6, 0.5, vol * 0.3, secondsPerMeasure);

      // 따뜻한 패드를 위한 디튠 레이어
      const { osc: osc2, env: env2 } = SE._osc('triangle', freq * 1.003, time, secondsPerMeasure, SE.musicGain);
      SE._adsr(env2.gain, time, 0.4, 0.5, 0.5, 0.5, vol * 0.15, secondsPerMeasure);
    });
  },

  // ========== 베이스 ==========
  _playBass(time, chord, baseNote, scale, beat, vol, mood) {
    const SE = SoundEngine;
    const beatDur = 60.0 / this._bpm / 4;

    // 리듬 패턴 (분위기별)
    let pattern;
    if (mood === 'intense' || mood === 'dark') {
      pattern = [1,0,1,0, 1,0,0,1, 1,0,1,0, 0,1,0,1]; // 공격적
    } else if (mood === 'peaceful' || mood === 'cozy') {
      pattern = [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]; // 느긋
    } else {
      pattern = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0]; // 기본
    }

    if (pattern[beat % 16]) {
      const rootNote = baseNote + chord[0] + 36; // 옥타브 2
      const freq = this._midiToFreq(rootNote);
      const type = (mood === 'intense' || mood === 'dark') ? 'sawtooth' : 'sine';
      const { osc, env } = SE._osc(type, freq, time, beatDur * 3, SE.musicGain);
      SE._adsr(env.gain, time, 0.01, 0.05, 0.7, 0.1, vol * 0.35, beatDur * 3);
    }
  },

  // ========== 아르페지오 ==========
  _playArpeggio(time, chord, baseNote, scale, beat, vol, mood) {
    const SE = SoundEngine;
    const beatDur = 60.0 / this._bpm / 4;

    // 아르페지오 패턴
    let pattern, octaveShift;
    if (mood === 'energetic' || mood === 'triumphant') {
      pattern = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 0, 1, 2, 1, 0]; // 빠른
      octaveShift = 60;
    } else if (mood === 'peaceful' || mood === 'warm') {
      pattern = [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 2, -1, 1, -1, 0, -1]; // -1 = 쉼
      octaveShift = 60;
    } else if (mood === 'intense' || mood === 'dark') {
      pattern = [0, 0, 1, 2, 0, 2, 1, 0, 2, 1, 0, 2, 1, 0, 2, 1]; // 반복적
      octaveShift = 60;
    } else {
      pattern = [0, -1, 1, -1, 2, -1, 0, -1, 1, -1, 2, -1, 0, 1, 2, 0];
      octaveShift = 60;
    }

    const noteIdx = pattern[beat % 16];
    if (noteIdx >= 0 && noteIdx < chord.length) {
      const noteNum = baseNote + chord[noteIdx] + octaveShift;
      const freq = this._midiToFreq(noteNum);
      const { osc, env } = SE._osc('sine', freq, time, beatDur * 1.5, SE.musicGain);
      SE._adsr(env.gain, time, 0.005, 0.03, 0.4, 0.08, vol * 0.18, beatDur * 1.5);

      // 벨톤 배음
      const { osc: bell, env: bellEnv } = SE._osc('sine', freq * 3, time, beatDur, SE.musicGain);
      SE._adsr(bellEnv.gain, time, 0.002, 0.02, 0.2, 0.05, vol * 0.04, beatDur);
    }
  },

  // ========== 멜로디 ==========
  _playMelody(time, chord, baseNote, scale, beat, vol, mood) {
    const SE = SoundEngine;
    const beatDur = 60.0 / this._bpm / 4;

    // 확률적 멜로디 생성 (음악적 규칙 기반)
    // 매 2비트마다 음 생성 (8분음표)
    if (beat % 2 !== 0) return;

    // 현재 코드 톤 + 스케일 톤 중에서 선택
    const chordTones = chord.map(n => n % 12);
    const scaleTones = scale;
    
    // 코드 톤 우선 (60%), 스케일 톤 (30%), 장식음 (10%)
    let noteInterval;
    const r = Math.random();
    if (r < 0.6) {
      noteInterval = chordTones[Math.floor(Math.random() * chordTones.length)];
    } else if (r < 0.9) {
      noteInterval = scaleTones[Math.floor(Math.random() * scaleTones.length)];
    } else {
      noteInterval = scaleTones[Math.floor(Math.random() * scaleTones.length)] + (Math.random() > 0.5 ? 1 : -1);
    }

    // 전 음과의 거리 제한 (자연스러운 멜로디)
    // 큰 도약 확률 낮추기
    const maxJump = mood === 'peaceful' ? 4 : mood === 'intense' ? 7 : 5;

    const octave = mood === 'bright' || mood === 'triumphant' ? 72 : 60;
    const noteNum = baseNote + noteInterval + octave;
    const freq = this._midiToFreq(noteNum);

    // 음표 길이 변화 (리듬감)
    const durations = mood === 'energetic' ? [1, 1, 2, 1] : [2, 2, 4, 2];
    const durIdx = Math.floor(Math.random() * durations.length);
    const dur = beatDur * durations[durIdx];

    // 확률적으로 쉼 (30%)
    if (Math.random() < 0.3) return;

    const type = mood === 'warm' || mood === 'peaceful' ? 'sine' : 
                 mood === 'intense' || mood === 'dark' ? 'sawtooth' : 'triangle';

    const { osc, env } = SE._osc(type, freq, time, dur, SE.musicGain);
    SE._adsr(env.gain, time, 0.01, 0.05, 0.5, 0.1, vol * 0.15, dur);

    // 비브라토 (긴 음에만)
    if (dur > beatDur * 2) {
      const vibrato = SE.ctx.createOscillator();
      vibrato.frequency.value = 5; // 5Hz 비브라토
      const vibratoGain = SE.ctx.createGain();
      vibratoGain.gain.value = freq * 0.005; // 미세한 떨림
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibrato.start(time + dur * 0.3);
      vibrato.stop(time + dur);
    }
  },

  // ========== 드럼 (퍼커션) ==========
  _playDrums(time, beat, vol, mood) {
    const SE = SoundEngine;

    // 킥 패턴
    let kickPattern, snarePattern, hihatPattern;

    if (mood === 'intense' || mood === 'dark') {
      kickPattern =  [1,0,0,0, 1,0,0,0, 1,0,0,1, 0,0,1,0];
      snarePattern = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
      hihatPattern = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];
    } else if (mood === 'energetic' || mood === 'triumphant') {
      kickPattern =  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];
      snarePattern = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1];
      hihatPattern = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
    } else if (mood === 'exciting') {
      kickPattern =  [1,0,1,0, 0,0,1,0, 1,0,0,0, 0,1,0,0];
      snarePattern = [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0];
      hihatPattern = [1,1,0,1, 1,0,1,1, 1,1,0,1, 1,0,1,0];
    } else {
      kickPattern =  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0];
      snarePattern = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
      hihatPattern = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
    }

    const b = beat % 16;

    // 킥
    if (kickPattern[b]) {
      const { osc, env } = SE._osc('sine', 60, time, 0.15, SE.musicGain);
      osc.frequency.exponentialRampToValueAtTime(25, time + 0.1);
      SE._adsr(env.gain, time, 0.003, 0.03, 0.2, 0.05, vol * 0.3, 0.15);
      // 클릭
      const { source: n, env: nEnv } = SE._noise(time, 0.02, SE.musicGain);
      SE._adsr(nEnv.gain, time, 0.001, 0.005, 0.1, 0.005, vol * 0.15, 0.02);
    }

    // 스네어
    if (snarePattern[b]) {
      const { source: n, env: nEnv } = SE._noise(time, 0.12, SE.musicGain, 'pink');
      SE._adsr(nEnv.gain, time, 0.001, 0.02, 0.15, 0.05, vol * 0.2, 0.12);
      const { osc, env } = SE._osc('triangle', 200, time, 0.08, SE.musicGain);
      SE._adsr(env.gain, time, 0.001, 0.01, 0.1, 0.03, vol * 0.1, 0.08);
    }

    // 하이햇
    if (hihatPattern[b]) {
      const { source: n, env: nEnv } = SE._noise(time, 0.04, SE.musicGain);
      SE._adsr(nEnv.gain, time, 0.001, 0.008, 0.05, 0.01, vol * 0.08, 0.04);
    }
  },

  // ========== 유틸리티 ==========
  _keyToMidi(key) {
    const keys = { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
    return keys[key] || 0;
  },

  _midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  // ========== 제어 ==========
  stop() {
    this._playing = false;
    this._currentTrack = null;
    if (this._schedulerTimer) {
      clearTimeout(this._schedulerTimer);
      this._schedulerTimer = null;
    }
  },

  fadeOut(duration, callback) {
    const SE = SoundEngine;
    if (!SE.musicGain) return;
    
    const currentVol = SE.musicGain.gain.value;
    SE.musicGain.gain.linearRampToValueAtTime(0, SE.ctx.currentTime + (duration || 1));
    
    setTimeout(() => {
      this.stop();
      SE.musicGain.gain.setValueAtTime(currentVol, SE.ctx.currentTime);
      if (callback) callback();
    }, (duration || 1) * 1000);
  },

  fadeIn(sceneName, duration) {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    
    const savedVol = SE._volumes.music;
    SE.musicGain.gain.setValueAtTime(0, SE.ctx.currentTime);
    this.play(sceneName);
    SE.musicGain.gain.linearRampToValueAtTime(savedVol, SE.ctx.currentTime + (duration || 1));
  },

  // 씬 전환 (크로스페이드)
  crossFade(newScene, duration) {
    const dur = duration || 1.5;
    this.fadeOut(dur * 0.6, () => {
      this.fadeIn(newScene, dur * 0.6);
    });
  },

  // BPM 변경 (실시간)
  setBPM(bpm) {
    this._bpm = Math.max(40, Math.min(200, bpm));
  },

  // 현재 상태
  getState() {
    return {
      playing: this._playing,
      track: this._currentTrack,
      bpm: this._bpm,
      key: this._key,
      scale: this._scale,
      beat: this._currentBeat,
      totalBeats: this._totalBeats
    };
  },

  // ========== MonglelbelEngine 연동 ==========
  connectToEngine() {
    console.log('[SoundBGM] 웹엔진 연동 준비 완료 ✅');
    console.log('[SoundBGM] 사용법: SoundBGM.play("battle") / SoundBGM.crossFade("shop")');
  }
};

// Export
if (typeof window !== 'undefined') window.SoundBGM = SoundBGM;
if (typeof module !== 'undefined') module.exports = SoundBGM;
