/* AI 修改指引：先读 AGENTS.md（文件地图、加载顺序、任务路由）。 */
/* 通用工具与提示见 core.js */
const TOTAL_POINTS = 30;
const alloc = { root: 5, comp: 5, luck: 5 };
let selectedGender = '男';

function remainPoints() {
  return TOTAL_POINTS - (alloc.root + alloc.comp + alloc.luck);
}

function renderAlloc() {
  $('val-root').textContent = alloc.root;
  $('val-comp').textContent = alloc.comp;
  $('val-luck').textContent = alloc.luck;
  const r = remainPoints();
  $('remain').textContent = r;

  document.querySelectorAll('#attrList button').forEach(btn => {
    const attr = btn.dataset.attr;
    const dir = parseInt(btn.dataset.dir);
    if (dir > 0) btn.disabled = r <= 0;
    else btn.disabled = alloc[attr] <= 1;
  });

  const surname = $('surname').value.trim();
  const givenName = $('givenName').value.trim();
  const zi = $('zi').value.trim();
  $('startBtn').disabled = !(surname && givenName && zi && r === 0);
}

document.querySelectorAll('#attrList button').forEach(btn => {
  btn.addEventListener('click', () => {
    const attr = btn.dataset.attr;
    const dir = parseInt(btn.dataset.dir);
    if (dir > 0 && remainPoints() > 0) alloc[attr]++;
    if (dir < 0 && alloc[attr] > 1) alloc[attr]--;
    renderAlloc();
  });
});

document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedGender = btn.dataset.gender;
    document.querySelectorAll('.gender-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
    });
  });
});

$('surname').addEventListener('input', renderAlloc);
$('givenName').addEventListener('input', renderAlloc);
$('zi').addEventListener('input', renderAlloc);
renderAlloc();

const player = {
  surname: '',
  givenName: '',
  zi: '',
  gender: '男',
  root: 5,
  comp: 5,
  luck: 5,
  constitution: 3,
  neiLi: 0,
  fist: 0, blade: 0, sword: 0, changbing: 0, qimen: 0, hidden: 0,
  medicine: 0,
  medicineLessonCount: 0,
  cookCount: 0,
  bonusHpRegen: 0,
  offlineEarnings: true,
  offlineBonusMs: 0,
  offlineBonusPaused: false,
  dream: { cleared: {} },
  teachCd: {},
  maxHp: 0,
  hp: 0,
  speed: 0.15,
  bondXiaPuying: 50,
  bondPeiWenxiu: 0,
  companionId: 'xiaPuying',
  bond: { neiLi: 0, levels: { qingyuan: 12, feishipo: 9, tanafa: 9 }, lastCultAt: 0 },
  skills: [],
  techniques: [],
  inventory: [],
  trainingActivity: '',
  trainingInteractionEfficiency: 0,
  trainingOtherBonus: 1,
  trainingLastTick: 0,
  trainingSelections: { '招式':'zhenshan', '轻功':'', '外功':'qiangshen', '内功':'tanafa' },
  npcLevels: {},
  sparCd: {},
  strategy: {
    enabled: false,
    rounds: [
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 }
    ],
    lowHp: { threshold: 30, skillId: '' },
    allyLowHp: { threshold: 30, skillId: '' }
  },
  bondStrategy: {
    enabled: false,
    rounds: [
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 },
      { skillId: '', maxUses: -1 }
    ],
    lowHp: { threshold: 30, skillId: '' },
    allyLowHp: { threshold: 30, skillId: '' }
  }
};

/* 物品与鱼获数据见 items.js */
/* 背包系统见 bag.js */
/* 武学数值与技能 getter 见 skills.js */
function getFishingTechnique() {
  return (player.techniques || []).find(x => x.id === 'fishing') || null;
}
function getFishingLevel() {
  const skill = getFishingTechnique();
  return skill ? Math.max(0, Number(skill.level) || 0) : 0;
}
function getTechniqueExpNeed(level) {
  const n = Math.max(1, Number(level) || 1);
  const value = Math.pow(125 + 25 * n * (n - 1), 1 + n / 150);
  return Number.isFinite(value) ? value : Number.MAX_VALUE;
}
function getFishingExpNeed(level) {
  return getTechniqueExpNeed(level);
}
function getFishingLuckBonus(level = getFishingLevel()) {
  let bonus = Math.floor(level / 3);
  if (level >= 10) bonus += 1;
  if (level >= 30) bonus += 5;
  if (level >= 70) bonus += 15;
  return bonus;
}
function getTotalLuck() { return (Number(player.luck) || 0) + getFishingLuckBonus(); }

function getFishingExpMultiplier() { return 1 + getTotalLuck() * 0.03; }

function getPaodingExpMultiplier() { return 1 + getTotalComp() * 0.03; }
function getFishingQualityFixed(level = getFishingLevel()) {
  return (level >= 5 ? 10 : 0) + (level >= 20 ? 35 : 0);
}
function getFishingQualityMultiplier(level = getFishingLevel()) {
  return (level >= 10 ? 1.1 : 1) * (level >= 30 ? 1.2 : 1) * (level >= 70 ? 1.5 : 1);
}
function getFishingDuration() {
  const L = getFishingLevel();
  let duration = 25000 / (1 + L / 100);
  if (L >= 30) duration -= 1000;
  if (L >= 50) duration -= 2000;
  return Math.max(1000, duration);
}

function hasChenyuan() {
  return getFishingLevel() >= 125;
}
function getChenyuanSpeedReduction() {
  const L = getFishingLevel();
  return L >= 125 ? L / 100 : 0;
}

function ensureFishingTechnique() {
  if (!Array.isArray(player.techniques)) player.techniques = [];
  let skill = getFishingTechnique();
  if (!skill) {
    skill = { id: 'fishing', name: '渔夫', level: 0, exp: 0 };
    player.techniques.push(skill);
  } else {
    skill.name = '渔夫';
  }
  return skill;
}
function addFishingExp(amount) {
  const skill = getFishingTechnique();
  if (!skill || !(amount > 0)) return 0;
  skill.exp = (Number(skill.exp) || 0) + amount;
  let gainedLevels = 0;
  let guard = 0;
  while (skill.exp >= getFishingExpNeed(skill.level) && guard++ < 1000) {
    skill.exp -= getFishingExpNeed(skill.level);
    skill.level++;
    gainedLevels++;
  }
  if (gainedLevels) updateAttrUI();
  renderTechniques();
  saveGame();
  return amount;
}

function getPaodingTechnique() {
  return (player.techniques || []).find(x => x.id === 'paoding') || null;
}
function getPaodingLevel() {
  const t = getPaodingTechnique();
  return t ? Math.max(0, Number(t.level) || 0) : 0;
}
function ensurePaodingTechnique() {
  if (!Array.isArray(player.techniques)) player.techniques = [];
  let t = getPaodingTechnique();
  if (!t) {
    t = { id: 'paoding', name: '庖丁', level: 0, exp: 0 };
    player.techniques.push(t);
  }
  return t;
}
function getPaodingExpNeed(level) {
  return getTechniqueExpNeed(level);
}
function addPaodingExp(amount) {
  const t = getPaodingTechnique();
  if (!t || !(amount > 0)) return 0;
  t.exp = (Number(t.exp) || 0) + amount;
  let gainedLevels = 0;
  let guard = 0;
  while (t.exp >= getPaodingExpNeed(t.level) && guard++ < 1000) {
    t.exp -= getPaodingExpNeed(t.level);
    t.level++;
    gainedLevels++;
  }
  if (gainedLevels) updateAttrUI();
  renderTechniques();
  saveGame();
  return gainedLevels;
}
/* 庖丁技艺每级刀法 +1；突破节点 +5/+15/+25 为固定值，不吃见微知著 */
function getPaodingBladeBonus() {
  const lv = getPaodingLevel();
  let bonus = lv;
  if (lv >= 10) bonus += 5;
  if (lv >= 25) bonus += 15;
  if (lv >= 50) bonus += 25;
  return bonus;
}
function getTotalBlade() { return player.blade + getPaodingBladeBonus() + getPaodingDaoBladeBonus(); }

/* 庖丁技艺的悟性加成：每 3 级 +1，25/50 级节点 +3/+5。
   庖丁是技艺，不是武功，没有见微知著，因此不乘 getPerLayerMult。 */
function getPaodingCompBonus() {
  const lv = getPaodingLevel();
  let bonus = Math.floor(lv / 3);
  if (lv >= 25) bonus += 3;
  if (lv >= 50) bonus += 5;
  return bonus;
}
function getTotalComp() { return player.comp + getPaodingCompBonus() + getJiusiCompBonus(); }

function getPaodingFixedBonus() {
  const lv = getPaodingLevel();
  let bonus = 0;
  if (lv >= 5) bonus += 10;
  if (lv >= 25) bonus += 30;
  if (lv >= 75) bonus += 100;
  return bonus;
}
function getPaodingQualityMultiplier() {
  const lv = getPaodingLevel();
  let m = 1;
  if (lv >= 10) m += 0.05;
  if (lv >= 50) m += 0.20;
  if (lv >= 75) m += 0.35;
  return m;
}
function getPaodingDoubleChance() {
  const lv = getPaodingLevel();
  return lv >= 50 ? Math.max(0, lv - 20) / 100 : 0;
}
function hasJieniu() {
  return getPaodingLevel() >= 100;
}

/* 钓鱼系统见 fishing.js */
/* 烹饪配方见 items.js */

/* 烹饪系统见 cooking.js */
/* 武功修炼见 training.js */
let lastStudyTickAt = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
setInterval(()=>{
  const studyNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  const studyDt = Math.max(0, (studyNow - lastStudyTickAt) / 1000);
  lastStudyTickAt = studyNow;
  studyTick(studyDt);
  trainingTick();
  bondNeiLiTick();
  bondCultivationTick();
  updateTrainingUI();
  if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
  if (!$('skillTab').classList.contains('hidden')) renderSkills();
  const bt = $('bondTab');
  if (bt && !bt.classList.contains('hidden')) renderBondPanel();
  if (player.surname) saveGame();
},1000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  trainingTick();
  neiLiTick();
  bondNeiLiTick();
  bondCultivationTick();
  updateTrainingUI();
  updateNeiLiDisplays();
  if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
});

/* 内力与活脉见 neili.js */
let storyFinished = false;
let mainView = 'story';
let dialogTimer = null;

function getStoryText() {
  const role = player.gender === '女' ? '养女' : '养子';
  return '你是村中铁匠“赵铁柱”的' + role + '，除了你以外，赵铁柱还收养了一个女儿“夏扑萤”。\n\n' +
         '她很烦人，总是缠着你，“使唤”你去做各种差事，如若不应，便要黏着你撒娇上一整天。';
}

function renderStory() {
  const el = $('storyContent');
  if (!el) return;
  el.innerHTML = '<div class="story-text">' + escapeHtml(getStoryText()) + '</div>';
}

function updateXiaPuyingHomeNpc() {
  const el = $('npcXiaPuyingHome');
  if (!el) return;
  const show = !!storyFlags.xuanlanLearned && !storyFlags.homeTalkDone;
  el.style.display = show ? '' : 'none';
}

/* 不速之客：夏扑萤的玄览家谈结束后出现在家门口 */
function updateBuSuzhikeNpc() {
  const el = $('npcBuSuzhike');
  if (!el) return;
  const show = !!storyFlags.xuanlanLearned && !!storyFlags.homeTalkDone && !storyFlags.peiStoryDone;
  el.style.display = show ? '' : 'none';
}

/* 白衣怪人战后：裴文秀出现在你的家，交谈后解锁启程 */
function updatePeiWenxiuHomeNpc() {
  const el = $('npcPeiWenxiuHome');
  if (!el) return;
  const show = !!storyFlags.peiStoryDone && !storyFlags.peiPostTalkDone && !storyFlags.leftVillage;
  el.style.display = show ? '' : 'none';
}

function updateDepartBtn() {
  const btn = $('departBtn');
  if (!btn) return;
  const show = !!storyFlags.departUnlocked && !storyFlags.leftVillage;
  btn.style.display = show ? '' : 'none';
}

function updateArriveBtn() {
  const btn = $('arriveBtn');
  if (!btn) return;
  const show = !!storyFlags.leftVillage && !storyFlags.arrivedCapital;
  btn.style.display = show ? '' : 'none';
}

function updateMapView() {
  const zj = $('zhaojiaMap');
  const cm = $('carriageMap');
  const cap = $('capitalMap');
  if (zj) zj.style.display = (!storyFlags.leftVillage && !storyFlags.arrivedCapital) ? '' : 'none';
  if (cm) cm.style.display = (storyFlags.leftVillage && !storyFlags.arrivedCapital) ? '' : 'none';
  if (cap) cap.style.display = storyFlags.arrivedCapital ? '' : 'none';
}

function renderMainTab() {
  const sv = $('storyView'), vv = $('villageView'), dv = $('dialogView');
  if (!sv) return;
  sv.style.display = mainView === 'story' ? 'flex' : 'none';
  vv.style.display = mainView === 'village' ? 'flex' : 'none';
  dv.style.display = mainView === 'dialog' ? 'flex' : 'none';
  if (mainView === 'story') renderStory();
  updateMapView();
  updateSidePanel();
  updateTrainingUI();
  updateFishingBtn();
  updateXiaPuyingHomeNpc();
  updateBuSuzhikeNpc();
  updatePeiWenxiuHomeNpc();
  updateDepartBtn();
  updateArriveBtn();
  updateLiQianyuanNpc();
}

function updateSidePanel() {
  const nameEl = $('s-name');
  if (!nameEl) return;
  nameEl.textContent = player.surname + player.givenName;
  $('s-gender').textContent = player.gender;
  $('s-zi').textContent = player.zi || '—';
  $('s-root').textContent = Math.round(getTotalRoot());
  $('s-comp').textContent = Math.round(getTotalComp());
  $('s-luck').textContent = fmtDecimal(getTotalLuck());
  $('s-con').textContent = Math.round(getTotalCon());
  $('s-neili').textContent = fmtNeiLi(getTotalNeiLi());
}

$('storyContinueBtn').addEventListener('click', () => {
  if (storyFinished) return;
  storyFinished = true;
  mainView = 'village';
  saveGame();
  renderMainTab();
});

let currentDialogNode = null;
let waitClickActive = false;

const storyFlags = {
  fishingUnlocked: false,
  firstFishCaught: false,
  cookingUnlocked: false,
  chuilunObtained: false,
  luoyingHint: false,
  luoyingDone: false,
  qingyuanObtained: false,
  liQianyuanUnlocked: false,
  liQianyuanTalked: false,
  liQianyuanDefeated: false,
  xuanlanLearned: false,
  fishRefusedOnce: false,
  fishCookedBond: false,
  fishReviewDone: false,
  huomaiLearned: false,
  homeTalkDone: false,
  peiAskedBreak: false,
  peiAskedLotus: false,
  peiSparWinBond: false,
  peiLeaveBond: false,
  peiStoryDone: false,
  peiPostTalkDone: false,
  departUnlocked: false,
  leftVillage: false,
  arrivedCapital: false,
  farewellTiezhu: false,
  farewellShip: false,
  farewellDaifu: false,
  farewellDaifuJinzhen: false,
  farewellLiQianyuan: false,
  farewellShutong: false,
  farewellShutongExtort: false,
  carriagePeiAboutBond: false,
  carriagePeiLotusBond: false
};

let pendingLuoyingHint = false;

function callName() {
  return player.gender === '女' ? '姐姐' : '哥哥';
}

function brotherSister() {
  return player.gender === '女' ? '姐' : '哥';
}

const dialogTree = window.DIALOG_TREE;

let dialogSkipFn = null;

function typeDialog(text, onDone) {
  const el = $('dialogText');
  const opts = $('dialogOptions');
  el.innerHTML = '';
  opts.classList.remove('show');
  if (dialogTimer) { clearInterval(dialogTimer); dialogTimer = null; }

  dialogSkipFn = () => {
    if (!dialogTimer) return;
    clearInterval(dialogTimer);
    dialogTimer = null;
    el.innerHTML = '';
    text.split('').forEach(ch => {
      if (ch === '\n') { el.appendChild(document.createElement('br')); return; }
      const span = document.createElement('span');
      span.className = 'char-in';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      el.appendChild(span);
    });
    dialogSkipFn = null;
    if (typeof onDone === 'function') onDone();
  };

  let i = 0;
  dialogTimer = setInterval(() => {
    if (i >= text.length) {
      clearInterval(dialogTimer);
      dialogTimer = null;
      dialogSkipFn = null;
      if (typeof onDone === 'function') onDone();
      return;
    }
    const ch = text[i++];
    if (ch === '\n') {
      el.appendChild(document.createElement('br'));
      return;
    }
    const span = document.createElement('span');
    span.className = 'char-in';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
  }, 65);
}

function gainXiaStoryBond(delta) {
  const add = Number(delta) || 0;
  if (!add) return;
  player.bondXiaPuying = Math.max(0, (Number(player.bondXiaPuying) || 0) + add);
  addIntel(`夏扑萤羁绊 ${add > 0 ? '+' : ''}${add}（当前 ${fmtBondStat(getBondValue())}）`, add > 0 ? 'good' : '');
  renderBondPanel();
  saveGame();
  updateAttrUI();
}

/* 裴文秀尚无羁绊面板，先记录数值并写入情报日志；flagKey 用于只发一次 */
function gainPeiStoryBond(delta, flagKey) {
  if (flagKey && storyFlags[flagKey]) return false;
  if (flagKey) storyFlags[flagKey] = true;
  const add = Number(delta) || 0;
  player.bondPeiWenxiu = Math.max(0, (Number(player.bondPeiWenxiu) || 0) + add);
  addIntel(
    `裴文秀羁绊 ${add > 0 ? '+' : ''}${add}（当前 ${Math.round(player.bondPeiWenxiu)}）`,
    add > 0 ? 'good' : ''
  );
  saveGame();
  return true;
}

function showDialogNode(id) {
  waitClickActive = false;
  if (id === 'end') {
    if (pendingLuoyingHint && !storyFlags.luoyingHint) {
      pendingLuoyingHint = false;
      storyFlags.luoyingHint = true;
      addIntel('对岸的桃花林忽然落英纷纷。', 'good');
      updateLuoyingBtn();
      saveGame();
    }
    mainView = 'village';
    renderMainTab();
    return;
  }
  const node = dialogTree[id];
  if (!node) return;

  currentDialogNode = id;
  if (node.setFlag) {
    storyFlags[node.setFlag] = true;
    updateLiQianyuanNpc();
    saveGame();
  }

  /* 夏扑萤试吃烤鱼的剧情只走一次：之后不再因行囊里有烤鱼而出现 */
  if (node.finishFishReview && !storyFlags.fishReviewDone) {
    storyFlags.fishReviewDone = true;
    updateHillNpc();
    saveGame();
  }

  if (node.triggersLuoying && !storyFlags.luoyingHint) pendingLuoyingHint = true;
  if (node.grantQingyuan) grantQingyuan(node.grantQingyuan);
  if (node.bondGain && !storyFlags.fishCookedBond) {
    storyFlags.fishCookedBond = true;
    player.bondXiaPuying = (Number(player.bondXiaPuying) || 0) + node.bondGain;
    addIntel(`她开心地将烤鱼一扫而空。（夏扑萤羁绊 +${node.bondGain}，当前 ${fmtBondStat(getBondValue())}）`, 'good');
    renderBondPanel();
    saveGame();
    updateAttrUI();
  }

  if (node.bondDelta) {
    const delta = Number(node.bondDelta) || 0;
    if (delta) {
      player.bondXiaPuying = Math.max(0, (Number(player.bondXiaPuying) || 0) + delta);
      addIntel(
        `夏扑萤羁绊 ${delta > 0 ? '+' : ''}${delta}（当前 ${fmtBondStat(getBondValue())}）`,
        delta > 0 ? 'good' : (delta < 0 ? 'bad' : '')
      );
      renderBondPanel();
      saveGame();
      updateAttrUI();
    }
  }
  if (node.finishHomeTalk && !storyFlags.homeTalkDone) {
    storyFlags.homeTalkDone = true;
    updateXiaPuyingHomeNpc();
    saveGame();
  }
  const peiBondAlreadyClaimed = !!(node.peiBondDelta && node.peiBondFlag && storyFlags[node.peiBondFlag]);
  if (node.peiBondDelta) {
    gainPeiStoryBond(node.peiBondDelta, node.peiBondFlag);
  }
  if (node.finishPeiStory && !storyFlags.peiStoryDone) {
    storyFlags.peiStoryDone = true;
    updateBuSuzhikeNpc();
    updatePeiWenxiuHomeNpc();
    saveGame();
    addIntel('天残与孟清秋带着莲教众人离去，裴文秀仍在你的身旁。', '');
  }
  if (node.finishPeiPostTalk && !storyFlags.peiPostTalkDone) {
    storyFlags.peiPostTalkDone = true;
    storyFlags.departUnlocked = true;
    updatePeiWenxiuHomeNpc();
    updateDepartBtn();
    updateLiQianyuanNpc();
    saveGame();
    addIntel('你们商定启程前往京城，离开赵家村前可先向村民们道别。', 'good');
  }
  if (node.farewellEffect) {
    applyFarewellEffect(node.farewellEffect);
  }

  if (node.unlockFishing && !storyFlags.fishingUnlocked) {
    storyFlags.fishingUnlocked = true;
    ensureFishingTechnique();
    saveGame();
    renderTechniques();
  }
  if (node.consumeFish) {
    consumeBestCookedFish();
  }
  if (node.unlockCooking && !storyFlags.cookingUnlocked) {
    storyFlags.cookingUnlocked = true;
    ensurePaodingTechnique();
    saveGame();
    renderTechniques();
    updateHillNpc();
  }
  updateFishingBtn();

  mainView = 'dialog';
  renderMainTab();
  $('dialogSpeaker').textContent = node.speaker || '夏 扑 萤';

  const allOptions = Array.isArray(node.options) ? node.options : [];
  const visibleOptions = allOptions
    .map((o, idx) => ({ o, idx }))
    .filter(({ o }) => typeof o.hide !== 'function' || !o.hide());
  const hasOptions = visibleOptions.length > 0;
  const optsEl = $('dialogOptions');

  if (hasOptions) {
    optsEl.innerHTML = visibleOptions.map(({ o, idx }) =>
      `<button class="dialog-opt${o.scene ? ' scene' : ''}" type="button" data-idx="${idx}">${escapeHtml(o.label)}</button>`
    ).join('');
  } else {
    optsEl.innerHTML = '';
  }

  const rawText = typeof node.text === 'function' ? node.text() : node.text;
  const split = splitDialogNotices(rawText);
  const text = split.display;
  const notices = peiBondAlreadyClaimed
    ? split.notices.filter(n => !n.includes('裴文秀羁绊'))
    : split.notices;
  if (node.grantItem && !storyFlags.chuilunObtained) {
    addItem(node.grantItem, 1);
    storyFlags.chuilunObtained = true;
    saveGame();
  }
  typeDialog(text, () => {
    if (hasOptions) {
      optsEl.classList.add('show');
    } else {
      waitClickActive = true;
      optsEl.innerHTML = `<div style="width:100%;text-align:center;color:#8a897c;font-size:calc(12px * var(--font-scale, 1.1));letter-spacing:3px;padding:8px 0;opacity:.75">— 点击继续 —</div>`;
      optsEl.classList.add('show');
    }
    if (notices.length) showToastSequence(notices);
  });
}

function getBestCookedFish() {
  let best = null;
  (player.inventory || []).forEach((slot, idx) => {
    if (slot.id !== 'kaoyu' || !slot.data) return;
    const q = Number(slot.data.quality) || 0;
    if (!best || q > best.quality) {
      best = { slot, idx, quality: q };
    }
  });
  return best;
}

function consumeBestCookedFish() {
  const best = getBestCookedFish();
  if (!best) return null;
  const idx = best.idx;
  const slot = player.inventory[idx];
  if (!slot) return null;
  const data = slot.data;
  slot.qty -= 1;
  if (slot.qty <= 0) player.inventory.splice(idx, 1);
  renderBag();
  saveGame();
  return data;
}

function openFishReviewDialog() {
  const best = getBestCookedFish();
  if (!best) return;
  const q = best.quality;
  if (q <= 20) showDialogNode('fishBurnt');
  else if (q <= 50) showDialogNode('fishHalf');
  else showDialogNode('fishCooked');
}

function fishReviewFinished() {
  /* fishReviewDone 为新增标记；旧存档靠 chuilunObtained / luoyingDone 兜底 */
  return !!(storyFlags.fishReviewDone || storyFlags.chuilunObtained || storyFlags.luoyingDone);
}

function updateHillNpc() {
  const hillNpc = $('npcXiaPuyingHill');
  if (hillNpc) {
    const hasCookedFish = (player.inventory || []).some(s => s.id === 'kaoyu' && s.qty > 0);
    const showFirst = storyFlags.firstFishCaught && !storyFlags.cookingUnlocked;
    const showReview = storyFlags.cookingUnlocked && !fishReviewFinished() && hasCookedFish;
    hillNpc.style.display = (showFirst || showReview) ? '' : 'none';
  }
  const cookBtn = $('cookingOpenBtn');
  if (cookBtn) {
    cookBtn.style.display = storyFlags.cookingUnlocked ? '' : 'none';
  }
  updateLuoyingBtn();
}

function updateLuoyingBtn() {
  const btn = $('luoyingBtn');
  if (!btn) return;
  btn.style.display = (storyFlags.luoyingHint && !storyFlags.luoyingDone) ? '' : 'none';
}

function grantQingyuan(opts = {}) {
  let skill = getQingyuanSkill();
  /* 本次领悟前是否已学会：已学会时不再提示领悟，且奖励经验翻倍 */
  const alreadyKnown = !!skill;
  storyFlags.qingyuanAlreadyKnown = alreadyKnown;
  if (!skill) {
    skill = { id: 'qingyuan', name: '青鸢飞纵', type: '轻功', level: 1, exp: 0 };
    player.skills.push(skill);
  }
  const exp = alreadyKnown ? (Number(opts.exp) || 0) * 2 : (Number(opts.exp) || 0);
  const bond = Number(opts.bond) || 0;

  if (!storyFlags.qingyuanObtained) {
    storyFlags.qingyuanObtained = true;
    if (!alreadyKnown) addIntel('你自夏扑萤的步法中领会了轻功【青鸢飞纵】。', 'good');
  }
  if (exp > 0) addSkillExp(skill, exp);
  if (bond > 0) {
    player.bondXiaPuying = (Number(player.bondXiaPuying) || 0) + bond;
    addIntel(`她抱着你飞掠了一路，笑得眼睛都弯了。（夏扑萤羁绊 +${bond}，当前 ${fmtBondStat(getBondValue())}）`, 'good');
    renderBondPanel();
  }

  storyFlags.luoyingDone = true;

  if (!storyFlags.liQianyuanUnlocked) {
    storyFlags.liQianyuanUnlocked = true;
  }
  updateLiQianyuanNpc();
  updateShutongNpc();
  if (player.trainingSelections && typeof player.trainingSelections === 'object') {
    if (!player.trainingSelections['轻功']) player.trainingSelections['轻功'] = 'qingyuan';
  }

  saveGame();
  renderIntel();
  renderSkills();
  updateAttrUI();
  updateSidePanel();
  updateHillNpc();
  updateLuoyingBtn();
}

function updateFishingBtn() {
  const npc = $('npcXiaPuying');
  if (npc) npc.style.display = storyFlags.fishingUnlocked ? 'none' : '';
  const b = $('fishingBtn');
  if (b) {
    b.style.display = storyFlags.fishingUnlocked ? '' : 'none';
    if (!fishing.running) resetFishingBtn();
  }
  updateHillNpc();
}

function openDialog() {
  if (storyFlags.fishingUnlocked) return;
  showDialogNode(storyFlags.fishRefusedOnce ? 'refuseRetry' : 'start');
}

$('npcXiaPuying').addEventListener('click', openDialog);

const buSuzhikeEl = $('npcBuSuzhike');
if (buSuzhikeEl) {
  buSuzhikeEl.addEventListener('click', () => {
    if (!storyFlags.xuanlanLearned || !storyFlags.homeTalkDone || storyFlags.peiStoryDone) return;
    showDialogNode('peiArrive');
  });
}

const hillNpcEl = $('npcXiaPuyingHill');
if (hillNpcEl) {
  hillNpcEl.addEventListener('click', () => {
    if (!storyFlags.cookingUnlocked) {
      showDialogNode('cookingStart');
      return;
    }
    if (fishReviewFinished()) return;
    openFishReviewDialog();
  });
}

const luoyingBtnEl = $('luoyingBtn');
if (luoyingBtnEl) {
  luoyingBtnEl.addEventListener('click', () => {
    if (!storyFlags.luoyingHint || storyFlags.luoyingDone) return;
    showDialogNode('luoyingStart');
  });
}

$('dialogOptions').addEventListener('click', (e) => {
  const btn = e.target.closest('.dialog-opt');
  if (!btn) return;
  const optsEl = $('dialogOptions');
  /* 打字未结束时选项只是透明占位：此时点击当作“跳过打字”，
     不要提前清掉打字定时器并触发战斗等动作，否则冷却拦截后对话会卡死 */
  if (!optsEl.classList.contains('show')) {
    if (dialogSkipFn) dialogSkipFn();
    return;
  }
  const node = dialogTree[currentDialogNode];
  if (!node) return;
  const opt = node.options[Number(btn.dataset.idx)];
  if (!opt) return;
  if (dialogTimer) { clearInterval(dialogTimer); dialogTimer = null; }
  if (typeof opt.onSelect === 'function') opt.onSelect();
  if (opt.action === 'spar') { startSpar(opt.npc); return; }
  if (opt.action === 'peiSpar') { startPeiWenxiuStoryBattle(); return; }
  if (opt.action === 'teachMedicine') { startMedicineLesson(); return; }
  if (opt.action === 'leave' || !opt.next) { showDialogNode('end'); return; }
  showDialogNode(opt.next);
});

$('dialogView').addEventListener('click', (e) => {
  if (e.target.closest('.dialog-opt')) return;
  if (dialogSkipFn) { dialogSkipFn(); return; }
  if (waitClickActive) {
    waitClickActive = false;
    const node = dialogTree[currentDialogNode] || {};
    if (node.battleOnNext === 'whiteRobe') { startWhiteRobeStoryBattle(); return; }
    if (node.nextOnClick) { showDialogNode(node.nextOnClick); return; }
    showDialogNode('end');
  }
});

const npcTiezhuEl = $('npcZhaoTiezhu');
if (npcTiezhuEl) npcTiezhuEl.addEventListener('click', () => showDialogNode('npcTiezhu'));
const npcShipEl = $('npcZhaoShip');
if (npcShipEl) npcShipEl.addEventListener('click', () => showDialogNode('npcShip'));
const npcDaifuEl = $('npcZhaoDaifu');
if (npcDaifuEl) npcDaifuEl.addEventListener('click', () => showDialogNode('npcDaifu'));

/* 李乾元：已领悟玄览通微后暂时隐藏；启程解锁后在离开赵家村前可回书院道别 */
function updateLiQianyuanNpc() {
  const el = $('npcLiQianyuan');
  if (!el) return;
  const visible = !storyFlags.leftVillage && ((storyFlags.liQianyuanUnlocked && !storyFlags.xuanlanLearned) || !!storyFlags.departUnlocked);
  el.style.display = visible ? '' : 'none';
}
const npcLiQianyuanEl = $('npcLiQianyuan');
if (npcLiQianyuanEl) {
  npcLiQianyuanEl.addEventListener('click', () => {
    if (storyFlags.leftVillage) return;
    if (storyFlags.departUnlocked) {
      showDialogNode('npcLiQianyuan');
      return;
    }
    if (!storyFlags.liQianyuanUnlocked || storyFlags.xuanlanLearned) return;
    if (storyFlags.liQianyuanTalked && storyFlags.liQianyuanDefeated) {
      showDialogNode('lqAfterWin');
      return;
    }
    showDialogNode(storyFlags.liQianyuanTalked ? 'npcLiQianyuan' : 'lqStart');
  });
}
updateLiQianyuanNpc();

function applyFarewellEffect(kind) {
  if (kind === 'tiezhu' && !storyFlags.farewellTiezhu) {
    storyFlags.farewellTiezhu = true;
    player.root = (Number(player.root) || 0) + 2;
    player.bonusHpRegen = (Number(player.bonusHpRegen) || 0) + 10;
    addIntel('向赵铁柱道别，获赠温养气血的玉佩（根骨 +2，气血恢复 +10）。', 'good');
    updateAttrUI();
    saveGame();
    return;
  }
  if (kind === 'ship' && !storyFlags.farewellShip) {
    storyFlags.farewellShip = true;
    player.neiLi = (Number(player.neiLi) || 0) + 30;
    addIntel('向赵十二道别，获赠蛇胆酒（内力 +30）。', 'good');
    updateAttrUI();
    updateNeiLiDisplays();
    saveGame();
    return;
  }
  if (kind === 'daifu' && !storyFlags.farewellDaifu) {
    storyFlags.farewellDaifu = true;
    player.luck = (Number(player.luck) || 0) + 1;
    player.medicine = (Number(player.medicine) || 0) + 20;
    if (!hasJinzhenTechnique()) {
      storyFlags.farewellDaifuJinzhen = true;
      learnJinzhenTechnique();
      addIntel('向赵大夫道别，聆听最后一次教诲（定力 +1，医术 +20，学会金针渡穴）。', 'good');
    } else {
      storyFlags.farewellDaifuJinzhen = false;
      addIntel('向赵大夫道别，聆听最后一次教诲（定力 +1，医术 +20）。', 'good');
    }
    updateAttrUI();
    saveGame();
    return;
  }
  if (kind === 'liQianyuan' && !storyFlags.farewellLiQianyuan) {
    storyFlags.farewellLiQianyuan = true;
    player.comp = (Number(player.comp) || 0) + 3;
    player.luck = (Number(player.luck) || 0) + 1;
    addIntel('向李乾元道别，获益良多（悟性 +3，定力 +1）。', 'good');
    updateAttrUI();
    saveGame();
    return;
  }
  if (kind === 'shutong' && !storyFlags.farewellShutong) {
    storyFlags.farewellShutong = true;
    addItem('wuxueXinde', 1);
    renderBag();
    addIntel('向书童“道别”，得到了一本【武学心得】。', 'good');
    saveGame();
    return;
  }
  if (kind === 'shutongExtort' && !storyFlags.farewellShutongExtort) {
    storyFlags.farewellShutongExtort = true;
    addItem('wuxueXinde', 1);
    renderBag();
    addIntel('再次向书童勒索，又得到了一本【武学心得】。', 'good');
    saveGame();
  }
}

function openDepartModal() {
  if (!storyFlags.departUnlocked || storyFlags.leftVillage) return;
  const modal = $('departModal');
  if (modal) modal.classList.add('show');
}

function closeDepartModal() {
  const modal = $('departModal');
  if (modal) modal.classList.remove('show');
}

function confirmDepart() {
  closeDepartModal();
  if (!storyFlags.departUnlocked || storyFlags.leftVillage) return;
  storyFlags.leftVillage = true;
  if (typeof cancelFishing === 'function') cancelFishing();
  if (typeof cookingState !== 'undefined' && cookingState && cookingState.running) {
    cookingState.running = false;
    cookingState.selected = {};
    cookingState.pending = [];
    const ov = $('cookingOverlay');
    if (ov) ov.classList.remove('show');
  }
  if (player.trainingActivity && player.trainingActivity !== 'internal') {
    stopTraining();
  }
  updateMapView();
  updateDepartBtn();
  updateArriveBtn();
  updatePeiWenxiuHomeNpc();
  updateLiQianyuanNpc();
  updateTrainingUI();
  saveGame();
  addIntel('你与夏扑萤、裴文秀乘上马车，离开赵家村前往京城。', 'good');
  showToast('已启程离开赵家村，前往京城');
}

function openArriveModal() {
  if (!storyFlags.leftVillage || storyFlags.arrivedCapital) return;
  const modal = $('arriveModal');
  if (modal) modal.classList.add('show');
}

function closeArriveModal() {
  const modal = $('arriveModal');
  if (modal) modal.classList.remove('show');
}

function confirmArrive() {
  closeArriveModal();
  if (!storyFlags.leftVillage || storyFlags.arrivedCapital) return;
  storyFlags.arrivedCapital = true;
  storyFlags.fishingUnlocked = true;
  storyFlags.cookingUnlocked = true;
  ensureFishingTechnique();
  ensurePaodingTechnique();
  if (typeof cancelFishing === 'function') cancelFishing();
  if (typeof cookingState !== 'undefined' && cookingState && cookingState.running) {
    cookingState.running = false;
    cookingState.selected = {};
    cookingState.pending = [];
    const ov = $('cookingOverlay');
    if (ov) ov.classList.remove('show');
  }
  if (player.trainingActivity && !['capitalInternal', 'stoneLock', 'waterPlum', 'sparPractice'].includes(player.trainingActivity)) {
    stopTraining();
  }
  updateMapView();
  updateArriveBtn();
  updateFishingBtn();
  updateTrainingUI();
  renderTechniques();
  saveGame();
  addIntel('马车驶入朱雀长街，你们终于抵达京城，暂居于裴文秀寻得的一处清净小宅。', 'good');
  showToast('已抵达京城');
}

const npcPeiWenxiuHomeEl = $('npcPeiWenxiuHome');
if (npcPeiWenxiuHomeEl) {
  npcPeiWenxiuHomeEl.addEventListener('click', () => {
    if (!storyFlags.peiStoryDone || storyFlags.peiPostTalkDone || storyFlags.leftVillage) return;
    showDialogNode('peiPostStart');
  });
}

const departBtnEl = $('departBtn');
if (departBtnEl) {
  departBtnEl.addEventListener('click', openDepartModal);
}
const departConfirmBtnEl = $('departConfirmBtn');
if (departConfirmBtnEl) {
  departConfirmBtnEl.addEventListener('click', confirmDepart);
}
const departCancelBtnEl = $('departCancelBtn');
if (departCancelBtnEl) {
  departCancelBtnEl.addEventListener('click', closeDepartModal);
}
const departModalEl = $('departModal');
if (departModalEl) {
  departModalEl.addEventListener('click', (e) => {
    if (e.target === departModalEl) closeDepartModal();
  });
}

const arriveBtnEl = $('arriveBtn');
if (arriveBtnEl) {
  arriveBtnEl.addEventListener('click', openArriveModal);
}
const arriveConfirmBtnEl = $('arriveConfirmBtn');
if (arriveConfirmBtnEl) {
  arriveConfirmBtnEl.addEventListener('click', confirmArrive);
}
const arriveCancelBtnEl = $('arriveCancelBtn');
if (arriveCancelBtnEl) {
  arriveCancelBtnEl.addEventListener('click', closeArriveModal);
}
const arriveModalEl = $('arriveModal');
if (arriveModalEl) {
  arriveModalEl.addEventListener('click', (e) => {
    if (e.target === arriveModalEl) closeArriveModal();
  });
}

const npcXiaPuyingCarriageEl = $('npcXiaPuyingCarriage');
if (npcXiaPuyingCarriageEl) {
  npcXiaPuyingCarriageEl.addEventListener('click', () => {
    if (!storyFlags.leftVillage || storyFlags.arrivedCapital) return;
    showDialogNode('carriageXia');
  });
}
const npcPeiWenxiuCarriageEl = $('npcPeiWenxiuCarriage');
if (npcPeiWenxiuCarriageEl) {
  npcPeiWenxiuCarriageEl.addEventListener('click', () => {
    if (!storyFlags.leftVillage || storyFlags.arrivedCapital) return;
    showDialogNode('carriagePei');
  });
}

const npcXiaPuyingHomeEl = $('npcXiaPuyingHome');
if (npcXiaPuyingHomeEl) {
  npcXiaPuyingHomeEl.addEventListener('click', () => {
    if (!storyFlags.xuanlanLearned || storyFlags.homeTalkDone) return;
    showDialogNode('homeXuanlanIntro');
  });
}

/* 玄览通微：只作为剧情领悟标记，不占武功栏；领悟后李乾元选项永久消失 */
function learnXuanlan() {
  if (storyFlags.xuanlanLearned) return;
  storyFlags.xuanlanLearned = true;
  lastStudyTickAt = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  updateLiQianyuanNpc();
  updateXiaPuyingHomeNpc();
  saveGame();
  renderSkills();
  updateSkillStudyBtn();
  showToastSequence(['你领悟了《玄览通微》', '你可以钻研一门武功，以此来提升它的修炼速度，增加修炼收益']);
}

function updateShutongNpc() {
  const el = $('npcShutong');
  if (!el) return;
  el.style.display = storyFlags.liQianyuanUnlocked ? '' : 'none';
}
const npcShutongEl = $('npcShutong');
if (npcShutongEl) {
  npcShutongEl.addEventListener('click', () => {
    if (!storyFlags.liQianyuanUnlocked) return;
    showDialogNode('npcShutong');
  });
}
updateShutongNpc();

const fishingBtnEl = $('fishingBtn');
if (fishingBtnEl) {
  fishingBtnEl.addEventListener('click', () => {
    if (!storyFlags.fishingUnlocked) return;
    startFishing();
  });
}
const capitalFishingBtnEl = $('capitalFishingBtn');
if (capitalFishingBtnEl) {
  capitalFishingBtnEl.addEventListener('click', () => {
    if (!storyFlags.arrivedCapital) return;
    startFishing();
  });
}

let lastMedicineLessonExp = 0;

function getMedicineLessonCount() {
  const n = Number(player.medicineLessonCount);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function getJinzhenTechnique() {
  return (player.techniques || []).find(t => t && t.id === 'jinzhen') || null;
}

function hasJinzhenTechnique() {
  return !!getJinzhenTechnique();
}

function learnJinzhenTechnique() {
  if (!Array.isArray(player.techniques)) player.techniques = [];
  if (hasJinzhenTechnique()) return getJinzhenTechnique();
  const tech = { id: 'jinzhen', name: '金针渡穴', type: '特技' };
  player.techniques.push(tech);
  addIntel('你学会了特技【金针渡穴】。', 'good');
  renderCombatTechniques();
  saveGame();
  return tech;
}

function startMedicineLesson() {
  const npcId = 'zhaoDaifu';
  const cdLeft = getTeachCdLeft(npcId);
  if (cdLeft > 0) {
    showToast(`刚请教过医术呢，过${Math.ceil(cdLeft / 1000)}s再来吧`, 1000);
    return;
  }
  if (!player.teachCd || typeof player.teachCd !== 'object') player.teachCd = {};
  player.teachCd[npcId] = Date.now() + TEACH_CD_MS;

  player.medicineLessonCount = getMedicineLessonCount() + 1;
  const isTenthLesson = player.medicineLessonCount >= 10;
  if (isTenthLesson) learnJinzhenTechnique();

  player.medicine = (Number(player.medicine) || 0) + 5;
  if (!Array.isArray(player.skills)) player.skills = [];
  const firstLesson = !getHuomaiSkill();
  if (firstLesson) {
    player.skills.push({ id: 'huomai', name: '活脉养络法', type: '内功', level: 1, exp: 0 });
    if (!player.trainingSelections || typeof player.trainingSelections !== 'object') player.trainingSelections = {};
    if (!player.trainingSelections['内功']) player.trainingSelections['内功'] = 'huomai';
    addIntel('你向赵大夫请教医术，学会了内功【活脉养络法】。', 'good');
    renderSkills();
  }
  storyFlags.huomaiLearned = true;

  /* 请教医术额外获得医术×10 的活脉养络法经验 */
  const huomaiSkill = getHuomaiSkill();
  lastMedicineLessonExp = huomaiSkill ? Math.max(0, Math.round(getTotalMedicine() * 10)) : 0;
  if (huomaiSkill && lastMedicineLessonExp > 0) {
    addSkillExp(huomaiSkill, lastMedicineLessonExp);
    addIntel(`你向赵大夫请教医术，【活脉养络法】获得 ${lastMedicineLessonExp} 点经验。`, 'good');
  }

  updateAttrUI();
  saveGame();
  showDialogNode(firstLesson ? 'npcDaifuTeachFirst' : (isTenthLesson ? 'npcDaifuTeachTenth' : 'npcDaifuTeachRepeat'));
}

/* makeSparEnemy / getActiveTrainingSkills 见 battle.js */
/* ================= 羁绊系统 ================= */

const BOND_CHAR = {
  id: 'xiaPuying',
  name: '夏扑萤',
  root: 12,
  comp: 20,
  luck: 16,
  con: 25,
  neiLiBase: 35,
  speed: 0.2,
  fist: 20,
  blade: 20,
  sword: 20,
  changbing: 20,
  qimen: 20,
  hiddenBase: 45
};
const BOND_SKILL_DEFAULT = { qingyuan: 12, feishipo: 10, tanafa: 10 };
const BOND_SKILL_NAMES = { qingyuan: '青鸢飞纵', feishipo: '飞石破', tanafa: '淬火呼吸法' };
const BOND_SKILL_ORDER = ['qingyuan', 'feishipo', 'tanafa'];
/* 请教时教给玩家的招式名与分类（与玩家原有招式命名保持一致） */
const BOND_SKILL_TEACH = {
  qingyuan: { name: '青鸢飞纵', type: '轻功', select: '轻功' },
  feishipo: { name: '飞石破', type: '暗器', select: '招式' },
  tanafa: { name: '淬火呼吸法', type: '内功', select: '内功' }
};

const BOND_SKILL_STARS = { qingyuan: 2, feishipo: 1, tanafa: 0 };
const BOND_TENDENCY_BONUS_PER_STAR = 0.2;
/* 向羁绊角色请教：1200 秒冷却 */
const BOND_TEACH_CD_MS = 1200 * 1000;
const BOND_TEACH_ID = 'xiaPuyingTeach';
/* 指点羁绊角色武功：1200 秒冷却 */
const BOND_GUIDE_CD_MS = 1200 * 1000;
const BOND_GUIDE_ID = 'xiaPuyingGuide';
const BOND_SKILL_MAX_LEVEL = 100;
const BOND_CULT_INTERVAL_MS = 60 * 60 * 1000;
const BOND_STAT_GROW_INTERVAL_MS = 2 * 60 * 60 * 1000;
const BOND_SPAR_ID = 'xiaPuying';
/* 羁绊角色每两个时辰自行增长 5% 的根骨/悟性/定力（最小 1） */
const BOND_GROWTH_KEYS = ['root', 'comp', 'luck'];
const BOND_GROWTH_RATIO = 0.05;

function getBondValue() {
  return Math.max(0, Number(player.bondXiaPuying) || 0);
}

function ensureBondChar() {
  if (!player.bond || typeof player.bond !== 'object') player.bond = {};
  const nei = Number(player.bond.neiLi);
  if (!Number.isFinite(nei) || nei < 0) player.bond.neiLi = 0;
  if (!player.bond.levels || typeof player.bond.levels !== 'object') player.bond.levels = {};
  BOND_SKILL_ORDER.forEach(k => {
    const v = Number(player.bond.levels[k]);
    player.bond.levels[k] = Number.isFinite(v) && v > 0 ? v : BOND_SKILL_DEFAULT[k];
  });
  /* 玩家传授的额外武功：只保留有效的正数重数 */
  Object.keys(player.bond.levels).forEach(k => {
    if (BOND_SKILL_ORDER.includes(k)) return;
    const v = Number(player.bond.levels[k]);
    if (!Number.isFinite(v) || v <= 0) delete player.bond.levels[k];
    else player.bond.levels[k] = Math.floor(v);
  });
  if (!player.bond.strategyWeights || typeof player.bond.strategyWeights !== 'object') {
    player.bond.strategyWeights = {};
  }
  Object.keys(player.bond.strategyWeights).forEach(k => {
    const w = Number(player.bond.strategyWeights[k]);
    player.bond.strategyWeights[k] = Number.isFinite(w) && w >= 0 ? w : 1;
  });
  if (!player.bond.growth || typeof player.bond.growth !== 'object') player.bond.growth = { root: 0, comp: 0, luck: 0 };
  BOND_GROWTH_KEYS.forEach(k => {
    const v = Number(player.bond.growth[k]);
    player.bond.growth[k] = Number.isFinite(v) && v > 0 ? v : 0;
  });
  const cult = Number(player.bond.lastCultAt);
  if (!Number.isFinite(cult) || cult <= 0) player.bond.lastCultAt = Date.now();
  const growAt = Number(player.bond.lastGrowthAt);
  if (!Number.isFinite(growAt) || growAt <= 0) player.bond.lastGrowthAt = Date.now();
  return player.bond;
}

function getBondSkillName(id) {
  const key = String(id);
  if (BOND_SKILL_NAMES[key]) return BOND_SKILL_NAMES[key];
  if (BOND_SKILL_TEACH[key] && BOND_SKILL_TEACH[key].name) return BOND_SKILL_TEACH[key].name;
  const mine = (Array.isArray(player.skills) ? player.skills : []).find(s => s && s.id === key);
  if (mine && mine.name) return mine.name;
  return key;
}

/* 夏扑萤已学会的武功：原始三门 + 玩家传授的额外武功 */
function getBondKnownSkillIds() {
  const b = ensureBondChar();
  const extra = Object.keys(b.levels).filter(id =>
    !BOND_SKILL_ORDER.includes(id) && (Number(b.levels[id]) || 0) > 0
  );
  return BOND_SKILL_ORDER.concat(extra);
}

function resetBondChar() {
  player.bond = {
    neiLi: 0,
    levels: { qingyuan: BOND_SKILL_DEFAULT.qingyuan, feishipo: BOND_SKILL_DEFAULT.feishipo, tanafa: BOND_SKILL_DEFAULT.tanafa },
    growth: { root: 0, comp: 0, luck: 0 },
    lastCultAt: Date.now(),
    lastGrowthAt: Date.now()
  };
  return player.bond;
}

function getBondGrowth() {
  return ensureBondChar().growth;
}
function getBondRoot() { return BOND_CHAR.root + getBondGrowth().root + getBondExtraMartialStats().root; }
function getBondComp() { return BOND_CHAR.comp + getBondGrowth().comp + getBondExtraMartialStats().comp; }
function getBondLuck() { return BOND_CHAR.luck + getBondGrowth().luck + getBondExtraMartialStats().luck; }

/* 50 羁绊解锁：夏扑萤体魄 += 青鸢飞纵重数 */
function getBondCon() {
  const base = Number(BOND_CHAR.con) || 0;
  const b = ensureBondChar();
  const qyCon = getBondValue() >= 50 ? (Number(b.levels.qingyuan) || 0) : 0;
  const ex = getBondExtraMartialStats();
  return (base + qyCon + ex.con) * ex.conMult;
}

/* 按小时推进一次成长；返回该次增长量 */
function growBondStats(hours = 1) {
  const g = getBondGrowth();
  const base = { root: BOND_CHAR.root + g.root, comp: BOND_CHAR.comp + g.comp, luck: BOND_CHAR.luck + g.luck };
  const gains = { root: 0, comp: 0, luck: 0 };
  for (let h = 0; h < Math.max(0, hours); h++) {
    BOND_GROWTH_KEYS.forEach(k => {
      const cur = base[k] - gains[k];
      const add = Math.max(1, cur * BOND_GROWTH_RATIO);
      gains[k] += add;
      g[k] += add;
    });
  }
  return gains;
}

function getBondNeiLi() {
  const b = ensureBondChar();
  return BOND_CHAR.neiLiBase + (Number(b.neiLi) || 0) + getBondNeiLiBonus() + getBondExtraMartialStats().neili;
}

function getBondNeiLiBonus() {
  const lv = ensureBondChar().levels.tanafa;
  let bonus = 0;
  if (lv >= 10) bonus += 10;
  if (lv >= 50) bonus += 500;
  if (lv >= 100) bonus += 2000;
  return bonus;
}

function getBondNeiLiRatePerMin() {
  const b = ensureBondChar();
  let perMin = calcNeiLiRate(b.levels.tanafa, getBondLuck());
  const huomaiLv = Math.floor(Number(b.levels.huomai) || 0);
  if (huomaiLv > 0 && typeof HUOMAI_RATE_BASE === 'number' && typeof HUOMAI_RATE_PER_LEVEL === 'number') {
    perMin += (HUOMAI_RATE_BASE + (huomaiLv - 1) * HUOMAI_RATE_PER_LEVEL) * (1 + Math.max(0, getBondLuck()) * 0.025);
  }
  return perMin * (1 + getBondValue() / 500);
}

function getBondSpeed() {
  const b = ensureBondChar();
  const lv = b.levels.qingyuan;
  return BOND_CHAR.speed + lv * 0.02 + getQingyuanSpeedBonus(lv) + getBondExtraMartialStats().speed;
}

/* 夏扑萤自身的暗器（不含玩家羁绊反哺） */
function getBondOwnHidden() {
  const b = ensureBondChar();
  return BOND_CHAR.hiddenBase + getFeishipoHiddenBonus(b.levels.feishipo, false);
}

/* 夏扑萤的最终暗器：20 羁绊起，额外 + 玩家总暗器/10 */
function getBondHidden() {
  let hidden = getBondOwnHidden();
  if (getBondValue() >= 20) {
    hidden += getTotalHidden() / 10;
  }
  return hidden;
}

/* ================= 羁绊角色修炼：未满百重优先 + 倾向/难度加权 ================= */
function getBondSkillStrategyWeight(id) {
  const w = Number((ensureBondChar().strategyWeights || {})[id]);
  return Number.isFinite(w) && w >= 0 ? w : 1;
}

function getBondSkillWeight(id) {
  const stars = Number(BOND_SKILL_STARS[id]) || 0;
  const diff = Number(SKILL_DIFFICULTY[id]);
  const base = stars * BOND_TENDENCY_BONUS_PER_STAR + (Number.isFinite(diff) ? diff : SKILL_DEFAULT_DIFFICULTY);
  return Math.max(0, base) * getBondSkillStrategyWeight(id);
}

/* 有未满百重的武功时只在其中挑选；全部未满或全部满百重时按权重随机。全部权重为 0 时返回 null。 */
function rollBondTrainingSkillId() {
  const b = ensureBondChar();
  const known = getBondKnownSkillIds();
  const under = known.filter(id => (Number(b.levels[id]) || 0) < BOND_SKILL_MAX_LEVEL);
  const pool = (under.length === known.length || under.length === 0)
    ? known
    : under;
  const weighted = pool
    .map(id => ({ id, weight: getBondSkillWeight(id) }))
    .filter(o => o.weight > 0);
  if (!weighted.length) return null;
  const total = weighted.reduce((a, o) => a + o.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < weighted.length; i++) {
    roll -= weighted[i].weight;
    if (roll < 0) return weighted[i].id;
  }
  return weighted[weighted.length - 1].id;
}

let lastBondNeiLiTime = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();

function bondNeiLiTick() {
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  const dt = Math.max(0, (now - lastBondNeiLiTime) / 1000);
  lastBondNeiLiTime = now;
  if (!player.surname) return;
  const b = ensureBondChar();
  const rate = getBondNeiLiRatePerMin() / 60;
  if (rate > 0) b.neiLi += rate * dt;
}

function bondCultivationTick() {
  if (!player.surname) return false;
  const b = ensureBondChar();
  const now = Date.now();
  let hours = Math.floor((now - b.lastCultAt) / BOND_CULT_INTERVAL_MS);
  if (hours < 0) hours = 0;
  if (hours > 24) {
    hours = 24;
    b.lastCultAt = now;
  } else if (hours > 0) {
    b.lastCultAt += hours * BOND_CULT_INTERVAL_MS;
  }

  const perHour = 1 + (getBondRoot() + getBondComp()) * (1 + getBondValue() / 500) / 50;
  const gains = {};
  let total = 0;
  for (let h = 0; h < hours; h++) {
    const base = Math.floor(perHour);
    let count = base + (Math.random() < (perHour - base) ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const id = rollBondTrainingSkillId();
      if (!id) break;
      b.levels[id] += 1;
      gains[id] = (gains[id] || 0) + 1;
      total++;
    }
  }

  let statTicks = Math.floor((now - b.lastGrowthAt) / BOND_STAT_GROW_INTERVAL_MS);
  if (statTicks < 0) statTicks = 0;
  if (statTicks > 12) {
    statTicks = 12;
    b.lastGrowthAt = now;
  } else if (statTicks > 0) {
    b.lastGrowthAt += statTicks * BOND_STAT_GROW_INTERVAL_MS;
  }
  const statGains = { root: 0, comp: 0, luck: 0 };
  for (let i = 0; i < statTicks; i++) {
    const sg = growBondStats(1);
    statGains.root += sg.root;
    statGains.comp += sg.comp;
    statGains.luck += sg.luck;
  }

  if (!total && !statGains.root && !statGains.comp && !statGains.luck) return false;

  const parts = getBondKnownSkillIds().filter(id => gains[id]).map(id =>
    `${getBondSkillName(id)} +${gains[id]}重（现${levelToChinese(b.levels[id])}重）`
  );
  const statParts = [
    statGains.root > 0 ? `根骨 +${fmtBondStat(statGains.root)}` : '',
    statGains.comp > 0 ? `悟性 +${fmtBondStat(statGains.comp)}` : '',
    statGains.luck > 0 ? `定力 +${fmtBondStat(statGains.luck)}` : ''
  ].filter(Boolean);
  addIntel(`夏扑萤自行修炼了一番：${parts.join('、')}${statParts.length ? `，${statParts.join('、')}` : ''}。`, 'good');
  renderBondPanel();
  saveGame();
  return true;
}

function makeBondSparEnemy() {
  const b = ensureBondChar();
  const fei = getFeishipoStats(b.levels.feishipo);
  const con = getBondCon();
  const neiLi = getBondNeiLi();
  const hidden = getBondHidden();
  const fist = BOND_CHAR.fist;
  const blade = BOND_CHAR.blade;
  const sword = BOND_CHAR.sword;
  const changbing = BOND_CHAR.changbing;
  const qimen = BOND_CHAR.qimen;
  const speed = getBondSpeed();
  const qy = b.levels.qingyuan;
  const maxHp = Math.round(80 + con * 20);
  const extraStats = getBondExtraMartialStats();
  return {
    name: BOND_CHAR.name,
    npcId: BOND_SPAR_ID,
    hp: maxHp,
    maxHp,
    atk: 0,
    speed,
    con,
    neiLi: neiLi,
    fist: fist + extraStats.fist,
    blade: blade + extraStats.blade,
    sword: sword + extraStats.sword,
    changbing: changbing + extraStats.changbing,
    qimen: qimen + extraStats.qimen,
    hidden: hidden + extraStats.hidden,
    accuracy: 0.9 + qy * 0.0075,
    evasion: 0.10 + qy * 0.01 + (qy >= 25 ? 0.1 : 0),
    root: getBondRoot(),
    comp: getBondComp(),
    luck: getBondLuck(),
    attack: { name: '飞石破', multiplier: fei.multiplier, hits: fei.hits, stat: 'hidden' },
    skills: getBondKnownSkillIds().map(id => `${getBondSkillName(id)}（${levelToChinese(b.levels[id])}重）`),
    memory: {},
    confused: false,
    isSpar: true,
    bondSpar: true
  };
}

function startBondSpar() {
  if (!player.surname) return;
  if (battleActive()) {
    showToast('正在切磋中，先分出胜负吧');
    return;
  }
  const cdLeft = getSparCdLeft(BOND_SPAR_ID);
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
  battle.enemies = sealFighters('enemy', [makeBondSparEnemy()]);
  battle.allies = buildAllyTeam([BOND_SPAR_ID]);
  battle.over = false;
  battle.logs = [];
  battle.pozhan = 0;
  const bondSparNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  battle.lastPozhanAt = bondSparNow;
  battle.jiumaiNextAt = bondSparNow + JIUMAI_DECAY_MS;
  battle.lastWeirdPoisonAt = 0;
  battle.sparNpcId = BOND_SPAR_ID;
  battle.dreamId = '';
  battle.storyBattleId = '';
  battle.whiteRobe = null;
  battle.forfeited = false;
  if (typeof initBattleEvents === 'function') initBattleEvents(BOND_SPAR_ID);
  initBattleStrategy();
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) forfeitBtn.textContent = '放 弃 战 斗';
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '暂 停 战 斗';

  addLog(`【切磋】夏扑萤：『${player.gender === '女' ? '姐姐' : '哥哥'}，来嘛，我陪你练练手！』`, '');
  renderBattleStructure();
  updateBattleUI();
  mainView = 'village';
  renderMainTab();
  switchTab('battle');
  battleRunning = true;
  startBattleEngine();
}

function handleBondSparWin() {
  if (!player.sparCd || typeof player.sparCd !== 'object') player.sparCd = {};
  player.sparCd[BOND_SPAR_ID] = Date.now() + getSparCdMs(BOND_SPAR_ID);

  const bond = getBondValue();
  const bonus = bond * 0.005;

  const bondMartialTotal = BOND_CHAR.fist + BOND_CHAR.blade + BOND_CHAR.sword +
                           BOND_CHAR.changbing + BOND_CHAR.qimen + getBondHidden();
  const baseExpRaw = (getBondNeiLi() * 0.75 +
                      getBondCon() * 3 +
                      getBondSpeed() * 300 +
                      bondMartialTotal * 3) - 500;
                      
  const baseExp = Math.max(1, baseExpRaw); // 保证保底经验不低于 1
  const expGain = Math.round(baseExp * (1 + bonus));

  const trainingSkills = getActiveTrainingSkills();
  const skillGains = trainingSkills.map(skill => ({ skill, exp: calcSparSkillExp(expGain, skill) }));
  skillGains.forEach(({ skill, exp }) => addSkillExp(skill, exp));
  if (skillGains.length) {
    addLog(`切磋所得：${skillGains.map(({ skill, exp }) => `${skill.name} +${exp}`).join('，')}`, 'win');
    addIntel(`与夏扑萤切磋得胜，羁绊加成 ${formatPercent(bonus)}，${skillGains.map(({ skill, exp }) => `【${skill.name}】+${exp}经验`).join('、')}。`, 'good');
  } else {
    addLog('切磋所得：当前没有正在修炼的武功，经验散于无形。', '');
    addIntel(`与夏扑萤切磋得胜，但她只笑你偷懒，你并无正在修炼的武功，未得经验。`, '');
  }

  /* 羁绊角色在切磋中同样有所精进 */
  const bondChar = ensureBondChar();
  const bondTimes = 1 + Math.floor((getBondRoot() + getBondComp()) / 50);
  const bondGains = [];
  for (let i = 0; i < bondTimes; i++) {
    const id = rollBondTrainingSkillId();
    if (!id) break;
    bondChar.levels[id] += 1;
    bondGains.push(`${getBondSkillName(id)}至${levelToChinese(bondChar.levels[id])}重`);
  }
  if (bondGains.length) {
    addLog(`夏扑萤 修行有成：${bondGains.join('、')}。`, 'crit');
    addIntel(`夏扑萤与你切磋后有所悟：${bondGains.join('、')}。`, 'good');
  }

  player.bondXiaPuying = getBondValue() + 5;
  addLog('与夏扑萤切磋得胜，羁绊 +5。', 'win');
  addIntel('与夏扑萤切磋得胜，羁绊 +5。', 'good');

  renderSkills();
  renderIntel();
  renderBondPanel();
  saveGame();
}

/* ================= 剧情战斗：裴文秀切磋 / 白衣怪人围攻 ================= */

/* 裴文秀：剧情切磋的固定属性，不进入 NPC 成长系统 */
const PEI_WENXIU_STATS = {
  root: 900,
  comp: 1200,
  luck: 1000,
  con: 7500,
  neiLi: 35000,
  speed: 12,
  fist: 3000,
  blade: 3000,
  sword: 9000,
  changbing: 3000,
  qimen: 3000,
  hidden: 3000,
  accuracy: 3.5,
  evasion: 3.35
};

function makePeiWenxiuEnemy() {
  const s = PEI_WENXIU_STATS;
  const maxHp = Math.round(80 + s.con * 20);
  return {
    name: '裴文秀',
    npcId: 'peiWenxiu',
    hp: maxHp,
    maxHp,
    atk: 0,
    speed: s.speed,
    con: s.con,
    neiLi: s.neiLi,
    fist: s.fist,
    blade: s.blade,
    sword: s.sword,
    changbing: s.changbing,
    qimen: s.qimen,
    hidden: s.hidden,
    medicine: 0,
    accuracy: s.accuracy,
    evasion: s.evasion,
    root: s.root,
    comp: s.comp,
    luck: s.luck,
    attack: { name: '莫问三剑', multiplier: 1.25, hits: 3, stat: 'sword' },
    skills: ['莫问三剑（三十五重）', '云斟夕露（二十七重）', '一点惊鸿（三十重）'],
    memory: {},
    confused: false,
    isSpar: true,
    peiTurnCount: 0,
    peiFirstDone: false
  };
}

/* 白衣怪人相关事件见 battle-events.js */

function prepareStoryBattle() {
  clearStoryBattleEndTimer();
  capturePreBattleAction();
  cancelFishing();
  stopTraining();
  stopBattleEngine();
  battleRunning = false;
  player.maxHp = getMaxHp();
  player.hp = player.maxHp;
  battle.over = false;
  battle.logs = [];
  battle.pozhan = 0;
  const storyBattleNow = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  battle.lastPozhanAt = storyBattleNow;
  battle.jiumaiNextAt = storyBattleNow + JIUMAI_DECAY_MS;
  battle.lastWeirdPoisonAt = 0;
  battle.sparNpcId = '';
  battle.dreamId = '';
  battle.forfeited = false;
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '暂 停 战 斗';
}

function startPeiWenxiuStoryBattle() {
  if (battleActive()) {
    showToast('正在战斗中，先分出胜负吧');
    return;
  }
  prepareStoryBattle();
  battle.enemies = sealFighters('enemy', [makePeiWenxiuEnemy()]);
  battle.allies = buildAllyTeam(null, false);
  battle.storyBattleId = 'peiWenxiu';
  battle.whiteRobe = null;
  if (typeof initBattleEvents === 'function') initBattleEvents('');
  initBattleStrategy();
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) forfeitBtn.textContent = '放 弃 战 斗';
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '暂 停 战 斗';
  addLog('【裴文秀】“兄长，得罪了。”', '');
  renderBattleStructure();
  updateBattleUI();
  mainView = 'village';
  renderMainTab();
  switchTab('battle');
  battleRunning = true;
  startBattleEngine();
}

/* battle.js 在敌方行动时调用；返回 true 表示已由剧情战斗接管 */
function storyBattleEnemyAction(e) {
  if (battle.storyBattleId !== 'peiWenxiu') return false;
  if (!e || e.npcId !== 'peiWenxiu') return false;
  if (e.hp <= 0 || battle.over) return true;
  peiWenxiuTurn(e);
  return true;
}

function peiWenxiuTurn(e) {
  e.peiTurnCount = (Number(e.peiTurnCount) || 0) + 1;
  if (e.peiTurnCount <= 2) {
    addLog(`【裴文秀】${e.name}负剑而立，静观你的招式，并未出手。`, '');
    return;
  }
  if (e.peiTurnCount === 3 || !e.peiFirstDone) {
    e.peiFirstDone = true;
    addLog('【一点惊鸿】只见她虚拉弓弦，下一瞬，随着一声长啸，滔天气浪喷薄而出，却又于半空之中凝缩一点，朝你飞掠而来。', 'crit');
    addLog('霎时间，只听天地震荡，山川惊泣。', '');
    peiWenxiuStrike(e, {
      name: '一点惊鸿',
      stat: 'neiLi',
      multiplier: 7,
      hits: 1,
      guaranteed: true,
      damageBonus: 0.35
    });
    return;
  }
  addLog('【莫问三剑】她连刺三剑，招招直指命门，角度之刁钻、剑势之凌厉，生平未见，然而你隐隐能感觉到，这一招尚未完善。', '');
  peiWenxiuStrike(e, {
    name: '莫问三剑',
    stat: 'sword',
    multiplier: 1.25,
    hits: 3
  });
}

function peiWenxiuStrike(e, opts) {
  const target = pickWeightedTarget((battle.allies || []).filter(f => f && f.hp > 0));
  if (!target) return;
  const who = target.isPlayer ? '你' : target.name;

  const own = fighterAttackValue(e, opts.stat);
  const against = fighterDefenseValue(target, opts.stat);
  const hitsPer = Math.max(1, Number(opts.hits) || 1);
  const bonus = 1 + (Number(opts.damageBonus) || 0);
  /* 与常规敌方攻击一致：先按段数累计，再统一减去一次减伤 */
  const perHitRaw = Math.max(0, (20 + own + (own - against / 2) * 2.5) *
    (Number(opts.multiplier) || 1) * 2 * bonus);

  let totalDmg = 0;
  let hitCount = 0;
  let evadedCount = 0;
  for (let i = 0; i < hitsPer; i++) {
    if (target.hp <= 0) break;
    if (!opts.guaranteed) {
      const dodge = resolveAllyDodge(e, target);
      if (dodge.dodged) { evadedCount++; continue; }
    }
    hitCount++;
  }

  if (hitCount <= 0) {
    addLog(`${who}侧身避开了${e.name}的【${opts.name}】。`, 'win');
    return;
  }

  totalDmg = Math.max(0, perHitRaw * hitCount - fighterDR(target));
  totalDmg = Math.round(totalDmg * 10) / 10;
  target.hp -= totalDmg;

  const notes = [];
  if (hitsPer > 1) notes.push(`${hitCount}/${hitsPer}段命中`);
  if (opts.guaranteed) notes.push('必定命中');
  if (opts.damageBonus) notes.push(`伤害 +${Math.round(opts.damageBonus * 100)}%`);
  if (evadedCount > 0) notes.push(`${evadedCount}段被闪避`);
  addLog(`${e.name} 施展【${opts.name}】，对${who}造成 ${fmtNum(Math.round(totalDmg * 10) / 10)} 点伤害${notes.length ? `（${notes.join('，')}）` : ''}`, 'dmg');
  shakeCard(target);

  if (target.hp <= 0) {
    target.hp = 0;
    addLog(`${target.isPlayer ? '你' : target.name} 倒下了！`, 'dmg');
  }
}

/* battle.js 在玩家/同伴的攻击全部落空时调用 */
function storyBattleAfterAttack(info) {
  if (battle.storyBattleId !== 'peiWenxiu' || battle.over) return;
  if (!info || !info.target || info.target.npcId !== 'peiWenxiu') return;
  if ((Number(info.target.peiTurnCount) || 0) < 3) return;
  if (info.hitSegments > 0 || info.missSegments <= 0) return;
  peiWenxiuCounter(info.attacker);
}

function peiWenxiuCounter(attacker) {
  const e = (battle.enemies || []).find(f => f && f.npcId === 'peiWenxiu' && f.hp > 0);
  if (!e || !attacker || attacker.hp <= 0 || battle.over) return;
  const who = attacker.isPlayer ? '你' : attacker.name;
  addLog(`【云斟夕露】以云为盏，与夕作露，她立于实地，足尖却好似在云雾之中翩然起舞，${who}一击未中，反遭其连刺数下。`, 'crit');

  const own = fighterAttackValue(e, 'sword');
  const against = fighterDefenseValue(attacker, 'sword');
  let dmg = (20 + own + (own - against / 2) * 2.5) * 1.25 * 2 * 3;
  dmg = Math.max(0, dmg - fighterDR(attacker));
  dmg = Math.round(dmg * 10) / 10;

  attacker.hp -= dmg;
  addLog(`【反击】${e.name} 剑光连闪，对${who}造成 ${fmtNum(dmg)} 点伤害（必定命中，3段）`, 'dmg');
  shakeCard(attacker);
  if (attacker.hp <= 0) {
    attacker.hp = 0;
    addLog(`${who} 倒下了！`, 'dmg');
  }
  if (!battle.over) checkBattleEnd();
}

let storyBattleEndTimer = null;

function clearStoryBattleEndTimer() {
  if (storyBattleEndTimer) {
    clearTimeout(storyBattleEndTimer);
    storyBattleEndTimer = null;
  }
}

function completeStoryBattleEnd(id, result) {
  clearStoryBattleEndTimer();
  battle.storyBattleId = '';
  const whiteRobeWin = id === 'whiteRobe' && result === 'win';
  battle.whiteRobe = null;
  pauseBattle();
  battle.enemies = [];
  battle.allies = [];
  battle.over = false;
  battle.forfeited = false;
  battle.sparNpcId = '';
  battle.dreamId = '';
  battle.lastWeirdPoisonAt = 0;
  battle.pozhan = 0;
  player.hp = player.maxHp;
  renderBattleIdle();
  switchTab('main');
  if (id === 'peiWenxiu') {
    showDialogNode(result === 'win' ? 'peiSparWin' : 'peiSparLose');
  } else if (whiteRobeWin) {
    showDialogNode('baiYiVictory');
  } else {
    /* 白衣怪人围攻理论上是必胜战；万一因放弃等原因退出，从这里重来 */
    showDialogNode('peiRefuse');
  }
  saveGame();
}

/* battle.js 在胜/负结算后调用，自动从战斗界面返回剧情 */
function handleStoryBattleEnd(result) {
  const id = battle.storyBattleId;
  if (!id) return;
  if (id === 'peiWenxiu' && result === 'lose') {
    if (storyBattleEndTimer) return;
    addLog('2 秒后将自动返回剧情界面……', '');
    updateBattleUI();
    storyBattleEndTimer = setTimeout(() => {
      storyBattleEndTimer = null;
      if (battle.storyBattleId !== id) return;
      completeStoryBattleEnd(id, result);
    }, 2000);
    return;
  }
  completeStoryBattleEnd(id, result);
}

/* 计算羁绊角色通过额外传授武功获得的属性加成（不吃玩家见微知著倍率） */
function getBondExtraMartialStats() {
  const b = ensureBondChar();
  const extra = {
    fist: 0, sword: 0, blade: 0, changbing: 0, qimen: 0, hidden: 0,
    neili: 0, con: 0, root: 0, comp: 0, luck: 0, speed: 0, conMult: 1
  };
  const mine = Array.isArray(player.skills) ? player.skills : [];

  /* 初始三门武功各自已有专属加成，这里只算额外传授的 */
  Object.keys(b.levels).forEach(id => {
    if (BOND_SKILL_ORDER.includes(id)) return;
    const lv = Math.floor(Number(b.levels[id]) || 0);
    if (lv <= 0) return;

    if (id === 'zhenshan') {
      extra.fist += lv * 3 + (lv >= 100 ? 1000 : 0);
      if (typeof getWangbaConBonus === 'function') extra.con += getWangbaConBonus(lv);
      if (typeof getWangbaRootBonus === 'function') extra.root += getWangbaRootBonus(lv);
      return;
    }
    if (id === 'jiusi') {
      extra.sword += lv * 3 + (lv >= 5 ? 10 : 0) + (lv >= 10 ? 20 : 0) + (lv >= 50 ? 50 : 0) + (lv >= 100 ? 1000 : 0);
      if (typeof getJiusiCompBonus === 'function') extra.comp += getJiusiCompBonus(lv);
      if (typeof getJiusiNeiLiBonus === 'function') extra.neili += getJiusiNeiLiBonus(lv);
      return;
    }
    if (id === 'paodingDao') {
      extra.blade += lv * 3 + (lv >= 5 ? 15 : 0) + (lv >= 50 ? 50 : 0) + (lv >= 100 ? 1000 : 0);
      if (typeof getPaodingDaoConBonus === 'function') extra.con += getPaodingDaoConBonus(lv);
      if (typeof getPaodingDaoCompBonus === 'function') extra.comp += getPaodingDaoCompBonus(lv);
      if (typeof getPaodingDaoSpeedBonus === 'function') extra.speed += getPaodingDaoSpeedBonus(lv);
      return;
    }
    if (id === 'qiangshen') {
      extra.con += 2 + lv * 2 + (lv >= 10 ? 10 : 0) + (lv >= 30 ? 100 : 0) + (lv > 50 ? (lv - 50) * 2 : 0);
      if (typeof getQiangshenRootBonus === 'function') extra.root += getQiangshenRootBonus(lv);
      if (lv >= 100) extra.conMult *= 1.2;
      return;
    }
    if (id === 'huomai') {
      extra.root += Math.floor(lv / 5);
      return;
    }

    const playerSkill = mine.find(s => s && s.id === id);
    if (!playerSkill || typeof skillMatchesCategory !== 'function') return;

    if (skillMatchesCategory(playerSkill, '剑法')) extra.sword += lv * 3;
    else if (skillMatchesCategory(playerSkill, '刀法')) extra.blade += lv * 3;
    else if (skillMatchesCategory(playerSkill, '长兵')) extra.changbing += lv * 3;
    else if (skillMatchesCategory(playerSkill, '奇门')) extra.qimen += lv * 3;
    else if (skillMatchesCategory(playerSkill, '暗器')) extra.hidden += lv * 3;
    else if (skillMatchesCategory(playerSkill, '招式')) extra.fist += lv * 3;
    else if (playerSkill.type === '外功') extra.con += lv * 2;
    else if (playerSkill.type === '内功') extra.neili += lv * 5;
    else if (playerSkill.type === '轻功') extra.speed += lv * 0.02;
  });

  return extra;
}

function renderBondPanel() {
  const box = $('bondCharBox');
  if (!box) return;
  const b = ensureBondChar();
  const bond = getBondValue();
  const extraStats = getBondExtraMartialStats();
  const fmtBondInt = v => Math.round(Number(v) || 0).toString();

  const set = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val;
  };
  set('bc-bond', fmtBondInt(bond));
  set('bc-root', fmtBondInt(getBondRoot()));
  set('bc-comp', fmtBondInt(getBondComp()));
  set('bc-luck', fmtBondInt(getBondLuck()));
  set('bc-con', fmtBondInt(getBondCon()));
  set('bc-neili', fmtBondInt(getBondNeiLi()));
  set('bc-speed', fmtDecimal(Math.round((Number(getBondSpeed()) || 0) * 100) / 100));
  set('bc-fist', fmtBondInt(BOND_CHAR.fist + extraStats.fist));
  set('bc-blade', fmtBondInt(BOND_CHAR.blade + extraStats.blade));
  set('bc-sword', fmtBondInt(BOND_CHAR.sword + extraStats.sword));
  set('bc-changbing', fmtBondInt(BOND_CHAR.changbing + extraStats.changbing));
  set('bc-qimen', fmtBondInt(BOND_CHAR.qimen + extraStats.qimen));
  set('bc-hidden', fmtBondInt(getBondHidden() + extraStats.hidden));
  const skillList = $('bc-skill-list');
  if (skillList) {
    skillList.innerHTML = getBondKnownSkillIds().map(id => {
      const lv = Number(b.levels[id]) || 0;
      return `<div class="bond-skill">${escapeHtml(getBondSkillName(id))}（${levelToChinese(lv)}重）</div>`;
    }).join('');
  }
  set('bc-companion', player.companionId === BOND_SPAR_ID ? BOND_CHAR.name : '无');

  const note = $('bc-note');
  if (note) {
    const rate = getBondNeiLiRatePerMin();
    const cultNum = 1 + (getBondRoot() + getBondComp()) * (1 + bond / 500) / 50;
    const low = Math.floor(cultNum), high = Math.ceil(cultNum);
    const cultText = low === high ? `${low}` : `${low}~${high}`;
    const unlockLines = [];
    if (bond >= 20) {
      const bondToPlayer = getBondOwnHidden() / 10;
      const playerToBond = getTotalHidden() / 10;
      unlockLines.push(`20羁绊：你与夏扑萤的暗器互相 +对方暗器/10（你 +${fmtBondInt(bondToPlayer)}，夏扑萤 +${fmtBondInt(playerToBond)}）`);
    }
    if (bond >= 50) unlockLines.push(`50羁绊：你的青鸢飞纵修炼效率 +${fmtBondInt(b.levels.qingyuan * 5)}%，夏扑萤的体魄 +${fmtBondInt(b.levels.qingyuan)}`);
    if (bond >= 150) unlockLines.push(`150羁绊：同阵营并肩作战时，你和夏扑萤的闪避 +20%；你的行动速度 +${fmtBondInt(getBondSpeed() / 10)}`);
    note.textContent =
      `战斗中全属性 +${fmtBondInt(bond * 0.1)}%\n` +
      `与其切磋的经验奖励 +${fmtBondInt(bond * 0.5)}%\n` +
      `内力增速 ${fmtRate(Math.round(rate * 1000) / 1000)}/分钟\n` +
      `每个时辰自动修炼 ${cultText} 门武功（可重复）\n` +
      `每两个时辰根骨、悟性、定力 +${Math.round(BOND_GROWTH_RATIO * 100)}%（至少 +1）` +
      (unlockLines.length ? `\n${unlockLines.join('\n')}` : '');
  }

  const btn = $('bondSparBtn');
  if (btn) {
    const cdLeft = getSparCdLeft(BOND_SPAR_ID);
    const busy = !!battleActive();
    btn.disabled = cdLeft > 0 || busy;
    btn.textContent = cdLeft > 0 ? `切磋冷却 ${Math.ceil(cdLeft / 1000)}s` : (busy ? '切 磋 中...' : '切 磋');
  }

  const teachBtn = $('bondTeachBtn');
  if (teachBtn) {
    const cdLeft = getBondTeachCdLeft();
    const busy = !!battleActive();
    teachBtn.disabled = cdLeft > 0 || busy;
    teachBtn.textContent = cdLeft > 0 ? `请教冷却 ${Math.ceil(cdLeft / 1000)}s` : '请 教';
  }

  const guideBtn = $('bondGuideBtn');
  if (guideBtn) {
    const cdLeft = getBondGuideCdLeft();
    const busy = !!battleActive();
    guideBtn.disabled = cdLeft > 0 || busy;
    guideBtn.textContent = cdLeft > 0 ? `指点冷却 ${Math.ceil(cdLeft / 1000)}s` : '指 点';
  }

  ['bondTransferBtn', 'bondStrategyBtn'].forEach(id => {
    const el = $(id);
    if (el) el.disabled = !!battleActive();
  });
}

const bondSparBtnEl = $('bondSparBtn');
if (bondSparBtnEl) {
  bondSparBtnEl.addEventListener('click', startBondSpar);
}

const bondCompanionBtnEl = $('bondCompanionBtn');
if (bondCompanionBtnEl) {
  bondCompanionBtnEl.addEventListener('click', () => {
    player.companionId = BOND_SPAR_ID;
    showToast(`${BOND_CHAR.name}现在会陪着你一起行动了`);
    renderBondPanel();
    saveGame();
  });
}

/* ================= 向羁绊角色请教 ================= */
function getBondTeachCdLeft() {
  const at = Number((player.teachCd || {})[BOND_TEACH_ID]) || 0;
  return Math.max(0, at - Date.now());
}

/* 玩家修炼该武功五分钟的经验 */
function getFiveMinuteTrainingExp(skill) {
  if (!skill) return 0;
  let inter = Number(player.trainingInteractionEfficiency) || 0;
  const curAct = TRAINING_ACTIVITY[player.trainingActivity];
  if (!(curAct && skillMatchesCategory(skill, curAct.cat))) {
    const defAct = Object.values(TRAINING_ACTIVITY).find(a => skillMatchesCategory(skill, a.cat));
    inter = defAct ? defAct.interactionEfficiency : 25;
  }
  return getSkillTrainingExpPerMinute(skill, inter, player.trainingOtherBonus) * 5;
}

function bondTeach(targetId) {
  if (!player.surname) return;
  if (battleActive()) {
    showToast('正在切磋中，先分出胜负吧');
    return;
  }
  const cdLeft = getBondTeachCdLeft();
  if (cdLeft > 0) {
    showToast(`刚请教过呢，过${Math.ceil(cdLeft / 1000)}s再来吧`, 1000);
    return;
  }
  if (!Array.isArray(player.skills)) player.skills = [];

  if (!targetId) {
    openBondTeachPicker();
    return;
  }
  if (!BOND_SKILL_ORDER.includes(targetId)) return;

  if (!player.teachCd || typeof player.teachCd !== 'object') player.teachCd = {};
  player.teachCd[BOND_TEACH_ID] = Date.now() + BOND_TEACH_CD_MS;

  if (!player.skills.some(s => s && s.id === targetId)) {
    const teach = BOND_SKILL_TEACH[targetId] || { name: BOND_SKILL_NAMES[targetId], type: '招式', select: '招式' };
    player.skills.push({ id: targetId, name: teach.name, type: teach.type, level: 1, exp: 0 });
    if (!player.trainingSelections || typeof player.trainingSelections !== 'object') player.trainingSelections = {};
    if (!player.trainingSelections[teach.select]) player.trainingSelections[teach.select] = targetId;
    addIntel(`你向夏扑萤请教，学会了${teach.type}【${teach.name}】。`, 'good');
    showToast(`学会了${teach.type}【${teach.name}】`);
  } else {
    const skill = player.skills.find(s => s && s.id === targetId);
    const exp = Math.round(getFiveMinuteTrainingExp(skill) * (1 + getBondValue() / 100));
    if (skill && exp > 0) {
      addSkillExp(skill, exp);
      addIntel(`你向夏扑萤请教，【${skill.name}】获得 ${exp} 点经验。`, 'good');
      showToast(`【${skill.name}】+${exp} 经验`);
    }
  }

  updateAttrUI();
  renderSkills();
  renderBondPanel();
  saveGame();
}

function openBondTeachPicker() {
  if (!Array.isArray(player.skills)) player.skills = [];
  const ids = BOND_SKILL_ORDER.slice();
  openBondModal({
    title: '向 夏 扑 萤 请 教',
    desc: '选择一门武功请教：未习得可直接学会，已习得可获得五分钟修炼经验。每次请教后有 1200 秒冷却。',
    bodyHtml: '<div class="bond-modal-list" id="bondTeachList"></div>',
    onMount: () => {
      const list = $('bondTeachList');
      if (!list) return;
      ids.forEach(id => {
        const mine = player.skills.find(s => s && s.id === id);
        const note = mine
          ? `已习得 · 你 ${levelToChinese(mine.level)}重 · 请教可获五分钟经验`
          : '未习得 · 请教后直接学会';
        list.appendChild(makeBondModalItem(id, note, () => {
          closeBondModal();
          bondTeach(id);
        }));
      });
    },
    buttons: [{ label: '取消' }]
  });
}

/* ================= 羁绊功能弹窗：传授 / 修行策略 / 指点（共用） ================= */
function closeBondModal() {
  const modal = $('bondModal');
  if (modal) modal.classList.remove('show');
  const body = $('bondModalBody');
  if (body) body.innerHTML = '';
  const actions = $('bondModalActions');
  if (actions) actions.innerHTML = '';
}

function openBondModal({ title, desc = '', bodyHtml = '', onMount, buttons = [] }) {
  const modal = $('bondModal');
  if (!modal) return;
  const titleEl = $('bondModalTitle');
  if (titleEl) titleEl.textContent = title;
  const descEl = $('bondModalDesc');
  if (descEl) {
    descEl.textContent = desc;
    descEl.style.display = desc ? '' : 'none';
  }
  const body = $('bondModalBody');
  if (body) body.innerHTML = bodyHtml;
  const actions = $('bondModalActions');
  if (actions) {
    actions.innerHTML = '';
    buttons.forEach(cfg => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = cfg.label;
      btn.disabled = !!cfg.disabled;
      btn.addEventListener('click', () => {
        if (cfg.closeOnClick !== false) closeBondModal();
        if (typeof cfg.onClick === 'function') cfg.onClick();
      });
      actions.appendChild(btn);
    });
  }
  modal.classList.add('show');
  if (body && typeof onMount === 'function') onMount(body);
}

function makeBondModalItem(skillId, note, onPick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bond-modal-item';
  const nameEl = document.createElement('span');
  nameEl.textContent = getBondSkillName(skillId);
  const noteEl = document.createElement('small');
  noteEl.textContent = note;
  btn.appendChild(nameEl);
  btn.appendChild(noteEl);
  btn.addEventListener('click', onPick);
  return btn;
}

const bondModalEl = $('bondModal');
if (bondModalEl) {
  bondModalEl.addEventListener('click', e => {
    if (e.target === bondModalEl) closeBondModal();
  });
}

/* ================= 传授武功 ================= */
function bondTransfer() {
  if (!player.surname) return;
  if (battleActive()) {
    showToast('正在切磋中，先分出胜负吧');
    return;
  }
  if (!Array.isArray(player.skills)) player.skills = [];
  const b = ensureBondChar();
  const known = new Set(getBondKnownSkillIds());
  const teachable = player.skills.filter(s => s && s.id && !known.has(s.id));
  if (!teachable.length) {
    showToast('没有可传授的武功，夏扑萤已全部学会');
    return;
  }
  openBondModal({
    title: '传 授 武 功',
    desc: '选择一门你已学会、夏扑萤尚未学会的武功。传授后她从一重起步，可自行修炼或由你指点。',
    bodyHtml: '<div class="bond-modal-list" id="bondTransferList"></div>',
    onMount: () => {
      const list = $('bondTransferList');
      if (!list) return;
      teachable.forEach(sk => {
        list.appendChild(makeBondModalItem(
          sk.id,
          `${sk.type || '武功'} · 你 ${levelToChinese(sk.level)}重`,
          () => {
            closeBondModal();
            if (getBondKnownSkillIds().includes(sk.id)) return;
            b.levels[sk.id] = 1;
            addIntel(`你向夏扑萤传授了【${sk.name}】。`, 'good');
            showToast(`已传授【${sk.name}】，夏扑萤可自行修炼`);
            renderBondPanel();
            saveGame();
          }
        ));
      });
    },
    buttons: [{ label: '取消' }]
  });
}

/* ================= 修行策略 ================= */
function bondStrategy() {
  if (!player.surname) return;
  if (battleActive()) {
    showToast('正在切磋中，先分出胜负吧');
    return;
  }
  const b = ensureBondChar();
  const ids = getBondKnownSkillIds();
  openBondModal({
    title: '修 行 策 略',
    desc: '数字越大越优先修炼；0 表示不修炼；默认 1。\n自动修炼与切磋后的精进都按此权重抽取。',
    bodyHtml: '<div class="bond-weight-list" id="bondWeightList"></div>',
    onMount: () => {
      const list = $('bondWeightList');
      if (!list) return;
      ids.forEach(id => {
        const row = document.createElement('label');
        row.className = 'bond-weight-row';
        const name = document.createElement('span');
        name.textContent = getBondSkillName(id);
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.1';
        input.dataset.skillId = id;
        const w = Number(b.strategyWeights[id]);
        input.value = String(Number.isFinite(w) ? w : 1);
        row.appendChild(name);
        row.appendChild(input);
        list.appendChild(row);
      });
    },
    buttons: [
      {
        label: '保存',
        closeOnClick: false,
        onClick: () => {
          const list = $('bondWeightList');
          if (!list) return;
          const next = {};
          let invalid = false;
          list.querySelectorAll('input').forEach(input => {
            const id = input.dataset.skillId;
            const raw = String(input.value).trim();
            const w = Number(raw);
            if (raw === '' || !Number.isFinite(w) || w < 0) invalid = true;
            next[id] = raw !== '' && Number.isFinite(w) && w >= 0 ? w : 1;
          });
          if (invalid) {
            showToast('权重需为不小于 0 的数字');
            return;
          }
          b.strategyWeights = next;
          closeBondModal();
          showToast('修行策略已更新');
          saveGame();
          renderBondPanel();
        }
      },
      { label: '取消' }
    ]
  });
}

/* ================= 指点武功 ================= */
function getBondGuideCdLeft() {
  const at = Number((player.teachCd || {})[BOND_GUIDE_ID]) || 0;
  return Math.max(0, at - Date.now());
}

function bondGuide() {
  if (!player.surname) return;
  if (battleActive()) {
    showToast('正在切磋中，先分出胜负吧');
    return;
  }
  const cdLeft = getBondGuideCdLeft();
  if (cdLeft > 0) {
    showToast(`刚指点过呢，过${Math.ceil(cdLeft / 1000)}s再来吧`, 1000);
    return;
  }
  if (!Array.isArray(player.skills)) player.skills = [];
  const b = ensureBondChar();
  const options = getBondKnownSkillIds().map(id => {
    const mine = player.skills.find(s => s && s.id === id);
    return { id, mine, bondLevel: Number(b.levels[id]) || 0 };
  }).filter(o => o.mine && o.bondLevel < Math.floor((Number(o.mine.level) || 1) * 0.8));
  if (!options.length) {
    showToast('没有可指点的武功：需你已学会，且夏扑萤当前重数低于你重数的 80%');
    return;
  }
  openBondModal({
    title: '指 点 武 功',
    desc: '重数提升 = 你的重数 ÷ 20（最低为 1），指点后不超过你重数的 80%。每次指点后有 1200 秒冷却。',
    bodyHtml: '<div class="bond-modal-list" id="bondGuideList"></div>',
    onMount: () => {
      const list = $('bondGuideList');
      if (!list) return;
      options.forEach(o => {
        const playerLv = Math.max(1, Number(o.mine.level) || 1);
        const cap = Math.floor(playerLv * 0.8);
        const gain = Math.max(1, Math.floor(playerLv / 20));
        const realGain = Math.max(0, Math.min(cap, o.bondLevel + gain) - o.bondLevel);
        list.appendChild(makeBondModalItem(
          o.id,
          `夏扑萤 ${levelToChinese(o.bondLevel)}重 · 你 ${levelToChinese(playerLv)}重 · 上限 ${levelToChinese(cap)}重 · 可提升 ${realGain} 重`,
          () => {
            closeBondModal();
            const current = Number(b.levels[o.id]) || 0;
            const actual = Math.max(0, Math.min(cap, current + gain) - current);
            if (actual <= 0) {
              showToast('此武功已达你重数的 80% 上限');
              return;
            }
            b.levels[o.id] = current + actual;
            if (!player.teachCd || typeof player.teachCd !== 'object') player.teachCd = {};
            player.teachCd[BOND_GUIDE_ID] = Date.now() + BOND_GUIDE_CD_MS;
            addIntel(`你指点了夏扑萤的【${getBondSkillName(o.id)}】，使其提升了 ${actual} 重（现${levelToChinese(b.levels[o.id])}重）。`, 'good');
            showToast(`指点成功，${getBondSkillName(o.id)} +${actual} 重`);
            renderBondPanel();
            saveGame();
          }
        ));
      });
    },
    buttons: [{ label: '取消' }]
  });
}

const bondTeachBtnEl = $('bondTeachBtn');
if (bondTeachBtnEl) {
  bondTeachBtnEl.addEventListener('click', () => bondTeach());
}

const bondTransferBtnEl = $('bondTransferBtn');
if (bondTransferBtnEl) {
  bondTransferBtnEl.addEventListener('click', bondTransfer);
}

const bondStrategyBtnEl = $('bondStrategyBtn');
if (bondStrategyBtnEl) {
  bondStrategyBtnEl.addEventListener('click', bondStrategy);
}

const bondGuideBtnEl = $('bondGuideBtn');
if (bondGuideBtnEl) {
  bondGuideBtnEl.addEventListener('click', bondGuide);
}

const intelCompanionFilterEl = $('intelCompanionFilter');
if (intelCompanionFilterEl) {
  intelCompanionFilterEl.addEventListener('click', toggleIntelCompanionFilter);
}

/* ================= 羁绊陪伴事件 ================= */
function getCompanionActiveActivities() {
  const types = [];
  if (fishing.running) {
    types.push(storyFlags.arrivedCapital ? 'capitalFishing' : 'fishing');
  }
  const act = player.trainingActivity;
  if (act && TRAINING_ACTIVITY[act]) {
    if (act !== 'dummy' || getTrainingSkillForActivity()) types.push(act);
  }
  return types;
}

function triggerCompanionEvent(type) {
  const growth = getBondGrowth();
  const intel = (text, cls) => addIntel(text, cls, undefined, 'companion');
  let bondGain = 10;

  if (type === 'fishing') {
    intel('你静坐着钓鱼，夏扑萤就安静地拿着树枝在泥土上画画，画上有你，还有她。', '');
    player.luck = (Number(player.luck) || 0) + 1;
    growth.luck += 1;
    intel('你的定力 +1，夏扑萤定力 +1，羁绊 +10。', 'good');
  } else if (type === 'external') {
    intel('你任凭瀑布冲刷着自己的身体，夏扑萤却在旁边钓起了鱼。', '');
    const s = player.gender === '女' ? '姐' : '哥';
    intel(`“${s}！${s}！你看你看，萤儿钓到鱼了！”`, 'good');
    const qMult = 1 + getBondValue() / 100;
    for (let i = 0; i < 3; i++) {
      const q = rollFishingQuality() * qMult;
      addItem('chilinyu', 1, { weight: rollFishWeight('chilinyu', q), quality: q });
    }
    player.root = (Number(player.root) || 0) + 1;
    intel('她钓起三尾赤鳞鱼，全都送给了你。（你的根骨 +1，夏扑萤羁绊 +10）', 'good');
  } else if (type === 'internal') {
    intel('你打坐入定，夏扑萤耐着性子在一旁滚来滚去，憋红了脸也不敢出声闹你。', '');
    intel('最终，她试探着躺到你的膝盖上，见你没有反应，便安心地闭上了眼睛，酣然入睡。', 'good');
    player.neiLi = (Number(player.neiLi) || 0) + 5;
    intel('你的内力 +5，夏扑萤羁绊 +10。', 'good');
  } else if (type === 'dummy') {
    intel('你打着木桩，夏扑萤在身后变着法子给你搞怪加油，你强忍着笑意，感觉更有干劲了。', '');
    player.comp = (Number(player.comp) || 0) + 1;
    intel('你的悟性 +1，夏扑萤羁绊 +10。', 'good');
  } else if (type === 'plum') {
    intel('你踩着梅花桩练功，夏扑萤待在下面，眼睛一眨不眨地看着你，屏息凝神，生怕你一个不慎跌落下来，随时准备着冲上前将你接住。', '');
    intel('即使她知道，这点高度根本伤不到你。', '');
    intel('你感到有些安心。', 'good');
    player.luck = (Number(player.luck) || 0) + 1;
    bondGain += 10;
    intel('你的定力 +1，你和夏扑萤的羁绊总共提升了 20 点。', 'good');
  } else if (type === 'capitalInternal') {
    bondGain = 5;
    intel('你打坐入定，夏扑萤耐着性子在一旁滚来滚去，憋红了脸也不敢出声闹你。', '');
    intel('最终，她试探着躺到你的膝盖上，见你没有反应，便安心地闭上了眼睛，酣然入睡。', 'good');
    player.neiLi = (Number(player.neiLi) || 0) + 30;
    intel('你的内力 +30，夏扑萤羁绊 +5。', 'good');
  } else if (type === 'stoneLock') {
    bondGain = 5;
    intel('你拿石锁锤炼身体，夏扑萤却在身后给你按摩肩膀，你一时之间哭笑不得。', '');
    player.root = (Number(player.root) || 0) + 2;
    growth.root += 1;
    intel('你的根骨 +2，夏扑萤根骨 +1，羁绊 +5。', 'good');
  } else if (type === 'waterPlum') {
    bondGain = 5;
    intel('你在梅桩上翻转腾挪，夏扑萤则坐在椅子上悠闲地吃着果子，时不时给你加油鼓劲。', '');
    player.luck = (Number(player.luck) || 0) + 2;
    growth.comp += 1;
    intel('你的定力 +2，夏扑萤悟性 +1，羁绊 +5。', 'good');
  } else if (type === 'sparPractice') {
    bondGain = 5;
    intel('你与他人对练过招，夏扑萤一边给你加油，一边时不时地悄悄用小石子偷袭你的对手.......', '');
    player.comp = (Number(player.comp) || 0) + 2;
    growth.comp += 1;
    intel('你的悟性 +2，夏扑萤悟性 +1，羁绊 +5。', 'good');
  } else if (type === 'capitalFishing') {
    bondGain = 5;
    intel('你静坐着钓鱼，夏扑萤就安静地拿着树枝在泥土上画画，画上有你，还有她。', '');
    player.luck = (Number(player.luck) || 0) + 2;
    growth.luck += 1;
    intel('你的定力 +2，夏扑萤定力 +1，羁绊 +5。', 'good');
  } else {
    return false;
  }

  player.bondXiaPuying = getBondValue() + bondGain;
  updateAttrUI();
  updateNeiLiDisplays();
  renderBondPanel();
  saveGame();
  return true;
}
function companionEventTick() {
  if (!player.surname || !player.companionId) return;
  if (battleActive()) return;
  const types = getCompanionActiveActivities();
  if (!types.length) return;
  const chance = Math.min(0.2, (1 + getBondValue() / 500) / 100);
  if (Math.random() >= chance) return;
  triggerCompanionEvent(types[Math.floor(Math.random() * types.length)]);
}

setInterval(companionEventTick, 60 * 1000);

/* 战斗状态对象见 battle.js */

/* 战斗系统见 battle.js */
function updateAttrUI() {
  $('a-name').textContent = player.surname + player.givenName;
  $('a-gender').textContent = player.gender;
  $('a-zi').textContent = player.zi || '—';
  $('a-root').textContent = Math.round(getTotalRoot());
  $('a-comp').textContent = Math.round(getTotalComp());
  $('a-luck').textContent = fmtDecimal(getTotalLuck());
  $('a-con').textContent = Math.round(getTotalCon());
  $('a-neili').textContent = fmtNeiLi(getTotalNeiLi());

  $('a-hp').textContent = getMaxHp();
  $('a-regen').textContent = getHpRegen();
  $('a-dr').textContent = fmtNum(Math.round((getTotalCon() + getExtraDR() + getNeiLiDR()) * 10) / 10);
  $('a-neili-rate').textContent = fmtRate(getNeiLiRatePerMin()) + '/分钟';
  $('a-neili-dmg').textContent = fmtNum(Math.round(getNeiLiDamageBonus() * 10) / 10);
  $('a-neili-dr').textContent = fmtNum(Math.round(getNeiLiDR() * 10) / 10);
  $('a-shenning').textContent = formatPercent(getShenningRate());
  $('a-speed').textContent = fmtDecimal(Math.round(getTotalSpeed() * 100) / 100);

  const hitEl = $('a-hit');
  if (hitEl) hitEl.textContent = formatPercent(getAccuracyRate());
  const evadeEl = $('a-evade');
  if (evadeEl) evadeEl.textContent = formatPercent(getEvasionRate());
  const comboEl = $('a-combo');
  if (comboEl) comboEl.textContent = formatPercent(getMianmianRate());
  const critEl = $('a-crit');
  if (critEl) critEl.textContent = formatPercent(getXushiRate());
  const bondEl = $('a-bond');
  if (bondEl) bondEl.textContent = fmtBondStat(getBondValue());

  $('a-fist').textContent = Math.round(getTotalFist());
  $('a-blade').textContent = Math.round(getTotalBlade());
  $('a-sword').textContent = Math.round(getTotalSword());
  const changbingEl = $('a-changbing');
  if (changbingEl) changbingEl.textContent = Math.round(getTotalChangbing());
  const qimenEl = $('a-qimen');
  if (qimenEl) qimenEl.textContent = Math.round(getTotalQimen());
  const hiddenEl = $('a-hidden');
  if (hiddenEl) hiddenEl.textContent = Math.round(getTotalHidden());
  const medicineEl = $('a-medicine');
  if (medicineEl) medicineEl.textContent = Math.round(getTotalMedicine());

  updateSidePanel();
}

/* 武功/技艺卡片 UI 见 skillcards.js */
/* 离线收益系统见 offline.js */
function buildSavePayload() {
  if (!player.surname) return null;
  return {
    player: player,
    battleStage: battle.stage,
    storyFinished: storyFinished,
    storyFlags: storyFlags,
    intelLogs: intelLogs,
    lastActiveAt: Date.now(),
    // 离开页面前正在做的事，供重连恢复与奖励时间计算使用
    offline: {
      fishingActive: !!(fishing.running || fishing.nextStartAt > 0),
      fishingDuration: getFishingDuration(),
      trainingActivity: player.trainingActivity || '',
      cookingActive: !!cookingState.running,
      cookingRecipe: cookingState.recipe,
      cookingPending: cookingState.running
        ? (cookingState.pending || []).map(it => ({
            fishId: it.fishId,
            weight: Number(it.weight) || 0,
            fishQuality: it.fishQuality != null && Number.isFinite(Number(it.fishQuality)) ? Number(it.fishQuality) : null
          }))
        : []
    }
  };
}

function saveGame() {
  const data = buildSavePayload();
  if (!data) return;
  try {
    localStorage.setItem('wuxia_save_v1', JSON.stringify(data));
  } catch (err) {}
}

function loadGame() {
  const raw = localStorage.getItem('wuxia_save_v1');
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (!data.player || !data.player.surname) return false;

    const savedAt = Number(data.lastActiveAt);
    const snap = data.offline && typeof data.offline === 'object' ? data.offline : null;
    pendingOffline = Number.isFinite(savedAt) && savedAt > 0
      ? {
          at: savedAt,
          ms: Math.max(0, Date.now() - savedAt),
          fishing: snap && snap.fishingActive
            ? { duration: Math.max(1000, Number(snap.fishingDuration) || 0) }
            : null,
          cooking: snap && snap.cookingActive && Array.isArray(snap.cookingPending) && snap.cookingPending.length
            ? { recipe: snap.cookingRecipe || 'kaoyu', pending: snap.cookingPending }
            : null
        }
      : null;

    Object.assign(player, data.player);
    if (!Array.isArray(player.skills)) player.skills = [];
    if (!Array.isArray(player.techniques)) player.techniques = [];
    /* 旧存档没有请教次数：按每 5 点医术一次请教反推，已满十次则补发金针渡穴 */
    if (data.player.medicineLessonCount === undefined) {
      const inferredLessons = Math.min(10, Math.floor((Number(player.medicine) || 0) / 5));
      player.medicineLessonCount = Math.max(0, inferredLessons);
      if (inferredLessons >= 10 && !player.techniques.some(t => t && t.id === 'jinzhen')) {
        player.techniques.push({ id: 'jinzhen', name: '金针渡穴', type: '特技' });
      }
    }
    if (data.player.cookCount === undefined) player.cookCount = 0;
    if (!Number.isFinite(Number(player.cookCount)) || Number(player.cookCount) < 0) player.cookCount = 0;
    if (!Array.isArray(player.inventory)) player.inventory = [];
    player.inventory = player.inventory.filter(s =>
      s && ITEM_DEFS[s.id] && s.qty > 0
    );

    const SKILL_ID_MIGRATION = { wangba: 'zhenshan' };
    player.skills.forEach(sk => {
      if (SKILL_ID_MIGRATION[sk.id]) sk.id = SKILL_ID_MIGRATION[sk.id];
      if (sk.id === 'zhenshan') sk.name = '震山拳';
      if (!Number.isFinite(sk.exp)) sk.exp = 0;
      if (!Number.isFinite(sk.level) || sk.level < 1) sk.level = 1;
      /* 玄览通微：旧字段 jianweizhizhu 迁移为 jianweizhizhuBase */
      if (sk.jianweizhizhu !== undefined) {
        const legacy = Number(sk.jianweizhizhu);
        if (!Number.isFinite(Number(sk.jianweizhizhuBase))) {
          sk.jianweizhizhuBase = Number.isFinite(legacy) ? legacy : 0;
        }
        delete sk.jianweizhizhu;
      }
      if (!Number.isFinite(sk.jianweizhizhuBase)) sk.jianweizhizhuBase = 0;
      if (!Number.isFinite(sk.studyMinutes)) sk.studyMinutes = 0;
    });
    if (typeof player.studyTargetId !== 'string') player.studyTargetId = '';
    if (player.studyTargetId && !player.skills.some(s => s && s.id === player.studyTargetId)) {
      player.studyTargetId = '';
    }
    /* 旧存档补发九思剑法（初始武功之一） */
    if (!player.skills.some(s => s && s.id === 'jiusi')) {
      player.skills.push({ id: 'jiusi', name: '九思剑法', type: '剑法', level: 1, exp: 0 });
    }
    if (player.trainingSelections && typeof player.trainingSelections === 'object') {
      Object.keys(player.trainingSelections).forEach(k => {
        const v = player.trainingSelections[k];
        if (SKILL_ID_MIGRATION[v]) player.trainingSelections[k] = SKILL_ID_MIGRATION[v];
      });
    }
    if (!player.trainingSelections) player.trainingSelections = { '招式':'zhenshan', '轻功':'', '外功':'qiangshen', '内功':'tanafa' };
    if (typeof player.trainingActivity !== 'string') player.trainingActivity = '';
    if (TRAINING_ACTIVITY[player.trainingActivity]) {
      // 以当前活动配置为准，旧存档也能立即用上新的交互效率
      player.trainingInteractionEfficiency = TRAINING_ACTIVITY[player.trainingActivity].interactionEfficiency;
    } else if (typeof player.trainingInteractionEfficiency !== 'number') {
      player.trainingInteractionEfficiency = 0;
    }
    if (typeof player.trainingOtherBonus !== 'number') player.trainingOtherBonus = 1;
    player.trainingLastTick = Date.now();
    if (typeof player.neiLi !== 'number') player.neiLi = 0;
    if (typeof player.zi !== 'string') player.zi = '';
    if (typeof player.gender !== 'string') player.gender = '男';
    if (typeof player.luck !== 'number') player.luck = 5;
    if (typeof player.bondXiaPuying !== 'number') player.bondXiaPuying = 50;
    if (!Number.isFinite(Number(player.bondXiaPuying)) || Number(player.bondXiaPuying) <= 0) player.bondXiaPuying = 50;
    if (!Number.isFinite(Number(player.bondPeiWenxiu)) || Number(player.bondPeiWenxiu) < 0) player.bondPeiWenxiu = 0;
    if (typeof player.companionId !== 'string' || !player.companionId) player.companionId = BOND_SPAR_ID;
    if (typeof player.hidden !== 'number' || !Number.isFinite(player.hidden)) player.hidden = 0;
    if (typeof player.changbing !== 'number' || !Number.isFinite(player.changbing)) player.changbing = 0;
    if (typeof player.qimen !== 'number' || !Number.isFinite(player.qimen)) player.qimen = 0;
    if (typeof player.medicine !== 'number' || !Number.isFinite(player.medicine)) player.medicine = 0;
    let medicineLessons = Number(player.medicineLessonCount);
    if (!Number.isFinite(medicineLessons) || medicineLessons < 0) medicineLessons = 0;
    player.medicineLessonCount = Math.floor(medicineLessons);
    if (typeof player.speed !== 'number') player.speed = 0.15;
    if (!Number.isFinite(Number(player.bonusHpRegen)) || Number(player.bonusHpRegen) < 0) player.bonusHpRegen = 0;
    if (typeof player.offlineEarnings !== 'boolean') player.offlineEarnings = true;
    const savedBonusMs = Number(player.offlineBonusMs);
    player.offlineBonusMs = Number.isFinite(savedBonusMs) && savedBonusMs > 0 ? savedBonusMs : 0;
    player.offlineBonusPaused = Boolean(player.offlineBonusPaused);
    if (!player.dream || typeof player.dream !== 'object') player.dream = {};
    if (!player.dream.cleared || typeof player.dream.cleared !== 'object') player.dream.cleared = {};
    if (!player.npcLevels || typeof player.npcLevels !== 'object') player.npcLevels = {};
    if (!player.sparCd || typeof player.sparCd !== 'object') player.sparCd = {};
    Object.keys(player.sparCd).forEach(k => {
      if (!Number.isFinite(Number(player.sparCd[k]))) delete player.sparCd[k];
    });
    if (!player.teachCd || typeof player.teachCd !== 'object') player.teachCd = {};
    Object.keys(player.teachCd).forEach(k => {
      if (!Number.isFinite(Number(player.teachCd[k]))) delete player.teachCd[k];
    });
    battle.stage = data.battleStage || 1;
    battle.enemies = [];
    battle.allies = [];
    battle.over = false;
    battle.forfeited = false;
    battle.sparNpcId = '';
    battle.dreamId = '';
    battle.storyBattleId = '';
    battle.whiteRobe = null;
    battle.lastWeirdPoisonAt = 0;
    player.maxHp = getMaxHp();
    player.hp = player.maxHp;

    if (typeof data.storyFinished === 'boolean') {
      storyFinished = data.storyFinished;
    } else if (data.story && data.story.phase === 'done') {
      storyFinished = true;
    } else {
      storyFinished = false;
    }

    if (data.storyFlags && typeof data.storyFlags === 'object') {
      Object.assign(storyFlags, data.storyFlags);
    }
    if (getFishingTechnique() || storyFlags.fishingUnlocked) ensureFishingTechnique();
    if (getPaodingTechnique() || storyFlags.cookingUnlocked) ensurePaodingTechnique();

    if (Array.isArray(data.intelLogs)) {
      const now = Date.now();
      intelLogs = data.intelLogs
        .filter(x => x && typeof x.text === 'string')
        .map(x => ({
          time: x.time || currentTimeText(),
          text: x.text,
          cls: x.cls || '',
          tag: x.tag || '',
          ts: Number.isFinite(x.ts) ? x.ts : now
        }));
      pruneIntelLogs(now);
    }
    renderIntel();
    ensureBondChar();
    ensureStrategy();
    ensureBondStrategy();

    /* 取消原本的离线结算：将羁绊修炼/成长计时平移离线时长，避免重连后立刻补算离线期间的羁绊收益 */
    if (pendingOffline && pendingOffline.ms > 0) {
      const now = Date.now();
      if (Number.isFinite(Number(player.bond.lastCultAt)) && player.bond.lastCultAt > 0) {
        player.bond.lastCultAt = Math.min(now, player.bond.lastCultAt + pendingOffline.ms);
      } else {
        player.bond.lastCultAt = now;
      }
      if (Number.isFinite(Number(player.bond.lastGrowthAt)) && player.bond.lastGrowthAt > 0) {
        player.bond.lastGrowthAt = Math.min(now, player.bond.lastGrowthAt + pendingOffline.ms);
      } else {
        player.bond.lastGrowthAt = now;
      }
    }

    if (storyFlags.leftVillage && !storyFlags.arrivedCapital) {
      if (typeof cancelFishing === 'function') cancelFishing();
      if (player.trainingActivity && player.trainingActivity !== 'internal') {
        player.trainingActivity = '';
        player.trainingInteractionEfficiency = 0;
        player.trainingLastTick = 0;
      }
    }

    updateMapView();
    updateFishingBtn();
    updateLuoyingBtn();
    updateLiQianyuanNpc();
    updateShutongNpc();
    updateXiaPuyingHomeNpc();
    updateBuSuzhikeNpc();
    updatePeiWenxiuHomeNpc();
    updateDepartBtn();
    updateArriveBtn();
    renderBag();
    renderBondPanel();
    return true;
  } catch(e) {
    console.error('存档损坏', e);
    return false;
  }
}

function resetGame() {
  if (confirm('确定要重新开始吗？当前所有的进度将会丢失。')) {
    fishing.running = false;
    fishing.nextStartAt = 0;
    resetFishingBtn();

    cookingState.running = false;
    cookingState.selected = {};
    cookingState.pending = [];
    const ov = $('cookingOverlay');
    if (ov) ov.classList.remove('show');

    localStorage.removeItem('wuxia_save_v1');
    player.surname = '';
    player.givenName = '';
    player.zi = '';
    player.gender = '男';
    player.root = 5;
    player.comp = 5;
    player.luck = 5;
    player.constitution = 3;
    player.neiLi = 0;
    player.skills = [];
    player.techniques = [];
    player.inventory = [];
    player.medicineLessonCount = 0;
    player.cookCount = 0;
    player.changbing = 0;
    player.qimen = 0;
    player.hidden = 0;
    player.trainingActivity = '';
    player.trainingInteractionEfficiency = 0;
    player.trainingOtherBonus = 1;
    player.trainingLastTick = 0;
    player.trainingSelections = { '招式':'zhenshan', '轻功':'', '外功':'qiangshen', '内功':'tanafa' };

    alloc.root = 5;
    alloc.comp = 5;
    alloc.luck = 5;
    selectedGender = '男';
    document.querySelectorAll('.gender-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.gender === '男');
    });
    $('surname').value = '王';
    $('givenName').value = '二狗';
    $('zi').value = '';
    renderAlloc();

    storyFinished = false;
    mainView = 'story';
    storyFlags.fishingUnlocked = false;
    storyFlags.firstFishCaught = false;
    storyFlags.cookingUnlocked = false;
    storyFlags.chuilunObtained = false;
    storyFlags.luoyingHint = false;
    storyFlags.luoyingDone = false;
    storyFlags.qingyuanObtained = false;
    storyFlags.liQianyuanUnlocked = false;
    storyFlags.liQianyuanTalked = false;
    storyFlags.liQianyuanDefeated = false;
    storyFlags.xuanlanLearned = false;
    storyFlags.fishRefusedOnce = false;
    storyFlags.fishCookedBond = false;
    storyFlags.fishReviewDone = false;
    storyFlags.huomaiLearned = false;
    storyFlags.homeTalkDone = false;
    storyFlags.peiAskedBreak = false;
    storyFlags.peiAskedLotus = false;
    storyFlags.peiSparWinBond = false;
    storyFlags.peiLeaveBond = false;
    storyFlags.peiStoryDone = false;
    storyFlags.peiPostTalkDone = false;
    storyFlags.departUnlocked = false;
    storyFlags.leftVillage = false;
    storyFlags.arrivedCapital = false;
    storyFlags.farewellTiezhu = false;
    storyFlags.farewellShip = false;
    storyFlags.farewellDaifu = false;
    storyFlags.farewellDaifuJinzhen = false;
    storyFlags.farewellLiQianyuan = false;
    storyFlags.farewellShutong = false;
    storyFlags.farewellShutongExtort = false;
    storyFlags.carriagePeiAboutBond = false;
    storyFlags.carriagePeiLotusBond = false;
    pendingLuoyingHint = false;
    closeDepartModal();
    closeArriveModal();
    player.bondXiaPuying = 50;
    player.bondPeiWenxiu = 0;
    player.companionId = BOND_SPAR_ID;
    player.fist = 0;
    player.blade = 0;
    player.sword = 0;
    player.changbing = 0;
    player.qimen = 0;
    player.hidden = 0;
    player.medicine = 0;
    player.medicineLessonCount = 0;
    player.constitution = 3;
    player.speed = 0.15;
    player.bonusHpRegen = 0;
    player.offlineEarnings = true;
    player.offlineBonusMs = 0;
    player.offlineBonusPaused = false;
    if (typeof resetOfflineClock === 'function') resetOfflineClock();
    if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
    player.dream = { cleared: {} };
    player.npcLevels = {};
    player.sparCd = {};
    player.teachCd = {};
    player.strategy = defaultStrategy();
    player.bondStrategy = defaultStrategy();
    player.studyTargetId = '';
    resetBondChar();
    if (dialogTimer) { clearInterval(dialogTimer); dialogTimer = null; }
    $('dialogText').innerHTML = '';
    $('dialogOptions').innerHTML = '';
    $('dialogOptions').classList.remove('show');
    updateMapView();
    updateFishingBtn();
    updateLuoyingBtn();
    updateLiQianyuanNpc();
    updateShutongNpc();
    updateXiaPuyingHomeNpc();
    updateBuSuzhikeNpc();
    updatePeiWenxiuHomeNpc();
    updateDepartBtn();
    updateArriveBtn();
    renderBag();

    intelLogs = [];
    renderIntel();

    clearStoryBattleEndTimer();
    pauseBattle();
    battle.stage = 1;
    battle.enemies = [];
    battle.allies = [];
    battle.over = false;
    battle.forfeited = false;
    battle.sparNpcId = '';
    battle.dreamId = '';
    battle.storyBattleId = '';
    battle.whiteRobe = null;
    battle.lastWeirdPoisonAt = 0;

    $('gameScreen').classList.remove('active');
    $('createScreen').classList.add('active');
  }
}

$('resetBtn').addEventListener('click', resetGame);
window.addEventListener('beforeunload', saveGame);

/* ================= 存档导出与导入 ================= */
let pendingImportSaveData = null;

function decodeSaveText(raw) {
  const trimmed = String(raw == null ? '' : raw).trim();
  if (!trimmed) return null;
  let parsed = null;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    try {
      const bin = atob(trimmed.replace(/\s+/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const jsonStr = new TextDecoder().decode(bytes);
      parsed = JSON.parse(jsonStr);
    } catch (e2) {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  if (!parsed.player || typeof parsed.player !== 'object') return null;
  if (typeof parsed.player.surname !== 'string' || !parsed.player.surname.trim()) return null;
  return parsed;
}

function exportSaveFile() {
  const payload = buildSavePayload();
  if (!payload) {
    showToast('当前暂无角色存档可导出');
    return;
  }
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fullName = (player.surname || '') + (player.givenName || '');
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `wuxia_save_${fullName || 'backup'}_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('存档文件已导出');
}

function openSaveTransferModal() {
  const modal = $('saveTransferModal');
  if (!modal) return;
  const textarea = $('saveTransferText');
  if (textarea) {
    const payload = buildSavePayload();
    textarea.value = payload ? JSON.stringify(payload) : '';
  }
  modal.classList.add('show');
}

function closeSaveTransferModal() {
  const modal = $('saveTransferModal');
  if (modal) modal.classList.remove('show');
}

function copySaveTextFromModal() {
  const textarea = $('saveTransferText');
  const payload = buildSavePayload();
  if (!payload) {
    showToast('当前暂无角色存档可导出');
    return;
  }
  const text = JSON.stringify(payload);
  if (textarea) {
    textarea.value = text;
    textarea.focus();
    textarea.select();
  }
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(() => {
      showToast('存档文本已复制到剪贴板');
    }).catch(() => {
      try {
        if (document.execCommand('copy')) showToast('存档文本已复制到剪贴板');
        else showToast('已生成存档文本，请手动复制');
      } catch (err) {
        showToast('已生成存档文本，请手动复制');
      }
    });
    return;
  }
  try {
    if (document.execCommand('copy')) showToast('存档文本已复制到剪贴板');
    else showToast('已生成存档文本，请手动复制');
  } catch (err) {
    showToast('已生成存档文本，请手动复制');
  }
}

function openSaveImportConfirm(data) {
  pendingImportSaveData = data;
  const modal = $('saveImportConfirmModal');
  if (!modal) {
    applyImportedSave(data);
    return;
  }
  const desc = $('saveImportConfirmDesc');
  if (desc) {
    const name = `${data.player.surname || ''}${data.player.givenName || ''}`.trim() || '未知侠客';
    desc.textContent = `确认导入角色【${name}】的存档吗？导入后将直接覆盖当前角色进度。`;
  }
  modal.classList.add('show');
}

function closeSaveImportConfirm() {
  pendingImportSaveData = null;
  const modal = $('saveImportConfirmModal');
  if (modal) modal.classList.remove('show');
}

function requestImportSaveText(rawText) {
  const parsed = decodeSaveText(rawText);
  if (!parsed) {
    showToast('存档内容无效或格式错误');
    return false;
  }
  openSaveImportConfirm(parsed);
  return true;
}

function applyImportedSave(data) {
  if (!data || typeof data !== 'object' || !data.player || !data.player.surname) {
    showToast('存档数据无效，导入失败');
    return false;
  }

  clearStoryBattleEndTimer();
  pauseBattle();
  stopBattleEngine();
  battle.enemies = [];
  battle.allies = [];
  battle.over = false;
  battle.forfeited = false;
  battle.sparNpcId = '';
  battle.dreamId = '';
  battle.storyBattleId = '';
  battle.whiteRobe = null;
  battle.lastWeirdPoisonAt = 0;
  battle.pozhan = 0;

  if (typeof cancelFishing === 'function') cancelFishing();
  else {
    fishing.running = false;
    fishing.nextStartAt = 0;
    if (typeof resetFishingBtn === 'function') resetFishingBtn();
  }

  if (typeof cookingState !== 'undefined' && cookingState) {
    cookingState.running = false;
    cookingState.selected = {};
    cookingState.pending = [];
  }
  const cookOv = $('cookingOverlay');
  if (cookOv) cookOv.classList.remove('show');

  if (dialogTimer) { clearInterval(dialogTimer); dialogTimer = null; }
  dialogSkipFn = null;
  waitClickActive = false;

  ['bagModal', 'bondModal', 'departModal', 'arriveModal', 'strategyOverlay', 'bondBattleStrategyOverlay', 'studyOverlay', 'saveTransferModal', 'saveImportConfirmModal'].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove('show');
  });

  Object.keys(storyFlags).forEach(k => { storyFlags[k] = false; });
  pendingLuoyingHint = false;
  intelLogs = [];

  const copyPayload = Object.assign({}, data, { lastActiveAt: Date.now() });
  try {
    localStorage.setItem('wuxia_save_v1', JSON.stringify(copyPayload));
  } catch (err) {
    showToast('写入本地存储失败');
    return false;
  }

  if (!loadGame()) {
    showToast('存档解析失败，未能导入');
    return false;
  }

  pendingOffline = null;
  if (typeof resetOfflineClock === 'function') resetOfflineClock();
  const impClk = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  lastStudyTickAt = impClk;
  lastBondNeiLiTime = impClk;
  if (typeof lastNeiLiTime !== 'undefined') lastNeiLiTime = impClk;
  if (typeof lastTrainingClockMs !== 'undefined') lastTrainingClockMs = 0;

  mainView = storyFinished ? 'village' : 'story';
  $('createScreen').classList.remove('active');
  $('gameScreen').classList.add('active');

  updateAttrUI();
  renderSkills();
  renderTechniques();
  if (typeof renderCombatTechniques === 'function') renderCombatTechniques();
  renderBag();
  renderBondPanel();
  if (typeof renderDreamPanel === 'function') renderDreamPanel();
  renderSettings();
  renderBattleIdle();
  updateTrainingUI();
  updateNeiLiDisplays();
  if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
  switchTab('settings');
  saveGame();
  showToast('存档导入成功');
  return true;
}

const exportSaveFileBtnEl = $('exportSaveFileBtn');
if (exportSaveFileBtnEl) {
  exportSaveFileBtnEl.addEventListener('click', exportSaveFile);
}
const importSaveFileBtnEl = $('importSaveFileBtn');
const importSaveFileInputEl = $('importSaveFileInput');
if (importSaveFileBtnEl && importSaveFileInputEl) {
  importSaveFileBtnEl.addEventListener('click', () => {
    importSaveFileInputEl.value = '';
    importSaveFileInputEl.click();
  });
  importSaveFileInputEl.addEventListener('change', () => {
    const file = importSaveFileInputEl.files && importSaveFileInputEl.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => requestImportSaveText(String(reader.result || ''));
    reader.onerror = () => showToast('读取存档文件失败');
    reader.readAsText(file, 'utf-8');
  });
}
const openSaveTextModalBtnEl = $('openSaveTextModalBtn');
if (openSaveTextModalBtnEl) {
  openSaveTextModalBtnEl.addEventListener('click', openSaveTransferModal);
}
const copySaveTextBtnEl = $('copySaveTextBtn');
if (copySaveTextBtnEl) {
  copySaveTextBtnEl.addEventListener('click', copySaveTextFromModal);
}
const applySaveTextBtnEl = $('applySaveTextBtn');
if (applySaveTextBtnEl) {
  applySaveTextBtnEl.addEventListener('click', () => {
    const textarea = $('saveTransferText');
    requestImportSaveText(textarea ? textarea.value : '');
  });
}
const closeSaveTextModalBtnEl = $('closeSaveTextModalBtn');
if (closeSaveTextModalBtnEl) {
  closeSaveTextModalBtnEl.addEventListener('click', closeSaveTransferModal);
}
const saveTransferModalEl = $('saveTransferModal');
if (saveTransferModalEl) {
  saveTransferModalEl.addEventListener('click', e => {
    if (e.target === saveTransferModalEl) closeSaveTransferModal();
  });
}
const saveImportConfirmBtnEl = $('saveImportConfirmBtn');
if (saveImportConfirmBtnEl) {
  saveImportConfirmBtnEl.addEventListener('click', () => {
    const data = pendingImportSaveData;
    closeSaveImportConfirm();
    if (data) applyImportedSave(data);
  });
}
const saveImportCancelBtnEl = $('saveImportCancelBtn');
if (saveImportCancelBtnEl) {
  saveImportCancelBtnEl.addEventListener('click', closeSaveImportConfirm);
}
const saveImportConfirmModalEl = $('saveImportConfirmModal');
if (saveImportConfirmModalEl) {
  saveImportConfirmModalEl.addEventListener('click', e => {
    if (e.target === saveImportConfirmModalEl) closeSaveImportConfirm();
  });
}

function applyFontSettings(save = false) {
  const size = Number($('fontSize').value || 1.1);
  document.documentElement.style.setProperty('--font-scale', size);
  $('fontSizeValue').textContent = Math.round(size * 100) + '%';
  if (save) {
    try { localStorage.setItem('wuxia_ui_settings', JSON.stringify({ size })); } catch(e) {}
  }
}
function loadFontSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('wuxia_ui_settings') || '{}');
    if (saved.size) $('fontSize').value = Math.min(1.4, Math.max(1, Number(saved.size)));
  } catch(e) {}
  applyFontSettings(false);
}
$('fontSize').addEventListener('input', () => applyFontSettings(true));
loadFontSettings();

function renderSettings() {
  const toggle = $('offlineEarningsToggle');
  if (toggle) toggle.checked = player.offlineEarnings !== false;
  const pauseToggle = $('offlineBonusPauseToggle');
  if (pauseToggle) pauseToggle.checked = Boolean(player.offlineBonusPaused);
  if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
}

const offlineEarningsToggleEl = $('offlineEarningsToggle');
if (offlineEarningsToggleEl) {
  offlineEarningsToggleEl.addEventListener('change', () => {
    player.offlineEarnings = !!offlineEarningsToggleEl.checked;
    saveGame();
    showToast(player.offlineEarnings ? '离线奖励时间已开启' : '离线奖励时间已关闭');
  });
}

const offlineBonusPauseToggleEl = $('offlineBonusPauseToggle');
if (offlineBonusPauseToggleEl) {
  offlineBonusPauseToggleEl.addEventListener('change', () => {
    if (typeof setOfflineBonusPaused === 'function') {
      setOfflineBonusPaused(!!offlineBonusPauseToggleEl.checked);
    } else {
      player.offlineBonusPaused = !!offlineBonusPauseToggleEl.checked;
      saveGame();
    }
  });
}

const offlineBonusBadgeEl = $('offlineBonusBadge');
if (offlineBonusBadgeEl) {
  offlineBonusBadgeEl.addEventListener('click', () => {
    if (typeof toggleOfflineBonusPause === 'function') toggleOfflineBonusPause();
  });
}

function switchTab(tab) {
  document.querySelectorAll('.topbar button').forEach(b => {
    if(b.dataset.tab) b.classList.toggle('active', b.dataset.tab === tab);
  });
  $('mainTab').classList.toggle('hidden', tab !== 'main');
  $('attrTab').classList.toggle('hidden', tab !== 'attr');
  $('skillTab').classList.toggle('hidden', tab !== 'skill');
  $('techniqueTab').classList.toggle('hidden', tab !== 'technique');
  $('battleTab').classList.toggle('hidden', tab !== 'battle');
  $('bondTab').classList.toggle('hidden', tab !== 'bond');
  $('dreamTab').classList.toggle('hidden', tab !== 'dream');
  $('bagTab').classList.toggle('hidden', tab !== 'bag');
  $('settingsTab').classList.toggle('hidden', tab !== 'settings');

  if (tab === 'main') renderMainTab();
  if (tab === 'attr') updateAttrUI();
  if (tab === 'skill') renderSkills();
  if (tab === 'technique') renderTechniques();
  if (tab === 'bag') renderBag();
  if (tab === 'bond') renderBondPanel();
  if (tab === 'dream') renderDreamPanel();
  if (tab === 'settings') renderSettings();

  if (tab === 'battle') {
    if (!battle.enemies.length) {
      renderBattleIdle();
    } else {
      updateBattleUI();
      if (!battle.over) resumeBattle();
    }
  } else if (battleActive()) {
    if (!battleRunning) resumeBattle();
  }
}

document.querySelectorAll('.topbar button').forEach(btn => {
  if(btn.dataset.tab) {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  }
});

$('battlePauseBtn').addEventListener('click', () => {
  const btn = $('battlePauseBtn');
  if (battleRunning) {
    pauseBattle();
    btn.textContent = '恢 复 战 斗';
  } else {
    resumeBattle();
    btn.textContent = '暂 停 战 斗';
  }
});

$('battleLeaveBtn').addEventListener('click', () => {
  clearStoryBattleEndTimer();
  pauseBattle();
  battle.enemies = [];
  battle.allies = [];
  battle.over = false;
  battle.forfeited = false;
  battle.sparNpcId = '';
  battle.dreamId = '';
  battle.storyBattleId = '';
  battle.whiteRobe = null;
  battle.lastWeirdPoisonAt = 0;
  battle.pozhan = 0;
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) { forfeitBtn.style.display = 'none'; forfeitBtn.textContent = '放 弃 战 斗'; }
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) { pauseBtn.style.display = 'none'; pauseBtn.textContent = '暂 停 战 斗'; }
  if (typeof restorePreBattleAction === 'function') restorePreBattleAction();
  renderBattleIdle();
  switchTab('main');
});

let forfeitConfirmAt = 0;
$('battleForfeitBtn').addEventListener('click', () => {
  if (!battleActive()) return;
  const btn = $('battleForfeitBtn');
  if (Date.now() >= forfeitConfirmAt) {
    forfeitConfirmAt = Date.now() + 2500;
    if (btn) btn.textContent = '再点一次确认放弃';
    setTimeout(() => {
      if (btn && Date.now() >= forfeitConfirmAt) btn.textContent = '放 弃 战 斗';
    }, 2600);
    return;
  }
  forfeitConfirmAt = 0;
  if (btn) btn.textContent = '放 弃 战 斗';
  forfeitBattle();
});

$('startBtn').addEventListener('click', () => {
  const surname = $('surname').value.trim();
  const givenName = $('givenName').value.trim();
  const zi = $('zi').value.trim();
  if (!surname || !givenName || !zi || remainPoints() !== 0) return;

  storyFlags.fishingUnlocked = false;
  storyFlags.firstFishCaught = false;
  storyFlags.cookingUnlocked = false;
  storyFlags.chuilunObtained = false;
  storyFlags.luoyingHint = false;
  storyFlags.luoyingDone = false;
  storyFlags.qingyuanObtained = false;
  storyFlags.fishRefusedOnce = false;
  storyFlags.fishCookedBond = false;
  storyFlags.fishReviewDone = false;
  storyFlags.huomaiLearned = false;
  storyFlags.homeTalkDone = false;
  storyFlags.xuanlanLearned = false;
  storyFlags.peiAskedBreak = false;
  storyFlags.peiAskedLotus = false;
  storyFlags.peiSparWinBond = false;
  storyFlags.peiLeaveBond = false;
  storyFlags.peiStoryDone = false;
  storyFlags.peiPostTalkDone = false;
  storyFlags.departUnlocked = false;
  storyFlags.leftVillage = false;
  storyFlags.arrivedCapital = false;
  storyFlags.farewellTiezhu = false;
  storyFlags.farewellShip = false;
  storyFlags.farewellDaifu = false;
  storyFlags.farewellDaifuJinzhen = false;
  storyFlags.farewellLiQianyuan = false;
  storyFlags.farewellShutong = false;
  storyFlags.farewellShutongExtort = false;
  storyFlags.carriagePeiAboutBond = false;
  storyFlags.carriagePeiLotusBond = false;
  pendingLuoyingHint = false;

  player.surname = surname;
  player.givenName = givenName;
  player.zi = zi;
  player.gender = selectedGender;
  player.root = alloc.root;
  player.comp = alloc.comp;
  player.luck = alloc.luck;
  player.constitution = 3;
  player.fist = 0;
  player.blade = 0;
  player.sword = 0;
  player.changbing = 0;
  player.qimen = 0;
  player.hidden = 0;
  player.medicine = 0;
  player.medicineLessonCount = 0;
  player.cookCount = 0;
  player.neiLi = 0;
  player.bonusHpRegen = 0;
  player.offlineEarnings = true;
  player.offlineBonusMs = 0;
  player.offlineBonusPaused = false;
  if (typeof resetOfflineClock === 'function') resetOfflineClock();
  if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
  const startClk = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  lastStudyTickAt = startClk;
  lastBondNeiLiTime = startClk;
  if (typeof lastNeiLiTime !== 'undefined') lastNeiLiTime = startClk;
  if (typeof lastTrainingClockMs !== 'undefined') lastTrainingClockMs = 0;
  player.dream = { cleared: {} };
  player.teachCd = {};
  player.trainingActivity = '';
  player.trainingInteractionEfficiency = 0;
  player.trainingOtherBonus = 1;
  player.trainingSelections = { '招式':'zhenshan', '轻功':'', '外功':'qiangshen', '内功':'tanafa' };
  player.trainingLastTick = Date.now();
  player.inventory = [];
  player.techniques = [];
  player.bondXiaPuying = 50;
  player.bondPeiWenxiu = 0;
  player.companionId = BOND_SPAR_ID;
  player.bond = { neiLi: 0, levels: { qingyuan: 9, feishipo: 7, tanafa: 7 }, lastCultAt: Date.now(), lastGrowthAt: Date.now() };
  player.strategy = defaultStrategy();
  player.bondStrategy = defaultStrategy();
  player.speed = 0.15;
  initSkills();
  player.maxHp = getMaxHp();
  player.hp = player.maxHp;

  storyFinished = false;
  mainView = 'story';

  intelLogs = [];
  renderIntel();

  saveGame();

  $('createScreen').classList.remove('active');
  $('gameScreen').classList.add('active');

  updateAttrUI();
  renderSkills();
  renderBondPanel();
  updateMapView();
  updateFishingBtn();
  updateLuoyingBtn();
  updateLiQianyuanNpc();
  updateShutongNpc();
  updateXiaPuyingHomeNpc();
  updateBuSuzhikeNpc();
  updatePeiWenxiuHomeNpc();
  updateDepartBtn();
  updateArriveBtn();
  switchTab('main');
});

const skillTechBtnEl = $('skillTechBtn');
if (skillTechBtnEl) {
  skillTechBtnEl.addEventListener('click', () => {
    const panel = $('skillCombatTechPanel');
    if (!panel) return;
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    skillTechBtnEl.classList.toggle('active', opening);
    if (opening) renderCombatTechniques();
  });
}
const skillStrategyBtnEl = $('skillStrategyBtn');
if (skillStrategyBtnEl) {
  skillStrategyBtnEl.addEventListener('click', openStrategy);
}
const strategyCloseBtnEl = $('strategyCloseBtn');
if (strategyCloseBtnEl) {
  strategyCloseBtnEl.addEventListener('click', closeStrategy);
}
const strategySaveBtnEl = $('strategySaveBtn');
if (strategySaveBtnEl) {
  strategySaveBtnEl.addEventListener('click', saveStrategyFromUI);
}
const strategyOverlayEl = $('strategyOverlay');
if (strategyOverlayEl) {
  strategyOverlayEl.addEventListener('click', e => {
    if (e.target === strategyOverlayEl) closeStrategy();
  });
}

const bondBattleStrategyBtnEl = $('bondBattleStrategyBtn');
if (bondBattleStrategyBtnEl) {
  bondBattleStrategyBtnEl.addEventListener('click', openBondBattleStrategy);
}
const bondBattleStrategyCloseBtnEl = $('bondBattleStrategyCloseBtn');
if (bondBattleStrategyCloseBtnEl) {
  bondBattleStrategyCloseBtnEl.addEventListener('click', closeBondBattleStrategy);
}
const bondBattleStrategySaveBtnEl = $('bondBattleStrategySaveBtn');
if (bondBattleStrategySaveBtnEl) {
  bondBattleStrategySaveBtnEl.addEventListener('click', saveBondBattleStrategyFromUI);
}
const bondBattleStrategyOverlayEl = $('bondBattleStrategyOverlay');
if (bondBattleStrategyOverlayEl) {
  bondBattleStrategyOverlayEl.addEventListener('click', e => {
    if (e.target === bondBattleStrategyOverlayEl) closeBondBattleStrategy();
  });
}

const skillStudyBtnEl = $('skillStudyBtn');
if (skillStudyBtnEl) {
  skillStudyBtnEl.addEventListener('click', openStudy);
}
const studyCloseBtnEl = $('studyCloseBtn');
if (studyCloseBtnEl) {
  studyCloseBtnEl.addEventListener('click', closeStudy);
}
const studyOverlayEl = $('studyOverlay');
if (studyOverlayEl) {
  studyOverlayEl.addEventListener('click', e => {
    if (e.target === studyOverlayEl) closeStudy();
  });
}
const studyListEl = $('studyList');
if (studyListEl) {
  studyListEl.addEventListener('click', e => {
    const row = e.target.closest('.study-row');
    if (!row) return;
    selectStudyTarget(row.dataset.skillId);
  });
}

function bootGame() {
  if (loadGame()) {
    const offlineReport = consumePendingOffline();
    const bootClk = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
    lastStudyTickAt = bootClk;
    lastBondNeiLiTime = bootClk;
    if (typeof lastNeiLiTime !== 'undefined') lastNeiLiTime = bootClk;
    if (typeof lastTrainingClockMs !== 'undefined') lastTrainingClockMs = 0;
    mainView = storyFinished ? 'village' : 'story';
    $('createScreen').classList.remove('active');
    $('gameScreen').classList.add('active');
    updateAttrUI();
    renderSkills();
    renderBag();
    renderBondPanel();
    updateFishingBtn();
    updateLuoyingBtn();
    switchTab('main');
    if (offlineReport) {
      if (typeof showOfflineBonusNotice === 'function') showOfflineBonusNotice(offlineReport);
      else if (typeof showOfflineReport === 'function') showOfflineReport(offlineReport);
    }
  }
  if (typeof updateOfflineBonusUI === 'function') updateOfflineBonusUI();
  renderBattleIdle();
  renderBondPanel();
  renderIntel();
  updateNeiLiDisplays();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}