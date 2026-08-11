/**
 * codingActivity.js — 编码活动反应模块（对齐 petdex 桌面宠物核心特性）
 *
 * petdex 的核心卖点是桌面宠物会「实时响应 coding agent 的活动」：
 * agent 每次调用工具都会触发宠物动画。这里把同样的理念引入 DevPet：
 *
 *   1. 监听 Codex token 用量变化（真实编码活动信号）
 *   2. 检测到新的 token 消耗增量（超过阈值）→ 宠物进入 working 状态
 *   3. 弹出鼓励/同步泡泡，同步喂食等
 *   4. 一段时间无新活动 → 回到 idle
 *
 * 数据来源：codex.js 暴露的 getCodexState()。轮询间隔由 CODEX.REFRESH_MS 控制。
 */

import { CONFIG } from './config.js';
import { getCodexState } from './codex.js';

const CODING = CONFIG.CODING_ACTIVITY;

/**
 * 编码活动监视器
 * @param {object} callbacks
 * @param {Function} callbacks.onCodingActive  检测到新编码活动（增量超过阈值）
 * @param {Function} callbacks.onCodingIdle    编码活动结束（回 idle）
 */
export class CodingActivityMonitor {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this._lastTotal = 0;
    this._lastBubbleAt = 0;
    this._idleTimer = null;
    this._timer = null;
    this._running = false;
    this._init();
  }

  /** 初始化：读取当前已累计的 token 数作为基线 */
  _init() {
    const state = getCodexState();
    this._lastTotal = state.totalTokens || 0;
  }

  /** 启动轮询监控 */
  start() {
    if (this._running) return;
    this._running = true;
    this._init();
    this._timer = setInterval(() => this._tick(), CONFIG.CODEX.REFRESH_MS || 10 * 60 * 1000);
    // 启动即检查一次
    this._tick();
  }

  /** 停止监控 */
  stop() {
    if (!this._running) return;
    this._running = false;
    clearInterval(this._timer);
    clearTimeout(this._idleTimer);
    this._timer = null;
    this._idleTimer = null;
  }

  /** 轮询逻辑 */
  _tick() {
    const state = getCodexState();
    const current = state.totalTokens || 0;
    const delta = current - this._lastTotal;

    // 更新基线
    this._lastTotal = current;

    // 无增量 → 触发 idle（若之前是 working）
    if (delta <= 0) {
      this._scheduleIdle();
      return;
    }

    // 有增量且超过阈值 → 触发 working
    if (delta >= (CODING.TOKEN_DELTA_THRESHOLD || 100)) {
      this._triggerCodingActive(delta);
    } else {
      // 少量增量也算活跃，重置 idle 计时但不必强制 working
      this._scheduleIdle();
    }
  }

  /** 触发编码活跃事件 */
  _triggerCodingActive(delta) {
    clearTimeout(this._idleTimer);
    if (this.callbacks.onCodingActive) {
      this.callbacks.onCodingActive({
        delta,
        total: this._lastTotal,
        // 泡泡节流
        shouldBubble: Date.now() - this._lastBubbleAt >= (CODING.BUBBLE_COOLDOWN_MS || 60000),
      });
    }
    this._lastBubbleAt = Date.now();
    // 重置 idle 计时
    this._scheduleIdle();
  }

  /** 安排回到 idle */
  _scheduleIdle() {
    clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      if (this.callbacks.onCodingIdle) {
        this.callbacks.onCodingIdle();
      }
    }, CODING.BACK_TO_IDLE_MS || 3 * 60 * 1000);
  }
}
