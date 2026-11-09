import React, { useEffect, useState } from 'react';
import { STANDARD_OLLAMA_MODEL } from '../kernel/modelPolicy';

type OllamaModel = { name?: string; model?: string; size?: number; details?: { parameter_size?: string; quantization_level?: string } };
type Inventory = {
  models: OllamaModel[];
  configuredModel: string;
  standardModel?: string;
  activeModels?: string[];
  standardAvailable?: boolean;
  standardActive?: boolean;
  configurationSource?: string;
  activeModelsError?: string | null;
  connected: boolean;
  error?: string;
};
const formatSize = (bytes?: number) => typeof bytes === 'number' ? `${(bytes / 1024 ** 3).toFixed(2)} GiB` : '—';

export function OllamaModelManager() {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/ollama/models', { cache: 'no-store', signal });
      if (!(response.headers.get('content-type') || '').includes('application/json')) {
        throw new Error('Nie udało się odczytać stanu modeli z serwera.');
      }
      const data = await response.json() as Inventory;
      if (!response.ok) throw new Error(data.error || `Błąd odczytu stanu modeli (HTTP ${response.status}).`);
      setInventory(data);
      setError(data.connected === false ? data.error || 'Ollama jest niedostępna.' : '');
    } catch (cause) {
      if (signal?.aborted) return;
      setInventory(null);
      setError(cause instanceof Error ? cause.message : 'Błąd połączenia z Ollama');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);
  const standard = inventory?.standardModel || inventory?.configuredModel;
  const standardInventory = inventory?.models?.find(model => (model.name || model.model) === standard);
  return (
    <section aria-label="Menedżer modeli Ollama" className="space-y-3 rounded-xl border border-cyan-800/40 bg-slate-950/80 p-4 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-cyan-100">Standardowy model czatu · Ollama</h2>
        <button type="button" disabled={loading} onClick={() => { setLoading(true); void refresh(); }} className="rounded-md border border-cyan-700 px-3 py-1.5 text-xs hover:bg-cyan-900/30 disabled:opacity-50">Odśwież stan</button>
      </div>
      <p className="text-xs text-slate-400">Standard serwera: <strong className="break-all text-cyan-200">{standard || 'Brak potwierdzenia serwera'}</strong></p>
      <p className="text-xs text-slate-400">Załadowane modele · ostatni odczyt: <strong className="break-all text-slate-200">{!inventory?.connected ? 'Brak aktualnych danych' : inventory.activeModelsError ? 'Brak pomiaru' : Array.isArray(inventory.activeModels) ? inventory.activeModels.join(', ') || 'Żaden' : 'Brak pomiaru'}</strong></p>
      {inventory && (inventory.configurationSource !== 'repository-policy' || standard !== STANDARD_OLLAMA_MODEL) && <p role="alert" className="text-xs text-amber-300">Backend nie potwierdza standardu {STANDARD_OLLAMA_MODEL}. Po synchronizacji właściwej gałęzi uruchom podgląd lub serwer ponownie w AI Studio.</p>}
      {loading && <p role="status" className="text-sm text-slate-400">Odczytywanie stanu Ollamy…</p>}
      {error && <div role="alert" className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-300">{error}</div>}
      {!loading && !error && inventory?.connected && inventory.standardAvailable === false && (
        <p role="alert" className="text-sm text-amber-300">W Ollamie brakuje wymaganego modelu {standard}. Czat nie przełączy się na mniejszy model.</p>
      )}
      {!loading && !error && inventory?.connected && inventory.standardAvailable === true && (
        <p className="text-xs text-slate-300">{inventory.activeModelsError ? 'Model jest dostępny na dysku; brak pomiaru załadowania.' : inventory.standardActive === true ? 'Model standardowy jest załadowany.' : inventory.standardActive === false ? 'Model jest dostępny na dysku; zostanie użyty przy wysłaniu wiadomości.' : 'Model jest dostępny na dysku; brak pomiaru załadowania.'}</p>
      )}
      {standardInventory && <div className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 p-3">
        <div className="break-all font-mono text-sm text-cyan-200">{standard}</div>
        <div className="mt-1 text-xs text-slate-400">{formatSize(standardInventory.size)} · {standardInventory.details?.parameter_size || 'Parametry nieznane'} · {standardInventory.details?.quantization_level || 'Kwantyzacja nieznana'}</div>
      </div>}
      <p className="text-xs text-slate-500">Synchronizacja kodu AI Studio nie potwierdza zmiany modelu uruchomionego w Ollamie. Ten widok odczytuje konfigurację i stan serwera; nie instaluje ani nie przełącza modeli.</p>
    </section>
  );
}
