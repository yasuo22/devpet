/**
 * codex.js — Codex token 消耗数据接入模块
 *
 * 提供真实的 Codex token 消耗数据接入能力，支持多种数据源：
 *   1. API 接入：配置 Codex API 端点（例如 OpenAI 使用量 API / 本地日志接口），
 *      定时自动拉取并累加 token 消耗。
 *   2. 手动录入：在设置面板手动输入本次消耗的 token 数（例如从 Codex 日志
 *      或 IDE 面板中看到的数据）。
 *   3. 本地持久化：累计消耗与每日记录存入 localStorage，跨会话保留。
 *
 * 数据源优先级：
 *   API > 手动录入 > 本地缓存（离线数据）
 *
 * 与猫粮系统（catfood.js）联动：addTokens() 实时把 token 换算为猫粮。
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const CODEX = CONFIG.CODEX;

/**
 * Codex 使用量状态
 * {
 *   totalTokens: number,        // 历史累计消耗 token 数（所有来源）
 *   todayTokens: number,        // 今日消耗 token 数（按自然日）
 *   lastFetchAt: number,        // 上次从 API 拉取的时间戳
 *   lastReportAt: number,       // 上次手动上报的时间戳
 *   apiEndpoint: string,        // 配置的 API 端点（可为空）
 *   apiKey: string,             // API Key（用户自管，仅存 localStorage）
 *   dailyHistory: { 'YYYY-MM-DD': number },  // 每日消耗历史
 * }
 */

const STORE_KEY = 'codexUsage';

/** 获取当前 Codex 用量状态 */
export function getCodexState() {
  const state = store.get(STORE_KEY, {
    totalTokens: 0,
    todayTokens: 0,
    lastFetchAt: 0,
    lastReportAt: Date.now(),
    apiEndpoint: '',
    apiKey: '',
    dailyHistory: {},
  });
  // 处理跨天：如果是新的一天，重置 todayTokens
  const today = todayKey();
  if (!state.dailyHistory[today] && state.todayTokens > 0) {
    // 昨天的记录已经存在，把昨天的 todayTokens 存入 dailyHistory
    const yesterday = state.lastReportAt ? new Date(state.lastReportAt).toISOString().slice(0, 10) : '';
    if (yesterday && yesterday !== today && state.todayTokens > 0) {
      state.dailyHistory[yesterday] = (state.dailyHistory[yesterday] || 0) + state.todayTokens;
    }
    state.todayTokens = 0;
    store.set(STORE_KEY, state);
  }
  // 确保 dailyHistory 始终存在
  state.dailyHistory = state.dailyHistory || {};
  return state;
}

/** 保存 Codex 用量状态 */
function saveCodexState(state) {
  store.set(STORE_KEY, state);
}

/** 获取今天的日期键（YYYY-MM-DD，本地时区） */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 上报一次 token 消耗（真实数据入口）。
 * @param {number} tokens 本次消耗的 token 数
 * @param {object} meta 可选元数据 { source: 'api'|'manual'|'file', note }
 * @returns {object} 更新后的状态
 */
export function reportTokens(tokens, meta = {}) {
  const state = getCodexState();
  const safe = Math.max(0, Math.floor(tokens || 0));
  if (safe === 0) return state;

  // 更新累计与今日
  state.totalTokens += safe;
  state.todayTokens += safe;
  state.lastReportAt = Date.now();

  // 更新每日历史
  const today = todayKey();
  state.dailyHistory[today] = (state.dailyHistory[today] || 0) + safe;

  // 记录本次事件（最多保留最近 100 条）
  if (!state.history) state.history = [];
  state.history.push({
    ts: Date.now(),
    tokens: safe,
    source: meta.source || 'manual',
    note: meta.note || '',
  });
  if (state.history.length > 100) state.history = state.history.slice(-100);

  saveCodexState(state);
  return state;
}

/**
 * 从 API 拉取 token 消耗数据。
 * 支持两种接入方式：
 *   A. OpenAI 兼容使用量 API（需 apiKey + apiEndpoint）
 *   B. 自定义 JSON API（返回 { total_tokens } 或 { data: { tokens } }）
 *
 * 配置示例（在设置面板填入）：
 *   endpoint: https://api.openai.com/v1/dashboard/billing/usage
 *   key: sk-xxxx
 *
 * @returns {Promise<object>} { ok, tokens?, error?, state }
 */
export async function fetchTokensFromApi() {
  const state = getCodexState();
  const { apiEndpoint, apiKey } = state;

  if (!apiEndpoint) {
    return { ok: false, error: '未配置 Codex API 端点', state };
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(apiEndpoint, { headers });
    if (!res.ok) {
      return { ok: false, error: `API 请求失败：HTTP ${res.status}`, state };
    }

    const data = await res.json();

    // 兼容多种返回结构
    let tokens = 0;
    if (typeof data?.total_tokens === 'number') tokens = data.total_tokens;
    else if (typeof data?.totalTokens === 'number') tokens = data.totalTokens;
    else if (typeof data?.usage?.total_tokens === 'number') tokens = data.usage.total_tokens;
    else if (typeof data?.data?.tokens === 'number') tokens = data.data.tokens;
    else if (typeof data?.tokens === 'number') tokens = data.tokens;
    else if (Array.isArray(data?.data)) {
      // 数组形式：累加每一项的 token
      tokens = data.data.reduce((sum, item) => {
        const v = item?.tokens ?? item?.total_tokens ?? item?.usage ?? 0;
        return sum + (typeof v === 'number' ? v : 0);
      }, 0);
    }

    if (tokens <= 0) {
      return { ok: false, error: 'API 返回了 0 或无效的 token 数据', state };
    }

    // 更新状态
    state.lastFetchAt = Date.now();
    saveCodexState(state);

    // 上报 token（记录来源为 api）
    const updated = reportTokens(tokens, { source: 'api', note: '自动拉取' });
    return { ok: true, tokens, state: updated };
  } catch (e) {
    return { ok: false, error: 'API 请求失败：' + e.message, state };
  }
}

/**
 * 配置 Codex API 接入信息。
 * @param {string} endpoint API 端点 URL
 * @param {string} key API Key（可空）
 */
export function configureCodexApi(endpoint, key = '') {
  const state = getCodexState();
  state.apiEndpoint = (endpoint || '').trim();
  state.apiKey = (key || '').trim();
  saveCodexState(state);
  return state;
}

/**
 * 获取最近一段时间的 token 消耗统计。
 * @param {number} days 最近 N 天（默认 7）
 * @returns {Array<{ date, tokens }>} 每日消耗数组
 */
export function getDailyHistory(days = 7) {
  const state = getCodexState();
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const tokens = state.dailyHistory[key] || 0;
    result.push({ date: key, tokens });
  }
  return result;
}

/**
 * 格式化 Codex 用量摘要文本。
 */
export function formatCodexSummary() {
  const state = getCodexState();
  const history = getDailyHistory(7);
  const total7d = history.reduce((s, h) => s + h.tokens, 0);
  const sourceLabel = state.apiEndpoint ? 'API' : (state.apiKey ? 'API Key' : '手动');

  return {
    text: `🤖 Codex 用量：累计 ${state.totalTokens.toLocaleString()} tokens`,
    detail: `今日 ${state.todayTokens.toLocaleString()} · 近7天 ${total7d.toLocaleString()} · 来源：${sourceLabel}`,
    state,
    history,
  };
}

/**
 * 初始化 Codex 用量监控。
 * 若配置了 API，则每 CODEX.REFRESH_MS（默认 10 分钟）自动拉取一次。
 * @param {object} callbacks { onSync, onError }
 * @returns {Function} 清理函数
 */
export function initCodexMonitor(callbacks = {}) {
  // 立即尝试一次同步（如果有 API 配置）
  const state = getCodexState();
  if (state.apiEndpoint) {
    fetchTokensFromApi().then((res) => {
      if (res.ok) {
        if (callbacks.onSync) callbacks.onSync(res);
      } else if (callbacks.onError) {
        callbacks.onError(res.error);
      }
    });
  }

  // 定时同步
  const timer = setInterval(() => {
    const cur = getCodexState();
    if (cur.apiEndpoint) {
      fetchTokensFromApi().then((res) => {
        if (res.ok) {
          if (callbacks.onSync) callbacks.onSync(res);
        } else if (callbacks.onError) {
          callbacks.onError(res.error);
        }
      });
    }
  }, CODEX.REFRESH_MS);

  return () => clearInterval(timer);
}

/**
 * 导出 Codex 用量数据（JSON 字符串）。
 */
export function exportCodexUsage() {
  return JSON.stringify(getCodexState(), null, 2);
}

/**
 * 导入 Codex 用量数据。
 * @param {string} json JSON 字符串
 * @returns {object} { ok, error? }
 */
export function importCodexUsage(json) {
  try {
    const data = JSON.parse(json);
    if (typeof data.totalTokens !== 'number') {
      return { ok: false, error: '无效的 Codex 用量数据（缺少 totalTokens）' };
    }
    const current = getCodexState();
    const merged = {
      ...current,
      ...data,
      // 合并 dailyHistory
      dailyHistory: { ...(current.dailyHistory || {}), ...(data.dailyHistory || {}) },
      history: [...(current.history || []), ...(data.history || [])].slice(-100),
    };
    saveCodexState(merged);
    return { ok: true, state: merged };
  } catch (e) {
    return { ok: false, error: 'JSON 解析失败：' + e.message };
  }
}

/**
 * 清空 Codex 用量记录（重置）。
 */
export function resetCodexUsage() {
  saveCodexState({
    totalTokens: 0,
    todayTokens: 0,
    lastFetchAt: 0,
    lastReportAt: Date.now(),
    apiEndpoint: '',
    apiKey: '',
    dailyHistory: {},
    history: [],
  });
  return getCodexState();
}

/** 暴露到全局（便于设置面板 / 控制台调用） */
export function exposeCodex() {
  window.DevPet = window.DevPet || {};
  Object.assign(window.DevPet, {
    codexReport: reportTokens,
    codexFetch: fetchTokensFromApi,
    codexConfig: configureCodexApi,
    codexSummary: formatCodexSummary,
    codexExport: exportCodexUsage,
    codexImport: importCodexUsage,
    codexReset: resetCodexUsage,
  });
  return window.DevPet;
}
