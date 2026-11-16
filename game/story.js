/* 剧情对话数据（从 game.js 拆出，需在 game.js 之前加载；引用 player 等需在运行时求值的全局变量） */
window.DIALOG_TREE = {
  start: {
    speaker: '夏 扑 萤',
    text: () => `“${callName()}！${callName()}！我想吃烤鱼！”`,
    options: [
      { label: '好', next: 'goodEnd' },
      { label: '不行', next: 'refuse1' },
      { label: '吃吃吃，就知道吃，你是猪吗', next: 'pigReact' }
    ]
  },
  goodEnd: {
    speaker: '夏 扑 萤',
    unlockFishing: true,
    text: () => `“耶！${callName()}最好啦！”\n她兴高采烈地跳起来，仿佛得到了天大的好处一般。\n烤鱼也吃了好几次，但只要和你一起，她总是吃不腻的。\n（解锁：溪边垂钓）`,
    options: []
  },
  refuse1: {
    speaker: '夏 扑 萤',
    text: () => `“.......”\n她的表情一下子蔫了下来，像是霜打的茄子。\n那双黑不溜秋的眸子，直愣愣地盯着你。\n“不行吗？真的不行吗？”\n你知道，如果不答应她，她就会像这样一直时不时地哀怨几句，直到你妥协为止。`,
    options: [
      { label: '算了，答应她吧。', next: 'goodEnd' },
      { label: '不行就是不行。', next: 'refuseFinal' }
    ]
  },
  refuseFinal: {
    speaker: '夏 扑 萤',
    setFlag: 'fishRefusedOnce',
    text: () => `“哦....好吧.......”\n她不再言语，也没有不高兴，只是一个人静静地待着，等你什么时候心情好了，找她去一起抓鱼。`,
    options: [
      { label: '（继续）', next: 'end' }
    ]
  },
  refuseRetry: {
    speaker: '夏 扑 萤',
    text: () => `“${brotherSister()}，今天心情怎么样呀？”\n她泪眼汪汪地看着你，期待着你的应允。`,
    options: [
      { label: '走吧', next: 'goodEnd' },
      { label: '今天还不行', next: 'end' }
    ]
  },
  pigReact: {
    speaker: '夏 扑 萤',
    text: () => `“.......”\n她愣住了，似乎是没想到你会是这个反应。\n片刻后，她噗嗤笑了出来。\n“哈哈哈~嗯！没错，我是小猪！”\n她用双手将脸扮作猪头，哼唧了几声。\n“到底好不好嘛——${callName()}的小猪想吃烤鱼啦。”`,
    options: [
      { label: '好', next: 'goodEnd' },
      { label: '不行', next: 'refuse1' }
    ]
  },
  cookingStart: {
    speaker: '夏 扑 萤',
    unlockCooking: true,
    text: () => `你一竿骤起，刹那间，只见银梭掠月、钓缕牵风，惊起一池碎月影。\n身旁的夏扑萤兴奋地拍起了手。\n“${callName()}好厉害！”\n你知道，她对你的崇拜是千真万确的。\n却也知道，她真正想说的多半不是这句。\n“快！快！开始烤鱼吧！${player.gender === '女' ? '姐' : '哥'}！柴火我都已经拾好啦！”\n夏扑萤拽着你的衣袖摇晃，几滴哈喇子从嘴角缓缓曳下，连烤鱼的影子都还没见到，她却好像已经在幻想中大快朵颐了一般。`,
    options: []
  },
  fishBurnt: {
    speaker: '夏 扑 萤',
    text: () => `“.......”\n夏扑萤呆愣愣地看着你递过来的“烤鱼”，瞪大了眼。\n“${brotherSister()}！这怎么看都不像是能吃的东西吧！”\n“再烤，再烤一次嘛！我相信你一定可以的！${callName()}最棒了！爱你！”\n她摆出可怜兮兮的表情，央求着你再烤一次，看来是没办法用烤糊的鱼蒙混过关了。`,
    options: []
  },
  fishHalf: {
    speaker: '夏 扑 萤',
    text: () => `“........”\n“${brotherSister()}，虽然我很想说半焦也别有一般风味啦.....但是你真的忍心让可爱的妹妹吃这个吗？”`,
    options: [
      { label: '忍心', next: 'fishHalfEat' },
      { label: '不忍心', next: 'fishHalfRetry' }
    ]
  },
  fishHalfEat: {
    speaker: '夏 扑 萤',
    consumeFish: true,
    triggersLuoying: true,
    finishFishReview: true,
    text: () => `“唔....好吧。”\n虽然有些不开心，但她还是乖巧地咬了一口，随即三下五除二地吃进了肚子里去。\n“嗯——比想象的味道要好些，其实还不错？嘿嘿~”\n她朝你露出笑容，你一时之间分不清究竟是真心的还是在安慰你。`,
    options: []
  },
  fishHalfRetry: {
    speaker: '夏 扑 萤',
    text: () => `你决定再努力一下，见状，夏扑萤高兴地挥起拳头给你打气。\n“${callName()}加油！”`,
    options: []
  },
  fishCooked: {
    speaker: '夏 扑 萤',
    consumeFish: true,
    bondGain: 10,
    text: () => `“哇哦！”\n夏扑萤双臂大张，发出夸张的欢呼声。\n“我就知道${callName()}你一定可以的！${callName()}最棒了！”\n她兴高采烈地接过你递来的烤鱼，狼吞虎咽起来，丝毫没有顾及形象的打算。\n“好吃！好吃！${brotherSister()}，你手艺这么好，要不我们以后去开烤鱼摊子吧！你负责烤鱼，我在旁边给你扇风和收银子！”`,
    options: [
      { label: '好啊', next: 'fishCookedAgree' },
      { label: '才不要', next: 'fishCookedRefuse' }
    ]
  },
  fishCookedAgree: {
    speaker: '夏 扑 萤',
    text: () => `“嘿嘿~那就说好啦~”\n听见你的回答，她露出心满意足的笑容。`,
    options: [
      { label: '（继续）', next: 'fishCookedCommon' }
    ]
  },
  fishCookedRefuse: {
    speaker: '夏 扑 萤',
    text: () => `“诶——为什么啦，答应我嘛，答应我嘛~”\n她撒娇似地摇晃起你的手。`,
    options: [
      { label: '（继续）', next: 'fishCookedCommon' }
    ]
  },
  fishCookedCommon: {
    speaker: '夏 扑 萤',
    grantItem: 'chuilunxinwu',
    triggersLuoying: true,
    finishFishReview: true,
    text: () => {
      if (storyFlags.chuilunObtained) {
        return `.....\n你闭眼歇息起来。\n夏扑萤挪动屁股，靠到你的身侧，酣然入睡。\n你们就这样依偎在江边，恰有春风拂面，好不惬意。`;
      }
      return `.....\n“啊！对了！”\n忽然，夏扑萤像是想起了什么，在怀中摩挲起来，取出一本小册子。\n“${brotherSister()}，这个给你。”\n你取过来一看，上书《垂纶心悟》四字，却不知是何人所著。\n“在路上捡到的。”\n夏扑萤耸了耸肩，她总是能捡到些莫名其妙的东西，偏偏还找不到失主。\n你翻开看了几眼，内容似乎是些钓鱼的心得。\n说不定有用，你便将之收入怀中。\n见状，夏扑萤狡黠地眨了眨眼。\n“${callName()}，我待你这般好，你以后可得千倍万倍地返还于我，便是知恩图报了~”\n你没有与她的歪理争辩，闭眼歇息起来。\n夏扑萤挪动屁股，靠到你的身侧，酣然入睡。\n你们就这样依偎在江边，恰有春风拂面，好不惬意。`;
    },
    options: []
  },

  luoyingStart: {
    speaker: '夏 扑 萤',
    text: () => `“${brotherSister()}，对岸的桃花......”\n夏扑萤露出诧异的表情，摇晃着你的身子。\n“李先生说过，如果桃花飘落就说明有人在试图破阵.......”\n“有坏人想闯进赵家村！”\n她口中的李先生，便是你们村子里的教书先生——李乾元。对他的事你知之甚少，只知道他自打三年前来到赵家村后便在这里定居了下来，村民的武功大多是由他所授，而这桃花阵也是他亲自布下的。\n桃花阵乃迷踪之阵，对渺渺众生大多无用，却能将那些命数颇重之人阻之门外。`,
    options: [
      { label: '哈哈，他不是吹嘘说这阵法天下无人可破吗？', next: 'luoyingJoke' },
      { label: '哦，那咋了。', next: 'luoyingCalm' },
      { label: '....快回去通知李先生！', next: 'luoyingUrgent' }
    ]
  },
  luoyingJoke: {
    speaker: '夏 扑 萤',
    text: () => `“哈哈哈~不对不对，${brotherSister()}！这不是重点吧喂！”\n“总之我们快回去告诉李先生吧！”`,
    options: [
      { label: '赶 路', next: 'rushStart', scene: true }
    ]
  },
  luoyingCalm: {
    speaker: '夏 扑 萤',
    text: () => `“.....”\n她呆呆地看着你，似乎不知道该如何答话。\n半晌后，她没好气地扯起你的脸颊。\n你们又无意义地打闹了一会后，最终决定回去通知李先生一声。`,
    options: [
      { label: '赶 路', next: 'rushStart', scene: true }
    ]
  },
  luoyingUrgent: {
    speaker: '夏 扑 萤',
    text: () => `“嗯，我们快回村子里告诉李先生吧！”`,
    options: [
      { label: '赶 路', next: 'rushStart', scene: true }
    ]
  },
  rushStart: {
    speaker: '夏 扑 萤',
    text: () => `你与夏扑萤飞驰于林木之间，但是没过多久，她便朝你扮起鬼脸，嫌弃你跑得太慢。\n“${brotherSister()}，你别慢吞吞的啦！”\n她学过轻功，而且天赋不俗，此刻正是轻松地领跑在你前面。\n然而你隐隐觉得，比起嫌弃你的速度，她倒更像是别有所图。\n而夏扑萤接下来的提议果真印证了你的猜测。\n“要不，我抱着你跑吧~”\n她一脸坏笑道，眼眸中闪烁着对你会作何反应的期待。`,
    options: [
      { label: '好', next: 'carryAccept' },
      { label: '滚', next: 'carryRefuse' }
    ]
  },
  carryAccept: {
    speaker: '夏 扑 萤',
    text: () => `“诶？”\n她愣住了，没想到你会答应得这么痛快。\n不过既然你应下了，她也没有甩手不干的打算，于是停在你的身后，一把将你揽腰抱起。\n“嘿嘿~走吧！”\n她脚下一踏，飞掠向前。\n遍途草木花莺，尽皆在你眼前闪过。\n明明多了个人的重量，她的速度却丝毫未减，脚步反似更轻盈了几分。`,
    options: [
      { label: '（继续）', next: 'carryInsight' }
    ]
  },
  carryRefuse: {
    speaker: '夏 扑 萤',
    text: () => `“诶诶诶？！！”\n她停下脚步，可怜巴巴地看着你。\n“干嘛说这么让人伤心的话.....”\n“来嘛，来嘛，就试一次！”\n夏扑萤绕到你身后，不管三七二十一的就想将你抱起来。`,
    options: [
      { label: '抵抗', next: 'carryResist' },
      { label: '不抵抗', next: 'carryYield' }
    ]
  },
  carryResist: {
    speaker: '夏 扑 萤',
    text: () => `你拼命地抵抗着，见你不肯妥协，夏扑萤只好作罢。\n她不高兴地鼓起脸颊，瞪了你一眼后就自己跑走了。\n虽然眼下生你的气，但是你知道过上一会，她又会变得像个没事人一样了。`,
    options: [
      { label: '（继续）', next: 'walkInsight' }
    ]
  },
  carryYield: {
    speaker: '夏 扑 萤',
    text: () => `你最终还是决定纵容她这一次，便不再抵抗，任由她将自己抱起。\n“嘿嘿~走吧！”\n她脚下一踏，飞掠向前。\n遍途草木花莺，尽皆在你眼前闪过。\n明明多了个人的重量，她的速度却丝毫未减，脚步反似更轻盈了几分。`,
    options: [
      { label: '（继续）', next: 'carryInsight' }
    ]
  },
  carryInsight: {
    speaker: '夏 扑 萤',
    grantQingyuan: { exp: 1000, bond: 30 },
    text: () => storyFlags.qingyuanAlreadyKnown
      ? `你任由她抱着，却是忽然心有所悟，只觉她之步法、呼吸，尽皆印入你的脑海之中。\n（青鸢飞纵获得2000经验）`
      : `你任由她抱着，却是忽然心有所悟，只觉她之步法、呼吸，尽皆印入你的脑海之中。\n（领悟了青鸢飞纵）\n（青鸢飞纵获得1000经验）`,
    options: []
  },
  walkInsight: {
    speaker: '夏 扑 萤',
    grantQingyuan: { exp: 0, bond: 0 },
    text: () => `.....\n夏扑萤的身影消失在林间后，你回忆着她的步法，不断调整自己的步法，速度逐渐快上几分。\n（领悟了青鸢飞纵）`,
    options: []
  },

  npcTiezhu: {
    speaker: '赵 铁 柱',
    text: () => fillPlayerName(NPC_DEFS.zhaoTiezhu.greeting),
    options: [
      { label: '聊天', next: 'npcTiezhuChat' },
      { label: '切磋', action: 'spar', npc: 'zhaoTiezhu' },
      { label: '道别', next: 'farewellTiezhu', hide: () => !storyFlags.departUnlocked || !!storyFlags.farewellTiezhu },
      { label: '离开', action: 'leave' }
    ]
  },
  npcTiezhuChat: {
    speaker: '赵 铁 柱',
    waitClick: true,
    text: () => fillPlayerName(NPC_DEFS.zhaoTiezhu.chat.join('\n')),
    options: []
  },
  npcShip: {
    speaker: '赵 十 二',
    text: () => fillPlayerName(NPC_DEFS.zhaoShip.greeting),
    options: [
      { label: '聊天', next: 'npcShipChat' },
      { label: '切磋', action: 'spar', npc: 'zhaoShip' },
      { label: '道别', next: 'farewellShip', hide: () => !storyFlags.departUnlocked || !!storyFlags.farewellShip },
      { label: '离开', action: 'leave' }
    ]
  },
  npcShipChat: {
    speaker: '赵 十 二',
    waitClick: true,
    text: () => fillPlayerName(NPC_DEFS.zhaoShip.chat.join('\n')),
    options: []
  },

  npcDaifu: {
    speaker: '赵 大 夫',
    text: () => `“呵呵.....是铁柱家的孩子啊。”\n躺在摇椅上的老人看见你来后，露出了和蔼的笑容。\n“怎么啦？找爷爷有什么事？”`,
    options: [
      { label: '聊天', next: 'npcDaifuChat' },
      { label: '切磋', action: 'spar', npc: 'zhaoDaifu' },
      { label: '请教医术', action: 'teachMedicine', hide: () => getMedicineLessonCount() >= 10 },
      { label: '道别', next: 'farewellDaifu', hide: () => !storyFlags.departUnlocked || !!storyFlags.farewellDaifu },
      { label: '离开', action: 'leave' }
    ]
  },
  npcDaifuChat: {
    speaker: '赵 大 夫',
    waitClick: true,
    text: () => `“唔.....”\n老人忽然摸起胡子，眉头微微皱起。\n“不知是不是岁数到了，最近......怎的总感觉这赵家村要变天呢.....”\n“唉....风雨欲来，风雨欲来啊......”\n他摇了摇头，不再言语。`,
    options: []
  },
  npcDaifuTeachFirst: {
    speaker: '赵 大 夫',
    waitClick: true,
    text: () => `“学医？”\n老人有些讶异，随即笑呵呵地点头道。\n“好呀，好呀，既然你有心要学，我便教你。”\n老人明明已经上了年岁，手脚却没有丝毫不便的样子，他领着你走进医馆，从辨药、切脉讲到针法，不知不觉间，竟已是日薄西山。\n医术的修行不在一朝一夕之间，纵使你天资过人，一天下来也就学到了些皮毛而已。\n（你的医术提升了5点）\n（你学会了活脉养络法）\n（活脉养络法经验 +${lastMedicineLessonExp}）\n（之后可以找赵大夫学习医术了）`,
    options: []
  },
  npcDaifuTeachRepeat: {
    speaker: '赵 大 夫',
    waitClick: true,
    text: () => `“${playerChildName()}儿来啦，今天我们学.....”\n老人笑意盈盈地看着你，他一生未娶，一直以来都将你视若亲孙般疼爱。\n如今向你传授起自己的毕生所学，亦是毫无保留。\n（你的医术提升了5点）\n（活脉养络法经验 +${lastMedicineLessonExp}）`,
    options: []
  },
  npcDaifuTeachTenth: {
    speaker: '赵 大 夫',
    waitClick: true,
    text: () => `“${playerChildName()}儿来啦，今天我们学.....”\n老人笑意盈盈地看着你，他一生未娶，一直以来都将你视若亲孙般疼爱。\n如今向你传授起自己的毕生所学，亦是毫无保留。\n（你的医术提升了5点）\n（活脉养络法经验 +${lastMedicineLessonExp}）\n积小流以成江海，赵大夫的毕生所学，你已尽数掌握。\n你学会了特技：金针渡穴`,
    options: []
  },

  npcShutong: {
    speaker: '书 童',
    text: () => `“......那个，你们看着我干什么？”\n他怯生生地缩了缩身子，心里有种不祥的预感。`,
    options: [
      { label: '对上视线就要战斗', action: 'spar', npc: 'shutong' },
      { label: '道别', next: 'farewellShutong', hide: () => !storyFlags.departUnlocked || !!storyFlags.farewellShutong },
      { label: '离开', action: 'leave' }
    ]
  },

  lqStart: {
    speaker: '李 乾 元',
    text: () => `你们来到时，李乾元正坐在院子里茗茶。
瞧见你们，他先是露出微笑，随即便察觉到你们不自然的神情，疑惑道。
“怎么了，发生什么事了吗？”
你们将后山的事一一道来。
听罢，李乾元的脸色变得十分凝重。
“.....终于还是来了。”
他缓缓起身，有些不安地来回踟蹰。
“却不知来的是谁，若是那几位护法，我还有办法应付......可若是那位大人......”
你与夏扑萤对视一眼，面面相觑，不知道李乾元在说什么。
“李先生，你把话说清楚些会死吗？”
夏扑萤不满道。
“咳咳.....”
闻言，李乾元有些尴尬地咳嗽了两声。
“这事却不是三言两语说得清的，何况你们尚且年幼，我亦不愿将你们牵扯进来.....”`,
    options: [
      { label: '李先生，自你暂居于赵家村起，这事便已将全村人牵扯进来了', next: 'lqRespond' }
    ]
  },
  lqRespond: {
    speaker: '李 乾 元',
    text: () => `“......”
李乾元的脸上闪过一丝黯然。
“你说得对。我本以为......不，事到如今再说这些却是无用。”
“不过你们也不必担心，莲教的人还不至于对手无寸铁的百姓出手。”`,
    options: [
      { label: '莲教？', next: 'lqLianjiao' },
      { label: '都怪你', next: 'lqBlame' }
    ]
  },
  lqBlame: {
    speaker: '李 乾 元',
    text: () => `“.......”
他一脸惭愧，不敢看你的眼睛。
“在下无言可辩。”`,
    options: [
      { label: '莲教？', next: 'lqLianjiao' }
    ]
  },
  lqLianjiao: {
    speaker: '李 乾 元',
    text: () => `李乾元点了点头，解释道。
“你们深居山中，却是不晓村外之事。”
“莲教，既是打着救世济民旗号之义军，亦是朝廷明令剿灭的邪教。”
“究竟是义军，还是邪教.....却不是区区在下分辨得清的了。”`,
    options: [
      { label: '听先生的意思，似乎更偏向前者？', next: 'lqFormer' }
    ]
  },
  lqFormer: {
    speaker: '李 乾 元',
    text: () => `“这....或许确是如此。”
他叹了口气，其中似乎还有许多隐情。`,
    options: [
      { label: '莲教为什么盯上你？', next: 'lqWhy' }
    ]
  },
  lqWhy: {
    speaker: '李 乾 元',
    waitClick: true,
    setFlag: 'liQianyuanTalked',
    text: () => `“这......”
他一脸尴尬，似乎不愿提及此事。
见状，还没等你开口，夏扑萤就挥着拳头不满道。
“我${brotherSister()}问你话呢！别以为我们是小孩就可以蒙混过去！快说！不然的话.....”
她努力摆出恶狠狠的表情，虽然看上去有些笨拙，但村里人都知道这小妮子的威胁从来不是嘴上说说而已，对此李乾元自然也再清楚不过。
“咳咳.....我实是不愿将你们卷入进来，若是听了，你们便不再是对此事不知情的无辜村民了。”
他叹了口气，无奈道。
“既然如此.....若是你们能胜过我半成功力，我便告诉你们，如何？”
听到要打架，夏扑萤立刻便退到了你的身后。
李乾元笑了笑，接着道。
“不用着急，即使是莲教首领亲自出马，我那桃花阵没有一个月的功夫也破不开来，这一个月里，在下随时恭候。”
（可以跟李乾元切磋了）`,
    options: []
  },
  lqAfterWin: {
    speaker: '李 乾 元',
    text: () => `“难以置信....我所传于村民的，不过是些粗浅武功，而你习武不过数月，却已能胜过我半成功力。”
李乾元收功纳气，一脸感慨地摇了摇头。
“闻所未闻，闻所未闻啊！”
一旁的夏扑萤见他光顾着感慨，便立刻不满地打断道。
“李！先！生！你现在总该告诉我们了吧！那个什么教，到底为什么要找你？”
“这.....”
李乾元面露为难之色，盯着你们看了许久，终于下定决心。
“也罢，或许这便是冥冥之中的定数吧。”
他喃喃自语着，从怀中取出一个檀木盒子，装饰华美，看上去颇有几分贵气。
“这是公孙家特制的机关木盒，如果不用特定的手法打开，里面的东西就会被立刻粉碎。公孙家造出来的东西什么都好，就是非得弄成漂漂亮亮的，过于高调.......”
眼看他又要唠叨个不停，夏扑萤没好气地朝他脑门处丢了个石子。
有浩然气护体，这点攻击自然伤不了李乾元分毫，他尴尬地停止了讲解，转而用奇妙的手法在木盒上时而轻抚，时而敲击，最后只听咔哒一声，李乾元挪开盒盖，将里面的东西取了出来——竟是一副山水画。
这幅画的构图很奇特，视角是从高处俯瞰，画面的主体却是山水之间的小人，笔触细致入微，每个小人只有豆粒大小，身上的衣装打扮却清晰可辨，而这幅画中，更是有着数以千记这样的小人。
即使你不通丹青，亦能看出此画之不俗。
但是，夏扑萤显然对这个结果并不满意。
“什么啊！不就是幅破画吗？”
她伸出手指，撇着嘴就想去戳，李乾元吓了一跳，赶忙拿着画避开，解释道。
“你们可还记得裴清晏？我曾经跟你们提到过的。”
提到裴清晏，李乾元的脸上罕见地流露出了几分崇敬之色。
“此人才艺无双，琴棋书画俱臻妙境，又以艺入武，自创曲书画三绝，在二十年前的落雁山之战中诛杀莲教首领墨念卿，救武林于水火之中，堪称一代传奇......咳咳，扯远了。”
“总而言之，这幅画乃是他离世前所绘的遗作，传闻其中便记录着三绝之一的'画'。”
闻言，夏扑萤凑近了些，好奇地打量起那副山水画。
“啊——？真的假的，完全看不出来诶？真的有人学会过吗？”
李乾元愣了一下，随即有些尴尬地说道。
“这.....我也是受一位前辈所托，保管这幅画。至于是不是真的有人从中学会过.....我确实未曾亲眼目睹，不敢妄语。”`,
    options: [
      { label: '确实是真的', next: 'lqAfterWinAck' }
    ]
  },

  lqAfterWinAck: {
    speaker: '夏 扑 萤',
    text: () => `“诶？”
见你忽然如此笃定，夏扑萤有些不明所以地眨了眨眼。`,
    options: [
      { label: '因为我已经学会了', next: 'lqAfterWinEnd', onSelect: () => learnXuanlan() }
    ]
  },

  lqAfterWinEnd: {
    speaker: '旁 白',
    text: () => `“........”
“........”
你转身走出屋内，只留下石化的二人呆呆地看着你的背影。`,
    options: []
  },

  homeXuanlanIntro: {
    speaker: '旁 白',
    text: () => `离开书院之前，李乾元特意叮嘱你，无论是不是真的学会了玄览通微，都不要再提起此事。\n身怀此技，必遭人觊觎。\n无论是为了保护自己，还是保护身边的人，都不能将此事道出。`,
    options: [
      { label: '（继续）', next: 'homeXuanlanAsk' }
    ]
  },
  homeXuanlanAsk: {
    speaker: '夏 扑 萤',
    text: () => `“${brotherSister()}，你说你学会了那个什么玄览通微，到底是不是真的呀？”\n一回到家，夏扑萤就扑闪着大眼睛，一脸好奇地仰头看向你。`,
    options: [
      { label: '真的', next: 'homeXuanlanTrue' },
      { label: '假的，我开玩笑的', next: 'homeXuanlanFalse' }
    ]
  },
  homeXuanlanTrue: {
    speaker: '夏 扑 萤',
    text: () => `“果然是真的啊......”\n听到你的回答，她却好似并不惊讶。\n她忽然停下脚步，望向院中那颗老槐树。\n你还记得，小时候你经常带着她在树荫下嬉戏。\n不知何时起，那样的日常却是不再有了。\n夏扑萤看了许久，待到一阵秋风拂过，吹动着枝丫摇摇晃晃，她才缓缓开口。\n“......${brotherSister()}，你会一直留在我身边的，对吗？”`,
    options: [
      { label: '嗯', next: 'homeXuanlanTrueYes' },
      { label: '.......', next: 'homeXuanlanTrueSilent' },
      { label: '你总要独立的', next: 'homeXuanlanTrueIndependent' }
    ]
  },
  homeXuanlanTrueYes: {
    speaker: '夏 扑 萤',
    bondDelta: 30,
    finishHomeTalk: true,
    text: () => `“什么啊，听起来勉强的很。”\n她有些不满地撇过脸，脸上的喜悦之情却是掩藏不住。\n“.....那就说好了，你得陪我胡闹一辈子才行。我肚子饿了！要去休息！你快做饭给我吃！”\n她提出蛮不讲理的要求，而后开心地向屋内跑去，生怕你逮着她去打下手。\n你也不在意，只要让她自己待上一会，没多时就又会闹着要帮忙的。`,
    options: []
  },
  homeXuanlanTrueSilent: {
    speaker: '夏 扑 萤',
    bondDelta: 5,
    finishHomeTalk: true,
    text: () => `“.........”\n“算啦，不用回答我也可以。”\n“反正我也不想听。”\n她满不在乎地甩甩手，迈步向屋内走去，仿佛什么都没有发生过。`,
    options: []
  },
  homeXuanlanTrueIndependent: {
    speaker: '夏 扑 萤',
    bondDelta: 5,
    finishHomeTalk: true,
    text: () => `听到你的回答后，她沉默了许久。\n就在你以为她不会再开口时，她却忽而说道。\n“....不要。”\n“我是你的妹妹，生来便是要缠着你的！”\n“就是缠着你一辈子，你也只得到阎王爷那里去埋怨，叫它下辈子别再让我做你妹妹。不要我的话，却是怎样也不许对我说！”\n她捂住耳朵，一副我不听我不听的表情，迈腿向屋内跑去。`,
    options: []
  },
  homeXuanlanFalse: {
    speaker: '夏 扑 萤',
    text: () => `“你骗人！”\n她生气地指着你。\n“你只要一撒谎，我就看得出来。”\n“${callName()}变坏了，会跟萤儿撒谎了！你不再宠我了！”`,
    options: [
      { label: '哦', next: 'homeXuanlanFalseOh' },
      { label: '我是担心你受此牵连.......', next: 'homeXuanlanFalseWorry' }
    ]
  },
  homeXuanlanFalseOh: {
    speaker: '夏 扑 萤',
    bondDelta: -20,
    finishHomeTalk: true,
    text: () => `你试图同以往一样，用无所谓的态度敷衍过去。\n但不知为何，这次却没能奏效。\n夏扑萤并没有同你预想的那般，不满地埋怨你。\n她保持着姿势不动，脸上的表情从愤怒转为呆愣，又从呆愣转为失落。\n她缓缓收回了手指。\n“对不起......”\n夏扑萤转过身，低垂着脑袋，一言不发地朝屋内走去。`,
    options: []
  },
  homeXuanlanFalseWorry: {
    speaker: '夏 扑 萤',
    bondDelta: 30,
    finishHomeTalk: true,
    text: () => `“.......”\n听到你情真意切的言语，夏扑萤愣住了。\n片刻之后，她忽然钻进了你的怀里，一脸幸福地将脸蛋在你的胸口处蹭来蹭去。\n比起你究竟会不会玄览通微这件事，她更在乎你会不会同以往一样对她好。\n如今，她已经得到了想要的答案，比什么时候都安心。\n许久之后，她退后半步，任性道。\n“.....我肚子饿了！要去休息！你快做饭给我吃！”\n言罢，她开心地向屋内跑去，生怕你逮着她去打下手。\n你也不在意，只要让她自己待上一会，没多时就又会闹着要帮忙的。`,
    options: []
  },

  /* ================= 不速之客 · 裴文秀 ================= */
  peiArrive: {
    speaker: '裴 文 秀',
    text: () => `“没想到你当真学会了玄览通微.......”
你循声回望，言者一袭青衫、天水碧绿，年纪与你相仿，神情恬淡，近在眼前，却又似在天边。
“.....失礼了，初次见面，小女子裴文秀，见过兄长。”
她微微颔首，言语之间透露着不同寻常的亲昵。
“......”
也许是猜到了你的心中所想，她忽然莞尔一笑。
“兄长多虑了，文秀只是以礼相称而已，你我之间并无什么特别的关系。”`,
    options: [
      { label: '你就是那个破阵的人？', next: 'peiAnswerBreak', hide: () => !!storyFlags.peiAskedBreak },
      { label: '你是莲教的人？', next: 'peiAnswerLotus', hide: () => !!storyFlags.peiAskedLotus },
      {
        label: '懒得废话，先揍她一顿',
        action: 'peiSpar',
        hide: () => !!(storyFlags.peiAskedBreak && storyFlags.peiAskedLotus)
      },
      {
        label: '你为何破阵，又为何出现在这里',
        next: 'peiWhyHere',
        hide: () => !(storyFlags.peiAskedBreak && storyFlags.peiAskedLotus)
      }
    ]
  },
  peiAnswerBreak: {
    speaker: '裴 文 秀',
    setFlag: 'peiAskedBreak',
    nextOnClick: 'peiChoice',
    text: () => `“是，也不是。”
裴文秀垂着眼眸，面露歉意。
“.....文秀确实行了破阵之事，打搅了兄长与村民的安宁生活，对此......无可辩驳。”`,
    options: []
  },
  peiAnswerLotus: {
    speaker: '裴 文 秀',
    setFlag: 'peiAskedLotus',
    nextOnClick: 'peiChoice',
    text: () => `“兄长误会了。”
裴文秀摇了摇头，解释道。
“文秀与莲教纠葛颇多，却并非莲教之人。确切的说，莲教.....是文秀的敌人。”`,
    options: []
  },
  peiChoice: {
    speaker: '裴 文 秀',
    text: () => `“.......”`,
    options: [
      { label: '你就是那个破阵的人？', next: 'peiAnswerBreak', hide: () => !!storyFlags.peiAskedBreak },
      { label: '你是莲教的人？', next: 'peiAnswerLotus', hide: () => !!storyFlags.peiAskedLotus },
      {
        label: '懒得废话，先揍她一顿',
        action: 'peiSpar',
        hide: () => !!(storyFlags.peiAskedBreak && storyFlags.peiAskedLotus)
      },
      {
        label: '你为何破阵，又为何出现在这里',
        next: 'peiWhyHere',
        hide: () => !(storyFlags.peiAskedBreak && storyFlags.peiAskedLotus)
      }
    ]
  },
  peiSparLose: {
    speaker: '旁 白',
    text: () => `剑尖悬于你的眉心之上，却没有刺下。
她缓缓收剑，朝你一揖。
“兄长，多有得罪，还请海涵。”`,
    options: [
      { label: '你就是那个破阵的人？', next: 'peiAnswerBreak', hide: () => !!storyFlags.peiAskedBreak },
      { label: '你是莲教的人？', next: 'peiAnswerLotus', hide: () => !!storyFlags.peiAskedLotus }
    ]
  },
  peiSparWin: {
    speaker: '裴 文 秀',
    peiBondDelta: 30,
    peiBondFlag: 'peiSparWinBond',
    text: () => `“.....好厉害。”
她愣了愣，似乎没想到自己会败。
不过她也并未因此气恼，莞尔一笑，柔声道。
“爷爷说过，天外有天，人外有人，果真如此。”
“兄长之武艺、气量，令文秀钦佩不已。”
她认真朝你作揖，眼中多了几许崇拜。
（裴文秀羁绊 +30）`,
    options: [
      { label: '你就是那个破阵的人？', next: 'peiAnswerBreak', hide: () => !!storyFlags.peiAskedBreak },
      { label: '你是莲教的人？', next: 'peiAnswerLotus', hide: () => !!storyFlags.peiAskedLotus }
    ]
  },
  peiWhyHere: {
    speaker: '裴 文 秀',
    text: () => `“嗯.....文秀此来，本是欲助乾元先生度过此难。”
她沉吟片刻，缓缓道。
“然而玄览通微重见天日之事，却是在文秀意料之外。”
“此事非同寻常，牵扯甚多。”
“莲教主人通晓术理，偏偏挑在这个时候来到赵家村，或许........”
裴文秀顿了顿，清秀的眉宇之间闪过浓浓忧色。
“山雨欲来，无人能够独善其身。”
她叹了口气，随即看向你，认真道。
“兄长，你可愿随文秀一同离开？倘若继续留在此地，兄长恐遭大劫。”
“乾元先生算错了，他以为只要你不说，就一直是个无关之人。”
“可若是莲教此来的目的并非他李乾元，而是你${player.surname}${player.givenName}呢？”`,
    options: [
      {
        label: '留在赵家村',
        next: 'peiAttackStart',
        onSelect: () => gainXiaStoryBond(50)
      },
      {
        label: '和她一起离开',
        next: 'peiAttackStart',
        onSelect: () => gainPeiStoryBond(30, 'peiLeaveBond')
      }
    ]
  },
  peiAttackStart: {
    speaker: '旁 白',
    text: () => `你的话语还没来得及说出口，只听一声笛响，悠扬的曲声回荡于木舍之间。
“糟了。”
裴文秀面色凝重，一把将你护在身后。
“莲教的人来了。”
话音刚落，一群白衣覆面的怪人从四面八方窜出，将你们包围。
这群怪人身形各异，有的高大魁梧，有的却是短小如鼠，或站或蹲，身形却是一动不动，透露着说不出来的诡异。
“终日看山不厌山，买山终待老山间......文秀姑娘，你出现在这里，可是也生了退隐山林的心思么？”
人群中传来少年慵懒的声音，语调平缓，似叹似问。
他迈步而出，襕衫道冠，看上去怪异之至，手中折扇焦躁地摇着，眼神却是沉寂如渊。
少年看了看裴文秀，又看向她身后的你，目光在你身上停留了许久，似乎是在确认什么。
片刻之后，他将手中的折扇啪嗒一声收起，对着你恭恭谨谨地行了一礼。
“莲教法幢护法——孟清秋，见过大人。”
还没等你有何反应，裴文秀却是皱眉道。
“.......大人？你们又想玩什么把戏？”
孟清秋微微一笑，解释道。
“大人，大人，意思便是你身后这位${player.surname}${player.gender === '女' ? '姑娘' : '公子'}，地位要比我尊贵的多了。”
“你不会想说，这次是来请${player.gender === '女' ? '她' : '他'}回去当教主的吧？”
裴文秀面露讥讽之色，忽地拔剑出鞘，横剑身前。
“莲教的肮脏伎俩我见多了，表面一套，背后一套，尤其是你，孟清秋。我绝不会让你们带走${player.gender === '女' ? '她' : '他'}。”
“就凭你们这些人，绝非我的对手！”
她身上忽地爆发出一股惊人威压，袖口大鼓，罡气朝四周席卷而去，所过之处，沙飞土扬，气势比之与你相斗之时，犹有过之而无不及。
“寻死者，上前一步便是！”
那些白衣怪人再也不能维持一动不动的身姿，开始剧烈颤抖起来，好几个内力不佳的甚至直接趴倒在了地上。
孟清秋虽然不至于那么狼狈，却也是面露苦涩，只能勉强支撑着身子不至于倾倒。
唯有你，那股骇人威压独独在经过你时，刻意放轻了脚步，小心翼翼地绕开了你。
“咳咳......过分了啊，文秀姑娘，我们也算是旧识，拜托给我留点面子......”
孟清秋的嘴角缓缓溢出鲜血，身体不停地打着颤，嘴上却是一刻不停，看起来却是滑稽至极。
裴文秀却是不理他，接着朗声道。
“我数三声，再不退下，就只有死路一条！”
“三！”
“二！”
最后一声倒数还没响起，孟清秋猛然抬起手，示意众人撤退。
随着他的动作，还能站起来的莲教弟子们便赶忙扶着周边的同伴向后撤去。
“还有你，孟清秋，还不滚是想死吗？！”
“靠！你看我像是走得动的样子吗！你还讲不讲道理！”
就在你松了一口气时，却忽然察觉到一丝异样。
——笛声，悠扬不断。
极其不妙的预感在你的脑海中迸发开来。
“${brotherSister()}！”
而印证了这股预感的，便是从身后传来的呼唤与脚步声。
裴文秀的身子一滞，由于玄览通微的奇妙功效，你能感觉到她的呼吸节奏陡然一变，短促而充满不安。
你循声回头，却见一人领着你的妹妹缓步而来。
夏扑萤瞧见你，赶忙哭哭啼啼地跑了过来。
你心中一紧，那人却是丝毫未作阻拦，自顾自地吹着笛子。
夏扑萤平安地扑入你的怀中，你这才有功夫打量起来人。
只见他一袭紫衣，衣摆长得在地面上铺展开来，却丝毫没有因为行走而变得凌乱。
衣襟大开，颈上长发却是打理得一丝不苟，用发髻轻巧盘起。
那张脸，未施粉黛、俊美异常，却又有着说不出的俏丽可爱，让人辨不清性别。
一曲奏罢，他缓缓睁开眼睛，视线越过几人，直直地停留在你身上，视线轻柔。
“在下天残，斗胆一问阁下名讳。”`,
    options: [
      { label: '报上姓名', next: 'peiNameCommon' },
      { label: '沉默不语', next: 'peiNameCommon' }
    ]
  },
  peiNameCommon: {
    speaker: '天 残',
    text: () => `“是也，是也，原来是${player.zi || player.givenName}兄。”
你未曾告知其表字，却不知其从何得知。
他喃喃一笑，闭目把玩起手中的一串佛珠。
“不知${player.zi || player.givenName}兄意欲何为，欲往何处？”`,
    options: [
      { label: '.......', next: 'peiIntentCommon' },
      { label: '什么意思？', next: 'peiIntentCommon' }
    ]
  },
  peiIntentCommon: {
    speaker: '天 残',
    text: () => `“是也，是也........”
你没有回答，他却好似已经得到了答案，面露满意之色。
“天残！你别装神弄鬼的！”
裴文秀不满地瞪起眼睛，挡在你身前，你察觉到她原本还微微颤抖着的身子，忽然再无动摇。
“裴文秀，我跟${player.zi || player.givenName}兄聊天，却与你何干。”
“与我何干？凡是你莲教的事，我裴文秀都要管上一管！”
“喔.....却不知我们莲教哪里得罪了你？”
“哼，谋财害命，鱼肉百姓，串通倭匪，暗害各派掌门.....莲教为了你那肮脏的野心，所做的一桩桩祸事，罄竹难书！你还有脸问哪里得罪了我？”
“哎呀呀......”
天残挑了挑眉，脸上笑意更甚。
“好大的帽子，这所谓的鱼肉百姓、串通倭匪，我莲教却是不敢认下的。至于其他的.....倒也确属事实。”
裴文秀还想再说些什么，天残却没有理她，而是忽地看向你，微笑道。
“${player.zi || player.givenName}兄，可愿入我莲教？从今往后，你我二人平起平坐，若是你有意，我也可以辞去教主之位，转让给你。”
“只要你同意，我等便会助你集齐剩余的'曲''书'二绝，不择手段。”
“届时，你便是这世间第一人，天地之大，却是再无你不能去得的地方啦。”
这份诱惑可谓是肤浅至极，任谁都会感觉其中有诈。
但是，你心中却隐隐有一股感觉。
——他并未说谎。`,
    options: [
      { label: '拒绝', next: 'peiRefuse' }
    ]
  },
  peiRefuse: {
    speaker: '天 残',
    battleOnNext: 'whiteRobe',
    text: () => `“是也，是也，看来你我确非一路人。”
你断然拒绝，他却似乎早有预料一般点了点头。
“既然如此......”
他忽地睁开眼睛，周围原本已经退去的白衣怪人们忽然群起而攻之！`,
    options: []
  },
  baiYiVictory: {
    speaker: '旁 白',
    finishPeiStory: true,
    text: () => `“......”
天残看着地上七零八落的白衣怪人，陷入沉思。
“确是，杀你不得.......”
与他相斗的裴文秀气喘吁吁，他却气息平稳，似乎尚未使出全力。
他忽然长叹一口气，缓缓道。
“清秋，我们走吧。”
“.......”
闻言，一直在旁边观战的孟清秋眼中闪过几缕哀意，良久之后方才答道。
“是。”
你们和裴文秀眼睁睁地看着他们离去，却是再无余力阻拦。`,
    options: []
  },

  npcLiQianyuan: {
    speaker: '李 乾 元',
    text: () => {
      if (storyFlags.departUnlocked) {
        return storyFlags.farewellLiQianyuan
          ? '“放心去吧，赵家村有我护着。”'
          : '李乾元正站在院中清点书卷，见你到来，微微颔首。';
      }
      return NPC_DEFS.liQianyuan.greeting;
    },
    options: [
      { label: '切磋', action: 'spar', npc: 'liQianyuan', hide: () => !!storyFlags.xuanlanLearned },
      { label: '道别', next: 'farewellLiQianyuan', hide: () => !storyFlags.departUnlocked || !!storyFlags.farewellLiQianyuan },
      { label: '离开', action: 'leave' }
    ]
  },

  /* ================= 白衣怪人战后 · 裴文秀 ================= */
  peiPostStart: {
    speaker: '裴 文 秀',
    text: () => `“兄长，你没事吧？”
裴文秀关切地看着你，从袖口中探出指尖，想要给你把脉。
“慢着——！”
一旁的夏扑萤警觉地扑了过来，挡在你的身前。
“你，你，你谁啊？！”
“突然出现，又装出十分好心的样子，谁知道你是不是心怀鬼胎！”
眼见自己被怀疑，裴文秀也不生气，莞尔道。
“抱歉，是文秀失礼了。”
她收回手，见你气色如常，已知你并无大碍。
“兄长，此间事了，这赵家村....却是不能再待了。”`,
    options: [
      { label: '....为什么？', next: 'peiPostWhy' }
    ]
  },
  peiPostWhy: {
    speaker: '裴 文 秀',
    text: () => `“莲教的人既然已经盯上了你，便会千方百计想要取你性命，兄长若继续留在赵家村，只恐村内永无宁日。”`,
    options: [
      { label: '即使离去，也不代表莲教就不会对村子出手', next: 'peiPostVillageSafe' }
    ]
  },
  peiPostVillageSafe: {
    speaker: '裴 文 秀',
    text: () => `“兄长是担心莲教以村民性命为要挟吗？”
裴文秀微微颔首，随即道。
“有乾元先生在，莲教想要攻入此地也并非易事，只要兄长不在，以天残的性子，想来不会再大动干戈地入侵此地。”
“另外文秀也已经以书信向附近的一位前辈求援了，有那位前辈在，必可保赵家村无虞。”`,
    options: [
      { label: '前辈？', next: 'peiPostSenior' }
    ]
  },
  peiPostSenior: {
    speaker: '裴 文 秀',
    text: () => `“嗯，很厉害的前辈。”
裴文秀笑道。`,
    options: [
      { label: '有多厉害？', next: 'peiPostSeniorLevel' }
    ]
  },
  peiPostSeniorLevel: {
    speaker: '裴 文 秀',
    text: () => `“.....文秀与之相比，却如萤火逐月。”
裴文秀的表情有些复杂，其中既有崇敬，却也有几分愧色。`,
    options: [
      { label: '离开这里，又该往何处呢', next: 'peiPostDestination' }
    ]
  },
  peiPostDestination: {
    speaker: '裴 文 秀',
    text: () => `“京城。”
似乎早就准备好了答案，裴文秀脱口而出。
“三绝中的'书’便在京城，若能得到它，兄长的武功定然能够更上一层楼。”
“若能集齐三绝，即使是天残也.......”`,
    options: [
      { label: '原来你的目的是想让我去对付天残', next: 'peiPostPurpose' }
    ]
  },
  peiPostPurpose: {
    speaker: '裴 文 秀',
    text: () => `“........确是如此。”
目的被揭穿，裴文秀的脸上泛起几抹羞红，乖巧道。
“文秀并非有意隐瞒，对不起.......”
你还没说话，夏扑萤便气冲冲地捏起了裴文秀的脸。
“哈？！你在说什么傻话！竟然要我${callName()}去跟那个变态打！凭什么！”
裴文秀也不反抗，任由她捏着脸，自顾自地道。
“唔唔......兄长你命数非凡，即使一心想要避世不出，像今天这样的麻烦也会一直接连不断地找上门来的。”
“文秀，文秀会帮助兄长的，只要兄长答应，文秀定会倾尽全力帮助兄长的，求求你了嘛.....痛！”
裴文秀扑打着手，在夏扑萤的魔掌下挣扎。`,
    options: [
      { label: '答应她', next: 'peiPostAgree' }
    ]
  },
  peiPostAgree: {
    speaker: '裴 文 秀',
    finishPeiPostTalk: true,
    text: () => `听见你答应，裴文秀立即喜笑颜开，只是这幅表情在那被扯来扯去的脸蛋上显得有些滑稽。
“嘿嘿，那就这么说定啦。”
眼瞅着夏扑萤又要发难，裴文秀赶忙补充道。
“夏姑娘，你难道不想和兄长一道，四处游山玩水吗？赵家村虽然安逸，日子久了，却也有些平淡乏味吧？”
一语中的，夏扑萤脸上的气愤瞬间消失不见。
她松开手，煞有其事般地围着裴文秀转起圈，沉思起来。
片刻后，她可怜巴巴地投入你的怀中，开口道。
“${brotherSister()}！我们什么时候出发？”
“........”`,
    options: []
  },

  /* ================= 赵家村道别剧情 ================= */
  farewellTiezhu: {
    speaker: '赵 铁 柱',
    farewellEffect: 'tiezhu',
    text: () => `“要走了吗？”
你与他相视无言，片刻后，赵铁柱取出一块玉佩，将其系在你的腰间。
“家里传下来的，可以温养气血。”
他拍了拍你的肩膀，露出微笑。
（根骨 +2，气血恢复 +10）`,
    options: []
  },
  farewellShip: {
    speaker: '赵 十 二',
    farewellEffect: 'ship',
    text: () => `“哎哟，夏扑萤那小祖宗终于要走了？这赵家村总算能清净下来了。”
赵十二乐呵呵的，让你稍等片刻，转身走回屋中取出一壶酒。
“蛇胆酒，泡了两个月，送你了。”
“.....来日方长，没事常回来看看。”
（内力 +30）`,
    options: []
  },
  farewellDaifu: {
    speaker: '赵 大 夫',
    farewellEffect: 'daifu',
    text: () => `“.....”
看见你来了，老人微微一笑，没有提你要离开的事，而是如往常一般跟你讲解起了医术。
${storyFlags.farewellDaifuJinzhen ? '（定力 +1，医术 +20，学会了特技：金针渡穴）' : '（定力 +1，医术 +20）'}`,
    options: [
      { label: '（继续）', next: 'farewellDaifuEnd' }
    ]
  },
  farewellDaifuEnd: {
    speaker: '赵 大 夫',
    text: () => `讲完以后，他才慢悠悠地嘱咐起来。
“此去京城，路途遥远，却是要多加小心。”
“顾好自己，若有余力的话，再帮帮他人，行好事，积善缘。”
他摸了摸你的脑袋。
“去吧。”`,
    options: []
  },
  farewellLiQianyuan: {
    speaker: '李 乾 元',
    farewellEffect: 'liQianyuan',
    text: () => `刚走进书院，你就看见院子里躺倒着好些白衣怪人，一动不动。
看来这里也是莲教袭击的目标之一。
瞧见你来了，李乾元的表情有些尴尬。
“抱歉，莲教来时我没能帮上忙，先前我还跟你说不用担心.....若不是裴姑娘来援，唉，惭愧惭愧.......”
“如今说这些也是于事无补，我便将我对武功的些许见解告知于你，或许能派上些用场吧。”
（悟性 +3，定力 +1）`,
    options: [
      { label: '（继续）', next: 'farewellLiQianyuanEnd' }
    ]
  },
  farewellLiQianyuanEnd: {
    speaker: '李 乾 元',
    text: () => `讲授过后，他接着道。
“放心去吧，我李乾元一定会竭尽全力护住村中百姓。”
“或许再见时，你便已经是天下第一了。”
仿佛是看到了那样的未来，李乾元的脸上流露出几分感慨。`,
    options: []
  },
  farewellShutong: {
    speaker: '书 童',
    farewellEffect: 'shutong',
    text: () => `“.......”
“.......”
“.......”
“干嘛？！你不会还想从我这拿东西吧！”
书童愤愤地看着你。
“我没有东西给你！快走啦！”
你表示不交出好东西就揍他。
“........”
“给你.......”
书童给了你一本武学心得。
（获得：武学心得 ×1）`,
    options: [
      { label: '继续勒索', next: 'farewellShutongExtort' },
      { label: '见好就收', action: 'leave' }
    ]
  },
  farewellShutongExtort: {
    speaker: '书 童',
    farewellEffect: 'shutongExtort',
    text: () => `“........”
见你抬起拳头，书童只好哭着鼻子再给了你一本武学心得。
（获得：武学心得 ×1）`,
    options: []
  },

  /* ================= 马车 ================= */
  carriageXia: {
    speaker: '夏 扑 萤',
    text: () => `“哈哈哈~好好玩~”
夏扑萤趴在车窗边，不顾车夫的劝阻将脑袋探出，朝过路的人挥舞着手中的炊饼。
直到听见你的呼唤，她才乖乖缩回身子。`,
    options: [
      { label: '摸头', next: 'carriageXiaPat' },
      { label: '离开', action: 'leave' }
    ]
  },
  carriageXiaPat: {
    speaker: '夏 扑 萤',
    text: () => `“.....诶？”
你突然摸起她的脑袋，她愣了愣，反应过来后便心满意足地闭上眼睛，蹭起你的手掌。
“嘿嘿~”`,
    options: []
  },
  carriagePei: {
    speaker: '裴 文 秀',
    text: () => `“兄长......”
裴文秀看着你，眼神之中混杂着说不出的意味。
“我欠你的，实在太多........”`,
    options: [
      { label: '为何称我为兄长？', next: 'carriagePeiBrother', hide: () => player.gender !== '女' },
      { label: '询问她的事', next: 'carriagePeiAbout' },
      { label: '询问莲教的事', next: 'carriagePeiLotus' },
      { label: '离开', action: 'leave' }
    ]
  },
  carriagePeiBrother: {
    speaker: '裴 文 秀',
    text: () => `“嗯？”
裴文秀眨了眨眼，嘴角缓缓扬起，露出狡黠的微笑。
“有什么不好吗。”
“姊，女兄也，你既比我年长，我称呼你一声兄长，亦不违礼法。”
“还是说......兄长嫌我愚笨，不肯认我这个妹妹？”
她故作委屈地瞥向它处，看来这称呼你是无论如何都只能认下了。`,
    options: []
  },
  carriagePeiAbout: {
    speaker: '裴 文 秀',
    text: () => `“....我的事？”
裴文秀有些诧异，随即莞尔道。
“是文秀不好，近日思虑苦多，却是忘记向兄长介绍一下自己了。”
“小女子裴文秀，父亲....便是那鼎鼎大名的裴清晏了。”
她的脸上闪过一丝黯然，紧接着便被她很好地隐藏了起来。
“父亲生性固执，能够说动他改变主意的人，便只有我的母亲而已——当年的落雁山之战，也是经过母亲的劝说，他才最终决定出手。”
“父亲一生钟情于诗书风雅，对于除此之外的事物，却是无暇他顾。”
“因此，从小我便跟着爷爷生活。”`,
    options: [
      { label: '你的母亲呢？', next: 'carriagePeiMother' }
    ]
  },
  carriagePeiMother: {
    speaker: '裴 文 秀',
    text: () => `“......母亲她.....最终还是选择陪伴在父亲身边。”
裴文秀露出苦涩的笑容，手指也不由自主地将衣服攥紧了些。
“做一对神仙眷侣，自然也是极好的。”`,
    options: [
      { label: '生而不养，枉为父母', next: 'carriagePeiAboutAngry' },
      { label: '......', next: 'carriagePeiAboutSilent' }
    ]
  },
  carriagePeiAboutAngry: {
    speaker: '裴 文 秀',
    peiBondDelta: 20,
    peiBondFlag: 'carriagePeiAboutBond',
    text: () => `“......”
裴文秀看着你愤愤不平的表情，一时之间有些愣神。
片刻后，她笑着道。
“至少文秀被生下来后，交了许多意气相投的朋友，有一个对我千般万般好的爷爷，还有兄长你......我想我已经比太多人幸运，却是不敢奢求过多。”
（裴文秀羁绊 +20）`,
    options: []
  },
  carriagePeiAboutSilent: {
    speaker: '裴 文 秀',
    text: () => `“算啦，不提这些了，我可不想刚将兄长拐上贼船，就对着你大倒苦水呢。”
她朝你眨了眨眼睛，嘻嘻笑道。`,
    options: []
  },
  carriagePeiLotus: {
    speaker: '裴 文 秀',
    text: () => `“莲教......怎么说呢.......”
裴文秀似是被你的问题难住了，陷入纠结之中。
良久过后，她终于想出了一个能让自己满意的答案，点了点头，认真道。
“莲教就是一群大坏蛋！”
“.......”`,
    options: [
      { label: '怎么个坏法', next: 'carriagePeiLotusEvil' }
    ]
  },
  carriagePeiLotusEvil: {
    speaker: '裴 文 秀',
    text: () => `“莲教声称三五年之间，大宋必遭浩劫，为了挽救国家，必须先统一武林，将正邪各派整合起来，共抗外敌。”
“可如今国家昌盛，政治尚且清明，百姓们也都安居乐业，哪里瞧得出衰退之象？”
“说一千道一万，这些只不过是天残用来遮掩自己野心的幌子罢了，就和他的父亲王天生一样。”
“更别提莲教为了统一武林，用的尽是些见不得人的龌龊手段了。”`,
    options: [
      { label: '王天生？', next: 'carriagePeiWangTiansheng' }
    ]
  },
  carriagePeiWangTiansheng: {
    speaker: '裴 文 秀',
    text: () => `“王天生.....就是二十年前在落雁山上被我父亲枭首的莲教前首领。”
“此人生性洒脱，天赋异禀，又颇具将者之风，若不是死于父亲之手，或许当真给他统一了武林也说不定。”`,
    options: [
      { label: '看来你与莲教确实渊源颇深', next: 'carriagePeiLotusOrigin' }
    ]
  },
  carriagePeiLotusOrigin: {
    speaker: '裴 文 秀',
    peiBondDelta: 10,
    peiBondFlag: 'carriagePeiLotusBond',
    text: () => `“哈哈。”
裴文秀自嘲般地笑了笑。
“文秀不敢欺瞒兄长，自父亲去世、母亲亦随之而去后，便常常有前辈找上门来，请文秀出面组织武林盟，统领各门各派共抗莲教。”
“可文秀哪有那般本事，论艺，文秀弗如父亲远甚，论武.....亦不外如是。”
“父亲留下的三绝，我身为女儿，曾经赏过不下千回，却是丝毫不能领悟.......”
“昔日父亲阵斩王天生，如今我却远不是天残的对手，又有何脸面领导众人。”
她的表情变得落寞，虽然和你们一同挤在这车厢里，那单薄的身形却是显得那么孤独。
一时之间，对于她如此亲昵你的缘由，你似乎有所明悟。
（裴文秀羁绊 +10）`,
    options: []
  }
};
