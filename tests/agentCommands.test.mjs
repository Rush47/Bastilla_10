import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanAgentReplyText, extractAgentCommands } from '../src/kernel/agentCommands.ts';

test('wyodrębnia polecenie z ogrodzonego bloku kodu (```text)', () => {
  const reply = '```text\n/exec ls -la\n```\nGotowe.';
  assert.deepEqual(extractAgentCommands(reply), ['/exec ls -la']);
});

test('toleruje spację po ukośniku (/ exec) i tokeny specjalne modeli', () => {
  const reply = ']<]minimax[>[<tool_call>mmu>\n/ exec pwd && ls\n<|im_end|>';
  assert.deepEqual(extractAgentCommands(reply), ['/exec pwd && ls']);
});

test('zbiera wiele poleceń w kolejności (maks. 3) i deduplikuje', () => {
  const reply = 'Plan:\n/exec pwd\n/propose create-app moja-app cli-utility\n/exec pwd\n/exec ls\n/exec whoami\n/exec uptime';
  assert.deepEqual(extractAgentCommands(reply), [
    '/exec pwd',
    '/propose create-app moja-app cli-utility',
    '/exec ls',
  ]);
});

test('obsługuje składnię wykrzyknikową !polecenie, ale ignoruje obrazki markdown', () => {
  assert.deepEqual(extractAgentCommands('!uptime'), ['!uptime']);
  assert.deepEqual(extractAgentCommands('![alt text](obraz.png)'), []);
});

test('pomija przykłady składni z placeholderami — nie wykonuje dokumentacji', () => {
  const reply = [
    'Dostępne polecenia:',
    '/propose create-app <nazwa> [typ]',
    '/propose create-app my_project [typ]',
    '/propose create-db <nazwa>',
    '/exec <polecenie powłoki>',
    '/propose create-app realna-app cli-utility',
  ].join('\n');
  assert.deepEqual(extractAgentCommands(reply), ['/propose create-app realna-app cli-utility']);
});

test('nawiasy kwadratowe w /exec pozostają legalne (składnia powłoki)', () => {
  assert.deepEqual(extractAgentCommands('/exec ls [a-z]*.txt'), ['/exec ls [a-z]*.txt']);
});

test('czysty tekst bez poleceń zwraca pustą listę', () => {
  assert.deepEqual(extractAgentCommands('Zrobione! Aplikacja powinna działać.'), []);
  assert.deepEqual(extractAgentCommands(''), []);
});

test('cleanAgentReplyText usuwa artefakty, zachowuje treść', () => {
  assert.equal(cleanAgentReplyText('```bash\n/exec ls\n```'), '\n/exec ls\n');
  assert.equal(cleanAgentReplyText('wynik <|im_start|> OK'), 'wynik  OK');
});
