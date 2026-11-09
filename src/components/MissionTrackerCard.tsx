import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  FastForward,
  Sparkles,
  ShieldCheck,
  Zap,
  AlertCircle,
  Flag,
  Activity,
  Layers,
  ChevronRight,
  Terminal,
  RefreshCw
} from 'lucide-react';

export interface MissionStage {
  id: number;
  title: string;
  description?: string;
  durationSeconds: number;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface MissionTrackerData {
  id: string;
  title: string;
  assignedAgent: string;
  totalDurationSeconds: number;
  stages: MissionStage[];
  status: 'active' | 'paused' | 'completed';
}

interface MissionTrackerCardProps {
  initialMission?: Partial<MissionTrackerData>;
  rawPrompt?: string;
}

function buildMissionStages(assignedAgent: string): MissionStage[] {
  return [
    { id: 1, title: 'Etap 1: Walidacja jawnego polecenia', description: 'Sprawdzenie schematu żądania i uprawnień.', durationSeconds: 12, status: 'completed' },
    { id: 2, title: `Etap 2: Wykonanie deterministycznej operacji przez ${assignedAgent}`, description: 'Uruchomienie wybranego działania bez interpretacji swobodnego tekstu.', durationSeconds: 22, status: 'in_progress' },
    { id: 3, title: 'Etap 3: Weryfikacja stanu jądra', description: 'Kontrola odpowiedzi, integralności DATA_STORE i logów.', durationSeconds: 16, status: 'pending' },
    { id: 4, title: 'Etap 4: Utrwalenie wyniku', description: 'Zapis historii protokołu i raportu końcowego.', durationSeconds: 10, status: 'pending' }
  ];
}

export const MissionTrackerCard: React.FC<MissionTrackerCardProps> = ({
  initialMission,
  rawPrompt
}) => {
  const agentName = initialMission?.assignedAgent || 'Triada';
  const defaultTitle = initialMission?.title || (rawPrompt ? `Misja dla ${agentName}: ${rawPrompt.length > 50 ? rawPrompt.slice(0, 50) + '...' : rawPrompt}` : 'Realizacja Misji Ring-0');

  const defaultStages: MissionStage[] = initialMission?.stages || buildMissionStages(agentName);

  const [stages, setStages] = useState<MissionStage[]>(defaultStages);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(1); // Index of in_progress stage
  const [totalSecondsRemaining, setTotalSecondsRemaining] = useState<number>(() => {
    return defaultStages.reduce((acc, s) => s.status !== 'completed' ? acc + s.durationSeconds : acc, 0);
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isFullyCompleted, setIsFullyCompleted] = useState<boolean>(false);

  // Live Infra Logs & Auto-Repair State for Mission Verification
  const [showLogs, setShowLogs] = useState(false);
  const [infraLogs, setInfraLogs] = useState<any[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairMsg, setRepairMsg] = useState<string | null>(null);

  const fetchInfraLogs = async () => {
    try {
      const res = await fetch('/api/infrastructure/logs?filter=all');
      if (res.ok) {
        const data = await res.json();
        setInfraLogs(data.logs || []);
      }
    } catch {}
  };

  const handleTriggerRepair = async () => {
    setIsRepairing(true);
    setRepairMsg(null);
    try {
      const res = await fetch('/api/infrastructure/repair-now', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRepairMsg(data.message || 'Auto-naprawa wykonana pomyślnie przez Alexa.');
        fetchInfraLogs();
      }
    } catch (err: any) {
      setRepairMsg(`Błąd skanowania: ${err.message}`);
    } finally {
      setIsRepairing(false);
    }
  };

  useEffect(() => {
    if (showLogs) {
      fetchInfraLogs();
      const interval = setInterval(fetchInfraLogs, 3200);
      return () => clearInterval(interval);
    }
  }, [showLogs]);

  // Total initial seconds calculation
  const totalInitialSeconds = defaultStages.reduce((acc, s) => acc + s.durationSeconds, 0);

  // Live countdown timer effect
  useEffect(() => {
    if (!isRunning || isFullyCompleted) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prevElapsed) => {
        const nextElapsed = prevElapsed + 1;

        if (nextElapsed >= totalInitialSeconds) {
          setIsFullyCompleted(true);
          setIsRunning(false);
          setTotalSecondsRemaining(0);
          setStages((prev) => prev.map((st) => ({ ...st, status: 'completed' as const })));
          return totalInitialSeconds;
        }

        setTotalSecondsRemaining(Math.max(0, totalInitialSeconds - nextElapsed));

        // Functional update for stages to avoid closure over stale state
        setStages((prevStages) => {
          let accum = 0;
          let newCurrentIdx = prevStages.length - 1;

          const updated = prevStages.map((st, idx) => {
            accum += st.durationSeconds;
            if (nextElapsed < accum - st.durationSeconds) {
              return { ...st, status: 'pending' as const };
            } else if (nextElapsed >= accum) {
              return { ...st, status: 'completed' as const };
            } else {
              newCurrentIdx = idx;
              return { ...st, status: 'in_progress' as const };
            }
          });

          setCurrentStageIdx(newCurrentIdx);
          return updated;
        });

        return nextElapsed;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isFullyCompleted, totalInitialSeconds]);

  // Fast forward to next stage
  const handleFastForwardNextStage = () => {
    if (isFullyCompleted) return;

    const currentStage = stages[currentStageIdx];
    if (!currentStage) return;

    // Advance elapsed time to end of current stage
    let accum = 0;
    for (let i = 0; i <= currentStageIdx; i++) {
      accum += stages[i].durationSeconds;
    }

    setElapsedSeconds(accum);
    const updatedStages = stages.map((st, idx) => {
      if (idx <= currentStageIdx) return { ...st, status: 'completed' as const };
      if (idx === currentStageIdx + 1) return { ...st, status: 'in_progress' as const };
      return { ...st, status: 'pending' as const };
    });

    setStages(updatedStages);

    if (currentStageIdx + 1 >= stages.length) {
      setIsFullyCompleted(true);
      setIsRunning(false);
      setTotalSecondsRemaining(0);
    } else {
      setCurrentStageIdx(currentStageIdx + 1);
    }
  };

  // Complete all stages instantly
  const handleCompleteAll = () => {
    setElapsedSeconds(totalInitialSeconds);
    setTotalSecondsRemaining(0);
    setStages(stages.map((st) => ({ ...st, status: 'completed' as const })));
    setIsFullyCompleted(true);
    setIsRunning(false);
  };

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalInitialSeconds) * 100));

  return (
    <div className="my-4 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-xl shadow-emerald-950/30 overflow-hidden font-mono text-xs">
      {/* Top Banner */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${isFullyCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-emerald-950 text-emerald-400 border-emerald-800'}`}>
            {isFullyCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-xs">{defaultTitle}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                isFullyCompleted
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : isRunning
                  ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {isFullyCompleted ? 'MISJA ZAKOŃCZONA' : isRunning ? 'REALIZACJA RING-0' : 'WSTRZYMANO'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Przydzielony Dowódca: <strong className="text-emerald-400">{agentName}</strong> · Oś czasu Ring-0
            </p>
          </div>
        </div>

        {/* Live Timer Counter */}
        <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
          <Clock className="w-4 h-4 text-emerald-400 animate-spin" />
          <div>
            <div className="text-emerald-300 font-bold text-sm tracking-wider font-mono">
              {formatTime(totalSecondsRemaining)}
            </div>
            <div className="text-[9px] text-slate-500">
              {isFullyCompleted ? 'Czas całkowity:' : 'Pozostało odliczanie:'} {formatTime(elapsedSeconds)} / {formatTime(totalInitialSeconds)}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="px-4 pt-3 pb-2 bg-slate-950 border-b border-slate-900">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 font-mono">
          <span>Postęp misji: <strong className="text-emerald-400">{progressPercent}%</strong></span>
          <span>{stages.filter(s => s.status === 'completed').length} z {stages.length} etapów ukończono</span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400 transition-all duration-500 shadow-sm shadow-emerald-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Mission Stages List */}
      <div className="p-3.5 space-y-2.5 bg-slate-950">
        {stages.map((stage) => {
          const isDone = stage.status === 'completed';
          const isCurrent = stage.status === 'in_progress';

          return (
            <div
              key={stage.id}
              className={`p-2.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                isDone
                  ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                  : isCurrent
                  ? 'bg-slate-900 border-emerald-500/60 shadow-md shadow-emerald-950/40 text-slate-100 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-900 text-slate-500'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 p-1 rounded-full shrink-0 ${
                  isDone
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : isCurrent
                    ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                    : 'bg-slate-900 text-slate-600 border border-slate-800'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-700 flex items-center justify-center text-[9px]">
                      {stage.id}
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-xs flex items-center gap-2">
                    <span className={isDone ? 'line-through text-slate-400' : isCurrent ? 'text-emerald-300' : 'text-slate-400'}>
                      {stage.title}
                    </span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                        W TRAKCIE (ETAP {stage.id})
                      </span>
                    )}
                  </div>
                  {stage.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      {stage.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {stage.durationSeconds}s
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapsible Live Infra Logs & Auto-Repair Panel */}
      {showLogs && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dziennik Logów i Samonaprawy Alexa (Infra Ring-0)</span>
            </span>
            <button
              onClick={handleTriggerRepair}
              disabled={isRepairing}
              className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition cursor-pointer text-[10px] flex items-center gap-1 font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 text-emerald-400 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>{isRepairing ? 'Skanowanie...' : 'Szybki Skan Alexa'}</span>
            </button>
          </div>

          {repairMsg && (
            <div className="p-2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px]">
              {repairMsg}
            </div>
          )}

          <div className="max-h-40 overflow-y-auto space-y-1 text-[10px] text-slate-300 pr-1 select-text">
            {infraLogs.length === 0 ? (
              <p className="text-slate-600 italic">Ładowanie logów infrastruktury...</p>
            ) : (
              infraLogs.slice(0, 15).map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 border-b border-slate-900/60 pb-1">
                  <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                    log.healed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    log.level === 'error' ? 'bg-rose-950 text-rose-300' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {log.category || 'INFRA'}
                  </span>
                  <span className="break-all text-slate-200">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Interactive Controls Footer */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRunning(!isRunning)}
            disabled={isFullyCompleted}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer text-[10px] flex items-center gap-1 disabled:opacity-40"
          >
            {isRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
            <span>{isRunning ? 'Wstrzymaj' : 'Wznów'}</span>
          </button>

          <button
            onClick={handleFastForwardNextStage}
            disabled={isFullyCompleted}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition cursor-pointer text-[10px] flex items-center gap-1 disabled:opacity-40 font-bold"
            title="Przejdź natychmiast do następnego etapu"
          >
            <FastForward className="w-3 h-3 text-cyan-400" />
            <span>Następny etap</span>
          </button>

          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`px-2.5 py-1 rounded transition cursor-pointer text-[10px] flex items-center gap-1 border ${
              showLogs
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>{showLogs ? 'Ukryj Logi' : 'Logi Misji & Auto-Repair'}</span>
          </button>
        </div>

        <button
          onClick={handleCompleteAll}
          disabled={isFullyCompleted}
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-black text-[10px] transition cursor-pointer flex items-center gap-1 shadow"
        >
          <CheckCircle2 className="w-3.5 h-3.5 fill-slate-950" />
          <span>Finalizuj całą misję</span>
        </button>
      </div>
    </div>
  );
};
