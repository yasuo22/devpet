/**
 * growth.js — 宠物成长系统（亲密度 / 经验 / 等级）
 *
 * 核心逻辑：
 *   - 亲密度（Intimacy）：通过「喂养」「互动」「番茄钟专注」累积。
 *   - 经验值（XP）：每次正向交互获得，XP 攒满升级。
 *   - 等级（Level）：影响宠物称号 / 解锁高级猫粮 / 外观变化提示。
 *
 * 时间逻辑（重要）：
 *   - 饱食度随时间自然衰减（饥饿度增长）。
 *   - 亲密度只在「实时交互」时增长（喂食、点赞、番茄钟完成），
 *     但会随「长时间不喂食」而轻微回落（疏远惩罚）。
 *   - 番茄钟联动：完成一个专注会话 → 获得 XP + 亲密度；长休息时宠物
 *     进入「休息模式」，自动消耗少量猫粮但亲密度提升。
 *
 * 等级曲线：每级所需经验 = BASE_XP * LEVEL_GROWTH ^ (level-1)
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const GROWTH = CONFIG.GROWTH;

const STORE_KEY = 'growth';

/**
 * 成长状态
 * {
 *   level: number,         // 当前等级（从 1 开始）
 *   xp: number,            // 当前等级内已积累的经验
 *   intimacy: number,      // 亲密度（0-100）
 *   totalFeed: number,     // 累计投喂次数
 *   totalInteractions: number, // 累计交互次数
 *   totalFocus: number,    // 累计番茄钟专注会话数
 *   lastIntimacyChange: number, // 上次亲密度变化时间戳
 *   lastDecayAt: number,   // 上次自然衰减时间戳
 *   unlockedTiers: [],     // 已解锁的猫粮档次 id
 * }
 */

/** 获取成长状态 */
export function getGrowthState() {
  const state = store.get(STORE_KEY, {
    level: 1,
    xp: 0,
    intimacy: 50,           // 初始中等亲密度
    totalFeed: 0,
    totalInteractions: 0,
    totalFocus: 0,
    lastIntimacyChange: Date.now(),
    lastDecayAt: Date.now(),
    unlockedTiers: [],
  });

  // 计算亲密度自然衰减（长时间不喂食会疏远）
  const decayed = applyIntimacyDecay(state);
  if (decayed !== state) {
    saveGrowthState(state);
  }
  return state;
}

/** 保存成长状态 */
function saveGrowthState(state) {
  store.set(STORE_KEY, state);
}

/**
 * 亲密度自然衰减：距离上次变化超过 INTIMACY_DECAY_MS，
 * 且当前亲密度 > 0 时，每分钟减少 INTIMACY_DECAY_PER_MIN。
 * 用于模拟"疏远"（长时间不照顾宠物会变冷淡）。
 * @returns {object} 更新后的 state（可能不变）
 */
function applyIntimacyDecay(state) {
  const now = Date.now();
  const elapsed = now - (state.lastIntimacyChange || now);

  // 距离上次变化超过衰减周期，才触发衰减
  if (elapsed < GROWTH.INTIMACY_DECAY_MS) return state;

  // 计算应减少多少（按分钟）
  const minutesPassed = Math.floor((elapsed - GROWTH.INTIMACY_DECAY_MS) / 60000);
  const decayAmount = Math.min(minutesPassed * GROWTH.INTIMACY_DECAY_PER_MIN, GROWTH.INTIMACY_DECAY_CAP);

  if (decayAmount <= 0 || state.intimacy <= 0) {
    state.lastIntimacyChange = now; // 重置计时，避免每次调用都触发
    return state;
  }

  state.intimacy = Math.max(0, state.intimacy - decayAmount);
  state.lastIntimacyChange = now;
  return state;
}

/**
 * 计算升级所需经验（当前等级）。
 * @param {number} level 等级
 * @returns {number} 所需经验
 */
export function xpNeededForLevel(level) {
  return Math.round(GROWTH.BASE_XP * Math.pow(GROWTH.LEVEL_GROWTH, (level || 1) - 1));
}

/**
 * 获取当前等级的经验进度（0-100%）。
 */
export function getLevelProgress() {
  const state = getGrowthState();
  const needed = xpNeededForLevel(state.level);
  return Math.min(100, Math.round((state.xp / needed) * 100));
}

/**
 * 获取等级对应的称号（按等级段）。
 */
export function getLevelTitle(level) {
  const titles = GROWTH.LEVEL_TITLES;
  let title = titles[0];
  for (let i = 0; i < titles.length; i++) {
    if (level >= titles[i].minLevel) title = titles[i];
  }
  return title;
}

/**
 * 增加经验值，处理升级。
 * @param {number} amount XP 数量
 * @returns {object} { state, leveledUp, oldLevel, newLevel }
 */
export function addXp(amount) {
  const state = getGrowthState();
  const safe = Math.max(1, Math.floor(amount || 0));
  const oldLevel = state.level;

  state.xp += safe;

  // 连续升级循环
  let needed = xpNeededForLevel(state.level);
  while (state.xp >= needed) {
    state.xp -= needed;
    state.level++;
    needed = xpNeededForLevel(state.level);
  }

  // 记录交互次数
  state.totalInteractions++;
  state.lastIntimacyChange = Date.now();

  const leveledUp = state.level > oldLevel;

  // 升级时同步解锁更高档次的猫粮
  if (leveledUp) {
    const unlocked = GROWTH.TIER_UNLOCK_LEVELS.filter((t) => state.level >= t.level);
    state.unlockedTiers = unlocked.map((t) => t.tier);
  }

  saveGrowthState(state);
  return { state, leveledUp, oldLevel, newLevel: state.level };
}

/**
 * 增加亲密度（喂食/互动等正向行为）。
 * @param {number} amount 亲密度增量（默认使用 FEED_INTIMACY）
 * @param {string} reason 触发原因（feed/interact/focus）
 * @returns {object} 更新后的状态
 */
export function addIntimacy(amount, reason = 'interact') {
  const state = getGrowthState();
  const safe = Math.max(1, Math.floor(amount || 1));
  state.intimacy = Math.min(100, state.intimacy + safe);
  state.lastIntimacyChange = Date.now();

  if (reason === 'feed') state.totalFeed++;
  if (reason === 'focus') state.totalFocus++;
  state.totalInteractions++;

  saveGrowthState(state);
  return state;
}

/**
 * 喂食动作：同时增加亲密度并计经验。
 * @param {number} grams 喂食克数
 * @returns {object} { state, xpGained, intimacyGained }
 */
export function onFeed(grams) {
  const intimacyGained = Math.min(5, Math.max(1, Math.floor((grams || 10) / GROWTH.FEED_XP_PER_GRAM)));
  const xpGained = Math.min(GROWTH.MAX_XP_PER_FEED, Math.max(2, Math.floor((grams || 10) / GROWTH.FEED_XP_PER_GRAM) * GROWTH.XP_PER_FEED));

  const state = addIntimacy(intimacyGained, 'feed');
  const xpResult = addXp(xpGained);

  return {
    state: xpResult.state,
    xpGained,
    intimacyGained,
    leveledUp: xpResult.leveledUp,
  };
}

/**
 * 点赞 / 日常互动。
 * @returns {object} 更新结果
 */
export function onInteract() {
  const intimacyGained = GROWTH.INTERACT_INTIMACY;
  const xpGained = GROWTH.INTERACT_XP;
  const state = addIntimacy(intimacyGained, 'interact');
  const xpResult = addXp(xpGained);
  return { state: xpResult.state, xpGained, intimacyGained, leveledUp: xpResult.leveledUp };
}

/**
 * 番茄钟专注会话完成回调。
 * @param {number} focusMinutes 专注分钟数
 * @param {string} mode 会话类型（work/shortBreak/longBreak）
 * @returns {object} 更新结果
 */
export function onFocusCompleted(focusMinutes, mode = 'work') {
  // 专注会话获得经验与亲密度
  const minutes = Math.max(1, Math.floor(focusMinutes || 25));
  const xpGained = GROWTH.FOCUS_XP_PER_MIN * minutes;
  const intimacyGained = GROWTH.FOCUS_INTIMACY;

  const state = addIntimacy(intimacyGained, 'focus');
  const xpResult = addXp(xpGained);

  return {
    state: xpResult.state,
    xpGained,
    intimacyGained,
    leveledUp: xpResult.leveledUp,
    focusMinutes: minutes,
    mode,
  };
}

/**
 * 获取亲密度对应的文案描述。
 */
export function getIntimacyLabel(intimacy) {
  if (intimacy >= 90) return '❤️ 形影不离';
  if (intimacy >= 70) return '😊 亲密无间';
  if (intimacy >= 50) return '🙂 相处融洽';
  if (intimacy >= 30) return '😐 慢慢熟悉';
  if (intimacy >= 10) return '😕 有些陌生';
  return '😢 十分疏远';
}

/**
 * 格式化成长状态摘要。
 */
export function formatGrowthSummary() {
  const state = getGrowthState();
  const title = getLevelTitle(state.level);
  const progress = getLevelProgress();
  const needed = xpNeededForLevel(state.level);

  return {
    text: `🏅 Lv.${state.level} ${title.title} · 亲密度 ${state.intimacy}%`,
    detail: `经验 ${state.xp}/${needed} (${progress}%) · 投喂 ${state.totalFeed} 次 · 专注 ${state.totalFocus} 次`,
    state,
    title,
    progress,
  };
}

/** 暴露到全局 */
export function exposeGrowth() {
  window.DevPet = window.DevPet || {};
  Object.assign(window.DevPet, {
    growthAddXp: addXp,
    growthAddIntimacy: addIntimacy,
    growthOnFeed: onFeed,
    growthOnInteract: onInteract,
    growthOnFocus: onFocusCompleted,
    growthSummary: formatGrowthSummary,
  });
  return window.DevPet;
}
