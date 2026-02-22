// ============================================================
// 🔊 몽글벨 웹엔진 - 효과음 라이브러리 (2/3)
// ============================================================
// 모든 게임 효과음을 코드로 합성 - 용량 0!
// sound-core.js 필요
//
// Claude Code: js/sound/sound-sfx.js 에 넣으세요
// ============================================================

const SoundSFX = {

  // ========== 🎲 주사위 효과음 ==========
  diceRoll() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;

    // 주사위가 굴러가는 소리 (짧은 클릭 연속)
    for (let i = 0; i < 8; i++) {
      const clickTime = t + i * 0.06 + Math.random() * 0.02;
      const freq = 800 + Math.random() * 600;
      const { osc, env } = SE._osc('sine', freq, clickTime, 0.03, SE.sfxGain);
      SE._adsr(env.gain, clickTime, 0.003, 0.01, 0.2, 0.01, 0.15, 0.03);

      // 딱딱한 질감
      const { source: n, env: nEnv } = SE._noise(clickTime, 0.02, SE.sfxGain);
      SE._adsr(nEnv.gain, clickTime, 0.001, 0.005, 0.1, 0.005, 0.08, 0.02);
    }

    // 착지음
    const landTime = t + 0.55;
    const { osc: land, env: landEnv } = SE._osc('sine', 200, landTime, 0.15, SE.sfxGain);
    SE._adsr(landEnv.gain, landTime, 0.005, 0.05, 0.3, 0.08, 0.2, 0.15);
    const { source: landN, env: landNEnv } = SE._noise(landTime, 0.08, SE.sfxGain);
    SE._adsr(landNEnv.gain, landTime, 0.002, 0.02, 0.1, 0.03, 0.12, 0.08);
  },

  diceDouble() {
    this.diceRoll();
    const SE = SoundEngine;
    const t = SE.ctx.currentTime + 0.6;
    // 더블! 특별한 차임
    SE._chord(['E5', 'G#5', 'B5'], t, 0.4, 'sine', SE.sfxGain, 0.2);
  },

  // ========== 🍬 캔디 매치 효과음 ==========
  candySwap() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 부드러운 슬라이드
    const { osc, env } = SE._osc('sine', 400, t, 0.12, SE.uiGain);
    osc.frequency.linearRampToValueAtTime(600, t + 0.12);
    SE._adsr(env.gain, t, 0.01, 0.03, 0.5, 0.05, 0.12, 0.12);
  },

  candyMatch(comboCount) {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    const combo = comboCount || 1;

    // 콤보 수에 따라 음 높아짐
    const baseNote = 60 + combo * 2; // MIDI note
    const freq = 440 * Math.pow(2, (baseNote - 69) / 12);

    // 맑은 매치음
    const { osc, env } = SE._osc('sine', freq, t, 0.25, SE.sfxGain);
    SE._adsr(env.gain, t, 0.01, 0.05, 0.4, 0.1, 0.18, 0.25);

    // 하모닉 (배음)
    const { osc: h, env: hEnv } = SE._osc('sine', freq * 2, t, 0.2, SE.sfxGain);
    SE._adsr(hEnv.gain, t, 0.01, 0.05, 0.3, 0.08, 0.08, 0.2);

    // 반짝이 효과
    const { osc: sparkle, env: sEnv } = SE._osc('sine', freq * 3, t + 0.05, 0.15, SE.sfxGain);
    SE._adsr(sEnv.gain, t + 0.05, 0.005, 0.03, 0.2, 0.05, 0.05, 0.15);
  },

  candyCombo(comboCount) {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    const combo = comboCount || 3;

    // ── Lv5 (12+콤보): 폭탄 폭발음으로 완전 교체 ──
    if (combo >= 12) {
      const intensity = Math.min((combo - 12) * 0.05 + 0.3, 0.6);
      // 저음 임팩트 (쿵)
      const { osc: boom, env: boomE } = SE._osc('sine', 40 + combo * 2, t, intensity, SE.sfxGain);
      boom.frequency.exponentialRampToValueAtTime(20, t + 0.4);
      SE._adsr(boomE.gain, t, 0.003, 0.06, 0.5, 0.15, 0.2, 0.4);
      // 노이즈 폭발 (콰광)
      const { source: n1, env: n1E } = SE._noise(t + 0.01, intensity * 0.8, SE.sfxGain);
      SE._adsr(n1E.gain, t + 0.01, 0.005, 0.08, 0.3, 0.15, 0.15, 0.35);
      // 중저음 잔향 (우르르)
      const { osc: rumble, env: rumE } = SE._osc('sawtooth', 55, t + 0.05, intensity * 0.3, SE.sfxGain);
      rumble.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      SE._adsr(rumE.gain, t + 0.05, 0.01, 0.1, 0.2, 0.2, 0.15, 0.5);
      // 콤보 높을수록 2차 폭발 추가 (14+)
      if (combo >= 14) {
        const { source: n2, env: n2E } = SE._noise(t + 0.15, intensity * 0.6, SE.sfxGain);
        SE._adsr(n2E.gain, t + 0.15, 0.005, 0.06, 0.25, 0.1, 0.12, 0.3);
        const { osc: b2, env: b2E } = SE._osc('sine', 50, t + 0.15, intensity * 0.5, SE.sfxGain);
        b2.frequency.exponentialRampToValueAtTime(25, t + 0.5);
        SE._adsr(b2E.gain, t + 0.15, 0.005, 0.08, 0.3, 0.15, 0.15, 0.35);
      }
      // 16+ 3차 폭발 연쇄
      if (combo >= 16) {
        const { source: n3, env: n3E } = SE._noise(t + 0.3, intensity * 0.5, SE.sfxGain);
        SE._adsr(n3E.gain, t + 0.3, 0.005, 0.05, 0.2, 0.1, 0.1, 0.25);
      }
      return;
    }

    // ── Lv1~4: 기존 화음 시스템 (2반음씩 상승) ──
    const baseNote = 60 + combo * 2; // MIDI C4 + 콤보×2반음
    const freq = 440 * Math.pow(2, (baseNote - 69) / 12);

    // Lv1 (3-4콤보): 3도 화음 추가
    const third = freq * Math.pow(2, 4 / 12); // 장3도
    const { osc: o3, env: e3 } = SE._osc('sine', third, t + 0.02, 0.2, SE.sfxGain);
    SE._adsr(e3.gain, t + 0.02, 0.01, 0.05, 0.3, 0.08, 0.12, 0.2);

    // Lv2 (5-6콤보): 5도 화음 + 아르페지오
    if (combo >= 5) {
      const fifth = freq * Math.pow(2, 7 / 12); // 완전5도
      const { osc: o5, env: e5 } = SE._osc('triangle', fifth, t + 0.04, 0.18, SE.sfxGain);
      SE._adsr(e5.gain, t + 0.04, 0.01, 0.05, 0.25, 0.08, 0.1, 0.18);
      // 상승 아르페지오
      [0, 4, 7, 12].forEach((semi, i) => {
        const nf = freq * Math.pow(2, semi / 12);
        const { osc, env } = SE._osc('sine', nf, t + 0.06 + i * 0.05, 0.22, SE.sfxGain);
        SE._adsr(env.gain, t + 0.06 + i * 0.05, 0.01, 0.04, 0.3, 0.08, 0.1, 0.22);
      });
    }

    // Lv3 (7-8콤보): 풀 코드 + 옥타브 스윕
    if (combo >= 7) {
      const octave = freq * 2;
      const { osc: oH, env: eH } = SE._osc('sine', octave, t + 0.08, 0.25, SE.sfxGain);
      SE._adsr(eH.gain, t + 0.08, 0.01, 0.06, 0.4, 0.1, 0.15, 0.25);
      // 하강 글리산도
      const { osc: gl, env: gE } = SE._osc('sine', octave * 1.5, t + 0.1, 0.15, SE.sfxGain);
      gl.frequency.exponentialRampToValueAtTime(octave * 0.8, t + 0.35);
      SE._adsr(gE.gain, t + 0.1, 0.01, 0.05, 0.2, 0.06, 0.1, 0.15);
    }

    // Lv4 (9-11콤보): 팡파르 + 심벌
    if (combo >= 9) {
      [0, 3, 7, 12, 15, 19, 24].forEach((semi, i) => {
        const nf = freq * Math.pow(2, semi / 12);
        const { osc, env } = SE._osc('sine', nf, t + 0.1 + i * 0.04, 0.2, SE.sfxGain);
        SE._adsr(env.gain, t + 0.1 + i * 0.04, 0.005, 0.03, 0.25, 0.06, 0.08, 0.2);
      });
    }
  },

  /** 타일 이동 효과음 — 타일이 스왑될 때 짧은 '톡' 소리 */
  tileMove() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 짧은 톡 소리 (부드러운 클릭)
    const { osc, env } = SE._osc('sine', 520, t, 0.08, SE.uiGain);
    osc.frequency.linearRampToValueAtTime(380, t + 0.06);
    SE._adsr(env.gain, t, 0.005, 0.02, 0.3, 0.03, 0.1, 0.08);
    // 미세한 고음 반짝임
    const { osc: h, env: hE } = SE._osc('sine', 1200, t, 0.05, SE.uiGain);
    SE._adsr(hE.gain, t, 0.003, 0.01, 0.15, 0.02, 0.04, 0.05);
  },

  candyClear() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 보드 클리어: 상승 스위프
    const { osc, env } = SE._osc('sine', 300, t, 0.5, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.4);
    SE._adsr(env.gain, t, 0.02, 0.1, 0.5, 0.15, 0.15, 0.5);
    // 반짝이
    for (let i = 0; i < 5; i++) {
      const { osc: s, env: sE } = SE._osc('sine', 800 + i * 200, t + 0.1 + i * 0.05, 0.2, SE.sfxGain);
      SE._adsr(sE.gain, t + 0.1 + i * 0.05, 0.005, 0.03, 0.2, 0.05, 0.06, 0.2);
    }
  },

  // ========== ⚔️ 전투 효과음 ==========
  attack(element) {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;

    // 기본 타격음
    const { source: n, env: nEnv } = SE._noise(t, 0.15, SE.sfxGain);
    SE._adsr(nEnv.gain, t, 0.002, 0.03, 0.2, 0.05, 0.25, 0.15);

    // 임팩트 저음
    const { osc, env } = SE._osc('sine', 80, t, 0.2, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    SE._adsr(env.gain, t, 0.005, 0.05, 0.3, 0.1, 0.2, 0.2);

    // 원소별 추가 효과
    if (element) this._elementAttackSound(element, t);
  },

  _elementAttackSound(element, t) {
    const SE = SoundEngine;
    switch (element) {
      case 'fire':
        // 불: 쉬이이 (노이즈 + 하이패스)
        const { source: fn, env: fEnv } = SE._noise(t, 0.4, SE.sfxGain, 'pink');
        SE._adsr(fEnv.gain, t, 0.02, 0.1, 0.3, 0.2, 0.12, 0.4);
        break;
      case 'water':
        // 물: 퐁퐁 (사인파 빠른 변조)
        const { osc: wo, env: wEnv } = SE._osc('sine', 300, t, 0.3, SE.sfxGain);
        wo.frequency.setValueAtTime(600, t + 0.05);
        wo.frequency.exponentialRampToValueAtTime(200, t + 0.3);
        SE._adsr(wEnv.gain, t, 0.01, 0.05, 0.4, 0.1, 0.15, 0.3);
        break;
      case 'thunder':
        // 번개: 찌지직 (노이즈 버스트)
        for (let i = 0; i < 3; i++) {
          const { source: tn, env: tEnv } = SE._noise(t + i * 0.04, 0.08, SE.sfxGain);
          SE._adsr(tEnv.gain, t + i * 0.04, 0.001, 0.01, 0.5, 0.02, 0.3, 0.08);
        }
        break;
      case 'ice':
        // 얼음: 깨지는 소리 (고주파 + 노이즈)
        const { osc: io, env: iEnv } = SE._osc('square', 2000, t, 0.15, SE.sfxGain);
        io.frequency.exponentialRampToValueAtTime(500, t + 0.15);
        SE._adsr(iEnv.gain, t, 0.001, 0.02, 0.2, 0.05, 0.1, 0.15);
        break;
      case 'grass':
        // 풀: 스윽 (필터 스위프)
        const { source: gn, env: gEnv } = SE._noise(t, 0.3, SE.sfxGain, 'pink');
        SE._adsr(gEnv.gain, t, 0.05, 0.1, 0.3, 0.1, 0.1, 0.3);
        break;
      case 'earth':
        // 땅: 쿵 (저음 임팩트)
        const { osc: eo, env: eEnv } = SE._osc('sine', 50, t, 0.3, SE.sfxGain);
        SE._adsr(eEnv.gain, t, 0.005, 0.05, 0.3, 0.15, 0.25, 0.3);
        const { source: en, env: enEnv } = SE._noise(t, 0.15, SE.sfxGain, 'brown');
        SE._adsr(enEnv.gain, t, 0.002, 0.03, 0.2, 0.05, 0.15, 0.15);
        break;
      case 'light':
        // 빛: 맑은 차임
        SE._chord(['C6', 'E6', 'G6'], t, 0.3, 'sine', SE.sfxGain, 0.1);
        break;
      case 'dark':
        // 어둠: 으르렁 (저음 변조)
        const { osc: doo, env: dEnv } = SE._osc('sawtooth', 60, t, 0.4, SE.sfxGain);
        doo.frequency.linearRampToValueAtTime(40, t + 0.4);
        SE._adsr(dEnv.gain, t, 0.05, 0.1, 0.4, 0.15, 0.12, 0.4);
        break;
    }
  },

  hit() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 피격음
    const { source: n, env: nEnv } = SE._noise(t, 0.1, SE.sfxGain);
    SE._adsr(nEnv.gain, t, 0.001, 0.02, 0.15, 0.03, 0.2, 0.1);
    const { osc, env } = SE._osc('sine', 150, t, 0.12, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.12);
    SE._adsr(env.gain, t, 0.003, 0.03, 0.2, 0.05, 0.15, 0.12);
  },

  death() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 쓰러지는 소리 (하강음)
    const { osc, env } = SE._osc('sine', 400, t, 0.8, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.8);
    SE._adsr(env.gain, t, 0.02, 0.1, 0.3, 0.3, 0.15, 0.8);
    // 쿵
    const { osc: thud, env: thudEnv } = SE._osc('sine', 60, t + 0.5, 0.3, SE.sfxGain);
    SE._adsr(thudEnv.gain, t + 0.5, 0.005, 0.05, 0.2, 0.15, 0.2, 0.3);
  },

  // ========== 🎁 아이템/보상 효과음 ==========
  itemGet(rarity) {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;

    const rarityNotes = {
      common:    ['C5', 'E5'],
      uncommon:  ['C5', 'E5', 'G5'],
      rare:      ['C5', 'E5', 'G5', 'B5'],
      epic:      ['C5', 'E5', 'G#5', 'B5', 'C6'],
      legendary: ['C5', 'E5', 'G#5', 'B5', 'D6', 'E6'],
      mythic:    ['C5', 'E5', 'G#5', 'B5', 'D6', 'E6', 'G6']
    };

    const notes = rarityNotes[rarity] || rarityNotes.common;
    notes.forEach((noteStr, i) => {
      const note = noteStr.slice(0, -1);
      const oct = parseInt(noteStr.slice(-1));
      const freq = SE._noteToFreq(note, oct);
      const { osc, env } = SE._osc('sine', freq, t + i * 0.08, 0.4, SE.sfxGain);
      SE._adsr(env.gain, t + i * 0.08, 0.01, 0.05, 0.5, 0.15, 0.12, 0.4);

      // 배음
      const { osc: h, env: hEnv } = SE._osc('sine', freq * 2, t + i * 0.08, 0.3, SE.sfxGain);
      SE._adsr(hEnv.gain, t + i * 0.08, 0.01, 0.03, 0.3, 0.1, 0.04, 0.3);
    });
  },

  goldCollect() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 동전 소리
    const { osc, env } = SE._osc('sine', 1200, t, 0.15, SE.sfxGain);
    osc.frequency.setValueAtTime(1500, t + 0.03);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    SE._adsr(env.gain, t, 0.002, 0.02, 0.3, 0.05, 0.12, 0.15);
  },

  treasureOpen() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 상자 열기: 삐걱 + 빛 효과
    const { source: creak, env: creakEnv } = SE._noise(t, 0.3, SE.sfxGain, 'pink');
    SE._adsr(creakEnv.gain, t, 0.05, 0.1, 0.3, 0.1, 0.08, 0.3);
    // 빛!
    SE._chord(['C5', 'E5', 'G5', 'C6'], t + 0.25, 0.6, 'sine', SE.sfxGain, 0.12);
  },

  // ========== 🏪 UI 효과음 ==========
  buttonClick() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    const { osc, env } = SE._osc('sine', 800, t, 0.06, SE.uiGain);
    SE._adsr(env.gain, t, 0.002, 0.015, 0.2, 0.02, 0.1, 0.06);
  },

  buttonHover() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    const { osc, env } = SE._osc('sine', 600, t, 0.04, SE.uiGain);
    SE._adsr(env.gain, t, 0.002, 0.01, 0.15, 0.01, 0.05, 0.04);
  },

  menuOpen() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    const { osc, env } = SE._osc('sine', 400, t, 0.15, SE.uiGain);
    osc.frequency.linearRampToValueAtTime(800, t + 0.15);
    SE._adsr(env.gain, t, 0.01, 0.03, 0.4, 0.05, 0.08, 0.15);
  },

  menuClose() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    const { osc, env } = SE._osc('sine', 800, t, 0.12, SE.uiGain);
    osc.frequency.linearRampToValueAtTime(400, t + 0.12);
    SE._adsr(env.gain, t, 0.01, 0.03, 0.3, 0.05, 0.08, 0.12);
  },

  error() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 부저 소리
    const { osc, env } = SE._osc('square', 150, t, 0.3, SE.uiGain);
    SE._adsr(env.gain, t, 0.005, 0.05, 0.5, 0.1, 0.08, 0.3);
    const { osc: o2, env: e2 } = SE._osc('square', 120, t + 0.15, 0.15, SE.uiGain);
    SE._adsr(e2.gain, t + 0.15, 0.005, 0.03, 0.4, 0.05, 0.06, 0.15);
  },

  // ========== 🗺️ 마블 타일 효과음 ==========

  /** 마블 매 칸 이동 — 짧은 "톡" 소리 */
  marbleStep() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 가벼운 톡 (200Hz sine, 0.05초)
    const { osc, env } = SE._osc('sine', 200, t, 0.05, SE.sfxGain);
    osc.frequency.linearRampToValueAtTime(160, t + 0.05);
    SE._adsr(env.gain, t, 0.003, 0.01, 0.25, 0.02, 0.12, 0.05);
    // 미세한 노이즈 텍스처
    const { source: n, env: nEnv } = SE._noise(t, 0.03, SE.sfxGain, 'brown');
    SE._adsr(nEnv.gain, t, 0.002, 0.008, 0.1, 0.01, 0.05, 0.03);
  },

  /** 마블 착지 — "쿵" + 반짝 */
  marbleLand() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 쿵 (150Hz thud)
    const { osc, env } = SE._osc('sine', 150, t, 0.15, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    SE._adsr(env.gain, t, 0.005, 0.04, 0.3, 0.08, 0.18, 0.15);
    // 반짝 sparkle (800Hz)
    const { osc: sp, env: spEnv } = SE._osc('sine', 800, t + 0.03, 0.12, SE.sfxGain);
    sp.frequency.linearRampToValueAtTime(1200, t + 0.08);
    sp.frequency.linearRampToValueAtTime(600, t + 0.15);
    SE._adsr(spEnv.gain, t + 0.03, 0.005, 0.02, 0.25, 0.04, 0.06, 0.12);
  },

  /** 마블 아이템 수집 효과음 */
  marbleCollect() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 밝은 수집음 (상승 톤)
    const { osc, env } = SE._osc('sine', 600, t, 0.2, SE.sfxGain);
    osc.frequency.linearRampToValueAtTime(1000, t + 0.1);
    SE._adsr(env.gain, t, 0.005, 0.03, 0.4, 0.08, 0.12, 0.2);
    // 배음 반짝임
    const { osc: h, env: hEnv } = SE._osc('sine', 1200, t + 0.05, 0.15, SE.sfxGain);
    SE._adsr(hEnv.gain, t + 0.05, 0.005, 0.02, 0.2, 0.05, 0.05, 0.15);
  },

  heroMove() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 발걸음 (2번)
    [0, 0.15].forEach(delay => {
      const { osc, env } = SE._osc('sine', 100, t + delay, 0.08, SE.sfxGain);
      SE._adsr(env.gain, t + delay, 0.003, 0.02, 0.2, 0.03, 0.1, 0.08);
      const { source: n, env: nEnv } = SE._noise(t + delay, 0.05, SE.sfxGain, 'brown');
      SE._adsr(nEnv.gain, t + delay, 0.002, 0.01, 0.15, 0.02, 0.06, 0.05);
    });
  },

  trapTrigger() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 경고음
    const { osc, env } = SE._osc('square', 200, t, 0.4, SE.sfxGain);
    osc.frequency.setValueAtTime(150, t + 0.1);
    osc.frequency.setValueAtTime(200, t + 0.2);
    osc.frequency.setValueAtTime(150, t + 0.3);
    SE._adsr(env.gain, t, 0.005, 0.05, 0.5, 0.1, 0.1, 0.4);
  },

  warp() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 워프: 하강 스위프
    const { osc, env } = SE._osc('sine', 2000, t, 0.5, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.5);
    SE._adsr(env.gain, t, 0.01, 0.05, 0.4, 0.15, 0.12, 0.5);
    // 반짝이
    const { osc: s, env: sE } = SE._osc('sine', 1500, t + 0.1, 0.3, SE.sfxGain);
    s.frequency.exponentialRampToValueAtTime(300, t + 0.4);
    SE._adsr(sE.gain, t + 0.1, 0.01, 0.03, 0.3, 0.1, 0.06, 0.3);
  },

  shopOpen() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 종소리
    const { osc, env } = SE._osc('sine', 1000, t, 0.4, SE.sfxGain);
    SE._adsr(env.gain, t, 0.005, 0.1, 0.3, 0.2, 0.12, 0.4);
    const { osc: o2, env: e2 } = SE._osc('sine', 1500, t + 0.1, 0.3, SE.sfxGain);
    SE._adsr(e2.gain, t + 0.1, 0.005, 0.08, 0.25, 0.15, 0.08, 0.3);
  },

  // ========== 🏆 승리/패배 ==========
  victory() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 승리 팡파르
    const melody = [
      { note: 'C', oct: 5, time: 0, dur: 0.2 },
      { note: 'E', oct: 5, time: 0.15, dur: 0.2 },
      { note: 'G', oct: 5, time: 0.3, dur: 0.2 },
      { note: 'C', oct: 6, time: 0.45, dur: 0.5 },
      { note: 'G', oct: 5, time: 0.45, dur: 0.5 },
      { note: 'E', oct: 5, time: 0.45, dur: 0.5 },
    ];
    melody.forEach(m => {
      const freq = SE._noteToFreq(m.note, m.oct);
      const { osc, env } = SE._osc('sine', freq, t + m.time, m.dur, SE.sfxGain);
      SE._adsr(env.gain, t + m.time, 0.01, 0.05, 0.6, 0.1, 0.15, m.dur);
      // 배음
      const { osc: h, env: hEnv } = SE._osc('sine', freq * 2, t + m.time, m.dur * 0.8, SE.sfxGain);
      SE._adsr(hEnv.gain, t + m.time, 0.01, 0.03, 0.3, 0.08, 0.05, m.dur * 0.8);
    });
  },

  defeat() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 패배 (하강 단조)
    const melody = [
      { note: 'E', oct: 4, time: 0, dur: 0.3 },
      { note: 'D', oct: 4, time: 0.25, dur: 0.3 },
      { note: 'C', oct: 4, time: 0.5, dur: 0.3 },
      { note: 'B', oct: 3, time: 0.75, dur: 0.6 },
    ];
    melody.forEach(m => {
      const freq = SE._noteToFreq(m.note, m.oct);
      const { osc, env } = SE._osc('triangle', freq, t + m.time, m.dur, SE.sfxGain);
      SE._adsr(env.gain, t + m.time, 0.02, 0.08, 0.4, 0.15, 0.12, m.dur);
    });
  },

  levelUp() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 레벨업: 빠른 상승 아르페지오
    const notes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'E6'];
    notes.forEach((noteStr, i) => {
      const note = noteStr.slice(0, -1);
      const oct = parseInt(noteStr.slice(-1));
      const freq = SE._noteToFreq(note, oct);
      const { osc, env } = SE._osc('sine', freq, t + i * 0.05, 0.3, SE.sfxGain);
      SE._adsr(env.gain, t + i * 0.05, 0.005, 0.03, 0.5, 0.1, 0.12, 0.3);
    });
    // 마지막 화음
    SE._chord(['C6', 'E6', 'G6'], t + 0.4, 0.6, 'sine', SE.sfxGain, 0.1);
  },

  // ========== 👹 보스 효과음 ==========
  bossAppear() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 으르릉 + 임팩트
    const { osc, env } = SE._osc('sawtooth', 40, t, 1.5, SE.sfxGain);
    osc.frequency.linearRampToValueAtTime(80, t + 0.5);
    osc.frequency.linearRampToValueAtTime(30, t + 1.5);
    SE._adsr(env.gain, t, 0.1, 0.3, 0.5, 0.5, 0.15, 1.5);
    // 쿵!
    const { osc: impact, env: impEnv } = SE._osc('sine', 30, t + 0.5, 0.5, SE.sfxGain);
    SE._adsr(impEnv.gain, t + 0.5, 0.005, 0.1, 0.3, 0.2, 0.25, 0.5);
    const { source: n, env: nEnv } = SE._noise(t + 0.5, 0.3, SE.sfxGain, 'brown');
    SE._adsr(nEnv.gain, t + 0.5, 0.005, 0.05, 0.2, 0.1, 0.15, 0.3);
  },

  bossPhaseChange() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 위험! 경고음
    for (let i = 0; i < 3; i++) {
      const { osc, env } = SE._osc('square', 400, t + i * 0.3, 0.15, SE.sfxGain);
      SE._adsr(env.gain, t + i * 0.3, 0.005, 0.03, 0.5, 0.05, 0.12, 0.15);
    }
    // 폭발
    const { source: boom, env: boomEnv } = SE._noise(t + 0.9, 0.5, SE.sfxGain);
    SE._adsr(boomEnv.gain, t + 0.9, 0.005, 0.1, 0.3, 0.2, 0.2, 0.5);
  },

  bossDefeat() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 폭발 연속
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.2 + Math.random() * 0.1;
      const { source: n, env: nEnv } = SE._noise(t + delay, 0.3, SE.sfxGain);
      SE._adsr(nEnv.gain, t + delay, 0.005, 0.05, 0.2, 0.1, 0.15 - i * 0.02, 0.3);
      const { osc, env } = SE._osc('sine', 60 + i * 10, t + delay, 0.3, SE.sfxGain);
      SE._adsr(env.gain, t + delay, 0.005, 0.05, 0.2, 0.1, 0.12, 0.3);
    }
    // 승리!
    setTimeout(() => this.victory(), 1200);
  },

  // ========== 🧚 정령/요정 효과음 ==========
  spiritSummon() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 반짝 + 벨소리
    for (let i = 0; i < 6; i++) {
      const freq = 800 + Math.random() * 1200;
      const { osc, env } = SE._osc('sine', freq, t + i * 0.08, 0.25, SE.sfxGain);
      SE._adsr(env.gain, t + i * 0.08, 0.005, 0.03, 0.3, 0.1, 0.06, 0.25);
    }
  },

  heal() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 부드러운 상승음
    SE._chord(['C5', 'E5', 'G5'], t, 0.5, 'sine', SE.sfxGain, 0.1);
    SE._chord(['D5', 'F#5', 'A5'], t + 0.3, 0.5, 'sine', SE.sfxGain, 0.1);
    SE._chord(['E5', 'G#5', 'B5'], t + 0.6, 0.6, 'sine', SE.sfxGain, 0.1);
  },

  // ========== 🎰 가챠 효과음 ==========
  gachaSpin() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 돌아가는 소리
    for (let i = 0; i < 15; i++) {
      const speed = 0.08 + i * 0.015; // 점점 느려짐
      const freq = 600 + (i % 3) * 100;
      const { osc, env } = SE._osc('sine', freq, t + i * speed, 0.05, SE.sfxGain);
      SE._adsr(env.gain, t + i * speed, 0.002, 0.01, 0.3, 0.02, 0.1, 0.05);
    }
  },

  gachaReveal(rarity) {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime + 0.1;
    // 두근두근 + 오픈
    const { osc: drum1, env: d1Env } = SE._osc('sine', 80, t, 0.15, SE.sfxGain);
    SE._adsr(d1Env.gain, t, 0.003, 0.03, 0.2, 0.05, 0.2, 0.15);
    const { osc: drum2, env: d2Env } = SE._osc('sine', 80, t + 0.2, 0.15, SE.sfxGain);
    SE._adsr(d2Env.gain, t + 0.2, 0.003, 0.03, 0.2, 0.05, 0.2, 0.15);
    // 공개!
    setTimeout(() => this.itemGet(rarity || 'rare'), 500);
  },

  // ========== 💢 분노 게이지 / 스킬 효과음 ==========

  /** 분노 폭발 발동 — 강렬한 베이스 임팩트 + 상승 파워 서지 */
  rageActivation() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;

    // 깊은 베이스 임팩트
    const { osc: bass, env: bassEnv } = SE._osc('sine', 35, t, 0.8, SE.sfxGain);
    bass.frequency.exponentialRampToValueAtTime(20, t + 0.8);
    SE._adsr(bassEnv.gain, t, 0.01, 0.08, 0.4, 0.3, 0.35, 0.8);

    // 상승 파워 서지 (200→500Hz sawtooth)
    const { osc: surge, env: surgeEnv } = SE._osc('sawtooth', 200, t, 0.6, SE.sfxGain);
    surge.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    SE._adsr(surgeEnv.gain, t, 0.02, 0.08, 0.5, 0.15, 0.18, 0.6);

    // 날카로운 크래클 (핑크 노이즈 버스트)
    const { source: n, env: nEnv } = SE._noise(t, 0.3, SE.sfxGain, 'pink');
    SE._adsr(nEnv.gain, t, 0.005, 0.04, 0.3, 0.1, 0.2, 0.3);

    // 고음 차지 톤 (800→1200Hz)
    const { osc: charge, env: chargeEnv } = SE._osc('square', 800, t + 0.05, 0.4, SE.sfxGain);
    charge.frequency.linearRampToValueAtTime(1200, t + 0.35);
    SE._adsr(chargeEnv.gain, t + 0.05, 0.01, 0.03, 0.4, 0.1, 0.1, 0.4);

    // 폭발 충격파 (브라운 노이즈)
    const { source: boom, env: boomEnv } = SE._noise(t + 0.1, 0.4, SE.sfxGain, 'brown');
    SE._adsr(boomEnv.gain, t + 0.1, 0.005, 0.05, 0.25, 0.15, 0.2, 0.4);
  },

  /** 분노 모드 종료 — 부드러운 하강음 */
  rageEnd() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;

    // 하강 톤 (600→200Hz)
    const { osc, env } = SE._osc('sine', 600, t, 0.5, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    SE._adsr(env.gain, t, 0.01, 0.05, 0.3, 0.15, 0.12, 0.5);

    // 소멸 반짝임
    const { osc: sp, env: spEnv } = SE._osc('sine', 1000, t + 0.1, 0.3, SE.sfxGain);
    sp.frequency.exponentialRampToValueAtTime(400, t + 0.35);
    SE._adsr(spEnv.gain, t + 0.1, 0.005, 0.03, 0.2, 0.1, 0.08, 0.3);
  },

  // ========== ⚔️ 전투 추가 효과음 ==========

  /** 피격음 (플레이어가 맞을 때) */
  playerHit() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 둔탁한 타격
    const { source: n, env: nEnv } = SE._noise(t, 0.12, SE.sfxGain);
    SE._adsr(nEnv.gain, t, 0.001, 0.02, 0.2, 0.04, 0.22, 0.12);
    // 저음 쿵
    const { osc, env } = SE._osc('sine', 120, t, 0.15, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    SE._adsr(env.gain, t, 0.003, 0.03, 0.25, 0.06, 0.18, 0.15);
    // 경고 톤
    const { osc: warn, env: warnEnv } = SE._osc('square', 300, t + 0.02, 0.08, SE.sfxGain);
    SE._adsr(warnEnv.gain, t + 0.02, 0.002, 0.01, 0.15, 0.02, 0.08, 0.08);
  },

  /** 적 처치음 — 팝! + 보상 반짝 */
  enemyDeath() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 터지는 소리 (상승→하강)
    const { osc, env } = SE._osc('sine', 300, t, 0.2, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);
    SE._adsr(env.gain, t, 0.003, 0.03, 0.3, 0.08, 0.15, 0.2);
    // 노이즈 팝
    const { source: n, env: nEnv } = SE._noise(t, 0.1, SE.sfxGain);
    SE._adsr(nEnv.gain, t, 0.001, 0.015, 0.15, 0.03, 0.15, 0.1);
    // 보상 반짝
    const { osc: sp, env: spEnv } = SE._osc('sine', 1200, t + 0.08, 0.15, SE.sfxGain);
    SE._adsr(spEnv.gain, t + 0.08, 0.005, 0.02, 0.2, 0.05, 0.06, 0.15);
  },

  /** 투사체 발사음 */
  projectileShoot() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 슈웅 (상승 스위프)
    const { osc, env } = SE._osc('sine', 400, t, 0.1, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.08);
    SE._adsr(env.gain, t, 0.002, 0.02, 0.3, 0.03, 0.08, 0.1);
  },

  /** 투사체 적중음 */
  projectileHit() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 짧은 임팩트
    const { source: n, env: nEnv } = SE._noise(t, 0.06, SE.sfxGain);
    SE._adsr(nEnv.gain, t, 0.001, 0.01, 0.2, 0.02, 0.12, 0.06);
    const { osc, env } = SE._osc('sine', 200, t, 0.08, SE.sfxGain);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    SE._adsr(env.gain, t, 0.002, 0.02, 0.2, 0.03, 0.1, 0.08);
  },

  /** 펫 회복음 */
  petHeal() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 부드러운 상승 벨
    const { osc, env } = SE._osc('sine', 500, t, 0.4, SE.sfxGain);
    osc.frequency.linearRampToValueAtTime(800, t + 0.3);
    SE._adsr(env.gain, t, 0.02, 0.05, 0.4, 0.12, 0.1, 0.4);
    // 반짝 하모닉
    const { osc: h, env: hEnv } = SE._osc('sine', 1000, t + 0.1, 0.3, SE.sfxGain);
    SE._adsr(hEnv.gain, t + 0.1, 0.01, 0.03, 0.25, 0.08, 0.06, 0.3);
  },

  /** 업그레이드 아이템 획득 */
  upgradePickup() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 밝은 팅! (상승)
    const { osc, env } = SE._osc('sine', 800, t, 0.2, SE.sfxGain);
    osc.frequency.linearRampToValueAtTime(1400, t + 0.1);
    SE._adsr(env.gain, t, 0.005, 0.03, 0.4, 0.08, 0.15, 0.2);
    // 배음
    const { osc: h, env: hEnv } = SE._osc('sine', 1600, t + 0.03, 0.15, SE.sfxGain);
    SE._adsr(hEnv.gain, t + 0.03, 0.005, 0.02, 0.2, 0.05, 0.08, 0.15);
  },

  /** 정령 조각 드롭 연출음 */
  spiritFragmentDrop() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 크리스탈 차임 (상승)
    const { osc, env } = SE._osc('sine', 600, t, 0.3, SE.sfxGain);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.15);
    SE._adsr(env.gain, t, 0.005, 0.03, 0.35, 0.1, 0.12, 0.3);
    // 반짝이 하이톤
    const { osc: sp, env: spEnv } = SE._osc('sine', 1800, t + 0.08, 0.2, SE.sfxGain);
    SE._adsr(spEnv.gain, t + 0.08, 0.003, 0.02, 0.2, 0.06, 0.06, 0.2);
  },

  /** 정령 조각 세트 완성음 */
  spiritSetComplete() {
    const SE = SoundEngine;
    if (!SE.ctx) return;
    SE.resume();
    const t = SE.ctx.currentTime;
    // 상승 아르페지오 (세트 완성 축하)
    const notes = ['E5', 'G5', 'B5', 'E6'];
    notes.forEach((noteStr, i) => {
      const note = noteStr.slice(0, -1);
      const oct = parseInt(noteStr.slice(-1));
      const freq = SE._noteToFreq(note, oct);
      const { osc, env } = SE._osc('sine', freq, t + i * 0.07, 0.3, SE.sfxGain);
      SE._adsr(env.gain, t + i * 0.07, 0.005, 0.03, 0.45, 0.1, 0.12, 0.3);
    });
    // 마무리 화음
    SE._chord(['E5', 'G#5', 'B5'], t + 0.35, 0.5, 'sine', SE.sfxGain, 0.08);
  }
};

// Export
if (typeof window !== 'undefined') window.SoundSFX = SoundSFX;
if (typeof module !== 'undefined') module.exports = SoundSFX;
