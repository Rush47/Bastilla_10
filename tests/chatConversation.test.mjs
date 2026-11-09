import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLlmHistory } from '../src/kernel/chatConversation.ts';

const user = (tekst) => ({ agent: 'Mateusz Mitek', tekst });
const reply = (agent, tekst) => ({ agent, tekst });

test('individual conversations keep only their own completed exchanges', () => {
  const history = [
    reply('Alex', 'Bootstrap announcement'),
    user('Aria, I like astronomy'), reply('si_1', 'Look at the stars'),
    user('Alex, I like music'), reply('Alex', 'Try a piano'),
    user('Aria, what do I like?'), reply('si_1', 'Astronomy'),
    user('Still waiting for a reply'),
  ];
  assert.deepEqual(buildLlmHistory(history, 'Alex'), [
    { role: 'user', text: 'Alex, I like music' },
    { role: 'assistant', text: 'Try a piano' },
  ]);
  assert.deepEqual(buildLlmHistory(history, 'si_1'), [
    { role: 'user', text: 'Aria, I like astronomy' },
    { role: 'assistant', text: 'Look at the stars' },
    { role: 'user', text: 'Aria, what do I like?' },
    { role: 'assistant', text: 'Astronomy' },
  ]);
});

test('triad exchanges include the shared prompt and only the requested reply', () => {
  const history = [
    { agent: 'Operator', tekst: 'Hello everyone' },
    reply('Alex', 'Hello from Alex'), reply('Astyria', 'Hello from Astyria'),
    reply('si_1', 'Hello from Aria'), reply('Aurelius', 'Hello from Aurelius'),
  ];
  assert.deepEqual(buildLlmHistory(history, 'si_1'), [
    { role: 'user', text: 'Hello everyone' },
    { role: 'assistant', text: 'Hello from Aria' },
  ]);
});

test('turn limits drop orphan assistant turns and retain the latest complete exchange', () => {
  const history = [user('First'), reply('Alex', 'One'), user('Second'), reply('Alex', 'Two')];
  assert.deepEqual(buildLlmHistory(history, 'Alex', 3), [
    { role: 'user', text: 'Second' }, { role: 'assistant', text: 'Two' },
  ]);
  assert.deepEqual(buildLlmHistory(history, 'Alex', 1), []);
  assert.deepEqual(buildLlmHistory(history, 'Alex', 0), []);
});

test('text limits apply to both sides of an exchange', () => {
  assert.deepEqual(buildLlmHistory([user('Long question'), reply('Alex', 'Long answer')], 'Alex', 8, 4), [
    { role: 'user', text: 'Long' }, { role: 'assistant', text: 'Long' },
  ]);
});

test('invalid entries are ignored and malformed operator messages end the previous exchange', () => {
  const history = [
    null, false, 'bad', [], {}, reply('Alex', 'Orphan'),
    user('Valid'), undefined, reply('Alex', 42), reply('Alex', 'Valid reply'),
    user(null), reply('Alex', 'Cannot attribute this'),
    user('No valid reply'), reply('Alex', ' '), reply('Other', 'Unrelated'),
  ];
  assert.deepEqual(buildLlmHistory(history, 'Alex'), [
    { role: 'user', text: 'Valid' }, { role: 'assistant', text: 'Valid reply' },
  ]);
});
