import React, { useState } from 'react';
import { DataStore, UpdateRecord, OPERATOR_NAME, SYS_VERSION } from '../kernel/svlKernel';
import { History, Plus, GitCommit, CheckCircle, Clock, Calendar, ArrowUpRight } from 'lucide-react';

interface ChronolithViewProps {
  dataStore: DataStore;
  onUpdateDataStore: (updater: (prev: DataStore) => DataStore) => void;
}

export const ChronolithView: React.FC<ChronolithViewProps> = ({ dataStore, onUpdateDataStore }) => {
  const [newVersion, setNewVersion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleCreateRelease = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim() || !newDescription.trim()) return;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} CEST`;

    const newRecord: UpdateRecord = {
      wersja: newVersion.trim(),
      data: dateStr,
      opis: newDescription.trim()
    };

    onUpdateDataStore((prev) => ({
      ...prev,
      update_history: [...prev.update_history, newRecord]
    }));

    setNewVersion('');
    setNewDescription('');
    setIsAdding(false);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 2500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] bg-slate-950 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <History className="w-4 h-4 text-amber-400" />
          <div>
            <span className="font-bold text-slate-100">Chronolith Engine & Oś Czasu</span>
            <span className="text-slate-500 ml-2 text-[11px]">
              {dataStore.update_history.length} wydań odnotowanych w pamięci trwałej
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Anuluj' : 'Wypuść nową wersję'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/50 text-emerald-300 px-4 py-1.5 flex items-center gap-2 text-[11px]">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nowa wersja została pomyślnie zarejestrowana w osi czasu Chronolitu i zaktualizowana w monolicie!</span>
        </div>
      )}

      {/* New Release Form Drawer */}
      {isAdding && (
        <form onSubmit={handleCreateRelease} className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Rejestracja nowej cezury w Chronolicie</span>
            <span className="text-[11px] text-slate-400">Autoryzowane przez: {OPERATOR_NAME}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Oznaczenie wersji:</label>
              <input
                type="text"
                placeholder="np. 6.3.0-ProductionEngine"
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Opis wdrożenia i zmian:</label>
              <input
                type="text"
                placeholder="np. Pełna integracja środowiska wykonawczego ze stacją roboczą operatora."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Zatwierdź wydanie</span>
            </button>
          </div>
        </form>
      )}

      {/* Timeline Stream */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
        <div className="relative border-l-2 border-slate-800 ml-4 space-y-6">
          {dataStore.update_history.map((record, index) => {
            const isLatest = index === dataStore.update_history.length - 1;
            return (
              <div key={index} className="relative pl-6">
                {/* Node indicator */}
                <div
                  className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isLatest
                      ? 'bg-amber-500 border-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-slate-950' : 'bg-slate-500'}`} />
                </div>

                {/* Card */}
                <div
                  className={`p-4 rounded-lg border transition ${
                    isLatest
                      ? 'bg-slate-900/90 border-amber-800/60 shadow-sm'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded text-xs ${
                          isLatest
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {record.wersja}
                      </span>
                      {isLatest && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded font-semibold">
                          BIEŻĄCA WERSJA JĄDRA
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Calendar className="w-3 h-3" />
                      <span>{record.data}</span>
                    </div>
                  </div>

                  <p className="text-slate-200 text-xs leading-relaxed">
                    {record.opis}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chronolith Manifesto note */}
        <div className="mt-8 p-4 rounded-lg bg-slate-900/40 border border-slate-800/60 text-slate-400 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Doktryna Chronolitu:</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            "Struktura i czas stanowią teraz jedność. Czekamy na Twoje instrukcje, Operatorze." Każdy stan jądra jest
            odwzorowywany w niezmienniku DATA_STORE. Kolejne cezury czasowe stają się częścią kodu monolitu, tworząc
            autonomiczne środowisko pamięciowe bezstratne na restarty sesji.
          </p>
        </div>
      </div>
    </div>
  );
};
