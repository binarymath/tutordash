// ─────────────────────────────────────────────────────────────
// components/ConfigModal.jsx — Centro de Controle 360° do Sistema
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { X, Settings, BookMarked, Loader2, Plus, CheckCircle2, AlertCircle, ShieldCheck, Trash2 } from 'lucide-react';
import PrivacyPolicyModal from './PrivacyPolicyModal';

// Função de validação inteligente de links em tempo real
const validateUrl = (url, type = 'sheet') => {
  if (!url || !url.trim()) return { status: 'empty', message: '' };
  const str = url.trim();

  // Verifica se o texto tem formato mínimo de endereço
  if (!str.includes('.') || str.includes(' ') || str.length < 5) {
    return {
      status: 'invalid',
      message: 'Insira um link web válido (ex: https://docs.google.com/spreadsheets/d/...).',
    };
  }

  // Prevenção de equívocos comuns no Google Workspace
  if (type === 'sheet') {
    if (str.includes('drive.google.com/drive/folders') || (str.includes('drive.google.com/drive/u/') && str.includes('/folders/'))) {
      return {
        status: 'invalid',
        message: 'Link de pasta do Drive detectado. Abra a planilha e copie o link do arquivo.',
      };
    }
    if (str.includes('docs.google.com/document')) {
      return {
        status: 'invalid',
        message: 'Link do Google Docs (texto). O sistema requer uma planilha (Sheets).',
      };
    }
    if (str.includes('docs.google.com/presentation')) {
      return {
        status: 'invalid',
        message: 'Link de apresentação. O sistema requer uma planilha Google Sheets.',
      };
    }
  }

  // Validação de estrutura de URL
  let parsedUrl = null;
  try {
    const withProto = str.startsWith('http://') || str.startsWith('https://') ? str : `https://${str}`;
    parsedUrl = new URL(withProto);
  } catch {
    return {
      status: 'invalid',
      message: 'Estrutura de URL inválida. Verifique se o link foi copiado integralmente.',
    };
  }

  if (!parsedUrl.hostname || !parsedUrl.hostname.includes('.')) {
    return {
      status: 'invalid',
      message: 'Endereço web não reconhecido.',
    };
  }

  // Validação específica para planilhas do Google Sheets
  if (str.includes('docs.google.com/spreadsheets')) {
    if (!str.match(/\/d\/([a-zA-Z0-9-_]+)/)) {
      return {
        status: 'invalid',
        message: 'Link incompleto. O identificador /d/... da planilha não foi localizado.',
      };
    }
    return {
      status: 'valid',
      message: 'Planilha Google Sheets verificada e pronta',
    };
  }

  // Validação específica para Formulários Google
  if (type === 'form') {
    if (str.includes('docs.google.com/forms') || str.includes('forms.gle')) {
      return {
        status: 'valid',
        message: 'Formulário Google Forms verificado e pronto',
      };
    }
    return {
      status: 'valid',
      message: 'Link externo verificado e pronto',
    };
  }

  // Links válidos genéricos (compatível com testes e planilhas web)
  return {
    status: 'valid',
    message: 'Link verificado e pronto',
  };
};

const ConfigModal = ({ activeProfile, profiles, changeProfile, saveProfile, onClose, onLoad, isLoading, onRevokeConsent }) => {
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  // Local state para editar as urls da aba atual antes de salvar
  const [localConfig, setLocalConfig] = useState(profiles[activeProfile] || { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '', disciplinaUrl: '', customLinks: [] });

  // Quando o profile selecionado via props muda, atualiza o localConfig imediatamente
  useEffect(() => {
    setLocalConfig(profiles[activeProfile] || { studentsUrl: '', notesUrl: '', provaUrl: '', conceitoUrl: '', formLink: '', disciplinaUrl: '', customLinks: [] });
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

  // Validações em tempo real de cada campo
  const valStudents = validateUrl(localConfig.studentsUrl, 'sheet');
  const valNotes = validateUrl(localConfig.notesUrl, 'sheet');
  const valProva = validateUrl(localConfig.provaUrl, 'sheet');
  const valConceito = validateUrl(localConfig.conceitoUrl, 'sheet');
  const valForm = validateUrl(localConfig.formLink, 'form');

  const validSourcesCount = [valStudents, valNotes, valProva, valConceito, valForm].filter(v => v.status === 'valid').length;
  const isCoreConnected = valStudents.status === 'valid';

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-[0_25px_70px_rgba(0,0,0,0.25)] border border-slate-100 relative max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Barra superior de acento com gradiente de alta precisão */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-400 shrink-0" />

        {/* --- Cabeçalho do Centro de Controle --- */}
        <div className="p-6 pb-4 sm:px-8 sm:pt-6 sm:pb-5 border-b border-slate-100 flex items-start justify-between shrink-0 bg-gradient-to-b from-slate-50/70 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Configuração 360º
                </h3>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Painel unificado de fontes de dados, integrações e sincronização analítica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Telemetria de conexão e verificação em tempo real */}
            <div className="hidden sm:flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                isCoreConnected 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' 
                  : 'bg-amber-50 text-amber-700 border-amber-200/80'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isCoreConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isCoreConnected ? 'Base Operacional' : 'Base Pendente'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {validSourcesCount}/5 Links OK
              </span>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- Dock de Perfis / Workspaces --- */}
        <div className="px-6 sm:px-8 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0">
            <span>Ambientes:</span>
          </div>

          <div className="flex items-center bg-slate-200/60 p-1 rounded-2xl gap-1.5 overflow-x-auto border border-slate-300/40" style={{ scrollbarWidth: 'none' }}>
            {Object.keys(profiles).map(nome => (
              <button
                key={nome}
                onClick={() => changeProfile(nome)}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 ${
                  activeProfile === nome 
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200/70' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {nome}
              </button>
            ))}
            <button
              onClick={handleCreateProfile}
              className="px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all text-slate-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200/60 flex items-center justify-center gap-1"
              title="Novo Perfil"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- Grid do Centro de Controle (2 Colunas Panorâmicas) --- */}
        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-1 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
          
          {/* ══════ COLUNA 1: BASES PRINCIPAIS & ACADÊMICAS ══════ */}
          <div className="space-y-5 flex flex-col justify-between">
            
            {/* 1. Tutoria (Base Principal) */}
            <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all bg-gradient-to-b from-blue-50/40 via-white to-white ${
              valStudents.status === 'valid'
                ? 'border-emerald-300/80 focus-within:border-emerald-500'
                : valStudents.status === 'invalid'
                ? 'border-rose-300 focus-within:border-rose-500'
                : 'border-blue-500/20 focus-within:border-blue-500/50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                  1. Tutoria (Base Obrigatória)
                </label>
                <div className="flex items-center gap-2">
                  {valStudents.status === 'valid' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                    </span>
                  )}
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100/80 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Obrigatória
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full bg-white border rounded-xl py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm font-medium ${
                    valStudents.status === 'valid'
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      : valStudents.status === 'invalid'
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  value={localConfig.studentsUrl || ''}
                  onChange={e => setLocalConfig({ ...localConfig, studentsUrl: e.target.value })}
                  placeholder="Link (Qualquer Ficheiro Sheets)..."
                />
                {valStudents.status === 'valid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 animate-in zoom-in-75 duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {valStudents.status === 'invalid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-600 animate-in zoom-in-75 duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                )}
              </div>
              {valStudents.status === 'valid' && (
                <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{valStudents.message}</span>
                </p>
              )}
              {valStudents.status === 'invalid' && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{valStudents.message}</span>
                </p>
              )}
            </div>

            {/* 4. Histórico Bimestral */}
            <div className={`rounded-2xl border p-5 shadow-sm transition-all bg-gradient-to-b from-amber-50/30 via-white to-white ${
              valConceito.status === 'valid'
                ? 'border-emerald-300/80 focus-within:border-emerald-500'
                : valConceito.status === 'invalid'
                ? 'border-rose-300 focus-within:border-rose-500'
                : 'border-amber-200/80 focus-within:border-amber-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  4. Histórico Bimestral
                </label>
                <div className="flex items-center gap-2">
                  {valConceito.status === 'valid' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                    </span>
                  )}
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5 border border-amber-200/80">
                    <BookMarked className="w-3.5 h-3.5 text-amber-700" /> Mapão da SED
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full bg-white border rounded-xl py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm font-medium ${
                    valConceito.status === 'valid'
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      : valConceito.status === 'invalid'
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'
                  }`}
                  value={localConfig.conceitoUrl || ''}
                  onChange={e => setLocalConfig({ ...localConfig, conceitoUrl: e.target.value })}
                  placeholder="Link da Folha de Cálculo com os Mapões..."
                />
                {valConceito.status === 'valid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 animate-in zoom-in-75 duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {valConceito.status === 'invalid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-600 animate-in zoom-in-75 duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                )}
              </div>
              {valConceito.status === 'valid' && (
                <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{valConceito.message}</span>
                </p>
              )}
              {valConceito.status === 'invalid' && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{valConceito.message}</span>
                </p>
              )}
            </div>

          </div>

          {/* ══════ COLUNA 2: AVALIAÇÕES & INTEGRAÇÕES AUXILIARES ══════ */}
          <div className="space-y-5 flex flex-col justify-between">
            
            {/* 2. Planilha de Anotações */}
            <div className={`rounded-2xl border p-5 shadow-sm transition-all bg-slate-50/50 hover:bg-slate-50/80 ${
              valNotes.status === 'valid'
                ? 'border-emerald-300/80 focus-within:border-emerald-500'
                : valNotes.status === 'invalid'
                ? 'border-rose-300 focus-within:border-rose-500'
                : 'border-slate-200/90 focus-within:border-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  2. Planilha de Anotações
                </label>
                <div className="flex items-center gap-2">
                  {valNotes.status === 'valid' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Diário
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full bg-white border rounded-xl py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm font-medium ${
                    valNotes.status === 'valid'
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      : valNotes.status === 'invalid'
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  value={localConfig.notesUrl || ''}
                  onChange={e => setLocalConfig({ ...localConfig, notesUrl: e.target.value })}
                  placeholder="Link..."
                />
                {valNotes.status === 'valid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 animate-in zoom-in-75 duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {valNotes.status === 'invalid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-600 animate-in zoom-in-75 duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                )}
              </div>
              {valNotes.status === 'valid' && (
                <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{valNotes.message}</span>
                </p>
              )}
              {valNotes.status === 'invalid' && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{valNotes.message}</span>
                </p>
              )}
            </div>

            {/* 3. Prova Paulista */}
            <div className={`rounded-2xl border p-5 shadow-sm transition-all bg-slate-50/50 hover:bg-slate-50/80 ${
              valProva.status === 'valid'
                ? 'border-emerald-300/80 focus-within:border-emerald-500'
                : valProva.status === 'invalid'
                ? 'border-rose-300 focus-within:border-rose-500'
                : 'border-slate-200/90 focus-within:border-slate-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  3. Prova Paulista
                </label>
                <div className="flex items-center gap-2">
                  {valProva.status === 'valid' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Avaliação
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full bg-white border rounded-xl py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm font-medium ${
                    valProva.status === 'valid'
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      : valProva.status === 'invalid'
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  value={localConfig.provaUrl || ''}
                  onChange={e => setLocalConfig({ ...localConfig, provaUrl: e.target.value })}
                  placeholder="Link..."
                />
                {valProva.status === 'valid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 animate-in zoom-in-75 duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {valProva.status === 'invalid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-600 animate-in zoom-in-75 duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                )}
              </div>
              {valProva.status === 'valid' && (
                <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{valProva.message}</span>
                </p>
              )}
              {valProva.status === 'invalid' && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{valProva.message}</span>
                </p>
              )}
            </div>

            {/* 5. Acesso Rápido a Formulário Externo */}
            <div className={`rounded-2xl border p-5 shadow-sm transition-all bg-gradient-to-b from-emerald-50/30 via-white to-white ${
              valForm.status === 'valid'
                ? 'border-emerald-300/80 focus-within:border-emerald-500'
                : valForm.status === 'invalid'
                ? 'border-rose-300 focus-within:border-rose-500'
                : 'border-emerald-200/80 focus-within:border-emerald-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-emerald-950 uppercase tracking-wider block">
                  Acesso Rápido a Formulário Externo
                </label>
                <div className="flex items-center gap-2">
                  {valForm.status === 'valid' && (
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> OK
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Forms
                  </span>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  className={`w-full bg-white border rounded-xl py-3 pl-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm font-medium ${
                    valForm.status === 'valid'
                      ? 'border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                      : valForm.status === 'invalid'
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                      : 'border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'
                  }`}
                  value={localConfig.formLink || ''}
                  onChange={e => setLocalConfig({ ...localConfig, formLink: e.target.value })}
                  placeholder="Cole o link do seu Google Forms aqui..."
                />
                {valForm.status === 'valid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 animate-in zoom-in-75 duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
                {valForm.status === 'invalid' && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-600 animate-in zoom-in-75 duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </div>
                )}
              </div>
              {valForm.status === 'valid' && (
                <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>{valForm.message}</span>
                </p>
              )}
              {valForm.status === 'invalid' && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{valForm.message}</span>
                </p>
              )}
            </div>

          </div>
        </div>

        {/* --- Console de Comando Inferior (Action Footer) --- */}
        <div className="p-5 sm:px-8 sm:py-5 border-t border-slate-100 shrink-0 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-sm text-slate-600 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
              <span className="font-semibold text-slate-800">
                Perfil: {activeProfile}
              </span>
            </div>

            <div className="flex items-center gap-4 pt-1 sm:pt-0 sm:border-l sm:border-slate-200 sm:pl-5">
              <button
                type="button"
                onClick={() => setShowPolicyModal(true)}
                className="text-sm text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Privacidade & LGPD
              </button>

              {onRevokeConsent && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deseja realmente revogar o consentimento e limpar as configurações locais salvas neste navegador?')) {
                      onRevokeConsent();
                    }
                  }}
                  className="text-sm text-slate-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
                  title="Limpar preferências locais e revogar consentimento LGPD"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar dados locais
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isLoading || !localConfig.studentsUrl}
            className="w-full sm:w-auto min-w-[220px] bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-[0.99] disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:transform-none text-white py-3 px-7 rounded-2xl font-bold text-sm tracking-wide transition-all shadow-md shadow-blue-600/20 hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar e Sincronizar'}
          </button>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />
    </div>
  );
};

export default ConfigModal;
