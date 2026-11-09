import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCAL_NLP_VERSION,
  analyzeMessage,
  buildSystemContext,
  detectIntent,
  extractEntities,
  generateLocalReply,
  normalizeMessage,
} from '../src/lib/localNlpEngine.ts';

const context = buildSystemContext(
  {
    sys_version: '8.8.0-Local-NLP',
    config: {
      sys_version: '8.8.0-Local-NLP',
      mode: 'Local-Deterministic-Production',
      active_profiles: ['Alex', 'Astyria', 'Aurelius'],
      mission_directive: 'BUILD_BEST_OS',
      root_privileges: true,
    },
    update_history: [{ wersja: '8.7.0', data: '2026-10-21', opis: 'test' }],
    chat_history: [{ agent: 'Alex', tekst: 'test' }],
  },
  5,
);

test('normalizuje polskie diakrytyki i białe znaki', () => {
  assert.equal(normalizeMessage('  Dzień   Dobry Łódź! '), 'dzien dobry lodz');
  assert.equal(normalizeMessage('CZEŚĆ'), 'czesc');
});

test('wykrywa intencje swobodnej rozmowy po polsku', () => {
  assert.equal(detectIntent(normalizeMessage('cześć agenci')).intent, 'greeting');
  assert.equal(detectIntent(normalizeMessage('jaki jest status systemu?')).intent, 'status');
  assert.equal(detectIntent(normalizeMessage('wdróż nowe artefakty')).intent, 'deploy');
  assert.equal(detectIntent(normalizeMessage('zapisz prace na githubie i zrób push')).intent, 'github');
  assert.equal(detectIntent(normalizeMessage('dajcie uprawnienia root ring-0')).intent, 'root');
  assert.equal(detectIntent(normalizeMessage('co potraficie robić?')).intent, 'capabilities');
  assert.equal(detectIntent(normalizeMessage('jaka jest wasza misja?')).intent, 'mission');
  assert.equal(detectIntent(normalizeMessage('dziękuję świetnie')).intent, 'thanks');
  assert.equal(detectIntent(normalizeMessage('blabla xyzzy')).intent, 'unknown');
});

test('analizuje sentyment wiadomości', () => {
  assert.equal(analyzeMessage('świetna robota, dzięki!').sentiment, 'positive');
  assert.equal(analyzeMessage('mam błąd, coś nie działa').sentiment, 'negative');
  assert.equal(analyzeMessage('pokaż status').sentiment, 'neutral');
});

test('ekstrahuje encje: agentów, pliki i wersje', () => {
  const entities = extractEntities('Astyria, sprawdź raw_socket_listener.py w v8.7.1', normalizeMessage('Astyria, sprawdź raw_socket_listener.py w v8.7.1'));
  assert.ok(entities.includes('Astyria'));
  assert.ok(entities.includes('raw_socket_listener.py'));
  assert.ok(entities.some((e) => e.startsWith('8.7.1') || e.startsWith('v8.7.1')));
});

test('buduje kontekst systemowy z DATA_STORE', () => {
  assert.equal(context.sysVersion, '8.8.0-Local-NLP');
  assert.equal(context.missionDirective, 'BUILD_BEST_OS');
  assert.equal(context.rootPrivileges, true);
  assert.equal(context.updateCount, 1);
  assert.equal(context.deployedCount, 5);
});

test('generuje odpowiedzi person agentów z kontekstem (osadzone dane systemu)', () => {
  for (const agent of ['Alex', 'Astyria', 'Aurelius']) {
    const { reply, analysis } = generateLocalReply(agent, 'jaki jest status systemu?', context);
    assert.equal(analysis.intent, 'status');
    assert.ok(reply.includes('8.8.0-Local-NLP'), `${agent}: odpowiedź powinna zawierać wersję systemu`);
    assert.ok(reply.length > 20);
  }
});

test('odpowiedzi są w pełni deterministyczne (zero losowości)', () => {
  const first = generateLocalReply('Astyria', 'cześć, co słychać?', context);
  const second = generateLocalReply('Astyria', 'cześć, co słychać?', context);
  assert.equal(first.reply, second.reply);
});

test('nieznana intencja zwraca pomocniczy fallback z analizą', () => {
  const { reply, analysis } = generateLocalReply('Alex', 'abstrakcyjne rozważania o kwantach', context);
  assert.equal(analysis.intent, 'unknown');
  assert.ok(analysis.keywords.length > 0);
  assert.ok(reply.includes('[LOCAL_NLP]'));
});

test('pozytywny sentyment dodaje prefiks persony', () => {
  const { reply } = generateLocalReply('Aurelius', 'brawo, świetna robota z tym systemem', context);
  assert.ok(reply.startsWith('Notuję pozytywny sentyment'));
});

test('wersja silnika jest zdefiniowana i lokalna', () => {
  assert.match(LOCAL_NLP_VERSION, /Triada-LocalNLP/);
});
