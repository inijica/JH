/* 切磋入口与 NPC 敌人构建（从 battle.js 拆出，需在 battle.js 之后加载） */

/* 进入战斗前的行动（修炼/钓鱼），离开战斗后自动恢复 */
let preBattleAction = null;

function capturePreBattleAction() {
  preBattleAction = {
    trainingActivity: player.trainingActivity || '',
    fishingActive: !!(fishing.running || fishing.nextStartAt)
  };
}

function restorePreBattleAction() {
  const pre = preBattleAction;
  preBattleAction = null;
  if (!pre) return;
  /* 玩家已在战斗结束后重新开始了其他行动时不要覆盖 */
  if (player.trainingActivity || fishing.running) return;
  if (pre.trainingActivity && TRAINING_ACTIVITY[pre.trainingActivity]) {
    startTraining(pre.trainingActivity);
  }
  if (pre.fishingActive && storyFlags.fishingUnlocked && !fishing.running) {
    startFishing();
  }
}

function startSpar(npcId) {
  const def = NPC_DEFS[npcId];
  if (!def) return;

  if (battleActive()) {
    showToast('正在切磋中，先分出胜负吧');
    return;
  }

  const cdLeft = getSparCdLeft(npcId);
  if (cdLeft > 0) {
    showToast(`刚切磋过呢，过${Math.ceil(cdLeft / 1000)}s再来吧`, 1000);
    return;
  }

  capturePreBattleAction();
  cancelFishing();
  stopTraining();
  stopBattleEngine();
  battleRunning = false;

  player.maxHp = getMaxHp();
  player.hp = player.maxHp;
  battle.enemies = sealFighters('enemy', [makeSparEnemy(npcId)]);
  battle.allies = buildAllyTeam(null, npcId === 'liQianyuan');
  battle.over = false;
  battle.logs = [];
  battle.keepLogs = false;
  battle.pozhan = 0;
  const sparNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  battle.lastPozhanAt = sparNow;
  battle.jiumaiNextAt = sparNow + JIUMAI_DECAY_MS;
  battle.sparNpcId = npcId;
  battle.dreamId = '';
  battle.storyBattleId = '';
  battle.whiteRobe = null;
  battle.forfeited = false;
  if (typeof initBattleEvents === 'function') initBattleEvents(npcId);
  initBattleStrategy();
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) forfeitBtn.textContent = '放 弃 战 斗';
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '暂 停 战 斗';

  addLog(`【切磋】${def.name}：『${fillPlayerName(def.battleLine)}』`, '');
  if (npcId === 'liQianyuan') {
    addLog(`【切磋】${BOND_CHAR.name}：『${player.gender === '女' ? '姐姐' : '哥哥'}，我来帮你！』`, '');
  }
  renderBattleStructure();
  updateBattleUI();

  mainView = 'village';
  renderMainTab();
  switchTab('battle');
  battleRunning = true;
  startBattleEngine();
}

function handleSparWin(npcId) {
  const def = NPC_DEFS[npcId];
  if (!def) return;

  if (!player.sparCd || typeof player.sparCd !== 'object') player.sparCd = {};
  player.sparCd[npcId] = Date.now() + getSparCdMs(npcId);

  const expGain = Number(def.sparExp) || SPAR_EXP;
  const trainingSkills = getActiveTrainingSkills();
  const skillGains = trainingSkills.map(skill => ({ skill, exp: calcSparSkillExp(expGain, skill) }));
  skillGains.forEach(({ skill, exp }) => addSkillExp(skill, exp));
  if (skillGains.length) {
    addLog(`切磋所得：${skillGains.map(({ skill, exp }) => `${skill.name} +${exp}`).join('，')}`, 'win');
    addIntel(`与${def.name}切磋得胜，${skillGains.map(({ skill, exp }) => `【${skill.name}】+${exp}经验`).join('、')}。`, 'good');
  } else {
    addLog('切磋所得：当前没有正在修炼的武功，经验散于无形。', '');
    addIntel(`与${def.name}切磋得胜，但你并无正在修炼的武功，未得经验。`, '');
  }

  if (def.noGrowth) {
    addLog(`${def.name} 并未因胜负而动气，功力如故。`, '');
    if (npcId === 'liQianyuan') {
      storyFlags.liQianyuanDefeated = true;
      addIntel('李先生神色复杂地看着你，似乎终于下定决心要说些什么。', 'good');
    } else {
      addIntel(`${def.name}收势而立，捋须笑道：“不错，不错，是个好苗子。”`, 'good');
    }
    renderSkills();
    renderIntel();
    saveGame();
    return;
  }
  const times = 1 + Math.floor(((Number(def.comp) || 0) + (Number(def.root) || 0)) / 50);
  const levels = getNpcSkillLevels(npcId);
  if (!player.npcLevels || typeof player.npcLevels !== 'object') player.npcLevels = {};
  const gains = [];
  for (let i = 0; i < times; i++) {
    const idx = Math.floor(Math.random() * def.skills.length);
    const sk = def.skills[idx];
    levels[sk.id] += 1;
    gains.push(`${sk.name}至${levelToChinese(levels[sk.id])}重`);
  }
  player.npcLevels[npcId] = levels;

  if (gains.length) {
    addLog(`${def.name} 修行有成：${gains.join('、')}。`, 'crit');
    addIntel(`${def.name}于修行中精进：${gains.join('、')}。`, 'good');
  } else {
    addIntel(`${def.name}修行一番，未有所悟。`, '');
  }

  renderSkills();
  renderIntel();
  saveGame();
}

function makeSparEnemy(npcId) {
  const def = NPC_DEFS[npcId];
  if (!def) return null;
  const st = getNpcStats(npcId);
  const maxHp = Math.round(80 + st.con * 20);
  const enemy = {
    name: def.name,
    npcId,
    hp: maxHp,
    maxHp,
    atk: 0,
    speed: def.speed,
    con: st.con,
    neiLi: st.neiLi,
    fist: st.fist,
    blade: st.blade,
    sword: st.sword,
    changbing: st.changbing,
    qimen: st.qimen,
    hidden: st.hidden,
    medicine: st.medicine,
    accuracy: def.accuracy,
    evasion: def.evasion,
    root: Number(def.root) || 0,
    comp: Number(def.comp) || 0,
    attack: def.attack,
    skills: def.skills.map(sk => `${sk.name}（${levelToChinese(st.levels[sk.id])}重）`),
    memory: {},
    confused: false,
    isSpar: true
  };

  const enemyNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  if (def.huomai) {
    enemy.huomaiLayers = 1;
    enemy.huomaiInterval = 5000;
    enemy.huomaiNextAt = enemyNow + enemy.huomaiInterval;
    enemy.huomaiRegenPerLayer = (Number(st.medicine) || 0) / 50;
    enemy.huomaiSpeedPerLayer = 0;
  }
  if (def.wujiu) enemy.wujiuStacks = 0;
  if (def.haoran) {
    enemy.haoranLayers = 0;
    enemy.haoranAccum = 0;
    enemy.haoranNextAt = enemyNow + 5000;
  }
  return enemy;
}

function getActiveTrainingSkills() {
  const out = [];
  const sel = player.trainingSelections || {};
  SKILL_TYPES.forEach(type => {
    const id = sel[type];
    if (!id) return;
    const skill = player.skills.find(x => x.id === id && skillMatchesCategory(x, type));
    if (skill && !out.includes(skill)) out.push(skill);
  });
  return out;
}
