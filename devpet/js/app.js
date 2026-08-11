/**
 * app.js — 应用入口与事件绑定
 * 初始化吉祥物、各 Widget、社交层并绑定控制栏事件。
 */

import { CONFIG } from './config.js';
import { Mascot } from './mascot.js';
import { renderAllWidgets } from './widgets.js';
import { getPet, savePet } from './pet.js';
import { renderProfileCard, like, showBubble } from './social.js';
import { getGitHubUser, setGitHubUser } from './github.js';

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
  // 1. 初始化吉祥物（应用 pet 元数据配色/名称）
  app.mascot = new Mascot();

  // 2. 渲染社交名片
  renderProfileCard();

  // 3. 渲染各 Widget（按 pet.widgets 顺序，含拖拽/开关）
  await renderAllWidgets(app.mascot);

  // 4. 绑定控制栏事件
  bindControls();

  // 5. 启动欢迎
  const pet = getPet();
  showBubble(`👋 ${pet.name} v${CONFIG.VERSION} 启动完成！`);

  // 6. 定时刷新行情/天气/GitHub（60s）
  setInterval(() => {
    const order = getPet().widgets;
    if (order.includes('stock')) import('./widgets.js').then((m) => m.renderStock());
    if (order.includes('crypto')) import('./widgets.js').then((m) => m.renderCrypto());
    if (order.includes('weather')) import('./widgets.js').then((m) => m.renderWeather(app.mascot));
    if (order.includes('github')) import('./widgets.js').then((m) => m.renderGitHub());
  }, 60 * 1000);
}

/** 绑定控制栏按钮 */
function bindControls() {
  const lockBtn = document.getElementById('btn-lock');
  const likeBtn = document.getElementById('btn-like');
  const wakeBtn = document.getElementById('btn-wake');
  const settingsBtn = document.getElementById('btn-settings');
  const panel = document.getElementById('settings-panel');

  lockBtn.addEventListener('click', () => app.mascot.toggleLock());
  likeBtn.addEventListener('click', () => like(app.mascot));
  wakeBtn.addEventListener('click', () => app.mascot.wake());

  // 设置面板
  const openSettings = () => {
    document.getElementById('input-pet-name').value = getPet().name;
    document.getElementById('input-pet-occupation').value = getPet().occupation;
    document.getElementById('input-github-user').value = getGitHubUser();
    document.getElementById('settings-msg').textContent = '';
    panel.hidden = false;
  };
  settingsBtn.addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', () => { panel.hidden = true; });
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const name = document.getElementById('input-pet-name').value.trim();
    const occ = document.getElementById('input-pet-occupation').value.trim();
    const gh = document.getElementById('input-github-user').value.trim();

    if (name) savePet({ name });
    if (occ) savePet({ occupation: occ });

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

// 暴露给全局（用于控制台/设置面板调用）
window.DevPet = {
  getGitHubUser,
  setGitHubUser,
  getPet,
  savePet,
  refresh: () => renderAllWidgets(app.mascot),
};

// 入口
document.addEventListener('DOMContentLoaded', init);
