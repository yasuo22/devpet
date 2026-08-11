# DevPet 宠物规格（PET_SPEC）

本文件定义 DevPet 吉祥物的外观、状态、交互与元数据规格。

## 吉祥物角色

- **名称**：DevPet（开发者宠物，可在设置中自定义）
- **定位**：一只陪伴开发者工作/生活的桌面小伙伴
- **风格**：圆润、可爱、扁平化的像素/矢量风（内联 SVG 绘制）

## 宠物元数据 Schema

宠物数据以可配置的 JSON 结构持久化在 `localStorage`（键 `devpet.pet`），由 `js/pet.js` 统一管理：

```json
{
  "preset": "classic",             // 预设标识（classic / tabby 等）
  "name": "DevPet",                 // 昵称
  "gender": "other",                // male | female | other
  "occupation": "开发者伙伴",         // 职业
  "personality": "开朗",            // 性格
  "color": {                        // 配色（可覆盖默认吉祥物配色）
    "body": "#ffd88f",
    "dark": "#f0b866"
  },
  "colorExt": {                     // 扩展配色（狸花猫条纹/肚皮）
    "stripe": "#6b4423",
    "belly": "#f5e6d0"
  },
  "sprites": {                      // 各状态装饰图标
    "idle": "", "sleep": "💤", "happy": "❤️", "sad": "🌧️", "working": "💻"
  },
  "widgets": ["weather", "stock", "crypto", "github", "pomodoro", "catfood"]  // 挂载的 Widget
}
```

- 通过 `js/pet.js` 的 `getPet() / savePet()` 读写，含默认值合并与字段校验。
- 吉祥物配色由 `mascot.js` 读取并覆盖 CSS 变量（`--pet-body` / `--pet-body-dark`）。

## 状态（State）

| 状态 | 触发条件 | 表现 |
| --- | --- | --- |
| `idle` | 默认 | 呼吸浮动、眼睛正常、偶尔眨眼 |
| `sleep` | 闲置超过 30s（狸花猫：15 分钟） | 闭眼、Zzz 冒出、狸花猫显示猫窝 |
| `happy` | 天气晴好 / 点赞 / 数据刷新成功 | 眼睛变弯、出现爱心 |
| `sad` | 天气恶劣 / 数据拉取失败 | 眉毛下垂、出现雨滴/阴云 |
| `working` | 番茄钟运行中 | 戴帽子/专注眼神、冒汗或计时 |
| `chase` | 狸花猫检测到用户输入活动 | 追蝴蝶、跳跳蹦蹦 |

## 天气反应

| 天气 | 宠物反应 |
| --- | --- |
| 晴 | `happy`，出现太阳小图标 |
| 雨 / 雪 | `sad`，携带雨伞/雪花 |
| 多云 | `idle`，稍微皱眉 |
| 极端（热/冷） | 吐舌 / 打颤 |

## 交互能力

1. **拖拽**：按住吉祥物可自由拖动到屏幕任意位置。
2. **锁定**：点击锁定按钮后固定位置，不可拖动（位置仍被记忆）。
3. **点击**：点击唤醒睡着的宠物、随机触发小动作。
4. **点赞**：按钮切换 `happy` 并弹出爱心泡泡。
5. **设置面板 / 宠物编辑器**：⚙️ 按钮打开编辑器，可自定义名称 / 性别 / 职业 / 性格 / 配色，并实时预览 + 恢复默认；同时可关联 GitHub 账号。

## 彩色狸花猫（花狸）专属功能

### 活动检测（追蝴蝶）
- 当用户正在输入（键盘 / 鼠标 / 触摸 / 滚动）时，狸花猫会追着蝴蝶跑来跑去。
- 蝴蝶动画每次持续 8 秒，间隔至少 3 秒触发一次。
- 检测模块：`js/activity.js`。

### 睡眠机制
- 狸花猫停止输入超过 **15 分钟** 后，会在原地（猫窝 🧺）睡觉。
- 非狸花猫保持默认 30 秒闲置超时。

### 猫粮系统（购买交易版）
- **token 是货币**：Codex token 消耗进入「钱包」（`walletTokens`），可主动购买猫粮。
- **购买交易**：用钱包 token 购买 4 种档次猫粮（基础 `1 token/g` / 三文鱼 `2 token/g` / 金枪鱼 `5 token/g` / 和牛 `10 token/g`）。
- **等级解锁**：高档猫粮需宠物等级解锁（三文鱼 Lv.3 / 金枪鱼 Lv.6 / 和牛 Lv.10）。
- **投喂**：消耗存量猫粮 → 提升亲密度 + 经验值。
- 每隔 **4 小时** 提醒投喂；专注模式下间隔延长 1.5 倍（消耗变慢）。
- 猫粮存量低于阈值（30%）时提醒。
- 模块：`js/catfood.js`。
- Widget：`catfood` 猫粮购买 + 成长面板。

### Codex token 接入（`js/codex.js`）
- **API 接入**：配置 Codex API 端点 + API Key，每 10 分钟自动拉取真实 token 消耗。
- **手动上报**：在猫粮 Widget 输入本次消耗的 token 数，点击上报。
- **本地持久化**：累计消耗 / 今日消耗 / 每日历史（近 7 天）存入 localStorage。
- **与猫粮联动**：token 消耗自动进入钱包（可购买猫粮）。

### 宠物成长系统（`js/growth.js`）
- **亲密度**（0-100%）：投喂、互动、番茄钟专注都会增加；长时间不照顾会自然衰减。
- **经验 / 等级**：每次正向交互获得 XP，攒满升级；等级影响称号与猫粮解锁。
- **称号**：Lv.1 幼崽 → Lv.3 成长中 → Lv.5 活跃伙伴 → Lv.8 得力助手 → Lv.12 开发守护神 → Lv.16 传奇伙伴。
- 模块：`js/growth.js`。

### 番茄钟联动（时间逻辑）
- **专注会话（work）**：完成获得 `XP = 专注分钟 × 3` + 亲密度 +3；期间猫粮消耗间隔延长（消耗变慢）。
- **休息会话（short/long break）**：不获得 XP，但可趁休息投喂恢复饱食度。
- **时间串联**：专注 → 休息 → 专注 → ... → 第 4 个专注后进入长休息，循环往复。
- 每次专注结束，系统通知展示当前等级与亲密度。

### 外观特征
- 狸花猫带有额头条纹和背纹（SVG 绘制）。
- 肚皮为浅色（奶油色）。
- 带有胡须。
- 耳朵内侧为粉色。

## Widget 系统

- **拖拽排序**：拖动 Widget 头部 `⠿` 手柄可自由排序，顺序持久化到 `devpet.widgetOrder`。
- **开关**：点击 Widget 头部 `✕` 可关闭对应面板，状态写入 `devpet.pet.widgets`。
- **渲染**：`js/widgets.js` 依据 `pet.widgets` 顺序渲染并绑定拖拽/开关事件。

## GitHub 贡献热图

GitHub Widget 包含：
- **用户信息**：头像、简介、仓库数 / 关注者数。
- **贡献热图**：解析 GitHub 贡献 SVG（`github.com/users/<user>/contributions`）为网格单元，无 Key 时回退到离线示例热图。
- **最近提交 / PR**：拉取公开事件（`/users/<user>/events/public`）提取最近提交与 PR。
- **账号关联**：通过设置面板输入 GitHub 用户名，持久化到 `devpet.githubUser`。

## 外观规格

- 尺寸：约 96×96 px（可缩放）。
- 元素：身体、眼睛（可变形）、嘴巴、腮红、装饰（帽/伞/爱心）。
- 动画：CSS keyframes 驱动（浮动、眨眼、下坠），见 `css/style.css`。

## 数据持久化

| 键 | 值 | 说明 |
| --- | --- | --- |
| `devpet.pos` | `{x,y}` | 吉祥物位置 |
| `devpet.locked` | boolean | 是否锁定 |
| `devpet.mood` | string | 当前心情 |
| `devpet.pomodoro` | object | 番茄钟设置与状态 |
| `devpet.settings` | object | 主题、显示哪些 Widget 等 |
| `devpet.pet` | object | 宠物元数据（名称/性别/职业/性格/配色/sprites/widgets/colorExt） |
| `devpet.widgetOrder` | array | Widget 拖拽排序后的顺序 |
| `devpet.githubUser` | string | 关联的 GitHub 用户名 |
| `devpet.theme` | string | 主题（`dark` / `light`） |
| `devpet.catActivity` | object | 用户最后活跃时间（`{lastActiveAt}`） |
| `devpet.catfood` | object | 猫粮状态（`{totalTokens, currentFood, lastFeedAt, ...}`） |

## 主题

支持**深色 / 浅色**两种主题。控制栏 🌓 按钮一键切换，通过 `<html data-theme>` 覆盖 `style.css` 的 CSS 变量，选择持久化到 `devpet.theme`。

## 番茄钟与桌面壳联动

番茄钟会话结束时（专注→休息 或 休息→专注），`widgets.js` 调用 `window.__DEVPET_NATIVE__.notify` 向桌面壳发送**原生系统通知**；浏览器环境下降级为吉祥物泡泡提示。若配置了 Webhook 通知服务，同时向 Discord / Slack / Telegram 推送消息。

## 主题市场（多宠物）

`config.js` 的 `PRESET_PETS` 内置 6 款宠物主题：

| 预设 | 名称 | 配色 | 性格 | 专属功能 |
| --- | --- | --- | --- | --- |
| classic | DevPet | 金黄 `#ffd88f` | 开朗 | - |
| tech | 蓝莓 | 蓝 `#7aa2f7` | 沉稳 | - |
| cute | 桃桃 | 粉 `#ffb3c8` | 元气 | - |
| nature | 芽芽 | 绿 `#9be08a` | 温和 | - |
| midnight | 小夜 | 紫 `#c9b8ff` | 专注 | - |
| tabby | **花狸** | 狸花棕 `#d9a066` | 活泼 | 追蝴蝶 / 睡猫窝 / 猫粮系统 |

- 设置面板「🎨 主题市场」可一键切换预设主题（实时应用到吉祥物）。
- 支持**导出**当前宠物配置为 JSON 下载、**导入**他人分享的宠物配置（带字段校验）。

## 通知服务（Webhook）

设置面板「🔔 通知服务」可配置 Discord / Slack / Telegram 的 Webhook URL（存 `devpet.webhooks`）。配置后，以下事件会通过 `notifyWebhooks` 自动推送：番茄钟结束、收到点赞、协作邀请、应用启动；也支持手动发送测试消息。

## 协作模式

设置面板「🤝 协作模式」可设置：在线状态（在线 / 协作中 / 离开）、当前项目、正在编辑文件、队友昵称。状态保存在 `devpet.collab`，并渲染为社交名片。

- **协作邀请链接**：`buildCollabInvite` 把项目与状态编码进 URL 的 `#collab=` 片段；`copyText` 一键复制。
- **邀请检测**：打开带 `#collab=` 的链接时，`checkCollabInvite` 解析并弹出高优先级协作邀请泡泡，同时尝试向 Webhook 推送提醒。

## 泡泡优先级队列

社交泡泡采用优先级队列：`critical`（协作邀请 / 系统提醒）优先展示，`normal`（普通提示）与 `low`（次要提示）依次排队，同一时间仅展示一条，避免关键通知被打断。

## 无障碍
- 吉祥物有 `aria-label`。
- 按钮可键盘聚焦。
- 所有交互可用鼠标与键盘触发。
