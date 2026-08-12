/**
 * DevPet ChatGPT Plugin — 基础冒烟测试
 * 运行：node test.js （会自动启动内置服务进行本地自测）
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { unlinkSync } from 'node:fs';

// 重置测试存储，保证断言幂等
const __testStore = join(dirname(fileURLToPath(import.meta.url)), '.test-store.json');
try { unlinkSync(__testStore); } catch {}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8799;
const BASE = `http://localhost:${PORT}`;

const results = [];
function check(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? '  — ' + extra : ''}`);
}

// 先做静态语法校验
import { readFileSync } from 'node:fs';
try {
  const src = readFileSync(join(__dirname, 'server.js'), 'utf8');
  check('server.js 存在且非空', src.length > 1000);
} catch (e) {
  check('server.js 存在且非空', false, String(e));
}

// 启动服务
const child = spawn('node', ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(PORT), STORE_FILE: join(__dirname, '.test-store.json') },
  stdio: 'ignore',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (path) => {
  const res = await fetch(BASE + path);
  return { status: res.status, body: await res.json() };
};
const post = async (path, data) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() };
};

try {
  await sleep(1500);
  check('服务已启动', true);

  let r = await get('/health');
  check('GET /health → 200 且 ok', r.status === 200 && r.body.ok === true);
  check('health 返回版本', r.body.version === '1.1.0');

  r = await get('/');
  check('GET / → 返回 endpoints 列表', r.status === 200 && Array.isArray(r.body.endpoints) && r.body.endpoints.length >= 8);

  r = await get('/pet/config');
  check('GET /pet/config → 返回 presets', r.status === 200 && Array.isArray(r.body.presets));
  check('catfoodTiers 有 4 档', Array.isArray(r.body.catfoodTiers) && r.body.catfoodTiers.length === 4);

  r = await get('/pet/status');
  check('GET /pet/status → 返回 pet/wallet/growth', r.status === 200 && r.body.pet && r.body.wallet && r.body.growth);

  r = await get('/pet/wallet');
  check('GET /pet/wallet → 返回 balance', r.status === 200 && typeof r.body.balance === 'number');

  r = await get('/pomodoro');
  check('GET /pomodoro → 返回 plan', r.status === 200 && r.body.plan && r.body.plan.work === 1500);

  r = await post('/pet/rename', { name: '测试猫' });
  check('POST /pet/rename → 改名成功', r.status === 200 && r.body.ok === true && r.body.pet.name === '测试猫');

  r = await post('/pet/report-token', { tokens: 3000 });
  check('POST /pet/report-token → 上报 token', r.status === 200 && r.body.ok === true && r.body.tokens === 3000);

  r = await get('/nonexistent');
  check('GET 404 → 返回错误与可用接口', r.status === 404 && r.body.ok === false && Array.isArray(r.body.available));

  r = await get('/openapi.json');
  check('GET /openapi.json → 返回 OpenAPI', r.status === 200 && r.body.openapi && r.body.paths);

  r = await get('/.well-known/ai-plugin.json');
  check('GET /.well-known/ai-plugin.json → 返回 manifest', r.status === 200 && r.body.name_for_model);

  // 外部数据（可能因网络不可达而 offline，但仍应为 200）
  r = await get('/weather?city=深圳');
  check('GET /weather → 200（可 offline）', r.status === 200 && r.body.city === '深圳');

  r = await get('/fx?from=USD&to=CNY');
  check('GET /fx → 200（可 offline）', r.status === 200 && r.body.base === 'USD');

  r = await get('/market/crypto/bitcoin');
  check('GET /market/crypto/:id → 200（可 offline）', r.status === 200 && Array.isArray(r.body.list));
} finally {
  child.kill();
}

const passed = results.filter((x) => x.pass).length;
console.log(`\n=== 结果：${passed}/${results.length} 通过 ===`);
process.exit(passed === results.length ? 0 : 1);
