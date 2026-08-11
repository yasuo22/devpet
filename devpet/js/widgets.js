/**
 * widgets.js — Widget 渲染 + 拖拽排序 + 开关配置
 * 负责渲染 天气 / 股票 / 加密 / GitHub / 番茄钟 面板，支持：
 *  - 按 pet.widgets 顺序渲染（可拖拽排序，顺序持久化）
 *  - 每个 Widget 可开关（通过头部开关按钮或设置面板）
 *  - GitHub Widget 含贡献热图 + 最近 PR/commits
 */

import { CONFIG } from './config.js';
import { getPet, savePet } from './pet.js';
import * as store from './store.js';
import { fetchWeather } from './weather.js';
import { fetchCrypto, fetchStocks } from './market.js';
import { fetchRepos, fetchContributions, fetchRecentEvents, getGitHubUser, fetchGitHubUser } from './github.js';

const dashboard = () => document.getElementById('dashboard');

/** 当前生效的 Widget 顺序 */
function widgetOrder() {
  const saved = store.get('widgetOrder', []);
  const pet = getPet();
  const base = (saved.length ? saved : pet.widgets);
  // 保证只保留合法 widget，且去重
  const valid = CONFIG.DEFAULT_WIDGET_LIST.filter((w) => base.includes(w));
  // 补齐缺失的默认 widget
  CONFIG.DEFAULT_WIDGET_LIST.forEach((w) => { if (!valid.includes(w)) valid.push(w); });
  return valid;
}

/**
 * 创建并挂载一个 widget 容器（含拖拽手柄 + 关闭按钮）。
 * @param {string} id 容器 id
 * @param {string} title 标题
 * @param {string} icon 图标
 * @returns {HTMLElement} .widget-body
 */
function mount(id, title, icon) {
  const panel = document.createElement('section');
  panel.className = 'widget';
  panel.id = id;
  panel.dataset.widget = id.replace('widget-', '');
  panel.innerHTML = `
    <header class="widget-head">
      <span class="drag-handle" title="拖拽排序">⠿</span>
      <h3>${icon || ''} ${title}</h3>
      <button class="widget-close" title="关闭此面板" data-close="${id}">✕</button>
    </header>
    <div class="widget-body"></div>
  `;
  dashboard().appendChild(panel);
  return panel.querySelector('.widget-body');
}

/* ---------- 拖拽排序 ---------- */
let dragEl = null;
let dragOverEl = null;

function bindWidgetDrag() {
  const grid = dashboard();
  grid.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    e.preventDefault();
    const panel = handle.closest('.widget');
    if (!panel) return;
    panel.setPointerCapture(e.pointerId);
    dragEl = panel;
    panel.classList.add('dragging-widget');
    document.body.style.cursor = 'grabbing';
  });

  grid.addEventListener('pointermove', (e) => {
    if (!dragEl) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const over = target ? target.closest('.widget') : null;
    if (over && over !== dragEl && over !== dragOverEl) {
      dragOverEl = over;
      const rect = over.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      grid.insertBefore(dragEl, after ? over.nextSibling : over);
    }
  });

  grid.addEventListener('pointerup', () => {
    if (!dragEl) return;
    dragEl.classList.remove('dragging-widget');
    dragEl = null;
    dragOverEl = null;
    document.body.style.cursor = '';
    persistWidgetOrder();
  });
}

/** 把当前 DOM 顺序写回 store */
function persistWidgetOrder() {
  const panels = [...dashboard().querySelectorAll('.widget')];
  const order = panels
    .map((p) => p.dataset.widget)
    .filter((w) => w && CONFIG.DEFAULT_WIDGET_LIST.includes(w));
  store.set('widgetOrder', order);
}

/* ---------- 开关 ---------- */
function bindWidgetClose() {
  dashboard().addEventListener('click', (e) => {
    const btn = e.target.closest('.widget-close');
    if (!btn) return;
    const id = btn.dataset.close;
    if (!id) return;
    const key = id.replace('widget-', '');
    const pet = getPet();
    pet.widgets = pet.widgets.filter((w) => w !== key);
    savePet(pet);
    document.getElementById(id)?.remove();
    persistWidgetOrder();
  });
}

/* ---------- 天气 ---------- */
export async function renderWeather(mascot) {
  const body = mount('widget-weather', CONFIG.WIDGET_META.weather.title, CONFIG.WIDGET_META.weather.icon);
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
  if (mascot) mascot.reactToWeather(cond);
}

/* ---------- 股票 ---------- */
export async function renderStock() {
  const body = mount('widget-stock', CONFIG.WIDGET_META.stock.title, CONFIG.WIDGET_META.stock.icon);
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
  const body = mount('widget-crypto', CONFIG.WIDGET_META.crypto.title, CONFIG.WIDGET_META.crypto.icon);
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

/* ---------- GitHub 作品（含贡献热图 + 最近活动 + 账号关联） ---------- */
export async function renderGitHub() {
  const body = mount('widget-github', CONFIG.WIDGET_META.github.title, CONFIG.WIDGET_META.github.icon);
  const user = getGitHubUser();
  body.innerHTML = `<div class="hint">加载中…</div>`;

  // 并行拉取仓库、热图、最近活动
  const [repos, contribs, events, userInfo] = await Promise.allSettled([
    fetchRepos(user),
    fetchContributions(user),
    fetchRecentEvents(user),
    fetchGitHubUser(user),
  ]);

  const repoData = repos.status === 'fulfilled' ? repos.value : { list: CONFIG.OFFLINE_REPOS, offline: true };
  const contribData = contribs.status === 'fulfilled' ? contribs.value : { weeks: [], total: 0, offline: true };
  const eventData = events.status === 'fulfilled' ? events.value : { events: [], offline: true };
  const ui = userInfo.status === 'fulfilled' ? userInfo.value : { user: null, offline: true };
  const offline = repoData.offline || contribData.offline || eventData.offline;

  const u = ui.user;
  const head = u ? `
    <div class="gh-head">
      ${u.avatar ? `<img class="gh-avatar" src="${u.avatar}" alt="" />` : ''}
      <div>
        <div class="gh-user"><a href="${u.html_url}" target="_blank" rel="noopener">@${u.login}</a></div>
        ${u.bio ? `<div class="sub">${u.bio}</div>` : ''}
        <div class="sub gh-stats">
          <span>${u.public_repos} 仓库</span> · <span>${u.followers} 关注者</span> · <span>${u.following} 关注</span>
        </div>
      </div>
    </div>
  ` : '';

  // 贡献热图
  let heat = '';
  if (contribData.weeks.length) {
    heat = `
      <div class="gh-heat">
        <div class="gh-heat-title">
          <span class="sub">贡献热图</span>
          <span class="sub gh-total">共 ${contribData.total} 次</span>
        </div>
        <div class="heat-grid">
          ${contribData.weeks.map((c) => `<i class="heat-cell l${c.level}" title="${c.date}: ${c.level}"></i>`).join('')}
        </div>
        ${contribData.offline ? '<div class="sub" style="color:var(--warn);font-size:11px">离线示例热图</div>' : ''}
      </div>`;
  }

  // 最近活动
  let acts = '';
  if (eventData.events.length) {
    acts = `
      <div class="gh-events">
        <div class="sub" style="margin:8px 0 4px">最近提交 / PR</div>
        ${eventData.events.slice(0, 5).map((ev) => `
          <div class="row gh-event ${ev.kind === 'pr' ? 'is-pr' : ''}">
            <span class="sub">
              ${ev.kind === 'pr' ? '🆕' : '📝'}
              <a href="${ev.url}" target="_blank" rel="noopener">${ev.message}</a>
            </span>
          </div>
        `).join('')}
      </div>`;
  }

  // 仓库列表
  const reposHtml = repoData.list.map((r) => `
    <div class="row">
      <span><strong>${r.name}</strong></span>
      <span class="val ok">★ ${r.stargazers_count}</span>
    </div>
    <div class="sub" style="margin-bottom:6px">${r.description}</div>
  `).join('');

  body.innerHTML = `
    ${head}
    ${heat}
    ${acts}
    <div class="sub" style="margin:8px 0 4px">作品仓库</div>
    ${reposHtml}
    ${offline ? '<div class="sub" style="margin-top:4px;color:var(--warn)">⚠ 离线模式</div>' : ''}
  `;
}

/* ---------- 番茄钟 ---------- */
export function renderPomodoro(onStateChange) {
  const body = mount('widget-pomodoro', CONFIG.WIDGET_META.pomodoro.title, CONFIG.WIDGET_META.pomodoro.icon);
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

/* ---------- 根据 pet.widgets 渲染所有启用的 Widget ---------- */
export async function renderAllWidgets(mascot) {
  const order = widgetOrder();
  const enabled = getPet().widgets;
  const jobs = [];
  for (const key of order) {
    if (!enabled.includes(key)) continue;
    switch (key) {
      case 'weather': jobs.push(renderWeather(mascot)); break;
      case 'stock': jobs.push(renderStock()); break;
      case 'crypto': jobs.push(renderCrypto()); break;
      case 'github': jobs.push(renderGitHub()); break;
      case 'pomodoro': jobs.push(Promise.resolve(renderPomodoro((m) => mascot.setMood(m, { silent: true })))); break;
    }
  }
  await Promise.allSettled(jobs);
  bindWidgetDrag();
  bindWidgetClose();
}
