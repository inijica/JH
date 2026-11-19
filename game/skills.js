/* 武学数值、技能 getter 与伤害/命中计算（从 game.js 拆出，需在 game.js 之前加载） */
function initSkills() {
  player.skills = [
    { id: 'zhenshan', name: '震山拳', type: '招式', level: 1, exp: 0, jianweizhizhuBase: 0, studyMinutes: 0 },
    { id: 'jiusi', name: '九思剑法', type: '剑法', level: 1, exp: 0, jianweizhizhuBase: 0, studyMinutes: 0 },
    { id: 'qiangshen', name: '泥火锤锻篇', type: '外功', level: 1, exp: 0, jianweizhizhuBase: 0, studyMinutes: 0 },
    { id: 'tanafa', name: '淬火呼吸法', type: '内功', level: 1, exp: 0, jianweizhizhuBase: 0, studyMinutes: 0 }
  ];
}

/* ================= 玄览通微 · 见微知著 =================
   每门武功累积的见微知著 = 基础累积值 × 时间系数。
   三条收益线（修炼速度 / 难度 / 每重收益）只能走 getJwzzTotal。 */
function getMartialSkillById(id) {
  return (player.skills || []).find(s => s && s.id === id) || null;
}

function getJwzzTotal(skill) {
  if (!skill) return 0;
  const base = Math.max(0, Number(skill.jianweizhizhuBase) || 0);
  const t = Math.max(0, Number(skill.studyMinutes) || 0);
  const timeMult = 1 + Math.sqrt(t) / 20 + t / 2500;
  return base * timeMult;
}

/* 六个武学裸值之和（不含任何 getTotal* 加成） */
function getBaseMartialSum() {
  return (Number(player.fist) || 0)
       + (Number(player.blade) || 0)
       + (Number(player.sword) || 0)
       + (Number(player.changbing) || 0)
       + (Number(player.qimen) || 0)
       + (Number(player.hidden) || 0);
}

/* 每重收益倍率：随见微知著增长，封顶 ×101。
   注意：此倍率只作用于“逐重线性收益”，突破节点收益不再乘它。 */
function getPerLayerMult(skill) {
  const jwzz = getJwzzTotal(skill);
  const raw = 1 + jwzz * 0.000001 + Math.pow(jwzz, 0.25) * 0.2;
  const capped = Math.min(raw, 101);
  if (skill && skill.type === '轻功') {
    return 1 + (capped - 1) * 0.7;
  }
  return capped;
}

const WANGBA_UNLOCKS = [
  { level: 5,   desc: '伤害倍率提升至 0.1 倍，额外提升 1 根骨' },
  { level: 10,  desc: '伤害倍率提升至 0.135 倍，额外提升 10 体魄' },
  { level: 20,  desc: '伤害次数提升至 5 次，额外提升 30 体魄、3 根骨' },
  { level: 50,  desc: '伤害次数提升至 7，倍率提升至 0.18 倍，额外提升 200 体魄、15 根骨' },
  { level: 100, desc: '拳法+1000，体魄+1500；【撼山势】提供的增伤翻倍；战斗开始自动叠加 20 层【撼山势】，且每秒自动叠加 1 层' }
];

function getWangbaLevel() {
  const s = player.skills.find(s => s.id === 'zhenshan');
  return s ? s.level : 0;
}

function getWangbaStats(level) {
  let hits = 3;
  let multiplier = 0.075;
  if (level >= 5) multiplier = 0.1;
  if (level >= 10) multiplier = 0.135;
  if (level >= 20) hits = 5;
  if (level >= 50) { hits = 7; multiplier = 0.18; }
  return { hits, multiplier };
}

function getWangbaConBonus(level) {
  if (level <= 0) return 0;
  let bonus = 0;
  if (level >= 10) bonus += 10;
  if (level >= 20) bonus += 30;
  if (level >= 50) bonus += 200;
  if (level >= 100) bonus += 1500;
  return bonus;
}

/* 震山拳·根骨节点：固定值，不再乘见微知著倍率 */
function getWangbaRootBonus(level) {
  let bonus = 0;
  if (level >= 5) bonus += 1;
  if (level >= 20) bonus += 3;
  if (level >= 50) bonus += 15;
  return bonus;
}

function getTotalRoot() {
  const farmerRoot = typeof getFarmerRootBonus === 'function' ? getFarmerRootBonus() : 0;
  return player.root + getWangbaRootBonus(getWangbaLevel()) + getQiangshenRootBonus(getQiangshenLevel()) +
    getFeishipoRootBonus() + getHuomaiRootBonus() + farmerRoot;
}

function getFistBonus() {
  const level = getWangbaLevel();
  let bonus = level * 3 * getPerLayerMult(getMartialSkillById('zhenshan'));
  if (level >= 100) bonus += 1000;
  return bonus;
}
function getTotalFist() { return player.fist + getFistBonus(); }
function getTotalChangbing() { return Number(player.changbing) || 0; }
function getTotalQimen() { return Number(player.qimen) || 0; }

/* ========== 九思剑法 ========== */
const JIUSI_UNLOCKS = [
  { level: 5,   desc: '悟性+1，剑法+10' },
  { level: 10,  desc: '剑法+20，内力+5，伤害倍率提升至 0.07 倍' },
  { level: 20,  desc: '悟性+2，神宁气静+3，伤害倍率提升至 0.1 倍；【思退】满九层时，闪避后用九思剑法反击（闪避几段反击几段）' },
  { level: 50,  desc: '悟性+5，剑法+50，内力+100，伤害倍率提升至 0.13 倍，伤害次数提升至 6 次' },
  { level: 100, desc: '悟性+20，神宁气静+10，剑法+1000，内力+2500；进入战斗时立刻使用三次九思剑法' }
];

function getJiusiLevel() {
  const s = (player.skills || []).find(s => s.id === 'jiusi');
  return s ? Math.max(0, Number(s.level) || 0) : 0;
}

function getJiusiStats(level = getJiusiLevel()) {
  let hits = 4;
  let multiplier = 0.05;
  if (level >= 10) multiplier = 0.07;
  if (level >= 20) multiplier = 0.1;
  if (level >= 50) { multiplier = 0.13; hits = 6; }
  return { hits, multiplier };
}

function getJiusiSwordBonus(level = getJiusiLevel()) {
  if (level <= 0) return 0;
  let bonus = level * 3 * getPerLayerMult(getMartialSkillById('jiusi'));
  if (level >= 5) bonus += 10;
  if (level >= 10) bonus += 20;
  if (level >= 50) bonus += 50;
  if (level >= 100) bonus += 1000;
  return bonus;
}

/* 九思剑法·悟性节点：固定值，不再乘见微知著倍率 */
function getJiusiCompBonus(level = getJiusiLevel()) {
  let bonus = 0;
  if (level >= 5) bonus += 1;
  if (level >= 20) bonus += 2;
  if (level >= 50) bonus += 5;
  if (level >= 100) bonus += 20;
  return bonus;
}

/* 九思剑法·内力节点：固定值，不再乘见微知著倍率 */
function getJiusiNeiLiBonus(level = getJiusiLevel()) {
  let bonus = 0;
  if (level >= 10) bonus += 5;
  if (level >= 50) bonus += 100;
  if (level >= 100) bonus += 2500;
  return bonus;
}

function getJiusiShenningBonus(level = getJiusiLevel()) {
  let bonus = 0;
  if (level >= 20) bonus += 3;
  if (level >= 100) bonus += 10;
  return bonus;
}

function getTotalSword() {
  return (Number(player.sword) || 0) + getJiusiSwordBonus();
}

/* 九思剑法伤害：剑法属性，【思进】在【思退】满 9 层后触发，九思剑法伤害 +45%，反击伤害 +100% */
function calcSwordDamage(multiplier, effectMultiplier, enemy, opts) {
  const defMartial = getEnemyMaxMartial(enemy);
  const martialPart = (getTotalSword() - defMartial / 2) * 2.5;
  const pf = typeof playerFighter === 'function' ? playerFighter() : null;
  const maxLayers = typeof JIUSI_SITUI_MAX === 'number' ? JIUSI_SITUI_MAX : 9;
  const siTuiFull = (Number(pf && pf.siTuiLayers) || 0) >= maxLayers;
  const isCounter = !!(opts && opts.isCounter);
  const siJin = siTuiFull ? (isCounter ? 2 : 1.45) : 1;
  return (20 + getTotalCon() + martialPart) * multiplier * effectMultiplier * 2 * siJin;
}

/* ========== 庖丁刀法 ========== */
const PAODINGDAO_UNLOCKS = [
  { level: 5,   desc: '刀法+15，伤害倍率提升至 0.04 倍' },
  { level: 10,  desc: '体魄+5，行动速度+0.02，伤害倍率提升至 0.05 倍，伤害次数提升至 7 次' },
  { level: 20,  desc: '悟性+3，延绵不绝+3，伤害倍率提升至 0.07 倍，烹饪品质+20' },
  { level: 50,  desc: '命中率+10%，伤害次数提升至 9 次，伤害倍率提升至 0.09 倍，烹饪品质+50' },
  { level: 100, desc: '刀法+1000，体魄+1000，虚实莫测+10，延绵不绝+10，命中率再+20%；【游刃】提供的伤害增益翻倍' }
];

function getPaodingDaoLevel() {
  const s = (player.skills || []).find(s => s.id === 'paodingDao');
  return s ? Math.max(0, Number(s.level) || 0) : 0;
}

function hasPaodingDao() {
  return (player.skills || []).some(s => s && s.id === 'paodingDao');
}

function learnPaodingDao() {
  if (hasPaodingDao()) return;
  if (!Array.isArray(player.skills)) player.skills = [];
  player.skills.push({ id: 'paodingDao', name: '庖丁刀法', type: '刀法', level: 1, exp: 0 });
  showToast('烹饪百道，刀工火候间忽有所悟——领悟了【庖丁刀法】！', 4500);
  addIntel('烹饪百道之后，你于解牛之势中领会了刀法【庖丁刀法】。', 'gold');
  if (typeof renderSkills === 'function') renderSkills();
  if (typeof saveGame === 'function') saveGame();
}

function getPaodingDaoStats(level = getPaodingDaoLevel()) {
  let hits = 5;
  let multiplier = 0.035;
  if (level >= 5) multiplier = 0.04;
  if (level >= 10) { multiplier = 0.05; hits = 7; }
  if (level >= 20) multiplier = 0.07;
  if (level >= 50) { multiplier = 0.09; hits = 9; }
  return { hits, multiplier };
}

/* 庖丁刀法·刀法节点：固定值，不再乘见微知著倍率 */
function getPaodingDaoBladeBonus(level = getPaodingDaoLevel()) {
  if (level <= 0) return 0;
  let bonus = level * 3 * getPerLayerMult(getMartialSkillById('paodingDao'));
  if (level >= 5) bonus += 15;
  if (level >= 50) bonus += 50;
  if (level >= 100) bonus += 1000;
  return bonus;
}

function getPaodingDaoConBonus(level = getPaodingDaoLevel()) {
  let bonus = 0;
  if (level >= 10) bonus += 5;
  if (level >= 100) bonus += 1000;
  return bonus;
}

function getPaodingDaoCompBonus(level = getPaodingDaoLevel()) {
  return level >= 20 ? 3 : 0;
}

function getPaodingDaoSpeedBonus(level = getPaodingDaoLevel()) {
  return level >= 10 ? 0.02 : 0;
}

function getPaodingDaoXushiBonus(level = getPaodingDaoLevel()) {
  return level >= 100 ? 10 : 0;
}

function getPaodingDaoMianmianBonus(level = getPaodingDaoLevel()) {
  let bonus = 0;
  if (level >= 20) bonus += 3;
  if (level >= 100) bonus += 10;
  return bonus;
}

function getPaodingDaoAccuracyBonus(level = getPaodingDaoLevel()) {
  let bonus = 0;
  if (level >= 50) bonus += 0.10;
  if (level >= 100) bonus += 0.20;
  return bonus;
}

function getPaodingDaoCookBonus(level = getPaodingDaoLevel()) {
  let bonus = 0;
  if (level >= 20) bonus += 20;
  if (level >= 50) bonus += 50;
  return bonus;
}

/* 【庖丁】：伤害提升 庖丁等级% */
function getPaodingDaoDamageMult(level = getPaodingDaoLevel()) {
  return 1 + getPaodingLevel() / 100;
}

/* 【游刃】每层每段固定伤害：庖丁等级/10（最小 1），一百重翻倍 */
function getPaodingDaoYourenPerLayer(level = getPaodingDaoLevel()) {
  let v = Math.max(1, getPaodingLevel() / 10);
  if (level >= 100) v *= 2;
  return v;
}

/* 庖丁刀法伤害：刀法属性，忽视敌人防御（体魄减伤），【庖丁】按庖丁等级% 提升 */
function calcBladeDamage(multiplier, effectMultiplier, enemy, level = getPaodingDaoLevel()) {
  const martialPart = getTotalBlade() * 2.5;
  const mult = getPaodingDaoDamageMult(level);
  return (20 + getTotalCon() + martialPart) * multiplier * effectMultiplier * 2 * mult;
}

/* ========== 飞石破 ========== */
const FEISHIPO_UNLOCKS = [
  { level: 5,   desc: '伤害倍率提升至 0.06 倍' },
  { level: 10,  desc: '伤害倍率提升至 0.08 倍，伤害次数提升至 7 次，额外提升 5 体魄' },
  { level: 20,  desc: '伤害倍率提升至 0.1 倍，额外提升 30 暗器、5 虚实莫测' },
  { level: 50,  desc: '伤害次数提升至 12 次，伤害倍率提升至 0.13 倍，额外提升 50 体魄、5 根骨；【打穴】消退速度降低 20%' },
  { level: 100, desc: '暗器+1500，虚实莫测+15；【打穴】消退速度降低提升至 70%' }
];

function getFeishipoLevel() {
  const s = player.skills.find(s => s.id === 'feishipo');
  return s ? Math.max(0, Number(s.level) || 0) : 0;
}

function getFeishipoStats(level = getFeishipoLevel()) {
  let hits = 5;
  let multiplier = 0.045;
  if (level >= 5) multiplier = 0.06;
  if (level >= 10) { multiplier = 0.08; hits = 7; }
  if (level >= 20) multiplier = 0.1;
  if (level >= 50) { hits = 12; multiplier = 0.13; }
  return { hits, multiplier };
}

function getFeishipoHiddenBonus(level = getFeishipoLevel(), applyStudy = true) {
  if (level <= 0) return 0;
  let bonus = level * 3;
  if (applyStudy) bonus *= getPerLayerMult(getMartialSkillById('feishipo'));
  if (level >= 20) bonus += 30;
  if (level >= 100) bonus += 1500;
  return bonus;
}

function getFeishipoConBonus(level = getFeishipoLevel()) {
  if (level <= 0) return 0;
  let bonus = 0;
  if (level >= 10) bonus += 5;
  if (level >= 50) bonus += 50;
  return bonus;
}

/* 飞石破·根骨节点：固定值，不再乘见微知著倍率 */
function getFeishipoRootBonus(level = getFeishipoLevel()) {
  return level >= 50 ? 5 : 0;
}

function getFeishipoXushiBonus(level = getFeishipoLevel()) {
  let bonus = 0;
  if (level >= 20) bonus += 5;
  if (level >= 100) bonus += 15;
  return bonus;
}

/* 【打穴】消退速度降低比例 */
function getFeishipoDaxueSlowdown(level = getFeishipoLevel()) {
  if (level >= 100) return 0.7;
  if (level >= 50) return 0.2;
  return 0;
}

/* 20 羁绊解锁：玩家暗器 += 夏扑萤自身暗器 / 10
   注意：这里必须用 getBondOwnHidden() 而非 getBondHidden()，
   因为 getBondHidden() 依赖 getTotalHidden()，反向依赖会形成递归 */
function getBondHiddenPlayerBonus() {
  if (typeof getBondValue !== 'function' || getBondValue() < 20) return 0;
  return getBondOwnHidden() / 10;
}
function getTotalHidden() {
  return (Number(player.hidden) || 0) + getFeishipoHiddenBonus() + getBondHiddenPlayerBonus();
}

/* 新增：获取敌方全部武学中的最高值作为防御基准 */
function getEnemyMaxMartial(enemy) {
  if (!enemy) return 0;
  return Math.max(
    Number(enemy.fist) || 0,
    Number(enemy.blade) || 0,
    Number(enemy.sword) || 0,
    Number(enemy.changbing) || 0,
    Number(enemy.qimen) || 0,
    Number(enemy.hidden) || 0
  );
}

/* 【撼山势】每层附加体魄×0.08 的基础伤害，随倍率参与攻防计算；一百重翻倍 */
const HANSHAN_CON_PER_LAYER = 0.08;

function calcHiddenDamage(multiplier, effectMultiplier, enemy) {
  const defMartial = getEnemyMaxMartial(enemy); // 改为取敌方最高武学
  const martialPart = (getTotalHidden() - defMartial / 2) * 2.5;
  return (20 + getTotalCon() + martialPart) * multiplier * effectMultiplier * 2;
}

function calcFistDamage(multiplier, effectMultiplier, enemy, hanShiLayers = 0, doubleHanShan = false) {
  const defMartial = getEnemyMaxMartial(enemy); // 改为取敌方最高武学
  const martialPart = (getTotalFist() - defMartial / 2) * 2.5;
  const perLayer = HANSHAN_CON_PER_LAYER * (doubleHanShan ? 2 : 1);
  const hanShiBonus = Math.max(0, Number(hanShiLayers) || 0) * perLayer * getTotalCon();
  return (20 + getTotalCon() + martialPart + hanShiBonus) * multiplier * effectMultiplier * 2;
}

function calcNormalDamage(effectMultiplier) {
  return 5 * effectMultiplier;
}

const QIANGSHEN_UNLOCKS = [
  { level: 5,   desc: '额外提升 1 根骨' },
  { level: 10,  desc: '额外提升 10 体魄，每秒气血恢复 +10' },
  { level: 30,  desc: '额外提升 100 体魄，每秒气血恢复 +50' },
  { level: 50,  desc: '额外提升 150 减伤，从五十重开始每重额外提升 2 体魄' },
  { level: 100, desc: '体魄提升 20%（独立乘区）' }
];

function getQiangshenLevel() {
  const s = player.skills.find(s => s.id === 'qiangshen');
  return s ? s.level : 0;
}

/* 泥火·根骨节点：固定值，不再乘见微知著倍率 */
function getQiangshenRootBonus(level) {
  return level >= 5 ? 1 : 0;
}

function getQiangshenConBonus(level) {
  if (level <= 0) return 0;
  const mult = getPerLayerMult(getMartialSkillById('qiangshen'));
  let bonus = 2 + level * 2 * mult;
  if (level >= 10) bonus += 10;
  if (level >= 30) bonus += 100;
  if (level > 50) bonus += (level - 50) * 2 * mult;
  return bonus;
}

function getTotalCon() {
  const qsLevel = getQiangshenLevel();
  const wbLevel = getWangbaLevel();
  let base = player.constitution + getQiangshenConBonus(qsLevel) + getWangbaConBonus(wbLevel) + getFeishipoConBonus() + getPaodingDaoConBonus();
  if (qsLevel >= 100) base = base * 1.2;
  return base;
}

function getHpRegen() {
  const level = getQiangshenLevel();
  let regen = Number(player.bonusHpRegen) || 0;
  if (level >= 10) regen += 10;
  if (level >= 30) regen += 50;
  return regen;
}

function getExtraDR() {
  return (getQiangshenLevel() >= 50 ? 150 : 0) + (Number(player.bonusDR) || 0);
}

function getMaxHp() { return Math.floor(80 + getTotalCon() * 20); }

function getNeiLiSpeedMultiplier() {
  return 1 + getTotalLuck() * 0.025;
}

const QINGYUAN_UNLOCKS = [
  { level: 10,  desc: '行动速度 +0.05，延绵不绝+5' },
  { level: 25,  desc: '行动速度 +0.1，闪避率 +10%' },
  { level: 50,  desc: '行动速度 +0.25' },
  { level: 100, desc: '获得特质【青鸢飞纵】：闪避判定失败后再进行一次闪避判定，但这次判定的闪避率 -30%' }
];

function getQingyuanSkill() {
  return (player.skills || []).find(s => s.id === 'qingyuan') || null;
}
function getQingyuanLevel() {
  const s = getQingyuanSkill();
  return s ? Math.max(0, Number(s.level) || 0) : 0;
}
function getQingyuanSpeedBonus(level = getQingyuanLevel()) {
  let bonus = 0;
  if (level >= 10) bonus += 0.05;
  if (level >= 25) bonus += 0.1;
  if (level >= 50) bonus += 0.25;
  return bonus;
}
function getTotalSpeed() {
  const mult = getPerLayerMult(getMartialSkillById('qingyuan'));
  return (Number(player.speed) || 0.15) + getQingyuanLevel() * 0.02 * mult + getQingyuanSpeedBonus() + getPaodingDaoSpeedBonus();
}

function getAccuracyRate() {
  return 0.9 + getQingyuanLevel() * 0.0075 * getPerLayerMult(getMartialSkillById('qingyuan'));
}

function getEvasionRate() {
  let rate = 0.10 + getQingyuanLevel() * 0.01 * getPerLayerMult(getMartialSkillById('qingyuan'));
  if (getQingyuanLevel() >= 25) rate += 0.1;
  return Math.max(0, rate);
}
function hasQingyuanTrait() { return getQingyuanLevel() >= 100; }

function calcHitChance(accuracy, evasion) {
  const H = Math.max(0, Number(accuracy) || 0) * 100;
  const E = Math.max(0, Number(evasion) || 0) * 100;
  const rPrime = (H + 100) / (E + 100);
  if (rPrime <= 0.5) return 0;
  if (rPrime >= 2) return 1;
  return Math.pow((rPrime - 0.5) / 1.5, 0.8);
}

function calcAccuracyOverflow(accuracy, evasion) {
  const acc = Math.max(0, Number(accuracy) || 0);
  const eva = Math.max(0, Number(evasion) || 0);
  return Math.max(0, acc - (2 * eva + 1));
}

function rollDodge(accuracy, evasion) {
  const hitChance = calcHitChance(accuracy, evasion);
  return Math.random() >= hitChance;
}

function getMianmianPoints() {
  return Math.max(0, getTotalRoot() * 0.5 + getPaodingDaoMianmianBonus());
}

/* 敌方对应的三项数值：虚实莫测=悟性×0.5，神宁气静=定力×0.5，延绵不绝=根骨×0.5 */
function getEnemySkillValue(kind, e) {
  const en = e || firstLivingEnemy();
  if (!en) return 0;
  if (kind === 'xushi') return Math.max(0, Number(en.comp) || 0) * 0.5;
  if (kind === 'shenning') return Math.max(0, Number(en.luck) || 0) * 0.5;
  return Math.max(0, Number(en.root) || 0) * 0.5;
}

function getMianmianRate(enemyValue = 0) {
  let rate = Math.max(0, getMianmianPoints() - (Number(enemyValue) || 0) / 2) * 0.01;
  if (getQingyuanLevel() >= 10) rate += 0.05;
  return Math.max(0, rate);
}

function rollMianmianCount(rate) {
  const r = Math.max(0, Number(rate) || 0);
  if (r <= 0) return 0;
  if (r < 1) return Math.random() < r ? 1 : 0;
  const extra = r - 1;
  let count = 1 + Math.floor(extra);
  if (Math.random() < (extra - Math.floor(extra))) count += 1;
  return count;
}

function getXushiPoints() {
  return Math.max(0, getTotalComp() * 0.5 + getFeishipoXushiBonus() + getPaodingDaoXushiBonus());
}
function getXushiRate(enemyValue = 0) {
  return Math.max(0, getXushiPoints() - (Number(enemyValue) || 0) / 2) * 0.01;
}

function getShenningPoints() {
  return Math.max(0, getTotalLuck() * 0.5 + getJiusiShenningBonus());
}
function getShenningRate(enemyValue = 0) {
  return Math.max(0, getShenningPoints() - (Number(enemyValue) || 0) / 2) * 0.01;
}
const MARTIAL_KEYS = ['fist', 'blade', 'sword', 'changbing', 'qimen'];
const MARTIAL_LABELS = { fist: '拳掌', blade: '刀法', sword: '剑法', changbing: '长兵', qimen: '奇门', hidden: '暗器' };

function getPlayerBestMartial() {
  const values = {
    fist: getTotalFist(),
    sword: getTotalSword(),
    blade: getTotalBlade(),
    changbing: getTotalChangbing(),
    qimen: getTotalQimen()
  };
  let key = 'fist';
  for (const k of MARTIAL_KEYS) if (values[k] > values[key]) key = k;
  return { key, label: MARTIAL_LABELS[key], value: values[key] };
}
function getPlayerMartialMax() {
  return getPlayerBestMartial().value;
}

function getEnemyMartialMatch(e, key) {
  if (!e) return 0;
  return Number(e[key]) || 0;
}
function getEnemyMartialMax(e) {
  return getEnemyMartialMatch(e, getPlayerBestMartial().key);
}
