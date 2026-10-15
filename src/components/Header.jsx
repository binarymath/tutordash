// ─────────────────────────────────────────────────────────────
// components/Header.jsx — Header sticky com navegação flutuante
// ─────────────────────────────────────────────────────────────
import React from 'react';
import {
  LayoutDashboard, ChevronLeft, ChevronRight,
  RefreshCw, ExternalLink, Settings, Plus
} from 'lucide-react';

const Header = ({
  selectedStudent, studentProfile, prevStudent, nextStudent,
  setSelectedStudent, isSyncing, onRefresh, config,
  onOpenSettings, onOpenLinksModal, showStickyName
}) => (
  <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 relative">
      <div className="h-16 flex items-center justify-between">

        {/* Logo e Marca */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-md shadow-blue-600/20 flex items-center justify-center">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 hidden sm:block">TutorDash</h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              Gestão Escolar
            </span>
          </div>
        </div>

        {/* Navegação flutuante centrada (visível ao rolar ficha de aluno) */}
        {selectedStudent && showStickyName && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <button
              onClick={() => prevStudent && setSelectedStudent(prevStudent)}
              disabled={!prevStudent}
              className={`p-1.5 rounded-full transition-colors ${!prevStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600 hover:shadow-sm'}`}
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
              className={`p-1.5 rounded-full transition-colors ${!nextStudent ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600 hover:shadow-sm'}`}
              title="Próximo Aluno"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ações à direita */}
        <div className="flex gap-2.5 items-center">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100/80 rounded-xl transition-all disabled:opacity-50"
              title="Atualizar dados em segundo plano"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
          {/* Botão Adicionar ao lado esquerdo do botão Anotações */}
          <button
            onClick={onOpenLinksModal}
            className="flex items-center gap-1.5 bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 border-b-[3px] border-b-slate-400 shadow-xs hover:shadow active:border-b active:translate-y-[2px] transition-all cursor-pointer"
            title="Adicionar links e planilhas importantes"
          >
            <Plus className="w-4 h-4 text-blue-600" /> Adicionar
          </button>
          {config?.formLink && (
            <a
              href={config.formLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border border-blue-600 border-b-[3px] border-b-blue-800 shadow-xs hover:shadow active:border-b active:translate-y-[2px] transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" /> Anotações
            </a>
          )}
          <button 
            onClick={onOpenSettings} 
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100/80 rounded-xl transition-all"
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
