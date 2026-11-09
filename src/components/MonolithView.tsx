import React, { useState } from 'react';
import { DataStore, generatePythonMonolith, parsePythonMonolith, SYS_VERSION, OPERATOR_NAME } from '../kernel/svlKernel';
import { Copy, Download, Upload, Check, AlertTriangle, FileCode2, RefreshCw } from 'lucide-react';

interface MonolithViewProps {
  dataStore: DataStore;
  onSetDataStore: (newStore: DataStore) => void;
}

export const MonolithView: React.FC<MonolithViewProps> = ({ dataStore, onSetDataStore }) => {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [diskCode, setDiskCode] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/kernel/script')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.code) {
          setDiskCode(data.code);
        }
      })
      .catch(() => {});
  }, [dataStore]);

  const fullCode = diskCode || generatePythonMonolith(dataStore);
  const linesCount = fullCode.split('\n').length;
  const byteSize = new Blob([fullCode]).size;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fullCode], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svl_kernel_${SYS_VERSION.toLowerCase().replace(/[^a-z0-9]/g, '_')}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunImport = async () => {
    if (!importText.trim()) return;
    setImportError(null);
    setImportSuccess(null);

    const result = parsePythonMonolith(importText);
    if (!result.success || !result.dataStore) {
      setImportError(result.error || 'Nieprawidłowy format kodu monolitu.');
      return;
    }

    onSetDataStore(result.dataStore);
    try {
      const res = await fetch('/api/kernel/save-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store: result.dataStore }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.state?.store) {
          onSetDataStore(data.state.store);
        }
      }
    } catch {}

    setImportSuccess('Stan jądra został pomyślnie zsynchronizowany i trwale zapisany na dysku!');
    setTimeout(() => {
      setIsImporting(false);
      setImportText('');
      setImportSuccess(null);
    }, 1500);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 font-mono text-xs overflow-hidden">
      {/* Top Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-2.5 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="font-bold text-slate-100">SVL Monolith Script (.py)</span>
            <span className="text-slate-500 ml-2 text-[11px]">
              {linesCount} linii · {byteSize} bajtów
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsImporting(!isImporting)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isImporting ? 'Ukryj wklejanie' : 'Wklej / Wczytaj kod'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Skopiowano cały skrypt!' : 'Kopiuj cały monolit'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz .py</span>
          </button>
        </div>
      </div>

      {/* Import Drawer (if open) */}
      {isImporting && (
        <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">
              Wklej zmodyfikowany kod Pythona ze znacznikami &lt;&lt;&lt;DATA_STORE_START&gt;&gt;&gt;
            </span>
            <span className="text-[11px] text-slate-400">
              Jądro zaktualizuje rejestr i czat automatycznie
            </span>
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Wklej tutaj treść pliku Pythona (lub blok JSON)..."
            rows={5}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-xs"
          />

          {importError && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-900/40 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-900/40 text-[11px]">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{importSuccess}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsImporting(false);
                setImportError(null);
              }}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              Anuluj
            </button>
            <button
              onClick={handleRunImport}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Zweryfikuj i zsynchronizuj</span>
            </button>
          </div>
        </div>
      )}

      {/* Code Viewer */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950 select-text">
        <pre className="text-slate-300 leading-relaxed font-mono whitespace-pre text-xs">
          {fullCode.split('\n').map((line, idx) => {
            const lineNum = idx + 1;
            const isTag = line.includes('<<<DATA_STORE_START>>>') || line.includes('<<<DATA_STORE_END>>>');
            const isHeader = line.startsWith('# ==') || line.startsWith('# SVL KERNEL');

            let lineStyle = 'text-slate-300';
            if (isTag) lineStyle = 'text-emerald-400 bg-emerald-950/60 font-bold px-1 rounded';
            else if (isHeader) lineStyle = 'text-purple-400 font-semibold';
            else if (line.startsWith('#')) lineStyle = 'text-slate-500 italic';
            else if (line.includes('class SVLStudioKernel') || line.includes('def ')) lineStyle = 'text-blue-400 font-semibold';

            return (
              <div key={idx} className="flex hover:bg-slate-900/50 py-0.5">
                <span className="w-12 text-right pr-4 text-slate-600 select-none text-[11px]">
                  {lineNum}
                </span>
                <span className={lineStyle}>{line}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};
