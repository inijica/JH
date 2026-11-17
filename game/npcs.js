/* 角色属性数据（从 game.js 拆出，需在 game.js 之前加载） */
const NPC_DEFS = {
  zhaoTiezhu: {
    id: 'zhaoTiezhu',
    name: '赵铁柱',
    place: 'smithy',
    root: 8, comp: 6, luck: 6,
    baseCon: 30, baseNeiLi: 15,
    speed: 0.2,
    fist: 55, blade: 25, sword: 25, changbing: 20, qimen: 20, hidden: 20,
    accuracy: 0.9, evasion: 0.1,
    sparExp: 900,
    skills: [
      { id: 'baiduan', name: '百锻锤法',   level: 4,  stat: 'con',   per: 2, note: '伤害倍率0.3，伤害次数2，用体魄代替武学属性；每重体魄+2' },
      { id: 'cuihuo',  name: '淬火呼吸法', level: 2,  stat: 'neiLi', per: 3, note: '每重提升3内力' }
    ],
    attack: { name: '百锻锤法', multiplier: 0.3, hits: 2, stat: 'con' },
    greeting: '“是{n}儿啊，有什么事吗？”',
    chat: [
      '“呵呵，一转眼的功夫，你和萤儿都已经长这么大了。”',
      '赵铁柱擦了擦额头上的汗，停下手头的活计，仔细端量了你一眼，露出五味杂陈的表情。',
      '你们对视了一会，他露出疲惫的微笑。',
      '“......萤儿很调皮吧，你也不必总由着她去的。”',
      '“我还得工作，你先自个儿去到处转转吧。”'
    ],
    battleLine: '好，那就让我瞧瞧{n}儿的武功练得怎么样了。'
  },
  zhaoShip: {
    id: 'zhaoShip',
    name: '赵十二',
    place: 'hill',
    root: 7, comp: 5, luck: 5,
    baseCon: 25, baseNeiLi: 15,
    speed: 0.25,
    fist: 35, blade: 35, sword: 25, changbing: 25, qimen: 25, hidden: 25,
    accuracy: 0.9, evasion: 0.1,
    sparExp: 900,
    skills: [
      { id: 'gongshu', name: '赵家弓术', level: 5, stat: 'neiLi', per: 3, note: '伤害倍率0.5，伤害次数1，用内力代替武学属性；每重内力+3' }
    ],
    attack: { name: '赵家弓术', multiplier: 0.5, hits: 1, stat: 'neiLi' },
    greeting: '“哟，这不是铁柱家的孩子吗，找我有事？”',
    chat: [
      '“找我聊天？”',
      '他的脸上闪过一丝诧异。',
      '“这倒是稀罕得很，你平时不总是被你家那位小祖宗缠得紧吗，怎有空找我聊天了？”',
      '“算啦算啦，若是那位小祖宗找来，我可不会有好下场，你还是去找别人聊天吧。”'
    ],
    battleLine: '哎哟，这架是非打不可吗？那你且当心了，箭矢可不长眼。'
  },
  liQianyuan: {
    id: 'liQianyuan',
    name: '李乾元（半成功力）',
    place: 'shuyuan',
    root: 15, comp: 25, luck: 25,
    baseCon: 100, baseNeiLi: 150,
    speed: 0.5,
    fist: 90, blade: 50, sword: 50, changbing: 50, qimen: 50, hidden: 50,
    accuracy: 1.0, evasion: 0.3,
    wujiu: true, haoran: true,
    noGrowth: true, sparExp: 5000,
    skills: [
      { id: 'wujiu',  name: '无咎指',     level: 12, stat: '', note: '发动后不造成伤害，获得一层【无咎】；受到伤害后立刻发动反击，攻击次数等于对手本次攻击的攻击次数，伤害倍率为 0.1×【无咎】层数，拳掌属性' },
      { id: 'haoran', name: '浩然养气诀', level: 12, stat: '', note: '每五秒给自己叠加一层【浩然气】，每层提供 200 点护盾；每受到 200 点伤害减少一层' }
    ],
    attack: { name: '无咎指', noDamage: true },
    greeting: '“如何，可是已经准备好与我切磋了吗？”',
    chat: [
      '“如何，可是已经准备好与我切磋了吗？”'
    ],
    battleLine: '那便请了。我只用半成功力，你们若败了可不要哭鼻子。'
  },
  zhaoDaifu: {
    id: 'zhaoDaifu',
    name: '赵大夫',
    place: 'clinic',
    root: 12, comp: 15, luck: 15,
    baseCon: 25, baseNeiLi: 65,
    speed: 0.35,
    fist: 60, blade: 30, sword: 30, changbing: 30, qimen: 30, hidden: 90,
    medicine: 100,
    accuracy: 1.0, evasion: 0.1,
    jiumai: true, huomai: true, jinzhen: true,
    noGrowth: false, sparExp: 1650,
    skills: [
      { id: 'jiemai',  name: '截脉指',     level: 10, stat: 'fist',   per: 3, note: '伤害次数2，伤害倍率0.15，拳掌属性；每重拳掌+3，命中后附加【截脉】，每层降低0.01行动速度，每3秒消退一层' },
      { id: 'huomai',  name: '活脉养络法', level: 15, stat: 'neiLi',  per: 3, note: '每重内力+3；战斗中每5秒获得一层【活脉】，每层提供医术/50的每秒生命恢复' }
    ],
    techniques: ['金针渡穴（特技）'],
    attack: { name: '截脉指', multiplier: 0.15, hits: 2, stat: 'fist' },
    greeting: '“呵呵.....是铁柱家的孩子啊。”',
    chat: [
      '“唔.....”',
      '老人忽然摸起胡子，眉头微微皱起。',
      '“不知是不是岁数到了，最近......怎的总感觉这赵家村要变天呢.....”',
      '“唉....风雨欲来，风雨欲来啊......”',
      '他摇了摇头，不再言语。'
    ],
    battleLine: '“呵呵，你可要小心些，不要小觑了我这老头子喔”'
  },
  shutong: {
    id: 'shutong',
    name: '书童',
    place: 'shuyuan',
    root: 3, comp: 5, luck: 5,
    baseCon: 12, baseNeiLi: 20,
    speed: 0.2,
    fist: 18, blade: 10, sword: 10, changbing: 10, qimen: 10, hidden: 10,
    accuracy: 0.9, evasion: 0.1,
    sparExp: 500,
    skills: [
      { id: 'shutong_wangba', name: '王八拳', level: 1, stat: 'fist', per: 2, conPer: 1, note: '伤害倍率0.25，伤害次数1，拳法属性；每重拳掌+2、体魄+1' }
    ],
    attack: { name: '王八拳', multiplier: 0.25, hits: 1, stat: 'fist' },
    greeting: '“......那个，你们看着我干什么？”',
    battleLine: '“等、等等！我、我真的要打吗？”'
  }
};
