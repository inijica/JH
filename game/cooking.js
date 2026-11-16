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

function consumeFishByType(fishId, count) {
  const consumed = [];
  for (let i = player.inventory.length - 1; i >= 0 && consumed.length < count; i--) {
    const slot = player.inventory[i];
    if (!slot || slot.id !== fishId) continue;
    while (slot.qty > 0 && consumed.length < count) {
      consumed.push({ fishId, weight: slot.data ? Number(slot.data.weight) || 0 : 0 });
      slot.qty--;
    }
    if (slot.qty <= 0) player.inventory.splice(i, 1);
  }
  renderBag();
  return consumed;
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

function getCookTier(quality) {
  if (quality <= 20) return { prefix: '烤糊的', suffix: '', effectMult: 0.75, tier: 'burnt' };
  if (quality <= 50) return { prefix: '半焦的', suffix: '', effectMult: 0.9, tier: 'half' };
  const extra = Math.max(0, Math.floor((quality - 51) / 100));
  return { prefix: '烤', suffix: extra > 0 ? '+' + extra : '', effectMult: 1.2 + 0.1 * Math.sqrt(Math.max(0, quality - 51)) / 10, tier: 'cooked' };
}

function buildCookedName(fishName, tier) {
  if (tier.tier === 'burnt') return '烤糊的' + fishName;
  if (tier.tier === 'half') return '半焦的' + fishName;
  return '烤' + fishName + tier.suffix;
}

function renderCookingUI() {
  const recipeEl = $('cookingRecipeList');
  if (recipeEl) {
    const recipe = COOK_RECIPES[cookingState.recipe];
    recipeEl.innerHTML = `<div class="recipe-item active">
      <div>${recipe.name}</div>
      <div class="recipe-item-desc">${recipe.desc}<br>需求：鱼类 ×1</div>
    </div>`;
  }

  const stoveEl = $('stoveInfo');
  if (stoveEl) {
    const recipe = COOK_RECIPES[cookingState.recipe];
    stoveEl.innerHTML = `<div class="stove-card">
      <div class="stove-icon">🔥</div>
      <div class="stove-name">后山火堆</div>
      <div class="stove-bonus">烹饪品质 +${recipe.stoveBonus}</div>
    </div>`;
  }

  const ingEl = $('cookingIngredientList');
  if (ingEl) {
    const stock = getFishStock();
    const ids = Object.keys(stock).filter(id => stock[id] > 0);
    if (!ids.length) {
      ingEl.innerHTML = '<div class="ing-empty">背包里没有可用的鱼类食材</div>';
    } else {
      ingEl.innerHTML = ids.map(id => {
        const def = ITEM_DEFS[id];
        const total = stock[id];
        const sel = cookingState.selected[id] || 0;
        return `<div class="ingredient-item">
          <div>
            <div class="ing-name">${escapeHtml(def.name)}</div>
            <div class="ing-stock">库存 ${total}</div>
          </div>
          <div class="ing-ctrl">
            <button type="button" data-fish="${id}" data-dir="-1" ${sel <= 0 ? 'disabled' : ''}>−</button>
            <span class="ing-qty">${sel}</span>
            <button type="button" data-fish="${id}" data-dir="1" ${sel >= total ? 'disabled' : ''}>+</button>
            <button type="button" class="ing-all" data-fish="${id}" data-dir="all" ${sel >= total ? 'disabled' : ''}>全部</button>
            <button type="button" class="ing-cancel" data-fish="${id}" data-dir="cancel" ${sel <= 0 ? 'disabled' : ''}>取消</button>
          </div>
        </div>`;
      }).join('');
      const hasSelected = Object.values(cookingState.selected).some(v => v > 0);
      ingEl.innerHTML += `<div class="ing-footer">
        <button type="button" class="ing-clear ing-fill" id="cookingFillAllBtn">投 入 全 部</button>
        <button type="button" class="ing-clear" id="cookingClearAllBtn" ${hasSelected ? '' : 'disabled'}>清 空 食 材</button>
      </div>`;
    }
  }

  updateCookingUI();
}

function updateCookingUI() {
  const btn = $('cookingStartBtn');
  if (btn) {
    btn.disabled = cookingState.running;
    btn.textContent = cookingState.running ? '烹饪中...' : '开始烹饪';
  }
  const statusEl = $('cookingStatusText');
  if (statusEl && !cookingState.running) {
    const total = Object.values(cookingState.selected).reduce((a, b) => a + b, 0);
    statusEl.textContent = total > 0
      ? `已选择 ${total} 条鱼，点击开始烹饪`
      : '选择食材后点击烹饪';
  }
}

function openCooking() {
  cookingState.selected = {};
  cookingState.running = false;
  cookingState.pending = [];
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

  const stock = getFishStock();
  const plan = [];
  for (const fishId in cookingState.selected) {
    const cnt = Math.min(cookingState.selected[fishId] || 0, stock[fishId] || 0);
    if (cnt > 0) plan.push({ fishId, count: cnt });
  }
  if (!plan.length) {
    showToast('请先选择食材');
    return;
  }

  const consumed = [];
  for (const p of plan) {
    const items = consumeFishByType(p.fishId, p.count);
    for (const it of items) consumed.push(it);
  }

  cookingState.pending = consumed;
  cookingState.running = true;
  cookingState.startAt = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();

  const statusEl = $('cookingStatusText');
  if (statusEl) statusEl.textContent = '烹饪中……';
  updateCookingUI();
}

function cookingLoop() {
  if (!cookingState.running) return;
  const recipe = COOK_RECIPES[cookingState.recipe];
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

  const stoveBonus = COOK_RECIPES[cookingState.recipe].stoveBonus;
  const results = [];
  const t = ensurePaodingTechnique();
  let leveledAny = false;

  _bagRenderSuppress++;
  try {
    for (const it of items) {
      const level = getPaodingLevel();
      const quality = calcCookQuality(level, stoveBonus);
      const tier = getCookTier(quality);
      const fishName = ITEM_DEFS[it.fishId] ? ITEM_DEFS[it.fishId].name : '鱼';
      const name = buildCookedName(fishName, tier);
      const itemData = {
        fishId: it.fishId,
        fishName,
        weight: it.weight,
        quality,
        name,
        effectMult: tier.effectMult
      };
      addItem('kaoyu', 1, itemData);
      const exp = (10 + quality * 0.12) * (1 + quality * 0.0008) * getPaodingExpMultiplier();
      results.push({ name, quality, exp });

      t.exp = (Number(t.exp) || 0) + exp;
      let guard = 0;
      while (t.exp >= getPaodingExpNeed(t.level) && guard++ < 1000) {
        t.exp -= getPaodingExpNeed(t.level);
        t.level++;
        leveledAny = true;
      }

      const dblChance = getPaodingDoubleChance();
      if (dblChance > 0 && Math.random() < dblChance) {
        addItem('kaoyu', 1, { ...itemData });
        results.push({ name, quality, exp: 0, double: true });
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
const cookingIngredientListEl = $('cookingIngredientList');
const cookingStartBtnEl = $('cookingStartBtn');
const cookingCloseBtnEl = $('cookingCloseBtn');
const cookingOpenBtnEl = $('cookingOpenBtn');

if (cookingIngredientListEl) {
  cookingIngredientListEl.addEventListener('click', (e) => {
    if (cookingState.running) return;
    if (e.target.closest('#cookingFillAllBtn')) {
      const fillStock = getFishStock();
      const next = {};
      for (const fid in fillStock) {
        if (fillStock[fid] > 0) next[fid] = fillStock[fid];
      }
      cookingState.selected = next;
      renderCookingUI();
      return;
    }
    if (e.target.closest('#cookingClearAllBtn')) {
      cookingState.selected = {};
      renderCookingUI();
      return;
    }
    const btn = e.target.closest('button[data-fish]');
    if (!btn) return;
    const fishId = btn.dataset.fish;
    const dirRaw = btn.dataset.dir;
    if (dirRaw === 'cancel') {
      delete cookingState.selected[fishId];
      renderCookingUI();
      return;
    }
    const stock = getFishStock()[fishId] || 0;
    const cur = cookingState.selected[fishId] || 0;
    let next = dirRaw === 'all' ? stock : cur + parseInt(dirRaw);
    if (next < 0) next = 0;
    if (next > stock) next = stock;
    if (next === 0) delete cookingState.selected[fishId];
    else cookingState.selected[fishId] = next;
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