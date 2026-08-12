# 🐱 DevPet ChatGPT Plugin

让 **ChatGPT（GPT Actions / 插件）直接调用 DevPet 的能力** —— 天气 / 股票 / 加密货币 / 汇率 / GitHub 作品与贡献 / 宠物状态 / 猫粮钱包 / 番茄钟。

**零依赖**：仅用 Node 内置模块，无需安装任何 npm 包，`node server.js` 即可运行，可部署到任意 Node 环境。

---

## ✨ 特性

- 🌤️ **天气**：未来 5 天预报、温度（摄氏/华氏）、湿度、风速、紫外线、降雨概率
- 📈 **行情**：12+ 种加密货币、8+ 只美股（支持自定义 symbol / coin）
- 💱 **汇率**：任意货币换算（基于 open.er-api.com，无需 Key）
- 🐙 **GitHub**：用户资料、仓库、最近活动、**贡献热图**
- 🐱 **宠物**：配置 / 主题预设 / 状态 / 改名
- 🍚 **猫粮钱包**：Codex token 上报 → 猫粮换算 → 投喂提升亲密度与等级
- 🍅 **番茄钟**：工作 / 休息时长计划
- 🔌 **离线降级**：所有外部数据源失败时自动回退兜底数据，接口不会 5xx 崩溃
- ⚡ **内存缓存**：外部数据缓存 60s，降低第三方 API 限流
- 🚀 **多平台部署**：独立服务 / Docker / Vercel Serverless

---

## 🚀 快速开始

```bash
cd chatgpt-plugin
node server.js        # 监听 http://localhost:8787
```

启动后验证：
- 健康检查：`GET http://localhost:8787/health`
- OpenAPI：`GET http://localhost:8787/openapi.json`
- 插件清单：`GET http://localhost:8787/.well-known/ai-plugin.json`

## 🧪 运行测试

```bash
node test.js          # 内置冒烟测试（18 项断言）
```

---

## 📚 API 一览

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/weather?city=深圳&unit=c` | GET | 天气（未来 5 天预报） |
| `/market/crypto?ids=bitcoin,ethereum` | GET | 加密货币行情 |
| `/market/crypto/:id` | GET | 单币行情（如 `/market/crypto/bitcoin`） |
| `/market/stock?symbols=AAPL,TSLA` | GET | 股票行情 |
| `/fx?from=USD&to=CNY` | GET | 汇率换算 |
| `/github?user=xxx` | GET | GitHub 用户资料/仓库/最近活动 |
| `/github/contributions?user=xxx` | GET | GitHub 贡献热图 |
| `/pet/config` | GET | 宠物配置与主题预设 |
| `/pet/status` | GET | 宠物完整状态 |
| `/pet/wallet` | GET | 猫粮钱包、token 用量、成长 |
| `/pet/report-token` | POST | 上报 Codex token（1000 token = 1g 猫粮） |
| `/pet/feed` | POST | 投喂猫粮（消耗 token 提升亲密度/经验） |
| `/pet/rename` | POST | 给宠物改名 |
| `/pomodoro` | GET | 番茄钟工作/休息时长计划 |
| `/health` | GET | 健康检查 |

> 完整 OpenAPI 规范见 [openapi.yaml](./openapi.yaml)，也是给 ChatGPT Actions 的 schema。

---

## 🐳 部署

### 方式 1：本地 / 云服务器（独立 Node 服务）

```bash
git clone <repo-url> && cd chatgpt-plugin
PORT=8787 PUBLIC_BASE_URL=https://your-domain.com node server.js
```

再用 Nginx / Caddy 反代到 `127.0.0.1:8787`（需 HTTPS）。

### 方式 2：Docker

```bash
docker build -t devpet-chatgpt-plugin .
docker run -d -p 8787:8787 \
  -e PUBLIC_BASE_URL=https://your-domain.com \
  -v devpet-data:/app/data \
  devpet-chatgpt-plugin
```

### 方式 3：Vercel Serverless

`server.js` 已导出 Vercel 兼容的 `handler`，配合 [vercel.json](./vercel.json) 直接部署：

```bash
vercel deploy
```

### 方式 4：本地 + 内网穿透（快速体验）

```bash
cloudflared tunnel --url http://localhost:8787   # 得到 https 公网地址
```

---

## 🤖 接入 ChatGPT

1. 把后端部署到公网（见上方部署），拿到 HTTPS 地址。
2. 打开 [ChatGPT → GPTs → Create](https://chat.openai.com/gpts/editor)。
3. 进入 **Actions** → **Create new action** → Authentication 选 `None`。
4. 粘贴 [openapi.yaml](./openapi.yaml) 的 schema。
5. 保存发布。之后在该 GPT 对话中，ChatGPT 会自动按需调用天气 / 行情 / GitHub 等接口。

> 详细安装与部署步骤见 [install.md](./install.md)。

---

## ⚙️ 环境变量

见 [.env.example](./.env.example)。核心：
- `PORT`：端口（默认 8787）
- `PUBLIC_BASE_URL`：部署后的公网 HTTPS 地址（**ChatGPT Actions 必填**）
- `TIMEOUT_MS` / `CACHE_TTL_MS`：超时与缓存时长
- `STORE_FILE`：本地持久化路径（默认 `.devpet-store.json`）

---

## 📁 项目结构

```
chatgpt-plugin/
├── server.js        # 零依赖 Node 后端（独立服务 + Vercel 双模式）
├── openapi.yaml     # OpenAPI 规范（ChatGPT Actions schema）
├── manifest.json    # 传统插件清单
├── test.js          # 冒烟测试（18 项断言）
├── install.md       # 安装到 ChatGPT 的详细指南
├── Dockerfile       # 容器化部署
├── vercel.json      # Vercel 部署配置
├── .env.example     # 环境变量模板
└── LICENSE          # MIT
```

---

## 🔗 与 DevPet 的关系

本项目是把 DevPet 的能力开放给 ChatGPT 的**独立 API 网关**：
- 前端 `devpet/`（浏览器）与 `tauri/`（桌面壳）可独立运行，**不受影响**。
- 本插件是**新增的独立入口**，让 ChatGPT 也能感知 / 操作 DevPet 的世界。
- 宠物状态（钱包 / 成长 / token）默认存在 `.devpet-store.json`（本地文件），多实例建议接入数据库（替换 `loadStore/saveStore`）。

---

## 📄 许可证

[MIT](./LICENSE)
