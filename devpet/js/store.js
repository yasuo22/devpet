/**
 * store.js — localStorage 状态管理
 * 提供带默认值的 get / set / 持久化封装，localStorage 不可用时降级为内存存储。
 */

const PREFIX = 'devpet.';

// localStorage 可用性检测
let memoryStore = {};
const storage = (() => {
  try {
    const t = '__devpet_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return window.localStorage;
  } catch (e) {
    return null; // 降级为内存
  }
})();

/**
 * 读取值；不存在时写入并返回默认值。
 * @param {string} key 键（不含前缀）
 * @param {*} defaultVal 默认值
 */
export function get(key, defaultVal) {
  const full = PREFIX + key;
  let raw = null;
  if (storage) raw = storage.getItem(full);
  else raw = memoryStore[full] ?? null;

  if (raw === null) {
    // 写入默认值并返回
    const serialized = JSON.stringify(defaultVal);
    if (storage) storage.setItem(full, serialized);
    else memoryStore[full] = serialized;
    return defaultVal;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return defaultVal;
  }
}

/**
 * 写入值。
 * @param {string} key 键（不含前缀）
 * @param {*} val 任意可序列化值
 */
export function set(key, val) {
  const full = PREFIX + key;
  const serialized = JSON.stringify(val);
  if (storage) storage.setItem(full, serialized);
  else memoryStore[full] = serialized;
}

/** 删除指定键 */
export function remove(key) {
  const full = PREFIX + key;
  if (storage) storage.removeItem(full);
  else delete memoryStore[full];
}

/** 清空所有 DevPet 相关数据 */
export function clear() {
  if (storage) {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
  } else {
    memoryStore = {};
  }
}
