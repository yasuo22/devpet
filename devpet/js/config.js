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
  // 猫粮系统（Codex token 消耗 → 猫粮积累 → 定时喂食）
  // ============================================================
  CATFOOD: {
    // 每消耗多少 token 积累 1 克猫粮
    TOKENS_PER_GRAM: 1000,
    // 猫粮饥饿度上限（克），满格表示吃饱
    MAX_FOOD: 100,
    // 每隔多少毫秒需要喂食（默认 4 小时）
    FEED_INTERVAL_MS: 4 * 60 * 60 * 1000,
    // 饥饿警告阈值（低于此值提醒投喂）
    HUNGRY_THRESHOLD: 30,
    // 存储 key
    STORE_KEY: 'catfood',
    // 不同猫粮档次（按 token 消耗定价）
    TIERS: [
      { id: 'kibble', name: '基础猫粮', pricePerGram: 1, minTokens: 0, desc: '普通干粮，token 消耗 0~10k' },
      { id: 'salmon', name: '三文鱼猫粮', pricePerGram: 2, minTokens: 10000, desc: '优质猫粮，token 消耗 10k~50k' },
      { id: 'tuna', name: '金枪鱼猫粮', pricePerGram: 5, minTokens: 50000, desc: '豪华猫粮，token 消耗 50k~100k' },
      { id: 'wagyu', name: '和牛猫粮', pricePerGram: 10, minTokens: 100000, desc: '顶级猫粮，token 消耗 100k+' },
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
