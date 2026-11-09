import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GEMINI_FALLBACK_MODELS_DEFAULT,
  GEMINI_PRIMARY_MODEL,
  GEMINI_VM_NAME,
  getGeminiVmStatus,
  parseGeminiModelChain,
  runWithGeminiFallback,
} from '../src/kernel/geminiVm.ts';

test('identifies the single Gemini model profile', () => {
  assert.equal(GEMINI_VM_NAME, 'VM_Gemini_4');
  assert.equal(GEMINI_PRIMARY_MODEL, 'gemini-3.8-flash');
  assert.equal(GEMINI_FALLBACK_MODELS_DEFAULT, 'gemini-3.7-flash');
  assert.deepEqual(getGeminiVmStatus('configured-key', GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODELS_DEFAULT), {
    name: 'VM_Gemini_4',
    provider: 'Google Gemini API',
    primaryModel: 'gemini-3.8-flash',
    fallbackModels: ['gemini-3.7-flash'],
    configured: true,
    modelNameValid: true,
    runtimeType: 'remote-model-profile',
  });
});

test('does not report missing credentials as configured', () => {
  const status = getGeminiVmStatus('', GEMINI_PRIMARY_MODEL, GEMINI_FALLBACK_MODELS_DEFAULT);
  assert.equal(status.configured, false);
  assert.equal(status.modelNameValid, true);
  assert.equal('apiKey' in status, false);
});

test('rejects a malformed model identifier without exposing credentials', () => {
  const status = getGeminiVmStatus('configured-key', GEMINI_PRIMARY_MODEL, 'gemini/3.7 flash');
  assert.equal(status.configured, true);
  assert.equal(status.modelNameValid, false);
  assert.equal(JSON.stringify(status).includes('configured-key'), false);
});

test('keeps the primary model first and deduplicates fallback entries', () => {
  assert.deepEqual(parseGeminiModelChain(
    'gemini-3.8-flash',
    'gemini-3.7-flash, gemini-3.8-flash,gemini-3.7-flash',
  ), {
    models: ['gemini-3.8-flash', 'gemini-3.7-flash'],
    valid: true,
  });
});

test('uses Gemini 3.7 only after a retryable Gemini 3.8 Flash failure', async () => {
  const attempts = [];
  const response = await runWithGeminiFallback(
    ['gemini-3.8-flash', 'gemini-3.7-flash'],
    async (model) => {
      attempts.push(model);
      if (model === 'gemini-3.8-flash') throw { status: 429 };
      return 'fallback response';
    },
    (error) => error?.status === 429,
  );
  assert.deepEqual(attempts, ['gemini-3.8-flash', 'gemini-3.7-flash']);
  assert.deepEqual(response, { model: 'gemini-3.7-flash', result: 'fallback response' });
});

test('does not call Gemini 3.7 when the primary succeeds or fails non-retryably', async () => {
  const attempts = [];
  const primaryResult = await runWithGeminiFallback(
    ['gemini-3.8-flash', 'gemini-3.7-flash'],
    async (model) => {
      attempts.push(model);
      return 'primary response';
    },
    () => true,
  );
  assert.equal(primaryResult.model, 'gemini-3.8-flash');
  assert.deepEqual(attempts, ['gemini-3.8-flash']);

  await assert.rejects(
    runWithGeminiFallback(
      ['gemini-3.8-flash', 'gemini-3.7-flash'],
      async (model) => {
        attempts.push(model);
        throw { status: 403 };
      },
      (error) => error?.status === 429,
    ),
    (error) => error?.status === 403,
  );
  assert.deepEqual(attempts, ['gemini-3.8-flash', 'gemini-3.8-flash']);
});
