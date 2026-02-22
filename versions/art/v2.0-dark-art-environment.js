// ============================================================
// 🎨 몽글벨 웹엔진 - 환경 미술 생성기 (2/3)
// ============================================================
// 프로시저럴 지형/나무/건물/소품 자동 생성
//
// Claude Code: js/art/art-environment.js 에 넣으세요
// ============================================================

const ArtEnvironment = {

  // ========== 🌲 나무 생성 ==========
  createTree(options = {}) {
    const group = new THREE.Group();
    const type = options.type || 'oak';
    const scale = options.scale || 1.0;
    const season = options.season || 'spring';

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85, metalness: 0 });

    const seasonColors = {
      spring: [0x33AA44, 0x44CC55, 0x55DD66],
      summer: [0x228833, 0x339944, 0x22AA33],
      autumn: [0xDD8822, 0xCC5522, 0xEEAA33],
      winter: [0xCCDDEE, 0xBBCCDD, 0xAABBCC]
    };
    const leafColors = seasonColors[season] || seasonColors.spring;

    switch (type) {
      case 'oak': this._buildOakTree(group, trunkMat, leafColors, scale); break;
      case 'pine': this._buildPineTree(group, trunkMat, leafColors, scale); break;
      case 'cherry': this._buildCherryTree(group, trunkMat, [0xFF88AA, 0xFFAACC, 0xFF6688], scale); break;
      case 'crystal': this._buildCrystalTree(group, scale); break;
      case 'mushroom': this._buildMushroomTree(group, scale); break;
      case 'dead': this._buildDeadTree(group, trunkMat, scale); break;
      default: this._buildOakTree(group, trunkMat, leafColors, scale);
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  _buildOakTree(group, trunkMat, colors, s) {
    // 줄기 (곡선)
    const trunkGeo = new THREE.CylinderGeometry(0.06 * s, 0.12 * s, 1.0 * s, 8);
    group.add(new THREE.Mesh(trunkGeo, trunkMat));
    group.children[0].position.y = 0.5 * s;

    // 가지 2개
    [-1, 1].forEach(side => {
      const branchGeo = new THREE.CylinderGeometry(0.02 * s, 0.04 * s, 0.4 * s, 6);
      const branch = new THREE.Mesh(branchGeo, trunkMat);
      branch.position.set(side * 0.15 * s, 0.8 * s, 0);
      branch.rotation.z = side * 0.6;
      group.add(branch);
    });

    // 잎 뭉치 (여러 개 구)
    for (let i = 0; i < 5; i++) {
      const leafGeo = new THREE.SphereGeometry((0.25 + Math.random() * 0.15) * s, 12, 12);
      const leafMat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.8, metalness: 0
      });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(
        (Math.random() - 0.5) * 0.4 * s,
        (1.0 + Math.random() * 0.3) * s,
        (Math.random() - 0.5) * 0.4 * s
      );
      group.add(leaf);
    }
  },

  _buildPineTree(group, trunkMat, colors, s) {
    const trunkGeo = new THREE.CylinderGeometry(0.04 * s, 0.08 * s, 1.2 * s, 8);
    group.add(new THREE.Mesh(trunkGeo, trunkMat));
    group.children[0].position.y = 0.6 * s;

    // 삼각형 잎 (3단)
    for (let i = 0; i < 3; i++) {
      const size = (0.4 - i * 0.08) * s;
      const height = (0.35 - i * 0.05) * s;
      const coneGeo = new THREE.ConeGeometry(size, height, 8);
      const coneMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length], roughness: 0.7
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = (0.9 + i * 0.25) * s;
      group.add(cone);
    }
  },

  _buildCherryTree(group, trunkMat, colors, s) {
    this._buildOakTree(group, trunkMat, colors, s);
    // 꽃잎 파티클 효과용 마커
    group.userData.hasParticles = true;
    group.userData.particleType = 'sakura';
  },

  _buildCrystalTree(group, s) {
    // 크리스탈 줄기
    const trunkGeo = new THREE.CylinderGeometry(0.03 * s, 0.08 * s, 0.8 * s, 6);
    const crystalMat = ArtEngine.createCrystal({ color: 0x88DDFF, rainbow: 0.5 });
    group.add(new THREE.Mesh(trunkGeo, crystalMat));
    group.children[0].position.y = 0.4 * s;

    // 크리스탈 결정
    for (let i = 0; i < 6; i++) {
      const crystalGeo = new THREE.OctahedronGeometry(0.15 * s + Math.random() * 0.1 * s, 0);
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      const angle = (i / 6) * Math.PI * 2;
      crystal.position.set(
        Math.cos(angle) * 0.2 * s,
        (0.7 + Math.random() * 0.4) * s,
        Math.sin(angle) * 0.2 * s
      );
      crystal.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(crystal);
    }

    // 빛
    const light = new THREE.PointLight(0x88DDFF, 0.5, 3 * s);
    light.position.y = 0.9 * s;
    group.add(light);
  },

  _buildMushroomTree(group, s) {
    // 줄기
    const stemGeo = new THREE.CylinderGeometry(0.08 * s, 0.12 * s, 0.6 * s, 12);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xEEDDCC, roughness: 0.7 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.3 * s;
    group.add(stem);

    // 모자
    const capGeo = new THREE.SphereGeometry(0.35 * s, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xDD3344, roughness: 0.5, emissive: 0x440011, emissiveIntensity: 0.1
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.6 * s;
    group.add(cap);

    // 점 (흰색)
    for (let i = 0; i < 8; i++) {
      const dotGeo = new THREE.SphereGeometry(0.03 * s, 8, 8);
      const dotMat = new THREE.MeshStandardMaterial({ color: 0xFFFFEE });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      const angle = (i / 8) * Math.PI * 2;
      const h = 0.1 + Math.random() * 0.15;
      dot.position.set(
        Math.cos(angle) * 0.28 * s,
        (0.6 + h) * s,
        Math.sin(angle) * 0.28 * s
      );
      group.add(dot);
    }

    // 발광
    const light = new THREE.PointLight(0xFF4466, 0.3, 2 * s);
    light.position.y = 0.6 * s;
    group.add(light);
  },

  _buildDeadTree(group, trunkMat, s) {
    const deadMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.95 });
    const trunkGeo = new THREE.CylinderGeometry(0.05 * s, 0.1 * s, 1.2 * s, 6);
    group.add(new THREE.Mesh(trunkGeo, deadMat));
    group.children[0].position.y = 0.6 * s;

    // 마른 가지
    for (let i = 0; i < 4; i++) {
      const branchGeo = new THREE.CylinderGeometry(0.01 * s, 0.025 * s, 0.4 * s, 4);
      const branch = new THREE.Mesh(branchGeo, deadMat);
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      branch.position.set(Math.cos(angle) * 0.05 * s, (0.7 + i * 0.12) * s, Math.sin(angle) * 0.05 * s);
      branch.rotation.z = Math.cos(angle) * 0.8;
      branch.rotation.x = Math.sin(angle) * 0.4;
      group.add(branch);
    }
  },

  // ========== 🏠 건물 생성 ==========
  createBuilding(options = {}) {
    const group = new THREE.Group();
    const type = options.type || 'house';
    const s = options.scale || 1.0;

    switch (type) {
      case 'house': this._buildHouse(group, s, options); break;
      case 'shop': this._buildShop(group, s, options); break;
      case 'castle': this._buildCastle(group, s, options); break;
      case 'tower': this._buildTower(group, s, options); break;
      case 'temple': this._buildTemple(group, s, options); break;
      default: this._buildHouse(group, s, options);
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  _buildHouse(group, s, opt) {
    const wallMat = new THREE.MeshStandardMaterial({ color: opt.wallColor || 0xDDCCBB, roughness: 0.8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: opt.roofColor || 0xBB4422, roughness: 0.6 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.7 });

    // 벽
    const wallGeo = new THREE.BoxGeometry(1.0 * s, 0.8 * s, 0.8 * s);
    group.add(new THREE.Mesh(wallGeo, wallMat));
    group.children[0].position.y = 0.4 * s;

    // 지붕
    const roofGeo = new THREE.ConeGeometry(0.8 * s, 0.5 * s, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.05 * s;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    // 문
    const doorGeo = new THREE.BoxGeometry(0.2 * s, 0.4 * s, 0.02 * s);
    const door = new THREE.Mesh(doorGeo, woodMat);
    door.position.set(0, 0.2 * s, 0.41 * s);
    group.add(door);

    // 창문 2개
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xAADDFF, emissive: 0x445566, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.2
    });
    [-1, 1].forEach(side => {
      const winGeo = new THREE.BoxGeometry(0.15 * s, 0.15 * s, 0.02 * s);
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.set(side * 0.3 * s, 0.5 * s, 0.41 * s);
      group.add(win);
    });

    // 굴뚝
    const chimneyGeo = new THREE.BoxGeometry(0.1 * s, 0.3 * s, 0.1 * s);
    const chimney = new THREE.Mesh(chimneyGeo, new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 }));
    chimney.position.set(0.25 * s, 1.15 * s, 0);
    group.add(chimney);
  },

  _buildShop(group, s, opt) {
    this._buildHouse(group, s, { wallColor: 0xEEDDBB, roofColor: 0x4488AA, ...opt });

    // 간판
    const signGeo = new THREE.BoxGeometry(0.6 * s, 0.15 * s, 0.03 * s);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x885522, roughness: 0.6 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 0.75 * s, 0.42 * s);
    group.add(sign);

    // 차양
    const awningGeo = new THREE.BoxGeometry(1.1 * s, 0.02 * s, 0.3 * s);
    const awningMat = new THREE.MeshStandardMaterial({ color: opt.awningColor || 0xCC4444, roughness: 0.5, side: THREE.DoubleSide });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, 0.65 * s, 0.55 * s);
    awning.rotation.x = 0.15;
    group.add(awning);
  },

  _buildCastle(group, s, opt) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.9 });

    // 메인 건물
    const mainGeo = new THREE.BoxGeometry(1.5 * s, 1.5 * s, 1.2 * s);
    group.add(new THREE.Mesh(mainGeo, stoneMat));
    group.children[0].position.y = 0.75 * s;

    // 탑 4개
    [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([x, z]) => {
      const towerGeo = new THREE.CylinderGeometry(0.2 * s, 0.22 * s, 2.0 * s, 12);
      const tower = new THREE.Mesh(towerGeo, stoneMat);
      tower.position.set(x * 0.7 * s, 1.0 * s, z * 0.55 * s);
      group.add(tower);

      const roofGeo = new THREE.ConeGeometry(0.25 * s, 0.3 * s, 12);
      const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x2244AA, roughness: 0.4 }));
      roof.position.set(x * 0.7 * s, 2.15 * s, z * 0.55 * s);
      group.add(roof);
    });

    // 성문
    const gateGeo = new THREE.BoxGeometry(0.4 * s, 0.6 * s, 0.15 * s);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.7, metalness: 0.2 });
    const gate = new THREE.Mesh(gateGeo, gateMat);
    gate.position.set(0, 0.3 * s, 0.61 * s);
    group.add(gate);
  },

  _buildTower(group, s, opt) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: opt.color || 0x888899, roughness: 0.85 });
    const towerGeo = new THREE.CylinderGeometry(0.3 * s, 0.35 * s, 2.5 * s, 16);
    group.add(new THREE.Mesh(towerGeo, stoneMat));
    group.children[0].position.y = 1.25 * s;

    const roofGeo = new THREE.ConeGeometry(0.4 * s, 0.5 * s, 16);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x553388, roughness: 0.4 }));
    roof.position.y = 2.75 * s;
    group.add(roof);

    // 창문 (나선형)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 3;
      const winGeo = new THREE.BoxGeometry(0.08 * s, 0.12 * s, 0.02 * s);
      const winMat = new THREE.MeshStandardMaterial({ color: 0xFFDD44, emissive: 0xFFAA00, emissiveIntensity: 0.5 });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(
        Math.cos(angle) * 0.32 * s,
        (0.5 + i * 0.4) * s,
        Math.sin(angle) * 0.32 * s
      );
      win.lookAt(win.position.clone().multiplyScalar(2));
      group.add(win);
    }
  },

  _buildTemple(group, s, opt) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xDDDDBB, roughness: 0.7 });

    // 기단
    const baseGeo = new THREE.BoxGeometry(2.0 * s, 0.2 * s, 1.5 * s);
    group.add(new THREE.Mesh(baseGeo, stoneMat));
    group.children[0].position.y = 0.1 * s;

    // 기둥 6개
    for (let i = 0; i < 6; i++) {
      const x = (i % 3 - 1) * 0.6 * s;
      const z = (Math.floor(i / 3) - 0.5) * 0.8 * s;
      const pillarGeo = new THREE.CylinderGeometry(0.06 * s, 0.07 * s, 1.2 * s, 12);
      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.set(x, 0.8 * s, z);
      group.add(pillar);
    }

    // 지붕 (삼각형)
    const roofGeo = new THREE.ConeGeometry(1.2 * s, 0.4 * s, 4);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0xFFDD00, roughness: 0.3, metalness: 0.6 }));
    roof.position.y = 1.6 * s;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  },

  // ========== 🪨 소품 생성 ==========
  createProp(type, options = {}) {
    const group = new THREE.Group();
    const s = options.scale || 1.0;

    switch (type) {
      case 'rock': {
        const rockGeo = new THREE.DodecahedronGeometry(0.3 * s, 1);
        rockGeo.scale(1 + Math.random() * 0.3, 0.7 + Math.random() * 0.3, 1 + Math.random() * 0.2);
        group.add(new THREE.Mesh(rockGeo, ArtEngine.createStone(options.color)));
        break;
      }

      case 'chest': {
        const chestGeo = new THREE.BoxGeometry(0.3 * s, 0.2 * s, 0.2 * s);
        const chestMat = new THREE.MeshStandardMaterial({ color: 0x885522, roughness: 0.5, metalness: 0.2 });
        group.add(new THREE.Mesh(chestGeo, chestMat));
        group.children[0].position.y = 0.1 * s;
        // 금장
        const trimGeo = new THREE.BoxGeometry(0.32 * s, 0.02 * s, 0.22 * s);
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xFFDD00, metalness: 0.9, roughness: 0.1 });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0.2 * s;
        group.add(trim);
        break;
      }

      case 'torch': {
        const poleGeo = new THREE.CylinderGeometry(0.015 * s, 0.02 * s, 0.5 * s, 6);
        group.add(new THREE.Mesh(poleGeo, ArtEngine.createWood()));
        group.children[0].position.y = 0.25 * s;
        const flame = new THREE.PointLight(0xFF6600, 0.8, 3 * s);
        flame.position.y = 0.55 * s;
        group.add(flame);
        break;
      }

      case 'crystal_cluster': {
        for (let i = 0; i < 5; i++) {
          const cGeo = new THREE.OctahedronGeometry(0.08 * s + Math.random() * 0.06 * s, 0);
          cGeo.scale(0.6, 1.5, 0.6);
          const cMat = ArtEngine.createCrystal({ color: options.color || 0x88DDFF });
          const crystal = new THREE.Mesh(cGeo, cMat);
          crystal.position.set(
            (Math.random() - 0.5) * 0.2 * s,
            Math.random() * 0.2 * s,
            (Math.random() - 0.5) * 0.2 * s
          );
          crystal.rotation.set(Math.random() * 0.3, Math.random(), Math.random() * 0.3);
          group.add(crystal);
        }
        const cLight = new THREE.PointLight(options.color || 0x88DDFF, 0.4, 2 * s);
        cLight.position.y = 0.15 * s;
        group.add(cLight);
        break;
      }

      case 'mushroom_small': {
        const mStemGeo = new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 0.1 * s, 8);
        group.add(new THREE.Mesh(mStemGeo, new THREE.MeshStandardMaterial({ color: 0xEEDDCC })));
        group.children[0].position.y = 0.05 * s;
        const mCapGeo = new THREE.SphereGeometry(0.06 * s, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const mCap = new THREE.Mesh(mCapGeo, new THREE.MeshStandardMaterial({
          color: options.color || 0xDD3344, emissive: 0x440000, emissiveIntensity: 0.1
        }));
        mCap.position.y = 0.1 * s;
        group.add(mCap);
        break;
      }

      case 'flower': {
        const fStemGeo = new THREE.CylinderGeometry(0.005 * s, 0.008 * s, 0.15 * s, 4);
        group.add(new THREE.Mesh(fStemGeo, new THREE.MeshStandardMaterial({ color: 0x338822 })));
        group.children[0].position.y = 0.075 * s;
        const petalColor = options.color || [0xFF6688, 0xFFAACC, 0xFF88AA][Math.floor(Math.random() * 3)];
        for (let p = 0; p < 5; p++) {
          const pGeo = new THREE.SphereGeometry(0.025 * s, 8, 8);
          pGeo.scale(1.5, 0.5, 1);
          const petal = new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({ color: petalColor }));
          const angle = (p / 5) * Math.PI * 2;
          petal.position.set(Math.cos(angle) * 0.02 * s, 0.16 * s, Math.sin(angle) * 0.02 * s);
          petal.rotation.z = angle;
          group.add(petal);
        }
        // 꽃 중심
        const centerGeo = new THREE.SphereGeometry(0.012 * s, 8, 8);
        const center = new THREE.Mesh(centerGeo, new THREE.MeshStandardMaterial({ color: 0xFFDD00 }));
        center.position.y = 0.16 * s;
        group.add(center);
        break;
      }

      case 'signpost': {
        const postGeo = new THREE.CylinderGeometry(0.02 * s, 0.025 * s, 0.6 * s, 6);
        group.add(new THREE.Mesh(postGeo, ArtEngine.createWood()));
        group.children[0].position.y = 0.3 * s;
        const signBoardGeo = new THREE.BoxGeometry(0.3 * s, 0.1 * s, 0.015 * s);
        const signBoard = new THREE.Mesh(signBoardGeo, ArtEngine.createWood(0x886633));
        signBoard.position.set(0.05 * s, 0.5 * s, 0);
        group.add(signBoard);
        break;
      }
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  // ========== 🗺️ 마블 타일 비주얼 ==========
  createMarbleTile(tileType, options = {}) {
    const group = new THREE.Group();
    const s = options.scale || 1.0;

    // 기본 타일
    const tileGeo = new THREE.CylinderGeometry(0.45 * s, 0.45 * s, 0.08 * s, 6);
    const tileColors = {
      gold: 0xFFDD44, item: 0x44AAFF, bonus: 0xFFAA00, trap: 0xFF4444,
      shop: 0x44DD88, miniboss: 0xDD44FF, treasure: 0xFFDD00,
      spirit: 0x88DDFF, warp: 0xAA44FF, rest: 0x44FF88,
      start: 0x44FF44, goal: 0xFF4444
    };
    const color = tileColors[tileType] || 0xCCCCCC;
    const tileMat = new THREE.MeshStandardMaterial({
      color, roughness: 0.4, metalness: 0.3,
      emissive: color, emissiveIntensity: 0.1
    });
    group.add(new THREE.Mesh(tileGeo, tileMat));

    // 타일 테두리
    const rimGeo = new THREE.TorusGeometry(0.45 * s, 0.015 * s, 8, 6);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xFFDD00, metalness: 0.9, roughness: 0.1 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.04 * s;
    group.add(rim);

    // 타일별 소품 추가
    switch (tileType) {
      case 'shop': group.add(this.createBuilding({ type: 'shop', scale: 0.15 * s })); break;
      case 'treasure': group.add(this.createProp('chest', { scale: 0.5 * s })); break;
      case 'spirit': group.add(this.createProp('crystal_cluster', { scale: 0.5 * s })); break;
      case 'rest': group.add(this.createProp('torch', { scale: 0.5 * s })); break;
      case 'trap': {
        const skullGeo = new THREE.SphereGeometry(0.06 * s, 12, 12);
        const skull = new THREE.Mesh(skullGeo, new THREE.MeshStandardMaterial({ color: 0xDDDDBB }));
        skull.position.y = 0.12 * s;
        group.add(skull);
        break;
      }
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  // ========== 🌍 지형 생성 ==========
  createTerrain(options = {}) {
    const width = options.width || 20;
    const depth = options.depth || 20;
    const resolution = options.resolution || 64;
    const maxHeight = options.maxHeight || 2;
    const type = options.type || 'grass';

    const geo = new THREE.PlaneGeometry(width, depth, resolution, resolution);
    geo.rotateX(-Math.PI / 2);

    // 높이맵 생성 (Perlin-like 노이즈)
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const height = this._terrainNoise(x * 0.3, z * 0.3) * maxHeight;
      positions.setY(i, height);
    }
    positions.needsUpdate = true;
    geo.computeVertexNormals();

    const terrainColors = {
      grass: 0x338833, sand: 0xDDCC88, snow: 0xEEEEFF,
      lava: 0x331100, crystal: 0x1A1A3A, swamp: 0x334422
    };

    let mat;
    if (type === 'lava') {
      mat = ArtEngine.createLava();
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: terrainColors[type] || 0x338833,
        roughness: 0.85,
        metalness: 0.05
      });
    }

    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    return terrain;
  },

  _terrainNoise(x, z) {
    // 간단한 value noise
    const n = (Math.sin(x * 1.5) * Math.cos(z * 1.5) * 0.5 +
              Math.sin(x * 3.7 + 1.3) * Math.cos(z * 2.8 + 0.7) * 0.25 +
              Math.sin(x * 7.1 + 2.1) * Math.cos(z * 6.3 + 1.1) * 0.125);
    return n;
  },

  // ========== 3D→2D 스프라이트 렌더링 ==========
  renderToSprite(type, options = {}) {
    if (typeof ArtEngine !== 'undefined' && ArtEngine.renderEnvironmentSprite) {
      return ArtEngine.renderEnvironmentSprite(type, options);
    }
    return null;
  },

  // 웹엔진 연동
  connectToEngine() {
    console.log('[ArtEnvironment] 환경 미술 생성기 준비 완료');
  }
};

if (typeof window !== 'undefined') window.ArtEnvironment = ArtEnvironment;
if (typeof module !== 'undefined') module.exports = ArtEnvironment;
