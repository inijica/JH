/* 战斗事件（独立文件，需在 battle-spar.js 之后加载）：李乾元切磋剧情 + 白衣怪人围攻剧情 */
const BATTLE_EVENT_CHAR_MS = 30;
const BATTLE_EVENT_LINE_DWELL_MS = 500;
const QIZHI_SPEED_DOWN = 0.1;

/* 战斗事件剧情：speaker 会作为战斗日志前缀显示 */
const LI_QIANYUAN_BATTLE_EVENTS = {
  shutong: [
    { speaker: '旁 白', text: '眼看局势不利，夏扑萤忽然气鼓鼓地大喊道：' },
    { speaker: '夏 扑 萤', text: '『喂！书童！你还要我等到什么时候！快过来帮我挡招！』' },
    { speaker: '书 童', text: '『呜呜呜，先生，对不起，她威胁我说不帮忙的话就把我尿裤子的事跟全村说......』' },
    { speaker: '李 乾 元', text: '『.......』' }
  ],
  breakthrough: [
    { speaker: '旁 白', text: '几番攻守下来，你忽然看穿了李乾元动作中的破绽。' },
    { speaker: '旁 白', text: '你与夏扑萤对视一眼，她当即心领神会般飞身上前，骤然加快了攻势。' },
    { speaker: '旁 白', text: '而你则趁着这个机会，忽然从侧方出手袭击。' },
    { speaker: '李 乾 元', text: '『什么？！』' },
    { speaker: '旁 白', text: '他的脸上闪过惊骇之色。' },
    { speaker: '旁 白', text: '一击得手，李乾元身上的浩然气尽然散去。' },
    { speaker: '旁 白', text: '（本场战斗中李乾元无法再叠加浩然气，同时获得【气滞】）\n（气滞：行动速度 -0.1）' }
  ]
};

const battleEventState = {
  npcId: '',
  shutongDone: false,
  breakthroughDone: false,
  playerActions: 0,
  active: false
};

let battleEventLines = [];
let battleEventLineIndex = 0;
let battleEventLineText = '';
let battleEventLinePrefix = '';
let battleEventLineEntry = null;
let battleEventTyping = false;
let battleEventOnDone = null;
let battleEventTimer = null;
let battleEventDwellTimer = null;

const battleEventLogEl = $('battleLog');
if (battleEventLogEl) {
  battleEventLogEl.addEventListener('click', () => {
    if (battleEventState.active) advanceBattleEvent();
  });
}

function clearBattleEventTimers() {
  if (battleEventTimer) { clearInterval(battleEventTimer); battleEventTimer = null; }
  if (battleEventDwellTimer) { clearTimeout(battleEventDwellTimer); battleEventDwellTimer = null; }
}

function resetBattleEventPlayback() {
  clearBattleEventTimers();
  battleEventLines = [];
  battleEventLineIndex = 0;
  battleEventLineText = '';
  battleEventLinePrefix = '';
  battleEventLineEntry = null;
  battleEventTyping = false;
  battleEventOnDone = null;
}

/* 每场切磋开始时重置事件状态 */
function initBattleEvents(npcId) {
  resetBattleEventPlayback();
  battleEventState.npcId = npcId || '';
  battleEventState.shutongDone = false;
  battleEventState.breakthroughDone = false;
  battleEventState.playerActions = 0;
  battleEventState.active = false;
}

function getLiQianyuanEnemy() {
  return (battle.enemies || []).find(f => f && f.npcId === 'liQianyuan') || null;
}

function getCompanionFighter() {
  return (battle.allies || []).find(f => f && f.id === BOND_SPAR_ID) || null;
}

function allyBelowEventThreshold() {
  const pf = battleEventState.npcId === 'liQianyuan' ? playerFighter() : null;
  if (pf && pf.hp > 0 && pf.maxHp > 0 && pf.hp <= pf.maxHp * 0.6) return true;
  const companion = getCompanionFighter();
  return !!(companion && companion.hp > 0 && companion.maxHp > 0 &&
    companion.hp <= companion.maxHp * 0.6);
}

/* 由 battle.js 在每次行动结算后调用 */
function checkBattleEventTriggers(fighter) {
  if (!battleActive() || battle.over || battleEventState.active) return;
  if (battleEventState.npcId !== 'liQianyuan' || battle.sparNpcId !== 'liQianyuan') return;

  if (fighter && fighter.isPlayer) battleEventState.playerActions += 1;

  if (!battleEventState.shutongDone && allyBelowEventThreshold()) {
    triggerBattleEvent('shutong');
    return;
  }
  if (!battleEventState.breakthroughDone && battleEventState.playerActions >= 5) {
    triggerBattleEvent('breakthrough');
  }
}

function triggerBattleEvent(kind) {
  battleEventState.active = true;
  pauseBattle();
  playBattleEvent(LI_QIANYUAN_BATTLE_EVENTS[kind], () => onBattleEventStoryDone(kind));
}

function onBattleEventStoryDone(kind) {
  battleEventState.active = false;
  if (kind === 'shutong') {
    completeShutongEvent();
  } else {
    completeBreakthroughEvent();
  }

  if (!battle.over && battleActive()) {
    /* 两段事件同时满足时会连续播放，播放完再恢复战斗 */
    checkBattleEventTriggers();
    if (!battleEventState.active && !battle.over && battleActive()) resumeBattle();
  }
}

function completeShutongEvent() {
  if (battleEventState.shutongDone) return;
  battleEventState.shutongDone = true;
  addShutongFighter();
  addLog('【切磋】书童战战兢兢地加入了战斗，替你挡下李乾元的攻势。', '');
  updateBattleUI();
}

/* 书童作为己方成员参战：被攻击权重 3（玩家 1 + 夏扑萤 1 + 书童 3，书童被选中的概率为 3/5） */
function addShutongFighter() {
  if ((battle.allies || []).some(f => f && f.id === 'shutong')) return;
  const def = NPC_DEFS.shutong;
  const st = getNpcStats('shutong');
  const levels = getNpcSkillLevels('shutong');
  const maxHp = Math.round(80 + st.con * 20);
  battle.allies.push({
    uid: 'ally-shutong',
    id: 'shutong',
    name: def.name,
    isShutong: true,
    side: 'ally',
    hp: maxHp,
    maxHp,
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
    luck: Number(def.luck) || 0,
    attack: def.attack,
    skills: def.skills.map(sk => `${sk.name}（${levelToChinese(levels[sk.id])}重）`),
    memory: {},
    confused: false,
    targetWeight: 3,
    bar: 0
  });
  renderBattleStructure();
}

function completeBreakthroughEvent() {
  if (battleEventState.breakthroughDone) return;
  battleEventState.breakthroughDone = true;
  const enemy = getLiQianyuanEnemy();
  if (!enemy) return;
  enemy.haoranLayers = 0;
  enemy.haoranAccum = 0;
  enemy.haoranNextAt = 0;
  enemy.haoranSealed = true;
  enemy.qizhi = true;
  enemy.speed = Math.max(0, (Number(enemy.speed) || 0) - QIZHI_SPEED_DOWN);
  addLog(`【战斗事件】李乾元身上的【浩然气】尽数散去，气机一滞，本场战斗无法再叠加【浩然气】（行动速度 -0.1）。`, 'win');
}

/* ================= 战斗事件剧情播放（写入战斗日志） ================= */

function playBattleEvent(lines, onDone) {
  resetBattleEventPlayback();
  battleEventLines = Array.isArray(lines) ? lines.slice() : [];
  battleEventLineIndex = 0;
  battleEventOnDone = typeof onDone === 'function' ? onDone : null;
  battleEventState.active = true;
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) forfeitBtn.style.display = 'none';
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.style.display = 'none';
  if (!battleEventLines.length) {
    finishBattleEventPlayback();
    return;
  }
  renderBattleEventLine();
}

function renderBattleEventLine() {
  const line = battleEventLines[battleEventLineIndex] || {};
  battleEventLinePrefix = line.speaker ? `【${line.speaker}】` : '';
  battleEventLineText = String(line.text == null ? '' : line.text).replace(/\n/g, ' ');
  battleEventTyping = true;
  clearBattleEventTimers();

  battleEventLineEntry = { text: battleEventLinePrefix, cls: 'event' };
  battle.logs.push(battleEventLineEntry);
  renderLog();

  if (!battleEventLineText.length) {
    completeBattleEventLine();
    return;
  }

  let i = 0;
  battleEventTimer = setInterval(() => {
    i += 1;
    if (battleEventLineEntry) battleEventLineEntry.text = battleEventLinePrefix + battleEventLineText.slice(0, i);
    renderLog();
    if (i >= battleEventLineText.length) completeBattleEventLine();
  }, BATTLE_EVENT_CHAR_MS);
}

function completeBattleEventLine() {
  if (!battleEventState.active || !battleEventTyping) return;
  clearBattleEventTimers();
  battleEventTyping = false;
  if (battleEventLineEntry) battleEventLineEntry.text = battleEventLinePrefix + battleEventLineText;
  renderLog();
  battleEventDwellTimer = setTimeout(advanceBattleEvent, BATTLE_EVENT_LINE_DWELL_MS);
}

/* 点击战斗日志：打字中则立即显示全文，否则进入下一句 */
function advanceBattleEvent() {
  if (!battleEventState.active) return;
  clearBattleEventTimers();
  if (battleEventTyping) {
    completeBattleEventLine();
    return;
  }
  if (battleEventLineIndex < battleEventLines.length - 1) {
    battleEventLineIndex += 1;
    renderBattleEventLine();
    return;
  }
  finishBattleEventPlayback();
}

function finishBattleEventPlayback() {
  const onDone = battleEventOnDone;
  resetBattleEventPlayback();
  battleEventState.active = false;
  if (!battle.over) {
    const forfeitBtn = $('battleForfeitBtn');
    if (forfeitBtn && !battle.storyBattleId) forfeitBtn.style.display = '';
    const pauseBtn = $('battlePauseBtn');
    if (pauseBtn) pauseBtn.style.display = '';
  }
  if (onDone) onDone();
}

/* ================= 白衣怪人剧情战事件 ================= */

/* 白衣怪人：五狗屠龙阵的狗狗属性 ×2，招式效果相同，换个名字，且不带连携机制 */
function makeWhiteRobeEnemy(index) {
  const s = DREAM_DOG_STATS;
  const M = 2;
  const con = s.con * M;
  const maxHp = Math.round(80 + con * 20);
  const suffix = ['壹', '贰', '叁', '肆', '伍', '陆', '柒'][index] || String(index + 1);
  return {
    name: `白衣怪人·${suffix}`,
    npcId: 'whiteRobe',
    hp: maxHp,
    maxHp,
    atk: 0,
    speed: s.speed * M,
    con,
    neiLi: s.neiLi * M,
    root: s.root * M,
    comp: s.comp * M,
    luck: s.luck * M,
    fist: s.fist * M,
    blade: s.blade * M,
    sword: s.sword * M,
    changbing: s.changbing * M,
    qimen: s.qimen * M,
    hidden: s.hidden * M,
    medicine: s.medicine * M,
    accuracy: s.accuracy * M,
    evasion: s.evasion * M,
    attack: {
      name: '白衣鬼爪',
      multiplier: s.attackMultiplier,
      hits: s.attackHits,
      stat: 'fist',
      bleed: true
    },
    skills: ['白衣鬼爪'],
    memory: {},
    confused: false,
    isSpar: true
  };
}

function startWhiteRobeStoryBattle() {
  if (battleActive()) {
    showToast('正在战斗中，先分出胜负吧');
    return;
  }
  prepareStoryBattle();
  battle.enemies = sealFighters('enemy', Array.from({ length: 7 }, (_, i) => makeWhiteRobeEnemy(i)));
  battle.allies = buildAllyTeam(null, true);
  battle.storyBattleId = 'whiteRobe';
  battle.whiteRobe = { heroesJoined: false, xiaRevived: false };
  if (typeof initBattleEvents === 'function') initBattleEvents('');
  initBattleStrategy();
  addLog('【剧情】白衣怪人围攻而上，裴文秀刚要有所动作，却是被天残缠上，两人斗得不可开交，无暇他顾。', '');
  addLog(`【夏扑萤】“${brotherSister()}，我来帮你！”`, '');
  renderBattleStructure();
  updateBattleUI();
  mainView = 'village';
  renderMainTab();
  switchTab('battle');
  battleRunning = true;
  startBattleEngine();
}

/* 白衣怪人事件剧情文本（夏扑萤台词含性别变量，用函数动态生成） */
function buildWhiteRobeEventLines(kind) {
  const bs = brotherSister();
  if (kind === 'heroes') {
    return [
      { speaker: '旁 白', text: '眼看你们渐落下风，远处忽然传来急促的脚步声。' },
      { speaker: '赵 铁 柱', text: '『孩子，撑住！』' },
      { speaker: '旁 白', text: '赵铁柱、赵十二、赵大夫闻声赶来，加入战斗！' },
      { speaker: '旁 白', text: '（赵家村三杰：全属性 ×3，命中率 +10%、闪避率 +5%、虚实莫测 +10、延绵不绝 +10、神宁气静 +10）' }
    ];
  }
  if (kind === 'revive') {
    return [
      { speaker: '旁 白', text: '夏扑萤一个踉跄，重重摔倒在地，白衣怪人围了上去。' },
      { speaker: '夏 扑 萤', text: `『谁！也！别！想！伤害我${bs}！』` },
      { speaker: '旁 白', text: '她挣扎着站了起来，浑身血气翻涌。' },
      { speaker: '旁 白', text: '【振奋】夏扑萤满血复活：造成伤害 +50%，受到伤害 -50%，行动速度 +30%。' }
    ];
  }
  if (kind === 'unyielding') {
    return [
      { speaker: '旁 白', text: '你眼前一黑，几乎要倒下去。' },
      { speaker: '旁 白', text: '但一股不服输的念头撑着你，硬生生又站了起来。' },
      { speaker: '旁 白', text: '【不屈】你重伤倒地，却又凭着一口气硬撑了起来，气血尽复！' }
    ];
  }
  return [];
}

/* 与李乾元事件同一套机制：暂停战斗 → 战斗日志逐字播放剧情 → 点击推进 → 播完执行效果 → 恢复战斗 */
function triggerWhiteRobeEvent(kind, applyFn) {
  battleEventState.active = true;
  pauseBattle();
  playBattleEvent(buildWhiteRobeEventLines(kind), () => {
    if (typeof applyFn === 'function') applyFn();
    if (!battle.over && battleActive()) {
      resumeBattle();
    }
    updateBattleUI();
  });
}

function joinZhaojiaHeroes() {
  const heroes = ['zhaoTiezhu', 'zhaoShip', 'zhaoDaifu']
    .map(makeDreamNpcEnemy)
    .filter(Boolean);
  battle.allies.push(...sealFighters('ally', heroes));
  renderBattleStructure();
}

function reviveXiaWithZhenfen(xia) {
  xia.hp = xia.maxHp;
  xia.speed = (Number(xia.speed) || 0) * 1.3;
  xia.damageDealtMult = 1.5;
  xia.damageTakenMult = 0.5;
}

/* battle.js 在判定失败前调用；返回 true 表示死亡已被剧情处理。
   与李乾元事件一致：命中条件只设标记 + 暂停 + 播剧情，效果在播完后由 applyFn 执行。
   播放期间 battleEventState.active 为 true，挡住重入与死亡判定。 */
function storyBattleInterceptDeath() {
  if (battle.storyBattleId !== 'whiteRobe') return false;
  if (battleEventState.active) return true;
  if (!battle.whiteRobe) battle.whiteRobe = { heroesJoined: false, xiaRevived: false };
  const wr = battle.whiteRobe;
  const pf = playerFighter();
  const xia = (battle.allies || []).find(f => f && f.id === BOND_SPAR_ID);

  if (!wr.heroesJoined &&
      ((pf && pf.hp > 0 && pf.maxHp > 0 && pf.hp <= pf.maxHp * 0.5) ||
       (xia && xia.hp > 0 && xia.maxHp > 0 && xia.hp <= xia.maxHp * 0.5))) {
    wr.heroesJoined = true;
    triggerWhiteRobeEvent('heroes', () => joinZhaojiaHeroes());
    return true;
  }

  if (xia && xia.hp <= 0 && !wr.xiaRevived) {
    wr.xiaRevived = true;
    triggerWhiteRobeEvent('revive', () => reviveXiaWithZhenfen(xia));
    return true;
  }

  if (pf && pf.hp <= 0) {
    triggerWhiteRobeEvent('unyielding', () => { player.hp = player.maxHp; });
    return true;
  }

  return false;
}