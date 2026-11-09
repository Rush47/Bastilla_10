import React, { useEffect, useState } from 'react';

type Metrics = {
  cpuPercent: number | null;
  cpuCores: number;
  ramTotalBytes: number;
  ramUsedBytes: number;
  timestamp: number;
  scope: 'server-host';
};

const formatGiB = (bytes: number) => (bytes / 1024 ** 3).toFixed(1);
const clamp = (value: number) => Math.max(0, Math.min(100, value));

function Meter({ label, value, description }: { label: string; value: number | null; description: string }) {
  const percent = value === null ? null : clamp(value);
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-cyan-800/40 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">{label}</span>
        <span className="font-mono text-lg font-bold text-cyan-300">{percent === null ? '—' : `${percent.toFixed(1)}%`}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent ?? undefined} className="h-2 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-700" style={{ width: `${percent ?? 0}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </div>
  );
}

export function SystemResourceMeters() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    const poll = async () => {
      if (disposed || document.hidden || controller) return;
      const current = new AbortController();
      controller = current;
      try {
        const response = await fetch('/api/system/metrics', { cache: 'no-store', signal: current.signal });
        if (!response.ok) throw new Error('Metrics unavailable');
        const value: Metrics = await response.json();
        if (!disposed) { setMetrics(value); setError(false); setLastUpdate(Date.now()); }
      } catch {
        if (!disposed && !current.signal.aborted) setError(true);
      } finally {
        if (controller === current) controller = null;
      }
    };
    void poll();
    const timer = setInterval(() => { void poll(); }, 1000);
    const visible = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  const ramPercent = metrics?.ramTotalBytes
    ? (metrics.ramUsedBytes / metrics.ramTotalBytes) * 100
    : null;
  return (
    <section aria-label="Wykorzystanie zasobów serwera BastillaOS" className="space-y-2 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-cyan-100">Zasoby systemu · LIVE</h2>
        <span className="text-xs text-slate-400">{error ? 'Brak połączenia' : metrics ? 'Odświeżanie co 1 s' : 'Łączenie…'}</span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Meter label="CPU" value={error ? null : metrics?.cpuPercent ?? null} description={metrics ? `${metrics.cpuCores} rdzeni logicznych` : 'Oczekiwanie na dane'} />
        <Meter label="RAM" value={error ? null : ramPercent} description={metrics ? `${formatGiB(metrics.ramUsedBytes)} / ${formatGiB(metrics.ramTotalBytes)} GiB` : 'Oczekiwanie na dane'} />
      </div>
      {lastUpdate && <p className="text-[11px] text-slate-400">Ostatni pomiar: {new Date(lastUpdate).toLocaleTimeString('pl-PL')}</p>}
      <p className="text-[11px] text-slate-500">Pomiary hosta uruchamiającego serwer, nie telefonu ani przeglądarki.</p>
    </section>
  );
}
