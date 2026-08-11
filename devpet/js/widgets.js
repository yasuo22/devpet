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
import { formatFoodStatus, getFoodLevelPercent, getCurrentTier, feed, buyCatFood, getAllTiers } from './catfood.js';
import { getGrowthState, formatGrowthSummary, xpNeededForLevel, getLevelProgress, getLevelTitle, addXp, addIntimacy, onInteract, onFocusCompleted, getIntimacyLabel } from './growth.js';

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

/* ---------- 番茄钟（与成长/猫粮系统联动） ---------- */
export function renderPomodoro(onStateChange, mascot) {
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
    <div class="pomo-gains sub"></div>
  `;

  const timeEl = body.querySelector('.pomo-time');
  const statusEl = body.querySelector('.pomo-status');
  const toggleBtn = body.querySelector('[data-action="toggle"]');
  const gainsEl = body.querySelector('.pomo-gains');
  let tick = null;
  let sessionStart = null;  // 当前会话开始的时刻（用于计算专注时长）
  let focusGainShown = false; // 是否已展示本次专注收益

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

    // 显示预估收益（专注时）
    if (state.mode === 'work' && state.running) {
      const elapsedMin = sessionStart ? Math.floor((Date.now() - sessionStart) / 60000) : 0;
      const xpGain = CONFIG.GROWTH.FOCUS_XP_PER_MIN * Math.max(0, elapsedMin);
      gainsEl.textContent = `⏱ 已专注 ${elapsedMin} 分钟 · 预计 +${xpGain} XP`;
    } else if (!state.running && state.mode === 'work') {
      gainsEl.textContent = '完成一个专注会话可获得经验与亲密度';
    } else {
      gainsEl.textContent = '';
    }
  };

  const start = () => {
    if (state.running) return;
    state.running = true;
    sessionStart = Date.now();
    focusGainShown = false;
    render();
    tick = setInterval(() => {
      state.remaining--;
      if (state.remaining <= 0) {
        clearInterval(tick);
        tick = null;
        state.running = false;
        advance(state.mode); // 传入刚结束的会话类型，用于发系统通知
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

  /**
   * 会话结束时：切换到下一个会话、触发系统通知、结算成长收益。
   * @param {string} finishedMode 刚结束的会话 work|shortBreak|longBreak
   */
  const advance = (finishedMode = state.mode) => {
    // 结算成长收益（仅专注会话有收益）
    if (finishedMode === 'work' && sessionStart) {
      const focusMinutes = Math.max(1, Math.floor((Date.now() - sessionStart) / 60000));
      // 与成长系统联动：专注获得 XP + 亲密度
      const result = onFocusCompleted(focusMinutes, 'work');
      // 展示收益
      if (mascot && mascot.say) {
        mascot.say(`🍅 专注 ${focusMinutes} 分钟，+${result.xpGained} XP，亲密度 +${result.intimacyGained}`);
      }
      if (result.leveledUp) {
        const title = getLevelTitle(result.state.level);
        if (mascot && mascot.say) mascot.say(`🎉 升级！现在是 Lv.${result.state.level} ${title.title}`);
      }
      focusGainShown = true;
    }

    if (finishedMode === 'work') {
      state.cycle++;
      state.mode = state.cycle % CONFIG.POMODORO.cyclesBeforeLong === 0 ? 'longBreak' : 'shortBreak';
    } else {
      state.mode = 'work';
    }
    state.remaining = CONFIG.POMODORO[state.mode];
    sessionStart = state.mode === 'work' ? Date.now() : null;
    render();
    notifySessionEnd(finishedMode, state.mode);
  };

  const reset = () => {
    pause();
    state.mode = 'work';
    state.remaining = CONFIG.POMODORO.work;
    sessionStart = null;
    render();
  };

  /**
   * 番茄钟会话结束时的「桌面壳联动」逻辑：
   *  - Tauri 桌面环境：通过 window.__DEVPET_NATIVE__.notify 发原生系统通知
   *  - 浏览器环境：退化为吉祥物泡泡提示（保证 Web 版也能看到反馈）
   * @param {string} finished 刚结束的会话
   * @param {string} next 即将开始的会话
   */
  const notifySessionEnd = (finished, next) => {
    const name = (p) => ({ work: '专注工作', shortBreak: '短休息', longBreak: '长休息' }[p] || p);
    let body = `「${name(finished)}」已结束，开始「${name(next)}」`;

    // 专注结束额外提示收益
    if (finished === 'work') {
      const g = getGrowthState();
      body = `「${name(finished)}」已结束，开始「${name(next)}」\n🏅 当前 Lv.${g.level} · 亲密度 ${g.intimacy}%`;
    }

    const native = window.__DEVPET_NATIVE__;
    const say = () => { if (mascot && typeof mascot.say === 'function') mascot.say(body); };

    // 通知服务联动：若配置了 Webhook，同时推送到 Discord/Slack/Telegram
    import('./hub.js').then((hub) => {
      hub.notifyWebhooks('pomodoro', body);
    }).catch(() => {});

    if (native && typeof native.notify === 'function') {
      native.notify('🍅 番茄钟提醒', body).catch(say);
      say();
    } else {
      say();
    }
  };

  body.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;
    if (action === 'toggle') state.running ? pause() : start();
    else if (action === 'reset') reset();
    else if (action === 'skip') { pause(); advance(state.mode); }
  });

  render();
  return { pause, start, reset, isRunning: () => state.running && state.mode === 'work' };
}

/* ---------- 猫粮购买交易 + 成长系统 ---------- */
export function renderCatFood(mascot) {
  const body = mount('widget-catfood', CONFIG.WIDGET_META.catfood.title, CONFIG.WIDGET_META.catfood.icon);
  const status = formatFoodStatus();
  const tier = getCurrentTier();
  const percent = getFoodLevelPercent();
  const growthState = getGrowthState();
  const allTiers = getAllTiers(growthState.level);

  // 饥饿度状态条颜色
  const barColor = percent <= 30 ? 'var(--bad)' : percent <= 60 ? 'var(--warn)' : 'var(--ok)';

  // 成长面板 HTML
  const growthTitle = getLevelTitle(growthState.level);
  const growthProgress = getLevelProgress();
  const xpNeeded = xpNeededForLevel(growthState.level);
  const intimacyLabel = getIntimacyLabel(growthState.intimacy);

  body.innerHTML = `
    <!-- 成长状态 -->
    <div class="growth-panel">
      <div class="growth-row">
        <span class="growth-level">🏅 Lv.${growthState.level} ${growthTitle.title}</span>
        <span class="growth-intimacy">${intimacyLabel}</span>
      </div>
      <div class="growth-xp-row">
        <span class="sub">XP ${growthState.xp}/${xpNeeded}</span>
        <span class="sub">亲密度 ${growthState.intimacy}%</span>
      </div>
      <div class="growth-bar">
        <div class="growth-fill" style="width:${growthProgress}%"></div>
      </div>
      <div class="sub" style="margin-top:2px;font-size:11px">投喂 ${growthState.totalFeed} 次 · 专注 ${growthState.totalFocus} 次</div>
    </div>

    <!-- 猫粮存量 -->
    <div class="catfood-status">
      <div class="catfood-row">
        <span class="catfood-tier">${tier.icon} ${tier.name}</span>
        <span class="catfood-percent">${percent}%</span>
      </div>
      <div class="catfood-bar">
        <div class="catfood-fill" style="width:${percent}%;background:${barColor}"></div>
      </div>
      <div class="catfood-detail">
        <div class="sub">💳 钱包：${status.state.walletTokens.toLocaleString()} tokens</div>
        <div class="sub">📦 存量：${Math.round(status.state.currentFood)}g / ${status.state.maxFood}g</div>
        <div class="sub">⏱ 距上次喂食：${Math.floor((Date.now() - status.state.lastFeedAt) / (60*60*1000))} 小时</div>
      </div>
    </div>

    <!-- 投喂按钮 -->
    <div class="btn-row" style="margin-top:8px;justify-content:flex-start">
      <button class="btn primary btn-feed" data-feed="full">🍖 投喂</button>
      <button class="btn" data-feed="10">投喂 10g</button>
      <button class="btn" data-interact>💬 互动</button>
    </div>

    <!-- 购买猫粮交易区 -->
    <div class="buy-panel">
      <div class="sub buy-title" style="margin:10px 0 4px;font-weight:600">🛒 购买猫粮（token 交易）</div>
      ${allTiers.map((t) => `
        <div class="buy-tier ${t.id === tier.id ? 'active' : ''} ${t.locked ? 'locked' : ''}">
          <div class="buy-tier-head">
            <span class="buy-tier-name">${t.icon} ${t.name}</span>
            <span class="buy-tier-price">${t.pricePerGram} token/g</span>
          </div>
          <div class="buy-tier-desc sub">${t.desc}</div>
          ${t.locked ? `<div class="sub buy-locked" style="color:var(--warn)">🔒 需要 Lv.${t.levelReq}</div>` : `
          <div class="btn-row" style="margin-top:4px;justify-content:flex-start">
            <button class="btn btn-buy" data-tier="${t.id}" data-grams="10">买 10g</button>
            <button class="btn btn-buy" data-tier="${t.id}" data-grams="20">买 20g</button>
            <button class="btn btn-buy" data-tier="${t.id}" data-grams="50">买 50g</button>
          </div>`}
        </div>
      `).join('')}
    </div>

    <!-- token 上报区 -->
    <div class="token-panel">
      <div class="sub" style="margin:10px 0 4px;font-weight:600">📊 上报 Codex token 消耗</div>
      <div class="token-input-row">
        <input class="token-input" id="token-input" type="number" min="0" placeholder="输入本次消耗的 token 数" />
        <button class="btn primary" data-report-token>上报</button>
      </div>
      <div class="sub" style="margin-top:4px">累计消耗：${status.state.totalTokens.toLocaleString()} tokens</div>
    </div>
  `;

  // 投喂按钮
  body.querySelectorAll('[data-feed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const grams = btn.dataset.feed === 'full' ? undefined : parseInt(btn.dataset.feed, 10);
      const result = feed(grams);
      if (result.ok) {
        renderCatFood(mascot);
        const g = result.growth;
        let msg = `😋 投喂 ${result.fedGrams}g！亲密度 +${g.intimacyGained}，XP +${g.xpGained}`;
        if (g.leveledUp) msg += `，升级到 Lv.${g.state.level}！`;
        if (mascot && mascot.say) mascot.say(msg);
      } else {
        if (mascot && mascot.say) mascot.say(result.error);
      }
    });
  });

  // 互动按钮
  body.querySelector('[data-interact]')?.addEventListener('click', () => {
    const result = onInteract();
    renderCatFood(mascot);
    if (mascot && mascot.say) {
      let msg = `💬 互动 +${result.xpGained} XP，亲密度 +${result.intimacyGained}`;
      if (result.leveledUp) msg += `，升级到 Lv.${result.state.level}！`;
      mascot.say(msg);
    }
  });

  // 购买猫粮按钮
  body.querySelectorAll('.btn-buy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tierId = btn.dataset.tier;
      const grams = parseInt(btn.dataset.grams, 10);
      const result = buyCatFood(tierId, grams);
      if (result.ok) {
        renderCatFood(mascot);
        if (mascot && mascot.say) {
          mascot.say(`🛒 购买了 ${result.grams}g ${result.tier.name}，花费 ${result.cost.toLocaleString()} tokens`);
        }
      } else {
        if (mascot && mascot.say) mascot.say(result.error);
      }
    });
  });

  // 上报 token 按钮
  body.querySelector('[data-report-token]')?.addEventListener('click', () => {
    const input = body.querySelector('#token-input');
    const val = parseInt(input?.value || '0', 10);
    if (val <= 0) {
      if (mascot && mascot.say) mascot.say('请输入有效的 token 数量');
      return;
    }
    // 通过全局 API 上报（已由 app.js 绑定到 codex.js）
    if (window.DevPet && window.DevPet.reportTokens) {
      window.DevPet.reportTokens(val, { source: 'manual', note: 'widget 手动上报' });
    }
    renderCatFood(mascot);
    if (mascot && mascot.say) mascot.say(`📊 已上报 ${val.toLocaleString()} tokens，已入钱包`);
  });
}

/* ---------- 根据 pet.widgets 渲染所有启用的 Widget ---------- */
export async function renderAllWidgets(mascot, onPomodoro) {
  const order = widgetOrder();
  const enabled = getPet().widgets;
  const pet = getPet();
  const isTabbyCat = pet.preset === 'tabby' || pet.name === '花狸';
  const jobs = [];
  for (const key of order) {
    // 狸花猫模式始终渲染猫粮 widget
    const shouldRender = isTabbyCat && key === 'catfood' ? true : enabled.includes(key);
    if (!shouldRender) continue;
    switch (key) {
      case 'weather': jobs.push(renderWeather(mascot)); break;
      case 'stock': jobs.push(renderStock()); break;
      case 'crypto': jobs.push(renderCrypto()); break;
      case 'github': jobs.push(renderGitHub()); break;
      case 'pomodoro': {
        const pomo = renderPomodoro((m) => mascot.setMood(m, { silent: true }), mascot);
        if (onPomodoro) onPomodoro(pomo);
        jobs.push(Promise.resolve(pomo));
        break;
      }
      case 'catfood': jobs.push(Promise.resolve(renderCatFood(mascot))); break;
    }
  }
  await Promise.allSettled(jobs);
  bindWidgetDrag();
  bindWidgetClose();
}
