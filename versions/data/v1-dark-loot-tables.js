// Loot/drop probability tables
import { WEAPONS, ARMORS, ACCESSORIES, RESOURCES } from './items.js';
import { rollSpiritItemRarity, getSpiritsByRarity } from './spirits.js';
import { createSpiritPartItem } from './spirit-parts-config.js';

// Marble shooting loot table
// Higher score → better loot tier
export function rollMarbleLoot(score, stageId) {
  const rolls = [];
  const numDrops = score >= 400 ? 3 : score >= 200 ? 2 : 1;

  for (let i = 0; i < numDrops; i++) {
    const roll = Math.random();
    const stageBonus = (stageId - 1) * 0.05;

    if (roll < 0.05 + stageBonus) {
      rolls.push(pickRandom(getItemsOfRarity('epic')));
    } else if (roll < 0.25 + stageBonus) {
      rolls.push(pickRandom(getItemsOfRarity('rare')));
    } else if (roll < 0.55) {
      rolls.push(pickRandom(getItemsOfRarity('common')));
    } else if (roll < 0.80) {
      rolls.push(pickRandom(RESOURCES));
    } else {
      rolls.push({ name: '금화', emoji: '💰', type: 'gold', value: 50 + stageId * 30 + Math.floor(Math.random() * 50) });
    }
  }

  return rolls;
}

// Treasure chest loot (spirit parts) - 파츠 시스템
export function rollTreasureLoot(diceSum, stageId) {
  let numItems;
  if (diceSum >= 10) numItems = 3;
  else if (diceSum >= 7) numItems = 2;
  else numItems = 1;

  const items = [];
  for (let i = 0; i < numItems; i++) {
    const rarity = rollSpiritItemRarity();
    const spiritsOfRarity = getSpiritsByRarity(rarity);
    if (spiritsOfRarity.length === 0) continue;
    const spirit = pickRandom(spiritsOfRarity);
    items.push(createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity));
  }

  const goldBonus = diceSum * 15 + stageId * 20;
  items.push({ name: '금화', emoji: '💰', type: 'gold', value: goldBonus });

  return items;
}

function getItemsOfRarity(rarity) {
  return [...WEAPONS, ...ARMORS, ...ACCESSORIES].filter(i => i.rarity === rarity);
}

function pickRandom(arr) {
  return { ...arr[Math.floor(Math.random() * arr.length)] };
}
