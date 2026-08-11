/**
 * app.js — 应用入口与事件绑定
 * 初始化吉祥物、各 Widget、社交层并绑定控制栏事件。
 */

import { CONFIG } from './config.js';
import { Mascot } from './mascot.js';
import { renderAllWidgets } from './widgets.js';
import { getPet, savePet, defaultPet } from './pet.js';
import { renderProfileCard, like, showBubble, enqueueBubble } from './social.js';
import { getGitHubUser, setGitHubUser } from './github.js';
import { ActivityTracker } from './activity.js';
import { initCatFoodSystem, addTokens, getFoodLevelPercent, formatFoodStatus, feed } from './catfood.js';
import { reportTokens, initCodexMonitor, configureCodexApi, getCodexState, formatCodexSummary, fetchTokensFromApi } from './codex.js';
import { onInteract, onFeed, getGrowthState, formatGrowthSummary } from './growth.js';
import { CodingActivityMonitor } from './codingActivity.js';
import * as store from './store.js';

// hub（主题市场 / 通知 / 协作）按需加载
const loadHub = () => import('./hub.js');

/** 全局状态引用，便于事件回调 */
const app = {
  mascot: null,
  pomodoro: null,
  bootedAt: Date.now(),
  activityTracker: null,
  catFoodCleanup: null,
  codexCleanup: null,
  codingActivity: null,
  codingActivityCleanup: null,
};

/**
 * 应用启动
 */
async function init() {
  // 0. 应用已保存的主题
  applyTheme(store.get('theme', 'dark'));

  // 1. 初始化吉祥物（应用 pet 元数据配色/名称）
  app.mascot = new Mascot();

  // 2. 渲染社交名片
  renderProfileCard();

  // 3. 渲染各 Widget（按 pet.widgets 顺序，含拖拽/开关）
  await renderAllWidgets(app.mascot, (pomo) => { app.pomodoro = pomo; });

  // 4. 绑定控制栏事件
  bindControls();

  // 5. 启动欢迎
  const pet = getPet();
  showBubble(`👋 ${pet.name} v${CONFIG.VERSION} 启动完成！`);

  // 5.1 初始化活动检测（狸花猫模式启用）
  initActivityTracking();

  // 5.2 初始化猫粮系统（狸花猫模式启用）
  initFoodSystem();

  // 5.3 初始化 Codex token 监控（全模式启用，对接真实数据）
  initCodexMonitoring();

  // 5.4 初始化成长系统（全模式启用）
  initGrowthSystem();

  // 5.3.1 初始化编码活动反应（petdex 式：宠物实时响应 coding agent 活动）
  initCodingActivity();

  // 5.5 hub：渲染预设宠物网格 + 检查协作邀请链接
  initHub();

  // 6. 定时刷新行情/天气/GitHub（60s）
  setInterval(() => {
    const order = getPet().widgets;
    if (order.includes('stock')) import('./widgets.js').then((m) => m.renderStock());
    if (order.includes('crypto')) import('./widgets.js').then((m) => m.renderCrypto());
    if (order.includes('weather')) import('./widgets.js').then((m) => m.renderWeather(app.mascot));
    if (order.includes('github')) import('./widgets.js').then((m) => m.renderGitHub());
  }, 60 * 1000);
}

/**
 * 初始化活动检测（狸花猫模式启用）
 * 检测用户输入活动 → 宠物活跃/追蝴蝶 → 闲置超时 → 睡猫窝
 */
function initActivityTracking() {
  const pet = getPet();
  const isTabbyCat = pet.preset === 'tabby' || pet.name === '花狸';
  
  // 仅狸花猫模式启用活动检测
  if (!isTabbyCat) return;
  
  app.activityTracker = new ActivityTracker({
    onActive: () => {
      app.mascot.onUserActive();
    },
    onIdle: () => {
      app.mascot.onUserIdle();
    },
  });
  
  // 设置闲置超时为 15 分钟
  app.activityTracker.setIdleTimeout(CONFIG.CAT_SLEEP_AFTER_MS);
  app.activityTracker.start();
  
  // 如果页面加载时用户已停止输入很久，则直接进入睡眠
  const lastActivity = store.get('catActivity', {});
  if (lastActivity.lastActiveAt) {
    const inactiveMs = Date.now() - lastActivity.lastActiveAt;
    if (inactiveMs >= CONFIG.CAT_SLEEP_AFTER_MS) {
      app.mascot.onUserIdle();
    }
  }
}

/**
 * 初始化猫粮系统
 * 每 4 小时提醒投喂，猫粮存量低于阈值提醒
 */
function initFoodSystem() {
  const pet = getPet();
  const isTabbyCat = pet.preset === 'tabby' || pet.name === '花狸';

  // 暴露猫粮操作到全局（对所有模式生效，让 widget 可调用）
  window.DevPet = window.DevPet || {};
  window.DevPet.addTokens = addTokens;
  window.DevPet.feed = feed;
  window.DevPet.foodStatus = formatFoodStatus;

  // 仅狸花猫模式启用定时提醒
  if (!isTabbyCat) return;
  
  app.catFoodCleanup = initCatFoodSystem({
    isFocused: () => {
      // 检查番茄钟是否正在专注中
      return app.pomodoro !== null && typeof app.pomodoro.isRunning === 'function' ? app.pomodoro.isRunning() : false;
    },
    onHungry: (state) => {
      enqueueBubble({ 
        text: `😿 ${pet.name}饿了！猫粮只剩 ${Math.round(state.currentFood)}g，请投喂～`, 
        type: 'critical', 
        priority: 10 
      });
    },
    onFeedDue: (state) => {
      enqueueBubble({ 
        text: `⏰ 距上次喂食已 4 小时，该给 ${pet.name} 投喂猫粮啦！`, 
        type: 'critical', 
        priority: 10 
      });
    },
    onTick: (state) => {
      // 定时刷新猫粮状态显示（不需要额外操作，状态在泡泡中已展示）
    },
  });
}

/**
 * 初始化 Codex token 监控（全模式启用）
 * 若已配置 API 端点，则定时拉取真实 token 数据；否则仅支持手动上报。
 */
function initCodexMonitoring() {
  // 暴露 Codex 相关操作到全局
  window.DevPet = window.DevPet || {};
  window.DevPet.reportTokens = reportTokens;
  window.DevPet.getCodexState = getCodexState;
  window.DevPet.codexSummary = formatCodexSummary;
  window.DevPet.configureCodexApi = configureCodexApi;

  // 检查是否已配置 API
  const codexState = getCodexState();
  if (codexState.apiEndpoint) {
    app.codexCleanup = initCodexMonitor({
      onSync: (res) => {
        enqueueBubble({
          text: `🤖 Codex API 同步：+${res.tokens.toLocaleString()} tokens`,
          type: 'normal',
          priority: 5,
        });
        // 同步到猫粮钱包
        if (window.DevPet && window.DevPet.addTokens) {
          window.DevPet.addTokens(res.tokens);
        }
      },
      onError: (err) => {
        // 静默失败，不打扰用户
      },
    });
  }
}

/**
 * 初始化编码活动反应（petdex 式桌面宠物核心）
 * 全模式启用：监听 Codex token 消耗增量，检测到编码活动时宠物进入 working 状态。
 */
function initCodingActivity() {
  if (!CONFIG.CODING_ACTIVITY || CONFIG.CODING_ACTIVITY.ENABLED === false) return;

  // 清理旧实例（配置变更时重新初始化用）
  if (app.codingActivityCleanup) {
    app.codingActivityCleanup();
    app.codingActivityCleanup = null;
  }

  const monitor = new CodingActivityMonitor({
    onCodingActive: ({ delta, shouldBubble }) => {
      const pet = getPet();
      // 宠物进入 working 状态（若当前是 idle/sleep）
      if (app.mascot && ['idle', 'sleep', 'happy', 'sad'].includes(app.mascot.mood)) {
        app.mascot.setMood('working', { silent: true });
      }
      // 泡泡节流：避免刷屏
      if (shouldBubble) {
        const msgs = CONFIG.CODING_ACTIVITY.MESSAGES.working || [];
        const msg = msgs[Math.floor(Math.random() * msgs.length)] || '💻 正在陪你一起工作…';
        enqueueBubble({ text: msg, type: 'normal', priority: 3 });
        // 同步奖励少量亲密度
        if (window.DevPet && window.DevPet.growthOnInteract) {
          window.DevPet.growthOnInteract();
        }
      }
    },
    onCodingIdle: () => {
      // 编码活动结束 → 回到 idle（若当前是 working 且非专注中）
      if (app.mascot && app.mascot.mood === 'working') {
        app.mascot.setMood('idle', { silent: true });
        const idleMsg = CONFIG.CODING_ACTIVITY.MESSAGES.idle;
        if (idleMsg) enqueueBubble({ text: idleMsg, type: 'normal', priority: 1 });
      }
    },
  });

  monitor.start();
  app.codingActivity = monitor;
  app.codingActivityCleanup = () => monitor.stop();

  // 暴露到全局，便于手动上报后立即触发
  window.DevPet = window.DevPet || {};
  window.DevPet.notifyCodingActivity = () => monitor._tick();
}

/**
 * 初始化成长系统（全模式启用）
 * 仅初始化显示所需的数据，实际交互通过猫粮/互动触发。
 */
function initGrowthSystem() {
  // 暴露成长系统到全局
  window.DevPet = window.DevPet || {};
  window.DevPet.growth = getGrowthState();
  window.DevPet.growthSummary = formatGrowthSummary;
  window.DevPet.growthOnInteract = onInteract;
  window.DevPet.growthOnFeed = onFeed;
}

/**
 * 主题切换：在 <html> 上设置 data-theme 并持久化。
 * @param {string} theme 'dark' | 'light'
 */
function applyTheme(theme) {
  const safe = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = safe;
  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.textContent = safe === 'light' ? '🌞' : '🌓';
    btn.title = safe === 'light' ? '切换到深色主题' : '切换到浅色主题';
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  store.set('theme', next);
  showBubble(next === 'light' ? '☀️ 已切换浅色主题' : '🌙 已切换深色主题');
}

/** 更新宠物编辑器里的实时预览（配色/表情）。 */
function updatePetPreview() {
  const svg = document.getElementById('pet-preview-svg');
  if (!svg) return;
  const body = document.getElementById('input-pet-color-body').value || '#ffd88f';
  const dark = document.getElementById('input-pet-color-dark').value || '#f0b866';
  svg.querySelectorAll('.body, .ear').forEach((el) => {
    el.style.fill = body;
    el.style.stroke = dark;
  });
  // 狸花猫标记预览
  const markings = svg.querySelector('.tabby-markings');
  if (markings) {
    const isTabby = getPet().preset === 'tabby' || document.getElementById('input-pet-name').value === '花狸';
    markings.style.display = isTabby ? '' : 'none';
  }
}

/** 绑定控制栏按钮 */
function bindControls() {
  const lockBtn = document.getElementById('btn-lock');
  const likeBtn = document.getElementById('btn-like');
  const wakeBtn = document.getElementById('btn-wake');
  const settingsBtn = document.getElementById('btn-settings');
  const themeBtn = document.getElementById('btn-theme');
  const panel = document.getElementById('settings-panel');

  lockBtn.addEventListener('click', () => app.mascot.toggleLock());
  likeBtn.addEventListener('click', () => like(app.mascot));
  wakeBtn.addEventListener('click', () => app.mascot.wake());
  themeBtn.addEventListener('click', toggleTheme);

  // 宠物编辑器 / 设置面板
  const openSettings = () => {
    const pet = getPet();
    document.getElementById('input-pet-name').value = pet.name;
    document.getElementById('input-pet-gender').value = pet.gender;
    document.getElementById('input-pet-occupation').value = pet.occupation;
    document.getElementById('input-pet-personality').value = pet.personality;
    document.getElementById('input-pet-kind').value = pet.kind;
    document.getElementById('input-pet-vibes').value = (pet.vibes || []).join(', ');
    document.getElementById('input-pet-color-body').value = pet.color.body;
    document.getElementById('input-pet-color-dark').value = pet.color.dark;
    document.getElementById('input-github-user').value = getGitHubUser();
    document.getElementById('settings-msg').textContent = '';

    // Codex 配置回填
    const codexState = getCodexState();
    document.getElementById('input-codex-endpoint').value = codexState.apiEndpoint || '';
    document.getElementById('input-codex-key').value = codexState.apiKey || '';
    document.getElementById('codex-msg').textContent = '';

    // hub 面板数据（Webhook / 协作状态）
    loadHub().then(({ getWebhooks, getCollab, renderPresetGrid }) => {
      const wh = getWebhooks();
      document.getElementById('input-webhook-discord').value = wh.discord || '';
      document.getElementById('input-webhook-slack').value = wh.slack || '';
      document.getElementById('input-webhook-telegram').value = wh.telegram || '';
      document.getElementById('notify-msg').textContent = '';
      const c = getCollab();
      document.getElementById('input-collab-status').value = c.status;
      document.getElementById('input-collab-project').value = c.project || '';
      document.getElementById('input-collab-file').value = c.file || '';
      document.getElementById('input-collab-teammate').value = c.teammate || '';
      document.getElementById('collab-msg').textContent = '';
      if (renderPresetGrid) renderPresetGrid();
    });
    panel.hidden = false;
    updatePetPreview();
  };
  settingsBtn.addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', () => { panel.hidden = true; });

  // Codex 接入配置
  document.getElementById('btn-save-codex').addEventListener('click', () => {
    const endpoint = document.getElementById('input-codex-endpoint').value.trim();
    const key = document.getElementById('input-codex-key').value.trim();
    configureCodexApi(endpoint, key);

    // 重新初始化监控
    if (app.codexCleanup) {
      app.codexCleanup();
      app.codexCleanup = null;
    }
    if (endpoint) {
      app.codexCleanup = initCodexMonitor({
        onSync: (res) => {
          enqueueBubble({
            text: `🤖 Codex API 同步：+${res.tokens.toLocaleString()} tokens`,
            type: 'normal',
            priority: 5,
          });
          if (window.DevPet && window.DevPet.addTokens) {
            window.DevPet.addTokens(res.tokens);
          }
        },
        onError: (err) => {},
      });
    }

    document.getElementById('codex-msg').textContent = '✅ 已保存 Codex API 配置';
    showBubble('✅ Codex API 接入已配置');
  });

  document.getElementById('btn-test-codex').addEventListener('click', async () => {
    const endpoint = document.getElementById('input-codex-endpoint').value.trim();
    const key = document.getElementById('input-codex-key').value.trim();
    if (!endpoint) {
      document.getElementById('codex-msg').textContent = '⚠️ 请先填写 API 端点';
      return;
    }
    configureCodexApi(endpoint, key);
    document.getElementById('codex-msg').textContent = '⏳ 正在测试拉取...';
    const res = await fetchTokensFromApi();
    if (res.ok) {
      document.getElementById('codex-msg').textContent = `✅ 拉取成功：${res.tokens.toLocaleString()} tokens`;
      // 同步到猫粮钱包
      if (window.DevPet && window.DevPet.addTokens) {
        window.DevPet.addTokens(res.tokens);
      }
      showBubble(`🤖 拉取到 ${res.tokens.toLocaleString()} tokens`);
    } else {
      document.getElementById('codex-msg').textContent = '❌ ' + (res.error || '拉取失败');
    }
  });

  // 颜色变化时实时更新预览
  ['input-pet-color-body', 'input-pet-color-dark'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updatePetPreview);
  });

  // 恢复默认宠物
  document.getElementById('btn-reset-pet').addEventListener('click', () => {
    const dft = defaultPet();
    savePet(dft);
    document.getElementById('input-pet-name').value = dft.name;
    document.getElementById('input-pet-gender').value = dft.gender;
    document.getElementById('input-pet-occupation').value = dft.occupation;
    document.getElementById('input-pet-personality').value = dft.personality;
    document.getElementById('input-pet-kind').value = dft.kind;
    document.getElementById('input-pet-vibes').value = (dft.vibes || []).join(', ');
    document.getElementById('input-pet-color-body').value = dft.color.body;
    document.getElementById('input-pet-color-dark').value = dft.color.dark;
    updatePetPreview();
    app.mascot.pet = getPet();
    app.mascot.applyPetColor();
    document.getElementById('settings-msg').textContent = '↩️ 已恢复默认宠物';
  });

  // 保存宠物编辑器
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const name = document.getElementById('input-pet-name').value.trim();
    const gender = document.getElementById('input-pet-gender').value;
    const occ = document.getElementById('input-pet-occupation').value.trim();
    const personality = document.getElementById('input-pet-personality').value.trim();
    const kind = document.getElementById('input-pet-kind').value;
    const vibesRaw = document.getElementById('input-pet-vibes').value.trim();
    const vibes = vibesRaw.split(/[,，\s]+/).map((v) => v.trim()).filter(Boolean);
    const colorBody = document.getElementById('input-pet-color-body').value;
    const colorDark = document.getElementById('input-pet-color-dark').value;
    const gh = document.getElementById('input-github-user').value.trim();

    savePet({
      name: name || undefined,
      gender,
      kind,
      vibes,
      occupation: occ || undefined,
      personality: personality || undefined,
      color: { body: colorBody, dark: colorDark },
    });

    // 立即把新配色应用到吉祥物本体
    app.mascot.pet = getPet();
    app.mascot.applyPetColor();
    app.mascot.isTabbyCat = getPet().preset === 'tabby' || name === '花狸';
    app.mascot.applyTabbyExtras();

    let msg = '✅ 已保存宠物设置';
    if (gh) {
      setGitHubUser(gh);
      msg = '✅ 已保存宠物设置并关联 GitHub @' + gh.replace(/^@/, '');
      // 刷新 GitHub Widget
      import('./widgets.js').then((m) => m.renderGitHub());
    }
    document.getElementById('settings-msg').textContent = msg;
    panel.hidden = true;
    showBubble(msg);
  });
}

/** 把宠物应用到吉祥物本体（hub 预设/导入共用） */
function applyPetToMascot(pet) {
  app.mascot.pet = pet;
  app.mascot.isTabbyCat = pet.preset === 'tabby' || pet.name === '花狸';
  app.mascot.applyPetColor();
  app.mascot.applyTabbyExtras();
  // 同步设置面板预览
  updatePetPreview();
  
  // 切换到狸花猫时启用活动检测和猫粮系统
  const isTabby = pet.preset === 'tabby' || pet.name === '花狸';
  
  // 重新初始化活动检测
  if (app.activityTracker) {
    app.activityTracker.stop();
    app.activityTracker = null;
  }
  if (isTabby) {
    initActivityTracking();
  }
  
  // 重新初始化猫粮系统
  if (app.catFoodCleanup) {
    app.catFoodCleanup();
    app.catFoodCleanup = null;
  }
  if (isTabby) {
    initFoodSystem();
  }
  
  // 重新渲染 Widget（切换宠物后更新 catfood widget 等）
  renderAllWidgets(app.mascot, (pomo) => { app.pomodoro = pomo; }).catch(() => {});
}

/**
 * hub 初始化：预设网格、主题市场 / 通知 / 协作按钮绑定、邀请链接检测。
 */
function initHub() {
  loadHub().then((hub) => {
    // 让 hub 的预设/导入能直接更新吉祥物本体
    hub.setPetApplier(applyPetToMascot);

    // 检测地址栏协作邀请链接
    const invite = hub.checkCollabInvite();
    if (invite) {
      // 有协作邀请时，同时尝试发 Webhook 提醒
      hub.notifyWebhooks('collab', `有人邀请你加入项目「${invite.project}」`);
    }

    // ---- 主题市场：导出 / 导入 ----
    document.getElementById('btn-export-pet').addEventListener('click', () => {
      hub.downloadPetFile();
      const msg = document.getElementById('theme-msg');
      if (msg) msg.textContent = '⬇️ 已导出宠物配置 JSON';
    });
    document.getElementById('btn-import-pet').addEventListener('click', () => {
      document.getElementById('file-import-pet').click();
    });
    document.getElementById('file-import-pet').addEventListener('change', async (e) => {
      const res = await hub.pickPetFile(e.target);
      e.target.value = '';
      const msg = document.getElementById('theme-msg');
      if (res.ok) {
        savePet(res.pet);
        applyPetToMascot(getPet());
        // 同步编辑器字段
        const pet = getPet();
        document.getElementById('input-pet-name').value = pet.name;
        document.getElementById('input-pet-gender').value = pet.gender;
        document.getElementById('input-pet-occupation').value = pet.occupation;
        document.getElementById('input-pet-personality').value = pet.personality;
        document.getElementById('input-pet-kind').value = pet.kind;
        document.getElementById('input-pet-vibes').value = (pet.vibes || []).join(', ');
        document.getElementById('input-pet-color-body').value = pet.color.body;
        document.getElementById('input-pet-color-dark').value = pet.color.dark;
        updatePetPreview();
        hub.renderPresetGrid();
        if (msg) msg.textContent = '✅ 已导入并保存宠物配置「' + pet.name + '」';
        showBubble('✅ 已导入宠物配置 ' + pet.name);
      } else if (msg) {
        msg.textContent = '⚠️ ' + res.error;
      }
    });

    // ---- 通知服务：保存 / 测试 ----
    const saveWebhooks = () => {
      hub.saveWebhooks({
        discord: document.getElementById('input-webhook-discord').value,
        slack: document.getElementById('input-webhook-slack').value,
        telegram: document.getElementById('input-webhook-telegram').value,
      });
      const msg = document.getElementById('notify-msg');
      if (msg) msg.textContent = '✅ 已保存 Webhook 配置';
      showBubble('✅ 已保存通知服务配置');
    };
    document.getElementById('btn-save-webhooks').addEventListener('click', saveWebhooks);
    document.getElementById('btn-test-webhook').addEventListener('click', async () => {
      saveWebhooks();
      const msg = document.getElementById('notify-msg');
      if (msg) msg.textContent = '⏳ 正在发送测试消息...';
      const n = await hub.notifyWebhooks('boot', '这是一条来自 DevPet 的测试通知');
      if (msg) msg.textContent = n > 0 ? `✅ 已向 ${n} 个渠道发送测试` : 'ℹ️ 未配置任何 Webhook，请先填写 URL';
      showBubble(n > 0 ? `📨 已向 ${n} 个渠道发送测试` : 'ℹ️ 未配置 Webhook');
    });

    // ---- 协作模式：更新状态 / 复制邀请链接 ----
    const saveCollab = () => {
      hub.saveCollab({
        status: document.getElementById('input-collab-status').value,
        project: document.getElementById('input-collab-project').value.trim(),
        file: document.getElementById('input-collab-file').value.trim(),
        teammate: document.getElementById('input-collab-teammate').value.trim(),
      });
      hub.renderCollabCard();
      const msg = document.getElementById('collab-msg');
      if (msg) msg.textContent = '✅ 已更新协作状态';
      showBubble('✅ 协作状态已更新');
    };
    document.getElementById('btn-save-collab').addEventListener('click', saveCollab);
    document.getElementById('btn-copy-invite').addEventListener('click', async () => {
      const link = hub.buildCollabInvite();
      await hub.copyText(link);
      const msg = document.getElementById('collab-msg');
      if (msg) msg.textContent = '✅ 邀请链接已复制到剪贴板';
      enqueueBubble({ text: '📋 协作邀请链接已复制', type: 'critical', priority: 10 });
    });
  });
}

// 暴露给全局（用于控制台/设置面板调用）
window.DevPet = {
  getGitHubUser,
  setGitHubUser,
  getPet,
  savePet,
  refresh: () => renderAllWidgets(app.mascot, (pomo) => { app.pomodoro = pomo; }),
};

// 入口
document.addEventListener('DOMContentLoaded', init);
