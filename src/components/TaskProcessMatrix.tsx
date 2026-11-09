import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, Check, CheckCircle2, RefreshCw, ShieldCheck, Terminal, Zap } from 'lucide-react';

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

export const TaskProcessMatrix: React.FC = () => {
  const [infraStatus, setInfraStatus] = useState<InfraStatus | null>(null);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'healed'>('all');

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
                  SAMONAPRAWA Z LOGÓW: WYŁĄCZONA
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded border bg-slate-800 text-slate-400 border-slate-700">
                  TRYB CIĄGŁY: WYŁĄCZONY
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-100 mt-1 flex items-center gap-2">
                Alex — Diagnostyka Infrastruktury
              </h2>

              <p className="text-slate-400 text-[11px] mt-0.5 max-w-2xl">
                Odczyt stanu i logów serwera. Samonaprawa, zmiany kodu i automatyczna synchronizacja są wyłączone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchInfraData()}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-700 px-3 py-2 text-cyan-200 hover:bg-cyan-950"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Odśwież diagnostykę
          </button>
        </div>


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
            {infraStatus?.healedCount ?? 0} historycznych napraw
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
          <p className="text-slate-500 text-[10px]">Historia logów serwera</p>
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
                Historia napraw serwera
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold">
              {infraStatus?.healedIncidents?.length ?? 0} HISTORYCZNYCH
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

      <p className="text-xs text-slate-500">Panel nie uruchamia procesów ani napraw. Dane procesu hosta są dostępne w telemetrii systemowej.</p>
    </div>
  );
};
