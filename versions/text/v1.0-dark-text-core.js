// ============================================================
// 🌐 몽글벨 웹엔진 - 다국어 텍스트 엔진 코어 (1/3)
// ============================================================
// 한국어/영어/일본어/중국어/아랍어/태국어 등 전 세계 언어
// 고품질 폰트 렌더링 + 자동 언어 감지 + 줄바꿈
//
// Claude Code: js/text/text-core.js 에 넣으세요
// ============================================================

const TextEngine = {

  _canvas: null,
  _ctx: null,
  _fonts: new Map(),
  _loaded: false,
  _defaultFont: 'sans-serif',
  _cache: new Map(),
  _cacheMax: 500,

  // ========== 언어별 폰트 스택 ==========
  FONT_STACKS: {
    ko: {
      display:  '"Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif',
      body:     '"Noto Sans KR", "Malgun Gothic", "맑은 고딕", sans-serif',
      pixel:    '"DungGeunMo", "Galmuri11", monospace',
      fantasy:  '"Black Han Sans", "Noto Sans KR", sans-serif',
      cute:     '"Jua", "Noto Sans KR", sans-serif',
      bold:     '"Black Han Sans", "Noto Sans KR", sans-serif'
    },
    en: {
      display:  '"Cinzel", "Georgia", serif',
      body:     '"Noto Sans", "Arial", sans-serif',
      pixel:    '"Press Start 2P", "Courier New", monospace',
      fantasy:  '"MedievalSharp", "Cinzel", serif',
      cute:     '"Fredoka One", "Comic Sans MS", sans-serif',
      bold:     '"Oswald", "Impact", sans-serif'
    },
    ja: {
      display:  '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',
      body:     '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',
      pixel:    '"DotGothic16", monospace',
      fantasy:  '"Noto Serif JP", "Yu Mincho", serif',
      cute:     '"Kosugi Maru", "Noto Sans JP", sans-serif',
      bold:     '"Noto Sans JP", sans-serif'
    },
    zh: {
      display:  '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif',
      body:     '"Noto Sans SC", "Microsoft YaHei", sans-serif',
      pixel:    '"ZCOOL QingKe HuangYou", monospace',
      fantasy:  '"Noto Serif SC", "SimSun", serif',
      cute:     '"ZCOOL XiaoWei", "Noto Sans SC", sans-serif',
      bold:     '"Noto Sans SC", sans-serif'
    },
    'zh-TW': {
      display:  '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif',
      body:     '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
      pixel:    '"ZCOOL QingKe HuangYou", monospace',
      fantasy:  '"Noto Serif TC", "PMingLiU", serif',
      cute:     '"Noto Sans TC", sans-serif',
      bold:     '"Noto Sans TC", sans-serif'
    },
    th: {
      display:  '"Noto Sans Thai", "Tahoma", sans-serif',
      body:     '"Noto Sans Thai", "Tahoma", sans-serif',
      pixel:    '"Noto Sans Thai", monospace',
      fantasy:  '"Noto Serif Thai", serif',
      cute:     '"Noto Sans Thai", sans-serif',
      bold:     '"Noto Sans Thai", sans-serif'
    },
    ar: {
      display:  '"Noto Sans Arabic", "Arial", sans-serif',
      body:     '"Noto Sans Arabic", "Arial", sans-serif',
      pixel:    '"Noto Sans Arabic", monospace',
      fantasy:  '"Noto Naskh Arabic", serif',
      cute:     '"Noto Sans Arabic", sans-serif',
      bold:     '"Noto Sans Arabic", sans-serif'
    },
    hi: {
      display:  '"Noto Sans Devanagari", "Mangal", sans-serif',
      body:     '"Noto Sans Devanagari", "Mangal", sans-serif',
      pixel:    '"Noto Sans Devanagari", monospace',
      fantasy:  '"Noto Serif Devanagari", serif',
      cute:     '"Noto Sans Devanagari", sans-serif',
      bold:     '"Noto Sans Devanagari", sans-serif'
    },
    ru: {
      display:  '"Noto Sans", "Arial", sans-serif',
      body:     '"Noto Sans", "Arial", sans-serif',
      pixel:    '"Press Start 2P", monospace',
      fantasy:  '"Noto Serif", serif',
      cute:     '"Noto Sans", sans-serif',
      bold:     '"Oswald", sans-serif'
    },
    default: {
      display:  '"Noto Sans", "Arial", "Helvetica", sans-serif',
      body:     '"Noto Sans", "Arial", sans-serif',
      pixel:    '"Courier New", monospace',
      fantasy:  '"Georgia", serif',
      cute:     '"Comic Sans MS", sans-serif',
      bold:     '"Impact", sans-serif'
    }
  },

  // ========== Google Fonts CDN URL ==========
  GOOGLE_FONTS: {
    ko: [
      'Noto+Sans+KR:wght@100;300;400;500;700;900',
      'Black+Han+Sans',
      'Jua'
    ],
    en: [
      'Noto+Sans:wght@100;300;400;500;700;900',
      'Cinzel:wght@400;700;900',
      'Press+Start+2P',
      'Fredoka+One',
      'Oswald:wght@400;700',
      'MedievalSharp'
    ],
    ja: [
      'Noto+Sans+JP:wght@100;300;400;500;700;900',
      'DotGothic16',
      'Kosugi+Maru',
      'Noto+Serif+JP:wght@400;700'
    ],
    zh: [
      'Noto+Sans+SC:wght@100;300;400;500;700;900',
      'Noto+Serif+SC:wght@400;700',
      'ZCOOL+QingKe+HuangYou',
      'ZCOOL+XiaoWei'
    ],
    th: [
      'Noto+Sans+Thai:wght@100;300;400;500;700;900'
    ],
    ar: [
      'Noto+Sans+Arabic:wght@100;300;400;500;700;900',
      'Noto+Naskh+Arabic:wght@400;700'
    ],
    hi: [
      'Noto+Sans+Devanagari:wght@100;300;400;500;700;900'
    ]
  },

  // ========== 초기화 ==========
  init(options = {}) {
    this._canvas = document.createElement('canvas');
    this._canvas.width = 1;
    this._canvas.height = 1;
    this._ctx = this._canvas.getContext('2d');

    this._defaultLang = options.lang || this._detectBrowserLang();
    this._defaultStyle = options.style || 'body';

    const langsToLoad = options.languages || [this._defaultLang, 'en'];
    this.loadFonts(langsToLoad);

    this._loaded = true;
    console.log('[TextEngine] 초기화 완료 (기본 언어: ' + this._defaultLang + ')');
    return this;
  },

  // ========== 폰트 로드 ==========
  loadFonts(languages) {
    const families = [];
    languages.forEach(lang => {
      const fonts = this.GOOGLE_FONTS[lang];
      if (fonts) families.push(...fonts);
    });

    if (families.length === 0) return;

    const url = 'https://fonts.googleapis.com/css2?' + families.map(f => 'family=' + f).join('&') + '&display=swap';

    if (document.querySelector('link[href="' + url + '"]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);

    console.log('[TextEngine] 폰트 로드: ' + languages.join(', '));
  },

  addFont(name, url, options = {}) {
    const fontFace = new FontFace(name, 'url(' + url + ')', {
      weight: options.weight || 'normal',
      style: options.style || 'normal'
    });

    fontFace.load().then(loaded => {
      document.fonts.add(loaded);
      this._fonts.set(name, loaded);
      console.log('[TextEngine] 커스텀 폰트 로드: ' + name);
    }).catch(err => {
      console.warn('[TextEngine] 폰트 로드 실패: ' + name, err);
    });
  },

  // ========== 언어 자동 감지 ==========
  detectLanguage(text) {
    if (!text || text.length === 0) return 'en';

    for (let i = 0; i < Math.min(text.length, 50); i++) {
      const code = text.charCodeAt(i);

      if ((code >= 0xAC00 && code <= 0xD7AF) ||
          (code >= 0x1100 && code <= 0x11FF) ||
          (code >= 0x3130 && code <= 0x318F)) return 'ko';

      if ((code >= 0x3040 && code <= 0x309F) ||
          (code >= 0x30A0 && code <= 0x30FF) ||
          (code >= 0x31F0 && code <= 0x31FF)) return 'ja';

      if ((code >= 0x4E00 && code <= 0x9FFF) ||
          (code >= 0x3400 && code <= 0x4DBF) ||
          (code >= 0xF900 && code <= 0xFAFF)) return 'zh';

      if (code >= 0x0E00 && code <= 0x0E7F) return 'th';

      if ((code >= 0x0600 && code <= 0x06FF) ||
          (code >= 0x0750 && code <= 0x077F) ||
          (code >= 0xFB50 && code <= 0xFDFF)) return 'ar';

      if (code >= 0x0900 && code <= 0x097F) return 'hi';

      if ((code >= 0x0400 && code <= 0x04FF) ||
          (code >= 0x0500 && code <= 0x052F)) return 'ru';
    }

    return 'en';
  },

  _detectBrowserLang() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const short = lang.split('-')[0].toLowerCase();
    return this.FONT_STACKS[short] ? short : 'en';
  },

  // ========== 폰트 문자열 생성 ==========
  getFont(options = {}) {
    const text = options.text || '';
    const lang = options.lang || this.detectLanguage(text);
    const style = options.style || this._defaultStyle;
    const size = options.size || 16;
    const weight = options.weight || 400;
    const italic = options.italic ? 'italic ' : '';

    const stack = this.FONT_STACKS[lang] || this.FONT_STACKS.default;
    const family = stack[style] || stack.body;

    return italic + weight + ' ' + size + 'px ' + family;
  },

  // ========== 텍스트 크기 측정 ==========
  measure(text, options = {}) {
    const font = this.getFont({ ...options, text });

    const cacheKey = font + '|' + text;
    if (this._cache.has(cacheKey)) return this._cache.get(cacheKey);

    this._ctx.font = font;
    const metrics = this._ctx.measureText(text);

    const result = {
      width: metrics.width,
      height: (options.size || 16) * 1.3,
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || (options.size || 16) * 0.8,
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || (options.size || 16) * 0.2
    };

    if (this._cache.size > this._cacheMax) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    this._cache.set(cacheKey, result);

    return result;
  },

  // ========== 텍스트 방향 감지 ==========
  getTextDirection(text) {
    const lang = this.detectLanguage(text);
    if (['ar', 'he', 'fa', 'ur'].includes(lang)) return 'rtl';
    return 'ltr';
  },

  // ========== 줄바꿈 처리 ==========
  wrapText(text, maxWidth, options = {}) {
    const font = this.getFont({ ...options, text });
    this._ctx.font = font;
    const lang = options.lang || this.detectLanguage(text);

    const lines = [];
    const paragraphs = text.split('\n');

    paragraphs.forEach(paragraph => {
      if (paragraph.trim() === '') {
        lines.push('');
        return;
      }

      if (['ko', 'ja', 'zh'].includes(lang)) {
        let currentLine = '';
        for (let i = 0; i < paragraph.length; i++) {
          const char = paragraph[i];
          const testLine = currentLine + char;
          const testWidth = this._ctx.measureText(testLine).width;

          if (testWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      } else {
        const words = paragraph.split(' ');
        let currentLine = '';

        words.forEach(word => {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = this._ctx.measureText(testLine).width;

          if (testWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);
      }
    });

    return lines;
  },

  // ========== 다국어 문자열 포맷 ==========
  formatNumber(num, lang) {
    const l = lang || this._defaultLang;
    const locales = {
      ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN',
      th: 'th-TH', ar: 'ar-SA', hi: 'hi-IN', ru: 'ru-RU'
    };
    try {
      return num.toLocaleString(locales[l] || 'en-US');
    } catch (e) {
      return num.toString();
    }
  },

  formatDate(date, lang, style) {
    const l = lang || this._defaultLang;
    const locales = {
      ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN',
      th: 'th-TH', ar: 'ar-SA', hi: 'hi-IN', ru: 'ru-RU'
    };
    const options = style === 'short'
      ? { month: 'short', day: 'numeric' }
      : { year: 'numeric', month: 'long', day: 'numeric' };
    try {
      return new Date(date).toLocaleDateString(locales[l] || 'en-US', options);
    } catch (e) {
      return date.toString();
    }
  },

  // ========== 유틸 ==========
  clearCache() { this._cache.clear(); },

  getSupportedLanguages() {
    return Object.keys(this.FONT_STACKS).filter(k => k !== 'default');
  }
};

if (typeof window !== 'undefined') window.TextEngine = TextEngine;
if (typeof module !== 'undefined') module.exports = TextEngine;
