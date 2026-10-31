// ─────────────────────────────────────────────────────────────
// components/Header.jsx — Header sticky com navegação flutuante
// ─────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  LayoutDashboard, ChevronLeft, ChevronRight,
  RefreshCw, ExternalLink, Settings, Plus, Pencil
} from 'lucide-react';
import PromptModal from './PromptModal';

const Header = ({
  selectedStudent, studentProfile, prevStudent, nextStudent,
  setSelectedStudent, isSyncing, onRefresh, config,
  activeProfile, profiles, onChangeProfile, onRenameProfile,
  onOpenSettings, onOpenLinksModal, showStickyName,
  hasLgpdConsent = true,
  showActions = true
}) => {
  const [renamingProfile, setRenamingProfile] = useState(null);

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 relative">
        <div className="h-16 flex items-center justify-between">

          {/* Logo e Marca + Seletor de Períodos Isolados */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-2xl shadow-md shadow-blue-600/20 flex items-center justify-center">
              <LayoutDashboard className="text-white w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 hidden sm:block">TutorDash</h1>
            </div>

            {/* Seletor de Períodos / Ambientes Isolados (quando há mais de um período) */}
            {hasLgpdConsent && profiles && Object.keys(profiles).length > 1 && (
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200/80 shadow-2xs ml-1 sm:ml-2">
                {Object.keys(profiles).map(nome => {
                  const isActive = activeProfile === nome;
                  return (
                    <div key={nome} className="flex items-center group relative">
                      <button
                        key={nome}
                        onClick={() => onChangeProfile && onChangeProfile(nome)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                          isActive
                            ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 font-black'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                        title={`Alternar para o período ${nome}`}
                      >
                        {nome}
                      </button>
                      {isActive && onRenameProfile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingProfile(nome);
                          }}
                          className="p-1 -ml-1 text-slate-400 hover:text-blue-600 hover:bg-white/80 rounded-lg transition-all cursor-pointer"
                          title={`Renomear "${nome}" (Ex: Ensino Médio)`}
                          aria-label={`Renomear ${nome}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
          {hasLgpdConsent && showActions && (
            <>
              {/* Links adicionais rápidos para este período */}
              {config?.customLinks && config.customLinks.length > 0 && (
                <div className="hidden xl:flex items-center gap-1.5">
                  {config.customLinks.slice(0, 2).map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs transition-all max-w-[130px] truncate"
                      title={`${link.title} (${link.url})`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{link.title}</span>
                    </a>
                  ))}
                </div>
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
            </>
          )}
        </div>
      </div>
    </div>

    {/* Modal Discreto para Renomear Período */}
    <PromptModal
      isOpen={Boolean(renamingProfile)}
      title="Renomear Período"
      label="Nome do Período"
      initialValue={renamingProfile || ''}
      placeholder="Ex: Ensino Médio"
      validator={(val) => {
        if (profiles && profiles[val] && val !== renamingProfile) {
          return `Já existe um período com o nome "${val}".`;
        }
        return null;
      }}
      onConfirm={(novoNome) => {
        if (onRenameProfile && renamingProfile) {
          onRenameProfile(renamingProfile, novoNome);
        }
      }}
      onClose={() => setRenamingProfile(null)}
    />
  </header>
  );
};

export default Header;
