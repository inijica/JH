# 项目修改指引（AI 优先）

> **先读本文件，再按任务路由只读相关文件。禁止整文件读 `game.js` / `battle.js`。**
> 本文与代码冲突时以代码为准，并提醒用户更新本文。

## 项目形态

原生 HTML/CSS/JS，无构建。所有 `<script>` 按 `index.html` 顺序加载，共享全局作用域。

- 顶层 `function` 挂 `window`；`const/let/class` 不挂，但可跨 script 按标识符访问。
- **不要手写 `window.foo = ...`**。唯一例外：`story.js` 的 `window.DIALOG_TREE`（`story.js` 先于 `game.js` 加载，`game.js` 从 window 取）。
- 脚本在 `<body>` 末尾，DOM 已就绪。

## 加载顺序（硬依赖，勿改）

```text
core.js
items.js
npcs.js
npclogic.js
skills.js
bag.js
fishing.js
cooking.js
farm.js               ← 在 cooking.js 后、training.js 与 game.js 前
training.js
neili.js
story.js
battle-render.js      ← 在 battle.js 前
battle-strategy.js    ← 在 battle.js 前
battle.js
battle-spar.js        ← 在 battle.js 后（否则 battle is not defined）
battle-events.js
dream.js              ← 在 battle-events.js 后、game.js 前；battle.js 软调用其钩子
offline.js
skillcards.js
game.js               ← 启动逻辑必须最后
```

## 文件地图

| 文件 | 关键符号 / 职责 | 何时读 |
|---|---|---|
| core.js | `$`、`showToast`、提示队列、情报日志 | 通用提示/日志 |
| items.js | `FISH_EFFECTS`、`ITEM_DEFS`、`FISH_BASE_WEIGHT`、`COOK_RECIPES` | 鱼/物品/烤鱼 |
| npcs.js | `NPC_DEFS` | NPC 数值/技能 |
| npclogic.js | 切磋冷却、经验、`getNpcStats`、教学冷却 | NPC 逻辑 |
| skills.js | 震山拳/飞石破/泥火/青鸢、总属性、伤害/命中基础 | 玩家武学 |
| bag.js | 背包、物品使用、排序、快照 | 背包 |
| fishing.js | 钓鱼状态、抛竿、结算、鱼重 | 钓鱼 |
| cooking.js | 烹饪状态、配方、品质、完成 | 烹饪 |
| farm.js | 农田 3×3 状态、自动收获续种、技艺「农夫」 | 农田 / 农夫 |
| training.js | 修炼要求、经验、tick、按钮 | 修炼 |
| neili.js | 淬火、活脉、内力速率/显示 | 内力 |
| story.js | `window.DIALOG_TREE` 对话数据 | 对白/选项 |
| battle-render.js | 战斗日志/卡片/血条/面板刷新 | 战斗 UI |
| battle-strategy.js | 策略 UI、低血线决策 | 战斗策略 |
| battle.js | 战斗状态/结算/敌方 AI/引擎 **(大，禁整读)** | 战斗核心 |
| battle-spar.js | `startSpar`、切磋奖励、NPC 敌人构建、`getActiveTrainingSkills` | 切磋 |
| battle-events.js | 李乾元切磋事件（剧情/暂停恢复/书童参战/气滞） | 战斗事件 |
| dream.js | 入梦界面、五狗屠龙阵、连携、首通奖励 | 入梦 |
| offline.js | 离线奖励时间 / 2 倍速时钟 | 离线 / 加速 |
| skillcards.js | 武功/技艺卡片文案与渲染 | 技能卡 |
| game.js | 主流程/角色创建/剧情/羁绊/存档/启动/事件 **(大，禁整读)** | 流程/存档 |

## 任务路由（先查表，别猜）

| 任务 | 文件 |
|---|---|
| 角色属性 | npcs.js |
| 切磋冷却/经验 | npclogic.js |
| 玩家技能倍率/解锁 | skills.js、neili.js |
| 技能卡文案 | skillcards.js |
| 升级经验/修炼速度 | training.js |
| 物品/鱼/烹饪配方 | items.js |
| 农田/农夫 | farm.js |
| 对白/选项 | story.js |
| 对话流程/剧情触发 | game.js |
| 战斗 UI | battle-render.js |
| 战斗策略 | battle-strategy.js |
| 战斗结算/行动 | battle.js |
| 状态效果（截脉/活脉/浩然气/无咎） | battle.js（定义+结算）、battle-spar.js（初始化）、battle-render.js（显示） |
| 切磋入口/奖励 | battle-spar.js |
| 战斗事件/剧情 | battle-events.js |
| 入梦挑战/奖励 | dream.js |
| 离线奖励时间 / 加速 | offline.js |
| 存档/重置/羁绊 | game.js |
| 样式 | style.css（实际文件名以 index.html 为准） |

## 规则

1. **找符号**：`grep -n "符号" file.js`，再 `read` offset/limit（单次 ≤120 行）。禁整读大文件。
2. **新增文件**：新建 `.js` → 在 `index.html` 按依赖插 `<script>` → 更新本文「加载顺序」和「文件地图」。不拆分现有文件、不改加载顺序，除非用户明确要求。
3. **新增顶层符号**：先 `grep -rn "符号名" *.js` 查重；用领域前缀（`battleXxx`、`fishXxx`）；不手写 `window.foo = ...`。
4. **跨文件调用**：靠运行时解析；禁止在脚本顶层调用 `game.js` 里的函数（如 `player`）。
5. **软调用写法**：`typeof fn === 'function' && fn(...)`，不要直接调。
6. **存档变更**：`grep -rn "localStorage" *.js` 确认读写都改。
7. **批量替换 ≥5 处**：先 `grep` 列清单再逐处改，不用 `sed` 盲替。
8. **小改动直接改**，不写额外脚本，不做全量回归。

## 易错点（反直觉的才列）

- `player` 在 `game.js`，其他文件只在函数内访问。
- `getActiveTrainingSkills` 在 `battle-spar.js`，不在 `training.js`。
- `getFishingTechnique`、`getFishingLevel`、`getTotalBlade`、`getTotalComp` 在 `game.js`。
- `neili.js`、`cooking.js`、`training.js` 有顶层 `setInterval`/事件绑定，移动代码注意加载时机。
- 伤害最低为 0（`battle.js` 结算 + `skills.js` 倍率），不要加回 `Math.max(1, ...)`。

## 软调用清单

| 调用方 | 被调方 | 约束 |
|---|---|---|
| battle.js | dream.js：`dreamChainAttackAfter`、`handleDreamWin` | 运行时判存在；dream.js 必须在 battle.js 后、game.js 前 |
| bag.js `renderBag` | `updateHillNpc` | 软调用，勿改硬调用 |

## 提交前自检

- [ ] 只改了路由指向的文件
- [ ] 每个改动 `.js` 跑过 `node --check`
- [ ] 碰了加载顺序/新增文件/软调用/跨文件符号 → 跑过 vm 冒烟
- [ ] 新增顶层符号已 grep 查重
- [ ] 存档变更已确认读写一致

## 验证

```powershell
node --check game.js
"battle.js","battle-spar.js" | ForEach-Object { node --check $_ }
```

冒烟（无浏览器环境）：

```js
const fs = require('fs'), vm = require('vm');
const ctx = vm.createContext({
  console,
  document: { getElementById: () => null, querySelector: () => null, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} },
  setInterval: () => 0, setTimeout: () => 0
});
ctx.window = ctx;          // 浏览器里 window === globalThis
ctx.globalThis = ctx;
const files = ['core.js','items.js','npcs.js','npclogic.js','skills.js','bag.js','fishing.js','cooking.js','farm.js','training.js','neili.js','story.js','battle-render.js','battle-strategy.js','battle.js','battle-spar.js','battle-events.js','dream.js','offline.js','skillcards.js','game.js'];
for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
```

加载失败先补最小 `document`/`localStorage` stub。