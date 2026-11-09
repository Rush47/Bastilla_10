import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeIntent,
  scoreArgument,
  selectBestFit,
  stripForceLlmPrefix,
  formatBestFitReport,
} from '../src/kernel/bestFitRouter.ts';

const matrix = [
  { id: 'SYSTEM_STATUS', owner: 'Alex', description: '', keywords: ['status', 'stan', 'wersj'], run: () => 'ok' },
  { id: 'RESOURCES', owner: 'Alex', description: '', keywords: ['ram', 'pamiec', 'cpu'], run: () => 'ok' },
  { id: 'SYSTEM_LOGS', owner: 'Astyria', description: '', keywords: ['log', 'blad', 'bled'], run: () => 'ok' },
];

test('normalizuje polskie znaki i interpunkcję', () => {
  assert.equal(normalizeIntent('Pokaż BŁĘDY, proszę!'), 'pokaz bledy prosze');
});

test('dopasowanie prefiksowe obejmuje odmianę', () => {
  assert.equal(scoreArgument(['log'], ['pokaz', 'logi']), 1);
  assert.equal(scoreArgument(['pamiec'], ['ile', 'pamieci']), 1);
});

test('wybiera argument z najwyższym wynikiem', () => {
  assert.equal(selectBestFit(matrix, 'status systemu')?.argument.id, 'SYSTEM_STATUS');
  assert.equal(selectBestFit(matrix, 'ile ramu i cpu?')?.argument.id, 'RESOURCES');
  assert.equal(selectBestFit(matrix, 'pokaż ostatnie błędy w logach')?.argument.id, 'SYSTEM_LOGS');
});

test('brak dopasowania = DEFAULT (model)', () => {
  assert.equal(selectBestFit(matrix, 'cześć Alex, jak się masz?'), null);
});

test('słabe dopasowanie (1 słowo z wielu) idzie do modelu z pełną historią', () => {
  assert.equal(selectBestFit(matrix, 'Zrób synchronizacje systemu. Jaką mamy wersję?'), null);
  assert.equal(selectBestFit(matrix, 'napisz mi proszę dłuższy opis stanu'), null);
});

test('długa wiadomość idzie do modelu nawet ze słowem kluczowym', () => {
  assert.equal(selectBestFit(matrix, 'opowiedz mi szczegółowo jak wyglądał status projektu w zeszłym tygodniu i co dalej'), null);
});

test('polecenia i prefiks @model omijają router', () => {
  assert.equal(selectBestFit(matrix, '/exec status'), null);
  assert.equal(selectBestFit(matrix, '!uptime'), null);
  assert.equal(selectBestFit(matrix, '@model status'), null);
  assert.equal(stripForceLlmPrefix('@model status systemu'), 'status systemu');
});

test('raport zawiera argument, dopasowanie i czas', () => {
  const report = formatBestFitReport({ argumentId: 'RESOURCES', confidence: 0.5, elapsedMs: 3 }, 'RAM: 1 GB');
  assert.match(report, /BEST-FIT · RESOURCES/);
  assert.match(report, /Dopasowanie: 50% · czas: 3 ms/);
  assert.match(report, /RAM: 1 GB/);
});
