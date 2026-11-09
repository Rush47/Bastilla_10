import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { DataStore, SYS_VERSION } from '../kernel/svlKernel';
import { FormattedMessage } from './FormattedMessage';
import { OllamaModelManager } from './OllamaModelManager';

interface AstyriaMissionViewProps {
  dataStore: DataStore;
  onUpdateDataStore: React.Dispatch<React.SetStateAction<DataStore>>;
}

export const AstyriaMissionView: React.FC<AstyriaMissionViewProps> = ({ dataStore, onUpdateDataStore }) => {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = dataStore.config?.sys_version || SYS_VERSION;

  const refreshStatus = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/astyria/mission-status', { cache: 'no-store', signal });
      if (!response.ok) throw new Error(`Nie udało się odczytać diagnostyki (HTTP ${response.status}).`);
      const data = await response.json();
      if (!signal?.aborted) { setStatus(data); setError(null); }
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'Brak połączenia z serwerem.');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void refreshStatus(controller.signal);
    return () => controller.abort();
  }, []);

  const runReadOnlyScan = async () => {
    setIsLoading(true);
    setReply(null);
    setError(null);
    try {
      const response = await fetch('/api/astyria/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deep_scan' }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.error || `Błąd diagnostyki (HTTP ${response.status}).`);
      if (typeof data.reply !== 'string') throw new Error('Serwer nie zwrócił raportu diagnostycznego.');
      setReply(data.reply);
      if (data.state?.store) onUpdateDataStore(data.state.store);
      await refreshStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się odczytać diagnostyki.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-5 overflow-y-auto bg-slate-950 p-3 font-mono text-xs text-slate-200 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-base font-bold text-cyan-100"><ShieldCheck className="h-5 w-5" /> Astyria · diagnostyka ręczna</h2>
          <p className="text-slate-400">Wersja źródeł: {String(version)}</p>
          <p className="text-slate-400">Automatyczne naprawy, instalacje, samodzielne aktualizacje i zmiany modeli są wyłączone.</p>
        </div>
        <button type="button" onClick={() => void refreshStatus()} className="flex items-center gap-2 rounded-lg border border-cyan-700 px-3 py-2 text-cyan-200 hover:bg-cyan-950"><RefreshCw className="h-4 w-4" /> Odśwież diagnostykę</button>
      </div>

      <OllamaModelManager />

      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="font-bold text-slate-100">Diagnostyka serwera</h3>
        <p className="text-slate-400">{status ? 'Odczytano odpowiedź serwera. Stan połączenia z modelem znajduje się w panelu Ollamy.' : 'Brak aktualnego odczytu stanu serwera.'}</p>
        <p className="text-slate-400">Skan odczytuje logi i telemetrię. Nie uruchamia instalatorów, napraw ani synchronizacji Git.</p>
        <button type="button" onClick={() => void runReadOnlyScan()} disabled={isLoading} className="flex items-center gap-2 rounded-lg border border-cyan-700 px-3 py-2 text-cyan-200 hover:bg-cyan-950 disabled:opacity-50"><Search className="h-4 w-4" /> {isLoading ? 'Odczytywanie…' : 'Odczytaj logi i telemetrię'}</button>
      </section>
      {error && <p role="alert" className="rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-rose-200">{error}</p>}
      {reply && <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"><FormattedMessage content={reply} /></section>}
    </div>
  );
};
