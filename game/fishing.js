/* 钓鱼系统（从 game.js 拆出，需在 game.js 之前加载） */
const fishing = {
  running: false,
  startAt: 0,
  duration: 30000,
  nextStartAt: 0,
  timerId: 0
};

function resetFishingBtn() {
  const btn = $('fishingBtn');
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = '溪边垂钓';
  btn.style.backgroundImage = '';
  btn.style.backgroundColor = '';
  btn.style.color = '';
}

function startFishing(plannedStartAt) {
  if (fishing.running) return;
  if (!storyFlags.fishingUnlocked) return;
  if (battleActive()) {
    showToast('战斗中无法垂钓');
    return;
  }
  if (getFishingLevel() < 100) stopTraining();

  fishing.running = true;
  fishing.nextStartAt = 0;
  fishing.duration = getFishingDuration();
  fishing.startAt = Number(plannedStartAt) > 0 ? Number(plannedStartAt) : Date.now();

  const btn = $('fishingBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '垂钓中...';
    btn.style.backgroundColor = '#30483d';
    btn.style.color = '#f8f5eb';
    btn.style.backgroundImage = 'none';
  }
  updateTrainingUI();
}

function renderFishingProgress(pct) {
  const btn = $('fishingBtn');
  if (!btn) return;
  btn.style.backgroundImage = `linear-gradient(to right, rgba(183,163,107,0.85) 0%, rgba(183,163,107,0.85) ${pct}%, transparent ${pct}%, transparent 100%)`;
}

function fishingLoop() {
  let guard = 0;
  while (guard++ < 20) {
    if (fishing.running) {
      const elapsed = Date.now() - fishing.startAt;
      if (elapsed < fishing.duration) {
        renderFishingProgress(Math.min(100, elapsed / fishing.duration * 100));
        return;
      }
      const caughtAt = fishing.startAt + fishing.duration;
      fishing.running = false;
      try {
        finishFishing(caughtAt);
      } finally {
        const soak = caughtAt + 300;
        fishing.nextStartAt = Math.min(soak, Date.now() + 300);
      }
      continue;
    }
    const now = Date.now();
    if (!fishing.nextStartAt || now < fishing.nextStartAt) return;
    const plannedStartAt = fishing.nextStartAt;
    fishing.nextStartAt = 0;
    if (!storyFlags.fishingUnlocked) return;
    if (battleActive()) return;
    startFishing(plannedStartAt);
  }
}

function startFishingEngine() {
  if (fishing.timerId) return;
  fishing.timerId = setInterval(fishingLoop, 200);
}

function cancelFishing() {
  fishing.nextStartAt = 0;
  if (!fishing.running) return;
  fishing.running = false;
  resetFishingBtn();
  updateTrainingUI();
}

function finishFishing(caughtAt) {
  resetFishingBtn();
  const result = doFishingRoll();
  const oldLevel = getFishingLevel();
  if (result.type === 'empty') {
    result.expGained = 10 * getFishingExpMultiplier();
    addFishingExp(result.expGained);
  } else {
    const baseExp = { common: 16, rare: 37, epic: 100 }[result.category] || 12;
    const qEffect = Math.max(0, result.Q * 0.3);
    result.expGained = (baseExp + qEffect * 0.75) * (1 + qEffect * 0.001) * (result.rewardCount || 1) * getFishingExpMultiplier();
    addFishingExp(result.expGained);
  }
  if (getFishingLevel() > oldLevel) result.levelUp = getFishingLevel();
  showFishingResult(result, caughtAt);

  if (result.type === 'catch' && !storyFlags.firstFishCaught) {
    storyFlags.firstFishCaught = true;
    addIntel('夏扑萤抱着一大堆柴火蹦蹦跳跳地跑到你身边来了。', 'gold');
    updateFishingBtn();
  }

  updateTrainingUI();
  saveGame();

  scheduleNextFishing();
}

function scheduleNextFishing(delay = 300) {
  fishing.nextStartAt = Date.now() + delay;
}

startFishingEngine();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) fishingLoop();
});

/* 玩家正常钓鱼时的品质公式（陪伴事件也会用到） */
function rollFishingQuality() {
  const L = getFishingLevel();
  const S = getTotalLuck();

  const P = 0.03 * L + 0.1 * S;
  const R1p = Math.pow(Math.random(), 1.5) * 1.25;
  const R2p = Math.pow(Math.random(), 1.5) * 1.25;
  const baodi = Math.max(0, 70 * (P - 0.5));

  const E = 1 + 0.01 * L;
  const rawQ = (100 * R1p * (1 + R2p * P) + baodi) * E;
  return (rawQ + getFishingQualityFixed(L)) * getFishingQualityMultiplier(L);
}

function rollFishingCatch() {
  const L = getFishingLevel();
  const Q = rollFishingQuality();

  if (Q < 5) {
    return { type: 'empty', Q, message: '水面泛起涟漪，鱼儿却不上钩...' };
  }

  const roll = Math.random();
  let category, itemId;
  if (roll < 0.90) {
    category = 'common';
    const pick = Math.random();
    if (pick < 1/3) itemId = 'jiyu';
    else if (pick < 2/3) itemId = 'caoyu';
    else itemId = 'baitiao';
  } else if (roll < 0.99) {
    category = 'rare';
    itemId = 'chilinyu';
  } else {
    category = 'epic';
    itemId = 'wuxueXinde';
  }

  const lucky = Math.random() < 0.001;
  const dblChance = L >= 50 ? Math.min(1, Math.max(0, L - 20) / 100) : 0;
  const rewardCount = (dblChance > 0 && Math.random() < dblChance) ? 2 : 1;
  const result = { type: 'catch', Q, category, itemId, lucky, rewardCount };

  if (itemId === 'wuxueXinde') {
    result.baseWeight = 1;
    result.weight = 1;
  } else {
    const weight = rollFishWeight(itemId, Q);
    const base = FISH_BASE_WEIGHT[itemId];
    result.weight = weight;
    result.baseWeight = (base.min + base.max) / 2;
  }

  return result;
}

function doFishingRoll() {
  const roll = rollFishingCatch();
  if (roll.type === 'empty') return roll;

  const result = Object.assign({}, roll, { gains: [] });
  if (roll.itemId === 'wuxueXinde') {
    addItem('wuxueXinde', roll.rewardCount);
    result.gains.push({ name: '武学心得', qty: roll.rewardCount });
  } else {
    addItem(roll.itemId, roll.rewardCount, { weight: roll.weight });
    result.gains.push({ name: ITEM_DEFS[roll.itemId].name, weight: roll.weight, qty: roll.rewardCount });
  }

  if (roll.lucky) {
    addItem('wuxueXinde', roll.rewardCount);
    result.gains.push({ name: '武学心得', fromLucky: true, qty: roll.rewardCount });
  }

  return result;
}

/* 品质对鱼重量的加成由 1 + Q*0.002 降为 1 + Q*0.001，削弱品质对最终效果的影响 */
function rollFishWeight(itemId, Q) {
  const base = FISH_BASE_WEIGHT[itemId];
  if (!base) return 0;
  const mult = 1 + Q * 0.0015;
  const min = base.min * mult;
  const max = base.max * mult;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function showFishingResult(result, at) {
  if (result.type === 'empty') {
    const levelText = result.levelUp ? `　钓鱼提升至 Lv.${result.levelUp}！` : '';
    addIntel(
      `${result.message}（钓鱼经验 +${Math.round(result.expGained || 5)}）${levelText}`,
      result.levelUp ? 'gold' : '',
      at
    );
    return;
  }

  const parts = result.gains.map(g => {
    const qty = g.qty > 1 ? ` ×${g.qty}` : '';
    if (g.weight != null) return `${g.name} ${g.weight.toFixed(2)}s${qty}`;
    return `${g.name}${qty}`;
  });

  let msg = `收竿！${parts.join('、')}`;
  if (result.lucky) msg += '　浮漂猛地一沉，竟有意外之喜！';
  msg += `（钓鱼经验 +${Math.round(result.expGained || 0)}）`;
  if (result.levelUp) msg += `　钓鱼提升至 Lv.${result.levelUp}！`;

  let cls = '';
  if (result.levelUp || result.category === 'epic') cls = 'gold';
  else if (result.category === 'rare' || result.lucky) cls = 'good';

  addIntel(msg, cls, at);
}