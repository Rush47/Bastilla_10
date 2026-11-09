import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOllamaRecommendations,
  collectOllamaDiagnostics,
  describeOllamaDiagnostics,
} from '../src/kernel/ollamaDiagnostics.ts';

const GB = 1024 ** 3;
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const host = { ramGb: 8, cpus: 2, configuredModel: 'auto', keepAlive: '24h', numCtx: 4096 };

function router(routes) {
  const calls = [];
  const impl = async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : undefined });
    for (const [pattern, respond] of routes) if (pattern.test(String(url))) return respond();
    throw new Error(`unexpected ${url}`);
  };
  return { impl, calls };
}

const healthyRoutes = (tokens = 40, nanos = 8_000_000_000) => [
  [/api\/version/, () => json(200, { version: '0.9.0' })],
  [/api\/tags/, () => json(200, { models: [
    { name: 'qwen3.5:4b', size: 3.3 * GB },
    { name: 'nomic-embed-text', size: 0.3 * GB },
  ] })],
  [/api\/chat/, () => json(200, { eval_count: tokens, eval_duration: nanos, message: { content: 'ok' } })],
  [/api\/ps/, () => json(200, { models: [{ name: 'qwen3.5:4b', size: 3.3 * GB, size_vram: 0 }] })],
];

test('diagnostyka zbiera wersję, modele, prędkość i stan pamięci', async () => {
  const { impl, calls } = router(healthyRoutes());
  const diag = await collectOllamaDiagnostics('http://127.0.0.1:11434/', host, impl);
  assert.equal(diag.reachable, true);
  assert.equal(diag.version, '0.9.0');
  assert.equal(diag.resolvedModel, 'qwen3.5:4b');
  assert.equal(diag.tokensPerSecond, 5);
  assert.equal(diag.loaded.length, 1);
  const chat = calls.find((c) => c.url.includes('/api/chat'));
  assert.equal(chat.body.keep_alive, '24h');
  assert.match(describeOllamaDiagnostics(diag), /qwen3.5:4b/);
});

test('brak serwera Ollamy → jedna rekomendacja z poleceniem instalacji', async () => {
  const { impl } = router([[/./, () => { throw new TypeError('fetch failed'); }]]);
  const diag = await collectOllamaDiagnostics('http://127.0.0.1:11434', host, impl);
  assert.equal(diag.reachable, false);
  const recs = buildOllamaRecommendations(diag);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].command, 'npm run setup:ollama');
  assert.match(describeOllamaDiagnostics(diag), /BRAK POŁĄCZENIA/);
});

test('wolny model na CPU → mniejszy model; szybki z dużym RAM → większy', async () => {
  const slow = await collectOllamaDiagnostics('http://127.0.0.1:11434', host, router(healthyRoutes(10, 5_000_000_000)).impl);
  assert.equal(slow.tokensPerSecond, 2);
  const slowRecs = buildOllamaRecommendations(slow);
  assert.ok(slowRecs.some((r) => r.agent === 'Astyria' && /llava-phi3:3.8b/.test(r.command ?? '')));

  const fast = await collectOllamaDiagnostics('http://127.0.0.1:11434', { ...host, ramGb: 32 }, router(healthyRoutes(200, 8_000_000_000)).impl);
  const fastRecs = buildOllamaRecommendations(fast);
  assert.ok(fastRecs.some((r) => /gemma4:12b/.test(r.command ?? '')));
});

test('brak modeli, nieużywane duże modele i adres spoza pętli zwrotnej', async () => {
  const empty = await collectOllamaDiagnostics('http://127.0.0.1:11434', host, router([
    [/api\/version/, () => json(200, { version: '1' })],
    [/api\/tags/, () => json(200, { models: [] })],
    [/api\/ps/, () => json(200, { models: [] })],
  ]).impl);
  assert.equal(buildOllamaRecommendations(empty)[0].command, 'npm run setup:ollama');

  const crowded = await collectOllamaDiagnostics('http://192.168.1.5:11434', host, router([
    [/api\/version/, () => json(200, { version: '1' })],
    [/api\/tags/, () => json(200, { models: [{ name: 'a:12b', size: 8 * GB }, { name: 'b:70b', size: 40 * GB }] })],
    [/api\/chat/, () => json(200, { eval_count: 100, eval_duration: 5_000_000_000 })],
    [/api\/ps/, () => json(200, { models: [] })],
  ]).impl);
  assert.equal(crowded.resolvedModel, 'b:70b');
  const recs = buildOllamaRecommendations(crowded);
  assert.ok(recs.some((r) => r.agent === 'Aurelius' && /ollama rm/.test(r.text)));
  assert.ok(recs.some((r) => r.agent === 'Aurelius' && /nie przez pętlę zwrotną/.test(r.text)));
  assert.ok(recs.every((r) => ['Alex', 'Astyria', 'Aurelius'].includes(r.agent)));
});
