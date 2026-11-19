/* 离线奖励时间系统（从 game.js 拆出，需在 game.js 之前加载） */
/* 计算离线时间，将离线时间 / 2 后得出奖励时间；
   奖励时间内游戏运行速度翻倍（2×），奖励时间可跨次累加，取消原本的离线结算收益。 */

let pendingOffline = null; // { at, ms, fishing, cooking } 由 loadGame 记录，待结算奖励时间

const offlineClock = {
  realLastAt: Date.now(),
  clockMs: Date.now()
};

/* 设置界面的「离线加速」开关：默认开启，随存档保存 */
function offlineGainsEnabled() {
  return typeof player === 'undefined' || player.offlineEarnings !== false;
}

function getOfflineBonusMs() {
  if (typeof player === 'undefined' || !player) return 0;
  const v = Number(player.offlineBonusMs);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function isOfflineBonusPaused() {
  return !!(typeof player !== 'undefined' && player && player.offlineBonusPaused);
}

function isOfflineBonusActive() {
  return !!(typeof player !== 'undefined' && player && player.surname && !isOfflineBonusPaused() && getOfflineBonusMs() > 0);
}

function getGameSpeedMultiplier() {
  return isOfflineBonusActive() ? 2 : 1;
}

function resetOfflineClock() {
  const now = Date.now();
  offlineClock.realLastAt = now;
  offlineClock.clockMs = now;
}

/* 将奖励时间消耗同步推进到依赖真实时间戳的累计型/冷却型字段上 */
function shiftTimeAnchoredTimestamps(bonusMs) {
  if (!(bonusMs > 0) || typeof player === 'undefined' || !player) return;
  const now = Date.now();

  if (player.bond && typeof player.bond === 'object') {
    if (Number.isFinite(Number(player.bond.lastCultAt)) && player.bond.lastCultAt > 0) {
      player.bond.lastCultAt -= bonusMs;
    }
    if (Number.isFinite(Number(player.bond.lastGrowthAt)) && player.bond.lastGrowthAt > 0) {
      player.bond.lastGrowthAt -= bonusMs;
    }
  }

  if (player.sparCd && typeof player.sparCd === 'object') {
    Object.keys(player.sparCd).forEach(k => {
      const at = Number(player.sparCd[k]);
      if (!Number.isFinite(at)) { delete player.sparCd[k]; return; }
      const next = at - bonusMs;
      if (next <= now) delete player.sparCd[k];
      else player.sparCd[k] = next;
    });
  }

  if (player.teachCd && typeof player.teachCd === 'object') {
    Object.keys(player.teachCd).forEach(k => {
      const at = Number(player.teachCd[k]);
      if (!Number.isFinite(at)) { delete player.teachCd[k]; return; }
      const next = at - bonusMs;
      if (next <= now) delete player.teachCd[k];
      else player.teachCd[k] = next;
    });
  }
}

/* 推进游戏内虚拟时钟：奖励时间未耗尽的部分以 2 倍速前进 */
function syncOfflineBonusClock() {
  const now = Date.now();
  const realDt = Math.max(0, now - offlineClock.realLastAt);
  offlineClock.realLastAt = now;
  if (!realDt) return 0;

  let bonusUsed = 0;
  if (typeof player !== 'undefined' && player && player.surname && !isOfflineBonusPaused()) {
    const remain = getOfflineBonusMs();
    if (remain > 0) {
      bonusUsed = Math.min(remain, realDt);
      player.offlineBonusMs = Math.max(0, remain - bonusUsed);
    }
  }

  offlineClock.clockMs += realDt + bonusUsed;
  if (bonusUsed > 0) {
    shiftTimeAnchoredTimestamps(bonusUsed);
  }
  return bonusUsed;
}

function getGameClockMs() {
  syncOfflineBonusClock();
  return offlineClock.clockMs;
}

function fmtDurationCN(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0 && m > 0) return `${h} 小时 ${m} 分钟`;
  if (h > 0) return `${h} 小时`;
  if (m > 0 && r > 0) return `${m} 分 ${r} 秒`;
  if (m > 0) return `${m} 分钟`;
  return `${r} 秒`;
}

function fmtCountdownClock(ms) {
  const totalSec = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const p = n => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${p(m)}:${p(s)}`;
  return `${p(m)}:${p(s)}`;
}

function updateOfflineBonusUI() {
  const ms = getOfflineBonusMs();
  const paused = isOfflineBonusPaused();
  const hasBonus = !!(typeof player !== 'undefined' && player && player.surname && ms > 0);
  const badge = $('offlineBonusBadge');
  if (badge) {
    if (hasBonus) {
      badge.style.display = '';
      badge.classList.toggle('paused', paused);
      badge.textContent = paused
        ? `已暂停奖励时间 ${fmtCountdownClock(ms)}`
        : `2× 奖励时间 ${fmtCountdownClock(ms)}`;
    } else {
      badge.style.display = 'none';
      badge.classList.remove('paused');
      badge.textContent = '';
    }
  }
  const pauseToggle = $('offlineBonusPauseToggle');
  if (pauseToggle) pauseToggle.checked = paused;
  const settingVal = $('offlineBonusSettingVal');
  if (settingVal) {
    settingVal.textContent = ms > 0
      ? `${fmtDurationCN(Math.ceil(ms / 1000))}（${paused ? '已暂停 · 1× 速度' : '2× 速度'}）`
      : '0 秒';
  }
}

function setOfflineBonusPaused(paused) {
  if (typeof player === 'undefined' || !player) return false;
  syncOfflineBonusClock();
  player.offlineBonusPaused = Boolean(paused);
  updateOfflineBonusUI();
  if (typeof saveGame === 'function') {
    try { saveGame(); } catch (err) {}
  }
  if (typeof showToast === 'function') {
    showToast(player.offlineBonusPaused ? '奖励时间已暂停（恢复 1 倍速）' : '奖励时间已恢复（2 倍速）');
  }
  return player.offlineBonusPaused;
}

function toggleOfflineBonusPause() {
  return setOfflineBonusPaused(!isOfflineBonusPaused());
}

/* 离开时正在垂钓：重新登录后继续垂钓（不结算离线收获） */
function resumeOfflineFishing() {
  if (typeof storyFlags === 'undefined') return;
  if (!storyFlags.fishingUnlocked && !storyFlags.arrivedCapital) return;
  if (storyFlags.leftVillage && !storyFlags.arrivedCapital) return;
  if (typeof battleActive === 'function' && battleActive()) return;
  if (typeof fishing === 'undefined' || fishing.running) return;
  if (typeof startFishing === 'function') startFishing(getGameClockMs());
}

/* 离开时正在烹饪：保留已入炉的食材并恢复烹饪进度（不结算离线收获） */
function resumeOfflineCooking(cookingInfo) {
  if (!cookingInfo || !Array.isArray(cookingInfo.pending) || !cookingInfo.pending.length) return;
  if (typeof storyFlags !== 'undefined' && storyFlags.leftVillage && !storyFlags.arrivedCapital) return;
  if (typeof cookingState === 'undefined' || typeof COOK_RECIPES === 'undefined') return;
  const items = cookingInfo.pending
    .map(it => ({
      recipe: (it && it.recipe === 'shucaiDunyu') || cookingInfo.recipe === 'shucaiDunyu' ? 'shucaiDunyu' : '',
      fishId: it && it.fishId,
      weight: Number(it && it.weight) || 0,
      fishQuality: it && it.fishQuality != null && Number.isFinite(Number(it.fishQuality)) ? Number(it.fishQuality) : null,
      vegId: it && it.vegId && typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS[it.vegId] ? it.vegId : '',
      vegQuality: it && it.vegQuality != null && Number.isFinite(Number(it.vegQuality)) ? Number(it.vegQuality) : 100
    }))
    .filter(it => typeof ITEM_DEFS !== 'undefined' && ITEM_DEFS[it.fishId] && (it.recipe !== 'shucaiDunyu' || ITEM_DEFS[it.vegId]));
  if (!items.length) return;
  cookingState.recipe = COOK_RECIPES[cookingInfo.recipe] ? cookingInfo.recipe : 'kaoyu';
  cookingState.pending = items;
  cookingState.running = true;
  cookingState.startAt = getGameClockMs();
  if (typeof updateCookingUI === 'function') updateCookingUI();
}

function consumePendingOffline() {
  const p = pendingOffline;
  pendingOffline = null;
  resetOfflineClock();
  if (!p) {
    updateOfflineBonusUI();
    return null;
  }

  let bonusInfo = null;
  const offlineMs = Math.max(0, Number(p.ms) || 0);
  if (typeof player !== 'undefined' && player && player.surname && offlineGainsEnabled() && offlineMs > 0) {
    const bonusGainMs = Math.floor(offlineMs / 2);
    if (bonusGainMs >= 1000) {
      player.offlineBonusMs = getOfflineBonusMs() + bonusGainMs;
      bonusInfo = {
        offlineMs,
        bonusGainMs,
        totalBonusMs: player.offlineBonusMs
      };
    }
  }

  if (p.fishing) resumeOfflineFishing();
  if (p.cooking) resumeOfflineCooking(p.cooking);

  updateOfflineBonusUI();
  if (bonusInfo && typeof saveGame === 'function') {
    try { saveGame(); } catch (err) {}
  }
  return bonusInfo;
}

function showOfflineBonusNotice(info) {
  updateOfflineBonusUI();
  if (!info || !(info.bonusGainMs > 0)) return;
  const offTxt = fmtDurationCN(Math.floor(info.offlineMs / 1000));
  const gainTxt = fmtDurationCN(Math.floor(info.bonusGainMs / 1000));
  const totalTxt = fmtDurationCN(Math.floor(info.totalBonusMs / 1000));
  if (typeof addIntel === 'function') {
    addIntel(`离线 ${offTxt}，获得 ${gainTxt} 奖励时间（累计 ${totalTxt}，游戏运行速度 ×2）。`, 'gold');
  }
  if (typeof showToast === 'function') {
    showToast(`离线 ${offTxt}，奖励时间 +${gainTxt}（2 倍速）`, 3200);
  }
}

function showOfflineReport(info) {
  showOfflineBonusNotice(info);
}
