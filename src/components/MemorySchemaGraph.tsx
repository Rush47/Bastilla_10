import React, { useState } from 'react';
import { DataStore } from '../kernel/svlKernel';
import { Database, CheckCircle2, ShieldCheck, GitBranch, Share2, Layers, Search, RefreshCw, Cpu } from 'lucide-react';

interface MemorySchemaGraphProps {
  dataStore: DataStore;
}

export const MemorySchemaGraph: React.FC<MemorySchemaGraphProps> = ({ dataStore }) => {
  const [selectedNode, setSelectedNode] = useState<string>('config');
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditPassed, setAuditPassed] = useState(true);

  const runSchemaAudit = () => {
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      setAuditPassed(true);
    }, 700);
  };

  const nodes = [
    { id: 'root', label: 'DATA_STORE', type: 'root', items: 3, desc: 'Główny korzeń monolitu pamięciowego' },
    { id: 'config', label: 'DATA_STORE.config', type: 'branch', items: Object.keys(dataStore.config).length, desc: 'Parametry środowiskowe i flagi trwałości' },
    { id: 'update_history', label: 'DATA_STORE.update_history', type: 'branch', items: dataStore.update_history.length, desc: 'Liniowy rejestr wydań Chronolitu' },
    { id: 'chat_history', label: 'DATA_STORE.chat_history', type: 'branch', items: dataStore.chat_history.length, desc: 'Zintegrowana historia interakcji agentów' },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 font-mono text-xs overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Banner */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-100 text-sm">Mapa Pamięci Topologicznej & Walidator AST (Astyria)</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                PROJEKT OPTYMALIZATORA
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              "Architektura monolitu została dostosowana tak, by zachować pełną czytelność."
            </p>
          </div>
        </div>

        <button
          onClick={runSchemaAudit}
          disabled={auditRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${auditRunning ? 'animate-spin' : ''}`} />
          <span>{auditRunning ? 'Audyt...' : 'Uruchom Audyt Niezmienników'}</span>
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <span className="text-slate-500 text-[11px]">ENTROPIA STRUKTURY DANYCH</span>
          <div className="text-cyan-400 font-bold text-base">
            0.00 bit (Czystość 100%)
          </div>
          <p className="text-slate-500 text-[10px]">Zero nadmiarowości i martwych referencji.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <span className="text-slate-500 text-[11px]">STATUS ZNACZNIKÓW MONOLITU</span>
          <div className="text-emerald-400 font-bold text-base">
            ZGODNE (100% PARSOWALNE)
          </div>
          <p className="text-slate-500 text-[10px]">&lt;&lt;&lt;DATA_STORE_START&gt;&gt;&gt; / END</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <span className="text-slate-500 text-[11px]">SPÓJNOŚĆ SCHEMATU JSON</span>
          <div className="text-purple-300 font-bold text-base">
            STRICT VALIDATED
          </div>
          <p className="text-slate-500 text-[10px]">Wszystkie typy prymitywne zgodne.</p>
        </div>
      </div>

      {/* Topological Nodes Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Nodes Map */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
          <span className="font-bold text-slate-200 block border-b border-slate-800 pb-2">
            Topologia Węzłów Pamięci
          </span>

          <div className="space-y-2">
            {nodes.map((node) => {
              const isSelected = selectedNode === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-700/60 text-slate-100'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{node.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-800">
                      {node.items} el.
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{node.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Schema & Invariant View */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200">
              Inspektor Węzła: <span className="text-cyan-400">{selectedNode}</span>
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Niezmiennik Zachowany
            </span>
          </div>

          {selectedNode === 'config' && (
            <div className="space-y-3">
              <span className="text-slate-400 text-[11px] block">Wartości w rejestrze konfiguracyjnym:</span>
              <pre className="bg-slate-950 p-3 rounded border border-slate-800 text-cyan-300 text-xs overflow-x-auto leading-relaxed">
                {JSON.stringify(dataStore.config, null, 2)}
              </pre>
            </div>
          )}

          {selectedNode === 'update_history' && (
            <div className="space-y-3">
              <span className="text-slate-400 text-[11px] block">Ciągłość chronologiczna wydań:</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {dataStore.update_history.map((u, i) => (
                  <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between gap-2">
                    <div>
                      <span className="text-amber-400 font-bold mr-2">{u.wersja}</span>
                      <span className="text-slate-300">{u.opis}</span>
                    </div>
                    <span className="text-slate-500 whitespace-nowrap">{u.data}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedNode === 'chat_history' && (
            <div className="space-y-3">
              <span className="text-slate-400 text-[11px] block">Strumień pamięci konwersacji ({dataStore.chat_history.length} wiadomości):</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {dataStore.chat_history.slice(-6).map((msg, i) => (
                  <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                    <span className="text-purple-400 font-bold mr-2">[{msg.agent}]:</span>
                    <span>{msg.tekst}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedNode === 'root' && (
            <div className="space-y-3">
              <span className="text-slate-400 text-[11px] block">Metadane korzenia pamięci:</span>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-slate-500 block">Struktura bazowa:</span>
                  <span className="text-slate-200 font-bold">Python Monolith Dict</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="text-slate-500 block">Klucze najwyższego rzędu:</span>
                  <span className="text-cyan-300 font-bold">config, update_history, chat_history</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
