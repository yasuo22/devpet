# DevPet 架构文档

本文档描述 DevPet 的整体架构与各模块职责。

## 概览

DevPet 是一个零依赖的纯静态单页应用。所有逻辑被拆分为 10 个 ES Module，通过 `app.js` 统一初始化与事件绑定。

```
index.html ──► js/app.js ──► 初始化各模块
                    │
                    ├──► mascot.js   （吉祥物核心）
                    ├──► pet.js      （宠物元数据 Schema）
                    ├──► weather.js  （天气数据）
                    ├──► market.js   （股票/加密数据）
                    ├──► github.js   （GitHub 作品/热图/账号关联）
                    ├──► widgets.js  （Widget 渲染 + 拖拽/开关）
                    ├──► social.js   （社交层 + 泡泡优先级队列）
                    ├──► hub.js      （控制中心：主题市场/通知服务/协作模式）
                    └──► store.js    （状态持久化，被各模块复用）
```

## 模块职责

| 模块 | 职责 | 依赖 |
| --- | --- | --- |
| `config.js` | 常量、API 端点、默认配置、离线数据 | 无 |
| `store.js` | localStorage 封装（get/set/默认值） | config |
| `mascot.js` | 宠物状态机、天气反应、拖拽、锁定、应用 pet 配色 | config, store, pet |
| `pet.js` | 宠物元数据 Schema（get/save + 校验） | config, store |
| `weather.js` | 天气获取，API 失败时用离线数据 | config |
| `market.js` | 股票 / 加密货币行情 | config |
| `github.js` | GitHub 作品 / 贡献热图 / 最近提交PR / 账号关联 | config, store |
| `widgets.js` | Widget 渲染 + 拖拽排序 + 开关 | config, pet, weather, market, github, store |
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

## 状态机（吉祥物）

```
idle ──► sleep（闲置超时）
idle ──► happy（天气好 / 用户点赞）
idle ──► sad（天气差 / 数据拉取失败）
idle ──► working（番茄钟进行中）
sleep ─► idle（被点击唤醒）
locked ─► 所有状态中拖拽被禁用
```

## 主题

支持**深色 / 浅色**两种主题。所有颜色集中在 `css/style.css` 的 CSS 变量（`:root`）中，浅色主题通过 `<html data-theme="light">` 覆盖同一组变量，实现一键换肤。主题选择由 `app.js` 通过 `store.js` 持久化（`devpet.theme`）。

## 宠物编辑器

设置面板升级为「宠物编辑器」：可视化修改名称、性别、职业、性格与主体/描边配色，配色通过 `mascot.applyPetColor()` 实时应用到吉祥物本体，并持久化到 `pet.js` 的元数据（`devpet.pet`）。

## 桌面壳联动

`tauri.js` 暴露 `window.__DEVPET_NATIVE__` 桥接层。`widgets.js` 的番茄钟在会话结束时调用 `__DEVPET_NATIVE__.notify` 发原生系统通知；浏览器环境下降级为吉祥物泡泡提示。

## 离线降级

所有外部数据请求均通过「请求 → 超时 → 使用离线数据」策略实现，保证断网环境下应用依然可用。
