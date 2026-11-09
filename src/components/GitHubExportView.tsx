import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Github, RefreshCw, UploadCloud } from 'lucide-react';

interface GitStatus {
  branch: string;
  repositoryUrl: string | null;
  ahead: number;
  behind: number;
  dirtyFiles: number;
  autoSync: boolean;
}

export const GitHubExportView: React.FC = () => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const refreshStatus = useCallback(async () => {
    const response = await fetch('/api/triad/git/status');
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Nie można pobrać stanu Git (HTTP ${response.status}).`);
    }
    setGitStatus(data);
  }, []);

  useEffect(() => {
    void refreshStatus().catch((error: unknown) => {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    });
  }, [refreshStatus]);

  const handleSync = async () => {
    if (loading) return;
    setLoading(true);
    setStatus('idle');
    setMessage('Sprawdzam zmiany aplikacji, zapisuję commit i wysyłam do origin...');
    try {
      const response = await fetch('/api/triad/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'triad',
          message: 'Synchronizacja kodu aplikacji z GitHub',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Synchronizacja nie powiodła się (HTTP ${response.status}).`);
      }
      setStatus('success');
      setMessage(data.sha
        ? `Zapisano commit ${data.sha} i wysłano do origin/${data.branch}.`
        : `Brak nowych zmian do commita; origin/${data.branch} jest zsynchronizowane.`);
      await refreshStatus();
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono md:p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-white">
                <Github className="h-8 w-8" />
              </div>
              <div>
                <h2 className="flex items-center gap-3 text-xl font-bold text-slate-100">
                  Synchronizacja aplikacji
                  <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] uppercase text-emerald-400">
                    {gitStatus?.autoSync ? 'AUTO SYNC' : 'SYNC'}
                  </span>
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Zmiany kodu są sprawdzane, commitowane i wysyłane do bieżącego repozytorium origin.
                </p>
              </div>
            </div>
            {gitStatus?.repositoryUrl && (
              <a
                href={gitStatus.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-slate-800 px-3 py-2 text-xs font-bold text-emerald-400 transition-colors hover:bg-slate-700"
              >
                Otwórz repozytorium <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-300">Stan synchronizacji</h3>
          {gitStatus ? (
            <dl className="grid grid-cols-2 gap-3 text-xs text-slate-300 md:grid-cols-4">
              <div><dt className="text-slate-500">Gałąź</dt><dd className="mt-1 font-bold">{gitStatus.branch}</dd></div>
              <div><dt className="text-slate-500">Zmiany lokalne</dt><dd className="mt-1 font-bold">{gitStatus.dirtyFiles} plików</dd></div>
              <div><dt className="text-slate-500">Do wysłania</dt><dd className="mt-1 font-bold">{gitStatus.ahead} commitów</dd></div>
              <div><dt className="text-slate-500">Do pobrania</dt><dd className="mt-1 font-bold">{gitStatus.behind} commitów</dd></div>
            </dl>
          ) : (
            <p className="text-xs text-slate-400">Odczytuję status repozytorium...</p>
          )}
          <p className="text-[11px] leading-relaxed text-slate-400">
            Automatyczna synchronizacja odczekuje na stabilizację plików, uruchamia testy, typecheck i build,
            a potem wysyła wyłącznie kod aplikacji. Bieżące przy starcie zmiany i lokalne dane nie są wysyłane automatycznie.
          </p>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-900/20 transition-all hover:bg-cyan-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
            {loading ? 'SYNCHRONIZUJĘ...' : 'SYNCHRONIZUJ TERAZ (COMMIT + PUSH)'}
          </button>
        </section>

        {status !== 'idle' && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              status === 'success'
                ? 'border-emerald-800 bg-emerald-950/30 text-emerald-400'
                : 'border-red-800 bg-red-950/30 text-red-400'
            }`}
          >
            {status === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <p className="text-xs leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
