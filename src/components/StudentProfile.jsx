// ─────────────────────────────────────────────────────────────
// components/StudentProfile.jsx — Perfil 360º do aluno
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, UserCheck, TrendingUp,
  LineChart as LineChartIcon, History, BarChart2,
  User, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { formatDisciplina } from '../utils/helpers';

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

const getFaltaStyle = (faltas) => {
  if (!faltas || faltas === '-') return 'text-slate-300 bg-white';
  if (faltas === '0' || faltas === '0%') return 'text-emerald-700 bg-emerald-50 font-black';
  return 'text-red-700 bg-red-50 font-black';
};

// ── Evolutivo Numérico: grid 2 colunas, tabela dentro de cada card ──
const EvolutivoNumerico = ({ historicoConceitos }) => {
  // Coleta todas as disciplinas únicas
  const allDisciplinasSet = new Set();
  historicoConceitos.forEach(bim => Object.keys(bim.notas).forEach(d => allDisciplinasSet.add(d)));
  const allDisciplinas = Array.from(allDisciplinasSet);

  // Agrupa por área
  const areaMap = {};
  AREAS.forEach(a => { areaMap[a.key] = []; });
  areaMap['orientacoes'] = [];
  areaMap['outras'] = [];
  allDisciplinas.forEach(d => areaMap[classifyDisciplina(d)].push(d));

  const temFaltas = historicoConceitos.some(b => b.faltas && b.faltas !== '-');

  const renderAreaCard = (disciplinas, area) => {
    const headerBg     = area?.headerBg     ?? 'bg-slate-600';
    const headerText   = area?.headerText   ?? 'text-white';
    const label        = area?.label        ?? '📋 Outras Disciplinas';
    const borderColor  = area?.borderColor  ?? 'border-slate-200';
    const headBg       = area?.headBg       ?? 'bg-slate-50';

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
              {temFaltas && <col className="w-16" />}
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
                {temFaltas && (
                  <th className="px-2 py-2.5 font-black text-slate-500 text-center border-b border-l-2 border-slate-300 bg-slate-100 whitespace-nowrap">
                    Faltas
                  </th>
                )}
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
                  {temFaltas && (
                    <td className="px-2 py-1.5 text-center border-l-2 border-slate-200 bg-slate-50/50">
                      <span className={`inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-lg text-[10px] ${getFaltaStyle(bim.faltas)}`}>
                        {bim.faltas || '-'}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
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
      {/* Card de OE sempre em primeiro */}
      {temOE && renderAreaCard(areaMap['orientacoes'], OE_AREA)}
      {areasComDados.map(area => renderAreaCard(areaMap[area.key], area))}
      {temOutras && renderAreaCard(areaMap['outras'], null)}
    </div>
  );
};

// ── Componente principal: StudentProfile ─────────────────────
const StudentProfile = ({
  studentProfile, filteredNotes, studentSessions,
  selectedSessionFilter, setSelectedSessionFilter,
  prevStudent, nextStudent, setSelectedStudent,
  chartDataMapao, chartDataProva
}) => {
  const [showAnotacoes, setShowAnotacoes] = useState(true);
  const [showEvolutivo, setShowEvolutivo] = useState(true);
  const [showGrafico, setShowGrafico] = useState(true);

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
        <div className="flex gap-4 mt-3 text-xs font-bold text-slate-500 uppercase">
          <span className="bg-slate-100 px-4 py-2 rounded-lg text-slate-700">Turma: {studentProfile.turma}</span>
          <span className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-1"><UserCheck className="w-3 h-3" /> Tutor: {studentProfile.tutor}</span>
        </div>
      </div>

      {/* Prova Paulista + Anotações lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna esquerda: Prova Paulista */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-full">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Prova Paulista
            </h3>
            <div className="text-4xl font-black text-blue-600 mb-1">{studentProfile.provaPaulista}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Desempenho Geral</p>
          </div>
        </div>

        {/* Coluna direita: Anotações */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-4 ml-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4" /> Anotações e Sessões
            </h3>
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

          {studentSessions.length > 1 && (
            <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar por Tipo</p>
              <div className="flex flex-wrap gap-3">
                {studentSessions.map(sessao => (
                  <label
                    key={sessao}
                    className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border transition-all ${selectedSessionFilter === sessao ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}
                  >
                    <input
                      type="radio"
                      name="sessionFilter"
                      value={sessao}
                      checked={selectedSessionFilter === sessao}
                      onChange={e => setSelectedSessionFilter(e.target.value)}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${selectedSessionFilter === sessao ? 'text-blue-700' : 'text-slate-600'}`}>{sessao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredNotes.length > 0 ? (
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
    </div>

      {/* ── Evolutivo Numérico: largura total, 2 cards por linha ── */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-blue-600" /> Evolutivo Numérico
          </h3>
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
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" /> Análise Gráfica e Comparativa
          </h3>
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Equilíbrio (Último Bimestre)</h4>
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
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
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
                    <Radar name="Prova Paulista" dataKey="Desempenho" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
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

        {/* Barras comparativas */}
        <div className="mt-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Comparação Detalhada: Aluno vs Média da Turma (Último Bimestre)</h4>
          {chartDataMapao.length > 0 ? (
            <div style={{ position: 'relative', width: '100%', height: '384px', minHeight: '384px' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartDataMapao} margin={{ top: 20, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} angle={-45} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                  <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                  <Bar name="Nota do Aluno" dataKey="Aluno" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar name="Média da Turma" dataKey="Turma" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-64 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-400 text-xs font-bold uppercase">Sem dados comparativos suficientes</p>
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
