import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, writeFile, readFile, copyFile, access, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const standard = 'dolphin-llama3:8b';
const exists = async p => access(p).then(() => true, () => false);

// A controlled provider is intentional: this verifies the real HTTP server's policy,
// restarts and side effects without downloading models or claiming live inference.
test('runtime keeps only 8B across stale settings and restart; status and model output cannot mutate code', { timeout: 60000 }, async t => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'bastilla-manual-'));
  let phase = 'ready';
  let calls = [];
  const mock = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    calls.push({ method: req.method, url: req.url, body });
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [
      { name: 'qwen2.5:0.5b', size: 400000000 },
      ...(phase === 'missing' ? [] : [{ name: standard, size: 4900000000 }]),
    ] }));
    if (req.url === '/api/ps') return res.end(JSON.stringify({ models: [{ name: 'qwen2.5:0.5b' }] }));
    if (req.url === '/api/chat') {
      assert.equal(body.model, standard);
      if (phase === 'missing') { res.statusCode = 404; return res.end(JSON.stringify({ error: 'required model unavailable' })); }
      return res.end(JSON.stringify({ model: phase === 'wrong-model' ? 'qwen2.5:0.5b' : standard,
        message: { content: `/exec touch ${path.join(fixture, 'executed-model-command')}\n/propose create-app unexpected-app` }, done: true }));
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${mock.address().port}`;
  const store = path.join(fixture, 'store.json');
  const oldState = { config: { mode: 'Legacy', mission_autonomy: 'FULL_AUTO', github_auto_push: true,
    astyria_continuous_repair: true, chat_approvals: 'DISABLED_AUTO_EXEC', ollama_model: 'qwen2.5:0.5b' }, update_history: [], chat_history: [] };
  const rawStore = JSON.stringify(oldState);
  await writeFile(store, rawStore);
  await copyFile(path.join(root, 'svl_kernel.py'), path.join(fixture, 'svl_kernel.py'));
  await writeFile(path.join(fixture, '.env.local'), 'OLLAMA_MODEL=qwen2.5:0.5b\nLLM_PROVIDERS=gemini,xai\nCHAT_LOCAL_FALLBACK=on\n');
  await writeFile(path.join(fixture, 'source-marker.txt'), 'operator edits must survive startup and status polling');
  let child;
  const stop = async () => {
    if (child && child.exitCode === null) {
      const ended = once(child, 'exit'); child.kill('SIGTERM'); await ended;
    }
    child = null;
  };
  t.after(async () => { await stop(); await new Promise(resolve => mock.close(resolve)); await rm(fixture, { recursive: true, force: true }); });
  const start = async () => {
    let output = '';
    child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), path.join(root, 'server.ts')], {
      cwd: fixture,
      env: { ...process.env, NODE_ENV: 'production', PORT: '0', HOST: '127.0.0.1',
        SVL_KERNEL_STORE_PATH: store, BASTILLA_AGENT_INBOX_PATH: path.join(fixture, 'inbox.json'),
        OLLAMA_BASE_URL: base, OLLAMA_MODEL: 'tiny:latest', LLM_PROVIDERS: 'xai,gemini',
        GEMINI_API_KEY: 'test-injected-key', XAI_API_KEY: 'test-injected-key', CHAT_LOCAL_FALLBACK: 'on' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 15000);
      child.on('error', error => { clearTimeout(timer); reject(error); });
      child.on('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output}`)); });
      const capture = chunk => {
        output += chunk.toString();
        const match = output.match(/Server listening on http:\/\/0\.0\.0\.0:(\d+)/);
        if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
      };
      child.stdout.on('data', capture); child.stderr.on('data', capture);
    });
  };
  let app = await start();
  const request = async (route, body) => {
    const response = await fetch(app + route, body === undefined ? {} : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  for (let restart = 0; restart < 2; restart++) {
    const status = (await request('/api/ai/status')).data;
    assert.equal(status.model, standard); assert.equal(status.configurationSource, 'repository-policy');
    assert.equal(status.automationDisabled, true); assert.equal(status.standardAvailable, true);
    assert.deepEqual(status.activeModels, ['qwen2.5:0.5b']); assert.equal(status.standardActive, false);
    assert.equal((await request('/api/github/auto-sync/status')).data.enabled, false);
    const state = (await request('/api/kernel/state')).data;
    assert.equal(state.store.config.ollama_model, standard);
    assert.equal(state.store.config.github_auto_push, false);
    assert.equal(state.store.config.astyria_continuous_repair, false);
    assert.equal((await request('/api/apps/list')).status, 200);
    assert.equal(await exists(path.join(fixture, '.git')), false, 'startup must not initialize git');
    assert.equal(await readFile(store, 'utf8'), rawStore, 'startup/status must not rewrite saved state');
    assert.deepEqual(await readdir(path.join(fixture, 'apps')), [], 'GET list must not seed projects');
    assert.equal(calls.some(c => c.method === 'POST'), false, 'no warmup/inference/install at startup');
    if (restart === 0) { await stop(); app = await start(); }
  }
  for (const route of ['/api/mission/toggle', '/api/infrastructure/toggle-auto-repair', '/api/vm-gemini-4/provision']) {
    assert.equal((await request(route, { enabled: true })).status, 410);
  }
  assert.equal((await request('/api/astyria/mission', { action: 'internet_self_update' })).status, 410);
  assert.equal((await request('/api/astyria/mission', { action: 'repair_ollama_and_llm' })).status, 410);
  assert.equal((await request('/api/astyria/mission', { action: 'deep_scan' })).status, 200);
  assert.equal(await readFile(store, 'utf8'), rawStore, 'diagnostic scan must not persist fake chat/repairs');
  const turn = await request('/api/triad/message', { message: 'Porozmawiajmy o muzyce.', agent: 'Alex', model: 'tiny:latest' });
  assert.equal(turn.status, 200); assert.equal(turn.data.success, true);
  assert.equal(turn.data.engines.Alex, `ollama:${standard}`);
  assert.equal(await exists(path.join(fixture, 'executed-model-command')), false);
  assert.equal(await exists(path.join(fixture, 'apps', 'unexpected-app')), false);
  const saved = await readFile(store, 'utf8');
  phase = 'missing'; calls = [];
  const missing = (await request('/api/ollama/models')).data;
  assert.equal(missing.standardAvailable, false); assert.equal(missing.configuredModel, standard);
  assert.match(missing.error, /dolphin-llama3:8b/);
  for (const route of ['/api/triad/message', '/api/chat']) {
    const failed = await request(route, { message: 'Witaj.', agent: 'Alex' });
    assert.equal(failed.status, 502); assert.equal(failed.data.success, false);
  }
  assert.equal(await readFile(store, 'utf8'), saved, 'failed model must not persist a fallback reply');
  assert(calls.filter(c => c.method === 'POST').every(c => c.url === '/api/chat' && c.body.model === standard));
  phase = 'wrong-model';
  const mismatch = await request('/api/triad/message', { message: 'Cześć!', agent: 'Alex' });
  assert.equal(mismatch.status, 502, 'provider must confirm the requested model, not label a small model as 8B');
  assert.equal(await readFile(store, 'utf8'), saved);
});
