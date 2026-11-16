/* 武功修炼（从 game.js 拆出，需在 game.js 之前加载） */
const SKILL_REQUIREMENTS = {
  zhenshan: { '体魄': 10 },
  jiusi: { '悟性': 4, '剑法': 7, '内力': 30 },
  feishipo: { '暗器': 9 },
  paodingDao: { '刀法': 9, '悟性': 3 },
  qiangshen: { '体魄': 8, '根骨': 6 },
  tanafa: { '内力': 15, '体魄': 4 },
  qingyuan: { '悟性': 8, '内力': 50 },
  huomai: { '内力': 100, '医术': 20 }
};
const SKILL_TYPES = ['招式','轻功','外功','内功'];

function skillMatchesCategory(skill, cat) {
  if (!skill) return false;
  if (cat === '招式') return ['招式', '拳法', '剑法', '刀法', '长兵', '奇门', '暗器'].includes(skill.type);
  return skill.type === cat;
}

const SKILL_DIFFICULTY = {
  zhenshan: 1.10,
  jiusi: 1.20,
  feishipo: 1.15,
  paodingDao: 1.05,
  qiangshen: 1.25,
  tanafa: 1.25,
  qingyuan: 1.30,
  huomai: 1.35
};
const SKILL_DEFAULT_DIFFICULTY = 1.00;

/* 原始难度系数：不受见微知著影响、不 clamp，缺失或非法时回退 1.00 */
function getOriginalDifficulty(skill) {
  let d = skill ? Number(SKILL_DIFFICULTY[skill.id]) : NaN;
  if (!Number.isFinite(d)) d = skill ? Number(skill.difficulty) : NaN;
  return Number.isFinite(d) && d > 0 ? d : SKILL_DEFAULT_DIFFICULTY;
}

/* 实际难度：不再随见微知著下降；见微知著改为降低修炼要求（见 getJwzzRequirementReduction） */
function getSkillDifficulty(skill) {
  return getOriginalDifficulty(skill);
}

/* 每秒基础见微知著获取量：按当前钻研武功的原始难度打折 */
function getJwzzGainPerSec(skill) {
  const comp = Number(player.comp) || 0;
  const nei = Number(player.neiLi) || 0;
  const martial = getBaseMartialSum();
  const base = 0.01 + (comp / 2000) * (1 + (nei + martial) / 1000000);
  return base / (getOriginalDifficulty(skill) * 2.5);
}

/* 在线钻研 tick：同一时间只钻研一门，与修炼/钓鱼/烹饪并行 */
function studyTick(dt) {
  if (!storyFlags.xuanlanLearned || !player.studyTargetId) return;
  const skill = (player.skills || []).find(s => s && s.id === player.studyTargetId);
  if (!skill) return;
  const seconds = Math.max(0, Number(dt) || 0);
  if (!seconds) return;
  const gain = getJwzzGainPerSec(skill) * seconds;
  skill.jianweizhizhuBase = (Number(skill.jianweizhizhuBase) || 0) + gain;
  skill.studyMinutes = (Number(skill.studyMinutes) || 0) + seconds / 60;
}
function getSkillDifficultyMultiplier(skill) {
  const d = getSkillDifficulty(skill);
  const n = Math.max(1, skill.level || 1);
  const value = d *  (d - 0.15) * (1 + n * 0.01 * d);
  return Number.isFinite(value) && value > 0 ? value : 1;
}
const TRAINING_ACTIVITY = {
  external: { label:'瀑布锻体', interactionEfficiency:35, cat:'外功', btnId:'trainExternalBtn' },
  internal: { label:'打坐入定', interactionEfficiency:25, cat:'内功', btnId:'trainInternalBtn' },
  dummy:    { label:'打木桩',   interactionEfficiency:25, cat:'招式', btnId:'trainDummyBtn' },
  plum:     { label:'梅花桩',   interactionEfficiency:25, cat:'轻功', btnId:'trainPlumBtn' }
};

function getSkillExpNeed(level, skill) {
  const n = Math.max(1, Number(level) || 1);
  const value = Math.pow(150 + n * 50 + 15 * n * (n-1), 1 + n / 250);
  const base = Number.isFinite(value) ? value : Number.MAX_VALUE;
  if (base === Number.MAX_VALUE) return base;
  return base * getSkillDifficultyMultiplier(skill);
}

/* ================= 玄览通微 · 见微知著降低修炼要求 =================
   减免比例 r = jwzz / (jwzz + K)，从 0 单调趋近 100% 但永不可达；
   导数 K/(jwzz+K)^2 递减，所以效率会越来越低。
   实际要求 = max(1, 原要求 × (1 - r))，最低降到 1。 */
const JWZZ_REQ_REDUCTION_K = 500;

function getJwzzRequirementReduction(skill) {
  const x = Math.max(0, getJwzzTotal(skill));
  return x / (x + JWZZ_REQ_REDUCTION_K);
}

function getEffectiveRequirement(skill, need) {
  const n = Number(need);
  if (!Number.isFinite(n) || n <= 0) return n;
  const ratio = getJwzzRequirementReduction(skill);
  return Math.max(1, n * (1 - ratio));
}

function getSkillAttributeBonus(skill) {
  if (!skill) return 1;
  if (skill.type === '外功' || skill.type === '内功') return 1 + getTotalRoot() * 0.03;
  if (skillMatchesCategory(skill, '招式') || skill.type === '轻功') return 1 + getTotalComp() * 0.03;
  return 1;
}
function getTrainingRequirementRatio(skill) {
  const req = SKILL_REQUIREMENTS[skill.id] || {};
  const actual = { '体魄': getTotalCon(), '内力': getTotalNeiLi(), '悟性': getTotalComp(), '根骨': getTotalRoot(), '定力': getTotalLuck(), '长兵': getTotalChangbing(), '奇门': getTotalQimen(), '暗器': getTotalHidden(), '医术': getTotalMedicine(), '剑法': getTotalSword(), '刀法': getTotalBlade() };
  const entries = Object.entries(req);
  if (!entries.length) return 1;
  const ratios = entries.map(([key, need]) => {
    const effNeed = getEffectiveRequirement(skill, need);
    return (Number(actual[key]) || 0) / effNeed;
  });
  return Math.max(0.01, ratios.reduce((a,b)=>a+b,0) / ratios.length);
}
function getSkillTrainingEfficiency(skill) {
  const base = getTrainingRequirementRatio(skill);
  if (skill && skill.id === 'qingyuan' && typeof getBondValue === 'function' && getBondValue() >= 50) {
    const bondChar = ensureBondChar();
    return base + 0.05 * (Number(bondChar.levels.qingyuan) || 0);
  }
  /* 【庖丁】：庖丁刀法的修炼效率提升 庖丁等级% */
  if (skill && skill.id === 'paodingDao') {
    return base * (1 + getPaodingLevel() / 100);
  }
  return base;
}
/* 在线与离线共用的武学修炼经验公式：(20 + 交互效率) × 修炼效率 × 属性加成 × 其他加成 × 2 */
const TRAINING_RATE_BASE = 20;
const TRAINING_RATE_MULTIPLIER = 2;
function getSkillTrainingExpPerMinute(skill, interactionEfficiency, otherBonus) {
  if (!skill) return 0;
  const efficiency = getSkillTrainingEfficiency(skill);
  const attributeBonus = getSkillAttributeBonus(skill);
  const inter = Number(interactionEfficiency) || 0;
  const other = Number(otherBonus);
  const safeOther = Number.isFinite(other) && other > 0 ? other : 1;
  const jwzz = getJwzzTotal(skill);
  return (TRAINING_RATE_BASE + inter) * efficiency * attributeBonus * safeOther
       * TRAINING_RATE_MULTIPLIER * (1 + jwzz * 0.01);
}
function getRequirementDetails(skill) {
  const req = SKILL_REQUIREMENTS[skill.id] || {};
  const actual = { '体魄': getTotalCon(), '内力': getTotalNeiLi(), '悟性': getTotalComp(), '根骨': getTotalRoot(), '定力': getTotalLuck(), '长兵': getTotalChangbing(), '奇门': getTotalQimen(), '暗器': getTotalHidden(), '医术': getTotalMedicine(), '剑法': getTotalSword(), '刀法': getTotalBlade() };
  return Object.entries(req).map(([key, need]) => {
    const effNeed = getEffectiveRequirement(skill, need);
    return `${key}${fmtRate(actual[key] || 0)}/${fmtRate(effNeed)}（${formatPercent(Math.max(0, (actual[key] || 0) / effNeed))}）`;
  }).join('、') || '无';
}
function addSkillExp(skill, amount) {
  if (!skill || !(amount > 0)) return;
  skill.exp = (Number(skill.exp) || 0) + amount;
  let guard = 0;
  let leveledUp = false;
  while (skill.exp >= getSkillExpNeed(skill.level, skill) && guard++ < 1000) {
    const need = getSkillExpNeed(skill.level, skill);
    skill.exp -= need;
    skill.level++;
    leveledUp = true;
  }
  if (leveledUp) saveGame();
}
function getTrainingSkillForActivity() {
  const act = TRAINING_ACTIVITY[player.trainingActivity];
  if (!act) return null;
  const cat = act.cat;
  const id = (player.trainingSelections || {})[cat];
  if (!id) return null;
  return player.skills.find(x => x.id === id && skillMatchesCategory(x, cat)) || null;
}
let lastTrainingClockMs = 0;

function startTraining(activity) {
  if (!TRAINING_ACTIVITY[activity]) return;
  if (battleActive()) {
    showToast('战斗中无法修炼');
    return;
  }
  if (getFishingLevel() < 100) cancelFishing();
  player.trainingActivity = activity;
  player.trainingInteractionEfficiency = TRAINING_ACTIVITY[activity].interactionEfficiency;
  player.trainingLastTick = Date.now();
  lastTrainingClockMs = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  const skill = getTrainingSkillForActivity();
  if (!skill) {
    player.trainingActivity = '';
    $('trainingStatus').textContent = '该类别尚未选择可修炼的武功。请先前往武功界面选择。';
  } else {
    $('trainingStatus').textContent = `正在${TRAINING_ACTIVITY[activity].label}，修炼：${skill.name}`;
  }
  document.querySelectorAll('.training-actions button').forEach(b=>b.classList.remove('active'));
  const btn = $(TRAINING_ACTIVITY[activity].btnId);
  if (player.trainingActivity && btn) btn.classList.add('active');
  const carriageBtn = $('trainInternalCarriageBtn');
  if (carriageBtn) carriageBtn.classList.toggle('active', player.trainingActivity === 'internal');
  saveGame();
  renderSkills();
}
function stopTraining() {
  if (!player.trainingActivity) return;
  player.trainingActivity = '';
  player.trainingInteractionEfficiency = 0;
  player.trainingLastTick = 0;
  lastTrainingClockMs = 0;
  document.querySelectorAll('.training-actions button').forEach(b => b.classList.remove('active'));
  updateTrainingUI();
}
function trainingTick() {
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  if (!lastTrainingClockMs) lastTrainingClockMs = now;
  const dt = Math.max(0, (now - lastTrainingClockMs) / 1000);
  lastTrainingClockMs = now;
  player.trainingLastTick = Date.now();
  const skill = getTrainingSkillForActivity();
  if (!skill || !player.trainingActivity) return;
  const perMinute = getSkillTrainingExpPerMinute(
    skill,
    player.trainingInteractionEfficiency,
    player.trainingOtherBonus
  );
  addSkillExp(skill, perMinute / 60 * dt);
}
function updateTrainingUI() {
  const status = $('trainingStatus');
  if (!status) return;

  if (fishing.running && player.trainingActivity && getFishingLevel() >= 100) {
    const concurrentSkill = getTrainingSkillForActivity();
    status.textContent = `正在溪边垂钓……｜同时${concurrentSkill ? `进行${TRAINING_ACTIVITY[player.trainingActivity].label} · ${concurrentSkill.name}` : '进行其他行动'}`;
  } else if (fishing.running) {
    status.textContent = `正在溪边垂钓……`;
  } else {
    const skill = getTrainingSkillForActivity();
    if (!player.trainingActivity || !skill) {
      status.textContent = '当前未开始修炼';
    } else {
      const need = getSkillExpNeed(skill.level, skill);
      const efficiency = getSkillTrainingEfficiency(skill);
      const rate = getSkillTrainingExpPerMinute(
        skill,
        player.trainingInteractionEfficiency,
        player.trainingOtherBonus
      );
      status.textContent = `正在${TRAINING_ACTIVITY[player.trainingActivity].label} · ${skill.name}（${skill.level}重）｜修炼效率 ${formatPercent(efficiency)}｜经验 ${Math.floor(skill.exp||0)} / ${Math.floor(need)}｜${rate.toFixed(2)} 经验/分钟`;
    }
  }

  document.querySelectorAll('.training-actions button').forEach(b=>b.classList.toggle('active',
    !!TRAINING_ACTIVITY[player.trainingActivity] &&
    (b.id === TRAINING_ACTIVITY[player.trainingActivity].btnId ||
      (player.trainingActivity === 'internal' && b.id === 'trainInternalCarriageBtn'))));
}
$('trainExternalBtn').addEventListener('click',()=>startTraining('external'));
$('trainInternalBtn').addEventListener('click',()=>startTraining('internal'));
const trainInternalCarriageBtnEl = $('trainInternalCarriageBtn');
if (trainInternalCarriageBtnEl) trainInternalCarriageBtnEl.addEventListener('click',()=>startTraining('internal'));
const trainDummyBtnEl = $('trainDummyBtn');
if (trainDummyBtnEl) trainDummyBtnEl.addEventListener('click',()=>startTraining('dummy'));
const trainPlumBtnEl = $('trainPlumBtn');
if (trainPlumBtnEl) trainPlumBtnEl.addEventListener('click',()=>startTraining('plum'));
