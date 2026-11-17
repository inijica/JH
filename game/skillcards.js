/* 武功/技艺卡片 UI（从 game.js 拆出，需在 game.js 之前加载） */
function renderUnlockList(unlocks, lv) {
  return unlocks.map(u => {
    const unlocked = lv >= u.level;
    return `<div class="unlock-item ${unlocked ? 'unlocked' : ''}">
      <span class="unlock-lv">${levelToChinese(u.level)}重</span>
      <span class="unlock-desc">${u.desc}</span>
    </div>`;
  }).join('');
}

function skillCardShell(s, bodyRows, unlockHtml) {
  const lv = s.level;
  const need = getSkillExpNeed(lv, s);
  const difficulty = getSkillDifficulty(s);
  const difficultyRate = getSkillDifficultyMultiplier(s);
  return `<div class="skill-card">
    <div class="skill-card-name">${s.name}（${levelToChinese(lv)}重）</div>
    <div class="skill-card-row">升级经验：<b>${Math.floor(s.exp || 0)} / ${Math.floor(need)}</b></div>
    <div class="skill-card-row">难度系数：<b>${difficulty.toFixed(2)}</b>　经验需求倍率：<b>×${difficultyRate.toFixed(2)}</b></div>
    <div class="skill-card-row">见微知著：<b>${fmtBondStat(getJwzzTotal(s))}</b>　修炼要求减免：<b>${formatPercent(getJwzzRequirementReduction(s))}</b></div>
    <div class="skill-exp"><div class="skill-exp-fill" style="width:${Math.min(100, (s.exp || 0) / need * 100)}%"></div></div>
    <div class="skill-train-meta">根骨/悟性修炼加成：${formatPercent(getSkillAttributeBonus(s))}　修炼效率：${formatPercent(getSkillTrainingEfficiency(s))}</div>
    <div class="skill-requirement">修炼要求：${getRequirementDetails(s)}</div>
    ${bodyRows}
    <div class="skill-unlocks">
      <div class="unlock-title">突 破 节 点</div>
      ${unlockHtml}
    </div>
  </div>`;
}

const SKILL_CARD_BUILDERS = {
  zhenshan: (s, lv) => {
    const st = getWangbaStats(lv);
    const zsMult = getPerLayerMult(getMartialSkillById('zhenshan'));
    const perLayerFist = Math.round(3 * zsMult);
    const perLayer = HANSHAN_CON_PER_LAYER * (lv >= 100 ? 2 : 1) * getTotalCon();
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">赵十二传给你的拳法，据说练成以后有震山荡海之威.....怎么听都是他胡诌的。</div>
      <div class="skill-card-row">每一重提升：拳法+${perLayerFist}</div>
      <div class="skill-card-row">伤害次数：<b>${st.hits}</b></div>
      <div class="skill-card-row">伤害倍率：<b>${st.multiplier}</b></div>
      <div class="skill-card-row">【撼山势】：施展后叠加 1 层，上限 <b>${HANSHAN_MAX_LAYERS}</b> 层${lv >= 100 ? '；战斗中每秒自动叠加 1 层' : ''}</div>
      <div class="skill-card-row">每层使攻击附加 <b>${HANSHAN_CON_PER_LAYER}×体魄</b> 的基础伤害（计入攻防计算）${lv >= 100 ? `，百重翻倍为 <b>${fmtBondStat(HANSHAN_CON_PER_LAYER * 2)}×体魄</b>` : ''}</div>
      <div class="skill-card-row">当前每层附加：<b>${fmtNum(Math.round(perLayer * 100) / 100)}</b>　满层附加：<b>${fmtNum(Math.round(perLayer * HANSHAN_MAX_LAYERS * 10) / 10)}</b></div>`;
    return { rows, unlockHtml: renderUnlockList(WANGBA_UNLOCKS, lv) };
  },

  jiusi: (s, lv) => {
    const st = getJiusiStats(lv);
    const jsMult = getPerLayerMult(getMartialSkillById('jiusi'));
    const perLayerSword = Math.round(3 * jsMult);
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">九思而后动，剑出如思量。一退一进之间，剑意自生。</div>
      <div class="skill-card-row">每一重提升：剑法+${perLayerSword}</div>
      <div class="skill-card-row">伤害次数：<b>${st.hits}</b></div>
      <div class="skill-card-row">伤害倍率：<b>${st.multiplier}</b></div>
      <div class="skill-card-row">当前剑法：<b>${fmtBondStat(getTotalSword())}</b></div>
      <div class="skill-card-row">【思退】：每次使用后叠 1 层，上限 <b>${JIUSI_SITUI_MAX}</b> 层，每层闪避 <b>+${Math.round(JIUSI_SITUI_EVA * 100)}%</b></div>
      <div class="skill-card-row">【思进】：【思退】满 <b>${JIUSI_SITUI_MAX}</b> 层后触发，九思剑法伤害 <b>+45%</b>，反击伤害 <b>+100%</b></div>
      ${lv >= 20 ? `<div class="skill-card-row">【思退·反击】：满 ${JIUSI_SITUI_MAX} 层时，闪避后以九思剑法反击（闪避几段则反击几段）</div>` : ''}
      ${lv >= 100 ? `<div class="skill-card-row">【先手】：进入战斗时立刻使用三次九思剑法</div>` : ''}`;
    return { rows, unlockHtml: renderUnlockList(JIUSI_UNLOCKS, lv) };
  },

  paodingDao: (s, lv) => {
    const st = getPaodingDaoStats(lv);
    const pd = getPaodingLevel();
    const youren = getPaodingDaoYourenPerLayer(lv);
    const pdMult = getPerLayerMult(getMartialSkillById('paodingDao'));
    const perLayerBlade = Math.round(3 * pdMult);
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">烹饪百道，刀工火候间自成刀法。游刃于筋骨之间，不见全牛。</div>
      <div class="skill-card-row">每一重提升：刀法+${perLayerBlade}</div>
      <div class="skill-card-row">伤害次数：<b>${st.hits}</b></div>
      <div class="skill-card-row">伤害倍率：<b>${st.multiplier}</b></div>
      <div class="skill-card-row">当前刀法：<b>${fmtBondStat(getTotalBlade())}</b></div>
      <div class="skill-card-row">【庖丁】：伤害提升 <b>${pd}%</b>，修炼效率提升 <b>${pd}%</b></div>
      <div class="skill-card-row">【游刃】：伤害忽视敌人防御；每次命中叠 1 层，每层每段伤害 <b>+${fmtNum(Math.round(youren * 100) / 100)}</b>（最小 1${lv >= 100 ? '，百重翻倍' : ''}）</div>
      ${getPaodingDaoAccuracyBonus(lv) > 0 ? `<div class="skill-card-row">命中率加成：<b>+${Math.round(getPaodingDaoAccuracyBonus(lv) * 100)}%</b></div>` : ''}`;
    return { rows, unlockHtml: renderUnlockList(PAODINGDAO_UNLOCKS, lv) };
  },

  feishipo: (s, lv) => {
    const st = getFeishipoStats(lv);
    const fsMult = getPerLayerMult(getMartialSkillById('feishipo'));
    const perLayerHidden = Math.round(3 * fsMult);
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">夏扑萤用来打果子的手段，指间石子一弹即出，破空无声。</div>
      <div class="skill-card-row">每一重提升：暗器+${perLayerHidden}</div>
      <div class="skill-card-row">伤害次数：<b>${st.hits}</b></div>
      <div class="skill-card-row">伤害倍率：<b>${st.multiplier}</b></div>
      <div class="skill-card-row">【打穴】：每段命中给敌人叠加 1 层，无上限</div>
      <div class="skill-card-row">每层使目标内力 <b>-${DAXUE_NEILI_DOWN}</b>（最低降至 0）</div>
      <div class="skill-card-row">打穴随时间消退：每秒消退 <b>(1 + 当前内力/100)</b> 层${getFeishipoDaxueSlowdown(lv) > 0 ? `，速度降低 <b>${Math.round(getFeishipoDaxueSlowdown(lv) * 100)}%</b>` : ''}</div>
      <div class="skill-card-row">按当前段数，一次施展最多叠加 <b>${st.hits}</b> 层</div>`;
    return { rows, unlockHtml: renderUnlockList(FEISHIPO_UNLOCKS, lv) };
  },

  qiangshen: (s, lv) => {
    const qsMult = getPerLayerMult(getMartialSkillById('qiangshen'));
    const perLayerCon = Math.round(2 * qsMult);
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">以铁匠锤锻之法熬炼筋骨，一锤一火皆入皮肉。炉火不熄，肉身不坏。</div>
      <div class="skill-card-row">每一重提升：体魄+${perLayerCon}</div>`;
    return { rows, unlockHtml: renderUnlockList(QIANGSHEN_UNLOCKS, lv) };
  },

  huomai: (s, lv) => {
    const rowRate = (v) => (v >= 0.1 ? fmtRate(v) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
    const layers = 5;
    const hmMult = getPerLayerMult(getMartialSkillById('huomai'));
    const hmPerLevelRate = HUOMAI_RATE_PER_LEVEL * hmMult;
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">以针理脉，以脉养气。血行无碍，气自生焉。</div>
      <div class="skill-card-row">首重内力增速：<b>${rowRate(HUOMAI_RATE_BASE)}/分钟</b></div>
      <div class="skill-card-row">每一重提升：内力增速 <b>+${rowRate(hmPerLevelRate)}/分钟</b>、医术 <b>+5</b></div>
      <div class="skill-card-row">每五重提升：根骨 <b>+1</b></div>
      <div class="skill-card-row">当前内力增速：<b>${rowRate(getHuomaiRatePerMin(lv))}/分钟</b>　当前医术：<b>${fmtBondStat(getTotalMedicine())}</b></div>
      <div class="skill-card-row">活脉：<b>${lv >= layers ? `战斗中每 ${getHuomaiLayerInterval(lv)} 秒一层，每层每秒恢复 ${fmtBondStat(getHuomaiRegenPerLayer())} 气血` : `五重解锁`}</b>${lv >= 50 ? `<br>每层行动速度 <b>+${fmtBondStat(getHuomaiSpeedPerLayer(lv))}</b>` : ''}</div>`;
    return { rows, unlockHtml: renderUnlockList(HUOMAI_UNLOCKS, lv) };
  },

  tanafa: (s, lv) => {
    const base = TANAFA_RATE_BASE;
    const dbl = TANAFA_RATE_DOUBLE_LEVEL;
    const rowRate = (v) => (v >= 0.1 ? fmtRate(v) : v.toFixed(4).replace(/0+$/, '').replace(/\.$/, ''));
    const tfMult = getPerLayerMult(getMartialSkillById('tanafa'));
    const perLevel = TANAFA_RATE_PER_LEVEL * tfMult;
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">依淬火之机调理呼吸，一呼一吸间如冷水入炉。日久天长，内力自生。</div>
      <div class="skill-card-row">首重内力增速：<b>${rowRate(base)}/分钟</b></div>
      <div class="skill-card-row">每一重提升：内力增速 <b>+${rowRate(perLevel)}/分钟</b>（${dbl} 重起翻倍）</div>
      <div class="skill-card-row">定力内力速度加成：<b>${formatPercent(getNeiLiSpeedMultiplier() - 1)}</b></div>
      <div class="skill-card-row">当前内力增速：<b>${rowRate(getTanafaRatePerMin())}/分钟</b></div>`;
    return { rows, unlockHtml: renderUnlockList(TANAFA_UNLOCKS, lv) };
  },

  qingyuan: (s, lv) => {
    const acc = lv * 0.0075;
    const eva = lv * 0.01 + (lv >= 25 ? 0.1 : 0);
    const spd = lv * 0.02 + getQingyuanSpeedBonus(lv);
    const qyMult = getPerLayerMult(getMartialSkillById('qingyuan'));
    const perSpd = 0.02 * qyMult;
    const perAcc = 0.0075 * qyMult;
    const perEva = 0.01 * qyMult;
    const rows = `
      <div class="skill-card-row">类型：<b>${s.type}</b></div>
      <div class="skill-card-intro">青者天之远色，鸢者风之捷影。举步不沾尘，回身已过数丈——非身轻也，乃心先至耳。</div>
      <div class="skill-card-row">每一重提升：行动速度 +${fmtRate(perSpd)}、命中率 +${fmtRate(perAcc * 100)}%、闪避率 +${fmtRate(perEva * 100)}%</div>
      <div class="skill-card-row">当前加成：行动速度 <b>+${fmtRate(spd)}</b>　命中率 <b>+${fmtRate(acc * 100)}%</b>　闪避率 <b>+${fmtRate(eva * 100)}%</b></div>`;
    return { rows, unlockHtml: renderUnlockList(QINGYUAN_UNLOCKS, lv) };
  }
};

function generateCard(s) {
  const builder = SKILL_CARD_BUILDERS[s.id];
  if (!builder) return '';
  const { rows, unlockHtml } = builder(s, s.level);
  return skillCardShell(s, rows, unlockHtml);
}

function renderSkills() {
  updateSkillStudyBtn();
  const categories = { '招式': [], '轻功': [], '外功': [], '内功': [] };

  for (const cat of SKILL_TYPES) {
    const select = $(`train-select-${cat}`);
    if (!select) continue;
    const eligible = player.skills.filter(s => skillMatchesCategory(s, cat));
    const selected = player.trainingSelections?.[cat] || '';
    select.innerHTML = '<option value="">未选择</option>' +
      eligible.map(sk => `<option value="${sk.id}">${sk.name}（${sk.level}重）</option>`).join('');
    select.value = eligible.some(sk => sk.id === selected) ? selected : '';
    select.onchange = () => {
      if (!player.trainingSelections) player.trainingSelections = {};
      player.trainingSelections[cat] = select.value;
      if (player.trainingActivity && TRAINING_ACTIVITY[player.trainingActivity] &&
          TRAINING_ACTIVITY[player.trainingActivity].cat === cat) {
        player.trainingLastTick = Date.now();
      }
      saveGame();
      updateTrainingUI();
      renderSkills();
    };
  }

  player.skills.forEach(s => {
    if (s.type === '招式' || s.type === '拳法' || s.type === '剑法' || s.type === '刀法' || s.type === '长兵' || s.type === '奇门' || s.type === '暗器') {
      categories['招式'].push(s);
    } else if (s.type === '轻功') {
      categories['轻功'].push(s);
    } else if (s.type === '外功') {
      categories['外功'].push(s);
    } else if (s.type === '内功') {
      categories['内功'].push(s);
    }
  });

  /* 每类只显示当前修炼的那一门，避免界面啰嗦 */
  for (const cat of ['招式', '轻功', '外功', '内功']) {
    const el = $(`skill-col-${cat}`);
    if (!el) continue;
    const sel = (player.trainingSelections || {})[cat] || '';
    const cur = categories[cat].find(s => s.id === sel) || null;
    el.innerHTML = cur
      ? generateCard(cur)
      : `<div class="skill-card-empty">尚未选择当前修炼的${cat}<br><span>请在上方下拉框中选择</span></div>`;
  }
  renderCombatTechniques();
}

function buildJinzhenTechniqueCard() {
  if (!getJinzhenTechnique()) return '';
  return `<div class="skill-card">
    <div class="skill-card-name">金针渡穴</div>
    <div class="skill-card-intro">赵大夫倾囊相授的毕生针法。取金针疏通经络，可在危急时为自己或同伴续上一口气。</div>
    <div class="skill-card-row">类型：<b>特技</b></div>
    <div class="skill-card-row">效果：为自己或同伴恢复医术×5 点气血，随后停止行动 3 秒</div>
    <div class="skill-card-row">限制：<b>每场战斗最多使用一次</b></div>
  </div>`;
}

function renderCombatTechniques() {
  const el = $('skillCombatTechPanel');
  if (!el) return;
  const html = buildJinzhenTechniqueCard();
  el.innerHTML = html || '<div class="tech-empty">尚未习得任何特技</div>';
}

/* 钻研入口仅在领悟《玄览通微》后显示 */
function updateSkillStudyBtn() {
  const btn = $('skillStudyBtn');
  if (!btn) return;
  btn.style.display = storyFlags.xuanlanLearned ? '' : 'none';
}

const STUDY_TYPE_ORDER = ['拳法', '剑法', '刀法', '长兵', '奇门', '暗器'];
const STUDY_GROUP_TYPES = SKILL_TYPES;

function getStudySkillTypeOrder(skill) {
  if (!skill) return 999;
  const idx = STUDY_TYPE_ORDER.indexOf(skill.type);
  /* 震山拳的 type 是笼统的“招式”，归在拳法之前 */
  return idx >= 0 ? idx : 0;
}

function buildStudyRow(s) {
  const active = s.id === player.studyTargetId;
  return `<button type="button" class="study-row${active ? ' active' : ''}" data-skill-id="${s.id}">
    <span class="study-name">${s.name}</span>
    <span class="study-lv">${levelToChinese(s.level)}重</span>
    <span class="study-jwzz">见微知著 ${fmtBondStat(getJwzzTotal(s))}</span>
    <span class="study-diff">原始难度 ${getOriginalDifficulty(s).toFixed(2)}</span>
  </button>`;
}

function renderStudyList() {
  const el = $('studyList');
  if (!el) return;
  const groups = {};
  (player.skills || []).forEach(s => {
    if (!s || !s.id) return;
    let group = null;
    for (const type of STUDY_GROUP_TYPES) {
      if (skillMatchesCategory(s, type)) { group = type; break; }
    }
    if (!group) return;
    if (!groups[group]) groups[group] = [];
    groups[group].push(s);
  });
  STUDY_GROUP_TYPES.forEach(type => {
    if (groups[type] && type === '招式') {
      groups[type].sort((a, b) => getStudySkillTypeOrder(a) - getStudySkillTypeOrder(b));
    }
  });
  el.innerHTML = STUDY_GROUP_TYPES.map(type => {
    const list = groups[type];
    if (!list || !list.length) return '';
    return `<div class="study-group">
      <div class="study-group-title">${type}</div>
      ${list.map(buildStudyRow).join('')}
    </div>`;
  }).join('') || '<div class="tech-empty">尚未掌握任何武功</div>';
}

function openStudy() {
  if (!storyFlags.xuanlanLearned) return;
  renderStudyList();
  const ov = $('studyOverlay');
  if (ov) ov.classList.add('show');
}

function closeStudy() {
  const ov = $('studyOverlay');
  if (ov) ov.classList.remove('show');
}

function selectStudyTarget(skillId) {
  if (!storyFlags.xuanlanLearned || typeof skillId !== 'string' || !skillId) return;
  const skill = (player.skills || []).find(s => s && s.id === skillId);
  if (!skill) return;
  player.studyTargetId = skillId;
  saveGame();
  closeStudy();
  showToast(`开始钻研【${skill.name}】`);
  renderSkills();
}

function buildFishingTechniqueCard() {
  const skill = getFishingTechnique();
  if (!skill) return '';
  const lv = Math.max(0, Number(skill.level) || 0);
  const need = getFishingExpNeed(lv);
  const fixed = getFishingQualityFixed(lv);
  const qualityRate = getFishingQualityMultiplier(lv);
  const unlocks = [
    { level: 5,   desc: '钓鱼品质固定 +10' },
    { level: 10,  desc: '定力 +1，钓鱼品质提升 10%' },
    { level: 20,  desc: '钓鱼品质固定 +35' },
    { level: 30,  desc: '定力 +5，钓鱼品质再次提升 20%，钓鱼时间 -1s' },
    { level: 50,  desc: '每次钓鱼有 [渔夫等级-20]% 概率双倍产出，钓鱼时间 -2s' },
    { level: 70,  desc: '定力 +15，钓鱼品质再次提升 50%' },
    { level: 100, desc: '可以在钓鱼的过程中进行别的行动' },
    { level: 125, desc: '获得特质【沉渊】：敌人行动速度减少，减少值相当于渔夫等级/100' }
  ];
  const unlockHtml = unlocks.map(u => `<div class="unlock-item ${lv >= u.level ? 'unlocked' : ''}"><span class="unlock-lv">Lv.${u.level}</span><span class="unlock-desc">${u.desc}</span></div>`).join('');
  const speed = 100 + lv;
  const luckBonus = getFishingLuckBonus(lv);
  return `<div class="skill-card">
    <div class="skill-card-name">渔夫（Lv.${lv}）</div>
    <div class="skill-card-row">升级经验：<b>${Math.round(skill.exp || 0)} / ${Math.round(need)}</b></div>
    <div class="skill-exp"><div class="skill-exp-fill" style="width:${Math.min(100, (skill.exp || 0) / need * 100)}%"></div></div>
    <div class="skill-train-meta">每级提升：钓鱼品质提升，钓鱼时间缩短　每2级定力 +1</div>
    <div class="skill-card-row">当前品质加成：<b>固定 +${fixed}，倍率 ×${qualityRate.toFixed(2)}</b></div>
    <div class="skill-card-row">经验倍率：<b>×${getFishingExpMultiplier().toFixed(2)}</b></div>
    <div class="skill-card-row">当前定力加成：<b>+${luckBonus}</b>　读条速度：<b>${speed}%</b></div>
    <div class="skill-card-row">当前钓鱼时间：<b>${(getFishingDuration()/1000).toFixed(2)} 秒</b></div>
    <div class="skill-unlocks"><div class="unlock-title">突 破 节 点</div>${unlockHtml}</div>
  </div>`;
}

function buildPaodingTechniqueCard() {
  const skill = getPaodingTechnique();
  if (!skill) return '';
  const lv = Math.max(0, Number(skill.level) || 0);
  const need = getPaodingExpNeed(lv);
  const unlocks = [
    { level: 5,   desc: '烹饪品质固定 +10' },
    { level: 10,  desc: '烹饪品质 +5%，刀法 +5' },
    { level: 25,  desc: '悟性 +3，刀法 +15，烹饪品质固定 +30' },
    { level: 50,  desc: '悟性 +5，刀法 +25，烹饪品质 +20%，每次烹饪有 [庖丁等级-20]% 概率双倍产出' },
    { level: 75,  desc: '烹饪品质固定 +100，烹饪品质 +35%' },
    { level: 100, desc: '获得特质【解牛】：战斗中每 2 秒给敌人叠加一层破绽，敌人每次受到伤害时消耗一层，造成（庖丁等级 × 体魄 / 10）的固定伤害' }
  ];
  const unlockHtml = unlocks.map(u => `<div class="unlock-item ${lv >= u.level ? 'unlocked' : ''}"><span class="unlock-lv">Lv.${u.level}</span><span class="unlock-desc">${u.desc}</span></div>`).join('');
  const cookCnt = Number(player.cookCount) || 0;
  return `<div class="skill-card">
    <div class="skill-card-name">庖丁（Lv.${lv}）</div>
    <div class="skill-card-row">升级经验：<b>${Math.round(skill.exp || 0)} / ${Math.round(need)}</b></div>
    <div class="skill-exp"><div class="skill-exp-fill" style="width:${Math.min(100, (skill.exp || 0) / need * 100)}%"></div></div>
    <div class="skill-train-meta">每级提升：刀法 +1，烹饪品质提升　每2级悟性 +1</div>
    <div class="skill-card-row">当前固定加成：<b>+${getPaodingFixedBonus()}</b>　倍率加成：<b>×${getPaodingQualityMultiplier().toFixed(2)}</b></div>
    <div class="skill-card-row">经验倍率：<b>×${getPaodingExpMultiplier().toFixed(2)}</b></div>
    <div class="skill-card-row">当前双倍产出概率：<b>${formatPercent(getPaodingDoubleChance())}</b></div>
    <div class="skill-card-row">烹饪次数：<b>${cookCnt} / 100</b>${cookCnt >= 100 ? '（已领悟庖丁刀法）' : '（满 100 领悟庖丁刀法）'}</div>
    <div class="skill-unlocks"><div class="unlock-title">突 破 节 点</div>${unlockHtml}</div>
  </div>`;
}

function renderTechniques() {
  const el = $('technique-list');
  if (!el) return;
  const html = buildFishingTechniqueCard() + buildPaodingTechniqueCard();
  el.innerHTML = html || '<div class="tech-empty">尚未习得任何技艺</div>';
}
