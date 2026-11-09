import React, { useEffect, useRef, useState } from 'react';
import { DataStore, OPERATOR_NAME } from '../kernel/svlKernel';
import { SYSTEM_AGENTS, AgentProfile } from '../kernel/agents';
import {
  Sparkles,
  Layers,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Sigma,
  MessagesSquare,
  Paperclip,
  Send,
  X,
  Bot,
  Zap,
  Terminal as TerminalIcon,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Cpu,
  Activity,
  Sliders,
  Maximize2,
  Trash2,
  Share2,
} from 'lucide-react';
import { FormattedMessage } from './FormattedMessage';
import {
  ASTYRIA_MISSION_ACTIONS,
  ASTYRIA_MISSION_LABELS,
  AGENT_PROTOCOL_COMMANDS,
  AGENT_PROTOCOL_LABELS,
  AstyriaMissionAction,
  AgentProtocolCommand,
  AgentProtocolReply,
  AgentProtocolRequest,
} from '../kernel/agentProtocol';
import {
  CHAT_ATTACHMENT_ACCEPT,
  ChatAttachment,
  MAX_CHAT_ATTACHMENTS,
  readChatAttachmentFile,
  validateChatAttachments,
} from '../kernel/chatAttachments';

interface AgentCommsViewProps {
  dataStore: DataStore;
  onSendProtocol: (request: AgentProtocolRequest) => Promise<AgentProtocolReply | undefined>;
  onSendMessage: (
    message: string,
    agent: 'triad' | 'Alex' | 'Astyria' | 'Aurelius' | 'si_1',
    attachments?: ChatAttachment[],
  ) => Promise<void>;
  onRunAstyriaMission: (action: AstyriaMissionAction) => Promise<void>;
  isLoading: boolean;
  sendError?: string | null;
  onClearHistory: () => void;
  onForceSync?: () => void;
  onTriggerInitiative?: () => Promise<void>;
  onUnclog?: () => void;
  onRestoreBackup?: () => void;
}

const QUICK_PROMPTS = [
  { label: '⚡ Stan Jądra', text: '/status — Podaj aktualny stan jądra SVL Ring-0' },
  { label: '🛡️ Audyt Bezpieczeństwa', text: 'Aurelius: Przeprowadź audyt integralności systemu i tokenów' },
  { label: '📐 Wektor Eulera', text: 'Astyria: Oblicz zespolony wektor fazowy e^(i*omega*t) dla 880Hz' },
  { label: '🚀 Inicjatywa Triady', text: 'Triada: Zgłoście propozycje kolejnej optymalizacji Bastilla OS' },
];

export const AgentCommsView: React.FC<AgentCommsViewProps> = ({
  dataStore,
  onSendProtocol,
  onSendMessage,
  onRunAstyriaMission,
  isLoading,
  sendError,
  onClearHistory,
  onForceSync,
  onTriggerInitiative,
  onUnclog,
  onRestoreBackup,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'triad' | 'Alex' | 'Astyria' | 'Aurelius' | 'si_1'>('triad');
  const [selectedCommand, setSelectedCommand] = useState<AgentProtocolCommand>('SYSTEM_STATUS');
  const [signal, setSignal] = useState('');
  const [omega, setOmega] = useState('');
  const [time, setTime] = useState('');
  const [selectedMissionAction, setSelectedMissionAction] = useState<AstyriaMissionAction>('deep_scan');
  const [messageText, setMessageText] = useState('');
  const [chatAttachments, setChatAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [mobileSection, setMobileSection] = useState<'chat' | 'agents'>('chat');
  const [showProtocolTools, setShowProtocolTools] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const followLatestMessagesRef = useRef(true);

  const transmissionStatus = sendError
    ? { label: 'BŁĄD TRANSMISJI', color: 'rose' }
    : isLoading
    ? { label: 'PRZETWARZANIE', color: 'cyan' }
    : { label: 'POŁĄCZONO', color: 'emerald' };

  useEffect(() => {
    const chatScroll = chatScrollRef.current;
    if (chatScroll && followLatestMessagesRef.current) {
      chatScroll.scrollTop = chatScroll.scrollHeight;
    }
  }, [dataStore.chat_history.length, isLoading]);

  const handleSendProtocol = async () => {
    if (isLoading) return;
    const payload = selectedCommand === 'SIGNAL_ANALYSIS'
      ? {
          ...(signal.trim() ? { signal: signal.trim() } : {}),
          ...(omega !== '' ? { omega: Number(omega) } : {}),
          ...(time !== '' ? { time: Number(time) } : {}),
        }
      : undefined;

    try {
      await onSendProtocol({
        command: selectedCommand,
        agent: selectedTarget,
        ...(payload && Object.keys(payload).length > 0 ? { payload } : {}),
      });
    } catch {
      // Protocol errors exposed via sendError
    }
  };

  const handleRunAstyriaMission = async () => {
    if (isLoading) return;
    setSelectedTarget('Astyria');
    try {
      await onRunAstyriaMission(selectedMissionAction);
    } catch {
      // Mission errors exposed via sendError
    }
  };

  const handleSendMessage = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    const message = messageText.startsWith('/propose write-file ')
      ? messageText
      : messageText.trim();
    if ((!message && chatAttachments.length === 0) || isLoading) return;
    try {
      await onSendMessage(message, selectedTarget, chatAttachments);
      setMessageText('');
      setChatAttachments([]);
      setAttachmentError(null);
    } catch {
      // Transmission errors exposed via sendError
    }
  };

  const handleAttachmentSelection = async (filesArray: File[]) => {
    setAttachmentError(null);
    if (filesArray.length === 0) return;
    if (chatAttachments.length + filesArray.length > MAX_CHAT_ATTACHMENTS) {
      setAttachmentError(`Możesz dołączyć maksymalnie ${MAX_CHAT_ATTACHMENTS} plików.`);
      return;
    }
    let incoming: ChatAttachment[];
    try {
      incoming = await Promise.all(filesArray.map(readChatAttachmentFile));
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Nie udało się odczytać wybranego pliku.');
      return;
    }
    const validation = validateChatAttachments([...chatAttachments, ...incoming]);
    if (!validation.valid) {
      setAttachmentError(validation.error);
      return;
    }
    setChatAttachments(validation.attachments);
  };

  const handleCopyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    await handleAttachmentSelection(files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#030712] font-sans text-xs selection:bg-cyan-500/30 selection:text-cyan-100 lg:flex-row ${
        isDragOver ? 'ring-4 ring-cyan-500 ring-inset bg-cyan-950/20' : ''
      }`}
    >
      {/* Mobile Tab Toggle */}
      <div className="grid grid-cols-2 gap-1 border-b border-slate-800/80 bg-slate-900/95 p-1.5 backdrop-blur-xl lg:hidden z-10">
        <button
          type="button"
          onClick={() => setMobileSection('chat')}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
            mobileSection === 'chat'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          <MessagesSquare className="h-4 w-4" />
          <span>Konwersacja AI</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('agents')}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all ${
            mobileSection === 'agents'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>Agenci & Stan</span>
        </button>
      </div>

      {/* Main Container: Chat Stream */}
      <div
        className={`${
          mobileSection === 'chat' ? 'flex' : 'hidden'
        } min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-800/60 bg-[#050b14]/90 backdrop-blur-2xl lg:flex`}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border-b border-cyan-500/20 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg z-10">
          {/* Target Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>KANAŁ ADRESATA:</span>
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
              {(
                [
                  { id: 'triad', label: 'Triada (Rój AI)', color: 'from-cyan-500 via-teal-400 to-blue-500', activeBg: 'bg-cyan-950 text-cyan-200 border-cyan-500/60' },
                  { id: 'Alex', label: 'Alex (Infra)', color: 'from-emerald-500 to-teal-400', activeBg: 'bg-emerald-950 text-emerald-200 border-emerald-500/60' },
                  { id: 'Astyria', label: 'Astyria (Dev)', color: 'from-cyan-400 to-blue-500', activeBg: 'bg-cyan-950 text-cyan-200 border-cyan-500/60' },
                  { id: 'Aurelius', label: 'Aurelius (Sec)', color: 'from-amber-400 to-orange-500', activeBg: 'bg-amber-950 text-amber-200 border-amber-500/60' },
                  { id: 'si_1', label: 'Aria (AI)', color: 'from-purple-400 to-pink-500', activeBg: 'bg-purple-950 text-purple-200 border-purple-500/60' },
                ] as const
              ).map((agent) => {
                const isSelected = selectedTarget === agent.id;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedTarget(agent.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 ${
                      isSelected
                        ? `${agent.activeBg} shadow-[0_0_12px_rgba(6,182,212,0.25)]`
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    {agent.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <Sigma className="w-3.5 h-3.5 text-emerald-400" />
              <span>DOLPHIN 8B UNCENSORED</span>
            </span>

            {onTriggerInitiative && (
              <button
                type="button"
                onClick={onTriggerInitiative}
                disabled={isLoading}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/40 text-purple-200 rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-1.5 disabled:opacity-40 shadow-[0_0_12px_rgba(168,85,247,0.2)] text-xs font-semibold active:scale-95"
                title="Poproś agenta o propozycję autonomicznego działania"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span className="hidden sm:inline">Inicjatywa</span>
              </button>
            )}

            {onUnclog && (
              <button
                type="button"
                onClick={onUnclog}
                className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 rounded-xl cursor-pointer transition-all duration-200 font-semibold text-xs active:scale-95 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                title="Odblokuj system i zsynchronizuj stan"
              >
                Odblokuj
              </button>
            )}

            <button
              type="button"
              onClick={onClearHistory}
              className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 rounded-xl cursor-pointer transition-all duration-200 font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.25)] active:scale-95"
              title="Wyczyść historię czatu"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Wyczyść</span>
            </button>
          </div>
        </div>

        {/* Collapsible Protocol & Mission Tools Drawer */}
        <div className="border-b border-slate-800/80 bg-slate-900/40 px-4 py-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowProtocolTools(!showProtocolTools)}
            className="flex w-full items-center justify-between text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Narzędzia Protokołu i Diagnostyki Astyrii
            </span>
            {showProtocolTools ? (
              <ChevronUp className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {showProtocolTools && (
            <div className="mt-3 space-y-3 pt-2 border-t border-slate-800/60 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-end gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <label className="flex min-w-48 flex-1 flex-col gap-1 text-[10px] font-semibold text-slate-400">
                  Polecenie strukturalne protokołu:
                  <select
                    aria-label="Polecenie strukturalne"
                    value={selectedCommand}
                    onChange={(e) => setSelectedCommand(e.target.value as AgentProtocolCommand)}
                    disabled={isLoading}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                  >
                    {AGENT_PROTOCOL_COMMANDS.map((command) => (
                      <option key={command} value={command}>
                        {AGENT_PROTOCOL_LABELS[command]}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedCommand === 'SIGNAL_ANALYSIS' && (
                  <>
                    <label className="flex min-w-36 flex-1 flex-col gap-1 text-[10px] text-slate-400">
                      Sygnałwejściowy:
                      <input
                        aria-label="Sygnał do analizy"
                        value={signal}
                        onChange={(e) => setSignal(e.target.value)}
                        maxLength={256}
                        placeholder="np. sin(2*pi*f*t)"
                        disabled={isLoading}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                    </label>
                    <label className="flex w-20 flex-col gap-1 text-[10px] text-slate-400">
                      ω (Hz):
                      <input
                        aria-label="Częstotliwość omega"
                        type="number"
                        value={omega}
                        onChange={(e) => setOmega(e.target.value)}
                        placeholder="880"
                        disabled={isLoading}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                    </label>
                    <label className="flex w-20 flex-col gap-1 text-[10px] text-slate-400">
                      Czas t:
                      <input
                        aria-label="Czas analizy"
                        type="number"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        placeholder="1.0"
                        disabled={isLoading}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      />
                    </label>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => void handleSendProtocol()}
                  disabled={isLoading || (selectedCommand === 'SIGNAL_ANALYSIS' && !signal.trim())}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/80 hover:bg-cyan-900 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition disabled:opacity-40 cursor-pointer shadow-md"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Wykonaj protokół
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-2 bg-cyan-950/30 p-3 rounded-xl border border-cyan-900/50">
                <label className="flex min-w-56 flex-1 flex-col gap-1 text-[10px] text-cyan-200/80">
                  Diagnostyka systemowa Astyrii:
                  <select
                    aria-label="Misja dla Astyrii"
                    value={selectedMissionAction}
                    onChange={(e) => setSelectedMissionAction(e.target.value as AstyriaMissionAction)}
                    disabled={isLoading}
                    className="rounded-lg border border-cyan-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
                  >
                    {ASTYRIA_MISSION_ACTIONS.filter((action) =>
                      ['deep_scan', 'vm_firewall_audit'].includes(action)
                    ).map((action) => (
                      <option key={action} value={action}>
                        {ASTYRIA_MISSION_LABELS[action]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void handleRunAstyriaMission()}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-900/60 hover:bg-cyan-800/80 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition disabled:opacity-40 cursor-pointer shadow-md"
                >
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  Uruchom badanie Astyrii
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Stream Display */}
        <div
          ref={chatScrollRef}
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            followLatestMessagesRef.current = scrollHeight - scrollTop - clientHeight < 120;
          }}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin"
        >
          {sendError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-500/50 bg-rose-950/60 p-4 text-xs text-rose-200 shadow-lg backdrop-blur-xl flex items-center gap-3 animate-in fade-in"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-900/80 border border-rose-500/40 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-rose-300" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-rose-100">Błąd transmisji czatu</h4>
                <p className="text-rose-300/90 leading-relaxed mt-0.5">{sendError}</p>
              </div>
            </div>
          )}

          {dataStore.chat_history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                <Bot className="w-8 h-8 text-cyan-400" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-slate-100">System Czatowy Agentów AI</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Rozpocznij konwersację z Triadą (Alex, Astyria, Aurelius, Aria) lub wybierz konkretnego agenta. Czat wykonuje polecenia autonomiczne, analizuje pliki i kod.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMessageText(prompt.text)}
                    className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-cyan-500/50 hover:bg-slate-800 text-xs text-cyan-300 transition active:scale-95 shadow-sm"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            dataStore.chat_history.map((msg, idx) => {
              const agentKey = msg.agent === OPERATOR_NAME ? 'Operator' : msg.agent;
              const profile: AgentProfile | undefined = SYSTEM_AGENTS[agentKey] || SYSTEM_AGENTS[msg.agent];
              const isOperator = msg.agent === OPERATOR_NAME || msg.agent === 'Operator';

              return (
                <div
                  key={idx}
                  className={`group relative flex flex-col p-4 sm:p-5 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
                    isOperator
                      ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-slate-950/90 border-purple-500/40 ml-2 sm:ml-8 lg:ml-16 shadow-[0_4px_20px_rgba(168,85,247,0.1)] hover:border-purple-500/60'
                      : profile
                      ? `${profile.borderColor} bg-slate-900/85 mr-2 sm:mr-8 lg:mr-16 shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:border-cyan-500/50`
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/70">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-md ${
                          isOperator
                            ? 'bg-purple-900/80 text-purple-200 border border-purple-500/50'
                            : profile
                            ? profile.badgeBg
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {isOperator ? 'O' : msg.agent.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-100 tracking-wide">
                          {msg.agent}
                        </span>
                        {profile?.role && (
                          <span className="text-[10px] text-slate-400 block font-normal -mt-0.5">
                            {profile.role}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.tekst, idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                        title="Kopiuj zawartość wiadomości"
                      >
                        {copiedIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Skopiowano</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopiuj</span>
                          </>
                        )}
                      </button>

                      <span className="text-[10px] font-mono text-slate-500">
                        #{String(idx + 1).padStart(3, '0')}
                      </span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <FormattedMessage
                    content={msg.tekst}
                    className="text-xs sm:text-sm leading-relaxed text-slate-200 selection:bg-cyan-500/30 font-sans"
                  />

                  {/* Attached File/Image display */}
                  {msg.file && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      {msg.file.dataUrl && msg.file.type?.startsWith('image/') ? (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-semibold text-emerald-400 font-mono flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Załącznik wizualny: {msg.file.name}
                          </span>
                          <img
                            src={msg.file.dataUrl}
                            alt={msg.file.name}
                            className="max-h-72 rounded-xl border border-slate-700/80 object-contain bg-black/60 cursor-pointer hover:border-cyan-400 transition shadow-lg"
                            onClick={() => window.open(msg.file?.dataUrl, '_blank')}
                            title="Kliknij, aby powiększyć plik"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="flex-1 truncate">
                            <span className="font-semibold text-slate-200">{msg.file.name}</span>
                            <span className="text-slate-500 ml-2">({msg.file.type || 'dokument'})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 text-slate-200 shadow-xl backdrop-blur-xl animate-pulse">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-semibold text-cyan-200">
                  Agenci AI (Alex, Astyria, Aurelius, Aria) przetwarzają odpowiedź...
                </span>
              </div>
              {onForceSync && (
                <button
                  type="button"
                  onClick={onForceSync}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Odśwież state
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-950/70 overflow-x-auto flex items-center gap-2 scrollbar-none shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <TerminalIcon className="w-3 h-3 text-cyan-400" />
            Szablony:
          </span>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMessageText(prompt.text)}
              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/90 hover:border-cyan-500/40 hover:bg-slate-800 text-[11px] font-medium text-slate-300 transition whitespace-nowrap shrink-0 active:scale-95"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Modern Capsule Input Card */}
        <form
          onSubmit={(e) => void handleSendMessage(e)}
          className="relative w-full shrink-0 p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-2xl"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"
          />

          {/* Attached Files Pill Preview List */}
          {chatAttachments.length > 0 && (
            <ul aria-label="Załączone pliki" className="mb-2.5 flex flex-wrap gap-2">
              {chatAttachments.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/80 px-3 py-1.5 text-xs text-cyan-100 backdrop-blur-md shadow-md"
                >
                  <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium truncate max-w-[180px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setChatAttachments((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index)
                      )
                    }
                    className="ml-1 text-slate-400 hover:text-rose-300 transition p-0.5 rounded-full hover:bg-rose-950/60"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {attachmentError && (
            <div role="alert" className="mb-2 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-xl">
              {attachmentError}
            </div>
          )}

          {/* Main Input Capsule */}
          <div className="group relative flex flex-col w-full rounded-2xl border border-slate-700/70 bg-slate-900/90 shadow-[0_8px_32px_rgba(0,0,0,0.5)] focus-within:border-cyan-500/80 focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.2)] transition-all duration-300 p-2 sm:p-2.5">
            <div className="relative flex w-full items-center">
              <textarea
                id="triad-chat-message"
                aria-label="Wiadomość do czatu AI agentów"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((messageText.trim() || chatAttachments.length > 0) && !isLoading) {
                      void handleSendMessage(e as any);
                    }
                  }
                }}
                maxLength={20_500}
                rows={2}
                disabled={isLoading}
                placeholder={`Napisz wiadomość do ${{ triad: 'Triady (Wszystkich Agentów)', si_1: 'Arii', Alex: 'Alexa', Astyria: 'Astyrii', Aurelius: 'Aureliusa' }[selectedTarget]}...`}
                className="w-full resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-100 outline-none placeholder:text-slate-500 leading-relaxed disabled:opacity-50"
              />
              {messageText && !isLoading && (
                <button
                  type="button"
                  onClick={() => setMessageText('')}
                  className="absolute right-2 top-2 h-6 w-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition"
                  title="Wyczyść tekst"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Bottom Input Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-slate-800/60 px-1">
              <div className="flex items-center gap-2">
                <label
                  className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/70 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800 transition shadow-sm active:scale-95 ${
                    isLoading || chatAttachments.length >= MAX_CHAT_ATTACHMENTS
                      ? 'pointer-events-none opacity-40'
                      : ''
                  }`}
                  title="Dołącz pliki (DOCX, PDF, JPG, TXT)"
                >
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    accept={CHAT_ATTACHMENT_ACCEPT}
                    multiple
                    disabled={isLoading || chatAttachments.length >= MAX_CHAT_ATTACHMENTS}
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = '';
                      void handleAttachmentSelection(files);
                    }}
                    className="sr-only"
                  />
                </label>

                {chatAttachments.length > 0 && (
                  <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/70 px-2.5 py-1 rounded-xl border border-cyan-500/30">
                    {chatAttachments.length} / {MAX_CHAT_ATTACHMENTS} plików
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-[10px] text-slate-500 font-mono">
                  {messageText.length} / 20500
                </span>

                <button
                  type="submit"
                  disabled={(!messageText.trim() && chatAttachments.length === 0) || isLoading}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:shadow-[0_0_24px_rgba(6,182,212,0.5)] active:scale-95 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                >
                  <span>WYŚLIJ</span>
                  <Send className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2 px-1 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Maksymalnie 10 plików (tekst 5MB, PDF/DOCX/JPG 20MB) · Możesz przeciągnąć pliki tutaj</span>
            <span className="hidden sm:inline">Shift+Enter dla nowej linii</span>
          </div>
        </form>
      </div>

      {/* Right Side: Active AI Agent Dossier & Telemetry Panel */}
      <div
        className={`${
          mobileSection === 'agents' ? 'flex' : 'hidden'
        } min-h-0 w-full flex-col overflow-y-auto border-t border-slate-800/80 bg-[#050b14]/95 p-4 backdrop-blur-2xl space-y-4 scrollbar-thin sm:p-5 lg:flex lg:w-88 lg:border-t-0`}
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wider text-xs">
              AGENT WIRTUALNY ROJ
            </span>
          </div>
          <span
            className={`shrink-0 text-[10px] font-mono flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
              transmissionStatus.color === 'rose'
                ? 'text-rose-300 bg-rose-950/80 border-rose-500/40'
                : transmissionStatus.color === 'cyan'
                ? 'text-cyan-300 bg-cyan-950/80 border-cyan-500/40'
                : 'text-emerald-300 bg-emerald-950/80 border-emerald-500/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                transmissionStatus.color === 'rose'
                  ? 'bg-rose-400'
                  : transmissionStatus.color === 'cyan'
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            {transmissionStatus.label}
          </span>
        </div>

        {/* Agent Profiles List */}
        {(['Alex', 'Astyria', 'Aurelius', 'si_1'] as const).map((agentKey) => {
          const profile = SYSTEM_AGENTS[agentKey];
          return (
            <div
              key={agentKey}
              onClick={() => setSelectedTarget(agentKey)}
              className={`p-4 rounded-2xl border ${profile.borderColor} bg-slate-900/60 hover:bg-slate-900/90 transition-all duration-200 space-y-2 shadow-lg group cursor-pointer ${
                selectedTarget === agentKey ? 'ring-2 ring-cyan-400/80 bg-slate-900/95' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      profile.badgeBg.includes('emerald')
                        ? 'bg-emerald-400'
                        : profile.badgeBg.includes('cyan')
                        ? 'bg-cyan-400'
                        : profile.badgeBg.includes('rose')
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    } shadow-[0_0_10px_currentColor]`}
                  />
                  <div>
                    <span className={`font-bold ${profile.textColor} text-sm tracking-wide`}>
                      {profile.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-normal">
                      {profile.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTarget(agentKey);
                  }}
                  className="px-2 py-0.5 rounded-lg border border-slate-700 bg-slate-800 text-[10px] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition"
                >
                  Adresuj
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
                <span>Model: Dolphin 8B</span>
                <span className="text-emerald-400 font-semibold">RING-0 ROOT</span>
              </div>
            </div>
          );
        })}

        {/* Operator Profile */}
        <div className="p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-slate-900/70 to-slate-950/80 backdrop-blur-xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_10px_#c084fc]" />
              <span className="font-bold text-purple-200 text-sm tracking-wide">
                {OPERATOR_NAME}
              </span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-900/80 text-purple-200 border border-purple-500/50 font-bold font-mono">
              OPERATOR / TWÓRCA
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
            Pełna autoryzacja jądra SVL w Ring-0 oraz wyłączna piecza nad autoryzacją Triady agentów.
          </p>
        </div>
      </div>
    </div>
  );
};
