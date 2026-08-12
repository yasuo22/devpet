/**
 * DevPet ChatGPT Plugin — 后端 API 服务
 * ------------------------------------------------------------------
 * 让 ChatGPT（GPT Actions / 插件）通过 HTTP 接口直接调用 DevPet 的能力：
 *   - 天气 / 股票 / 加密货币实时行情（含汇率换算）
 *   - GitHub 作品 / 贡献热图 / 最近提交
 *   - 宠物配置 / 主题预设 / 状态
 *   - Codex token 上报 / 猫粮钱包 / 投喂 / 成长
 *   - 番茄钟状态与计划
 *
 * 零依赖：仅用 Node 内置 http / https，`node server.js` 即可运行，
 * 可部署到任意 Node 环境（Vercel / Railway / 云服务器 / 本地内网穿透 / Docker）。
 *
 * 提供两种启动方式：
 *   1) `node server.js`           —— 独立 HTTP 服务（自建 / 云服务器）
 *   2) `node server.js vercel`    —— 导出 handler 给 Vercel Serverless 使用
 */

import http from 'node:http';
import https from 'node:https';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* =====================================================================
 * 配置
 * ===================================================================== */
const PORT = process.env.PORT || 8787;
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS) || 8000;
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS) || 60_000; // 外部数据缓存 60s
const MAX_BODY_KB = 64; // 请求体上限

/* =====================================================================
 * 简单本地持久化（猫粮钱包 / token 用量 / 成长），生产可用数据库替换
 * ===================================================================== */
const STORE_FILE = process.env.STORE_FILE || join(__dirname, '.devpet-store.json');
const DEFAULT_STORE = {
  wallet: { balance: 0, totalFed: 0, lastFedAt: 0 },
  tokenUsage: { total: 0, byDate: {} },
  pet: { name: 'DevPet', kind: 'tabby', mood: 'idle' },
  growth: { level: 1, xp: 0, affinity: 0, lastCareAt: 0 },
};
function loadStore() {
  if (existsSync(STORE_FILE)) {
    try { return { ...DEFAULT_STORE, ...JSON.parse(readFileSync(STORE_FILE, 'utf8')) }; } catch {/* ignore */}
  }
  return structuredClone(DEFAULT_STORE);
}
function saveStore(s) {
  try { writeFileSync(STORE_FILE, JSON.stringify(s, null, 2)); } catch {/* ignore */}
}
let store = loadStore();

/* =====================================================================
 * 简易内存缓存（减少外部 API 限流与延迟）
 * ===================================================================== */
const cache = new Map();
async function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  return v;
}

/* =====================================================================
 * 外部数据源
 * ===================================================================== */
function httpGet(url, { json = true, csv = false, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: TIMEOUT_MS, headers: { 'User-Agent': 'devpet-chatgpt-plugin', ...headers } }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        if (csv) return resolve(raw);
        try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/* 天气：wttr.in（无需 Key，支持更多参数） */
async function fetchWeather(city = '深圳', unit = 'c') {
  try {
    const u = unit === 'f' ? '?format=j1&u' : '?format=j1';
    const data = await cached(`w:${city}:${unit}`, CACHE_TTL_MS, () =>
      httpGet(`https://wttr.in/${encodeURIComponent(city)}${u}`));
    const cur = data?.current_condition?.[0] || {};
    const temp = unit === 'f' ? cur.temp_F : cur.temp_C;
    const feels = unit === 'f' ? cur.FeelsLikeF : cur.FeelsLikeC;
    return {
      city,
      unit: unit === 'f' ? 'F' : 'C',
      offline: false,
      current: {
        temp: temp ?? 0,
        feels_like: feels ?? temp ?? 0,
        condition: cur.weatherDesc?.[0]?.value || '未知',
        humidity: cur.humidity || 0,
        wind_kph: cur.windspeedKmph || 0,
        wind_dir: cur.winddir16Point || '',
        visibility_km: cur.visibility || 0,
        uv_index: cur.uvIndex || 0,
        local_time: cur.localObsDateTime || '',
      },
      forecast: (data?.weather || []).slice(0, 5).map((d) => ({
        date: d.date,
        maxTemp: unit === 'f' ? d.maxtempF : d.maxtempC,
        minTemp: unit === 'f' ? d.mintempF : d.mintempC,
        condition: d.hourly?.[0]?.weatherDesc?.[0]?.value || '未知',
        chanceOfRain: d.hourly?.[0]?.chanceofrain || '0',
      })),
    };
  } catch {
    return { city, unit: unit === 'f' ? 'F' : 'C', offline: true, current: { temp: unit === 'f' ? 79 : 26, condition: '多云' }, forecast: [] };
  }
}

/* 加密货币：CoinGecko（支持更多币种 + 单币查询） */
const COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'dogecoin', 'bnb', 'ripple', 'cardano', 'polkadot', 'litecoin', 'avalanche-2', 'polygon', 'chainlink'];
async function fetchCrypto(ids) {
  const list = (ids && ids.length ? ids : COIN_IDS).slice(0, 20);
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${list.join(',')}&vs_currencies=usd,cny&include_24hr_change=true&include_market_cap=true`;
    const data = await cached(`crypto:${list.join(',')}`, CACHE_TTL_MS, () => httpGet(url));
    return {
      offline: false,
      list: list.map((id) => ({
        id, name: cap(id.replace(/-/g, ' ')), symbol: id.slice(0, 3).toUpperCase(),
        usd: data[id]?.usd ?? 0, cny: data[id]?.cny ?? 0,
        change24h: data[id]?.usd_24h_change ?? 0,
        marketCapUsd: data[id]?.usd_market_cap ?? 0,
      })),
    };
  } catch {
    return { offline: true, list: [] };
  }
}

/* 股票：Stooq CSV（支持自定义 symbol 列表） */
const DEFAULT_STOCKS = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'MSTR'];
async function fetchStocks(symbols) {
  const list = (symbols && symbols.length ? symbols : DEFAULT_STOCKS).slice(0, 20);
  try {
    const out = [];
    for (const s of list) {
      try {
        const text = await httpGet(`https://stooq.com/q/l/?s=${s.toLowerCase()}&f=sd2t2ohlcv&h&e=csv`, { csv: true });
        const lines = text.trim().split('\n');
        if (lines.length < 2) continue;
        const [, date, , open, high, low, , close, vol] = lines[1].split(',');
        out.push({ symbol: s.toUpperCase(), price: parseFloat(close) || 0, open: parseFloat(open), high: parseFloat(high), low: parseFloat(low), volume: vol, date });
      } catch {/* skip single symbol */}
    }
    return { offline: out.length === 0, list: out };
  } catch {
    return { offline: true, list: [] };
  }
}

/* 汇率换算：open.er-api.com（免费，无需 Key） */
async function fetchFx(from, to) {
  try {
    const data = await cached(`fx:${from}:${to}`, CACHE_TTL_MS, () => httpGet(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`));
    const rate = data?.rates?.[to];
    return { offline: false, base: from, quote: to, rate: rate ?? null, updated: data?.time_last_update_utc || null };
  } catch {
    return { offline: true, base: from, quote: to, rate: null };
  }
}

/* GitHub：用户信息 / 仓库 / 事件 / 贡献热图 */
async function fetchGithub(user) {
  const u = encodeURIComponent(user || 'octocat');
  const out = { user, offline: false };
  try {
    const [info, repos, events, contrib] = await Promise.all([
      httpGet(`https://api.github.com/users/${u}`).catch(() => null),
      httpGet(`https://api.github.com/users/${u}/repos?sort=updated&per_page=6`).catch(() => []),
      httpGet(`https://api.github.com/users/${u}/events/public?per_page=10`).catch(() => []),
      httpGet(`https://github-contributions.vercel.app/api/v1/${u}`).catch(() => null),
    ]);
    out.profile = info && {
      login: info.login, name: info.name, avatar: info.avatar_url,
      bio: info.bio, followers: info.followers, following: info.following,
      public_repos: info.public_repos, html_url: info.html_url,
      company: info.company, location: info.location,
    };
    out.repos = (repos || []).map((r) => ({
      name: r.name, description: r.description, language: r.language,
      stars: r.stargazers_count, forks: r.forks_count, updated_at: r.updated_at, html_url: r.html_url,
      homepage: r.homepage || null,
    }));
    out.recentActivity = (events || []).slice(0, 6).map((e) => ({
      type: e.type, repo: e.repo?.name,
      created_at: e.created_at,
      payload: e.payload?.commits?.[0]?.message || e.payload?.ref || e.type,
    }));
    // 贡献热图（解析为最近 53 周网格）
    if (contrib && contrib.total && contrib.contributions) {
      out.contributions = {
        total: contrib.total,
        weeks: (contrib.contributions || []).map((w) => ({
          start: w.start,
          count: (w.contributionDays || []).reduce((s, d) => s + (d.contributionCount || 0), 0),
          days: (w.contributionDays || []).map((d) => ({ date: d.date, count: d.contributionCount })),
        })),
      };
    } else {
      out.contributions = null;
    }
    return out;
  } catch {
    out.offline = true;
    return out;
  }
}

/* =====================================================================
 * 工具函数
 * ===================================================================== */
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function baseUrl() { return process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`; }
function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(s),
  });
  res.end(s);
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_KB * 1024) { req.destroy(); return; }
      d += c;
    });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
  });
}
function parseList(str) {
  if (!str) return [];
  return str.split(',').map((s) => s.trim()).filter(Boolean);
}

// 猫粮档次（与前端 config.js 对齐）
const CATFOOD_TIERS = [
  { id: 'basic', name: '基础猫粮', price: 100, xp: 5, desc: '日常口粮' },
  { id: 'salmon', name: '三文鱼猫粮', price: 300, xp: 15, desc: '富含 Omega-3' },
  { id: 'tuna', name: '金枪鱼猫粮', price: 800, xp: 40, desc: '猫咪最爱' },
  { id: 'wagyu', name: '和牛猫粮', price: 2000, xp: 100, desc: '奢华享受' },
];

// 番茄钟默认计划
const POMODORO_PLAN = { work: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60, cyclesBeforeLong: 4 };

/* =====================================================================
 * 路由
 * ===================================================================== */
const routes = {
  'GET /health': () => ({
    ok: true, service: 'devpet-chatgpt-plugin', version: '1.1.0',
    uptime: Math.floor(process.uptime()), time: new Date().toISOString(),
    endpoints: Object.keys(routes),
  }),

  'GET /': () => ({
    service: 'DevPet ChatGPT Plugin',
    version: '1.1.0',
    docs: baseUrl() + '/openapi.json',
    endpoints: Object.keys(routes).sort(),
  }),

  'GET /weather': async (q) => ({ ...(await fetchWeather(q.city, q.unit)), plugin: 'devpet' }),

  'GET /market/crypto': async (q) => fetchCrypto(parseList(q.ids)),
  'GET /market/crypto/:id': async (q, p) => fetchCrypto([p.id]),

  'GET /market/stock': async (q) => fetchStocks(parseList(q.symbols)),

  'GET /fx': async (q) => fetchFx((q.from || 'USD').toUpperCase(), (q.to || 'CNY').toUpperCase()),

  'GET /github': async (q) => ({ ...(await fetchGithub(q.user)), plugin: 'devpet' }),
  'GET /github/contributions': async (q) => {
    const g = await fetchGithub(q.user);
    return { user: g.user, offline: g.offline, contributions: g.contributions };
  },

  'GET /pet/config': () => ({
    pet: store.pet,
    presets: [
      { kind: 'tabby', name: '彩色狸花猫' },
      { kind: 'cat', name: '橘猫' },
      { kind: 'cat-black', name: '黑猫' },
      { kind: 'dog', name: '柴犬' },
      { kind: 'fox', name: '狐狸' },
      { kind: 'penguin', name: '企鹅' },
    ],
    catfoodTiers: CATFOOD_TIERS,
    pomodoro: POMODORO_PLAN,
  }),

  'GET /pet/status': () => ({
    pet: store.pet,
    wallet: store.wallet,
    tokenUsage: { total: store.tokenUsage.total, today: store.tokenUsage.byDate[new Date().toISOString().slice(0, 10)] || 0 },
    growth: store.growth,
  }),

  'GET /pet/wallet': () => ({
    balance: store.wallet.balance,
    totalFed: store.wallet.totalFed,
    lastFedAt: store.wallet.lastFedAt || null,
    tokenUsage: store.tokenUsage.total,
    todayTokens: store.tokenUsage.byDate[new Date().toISOString().slice(0, 10)] || 0,
    growth: store.growth || { level: 1, xp: 0, affinity: 0 },
  }),

  'POST /pet/report-token': async (req) => {
    const body = await req.body;
    const amount = Math.max(0, Number(body.tokens) || 0);
    const date = new Date().toISOString().slice(0, 10);
    store.tokenUsage.total += amount;
    store.tokenUsage.byDate[date] = (store.tokenUsage.byDate[date] || 0) + amount;
    // 1000 token = 1g 猫粮积累
    store.wallet.balance = Math.round((store.tokenUsage.total / 1000) * 100) / 100;
    saveStore(store);
    return { ok: true, tokens: store.tokenUsage.total, todayTokens: store.tokenUsage.byDate[date], catfoodGrams: store.wallet.balance };
  },

  'POST /pet/feed': async (req) => {
    const body = await req.body;
    const tier = CATFOOD_TIERS.find((t) => t.id === body.tier) || CATFOOD_TIERS[0];
    if (!body.payWithTokens) {
      return { ok: false, error: '需使用 token 支付（payWithTokens: true）', tier };
    }
    store.wallet.totalFed += 1;
    store.wallet.lastFedAt = Date.now();
    store.growth = store.growth || { level: 1, xp: 0, affinity: 0 };
    store.growth.xp += tier.xp;
    store.growth.affinity = Math.min(100, (store.growth.affinity || 0) + tier.xp);
    store.growth.level = Math.floor(store.growth.xp / 100) + 1;
    store.growth.lastCareAt = Date.now();
    store.pet.mood = 'happy';
    saveStore(store);
    return { ok: true, fed: tier.name, xp: tier.xp, growth: store.growth, wallet: store.wallet };
  },

  'POST /pet/rename': async (req) => {
    const body = await req.body;
    const name = String(body.name || '').trim().slice(0, 30);
    if (!name) return { ok: false, error: 'name 不能为空' };
    store.pet.name = name;
    saveStore(store);
    return { ok: true, pet: store.pet };
  },

  'GET /pomodoro': () => ({
    plan: POMODORO_PLAN,
    hint: '番茄钟为本地计时器，插件侧提供工作/休息时长计划；实际倒计时由前端执行。',
  }),
};

/* =====================================================================
 * 请求处理核心（独立出来供 Serverless 复用）
 * ===================================================================== */
async function handleRequest(method, rawUrl, reqBody) {
  const url = new URL(rawUrl, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const query = Object.fromEntries(url.searchParams);
  const m = method.toUpperCase();

  // 参数化路由匹配：/market/crypto/:id
  const segments = path.split('/').filter(Boolean); // e.g. ['market','crypto','bitcoin']
  let handler = routes[`${m} ${path}`];
  let params = {};
  if (!handler) {
    for (const key of Object.keys(routes)) {
      const [mk, rp] = key.split(' ');
      if (mk !== m) continue;
      const rSeg = rp.split('/').filter(Boolean);
      if (rSeg.length !== segments.length) continue;
      const match = rSeg.every((s, i) => s.startsWith(':') || s === segments[i]);
      if (match) {
        handler = routes[key];
        params = {};
        rSeg.forEach((s, i) => { if (s.startsWith(':')) params[s.slice(1)] = segments[i]; });
        break;
      }
    }
  }

  if (!handler) {
    return { status: 404, body: { ok: false, error: 'Not found', available: Object.keys(routes).sort() } };
  }
  try {
    const out = await handler({ body: Promise.resolve(reqBody || {}) }, { ...query, ...params }, { query, params });
    return { status: 200, body: out };
  } catch (e) {
    return { status: 500, body: { ok: false, error: String((e && e.message) || e) } };
  }
}

/* =====================================================================
 * 独立 HTTP 服务
 * ===================================================================== */
function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' });
      return res.end();
    }

    // 暴露 openapi 与 manifest 便于发现
    if (req.method === 'GET' && (url.pathname === '/openapi.json' || url.pathname === '/.well-known/ai-plugin.json')) {
      return json(res, 200, url.pathname.includes('ai-plugin') ? manifest() : openapi());
    }

    const body = req.method === 'POST' ? await readBody(req) : {};
    const { status, body: out } = await handleRequest(req.method, req.url, body);
    return json(res, status, out);
  });

  server.listen(PORT, () => {
    console.log(`DevPet ChatGPT Plugin listening on http://localhost:${PORT}`);
    console.log(`  OpenAPI:   http://localhost:${PORT}/openapi.json`);
    console.log(`  Manifest:  http://localhost:${PORT}/.well-known/ai-plugin.json`);
  });
}

/* =====================================================================
 * Vercel / Serverless 支持
 * ===================================================================== */
export async function handler(req, res) {
  const body = req.method === 'POST' ? await readBody(req) : {};
  const { status, body: out } = await handleRequest(req.method, req.url, body);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(out));
}

// 兼容 Vercel 通过默认导出调用（@vercel/node 也可识别 default export）
export default handler;

/* =====================================================================
 * OpenAPI / Manifest（供 ChatGPT 自动发现）
 * ===================================================================== */
function openapi() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DevPet Plugin', version: '1.1.0',
      description: 'DevPet 开发者桌面宠物插件 —— 提供天气、股票/加密货币行情、汇率换算、GitHub 作品/贡献、宠物状态/猫粮、番茄钟等能力，供 ChatGPT 直接调用。',
    },
    servers: [{ url: baseUrl() }],
    paths: {
      '/weather': { get: { operationId: 'getWeather', summary: '查询天气（含未来5天预报）', parameters: [
        { name: 'city', in: 'query', schema: { type: 'string' }, description: '城市名，如 深圳' },
        { name: 'unit', in: 'query', schema: { type: 'string', enum: ['c', 'f'] }, description: '温度单位：c=摄氏 f=华氏' },
      ], responses: { '200': { description: '天气信息' } } } },
      '/market/crypto': { get: { operationId: 'getCrypto', summary: '加密货币行情', parameters: [
        { name: 'ids', in: 'query', schema: { type: 'string' }, description: '币种 id 逗号分隔，如 bitcoin,ethereum' },
      ], responses: { '200': { description: '加密行情' } } } },
      '/market/stock': { get: { operationId: 'getStock', summary: '股票行情', parameters: [
        { name: 'symbols', in: 'query', schema: { type: 'string' }, description: '股票代码逗号分隔，如 AAPL,TSLA' },
      ], responses: { '200': { description: '股票行情' } } } },
      '/fx': { get: { operationId: 'getFx', summary: '汇率换算', parameters: [
        { name: 'from', in: 'query', schema: { type: 'string' }, description: '基准货币，如 USD' },
        { name: 'to', in: 'query', schema: { type: 'string' }, description: '目标货币，如 CNY' },
      ], responses: { '200': { description: '汇率' } } } },
      '/github': { get: { operationId: 'getGithub', summary: 'GitHub 用户作品/贡献/最近活动', parameters: [
        { name: 'user', in: 'query', schema: { type: 'string' }, description: 'GitHub 用户名' },
      ], responses: { '200': { description: 'GitHub 数据' } } } },
      '/github/contributions': { get: { operationId: 'getGithubContributions', summary: 'GitHub 用户贡献热图', parameters: [
        { name: 'user', in: 'query', schema: { type: 'string' }, description: 'GitHub 用户名' },
      ], responses: { '200': { description: '贡献热图数据' } } } },
      '/pet/config': { get: { operationId: 'getPetConfig', summary: '宠物配置与主题预设', responses: { '200': { description: '宠物配置' } } } },
      '/pet/status': { get: { operationId: 'getPetStatus', summary: '宠物完整状态', responses: { '200': { description: '宠物状态' } } } },
      '/pet/wallet': { get: { operationId: 'getWallet', summary: '猫粮钱包与成长状态', responses: { '200': { description: '钱包状态' } } } },
      '/pet/report-token': { post: { operationId: 'reportToken', summary: '上报 Codex token 消耗', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tokens: { type: 'number' } }, required: ['tokens'] } } } }, responses: { '200': { description: '上报结果' } } } },
      '/pet/feed': { post: { operationId: 'feedPet', summary: '投喂猫粮（消耗 token）', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { tier: { type: 'string', enum: ['basic', 'salmon', 'tuna', 'wagyu'] }, payWithTokens: { type: 'boolean' } } } } } }, responses: { '200': { description: '投喂结果' } } } },
      '/pet/rename': { post: { operationId: 'renamePet', summary: '给宠物改名', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } }, responses: { '200': { description: '改名结果' } } } },
      '/pomodoro': { get: { operationId: 'getPomodoro', summary: '番茄钟计划', responses: { '200': { description: '番茄钟计划' } } } },
      '/health': { get: { operationId: 'health', summary: '健康检查', responses: { '200': { description: 'ok' } } } },
    },
  };
}

function manifest() {
  return {
    schema_version: 'v1',
    name_for_human: 'DevPet',
    name_for_model: 'devpet',
    description_for_human: 'DevPet 开发者桌面宠物插件，提供天气、行情、汇率、GitHub 作品/贡献、宠物状态、猫粮与番茄钟能力。',
    description_for_model: 'DevPet plugin for ChatGPT. Provides weather (with forecast), stock/crypto quotes, FX conversion, GitHub user repos & contributions heatmap, pet (DevPet mascot) config & catfood wallet, codex token reporting, pet feeding/renaming, and pomodoro plan. Use this plugin when the user asks about DevPet, pet status, weather, market quotes, FX, GitHub portfolio, contributions, or pomodoro.',
    auth: { type: 'none' },
    api: { type: 'openapi', url: baseUrl() + '/openapi.json' },
    logo_url: process.env.LOGO_URL || 'https://cnb.cool/uzi999-2026/DevPet/-/raw/main/devpet/assets/favicon.svg',
    contact_email: process.env.CONTACT_EMAIL || 'devpet@example.com',
    legal_info_url: process.env.LEGAL_URL || 'https://cnb.cool/uzi999-2026/DevPet',
  };
}

// 直接运行时启动服务；被 Vercel 导入时作为 handler
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
