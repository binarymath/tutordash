// ─────────────────────────────────────────────────────────────
// components/ConfigModal.jsx — Modal de Configuração do Sistema
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { X, Settings, BookMarked, Loader2, Plus } from 'lucide-react';

const ConfigModal = ({ activeProfile, profiles, changeProfile, saveProfile, onClose, onLoad, isLoading }) => {
  // Local state para editar as urls da aba atual antes de salvar
  const [localConfig, setLocalConfig] = useState(profiles[activeProfile] || { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' });

  // Quando o profile selecionado via props muda, atualiza o localConfig imediatamente
  useEffect(() => {
    setLocalConfig(profiles[activeProfile] || { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '' });
  }, [activeProfile, profiles]);

  const handleCreateProfile = () => {
    const nome = prompt('Nome do novo perfil (Ex: Ensino Médio):');
    if (nome && nome.trim()) {
      changeProfile(nome.trim());
    }
  };

  const handleSave = () => {
    saveProfile(activeProfile, localConfig);
    onLoad();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors z-10">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        
        <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800 shrink-0">
          <Settings className="text-blue-600 w-8 h-8" /> Configuração 360º
        </h3>

        {/* --- Tabs de Perfis --- */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 overflow-x-auto shrink-0 gap-1" style={{ scrollbarWidth: 'none' }}>
          {Object.keys(profiles).map(nome => (
            <button
              key={nome}
              onClick={() => changeProfile(nome)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                activeProfile === nome 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {nome}
            </button>
          ))}
          <button
            onClick={handleCreateProfile}
            className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center"
            title="Novo Perfil"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* --- Inputs de Configuração --- */}
        <div className="space-y-4 mb-6 overflow-y-auto pr-2 flex-1">
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
            <label className="text-xs font-bold text-blue-700 uppercase">1. Tutoria (Base Obrigatória)</label>
            <input
              type="text"
              className="w-full bg-white border border-blue-200 rounded-xl py-2 px-4 mt-1"
              value={localConfig.studentsUrl || ''}
              onChange={e => setLocalConfig({ ...localConfig, studentsUrl: e.target.value })}
              placeholder="Link (Qualquer Ficheiro Sheets)..."
            />
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase">2. Planilha de Anotações</label>
            <input
              type="text"
              className="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 mt-1"
              value={localConfig.notesUrl || ''}
              onChange={e => setLocalConfig({ ...localConfig, notesUrl: e.target.value })}
              placeholder="Link..."
            />
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-500 uppercase">3. Prova Paulista</label>
            <input
              type="text"
              className="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 mt-1"
              value={localConfig.provaUrl || ''}
              onChange={e => setLocalConfig({ ...localConfig, provaUrl: e.target.value })}
              placeholder="Link..."
            />
          </div>

          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-amber-200 text-amber-800 text-[9px] font-black px-2 py-1 rounded-bl-lg uppercase flex items-center gap-1">
              <BookMarked className="w-3 h-3" /> Mapão da SED
            </div>
            <label className="text-xs font-bold text-amber-700 uppercase">4. Histórico Bimestral</label>
            <input
              type="text"
              className="w-full bg-white border border-amber-300 rounded-xl py-2 px-4 mt-1"
              value={localConfig.conceitoUrl || ''}
              onChange={e => setLocalConfig({ ...localConfig, conceitoUrl: e.target.value })}
              placeholder="Link da Folha de Cálculo com os Mapões..."
            />
            <p className="text-[10px] text-amber-700 mt-2 font-medium">
              O sistema processa o formato oficial da Secretaria Escolar Digital. Pode incluir todas as turmas de todos os bimestres na mesma planilha (uma em cada aba/guia).
            </p>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
            <label className="text-xs font-bold text-emerald-700 uppercase">Acesso Rápido a Formulário Externo</label>
            <input
              type="text"
              className="w-full bg-white border border-emerald-300 rounded-xl py-2 px-4 mt-1"
              value={localConfig.formLink || ''}
              onChange={e => setLocalConfig({ ...localConfig, formLink: e.target.value })}
              placeholder="Cole o link do seu Google Forms aqui..."
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading || !localConfig.studentsUrl}
          className="w-full shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-3"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar e Sincronizar'}
        </button>
      </div>
    </div>
  );
};

export default ConfigModal;
