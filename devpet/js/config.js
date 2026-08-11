/**
 * config.js — 配置与常量
 * DevPet 全局配置、API 端点、默认设置与离线降级数据。
 */

export const CONFIG = {
  APP_NAME: 'DevPet',
  VERSION: '1.0.0',

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
    // 仅支持公开用户；无 Key 限流严重，主要展示离线数据
    endpoint: (user) => `https://api.github.com/users/${user}/repos?sort=updated&per_page=6`,
  },

  // 番茄钟
  POMODORO: {
    work: 25 * 60,   // 25 分钟
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    cyclesBeforeLong: 4,
  },

  // 闲置进入睡眠的毫秒数
  SLEEP_AFTER_MS: 30 * 1000,

  // Widget 开关（默认全开）
  DEFAULT_WIDGETS: {
    weather: true,
    stock: true,
    crypto: true,
    github: true,
    pomodoro: true,
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
