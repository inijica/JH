/* 战斗系统（从 game.js 拆出，需在 game.js 之前加载） */
const MAX_FIGHTERS_PER_SIDE = 8;
const HAORAN_SHIELD_PER_LAYER = 100;
/* 【截脉】：每层降低 0.01 行动速度，每 3 秒消退一层 */
const JIUMAI_SPEED_DOWN = 0.01;
const JIUMAI_DECAY_MS = 3000;

/* 【撼山势】：震山拳施展后叠一层，上限 100 层，每层攻击附加体魄×0.05 的基础伤害 */
const HANSHAN_MAX_LAYERS = 100;
/* 【打穴】：飞石破命中后给敌人叠一层，无上限，每层降低 0.5 内力；随时间消退 */
const DAXUE_NEILI_DOWN = 0.5;
/* 【思退】：九思剑法每次使用后叠一层，上限 9 层，每层闪避 +3% */
const JIUSI_SITUI_MAX = 9;
const JIUSI_SITUI_EVA = 0.03;
/* 【流血】：每层每秒流失的气血 */
const BLEED_DAMAGE_PER_STACK_PER_SEC = 2;

/* 战斗状态（唯一实例） */
const battle = {
  stage: 1,
  allies: [],
  enemies: [],
  over: false,
  nextAt: 0,
  logs: [],
  pozhan: 0,
  lastPozhanAt: 0,
  sparNpcId: '',
  dreamId: '',
  storyBattleId: '',
  whiteRobe: null,
  forfeited: false,
  jiumaiNextAt: 0,
  strategyCursor: 0,
  strategyRemaining: [],
  bondStrategyCursor: 0,
  bondStrategyRemaining: [],
  startEffectsDone: false,
  lastHanShanAt: 0
};

function battleActive() {
  return battle.enemies.length > 0 && !battle.over;
}

function allFighters() {
  return (battle.allies || []).concat(battle.enemies || []);
}

function firstLivingEnemy() {
  return (battle.enemies || []).find(f => f && f.hp > 0) || null;
}

function playerFighter() {
  return (battle.allies || []).find(f => f && f.isPlayer) || null;
}

/* 依权重随机选择目标：每个目标有 targetWeight（默认1）。 */
function pickWeightedTarget(targets) {
  const alive = (targets || []).filter(f => f && f.hp > 0);
  if (!alive.length) return null;
  let total = 0;
  for (const t of alive) total += Math.max(0, Number(t.targetWeight) || 0);
  if (total <= 0) return alive[Math.floor(Math.random() * alive.length)];
  let r = Math.random() * total;
  for (const t of alive) {
    const w = Math.max(0, Number(t.targetWeight) || 0);
    if (r < w) return t;
    r -= w;
  }
  return alive[alive.length - 1];
}

/* 规整一方队伍：补齐 side / uid / bar / targetWeight，并保证上限。 */
function sealFighters(side, list) {
  const arr = Array.isArray(list) ? list.slice(0, MAX_FIGHTERS_PER_SIDE) : [];
  arr.forEach((f, i) => {
    if (!f) return;
    f.side = side;
    f.uid = f.uid || (side + '-' + i);
    if (f.bar == null) f.bar = 0;
    if (f.targetWeight == null) f.targetWeight = 1;
  });
  return arr.filter(Boolean);
}

let battleRunning = false;

const BATTLE_TICK_MS = 50;
const BATTLE_TIME_SCALE = 1.5;
const BATTLE_STEP_SECONDS = 0.3;
const BATTLE_MAX_BACKLOG = 300;

const battleEngine = {
  timerId: 0,
  lastAt: 0,
  pending: 0
};

function startBattleEngine() {
  battleEngine.lastAt = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  battleEngine.pending = 0;
  if (battleEngine.timerId) return;
  battleEngine.timerId = setInterval(battleTick, BATTLE_TICK_MS);
}

function stopBattleEngine() {
  if (battleEngine.timerId) {
    clearInterval(battleEngine.timerId);
    battleEngine.timerId = 0;
  }
  battleEngine.pending = 0;
}

/* 切磋入口见 battle-spar.js */
function addLog(text, cls) {
  battle.logs.push({ text, cls: cls || '' });
  renderLog();
}

/* 战斗界面渲染见 battle-render.js */
const BATTLE_SKILL_GROUP_ORDER = ['招式', '轻功', '外功', '内功'];

function getBattleSkillGroup(skill) {
  if (!skill) return BATTLE_SKILL_GROUP_ORDER.length;
  const direct = BATTLE_SKILL_GROUP_ORDER.indexOf(skill.type);
  if (direct >= 0) return direct;
  if (typeof skillMatchesCategory === 'function' && skillMatchesCategory(skill, '招式')) return 0;
  return BATTLE_SKILL_GROUP_ORDER.length;
}

function sortBattleSkillList(skills) {
  return (skills || [])
    .map((s, i) => ({ s, i, g: getBattleSkillGroup(s) }))
    .sort((a, b) => a.g - b.g || a.i - b.i)
    .map(({ s }) => `${s.name}（${levelToChinese(s.level)}重）`);
}

function buildPlayerFighter() {
  const huoLv = getHuomaiLevel();
  const f = {
    uid: 'ally-player',
    id: 'player',
    name: player.surname + player.givenName,
    isPlayer: true,
    side: 'ally',
    speed: getTotalSpeed(),
    con: getTotalCon(),
    neiLi: getTotalNeiLi(),
    fist: getTotalFist(),
    blade: getTotalBlade(),
    sword: getTotalSword(),
    changbing: getTotalChangbing(),
    qimen: getTotalQimen(),
    hidden: getTotalHidden(),
    accuracy: getAccuracyRate(),
    evasion: getEvasionRate(),
    root: getTotalRoot(),
    comp: getTotalComp(),
    luck: getTotalLuck(),
    medicine: getTotalMedicine(),
    skills: sortBattleSkillList(player.skills),
    memory: {},
    confused: false,
    targetWeight: 1,
    bar: 0,
    hanShiLayers: 0,
    siTuiLayers: 0,
    yourenLayers: 0
  };
  if (huoLv >= 5) {
    f.huomaiLayers = 1;
    f.huomaiInterval = getHuomaiLayerInterval(huoLv) * 1000;
    f.huomaiNextAt = (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now()) + f.huomaiInterval;
    f.huomaiRegenPerLayer = getHuomaiRegenPerLayer(getTotalMedicine());
    f.huomaiSpeedPerLayer = getHuomaiSpeedPerLayer(huoLv, getTotalMedicine());
  }
  Object.defineProperty(f, 'hp', {
    get: () => player.hp,
    set: v => { player.hp = v; },
    configurable: true
  });
  Object.defineProperty(f, 'maxHp', {
    get: () => player.maxHp,
    set: v => { player.maxHp = v; },
    configurable: true
  });
  return f;
}

function buildBondCompanionFighter() {
  const b = ensureBondChar();
  const boost = 1 + getBondValue() * 0.001;
  const fei = getFeishipoStats(b.levels.feishipo);
  const qy = b.levels.qingyuan;
  const con = getBondCon() * boost;
  const maxHp = Math.round(80 + con * 20);
  const extraStats = getBondExtraMartialStats();
  return {
    uid: 'ally-bond-xiaPuying',
    id: BOND_SPAR_ID,
    name: BOND_CHAR.name,
    isCompanion: true,
    side: 'ally',
    hp: maxHp,
    maxHp,
    speed: getBondSpeed() * boost,
    con,
    neiLi: getBondNeiLi() * boost,
    fist: (BOND_CHAR.fist + extraStats.fist) * boost,
    blade: (BOND_CHAR.blade + extraStats.blade) * boost,
    sword: (BOND_CHAR.sword + extraStats.sword) * boost,
    changbing: (BOND_CHAR.changbing + extraStats.changbing) * boost,
    qimen: (BOND_CHAR.qimen + extraStats.qimen) * boost,
    hidden: (getBondHidden() + extraStats.hidden) * boost,
    accuracy: 0.9 + qy * 0.0075,
    evasion: 0.05 + qy * 0.01 + (qy >= 25 ? 0.1 : 0),
    root: getBondRoot() * boost,
    comp: getBondComp() * boost,
    luck: getBondLuck() * boost,
    attack: { name: '飞石破', multiplier: fei.multiplier, hits: fei.hits, stat: 'hidden' },
    skills: getBondKnownSkillIds().map(id => `${getBondSkillName(id)}（${levelToChinese(b.levels[id])}重）`),
    memory: {},
    confused: false,
    qingyuanTrait: qy >= 100,
    targetWeight: 1,
    bar: 0
  };
}

function buildCompanionFighters(excludeIds, withCompanion) {
  /* 默认不随行出战：夏扑萤不会与玩家一同登台，仅在与李乾元的切磋中作为己方参战。 */
  if (!withCompanion) return [];
  const out = [];
  if (!excludeIds || !excludeIds.includes(BOND_SPAR_ID)) out.push(buildBondCompanionFighter());
  return out;
}

/* 150 羁绊解锁：与夏扑萤同阵营并肩作战时，双方闪避 +20%，玩家行动速度 += 夏扑萤行动速度/10 */
function applyBondSameCampBonus(allies) {
  if (getBondValue() < 150) return;
  const playerFighter = allies.find(f => f && f.isPlayer && f.hp > 0);
  const companionFighter = allies.find(f => f && f.isCompanion && f.hp > 0);
  if (!playerFighter || !companionFighter) return;
  if (!Array.isArray(battle.enemies) || !battle.enemies.some(f => f && f.hp > 0)) return;
  playerFighter.evasion = Math.min(1, (Number(playerFighter.evasion) || 0) + 0.2);
  companionFighter.evasion = Math.min(1, (Number(companionFighter.evasion) || 0) + 0.2);
  playerFighter.speed = (Number(playerFighter.speed) || 0) + (Number(companionFighter.speed) || 0) / 10;
}

function buildAllyTeam(excludeIds, withCompanion) {
  const allies = sealFighters('ally', [buildPlayerFighter(), ...buildCompanionFighters(excludeIds, withCompanion)]);
  applyBondSameCampBonus(allies);
  return allies;
}

function applyDamageToFighter(f, dmg) {
  let remain = Math.max(0, Number(dmg) || 0);
  let absorbed = 0;
  if (Number(f.haoranLayers) > 0) {
  const perLayer = HAORAN_SHIELD_PER_LAYER;
  const capacity = Math.max(0, f.haoranLayers * perLayer - (Number(f.haoranAccum) || 0));
  absorbed = Math.min(remain, capacity);
  f.haoranAccum = (Number(f.haoranAccum) || 0) + absorbed;
  while (f.haoranLayers > 0 && f.haoranAccum >= perLayer) {
    f.haoranAccum -= perLayer;
    f.haoranLayers -= 1;
  }
  if (f.haoranLayers <= 0) f.haoranAccum = 0;
  remain -= absorbed;
}
  f.hp -= remain;
  return { absorbed, applied: remain };
}

/* 对一方造成一段伤害：若击杀目标，溢出伤害按权重转移给另一个随机目标。 */
function dealSegmentDamage(side, target, damage) {
  let remaining = Math.max(0, Number(damage) || 0);
  let cur = (target && target.hp > 0) ? target : pickWeightedTarget(side.filter(f => f.hp > 0));
  const report = { applied: 0, absorbed: 0, hits: [], finalAlive: cur };
  let guard = 0;
  while (remaining > 0 && guard++ < 64) {
    const living = side.filter(f => f && f.hp > 0);
    if (!living.length) break;
    if (!cur || cur.hp <= 0) cur = pickWeightedTarget(living);
    if (!cur) break;
    const res = applyDamageToFighter(cur, remaining);
    report.applied += res.applied;
    report.absorbed += res.absorbed;
    remaining -= (res.applied + res.absorbed);
    if (cur.hp <= 0) {
      const over = -cur.hp;
      cur.hp = 0;
      report.hits.push({ fighter: cur, applied: res.applied, absorbed: res.absorbed, killed: true });
      cur = null;
      report.finalAlive = null;
      remaining = over;
    } else {
      report.hits.push({ fighter: cur, applied: res.applied, absorbed: res.absorbed, killed: false });
      report.finalAlive = cur;
      remaining = 0;
    }
  }
  return report;
}

/* 战士的攻/防数值（与原单挑规则一致）。 */
const COMPANION_DAMAGE_SCALE = 0.8;   // 同伴伤害系数（不让同伴抢主角风头）

/* 【打穴】后的有效内力：每层降低 0.5，最低为 0 */
function fighterNeiLi(f) {
  if (!f) return 0;
  const base = Number(f.neiLi) || 0;
  const down = (Number(f.daxueLayers) || 0) * DAXUE_NEILI_DOWN;
  return Math.max(0, base - down);
}

/* 有效闪避：玩家及使用九思剑法的同伴额外计入【思退】层数 */
function fighterEvasion(f) {
  if (!f) return 0;
  const base = f.isPlayer ? getEvasionRate() : (Number(f.evasion) || 0);
  return Math.min(1, base + (Number(f.siTuiLayers) || 0) * JIUSI_SITUI_EVA);
}

function fighterAttackValue(f, stat) {
  if (!f) return 0;
  if (stat === 'con') return Number(f.con) || 0;
  if (stat === 'neiLi') return fighterNeiLi(f);
  if (stat === 'hidden') return Number(f.hidden) || 0;
  if (stat === 'blade') return Number(f.blade) || 0;
  if (stat === 'sword') return Number(f.sword) || 0;
  if (stat === 'changbing') return Number(f.changbing) || 0;
  if (stat === 'qimen') return Number(f.qimen) || 0;
  return Number(f.fist) || 0;
}

function fighterDefenseValue(f, stat) {
  if (!f) return 0;
  if (stat === 'con') return Number(f.con) || 0;
  if (stat === 'neiLi') return fighterNeiLi(f);
  if (f.isPlayer) return getPlayerBestMartial().value;
  
  /* 修改点：NPC防御时，统一取自身全部武学中的最高值 */
  return Math.max(
    Number(f.fist) || 0, 
    Number(f.blade) || 0, 
    Number(f.sword) || 0, 
    Number(f.changbing) || 0,
    Number(f.qimen) || 0, 
    Number(f.hidden) || 0
  );
}

function fighterDR(f) {
  if (!f) return 0;
  if (f.isPlayer) return getTotalCon() + getExtraDR() + getNeiLiDR();
  return (Number(f.con) || 0) + fighterNeiLi(f) * 0.5;
}

/* 己方（主角或同伴）受到敌方攻击时的闪避与增伤判定。 */
function resolveAllyDodge(attacker, target) {
  const baseAcc = Number(attacker.accuracy) || 0.9;
  const isPlayerT = !!target.isPlayer;
  const eva = fighterEvasion(target);
  const enemyXushi = Math.random() < Math.min(1, Math.max(0, ((Number(attacker.comp) || 0) * 0.5 - getXushiPoints() / 2) * 0.01));
  let acc = baseAcc;
  let overflow = 0;
  if (enemyXushi) {
    acc = baseAcc * 1.5;
    const raw = acc - eva;
    if (raw > 1) overflow = raw - 1;
  }
  let dodged = rollDodge(acc, eva);
  let dodgeKind = '';
  if (!dodged && isPlayerT && hasQingyuanTrait() && rollDodge(acc, Math.max(0, eva - 0.3))) {
    dodged = true; dodgeKind = 'qingyuan';
  } else if (!dodged && target.qingyuanTrait && rollDodge(acc, Math.max(0, eva - 0.3))) {
    dodged = true; dodgeKind = 'qingyuan';
  }
  if (!dodged && isPlayerT && Math.random() < getShenningRate(getEnemySkillValue('shenning', attacker)) && rollDodge(acc, eva + 0.3)) {
    dodged = true; dodgeKind = 'shenning';
  }
  return { dodged, dodgeKind, acc, eva, overflow, enemyXushi };
}

function checkBattleEnd() {
  if (battle.over) return;
  const enemiesAlive = (battle.enemies || []).some(f => f && f.hp > 0);
  const alliesAlive = (battle.allies || []).some(f => f && f.hp > 0);
  const pf = playerFighter();
  if (!enemiesAlive) { winBattle(); return; }
  if (typeof storyBattleInterceptDeath === 'function' && storyBattleInterceptDeath()) return;
  if (!alliesAlive || (pf && pf.hp <= 0)) { loseBattle(); return; }
}

/* 战斗界面刷新见 battle-render.js */
function pauseBattle() {
  battleRunning = false;
  stopBattleEngine();
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '恢 复 战 斗';
}

function resumeBattle() {
  if (!battleActive() || battle.over || battleRunning) return;
  battleRunning = true;
  startBattleEngine();
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '暂 停 战 斗';
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && battleRunning) battleTick();
});

function triggerJieniu(target) {
  if (!hasJieniu()) return;
  if (battle.pozhan <= 0) return;
  battle.pozhan--;
  const lv = getPaodingLevel();
  const en = (target && target.hp > 0) ? target : pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!en) return;
  let dmg = lv * getTotalCon() / 10;
  dmg += getNeiLiDamageBonus();
  dmg -= fighterNeiLi(en) * 0.5;
  dmg = Math.max(0, Math.round(dmg * 10) / 10);
  const res = dealSegmentDamage(battle.enemies, en, dmg);
  const kills = res.hits.filter(h => h.killed).map(h => h.fighter.name);
  addLog(`【解牛·破绽】对${en.name}造成 ${fmtNum(res.applied)} 点固定伤害${res.absorbed > 0 ? `（浩然气化去 ${fmtNum(res.absorbed)} 点）` : ''}${kills.length ? `，击倒 ${kills.join('、')}` : ''}`, 'crit');
}

/* 战斗策略见 battle-strategy.js */
function getPlayerAttackStyle() {
  const sel = (player.trainingSelections || {})['招式'];
  if (sel === 'feishipo' && getFeishipoLevel() > 0) return 'feishipo';
  if (sel === 'jiusi' && getJiusiLevel() > 0) return 'jiusi';
  if (sel === 'paodingDao' && hasPaodingDao()) return 'paodingDao';
  return 'zhenshan';
}

function doPlayerAttack() {
  if (player.strategy && player.strategy.enabled) {
    if (tryLowHpStrategy()) return;
    const sid = resolveStrategySkill();
    if (sid === 'feishipo') return doFeishipoAttack();
    if (sid === 'zhenshan') return doZhenshanAttack();
    if (sid === 'jiusi' && getJiusiLevel() > 0) return doJiusiAttack();
    if (sid === 'paodingDao' && hasPaodingDao()) return doPaodingDaoAttack();
    if (sid === 'jinzhen' && typeof hasJinzhenTechnique === 'function' && hasJinzhenTechnique()) return doPlayerJinzhen();
    if (sid) return;
  }
  const style = getPlayerAttackStyle();
  if (style === 'feishipo') return doFeishipoAttack();
  if (style === 'jiusi') return doJiusiAttack();
  if (style === 'paodingDao') return doPaodingDaoAttack();
  return doZhenshanAttack();
}

function doZhenshanAttack() {
  const primary = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!primary) return;
  const level = getWangbaLevel();
  const stats = getWangbaStats(level);

  let effectMultiplier = 1;

  if (level >= 100 && !primary.memory['zhenshan']) {
    primary.memory['zhenshan'] = true;
    effectMultiplier = 5;
    primary.confused = true;
    addLog(`【震山拳奥义】${primary.name}从未见过此招，受到重创并陷入混乱！`, 'crit');
  }
  primary.memory['zhenshan'] = true;

  performWangbaStrike(stats, effectMultiplier, 1, primary);
  if (battle.over) return;

  const mianmianCount = rollMianmianCount(getMianmianRate(getEnemySkillValue('mianmian', primary)));
  for (let c = 0; c < mianmianCount; c++) {
    if (battle.over) return;
    const t = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
    if (!t) return;
    addLog('【延绵不绝】你气机未断，招式连绵再起！', 'crit');
    performWangbaStrike(stats, 1, 0.3, t);
    if (battle.over) return;
  }
}

function doFeishipoAttack() {
  const primary = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!primary) return;
  const level = getFeishipoLevel();
  const stats = getFeishipoStats(level);

  let effectMultiplier = 1;

  if (level >= 100 && !primary.memory['feishipo']) {
    primary.memory['feishipo'] = true;
    effectMultiplier = 3.5;
    primary.vulnerable = 0.2;
    addLog(`【飞石破奥义】石子破空而至，${primary.name}护体气机被凿穿，此后受创更重！`, 'crit');
  }
  primary.memory['feishipo'] = true;

  performFeishipoStrike(stats, effectMultiplier, 1, primary);
  if (battle.over) return;

  const mianmianCount = rollMianmianCount(getMianmianRate(getEnemySkillValue('mianmian', primary)));
  for (let c = 0; c < mianmianCount; c++) {
    if (battle.over) return;
    const t = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
    if (!t) return;
    addLog('【延绵不绝】你气机未断，招式连绵再起！', 'crit');
    performFeishipoStrike(stats, 1, 0.3, t);
    if (battle.over) return;
  }
}

function doJiusiAttack() {
  const primary = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!primary) return;
  const level = getJiusiLevel();
  const stats = getJiusiStats(level);

  performJiusiStrike(stats, 1, 1, primary);
  if (battle.over) return;

  const mianmianCount = rollMianmianCount(getMianmianRate(getEnemySkillValue('mianmian', primary)));
  for (let c = 0; c < mianmianCount; c++) {
    if (battle.over) return;
    const t = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
    if (!t) return;
    addLog('【延绵不绝】你气机未断，招式连绵再起！', 'crit');
    performJiusiStrike(stats, 1, 0.3, t);
    if (battle.over) return;
  }
}

function doPaodingDaoAttack() {
  const primary = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!primary) return;
  const level = getPaodingDaoLevel();
  const stats = getPaodingDaoStats(level);

  performPaodingDaoStrike(stats, 1, 1, primary);
  if (battle.over) return;

  const mianmianCount = rollMianmianCount(getMianmianRate(getEnemySkillValue('mianmian', primary)));
  for (let c = 0; c < mianmianCount; c++) {
    if (battle.over) return;
    const t = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
    if (!t) return;
    addLog('【延绵不绝】你气机未断，招式连绵再起！', 'crit');
    performPaodingDaoStrike(stats, 1, 0.3, t);
    if (battle.over) return;
  }
}

/* 玩家特技：与赵大夫的金针渡穴一致，治疗气血比例最低的友方，随后停止行动 3 秒 */
function doPlayerJinzhen() {
  const me = playerFighter();
  if (!me || me.hp <= 0) return;
  if (me.jinzhenUsed) {
    addLog('【金针渡穴】此战金针已用过，无法再次施针。', '');
    return;
  }
  const injured = (battle.allies || []).filter(f => f && f.hp > 0 && f.maxHp > 0 && f.hp < f.maxHp);
  if (!injured.length) {
    addLog('【金针渡穴】同伴气血充盈，你无须施针。', '');
    return;
  }
  doJinzhen(me, injured);
}

function performWangbaStrike(stats, effectMultiplier, scale, target) {
  const pf = playerFighter();
  const layers = pf ? Math.min(HANSHAN_MAX_LAYERS, Number(pf.hanShiLayers) || 0) : 0;
  const doubleHanShan = getWangbaLevel() >= 100;
  const res = performStrike({
    name: '震山拳',
    stats,
    effectMultiplier,
    scale,
    target,
    vulnerable: false,
    calcDamage: (mult, eff, e) => calcFistDamage(mult, eff, e, layers, doubleHanShan)
  });
  /* 【撼山势】施展后叠一层，上限 100 */
  if (pf) pf.hanShiLayers = Math.min(HANSHAN_MAX_LAYERS, layers + 1);
  return res;
}

function performFeishipoStrike(stats, effectMultiplier, scale, target) {
  return performStrike({
    name: '飞石破',
    stats,
    effectMultiplier,
    scale,
    target,
    vulnerable: true,
    applyDaxue: true,
    calcDamage: (mult, eff, e) => calcHiddenDamage(mult, eff, e)
  });
}

function performJiusiStrike(stats, effectMultiplier, scale, target) {
  const pf = playerFighter();
  const res = performStrike({
    name: '九思剑法',
    stats,
    effectMultiplier,
    scale,
    target,
    vulnerable: false,
    calcDamage: (mult, eff, e) => calcSwordDamage(mult, eff, e)
  });
  /* 【思退】：每次使用后叠一层，上限 9 */
  if (pf) pf.siTuiLayers = Math.min(JIUSI_SITUI_MAX, (Number(pf.siTuiLayers) || 0) + 1);
  return res;
}

function performPaodingDaoStrike(stats, effectMultiplier, scale, target) {
  const pf = playerFighter();
  const level = getPaodingDaoLevel();
  return performStrike({
    name: '庖丁刀法',
    stats,
    effectMultiplier,
    scale,
    target,
    vulnerable: false,
    accuracyBonus: getPaodingDaoAccuracyBonus(level),
    calcDamage: (mult, eff, e) => calcBladeDamage(mult, eff, e, level),
    /* 【游刃】每段伤害按当前层数附加固定值 */
    flatPerHit: () => (Number(pf && pf.yourenLayers) || 0) * getPaodingDaoYourenPerLayer(level),
    onHit: () => { if (pf) pf.yourenLayers = (Number(pf.yourenLayers) || 0) + 1; }
  });
}

function performStrike(opts) {
  const initialTarget = opts.target || pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!initialTarget || initialTarget.hp <= 0) return;

  const stats = opts.stats;
  const name = opts.name;
  const effectMultiplier = Number(opts.effectMultiplier) || 1;
  const scale = Number(opts.scale) || 1;

  const xushi = Math.random() < Math.min(1, getXushiRate(getEnemySkillValue('xushi', initialTarget)));
  const baseAcc = getAccuracyRate();
  let acc = baseAcc;
  let xuriOverflow = 0;
  if (xushi) {
    acc = baseAcc * 1.5;
    const raw = acc - (Number(initialTarget.evasion) || 0);
    if (raw > 1) xuriOverflow = raw - 1;
  }
  acc += Number(opts.accuracyBonus) || 0;

  let cur = initialTarget;
  let hitSegments = 0;
  let missSegments = 0;
  let segmentDamage = 0;
  let absorbedTotal = 0;
  const touched = new Map();
  const kills = [];

  for (let i = 0; i < stats.hits; i++) {
    const alive = (battle.enemies || []).filter(f => f && f.hp > 0);
    if (!alive.length || battle.over) break;
    if (!cur || cur.hp <= 0) cur = pickWeightedTarget(alive);
    if (!cur) break;
    const e = cur;
    const hitChance = Math.max(0, Math.min(1, acc - (Number(e.evasion) || 0)));
    if (Math.random() >= hitChance) { missSegments++; continue; }
    let dmg = opts.calcDamage(stats.multiplier, effectMultiplier, e);
    if (xuriOverflow > 0) dmg *= (1 + xuriOverflow);
    const vuln = opts.vulnerable ? Math.max(0, Number(e.vulnerable) || 0) : 0;
    if (vuln > 0) dmg *= (1 + vuln);
    dmg = Math.max(0, Math.round(dmg * scale * 10) / 10);
    if (typeof opts.flatPerHit === 'function') {
      const flat = Number(opts.flatPerHit()) || 0;
      if (flat > 0) dmg += flat;
    }
    const res = dealSegmentDamage(battle.enemies, cur, dmg);
    absorbedTotal += res.absorbed;
    segmentDamage += res.applied;
    hitSegments++;
    for (const h of res.hits) {
      const key = h.fighter.name;
      const t = touched.get(key) || { applied: 0 };
      t.applied += h.applied;
      if (h.killed) kills.push(key);
      touched.set(key, t);
    }
    /* 【打穴】飞石破每段命中给目标叠一层，无上限 */
    if (opts.applyDaxue && e) {
      e.daxueLayers = (Number(e.daxueLayers) || 0) + 1;
    }
    if (typeof opts.onHit === 'function') opts.onHit(e);
    triggerJieniu(cur);
    cur = res.finalAlive;
    if (battle.over) break;
    const pf = playerFighter();
    if (pf && pf.hp <= 0) break;
  }

  if (hitSegments <= 0) {
    addLog(`你施展【${name}】，却尽数被闪避（命中率 ${formatPercent(Math.max(0, Math.min(1, acc - (Number(initialTarget.evasion) || 0))))}）`, '');
    if (typeof storyBattleAfterAttack === 'function') {
      storyBattleAfterAttack({
        attacker: playerFighter(),
        target: initialTarget,
        hitSegments,
        missSegments
      });
    }
    return;
  }

  const neiBonus = Math.round(getNeiLiDamageBonus() * scale * 10) / 10;
  const totalDamage = Math.round((segmentDamage + neiBonus) * 10) / 10;

  const targetText = [...touched.keys()].join('、');
  const detail = [`${hitSegments}段命中`];
  if (missSegments) detail.push(`${missSegments}段被闪避`);
  if (xushi) detail.push(`虚实莫测·命中 ${formatPercent(Math.max(0, Math.min(1, acc - (Number(initialTarget.evasion) || 0))))}`);
  if (xuriOverflow > 0) detail.push(`溢出命中增伤 +${Math.round(xuriOverflow * 100)}%`);
  if (absorbedTotal > 0) detail.push(`浩然气化去 ${fmtNum(absorbedTotal)} 点`);
  if (scale < 1) detail.push(`效果 ${Math.round(scale * 100)}%`);
  if (kills.length) detail.push(`击倒 ${[...new Set(kills)].join('、')}`);
  if (touched.size > 1) {
    detail.push([...touched.entries()].map(([n, t]) => `${n} ${fmtNum(Math.round(t.applied * 10) / 10)} 点`).join('，'));
  }

  addLog(`你施展【${name}】，对${targetText}造成 ${fmtNum(totalDamage)} 点伤害（${detail.join('，')}）`, 'dmg');
  shakeCard(cur || initialTarget);

  if (initialTarget.hp > 0 && !battle.over) doWujiuCounter(initialTarget, stats.hits, playerFighter());
}

function doWujiuCounter(e, hits, attacker) {
  if (!e || e.hp <= 0) return;
  const stacks = Number(e.wujiuStacks) || 0;
  if (stacks <= 0) return;
  /* 反击落在出手的己方成员身上；书童在场时，他强行替队友挡下这一击 */
  const attackerTarget = (attacker && attacker.side === 'ally') ? attacker : playerFighter();
  if (!attackerTarget || attackerTarget.hp <= 0) return;
  const shutongTank = (battle.allies || []).find(f => f && f.id === 'shutong' && f.hp > 0);
  const target = shutongTank || attackerTarget;

  e.wujiuStacks = stacks - 1;

  const own = Number(e.fist) || 0;
  const against = fighterDefenseValue(target, 'fist');
  const perHit = Math.max(0, Math.round((20 + own + (own - against / 2) * 2.5) * (0.1 * stacks) * 2 * 10) / 10);
  const hitCount = Math.max(1, Number(hits) || 1);
  const totalDR = fighterDR(target);
  const dmg = Math.max(0, Math.round((perHit * hitCount - totalDR) * 10) / 10);
  target.hp -= dmg;
  const who = target.isPlayer ? '你' : target.name;
  addLog(`【无咎】${e.name} 回防了破绽之处并顺势反击，以${hitCount}指伤${who} ${fmtNum(dmg)} 点（消耗 1 层，剩余 ${e.wujiuStacks} 层）`, 'dmg');
  shakeCard(target);
  if (target.hp <= 0) {
    target.hp = 0;
    addLog(`${target.name} 倒下了！`, 'dmg');
  }
}

/* 赵大夫的战斗策略：默认截脉指；队内有成员气血低于七成时，有 1/3 概率改用金针渡穴 */
function doZhaoDaifuAction(e) {
  const injured = (battle.enemies || []).filter(f => f && f.hp > 0 && f.maxHp > 0 && f.hp / f.maxHp < 0.7);
  if (injured.length && !e.jinzhenUsed && Math.random() < 1 / 3) {
    doJinzhen(e, injured);
    return;
  }
  doJiemai(e);
}

function doJiemai(e) {
  const target = pickWeightedTarget((battle.allies || []).filter(f => f && f.hp > 0));
  if (!target) return;
  const a = e.attack || {};
  const hits = Math.max(1, Number(a.hits) || 1);
  const mult = Number(a.multiplier) || 0;
  const own = Number(e.fist) || 0;
  const against = fighterDefenseValue(target, 'fist');
  const perHit = Math.max(0, (20 + own + (own - against / 2) * 2.5) * mult * 2);
  let landed = 0, missed = 0;
  for (let i = 0; i < hits; i++) {
    if (resolveAllyDodge(e, target).dodged) { missed++; continue; }
    landed++;
  }
  const who = target.isPlayer ? '你' : target.name;
  if (!landed) {
    addLog(`${e.name} 施展【${a.name || '截脉指'}】，指锋尽数落空，${who}未被封住经脉。`, '');
    return;
  }
  const dmg = Math.max(0, Math.round((perHit * landed - fighterDR(target)) * 10) / 10);
  target.hp -= dmg;
  if (target.hp < 0) target.hp = 0;
  target.jiumai = (Number(target.jiumai) || 0) + landed;
  const notes = [`${landed}段命中`];
  if (missed) notes.push(`${missed}段被闪避`);
  addLog(`【截脉指】${e.name} 指力点中${who}经脉，造成 ${fmtNum(dmg)} 点伤害（${notes.join('，')}），【截脉】积至 ${target.jiumai} 层`, 'dmg');
  shakeCard(target);
  if (target.hp <= 0) addLog(`${target.name} 倒下了！`, 'dmg');
}

function doJinzhen(e, injured) {
  if (!e || e.jinzhenUsed) return;
  const lowest = injured.slice().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
  if (!lowest) return;
  e.jinzhenUsed = true;
  const med = Number(e.medicine) || 0;
  const healRaw = med * 5;
  const before = lowest.hp;
  lowest.hp = Math.min(lowest.maxHp, lowest.hp + healRaw);
  const healed = Math.round((lowest.hp - before) * 10) / 10;
  const who = lowest.isPlayer ? '你' : lowest.name;
  addLog(`【金针渡穴】${e.name} 取出金针，为${who}疏通经络，恢复 ${fmtNum(healed)} 点气血。`, 'win');
  shakeCard(lowest);
  e.stunUntil = (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now()) + 3000;
  e.bar = 0;
  addLog(`【金针渡穴】${e.name} 收针调息，三息之内不再动作。`, '');
}

function doEnemyAttack(e) {
  if (!e || e.hp <= 0) return;
  /* 剧情战斗可完全接管某名敌人的行动（如裴文秀） */
  if (typeof storyBattleEnemyAction === 'function' && storyBattleEnemyAction(e)) return;
  if (e.npcId === 'zhaoDaifu' && !e.confused) { doZhaoDaifuAction(e); return; }

  if (e.attack && e.attack.noDamage && !e.confused) {
    e.wujiuStacks = (Number(e.wujiuStacks) || 0) + 1;
    addLog(`${e.name} 施展【${e.attack.name}】，指势凝而不发，【无咎】已积 ${e.wujiuStacks} 层。`, '');
    return;
  }

  if (e.confused) {
    e.confused = false;
    if (e.attack && e.attack.noDamage) {
      e.wujiuStacks = (Number(e.wujiuStacks) || 0) + 1;
      addLog(`${e.name} 陷入混乱，指力错乱不成招式，【无咎】反积至 ${e.wujiuStacks} 层。`, 'dmg');
      return;
    }
    const dmg = Math.max(0, Math.round(calcNormalDamage(1) * 10) / 10);
    e.hp -= dmg;
    addLog(`${e.name} 陷入混乱，攻击了自己，造成 ${fmtNum(dmg)} 点伤害！`, 'dmg');
    shakeCard(e);
    if (e.hp <= 0) e.hp = 0;
    return;
  }

  const target = pickWeightedTarget((battle.allies || []).filter(f => f && f.hp > 0));
  if (!target) return;

  const dodge = resolveAllyDodge(e, target);
  if (dodge.dodged) {
    const who = target.isPlayer ? '你' : target.name;
    addLog(
      dodge.dodgeKind === 'qingyuan'
        ? `【青鸢飞纵】${who}借势再折，第二次判定中避过${e.name}的攻击！`
        : (dodge.dodgeKind === 'shenning'
          ? `【神宁气静】${who}心如止水，看破来势，再避${e.name}的攻击！`
          : `${who}侧身避开了${e.name}的攻击。`),
      dodge.dodgeKind ? 'win' : ''
    );
    /* 九思剑法 20 重：【思退】满九层时，闪避后用九思剑法反击 */
    if (target.isPlayer && getJiusiLevel() >= 20 &&
        (Number(target.siTuiLayers) || 0) >= JIUSI_SITUI_MAX && !battle.over) {
      addLog('【思退·反击】你借闪身之势回剑反刺！', 'crit');
      doJiusiAttack();
      if (!battle.over) checkBattleEnd();
    }
    return;
  }

  let rawDmg;
  let segNote = '';
  if (e.attack) {
    const a = e.attack;
    const own = fighterAttackValue(e, a.stat);
    const against = fighterDefenseValue(target, a.stat);
    const hits = Math.max(1, Number(a.hits) || 1);
    const perHit = Math.max(0, (20 + own + (own - against / 2) * 2.5) * (Number(a.multiplier) || 0) * 2);
    rawDmg = perHit * hits;
    if (hits > 1) segNote = `${hits}段命中`;
  } else {
    rawDmg = (Number(e.atk) || 0) + Math.round(Math.random() * 4) - 2;
  }
  let dmg = Math.max(0, rawDmg - fighterDR(target));
  if (dodge.overflow > 0) dmg *= (1 + dodge.overflow);
  if (Number(target.damageTakenMult) > 0) dmg *= Number(target.damageTakenMult);
  dmg = Math.round(dmg * 10) / 10;

  target.hp -= dmg;
  const who = target.isPlayer ? '你' : target.name;
  const notes = [];
  if (segNote) notes.push(segNote);
  if (dodge.enemyXushi) notes.push(`虚实莫测·命中 ${formatPercent(Math.min(1, dodge.acc - dodge.eva))}`);
  if (dodge.overflow > 0) notes.push(`溢出命中增伤 +${Math.round(dodge.overflow * 100)}%`);
  addLog(`${e.name} 施展【${e.attack ? e.attack.name : '攻势'}】，对${who}造成 ${fmtNum(dmg)} 点伤害${notes.length ? `（${notes.join('，')}）` : ''}`, 'dmg');
  shakeCard(target);

  if (e.attack && e.attack.bleed && target.hp > 0) {
    const bleedHits = Math.max(1, Number(e.attack.hits) || 1);
    target.bleedStacks = Math.floor((Number(target.bleedStacks) || 0) + bleedHits);
    if (!target.bleedNextAt) target.bleedNextAt = (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now()) + 1000;
    addLog(`【流血】${who}被${e.attack.name}咬中，流血叠加至 ${target.bleedStacks} 层。`, 'dmg');
  }

  if (target.hp <= 0) {
    target.hp = 0;
    addLog(`${target.name} 倒下了！`, 'dmg');
  }
}

function calcFighterAttackDamage(f, target, mult) {
  const stat = (f.attack && f.attack.stat) || 'fist';
  const own = fighterAttackValue(f, stat);
  const def = fighterDefenseValue(target, stat);
  return (20 + (Number(f.con) || 0) + (own - def / 2) * 2.5) * mult * 2;
}

function getBondCompanionSkillSpec(skillId, f) {
  const b = typeof ensureBondChar === 'function' ? ensureBondChar() : null;
  const lv = Number(b && b.levels && b.levels[skillId]) || 0;
  if (skillId === 'zhenshan' && lv > 0) {
    const st = getWangbaStats(lv);
    return {
      id: 'zhenshan',
      name: '震山拳',
      hits: st.hits,
      multiplier: st.multiplier,
      stat: 'fist',
      hanShi: true,
      doubleHanShan: lv >= 100
    };
  }
  if (skillId === 'jiusi' && lv > 0) {
    const st = getJiusiStats(lv);
    return {
      id: 'jiusi',
      name: '九思剑法',
      hits: st.hits,
      multiplier: st.multiplier,
      stat: 'sword',
      siJin: true,
      siTui: true
    };
  }
  if (skillId === 'paodingDao' && lv > 0) {
    const st = getPaodingDaoStats(lv);
    return {
      id: 'paodingDao',
      name: '庖丁刀法',
      hits: st.hits,
      multiplier: st.multiplier,
      stat: 'blade',
      accuracyBonus: getPaodingDaoAccuracyBonus(lv),
      ignoreDef: true
    };
  }
  if (skillId === 'feishipo' && lv > 0) {
    const st = getFeishipoStats(lv);
    return {
      id: 'feishipo',
      name: '飞石破',
      hits: st.hits,
      multiplier: st.multiplier,
      stat: 'hidden'
    };
  }
  const atk = (f && f.attack) || {};
  return {
    id: '',
    name: atk.name || '飞石破',
    hits: Math.max(1, Number(atk.hits) || 1),
    multiplier: Number(atk.multiplier) || 0,
    stat: atk.stat || 'hidden'
  };
}

function doCompanionAction(f) {
  if (!f || f.hp <= 0) return;

  if (f.confused) {
    f.confused = false;
    const dmg = Math.max(0, Math.round(calcNormalDamage(1) * 10) / 10);
    f.hp -= dmg;
    addLog(`${f.name} 陷入混乱，攻击了自己，造成 ${fmtNum(dmg)} 点伤害！`, 'dmg');
    shakeCard(f);
    if (f.hp <= 0) f.hp = 0;
    return;
  }

  let chosenSkillId = '';
  if (f.id === BOND_SPAR_ID && player.bondStrategy && player.bondStrategy.enabled) {
    chosenSkillId = tryBondLowHpStrategy(f) || resolveBondStrategySkill();
  }
  const spec = getBondCompanionSkillSpec(chosenSkillId, f);

  const acc = (Number(f.accuracy) || 0.9) + (Number(spec.accuracyBonus) || 0);
  const hits = Math.max(1, Number(spec.hits) || 1);
  const mult = Number(spec.multiplier) || 0;
  let cur = pickWeightedTarget((battle.enemies || []).filter(x => x && x.hp > 0));
  if (!cur) return;
  const firstTarget = cur;

  const hanShiLayers = spec.hanShi ? Math.min(HANSHAN_MAX_LAYERS, Number(f.hanShiLayers) || 0) : 0;
  const hanShiPerLayer = HANSHAN_CON_PER_LAYER * (spec.doubleHanShan ? 2 : 1);

  let hitSegments = 0, missSegments = 0, dmgTotal = 0, absorbedTotal = 0;
  const touched = new Map();
  const kills = [];

  for (let i = 0; i < hits; i++) {
    const alive = (battle.enemies || []).filter(x => x && x.hp > 0);
    if (!alive.length || battle.over) break;
    if (!cur || cur.hp <= 0) cur = pickWeightedTarget(alive);
    if (!cur) break;
    const hitChance = Math.max(0, Math.min(1, acc - (Number(cur.evasion) || 0)));
    if (Math.random() >= hitChance) { missSegments++; continue; }

    const own = fighterAttackValue(f, spec.stat);
    const def = spec.ignoreDef ? 0 : fighterDefenseValue(cur, spec.stat);
    const hanShiBonus = spec.hanShi ? hanShiLayers * hanShiPerLayer * (Number(f.con) || 0) : 0;
    let raw = (20 + (Number(f.con) || 0) + (own - def / 2) * 2.5 + hanShiBonus) * mult * 2;
    if (spec.siJin) raw *= (1 + (Number(f.comp) || 0) * 0.005);

    const dmg = Math.max(0, Math.round(
      raw * COMPANION_DAMAGE_SCALE *
      (Number(f.damageDealtMult) > 0 ? Number(f.damageDealtMult) : 1) * 10
    ) / 10);
    const res = dealSegmentDamage(battle.enemies, cur, dmg);
    absorbedTotal += res.absorbed;
    dmgTotal += res.applied;
    hitSegments++;
    for (const h of res.hits) {
      const t = touched.get(h.fighter.name) || { applied: 0 };
      t.applied += h.applied;
      if (h.killed) kills.push(h.fighter.name);
      touched.set(h.fighter.name, t);
    }
    cur = res.finalAlive;
  }

  if (spec.hanShi) {
    f.hanShiLayers = Math.min(HANSHAN_MAX_LAYERS, hanShiLayers + 1);
  }
  if (spec.siTui) {
    f.siTuiLayers = Math.min(JIUSI_SITUI_MAX, (Number(f.siTuiLayers) || 0) + 1);
  }

  if (hitSegments <= 0) {
    addLog(`${f.name} 施展【${spec.name}】，被尽数闪避。`, '');
    if (typeof storyBattleAfterAttack === 'function') {
      storyBattleAfterAttack({
        attacker: f,
        target: firstTarget,
        hitSegments,
        missSegments
      });
    }
    return;
  }
  const targetText = [...touched.keys()].join('、');
  const detail = [`${hitSegments}段命中`];
  if (missSegments) detail.push(`${missSegments}段被闪避`);
  if (absorbedTotal > 0) detail.push(`浩然气化去 ${fmtNum(absorbedTotal)} 点`);
  if (kills.length) detail.push(`击倒 ${[...new Set(kills)].join('、')}`);
  if (touched.size > 1) {
    detail.push([...touched.entries()].map(([n, t]) => `${n} ${fmtNum(Math.round(t.applied * 10) / 10)} 点`).join('，'));
  }
  addLog(`${f.name} 施展【${spec.name}】，对${targetText}造成 ${fmtNum(Math.round(dmgTotal * 10) / 10)} 点伤害（${detail.join('，')}）`, 'dmg');
  shakeCard(cur);

  /* 同伴攻击同样会触发【无咎】反击：反击由出手的同伴本人承受（书童亦不例外） */
  if (cur && cur.hp > 0 && !battle.over) doWujiuCounter(cur, hits, f);
}

function doFighterAction(f) {
  if (!f || f.hp <= 0 || battle.over) return;
  if (f.side === 'ally') {
    if (f.isPlayer) doPlayerAttack();
    else doCompanionAction(f);
  } else {
    doEnemyAttack(f);
    /* 入梦特殊机制：任意一人行动时，其余同伴连携进攻（由 dream.js 实现） */
    if (!battle.over && battle.dreamId && typeof dreamChainAttackAfter === 'function') {
      dreamChainAttackAfter(f);
    }
  }
  if (!battle.over) checkBattleEnd();
  /* 李乾元切磋的战斗事件：每次行动结算后检查触发条件 */
  if (!battle.over && typeof checkBattleEventTriggers === 'function') checkBattleEventTriggers(f);
}

function winBattle() {
  battle.over = true;
  const pf = playerFighter();
  if (pf) pf.hp = Math.max(1, pf.hp);
  player.hp = Math.max(1, player.hp);
  const names = battle.enemies.map(f => f.name).join('、');
  addLog(`你胜了 ${names}！`, 'win');

  const first = battle.enemies[0] || {};
  const npcId = battle.sparNpcId || first.npcId;
  if (battle.dreamId) {
    if (typeof handleDreamWin === 'function') handleDreamWin(battle.dreamId);
    battle.dreamId = '';
  } else if (npcId === BOND_SPAR_ID) {
    handleBondSparWin();
  } else if (npcId) {
    handleSparWin(npcId);
  }
  battleRunning = false;
  stopBattleEngine();
  if (typeof restorePreBattleAction === 'function') restorePreBattleAction();
  updateBattleUI();
  saveGame();
  if (!isBattleTabVisible()) showToast(`切磋胜利，击败了${names}`);
  if (battle.storyBattleId && typeof handleStoryBattleEnd === 'function') {
    handleStoryBattleEnd('win');
  }
}

function loseBattle() {
  battle.over = true;
  battleRunning = false;
  battle.dreamId = '';
  stopBattleEngine();
  if (typeof restorePreBattleAction === 'function') restorePreBattleAction();
  const names = battle.enemies.map(f => f.name).join('、');
  addLog(`你被 ${names} 击败，调息再战。（切磋失败不进入冷却）`, 'win');
  updateBattleUI();
  saveGame();
  if (!isBattleTabVisible()) showToast(`你被${names}击败了`);
  if (battle.storyBattleId && typeof handleStoryBattleEnd === 'function') {
    handleStoryBattleEnd('lose');
  }
}

function forfeitBattle() {
  if (!battleActive()) return;
  const names = battle.enemies.map(f => f.name).join('、');
  battle.over = true;
  battle.forfeited = true;
  battleRunning = false;
  battle.dreamId = '';
  stopBattleEngine();
  player.hp = Math.max(1, player.hp);
  if (typeof restorePreBattleAction === 'function') restorePreBattleAction();
  addLog(`你收手退开，放弃了与 ${names} 的切磋。`, '');
  addIntel(`你放弃了与${names}的切磋。`, '');
  updateBattleUI();
  saveGame();
  if (!isBattleTabVisible()) showToast('已放弃战斗');
  if (battle.storyBattleId && typeof handleStoryBattleEnd === 'function') {
    handleStoryBattleEnd('lose');
  }
}

function battleTick() {
  if (!battleRunning) {
    stopBattleEngine();
    return;
  }

  const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
  let elapsed = (now - battleEngine.lastAt) / 1000;
  if (!(elapsed > 0)) elapsed = 0;
  battleEngine.lastAt = now;
  battleEngine.pending += elapsed * BATTLE_TIME_SCALE;
  if (battleEngine.pending > BATTLE_MAX_BACKLOG) battleEngine.pending = BATTLE_MAX_BACKLOG;

  let steps = 0;
  while (battleEngine.pending >= BATTLE_STEP_SECONDS && battleRunning && steps < BATTLE_MAX_BACKLOG) {
    battleEngine.pending -= BATTLE_STEP_SECONDS;
    steps++;
    battleStep(BATTLE_STEP_SECONDS);
    if (battle.over || !battleRunning) {
      battleEngine.pending = 0;
      break;
    }
  }

  if (isBattleTabVisible()) updateBattleUI();
}

/* 战斗开场效果：震山拳百重叠 20 层撼山势；九思剑法百重连出三剑 */
function applyBattleStartEffects() {
  const pf = playerFighter();
  if (!pf) return;
  if (getWangbaLevel() >= 100) {
    pf.hanShiLayers = Math.min(HANSHAN_MAX_LAYERS, (Number(pf.hanShiLayers) || 0) + 20);
    addLog(`【撼山势·起手】你沉肩坐马，一口气叠起 ${pf.hanShiLayers} 层【撼山势】。`, 'crit');
  }
  if (getJiusiLevel() >= 100) {
    addLog('【九思剑法·先手】战斗方起，你已连出三剑！', 'crit');
    for (let i = 0; i < 3; i++) {
      if (battle.over) break;
      doJiusiAttack();
    }
    if (!battle.over) checkBattleEnd();
  }
}

/* 计算角色的"最终跑条速度"：包含沉渊、截脉、活脉等所有修改。
   只用于行动条推进，不修改角色自身的 speed 属性。 */
function calcFighterBarSpeed(f, nowSt) {
  if (!f || f.hp <= 0) return 0;
  if (f.stunUntil && nowSt < f.stunUntil) return 0;
  let spd = Math.max(0, Number(f.speed) || 0);
  if (f.side === 'enemy') spd = Math.max(0, spd - getChenyuanSpeedReduction());
  spd = Math.max(0, spd - (Number(f.jiumai) || 0) * JIUMAI_SPEED_DOWN);
  spd += (Number(f.huomaiLayers) || 0) * (Number(f.huomaiSpeedPerLayer) || 0);
  return spd;
}

function battleStep(dt) {
  if (!battleRunning || !battle.enemies.length) return;

  if (battle.over) {
    battleRunning = false;
    stopBattleEngine();
    updateBattleUI();
    return;
  }

  /* 开场效果只结算一次（由 initBattleStrategy 复位） */
  if (!battle.startEffectsDone) {
    battle.startEffectsDone = true;
    applyBattleStartEffects();
    if (battle.over || !battleRunning) {
      if (isBattleTabVisible()) updateBattleUI();
      return;
    }
  }

  const nowSt = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();

  if (hasJieniu()) {
    if (nowSt - battle.lastPozhanAt >= 2000) {
      battle.lastPozhanAt = nowSt;
      battle.pozhan = Math.min(10, battle.pozhan + 1);
    }
  }

  /* 震山拳百重：【撼山势】每秒自动叠加一层 */
  {
    const pf = playerFighter();
    if (pf && pf.hp > 0 && getWangbaLevel() >= 100) {
      if (!battle.lastHanShanAt) battle.lastHanShanAt = nowSt;
      const ticks = Math.floor((nowSt - battle.lastHanShanAt) / 1000);
      if (ticks > 0) {
        battle.lastHanShanAt += ticks * 1000;
        pf.hanShiLayers = Math.min(HANSHAN_MAX_LAYERS, (Number(pf.hanShiLayers) || 0) + ticks);
      }
    }
  }

  /* 【活脉】：叠层与每秒恢复 */
  for (const f of allFighters()) {
    if (!f || f.hp <= 0) continue;
    if (!f.huomaiNextAt) continue;
    const interval = Math.max(500, Number(f.huomaiInterval) || 5000);
    if (!(Number(f.huomaiLayers) > 0)) f.huomaiLayers = 0;
    let added = 0;
    while (nowSt >= f.huomaiNextAt) {
      f.huomaiLayers = (Number(f.huomaiLayers) || 0) + 1;
      f.huomaiNextAt += interval;
      added++;
    }
    if (added > 0) {
      addLog(`【活脉养络法】${f.isPlayer ? '你' : f.name}的【活脉】至 ${f.huomaiLayers} 层。`, '');
    }
    const regenPer = Number(f.huomaiRegenPerLayer) || 0;
    const regen = f.huomaiLayers * regenPer;
    if (regen > 0 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + regen * dt);
  }

  /* 【截脉】：每 3 秒消退一层 */
  if (!battle.jiumaiNextAt) battle.jiumaiNextAt = nowSt + JIUMAI_DECAY_MS;
  while (nowSt >= battle.jiumaiNextAt) {
    battle.jiumaiNextAt += JIUMAI_DECAY_MS;
    for (const f of allFighters()) {
      if (f && Number(f.jiumai) > 0) f.jiumai = Number(f.jiumai) - 1;
    }
  }

  /* 【打穴】：随时间消退，每秒消退 (1 + 当前内力/100) 层，飞石破 50/100 重降低消退速度 */
  {
    const slow = getFeishipoDaxueSlowdown();
    for (const f of allFighters()) {
      if (!f || !(Number(f.daxueLayers) > 0)) continue;
      const daxueRate = (1 + fighterNeiLi(f) / 100) * (1 - slow);
      const remain = Number(f.daxueLayers) - daxueRate * dt;
      f.daxueLayers = remain > 0.01 ? remain : 0;
    }
  }

  /* 【流血】：每层每秒流失 BLEED_DAMAGE_PER_STACK_PER_SEC 点气血，无叠加上限 */
  {
    let anyBleed = false;
    for (const f of allFighters()) {
      if (!f || f.hp <= 0 || !(Number(f.bleedStacks) > 0)) continue;
      if (!f.bleedNextAt) f.bleedNextAt = nowSt + 1000;
      if (nowSt < f.bleedNextAt) continue;
      const ticks = Math.floor((nowSt - f.bleedNextAt) / 1000) + 1;
      f.bleedNextAt += ticks * 1000;
      const stacks = Math.floor(Number(f.bleedStacks) || 0);
      const lost = stacks * ticks * BLEED_DAMAGE_PER_STACK_PER_SEC;
      f.hp = Math.max(0, f.hp - lost);
      anyBleed = true;
      addLog(`【流血】${f.isPlayer ? '你' : f.name}流失 ${fmtNum(lost)} 点气血（${stacks} 层）。`, 'dmg');
      shakeCard(f);
    }
    if (anyBleed && !battle.over) checkBattleEnd();
    if (battle.over || !battleRunning) return;
  }

  /* 所有人同时推进行动条：
     每个 battleStep 实时读取一次全场最高「最终行动速度」作为基准，
     让最高速角色 1 真实秒行动 1 次；其余角色按速度比等比下降。
     中途有角色加入 / 减速 / 加速 / 阵亡时，下一 tick 自动重算，无需重进战斗。 */
  {
    /* BASE_BAR_PER_STEP：最高速角色在每个 step 涨多少 bar
       = 100 bar / (每真实秒的 step 数)
       = 100 × BATTLE_STEP_SECONDS / BATTLE_TIME_SCALE = 20（当前值） */
    const BASE_BAR_PER_STEP = 100 * BATTLE_STEP_SECONDS / BATTLE_TIME_SCALE;

    /* 已倒下角色的 bar 归零 */
    for (const f of allFighters()) {
      if (f && f.hp <= 0) f.bar = 0;
    }

    /* 读取全场最高「最终行动速度」（跳过已倒下和 stun 中的角色） */
    let maxSpd = 0;
    for (const f of allFighters()) {
      if (!f || f.hp <= 0) continue;
      if (f.stunUntil && nowSt < f.stunUntil) continue;
      const s = calcFighterBarSpeed(f, nowSt);
      if (s > maxSpd) maxSpd = s;
    }

    /* 以 maxSpd 为基准等比推进；速度相同则步调一致 */
    for (const f of allFighters()) {
      if (!f || f.hp <= 0) continue;
      if (f.stunUntil && nowSt < f.stunUntil) { f.bar = 0; continue; }
      const spd = calcFighterBarSpeed(f, nowSt);
      const ratio = maxSpd > 0 ? spd / maxSpd : 0;
      f.bar += ratio * BASE_BAR_PER_STEP;
      if (f.bar > 10000) f.bar = 10000;
    }
  }

  const regen = getHpRegen();
  if (regen > 0 && player.hp > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + regen * dt);
  }

  for (const e of battle.enemies) {
    if (e && e.haoranNextAt && !e.haoranSealed && !battle.over && nowSt >= e.haoranNextAt) {
    e.haoranNextAt = nowSt + 5000;
    e.haoranLayers = (Number(e.haoranLayers) || 0) + 1;
    const shield = e.haoranLayers * HAORAN_SHIELD_PER_LAYER - (Number(e.haoranAccum) || 0);
    addLog(`【浩然养气诀】${e.name} 气机再沉，【浩然气】至 ${e.haoranLayers} 层（护盾 ${fmtNum(shield)} 点）`, '');
    }
  }

  let guard = 0;
  while (guard++ < 32) {
    const ready = allFighters().filter(f => f && f.hp > 0 && f.bar >= 100);
    if (!ready.length || battle.over) break;
    ready.sort((a, b) => b.bar - a.bar);
    const f = ready[0];
    f.bar = 0;
    doFighterAction(f);
    if (battle.over || !battleRunning) break;
  }
}

/* NPC 切磋敌人构建与当前修炼列表（从 game.js 移入） */
/* 切磋敌人构建见 battle-spar.js */