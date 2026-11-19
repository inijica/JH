/* 农田与技艺「农夫」系统（在 cooking.js 之后、training.js 与 game.js 之前加载） */
const FARM_PLOT_COUNT = 9;
const FARM_BASE_DURATION_MS = 10 * 60 * 1000;
const FARM_CROP_ORDER = ['fanqie', 'baicai', 'shanyao', 'luobo', 'huanggua'];

const farmModalState = {
  pickingIndex: -1,
  confirmAction: null
};

/* ================= 技艺：农夫 ================= */
function getFarmerTechnique() {
  return (player.techniques || []).find(x => x && x.id === 'farmer') || null;
}

function getFarmerLevel() {
  const t = getFarmerTechnique();
  return t ? Math.max(0, Number(t.level) || 0) : 0;
}

function ensureFarmerTechnique() {
  if (!Array.isArray(player.techniques)) player.techniques = [];
  let t = getFarmerTechnique();
  if (!t) {
    t = { id: 'farmer', name: '农夫', level: 0, exp: 0 };
    player.techniques.push(t);
  } else {
    t.name = '农夫';
  }
  return t;
}

function getFarmerExpNeed(level) {
  if (typeof getTechniqueExpNeed === 'function') return getTechniqueExpNeed(level);
  const n = Math.max(1, Number(level) || 1);
  const value = Math.pow(125 + 25 * n * (n - 1), 1 + n / 150);
  return Number.isFinite(value) ? value : Number.MAX_VALUE;
}

function getFarmerRootBonus(level = getFarmerLevel()) {
  const lv = Math.max(0, Number(level) || 0);
  let bonus = Math.floor(lv / 2);
  if (lv >= 25) bonus += 10;
  if (lv >= 80) bonus += 30;
  if (lv >= 100) bonus += 50;
  return bonus;
}

function getFarmerExpMultiplier() {
  const root = typeof getTotalRoot === 'function' ? getTotalRoot() : (Number(player.root) || 0);
  return 1 + root * 0.03;
}

function getFarmerQualityFixed(level = getFarmerLevel()) {
  return Math.max(0, Number(level) || 0) * 5;
}

function getFarmerQualityMultiplier(level = getFarmerLevel()) {
  const lv = Math.max(0, Number(level) || 0);
  let m = 1;
  if (lv >= 10) m += 0.10;
  if (lv >= 25) m += 0.20;
  if (lv >= 50) m += 0.30;
  if (lv >= 80) m += 0.40;
  if (lv >= 100) m += 0.50;
  return m;
}

function getFarmerQuality(level = getFarmerLevel()) {
  return Math.round((100 + getFarmerQualityFixed(level)) * getFarmerQualityMultiplier(level));
}

function getFarmerBaseDurationMs(level = getFarmerLevel()) {
  const lv = Math.max(0, Number(level) || 0);
  let dur = FARM_BASE_DURATION_MS;
  if (lv >= 10) dur -= 30000;
  if (lv >= 50) dur -= 90000;
  return Math.max(1000, dur);
}

function getFarmerSpeedMultiplier(level = getFarmerLevel()) {
  const lv = Math.max(0, Number(level) || 0);
  return 1 + lv * 0.02;
}

function getFarmerDurationMs(level = getFarmerLevel()) {
  return Math.max(1000, getFarmerBaseDurationMs(level) / getFarmerSpeedMultiplier(level));
}

function getFarmerDoubleChance(level = getFarmerLevel()) {
  const lv = Math.max(0, Number(level) || 0);
  return lv >= 50 ? Math.min(1, Math.max(0, lv - 20) / 100) : 0;
}

function hasQinGeng() {
  return getFarmerLevel() >= 125;
}

function getFarmerQinGengBonus(level = getFarmerLevel()) {
  const lv = Math.max(0, Number(level) || 0);
  if (lv < 125) return 0;
  return 10 + lv / 5;
}

function getFarmerQinGengMultiplier(level = getFarmerLevel()) {
  return 1 + getFarmerQinGengBonus(level) / 100;
}

/* ================= 农田状态与自动收获 ================= */
function defaultFarmState() {
  return {
    plots: Array.from({ length: FARM_PLOT_COUNT }, () => ({ cropId: '', startAt: 0 }))
  };
}

function ensureFarmState() {
  if (!player.farm || typeof player.farm !== 'object') {
    player.farm = defaultFarmState();
  }
  if (!Array.isArray(player.farm.plots)) player.farm.plots = [];
  for (let i = 0; i < FARM_PLOT_COUNT; i++) {
    const raw = player.farm.plots[i];
    const validCrop = raw && typeof VEG_EFFECTS !== 'undefined' && VEG_EFFECTS[raw.cropId] ? raw.cropId : '';
    const startAt = validCrop && Number(raw.startAt) > 0 ? Number(raw.startAt) : 0;
    player.farm.plots[i] = { cropId: validCrop, startAt };
  }
  if (player.farm.plots.length > FARM_PLOT_COUNT) {
    player.farm.plots.length = FARM_PLOT_COUNT;
  }
  return player.farm;
}

function calcSingleFarmHarvestExp(quality, rewardCount) {
  const qEffect = Math.max(0, quality * 0.3);
  return (16 + qEffect * 0.75) * (1 + qEffect * 0.001) * (rewardCount || 1) * getFarmerExpMultiplier();
}

function addFarmerExpRaw(amount) {
  const t = ensureFarmerTechnique();
  if (!t || !(amount > 0)) return 0;
  t.exp = (Number(t.exp) || 0) + amount;
  let gainedLevels = 0;
  let guard = 0;
  while (t.exp >= getFarmerExpNeed(t.level) && guard++ < 1000) {
    t.exp -= getFarmerExpNeed(t.level);
    t.level++;
    gainedLevels++;
  }
  return gainedLevels;
}

function isFarmVisible() {
  const ov = $('farmOverlay');
  return !!(ov && ov.classList.contains('show'));
}

function farmLoop() {
  if (typeof player === 'undefined' || !player.surname) return;
  if (typeof storyFlags === 'undefined' || !storyFlags.arrivedCapital || !storyFlags.farmUnlocked) return;

  const farm = ensureFarmState();
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();

  const harvestCounts = {};
  let totalExpGained = 0;
  let anyHarvested = false;
  let leveledAny = false;

  /* 如果在某段离线/切后台恢复前有未修正的未来 startAt，夹紧为 now */
  for (let i = 0; i < FARM_PLOT_COUNT; i++) {
    const p = farm.plots[i];
    if (!p.cropId || !(p.startAt > 0)) continue;
    if (p.startAt > now) p.startAt = now;
  }

  _bagRenderSuppress++;
  try {
    let guard = 0;
    /* 最多循环处理若干批次成熟作物，避免异常时钟导致死循环 */
    while (guard++ < 48) {
      let earliestReady = null;
      const dur = getFarmerDurationMs();
      for (let i = 0; i < FARM_PLOT_COUNT; i++) {
        const p = farm.plots[i];
        if (!p.cropId || !(p.startAt > 0)) continue;
        const finishAt = p.startAt + dur;
        if (now >= finishAt) {
          if (!earliestReady || finishAt < earliestReady.finishAt) {
            earliestReady = { idx: i, plot: p, finishAt };
          }
        }
      }
      if (!earliestReady) break;

      const p = earliestReady.plot;
      const lv = getFarmerLevel();
      const quality = getFarmerQuality(lv);
      const dblChance = getFarmerDoubleChance(lv);
      const qty = (dblChance > 0 && Math.random() < dblChance) ? 2 : 1;

      addItem(p.cropId, qty, { quality });
      harvestCounts[p.cropId] = (harvestCounts[p.cropId] || 0) + qty;
      const exp = calcSingleFarmHarvestExp(quality, qty);
      totalExpGained += exp;
      if (addFarmerExpRaw(exp) > 0) leveledAny = true;

      /* 裴文秀自动续种 */
      p.startAt = earliestReady.finishAt;
      anyHarvested = true;
    }
  } finally {
    _bagRenderSuppress--;
  }

  if (anyHarvested) {
    renderBag();
    if (leveledAny && typeof updateAttrUI === 'function') updateAttrUI();
    if (typeof renderTechniques === 'function') renderTechniques();

    const parts = FARM_CROP_ORDER
      .filter(id => harvestCounts[id] > 0)
      .map(id => `${ITEM_DEFS[id] ? ITEM_DEFS[id].name : id}×${harvestCounts[id]}`);
    const newLv = getFarmerLevel();
    let msg = `裴文秀照料后院农田，为你收获了${parts.join('、')}并已重新种下（农夫经验 +${Math.round(totalExpGained)}）`;
    if (leveledAny) msg += `　农夫提升至 Lv.${newLv}！`;
    addIntel(msg, leveledAny ? 'gold' : 'good');
    saveGame();
  }

  if (isFarmVisible()) renderFarmUI();
}

/* ================= 农田界面 ================= */
function formatFarmRemain(ms) {
  const sec = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getFarmCropDescLine(cropId, quality) {
  const eff = typeof VEG_EFFECTS !== 'undefined' ? VEG_EFFECTS[cropId] : null;
  if (!eff) return '';
  const gain = eff.baseValue * (Math.max(0, quality) / 100);
  const decimals = eff.stat === 'neiLi' ? 3 : 4;
  return `${eff.label} +${gain.toFixed(decimals)}`;
}

function renderFarmUI() {
  const farm = ensureFarmState();
  const lv = getFarmerLevel();
  const dur = getFarmerDurationMs(lv);
  const quality = getFarmerQuality(lv);
  const dblChance = getFarmerDoubleChance(lv);
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();

  const metaEl = $('farmMetaText');
  if (metaEl) {
    const durTxt = typeof fmtDurationCN === 'function'
      ? fmtDurationCN(Math.round(dur / 1000))
      : `${Math.round(dur / 1000)} 秒`;
    metaEl.textContent = `农夫 Lv.${lv}｜单次成熟：${durTxt}｜收获品质：${quality}%${dblChance > 0 ? `｜双倍概率：${formatPercent(dblChance)}` : ''}（裴文秀自动收获并续种）`;
  }

  const selEl = $('farmFillSelect');
  if (selEl && selEl.options.length === 0) {
    selEl.innerHTML = FARM_CROP_ORDER.map(id => {
      const def = ITEM_DEFS[id];
      const eff = VEG_EFFECTS[id];
      return `<option value="${id}">${escapeHtml(def ? def.name : id)}（${escapeHtml(eff ? eff.label : '')}）</option>`;
    }).join('');
  }

  const gridEl = $('farmGrid');
  if (!gridEl) return;
  gridEl.innerHTML = farm.plots.map((p, idx) => {
    const num = idx + 1;
    if (!p.cropId || !ITEM_DEFS[p.cropId]) {
      return `<div class="farm-cell empty" data-plot="${idx}">
        <div class="farm-cell-idx">#${num}</div>
        <div class="farm-cell-name">空 地</div>
        <div class="farm-cell-time">点击选择作物</div>
      </div>`;
    }
    const def = ITEM_DEFS[p.cropId];
    const elapsed = Math.max(0, now - p.startAt);
    const pct = Math.min(100, Math.max(0, elapsed / dur * 100));
    const remain = Math.max(0, dur - elapsed);
    return `<div class="farm-cell growing" data-plot="${idx}">
      <div class="farm-cell-idx">#${num}</div>
      <div class="farm-cell-name">${escapeHtml(def.name)}</div>
      <div class="farm-cell-effect">${escapeHtml(getFarmCropDescLine(p.cropId, quality))}</div>
      <div class="farm-cell-progress"><div class="farm-cell-progress-fill" style="width:${pct.toFixed(1)}%"></div></div>
      <div class="farm-cell-time">剩余 ${formatFarmRemain(remain)}</div>
    </div>`;
  }).join('');
}

function openFarm() {
  if (typeof storyFlags === 'undefined' || !storyFlags.arrivedCapital || !storyFlags.farmUnlocked) return;
  ensureFarmerTechnique();
  ensureFarmState();
  renderFarmUI();
  const ov = $('farmOverlay');
  if (ov) ov.classList.add('show');
}

function closeFarm() {
  closeFarmPicker();
  closeFarmConfirm();
  const ov = $('farmOverlay');
  if (ov) ov.classList.remove('show');
}

function openFarmPicker(idx) {
  const farm = ensureFarmState();
  if (idx < 0 || idx >= FARM_PLOT_COUNT) return;
  farmModalState.pickingIndex = idx;

  const plot = farm.plots[idx];
  const curName = plot.cropId && ITEM_DEFS[plot.cropId] ? ITEM_DEFS[plot.cropId].name : '';
  const quality = getFarmerQuality();
  const durTxt = typeof fmtDurationCN === 'function'
    ? fmtDurationCN(Math.round(getFarmerDurationMs() / 1000))
    : `${Math.round(getFarmerDurationMs() / 1000)} 秒`;

  const titleEl = $('farmPickerTitle');
  if (titleEl) titleEl.textContent = `选 择 作 物 · #${idx + 1}`;
  const descEl = $('farmPickerDesc');
  if (descEl) {
    descEl.textContent = curName
      ? `当前正在种植【${curName}】，改种其他作物需要确认并重新计时。当前成熟耗时 ${durTxt}。`
      : `选择要在此处种植的作物，成熟耗时 ${durTxt}。`;
  }

  const listEl = $('farmPickerList');
  if (listEl) {
    listEl.innerHTML = '';
    FARM_CROP_ORDER.forEach(cropId => {
      const def = ITEM_DEFS[cropId];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bond-modal-item';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = (def ? def.name : cropId) + (plot.cropId === cropId ? '（种植中）' : '');
      const noteEl = document.createElement('small');
      noteEl.textContent = `收获品质 ${quality}% · 单颗食用 ${getFarmCropDescLine(cropId, quality)}`;
      btn.appendChild(nameSpan);
      btn.appendChild(noteEl);
      btn.addEventListener('click', () => onPickPlotCrop(idx, cropId));
      listEl.appendChild(btn);
    });
  }

  const modal = $('farmPickerModal');
  if (modal) modal.classList.add('show');
}

function closeFarmPicker() {
  farmModalState.pickingIndex = -1;
  const modal = $('farmPickerModal');
  if (modal) modal.classList.remove('show');
}

function openFarmConfirm(desc, onConfirm) {
  farmModalState.confirmAction = onConfirm;
  const descEl = $('farmConfirmDesc');
  if (descEl) descEl.textContent = desc;
  const modal = $('farmConfirmModal');
  if (modal) modal.classList.add('show');
}

function closeFarmConfirm() {
  farmModalState.confirmAction = null;
  const modal = $('farmConfirmModal');
  if (modal) modal.classList.remove('show');
}

function plantSinglePlot(idx, cropId) {
  const farm = ensureFarmState();
  if (idx < 0 || idx >= FARM_PLOT_COUNT || !VEG_EFFECTS[cropId]) return;
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  farm.plots[idx] = { cropId, startAt: now };
  renderFarmUI();
  saveGame();
}

function onPickPlotCrop(idx, cropId) {
  const farm = ensureFarmState();
  const plot = farm.plots[idx];
  const cropName = ITEM_DEFS[cropId] ? ITEM_DEFS[cropId].name : cropId;
  if (plot && plot.cropId === cropId) {
    closeFarmPicker();
    showToast(`#${idx + 1} 已在种植【${cropName}】`);
    return;
  }
  closeFarmPicker();
  if (plot && plot.cropId) {
    const oldName = ITEM_DEFS[plot.cropId] ? ITEM_DEFS[plot.cropId].name : plot.cropId;
    openFarmConfirm(`#${idx + 1} 正在种植【${oldName}】，确认更改为【${cropName}】并重新计时吗？`, () => {
      plantSinglePlot(idx, cropId);
      showToast(`#${idx + 1} 已改种【${cropName}】`);
    });
    return;
  }
  plantSinglePlot(idx, cropId);
  showToast(`#${idx + 1} 已种下【${cropName}】`);
}

function fillAllPlots(cropId, overwriteOther) {
  const farm = ensureFarmState();
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  let changed = 0;
  for (let i = 0; i < FARM_PLOT_COUNT; i++) {
    const p = farm.plots[i];
    if (!p.cropId) {
      farm.plots[i] = { cropId, startAt: now };
      changed++;
    } else if (overwriteOther && p.cropId !== cropId) {
      farm.plots[i] = { cropId, startAt: now };
      changed++;
    }
  }
  renderFarmUI();
  saveGame();
  const cropName = ITEM_DEFS[cropId] ? ITEM_DEFS[cropId].name : cropId;
  if (changed > 0) showToast(`已将 ${changed} 块农田种上【${cropName}】`);
  else showToast(`所有农田均已在种植【${cropName}】`);
}

function handleFillAllClick() {
  const selEl = $('farmFillSelect');
  const cropId = selEl && VEG_EFFECTS[selEl.value] ? selEl.value : FARM_CROP_ORDER[0];
  const farm = ensureFarmState();
  const cropName = ITEM_DEFS[cropId] ? ITEM_DEFS[cropId].name : cropId;
  const hasOtherGrowing = farm.plots.some(p => p.cropId && p.cropId !== cropId);
  if (hasOtherGrowing) {
    openFarmConfirm(`部分农田正在种植其他作物，确认全部更改为【${cropName}】并重新计时吗？（已在种植【${cropName}】的田地保留原进度）`, () => {
      fillAllPlots(cropId, true);
    });
    return;
  }
  fillAllPlots(cropId, false);
}

/* 事件绑定与定时引擎 */
const farmOpenBtnEl = $('farmOpenBtn');
if (farmOpenBtnEl) {
  farmOpenBtnEl.addEventListener('click', openFarm);
}
const farmCloseBtnEl = $('farmCloseBtn');
if (farmCloseBtnEl) {
  farmCloseBtnEl.addEventListener('click', closeFarm);
}
const farmOverlayEl = $('farmOverlay');
if (farmOverlayEl) {
  farmOverlayEl.addEventListener('click', e => {
    if (e.target === farmOverlayEl) closeFarm();
  });
}
const farmFillAllBtnEl = $('farmFillAllBtn');
if (farmFillAllBtnEl) {
  farmFillAllBtnEl.addEventListener('click', handleFillAllClick);
}
const farmGridEl = $('farmGrid');
if (farmGridEl) {
  farmGridEl.addEventListener('click', e => {
    const cell = e.target.closest('.farm-cell[data-plot]');
    if (!cell) return;
    openFarmPicker(Number(cell.dataset.plot));
  });
}
const farmPickerCloseBtnEl = $('farmPickerCloseBtn');
if (farmPickerCloseBtnEl) {
  farmPickerCloseBtnEl.addEventListener('click', closeFarmPicker);
}
const farmPickerModalEl = $('farmPickerModal');
if (farmPickerModalEl) {
  farmPickerModalEl.addEventListener('click', e => {
    if (e.target === farmPickerModalEl) closeFarmPicker();
  });
}
const farmConfirmOkBtnEl = $('farmConfirmOkBtn');
if (farmConfirmOkBtnEl) {
  farmConfirmOkBtnEl.addEventListener('click', () => {
    const fn = farmModalState.confirmAction;
    closeFarmConfirm();
    if (typeof fn === 'function') fn();
  });
}
const farmConfirmCancelBtnEl = $('farmConfirmCancelBtn');
if (farmConfirmCancelBtnEl) {
  farmConfirmCancelBtnEl.addEventListener('click', closeFarmConfirm);
}
const farmConfirmModalEl = $('farmConfirmModal');
if (farmConfirmModalEl) {
  farmConfirmModalEl.addEventListener('click', e => {
    if (e.target === farmConfirmModalEl) closeFarmConfirm();
  });
}

setInterval(farmLoop, 500);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) farmLoop();
});
