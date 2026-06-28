import React from 'react';
import { Award, Gem, TrendingUp, AlertCircle } from 'lucide-react';

const SpeedometerGauge = ({
  value = 0,
  metaOuro = 7.5,
  metaDiamante = 8.5,
  title = 'Média Consolidada',
  subtitle = 'Prova Paulista',
  isHighlight = false
}) => {
  const clamp = (val) => Math.min(Math.max(Number(val) || 0, 0), 10);
  const currentVal = clamp(value);
  const ouroVal = clamp(metaOuro);
  const diamanteVal = clamp(metaDiamante);

  // SVG dimensions: viewBox 0 0 300 145
  // Center at (150, 120), radius 90
  const cx = 150;
  const cy = 120;
  const radius = 90;

  const getCoord = (val, r = radius) => {
    const angle = Math.PI * (1 - clamp(val) / 10);
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle)
    };
  };

  const getArcPath = (v1, v2, r = radius) => {
    const p1 = getCoord(v1, r);
    const p2 = getCoord(v2, r);
    // Em um semicírculo (180°), qualquer arco menor que 10 tem ângulo <= 180°, logo largeArc é sempre 0
    const largeArc = 0;
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
  };

  // Rotation angle for needle: 0 -> -90deg, 5 -> 0deg, 10 -> +90deg
  const rotationDeg = (currentVal - 5) * 18;

  // Markers
  const ouroInner = getCoord(ouroVal, 75);
  const ouroOuter = getCoord(ouroVal, 106);
  const diamanteInner = getCoord(diamanteVal, 75);
  const diamanteOuter = getCoord(diamanteVal, 106);

  // Status badge computation
  let statusBadge = {
    label: 'Em Desenvolvimento',
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
  };
  if (currentVal >= diamanteVal && diamanteVal > 0) {
    statusBadge = {
      label: 'Meta Diamante! 💎',
      color: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/20',
      icon: <Gem className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
    };
  } else if (currentVal >= ouroVal && ouroVal > 0) {
    statusBadge = {
      label: 'Meta Ouro! 🥇',
      color: 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/20',
      icon: <Award className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
    };
  }

  const ticks = [0, 2, 4, 6, 8, 10];

  return (
    <div className={`w-full sm:w-[360px] md:w-[380px] lg:w-[410px] rounded-3xl p-6 text-white border shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all ${
      isHighlight
        ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/50 shadow-indigo-500/10'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/80'
    }`}>
      {/* Glow effect */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5 mb-4 relative z-10">
        <div className="min-w-0">
          <span className="text-[11px] font-black text-sky-400 uppercase tracking-widest block truncate">{subtitle}</span>
          <h4 className="text-lg font-black text-white tracking-tight mt-0.5 truncate">{title}</h4>
        </div>
        <div className={`px-3 py-1 rounded-xl border text-xs font-black flex items-center gap-1.5 shrink-0 ${statusBadge.color}`}>
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* SVG Speedometer Gauge */}
      <div className="relative w-full max-w-[300px] mx-auto aspect-[300/145] flex items-center justify-center mt-2">
        <svg viewBox="0 0 300 145" className="w-full h-full overflow-visible drop-shadow-md">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Base Track */}
          <path
            d={getArcPath(0, 10, radius)}
            fill="none"
            stroke="#334155"
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Active Progress Fill */}
          {currentVal > 0 && (
            <path
              d={getArcPath(0, currentVal, radius)}
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="20"
              strokeLinecap="round"
              filter="url(#glowEffect)"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Ticks and Labels */}
          {ticks.map((t) => {
            const pos = getCoord(t, radius + 22);
            return (
              <text
                key={t}
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                className="text-xs font-black fill-slate-400 select-none"
              >
                {t}
              </text>
            );
          })}

          {/* Meta Ouro Marker */}
          {ouroVal > 0 && (
            <g className="transition-all duration-500">
              <line
                x1={ouroInner.x}
                y1={ouroInner.y}
                x2={ouroOuter.x}
                y2={ouroOuter.y}
                stroke="#fbbf24"
                strokeWidth="3.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <circle cx={ouroOuter.x} cy={ouroOuter.y} r="5" fill="#fbbf24" className="animate-pulse" />
            </g>
          )}

          {/* Meta Diamante Marker */}
          {diamanteVal > 0 && (
            <g className="transition-all duration-500">
              <line
                x1={diamanteInner.x}
                y1={diamanteInner.y}
                x2={diamanteOuter.x}
                y2={diamanteOuter.y}
                stroke="#22d3ee"
                strokeWidth="3.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <circle cx={diamanteOuter.x} cy={diamanteOuter.y} r="5" fill="#22d3ee" className="animate-pulse" />
            </g>
          )}

          {/* Needle / Pointer (Fixed vertical up at value 5, rotated cleanly via transform) */}
          <g
            transform={`rotate(${rotationDeg}, 150, 120)`}
            className="transition-transform duration-700 ease-out"
          >
            {/* Polygon points from center base (143,120 & 157,120) to tip (150,32) */}
            <polygon points="143,120 150,32 157,120" fill="#f8fafc" filter="url(#glowEffect)" />
            <line x1="150" y1="120" x2="150" y2="32" stroke="#38bdf8" strokeWidth="2.5" />
          </g>
          <circle cx="150" cy="120" r="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="150" cy="120" r="4" fill="#38bdf8" />
        </svg>
      </div>

      {/* Current Value Display (Em fluxo normal abaixo do SVG, sem sobrepor) */}
      <div className="text-center mt-1 mb-4 relative z-10">
        <span className="text-3xl font-black text-white tracking-tight drop-shadow-md">
          {Number(currentVal).toFixed(2)}
        </span>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          Média Atingida
        </span>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 gap-3 w-full pt-3 border-t border-white/10 text-xs relative z-10">
        <div className="bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/30 flex items-center justify-between">
          <span className="font-bold text-amber-200 flex items-center gap-1.5">🥇 Ouro</span>
          <span className="font-black text-amber-300 text-sm">{Number(ouroVal).toFixed(1)}</span>
        </div>
        <div className="bg-cyan-500/10 px-3 py-2 rounded-xl border border-cyan-500/30 flex items-center justify-between">
          <span className="font-bold text-cyan-200 flex items-center gap-1.5">💎 Diamante</span>
          <span className="font-black text-cyan-300 text-sm">{Number(diamanteVal).toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};

export default SpeedometerGauge;
