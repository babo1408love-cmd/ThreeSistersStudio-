// ============================================================
// 📋 몽글벨 공식팩 통합 가이드 (6/6) — Claude Code용
// ============================================================
// 이 파일은 설명서! 코드에 넣지 마세요.
// Claude Code가 읽고 기존 코드에 연결하는 방법.
// ============================================================

/*
═══════════════════════════════════════════════════════════════
📂 파일 구조
═══════════════════════════════════════════════════════════════

js/ai/formula-pack-1.js → 정령스킬 + 적스케일링 + 드롭률
js/ai/formula-pack-2.js → 업그레이드 + 전투밸런스 + 보스방
js/ai/formula-pack-3.js → 경험치 + 펫진화 + 스테이지디렉터
js/ai/formula-pack-4.js → 등급스탯 + 스킬파워 + 공중전
js/ai/formula-pack-5.js → 포자안개 + 보스접근 + 분노 + 간격 + 몬스터성장

index.html 로드 순서:
  <script src="js/ai/formula-pack-1.js"></script>
  <script src="js/ai/formula-pack-2.js"></script>
  <script src="js/ai/formula-pack-3.js"></script>
  <script src="js/ai/formula-pack-4.js"></script>
  <script src="js/ai/formula-pack-5.js"></script>


═══════════════════════════════════════════════════════════════
🔗 교체 방법 (18개 시스템)
═══════════════════════════════════════════════════════════════

【1】 spirit-attack-generator.js 교체:
  변경 전: {dmg:12, cd:1.5, range:200, aoe:0}  (고정값)
  변경 후: FormulaPack1.scaleSpiritSkill(skill, spiritLevel, rarityId, hasSynergy)

【2】 enemy-drop-generator.js 적 스탯 교체:
  변경 전: {hp:30, atk:4, def:1}  (고정값)
  변경 후: FormulaPack1.scaleEnemy(baseEnemy, stageLevel, waveNum)

【3】 enemy-drop-generator.js 드롭률 교체:
  변경 전: equipDrop = 0.10  (고정)
  변경 후: FormulaPack1.getEquipDropRate(stageLevel, enemyType)
  골드:    FormulaPack1.getGoldReward(baseGold, stageLevel)

【4】 combat-engine.js 업그레이드 교체:
  변경 전: projSize *= 1.5  (고정)
  변경 후: FormulaPack2.getUpgradeEffect('strong_attack', stageLevel, stackCount)

【5】 combat-ai-balance.js 교체:
  변경 전: damageMult = 0.4 + (hpRatio × 1.0)  (고정)
  변경 후: FormulaPack2.getCombatDamageMultiplier(stageLevel, hpRatio, hitCount, elapsed, rageActive)

【6】 boss-room-system.js 교체:
  변경 전: HP 300, ATK 20  (폴백 고정)
  변경 후: FormulaPack2.getBossStats(stageLevel, playerPower)

【7】 hero-upgrade.js 경험치 교체:
  변경 전: requiredExp = 100 × 1.15^(level-1)
  변경 후: FormulaPack3.getRequiredEXP(level, classId)
  스탯:    FormulaPack3.getAllStatsAtLevel(level, classId)

【8】 pet-evolution-system.js 교체:
  변경 전: 펫 항상 레벨1, 고정 스탯
  변경 후: FormulaPack3.getPetStats(petRarity, playerLevel, stageLevel)
  진화레벨: FormulaPack3.getEvolutionLevel(currentLevel)

【9】 stage-director.js 교체:
  변경 전: scaleFactor = 1 + (stage-1) × 0.12
  변경 후: FormulaPack3.getStageScaleFactor(stageLevel, 'hp')

【10】 rarity-manager.js 교체:
  변경 전: RARITY_ATK: {1:10, 2:18, ...}  (고정 테이블)
  변경 후: FormulaPack4.getAllRarityStats(rarityId, level)

【11】 hero-ai-battle.js 스킬 교체:
  변경 전: power: 120  (고정)
  변경 후: FormulaPack4.getSkillPower(basePower, heroLevel, stageLevel, skillTier)

【12】 aerial-combat-system.js 교체:
  변경 전: speedMult=3.0, atkMult=2.5, interval=150  (고정)
  변경 후: FormulaPack4.getAerialBooster(stageLevel, playerSpeed, playerATK)

【13】 auto-scroll.js 교체:
  변경 전: damagePerSec = 20 + stageLevel × 2
  변경 후: FormulaPack5.getSporeFogDamage(stageLevel, elapsedSec)

【14】 boss-approach.js 교체:
  변경 전: baseSpeed=0.3, accel=0.00008  (고정)
  변경 후: FormulaPack5.getBossApproach(stageLevel)

【15】 rage-system.js 교체:
  변경 전: damageMultiplier = 2.0  (고정)
  변경 후: FormulaPack5.getRageDamageMultiplier(heroRarity, heroLevel)

【16】 hero-engine.js 교체:
  변경 전: actionInterval = 800  (고정)
  변경 후: FormulaPack5.getActionInterval(heroLevel, heroSpeed)

【17】 combat-config.js 교체:
  변경 전: autoAttackInterval = 800  (고정)
  변경 후: FormulaPack5.getAutoAttackInterval(playerAtkSpeed, stageLevel)

【18】 balance-ai.js 몬스터 교체:
  변경 전: growth = baseStat × (1 + level × 0.1)
  변경 후: FormulaPack5.getMonsterAllStats(baseStats, level, monsterType)

═══════════════════════════════════════════════════════════════
⚠️ 주의사항
═══════════════════════════════════════════════════════════════

1. formula-pack 파일들이 다른 게임 코드보다 먼저 로드되어야 함
2. 기존 고정값 코드는 삭제하지 말고 주석처리 (롤백 가능)
3. 모든 공식에 CONFIG 상수가 있으므로 나중에 값만 튜닝 가능
4. debugTimeline() / debugXxx() 함수로 콘솔에서 확인 가능

*/
