/**
 * mascot.js — 吉祥物核心
 * 状态机 / 天气反应 / 拖拽 / 锁定
 */

import { CONFIG, WEATHER_MOOD } from './config.js';
import * as store from './store.js';

/** 宠物状态集合 */
export const MOODS = ['idle', 'sleep', 'happy', 'sad', 'working'];

export class Mascot {
  constructor() {
    this.el = document.getElementById('mascot');
    this.bubble = document.getElementById('mood-bubble');
    this.mood = 'idle';
    this.locked = store.get('locked', false);
    this.pos = store.get('pos', CONFIG.DEFAULT_POS);
    this.idleTimer = null;

    // 应用持久化状态
    this.setMood('idle', { silent: true });
    this.applyLock();
    this.applyPos(true);

    this.bindDrag();
    this.bindWake();
    this.startIdleTimer();
  }

  /* ---------- 状态机 ---------- */
  /**
   * 切换宠物状态。
   * @param {string} mood idle|sleep|happy|sad|working
   * @param {object} opts {silent: 是否静默不弹泡泡, message: 泡泡文字}
   */
  setMood(mood, opts = {}) {
    if (!MOODS.includes(mood)) mood = 'idle';
    this.mood = mood;

    // 更新 DOM 类名（驱动表情/动画）
    this.el.classList.remove(...MOODS.map((m) => 'mood-' + m));
    this.el.classList.add('mood-' + mood);

    store.set('mood', mood);

    // 泡泡提示
    if (!opts.silent) {
      this.say(opts.message || this.messageFor(mood));
    }

    // 状态相关计时器
    if (mood === 'idle' || mood === 'happy' || mood === 'sad' || mood === 'working') {
      this.startIdleTimer();
    }
  }

  /** 展示心情泡泡 */
  say(text) {
    if (!text) { this.bubble.hidden = true; return; }
    this.bubble.textContent = text;
    this.bubble.hidden = false;
    clearTimeout(this._sayTimer);
    this._sayTimer = setTimeout(() => { this.bubble.hidden = true; }, 2600);
  }

  messageFor(mood) {
    switch (mood) {
      case 'sleep': return '😴 我睡会儿…';
      case 'happy': return '😊 心情超好！';
      case 'sad': return '😢 有点小沮丧…';
      case 'working': return '💪 专注工作！';
      default: return '';
    }
  }

  /* ---------- 天气反应 ---------- */
  /**
   * 根据天气文本设置宠物状态。
   * @param {string} conditionText 天气描述（如 "Sunny" / "多云"）
   */
  reactToWeather(conditionText = '') {
    const key = this._classifyWeather(conditionText);
    const mood = WEATHER_MOOD[key] || WEATHER_MOOD.default;
    this.setMood(mood, { message: this._weatherMsg(conditionText) });
  }

  _classifyWeather(text) {
    const t = (text || '').toLowerCase();
    if (/sun|clear|晴/.test(t)) return 'sunny';
    if (/rain|drizzle|雨/.test(t)) return 'rain';
    if (/snow|雪/.test(t)) return 'snow';
    if (/thunder|storm|雷/.test(t)) return 'thunder';
    if (/hot|热/.test(t)) return 'hot';
    if (/cold|寒/.test(t)) return 'cold';
    if (/cloud|云/.test(t)) return 'cloudy';
    if (/fog|雾/.test(t)) return 'fog';
    return 'default';
  }

  _weatherMsg(text) {
    if (!text) return '今天的天气…';
    return `今天 ${text}`;
  }

  /* ---------- 闲置睡眠 ---------- */
  startIdleTimer() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.mood !== 'working' && this.mood !== 'sleep') {
        this.setMood('sleep', { silent: true });
      }
    }, CONFIG.SLEEP_AFTER_MS);
  }

  /* ---------- 拖拽 ---------- */
  bindDrag() {
    this.el.addEventListener('pointerdown', (e) => {
      if (this.locked) return; // 锁定状态下禁止拖拽
      e.preventDefault();
      this.el.setPointerCapture(e.pointerId);
      this.el.classList.add('dragging');
      const startX = e.clientX;
      const startY = e.clientY;
      const base = { ...this.pos };

      const move = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        this.pos = {
          x: Math.max(0, Math.min(window.innerWidth - 96, base.x + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 96, base.y + dy)),
        };
        this.applyPos();
        // 拖拽即唤醒
        if (this.mood === 'sleep') this.setMood('idle', { silent: true });
      };
      const up = (ev) => {
        this.el.classList.remove('dragging');
        this.el.removeEventListener('pointermove', move);
        this.el.removeEventListener('pointerup', up);
        store.set('pos', this.pos);
      };
      this.el.addEventListener('pointermove', move);
      this.el.addEventListener('pointerup', up);
    });
  }

  applyPos(silent = false) {
    this.el.style.left = this.pos.x + 'px';
    this.el.style.top = this.pos.y + 'px';
    if (!silent) store.set('pos', this.pos);
  }

  /* ---------- 锁定 ---------- */
  toggleLock() {
    this.locked = !this.locked;
    this.applyLock();
    store.set('locked', this.locked);
    const btn = document.getElementById('btn-lock');
    if (btn) {
      btn.classList.toggle('active', this.locked);
      btn.title = this.locked ? '已锁定，点击解锁' : '锁定位置';
    }
    this.say(this.locked ? '🔒 已锁定' : '🔓 已解锁');
    return this.locked;
  }

  applyLock() {
    this.el.classList.toggle('locked', this.locked);
    const btn = document.getElementById('btn-lock');
    if (btn) btn.classList.toggle('active', this.locked);
  }

  /* ---------- 唤醒 ---------- */
  wake() {
    this.setMood('idle', { message: '🙂 醒啦！' });
  }
}
