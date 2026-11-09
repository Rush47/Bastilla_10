import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOllamaRecommendations, collectOllamaDiagnostics, describeOllamaDiagnostics } from '../src/kernel/ollamaDiagnostics.ts';

const GB = 1024 ** 3;
const standard = 'dolphin-llama3:8b';
const host = { ramGb: 8, cpus: 2, configuredModel: 'auto', keepAlive: '24h', numCtx: 4096 };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function readOnlyOllama(models, loaded = []) {
  const calls = [];
  return {
    calls,
    impl: async (url, init = {}) => {
      calls.push({ url: String(url), method: init.method || 'GET' });
      assert.equal(init.method || 'GET', 'GET');
      if (url.endsWith('/api/version')) return json(200, { version: '0.9.0' });
      if (url.endsWith('/api/tags')) return json(200, { models });
      if (url.endsWith('/api/ps')) return json(200, { models: loaded });
      throw new Error(`unexpected ${url}`);
    },
  };
}

test('diagnostics inspect installed and loaded models without inference or model substitution', async () => {
  const { impl, calls } = readOnlyOllama([
    { name: 'qwen3.5:4b', size: 3.3 * GB }, { name: standard, size: 4.7 * GB },
  ], [{ name: 'qwen3.5:4b', size: 3.3 * GB, size_vram: 0 }]);
  const diag = await collectOllamaDiagnostics('http://127.0.0.1:11434/', host, impl);
  assert.equal(diag.reachable, true);
  assert.equal(diag.configuredModel, standard);
  assert.equal(diag.resolvedModel, standard);
  assert.equal(diag.loaded[0].name, 'qwen3.5:4b');
  assert.equal(diag.tokensPerSecond, null);
  assert.equal(diag.firstTokenMs, null);
  assert.equal(calls.length, 3);
  assert.match(describeOllamaDiagnostics(diag), /wymagany model: dolphin-llama3:8b; dostępny: tak/);
  assert.ok(buildOllamaRecommendations(diag).some((item) => /inne modele w pamięci/.test(item.text)));
});

test('an unavailable Ollama produces a diagnostic, not installation instructions', async () => {
  const diag = await collectOllamaDiagnostics('http://127.0.0.1:11434', host, async () => { throw new TypeError('fetch failed'); });
  assert.equal(diag.reachable, false);
  const recommendations = buildOllamaRecommendations(diag);
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].command, undefined);
  assert.match(recommendations[0].text, /dolphin-llama3:8b/);
  assert.match(describeOllamaDiagnostics(diag), /BRAK POŁĄCZENIA/);
});

test('small models alone do not satisfy the standard model requirement', async () => {
  for (const models of [[], [{ name: 'qwen2.5:0.5b', size: 0.5 * GB }]]) {
    const { impl, calls } = readOnlyOllama(models);
    const diag = await collectOllamaDiagnostics('http://127.0.0.1:11434', host, impl);
    assert.equal(diag.resolvedModel, null);
    assert.match(diag.error, /Wymagany model dolphin-llama3:8b/);
    assert.match(buildOllamaRecommendations(diag)[0].text, /właściwą instancją/);
    assert.ok(calls.every((call) => !call.url.endsWith('/api/chat')));
  }
});

test('recommendations never install, delete, select a different model or rewrite configuration', async () => {
  const { impl } = readOnlyOllama([
    { name: standard, size: 4.7 * GB }, { name: 'other:70b', size: 40 * GB },
  ], [{ name: standard, size: 4.7 * GB, size_vram: 0 }]);
  const diag = await collectOllamaDiagnostics('http://192.168.1.5:11434', { ...host, numCtx: 8192, ramGb: 32 }, impl);
  const recommendations = buildOllamaRecommendations(diag);
  assert.ok(recommendations.some((item) => /nie przez pętlę zwrotną/.test(item.text)));
  assert.ok(recommendations.every((item) => !item.command || ['ollama list', 'ollama ps'].includes(item.command)));
  assert.doesNotMatch(JSON.stringify(recommendations), /setup:|setup-|ollama pull|ollama rm|mniejszy model|większy model/);
});
