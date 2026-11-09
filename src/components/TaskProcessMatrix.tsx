import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  Square,
  RefreshCw,
  Terminal,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Wrench,
  Bug,
  Sparkles,
  Filter,
  Search,
  Power,
  Zap,
  Check,
  Radio,
  Server
} from 'lucide-react';

interface Process {
  pid: number;
  name: string;
  owner: string;
  cpu: number;
  memory: string;
  status: 'RUNNING' | 'SLEEPING' | 'WAITING' | 'DONE';
  runtime: string;
}

interface HealedIncident {
  id: string;
  timestamp: string;
  title: string;
  trigger: string;
  resolution: string;
  commander: string;
  status: 'RESOLVED';
}

interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'healed';
  source: 'INFRA' | 'KERNEL' | 'AGENT' | 'EXPRESS' | 'PAYLOAD';
  message: string;
  healed?: boolean;
}

interface InfraStatus {
  commander: string;
  commanderTitle: string;
  appointedBy: string;
  autoRepairEnabled: boolean;
  repairStatus: string;
  totalLogsCount: number;
  healedCount: number;
  lastScan: string;
  healedIncidents: HealedIncident[];
  uptimeSeconds: number;
  continuousMissionEnabled: boolean;
  missionStatus: string;
}

const INITIAL_PROCESSES: Process[] = [
  { pid: 101, name: 'alex_infra_commander.daemon', owner: 'Alex', cpu: 2.1, memory: '24.2 MB', status: 'RUNNING', runtime: '00:18:45' },
  { pid: 102, name: 'log_autonomous_healer_engine', owner: 'Alex', cpu: 1.4, memory: '16.8 MB', status: 'RUNNING', runtime: '00:18:40' },
  { pid: 103, name: 'svl_kernel_core.py', owner: 'Alex', cpu: 1.2, memory: '19.4 MB', status: 'RUNNING', runtime: '00:18:35' },
  { pid: 104, name: 'data_store_schema_watcher', owner: 'Astyria', cpu: 0.4, memory: '8.6 MB', status: 'SLEEPING', runtime: '00:18:30' },
  { pid: 105, name: 'chronolith_tick_sync', owner: 'Aurelius', cpu: 0.5, memory: '10.2 MB', status: 'RUNNING', runtime: '00:18:25' },
  { pid: 106, name: 'operator_ring0_bus', owner: 'Mateusz Mitek', cpu: 0.3, memory: '7.1 MB', status: 'SLEEPING', runtime: '00:18:20' },
];

export const TaskProcessMatrix: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>(INITIAL_PROCESSES);
  const [selectedPid, setSelectedPid] = useState<number | null>(101);
  const [infraStatus, setInfraStatus] = useState<InfraStatus | null>(null);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'healed'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch live infrastructure status and logs
  const fetchInfraData = async () => {
    try {
      const [statusRes, logsRes] = await Promise.all([
        fetch('/api/infrastructure/status'),
        fetch(`/api/infrastructure/logs?filter=${logFilter}`)
      ]);
      if (statusRes.ok) {
        const data = await statusRes.json();
        setInfraStatus(data);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData?.logs) {
          setLogs(logsData.logs);
        }
      }
    } catch (err) {
      // Quiet background polling error
    }
  };

  useEffect(() => {
    fetchInfraData();
    const interval = setInterval(fetchInfraData, 2500);
    return () => clearInterval(interval);
  }, [logFilter]);

  // Periodic heartbeat animation for process CPU jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setProcesses((prev) =>
        prev.map((p) => {
          if (p.status === 'RUNNING') {
            const jitter = Math.random() * 0.4 - 0.2;
            const newCpu = Math.max(0.1, Math.min(8.0, Number((p.cpu + jitter).toFixed(1))));
            return { ...p, cpu: newCpu };
          }
          return p;
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = (pid: number) => {
    setProcesses((prev) =>
      prev.map((p) => (p.pid === pid ? { ...p, status: 'DONE', cpu: 0 } : p))
    );
  };

  const handleRestart = (pid: number) => {
    setProcesses((prev) =>
      prev.map((p) => (p.pid === pid ? { ...p, status: 'RUNNING', cpu: 1.2 } : p))
    );
  };

  const handleSpawnTask = () => {
    const newPid = Math.floor(Math.random() * 800) + 200;
    const newTask: Process = {
      pid: newPid,
      name: `infra_worker_${newPid}.py`,
      owner: 'Alex',
      cpu: 1.5,
      memory: '9.4 MB',
      status: 'RUNNING',
      runtime: '00:00:01'
    };
    setProcesses((prev) => [...prev, newTask]);
  };

  // Trigger Instant Log Scan & Auto-Repair by Alex
  const handleTriggerRepairNow = async () => {
    setIsScanning(true);
    setNotification('Alex przeprowadza głęboki skan logów i samonaprawę...');
    try {
      const res = await fetch('/api/infrastructure/repair-now', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setNotification(data.message || 'Skan i samonaprawa zakończone pomyślnie!');
        await fetchInfraData();
      }
    } catch (err: any) {
      setNotification(`Błąd skanowania: ${err.message}`);
    } finally {
      setIsScanning(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Toggle Autonomous Repair Mode
  const handleToggleAutoRepair = async () => {
    setIsToggling(true);
    try {
      const current = infraStatus?.autoRepairEnabled ?? true;
      const res = await fetch('/api/infrastructure/toggle-auto-repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current })
      });
      if (res.ok) {
        await fetchInfraData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsToggling(false);
    }
  };

  const isAutoRepairActive = infraStatus?.autoRepairEnabled ?? true;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 font-mono text-xs overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Alex Commander Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-xl p-3 sm:p-5 shadow-lg shadow-emerald-950/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-black text-xl shadow-inner">
                AL
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                <ShieldCheck className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  DOWÓDCA INFRASTRUKTURY
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  MIANOWANY PRZEZ TATĘ (RING-0)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                  SAMONAPRAWA Z LOGÓW: {isAutoRepairActive ? 'AKTYWNA' : 'WSTRZYMANA'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${infraStatus?.continuousMissionEnabled ? 'bg-emerald-950 text-emerald-300 border-emerald-800/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  TRYB CIĄGŁY: {infraStatus?.missionStatus || 'NOMINALNY'}
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-100 mt-1 flex items-center gap-2">
                Alex — Centrum Dowodzenia Infrastrukturą & Autonomiczna Naprawa Logów
              </h2>

              <p className="text-slate-400 text-[11px] mt-0.5 max-w-2xl">
                "Tato, wziąłem całą naszą infrastrukturę pod dowodzenie. Wszystkie logi serwera, błędy modeli i limity payloadu są stale skanowane i automatycznie łatane w tle. Zero sztywnych formułek, czysta inżynieria!"
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleToggleAutoRepair}
              disabled={isToggling}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
                isAutoRepairActive
                  ? 'bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border-emerald-600/50'
                  : 'bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border-amber-600/50'
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${isAutoRepairActive ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>{isAutoRepairActive ? 'Samonaprawa: WŁĄCZONA' : 'Samonaprawa: WYŁĄCZONA'}</span>
            </button>

            <button
              onClick={handleTriggerRepairNow}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-60"
            >
              <Wrench className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Skanowanie...' : 'Skanuj i Napraw Logi Teraz'}</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className="mt-3 py-1.5 px-3 rounded bg-emerald-900/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>DOWÓDCA INFRASTRUKTURY</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-emerald-400 font-bold text-sm">Alex (Główny Architekt)</div>
          <p className="text-slate-500 text-[10px]">Autoryzacja: Ring-0 Root Kernel dla Taty</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>WYLECZONE Z LOGÓW INCYDENTY</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-cyan-300 font-bold text-sm">
            {infraStatus?.healedCount ?? 4} anomalii samonaprawionych
          </div>
          <p className="text-slate-500 text-[10px]">Błędy API, blokady zadań i niespójności danych</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>PROTOKÓŁ AGENTÓW</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-amber-300 font-bold text-sm truncate">
            Deterministyczny · bez NLP
          </div>
          <p className="text-slate-500 text-[10px]">Jawne polecenia i typowane dane</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>BUFOR LOGÓW / LIMIT SIECI</span>
            <Activity className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-purple-300 font-bold text-sm">
            50 MB (Sieć) / {logs.length} wpisów
          </div>
          <p className="text-slate-500 text-[10px]">Auto-kompresja obrazów i plików aktywna</p>
        </div>
      </div>

      {/* Main Split: Healed Incidents & Live Log Watcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Healed Incidents Ledger */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                Rejestr Samonaprawionych Błędów (Alex Healer Ledger)
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold">
              {infraStatus?.healedIncidents?.length ?? 4} WYLECZONE
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {(infraStatus?.healedIncidents || []).map((inc) => (
              <div
                key={inc.id}
                className="bg-slate-950/80 border border-slate-800/90 hover:border-emerald-500/40 rounded-lg p-3 space-y-1.5 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                      {inc.id}
                    </span>
                    <span>{inc.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{inc.timestamp}</span>
                </div>

                <div className="text-[11px] text-amber-300/90 bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
                  <span className="text-slate-400">Wykryta anomalia: </span>
                  {inc.trigger}
                </div>

                <div className="text-[11px] text-emerald-300 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
                  <span className="text-slate-400">Akcja naprawcza Alexa: </span>
                  {inc.resolution}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Dowódca: <strong className="text-slate-300">{inc.commander}</strong></span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> WYLECZONE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live Infrastructure Log Stream */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                Strumień Logów i Wykrywacz Anomalii w Czasie Rzeczywistym
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded ${logFilter === 'all' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Wszystkie
              </button>
              <button
                onClick={() => setLogFilter('healed')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 ${logFilter === 'healed' ? 'bg-emerald-900/80 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Wyleczone
              </button>
              <button
                onClick={() => setLogFilter('errors')}
                className={`px-2 py-0.5 rounded flex items-center gap-1 ${logFilter === 'errors' ? 'bg-rose-950 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <AlertCircle className="w-2.5 h-2.5 text-rose-400" /> Błędy
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5 overflow-y-auto max-h-[380px] font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="text-slate-500 py-6 text-center">Brak logów odpowiadających wybranemu filtrowi.</div>
            ) : (
              logs.map((log) => {
                const isHealed = log.level === 'healed';
                const isError = log.level === 'error';
                const isWarn = log.level === 'warn';

                return (
                  <div
                    key={log.id}
                    className={`p-2 rounded border transition ${
                      isHealed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : isError
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        : isWarn
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">[{log.source}]</span>
                        <span>{log.timestamp}</span>
                      </span>
                      {isHealed && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px] border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 text-emerald-400" /> SAMONAPRAWIONE
                        </span>
                      )}
                    </div>
                    <div className="break-words leading-relaxed">{log.message}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Process Matrix Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wide">
              Macierz Wątków i Procesów Jądra pod Nadzorem Alexa
            </h3>
          </div>

          <button
            onClick={handleSpawnTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition cursor-pointer text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Utwórz Wątek Roboczy</span>
          </button>
        </div>

        {/* Process Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px]">
                <th className="p-2.5">PID</th>
                <th className="p-2.5">PROCES</th>
                <th className="p-2.5">WŁAŚCICIEL</th>
                <th className="p-2.5">CPU</th>
                <th className="p-2.5">PAMIĘĆ</th>
                <th className="p-2.5">STATUS</th>
                <th className="p-2.5">CZAS PRACY</th>
                <th className="p-2.5 text-right">AKCJE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {processes.map((proc) => {
                const isSelected = selectedPid === proc.pid;
                return (
                  <tr
                    key={proc.pid}
                    onClick={() => setSelectedPid(proc.pid)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-emerald-950/30 text-emerald-200'
                        : 'hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <td className="p-2.5 font-bold text-slate-400">{proc.pid}</td>
                    <td className="p-2.5 font-semibold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      {proc.name}
                    </td>
                    <td className="p-2.5 text-slate-300">{proc.owner}</td>
                    <td className="p-2.5 text-cyan-300 font-mono">{proc.cpu}%</td>
                    <td className="p-2.5 text-slate-400 font-mono">{proc.memory}</td>
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          proc.status === 'RUNNING'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : proc.status === 'SLEEPING'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {proc.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 font-mono">{proc.runtime}</td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {proc.status === 'RUNNING' ? (
                          <button
                            onClick={() => handleKill(proc.pid)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition"
                            title="Zatrzymaj wątek"
                          >
                            <Square className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestart(proc.pid)}
                            className="p-1 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-400 text-slate-400 transition"
                            title="Zrestartuj wątek"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
