/* 战斗策略 UI 与决策（从 battle.js 拆出，需在 battle.js 之前加载） */
function defaultStrategy() {
  return {
    enabled: false,
    rounds: Array.from({ length: 10 }, () => ({ skillId: '', maxUses: -1 })),
    lowHp: { threshold: 30, skillId: '' }
  };
}

function normalizeStrategy(raw) {
  const s = (raw && typeof raw === 'object') ? raw : defaultStrategy();
  if (!Array.isArray(s.rounds)) s.rounds = [];
  while (s.rounds.length < 10) s.rounds.push({ skillId: '', maxUses: -1 });
  if (s.rounds.length > 10) s.rounds.length = 10;
  for (let i = 0; i < s.rounds.length; i++) {
    let r = s.rounds[i];
    if (!r || typeof r !== 'object') r = { skillId: '', maxUses: -1 };
    if (typeof r.skillId !== 'string') r.skillId = '';
    let n = Number(r.maxUses);
    if (!Number.isFinite(n)) n = -1;
    r.maxUses = Math.max(-1, Math.floor(n));
    s.rounds[i] = r;
  }
  if (!s.lowHp || typeof s.lowHp !== 'object') s.lowHp = { threshold: 30, skillId: '' };
  let th = Number(s.lowHp.threshold);
  if (!Number.isFinite(th)) th = 30;
  s.lowHp.threshold = Math.max(1, Math.min(100, Math.floor(th)));
  if (typeof s.lowHp.skillId !== 'string') s.lowHp.skillId = '';
  if (typeof s.enabled !== 'boolean') s.enabled = false;
  return s;
}

function ensureStrategy() {
  player.strategy = normalizeStrategy(player.strategy);
  return player.strategy;
}

function ensureBondStrategy() {
  player.bondStrategy = normalizeStrategy(player.bondStrategy);
  return player.bondStrategy;
}

function getBattleSkillOptions() {
  const opts = [];
  if (player.skills.some(x => x.id === 'zhenshan')) opts.push({ id: 'zhenshan', name: '震山拳' });
  if (player.skills.some(x => x.id === 'feishipo')) opts.push({ id: 'feishipo', name: '飞石破' });
  if (player.skills.some(x => x.id === 'jiusi')) opts.push({ id: 'jiusi', name: '九思剑法' });
  if (player.skills.some(x => x.id === 'paodingDao')) opts.push({ id: 'paodingDao', name: '庖丁刀法' });
  if (typeof hasJinzhenTechnique === 'function' && hasJinzhenTechnique()) {
    opts.push({ id: 'jinzhen', name: '金针渡穴' });
  }
  return opts;
}

function getBondBattleSkillOptions() {
  const b = typeof ensureBondChar === 'function' ? ensureBondChar() : (player.bond || {});
  const levels = (b && b.levels) || {};
  const opts = [];
  if ((Number(levels.zhenshan) || 0) > 0) opts.push({ id: 'zhenshan', name: '震山拳' });
  if ((Number(levels.feishipo) || 0) > 0) opts.push({ id: 'feishipo', name: '飞石破' });
  if ((Number(levels.jiusi) || 0) > 0) opts.push({ id: 'jiusi', name: '九思剑法' });
  if ((Number(levels.paodingDao) || 0) > 0) opts.push({ id: 'paodingDao', name: '庖丁刀法' });
  return opts;
}

function initBattleStrategy() {
  ensureStrategy();
  ensureBondStrategy();
  battle.strategyCursor = 0;
  battle.strategyRemaining = player.strategy.rounds.map(r => r.maxUses);
  battle.bondStrategyCursor = 0;
  battle.bondStrategyRemaining = player.bondStrategy.rounds.map(r => r.maxUses);
  /* 每场战斗开始时重置开场效果与自动叠层计时 */
  battle.startEffectsDone = false;
  battle.lastHanShanAt = Date.now();
}

function tryLowHpStrategy() {
  const s = ensureStrategy();
  if (!s.enabled) return false;
  if (!s.lowHp || !s.lowHp.skillId) return false;
  if (player.maxHp <= 0) return false;
  const pct = player.hp / player.maxHp * 100;
  if (pct > s.lowHp.threshold) return false;
  const sid = s.lowHp.skillId;
  if (sid === 'feishipo' && getFeishipoLevel() > 0) {
    addLog('【战斗策略】气血过低，立刻施展飞石破！', 'crit');
    doFeishipoAttack();
    return true;
  }
  if (sid === 'zhenshan') {
    addLog('【战斗策略】气血过低，立刻施展震山拳！', 'crit');
    doZhenshanAttack();
    return true;
  }
  if (sid === 'jiusi' && getJiusiLevel() > 0) {
    addLog('【战斗策略】气血过低，立刻施展九思剑法！', 'crit');
    doJiusiAttack();
    return true;
  }
  if (sid === 'paodingDao' && hasPaodingDao()) {
    addLog('【战斗策略】气血过低，立刻施展庖丁刀法！', 'crit');
    doPaodingDaoAttack();
    return true;
  }
  if (sid === 'jinzhen' && typeof hasJinzhenTechnique === 'function' && hasJinzhenTechnique()) {
    addLog('【战斗策略】气血过低，立刻施展金针渡穴！', 'crit');
    doPlayerJinzhen();
    return true;
  }
  return false;
}

function tryBondLowHpStrategy(f) {
  const s = ensureBondStrategy();
  if (!s.enabled) return '';
  if (!s.lowHp || !s.lowHp.skillId) return '';
  if (!f || f.maxHp <= 0) return '';
  const pct = f.hp / f.maxHp * 100;
  if (pct > s.lowHp.threshold) return '';
  const opt = getBondBattleSkillOptions().find(o => o.id === s.lowHp.skillId);
  if (!opt) return '';
  addLog(`【羁绊战斗策略】${f.name}气血过低，立刻施展${opt.name}！`, 'crit');
  return opt.id;
}

function resolveStrategySkill() {
  const s = ensureStrategy();
  if (!s.enabled) return '';
  const rounds = s.rounds;
  const n = rounds.length;
  if (!n) return '';
  if (!Array.isArray(battle.strategyRemaining) || battle.strategyRemaining.length !== n) {
    battle.strategyRemaining = rounds.map(r => r.maxUses);
  }
  for (let step = 0; step < n; step++) {
    const idx = battle.strategyCursor % n;
    const r = rounds[idx];
    const rem = battle.strategyRemaining[idx];
    if (r && r.skillId && rem !== 0) {
      if (rem > 0) battle.strategyRemaining[idx] = rem - 1;
      battle.strategyCursor = (battle.strategyCursor + 1) % n;
      return r.skillId;
    }
    battle.strategyCursor = (battle.strategyCursor + 1) % n;
  }
  return '';
}

function resolveBondStrategySkill() {
  const s = ensureBondStrategy();
  if (!s.enabled) return '';
  const rounds = s.rounds;
  const n = rounds.length;
  if (!n) return '';
  if (!Array.isArray(battle.bondStrategyRemaining) || battle.bondStrategyRemaining.length !== n) {
    battle.bondStrategyRemaining = rounds.map(r => r.maxUses);
  }
  for (let step = 0; step < n; step++) {
    const idx = battle.bondStrategyCursor % n;
    const r = rounds[idx];
    const rem = battle.bondStrategyRemaining[idx];
    if (r && r.skillId && rem !== 0) {
      if (rem > 0) battle.bondStrategyRemaining[idx] = rem - 1;
      battle.bondStrategyCursor = (battle.bondStrategyCursor + 1) % n;
      return r.skillId;
    }
    battle.bondStrategyCursor = (battle.bondStrategyCursor + 1) % n;
  }
  return '';
}

function renderStrategyUI() {
  const s = ensureStrategy();
  const enableEl = $('strategyEnable');
  if (enableEl) enableEl.checked = !!s.enabled;
  const roundsEl = $('strategyRounds');
  if (roundsEl) {
    const opts = getBattleSkillOptions();
    roundsEl.innerHTML = s.rounds.map((r, i) => {
      const optHtml = '<option value="">— 不选择 —</option>' + opts.map(o =>
        `<option value="${o.id}" ${r.skillId === o.id ? 'selected' : ''}>${o.name}</option>`
      ).join('');
      return `<div class="strategy-row">
        <span class="strategy-turn">第 ${i + 1} 回合</span>
        <select class="strategy-skill" data-turn="${i}">${optHtml}</select>
        <input class="strategy-uses" type="number" data-turn="${i}" min="-1" step="1" value="${r.maxUses}">
        <span class="strategy-uses-label">次循环</span>
      </div>`;
    }).join('');
  }
  const pctEl = $('strategyLowHpPct');
  if (pctEl) pctEl.value = s.lowHp.threshold;
  const lowSkillEl = $('strategyLowHpSkill');
  if (lowSkillEl) {
    const opts = getBattleSkillOptions();
    lowSkillEl.innerHTML = '<option value="">— 不启用 —</option>' + opts.map(o =>
      `<option value="${o.id}" ${s.lowHp.skillId === o.id ? 'selected' : ''}>${o.name}</option>`
    ).join('');
  }
}

function openStrategy() {
  ensureStrategy();
  renderStrategyUI();
  const ov = $('strategyOverlay');
  if (ov) ov.classList.add('show');
}

function closeStrategy() {
  const ov = $('strategyOverlay');
  if (ov) ov.classList.remove('show');
}

function saveStrategyFromUI() {
  const s = ensureStrategy();
  const enableEl = $('strategyEnable');
  s.enabled = !!(enableEl && enableEl.checked);
  const roundsEl = $('strategyRounds');
  if (roundsEl) {
    roundsEl.querySelectorAll('.strategy-skill').forEach(sel => {
      const i = Number(sel.dataset.turn);
      if (s.rounds[i]) s.rounds[i].skillId = sel.value;
    });
    roundsEl.querySelectorAll('.strategy-uses').forEach(inp => {
      const i = Number(inp.dataset.turn);
      if (s.rounds[i]) {
        let n = Number(inp.value);
        if (!Number.isFinite(n)) n = -1;
        s.rounds[i].maxUses = Math.max(-1, Math.floor(n));
      }
    });
  }
  const pctEl = $('strategyLowHpPct');
  if (pctEl) {
    let th = Number(pctEl.value);
    if (!Number.isFinite(th)) th = 30;
    s.lowHp.threshold = Math.max(1, Math.min(100, Math.floor(th)));
  }
  const lowSkillEl = $('strategyLowHpSkill');
  if (lowSkillEl) s.lowHp.skillId = lowSkillEl.value;
  battle.strategyCursor = 0;
  battle.strategyRemaining = s.rounds.map(r => r.maxUses);
  saveGame();
  showToast('战斗策略已保存');
  closeStrategy();
}

function renderBondBattleStrategyUI() {
  const s = ensureBondStrategy();
  const enableEl = $('bondBattleStrategyEnable');
  if (enableEl) enableEl.checked = !!s.enabled;
  const opts = getBondBattleSkillOptions();
  const roundsEl = $('bondBattleStrategyRounds');
  if (roundsEl) {
    roundsEl.innerHTML = s.rounds.map((r, i) => {
      const optHtml = '<option value="">— 不选择 —</option>' + opts.map(o =>
        `<option value="${o.id}" ${r.skillId === o.id ? 'selected' : ''}>${o.name}</option>`
      ).join('');
      return `<div class="strategy-row">
        <span class="strategy-turn">第 ${i + 1} 回合</span>
        <select class="strategy-skill" data-turn="${i}">${optHtml}</select>
        <input class="strategy-uses" type="number" data-turn="${i}" min="-1" step="1" value="${r.maxUses}">
        <span class="strategy-uses-label">次循环</span>
      </div>`;
    }).join('');
  }
  const pctEl = $('bondBattleStrategyLowHpPct');
  if (pctEl) pctEl.value = s.lowHp.threshold;
  const lowSkillEl = $('bondBattleStrategyLowHpSkill');
  if (lowSkillEl) {
    lowSkillEl.innerHTML = '<option value="">— 不启用 —</option>' + opts.map(o =>
      `<option value="${o.id}" ${s.lowHp.skillId === o.id ? 'selected' : ''}>${o.name}</option>`
    ).join('');
    lowSkillEl.value = opts.some(o => o.id === s.lowHp.skillId) ? s.lowHp.skillId : '';
  }
}

function openBondBattleStrategy() {
  ensureBondStrategy();
  renderBondBattleStrategyUI();
  const ov = $('bondBattleStrategyOverlay');
  if (ov) ov.classList.add('show');
}

function closeBondBattleStrategy() {
  const ov = $('bondBattleStrategyOverlay');
  if (ov) ov.classList.remove('show');
}

function saveBondBattleStrategyFromUI() {
  const s = ensureBondStrategy();
  const enableEl = $('bondBattleStrategyEnable');
  s.enabled = !!(enableEl && enableEl.checked);
  const roundsEl = $('bondBattleStrategyRounds');
  if (roundsEl) {
    roundsEl.querySelectorAll('.strategy-skill').forEach(sel => {
      const i = Number(sel.dataset.turn);
      if (s.rounds[i]) s.rounds[i].skillId = sel.value;
    });
    roundsEl.querySelectorAll('.strategy-uses').forEach(inp => {
      const i = Number(inp.dataset.turn);
      if (s.rounds[i]) {
        let n = Number(inp.value);
        if (!Number.isFinite(n)) n = -1;
        s.rounds[i].maxUses = Math.max(-1, Math.floor(n));
      }
    });
  }
  const pctEl = $('bondBattleStrategyLowHpPct');
  if (pctEl) {
    let th = Number(pctEl.value);
    if (!Number.isFinite(th)) th = 30;
    s.lowHp.threshold = Math.max(1, Math.min(100, Math.floor(th)));
  }
  const lowSkillEl = $('bondBattleStrategyLowHpSkill');
  if (lowSkillEl) s.lowHp.skillId = lowSkillEl.value;
  battle.bondStrategyCursor = 0;
  battle.bondStrategyRemaining = s.rounds.map(r => r.maxUses);
  saveGame();
  showToast('羁绊角色战斗策略已保存');
  closeBondBattleStrategy();
}