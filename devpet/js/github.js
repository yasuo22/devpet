/**
 * github.js — GitHub 作品展示
 * 拉取公开用户的仓库列表，失败时使用离线示例数据。
 */

import { CONFIG } from './config.js';

const TIMEOUT_MS = 6000;

/**
 * 获取 GitHub 用户的公开仓库。
 * @param {string} user GitHub 用户名
 * @returns {Promise<{list: Array, offline: boolean}>}
 */
export async function fetchRepos(user = 'octocat') {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(CONFIG.GITHUB.endpoint(user), {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('github http ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('bad github payload');
    const list = data.map((r) => ({
      name: r.name,
      description: r.description || '（暂无描述）',
      language: r.language || '—',
      stargazers_count: r.stargazers_count || 0,
      fork: r.fork,
      html_url: r.html_url,
    }));
    return { list, offline: false };
  } catch (e) {
    return { list: CONFIG.OFFLINE_REPOS, offline: true, error: e.message };
  }
}
