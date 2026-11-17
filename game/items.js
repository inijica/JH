/* 物品与鱼获数据（从 game.js 拆出，需在 game.js 之前加载） */
const FISH_EFFECTS = {
  jiyu:      { stat: 'root',         baseValue: 0.008, legacyPerWeight: 0.012, label: '根骨' },
  caoyu:     { stat: 'constitution', baseValue: 0.062, legacyPerWeight: 0.009, label: '体魄' },
  baitiao:   { stat: 'neiLi',        baseValue: 0.05,  legacyPerWeight: 0.24,  label: '内力' },
  chilinyu:  { stat: 'neiLi',        baseValue: 0.16,  legacyPerWeight: 0.35,  label: '内力' },
  bailingyu: { stat: 'qinggongExp',  baseValue: 300,   label: '轻功经验' },
  xishiban:  { stat: 'constitution', baseValue: 0.1,   label: '体魄' },
  hongwei:   { stat: 'neiLi',        baseValue: 0.5,   label: '内力' },
  qingyu:    { stat: 'root',         baseValue: 0.03,  label: '根骨' }
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
    stoveBonus: 5,
    duration: 3000
  }
};
