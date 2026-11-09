import React from 'react';

export const TechnicalBlueprintSVG: React.FC<{ style?: string }> = ({ style }) => {
  return (
    <div className="my-4 p-3 md:p-6 rounded-xl bg-slate-950 border border-cyan-500/20 shadow-2xl overflow-hidden flex flex-col items-center backdrop-blur-md">
      <div className="w-full max-w-[320px] md:max-w-[450px] aspect-square relative">
        <svg viewBox="0 0 400 400" className="w-full h-full">
          {/* Background Grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(6, 182, 212, 0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Neural Core Circles */}
          <circle cx="200" cy="200" r="60" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5,5" className="animate-spin-slow origin-center" style={{ transformOrigin: '200px 200px' }} />
          <circle cx="200" cy="200" r="40" fill="none" stroke="#FFD700" strokeWidth="3" className="animate-pulse" />
          
          {/* Connector Lines */}
          <line x1="200" y1="200" x2="100" y2="100" stroke="#10b981" strokeWidth="1.5" />
          <line x1="200" y1="200" x2="300" y2="100" stroke="#a855f7" strokeWidth="1.5" />
          <line x1="200" y1="200" x2="200" y2="320" stroke="#06b6d4" strokeWidth="1.5" />
          
          {/* Agent Nodes */}
          <g className="animate-bounce-slow">
            <rect x="70" y="70" width="60" height="30" rx="4" fill="#06131a" stroke="#10b981" strokeWidth="1" />
            <text x="100" y="90" textAnchor="middle" fill="#10b981" fontSize="10" fontFamily="monospace">ALEX</text>
          </g>
          
          <g style={{ animationDelay: '0.5s' }} className="animate-bounce-slow">
            <rect x="270" y="70" width="60" height="30" rx="4" fill="#06131a" stroke="#a855f7" strokeWidth="1" />
            <text x="300" y="90" textAnchor="middle" fill="#a855f7" fontSize="10" fontFamily="monospace">ASTYRIA</text>
          </g>
          
          <g style={{ animationDelay: '1s' }} className="animate-bounce-slow">
            <rect x="170" y="320" width="60" height="30" rx="4" fill="#06131a" stroke="#06b6d4" strokeWidth="1" />
            <text x="200" y="340" textAnchor="middle" fill="#06b6d4" fontSize="10" fontFamily="monospace">AURELIUS</text>
          </g>
          
          {/* Floating Data Bits */}
          <circle cx="150" cy="150" r="2" fill="#fff" className="animate-ping" />
          <circle cx="250" cy="250" r="2" fill="#fff" style={{ animationDelay: '1s' }} className="animate-ping" />
        </svg>
      </div>
      <div className="mt-4 text-center">
        <div className="text-cyan-400 font-bold text-xs uppercase tracking-widest">SVL-BLUEPRINT-RENDER-V1</div>
        <div className="text-slate-500 text-[10px] mt-1 italic">Style: {style || 'Default Architectural'}</div>
      </div>
    </div>
  );
};
