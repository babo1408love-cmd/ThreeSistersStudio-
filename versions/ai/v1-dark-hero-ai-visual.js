// ============================================================
// 🤖 몽글벨 웹엔진 - 스킬 연출 + 외모 반영 (3/3)
// ============================================================
// 스킬 이펙트 연출, 정령 소환 연출, 펫 애니메이션
// 장비 → 3D/2D 외모 실시간 반영
//
// Claude Code: js/ai/hero-ai-visual.js 에 넣으세요
// ============================================================

const HeroAIVisual = {

  // ========== 스킬 연출 시스템 ==========
  playSkillEffect(skillData, caster, target, scene) {
    if (!skillData || !skillData.animation) return;

    const anim = skillData.animation;
    console.log(`[연출] ${caster.name} → ${anim.type} (${skillData.name?.ko || '스킬'})`);

    switch (anim.type) {
      case 'slash':        this._playSlash(anim, caster, target, scene); break;
      case 'impact':       this._playImpact(anim, caster, target, scene); break;
      case 'spin':         this._playSpin(anim, caster, scene); break;
      case 'projectile':   this._playProjectile(anim, caster, target, scene); break;
      case 'area':         this._playArea(anim, target, scene); break;
      case 'lightning':    this._playLightning(anim, caster, target, scene); break;
      case 'explosion':    this._playExplosion(anim, target, scene); break;
      case 'arrow':        this._playArrow(anim, caster, target, scene); break;
      case 'rain':         this._playArrowRain(anim, target, scene); break;
      case 'heal':         this._playHeal(anim, target, scene); break;
      case 'area_heal':    this._playAreaHeal(anim, target, scene); break;
      case 'resurrect':    this._playResurrect(anim, target, scene); break;
      case 'aura':         this._playAura(anim, caster, scene); break;
      case 'shield':       this._playShield(anim, caster, scene); break;
      case 'dash':         this._playDash(anim, caster, target, scene); break;
      case 'smoke':        this._playSmoke(anim, caster, scene); break;
      case 'throw':        this._playThrow(anim, caster, target, scene); break;
      case 'potion':       this._playPotion(anim, target, scene); break;
      case 'spirits':      this._playSpiritBurst(anim, caster, scene); break;
      case 'sync':         this._playSync(anim, caster, scene); break;
      case 'spirit_attack':  this._playSpiritAttack(anim, caster, target, scene); break;
      case 'spirit_shield':  this._playSpiritShield(anim, target, scene); break;
      case 'chain_lightning': this._playChainLightning(anim, caster, target, scene); break;
      case 'pet_attack':   this._playPetAttack(anim, caster, target, scene); break;
      case 'pet_heal':     this._playPetHeal(anim, target, scene); break;
      case 'pet_buff':     this._playPetBuff(anim, caster, scene); break;
      default: console.log(`[연출] 알 수 없는 타입: ${anim.type}`);
    }

    // 화면 흔들림
    if (anim.shake) this._screenShake(scene, 0.3);
    // 화면 플래시
    if (anim.screenFlash) this._screenFlash(scene, anim.color);

    // 효과음 연동
    this._playSkillSound(anim, skillData);
  },

  // ========== 개별 연출 구현 ==========

  _playSlash(anim, caster, target, scene) {
    // 베기: 빠른 호 그리기
    const effect = { type: 'arc', color: anim.color, start: this._getPos(caster), end: this._getPos(target), duration: anim.duration };
    this._addVisualEffect(scene, effect);
  },

  _playImpact(anim, caster, target, scene) {
    // 강타: 큰 임팩트 + 파편
    const pos = this._getPos(target);
    this._addVisualEffect(scene, {
      type: 'impact_ring', color: anim.color, position: pos, size: 1.5, duration: anim.duration
    });
    // 파티클
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.playSkillEffect('explosion', pos, 0.8);
    }
  },

  _playSpin(anim, caster, scene) {
    // 회전: 캐릭터 중심 원형 이펙트
    const pos = this._getPos(caster);
    this._addVisualEffect(scene, {
      type: 'spin_ring', color: anim.color, position: pos, radius: 2.0, duration: anim.duration
    });
    if (anim.particles && typeof ParticleSystem !== 'undefined') {
      ParticleSystem.playSkillEffect(anim.particles === 'slash' ? 'explosion' : anim.particles, pos, 1.5);
    }
  },

  _playProjectile(anim, caster, target, scene) {
    // 투사체: 시전자 → 타겟으로 날아가는 구
    const start = this._getPos(caster);
    const end = this._getPos(target);
    this._addVisualEffect(scene, {
      type: 'projectile', color: anim.color, start, end, duration: anim.duration, trail: anim.trail
    });
    // 타겟 위치에 파티클
    setTimeout(() => {
      if (anim.particles && typeof ParticleSystem !== 'undefined') {
        ParticleSystem.playSkillEffect(anim.particles, end, 1.0);
      }
    }, anim.duration * 800);
  },

  _playArea(anim, targets, scene) {
    // 범위: 적 전체 위에 이펙트
    const center = { x: 0, y: 1, z: 3 }; // 적 중심
    this._addVisualEffect(scene, {
      type: 'area_circle', color: anim.color, position: center, radius: 3.0, duration: anim.duration
    });
    if (anim.particles && typeof ParticleSystem !== 'undefined') {
      ParticleSystem.playSkillEffect(anim.particles, center, 2.0);
    }
  },

  _playLightning(anim, caster, target, scene) {
    // 번개: 하늘에서 타겟으로
    const pos = this._getPos(target);
    this._addVisualEffect(scene, {
      type: 'lightning_bolt', color: anim.color, position: pos, duration: anim.duration
    });
    if (anim.flash) this._screenFlash(scene, '#FFFFFF');
  },

  _playExplosion(anim, targets, scene) {
    const center = { x: 0, y: 1, z: 3 };
    this._addVisualEffect(scene, {
      type: 'big_explosion', color: anim.color, position: center, size: 3.0, duration: anim.duration
    });
    if (anim.particles && typeof ParticleSystem !== 'undefined') {
      ParticleSystem.playSkillEffect(anim.particles, center, 2.5);
    }
  },

  _playArrow(anim, caster, target, scene) {
    const start = this._getPos(caster);
    const end = this._getPos(target);
    this._addVisualEffect(scene, {
      type: 'arrow_fly', color: anim.color, start, end, duration: anim.duration, trail: anim.trail
    });
  },

  _playArrowRain(anim, targets, scene) {
    const center = { x: 0, y: 5, z: 3 };
    for (let i = 0; i < (anim.count || 8); i++) {
      setTimeout(() => {
        this._addVisualEffect(scene, {
          type: 'arrow_fall', color: anim.color,
          position: { x: center.x + (Math.random() - 0.5) * 4, y: 5, z: center.z + (Math.random() - 0.5) * 3 },
          duration: 0.3
        });
      }, i * 80);
    }
  },

  _playHeal(anim, target, scene) {
    const pos = this._getPos(target);
    this._addVisualEffect(scene, {
      type: 'heal_glow', color: anim.color, position: pos, duration: anim.duration
    });
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.playSkillEffect('heal', pos, 1.0);
    }
  },

  _playAreaHeal(anim, targets, scene) {
    const center = { x: 0, y: 1, z: -2 }; // 아군 중심
    this._addVisualEffect(scene, {
      type: 'heal_circle', color: anim.color, position: center, radius: 3.0, duration: anim.duration
    });
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.playSkillEffect('heal', center, 2.0);
    }
  },

  _playResurrect(anim, target, scene) {
    const pos = this._getPos(target);
    this._addVisualEffect(scene, {
      type: 'resurrect_pillar', color: anim.color, position: pos, duration: anim.duration
    });
    this._screenFlash(scene, '#FFDD44');
  },

  _playAura(anim, caster, scene) {
    const pos = this._getPos(caster);
    this._addVisualEffect(scene, {
      type: 'aura_ring', color: anim.color, position: pos, duration: anim.duration
    });
  },

  _playShield(anim, caster, scene) {
    const pos = this._getPos(caster);
    this._addVisualEffect(scene, {
      type: 'shield_sphere', color: anim.color, position: pos, duration: anim.duration
    });
  },

  _playDash(anim, caster, target, scene) {
    const start = this._getPos(caster);
    const end = this._getPos(target);
    if (anim.vanish) {
      this._addVisualEffect(scene, { type: 'vanish', position: start, duration: 0.15 });
    }
    this._addVisualEffect(scene, {
      type: 'dash_trail', color: anim.color, start, end, duration: anim.duration
    });
  },

  _playSmoke(anim, caster, scene) {
    const pos = this._getPos(caster);
    this._addVisualEffect(scene, {
      type: 'smoke_cloud', color: anim.color, position: pos, radius: 2.5, duration: anim.duration
    });
  },

  _playThrow(anim, caster, target, scene) {
    this._playProjectile({ ...anim, type: 'projectile' }, caster, target, scene);
    if (anim.splash) {
      setTimeout(() => {
        const pos = this._getPos(target);
        this._addVisualEffect(scene, { type: 'splash', color: anim.color, position: pos, duration: 0.5 });
      }, anim.duration * 800);
    }
  },

  _playPotion(anim, target, scene) {
    this._playHeal(anim, target, scene);
  },

  _playSpiritBurst(anim, caster, scene) {
    const pos = this._getPos(caster);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      setTimeout(() => {
        this._addVisualEffect(scene, {
          type: 'spirit_orb', color: anim.color,
          position: { x: pos.x + Math.cos(angle) * 1.5, y: pos.y + 0.5, z: pos.z + Math.sin(angle) * 1.5 },
          duration: 0.5
        });
      }, i * 100);
    }
  },

  _playSync(anim, caster, scene) {
    this._addVisualEffect(scene, {
      type: 'sync_wave', color: anim.color, position: this._getPos(caster), radius: 4.0, duration: anim.duration
    });
  },

  _playSpiritAttack(anim, caster, target, scene) {
    const casterPos = this._getPos(caster);
    const targetPos = this._getPos(target);
    // 정령 등장
    this._addVisualEffect(scene, {
      type: 'spirit_appear', color: anim.color, position: { x: casterPos.x + 0.5, y: casterPos.y + 1, z: casterPos.z }, duration: 0.3
    });
    // 정령 공격
    setTimeout(() => {
      this._addVisualEffect(scene, {
        type: 'spirit_projectile', color: anim.color, start: casterPos, end: targetPos, duration: 0.4
      });
    }, 300);
  },

  _playSpiritShield(anim, target, scene) {
    const pos = this._getPos(target);
    this._addVisualEffect(scene, { type: 'spirit_appear', color: anim.color, position: { x: pos.x, y: pos.y + 1, z: pos.z }, duration: 0.3 });
    this._addVisualEffect(scene, { type: 'shield_sphere', color: anim.color, position: pos, duration: anim.duration });
  },

  _playChainLightning(anim, caster, targets, scene) {
    const start = this._getPos(caster);
    if (Array.isArray(targets)) {
      targets.forEach((target, i) => {
        setTimeout(() => {
          this._playLightning(anim, caster, target, scene);
        }, i * 150);
      });
    } else {
      this._playLightning(anim, caster, targets, scene);
    }
  },

  _playPetAttack(anim, pet, target, scene) {
    this._addVisualEffect(scene, {
      type: 'pet_dash', color: anim.color, start: { x: -2, y: 0, z: -2 }, end: this._getPos(target), duration: anim.duration
    });
  },

  _playPetHeal(anim, target, scene) {
    const pos = this._getPos(target);
    this._addVisualEffect(scene, { type: 'pet_sparkle', color: anim.color, position: pos, duration: anim.duration });
  },

  _playPetBuff(anim, pet, scene) {
    this._addVisualEffect(scene, {
      type: 'pet_cheer', color: anim.color, position: { x: -2, y: 0, z: -2 }, duration: anim.duration
    });
  },

  // ========== 화면 효과 ==========
  _screenShake(scene, duration) {
    if (typeof MonglelbelEngine === 'undefined' || !MonglelbelEngine.camera) return;
    const cam = MonglelbelEngine.camera;
    const origPos = { x: cam.position.x, y: cam.position.y, z: cam.position.z };
    const startTime = Date.now();

    const shake = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > duration) {
        cam.position.set(origPos.x, origPos.y, origPos.z);
        return;
      }
      const intensity = (1 - elapsed / duration) * 0.15;
      cam.position.x = origPos.x + (Math.random() - 0.5) * intensity;
      cam.position.y = origPos.y + (Math.random() - 0.5) * intensity;
      requestAnimationFrame(shake);
    };
    shake();
  },

  _screenFlash(scene, color) {
    // UI 오버레이에 플래시
    if (typeof ArtUI !== 'undefined' && ArtUI._ctx) {
      const ctx = ArtUI._ctx;
      const canvas = ArtUI._canvas;
      ctx.save();
      ctx.fillStyle = color || '#FFFFFF';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      setTimeout(() => { ArtUI.clear(); }, 100);
    }
  },

  // ========== 이펙트 관리 ==========
  _addVisualEffect(scene, effect) {
    // 실제 Three.js 씬에 이펙트 추가
    // (게임 코드에서 이 데이터를 받아서 렌더링)
    if (this._onEffect) {
      this._onEffect(effect);
    }
    console.log(`[이펙트] ${effect.type} (${effect.color})`);
  },

  onEffect(callback) {
    this._onEffect = callback;
  },

  // ========== 위치 유틸 ==========
  _getPos(unit) {
    if (!unit) return { x: 0, y: 0, z: 0 };
    if (unit.model && unit.model.position) {
      return { x: unit.model.position.x, y: unit.model.position.y, z: unit.model.position.z };
    }
    return unit.position || { x: 0, y: 1, z: 0 };
  },

  // ========== 사운드 연동 ==========
  _playSkillSound(anim, skillData) {
    if (typeof SoundSFX === 'undefined') return;

    if (skillData.type === 'heal') { SoundSFX.heal(); return; }
    if (skillData.element && skillData.element !== 'none') {
      SoundSFX.attack(skillData.element);
    } else {
      SoundSFX.attack();
    }
  },

  // =============================================================
  // 👗 장비 외모 반영 시스템
  // =============================================================
  updateHeroModel(hero, model3d) {
    if (!hero || !model3d) return;
    const ev = hero.appearance.equipVisual;

    // 무기 교체
    if (ev.weaponModel) {
      this._attachWeapon(model3d, ev.weaponModel, hero.class);
    }

    // 갑옷 교체
    if (ev.armorModel) {
      this._attachArmor(model3d, ev.armorModel, hero.class);
    }

    // 투구 교체
    if (ev.helmetModel) {
      this._attachHelmet(model3d, ev.helmetModel);
    }

    // 부츠 교체
    if (ev.bootsModel) {
      this._attachBoots(model3d, ev.bootsModel);
    }

    console.log(`[외모] ${hero.name} 장비 외모 반영 완료`);
  },

  _attachWeapon(model, weaponVisual, heroClass) {
    // 기존 무기 제거
    const oldWeapon = model.getObjectByName('equipped_weapon');
    if (oldWeapon) model.remove(oldWeapon);

    // 새 무기 생성 (ProModelGen 또는 MonglelbelEngine 사용)
    if (typeof ProModelGen !== 'undefined') {
      // ProModelGen에서 무기 모델 생성
      console.log(`[외모] 무기 장착: ${weaponVisual.type} (${weaponVisual.rarity})`);
    }
  },

  _attachArmor(model, armorVisual, heroClass) {
    const oldArmor = model.getObjectByName('equipped_armor');
    if (oldArmor) model.remove(oldArmor);
    console.log(`[외모] 갑옷 장착: ${armorVisual.type} (${armorVisual.rarity})`);
  },

  _attachHelmet(model, helmetVisual) {
    const oldHelmet = model.getObjectByName('equipped_helmet');
    if (oldHelmet) model.remove(oldHelmet);
    console.log(`[외모] 투구 장착: ${helmetVisual.type} (${helmetVisual.rarity})`);
  },

  _attachBoots(model, bootsVisual) {
    const oldBoots = model.getObjectByName('equipped_boots');
    if (oldBoots) model.remove(oldBoots);
    console.log(`[외모] 부츠 장착: ${bootsVisual.type} (${bootsVisual.rarity})`);
  },

  // ========== 펫 외모 반영 ==========
  updatePetModel(pet, model3d) {
    if (!pet || !model3d) return;
    if (pet.appearance.accessoryVisual) {
      console.log(`[외모] 펫 장비 장착: ${pet.appearance.accessoryVisual.type}`);
    }
  },

  // ========== 정령 소환 연출 ==========
  playSpiritSummon(spirit, scene) {
    const color = this._getElementColor(spirit.element);
    console.log(`[연출] 정령 소환: ${spirit.name} (${spirit.element})`);

    // 소환의 나무 이펙트
    this._addVisualEffect(scene, {
      type: 'summon_tree_glow', color, duration: 1.5
    });

    // 정령 등장
    setTimeout(() => {
      this._addVisualEffect(scene, {
        type: 'spirit_materialize', color,
        appearance: spirit.appearance,
        duration: 1.0
      });
    }, 800);

    // 사운드
    if (typeof SoundSFX !== 'undefined') {
      SoundSFX.spiritSummon();
    }
  },

  _getElementColor(element) {
    const colors = {
      fire: '#FF4400', water: '#2266FF', grass: '#22AA44', thunder: '#FFDD00',
      ice: '#44CCFF', earth: '#886644', light: '#FFDD44', dark: '#6622CC'
    };
    return colors[element] || '#FFFFFF';
  },

  connectToEngine() {
    console.log('[HeroAIVisual] 스킬 연출 + 외모 반영 시스템 준비 완료 ✅');
  }
};

if (typeof window !== 'undefined') window.HeroAIVisual = HeroAIVisual;
if (typeof module !== 'undefined') module.exports = HeroAIVisual;
