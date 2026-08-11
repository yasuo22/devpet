# DevPet · Tauri 2 桌面壳

> 把 Web 版 DevPet 包装为**真正的桌面应用**：全局置顶浮窗、无边框透明窗口、点击穿透、系统托盘、原生通知。

本目录是独立的 Tauri 2 工程，**不修改** `devpet/` 下的 Web 代码，二者并行。

## 目录结构

```
tauri/
├── index.html              # 桌面壳入口（复用 ../devpet 的 Web 应用）
├── tauri.css               # 桌面壳补充样式（透明/圆角/拖拽区）
├── tauri.js                # Tauri 桥接层（环境检测 + 原生能力绑定）
├── vite.config.js          # Vite 配置（root=tauri/，输出到 src/）
├── package.json            # 前端依赖 + Tauri CLI 脚本
└── src-tauri/
    ├── Cargo.toml          # Rust 依赖
    ├── tauri.conf.json     # Tauri 主配置（窗口/托盘/CSP）
    ├── capabilities/default.json  # 权限
    ├── icons/              # 应用图标（占位 + 生成说明）
    └── src/
        ├── main.rs         # 入口
        └── lib.rs          # 后端：窗口/托盘/通知/点击穿透
```

## 桌面原生能力（Rust 后端）

| 能力 | 说明 | 对应命令 |
| --- | --- | --- |
| **全局置顶** | always-on-top 浮窗，`decorations:false` 无边框 | `set_always_on_top` |
| **点击穿透** | 鼠标穿透窗口落到桌面，吉祥物作为"透明浮层" | `set_click_through` |
| **锁定位置** | 锁定后置顶 + 固定 | `lock_window` |
| **系统托盘** | 显示/切换置顶/退出 | tray 菜单 |
| **原生通知** | 系统级气泡（启动、点赞、番茄钟结束等） | `notify` |
| **窗口拖动** | 无边框窗口通过吉祥物头部 CSS `-webkit-app-region` 拖动 | 前端 |

## 环境要求

- [Rust](https://rustup.rs/)（stable，含 `cargo`）
- Node.js ≥ 18
- Linux 需安装 WebKitGTK 等系统依赖，参考 [Tauri 前置依赖](https://tauri.app/start/prerequisites/)

## 快速开始

```bash
cd tauri
npm install
npm run tauri dev      # 开发模式（热更新）
npm run tauri build    # 打包（Linux: AppImage/Deb / macOS: DMG / Windows: MSI）
```

> 首次运行前建议执行 `npm run icon` 生成正式图标（见 `src-tauri/icons/README.md`）。

## 与 Web 版的关系

- `devpet/` —— 纯静态 Web 应用，浏览器直接打开即可。
- `tauri/` —— 桌面壳，`index.html` 复用 `../devpet` 的全部 HTML/CSS/JS，仅新增 `tauri.css` 与 `tauri.js`。
- `tauri.js` 通过 `isTauri()` 检测环境：在浏览器中打开时不注入任何桌面 UI，完全兼容。

## 开发说明

- Vite `root` 指向 `tauri/`，构建产物经插件复制到 `src/`（Tauri 的 `frontendDist`）。
- 后端命令通过 `@tauri-apps/api/core.invoke` 调用。
- CSP 已放行 GitHub / CoinGecko / wttr.in / stooq 等公开 API。
