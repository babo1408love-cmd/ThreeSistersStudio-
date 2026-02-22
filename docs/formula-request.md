# 몽글벨 — 밸런스 공식 제작 요청서

## 게임 개요
- **장르**: 뱀파이어 서바이버류 + 캔디매치 + 가챠
- **스테이지**: 3분 제한, 종스크롤(아래→위 진행)
- **적**: 귀여운 슬라임 10종 + 보스 4종
- **주인공 기본 스탯**: HP 250, ATK 12, DEF 7, SPD 3
- **적 기본 스탯**: HP 30~100, ATK 4~15
- **등급**: Common(1)/Rare(2)/Epic(3)/Legendary(4)/Mythic(5)
- **최대 스테이지**: 200+
- **킬타임 목표**: 일반몹 3초, 보스 30~60초

## 이미 완성된 공식 (참고용)

### SurvivorBalance (뱀서류 전투 스폰/난이도)
```
몹ATK = baseATK × (1 + t분 × 0.06) × 스테이지배율 × 타입배율
몹SPD = baseSPD × (1 + t분 × 0.015) × 스테이지배율 × 타입배율 (상한: 플레이어SPD × 0.95)
몹HP  = playerDPS × 3초 × 타입배율 (킬타임 고정)
스폰률 = 5/초 × (1 + t분 × 0.12) × 스테이지배율 × 웨이브배율
위험도 R = (스폰률 × ATK × SPD) / playerDPS (이상: 0.9~1.1)
후반 압박: 2분 이후 ATK 지수증가, 1.5분 이후 스폰 폭증
```

### BalanceAI (적 자동 밸런스)
```
전투력 = (ATK × SPD × 0.8) + (HP × 0.3) + (DEF × 0.5)
적은 플레이어보다 4% 강함 (ENEMY_GROWTH_BONUS: 0.04)
보스는 플레이어의 130%~150% 고정
D값 = 적전투력 / 플레이어전투력 (목표 0.95, 안정 0.9~1.05)
```

### EquipmentScalingAI (장비 분리)
```
적 스케일링 = 맨몸 전투력만 사용 (장비/슬롯영웅 보너스 제외)
→ 장비를 모을수록 실질적 이점
```

---

## 공식이 필요한 시스템 18개

---

### 1. 정령 스킬 데미지 공식 (spirit-attack-generator.js)

**현재 상태**: 40개 스킬 전부 고정 dmg (예: fire_arrow:12, meteor:18)
**문제**: 레전드 정령이든 커먼 정령이든 같은 데미지

**필요한 공식**:
- 입력: baseDmg, 정령레벨, 정령등급(1~5), 원소시너지여부
- 출력: 최종 데미지
- 레벨당 얼마나 성장?
- 등급별 배율? (커먼 1.0 ~ 미식 6.0?)
- 원소 시너지 보너스?
- 쿨다운도 등급에 따라 단축?

**기존 스킬 예시** (8속성 × 5스킬 = 40개):
```
fire_arrow:   {dmg:12, cd:1.5, range:200, aoe:0}
flame_burst:  {dmg:22, cd:4.0, range:150, aoe:80}
meteor:       {dmg:18, cd:7.0, range:300, aoe:120}
inferno:      {dmg:15, cd:3.0, range:250, aoe:100}
fire_shield:  {dmg:8,  cd:10,  range:0,   aoe:60}
```

---

### 2. 적 스탯 스케일링 공식 (enemy-drop-generator.js)

**현재 상태**: 슬라임 14종 스탯 전부 고정
**문제**: 스테이지 1 핑크슬라임 = 스테이지 50 핑크슬라임

**필요한 공식**:
- 입력: baseHP, baseATK, baseDEF, stageLevel, waveNum
- 출력: 스케일된 HP/ATK/DEF
- 스테이지당 성장률?
- 웨이브 진행에 따른 추가 성장?
- 200스테이지에서 너무 뻥튀기 안 되게 소프트캡?

**기존 적 데이터**:
```
pink_slime:   {hp:30,  atk:4,  def:1,  spd:1.5, gold:5}
blue_slime:   {hp:40,  atk:5,  def:2,  spd:1.2, gold:7}
purple_slime: {hp:60,  atk:8,  def:3,  spd:1.0, gold:12}
king_slime:   {hp:500, atk:15, def:8,  spd:0.6, gold:200}  (보스)
```

---

### 3. 드롭률 스케일링 공식 (enemy-drop-generator.js)

**현재 상태**: 장비 드롭 10% 고정, 소모품 15% 고정, 골드 ±20% 범위
**문제**: 스테이지 100에서도 동일 드롭률 → 파밍 인센티브 없음

**필요한 공식**:
- 입력: baseDropRate, stageLevel, playerLevel, 적등급
- 출력: 최종 드롭률
- 스테이지 올라갈수록 드롭률 상승? 하락?
- 높은 등급 적일수록 더 좋은 드롭?
- 골드 보상 스케일링?

---

### 4. 업그레이드 아이템 스케일링 공식 (combat-engine.js)

**현재 상태**: 전투 중 드롭되는 8종 업그레이드 효과 고정
**문제**: 스테이지 50에서 얻는 "방어강화"도 +5 고정

**현재 업그레이드 8종**:
```
빠른공격:  atkSpeed *= 0.8      (공속 20% 증가)
강한공격:  projSize *= 1.5      (탄환 크기 1.5배)
먼공격:    projSpeed *= 1.3     (사거리 30% 증가)
연속발사:  shotCount += 1       (최대 4발)
관통:      pierce += 1          (최대 4관통)
호밍:      homing = true        (추적탄)
HP회복:    maxHp × 30% 즉시회복
방어강화:  defense += 5
```

**필요한 공식**:
- 입력: upgradeType, stageLevel, 현재스택수
- 출력: 스케일된 효과값
- 스테이지별로 효과 증가?
- 중복 획득 시 감쇠(diminishing returns)?

---

### 5. 실시간 공격력 밸런스 공식 (combat-ai-balance.js)

**현재 상태**:
```
데미지배율 = 0.4 + (HP비율 × 1.0)  → 범위 0.4~1.4
머시: 2초 내 3피격 → ×0.6
그레이스: 첫 10초 50%→100%
분노: ×1.3
최종 범위: 0.3 ~ 1.5
```
**문제**: 스테이지 1과 스테이지 50이 같은 설정

**필요한 공식**:
- 입력: stageLevel, hpRatio, hitCount, elapsed, rageActive
- 출력: 데미지 배율
- 스테이지별 그레이스타임 단축?
- 스테이지별 min/max 배율 범위 변화?
- 고스테이지에서 머시 시스템 약화?

---

### 6. 보스방 보스 스탯 공식 (boss-room-system.js)

**현재 상태**: 보스 스탯 외부에서 주입, 폴백: HP 300, ATK 20, DEF 10 고정
**문제**: 보스방 보스가 스테이지와 무관하게 같은 강도

**필요한 공식**:
- 입력: baseBossHP, baseBossATK, stageLevel, playerPower(맨몸)
- 출력: 최종 보스 HP/ATK/DEF
- 보스는 플레이어의 몇 배?
- 스테이지별 성장률?
- 분노모드(30% 이하) 시 ATK 증가율?

---

### 7. 경험치 테이블 공식 (hero-upgrade.js)

**현재 상태**: `requiredExp = 100 × 1.15^(level-1)` → 레벨50에서 1,850 (너무 완만)
**최대 레벨**: 50

**필요한 공식**:
- 입력: level, classId (6클래스)
- 출력: 필요 EXP
- 클래스별 EXP 곡선 차이?
- 후반 레벨업이 확실히 어려워지는 곡선?

**스탯 성장도 필요**:
- 현재: `stat += growth × level` (순수 선형)
- 필요: 감쇠/소프트캡 있는 성장 공식

**6클래스**:
```
warrior:  {hp:1.2, atk:1.0, def:1.3, spd:0.8}  (탱커)
mage:     {hp:0.7, atk:1.4, def:0.6, spd:1.0}  (딜러)
ranger:   {hp:0.8, atk:1.1, def:0.7, spd:1.4}  (기동)
healer:   {hp:0.9, atk:0.6, def:1.0, spd:0.9}  (힐러)
assassin: {hp:0.6, atk:1.5, def:0.5, spd:1.5}  (극딜)
paladin:  {hp:1.1, atk:0.8, def:1.2, spd:0.7}  (밸런스)
```

---

### 8. 펫 진화/성장 공식 (summon-evolution.js + pet-evolution-system.js)

**현재 상태**: 진화 펫 항상 레벨1, 스탯은 등급 테이블에서 고정값
**문제**: 스테이지 100에서 진화해도 레벨1 펫 → 즉시 쓸모없음

**필요한 공식**:
- 입력: petRarity, playerLevel, stageLevel
- 출력: 펫 HP/ATK/DEF/SPD + 힐량
- 플레이어 레벨에 맞춰 성장?
- 등급별 성장 곡선 차이?
- 펫 자동회복량도 스케일링?
- 현재 회복: 5초마다 rarity×5 HP (최대 25)

---

### 9. 스테이지 디렉터 몹 스케일링 (stage-director.js)

**현재 상태**: `scaleFactor = 1 + (stage-1) × 0.12` (12%/스테이지)
**문제**: 성장이 너무 완만, 지역 간 점프가 급격

**필요한 공식**:
- 입력: stageLevel(1~200+), regionIndex
- 출력: mobHP, mobATK, mobDEF 배율
- 연속적인 난이도 곡선?
- 지역 전환 시 자연스러운 상승?

**5개 지역**: 숲(1~10) → 동굴(11~20) → 사막(21~30) → 화산(31~40) → 마왕성(41~50+)

---

### 10. 등급별 스탯 공식 (rarity-manager.js)

**현재 상태**: 고정 테이블
```
RARITY_DEFENSE: {1:1, 2:2, 3:3, 4:5, 5:8}
RARITY_ATK:     {1:10, 2:18, 3:28, 4:40, 5:60}
RARITY_ATK_SPEED: {1:1200, 2:1050, 3:900, 4:750, 5:600}  (ms, 낮을수록 빠름)
```
**문제**: 레벨에 무관, 파워 크립 조정 불가

**필요한 공식**:
- 입력: rarityId(1~5), level
- 출력: defense, atk, atkSpeed, moveSpeed 등
- 등급 간 격차가 자연스러운 곡선?
- 레벨 반영?

---

### 11. HeroBattleAI 스킬 파워 공식 (hero-ai-battle.js)

**현재 상태**: 모든 스킬 power 고정 (slash:120, fireball:150 등)
**문제**: 영웅 레벨업해도 스킬 위력 동일

**필요한 공식**:
- 입력: basePower, heroLevel, stageLevel, skillTier
- 출력: 최종 스킬 파워
- 레벨당 성장?
- 스테이지 보정?

---

### 12. 공중전 부스터 공식 (aerial-combat-system.js)

**현재 상태**: 속도배율 3.0, 공격배율 2.5, 공격간격 150ms 전부 고정

**필요한 공식**:
- 입력: stageLevel, playerSpeed, playerATK
- 출력: boosterSpeedMult, boosterATKMult, autoAttackInterval
- 스테이지별 조정?

---

### 13. 포자안개 데미지 공식 (auto-scroll.js)

**현재 상태**: `damagePerSec = 20 + stageLevel × 2` (HeroCore에서 전달)
**문제**: 이미 스테이지 반영이지만 너무 선형

**필요한 공식**:
- 입력: stageLevel, elapsed
- 출력: damagePerSec, pushForce, accel
- 시간에 따라 데미지 증가?
- 후반 가속?

---

### 14. 보스 접근 속도 공식 (boss-approach.js)

**현재 상태**: baseSpeed 0.3, accel 0.00008 고정 (스테이지 오버라이드만 있음)

**필요한 공식**:
- 입력: stageLevel
- 출력: baseSpeed, accel, timerAccelMultiplier
- 스테이지별 자연스러운 속도 증가?

---

### 15. 분노 게이지 데미지 배율 공식 (rage-system.js)

**현재 상태**: `damageMultiplier = 2.0` 고정

**필요한 공식**:
- 입력: heroRarity 또는 heroLevel
- 출력: damageMultiplier
- 등급/레벨에 따라 분노 배율 차등?

---

### 16. HeroEngine 행동 간격 공식 (hero-engine.js)

**현재 상태**: `actionInterval = 800ms` 고정

**필요한 공식**:
- 입력: heroLevel, heroSpeed
- 출력: actionInterval (ms)
- 레벨/속도에 따라 단축?

---

### 17. 배틀아레나 자동공격 간격 공식 (combat-config.js)

**현재 상태**: `autoAttackInterval = 800ms` 고정

**필요한 공식**:
- 입력: playerAtkSpeed, stageLevel
- 출력: autoAttackInterval (ms)

---

### 18. BalanceAI 몬스터 성장 공식 (balance-ai.js)

**현재 상태**: `growth = baseStat × (1 + level × 0.1)` (선형)
**문제**: 몬스터 타입별 커스텀 없음, 감쇠 없음

**필요한 공식**:
- 입력: baseStat, level, monsterType
- 출력: 최종 스탯
- 타입별 성장률 차이?
- 소프트캡?

---

## 공식 작성 가이드라인

1. **survivor-balance.js 형태** — `window.공식이름 = { ... }` 글로벌 스크립트
2. **JavaScript 코드로** — 바로 복붙 가능하게
3. **CONFIG 상수 분리** — 나중에 튜닝 쉽게
4. **debugTimeline() 포함** — 콘솔에서 확인 가능하게
5. **connectToEngine() 포함** — 초기화 로그
6. **파일당 하나의 시스템** — 예: `skill-balance.js`, `enemy-scaling.js` 등
7. **공식에 주석** — 왜 이 값인지 설명

## 파일 저장 위치
`js/ai/` 폴더에 저장 → `index.html`에 `<script>` 태그로 추가
