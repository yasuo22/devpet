/**
 * market.js — 股票 / 加密货币行情
 * 加密货币用 CoinGecko 公开 API，股票用 Stooq CSV，均带离线降级。
 */

import { CONFIG } from './config.js';

const TIMEOUT_MS = 6000;

/* ---------- 加密货币 ---------- */
export async function fetchCrypto() {
  try {
    const ids = CONFIG.CRYPTO.symbols.join(',');
    const vs = CONFIG.CRYPTO.currencies.join(',');
    const url = `${CONFIG.CRYPTO.endpoint}?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('crypto http ' + res.status);
    const data = await res.json();
    const list = CONFIG.CRYPTO.symbols.map((id) => {
      const it = data[id] || {};
      return {
        id,
        symbol: id.slice(0, 3).toUpperCase(),
        name: cap(id),
        usd: it.usd ?? 0,
        cny: it.cny ?? 0,
        change24h: it.usd_24h_change ?? 0,
      };
    });
    return { list, offline: false };
  } catch (e) {
    return { list: CONFIG.OFFLINE_CRYPTO, offline: true };
  }
}

/* ---------- 股票 ---------- */
export async function fetchStocks() {
  try {
    const tasks = CONFIG.STOCK.symbols.map((s) => fetchOneStock(s));
    const list = (await Promise.all(tasks)).filter(Boolean);
    if (list.length === 0) throw new Error('no stock data');
    return { list, offline: false };
  } catch (e) {
    return { list: CONFIG.OFFLINE_STOCK, offline: true };
  }
}

async function fetchOneStock(symbol) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(CONFIG.STOCK.endpoint(symbol), { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const parts = lines[1].split(',');
    // Symbol,Date,Time,Open,High,Low,Close,Volume
    const close = parseFloat(parts[6]);
    const open = parseFloat(parts[3]);
    if (!isFinite(close) || close <= 0) return null;
    const change = close - open;
    return {
      symbol,
      name: symbol,
      price: close,
      change,
      changePercent: open ? (change / open) * 100 : 0,
    };
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
