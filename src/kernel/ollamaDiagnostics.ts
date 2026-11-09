import { STANDARD_OLLAMA_MODEL } from './modelPolicy.ts';

/**
 * Odczytowa diagnostyka istniejącej Ollamy i przypiętego modelu 8B.
 *
 * Moduł jest czysty: zbiera dane przez przekazany fetch i zwraca strukturę, a reguły
 * rekomendacji działają bez modelu językowego — diagnostyka daje wynik także wtedy,
 * gdy sama Ollama nie odpowiada.
 */

export interface OllamaModelInfo {
  name: string;
  size: number;
}

export interface OllamaLoadedModel {
  name: string;
  size: number;
  sizeVram: number;
}

export interface OllamaDiagnostics {
  baseUrl: string;
  reachable: boolean;
  version: string | null;
  models: OllamaModelInfo[];
  loaded: OllamaLoadedModel[];
  configuredModel: string;
  resolvedModel: string | null;
  tokensPerSecond: number | null;
  firstTokenMs: number | null;
  ramGb: number;
  cpus: number;
  keepAlive: string;
  numCtx: number;
  error: string | null;
}

export interface OllamaHostInfo {
  ramGb: number;
  cpus: number;
  configuredModel: string;
  keepAlive: string;
  numCtx: number;
}

const GB = 1024 ** 3;

export function formatGb(bytes: number): string {
  return `${(bytes / GB).toFixed(1)} GB`;
}

export async function collectOllamaDiagnostics(
  baseUrl: string,
  host: OllamaHostInfo,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<OllamaDiagnostics> {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const result: OllamaDiagnostics = {
    baseUrl: base,
    reachable: false,
    version: null,
    models: [],
    loaded: [],
    configuredModel: STANDARD_OLLAMA_MODEL,
    resolvedModel: null,
    tokensPerSecond: null,
    firstTokenMs: null,
    ramGb: host.ramGb,
    cpus: host.cpus,
    keepAlive: host.keepAlive,
    numCtx: host.numCtx,
    error: null,
  };

  const getJson = async (path: string) => {
    const response = await fetchImpl(`${base}${path}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} (${path})`);
    return response.json() as Promise<any>;
  };

  try {
    const version = await getJson('/api/version');
    result.reachable = true;
    result.version = typeof version?.version === 'string' ? version.version : null;
  } catch (error: any) {
    result.error = `Serwer Ollamy nie odpowiada pod ${base} (${String(error?.message || error)})`;
    return result;
  }

  try {
    const tags = await getJson('/api/tags');
    result.models = (Array.isArray(tags?.models) ? tags.models : []).map((model: any) => ({
      name: String(model?.name || ''),
      size: Number(model?.size) || 0,
    })).filter((model: OllamaModelInfo) => model.name);
  } catch (error: any) {
    result.error = `Nie można pobrać listy modeli: ${String(error?.message || error)}`;
  }

  // Read-only inspection: a model loaded by another client is not this app's selection.
  result.resolvedModel = result.models.some((model) => model.name === STANDARD_OLLAMA_MODEL)
    ? STANDARD_OLLAMA_MODEL
    : null;
  if (!result.resolvedModel && !result.error) {
    result.error = `Wymagany model ${STANDARD_OLLAMA_MODEL} nie jest dostępny na wskazanym serwerze Ollamy. Nie wybrano modelu zastępczego.`;
  }

  try {
    const ps = await getJson('/api/ps');
    result.loaded = (Array.isArray(ps?.models) ? ps.models : []).map((model: any) => ({
      name: String(model?.name || model?.model || ''),
      size: Number(model?.size) || 0,
      sizeVram: Number(model?.size_vram) || 0,
    })).filter((model: OllamaLoadedModel) => model.name);
  } catch {
    // /api/ps jest opcjonalne — brak nie przerywa diagnostyki.
  }
  return result;
}

export interface OllamaRecommendation {
  agent: 'Alex' | 'Astyria' | 'Aurelius';
  text: string;
  /** Opcjonalne polecenie wyłącznie odczytowe, nigdy nie uruchamiane przez diagnostykę. */
  command?: string;
}

/** Tylko obserwacje i odczytowe kontrole; bez instalacji i zmian konfiguracji. */
export function buildOllamaRecommendations(diag: OllamaDiagnostics): OllamaRecommendation[] {
  if (!diag.reachable) {
    return [{
      agent: 'Alex',
      text: `Serwer Ollamy nie odpowiada pod ${diag.baseUrl}. Sprawdź adres i stan istniejącej usługi. Wymagany model to ${STANDARD_OLLAMA_MODEL}; instalacja ani zmiana modelu nie są wykonywane.`,
    }];
  }
  if (!diag.models.some((model) => model.name === STANDARD_OLLAMA_MODEL)) {
    return [{
      agent: 'Alex',
      text: `Ollama odpowiada, ale wymagany model ${STANDARD_OLLAMA_MODEL} nie jest dostępny. Inne zainstalowane modele nie będą użyte w zastępstwie. Sprawdź, czy aplikacja łączy się z właściwą instancją Ollamy.`,
      command: 'ollama list',
    }];
  }
  const selected = diag.loaded.find((model) => model.name === STANDARD_OLLAMA_MODEL);
  const out: OllamaRecommendation[] = [{
    agent: 'Alex',
    text: selected
      ? `Wymagany model ${STANDARD_OLLAMA_MODEL} jest w pamięci (${formatGb(selected.size)}, ${selected.sizeVram > 0 ? 'GPU' : 'CPU'}).`
      : `Model ${STANDARD_OLLAMA_MODEL} jest dostępny na dysku. Pierwsza wiadomość może wymagać jego wczytania; diagnostyka go nie uruchamia.`,
    command: 'ollama ps',
  }, {
    agent: 'Astyria',
    text: `Diagnostyka jest tylko odczytowa. Pamięć hosta: ${diag.ramGb} GB, rdzenie: ${diag.cpus}, kontekst: ${diag.numCtx}. Brak pomiaru generowania; ograniczenia sprzętu nie zmieniają wyboru modelu.`,
  }];
  if (diag.loaded.some((model) => model.name !== STANDARD_OLLAMA_MODEL)) {
    out.push({
      agent: 'Aurelius',
      text: 'Ollama ma także inne modele w pamięci, lecz aplikacja wysyła wiadomości wyłącznie do przypiętego modelu 8B. Diagnostyka nie usuwa ani nie przełącza modeli.',
    });
  }
  if (diag.baseUrl.includes('0.0.0.0') || !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::|\/|$)/.test(diag.baseUrl)) {
    out.push({
      agent: 'Aurelius',
      text: `Ollama jest dostępna pod ${diag.baseUrl}, nie przez pętlę zwrotną. Sprawdź ochronę sieci i dostęp aplikacji do właściwej instancji.`,
    });
  }
  return out;
}

export function describeOllamaDiagnostics(diag: OllamaDiagnostics): string {
  if (!diag.reachable) return `Ollama: BRAK POŁĄCZENIA (${diag.error ?? 'brak odpowiedzi'})`;
  return [
    `Ollama ${diag.version ?? '?'} @ ${diag.baseUrl}`,
    `modele: ${diag.models.length ? diag.models.map((m) => `${m.name} (${formatGb(m.size)})`).join(', ') : 'brak'}`,
    `wymagany model: ${STANDARD_OLLAMA_MODEL}; dostępny: ${diag.resolvedModel ? 'tak' : 'nie'}`,
    `w pamięci: ${diag.loaded.length ? diag.loaded.map((m) => `${m.name} (${m.sizeVram > 0 ? 'GPU' : 'CPU'})`).join(', ') : 'nic'}`,
    'diagnostyka tylko odczytowa: bez generowania, instalowania i zmiany modelu',
    `sprzęt: ${diag.ramGb} GB RAM, ${diag.cpus} rdzeni; keep_alive ${diag.keepAlive}, num_ctx ${diag.numCtx}`,
  ].join('\n');
}
