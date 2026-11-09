import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kernelPath = path.join(repoRoot, 'svl_kernel.py');

function runKernel(storePath, ...args) {
  const result = spawnSync(process.env.PYTHON || 'python3', [kernelPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, SVL_KERNEL_STORE_PATH: storePath },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('migrates old model configuration without changing saved history', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'svl-kernel-migration-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const storePath = path.join(directory, 'store.json');
  const original = {
    config: {
      mode: 'Local-Ollama-Production',
      ai_provider: 'Ollama',
      ai_model: 'qwen3:4b',
      keep: 'yes',
    },
    update_history: [{ wersja: '1.0', opis: 'preserve update' }],
    chat_history: [{ agent: 'Alex', tekst: 'preserve transcript' }],
  };
  writeFileSync(storePath, JSON.stringify(original));

  const output = JSON.parse(runKernel(storePath, '--action', 'state'));
  const persisted = JSON.parse(readFileSync(storePath, 'utf8'));

  assert.equal(output.store.config.mode, 'Local-Deterministic-Production');
  assert.equal('ai_provider' in output.store.config, false);
  assert.equal('ai_model' in output.store.config, false);
  assert.equal(persisted.config.keep, 'yes');
  assert.deepEqual(persisted.update_history, original.update_history);
  assert.deepEqual(persisted.chat_history, original.chat_history);
});

test('does not allow model configuration to return through save or config actions', (t) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'svl-kernel-migration-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const storePath = path.join(directory, 'store.json');

  const incomingStore = {
    config: {
      mode: 'Google-Gemini-Production',
      dialogue_engine: 'Gemini',
      live_ai_engine: 'remote model',
    },
    update_history: [],
    chat_history: [],
  };
  runKernel(storePath, '--action', 'save_store', '--store_json', JSON.stringify(incomingStore));
  let persisted = JSON.parse(readFileSync(storePath, 'utf8'));
  assert.equal(persisted.config.mode, 'Local-Deterministic-Production');
  assert.equal('dialogue_engine' in persisted.config, false);
  assert.equal('live_ai_engine' in persisted.config, false);

  runKernel(
    storePath,
    '--action',
    'config',
    '--config_json',
    JSON.stringify({ mode: 'Local-Ollama-Production', ai_provider: 'Ollama' }),
  );
  persisted = JSON.parse(readFileSync(storePath, 'utf8'));
  assert.equal(persisted.config.mode, 'Local-Deterministic-Production');
  assert.equal('ai_provider' in persisted.config, false);
});
