# DevPet Tauri 桌面壳 — 架构说明

## 架构总览

DevPet 采用 **双层结构**：

```
┌──────────────────────────────────────────────┐
│  Rust 后端 (src-tauri/src/lib.rs)           │
│  · 窗口管理：always-on-top / 透明 / 无边框    │
│  · 点击穿透 (set_ignore_cursor_events)       │
│  · 系统托盘 (tray)                           │
│  · 原生通知 (notify)                         │
│  · 设置持久化 (tauri-plugin-store)           │
└────────────────────┬─────────────────────────┘
                     │ Tauri IPC (invoke)
┌────────────────────▼─────────────────────────┐
│  Web 前端 (tauri/)                           │
│  · index.html —— 复用 ../devpet Web 应用      │
│  · tauri.js   —— 桥接层：检测环境 + 绑定原生  │
│  · tauri.css  —— 桌面补充样式（透明/拖拽区）   │
└──────────────────────────────────────────────┘
```

## 关键设计

### 1. 复用而非复制
- `tauri/index.html` 直接引用 `../devpet/css/style.css` 与 `../devpet/js/app.js`。
- 不复制 Web 代码，保证单点维护。
- Vite 从 `tauri/` 根目录构建，自动打包 devpet 全部 ES Module。

### 2. 环境检测与渐进增强
- `tauri.js` 通过 `"__TAURI_INTERNALS__" in window` 判断是否运行在 Tauri。
- 浏览器中打开时：不注入桌面 UI、不调用 IPC，完全退化为 Web 版。
- Tauri 中打开时：添加 `html.tauri` 类、显示桌面专属按钮、绑定原生命令。

### 3. 原生能力映射
| 前端 UI | Rust 命令 | 效果 |
| --- | --- | --- |
| 📌 置顶按钮 | `toggle_always_on_top` | 切换全局置顶 |
| 🎯 穿透按钮 | `set_click_through` | 鼠标穿透窗口 |
| 🔒 锁定按钮 | `lock_window` | 锁定位置 + 置顶 |
| ❤️ 点赞 | `notify` | 系统通知 |
| 托盘菜单 | `show_window` / `quit_app` | 显示 / 退出 |
| 番茄钟结束 | `notify`（已联动） | 系统提醒（widgets.js → __DEVPET_NATIVE__.notify） |

### 4. 窗口配置
- `decorations: false` —— 无边框
- `transparent: true` —— 透明背景（配合 `html.tauri body{background:transparent}`）
- `alwaysOnTop: true` —— 默认全局置顶
- `resizable: false` —— 固定浮窗尺寸

### 5. 安全与权限
- `capabilities/default.json` 最小权限：仅 window 管理、shell:open、store。
- CSP 仅放行所需公开 API（GitHub / CoinGecko / wttr.in / stooq）。
- 所有原生命令通过显式 `invoke_handler` 注册。

## 构建产物
- Vite 构建 → `tauri/build/` → 插件复制到 `tauri/src/`（`frontendDist`）。
- `tauri build` 打包 → AppImage / DMG / MSI。

## 事件流示例（点击穿透切换）
```
用户点击 🎯 按钮
  → tauri.js 调 native.setClickThrough(enabled)
  → invoke("set_click_through", { enabled })
  → Rust set_click_through → window.set_ignore_cursor_events
  → 窗口允许鼠标穿透
```
