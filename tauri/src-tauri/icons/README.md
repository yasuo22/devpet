# 应用图标

本目录当前包含 **占位 PNG**（深蓝底），用于让 Tauri 在无 Rust 环境的 CI/构建流程中能先通过。

## 生成真实图标（推荐）

在安装 Rust + Tauri CLI 的环境下，从 Web 版吉祥物一键生成全套图标：

```bash
npm run icon
# 等价于：tauri icon ../../devpet/assets/favicon.svg
```

该命令会基于 `devpet/assets/favicon.svg` 生成：

- `32x32.png` / `128x128.png` / `128x128@2x.png`
- `icon.icns`（macOS）
- `icon.ico`（Windows）
- `icon.png`（通用）

> 生成后请提交更新，替换掉这里的占位图。
