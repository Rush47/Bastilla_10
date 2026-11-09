import React, { useState } from 'react';
import { DataStore, generateTextReport, SYS_VERSION, OPERATOR_NAME } from '../kernel/svlKernel';
import { X, Copy, Check, Terminal } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataStore: DataStore;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, dataStore }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const reportText = generateTextReport(dataStore);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Raport systemu" className="bg-slate-950 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[88dvh] flex flex-col font-mono text-xs shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-100 text-xs sm:text-sm truncate">
              Raport Tekstowy SVL (ASCII Monolith)
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij raport"
            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-950 select-text">
          <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed font-mono text-[11px] sm:text-xs">
            {reportText}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900 border-t border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] sm:text-[11px] text-slate-500">
            Zgodne z jądrem SVLStudioKernel.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition cursor-pointer touch-manipulation text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Skopiowano!' : 'Kopiuj raport'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

