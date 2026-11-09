import test from 'node:test';
import assert from 'node:assert/strict';
import { sendChatError } from '../src/lib/chatTransport.mjs';

test('preview UI receives explicit failure JSON without a proxy-replaced 5xx body', () => {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  sendChatError({ get: () => '1' }, res, 502, 'Ollama unavailable');
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { success: false, error: 'Ollama unavailable', status: 502 });
});
test('external API clients retain HTTP failure status and validation failures stay 400', () => {
  for (const [header, status, expected] of [[undefined, 502, 502], ['1', 400, 400], ['1', 503, 200]]) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    sendChatError({ get: () => header }, res, status, 'error');
    assert.equal(res.code, expected);
    assert.equal(res.body.success, false);
  }
});
