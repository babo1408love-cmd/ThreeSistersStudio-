// ============================================================
// 🔍 몽글벨 공식팩 전체 난이도 확인 도구
// ============================================================
// 콘솔에서 FormulaDebug.all() 한 줄로 전체 확인
// ============================================================

const FormulaDebug = {

  // ── 전체 한눈에 보기 ──
  all(maxStage = 50) {
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║        🎮 몽글벨 전체 난이도 설계 현황              ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    this.enemies(maxStage);
    this.hero();
    this.boss(maxStage);
    this.exp();
    this.pet();
    this.rarity();
    this.fog(maxStage);
    this.rage();
    this.intervals();
    this.upgrades();
    console.log('\n✅ 값을 바꾸려면 각 formula-pack-N.js 파일의 CONFIG 상수를 수정하세요.');
  },

  // ── 적 스케일링 ──
  enemies(maxStage = 50) {
    if (typeof FormulaPack1 === 'undefined') { console.log('❌ FormulaPack1 없음'); return; }
    const pink = {hp:30, atk:4, def:1, spd:1.5, gold:5};
    console.log('\n━━━ 🧟 적 스케일링 (핑크슬라임 기준) ━━━');
    console.log('스테이지 │ HP     │ ATK   │ DEF  │ 골드  │ 장비드롭 │ 지역');
    console.log('─────────┼────────┼───────┼──────┼───────┼──────────┼──────');
    for (let s = 1; s <= maxStage; s += (s < 10 ? 3 : 10)) {
      const e = FormulaPack1.scaleEnemy(pink, s, 1);
      const dr = (FormulaPack1.getEquipDropRate(s, 'common') * 100).toFixed(1);
      const region = FormulaPack1._getRegion(s);
      console.log(`${String(s).padStart(5)}    │ ${String(e.hp).padStart(6)} │ ${String(e.atk).padStart(5)} │ ${String(e.def).padStart(4)} │ ${String(e.gold).padStart(5)} │ ${dr.padStart(6)}%  │ ${region}`);
    }
  },

  // ── 영웅 성장 ──
  hero() {
    if (typeof FormulaPack3 === 'undefined') { console.log('❌ FormulaPack3 없음'); return; }
    console.log('\n━━━ 🧚 영웅 스탯 성장 (전사 기준) ━━━');
    console.log('레벨 │ HP    │ ATK  │ DEF  │ SPD  │ 필요EXP');
    console.log('─────┼───────┼──────┼──────┼──────┼────────');
    for (let lv = 1; lv <= 50; lv += (lv < 10 ? 3 : 10)) {
      const s = FormulaPack3.getAllStatsAtLevel(lv, 'warrior');
      const exp = lv < 50 ? FormulaPack3.getRequiredEXP(lv, 'warrior') : '∞';
      console.log(`${String(lv).padStart(4)} │ ${String(s.hp).padStart(5)} │ ${String(s.atk).padStart(4)} │ ${String(s.def).padStart(4)} │ ${String(s.spd).padStart(4)} │ ${String(exp).padStart(7)}`);
    }
  },

  // ── 보스 스탯 ──
  boss(maxStage = 50) {
    if (typeof FormulaPack2 === 'undefined') { console.log('❌ FormulaPack2 없음'); return; }
    console.log('\n━━━ 👹 보스 스케일링 ━━━');
    console.log('스테이지 │ 보스HP     │ 보스ATK │ 킬타임');
    console.log('─────────┼────────────┼─────────┼───────');
    for (let s = 1; s <= maxStage; s += (s < 10 ? 3 : 10)) {
      const stats = typeof FormulaPack3 !== 'undefined' ? FormulaPack3.getAllStatsAtLevel(Math.min(50, s), 'warrior') : {hp:250,atk:12,def:7};
      const pp = { hp: stats.hp, atk: stats.atk, def: stats.def, dps: stats.atk * 2 };
      const b = FormulaPack2.getBossStats(s, pp);
      console.log(`${String(s).padStart(5)}    │ ${String(b.hp).padStart(10)} │ ${String(b.atk).padStart(7)} │ ~${b.estimatedKillTime}초`);
    }
  },

  // ── EXP 곡선 ──
  exp() {
    if (typeof FormulaPack3 === 'undefined') return;
    console.log('\n━━━ 📊 EXP 곡선 (6클래스 비교, 레벨10 기준) ━━━');
    ['warrior','mage','ranger','healer','assassin','paladin'].forEach(c => {
      const exp = FormulaPack3.getRequiredEXP(10, c);
      const total = FormulaPack3.getTotalEXP(10, c);
      console.log(`  ${c.padEnd(10)} │ Lv10 필요: ${exp} │ 누적: ${total}`);
    });
  },

  // ── 펫 스탯 ──
  pet() {
    if (typeof FormulaPack3 === 'undefined') return;
    console.log('\n━━━ 🐾 펫 스탯 (등급별, 플레이어Lv20 스테이지15) ━━━');
    console.log('등급     │ HP   │ ATK │ DEF │ 힐/5초');
    console.log('─────────┼──────┼─────┼─────┼───────');
    for (let r = 1; r <= 5; r++) {
      const names = ['커먼','레어','에픽','레전드','신화'];
      const p = FormulaPack3.getPetStats(r, 20, 15);
      console.log(`${names[r-1].padEnd(6)}(${r}) │ ${String(p.hp).padStart(4)} │ ${String(p.atk).padStart(3)} │ ${String(p.def).padStart(3)} │ ${String(p.healPer5s).padStart(5)}`);
    }
  },

  // ── 등급별 스탯 ──
  rarity() {
    if (typeof FormulaPack4 === 'undefined') return;
    console.log('\n━━━ 💎 등급별 스탯 (레벨1 vs 레벨25) ━━━');
    const names = ['Common','Rare','Epic','Legend','Mythic'];
    for (let r = 1; r <= 5; r++) {
      const s1 = FormulaPack4.getAllRarityStats(r, 1);
      const s25 = FormulaPack4.getAllRarityStats(r, 25);
      console.log(`  ${names[r-1].padEnd(7)} │ Lv1: ATK=${s1.atk} DEF=${s1.def} │ Lv25: ATK=${s25.atk} DEF=${s25.def}`);
    }
  },

  // ── 포자안개 ──
  fog(maxStage = 50) {
    if (typeof FormulaPack5 === 'undefined') return;
    console.log('\n━━━ 🌫️ 포자안개 데미지 (시간별) ━━━');
    console.log('스테이지 │ 30초   │ 90초   │ 150초  │ 180초');
    console.log('─────────┼────────┼────────┼────────┼───────');
    for (let s = 1; s <= maxStage; s += (s < 10 ? 9 : 20)) {
      const d30 = FormulaPack5.getSporeFogDamage(s, 30).damagePerSec;
      const d90 = FormulaPack5.getSporeFogDamage(s, 90).damagePerSec;
      const d150 = FormulaPack5.getSporeFogDamage(s, 150).damagePerSec;
      const d180 = FormulaPack5.getSporeFogDamage(s, 180).damagePerSec;
      console.log(`${String(s).padStart(5)}    │ ${String(d30).padStart(5)}/s │ ${String(d90).padStart(5)}/s │ ${String(d150).padStart(5)}/s │ ${String(d180).padStart(5)}/s`);
    }
  },

  // ── 분노 배율 ──
  rage() {
    if (typeof FormulaPack5 === 'undefined') return;
    console.log('\n━━━ 🔥 분노 배율 (등급×레벨) ━━━');
    const names = ['커먼','레어','에픽','레전드','신화'];
    for (let r = 1; r <= 5; r++) {
      const lv1 = FormulaPack5.getRageDamageMultiplier(r, 1);
      const lv25 = FormulaPack5.getRageDamageMultiplier(r, 25);
      const lv50 = FormulaPack5.getRageDamageMultiplier(r, 50);
      console.log(`  ${names[r-1].padEnd(4)}(${r}) │ Lv1: ×${lv1} │ Lv25: ×${lv25} │ Lv50: ×${lv50}`);
    }
  },

  // ── 행동/공격 간격 ──
  intervals() {
    if (typeof FormulaPack5 === 'undefined') return;
    console.log('\n━━━ ⏱️ 간격 설정 ━━━');
    console.log(`  영웅 행동(Lv1,SPD3):  ${FormulaPack5.getActionInterval(1, 3)}ms`);
    console.log(`  영웅 행동(Lv25,SPD6): ${FormulaPack5.getActionInterval(25, 6)}ms`);
    console.log(`  영웅 행동(Lv50,SPD10):${FormulaPack5.getActionInterval(50, 10)}ms`);
    console.log(`  자동공격(AtkSpd800,S1):  ${FormulaPack5.getAutoAttackInterval(800, 1)}ms`);
    console.log(`  자동공격(AtkSpd600,S25): ${FormulaPack5.getAutoAttackInterval(600, 25)}ms`);
  },

  // ── 업그레이드 감쇠 ──
  upgrades() {
    if (typeof FormulaPack2 === 'undefined') return;
    console.log('\n━━━ ⬆️ 업그레이드 감쇠 (스테이지10 기준) ━━━');
    ['fast_attack','strong_attack','long_range','double_shot','pierce','defense_up'].forEach(type => {
      const s1 = FormulaPack2.getUpgradeEffect(type, 10, 1);
      const s3 = FormulaPack2.getUpgradeEffect(type, 10, 3);
      const s5 = FormulaPack2.getUpgradeEffect(type, 10, 5);
      console.log(`  ${type.padEnd(14)} │ 1회: ${s1.display} │ 3회: ${s3.display} │ 5회: ${s5.display}`);
    });
  },

  connectToEngine() {
    console.log('[FormulaDebug] 난이도 확인 도구 로드 ✅  →  콘솔에서 FormulaDebug.all() 실행');
  }
};

if (typeof window !== 'undefined') window.FormulaDebug = FormulaDebug;
