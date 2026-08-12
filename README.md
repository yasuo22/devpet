# 🐾 DevPet · ChatGPT桌面宠物

![Version](https://img.shields.io/badge/version-v1.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

> **陪伴开发者工作/生活的桌面小宠物** —— 集成天气、行情、GitHub 作品展示与番茄钟，让工作桌面不再枯燥。

🌐 **其他语言**：[English](README.en.md) · [Français](README.fr.md) · [한국어](README.ko.md) · [日本語](README.ja.md)

![DevPet](devpet/assets/favicon.svg)

一个零依赖、纯静态、开箱即用的**开发者桌面吉祥物**应用。内置内联 SVG 绘制的可爱吉祥物，支持拖拽、锁定、心情/天气反应，并集成了开发者常用的信息面板（天气、股票、加密货币、GitHub 作品、番茄钟）。

---

## ✨ 核心特性

| 特性 | 说明 |
| --- | --- |
| 🐱 **吉祥物核心** | 内联 SVG 绘制，支持 idle / sleep / happy / sad / working / chase 六种状态机 |
| 🌦️ **天气反应** | 晴天 happy、雨雪 sad、可扩展穿衣/道具反应 |
| 📈 **股票 / 加密行情** | 股票（Stooq CSV）+ 加密货币（CoinGecko）实时行情 |
| 🐙 **GitHub 作品** | 展示用户公开仓库、Star 数、贡献热图、最近提交/PR |
| 🍅 **番茄钟** | 25+5 番茄工作法，自动切换工作/休息状态 |
| 🧲 **拖拽 / 锁定** | 自由拖拽位置，一键锁定防止误操作 |
| 🧩 **Widget 拖拽 / 开关** | 各信息面板可拖拽排序、可关闭 |
| 🪪 **Pet 元数据** | 宠物名称 / 类型（kind）/ 气质（vibes）/ 性别 / 职业 / 性格 / 配色 / sprites 可配置，对齐 petdex 生态 |
| 🖌️ **宠物编辑器 UI** | 可视化修改名称、类型、气质、性别、职业、性格、配色，实时预览 |
| 🔗 **GitHub 账号关联** | 设置面板输入用户名，实时关联贡献热图 |
| 💾 **离线降级** | 所有外部 API 请求失败自动降级到内置数据，断网也能用 |
| 🎨 **深/浅主题切换** | 一键切换深色/浅色主题，选择持久化 |
| 🎨 **主题市场（多宠物）** | 内置 6 款预设宠物主题（含彩色狸花猫），一键切换 + 导出/导入 pet 配置 |
| 🔔 **通知服务（Webhook）** | 配置 Discord / Slack / Telegram，番茄钟/点赞/协作事件推送 |
| 🤝 **协作模式** | 在线状态 + 项目共享进度 + 协作邀请链接 |
| 🧵 **泡泡优先级队列** | 关键通知优先展示，低优先级排队不打断 |
| 🦋 **彩色狸花猫** | 检测用户输入活动 → 追蝴蝶；闲置 15 分钟 → 睡猫窝 |
| 🐟 **猫粮系统** | token 消耗 → 猫粮积累，每 4 小时提醒投喂，多种档次 |
| 🤖 **Codex token 接入** | API / 手动上报真实 token 消耗数据，自动同步钱包 |
| 🛒 **猫粮购买交易** | 用钱包 token 购买不同档次猫粮（基础/三文鱼/金枪鱼/和牛） |
| 🏅 **宠物成长系统** | 喂食/互动/专注提升亲密度与经验，升级解锁高档猫粮 |
| 🍅 **番茄钟联动** | 专注会话获得 XP + 亲密度，休息时喂食恢复，时间逻辑自动串联 |
| ⚡ **编码活动反应** | 监听 Codex token 增量 → 宠物实时响应 coding agent 活动（working + 鼓励泡泡） |

---

## 🚀 快速开始

### 方式一：浏览器直接运行（推荐）

```bash
# 克隆仓库
git clone <repo-url>
cd DevPet

# 直接在浏览器打开 index.html
open devpet/index.html        # macOS
start devpet/index.html       # Windows
xdg-open devpet/index.html    # Linux
```

> 纯静态零依赖，无需 npm install，无需构建步骤，双击即用。

### 方式二：本地 HTTP 服务

```bash
cd devpet
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

---

## 📁 目录结构

```
DevPet/
├── devpet/
│   ├── index.html          # 应用入口
│   ├── assets/
│   │   └── favicon.svg     # 吉祥物 SVG 图标
│   ├── css/
│   │   └── style.css       # 全局样式 + 深色主题 + 动画
│   ├── js/
│   │   ├── app.js          # 应用入口、设置面板与事件绑定
│   │   ├── config.js       # 配置 / API 端点 / 离线数据
│   │   ├── store.js        # localStorage 状态管理
│   │   ├── mascot.js       # 吉祥物核心（状态机/天气/拖拽/锁定）
│   │   ├── weather.js      # 天气模块
│   │   ├── market.js       # 股票 / 加密行情
│   │   ├── github.js       # GitHub 作品/贡献热图/账号关联
│   │   ├── pet.js          # 宠物元数据 Schema
│   │   ├── widgets.js      # Widget 渲染（拖拽/开关）
│   │   ├── social.js       # 社交层（泡泡优先级队列/名片/协作）
│   │   ├── hub.js          # 控制中心（主题市场/通知服务/协作模式）
│   │   ├── activity.js     # 活动检测（狸花猫追蝴蝶/睡眠）
│   │   ├── catfood.js      # 猫粮购买交易系统
│   │   ├── growth.js       # 宠物成长系统
│   │   ├── codex.js        # Codex token 真实数据接入
│   │   └── codingActivity.js # 编码活动反应（petdex 式）
│   └── docs/
│       ├── ARCHITECTURE.md # 架构文档
│       ├── PET_SPEC.md     # 宠物规格文档
│       └── PROJECT_PLAN.md # 项目计划
├── tauri/                  # Tauri 2 桌面壳（第二步）
│   ├── index.html          # 桌面壳入口（复用 ../devpet）
│   ├── tauri.css           # 桌面壳补充样式
│   ├── tauri.js            # Tauri 桥接层（置顶/穿透/通知）
│   ├── vite.config.js      # Vite 配置
│   └── src-tauri/          # Rust 后端（窗口/托盘/通知）
└── README.md               # 本文档
```

---

## 🔧 技术栈

| 项 | 选择 | 说明 |
| --- | --- | --- |
| 运行方式 | 纯静态 HTML/CSS/JS | 零依赖，双击即用 |
| 桌面壳 | **Tauri 2**（Rust 后端） | 全局置顶/点击穿透/托盘/通知 |
| 状态管理 | `localStorage` | 持久化宠物位置/心情/设置 |
| 数据来源 | 公开 API + 离线降级 | 无 Key 也能用 |
| 模块组织 | ES Modules（13 个模块） | 结构清晰、易维护 |
| 图标 | 内联 SVG | 无需外部资源 |

---

## 🎮 吉祥物状态机

```
idle ──► sleep   （闲置 30s 超时；狸花猫 15 分钟）
idle ──► happy   （天气好 / 点赞）
idle ──► sad     （天气差 / 数据拉取失败）
idle ──► working （番茄钟运行中）
idle ──► chase   （狸花猫检测到输入 → 追蝴蝶）
chase ─► idle    （蝴蝶动画结束 / 停止输入）
sleep ─► chase   （狸花猫：检测到输入 → 唤醒追蝴蝶）
sleep ─► idle    （点击唤醒）
locked ─► 所有状态禁止拖拽
```

---

## 🛠️ 自定义配置

所有配置集中在 `devpet/js/config.js`，你可以方便地修改：

- **API 端点**：更换天气 / 行情 / GitHub 数据源
- **吉祥物位置**：默认初始位置
- **Widget 开关**：`DEFAULT_WIDGETS` 控制显示哪些面板
- **番茄钟**：工作时长 / 休息时长 / 长休息周期
- **离线数据**：断网时的降级数据

---

## 🗺️ Roadmap

### 已完成 ✅
- [x] 吉祥物核心（状态机 / 天气反应 / 拖拽 / 锁定）
- [x] 天气 / 股票 / 加密货币 / GitHub / 番茄钟 Widget
- [x] **Pet 元数据 Schema**（名称 / 职业 / 配色 / sprites / widgets）
- [x] **Widget 拖拽排序 + 关闭开关**
- [x] **GitHub 贡献热图 + 最近提交/PR + 账号关联**
- [x] 社交层（泡泡 / 名片 / 协作状态基础版）
- [x] 离线降级机制
- [x] **Tauri 2 桌面壳**：全局置顶浮窗 / 无边框透明 / 点击穿透 / 系统托盘 / 原生通知
- [x] **番茄钟系统通知联动**：会话结束 → 桌面壳发原生系统通知（浏览器降级为泡泡提示）
- [x] **宠物编辑器 UI**：可视化修改名称 / 性别 / 职业 / 性格 / 配色，实时预览 + 恢复默认
- [x] **深/浅主题切换**：🌓 按钮一键切换，持久化
- [x] **主题市场（多宠物）**：内置 6 款预设主题（含彩色狸花猫）一键切换 + 宠物配置导出/导入（JSON）
- [x] **通知服务（Webhook）**：Discord / Slack / Telegram 配置与事件推送（番茄钟 / 点赞 / 协作 / 启动 / 测试）
- [x] **协作模式**：在线状态（在线 / 协作中 / 离开）+ 项目共享进度 + 协作邀请链接
- [x] **泡泡优先级队列**：critical / normal / low 三级，关键通知优先展示
- [x] **彩色狸花猫（花狸）**：检测输入活动 → 追蝴蝶；闲置 15 分钟 → 睡猫窝；狸花猫条纹外观
- [x] **猫粮系统**：token 消耗 → 猫粮积累（1000 token = 1g），每 4 小时提醒投喂，多档次猫粮定价
- [x] **Codex token 接入**：API 自动拉取 / 手动上报真实 token 消耗，钱包余额持久化
- [x] **猫粮购买交易**：用钱包 token 购买 4 种档次猫粮（基础/三文鱼/金枪鱼/和牛），按等级解锁
- [x] **宠物成长系统**：亲密度 / 经验 / 等级，投喂、互动、番茄钟专注均提升成长
- [x] **番茄钟联动**：专注会话获得 XP + 亲密度，休息时喂食恢复，专注中猫粮消耗变慢

### 规划中 🚧
- [ ] **主题市场在线版**：与社区互通、拉取远程 pet 配置
- [ ] **实时协作**：WebSocket 服务端多人在线同步文件状态
- [ ] **更多通知渠道**：钉钉 / 飞书 / 邮件
- [ ] **宠物技能 / 插件系统**

---

## 🔐 安全与部署

### 部署环境

- **Web 端**：`devpet/` 为纯静态应用，可直接浏览器打开或通过任意静态服务器托管，无需构建。
- **桌面端**：`tauri/` 为 Tauri 2 桌面壳，需 `npm install` + `tauri build`（依赖 Rust 工具链与系统 WebKit 库）。
- **CI**：仓库内置 `.cnb.yml` 流水线，在 `push` / `pull_request` 时自动执行 JS 语法校验与前端构建。
- **忽略文件**：根级 `.gitignore` 已忽略 `node_modules`、`target`、构建产物与本地密钥。

### 安全模型

DevPet 是纯前端本地应用，无服务端，遵循「最小授权」原则：

- **外部数据转义**：GitHub / 天气 / 行情等外部 API 返回的文本（bio、仓库描述、提交信息、城市、行情名称等）在渲染前均已 HTML 转义，防止 XSS。
- **本地数据转义**：宠物配置、协作状态等用户可写数据（含导入的 pet 配置）在渲染进 DOM 前同样转义。
- **Tauri CSP**：`tauri.conf.json` 的 CSP 将 `img-src` 收紧到仅 GitHub 头像/热图域，降低被注入风险。
- **API Key**：Codex API Key 仅保存在本机浏览器 `localStorage`，请勿在共享/公共电脑上配置。
- **Webhook**：通知 Webhook URL 由用户自行配置，请求由本机浏览器发起，仅用于事件推送。

### 已知限制

- 纯前端无法提供服务端会话授权，涉及敏感凭据（如 API Key）请谨慎在本机使用。

---

## 📚 文档

- [架构文档](devpet/docs/ARCHITECTURE.md)
- [宠物规格](devpet/docs/PET_SPEC.md)
- [项目计划](devpet/docs/PROJECT_PLAN.md)

---

## 🤝 贡献

欢迎提交 Issue 与 PR。当前为个人项目起步阶段，所有功能均可自由扩展。

## 📄 许可证

MIT License

---

*Made with ❤️ by [uzi999](https://cnb.cool/uzi999-2026)*
