/* 物品与鱼获数据（从 game.js 拆出，需在 game.js 之前加载） */
const FISH_EFFECTS = {
  jiyu:     { stat: 'root',         perWeight: 0.01, label: '根骨' },
  caoyu:    { stat: 'constitution', perWeight: 0.007, label: '体魄' },
  baitiao:  { stat: 'neiLi',        perWeight: 0.2,    label: '内力' },
  chilinyu: { stat: 'neiLi',        perWeight: 0.32,    label: '内力' }
};

const ITEM_DEFS = {
  jiyu: {
    name: '鲫鱼',
    type: '鱼',
    desc: '赵家村溪里最常见的鲫鱼，鳞片银亮，肉味清甜。',
    usable: true,
    use: (item) => {
      const w = (item.data && item.data.weight) || 0;
      const gain = w * FISH_EFFECTS.jiyu.perWeight;
      if (gain <= 0) return false;
      player.root += gain;
      showToast(`吃下鲫鱼（${w.toFixed(2)}s），根骨 +${gain.toFixed(4)}`);
      return true;
    }
  },
  caoyu: {
    name: '草鱼',
    type: '鱼',
    desc: '溪里的大草鱼，个头不小，肉厚刺少。',
    usable: true,
    use: (item) => {
      const w = (item.data && item.data.weight) || 0;
      const gain = w * FISH_EFFECTS.caoyu.perWeight;
      if (gain <= 0) return false;
      player.constitution += gain;
      showToast(`吃下草鱼（${w.toFixed(2)}s），体魄 +${gain.toFixed(4)}`);
      return true;
    }
  },
  baitiao: {
    name: '白条',
    type: '鱼',
    desc: '细长的小白条，动作飞快，出水即死。',
    usable: true,
    use: (item) => {
      const w = (item.data && item.data.weight) || 0;
      const gain = w * FISH_EFFECTS.baitiao.perWeight;
      if (gain <= 0) return false;
      player.neiLi += gain;
      showToast(`吃下白条（${w.toFixed(2)}s），内力 +${gain.toFixed(3)}`);
      return true;
    }
  },
  chilinyu: {
    name: '赤鳞鱼',
    type: '鱼',
    desc: '鳞片泛着赤红光泽的异种鱼，村中老人说多年未见。',
    usable: true,
    use: (item) => {
      const w = (item.data && item.data.weight) || 0;
      const gain = w * FISH_EFFECTS.chilinyu.perWeight;
      if (gain <= 0) return false;
      player.neiLi += gain;
      showToast(`吃下赤鳞鱼（${w.toFixed(2)}s），内力 +${gain.toFixed(3)}`);
      return true;
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
      const fish = FISH_EFFECTS[d.fishId];
      if (!fish) return false;
      const w = Number(d.weight) || 0;
      const mult = Number(d.effectMult) || 1;
      const gain = w * fish.perWeight * mult;
      if (gain <= 0) return false;
      player[fish.stat] += gain;
      showToast(`吃下${d.name || '烤鱼'}，${fish.label} +${gain.toFixed(4)}`);
      return true;
    }
  }
};

const FISH_BASE_WEIGHT = {
  jiyu:    { min: 0.32, max: 0.80 },
  caoyu:   { min: 3.40, max: 8.50 },
  baitiao: { min: 0.10, max: 0.25 },
  chilinyu:{ min: 0.23, max: 0.57 }
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