# DevPet 架构文档

本文档描述 DevPet 的整体架构与各模块职责。

## 概览

DevPet 是一个零依赖的纯静态单页应用。所有逻辑被拆分为 10 个 ES Module，通过 `app.js` 统一初始化与事件绑定。

```
index.html ──► js/app.js ──► 初始化各模块
                    │
                    ├──► mascot.js   （吉祥物核心 + 追蝴蝶/猫窝）
                    ├──► pet.js      （宠物元数据 Schema）
                    ├──► weather.js  （天气数据）
                    ├──► market.js   （股票/加密数据）
                    ├──► github.js   （GitHub 作品/热图/账号关联）
                    ├──► widgets.js  （Widget 渲染 + 拖拽/开关 + 猫粮购买 + 成长面板）
                    ├──► social.js   （社交层 + 泡泡优先级队列）
                    ├──► hub.js      （控制中心：主题市场/通知服务/协作模式）
                    ├──► activity.js （用户活动检测 → 追蝴蝶/睡眠）
                    ├──► catfood.js  （猫粮购买交易系统：token钱包→购买→投喂）
                    ├──► growth.js   （宠物成长系统：亲密度/经验/等级）
                    ├──► codex.js    （Codex token 真实数据接入）
                    ├──► codingActivity.js （编码活动反应：petdex 式实时响应 coding agent）
                    └──► store.js    （状态持久化，被各模块复用）
```

## 模块职责

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `config.js` | 常量、API 端点、默认配置、离线数据 | 无 |
| `store.js` | localStorage 封装（get/set/默认值） | config |
| `mascot.js` | 宠物状态机、天气反应、拖拽、锁定、追蝴蝶、猫窝睡眠 | config, store, pet |
| `activity.js` | 用户输入活动检测（键盘/鼠标/触摸/滚动） | config, store |
| `catfood.js` | 猫粮购买交易系统（token钱包→购买档次猫粮→投喂） | config, store, growth |
| `growth.js` | 宠物成长系统（亲密度/经验/等级/解锁） | config, store |
| `codex.js` | Codex token 真实数据接入（API/手动上报/持久化） | config, store |
| `codingActivity.js` | 编码活动反应：监听 Codex token 增量 → 宠物进入 working + 泡泡 + 亲密度 | config, codex |
| `pet.js` | 宠物元数据 Schema（get/save + 校验） | config, store |
| `weather.js` | 天气获取，API 失败时用离线数据 | config |
| `market.js` | 股票 / 加密货币行情 | config |
| `github.js` | GitHub 作品 / 贡献热图 / 最近提交PR / 账号关联 | config, store |
| `widgets.js` | Widget 渲染 + 拖拽排序 + 开关 + 猫粮状态 | config, pet, weather, market, github, catfood, store |
| `social.js` | 泡泡（优先级队列）、名片、协作状态渲染 | config, store |
| `hub.js` | 控制中心：主题市场（预设/导出/导入）、通知服务（Webhook）、协作模式（状态/邀请链接） | config, store, pet, social |
| `app.js` | 入口，创建 DOM、绑定事件、设置面板、启动循环、hub 初始化 | 全部 |

## 数据流

1. `app.js` 启动时读取 `store.js` 中的用户设置与 `pet.js` 的宠物元数据。
2. 按设置创建吉祥物（应用 pet 配色）与各 Widget 容器。
3. `widgets.js` 依据 `pet.widgets` 顺序渲染 Widget，并绑定拖拽排序 / 关闭开关。
4. 数据模块（weather/market/github）异步获取数据，失败时回退到 `config.js` 中的离线数据。
5. GitHub Widget 并行拉取仓库 / 贡献热图 / 最近事件 / 用户信息。
6. `mascot.js` 根据天气 / 用户交互切换状态。
7. Widget 顺序与开关、宠物元数据、GitHub 用户名等变更通过 `store.js` 写回 localStorage。

## 泡泡优先级队列

`social.js` 维护一个按优先级排序的消息队列（critical / normal / low），同一时间只展示一条；关键通知（协作邀请、系统提醒）可优先于普通提示展示，避免低优先级消息打断重要信息。

## 控制中心（hub.js）

`hub.js` 是第四步新增的开发者控制中心，按需动态加载（`import('./hub.js')`），包含三块能力：

1. **主题市场**：`CONFIG.PRESET_PETS` 内置 5 款预设主题；`applyPresetPet` 一键切换；`exportPet` / `importPet` 实现宠物配置的导出（下载 JSON）与导入（文件校验）。
2. **通知服务**：用户配置 Discord / Slack / Telegram 的 Webhook URL（存 `devpet.webhooks`）；`notifyWebhooks` 在番茄钟结束、点赞、协作、启动等事件时向各渠道 POST 推送。
3. **协作模式**：`getCollab/saveCollab` 管理在线状态与项目共享进度；`buildCollabInvite` 生成携带项目信息的邀请链接，`parseCollabInvite` / `checkCollabInvite` 解析他人发来的协作邀请并弹出高优先级泡泡。

`app.js` 在 `initHub()` 中注入宠物应用回调、渲染预设网格并绑定各面板按钮事件。

## 宠物元数据流

`pet.js` 提供默认 Schema，`app.js` 启动时读取；`mascot.js` 应用配色；`widgets.js` 依据 `widgets` 字段决定渲染哪些面板；设置面板通过 `savePet()` 更新元数据并持久化。

元数据包含 `kind`（creature/object/character）与 `vibes`（气质标签）字段，对齐 [petdex](https://github.com/crafter-station/petdex) 宠物包格式，便于未来接入社区生态。

## 状态机（吉祥物）

```
idle ──► sleep（闲置超时；狸花猫 15 分钟）
idle ──► happy（天气好 / 用户点赞）
idle ──► sad（天气差 / 数据拉取失败）
idle ──► working（番茄钟进行中）
idle ──► chase（狸花猫检测到输入 → 追蝴蝶）
chase ─► idle（蝴蝶动画结束 / 停止输入）
sleep ─► chase（狸花猫：检测到输入 → 唤醒追蝴蝶）
sleep ─► idle（被点击唤醒）
locked ─► 所有状态中拖拽被禁用
```

## 彩色狸花猫（花狸）

`config.js` 新增 `tabby` 预设，实现以下专属功能：

### 活动检测
`activity.js` 监听键盘、鼠标、触摸、滚动等输入事件，通过 `ActivityTracker` 类跟踪用户活跃状态。
- **活跃**：用户正在输入 → `mascot.onUserActive()` → 进入 `chase` 状态追蝴蝶
- **闲置**：停止输入超过 15 分钟 → `mascot.onUserIdle()` → 进入 `sleep` 状态睡猫窝

### 猫粮购买交易系统
`catfood.js` 实现了基于 token 货币的购买交易系统：
- **token 钱包**：`addTokens(tokens)` 把 Codex token 消耗加入钱包（作为货币）
- **购买交易**：`buyCatFood(tierId, grams)` 用钱包 token 购买不同档次的猫粮（基础/三文鱼/金枪鱼/和牛，不同单价）
- **等级解锁**：高档猫粮需成长系统达到对应等级（`growth.js` 的 `unlockedTiers`）
- **投喂**：`feed(grams)` 消耗存量猫粮，同步提升亲密度与经验（联动 `growth.onFeed`）
- **定时提醒**：`initCatFoodSystem` 每 60 秒检查投喂状态，专注模式（番茄钟 running）下间隔延长
- **Widget 界面**：`renderCatFood()` 渲染成长面板 + 存量条 + 购买按钮 + token 上报区

### 宠物成长系统（growth.js）
- `getGrowthState()`：读取亲密度/等级/经验/解锁状态，自动计算亲密度自然衰减
- `addXp(amount)`：增加经验并处理升级（连续升级循环）
- `addIntimacy(amount, reason)`：增加亲密度，记录交互来源（feed/interact/focus）
- `onFeed(grams)` / `onInteract()` / `onFocusCompleted()`：各交互入口的便捷封装
- 等级提升时自动解锁对应猫粮档次

### Codex token 接入（codex.js）
- `reportTokens(tokens, meta)`：真实 token 数据入口，累计/今日/每日历史
- `fetchTokensFromApi()`：从配置的 API 端点拉取 token（兼容多种返回结构）
- `configureCodexApi(endpoint, key)`：保存 API 配置
- `initCodexMonitor()`：若已配置 API，每 10 分钟自动拉取
- 猫粮钱包通过 `addTokens()` 自动同步

### 编码活动反应（codingActivity.js）
参考 petdex 桌面宠物「实时响应 coding agent 活动」的核心特性：
- `CodingActivityMonitor` 轮询 Codex token 状态，计算增量
- 增量超过阈值（`TOKEN_DELTA_THRESHOLD`）→ 触发 `onCodingActive`：宠物进入 `working` 状态 + 鼓励泡泡 + 亲密度奖励
- 无新活动超过 `BACK_TO_IDLE_MS` → `onCodingIdle`：回到 `idle`
- 泡泡触发带冷却（`BUBBLE_COOLDOWN_MS`），避免刷屏

## 主题

支持**深色 / 浅色**两种主题。所有颜色集中在 `css/style.css` 的 CSS 变量（`:root`）中，浅色主题通过 `<html data-theme="light">` 覆盖同一组变量，实现一键换肤。主题选择由 `app.js` 通过 `store.js` 持久化（`devpet.theme`）。

## 宠物编辑器

设置面板升级为「宠物编辑器」：可视化修改名称、性别、职业、性格与主体/描边配色，配色通过 `mascot.applyPetColor()` 实时应用到吉祥物本体，并持久化到 `pet.js` 的元数据（`devpet.pet`）。

## 桌面壳联动

`tauri.js` 暴露 `window.__DEVPET_NATIVE__` 桥接层。`widgets.js` 的番茄钟在会话结束时调用 `__DEVPET_NATIVE__.notify` 发原生系统通知；浏览器环境下降级为吉祥物泡泡提示。

## 离线降级

所有外部数据请求均通过「请求 → 超时 → 使用离线数据」策略实现，保证断网环境下应用依然可用。
