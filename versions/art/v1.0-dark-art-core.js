// ============================================================
// 🎨 몽글벨 웹엔진 - 미술 엔진 코어 (1/3)
// ============================================================
// 고급 셰이더 이펙트 + 재질 시스템 + 분위기 연출
// 고급 셰이더 시스템 + 라이팅 파이프라인
//
// Claude Code: js/art/art-core.js 에 넣으세요
// ============================================================

const ArtEngine = {

  // ========== 컬러 팔레트 시스템 ==========
  PALETTES: {
    // 판타지 테마
    enchantedForest: {
      sky: [0x0B1D3A, 0x1A3A5C],
      ground: [0x1A3322, 0x2D4A33],
      ambient: 0x223344,
      fog: 0x0A1A2A,
      accent: 0x44DDAA,
      particles: [0x44FFAA, 0x22DD88, 0x88FFCC]
    },
    volcanicRuins: {
      sky: [0x1A0A0A, 0x3A1500],
      ground: [0x2A1A0A, 0x1A0A00],
      ambient: 0x442211,
      fog: 0x1A0800,
      accent: 0xFF4400,
      particles: [0xFF6600, 0xFF4400, 0xFFAA00]
    },
    crystalCave: {
      sky: [0x0A0A2E, 0x15153E],
      ground: [0x1A1A3A, 0x0A0A2A],
      ambient: 0x2233AA,
      fog: 0x0A0A1E,
      accent: 0x44AAFF,
      particles: [0x66CCFF, 0x4488FF, 0xAADDFF]
    },
    cloudKingdom: {
      sky: [0x4488CC, 0x88BBEE],
      ground: [0xDDDDEE, 0xCCCCDD],
      ambient: 0x8899BB,
      fog: 0xAABBDD,
      accent: 0xFFDD44,
      particles: [0xFFFFFF, 0xFFEECC, 0xFFDD88]
    },
    darkRealm: {
      sky: [0x050510, 0x0A0A20],
      ground: [0x0A0A15, 0x050508],
      ambient: 0x110022,
      fog: 0x050008,
      accent: 0x8844FF,
      particles: [0xAA66FF, 0x6622CC, 0xDD88FF]
    },
    sakuraGarden: {
      sky: [0xFFCCDD, 0xFFAABB],
      ground: [0x2A3322, 0x334428],
      ambient: 0xFFAACC,
      fog: 0xFFDDEE,
      accent: 0xFF88AA,
      particles: [0xFFAACC, 0xFF88AA, 0xFFCCDD]
    },
    frozenTundra: {
      sky: [0x1A2A3A, 0x2A3A4A],
      ground: [0xCCDDEE, 0xAABBCC],
      ambient: 0x4466AA,
      fog: 0xAABBDD,
      accent: 0x88DDFF,
      particles: [0xDDEEFF, 0xAADDFF, 0xFFFFFF]
    },
    goldenTemple: {
      sky: [0x2A1A00, 0x4A3010],
      ground: [0x3A2A10, 0x2A1A08],
      ambient: 0x886622,
      fog: 0x221A08,
      accent: 0xFFDD00,
      particles: [0xFFDD00, 0xFFCC00, 0xFFEE44]
    }
  },

  // ========== 고급 셰이더 모음 ==========
  SHADERS: {

    // 🌊 물/액체 셰이더
    waterVert: `
      uniform float uTime;
      uniform float uWaveHeight;
      uniform float uWaveSpeed;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vElevation;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float wave1 = sin(pos.x * 4.0 + uTime * uWaveSpeed) * uWaveHeight;
        float wave2 = sin(pos.z * 3.0 + uTime * uWaveSpeed * 0.7) * uWaveHeight * 0.5;
        float wave3 = sin((pos.x + pos.z) * 2.0 + uTime * uWaveSpeed * 1.3) * uWaveHeight * 0.3;
        pos.y += wave1 + wave2 + wave3;
        vElevation = wave1 + wave2 + wave3;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    waterFrag: `
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uFoamThreshold;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying float vElevation;
      void main() {
        float depth = smoothstep(-0.1, 0.1, vElevation);
        vec3 color = mix(uDeepColor, uShallowColor, depth);
        float foam = step(uFoamThreshold, vElevation);
        color = mix(color, vec3(1.0), foam * 0.5);
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
        color += vec3(0.1, 0.2, 0.3) * fresnel;
        float sparkle = pow(max(sin(vUv.x * 40.0 + uTime * 2.0) * sin(vUv.y * 40.0 - uTime * 1.5), 0.0), 20.0);
        color += vec3(sparkle * 0.3);
        gl_FragColor = vec4(color, uOpacity);
      }
    `,

    // 🔥 불/용암 셰이더
    lavaVert: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vDisplacement;
      void main() {
        vUv = uv;
        float displacement = sin(position.x * 5.0 + uTime) * sin(position.z * 5.0 + uTime * 0.8) * 0.1;
        vDisplacement = displacement;
        vec3 pos = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    lavaFrag: `
      uniform float uTime;
      uniform vec3 uHotColor;
      uniform vec3 uCoolColor;
      varying vec2 vUv;
      varying float vDisplacement;

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float smoothNoise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        float a = noise(i); float b = noise(i + vec2(1.0, 0.0));
        float c = noise(i + vec2(0.0, 1.0)); float d = noise(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * smoothNoise(p); p *= 2.0; a *= 0.5;
        }
        return v;
      }
      void main() {
        vec2 uv = vUv * 3.0;
        float n = fbm(uv + vec2(uTime * 0.1, uTime * 0.05));
        float heat = smoothstep(0.3, 0.7, n);
        vec3 color = mix(uCoolColor, uHotColor, heat);
        color += vec3(1.0, 0.5, 0.0) * pow(heat, 3.0) * 0.5;
        float glow = pow(heat, 2.0) * 0.3;
        gl_FragColor = vec4(color + glow, 1.0);
      }
    `,

    // ❄️ 얼음/크리스탈 셰이더
    crystalVert: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying vec3 vReflect;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        vReflect = reflect(-vViewDir, vNormal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    crystalFrag: `
      uniform vec3 uColor;
      uniform float uRefraction;
      uniform float uRainbow;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying vec3 vReflect;
      void main() {
        float fresnel = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), 3.0);
        vec3 refractColor = uColor * (1.0 - fresnel * 0.5);
        vec3 rainbow = vec3(
          sin(vReflect.x * 3.0 + 0.0) * 0.5 + 0.5,
          sin(vReflect.y * 3.0 + 2.094) * 0.5 + 0.5,
          sin(vReflect.z * 3.0 + 4.189) * 0.5 + 0.5
        );
        vec3 color = mix(refractColor, rainbow, uRainbow * fresnel);
        color += vec3(1.0) * pow(fresnel, 5.0) * 0.5;
        float sparkle = pow(max(dot(vReflect, vec3(0.577)), 0.0), 50.0);
        color += vec3(sparkle * 0.5);
        gl_FragColor = vec4(color, uOpacity + fresnel * 0.3);
      }
    `,

    // 🌿 풀/식물 셰이더 (바람에 흔들리는)
    grassVert: `
      uniform float uTime;
      uniform float uWindStrength;
      attribute float aRandom;
      varying vec2 vUv;
      varying float vHeight;
      void main() {
        vUv = uv;
        vec3 pos = position;
        vHeight = pos.y;
        float wind = sin(uTime * 2.0 + pos.x * 0.5 + aRandom * 6.28) * uWindStrength;
        wind *= pos.y;
        pos.x += wind;
        pos.z += wind * 0.3;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    grassFrag: `
      uniform vec3 uTipColor;
      uniform vec3 uBaseColor;
      uniform float uTime;
      varying vec2 vUv;
      varying float vHeight;
      void main() {
        vec3 color = mix(uBaseColor, uTipColor, vHeight);
        float light = 0.8 + sin(uTime + vUv.x * 10.0) * 0.1;
        gl_FragColor = vec4(color * light, 1.0);
      }
    `,

    // ✨ 마법진 셰이더
    magicCircleVert: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    magicCircleFrag: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uRings;
      uniform float uSymbols;
      varying vec2 vUv;

      float circle(vec2 uv, float r, float w) {
        float d = length(uv);
        return smoothstep(r + w, r, d) - smoothstep(r, r - w, d);
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float dist = length(uv);
        float angle = atan(uv.y, uv.x);

        float alpha = 0.0;

        // 동심원
        for (float i = 1.0; i <= 4.0; i++) {
          float r = i * 0.2;
          alpha += circle(uv, r, 0.008) * 0.8;
        }

        // 회전하는 기호
        float symbols = sin(angle * uSymbols + uTime * 2.0);
        symbols = step(0.7, symbols) * step(0.15, dist) * step(dist, 0.85);
        alpha += symbols * 0.6;

        // 외곽 링
        alpha += circle(uv, 0.9, 0.015);
        alpha += circle(uv, 0.92, 0.005);

        // 빛나는 효과
        float pulse = sin(uTime * 3.0) * 0.2 + 0.8;
        alpha *= pulse * uIntensity;

        // 방사형 선
        float rays = sin(angle * 12.0) * 0.5 + 0.5;
        rays *= smoothstep(0.3, 0.85, dist) * (1.0 - smoothstep(0.85, 0.9, dist));
        alpha += rays * 0.2;

        alpha *= 1.0 - smoothstep(0.85, 1.0, dist);

        vec3 color = uColor * (1.0 + alpha * 0.5);
        gl_FragColor = vec4(color, alpha * 0.8);
      }
    `,

    // 🌈 오로라/에너지 커튼 셰이더
    auroraVert: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.x += sin(pos.y * 3.0 + uTime) * 0.2;
        pos.z += cos(pos.y * 2.0 + uTime * 0.7) * 0.15;
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    auroraFrag: `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;
      void main() {
        float wave = sin(vUv.x * 8.0 + uTime) * 0.5 + 0.5;
        float wave2 = sin(vUv.x * 5.0 - uTime * 0.7) * 0.5 + 0.5;
        vec3 color = mix(uColor1, uColor2, wave);
        color = mix(color, uColor3, wave2 * 0.5);
        float alpha = sin(vUv.y * 3.14159) * (0.3 + wave * 0.2);
        alpha *= 0.6;
        gl_FragColor = vec4(color, alpha);
      }
    `
  },

  // ========== 재질 팩토리 ==========
  createWater(options = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveHeight: { value: options.waveHeight || 0.05 },
        uWaveSpeed: { value: options.waveSpeed || 1.5 },
        uShallowColor: { value: new THREE.Color(options.shallow || 0x44BBFF) },
        uDeepColor: { value: new THREE.Color(options.deep || 0x0044AA) },
        uOpacity: { value: options.opacity || 0.8 },
        uFoamThreshold: { value: options.foam || 0.06 }
      },
      vertexShader: this.SHADERS.waterVert,
      fragmentShader: this.SHADERS.waterFrag,
      transparent: true,
      side: THREE.DoubleSide
    });
  },

  createLava(options = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHotColor: { value: new THREE.Color(options.hot || 0xFF4400) },
        uCoolColor: { value: new THREE.Color(options.cool || 0x440000) }
      },
      vertexShader: this.SHADERS.lavaVert,
      fragmentShader: this.SHADERS.lavaFrag
    });
  },

  createCrystal(options = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(options.color || 0x88DDFF) },
        uRefraction: { value: options.refraction || 0.5 },
        uRainbow: { value: options.rainbow || 0.3 },
        uOpacity: { value: options.opacity || 0.7 }
      },
      vertexShader: this.SHADERS.crystalVert,
      fragmentShader: this.SHADERS.crystalFrag,
      transparent: true,
      side: THREE.DoubleSide
    });
  },

  createMagicCircle(options = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(options.color || 0x4488FF) },
        uIntensity: { value: options.intensity || 1.0 },
        uRings: { value: options.rings || 3 },
        uSymbols: { value: options.symbols || 6 }
      },
      vertexShader: this.SHADERS.magicCircleVert,
      fragmentShader: this.SHADERS.magicCircleFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  },

  createAurora(options = {}) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(options.color1 || 0x44FF88) },
        uColor2: { value: new THREE.Color(options.color2 || 0x4488FF) },
        uColor3: { value: new THREE.Color(options.color3 || 0xFF44AA) }
      },
      vertexShader: this.SHADERS.auroraVert,
      fragmentShader: this.SHADERS.auroraFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  },

  // ========== PBR 재질 프리셋 ==========
  createMetal(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      color: color || 0xCCCCCC,
      roughness: options.roughness || 0.15,
      metalness: options.metalness || 0.95,
      envMapIntensity: 1.5,
      emissive: options.emissive || 0x000000,
      emissiveIntensity: options.emissiveIntensity || 0
    });
  },

  createGem(color, options = {}) {
    return new THREE.MeshPhysicalMaterial({
      color: color || 0xFF0044,
      roughness: 0.05,
      metalness: 0.1,
      transmission: options.transmission || 0.6,
      thickness: options.thickness || 0.5,
      ior: options.ior || 2.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      emissive: color || 0xFF0044,
      emissiveIntensity: 0.1
    });
  },

  createFabric(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      color: color || 0x4444AA,
      roughness: options.roughness || 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
  },

  createLeather(color) {
    return new THREE.MeshStandardMaterial({
      color: color || 0x664422,
      roughness: 0.6,
      metalness: 0.05
    });
  },

  createWood(color) {
    return new THREE.MeshStandardMaterial({
      color: color || 0x886644,
      roughness: 0.75,
      metalness: 0.0
    });
  },

  createStone(color) {
    return new THREE.MeshStandardMaterial({
      color: color || 0x888888,
      roughness: 0.9,
      metalness: 0.05
    });
  },

  // ========== 분위기 시스템 ==========
  setAtmosphere(scene, paletteName, options = {}) {
    const palette = this.PALETTES[paletteName];
    if (!palette || !scene) return;

    // 안개
    scene.fog = new THREE.FogExp2(palette.fog, options.fogDensity || 0.03);

    // 환경광 업데이트
    scene.traverse(child => {
      if (child.isHemisphereLight) {
        child.color.setHex(palette.sky[1]);
        child.groundColor.setHex(palette.ground[0]);
      }
      if (child.isAmbientLight) {
        child.color.setHex(palette.ambient);
      }
    });

    return palette;
  },

  // ========== 셰이더 시간 업데이트 ==========
  update(time) {
    // scene.traverse로 모든 셰이더 재질의 uTime 업데이트
    if (typeof MonglelbelEngine !== 'undefined' && MonglelbelEngine && MonglelbelEngine.scene) {
      MonglelbelEngine.scene.traverse(child => {
        if (child.material && child.material.uniforms && child.material.uniforms.uTime) {
          child.material.uniforms.uTime.value = time;
        }
      });
    }
  },

  // ========== 3D→2D 스프라이트용 환경 렌더링 ==========
  renderEnvironmentSprite(type, options = {}) {
    const engine = (typeof MonglelbelEngine !== 'undefined') ? MonglelbelEngine : null;
    if (!engine || !engine.initSpriteRenderer) return null;

    // 임시 씬에 환경 오브젝트 생성
    const tempScene = new THREE.Scene();
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    tempScene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(3, 5, 3);
    tempScene.add(dirLight);

    let obj;
    if (typeof ArtEnvironment !== 'undefined') {
      switch (type) {
        case 'tree': obj = ArtEnvironment.createTree(options); break;
        case 'building': obj = ArtEnvironment.createBuilding(options); break;
        case 'prop': obj = ArtEnvironment.createProp(options.propType || 'rock', options); break;
        case 'terrain': obj = ArtEnvironment.createTerrain(options); break;
        default: return null;
      }
    }
    if (!obj) return null;

    tempScene.add(obj);

    // 스프라이트 렌더러로 2D 캡처
    engine.initSpriteRenderer(options.width || 128, options.height || 128);
    const w = options.width || 128;
    const h = options.height || 128;

    // 카메라 설정
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    const dist = options.cameraDistance || 3;
    camera.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
    camera.lookAt(0, (options.cameraY || 0.4), 0);

    engine._spriteRenderer.setSize(w, h);
    engine._spriteRenderer.render(tempScene, camera);

    // canvas 캡처
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(engine._spriteRenderer.domElement, 0, 0);

    // 정리
    tempScene.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });

    return canvas;
  },

  // 웹엔진 연동
  connectToEngine() {
    if (typeof MonglelbelEngine === 'undefined' || !MonglelbelEngine) {
      console.log('[ArtEngine] MonglelbelEngine 없음 — 독립 모드');
      return;
    }
    if (typeof MonglelbelEngine._addCallback === 'function') {
      MonglelbelEngine._addCallback(() => {
        this.update(Date.now() * 0.001);
      });
    }
    console.log('[ArtEngine] 코어 초기화 완료');
  }
};

if (typeof window !== 'undefined') window.ArtEngine = ArtEngine;
if (typeof module !== 'undefined') module.exports = ArtEngine;
