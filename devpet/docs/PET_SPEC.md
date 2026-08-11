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
  "name": "DevPet",                 // 昵称
  "gender": "other",                // male | female | other
  "occupation": "开发者伙伴",         // 职业
  "personality": "开朗",            // 性格
  "color": {                        // 配色（可覆盖默认吉祥物配色）
    "body": "#ffd88f",
    "dark": "#f0b866"
  },
  "sprites": {                      // 各状态装饰图标
    "idle": "", "sleep": "💤", "happy": "❤️", "sad": "🌧️", "working": "💻"
  },
  "widgets": ["weather", "stock", "crypto", "github", "pomodoro"]  // 挂载的 Widget
}
```

- 通过 `js/pet.js` 的 `getPet() / savePet()` 读写，含默认值合并与字段校验。
- 吉祥物配色由 `mascot.js` 读取并覆盖 CSS 变量（`--pet-body` / `--pet-body-dark`）。

## 状态（State）

| 状态 | 触发条件 | 表现 |
| --- | --- | --- |
| `idle` | 默认 | 呼吸浮动、眼睛正常、偶尔眨眼 |
| `sleep` | 闲置超过 30s | 闭眼、Zzz 冒出、整体下坠 |
| `happy` | 天气晴好 / 点赞 / 数据刷新成功 | 眼睛变弯、出现爱心 |
| `sad` | 天气恶劣 / 数据拉取失败 | 眉毛下垂、出现雨滴/阴云 |
| `working` | 番茄钟运行中 | 戴帽子/专注眼神、冒汗或计时 |

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
5. **设置面板**：⚙️ 按钮打开设置，可自定义宠物名称 / 职业 / 关联 GitHub 账号。

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
| `devpet.pet` | object | 宠物元数据（名称/职业/配色/sprites/widgets） |
| `devpet.widgetOrder` | array | Widget 拖拽排序后的顺序 |
| `devpet.githubUser` | string | 关联的 GitHub 用户名 |

## 无障碍
- 吉祥物有 `aria-label`。
- 按钮可键盘聚焦。
- 所有交互可用鼠标与键盘触发。
