import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAgentProtocolReplies,
  hasPersistedAgentProtocolTranscript,
  parseChatProtocolCommand,
  TRIAD_AGENT_NAMES,
  validateAgentProtocolRequest,
} from '../src/kernel/agentProtocol.ts';

const store = {
  sys_version: '9.1.0',
  config: { sys_version: '9.1.0', mode: 'test', active_profiles: ['Alex'] },
  update_history: [{ wersja: '9.0.0', data: '2026-01-01', opis: 'Initial test release' }],
  chat_history: [{ agent: 'Alex', tekst: 'test' }],
};

test('validates the explicit command schema and rejects unknown or invalid values', () => {
  assert.equal(validateAgentProtocolRequest({ command: 'SYSTEM_STATUS', agent: 'Alex' }).valid, true);
  assert.equal(validateAgentProtocolRequest({ command: 'SIGNAL_ANALYSIS', agent: 'triad', payload: { signal: 'abc' } }).valid, true);
  assert.equal(validateAgentProtocolRequest({ command: 'UNKNOWN', agent: 'Alex' }).valid, false);
  assert.equal(validateAgentProtocolRequest({ command: 'SYSTEM_STATUS', agent: 'Alex', extra: true }).valid, false);
  assert.equal(validateAgentProtocolRequest({ command: 'SYSTEM_STATUS', agent: 'Alex', payload: { omega: Infinity } }).valid, false);
  assert.equal(validateAgentProtocolRequest({ command: 'SYSTEM_STATUS', agent: 'Alex', payload: { extra: 'no' } }).valid, false);
  assert.equal(validateAgentProtocolRequest({ command: 'SIGNAL_ANALYSIS', agent: 'Alex' }).valid, false);
  assert.equal(validateAgentProtocolRequest({ command: 'SIGNAL_ANALYSIS', agent: 'Alex', payload: { signal: 'x'.repeat(257) } }).valid, false);
});

test('routes chat protocol shortcuts to deterministic commands', () => {
  assert.deepEqual(parseChatProtocolCommand('SYSTEM_STATUS'), {
    command: 'SYSTEM_STATUS',
    agent: 'triad',
  });
  assert.deepEqual(parseChatProtocolCommand('/command data_store_audit', 'Astyria'), {
    command: 'DATA_STORE_AUDIT',
    agent: 'Astyria',
  });
  assert.deepEqual(parseChatProtocolCommand('/agent Aurelius history'), {
    command: 'VERSION_TIMELINE',
    agent: 'Aurelius',
  });
  assert.deepEqual(parseChatProtocolCommand('/agent Alex SYSTEM_STATUS'), {
    command: 'SYSTEM_STATUS',
    agent: 'Alex',
  });
  assert.equal(parseChatProtocolCommand('please check SYSTEM_STATUS'), null);
  assert.equal(parseChatProtocolCommand('SIGNAL_ANALYSIS'), null);
});

test('builds kernel-backed structured replies for all triad roles', () => {
  const request = validateAgentProtocolRequest({ command: 'SYSTEM_STATUS', agent: 'triad' }).request;
  const result = buildAgentProtocolReplies(request, store);

  assert.deepEqual(Object.keys(result.replies), TRIAD_AGENT_NAMES);
  assert.equal(result.data.version, '9.1.0');
  assert.equal(result.data.updateHistoryCount, 1);
  for (const reply of Object.values(result.replies)) {
    assert.deepEqual(Object.keys(reply), ['agent', 'command', 'data']);
  }
});

test('returns deterministic audit and version timeline data', () => {
  const audit = buildAgentProtocolReplies(
    validateAgentProtocolRequest({ command: 'DATA_STORE_AUDIT', agent: 'Aurelius' }).request,
    store,
  );
  const timeline = buildAgentProtocolReplies(
    validateAgentProtocolRequest({ command: 'VERSION_TIMELINE', agent: 'Aurelius' }).request,
    store,
  );

  assert.deepEqual(audit.data.issues, []);
  assert.equal(audit.data.valid, true);
  assert.deepEqual(timeline.data.timeline, [
    { version: '9.0.0', date: '2026-01-01', description: 'Initial test release' },
  ]);
  assert.deepEqual(Object.keys(timeline.replies), ['Aurelius']);
});

test('includes the supplied deterministic signal analysis in the reply', () => {
  const request = validateAgentProtocolRequest({
    command: 'SIGNAL_ANALYSIS',
    agent: 'Astyria',
    payload: { signal: 'abc', omega: 2, time: 0.5 },
  }).request;
  const analysis = { project: 'without_nlp', spectralEnergy: 3.25 };
  const result = buildAgentProtocolReplies(request, store, analysis);

  assert.deepEqual(result.data, {
    signal: 'abc',
    omega: 2,
    time: 0.5,
    analysis,
  });
  assert.deepEqual(Object.keys(result.replies), ['Astyria']);
});

test('does not accept a stale or incomplete kernel state as persisted protocol output', () => {
  const transcript = [
    { agent: 'Mateusz Mitek', tekst: '{"command":"SYSTEM_STATUS","agent":"triad"}' },
    { agent: 'Alex', tekst: '{"agent":"Alex"}' },
    { agent: 'Astyria', tekst: '{"agent":"Astyria"}' },
    { agent: 'Aurelius', tekst: '{"agent":"Aurelius"}' },
  ];

  assert.equal(hasPersistedAgentProtocolTranscript({ store: { chat_history: transcript } }, transcript), true);
  assert.equal(
    hasPersistedAgentProtocolTranscript({
      store: { chat_history: [...transcript, { agent: 'Mateusz Mitek', tekst: 'later request' }] },
    }, transcript),
    true,
  );
  assert.equal(
    hasPersistedAgentProtocolTranscript({ store: { chat_history: transcript } }, transcript, transcript.length),
    false,
  );
  assert.equal(
    hasPersistedAgentProtocolTranscript({ store: { chat_history: transcript.slice(0, -1) } }, transcript),
    false,
  );
  assert.equal(
    hasPersistedAgentProtocolTranscript({ store: { chat_history: [{ agent: 'Alex', tekst: 'stale' }] } }, transcript),
    false,
  );
  assert.equal(hasPersistedAgentProtocolTranscript(null, transcript), false);
});
