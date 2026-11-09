/**
 * Diagnostyka i rekomendacje dla lokalnej Ollamy (misja „Optymalizacja Ollamy”).
 *
 * Moduł jest czysty: zbiera dane przez przekazany fetch i zwraca strukturę, a reguły
 * rekomendacji działają bez modelu językowego — misja daje użyteczny wynik także wtedy,
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
const embeddingModel = /embed|bge|minilm|nomic/i;

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
    configuredModel: host.configuredModel,
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

  const chatModels = result.models.filter((model) => !embeddingModel.test(model.name));
  const configured = host.configuredModel.trim();
  result.resolvedModel = configured && configured.toLowerCase() !== 'auto'
    ? configured
    : [...chatModels].sort((a, b) => b.size - a.size)[0]?.name ?? null;

  if (result.resolvedModel) {
    // Krótki pomiar: czas do pierwszego wyniku i prędkość generowania (model jest rozgrzany wcześniej).
    try {
      const started = Date.now();
      const response = await fetchImpl(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: result.resolvedModel,
          stream: false,
          think: false,
          keep_alive: host.keepAlive,
          messages: [{ role: 'user', content: 'Napisz jedno zdanie po polsku o szybkości działania.' }],
          options: { num_predict: 48, num_ctx: host.numCtx },
        }),
        signal,
      });
      if (response.ok) {
        const data: any = await response.json();
        result.firstTokenMs = Date.now() - started;
        const count = Number(data?.eval_count) || 0;
        const duration = Number(data?.eval_duration) || 0;
        if (count > 0 && duration > 0) {
          result.tokensPerSecond = Math.round((count / (duration / 1e9)) * 10) / 10;
        }
      } else if (!result.error) {
        result.error = `Pomiar prędkości nieudany: HTTP ${response.status}`;
      }
    } catch (error: any) {
      if (!result.error) result.error = `Pomiar prędkości nieudany: ${String(error?.message || error)}`;
    }
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
  /** Polecenie do wykonania przez operatora (nie jest uruchamiane automatycznie). */
  command?: string;
}

/** Deterministyczne reguły: co poprawić, żeby Ollama działała szybciej i lepiej. */
export function buildOllamaRecommendations(diag: OllamaDiagnostics): OllamaRecommendation[] {
  const out: OllamaRecommendation[] = [];

  if (!diag.reachable) {
    out.push({
      agent: 'Alex',
      text: `Serwer Ollamy nie odpowiada pod ${diag.baseUrl}. Bez niego czat nie ma modelu.`,
      command: 'npm run setup:ollama',
    });
    return out;
  }

  const chatModels = diag.models.filter((model) => !embeddingModel.test(model.name));
  if (chatModels.length === 0) {
    out.push({
      agent: 'Alex',
      text: 'Ollama działa, ale nie ma pobranego żadnego modelu czatu.',
      command: 'npm run setup:ollama',
    });
    return out;
  }

  const gpu = diag.loaded.some((model) => model.sizeVram > 0);
  const speed = diag.tokensPerSecond;

  if (diag.loaded.length === 0) {
    out.push({
      agent: 'Alex',
      text: `Model ${diag.resolvedModel} nie jest w pamięci — pierwsza odpowiedź po przerwie będzie wolna. Rozgrzewka i keep_alive=${diag.keepAlive} utrzymują go w RAM.`,
    });
  } else {
    out.push({
      agent: 'Alex',
      text: `Model ${diag.loaded[0].name} jest załadowany (${formatGb(diag.loaded[0].size)}, ${gpu ? 'na GPU' : 'na CPU'}), keep_alive=${diag.keepAlive}.`,
    });
  }

  if (speed !== null) {
    if (!gpu && speed < 4) {
      out.push({
        agent: 'Astyria',
        text: `Prędkość ${speed} tokenów/s na samym CPU jest za niska dla płynnej rozmowy trzech agentów. Mniejszy model odpowiada kilka razy szybciej.`,
        command: 'bash scripts/setup-ollama.sh llava-phi3:3.8b',
      });
    } else if (speed >= 15 && diag.ramGb >= 16) {
      out.push({
        agent: 'Astyria',
        text: `Prędkość ${speed} tokenów/s i ${diag.ramGb} GB RAM pozwalają na większy, mądrzejszy model bez utraty płynności.`,
        command: 'bash scripts/setup-ollama.sh gemma4:12b',
      });
    } else {
      out.push({
        agent: 'Astyria',
        text: `Prędkość ${speed} tokenów/s (pierwsza odpowiedź w ${((diag.firstTokenMs ?? 0) / 1000).toFixed(1)} s) — konfiguracja jest dobrze dobrana do sprzętu.`,
      });
    }
  } else {
    out.push({ agent: 'Astyria', text: 'Nie udało się zmierzyć prędkości modelu — sprawdź logi Ollamy (~/.ollama/serve.log).' });
  }

  if (!gpu && diag.numCtx > 4096) {
    out.push({
      agent: 'Astyria',
      text: `Okno kontekstu ${diag.numCtx} tokenów spowalnia CPU. 4096 wystarcza do rozmowy.`,
      command: 'OLLAMA_NUM_CTX=4096',
    });
  }

  const unusedBytes = diag.models
    .filter((model) => model.name !== diag.resolvedModel && model.name !== diag.loaded[0]?.name && !embeddingModel.test(model.name))
    .reduce((sum, model) => sum + model.size, 0);
  if (unusedBytes > 5 * GB) {
    out.push({
      agent: 'Aurelius',
      text: `Nieużywane modele zajmują ${formatGb(unusedBytes)} dysku. Usuń zbędne (ollama rm <model>), żeby uniknąć braku miejsca.`,
    });
  }

  if (diag.baseUrl.includes('0.0.0.0') || !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/.test(diag.baseUrl)) {
    out.push({
      agent: 'Aurelius',
      text: `Ollama jest dostępna pod ${diag.baseUrl}, nie przez pętlę zwrotną. API Ollamy nie ma uwierzytelniania — nie wystawiaj go do sieci.`,
    });
  } else {
    out.push({
      agent: 'Aurelius',
      text: 'Ollama słucha tylko na pętli zwrotnej (127.0.0.1) — bezpieczna konfiguracja, API Ollamy nie ma uwierzytelniania.',
    });
  }

  return out;
}

export function describeOllamaDiagnostics(diag: OllamaDiagnostics): string {
  if (!diag.reachable) return `Ollama: BRAK POŁĄCZENIA (${diag.error ?? 'brak odpowiedzi'})`;
  return [
    `Ollama ${diag.version ?? '?'} @ ${diag.baseUrl}`,
    `modele: ${diag.models.length ? diag.models.map((m) => `${m.name} (${formatGb(m.size)})`).join(', ') : 'brak'}`,
    `aktywny model: ${diag.resolvedModel ?? 'brak'}`,
    `w pamięci: ${diag.loaded.length ? diag.loaded.map((m) => `${m.name} (${m.sizeVram > 0 ? 'GPU' : 'CPU'})`).join(', ') : 'nic'}`,
    `prędkość: ${diag.tokensPerSecond ?? '?'} tok/s, pierwsza odpowiedź ${diag.firstTokenMs !== null ? `${(diag.firstTokenMs / 1000).toFixed(1)} s` : '?'}`,
    `sprzęt: ${diag.ramGb} GB RAM, ${diag.cpus} rdzeni; keep_alive ${diag.keepAlive}, num_ctx ${diag.numCtx}`,
  ].join('\n');
}
