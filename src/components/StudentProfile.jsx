// ─────────────────────────────────────────────────────────────
// components/StudentProfile.jsx — Perfil 360º do aluno
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, UserCheck, TrendingUp,
  LineChart as LineChartIcon, History, BarChart2,
  User, Calendar, ChevronDown, ChevronUp, Download, Printer
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, LabelList
} from 'recharts';
import { formatDisciplina, parseGrade } from '../utils/helpers';
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
    label: '🔢 Exatas & Matemática',
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
    headerBg: 'bg-emerald-600', headerText: 'text-white', borderColor: 'border-emerald-200', headBg: 'bg-emerald-50',
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
    if (n >= 7) return 'text-emerald-700 bg-emerald-50 font-black';
    if (n >= 5) return 'text-amber-700 bg-amber-50 font-black';
    return 'text-red-700 bg-red-50 font-black';
  }
  const up = nota.toUpperCase();
  if (up === 'MB') return 'text-emerald-700 bg-emerald-50 font-black';
  if (up === 'B')  return 'text-blue-700 bg-blue-50 font-black';
  if (up === 'R')  return 'text-amber-700 bg-amber-50 font-black';
  if (up === 'I')  return 'text-red-700 bg-red-50 font-black';
  return 'text-slate-600 bg-white font-bold';
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

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  studentProfile, filteredNotes, studentSessions, studentSessionCounts,
  selectedSessionFilters, setSelectedSessionFilters,
  prevStudent, nextStudent, setSelectedStudent,
  chartDataMapao, chartDataProva,
  filteredStudents = [], conceitoData = [], provaData = [], allStudents = []
}) => {
  const [showAnotacoes, setShowAnotacoes] = useState(true);
  const [showProvaPaulista, setShowProvaPaulista] = useState(false);
  const [showEvolutivo, setShowEvolutivo] = useState(false);
  const [showGrafico, setShowGrafico] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPrintSelection, setShowPrintSelection] = useState(false);
  const [studentSelections, setStudentSelections] = useState({});

  // ── Impressão de gráfico individual ─────────────────────────
  const printChart = async (chartRef, title) => {
    if (!chartRef) return;

    const nome  = escapeHtml(studentProfile?.nome  || '');
    const turma = escapeHtml(studentProfile?.turma || '');
    const tutor = escapeHtml(studentProfile?.tutor || '');

    try {
      const { default: html2canvas } = await import('html2canvas');

      // Oculta o botão de impressora para não aparecer na captura
      const btn = chartRef.querySelector('button[title="Imprimir este gráfico"]');
      if (btn) btn.style.visibility = 'hidden';

      const canvas = await html2canvas(chartRef, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      if (btn) btn.style.visibility = '';

      const imgDataUrl = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank', 'width=960,height=720');
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(title)}</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; padding: 28px 32px; font-family: Arial, sans-serif; background: #fff; color: #0f172a; }
              .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 20px; }
              .header-title { font-size: 13px; font-weight: 800; color: #1e3a8a;
                              text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0; }
              .header-info { display: flex; gap: 24px; flex-wrap: wrap; }
              .info-item { display: flex; flex-direction: column; }
              .info-label { font-size: 9px; font-weight: 800; color: #94a3b8;
                            text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
              .info-value { font-size: 13px; font-weight: 700; color: #1e293b; }
              .chart-img { width: 100%; height: auto; display: block; }
              @media print {
                body { padding: 12px 16px; }
                @page { margin: 10mm; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="header-title">${escapeHtml(title)}</p>
              <div class="header-info">
                <div class="info-item">
                  <span class="info-label">Turma</span>
                  <span class="info-value">${turma}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Aluno</span>
                  <span class="info-value">${nome}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Tutor</span>
                  <span class="info-value">${tutor}</span>
                </div>
              </div>
            </div>
            <img class="chart-img" src="${imgDataUrl}" alt="${escapeHtml(title)}" />
            <script>window.onload = () => { window.print(); window.close(); };<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Erro ao imprimir gráfico:', err);
    }
  };

  const bimestreRadarLabel = studentProfile?.ultimoBimNome && String(studentProfile.ultimoBimNome).trim() !== 'Sem Dados'
    ? studentProfile.ultimoBimNome
    : 'Bimestre atual';

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

    return {
      historico,
      disciplinas,
      notasRows,
      notasComTipo,
      mapaoRows,
      provaRows,
      radarMapaoUri,
      radarProvaUri,
    };
  };

  const handleExportPdf = async () => {
    if (!studentProfile) return;

    let container = null;
    try {
      setIsExporting(true);
      const { default: html2pdf } = await import('html2pdf.js');
      const { notasComTipo, mapaoRows, provaRows, radarMapaoUri, radarProvaUri } = buildReportData();
      const fileBase = `relatorio_${toSafeFileName(studentProfile.nome)}`;

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
            <td>${escapeHtml(row.aluno)}</td>
            <td>${escapeHtml(row.turma)}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="3">Sem dados para o Radar de Equilíbrio.</td></tr>`;

      const provaHtml = provaRows.length > 0
        ? provaRows.map((row) => `
          <tr>
            <td>${escapeHtml(row.disciplina)}</td>
            <td>${escapeHtml(String(row.aluno))}</td>
            <td>${escapeHtml(String(row.turma))}</td>
          </tr>
        `).join('')
        : `<tr><td colspan="3">Sem dados para o Radar de Desempenho (Prova Paulista).</td></tr>`;

      container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; padding: 0 12px; max-width: 190mm; margin: 0 auto; box-sizing: border-box;">
          <section style="height: 260mm; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; border: 2px solid #1e3a8a; border-radius: 12px; padding: 24px; box-sizing: border-box;">
            <p style="margin:0; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#1e3a8a; font-weight:bold;">TutorDash • Relatório Oficial</p>
            <h1 style="margin:16px 0 8px 0; font-size:32px; line-height:1.2; color:#0f172a;">Relatório Individual do Aluno</h1>
            <p style="margin:0; font-size:15px; color:#334155;"><strong>${escapeHtml(studentProfile.nome)}</strong></p>
            <p style="margin:10px 0 0; font-size:13px; color:#475569;">Turma: ${escapeHtml(studentProfile.turma)} • Tutor: ${escapeHtml(studentProfile.tutor)}</p>
            <p style="margin:10px 0 0; font-size:12px; color:#64748b;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
          </section>

          <div style="page-break-before: always;"></div>

          <header style="border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin: 8px 0 16px;">
            <h2 style="margin:0; font-size:16px; color:#1e293b;">Relatório Individual do Aluno</h2>
            <p style="margin:4px 0 0; font-size:11px; color:#64748b;">Aluno: ${escapeHtml(studentProfile.nome)} • Turma: ${escapeHtml(studentProfile.turma)} • Tutor: ${escapeHtml(studentProfile.tutor)}</p>
          </header>

          <h3 style="font-size:13px; margin: 16px 0 8px; color:#1e3a8a; text-transform:uppercase; letter-spacing:.5px;">Dados Gerais</h3>
          <ul style="margin: 0 0 12px 18px; padding: 0; font-size: 12px;">
            <li><strong>Aluno:</strong> ${escapeHtml(studentProfile.nome)}</li>
            <li><strong>Turma:</strong> ${escapeHtml(studentProfile.turma)}</li>
            <li><strong>Tutor:</strong> ${escapeHtml(studentProfile.tutor)}</li>
            <li><strong>Prova Paulista:</strong> ${escapeHtml(studentProfile.provaPaulista || 'S/D')}</li>
            <li><strong>Total de anotações:</strong> ${notasComTipo.length}</li>
          </ul>

          <h3 style="font-size:13px; margin: 16px 0 8px; color:#1e3a8a; text-transform:uppercase; letter-spacing:.5px;">Anotações e Sessões</h3>
          <div style="width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:16px; box-sizing:border-box; page-break-inside:avoid;">
          <table style="width:100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr>
                <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Data</th>
                <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Tipo</th>
                <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Quem Registrou</th>
                <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Anotação</th>
              </tr>
            </thead>
            <tbody>${notesHtml}</tbody>
          </table>
          </div>

          <h3 style="font-size:13px; margin: 16px 0 8px; color:#1e3a8a; text-transform:uppercase; letter-spacing:.5px;">Análise Gráfica e Comparativa</h3>
          <div style="width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:12px; box-sizing:border-box; page-break-inside:avoid;">
            <p style="margin:0 0 8px 0; font-size:11px; font-weight:bold; color:#334155;">Radar de Equilíbrio (${escapeHtml(bimestreRadarLabel)})</p>
            ${radarMapaoUri ? `<img src="${radarMapaoUri}" alt="Radar de Equilibrio" style="width:100%; max-width:100%; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px;" />` : ''}
            <table style="width:100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr>
                  <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Disciplina</th>
                  <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Aluno</th>
                  <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Média Turma</th>
                </tr>
              </thead>
              <tbody>${mapaoHtml}</tbody>
            </table>
          </div>

          <div style="width:100%; border:1px solid #cbd5e1; border-radius:10px; padding:10px; margin-bottom:12px; box-sizing:border-box; page-break-inside:avoid;">
            <p style="margin:0 0 8px 0; font-size:11px; font-weight:bold; color:#334155;">Radar de Desempenho (Prova Paulista)</p>
            ${radarProvaUri ? `<img src="${radarProvaUri}" alt="Radar de Desempenho" style="width:100%; max-width:100%; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px;" />` : ''}
            <table style="width:100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr>
                  <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Disciplina</th>
                  <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Aluno</th>
                  <th style="border:1px solid #cbd5e1; background:#f8fafc; padding:6px;">Média Turma</th>
                </tr>
              </thead>
              <tbody>${provaHtml}</tbody>
            </table>
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
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(
          `Página ${i} de ${totalPages}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 6,
          { align: 'center' }
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
      const { notasComTipo, mapaoRows, provaRows, radarMapaoUri, radarProvaUri } = buildReportData();
      const fileBase = `relatorio_${toSafeFileName(studentProfile.nome)}`;

      const [radarMapaoPng, radarProvaPng] = await Promise.all([
        svgDataUriToPngBytes(radarMapaoUri),
        svgDataUriToPngBytes(radarProvaUri),
      ]);

      const infoItems = [
        `Aluno: ${studentProfile.nome}`,
        `Turma: ${studentProfile.turma}`,
        `Tutor: ${studentProfile.tutor}`,
        `Prova Paulista: ${studentProfile.provaPaulista || 'S/D'}`,
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
              new Paragraph({ text: 'Anotações e Sessões', heading: HeadingLevel.HEADING_2 }),
              new Table({ rows: notesTableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
              new Paragraph({ text: '' }),
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

  if (!studentProfile) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">

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
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-3xl font-black text-slate-800">{studentProfile.nome}</h2>
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
          <button
            onClick={handleExportDocx}
            disabled={isExporting}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-colors ${isExporting ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-300'}`}
          >
            <Download className="w-4 h-4" /> Baixar DOCX
          </button>
          <button
            onClick={() => setShowPrintSelection(true)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border bg-white text-slate-600 border-slate-200 hover:text-blue-600 hover:border-blue-300 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir Gráficos
          </button>
        </div>
      </div>

      {showPrintSelection && (
        <PrintSelectionModal
          student={studentProfile}
          studentName={studentProfile.nome}
          studentsToFilter={filteredStudents.length > 0 ? filteredStudents : [studentProfile]}
          conceitoData={conceitoData}
          provaData={provaData}
          allStudents={allStudents}
          studentSelections={studentSelections}
          setStudentSelections={setStudentSelections}
          onClose={() => setShowPrintSelection(false)}
        />
      )}

      {/* Anotações e Sessões */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4 ml-2">
            <button
              onClick={() => setShowAnotacoes(!showAnotacoes)}
              className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 hover:text-blue-600 transition-colors"
              title={showAnotacoes ? "Recolher" : "Expandir"}
            >
              <History className="w-4 h-4" /> Anotações e Sessões
            </button>
            <button
              onClick={() => setShowAnotacoes(!showAnotacoes)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
              title={showAnotacoes ? "Recolher" : "Expandir"}
            >
              {showAnotacoes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showAnotacoes && (
            <>

          {studentProfile.notes.length > 0 && studentSessions.length > 0 && (
            <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar por Tipo</p>
              <div className="mb-3">
                <button
                  onClick={() => setSelectedSessionFilters([])}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                >
                  Limpar filtros
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                <label
                  className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-all ${selectedSessionFilters.length === 0 ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSessionFilters.length === 0}
                    onChange={() => setSelectedSessionFilters([])}
                    className="sr-only peer"
                  />
                  <span className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors ${selectedSessionFilters.length === 0 ? 'border-blue-600' : 'border-slate-400'} bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500`}>
                    {selectedSessionFilters.length === 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </span>
                  <span className={`text-xs font-bold ${selectedSessionFilters.length === 0 ? 'text-blue-700' : 'text-slate-600'}`}>Todos</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedSessionFilters.length === 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                    {studentProfile.notes.length}
                  </span>
                </label>

                {studentSessions.map(sessao => (
                  <label
                    key={sessao}
                    className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-all ${selectedSessionFilters.includes(sessao) ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}
                  >
                    <input
                      type="checkbox"
                      value={sessao}
                      checked={selectedSessionFilters.includes(sessao)}
                      onChange={() => {
                        setSelectedSessionFilters(prev => (
                          prev.includes(sessao)
                            ? prev.filter(item => item !== sessao)
                            : [...prev, sessao]
                        ));
                      }}
                      className="sr-only peer"
                    />
                    <span className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors ${selectedSessionFilters.includes(sessao) ? 'border-blue-600' : 'border-slate-400'} bg-white peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500`}>
                      {selectedSessionFilters.includes(sessao) && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </span>
                    <span className={`text-xs font-bold ${selectedSessionFilters.includes(sessao) ? 'text-blue-700' : 'text-slate-600'}`}>{sessao}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedSessionFilters.includes(sessao) ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                      {studentSessionCounts?.[sessao] || 0}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {studentProfile.notes.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 p-10 rounded-3xl text-center">
                <p className="text-slate-400 font-bold uppercase text-xs">Este aluno ainda não possui anotações.</p>
              </div>
            ) : filteredNotes.length > 0 ? (
              filteredNotes.map(n => (
                <div key={n.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  {n.tipoSessao && (
                    <div className="absolute top-0 right-0 bg-amber-50 border-b border-l border-amber-100 px-4 py-1.5 rounded-bl-xl">
                      <span className="text-[10px] font-black text-amber-600 uppercase">{n.tipoSessao}</span>
                    </div>
                  )}
                  <div className={`flex justify-between items-center mb-4 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-50 pb-3 ${n.tipoSessao ? 'mt-8' : 'mt-1'}`}>
                    <span className="text-blue-600 flex items-center gap-1">
                      <User className="w-3 h-3" /> Quem Registrou: {n.teacher}
                    </span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {n.displayDate}</span>
                  </div>
                  <div className="space-y-3">
                    {n.note ? (
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Anotação / Observação</span>
                        <p className="text-slate-700 font-medium leading-relaxed">{n.note}</p>
                      </div>
                    ) : (
                      <p className="text-slate-400 font-medium italic text-sm">Registo sem descrição.</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-dashed border-slate-200 p-10 rounded-3xl text-center">
                <p className="text-slate-400 font-bold uppercase text-xs">Sem anotações registadas para este filtro.</p>
              </div>
            )}
            </div>
          </>
        )}
      </div>

        {/* Prova Paulista em largura total */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowProvaPaulista(!showProvaPaulista)}
              className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 hover:text-blue-600 transition-colors"
              title={showProvaPaulista ? "Recolher" : "Expandir"}
            >
              <TrendingUp className="w-4 h-4" /> Prova Paulista
            </button>
            <button
              onClick={() => setShowProvaPaulista(!showProvaPaulista)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
              title={showProvaPaulista ? "Recolher" : "Expandir"}
            >
              {showProvaPaulista ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showProvaPaulista && (
            <div className="space-y-4">
              {/* Badge de Desempenho Geral */}
              <div className="flex items-center gap-4 p-4 bg-sky-50 rounded-2xl border border-sky-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-0.5">Desempenho Geral</span>
                  <span className="text-3xl font-black text-sky-700 leading-none">{studentProfile.provaPaulista || 'S/D'}</span>
                </div>
                <div className="h-12 w-px bg-sky-200 mx-2" />
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                  Resultado consolidado da<br />Prova Paulista do aluno
                </p>
              </div>

              {/* Tabela por matéria */}
              {chartDataProva.length > 0 ? (
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-black text-slate-500 uppercase tracking-wider">Matéria</th>
                        <th className="px-4 py-3 font-black text-sky-600 uppercase tracking-wider text-center">Aluno</th>
                        <th className="px-4 py-3 font-black text-slate-400 uppercase tracking-wider text-center">Média Turma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartDataProva.map((item, idx) => {
                        const alunoVal  = item.Aluno  != null ? Number(item.Aluno)  : null;
                        const turmaVal  = item.Turma  != null ? Number(item.Turma)  : null;
                        const isAbove   = alunoVal != null && turmaVal != null && alunoVal >= turmaVal;
                        const notaColor = alunoVal == null ? 'text-slate-300'
                          : alunoVal >= 7 ? 'text-emerald-700'
                          : alunoVal >= 5 ? 'text-amber-600'
                          : 'text-red-600';
                        return (
                          <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-sky-50/40 transition-colors`}>
                            <td className="px-4 py-2.5 font-bold text-slate-700">{item.fullSubject || item.subject}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex items-center justify-center min-w-[48px] h-7 px-2 rounded-lg font-black text-[12px] ${alunoVal == null ? 'text-slate-300 bg-slate-50' : alunoVal >= 7 ? 'text-emerald-700 bg-emerald-50' : alunoVal >= 5 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'}`}>
                                {alunoVal != null ? alunoVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[48px] h-7 px-2 rounded-lg font-bold text-[11px] text-slate-500 bg-slate-100">
                                {turmaVal != null ? turmaVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl text-center">
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Sem notas detalhadas por matéria disponíveis</p>
                </div>
              )}
            </div>
          )}
        </div>
    </div>

      {/* ── Evolutivo Numérico: largura total, 2 cards por linha ── */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <button
            onClick={() => setShowEvolutivo(!showEvolutivo)}
            className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 hover:text-blue-600 transition-colors"
            title={showEvolutivo ? "Recolher" : "Expandir"}
          >
            <LineChartIcon className="w-5 h-5 text-blue-600" /> Evolutivo Numérico (Conceito Bimestral)
          </button>
          <button
            onClick={() => setShowEvolutivo(!showEvolutivo)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
            title={showEvolutivo ? "Recolher" : "Expandir"}
          >
            {showEvolutivo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        {showEvolutivo && (
          studentProfile.historicoConceitos?.length > 0 ? (
            <EvolutivoNumerico historicoConceitos={studentProfile.historicoConceitos} />
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-10 rounded-2xl text-center">
              <p className="text-slate-400 font-bold uppercase text-[10px]">Sem dados bimestrais disponíveis</p>
            </div>
          )
        )}
      </div>

      {/* ── Análise Gráfica ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <button
            onClick={() => setShowGrafico(!showGrafico)}
            className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 hover:text-blue-600 transition-colors"
            title={showGrafico ? "Recolher" : "Expandir"}
          >
            <BarChart2 className="w-6 h-6 text-blue-600" /> Análise Gráfica e Comparativa
          </button>
          <button
            onClick={() => setShowGrafico(!showGrafico)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600"
            title={showGrafico ? "Recolher" : "Expandir"}
          >
            {showGrafico ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>
        </div>

        {showGrafico && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Mapão */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center relative" data-chart>
            <button
              onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, `Radar de Equilíbrio (${bimestreRadarLabel})`); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Imprimir este gráfico"
            >
              <Printer className="w-4 h-4" />
            </button>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Equilíbrio ({bimestreRadarLabel})</h4>
            {chartDataMapao.length > 0 ? (
              <div style={{ position: 'relative', width: '100%', height: '288px', minHeight: '288px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartDataMapao} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Radar name="Média Turma" dataKey="Turma" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                    <Radar name="Aluno" dataKey="Aluno" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase text-center px-4">Sem dados numéricos suficientes</p>
              </div>
            )}
          </div>

          {/* Radar Prova Paulista */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center relative" data-chart>
            <button
              onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, 'Radar de Desempenho (Prova Paulista)'); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
              title="Imprimir este gráfico"
            >
              <Printer className="w-4 h-4" />
            </button>
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Desempenho (Prova Paulista)</h4>
            {chartDataProva.length > 0 ? (
              <div style={{ position: 'relative', width: '100%', height: '288px', minHeight: '288px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartDataProva} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Radar name="Média da Turma" dataKey="Turma" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                    <Radar name="Aluno" dataKey="Aluno" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase text-center px-4">Sem disciplinas detalhadas na Prova Paulista</p>
              </div>
            )}
          </div>
        </div>

        {/* Barras comparativas — Mapão */}
        <div className="mt-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative" data-chart>
          <button
            onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, `Mapão — Aluno vs Média da Turma (${bimestreRadarLabel})`); }}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Imprimir este gráfico"
          >
            <Printer className="w-4 h-4" />
          </button>
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
            <span className="text-blue-500">Mapão</span> — Comparação: Aluno vs Média da Turma
            <span className="ml-1 text-slate-300 normal-case font-bold">({bimestreRadarLabel})</span>
          </h4>
          {chartDataMapao.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '384px', minHeight: '384px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartDataMapao} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Bar name="Nota do Aluno" dataKey="Aluno" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Aluno" position="top" style={{ fontSize: 9, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                  <Bar name="Média da Turma" dataKey="Turma" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Turma" position="top" style={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 text-xs font-bold uppercase">Sem dados comparativos suficientes</p>
            </div>
          )}
        </div>

        {/* Barras comparativas — Prova Paulista */}
        <div className="mt-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative" data-chart>
          <button
            onClick={e => { const card = e.currentTarget.closest('[data-chart]'); printChart(card, 'Prova Paulista — Aluno vs Média da Turma'); }}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
            title="Imprimir este gráfico"
          >
            <Printer className="w-4 h-4" />
          </button>
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
            <span className="text-sky-500">Prova Paulista</span> — Comparação: Aluno vs Média da Turma
          </h4>
          {chartDataProva.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '384px', minHeight: '384px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartDataProva} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Bar name="Nota do Aluno" dataKey="Aluno" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Aluno" position="top" style={{ fontSize: 9, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                  <Bar name="Média da Turma" dataKey="Turma" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="Turma" position="top" style={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 text-xs font-bold uppercase">Sem dados comparativos da Prova Paulista</p>
            </div>
          )}
          </div>
        </>
      )}
    </div>
    </div>
  );
};

export default StudentProfile;
