/* 背包系统（从 game.js 拆出，需在 game.js 之前加载） */
function getItemStackKey(slot) {
  if (!slot) return '';
  return slot.id + '|' + getItemDisplayName(slot);
}

function findItemInsertIndex(id, data) {
  const inv = player.inventory;
  const def = ITEM_DEFS[id];
  if (!def) return inv.length;
  const name = (id === 'kaoyu' && data && data.name) ? data.name : def.name;
  for (let i = inv.length - 1; i >= 0; i--) {
    const s = inv[i];
    if (!s) continue;
    if (s.id === id && getItemDisplayName(s) === name) return i + 1;
  }
  for (let i = inv.length - 1; i >= 0; i--) {
    const d = ITEM_DEFS[inv[i] && inv[i].id];
    if (d && d.type === def.type) return i + 1;
  }
  return inv.length;
}

let _bagRenderSuppress = 0;

function scheduleBagRender() {
  if (_bagRenderSuppress > 0) return;
  renderBag();
}

function addItem(id, qty = 1, data = null) {
  if (!ITEM_DEFS[id] || !(qty > 0)) return;
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (data) {
    player.inventory.splice(findItemInsertIndex(id, data), 0, { id, qty, data });
    scheduleBagRender();
    return;
  }
  const slot = player.inventory.find(x => x.id === id && !x.data);
  if (slot) {
    slot.qty += qty;
  } else {
    player.inventory.splice(findItemInsertIndex(id, null), 0, { id, qty });
  }
  scheduleBagRender();
}

function removeItemAt(idx, qty = 1) {
  if (!Array.isArray(player.inventory)) return;
  const slot = player.inventory[idx];
  if (!slot) return;
  slot.qty -= qty;
  if (slot.qty <= 0) player.inventory.splice(idx, 1);
  scheduleBagRender();
}

function getItemDisplayName(slot) {
  const def = ITEM_DEFS[slot.id];
  if (slot.id === 'kaoyu' && slot.data && slot.data.name) return slot.data.name;
  return def ? def.name : '?';
}

let bagSelectedIndex = null;

function getBagItemDesc(slot) {
  const def = ITEM_DEFS[slot.id];
  if (!def) return '';
  if (slot.id === 'kaoyu' && slot.data) {
    const fishDef = ITEM_DEFS[slot.data.fishId];
    const eff = FISH_EFFECTS[slot.data.fishId];
    const gain = typeof getCookedFishGain === 'function'
      ? getCookedFishGain(slot.data)
      : (Number(slot.data.weight) || 0) * (eff ? eff.legacyPerWeight || 0 : 0) * (Number(slot.data.effectMult) || 1);
    const valStr = eff && eff.stat === 'qinggongExp' ? Math.round(gain).toString() : gain.toFixed(4);
    return `以${fishDef ? fishDef.name : '鱼'}烤制而成。食用后${eff ? eff.label : '属性'} +${valStr}`;
  }
  if (FISH_EFFECTS[slot.id] && slot.data && (slot.data.quality != null || slot.data.weight != null)) {
    const eff = FISH_EFFECTS[slot.id];
    const gain = typeof getRawFishGain === 'function'
      ? getRawFishGain(slot.id, slot.data)
      : (Number(slot.data.weight) || 0) * (eff.legacyPerWeight || 0);
    const valStr = eff.stat === 'qinggongExp' ? Math.round(gain).toString() : gain.toFixed(4);
    return `${def.desc || ''} 食用后${eff.label} +${valStr}`;
  }
  return def.desc || '';
}

function renderBag() {
  if (typeof updateHillNpc === 'function') updateHillNpc();
  const grid = $('bagGrid');
  const emptyEl = $('bagEmpty');
  if (!grid) return;

  const inv = Array.isArray(player.inventory) ? player.inventory : [];
  const countEl = $('bagCount');
  if (countEl) countEl.textContent = inv.length;
  const eatAllEl = $('bagEatAllBtn');
  if (eatAllEl) eatAllEl.disabled = !hasUsableFood();

  if (!inv.length) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.classList.add('show');
    return;
  }
  if (emptyEl) emptyEl.classList.remove('show');

  grid.innerHTML = inv.map((slot, idx) => {
    const def = ITEM_DEFS[slot.id];
    if (!def) return '';
    let sub;
    if (slot.id === 'kaoyu' && slot.data) {
      sub = `品质 ${Math.round(slot.data.quality || 0)}`;
    } else if (slot.data && slot.data.weight != null) {
      sub = `${Number(slot.data.weight).toFixed(2)} s` +
        (slot.data.quality != null ? ` · 品质 ${Math.round(Number(slot.data.quality) || 0)}` : '');
    } else if (slot.data && slot.data.quality != null) {
      sub = `品质 ${Math.round(Number(slot.data.quality) || 0)}`;
    } else {
      sub = escapeHtml(def.type);
    }
    const desc = getBagItemDesc(slot);
    return `<div class="bag-cell" data-idx="${idx}">
      <div class="bag-cell-main">
        <div class="bag-cell-head">
          <span class="bag-cell-name">${escapeHtml(getItemDisplayName(slot))}</span>
          <span class="bag-cell-type">${sub}</span>
        </div>
        <div class="bag-cell-desc">${escapeHtml(desc)}</div>
      </div>
      <div class="bag-cell-qty">×${slot.qty}</div>
    </div>`;
  }).join('');
}

function openBagItem(idx) {
  const slot = (player.inventory || [])[idx];
  if (!slot) return;
  const def = ITEM_DEFS[slot.id];
  if (!def) return;
  bagSelectedIndex = idx;

  const titleEl = $('bagModalTitle');
  const descEl = $('bagModalDesc');
  const useBtn = $('bagUseBtn');
  const useAllBtn = $('bagUseAllBtn');

  const displayName = getItemDisplayName(slot);
  let wTxt = '';
  if (slot.id === 'kaoyu' && slot.data) {
    wTxt = `　品质 ${Math.round(Number(slot.data.quality) || 0)}`;
  } else if (slot.data && (slot.data.weight != null || slot.data.quality != null)) {
    const parts = [];
    if (slot.data.weight != null) parts.push(`${Number(slot.data.weight).toFixed(2)} s`);
    if (slot.data.quality != null) parts.push(`品质 ${Math.round(Number(slot.data.quality) || 0)}`);
    wTxt = `　${parts.join(' · ')}`;
  }
  if (titleEl) titleEl.textContent = `${displayName}${wTxt}　×${slot.qty}`;
  if (descEl) descEl.textContent = getBagItemDesc(slot);
  if (useBtn) {
    useBtn.disabled = !def.usable;
    useBtn.textContent = def.usable ? '使用' : '无法使用';
  }
  if (useAllBtn) {
    useAllBtn.disabled = !def.usable;
    useAllBtn.textContent = isFoodDef(def) ? '使用全部同类食物' : '全部使用';
  }
  const modal = $('bagModal');
  if (modal) modal.classList.add('show');
}

function closeBagItem() {
  bagSelectedIndex = null;
  const modal = $('bagModal');
  if (modal) modal.classList.remove('show');
}

function getTotalQinggongExp() {
  if (!Array.isArray(player.skills)) return 0;
  let total = 0;
  for (const sk of player.skills) {
    if (!sk || typeof skillMatchesCategory !== 'function' || !skillMatchesCategory(sk, '轻功')) continue;
    const lv = Math.max(1, Number(sk.level) || 1);
    for (let i = 1; i < lv; i++) {
      total += getSkillExpNeed(i, sk);
    }
    total += Number(sk.exp) || 0;
  }
  return total;
}

function snapshotPlayer() {
  return {
    root: getTotalRoot(),
    comp: getTotalComp(),
    luck: getTotalLuck(),
    con: getTotalCon(),
    neiLi: getTotalNeiLi(),
    hp: player.hp,
    qinggongExp: getTotalQinggongExp(),
    fist: getTotalFist(),
    blade: getTotalBlade(),
    sword: getTotalSword(),
    changbing: getTotalChangbing(),
    qimen: getTotalQimen(),
    hidden: getTotalHidden()
  };
}

function diffSnapshot(before, after) {
  const labels = {
    root: '根骨', comp: '悟性', luck: '定力', con: '体魄', neiLi: '内力', hp: '气血',
    qinggongExp: '轻功经验',
    fist: '拳掌', blade: '刀法', sword: '剑法', changbing: '长兵', qimen: '奇门', hidden: '暗器'
  };
  const out = [];
  for (const key in labels) {
    const delta = after[key] - before[key];
    if (Math.abs(delta) < 1e-9) continue;
    const sign = delta > 0 ? '+' : '';
    let v;
    if (key === 'qinggongExp') v = Math.round(delta).toString();
    else if (Math.abs(delta) >= 100) v = Math.round(delta).toString();
    else if (Math.abs(delta) >= 10) v = delta.toFixed(1);
    else if (Math.abs(delta) >= 1) v = delta.toFixed(2);
    else v = delta.toFixed(4);
    out.push(`${labels[key]} ${sign}${v}`);
  }
  return out;
}

function useAllBagItems() {
  if (bagSelectedIndex == null) return;
  const firstSlot = player.inventory[bagSelectedIndex];
  if (!firstSlot) return;
  const def = ITEM_DEFS[firstSlot.id];
  if (!def || !def.usable) return;

  const targetKey = getItemStackKey(firstSlot);
  const targetId = firstSlot.id;
  const targetName = getItemDisplayName(firstSlot);

  const before = snapshotPlayer();
  _toastSuppressStack++;

  let usedCount = 0;
  let aborted = false;

  for (let i = player.inventory.length - 1; i >= 0; i--) {
    const s = player.inventory[i];
    if (!s || s.id !== targetId) continue;
    if (getItemStackKey(s) !== targetKey) continue;
    while (s.qty > 0) {
      let ok = false;
      try { ok = def.use ? def.use(s) : false; } catch (e) { ok = false; }
      if (ok) {
        s.qty--;
        usedCount++;
        if (s.qty <= 0) {
          player.inventory.splice(i, 1);
          break;
        }
      } else {
        aborted = true;
        break;
      }
    }
    if (aborted) break;
  }

  _toastSuppressStack--;

  const after = snapshotPlayer();
  const diffs = diffSnapshot(before, after);

  renderBag();
  saveGame();
  updateAttrUI();
  if (battleActive()) updateBattleUI();

  if (usedCount === 0) {
    showToast(`【${targetName}】无法使用`);
    return;
  }

  let msg = `一口气使用了 ${usedCount} 个【${targetName}】`;
  if (diffs.length) msg += '：' + diffs.join('、');
  if (aborted) msg += '（条件不足，已停止）';
  showToast(msg);
  closeBagItem();
}

function isFoodDef(def) {
  return !!def && (def.type === '鱼' || def.type === '菜');
}

function hasUsableFood() {
  const inv = Array.isArray(player.inventory) ? player.inventory : [];
  return inv.some(s => {
    const def = s && ITEM_DEFS[s.id];
    return def && def.usable && isFoodDef(def) && s.qty > 0;
  });
}

function useAllFoodItems() {
  const inv = Array.isArray(player.inventory) ? player.inventory : [];
  if (!hasUsableFood()) {
    showToast('行囊里没有可食用的食物');
    return;
  }

  const before = snapshotPlayer();
  _toastSuppressStack++;

  let usedCount = 0;
  let skipped = 0;

  for (let i = inv.length - 1; i >= 0; i--) {
    const s = inv[i];
    const def = s && ITEM_DEFS[s.id];
    if (!def || !def.usable || !isFoodDef(def)) continue;
    while (s.qty > 0) {
      let ok = false;
      try { ok = def.use ? def.use(s) : false; } catch (e) { ok = false; }
      if (!ok) {
        skipped += s.qty;
        break;
      }
      s.qty--;
      usedCount++;
    }
    if (s.qty <= 0) inv.splice(i, 1);
  }

  _toastSuppressStack--;

  const after = snapshotPlayer();
  const diffs = diffSnapshot(before, after);

  renderBag();
  saveGame();
  updateAttrUI();
  if (battleActive()) updateBattleUI();

  if (usedCount === 0) {
    showToast('行囊里没有可食用的食物');
    return;
  }

  let msg = `一口气吃下 ${usedCount} 份食物`;
  if (diffs.length) msg += '：' + diffs.join('、');
  if (skipped > 0) msg += `（另有 ${skipped} 份无法食用，已跳过）`;
  showToast(msg);
}

const bagGridEl = $('bagGrid');
if (bagGridEl) {
  bagGridEl.addEventListener('click', e => {
    const cell = e.target.closest('.bag-cell');
    if (!cell) return;
    openBagItem(Number(cell.dataset.idx));
  });
}

const bagCloseEl = $('bagCloseBtn');
if (bagCloseEl) bagCloseEl.addEventListener('click', closeBagItem);

const bagUseEl = $('bagUseBtn');
if (bagUseEl) {
  bagUseEl.addEventListener('click', () => {
    if (bagSelectedIndex == null) return;
    const slot = player.inventory[bagSelectedIndex];
    if (!slot) return;
    const def = ITEM_DEFS[slot.id];
    if (!def || !def.usable) return;
    const ok = def.use ? def.use(slot) : false;
    if (ok) {
      removeItemAt(bagSelectedIndex, 1);
      closeBagItem();
      saveGame();
      updateAttrUI();
      if (battleActive()) updateBattleUI();
    }
  });
}

const bagUseAllEl = $('bagUseAllBtn');
if (bagUseAllEl) {
  bagUseAllEl.addEventListener('click', () => {
    useAllBagItems();
  });
}

const bagModalEl = $('bagModal');
if (bagModalEl) {
  bagModalEl.addEventListener('click', e => {
    if (e.target === bagModalEl) closeBagItem();
  });
}

const bagEatAllEl = $('bagEatAllBtn');
if (bagEatAllEl) {
  bagEatAllEl.addEventListener('click', () => {
    useAllFoodItems();
  });
}

const bagSortEl = $('bagSortBtn');
if (bagSortEl) {
  bagSortEl.addEventListener('click', () => {
    if (!Array.isArray(player.inventory)) return;
    player.inventory.sort((a, b) => {
      const da = ITEM_DEFS[a.id], db = ITEM_DEFS[b.id];
      const ta = da ? da.type : '', tb = db ? db.type : '';
      if (ta !== tb) return ta.localeCompare(tb);
      return (da ? da.name : '').localeCompare(db ? db.name : '');
    });
    renderBag();
    saveGame();
  });
}
