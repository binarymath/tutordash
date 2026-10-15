import React, { useState, useEffect } from 'react';
import {
  X, Plus, ExternalLink, Trash2, Sheet, Link as LinkIcon,
  CheckCircle2, AlertCircle, Sparkles, Globe
} from 'lucide-react';

const LinksModal = ({
  isOpen,
  onClose,
  config = {},
  onSaveConfig
}) => {
  const [disciplinaUrl, setDisciplinaUrl] = useState(config.disciplinaUrl || '');
  const [customLinks, setCustomLinks] = useState(config.customLinks || []);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDisciplinaUrl(config.disciplinaUrl || '');
      setCustomLinks(config.customLinks || []);
      setNewTitle('');
      setNewUrl('');
      setUrlError('');
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleAddCustomLink = (e) => {
    e.preventDefault();
    setUrlError('');

    if (!newTitle.trim()) {
      setUrlError('Digite um título para o link.');
      return;
    }

    const trimmedUrl = newUrl.trim();
    if (!trimmedUrl) {
      setUrlError('Digite uma URL válida.');
      return;
    }

    const validUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')
      ? trimmedUrl
      : `https://${trimmedUrl}`;

    setCustomLinks(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newTitle.trim(),
        url: validUrl
      }
    ]);
    setNewTitle('');
    setNewUrl('');
  };

  const handleRemoveCustomLink = (id) => {
    setCustomLinks(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      disciplinaUrl: disciplinaUrl.trim(),
      customLinks
    });
    onClose();
  };

  const isDisciplinaSheetConfigured = !!disciplinaUrl.trim();

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-[0_25px_70px_rgba(0,0,0,0.25)] border border-slate-100 relative max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Barra superior de acento com gradiente */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 shrink-0" />

        {/* Cabeçalho */}
        <div className="p-5 sm:px-7 sm:py-5 border-b border-slate-100 flex items-start justify-between shrink-0 bg-gradient-to-b from-slate-50/70 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Adicionar Links & Planilhas
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Gerencie a planilha de disciplinas e seus atalhos rápidos importantes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          
          {/* SEÇÃO 1: PLANILHA DE DISCIPLINAS */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 shadow-xs transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sheet className="w-4 h-4 text-blue-600" />
                Planilha de Disciplinas por Turma/Bimestre
              </label>
              {isDisciplinaSheetConfigured ? (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Vinculada
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Opcional
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Cole o link do Google Sheets ou arquivo Excel com abas no formato <strong className="text-slate-700">6A-1B</strong>.
              O sistema lerá a <strong className="text-slate-700">Coluna D (Disciplina)</strong> e exibirá as linhas separadas por bimestre no final da página da turma.
            </p>

            <div className="relative">
              <input
                type="text"
                value={disciplinaUrl}
                onChange={(e) => setDisciplinaUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... ou link direto do arquivo"
                className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-3.5 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 font-medium transition-all shadow-xs"
              />
              {disciplinaUrl && (
                <button
                  type="button"
                  onClick={() => setDisciplinaUrl('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title="Limpar campo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <span>💡</span>
              <span>Sem esse link, o sistema continua funcionando normalmente sem interrupções.</span>
            </p>
          </div>

          {/* SEÇÃO 2: LINKS IMPORTANTES & ATALHOS RÁPIDOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                Links Importantes & Atalhos Rápidos
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                {customLinks.length} {customLinks.length === 1 ? 'link' : 'links'}
              </span>
            </div>

            {/* Formulário para adicionar novo link */}
            <form onSubmit={handleAddCustomLink} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Título do Link</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Google Drive 6º Ano, SED..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">URL de Destino</label>
                  <input
                    type="text"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-medium transition-all"
                  />
                </div>
              </div>

              {urlError && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {urlError}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Link
                </button>
              </div>
            </form>

            {/* Lista de links adicionados */}
            {customLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                {customLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs group transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-slate-800 truncate">{link.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Abrir link em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomLink(link.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                Nenhum link adicional cadastrado ainda.
              </div>
            )}
          </div>

        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 sm:px-7 sm:py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:translate-y-[1px] transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
};

export default LinksModal;
