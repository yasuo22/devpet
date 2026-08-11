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
| 🐙 **GitHub 作品** | 展示用户公开仓库、Star 数、简介 |
| 🍅 **番茄钟** | 25+5 番茄工作法，自动切换工作/休息状态 |
| 🧲 **拖拽 / 锁定** | 自由拖拽位置，一键锁定防止误操作 |
| 💾 **离线降级** | 所有外部 API 请求失败自动降级到内置数据，断网也能用 |
| 🎨 **深色主题** | 以 CSS 变量驱动，一键换肤 |

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
│   │   ├── app.js          # 应用入口与事件绑定
│   │   ├── config.js       # 配置 / API 端点 / 离线数据
│   │   ├── store.js        # localStorage 状态管理
│   │   ├── mascot.js       # 吉祥物核心（状态机/天气/拖拽/锁定）
│   │   ├── weather.js      # 天气模块
│   │   ├── market.js       # 股票 / 加密行情
│   │   ├── github.js       # GitHub 作品展示
│   │   ├── widgets.js      # Widget 渲染
│   │   └── social.js       # 社交层（泡泡/名片/协作）
│   └── docs/
│       ├── ARCHITECTURE.md # 架构文档
│       ├── PET_SPEC.md     # 宠物规格文档
│       └── PROJECT_PLAN.md # 项目计划
└── README.md               # 本文档
```

---

## 🔧 技术栈

| 项 | 选择 | 说明 |
| --- | --- | --- |
| 运行方式 | 纯静态 HTML/CSS/JS | 零依赖，双击即用 |
| 状态管理 | `localStorage` | 持久化宠物位置/心情/设置 |
| 数据来源 | 公开 API + 离线降级 | 无 Key 也能用 |
| 模块组织 | ES Modules（8 个模块） | 结构清晰、易维护 |
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
- [x] 社交层（泡泡 / 名片 / 协作状态基础版）
- [x] 离线降级机制

### 规划中 🚧
- [ ] **Tauri 2 桌面壳**：打包为原生桌面应用（DMG/EXE），真正的 always-on-top 浮窗
- [ ] **宠物深度个性化**：性别 / 职业 / 性格 → 生成 sprite sheets
- [ ] **多宠物 / 主题市场**：社区分享 pet 配置
- [ ] **通知集成**：Discord / Slack / Telegram 消息泡泡
- [ ] **协作模式**：多人在线状态、项目共享进度

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
