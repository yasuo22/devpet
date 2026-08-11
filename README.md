# 🐾 DevPet · 开发者桌面宠物

> **陪伴开发者工作/生活的桌面小宠物** —— 集成天气、行情、GitHub 作品展示与番茄钟，让工作桌面不再枯燥。

![DevPet](devpet/assets/favicon.svg)

一个零依赖、纯静态、开箱即用的**开发者桌面吉祥物**应用。内置内联 SVG 绘制的可爱吉祥物，支持拖拽、锁定、心情/天气反应，并集成了开发者常用的信息面板（天气、股票、加密货币、GitHub 作品、番茄钟）。

---

## ✨ 核心特性

| 特性 | 说明 |
| --- | --- |
| 🐱 **吉祥物核心** | 内联 SVG 绘制，支持 idle / sleep / happy / sad / working 五种状态机 |
| 🌦️ **天气反应** | 晴天 happy、雨雪 sad、可扩展穿衣/道具反应 |
| 📈 **股票 / 加密行情** | 股票（Stooq CSV）+ 加密货币（CoinGecko）实时行情 |
| 🐙 **GitHub 作品** | 展示用户公开仓库、Star 数、贡献热图、最近提交/PR |
| 🍅 **番茄钟** | 25+5 番茄工作法，自动切换工作/休息状态 |
| 🧲 **拖拽 / 锁定** | 自由拖拽位置，一键锁定防止误操作 |
| 🧩 **Widget 拖拽 / 开关** | 各信息面板可拖拽排序、可关闭 |
| 🪪 **Pet 元数据** | 宠物名称 / 性别 / 职业 / 性格 / 配色 / sprites 可配置 |
| 🖌️ **宠物编辑器 UI** | 可视化修改名称、性别、职业、性格、配色，实时预览 |
| 🔗 **GitHub 账号关联** | 设置面板输入用户名，实时关联贡献热图 |
| 💾 **离线降级** | 所有外部 API 请求失败自动降级到内置数据，断网也能用 |
| 🎨 **深/浅主题切换** | 一键切换深色/浅色主题，选择持久化 |
| 🎨 **主题市场（多宠物）** | 内置 5 款预设宠物主题，一键切换 + 导出/导入 pet 配置 |
| 🔔 **通知服务（Webhook）** | 配置 Discord / Slack / Telegram，番茄钟/点赞/协作事件推送 |
| 🤝 **协作模式** | 在线状态 + 项目共享进度 + 协作邀请链接 |
| 🧵 **泡泡优先级队列** | 关键通知优先展示，低优先级排队不打断 |

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
│   │   └── hub.js          # 控制中心（主题市场/通知服务/协作模式）
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
| 模块组织 | ES Modules（9 个模块） | 结构清晰、易维护 |
| 图标 | 内联 SVG | 无需外部资源 |

---

## 🎮 吉祥物状态机

```
idle ──► sleep   （闲置 30s 超时）
idle ──► happy   （天气好 / 点赞）
idle ──► sad     （天气差 / 数据拉取失败）
idle ──► working （番茄钟运行中）
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
- [x] **主题市场（多宠物）**：内置 5 款预设主题一键切换 + 宠物配置导出/导入（JSON）
- [x] **通知服务（Webhook）**：Discord / Slack / Telegram 配置与事件推送（番茄钟 / 点赞 / 协作 / 启动 / 测试）
- [x] **协作模式**：在线状态（在线 / 协作中 / 离开）+ 项目共享进度 + 协作邀请链接
- [x] **泡泡优先级队列**：critical / normal / low 三级，关键通知优先展示

### 规划中 🚧
- [ ] **主题市场在线版**：与社区互通、拉取远程 pet 配置
- [ ] **实时协作**：WebSocket 服务端多人在线同步文件状态
- [ ] **更多通知渠道**：钉钉 / 飞书 / 邮件
- [ ] **宠物技能 / 插件系统**

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
