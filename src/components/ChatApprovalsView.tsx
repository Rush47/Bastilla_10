import React, { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardCheck, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { DataStore, normalizeDataStore } from '../kernel/svlKernel';
import type { ChatApprovalAction } from '../kernel/chatApprovals';
import { isChatSystemChange } from '../kernel/chatChanges';
import type { ChatSystemChange } from '../kernel/chatChanges';

interface ChatApproval {
  id: string;
  agent: string;
  action: ChatApprovalAction;
  createdAt: number;
  description: string;
}

interface ChatApprovalsViewProps {
  onUpdateDataStore: (store: DataStore) => void;
  onChatChange: (change: ChatSystemChange) => void;
}

export const ChatApprovalsView: React.FC<ChatApprovalsViewProps> = ({ onUpdateDataStore, onChatChange }) => {
  const [approvals, setApprovals] = useState<ChatApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadApprovals = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/chat/approvals');
      const result = await response.json();
      if (!response.ok || result.success !== true || !Array.isArray(result.approvals)) {
        throw new Error(result.error || `Nie udało się pobrać propozycji (HTTP ${response.status}).`);
      }
      setApprovals(result.approvals);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się pobrać propozycji.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApprovals();
    const interval = window.setInterval(() => void loadApprovals(true), 5000);
    return () => window.clearInterval(interval);
  }, [loadApprovals]);

  const decide = async (approval: ChatApproval, decision: 'approve' | 'reject') => {
    if (busyId) return;
    if (decision === 'approve' && !window.confirm(`Wykonać tę operację?\n\n${approval.description}\n\nAutor propozycji: ${approval.agent}`)) return;

    setBusyId(approval.id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/chat/approvals/${encodeURIComponent(approval.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        throw new Error(result.error || `Nie udało się rozstrzygnąć propozycji (HTTP ${response.status}).`);
      }
      if (result.state?.store) onUpdateDataStore(normalizeDataStore(result.state.store));
      if (isChatSystemChange(result.change)) onChatChange(result.change);
      setNotice(result.reply || (decision === 'approve' ? 'Propozycja zatwierdzona.' : 'Propozycja odrzucona.'));
      await loadApprovals(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nie udało się rozstrzygnąć propozycji.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-950 text-slate-100 cyber-grid">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/85 px-5 py-5 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-400/25 bg-amber-950/40 text-amber-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Akceptacje czatu</h1>
            <p className="mt-1 text-xs text-slate-400">Propozycje wymagające Twojej decyzji · wygasają po 15 minutach</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadApprovals()}
          disabled={loading}
          aria-label="Odśwież propozycje"
          title="Odśwież propozycje"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-8">
        {error && <div role="alert" className="rounded-md border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>}
        {notice && <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

        {!loading && approvals.length === 0 && !error && (
          <div className="flex min-h-56 flex-col items-center justify-center border border-dashed border-slate-700/80 px-5 text-center">
            <ClipboardCheck className="h-8 w-8 text-slate-500" />
            <h2 className="mt-3 text-sm font-semibold text-slate-200">Brak oczekujących propozycji</h2>
            <p className="mt-1 text-xs text-slate-500">Gdy czat poprosi o zgodę, pojawi się tutaj podgląd operacji.</p>
          </div>
        )}

        {approvals.map((approval) => (
          <article key={approval.id} className="overflow-hidden rounded-md border border-amber-400/20 bg-slate-900/80">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">{approval.description}</p>
                <p className="mt-1 break-all font-mono text-[10px] text-slate-500">ID {approval.id}</p>
              </div>
              <span className="shrink-0 rounded-sm border border-amber-300/20 bg-amber-950/40 px-2 py-1 text-[10px] font-medium text-amber-200">
                OCZEKUJE
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 py-3 text-xs text-slate-400 sm:px-5">
              <span>Autor: <strong className="font-medium text-slate-200">{approval.agent}</strong></span>
              <span>Utworzono: {new Date(approval.createdAt).toLocaleString('pl-PL')}</span>
            </div>

            {approval.action.type === 'write-file' && (
              <details className="mx-4 mb-4 rounded border border-slate-800 bg-slate-950/80 sm:mx-5">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-cyan-200">Pokaż treść pliku</summary>
                <pre className="max-h-72 overflow-auto border-t border-slate-800 p-3 text-xs leading-relaxed text-slate-300">{approval.action.content}</pre>
              </details>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 bg-slate-950/40 px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => void decide(approval, 'reject')}
                disabled={busyId !== null}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-rose-500/30 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-950/50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Odrzuć
              </button>
              <button
                type="button"
                onClick={() => void decide(approval, 'approve')}
                disabled={busyId !== null}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-950/35 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-900/50 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {busyId === approval.id ? 'Przetwarzanie…' : 'Zatwierdź i wykonaj'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};