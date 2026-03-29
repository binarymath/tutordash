// ─────────────────────────────────────────────────────────────
// components/ConfigModal.jsx — Modal de Configuração do Sistema
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { X, Settings, BookMarked, Loader2 } from 'lucide-react';

const ConfigModal = ({ config, setConfig, onClose, onLoad, isLoading }) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors">
        <X className="w-6 h-6 text-slate-400" />
      </button>
      <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-800">
        <Settings className="text-blue-600 w-8 h-8" /> Configuração 360º
      </h3>

      <div className="space-y-4 mb-6">
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
          <label className="text-xs font-bold text-blue-700 uppercase">1. Tutoria (Base Obrigatória)</label>
          <input
            type="text"
            className="w-full bg-white border border-blue-200 rounded-xl py-2 px-4 mt-1"
            value={config.studentsUrl || ''}
            onChange={e => setConfig({ ...config, studentsUrl: e.target.value })}
            placeholder="Link (Qualquer Ficheiro Sheets)..."
          />
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase">2. Planilha de Anotações</label>
          <input
            type="text"
            className="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 mt-1"
            value={config.notesUrl || ''}
            onChange={e => setConfig({ ...config, notesUrl: e.target.value })}
            placeholder="Link..."
          />
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <label className="text-xs font-bold text-slate-500 uppercase">3. Prova Paulista</label>
          <input
            type="text"
            className="w-full bg-white border border-slate-300 rounded-xl py-2 px-4 mt-1"
            value={config.provaUrl || ''}
            onChange={e => setConfig({ ...config, provaUrl: e.target.value })}
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
            value={config.conceitoUrl || ''}
            onChange={e => setConfig({ ...config, conceitoUrl: e.target.value })}
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
            value={config.formLink || ''}
            onChange={e => setConfig({ ...config, formLink: e.target.value })}
            placeholder="Cole o link do seu Google Forms aqui..."
          />
        </div>
      </div>

      <button
        onClick={() => { onLoad(false); onClose(); }}
        disabled={isLoading || !config.studentsUrl}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-3"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar e Sincronizar'}
      </button>
    </div>
  </div>
);

export default ConfigModal;
