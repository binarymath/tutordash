// ─────────────────────────────────────────────────────────────
// components/Header.jsx — Header sticky com navegação flutuante
// ─────────────────────────────────────────────────────────────
import React from 'react';
import {
  LayoutDashboard, ChevronLeft, ChevronRight,
  RefreshCw, ExternalLink, Settings
} from 'lucide-react';

const Header = ({
  selectedStudent, studentProfile, prevStudent, nextStudent,
  setSelectedStudent, isSyncing, onRefresh, config,
  onOpenSettings, showStickyName
}) => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">TutorDash</h1>
        </div>

        {/* Navegação flutuante centrada (visível ao rolar) */}
        {selectedStudent && showStickyName && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-slate-100/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => prevStudent && setSelectedStudent(prevStudent)}
              disabled={!prevStudent}
              className={`p-1.5 rounded-full transition-colors ${!prevStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'}`}
              title="Aluno Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[14px] font-black text-slate-800 whitespace-nowrap max-w-[130px] sm:max-w-[300px] truncate">
              {studentProfile?.nome}
            </span>
            <button
              onClick={() => nextStudent && setSelectedStudent(nextStudent)}
              disabled={!nextStudent}
              className={`p-1.5 rounded-full transition-colors ${!nextStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'}`}
              title="Próximo Aluno"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ações à direita */}
        <div className="flex gap-3 items-center">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              title="Atualizar dados em segundo plano"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
          {config?.formLink && (
            <a
              href={config.formLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-blue-100"
            >
              <ExternalLink className="w-4 h-4" /> Link Anotações
            </a>
          )}
          <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
