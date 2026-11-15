/* NPC 切磋 / 教学相关常量与纯函数（从 game.js 拆出，需在 game.js 之前加载） */
const SPAR_CD_MS = 10 * 60 * 1000;
const SPAR_EXP = 1200;
/* 个别角色的切磋冷却：书童 3 分钟，赵十二/赵铁柱/赵大夫/夏扑萤 10 分钟 */
const SPAR_CD_OVERRIDES = {
  shutong: 3 * 60 * 1000,
  zhaoTiezhu: 10 * 60 * 1000,
  zhaoShip: 10 * 60 * 1000,
  zhaoDaifu: 10 * 60 * 1000,
  xiaPuying: 10 * 60 * 1000
};

function getSparCdMs(npcId) {
  return Number(SPAR_CD_OVERRIDES[npcId]) || SPAR_CD_MS;
}

/* 切磋经验为基础奖励的 25%，再按各功法自身的修炼效率分别结算 */
const SPAR_EXP_RATIO = 0.25;

function calcSparSkillExp(baseExp, skill) {
  const base = Number(baseExp) || 0;
  if (base <= 0 || !skill) return 0;
  return Math.max(1, Math.round(base * SPAR_EXP_RATIO * getSkillTrainingEfficiency(skill)));
}

/* 玩家称呼相关（依赖全局 player / NPC_DEFS） */
function playerChildName() {
  return player.givenName || player.surname + player.givenName || '孩子';
}

function fillPlayerName(str) {
  return String(str).replace(/\{n\}/g, playerChildName());
}

function getNpcSkillLevels(npcId) {
  const def = NPC_DEFS[npcId];
  const store = (player.npcLevels && player.npcLevels[npcId]) || {};
  const out = {};
  def.skills.forEach(sk => {
    const v = Number(store[sk.id]);
    out[sk.id] = Math.max(1, Number.isFinite(v) && v > 0 ? v : sk.level);
  });
  return out;
}

function getNpcStats(npcId) {
  const def = NPC_DEFS[npcId];
  const levels = getNpcSkillLevels(npcId);
  const extra = { con: 0, neiLi: 0, fist: 0, blade: 0, sword: 0, changbing: 0, qimen: 0, hidden: 0, medicine: 0 };
  def.skills.forEach(sk => {
    const lv = Number(levels[sk.id]) || 0;
    const key = String(sk.stat || '');
    if (extra[key] !== undefined) {
      const per = Number(sk.per) > 0 ? Number(sk.per) : 1;
      extra[key] += lv * per;
    }
    /* 额外体魄加成：如书童王八拳 conPer: 1（每重体魄+1） */
    if (Number(sk.conPer) > 0) extra.con += lv * Number(sk.conPer);
  });
  return {
    con: def.baseCon + extra.con,
    neiLi: def.baseNeiLi + extra.neiLi,
    fist: (Number(def.fist) || 0) + extra.fist,
    blade: (Number(def.blade) || 0) + extra.blade,
    sword: (Number(def.sword) || 0) + extra.sword,
    changbing: (Number(def.changbing) || 0) + extra.changbing,
    qimen: (Number(def.qimen) || 0) + extra.qimen,
    hidden: (Number(def.hidden) || 0) + extra.hidden,
    medicine: (Number(def.medicine) || 0) + extra.medicine,
    levels
  };
}

const TEACH_CD_MS = 10 * 60 * 1000;

function getTeachCdLeft(npcId) {
  const at = Number((player.teachCd || {})[npcId]) || 0;
  return Math.max(0, at - Date.now());
}

function getSparCdLeft(npcId) {
  const at = Number((player.sparCd || {})[npcId]) || 0;
  return Math.max(0, at - Date.now());
}