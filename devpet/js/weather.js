/**
 * weather.js — 天气模块（API + 离线降级）
 * 尝试请求公开天气 API，失败或超时则使用 config 中的离线数据。
 */

import { CONFIG } from './config.js';

const TIMEOUT_MS = 6000;

/**
 * 拉取天气数据。
 * 优先使用 wttr.in（无需 Key），失败降级到离线数据。
 * @returns {Promise<{current: object, forecast: Array}>}
 */
export async function fetchWeather() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(CONFIG.WEATHER.endpoint, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('weather http ' + res.status);
    const data = await res.json();
    return normalize(data);
  } catch (e) {
    // 离线降级
    return normalizeOffline();
  }
}

/** 将 wttr.in 返回的数据归一化 */
function normalize(data) {
  const cur = (data.current_condition && data.current_condition[0]) || {};
  const forecast = (data.weather || []).slice(0, 3).map((d) => ({
    date: d.date,
    avgtemp_c: d.avgtemp_c,
    maxTemp: (d.maxtempC || 0),
    minTemp: (d.mintempC || 0),
    condition: { text: (d.hourly && d.hourly[0]?.weatherDesc?.[0]?.value) || '未知' },
  }));
  return {
    current: {
      temp_c: cur.temp_C || 0,
      feels_like: cur.FeelsLikeC || cur.temp_C || 0,
      condition: { text: cur.weatherDesc?.[0]?.value || '未知', code: cur.weatherCode },
      is_day: cur.isday === 'yes',
      humidity: cur.humidity,
    },
    forecast,
    city: CONFIG.WEATHER.fallbackCity,
    offline: false,
  };
}

/** 返回离线降级数据 */
function normalizeOffline() {
  return {
    ...CONFIG.OFFLINE_WEATHER,
    city: CONFIG.WEATHER.fallbackCity,
    offline: true,
  };
}
