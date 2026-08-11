/**
 * social.js — 社交层
 * 泡泡 / 名片 / 协作状态
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const layer = () => document.getElementById('social-layer');

/* ================================================================
 * 泡泡优先级队列
 * ----------------------------------------------------------------
 * 优先级（数字越小越优先展示）：
 *   critical(10)  —— 系统通知 / 协作邀请（需用户注意）
 *   normal(50)    —— 普通提示（保存成功、点赞等）
 *   low(90)       —— 次要提示（定时刷新、天气变化等）
 * 同一时间只显示一条，队列按优先级排序依次弹出；
 * 更高优先级的消息可插队到队首。
 * ================================================================ */

const PRIORITY = { critical: 10, normal: 50, low: 90 };

// 泡泡队列：{ text, type, priority, ttl }
let bubbleQueue = [];
let showing = false;

const BUBBLE_TTL = 2800;   // 单条展示时长
const BUBBLE_GAP = 350;    // 两条之间的间隔

/** 泡泡优先级队列入口（保留原 showBubble 签名，兼容旧调用） */
export function showBubble(text, type = 'info') {
  enqueueBubble({ text, type, priority: PRIORITY[type] ?? PRIORITY.normal });
}

/**
 * 入队一条带优先级的泡泡消息。
 * @param {object} opt { text, type, priority, ttl }
 */
export function enqueueBubble(opt) {
  const item = {
    text: opt.text || '',
    type: opt.type || 'info',
    priority: opt.priority ?? PRIORITY[opt.type] ?? PRIORITY.normal,
    ttl: opt.ttl || BUBBLE_TTL,
    id: ++bubbleQueue._seq || 1,
  };
  bubbleQueue._seq = (bubbleQueue._seq || 0) + 1;
  bubbleQueue.push(item);
  drainBubble();
}

/** 依次处理队列（同一时间仅展示一条） */
function drainBubble() {
  if (showing || bubbleQueue.length === 0) return;
  showing = true;

  // 取优先级最高（数字最小）的一条
  bubbleQueue.sort((a, b) => a.priority - b.priority || a.id - b.id);
  const item = bubbleQueue.shift();
  const el = document.createElement('div');
  el.className = `mood-bubble social-bubble prio-${item.priority <= PRIORITY.critical ? 'critical' : ''}`;
  el.textContent = item.text;
  el.style.position = 'fixed';
  el.style.top = '20px';
  el.style.right = '20px';
  el.style.left = 'auto';
  el.style.transform = 'none';
  document.body.appendChild(el);

  setTimeout(() => {
    if (el.parentNode) el.remove();
    setTimeout(() => {
      showing = false;
      drainBubble();
    }, BUBBLE_GAP);
  }, item.ttl);
}

/** 清空等待中的泡泡队列 */
export function clearBubbles() {
  bubbleQueue = [];
  bubbleQueue._seq = 0;
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
