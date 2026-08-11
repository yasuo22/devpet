# DevPet 项目计划

DevPet 是一个**纯静态**的桌面宠物（吉祥物）网页应用。打开 `index.html` 即可运行，无需服务器或构建步骤。

## 目标

打造一只陪伴开发者的桌面小宠物，集成开发者常用的信息面板（天气、股票、加密货币、GitHub 作品、番茄钟），并支持拖拽、锁定、社交互动等趣味功能。

## 技术选型

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 运行方式 | 纯静态 HTML/CSS/JS | 双击即用，零依赖 |
| 状态管理 | localStorage | 持久化用户设置与宠物状态 |
| 数据来源 | 公开 API + 离线降级 | 无 Key 也能用，断网可降级 |
| 模块组织 | ES Modules（8 个模块） | 结构清晰、易维护 |
| 图标 | 内联 SVG | 无需外部资源 |

## 里程碑

### M1 - 骨架（已完成规划）
- 目录结构与文档
- `index.html` 应用入口
- `css/style.css` 基础样式 + 深色主题

### M2 - 核心宠物
- `js/config.js` 配置与常量
- `js/store.js` localStorage 状态管理
- `js/mascot.js` 吉祥物核心（状态机 / 天气反应 / 拖拽 / 锁定）

### M3 - 数据模块
- `js/weather.js` 天气模块（API + 离线降级）
- `js/market.js` 股票 / 加密货币行情
- `js/github.js` GitHub 作品展示

### M4 - 渲染与交互
- `js/widgets.js` Widget 渲染（股票 / 加密 / 天气 / GitHub / Pomodoro）
- `js/social.js` 社交层（泡泡 / 名片 / 协作状态）
- `js/app.js` 应用入口与事件绑定

### M5 - 个性化与可配置（第一步：Pet 元数据 + Widget 拖拽 + 贡献热图）✅
- `js/pet.js` 宠物元数据 Schema（name / gender / occupation / personality / color / sprites / widgets）
- `js/widgets.js` Widget 拖拽排序 + 关闭开关（顺序持久化）
- `js/github.js` 贡献热图 + 最近提交 / PR + 账号关联
- `index.html` + `app.js` 设置面板（自定义宠物名称 / 职业 / 关联 GitHub）

### M6 - Tauri 2 桌面壳（第二步）✅
- `tauri/` 目录：Tauri 2（Rust 后端 + Web 前端）工程
- 全局置顶浮窗（always-on-top / 无边框 / 透明）
- 点击穿透模式 + 锁定位置
- 系统托盘（显示 / 切换置顶 / 退出）
- 原生系统通知

### M7 - 桌面壳联动 + 宠物编辑器（第三步）✅
- 番茄钟会话结束 → 桌面壳原生系统通知（`widgets.js` → `__DEVPET_NATIVE__.notify`），浏览器降级为泡泡提示
- 补齐 Rust 后端 `main.rs` / `lib.rs`（置顶 / 穿透 / 锁定 / 托盘 / 通知等 IPC 命令）
- **宠物编辑器 UI**：可视化修改名称 / 性别 / 职业 / 性格 / 配色，实时预览 + 恢复默认
- **深/浅主题切换**：🌓 按钮一键切换，`data-theme` 驱动 CSS 变量，持久化

### M8 - 待规划
- 多宠物 / 主题市场（导出 / 导入 pet 配置）
- 泡泡优先级队列
- 通知服务（Discord / Slack / Telegram）
- 协作 / 陌生人协同（WebSocket）

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 天气 / 行情 API 需 Key 或跨域受限 | 内置离线降级数据 |
| 浏览器版本差异 | 使用广泛支持的 ES2017+ 语法 |
| localStorage 被禁用 | 降级为内存存储 |

## 验收标准
1. 浏览器直接打开 `index.html` 即可运行。
2. 吉祥物可拖拽、可锁定、对天气有不同反应。
3. 股票 / 加密 / 天气 / GitHub / 番茄钟 Widget 均可渲染。
4. 断网时自动使用离线降级数据。
5. 设置与宠物状态在刷新后仍保留（localStorage）。
