import React, { useState } from 'react';
import { DataStore, UpdateRecord, OPERATOR_NAME } from '../kernel/svlKernel';
import { History, Camera, RotateCcw, ShieldCheck, CheckCircle2, Clock, GitCommit, FileText, Lock } from 'lucide-react';

interface Snapshot {
  id: string;
  name: string;
  timestamp: string;
  version: string;
  store: DataStore;
  hash: string;
}

interface TemporalMatrixProps {
  dataStore: DataStore;
  onRestoreSnapshot: (store: DataStore) => void;
  onAddUpdate: (wersja: string, opis: string) => void;
}

export const TemporalMatrix: React.FC<TemporalMatrixProps> = ({
  dataStore,
  onRestoreSnapshot,
  onAddUpdate,
}) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([
    {
      id: 'snap-init',
      name: 'Początkowy Transfer Monolitu',
      timestamp: '2026-10-15 22:40:00 CEST',
      version: '6.2.0-StudioMonolith',
      store: dataStore,
      hash: '0x9E4F7A1B'
    }
  ]);
  const [snapshotName, setSnapshotName] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const generateSimpleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  };

  const handleCreateSnapshot = () => {
    const name = snapshotName.trim() || `Punkt kontrolny #${snapshots.length + 1}`;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} CEST`;

    const serialized = JSON.stringify(dataStore);
    const hash = generateSimpleHash(serialized);

    const newSnap: Snapshot = {
      id: `snap-${Date.now()}`,
      name,
      timestamp: timeStr,
      version: dataStore.update_history[dataStore.update_history.length - 1]?.wersja || '6.3.0',
      store: JSON.parse(serialized),
      hash
    };

    setSnapshots((prev) => [newSnap, ...prev]);
    setSnapshotName('');
  };

  const handleRestore = (snap: Snapshot) => {
    if (confirm(`Czy chcesz przywrócić stan jądra z punktu kontrolnego "${snap.name}" (${snap.version})?`)) {
      onRestoreSnapshot(snap.store);
      setRestoreSuccess(`Przywrócono stan z migawki "${snap.name}".`);
      setTimeout(() => setRestoreSuccess(null), 2500);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 font-mono text-xs overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-amber-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-100 text-sm">Matryca Osi Czasu Chronolitu & Migawki (Aurelius)</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
                PROJEKT NADZORCY
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              "Struktura i czas stanowią teraz jedność. Czekamy na Twoje instrukcje, Operatorze."
            </p>
          </div>
        </div>

        {/* Snapshot creation input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Nazwa migawki (np. Przed optymalizacją)..."
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500 w-56"
          />
          <button
            onClick={handleCreateSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Utwórz Migawkę</span>
          </button>
        </div>
      </div>

      {restoreSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-800/50 p-2.5 rounded text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{restoreSuccess}</span>
        </div>
      )}

      {/* Snapshots & Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Snapshots List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200">Rejestr Migawek Stanu (Snapshots)</span>
            <span className="text-slate-500 text-[11px]">{snapshots.length} zachowanych punktów</span>
          </div>

          <div className="space-y-3">
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2 hover:border-amber-800/60 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-xs">{snap.name}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 text-[10px] font-bold">
                    {snap.version}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Czas: {snap.timestamp}</span>
                  <span className="text-amber-400 font-semibold">{snap.hash}</span>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex justify-end">
                  <button
                    onClick={() => handleRestore(snap)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 text-[11px] cursor-pointer transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Przywróć ten punkt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Immutable Chronolith Timeline */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200">Niezmienny Dziennik Kontinuum</span>
            <span className="text-slate-500 text-[11px] flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              Integralność Kryptograficzna
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {dataStore.update_history.map((record, idx) => {
              const isLatest = idx === dataStore.update_history.length - 1;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    isLatest
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-300 text-xs">{record.wersja}</span>
                    <span className="text-[10px] text-slate-500">{record.data}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{record.opis}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
