import React, { useState, lazy, Suspense } from 'react';
import { DataStore, OPERATOR_NAME } from '../kernel/svlKernel';
import { TabId } from './Navigation';

const AgentCommsView = lazy(() => import('./AgentCommsView').then(m => ({ default: m.AgentCommsView })));
const TaskProcessMatrix = lazy(() => import('./TaskProcessMatrix').then(m => ({ default: m.TaskProcessMatrix })));
const AstyriaMissionView = lazy(() => import('./AstyriaMissionView').then(m => ({ default: m.AstyriaMissionView })));
const MemorySchemaGraph = lazy(() => import('./MemorySchemaGraph').then(m => ({ default: m.MemorySchemaGraph })));
const TemporalMatrix = lazy(() => import('./TemporalMatrix').then(m => ({ default: m.TemporalMatrix })));
const TerminalView = lazy(() => import('./TerminalView').then(m => ({ default: m.TerminalView })));
const MonolithView = lazy(() => import('./MonolithView').then(m => ({ default: m.MonolithView })));
const DataStoreView = lazy(() => import('./DataStoreView').then(m => ({ default: m.DataStoreView })));
const DiagnosticsView = lazy(() => import('./DiagnosticsView').then(m => ({ default: m.DiagnosticsView })));
const TriadVisualization = lazy(() => import('./TriadVisualization').then(m => ({ default: m.TriadVisualization })));
const FileExplorer = lazy(() => import('./FileExplorer').then(m => ({ default: m.FileExplorer })));
const AppsStudioView = lazy(() => import('./AppsStudioView').then(m => ({ default: m.AppsStudioView })));
import { IntegrationsPhotosNotesSection } from './IntegrationsPhotosNotesSection';

interface BastillaOSDashboardViewProps {
  dataStore: DataStore;
  onSendMessage: React.ComponentProps<typeof AgentCommsView>['onSendMessage'];
  onSendProtocol: React.ComponentProps<typeof AgentCommsView>['onSendProtocol'];
  onRunAstyriaMission: React.ComponentProps<typeof AgentCommsView>['onRunAstyriaMission'];
  onUpdateDataStore: React.Dispatch<React.SetStateAction<DataStore>>;
  isLoading: boolean;
  onClearHistory: () => void;
  onForceSync: () => void;
  onExecutePythonCommand?: (cmd: string) => Promise<any>;
}

export const BastillaOSDashboardView: React.FC<BastillaOSDashboardViewProps> = ({
  dataStore,
  onSendMessage,
  onSendProtocol,
  onRunAstyriaMission,
  onUpdateDataStore,
  isLoading,
  onClearHistory,
  onForceSync,
  onExecutePythonCommand
}) => {
  const [activeSection, setActiveSection] = useState<string>('integrations');
  const [chatGptTaskPrompt, setChatGptTaskPrompt] = useState('Zadanie: usprawnij responsywność BastillaOS.');
  const [copiedTask, setCopiedTask] = useState(false);

  const handleCopyTask = () => {
    navigator.clipboard.writeText(chatGptTaskPrompt);
    setCopiedTask(true);
    setTimeout(() => setCopiedTask(false), 2000);
  };

  const navItems = [
    { id: 'integrations', label: 'Integracje i Chat', badge: 'POŁĄCZ', icon: 'fa-solid fa-plug' },
    { id: 'bastillaos_desktop', label: 'BastillaOS', badge: 'SYSTEM', icon: 'fa-solid fa-desktop' },
    { id: 'comms', label: 'Komora Triady & Dialog', badge: `${dataStore?.chat_history?.length || 0}`, icon: 'fa-solid fa-comments' },
    { id: 'approvals', label: 'Akceptacje czatu', badge: 'DECYZJE', icon: 'fa-solid fa-check-to-slot' },
    { id: 'process_matrix', label: 'Infrastruktura & Naprawa', badge: 'DOWÓDCA', icon: 'fa-solid fa-server' },
    { id: 'astyria_mission', label: 'Misja Astyria & VM', badge: 'VM v8.5', icon: 'fa-solid fa-rocket' },
    { id: 'schema_graph', label: 'Mapa Pamięci', badge: 'ASTYRIA', icon: 'fa-solid fa-network-wired' },
    { id: 'temporal', label: 'Oś Czasu & Migawki', badge: 'AURELIUS', icon: 'fa-solid fa-clock-rotate-left' },
    { id: 'terminal', label: 'Konsola CLI', badge: 'PY 3.10', icon: 'fa-solid fa-terminal' },
    { id: 'monolith', label: 'Monolit Python (.py)', badge: 'CODE', icon: 'fa-solid fa-file-code' },
    { id: 'datastore', label: 'Rejestr DATA_STORE', badge: 'JSON', icon: 'fa-solid fa-database' },
    { id: 'diagnostics', label: 'Telemetria', badge: 'LIVE', icon: 'fa-solid fa-wave-square' },
    { id: 'visualizer', label: 'Wizualizator Triady', badge: '3D', icon: 'fa-solid fa-cube' },
    { id: 'file_explorer', label: 'Eksplorator RING-0', badge: 'STORAGE', icon: 'fa-solid fa-folder-tree' },
    { id: 'apps', label: 'Aplikacje [Terminal]', badge: 'FORGE', icon: 'fa-solid fa-hammer' },
    { id: 'hypercom', label: 'HyperCom — transmisja', badge: 'HYPERCOM', icon: 'fa-solid fa-satellite-dish' },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#030712] font-mono text-xs text-slate-100 h-full overflow-hidden select-none">
      
      {/* Left Sidebar (Obszar Roboczy - BastillaOS Debian 13) */}
      <aside className="w-full md:w-72 bg-[#050b18] border-r border-blue-900/40 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 border-b border-blue-900/40 flex items-center justify-between text-slate-400 text-[10px] tracking-wider uppercase font-bold">
          <span>Obszar Roboczy</span>
          <span className="text-cyan-400">BastillaOS</span>
        </div>

        <div className="p-2 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center justify-between cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white font-bold shadow-[0_0_15px_rgba(14,165,233,0.4)] border border-cyan-400/50'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-cyan-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <i className={`${item.icon} w-4 text-center ${isActive ? 'text-white' : 'text-blue-400'}`}></i>
                  <span className="truncate">{item.label}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 ${isActive ? 'bg-slate-950 text-cyan-200' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-blue-900/40 bg-slate-950/80 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="font-bold text-blue-300">BASTILLAOS</span>
          <span className="text-emerald-400 font-bold">DEBIAN 13</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 bg-[#020617] overflow-hidden">
        {activeSection === 'integrations' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-slate-900/80 border border-blue-500/40 p-6 rounded-2xl shadow-2xl backdrop-blur">
              <h1 className="text-xl font-bold text-cyan-300">Integracje BastillaOS</h1>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                ChatGPT działa na Twoim koncie w osobnej karcie. BastillaOS nie odczytuje Twojego hasła ani połączeń ChatGPT. Dostępność funkcji sprawdzisz po zalogowaniu.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <a
                  href="https://chatgpt.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold rounded-lg shadow-lg flex items-center gap-2 transition cursor-pointer"
                >
                  <i className="fa-solid fa-robot"></i>
                  <span>Otwórz ChatGPT</span>
                </a>
                <button
                  onClick={() => setActiveSection('comms')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold rounded-lg flex items-center gap-2 transition cursor-pointer"
                >
                  <i className="fa-solid fa-comments"></i>
                  <span>Czat lokalny SVL</span>
                </button>
                <button
                  onClick={() => setActiveSection('github')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold rounded-lg flex items-center gap-2 transition cursor-pointer"
                >
                  <i className="fa-brands fa-github"></i>
                  <span>Synchronizacja GitHub</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/70 border border-blue-900/60 p-4 rounded-xl space-y-2">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <i className="fa-solid fa-comment-dots text-blue-400"></i>
                  Rozmowa i analiza
                </div>
                <p className="text-slate-400 text-xs">Rozmowy, rozumowanie i praca nad tekstem.</p>
                <div className="text-[10px] text-cyan-400 pt-1 font-bold">W ChatGPT • dostępność zależy od konta</div>
              </div>

              <div className="bg-slate-900/70 border border-blue-900/60 p-4 rounded-xl space-y-2">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <i className="fa-solid fa-image text-cyan-400"></i>
                  Obrazy i zdjęcia
                </div>
                <p className="text-slate-400 text-xs">Generowanie obrazów oraz analiza zdjęć.</p>
                <div className="text-[10px] text-cyan-400 pt-1 font-bold">W ChatGPT • dostępność zależy od konta</div>
              </div>

              <div className="bg-slate-900/70 border border-blue-900/60 p-4 rounded-xl space-y-2">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <i className="fa-solid fa-globe text-emerald-400"></i>
                  Internet i badania
                </div>
                <p className="text-slate-400 text-xs">Wyszukiwanie, źródła i badania według dostępnego konta.</p>
                <div className="text-[10px] text-cyan-400 pt-1 font-bold">W ChatGPT • dostępność zależy od konta</div>
              </div>

              <div className="bg-slate-900/70 border border-blue-900/60 p-4 rounded-xl space-y-2">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <i className="fa-solid fa-file-lines text-amber-400"></i>
                  Pliki i dane
                </div>
                <p className="text-slate-400 text-xs">Dokumenty, arkusze, prezentacje oraz analiza danych.</p>
                <div className="text-[10px] text-cyan-400 pt-1 font-bold">W ChatGPT • dostępność zależy od konta</div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-blue-500/40 p-5 rounded-xl space-y-3">
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <i className="fa-solid fa-paper-plane text-cyan-400"></i>
                Przekaż zadanie do ChatGPT
              </div>
              <p className="text-slate-400 text-xs">Sprawdź tekst, skopiuj go i wklej w ChatGPT. Pliki dołącz samodzielnie.</p>
              
              <textarea
                value={chatGptTaskPrompt}
                onChange={(e) => setChatGptTaskPrompt(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-blue-900/80 rounded-lg p-3 text-slate-100 font-mono text-xs outline-none focus:border-cyan-500"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyTask}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-copy"></i>
                  <span>Kopiuj zadanie</span>
                </button>
                {copiedTask && <span className="text-emerald-400 text-xs font-bold animate-pulse">Skopiowano do schowka!</span>}
              </div>
            </div>

            {/* Integracje Google Photos (OAuth 2.0 / Picker API) oraz Samsung Notes */}
            <IntegrationsPhotosNotesSection
              onInsertIntoTask={(txt) => setChatGptTaskPrompt((prev) => `${prev}\n\n${txt}`)}
              onSendToChat={(agent, msg) => {
                const target = agent === 'Aria' ? 'si_1' : agent;
                if (target === 'triad' || target === 'Alex' || target === 'Astyria' || target === 'Aurelius' || target === 'si_1') {
                  void onSendMessage(msg, target);
                }
              }}
            />
          </div>
        )}

        {activeSection === 'bastillaos_desktop' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-blue-950/40 to-slate-950 text-center">
            <div className="max-w-md bg-slate-900 border border-blue-500/50 p-6 rounded-2xl shadow-2xl space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400 flex items-center justify-center text-blue-400 text-3xl mx-auto shadow-[0_0_20px_rgba(14,165,233,0.4)]">
                <i className="fa-solid fa-compact-disc animate-spin" style={{ animationDuration: '6s' }}></i>
              </div>
              <h2 className="text-lg font-bold text-cyan-300">BastillaOS v9.0.0 · Debian 13 (Trixie)</h2>
              <p className="text-slate-300 text-xs">Środowisko graficzne KDE Plasma (Deep Blue Edition) zintegrowane z jądrem SVL Ring-0.</p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => setActiveSection('terminal')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Otwórz Konsolę ROOT
                </button>
                <button
                  onClick={() => setActiveSection('comms')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Otwórz Czat Agentów
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'comms' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie komory triady...</div>}>
            <AgentCommsView
              dataStore={dataStore}
              onSendMessage={onSendMessage}
              onSendProtocol={onSendProtocol}
              onRunAstyriaMission={onRunAstyriaMission}
              isLoading={isLoading}
              onClearHistory={onClearHistory}
              onForceSync={onForceSync}
            />
          </Suspense>
        )}

        {activeSection === 'process_matrix' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie infrastruktury...</div>}>
            <TaskProcessMatrix />
          </Suspense>
        )}

        {activeSection === 'astyria_mission' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie misji Astyrii...</div>}>
            <AstyriaMissionView dataStore={dataStore} onUpdateDataStore={onUpdateDataStore} />
          </Suspense>
        )}

        {activeSection === 'schema_graph' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie mapy pamięci...</div>}>
            <MemorySchemaGraph dataStore={dataStore} />
          </Suspense>
        )}

        {activeSection === 'temporal' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie osi czasu...</div>}>
            <TemporalMatrix dataStore={dataStore} onRestoreSnapshot={() => {}} onAddUpdate={() => {}} />
          </Suspense>
        )}

        {activeSection === 'terminal' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie konsoli CLI...</div>}>
            <TerminalView
              dataStore={dataStore}
              onUpdateDataStore={onUpdateDataStore}
              onSendProtocol={onSendProtocol}
              onExecutePythonCommand={onExecutePythonCommand || (async () => ({ output: "Brak skonfigurowanego wykonawcy Python." }))}
            />
          </Suspense>
        )}

        {activeSection === 'monolith' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie monolitu...</div>}>
            <MonolithView dataStore={dataStore} onSetDataStore={() => {}} />
          </Suspense>
        )}

        {activeSection === 'datastore' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie rejestru DATA_STORE...</div>}>
            <DataStoreView dataStore={dataStore} onUpdateDataStore={() => {}} />
          </Suspense>
        )}

        {activeSection === 'diagnostics' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie telemetrii...</div>}>
            <DiagnosticsView dataStore={dataStore} />
          </Suspense>
        )}

        {activeSection === 'visualizer' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie wizualizatora...</div>}>
            <TriadVisualization />
          </Suspense>
        )}

        {activeSection === 'file_explorer' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie eksploratora...</div>}>
            <FileExplorer />
          </Suspense>
        )}

        {activeSection === 'apps' && (
          <Suspense fallback={<div className="p-6 text-slate-400">Ładowanie studia aplikacji...</div>}>
            <AppsStudioView />
          </Suspense>
        )}

        {activeSection === 'hypercom' && (
          <div className="flex-1 p-6 space-y-4">
            <h2 className="text-lg font-bold text-cyan-300">HyperCom — Transmisja Kwantowa Ring-0</h2>
            <p className="text-slate-300 text-xs">Połączenie kwantowe z siecią węzłów satelitarnych i stacją badawczą Nexus jest w pełni aktywne.</p>
            <pre className="p-4 bg-slate-950 border border-blue-900/60 rounded-xl text-xs text-emerald-400">
[HYPERCOM]: Węzeł MALAK_ONE dokowanie zakończone (99.8% integrity, 1.21 GW).
[IP BOX 2.5%]: Cypruszowy adres IP aktywny (SCE-eSIM-PQC).
            </pre>
          </div>
        )}
      </main>

    </div>
  );
};
