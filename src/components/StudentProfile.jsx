// ─────────────────────────────────────────────────────────────
// components/StudentProfile.jsx — Perfil 360º do aluno
// ─────────────────────────────────────────────────────────────
import React from 'react';
import {
  ChevronLeft, ChevronRight, UserCheck, TrendingUp,
  LineChart as LineChartIcon, History, BarChart2,
  User, Calendar
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';

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

// ── Sub-componente: Evolutivo Numérico por áreas ─────────────
const AREAS = [
  { key: 'exatas',    label: '🔢 Exatas',              keywords: ['MATEM', 'FISICA', 'QUIMIC', 'GEOMET'],                                     headerBg: 'bg-blue-600',   headerText: 'text-white' },
  { key: 'linguagens',label: '📖 Linguagens',           keywords: ['PORTUG', 'LINGUA', 'INGLES', 'ARTE', 'ARTES', 'EDUC.FIS', 'EDUCACAO FISICA','REDACAO'], headerBg: 'bg-violet-600', headerText: 'text-white' },
  { key: 'humanas',   label: '🌍 Humanas',              keywords: ['HISTOR', 'GEOGR', 'FILOSO', 'SOCIOLO', 'ENSINO RELIG'],                     headerBg: 'bg-amber-500',  headerText: 'text-white' },
  { key: 'ciencias',  label: '🔬 Ciências da Natureza', keywords: ['CIENC', 'BIOLOG', 'BIO'],                                                  headerBg: 'bg-emerald-600',headerText: 'text-white' },
];

const classifyDisciplina = (disciplina) => {
  const upper = disciplina.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const area of AREAS) {
    if (area.keywords.some(kw => upper.includes(kw))) return area.key;
  }
  return 'outras';
};

const getNotaColor = (nota) => {
  if (!nota || nota === '-') return 'text-slate-300 bg-slate-50';
  const n = parseFloat(nota.toString().replace(',', '.'));
  if (!isNaN(n)) {
    if (n >= 7) return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    if (n >= 5) return 'text-amber-700 bg-amber-50 border border-amber-100';
    return 'text-red-700 bg-red-50 border border-red-100';
  }
  const up = nota.toUpperCase();
  if (up === 'MB') return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
  if (up === 'B')  return 'text-blue-700 bg-blue-50 border border-blue-100';
  if (up === 'R')  return 'text-amber-700 bg-amber-50 border border-amber-100';
  if (up === 'I')  return 'text-red-700 bg-red-50 border border-red-100';
  return 'text-slate-600 bg-slate-50';
};

const EvolutivoNumerico = ({ historicoConceitos }) => {
  const allDisciplinasSet = new Set();
  historicoConceitos.forEach(bim => Object.keys(bim.notas).forEach(d => allDisciplinasSet.add(d)));
  const allDisciplinas = Array.from(allDisciplinasSet);

  const areaMap = {};
  AREAS.forEach(a => { areaMap[a.key] = []; });
  areaMap['outras'] = [];
  allDisciplinas.forEach(d => areaMap[classifyDisciplina(d)].push(d));

  const renderTable = (disciplinas, area, bimestres) => (
    <div key={area?.key || 'outras'}>
      <div className={`${area ? area.headerBg : 'bg-slate-600'} ${area ? area.headerText : 'text-white'} px-4 py-2 rounded-t-xl`}>
        <span className="text-xs font-black uppercase tracking-widest">{area ? area.label : '📋 Outras Disciplinas'}</span>
      </div>
      <div className="overflow-x-auto rounded-b-xl border border-slate-200">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="text-left px-3 py-2 font-black text-slate-500 uppercase w-24 border-r border-slate-200">Bimestre</th>
              {disciplinas.map(d => (
                <th key={d} className="px-2 py-2 font-black text-slate-600 text-center border-r border-slate-200 last:border-r-0">
                  <span title={d} className="block truncate max-w-[80px]">{d}</span>
                </th>
              ))}
              <th className="px-2 py-2 font-black text-slate-500 text-center w-16">Faltas</th>
            </tr>
          </thead>
          <tbody>
            {bimestres.map((bim, bi) => (
              <tr key={bi} className={`border-t border-slate-100 ${bi % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                <td className="px-3 py-2 font-black text-blue-600 uppercase border-r border-slate-200">{bim.bimestre}</td>
                {disciplinas.map(d => {
                  const nota = bim.notas[d] || '-';
                  return (
                    <td key={d} className="px-2 py-2 text-center border-r border-slate-100 last:border-r-0">
                      <span className={`inline-block px-2 py-0.5 rounded-lg font-black ${getNotaColor(nota)}`}>{nota}</span>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  {bim.faltas && bim.faltas !== '-' ? (
                    <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[9px] ${bim.faltas === '0' || bim.faltas === '0%' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {bim.faltas}
                    </span>
                  ) : <span className="text-slate-300">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
      {AREAS.filter(area => areaMap[area.key]?.length > 0).map(area =>
        renderTable(areaMap[area.key], area, historicoConceitos)
      )}
      {areaMap['outras']?.length > 0 && renderTable(areaMap['outras'], null, historicoConceitos)}
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
  if (!studentProfile) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-300">

      {/* Navegação Anterior/Próximo */}
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
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800">{studentProfile.nome}</h2>
          <div className="flex gap-4 mt-3 text-xs font-bold text-slate-500 uppercase">
            <span className="bg-slate-100 px-4 py-2 rounded-lg text-slate-700">Turma: {studentProfile.turma}</span>
            <span className="bg-slate-100 px-4 py-2 rounded-lg flex items-center gap-1"><UserCheck className="w-3 h-3" /> Tutor: {studentProfile.tutor}</span>
          </div>
        </div>
      </div>

      {/* Coluna esquerda: PP + Evolutivo | Coluna direita: Anotações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          {/* Prova Paulista */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Prova Paulista
            </h3>
            <div className="text-4xl font-black text-blue-600 mb-1">{studentProfile.provaPaulista}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Desempenho Geral</p>
          </div>

          {/* Evolutivo Numérico */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <LineChartIcon className="w-4 h-4" /> Evolutivo Numérico
            </h3>
            {studentProfile.historicoConceitos?.length > 0 ? (
              <EvolutivoNumerico historicoConceitos={studentProfile.historicoConceitos} />
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center">
                <p className="text-slate-400 font-bold uppercase text-[10px]">Sem dados bimestrais</p>
              </div>
            )}
          </div>
        </div>

        {/* Anotações e Sessões */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
              <History className="w-4 h-4" /> Anotações e Sessões
            </h3>

            {studentSessions.length > 1 && (
              <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar Anotações</p>
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

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
          </div>
        </div>
      </div>

      {/* Análise Gráfica */}
      <div className="mt-8">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
          <BarChart2 className="w-6 h-6 text-blue-600" /> Análise Gráfica e Comparativa
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Mapão */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Equilíbrio (Último Bimestre)</h4>
            {chartDataMapao.length > 0 ? (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
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
                <p className="text-slate-400 text-xs font-bold uppercase text-center px-4">Sem dados numéricos suficientes para desenhar o radar</p>
              </div>
            )}
          </div>

          {/* Radar Prova Paulista */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
            <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Radar de Desempenho (Prova Paulista)</h4>
            {chartDataProva.length > 0 ? (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
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
            <div className="w-full h-96">
              <ResponsiveContainer width="100%" height="100%">
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
      </div>
    </div>
  );
};

export default StudentProfile;
