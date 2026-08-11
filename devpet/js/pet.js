/**
 * pet.js — Pet 元数据 Schema
 *
 * 宠物元数据采用可配置的 JSON 结构，让宠物的身份、性格、外观与
 * 挂载的 Widget 均可自定义：
 *
 * {
 *   name: string,            // 宠物昵称
 *   gender: 'male'|'female'|'other',   // 性别
 *   occupation: string,      // 职业（如 '全栈开发者'）
 *   personality: string,     // 性格（影响文案，如 '开朗'）
 *   color: { body, dark },   // 配色（可覆盖默认吉祥物配色）
 *   sprites: { idle, sleep, happy, sad, working }, // 状态对应装饰图标
 *   widgets: [ 'weather', 'stock', 'crypto', 'github', 'pomodoro' ], // 挂载的 Widget
 * }
 *
 * 宠物数据持久化到 localStorage（devpet.pet），可被用户编辑器改写。
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

/** 默认宠物元数据 */
export function defaultPet() {
  return {
    name: CONFIG.PET_NAME || 'DevPet',
    gender: 'other',
    occupation: '开发者伙伴',
    personality: '开朗',
    color: { body: '#ffd88f', dark: '#f0b866' },
    sprites: {
      idle: '',
      sleep: '💤',
      happy: '❤️',
      sad: '🌧️',
      working: '💻',
    },
    widgets: [...(CONFIG.DEFAULT_WIDGET_LIST || [])],
  };
}

/**
 * 读取当前宠物元数据（含校验与默认值合并）。
 * @returns {object} 宠物元数据
 */
export function getPet() {
  const saved = store.get('pet', {});
  const dft = defaultPet();
  return normalizePet({ ...dft, ...saved });
}

/**
 * 保存宠物元数据。
 * @param {object} patch 部分字段
 * @returns {object} 合并后的完整元数据
 */
export function savePet(patch) {
  const next = normalizePet({ ...getPet(), ...patch });
  store.set('pet', next);
  return next;
}

/** 规范化 / 校验宠物元数据 */
function normalizePet(p) {
  const dft = defaultPet();
  const widgets = Array.isArray(p.widgets) && p.widgets.length
    ? p.widgets.filter((w) => CONFIG.DEFAULT_WIDGETS[w] !== undefined)
    : dft.widgets;
  return {
    name: p.name || dft.name,
    gender: ['male', 'female', 'other'].includes(p.gender) ? p.gender : dft.gender,
    occupation: p.occupation || dft.occupation,
    personality: p.personality || dft.personality,
    color: {
      body: p.color?.body || dft.color.body,
      dark: p.color?.dark || dft.color.dark,
    },
    sprites: { ...dft.sprites, ...(p.sprites || {}) },
    widgets,
  };
}
