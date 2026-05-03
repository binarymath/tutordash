// ─────────────────────────────────────────────────────────────
// components/Dashboard.jsx — Vista principal de tutores/turmas
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Search, X, UserCheck, ArrowUpDown, ArrowUp, ArrowDown, Table, Download } from 'lucide-react';
import { checkIsTutor } from '../utils/helpers';
import { getXLSX } from '../services/api';
import RankingPanel from './RankingPanel';

const SortIcon = ({ columnKey, sortConfig }) => {
  if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
  return sortConfig.direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-blue-600" />
    : <ArrowDown className="w-3 h-3 text-blue-600" />;
};

const Dashboard = ({
  allStudents, sortedData, filterMode, setFilterMode,
  selectedValue, setSelectedValue, optionsList, stats,
  searchTerm, setSearchTerm, setSelectedStudent, sortConfig, handleSort,
  showOnlyActive, setShowOnlyActive, rankingStudents, filterLabel
}) => {
  const [showRanking, setShowRanking] = useState(false);
  const [gradeViewMode, setGradeViewMode] = useState('geral');

  const handleExportExcel = async () => {
    try {
      const XLSX = await getXLSX();
      
      const exportData = sortedData.map(s => ({
        "Aluno": s.nome,
        "Turma": s.turma,
        "Tutor": s.tutor,
        "Situação": s.situacao,
        "PP - Geral": s.provaPaulista,
        "PP - Matemática": s.ppMat,
        "PP - Português": s.ppPort,
        "CC - Geral": s.consilhoBimestral,
        "CC - Matemática": s.ccMat,
        "CC - Português": s.ccPort,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");

      const safeValue = String(selectedValue).replace(/[^a-z0-9]/gi, '_');
      const filename = `TutorDash_${filterMode}_${safeValue}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Erro ao exportar excel:", err);
      alert("Não foi possível gerar o arquivo Excel.");
    }
  };

  return (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Barra de busca */}
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
      <Search className="text-slate-400" />
      <input
        type="text"
        placeholder="Pesquisar criança pelo nome..."
        className="flex-1 outline-none font-bold text-slate-700 bg-transparent"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button onClick={() => setSearchTerm('')}>
          <X className="text-slate-400 hover:text-red-500" />
        </button>
      )}
    </div>

    {/* Resultado da busca */}
    {searchTerm ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allStudents.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((s, i) => (
          <button
            key={i}
            onClick={() => { setSelectedStudent(s.nome); setSearchTerm(''); }}
            className="text-left p-6 rounded-3xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-800 text-lg group-hover:text-blue-600 flex-1 min-w-0 truncate">{s.nome}</p>
                {s.provaPaulista !== 'S/D' && <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 shrink-0">PP: {s.provaPaulista}</span>}
                {s.consilhoBimestral !== 'S/D' && <span className="text-[9px] font-bold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 shrink-0">CC: {s.consilhoBimestral}</span>}
              </div>
              <div className="flex gap-3 mt-3 flex-wrap">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">Turma {s.turma}</span>
                <span className={`text-[10px] font-bold uppercase flex items-center gap-1 px-2 py-1 rounded ${s.tutor === 'Sem Tutor' ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50'}`}>
                  <UserCheck className="w-3 h-3" /> {s.tutor}
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${s.situacao === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                  {s.situacao}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 flex-wrap">
              {s.noteCount > 0 && (() => {
                const isTutorMatch = checkIsTutor(s.tutor, s.notes[0].teacher);
                return (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${isTutorMatch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isTutorMatch ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                    📝 Por: {s.notes[0].teacher} • Total: {s.noteCount} • Última: {s.lastNoteDate}
                  </span>
                );
              })()}
            </div>
          </button>
        ))}
      </div>
    ) : (
      /* Vista principal com filtro lateral + tabela */
      <div className="space-y-6">
        {/* Ranking Top 5 */}
        <RankingPanel
          students={rankingStudents}
          filterLabel={filterLabel}
          onSelectStudent={setSelectedStudent}
          show={showRanking}
          onToggle={() => setShowRanking(v => !v)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filtrar por</p>
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4 gap-1 overflow-x-auto">
              <button
                onClick={() => { setFilterMode('tutor'); setSelectedValue('Todos'); }}
                className={`flex-1 min-w-[60px] py-2 text-[10px] font-black rounded-lg ${filterMode === 'tutor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >TUTOR</button>
              <button
                onClick={() => { setFilterMode('serie'); setSelectedValue('Todos'); }}
                className={`flex-1 min-w-[60px] py-2 text-[10px] font-black rounded-lg ${filterMode === 'serie' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >NÍVEL</button>
              <button
                onClick={() => { setFilterMode('turma'); setSelectedValue('Todos'); }}
                className={`flex-1 min-w-[60px] py-2 text-[10px] font-black rounded-lg ${filterMode === 'turma' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >TURMA</button>
            </div>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold mb-4"
              value={selectedValue}
              onChange={e => setSelectedValue(e.target.value)}
            >
              {optionsList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox" 
                checked={showOnlyActive} 
                onChange={(e) => setShowOnlyActive(e.target.checked)} 
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
              />
              <span className="text-xs font-bold text-slate-700">Apenas alunos Ativos</span>
            </label>
          </div>
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg">
            <p className="text-blue-100 text-[10px] font-bold uppercase">Tutorados</p>
            <div className="text-3xl font-black">{stats.totalStudents}</div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-[10px] font-bold uppercase">Turmas</p>
            <div className="text-3xl font-black text-slate-800">{stats.totalGroups}</div>
          </div>
          
          {stats.performanceStats && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="bg-sky-50 rounded-3xl p-6 border border-sky-100 shadow-sm relative overflow-hidden group">
                <p className="text-sky-600 text-[10px] font-bold uppercase mb-1">{stats.performanceStats.titlePP}</p>
                <div className="text-3xl font-black text-sky-800">{stats.performanceStats.ppAvg}</div>
                {stats.performanceStats.ppRank && (
                  <div className="mt-2 text-xs font-bold text-sky-600/80">Ranking: {stats.performanceStats.ppRank}</div>
                )}
              </div>
              <div className="bg-purple-50 rounded-3xl p-6 border border-purple-100 shadow-sm relative overflow-hidden group">
                <p className="text-purple-600 text-[10px] font-bold uppercase mb-1">{stats.performanceStats.titleCC}</p>
                <div className="text-3xl font-black text-purple-800">{stats.performanceStats.ccAvg}</div>
                {stats.performanceStats.ccRank && (
                  <div className="mt-2 text-xs font-bold text-purple-600/80">Ranking: {stats.performanceStats.ccRank}</div>
                )}
              </div>
            </div>
          )}
        </aside>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            
            <div className="flex items-center gap-2 p-4 border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2 shrink-0">Visão de Notas:</span>
              <div className="flex bg-slate-200/50 p-1 rounded-lg shrink-0">
                <button 
                  onClick={() => setGradeViewMode('geral')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${gradeViewMode === 'geral' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Média Geral
                </button>
                <button 
                  onClick={() => setGradeViewMode('matematica')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${gradeViewMode === 'matematica' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Matemática
                </button>
                <button 
                  onClick={() => setGradeViewMode('portugues')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${gradeViewMode === 'portugues' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Português
                </button>
              </div>
              <div className="flex-1"></div>
              <button
                onClick={handleExportExcel}
                title="Baixar Tabela em Excel"
                className="p-1.5 mr-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5 group"
              >
                <Table className="w-4 h-4" />
                <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-xs">Baixar Excel</span>
              </button>
            </div>

            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('turma')}>
                    <div className="flex items-center gap-2">Turma <SortIcon columnKey="turma" sortConfig={sortConfig} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('tutor')}>
                    <div className="flex items-center gap-2">Tutor <SortIcon columnKey="tutor" sortConfig={sortConfig} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('alunos')}>
                    <div className="flex items-center gap-2">Alunos <SortIcon columnKey="alunos" sortConfig={sortConfig} /></div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(gradeViewMode === 'matematica' ? 'pp_mat' : gradeViewMode === 'portugues' ? 'pp_port' : 'pp')}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {gradeViewMode === 'geral' ? 'PP' : gradeViewMode === 'matematica' ? 'PP (Mat)' : 'PP (Port)'} 
                      <SortIcon columnKey={gradeViewMode === 'matematica' ? 'pp_mat' : gradeViewMode === 'portugues' ? 'pp_port' : 'pp'} sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(gradeViewMode === 'matematica' ? 'cc_mat' : gradeViewMode === 'portugues' ? 'cc_port' : 'cc')}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {gradeViewMode === 'geral' ? 'CC' : gradeViewMode === 'matematica' ? 'CC (Mat)' : 'CC (Port)'} 
                      <SortIcon columnKey={gradeViewMode === 'matematica' ? 'cc_mat' : gradeViewMode === 'portugues' ? 'cc_port' : 'cc'} sortConfig={sortConfig} />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('situacao')}>
                    <div className="flex items-center gap-2">Status <SortIcon columnKey="situacao" sortConfig={sortConfig} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedData.map((student, i) => (
                  <tr key={`${student.turma}-${student.nome}-${i}`} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-800 whitespace-nowrap">{student.turma}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] px-2 py-1 rounded-md font-bold whitespace-nowrap ${student.tutor === 'Sem Tutor' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}>
                        {student.tutor}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-full">
                      <button
                        onClick={() => setSelectedStudent(student.nome)}
                        className="text-left bg-white border border-slate-200 p-2 rounded-xl shadow-sm hover:border-blue-400 hover:shadow-md transition-all w-full"
                      >
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-700 truncate flex-1 min-w-0">{student.nome}</span>
                        </div>
                        {student.noteCount > 0 && (() => {
                          const isTutorMatch = checkIsTutor(student.tutor, student.notes[0].teacher);
                          return (
                            <div className="flex gap-1 flex-wrap text-[9px] font-bold mt-1">
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${isTutorMatch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isTutorMatch ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                📝 {student.notes[0].teacher} • Total: {student.noteCount} • Última: {student.lastNoteDate}
                              </span>
                            </div>
                          );
                        })()}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const val = gradeViewMode === 'geral' ? student.provaPaulista : gradeViewMode === 'matematica' ? student.ppMat : student.ppPort;
                        return val && val !== 'S/D' && val !== 'S/N' && val !== '-' ? (
                          <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                            {val}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">S/D</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const val = gradeViewMode === 'geral' ? student.consilhoBimestral : gradeViewMode === 'matematica' ? student.ccMat : student.ccPort;
                        return val && val !== 'S/D' && val !== 'S/N' && val !== '-' ? (
                          <span className="text-[11px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-100">
                            {val}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">S/D</span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${student.situacao === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                        {student.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    )}

  </div>
  );
};

export default Dashboard;

