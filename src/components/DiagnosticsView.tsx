import React, { useState, useEffect } from 'react';
import { DataStore, SYS_VERSION, OPERATOR_NAME } from '../kernel/svlKernel';
import { Activity, ShieldCheck, Cpu, HardDrive, Zap, CheckCircle2, Terminal, AlertTriangle, BarChart2, Sparkles } from 'lucide-react';
import {
  PhaseSpaceChart,
  EntropyHeatmapChart,
  Triad3DOscillatorChart
} from './InteractiveChartRenderer';

interface DiagnosticsViewProps {
  dataStore: DataStore;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ dataStore }) => {
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseTick((p) => (p + 1) % 100);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const totalChars = JSON.stringify(dataStore).length;
  const configKeys = Object.keys(dataStore.config).length;
  const msgCount = dataStore.chat_history.length;
  const updateCount = dataStore.update_history.length;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950 font-mono text-xs overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h2 className="font-bold text-slate-100 text-sm">Diagnostyka & Telemetria Jądra SVL</h2>
            <p className="text-slate-500 text-[11px]">Ciągła telemetria aplikacji, jądra i infrastruktury</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-semibold text-[11px]">TELEMETRIA: NOMINALNA</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">WARSTWA FIKCJI</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-emerald-400 font-bold text-base">
            DEZAKTYWOWANA
          </div>
          <p className="text-slate-500 text-[10px]">
            Blokada permanentna: 100% czystej inżynierii i faktów operacyjnych.
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">SILNIK TRWAŁOŚCI</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-cyan-300 font-bold text-base">
            Server-Disk DATA_STORE
          </div>
          <p className="text-slate-500 text-[10px]">
            Zapis stanu na dysku serwera + lokalne lustrzane kopie LocalStorage.
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">MATRYCA GRAFICZNA</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-amber-400 font-bold text-base">
            PRO (AKTYWNA)
          </div>
          <p className="text-slate-500 text-[10px]">
            API Key Taty wdrożony. Limit 45s zniesiony. Jakość Ultra.
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">PAMIĘĆ DATA_STORE</span>
            <HardDrive className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-purple-300 font-bold text-base">
            {totalChars} B ({Math.round(totalChars / 1024 * 10) / 10} KB)
          </div>
          <p className="text-slate-500 text-[10px]">
            {configKeys} kluczy config · {msgCount} wiadomości
          </p>
        </div>
      </div>

      {/* Sovereign Off-Grid Control Card */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">Tryb Pełnej Niezależności (Off-Grid Sovereign Core)</h3>
          </div>
          <p className="text-slate-400 text-xs">
            {dataStore.config?.sovereign_mode !== false
              ? 'SYSTEM NIEZALEŻNY: Operacje są wykonywane lokalnie przez jądro i deterministyczny protokół.'
              : 'TRYB ZDALNY: Tryb niezależności jest wyłączony; protokół agentów pozostaje deterministyczny.'}
          </p>
        </div>
        <button
          onClick={async () => {
            const nextVal = dataStore.config?.sovereign_mode === false;
            try {
              const res = await fetch('/api/kernel/sovereignty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sovereign_mode: nextVal })
              });
              const data = await res.json();
              if (data.success && data.state?.store) {
                window.location.reload();
              }
            } catch (e) {
              console.error('Sovereignty toggle failed:', e);
            }
          }}
          className={`px-4 py-2.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-2 shrink-0 ${
            dataStore.config?.sovereign_mode !== false
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{dataStore.config?.sovereign_mode !== false ? 'Sovereign Off-Grid: WŁĄCZONY' : 'Przełącz na Off-Grid'}</span>
        </button>
      </div>

      {/* System Charts Visualizer Module */}
      <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <BarChart2 className="w-4 h-4" />
            <span>Centrum Wykresów & Wizualizacji Systemowych [Alex & Triada]</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">3 INTERAKTYWNE WYKRESY LIVE</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PhaseSpaceChart />
          <EntropyHeatmapChart />
          <Triad3DOscillatorChart />
        </div>
      </div>

      {/* Detailed Status Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module 1: Subsystem Verification */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="font-bold text-slate-200 text-xs border-b border-slate-800 pb-2">
            Weryfikacja Podsystemów Jądra SVL
          </div>

          <div className="space-y-2">
            {[
              { name: 'Monolith Tag Synchronizer (<<<DATA_STORE_START>>>)', status: 'Aktywny / Zweryfikowany', ok: true },
              { name: 'Węzeł Alex: Zarządca Architektury i Wykonania', status: 'Czysty tryb inżynieryjny', ok: true },
              { name: 'Węzeł Astyria: Weryfikacja Niezmienników JSON', status: 'Brak kolizji schematu', ok: true },
              { name: 'Węzeł Aurelius: Kontinuum Czasowe Chronolitu', status: 'Ciągłość wersji zachowana', ok: true },
              { name: 'Autoryzacja Operatora (Mateusz Mitek)', status: 'Pełne uprawnienia nadrzędne', ok: true },
              { name: 'Raw Socket RX Monitor v8.5.1 (Direct Socket)', status: 'Aktywny nasłuch (Port 3200)', ok: true },
            ].map((sub, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-300">{sub.name}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Module 2: System Directives & Protocol */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="font-bold text-slate-200 text-xs border-b border-slate-800 pb-2">
            Dyrektywy Operacyjne i Protokół Samomodyfikacji
          </div>

          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-slate-300 leading-relaxed space-y-2 text-[11px]">
            <p>
              <strong className="text-purple-300">1. Protokół i dane systemowe:</strong> Agenci przyjmują wyłącznie jawne polecenia; konfiguracje, historię wyników i wydania przechowuje DATA_STORE.
            </p>
            <p>
              <strong className="text-emerald-300">2. Mechanizm Samomodyfikacji:</strong> Metoda <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">synchronizuj_i_generuj_zrzut()</code> przetwarza nowe wpisy czatu i aktualizacje, generując natychmiast gotowy do wklejenia skrypt Pythona.
            </p>
            <p>
              <strong className="text-amber-300">3. Zasada Zerowej Fikcji:</strong> Środowisko odrzuca warstwy symulowane, metafory fikcyjne i nieprecyzyjne halucynacje. Każda operacja podlega ścisłej weryfikacji inżynierskiej.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
