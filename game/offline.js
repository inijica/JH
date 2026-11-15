/* 离线收益系统（从 game.js 拆出，需在 game.js 之前加载） */
/* ================= 离线收益系统 ================= */

const OFFLINE_CONFIG = {
  maxHours: 12,           // 单次离线结算上限（小时）
  minSeconds: 60,         // 离开不足该时长则不结算
  // 武功修炼经验与在线共用 getSkillTrainingExpPerMinute，不再单独折算
  neiLiEfficiency: 1,     // 自身内力折算比例
  bondNeiLiEfficiency: 1, // 羁绊角色内力折算比例
  bondCultCapHours: 24,   // 羁绊自行修炼最多结算的小时数
  fishingMaxCasts: 1000,  // 离线垂钓最多结算的竿数
  fishingEfficiency: 1    // 离线垂钓经验折算比例
};

let pendingOffline = null;   // { at, ms, fishing } 由 loadGame 记录，待结算
let lastOfflineReport = null;

/* 设置界面的「离线收益」开关：默认开启，随存档保存 */
function offlineGainsEnabled() {
  return player.offlineEarnings !== true;
}

function fmtDurationCN(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h} 小时 ${m} 分钟`;
  if (m > 0) return `${m} 分钟`;
  return `${r} 秒`;
}

function consumePendingOffline() {
  const p = pendingOffline;
  pendingOffline = null;
  if (!p) return null;
  const wasFishing = !!p.fishing;
  const report = p.ms > 0 ? applyOfflineGains(p.ms, p.fishing, p.cooking) : null;
  if (wasFishing) resumeOfflineFishing(report);
  return report;
}

/* 离开时正在垂钓：结算完之后接着垂，不白丢一段时间 */
function resumeOfflineFishing(report) {
  if (!storyFlags.fishingUnlocked) return;
  if (battleActive()) return;
  if (fishing.running) return;
  startFishing(Date.now());
  if (report) report.fishingResumed = true;
}

function makeOfflineReport(rawSec, sec, capped) {
  return {
    rawSeconds: rawSec,
    seconds: sec,
    capped,
    activities: [],
    neiLi: 0,
    neiLiRate: 0,
    bondNeiLi: 0,
    bondNeiLiRate: 0,
    skill: null,
    study: null,
    cult: null,
    fishing: null,
    cooking: null
  };
}

function applyOfflineGains(rawMs, fishingInfo, cookingInfo) {
  if (!player.surname) return null;
  if (!offlineGainsEnabled()) return null;
  const cfg = OFFLINE_CONFIG;
  const rawSec = Math.max(0, Math.floor((Number(rawMs) || 0) / 1000));
  const capSec = cfg.maxHours * 3600;
  const sec = Math.min(rawSec, capSec);
  const capped = rawSec > capSec;

  const report = makeOfflineReport(rawSec, sec, capped);
  if (rawSec < cfg.minSeconds) return finalizeOffline(report, cookingInfo);

  // 1. 自身内力（按当前淬火呼吸法等级全额累积）
  const neiLiRate = getNeiLiRatePerMin();
  if (neiLiRate > 0) {
    const gain = neiLiRate / 60 * sec * cfg.neiLiEfficiency;
    if (gain > 0) {
      player.neiLi = (Number(player.neiLi) || 0) + gain;
      report.neiLi = gain;
      report.neiLiRate = neiLiRate * cfg.neiLiEfficiency;
    }
  }

  // 2. 武功修炼经验（结算离开时的修炼；完全空闲时默认修炼内功）
  let skill = getTrainingSkillForActivity();
  let activity = TRAINING_ACTIVITY[player.trainingActivity];
  let interactionEfficiency = Number(player.trainingInteractionEfficiency) || 0;

  const noActivity = !activity && !fishingInfo && !cookingInfo;
  if (noActivity) {
    activity = TRAINING_ACTIVITY.internal;
    const internalId = (player.trainingSelections || {})['内功'];
    skill = internalId
      ? player.skills.find(x => x.id === internalId && skillMatchesCategory(x, '内功')) || null
      : null;
    interactionEfficiency = activity.interactionEfficiency;
  }

  if (skill && activity) {
    const perMin = getSkillTrainingExpPerMinute(
      skill,
      interactionEfficiency,
      player.trainingOtherBonus
    );
    if (perMin > 0) {
      const gainedExp = perMin / 60 * sec;
      const beforeLevel = Number(skill.level) || 1;
      addSkillExp(skill, gainedExp);
      report.activities.push(`${activity.label} · ${skill.name}`);
      report.skill = {
        name: skill.name,
        activity: activity.label,
        rate: perMin,
        gainedExp,
        levels: (Number(skill.level) || 1) - beforeLevel,
        levelAfter: Number(skill.level) || 1
      };
    }
  }

  // 3. 羁绊角色内力
  const b = ensureBondChar();
  const bondRate = getBondNeiLiRatePerMin();
  if (bondRate > 0) {
    const gain = bondRate / 60 * sec * cfg.bondNeiLiEfficiency;
    if (gain > 0) {
      b.neiLi = (Number(b.neiLi) || 0) + gain;
      report.bondNeiLi = gain;
      report.bondNeiLiRate = bondRate * cfg.bondNeiLiEfficiency;
    }
  }

  // 4. 羁绊角色自行修炼（与在线 tick 同一规则，按整点结算）
  const hours = Math.min(Math.floor(rawSec / 3600), cfg.bondCultCapHours, cfg.maxHours);
  if (hours > 0) {
    const gains = {};
    let total = 0;
    const statGains = { root: 0, comp: 0, luck: 0 };
    for (let h = 0; h < hours; h++) {
      const perHour = 1 + (getBondRoot() + getBondComp()) * (1 + getBondValue() / 500) / 50;
      const base = Math.floor(perHour);
      const count = base + (Math.random() < (perHour - base) ? 1 : 0);
      for (let i = 0; i < count; i++) {
        const id = rollBondTrainingSkillId();
        if (!id) break;
        b.levels[id] += 1;
        gains[id] = (gains[id] || 0) + 1;
        total++;
      }
      // 每两个时辰结算一次根骨/悟性/定力成长
      if (h % 2 === 1) {
        const sg = growBondStats(1);
        statGains.root += sg.root;
        statGains.comp += sg.comp;
        statGains.luck += sg.luck;
      }
    }
    // 离线期间的自行修炼已在此一次性结算，重置计时避免与在线 tick 重复
    b.lastCultAt = Date.now();
    b.lastGrowthAt = Date.now() - (hours % 2) * 3600 * 1000;
    if (total > 0) report.cult = { hours, gains, total, statGains };
  }

  // 5. 垂钓（离开时正在垂钓才结算）
  if (fishingInfo) settleOfflineFishing(report, sec, cfg, fishingInfo);

  // 6. 钻研（只见微知著，受离线时长上限约束）
  settleOfflineStudy(report, sec);

  return finalizeOffline(report, cookingInfo);
}

/* 离线钻研：与在线共用每秒获取量，时间系数在最终结算时一并计入 */
function settleOfflineStudy(report, sec) {
  if (!storyFlags.xuanlanLearned || !player.studyTargetId) return;
  const skill = (player.skills || []).find(s => s && s.id === player.studyTargetId);
  if (!skill) return;
  const gain = getJwzzGainPerSec(skill) * sec;
  if (!(gain > 0)) return;
  skill.jianweizhizhuBase = (Number(skill.jianweizhizhuBase) || 0) + gain;
  skill.studyMinutes = (Number(skill.studyMinutes) || 0) + sec / 60;
  report.study = { skill: skill.name, gain };
  report.activities.push(`钻研 · ${skill.name}`);
}

/* 离开时正在烤鱼：不管离线长短，把这炉烤完（否则食材会白丢） */
function settleOfflineCooking(report, cookingInfo) {
  if (!cookingInfo || !Array.isArray(cookingInfo.pending) || !cookingInfo.pending.length) return;
  cookingState.recipe = COOK_RECIPES[cookingInfo.recipe] ? cookingInfo.recipe : 'kaoyu';
  cookingState.pending = cookingInfo.pending.map(it => ({
    fishId: it && it.fishId,
    weight: Number(it && it.weight) || 0
  })).filter(it => ITEM_DEFS[it.fishId]);
  cookingState.running = false;
  cookingState.startAt = 0;
  const fill = $('cookingProgressFill');
  if (fill) fill.style.width = '0%';
  if (!cookingState.pending.length) return;
  const result = finishCooking();
  if (!result) return;
  report.cooking = result;
  report.activities.push('火堆旁烤鱼');
}

function finalizeOffline(report, cookingInfo) {
  if (cookingInfo) settleOfflineCooking(report, cookingInfo);

  const hasGain = report.neiLi > 0 || report.bondNeiLi > 0 ||
    (report.skill && report.skill.gainedExp > 0) ||
    (report.study && report.study.gain > 0) ||
    (report.cult && report.cult.total > 0) ||
    (report.fishing && report.fishing.casts > 0) ||
    (report.cooking && report.cooking.count > 0);
  if (!hasGain) return null;

  lastOfflineReport = report;
  try { saveGame(); } catch (err) {}
  return report;
}

/* 按在线同一套规则模拟离线垂钓，渔获按品种合并为叠（均重） */
function settleOfflineFishing(report, sec, cfg, fishingInfo) {
  if (!storyFlags.fishingUnlocked) return;
  const durSec = Math.max(1, (Number(fishingInfo.duration) || getFishingDuration()) / 1000);
  const soakSec = 0.3;
  const maxCasts = Math.max(0, Number(cfg.fishingMaxCasts) || 0);
  const mult = getFishingExpMultiplier() * (Number(cfg.fishingEfficiency) || 1);

  let t = 0;
  let casts = 0;
  let emptyCount = 0;
  let expRaw = 0;
  let capped = false;
  const fish = {};
  let xinde = 0;

  while (true) {
    if (casts >= maxCasts) { capped = true; break; }
    if (t + durSec > sec) break;
    t += durSec;
    casts++;

    const r = rollFishingCatch();
    if (r.type === 'empty') {
      emptyCount++;
      expRaw += 10 * mult;
    } else {
      const qEffect = Math.max(0, r.Q * 0.3);
      const baseExp = { common: 16, rare: 37, epic: 100 }[r.category] || 12;
      const count = r.rewardCount || 1;
      expRaw += (baseExp + qEffect * 0.75) * (1 + qEffect * 0.001) * count * mult;
      if (r.itemId === 'wuxueXinde') {
        xinde += count;
      } else {
        const f = fish[r.itemId] || (fish[r.itemId] = { name: ITEM_DEFS[r.itemId].name, qty: 0, weightSum: 0 });
        f.qty += count;
        f.weightSum += r.weight * count;
      }
      if (r.lucky) xinde += count;
    }

    t += soakSec;
  }

  if (casts <= 0) return;

  const items = [];
  Object.keys(fish).forEach(id => {
    const f = fish[id];
    const avg = Math.round((f.weightSum / f.qty) * 100) / 100;
    addItem(id, f.qty, { weight: avg });
    items.push({ name: f.name, qty: f.qty, weight: avg });
  });
  if (xinde > 0) {
    addItem('wuxueXinde', xinde);
    items.push({ name: '武学心得', qty: xinde });
  }

  const beforeLevel = getFishingLevel();
  if (!getFishingTechnique()) ensureFishingTechnique();
  const expGain = Math.round(expRaw);
  if (expGain > 0) addFishingExp(expGain);
  const afterLevel = getFishingLevel();

  report.fishing = {
    casts,
    emptyCount,
    items,
    exp: expGain,
    levelBefore: beforeLevel,
    levelAfter: afterLevel,
    capped,
    durationSec: durSec,
    fishedSeconds: t
  };
  report.activities.push('溪边垂钓');
}

function buildOfflineReportRows(report) {
  const rows = [];
  if (report.neiLi > 0) {
    rows.push({
      label: '内力',
      value: `+${fmtNeiLi(report.neiLi)}`,
      note: `约 ${fmtRate(report.neiLiRate)}/分钟`
    });
  }
  if (report.skill) {
    rows.push({
      label: `${report.skill.name}`,
      value: `+${Math.round(report.skill.gainedExp)} 经验`,
      note: report.skill.levels > 0
        ? `突破 ${report.skill.levels} 重（现${levelToChinese(report.skill.levelAfter)}重）`
        : `${report.skill.activity}不辍 · 约 ${report.skill.rate.toFixed(2)} 经验/分钟`
    });
  }
  if (report.study) {
    rows.push({
      label: `钻研 · ${report.study.skill}`,
      value: `+${fmtBondStat(report.study.gain)} 见微知著`,
      note: '钻研不辍 · 玄览通微'
    });
  }
  if (report.bondNeiLi > 0) {
    rows.push({
      label: `${BOND_CHAR.name} 内力`,
      value: `+${fmtNeiLi(report.bondNeiLi)}`,
      note: `约 ${fmtRate(report.bondNeiLiRate)}/分钟`
    });
  }
  if (report.cult) {
    const parts = Object.keys(report.cult.gains)
      .map(id => `${getBondSkillName(id)} +${report.cult.gains[id]}重`);
    const sg = report.cult.statGains || {};
    if (sg.root > 0) parts.push(`根骨 +${fmtBondStat(sg.root)}`);
    if (sg.comp > 0) parts.push(`悟性 +${fmtBondStat(sg.comp)}`);
    if (sg.luck > 0) parts.push(`定力 +${fmtBondStat(sg.luck)}`);
    rows.push({
      label: `${BOND_CHAR.name} 自行修炼`,
      value: `${report.cult.total} 重`,
      note: parts.join('，')
    });
  }
  if (report.fishing && report.fishing.casts > 0) {
    const f = report.fishing;
    const notes = [];
    f.items.forEach(it => {
      notes.push(it.weight != null ? `${it.name} ×${it.qty}（均重 ${it.weight.toFixed(2)}s）` : `${it.name} ×${it.qty}`);
    });
    if (f.emptyCount > 0) notes.push(`空竿 ${f.emptyCount} 次`);
    notes.push(`渔夫 Lv.${f.levelBefore} → Lv.${f.levelAfter}（+${f.exp} 经验）`);
    if (f.capped) notes.push(`达到 ${OFFLINE_CONFIG.fishingMaxCasts} 竿结算上限`);
    rows.push({
      label: '溪边垂钓',
      value: `${f.casts} 竿`,
      note: notes.join('；')
    });
  }
  if (report.cooking && report.cooking.count > 0) {
    const c = report.cooking;
    const notes = [c.summary.join('、'), `庖丁经验 +${c.totalExp}`];
    if (c.leveledAny) notes.push(`庖丁 Lv.${c.paodingLevel}`);
    rows.push({
      label: '火堆旁烤鱼',
      value: `${c.count} 尾`,
      note: notes.join('；')
    });
  }
  return rows;
}

function showOfflineReport(report) {
  if (!report) return;
  const old = document.getElementById('offlineOverlay');
  if (old) old.remove();

  const rows = buildOfflineReportRows(report);
  const ov = document.createElement('div');
  ov.id = 'offlineOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(22,30,26,.66);padding:24px;';
  ov.innerHTML = `
    <div style="width:100%;max-width:440px;max-height:86vh;overflow:auto;background:linear-gradient(160deg,#f8f5ec,#eee7d5);border:1px solid #b7a36b;border-radius:3px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:22px 24px 18px;box-sizing:border-box;color:#2f463d;font-family:inherit;letter-spacing:.5px;">
      <div style="text-align:center;letter-spacing:6px;font-size:19px;color:#30483d;">离 线 收 益</div>
      <div style="height:1px;background:linear-gradient(to right,transparent,#b7a36b,transparent);margin:12px 0 14px;"></div>
      <div style="font-size:13px;color:#6d6a5c;text-align:center;line-height:1.7;">
        你离开了 <b style="color:#30483d;font-weight:600;">${fmtDurationCN(report.seconds)}</b>
        ${report.capped ? `<br><span style="color:#8a8778;">超过 ${OFFLINE_CONFIG.maxHours} 小时上限，按上限结算</span>` : ''}
        ${report.activities.length ? `<br><span style="color:#6d6a5c;">离开时正在：${report.activities.join('、')}</span>` : ''}
      </div>
      <div style="margin:14px 0 4px;">
        ${rows.length ? rows.map(r => `
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:9px 2px;border-bottom:1px dashed #d8d0ba;">
            <div style="min-width:0;">
              <div style="font-size:14px;color:#30483d;">${escapeHtml(r.label)}</div>
              <div style="font-size:12px;color:#8a8778;line-height:1.5;">${escapeHtml(r.note)}</div>
            </div>
            <div style="font-size:15px;color:#7a5f23;white-space:nowrap;">${escapeHtml(r.value)}</div>
          </div>`).join('') : `<div style="font-size:13px;color:#8a8778;text-align:center;padding:8px 0;">此行无事，也就无甚收获。</div>`}
      </div>
      <button id="offlineConfirmBtn" style="margin-top:16px;width:100%;padding:11px 0;background:#30483d;color:#f8f5eb;border:none;border-radius:2px;font-size:14px;letter-spacing:3px;cursor:pointer;font-family:inherit;">收 下</button>
    </div>`;
  document.body.appendChild(ov);

  const btn = ov.querySelector('#offlineConfirmBtn');
  const close = () => { ov.remove(); };
  if (btn) btn.addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });

  const parts = [];
  if (report.neiLi > 0) parts.push(`内力 +${fmtNeiLi(report.neiLi)}`);
  if (report.skill) parts.push(`${report.skill.name} +${Math.round(report.skill.gainedExp)}经验`);
  if (report.study) parts.push(`钻研【${report.study.skill}】+${fmtBondStat(report.study.gain)}见微知著`);
  if (report.bondNeiLi > 0) parts.push(`${BOND_CHAR.name}内力 +${fmtNeiLi(report.bondNeiLi)}`);
  if (report.cult) parts.push(`${BOND_CHAR.name}自行修炼 ${report.cult.total} 重`);
  if (report.fishing && report.fishing.casts > 0) {
    const fishTotal = report.fishing.items.filter(i => i.name !== '武学心得')
      .reduce((a, i) => a + i.qty, 0);
    parts.push(`垂钓 ${report.fishing.casts} 竿（渔获 ${fishTotal} 尾）`);
  }
  if (report.cooking && report.cooking.count > 0) parts.push(`烤鱼 ${report.cooking.count} 尾`);
  if (!parts.length) return;
  addIntel(`离线 ${fmtDurationCN(report.seconds)}，所得：${parts.join('、')}。`, 'gold');
}
