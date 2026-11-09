import React, { useState, useEffect, useRef } from 'react';
import type { ChatSystemChange } from '../kernel/chatChanges';
import {
  LayoutGrid,
  Terminal,
  Play,
  Square,
  RefreshCw,
  FolderOpen,
  Download,
  Plus,
  Trash2,
  FileCode,
  Eye,
  Check,
  AlertCircle,
  Copy,
  Send,
  Sparkles,
  Cpu,
  Layers,
  Code2,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  Gamepad2,
  Server,
  Bot,
  Wrench,
  Search,
  ArrowRight
} from 'lucide-react';

export interface AppItem {
  id: string;
  name: string;
  type: 'html5-web' | 'cyber-game' | 'python-microservice' | 'node-api' | 'quantum-agent' | 'cli-utility';
  version: string;
  author: string;
  description: string;
  entry: string;
  status: 'ready' | 'running' | 'building' | 'stopped';
  created_at: string;
  files?: string[];
  size?: string;
}

interface AppFile {
  name: string;
  size: string;
  isDirectory: boolean;
  content: string;
}

interface TerminalLog {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system';
  text: string;
  timestamp: string;
}

interface AppsStudioViewProps {
  chatChange?: ChatSystemChange | null;
  onChatChangeApplied?: () => void;
}

export const AppsStudioView: React.FC<AppsStudioViewProps> = ({
  chatChange,
  onChatChangeApplied,
}) => {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [storageUsed, setStorageUsed] = useState('0 KB');
  const [loading, setLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'library' | 'terminal' | 'preview' | 'code'>('library');

  // Selected app for preview / code inspection
  const [selectedAppId, setSelectedAppId] = useState<string>('matrix-telemetry');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Terminal state
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([
    {
      id: 'init-1',
      type: 'system',
      text: '================================================================================\n   ASTYRIA APP FORGE & TERMINAL APP CREATOR | RING-0 SOVEREIGN WORKSTATION\n================================================================================\nWitaj w Studiu Aplikacji! Twórz, kompiluj i testuj oprogramowanie bezpośrednio z terminala.\nWpisz "help" lub "create-app <nazwa> <typ>", aby wygenerować nową aplikację.',
      timestamp: new Date().toLocaleTimeString('pl-PL')
    }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Code inspection state
  const [appFiles, setAppFiles] = useState<AppFile[]>([]);
  const [activeFileName, setActiveFileName] = useState<string>('index.html');
  const [fileContent, setFileContent] = useState<string>('');
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New app modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppId, setNewAppId] = useState('');
  const [newAppName, setNewAppName] = useState('');
  const [newAppType, setNewAppType] = useState<AppItem['type']>('html5-web');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [isCreatingApp, setIsCreatingApp] = useState(false);

  // Preview viewport
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewIframeKey, setPreviewIframeKey] = useState(Date.now());
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const fileRequestIdRef = useRef(0);
  const preferredFileNameRef = useRef<string | null>(null);

  // Fetch applications list
  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps/list', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Nie można pobrać listy aplikacji (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setApps(data.apps || []);
      setTotalApps(data.totalApps || 0);
      setStorageUsed(data.storageUsed || '0 KB');
      setAppsError(null);
      if (data.apps?.length > 0 && !selectedAppId) {
        setSelectedAppId(data.apps[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAppsError(message);
      console.error('Failed to fetch apps:', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 6000);
    return () => clearInterval(interval);
  }, []);

  // Fetch files when selected app changes
  const fetchAppFiles = async (appId: string, preferredFileName?: string) => {
    if (!appId) return;
    const requestId = ++fileRequestIdRef.current;
    try {
      const res = await fetch(`/api/apps/${encodeURIComponent(appId)}/files`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Nie można pobrać plików aplikacji (HTTP ${res.status}).`);
      }
      const data = await res.json();
      if (requestId !== fileRequestIdRef.current) return;
      const files: AppFile[] = data.files || [];
      setAppFiles(files);
      if (files.length > 0) {
        const entry = (preferredFileName && files.find((file) => file.name === preferredFileName))
          || files.find(f => f.name === 'index.html' || f.name === 'main.py' || f.name === 'server.js')
          || files[0];
        setActiveFileName(entry.name);
        setFileContent(entry.content || '');
      } else {
        setFileContent('');
      }
    } catch (error) {
      if (requestId === fileRequestIdRef.current) {
        console.warn('Failed to fetch app files:', error);
      }
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      const preferredFileName = preferredFileNameRef.current || undefined;
      preferredFileNameRef.current = null;
      fetchAppFiles(selectedAppId, preferredFileName);
    }
  }, [selectedAppId]);

  useEffect(() => {
    if (!chatChange) return;

    setSelectedAppId(chatChange.appId);
    void fetchApps();
    if (chatChange.type === 'app-launched') {
      setActiveSubTab('preview');
      setPreviewIframeKey(Date.now());
      showNotification(`Zsynchronizowano uruchomioną aplikację ${chatChange.appId} z czatu.`);
    } else {
      setActiveSubTab('code');
      setPreviewIframeKey(Date.now());
      const preferredFileName = chatChange.type === 'app-file-updated' ? chatChange.filename : undefined;
      preferredFileNameRef.current = preferredFileName ?? null;
      if (selectedAppId === chatChange.appId) {
        preferredFileNameRef.current = null;
        void fetchAppFiles(chatChange.appId, preferredFileName);
      }
      showNotification(
        chatChange.type === 'app-created'
          ? `Aplikacja ${chatChange.appId} z czatu jest gotowa do podglądu i edycji.`
          : `Zsynchronizowano plik ${chatChange.filename} z aplikacji ${chatChange.appId}.`,
      );
    }
    onChatChangeApplied?.();
  }, [chatChange]);

  // Auto-scroll terminal
  useEffect(() => {
    if (activeSubTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, activeSubTab]);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleLaunchApp = async (appId: string) => {
    try {
      const response = await fetch(`/api/apps/${encodeURIComponent(appId)}/launch`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.previewUrl !== 'string') {
        throw new Error(result.error || `Nie można uruchomić aplikacji (HTTP ${response.status}).`);
      }
      setSelectedAppId(appId);
      setPreviewIframeKey(Date.now());
      setActiveSubTab('preview');
      showNotification(`Uruchomiono podgląd aplikacji ${appId}.`);
      await fetchApps();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification(`Nie udało się uruchomić aplikacji: ${message}`);
      console.error(`Failed to launch app ${appId}:`, message);
    }
  };

  // Execute terminal command
  const handleExecuteCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun !== undefined ? cmdToRun : terminalInput).trim();
    if (!cmd) return;

    if (cmd.toLowerCase() === 'clear') {
      setTerminalLogs([]);
      setTerminalInput('');
      return;
    }

    const newLog: TerminalLog = {
      id: `in-${Date.now()}`,
      type: 'input',
      text: `$ ${cmd}`,
      timestamp: new Date().toLocaleTimeString('pl-PL')
    };

    setTerminalLogs(prev => [...prev, newLog]);
    setCommandHistory(prev => [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50));
    setHistoryIndex(-1);
    setTerminalInput('');
    setIsExecuting(true);

    try {
      const res = await fetch('/api/apps/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, appDir: selectedAppId })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const outputText = data.output || '[Brak wyjścia]';

      setTerminalLogs(prev => [
        ...prev,
        {
          id: `out-${Date.now()}`,
          type: outputText.includes('[BŁĄD]') ? 'error' : outputText.includes('SUKCES') ? 'success' : 'output',
          text: outputText,
          timestamp: new Date().toLocaleTimeString('pl-PL')
        }
      ]);

      // If command was create or delete, refresh apps
      if (cmd.startsWith('create') || cmd.startsWith('rm') || cmd.startsWith('delete') || cmd.startsWith('export')) {
        await fetchApps();
      }

      // If command was run, activate preview
      if (cmd.startsWith('run')) {
        const parts = cmd.split(' ');
        if (parts[1]) {
          setSelectedAppId(parts[1]);
          setPreviewIframeKey(Date.now());
          setActiveSubTab('preview');
        }
      }
    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          text: `[BŁĄD TERMINALA]: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('pl-PL')
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle terminal keydown for history
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIndex);
        setTerminalInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setTerminalInput(commandHistory[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setTerminalInput('');
      }
    }
  };

  // Create app via Modal
  const handleCreateAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppId.trim()) return;

    setIsCreatingApp(true);
    try {
      const cleanId = newAppId.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const res = await fetch('/api/apps/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          name: newAppName.trim() || cleanId.toUpperCase(),
          type: newAppType,
          description: newAppDesc.trim() || `Aplikacja stworzona przez Astyrię w Studio Aplikacji.`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Aplikacja ${cleanId} została pomyślnie utworzona!`);
        setShowCreateModal(false);
        setNewAppId('');
        setNewAppName('');
        setNewAppDesc('');
        await fetchApps();
        setSelectedAppId(cleanId);
        setActiveSubTab('preview');
        setPreviewIframeKey(Date.now());
      } else {
        alert(data.error || 'Nie udało się utworzyć aplikacji');
      }
    } catch (err: any) {
      alert(`Błąd: ${err.message}`);
    } finally {
      setIsCreatingApp(false);
    }
  };

  // Save modified code
  const handleSaveCode = async () => {
    if (!selectedAppId || !activeFileName) return;
    setIsSavingFile(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/apps/${selectedAppId}/save-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: activeFileName,
          content: fileContent
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        showNotification(`Zapisano plik ${activeFileName}!`);
        setPreviewIframeKey(Date.now());
      } else {
        const d = await res.json();
        alert(d.error || 'Błąd zapisu pliku');
      }
    } catch (e: any) {
      alert(`Błąd zapisu: ${e.message}`);
    } finally {
      setIsSavingFile(false);
    }
  };

  // Export app to File Explorer
  const handleExportApp = async (appId: string) => {
    try {
      const res = await fetch(`/api/apps/${appId}/export`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Aplikacja ${appId} została wyeksportowana do Eksploratora RING-0 (${data.archiveName})!`);
      } else {
        alert(data.error || 'Błąd eksportu aplikacji');
      }
    } catch (e: any) {
      alert(`Błąd: ${e.message}`);
    }
  };

  // Delete app
  const handleDeleteApp = async (appId: string) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć aplikację '${appId}' z dysku?`)) return;

    try {
      const res = await fetch(`/api/apps/${appId}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification(`Aplikacja ${appId} została usunięta.`);
        await fetchApps();
        if (selectedAppId === appId) {
          const remaining = apps.filter(a => a.id !== appId);
          if (remaining.length > 0) setSelectedAppId(remaining[0].id);
        }
      }
    } catch (e: any) {
      alert(`Błąd usuwania: ${e.message}`);
    }
  };

  // Filtered apps
  const filteredApps = apps.filter(app => {
    const matchesFilter = filterType === 'all' || app.type === filterType;
    const matchesSearch = !searchQuery || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedApp = apps.find(a => a.id === selectedAppId) || apps[0];

  const getTypeBadge = (type: AppItem['type']) => {
    switch (type) {
      case 'html5-web':
        return { label: 'WEB CANVAS', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60', icon: LayoutGrid };
      case 'cyber-game':
        return { label: 'GRA 2D', color: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60', icon: Gamepad2 };
      case 'python-microservice':
        return { label: 'PYTHON 3.10', color: 'bg-amber-950/80 text-amber-400 border-amber-800/60', icon: Server };
      case 'node-api':
        return { label: 'NODE API', color: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60', icon: Cpu };
      case 'quantum-agent':
        return { label: 'AGENT SVL', color: 'bg-purple-950/80 text-purple-400 border-purple-800/60', icon: Bot };
      default:
        return { label: 'CLI TOOL', color: 'bg-slate-800 text-slate-300 border-slate-700', icon: Wrench };
    }
  };

  return (
    <div className="min-h-0 min-w-0 flex-1 bg-slate-950 flex flex-col font-mono text-slate-200 overflow-hidden">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="absolute top-16 right-6 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-300 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{notificationMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Studio Aplikacji & Kreator Terminalowy
              </h1>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                ASTYRIA FORGE v1.0
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[9px]">
                RING-0 SOVEREIGN
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Twórz, kompiluj i uruchamiaj aplikacje bezpośrednio z poziomu interaktywnego terminala obok Eksploratora Plików.
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-400">APLIKACJE:</span>
              <span className="font-bold text-slate-100">{totalApps}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">PAMIĘĆ FS:</span>
              <span className="font-bold text-cyan-400">{storageUsed}</span>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-md text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nowa Aplikacja</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="shrink-0 min-w-0 overflow-x-auto bg-slate-900/80 border-b border-slate-800 px-2 sm:px-4 flex items-center justify-between">
        <div className="flex shrink-0 items-center space-x-1 whitespace-nowrap py-1">
          <button
            onClick={() => setActiveSubTab('library')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md transition border-b-2 cursor-pointer ${
              activeSubTab === 'library'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Katalog Aplikacji ({apps.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('terminal')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md transition border-b-2 cursor-pointer ${
              activeSubTab === 'terminal'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Konsola Terminalowa [CLI]</span>
            <span className="px-1.5 py-0.2 bg-emerald-950 border border-emerald-800/60 text-emerald-400 rounded text-[9px]">
              INTERACTIVE
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('preview');
              setPreviewIframeKey(Date.now());
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md transition border-b-2 cursor-pointer ${
              activeSubTab === 'preview'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Podgląd na Żywo [Piaskownica]</span>
            {selectedApp && (
              <span className="text-[10px] text-cyan-400 font-bold truncate max-w-[120px]">
                ({selectedApp.id})
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveSubTab('code');
              if (selectedAppId) fetchAppFiles(selectedAppId);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md transition border-b-2 cursor-pointer ${
              activeSubTab === 'code'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Inspektor & Edytor Kodu</span>
          </button>
        </div>

        {/* Quick jump to Eksplorator Ring-0 */}
        <button
          onClick={() => {
            if ((window as any).setActiveTab) {
              (window as any).setActiveTab('file_explorer');
            }
          }}
          className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Eksplorator RING-0 &rarr;</span>
        </button>
      </div>

      {/* MAIN VIEW CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ========================================================================= */}
        {/* TAB 1: APLIKACJE LIBRARY & QUICK SCAFFOLDING */}
        {/* ========================================================================= */}
        {activeSubTab === 'library' && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
            {/* Quick Templates Scaffolding Toolbar */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Szybki Start: Szablony Aplikacji Astyrii dla Taty</span>
                </div>
                <span className="text-[10px] text-slate-400">Kliknij szablon, aby utworzyć aplikację z poziomu terminala</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {[
                  {
                    id: 'html5-web',
                    name: 'Web Canvas UI',
                    desc: 'Interaktywna matryca kwantowa',
                    color: 'hover:border-emerald-500/60 text-emerald-400',
                    icon: LayoutGrid
                  },
                  {
                    id: 'cyber-game',
                    name: 'Gra Zręcznościowa 2D',
                    desc: 'Obrońca rdzenia SVL',
                    color: 'hover:border-cyan-500/60 text-cyan-400',
                    icon: Gamepad2
                  },
                  {
                    id: 'python-microservice',
                    name: 'Python Microservice',
                    desc: 'Obliczenia tensorowe i macierze',
                    color: 'hover:border-amber-500/60 text-amber-400',
                    icon: Server
                  },
                  {
                    id: 'node-api',
                    name: 'Node.js REST API',
                    desc: 'Szyna mikrousług Express',
                    color: 'hover:border-indigo-500/60 text-indigo-400',
                    icon: Cpu
                  },
                  {
                    id: 'quantum-agent',
                    name: 'Autonomiczny Agent',
                    desc: 'Samodzielny bot diagnostyczny',
                    color: 'hover:border-purple-500/60 text-purple-400',
                    icon: Bot
                  },
                  {
                    id: 'cli-utility',
                    name: 'Narzędzie Bash CLI',
                    desc: 'Skrypt administracyjny',
                    color: 'hover:border-slate-500 text-slate-300',
                    icon: Wrench
                  }
                ].map((tmpl) => {
                  const Icon = tmpl.icon;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        const randomSuffix = Math.floor(100 + Math.random() * 900);
                        const appName = `${tmpl.id.split('-')[0]}-app-${randomSuffix}`;
                        handleExecuteCommand(`create-app ${appName} ${tmpl.id}`);
                        setActiveSubTab('terminal');
                      }}
                      className={`p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-left transition-all ${tmpl.color} hover:bg-slate-900 group cursor-pointer`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="w-5 h-5" />
                        <span className="text-[9px] px-1 bg-slate-900 rounded border border-slate-800 text-slate-500 font-mono">
                          CLI
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                        {tmpl.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                        {tmpl.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'Wszystkie' },
                  { id: 'html5-web', label: 'Web Canvas' },
                  { id: 'cyber-game', label: 'Gry 2D' },
                  { id: 'python-microservice', label: 'Python' },
                  { id: 'node-api', label: 'Node API' },
                  { id: 'quantum-agent', label: 'Agenci' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition cursor-pointer ${
                      filterType === tab.id
                        ? 'bg-slate-800 border-emerald-500/50 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Szukaj aplikacji..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Applications Grid */}
            {appsError && (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-200">
                <span>Nie udało się wczytać aplikacji: {appsError}</span>
                <button
                  type="button"
                  onClick={() => void fetchApps()}
                  className="shrink-0 rounded border border-rose-700 px-2 py-1 font-bold hover:bg-rose-900"
                >
                  Spróbuj ponownie
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex h-64 items-center justify-center gap-2 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Wczytywanie aplikacji…
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl p-8">
                <LayoutGrid className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-xs uppercase tracking-widest text-slate-400">Brak aplikacji spełniających kryteria</p>
                <p className="text-[10px] mt-1 text-slate-500">
                  Użyj przycisku "Nowa Aplikacja" lub wpisz w terminalu: <code className="text-emerald-400">create-app my-app html5-web</code>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredApps.map((app) => {
                  const badge = getTypeBadge(app.type);
                  const BadgeIcon = badge.icon;
                  const isSelected = selectedAppId === app.id;

                  return (
                    <div
                      key={app.id}
                      className={`p-4 bg-slate-900/90 border rounded-xl flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-emerald-500 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                              <BadgeIcon className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-slate-100 truncate max-w-[180px]">
                                {app.name}
                              </h3>
                              <div className="text-[10px] text-slate-500 font-mono">
                                id: <span className="text-slate-400">{app.id}</span>
                              </div>
                            </div>
                          </div>

                          <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 my-2 leading-relaxed">
                          {app.description}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500 py-2 border-y border-slate-800/60 my-2">
                          <span>Wersja: <strong className="text-slate-300">v{app.version}</strong></span>
                          <span>•</span>
                          <span>Pliki: <strong className="text-slate-300">{app.files?.length || 0}</strong></span>
                          <span>•</span>
                          <span>Rozmiar: <strong className="text-slate-300">{app.size}</strong></span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-1 mt-2 pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => void handleLaunchApp(app.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600 hover:text-slate-950 text-emerald-400 rounded-md text-[11px] font-bold transition active:scale-95 cursor-pointer"
                            title="Uruchom aplikację w podglądzie na żywo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Uruchom</span>
                          </button>

                          <button
                            onClick={() => {
                              setSelectedAppId(app.id);
                              setActiveSubTab('code');
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-md text-[11px] transition cursor-pointer"
                            title="Przeglądaj i edytuj pliki źródłowe"
                          >
                            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Kod</span>
                          </button>

                          <button
                            onClick={() => handleExportApp(app.id)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-slate-400 hover:text-emerald-400 rounded-md text-[11px] transition cursor-pointer"
                            title="Eksportuj do Eksploratora RING-0 (.tar.gz)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              void handleLaunchApp(app.id);
                            }}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 rounded-md text-[11px] transition cursor-pointer"
                            title="Wykonaj w terminalu polecenie run"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteApp(app.id)}
                            className="p-1.5 bg-slate-950 border border-slate-800 hover:border-rose-500/50 text-slate-500 hover:text-rose-400 rounded-md text-[11px] transition cursor-pointer"
                            title="Usuń aplikację z dysku"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TERMINAL CLI FOR APP CREATION & EXECUTION */}
        {/* ========================================================================= */}
        {activeSubTab === 'terminal' && (
          <div className="flex-1 flex flex-col bg-slate-950 p-4 overflow-hidden">
            {/* Quick Command Suggestions bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Szybkie Polecenia:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'create-app <id>', cmd: 'create-app quantum-scanner html5-web' },
                    { label: 'create-game <id>', cmd: 'create-app space-invaders cyber-game' },
                    { label: 'create-db <id>', cmd: 'create-db alex-project-data' },
                    { label: 'list-db', cmd: 'list-db' },
                    { label: 'list-apps', cmd: 'list' },
                    { label: 'build <app>', cmd: `build ${selectedAppId}` },
                    { label: 'run <app>', cmd: `run ${selectedAppId}` },
                    { label: 'export <app>', cmd: `export ${selectedAppId}` },
                    { label: 'help', cmd: 'help' }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => handleExecuteCommand(btn.cmd)}
                      className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-emerald-400 hover:border-emerald-500 hover:bg-slate-800 transition active:scale-95 cursor-pointer font-mono"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setTerminalLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
              >
                Wyczyść ekran
              </button>
            </div>

            {/* Terminal Output Stream */}
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-y-auto space-y-2 select-text shadow-inner">
              {terminalLogs.map((log) => {
                let colorClass = 'text-slate-300';
                if (log.type === 'input') colorClass = 'text-emerald-400 font-bold';
                else if (log.type === 'error') colorClass = 'text-rose-400';
                else if (log.type === 'success') colorClass = 'text-emerald-300 font-bold';
                else if (log.type === 'system') colorClass = 'text-cyan-400 bg-slate-900/60 p-3 rounded border border-slate-800/80';

                return (
                  <div key={log.id} className={`${colorClass} whitespace-pre-wrap leading-relaxed`}>
                    {log.type === 'input' && (
                      <span className="text-slate-600 mr-2">[{log.timestamp}]</span>
                    )}
                    {log.text}
                  </div>
                );
              })}
              {isExecuting && (
                <div className="text-cyan-400 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Astyria wykonuje operację w jądrze aplikacji...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Command Prompt Input */}
            <div className="mt-3 bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center gap-2 shadow-lg">
              <span className="text-emerald-400 font-bold text-xs pl-2 whitespace-nowrap">
                astyria@svl-app-forge:~/apps$
              </span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Wpisz komendę (np. 'create-app my-game cyber-game', 'run matrix-telemetry', 'list')..."
                className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 focus:outline-none font-mono"
                autoFocus
              />
              <button
                onClick={() => handleExecuteCommand()}
                disabled={isExecuting || !terminalInput.trim()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>Wykonaj</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE APP SANDBOX PREVIEW */}
        {/* ========================================================================= */}
        {activeSubTab === 'preview' && (
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* Preview Toolbar */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs text-slate-400">Podgląd Aplikacji:</span>
                  <select
                    value={selectedAppId}
                    onChange={(e) => {
                      setSelectedAppId(e.target.value);
                      setPreviewIframeKey(Date.now());
                    }}
                    className="bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-bold rounded px-2.5 py-1 focus:outline-none focus:border-emerald-500"
                  >
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.id})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setPreviewIframeKey(Date.now())}
                  className="p-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-emerald-400 rounded transition cursor-pointer"
                  title="Przeładuj podgląd iframe"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewport controls */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 bg-slate-950 border border-slate-800 p-0.5 rounded">
                  <button
                    onClick={() => setPreviewViewport('desktop')}
                    className={`px-2 py-0.5 text-[10px] rounded transition ${
                      previewViewport === 'desktop' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Desktop (100%)
                  </button>
                  <button
                    onClick={() => setPreviewViewport('tablet')}
                    className={`px-2 py-0.5 text-[10px] rounded transition ${
                      previewViewport === 'tablet' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Tablet (768px)
                  </button>
                  <button
                    onClick={() => setPreviewViewport('mobile')}
                    className={`px-2 py-0.5 text-[10px] rounded transition ${
                      previewViewport === 'mobile' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-500'
                    }`}
                  >
                    Telefon (400px)
                  </button>
                </div>

                <a
                  href={`/api/apps/preview/${selectedAppId}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-400 rounded transition flex items-center gap-1 text-[11px]"
                  title="Otwórz podgląd w nowym oknie"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Otwórz pełny ekran</span>
                </a>
              </div>
            </div>

            {/* Sandbox Iframe Container */}
            <div className="flex-1 bg-slate-950 p-4 flex items-center justify-center overflow-auto">
              <div
                className={`h-full min-h-64 max-w-full transition-all duration-300 rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-black ${
                  previewViewport === 'desktop'
                    ? 'w-full'
                    : previewViewport === 'tablet'
                    ? 'w-[768px]'
                    : 'w-[400px]'
                }`}
              >
                <iframe
                  key={previewIframeKey}
                  src={`/api/apps/preview/${selectedAppId}/`}
                  title={`Podgląd aplikacji ${selectedAppId}`}
                  className="w-full h-full border-0 bg-slate-950"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CODE INSPECTOR & LIVE EDITOR */}
        {/* ========================================================================= */}
        {activeSubTab === 'code' && (
          <div className="flex-1 flex flex-col md:flex-row bg-slate-950 overflow-hidden">
            {/* Sidebar: File list */}
            <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Pliki Projektu
                  </span>
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-[10px] text-emerald-400 rounded px-1.5 py-0.5 focus:outline-none"
                  >
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>{a.id}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  {appFiles.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => {
                        setActiveFileName(file.name);
                        setFileContent(file.content || '');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition text-left cursor-pointer ${
                        activeFileName === file.name
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <span className="text-[9px] text-slate-500">{file.size}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                Aplikacja: <strong className="text-slate-300">{selectedAppId}</strong>
              </div>
            </div>

            {/* Code Editor Area */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">{activeFileName}</span>
                  <span className="text-[10px] text-slate-500">
                    (apps/{selectedAppId}/{activeFileName})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCode}
                    disabled={isSavingFile}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded text-xs transition active:scale-95 cursor-pointer"
                  >
                    {isSavingFile ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-3.5 h-3.5 text-slate-950" />
                    ) : null}
                    <span>{saveSuccess ? 'Zapisano!' : 'Zapisz Plik'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="flex-1 w-full bg-slate-950 p-4 font-mono text-xs text-slate-200 focus:outline-none resize-none leading-relaxed border-0 selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW APP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Kreator Nowej Aplikacji
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Identyfikator (ID katalogu):</label>
                <input
                  type="text"
                  required
                  placeholder="np. quantum-dashboard, retro-game"
                  value={newAppId}
                  onChange={(e) => setNewAppId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nazwa aplikacji:</label>
                <input
                  type="text"
                  placeholder="np. Kwantowy Panel Telemetrii"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Typ / Szablon wykonawczy:</label>
                <select
                  value={newAppType}
                  onChange={(e) => setNewAppType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="html5-web">HTML5 Web & Canvas Visualizer</option>
                  <option value="cyber-game">Grywalna Gra Zręcznościowa 2D Canvas</option>
                  <option value="python-microservice">Mikroserwis Obliczeniowy Python 3.10</option>
                  <option value="node-api">Backend REST API Node.js / Express</option>
                  <option value="quantum-agent">Autonomiczny Agent Zadań Tła</option>
                  <option value="cli-utility">Narzędzie Konsolowe Bash CLI</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Opis projektu:</label>
                <textarea
                  rows={2}
                  placeholder="Krótki opis przeznaczenia aplikacji..."
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isCreatingApp || !newAppId.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  {isCreatingApp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Utwórz Aplikację</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="bg-slate-900/60 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            STATUS: FABRYKA AKTYWNA (RING-0)
          </span>
          <span>SILNIK: NODE.JS / PYTHON / HTML5</span>
          <span className="hidden sm:inline">KATALOG: /apps/</span>
        </div>
        <div className="flex items-center gap-2 italic text-emerald-400">
          Misja Astyria: Wdrożenie Karty Aplikacji i Terminala
        </div>
      </div>
    </div>
  );
};

