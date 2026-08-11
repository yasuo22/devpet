/**
 * widgets.js — Widget 渲染
 * 负责渲染 天气 / 股票 / 加密 / GitHub / 番茄钟 等面板。
 */

import { CONFIG } from './config.js';
import { fetchWeather } from './weather.js';
import { fetchCrypto, fetchStocks } from './market.js';
import { fetchRepos } from './github.js';

const dashboard = () => document.getElementById('dashboard');

/**
 * 创建并挂载一个 widget 容器。
 * @param {string} id 容器 id
 * @param {string} title 标题
 * @returns {HTMLElement}
 */
function mount(id, title, icon) {
  const panel = document.createElement('section');
  panel.className = 'widget';
  panel.id = id;
  panel.innerHTML = `<h3>${icon || ''} ${title}</h3><div class="widget-body"></div>`;
  dashboard().appendChild(panel);
  return panel.querySelector('.widget-body');
}

/* ---------- 天气 ---------- */
export async function renderWeather(mascot) {
  if (!CONFIG.DEFAULT_WIDGETS.weather) return;
  const body = mount('widget-weather', '天气', '🌤️');
  body.innerHTML = '<div class="hint">加载中…</div>';

  const data = await fetchWeather();

  if (data.offline) body.querySelector('.hint').textContent = '（离线数据）';
  const cur = data.current;
  const cond = cur.condition?.text || '未知';
  body.innerHTML = `
    <div class="big">${cur.temp_c ?? '-'}°C</div>
    <div class="sub">${data.city} · ${cond}</div>
    <div style="margin-top:8px">
      ${data.forecast.map((f) => `
        <div class="row"><span>${f.date}</span>
        <span class="sub">${f.avgtemp_c ?? f.maxTemp}° ${f.condition?.text || ''}</span></div>`).join('')}
    </div>
    ${data.offline ? '<div class="sub" style="margin-top:6px;color:var(--warn)">⚠ 离线模式</div>' : ''}
  `;
  // 宠物天气反应
  if (mascot) mascot.reactToWeather(cond);
}

/* ---------- 股票 ---------- */
export async function renderStock() {
  if (!CONFIG.DEFAULT_WIDGETS.stock) return;
  const body = mount('widget-stock', '股票行情', '📈');
  body.innerHTML = '<div class="hint">加载中…</div>';

  const { list, offline } = await fetchStocks();
  body.innerHTML = list.map((s) => {
    const up = s.changePercent >= 0;
    return `<div class="row">
      <span><strong>${s.symbol}</strong></span>
      <span>$${s.price.toFixed(2)}
        <span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'}${Math.abs(s.changePercent).toFixed(2)}%</span>
      </span>
    </div>`;
  }).join('') + (offline ? '<div class="sub" style="margin-top:6px;color:var(--warn)">⚠ 离线模式</div>' : '');
}

/* ---------- 加密货币 ---------- */
export async function renderCrypto() {
  if (!CONFIG.DEFAULT_WIDGETS.crypto) return;
  const body = mount('widget-crypto', '加密货币', '₿');
  body.innerHTML = '<div class="hint">加载中…</div>';

  const { list, offline } = await fetchCrypto();
  body.innerHTML = list.map((c) => {
    const up = c.change24h >= 0;
    return `<div class="row">
      <span>${c.symbol} <span class="sub">${c.name}</span></span>
      <span>$${c.usd.toLocaleString()}
        <span class="${up ? 'up' : 'down'}">${up ? '▲' : '▼'}${Math.abs(c.change24h).toFixed(1)}%</span>
      </span>
    </div>`;
  }).join('') + (offline ? '<div class="sub" style="margin-top:6px;color:var(--warn)">⚠ 离线模式</div>' : '');
}

/* ---------- GitHub 作品 ---------- */
export async function renderGitHub() {
  if (!CONFIG.DEFAULT_WIDGETS.github) return;
  const body = mount('widget-github', 'GitHub 作品', '🐙');
  body.innerHTML = '<div class="hint">加载中…</div>';

  const { list, offline } = await fetchRepos();
  body.innerHTML = list.map((r) => `
    <div class="row">
      <span><strong>${r.name}</strong></span>
      <span class="val ok">★ ${r.stargazers_count}</span>
    </div>
    <div class="sub" style="margin-bottom:6px">${r.description}</div>
  `).join('') + (offline ? '<div class="sub" style="margin-top:4px;color:var(--warn)">⚠ 离线模式</div>' : '');
}

/* ---------- 番茄钟 ---------- */
export function renderPomodoro(onStateChange) {
  if (!CONFIG.DEFAULT_WIDGETS.pomodoro) return;
  const body = mount('widget-pomodoro', '番茄钟', '🍅');
  body.classList.add('pomodoro');

  let state = {
    mode: 'work',        // work | shortBreak | longBreak
    remaining: CONFIG.POMODORO.work,
    running: false,
    cycle: 0,
  };

  body.innerHTML = `
    <div class="pomo-time">25:00</div>
    <div class="pomo-status">准备开始工作</div>
    <div class="btn-row">
      <button class="btn primary" data-action="toggle">开始</button>
      <button class="btn" data-action="reset">重置</button>
      <button class="btn" data-action="skip">跳过</button>
    </div>
  `;

  const timeEl = body.querySelector('.pomo-time');
  const statusEl = body.querySelector('.pomo-status');
  const toggleBtn = body.querySelector('[data-action="toggle"]');
  let tick = null;

  const fmt = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const render = () => {
    timeEl.textContent = fmt(state.remaining);
    const labels = { work: '专注中 💪', shortBreak: '短休息 ☕', longBreak: '长休息 🌴' };
    statusEl.textContent = state.running ? labels[state.mode] : '已暂停';
    toggleBtn.textContent = state.running ? '暂停' : '开始';
    if (onStateChange) onStateChange(state.running ? 'working' : 'idle');
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    render();
    tick = setInterval(() => {
      state.remaining--;
      if (state.remaining <= 0) {
        clearInterval(tick);
        tick = null;
        state.running = false;
        advance();
        return;
      }
      render();
    }, 1000);
  };

  const pause = () => {
    state.running = false;
    clearInterval(tick);
    tick = null;
    render();
  };

  const advance = () => {
    if (state.mode === 'work') {
      state.cycle++;
      state.mode = state.cycle % CONFIG.POMODORO.cyclesBeforeLong === 0 ? 'longBreak' : 'shortBreak';
    } else {
      state.mode = 'work';
    }
    state.remaining = CONFIG.POMODORO[state.mode];
    render();
  };

  const reset = () => {
    pause();
    state.mode = 'work';
    state.remaining = CONFIG.POMODORO.work;
    render();
  };

  body.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    if (action === 'toggle') state.running ? pause() : start();
    else if (action === 'reset') reset();
    else if (action === 'skip') { pause(); advance(); }
  });

  render();
  return { pause, start, reset };
}
