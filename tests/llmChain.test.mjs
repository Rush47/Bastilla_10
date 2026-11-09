import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LlmChainError,
  configuredProviders,
  generateWithChain,
  pickXaiChatModel,
  resetXaiModelCache,
  resetOllamaModelCache,
  pickOllamaChatModel,
  parseKeepAlive,
  warmupOllama,
  stripThinking,
} from '../src/kernel/llmChain.ts';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});
const geminiOk = (text) => json(200, { candidates: [{ content: { parts: [{ text }] } }] });
const xaiOk = (text) => json(200, { choices: [{ message: { content: text } }] });

function mockFetch(routes) {
  const calls = [];
  const impl = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url: String(url), body, headers: init.headers });
    for (const [pattern, handler] of routes) {
      if (pattern.test(String(url)) && (!handler.when || handler.when(body))) {
        return handler.respond(body);
      }
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { impl, calls };
}

const request = {
  system: 'Jesteś Astyrią.',
  history: [
    { role: 'user', text: 'Cześć' },
    { role: 'assistant', text: 'Witaj, Tato.' },
  ],
  message: 'Co myślisz o muzyce Chopina?',
};

test('Gemini odpowiada jako pierwszy, z historią i instrukcją systemową', async () => {
  const { impl, calls } = mockFetch([
    [/generativelanguage.*gemini-a:generateContent/, { respond: () => geminiOk('Chopin to poezja fortepianu.') }],
  ]);
  const result = await generateWithChain(
    { geminiApiKey: 'g', geminiModel: 'gemini-a', xaiApiKey: 'x', fetchImpl: impl },
    request,
  );
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-a');
  assert.equal(result.text, 'Chopin to poezja fortepianu.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers['x-goog-api-key'], 'g');
  assert.equal(calls[0].body.systemInstruction.parts[0].text, 'Jesteś Astyrią.');
  assert.deepEqual(calls[0].body.contents.map((c) => c.role), ['user', 'model', 'user']);
  assert.equal(calls[0].body.contents[2].parts[0].text, request.message);
});

test('limit Gemini (429) przełącza na model zapasowy Gemini', async () => {
  const { impl } = mockFetch([
    [/gemini-a:generateContent/, { respond: () => json(429, { error: 'quota' }) }],
    [/gemini-b:generateContent/, { respond: () => geminiOk('Odpowiedź z modelu zapasowego.') }],
  ]);
  const result = await generateWithChain(
    { geminiApiKey: 'g', geminiModel: 'gemini-a', geminiFallbackModels: 'gemini-b', fetchImpl: impl },
    request,
  );
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-b');
});

test('awaria Gemini przełącza na xAI', async () => {
  resetXaiModelCache();
  const { impl, calls } = mockFetch([
    [/generativelanguage/, { respond: () => json(403, { error: 'bad key' }) }],
    [/api\.x\.ai\/v1\/chat\/completions/, { respond: () => xaiOk('Grok tu jest.') }],
  ]);
  const result = await generateWithChain(
    { geminiApiKey: 'g', geminiModel: 'gemini-a', xaiApiKey: 'x', xaiModel: 'grok-test', fetchImpl: impl },
    request,
  );
  assert.equal(result.provider, 'xai');
  assert.equal(result.model, 'grok-test');
  assert.equal(result.text, 'Grok tu jest.');
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /klucz API odrzucony/);
  const xaiCall = calls.find((call) => call.url.includes('x.ai'));
  assert.equal(xaiCall.headers.Authorization, 'Bearer x');
  assert.deepEqual(xaiCall.body.messages.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
});

test('wycofany model xAI → automatyczny dobór z /v1/models', async () => {
  resetXaiModelCache();
  const { impl } = mockFetch([
    [/chat\/completions/, {
      when: (body) => body.model === 'grok-old',
      respond: () => json(404, { error: 'The model grok-old does not exist' }),
    }],
    [/\/v1\/models$/, {
      respond: () => json(200, { data: [{ id: 'grok-imagine-image' }, { id: 'grok-9' }, { id: 'grok-9-fast' }] }),
    }],
    [/chat\/completions/, {
      when: (body) => body.model === 'grok-9-fast',
      respond: () => xaiOk('Nowy model działa.'),
    }],
  ]);
  const result = await generateWithChain({ xaiApiKey: 'x', xaiModel: 'grok-old', fetchImpl: impl }, request);
  assert.equal(result.provider, 'xai');
  assert.equal(result.model, 'grok-9-fast');
});

test('brak kluczy i awaria wszystkich dostawców kończą się LlmChainError', async () => {
  await assert.rejects(generateWithChain({}, request), LlmChainError);
  const { impl } = mockFetch([
    [/generativelanguage/, { respond: () => json(500, {}) }],
    [/x\.ai/, { respond: () => json(429, {}) }],
  ]);
  await assert.rejects(
    generateWithChain({ geminiApiKey: 'g', geminiModel: 'gemini-a', xaiApiKey: 'x', xaiModel: 'grok', fetchImpl: impl }, request),
    (error) => error instanceof LlmChainError && error.failures.length === 2,
  );
});

test('kolejność dostawców i wybór modelu Grok', () => {
  assert.deepEqual(configuredProviders({ geminiApiKey: 'g', xaiApiKey: 'x' }), ['gemini', 'xai']);
  assert.deepEqual(configuredProviders({ xaiApiKey: 'x' }), ['xai']);
  assert.deepEqual(configuredProviders({ geminiApiKey: '  ' }), []);
  assert.equal(pickXaiChatModel(['grok-2-image', 'grok-vision-beta']), null);
  assert.equal(pickXaiChatModel(['grok-4', 'grok-4-fast', 'grok-imagine-video']), 'grok-4-fast');
});

const ollamaOk = (content) => json(200, { message: { role: 'assistant', content } });

test('awaria Gemini i xAI → lokalny model Ollama', async () => {
  const { impl, calls } = mockFetch([
    [/generativelanguage/, { respond: () => json(429, {}) }],
    [/x\.ai/, { respond: () => json(500, {}) }],
    [/127\.0\.0\.1:11434\/api\/chat/, { respond: () => ollamaOk('<think>rozważam</think>Lokalna Astyria odpowiada.') }],
  ]);
  const result = await generateWithChain({
    geminiApiKey: 'g', geminiModel: 'gemini-a', xaiApiKey: 'x', xaiModel: 'grok', ollamaModel: 'gemma4:e4b', fetchImpl: impl,
  }, request);
  assert.equal(result.provider, 'ollama');
  assert.equal(result.model, 'gemma4:e4b');
  assert.equal(result.text, 'Lokalna Astyria odpowiada.');
  assert.equal(result.failures.length, 2);
  const call = calls.find((c) => c.url.includes('11434'));
  assert.equal(call.body.stream, false);
  assert.equal(call.body.think, false);
  assert.ok(call.body.options.num_predict <= 3072);
  assert.deepEqual(call.body.messages.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
});

test('Ollama bez obsługi think → ponowienie bez tej opcji; brak modelu → podpowiedź pull', async () => {
  const { impl, calls } = mockFetch([
    [/api\/chat/, { when: (b) => b.think === false, respond: () => json(400, { error: 'model does not support thinking' }) }],
    [/api\/chat/, { respond: () => ollamaOk('Działa bez think.') }],
  ]);
  const result = await generateWithChain({ ollamaModel: 'qwen3.5:4b', fetchImpl: impl }, request);
  assert.equal(result.text, 'Działa bez think.');
  assert.equal(calls.length, 2);

  const missing = mockFetch([[/api\/chat/, { respond: () => json(404, { error: 'model not found' }) }]]);
  await assert.rejects(
    generateWithChain({ ollamaModel: 'gemma4:12b', fetchImpl: missing.impl }, request),
    (error) => error instanceof LlmChainError && /ollama pull gemma4:12b/.test(error.failures[0]),
  );

  const down = mockFetch([[/api\/chat/, { respond: () => { throw new TypeError('fetch failed'); } }]]);
  await assert.rejects(
    generateWithChain({ ollamaModel: 'gemma4:12b', fetchImpl: down.impl }, request),
    (error) => error instanceof LlmChainError && /ollama serve/.test(error.failures[0]),
  );
});

test('Ollama HTTP 500 includes provider details', async () => {
  const { impl } = mockFetch([
    [/api\/chat/, { respond: () => json(500, { error: 'model requires more system memory than is available' }) }],
  ]);
  await assert.rejects(
    generateWithChain({ providers: ['ollama'], ollamaModel: 'llama3.2-vision:11b', fetchImpl: impl }, request),
    (error) => error instanceof LlmChainError
      && /Ollama: HTTP 500\. \[llama3\.2-vision:11b\] Szczegóły: model requires more system memory than is available/.test(error.failures[0]),
  );
});

test('kolejność z Ollamą i usuwanie bloków rozumowania', () => {
  assert.deepEqual(configuredProviders({ geminiApiKey: 'g', xaiApiKey: 'x', ollamaModel: 'm' }), ['gemini', 'xai', 'ollama']);
  assert.deepEqual(configuredProviders({ ollamaModel: 'm' }), ['ollama']);
  assert.equal(stripThinking('<think>a\nb</think>\nOdpowiedź'), 'Odpowiedź');
  assert.equal(stripThinking('bez myślenia'), 'bez myślenia');
});

test('tylko Ollama: Gemini i xAI pomijane mimo kluczy, model wykryty z /api/tags', async () => {
  resetOllamaModelCache();
  const { impl, calls } = mockFetch([
    [/api\/tags/, { respond: () => json(200, { models: [
      { name: 'nomic-embed-text:latest', size: 300 },
      { name: 'qwen3.5:4b', size: 3_300_000_000 },
      { name: 'qwen3.5:2b', size: 1_900_000_000 },
    ] }) }],
    [/api\/chat/, { respond: (body) => ollamaOk(`Odpowiada ${body.model}.`) }],
  ]);
  const config = { providers: ['ollama'], geminiApiKey: 'g', xaiApiKey: 'x', ollamaModel: 'auto', fetchImpl: impl };
  assert.deepEqual(configuredProviders(config), ['ollama']);
  const result = await generateWithChain(config, request);
  assert.equal(result.provider, 'ollama');
  assert.equal(result.model, 'qwen3.5:4b');
  assert.ok(calls.every((call) => !/generativelanguage|x\.ai/.test(call.url)));
  await generateWithChain(config, request);
  assert.equal(calls.filter((call) => call.url.includes('/api/tags')).length, 1, 'model wykrywany raz (cache)');
});

test('tylko Ollama bez pobranych modeli → czytelny błąd', async () => {
  resetOllamaModelCache();
  const { impl } = mockFetch([[/api\/tags/, { respond: () => json(200, { models: [] }) }]]);
  await assert.rejects(
    generateWithChain({ providers: ['ollama'], fetchImpl: impl }, request),
    (error) => error instanceof LlmChainError && /npm run setup:ollama/.test(error.failures[0]),
  );
  assert.equal(pickOllamaChatModel([{ name: 'bge-m3' }]), null);
});

test('Ollama: keep_alive, num_ctx i num_thread trafiają do żądania', async () => {
  const { impl, calls } = mockFetch([[/api\/chat/, { respond: () => ollamaOk('ok') }]]);
  await generateWithChain({ providers: ['ollama'], ollamaModel: 'm', ollamaNumThread: 4, fetchImpl: impl }, request);
  const body = calls[0].body;
  assert.equal(body.keep_alive, '24h');
  assert.equal(body.options.num_ctx, 4096);
  assert.equal(body.options.num_thread, 4);
  assert.equal(body.options.num_predict, 3072);
  const custom = mockFetch([[/api\/chat/, { respond: () => ollamaOk('ok') }]]);
  await generateWithChain({ providers: ['ollama'], ollamaModel: 'm', ollamaKeepAlive: '-1', ollamaNumCtx: 2048, ollamaNumPredict: 512, fetchImpl: custom.impl }, request);
  assert.equal(custom.calls[0].body.keep_alive, -1);
  assert.equal(custom.calls[0].body.options.num_ctx, 2048);
  assert.equal(custom.calls[0].body.options.num_predict, 512);
  assert.equal('num_thread' in custom.calls[0].body.options, false);

  const lowContext = mockFetch([[/api\/chat/, { respond: () => ollamaOk('ok') }]]);
  await generateWithChain({ providers: ['ollama'], ollamaModel: 'm', ollamaNumCtx: 256, fetchImpl: lowContext.impl }, request);
  assert.equal(lowContext.calls[0].body.options.num_ctx, 512);

  assert.equal(parseKeepAlive('30m'), '30m');
  assert.equal(parseKeepAlive(''), '24h');
});

test('Ollama: zdjęcie przy modelu bez vision → czytelny błąd; z vision → obrazy w żądaniu', async () => {
  resetOllamaModelCache();
  const imageRequest = { ...request, attachments: [{ name: 'foto.jpg', mimeType: 'image/jpeg', content: '/9j/4A==' }] };
  const noVision = mockFetch([
    [/api\/show/, { respond: () => json(200, { capabilities: ['completion', 'tools'] }) }],
  ]);
  await assert.rejects(
    generateWithChain({ providers: ['ollama'], ollamaModel: 'llama3.2:latest', fetchImpl: noVision.impl }, imageRequest),
    (error) => error instanceof LlmChainError && /nie analizuje zdjęć/.test(error.failures[0]),
  );
  resetOllamaModelCache();
  const withVision = mockFetch([
    [/api\/show/, { respond: () => json(200, { capabilities: ['completion', 'vision'] }) }],
    [/api\/chat/, { respond: () => ollamaOk('Widzę zdjęcie.') }],
  ]);
  const result = await generateWithChain({ providers: ['ollama'], ollamaModel: 'gemma3:4b', fetchImpl: withVision.impl }, imageRequest);
  assert.equal(result.text, 'Widzę zdjęcie.');
  const chatCall = withVision.calls.find((call) => call.url.includes('/api/chat'));
  assert.deepEqual(chatCall.body.messages.at(-1).images, ['/9j/4A==']);
  resetOllamaModelCache();
});

test('rozgrzewka Ollamy wczytuje model i nie rzuca przy awarii', async () => {
  resetOllamaModelCache();
  const ok = mockFetch([[/api\/chat/, { respond: () => json(200, { done: true }) }]]);
  const warm = await warmupOllama({ ollamaModel: 'qwen3.5:4b', fetchImpl: ok.impl });
  assert.equal(warm.ok, true);
  assert.deepEqual(ok.calls[0].body.messages, []);
  assert.equal(ok.calls[0].body.keep_alive, '24h');
  const down = mockFetch([[/api\/chat/, { respond: () => { throw new TypeError('fetch failed'); } }]]);
  const failed = await warmupOllama({ ollamaModel: 'qwen3.5:4b', fetchImpl: down.impl });
  assert.equal(failed.ok, false);
});
