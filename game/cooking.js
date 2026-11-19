/* 烹饪系统（从 game.js 拆出，需在 game.js 之前加载） */
const cookingState = {
  running: false,
  startAt: 0,
  timerId: 0,
  recipe: 'kaoyu',
  selected: {},
  pending: []
};

function getFishStock() {
  const stock = {};
  for (const slot of player.inventory || []) {
    if (!FISH_EFFECTS[slot.id]) continue;
    stock[slot.id] = (stock[slot.id] || 0) + (Number(slot.qty) || 0);
  }
  return stock;
}

function getVegStock() {
  const stock = {};
  if (typeof VEG_EFFECTS === 'undefined') return stock;
  for (const slot of player.inventory || []) {
    if (!VEG_EFFECTS[slot.id]) continue;
    stock[slot.id] = (stock[slot.id] || 0) + (Number(slot.qty) || 0);
  }
  return stock;
}

function getCookingRecipeStock(recipeId = cookingState.recipe) {
  if (recipeId === 'shuizhuShucai') return getVegStock();
  const stock = getFishStock();
  if (recipeId === 'shucaiDunyu') {
    const vStock = getVegStock();
    for (const vid in vStock) stock[vid] = vStock[vid];
  }
  return stock;
}

function getAvailableCookRecipes() {
  const list = [COOK_RECIPES.kaoyu];
  if (typeof storyFlags !== 'undefined' && storyFlags.farmUnlocked) {
    if (COOK_RECIPES.shuizhuShucai) list.push(COOK_RECIPES.shuizhuShucai);
    if (COOK_RECIPES.shucaiDunyu) list.push(COOK_RECIPES.shucaiDunyu);
  }
  return list.filter(Boolean);
}

function getCookingStoveInfo() {
  if (typeof storyFlags !== 'undefined' && storyFlags.arrivedCapital) {
    return { name: '小宅灶台', title: '住 处 · 灶 台 烹 饪', bonus: 20 };
  }
  const baseBonus = (typeof COOK_RECIPES !== 'undefined' && COOK_RECIPES[cookingState.recipe])
    ? COOK_RECIPES[cookingState.recipe].stoveBonus
    : 5;
  return { name: '后山火堆', title: '后 山 · 火 堆 烹 饪', bonus: baseBonus };
}

function consumeFishByType(fishId, count) {
  const consumed = [];
  for (let i = player.inventory.length - 1; i >= 0 && consumed.length < count; i--) {
    const slot = player.inventory[i];
    if (!slot || slot.id !== fishId) continue;
    while (slot.qty > 0 && consumed.length < count) {
      consumed.push({
        fishId,
        weight: slot.data ? Number(slot.data.weight) || 0 : 0,
        fishQuality: slot.data && slot.data.quality != null && Number.isFinite(Number(slot.data.quality))
          ? Number(slot.data.quality)
          : null
      });
      slot.qty--;
    }
    if (slot.qty <= 0) player.inventory.splice(i, 1);
  }
  renderBag();
  return consumed;
}

function consumeVegByType(vegId, count) {
  const consumed = [];
  for (let i = player.inventory.length - 1; i >= 0 && consumed.length < count; i--) {
    const slot = player.inventory[i];
    if (!slot || slot.id !== vegId) continue;
    while (slot.qty > 0 && consumed.length < count) {
      consumed.push({
        vegId,
        vegQuality: slot.data && slot.data.quality != null && Number.isFinite(Number(slot.data.quality))
          ? Number(slot.data.quality)
          : 100
      });
      slot.qty--;
    }
    if (slot.qty <= 0) player.inventory.splice(i, 1);
  }
  renderBag();
  return consumed;
}

function shuffleCookingArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/* 从库存字典 stock 中随机均匀不放回抽取 pickCount 个物品 ID，返回 { id: count } */
function pickRandomStockCounts(stock, pickCount) {
  const entries = Object.entries(stock)
    .map(([id, cnt]) => ({ id, rem: Math.max(0, Math.floor(Number(cnt) || 0)) }))
    .filter(e => e.rem > 0);
  const total = entries.reduce((sum, e) => sum + e.rem, 0);
  if (pickCount <= 0 || total <= 0) return {};
  if (pickCount >= total) {
    const all = {};
    for (const e of entries) all[e.id] = e.rem;
    return all;
  }

  /* 当需要抽取的数量超过一半时，反向抽取要排除的数量，确保在大库存下也只需极少次数 */
  const invert = pickCount > total / 2;
  const draws = invert ? (total - pickCount) : pickCount;
  const picked = {};
  let remTotal = total;

  for (let k = 0; k < draws; k++) {
    let r = Math.floor(Math.random() * remTotal);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.rem <= 0) continue;
      if (r < e.rem) {
        e.rem--;
        remTotal--;
        picked[e.id] = (picked[e.id] || 0) + 1;
        break;
      }
      r -= e.rem;
    }
  }

  if (invert) {
    const res = {};
    for (const e of entries) {
      if (e.rem > 0) res[e.id] = e.rem;
    }
    return res;
  }
  return picked;
}

const COOK_DIFFICULTY_SCALE = 1.2;

function calcCookQuality(level, stoveBonus) {
  const R1 = Math.random();
  const R2 = Math.random();
  const R1p = Math.pow(R1, 1.5);
  const R2p = Math.pow(R2, 1.5);
  const inner = 100 * 1.25 * R1p * (1 + 1.25 * R2p * 0.1 * level);
  const baodi = Math.max(0, 50 * (0.05 * level - 0.15));
  const fixed = getPaodingFixedBonus() + (stoveBonus || 0);
  const mult = getPaodingQualityMultiplier();
  const last = Math.pow(0.5 + level / 25, 2);
  return Math.max(0, ((inner + baodi) * (1 + 0.01 * level) + fixed) * mult * last * COOK_DIFFICULTY_SCALE);
}

/* 烤鱼：+1 起每 +1 提升 10%（加算） */
function getCookTier(quality) {
  if (quality <= 20) return { prefix: '烤糊的', suffix: '', effectMult: 0.75, tier: 'burnt' };
  if (quality <= 50) return { prefix: '半焦的', suffix: '', effectMult: 0.9, tier: 'half' };
  const extra = Math.max(0, Math.floor((quality - 51) / 100));
  return { prefix: '烤', suffix: extra > 0 ? '+' + extra : '', effectMult: 1.2 + 0.1 * extra, tier: 'cooked' };
}

function buildCookedName(fishName, tier) {
  if (tier.tier === 'burnt') return '烤糊的' + fishName;
  if (tier.tier === 'half') return '半焦的' + fishName;
  return '烤' + fishName + tier.suffix;
}

function buildBoiledVegName(vegName, tier) {
  if (tier.tier === 'burnt') return '煮糊的' + vegName;
  if (tier.tier === 'half') return '半生的' + vegName;
  return '水煮' + vegName + tier.suffix;
}

/* 蔬菜炖鱼品质分段 */
function getStewTier(quality) {
  if (quality <= 70) return { tier: 'unknown', suffix: '', effectMult: 0.5 };
  if (quality <= 140) return { tier: 'charred', suffix: '', effectMult: 0.8 };
  if (quality <= 200) return { tier: 'plain', suffix: '', effectMult: 1.1 };
  if (quality <= 350) return { tier: 'normal', suffix: '', effectMult: 1.3 };
  const extra = Math.max(0, Math.floor((quality - 351) / 150));
  return { tier: 'master', suffix: extra > 0 ? '+' + extra : '', effectMult: 1.5 + 0.25 * extra };
}

function buildStewName(vegName, fishName, tier) {
  if (tier.tier === 'unknown') return '不知名物体';
  if (tier.tier === 'charred') return `焦黑的${vegName}炖${fishName}`;
  if (tier.tier === 'plain') return `平平无奇的${vegName}炖${fishName}`;
  if (tier.tier === 'normal') return `${vegName}炖${fishName}`;
  return `霜蔬煨锦鳞${tier.suffix}`;
}

function renderIngredientRows(ids, stock) {
  return ids.map(id => {
    const def = ITEM_DEFS[id];
    const total = stock[id];
    const sel = cookingState.selected[id] || 0;
    return `<div class="ingredient-item">
      <div>
        <div class="ing-name">${escapeHtml(def.name)}</div>
        <div class="ing-stock">库存 ${total}</div>
      </div>
      <div class="ing-ctrl">
        <button type="button" data-ing="${id}" data-dir="-1" ${sel <= 0 ? 'disabled' : ''}>−</button>
        <span class="ing-qty">${sel}</span>
        <button type="button" data-ing="${id}" data-dir="1" ${sel >= total ? 'disabled' : ''}>+</button>
        <button type="button" class="ing-all" data-ing="${id}" data-dir="all" ${sel >= total ? 'disabled' : ''}>全部</button>
        <button type="button" class="ing-cancel" data-ing="${id}" data-dir="cancel" ${sel <= 0 ? 'disabled' : ''}>取消</button>
      </div>
    </div>`;
  }).join('');
}

function renderCookingUI() {
  const recipes = getAvailableCookRecipes();
  if (!recipes.some(r => r.id === cookingState.recipe)) {
    cookingState.recipe = recipes[0] ? recipes[0].id : 'kaoyu';
  }

  const recipeEl = $('cookingRecipeList');
  if (recipeEl) {
    recipeEl.innerHTML = recipes.map(r => `
      <div class="recipe-item${r.id === cookingState.recipe ? ' active' : ''}" data-recipe="${r.id}">
        <div>${escapeHtml(r.name)}</div>
        <div class="recipe-item-desc">${escapeHtml(r.desc)}<br>${escapeHtml(r.reqDesc || '需求：鱼类 ×1')}</div>
      </div>
    `).join('');
  }

  const stove = getCookingStoveInfo();
  const headTitle = document.querySelector('#cookingOverlay .cooking-head span');
  if (headTitle) headTitle.textContent = stove.title;

  const stoveEl = $('stoveInfo');
  if (stoveEl) {
    stoveEl.innerHTML = `<div class="stove-card">
      <div class="stove-icon">🔥</div>
      <div class="stove-name">${escapeHtml(stove.name)}</div>
      <div class="stove-bonus">烹饪品质 +${stove.bonus}</div>
    </div>`;
  }

  const ingEl = $('cookingIngredientList');
  if (ingEl) {
    const fishStock = getFishStock();
    const fishIds = Object.keys(fishStock).filter(id => fishStock[id] > 0);

    if (cookingState.recipe === 'shucaiDunyu') {
      const vegStock = getVegStock();
      const vegIds = Object.keys(vegStock).filter(id => vegStock[id] > 0);
      if (!fishIds.length && !vegIds.length) {
        ingEl.innerHTML = '<div class="ing-empty">背包里没有可用的鱼类或蔬菜食材</div>';
      } else {
        let html = '';
        html += '<div class="ing-group-title">鱼 类</div>';
        html += fishIds.length
          ? renderIngredientRows(fishIds, fishStock)
          : '<div class="ing-empty" style="padding:10px 0">暂无可用鱼类</div>';
        html += '<div class="ing-group-title">蔬 菜</div>';
        html += vegIds.length
          ? renderIngredientRows(vegIds, vegStock)
          : '<div class="ing-empty" style="padding:10px 0">暂无可用蔬菜</div>';
        const hasSelected = Object.values(cookingState.selected).some(v => v > 0);
        const canFill = fishIds.length > 0 && vegIds.length > 0;
        html += `<div class="ing-footer">
          <button type="button" class="ing-clear ing-fill" id="cookingFillAllBtn" ${canFill ? '' : 'disabled'}>投 入 全 部</button>
          <button type="button" class="ing-clear" id="cookingClearAllBtn" ${hasSelected ? '' : 'disabled'}>清 空 食 材</button>
        </div>`;
        ingEl.innerHTML = html;
      }
    } else if (cookingState.recipe === 'shuizhuShucai') {
      const vegStock = getVegStock();
      const vegIds = Object.keys(vegStock).filter(id => vegStock[id] > 0);
      if (!vegIds.length) {
        ingEl.innerHTML = '<div class="ing-empty">背包里没有可用的蔬菜食材</div>';
      } else {
        let html = renderIngredientRows(vegIds, vegStock);
        const hasSelected = Object.values(cookingState.selected).some(v => v > 0);
        html += `<div class="ing-footer">
          <button type="button" class="ing-clear ing-fill" id="cookingFillAllBtn">投 入 全 部</button>
          <button type="button" class="ing-clear" id="cookingClearAllBtn" ${hasSelected ? '' : 'disabled'}>清 空 食 材</button>
        </div>`;
        ingEl.innerHTML = html;
      }
    } else {
      if (!fishIds.length) {
        ingEl.innerHTML = '<div class="ing-empty">背包里没有可用的鱼类食材</div>';
      } else {
        let html = renderIngredientRows(fishIds, fishStock);
        const hasSelected = Object.values(cookingState.selected).some(v => v > 0);
        html += `<div class="ing-footer">
          <button type="button" class="ing-clear ing-fill" id="cookingFillAllBtn">投 入 全 部</button>
          <button type="button" class="ing-clear" id="cookingClearAllBtn" ${hasSelected ? '' : 'disabled'}>清 空 食 材</button>
        </div>`;
        ingEl.innerHTML = html;
      }
    }
  }

  updateCookingUI();
}

function getSelectedCountsByKind() {
  let fishCount = 0;
  let vegCount = 0;
  for (const id in cookingState.selected) {
    const qty = Number(cookingState.selected[id]) || 0;
    if (qty <= 0) continue;
    if (FISH_EFFECTS[id]) fishCount += qty;
    else if (typeof VEG_EFFECTS !== 'undefined' && VEG_EFFECTS[id]) vegCount += qty;
  }
  return { fishCount, vegCount };
}

function updateCookingUI() {
  const btn = $('cookingStartBtn');
  if (btn) {
    btn.disabled = cookingState.running;
    btn.textContent = cookingState.running ? '烹饪中...' : '开始烹饪';
  }
  const statusEl = $('cookingStatusText');
  if (statusEl && !cookingState.running) {
    const { fishCount, vegCount } = getSelectedCountsByKind();
    if (cookingState.recipe === 'shucaiDunyu') {
      if (fishCount <= 0 && vegCount <= 0) {
        statusEl.textContent = '选择 1:1 数量的鱼类与蔬菜后点击烹饪';
      } else if (fishCount === vegCount && fishCount > 0) {
        statusEl.textContent = `已选择 鱼类 ${fishCount} 条 / 蔬菜 ${vegCount} 份（可炖制 ${fishCount} 份），点击开始烹饪`;
      } else {
        statusEl.textContent = `已选择 鱼类 ${fishCount} 条 / 蔬菜 ${vegCount} 份（需保持 1:1 数量配对）`;
      }
    } else if (cookingState.recipe === 'shuizhuShucai') {
      statusEl.textContent = vegCount > 0
        ? `已选择 ${vegCount} 份蔬菜，点击开始烹饪`
        : '选择食材后点击烹饪';
    } else {
      statusEl.textContent = fishCount > 0
        ? `已选择 ${fishCount} 条鱼，点击开始烹饪`
        : '选择食材后点击烹饪';
    }
  }
}

function openCooking() {
  cookingState.selected = {};
  cookingState.running = false;
  cookingState.pending = [];
  if ((cookingState.recipe === 'shucaiDunyu' || cookingState.recipe === 'shuizhuShucai') && !(typeof storyFlags !== 'undefined' && storyFlags.farmUnlocked)) {
    cookingState.recipe = 'kaoyu';
  }
  const fill = $('cookingProgressFill');
  if (fill) fill.style.width = '0%';
  renderCookingUI();
  $('cookingOverlay').classList.add('show');
}

function closeCooking() {
  if (cookingState.running) {
    showToast('烹饪中，无法离开');
    return;
  }
  $('cookingOverlay').classList.remove('show');
}

function startCooking() {
  if (cookingState.running) return;
  const recipe = COOK_RECIPES[cookingState.recipe];
  if (!recipe) return;

  if (cookingState.recipe === 'shucaiDunyu') {
    const fishStock = getFishStock();
    const vegStock = getVegStock();
    const fishPlan = [];
    const vegPlan = [];
    let fishTotal = 0;
    let vegTotal = 0;

    for (const id in cookingState.selected) {
      const want = Number(cookingState.selected[id]) || 0;
      if (want <= 0) continue;
      if (FISH_EFFECTS[id]) {
        const cnt = Math.min(want, fishStock[id] || 0);
        if (cnt > 0) { fishPlan.push({ fishId: id, count: cnt }); fishTotal += cnt; }
      } else if (typeof VEG_EFFECTS !== 'undefined' && VEG_EFFECTS[id]) {
        const cnt = Math.min(want, vegStock[id] || 0);
        if (cnt > 0) { vegPlan.push({ vegId: id, count: cnt }); vegTotal += cnt; }
      }
    }

    if (fishTotal <= 0 || vegTotal <= 0) {
      showToast('请同时选择鱼类与蔬菜食材');
      return;
    }
    if (fishTotal !== vegTotal) {
      showToast('蔬菜炖鱼需要鱼类与蔬菜保持 1:1 数量配对');
      return;
    }

    const fishPool = [];
    const vegPool = [];
    _bagRenderSuppress++;
    try {
      for (const p of fishPlan) {
        const items = consumeFishByType(p.fishId, p.count);
        for (const it of items) fishPool.push(it);
      }
      for (const p of vegPlan) {
        const items = consumeVegByType(p.vegId, p.count);
        for (const it of items) vegPool.push(it);
      }
    } finally {
      _bagRenderSuppress--;
    }
    renderBag();

    shuffleCookingArray(fishPool);
    shuffleCookingArray(vegPool);
    const pairCount = Math.min(fishPool.length, vegPool.length);
    const pending = [];
    for (let i = 0; i < pairCount; i++) {
      pending.push({
        recipe: 'shucaiDunyu',
        fishId: fishPool[i].fishId,
        weight: fishPool[i].weight,
        fishQuality: fishPool[i].fishQuality,
        vegId: vegPool[i].vegId,
        vegQuality: vegPool[i].vegQuality
      });
    }
    cookingState.pending = pending;
  } else if (cookingState.recipe === 'shuizhuShucai') {
    const stock = getVegStock();
    const plan = [];
    for (const vegId in cookingState.selected) {
      if (!(typeof VEG_EFFECTS !== 'undefined' && VEG_EFFECTS[vegId])) continue;
      const cnt = Math.min(cookingState.selected[vegId] || 0, stock[vegId] || 0);
      if (cnt > 0) plan.push({ vegId, count: cnt });
    }
    if (!plan.length) {
      showToast('请先选择食材');
      return;
    }

    const consumed = [];
    _bagRenderSuppress++;
    try {
      for (const p of plan) {
        const items = consumeVegByType(p.vegId, p.count);
        for (const it of items) consumed.push(it);
      }
    } finally {
      _bagRenderSuppress--;
    }
    renderBag();
    cookingState.pending = consumed.map(it => ({
      recipe: 'shuizhuShucai',
      vegId: it.vegId,
      vegQuality: it.vegQuality
    }));
  } else {
    const stock = getFishStock();
    const plan = [];
    for (const fishId in cookingState.selected) {
      if (!FISH_EFFECTS[fishId]) continue;
      const cnt = Math.min(cookingState.selected[fishId] || 0, stock[fishId] || 0);
      if (cnt > 0) plan.push({ fishId, count: cnt });
    }
    if (!plan.length) {
      showToast('请先选择食材');
      return;
    }

    const consumed = [];
    _bagRenderSuppress++;
    try {
      for (const p of plan) {
        const items = consumeFishByType(p.fishId, p.count);
        for (const it of items) consumed.push(it);
      }
    } finally {
      _bagRenderSuppress--;
    }
    renderBag();
    cookingState.pending = consumed;
  }

  cookingState.running = true;
  cookingState.startAt = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();

  const statusEl = $('cookingStatusText');
  if (statusEl) statusEl.textContent = '烹饪中……';
  updateCookingUI();
}

function cookingLoop() {
  if (!cookingState.running) return;
  const recipe = COOK_RECIPES[cookingState.recipe] || COOK_RECIPES.kaoyu;
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  const elapsed = now - cookingState.startAt;
  const pct = Math.min(100, elapsed / recipe.duration * 100);
  const fill = $('cookingProgressFill');
  if (fill) fill.style.width = pct + '%';
  if (pct >= 100) {
    cookingState.running = false;
    if (fill) fill.style.width = '0%';
    finishCooking();
  }
}

function startCookingEngine() {
  if (cookingState.timerId) return;
  cookingState.timerId = setInterval(cookingLoop, 100);
}

function finishCooking() {
  const items = cookingState.pending || [];
  cookingState.pending = [];
  const recipeId = cookingState.recipe;

  const stoveBonus = getCookingStoveInfo().bonus;
  const results = [];
  const t = ensurePaodingTechnique();
  let leveledAny = false;

  _bagRenderSuppress++;
  try {
    for (const it of items) {
      const level = getPaodingLevel();
      const quality = calcCookQuality(level, stoveBonus);
      const isStew = it.recipe === 'shucaiDunyu' || (recipeId === 'shucaiDunyu' && it.vegId && it.fishId);
      const isBoiled = it.recipe === 'shuizhuShucai' || (recipeId === 'shuizhuShucai' && it.vegId && !it.fishId);

      let outItemId = 'kaoyu';
      let itemData;
      let expMult = 1;

      if (isStew && it.vegId) {
        const tier = getStewTier(quality);
        const fishName = ITEM_DEFS[it.fishId] ? ITEM_DEFS[it.fishId].name : '鱼';
        const vegName = ITEM_DEFS[it.vegId] ? ITEM_DEFS[it.vegId].name : '菜';
        const name = buildStewName(vegName, fishName, tier);
        outItemId = 'shucaiDunyu';
        expMult = 1.75;
        itemData = {
          fishId: it.fishId,
          fishName,
          weight: it.weight,
          fishQuality: it.fishQuality,
          vegId: it.vegId,
          vegName,
          vegQuality: it.vegQuality,
          quality,
          name,
          effectMult: tier.effectMult
        };
      } else if (isBoiled && it.vegId) {
        const tier = getCookTier(quality);
        const vegName = ITEM_DEFS[it.vegId] ? ITEM_DEFS[it.vegId].name : '蔬菜';
        const name = buildBoiledVegName(vegName, tier);
        outItemId = 'shuizhuShucai';
        itemData = {
          vegId: it.vegId,
          vegName,
          vegQuality: it.vegQuality,
          quality,
          name,
          effectMult: tier.effectMult
        };
      } else {
        const tier = getCookTier(quality);
        const fishName = ITEM_DEFS[it.fishId] ? ITEM_DEFS[it.fishId].name : '鱼';
        const name = buildCookedName(fishName, tier);
        itemData = {
          fishId: it.fishId,
          fishName,
          weight: it.weight,
          fishQuality: it.fishQuality,
          quality,
          name,
          effectMult: tier.effectMult
        };
      }

      addItem(outItemId, 1, itemData);
      const exp = (10 + quality * 0.12) * (1 + quality * 0.0008) * getPaodingExpMultiplier() * expMult;
      results.push({ name: itemData.name, quality, exp });

      t.exp = (Number(t.exp) || 0) + exp;
      let guard = 0;
      while (t.exp >= getPaodingExpNeed(t.level) && guard++ < 1000) {
        t.exp -= getPaodingExpNeed(t.level);
        t.level++;
        leveledAny = true;
      }

      const dblChance = getPaodingDoubleChance();
      if (dblChance > 0 && Math.random() < dblChance) {
        addItem(outItemId, 1, { ...itemData });
        results.push({ name: itemData.name, quality, exp: 0, double: true });
      }
    }
  } finally {
    _bagRenderSuppress--;
  }

  /* 每道菜（含双倍产出）算 1 次烹饪；满 100 次领悟庖丁刀法 */
  player.cookCount = (Number(player.cookCount) || 0) + results.length;
  if (player.cookCount >= 100 && !hasPaodingDao()) learnPaodingDao();

  renderBag();
  if (leveledAny) updateAttrUI();
  renderTechniques();
  saveGame();

  const summary = {};
  for (const r of results) {
    summary[r.name] = (summary[r.name] || 0) + 1;
  }
  const parts = Object.entries(summary).map(([n, c]) => `${n}×${c}`);
  const totalExp = results.reduce((a, r) => a + (r.exp || 0), 0);
  let msg = `烹饪完成：${parts.join('、')}（庖丁经验 +${Math.round(totalExp)}）`;
  if (leveledAny) msg += `　庖丁提升至 Lv.${getPaodingLevel()}！`;
  addIntel(msg, leveledAny ? 'gold' : '');

  cookingState.selected = {};
  renderCookingUI();

  return {
    summary: parts,
    count: results.length,
    totalExp: Math.round(totalExp),
    leveledAny,
    paodingLevel: getPaodingLevel()
  };
}

const cookingRecipeListEl = $('cookingRecipeList');
if (cookingRecipeListEl) {
  cookingRecipeListEl.addEventListener('click', (e) => {
    if (cookingState.running) return;
    const item = e.target.closest('.recipe-item[data-recipe]');
    if (!item) return;
    const id = item.dataset.recipe;
    if (!COOK_RECIPES[id] || id === cookingState.recipe) return;
    if ((id === 'shucaiDunyu' || id === 'shuizhuShucai') && !(typeof storyFlags !== 'undefined' && storyFlags.farmUnlocked)) return;
    cookingState.recipe = id;
    cookingState.selected = {};
    renderCookingUI();
  });
}

const cookingIngredientListEl = $('cookingIngredientList');
const cookingStartBtnEl = $('cookingStartBtn');
const cookingCloseBtnEl = $('cookingCloseBtn');
const cookingOpenBtnEl = $('cookingOpenBtn');

if (cookingIngredientListEl) {
  cookingIngredientListEl.addEventListener('click', (e) => {
    if (cookingState.running) return;
    if (e.target.closest('#cookingFillAllBtn')) {
      const fishStock = getFishStock();
      if (cookingState.recipe === 'shucaiDunyu') {
        const vegStock = getVegStock();
        const fishTotal = Object.values(fishStock).reduce((a, b) => a + b, 0);
        const vegTotal = Object.values(vegStock).reduce((a, b) => a + b, 0);
        const pairCount = Math.min(fishTotal, vegTotal);
        if (pairCount <= 0) {
          showToast('需要同时拥有鱼类与蔬菜才能 1:1 配对');
          return;
        }
        const pickedFish = pickRandomStockCounts(fishStock, pairCount);
        const pickedVeg = pickRandomStockCounts(vegStock, pairCount);
        cookingState.selected = Object.assign({}, pickedFish, pickedVeg);
      } else if (cookingState.recipe === 'shuizhuShucai') {
        const vegStock = getVegStock();
        const next = {};
        for (const vid in vegStock) {
          if (vegStock[vid] > 0) next[vid] = vegStock[vid];
        }
        cookingState.selected = next;
      } else {
        const next = {};
        for (const fid in fishStock) {
          if (fishStock[fid] > 0) next[fid] = fishStock[fid];
        }
        cookingState.selected = next;
      }
      renderCookingUI();
      return;
    }
    if (e.target.closest('#cookingClearAllBtn')) {
      cookingState.selected = {};
      renderCookingUI();
      return;
    }
    const btn = e.target.closest('button[data-ing]');
    if (!btn) return;
    const ingId = btn.dataset.ing;
    const dirRaw = btn.dataset.dir;
    if (dirRaw === 'cancel') {
      delete cookingState.selected[ingId];
      renderCookingUI();
      return;
    }
    const stock = getCookingRecipeStock()[ingId] || 0;
    const cur = cookingState.selected[ingId] || 0;
    let next = dirRaw === 'all' ? stock : cur + parseInt(dirRaw);
    if (next < 0) next = 0;
    if (next > stock) next = stock;
    if (next === 0) delete cookingState.selected[ingId];
    else cookingState.selected[ingId] = next;
    renderCookingUI();
  });
}
if (cookingStartBtnEl) cookingStartBtnEl.addEventListener('click', startCooking);
startCookingEngine();
if (cookingCloseBtnEl) cookingCloseBtnEl.addEventListener('click', closeCooking);
if (cookingOpenBtnEl) {
  cookingOpenBtnEl.addEventListener('click', () => {
    if (!storyFlags.cookingUnlocked) return;
    openCooking();
  });
}
const capitalCookBtnEl = $('capitalCookBtn');
if (capitalCookBtnEl) {
  capitalCookBtnEl.addEventListener('click', () => {
    if (!storyFlags.arrivedCapital) return;
    ensurePaodingTechnique();
    openCooking();
  });
}
