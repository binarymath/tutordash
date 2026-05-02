// ─────────────────────────────────────────────────────────────
// components/RankingPanel.jsx — Top 5 PP e CC
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉', '🏅', '🎖️'];

const parseNum = (val) => {
  if (!val || val === 'S/D' || val === 'S/N') return null;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
};

const colorMap = {
  blue: {
    titleText: 'text-blue-700',
    titleBg:   'bg-blue-50',
    icon:      'text-blue-500',
    nota:      'text-blue-700',
    notaBg:    'bg-blue-50',
    border:    'border-blue-100',
    hoverText: 'group-hover:text-blue-600',
  },
  purple: {
    titleText: 'text-purple-700',
    titleBg:   'bg-purple-50',
    icon:      'text-purple-500',
    nota:      'text-purple-700',
    notaBg:    'bg-purple-50',
    border:    'border-purple-100',
    hoverText: 'group-hover:text-purple-600',
  },
};

const RankingList = ({ title, color, students, field, onSelectStudent }) => {
  const c = colorMap[color];

  const ranked = students
    .map(s => ({ nome: s.nome, tutor: s.tutor, turma: s.turma, val: parseNum(s[field]) }))
    .filter(s => s.val !== null)
    .sort((a, b) => b.val - a.val)
    .slice(0, 5);

  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 ${c.titleBg}`}>
        <Trophy className={`w-3.5 h-3.5 shrink-0 ${c.icon}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${c.titleText}`}>{title}</span>
      </div>

      {ranked.length === 0 ? (
        <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-4">Sem dados disponíveis</p>
      ) : (
        <ol className="space-y-1.5">
          {ranked.map((s, i) => (
            <li key={s.nome}>
              <button
                onClick={() => onSelectStudent(s.nome)}
                className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-xl border ${c.border} bg-white hover:shadow-sm transition-all group`}
              >
                <span className="text-base shrink-0 w-6 text-center leading-none">{MEDALS[i]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-bold text-slate-700 truncate ${c.hoverText} transition-colors`}>
                    {s.nome}
                  </p>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                      {s.turma}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                      {s.tutor}
                    </span>
                  </div>
                </div>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg shrink-0 ${c.nota} ${c.notaBg}`}>
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

const RankingPanel = ({ students, filterLabel, onSelectStudent, show, onToggle }) => (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
    {/* Cabeçalho / toggle */}
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 rounded-3xl transition-colors"
    >
      <div className="text-left">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 5</p>
        <p className="text-sm font-black text-slate-800 uppercase tracking-widest">{filterLabel}</p>
      </div>
      {show
        ? <ChevronUp className="w-4 h-4 text-slate-400" />
        : <ChevronDown className="w-4 h-4 text-slate-400" />
      }
    </button>

    {/* Conteúdo expansível */}
    {show && (
      <div className="px-5 pb-5 flex gap-4 flex-col sm:flex-row border-t border-slate-100 pt-4">
        <RankingList
          title="Prova Paulista (PP)"
          color="blue"
          students={students}
          field="provaPaulista"
          onSelectStudent={onSelectStudent}
        />
        <div className="hidden sm:block w-px bg-slate-100 self-stretch" />
        <RankingList
          title="Conselho Bimestral (CC)"
          color="purple"
          students={students}
          field="consilhoBimestral"
          onSelectStudent={onSelectStudent}
        />
      </div>
    )}
  </div>
);

export default RankingPanel;
