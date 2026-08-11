/**
 * activity.js — 用户活动检测模块
 * 
 * 监听页面输入事件（键盘/鼠标/触摸/滚动等），检测用户是否活跃。
 * 提供给彩色狸花猫模式使用：
 *   - 用户正在输入 → 宠物保持活跃状态（追蝴蝶）
 *   - 停止输入超过 15 分钟 → 宠物进入睡眠状态
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const CAT_ACTIVITY = CONFIG.CAT_ACTIVITY;

/**
 * 活动追踪器
 * 监听用户输入事件，跟踪最后活跃时间，并触发回调。
 */
export class ActivityTracker {
  /**
   * @param {object} callbacks
   * @param {Function} callbacks.onActive  检测到用户活跃时调用
   * @param {Function} callbacks.onIdle    用户闲置超时后调用
   */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.lastActiveAt = Date.now();
    this.idleTimer = null;
    this._idleTimeoutMs = CAT_ACTIVITY.idleTimeoutMs || CONFIG.CAT_SLEEP_AFTER_MS;
    this._listening = false;
    this._eventTypes = CAT_ACTIVITY.ACTIVITY_EVENTS || [
      'keydown', 'mousedown', 'touchstart', 'scroll', 'input', 'click', 'pointermove'
    ];
    this._boundHandler = this._handleActivity.bind(this);
  }

  /** 启动监听 */
  start() {
    if (this._listening) return;
    this._listening = true;
    this._eventTypes.forEach((evt) => {
      window.addEventListener(evt, this._boundHandler, { passive: true });
    });
    // 同时监听 input 元素的输入事件
    document.addEventListener('input', this._boundHandler, { passive: true });
    this._startIdleTimer();
  }

  /** 停止监听 */
  stop() {
    if (!this._listening) return;
    this._listening = false;
    this._eventTypes.forEach((evt) => {
      window.removeEventListener(evt, this._boundHandler);
    });
    document.removeEventListener('input', this._boundHandler);
    clearTimeout(this.idleTimer);
  }

  /** 处理活动事件 */
  _handleActivity(e) {
    // 忽略纯鼠标移动（如果启用，仅在有移动时算活动）
    this.lastActiveAt = Date.now();
    store.set('catActivity', { lastActiveAt: this.lastActiveAt });
    
    // 通知活跃回调
    if (this.callbacks.onActive) {
      this.callbacks.onActive(e);
    }
    
    // 重置闲置计时器
    this._startIdleTimer();
  }

  /** 启动闲置计时器 */
  _startIdleTimer() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.callbacks.onIdle) {
        this.callbacks.onIdle();
      }
    }, this._idleTimeoutMs);
  }

  /**
   * 设置闲置超时时间（毫秒）
   * @param {number} ms
   */
  setIdleTimeout(ms) {
    this._idleTimeoutMs = ms;
    // 如果已在监听，重置计时器
    if (this._listening) {
      this._startIdleTimer();
    }
  }

  /** 获取自最后活跃至今的毫秒数 */
  getInactiveMs() {
    return Date.now() - this.lastActiveAt;
  }

  /** 判断当前是否处于活跃状态 */
  isActive() {
    return this.getInactiveMs() < this._idleTimeoutMs;
  }
}
