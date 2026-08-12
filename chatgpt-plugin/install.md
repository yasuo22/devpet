# DevPet ChatGPT 插件 · 安装与使用指南

让 **ChatGPT 直接调用 DevPet 的能力**（天气 / 行情 / 汇率 / GitHub 作品与贡献 / 宠物状态 / 猫粮 / 番茄钟），
通过 **GPT Actions**（推荐，当前标准）或 **传统 Plugins** 两种方式接入。

---

## 一、工作原理

本项目是 DevPet 的**独立 API 网关**，把多种数据源聚合成 REST 接口供 ChatGPT 调用：

```
ChatGPT ──(HTTP 调用)──► DevPet Plugin API (server.js)
                              │
                              ├──► 天气 (wttr.in)
                              ├──► 加密货币 (CoinGecko)
                              ├──► 股票 (Stooq)
                              ├──► 汇率 (open.er-api.com)
                              ├──► GitHub 作品/贡献热图
                              └──► 宠物状态/猫粮钱包/番茄钟
```

> 注意：ChatGPT 的 **Actions** 需要一个**公网可访问**的 API 地址（不能是 localhost）。
> 本地体验可配合内网穿透（如 ngrok / cloudflared）；正式使用请部署到云平台。

---

## 二、本地启动后端

```bash
cd chatgpt-plugin
node server.js          # 默认监听 http://localhost:8787
```

启动后验证：
- 健康检查：`http://localhost:8787/health`
- OpenAPI：`http://localhost:8787/openapi.json`
- 插件清单：`http://localhost:8787/.well-known/ai-plugin.json`

运行冒烟测试：
```bash
node test.js            # 18 项断言
```

---

## 三、方式 A：作为 GPT Actions 接入（推荐）

1. 把后端部署到公网（见「五、部署」），拿到形如 `https://your-domain.com` 的地址。
2. 打开 [ChatGPT → GPTs → Create](https://chat.openai.com/gpts/editor)。
3. 在 **Configure** 里，往下找到 **Actions** → 点击 **Create new action**。
4. 在 **Authentication** 选 `None`；在 **Schema** 粘贴 [openapi.yaml](./openapi.yaml)（或填 `openapi.json` 的 URL）。
5. 保存并发布 GPT 即可。之后在该 GPT 对话里，ChatGPT 会自动按需调用天气 / 行情 / GitHub 等接口。

---

## 四、方式 B：传统 Plugins 接入（旧方案，官方已逐步下线）

> 传统插件需要 API 支持 `/.well-known/ai-plugin.json` 发现机制，本项目已内置。
> 由于 OpenAI 已不再支持新插件提交，建议仅用于自建 / 学习。

1. 部署后端到公网。
2. 确保 `https://your-domain.com/.well-known/ai-plugin.json` 可访问。
3. 在 ChatGPT 插件商店按域名添加即可（需具备插件访问权限）。

---

## 五、部署到公网

### 方案 1：云服务器 / 容器（推荐，最稳）

```bash
# 任意支持 Node 18+ 的环境
git clone <repo-url> && cd chatgpt-plugin
PUBLIC_BASE_URL=https://your-domain.com PORT=8787 node server.js
```
再用 Nginx / Caddy 把 `your-domain.com` 反代到 `127.0.0.1:8787`（需 HTTPS）。

### 方案 2：Docker

```bash
docker build -t devpet-chatgpt-plugin .
docker run -d -p 8787:8787 \
  -e PUBLIC_BASE_URL=https://your-domain.com \
  -v devpet-data:/app/data \
  devpet-chatgpt-plugin
```

### 方案 3：Vercel Serverless

`server.js` 已导出 Vercel 兼容的 `handler`，配合 [vercel.json](./vercel.json)：

```bash
vercel deploy
```
部署时设置环境变量 `PUBLIC_BASE_URL` 指向最终公网地址。

### 方案 4：本地 + 内网穿透（快速体验）

```bash
# 安装 cloudflared 或 ngrok
cloudflared tunnel --url http://localhost:8787   # 会给出一个 https 公网地址
```
把返回的 `https://xxx.trycloudflare.com` 填进 GPT Actions 的服务器地址即可。

---

## 六、可调用能力一览

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/weather?city=深圳&unit=c` | GET | 天气（未来 5 天预报，摄氏/华氏） |
| `/market/crypto?ids=bitcoin,ethereum` | GET | 加密货币行情 |
| `/market/crypto/:id` | GET | 单币行情（如 `/market/crypto/bitcoin`） |
| `/market/stock?symbols=AAPL,TSLA` | GET | 股票行情（可自定义 symbol） |
| `/fx?from=USD&to=CNY` | GET | 汇率换算 |
| `/github?user=xxx` | GET | 用户资料、仓库、最近活动 |
| `/github/contributions?user=xxx` | GET | GitHub 贡献热图 |
| `/pet/config` | GET | 宠物配置与主题预设 |
| `/pet/status` | GET | 宠物完整状态 |
| `/pet/wallet` | GET | 猫粮钱包、token 用量、成长等级 |
| `/pet/report-token` | POST | 上报 Codex token 消耗（1000 token = 1g 猫粮） |
| `/pet/feed` | POST | 投喂猫粮（消耗 token，提升亲密度/经验） |
| `/pet/rename` | POST | 给宠物改名 |
| `/pomodoro` | GET | 番茄钟工作/休息时长计划 |
| `/health` | GET | 健康检查 |

> 所有外部数据源均带**离线降级**：请求失败时返回内置兜底数据，接口不会 5xx 崩溃。

---

## 七、环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `8787` | 服务端口 |
| `PUBLIC_BASE_URL` | `http://localhost:8787` | 公网 HTTPS 地址（ChatGPT Actions 必填） |
| `TIMEOUT_MS` | `8000` | 外部请求超时 |
| `CACHE_TTL_MS` | `60000` | 外部数据缓存时长 |
| `STORE_FILE` | `.devpet-store.json` | 本地持久化路径 |
| `LOGO_URL` / `CONTACT_EMAIL` / `LEGAL_URL` | 默认 | 自定义 manifest 元信息 |

---

## 八、与前端 DevPet 的关系

- 前端 `devpet/`（浏览器）与 `tauri/`（桌面壳）可独立运行，**不受影响**。
- 本插件是**新增的独立入口**，让 ChatGPT 也能感知 / 操作 DevPet 的世界。
- 宠物状态（钱包 / 成长 / token）默认存在 `.devpet-store.json`（本地文件）。
  多实例 / 多用户场景建议接入数据库（替换 `loadStore/saveStore`）。

---

*Made with ❤️ by uzi999 · DevPet ChatGPT Plugin v1.1.0*
