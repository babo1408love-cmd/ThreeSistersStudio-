// Central game state singleton
import EventBus from './event-bus.js';

const GameState = {
  // Player info
  playerName: '모험가',
  gold: 0,
  currentStage: 1,
  currentPhase: 'menu', // menu, candy, marble, treasure, summoning, combat

  // Player combat stats (밸런스: HP 200~300, ATK 10~15, DEF 5~10)
  player: {
    maxHp: 250,
    hp: 250,
    attack: 12,
    defense: 7,
    speed: 3
  },

  // Inventory: array of item objects {id, name, emoji, type, stats}
  inventory: [],

  // Equipped items (6 body-part slots): head, body, arms, wings, legs, shoes
  equipped: {
    head: null,
    body: null,
    arms: null,
    wings: null,
    legs: null,
    shoes: null
  },

  // Hero character slots (5 slots)
  heroSlots: [null, null, null, null, null],

  // Pet slot (1 slot)
  petSlot: null,

  // Hero level & exp
  heroLevel: 1,
  heroExp: 0,

  // Rage gauge (0~100)
  rageGauge: 0,

  // Pet heal gauge (0~100) — same system as rage but triggers healing
  petHealGauge: 0,

  // GOLDMIMC 글자 수집 (판 넘어서도 유지)
  goldmimicSlots: [false,false,false,false,false,false,false,false],

  // Pet equipment (4 slots: wings, skin, collar, charm_pet)
  petEquipped: {
    wings: null,
    skin: null,
    collar: null,
    charm_pet: null
  },

  // Appearance overrides (computed from equipped items)
  heroAppearance: null,    // { emoji, glowColor, trail, ... }
  petAppearance: null,     // { emoji, glowColor, trail, ... }

  // Spirit items collected (used for summoning)
  spiritItems: [],

  // Summoned spirits: array of spirit objects
  spirits: [],

  // Stage progress
  stageProgress: {
    candyCleared: false,
    marbleCleared: false,
    treasureCleared: false
  },

  // Summon tree data
  summonTree: null,

  // Hero upgrade data
  heroUpgrade: null,

  // Checkpoint data (saved at summoning room)
  checkpoint: null,

  // Stats tracking
  stats: {
    totalGold: 0,
    stagesCleared: 0,
    spiritsSummoned: 0,
    enemiesDefeated: 0,
    towerFloor: 1,
    survivalBestWave: 0,
  },

  // Settings (graphics/sound/gameplay)
  settings: null,

  // Special dice inventory (주사위 7종: normal/bonus/golden/diamond/fire/ice/lucky)
  specialDice: [],

  // 자동 밸런스 모니터링 (BalanceAI)
  balanceHistory: {
    recentGrades: [],        // 최근 5회 클리어 등급 (S/A/B/F)
    consecutiveS: 0,         // 연속 S등급 횟수
    consecutiveFail: 0,      // 연속 실패 횟수
    bossFailCount: 0,        // 보스 연패 횟수
    difficultyMod: 0,        // 난이도 보정 (-0.3 ~ +0.3)
  },

  // 초보자 도우미 (세계의 어머니)
  firstPlayDate: null,       // 첫 플레이 시각 (timestamp)
  helperDismissed: false,    // 도우미 수동 해제 여부

  // 초보자 도우미: 첫 플레이 시각 기록
  initFirstPlay() {
    if (this.firstPlayDate === null) {
      this.firstPlayDate = Date.now();
    }
  },

  // 초보자 도우미: 수동 해제
  dismissHelper() {
    this.helperDismissed = true;
    EventBus.emit('helper:dismissed');
  },

  // 밸런스 기록: 스테이지 클리어 등급 기록 + 자동 조정
  recordStageResult(grade) {
    const bh = this.balanceHistory;
    bh.recentGrades.push(grade);
    if (bh.recentGrades.length > 5) bh.recentGrades.shift();

    if (grade === 'S') {
      bh.consecutiveS++;
      bh.consecutiveFail = 0;
      // 3연속 S → 난이도 상승
      if (bh.consecutiveS >= 3) {
        bh.difficultyMod = Math.min(0.3, bh.difficultyMod + 0.1);
        bh.consecutiveS = 0;
      }
    } else if (grade === 'F') {
      bh.consecutiveFail++;
      bh.consecutiveS = 0;
      // 3연속 실패 → 난이도 하락
      if (bh.consecutiveFail >= 3) {
        bh.difficultyMod = Math.max(-0.3, bh.difficultyMod - 0.1);
        bh.consecutiveFail = 0;
      }
    } else {
      bh.consecutiveS = 0;
      bh.consecutiveFail = 0;
    }
    EventBus.emit('balance:changed', bh);
  },

  // 밸런스 기록: 보스 실패
  recordBossFail() {
    this.balanceHistory.bossFailCount++;
    // 5연패 → 보스 HP -10% (최대 -30%)
    if (this.balanceHistory.bossFailCount >= 5) {
      this.balanceHistory.difficultyMod = Math.max(-0.3, this.balanceHistory.difficultyMod - 0.1);
    }
    EventBus.emit('balance:changed', this.balanceHistory);
  },

  // 밸런스 기록: 보스 클리어 시 리셋
  recordBossClear() {
    this.balanceHistory.bossFailCount = 0;
    EventBus.emit('balance:changed', this.balanceHistory);
  },

  // 현재 난이도 보정값 반환
  getDifficultyMod() {
    return 1 + (this.balanceHistory.difficultyMod || 0);
  },

  // Add special dice to inventory
  addSpecialDice(type) {
    this.specialDice.push(type);
    EventBus.emit('specialDice:changed', this.specialDice);
  },

  // Use (consume) a special dice, returns the type or null
  useSpecialDice() {
    if (this.specialDice.length === 0) return null;
    const type = this.specialDice.shift();
    EventBus.emit('specialDice:changed', this.specialDice);
    return type;
  },

  // Reset stage progress for a new stage
  resetStageProgress() {
    this.stageProgress = {
      candyCleared: false,
      marbleCleared: false,
      treasureCleared: false
    };
    EventBus.emit('stageProgress:changed', this.stageProgress);
  },

  // Add gold
  addGold(amount) {
    this.gold += amount;
    this.stats.totalGold += amount;
    EventBus.emit('gold:changed', this.gold);
  },

  // Add item to inventory (같은 아이템 중첩 최대 999개)
  addItem(item, count = 1) {
    // 중첩 가능한 아이템: 같은 id 또는 (같은 name + 같은 type/slot/rarity)
    const stackKey = item.id || item.name;
    const existing = this.inventory.find(i => {
      if (item.id && i.id === item.id) return true; // 같은 정의 ID (w_wood_sword 등)
      if (!item.id && i.name === item.name && i.type === item.type) return true; // 소비템 등 이름+타입 매칭
      return false;
    });

    if (existing) {
      existing.quantity = Math.min(999, (existing.quantity || 1) + count);
    } else {
      this.inventory.push({ ...item, _uid: Date.now() + Math.random(), quantity: count });
    }
    EventBus.emit('inventory:changed', this.inventory);
  },

  // Remove item from inventory (수량 1 감소, 0이면 제거)
  removeItem(itemId, count = 1) {
    const idx = this.inventory.findIndex(i => i._uid === itemId || i.id === itemId);
    if (idx === -1) return;
    const item = this.inventory[idx];
    const qty = (item.quantity || 1) - count;
    if (qty <= 0) {
      this.inventory.splice(idx, 1);
    } else {
      item.quantity = qty;
    }
    EventBus.emit('inventory:changed', this.inventory);
  },

  // Equip item (supports 6 slots) — 스택에서 1개 꺼내서 장착
  equipItem(itemId) {
    const item = this.inventory.find(i => i._uid === itemId || i.id === itemId);
    if (!item || !item.slot) return;
    if (this.equipped[item.slot] === undefined) return; // invalid slot
    // Unequip current → 인벤토리에 중첩 추가
    if (this.equipped[item.slot]) {
      this.addItem(this.equipped[item.slot]);
    }
    // 장착용 복사본 생성 (수량 필드 제거)
    const equipCopy = { ...item };
    delete equipCopy.quantity;
    equipCopy._uid = equipCopy._uid || (Date.now() + Math.random());
    this.equipped[item.slot] = equipCopy;
    this.removeItem(item._uid || item.id, 1);
    this.recalcStats();
    this.recalcHeroAppearance();
    EventBus.emit('equipped:changed', this.equipped);
  },

  // 맨몸 스탯 (장비 보너스 제외, 레벨 성장만)
  // 적 스케일링에 사용 — 장비/슬롯영웅 효과를 적에게 반영하지 않음
  getBaseStats() {
    const lvl = this.heroLevel - 1;
    return {
      maxHp: 250 + Math.floor(lvl * 10),
      attack: 12 + Math.floor(lvl * 2),
      defense: 7 + Math.floor(lvl * 1.5),
      speed: 3 + Math.round(lvl * 0.3 * 10) / 10,
      critRate: 5 + Math.round(lvl * 0.1 * 10) / 10,
      critDamage: 150 + lvl,
      rageGainRate: 100,
    };
  },

  // 장비 보너스 합계
  getEquipmentBonus() {
    const bonus = { maxHp:0, attack:0, defense:0, speed:0, critRate:0, critDamage:0 };
    for (const slot of Object.values(this.equipped)) {
      if (slot && slot.stats) {
        for (const [k, v] of Object.entries(slot.stats)) {
          if (bonus[k] !== undefined) bonus[k] += v;
        }
      }
    }
    return bonus;
  },

  // Recalculate player stats from base + equipment + hero level
  recalcStats() {
    // Base stats + level growth (밸런스: HP 200~300, ATK 10~15)
    const base = this.getBaseStats();
    base.hp = this.player.hp;
    // Add equipment stats (6 slots)
    const eqBonus = this.getEquipmentBonus();
    for (const [k, v] of Object.entries(eqBonus)) {
      if (base[k] !== undefined) base[k] += v;
    }
    // Keep hp ratio
    const hpRatio = this.player.hp / this.player.maxHp;
    this.player = { ...base, hp: Math.round(base.maxHp * hpRatio) };
    EventBus.emit('player:statsChanged', this.player);
  },

  // Equip pet to pet slot
  equipPet(pet) {
    this.petSlot = pet;
    this.recalcPetAppearance();
    EventBus.emit('petSlot:changed', this.petSlot);
    return { success: true };
  },

  // Equip pet item (4 slots: wings, skin, collar, charm_pet)
  equipPetItem(itemId) {
    const item = this.inventory.find(i => i._uid === itemId || i.id === itemId);
    if (!item || !item.petSlot) return;
    if (this.petEquipped[item.petSlot] === undefined) return;
    // Unequip current → 인벤토리에 중첩 추가
    if (this.petEquipped[item.petSlot]) {
      this.addItem(this.petEquipped[item.petSlot]);
    }
    const equipCopy = { ...item };
    delete equipCopy.quantity;
    equipCopy._uid = equipCopy._uid || (Date.now() + Math.random());
    this.petEquipped[item.petSlot] = equipCopy;
    this.removeItem(item._uid || item.id, 1);
    this.recalcPetAppearance();
    EventBus.emit('petEquipped:changed', this.petEquipped);
  },

  // Add pet heal gauge
  addPetHealGauge(amount) {
    const efficiency = (this.petSlot?.healEfficiency || 100) / 100;
    this.petHealGauge = Math.min(100, this.petHealGauge + amount * efficiency);
    EventBus.emit('petHealGauge:changed', this.petHealGauge);
    if (this.petHealGauge >= 100) {
      EventBus.emit('petHealGauge:full');
    }
  },

  // Reset pet heal gauge
  resetPetHealGauge() {
    this.petHealGauge = 0;
    EventBus.emit('petHealGauge:changed', this.petHealGauge);
  },

  // Recalculate hero appearance from equipped items
  recalcHeroAppearance() {
    let appearance = null;
    const prioritySlots = ['head', 'body', 'wings', 'arms'];
    for (const slotKey of prioritySlots) {
      const item = this.equipped[slotKey];
      if (item && item.appearanceOverride) {
        if (!appearance) appearance = {};
        Object.assign(appearance, item.appearanceOverride);
      }
    }
    this.heroAppearance = appearance;
    EventBus.emit('heroAppearance:changed', this.heroAppearance);
  },

  // Recalculate pet appearance from pet + pet equipment
  recalcPetAppearance() {
    let appearance = null;
    const prioritySlots = ['skin', 'wings'];
    for (const slotKey of prioritySlots) {
      const item = this.petEquipped[slotKey];
      if (item && item.appearanceOverride) {
        if (!appearance) appearance = {};
        Object.assign(appearance, item.appearanceOverride);
      }
    }
    this.petAppearance = appearance;
    EventBus.emit('petAppearance:changed', this.petAppearance);
  },

  equipHeroToSlot(slotIndex, hero) {
    if (slotIndex < 0 || slotIndex >= 5) return { success: false, error: '잘못된 슬롯' };
    // Duplicate restriction: epic/legendary same rarity+attribute blocked
    if (hero && ['epic', 'legendary'].includes(hero.rarity)) {
      const dup = this.heroSlots.find(h => {
        if (!h) return false;
        return h.rarity === hero.rarity && h.attribute === hero.attribute;
      });
      if (dup) return { success: false, error: '같은 등급과 같은 속성의 영웅은 중복 착용할 수 없습니다!' };
    }
    this.heroSlots[slotIndex] = hero;
    EventBus.emit('heroSlots:changed', this.heroSlots);
    return { success: true };
  },

  // Add rage gauge
  addRage(amount) {
    const rate = (this.player.rageGainRate || 100) / 100;
    this.rageGauge = Math.min(100, this.rageGauge + amount * rate);
    EventBus.emit('rage:changed', this.rageGauge);
    if (this.rageGauge >= 100) {
      EventBus.emit('rage:full');
    }
  },

  // Reset rage gauge
  resetRage() {
    this.rageGauge = 0;
    EventBus.emit('rage:changed', this.rageGauge);
  },

  // Add spirit item
  addSpiritItem(spiritItem) {
    this.spiritItems.push(spiritItem);
    EventBus.emit('spiritItems:changed', this.spiritItems);
  },

  // Summon spirit (consume spirit item)
  MAX_SPIRITS: 10,

  summonSpirit(spirit) {
    if (this.spirits.length >= this.MAX_SPIRITS) {
      return { success: false, reason: 'max_spirits' };
    }
    this.spirits.push(spirit);
    this.stats.spiritsSummoned++;
    EventBus.emit('spirits:changed', this.spirits);
    return { success: true };
  },

  // Full heal player
  fullHeal() {
    this.player.hp = this.player.maxHp;
    EventBus.emit('player:statsChanged', this.player);
  },

  // Export serializable state
  toJSON() {
    return {
      playerName: this.playerName,
      gold: this.gold,
      currentStage: this.currentStage,
      currentPhase: this.currentPhase,
      player: { ...this.player },
      inventory: [...this.inventory],
      equipped: { ...this.equipped },
      heroSlots: [...this.heroSlots],
      petSlot: this.petSlot ? { ...this.petSlot } : null,
      petEquipped: { ...this.petEquipped },
      petHealGauge: this.petHealGauge,
      heroAppearance: this.heroAppearance ? { ...this.heroAppearance } : null,
      petAppearance: this.petAppearance ? { ...this.petAppearance } : null,
      heroLevel: this.heroLevel,
      heroExp: this.heroExp,
      rageGauge: this.rageGauge,
      spiritItems: [...this.spiritItems],
      spirits: [...this.spirits],
      stageProgress: { ...this.stageProgress },
      stats: { ...this.stats },
      summonTree: this.summonTree,
      heroUpgrade: this.heroUpgrade,
      specialDice: [...this.specialDice],
      balanceHistory: { ...this.balanceHistory, recentGrades: [...this.balanceHistory.recentGrades] },
      firstPlayDate: this.firstPlayDate,
      helperDismissed: this.helperDismissed,
      settings: this.settings,
    };
  },

  // Load from saved data
  fromJSON(data) {
    if (!data) return;
    // Migrate old 8-slot equipped to 6 body-part slots
    let eq = data.equipped ?? {};
    if (eq.weapon !== undefined || eq.armor !== undefined || eq.helmet !== undefined) {
      // Old 8-slot format → migrate to 6-slot
      eq = {
        head: eq.helmet || eq.necklace || eq.head || null,
        body: eq.armor || eq.body || null,
        arms: eq.weapon || eq.ring || eq.arms || null,
        wings: eq.cape || eq.charm || eq.wings || null,
        legs: eq.legs || null,
        shoes: eq.boots || eq.shoes || null,
      };
    }
    if (eq.head === undefined) eq = { head: null, body: null, arms: null, wings: null, legs: null, shoes: null };
    Object.assign(this, {
      playerName: data.playerName ?? this.playerName,
      gold: data.gold ?? 0,
      currentStage: data.currentStage ?? 1,
      currentPhase: data.currentPhase ?? 'menu',
      player: data.player ?? this.player,
      inventory: (data.inventory ?? []).map(i => ({
        ...i,
        _uid: i._uid || i.id || (Date.now() + Math.random()),
        quantity: i.quantity || 1,
      })),
      equipped: eq,
      heroSlots: (() => {
        const hs = data.heroSlots ?? [];
        while (hs.length < 5) hs.push(null);
        return hs.slice(0, 5);
      })(),
      petSlot: data.petSlot ?? null,
      petEquipped: data.petEquipped ?? { wings: null, skin: null, collar: null, charm_pet: null },
      petHealGauge: data.petHealGauge ?? 0,
      heroAppearance: data.heroAppearance ?? null,
      petAppearance: data.petAppearance ?? null,
      heroLevel: data.heroLevel ?? 1,
      heroExp: data.heroExp ?? 0,
      rageGauge: data.rageGauge ?? 0,
      spiritItems: data.spiritItems ?? [],
      spirits: data.spirits ?? [],
      stageProgress: data.stageProgress ?? { candyCleared: false, marbleCleared: false, treasureCleared: false },
      stats: data.stats ?? this.stats,
      summonTree: data.summonTree ?? null,
      heroUpgrade: data.heroUpgrade ?? null,
      firstPlayDate: null,  // 매 세션마다 초기화 → initFirstPlay()에서 Date.now() 설정
      specialDice: data.specialDice ?? [],
      balanceHistory: data.balanceHistory ?? { recentGrades: [], consecutiveS: 0, consecutiveFail: 0, bossFailCount: 0, difficultyMod: 0 },
      helperDismissed: data.helperDismissed ?? false,
      settings: data.settings ?? null,
    });
    EventBus.emit('state:loaded');
  },

  // Reset to defaults
  reset() {
    this.playerName = '모험가';
    this.gold = 0;
    this.currentStage = 1;
    this.currentPhase = 'menu';
    this.player = { maxHp: 250, hp: 250, attack: 12, defense: 7, speed: 3, critRate: 5, critDamage: 150, rageGainRate: 100 };
    this.inventory = [];
    this.equipped = { head: null, body: null, arms: null, wings: null, legs: null, shoes: null };
    this.heroSlots = [null, null, null, null, null];
    this.petSlot = null;
    this.petEquipped = { wings: null, skin: null, collar: null, charm_pet: null };
    this.petHealGauge = 0;
    this.heroAppearance = null;
    this.petAppearance = null;
    this.heroLevel = 1;
    this.heroExp = 0;
    this.rageGauge = 0;
    this.spiritItems = [];
    this.spirits = [];
    this.stageProgress = { candyCleared: false, marbleCleared: false, treasureCleared: false };
    this.summonTree = null;
    this.heroUpgrade = null;
    this.checkpoint = null;
    this.stats = { totalGold: 0, stagesCleared: 0, spiritsSummoned: 0, enemiesDefeated: 0 };
    this.specialDice = [];
    this.balanceHistory = { recentGrades: [], consecutiveS: 0, consecutiveFail: 0, bossFailCount: 0, difficultyMod: 0 };
    this.firstPlayDate = null;
    this.helperDismissed = false;
    this.settings = null;
    EventBus.emit('state:reset');
  }
};

export default GameState;
