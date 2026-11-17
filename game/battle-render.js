/* 战斗界面渲染（从 battle.js 拆出，需在 battle.js 之前加载） */
function renderLog() {
  const el = $('battleLog');
  el.innerHTML = battle.logs.map(l => `<div class="log-line ${l.cls}">${l.text}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function shake(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}

function renderBattleIdle() {
  $('battleMsg').textContent = '当前暂无战斗';
  const allyEl = $('allySide');
  const enemyEl = $('enemySide');
  if (allyEl) allyEl.innerHTML = '';
  if (enemyEl) enemyEl.innerHTML = '';

  const leaveBtn = $('battleLeaveBtn');
  if (leaveBtn) leaveBtn.style.display = 'none';
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) { forfeitBtn.style.display = 'none'; forfeitBtn.textContent = '放 弃 战 斗'; }
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.style.display = 'none';

  if (Array.isArray(battle.logs) && battle.logs.length) {
    renderLog();
  } else {
    $('battleLog').innerHTML = '';
  }
}

/* 战斗卡片上的属性一律取整显示，不保留小数 */
function fmtBattleInt(v) {
  return Math.round(Number(v) || 0).toString();
}
function fmtBattlePct(v) {
  return Math.round((Number(v) || 0) * 100) + '%';
}
/* 行动速度保留两位小数显示（与属性界面一致） */
function fmtBattleSpeed(v) {
  return fmtDecimal(Math.round((Number(v) || 0) * 100) / 100);
}

/* 基础属性行：数值节点带 data-fd，供 updateFighterCard 实时刷新 */
function fighterDetailHtml(f) {
  return [
    `<span>体魄 <b data-fd="con">${fmtBattleInt(f.con)}</b></span>`,
    `<span>内力 <b data-fd="neili">${fmtBattleInt(fighterNeiLi(f))}</b></span>`,
    `<span>命中 <b data-fd="acc">${fmtBattlePct(f.accuracy || 0)}</b></span>`,
    `<span>闪避 <b data-fd="eva">${fmtBattlePct(fighterEvasion(f))}</b></span>`,
    `<span>行动速度 <b data-fd="spd">${fmtBattleSpeed(f.speed)}</b></span>`
  ].join('');
}

/* 武学属性行：数值节点带 data-fm；医术为 0 时整行隐藏 */
function fighterMartialHtml(f) {
  const med = Number(f.medicine) || 0;
  return [
    `<span>拳掌 <b data-fm="fist">${fmtBattleInt(f.fist)}</b></span>`,
    `<span>刀法 <b data-fm="blade">${fmtBattleInt(f.blade)}</b></span>`,
    `<span>剑法 <b data-fm="sword">${fmtBattleInt(f.sword)}</b></span>`,
    `<span>长兵 <b data-fm="changbing">${fmtBattleInt(f.changbing)}</b></span>`,
    `<span>奇门 <b data-fm="qimen">${fmtBattleInt(f.qimen)}</b></span>`,
    `<span>暗器 <b data-fm="hidden">${fmtBattleInt(f.hidden)}</b></span>`,
    `<span data-fm="medicine-row" style="${med > 0 ? '' : 'display:none'}">医术 <b data-fm="medicine">${fmtBattleInt(f.medicine)}</b></span>`
  ].join('');
}

function fighterCardHtml(f) {
  const skills = Array.isArray(f.skills) ? f.skills.join(' · ') : '—';
  return `<div class="fighter" data-uid="${escapeHtml(f.uid)}">
    <div class="fighter-name">${escapeHtml(f.name)}</div>
    <div class="fighter-detail">${fighterDetailHtml(f)}</div>
    <div class="fighter-detail fighter-martial">${fighterMartialHtml(f)}</div>
    <div class="fighter-skills">${escapeHtml(skills)}</div>
    <div class="fighter-state"></div>
    <div class="bar-label"><span>气血</span><span class="fighter-hp-text">0 / 0</span></div>
    <div class="bar"><div class="fill hp-fill"></div></div>
    <div class="bar-label"><span>行动条</span><span class="fighter-ap-text">0%</span></div>
    <div class="bar"><div class="fill ap-fill"></div></div>
  </div>`;
}

function renderBattleStructure() {
  const allyEl = $('allySide');
  const enemyEl = $('enemySide');
  if (allyEl) allyEl.innerHTML = (battle.allies || []).map(fighterCardHtml).join('');
  if (enemyEl) enemyEl.innerHTML = (battle.enemies || []).map(fighterCardHtml).join('');
}

function fighterStateNotes(f) {
  const notes = [];
  if (f.huomaiLayers !== undefined && Number(f.huomaiLayers) > 0) {
    notes.push(`活脉 ${f.huomaiLayers} 层`);
  }
  if (f.hanShiLayers !== undefined && Number(f.hanShiLayers) > 0) {
    notes.push(`撼山势 ${f.hanShiLayers} 层`);
  }
  if (f.siTuiLayers !== undefined && Number(f.siTuiLayers) > 0) {
    notes.push(`思退 ${f.siTuiLayers} 层`);
  }
  if (f.yourenLayers !== undefined && Number(f.yourenLayers) > 0) {
    notes.push(`游刃 ${f.yourenLayers} 层`);
  }
  if (f.daxueLayers !== undefined && Number(f.daxueLayers) > 0) {
    notes.push(`打穴 ${Number(f.daxueLayers).toFixed(1)} 层`);
  }
  if (f.jiumai !== undefined && Number(f.jiumai) > 0) {
    notes.push(`截脉 ${f.jiumai} 层`);
  }
  if (f.bleedStacks !== undefined && Number(f.bleedStacks) > 0) {
    notes.push(`流血 ${Math.floor(Number(f.bleedStacks))} 层`);
  }
  if (f.weirdPoisonStacks !== undefined && Number(f.weirdPoisonStacks) > 0) {
    notes.push(`诡异毒素 ${Math.floor(Number(f.weirdPoisonStacks))} 层`);
  }
  const battleNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  if (f.stunUntil && battleNow < f.stunUntil) {
    notes.push(`运针调息 ${Math.ceil((f.stunUntil - battleNow) / 1000)} 秒`);
  }
  if (f.haoranLayers !== undefined && Number(f.haoranLayers) > 0) {
  const shield = f.haoranLayers * HAORAN_SHIELD_PER_LAYER - (Number(f.haoranAccum) || 0);
  notes.push(`浩然气 ${f.haoranLayers} 层（护盾 ${fmtNum(shield)}）`);
  }
  if (f.wujiuStacks !== undefined && Number(f.wujiuStacks) > 0) {
    notes.push(`无咎 ${f.wujiuStacks} 层`);
  }
  if (f.confused) notes.push('混乱');
  if (f.vulnerable) notes.push('破防');
  if (f.qizhi) notes.push('气滞（行动速度 -0.1）');
  return notes.length ? `【${notes.join('】【')}】` : '';
}

function updateFighterCard(f) {
  const el = document.querySelector(`.fighter[data-uid="${f.uid}"]`);
  if (!el) return;

  /* 基础属性：每帧按 fighter 对象的当前值刷新，取整显示（行动速度除外） */
  const setFd = (key, val) => {
    const n = el.querySelector(`[data-fd="${key}"]`);
    if (n) n.textContent = val;
  };
  setFd('con', fmtBattleInt(f.con));
  setFd('neili', fmtBattleInt(fighterNeiLi(f)));
  setFd('acc', fmtBattlePct(f.accuracy || 0));
  setFd('eva', fmtBattlePct(fighterEvasion(f)));
  setFd('spd', fmtBattleSpeed(f.speed));

  /* 武学六维与医术 */
  const setFm = (key, val) => {
    const n = el.querySelector(`[data-fm="${key}"]`);
    if (n) n.textContent = val;
  };
  setFm('fist', fmtBattleInt(f.fist));
  setFm('blade', fmtBattleInt(f.blade));
  setFm('sword', fmtBattleInt(f.sword));
  setFm('changbing', fmtBattleInt(f.changbing));
  setFm('qimen', fmtBattleInt(f.qimen));
  setFm('hidden', fmtBattleInt(f.hidden));
  setFm('medicine', fmtBattleInt(f.medicine));
  const medRow = el.querySelector('[data-fm="medicine-row"]');
  if (medRow) medRow.style.display = (Number(f.medicine) || 0) > 0 ? '' : 'none';

  const hp = Math.max(0, Number(f.hp) || 0);
  const maxHp = Math.max(1, Number(f.maxHp) || 1);
  const hpText = el.querySelector('.fighter-hp-text');
  if (hpText) hpText.textContent = `${Math.ceil(hp)} / ${Math.ceil(maxHp)}`;
  const hpFill = el.querySelector('.hp-fill');
  if (hpFill) hpFill.style.width = Math.max(0, hp / maxHp * 100) + '%';
  const apText = el.querySelector('.fighter-ap-text');
  if (apText) apText.textContent = Math.min(100, Math.floor(f.bar)) + '%';
  const apFill = el.querySelector('.ap-fill');
  if (apFill) apFill.style.width = Math.min(100, f.bar) + '%';
  const stateEl = el.querySelector('.fighter-state');
  if (stateEl) stateEl.textContent = fighterStateNotes(f);
  el.classList.toggle('dead', hp <= 0);
}

function shakeCard(f) {
  if (!f) return;
  const el = document.querySelector(`.fighter[data-uid="${f.uid}"]`);
  if (!el) return;
  const nameEl = el.querySelector('.fighter-name');
  if (!nameEl) return;
  nameEl.classList.remove('hit');
  void nameEl.offsetWidth;
  nameEl.classList.add('hit');
}

function updateBattleUI() {
  if (!battle.enemies.length) { renderBattleIdle(); return; }

  if (!document.querySelector('#allySide .fighter') || !document.querySelector('#enemySide .fighter')) {
    renderBattleStructure();
  }
  (battle.allies || []).forEach(updateFighterCard);
  (battle.enemies || []).forEach(updateFighterCard);

  const leaveBtn = $('battleLeaveBtn');
  if (leaveBtn) leaveBtn.style.display = battle.over ? '' : 'none';
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) forfeitBtn.style.display = (battle.over || battle.storyBattleId) ? 'none' : '';
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.style.display = battle.over ? 'none' : '';

  if (battle.over) {
    const pf = playerFighter();
    $('battleMsg').textContent = battle.forfeited ? '已 放 弃' : (pf && pf.hp > 0 ? '胜 利' : '败 北');
  } else {
    const dreamName = battle.dreamId && typeof getDreamChallenge === 'function'
      ? (getDreamChallenge(battle.dreamId) || {}).name || ''
      : '';
    if (battle.storyBattleId === 'whiteRobe') {
      $('battleMsg').textContent = '白衣怪人 · 围攻中';
    } else {
      $('battleMsg').textContent = dreamName
        ? `${dreamName} · 入梦中`
        : `${battle.enemies.map(f => f.name).join('、')} · 切磋中`;
    }
  }
}

function isBattleTabVisible() {
  const el = $('battleTab');
  return !!el && !el.classList.contains('hidden');
}
