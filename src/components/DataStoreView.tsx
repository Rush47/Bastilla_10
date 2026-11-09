import React, { useState, useEffect } from 'react';
import { DataStore } from '../kernel/svlKernel';
import { Database, Plus, Save, Code, CheckCircle, AlertCircle, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { FormattedMessage } from './FormattedMessage';

interface DataStoreViewProps {
  dataStore: DataStore;
  onUpdateDataStore: (updater: (prev: DataStore) => DataStore) => void;
}

export const DataStoreView: React.FC<DataStoreViewProps> = ({ dataStore, onUpdateDataStore }) => {
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');
  const [rawJson, setRawJson] = useState<string>(() => JSON.stringify(dataStore, null, 2));
  const [isDirtyRaw, setIsDirtyRaw] = useState(false);
  const [rawError, setRawError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSavingDisk, setIsSavingDisk] = useState(false);

  // Inline config editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');

  // New config key state
  const [newConfigKey, setNewConfigKey] = useState('');
  const [newConfigVal, setNewConfigVal] = useState('');

  // Keep rawJson updated when dataStore updates from backend unless user is actively editing rawJson
  useEffect(() => {
    if (!isDirtyRaw) {
      setRawJson(JSON.stringify(dataStore, null, 2));
    }
  }, [dataStore, isDirtyRaw]);

  const persistStoreToBackend = async (nextStore: DataStore) => {
    setIsSavingDisk(true);
    setRawError(null);
    try {
      onUpdateDataStore(() => nextStore);
      const res = await fetch('/api/kernel/save-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: nextStore }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.state?.store) {
          onUpdateDataStore(() => data.state.store);
          setRawJson(JSON.stringify(data.state.store, null, 2));
        }
      }
      setIsDirtyRaw(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3200);
    } catch (err: any) {
      setRawError(err.message || 'Błąd zapisu na dysk jądra');
    } finally {
      setIsSavingDisk(false);
    }
  };

  const handleSaveRaw = async () => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed.config || !parsed.chat_history || !parsed.update_history) {
        setRawError('DATA_STORE musi zawierać obiekty: config, update_history oraz chat_history.');
        return;
      }
      await persistStoreToBackend(parsed);
    } catch (err: any) {
      setRawError(err.message || 'Błąd składni JSON');
    }
  };

  const parseConfigValue = (raw: string): any => {
    const trimmed = raw.trim();
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {}
    }
    if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
    return trimmed;
  };

  const handleAddConfigKey = async () => {
    if (!newConfigKey.trim()) return;
    const key = newConfigKey.trim();
    const val = parseConfigValue(newConfigVal);

    const nextStore: DataStore = {
      ...dataStore,
      config: {
        ...dataStore.config,
        [key]: val,
      },
    };
    setNewConfigKey('');
    setNewConfigVal('');
    await persistStoreToBackend(nextStore);
  };

  const handleSaveInlineKey = async (key: string) => {
    const val = parseConfigValue(editingVal);
    const nextStore: DataStore = {
      ...dataStore,
      config: {
        ...dataStore.config,
        [key]: val,
      },
    };
    setEditingKey(null);
    await persistStoreToBackend(nextStore);
  };

  const handleDeleteConfigKey = async (key: string) => {
    const newCfg = { ...dataStore.config };
    delete newCfg[key];
    const nextStore: DataStore = {
      ...dataStore,
      config: newCfg,
    };
    await persistStoreToBackend(nextStore);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 font-mono text-xs overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Database className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-bold text-slate-100">DATA_STORE</span>
          <span className="text-slate-500 text-[10px] sm:text-[11px] hidden xs:inline">
            {Object.keys(dataStore.config).length} config · {dataStore.update_history.length} wydań · {dataStore.chat_history.length} msgs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => {
                setRawJson(JSON.stringify(dataStore, null, 2));
                setIsDirtyRaw(false);
                setViewMode('structured');
              }}
              className={`px-3 py-1 rounded transition cursor-pointer font-medium ${
                viewMode === 'structured'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Widok Struktury
            </button>
            <button
              onClick={() => {
                setRawJson(JSON.stringify(dataStore, null, 2));
                setIsDirtyRaw(false);
                setViewMode('raw');
              }}
              className={`px-3 py-1 rounded transition cursor-pointer font-medium flex items-center gap-1.5 ${
                viewMode === 'raw'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Edytor JSON</span>
            </button>
          </div>

          <button
            onClick={() => (viewMode === 'raw' ? handleSaveRaw() : persistStoreToBackend(dataStore))}
            disabled={isSavingDisk}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold transition cursor-pointer"
          >
            {isSavingDisk ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSavingDisk ? 'Zapisywanie...' : 'Zapisz JSON i Synchronizuj'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/50 text-emerald-300 px-4 py-1.5 flex items-center gap-2 text-[11px]">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>DATA_STORE oraz wersja systemu zostały trwale zapisane w pliku svl_kernel.py na dysku Ring-0!</span>
        </div>
      )}

      {rawError && (
        <div className="bg-rose-950/60 border-b border-rose-800/50 text-rose-300 px-4 py-1.5 flex items-center gap-2 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>{rawError}</span>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'raw' ? (
          <div className="h-full flex flex-col">
            <textarea
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setIsDirtyRaw(true);
              }}
              className="w-full h-full bg-slate-900 border border-slate-800 rounded p-4 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Config Section */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-cyan-400">1. Konfiguracja Jądra (DATA_STORE.config)</span>
                <span className="text-[11px] text-slate-400">Kluczowe flagi środowiskowe (kliknij Edytuj, by zapisać na dysku)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(dataStore.config).map(([k, val]) => (
                  <div key={k} className="bg-slate-950 border border-slate-800/80 rounded p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-400 block font-semibold text-[11px]">{k}</span>
                      {editingKey === k ? (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingVal}
                            onChange={(e) => setEditingVal(e.target.value)}
                            className="flex-1 bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveInlineKey(k)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] cursor-pointer"
                          >
                            Zapisz
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                          >
                            Anuluj
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-100 font-mono text-xs break-all">
                          {Array.isArray(val) ? `[ ${val.join(', ')} ]` : String(val)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {editingKey !== k && (
                        <button
                          onClick={() => {
                            setEditingKey(k);
                            setEditingVal(Array.isArray(val) ? JSON.stringify(val) : String(val));
                          }}
                          className="p-1 text-slate-500 hover:text-cyan-400 rounded hover:bg-slate-900 cursor-pointer"
                          title="Edytuj parametr i zapisz na dysku"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!['mode', 'fiction_layer_status', 'active_profiles'].includes(k) && (
                        <button
                          onClick={() => handleDeleteConfigKey(k)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-900 cursor-pointer"
                          title="Usuń parametr"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Parameter Row */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/50">
                <span className="text-slate-400 text-[11px]">Dodaj parametr:</span>
                <input
                  type="text"
                  placeholder="Klucz (np. sys_version)"
                  value={newConfigKey}
                  onChange={(e) => setNewConfigKey(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 w-40"
                />
                <input
                  type="text"
                  placeholder="Wartość (np. 8.0.0-SovereignPro)"
                  value={newConfigVal}
                  onChange={(e) => setNewConfigVal(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 w-48"
                />
                <button
                  onClick={handleAddConfigKey}
                  disabled={!newConfigKey.trim() || isSavingDisk}
                  className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Dodaj i Zapisz</span>
                </button>
              </div>
            </div>

            {/* Update History Section */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-amber-400">2. Rejestr Chronolitu (DATA_STORE.update_history)</span>
                <span className="text-[11px] text-slate-400">{dataStore.update_history.length} pozycji</span>
              </div>

              <div className="space-y-2">
                {dataStore.update_history.map((upd, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40 font-bold text-[11px]">
                        {upd.wersja}
                      </span>
                      <span className="text-slate-300 font-medium">{upd.opis}</span>
                    </div>
                    <span className="text-slate-500 text-[11px] font-mono whitespace-nowrap">
                      {upd.data}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat History Section */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-purple-400">3. Zintegrowana Historia Czatu (DATA_STORE.chat_history)</span>
                <span className="text-[11px] text-slate-400">{dataStore.chat_history.length} rekordów</span>
              </div>

              <div className="space-y-2">
                {dataStore.chat_history.map((msg, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded p-2.5 flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 font-bold text-[10px] shrink-0">
                      {msg.agent}
                    </span>
                    <div className="flex-1 min-w-0">
                      <FormattedMessage content={msg.tekst} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
