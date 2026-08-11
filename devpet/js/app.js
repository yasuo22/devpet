/**
 * app.js — 应用入口与事件绑定
 * 初始化吉祥物、各 Widget、社交层并绑定控制栏事件。
 */

import { CONFIG } from './config.js';
import { Mascot } from './mascot.js';
import { renderWeather, renderStock, renderCrypto, renderGitHub, renderPomodoro } from './widgets.js';
import { renderProfileCard, like, showBubble } from './social.js';

/** 全局状态引用，便于事件回调 */
const app = {
  mascot: null,
  pomodoro: null,
  bootedAt: Date.now(),
};

/**
 * 应用启动
 */
async function init() {
  // 1. 初始化吉祥物
  app.mascot = new Mascot();

  // 2. 渲染社交名片
  renderProfileCard();

  // 3. 渲染各 Widget（并行请求）
  app.pomodoro = renderPomodoro((mood) => app.mascot.setMood(mood, { silent: true }));

  const dataTasks = [
    renderWeather(app.mascot),
    renderStock(),
    renderCrypto(),
    renderGitHub(),
  ];
  await Promise.allSettled(dataTasks);

  // 4. 绑定控制栏事件
  bindControls();

  // 5. 启动欢迎
  showBubble(`👋 ${CONFIG.APP_NAME} v${CONFIG.VERSION} 启动完成！`);

  // 6. 定时刷新行情/天气（60s）
  setInterval(() => {
    renderStock();
    renderCrypto();
    renderWeather(app.mascot);
  }, 60 * 1000);
}

/** 绑定控制栏按钮 */
function bindControls() {
  const lockBtn = document.getElementById('btn-lock');
  const likeBtn = document.getElementById('btn-like');
  const wakeBtn = document.getElementById('btn-wake');

  lockBtn.addEventListener('click', () => app.mascot.toggleLock());
  likeBtn.addEventListener('click', () => like(app.mascot));
  wakeBtn.addEventListener('click', () => app.mascot.wake());
}

// 入口
document.addEventListener('DOMContentLoaded', init);
