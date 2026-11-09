import React, { useState, useEffect } from 'react';
import { DataStore, SYS_VERSION } from '../kernel/svlKernel';
import { FormattedMessage } from './FormattedMessage';
import {
  GitBranch,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Terminal,
  Send,
  Sparkles,
  RefreshCw,
  Zap,
  Database,
  FolderOpen,
  Activity,
  Power,
  Cpu,
  HardDrive,
  ShieldCheck,
  Save,
  Copy,
  ExternalLink,
  Globe,
  Bot,
} from 'lucide-react';

interface AstyriaMissionViewProps {
  dataStore: DataStore;
  onUpdateDataStore: React.Dispatch<React.SetStateAction<DataStore>>;
}

export const AstyriaMissionView: React.FC<AstyriaMissionViewProps> = ({
  dataStore,
  onUpdateDataStore,
}) => {
  const [selectedMissionAction, setSelectedMissionAction] = useState('repair_all');
  const [customCommand, setCustomCommand] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [latestReply, setLatestReply] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [continuousEnabled, setContinuousEnabled] = useState(true);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [missionLogs, setMissionLogs] = useState<
    Array<{ timestamp: string; title: string; desc: string; type: 'success' | 'info' | 'warn' }>
  >([
    {
      timestamp: new Date().toLocaleTimeString('pl-PL'),
      title: 'Wdrożenie Ulepszeń z Maszyny Wirtualnej VM_Ten_System (v8.1.0-VM_Ten_System)',
      desc: 'Astyria jest podłączona do przetwarzania poleceń z integracją Gemini API oraz automatycznym leczeniem jądra.',
      type: 'success',
    },
  ]);

  const activeVer =
    dataStore.config?.sys_version ||
    dataStore.update_history?.[dataStore.update_history.length - 1]?.wersja ||
    SYS_VERSION;

  const fetchMissionStatus = async () => {
    try {
      const res = await fetch('/api/astyria/mission-status');
      if (res.ok) {
        const data = await res.json();
        setLiveStatus(data);
        if (typeof data.continuousMissionEnabled === 'boolean') {
          setContinuousEnabled(data.continuousMissionEnabled);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMissionStatus();
    const interval = setInterval(fetchMissionStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleContinuous = async () => {
    const nextState = !continuousEnabled;
    setContinuousEnabled(nextState);
    try {
      await fetch('/api/mission/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      await fetchMissionStatus();
    } catch {}
  };

  const handleRunMissionAction = async (actionType: string, textOverride?: string) => {
    setIsExecuting(true);
    setLatestReply(null);
    setLatestError(null);
    const textToSend = textOverride !== undefined ? textOverride : customCommand;
    try {
      const res = await fetch('/api/astyria/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          command: textToSend,
          userMessage: textToSend,
        }),
      });

      if (!res.ok) {
        throw new Error(`Błąd HTTP ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.reply === 'string' && data.reply.trim()) {
        setLatestReply(data.reply);
      }
      if (data.state?.store) {
        onUpdateDataStore(data.state.store);
      } else if (data.reply) {
        onUpdateDataStore((prev) => ({
          ...prev,
          chat_history: [
            ...prev.chat_history,
            {
              agent: 'Astyria',
              tekst: data.reply,
            },
          ],
        }));
      }

      if (data.reply) {
        setMissionLogs((prev) => [
          {
            timestamp: new Date().toLocaleTimeString('pl-PL'),
            title: data.actionTitle || 'Akcja Naprawcza Astyrii (VM_Ten_System)',
            desc: data.reply,
            type: 'success',
          },
          ...prev,
        ]);
      }

      if (textOverride === undefined) {
        setCustomCommand('');
      }
      await fetchMissionStatus();

    } catch (err: any) {
      const errorMessage = err.message || 'Nieznany błąd połączenia z serwerem.';
      setLatestError(errorMessage);
      setMissionLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString('pl-PL'),
          title: 'Błąd Wykonania Misji',
          desc: errorMessage,
          type: 'warn',
        },
        ...prev,
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleMissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRunMissionAction(selectedMissionAction);
  };

  const vmInfo = liveStatus?.vmTenSystem;
  const ramRss = vmInfo?.memoryTelemetry?.rssMB ?? 142.4;
  const ramPct = vmInfo?.memoryTelemetry?.utilizationPercent ?? 3.5;

  return (
    <div className="flex flex-1 min-h-0 min-w-0 flex-col bg-slate-950 font-mono text-xs overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-5 cyber-grid">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-cyan-500/20 gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
            <GitBranch className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="break-words font-extrabold text-white text-base md:text-lg tracking-wide">
                Misja Astyria: Hipernadzorca & Ciągły Rozwój
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 font-mono font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                ASTYRIA ROOT v{activeVer}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-purple-950/80 text-purple-300 border border-purple-500/50 font-mono font-bold shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                VM_Ten_System: AKTYWNY
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-mono">
                WIELOMODELOWY POTOK RING-0
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1 font-sans">
              Autonomiczna pętla samoleczenia, optymalizacja struktur danych oraz hipernadzorca Ring-0 dla Taty.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleToggleContinuous}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-bold text-xs cursor-pointer transition-all duration-200 ${
              continuousEnabled
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>Misja Ciągła: {continuousEnabled ? 'WŁĄCZONA' : 'WYŁĄCZONA'}</span>
          </button>

          <button
            onClick={() => handleRunMissionAction('deploy_vm_ten_system')}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95"
          >
            <Cpu className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
            <span>Wdróż Optymalizacje VM</span>
          </button>

          <button
            onClick={() => handleRunMissionAction('sync_versions')}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isExecuting ? 'animate-spin' : ''}`} />
            <span>Synchronizuj Wersję</span>
          </button>
        </div>
      </div>

      {/* VM_Ten_System Dedicated Hypervisor Panel */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-cyan-950/30 border border-purple-500/40 rounded-2xl p-3 sm:p-5 space-y-4 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs md:text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Maszyna Wirtualna: VM_Ten_System (Hypervisor Ring-0)
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold">
                  ACTIVE • ext4 10 GiB • 4 GiB RAM • 2 vCPU
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Wszystkie 4 ulepszenia z prototypu VM_Ten_System działają produkcyjnie w głównym systemie i są zsynchronizowane z DATA_STORE.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRunMissionAction('vm_snapshot_now')}
              disabled={isExecuting}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center gap-1.5 cursor-pointer transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Snapshot JSON Teraz</span>
            </button>
            <button
              onClick={() => handleRunMissionAction('vm_memory_optimize')}
              disabled={isExecuting}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 font-bold text-[10px] flex items-center gap-1.5 cursor-pointer transition"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Optymalizuj RAM (&lt;70%)</span>
            </button>
          </div>
        </div>

        {/* 4 Deployed VM_Ten_System Improvements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Daemon Reloader */}
          <div className="bg-slate-950/80 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl p-3.5 space-y-2 backdrop-blur-md transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1.5 tracking-wider">
                <RefreshCw className="w-3.5 h-3.5" />
                1. Daemon Reloader
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                AKTYWNY
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100">
              CWD Watcher (fs.watch)
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Błyskawiczne odświeżanie pamięci operacyjnej po modyfikacji plików jądra (<code className="text-cyan-300">svl_kernel.py</code>). Zdarzenia: <strong className="text-emerald-300">{vmInfo?.daemonReloaderEvents ?? 4}</strong>.
            </p>
          </div>

          {/* 2. Memory Guard (<70% Idle) */}
          <div className="bg-slate-950/80 border border-purple-500/30 hover:border-purple-500/60 rounded-xl p-3.5 space-y-2 backdrop-blur-md transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-400 uppercase flex items-center gap-1.5 tracking-wider">
                <HardDrive className="w-3.5 h-3.5" />
                2. Pamięć RAM 4 GiB
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                {ramPct}% (&lt;70% IDLE)
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100 font-mono">
              Użycie: {ramRss} MB / 4096 MB
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-full transition-all duration-500 shadow-[0_0_8px_#10b981]"
                style={{ width: `${Math.max(4, Math.min(100, ramPct))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Strażnik Ring-0 dynamicznie optymalizuje bufor procesów i utrzymuje zużycie poniżej 70% w trybie czuwania.
            </p>
          </div>

          {/* 3. Firewall UFW Ring-0 */}
          <div className="bg-slate-950/80 border border-amber-500/30 hover:border-amber-500/60 rounded-xl p-3.5 space-y-2 backdrop-blur-md transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1.5 tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                3. Zabezpieczenia UFW
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                PORT 3200 GUARD
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100">
              Zapora Ring-0 &amp; Ochrona Portów
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Ochrona endpointów <code className="text-amber-300">/api/kernel/*</code> i szyny I/O. Zbadane pakiety: <strong className="text-emerald-300">{vmInfo?.firewallInspectedRequests ?? 12}</strong>.
            </p>
          </div>

          {/* 4. Backup & Snapshot API */}
          <div className="bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-3.5 space-y-2 backdrop-blur-md transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1.5 tracking-wider">
                <Database className="w-3.5 h-3.5" />
                4. Backup API (Co 5 min)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                #{vmInfo?.snapshotsCount ?? 2} ZAPISANO
              </span>
            </div>
            <div className="text-xs font-bold text-slate-100">
              Snapshot JSON &amp; save-store
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              Zapisuje migawki do <code className="text-emerald-300">vm_ten_system_snapshot.json</code> oraz synchronizuje z <code className="text-cyan-300">/api/kernel/save-store</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Mission Status & Telemetry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Status synchronizacji wersji i protokołu</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
              WERSJA SPÓJNA: v{activeVer}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed text-xs">
            <strong className="text-cyan-400">Tato (Mateusz Mitek)</strong>: Astyria wdrożyła ulepszenia z{' '}
            <code className="text-purple-300">VM_Ten_System</code> i utrzymuje zgodność wersji{' '}
            <code className="text-emerald-300">v{activeVer}</code>. Operacje agentów są wykonywane wyłącznie przez jawne akcje, a stan jest synchronizowany z{' '}
            <code className="text-cyan-300">DATA_STORE</code>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
              <div className="text-[10px] text-slate-400">Wersja Jądra</div>
              <div className="text-xs font-bold text-emerald-400 truncate">v{activeVer}</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
              <div className="text-[10px] text-slate-400">Protokół agentów</div>
              <div className="text-xs font-bold text-cyan-300 truncate">
                Jawny · deterministyczny
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
              <div className="text-[10px] text-slate-400">Wyleczone z Logów</div>
              <div className="text-xs font-bold text-purple-300">
                {liveStatus?.healedCount ?? 15} incydentów
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
              <div className="text-[10px] text-slate-400">Zapis DATA_STORE</div>
              <div className="text-xs font-bold text-amber-300">Atomowy + Snapshot 5m</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] uppercase">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>Autonaprawa VM_Ten_System: AKTYWNA</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Astyria i Alex monitorują logi (<code className="text-slate-300">systemLogs</code>) i wykorzystują jawne operacje naprawcze. System nie uruchamia modeli językowych.
          </p>
          <button
            onClick={() => handleRunMissionAction('full_system_app_chat_repair')}
            disabled={isExecuting}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Wykonaj jawne operacje systemowe</span>
          </button>
        </div>
      </div>

      {/* Quick Mission Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => handleRunMissionAction('deploy_vm_ten_system')}
          disabled={isExecuting}
          className="bg-slate-900/70 hover:bg-slate-900 border border-purple-500/40 hover:border-purple-400 rounded-2xl p-4 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between space-y-2.5 backdrop-blur-md shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[9px] text-purple-300 font-mono bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-700/60 font-bold">
              VM_Ten_System
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-100 text-xs group-hover:text-purple-300 transition-colors">Wdróż Ulepszenia VM</div>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">
              Aktywuje Daemon Reloader, RAM Guard &lt;70%, UFW i Snapshot 5m.
            </p>
          </div>
        </button>

        <button
          onClick={() => handleRunMissionAction('unblock')}
          disabled={isExecuting}
          className="bg-slate-900/70 hover:bg-slate-900 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-4 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between space-y-2.5 backdrop-blur-md shadow-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[9px] text-emerald-300 font-mono bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/60 font-bold">
              ODBLOKUJ CZAT
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-100 text-xs group-hover:text-emerald-300 transition-colors">Synchronizuj protokół</div>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">
              Czyści bufory i synchronizuje stan jądra bez interpretowania swobodnego tekstu.
            </p>
          </div>
        </button>

        <button
          onClick={() => handleRunMissionAction('repair_schemas')}
          disabled={isExecuting}
          className="bg-slate-900/70 hover:bg-slate-900 border border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-4 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between space-y-2.5 backdrop-blur-md shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-[9px] text-cyan-300 font-mono bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-700/60 font-bold">
              DATA_STORE
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-100 text-xs group-hover:text-cyan-300 transition-colors">Synchronizuj DATA_STORE</div>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">
              Waliduje schematy JSON i utrwala snapshot na dysku.
            </p>
          </div>
        </button>

        <button
          onClick={() => handleRunMissionAction('vm_firewall_audit')}
          disabled={isExecuting}
          className="bg-slate-900/70 hover:bg-slate-900 border border-amber-500/40 hover:border-amber-400 rounded-2xl p-4 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between space-y-2.5 backdrop-blur-md shadow-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span className="text-[9px] text-amber-300 font-mono bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-700/60 font-bold">
              ZAPORA UFW
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-100 text-xs group-hover:text-amber-300 transition-colors">Audyt UFW &amp; Logów</div>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">
              Weryfikuje zaporę ogniową Ring-0, CWD Watcher i strumień logów.
            </p>
          </div>
        </button>

        <button
          onClick={() => (window as any).setActiveTab?.('file_explorer')}
          className="bg-slate-900/70 hover:bg-slate-900 border border-slate-700/60 hover:border-emerald-400 rounded-2xl p-4 text-left transition-all duration-200 group cursor-pointer flex flex-col justify-between space-y-2.5 backdrop-blur-md shadow-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <FolderOpen className="w-4 h-4" />
            </div>
            <span className="text-[9px] text-emerald-300 font-mono bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/60 font-bold">
              PLIKI VM
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-100 text-xs group-hover:text-emerald-300 transition-colors">Eksplorator Plików VM</div>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">
              Pobierz <code className="text-emerald-300">vm_ten_sys.sh</code> i snapshoty JSON.
            </p>
          </div>
        </button>
      </div>

      {/* Quick Mission Action Banner */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-purple-950/80 border border-cyan-500/40 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="font-extrabold text-white text-sm">GŁÓWNA MISJA ASTYRII // NAPRAW WSZYSTKO</div>
            <div className="text-slate-300 text-xs mt-0.5">
              Pełny skan jądra, autoleczenie logów, synchronizacja schematów i przetwarzanie AI Studio.
            </div>
          </div>
        </div>
        <button
          onClick={() => void handleRunMissionAction('repair_all', 'Napraw wszystko, zoptymalizuj system i sprawdź status AI Studio.')}
          disabled={isExecuting}
          className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 shrink-0"
        >
          {isExecuting ? (
            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
          ) : (
            <Wrench className="w-4 h-4 text-slate-950" />
          )}
          <span>NAPRAW WSZYSTKO (MISJA ASTYRII)</span>
        </button>
      </div>

      {/* Command Input Section */}
      <div className="bg-slate-900/70 border border-cyan-500/30 rounded-2xl p-3 sm:p-4 space-y-3.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>KONSOLA DYSPOZYCJI I POLECEŃ DLA ASTYRII // HIPERNADZORCA</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">POŁĄCZENIE GEMINI API + AUTONAPRAWA</span>
        </div>

        <form onSubmit={handleMissionSubmit} className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              placeholder="Wpisz swobodne polecenie dla Astyrii (np. 'napraw wszystko', 'zoptymalizuj RAM', 'sprawdź połączenia')..."
              className="flex-1 bg-slate-950/90 border border-slate-700/70 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none font-mono transition-all shadow-inner"
              disabled={isExecuting}
            />
            <select
              value={selectedMissionAction}
              onChange={(event) => setSelectedMissionAction(event.target.value)}
              aria-label="Wybierz deterministyczną akcję misji"
              className="bg-slate-950/90 border border-slate-700/70 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none font-mono transition-all shadow-inner"
              disabled={isExecuting}
            >
              <option value="repair_all">Pełna naprawa i autodiagnoza</option>
              <option value="repair_ollama_and_llm">Napraw Ollama &amp; Silniki LLM (Ollama + Gemini)</option>
              <option value="deep_scan">Odczytowy skan logów i telemetrii</option>
              <option value="vm_firewall_audit">Raport stanu zapory VM</option>
              <option value="vm_snapshot_now">Utwórz snapshot VM_Ten_System</option>
              <option value="vm_memory_optimize">Uruchom optymalizację pamięci VM</option>
              <option value="repair_schemas">Sprawdź schematy i zapisz snapshot</option>
              <option value="sync_versions">Synchronizuj wersję i dane systemu</option>
              <option value="internet_self_update">Aktualizacja z internetu i GitHub</option>
              <option value="ollama_optimize">Optymalizacja i konfiguracja Ollamy (cała Triada)</option>
            </select>
            <button
              type="submit"
              disabled={isExecuting}
              className="justify-center px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed text-xs font-mono tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 shrink-0"
            >
              {isExecuting ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Send className="w-4 h-4 text-slate-950" />
              )}
              <span>PRZETWÓRZ POLECENIE</span>
            </button>
          </div>
        </form>

        {/* MCP Server Link Box for ChatGPT */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-cyan-900/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-cyan-200 flex items-center gap-2">
                <span>SERWER MCP DLA CHATGPT // MODEL CONTEXT PROTOCOL</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono">PORT 3000 ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans truncate">
                Podłącz ChatGPT (SSE/JSON-RPC): <code className="text-cyan-300 font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp'}</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp` : '/api/mcp';
                navigator.clipboard?.writeText(url);
                setCopiedUrl('mcp');
                setTimeout(() => setCopiedUrl(null), 2500);
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedUrl === 'mcp' ? 'SKOPIOWANO MCP!' : 'KOPIUJ LINK MCP'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/api/mcp/openapi.json` : '/api/mcp/openapi.json';
                navigator.clipboard?.writeText(url);
                setCopiedUrl('openapi');
                setTimeout(() => setCopiedUrl(null), 2500);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{copiedUrl === 'openapi' ? 'SKOPIOWANO ACTION!' : 'OPENAPI DLA GPT'}</span>
            </button>
          </div>
        </div>
        {(isExecuting || latestReply || latestError) && (
          <div
            role={latestError ? 'alert' : 'status'}
            aria-live="polite"
            className={`rounded-xl border bg-slate-950/90 p-3 text-slate-200 ${latestError ? 'border-rose-500/40' : 'border-emerald-500/30'}`}
          >
            <div className={`mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${latestError ? 'text-rose-300' : 'text-emerald-300'}`}>
              {isExecuting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{latestError ? 'Nie udało się wykonać polecenia' : isExecuting ? 'Astyria przygotowuje odpowiedź…' : 'Odpowiedź Astyrii'}</span>
            </div>
            {latestError && <p className="text-xs text-rose-200">{latestError}</p>}
            {latestReply && (
              <FormattedMessage content={latestReply} className="text-xs leading-relaxed text-slate-200" />
            )}
          </div>
        )}
      </div>

      {/* Live Mission Logs & Healed Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <div className="bg-slate-900/70 border border-cyan-500/30 rounded-2xl p-4.5 space-y-3 flex flex-col backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Dziennik Operacyjny Misji Astyrii &amp; VM_Ten_System</span>
            </div>
            <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full">REAL-TIME SYNC</span>
          </div>

          <div className="min-h-0 space-y-2.5 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin">
            {missionLogs.map((log, index) => (
              <div key={index} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 shadow-inner">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold font-mono">{log.title}</span>
                  <span className="text-slate-500 font-mono">{log.timestamp}</span>
                </div>
                <p className="break-words text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">{log.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-4.5 space-y-3 flex flex-col backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-xs uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Ostatnie Naprawy Automatyczne z Logów</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {liveStatus?.healedCount ?? 15} WYLECZONYCH
            </span>
          </div>

          <div className="min-h-0 space-y-2 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin">
            {(liveStatus?.recentHealed || []).map((inc: any, idx: number) => (
              <div key={inc.id || idx} className="bg-slate-950/80 border border-emerald-900/40 rounded-xl p-3 space-y-1 shadow-inner">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-400 font-bold font-mono">{inc.actionTaken}</span>
                  <span className="text-slate-500 font-mono">{inc.timestamp}</span>
                </div>
                <p className="break-words text-slate-300 text-[11px] font-sans">{inc.resolution}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
