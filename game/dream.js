/* 入梦 · 特殊挑战（新文件，需在 battle-spar.js 之后、game.js 之前加载）
   入梦挑战独立于切磋：可重复进行，奖励只发放一次；敌人不会获得修行成长。 */

const DREAM_CHAIN_CHANCE = 0.5;

/* 五狗屠龙阵的原始属性（直接写死，不经过 NPC 成长系统） */
const DREAM_DOG_STATS = {
  root: 10,
  comp: 10,
  luck: 10,
  con: 35,
  neiLi: 0,
  speed: 0.35,
  fist: 70,
  blade: 0,
  sword: 0,
  changbing: 0,
  qimen: 0,
  hidden: 0,
  medicine: 0,
  accuracy: 1.1,
  evasion: 0.2,
  attackName: '咬你',
  attackMultiplier: 0.65,
  attackHits: 1
};

function makeDreamEnemy(name) {
  const s = DREAM_DOG_STATS;
  const maxHp = Math.round(80 + s.con * 20);
  return {
    name,
    hp: maxHp,
    maxHp,
    atk: 0,
    speed: s.speed,
    con: s.con,
    neiLi: s.neiLi,
    root: s.root,
    comp: s.comp,
    luck: s.luck,
    fist: s.fist,
    blade: s.blade,
    sword: s.sword,
    changbing: s.changbing,
    qimen: s.qimen,
    hidden: s.hidden,
    medicine: s.medicine,
    accuracy: s.accuracy,
    evasion: s.evasion,
    attack: {
      name: s.attackName,
      multiplier: s.attackMultiplier,
      hits: s.attackHits,
      stat: 'fist',
      /* 命中叠一层流血，无叠加上限 */
      bleed: true
    },
    skills: ['咬你'],
    memory: {},
    confused: false,
    isSpar: true,
    dreamEnemy: true
  };
}

/* 赵家村三杰：NPC 原始属性 ×3（不获得修行成长）
   另加：命中率 +10%、闪避率 +5%，
   虚实莫测/延绵不绝/神宁气静各 +10。
   注意：敌方三项判定值 = 悟性/根骨/定力 × 0.5（见 skills.js 的 getEnemySkillValue），
   因此 +10 点判定需要等效 +20 点对应属性。 */
const DREAM_THREE_HEROES_MULT = 3;
const DREAM_THREE_HEROES_EXTRA = {
  accuracy: 0.10,
  evasion: 0.05,
  xushi: 10,
  mianmian: 10,
  shenning: 10
};

/* 只按 NPC_DEFS 中配置的原始等级计算，不读取 player.npcLevels 的切磋成长 */
function getDreamNpcBaseStats(npcId) {
  const def = NPC_DEFS[npcId];
  const extra = { con: 0, neiLi: 0, fist: 0, blade: 0, sword: 0, changbing: 0, qimen: 0, hidden: 0, medicine: 0 };
  const levels = {};
  def.skills.forEach(sk => {
    const lv = Math.max(1, Number(sk.level) || 1);
    levels[sk.id] = lv;
    const key = String(sk.stat || '');
    if (extra[key] !== undefined) {
      const per = Number(sk.per) > 0 ? Number(sk.per) : 1;
      extra[key] += lv * per;
    }
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

function makeDreamNpcEnemy(npcId) {
  const def = NPC_DEFS[npcId];
  if (!def) return null;
  const st = getDreamNpcBaseStats(npcId);
  const M = DREAM_THREE_HEROES_MULT;
  const E = DREAM_THREE_HEROES_EXTRA;
  const con = st.con * M;
  const maxHp = Math.round(80 + con * 20);
  const enemy = {
    name: def.name,
    npcId,
    hp: maxHp,
    maxHp,
    atk: 0,
    speed: (Number(def.speed) || 0) * M,
    con,
    neiLi: st.neiLi * M,
    fist: st.fist * M,
    blade: st.blade * M,
    sword: st.sword * M,
    changbing: st.changbing * M,
    qimen: st.qimen * M,
    hidden: st.hidden * M,
    medicine: st.medicine * M,
    accuracy: (Number(def.accuracy) || 0) + E.accuracy,
    evasion: Math.min(1, (Number(def.evasion) || 0) + E.evasion),
    root: (Number(def.root) || 0) * M + E.mianmian * 2,
    comp: (Number(def.comp) || 0) * M + E.xushi * 2,
    luck: (Number(def.luck) || 0) * M + E.shenning * 2,
    attack: def.attack,
    skills: def.skills.map(sk => `${sk.name}（${levelToChinese(st.levels[sk.id])}重）`),
    memory: {},
    confused: false,
    isSpar: true,
    dreamEnemy: true
  };
  /* 赵大夫自带的【活脉】被动照旧生效，数值同样计入 ×3 */
  if (def.huomai) {
    enemy.huomaiLayers = 1;
    enemy.huomaiInterval = 5000;
    enemy.huomaiNextAt = Date.now() + enemy.huomaiInterval;
    enemy.huomaiRegenPerLayer = (Number(enemy.medicine) || 0) / 50;
    enemy.huomaiSpeedPerLayer = 0;
  }
  return enemy;
}

/* 挑战数据：新增挑战时照着这里的结构补充即可
   - chain: true 时启用【连携】判定（dreamChainAttackAfter）
   - battleLines: 进入战斗时写入战斗日志的开场台词 */
const DREAM_CHALLENGES = [
  {
    id: 'wugou',
    name: '五狗屠龙阵',
    unlocked: true,
    chain: true,
    tagline: '五条毛茸茸的小狗拦在路前，摆出了一个不得了的阵势。',
    lead: '村里的五只狗狗不知从哪学来了一套莫名其妙的阵法........',
    enemies: ['叉烧', '流沙', '奶黄', '核桃', '紫薯'],
    mechanics: [
      '任意一人行动时进行判定：其余四人各有 50% 的几率连携进攻，立刻发动一次攻击（分别判定）。',
      '每次【咬你】命中时叠加一层【流血】：每层流血每秒失去 1 点气血，无叠加上限。'
    ],
    notes: [
      '陪伴角色会与你一同入梦参战。',
      '挑战可以重复进行，但奖励只会获得一次。',
    ],
    rewards: [
      { label: '根骨 +3', apply() { player.root = (Number(player.root) || 0) + 5; } },
      { label: '悟性 +2', apply() { player.comp = (Number(player.comp) || 0) + 2; } },
      { label: '定力 +2', apply() { player.luck = (Number(player.luck) || 0) + 2; } },
      { label: '体魄 +25', apply() { player.constitution = (Number(player.constitution) || 0) + 25; } },
      { label: '气血恢复 +20', apply() { player.bonusHpRegen = (Number(player.bonusHpRegen) || 0) + 20; } }
    ],
    buildEnemies() {
      return this.enemies.map(name => makeDreamEnemy(name));
    }
  },
  {
    id: 'sanjie',
    name: '赵家村三杰',
    unlocked: true,
    tagline: '赵铁柱、赵十二、赵大夫三人并肩而立，赵家村三杰齐至。',
    lead: '据说这才是赵家村三杰的真实实力？',
    enemies: ['赵铁柱', '赵十二', '赵大夫'],
    battleLines: [
      { speaker: '赵 铁 柱', text: '『还真的敢挑战赵家村三杰，勇气可嘉。但足下不会以为真的可以胜过我铁柱？』' },
      { speaker: '赵 大 夫', text: '『大夫也来助阵！十二，助我一臂之力！！！』' },
      { speaker: '赵 十 二', text: '『十二得令！』' }
    ],
    mechanics: [
      '赵家村三杰获得【赵家村三杰】增益：全属性 ×3，命中率 +10%、闪避率 +5%、虚实莫测 +10、延绵不绝 +10、神宁气静 +10。'
    ],
    notes: [
      '陪伴角色会与你一同入梦参战。',
      '挑战可以重复进行，但奖励只会获得一次。',
    ],
    rewards: [
      { label: '悟性 +3', apply() { player.comp = (Number(player.comp) || 0) + 3; } },
      { label: '根骨 +3', apply() { player.root = (Number(player.root) || 0) + 3; } },
      { label: '定力 +5', apply() { player.luck = (Number(player.luck) || 0) + 5; } },
      { label: '内力 +100', apply() { player.neiLi = (Number(player.neiLi) || 0) + 100; } },
      { label: '体魄 +30', apply() { player.constitution = (Number(player.constitution) || 0) + 30; } },
      { label: '医术 +30', apply() { player.medicine = (Number(player.medicine) || 0) + 30; } }
    ],
    buildEnemies() {
      return ['zhaoTiezhu', 'zhaoShip', 'zhaoDaifu'].map(makeDreamNpcEnemy).filter(Boolean);
    }
  }
];

let dreamSelectedId = '';

function getDreamChallenge(id) {
  return DREAM_CHALLENGES.find(c => c && c.id === id) || null;
}

function ensureDreamState() {
  if (!player.dream || typeof player.dream !== 'object') player.dream = {};
  if (!player.dream.cleared || typeof player.dream.cleared !== 'object') player.dream.cleared = {};
  return player.dream;
}

function isDreamCleared(id) {
  return !!ensureDreamState().cleared[id];
}

function getDreamRewardText(def) {
  return (def.rewards || []).map(r => r.label).join('、');
}

/* 敌人名单（不展示属性面板） */
function dreamEnemyBlockHtml(def) {
  const names = def.enemies || [];
  const nameHtml = names.map(n => `<div class="dream-enemy-name">『${escapeHtml(n)}』</div>`).join('');
  return `<div class="dream-enemy-names">${nameHtml}</div>`;
}

function dreamIntroHtml(def) {
  const mechanics = (def.mechanics || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');
  const notes = (def.notes || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');
  return [
    `<div class="dream-intro-lead">${escapeHtml(def.lead || def.tagline || '')}</div>`,
    '<div class="dream-intro-sub">敌 方</div>',
    dreamEnemyBlockHtml(def),
    '<div class="dream-intro-sub">特 殊 机 制</div>',
    `<ul class="dream-intro-list">${mechanics}</ul>`,
    '<div class="dream-intro-sub">须 知</div>',
    `<ul class="dream-intro-list">${notes}</ul>`
  ].join('');
}

function renderDreamPanel() {
  const listEl = $('dreamList');
  if (!listEl) return;

  const unlocked = DREAM_CHALLENGES.filter(c => c && c.unlocked);
  if (!unlocked.length) {
    listEl.innerHTML = '<div class="dream-empty">暂无入梦挑战</div>';
    return;
  }
  if (!getDreamChallenge(dreamSelectedId) || !getDreamChallenge(dreamSelectedId).unlocked) {
    dreamSelectedId = unlocked[0].id;
  }

  listEl.innerHTML = unlocked.map(c => {
    const cleared = isDreamCleared(c.id);
    return `<button type="button" class="dream-item ${c.id === dreamSelectedId ? 'active' : ''}" data-dream-id="${escapeHtml(c.id)}">
      <span class="dream-item-name">${escapeHtml(c.name)}</span>
      <span class="dream-item-state ${cleared ? 'cleared' : ''}">${cleared ? '已通关' : '未通关'}</span>
    </button>`;
  }).join('');

  const def = getDreamChallenge(dreamSelectedId);
  if (!def) return;
  const cleared = isDreamCleared(def.id);

  const titleEl = $('dreamTitle');
  if (titleEl) titleEl.textContent = def.name;
  const stateEl = $('dreamState');
  if (stateEl) {
    stateEl.textContent = cleared ? '已通关' : '未通关';
    stateEl.classList.toggle('cleared', cleared);
  }
  const introEl = $('dreamIntro');
  if (introEl) introEl.innerHTML = dreamIntroHtml(def);

  const rewardEl = $('dreamRewards');
  if (rewardEl) {
    const rewardText = getDreamRewardText(def);
    rewardEl.innerHTML = [
      `<div class="dream-reward-line">${escapeHtml(rewardText || '无')}</div>`,
      `<div class="dream-reward-note">${cleared ? '奖励已获得（重复挑战不再发放）' : '首次通关时获得以上奖励，且只能获得一次。'}</div>`
    ].join('');
  }

  const startBtn = $('dreamStartBtn');
  if (startBtn) {
    startBtn.textContent = cleared ? '再 次 入 梦' : '入 梦 挑 战';
    startBtn.disabled = false;
  }
}

/* 入梦挑战：进入战斗（夏扑萤随行参战） */
function startDreamBattle(challengeId) {
  const def = getDreamChallenge(challengeId);
  if (!def) return;
  if (!player.surname) {
    showToast('先踏入江湖再说吧');
    return;
  }
  if (battleActive()) {
    showToast('正在战斗中，先分出胜负吧');
    return;
  }

  capturePreBattleAction();
  cancelFishing();
  stopTraining();
  stopBattleEngine();
  battleRunning = false;

  player.maxHp = getMaxHp();
  player.hp = player.maxHp;
  battle.enemies = sealFighters('enemy', def.buildEnemies());
  /* 第二个参数 withCompanion = true：陪伴角色夏扑萤一同入梦参战 */
  battle.allies = buildAllyTeam(null, true);
  battle.over = false;
  battle.logs = [];
  battle.pozhan = 0;
  battle.lastPozhanAt = Date.now();
  battle.jiumaiNextAt = Date.now() + JIUMAI_DECAY_MS;
  battle.sparNpcId = '';
  battle.dreamId = def.id;
  battle.storyBattleId = '';
  battle.whiteRobe = null;
  battle.forfeited = false;
  if (typeof initBattleEvents === 'function') initBattleEvents('');
  initBattleStrategy();
  const forfeitBtn = $('battleForfeitBtn');
  if (forfeitBtn) forfeitBtn.textContent = '放 弃 战 斗';
  const pauseBtn = $('battlePauseBtn');
  if (pauseBtn) pauseBtn.textContent = '暂 停 战 斗';

  addLog(`【入梦】${def.name}：${def.tagline || ''}`, '');
  if (Array.isArray(def.battleLines)) {
    def.battleLines.forEach(l => addLog(`【${l.speaker}】${l.text}`, ''));
  }
  addLog(`【入梦】${BOND_CHAR.name}：『${player.gender === '女' ? '姐姐' : '哥哥'}，我也来！』`, '');
  addLog('（挑战中的敌人不会因胜负获得修行。）', '');
  renderBattleStructure();
  updateBattleUI();
  mainView = 'village';
  renderMainTab();
  switchTab('battle');
  battleRunning = true;
  startBattleEngine();
}

/* 入梦胜利结算：奖励只发一次，敌人不获得任何修行成长 */
function handleDreamWin(dreamId) {
  const def = getDreamChallenge(dreamId);
  const state = ensureDreamState();
  const firstClear = !state.cleared[dreamId];

  if (def && firstClear) {
    state.cleared[dreamId] = Date.now();
    (def.rewards || []).forEach(r => {
      try { r.apply(); } catch (err) {}
    });
    const rewardText = getDreamRewardText(def);
    addLog(`【入梦】破去${def.name}！获得奖励：${rewardText}。`, 'crit');
    addIntel(`你在入梦中破去${def.name}，获得奖励：${rewardText}。`, 'gold');
    showToast(`入梦挑战「${def.name}」通关！`);
  } else if (def) {
    addLog(`【入梦】${def.name}再破，奖励此前已得，此番并无新的所得。`, '');
  }

  player.maxHp = getMaxHp();
  player.hp = Math.min(player.hp, player.maxHp);
  if (typeof updateAttrUI === 'function') updateAttrUI();
  renderDreamPanel();
}

/* 战斗引擎钩子：任意一人行动时，其余同伴分别判定连携进攻
   仅对标记了 chain: true 的挑战生效 */
function dreamChainAttackAfter(actor) {
  if (!battle.dreamId || battle.over) return;
  const def = getDreamChallenge(battle.dreamId);
  if (!def || !def.chain) return;
  if (!actor || actor.side !== 'enemy' || actor.hp <= 0) return;

  const others = (battle.enemies || []).filter(e => e && e.hp > 0 && e !== actor);
  if (!others.length) return;

  const attackers = others.filter(() => Math.random() < DREAM_CHAIN_CHANCE);
  if (!attackers.length) return;

  addLog(`【连携】${actor.name}一动，${attackers.map(a => a.name).join('、')}同时扑上！`, 'win');
  for (const a of attackers) {
    if (battle.over || a.hp <= 0) break;
    doEnemyAttack(a);
    if (!battle.over) checkBattleEnd();
  }
}

(function bindDreamEvents() {
  const listEl = $('dreamList');
  if (listEl) {
    listEl.addEventListener('click', ev => {
      const btn = ev.target.closest('.dream-item');
      if (!btn) return;
      const id = btn.dataset.dreamId;
      if (!id || id === dreamSelectedId) return;
      dreamSelectedId = id;
      renderDreamPanel();
    });
  }
  const startEl = $('dreamStartBtn');
  if (startEl) {
    startEl.addEventListener('click', () => {
      if (!dreamSelectedId) dreamSelectedId = (DREAM_CHALLENGES.find(c => c && c.unlocked) || {}).id || '';
      if (dreamSelectedId) startDreamBattle(dreamSelectedId);
    });
  }
})();