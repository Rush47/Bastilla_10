import assert from 'node:assert/strict';
import test from 'node:test';
import { STANDARD_OLLAMA_MODEL, buildStandardLlmConfig } from '../src/kernel/modelPolicy.ts';
import { configuredProviders, generateWithChain, LlmChainError } from '../src/kernel/llmChain.ts';

const request = { system: 'Respond briefly.', history: [], message: 'Hello' };

test('a response must explicitly confirm standard 8B rather than be relabeled as that model', async () => {
  for (const returnedModel of [undefined, 'qwen2.5:0.5b', STANDARD_OLLAMA_MODEL]) {
    const config = { ...buildStandardLlmConfig({}), fetchImpl: async () => new Response(JSON.stringify({
      model: returnedModel, message: { content: 'Hello.' },
    }), { status: 200 }) };
    if (returnedModel === STANDARD_OLLAMA_MODEL) {
      assert.equal((await generateWithChain(config, request)).model, STANDARD_OLLAMA_MODEL);
    } else {
      await assert.rejects(generateWithChain(config, request), /nie potwierdziła/);
    }
  }
});

test('stale environment and a fresh application configuration always select only dolphin 8B', () => {
  const env = {
    OLLAMA_MODEL: 'qwen2.5:0.5b', LLM_PROVIDERS: 'gemini,xai,ollama',
    GEMINI_API_KEY: 'g', XAI_API_KEY: 'x',
    OLLAMA_BASE_URL: ' http://ollama.example:11434/ ', OLLAMA_NUM_THREAD: '4',
  };
  for (let restart = 0; restart < 2; restart += 1) {
    const config = buildStandardLlmConfig({ ...env });
    assert.equal(config.ollamaModel, STANDARD_OLLAMA_MODEL);
    assert.deepEqual(configuredProviders(config), ['ollama']);
    assert.equal(config.ollamaBaseUrl, 'http://ollama.example:11434');
    assert.equal(config.ollamaNumThread, 4);
    assert.equal(config.geminiApiKey, undefined);
    assert.equal(config.xaiApiKey, undefined);
  }
  assert.equal(buildStandardLlmConfig({ OLLAMA_MODEL: 'auto' }).ollamaModel, 'dolphin-llama3:8b');
  assert.equal(buildStandardLlmConfig({}).ollamaModel, 'dolphin-llama3:8b');
});

test('host options remain finite and bounded without allowing a model override', () => {
  const config = buildStandardLlmConfig({
    OLLAMA_BASE_URL: ' ', OLLAMA_NUM_CTX: 'Infinity', OLLAMA_NUM_PREDICT: '999999',
    OLLAMA_NUM_THREAD: '-4', OLLAMA_KEEP_ALIVE: ' 30m ',
  });
  assert.equal(config.ollamaBaseUrl, 'http://127.0.0.1:11434');
  assert.equal(config.ollamaNumCtx, 4096);
  assert.equal(config.ollamaNumPredict, 3072);
  assert.equal(config.ollamaNumThread, 0);
  assert.equal(config.ollamaKeepAlive, '30m');
});

test('the standard runtime sends 8B to the chosen server and never falls back to cloud or small models', async () => {
  const calls = [];
  const config = {
    ...buildStandardLlmConfig({ OLLAMA_MODEL: 'small:latest', LLM_PROVIDERS: 'gemini', GEMINI_API_KEY: 'g' }),
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ error: 'model not found' }), { status: 404 });
    },
  };
  await assert.rejects(generateWithChain(config, request), (error) => error instanceof LlmChainError && /dolphin-llama3:8b/.test(error.message));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(calls[0].body.model, 'dolphin-llama3:8b');
});
