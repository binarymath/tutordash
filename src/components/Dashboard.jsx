// ─────────────────────────────────────────────────────────────
// components/Dashboard.jsx — Vista principal de tutores/turmas
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { Search, X, UserCheck, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { checkIsTutor } from '../utils/helpers';

const SortIcon = ({ columnKey, sortConfig }) => {
  if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
  return sortConfig.direction === 'asc'
    ? <ArrowUp className="w-3 h-3 text-blue-600" />
    : <ArrowDown className="w-3 h-3 text-blue-600" />;
};

const Dashboard = ({
  allStudents, sortedData, filterMode, setFilterMode,
  selectedValue, setSelectedValue, optionsList, stats,
  searchTerm, setSearchTerm, setSelectedStudent, sortConfig, handleSort
}) => (
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
              <p className="font-bold text-slate-800 text-lg group-hover:text-blue-600">{s.nome}</p>
              <div className="flex gap-3 mt-3">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase">Turma {s.turma}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><UserCheck className="w-3 h-3" /> {s.tutor}</span>
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
              <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">🎓 PP: {s.provaPaulista}</span>
              {s.ultimoMat !== '-' && (
                <span className="text-[10px] font-bold bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-100 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-blue-600 font-black">{s.ultimoBimNome}</span>
                  <span className="text-emerald-600">📊 Mat: {s.ultimoMat}</span>
                  <span className="text-indigo-600">Port: {s.ultimoPort}</span>
                  {s.ultimoFaltas !== '-' && (
                    <span className={s.ultimoFaltas === '0' || s.ultimoFaltas === '0%' ? 'text-emerald-600' : 'text-red-600'}>
                      🚨 Faltas: {s.ultimoFaltas}
                    </span>
                  )}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    ) : (
      /* Vista principal com filtro lateral + tabela */
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filtrar por</p>
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
              <button
                onClick={() => { setFilterMode('tutor'); setSelectedValue('Todos'); }}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg ${filterMode === 'tutor' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >TUTOR</button>
              <button
                onClick={() => { setFilterMode('turma'); setSelectedValue('Todos'); }}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg ${filterMode === 'turma' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
              >TURMA</button>
            </div>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold"
              value={selectedValue}
              onChange={e => setSelectedValue(e.target.value)}
            >
              {optionsList.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg">
            <p className="text-blue-100 text-[10px] font-bold uppercase">Tutorados</p>
            <div className="text-3xl font-black">{stats.totalStudents}</div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <p className="text-slate-400 text-[10px] font-bold uppercase">Turmas</p>
            <div className="text-3xl font-black text-slate-800">{stats.totalGroups}</div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedData.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-800 whitespace-nowrap">{item.turma}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-bold whitespace-nowrap">{item.tutor}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {[...item.tutorados]
                          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                          .sort((a, b) => {
                            if (sortConfig.key !== 'alunos') return 0;
                            return sortConfig.direction === 'asc'
                              ? a.localeCompare(b, 'pt-BR')
                              : b.localeCompare(a, 'pt-BR');
                          })
                          .map((nome, i) => {
                          const studentInfo = allStudents.find(s => s.nome === nome);
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedStudent(nome)}
                              className="text-left bg-white border border-slate-200 p-2 rounded-xl shadow-sm hover:border-blue-400 hover:shadow-md transition-all min-w-[140px] flex-1 sm:flex-none"
                            >
                              <span className="text-[11px] font-bold text-slate-700 block mb-1.5 truncate">{nome}</span>
                              {studentInfo && (
                                <div className="flex gap-1 flex-wrap text-[9px] font-bold text-slate-500">
                                  {studentInfo.noteCount > 0 && (() => {
                                    const isTutorMatch = checkIsTutor(studentInfo.tutor, studentInfo.notes[0].teacher);
                                    return (
                                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${isTutorMatch ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isTutorMatch ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                                        📝 {studentInfo.notes[0].teacher} • Total: {studentInfo.noteCount} • Última: {studentInfo.lastNoteDate}
                                      </span>
                                    );
                                  })()}
                                  {studentInfo.provaPaulista !== 'S/D' && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">PP: {studentInfo.provaPaulista}</span>}
                                  {studentInfo.ultimoMat !== '-' && (
                                    <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded border border-slate-100 w-full mt-1 flex items-center gap-1.5 flex-wrap text-[9px] font-bold">
                                      <span className="text-blue-600 font-black">{studentInfo.ultimoBimNome}</span>
                                      <span className="text-emerald-600">Mat: {studentInfo.ultimoMat}</span>
                                      <span className="text-indigo-600">Port: {studentInfo.ultimoPort}</span>
                                      {studentInfo.ultimoFaltas !== '-' && (
                                        <span className={studentInfo.ultimoFaltas === '0' || studentInfo.ultimoFaltas === '0%' ? 'text-emerald-600' : 'text-red-600'}>
                                          🚨 {studentInfo.ultimoFaltas} faltas
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </div>
);

export default Dashboard;
