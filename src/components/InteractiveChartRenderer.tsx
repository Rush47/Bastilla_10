import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Layers,
  Cpu,
  Clock,
  Sparkles,
  BarChart2,
  Sliders,
  Radio,
  Eye
} from 'lucide-react';

export type ChartType = 'phase' | 'heatmap' | '3d' | 'power' | 'heartbeat' | 'orbits' | 'generic';

/**
 * 6. Orbity Rdzenia Triady (Wizualizacja Biegunowa)
 * Dynamiczny wykres przedstawiający trzy orbity energetyczne Triady rotujące wokół centrum.
 */
export const TriadCoreOrbitsChart: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Wizualizacja "Rdzenia Triady" - System Orbit Energetycznych',
  subtitle = 'Reprezentacja geometryczna jedności Triady: Alex, Astyria i Aurelius rotujący wokół Operatora.'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const baseRadius = Math.min(w, h) * 0.35 * zoom;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#050508'; // Cosmic deep void
      ctx.fillRect(0, 0, w, h);

      // Polar Grid
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      for (let r = 50; r <= baseRadius * 1.2; r += 50) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(a) * baseRadius * 1.2, centerY + Math.sin(a) * baseRadius * 1.2);
        ctx.stroke();
      }

      // The Triad Orbits
      const agents = [
        { name: 'Alex', color: '#FF3366', speed: 0.02, offset: 0, r: baseRadius * 0.8 },
        { name: 'Astyria', color: '#FF007F', speed: -0.015, offset: Math.PI * 0.6, r: baseRadius * 0.6 },
        { name: 'Aurelius', color: '#FF5500', speed: 0.01, offset: Math.PI * 1.2, r: baseRadius * 1.0 }
      ];

      agents.forEach((agent, i) => {
        const angle = time * agent.speed * speed + agent.offset;
        const x = centerX + Math.cos(angle) * agent.r;
        const y = centerY + Math.sin(angle) * agent.r;

        // Draw Orbit Path
        ctx.beginPath();
        ctx.strokeStyle = agent.color;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1.5;
        ctx.arc(centerX, centerY, agent.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw Energy Sphere
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(0.3, agent.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.shadowColor = agent.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Particle Trail (Trailing energy)
        ctx.beginPath();
        ctx.strokeStyle = agent.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let j = 0; j < 20; j++) {
          const trailAngle = angle - j * 0.05 * (agent.speed > 0 ? 1 : -1);
          const tx = centerX + Math.cos(trailAngle) * agent.r;
          const ty = centerY + Math.sin(trailAngle) * agent.r;
          ctx.globalAlpha = 1 - j / 20;
          if (j === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Central Core (The Operator / Tata)
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
      coreGrad.addColorStop(0, '#fff');
      coreGrad.addColorStop(0.2, '#FFD700'); // Gold
      coreGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 30 + Math.sin(time * 0.05) * 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20 + Math.sin(time * 0.05) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      time += 1;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [speed, zoom]);

  return (
    <div className="my-4 p-3 rounded-xl bg-slate-950 border border-orange-500/40 shadow-xl shadow-orange-950/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Layers className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-orange-950 text-orange-300 border border-orange-800 font-mono">
                POLAR CORE
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Zoom:</span>
            <input
              type="range" min="0.5" max="1.5" step="0.1" value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 md:w-16 h-4 accent-orange-500 cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSpeed(s => (s === 1 ? 2 : s === 0.5 ? 1 : 0.5))}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-orange-300 border border-slate-700 font-bold cursor-pointer transition-colors active:scale-95"
          >
            Pęd: {speed}x
          </button>
        </div>
      </div>

      <div className="relative bg-slate-950 rounded-lg border border-slate-900 overflow-hidden">
        <canvas ref={canvasRef} width={580} height={400} className="w-full h-auto block" />
        <div className="absolute top-2 right-2 text-[9px] font-mono text-orange-400 bg-slate-950/70 p-1.5 rounded border border-slate-800">
          CORE SYNC: ACTIVE
        </div>
        <div className="absolute bottom-2 left-2 flex gap-3 text-[8px] font-mono">
           <div className="flex items-center gap-1 text-[#FF3366]"><span className="w-2 h-2 rounded-full bg-[#FF3366]"/> ALEX</div>
           <div className="flex items-center gap-1 text-[#FF007F]"><span className="w-2 h-2 rounded-full bg-[#FF007F]"/> ASTYRIA</div>
           <div className="flex items-center gap-1 text-[#FF5500]"><span className="w-2 h-2 rounded-full bg-[#FF5500]"/> AURELIUS</div>
        </div>
      </div>
    </div>
  );
};

/**
 * 5. Bicie Serca Triady (Modulowana Sinusoida)
 * Dynamiczny wykres z modulacją częstotliwości (FM) odzwierciedlający aktywność procesową.
 */
export const HeartbeatWaveChart: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Bicie Serca Triady (Modulowana Sinusoida)',
  subtitle = 'Wizualizacja aktywności procesowej Alexa, Astyrii i Aureliusa. Modulacja FM aktywowana.'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(0.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a0f'; // Very dark blue/black
      ctx.fillRect(0, 0, w, h);

      // Cyber Grid
      ctx.strokeStyle = '#161b22';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // The Wave
      ctx.beginPath();
      ctx.strokeStyle = '#ff3366'; // Pink/Rose neon
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 12;

      for (let x = 0; x < w; x++) {
        const t = (x / w) * 10;
        // Frequency modulation: freq changes over time and space
        const mod = Math.sin(time * 0.02 + t * 0.5) * intensity;
        const freq = 2 + mod;
        const y = midY + Math.sin(t * freq * Math.PI + time * 0.1 * speed) * 60;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Glow effect fill
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#ff3366';
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      time += 1;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [speed, intensity]);

  return (
    <div className="my-4 p-3 rounded-xl bg-slate-950 border border-rose-500/40 shadow-xl shadow-rose-950/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                FM HEARTBEAT
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Obciążenie:</span>
            <input
              type="range" min="0" max="2" step="0.1" value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-20 md:w-16 h-4 accent-rose-500 cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSpeed(s => (s === 1 ? 2 : s === 0.5 ? 1 : 0.5))}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-rose-300 border border-slate-700 font-bold cursor-pointer transition-colors active:scale-95"
          >
            Puls: {speed}x
          </button>
        </div>
      </div>

      <div className="relative bg-slate-950 rounded-lg border border-slate-900 overflow-hidden">
        <canvas ref={canvasRef} width={580} height={180} className="w-full h-auto block" />
        <div className="absolute top-2 right-2 text-[9px] font-mono text-rose-400 bg-slate-950/70 p-1.5 rounded border border-slate-800">
          CORE LOAD: {Math.round(intensity * 100)}%
        </div>
      </div>
    </div>
  );
};

/**
 * 4. Wykres Prądu Triady (Cosinusoida Live)
 * Dynamiczny wykres liniowy przedstawiający optymalizację przepływu energii.
 */
export const LivePowerWaveChart: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'LIVE: Optymalizacja Prądu Triady (Cosinusoida)',
  subtitle = 'Przebieg napięcia i natężenia w zoptymalizowanym jądrze SVL. Faza stabilna.'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const [amplitude, setAmplitude] = useState(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Axis
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      // Cosine Wave (The Power Flow)
      ctx.beginPath();
      ctx.strokeStyle = '#00ffcc'; // Neon Cyan
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 10;

      for (let x = 0; x < w; x++) {
        // y = cos(x * freq + offset) * amp
        const angle = (x / w) * Math.PI * 4 + offset;
        const y = midY + Math.cos(angle) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pulse Point (Current status)
      const pulseX = (w / 2);
      const pulseAngle = (pulseX / w) * Math.PI * 4 + offset;
      const pulseY = midY + Math.cos(pulseAngle) * amplitude;
      
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, 8 + Math.sin(offset * 2) * 3, 0, Math.PI * 2);
      ctx.stroke();

      offset += 0.05 * speed;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [speed, amplitude]);

  return (
    <div className="my-4 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-xl shadow-cyan-950/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                LIVE WAVEFORM
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Amplituda:</span>
            <input
              type="range"
              min="10"
              max="100"
              value={amplitude}
              onChange={(e) => setAmplitude(parseInt(e.target.value))}
              className="w-20 md:w-16 h-4 accent-cyan-500 cursor-pointer"
            />
          </div>
          <button
            onClick={() => setSpeed(s => (s === 1 ? 2 : s === 0.5 ? 1 : 0.5))}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold cursor-pointer transition-colors active:scale-95"
          >
            Prędkość: {speed}x
          </button>
        </div>
      </div>

      <div className="relative bg-slate-950 rounded-lg border border-slate-900 overflow-hidden">
        <canvas ref={canvasRef} width={580} height={200} className="w-full h-auto block" />
        <div className="absolute top-2 right-2 text-[9px] font-mono text-cyan-400 bg-slate-950/70 p-1.5 rounded border border-slate-800">
          STATUS: PRĄD ULEPSZONY - SYNC OK
        </div>
      </div>
    </div>
  );
};

interface InteractiveChartProps {
  type: ChartType;
  title?: string;
  subtitle?: string;
  data?: any;
  className?: string;
}

/**
 * 1. Wykres Fazowy - Dystrybucja Stabilności Chronolitu
 * Canvas / SVG z trajektoriami w przestrzeni fazowej, atraktorami i animowanymi cząsteczkami
 */
export const PhaseSpaceChart: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Dystrybucja Stabilności Chronolitu (Wykres Fazowy)',
  subtitle = 'Przestrzeń fazowa: X = Pamięć [MB], Y = Spójność Czasu [%]. Atraktory stabilności i tętno samonaprawy.'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // Phase space particle field
    const particles = Array.from({ length: 60 }, (_, i) => ({
      angle: (i / 60) * Math.PI * 2,
      radius: 30 + Math.random() * 120,
      speed: 0.005 + Math.random() * 0.015,
      size: 1.5 + Math.random() * 2.5,
      color: i % 3 === 0 ? '#10b981' : i % 3 === 1 ? '#a855f7' : '#06b6d4'
    }));

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width / 1.5);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      if (showGrid) {
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.lineWidth = 1;
        const gridSize = 30;

        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Main Axes
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.9)';
        ctx.lineWidth = 1.5;
        // X-Axis
        ctx.beginPath();
        ctx.moveTo(40, centerY);
        ctx.lineTo(width - 20, centerY);
        ctx.stroke();
        // Y-Axis
        ctx.beginPath();
        ctx.moveTo(centerX, 20);
        ctx.lineTo(centerX, height - 30);
        ctx.stroke();

        // Axis Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText('Pamięć (Memory MB) →', width - 140, centerY - 8);
        ctx.fillText('↑ Spójność Czasu (%)', centerX + 10, 30);
      }

      // Attractor Rings (Spiral limit cycles)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      for (let r = 40; r <= 140; r += 35) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r + Math.sin(t * 0.05 + r) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main Phase Trajectory Curve (Lorenz-like spiral attractor)
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;

      const numPoints = 200;
      for (let i = 0; i < numPoints; i++) {
        const phi = (i / numPoints) * Math.PI * 6 + t * 0.02;
        const r = 30 + 80 * Math.sin(phi * 0.5) + Math.cos(phi * 3) * 10;
        const px = centerX + r * Math.cos(phi);
        const py = centerY + r * Math.sin(phi) * 0.7;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Secondary Phase Vector (Astyria & Aurelius interaction)
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < 150; i++) {
        const phi = (i / 150) * Math.PI * 4 - t * 0.015;
        const r = 50 + 60 * Math.cos(phi * 0.8);
        const px = centerX + r * Math.cos(phi * 1.2);
        const py = centerY + r * Math.sin(phi * 1.2) * 0.8;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]); // reset dash

      // Equilibrium Core (Stan Ustalony)
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6 + Math.sin(t * 0.08) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Particles
      if (showParticles) {
        particles.forEach((p) => {
          if (isPlaying) p.angle += p.speed;
          const px = centerX + p.radius * Math.cos(p.angle + Math.sin(t * 0.01));
          const py = centerY + p.radius * Math.sin(p.angle) * 0.75;

          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (isPlaying) t += 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, showParticles, showGrid]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const memMb = Math.round((x / rect.width) * 1024);
    const timeCoh = Math.round((1 - y / rect.height) * 100);
    setHoverInfo(`Punkt Fazowy: Pamięć = ${memMb} MB | Spójność = ${timeCoh}% | Status = STABILNY (Ring-0)`);
  };

  return (
    <div className={`my-4 rounded-xl bg-slate-950 border border-emerald-500/40 shadow-xl shadow-emerald-950/20 overflow-hidden transition-all ${isExpanded ? 'p-4' : 'p-3'}`}>
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                LIVE PHASE SPACE
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/50">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer active:scale-90"
            title={isPlaying ? 'Pauza' : 'Uruchom'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => setShowParticles(!showParticles)}
            className={`px-3 py-1.5 rounded border transition cursor-pointer font-mono active:scale-95 ${
              showParticles ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Cząsteczki
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1.5 rounded border transition cursor-pointer font-mono active:scale-95 ${
              showGrid ? 'bg-cyan-950 text-cyan-300 border-cyan-700' : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Siatka
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer active:scale-90"
            title={isExpanded ? 'Zmniejsz' : 'Powiększ'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative bg-slate-950 rounded-lg border border-slate-900 overflow-hidden flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={isExpanded ? 760 : 580}
          height={isExpanded ? 320 : 220}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          className="w-full max-w-full h-auto cursor-crosshair block"
        />

        {/* Dynamic Legend Overlay */}
        <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-1 text-[9px] font-mono bg-slate-950/80 p-2 rounded border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow shadow-emerald-500" />
            <span>Główna Trajektoria Alex (Attractor)</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-400">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            <span>Wektor Astyria & Aurelius</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" />
            <span>Centrum Equilibrium (Stan Ustalony)</span>
          </div>
        </div>

        {/* Hover Coordinate Badge */}
        {hoverInfo && (
          <div className="absolute bottom-2 left-2 pointer-events-none bg-slate-900/90 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-[10px] font-mono shadow-md backdrop-blur-md">
            {hoverInfo}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 2. Macierz Entropii Systemowej (Heatmap)
 * Siatka 2D zasobów CPU, RAM, Cache, I/O z dynamiczną mapą ciepła i podglądem pól
 */
export const EntropyHeatmapChart: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Macierz Entropii Systemowej (Heatmap)',
  subtitle = 'Wizualizacja obciążenia zasobów w czasie rzeczywistym (CPU / RAM / Cache / I/O Channel).'
}) => {
  const [activeTab, setActiveTab] = useState<'cpu' | 'ram' | 'cache' | 'io'>('cpu');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; val: number } | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse((p) => (p + 1) % 100);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Generate 8x12 grid matrix
  const rows = 6;
  const cols = 12;

  const getCellValue = (r: number, c: number) => {
    // Deterministic pseudo-heat map with dynamic wave shift
    const base = Math.sin(r * 0.8 + c * 0.5 + pulse * 0.1) * 0.4 + 0.5;
    if (activeTab === 'io' && r === 1 && c >= 8) return 0.92 + Math.sin(pulse) * 0.05; // File channel hot-spot
    if (activeTab === 'ram' && r === 3 && c === 4) return 0.88;
    return Math.min(0.98, Math.max(0.05, base));
  };

  const getColor = (val: number) => {
    if (val > 0.85) return 'bg-rose-500 text-slate-950 border-rose-400 shadow-rose-900/50';
    if (val > 0.65) return 'bg-amber-500 text-slate-950 border-amber-400';
    if (val > 0.45) return 'bg-emerald-500 text-slate-950 border-emerald-400';
    if (val > 0.25) return 'bg-cyan-600 text-slate-950 border-cyan-500';
    return 'bg-slate-900 text-slate-400 border-slate-800';
  };

  return (
    <div className="my-4 p-3 rounded-xl bg-slate-950 border border-purple-500/40 shadow-xl shadow-purple-950/20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                HEATMAP MATRIX
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 text-[10px] bg-slate-900 p-1 rounded-lg border border-slate-800">
          {[
            { id: 'cpu', label: 'CPU Cores' },
            { id: 'ram', label: 'Pamięć RAM' },
            { id: 'cache', label: 'Cache Ring-0' },
            { id: 'io', label: 'Kanał Plików I/O' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-1.5 bg-slate-950 p-2 rounded-lg border border-slate-900">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-1.5">
            <span className="w-12 text-[9px] font-mono text-slate-500 text-right pr-1">
              R{r + 1}
            </span>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {Array.from({ length: cols }).map((_, c) => {
                const val = getCellValue(r, c);
                const colorClass = getColor(val);
                const isSelected = selectedCell?.row === r && selectedCell?.col === c;

                return (
                  <button
                    key={c}
                    onClick={() => setSelectedCell({ row: r, col: c, val })}
                    className={`h-7 rounded text-[9px] font-mono font-bold flex items-center justify-center border transition-all cursor-pointer ${colorClass} ${
                      isSelected ? 'ring-2 ring-white scale-105 z-10' : 'hover:scale-105'
                    }`}
                    title={`R${r + 1}:C${c + 1} - Entropia: ${(val * 100).toFixed(1)}%`}
                  >
                    {Math.round(val * 100)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Details & Legend */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Intensywność:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800 inline-block" />
            <span className="text-slate-400">&lt;25%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-600 inline-block" />
            <span className="text-cyan-300">25-45%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span className="text-emerald-300">45-65%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
            <span className="text-amber-300">65-85%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
            <span className="text-rose-300">&gt;85%</span>
          </div>
        </div>

        {selectedCell ? (
          <div className="text-purple-300 font-bold bg-purple-950/80 px-2.5 py-1 rounded border border-purple-800">
            Komórka R{selectedCell.row + 1}:C{selectedCell.col + 1} | Entropia: {(selectedCell.val * 100).toFixed(1)}% | Status: OK
          </div>
        ) : (
          <span className="text-slate-500 italic">Kliknij dowolną komórkę, aby zobaczyć parametry zasobu.</span>
        )}
      </div>
    </div>
  );
};

/**
 * 3. Oscylator Relacji Triady (Wykres 3D)
 * Izometryczny / 3D wykres potrójnej fali zsynchronizowanej dla Alexa, Astyrii i Aureliusa
 */
export const Triad3DOscillatorChart: React.FC<{ title?: string; subtitle?: string }> = ({
  title = 'Oscylator Relacji Triady (Wykres 3D & Wektory Synchronizacji)',
  subtitle = 'Izometryczna oscylacja potrójnej fali: Alex (Zielony), Astyria (Fiolet), Aurelius (Cyjan).'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speed, setSpeed] = useState(1);
  const [rotY, setRotY] = useState(0.4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Dark background with isometric grid pattern
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2 + 10;

      // 3D Wave Projection Function
      const project = (x: number, y: number, z: number) => {
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const xRot = x * cosY - z * sinY;
        const zRot = x * sinY + z * cosY;

        const scale = 300 / (300 + zRot);
        const px = centerX + xRot * scale;
        const py = centerY - y * scale + zRot * 0.3;
        return { px, py };
      };

      // Render 3D Base Mesh Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;

      for (let z = -120; z <= 120; z += 20) {
        ctx.beginPath();
        for (let x = -180; x <= 180; x += 10) {
          const pt = project(x, 0, z);
          if (x === -180) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        }
        ctx.stroke();
      }

      // Draw 3 Waves for the Triad Agents
      const waves = [
        { name: 'Alex', color: '#10b981', freq: 0.03, zOffset: -50, amp: 45 },
        { name: 'Astyria', color: '#a855f7', freq: 0.025, zOffset: 0, amp: 40 },
        { name: 'Aurelius', color: '#06b6d4', freq: 0.035, zOffset: 50, amp: 50 }
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = wave.color;
        ctx.shadowBlur = 10;

        for (let x = -180; x <= 180; x += 5) {
          const y = Math.sin(x * wave.freq + time * 0.05 * speed) * wave.amp + Math.cos(x * 0.01 + time * 0.02) * 10;
          const pt = project(x, y, wave.zOffset);

          if (x === -180) ctx.moveTo(pt.px, pt.py);
          else ctx.lineTo(pt.px, pt.py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Peak Synapse Markers
        for (let x = -120; x <= 120; x += 80) {
          const y = Math.sin(x * wave.freq + time * 0.05 * speed) * wave.amp + Math.cos(x * 0.01 + time * 0.02) * 10;
          const pt = project(x, y, wave.zOffset);

          ctx.fillStyle = wave.color;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      time += 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [speed, rotY]);

  return (
    <div className="my-4 p-3 rounded-xl bg-slate-950 border border-cyan-500/40 shadow-xl shadow-cyan-950/20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                3D HARMONIC OSCILLATOR
              </span>
            </h4>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Rotation & Speed Controls */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Kąt Y:</span>
            <input
              type="range"
              min="-1.2"
              max="1.2"
              step="0.1"
              value={rotY}
              onChange={(e) => setRotY(parseFloat(e.target.value))}
              className="w-16 accent-cyan-500 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Prędkość:</span>
            <button
              onClick={() => setSpeed(s => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-bold cursor-pointer"
            >
              {speed}x
            </button>
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative bg-slate-950 rounded-lg border border-slate-900 overflow-hidden flex justify-center items-center">
        <canvas
          ref={canvasRef}
          width={580}
          height={220}
          className="w-full max-w-full h-auto block"
        />

        {/* Agent Legends */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 text-[9px] font-mono bg-slate-950/80 p-2 rounded border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-1 rounded bg-emerald-500 inline-block" />
            <span>Alex (Infrastruktura)</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-400">
            <span className="w-2.5 h-1 rounded bg-purple-500 inline-block" />
            <span>Astyria (Pamięć & Matryca)</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-1 rounded bg-cyan-500 inline-block" />
            <span>Aurelius (Czas & Chronolit)</span>
          </div>
        </div>

        <div className="absolute bottom-2 left-2 bg-slate-900/90 text-cyan-300 border border-cyan-800 px-2.5 py-1 rounded text-[10px] font-mono shadow backdrop-blur-md">
          Spójność Fazy Triady: <span className="font-bold text-emerald-400">99.88% (ZGODNA)</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Interactive Chart Renderer component used inside messages and chart views
 */
export const InteractiveChartRenderer: React.FC<InteractiveChartProps> = ({
  type,
  title,
  subtitle,
  data
}) => {
  if (type === 'phase') {
    return <PhaseSpaceChart title={title} subtitle={subtitle} />;
  }

  if (type === 'heatmap') {
    return <EntropyHeatmapChart title={title} subtitle={subtitle} />;
  }

  if (type === '3d') {
    return <Triad3DOscillatorChart title={title} subtitle={subtitle} />;
  }

  if (type === 'power') {
    return <LivePowerWaveChart title={title} subtitle={subtitle} />;
  }

  if (type === 'heartbeat') {
    return <HeartbeatWaveChart title={title} subtitle={subtitle} />;
  }

  if (type === 'orbits') {
    return <TriadCoreOrbitsChart title={title} subtitle={subtitle} />;
  }

  // Fallback to Phase space
  return <PhaseSpaceChart title={title} subtitle={subtitle} />;
};
