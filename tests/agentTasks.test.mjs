import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { agentTaskRegistry } from '../src/kernel/agentTasks.ts';

test('AgentTaskRegistry: lists initial verified tasks with real artifacts', () => {
  const tasks = agentTaskRegistry.getAll();
  assert.ok(Array.isArray(tasks));
  assert.ok(tasks.length > 0);

  for (const t of tasks) {
    if (t.status === 'completed') {
      assert.ok(t.artifact, `Task ${t.id} completed must have artifact`);
      assert.ok(fs.existsSync(path.resolve(t.artifact.path)), `Artifact ${t.artifact.path} must exist on disk`);
      assert.ok(t.artifact.sizeBytes >= 0, 'Artifact size must be non-negative');
    }
  }
});

test('AgentTaskRegistry: runs real action and produces verified artifact', async () => {
  const task = await agentTaskRegistry.runTask({
    agent: 'Astyria',
    title: 'Test audytu integralności',
    description: 'Testowanie silnika zadań agentów',
    actionType: 'audit_system_integrity',
  });

  assert.equal(task.agent, 'Astyria');
  assert.ok(task.status === 'queued' || task.status === 'running');

  // Wait for completion
  let completedTask = null;
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const current = agentTaskRegistry.getById(task.id);
    if (current && (current.status === 'completed' || current.status === 'failed')) {
      completedTask = current;
      break;
    }
  }

  assert.ok(completedTask, 'Task must complete within time limit');
  assert.equal(completedTask.status, 'completed');
  assert.ok(completedTask.artifact, 'Must have artifact');
  assert.ok(fs.existsSync(path.resolve(completedTask.artifact.path)), 'Artifact file must exist');
});

test('AgentTaskRegistry: write_app_file creates app directory and manifest automatically', async () => {
  const testAppId = `test-auto-app-${Date.now()}`;
  const task = await agentTaskRegistry.runTask({
    agent: 'Alex',
    title: 'Zapis pliku w nowej aplikacji',
    description: 'Weryfikacja automatycznego tworzenia aplikacji przy zapisie pliku',
    actionType: 'write_app_file',
    payload: {
      appId: testAppId,
      filename: 'test.json',
      content: JSON.stringify({ ok: true }),
    },
  });

  // Wait for completion
  let completed = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const current = agentTaskRegistry.getById(task.id);
    if (current && (current.status === 'completed' || current.status === 'failed')) {
      completed = current;
      break;
    }
  }

  assert.ok(completed);
  assert.equal(completed.status, 'completed');
  const targetFile = path.resolve('apps', testAppId, 'test.json');
  assert.ok(fs.existsSync(targetFile), 'Target file must exist');
  const manifestFile = path.resolve('apps', testAppId, 'app.json');
  assert.ok(fs.existsSync(manifestFile), 'Manifest app.json must be auto-generated');

  // Clean up test app
  fs.rmSync(path.resolve('apps', testAppId), { recursive: true, force: true });
});

test('AgentTaskRegistry: ai_task calls the supplied model executor and saves its response', async () => {
  const task = await agentTaskRegistry.runTask({
    agent: 'Aria',
    title: 'Raport testowy AI',
    description: 'Przygotuj krótki raport.',
    actionType: 'ai_task',
    aiExecutor: async (input, signal) => {
      assert.equal(input.agent, 'Aria');
      assert.equal(input.title, 'Raport testowy AI');
      assert.ok(signal instanceof AbortSignal);
      return { text: 'Wynik wygenerowany przez model.', provider: 'test-provider', model: 'test-model' };
    },
  });

  let finished;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    finished = agentTaskRegistry.getById(task.id);
    if (finished?.status === 'completed' || finished?.status === 'failed') break;
  }

  assert.equal(finished?.status, 'completed');
  assert.match(finished.result, /Wynik wygenerowany przez model/);
  assert.ok(fs.existsSync(path.resolve(finished.artifact.path)));
  assert.match(fs.readFileSync(path.resolve(finished.artifact.path), 'utf8'), /test-provider \(test-model\)/);
  fs.rmSync(path.resolve(finished.artifact.path), { force: true });
});

test('AgentTaskRegistry: unsupported action fails instead of producing a fake diagnostic', async () => {
  const task = await agentTaskRegistry.runTask({
    agent: 'Alex',
    title: 'Nieznana akcja',
    description: 'Nie może udawać sukcesu.',
    actionType: 'unsupported_action',
  });

  let finished;
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    finished = agentTaskRegistry.getById(task.id);
    if (finished?.status === 'completed' || finished?.status === 'failed') break;
  }

  assert.equal(finished?.status, 'failed');
  assert.match(finished.error, /Nieobsługiwany typ akcji/);
  assert.equal(finished.artifact, undefined);
});
