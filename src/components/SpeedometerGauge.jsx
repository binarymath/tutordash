import React from 'react';
import { Award, Gem, TrendingUp, AlertCircle } from 'lucide-react';

const SpeedometerGauge = ({
  value = 0,
  metaOuro = 7.5,
  metaDiamante = 8.5,
  title = 'Média Consolidada',
  subtitle = 'Prova Paulista',
  isHighlight = false,
  theme = 'light',
  className = '',
  children
}) => {
  const clamp = (val) => Math.min(Math.max(Number(val) || 0, 0), 10);
  const currentVal = clamp(value);
  const ouroVal = clamp(metaOuro);
  const diamanteVal = clamp(metaDiamante);
  const isDark = theme === 'dark';

  const rawId = React.useId ? React.useId() : 'gauge';
  const gaugeId = String(rawId).replace(/[^a-zA-Z0-9]/g, '');

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
    label: 'Em Desenv.',
    color: isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
  };
  if (currentVal >= diamanteVal && diamanteVal > 0) {
    statusBadge = {
      label: 'Diamante! 💎',
      color: isDark
        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/20'
        : 'bg-cyan-50 text-cyan-700 border-cyan-300 shadow-sm',
      icon: <Gem className="w-3.5 h-3.5 text-cyan-500 shrink-0 animate-bounce" />
    };
  } else if (currentVal >= ouroVal && ouroVal > 0) {
    statusBadge = {
      label: 'Ouro! 🥇',
      color: isDark
        ? 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-md shadow-amber-500/20'
        : 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm',
      icon: <Award className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
    };
  }

  const ticks = [0, 2, 4, 6, 8, 10];

  return (
    <div className={`w-full rounded-3xl p-4 sm:p-5 border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all ${className} ${
      isDark
        ? isHighlight
          ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-indigo-500/50 shadow-indigo-500/10 text-white'
          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/80 text-white'
        : isHighlight
          ? 'bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 border-blue-200/90 shadow-md shadow-blue-500/5 text-slate-800 ring-2 ring-blue-500/20'
          : 'bg-white border-slate-200 shadow-sm text-slate-800'
    }`}>
      {/* Glow effect */}
      <div className="absolute -top-16 -left-16 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className={`flex items-start justify-between gap-2 border-b pb-3 mb-3 relative z-10 ${
        isDark ? 'border-white/10' : 'border-slate-100'
      }`}>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block truncate">{subtitle}</span>
          <h4 className={`text-base sm:text-lg font-black tracking-tight mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h4>
        </div>
        <div className={`px-2 py-0.5 rounded-lg border text-[11px] font-black flex items-center gap-1 shrink-0 ${statusBadge.color}`}>
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </div>
      </div>

      {/* SVG Speedometer Gauge */}
      <div className="relative w-full max-w-[280px] mx-auto aspect-[300/145] flex items-center justify-center mt-1">
        <svg viewBox="0 0 300 145" className="w-full h-full overflow-visible drop-shadow-sm">
          <defs>
            <linearGradient id={`gaugeGrad-${gaugeId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id={`glowEffect-${gaugeId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Base Track */}
          <path
            d={getArcPath(0, 10, radius)}
            fill="none"
            stroke={isDark ? '#334155' : '#e2e8f0'}
            strokeWidth="20"
            strokeLinecap="round"
          />

          {/* Active Progress Fill */}
          {currentVal > 0 && (
            <path
              d={getArcPath(0, currentVal, radius)}
              fill="none"
              stroke={`url(#gaugeGrad-${gaugeId})`}
              strokeWidth="20"
              strokeLinecap="round"
              filter={`url(#glowEffect-${gaugeId})`}
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
                className={`text-xs font-black select-none ${isDark ? 'fill-slate-400' : 'fill-slate-400'}`}
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
                stroke="#d97706"
                strokeWidth="3.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <circle cx={ouroOuter.x} cy={ouroOuter.y} r="5" fill="#d97706" className="animate-pulse" />
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
                stroke="#0891b2"
                strokeWidth="3.5"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <circle cx={diamanteOuter.x} cy={diamanteOuter.y} r="5" fill="#0891b2" className="animate-pulse" />
            </g>
          )}

          {/* Needle / Pointer */}
          <g
            transform={`rotate(${rotationDeg}, 150, 120)`}
            className="transition-transform duration-700 ease-out"
          >
            <polygon points="143,120 150,32 157,120" fill={isDark ? '#f8fafc' : '#1e293b'} filter={`url(#glowEffect-${gaugeId})`} />
            <line x1="150" y1="120" x2="150" y2="32" stroke="#0284c7" strokeWidth="2.5" />
          </g>
          <circle cx="150" cy="120" r="10" fill={isDark ? '#1e293b' : '#ffffff'} stroke="#0284c7" strokeWidth="3.5" />
          <circle cx="150" cy="120" r="4" fill="#0284c7" />
        </svg>
      </div>

      {/* Current Value Display */}
      <div className="text-center my-1 relative z-10">
        <span className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {Number(currentVal).toFixed(2)}
        </span>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          Média Atingida
        </span>
      </div>

      {children && (
        <div className={`w-full mt-3 pt-3 border-t relative z-10 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default SpeedometerGauge;
