/* 物品、鱼获与蔬果数据（从 game.js 拆出，需在 game.js 之前加载） */
const FISH_EFFECTS = {
  jiyu:      { stat: 'root',         baseValue: 0.008, legacyPerWeight: 0.012, label: '根骨' },
  caoyu:     { stat: 'constitution', baseValue: 0.062, legacyPerWeight: 0.009, label: '体魄' },
  baitiao:   { stat: 'neiLi',        baseValue: 0.05,  legacyPerWeight: 0.24,  label: '内力' },
  chilinyu:  { stat: 'neiLi',        baseValue: 0.16,  legacyPerWeight: 0.35,  label: '内力' },
  bailingyu: { stat: 'qinggongExp',  baseValue: 180,   label: '轻功经验' },
  xishiban:  { stat: 'constitution', baseValue: 0.08,  label: '体魄' },
  hongwei:   { stat: 'neiLi',        baseValue: 0.2,   label: '内力' },
  qingyu:    { stat: 'root',         baseValue: 0.024, label: '根骨' }
};

const VEG_EFFECTS = {
  fanqie:   { stat: 'constitution', baseValue: 0.5,  label: '体魄' },
  baicai:   { stat: 'neiLi',        baseValue: 2,    label: '内力' },
  shanyao:  { stat: 'root',         baseValue: 0.05, label: '根骨' },
  luobo:    { stat: 'comp',         baseValue: 0.05, label: '悟性' },
  huanggua: { stat: 'luck',         baseValue: 0.05, label: '定力' }
};

function getRawFishGain(fishId, data) {
  const eff = FISH_EFFECTS[fishId];
  if (!eff) return 0;
  const d = data || {};
  if (d.quality != null && Number.isFinite(Number(d.quality))) {
    return eff.baseValue * (Math.max(0, Number(d.quality)) / 100);
  }
  if (eff.legacyPerWeight && d.weight != null) {
    return (Number(d.weight) || 0) * eff.legacyPerWeight;
  }
  return 0;
}

function getRawVegGain(vegId, data) {
  const eff = VEG_EFFECTS[vegId];
  if (!eff) return 0;
  const d = data || {};
  const q = (d.quality != null && Number.isFinite(Number(d.quality))) ? Number(d.quality) : 100;
  return eff.baseValue * (Math.max(0, q) / 100);
}

function getCookedFishGain(data) {
  const d = data || {};
  const eff = FISH_EFFECTS[d.fishId];
  if (!eff) return 0;
  const mult = Number(d.effectMult) || 1;
  if (d.fishQuality != null && Number.isFinite(Number(d.fishQuality))) {
    return eff.baseValue * (Math.max(0, Number(d.fishQuality)) / 100) * mult;
  }
  if (eff.legacyPerWeight && d.weight != null) {
    return (Number(d.weight) || 0) * eff.legacyPerWeight * mult;
  }
  return eff.baseValue * mult;
}

function getStewedDishGains(data) {
  const d = data || {};
  const mult = Number(d.effectMult) || 1;
  const fishEff = FISH_EFFECTS[d.fishId];
  const vegEff = VEG_EFFECTS[d.vegId];
  const merged = {};
  const add = (eff, val) => {
    if (!eff || !(val > 0)) return;
    if (!merged[eff.stat]) merged[eff.stat] = { stat: eff.stat, label: eff.label, gain: 0 };
    merged[eff.stat].gain += val;
  };
  if (fishEff) {
    const rawFish = getRawFishGain(d.fishId, { weight: d.weight, quality: d.fishQuality });
    add(fishEff, rawFish * mult);
  }
  if (vegEff) {
    const rawVeg = getRawVegGain(d.vegId, { quality: d.vegQuality });
    add(vegEff, rawVeg * mult);
  }
  return Object.values(merged);
}

function findTargetQinggongSkill() {
  const skills = Array.isArray(player.skills) ? player.skills : [];
  const selId = (player.trainingSelections || {})['轻功'];
  if (selId) {
    const sel = skills.find(s => s && s.id === selId && skillMatchesCategory(s, '轻功'));
    if (sel) return sel;
  }
  return skills.find(s => s && skillMatchesCategory(s, '轻功')) || null;
}

function grantFishEffect(fishId, gain, sourceLabel) {
  const eff = FISH_EFFECTS[fishId];
  if (!eff || !(gain > 0)) return false;
  if (eff.stat === 'qinggongExp') {
    const sk = findTargetQinggongSkill();
    if (!sk) {
      showToast('尚未习得轻功，无法吸收鱼获中的灵气');
      return false;
    }
    addSkillExp(sk, gain);
    if (typeof renderSkills === 'function') renderSkills();
    showToast(`吃下${sourceLabel}，${sk.name}经验 +${Math.round(gain)}`);
    return true;
  }
  player[eff.stat] = (Number(player[eff.stat]) || 0) + gain;
  const decimals = eff.stat === 'neiLi' ? 3 : 4;
  showToast(`吃下${sourceLabel}，${eff.label} +${gain.toFixed(decimals)}`);
  return true;
}

function grantVegEffect(vegId, gain, sourceLabel) {
  const eff = VEG_EFFECTS[vegId];
  if (!eff || !(gain > 0)) return false;
  player[eff.stat] = (Number(player[eff.stat]) || 0) + gain;
  const decimals = eff.stat === 'neiLi' ? 3 : 4;
  showToast(`吃下${sourceLabel}，${eff.label} +${gain.toFixed(decimals)}`);
  return true;
}

const ITEM_DEFS = {
  jiyu: {
    name: '鲫鱼',
    type: '鱼',
    desc: '赵家村溪里最常见的鲫鱼，鳞片银亮，肉味清甜。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('jiyu', d);
      return grantFishEffect('jiyu', gain, d.weight != null ? `鲫鱼（${Number(d.weight).toFixed(2)}s）` : '鲫鱼');
    }
  },
  caoyu: {
    name: '草鱼',
    type: '鱼',
    desc: '溪里的大草鱼，个头不小，肉厚刺少。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('caoyu', d);
      return grantFishEffect('caoyu', gain, d.weight != null ? `草鱼（${Number(d.weight).toFixed(2)}s）` : '草鱼');
    }
  },
  baitiao: {
    name: '白条',
    type: '鱼',
    desc: '细长的小白条，动作飞快，出水即死。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('baitiao', d);
      return grantFishEffect('baitiao', gain, d.weight != null ? `白条（${Number(d.weight).toFixed(2)}s）` : '白条');
    }
  },
  chilinyu: {
    name: '赤鳞鱼',
    type: '鱼',
    desc: '鳞片泛着赤红光泽的异种鱼，村中老人说多年未见。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('chilinyu', d);
      return grantFishEffect('chilinyu', gain, d.weight != null ? `赤鳞鱼（${Number(d.weight).toFixed(2)}s）` : '赤鳞鱼');
    }
  },
  bailingyu: {
    name: '白翎鱼',
    type: '鱼',
    desc: '京城外清溪中游速极快的银白细鱼，尾鳍如羽翎般轻盈。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('bailingyu', d);
      return grantFishEffect('bailingyu', gain, d.weight != null ? `白翎鱼（${Number(d.weight).toFixed(2)}s）` : '白翎鱼');
    }
  },
  xishiban: {
    name: '溪石斑',
    type: '鱼',
    desc: '栖息在京郊碎石清流中的斑纹鱼，肉质紧实弹牙，最补气力。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('xishiban', d);
      return grantFishEffect('xishiban', gain, d.weight != null ? `溪石斑（${Number(d.weight).toFixed(2)}s）` : '溪石斑');
    }
  },
  hongwei: {
    name: '红尾',
    type: '鱼',
    desc: '尾鳍嫣红的肥美河鱼，食之浑身暖意融融，内息充沛。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('hongwei', d);
      return grantFishEffect('hongwei', gain, d.weight != null ? `红尾（${Number(d.weight).toFixed(2)}s）` : '红尾');
    }
  },
  qingyu: {
    name: '青鱼',
    type: '鱼',
    desc: '青背白腹的深潭大鱼，肉肥味鲜，最能强健根骨。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawFishGain('qingyu', d);
      return grantFishEffect('qingyu', gain, d.weight != null ? `青鱼（${Number(d.weight).toFixed(2)}s）` : '青鱼');
    }
  },
  fanqie: {
    name: '番茄',
    type: '蔬菜',
    desc: '红润饱满的番茄，酸甜多汁，生食即可滋补体魄。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawVegGain('fanqie', d);
      return grantVegEffect('fanqie', gain, '番茄');
    }
  },
  baicai: {
    name: '白菜',
    type: '蔬菜',
    desc: '叶片翠绿紧实的鲜白菜，清润甘甜，有助积蓄内力。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawVegGain('baicai', d);
      return grantVegEffect('baicai', gain, '白菜');
    }
  },
  shanyao: {
    name: '山药',
    type: '蔬菜',
    desc: '肉质绵密的山药，温补脾肾，能缓缓强健根骨。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawVegGain('shanyao', d);
      return grantVegEffect('shanyao', gain, '山药');
    }
  },
  luobo: {
    name: '萝卜',
    type: '蔬菜',
    desc: '脆生生的大萝卜，清气通窍，食之令人神思清明、略增悟性。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawVegGain('luobo', d);
      return grantVegEffect('luobo', gain, '萝卜');
    }
  },
  huanggua: {
    name: '黄瓜',
    type: '蔬菜',
    desc: '顶花带刺的嫩黄瓜，清凉爽口，有助凝神静气、稳固定力。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getRawVegGain('huanggua', d);
      return grantVegEffect('huanggua', gain, '黄瓜');
    }
  },
  wuxueXinde: {
    name: '武学心得',
    type: '心法',
    desc: '不知哪位前辈留下的手札，字迹潦草却字字珠玑。使用后拳掌、刀法、剑法、长兵、奇门、暗器各 +2。',
    usable: true,
    use: () => {
      const gain = 2;
      player.fist      = (Number(player.fist)      || 0) + gain;
      player.blade     = (Number(player.blade)     || 0) + gain;
      player.sword     = (Number(player.sword)     || 0) + gain;
      player.changbing = (Number(player.changbing) || 0) + gain;
      player.qimen     = (Number(player.qimen)     || 0) + gain;
      player.hidden    = (Number(player.hidden)    || 0) + gain;
      showToast(`参悟武学心得，拳掌、刀法、剑法、长兵、奇门、暗器 +${gain}`);
      return true;
    }
  },
  wuxueGanwu: {
    name: '武学感悟',
    type: '心法',
    desc: '百川汇海般的武道灵思，寥寥数语便直指各派根底。使用后全武学属性 +5（拳掌、刀法、剑法、长兵、奇门、暗器）。',
    usable: true,
    use: () => {
      const gain = 5;
      player.fist      = (Number(player.fist)      || 0) + gain;
      player.blade     = (Number(player.blade)     || 0) + gain;
      player.sword     = (Number(player.sword)     || 0) + gain;
      player.changbing = (Number(player.changbing) || 0) + gain;
      player.qimen     = (Number(player.qimen)     || 0) + gain;
      player.hidden    = (Number(player.hidden)    || 0) + gain;
      showToast(`参悟武学感悟，拳掌、刀法、剑法、长兵、奇门、暗器 +${gain}`);
      return true;
    }
  },
  dahuanDan: {
    name: '大还丹',
    type: '丹药',
    desc: '集百草精华炼就的上乘灵丹，固本培元。使用后定力、根骨、悟性各 +1。',
    usable: true,
    use: () => {
      player.luck = (Number(player.luck) || 0) + 1;
      player.root = (Number(player.root) || 0) + 1;
      player.comp = (Number(player.comp) || 0) + 1;
      showToast('服下大还丹，定力、根骨、悟性 +1');
      return true;
    }
  },
  chuilunxinwu: {
    name: '《垂纶心悟》',
    type: '心法',
    desc: '不知何人所著的钓鱼心得，字里行间透着几分闲趣。使用后获得 3500 点钓鱼经验。',
    usable: true,
    use: () => {
      ensureFishingTechnique();
      addFishingExp(3500);
      showToast('参悟《垂纶心悟》，钓鱼经验 +3500');
      return true;
    }
  },
  kaoyu: {
    name: '烤鱼',
    type: '菜',
    desc: '火堆上烤制的鱼。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gain = getCookedFishGain(d);
      return grantFishEffect(d.fishId, gain, d.name || '烤鱼');
    }
  },
  shucaiDunyu: {
    name: '蔬菜炖鱼',
    type: '菜',
    desc: '将时蔬与鲜鱼一同慢炖而成的佳肴。',
    usable: true,
    use: (item) => {
      const d = item.data || {};
      const gains = getStewedDishGains(d);
      if (!gains.length) return false;
      const needsQinggong = gains.some(g => g.stat === 'qinggongExp');
      let qgSkill = null;
      if (needsQinggong) {
        qgSkill = findTargetQinggongSkill();
        if (!qgSkill && gains.length === 1) {
          showToast('尚未习得轻功，无法吸收菜肴中的灵气');
          return false;
        }
      }
      const parts = [];
      for (const g of gains) {
        if (g.stat === 'qinggongExp') {
          if (qgSkill) {
            addSkillExp(qgSkill, g.gain);
            if (typeof renderSkills === 'function') renderSkills();
            parts.push(`${qgSkill.name}经验 +${Math.round(g.gain)}`);
          }
        } else {
          player[g.stat] = (Number(player[g.stat]) || 0) + g.gain;
          const decimals = g.stat === 'neiLi' ? 3 : 4;
          parts.push(`${g.label} +${g.gain.toFixed(decimals)}`);
        }
      }
      if (!parts.length) return false;
      showToast(`吃下${d.name || '蔬菜炖鱼'}，${parts.join('、')}`);
      return true;
    }
  }
};

const FISH_BASE_WEIGHT = {
  jiyu:      { min: 0.32, max: 0.80 },
  caoyu:     { min: 3.40, max: 8.50 },
  baitiao:   { min: 0.10, max: 0.25 },
  chilinyu:  { min: 0.23, max: 0.57 },
  bailingyu: { min: 0.25, max: 0.65 },
  xishiban:  { min: 0.40, max: 1.00 },
  hongwei:   { min: 0.80, max: 2.00 },
  qingyu:    { min: 2.50, max: 6.50 }
};

const COOK_RECIPES = {
  kaoyu: {
    id: 'kaoyu',
    name: '烤鱼',
    desc: '将鱼处理干净后架于火上慢烤。',
    reqDesc: '需求：鱼类 ×1',
    stoveBonus: 5,
    duration: 3000
  },
  shucaiDunyu: {
    id: 'shucaiDunyu',
    name: '蔬菜炖鱼',
    desc: '鲜鱼与时蔬同锅细煨，二者滋味相融。额外获得 75% 庖丁经验。',
    reqDesc: '需求：鱼类 ×1，蔬菜 ×1',
    stoveBonus: 5,
    duration: 3000
  }
};
