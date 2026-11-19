/* 战斗系统（从 game.js 拆出，需在 game.js 之前加载） */
const MAX_FIGHTERS_PER_SIDE = 8;
const HAORAN_SHIELD_PER_LAYER = 100;
/* 【截脉】：每层降低 0.01 行动速度，每 3 秒消退一层 */
const JIUMAI_SPEED_DOWN = 0.01;
const JIUMAI_DECAY_MS = 3000;

/* 【撼山势】：震山拳施展后叠一层，上限 100 层，每层攻击附加体魄×0.08 的基础伤害 */
const HANSHAN_MAX_LAYERS = 100;
/* 【打穴】：飞石破命中后给敌人叠一层，无上限，每层降低 0.5 内力；随时间消退 */
const DAXUE_NEILI_DOWN = 0.5;
/* 【思退】：九思剑法每次使用后叠一层，上限 9 层，每层闪避 +5% */
const JIUSI_SITUI_MAX = 9;
const JIUSI_SITUI_EVA = 0.05;
/* 【流血】：每层每秒流失的气血 */
const BLEED_DAMAGE_PER_STACK_PER_SEC = 2;
/* 【诡异毒素】：每层每秒流失的气血（对超大型白衣怪人转为等量回血） */
const WEIRD_POISON_PER_STACK_PER_SEC = 5;

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
  lastHanShanAt: 0,
  lastWeirdPoisonAt: 0
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
  const taiyiLv = typeof getTaiyiLevel === 'function' ? getTaiyiLevel() : 0;
  const lingxuLv = typeof getLingxuLevel === 'function' ? getLingxuLevel() : 0;
  const yuxuLv = typeof getYuxuLevel === 'function' ? getYuxuLevel() : 0;
  const totalNei = getTotalNeiLi();
  const yuxuShieldAmt = typeof getYuxuShieldAmount === 'function' ? getYuxuShieldAmount(totalNei, yuxuLv) : 0;
  const f = {
    uid: 'ally-player',
    id: 'player',
    name: player.surname + player.givenName,
    isPlayer: true,
    side: 'ally',
    speed: getTotalSpeed(),
    con: getTotalCon(),
    neiLi: totalNei,
    fist: getTotalFist(),
    blade: getTotalBlade(),
    sword: getTotalSword(),
    changbing: getTotalChangbing(),
    qimen: getTotalQimen(),
    hidden: getTotalHidden(),
    accuracy: getAccuracyRate(),
    evasion: getEvasionRate(),
    bondEvasionBonus: 0,
    root: getTotalRoot(),
    comp: getTotalComp(),
    luck: getTotalLuck(),
    medicine: getTotalMedicine(),
    poison: getTotalPoison(),
    skills: sortBattleSkillList(player.skills),
    memory: {},
    confused: false,
    targetWeight: 1,
    bar: 0,
    hanShiLayers: 0,
    siTuiLayers: 0,
    yourenLayers: 0,
    taiyiLevel: taiyiLv,
    taiyiLayers: taiyiLv >= 100 ? TAIYI_MAX_LAYERS : 0,
    taiyiEvaBuff: taiyiLv >= 100,
    taiyiJianqiBuff: 0,
    lingxuLevel: lingxuLv,
    lingxuFirstDodge: lingxuLv >= 10,
    lingxuRegenNextAt: 0,
    fengxuLayers: lingxuLv >= 100 ? 3 : 0,
    yuxuLevel: yuxuLv,
    yuxuShield: yuxuShieldAmt,
    yuxuMaxShield: yuxuShieldAmt,
    damageDealtMult: yuxuLv >= 100 ? 1.5 : 1,
    damageTakenMult: yuxuLv >= 100 ? 0.7 : 1
  };
  if (huoLv >= 5) {
    f.huomaiLayers = 1;
    f.huomaiInterval = getHuomaiLayerInterval(huoLv) * 1000;
    f.huomaiNextAt = (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now()) + f.huomaiInterval;
    f.huomaiRegenPerLayer = getHuomaiRegenPerLayer(huoLv, getTotalMedicine());
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
    accuracy: 0.9 + qy * 0.0075 + (extraStats.accuracy || 0),
    evasion: 0.10 + qy * 0.01 + (qy >= 25 ? 0.1 : 0) + (extraStats.evasion || 0),
    root: getBondRoot() * boost,
    comp: getBondComp() * boost,
    luck: getBondLuck() * boost,
    medicine: 0,
    poison: 0,
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

/* 150 羁绊解锁：与夏扑萤同阵营并肩作战时，双方闪避 +35%，玩家行动速度 += 夏扑萤行动速度/10 */
function applyBondSameCampBonus(allies) {
  if (getBondValue() < 150) return;
  const playerFighter = allies.find(f => f && f.isPlayer && f.hp > 0);
  const companionFighter = allies.find(f => f && f.isCompanion && f.hp > 0);
  if (!playerFighter || !companionFighter) return;
  if (!Array.isArray(battle.enemies) || !battle.enemies.some(f => f && f.hp > 0)) return;
  playerFighter.bondEvasionBonus = 0.35;
  playerFighter.evasion = (Number(playerFighter.evasion) || 0) + 0.35;
  companionFighter.evasion = (Number(companionFighter.evasion) || 0) + 0.35;
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
  let yuxuAbsorbed = 0;
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
  if (remain > 0 && Number(f.yuxuShield) > 0) {
    yuxuAbsorbed = Math.min(remain, Number(f.yuxuShield) || 0);
    f.yuxuShield = Math.max(0, (Number(f.yuxuShield) || 0) - yuxuAbsorbed);
    remain -= yuxuAbsorbed;
  }
  f.hp -= remain;
  return { absorbed, yuxuAbsorbed, applied: remain };
}

/* 对一方造成一段伤害：若击杀目标，溢出伤害按权重转移给另一个随机目标。 */
function dealSegmentDamage(side, target, damage) {
  let remaining = Math.max(0, Number(damage) || 0);
  let cur = (target && target.hp > 0) ? target : pickWeightedTarget(side.filter(f => f.hp > 0));
  const report = { applied: 0, absorbed: 0, yuxuAbsorbed: 0, hits: [], finalAlive: cur };
  if (remaining <= 0) {
    if (cur && cur.hp > 0) {
      report.hits.push({ fighter: cur, applied: 0, absorbed: 0, yuxuAbsorbed: 0, killed: false });
    }
    return report;
  }
  let guard = 0;
  while (remaining > 0 && guard++ < 64) {
    const living = side.filter(f => f && f.hp > 0);
    if (!living.length) break;
    if (!cur || cur.hp <= 0) cur = pickWeightedTarget(living);
    if (!cur) break;
    const res = applyDamageToFighter(cur, remaining);
    report.applied += res.applied;
    report.absorbed += res.absorbed;
    report.yuxuAbsorbed += (res.yuxuAbsorbed || 0);
    remaining -= (res.applied + res.absorbed + (res.yuxuAbsorbed || 0));
    if (cur.hp <= 0) {
      const over = -cur.hp;
      cur.hp = 0;
      report.hits.push({ fighter: cur, applied: res.applied, absorbed: res.absorbed, yuxuAbsorbed: res.yuxuAbsorbed || 0, killed: true });
      cur = null;
      report.finalAlive = null;
      remaining = over;
    } else {
      report.hits.push({ fighter: cur, applied: res.applied, absorbed: res.absorbed, yuxuAbsorbed: res.yuxuAbsorbed || 0, killed: false });
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

/* 有效命中：含【太乙】每层 +5% */
function fighterAccuracy(f) {
  if (!f) return 0.9;
  const base = f.isPlayer ? getAccuracyRate() : (Number(f.accuracy) || 0.9);
  const taiyiAcc = (Number(f.taiyiLayers) || 0) * (typeof TAIYI_STACK_ACC === 'number' ? TAIYI_STACK_ACC : 0.05);
  return Math.max(0, base + taiyiAcc);
}

/* 有效闪避：含【思退】、【太乙】、【遁影】、【冯虚御风】 */
function fighterEvasion(f) {
  if (!f) return 0;
  const base = f.isPlayer ? (getEvasionRate() + (Number(f.bondEvasionBonus) || 0)) : (Number(f.evasion) || 0);
  const situi = (Number(f.siTuiLayers) || 0) * JIUSI_SITUI_EVA;
  const taiyiEva = (Number(f.taiyiLayers) || 0) * (typeof TAIYI_STACK_EVA === 'number' ? TAIYI_STACK_EVA : 0.05);
  const dunying = f.taiyiEvaBuff ? 1 : 0;
  const fengxu = (Number(f.fengxuLayers) || 0) * (typeof FENGXU_EVA_PER_LAYER === 'number' ? FENGXU_EVA_PER_LAYER : 0.10);
  return Math.max(0, base + situi + taiyiEva + dunying + fengxu);
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
  let dr = f.isPlayer
    ? (getTotalCon() + getExtraDR() + getNeiLiDR())
    : ((Number(f.con) || 0) + fighterNeiLi(f) * 0.5);
  if ((Number(f.yuxuShield) || 0) > 0 && (Number(f.yuxuLevel) || 0) >= 10) {
    dr += fighterNeiLi(f) * (Number(f.root) || 0) / 500;
  }
  return dr;
}

/* 一次完整攻击的一击制敌 / 卸劲归元判定（不按段数拆算） */
function resolveAttackYiji(attacker, defender) {
  if (!attacker || !defender) return { triggered: false, mult: 1 };
  const atkPts = attacker.isPlayer ? getYijiPoints() : getEnemySkillValue('yiji', attacker);
  const defPts = defender.isPlayer ? getYijiPoints() : getEnemySkillValue('yiji', defender);
  const rate = Math.min(1, Math.max(0, atkPts - defPts / 2) * 0.01);
  if (rate <= 0 || Math.random() >= rate) return { triggered: false, mult: 1 };
  let mult = getYijiBonusMult(atkPts);
  let halvedByZhuxie = false;
  if (defender.zhuXieBiYi) {
    mult = 1 + (mult - 1) * 0.5;
    halvedByZhuxie = true;
  }
  return { triggered: true, mult, halvedByZhuxie };
}

function resolveAttackXiejin(defender, attacker) {
  if (!defender || !attacker) return { triggered: false, reduce: 0 };
  const defPts = defender.isPlayer ? getXiejinPoints() : getEnemySkillValue('xiejin', defender);
  const atkPts = attacker.isPlayer ? getXiejinPoints() : getEnemySkillValue('xiejin', attacker);
  const rate = Math.min(1, Math.max(0, defPts - atkPts / 2) * 0.01);
  if (rate <= 0 || Math.random() >= rate) return { triggered: false, reduce: 0 };
  const reduce = getXiejinReduce(fighterNeiLi(defender), defPts);
  return { triggered: reduce > 0, reduce };
}

/* 一次完整攻击结算后的防御端反应：遁影消耗、冯虚御风叠层、先天罡气反震与加条 */
function applyCompleteAttackDefenseReactions({ attacker, defender, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments, missSegments }) {
  if (!defender) return;
  if (defenderHadEvaBuff && defender.taiyiEvaBuff) {
    defender.taiyiEvaBuff = false;
  }
  if (missSegments > 0 && (Number(defender.lingxuLevel) || 0) >= 50 && defender.hp > 0) {
    const prevFx = Number(defender.fengxuLayers) || 0;
    if (prevFx < FENGXU_MAX_LAYERS) {
      defender.fengxuLayers = prevFx + 1;
      addLog(`【冯虚御风】${defender.isPlayer ? '你' : defender.name}身姿轻盈，【冯虚御风】叠至 ${defender.fengxuLayers} 层！`, 'win');
    }
  }
  if (hitSegments > 0 && defenderHadYuxuShield && defender.hp > 0) {
    const yuxuLv = Number(defender.yuxuLevel) || 0;
    if (yuxuLv >= 30 && attacker && attacker.hp > 0 && !battle.over) {
      const recoilRaw = Math.max(0, Math.round((fighterNeiLi(defender) * 1 + (Number(defender.root) || 0) * 10) * 10) / 10);
      if (recoilRaw > 0) {
        const attackerSide = attacker.side === 'ally' ? battle.allies : battle.enemies;
        const rRes = dealSegmentDamage(attackerSide, attacker, recoilRaw);
        const targetLabel = attacker.isPlayer ? '你' : attacker.name;
        const defLabel = defender.isPlayer ? '你' : defender.name;
        const rNotes = [];
        if (rRes.absorbed > 0) rNotes.push(`浩然气化去 ${fmtNum(rRes.absorbed)} 点`);
        if (rRes.yuxuAbsorbed > 0) rNotes.push(`先天罡气抵消 ${fmtNum(rRes.yuxuAbsorbed)} 点`);
        addLog(`【先天罡气·反震】${defLabel}护盾震荡，反弹${targetLabel} ${fmtNum(Math.round(rRes.applied * 10) / 10)} 点固定伤害${rNotes.length ? `（${rNotes.join('，')}）` : ''}`, 'crit');
        shakeCard(attacker);
        if (attacker.hp <= 0) {
          attacker.hp = 0;
          addLog(`${targetLabel} 倒下了！`, 'dmg');
        }
      }
    }
    if (yuxuLv >= 50 && defender.hp > 0 && !battle.over) {
      defender.bar = Math.min(10000, (Number(defender.bar) || 0) + 30);
      addLog(`【先天罡气】${defender.isPlayer ? '你' : defender.name}受击聚气，行动条 +30%！`, 'win');
    }
  }
}

/* 消耗【凌虚】必闪敌方首次完整攻势（每场首次或100重刷新后触发一次） */
function consumeLingxuFirstDodge(target, attacker, hitsCount) {
  if (!target || !target.lingxuFirstDodge) return false;
  target.lingxuFirstDodge = false;
  if ((Number(target.lingxuLevel) || 0) >= 100) {
    const now = typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now();
    target.lingxuRegenNextAt = now + 20000;
  }
  const who = target.isPlayer ? '你' : target.name;
  addLog(`【凌虚】${who}身形宛若乘虚御风，将${attacker.isPlayer ? '你' : attacker.name}的攻势尽数避开！`, 'win');
  if ((Number(target.lingxuLevel) || 0) >= 50 && target.hp > 0) {
    const prevFx = Number(target.fengxuLayers) || 0;
    if (prevFx < FENGXU_MAX_LAYERS) {
      target.fengxuLayers = prevFx + 1;
      addLog(`【冯虚御风】${who}【冯虚御风】叠至 ${target.fengxuLayers} 层！`, 'win');
    }
  }
  if (target.isPlayer && (hitsCount || 1) > 0) {
    tryPlayerJiusiCounter(attacker, target, Math.max(1, Number(hitsCount) || 1));
  }
  return true;
}

/* 己方（主角或同伴）受到敌方攻击时的闪避与增伤判定。 */
function resolveAllyDodge(attacker, target) {
  const baseAcc = fighterAccuracy(attacker);
  const isPlayerT = !!target.isPlayer;
  const eva = fighterEvasion(target);
  const atkXushi = getEnemySkillValue('xushi', attacker);
  const defXushi = isPlayerT ? getXushiPoints() : getEnemySkillValue('xushi', target);
  const enemyXushi = Math.random() < Math.min(1, Math.max(0, (atkXushi - defXushi / 2) * 0.01));
  let acc = baseAcc;
  let overflow = 0;
  if (enemyXushi) {
    acc = baseAcc * 1.5;
    overflow = calcAccuracyOverflow(acc, eva);
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
  if (sel === 'taiyi' && getTaiyiLevel() > 0) return 'taiyi';
  return 'zhenshan';
}

function doPlayerAttack() {
  if (player.strategy && player.strategy.enabled) {
    if (tryLowHpStrategy()) return;
    if (typeof tryAllyLowHpStrategy === 'function' && tryAllyLowHpStrategy()) return;
    const sid = resolveStrategySkill();
    if (sid === 'feishipo') return doFeishipoAttack();
    if (sid === 'zhenshan') return doZhenshanAttack();
    if (sid === 'jiusi' && getJiusiLevel() > 0) return doJiusiAttack();
    if (sid === 'paodingDao' && hasPaodingDao()) return doPaodingDaoAttack();
    if (sid === 'taiyi' && getTaiyiLevel() > 0) return doTaiyiAttack();
    if (sid === 'jinzhen' && typeof hasJinzhenTechnique === 'function' && hasJinzhenTechnique()) return doPlayerJinzhen();
    if (sid) return;
  }
  const style = getPlayerAttackStyle();
  if (style === 'feishipo') return doFeishipoAttack();
  if (style === 'jiusi') return doJiusiAttack();
  if (style === 'paodingDao') return doPaodingDaoAttack();
  if (style === 'taiyi') return doTaiyiAttack();
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

function doTaiyiAttack() {
  const primary = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!primary) return;
  const level = getTaiyiLevel();
  const stats = getTaiyiStats(level);

  performTaiyiStrike(stats, 1, 1, primary);
  if (battle.over) return;

  const mianmianCount = rollMianmianCount(getMianmianRate(getEnemySkillValue('mianmian', primary)));
  for (let c = 0; c < mianmianCount; c++) {
    if (battle.over) return;
    const t = pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
    if (!t) return;
    addLog('【延绵不绝】你气机未断，招式连绵再起！', 'crit');
    performTaiyiStrike(stats, 1, 0.3, t);
    if (battle.over) return;
  }
}

/* 玩家特技：与赵大夫的金针渡穴一致，可治疗指定同伴或气血比例最低的己方成员，随后停止行动 3 秒 */
function doPlayerJinzhen(preferredTarget) {
  const me = playerFighter();
  if (!me || me.hp <= 0) return;
  if (me.jinzhenUsed) {
    addLog('【金针渡穴】此战金针已用过，无法再次施针。', '');
    return;
  }
  if (preferredTarget && preferredTarget.hp > 0 && preferredTarget.maxHp > 0 && preferredTarget.hp < preferredTarget.maxHp) {
    doJinzhen(me, [preferredTarget]);
    return;
  }
  const injured = (battle.allies || []).filter(f => f && f.hp > 0 && f.maxHp > 0 && f.hp < f.maxHp);
  if (!injured.length) {
    addLog('【金针渡穴】己方气血充盈，你无须施针。', '');
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
  /* 【撼山势】施展震山拳后叠一层，上限 100 */
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

function performJiusiStrike(stats, effectMultiplier, scale, target, opts) {
  const pf = playerFighter();
  const res = performStrike({
    name: '九思剑法',
    stats,
    effectMultiplier,
    scale,
    target,
    vulnerable: false,
    isSwordSkill: true,
    calcDamage: (mult, eff, e) => calcSwordDamage(mult, eff, e, opts)
  });
  /* 【思退】：每次使用后叠一层，上限 9 */
  if (pf) pf.siTuiLayers = Math.min(JIUSI_SITUI_MAX, (Number(pf.siTuiLayers) || 0) + 1);
  return res;
}

function triggerTaiyiJianqiBonusHits(attacker, sideList, target, qiLayers, isHundred) {
  const count = Math.max(0, Math.floor(Number(qiLayers) || 0));
  if (count <= 0 || !attacker || attacker.hp <= 0 || battle.over) return;
  const dmgMult = isHundred ? 0.2 : 0.1;
  let cur = (target && target.hp > 0) ? target : pickWeightedTarget((sideList || []).filter(f => f && f.hp > 0));
  if (!cur) return;
  let hitsDone = 0;
  let appliedTotal = 0;
  let absorbedTotal = 0;
  let yuxuTotal = 0;
  const acc = fighterAccuracy(attacker);
  for (let i = 0; i < count; i++) {
    const alive = (sideList || []).filter(f => f && f.hp > 0);
    if (!alive.length || battle.over) break;
    if (!cur || cur.hp <= 0) cur = pickWeightedTarget(alive);
    if (!cur) break;
    if (Math.random() >= calcHitChance(acc, fighterEvasion(cur))) continue;
    let dmg = attacker.isPlayer
      ? calcTaiyiDamage(dmgMult, 1, cur)
      : calcFighterAttackDamage(attacker, cur, dmgMult);
    if (Number(attacker.damageDealtMult) > 0) dmg *= Number(attacker.damageDealtMult);
    if (Number(cur.damageTakenMult) > 0) dmg *= Number(cur.damageTakenMult);
    dmg = Math.max(0, Math.round(dmg * 10) / 10);
    const res = dealSegmentDamage(sideList, cur, dmg);
    hitsDone++;
    appliedTotal += res.applied;
    absorbedTotal += res.absorbed;
    yuxuTotal += (res.yuxuAbsorbed || 0);
    cur = res.finalAlive;
  }
  const who = attacker.isPlayer ? '你' : attacker.name;
  const notes = [`${hitsDone}/${count}道命中`];
  if (absorbedTotal > 0) notes.push(`浩然气化去 ${fmtNum(absorbedTotal)} 点`);
  if (yuxuTotal > 0) notes.push(`先天罡气抵消 ${fmtNum(yuxuTotal)} 点`);
  addLog(`【太乙剑气】${who}剑意余韵破空而出，额外造成 ${fmtNum(Math.round(appliedTotal * 10) / 10)} 点剑法伤害（${notes.join('，')}）`, 'crit');
}

function performTaiyiStrike(stats, effectMultiplier, scale, target) {
  const pf = playerFighter();
  const level = getTaiyiLevel();
  const res = performStrike({
    name: '太乙伏魔剑',
    stats,
    effectMultiplier,
    scale,
    target,
    vulnerable: false,
    isSwordSkill: true,
    calcDamage: (mult, eff, e) => calcTaiyiDamage(mult, eff, e)
  });
  if (pf && pf.hp > 0) {
    const hitCount = res ? res.hitSegments : 0;
    if (level >= 25 && hitCount > 0 && (Number(pf.taiyiLayers) || 0) > 0) {
      const consumed = Number(pf.taiyiLayers) || 0;
      pf.taiyiLayers = 0;
      pf.taiyiJianqiBuff = (Number(pf.taiyiJianqiBuff) || 0) + consumed;
      addLog(`【太乙剑气】你收剑凝神，将 ${consumed} 层【太乙】化为【太乙剑气】！`, 'crit');
    }
    if ((hitCount === 0 && level >= 10) || level >= 70) {
      const prev = Number(pf.taiyiLayers) || 0;
      pf.taiyiLayers = Math.min(TAIYI_MAX_LAYERS, prev + 1);
      if (level >= 35) pf.taiyiEvaBuff = true;
      addLog(`【太乙】${hitCount === 0 ? '招式落空而剑势更蓄，' : ''}【太乙】叠至 ${pf.taiyiLayers} 层${level >= 35 ? '，获得【遁影】' : ''}。`, 'win');
    }
  }
  return res;
}

function tryPlayerJiusiCounter(attacker, target, evadedHits) {
  const hits = Math.max(0, Math.floor(Number(evadedHits) || 0));
  if (hits <= 0) return;
  if (!target || !target.isPlayer || target.hp <= 0) return;
  if (getJiusiLevel() < 20) return;
  if ((Number(target.siTuiLayers) || 0) < JIUSI_SITUI_MAX) return;
  if (battle.over) return;

  const level = getJiusiLevel();
  const baseStats = getJiusiStats(level);
  const counterStats = { hits, multiplier: baseStats.multiplier };
  const counterTarget = (attacker && attacker.hp > 0)
    ? attacker
    : pickWeightedTarget((battle.enemies || []).filter(f => f && f.hp > 0));
  if (!counterTarget) return;

  addLog(`【思退·反击】你借闪身之势回剑反刺（反击 ${hits} 段）！`, 'crit');
  performJiusiStrike(counterStats, 1, 1, counterTarget, { isCounter: true });
  if (!battle.over) checkBattleEnd();
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
  if (!initialTarget || initialTarget.hp <= 0) return null;

  const pf = playerFighter();
  const stats = opts.stats;
  const name = opts.name;
  const effectMultiplier = Number(opts.effectMultiplier) || 1;
  const scale = Number(opts.scale) || 1;

  const defenderHadEvaBuff = !!initialTarget.taiyiEvaBuff;
  const defenderHadYuxuShield = (Number(initialTarget.yuxuShield) || 0) > 0;

  if (consumeLingxuFirstDodge(initialTarget, pf, stats.hits)) {
    if (typeof storyBattleAfterAttack === 'function') {
      storyBattleAfterAttack({ attacker: pf, target: initialTarget, hitSegments: 0, missSegments: stats.hits });
    }
    return { hitSegments: 0, missSegments: stats.hits };
  }

  const xushi = Math.random() < Math.min(1, getXushiRate(getEnemySkillValue('xushi', initialTarget)));
  const baseAcc = pf ? fighterAccuracy(pf) : getAccuracyRate();
  let acc = baseAcc;
  let xuriOverflow = 0;
  if (xushi) {
    acc = baseAcc * 1.5;
    xuriOverflow = calcAccuracyOverflow(acc, fighterEvasion(initialTarget));
  }
  acc += Number(opts.accuracyBonus) || 0;

  const yiji = pf ? resolveAttackYiji(pf, initialTarget) : { triggered: false, mult: 1 };
  const xiejin = pf ? resolveAttackXiejin(initialTarget, pf) : { triggered: false, reduce: 0 };
  let xiejinPool = xiejin.triggered ? xiejin.reduce : 0;
  let xiejinReducedTotal = 0;

  const dealMult = Number(pf && pf.damageDealtMult) > 0 ? Number(pf.damageDealtMult) : 1;

  let cur = initialTarget;
  let hitSegments = 0;
  let missSegments = 0;
  let segmentDamage = 0;
  let absorbedTotal = 0;
  let yuxuAbsorbedTotal = 0;
  const touched = new Map();
  const kills = [];

  for (let i = 0; i < stats.hits; i++) {
    const alive = (battle.enemies || []).filter(f => f && f.hp > 0);
    if (!alive.length || battle.over) break;
    if (!cur || cur.hp <= 0) cur = pickWeightedTarget(alive);
    if (!cur) break;
    const e = cur;
    const hitChance = calcHitChance(acc, fighterEvasion(e));
    if (Math.random() >= hitChance) { missSegments++; continue; }
    let dmg = opts.calcDamage(stats.multiplier, effectMultiplier, e);
    if (xuriOverflow > 0) dmg *= (1 + xuriOverflow);
    const vuln = opts.vulnerable ? Math.max(0, Number(e.vulnerable) || 0) : 0;
    if (vuln > 0) dmg *= (1 + vuln);
    if (yiji.triggered) dmg *= yiji.mult;
    dmg *= dealMult;
    if (Number(e.damageTakenMult) > 0) dmg *= Number(e.damageTakenMult);
    dmg = Math.max(0, Math.round(dmg * scale * 10) / 10);
    if (typeof opts.flatPerHit === 'function') {
      const flat = Number(opts.flatPerHit()) || 0;
      if (flat > 0) dmg += flat;
    }
    if (xiejinPool > 0 && dmg > 0) {
      const cut = Math.min(dmg, xiejinPool);
      dmg = Math.round((dmg - cut) * 10) / 10;
      xiejinPool = Math.max(0, xiejinPool - cut);
      xiejinReducedTotal += cut;
    }
    const res = dealSegmentDamage(battle.enemies, cur, dmg);
    absorbedTotal += res.absorbed;
    yuxuAbsorbedTotal += (res.yuxuAbsorbed || 0);
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
    if (pf && pf.hp <= 0) break;
  }

  if (hitSegments <= 0) {
    addLog(`你施展【${name}】，却尽数被闪避（命中率 ${formatPercent(calcHitChance(acc, fighterEvasion(initialTarget)))}）`, '');
    applyCompleteAttackDefenseReactions({
      attacker: pf,
      defender: initialTarget,
      defenderHadEvaBuff,
      defenderHadYuxuShield,
      hitSegments,
      missSegments
    });
    if (typeof storyBattleAfterAttack === 'function') {
      storyBattleAfterAttack({
        attacker: pf,
        target: initialTarget,
        hitSegments,
        missSegments
      });
    }
    return { hitSegments, missSegments };
  }

  const neiBonus = Math.round(getNeiLiDamageBonus() * scale * 10) / 10;
  const totalDamage = Math.round((segmentDamage + neiBonus) * 10) / 10;

  const targetText = touched.size > 0 ? [...touched.keys()].join('、') : (initialTarget.name || '');
  const detail = [`${hitSegments}段命中`];
  if (missSegments) detail.push(`${missSegments}段被闪避`);
  if (xushi) detail.push(`虚实莫测·命中 ${formatPercent(calcHitChance(acc, fighterEvasion(initialTarget)))}`);
  if (xuriOverflow > 0) detail.push(`溢出命中增伤 +${Math.round(xuriOverflow * 100)}%`);
  if (yiji.triggered) detail.push(`一击制敌${yiji.halvedByZhuxie ? '（诸邪辟易减半）' : ''} ×${yiji.mult.toFixed(2)}`);
  if (xiejinReducedTotal > 0) detail.push(`卸劲归元减免 ${fmtNum(Math.round(xiejinReducedTotal * 10) / 10)} 点`);
  if (absorbedTotal > 0) detail.push(`浩然气化去 ${fmtNum(absorbedTotal)} 点`);
  if (yuxuAbsorbedTotal > 0) detail.push(`先天罡气抵消 ${fmtNum(Math.round(yuxuAbsorbedTotal * 10) / 10)} 点`);
  if (scale < 1) detail.push(`效果 ${Math.round(scale * 100)}%`);
  if (kills.length) detail.push(`击倒 ${[...new Set(kills)].join('、')}`);
  if (touched.size > 1) {
    detail.push([...touched.entries()].map(([n, t]) => `${n} ${fmtNum(Math.round(t.applied * 10) / 10)} 点`).join('，'));
  }

  addLog(`你施展【${name}】，对${targetText}造成 ${fmtNum(totalDamage)} 点伤害（${detail.join('，')}）`, 'dmg');
  shakeCard(cur || initialTarget);

  if (opts.isSwordSkill && !opts.isSubHit && pf && pf.hp > 0 && (Number(pf.taiyiJianqiBuff) || 0) > 0 && !battle.over) {
    const qLayers = Number(pf.taiyiJianqiBuff) || 0;
    pf.taiyiJianqiBuff = 0;
    triggerTaiyiJianqiBonusHits(pf, battle.enemies, cur || initialTarget, qLayers, getTaiyiLevel() >= 100);
  }

  applyCompleteAttackDefenseReactions({
    attacker: pf,
    defender: initialTarget,
    defenderHadEvaBuff,
    defenderHadYuxuShield,
    hitSegments,
    missSegments
  });

  if (initialTarget.hp > 0 && !battle.over) doWujiuCounter(initialTarget, stats.hits, pf);
  return { hitSegments, missSegments };
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
  let dmg = Math.max(0, Math.round((perHit * hitCount - totalDR) * 10) / 10);
  if (Number(target.damageTakenMult) > 0) dmg = Math.round(dmg * Number(target.damageTakenMult) * 10) / 10;
  const res = applyDamageToFighter(target, dmg);
  const who = target.isPlayer ? '你' : target.name;
  addLog(`【无咎】${e.name} 回防了破绽之处并顺势反击，以${hitCount}指伤${who} ${fmtNum(Math.round(res.applied * 10) / 10)} 点${res.yuxuAbsorbed > 0 ? `（先天罡气抵消 ${fmtNum(Math.round(res.yuxuAbsorbed * 10) / 10)} 点）` : ''}（消耗 1 层，剩余 ${e.wujiuStacks} 层）`, 'dmg');
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
  const defenderHadEvaBuff = !!target.taiyiEvaBuff;
  const defenderHadYuxuShield = (Number(target.yuxuShield) || 0) > 0;
  if (consumeLingxuFirstDodge(target, e, hits)) return;

  const own = fighterAttackValue(e, 'fist');
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
    applyCompleteAttackDefenseReactions({ attacker: e, defender: target, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments: 0, missSegments: missed });
    if (missed > 0) tryPlayerJiusiCounter(e, target, missed);
    return;
  }
  let dmg = Math.max(0, perHit * landed - fighterDR(target));
  const yiji = resolveAttackYiji(e, target);
  if (yiji.triggered) dmg *= yiji.mult;
  if (Number(target.damageTakenMult) > 0) dmg *= Number(target.damageTakenMult);
  const xiejin = resolveAttackXiejin(target, e);
  let xiejinCut = 0;
  if (xiejin.triggered && dmg > 0) {
    xiejinCut = Math.min(dmg, xiejin.reduce);
    dmg = Math.max(0, dmg - xiejinCut);
  }
  dmg = Math.round(dmg * 10) / 10;
  const res = applyDamageToFighter(target, dmg);
  if (target.hp < 0) target.hp = 0;
  target.jiumai = (Number(target.jiumai) || 0) + landed;
  const notes = [`${landed}段命中`];
  if (missed) notes.push(`${missed}段被闪避`);
  if (yiji.triggered) notes.push(`一击制敌 ×${yiji.mult.toFixed(2)}`);
  if (xiejinCut > 0) notes.push(`卸劲归元减免 ${fmtNum(Math.round(xiejinCut * 10) / 10)} 点`);
  if (res.yuxuAbsorbed > 0) notes.push(`先天罡气抵消 ${fmtNum(Math.round(res.yuxuAbsorbed * 10) / 10)} 点`);
  addLog(`【截脉指】${e.name} 指力点中${who}经脉，造成 ${fmtNum(Math.round(res.applied * 10) / 10)} 点伤害（${notes.join('，')}），【截脉】积至 ${target.jiumai} 层`, 'dmg');
  shakeCard(target);
  applyCompleteAttackDefenseReactions({ attacker: e, defender: target, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments: landed, missSegments: missed });
  if (target.hp <= 0) addLog(`${target.name} 倒下了！`, 'dmg');
  else if (missed > 0) tryPlayerJiusiCounter(e, target, missed);
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
  const caster = e.isPlayer ? '你' : e.name;
  addLog(`【金针渡穴】${caster} 取出金针，为${who}疏通经络，恢复 ${fmtNum(healed)} 点气血。`, 'win');
  shakeCard(lowest);
  e.stunUntil = (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now()) + 3000;
  e.bar = 0;
  addLog(`【金针渡穴】${caster} 收针调息，三息之内不再动作。`, '');
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
    applyDamageToFighter(e, dmg);
    addLog(`${e.name} 陷入混乱，攻击了自己，造成 ${fmtNum(dmg)} 点伤害！`, 'dmg');
    shakeCard(e);
    if (e.hp <= 0) e.hp = 0;
    return;
  }

  const target = pickWeightedTarget((battle.allies || []).filter(f => f && f.hp > 0));
  if (!target) return;

  const who = target.isPlayer ? '你' : target.name;
  const defenderHadEvaBuff = !!target.taiyiEvaBuff;
  const defenderHadYuxuShield = (Number(target.yuxuShield) || 0) > 0;

  if (e.attack) {
    const a = e.attack;
    const hits = Math.max(1, Number(a.hits) || 1);
    if (consumeLingxuFirstDodge(target, e, hits)) return;

    const own = fighterAttackValue(e, a.stat);
    const against = fighterDefenseValue(target, a.stat);
    const perHit = Math.max(0, (20 + own + (own - against / 2) * 2.5) * (Number(a.multiplier) || 0) * 2);

    let landed = 0;
    let missed = 0;
    let lastDodgeKind = '';
    let hitRawTotal = 0;
    let maxOverflow = 0;
    let anyEnemyXushi = false;
    let lastAcc = fighterAccuracy(e);
    let lastEva = fighterEvasion(target);

    for (let i = 0; i < hits; i++) {
      const dodge = resolveAllyDodge(e, target);
      if (dodge.dodged) {
        missed++;
        if (dodge.dodgeKind) lastDodgeKind = dodge.dodgeKind;
        continue;
      }
      landed++;
      if (dodge.enemyXushi) anyEnemyXushi = true;
      if (dodge.overflow > maxOverflow) maxOverflow = dodge.overflow;
      lastAcc = dodge.acc;
      lastEva = dodge.eva;
      hitRawTotal += perHit * (dodge.overflow > 0 ? (1 + dodge.overflow) : 1);
    }

    const taiyiLv = Number(e.taiyiLevel) || 0;
    const isTaiyiSkill = a.name === '太乙伏魔剑' || taiyiLv > 0;

    if (landed <= 0) {
      addLog(
        lastDodgeKind === 'qingyuan'
          ? `【青鸢飞纵】${who}借势再折，第二次判定中避过${e.name}的攻击！`
          : (lastDodgeKind === 'shenning'
            ? `【神宁气静】${who}心如止水，看破来势，再避${e.name}的攻击！`
            : `${who}侧身避开了${e.name}的攻击。`),
        lastDodgeKind ? 'win' : ''
      );
      if (isTaiyiSkill && taiyiLv >= 10) {
        e.taiyiLayers = Math.min(TAIYI_MAX_LAYERS, (Number(e.taiyiLayers) || 0) + 1);
        if (taiyiLv >= 35) e.taiyiEvaBuff = true;
        addLog(`【太乙】${e.name}剑势未竭，【太乙】叠至 ${e.taiyiLayers} 层${taiyiLv >= 35 ? '，获得【遁影】' : ''}。`, '');
      }
      applyCompleteAttackDefenseReactions({ attacker: e, defender: target, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments: 0, missSegments: missed });
      if (missed > 0) tryPlayerJiusiCounter(e, target, missed);
      return;
    }

    const avgMult = (perHit > 0 && landed > 0) ? (hitRawTotal / (perHit * landed)) : 1;
    let dmg = Math.max(0, perHit * landed - fighterDR(target)) * avgMult;
    const yiji = resolveAttackYiji(e, target);
    if (yiji.triggered) dmg *= yiji.mult;
    if (Number(e.damageDealtMult) > 0) dmg *= Number(e.damageDealtMult);
    if (Number(target.damageTakenMult) > 0) dmg *= Number(target.damageTakenMult);
    const xiejin = resolveAttackXiejin(target, e);
    let xiejinCut = 0;
    if (xiejin.triggered && dmg > 0) {
      xiejinCut = Math.min(dmg, xiejin.reduce);
      dmg = Math.max(0, dmg - xiejinCut);
    }
    dmg = Math.round(dmg * 10) / 10;

    const res = applyDamageToFighter(target, dmg);
    const notes = [];
    if (hits > 1) notes.push(`${landed}段命中`);
    if (missed > 0) notes.push(`${missed}段被闪避`);
    if (anyEnemyXushi) notes.push(`虚实莫测·命中 ${formatPercent(calcHitChance(lastAcc, lastEva))}`);
    if (maxOverflow > 0) notes.push(`溢出命中增伤 +${Math.round(maxOverflow * 100)}%`);
    if (yiji.triggered) notes.push(`一击制敌${yiji.halvedByZhuxie ? '（诸邪辟易减半）' : ''} ×${yiji.mult.toFixed(2)}`);
    if (xiejinCut > 0) notes.push(`卸劲归元减免 ${fmtNum(Math.round(xiejinCut * 10) / 10)} 点`);
    if (res.yuxuAbsorbed > 0) notes.push(`先天罡气抵消 ${fmtNum(Math.round(res.yuxuAbsorbed * 10) / 10)} 点`);
    addLog(`${e.name} 施展【${a.name}】，对${who}造成 ${fmtNum(Math.round(res.applied * 10) / 10)} 点伤害${notes.length ? `（${notes.join('，')}）` : ''}`, 'dmg');
    shakeCard(target);

    if (isTaiyiSkill && target.hp > 0 && (Number(e.taiyiJianqiBuff) || 0) > 0) {
      const qLayers = Number(e.taiyiJianqiBuff) || 0;
      e.taiyiJianqiBuff = 0;
      triggerTaiyiJianqiBonusHits(e, battle.allies, target, qLayers, taiyiLv >= 100);
    }
    if (isTaiyiSkill) {
      if (taiyiLv >= 25 && (Number(e.taiyiLayers) || 0) > 0) {
        const consumed = Number(e.taiyiLayers) || 0;
        e.taiyiLayers = 0;
        e.taiyiJianqiBuff = (Number(e.taiyiJianqiBuff) || 0) + consumed;
        addLog(`【太乙剑气】${e.name}引动 ${consumed} 层【太乙】，凝成【太乙剑气】！`, '');
      }
      if (taiyiLv >= 70) {
        e.taiyiLayers = Math.min(TAIYI_MAX_LAYERS, (Number(e.taiyiLayers) || 0) + 1);
        e.taiyiEvaBuff = true;
      }
    }

    if (a.bleed && target.hp > 0) {
      const bleedHits = Math.max(1, landed);
      target.bleedStacks = Math.floor((Number(target.bleedStacks) || 0) + bleedHits);
      if (!target.bleedNextAt) target.bleedNextAt = (typeof getGameClockMs === 'function' ? getGameClockMs() : Date.now()) + 1000;
      addLog(`【流血】${who}被${a.name}咬中，流血叠加至 ${target.bleedStacks} 层。`, 'dmg');
    }

    applyCompleteAttackDefenseReactions({ attacker: e, defender: target, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments: landed, missSegments: missed });

    if (target.hp <= 0) {
      target.hp = 0;
      addLog(`${target.name} 倒下了！`, 'dmg');
    } else if (missed > 0) {
      tryPlayerJiusiCounter(e, target, missed);
    }
    return;
  }

  if (consumeLingxuFirstDodge(target, e, 1)) return;

  const dodge = resolveAllyDodge(e, target);
  if (dodge.dodged) {
    addLog(
      dodge.dodgeKind === 'qingyuan'
        ? `【青鸢飞纵】${who}借势再折，第二次判定中避过${e.name}的攻击！`
        : (dodge.dodgeKind === 'shenning'
          ? `【神宁气静】${who}心如止水，看破来势，再避${e.name}的攻击！`
          : `${who}侧身避开了${e.name}的攻击。`),
      dodge.dodgeKind ? 'win' : ''
    );
    applyCompleteAttackDefenseReactions({ attacker: e, defender: target, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments: 0, missSegments: 1 });
    tryPlayerJiusiCounter(e, target, 1);
    return;
  }

  const rawDmg = (Number(e.atk) || 0) + Math.round(Math.random() * 4) - 2;
  let dmg = Math.max(0, rawDmg - fighterDR(target));
  if (dodge.overflow > 0) dmg *= (1 + dodge.overflow);
  const yiji = resolveAttackYiji(e, target);
  if (yiji.triggered) dmg *= yiji.mult;
  if (Number(e.damageDealtMult) > 0) dmg *= Number(e.damageDealtMult);
  if (Number(target.damageTakenMult) > 0) dmg *= Number(target.damageTakenMult);
  const xiejin = resolveAttackXiejin(target, e);
  let xiejinCut = 0;
  if (xiejin.triggered && dmg > 0) {
    xiejinCut = Math.min(dmg, xiejin.reduce);
    dmg = Math.max(0, dmg - xiejinCut);
  }
  dmg = Math.round(dmg * 10) / 10;

  const res = applyDamageToFighter(target, dmg);
  const notes = [];
  if (dodge.enemyXushi) notes.push(`虚实莫测·命中 ${formatPercent(calcHitChance(dodge.acc, dodge.eva))}`);
  if (dodge.overflow > 0) notes.push(`溢出命中增伤 +${Math.round(dodge.overflow * 100)}%`);
  if (yiji.triggered) notes.push(`一击制敌${yiji.halvedByZhuxie ? '（诸邪辟易减半）' : ''} ×${yiji.mult.toFixed(2)}`);
  if (xiejinCut > 0) notes.push(`卸劲归元减免 ${fmtNum(Math.round(xiejinCut * 10) / 10)} 点`);
  if (res.yuxuAbsorbed > 0) notes.push(`先天罡气抵消 ${fmtNum(Math.round(res.yuxuAbsorbed * 10) / 10)} 点`);
  addLog(`${e.name} 施展【攻势】，对${who}造成 ${fmtNum(Math.round(res.applied * 10) / 10)} 点伤害${notes.length ? `（${notes.join('，')}）` : ''}`, 'dmg');
  shakeCard(target);

  applyCompleteAttackDefenseReactions({ attacker: e, defender: target, defenderHadEvaBuff, defenderHadYuxuShield, hitSegments: 1, missSegments: 0 });

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
  if (skillId === 'taiyi' && lv > 0) {
    const st = getTaiyiStats(lv);
    return {
      id: 'taiyi',
      name: '太乙伏魔剑',
      hits: st.hits,
      multiplier: st.multiplier,
      stat: 'sword'
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

function doCompanionAction(f, followUpSkillId = '') {
  if (!f || f.hp <= 0) return;

  if (!followUpSkillId && f.confused) {
    f.confused = false;
    const dmg = Math.max(0, Math.round(calcNormalDamage(1) * 10) / 10);
    f.hp -= dmg;
    addLog(`${f.name} 陷入混乱，攻击了自己，造成 ${fmtNum(dmg)} 点伤害！`, 'dmg');
    shakeCard(f);
    if (f.hp <= 0) f.hp = 0;
    return;
  }

  let chosenSkillId = followUpSkillId || '';
  if (!chosenSkillId && f.id === BOND_SPAR_ID && player.bondStrategy && player.bondStrategy.enabled) {
    chosenSkillId = tryBondLowHpStrategy(f)
      || (typeof tryBondAllyLowHpStrategy === 'function' ? tryBondAllyLowHpStrategy(f) : '')
      || resolveBondStrategySkill();
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
    const hitChance = calcHitChance(acc, fighterEvasion(cur));
    if (Math.random() >= hitChance) { missSegments++; continue; }

    const own = fighterAttackValue(f, spec.stat);
    const def = spec.ignoreDef ? 0 : fighterDefenseValue(cur, spec.stat);
    const hanShiBonus = spec.hanShi ? hanShiLayers * hanShiPerLayer * (Number(f.con) || 0) : 0;
    let raw = (20 + (Number(f.con) || 0) + (own - def / 2) * 2.5 + hanShiBonus) * mult * 2;
    if (spec.siJin && (Number(f.siTuiLayers) || 0) >= JIUSI_SITUI_MAX) raw *= 1.45;

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
  } else {
    const targetText = touched.size > 0 ? [...touched.keys()].join('、') : (firstTarget.name || '');
    const detail = [`${hitSegments}段命中`];
    if (missSegments) detail.push(`${missSegments}段被闪避`);
    if (absorbedTotal > 0) detail.push(`浩然气化去 ${fmtNum(absorbedTotal)} 点`);
    if (kills.length) detail.push(`击倒 ${[...new Set(kills)].join('、')}`);
    if (touched.size > 1) {
      detail.push([...touched.entries()].map(([n, t]) => `${n} ${fmtNum(Math.round(t.applied * 10) / 10)} 点`).join('，'));
    }
    addLog(`${f.name} 施展【${spec.name}】，对${targetText}造成 ${fmtNum(Math.round(dmgTotal * 10) / 10)} 点伤害（${detail.join('，')}）`, 'dmg');
    shakeCard(cur || firstTarget);

    /* 同伴攻击同样会触发【无咎】反击：反击由出手的同伴本人承受（书童亦不例外） */
    const counterTarget = cur || firstTarget;
    if (counterTarget && counterTarget.hp > 0 && !battle.over) doWujiuCounter(counterTarget, hits, f);
  }

  /* 500 羁绊效果：夏扑萤每次行动后立刻进行一次飞石破攻击 */
  if (!followUpSkillId && !battle.over && f.hp > 0 && f.id === BOND_SPAR_ID &&
      getBondValue() >= 500 && (battle.enemies || []).some(x => x && x.hp > 0)) {
    addLog(`【心有灵犀】${f.name}顺势再发一记【飞石破】！`, 'crit');
    doCompanionAction(f, 'feishipo');
  }
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

/* 战斗开场效果：震山拳百重（需装备震山拳）叠 20 层撼山势；九思剑法百重（需装备九思剑法）连出七剑 */
function applyBattleStartEffects() {
  const pf = playerFighter();
  if (!pf) return;
  const eqCheck = typeof isPlayerSkillEquipped === 'function' ? isPlayerSkillEquipped : () => true;
  if (getWangbaLevel() >= 100 && eqCheck('zhenshan')) {
    pf.hanShiLayers = Math.min(HANSHAN_MAX_LAYERS, (Number(pf.hanShiLayers) || 0) + 20);
    addLog(`【撼山势·起手】你沉肩坐马，一口气叠起 ${pf.hanShiLayers} 层【撼山势】。`, 'crit');
  }
  if (getJiusiLevel() >= 100 && eqCheck('jiusi')) {
    addLog('【九思剑法·先手】战斗方起，你已连出七剑！', 'crit');
    for (let i = 0; i < 7; i++) {
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

function purgeRandomDebuffs(f, count) {
  if (!f || f.hp <= 0) return [];
  const removed = [];
  for (let i = 0; i < count; i++) {
    const pool = [];
    if ((Number(f.daxueLayers) || 0) > 0) pool.push('daxue');
    if ((Number(f.bleedStacks) || 0) > 0) pool.push('bleed');
    if ((Number(f.weirdPoisonStacks) || 0) > 0) pool.push('weirdPoison');
    if ((Number(f.jiumai) || 0) > 0) pool.push('jiumai');
    if (f.confused) pool.push('confused');
    if (f.vulnerable) pool.push('vulnerable');
    if (f.qizhi) pool.push('qizhi');
    if (!pool.length) break;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick === 'daxue') {
      f.daxueLayers = Math.max(0, Number(f.daxueLayers) - 1);
      if (f.daxueLayers < 0.01) f.daxueLayers = 0;
      removed.push('打穴');
    } else if (pick === 'bleed') {
      f.bleedStacks = Math.max(0, Math.floor(Number(f.bleedStacks) || 0) - 1);
      removed.push('流血');
    } else if (pick === 'weirdPoison') {
      f.weirdPoisonStacks = Math.max(0, Math.floor(Number(f.weirdPoisonStacks) || 0) - 1);
      removed.push('诡异毒素');
    } else if (pick === 'jiumai') {
      f.jiumai = Math.max(0, (Number(f.jiumai) || 0) - 1);
      removed.push('截脉');
    } else if (pick === 'confused') {
      f.confused = false;
      removed.push('混乱');
    } else if (pick === 'vulnerable') {
      f.vulnerable = false;
      removed.push('破防');
    } else if (pick === 'qizhi') {
      f.qizhi = false;
      f.speed = (Number(f.speed) || 0) + (typeof QIZHI_SPEED_DOWN === 'number' ? QIZHI_SPEED_DOWN : 0.1);
      removed.push('气滞');
    }
  }
  return removed;
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

  /* 震山拳百重（需装备震山拳）：【撼山势】每秒自动叠加一层 */
  {
    const pf = playerFighter();
    const eqCheck = typeof isPlayerSkillEquipped === 'function' ? isPlayerSkillEquipped : () => true;
    if (pf && pf.hp > 0 && getWangbaLevel() >= 100 && eqCheck('zhenshan')) {
      if (!battle.lastHanShanAt) battle.lastHanShanAt = nowSt;
      const ticks = Math.floor((nowSt - battle.lastHanShanAt) / 1000);
      if (ticks > 0) {
        battle.lastHanShanAt += ticks * 1000;
        pf.hanShiLayers = Math.min(HANSHAN_MAX_LAYERS, (Number(pf.hanShiLayers) || 0) + ticks);
      }
    }
  }

  /* 凌虚步百重刷新、冯虚御风 / 玉虚归真持续恢复、道渺渺【诸邪辟易】每秒驱散 5 层负面状态 */
  for (const f of allFighters()) {
    if (!f || f.hp <= 0) continue;
    if (!f.lingxuFirstDodge && (Number(f.lingxuLevel) || 0) >= 100 && f.lingxuRegenNextAt && nowSt >= f.lingxuRegenNextAt) {
      f.lingxuFirstDodge = true;
      f.lingxuRegenNextAt = 0;
      addLog(`【凌虚】${f.isPlayer ? '你' : f.name}周身清风再起，重新凝结【凌虚】！`, 'win');
    }
    const fengxu = Number(f.fengxuLayers) || 0;
    if (fengxu > 0 && f.hp < f.maxHp) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * (typeof FENGXU_HP_REGEN_PCT === 'number' ? FENGXU_HP_REGEN_PCT : 0.01) * fengxu * dt);
    }
    if ((Number(f.yuxuLevel) || 0) >= 100 && f.hp < f.maxHp) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.02 * dt);
    }
    if (f.zhuXieBiYi) {
      if (!f.lastZhuXieAt) f.lastZhuXieAt = nowSt;
      const zTicks = Math.floor((nowSt - f.lastZhuXieAt) / 1000);
      if (zTicks > 0) {
        f.lastZhuXieAt += zTicks * 1000;
        const purged = purgeRandomDebuffs(f, 5 * zTicks);
        if (purged.length) {
          addLog(`【诸邪辟易】${f.name}周身清气一荡，消去 ${purged.length} 层负面状态。`, '');
        }
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

  /* 【诡异毒素】：超大型白衣怪人在场时，每秒给在场所有存活角色（含自己）叠加一层；
     每层每秒流失 5 点气血，对超大型白衣怪人则转变为每秒回复 5 点气血 */
  {
    const hasGiant = (battle.enemies || []).some(e => e && e.hp > 0 && e.isGiantWhiteRobe);
    const anyPoisoned = allFighters().some(f => f && f.hp > 0 && Number(f.weirdPoisonStacks) > 0);
    if (hasGiant || anyPoisoned) {
      if (!battle.lastWeirdPoisonAt) battle.lastWeirdPoisonAt = nowSt;
      const pTicks = Math.floor((nowSt - battle.lastWeirdPoisonAt) / 1000);
      if (pTicks > 0) {
        battle.lastWeirdPoisonAt += pTicks * 1000;
        let anyWeirdHit = false;
        let firstSpread = false;
        for (const f of allFighters()) {
          if (!f || f.hp <= 0) continue;
          if (hasGiant) {
            const prev = Math.floor(Number(f.weirdPoisonStacks) || 0);
            f.weirdPoisonStacks = prev + pTicks;
            if (prev === 0) firstSpread = true;
          }
          const stacks = Math.floor(Number(f.weirdPoisonStacks) || 0);
          if (stacks <= 0) continue;
          const amt = stacks * pTicks * WEIRD_POISON_PER_STACK_PER_SEC;
          if (f.weirdPoisonHeal) {
            if (f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + amt);
          } else {
            f.hp = Math.max(0, f.hp - amt);
            anyWeirdHit = true;
          }
        }
        if (firstSpread) {
          addLog('【诡异毒素】超大型白衣怪人周身毒瘴扩散，在场众人皆染上了【诡异毒素】！', 'dmg');
        }
        if (anyWeirdHit && !battle.over) checkBattleEnd();
        if (battle.over || !battleRunning) return;
      }
    }
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
