/**
 * marble-events.js — 마블 칸 이벤트 시스템
 * 10종 이벤트: 시작/보물/전투/골드/상점/함정/회복/미스터리/소환나무/보스
 * DOM 팝업 기반, 콜백으로 완료 통지
 */

import GameState from '../core/game-state.js';
import { showToast, showConfetti } from '../ui/toast.js';
import { createSpiritPartItem } from '../data/spirit-parts-config.js';
import SPIRITS, { rollSpiritItemRarity, getSpiritsByRarity, RARITY_COLORS, RARITY_NAMES } from '../data/spirits.js';

// ── 보물 풀 ──
const TREASURE_POOL = [
  { type: 'fragment', name: '정령 조각', count: 2, emoji: '🔮' },
  { type: 'gold',     name: '골드 주머니', count: 100, emoji: '💰' },
  { type: 'potion',   name: 'HP 포션', count: 1, emoji: '🧪' },
  { type: 'diamond',  name: '다이아', count: 5, emoji: '💎' },
  { type: 'fragment', name: '희귀 조각', count: 3, emoji: '✨' },
];

function rollTreasure() {
  return TREASURE_POOL[Math.floor(Math.random() * TREASURE_POOL.length)];
}

// ── 상점 아이템 ──
const SHOP_ITEMS = [
  { name: 'HP 포션', emoji: '🧪', effect: 'heal', value: 30, price: 50 },
  { name: '공격력 부적', emoji: '⚔️', effect: 'atk', value: 3, price: 80 },
  { name: '방어 부적', emoji: '🛡️', effect: 'def', value: 2, price: 60 },
  { name: '행운의 주사위', emoji: '🎲', effect: 'luck', value: 1, price: 100 },
];

/**
 * 마블 칸 이벤트 실행
 * @param {object} tile - 도착한 칸 정보 { type, emoji, name, index }
 * @param {function} callback - 이벤트 완료 콜백
 */
export function executeTileEvent(tile, callback) {
  switch (tile.type) {
    case 'start':
      _eventStart(tile, callback);
      break;
    case 'treasure':
      _eventTreasure(tile, callback);
      break;
    case 'battle':
      _eventBattle(tile, callback);
      break;
    case 'gold':
      _eventGold(tile, callback);
      break;
    case 'shop':
      _eventShop(tile, callback);
      break;
    case 'trap':
      _eventTrap(tile, callback);
      break;
    case 'heal':
      _eventHeal(tile, callback);
      break;
    case 'mystery':
      _eventMystery(tile, callback);
      break;
    case 'spirit':
      _eventSpirit(tile, callback);
      break;
    case 'boss':
      _eventBoss(tile, callback);
      break;
    default:
      callback();
      break;
  }
}

// ── 이벤트 팝업 헬퍼 ──

function _showEventPopup(emoji, title, lines, btnText, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'marble-event-overlay';
  overlay.innerHTML = `
    <div class="marble-event-card">
      <div class="marble-event-emoji">${emoji}</div>
      <div class="marble-event-title">${title}</div>
      <div class="marble-event-body">${lines.join('<br>')}</div>
      <button class="btn btn-primary marble-event-btn">${btnText}</button>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);

  // 팝업 등장 애니메이션
  requestAnimationFrame(() => overlay.classList.add('show'));

  overlay.querySelector('.marble-event-btn').onclick = () => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 200);
  };

  return overlay;
}

// ── 시작 칸 ──
function _eventStart(tile, callback) {
  // 시작 칸: 약간의 골드 보너스
  const bonus = 20;
  GameState.addGold(bonus);
  showToast(`🏠 시작점 통과! +${bonus}G`);
  callback();
}

// ── 보물상자 ──
function _eventTreasure(tile, callback) {
  const treasure = rollTreasure();
  let rewardText = '';

  if (treasure.type === 'gold') {
    GameState.addGold(treasure.count);
    rewardText = `💰 ${treasure.count}G 획득!`;
  } else if (treasure.type === 'fragment') {
    // 정령 파츠 드랍
    const rarity = rollSpiritItemRarity();
    const spiritList = getSpiritsByRarity(rarity);
    if (spiritList && spiritList.length > 0) {
      const spirit = spiritList[Math.floor(Math.random() * spiritList.length)];
      const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
      GameState.addSpiritItem(partItem);
      rewardText = `🔮 ${spirit.emoji} 정령 조각 (${RARITY_NAMES[rarity]}) ×${treasure.count} 획득!`;
    } else {
      GameState.addGold(50);
      rewardText = '💰 50G 획득! (조각 대신)';
    }
  } else if (treasure.type === 'potion') {
    const heal = 30;
    GameState.player.hp = Math.min(GameState.player.hp + heal, GameState.player.maxHp);
    rewardText = `🧪 HP +${heal} 회복!`;
  } else if (treasure.type === 'diamond') {
    GameState.addGold(treasure.count * 20);
    rewardText = `💎 다이아 ${treasure.count}개! (+${treasure.count * 20}G)`;
  }

  _showEventPopup('🎁', '보물상자!', [rewardText], '확인', () => {
    showConfetti();
    callback();
  });
}

// ── 전투 ──
function _eventBattle(tile, callback) {
  // 미니 전투: 즉시 결과 (적 데미지 vs 플레이어 공격)
  const enemyHp = 30 + Math.floor(Math.random() * 40);
  const enemyAtk = 5 + Math.floor(Math.random() * 8);
  const playerAtk = GameState.player.attack;
  const playerDef = GameState.player.defense;

  // 간단 전투 시뮬: 데미지 교환
  const turnsToKill = Math.ceil(enemyHp / Math.max(1, playerAtk));
  const damageToPlayer = Math.max(1, enemyAtk - playerDef) * Math.max(1, turnsToKill - 1);
  const actualDamage = Math.min(damageToPlayer, 30); // 최대 30 데미지
  const goldReward = 30 + Math.floor(Math.random() * 50);

  GameState.player.hp = Math.max(1, GameState.player.hp - actualDamage);
  GameState.addGold(goldReward);

  _showEventPopup('⚔️', '전투 발생!', [
    `슬라임과 전투! (HP: ${enemyHp}, ATK: ${enemyAtk})`,
    `받은 피해: -${actualDamage} HP`,
    `보상: +${goldReward}G`,
  ], '전투 완료', callback);
}

// ── 골드 ──
function _eventGold(tile, callback) {
  const gold = 50 + Math.floor(Math.random() * 151);
  GameState.addGold(gold);

  _showEventPopup('💰', '골드 발견!', [
    `반짝이는 골드 주머니를 발견했다!`,
    `+${gold}G 획득!`,
  ], '줍줍!', callback);
}

// ── 상점 ──
function _eventShop(tile, callback) {
  const items = SHOP_ITEMS.slice().sort(() => Math.random() - 0.5).slice(0, 3);

  const overlay = document.createElement('div');
  overlay.className = 'marble-event-overlay';
  overlay.innerHTML = `
    <div class="marble-event-card" style="max-width:340px;">
      <div class="marble-event-emoji">🏪</div>
      <div class="marble-event-title">여행 상점</div>
      <div class="marble-event-body">💰 보유: ${GameState.gold}G</div>
      <div class="shop-items" id="shop-items"></div>
      <button class="btn btn-secondary marble-event-btn" id="shop-close">나가기</button>
    </div>
  `;
  document.getElementById('app').appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const shopContainer = overlay.querySelector('#shop-items');
  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm shop-item-btn';
    btn.style.cssText = 'display:block;width:100%;margin:4px 0;text-align:left;padding:8px 12px;';
    btn.innerHTML = `${item.emoji} ${item.name} <span style="color:var(--gold);float:right;">${item.price}G</span>`;
    btn.onclick = () => {
      if (GameState.gold < item.price) {
        showToast('💸 골드가 부족해요!');
        return;
      }
      GameState.addGold(-item.price);
      _applyShopItem(item);
      showToast(`${item.emoji} ${item.name} 구매!`);
      btn.disabled = true;
      btn.style.opacity = '0.5';
      // 보유 골드 업데이트
      const bodyEl = overlay.querySelector('.marble-event-body');
      if (bodyEl) bodyEl.textContent = `💰 보유: ${GameState.gold}G`;
    };
    shopContainer.appendChild(btn);
  }

  overlay.querySelector('#shop-close').onclick = () => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
      callback();
    }, 200);
  };
}

function _applyShopItem(item) {
  switch (item.effect) {
    case 'heal':
      GameState.player.hp = Math.min(GameState.player.hp + item.value, GameState.player.maxHp);
      break;
    case 'atk':
      GameState.player.attack += item.value;
      break;
    case 'def':
      GameState.player.defense += item.value;
      break;
    case 'luck':
      // 행운 효과: 다음 주사위 +1 (별도 처리 필요 없으면 골드 환급)
      GameState.addGold(30);
      showToast('🍀 행운이 찾아왔다! +30G');
      break;
  }
}

// ── 함정 ──
function _eventTrap(tile, callback) {
  const damage = 10 + Math.floor(Math.random() * 20);
  GameState.player.hp = Math.max(1, GameState.player.hp - damage);

  _showEventPopup('💀', '함정!', [
    '으악! 바닥에 함정이 있었다!',
    `HP -${damage} 피해!`,
    `남은 HP: ${GameState.player.hp}/${GameState.player.maxHp}`,
  ], '으윽...', callback);
}

// ── 회복 ──
function _eventHeal(tile, callback) {
  const heal = 20 + Math.floor(Math.random() * 30);
  const before = GameState.player.hp;
  GameState.player.hp = Math.min(GameState.player.hp + heal, GameState.player.maxHp);
  const actual = GameState.player.hp - before;

  _showEventPopup('💚', '치유의 샘!', [
    '맑은 샘물이 상처를 치유해준다!',
    `HP +${actual} 회복!`,
    `현재 HP: ${GameState.player.hp}/${GameState.player.maxHp}`,
  ], '상쾌하다!', callback);
}

// ── 미스터리 ──
function _eventMystery(tile, callback) {
  const isBad = Math.random() < 0.3;
  if (isBad) {
    // 30% 함정
    _eventTrap({ ...tile, type: 'trap' }, callback);
  } else if (Math.random() < 0.5) {
    // 35% 보물
    _eventTreasure({ ...tile, type: 'treasure' }, callback);
  } else {
    // 35% 골드
    _eventGold({ ...tile, type: 'gold' }, callback);
  }
}

// ── 소환나무 ──
function _eventSpirit(tile, callback) {
  // 정령 조각 보너스 2세트
  const rarity = rollSpiritItemRarity();
  const spiritList = getSpiritsByRarity(rarity);
  let rewardText = '';

  if (spiritList && spiritList.length > 0) {
    for (let i = 0; i < 2; i++) {
      const spirit = spiritList[Math.floor(Math.random() * spiritList.length)];
      const partItem = createSpiritPartItem(spirit.key, spirit.name, spirit.emoji, rarity);
      GameState.addSpiritItem(partItem);
    }
    rewardText = `🔮 정령 조각 ×2 획득! (${RARITY_NAMES[rarity]})`;
  } else {
    GameState.addGold(80);
    rewardText = '💰 소환나무가 80G를 선물했다!';
  }

  _showEventPopup('🌳', '소환나무!', [
    '소환의 나무가 빛나고 있다!',
    rewardText,
  ], '감사!', () => {
    showConfetti();
    callback();
  });
}

// ── 보스 ──
function _eventBoss(tile, callback) {
  // 보스 전투: 더 강한 적, 더 큰 보상
  const bossHp = 100 + Math.floor(Math.random() * 50);
  const bossAtk = 12 + Math.floor(Math.random() * 8);
  const playerAtk = GameState.player.attack;
  const playerDef = GameState.player.defense;

  const turnsToKill = Math.ceil(bossHp / Math.max(1, playerAtk));
  const damageToPlayer = Math.max(2, bossAtk - playerDef) * Math.max(1, turnsToKill - 1);
  const actualDamage = Math.min(damageToPlayer, 50);
  const goldReward = 100 + Math.floor(Math.random() * 100);

  GameState.player.hp = Math.max(1, GameState.player.hp - actualDamage);
  GameState.addGold(goldReward);

  _showEventPopup('👹', '보스 출현!', [
    `강력한 보스! (HP: ${bossHp}, ATK: ${bossAtk})`,
    `격렬한 전투! 받은 피해: -${actualDamage} HP`,
    `보상: +${goldReward}G 🎉`,
  ], '승리!', () => {
    showConfetti();
    callback();
  });
}
