/**
 * config.js — 配置与常量
 * DevPet 全局配置、API 端点、默认设置与离线降级数据。
 */

export const CONFIG = {
  APP_NAME: 'DevPet',
  VERSION: '1.1.0',

  // 宠物默认名称
  PET_NAME: 'DevPet',

  // 吉祥物默认位置
  DEFAULT_POS: { x: 40, y: 40 },

  // 天气 API（无需 Key，跨域友好；失败自动降级）
  WEATHER: {
    endpoint: 'https://wttr.in/?format=j1',
    fallbackCity: '深圳',
  },

  // 加密货币行情（公开无 Key API）
  CRYPTO: {
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
    symbols: ['bitcoin', 'ethereum', 'solana', 'dogecoin'],
    currencies: ['usd', 'cny'],
  },

  // 股票行情（公共样例 API，失败降级）
  STOCK: {
    // 使用 stooq 的 CSV 接口，无需 Key
    endpoint: (symbol) => `https://stooq.com/q/l/?s=${symbol.toLowerCase()}&f=sd2t2ohlcv&h&e=csv`,
    symbols: ['AAPL', 'TSLA', 'MSFT', 'GOOGL'],
  },

  // GitHub 作品展示
  GITHUB: {
    // 默认关联的 GitHub 用户名（可在设置面板修改并持久化）
    defaultUser: 'octocat',
    // 仅支持公开用户；无 Key 限流严重，主要展示离线数据
    endpoint: (user) => `https://api.github.com/users/${user}/repos?sort=updated&per_page=6`,
    // 最近提交
    eventsEndpoint: (user) => `https://api.github.com/users/${user}/events/public?per_page=10`,
    // 用户信息
    userEndpoint: (user) => `https://api.github.com/users/${user}`,
  },

  // 番茄钟
  POMODORO: {
    work: 25 * 60,   // 25 分钟
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    cyclesBeforeLong: 4,
  },

  // 闲置进入睡眠的毫秒数（默认 30s，狸花猫模式下为 15 分钟）
  SLEEP_AFTER_MS: 30 * 1000,
  // 彩色狸花猫模式的闲置睡眠超时：15 分钟无输入 → 睡觉
  CAT_SLEEP_AFTER_MS: 15 * 60 * 1000,

  // Widget 元信息（标题 / 图标 / 说明，供渲染与排序使用）
  WIDGET_META: {
    weather: { title: '天气', icon: '🌤️' },
    stock: { title: '股票行情', icon: '📈' },
    crypto: { title: '加密货币', icon: '₿' },
    github: { title: 'GitHub 作品', icon: '🐙' },
    pomodoro: { title: '番茄钟', icon: '🍅' },
    catfood: { title: '猫粮', icon: '🐟' },
  },

  // Widget 开关（默认全开）
  DEFAULT_WIDGETS: {
    weather: true,
    stock: true,
    crypto: true,
    github: true,
    pomodoro: true,
    catfood: true,
  },

  // Widget 默认顺序（用于拖拽排序的初始值）
  DEFAULT_WIDGET_LIST: ['weather', 'stock', 'crypto', 'github', 'pomodoro', 'catfood'],

  // 贡献热图配置
  CONTRIBUTIONS: {
    // GitHub 用户主页贡献图（SVG，无需 Key 但有限流）
    endpoint: (user) => `https://github.com/users/${user}/contributions`,
    // 离线降级热图数据（28 天）
    offlineDays: 28,
  },

  // 离线降级：默认天气
  OFFLINE_WEATHER: {
    current: { temp_c: 24, condition: { text: '多云' }, is_day: 'yes' },
    forecast: [
      { date: '今日', avgtemp_c: 24, condition: { text: '多云' } },
      { date: '明日', avgtemp_c: 25, condition: { text: '晴' } },
    ],
  },

  // 离线降级：股票
  OFFLINE_STOCK: [
    { symbol: 'AAPL', name: 'Apple', price: 188.42, change: 1.24, changePercent: 0.66 },
    { symbol: 'TSLA', name: 'Tesla', price: 246.71, change: -3.05, changePercent: -1.22 },
    { symbol: 'MSFT', name: 'Microsoft', price: 417.88, change: 2.11, changePercent: 0.51 },
  ],

  // 离线降级：加密货币
  OFFLINE_CRYPTO: [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', usd: 64321, cny: 466000, change24h: 2.3 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', usd: 3380, cny: 24500, change24h: 1.1 },
    { id: 'solana', symbol: 'SOL', name: 'Solana', usd: 148, cny: 1072, change24h: -0.8 },
  ],

  // 离线降级：GitHub 作品
  OFFLINE_REPOS: [
    { name: 'DevPet', description: '桌面开发者宠物应用', language: 'JavaScript', stargazers_count: 0 },
    { name: 'awesome-tools', description: '开发者工具合集', language: 'Markdown', stargazers_count: 128 },
    { name: 'react-starter', description: 'React 脚手架模板', language: 'TypeScript', stargazers_count: 45 },
  ],

  // 主题市场：内置预设宠物主题（社区可分享/导入更多）
  PRESET_PETS: [
    {
      name: 'DevPet',
      preset: 'classic',
      gender: 'other',
      occupation: '开发者伙伴',
      personality: '开朗',
      color: { body: '#ffd88f', dark: '#f0b866' },
      sprites: { idle: '', sleep: '💤', happy: '❤️', sad: '🌧️', working: '💻' },
    },
    {
      name: '蓝莓',
      preset: 'tech',
      gender: 'male',
      occupation: '系统工程师',
      personality: '沉稳',
      color: { body: '#7aa2f7', dark: '#3d59c1' },
      sprites: { idle: '', sleep: '💤', happy: '⚡', sad: '🌧️', working: '🤖' },
    },
    {
      name: '桃桃',
      preset: 'cute',
      gender: 'female',
      occupation: '前端设计师',
      personality: '元气',
      color: { body: '#ffb3c8', dark: '#e77fa0' },
      sprites: { idle: '', sleep: '💤', happy: '🌸', sad: '🌧️', working: '🎨' },
    },
    {
      name: '芽芽',
      preset: 'nature',
      gender: 'other',
      occupation: '开源贡献者',
      personality: '温和',
      color: { body: '#9be08a', dark: '#57a04a' },
      sprites: { idle: '', sleep: '💤', happy: '🍀', sad: '🌧️', working: '🌱' },
    },
    {
      name: '小夜',
      preset: 'midnight',
      gender: 'other',
      occupation: '后端架构师',
      personality: '专注',
      color: { body: '#c9b8ff', dark: '#7a5fd0' },
      sprites: { idle: '', sleep: '💤', happy: '✨', sad: '🌧️', working: '🌙' },
    },
    {
      name: '花狸',
      preset: 'tabby',
      gender: 'other',
      occupation: '代码守护猫',
      personality: '活泼',
      color: { body: '#d9a066', dark: '#8b5e34', stripe: '#6b4423', belly: '#f5e6d0' },
      colorExt: { stripe: '#6b4423', belly: '#f5e6d0' },
      sprites: { idle: '', sleep: '💤', happy: '🦋', sad: '🌧️', working: '💻' },
    },
  ],

  // 通知服务（Webhook 集成，用户自管 URL）
  NOTIFY: {
    // 各渠道支持的 webhook 说明
    channels: ['discord', 'slack', 'telegram'],
    // 各渠道事件模板标题（用于 Webhook 消息）
    messages: {
      pomodoro: '🍅 番茄钟提醒',
      like: '❤️ 收到点赞',
      collab: '🤝 协作邀请',
      boot: '🚀 宠物已启动',
    },
  },

  // 协作模式（本地状态 + 分享链接，无服务端）
  COLLAB: {
    statuses: ['online', 'busy', 'away'],
    // 默认项目信息
    defaultProject: 'DevPet',
  },

  // ============================================================
  // Codex token 用量接入
  // ============================================================
  CODEX: {
    // 自动拉取 API 数据的刷新间隔（默认 10 分钟）
    REFRESH_MS: 10 * 60 * 1000,
    // 存储 key
    STORE_KEY: 'codexUsage',
  },

  // ============================================================
  // 宠物成长系统（亲密度 / 经验 / 等级）
  // ============================================================
  GROWTH: {
    // 每级基础经验（第 1 级需要这么多 XP）
    BASE_XP: 100,
    // 等级经验增长系数（每级所需 = BASE_XP * GROWTH ^ (level-1)）
    LEVEL_GROWTH: 1.4,

    // 亲密度自然衰减：超过 6 小时未互动开始衰减
    INTIMACY_DECAY_MS: 6 * 60 * 60 * 1000,
    // 衰减速度：每分钟减少的亲密度
    INTIMACY_DECAY_PER_MIN: 0.05,
    // 单次触发最大衰减量
    INTIMACY_DECAY_CAP: 10,

    // 投喂：每克获得 X XP（最少 2 XP）
    XP_PER_FEED: 2,
    // 投喂：每多少克猫粮获得 1 XP
    FEED_XP_PER_GRAM: 10,
    // 单次投喂最多获得 XP
    MAX_XP_PER_FEED: 50,

    // 互动（点赞/点击）获得
    INTERACT_XP: 5,
    INTERACT_INTIMACY: 1,

    // 番茄钟专注：每分钟获得 XP
    FOCUS_XP_PER_MIN: 3,
    // 完成一次专注会话获得亲密度
    FOCUS_INTIMACY: 3,

    // 等级称号
    LEVEL_TITLES: [
      { minLevel: 1, title: '🐣 幼崽' },
      { minLevel: 3, title: '🐾 成长中' },
      { minLevel: 5, title: '🐱 活跃伙伴' },
      { minLevel: 8, title: '🦁 得力助手' },
      { minLevel: 12, title: '🐯 开发守护神' },
      { minLevel: 16, title: '👑 传奇伙伴' },
    ],

    // 猫粮档次解锁等级
    TIER_UNLOCK_LEVELS: [
      { tier: 'kibble', level: 1 },
      { tier: 'salmon', level: 3 },
      { tier: 'tuna', level: 6 },
      { tier: 'wagyu', level: 10 },
    ],

    // 存储 key
    STORE_KEY: 'growth',
  },

  // ============================================================
  // 猫粮购买交易系统（token 货币 → 购买不同档次猫粮）
  // ============================================================
  CATFOOD: {
    // 猫粮存量上限（克），满格表示吃饱
    MAX_FOOD: 100,
    // 每隔多少毫秒需要喂食（默认 4 小时）
    FEED_INTERVAL_MS: 4 * 60 * 60 * 1000,
    // 专注模式下喂食间隔延长倍数（消耗变慢）
    FOCUS_INTERVAL_MULTIPLIER: 1.5,
    // 饥饿警告阈值（低于此值提醒投喂）
    HUNGRY_THRESHOLD: 30,
    // 存储 key
    STORE_KEY: 'catfood',

    // 猫粮档次（token 货币购买，pricePerGram = 每克 token 价）
    TIERS: [
      {
        id: 'kibble',
        name: '基础猫粮',
        icon: '🌾',
        pricePerGram: 1,
        desc: '普通干粮，经济实惠，1 token/克',
        intimacyBonus: 1,   // 亲密度加成倍率
      },
      {
        id: 'salmon',
        name: '三文鱼猫粮',
        icon: '🐟',
        pricePerGram: 2,
        desc: '优质三文鱼配方，2 token/克',
        intimacyBonus: 1.5,
      },
      {
        id: 'tuna',
        name: '金枪鱼猫粮',
        icon: '🍣',
        pricePerGram: 5,
        desc: '豪华金枪鱼盛宴，5 token/克',
        intimacyBonus: 2,
      },
      {
        id: 'wagyu',
        name: '和牛猫粮',
        icon: '🥩',
        pricePerGram: 10,
        desc: '顶级和牛特供，10 token/克，亲密度翻倍',
        intimacyBonus: 3,
      },
    ],
  },

  // 彩色狸花猫活动追踪
  CAT_ACTIVITY: {
    // 检测输入活动的元素选择器
    ACTIVITY_EVENTS: ['keydown', 'mousedown', 'touchstart', 'scroll', 'input', 'click', 'pointermove'],
    // 追蝴蝶动画时长（毫秒）
    BUTTERFLY_DURATION_MS: 8000,
    // 蝴蝶移动范围（相对于宠物）
    BUTTERFLY_RADIUS: 120,
    // 存储 key
    STORE_KEY: 'catActivity',
  },
};

/** 天气 → 宠物情绪映射 */
export const WEATHER_MOOD = {
  sunny: 'happy',
  clear: 'happy',
  partly: 'idle',
  cloudy: 'idle',
  overcast: 'idle',
  rain: 'sad',
  drizzle: 'sad',
  snow: 'sad',
  thunder: 'sad',
  fog: 'idle',
  hot: 'happy',
  cold: 'sad',
  default: 'idle',
};
