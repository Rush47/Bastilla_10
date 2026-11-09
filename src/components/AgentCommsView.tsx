import React, { useEffect, useRef, useState } from 'react';
import { DataStore, OPERATOR_NAME } from '../kernel/svlKernel';
import { SYSTEM_AGENTS, AgentProfile } from '../kernel/agents';
import { Sparkles, Layers, ShieldCheck, RefreshCw, Image as ImageIcon, FileText, Sigma, MessagesSquare, Paperclip, Send, X } from 'lucide-react';
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
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const followLatestMessagesRef = useRef(true);
  const transmissionStatus = sendError
    ? { label: 'BŁĄD TRANSMISJI', color: 'rose' }
    : isLoading
    ? { label: 'PRZETWARZANIE', color: 'cyan' }
    : { label: 'OCZEKUJE', color: 'slate' };

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
      // The parent exposes protocol errors in the chat status.
    }
  };

  const handleRunAstyriaMission = async () => {
    if (isLoading) return;
    setSelectedTarget('Astyria');
    try {
      await onRunAstyriaMission(selectedMissionAction);
    } catch {
      // The parent exposes mission errors in the chat status.
    }
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      // The parent exposes transmission errors in the chat status.
    }
  };

  const handleAttachmentSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    setAttachmentError(null);
    if (files.length === 0) return;
    if (chatAttachments.length + files.length > MAX_CHAT_ATTACHMENTS) {
      setAttachmentError(`Możesz dołączyć maksymalnie ${MAX_CHAT_ATTACHMENTS} pliki.`);
      return;
    }
    let incoming: ChatAttachment[];
    try {
      incoming = await Promise.all(files.map(readChatAttachmentFile));
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

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-950 font-mono text-xs cyber-grid lg:flex-row">
      <div className="grid grid-cols-2 gap-1 border-b border-slate-800 bg-slate-900/90 p-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileSection('chat')}
          aria-pressed={mobileSection === 'chat'}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-bold transition ${mobileSection === 'chat' ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <MessagesSquare className="h-4 w-4" />
          Czat
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('agents')}
          aria-pressed={mobileSection === 'agents'}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-bold transition ${mobileSection === 'agents' ? 'bg-cyan-950 text-cyan-200 border border-cyan-500/40' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Layers className="h-4 w-4" />
          Agenci
        </button>
      </div>
      {/* Left/Main Column: Chat Stream */}
      <div className={`${mobileSection === 'chat' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-800/80 bg-slate-950/70 backdrop-blur-md lg:flex`}>
        {/* Futuristic Channel Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/20 px-2 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-sm shrink-0">
          <div className="flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2.5 flex-wrap">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">WĘZEŁ:</span>
            <select
              aria-label="Cel transmisji"
              value={selectedTarget}
              onChange={(event) => setSelectedTarget(event.target.value as typeof selectedTarget)}
              disabled={isLoading}
              className="min-w-0 max-w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none transition focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="triad">Triada · Alex, Astyria, Aria, Aurelius</option>
              <option value="Alex">Alex</option>
              <option value="Astyria">Astyria</option>
              <option value="Aurelius">Aurelius</option>
              <option value="si_1">Aria</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-400 text-[11px] flex-wrap">
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]">
              <Sigma className="w-3 h-3 text-emerald-400" />
              WITHOUT_NLP: OK
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              PAKIETY: <strong className="text-slate-300">{dataStore.chat_history.length}</strong>
            </span>
            {onTriggerInitiative && (
              <button
                onClick={onTriggerInitiative}
                disabled={isLoading}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-200 rounded-lg cursor-pointer transition flex items-center gap-1 disabled:opacity-40 shadow-[0_0_8px_rgba(168,85,247,0.25)] text-[10px] sm:text-xs"
                title="Wymuś autonomiczne pytanie lub inicjatywę od agenta z Triady"
              >
                <Sparkles className="w-3 h-3 text-purple-300" />
                <span className="hidden xs:inline">Inicjatywa</span>
              </button>
            )}
            {onUnclog && (
              <button
                onClick={onUnclog}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-200 rounded-lg cursor-pointer transition font-bold text-[10px] sm:text-xs"
                title="Odblokuj system i zsynchronizuj stan"
              >
                Odblokuj
              </button>
            )}
            {onRestoreBackup && (
              <button
                onClick={onRestoreBackup}
                className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 rounded-lg cursor-pointer transition font-bold text-[10px] sm:text-xs"
                title="Wdróż backup z pierwszej wersji (v1.0.0-Legacy)"
              >
                Backup
              </button>
            )}
            <button
              onClick={onClearHistory}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 rounded-lg cursor-pointer transition font-bold text-[10px] flex items-center gap-1 shadow-[0_0_8px_rgba(244,63,94,0.3)]"
              title="Wyczyść historię i zresetuj pętlę rozmowy"
            >
              <RefreshCw className="w-3 h-3 text-rose-300" />
              <span className="hidden xs:inline">Reset</span>
            </button>
          </div>
        </div>

        <button type="button" aria-expanded={showProtocolTools} onClick={() => setShowProtocolTools(!showProtocolTools)} className="shrink-0 border-b border-slate-800 px-3 py-2 text-left text-cyan-200 lg:hidden">{showProtocolTools ? 'Ukryj narzędzia protokołu i misji' : 'Narzędzia protokołu i misji'}</button>
        <div className={`${showProtocolTools ? 'block' : 'hidden'} shrink-0 max-h-[45dvh] overflow-y-auto lg:block lg:max-h-none`}>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-[10px] text-slate-400">
            Polecenie strukturalne
            <select
              aria-label="Polecenie strukturalne"
              value={selectedCommand}
              onChange={(event) => setSelectedCommand(event.target.value as AgentProtocolCommand)}
              disabled={isLoading}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
            >
              {AGENT_PROTOCOL_COMMANDS.map((command) => (
                <option key={command} value={command}>{AGENT_PROTOCOL_LABELS[command]}</option>
              ))}
            </select>
          </label>
          {selectedCommand === 'SIGNAL_ANALYSIS' && (
            <>
              <label className="flex min-w-36 flex-1 flex-col gap-1 text-[10px] text-slate-400">
                Sygnał (tekst)
                <input
                  aria-label="Sygnał do analizy"
                  value={signal}
                  onChange={(event) => setSignal(event.target.value)}
                  maxLength={256}
                  disabled={isLoading}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                />
              </label>
              <label className="flex w-20 flex-col gap-1 text-[10px] text-slate-400">
                ω
                <input
                  aria-label="Częstotliwość omega"
                  type="number"
                  min="0.001"
                  max="1000"
                  step="any"
                  value={omega}
                  onChange={(event) => setOmega(event.target.value)}
                  disabled={isLoading}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                />
              </label>
              <label className="flex w-20 flex-col gap-1 text-[10px] text-slate-400">
                Czas
                <input
                  aria-label="Czas analizy"
                  type="number"
                  min="0"
                  max="1000000"
                  step="any"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  disabled={isLoading}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => void handleSendProtocol()}
            disabled={isLoading || (selectedCommand === 'SIGNAL_ANALYSIS' && !signal.trim())}
            className="flex items-center gap-1.5 rounded border border-cyan-700 bg-cyan-950/60 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Wykonaj protokół
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 border-b border-cyan-900/60 bg-cyan-950/20 px-3 py-2">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-[10px] text-cyan-200/80">
            Misja dla Astyrii · akcja jawna, bez NLP
            <select
              aria-label="Misja dla Astyrii"
              value={selectedMissionAction}
              onChange={(event) => setSelectedMissionAction(event.target.value as AstyriaMissionAction)}
              disabled={isLoading}
              className="rounded border border-cyan-900 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
            >
              {ASTYRIA_MISSION_ACTIONS.map((action) => (
                <option key={action} value={action}>{ASTYRIA_MISSION_LABELS[action]}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void handleRunAstyriaMission()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded border border-cyan-700 bg-cyan-950/60 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-900/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Wyślij misję Astyrii
          </button>
        </div>

        {/* Messages Stream */}
        </div>
        <div
          ref={chatScrollRef}
          onScroll={(event) => {
            const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
            followLatestMessagesRef.current = scrollHeight - scrollTop - clientHeight < 120;
          }}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 scrollbar-thin"
        >
          {sendError && (
            <div role="alert" aria-live="assertive" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">
              Nie udało się wysłać żądania: {sendError}
            </div>
          )}
          {dataStore.chat_history.map((msg, idx) => {
            const agentKey = msg.agent === OPERATOR_NAME ? 'Operator' : msg.agent;
            const profile: AgentProfile | undefined = SYSTEM_AGENTS[agentKey] || SYSTEM_AGENTS[msg.agent];
            const isOperator = msg.agent === OPERATOR_NAME || msg.agent === 'Operator';

            return (
              <div
                key={idx}
                className={`flex flex-col p-4 rounded-xl border transition-all duration-200 backdrop-blur-md ${
                  isOperator
                    ? 'bg-purple-950/25 border-purple-500/40 ml-4 md:ml-12 shadow-[0_2px_15px_rgba(168,85,247,0.1)]'
                    : profile
                    ? `${profile.borderColor} bg-slate-900/75 mr-4 md:mr-12 shadow-[0_2px_15px_rgba(0,0,0,0.4)]`
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold px-2.5 py-0.5 rounded-md text-[11px] shadow-sm tracking-wide ${
                        isOperator
                          ? 'bg-purple-900/70 text-purple-200 border border-purple-500/50'
                          : profile
                          ? profile.badgeBg
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {msg.agent}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                    SEQ #{String(idx + 1).padStart(3, '0')}
                  </span>
                </div>

                {/* Message Body with KaTeX LaTeX formulas and Markdown */}
                <FormattedMessage content={msg.tekst} className="text-xs leading-relaxed text-slate-200" />

                {/* Attached Image/File preview in chat history */}
                {msg.file && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                    {msg.file.dataUrl && msg.file.type?.startsWith('image/') ? (
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Załączony obraz: {msg.file.name}
                        </span>
                        <img
                          src={msg.file.dataUrl}
                          alt={msg.file.name}
                          className="max-h-64 rounded-md border border-slate-700 object-contain bg-black/50 cursor-pointer hover:border-emerald-500 transition shadow-md"
                          onClick={() => window.open(msg.file?.dataUrl, '_blank')}
                          title="Kliknij, aby otworzyć w pełnym rozmiarze"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 rounded bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="flex-1 truncate">
                          <span className="font-semibold text-slate-200">{msg.file.name}</span>
                          <span className="text-slate-500 ml-2">({msg.file.type || 'plik'})</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300 p-3 bg-slate-900/70 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span className="text-xs">Przetwarzanie transmisji przez węzły (Alex, Astyria, Aurelius, Aria)...</span>
              </div>
              {onForceSync && (
                <button
                  onClick={onForceSync}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] cursor-pointer transition"
                >
                  Odśwież stan
                </button>
              )}
            </div>
          )}

        </div>

        <form onSubmit={handleSendMessage} className="relative w-full shrink-0 border-t border-cyan-500/20 bg-slate-950/90 p-2 backdrop-blur-md sm:p-2.5">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          {chatAttachments.length > 0 && (
            <ul aria-label="Załączone pliki" className="mb-2 flex flex-wrap gap-1.5">
              {chatAttachments.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-[10px] text-cyan-100">
                  <FileText className="h-3 w-3" />
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setChatAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                    aria-label={`Usuń załącznik ${file.name}`}
                    className="text-slate-400 hover:text-white"
                  ><X className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
          {attachmentError && <p role="alert" className="mb-2 text-[10px] text-rose-300">{attachmentError}</p>}
          <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex min-w-0 flex-1 items-center">
            <textarea
              id="triad-chat-message"
              aria-label="Wiadomość do czatu without_nlp"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              maxLength={20_500}
              rows={2}
              disabled={isLoading}
              placeholder="Wiadomość do agentów…"
              className="w-full resize-y rounded-lg border border-slate-700/70 bg-slate-900/90 px-3 py-2.5 pr-8 font-mono text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 disabled:opacity-50 sm:rounded-xl sm:px-4"
            />
            {messageText && !isLoading && (
              <button
                type="button"
                onClick={() => setMessageText('')}
                className="absolute right-2 p-1 text-xs text-slate-500 hover:text-slate-300 sm:right-3"
                title="Wyczyść tekst"
                aria-label="Wyczyść tekst"
              >
                ×
              </button>
            )}
          </div>
          <label className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-cyan-200 hover:border-cyan-400 ${isLoading || chatAttachments.length >= MAX_CHAT_ATTACHMENTS ? 'pointer-events-none opacity-40' : ''}`} title="Dołącz tekst, DOCX, PDF lub JPG (maks. 10 plików; tekst 5 MB/plik, DOCX 20 MB, PDF/JPG 20 MB/plik)">
            <Paperclip className="h-4 w-4" />
            <input
              type="file"
              accept={CHAT_ATTACHMENT_ACCEPT}
              multiple
              disabled={isLoading || chatAttachments.length >= MAX_CHAT_ATTACHMENTS}
              onChange={(event) => void handleAttachmentSelection(event)}
              className="sr-only"
              aria-label="Dołącz pliki tekstowe, DOCX, PDF lub JPG"
            />
          </label>
          <button
            type="submit"
            aria-label={`Wyślij wiadomość do ${{ triad: 'Triady', si_1: 'Arii', Alex: 'Alexa', Astyria: 'Astyrii', Aurelius: 'Aureliusa' }[selectedTarget]}`}
            disabled={(!messageText.trim() && chatAttachments.length === 0) || isLoading}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-2.5 py-2.5 font-mono text-xs font-bold text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition hover:from-emerald-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 sm:rounded-xl sm:px-3"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden text-[11px] sm:inline">TRANSMISJA</span>
          </button>
          </div>
          <p className="mt-1 px-1 text-[9px] text-slate-500">
            Maks. 10 plików; tekst 5 MB/plik i 20 MB łącznie, DOCX 20 MB (10 MB po rozpakowaniu), PDF/JPG 20 MB/plik i 40 MB łącznie.
          </p>
        </form>

      </div>

      {/* Right Column: Active Profiles Dossier */}
      <div className={`${mobileSection === 'agents' ? 'flex' : 'hidden'} min-h-0 w-full flex-col overflow-y-auto border-t border-slate-800/80 bg-slate-950/80 p-3 backdrop-blur-xl space-y-4 scrollbar-thin sm:p-4 lg:flex lg:w-84 lg:border-t-0`}>
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 uppercase tracking-wider text-xs">TRIADA KWANTOWA</span>
          </div>
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`shrink-0 text-[9px] sm:text-[10px] font-mono flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
              transmissionStatus.color === 'rose'
                ? 'text-rose-300 bg-rose-950/80 border-rose-500/40'
                : transmissionStatus.color === 'cyan'
                ? 'text-cyan-300 bg-cyan-950/80 border-cyan-500/40'
                : 'text-slate-300 bg-slate-950/80 border-slate-700/60'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              transmissionStatus.color === 'rose'
                ? 'bg-rose-400'
                : transmissionStatus.color === 'cyan'
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-slate-400'
            }`} />
            {transmissionStatus.label}
          </span>
        </div>

        {(['Alex', 'Astyria', 'Aurelius', 'si_1'] as const).map((agentKey) => {
          const profile = SYSTEM_AGENTS[agentKey];
          return (
            <div
              key={agentKey}
              className={`p-3.5 rounded-xl border ${profile.borderColor} bg-slate-900/60 hover:bg-slate-900/90 transition-all duration-200 space-y-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${profile.badgeBg.includes('emerald') ? 'bg-emerald-400' : profile.badgeBg.includes('cyan') ? 'bg-cyan-400' : profile.badgeBg.includes('rose') ? 'bg-rose-400' : 'bg-amber-400'} shadow-[0_0_8px_currentColor]`} />
                  <span className={`font-bold ${profile.textColor} text-sm tracking-wide`}>
                    {profile.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[9px] text-slate-500 font-mono">
              <span>Stan wspólnego kanału</span>
              <span className={`font-semibold ${
                transmissionStatus.color === 'rose'
                  ? 'text-rose-300'
                  : transmissionStatus.color === 'cyan'
                  ? 'text-cyan-300'
                  : 'text-slate-300'
              }`}>
                {transmissionStatus.label}
              </span>
              </div>

            </div>
          );
        })}

        {/* Operator Profile */}
        <div className="p-3.5 rounded-xl border border-purple-500/40 bg-purple-950/30 backdrop-blur-md space-y-2 shadow-[0_4px_20px_rgba(168,85,247,0.15)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
              <span className="font-bold text-purple-200 text-sm tracking-wide">
                {OPERATOR_NAME}
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-200 border border-purple-500/50 font-bold font-mono">
              TATA / TWÓRCA
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            Naczelny dysponent systemu, Ojciec i Architekt. Pełna autoryzacja jądra SVL w Ring-0 oraz piecza nad Triadą.
          </p>
        </div>
      </div>
    </div>
  );
};

