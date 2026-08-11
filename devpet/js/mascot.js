/**
 * mascot.js — 吉祥物核心
 * 状态机 / 天气反应 / 拖拽 / 锁定 / 追蝴蝶 / 猫窝睡眠
 */

import { CONFIG, WEATHER_MOOD } from './config.js';
import * as store from './store.js';
import { getPet } from './pet.js';

/** 宠物状态集合 */
export const MOODS = ['idle', 'sleep', 'happy', 'sad', 'working', 'chase'];

export class Mascot {
  constructor() {
    this.el = document.getElementById('mascot');
    this.bubble = document.getElementById('mood-bubble');
    this.mood = 'idle';
    this.locked = store.get('locked', false);
    this.pos = store.get('pos', CONFIG.DEFAULT_POS);
    this.idleTimer = null;
    this.pet = getPet();
    this.isTabbyCat = this.pet.preset === 'tabby' || this.pet.name === '花狸';

    // 应用 pet 元数据配色
    this.applyPetColor();
    this.applyTabbyExtras();

    // 应用持久化状态
    this.setMood('idle', { silent: true });
    this.applyLock();
    this.applyPos(true);

    this.bindDrag();
    this.bindWake();
    this.startIdleTimer();

    // 初始化蝴蝶元素（仅狸花猫模式）
    if (this.isTabbyCat) {
      this.initButterfly();
      this.initCatNest();
    }
  }

  /** 根据 pet 元数据覆盖吉祥物配色 */
  applyPetColor() {
    const c = this.pet.color || {};
    if (c.body) this.el.style.setProperty('--pet-body', c.body);
    if (c.dark) this.el.style.setProperty('--pet-body-dark', c.dark);
    if (c.belly) this.el.style.setProperty('--pet-belly', c.belly);
  }

  /** 应用狸花猫条纹扩展配色 */
  applyTabbyExtras() {
    const ext = this.pet.colorExt || {};
    if (ext.stripe) this.el.style.setProperty('--pet-stripe', ext.stripe);
    if (ext.belly) this.el.style.setProperty('--pet-belly', ext.belly);
    // 显示/隐藏狸花猫标记和胡须
    const markings = this.el.querySelector('.tabby-markings');
    const whiskers = this.el.querySelector('.whiskers');
    if (this.isTabbyCat) {
      if (markings) markings.style.display = '';
      if (whiskers) whiskers.style.display = '';
      // 确保蝴蝶和猫窝已初始化
      if (!this.butterfly) this.initButterfly();
      if (!this.catNest) this.initCatNest();
    } else {
      if (markings) markings.style.display = 'none';
      if (whiskers) whiskers.style.display = 'none';
      // 非狸花猫时隐藏蝴蝶和猫窝
      if (this.butterfly) this.butterfly.style.display = 'none';
      if (this.catNest) this.catNest.style.display = 'none';
    }
  }

  /* ---------- 状态机 ---------- */
  /**
   * 切换宠物状态。
   * @param {string} mood idle|sleep|happy|sad|working|chase
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
    if (mood === 'idle' || mood === 'happy' || mood === 'sad' || mood === 'working' || mood === 'chase') {
      this.startIdleTimer();
    }

    // 猫窝显示控制
    if (this.isTabbyCat) this.updateCatNestVisibility();
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
      case 'sleep': return '😴 睡在猫窝里…';
      case 'happy': return '😊 心情超好！';
      case 'sad': return '😢 有点小沮丧…';
      case 'working': return '💪 专注工作！';
      case 'chase': return '🦋 追蝴蝶去！';
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
  /**
   * 启动闲置睡眠计时器。
   * 狸花猫模式：15 分钟无输入 → 睡猫窝
   * 其他模式：保持 30 秒
   */
  startIdleTimer() {
    clearTimeout(this.idleTimer);
    const timeoutMs = this.isTabbyCat ? CONFIG.CAT_SLEEP_AFTER_MS : CONFIG.SLEEP_AFTER_MS;
    this.idleTimer = setTimeout(() => {
      if (this.mood !== 'working' && this.mood !== 'sleep' && this.mood !== 'chase') {
        this.setMood('sleep', { silent: true });
      }
    }, timeoutMs);
  }

  /** 由外部活动检测触发的活跃回调 */
  onUserActive() {
    // 狸花猫在用户输入时追蝴蝶（有间隔限制，避免太频繁）
    if (this.isTabbyCat) {
      const now = Date.now();
      // 至少间隔 3 秒触发一次追蝴蝶，避免过于频繁
      if (!this._lastChaseAt || now - this._lastChaseAt > 3000) {
        this._lastChaseAt = now;
        // 不打断 working 状态，但唤醒睡眠或保持追蝴蝶
        if (this.mood === 'sleep' || this.mood === 'idle' || this.mood === 'happy' || this.mood === 'sad') {
          this.setMood('chase', { silent: true });
          this.startButterflyChase();
        } else if (this.mood === 'chase') {
          // 已在追蝴蝶，继续追
          this.startButterflyChase();
        }
      }
    } else if (this.mood === 'sleep') {
      // 非狸花猫：唤醒但不追蝴蝶
      this.setMood('idle', { silent: true });
    }
    // 重置闲置计时器
    this.startIdleTimer();
  }

  /** 由外部活动检测触发的闲置回调 */
  onUserIdle() {
    if (this.isTabbyCat && this.mood !== 'working' && this.mood !== 'sleep') {
      this.setMood('sleep', { silent: true });
      this.say('💤 猫猫睡猫窝了…');
    }
  }

  /* ---------- 追蝴蝶动画 ---------- */
  initButterfly() {
    if (this.butterfly) return; // 已存在则跳过
    // 创建蝴蝶元素
    this.butterfly = document.createElement('div');
    this.butterfly.className = 'butterfly';
    this.butterfly.innerHTML = `
      <span class="butterfly-wing left">🦋</span>
      <span class="butterfly-wing right">🦋</span>
    `;
    this.butterfly.style.display = 'none';
    document.body.appendChild(this.butterfly);
  }

  /** 启动追蝴蝶动画 */
  startButterflyChase() {
    if (!this.butterfly || !this.isTabbyCat) return;
    
    const duration = CONFIG.CAT_ACTIVITY.BUTTERFLY_DURATION_MS || 8000;
    const radius = CONFIG.CAT_ACTIVITY.BUTTERFLY_RADIUS || 120;
    const petX = this.pos.x + 48;
    const petY = this.pos.y + 48;
    
    // 随机生成蝴蝶目标位置（在宠物附近随机）
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.4 + Math.random() * 0.6);
    const targetX = petX + Math.cos(angle) * dist;
    const targetY = petY + Math.sin(angle) * dist;
    
    // 显示蝴蝶
    this.butterfly.style.display = 'block';
    this.butterfly.style.left = targetX + 'px';
    this.butterfly.style.top = targetY + 'px';
    
    // 宠物向蝴蝶方向移动（若未锁定）
    if (!this.locked) {
      const dx = targetX - this.pos.x - 48;
      const dy = targetY - this.pos.y - 48;
      const newX = Math.max(0, Math.min(window.innerWidth - 96, this.pos.x + dx * 0.3));
      const newY = Math.max(0, Math.min(window.innerHeight - 96, this.pos.y + dy * 0.3));
      this.pos = { x: newX, y: newY };
      this.applyPos(true);
    }
    
    // 动画结束后隐藏蝴蝶，回到 idle
    clearTimeout(this._chaseTimer);
    this._chaseTimer = setTimeout(() => {
      if (this.butterfly) {
        this.butterfly.style.display = 'none';
      }
      if (this.mood === 'chase') {
        this.setMood('idle', { silent: true });
      }
    }, duration);
  }

  /** 停止追蝴蝶 */
  stopButterflyChase() {
    clearTimeout(this._chaseTimer);
    if (this.butterfly) {
      this.butterfly.style.display = 'none';
    }
  }

  /* ---------- 猫窝 ---------- */
  initCatNest() {
    if (this.catNest) return; // 已存在则跳过
    // 创建猫窝元素
    this.catNest = document.createElement('div');
    this.catNest.className = 'cat-nest';
    this.catNest.innerHTML = '🧺';
    this.catNest.style.display = 'none';
    document.body.appendChild(this.catNest);
  }

  /** 更新猫窝显示（睡觉时显示，其他状态隐藏） */
  updateCatNestVisibility() {
    if (!this.catNest) return;
    if (this.mood === 'sleep') {
      // 显示猫窝在宠物下方
      this.catNest.style.display = 'flex';
      this.catNest.style.left = (this.pos.x - 8) + 'px';
      this.catNest.style.top = (this.pos.y + 96) + 'px';
    } else {
      this.catNest.style.display = 'none';
    }
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
        // 猫窝跟随
        if (this.catNest && this.mood === 'sleep') {
          this.catNest.style.left = (this.pos.x - 8) + 'px';
          this.catNest.style.top = (this.pos.y + 96) + 'px';
        }
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
    // 更新猫窝位置
    if (this.catNest && this.mood === 'sleep') {
      this.catNest.style.left = (this.pos.x - 8) + 'px';
      this.catNest.style.top = (this.pos.y + 96) + 'px';
    }
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
    this.stopButterflyChase();
    this.setMood('idle', { message: '🙂 醒啦！' });
  }
}
