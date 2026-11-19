/* 内力与活脉（从 game.js 拆出，需在 game.js 之前加载） */
const TANAFA_UNLOCKS = [
  { level: 10,  desc: '内力 +10' },
  { level: 20,  desc: '淬火呼吸法提供的内力提升速度 ×2' },
  { level: 50,  desc: '内力 +200' },
  { level: 100, desc: '内力 +500' }
];

function getTanafaLevel() {
  const s = player.skills.find(s => s.id === 'tanafa');
  return s ? s.level : 0;
}

/* 淬火呼吸法内力增速的基准值：首重 0.008/分钟，每重 +0.004，二十重起 ×2 */
const TANAFA_RATE_BASE = 0.004;
const TANAFA_RATE_PER_LEVEL = 0.002;
const TANAFA_RATE_DOUBLE_LEVEL = 20;

function calcNeiLiRate(level, luck) {
  if (!(Number(level) > 0)) return 0;
  let perMin = TANAFA_RATE_BASE + (Number(level) - 1) * TANAFA_RATE_PER_LEVEL;
  if (Number(level) >= TANAFA_RATE_DOUBLE_LEVEL) perMin *= 2;
  perMin *= 1 + Math.max(0, Number(luck) || 0) * 0.025;
  return perMin;
}

/* 淬火呼吸法单独贡献的内力增速 */
function getTanafaRatePerMin() {
  const level = getTanafaLevel();
  if (level <= 0) return 0;
  const mult = getPerLayerMult(getMartialSkillById('tanafa'));
  let perMin = TANAFA_RATE_BASE + (level - 1) * TANAFA_RATE_PER_LEVEL * mult;
  if (level >= TANAFA_RATE_DOUBLE_LEVEL) perMin *= 2;
  perMin *= getNeiLiSpeedMultiplier();
  return perMin;
}

/* ================= 医术 / 活脉养络法 ================= */

const HUOMAI_ID = 'huomai';
const HUOMAI_RATE_BASE = 0.01;
const HUOMAI_RATE_PER_LEVEL = 0.005;
const HUOMAI_UNLOCKS = [
  { level: 5,   desc: '战斗开始及每 5 秒获得一层【活脉】，每层提供医术/50 的每秒生命恢复' },
  { level: 20,  desc: '【活脉】的叠加速度提升到 3 秒一层，【活脉】效果增强至每层提供医术/30 的每秒生命恢复' },
  { level: 50,  desc: '每层【活脉】额外提升医术/100000 的行动速度' },
  { level: 100, desc: '【活脉】的叠加速度提升到 2 秒一层，【活脉】效果增强至每层提供医术/10 的每秒生命恢复' }
];

function getHuomaiSkill() {
  return (player.skills || []).find(s => s.id === HUOMAI_ID) || null;
}
function getHuomaiLevel() {
  const s = getHuomaiSkill();
  return s ? Math.max(0, Number(s.level) || 0) : 0;
}
function getHuomaiMedicineBonus(level = getHuomaiLevel()) {
  return Math.max(0, level) * 5 * getPerLayerMult(getMartialSkillById('huomai'));
}
function getHuomaiRootBonus(level = getHuomaiLevel()) {
  return Math.floor(Math.max(0, level) / 5) * getPerLayerMult(getMartialSkillById('huomai'));
}
function getTotalMedicine() {
  return (Number(player.medicine) || 0) + getHuomaiMedicineBonus();
}
function getTotalPoison() {
  return Number(player.poison) || 0;
}
function getHuomaiRatePerMin(level = getHuomaiLevel()) {
  if (level <= 0) return 0;
  const mult = getPerLayerMult(getMartialSkillById('huomai'));
  return (HUOMAI_RATE_BASE + (level - 1) * HUOMAI_RATE_PER_LEVEL * mult) * getNeiLiSpeedMultiplier();
}
/* 活脉叠层间隔（秒） */
function getHuomaiLayerInterval(level = getHuomaiLevel()) {
  if (level >= 100) return 2;
  if (level >= 20) return 3;
  return 5;
}
function getHuomaiRegenPerLayer(level = getHuomaiLevel(), medicine) {
  const m = medicine == null ? getTotalMedicine() : Number(medicine) || 0;
  if (level >= 100) return m / 10;
  if (level >= 20) return m / 30;
  return m / 50;
}
function getHuomaiSpeedPerLayer(level = getHuomaiLevel(), medicine) {
  if (level < 50) return 0;
  const m = medicine == null ? getTotalMedicine() : Number(medicine) || 0;
  return m / 100000;
}

function getNeiLiRatePerMin() {
  return getTanafaRatePerMin() + getHuomaiRatePerMin();
}
function getNeiLiRatePerSec() { return getNeiLiRatePerMin() / 60; }

function getNeiLiBonus() {
  const level = getTanafaLevel();
  let bonus = 0;
  if (level >= 10) bonus += 10;
  if (level >= 50) bonus += 200;
  if (level >= 100) bonus += 500;
  return bonus * getPerLayerMult(getMartialSkillById('tanafa'));
}
function getTotalNeiLi() { return player.neiLi + getNeiLiBonus() + getJiusiNeiLiBonus(); }
function getNeiLiDamageBonus() { return getTotalNeiLi() * 0.5; }
function getNeiLiDR() { return getTotalNeiLi() * 0.5; }

let lastNeiLiTime = Date.now();
function neiLiTick() {
  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  const dt = Math.max(0, (now - lastNeiLiTime) / 1000);
  lastNeiLiTime = now;
  if (!player.surname) return;
  const rate = getNeiLiRatePerSec();
  if (rate > 0) player.neiLi += rate * dt;
}

function updateNeiLiDisplays() {
  const txt = fmtNeiLi(getTotalNeiLi());
  const sEl = $('s-neili'); if (sEl) sEl.textContent = txt;
  const aEl = $('a-neili'); if (aEl) aEl.textContent = txt;

  const rateEl = $('a-neili-rate');
  if (rateEl) rateEl.textContent = fmtRate(getNeiLiRatePerMin()) + '/分钟';
  const dmgEl = $('a-neili-dmg');
  if (dmgEl) dmgEl.textContent = fmtNum(Math.round(getNeiLiDamageBonus() * 10) / 10);
  const drEl = $('a-neili-dr');
  if (drEl) drEl.textContent = fmtNum(Math.round(getNeiLiDR() * 10) / 10);
  const totalDrEl = $('a-dr');
  if (totalDrEl) {
    totalDrEl.textContent = fmtNum(Math.round((getTotalCon() + getExtraDR() + getNeiLiDR()) * 10) / 10);
  }
  const shenningEl = $('a-shenning');
  if (shenningEl) shenningEl.textContent = formatPercent(getShenningRate());
}

setInterval(() => {
  neiLiTick();
  updateNeiLiDisplays();
}, 1000);
