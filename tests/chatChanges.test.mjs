import assert from 'node:assert/strict';
import test from 'node:test';
import { isChatSystemChange } from '../src/kernel/chatChanges.ts';

test('accepts the supported chat-driven app changes', () => {
  assert.equal(isChatSystemChange({ type: 'app-created', appId: 'new-app' }), true);
  assert.equal(isChatSystemChange({ type: 'app-launched', appId: 'new-app' }), true);
  assert.equal(isChatSystemChange({
    type: 'app-file-updated',
    appId: 'new-app',
    filename: 'index.html',
  }), true);
});

test('rejects malformed or unsupported chat-driven changes', () => {
  assert.equal(isChatSystemChange(null), false);
  assert.equal(isChatSystemChange({ type: 'app-created', appId: '../outside' }), false);
  assert.equal(isChatSystemChange({
    type: 'app-file-updated',
    appId: 'new-app',
    filename: 'app.json',
  }), false);
  assert.equal(isChatSystemChange({ type: 'database-created', appId: 'new-app' }), false);
});
