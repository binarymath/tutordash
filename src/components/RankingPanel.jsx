// ─────────────────────────────────────────────────────────────
// components/RankingPanel.jsx — Top 5 PP e CC
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { Trophy, X } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉', '🏅', '🎖️'];

const parseNum = (val) => {
  if (!val || val === 'S/D' || val === 'S/N') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
};

const colorMap = {
  blue: {
    titleText: 'text-blue-700',
    titleBg:   'bg-blue-50/80 border border-blue-200/50',
    icon:      'text-blue-600',
    nota:      'text-blue-700 font-black',
    notaBg:    'bg-blue-50 border border-blue-100',
    border:    'border-slate-200/80 hover:border-blue-300',
    hoverText: 'group-hover:text-blue-600',
  },
  purple: {
    titleText: 'text-purple-700',
    titleBg:   'bg-purple-50/80 border border-purple-200/50',
    icon:      'text-purple-600',
    nota:      'text-purple-700 font-black',
    notaBg:    'bg-purple-50 border border-purple-100',
    border:    'border-slate-200/80 hover:border-purple-300',
    hoverText: 'group-hover:text-purple-600',
  },
};

const RankingList = ({ title, color, students = [], field, onSelectStudent }) => {
  const c = colorMap[color];

  let activePpSubjects = [];
  if (field === 'provaPaulista') {
    const subjectsSet = new Set();
    students.forEach(s => {
      if (s.provaPaulistaNotas) {
        Object.keys(s.provaPaulistaNotas).forEach(subj => subjectsSet.add(subj));
      }
    });
    activePpSubjects = Array.from(subjectsSet).filter(subj =>
      students.some(s => s.provaPaulistaNotas && parseNum(s.provaPaulistaNotas[subj]) !== null)
    );
  }

  const rawRanked = students
    .filter(s => {
      if (field === 'provaPaulista') {
        if (!s.provaPaulistaNotas || activePpSubjects.length === 0) return false;
        return activePpSubjects.every(subj => parseNum(s.provaPaulistaNotas[subj]) !== null);
      }
      return true;
    })
    .map(s => ({ nome: s.nome, tutor: s.tutor, turma: s.turma, val: parseNum(s[field]) }))
    .filter(s => s.val !== null)
    .sort((a, b) => b.val - a.val);

  const ranked = [];
  const seenStudentNames = new Set();
  for (const item of rawRanked) {
    if (!seenStudentNames.has(item.nome)) {
      seenStudentNames.add(item.nome);
      ranked.push(item);
      if (ranked.length === 5) break;
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl mb-3 shadow-xs ${c.titleBg}`}>
        <Trophy className={`w-4 h-4 shrink-0 ${c.icon}`} />
        <span className={`text-[11px] font-black uppercase tracking-wider ${c.titleText}`}>{title}</span>
      </div>

      {ranked.length === 0 ? (
        <p className="text-xs font-bold text-slate-400 uppercase text-center py-6 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
          Sem dados disponíveis
        </p>
      ) : (
        <ol className="space-y-2">
          {ranked.map((s, i) => (
            <li key={s.nome}>
              <button
                onClick={() => onSelectStudent(s.nome)}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border ${c.border} bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}
              >
                <span className="text-lg shrink-0 w-7 text-center leading-none">{MEDALS[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black text-slate-800 truncate ${c.hoverText} transition-colors`}>
                    {s.nome}
                  </p>
                  <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                    <span className="text-[10px] font-black text-blue-700 bg-blue-50/90 border border-blue-100/60 px-2 py-0.5 rounded-md uppercase">
                      {s.turma}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                      {s.tutor}
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-xl shrink-0 shadow-xs ${c.nota} ${c.notaBg}`}>
                  {s.val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

const RankingPanel = ({ students = [], filterLabel, onSelectStudent, show, onToggle }) => {
  if (!show) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden animate-in fade-in duration-200">
      {/* Cabeçalho do Ranking */}
      <div className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white shadow-xs shadow-amber-500/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                Top 5
              </span>
            </div>
            <p className="text-sm font-black text-slate-800 uppercase tracking-wide mt-0.5">{filterLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          title="Fechar Ranking"
          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo com as listas Top 5 */}
      <div className="px-5 pb-5 flex gap-5 flex-col sm:flex-row border-t border-slate-100 pt-4">
        <RankingList
          title="Prova Paulista"
          color="blue"
          students={students}
          field="provaPaulista"
          onSelectStudent={onSelectStudent}
        />
        <div className="hidden sm:block w-px bg-slate-100 self-stretch" />
        <RankingList
          title="Conselho de Classe"
          color="purple"
          students={students}
          field="consilhoBimestral"
          onSelectStudent={onSelectStudent}
        />
      </div>
    </div>
  );
};

export default RankingPanel;
