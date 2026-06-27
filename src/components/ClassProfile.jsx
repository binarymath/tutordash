// ─────────────────────────────────────────────────────────────
// components/ClassProfile.jsx — Painel Executivo e Comparativo de Turma
// ─────────────────────────────────────────────────────────────
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Users, TrendingUp, BookOpen, Printer,
  Maximize2, Minimize2, X, BarChart2, Award, PieChart, ShieldCheck
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend, LabelList
} from 'recharts';
import {
  buildTurmaChartDataMapao,
  buildTurmaChartDataProva,
  buildTurmaEvolucaoData
} from '../utils/buildChartData';
import { parseGrade, toScale10, formatDisciplina, getSerieFromTurma } from '../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-xl text-white text-xs z-50">
      <p className="font-black border-b border-slate-700/80 pb-2 mb-2 text-sky-300 uppercase tracking-wider">{payload[0]?.payload?.fullSubject || label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-bold text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-black text-white text-sm">
              {entry.value !== null && entry.value !== undefined ? Number(entry.value).toFixed(entry.dataKey?.includes('pp') || entry.name?.includes('PP') || entry.name?.includes('Prova') ? 2 : 1) : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ClassProfile = ({
  selectedTurma,
  setSelectedTurma,
  allStudents = [],
  conceitoData = [],
  provaData = []
}) => {
  const [selectedBimestre, setSelectedBimestre] = useState('ultimo');
  const [maximizedChart, setMaximizedChart] = useState(null);

  const serieLabel = useMemo(() => getSerieFromTurma(selectedTurma), [selectedTurma]);

  const allTurmasSorted = useMemo(() => {
    const s = new Set(allStudents.map(st => st.turma).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents]);

  const { prevTurma, nextTurma } = useMemo(() => {
    const idx = allTurmasSorted.indexOf(selectedTurma);
    if (idx === -1) return { prevTurma: null, nextTurma: null };
    return {
      prevTurma: idx > 0 ? allTurmasSorted[idx - 1] : null,
      nextTurma: idx < allTurmasSorted.length - 1 ? allTurmasSorted[idx + 1] : null,
    };
  }, [allTurmasSorted, selectedTurma]);

  const studentsInTurma = useMemo(() => {
    return allStudents.filter(s => s.turma === selectedTurma);
  }, [allStudents, selectedTurma]);

  // Bimestres disponíveis
  const bimestresDisponiveis = useMemo(() => {
    const setBim = new Set([
      ...conceitoData.map(c => c.bimestre),
      ...provaData.map(p => p.bimestre)
    ]);
    return Array.from(setBim).filter(Boolean).sort();
  }, [conceitoData, provaData]);

  const evolucaoDados = useMemo(() => {
    return buildTurmaEvolucaoData(selectedTurma, conceitoData, provaData, allStudents);
  }, [selectedTurma, conceitoData, provaData, allStudents]);

  // Métricas Consolidadas da Turma (Dinâmicas por Bimestre)
  const heroMetrics = useMemo(() => {
    const total = studentsInTurma.length;
    if (!total) return { total: 0, mediaCC: '-', mediaPP: '-' };

    let targetBim = selectedBimestre;
    if (targetBim === 'ultimo') {
      targetBim = bimestresDisponiveis[bimestresDisponiveis.length - 1] || '';
    }

    if (targetBim === 'evolucao' || !targetBim) {
      let ccSum = 0, ccCnt = 0;
      let ppSum = 0, ppCnt = 0;
      studentsInTurma.forEach(s => {
        const nCC = parseFloat(String(s.consilhoBimestral || '').replace(',', '.'));
        if (!isNaN(nCC) && nCC >= 0) { ccSum += nCC; ccCnt++; }
        const nPP = parseFloat(String(s.provaPaulista || '').replace(',', '.'));
        if (!isNaN(nPP) && nPP >= 0) { ppSum += nPP; ppCnt++; }
      });
      return {
        total,
        mediaCC: ccCnt > 0 ? (ccSum / ccCnt).toFixed(1) : '-',
        mediaPP: ppCnt > 0 ? (ppSum / ppCnt).toFixed(2) : '-'
      };
    }

    const bimLabel = targetBim.replace('º Bimestre', 'º Bi');
    const bData = evolucaoDados.find(e => e.bimestre === bimLabel);

    return {
      total,
      mediaCC: bData && bData.ccTurma > 0 ? Number(bData.ccTurma).toFixed(1) : '-',
      mediaPP: bData && bData.ppTurma > 0 ? Number(bData.ppTurma).toFixed(2) : '-'
    };
  }, [studentsInTurma, selectedBimestre, bimestresDisponiveis, evolucaoDados]);

  const chartDataMapao = useMemo(() => {
    return buildTurmaChartDataMapao(selectedTurma, conceitoData, allStudents, selectedBimestre);
  }, [selectedTurma, conceitoData, allStudents, selectedBimestre]);

  const chartDataProva = useMemo(() => {
    return buildTurmaChartDataProva(selectedTurma, provaData, allStudents, selectedBimestre);
  }, [selectedTurma, provaData, allStudents, selectedBimestre]);

  const evolucaoDisciplinas = useMemo(() => {
    if (!selectedTurma) return { cc: [], pp: [] };
    const stTurma = allStudents.filter(s => s.turma === selectedTurma);
    const normSet = new Set(stTurma.map(s => s.normalizedName));

    const mapCC = new Map();
    const mapPP = new Map();

    conceitoData.forEach(reg => {
      const isTurma = normSet.has(reg.normalizedName) || reg.turmaPlanilha === selectedTurma;
      if (!isTurma || !reg.notas || !reg.bimestre) return;

      Object.entries(reg.notas).forEach(([disc, valRaw]) => {
        const n = parseGrade(valRaw);
        if (n > 0 || (valRaw && valRaw !== '-')) {
          const val = n > 0 ? n : 0;
          if (!mapCC.has(disc)) {
            const disp = formatDisciplina(disc);
            mapCC.set(disc, { fullSubject: disp, subject: disp.length > 12 ? `${disp.substring(0,10)}.` : disp });
          }
          const item = mapCC.get(disc);
          if (!item[reg.bimestre]) item[reg.bimestre] = { sum: 0, cnt: 0 };
          item[reg.bimestre].sum += val;
          item[reg.bimestre].cnt += 1;
        }
      });
    });

    provaData.forEach(reg => {
      const isTurma = normSet.has(reg.normalizedName) || reg.turmaPlanilha === selectedTurma;
      if (!isTurma || !reg.notas || !reg.bimestre) return;

      Object.entries(reg.notas).forEach(([disc, valRaw]) => {
        const n = toScale10(valRaw);
        if (n !== null) {
          if (!mapPP.has(disc)) {
            const disp = formatDisciplina(disc);
            mapPP.set(disc, { fullSubject: disp, subject: disp.length > 12 ? `${disp.substring(0,10)}.` : disp });
          }
          const item = mapPP.get(disc);
          if (!item[reg.bimestre]) item[reg.bimestre] = { sum: 0, cnt: 0 };
          item[reg.bimestre].sum += n;
          item[reg.bimestre].cnt += 1;
        }
      });
    });

    const cc = Array.from(mapCC.values()).map(item => {
      const res = { subject: item.subject, fullSubject: item.fullSubject };
      bimestresDisponiveis.forEach(b => {
        if (item[b] && item[b].cnt > 0) {
          res[b] = parseFloat((item[b].sum / item[b].cnt).toFixed(1));
        } else {
          res[b] = null;
        }
      });
      return res;
    });

    const pp = Array.from(mapPP.values()).map(item => {
      const res = { subject: item.subject, fullSubject: item.fullSubject };
      bimestresDisponiveis.forEach(b => {
        if (item[b] && item[b].cnt > 0) {
          res[b] = parseFloat((item[b].sum / item[b].cnt).toFixed(2));
        } else {
          res[b] = null;
        }
      });
      return res;
    });

    return { cc, pp };
  }, [selectedTurma, conceitoData, provaData, allStudents, bimestresDisponiveis]);

  const activeBimestreLabel = useMemo(() => {
    if (selectedBimestre === 'evolucao') return 'Evolução Comparativa Histórica';
    if (selectedBimestre === 'ultimo') {
      return bimestresDisponiveis[bimestresDisponiveis.length - 1] || 'Período Atual';
    }
    return selectedBimestre;
  }, [selectedBimestre, bimestresDisponiveis]);

  const printChart = (chartNode, title) => {
    window.print();
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
              <Bar name="Média da Turma" dataKey="ccTurma" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ccTurma" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="ccEscola" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ccEscola" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'evolucaoDiscCC':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDisciplinas.cc} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              {bimestresDisponiveis.map((bim, idx) => (
                <Bar key={bim} name={bim} dataKey={bim} fill={['#93c5fd', '#3b82f6', '#1d4ed8', '#172554'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={45}>
                  <LabelList dataKey={bim} position="top" style={{ fontSize: 10, fontWeight: 700, fill: ['#60a5fa', '#2563eb', '#1e40af', '#172554'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                </Bar>
              ))}
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
              <Bar name="Média da Turma" dataKey="ppTurma" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ppTurma" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="ppEscola" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="ppEscola" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'evolucaoDiscPP':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolucaoDisciplinas.pp} margin={{ top: 25, right: 10, left: -20, bottom: 85 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={85} />
              <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 13 }} axisLine={false} tickLine={false} />
              <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingBottom: '15px' }} />
              {bimestresDisponiveis.map((bim, idx) => (
                <Bar key={bim} name={bim} dataKey={bim} fill={['#7dd3fc', '#0ea5e9', '#0369a1', '#082f49'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={45}>
                  <LabelList dataKey={bim} position="top" style={{ fontSize: 10, fontWeight: 700, fill: ['#38bdf8', '#0284c7', '#075985', '#082f49'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                </Bar>
              ))}
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
              <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
              <Radar name="Média da Turma" dataKey="Turma" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
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
              <Bar name="Média da Turma" dataKey="Turma" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
              </Bar>
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
              <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
              <Radar name="Média da Turma" dataKey="Turma" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
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
              <Bar name="Média da Turma" dataKey="Turma" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
              </Bar>
              <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (!selectedTurma) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Botão de Retorno e Navegação Rápida entre Turmas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <button
          onClick={() => setSelectedTurma(null)}
          className="flex items-center justify-center gap-2 text-sm font-black text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-widest bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200"
        >
          <ChevronLeft className="w-5 h-5" /> Voltar para Lista Geral
        </button>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={() => prevTurma && setSelectedTurma(prevTurma)}
            disabled={!prevTurma}
            className={`flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${!prevTurma ? 'text-slate-300 bg-white/50 border-slate-100 cursor-not-allowed shadow-none' : 'text-slate-700 bg-white border-slate-200 shadow-sm hover:text-blue-600 hover:border-blue-300 active:scale-95'}`}
            title={prevTurma ? `Ir para Turma ${prevTurma}` : 'Não há turma anterior'}
          >
            <ChevronLeft className="w-4 h-4 text-blue-600" /> {prevTurma ? `Turma ${prevTurma}` : 'Anterior'}
          </button>
          <button
            onClick={() => nextTurma && setSelectedTurma(nextTurma)}
            disabled={!nextTurma}
            className={`flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-2xl border transition-all ${!nextTurma ? 'text-slate-300 bg-white/50 border-slate-100 cursor-not-allowed shadow-none' : 'text-slate-700 bg-white border-slate-200 shadow-sm hover:text-blue-600 hover:border-blue-300 active:scale-95'}`}
            title={nextTurma ? `Ir para Turma ${nextTurma}` : 'Não há próxima turma'}
          >
            {nextTurma ? `Turma ${nextTurma}` : 'Próximo'} <ChevronRight className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Hero Banner da Turma */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Users className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <span className="text-sky-400 font-extrabold text-xs uppercase tracking-widest bg-sky-950/80 border border-sky-800/50 px-3.5 py-1.5 rounded-xl">Inteligência Coletiva</span>
            
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => prevTurma && setSelectedTurma(prevTurma)}
                disabled={!prevTurma}
                className={`p-2 rounded-2xl border transition-all ${!prevTurma ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-white/10 hover:bg-white/20 text-white border-white/20 active:scale-90'}`}
                title={prevTurma ? `Ir para Turma ${prevTurma}` : 'Não há turma anterior'}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">Turma {selectedTurma}</h1>
              <button
                onClick={() => nextTurma && setSelectedTurma(nextTurma)}
                disabled={!nextTurma}
                className={`p-2 rounded-2xl border transition-all ${!nextTurma ? 'opacity-20 cursor-not-allowed border-transparent' : 'bg-white/10 hover:bg-white/20 text-white border-white/20 active:scale-90'}`}
                title={nextTurma ? `Ir para Turma ${nextTurma}` : 'Não há próxima turma'}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <p className="text-slate-300 text-sm font-medium mt-2 max-w-xl">
              Análise comparativa de desempenho acadêmico, equilíbrio por componente curricular e evolução bimestral em relação à média geral da escola.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudantes</p>
              <p className="text-2xl font-black text-white mt-1">{heroMetrics.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Média CC</p>
              <p className="text-2xl font-black text-purple-200 mt-1">{heroMetrics.mediaCC}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center min-w-[110px]">
              <p className="text-[10px] font-black text-sky-300 uppercase tracking-widest">Média PP</p>
              <p className="text-2xl font-black text-sky-200 mt-1">{heroMetrics.mediaPP}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Bimestre / Visão */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 shrink-0">Período Analisado:</span>
        <button
          onClick={() => setSelectedBimestre('evolucao')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${selectedBimestre === 'evolucao' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <TrendingUp className="w-4 h-4" /> Evolução Comparativa
        </button>
        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />
        {bimestresDisponiveis.map(bim => (
          <button
            key={bim}
            onClick={() => setSelectedBimestre(bim)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${selectedBimestre === bim ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {bim}
          </button>
        ))}
        <button
          onClick={() => setSelectedBimestre('ultimo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${selectedBimestre === 'ultimo' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Último Disponível
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {selectedBimestre === 'evolucao' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Evolução CC Turma */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[380px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoCC', title: `Evolução Média Geral — Conselho (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Evolução Média Geral — Conselho</h4>
              <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '15px' }} />
                    <Bar name="Média da Turma" dataKey="ccTurma" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ccTurma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
                    </Bar>
                    <Bar name={`Média (${serieLabel})`} dataKey="ccEscola" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ccEscola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(1) : '-'} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução PP Turma */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[380px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoPP', title: `Evolução Média Geral — Prova Paulista (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Evolução Média Geral — Prova Paulista</h4>
              <div style={{ position: 'relative', width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDados} margin={{ top: 25, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="bimestre" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '15px' }} />
                    <Bar name="Média da Turma" dataKey="ppTurma" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ppTurma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
                    </Bar>
                    <Bar name={`Média (${serieLabel})`} dataKey="ppEscola" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={45}>
                      <LabelList dataKey="ppEscola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} formatter={(v) => v > 0 ? Number(v).toFixed(2) : '-'} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Evolução por Disciplina - Conselho */}
          {evolucaoDisciplinas.cc.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[420px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoDiscCC', title: `Evolução por Disciplina — Conselho (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Conselho — Evolução Comparativa por Disciplina</h4>
              <div style={{ position: 'relative', width: '100%', height: '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDisciplinas.cc} margin={{ top: 25, right: 10, left: -20, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                    {bimestresDisponiveis.map((bim, idx) => (
                      <Bar key={bim} name={bim} dataKey={bim} fill={['#93c5fd', '#3b82f6', '#1d4ed8', '#172554'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={35}>
                        <LabelList dataKey={bim} position="top" style={{ fontSize: 9, fontWeight: 700, fill: ['#60a5fa', '#2563eb', '#1e40af', '#172554'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Evolução por Disciplina - Prova Paulista */}
          {evolucaoDisciplinas.pp.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative min-h-[420px]" data-chart>
              <div className="absolute top-4 right-4 flex items-center gap-1">
                <button
                  onClick={() => setMaximizedChart({ type: 'evolucaoDiscPP', title: `Evolução por Disciplina — Prova Paulista (Turma ${selectedTurma})` })}
                  className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                  title="Maximizar gráfico"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center pr-12">Prova Paulista — Evolução Comparativa por Disciplina</h4>
              <div style={{ position: 'relative', width: '100%', height: '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoDisciplinas.pp} margin={{ top: 25, right: 10, left: -20, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                    <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                    {bimestresDisponiveis.map((bim, idx) => (
                      <Bar key={bim} name={bim} dataKey={bim} fill={['#7dd3fc', '#0ea5e9', '#0369a1', '#082f49'][idx % 4]} radius={[4, 4, 0, 0]} maxBarSize={35}>
                        <LabelList dataKey={bim} position="top" style={{ fontSize: 9, fontWeight: 700, fill: ['#38bdf8', '#0284c7', '#075985', '#082f49'][idx % 4] }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-xs font-bold">
            💡 Dica pedagógica: Compare a evolução da Média da Turma em relação à Média ({serieLabel}) para identificar em quais bimestres a turma obteve saltos de aprendizagem ou necessitou de intervenção pedagógica coletiva.
          </div>
        </div>
      ) : (
        /* Visão por Bimestre Específico */
        <div className="space-y-12">
          
          {/* Seção 1: Conselho Bimestral */}
          {chartDataMapao.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Conselho Bimestral (Notas Escolares)</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeBimestreLabel}</p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase px-3.5 py-1.5 bg-blue-50 text-blue-700 rounded-xl">Componentes Curriculares</span>
              </div>

              <div className="space-y-8">
                {/* Radar Conselho */}
                <div className="w-full bg-slate-50/80 p-6 md:p-8 rounded-3xl border border-slate-100 flex flex-col items-center relative min-h-[380px]" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'radarCC', title: `Radar de Equilíbrio — Conselho (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white transition-colors shadow-sm"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-widest text-center">Radar de Equilíbrio Coletivo</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataMapao}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.3} />
                        <Radar name="Média da Turma" dataKey="Turma" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Barras Conselho */}
                <div className="w-full bg-white p-6 md:p-8 rounded-3xl relative min-h-[400px] border border-slate-100 shadow-sm" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'barrasCC', title: `Comparativo de Notas — Conselho (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center">Comparativo de Média por Disciplina</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataMapao} margin={{ top: 20, right: 10, left: -20, bottom: 65 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                        <Bar name="Média da Turma" dataKey="Turma" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#3b82f6' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                        </Bar>
                        <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(1) : ''} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Seção 2: Prova Paulista */}
          {chartDataProva.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Prova Paulista (Avaliação Estadual)</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeBimestreLabel}</p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase px-3.5 py-1.5 bg-sky-50 text-sky-700 rounded-xl">Desempenho por Componente</span>
              </div>

              <div className="space-y-8">
                {/* Radar Prova Paulista */}
                <div className="w-full bg-sky-50/50 p-6 md:p-8 rounded-3xl border border-sky-100 flex flex-col items-center relative min-h-[380px]" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'radarPP', title: `Desempenho por Área — Prova Paulista (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-white transition-colors shadow-sm"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-sky-600 uppercase mb-4 tracking-widest text-center">Desempenho por Área Coletivo</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartDataProva}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        <Radar name={`Média (${serieLabel})`} dataKey="Escola" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                        <Radar name="Média da Turma" dataKey="Turma" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Barras Prova Paulista */}
                <div className="w-full bg-white p-6 md:p-8 rounded-3xl relative min-h-[400px] border border-slate-100 shadow-sm" data-chart>
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      onClick={() => setMaximizedChart({ type: 'barrasPP', title: `Comparativo de Notas — Prova Paulista (Turma ${selectedTurma} - ${activeBimestreLabel})` })}
                      className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      title="Maximizar gráfico"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest text-center">Comparativo de Média Estadual</h4>
                  <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataProva} margin={{ top: 20, right: 10, left: -20, bottom: 65 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} height={65} />
                        <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                        <Bar name="Média da Turma" dataKey="Turma" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Turma" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0ea5e9' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                        </Bar>
                        <Bar name={`Média (${serieLabel})`} dataKey="Escola" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={45}>
                          <LabelList dataKey="Escola" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} formatter={(v) => v != null ? Number(v).toFixed(2) : ''} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartDataMapao.length === 0 && chartDataProva.length === 0 && (
            <div className="bg-white border border-dashed border-slate-300 p-20 rounded-3xl text-center shadow-sm">
              <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-700 tracking-tight">Nenhuma avaliação registrada para a Turma {selectedTurma} neste período</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium">Esta turma não possui consolidados cadastrados no período selecionado.<br/>Escolha outro bimestre ou acesse a visão de Evolução Comparativa Histórica no topo.</p>
            </div>
          )}

        </div>
      )}

      {/* Modal Maximizado */}
      {maximizedChart && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col p-4 md:p-10 animate-fade-in">
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

export default ClassProfile;
