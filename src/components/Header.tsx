import React, { useState, useEffect } from 'react';
import { DataStore, OPERATOR_NAME, SYS_VERSION, generateTextReport, generatePythonMonolith } from '../kernel/svlKernel';
import { Terminal, Copy, Download, RefreshCw, ShieldCheck, Cpu, Clock, Check, ExternalLink } from 'lucide-react';

interface HeaderProps {
  dataStore: DataStore;
  onReset: () => void;
  onShowReport: () => void;
  onSyncSystem?: () => void;
  onUnclog?: () => void;
  onRestoreBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ dataStore, onReset, onShowReport, onSyncSystem, onUnclog, onRestoreBackup }) => {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [actionError, setActionError] = useState('');

  const rawVersion =
    dataStore.config?.sys_version ||
    dataStore.update_history?.[dataStore.update_history.length - 1]?.wersja ||
    SYS_VERSION;
  const formattedVersion = String(rawVersion).startsWith('v') ? String(rawVersion) : `v${rawVersion}`;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' }).format(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyMonolith = async () => {
    const py = generatePythonMonolith(dataStore);
    try {
      await navigator.clipboard.writeText(py);
      setCopied(true);
      setActionError('');
      setTimeout(() => setCopied(false), 2000);
    } catch { setActionError('Przeglądarka nie pozwoliła skopiować kodu. Użyj przycisku pobierania.'); }
  };

  const handleDownloadMonolith = () => {
    const py = generatePythonMonolith(dataStore);
    const blob = new Blob([py], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svl_kernel_${String(rawVersion).toLowerCase().replace(/[^a-z0-9]/g, '_')}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerSync = async () => {
    if (!onSyncSystem || syncing) return;
    setSyncing(true);
    setSyncSuccess(false);
    setActionError('');
    try {
      await onSyncSystem();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3200);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Synchronizacja nie powiodła się.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full shrink-0 overflow-hidden border-b border-blue-200/10 bg-[#050b18]/95 shadow-[0_8px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      {/* Top Banner Bar */}
      <div className="mx-auto flex w-full min-w-0 flex-wrap items-center justify-between gap-2 px-2 py-2 text-xs sm:gap-3 sm:px-4">
        {/* Brand & Kernel identity */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            </span>
            <span             className="bg-gradient-to-r from-blue-100 via-cyan-200 to-blue-300 bg-clip-text font-mono text-sm font-extrabold tracking-[0.16em] text-transparent">
            BASTILLA OS
            </span>
            <span title={formattedVersion} className="max-w-36 truncate rounded border border-blue-200/15 bg-blue-950/50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-100/75 sm:max-w-none">
              {formattedVersion}
            </span>
            <span className="hidden items-center gap-1 rounded border border-emerald-400/15 bg-emerald-950/30 px-2 py-0.5 font-mono text-[9px] text-emerald-300 lg:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            DEBIAN · SVL READY
            </span>
          </div>

          <span className="text-slate-700 hidden sm:inline" aria-hidden="true">|</span>

          <div className="hidden sm:flex items-center gap-2 text-slate-300">
            <span className="text-slate-400 font-mono text-[11px]">TWÓRCA:</span>
            <span className="font-semibold text-purple-200 bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/40 font-mono flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.25)]">
              <span>{OPERATOR_NAME}</span>
              <span className="text-[10px] bg-purple-900/90 text-purple-100 px-1.5 py-0.2 rounded-full border border-purple-400/60 font-bold">
                Tata
              </span>
            </span>
          </div>
        </div>

        {/* Runtime State Indicators */}
        <div className="header-actions flex w-full min-w-0 flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 sm:w-auto sm:max-w-full">
          {dataStore.config?.root_privileges && (
            <div className="hidden items-center gap-1.5 bg-red-950/80 border border-red-500/60 px-2.5 py-1 rounded text-red-300 font-bold shadow-[0_0_12px_rgba(239,68,68,0.3)] sm:flex">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>ROOT: RING-0 (TRIADA)</span>
            </div>
          )}

          {/* Commander Alex Badge */}
          <div className="hidden items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-1 rounded text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.25)] sm:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>INFRA: DOWÓDCA ALEX</span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 bg-cyan-950/70 border border-cyan-500/40 px-2 py-1 rounded text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>ASTYRIA AUTO-REPAIR: ON</span>
          </div>

          <div className="hidden items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded backdrop-blur md:flex">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-500">RDZEŃ:</span>
            <span className="text-slate-200 font-medium">{dataStore.config?.neural_engine || 'SVL-Sovereign-Neural-Core-v8.0'}</span>
          </div>

          <div className="hidden items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded backdrop-blur lg:flex">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-500">WARSTWA FIKCJI:</span>
            <span className="text-emerald-400 font-medium">DEZAKTYWOWANA</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 px-2.5 py-1 rounded backdrop-blur">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300">{currentTime || 'CZAS SYNCHR.'}</span>
          </div>

          {/* Quick Action buttons */}
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {onSyncSystem && (
              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg transition cursor-pointer font-bold ${
                  syncSuccess
                    ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-cyan-950/90 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.35)]'
                }`}
                title="Zsynchronizuj wersję systemu, zmiany z czatu, DATA_STORE i plik monolitu na dysku"
              >
                {syncSuccess ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <RefreshCw className={`w-3 h-3 text-cyan-300 ${syncing ? 'animate-spin' : ''}`} />
                )}
                <span>
                  {syncing
                    ? 'Synchronizacja...'
                    : syncSuccess
                    ? `Zsynchronizowano ${formattedVersion}!`
                    : 'Synchronizuj'}
                </span>
              </button>
            )}

            {onUnclog && (
              <button
                onClick={onUnclog}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 transition cursor-pointer font-bold shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                title="Odblokuj system, oczyść bufor i zsynchronizuj stan"
              >
                <span>Odblokuj</span>
              </button>
            )}

            {onRestoreBackup && (
              <button
                onClick={onRestoreBackup}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/60 transition cursor-pointer font-bold shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                title="Wdróż backup z pierwszej wersji (v1.0.0-Legacy)"
              >
                <span>Wdróż Backup (v1.0)</span>
              </button>
            )}

            <button
              onClick={handleCopyMonolith}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Kopiuj zrzut kodu Pythona z tagami DATA_STORE"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-300" />}
              <span>{copied ? 'Skopiowano!' : 'Kopiuj .py'}</span>
            </button>

            <button
              onClick={handleDownloadMonolith}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
              title="Pobierz plik SVL Kernel .py"
            >
              <Download className="w-3 h-3 text-slate-300" />
              <span className="hidden md:inline">Zrzut</span>
            </button>

            <button
              onClick={onShowReport}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/40 transition cursor-pointer"
              title="Wyświetl raport tekstowy ASCII"
            >
              <Terminal className="w-3 h-3" />
              <span>Raport</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-700/60 transition cursor-pointer font-bold shadow-[0_0_8px_rgba(59,130,246,0.3)]"
              title="Otwórz pełną wersję aplikacji w nowej karcie"
            >
              <ExternalLink className="w-3 h-3 text-blue-300" />
              <span className="hidden sm:inline">Pełna Wersja</span>
            </a>

            <button
              onClick={onReset}
              className="p-1.5 rounded hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-900/40 transition cursor-pointer"
              title="Przywróć stan bazowy Monolitu"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {actionError && <p role="alert" className="px-3 pb-2 text-xs text-red-200">{actionError}</p>}
    </header>
  );
};

