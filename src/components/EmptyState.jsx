// ─────────────────────────────────────────────────────────────
// components/EmptyState.jsx — Tela de boas-vindas (sem dados)
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { Globe, Loader2, Link } from 'lucide-react';

const EmptyState = ({ onLoad, isLoading, canLoad, onOpenSettings }) => (
  <div className="max-w-xl mx-auto pt-10 text-center">
    <div className="bg-blue-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
      <Globe className="text-blue-600 w-10 h-10" />
    </div>
    <h2 className="text-3xl font-black text-slate-800 mb-2">Workspace 360º</h2>
    <p className="text-slate-500 text-lg mb-8">
      {canLoad 
        ? "Suas planilhas estão configuradas. Inicie a sincronização para carregar o panorama completo dos alunos."
        : "Para começar, você precisa conectar os dados. Adicione os links das suas planilhas para obter o panorama completo dos alunos."}
    </p>

    {canLoad ? (
      <button
        onClick={() => onLoad(false)}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 text-lg"
      >
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Iniciar Sincronização'}
      </button>
    ) : (
      <button
        onClick={onOpenSettings}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-3 text-lg ring-4 ring-indigo-50 hover:scale-[1.02]"
      >
        <Link className="w-6 h-6" />
        Acrescentar Links
      </button>
    )}
  </div>
);

export default EmptyState;
