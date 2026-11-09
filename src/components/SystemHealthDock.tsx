import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';

export const SystemHealthDock: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState({ system: 'NOMINAL', repairs: 0 });

  // Poll status occasionally
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/infrastructure/status');
        if (res.ok) {
          const data = await res.json();
          setStatus({
            system: data.healedIncidents.length > 5 ? 'STABILNY' : 'NOMINALNY',
            repairs: data.healedIncidents.length
          });
        }
      } catch {}
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`health-dock fixed right-3 z-30 transition-all ${isExpanded ? 'w-64 max-w-[calc(100vw-1.5rem)]' : 'w-auto'}`}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-2 bg-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${status.system === 'NOMINALNY' ? 'text-emerald-400' : 'text-amber-400'}`} />
            {isExpanded && <span className="text-xs font-bold text-slate-200">System SVL Health</span>}
          </div>
          <button aria-label="Stan systemu" aria-expanded={isExpanded} onClick={() => setIsExpanded(!isExpanded)} className="flex min-h-8 min-w-8 items-center justify-center text-slate-400 cursor-pointer">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
        
        {isExpanded && (
          <div className="p-3 space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Status jądra:</span>
              <span className="text-emerald-300 font-bold">{status.system}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Wyleczone incydenty:</span>
              <span className="text-cyan-300 font-bold">{status.repairs}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

