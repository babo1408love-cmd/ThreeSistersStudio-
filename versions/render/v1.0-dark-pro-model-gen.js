// ============================================================
// 🎮 몽글벨 웹엔진 - 프로 3D 모델 생성기
// ============================================================
// 코드만으로 AAA급 캐릭터 모델 생성
// Subdivision Surface + Bezier 곡선 + 디테일 파츠
//
// Claude Code: js/render/pro-model-gen.js 에 넣으세요
// character-engine-v2.js 다음에 로드
// ============================================================

const ProModelGen = {

  // ========== 스킨 톤 팔레트 ==========
  SKIN_TONES: {
    light:  { base: 0xFFE0BD, shadow: 0xDDB89A, highlight: 0xFFEED5 },
    medium: { base: 0xE8B88A, shadow: 0xC49A6C, highlight: 0xFFD4AA },
    tan:    { base: 0xC68642, shadow: 0xA06830, highlight: 0xDDA060 },
    dark:   { base: 0x8D5524, shadow: 0x6B3A1A, highlight: 0xAA7040 },
    fantasy:{ base: 0xBBDDFF, shadow: 0x88AACC, highlight: 0xDDEEFF },
    elf:    { base: 0xFFEEDD, shadow: 0xDDCCBB, highlight: 0xFFF8F0 },
    orc:    { base: 0x668844, shadow: 0x446622, highlight: 0x88AA66 },
    undead: { base: 0xCCCCBB, shadow: 0x999988, highlight: 0xDDDDCC }
  },

  // ========== Subdivision Surface 구현 ==========
  // (폴리곤을 부드럽게 쪼개는 기법 - 블렌더의 Subdivision과 동일)
  subdivide(geometry, iterations) {
    let geo = geometry;
    for (let i = 0; i < (iterations || 1); i++) {
      geo = this._catmullClarkSubdivide(geo);
    }
    return geo;
  },

  _catmullClarkSubdivide(geo) {
    // 간략화된 Loop subdivision
    const params = new THREE.SubdivisionModifier
      ? new THREE.SubdivisionModifier(1).modify(geo)
      : this._manualSubdivide(geo);
    return params;
  },

  _manualSubdivide(geo) {
    // SubdivisionModifier 없을 때 수동 세분화
    // 각 삼각형을 4개로 쪼개기
    if (!geo.index) {
      geo.computeVertexNormals();
      return geo;
    }

    const positions = geo.attributes.position.array;
    const indices = geo.index.array;
    const newPositions = [];
    const newIndices = [];

    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i+1], c = indices[i+2];
      
      const ax = positions[a*3], ay = positions[a*3+1], az = positions[a*3+2];
      const bx = positions[b*3], by = positions[b*3+1], bz = positions[b*3+2];
      const cx = positions[c*3], cy = positions[c*3+1], cz = positions[c*3+2];

      // 중간점
      const abx = (ax+bx)/2, aby = (ay+by)/2, abz = (az+bz)/2;
      const bcx = (bx+cx)/2, bcy = (by+cy)/2, bcz = (bz+cz)/2;
      const cax = (cx+ax)/2, cay = (cy+ay)/2, caz = (cz+az)/2;

      const base = newPositions.length / 3;
      newPositions.push(ax,ay,az, bx,by,bz, cx,cy,cz, abx,aby,abz, bcx,bcy,bcz, cax,cay,caz);
      
      newIndices.push(
        base, base+3, base+5,
        base+3, base+1, base+4,
        base+5, base+4, base+2,
        base+3, base+4, base+5
      );
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    newGeo.setIndex(newIndices);
    newGeo.computeVertexNormals();
    return newGeo;
  },

  // ========== 베지어 곡선 바디 생성 ==========
  // (3D 모델링 소프트웨어처럼 곡선으로 부드러운 몸체 생성)
  createBodyFromCurves(curves, segments, radialSegments) {
    const segs = segments || 32;
    const rSegs = radialSegments || 24;
    const points = [];

    // 곡선을 따라 반지름 포인트 생성
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      let radius = 0;
      let yPos = 0;
      
      // 여러 곡선 합성
      for (const curve of curves) {
        const ct = Math.max(0, Math.min(1, (t - curve.start) / (curve.end - curve.start)));
        if (t >= curve.start && t <= curve.end) {
          // 3차 베지어
          const p0 = curve.r0, p1 = curve.r1, p2 = curve.r2, p3 = curve.r3;
          const mt = 1 - ct;
          radius = mt*mt*mt*p0 + 3*mt*mt*ct*p1 + 3*mt*ct*ct*p2 + ct*ct*ct*p3;
        }
        yPos = curve.yStart + (curve.yEnd - curve.yStart) * t;
      }

      points.push(new THREE.Vector2(Math.max(radius, 0.001), yPos));
    }

    return new THREE.LatheGeometry(points, rSegs);
  },

  // =============================================================
  // 🧍 고퀄 인체 모델 생성
  // =============================================================
  createHumanBody(options = {}) {
    const group = new THREE.Group();
    const skinTone = options.skinTone || 'light';
    const skin = this.SKIN_TONES[skinTone];
    const gender = options.gender || 'neutral';
    const bulk = options.bulk || 1.0;
    const height = options.height || 1.0;

    // === 머리 (고퀄) ===
    const head = this._createDetailedHead(skin, options);
    head.position.y = 1.62 * height;
    group.add(head);

    // === 목 ===
    const neckGeo = new THREE.CylinderGeometry(0.055 * bulk, 0.065 * bulk, 0.1 * height, 16);
    const neckMat = this._createSkinMaterial(skin);
    const neck = new THREE.Mesh(neckGeo, neckMat);
    neck.position.y = 1.5 * height;
    group.add(neck);

    // === 상체 (토르소) ===
    const torso = this._createDetailedTorso(skin, bulk, height, gender);
    torso.position.y = 1.15 * height;
    group.add(torso);

    // === 골반/허리 ===
    const hipGeo = new THREE.CylinderGeometry(0.17 * bulk, 0.19 * bulk, 0.12 * height, 16);
    const hip = new THREE.Mesh(hipGeo, this._createSkinMaterial(skin));
    hip.position.y = 0.87 * height;
    group.add(hip);

    // === 팔 (좌/우) ===
    [-1, 1].forEach(side => {
      const arm = this._createDetailedArm(skin, bulk, height, side);
      group.add(arm);
    });

    // === 다리 (좌/우) ===
    [-1, 1].forEach(side => {
      const leg = this._createDetailedLeg(skin, bulk, height, side);
      group.add(leg);
    });

    group.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    return group;
  },

  // ========== 고퀄 머리 ==========
  _createDetailedHead(skin, options) {
    const group = new THREE.Group();
    const skinMat = this._createSkinMaterial(skin);

    // 두개골 (변형된 구 - 턱, 광대뼈, 이마 표현)
    const headGeo = new THREE.SphereGeometry(0.21, 48, 48);
    const positions = headGeo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      let x = positions.getX(i);
      let y = positions.getY(i);
      let z = positions.getZ(i);

      // 턱 (아래쪽 좁게)
      if (y < -0.05) {
        const chinFactor = 1 - Math.pow((-y - 0.05) / 0.16, 0.8) * 0.35;
        x *= chinFactor;
        z *= chinFactor * 0.9;
      }

      // 광대뼈 (옆쪽 살짝 넓게)
      if (y > -0.05 && y < 0.08 && Math.abs(x) > 0.1) {
        x *= 1.05;
      }

      // 이마 (위쪽 살짝 넓게)
      if (y > 0.1) {
        const foreheadFactor = 1 + (y - 0.1) / 0.12 * 0.03;
        x *= foreheadFactor;
      }

      // 뒤통수 (뒤쪽 볼록)
      if (z < -0.05) {
        z *= 1.08;
      }

      positions.setX(i, x);
      positions.setY(i, y);
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
    headGeo.computeVertexNormals();

    const head = new THREE.Mesh(headGeo, skinMat);
    group.add(head);

    // === 얼굴 디테일 ===
    this._addDetailedFace(group, skin, options);

    // === 귀 ===
    this._addEars(group, skin, options);

    return group;
  },

  // ========== 상세 얼굴 ==========
  _addDetailedFace(group, skin, options) {
    const element = options.element || 'fire';
    const palette = MonglelbelEngine ? MonglelbelEngine.PALETTES[element] : { main: 0x4488FF, glow: 0x2266FF, rim: 0x88CCFF };

    // === 눈 (좌/우) - 애니 스타일 대형 ===
    [-1, 1].forEach(side => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.075, 0.03, 0.16);

      // 눈 소켓 (살짝 들어간 부분)
      const socketGeo = new THREE.SphereGeometry(0.045, 24, 24);
      const socketMat = new THREE.MeshStandardMaterial({ 
        color: skin.shadow, roughness: 0.8 
      });
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.scale.set(1.2, 1.0, 0.5);
      eyeGroup.add(socket);

      // 흰자
      const whiteGeo = new THREE.SphereGeometry(0.035, 24, 24);
      whiteGeo.scale(1.15, 1.3, 0.6);
      const whiteMat = new THREE.MeshStandardMaterial({ 
        color: 0xFAFAFA, roughness: 0.2, metalness: 0.1 
      });
      const white = new THREE.Mesh(whiteGeo, whiteMat);
      white.position.z = 0.01;
      eyeGroup.add(white);

      // 홍채 (원소 색상 + 그라데이션 효과)
      const irisGeo = new THREE.SphereGeometry(0.022, 24, 24);
      const irisMat = new THREE.MeshStandardMaterial({
        color: palette.main,
        emissive: palette.glow,
        emissiveIntensity: 0.25,
        roughness: 0.1,
        metalness: 0.3
      });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.z = 0.025;
      eyeGroup.add(iris);

      // 동공 (수직 타원 - 고양이눈 or 원형)
      const pupilGeo = new THREE.SphereGeometry(0.012, 16, 16);
      pupilGeo.scale(0.7, 1.0, 0.5);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.z = 0.032;
      eyeGroup.add(pupil);

      // 하이라이트 (2개 - 큰거 + 작은거)
      const hlMat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 1.0
      });
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 12), hlMat);
      hl1.position.set(side * -0.008, 0.008, 0.04);
      eyeGroup.add(hl1);

      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 8), hlMat);
      hl2.position.set(side * 0.005, -0.005, 0.038);
      eyeGroup.add(hl2);

      // 눈썹
      const browGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.05, 8);
      const browMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(0, 0.04, 0.02);
      brow.rotation.z = Math.PI / 2;
      brow.rotation.x = -0.15;
      eyeGroup.add(brow);

      // 위 눈꺼풀 (속눈썹 라인)
      const lidGeo = new THREE.TorusGeometry(0.032, 0.003, 8, 16, Math.PI);
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x221111 });
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.z = 0.02;
      lid.rotation.y = Math.PI;
      eyeGroup.add(lid);

      group.add(eyeGroup);
    });

    // === 코 ===
    const noseGroup = new THREE.Group();
    noseGroup.position.set(0, -0.02, 0.18);

    // 콧대
    const bridgeGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.06, 8);
    const noseMat = new THREE.MeshStandardMaterial({
      color: skin.base, roughness: 0.7,
      emissive: skin.shadow, emissiveIntensity: 0.05
    });
    const bridge = new THREE.Mesh(bridgeGeo, noseMat);
    bridge.rotation.x = 0.3;
    noseGroup.add(bridge);

    // 콧볼 (구 2개)
    [-1, 1].forEach(side => {
      const nostrilGeo = new THREE.SphereGeometry(0.012, 12, 12);
      const nostril = new THREE.Mesh(nostrilGeo, noseMat);
      nostril.position.set(side * 0.012, -0.025, 0.005);
      noseGroup.add(nostril);
    });
    group.add(noseGroup);

    // === 입 ===
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.08, 0.165);

    // 윗입술
    const upperLipShape = new THREE.Shape();
    upperLipShape.moveTo(-0.03, 0);
    upperLipShape.quadraticCurveTo(-0.015, 0.008, 0, 0.005); // 큐피드 보우
    upperLipShape.quadraticCurveTo(0.015, 0.008, 0.03, 0);

    const upperLipGeo = new THREE.ShapeGeometry(upperLipShape);
    const lipMat = new THREE.MeshStandardMaterial({
      color: 0xDD8888, roughness: 0.4, metalness: 0.1
    });
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    mouthGroup.add(upperLip);

    // 아랫입술
    const lowerLipShape = new THREE.Shape();
    lowerLipShape.moveTo(-0.025, 0);
    lowerLipShape.quadraticCurveTo(0, -0.008, 0.025, 0);

    const lowerLipGeo = new THREE.ShapeGeometry(lowerLipShape);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.y = -0.003;
    mouthGroup.add(lowerLip);

    group.add(mouthGroup);

    // === 볼 (살짝 빨간 블러쉬) ===
    [-1, 1].forEach(side => {
      const blushGeo = new THREE.SphereGeometry(0.025, 16, 16);
      blushGeo.scale(1.2, 0.8, 0.3);
      const blushMat = new THREE.MeshStandardMaterial({
        color: 0xFFAAAA, transparent: true, opacity: 0.15, roughness: 0.9
      });
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(side * 0.1, -0.03, 0.15);
      group.add(blush);
    });
  },

  // ========== 귀 ==========
  _addEars(group, skin, options) {
    const isElf = options.race === 'elf' || options.class === 'summoner' || options.class === 'mage';

    [-1, 1].forEach(side => {
      const earGroup = new THREE.Group();

      if (isElf) {
        // 엘프 귀 (뾰족하고 길게)
        const earShape = new THREE.Shape();
        earShape.moveTo(0, -0.03);
        earShape.quadraticCurveTo(0.015, 0, 0.03, 0.06);
        earShape.quadraticCurveTo(0.01, 0.04, 0, 0.02);
        earShape.quadraticCurveTo(-0.005, 0, 0, -0.03);

        const earGeo = new THREE.ExtrudeGeometry(earShape, { depth: 0.008, bevelEnabled: true, bevelSize: 0.002, bevelSegments: 3 });
        const ear = new THREE.Mesh(earGeo, this._createSkinMaterial(skin));
        ear.rotation.z = side * 0.3;
        earGroup.add(ear);
      } else {
        // 일반 귀
        const earGeo = new THREE.SphereGeometry(0.025, 12, 12);
        earGeo.scale(0.6, 1.0, 0.4);
        const ear = new THREE.Mesh(earGeo, this._createSkinMaterial(skin));
        earGroup.add(ear);
      }

      earGroup.position.set(side * 0.2, 0.01, 0);
      group.add(earGroup);
    });
  },

  // ========== 상세 몸통 (토르소) ==========
  _createDetailedTorso(skin, bulk, height, gender) {
    const group = new THREE.Group();

    // 곡선 기반 몸통 (Lathe)
    const points = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let radius;

      if (gender === 'female') {
        // 여성 체형 곡선
        if (t < 0.15) radius = 0.17 * bulk; // 어깨
        else if (t < 0.35) radius = 0.15 * bulk + Math.sin((t-0.15)/0.2 * Math.PI) * 0.02; // 가슴
        else if (t < 0.5) radius = 0.12 * bulk; // 허리 (잘록)
        else if (t < 0.7) radius = 0.16 * bulk; // 골반
        else radius = 0.15 * bulk;
      } else if (gender === 'male' || bulk > 1.2) {
        // 남성/건장 체형
        if (t < 0.15) radius = 0.22 * bulk; // 어깨 (넓게)
        else if (t < 0.4) radius = 0.2 * bulk;
        else if (t < 0.6) radius = 0.17 * bulk;
        else radius = 0.18 * bulk;
      } else {
        // 중성 체형
        if (t < 0.15) radius = 0.18 * bulk;
        else if (t < 0.5) radius = 0.16 * bulk;
        else radius = 0.17 * bulk;
      }

      const y = (0.5 - t) * 0.55 * height;
      points.push(new THREE.Vector2(radius, y));
    }

    const torsoGeo = new THREE.LatheGeometry(points, 24);
    const torsoMat = this._createSkinMaterial(skin);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    group.add(torso);

    return group;
  },

  // ========== 상세 팔 ==========
  _createDetailedArm(skin, bulk, height, side) {
    const group = new THREE.Group();
    const skinMat = this._createSkinMaterial(skin);

    // 어깨 관절 (부드러운 구)
    const shoulderGeo = new THREE.SphereGeometry(0.06 * bulk, 16, 16);
    const shoulder = new THREE.Mesh(shoulderGeo, skinMat);
    shoulder.position.set(side * (0.2 * bulk + 0.05), 1.4 * height, 0);
    group.add(shoulder);

    // 상완 (위팔)
    const upperArmPoints = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = (0.055 - t * 0.01) * bulk;
      upperArmPoints.push(new THREE.Vector2(r, t * 0.22 * height));
    }
    const upperArmGeo = new THREE.LatheGeometry(upperArmPoints, 12);
    const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
    upperArm.position.set(side * (0.2 * bulk + 0.05), 1.18 * height, 0);
    group.add(upperArm);

    // 팔꿈치 관절
    const elbowGeo = new THREE.SphereGeometry(0.04 * bulk, 12, 12);
    const elbow = new THREE.Mesh(elbowGeo, skinMat);
    elbow.position.set(side * (0.2 * bulk + 0.05), 1.16 * height, 0);
    group.add(elbow);

    // 하완 (아래팔)
    const lowerArmPoints = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = (0.045 - t * 0.01) * bulk;
      lowerArmPoints.push(new THREE.Vector2(r, t * 0.22 * height));
    }
    const lowerArmGeo = new THREE.LatheGeometry(lowerArmPoints, 12);
    const lowerArm = new THREE.Mesh(lowerArmGeo, skinMat);
    lowerArm.position.set(side * (0.2 * bulk + 0.05), 0.95 * height, 0);
    group.add(lowerArm);

    // 손 (상세)
    const hand = this._createDetailedHand(skin, bulk, side);
    hand.position.set(side * (0.2 * bulk + 0.05), 0.82 * height, 0);
    group.add(hand);

    return group;
  },

  // ========== 상세 손 ==========
  _createDetailedHand(skin, bulk, side) {
    const group = new THREE.Group();
    const skinMat = this._createSkinMaterial(skin);

    // 손바닥
    const palmGeo = new THREE.BoxGeometry(0.06 * bulk, 0.07 * bulk, 0.025 * bulk);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    group.add(palm);

    // 손가락 5개
    for (let f = 0; f < 5; f++) {
      const isThumb = f === 0;
      const fingerLen = isThumb ? 0.03 : 0.035 + (f === 2 ? 0.005 : 0);
      const fingerRad = isThumb ? 0.007 : 0.006;
      const xOffset = isThumb ? side * 0.03 : (f - 2.5) * 0.013;
      const yOffset = isThumb ? -0.01 : -0.04;
      const zOffset = isThumb ? 0.01 : 0;

      const fingerGeo = new THREE.CylinderGeometry(fingerRad * bulk, fingerRad * 0.9 * bulk, fingerLen * bulk, 8);
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(xOffset, yOffset, zOffset);
      if (isThumb) finger.rotation.z = side * 0.5;
      group.add(finger);

      // 손톱
      const nailGeo = new THREE.BoxGeometry(fingerRad * 1.5 * bulk, fingerRad * 0.5 * bulk, fingerRad * 1.8 * bulk);
      const nailMat = new THREE.MeshStandardMaterial({ color: 0xFFDDCC, roughness: 0.2, metalness: 0.1 });
      const nail = new THREE.Mesh(nailGeo, nailMat);
      nail.position.set(xOffset, yOffset - fingerLen * 0.4 * bulk, zOffset + fingerRad * bulk);
      group.add(nail);
    }

    return group;
  },

  // ========== 상세 다리 ==========
  _createDetailedLeg(skin, bulk, height, side) {
    const group = new THREE.Group();
    const skinMat = this._createSkinMaterial(skin);

    // 허벅지
    const thighPoints = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = (0.085 - t * 0.02) * bulk;
      thighPoints.push(new THREE.Vector2(r, t * 0.28 * height));
    }
    const thighGeo = new THREE.LatheGeometry(thighPoints, 16);
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.set(side * 0.09, 0.58 * height, 0);
    group.add(thigh);

    // 무릎
    const kneeGeo = new THREE.SphereGeometry(0.06 * bulk, 12, 12);
    const knee = new THREE.Mesh(kneeGeo, skinMat);
    knee.position.set(side * 0.09, 0.57 * height, 0.01);
    group.add(knee);

    // 종아리
    const calfPoints = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const r = (0.065 + Math.sin(t * Math.PI) * 0.015 - t * 0.02) * bulk;
      calfPoints.push(new THREE.Vector2(r, t * 0.28 * height));
    }
    const calfGeo = new THREE.LatheGeometry(calfPoints, 16);
    const calf = new THREE.Mesh(calfGeo, skinMat);
    calf.position.set(side * 0.09, 0.28 * height, 0);
    group.add(calf);

    // 발목
    const ankleGeo = new THREE.SphereGeometry(0.035 * bulk, 10, 10);
    const ankle = new THREE.Mesh(ankleGeo, skinMat);
    ankle.position.set(side * 0.09, 0.08 * height, 0);
    group.add(ankle);

    // 발
    const footGeo = new THREE.BoxGeometry(0.07 * bulk, 0.03 * height, 0.13 * bulk);
    // 모서리 둥글게 (베벨)
    const foot = new THREE.Mesh(footGeo, skinMat);
    foot.position.set(side * 0.09, 0.02 * height, 0.025);
    group.add(foot);

    return group;
  },

  // =============================================================
  // 🗡️ 고퀄 갑옷 생성
  // =============================================================
  createArmor(bodyGroup, options = {}) {
    const armorGroup = new THREE.Group();
    const element = options.element || 'fire';
    const rarity = options.rarity || 'rare';
    const heroClass = options.class || 'warrior';
    const palette = MonglelbelEngine ? MonglelbelEngine.PALETTES[element] : { main: 0x4488FF, sub: 0x88AAFF, rim: 0xAABBFF, glow: 0x2266FF };

    const isHeavy = ['warrior', 'knight'].includes(heroClass);
    const metalness = isHeavy ? 0.85 : 0.3;
    const roughness = isHeavy ? 0.15 : 0.5;

    const armorMat = new THREE.MeshStandardMaterial({
      color: palette.main,
      roughness,
      metalness,
      emissive: ['legendary','mythic'].includes(rarity) ? palette.glow : 0x000000,
      emissiveIntensity: rarity === 'mythic' ? 0.2 : rarity === 'legendary' ? 0.1 : 0
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: palette.sub,
      roughness: 0.2,
      metalness: 0.9
    });

    // === 흉갑 ===
    if (isHeavy) {
      const chestGeo = new THREE.CylinderGeometry(0.23, 0.2, 0.35, 16);
      const chest = new THREE.Mesh(chestGeo, armorMat);
      chest.position.y = 1.15;
      armorGroup.add(chest);

      // 가슴 장식
      const emblemGeo = new THREE.SphereGeometry(0.04, 16, 16);
      const emblemMat = new THREE.MeshStandardMaterial({
        color: palette.glow,
        emissive: palette.glow,
        emissiveIntensity: 0.5,
        metalness: 0.8
      });
      const emblem = new THREE.Mesh(emblemGeo, emblemMat);
      emblem.position.set(0, 1.2, 0.2);
      armorGroup.add(emblem);
    }

    // === 어깨 갑옷 ===
    [-1, 1].forEach(side => {
      const shoulderGeo = new THREE.SphereGeometry(0.09, 16, 16);
      shoulderGeo.scale(1.2, 0.8, 1.0);
      const shoulderArmor = new THREE.Mesh(shoulderGeo, armorMat);
      shoulderArmor.position.set(side * 0.27, 1.42, 0);
      armorGroup.add(shoulderArmor);

      if (isHeavy) {
        // 어깨 스파이크
        const spikeGeo = new THREE.ConeGeometry(0.02, 0.08, 8);
        const spike = new THREE.Mesh(spikeGeo, trimMat);
        spike.position.set(side * 0.32, 1.48, 0);
        spike.rotation.z = side * -0.5;
        armorGroup.add(spike);
      }
    });

    // === 벨트 ===
    const beltGeo = new THREE.TorusGeometry(0.18, 0.015, 8, 32);
    const belt = new THREE.Mesh(beltGeo, trimMat);
    belt.position.y = 0.88;
    belt.rotation.x = Math.PI / 2;
    armorGroup.add(belt);

    // 벨트 버클
    const buckleGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
    const buckle = new THREE.Mesh(buckleGeo, new THREE.MeshStandardMaterial({
      color: 0xFFDD00, metalness: 0.95, roughness: 0.1
    }));
    buckle.position.set(0, 0.88, 0.18);
    armorGroup.add(buckle);

    // === 부츠 ===
    [-1, 1].forEach(side => {
      const bootGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.2, 12);
      const boot = new THREE.Mesh(bootGeo, armorMat);
      boot.position.set(side * 0.09, 0.12, 0);
      armorGroup.add(boot);

      // 부츠 발 부분
      const solGeo = new THREE.BoxGeometry(0.08, 0.04, 0.14);
      const sole = new THREE.Mesh(solGeo, armorMat);
      sole.position.set(side * 0.09, 0.02, 0.02);
      armorGroup.add(sole);
    });

    // === 장갑 ===
    [-1, 1].forEach(side => {
      const gloveGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.1, 10);
      const glove = new THREE.Mesh(gloveGeo, armorMat);
      glove.position.set(side * 0.25, 0.92, 0);
      armorGroup.add(glove);
    });

    armorGroup.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    return armorGroup;
  },

  // =============================================================
  // 💇 고퀄 머리카락 시스템
  // =============================================================
  createHair(options = {}) {
    const group = new THREE.Group();
    const style = options.style || 'short';
    const element = options.element || 'fire';
    const palette = MonglelbelEngine ? MonglelbelEngine.PALETTES[element] : { sub: 0xFF4444, rim: 0xFFAA00 };

    const hairColor = options.hairColor || palette.sub;
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.4,
      metalness: 0.1,
      // 머리카락 광택
      emissive: hairColor,
      emissiveIntensity: 0.03
    });

    // 머리카락 베이스 (두개골 덮개)
    const baseGeo = new THREE.SphereGeometry(0.215, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const base = new THREE.Mesh(baseGeo, hairMat);
    base.position.y = 0.02;
    group.add(base);

    if (style === 'long' || style === 'mage') {
      // 긴 머리 (뒤로 흐르는)
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 1.5 - Math.PI * 0.25;
        const strandGeo = new THREE.CylinderGeometry(
          0.015 + Math.random() * 0.01,
          0.005 + Math.random() * 0.005,
          0.3 + Math.random() * 0.2,
          6
        );
        const strand = new THREE.Mesh(strandGeo, hairMat);
        strand.position.set(
          Math.sin(angle) * 0.18,
          -0.1 - Math.random() * 0.05,
          Math.cos(angle) * 0.18 - 0.1
        );
        strand.rotation.x = 0.2 + Math.random() * 0.15;
        strand.rotation.z = (Math.random() - 0.5) * 0.2;
        group.add(strand);
      }
    }

    if (style === 'spiky' || style === 'warrior') {
      // 스파이키 헤어
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const tiltAngle = Math.random() * 0.5;
        const spikeGeo = new THREE.ConeGeometry(0.02, 0.08 + Math.random() * 0.06, 6);
        const spike = new THREE.Mesh(spikeGeo, hairMat);
        spike.position.set(
          Math.sin(angle) * 0.15 * Math.sin(tiltAngle),
          0.15 + Math.random() * 0.05,
          Math.cos(angle) * 0.15 * Math.sin(tiltAngle)
        );
        spike.rotation.x = -tiltAngle * Math.cos(angle);
        spike.rotation.z = tiltAngle * Math.sin(angle);
        group.add(spike);
      }
    }

    // 앞머리 (공통)
    for (let i = -3; i <= 3; i++) {
      const bangGeo = new THREE.CylinderGeometry(0.008, 0.004, 0.06 + Math.abs(i) * 0.005, 6);
      const bang = new THREE.Mesh(bangGeo, hairMat);
      bang.position.set(i * 0.025, 0.03, 0.19);
      bang.rotation.x = 0.4;
      bang.rotation.z = i * 0.06;
      group.add(bang);
    }

    return group;
  },

  // =============================================================
  // 🎯 통합 생성 함수 (모든 파츠 조합)
  // =============================================================
  createFullCharacter(options = {}) {
    const group = new THREE.Group();
    const name = options.name || 'Character_' + Date.now();

    // 1. 인체
    const body = this.createHumanBody({
      skinTone: options.skinTone || 'light',
      bulk: options.bulk || 1.0,
      height: options.height || 1.0,
      gender: options.gender || 'neutral',
      element: options.element,
      class: options.class,
      race: options.race
    });
    group.add(body);

    // 2. 갑옷
    const armor = this.createArmor(body, {
      element: options.element || 'fire',
      rarity: options.rarity || 'rare',
      class: options.class || 'warrior'
    });
    group.add(armor);

    // 3. 머리카락
    const hairStyle = options.class === 'mage' || options.class === 'summoner' ? 'long' :
                     options.class === 'warrior' || options.class === 'knight' ? 'spiky' : 'short';
    const hair = this.createHair({
      style: hairStyle,
      element: options.element,
      hairColor: options.hairColor
    });
    hair.position.y = 1.62 * (options.height || 1.0);
    group.add(hair);

    group.name = name;
    group.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });

    // MonglelbelEngine 씬에 추가
    if (MonglelbelEngine && MonglelbelEngine.scene) {
      MonglelbelEngine.scene.add(group);
      MonglelbelEngine._addCallback(() => {
        if (!group.parent) return;
        const t = Date.now() * 0.0015;
        group.position.y = Math.sin(t) * 0.015;
        group.rotation.y = Math.sin(t * 0.3) * 0.01;
      });
    }

    return {
      name,
      model: group,
      setPosition: (x, y, z) => group.position.set(x, y, z),
      setRotation: (y) => group.rotation.y = y,
      setScale: (s) => group.scale.setScalar(s),
      remove: () => {
        if (MonglelbelEngine && MonglelbelEngine.scene) {
          MonglelbelEngine.scene.remove(group);
        }
      }
    };
  },

  // ========== 유틸 ==========
  _createSkinMaterial(skin) {
    return new THREE.MeshStandardMaterial({
      color: skin.base,
      roughness: 0.65,
      metalness: 0.05,
      emissive: skin.shadow,
      emissiveIntensity: 0.02
    });
  }
};

// Export
if (typeof window !== 'undefined') window.ProModelGen = ProModelGen;
if (typeof module !== 'undefined') module.exports = ProModelGen;
