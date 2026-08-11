/**
 * catfood.js — 猫粮购买交易系统（用 token 换不同档次的猫粮）
 *
 * 核心设计：
 *  1. Token 是"货币"：累计消耗的 Codex token 进入钱包（walletTokens）。
 *  2. 购买猫粮：用户用钱包中的 token 主动"购买"不同档次（品牌）的猫粮。
 *     每种档次有不同单价（token/克）和风味加成（亲密度提升倍率）。
 *  3. 存量管理：购买得到对应克数的猫粮，存量上限由档次决定。
 *  4. 投喂：把存量猫粮喂给宠物 → 消耗存量 → 提升亲密度（与成长系统联动）。
 *
 * 与成长系统（growth.js）联动：
 *   - 购买更高档次 → 解锁更多亲密度加成。
 *   - 投喂动作 → 调用 growth.onFeed() 增加亲密度与 XP。
 *
 * 与番茄钟联动：
 *   - 专注会话期间猫粮消耗速度降低（宠物"努力工作"）。
 *   - 休息会话期间可以投喂（恢复饱食度）。
 */

import { CONFIG } from './config.js';
import * as store from './store.js';
import * as growth from './growth.js';

const CATFOOD = CONFIG.CATFOOD;

/**
 * 猫粮系统状态
 * {
 *   walletTokens: number,   // 钱包中可用 token（货币，可购买猫粮）
 *   totalTokens: number,    // 历史累计消耗 token（含已花费的）
 *   currentFood: number,    // 当前猫粮存量（克）
 *   maxFood: number,        // 存量上限（由档次决定）
 *   currentTier: string,    // 当前猫粮档次 id（影响风味/亲密度加成）
 *   lastFeedAt: number,     // 上次投喂时间戳
 *   lastTokenReportAt: number, // 上次 token 上报时间戳
 *   hungryWarningShown: boolean,
 * }
 */

/** 获取猫粮系统状态 */
export function getCatFoodState() {
  const state = store.get(CATFOOD.STORE_KEY, {
    walletTokens: 0,
    totalTokens: 0,
    currentFood: CATFOOD.MAX_FOOD,  // 初始喂饱
    maxFood: CATFOOD.MAX_FOOD,
    currentTier: CATFOOD.TIERS[0].id, // 默认基础猫粮
    lastFeedAt: Date.now(),
    lastTokenReportAt: Date.now(),
    hungryWarningShown: false,
  });

  // 确保结构完整（兼容旧数据）
  state.maxFood = state.maxFood || CATFOOD.MAX_FOOD;
  state.walletTokens = state.walletTokens || 0;
  state.totalTokens = state.totalTokens || 0;
  state.currentTier = state.currentTier || CATFOOD.TIERS[0].id;
  // 确保档次的 id 合法
  if (!CATFOOD.TIERS.some((t) => t.id === state.currentTier)) {
    state.currentTier = CATFOOD.TIERS[0].id;
  }
  return state;
}

/** 保存猫粮状态 */
function saveCatFoodState(state) {
  store.set(CATFOOD.STORE_KEY, state);
}

/**
 * 记录 Codex token 消耗（把 token 充值进钱包 + 累计总量）。
 * 由 codex.js 调用，作为真实 token 数据入口。
 * @param {number} tokens 本次消耗的 token 数
 * @returns {object} 更新后的猫粮状态
 */
export function addTokens(tokens) {
  const state = getCatFoodState();
  const safeTokens = Math.max(0, Math.floor(tokens || 0));

  // token 进钱包（作为货币）
  state.walletTokens += safeTokens;
  // 累计总消耗
  state.totalTokens += safeTokens;

  state.lastTokenReportAt = Date.now();
  state.hungryWarningShown = false;
  saveCatFoodState(state);
  return state;
}

/**
 * 获取所有猫粮档次信息（含是否可解锁/已解锁）。
 * @param {number} level 当前宠物等级（用于解锁判断）
 * @returns {Array} 档次数组（带 locked 标记）
 */
export function getAllTiers(level) {
  const tiers = CATFOOD.TIERS;
  const growthState = growth.getGrowthState();
  const unlockedTiers = growthState.unlockedTiers || [];
  const userLevel = level || growthState.level;

  return tiers.map((t) => {
    // 解锁条件：等级 >= unlockLevel（若有）或 token 累计达到 minTokens
    const unlock = CONFIG.GROWTH?.TIER_UNLOCK_LEVELS?.find((u) => u.tier === t.id);
    const levelReq = unlock ? unlock.level : 0;
    const locked = (levelReq > 0 && userLevel < levelReq) ||
                   (unlockedTiers.length > 0 && !unlockedTiers.includes(t.id) && t.id !== CATFOOD.TIERS[0].id);
    return {
      ...t,
      locked,
      levelReq,
      canAfford: stateWalletTokens() >= (t.pricePerGram * 10), // 至少买得起 10 克
    };
  });
}

/** 内部：读取钱包 token 数 */
function stateWalletTokens() {
  return getCatFoodState().walletTokens;
}

/**
 * 获取当前档次的猫粮信息（最近一次购买/使用的档次）。
 */
export function getCurrentTier() {
  const state = getCatFoodState();
  return CATFOOD.TIERS.find((t) => t.id === state.currentTier) || CATFOOD.TIERS[0];
}

/**
 * 用 token 购买猫粮。
 * @param {string} tierId 档次 id
 * @param {number} grams 购买克数（默认 10 克）
 * @returns {object} { ok, error?, state, cost, tier, grams }
 */
export function buyCatFood(tierId, grams) {
  const state = getCatFoodState();
  const tier = CATFOOD.TIERS.find((t) => t.id === tierId);
  if (!tier) return { ok: false, error: '无效的猫粮档次' };

  const amount = Math.max(1, Math.floor(grams || 10));
  const cost = amount * tier.pricePerGram; // 总价 = 单价 * 克数

  // 检查余额
  if (state.walletTokens < cost) {
    return {
      ok: false,
      error: `余额不足：需要 ${cost.toLocaleString()} tokens，当前只有 ${state.walletTokens.toLocaleString()}`,
      state,
    };
  }

  // 扣除余额
  state.walletTokens -= cost;
  // 增加猫粮存量
  state.currentFood = Math.min(state.maxFood, state.currentFood + amount);
  // 切换当前档次
  state.currentTier = tier.id;
  state.hungryWarningShown = false;

  saveCatFoodState(state);

  return {
    ok: true,
    state,
    cost,
    tier,
    grams: amount,
  };
}

/**
 * 获取猫粮存量百分比（0-100）
 */
export function getFoodLevelPercent() {
  const state = getCatFoodState();
  return Math.min(100, Math.round((state.currentFood / state.maxFood) * 100));
}

/**
 * 判断是否到喂食时间（距上次喂食超过间隔）。
 * 专注模式下（番茄钟 running）间隔延长（消耗变慢）。
 * @param {boolean} isFocused 是否处于番茄钟专注中
 * @returns {boolean} 是否需要投喂
 */
export function isFeedDue(isFocused = false) {
  const state = getCatFoodState();
  const interval = isFocused ? CATFOOD.FEED_INTERVAL_MS * CATFOOD.FOCUS_INTERVAL_MULTIPLIER : CATFOOD.FEED_INTERVAL_MS;
  return Date.now() - state.lastFeedAt >= interval;
}

/**
 * 获取距离上次喂食经过的毫秒数。
 */
export function getElapsedSinceLastFeed() {
  const state = getCatFoodState();
  return Date.now() - state.lastFeedAt;
}

/**
 * 执行一次投喂动作（消耗存量猫粮 → 提升亲密度）。
 * @param {number} grams 投喂的猫粮克数（可选，默认 10 克）
 * @returns {object} 投喂结果（含亲密度/XP 加成）
 */
export function feed(grams) {
  const state = getCatFoodState();
  // grams 为 undefined 时表示投喂全部存量；否则投喂指定克数
  const amount = grams === undefined
    ? Math.min(state.currentFood, 50) // 每次最多投喂 50g（避免一次性清空）
    : Math.max(1, Math.floor(grams));

  // 检查存量
  if (state.currentFood < amount) {
    return { ok: false, error: `猫粮存量不足（当前 ${Math.round(state.currentFood)}g）`, state };
  }

  // 消耗存量
  state.currentFood = Math.max(0, state.currentFood - amount);
  state.lastFeedAt = Date.now();
  state.hungryWarningShown = false;
  saveCatFoodState(state);

  // 与成长系统联动：投喂提升亲密度和 XP
  const growthResult = growth.onFeed(amount);

  return {
    ok: true,
    state,
    fedGrams: amount,
    growth: growthResult,
  };
}

/**
 * 检查是否需要提醒投喂。
 * @param {boolean} isFocused 是否处于番茄钟专注中
 * @param {Function} onWarning 需要提醒时的回调
 * @param {Function} onFeedDue 到时间投喂时的回调
 */
export function checkFeedStatus(isFocused, onWarning, onFeedDue) {
  const state = getCatFoodState();

  const foodLow = state.currentFood < CATFOOD.HUNGRY_THRESHOLD;
  const timeUp = isFeedDue(isFocused);

  if (foodLow && !state.hungryWarningShown) {
    state.hungryWarningShown = true;
    saveCatFoodState(state);
    if (onWarning) onWarning(state);
    return 'hungry';
  }

  if (timeUp && !state.hungryWarningShown) {
    state.hungryWarningShown = true;
    saveCatFoodState(state);
    if (onFeedDue) onFeedDue(state);
    return 'feed-due';
  }

  return 'ok';
}

/**
 * 格式化猫粮状态为可读文本。
 * @param {boolean} isFocused 是否处于番茄钟专注中
 */
export function formatFoodStatus(isFocused = false) {
  const state = getCatFoodState();
  const tier = getCurrentTier();
  const percent = getFoodLevelPercent();
  const hoursSinceFeed = Math.floor(getElapsedSinceLastFeed() / (60 * 60 * 1000));
  const focusedNote = isFocused ? ' · 🍅 专注中消耗变慢' : '';

  return {
    text: `🐟 ${tier.name} · 存量 ${Math.round(state.currentFood)}g/${state.maxFood}g (${percent}%)`,
    detail: `钱包 ${state.walletTokens.toLocaleString()} tokens · 累计 ${state.totalTokens.toLocaleString()} · ${hoursSinceFeed} 小时前喂食${focusedNote}`,
    tier,
    state,
  };
}

/**
 * 初始化猫粮系统的定时检查。
 * 每隔 60 秒检查一次是否需要提醒投喂。
 * @param {object} callbacks { onHungry, onFeedDue, onTick, isFocused }
 */
export function initCatFoodSystem(callbacks = {}) {
  // 立即检查一次
  const focused = typeof callbacks.isFocused === 'function' ? callbacks.isFocused() : false;
  checkFeedStatus(focused, callbacks.onHungry, callbacks.onFeedDue);

  // 定时检查（每 60 秒）
  const timer = setInterval(() => {
    const isFocused = typeof callbacks.isFocused === 'function' ? callbacks.isFocused() : false;
    checkFeedStatus(isFocused, callbacks.onHungry, callbacks.onFeedDue);
    if (callbacks.onTick) callbacks.onTick(getCatFoodState());
  }, 60 * 1000);

  // 返回清理函数
  return () => clearInterval(timer);
}

/** 暴露到全局 */
export function exposeCatFood() {
  window.DevPet = window.DevPet || {};
  Object.assign(window.DevPet, {
    catfoodAddTokens: addTokens,
    catfoodBuy: buyCatFood,
    catfoodFeed: feed,
    catfoodStatus: formatFoodStatus,
    catfoodTiers: getAllTiers,
  });
  return window.DevPet;
}
