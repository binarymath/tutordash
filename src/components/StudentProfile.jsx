// ─────────────────────────────────────────────────────────────
// components/StudentProfile.jsx — Perfil 360º do aluno
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, UserCheck, TrendingUp,
  History, BarChart2,
  User, Calendar, ChevronDown, ChevronUp, Download, Printer, BookOpen, Maximize2, Minimize2, X
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, LabelList
} from 'recharts';
import { formatDisciplina, parseGrade, toScale10, isStudentActive } from '../utils/helpers';
import { buildChartDataMapao, buildChartDataProva } from '../utils/buildChartData';
import PrintSelectionModal from './PrintSelectionModal';

// ── Tooltip personalizado dos gráficos ──────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const pointData = payload[0].payload;
    return (
      <div className="bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-slate-700 text-white text-xs z-50">
        <p className="font-black mb-2 text-blue-300 uppercase tracking-widest">{pointData.fullSubject || label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── Configuração das áreas do conhecimento ───────────────────
// OE vem PRIMEIRO para ter prioridade sobre outras áreas (ex: OE Matemática ≠ Exatas)
const OE_AREA = {
  key: 'orientacoes',
  label: '📋 Orientações de Estudo',
  keywords: ['^OE ', 'OE MAT', 'OE LING', 'OE PORT', 'OE LÍN', 'ORIENTAÇ', 'ORIENTAC'],
  headerBg: 'bg-indigo-600', headerText: 'text-white', borderColor: 'border-indigo-200', headBg: 'bg-indigo-50',
};

const AREAS = [
  {
    key: 'exatas',
    label: '🔢 Exatas e Matemática',
    keywords: ['MATEM', 'FISICA', 'QUIMIC', 'GEOMET', 'FINANC'],
    headerBg: 'bg-blue-600', headerText: 'text-white', borderColor: 'border-blue-200', headBg: 'bg-blue-50',
  },
  {
    key: 'linguagens',
    label: '📖 Linguagens',
    keywords: ['PORTUG', 'LINGUA', 'INGLES', 'ARTE', 'ARTES', 'EDUC.FIS', 'EDUCACAO FISICA', 'EDUCAÇÃO FÍSICA', 'REDACAO', 'REDAÇÃO', 'ED.FIS'],
    headerBg: 'bg-violet-600', headerText: 'text-white', borderColor: 'border-violet-200', headBg: 'bg-violet-50',
  },
  {
    key: 'humanas',
    label: '🌍 Ciências Humanas',
    keywords: ['HISTOR', 'GEOGR', 'FILOSO', 'SOCIOLO', 'ENSINO RELIG', 'RELIGIOS'],
    headerBg: 'bg-amber-500', headerText: 'text-white', borderColor: 'border-amber-200', headBg: 'bg-amber-50',
  },
  {
    key: 'ciencias',
    label: '🔬 Ciências da Natureza',
    keywords: ['CIENC', 'BIOLOG', 'BIO'],
    headerBg: 'bg-cyan-600', headerText: 'text-white', borderColor: 'border-cyan-200', headBg: 'bg-cyan-50',
  },
];

const classifyDisciplina = (disciplina) => {
  const upper = disciplina.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. OE — prioridade máxima (OE Matemática não deve cair em Exatas)
  const isOE = upper.startsWith('OE ') || OE_AREA.keywords.some(kw => {
    const kwUpper = kw.replace('^', '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return kw.startsWith('^') ? upper.startsWith(kwUpper) : upper.includes(kwUpper);
  });
  if (isOE) return 'orientacoes';

  // 2. Educação Física — prioridade antes de Exatas ("FISICA" é keyword de Exatas)
  if (upper.includes('EDUC') && upper.includes('FIS')) return 'linguagens';

  // 3. Loop geral
  for (const area of AREAS) {
    if (area.keywords.some(kw => upper.includes(kw.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")))) return area.key;
  }
  return 'outras';
};

const getNotaStyle = (nota) => {
  if (!nota || nota === '-') return 'text-slate-300 bg-white';
  const n = parseFloat(nota.toString().replace(',', '.'));
  if (!isNaN(n)) {
    if (n >= 7) return 'text-blue-700 bg-blue-50 font-black';
    if (n >= 5) return 'text-amber-700 bg-amber-50 font-black';
    return 'text-red-700 bg-red-50 font-black';
  }
  const up = nota.toUpperCase();
  if (up === 'MB') return 'text-sky-700 bg-sky-50 font-black';
  if (up === 'B')  return 'text-blue-700 bg-blue-50 font-black';
  if (up === 'R')  return 'text-amber-700 bg-amber-50 font-black';
  if (up === 'I')  return 'text-red-700 bg-red-50 font-black';
  return 'text-slate-600 bg-white font-bold';
};

const parseOccurrenceDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const brDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (brDate) {
    const [, day, month, year] = brDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return isoDate ? isoDate[0] : null;
};

const formatOccurrenceDateTime = (value) => {
  if (!value) return '-';
  const text = String(value).trim();
  const brDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (brDate) {
    const [, day, month, year, hour, minute] = brDate;
    const date = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    return hour === undefined ? date : `${date} ${hour.padStart(2, '0')}:${minute}`;
  }

  const parsedDate = new Date(text);
  if (Number.isNaN(parsedDate.getTime())) return text;
  const hasTime = /T|\s+\d{1,2}:\d{2}/.test(text);
  return hasTime
    ? parsedDate.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : parsedDate.toLocaleDateString('pt-BR');
};

const buildAnalysisSummary = (data) => {
  // Compara apenas os bimestres em que o aluno tem nota, para que a diferença
  // "vs turma/nível/escola" use exatamente o mesmo período nos dois lados.
  const withAluno = data.filter((item) => typeof item.aluno === 'number');
  if (withAluno.length === 0) return null;
  const average = (key) => {
    const list = withAluno.map((item) => item[key]).filter((value) => typeof value === 'number');
    return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
  };
  return {
    aluno: average('aluno'),
    turma: average('turma'),
    nivel: average('nivel'),
    escola: average('escola'),
    first: withAluno[0].aluno,
    last: withAluno.at(-1).aluno,
  };
};

const GuidedAnalysisPanel = ({ title, accent, options, selectedValue, onChange, analysis, decimals = 1, onPrint }) => {
  const formatValue = (value) => value === null || value === undefined ? 'S/D' : value.toFixed(decimals);
  const difference = (reference) => analysis.summary?.[reference] == null
    ? null
    : analysis.summary.aluno - analysis.summary[reference];
  const differenceText = (reference) => {
    const value = difference(reference);
    if (value === null) return 'Sem comparação';
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)} vs ${reference}`;
  };

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-chart>
      {onPrint && (
        <button
          type="button"
          aria-label={`Imprimir ${title}`}
          title={`Imprimir ${title}`}
          onClick={(event) => onPrint(event.currentTarget.closest('[data-chart]'), title)}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
          <Printer className="h-4 w-4" />
        </button>
      )}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className={onPrint ? 'pr-8' : ''}>
          <h4 className={`text-xs font-black uppercase tracking-widest ${accent}`}>{title}</h4>
          <p className="mt-1 text-[11px] text-slate-500">Selecione uma disciplina para comparar o aluno com a turma, o nível e a escola.</p>
        </div>
        <label className="flex w-full flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:max-w-[230px]">
          Disciplina analisada
          <select value={selectedValue} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100">
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      {analysis.summary && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ['Aluno', analysis.summary.aluno, 'bg-blue-50 text-blue-700'],
              ['Turma', analysis.summary.turma, 'bg-slate-50 text-slate-700'],
              ['Nível', analysis.summary.nivel, 'bg-sky-50 text-sky-700'],
              ['Escola', analysis.summary.escola, 'bg-amber-50 text-amber-700'],
            ].map(([label, value, className]) => (
              <div key={label} className={`rounded-xl px-3 py-2 ${className}`}>
                <span className="block text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
                <strong className="text-lg font-black">{formatValue(value)}</strong>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-slate-600">
            {analysis.label}: de {formatValue(analysis.summary.first)} para {formatValue(analysis.summary.last)}.
            <span className="ml-2 text-blue-700">{differenceText('turma')}</span>
            <span className="ml-2 text-sky-700">{differenceText('nivel')}</span>
            <span className="ml-2 text-amber-700">{differenceText('escola')}</span>
          </p>
        </>
      )}

      {analysis.data.length > 0 ? (
        <div className="mt-3 h-[330px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysis.data} margin={{ top: 12, right: 12, left: -15, bottom: 8 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
              <Bar dataKey="aluno" name="Aluno" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28}>
                <LabelList dataKey="aluno" position="top" formatter={(value) => typeof value === 'number' ? value.toFixed(decimals) : ''} style={{ fill: '#1d4ed8', fontSize: 10, fontWeight: 800 }} />
              </Bar>
              <Bar dataKey="turma" name="Média da Turma" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={28}>
                <LabelList dataKey="turma" position="top" formatter={(value) => typeof value === 'number' ? value.toFixed(decimals) : ''} style={{ fill: '#475569', fontSize: 10, fontWeight: 800 }} />
              </Bar>
              <Bar dataKey="nivel" name="Média do Nível" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={28}>
                <LabelList dataKey="nivel" position="top" formatter={(value) => typeof value === 'number' ? value.toFixed(decimals) : ''} style={{ fill: '#0369a1', fontSize: 10, fontWeight: 800 }} />
              </Bar>
              <Bar dataKey="escola" name="Média da Escola" fill="#d97706" radius={[4, 4, 0, 0]} maxBarSize={28}>
                <LabelList dataKey="escola" position="top" formatter={(value) => typeof value === 'number' ? value.toFixed(decimals) : ''} style={{ fill: '#b45309', fontSize: 10, fontWeight: 800 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <p className="py-20 text-center text-xs font-bold text-slate-400">Sem notas para comparar nesta disciplina.</p>}
    </div>
  );
};



const parseNumberFromText = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text || text === '-') return null;
  const numeric = parseFloat(text.replace('%', '').replace(',', '.'));
  return Number.isNaN(numeric) ? null : numeric;
};

const getFaltaMetrics = (value) => {
  const text = String(value ?? '').trim();
  const numeric = parseNumberFromText(text);
  if (numeric === null) return { isValid: false, isPercent: false, value: null };
  return { isValid: true, isPercent: text.includes('%'), value: numeric };
};

const normalizeAttendanceKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s():%._-]+/g, '');

const isAttendanceIndexDisciplina = (value) => {
  const key = normalizeAttendanceKey(value);
  return key === 'F' ||
    key === 'AC' ||
    key === 'FTAN' ||
    key === 'FREAN' ||
    key === 'FREANPERCENT' ||
    key === 'FREQUENCIAANUAL' ||
    key === 'FREQUENCIAAN';
};

const toSafeFileName = (text) =>
  String(text || 'aluno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const escapeHtml = (text) =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const buildRadarSvgDataUri = ({ title, labels, datasets, maxValue = 10 }) => {
  if (!labels || labels.length === 0) return null;

  const width = 900;
  const height = 520;
  const cx = 280;
  const cy = 280;
  const radius = 180;
  const levels = 5;

  const pointByIndex = (index, valueRatio) => {
    const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / labels.length;
    const r = radius * valueRatio;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  const gridPolygons = Array.from({ length: levels }).map((_, levelIdx) => {
    const ratio = (levelIdx + 1) / levels;
    const points = labels.map((_, idx) => {
      const p = pointByIndex(idx, ratio);
      return `${p.x},${p.y}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="#dbeafe" stroke-width="1" />`;
  }).join('');

  const axes = labels.map((_, idx) => {
    const p = pointByIndex(idx, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#cbd5e1" stroke-width="1" />`;
  }).join('');

  const labelNodes = labels.map((label, idx) => {
    const p = pointByIndex(idx, 1.13);
    const short = String(label).length > 20 ? `${String(label).slice(0, 18)}...` : String(label);
    return `<text x="${p.x}" y="${p.y}" fill="#334155" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeHtml(short)}</text>`;
  }).join('');

  const dataPolygons = datasets.map((dataset) => {
    const points = labels.map((_, idx) => {
      const raw = Number(dataset.values[idx] ?? 0);
      const clamped = Math.max(0, Math.min(maxValue, raw));
      const p = pointByIndex(idx, clamped / maxValue);
      return `${p.x},${p.y}`;
    }).join(' ');

    const pointDots = labels.map((_, idx) => {
      const raw = Number(dataset.values[idx] ?? 0);
      const clamped = Math.max(0, Math.min(maxValue, raw));
      const p = pointByIndex(idx, clamped / maxValue);
      return `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${dataset.color}" />`;
    }).join('');

    return `
      <polygon points="${points}" fill="${dataset.color}" fill-opacity="0.18" stroke="${dataset.color}" stroke-width="2" />
      ${pointDots}
    `;
  }).join('');

  const legend = datasets.map((dataset, idx) => `
    <g transform="translate(560, ${95 + idx * 28})">
      <rect x="0" y="-10" width="14" height="14" fill="${dataset.color}" rx="3" />
      <text x="22" y="2" fill="#1e293b" font-size="13" font-weight="700">${escapeHtml(dataset.name)}</text>
    </g>
  `).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="40" y="48" fill="#1e3a8a" font-size="22" font-weight="800">${escapeHtml(title)}</text>
      <text x="40" y="70" fill="#64748b" font-size="12">Escala de 0 a ${maxValue}</text>
      <g>
        ${gridPolygons}
        ${axes}
        ${dataPolygons}
        ${labelNodes}
      </g>
      ${legend}
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const buildBarSvgDataUri = ({ title, labels, datasets, maxValue = 10 }) => {
  if (!labels || labels.length === 0) return null;

  const width = 900;
  const height = 700;
  const chartWidth = 700;
  const chartHeight = 350;
  const margin = { top: 80, right: 150, bottom: 150, left: 50 };

  const barCount = labels.length;
  const datasetCount = datasets.length;
  const groupWidth = (chartWidth / barCount) * 0.8;
  const barWidth = groupWidth / datasetCount;

  const getX = (barIdx, datasetIdx) => {
    const groupX = margin.left + (barIdx * (chartWidth / barCount)) + (chartWidth / barCount - groupWidth) / 2;
    return groupX + (datasetIdx * barWidth);
  };

  const getY = (value) => {
    const ratio = Math.max(0, Math.min(maxValue, Number(value || 0))) / maxValue;
    return margin.top + chartHeight - (ratio * chartHeight);
  };

  const bars = datasets.flatMap((dataset, dIdx) => 
    labels.map((_, bIdx) => {
      const val = dataset.values[bIdx];
      const y = getY(val);
      const h = margin.top + chartHeight - y;
      return `<rect x="${getX(bIdx, dIdx)}" y="${y}" width="${barWidth * 0.9}" height="${h}" fill="${dataset.color}" rx="2" />`;
    })
  ).join('');

  const barLabels = datasets.flatMap((dataset, dIdx) =>
    labels.map((_, bIdx) => {
      const val = dataset.values[bIdx];
      if (val == null) return '';
      const x = getX(bIdx, dIdx) + (barWidth * 0.9) / 2;
      const y = getY(val) - 5;
      const formattedVal = Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      return `<text x="${x}" y="${y}" fill="#000000" font-size="11" font-weight="700" text-anchor="middle">${formattedVal}</text>`;
    }).filter(v => v)
  ).join('');

  const gridLines = Array.from({ length: 6 }).map((_, i) => {
    const y = margin.top + (i * chartHeight / 5);
    const val = (maxValue - (i * maxValue / 5)).toFixed(0);
    return `
      <line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
      <text x="${margin.left - 10}" y="${y + 5}" fill="#64748b" font-size="10" text-anchor="end">${val}</text>
    `;
  }).join('');

  const xLabels = labels.map((label, i) => {
    const x = margin.left + (i * chartWidth / barCount) + (chartWidth / barCount) / 2;
    const short = String(label).length > 12 ? `${String(label).slice(0, 10)}...` : String(label);
    return `<g transform="translate(${x}, ${margin.top + chartHeight + 35}) rotate(45)">
      <text x="0" y="0" fill="#334155" font-size="11" font-weight="700" text-anchor="start" dominant-baseline="middle">${escapeHtml(short)}</text>
    </g>`;
  }).join('');

  const legend = datasets.map((dataset, idx) => `
    <g transform="translate(${margin.left + chartWidth + 20}, ${margin.top + idx * 25})">
      <rect width="14" height="14" fill="${dataset.color}" rx="3" />
      <text x="22" y="11" fill="#1e293b" font-size="12" font-weight="700">${escapeHtml(dataset.name)}</text>
    </g>
  `).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff" />
      <text x="40" y="45" fill="#1e3a8a" font-size="20" font-weight="800">${escapeHtml(title)}</text>
      <g>
        ${gridLines}
        ${bars}
        ${barLabels}
        ${xLabels}
      </g>
      ${legend}
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

const svgDataUriToPngBytes = async (svgDataUri, width = 1200, height = 700) => {
  if (!svgDataUri) return null;
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
  });
  image.src = svgDataUri;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
};

// ── Evolutivo Numérico: grid 2 colunas, tabela dentro de cada card ──
const EvolutivoNumerico = ({ historicoConceitos }) => {
  // Coleta todas as disciplinas únicas
  const allDisciplinasSet = new Set();
  historicoConceitos.forEach((bim) => {
    Object.keys(bim.notas)
      .filter((d) => !isAttendanceIndexDisciplina(d))
      .forEach((d) => allDisciplinasSet.add(d));
  });
  const allDisciplinas = Array.from(allDisciplinasSet);

  // Agrupa por área
  const areaMap = {};
  AREAS.forEach(a => { areaMap[a.key] = []; });
  areaMap['orientacoes'] = [];
  areaMap['outras'] = [];
  allDisciplinas.forEach(d => areaMap[classifyDisciplina(d)].push(d));

  const temFaltas = historicoConceitos.some(b => b.faltas && b.faltas !== '-');

  const faltasPorBimestre = historicoConceitos.map((bim) => {
    const tfRaw = bim.tfBimestre ?? bim.faltas ?? '-';
    const freqRaw = bim.freqBimestre ?? '-';
    const tfParsed = parseNumberFromText(tfRaw);
    const freqParsed = parseNumberFromText(freqRaw);

    // Fallback para dados antigos em que frequência vinha misturada no campo de faltas.
    const legacyMetrics = getFaltaMetrics(bim.faltas);
    const frequencia = freqParsed !== null
      ? (freqParsed <= 1 && !String(freqRaw).includes('%') ? Math.max(0, Math.min(100, freqParsed * 100)) : Math.max(0, Math.min(100, freqParsed)))
      : (legacyMetrics.isValid && legacyMetrics.isPercent
          ? Math.max(0, Math.min(100, 100 - legacyMetrics.value))
          : null);

    return {
      bimestre: bim.bimestre,
      faltasRaw: tfRaw,
      frequenciaRaw: freqRaw,
      frequencia,
      tfValue: tfParsed,
      attendanceIndexes: bim.attendanceIndexes || {},
    };
  });

  const totalFaltas = faltasPorBimestre
    .filter(item => item.tfValue !== null)
    .reduce((sum, item) => sum + item.tfValue, 0);

  const frequenciasValidas = faltasPorBimestre
    .filter(item => typeof item.frequencia === 'number')
    .map(item => item.frequencia);

  const mediaFrequencia = frequenciasValidas.length > 0
    ? frequenciasValidas.reduce((sum, val) => sum + val, 0) / frequenciasValidas.length
    : null;

  const calcularMediaDisciplina = (disciplina) => {
    const notasValidas = historicoConceitos
      .map((bim) => bim.notas[disciplina])
      .filter((nota) => nota !== undefined && nota !== null && String(nota).trim() !== '' && String(nota).trim() !== '-')
      .map((nota) => parseGrade(nota));

    if (notasValidas.length === 0) return null;
    const media = notasValidas.reduce((sum, nota) => sum + nota, 0) / notasValidas.length;
    return Number.isFinite(media) ? media : null;
  };

  const disciplinasComRisco = allDisciplinas
    .map((disciplina) => ({
      disciplina,
      media: calcularMediaDisciplina(disciplina),
    }))
    .filter((item) => item.media !== null && item.media < 5)
    .sort((a, b) => a.media - b.media);

  const renderAreaCard = (disciplinas, area) => {
    const headerBg     = area?.headerBg     ?? 'bg-slate-600';
    const headerText   = area?.headerText   ?? 'text-white';
    const label        = area?.label        ?? '📋 Outras Disciplinas';
    const borderColor  = area?.borderColor  ?? 'border-slate-200';
    const headBg       = area?.headBg       ?? 'bg-slate-50';
    const mediaPorDisciplina = disciplinas.map((disciplina) => calcularMediaDisciplina(disciplina));

    return (
      <div key={area?.key ?? 'outras'} className={`rounded-2xl overflow-hidden border ${borderColor} shadow-sm bg-white flex flex-col`}>
        {/* Header colorido */}
        <div className={`${headerBg} ${headerText} px-4 py-2.5 flex items-center justify-between shrink-0`}>
          <span className="text-xs font-black uppercase tracking-widest">{label}</span>
          <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{disciplinas.length} disc.</span>
        </div>

        {/* Tabela: colunas = disciplinas, linhas = bimestres — sem scroll lateral */}
        <div className="flex-1">
          <table className="w-full text-[10px] border-collapse table-fixed">
            <colgroup>
              <col className="w-20" />
              {disciplinas.map(d => <col key={d} />)}
            </colgroup>
            <thead>
              <tr className={headBg}>
                <th className="text-left px-3 py-2.5 font-black text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 whitespace-nowrap">
                  Bimestre
                </th>
                {disciplinas.map(d => (
                  <th key={d} className="px-2 py-2.5 font-black text-slate-600 text-center border-b border-r border-slate-200 last:border-r-0 leading-tight">
                    <span title={d} className="whitespace-normal break-words">{formatDisciplina(d)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historicoConceitos.map((bim, bi) => (
                <tr key={bi} className={`border-b border-slate-50 ${bi % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-100/60 transition-colors`}>
                  <td className="px-3 py-2.5 font-black text-blue-600 text-[9px] uppercase border-r border-slate-200 whitespace-nowrap">
                    {bim.bimestre.replace('º Bimestre', 'ºBi')}
                  </td>
                  {disciplinas.map(d => {
                    const nota = bim.notas[d] || '-';
                    return (
                      <td key={d} className="px-2 py-1.5 text-center border-r border-slate-100 last:border-r-0">
                        <span className={`inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-lg text-[11px] ${getNotaStyle(nota)}`}>
                          {nota}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-200">
                <td className="px-3 py-2.5 font-black text-slate-600 uppercase tracking-wider border-r border-slate-200 whitespace-nowrap">
                  Média Geral
                </td>
                {mediaPorDisciplina.map((media, idx) => (
                  <td key={disciplinas[idx]} className="px-2 py-1.5 text-center border-r border-slate-200 last:border-r-0">
                    {media !== null ? (
                      <span className={`inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-lg text-[11px] ${getNotaStyle(media.toFixed(1))}`}>
                        {media.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[11px] font-bold">-</span>
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const areasComDados = AREAS.filter(area => areaMap[area.key]?.length > 0);
  const temOE     = areaMap['orientacoes']?.length > 0;
  const temOutras = areaMap['outras']?.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2">Pontos de Atenção</p>
        {disciplinasComRisco.length === 0 ? (
          <p className="text-[11px] font-bold text-slate-700">Nenhuma disciplina abaixo de 5.0</p>
        ) : (
          <ul className="space-y-2 text-[11px] font-bold text-slate-700">
            {disciplinasComRisco.map((item) => (
              <li key={`disc-${item.disciplina}`} className="px-3 py-2 rounded-xl border border-amber-200 bg-white">
                Disciplina: {formatDisciplina(item.disciplina)} com média {item.media.toFixed(1)} (abaixo de 5.0)
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Card de OE sempre em primeiro */}
      {temOE && renderAreaCard(areaMap['orientacoes'], OE_AREA)}
      {areasComDados.map(area => renderAreaCard(areaMap[area.key], area))}
      {temOutras && renderAreaCard(areaMap['outras'], null)}

      <div className="rounded-2xl overflow-hidden border border-blue-200 shadow-sm bg-white">
        <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest">Indice de Frequencia e Faltas</span>
          <span className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full">Resumo Geral</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Total de Faltas</p>
            <p className="text-2xl font-black text-blue-800 mt-1">{totalFaltas.toFixed(0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">Frequência</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {mediaFrequencia !== null ? `${mediaFrequencia.toFixed(1).replace(/\.0$/, '')}%` : 'S/D'}
            </p>
          </div>
        </div>
        {temFaltas && (
          <div className="px-4 pb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Por Bimestre</p>
            <div className="flex flex-wrap gap-2">
              {faltasPorBimestre.map((item, idx) => (
                <div key={idx} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-700">
                  <span className="text-blue-600 font-black">{item.bimestre.replace('º Bimestre', 'ºBi')}</span>
                  <span className="mx-1">|</span>
                  <span>Faltas: {item.faltasRaw || '-'}</span>
                  <span className="mx-1">|</span>
                  <span>Freq.: {item.frequencia !== null ? `${item.frequencia.toFixed(1).replace(/\.0$/, '')}%` : (item.frequenciaRaw || 'S/D')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ── Componente principal: StudentProfile ─────────────────────
const StudentProfile = ({
  studentProfile, filteredNotes = studentProfile?.notes || [], studentSessions, studentSessionCounts,
  selectedSessionFilters, setSelectedSessionFilters,
  prevStudent, nextStudent, setSelectedStudent,
  chartDataMapao: _propMapao, chartDataProva: _propProva,
  filteredStudents = [], conceitoData = [], provaData = [], allStudents = [],
  defaultOpenNotes = false
}) => {
  const [isNotesOpen, setIsNotesOpen] = useState(defaultOpenNotes);
  const [selectedChartBimestre, setSelectedChartBimestre] = useState('evolucao');
  const [isExporting, setIsExporting] = useState(false);
  const [showPrintSelection, setShowPrintSelection] = useState(false);
  const [studentSelections, setStudentSelections] = useState({});
  const [maximizedChart, setMaximizedChart] = useState(null);
  const [occurrenceStartDate, setOccurrenceStartDate] = useState('');
  const [occurrenceEndDate, setOccurrenceEndDate] = useState('');

  React.useEffect(() => {
    setOccurrenceStartDate('');
    setOccurrenceEndDate('');
  }, [studentProfile?.nome]);

  const [sortFieldCC, setSortFieldCC] = useState('disciplina');
  const [sortOrderCC, setSortOrderCC] = useState('asc');
  const [sortFieldPP, setSortFieldPP] = useState('disciplina');
  const [sortOrderPP, setSortOrderPP] = useState('asc');
  const [selectedAnalysisCC, setSelectedAnalysisCC] = useState('');
  const [selectedAnalysisPP, setSelectedAnalysisPP] = useState('');

  const handleSortCC = (field) => {
    if (sortFieldCC === field) {
      setSortOrderCC(sortOrderCC === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldCC(field);
      setSortOrderCC(field === 'disciplina' ? 'asc' : 'desc');
    }
  };

  const handleSortPP = (field) => {
    if (sortFieldPP === field) {
      setSortOrderPP(sortOrderPP === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldPP(field);
      setSortOrderPP(field === 'disciplina' ? 'asc' : 'desc');
    }
  };

  const occurrenceDateRangeInvalid = Boolean(
    occurrenceStartDate && occurrenceEndDate && occurrenceStartDate > occurrenceEndDate
  );

  const notesForSelectedFilters = React.useMemo(() => {
    const notes = filteredNotes;
    if (occurrenceDateRangeInvalid) return [];

    return notes.filter((note) => {
      const noteDate = parseOccurrenceDate(note.displayDate || note.date || note.createdAt);
      if (occurrenceStartDate && (!noteDate || noteDate < occurrenceStartDate)) return false;
      if (occurrenceEndDate && (!noteDate || noteDate > occurrenceEndDate)) return false;
      if (selectedSessionFilters.length === 0) return true;
      const sessionType = note.tipoSessao && String(note.tipoSessao).trim() ? note.tipoSessao : 'Sem tipo';
      return selectedSessionFilters.includes(sessionType);
    });
  }, [filteredNotes, studentProfile, selectedSessionFilters, occurrenceStartDate, occurrenceEndDate, occurrenceDateRangeInvalid]);

  const bimestresDisponiveis = React.useMemo(() => {
    return Array.from(
      new Set([
        ...(studentProfile?.historicoConceitos || []).map(b => b.bimestre),
        ...(studentProfile?.historicoProvas || []).map(p => p.bimestre)
      ])
    ).filter(Boolean).sort();
  }, [studentProfile]);

  const chartDataMapao = React.useMemo(() => {
    if (_propMapao !== undefined) return _propMapao;
    return buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents, selectedChartBimestre);
  }, [_propMapao, studentProfile, conceitoData, provaData, allStudents, selectedChartBimestre]);

  const chartDataProva = React.useMemo(() => {
    if (_propProva !== undefined) return _propProva;
    return buildChartDataProva(studentProfile, conceitoData, provaData, allStudents, selectedChartBimestre);
  }, [_propProva, studentProfile, conceitoData, provaData, allStudents, selectedChartBimestre]);

  const evolucaoDados = React.useMemo(() => {
    return bimestresDisponiveis.map(bim => {
      const ccData = buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents, bim);
      let ccAlunoSum = 0, ccAlunoCount = 0;
      let ccTurmaSum = 0, ccTurmaCount = 0;
      ccData.forEach(d => {
        if (d.Aluno > 0) { ccAlunoSum += d.Aluno; ccAlunoCount++; }
        if (d.Turma > 0) { ccTurmaSum += d.Turma; ccTurmaCount++; }
      });
      const mediaCcAluno = ccAlunoCount > 0 ? Number((ccAlunoSum / ccAlunoCount).toFixed(1)) : 0;
      const mediaCcTurma = ccTurmaCount > 0 ? Number((ccTurmaSum / ccTurmaCount).toFixed(1)) : 0;

      const ppData = buildChartDataProva(studentProfile, conceitoData, provaData, allStudents, bim);
      let ppAlunoSum = 0, ppAlunoCount = 0;
      let ppTurmaSum = 0, ppTurmaCount = 0;
      ppData.forEach(d => {
        if (d.Aluno > 0) { ppAlunoSum += d.Aluno; ppAlunoCount++; }
        if (d.Turma > 0) { ppTurmaSum += d.Turma; ppTurmaCount++; }
      });
      const mediaPpAluno = ppAlunoCount > 0 ? Number((ppAlunoSum / ppAlunoCount).toFixed(2)) : 0;
      const mediaPpTurma = ppTurmaCount > 0 ? Number((ppTurmaSum / ppTurmaCount).toFixed(2)) : 0;

      return {
        bimestre: bim.replace('º Bimestre', 'º Bim'),
        ccAluno: mediaCcAluno,
        ccTurma: mediaCcTurma,
        ppAluno: mediaPpAluno,
        ppTurma: mediaPpTurma
      };
    });
  }, [bimestresDisponiveis, studentProfile, conceitoData, provaData, allStudents]);

  const disciplinasEvolucaoCC = React.useMemo(() => {
    const historico = studentProfile?.historicoConceitos || [];
    const discSet = new Set();
    historico.forEach(b => {
      Object.keys(b.notas || {}).forEach(d => {
        const val = parseGrade(b.notas[d]);
        if (val > 0 || (b.notas[d] && b.notas[d] !== '-')) discSet.add(d);
      });
    });
    const disciplinas = Array.from(discSet);
    
    const list = disciplinas.map(d => {
      const notasPorBim = {};
      let soma = 0, count = 0;
      historico.forEach(b => {
        const raw = b.notas?.[d];
        const notaNum = parseGrade(raw);
        notasPorBim[b.bimestre] = (raw !== undefined && raw !== null && raw !== '') ? raw : '-';
        if (notaNum > 0) { soma += notaNum; count++; }
      });
      const media = count > 0 ? Number((soma / count).toFixed(1)) : null;
      return { disciplina: formatDisciplina(d), rawName: d, notasPorBim, media };
    }).filter(item => item.media !== null && item.media > 0);

    return list.sort((a, b) => {
      let valA, valB;
      if (sortFieldCC === 'disciplina') {
        return sortOrderCC === 'asc' 
          ? a.disciplina.localeCompare(b.disciplina)
          : b.disciplina.localeCompare(a.disciplina);
      } else if (sortFieldCC === 'media') {
        valA = a.media !== null ? a.media : -1;
        valB = b.media !== null ? b.media : -1;
      } else if (sortFieldCC === 'situacao') {
        valA = a.media !== null ? (a.media >= 5 ? 1 : 0) : -1;
        valB = b.media !== null ? (b.media >= 5 ? 1 : 0) : -1;
      } else {
        valA = parseGrade(a.notasPorBim[sortFieldCC]) || -1;
        valB = parseGrade(b.notasPorBim[sortFieldCC]) || -1;
      }
      return sortOrderCC === 'asc' ? valA - valB : valB - valA;
    });
  }, [studentProfile, sortFieldCC, sortOrderCC]);

  const disciplinasEvolucaoPP = React.useMemo(() => {
    const historico = studentProfile?.historicoProvas || [];
    const discSet = new Set();
    historico.forEach(p => {
      Object.keys(p.notas || {}).forEach(d => {
        if (toScale10(p.notas[d]) !== null) discSet.add(d);
      });
    });
    const disciplinas = Array.from(discSet);

    const list = disciplinas.map(d => {
      const notasPorBim = {};
      let soma = 0, count = 0;
      historico.forEach(p => {
        const raw = p.notas?.[d];
        const nVal = toScale10(raw);
        notasPorBim[p.bimestre] = nVal !== null ? nVal.toFixed(2) : (raw || '-');
        if (nVal !== null) { soma += nVal; count++; }
      });
      const media = count > 0 ? Number((soma / count).toFixed(2)) : null;
      return { disciplina: formatDisciplina(d), rawName: d, notasPorBim, media };
    }).filter(item => item.media !== null && item.media > 0);

    return list.sort((a, b) => {
      let valA, valB;
      if (sortFieldPP === 'disciplina') {
        return sortOrderPP === 'asc'
          ? a.disciplina.localeCompare(b.disciplina)
          : b.disciplina.localeCompare(a.disciplina);
      } else if (sortFieldPP === 'media') {
        valA = a.media !== null ? a.media : -1;
        valB = b.media !== null ? b.media : -1;
      } else {
        valA = toScale10(a.notasPorBim[sortFieldPP]) || -1;
        valB = toScale10(b.notasPorBim[sortFieldPP]) || -1;
      }
      return sortOrderPP === 'asc' ? valA - valB : valB - valA;
    });
  }, [studentProfile, sortFieldPP, sortOrderPP]);

  const tabelasBimestraisCC = React.useMemo(() => {
    return (studentProfile?.historicoConceitos || []).map((bimestre) => {
      const rows = Object.entries(bimestre.notas || {})
        .filter(([disciplina]) => !isAttendanceIndexDisciplina(disciplina))
        .map(([disciplina, notaRaw]) => ({
          disciplina: formatDisciplina(disciplina),
          rawName: disciplina,
          nota: parseGrade(notaRaw),
        }))
        .filter((row) => row.nota !== null && row.nota > 0);
      const media = rows.length > 0
        ? rows.reduce((sum, row) => sum + row.nota, 0) / rows.length
        : null;
      return { bimestre: bimestre.bimestre, rows, media };
    });
  }, [studentProfile]);

  const tabelasBimestraisPP = React.useMemo(() => {
    return (studentProfile?.historicoProvas || []).map((bimestre) => {
      const rows = Object.entries(bimestre.notas || {})
        .map(([disciplina, notaRaw]) => ({
          disciplina: formatDisciplina(disciplina),
          rawName: disciplina,
          nota: toScale10(notaRaw),
        }))
        .filter((row) => row.nota !== null);
      const media = rows.length > 0
        ? rows.reduce((sum, row) => sum + row.nota, 0) / rows.length
        : null;
      return { bimestre: bimestre.bimestre, rows, media };
    });
  }, [studentProfile]);

  const evolucaoDisciplinasCC = React.useMemo(() => {
    const historico = studentProfile?.historicoConceitos || [];
    const bimestres = historico.map((item) => item.bimestre).filter(Boolean);
    const disciplinas = Array.from(new Set(
      historico.flatMap((item) => Object.keys(item.notas || {}).filter((disciplina) => !isAttendanceIndexDisciplina(disciplina)))
    )).sort((a, b) => formatDisciplina(a).localeCompare(formatDisciplina(b), 'pt-BR'));

    return {
      bimestres,
      disciplinas: disciplinas.map((disciplina) => ({
        disciplina,
        label: formatDisciplina(disciplina),
        values: bimestres.map((bimestre) => {
          const registro = historico.find((item) => item.bimestre === bimestre);
          const nota = parseGrade(registro?.notas?.[disciplina]);
          return nota !== null && nota > 0 ? Number(nota.toFixed(1)) : null;
        }),
      })),
    };
  }, [studentProfile]);

  const evolucaoDisciplinasPP = React.useMemo(() => {
    const historico = studentProfile?.historicoProvas || [];
    const bimestres = historico.map((item) => item.bimestre).filter(Boolean);
    const disciplinas = Array.from(new Set(
      historico.flatMap((item) => Object.keys(item.notas || {}))
    )).sort((a, b) => formatDisciplina(a).localeCompare(formatDisciplina(b), 'pt-BR'));

    return {
      bimestres,
      disciplinas: disciplinas.map((disciplina) => ({
        disciplina,
        label: formatDisciplina(disciplina),
        values: bimestres.map((bimestre) => {
          const registro = historico.find((item) => item.bimestre === bimestre);
          const nota = toScale10(registro?.notas?.[disciplina]);
          return nota !== null ? Number(nota.toFixed(2)) : null;
        }),
      })),
    };
  }, [studentProfile]);

  // Somente disciplinas com pelo menos uma nota lançada para o aluno
  const analysisOptionsCC = React.useMemo(
    () => evolucaoDisciplinasCC.disciplinas
      .filter((item) => item.values.some((value) => value !== null))
      .map((item) => ({ value: item.disciplina, label: item.label })),
    [evolucaoDisciplinasCC]
  );

  const analysisOptionsPP = React.useMemo(
    () => evolucaoDisciplinasPP.disciplinas
      .filter((item) => item.values.some((value) => value !== null))
      .map((item) => ({ value: item.disciplina, label: item.label })),
    [evolucaoDisciplinasPP]
  );

  const activeAnalysisCC = analysisOptionsCC.some((o) => o.value === selectedAnalysisCC)
    ? selectedAnalysisCC
    : analysisOptionsCC[0]?.value || '';
  const activeAnalysisPP = analysisOptionsPP.some((o) => o.value === selectedAnalysisPP)
    ? selectedAnalysisPP
    : analysisOptionsPP[0]?.value || '';

  const guidedAnalysisCC = React.useMemo(() => {
    if (!activeAnalysisCC) return { label: '', data: [], summary: null };
    const label = formatDisciplina(activeAnalysisCC);
    const data = (studentProfile?.historicoConceitos || []).map((bimestre) => {
      const point = buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents, bimestre.bimestre)
        .find((item) => item.fullSubject === label);
      return {
        bimestre: String(bimestre.bimestre || '').replace('º Bimestre', 'º Bi'),
        aluno: point?.Aluno ?? null,
        turma: point?.Turma > 0 ? point.Turma : null,
        nivel: point?.Nivel > 0 ? point.Nivel : null,
        escola: point?.Escola > 0 ? point.Escola : null,
      };
    }).filter((item) => item.aluno !== null || item.turma !== null || item.nivel !== null || item.escola !== null);
    return { label, data, summary: buildAnalysisSummary(data) };
  }, [activeAnalysisCC, studentProfile, conceitoData, provaData, allStudents]);

  const guidedAnalysisPP = React.useMemo(() => {
    if (!activeAnalysisPP) return { label: '', data: [], summary: null };
    const label = formatDisciplina(activeAnalysisPP);
    const data = (studentProfile?.historicoProvas || []).map((bimestre) => {
      const point = buildChartDataProva(studentProfile, conceitoData, provaData, allStudents, bimestre.bimestre)
        .find((item) => item.fullSubject === label);
      return {
        bimestre: String(bimestre.bimestre || '').replace('º Bimestre', 'º Bi'),
        aluno: point?.Aluno ?? null,
        turma: point?.Turma > 0 ? point.Turma : null,
        nivel: point?.Nivel > 0 ? point.Nivel : null,
        escola: point?.Escola > 0 ? point.Escola : null,
      };
    }).filter((item) => item.aluno !== null || item.turma !== null || item.nivel !== null || item.escola !== null);
    return { label, data, summary: buildAnalysisSummary(data) };
  }, [activeAnalysisPP, studentProfile, conceitoData, provaData, allStudents]);

  // ── Cálculo da média do Conselho Bimestral ─────────────────
  const parseToNum = (v) => {
    if (v === undefined || v === null) return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  };

  const conselhoNumbers = (chartDataMapao || []).map(item => parseToNum(item.Aluno)).filter(n => n != null);
  const conselhoMean = conselhoNumbers.length ? (conselhoNumbers.reduce((s, x) => s + x, 0) / conselhoNumbers.length) : null;
  const conselhoMeanStr = conselhoMean !== null ? conselhoMean.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'S/D';

  const provaNumbers = (chartDataProva || []).map(item => parseToNum(item.Aluno)).filter(n => n != null);
  const provaMean = provaNumbers.length ? (provaNumbers.reduce((s, x) => s + x, 0) / provaNumbers.length) : null;
  const naoEfetuouPPCount = (chartDataProva || []).filter(item => item.naoEfetuou).length;
  const naoEfetuouPPNames = (chartDataProva || []).filter(item => item.naoEfetuou).map(item => item.fullSubject || item.subject).join(', ');
  const provaMeanStr = provaMean !== null ? provaMean.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (studentProfile?.provaPaulista || 'S/D');

  const frequenciaConsolidada = React.useMemo(() => {
    if (studentProfile?.frequenciaMedia != null) {
      const val = studentProfile.frequenciaMedia;
      return typeof val === 'number' ? `${val.toFixed(1).replace(/\.0$/, '')}%` : (String(val).includes('%') ? String(val) : `${val}%`);
    }
    if (studentProfile?.frequenciaGeralNum != null) {
      return `${studentProfile.frequenciaGeralNum.toFixed(1).replace(/\.0$/, '')}%`;
    }
    if (studentProfile?.frequenciaGeralRaw && studentProfile.frequenciaGeralRaw !== '-' && studentProfile.frequenciaGeralRaw !== 'S/D') {
      const raw = String(studentProfile.frequenciaGeralRaw);
      return raw.includes('%') ? raw : `${raw}%`;
    }
    if (studentProfile?.frequencia && studentProfile.frequencia !== '-' && studentProfile.frequencia !== 'S/D') {
      const raw = String(studentProfile.frequencia);
      return raw.includes('%') ? raw : `${raw}%`;
    }
    const historico = studentProfile?.historicoConceitos || [];
    const freqs = [];
    historico.forEach(b => {
      const raw = b.freqBimestre ?? b.frequencia;
      if (raw && raw !== '-' && raw !== 'S/D') {
        const num = parseFloat(String(raw).replace('%', '').replace(',', '.'));
        if (!isNaN(num)) freqs.push(num <= 1 && !String(raw).includes('%') ? num * 100 : num);
      }
    });
    if (freqs.length > 0) {
      const avg = freqs.reduce((a, b) => a + b, 0) / freqs.length;
      return `${avg.toFixed(1).replace(/\.0$/, '')}%`;
    }
    return 'S/D';
  }, [studentProfile]);

  const heroMetrics = React.useMemo(() => {
    if (selectedChartBimestre === 'evolucao') {
      let ccSum = 0, ccCount = 0;
      disciplinasEvolucaoCC.forEach(d => { if (d.media != null) { ccSum += d.media; ccCount++; } });
      const mediaCC = ccCount > 0 ? (ccSum / ccCount).toFixed(1) : null;

      let ppSum = 0, ppCount = 0;
      disciplinasEvolucaoPP.forEach(d => { if (d.media != null) { ppSum += d.media; ppCount++; } });
      const mediaPP = ppCount > 0 ? (ppSum / ppCount).toFixed(2) : null;

      return {
        label: 'Consolidado Histórico',
        mediaCC: mediaCC ? Number(mediaCC).toLocaleString('pt-BR') : (studentProfile?.mediaGeral ? Number(studentProfile.mediaGeral).toLocaleString('pt-BR') : null),
        mediaPP: mediaPP ? Number(mediaPP).toLocaleString('pt-BR') : (studentProfile?.provaPaulista || null),
        frequencia: frequenciaConsolidada
      };
    } else {
      const isUltimo = selectedChartBimestre === 'ultimo';
      const targetBim = isUltimo ? (studentProfile?.historicoConceitos?.[0]?.bimestre || 'Mais Recente') : selectedChartBimestre;

      const bimConceito = studentProfile?.historicoConceitos?.find(b => b.bimestre === selectedChartBimestre || (isUltimo && b === studentProfile?.historicoConceitos?.[0]));
      const freqRaw = bimConceito?.freqBimestre || frequenciaConsolidada || null;

      let ppVal = provaMean !== null ? provaMean.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
      if (ppVal === null) {
        if (chartDataProva.length > 0) {
          ppVal = 'S/N';
        } else if (isUltimo) {
          ppVal = studentProfile?.provaPaulista || null;
        }
      }

      return {
        label: isUltimo ? 'Mais Recente' : selectedChartBimestre,
        mediaCC: conselhoMean !== null ? conselhoMean.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null,
        mediaPP: ppVal,
        naoEfetuouPPCount,
        naoEfetuouPPNames,
        frequencia: freqRaw ? (String(freqRaw).includes('%') ? String(freqRaw) : `${freqRaw}%`) : 'S/D'
      };
    }
  }, [selectedChartBimestre, conselhoMean, provaMean, chartDataProva, disciplinasEvolucaoCC, disciplinasEvolucaoPP, studentProfile, naoEfetuouPPNames, frequenciaConsolidada]);

  // ── Impressão de gráfico individual ou Anotações ───────────
  const printChart = async (chartRef, title) => {
    if (!chartRef) return;

    const nome = escapeHtml(studentProfile?.nome || '');
    const turma = escapeHtml(studentProfile?.turma || '');
    const tutor = escapeHtml(studentProfile?.tutor || '');
    const situacao = escapeHtml(studentProfile?.situacao || 'Ativo');
    const isNotesReport = title === 'Anotações' || title === 'Anotações e Sessões';

    try {
      let contentHtml = '';

      if (isNotesReport) {
        // Gera conteúdo limpo, profissional e elegante para o relatório de anotações
        const filterPills = [];
        if (occurrenceStartDate || occurrenceEndDate) {
          const startStr = occurrenceStartDate ? occurrenceStartDate.split('-').reverse().join('/') : 'Início';
          const endStr = occurrenceEndDate ? occurrenceEndDate.split('-').reverse().join('/') : 'Atual';
          filterPills.push(`Período: ${startStr} a ${endStr}`);
        }
        if (selectedSessionFilters && selectedSessionFilters.length > 0) {
          filterPills.push(`Tipos: ${selectedSessionFilters.join(', ')}`);
        }

        const getAccentColor = (tipo) => {
          const t = (tipo || '').toUpperCase();
          if (t.includes('ATITUDINAL')) return '#7c3aed';
          if (t.includes('PEDAG')) return '#2563eb';
          if (t.includes('INDIVIDUAL')) return '#0891b2';
          if (t.includes('ORIENTA')) return '#0284c7';
          return '#64748b';
        };

        const getPillStyles = (tipo) => {
          const t = (tipo || '').toUpperCase();
          if (t.includes('ATITUDINAL')) return 'background:#f5f3ff; color:#6d28d9; border:1px solid #ddd6fe;';
          if (t.includes('PEDAG')) return 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;';
          if (t.includes('INDIVIDUAL')) return 'background:#ecfeff; color:#0e7490; border:1px solid #a5f3fc;';
          if (t.includes('ORIENTA')) return 'background:#f0f9ff; color:#0369a1; border:1px solid #bae6fd;';
          return 'background:#f1f5f9; color:#475569; border:1px solid #e2e8f0;';
        };

        const notesList = notesForSelectedFilters.length === 0
          ? `
            <div style="background:#f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 40px 24px; text-align: center; color: #64748b; font-size: 13px; font-weight: 700;">
              Nenhuma anotação registrada para o estudante no filtro atual.
            </div>
          `
          : notesForSelectedFilters.map((n) => {
              const author = escapeHtml(n.teacher || 'Não informado');
              const dateStr = escapeHtml(formatOccurrenceDateTime(n.displayDate || n.date || n.createdAt));
              const tipo = escapeHtml(n.tipoSessao || '');
              const noteText = escapeHtml(n.note || 'Sem descrição.');
              const accentColor = getAccentColor(n.tipoSessao);
              const pillStyle = getPillStyles(n.tipoSessao);

              return `
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid ${accentColor}; border-radius: 10px; padding: 14px 18px; margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px; font-size: 11px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                      <span style="font-weight: 800; color: #0f172a;">
                        Autor: ${author}
                      </span>
                      <span style="color: #64748b; font-weight: 600;">
                        Data: ${dateStr}
                      </span>
                    </div>
                    ${tipo ? `
                      <span style="${pillStyle} padding: 3px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${tipo}
                      </span>
                    ` : ''}
                  </div>
                  <div style="font-size: 12px; line-height: 1.6; color: #334155; font-weight: 500; white-space: pre-wrap;">${noteText}</div>
                </div>
              `;
            }).join('');

        contentHtml = `
          <div style="width: 100%;">
            ${filterPills.length > 0 ? `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; margin-bottom: 14px; font-size: 11px; color: #475569; font-weight: 600;">
                <strong>Filtros aplicados:</strong> ${escapeHtml(filterPills.join(' • '))}
              </div>
            ` : ''}
            <div>${notesList}</div>
          </div>
        `;
      } else {
        // Gráficos padrão: clona e ajusta SVG
        const clone = chartRef.cloneNode(true);
        const btn = clone.querySelector('button[data-print-control], button[title="Imprimir este gráfico"]');
        if (btn) btn.remove();

        const svgs = clone.querySelectorAll('svg');
        svgs.forEach(svg => {
          const wStr = svg.getAttribute('width');
          const hStr = svg.getAttribute('height');
          const w = parseInt(wStr || '0', 10);
          const h = parseInt(hStr || '0', 10);
          if (w > 100 && h > 100) {
            if (!svg.getAttribute('viewBox')) {
              svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            }
            svg.style.width = '100%';
            svg.style.height = 'auto';
            svg.style.maxWidth = '100%';
          }
        });

        contentHtml = `
          <div style="width: 100%; display: flex; justify-content: center; page-break-inside: avoid; break-inside: avoid;">
            <div style="width: 100%; max-width: 800px;">
              ${clone.outerHTML}
            </div>
          </div>
        `;
      }

      // Container de impressão nativa
      const containerId = 'mobile-print-container';
      let printContainer = document.getElementById(containerId);
      if (printContainer) printContainer.remove();

      printContainer = document.createElement('div');
      printContainer.id = containerId;

      printContainer.innerHTML = `
        <div style="width: 100%; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; padding: 4px 10px;">
          <!-- Cabeçalho Executivo -->
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div>
                <div style="font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 3px;">
                  TutorDash • Gestão & Acompanhamento Escolar
                </div>
                <h1 style="font-size: 19px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.3px;">
                  ${isNotesReport ? 'Relatório de Anotações do Estudante' : escapeHtml(title)}
                </h1>
                <p style="font-size: 11px; color: #64748b; font-weight: 600; margin: 3px 0 0 0;">
                  ${isNotesReport ? 'Histórico pedagógico, acompanhamento atitudinal e registros de atendimentos' : 'Painel de Desempenho e Acompanhamento Acadêmico'}
                </p>
              </div>
              <div style="text-align: right; font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.5;">
                <div>Emissão: <strong style="color: #0f172a;">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                <div style="margin-top: 4px;">
                  <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 9999px; font-weight: 800; font-size: 9px; text-transform: uppercase;">
                    ${situacao}
                  </span>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px;">
              <div>
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Estudante</span>
                <span style="font-size: 13px; font-weight: 800; color: #0f172a;">${nome}</span>
              </div>
              <div>
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Turma</span>
                <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${turma}</span>
              </div>
              <div>
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">Tutor(a)</span>
                <span style="font-size: 13px; font-weight: 700; color: #1e293b;">${tutor || 'Não atribuído'}</span>
              </div>
              <div>
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">${isNotesReport ? 'Registros' : 'Conselho'}</span>
                <span style="font-size: 13px; font-weight: 800; color: #2563eb;">${isNotesReport ? `${notesForSelectedFilters.length} registros` : (heroMetrics?.mediaCC != null ? heroMetrics.mediaCC : '-')}</span>
              </div>
            </div>
          </div>

          <!-- Conteúdo Principal -->
          <div style="width: 100%;">
            ${contentHtml}
          </div>

          <!-- Termo de Ciência e Assinaturas -->
          <div class="avoid-break" style="margin-top: 28px; padding-top: 10px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              Termo de Ciência e Assinaturas
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Card 1: Tutor(a) -->
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; padding-right: 20px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Tutor(a) Responsável</div>
                  <div style="font-size: 11.5px; font-weight: 800; color: #0f172a;">${tutor ? `Prof(a). ${tutor}` : 'Tutor(a) / Professor(a)'}</div>
                  <div style="font-size: 9px; color: #64748b; font-weight: 500;">Docente tutor(a) responsável pelo acompanhamento</div>
                </div>
                <div style="width: 250px; text-align: center; flex-shrink: 0;">
                  <div style="border-top: 1.5px solid #475569; margin-top: 24px; margin-bottom: 4px;"></div>
                  <div style="font-size: 9px; color: #475569; font-weight: 700;">Assinatura do(a) Tutor(a)</div>
                </div>
              </div>

              <!-- Card 2: Coordenação -->
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; padding-right: 20px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Coordenação Pedagógica</div>
                  <div style="font-size: 11.5px; font-weight: 800; color: #0f172a;">Equipe Gestora / Coordenação</div>
                  <div style="font-size: 9px; color: #64748b; font-weight: 500;">Visto institucional e validação escolar</div>
                </div>
                <div style="width: 250px; text-align: center; flex-shrink: 0;">
                  <div style="border-top: 1.5px solid #475569; margin-top: 24px; margin-bottom: 4px;"></div>
                  <div style="font-size: 9px; color: #475569; font-weight: 700;">Visto / Carimbo Escolar</div>
                </div>
              </div>

              <!-- Card 3: Estudante / Responsável -->
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; padding-right: 20px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Estudante / Responsável Legal</div>
                  <div style="font-size: 11.5px; font-weight: 800; color: #0f172a;">${nome}</div>
                  <div style="font-size: 9px; color: #64748b; font-weight: 500;">Ciência do acompanhamento de rendimento e assiduidade</div>
                </div>
                <div style="width: 250px; text-align: center; flex-shrink: 0;">
                  <div style="border-top: 1.5px solid #475569; margin-top: 20px; margin-bottom: 4px;"></div>
                  <div style="font-size: 9px; color: #475569; font-weight: 700;">Assinatura do(a) Estudante ou Responsável</div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 600; margin-top: 3px;">Data: ____ / ____ / ________</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Rodapé -->
          <div class="avoid-break" style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #94a3b8; font-weight: 600; page-break-inside: avoid; break-inside: avoid;">
            <span>TutorDash • Relatório Oficial de Acompanhamento</span>
            <span>Documento confidencial para fins escolares</span>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      // Injeta estilos temporários para esconder o resto do site na impressão
      const styleId = 'mobile-print-style';
      let styleTag = document.getElementById(styleId);
      if (styleTag) styleTag.remove();

      styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = `
        @media screen {
          #${containerId} { display: none !important; }
        }
        @media print {
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          body > *:not(#${containerId}):not(script):not(style) {
            display: none !important;
          }
          #${containerId} {
            display: block !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
          }
          @page {
            margin: 10mm 12mm 10mm 12mm;
            size: portrait;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `;
      document.head.appendChild(styleTag);

      // Timeout para garantir que o navegador aplique os estilos e renderize o SVG clonado
      setTimeout(() => {
        window.print();
        
        // Remove os elementos de impressão do DOM após acionar a impressão.
        // Damos um tempo razoável para a caixa de diálogo abrir.
        setTimeout(() => {
          if (printContainer.parentNode) printContainer.remove();
          if (styleTag.parentNode) styleTag.remove();
        }, 1000);
      }, 300);

    } catch (err) {
      console.error('Erro na impressão nativa:', err);
    }
  };

  const bimestreRadarLabel = selectedChartBimestre === 'ultimo'
    ? (studentProfile?.ultimoBimNome && String(studentProfile.ultimoBimNome).trim() !== 'Sem Dados' ? studentProfile.ultimoBimNome : 'Bimestre atual')
    : selectedChartBimestre;

  const buildReportData = () => {
    const historico = studentProfile?.historicoConceitos || [];
    const disciplinas = Array.from(
      new Set(
        historico.flatMap((bim) =>
          Object.keys(bim.notas || {}).filter((disciplina) => !isAttendanceIndexDisciplina(disciplina))
        )
      )
    );

    const notasRows = historico.map((bim) => ({
      bimestre: bim.bimestre || '-',
      faltas: bim.faltas || '-',
      notas: disciplinas.map((disciplina) => bim.notas?.[disciplina] || '-'),
    }));

    const notasComTipo = (studentProfile?.notes || []).map((note) => ({
      data: note.displayDate || '-',
      tipo: note.tipoSessao || 'Sem tipo',
      professor: note.teacher || '-',
      anotacao: note.note || 'Registo sem descrição.',
    }));

    const mapaoRows = (chartDataMapao || []).map((item) => ({
      disciplina: item.fullSubject || item.subject || '-',
      aluno: item.Aluno ?? '-',
      turma: item.Turma ?? '-',
    }));

    const provaRows = (chartDataProva || []).map((item) => ({
      disciplina: item.fullSubject || item.subject || '-',
      aluno:      item.Aluno != null ? Number(item.Aluno).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
      turma:      item.Turma != null ? Number(item.Turma).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
    }));

    const radarMapaoUri = buildRadarSvgDataUri({
      title: 'Radar de Equilibrio (Aluno vs Media da Turma)',
      labels: mapaoRows.map((row) => row.disciplina),
      datasets: [
        {
          name: 'Aluno',
          color: '#2563eb',
          values: mapaoRows.map((row) => Number(row.aluno) || 0),
        },
        {
          name: 'Media da Turma',
          color: '#64748b',
          values: mapaoRows.map((row) => Number(row.turma) || 0),
        },
      ],
    });

    const radarProvaUri = buildRadarSvgDataUri({
      title: 'Radar de Desempenho (Prova Paulista)',
      labels: provaRows.map((row) => row.disciplina),
      datasets: [
        {
          name: 'Média da Turma',
          color: '#94a3b8',
          values: provaRows.map((row) => parseFloat(String(row.turma).replace(',', '.')) || 0),
        },
        {
          name: 'Aluno',
          color: '#0ea5e9',
          values: provaRows.map((row) => parseFloat(String(row.aluno).replace(',', '.')) || 0),
        },
      ],
    });

    const barMapaoUri = buildBarSvgDataUri({
      title: 'Desempenho por Disciplina (Conselho)',
      labels: mapaoRows.map(r => r.disciplina),
      datasets: [
        { name: 'Média Turma', color: '#cbd5e1', values: mapaoRows.map(r => parseFloat(String(r.turma).replace(',','.')) || 0) },
        { name: 'Aluno', color: '#3b82f6', values: mapaoRows.map(r => parseFloat(String(r.aluno).replace(',','.')) || 0) }
      ]
    });

    const barProvaUri = buildBarSvgDataUri({
      title: 'Desempenho por Disciplina (Prova Paulista)',
      labels: provaRows.map(r => r.disciplina),
      datasets: [
        { name: 'Média Turma', color: '#cbd5e1', values: provaRows.map(r => parseFloat(String(r.turma).replace(',','.')) || 0) },
        { name: 'Aluno', color: '#3b82f6', values: provaRows.map(r => parseFloat(String(r.aluno).replace(',','.')) || 0) }
      ]
    });

    const barEvolucaoCcUri = buildBarSvgDataUri({
      title: 'Trajetória Média Geral — Conselho Bimestral',
      labels: (evolucaoDados || []).map(d => d.bimestre),
      datasets: [
        { name: 'Média da Turma', color: '#cbd5e1', values: (evolucaoDados || []).map(d => d.ccTurma || 0) },
        { name: 'Nota do Aluno', color: '#3b82f6', values: (evolucaoDados || []).map(d => d.ccAluno || 0) }
      ]
    });

    const barEvolucaoPpUri = buildBarSvgDataUri({
      title: 'Trajetória Média Geral — Prova Paulista',
      labels: (evolucaoDados || []).map(d => d.bimestre),
      datasets: [
        { name: 'Média da Turma', color: '#94a3b8', values: (evolucaoDados || []).map(d => d.ppTurma || 0) },
        { name: 'Nota do Aluno', color: '#0ea5e9', values: (evolucaoDados || []).map(d => d.ppAluno || 0) }
      ]
    });

    return {
      historico,
      disciplinas,
      notasRows,
      notasComTipo,
      mapaoRows,
      provaRows,
      radarMapaoUri,
      radarProvaUri,
      barMapaoUri,
      barProvaUri,
      barEvolucaoCcUri,
      barEvolucaoPpUri
    };
  };

  const handleExportPdf = async () => {
    if (!studentProfile) return;

    let container = null;
    try {
      setIsExporting(true);
      const { default: html2pdf } = await import('html2pdf.js');
      const { notasComTipo, mapaoRows, provaRows, radarMapaoUri, radarProvaUri, barMapaoUri, barProvaUri, barEvolucaoCcUri, barEvolucaoPpUri } = buildReportData();
      const fileBase = `relatorio_${toSafeFileName(studentProfile.nome)}`;

      // Calcula médias para exibição no PDF
      const parseToNum = (v) => {
        if (v === undefined || v === null) return null;
        const n = parseFloat(String(v).replace(',', '.'));
        return Number.isNaN(n) ? null : n;
      };

      const conselhoNumbers = (mapaoRows || []).map(r => parseToNum(r.aluno)).filter(n => n != null);
      const conselhoMean = conselhoNumbers.length ? (conselhoNumbers.reduce((s, x) => s + x, 0) / conselhoNumbers.length) : null;
      const conselhoMeanStr = conselhoMean !== null ? conselhoMean.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'S/D';

      const provaNumbers = (provaRows || []).map(r => parseToNum(r.aluno)).filter(n => n != null);
      const provaMean = provaNumbers.length ? (provaNumbers.reduce((s, x) => s + x, 0) / provaNumbers.length) : null;
      const provaMeanStr = provaMean !== null ? provaMean.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (studentProfile.provaPaulista || 'S/D');

      const notesHtml = notasComTipo.length > 0
        ? notasComTipo.map((note) => `
          <tr>
            <td>${escapeHtml(note.data)}</td>
            <td>${escapeHtml(note.tipo)}</td>
            <td>${escapeHtml(note.professor)}</td>
            <td>${escapeHtml(note.anotacao)}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="4">Sem anotações registradas.</td></tr>`;

      const mapaoHtml = mapaoRows.length > 0
        ? mapaoRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.disciplina)}</td>
            <td style="text-align: center;">${escapeHtml(row.aluno)}</td>
            <td style="text-align: center;">${escapeHtml(row.turma)}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="3">Sem dados para o Radar de Equilíbrio.</td></tr>`;

      const provaHtml = provaRows.length > 0
        ? provaRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.disciplina)}</td>
            <td style="text-align: center;">${escapeHtml(String(row.aluno))}</td>
            <td style="text-align: center;">${escapeHtml(String(row.turma))}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="3">Sem dados para o Radar de Desempenho (Prova Paulista).</td></tr>`;

      const bimsHeaderHtml = bimestresDisponiveis.map(b => `<th style="border:1px solid #d6deea; background:#f8fafc; padding:6px; text-align:center;">${b.replace('º Bimestre', 'º Bi')}</th>`).join('');

      const evolucaoCcHtml = disciplinasEvolucaoCC.length > 0
        ? disciplinasEvolucaoCC.map((row) => {
            const bimsCells = bimestresDisponiveis.map(b => `<td style="text-align:center;">${row.notasPorBim[b] || '-'}</td>`).join('');
            const situacaoText = row.media !== null ? (row.media >= 5 ? '<span style="color:#1e40af; font-weight:800; background:#dbeafe; padding:2px 6px; border-radius:4px;">Ok</span>' : '<span style="color:#9f1239; font-weight:800; background:#ffe4e6; padding:2px 6px; border-radius:4px;">Recuperação</span>') : '-';
            return `
              <tr>
                <td><strong>${escapeHtml(row.disciplina)}</strong></td>
                ${bimsCells}
                <td style="text-align:center; font-weight:800; background:#eff6ff; color:#1d4ed8;">${row.media !== null ? row.media.toFixed(1) : '-'}</td>
                <td style="text-align:center;">${situacaoText}</td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="${bimestresDisponiveis.length + 3}" style="text-align:center;">Sem histórico disciplinar disponível.</td></tr>`;

      const evolucaoPpHtml = disciplinasEvolucaoPP.length > 0
        ? disciplinasEvolucaoPP.map((row) => {
            const bimsCells = bimestresDisponiveis.map(b => `<td style="text-align:center;">${row.notasPorBim[b] || '-'}</td>`).join('');
            return `
              <tr>
                <td><strong>${escapeHtml(row.disciplina)}</strong></td>
                ${bimsCells}
                <td style="text-align:center; font-weight:800; background:#f0f9ff; color:#0369a1;">${row.media !== null ? row.media.toFixed(2) : '-'}</td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="${bimestresDisponiveis.length + 2}" style="text-align:center;">Sem histórico disciplinar disponível.</td></tr>`;

      container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 0 10px; max-width: 190mm; margin: 0 auto; box-sizing: border-box;">
          <style>
            .pdf-page { margin: 0; padding: 0; }
            .pdf-page-break { page-break-before: always; break-before: page; }
            .pdf-panel {
              border: 1px solid #d6deea;
              border-radius: 14px;
              background: #ffffff;
              box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
              box-sizing: border-box;
            }
            .pdf-title {
              margin: 0 0 8px 0;
              font-size: 13px;
              color: #1e3a8a;
              text-transform: uppercase;
              letter-spacing: .6px;
              font-weight: 800;
            }
            .avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>

          <!-- SEÇÃO 1: CABEÇALHO + DADOS GERAIS + ANOTAÇÕES -->
          <section class="pdf-page">
            <div class="pdf-panel avoid-break" style="padding: 16px; margin-bottom: 10px; background: linear-gradient(135deg, #eff6ff 0%, #ffffff 60%, #f8fafc 100%); border-color:#bfdbfe;">
              <p style="margin:0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#1d4ed8; font-weight:800;">TutorDash • Relatório de Consulta</p>
              <h1 style="margin:6px 0 4px 0; font-size:24px; line-height:1.15; color:#0f172a;">Relatório Individual do Aluno</h1>
              <p style="margin:0; font-size:14px; color:#1e293b;"><strong>${escapeHtml(studentProfile.nome)}</strong></p>
              <p style="margin:4px 0 0; font-size:11px; color:#475569;">Turma: ${escapeHtml(studentProfile.turma)} • Tutor: ${escapeHtml(studentProfile.tutor)} • Gerado em ${new Date().toLocaleString('pt-BR')}</p>
            </div>

            <div class="pdf-panel avoid-break" style="padding: 10px; margin-bottom: 10px;">
              <h2 style="margin:0 0 8px 0; font-size:13px; color:#0f172a;">Dados Gerais</h2>
              <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; font-size: 10px; color:#334155;">
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px;"><strong>Turma:</strong> ${escapeHtml(studentProfile.turma)}</div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px;"><strong>Prova Paulista:</strong> ${escapeHtml(studentProfile.provaPaulista || 'S/D')}</div>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px;"><strong>Conselho:</strong> ${escapeHtml(conselhoMeanStr)}</div>
                <div style="grid-column:1 / -1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:6px;"><strong>Faltas:</strong> ${studentProfile.totalFaltas != null ? studentProfile.totalFaltas : 'S/D'} (${studentProfile.frequenciaMedia != null ? studentProfile.frequenciaMedia.toFixed(1) + '%' : 'S/D'}) • <strong>Anotações:</strong> ${notasComTipo.length}</div>
              </div>
            </div>

            <div class="pdf-panel avoid-break" style="padding: 10px; margin-bottom: 12px;">
              <h3 class="pdf-title" style="margin-bottom: 6px;">Anotações</h3>
              <table style="width:100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                  <tr>
                    <th style="border:1px solid #d6deea; background:#f8fafc; padding:5px;">Data</th>
                    <th style="border:1px solid #d6deea; background:#f8fafc; padding:5px;">Tipo</th>
                    <th style="border:1px solid #d6deea; background:#f8fafc; padding:5px;">Quem Registrou</th>
                    <th style="border:1px solid #d6deea; background:#f8fafc; padding:5px;">Anotação</th>
                  </tr>
                </thead>
                <tbody>${notesHtml}</tbody>
              </table>
            </div>
          </section>

          <!-- SEÇÃO 2: EVOLUÇÃO COMPARATIVA MULTI-BIMESTRAL (APENAS TABELAS) -->
          <div class="avoid-break" style="margin-top: 10px; margin-bottom: 12px;">
            <h3 class="pdf-title" style="font-size: 14px; color:#0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px;">📋 Evolução Comparativa por Disciplina</h3>
            
            <div class="pdf-panel avoid-break" style="padding: 10px; margin-bottom: 10px;">
              <p style="margin:0 0 6px 0; font-size:11px; font-weight:800; color:#1d4ed8;">Conselho Bimestral</p>
              <table style="width:100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                  <tr>
                    <th style="border:1px solid #d6deea; background:#f8fafc; padding:5px;">Disciplina</th>
                    ${bimsHeaderHtml}
                    <th style="border:1px solid #d6deea; background:#eff6ff; color:#1d4ed8; padding:5px; text-align:center;">Média Geral</th>
                    <th style="border:1px solid #d6deea; background:#eff6ff; color:#1e40af; padding:5px; text-align:center;">Situação</th>
                  </tr>
                </thead>
                <tbody>${evolucaoCcHtml}</tbody>
              </table>
            </div>

            <div class="pdf-panel avoid-break" style="padding: 10px; margin-bottom: 12px;">
              <p style="margin:0 0 6px 0; font-size:11px; font-weight:800; color:#0369a1;">Prova Paulista</p>
              <table style="width:100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                  <tr>
                    <th style="border:1px solid #d6deea; background:#f8fafc; padding:5px;">Disciplina</th>
                    ${bimsHeaderHtml}
                    <th style="border:1px solid #d6deea; background:#f0f9ff; color:#0369a1; padding:5px; text-align:center;">Média Geral</th>
                  </tr>
                </thead>
                <tbody>${evolucaoPpHtml}</tbody>
              </table>
            </div>
          </div>

          <!-- SEÇÃO 3: ANÁLISE POR COMPONENTE -->
          ${selectedChartBimestre !== 'evolucao' ? `
          <div class="avoid-break" style="margin-top: 10px;">
            <h3 class="pdf-title" style="font-size: 14px; color:#0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px;">📊 Análise Detalhada por Componente (${bimestreRadarLabel})</h3>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
              <div class="pdf-panel avoid-break" style="padding: 8px;">
                <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; color:#334155; text-align:center;">Radar Conselho</p>
                ${radarMapaoUri ? `<div style="height:65mm; display:flex; justify-content:center; align-items:center; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fafcff;"><img src="${radarMapaoUri}" style="width:100%; height:100%; object-fit:contain; display:block;" /></div>` : ''}
              </div>
              <div class="pdf-panel avoid-break" style="padding: 8px;">
                <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; color:#334155; text-align:center;">Radar Prova Paulista</p>
                ${radarProvaUri ? `<div style="height:65mm; display:flex; justify-content:center; align-items:center; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fafcff;"><img src="${radarProvaUri}" style="width:100%; height:100%; object-fit:contain; display:block;" /></div>` : ''}
              </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="pdf-panel avoid-break" style="padding: 8px;">
                <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; color:#334155; text-align:center;">Barras Conselho</p>
                ${barMapaoUri ? `<div style="height:60mm; display:flex; justify-content:center; align-items:center; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fafcff;"><img src="${barMapaoUri}" style="width:100%; height:100%; object-fit:contain; display:block;" /></div>` : ''}
              </div>
              <div class="pdf-panel avoid-break" style="padding: 8px;">
                <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; color:#334155; text-align:center;">Barras Prova Paulista</p>
                ${barProvaUri ? `<div style="height:60mm; display:flex; justify-content:center; align-items:center; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:#fafcff;"><img src="${barProvaUri}" style="width:100%; height:100%; object-fit:contain; display:block;" /></div>` : ''}
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Termo de Ciência e Assinaturas -->
          <div class="pdf-panel avoid-break" style="margin-top: 16px; padding: 12px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              Termo de Ciência e Assinaturas
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Card 1: Tutor(a) -->
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; padding-right: 20px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Tutor(a) Responsável</div>
                  <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${studentProfile?.tutor ? `Prof(a). ${escapeHtml(studentProfile.tutor)}` : 'Tutor(a) / Professor(a)'}</div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 500;">Docente tutor(a) responsável pelo acompanhamento</div>
                </div>
                <div style="width: 250px; text-align: center; flex-shrink: 0;">
                  <div style="border-top: 1.5px solid #475569; margin-top: 22px; margin-bottom: 4px;"></div>
                  <div style="font-size: 8.5px; color: #475569; font-weight: 700;">Assinatura do(a) Tutor(a)</div>
                </div>
              </div>

              <!-- Card 2: Coordenação -->
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; padding-right: 20px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Coordenação Pedagógica</div>
                  <div style="font-size: 11px; font-weight: 800; color: #0f172a;">Equipe Gestora / Coordenação</div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 500;">Visto institucional e validação escolar</div>
                </div>
                <div style="width: 250px; text-align: center; flex-shrink: 0;">
                  <div style="border-top: 1.5px solid #475569; margin-top: 22px; margin-bottom: 4px;"></div>
                  <div style="font-size: 8.5px; color: #475569; font-weight: 700;">Visto / Carimbo Escolar</div>
                </div>
              </div>

              <!-- Card 3: Estudante / Responsável -->
              <div style="border: 1px solid #cbd5e1; border-radius: 10px; background: #ffffff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; padding-right: 20px;">
                  <div style="font-size: 8.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Estudante / Responsável Legal</div>
                  <div style="font-size: 11px; font-weight: 800; color: #0f172a;">${escapeHtml(studentProfile?.nome || 'Estudante')}</div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 500;">Ciência do acompanhamento de rendimento e assiduidade</div>
                </div>
                <div style="width: 250px; text-align: center; flex-shrink: 0;">
                  <div style="border-top: 1.5px solid #475569; margin-top: 18px; margin-bottom: 4px;"></div>
                  <div style="font-size: 8.5px; color: #475569; font-weight: 700;">Assinatura do(a) Estudante ou Responsável</div>
                  <div style="font-size: 8.5px; color: #64748b; font-weight: 600; margin-top: 2px;">Data: ____ / ____ / ________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      container.querySelectorAll('td').forEach((cell) => {
        cell.style.border = '1px solid #cbd5e1';
        cell.style.padding = '6px';
        cell.style.verticalAlign = 'top';
      });
      container.querySelectorAll('th').forEach((cell) => {
        cell.style.border = '1px solid #cbd5e1';
        cell.style.padding = '6px';
      });

      document.body.appendChild(container);
      const worker = html2pdf()
        .set({
          margin: 8,
          filename: `${fileBase}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(container)
        .toPdf();

      const pdf = await worker.get('pdf');
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(140);
        pdf.text(
          'Documento de uso pedagógico confidencial — Protegido pela LGPD (Lei nº 13.709/2018)',
          10,
          pdf.internal.pageSize.getHeight() - 6
        );
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pdf.internal.pageSize.getWidth() - 10,
          pdf.internal.pageSize.getHeight() - 6,
          { align: 'right' }
        );
      }

      await worker.save();
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      if (container && container.parentNode) container.parentNode.removeChild(container);
      setIsExporting(false);
    }
  };

  const handleExportDocx = async () => {
    if (!studentProfile) return;

    try {
      setIsExporting(true);
      const [{ saveAs }, docxModule] = await Promise.all([
        import('file-saver'),
        import('docx'),
      ]);
      const {
        Document,
        Packer,
        Paragraph,
        Table,
        TableCell,
        TableRow,
        TextRun,
        HeadingLevel,
        ImageRun,
        WidthType,
      } = docxModule;
      const { notasComTipo, mapaoRows, provaRows, radarMapaoUri, radarProvaUri, barMapaoUri, barProvaUri, barEvolucaoCcUri, barEvolucaoPpUri } = buildReportData();
      const fileBase = `relatorio_${toSafeFileName(studentProfile.nome)}`;

      const [radarMapaoPng, radarProvaPng, barMapaoPng, barProvaPng, barEvolucaoCcPng, barEvolucaoPpPng] = await Promise.all([
        svgDataUriToPngBytes(radarMapaoUri),
        svgDataUriToPngBytes(radarProvaUri),
        svgDataUriToPngBytes(barMapaoUri),
        svgDataUriToPngBytes(barProvaUri),
        svgDataUriToPngBytes(barEvolucaoCcUri),
        svgDataUriToPngBytes(barEvolucaoPpUri),
      ]);

      const bimsHeaderNames = bimestresDisponiveis.map(b => b.replace('º Bimestre', 'º Bi'));

      const evolucaoCcTableRows = [
        new TableRow({
          children: ['Disciplina', ...bimsHeaderNames, 'Média Geral', 'Situação'].map((title) =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })] })
          ),
        }),
        ...(disciplinasEvolucaoCC.length > 0
          ? disciplinasEvolucaoCC.map((row) => {
              const situacao = row.media !== null ? (row.media >= 5 ? 'Ok' : 'Recuperação') : '-';
              return new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(String(row.disciplina))] }),
                  ...bimestresDisponiveis.map(b => new TableCell({ children: [new Paragraph(String(row.notasPorBim[b] || '-'))] })),
                  new TableCell({ children: [new Paragraph(row.media !== null ? row.media.toFixed(1) : '-')] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: situacao, bold: true })] })] }),
                ],
              });
            })
          : [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Sem histórico disciplinar disponível.')], columnSpan: bimestresDisponiveis.length + 3 }),
                ],
              }),
            ]),
      ];

      const evolucaoPpTableRows = [
        new TableRow({
          children: ['Disciplina', ...bimsHeaderNames, 'Média Geral'].map((title) =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })] })
          ),
        }),
        ...(disciplinasEvolucaoPP.length > 0
          ? disciplinasEvolucaoPP.map((row) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(String(row.disciplina))] }),
                  ...bimestresDisponiveis.map(b => new TableCell({ children: [new Paragraph(String(row.notasPorBim[b] || '-'))] })),
                  new TableCell({ children: [new Paragraph(row.media !== null ? row.media.toFixed(2) : '-')] }),
                ],
              })
            )
          : [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Sem histórico disciplinar disponível.')], columnSpan: bimestresDisponiveis.length + 2 }),
                ],
              }),
            ]),
      ];

      const infoItems = [
        `Aluno: ${studentProfile.nome}`,
        `Turma: ${studentProfile.turma}`,
        `Tutor: ${studentProfile.tutor}`,
        `Prova Paulista: ${studentProfile.provaPaulista || 'S/D'}`,
        `Qtde Faltas: ${studentProfile.totalFaltas != null ? studentProfile.totalFaltas : 'S/D'}`,
        `Frequência: ${studentProfile.frequenciaMedia != null ? studentProfile.frequenciaMedia.toFixed(1) + '%' : 'S/D'}`,
        `Conselho Bimestral: ${conselhoMeanStr}`,
        `Total de anotações: ${notasComTipo.length}`,
      ];

      const notesTableRows = [
        new TableRow({
          children: ['Data', 'Tipo', 'Quem Registrou', 'Anotação'].map((title) =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })] })
          ),
        }),
        ...(notasComTipo.length > 0
          ? notasComTipo.map((note) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(note.data)] }),
                  new TableCell({ children: [new Paragraph(note.tipo)] }),
                  new TableCell({ children: [new Paragraph(note.professor)] }),
                  new TableCell({ children: [new Paragraph(note.anotacao)] }),
                ],
              })
            )
          : [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Sem anotações registradas.')], columnSpan: 4 }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                ],
              }),
            ]),
      ];

      const mapaoTableRows = [
        new TableRow({
          children: ['Disciplina', 'Aluno', 'Média Turma'].map((title) =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })] })
          ),
        }),
        ...(mapaoRows.length > 0
          ? mapaoRows.map((row) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(String(row.disciplina))] }),
                  new TableCell({ children: [new Paragraph(String(row.aluno))] }),
                  new TableCell({ children: [new Paragraph(String(row.turma))] }),
                ],
              })
            )
          : [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Sem dados para o Radar de Equilíbrio.')], columnSpan: 3 }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                ],
              }),
            ]),
      ];

      const provaTableRows = [
        new TableRow({
          children: ['Disciplina', 'Aluno', 'Média Turma'].map((title) =>
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })] })
          ),
        }),
        ...(provaRows.length > 0
          ? provaRows.map((row) =>
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(String(row.disciplina))] }),
                  new TableCell({ children: [new Paragraph(String(row.aluno))] }),
                  new TableCell({ children: [new Paragraph(String(row.turma))] }),
                ],
              })
            )
          : [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Sem dados para o Radar da Prova Paulista.')], columnSpan: 3 }),
                  new TableCell({ children: [new Paragraph('')] }),
                  new TableCell({ children: [new Paragraph('')] }),
                ],
              }),
            ]),
      ];

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: 'Relatório Individual do Aluno', heading: HeadingLevel.HEADING_1 }),
              new Paragraph({ text: `Gerado em ${new Date().toLocaleString('pt-BR')}` }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'Dados Gerais', heading: HeadingLevel.HEADING_2 }),
              ...infoItems.map((line) => new Paragraph({ text: line, bullet: { level: 0 } })),
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'Anotações', heading: HeadingLevel.HEADING_2 }),
              new Table({ rows: notesTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
              new Paragraph({ text: '' }),
              ...(selectedChartBimestre !== 'evolucao'
                ? [
                    new Paragraph({ text: 'Análise Gráfica e Comparativa', heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ text: `Radar de Equilíbrio (${bimestreRadarLabel})` }),
                    ...(radarMapaoPng
                      ? [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: radarMapaoPng,
                                transformation: { width: 520, height: 300 },
                              }),
                            ],
                          }),
                        ]
                      : []),
                    new Table({ rows: mapaoTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                    new Paragraph({ text: '' }),
                    new Paragraph({ text: 'Radar de Desempenho (Prova Paulista)' }),
                    ...(radarProvaPng
                      ? [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: radarProvaPng,
                                transformation: { width: 520, height: 300 },
                              }),
                            ],
                          }),
                        ]
                      : []),
                    new Table({ rows: provaTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                    new Paragraph({ text: '' }),
                  ]
                : []),
              new Paragraph({ text: 'Evolução Comparativa por Disciplina — Conselho Bimestral', heading: HeadingLevel.HEADING_2 }),
              new Table({ rows: evolucaoCcTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: 'Evolução Comparativa por Disciplina — Prova Paulista', heading: HeadingLevel.HEADING_2 }),
              new Table({ rows: evolucaoPpTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
              ...(selectedChartBimestre !== 'evolucao'
                ? [
                    new Paragraph({ text: '' }),
                    new Paragraph({ text: `Análise por Componente — Bimestre Selecionado (${bimestreRadarLabel})`, heading: HeadingLevel.HEADING_2 }),
                    ...(barMapaoPng
                      ? [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: barMapaoPng,
                                transformation: { width: 520, height: 260 },
                              }),
                            ],
                          }),
                        ]
                      : []),
                    ...(barProvaPng
                      ? [
                          new Paragraph({
                            children: [
                              new ImageRun({
                                data: barProvaPng,
                                transformation: { width: 520, height: 260 },
                              }),
                            ],
                          }),
                        ]
                      : []),
                  ]
                : []),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${fileBase}.docx`);
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderChartContent = (chartConfig) => {
    if (!chartConfig) return null;
    switch (chartConfig.type) {
      case 'evolucaoCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Nota do Aluno" dataKey="ccAluno" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ccAluno" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
              </Bar>
              <Bar name="Média da Turma" dataKey="ccTurma" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ccTurma" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'evolucaoPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Nota do Aluno" dataKey="ppAluno" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ppAluno" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
              </Bar>
              <Bar name="Média da Turma" dataKey="ppTurma" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ppTurma" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'radarCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataMapao}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
              <Radar name="Média Turma" dataKey="Turma" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
              <Radar name="Aluno" dataKey="Aluno" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'barrasCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataMapao} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Nota do Aluno" dataKey="Aluno" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Aluno" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
              </Bar>
              <Bar name="Média da Turma" dataKey="Turma" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
              </Bar>
              <Bar name="Média do Nível" dataKey="Nivel" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={45} />
              <Bar name="Média da Escola" dataKey="Escola" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'radarPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataProva}>
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold' }} />
              <Radar name="Média da Turma" dataKey="Turma" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
              <Radar name="Aluno" dataKey="Aluno" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'barrasPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataProva} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              <Bar name="Nota do Aluno" dataKey="Aluno" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Aluno" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
              </Bar>
              <Bar name="Média da Turma" dataKey="Turma" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
              </Bar>
              <Bar name="Média do Nível" dataKey="Nivel" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={45} />
              <Bar name="Média da Escola" dataKey="Escola" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (!studentProfile) return null;

  return (
    <div className="mx-auto w-full max-w-none space-y-6 animate-in slide-in-from-right-8 duration-300">

      <div className="space-y-6">
      {/* Navegação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => setSelectedStudent(null)}
          className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 w-fit"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => prevStudent && setSelectedStudent(prevStudent)}
            disabled={!prevStudent}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 transition-colors ${!prevStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <button
            onClick={() => nextStudent && setSelectedStudent(nextStudent)}
            disabled={!nextStudent}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 transition-colors ${!nextStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600'}`}
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cabeçalho do aluno */}
      <div className="bg-white p-8 rounded-3xl border border-slate-300 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-black text-slate-800">{studentProfile.nome}</h2>
          <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
            isStudentActive(studentProfile.situacao)
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-rose-200 bg-rose-50 text-rose-600'
          }`}>
            {studentProfile.situacao}
          </span>
        </div>
        <div className="flex gap-4 mt-3 text-xs font-bold text-slate-500 uppercase flex-wrap">
          <span className="bg-slate-100 px-4 py-2 rounded-lg text-slate-700">Turma: {studentProfile.turma}</span>
          <span className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-1"><UserCheck className="w-3 h-3" /> Tutor: {studentProfile.tutor}</span>
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-colors ${isExporting ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-300'}`}
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
        </div>
      </div>
      </div>

      {/* ── ACCORDION DE ANOTAÇÕES ── */}
      <section className="w-full bg-white rounded-3xl border border-slate-300 shadow-md overflow-hidden transition-all hover:border-slate-400 hover:shadow-lg" data-chart>
        <div className="w-full flex items-center justify-between p-5 md:p-6 bg-white hover:bg-slate-50/70 transition-colors">
          <button
            type="button"
            onClick={() => setIsNotesOpen((prev) => !prev)}
            aria-expanded={isNotesOpen}
            aria-controls="student-notes-accordion"
            aria-label={isNotesOpen ? "Recolher anotações" : "Expandir anotações"}
            className="flex-1 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl mr-3 group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 group-hover:bg-indigo-100 transition-colors">
                <History className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Anotações</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {studentProfile.notes?.length || 0} {studentProfile.notes?.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                  Anotações pedagógicas e histórico de atendimentos
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 shrink-0 ml-4 group-hover:bg-slate-100 group-hover:border-slate-400 transition-colors">
              {isNotesOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </button>

          {isNotesOpen && (
            <button
              type="button"
              data-print-control
              aria-label="Imprimir anotações"
              title="Imprimir anotações"
              onClick={(event) => {
                event.stopPropagation();
                printChart(event.currentTarget.closest('[data-chart]'), 'Anotações');
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
            >
              <Printer className="h-4 w-4" />
            </button>
          )}
        </div>

        {isNotesOpen && (
          <div id="student-notes-accordion" className="border-t border-slate-300 p-5 md:p-6 space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {studentProfile.notes?.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 flex-1">
                      <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Data inicial
                        <input
                          aria-label="Data inicial das ocorrências"
                          type="date"
                          value={occurrenceStartDate}
                          max={occurrenceEndDate || undefined}
                          onChange={(event) => setOccurrenceStartDate(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Data final
                        <input
                          aria-label="Data final das ocorrências"
                          type="date"
                          value={occurrenceEndDate}
                          min={occurrenceStartDate || undefined}
                          onChange={(event) => setOccurrenceEndDate(event.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold normal-case tracking-normal text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                    {(occurrenceStartDate || occurrenceEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setOccurrenceStartDate('');
                          setOccurrenceEndDate('');
                        }}
                        className="self-start text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 sm:self-end pb-1"
                      >
                        Limpar período
                      </button>
                    )}
                  </div>
                  {occurrenceDateRangeInvalid && (
                    <p role="alert" className="mt-3 text-xs font-bold text-rose-600">
                      A data inicial deve ser anterior ou igual à data final.
                    </p>
                  )}
                  {!occurrenceDateRangeInvalid && (occurrenceStartDate || occurrenceEndDate) && (
                    <p className="mt-3 text-[10px] font-bold text-slate-400">
                      Exibindo {notesForSelectedFilters.length} de {studentProfile.notes.length} ocorrências no período selecionado.
                    </p>
                  )}
                </div>
              )}

              {studentProfile.notes?.length > 0 && studentSessions?.length > 0 && (
                <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Tipo de Sessão</span>
                    {selectedSessionFilters.length > 0 && (
                      <button onClick={() => setSelectedSessionFilters([])} className="text-[10px] font-black text-blue-600 hover:underline uppercase">Limpar filtros</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border text-xs font-bold transition-all ${selectedSessionFilters.length === 0 ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                      <input type="checkbox" checked={selectedSessionFilters.length === 0} onChange={() => setSelectedSessionFilters([])} className="sr-only" />
                      <span>Todos</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${selectedSessionFilters.length === 0 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{studentProfile.notes.length}</span>
                    </label>

                    {studentSessions.map(sessao => (
                      <label key={sessao} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border text-xs font-bold transition-all ${selectedSessionFilters.includes(sessao) ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                        <input type="checkbox" value={sessao} checked={selectedSessionFilters.includes(sessao)} onChange={() => { setSelectedSessionFilters(prev => prev.includes(sessao) ? prev.filter(item => item !== sessao) : [...prev, sessao]); }} className="sr-only" />
                        <span>{sessao}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${selectedSessionFilters.includes(sessao) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{studentSessionCounts?.[sessao] || 0}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full space-y-4">
              {studentProfile.notes?.length === 0 ? (
                <div className="border border-dashed border-slate-200 p-12 rounded-3xl text-center bg-slate-50/40">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Este aluno ainda não possui anotações.</p>
                </div>
              ) : notesForSelectedFilters.length > 0 ? (
                notesForSelectedFilters.map(n => (
                  <div key={n.id} className="w-full bg-slate-50/70 p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:bg-slate-50 hover:border-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-bold text-slate-400 uppercase mb-4 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5 font-black text-slate-700">
                          <User className="h-3.5 w-3.5 text-blue-600" /> Autor: {n.teacher}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" /> {formatOccurrenceDateTime(n.displayDate || n.date || n.createdAt)}
                        </span>
                      </div>
                      {n.tipoSessao && (
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-black tracking-wider text-indigo-800">
                          {n.tipoSessao}
                        </span>
                      )}
                    </div>
                    <p className="text-left text-slate-700 text-xs leading-relaxed font-medium mt-2 whitespace-pre-wrap">{n.note || 'Registo sem descrição.'}</p>
                  </div>
                ))
              ) : (
                <div className="border border-dashed border-slate-200 p-12 rounded-3xl text-center bg-slate-50/40">
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">Sem anotações registradas para este filtro.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <main className="w-full space-y-6">
      {/* ── SEÇÃO HERO: RESUMO DO PERÍODO SELECIONADO ── */}
      {/* ── SEÇÃO HERO: RESUMO DO PERÍODO SELECIONADO ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card Média Conselho */}
        <div className="bg-white p-5 rounded-3xl text-slate-900 border border-slate-300 shadow-md relative overflow-hidden flex flex-col justify-between transition-all hover:border-slate-400 hover:shadow-lg">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-blue-700 font-black text-[11px] uppercase tracking-widest">
              <span>📋 Conselho Bimestral</span>
              <span className="bg-blue-50 px-3 py-1 rounded-full text-[10px]">{heroMetrics.label}</span>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tight">{heroMetrics.mediaCC ?? '-'}</span>
              <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Média Geral</span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 font-medium">Índice consolidado das notas escolares</p>
        </div>

        {/* Card Prova Paulista */}
        <div className="bg-white p-5 rounded-3xl text-slate-900 border border-slate-300 shadow-md relative overflow-hidden flex flex-col justify-between transition-all hover:border-slate-400 hover:shadow-lg">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-sky-700 font-black text-[11px] uppercase tracking-widest opacity-90">
              <span>🎯 Prova Paulista</span>
              <span className="bg-sky-50 px-3 py-1 rounded-full text-[10px]">{heroMetrics.label}</span>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className={`font-black tracking-tight text-sky-700 ${heroMetrics.mediaPP === 'S/N' ? 'text-5xl' : 'text-6xl'}`}>
                {heroMetrics.mediaPP ?? 'S/D'}
              </span>
              {heroMetrics.mediaPP !== 'S/N' && <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Consolidado</span>}
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 font-medium">
            {heroMetrics.mediaPP === 'S/N' 
              ? '⚠️ Sem registros de Prova Paulista neste período (S/N)' 
              : heroMetrics.naoEfetuouPPCount > 0 
                ? `⚠️ Pendentes (S/N): ${heroMetrics.naoEfetuouPPNames}` 
                : 'Desempenho consolidado na avaliação estadual'}
          </p>
        </div>

        {/* Card Frequência Total */}
        <div className="bg-white p-5 rounded-3xl text-slate-900 border border-slate-300 shadow-md relative overflow-hidden flex flex-col justify-between transition-all hover:border-slate-400 hover:shadow-lg">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-blue-700 font-black text-[11px] uppercase tracking-widest">
              <span>📅 Frequência Total</span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold">{heroMetrics.label}</span>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-6xl font-black tracking-tight text-blue-600">{heroMetrics.frequencia || 'S/D'}</span>
              <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Presença</span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-500 font-medium">
            {studentProfile?.totalFaltas != null
              ? `Comparecimento às aulas (${studentProfile.totalFaltas} ${studentProfile.totalFaltas === 1 ? 'falta' : 'faltas'} no período)`
              : 'Porcentagem consolidada de presença escolar'}
          </p>
        </div>
      </div>

      {/* ── PAINEL PRINCIPAL DINÂMICO (SEM SANFONAS REDUNDANTES) ── */}
      <div className="space-y-10 mt-6">
        {selectedChartBimestre === 'evolucao' ? (
          /* MODO EVOLUÇÃO COMPARATIVA */
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-slate-50 border border-slate-300 p-8 rounded-3xl shadow-md">
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6">
                📈 Trajetória Multi-Bimestral de Desempenho
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Evolução Conselho */}
                <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-md relative" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'evolucaoCC', title: 'Evolução Média Geral — Conselho' })}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Maximizar gráfico em tela cheia"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, 'Evolução Bimestral (Conselho)'); }}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Imprimir este gráfico"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-16">Evolução Média Geral — Conselho</h4>
                  {evolucaoDados.length > 0 ? (
                    <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '15px' }} />
                          <Bar name="Nota do Aluno" dataKey="ccAluno" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="ccAluno" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
                          </Bar>
                          <Bar name="Média da Turma" dataKey="ccTurma" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="ccTurma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="w-full h-[320px]"></div>}
                </div>

                {/* Evolução PP */}
                <div className="bg-white p-6 rounded-3xl border border-slate-300 shadow-md relative" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'evolucaoPP', title: 'Evolução Média Geral — Prova Paulista' })}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="Maximizar gráfico em tela cheia"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, 'Evolução Bimestral (Prova Paulista)'); }}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="Imprimir este gráfico"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-16">Evolução Média Geral — Prova Paulista</h4>
                  {evolucaoDados.length > 0 ? (
                    <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '15px' }} />
                          <Bar name="Nota do Aluno" dataKey="ppAluno" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="ppAluno" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
                          </Bar>
                          <Bar name="Média da Turma" dataKey="ppTurma" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="ppTurma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className="w-full h-[320px]"></div>}
                </div>
              </div>
            </div>

            {/* Tabela Conselho */}
            <div className="hidden space-y-4">
              {tabelasBimestraisCC.map((bimestre) => (
                <div key={`cc-${bimestre.bimestre}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-blue-50 px-5 py-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-700">Conselho de Classe — {bimestre.bimestre}</h4>
                    <span className="text-xs font-black text-blue-700">
                      Média: {bimestre.media !== null ? bimestre.media.toFixed(1) : '-'}
                      <span className={`ml-3 rounded-lg border px-2 py-1 text-[10px] ${bimestre.media !== null && bimestre.media >= 5 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        {bimestre.media !== null && bimestre.media >= 5 ? 'Ok' : 'Recuperação'}
                      </span>
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-left uppercase tracking-wider text-slate-500">
                        <tr><th className="px-5 py-3 font-black">Disciplina</th><th className="px-5 py-3 text-center font-black">Nota</th><th className="px-5 py-3 text-center font-black">Situação</th></tr>
                      </thead>
                      <tbody>
                        {bimestre.rows.map((row, index) => (
                          <tr key={row.rawName} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="border-t border-slate-100 px-5 py-3 font-bold text-slate-700">{row.disciplina}</td>
                            <td className="border-t border-slate-100 px-5 py-3 text-center font-black text-blue-700">{row.nota.toFixed(1)}</td>
                            <td className="border-t border-slate-100 px-5 py-3 text-center">
                              <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-black ${row.nota >= 5 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                {row.nota >= 5 ? 'Ok' : 'Recuperação'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {bimestre.rows.length === 0 && <tr><td colSpan={3} className="px-5 py-6 text-center font-bold text-slate-400">Sem notas neste bimestre.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {tabelasBimestraisCC.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-bold text-slate-400">Sem histórico de Conselho de Classe.</div>}
            </div>

            {/* Tabela única de Conselho por disciplina e bimestre */}
            <div className="bg-white p-8 rounded-3xl border border-slate-300 shadow-md">
              <h4 className="text-xs font-black text-blue-600 uppercase mb-5 tracking-widest">
                📋 Conselho — Evolução por Disciplina e Média Geral
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-left select-none">
                      <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortCC('disciplina')}>
                        Disciplina {sortFieldCC === 'disciplina' && (sortOrderCC === 'asc' ? '↑' : '↓')}
                      </th>
                      {bimestresDisponiveis.map(b => (
                        <th key={b} className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortCC(b)}>
                          {b.replace('º Bimestre', 'º Bi')} {sortFieldCC === b && (sortOrderCC === 'asc' ? '↑' : '↓')}
                        </th>
                      ))}
                      <th className="p-4 text-center bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSortCC('media')}>
                        Média Geral {sortFieldCC === 'media' && (sortOrderCC === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-4 text-center bg-blue-50/80 text-blue-800 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSortCC('situacao')}>
                        Situação {sortFieldCC === 'situacao' && (sortOrderCC === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplinasEvolucaoCC.length > 0 ? (
                      disciplinasEvolucaoCC.map((row, i) => (
                        <tr key={row.rawName} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                          <td className="p-4 font-bold text-slate-700">{row.disciplina}</td>
                          {bimestresDisponiveis.map(b => (
                            <td key={b} className="p-4 text-center font-semibold text-slate-600">
                              {row.notasPorBim[b] || '-'}
                            </td>
                          ))}
                          <td className="p-4 text-center font-black bg-blue-50/50 text-blue-700 text-sm">
                            {row.media !== null ? row.media.toFixed(1) : '-'}
                          </td>
                          <td className="p-4 text-center font-black text-xs">
                            {row.media !== null ? (
                              row.media >= 5 ? (
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg border border-blue-200 shadow-2xs inline-block">Ok</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg border border-rose-200 shadow-2xs inline-block">Recuperação</span>
                              )
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={bimestresDisponiveis.length + 3} className="p-8 text-center text-slate-400 font-bold">Sem histórico disciplinar disponível</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Tabela Prova Paulista */}
            <div className="hidden space-y-4">
              {tabelasBimestraisPP.map((bimestre) => (
                <div key={`pp-${bimestre.bimestre}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-sky-50 px-5 py-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-sky-700">Prova Paulista — {bimestre.bimestre}</h4>
                    <span className="text-xs font-black text-sky-700">Média: {bimestre.media !== null ? bimestre.media.toFixed(2) : '-'}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-left uppercase tracking-wider text-slate-500">
                        <tr><th className="px-5 py-3 font-black">Disciplina</th><th className="px-5 py-3 text-center font-black">Nota</th></tr>
                      </thead>
                      <tbody>
                        {bimestre.rows.map((row, index) => (
                          <tr key={row.rawName} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="border-t border-slate-100 px-5 py-3 font-bold text-slate-700">{row.disciplina}</td>
                            <td className="border-t border-slate-100 px-5 py-3 text-center font-black text-sky-700">{row.nota.toFixed(2)}</td>
                          </tr>
                        ))}
                        {bimestre.rows.length === 0 && <tr><td colSpan={2} className="px-5 py-6 text-center font-bold text-slate-400">Sem notas neste bimestre.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {tabelasBimestraisPP.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-bold text-slate-400">Sem histórico de Prova Paulista.</div>}
            </div>

            {/* Tabela única de Prova Paulista por disciplina e bimestre */}
            <div className="bg-white p-8 rounded-3xl border border-slate-300 shadow-md">
              <h4 className="text-xs font-black text-sky-600 uppercase mb-5 tracking-widest">
                🎯 Prova Paulista — Evolução por Disciplina e Média Geral
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-black text-left select-none">
                      <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortPP('disciplina')}>
                        Disciplina {sortFieldPP === 'disciplina' && (sortOrderPP === 'asc' ? '↑' : '↓')}
                      </th>
                      {bimestresDisponiveis.map(b => (
                        <th key={b} className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortPP(b)}>
                          {b.replace('º Bimestre', 'º Bi')} {sortFieldPP === b && (sortOrderPP === 'asc' ? '↑' : '↓')}
                        </th>
                      ))}
                      <th className="p-4 text-center bg-sky-50 text-sky-700 cursor-pointer hover:bg-sky-100 transition-colors" onClick={() => handleSortPP('media')}>
                        Média Geral {sortFieldPP === 'media' && (sortOrderPP === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplinasEvolucaoPP.length > 0 ? (
                      disciplinasEvolucaoPP.map((row, i) => (
                        <tr key={row.rawName} className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                          <td className="p-4 font-bold text-slate-700">{row.disciplina}</td>
                          {bimestresDisponiveis.map(b => (
                            <td key={b} className="p-4 text-center font-semibold text-slate-600">
                              {row.notasPorBim[b] || '-'}
                            </td>
                          ))}
                          <td className="p-4 text-center font-black bg-sky-50/50 text-sky-700 text-sm">
                            {row.media !== null ? row.media.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={bimestresDisponiveis.length + 3} className="p-8 text-center text-slate-400 font-bold">Sem disciplinas detalhadas na Prova Paulista</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <GuidedAnalysisPanel
                title="Análise por disciplina — Conselho de Classe"
                accent="text-blue-700"
                options={analysisOptionsCC}
                selectedValue={activeAnalysisCC}
                onChange={setSelectedAnalysisCC}
                analysis={guidedAnalysisCC}
                decimals={1}
                onPrint={printChart}
              />
              <GuidedAnalysisPanel
                title="Análise por disciplina — Prova Paulista"
                accent="text-sky-700"
                options={analysisOptionsPP}
                selectedValue={activeAnalysisPP}
                onChange={setSelectedAnalysisPP}
                analysis={guidedAnalysisPP}
                decimals={2}
                onPrint={printChart}
              />
            </div>
          </div>
        ) : (
          /* MODO BIMESTRE ESPECÍFICO */
          <div className="space-y-10 animate-fadeIn">
            {/* ── PILAR CONSELHO BIMESTRAL ── */}
            {chartDataMapao.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Conselho Bimestral</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{bimestreRadarLabel}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black uppercase px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl">Notas Escolares</span>
                </div>

                <div className="space-y-8">
                  {/* Radar Mapão */}
                  <div className="w-full bg-slate-50/80 p-6 md:p-8 rounded-3xl border border-slate-300 flex flex-col items-center relative min-h-[380px] shadow-md" data-chart>
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => setMaximizedChart({ type: 'radarCC', title: `Radar de Equilíbrio — Conselho (${bimestreRadarLabel})` })}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shadow-sm"
                        title="Maximizar gráfico em tela cheia"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, `Radar Conselho (${bimestreRadarLabel})`); }}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shadow-sm"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-widest text-center pr-16">Radar de Equilíbrio</h4>
                    <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataMapao}>
                          <PolarGrid stroke="#cbd5e1" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <Radar name="Média Turma" dataKey="Turma" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                          <Radar name="Aluno" dataKey="Aluno" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Barras Mapão */}
                  <div className="w-full bg-white p-6 md:p-8 rounded-3xl relative min-h-[400px] border border-slate-300 shadow-md" data-chart>
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => setMaximizedChart({ type: 'barrasCC', title: `Comparativo de Notas — Conselho (${bimestreRadarLabel})` })}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Maximizar gráfico em tela cheia"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, `Notas por Disciplina (${bimestreRadarLabel})`); }}
                        className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-16">Comparativo de Notas por Disciplina</h4>
                    <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataMapao} margin={{ top: 20, right: 10, left: -20, bottom: 65 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                          <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                          <Bar name="Nota do Aluno" dataKey="Aluno" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="Aluno" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                          </Bar>
                          <Bar name="Média da Turma" dataKey="Turma" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                          </Bar>
                          <Bar name="Média do Nível" dataKey="Nivel" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={45} />
                          <Bar name="Média da Escola" dataKey="Escola" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabela de Matérias CC Integrada */}
                  <div className="hidden mt-10 pt-8 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detalhamento de Notas de Conselho de Classe no Período</h4>
                    <div className="rounded-2xl overflow-hidden border border-slate-200">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-5 py-3.5 font-black text-slate-500 uppercase tracking-wider">Disciplina</th>
                            <th className="px-5 py-3.5 font-black text-blue-600 uppercase tracking-wider text-center">Nota Aluno</th>
                            <th className="px-5 py-3.5 font-black text-slate-400 uppercase tracking-wider text-center">Média Turma</th>
                            <th className="px-5 py-3.5 font-black text-slate-400 uppercase tracking-wider text-center">Desempenho</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartDataMapao.map((item, idx) => {
                            const alunoVal = item.Aluno != null ? Number(item.Aluno) : null;
                            const turmaVal = item.Turma != null ? Number(item.Turma) : null;
                            const diff = alunoVal != null && turmaVal != null ? (alunoVal - turmaVal).toFixed(1) : null;
                            return (
                              <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="px-5 py-3.5 font-bold text-slate-700">{item.fullSubject || item.subject}</td>
                                <td className="px-5 py-3.5 text-center font-black text-blue-700 text-sm">
                                  {alunoVal != null ? alunoVal.toFixed(1) : '-'}
                                </td>
                                <td className="px-5 py-3.5 text-center font-semibold text-slate-500">
                                  {turmaVal != null ? turmaVal.toFixed(1) : '-'}
                                </td>
                                <td className="px-5 py-3.5 text-center font-bold">
                                  {diff != null ? (
                                    diff >= 0 ? <span className="text-blue-700 bg-blue-50 px-3 py-1 rounded-xl text-[11px] border border-blue-100">+{diff} vs Turma</span>
                                              : <span className="text-rose-700 bg-rose-50 px-3 py-1 rounded-xl text-[11px] border border-rose-100">{diff} vs Turma</span>
                                  ) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PILAR PROVA PAULISTA ── */}
            {chartDataProva.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-300 shadow-md p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 tracking-tight">Prova Paulista</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{bimestreRadarLabel}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black uppercase px-3.5 py-1.5 bg-sky-50 text-sky-700 rounded-xl">Avaliação Estadual</span>
                </div>

                <div className="space-y-8">
                  {/* Radar Prova Paulista */}
                  <div className="w-full bg-sky-50/50 p-6 md:p-8 rounded-3xl border border-slate-300 flex flex-col items-center relative min-h-[380px] shadow-md" data-chart>
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => setMaximizedChart({ type: 'radarPP', title: `Desempenho por Área — Prova Paulista (${bimestreRadarLabel})` })}
                        className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-white transition-colors shadow-sm"
                        title="Maximizar gráfico em tela cheia"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, `Radar Prova Paulista (${bimestreRadarLabel})`); }}
                        className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-white transition-colors shadow-sm"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xs font-black text-sky-600 uppercase mb-4 tracking-widest text-center pr-16">Desempenho por Área</h4>
                    <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataProva}>
                          <PolarGrid stroke="#cbd5e1" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                          <Radar name="Média da Turma" dataKey="Turma" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                          <Radar name="Aluno" dataKey="Aluno" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Barras Prova Paulista */}
                  <div className="w-full bg-white p-6 md:p-8 rounded-3xl relative min-h-[400px] border border-slate-300 shadow-md" data-chart>
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button
                        onClick={() => setMaximizedChart({ type: 'barrasPP', title: `Comparativo de Notas — Prova Paulista (${bimestreRadarLabel})` })}
                        className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Maximizar gráfico em tela cheia"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, `Notas Prova Paulista (${bimestreRadarLabel})`); }}
                        className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-16">Comparativo de Notas — Prova Paulista</h4>
                    <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartDataProva} margin={{ top: 20, right: 10, left: -20, bottom: 65 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                          <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                          <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                          <Bar name="Nota do Aluno" dataKey="Aluno" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="Aluno" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                          </Bar>
                          <Bar name="Média da Turma" dataKey="Turma" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                            <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                          </Bar>
                          <Bar name="Média do Nível" dataKey="Nivel" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={45} />
                          <Bar name="Média da Escola" dataKey="Escola" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Se não tiver nem Conselho nem PP no bimestre selecionado */}
            {chartDataMapao.length === 0 && chartDataProva.length === 0 && (
              <div className="bg-white border border-dashed border-slate-300 p-20 rounded-3xl text-center shadow-sm">
                <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-700 tracking-tight">Nenhuma avaliação registrada no {bimestreRadarLabel}</h3>
                <p className="text-xs text-slate-400 mt-2 font-medium">Este estudante não possui notas cadastradas para o período selecionado.<br/>Escolha outro bimestre ou acesse a visão de Evolução Comparativa no topo.</p>
              </div>
            )}
          </div>
        )}
      </div>

        </main>

      {/* Modal Maximizado */}
      {maximizedChart && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col p-4 md:p-10 animate-fade-in" data-html2canvas-ignore>
          <div className="flex items-center justify-between text-white mb-6 max-w-7xl mx-auto w-full">
            <h3 className="text-xl md:text-2xl font-black flex items-center gap-3">
              <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Maximize2 className="w-6 h-6"/></span>
              {maximizedChart.title}
            </h3>
            <button
              onClick={() => setMaximizedChart(null)}
              className="px-4 py-2.5 bg-white/10 hover:bg-rose-500 hover:text-white rounded-2xl text-slate-200 transition-all flex items-center gap-2 font-bold text-xs shadow-lg"
            >
              <Minimize2 className="w-4 h-4" /> Fechar Tela Cheia
            </button>
          </div>
          <div className="flex-1 w-full max-w-7xl mx-auto bg-white rounded-3xl p-6 md:p-10 shadow-2xl relative flex flex-col justify-center min-h-0 border border-slate-100 overflow-hidden">
            <div className="w-full h-full min-h-[450px]">
              {renderChartContent(maximizedChart)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
