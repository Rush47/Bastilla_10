/**
 * Łańcuch modeli językowych dla czatu triady (Alex, Astyria, Aurelius).
 *
 *   1. Google Gemini (GEMINI_API_KEY, model główny + modele zapasowe)
 *   2. xAI Grok   (XAI_API_KEY, API zgodne z OpenAI, automatyczny dobór modelu)
 *   3. Ollama     (OLLAMA_MODEL, lokalny model na serwerze, działa bez internetu)
 *   4. brak modelu → wywołujący przechodzi na deterministyczny without_nlp
 *
 * Moduł używa wyłącznie fetch (bez SDK), więc jest w pełni testowalny
 * z podstawionym fetch i nie dodaje zależności npm.
 */
import { parseGeminiModelChain, runWithGeminiFallback } from './geminiVm.ts';

export type LlmRole = 'user' | 'assistant';
export type LlmProvider = 'gemini' | 'xai' | 'ollama';

export interface LlmTurn {
  role: LlmRole;
  text: string;
}

export interface LlmBinaryAttachment {
  name: string;
  mimeType: string;
  /** base64 */
  content: string;
}

export interface LlmRequest {
  system: string;
  history: LlmTurn[];
  message: string;
  attachments?: LlmBinaryAttachment[];
  maxOutputTokens?: number;
  temperature?: number;
}

export interface LlmChainConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  geminiFallbackModels?: string;
  geminiBaseUrl?: string;
  xaiApiKey?: string;
  xaiModel?: string;
  xaiBaseUrl?: string;
  /** Pusty lub "auto" = pierwszy pobrany model z /api/tags. */
  ollamaModel?: string;
  ollamaBaseUrl?: string;
  /** Jak długo model zostaje w pamięci po odpowiedzi (np. "24h", "-1" = na stałe). Domyślnie 24h. */
  ollamaKeepAlive?: string;
  /** Okno kontekstu w tokenach — mniejsze = szybszy start odpowiedzi i mniej RAM (domyślnie 4096). */
  ollamaNumCtx?: number;
  /** Maksymalna długość odpowiedzi w tokenach — mniejsza = szybsza odpowiedź (domyślnie 2048). */
  ollamaNumPredict?: number;
  /** Liczba wątków CPU; 0/brak = automatycznie. */
  ollamaNumThread?: number;
  /** Kolejność i wybór dostawców (np. ['ollama'] = tylko Ollama). Brak = wszyscy skonfigurowani. */
  providers?: LlmProvider[];
  fetchImpl?: typeof fetch;
}

export interface LlmResult {
  text: string;
  provider: LlmProvider;
  model: string;
  /** Błędy dostawców, które zawiodły przed sukcesem (do logów). */
  failures: string[];
}

export class LlmProviderError extends Error {
  readonly provider: LlmProvider;
  readonly status: number;

  constructor(provider: LlmProvider, status: number, message: string) {
    super(message);
    this.name = 'LlmProviderError';
    this.provider = provider;
    this.status = status;
  }
}

export class LlmChainError extends Error {
  readonly failures: string[];

  constructor(failures: string[]) {
    super(failures.length
      ? `Żaden model nie odpowiedział: ${failures.join(' | ')}`
      : 'Brak skonfigurowanych modeli (GEMINI_API_KEY, XAI_API_KEY, OLLAMA_MODEL).');
    this.name = 'LlmChainError';
    this.failures = failures;
  }
}

export const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1';
export const DEFAULT_XAI_MODEL = 'grok-3-mini';
export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
/** Domyślny limit pozwala na długie odpowiedzi w oknie kontekstu 4096 tokenów. */
export const OLLAMA_MAX_OUTPUT_TOKENS = 3072;
export const OLLAMA_DEFAULT_KEEP_ALIVE = '24h';
export const OLLAMA_DEFAULT_NUM_CTX = 4096;
const OLLAMA_MIN_NUM_CTX = 512;

/** keep_alive: liczba (sekundy / ujemna = na stałe) albo tekst typu "24h". */
export function parseKeepAlive(value: string | undefined): string | number {
  const raw = (value ?? '').trim();
  if (!raw) return OLLAMA_DEFAULT_KEEP_ALIVE;
  return /^-?\d+$/.test(raw) ? Number(raw) : raw;
}

function ollamaOptions(config: LlmChainConfig, request: LlmRequest): Record<string, number> {
  const configuredPredict = config.ollamaNumPredict && config.ollamaNumPredict > 0
    ? Math.floor(config.ollamaNumPredict)
    : OLLAMA_MAX_OUTPUT_TOKENS;
  return {
    temperature: request.temperature ?? 0.7,
    num_predict: Math.min(request.maxOutputTokens ?? configuredPredict, OLLAMA_MAX_OUTPUT_TOKENS),
    num_ctx: Math.max(OLLAMA_MIN_NUM_CTX, Math.floor(config.ollamaNumCtx || OLLAMA_DEFAULT_NUM_CTX)),
    ...(config.ollamaNumThread && config.ollamaNumThread > 0 ? { num_thread: Math.floor(config.ollamaNumThread) } : {}),
  };
}

function trimBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function describeStatus(provider: LlmProvider, status: number): string {
  const name = provider === 'gemini' ? 'Google Gemini' : provider === 'xai' ? 'xAI' : 'Ollama';
  if (status === 401 || status === 403) return `${name}: klucz API odrzucony (HTTP ${status}).`;
  if (status === 402) return `${name}: brak środków na koncie (HTTP 402).`;
  if (status === 429) return `${name}: limit żądań wyczerpany (HTTP 429).`;
  if (status === 404) return `${name}: model nie istnieje lub jest niedostępny (HTTP 404).`;
  if (status === 400) return `${name}: żądanie odrzucone (HTTP 400).`;
  return `${name}: HTTP ${status}.`;
}

async function readErrorText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return '';
  }
}

function describeOllamaErrorBody(body: string): string {
  if (!body) return '';
  try {
    const data = JSON.parse(body);
    if (typeof data?.error === 'string' && data.error.trim()) return data.error.trim();
  } catch {
    // Keep non-JSON provider error text as-is.
  }
  return body.trim();
}

/** Czy błąd uzasadnia próbę kolejnego modelu Gemini (limit, brak modelu, awaria). */
export function shouldTryNextGeminiModel(error: unknown): boolean {
  return error instanceof LlmProviderError
    && error.provider === 'gemini'
    && (error.status === 404 || error.status === 429 || error.status >= 500);
}

export async function generateGemini(
  config: LlmChainConfig,
  request: LlmRequest,
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const apiKey = (config.geminiApiKey || '').trim();
  if (!apiKey) throw new Error('Brak GEMINI_API_KEY.');
  const doFetch = config.fetchImpl ?? fetch;
  const base = trimBase(config.geminiBaseUrl || DEFAULT_GEMINI_BASE_URL);
  const chain = parseGeminiModelChain(config.geminiModel || '', config.geminiFallbackModels || '');
  if (!chain.valid) throw new Error('Nieprawidłowa nazwa modelu Gemini (GEMINI_MODEL / GEMINI_FALLBACK_MODELS).');

  const contents = [
    ...request.history.map((turn) => ({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    })),
    {
      role: 'user',
      parts: [
        { text: request.message },
        ...(request.attachments ?? []).map((attachment) => ({
          inlineData: { mimeType: attachment.mimeType, data: attachment.content },
        })),
      ],
    },
  ];

  const { model, result } = await runWithGeminiFallback(chain.models, async (candidate) => {
    const response = await doFetch(`${base}/models/${encodeURIComponent(candidate)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxOutputTokens ?? OLLAMA_MAX_OUTPUT_TOKENS,
        },
      }),
      signal,
    });
    if (!response.ok) {
      await readErrorText(response);
      throw new LlmProviderError('gemini', response.status, `${describeStatus('gemini', response.status)} [${candidate}]`);
    }
    const data: any = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('').trim()
      : '';
    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'pusta odpowiedź';
      throw new LlmProviderError('gemini', 502, `Google Gemini: brak treści (${reason}) [${candidate}]`);
    }
    return text;
  }, (error) => shouldTryNextGeminiModel(error)
    || (error instanceof LlmProviderError && error.provider === 'gemini' && error.status === 502));

  return { text: result, model };
}

/** Wybiera model czatu Grok z listy /v1/models (bez modeli obrazów i wideo). */
export function pickXaiChatModel(ids: string[]): string | null {
  const chat = ids.filter((id) => /grok/i.test(id) && !/(image|imagine|vision|video|embed)/i.test(id));
  if (chat.length === 0) return null;
  const score = (id: string) => (/fast|mini/i.test(id) ? 0 : 1);
  return [...chat].sort((a, b) => score(a) - score(b) || b.localeCompare(a))[0];
}

const discoveredXaiModels = new Map<string, string>();

export function resetXaiModelCache(): void {
  discoveredXaiModels.clear();
}

async function discoverXaiModel(
  base: string,
  apiKey: string,
  doFetch: typeof fetch,
  signal?: AbortSignal,
): Promise<string | null> {
  const cached = discoveredXaiModels.get(base);
  if (cached) return cached;
  const response = await doFetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
  });
  if (!response.ok) return null;
  const data: any = await response.json();
  const ids = Array.isArray(data?.data)
    ? data.data.map((model: any) => model?.id).filter((id: unknown): id is string => typeof id === 'string')
    : [];
  const picked = pickXaiChatModel(ids);
  if (picked) discoveredXaiModels.set(base, picked);
  return picked;
}

export async function generateXai(
  config: LlmChainConfig,
  request: LlmRequest,
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const apiKey = (config.xaiApiKey || '').trim();
  if (!apiKey) throw new Error('Brak XAI_API_KEY.');
  const doFetch = config.fetchImpl ?? fetch;
  const base = trimBase(config.xaiBaseUrl || DEFAULT_XAI_BASE_URL);
  const imageParts = (request.attachments ?? [])
    .filter((attachment) => attachment.mimeType.startsWith('image/'))
    .map((attachment) => ({
      type: 'image_url',
      image_url: { url: `data:${attachment.mimeType};base64,${attachment.content}` },
    }));
  const messages = [
    { role: 'system', content: request.system },
    ...request.history.map((turn) => ({ role: turn.role, content: turn.text })),
    {
      role: 'user',
      content: imageParts.length ? [{ type: 'text', text: request.message }, ...imageParts] : request.message,
    },
  ];

  const call = async (model: string) => {
    const response = await doFetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxOutputTokens ?? OLLAMA_MAX_OUTPUT_TOKENS,
      }),
      signal,
    });
    if (!response.ok) {
      const body = await readErrorText(response);
      const modelProblem = response.status === 404
        || (response.status === 400 && /model/i.test(body));
      throw Object.assign(
        new LlmProviderError('xai', response.status, `${describeStatus('xai', response.status)} [${model}]`),
        { modelProblem },
      );
    }
    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const text = typeof content === 'string'
      ? content.trim()
      : Array.isArray(content)
      ? content.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('').trim()
      : '';
    if (!text) throw new LlmProviderError('xai', 502, `xAI: pusta odpowiedź [${model}]`);
    return text;
  };

  const configured = (config.xaiModel || '').trim() || discoveredXaiModels.get(base) || DEFAULT_XAI_MODEL;
  try {
    return { text: await call(configured), model: configured };
  } catch (error: any) {
    if (!error?.modelProblem) throw error;
    // Model wycofany lub błędna nazwa → pobierz aktualną listę modeli i spróbuj raz jeszcze.
    discoveredXaiModels.delete(base);
    const discovered = await discoverXaiModel(base, apiKey, doFetch, signal);
    if (!discovered || discovered === configured) throw error;
    return { text: await call(discovered), model: discovered };
  }
}

/** Usuwa bloki rozumowania modeli „thinking” (<think>…</think>) z odpowiedzi. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim();
}

/** Wybiera model czatu z listy pobranych modeli Ollamy (bez modeli embedding). */
export function pickOllamaChatModel(models: Array<{ name: string; size?: number }>): string | null {
  const chat = models.filter((model) => model.name && !/embed|bge|minilm|nomic/i.test(model.name));
  if (chat.length === 0) return null;
  // Największy pobrany model = zwykle najlepszy, jaki zmieścił się na serwerze.
  return [...chat].sort((a, b) => (b.size ?? 0) - (a.size ?? 0))[0].name;
}

const resolvedOllamaModels = new Map<string, string>();
const ollamaVisionSupport = new Map<string, boolean>();

export function resetOllamaModelCache(): void {
  resolvedOllamaModels.clear();
  ollamaVisionSupport.clear();
}

/** Czy model Ollamy analizuje obrazy (capability "vision" z /api/show). Przy braku odpowiedzi nie blokuje. */
async function ollamaSupportsVision(
  base: string,
  model: string,
  doFetch: typeof fetch,
  signal?: AbortSignal,
): Promise<boolean> {
  const key = `${base}|${model}`;
  const cached = ollamaVisionSupport.get(key);
  if (cached !== undefined) return cached;
  try {
    const response = await doFetch(`${base}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
      signal,
    });
    if (!response.ok) return true;
    const data: any = await response.json();
    const capabilities = Array.isArray(data?.capabilities) ? data.capabilities : null;
    if (!capabilities) return true;
    const supported = capabilities.includes('vision');
    ollamaVisionSupport.set(key, supported);
    return supported;
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    return true;
  }
}

async function resolveOllamaModel(
  config: LlmChainConfig,
  doFetch: typeof fetch,
  base: string,
  signal?: AbortSignal,
): Promise<string> {
  const configured = (config.ollamaModel || '').trim();
  if (configured && configured.toLowerCase() !== 'auto') return configured;
  const cached = resolvedOllamaModels.get(base);
  if (cached) return cached;
  let response: Response;
  try {
    response = await doFetch(`${base}/api/tags`, { signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    throw new LlmProviderError('ollama', 503, `Ollama: serwer nie odpowiada pod ${base} (uruchom: ollama serve).`);
  }
  if (!response.ok) throw new LlmProviderError('ollama', response.status, `Ollama: nie można pobrać listy modeli (HTTP ${response.status}).`);
  const data: any = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  const picked = pickOllamaChatModel(models.map((model: any) => ({ name: String(model?.name || ''), size: Number(model?.size) || 0 })));
  if (!picked) {
    throw new LlmProviderError('ollama', 404, 'Ollama: brak pobranych modeli. Pobierz model: npm run setup:ollama');
  }
  resolvedOllamaModels.set(base, picked);
  return picked;
}

export async function generateOllama(
  config: LlmChainConfig,
  request: LlmRequest,
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const doFetch = config.fetchImpl ?? fetch;
  const base = trimBase(config.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL);
  const model = await resolveOllamaModel(config, doFetch, base, signal);
  const images = (request.attachments ?? [])
    .filter((attachment) => attachment.mimeType.startsWith('image/'))
    .map((attachment) => attachment.content);
  if (images.length > 0 && !(await ollamaSupportsVision(base, model, doFetch, signal))) {
    throw new LlmProviderError(
      'ollama',
      400,
      `Ollama: model ${model} nie analizuje zdjęć. Pobierz model z obsługą obrazów (np. ollama pull gemma3:4b) albo wyślij załącznik tekstowy.`,
    );
  }
  const messages = [
    { role: 'system', content: request.system },
    ...request.history.map((turn) => ({ role: turn.role, content: turn.text })),
    { role: 'user', content: request.message, ...(images.length ? { images } : {}) },
  ];

  const call = async (disableThinking: boolean) => {
    let response: Response;
    try {
      response = await doFetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          keep_alive: parseKeepAlive(config.ollamaKeepAlive),
          ...(disableThinking ? { think: false } : {}),
          options: ollamaOptions(config, request),
        }),
        signal,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      throw new LlmProviderError('ollama', 503, `Ollama: serwer nie odpowiada pod ${base} (uruchom: ollama serve).`);
    }
    if (!response.ok) {
      const body = await readErrorText(response);
      if (disableThinking && response.status === 400 && /think/i.test(body)) return null;
      const hint = response.status === 404 ? ` Pobierz model: ollama pull ${model}` : '';
      const details = describeOllamaErrorBody(body);
      const detailText = details ? ` Szczegóły: ${details}` : '';
      throw new LlmProviderError('ollama', response.status, `${describeStatus('ollama', response.status)} [${model}]${hint}${detailText}`);
    }
    const data: any = await response.json();
    const text = stripThinking(typeof data?.message?.content === 'string' ? data.message.content : '');
    if (!text) throw new LlmProviderError('ollama', 502, `Ollama: pusta odpowiedź [${model}]`);
    return text;
  };

  // think:false przyspiesza modele z rozumowaniem; modele bez tej opcji dostają zwykłe żądanie.
  const text = (await call(true)) ?? (await call(false));
  return { text: text!, model };
}

/**
 * Rozgrzewa model: wczytuje go do pamięci (pusta wiadomość + keep_alive), żeby pierwsza
 * odpowiedź nie czekała na załadowanie wag. Nigdy nie rzuca — zwraca wynik do logu.
 */
export async function warmupOllama(
  config: LlmChainConfig,
  signal?: AbortSignal,
): Promise<{ ok: boolean; model?: string; ms: number; detail: string }> {
  const started = Date.now();
  const doFetch = config.fetchImpl ?? fetch;
  const base = trimBase(config.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL);
  try {
    const model = await resolveOllamaModel(config, doFetch, base, signal);
    const response = await doFetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [],
        stream: false,
        keep_alive: parseKeepAlive(config.ollamaKeepAlive),
        options: { num_ctx: Math.max(OLLAMA_MIN_NUM_CTX, Math.floor(config.ollamaNumCtx || OLLAMA_DEFAULT_NUM_CTX)) },
      }),
      signal,
    });
    if (!response.ok) {
      return { ok: false, model, ms: Date.now() - started, detail: `HTTP ${response.status}` };
    }
    return { ok: true, model, ms: Date.now() - started, detail: 'model wczytany do pamięci' };
  } catch (error: any) {
    return { ok: false, ms: Date.now() - started, detail: String(error?.message || error) };
  }
}

export function configuredProviders(config: LlmChainConfig): Array<LlmProvider> {
  if (config.providers && config.providers.length > 0) {
    // Jawny wybór: Ollama nie wymaga klucza (model może być wykryty automatycznie).
    return config.providers.filter((provider, index, list) => list.indexOf(provider) === index
      && (provider === 'ollama'
        || (provider === 'gemini' && Boolean((config.geminiApiKey || '').trim()))
        || (provider === 'xai' && Boolean((config.xaiApiKey || '').trim()))));
  }
  const providers: Array<LlmProvider> = [];
  if ((config.geminiApiKey || '').trim()) providers.push('gemini');
  if ((config.xaiApiKey || '').trim()) providers.push('xai');
  if ((config.ollamaModel || '').trim()) providers.push('ollama');
  return providers;
}

/** Gemini → xAI → Ollama. Rzuca LlmChainError, gdy żaden dostawca nie odpowiedział. */
export async function generateWithChain(
  config: LlmChainConfig,
  request: LlmRequest,
  signal?: AbortSignal,
): Promise<LlmResult> {
  const failures: string[] = [];
  for (const provider of configuredProviders(config)) {
    if (signal?.aborted) break;
    try {
      const { text, model } = provider === 'gemini'
        ? await generateGemini(config, request, signal)
        : provider === 'xai'
        ? await generateXai(config, request, signal)
        : await generateOllama(config, request, signal);
      return { text, provider, model, failures };
    } catch (error: any) {
      failures.push(error?.name === 'AbortError'
        ? `${provider}: przekroczono czas odpowiedzi`
        : String(error?.message || error));
    }
  }
  throw new LlmChainError(failures);
}
