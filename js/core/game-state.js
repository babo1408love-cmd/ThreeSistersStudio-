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
    enemiesDefeated: 0
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

  // Add item to inventory
  addItem(item) {
    this.inventory.push({ ...item, id: Date.now() + Math.random() });
    EventBus.emit('inventory:changed', this.inventory);
  },

  // Remove item from inventory
  removeItem(itemId) {
    this.inventory = this.inventory.filter(i => i.id !== itemId);
    EventBus.emit('inventory:changed', this.inventory);
  },

  // Equip item (supports 8 slots)
  equipItem(itemId) {
    const item = this.inventory.find(i => i.id === itemId);
    if (!item || !item.slot) return;
    if (this.equipped[item.slot] === undefined) return; // invalid slot
    // Unequip current
    if (this.equipped[item.slot]) {
      this.inventory.push(this.equipped[item.slot]);
    }
    this.equipped[item.slot] = item;
    this.removeItem(itemId);
    this.recalcStats();
    this.recalcHeroAppearance();
    EventBus.emit('equipped:changed', this.equipped);
  },

  // Recalculate player stats from base + equipment + hero level
  recalcStats() {
    // Base stats + level growth (밸런스: HP 200~300, ATK 10~15)
    const lvl = this.heroLevel - 1;
    const base = {
      maxHp: 250 + Math.floor(lvl * 10),
      hp: this.player.hp,
      attack: 12 + Math.floor(lvl * 2),
      defense: 7 + Math.floor(lvl * 1.5),
      speed: 3 + Math.round(lvl * 0.3 * 10) / 10,
      critRate: 5 + Math.round(lvl * 0.1 * 10) / 10,
      critDamage: 150 + lvl,
      rageGainRate: 100,
    };
    // Add equipment stats (8 slots)
    for (const slot of Object.values(this.equipped)) {
      if (slot && slot.stats) {
        for (const [k, v] of Object.entries(slot.stats)) {
          if (base[k] !== undefined) base[k] += v;
        }
      }
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
    const item = this.inventory.find(i => i.id === itemId);
    if (!item || !item.petSlot) return;
    if (this.petEquipped[item.petSlot] === undefined) return;
    // Unequip current
    if (this.petEquipped[item.petSlot]) {
      this.inventory.push(this.petEquipped[item.petSlot]);
    }
    this.petEquipped[item.petSlot] = item;
    this.removeItem(itemId);
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
  summonSpirit(spirit) {
    this.spirits.push(spirit);
    this.stats.spiritsSummoned++;
    EventBus.emit('spirits:changed', this.spirits);
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
      inventory: data.inventory ?? [],
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
    EventBus.emit('state:reset');
  }
};

export default GameState;
