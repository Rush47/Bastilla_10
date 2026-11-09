import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const transmitterPath = new URL('../apps/hyper_com_module/transmitter.py', import.meta.url);

function runTransmitter(directory, ...args) {
  const output = execFileSync('python3', [transmitterPath.pathname, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HYPER_COM_DB_PATH: join(directory, 'hyper_com_test.sqlite') },
  });
  return JSON.parse(output);
}

function runTransmitterExpectingFailure(directory, ...args) {
  return spawnSync('python3', [transmitterPath.pathname, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HYPER_COM_DB_PATH: join(directory, 'hyper_com_test.sqlite') },
  });
}

function withTemporaryDatabase(t, callback) {
  const directory = mkdtempSync(join(tmpdir(), 'hyper-com-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  callback(directory);
}

test('stores inbound messages, queues replies, and marks the original replied', (t) => {
  withTemporaryDatabase(t, (directory) => {
    const inbound = runTransmitter(directory, 'receive', '--sender', 'Astra_1 (TEST)', '--content', 'Status?');
    assert.equal(inbound.transmission.direction, 'incoming');
    assert.equal(inbound.transmission.status, 'received');

    const reply = runTransmitter(directory, 'reply', '--reply-to', String(inbound.transmission.id), '--content', 'Local reply');
    assert.equal(reply.transmission.direction, 'outgoing');
    assert.equal(reply.transmission.recipient, 'Astra_1 (TEST)');
    assert.equal(reply.transmission.status, 'queued');

    const list = runTransmitter(directory, 'list');
    assert.deepEqual(list.transmissions.map(({ status }) => status), ['replied', 'queued']);
  });
});

test('queues broadcasts locally without a network send', (t) => {
  withTemporaryDatabase(t, (directory) => {
    const result = runTransmitter(directory, 'broadcast', '--content', 'Hello');
    assert.equal(result.transmission.direction, 'outgoing');
    assert.equal(result.transmission.recipient, 'GLOBAL_BROADCAST_QUEUE');
    assert.equal(result.transmission.status, 'queued');
  });
});

test('rejects replies to missing messages', (t) => {
  withTemporaryDatabase(t, (directory) => {
    const result = runTransmitterExpectingFailure(directory, 'reply', '--reply-to', '99', '--content', 'Hello');
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error, 'Nie znaleziono wiadomości przychodzącej o podanym ID.');
  });
});
