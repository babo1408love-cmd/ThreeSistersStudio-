// ============================================================
// 🎮 몽글벨 3D 캐릭터 생성 AI 엔진
// Three.js 기반 - AAA급 WebGL 스타일 완벽 재현
// ============================================================
// Claude Code 사용법:
// 1. 이 파일을 js/render/character-3d.js 에 복사
// 2. Three.js CDN을 index.html에 추가:
//    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
// 3. CharacterGenerator3D.create({ type: 'hero', class: 'warrior' }) 로 호출
// ============================================================

const CharacterGenerator3D = {

  // ========== 초기 설정 ==========
  scene: null,
  camera: null,
  renderer: null,
  characters: {},
  animationMixers: [],
  clock: null,

  // ========== 색상 팔레트 ==========
  PALETTES: {
    // 원소별 색상
    fire:    { primary: 0xFF4444, secondary: 0xFF8800, glow: 0xFF6600, particle: 0xFFAA00 },
    water:   { primary: 0x4488FF, secondary: 0x00CCFF, glow: 0x2266FF, particle: 0x88DDFF },
    grass:   { primary: 0x44CC44, secondary: 0x88FF44, glow: 0x22AA22, particle: 0xAAFF88 },
    thunder: { primary: 0xFFFF00, secondary: 0xFFCC00, glow: 0xFFFF44, particle: 0xFFFF88 },
    ice:     { primary: 0x88DDFF, secondary: 0xCCEEFF, glow: 0x44BBFF, particle: 0xEEF8FF },
    earth:   { primary: 0x886644, secondary: 0xAA8866, glow: 0x664422, particle: 0xCCAA88 },
    light:   { primary: 0xFFDD44, secondary: 0xFFFFAA, glow: 0xFFFF00, particle: 0xFFFFCC },
    dark:    { primary: 0x6622AA, secondary: 0x8844CC, glow: 0x440088, particle: 0xAA66EE }
  },

  // ========== 신체 비율 (등급별) ==========
  BODY_SCALES: {
    common:    { head: 1.0, body: 1.0, limb: 1.0, height: 1.0 },
    uncommon:  { head: 1.05, body: 1.05, limb: 1.05, height: 1.05 },
    rare:      { head: 1.1, body: 1.1, limb: 1.08, height: 1.1 },
    epic:      { head: 1.15, body: 1.15, limb: 1.12, height: 1.15 },
    legendary: { head: 1.2, body: 1.25, limb: 1.2, height: 1.25 },
    mythic:    { head: 1.3, body: 1.35, limb: 1.3, height: 1.4 }
  },

  // ========== 클래스별 체형 ==========
  CLASS_BODY: {
    warrior:   { bulk: 1.3, height: 1.0, headSize: 0.9, armLength: 1.0, legLength: 1.0 },
    mage:      { bulk: 0.8, height: 1.05, headSize: 1.1, armLength: 1.05, legLength: 1.0 },
    archer:    { bulk: 0.9, height: 1.1, headSize: 0.95, armLength: 1.1, legLength: 1.1 },
    cleric:    { bulk: 1.0, height: 1.0, headSize: 1.05, armLength: 1.0, legLength: 1.0 },
    rogue:     { bulk: 0.85, height: 1.05, headSize: 0.9, armLength: 1.05, legLength: 1.1 },
    knight:    { bulk: 1.5, height: 1.0, headSize: 0.85, armLength: 0.95, legLength: 0.95 },
    summoner:  { bulk: 0.75, height: 1.0, headSize: 1.15, armLength: 1.0, legLength: 1.0 },
    alchemist: { bulk: 0.9, height: 1.0, headSize: 1.05, armLength: 1.05, legLength: 1.0 }
  },

  // ========== 몬스터 체형 ==========
  MONSTER_BODY: {
    slime:     { shape: 'sphere', scaleX: 1.2, scaleY: 0.8, scaleZ: 1.2, limbs: false },
    goblin:    { shape: 'humanoid', scaleX: 0.7, scaleY: 0.7, scaleZ: 0.7, limbs: true },
    skeleton:  { shape: 'humanoid', scaleX: 0.9, scaleY: 1.1, scaleZ: 0.8, limbs: true },
    spider:    { shape: 'spider', scaleX: 1.0, scaleY: 0.5, scaleZ: 1.2, limbs: true, legCount: 8 },
    orc:       { shape: 'humanoid', scaleX: 1.4, scaleY: 1.2, scaleZ: 1.3, limbs: true },
    darkelf:   { shape: 'humanoid', scaleX: 0.85, scaleY: 1.15, scaleZ: 0.85, limbs: true },
    golem:     { shape: 'humanoid', scaleX: 1.8, scaleY: 1.5, scaleZ: 1.6, limbs: true },
    vampire:   { shape: 'humanoid', scaleX: 0.95, scaleY: 1.15, scaleZ: 0.9, limbs: true },
    dragonkin: { shape: 'dragon', scaleX: 1.5, scaleY: 1.3, scaleZ: 2.0, limbs: true, wings: true },
    shadow:    { shape: 'ghost', scaleX: 1.0, scaleY: 1.2, scaleZ: 0.8, limbs: false }
  },

  // ========== Three.js 초기화 ==========
  init(container, width, height) {
    if (typeof THREE === 'undefined') {
      console.error('Three.js가 로드되지 않았습니다! CDN을 추가하세요.');
      return false;
    }

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // 카메라
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 2, 6);
    this.camera.lookAt(0, 1, 0);

    // 렌더러
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // 조명 (고퀄리티 스타일)
    this._setupLights();

    // 바닥
    this._createGround();

    // 애니메이션 루프
    this._animate();

    return true;
  },

  // ========== 조명 설정 (고퀄리티 기본 조명) ==========
  _setupLights() {
    // 환경광 (Ambient)
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    // 메인 방향광 (Directional - 태양광)
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.0);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 50;
    this.scene.add(dirLight);

    // 림 라이트 (뒤에서 비추는 빛 - 캐릭터 윤곽 강조)
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    rimLight.position.set(-3, 3, -5);
    this.scene.add(rimLight);

    // 포인트 라이트 (캐릭터 근처 보조)
    const pointLight = new THREE.PointLight(0xffffff, 0.4, 10);
    pointLight.position.set(0, 3, 2);
    this.scene.add(pointLight);
  },

  // ========== 바닥 생성 ==========
  _createGround() {
    const groundGeo = new THREE.CircleGeometry(5, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a4a,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  },

  // ========== 🎭 메인 캐릭터 생성 함수 ==========
  create(options = {}) {
    const type = options.type || 'hero'; // hero, spirit, monster, boss, fairy

    switch (type) {
      case 'hero':    return this._createHero(options);
      case 'spirit':  return this._createSpirit(options);
      case 'monster': return this._createMonster(options);
      case 'boss':    return this._createBoss(options);
      case 'fairy':   return this._createFairy(options);
      default:        return this._createHero(options);
    }
  },

  // ========== ⚔️ 영웅 생성 ==========
  _createHero(options) {
    const heroClass = options.class || 'warrior';
    const element = options.element || 'fire';
    const rarity = options.rarity || 'rare';
    const name = options.name || '영웅';

    const classBody = this.CLASS_BODY[heroClass] || this.CLASS_BODY.warrior;
    const scale = this.BODY_SCALES[rarity] || this.BODY_SCALES.rare;
    const palette = this.PALETTES[element] || this.PALETTES.fire;

    const group = new THREE.Group();
    group.name = name;

    // 머리
    const headSize = 0.3 * classBody.headSize * scale.head;
    const head = this._createHead(headSize, palette.primary, heroClass);
    head.position.y = 1.7 * classBody.height * scale.height;
    group.add(head);

    // 몸통
    const bodyWidth = 0.35 * classBody.bulk * scale.body;
    const bodyHeight = 0.6 * classBody.height * scale.body;
    const body = this._createBody(bodyWidth, bodyHeight, palette.primary, palette.secondary, heroClass);
    body.position.y = 1.15 * classBody.height * scale.height;
    group.add(body);

    // 팔 (좌/우)
    const armLength = 0.5 * classBody.armLength * scale.limb;
    const leftArm = this._createLimb(0.08, armLength, palette.secondary);
    leftArm.position.set(-bodyWidth - 0.1, 1.35 * classBody.height * scale.height, 0);
    leftArm.rotation.z = 0.15;
    group.add(leftArm);

    const rightArm = this._createLimb(0.08, armLength, palette.secondary);
    rightArm.position.set(bodyWidth + 0.1, 1.35 * classBody.height * scale.height, 0);
    rightArm.rotation.z = -0.15;
    group.add(rightArm);

    // 무기 (클래스별)
    const weapon = this._createWeapon(heroClass, palette);
    weapon.position.set(bodyWidth + 0.25, 1.1 * classBody.height * scale.height, 0.1);
    group.add(weapon);

    // 다리 (좌/우)
    const legLength = 0.55 * classBody.legLength * scale.limb;
    const leftLeg = this._createLimb(0.1, legLength, palette.secondary);
    leftLeg.position.set(-0.12, 0.55 * classBody.legLength * scale.limb, 0);
    group.add(leftLeg);

    const rightLeg = this._createLimb(0.1, legLength, palette.secondary);
    rightLeg.position.set(0.12, 0.55 * classBody.legLength * scale.limb, 0);
    group.add(rightLeg);

    // 원소 이펙트 (오라)
    const aura = this._createAura(palette, rarity);
    group.add(aura);

    // 등급 이펙트 (레전더리 이상 시 빛나는 효과)
    if (['legendary', 'mythic'].includes(rarity)) {
      const glow = this._createGlowEffect(palette, rarity);
      group.add(glow);
    }

    // 그림자
    group.traverse(child => { if (child.isMesh) child.castShadow = true; });

    // 씬에 추가
    this.scene.add(group);
    this.characters[name] = { group, type: 'hero', class: heroClass, element, rarity, animations: {} };

    // 기본 애니메이션 (호흡)
    this._addBreathingAnimation(group);

    return {
      name,
      model: group,
      type: 'hero',
      class: heroClass,
      element,
      rarity,
      // 게임에서 사용할 메서드들
      setPosition: (x, y, z) => group.position.set(x, y, z),
      setRotation: (y) => group.rotation.y = y,
      playIdle: () => this._playAnimation(group, 'idle'),
      playAttack: () => this._playAnimation(group, 'attack'),
      playHit: () => this._playAnimation(group, 'hit'),
      playDeath: () => this._playAnimation(group, 'death'),
      playWalk: () => this._playAnimation(group, 'walk'),
      remove: () => { this.scene.remove(group); delete this.characters[name]; }
    };
  },

  // ========== 🧚 정령 생성 ==========
  _createSpirit(options) {
    const element = options.element || 'fire';
    const rarity = options.rarity || 'rare';
    const name = options.name || '정령';
    const palette = this.PALETTES[element];
    const scale = this.BODY_SCALES[rarity];

    const group = new THREE.Group();
    group.name = name;

    // 정령은 둥근 몸체 + 날개 + 원소 파티클
    const bodySize = 0.4 * scale.body;

    // 몸체 (발광하는 구)
    const bodyGeo = new THREE.SphereGeometry(bodySize, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: palette.primary,
      emissive: palette.glow,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.6
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    group.add(body);

    // 눈 (2개)
    const eyeGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.8 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.55, bodySize * 0.85);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 1.55, bodySize * 0.85);
    group.add(rightEye);

    // 날개 (투명한 원소 날개)
    const wingGeo = new THREE.PlaneGeometry(0.5 * scale.body, 0.7 * scale.body);
    const wingMat = new THREE.MeshStandardMaterial({
      color: palette.secondary,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      emissive: palette.glow,
      emissiveIntensity: 0.3
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-bodySize * 1.2, 1.6, -0.1);
    leftWing.rotation.y = -0.4;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(bodySize * 1.2, 1.6, -0.1);
    rightWing.rotation.y = 0.4;
    group.add(rightWing);

    // 원소 오라
    const aura = this._createAura(palette, rarity);
    aura.position.y = 1.5;
    group.add(aura);

    // 부유 애니메이션
    this._addFloatingAnimation(group, body);

    group.traverse(child => { if (child.isMesh) child.castShadow = true; });
    this.scene.add(group);
    this.characters[name] = { group, type: 'spirit', element, rarity };

    return {
      name, model: group, type: 'spirit', element, rarity,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      remove: () => { this.scene.remove(group); delete this.characters[name]; }
    };
  },

  // ========== 👾 몬스터 생성 ==========
  _createMonster(options) {
    const monsterType = options.monsterType || 'slime';
    const element = options.element || 'earth';
    const stage = options.stage || 1;
    const name = options.name || monsterType;

    const bodyDef = this.MONSTER_BODY[monsterType] || this.MONSTER_BODY.slime;
    const palette = this.PALETTES[element];
    const stageScale = 1 + (stage * 0.02); // 스테이지별 크기 증가

    const group = new THREE.Group();
    group.name = name;

    if (bodyDef.shape === 'sphere' || bodyDef.shape === 'ghost') {
      // 슬라임/유령형
      const geo = new THREE.SphereGeometry(0.5, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: palette.primary,
        roughness: bodyDef.shape === 'ghost' ? 0.1 : 0.6,
        metalness: bodyDef.shape === 'ghost' ? 0.8 : 0.1,
        transparent: bodyDef.shape === 'ghost',
        opacity: bodyDef.shape === 'ghost' ? 0.6 : 1.0,
        emissive: bodyDef.shape === 'ghost' ? palette.glow : 0x000000,
        emissiveIntensity: bodyDef.shape === 'ghost' ? 0.4 : 0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(bodyDef.scaleX * stageScale, bodyDef.scaleY * stageScale, bodyDef.scaleZ * stageScale);
      mesh.position.y = 0.5 * bodyDef.scaleY * stageScale;
      group.add(mesh);

      // 눈
      this._addEyes(group, 0.5 * bodyDef.scaleY * stageScale, 0.4 * bodyDef.scaleX * stageScale, monsterType);

    } else if (bodyDef.shape === 'humanoid') {
      // 인간형 몬스터
      this._createHumanoidMonster(group, bodyDef, palette, stageScale, monsterType);

    } else if (bodyDef.shape === 'spider') {
      // 거미형
      this._createSpiderMonster(group, bodyDef, palette, stageScale);

    } else if (bodyDef.shape === 'dragon') {
      // 드래곤형
      this._createDragonMonster(group, bodyDef, palette, stageScale);
    }

    group.traverse(child => { if (child.isMesh) child.castShadow = true; });
    this.scene.add(group);
    this.characters[name] = { group, type: 'monster', monsterType, element, stage };

    this._addBreathingAnimation(group);

    return {
      name, model: group, type: 'monster', monsterType, element,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      playHit: () => this._playAnimation(group, 'hit'),
      playDeath: () => this._playAnimation(group, 'death'),
      remove: () => { this.scene.remove(group); delete this.characters[name]; }
    };
  },

  // ========== 🐲 보스 생성 (⚠️ 특별 규칙!) ==========
  _createBoss(options) {
    const bossType = options.bossType || 'slimeKing';
    const element = options.element || 'dark';
    const stage = options.stage || 5;
    const name = options.name || '보스';
    const palette = this.PALETTES[element];

    // ⚠️ 보스는 일반 몬스터보다 2~3배 크게!
    const bossScale = 2.0 + (stage / 50);
    const monsterOpts = { ...options, stage, monsterType: this._bossToMonsterType(bossType) };

    const group = new THREE.Group();
    group.name = name;

    // 보스 몸체 (일반 몬스터 기반 + 확대)
    const baseMonster = this._createMonster({ ...monsterOpts, name: name + '_base' });
    baseMonster.model.scale.multiplyScalar(bossScale);
    
    // 씬에서 제거 후 그룹에 재추가
    this.scene.remove(baseMonster.model);
    group.add(baseMonster.model);

    // 왕관
    const crown = this._createCrown(palette);
    crown.position.y = bossScale * 1.8;
    group.add(crown);

    // 보스 오라 (강력한 버전)
    const aura = this._createBossAura(palette);
    group.add(aura);

    // 페이즈 표시기 (HP 바 위치)
    const phaseIndicator = this._createPhaseIndicator();
    phaseIndicator.position.y = bossScale * 2.2;
    group.add(phaseIndicator);

    group.traverse(child => { if (child.isMesh) child.castShadow = true; });
    this.scene.add(group);
    this.characters[name] = { group, type: 'boss', bossType, element, stage, currentPhase: 1 };

    this._addBreathingAnimation(group);

    return {
      name, model: group, type: 'boss', bossType, element,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      setPhase: (phase) => this._setBossPhase(name, phase),
      playAttack: () => this._playAnimation(group, 'boss_attack'),
      playSpecial: () => this._playAnimation(group, 'boss_special'),
      remove: () => { this.scene.remove(group); delete this.characters[name]; }
    };
  },

  // ========== 🦋 요정 생성 ==========
  _createFairy(options) {
    const fairyType = options.fairyType || 'gold';
    const name = options.name || '요정';

    const FAIRY_COLORS = {
      gold: 0xFFDD44, item: 0xAA44FF, luck: 0x44FF44, speed: 0x4488FF,
      guard: 0xFFFFFF, explore: 0xFF8844, heal: 0xFF88AA, star: 0xFFFF00
    };

    const color = FAIRY_COLORS[fairyType] || 0xFFDD44;
    const group = new THREE.Group();
    group.name = name;

    // 작은 빛나는 구
    const bodyGeo = new THREE.SphereGeometry(0.15, 24, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.5
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.0;
    group.add(body);

    // 작은 날개
    const wingGeo = new THREE.PlaneGeometry(0.2, 0.15);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF, transparent: true, opacity: 0.3, side: THREE.DoubleSide
    });
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 0.2, 2.05, -0.05);
      wing.rotation.y = side * 0.3;
      group.add(wing);
    });

    // 빛 파티클
    const light = new THREE.PointLight(color, 0.5, 3);
    light.position.y = 2.0;
    group.add(light);

    this._addFloatingAnimation(group, body);

    this.scene.add(group);
    this.characters[name] = { group, type: 'fairy', fairyType };

    return {
      name, model: group, type: 'fairy', fairyType,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      follow: (target, offset) => this._fairyFollow(group, target, offset),
      remove: () => { this.scene.remove(group); delete this.characters[name]; }
    };
  },

  // ========== 파츠 생성 헬퍼 ==========

  _createHead(size, color, heroClass) {
    const group = new THREE.Group();

    // 기본 머리
    const headGeo = new THREE.SphereGeometry(size, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDDBB, roughness: 0.7, metalness: 0.1 });
    const head = new THREE.Mesh(headGeo, headMat);
    group.add(head);

    // 눈
    const eyeGeo = new THREE.SphereGeometry(size * 0.15, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.3 });
    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * size * 0.35, size * 0.1, size * 0.85);
      group.add(eye);
      // 하이라이트
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(size * 0.05, 8, 8), pupilMat);
      highlight.position.set(side * size * 0.35 + 0.02, size * 0.15, size * 0.92);
      group.add(highlight);
    });

    // 입
    const mouthGeo = new THREE.TorusGeometry(size * 0.12, 0.01, 8, 16, Math.PI);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0xCC6666 });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -size * 0.15, size * 0.85);
    mouth.rotation.x = Math.PI;
    group.add(mouth);

    // 헬멧/모자 (클래스별)
    const helmet = this._createHelmet(heroClass, size, color);
    if (helmet) group.add(helmet);

    return group;
  },

  _createHelmet(heroClass, size, color) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });

    switch (heroClass) {
      case 'warrior':
      case 'knight': {
        const geo = new THREE.SphereGeometry(size * 1.15, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmet = new THREE.Mesh(geo, mat);
        helmet.position.y = size * 0.1;
        return helmet;
      }
      case 'mage':
      case 'summoner': {
        const geo = new THREE.ConeGeometry(size * 0.8, size * 1.5, 16);
        const hat = new THREE.Mesh(geo, mat);
        hat.position.y = size * 1.0;
        // 챙
        const brimGeo = new THREE.CylinderGeometry(size * 1.0, size * 1.0, 0.03, 32);
        const brim = new THREE.Mesh(brimGeo, mat);
        brim.position.y = size * 0.2;
        const group = new THREE.Group();
        group.add(hat);
        group.add(brim);
        return group;
      }
      case 'archer':
      case 'rogue': {
        const geo = new THREE.CylinderGeometry(0.02, size * 0.6, size * 0.4, 16);
        const hood = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x446644, roughness: 0.8 }));
        hood.position.y = size * 0.3;
        return hood;
      }
      default: return null;
    }
  },

  _createBody(width, height, primaryColor, secondaryColor, heroClass) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.5, metalness: 0.3 });

    // 몸통
    const bodyGeo = new THREE.CylinderGeometry(width * 0.8, width, height, 16);
    const body = new THREE.Mesh(bodyGeo, mat);
    group.add(body);

    // 갑옷/옷 (클래스별)
    if (['warrior', 'knight'].includes(heroClass)) {
      const armorMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.2, metalness: 0.8 });
      const armorGeo = new THREE.CylinderGeometry(width * 0.85, width * 1.05, height * 0.9, 16);
      const armor = new THREE.Mesh(armorGeo, armorMat);
      group.add(armor);
    }

    return group;
  },

  _createLimb(radius, length, color) {
    const geo = new THREE.CylinderGeometry(radius * 0.8, radius, length, 12);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2 });
    return new THREE.Mesh(geo, mat);
  },

  _createWeapon(heroClass, palette) {
    const group = new THREE.Group();

    switch (heroClass) {
      case 'warrior': {
        // 검
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.8, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xCCCCCC, metalness: 0.9, roughness: 0.1 })
        );
        const handle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8),
          new THREE.MeshStandardMaterial({ color: 0x664422 })
        );
        handle.position.y = -0.5;
        group.add(blade);
        group.add(handle);
        break;
      }
      case 'mage':
      case 'summoner': {
        // 지팡이
        const staff = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.025, 1.4, 8),
          new THREE.MeshStandardMaterial({ color: 0x885522 })
        );
        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 16),
          new THREE.MeshStandardMaterial({ color: palette.primary, emissive: palette.glow, emissiveIntensity: 0.6 })
        );
        orb.position.y = 0.75;
        group.add(staff);
        group.add(orb);
        break;
      }
      case 'archer': {
        // 활
        const bowGeo = new THREE.TorusGeometry(0.4, 0.015, 8, 16, Math.PI);
        const bow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0x886633 }));
        bow.rotation.z = Math.PI / 2;
        group.add(bow);
        break;
      }
      case 'knight': {
        // 검 + 방패
        const sword = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.9, 0.025),
          new THREE.MeshStandardMaterial({ color: 0xDDDDDD, metalness: 0.9, roughness: 0.1 })
        );
        group.add(sword);
        break;
      }
      default: {
        // 기본 무기
        const weapon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8),
          new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        group.add(weapon);
      }
    }

    return group;
  },

  _createCrown(palette) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xFFDD00, metalness: 0.9, roughness: 0.1 });

    // 왕관 베이스
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.15, 16), mat);
    group.add(base);

    // 뾰족한 부분들
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), mat);
      const angle = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.25, 0.15, Math.sin(angle) * 0.25);
      group.add(spike);
    }

    // 보석
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshStandardMaterial({ color: palette.primary, emissive: palette.glow, emissiveIntensity: 0.8 })
    );
    gem.position.set(0, 0.05, 0.3);
    group.add(gem);

    return group;
  },

  // ========== 이펙트 ==========

  _createAura(palette, rarity) {
    const intensity = { common: 0.1, uncommon: 0.2, rare: 0.3, epic: 0.5, legendary: 0.7, mythic: 1.0 };
    const size = { common: 0.8, uncommon: 0.9, rare: 1.0, epic: 1.2, legendary: 1.5, mythic: 2.0 };

    const geo = new THREE.SphereGeometry(size[rarity] || 1.0, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: palette.glow,
      transparent: true,
      opacity: (intensity[rarity] || 0.3) * 0.15,
      side: THREE.BackSide
    });
    const aura = new THREE.Mesh(geo, mat);
    aura.position.y = 1.0;

    return aura;
  },

  _createGlowEffect(palette, rarity) {
    const group = new THREE.Group();
    const light = new THREE.PointLight(palette.glow, rarity === 'mythic' ? 1.5 : 0.8, 5);
    light.position.y = 1.2;
    group.add(light);
    return group;
  },

  _createBossAura(palette) {
    const group = new THREE.Group();

    // 큰 오라
    const geo = new THREE.SphereGeometry(3, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: palette.glow,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    group.add(new THREE.Mesh(geo, mat));

    // 바닥 원형 이펙트
    const ringGeo = new THREE.RingGeometry(1.5, 2.5, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: palette.primary,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      emissive: palette.glow,
      emissiveIntensity: 0.5
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    group.add(ring);

    return group;
  },

  _createPhaseIndicator() {
    const group = new THREE.Group();
    // 3개의 작은 구 (페이즈 표시)
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.SphereGeometry(0.08, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x44FF44 : 0x444444,
        emissive: i === 0 ? 0x44FF44 : 0x000000,
        emissiveIntensity: 0.5
      });
      const dot = new THREE.Mesh(geo, mat);
      dot.position.x = (i - 1) * 0.25;
      dot.name = 'phase_' + (i + 1);
      group.add(dot);
    }
    return group;
  },

  // ========== 몬스터 특수 체형 ==========

  _createHumanoidMonster(group, bodyDef, palette, scale, monsterType) {
    const mat = new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.6, metalness: 0.2 });

    // 몸통
    const bodyGeo = new THREE.CylinderGeometry(0.25 * bodyDef.scaleX * scale, 0.3 * bodyDef.scaleX * scale, 0.7 * bodyDef.scaleY * scale, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 1.0 * bodyDef.scaleY * scale;
    group.add(body);

    // 머리
    const headSize = 0.2 * bodyDef.scaleX * scale;
    const headGeo = new THREE.SphereGeometry(headSize, 20, 20);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.55 * bodyDef.scaleY * scale;
    group.add(head);

    // 눈
    this._addEyes(group, 1.55 * bodyDef.scaleY * scale, headSize, monsterType);

    // 팔
    [-1, 1].forEach(side => {
      const armGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.5 * bodyDef.scaleY * scale, 8);
      const arm = new THREE.Mesh(armGeo, mat);
      arm.position.set(side * 0.35 * bodyDef.scaleX * scale, 1.0 * bodyDef.scaleY * scale, 0);
      arm.rotation.z = side * 0.2;
      group.add(arm);
    });

    // 다리
    [-1, 1].forEach(side => {
      const legGeo = new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.5 * bodyDef.scaleY * scale, 8);
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(side * 0.12 * bodyDef.scaleX * scale, 0.4 * bodyDef.scaleY * scale, 0);
      group.add(leg);
    });
  },

  _createSpiderMonster(group, bodyDef, palette, scale) {
    const mat = new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.5 });

    // 몸통 (2개)
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.4 * scale, 20, 20), mat);
    abdomen.position.set(0, 0.4 * scale, -0.3);
    abdomen.scale.z = 1.3;
    group.add(abdomen);

    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 20, 20), mat);
    thorax.position.set(0, 0.35 * scale, 0.2);
    group.add(thorax);

    // 8개 다리
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const legGeo = new THREE.CylinderGeometry(0.02 * scale, 0.015 * scale, 0.6 * scale, 6);
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(side * (0.2 + idx * 0.08) * scale, 0.2 * scale, (idx - 1.5) * 0.15);
      leg.rotation.z = side * (0.5 + idx * 0.1);
      group.add(leg);
    }

    // 눈 (6개)
    for (let i = 0; i < 6; i++) {
      const eyeGeo = new THREE.SphereGeometry(0.04 * scale, 8, 8);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, emissive: 0xFF0000, emissiveIntensity: 0.5 });
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set((i % 3 - 1) * 0.08 * scale, 0.4 * scale + (i < 3 ? 0.03 : -0.03), 0.4);
      group.add(eye);
    }
  },

  _createDragonMonster(group, bodyDef, palette, scale) {
    const mat = new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.4, metalness: 0.3 });

    // 몸통
    const bodyGeo = new THREE.CylinderGeometry(0.3 * scale, 0.35 * scale, 0.8 * scale, 12);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 1.2 * scale;
    group.add(body);

    // 머리 (용 머리)
    const headGeo = new THREE.ConeGeometry(0.2 * scale, 0.4 * scale, 8);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.set(0, 1.8 * scale, 0.2);
    head.rotation.x = -0.5;
    group.add(head);

    // 뿔
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xDDDDAA, metalness: 0.5 });
    [-1, 1].forEach(side => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03 * scale, 0.2 * scale, 6), hornMat);
      horn.position.set(side * 0.15 * scale, 1.95 * scale, 0);
      horn.rotation.z = side * 0.3;
      group.add(horn);
    });

    // 날개
    if (bodyDef.wings) {
      const wingMat = new THREE.MeshStandardMaterial({
        color: palette.secondary, transparent: true, opacity: 0.6, side: THREE.DoubleSide
      });
      [-1, 1].forEach(side => {
        const wingGeo = new THREE.PlaneGeometry(0.8 * scale, 0.6 * scale);
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(side * 0.6 * scale, 1.4 * scale, -0.2);
        wing.rotation.y = side * 0.5;
        group.add(wing);
      });
    }

    // 꼬리
    const tailGeo = new THREE.ConeGeometry(0.1 * scale, 0.8 * scale, 8);
    const tail = new THREE.Mesh(tailGeo, mat);
    tail.position.set(0, 0.8 * scale, -0.5);
    tail.rotation.x = 1.2;
    group.add(tail);

    // 눈
    this._addEyes(group, 1.85 * scale, 0.15 * scale, 'dragonkin');
  },

  _addEyes(group, yPos, offset, monsterType) {
    const eyeColor = monsterType === 'shadow' ? 0xFF0000 : 0xFFFFFF;
    const pupilColor = monsterType === 'shadow' ? 0xFF0000 : 0x222222;

    const eyeGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: eyeColor,
      emissive: monsterType === 'shadow' ? 0xFF0000 : 0x000000,
      emissiveIntensity: monsterType === 'shadow' ? 0.8 : 0
    });

    [-1, 1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(side * offset * 0.6, yPos + 0.02, offset * 0.9);
      group.add(eye);
    });
  },

  // ========== 애니메이션 ==========

  _addBreathingAnimation(group) {
    const startY = group.position.y;
    const animate = () => {
      if (!group.parent) return; // 씬에서 제거되면 중단
      const t = Date.now() * 0.002;
      group.position.y = startY + Math.sin(t) * 0.03;
      group.scale.y = 1 + Math.sin(t * 1.5) * 0.01;
      requestAnimationFrame(animate);
    };
    animate();
  },

  _addFloatingAnimation(group, target) {
    const baseY = target ? target.position.y : 1.5;
    const animate = () => {
      if (!group.parent) return;
      const t = Date.now() * 0.003;
      if (target) {
        target.position.y = baseY + Math.sin(t) * 0.15;
      }
      group.rotation.y += 0.005;
      requestAnimationFrame(animate);
    };
    animate();
  },

  _playAnimation(group, type) {
    switch (type) {
      case 'attack': {
        const startRot = group.rotation.y;
        const animate = (progress) => {
          if (progress >= 1) { group.rotation.y = startRot; return; }
          group.position.z = -Math.sin(progress * Math.PI) * 0.5;
          group.rotation.y = startRot + Math.sin(progress * Math.PI) * 0.3;
          requestAnimationFrame(() => animate(progress + 0.05));
        };
        animate(0);
        break;
      }
      case 'hit': {
        const origColor = group.children[0]?.material?.color?.getHex();
        group.children.forEach(child => {
          if (child.material) {
            child.material.emissive = new THREE.Color(0xFF0000);
            child.material.emissiveIntensity = 0.5;
          }
        });
        setTimeout(() => {
          group.children.forEach(child => {
            if (child.material) {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          });
        }, 200);
        break;
      }
      case 'death': {
        const animate = (progress) => {
          if (progress >= 1) { group.visible = false; return; }
          group.scale.setScalar(1 - progress);
          group.position.y = -progress * 0.5;
          group.rotation.z = progress * 0.5;
          requestAnimationFrame(() => animate(progress + 0.02));
        };
        animate(0);
        break;
      }
      case 'walk': {
        let step = 0;
        const animate = () => {
          if (!group.parent || step > 20) return;
          step++;
          group.children.forEach((child, i) => {
            if (i >= 3 && i <= 4) { // 다리
              child.rotation.x = Math.sin(step * 0.3 + i) * 0.3;
            }
          });
          requestAnimationFrame(animate);
        };
        animate();
        break;
      }
    }
  },

  _setBossPhase(bossName, phase) {
    const boss = this.characters[bossName];
    if (!boss) return;

    boss.currentPhase = phase;
    const colors = [0x44FF44, 0xFFAA00, 0xFF2222];

    boss.group.traverse(child => {
      if (child.name && child.name.startsWith('phase_')) {
        const idx = parseInt(child.name.split('_')[1]);
        child.material.color.setHex(idx <= phase ? colors[phase - 1] : 0x444444);
        child.material.emissive.setHex(idx <= phase ? colors[phase - 1] : 0x000000);
      }
    });

    // 페이즈별 시각 변화
    if (phase >= 2) {
      boss.group.traverse(child => {
        if (child.material && child.material.emissiveIntensity !== undefined) {
          child.material.emissiveIntensity = Math.min(child.material.emissiveIntensity + 0.2, 1.0);
        }
      });
    }
  },

  _fairyFollow(fairyGroup, targetGroup, offset = { x: 0.5, y: 0.5, z: -0.3 }) {
    const animate = () => {
      if (!fairyGroup.parent || !targetGroup.parent) return;
      fairyGroup.position.lerp(
        new THREE.Vector3(
          targetGroup.position.x + offset.x + Math.sin(Date.now() * 0.003) * 0.1,
          targetGroup.position.y + offset.y + Math.sin(Date.now() * 0.004) * 0.1,
          targetGroup.position.z + offset.z
        ),
        0.05
      );
      requestAnimationFrame(animate);
    };
    animate();
  },

  _bossToMonsterType(bossType) {
    const map = {
      slimeKing: 'slime', goblinKing: 'goblin', skeletonLord: 'skeleton',
      poisonQueen: 'spider', orcGeneral: 'orc', darkSorcerer: 'darkelf',
      ancientGolem: 'golem', dragonLord: 'dragonkin'
    };
    return map[bossType] || 'slime';
  },

  // ========== 렌더 루프 ==========
  _animate() {
    const loop = () => {
      requestAnimationFrame(loop);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  },

  // ========== 미니어처 모드 (마블 타일용) ==========
  createMiniature(options = {}) {
    // 마블 타일 위에 올라가는 작은 캐릭터
    const miniOptions = { ...options };
    const char = this.create(miniOptions);

    // 축소
    char.model.scale.multiplyScalar(0.3);

    return char;
  },

  // ========== 유틸: 2D 스프라이트 모드 (캔버스 렌더링) ==========
  renderToCanvas(characterModel, canvasWidth, canvasHeight) {
    // 오프스크린 렌더링으로 2D 이미지 생성
    const offRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    offRenderer.setSize(canvasWidth, canvasHeight);

    const offScene = new THREE.Scene();
    offScene.add(characterModel.model.clone());

    const offCamera = new THREE.PerspectiveCamera(45, canvasWidth / canvasHeight, 0.1, 100);
    offCamera.position.set(0, 1.5, 4);
    offCamera.lookAt(0, 1, 0);

    // 조명
    offScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(2, 4, 2);
    offScene.add(light);

    offRenderer.render(offScene, offCamera);

    // canvas 데이터 반환
    const dataUrl = offRenderer.domElement.toDataURL('image/png');
    offRenderer.dispose();

    return dataUrl;
  }
};

// Export
if (typeof module !== 'undefined') module.exports = CharacterGenerator3D;
if (typeof window !== 'undefined') window.CharacterGenerator3D = CharacterGenerator3D;
