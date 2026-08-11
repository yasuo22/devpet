/**
 * catfood.js — 猫粮系统（Codex token → 猫粮积累 → 定时喂食）
 * 
 * 猫粮系统的工作原理：
 *  1. 通过 `addTokens(amount)` 记录 Codex 消耗的 token 数量
 *  2. 根据 token 消耗自动积累猫粮（token / TOKENS_PER_GRAM = 克）
 *  3. 猫粮按档次定价（基础/三文鱼/金枪鱼/和牛），token 越多档次越高
 *  4. 每隔 FEED_INTERVAL_MS（默认 4 小时）触发一次投喂提醒
 *  5. 猫粮存量低于阈值时提醒用户投喂
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const CATFOOD = CONFIG.CATFOOD;

/**
 * 猫粮系统状态
 * {
 *   totalTokens: number,     // 历史累计消耗 token 数
 *   currentFood: number,     // 当前猫粮存量（克）
 *   maxFood: number,         // 猫粮上限
 *   lastFeedAt: number,      // 上次投喂时间戳
 *   lastTokenReportAt: number, // 上次 token 上报时间戳
 *   hungryWarningShown: boolean, // 是否已展示饥饿警告（避免重复）
 * }
 */

/** 获取猫粮系统状态 */
export function getCatFoodState() {
  const state = store.get(CATFOOD.STORE_KEY, {
    totalTokens: 0,
    currentFood: CATFOOD.MAX_FOOD,  // 初始喂饱
    maxFood: CATFOOD.MAX_FOOD,
    lastFeedAt: Date.now(),
    lastTokenReportAt: Date.now(),
    hungryWarningShown: false,
  });
  // 确保结构完整
  state.maxFood = state.maxFood || CATFOOD.MAX_FOOD;
  return state;
}

/** 保存猫粮状态 */
function saveCatFoodState(state) {
  store.set(CATFOOD.STORE_KEY, state);
}

/**
 * 记录 Codex token 消耗量，自动换算为猫粮。
 * @param {number} tokens 本次消耗的 token 数
 * @returns {object} 更新后的猫粮状态
 */
export function addTokens(tokens) {
  const state = getCatFoodState();
  const safeTokens = Math.max(0, Math.floor(tokens || 0));
  
  // 更新累计 token
  state.totalTokens += safeTokens;
  
  // token → 猫粮换算
  const grams = safeTokens / CATFOOD.TOKENS_PER_GRAM;
  state.currentFood = Math.min(state.maxFood, state.currentFood + grams);
  
  state.lastTokenReportAt = Date.now();
  state.hungryWarningShown = false; // 补充了猫粮，重置饥饿标记
  
  saveCatFoodState(state);
  return state;
}

/**
 * 获取当前猫粮的档次信息（根据累计 token 消耗）
 * @returns {object} 当前档次的猫粮信息
 */
export function getCurrentTier() {
  const state = getCatFoodState();
  const tiers = CATFOOD.TIERS;
  let current = tiers[0];
  for (const tier of tiers) {
    if (state.totalTokens >= tier.minTokens) {
      current = tier;
    }
  }
  return current;
}

/**
 * 获取猫粮存量百分比（0-100）
 */
export function getFoodLevelPercent() {
  const state = getCatFoodState();
  return Math.min(100, Math.round((state.currentFood / state.maxFood) * 100));
}

/**
 * 判断是否到喂食时间
 * @returns {boolean} 是否需要投喂
 */
export function isFeedDue() {
  const state = getCatFoodState();
  return Date.now() - state.lastFeedAt >= CATFOOD.FEED_INTERVAL_MS;
}

/**
 * 获取距离上次喂食经过的毫秒数
 */
export function getElapsedSinceLastFeed() {
  const state = getCatFoodState();
  return Date.now() - state.lastFeedAt;
}

/**
 * 执行一次投喂动作。
 * @param {number} grams 投喂的猫粮克数（可选，默认补满）
 * @returns {object} 投喂结果
 */
export function feed(grams) {
  const state = getCatFoodState();
  const amount = grams ? Math.min(grams, state.maxFood) : state.maxFood;
  state.currentFood = Math.min(state.maxFood, state.currentFood + amount);
  state.lastFeedAt = Date.now();
  state.hungryWarningShown = false;
  saveCatFoodState(state);
  return {
    ...state,
    fedGrams: amount,
  };
}

/**
 * 检查是否需要提醒投喂。
 * @param {Function} onWarning 需要提醒时的回调（传入状态）
 * @param {Function} onFeedDue 到时间投喂时的回调
 */
export function checkFeedStatus(onWarning, onFeedDue) {
  const state = getCatFoodState();
  
  // 判断是否饥饿（猫粮低于阈值 或 距上次投喂超过周期）
  const foodLow = state.currentFood < CATFOOD.HUNGRY_THRESHOLD;
  const timeUp = isFeedDue();
  
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
 * 格式化猫粮状态为可读文本
 */
export function formatFoodStatus() {
  const state = getCatFoodState();
  const tier = getCurrentTier();
  const percent = getFoodLevelPercent();
  const hoursSinceFeed = Math.floor(getElapsedSinceLastFeed() / (60 * 60 * 1000));
  
  return {
    text: `🐟 ${tier.name} · 存量 ${Math.round(state.currentFood)}g/${state.maxFood}g (${percent}%)`,
    detail: `累计消耗 ${state.totalTokens.toLocaleString()} tokens · ${hoursSinceFeed} 小时前喂食`,
    tier,
    state,
  };
}

/**
 * 初始化猫粮系统的定时检查。
 * 每隔 60 秒检查一次是否需要提醒投喂。
 * @param {object} callbacks { onHungry, onFeedDue, onTick }
 */
export function initCatFoodSystem(callbacks = {}) {
  // 立即检查一次
  checkFeedStatus(callbacks.onHungry, callbacks.onFeedDue);
  
  // 定时检查（每 60 秒）
  const timer = setInterval(() => {
    checkFeedStatus(callbacks.onHungry, callbacks.onFeedDue);
    if (callbacks.onTick) callbacks.onTick(getCatFoodState());
  }, 60 * 1000);
  
  // 返回清理函数
  return () => clearInterval(timer);
}
