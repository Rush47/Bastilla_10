/**
 * BEST-FIT ROUTER — natychmiastowa odpowiedź czatu Triady bez czekania na model.
 *
 * Zasada (przeniesiona z ABARKUS v85.0): każda wiadomość jest porównywana z
 * „matrycą argumentów". Argument z najwyższym wynikiem dopasowania wykonuje
 * się od razu i zwraca PRAWDZIWE dane systemu (status, zasoby, logi, git,
 * Ollama). Gdy żaden argument nie pasuje wystarczająco mocno, rolę
 * DEFAULT przejmuje model językowy (Ollama) — jak dotąd.
 *
 * Moduł jest czysty (bez zależności od serwera), żeby dało się go testować.
 */

export type BestFitAgent = 'Alex' | 'Astyria' | 'Aurelius';

export interface BestFitArgument<Ctx> {
  /** Identyfikator argumentu, np. SYSTEM_STATUS. */
  id: string;
  /** Agent, który „posiada" argument i podpisuje odpowiedź. */
  owner: BestFitAgent;
  /** Krótki opis do pomocy. */
  description: string;
  /**
   * Rdzenie słów kluczowych (bez polskich znaków, małe litery). Dopasowanie
   * prefiksowe: „log" trafia w „logi", „logów"; „pamiec" w „pamięci".
   */
  keywords: string[];
  /** Wykonanie argumentu — zwraca tekst odpowiedzi. */
  run: (ctx: Ctx, message: string) => Promise<string> | string;
}

export interface BestFitMatch<Ctx> {
  argument: BestFitArgument<Ctx>;
  score: number;
  /** Udział słów wiadomości trafionych przez argument (0–1). */
  confidence: number;
}

export interface BestFitOptions {
  /** Minimalna liczba trafionych słów kluczowych. */
  minScore?: number;
  /**
   * Dłuższe wiadomości to zwykle swobodna rozmowa — idą do modelu,
   * nawet jeśli zawierają słowo „status".
   */
  maxWords?: number;
  /**
   * Minimalny udział trafionych słów (0–1). Wiadomość, w której tylko
   * drobna część słów pasuje do argumentu (np. 1 z 6), to zwykle pytanie
   * o coś innego — idzie do modelu, który zna historię rozmowy.
   */
  minConfidence?: number;
}

export const BEST_FIT_DEFAULTS: Required<BestFitOptions> = { minScore: 1, maxWords: 8, minConfidence: 1 / 3 };

/** Prefiks wymuszający pominięcie routera i odpowiedź modelu. */
export const FORCE_LLM_PREFIX = '@model';

const DIACRITICS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

/** Małe litery, bez polskich znaków i interpunkcji. */
export function normalizeIntent(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => DIACRITICS[ch] ?? ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeIntent(text: string): string[] {
  const normalized = normalizeIntent(text);
  return normalized ? normalized.split(' ') : [];
}

/** Liczba słów wiadomości trafionych przez słowa kluczowe argumentu. */
export function scoreArgument(keywords: string[], tokens: string[]): number {
  let score = 0;
  for (const token of tokens) {
    if (keywords.some((kw) => token === kw || (kw.length >= 3 && token.startsWith(kw)))) score += 1;
  }
  return score;
}

/**
 * Wybiera najlepiej dopasowany argument albo null (= DEFAULT → model).
 * Remis rozstrzyga kolejność w matrycy.
 */
export function selectBestFit<Ctx>(
  matrix: Array<BestFitArgument<Ctx>>,
  message: string,
  options: BestFitOptions = {},
): BestFitMatch<Ctx> | null {
  const { minScore, maxWords, minConfidence } = { ...BEST_FIT_DEFAULTS, ...options };
  const trimmed = message.trim();
  if (!trimmed || trimmed.startsWith('/') || trimmed.startsWith('!')) return null;
  if (trimmed.toLowerCase().startsWith(FORCE_LLM_PREFIX)) return null;

  const tokens = tokenizeIntent(trimmed);
  if (tokens.length === 0 || tokens.length > maxWords) return null;

  let best: BestFitMatch<Ctx> | null = null;
  for (const argument of matrix) {
    const score = scoreArgument(argument.keywords, tokens);
    const confidence = score / tokens.length;
    if (score >= minScore && confidence >= minConfidence && (!best || score > best.score)) {
      best = { argument, score, confidence };
    }
  }
  return best;
}

/** Usuwa prefiks @model, jeśli operator wymusił odpowiedź modelu. */
export function stripForceLlmPrefix(message: string): string {
  const trimmed = message.trimStart();
  return trimmed.toLowerCase().startsWith(FORCE_LLM_PREFIX)
    ? trimmed.slice(FORCE_LLM_PREFIX.length).trimStart()
    : message;
}

/** Nagłówek raportu w stylu ABARKUS — z prawdziwymi wartościami. */
export function formatBestFitReport(
  match: { argumentId: string; confidence: number; elapsedMs: number },
  body: string,
): string {
  const line = '='.repeat(48);
  return [
    line,
    `NATYCHMIAST · BEST-FIT · ${match.argumentId}`,
    `Dopasowanie: ${Math.round(match.confidence * 100)}% · czas: ${match.elapsedMs} ms · bez modelu`,
    line,
    body.trim(),
  ].join('\n');
}
