/* 钓鱼系统（从 game.js 拆出，需在 game.js 之前加载） */
const fishing = {
  running: false,
  startAt: 0,
  duration: 30000,
  nextStartAt: 0,
  timerId: 0
};

function canFishHere() {
  return !!(typeof storyFlags !== 'undefined' && (storyFlags.fishingUnlocked || storyFlags.arrivedCapital));
}

function getFishingBtnEntries() {
  return [
    { id: 'fishingBtn', label: '溪边垂钓' },
    { id: 'capitalFishingBtn', label: '钓 鱼' }
  ];
}

function resetFishingBtn() {
  for (const entry of getFishingBtnEntries()) {
    const btn = $(entry.id);
    if (!btn) continue;
    btn.disabled = false;
    btn.textContent = entry.label;
    btn.style.backgroundImage = '';
    btn.style.backgroundColor = '';
    btn.style.color = '';
  }
}

function getFishingDoubleChance(level = getFishingLevel()) {
  const L = Math.max(0, Number(level) || 0);
  return L >= 50 ? Math.min(1, Math.max(0, L - 20) / 100) : 0;
}

/* 渔者 Lv.100 突破：边修炼边钓鱼时读条速度减算 60%，实时平滑重算剩余时间 */
function syncFishingConcurrentDuration() {
  if (!fishing.running) return;
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  const oldDur = Math.max(1000, Number(fishing.duration) || 1000);
  const newDur = getFishingDuration();
  if (Math.abs(oldDur - newDur) < 1) return;
  const pct = Math.min(1, Math.max(0, (now - fishing.startAt) / oldDur));
  fishing.duration = newDur;
  fishing.startAt = now - pct * newDur;
}

function startFishing(plannedStartAt) {
  if (fishing.running) return;
  if (!canFishHere()) return;
  if (battleActive()) {
    showToast('战斗中无法垂钓');
    return;
  }
  if (getFishingLevel() < 100) stopTraining();

  fishing.running = true;
  fishing.nextStartAt = 0;
  fishing.duration = getFishingDuration();
  fishing.startAt = Number(plannedStartAt) > 0
    ? Number(plannedStartAt)
    : (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now());

  for (const entry of getFishingBtnEntries()) {
    const btn = $(entry.id);
    if (!btn) continue;
    btn.disabled = true;
    btn.textContent = '垂钓中...';
    btn.style.backgroundColor = '#30483d';
    btn.style.color = '#f8f5eb';
    btn.style.backgroundImage = 'none';
  }
  updateTrainingUI();
}

function renderFishingProgress(pct) {
  for (const entry of getFishingBtnEntries()) {
    const btn = $(entry.id);
    if (!btn) continue;
    btn.style.backgroundImage = `linear-gradient(to right, rgba(183,163,107,0.85) 0%, rgba(183,163,107,0.85) ${pct}%, transparent ${pct}%, transparent 100%)`;
  }
}

function fishingLoop() {
  let guard = 0;
  while (guard++ < 20) {
    const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
    if (fishing.running) {
      const elapsed = now - fishing.startAt;
      if (elapsed < fishing.duration) {
        renderFishingProgress(Math.min(100, elapsed / fishing.duration * 100));
        return;
      }
      const caughtAt = fishing.startAt + fishing.duration;
      fishing.running = false;
      try {
        finishFishing(caughtAt);
      } finally {
        const curNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
        const soak = caughtAt + 300;
        fishing.nextStartAt = Math.min(soak, curNow + 300);
      }
      continue;
    }
    if (!fishing.nextStartAt || now < fishing.nextStartAt) return;
    const plannedStartAt = fishing.nextStartAt;
    fishing.nextStartAt = 0;
    if (!canFishHere()) return;
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
  showFishingResult(result, Date.now());

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
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  fishing.nextStartAt = now + delay;
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

const CAPITAL_COMMON_FISH = ['bailingyu', 'xishiban', 'hongwei', 'qingyu'];
const FISHING_NON_FISH_IDS = ['wuxueXinde', 'wuxueGanwu', 'dahuanDan'];

function rollFishingCatch() {
  const L = getFishingLevel();
  const Q = rollFishingQuality();

  if (Q < 5) {
    return { type: 'empty', Q, message: '水面泛起涟漪，鱼儿却不上钩...' };
  }

  const inCapital = !!(typeof storyFlags !== 'undefined' && storyFlags.arrivedCapital);
  const roll = Math.random();
  let category, itemId;
  if (inCapital) {
    if (roll < 0.95) {
      category = 'common';
      itemId = CAPITAL_COMMON_FISH[Math.floor(Math.random() * CAPITAL_COMMON_FISH.length)];
    } else if (roll < 0.988) {
      category = 'rare';
      itemId = 'wuxueGanwu';
    } else {
      category = 'epic';
      itemId = 'dahuanDan';
    }
  } else {
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
  }

  const lucky = Math.random() < 0.001;
  const dblChance = getFishingDoubleChance(L);
  const rewardCount = (dblChance > 0 && Math.random() < dblChance) ? 2 : 1;
  const result = { type: 'catch', Q, category, itemId, lucky, rewardCount };

  if (FISHING_NON_FISH_IDS.includes(itemId)) {
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
  if (FISHING_NON_FISH_IDS.includes(roll.itemId)) {
    addItem(roll.itemId, roll.rewardCount);
    result.gains.push({ name: ITEM_DEFS[roll.itemId].name, qty: roll.rewardCount });
  } else {
    addItem(roll.itemId, roll.rewardCount, { weight: roll.weight, quality: roll.Q });
    result.gains.push({ name: ITEM_DEFS[roll.itemId].name, weight: roll.weight, quality: roll.Q, qty: roll.rewardCount });
  }

  if (roll.lucky) {
    const luckyId = (typeof storyFlags !== 'undefined' && storyFlags.arrivedCapital) ? 'wuxueGanwu' : 'wuxueXinde';
    addItem(luckyId, roll.rewardCount);
    result.gains.push({ name: ITEM_DEFS[luckyId].name, fromLucky: true, qty: roll.rewardCount });
  }

  return result;
}

/* 品质对鱼重量的加成：1 + Q*0.0015 */
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
    if (g.weight != null) {
      const qTxt = g.quality != null ? `（品质 ${Math.round(g.quality)}）` : '';
      return `${g.name} ${g.weight.toFixed(2)}s${qTxt}${qty}`;
    }
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
