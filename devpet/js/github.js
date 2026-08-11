/**
 * github.js — GitHub 作品展示 + 贡献热图 + 账号关联
 * 拉取公开用户仓库、贡献热图、最近提交；失败时使用离线示例数据。
 */

import { CONFIG } from './config.js';
import * as store from './store.js';

const TIMEOUT_MS = 6000;

/** 获取当前关联的 GitHub 用户名（localStorage 可覆盖默认） */
export function getGitHubUser() {
  return store.get('githubUser', CONFIG.GITHUB.defaultUser);
}

/** 关联 / 更新 GitHub 账号 */
export function setGitHubUser(user) {
  const name = (user || '').trim().replace(/^@/, '');
  if (!name) return null;
  store.set('githubUser', name);
  return name;
}

/* ---------- 用户信息 ---------- */
/**
 * 获取 GitHub 用户基础信息。
 * @returns {Promise<{user: object|null, offline: boolean}>}
 */
export async function fetchGitHubUser(user = getGitHubUser()) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(CONFIG.GITHUB.userEndpoint(user), {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('github user http ' + res.status);
    const u = await res.json();
    return {
      user: {
        login: u.login,
        name: u.name || u.login,
        avatar: u.avatar_url,
        bio: u.bio || '',
        followers: u.followers ?? 0,
        following: u.following ?? 0,
        public_repos: u.public_repos ?? 0,
        html_url: u.html_url,
      },
      offline: false,
    };
  } catch (e) {
    return {
      user: {
        login: user,
        name: user,
        avatar: '',
        bio: '',
        followers: 0,
        following: 0,
        public_repos: 0,
        html_url: `https://github.com/${user}`,
      },
      offline: true,
      error: e.message,
    };
  }
}

/* ---------- 仓库列表 ---------- */
/**
 * 获取 GitHub 用户的公开仓库。
 * @returns {Promise<{list: Array, offline: boolean}>}
 */
export async function fetchRepos(user = getGitHubUser()) {
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

/* ---------- 贡献热图 ---------- */
/**
 * 拉取 GitHub 贡献热图（SVG 数据），解析为网格单元数组。
 * GitHub 无 Key 时该接口限流较严，失败时回退到离线生成的随机热图。
 * @returns {Promise<{weeks: Array, total: number, offline: boolean}>}
 */
export async function fetchContributions(user = getGitHubUser()) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(CONFIG.CONTRIBUTIONS.endpoint(user), {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('contrib http ' + res.status);
    const svg = await res.text();
    const cells = parseContributionSvg(svg);
    if (cells.length === 0) throw new Error('empty contribution svg');
    return { weeks: cells, total: sum(cells), offline: false };
  } catch (e) {
    const weeks = genOfflineContributions();
    return { weeks, total: sum(weeks), offline: true, error: e.message };
  }
}

/** 从 GitHub 贡献 SVG 中解析每天的贡献等级 */
function parseContributionSvg(svg) {
  const cells = [];
  const re = /data-date="([\d-]+)"[^>]*data-level="(\d)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    cells.push({ date: m[1], level: parseInt(m[2], 10) });
  }
  return cells;
}

/** 生成离线降级热图（最近 N 天，伪随机等级） */
function genOfflineContributions() {
  const days = CONFIG.CONTRIBUTIONS.offlineDays || 28;
  const out = [];
  const now = Date.now();
  let seed = 7;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // 周末略多，模拟真实节奏
    let level = 0;
    const r = rand();
    if (r > 0.78) level = 4;
    else if (r > 0.6) level = 3;
    else if (r > 0.42) level = 2;
    else if (r > 0.24) level = 1;
    out.push({ date: iso, level });
  }
  return out;
}

function sum(arr) {
  return arr.reduce((a, c) => a + c.level, 0);
}

/* ---------- 最近提交 / PR ---------- */
/**
 * 拉取用户最近公开活动（PushEvent / PullRequestEvent），提取提交与 PR。
 * @returns {Promise<{events: Array, offline: boolean}>}
 */
export async function fetchRecentEvents(user = getGitHubUser()) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(CONFIG.GITHUB.eventsEndpoint(user), {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error('events http ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('bad events payload');

    const events = [];
    for (const e of data) {
      if (e.type === 'PushEvent') {
        (e.payload?.commits || []).forEach((c) => {
          events.push({
            kind: 'commit',
            repo: e.repo?.name || '',
            message: c.message?.split('\n')[0] || 'commit',
            date: e.created_at,
            url: `https://github.com/${e.repo?.name || ''}/commit/${c.sha}`,
          });
        });
      } else if (e.type === 'PullRequestEvent' && e.payload?.pull_request) {
        const pr = e.payload.pull_request;
        events.push({
          kind: 'pr',
          repo: e.repo?.name || '',
          message: (e.payload.action === 'opened' ? '🆕 ' : '') + (pr.title || 'PR'),
          date: e.created_at,
          url: pr.html_url,
          state: pr.state,
        });
      }
    }
    return { events: events.slice(0, 12), offline: false };
  } catch (e) {
    return {
      events: [
        { kind: 'commit', repo: 'DevPet', message: 'feat: 初始化 DevPet 应用', date: new Date().toISOString(), url: '' },
        { kind: 'pr', repo: 'DevPet', message: 'docs: 添加 README 说明', date: new Date().toISOString(), url: '' },
      ],
      offline: true,
      error: e.message,
    };
  }
}
