// ─────────────────────────────────────────────────────────────
// components/EmptyState.jsx — Tela de boas-vindas (sem dados)
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { Globe, Loader2 } from 'lucide-react';

const EmptyState = ({ onLoad, isLoading, canLoad }) => (
  <div className="max-w-xl mx-auto pt-10 text-center">
    <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
      <Globe className="text-blue-600 w-10 h-10" />
    </div>
    <h2 className="text-3xl font-black text-slate-800 mb-2">Workspace 360º</h2>
    <p className="text-slate-500 mb-8">
      Configure as suas planilhas partilhadas para obter o panorama completo dos alunos.
    </p>
    <button
      onClick={() => onLoad(false)}
      disabled={isLoading || !canLoad}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3"
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar Sincronização'}
    </button>
  </div>
);

export default EmptyState;
