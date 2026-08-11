/**
 * social.js — 社交层
 * 泡泡 / 名片 / 协作状态
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const layer = () => document.getElementById('social-layer');

/** 显示一条社交气泡（悬浮提示） */
export function showBubble(text, type = 'info') {
  const el = document.createElement('div');
  el.className = 'mood-bubble social-bubble';
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.top = '20px';
  el.style.right = '20px';
  el.style.left = 'auto';
  el.style.transform = 'none';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/**
 * 渲染开发者名片（社交卡片）。
 * @param {object} profile {name, role, status}
 */
export function renderProfileCard(profile = {}) {
  const saved = store.get('profile', {});
  const p = { ...profile, ...saved };

  layer().hidden = false;
  layer().innerHTML = `
    <div class="social-card">
      <div class="name">${p.name || '开发者'}</div>
      <div class="role">${p.role || '全栈开发者'}</div>
      <div class="sub" style="margin-top:6px">
        <span style="color:${p.status === 'busy' ? 'var(--warn)' : 'var(--ok)'}">●</span>
        ${p.status === 'busy' ? '协作中' : '可协作'}
      </div>
    </div>
  `;
}

/** 保存 / 更新社交资料 */
export function updateProfile(patch) {
  const cur = store.get('profile', {});
  const next = { ...cur, ...patch };
  store.set('profile', next);
  return next;
}

/** 协作状态切换（busy/free） */
export function setCollaboration(status) {
  const p = updateProfile({ status });
  renderProfileCard(p);
  showBubble(status === 'busy' ? '🔴 已设为协作中' : '🟢 已开放协作');
  return p;
}

/** 点赞触发爱心泡泡 */
export function like(mascot) {
  showBubble('❤️ 谢谢你的点赞！');
  if (mascot) mascot.setMood('happy', { silent: true });
  setTimeout(() => mascot && mascot.setMood('idle', { silent: true }), 3000);
}
