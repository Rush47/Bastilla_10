import React, { useState, useEffect } from 'react';
import { Download, FileArchive, FileText, RefreshCw, FolderOpen, ShieldCheck, Rocket, GitBranch, UploadCloud } from 'lucide-react';

interface FileInfo {
  name: string;
  size: string;
  type: 'archive' | 'text';
  ctime: string;
}

export const FileExplorer: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeploys, setPendingDeploys] = useState<string[]>([]);
  const [deploying, setDeploying] = useState<string | 'all' | null>(null);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleGithubSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setDeployMessage(null);
    try {
      const res = await fetch('/api/triad/github/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'triad', message: 'Synchronizacja prac Triady z GitHub' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeployMessage(data.sha
          ? `Zapisano commit ${data.sha} i wysłano do origin/${data.branch}.`
          : `Brak nowych zmian do commita; origin/${data.branch} jest zsynchronizowane.`);
      } else {
        setDeployMessage(`Błąd synchronizacji z GitHub: ${data.error || `HTTP ${res.status}`}`);
      }
    } catch (e: any) {
      setDeployMessage(`Błąd synchronizacji z GitHub: ${e?.message || 'brak połączenia'}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleCommit = async () => {
    if (committing) return;
    setCommitting(true);
    setDeployMessage(null);
    try {
      const res = await fetch('/api/triad/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'triad', message: 'Zapis prac Triady (artefakty, aplikacje, eksporty)' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeployMessage(
          data.committed
            ? `Zapisano w repozytorium: commit ${data.sha} · autor: ${data.author}`
            : data.message || 'Brak zmian do zapisania.'
        );
      } else {
        setDeployMessage(`Błąd zapisu do repo: ${data.error || `HTTP ${res.status}`}`);
      }
    } catch (e: any) {
      setDeployMessage(`Błąd zapisu do repo: ${e?.message || 'brak połączenia'}`);
    } finally {
      setCommitting(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/explorer/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.warn('Failed to fetch files:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeployStatus = async () => {
    try {
      const res = await fetch('/api/triad/deploy/status');
      if (res.ok) {
        const data = await res.json();
        setPendingDeploys(Array.isArray(data.pending) ? data.pending : []);
      }
    } catch {}
  };

  const handleDeploy = async (filename?: string) => {
    if (deploying) return;
    setDeploying(filename ?? 'all');
    setDeployMessage(null);
    try {
      const res = await fetch('/api/triad/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filename ? { filename } : {}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeployMessage(
          data.deployed?.length > 0
            ? `Wdrożono: ${data.deployed.map((d: { name: string }) => d.name).join(', ')}${data.version ? ` · v${data.version}` : ''}`
            : data.message || 'Brak nowych artefaktów do wdrożenia.'
        );
      } else {
        setDeployMessage(`Błąd wdrożenia: ${data.error || `HTTP ${res.status}`}`);
      }
    } catch (e: any) {
      setDeployMessage(`Błąd wdrożenia: ${e?.message || 'brak połączenia'}`);
    } finally {
      setDeploying(null);
      await fetchDeployStatus();
      await fetchFiles();
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchDeployStatus();
    const interval = setInterval(() => {
      fetchFiles();
      fetchDeployStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 bg-slate-950 flex flex-col font-mono">
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex flex-wrap items-center gap-2">
              Eksplorator Plików DATA_STORE
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">RING-0 FS</span>
            </h2>
            <p className="text-[10px] text-slate-500">Zdalny dostęp do wyeksportowanych zasobów i raportów Triady.</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            UPRAWNIENIA: POBIERANIE + WDRAŻANIE (ROOT RING-0)
          </div>
          <button
            onClick={() => handleDeploy()}
            disabled={deploying !== null || pendingDeploys.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-[10px] font-bold hover:bg-cyan-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            title="Wdróż wszystkie nowe artefakty Triady do systemu"
          >
            <Rocket className={`w-3.5 h-3.5 ${deploying === 'all' ? 'animate-bounce' : ''}`} />
            WDRÓŻ NOWE ({pendingDeploys.length})
          </button>
          <button
            onClick={handleCommit}
            disabled={committing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-purple-950/70 border border-purple-700/60 text-purple-300 text-[10px] font-bold hover:bg-purple-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            title="Zapisz prace agentów w repozytorium git (commit z autorstwem Triady)"
          >
            <GitBranch className={`w-3.5 h-3.5 ${committing ? 'animate-pulse' : ''}`} />
            {committing ? 'ZAPISUJĘ...' : 'ZAPISZ W REPO'}
          </button>
          <button
            onClick={handleGithubSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 text-[10px] font-bold hover:bg-indigo-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            title="Synchronizuj kod aplikacji: commit + push do bieżącej gałęzi origin"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
            {syncing ? 'SYNCHRONIZUJĘ...' : 'SYNCHRONIZUJ APLIKACJĘ'}
          </button>
          {loading && <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />}
        </div>
      </div>

      {deployMessage && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-cyan-800/60 bg-cyan-950/30 text-[11px] text-cyan-200" role="status">
          {deployMessage}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {files.length === 0 && !loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
            <FolderOpen className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-xs uppercase tracking-widest">Katalog wyjściowy jest pusty</p>
            <p className="text-[10px] mt-1 italic">Wydaj polecenie agentom, aby wygenerowali plik lub raport.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => (
              <div 
                key={file.name} 
                className="group p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-emerald-500/50 transition-all flex items-center gap-4"
              >
                <div className={`p-2.5 rounded-lg border ${file.type === 'archive' ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                  {file.type === 'archive' ? <FileArchive className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate group-hover:text-emerald-300 transition-colors">
                    {file.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono">
                    <span>{file.size}</span>
                    <span>•</span>
                    <span className="truncate">{new Date(file.ctime).toLocaleString('pl-PL')}</span>
                  </div>
                </div>
                {pendingDeploys.includes(file.name) && (
                  <button
                    onClick={() => handleDeploy(file.name)}
                    disabled={deploying !== null}
                    className="p-2 bg-slate-950 border border-cyan-800 text-cyan-400 hover:bg-cyan-600 hover:text-slate-950 hover:border-cyan-500 rounded-md transition-all active:scale-90 disabled:opacity-40"
                    title="Wdróż ten artefakt do systemu (apps/ lub Nowy_system/)"
                  >
                    <Rocket className={`w-4 h-4 ${deploying === file.name ? 'animate-bounce' : ''}`} />
                  </button>
                )}
                <a 
                  href={`/api/explorer/download/${file.name}`} 
                  className="p-2 bg-slate-950 border border-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-slate-950 hover:border-emerald-500 rounded-md transition-all active:scale-90"
                  title="Pobierz plik do katalogu Pobrane"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900/50 border-t border-slate-800 p-3 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> STATUS: POŁĄCZONO</span>
          <span>POJEMNOŚĆ SZYN: 50MB</span>
        </div>
        <div className="flex items-center gap-2 italic">
          Misja Astyria: System Zarządzania Plikami v1.0
        </div>
      </div>
    </div>
  );
};

