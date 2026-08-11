/**
 * hub.js — 开发者控制中心
 * 包含三大扩展能力：
 *   1. 主题市场（多宠物）：导出 / 导入 pet 配置 + 内置预设一键切换
 *   2. 通知服务集成：Discord / Slack / Telegram Webhook 推送
 *   3. 协作模式：在线状态 + 项目共享进度 + 邀请链接
 */

import { CONFIG } from './config.js';
import * as store from './store.js';
import { getPet, savePet } from './pet.js';
import { enqueueBubble } from './social.js';

/* ================================================================
 * 一、主题市场（多宠物 / 导出导入）
 * ================================================================ */

/** 把当前宠物元数据序列化为可分享的 JSON 字符串 */
export function exportPet() {
  const pet = getPet();
  const payload = {
    app: 'DevPet',
    schema: 1,
    exportedAt: new Date().toISOString(),
    pet,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * 解析并导入宠物配置（支持完整导出包，也支持裸 pet 对象）。
 * 校验失败返回 { ok:false, error }；成功返回 { ok:true, pet }。
 */
export function importPet(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return { ok: false, error: 'JSON 解析失败：' + e.message };
  }

  // 兼容裸 pet 对象
  const pet = data && data.app === 'DevPet' && data.pet ? data.pet : data;
  if (!pet || typeof pet !== 'object') {
    return { ok: false, error: '无效的宠物配置（缺少 pet 对象）' };
  }

  // 基本字段校验
  if (!pet.name || typeof pet.name !== 'string') {
    return { ok: false, error: '缺少有效的宠物名称' };
  }
  if (!pet.color || !pet.color.body || !pet.color.dark) {
    return { ok: false, error: '缺少有效的配色信息（color.body / color.dark）' };
  }

  const merged = {
    ...pet,
    color: { body: pet.color.body, dark: pet.color.dark },
    sprites: { ...(getPet().sprites || {}), ...(pet.sprites || {}) },
  };
  return { ok: true, pet: merged };
}

/** 下载导出文件（宠物配置 JSON） */
export function downloadPetFile() {
  const json = exportPet();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `devpet-${(getPet().name || 'pet').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 触发隐藏文件选择器，读取用户选择的 JSON 并导入 */
export function pickPetFile(inputEl) {
  return new Promise((resolve) => {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return resolve({ ok: false, error: '未选择文件' });
    const reader = new FileReader();
    reader.onload = () => resolve(importPet(String(reader.result)));
    reader.onerror = () => resolve({ ok: false, error: '文件读取失败' });
    reader.readAsText(file);
  });
}

/** 应用一个预设主题（theme 来自 CONFIG.PRESET_PETS） */
export function applyPresetPet(presetKey) {
  const preset = (CONFIG.PRESET_PETS || []).find((p) => p.preset === presetKey);
  if (!preset) return null;
  // savePet 内部基于 getPet() 合并，会自动保留现有 widgets 配置
  return savePet({
    name: preset.name,
    gender: preset.gender,
    occupation: preset.occupation,
    personality: preset.personality,
    color: preset.color,
    sprites: preset.sprites,
  });
}

/** 渲染内置预设宠物网格（主题市场） */
export function renderPresetGrid(containerId = 'preset-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const cur = getPet();
  container.innerHTML = (CONFIG.PRESET_PETS || []).map((p) => {
    const active = p.name === cur.name && p.color.body === cur.color.body ? ' active' : '';
    return `
      <button class="preset-item${active}" data-preset="${p.preset}" title="${p.personality} · ${p.occupation}">
        <span class="preset-dot" style="background:${p.color.body}"></span>
        <span class="preset-name">${p.name}</span>
      </button>`;
  }).join('');
  container.querySelectorAll('.preset-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = applyPresetPet(btn.dataset.preset);
      if (next) {
        // 同步设置面板字段 + 应用到吉祥物
        document.getElementById('input-pet-name').value = next.name;
        document.getElementById('input-pet-gender').value = next.gender;
        document.getElementById('input-pet-occupation').value = next.occupation;
        document.getElementById('input-pet-personality').value = next.personality;
        document.getElementById('input-pet-color-body').value = next.color.body;
        document.getElementById('input-pet-color-dark').value = next.color.dark;
        updatePetControls(next);
        enqueueBubble({ text: `🎨 已切换宠物「${next.name}」`, type: 'normal' });
        const msg = document.getElementById('theme-msg');
        if (msg) msg.textContent = `🎨 已切换并保存宠物「${next.name}」`;
        renderPresetGrid(containerId);
      }
    });
  });
}

/** 应用预设/导入后的宠物到吉祥物本体（由 app 注入） */
let _applyPet = null;
export function setPetApplier(fn) { _applyPet = fn; }
function updatePetControls(pet) {
  if (_applyPet) _applyPet(pet);
}

/* ================================================================
 * 二、通知服务集成（Webhook）
 * ================================================================ */

/** 读取已保存的 Webhook 配置 { discord, slack, telegram } */
export function getWebhooks() {
  return store.get('webhooks', { discord: '', slack: '', telegram: '' });
}

/** 保存 Webhook 配置（空字符串表示关闭该渠道） */
export function saveWebhooks(wh) {
  const cur = getWebhooks();
  const next = {
    discord: (wh.discord || '').trim(),
    slack: (wh.slack || '').trim(),
    telegram: (wh.telegram || '').trim(),
  };
  store.set('webhooks', next);
  return next;
}

/**
 * 向已配置的 Webhook 推送一条消息。
 * @param {string} eventKey 事件名（pomodoro / like / collab / boot）
 * @param {string} text 附加正文
 * @returns {Promise<number>} 成功发送的渠道数量
 */
export async function notifyWebhooks(eventKey, text = '') {
  const wh = getWebhooks();
  const title = CONFIG.NOTIFY?.messages?.[eventKey] || 'DevPet 通知';
  const body = [title, text].filter(Boolean).join(' — ');
  const petName = getPet().name || 'DevPet';

  let sent = 0;
  // Discord / Slack：都支持简单文本 JSON
  if (wh.discord) {
    try {
      await fetch(wh.discord, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `${body}（来自 ${petName}）` }),
      });
      sent++;
    } catch (e) { /* 静默失败 */ }
  }
  if (wh.slack) {
    try {
      await fetch(wh.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${body}（来自 ${petName}）` }),
      });
      sent++;
    } catch (e) { /* 静默失败 */ }
  }
  // Telegram：bot 消息格式为 text
  if (wh.telegram) {
    try {
      await fetch(wh.telegram, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${body}（来自 ${petName}）` }),
      });
      sent++;
    } catch (e) { /* 静默失败 */ }
  }
  return sent;
}

/* ================================================================
 * 三、协作模式（在线状态 + 项目共享进度 + 邀请链接）
 * ================================================================ */

/** 读取协作状态 { status, project, file, teammate } */
export function getCollab() {
  return store.get('collab', {
    status: 'online',                 // online | busy | away
    project: CONFIG.COLLAB.defaultProject,
    file: '',
    teammate: '',
  });
}

/** 保存协作状态 */
export function saveCollab(patch) {
  const next = { ...getCollab(), ...patch };
  if (!CONFIG.COLLAB.statuses.includes(next.status)) next.status = 'online';
  store.set('collab', next);
  return next;
}

/** 渲染协作状态卡片到社交层 */
export function renderCollabCard() {
  const layer = document.getElementById('social-layer');
  const c = getCollab();
  const statusMap = {
    online: ['🟢', '在线 · 可协作'],
    busy: ['🔴', '协作中'],
    away: ['🟡', '离开'],
  };
  const [dot, label] = statusMap[c.status] || statusMap.online;
  layer.hidden = false;
  layer.innerHTML = `
    <div class="social-card collab-card">
      <div class="name">${dot} ${label}</div>
      <div class="role">📁 ${c.project || '未设置项目'}</div>
      <div class="sub" style="margin-top:6px">
        ${c.file ? `✍️ 正在编辑 <b>${c.file}</b>` : '尚未打开文件'}
        ${c.teammate ? ` ｜ 👥 队友：${c.teammate}` : ''}
      </div>
    </div>
  `;
}

/** 生成协作邀请链接（携带项目与状态信息的短码） */
export function buildCollabInvite() {
  const c = getCollab();
  const data = btoa(unescape(encodeURIComponent(JSON.stringify({
    app: 'DevPet',
    project: c.project,
    status: c.status,
    ts: Date.now(),
  }))));
  return `${location.origin}${location.pathname}#collab=${data}`;
}

/** 解析邀请链接并返回其中的协作信息（无则返回 null） */
export function parseCollabInvite() {
  const m = location.hash && location.hash.match(/#collab=(.+)$/);
  if (!m) return null;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    if (data && data.app === 'DevPet' && data.project) return data;
  } catch (e) { /* 忽略非法链接 */ }
  return null;
}

/** 复制文本到剪贴板（带降级） */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // 降级：创建临时 textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e2) { /* 忽略 */ }
    document.body.removeChild(ta);
    return true;
  }
}

/**
 * 从邀请链接中检测协作邀请，若有则弹出高优先级邀请泡泡。
 * 返回解析到的协作信息（用于调用方展示），无则返回 null。
 */
export function checkCollabInvite() {
  const data = parseCollabInvite();
  if (!data) return null;
  enqueueBubble({
    text: `🤝 收到协作邀请：加入项目「${data.project}」`,
    type: 'critical',
    priority: 10,
    ttl: 6000,
  });
  return data;
}

/** 发送协作邀请 Webhook 通知（配合 notifyWebhooks） */
export async function notifyCollabInvite(text) {
  return notifyWebhooks('collab', text);
}

/* ================================================================
 * 对外辅助：把常用方法暴露到全局（便于设置面板 / 控制台调用）
 * ================================================================ */
export function exposeHub() {
  window.DevPet = window.DevPet || {};
  Object.assign(window.DevPet, {
    exportPet,
    importPet,
    downloadPetFile,
    applyPresetPet,
    getWebhooks,
    saveWebhooks,
    notifyWebhooks,
    renderPresetGrid,
    setPetApplier,
    getCollab,
    saveCollab,
    renderCollabCard,
    buildCollabInvite,
    copyText,
  });
  return window.DevPet;
}
