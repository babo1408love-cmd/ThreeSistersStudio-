// ============================================================
// 🎯 몽글벨 웹엔진 - 파티 배치 AI
// ============================================================
// 주인공 주위에 영웅/펫/정령을 자동 배치
// 유닛 수 + 크기 + 역할 파악 → 최적 포메이션
// 가까이 뭉쳐서 배치 (겹치지 않게)
//
// Claude Code: js/ai/formation-ai.js 에 넣으세요
// ============================================================

const FormationAI = {

  // ========== 유닛 크기 데이터 ==========
  UNIT_SIZES: {
    // 영웅 (클래스별)
    hero_warrior:   { radius: 0.45, height: 1.8 },
    hero_mage:      { radius: 0.35, height: 1.7 },
    hero_archer:    { radius: 0.35, height: 1.75 },
    hero_knight:    { radius: 0.55, height: 1.9 },
    hero_cleric:    { radius: 0.35, height: 1.7 },
    hero_rogue:     { radius: 0.30, height: 1.65 },
    hero_summoner:  { radius: 0.35, height: 1.7 },
    hero_alchemist: { radius: 0.38, height: 1.7 },

    // 펫 (타입별)
    pet_cat:     { radius: 0.20, height: 0.4 },
    pet_dog:     { radius: 0.25, height: 0.5 },
    pet_bird:    { radius: 0.15, height: 0.3 },
    pet_dragon:  { radius: 0.40, height: 0.8 },
    pet_slime:   { radius: 0.20, height: 0.3 },
    pet_fox:     { radius: 0.22, height: 0.45 },
    pet_rabbit:  { radius: 0.18, height: 0.35 },
    pet_wolf:    { radius: 0.30, height: 0.55 },
    pet_unicorn: { radius: 0.40, height: 0.9 },

    // 정령 (등급별)
    spirit_common:    { radius: 0.15, height: 0.4 },
    spirit_uncommon:  { radius: 0.18, height: 0.45 },
    spirit_rare:      { radius: 0.20, height: 0.5 },
    spirit_epic:      { radius: 0.25, height: 0.55 },
    spirit_legendary: { radius: 0.30, height: 0.65 },
    spirit_mythic:    { radius: 0.35, height: 0.75 }
  },

  // ========== 역할별 배치 우선도 ==========
  // 낮을수록 주인공 가까이
  ROLE_PRIORITY: {
    tank:       1,  // 앞줄
    tank_dps:   1,
    healer:     4,  // 뒷줄
    support:    3,  // 중간~뒤
    magic_dps:  3,  // 중간~뒤
    ranged_dps: 3,  // 중간~뒤
    assassin:   2,  // 측면
    utility:    3,  // 중간
    pet:        5,  // 주인공 바로 옆
    spirit:     6   // 주인공 머리 위/주변 떠다님
  },

  // ========== 포메이션 템플릿 ==========
  FORMATIONS: {
    // 영웅 1명 (주인공만)
    solo: {
      heroes: [],
      petOffset: { x: 0.5, y: 0, z: -0.3 },
      spiritBaseY: 1.5
    },

    // 영웅 2명
    duo: {
      heroes: [
        { x: -0.6, y: 0, z: 0 }   // 옆에
      ],
      petOffset: { x: 0.5, y: 0, z: -0.4 },
      spiritBaseY: 1.5
    },

    // 영웅 3명 (삼각형)
    trio: {
      heroes: [
        { x: -0.7, y: 0, z: 0.3 },
        { x: 0.7, y: 0, z: 0.3 }
      ],
      petOffset: { x: 0, y: 0, z: -0.5 },
      spiritBaseY: 1.6
    },

    // 영웅 4명 (다이아몬드)
    quad: {
      heroes: [
        { x: -0.8, y: 0, z: 0 },
        { x: 0.8, y: 0, z: 0 },
        { x: 0, y: 0, z: 0.8 }
      ],
      petOffset: { x: 0, y: 0, z: -0.6 },
      spiritBaseY: 1.7
    },

    // 영웅 5명 (V자 대형)
    full: {
      heroes: [
        { x: -0.7, y: 0, z: 0.3 },   // 좌측 앞
        { x: 0.7, y: 0, z: 0.3 },    // 우측 앞
        { x: -1.0, y: 0, z: -0.4 },  // 좌측 뒤
        { x: 1.0, y: 0, z: -0.4 }    // 우측 뒤
      ],
      petOffset: { x: 0.4, y: 0, z: -0.6 },
      spiritBaseY: 1.8
    }
  },

  // =============================================================
  // 🧠 메인: 파티 파악 + 자동 배치
  // =============================================================
  calculateFormation(partyData, mainHeroPos) {
    const heroX = mainHeroPos?.x || 0;
    const heroY = mainHeroPos?.y || 0;
    const heroZ = mainHeroPos?.z || 0;

    // 파티 파악
    const heroes = partyData.heroes || [];
    const pet = partyData.pet || null;
    const spirits = partyData.spirits || [];

    const heroCount = heroes.length;  // 슬롯 영웅 수 (주인공 포함)
    const petCount = pet ? 1 : 0;
    const spiritCount = spirits.length;

    console.log(`[FormationAI] 파티 파악: 영웅 ${heroCount}명, 펫 ${petCount}마리, 정령 ${spiritCount}마리`);

    // 포메이션 선택
    let formationKey;
    if (heroCount <= 1) formationKey = 'solo';
    else if (heroCount === 2) formationKey = 'duo';
    else if (heroCount === 3) formationKey = 'trio';
    else if (heroCount === 4) formationKey = 'quad';
    else formationKey = 'full';

    const formation = this.FORMATIONS[formationKey];
    const result = { positions: [], totalUnits: heroCount + petCount + spiritCount };

    // ─────────────────────────────────
    // 1. 주인공 (항상 중심)
    // ─────────────────────────────────
    if (heroCount > 0) {
      const mainHero = heroes[0];
      const mainSize = this._getHeroSize(mainHero);

      result.positions.push({
        unitId: mainHero.id,
        unitType: 'hero_main',
        x: heroX,
        y: heroY,
        z: heroZ,
        radius: mainSize.radius,
        height: mainSize.height,
        role: mainHero.role || 'tank_dps',
        isMainHero: true
      });
    }

    // ─────────────────────────────────
    // 2. 슬롯 영웅 배치 (역할 기반 정렬)
    // ─────────────────────────────────
    const slotHeroes = heroes.slice(1); // 주인공 제외
    const sortedHeroes = this._sortByRole(slotHeroes);

    sortedHeroes.forEach((hero, index) => {
      if (index >= formation.heroes.length) return;

      const template = formation.heroes[index];
      const size = this._getHeroSize(hero);
      const roleOffset = this._getRoleOffset(hero.role);

      // 역할에 따라 위치 조정
      let finalX = heroX + template.x * (1 + size.radius * 0.5);
      let finalZ = heroZ + template.z + roleOffset.z;

      // 탱크는 앞으로, 힐러는 뒤로
      if (hero.role === 'tank' || hero.role === 'tank_dps') {
        finalZ += 0.3;  // 앞으로
      }
      if (hero.role === 'healer' || hero.role === 'support') {
        finalZ -= 0.3;  // 뒤로
      }
      if (hero.role === 'assassin') {
        finalX += (template.x > 0 ? 0.3 : -0.3); // 측면으로
      }

      // 겹침 방지
      const adjusted = this._preventOverlap(
        { x: finalX, z: finalZ, radius: size.radius },
        result.positions
      );

      result.positions.push({
        unitId: hero.id,
        unitType: 'hero_slot',
        x: adjusted.x,
        y: heroY,
        z: adjusted.z,
        radius: size.radius,
        height: size.height,
        role: hero.role,
        class: hero.class,
        slotIndex: index + 1
      });
    });

    // ─────────────────────────────────
    // 3. 펫 배치 (주인공 바로 옆)
    // ─────────────────────────────────
    if (pet) {
      const petSize = this._getPetSize(pet);
      const petOffset = formation.petOffset;

      // 펫은 주인공 발 옆에
      let petX = heroX + petOffset.x;
      let petZ = heroZ + petOffset.z;

      // 겹침 방지
      const adjustedPet = this._preventOverlap(
        { x: petX, z: petZ, radius: petSize.radius },
        result.positions
      );

      result.positions.push({
        unitId: pet.id,
        unitType: 'pet',
        petType: pet.type,
        x: adjustedPet.x,
        y: heroY, // 바닥에
        z: adjustedPet.z,
        radius: petSize.radius,
        height: petSize.height,
        floatHeight: 0 // 펫은 바닥
      });
    }

    // ─────────────────────────────────
    // 4. 정령 배치 (주인공 머리 위 원형)
    // ─────────────────────────────────
    if (spiritCount > 0) {
      const spiritY = formation.spiritBaseY;
      const spiritPositions = this._arrangeSpiritCircle(
        spirits, heroX, heroY + spiritY, heroZ, spiritCount
      );

      spiritPositions.forEach((sp, i) => {
        result.positions.push({
          unitId: spirits[i].id,
          unitType: 'spirit',
          element: spirits[i].element,
          rarity: spirits[i].rarity,
          x: sp.x,
          y: sp.y,
          z: sp.z,
          radius: sp.radius,
          height: sp.height,
          floatHeight: sp.y - heroY, // 떠있는 높이
          orbitAngle: sp.orbitAngle,  // 공전 각도
          orbitRadius: sp.orbitRadius,
          orbitSpeed: sp.orbitSpeed
        });
      });
    }

    // 5. 총 바운딩 박스 계산
    result.boundingBox = this._calculateBoundingBox(result.positions);

    console.log(`[FormationAI] 배치 완료: ${result.positions.length}유닛, 포메이션: ${formationKey}`);
    return result;
  },

  // =============================================================
  // 🔄 실시간 업데이트 (매 프레임 - 정령 공전 등)
  // =============================================================
  update(formation, mainHeroPos, dt) {
    if (!formation || !formation.positions) return;

    const heroX = mainHeroPos.x;
    const heroY = mainHeroPos.y || 0;
    const heroZ = mainHeroPos.z;
    const time = Date.now() * 0.001;

    formation.positions.forEach(unit => {
      // 정령: 주인공 주위 공전
      if (unit.unitType === 'spirit') {
        const angle = unit.orbitAngle + time * unit.orbitSpeed;
        unit.x = heroX + Math.cos(angle) * unit.orbitRadius;
        unit.z = heroZ + Math.sin(angle) * unit.orbitRadius;
        unit.y = heroY + unit.floatHeight + Math.sin(time * 2 + unit.orbitAngle) * 0.1; // 위아래 살랑
      }

      // 영웅/펫: 주인공 따라가기 (부드럽게)
      if (unit.unitType === 'hero_slot' || unit.unitType === 'pet') {
        const offsetX = unit.x - (unit._lastHeroX || heroX);
        const offsetZ = unit.z - (unit._lastHeroZ || heroZ);
        const targetX = heroX + (unit._baseOffsetX || (unit.x - heroX));
        const targetZ = heroZ + (unit._baseOffsetZ || (unit.z - heroZ));

        // 초기 오프셋 저장
        if (!unit._baseOffsetX) {
          unit._baseOffsetX = unit.x - heroX;
          unit._baseOffsetZ = unit.z - heroZ;
        }

        // 부드럽게 따라가기 (lerp)
        const followSpeed = unit.unitType === 'pet' ? 8 : 5;
        unit.x += (targetX - unit.x) * Math.min(1, followSpeed * dt);
        unit.z += (targetZ - unit.z) * Math.min(1, followSpeed * dt);
        unit.y = heroY;
      }

      unit._lastHeroX = heroX;
      unit._lastHeroZ = heroZ;
    });
  },

  // =============================================================
  // 🔀 포메이션 전환 (전투/이동/대기)
  // =============================================================
  switchFormation(currentFormation, mode, mainHeroPos) {
    if (!currentFormation) return;

    const heroX = mainHeroPos.x;
    const heroZ = mainHeroPos.z;
    const heroes = currentFormation.positions.filter(p => p.unitType === 'hero_slot');

    switch (mode) {
      case 'combat':
        // 전투: 횡렬 (넓게 퍼짐)
        heroes.forEach((hero, i) => {
          const spread = 1.2;
          const angle = ((i - (heroes.length - 1) / 2) / Math.max(1, heroes.length - 1)) * Math.PI * 0.6;
          hero._baseOffsetX = Math.sin(angle) * spread;
          hero._baseOffsetZ = Math.cos(angle) * spread * 0.5;
        });
        break;

      case 'move':
        // 이동: V자 대형 (좁게)
        heroes.forEach((hero, i) => {
          const row = Math.floor(i / 2);
          const side = i % 2 === 0 ? -1 : 1;
          hero._baseOffsetX = side * (0.5 + row * 0.3);
          hero._baseOffsetZ = -row * 0.5;
        });
        break;

      case 'idle':
        // 대기: 원형
        heroes.forEach((hero, i) => {
          const angle = (i / heroes.length) * Math.PI * 2;
          hero._baseOffsetX = Math.cos(angle) * 0.8;
          hero._baseOffsetZ = Math.sin(angle) * 0.8;
        });
        break;

      case 'defend':
        // 방어: 밀집 (뭉침)
        heroes.forEach((hero, i) => {
          const angle = (i / heroes.length) * Math.PI * 2;
          hero._baseOffsetX = Math.cos(angle) * 0.4;
          hero._baseOffsetZ = Math.sin(angle) * 0.4;
        });
        break;
    }
  },

  // =============================================================
  // 🔧 내부 함수
  // =============================================================

  _getHeroSize(hero) {
    const key = `hero_${hero.class || 'warrior'}`;
    const size = this.UNIT_SIZES[key] || this.UNIT_SIZES.hero_warrior;

    // 레벨/등급에 따른 미세 조정
    const bulkMult = hero.bulk || 1.0;
    return {
      radius: size.radius * bulkMult,
      height: size.height * (hero.heightMult || 1.0)
    };
  },

  _getPetSize(pet) {
    const key = `pet_${pet.type || 'cat'}`;
    const size = this.UNIT_SIZES[key] || this.UNIT_SIZES.pet_cat;

    // 등급에 따른 크기 증가
    const rarityMult = {
      common: 1.0, uncommon: 1.0, rare: 1.1,
      epic: 1.2, legendary: 1.4, mythic: 1.6
    }[pet.rarity || 'common'];

    return {
      radius: size.radius * rarityMult,
      height: size.height * rarityMult
    };
  },

  _getSpiritSize(spirit) {
    const key = `spirit_${spirit.rarity || 'common'}`;
    return this.UNIT_SIZES[key] || this.UNIT_SIZES.spirit_common;
  },

  // 역할 기반 정렬 (탱크 앞, 힐러 뒤)
  _sortByRole(heroes) {
    return [...heroes].sort((a, b) => {
      const priorityA = this.ROLE_PRIORITY[a.role] || 3;
      const priorityB = this.ROLE_PRIORITY[b.role] || 3;
      return priorityA - priorityB;
    });
  },

  // 역할별 Z 오프셋
  _getRoleOffset(role) {
    switch (role) {
      case 'tank':
      case 'tank_dps':   return { z: 0.3 };   // 앞
      case 'healer':
      case 'support':    return { z: -0.4 };   // 뒤
      case 'assassin':   return { z: 0.1 };    // 앞~중간
      case 'magic_dps':
      case 'ranged_dps': return { z: -0.2 };   // 중간~뒤
      default:           return { z: 0 };
    }
  },

  // 정령 원형 배치
  _arrangeSpiritCircle(spirits, cx, cy, cz, count) {
    const positions = [];

    // 정령 수에 따라 반지름 조절
    const baseRadius = count <= 3 ? 0.5 : count <= 6 ? 0.7 : count <= 8 ? 0.9 : 1.1;

    spirits.forEach((spirit, i) => {
      const size = this._getSpiritSize(spirit);
      const angle = (i / count) * Math.PI * 2;
      const orbitRadius = baseRadius + size.radius;

      // 2층 배치 (8마리 이상이면)
      let layerY = 0;
      if (count > 6 && i >= Math.ceil(count / 2)) {
        layerY = 0.4; // 위층
      }

      positions.push({
        x: cx + Math.cos(angle) * orbitRadius,
        y: cy + layerY,
        z: cz + Math.sin(angle) * orbitRadius,
        radius: size.radius,
        height: size.height,
        orbitAngle: angle,
        orbitRadius: orbitRadius,
        orbitSpeed: 0.3 + Math.random() * 0.2 // 각자 다른 속도
      });
    });

    return positions;
  },

  // 겹침 방지
  _preventOverlap(newUnit, existingPositions) {
    let x = newUnit.x;
    let z = newUnit.z;
    const r = newUnit.radius;
    let attempts = 0;

    while (attempts < 20) {
      let overlapping = false;

      for (const existing of existingPositions) {
        const dx = x - existing.x;
        const dz = z - existing.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = r + existing.radius + 0.08; // 8cm 여유

        if (dist < minDist) {
          overlapping = true;
          // 밀어내기
          const push = (minDist - dist) + 0.05;
          const angle = Math.atan2(dz, dx);
          x += Math.cos(angle) * push;
          z += Math.sin(angle) * push;
          break;
        }
      }

      if (!overlapping) break;
      attempts++;
    }

    return { x, z };
  },

  // 바운딩 박스
  _calculateBoundingBox(positions) {
    if (positions.length === 0) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, depth: 0 };

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    positions.forEach(p => {
      minX = Math.min(minX, p.x - p.radius);
      maxX = Math.max(maxX, p.x + p.radius);
      minZ = Math.min(minZ, p.z - p.radius);
      maxZ = Math.max(maxZ, p.z + p.radius);
    });

    return {
      minX, maxX, minZ, maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2
    };
  },

  // =============================================================
  // 📊 디버그: 배치 시각화 데이터
  // =============================================================
  getDebugView(formation) {
    if (!formation) return '';

    let output = '=== 파티 배치 ===\n';
    formation.positions.forEach(p => {
      const icon = p.unitType === 'hero_main' ? '👑' :
                   p.unitType === 'hero_slot' ? '⚔️' :
                   p.unitType === 'pet' ? '🐾' : '✨';
      output += `${icon} ${p.unitId} [${p.x.toFixed(1)}, ${p.z.toFixed(1)}] r=${p.radius.toFixed(2)}\n`;
    });

    const bb = formation.boundingBox;
    output += `\n범위: ${bb.width.toFixed(1)} x ${bb.depth.toFixed(1)}m`;
    output += `\n총 유닛: ${formation.totalUnits}`;
    return output;
  },

  connectToEngine() {
    console.log('[FormationAI] 파티 배치 AI 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.FormationAI = FormationAI;
if (typeof module !== 'undefined') module.exports = FormationAI;
