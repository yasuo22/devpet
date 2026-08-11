/**
 * app.js — 应用入口与事件绑定
 * 初始化吉祥物、各 Widget、社交层并绑定控制栏事件。
 */

import { CONFIG } from './config.js';
import { Mascot } from './mascot.js';
import { renderAllWidgets } from './widgets.js';
import { getPet, savePet, defaultPet } from './pet.js';
import { renderProfileCard, like, showBubble } from './social.js';
import { getGitHubUser, setGitHubUser } from './github.js';
import * as store from './store.js';

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
  // 0. 应用已保存的主题
  applyTheme(store.get('theme', 'dark'));

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
    document.getElementById('input-pet-color-body').value = pet.color.body;
    document.getElementById('input-pet-color-dark').value = pet.color.dark;
    document.getElementById('input-github-user').value = getGitHubUser();
    document.getElementById('settings-msg').textContent = '';
    panel.hidden = false;
    updatePetPreview();
  };
  settingsBtn.addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', () => { panel.hidden = true; });

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
    const colorBody = document.getElementById('input-pet-color-body').value;
    const colorDark = document.getElementById('input-pet-color-dark').value;
    const gh = document.getElementById('input-github-user').value.trim();

    savePet({
      name: name || undefined,
      gender,
      occupation: occ || undefined,
      personality: personality || undefined,
      color: { body: colorBody, dark: colorDark },
    });

    // 立即把新配色应用到吉祥物本体
    app.mascot.pet = getPet();
    app.mascot.applyPetColor();

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
