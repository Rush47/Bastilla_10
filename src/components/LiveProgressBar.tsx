import React, { useEffect, useState } from 'react';

type LiveProgressBarProps = {
  active: boolean;
  label?: string;
  progress?: number | null;
  detail?: string;
};

export function LiveProgressBar({
  active,
  label = 'Wykonywanie zadania',
  progress = null,
  detail,
}: LiveProgressBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!active) { setElapsedSeconds(0); return; }
    const started = Date.now();
    const timer = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [active]);
  const known = typeof progress === 'number' && Number.isFinite(progress);
  const percent = known ? Math.max(0, Math.min(100, progress)) : null;
  if (!active) return null;
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-cyan-700/40 bg-slate-950/90 p-3 text-sm text-slate-100">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="font-mono text-cyan-300">{percent === null ? `LIVE · ${elapsedSeconds}s` : `${Math.round(percent)}%`}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent === null ? undefined : percent}
        className="relative h-2 overflow-hidden rounded-full bg-slate-700"
      >
        <div
          className={percent === null ? 'absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-cyan-400' : 'h-full rounded-full bg-cyan-400 transition-[width] duration-300'}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      {detail && <p className="mt-2 break-words font-mono text-xs text-slate-400">{detail}</p>}
    </div>
  );
}
