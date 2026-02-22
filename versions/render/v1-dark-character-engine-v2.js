// ============================================================
// 🎮 몽글벨 3D 캐릭터 엔진 v2.0 - AAA급 고퀄리티
// ============================================================
// Three.js + 고급 셰이더 + PBR + 툰셰이딩 + 블룸 이펙트
// 
// 필요한 CDN (index.html에 추가):
// <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
// <script src="js/render/character-engine-v2.js"></script>
//
// Claude Code: 이 파일을 js/render/character-engine-v2.js 에 넣으세요
// ============================================================

const MonglelbelEngine = {

  // ========== 시스템 ==========
  scene: null,
  camera: null,
  renderer: null,
  composer: null,
  clock: null,
  characters: new Map(),
  lights: {},
  _animCallbacks: [],
  _frameId: null,
  _spriteRenderer: null,
  _spriteScene: null,
  _spriteCamera: null,

  // ========== 커스텀 셰이더 ==========
  SHADERS: {

    // 🎨 커스텀 툰 셰이더 (애니메이션 스타일)
    toonVert: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    toonFrag: `
      uniform vec3 uColor;
      uniform vec3 uLightDir;
      uniform float uGloss;
      uniform float uRimPower;
      uniform vec3 uRimColor;
      uniform float uEmissive;
      uniform vec3 uEmissiveColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;

      void main() {
        // 3단계 툰 셰이딩 (커스텀 구현)
        float NdotL = dot(vNormal, uLightDir);
        float toon;
        if (NdotL > 0.6) toon = 1.0;
        else if (NdotL > 0.2) toon = 0.7;
        else if (NdotL > -0.1) toon = 0.45;
        else toon = 0.25;

        vec3 diffuse = uColor * toon;

        // 스페큘러 하이라이트 (광택)
        vec3 halfDir = normalize(uLightDir + vViewDir);
        float spec = pow(max(dot(vNormal, halfDir), 0.0), uGloss * 128.0);
        float specToon = step(0.5, spec) * 0.3;
        vec3 specular = vec3(1.0) * specToon;

        // 림 라이트 (윤곽 빛 - Fresnel 효과)
        float rim = 1.0 - max(dot(vViewDir, vNormal), 0.0);
        rim = pow(rim, uRimPower);
        vec3 rimColor = uRimColor * rim * 0.6;

        // 발광 (이미시브)
        vec3 emissive = uEmissiveColor * uEmissive;

        gl_FragColor = vec4(diffuse + specular + rimColor + emissive, 1.0);
      }
    `,

    // ✨ 글로우/블룸 셰이더
    glowVert: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    glowFrag: `
      uniform vec3 uGlowColor;
      uniform float uIntensity;
      uniform float uPulse;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float glow = pow(1.0 - max(dot(vViewDir, vNormal), 0.0), 2.0);
        float pulse = 1.0 + sin(uPulse) * 0.15;
        gl_FragColor = vec4(uGlowColor * glow * uIntensity * pulse, glow * 0.8);
      }
    `,

    // 🌊 에너지 필드 셰이더 (보스 오라용)
    energyVert: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vDisplacement;
      void main() {
        vUv = uv;
        float displacement = sin(position.x * 10.0 + uTime * 2.0) * 
                           sin(position.y * 10.0 + uTime * 1.5) * 
                           sin(position.z * 10.0 + uTime * 3.0) * 0.05;
        vDisplacement = displacement;
        vec3 newPos = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `,
    energyFrag: `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vDisplacement;
      void main() {
        float pattern = sin(vUv.x * 20.0 + uTime) * sin(vUv.y * 20.0 - uTime * 0.7);
        vec3 color = mix(uColor1, uColor2, pattern * 0.5 + 0.5);
        float alpha = (0.3 + abs(vDisplacement) * 4.0) * uOpacity;
        gl_FragColor = vec4(color, alpha);
      }
    `
  },

  // ========== 원소 팔레트 (확장) ==========
  PALETTES: {
    fire:    { main: 0xFF4422, sub: 0xFF8844, rim: 0xFFAA00, glow: 0xFF6600, emissive: 0xFF4400, skin: 0xFFCCAA },
    water:   { main: 0x2266FF, sub: 0x44AAFF, rim: 0x88CCFF, glow: 0x4488FF, emissive: 0x2244FF, skin: 0xBBDDFF },
    grass:   { main: 0x22AA44, sub: 0x66DD44, rim: 0xAAFF66, glow: 0x44CC22, emissive: 0x228822, skin: 0xCCFFCC },
    thunder: { main: 0xFFDD00, sub: 0xFFFF44, rim: 0xFFFF88, glow: 0xFFEE00, emissive: 0xFFCC00, skin: 0xFFFFDD },
    ice:     { main: 0x44BBFF, sub: 0xAADDFF, rim: 0xDDEEFF, glow: 0x66CCFF, emissive: 0x4499FF, skin: 0xEEF4FF },
    earth:   { main: 0x886644, sub: 0xAA8855, rim: 0xCCAA77, glow: 0x775533, emissive: 0x664422, skin: 0xDDCCAA },
    light:   { main: 0xFFDD44, sub: 0xFFEE88, rim: 0xFFFFCC, glow: 0xFFFF44, emissive: 0xFFDD00, skin: 0xFFF8DD },
    dark:    { main: 0x6622CC, sub: 0x8844DD, rim: 0xAA66FF, glow: 0x7733EE, emissive: 0x5500BB, skin: 0xDDCCEE }
  },

  // =============================================================
  // 🚀 초기화
  // =============================================================
  init(container, width, height, options = {}) {
    if (typeof THREE === 'undefined') {
      console.error('[MonglelbelEngine] Three.js가 필요합니다!');
      return false;
    }

    this.clock = new THREE.Clock();

    // 씬
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1e, 0.035);

    // 카메라
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    this.camera.position.set(0, 2.5, 5.5);
    this.camera.lookAt(0, 1.0, 0);

    // 렌더러 (고품질)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding || 3001;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping || 6;
    this.renderer.toneMappingExposure = 1.2;

    if (container) container.appendChild(this.renderer.domElement);

    // 조명 (고퀄리티 기본 씬)
    this._setupAdvancedLighting();

    // 환경 (스카이박스 + 바닥)
    this._createEnvironment();

    // 렌더 루프 시작
    this._startRenderLoop();

    console.log('[MonglelbelEngine] v2.0 초기화 완료 ✅');
    return true;
  },

  // =============================================================
  // 💡 고급 조명 시스템 (AAA급 스타일)
  // =============================================================
  _setupAdvancedLighting() {
    // 환경광 (하늘+바닥 2톤)
    const hemiLight = new THREE.HemisphereLight(0x6688cc, 0x223344, 0.6);
    this.scene.add(hemiLight);
    this.lights.hemi = hemiLight;

    // 메인 방향광 (Directional Light)
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 4096;
    sun.shadow.mapSize.height = 4096;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);
    this.lights.sun = sun;

    // 필 라이트 (그림자 부분 보완)
    const fill = new THREE.DirectionalLight(0x4466aa, 0.4);
    fill.position.set(-5, 3, -5);
    this.scene.add(fill);
    this.lights.fill = fill;

    // 림 라이트 (뒤에서 윤곽 강조)
    const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(0, 5, -8);
    this.scene.add(rim);
    this.lights.rim = rim;

    // 바닥 반사광
    const bounce = new THREE.PointLight(0x334455, 0.3, 8);
    bounce.position.set(0, 0.2, 0);
    this.scene.add(bounce);
  },

  // =============================================================
  // 🌍 환경 생성
  // =============================================================
  _createEnvironment() {
    // 하늘 그라데이션
    const skyGeo = new THREE.SphereGeometry(100, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(0x0a0a2e) },
        uBottomColor: { value: new THREE.Color(0x1a1a3e) },
        uStarDensity: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPos;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }
        
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 sky = mix(uBottomColor, uTopColor, max(h, 0.0));
          
          // 별
          vec2 grid = floor(vWorldPos.xz * 2.0);
          float star = step(0.98, random(grid));
          sky += vec3(star * 0.3) * step(0.3, h);
          
          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // 바닥 (반사 있는 원형 플랫폼)
    const groundGeo = new THREE.CylinderGeometry(4, 4.5, 0.15, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a3a,
      roughness: 0.3,
      metalness: 0.6
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.075;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 바닥 테두리 빛
    const ringGeo = new THREE.TorusGeometry(4.2, 0.03, 16, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);
  },

  // =============================================================
  // 🎨 고급 재질 생성
  // =============================================================

  // 툰 셰이더 재질
  _createToonMaterial(color, options = {}) {
    const c = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: c },
        uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
        uGloss: { value: options.gloss || 0.5 },
        uRimPower: { value: options.rimPower || 3.0 },
        uRimColor: { value: new THREE.Color(options.rimColor || 0x4488ff) },
        uEmissive: { value: options.emissive || 0.0 },
        uEmissiveColor: { value: new THREE.Color(options.emissiveColor || 0x000000) }
      },
      vertexShader: this.SHADERS.toonVert,
      fragmentShader: this.SHADERS.toonFrag
    });
  },

  // 글로우 재질
  _createGlowMaterial(color, intensity) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity || 1.0 },
        uPulse: { value: 0 }
      },
      vertexShader: this.SHADERS.glowVert,
      fragmentShader: this.SHADERS.glowFrag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false
    });
  },

  // 에너지 재질 (보스 오라)
  _createEnergyMaterial(color1, color2, opacity) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor1: { value: new THREE.Color(color1) },
        uColor2: { value: new THREE.Color(color2) },
        uTime: { value: 0 },
        uOpacity: { value: opacity || 0.4 }
      },
      vertexShader: this.SHADERS.energyVert,
      fragmentShader: this.SHADERS.energyFrag,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  },

  // 피부 재질 (서브서페이스 스캐터링 흉내)
  _createSkinMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.65,
      metalness: 0.05,
      // 서브서페이스 스캐터링 근사
      emissive: color,
      emissiveIntensity: 0.05
    });
  },

  // =============================================================
  // 🧊 부드러운 3D 모델링 (Subdivision 기법)
  // =============================================================

  // 부드러운 캡슐 (팔/다리용) - CapsuleGeometry 대신 직접 구현
  _createSmoothCapsule(radius, height, segments) {
    const group = new THREE.Group();
    // 실린더 + 양쪽 반구
    const cylGeo = new THREE.CylinderGeometry(radius, radius * 1.05, height, segments || 16);
    const cyl = new THREE.Mesh(cylGeo);
    group.add(cyl);

    const sphereGeo = new THREE.SphereGeometry(radius, segments || 16, segments || 16);
    const topSphere = new THREE.Mesh(sphereGeo);
    topSphere.position.y = height / 2;
    group.add(topSphere);

    const botSphere = new THREE.Mesh(sphereGeo.clone());
    botSphere.position.y = -height / 2;
    botSphere.scale.set(1.05, 1, 1.05);
    group.add(botSphere);

    // 합치기
    return this._mergeGroupToMesh(group);
  },

  // 부드러운 몸통 (Lathe 기법 - 곡선으로 회전체 생성)
  _createSmoothBody(waist, chest, height, segments) {
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // 부드러운 인체 곡선
      let radius;
      if (t < 0.1) radius = waist * 0.6; // 하단
      else if (t < 0.3) radius = waist + (chest - waist) * ((t - 0.1) / 0.2) * 0.3; // 허리→배
      else if (t < 0.5) radius = chest * 0.95; // 배
      else if (t < 0.7) radius = chest; // 가슴
      else if (t < 0.85) radius = chest * 0.85; // 어깨
      else radius = chest * 0.5 * (1 - (t - 0.85) / 0.15); // 목

      points.push(new THREE.Vector2(radius, t * height - height / 2));
    }
    return new THREE.LatheGeometry(points, segments || 24);
  },

  // 부드러운 머리 (완벽한 구 + 턱 변형)
  _createSmoothHead(radius) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    // 턱 부분 살짝 뾰족하게
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y < -radius * 0.3) {
        const factor = 1 - ((-y - radius * 0.3) / (radius * 0.7)) * 0.2;
        positions.setX(i, positions.getX(i) * factor);
        positions.setZ(i, positions.getZ(i) * factor);
      }
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  },

  _mergeGroupToMesh(group) {
    // 간단한 그룹 반환 (실제 merge는 복잡하므로 그룹으로)
    return group;
  },

  // =============================================================
  // ⚔️ 고퀄 영웅 생성
  // =============================================================
  createHero(options = {}) {
    const name = options.name || 'Hero_' + Date.now();
    const heroClass = options.class || 'warrior';
    const element = options.element || 'fire';
    const rarity = options.rarity || 'rare';
    const palette = this.PALETTES[element];

    const group = new THREE.Group();
    group.name = name;

    // 클래스별 체형 파라미터
    const bodyParams = this._getClassBodyParams(heroClass);

    // === 머리 ===
    const headGeo = this._createSmoothHead(0.22 * bodyParams.headSize);
    const headMat = this._createToonMaterial(palette.skin, {
      gloss: 0.4, rimColor: palette.rim, rimPower: 3.5
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.65 * bodyParams.height;
    head.castShadow = true;
    group.add(head);

    // 눈 (애니 스타일 큰 눈)
    this._addAnimeEyes(group, head.position.y, 0.22 * bodyParams.headSize, element);

    // 머리카락 (원소별 색상)
    const hair = this._createHair(heroClass, element, 0.22 * bodyParams.headSize);
    hair.position.y = head.position.y;
    group.add(hair);

    // === 몸통 ===
    const bodyGeo = this._createSmoothBody(
      0.18 * bodyParams.bulk,
      0.22 * bodyParams.bulk,
      0.55 * bodyParams.height,
      24
    );
    const armorMat = this._createToonMaterial(palette.main, {
      gloss: bodyParams.metallic ? 0.8 : 0.3,
      rimColor: palette.rim,
      rimPower: 2.5,
      emissive: rarity === 'mythic' ? 0.15 : rarity === 'legendary' ? 0.08 : 0,
      emissiveColor: palette.emissive
    });
    const body = new THREE.Mesh(bodyGeo, armorMat);
    body.position.y = 1.15 * bodyParams.height;
    body.castShadow = true;
    group.add(body);

    // === 팔 (좌/우) ===
    [-1, 1].forEach(side => {
      const armGroup = new THREE.Group();

      // 상완
      const upperArmGeo = new THREE.CylinderGeometry(0.055 * bodyParams.bulk, 0.06 * bodyParams.bulk, 0.25, 12);
      const upperArm = new THREE.Mesh(upperArmGeo, this._createToonMaterial(palette.sub, { rimColor: palette.rim }));
      upperArm.position.y = -0.12;
      armGroup.add(upperArm);

      // 하완
      const lowerArmGeo = new THREE.CylinderGeometry(0.04 * bodyParams.bulk, 0.055 * bodyParams.bulk, 0.25, 12);
      const lowerArm = new THREE.Mesh(lowerArmGeo, this._createToonMaterial(palette.skin, { rimColor: palette.rim }));
      lowerArm.position.y = -0.37;
      armGroup.add(lowerArm);

      // 손
      const handGeo = new THREE.SphereGeometry(0.045 * bodyParams.bulk, 12, 12);
      const hand = new THREE.Mesh(handGeo, this._createToonMaterial(palette.skin, { rimColor: palette.rim }));
      hand.position.y = -0.5;
      armGroup.add(hand);

      armGroup.position.set(side * (0.25 * bodyParams.bulk + 0.05), 1.38 * bodyParams.height, 0);
      armGroup.rotation.z = side * 0.12;
      armGroup.castShadow = true;
      group.add(armGroup);
    });

    // === 다리 (좌/우) ===
    [-1, 1].forEach(side => {
      const legGroup = new THREE.Group();

      // 허벅지
      const thighGeo = new THREE.CylinderGeometry(0.07 * bodyParams.bulk, 0.08 * bodyParams.bulk, 0.3, 12);
      const thigh = new THREE.Mesh(thighGeo, this._createToonMaterial(palette.sub, { rimColor: palette.rim }));
      thigh.position.y = -0.15;
      legGroup.add(thigh);

      // 종아리
      const shinGeo = new THREE.CylinderGeometry(0.05 * bodyParams.bulk, 0.07 * bodyParams.bulk, 0.3, 12);
      const shin = new THREE.Mesh(shinGeo, this._createToonMaterial(palette.sub, { rimColor: palette.rim }));
      shin.position.y = -0.45;
      legGroup.add(shin);

      // 부츠
      const bootGeo = new THREE.BoxGeometry(0.09 * bodyParams.bulk, 0.06, 0.14 * bodyParams.bulk);
      const boot = new THREE.Mesh(bootGeo, this._createToonMaterial(palette.main, { gloss: 0.6, rimColor: palette.rim }));
      boot.position.set(0, -0.62, 0.02);
      legGroup.add(boot);

      legGroup.position.set(side * 0.09, 0.85 * bodyParams.height, 0);
      legGroup.castShadow = true;
      group.add(legGroup);
    });

    // === 무기 ===
    const weapon = this._createAdvancedWeapon(heroClass, palette, rarity);
    group.add(weapon);

    // === 원소 오라 ===
    const aura = this._createAdvancedAura(palette, rarity);
    group.add(aura);

    // === 등급 이펙트 ===
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
      const particles = this._createParticleEffect(palette, rarity);
      group.add(particles);
    }

    // === 그림자 ===
    group.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    // 씬 추가 (3D 뷰어가 있을 때만 — 스프라이트 전용일 땐 스킵)
    if (this.scene) {
      this.scene.add(group);
      this.characters.set(name, { group, type: 'hero', class: heroClass, element, rarity });
      this._addSmoothBreathing(group);
    }

    return this._createCharacterAPI(name, group, 'hero');
  },

  // =============================================================
  // 🧚 고퀄 정령 생성
  // =============================================================
  createSpirit(options = {}) {
    const name = options.name || 'Spirit_' + Date.now();
    const element = options.element || 'fire';
    const rarity = options.rarity || 'rare';
    const palette = this.PALETTES[element];

    const group = new THREE.Group();
    group.name = name;

    // 코어 (발광 구체 - 셰이더 적용)
    const coreGeo = new THREE.SphereGeometry(0.3, 48, 48);
    const coreMat = this._createToonMaterial(palette.main, {
      gloss: 0.9, rimColor: palette.rim, rimPower: 2.0,
      emissive: 0.4, emissiveColor: palette.glow
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.5;
    group.add(core);

    // 외부 글로우
    const glowGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const glowMat = this._createGlowMaterial(palette.glow, 1.2);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 1.5;
    group.add(glow);

    // 눈 (귀여운 스타일)
    const eyeGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 1.0 });
    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1, 1.55, 0.25);
      group.add(eye);
    });

    // 날개 (에너지 날개)
    [-1, 1].forEach(side => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.quadraticCurveTo(side * 0.3, 0.4, side * 0.15, 0.6);
      wingShape.quadraticCurveTo(side * 0.05, 0.3, 0, 0);

      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const wingMat = this._createGlowMaterial(palette.glow, 0.8);
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 0.2, 1.4, -0.1);
      wing.rotation.y = side * 0.3;
      group.add(wing);
    });

    // 파티클 링
    const ringGeo = new THREE.TorusGeometry(0.5, 0.01, 8, 64);
    const ringMat = this._createGlowMaterial(palette.glow, 0.5);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 1.5;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // 포인트 라이트
    const light = new THREE.PointLight(palette.glow, 0.8, 4);
    light.position.y = 1.5;
    group.add(light);

    group.traverse(child => { if (child.isMesh) child.castShadow = true; });
    if (this.scene) {
      this.scene.add(group);
      this.characters.set(name, { group, type: 'spirit', element, rarity });
      this._addFloatAndSpin(group, core, glow, ring);
    }

    return this._createCharacterAPI(name, group, 'spirit');
  },

  // =============================================================
  // 👾 고퀄 몬스터 생성
  // =============================================================
  createMonster(options = {}) {
    const name = options.name || 'Monster_' + Date.now();
    const monsterType = options.monsterType || 'slime';
    const element = options.element || 'earth';
    const stage = options.stage || 1;
    const palette = this.PALETTES[element];
    const scale = 1 + stage * 0.015;

    const group = new THREE.Group();
    group.name = name;

    const mat = this._createToonMaterial(palette.main, {
      gloss: 0.4, rimColor: palette.rim, rimPower: 2.5
    });

    switch (monsterType) {
      case 'slime':
        this._buildSlime(group, palette, scale);
        break;
      case 'goblin':
      case 'orc':
      case 'skeleton':
      case 'darkelf':
      case 'vampire':
        this._buildHumanoid(group, palette, scale, monsterType);
        break;
      case 'spider':
        this._buildSpider(group, palette, scale);
        break;
      case 'golem':
        this._buildGolem(group, palette, scale);
        break;
      case 'dragonkin':
        this._buildDragon(group, palette, scale);
        break;
      case 'shadow':
        this._buildGhost(group, palette, scale);
        break;
      default:
        this._buildSlime(group, palette, scale);
    }

    group.traverse(child => { if (child.isMesh) child.castShadow = true; });
    if (this.scene) {
      this.scene.add(group);
      this.characters.set(name, { group, type: 'monster', monsterType, element, stage });
      this._addSmoothBreathing(group);
    }

    return this._createCharacterAPI(name, group, 'monster');
  },

  // --- 슬라임 (젤리 느낌) ---
  _buildSlime(group, palette, scale) {
    // 젤리 몸체 (변형된 구)
    const geo = new THREE.SphereGeometry(0.5 * scale, 32, 32);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y < 0) {
        // 아래쪽 납작하게
        positions.setY(i, y * 0.4);
        const squish = 1 + (0 - y) * 0.5;
        positions.setX(i, positions.getX(i) * squish);
        positions.setZ(i, positions.getZ(i) * squish);
      }
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = this._createToonMaterial(palette.main, {
      gloss: 0.9, rimColor: palette.rim, rimPower: 2.0,
      emissive: 0.1, emissiveColor: palette.glow
    });
    const body = new THREE.Mesh(geo, mat);
    body.position.y = 0.35 * scale;
    group.add(body);

    // 반투명 오버레이 (젤리 느낌)
    const overlayGeo = new THREE.SphereGeometry(0.52 * scale, 32, 32);
    const overlayMat = new THREE.MeshStandardMaterial({
      color: palette.sub,
      transparent: true,
      opacity: 0.15,
      roughness: 0.1,
      metalness: 0.3
    });
    const overlay = new THREE.Mesh(overlayGeo, overlayMat);
    overlay.position.copy(body.position);
    overlay.scale.y = 0.7;
    overlay.scale.x = 1.15;
    overlay.scale.z = 1.15;
    group.add(overlay);

    // 눈 (귀여운 스타일)
    this._addCuteEyes(group, 0.45 * scale, 0.35 * scale);

    // 슬라임 특유의 통통 튀는 애니메이션
    this._addBounceAnimation(group, body);
  },

  // --- 고퀄 인간형 ---
  _buildHumanoid(group, palette, scale, type) {
    const bulkMap = { goblin: 0.7, orc: 1.4, skeleton: 0.8, darkelf: 0.85, vampire: 0.9 };
    const heightMap = { goblin: 0.7, orc: 1.2, skeleton: 1.1, darkelf: 1.15, vampire: 1.15 };
    const bulk = (bulkMap[type] || 1.0) * scale;
    const h = (heightMap[type] || 1.0) * scale;

    const skinColor = type === 'skeleton' ? 0xDDDDBB : type === 'orc' ? 0x668844 : palette.skin;
    const armorColor = palette.main;

    // 몸통
    const bodyGeo = this._createSmoothBody(0.16 * bulk, 0.2 * bulk, 0.5 * h, 20);
    const bodyMat = this._createToonMaterial(armorColor, { gloss: 0.5, rimColor: palette.rim });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1 * h;
    group.add(body);

    // 머리
    const headGeo = this._createSmoothHead(0.17 * bulk);
    const headMat = this._createToonMaterial(skinColor, { gloss: 0.3, rimColor: palette.rim });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55 * h;
    group.add(head);

    // 눈
    this._addMonsterEyes(group, 1.58 * h, 0.15 * bulk, type);

    // 팔
    [-1, 1].forEach(side => {
      const armGeo = new THREE.CylinderGeometry(0.04 * bulk, 0.05 * bulk, 0.4 * h, 10);
      const arm = new THREE.Mesh(armGeo, this._createToonMaterial(skinColor, { rimColor: palette.rim }));
      arm.position.set(side * 0.25 * bulk, 1.05 * h, 0);
      arm.rotation.z = side * 0.15;
      group.add(arm);
    });

    // 다리
    [-1, 1].forEach(side => {
      const legGeo = new THREE.CylinderGeometry(0.05 * bulk, 0.06 * bulk, 0.45 * h, 10);
      const leg = new THREE.Mesh(legGeo, this._createToonMaterial(armorColor, { rimColor: palette.rim }));
      leg.position.set(side * 0.1, 0.5 * h, 0);
      group.add(leg);
    });
  },

  // --- 고퀄 골렘 ---
  _buildGolem(group, palette, scale) {
    const mat = this._createToonMaterial(palette.main, { gloss: 0.2, rimColor: palette.rim, rimPower: 4.0 });

    // 큰 몸통 (바위 느낌)
    const bodyGeo = new THREE.DodecahedronGeometry(0.5 * scale, 1);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 1.0 * scale;
    group.add(body);

    // 머리 (작은 바위)
    const headGeo = new THREE.DodecahedronGeometry(0.2 * scale, 1);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.65 * scale;
    group.add(head);

    // 눈 (빛나는)
    [-1, 1].forEach(side => {
      const eyeGeo = new THREE.SphereGeometry(0.04 * scale, 12, 12);
      const eyeMat = this._createGlowMaterial(palette.glow, 2.0);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1 * scale, 1.7 * scale, 0.17 * scale);
      group.add(eye);
    });

    // 팔 (큰 바위)
    [-1, 1].forEach(side => {
      const armGeo = new THREE.DodecahedronGeometry(0.18 * scale, 0);
      const arm = new THREE.Mesh(armGeo, mat);
      arm.position.set(side * 0.6 * scale, 0.9 * scale, 0);
      group.add(arm);
    });

    // 다리
    [-1, 1].forEach(side => {
      const legGeo = new THREE.CylinderGeometry(0.12 * scale, 0.15 * scale, 0.4 * scale, 8);
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(side * 0.2 * scale, 0.35 * scale, 0);
      group.add(leg);
    });

    // 균열 빛 이펙트
    const crackLight = new THREE.PointLight(palette.glow, 0.6, 3);
    crackLight.position.y = 1.0 * scale;
    group.add(crackLight);
  },

  // --- 고퀄 드래곤 ---
  _buildDragon(group, palette, scale) {
    const mat = this._createToonMaterial(palette.main, {
      gloss: 0.6, rimColor: palette.rim, rimPower: 2.5,
      emissive: 0.05, emissiveColor: palette.emissive
    });

    // 몸통
    const bodyGeo = new THREE.CylinderGeometry(0.25 * scale, 0.3 * scale, 0.7 * scale, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 1.2 * scale;
    group.add(body);

    // 머리 (드래곤 머리 - 앞으로 뾰족)
    const headGeo = new THREE.ConeGeometry(0.18 * scale, 0.4 * scale, 12);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 1.75 * scale, 0.15 * scale);
    head.rotation.x = -0.6;
    group.add(head);

    // 뿔
    const hornMat = this._createToonMaterial(0xFFEECC, { gloss: 0.7 });
    [-1, 1].forEach(side => {
      const hornGeo = new THREE.ConeGeometry(0.03 * scale, 0.25 * scale, 8);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(side * 0.12 * scale, 1.9 * scale, -0.05 * scale);
      horn.rotation.z = side * 0.25;
      group.add(horn);
    });

    // 눈 (빛나는 드래곤 눈)
    [-1, 1].forEach(side => {
      const eyeGeo = new THREE.SphereGeometry(0.035 * scale, 12, 12);
      const eyeMat = this._createGlowMaterial(palette.glow, 1.5);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1 * scale, 1.8 * scale, 0.25 * scale);
      group.add(eye);
    });

    // 날개 (에너지 날개)
    [-1, 1].forEach(side => {
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(side * 0.6 * scale, 0.3 * scale);
      wingShape.lineTo(side * 0.8 * scale, 0.6 * scale);
      wingShape.lineTo(side * 0.4 * scale, 0.4 * scale);
      wingShape.lineTo(0, 0.1);

      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const wingMat = new THREE.MeshStandardMaterial({
        color: palette.sub,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        emissive: palette.glow,
        emissiveIntensity: 0.2
      });
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 1.3 * scale, -0.2 * scale);
      group.add(wing);
    });

    // 꼬리
    const tailGeo = new THREE.ConeGeometry(0.08 * scale, 0.6 * scale, 8);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.8 * scale, -0.4 * scale);
    tail.rotation.x = 1.0;
    group.add(tail);

    // 브레스 파티클 라이트
    const breathLight = new THREE.PointLight(palette.glow, 0.4, 3);
    breathLight.position.set(0, 1.7 * scale, 0.4 * scale);
    group.add(breathLight);
  },

  // --- 고퀄 유령 ---
  _buildGhost(group, palette, scale) {
    const mat = this._createToonMaterial(palette.main, {
      gloss: 0.1, rimColor: palette.rim, rimPower: 1.5,
      emissive: 0.3, emissiveColor: palette.glow
    });

    // 유령 몸체 (위는 둥글고 아래는 흘러내리는 형태)
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      let radius;
      if (t < 0.5) radius = 0.3 * scale * Math.sin(t * Math.PI);
      else radius = 0.3 * scale * Math.sin(t * Math.PI) * (1 + (t - 0.5) * 0.8);
      points.push(new THREE.Vector2(radius, (1 - t) * 1.2 * scale));
    }
    const bodyGeo = new THREE.LatheGeometry(points, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: palette.main,
      transparent: true,
      opacity: 0.6,
      emissive: palette.glow,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5 * scale;
    group.add(body);

    // 빛나는 눈
    [-1, 1].forEach(side => {
      const eyeGeo = new THREE.SphereGeometry(0.05 * scale, 12, 12);
      const eyeMat = this._createGlowMaterial(0xFF0000, 2.0);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * 0.1 * scale, 1.0 * scale, 0.2 * scale);
      group.add(eye);
    });

    // 유령 오라
    const auraGeo = new THREE.SphereGeometry(0.6 * scale, 24, 24);
    const auraMat = this._createGlowMaterial(palette.glow, 0.5);
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 0.9 * scale;
    group.add(aura);

    this._addFloatAndSpin(group, body, aura, null);
  },

  // --- 고퀄 거미 ---
  _buildSpider(group, palette, scale) {
    const mat = this._createToonMaterial(palette.main, { gloss: 0.5, rimColor: palette.rim });

    // 복부
    const abdomenGeo = new THREE.SphereGeometry(0.35 * scale, 24, 24);
    const abdomen = new THREE.Mesh(abdomenGeo, mat);
    abdomen.position.set(0, 0.4 * scale, -0.25 * scale);
    abdomen.scale.z = 1.4;
    group.add(abdomen);

    // 두흉부
    const thoraxGeo = new THREE.SphereGeometry(0.2 * scale, 24, 24);
    const thorax = new THREE.Mesh(thoraxGeo, mat);
    thorax.position.set(0, 0.35 * scale, 0.15 * scale);
    group.add(thorax);

    // 8다리 (관절 있는)
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const angle = (idx / 4) * Math.PI * 0.6 - Math.PI * 0.15;

      const legGroup = new THREE.Group();

      // 상단 관절
      const upperGeo = new THREE.CylinderGeometry(0.015 * scale, 0.02 * scale, 0.3 * scale, 6);
      const upper = new THREE.Mesh(upperGeo, mat);
      upper.rotation.z = side * 0.8;
      upper.position.y = 0.1;
      legGroup.add(upper);

      // 하단 관절
      const lowerGeo = new THREE.CylinderGeometry(0.01 * scale, 0.015 * scale, 0.25 * scale, 6);
      const lower = new THREE.Mesh(lowerGeo, mat);
      lower.rotation.z = side * 1.2;
      lower.position.set(side * 0.2, -0.05, 0);
      legGroup.add(lower);

      legGroup.position.set(
        side * 0.15 * scale,
        0.35 * scale,
        (idx - 1.5) * 0.12 * scale
      );
      group.add(legGroup);
    }

    // 눈 (6개, 빛나는)
    for (let i = 0; i < 6; i++) {
      const col = (i % 3) - 1;
      const row = Math.floor(i / 3);
      const eyeGeo = new THREE.SphereGeometry(0.025 * scale, 10, 10);
      const eyeMat = this._createGlowMaterial(0xFF0000, 1.5);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(col * 0.06 * scale, 0.4 * scale + row * 0.04, 0.32 * scale);
      group.add(eye);
    }
  },

  // =============================================================
  // 👁️ 눈 스타일
  // =============================================================
  _addAnimeEyes(group, yPos, headRadius, element) {
    const palette = this.PALETTES[element];

    [-1, 1].forEach(side => {
      // 흰자
      const whiteGeo = new THREE.SphereGeometry(headRadius * 0.18, 16, 16);
      whiteGeo.scale(1, 1.2, 0.5);
      const white = new THREE.Mesh(whiteGeo, new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
      white.position.set(side * headRadius * 0.38, yPos + headRadius * 0.05, headRadius * 0.85);
      group.add(white);

      // 홍채 (원소 색상)
      const irisGeo = new THREE.SphereGeometry(headRadius * 0.12, 16, 16);
      const irisMat = new THREE.MeshStandardMaterial({
        color: palette.main,
        emissive: palette.glow,
        emissiveIntensity: 0.3
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(side * headRadius * 0.38, yPos + headRadius * 0.05, headRadius * 0.95);
      group.add(iris);

      // 동공
      const pupilGeo = new THREE.SphereGeometry(headRadius * 0.06, 12, 12);
      const pupil = new THREE.Mesh(pupilGeo, new THREE.MeshStandardMaterial({ color: 0x111111 }));
      pupil.position.set(side * headRadius * 0.38, yPos + headRadius * 0.05, headRadius * 1.0);
      group.add(pupil);

      // 하이라이트
      const hlGeo = new THREE.SphereGeometry(headRadius * 0.04, 8, 8);
      const hlMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 1.0 });
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(side * headRadius * 0.35, yPos + headRadius * 0.1, headRadius * 1.02);
      group.add(hl);
    });
  },

  _addCuteEyes(group, yOffset, size) {
    [-1, 1].forEach(side => {
      const eyeGeo = new THREE.SphereGeometry(size * 0.15, 16, 16);
      eyeGeo.scale(1, 1.3, 0.6);
      const eye = new THREE.Mesh(eyeGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
      eye.position.set(side * size * 0.5, yOffset, size * 0.85);
      group.add(eye);

      // 하이라이트
      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.06, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 1.0 })
      );
      hl.position.set(side * size * 0.45, yOffset + size * 0.06, size * 0.92);
      group.add(hl);
    });
  },

  _addMonsterEyes(group, yPos, size, type) {
    const eyeColor = type === 'skeleton' ? 0xFF4400 : type === 'vampire' ? 0xFF0000 : 0xFFFF00;
    [-1, 1].forEach(side => {
      const eyeGeo = new THREE.SphereGeometry(size * 0.2, 12, 12);
      const eyeMat = this._createGlowMaterial(eyeColor, 1.2);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * size * 0.55, yPos, size * 0.85);
      group.add(eye);
    });
  },

  // =============================================================
  // 💇 머리카락
  // =============================================================
  _createHair(heroClass, element, headRadius) {
    const palette = this.PALETTES[element];
    const group = new THREE.Group();
    const hairMat = this._createToonMaterial(palette.sub, { gloss: 0.6, rimColor: palette.rim });

    // 기본 머리카락 덮개
    const baseGeo = new THREE.SphereGeometry(headRadius * 1.08, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const base = new THREE.Mesh(baseGeo, hairMat);
    base.position.y = headRadius * 0.05;
    group.add(base);

    // 뒤쪽 머리카락 (길이는 클래스별)
    if (['mage', 'summoner', 'cleric'].includes(heroClass)) {
      // 긴 머리
      const longGeo = new THREE.CylinderGeometry(headRadius * 0.3, headRadius * 0.1, headRadius * 1.5, 12);
      const longHair = new THREE.Mesh(longGeo, hairMat);
      longHair.position.set(0, -headRadius * 0.5, -headRadius * 0.3);
      group.add(longHair);
    }

    // 앞머리
    for (let i = -2; i <= 2; i++) {
      const bangGeo = new THREE.CylinderGeometry(headRadius * 0.04, headRadius * 0.02, headRadius * 0.3, 6);
      const bang = new THREE.Mesh(bangGeo, hairMat);
      bang.position.set(i * headRadius * 0.15, -headRadius * 0.1, headRadius * 0.8);
      bang.rotation.x = 0.3;
      bang.rotation.z = i * 0.1;
      group.add(bang);
    }

    return group;
  },

  // =============================================================
  // 🗡️ 고급 무기
  // =============================================================
  _createAdvancedWeapon(heroClass, palette, rarity) {
    const group = new THREE.Group();
    const metalMat = this._createToonMaterial(0xCCCCCC, { gloss: 0.9, rimColor: palette.rim });
    const handleMat = this._createToonMaterial(0x553311, { gloss: 0.3 });
    const isLegendary = ['legendary', 'mythic'].includes(rarity);

    switch (heroClass) {
      case 'warrior': {
        // 검 (발광 효과 포함)
        const bladeGeo = new THREE.BoxGeometry(0.04, 0.7, 0.015);
        const bladeMat = isLegendary ?
          this._createToonMaterial(palette.main, { gloss: 0.95, emissive: 0.3, emissiveColor: palette.glow, rimColor: palette.rim }) :
          metalMat;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.15, 8), handleMat);
        handle.position.y = -0.42;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.03), metalMat);
        guard.position.y = -0.35;
        group.add(blade, handle, guard);

        if (isLegendary) {
          const glowGeo = new THREE.BoxGeometry(0.06, 0.72, 0.03);
          const glow = new THREE.Mesh(glowGeo, this._createGlowMaterial(palette.glow, 0.6));
          group.add(glow);
        }
        group.position.set(0.35, 1.0, 0.1);
        break;
      }
      case 'mage':
      case 'summoner': {
        // 지팡이 + 빛나는 오브
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.3, 8), handleMat);
        const orbGeo = new THREE.SphereGeometry(0.08, 24, 24);
        const orbMat = this._createToonMaterial(palette.main, {
          gloss: 0.95, emissive: 0.5, emissiveColor: palette.glow, rimColor: palette.rim
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        orb.position.y = 0.7;

        const orbGlow = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 24, 24),
          this._createGlowMaterial(palette.glow, 1.0)
        );
        orbGlow.position.y = 0.7;

        const light = new THREE.PointLight(palette.glow, 0.5, 3);
        light.position.y = 0.7;

        group.add(staff, orb, orbGlow, light);
        group.position.set(0.3, 0.8, 0.05);
        break;
      }
      case 'archer': {
        // 활
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, -0.4, 0),
          new THREE.Vector3(0.2, 0, 0),
          new THREE.Vector3(0, 0.4, 0)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.012, 8, false);
        const bow = new THREE.Mesh(tubeGeo, handleMat);
        group.add(bow);

        // 시위
        const stringGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.8, 4);
        const stringMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
        const string = new THREE.Mesh(stringGeo, stringMat);
        group.add(string);

        group.position.set(-0.4, 1.1, 0.1);
        break;
      }
      case 'knight': {
        // 대검
        const bigBlade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.02),
          isLegendary ? this._createToonMaterial(palette.main, { gloss: 0.95, emissive: 0.2, emissiveColor: palette.glow }) : metalMat);
        const bigHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.2, 8), handleMat);
        bigHandle.position.y = -0.55;
        const bigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.04), metalMat);
        bigGuard.position.y = -0.45;
        group.add(bigBlade, bigHandle, bigGuard);
        group.position.set(0.4, 1.0, 0.1);
        break;
      }
      default: {
        const defaultWeapon = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), metalMat);
        group.add(defaultWeapon);
        group.position.set(0.3, 1.0, 0.1);
      }
    }

    return group;
  },

  // =============================================================
  // ✨ 고급 오라/이펙트
  // =============================================================
  _createAdvancedAura(palette, rarity) {
    const group = new THREE.Group();
    const intensityMap = { common: 0, uncommon: 0.1, rare: 0.3, epic: 0.5, legendary: 0.8, mythic: 1.2 };
    const intensity = intensityMap[rarity] || 0;
    if (intensity === 0) return group;

    // 내부 오라
    const innerGeo = new THREE.SphereGeometry(0.8 + intensity * 0.3, 32, 32);
    const innerMat = this._createGlowMaterial(palette.glow, intensity * 0.4);
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.y = 1.0;
    group.add(inner);

    // 바닥 원 (magic circle 느낌)
    if (['epic', 'legendary', 'mythic'].includes(rarity)) {
      const circleGeo = new THREE.RingGeometry(0.8, 1.2 + intensity * 0.3, 64);
      const circleMat = this._createGlowMaterial(palette.glow, intensity * 0.3);
      const circle = new THREE.Mesh(circleMat instanceof THREE.ShaderMaterial ? circleGeo : circleGeo, circleMat);
      circle.rotation.x = -Math.PI / 2;
      circle.position.y = 0.02;
      group.add(circle);

      // 마법진 회전 애니메이션
      this._addCallback(() => { circle.rotation.z += 0.005; });
    }

    return group;
  },

  _createParticleEffect(palette, rarity) {
    const group = new THREE.Group();
    const count = rarity === 'mythic' ? 30 : rarity === 'legendary' ? 20 : 10;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 8, 8);
      const mat = this._createGlowMaterial(palette.glow, 1.0 + Math.random());
      const particle = new THREE.Mesh(geo, mat);

      const angle = (i / count) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.5;
      const speed = 0.01 + Math.random() * 0.02;
      const yOffset = Math.random() * 2;

      particle.position.set(Math.cos(angle) * radius, yOffset, Math.sin(angle) * radius);
      group.add(particle);

      // 파티클 애니메이션
      this._addCallback(() => {
        const t = Date.now() * speed;
        particle.position.x = Math.cos(t + angle) * radius;
        particle.position.z = Math.sin(t + angle) * radius;
        particle.position.y = yOffset + Math.sin(t * 2) * 0.2;
      });
    }

    return group;
  },

  // =============================================================
  // 🎬 애니메이션
  // =============================================================
  _addSmoothBreathing(group) {
    const baseY = group.position.y;
    this._addCallback(() => {
      if (!group.parent) return;
      const t = Date.now() * 0.0015;
      group.position.y = baseY + Math.sin(t) * 0.02;
      // 미세한 좌우 흔들림
      group.rotation.y = Math.sin(t * 0.5) * 0.015;
    });
  },

  _addFloatAndSpin(group, core, glow, ring) {
    const baseY = core ? core.position.y : 1.5;
    this._addCallback(() => {
      if (!group.parent) return;
      const t = Date.now() * 0.002;
      if (core) core.position.y = baseY + Math.sin(t) * 0.12;
      if (glow) {
        glow.position.y = (core ? core.position.y : baseY + Math.sin(t) * 0.12);
        glow.material.uniforms.uPulse.value = t;
      }
      if (ring) {
        ring.position.y = core ? core.position.y : baseY;
        ring.rotation.z += 0.01;
      }
    });
  },

  _addBounceAnimation(group, body) {
    this._addCallback(() => {
      if (!group.parent) return;
      const t = Date.now() * 0.003;
      const bounce = Math.abs(Math.sin(t)) * 0.08;
      const squish = 1 - bounce * 0.3;
      body.scale.set(1 + bounce * 0.2, squish, 1 + bounce * 0.2);
      body.position.y = 0.35 + bounce;
    });
  },

  // =============================================================
  // 📦 유틸리티
  // =============================================================
  _getClassBodyParams(heroClass) {
    const params = {
      warrior:   { bulk: 1.3, height: 1.0, headSize: 0.95, metallic: true },
      mage:      { bulk: 0.85, height: 1.05, headSize: 1.05, metallic: false },
      archer:    { bulk: 0.9, height: 1.08, headSize: 1.0, metallic: false },
      cleric:    { bulk: 1.0, height: 1.0, headSize: 1.0, metallic: false },
      rogue:     { bulk: 0.85, height: 1.03, headSize: 0.95, metallic: false },
      knight:    { bulk: 1.5, height: 1.0, headSize: 0.9, metallic: true },
      summoner:  { bulk: 0.8, height: 1.0, headSize: 1.1, metallic: false },
      alchemist: { bulk: 0.9, height: 1.0, headSize: 1.0, metallic: false }
    };
    return params[heroClass] || params.warrior;
  },

  _addCallback(fn) {
    this._animCallbacks.push(fn);
  },

  _createCharacterAPI(name, group, type) {
    return {
      name,
      model: group,
      type,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      setRotation: (y) => group.rotation.y = y,
      setScale: (s) => group.scale.setScalar(s),
      remove: () => {
        if (this.scene) this.scene.remove(group);
        if (group.parent) group.parent.remove(group);
        this.characters.delete(name);
      },
      playAttack: () => this._animAttack(group),
      playHit: () => this._animHit(group),
      playDeath: () => this._animDeath(group)
    };
  },

  _animAttack(group) {
    const startZ = group.position.z;
    let progress = 0;
    const animate = () => {
      progress += 0.04;
      if (progress >= 1) { group.position.z = startZ; return; }
      group.position.z = startZ - Math.sin(progress * Math.PI) * 0.4;
      requestAnimationFrame(animate);
    };
    animate();
  },

  _animHit(group) {
    group.traverse(child => {
      if (child.material && child.material.uniforms && child.material.uniforms.uEmissive) {
        child.material.uniforms.uEmissive.value = 0.8;
        setTimeout(() => { child.material.uniforms.uEmissive.value = 0; }, 150);
      }
    });
    // 흔들림
    let shake = 0;
    const baseX = group.position.x;
    const animate = () => {
      shake++;
      if (shake > 10) { group.position.x = baseX; return; }
      group.position.x = baseX + (Math.random() - 0.5) * 0.05;
      requestAnimationFrame(animate);
    };
    animate();
  },

  _animDeath(group) {
    let progress = 0;
    const animate = () => {
      progress += 0.015;
      if (progress >= 1) { group.visible = false; return; }
      group.scale.setScalar(1 - progress * 0.5);
      group.position.y = -progress * 0.3;
      group.traverse(child => {
        if (child.material) {
          if (child.material.opacity !== undefined) child.material.opacity = 1 - progress;
          if (child.material.transparent !== undefined) child.material.transparent = true;
        }
      });
      requestAnimationFrame(animate);
    };
    animate();
  },

  // =============================================================
  // 🔄 렌더 루프
  // =============================================================
  _startRenderLoop() {
    const loop = () => {
      this._frameId = requestAnimationFrame(loop);

      // 모든 애니메이션 콜백 실행
      for (const cb of this._animCallbacks) {
        try { cb(); } catch (e) { /* skip */ }
      }

      // 글로우 셰이더 시간 업데이트
      this.scene.traverse(child => {
        if (child.material && child.material.uniforms) {
          if (child.material.uniforms.uTime) {
            child.material.uniforms.uTime.value = Date.now() * 0.001;
          }
          if (child.material.uniforms.uPulse) {
            child.material.uniforms.uPulse.value = Date.now() * 0.002;
          }
        }
      });

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  },

  // 카메라 회전 (캐릭터 감상용)
  enableOrbitCamera() {
    let angle = 0;
    this._addCallback(() => {
      angle += 0.003;
      this.camera.position.x = Math.sin(angle) * 5.5;
      this.camera.position.z = Math.cos(angle) * 5.5;
      this.camera.lookAt(0, 1.0, 0);
    });
  },

  // =============================================================
  // 📸 3D → 2D 스프라이트 렌더러 (3D기반 2D 게임용)
  // =============================================================
  // 오프스크린 WebGL 렌더러로 3D 모델을 2D 캔버스에 렌더링
  // init() 없이도 사용 가능 (메인 씬 불필요)
  initSpriteRenderer(width, height) {
    if (typeof THREE === 'undefined') return false;
    const w = width || 256;
    const h = height || 256;

    this._spriteRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this._spriteRenderer.setSize(w, h);
    this._spriteRenderer.setPixelRatio(1);
    if (THREE.sRGBEncoding) this._spriteRenderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) {
      this._spriteRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this._spriteRenderer.toneMappingExposure = 1.1;
    }
    this._spriteRenderer.shadowMap.enabled = true;

    // 스프라이트 전용 씬 (고품질 조명)
    this._spriteScene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0x8899bb, 0x334455, 0.7);
    this._spriteScene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.3);
    sun.position.set(3, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    this._spriteScene.add(sun);

    const fill = new THREE.DirectionalLight(0x4466aa, 0.5);
    fill.position.set(-4, 3, -3);
    this._spriteScene.add(fill);

    const rim = new THREE.DirectionalLight(0x88aaff, 0.4);
    rim.position.set(0, 4, -6);
    this._spriteScene.add(rim);

    // 카메라
    this._spriteCamera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    this._spriteCamera.position.set(0, 1.0, 3.5);
    this._spriteCamera.lookAt(0, 0.85, 0);

    return true;
  },

  // 3D 모델 → 2D 캔버스 스프라이트 렌더링
  // model: Character API 객체 ({ model: THREE.Group }) 또는 THREE.Group 직접
  // cameraPreset: 'hero'|'spirit'|'monster'|'boss' — 카메라 앵글 프리셋
  renderToSprite(model, width, height, cameraPreset) {
    if (!model) return null;
    const w = width || 256;
    const h = height || 256;

    if (!this._spriteRenderer && !this.initSpriteRenderer(w, h)) return null;

    // 해상도 갱신
    this._spriteRenderer.setSize(w, h);
    this._spriteCamera.aspect = w / h;
    this._spriteCamera.updateProjectionMatrix();

    // 카메라 프리셋 (유닛 타입별 최적 프레이밍)
    const presets = {
      hero:    { pos: [0, 1.0, 3.5],  look: [0, 0.85, 0] },
      spirit:  { pos: [0, 1.5, 2.5],  look: [0, 1.4, 0] },
      monster: { pos: [0, 0.5, 3.0],  look: [0, 0.4, 0] },
      boss:    { pos: [0, 2.0, 7.0],  look: [0, 1.5, 0] },
    };
    const p = presets[cameraPreset] || presets.hero;
    this._spriteCamera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    this._spriteCamera.lookAt(new THREE.Vector3(p.look[0], p.look[1], p.look[2]));

    // 모델을 스프라이트 씬에 임시 추가 → 렌더 → 제거
    const group = model.model || model;
    this._spriteScene.add(group);
    this._spriteRenderer.render(this._spriteScene, this._spriteCamera);
    this._spriteScene.remove(group);

    // WebGL 캔버스를 일반 2D 캔버스에 복사 (재사용 가능하게)
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this._spriteRenderer.domElement, 0, 0);
    return canvas;
  },

  // 여러 각도 스프라이트 시트 생성 (8방향 등)
  renderSpriteSheet(model, frameCount, width, height, cameraPreset) {
    const frames = [];
    const group = model.model || model;
    const origRotY = group.rotation.y;

    for (let i = 0; i < (frameCount || 8); i++) {
      group.rotation.y = origRotY + (i / (frameCount || 8)) * Math.PI * 2;
      frames.push(this.renderToSprite(model, width, height, cameraPreset));
    }

    group.rotation.y = origRotY;

    // 스프라이트 시트 캔버스 합성
    const fw = width || 256;
    const fh = height || 256;
    const cols = Math.ceil(Math.sqrt(frames.length));
    const rows = Math.ceil(frames.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = fw * cols;
    sheet.height = fh * rows;
    const ctx = sheet.getContext('2d');
    frames.forEach((frame, i) => {
      if (frame) ctx.drawImage(frame, (i % cols) * fw, Math.floor(i / cols) * fh);
    });

    return { sheet, frames, cols, rows, frameWidth: fw, frameHeight: fh };
  },

  // 정리
  dispose() {
    if (this._frameId) cancelAnimationFrame(this._frameId);
    this._animCallbacks = [];
    this.characters.clear();
    if (this.renderer) this.renderer.dispose();
    if (this._spriteRenderer) { this._spriteRenderer.dispose(); this._spriteRenderer = null; }
  }
};

// Export
if (typeof module !== 'undefined') module.exports = MonglelbelEngine;
if (typeof window !== 'undefined') window.MonglelbelEngine = MonglelbelEngine;
