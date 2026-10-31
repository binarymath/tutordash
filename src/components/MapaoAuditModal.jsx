// ─────────────────────────────────────────────────────────────
// components/MapaoAuditModal.jsx — Modal de Auditoria do Mapão
// Exibe de maneira discreta e clara as divergências de alocação de alunos
// ─────────────────────────────────────────────────────────────
import React, { useEffect } from 'react';
import { X, AlertTriangle, Users, CheckCircle2, ArrowRight } from 'lucide-react';

const MapaoAuditModal = ({ isOpen, onClose, mapaoCoverage }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mapaoCoverage) return null;

  const { turma, mapaoCount, tutoradosCount, showOnlyActive, diagnostico = [] } = mapaoCoverage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl max-h-[88vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapao-audit-title"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-100/70 text-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </span>
              <h3 id="mapao-audit-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Auditoria de Alunos: Mapão vs Painel
              </h3>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200/60">
                Turma {turma}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium ml-1">
              {mapaoCount} alunos {showOnlyActive ? 'ativos' : ''} no Mapão • {tutoradosCount} exibidos no painel •{' '}
              <span className="font-bold text-amber-700">{diagnostico.length} {diagnostico.length === 1 ? 'divergência' : 'divergências'}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Fechar (Esc)"
            aria-label="Fechar modal de auditoria"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabela de Alunos com Divergência */}
        <div className="flex-1 overflow-y-auto p-6">
          {diagnostico.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-slate-800">Nenhuma divergência encontrada!</p>
              <p className="text-xs text-slate-500 mt-1">
                Todos os alunos do Mapão estão devidamente alocados e visíveis no painel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">Aluno</th>
                    <th className="py-3 px-3 text-center">Mapão</th>
                    <th className="py-3 px-3 text-center">Sistema</th>
                    <th className="py-3 px-4">Diagnóstico / Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {diagnostico.map((item, idx) => (
                    <tr key={`${item.aluno}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[220px] sm:max-w-[280px]" title={item.aluno}>
                            {item.aluno}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-800">{item.turmaMapao || '-'}</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 mt-0.5">
                            {item.statusMapao || 'Ativo'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-bold ${item.turmaSistema === 'NÃO INCLUÍDO' ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.turmaSistema || '-'}
                          </span>
                          {item.statusSistema && item.statusSistema !== '-' && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border mt-0.5 ${
                              item.statusSistema.toLowerCase().includes('ativo')
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                                : 'text-rose-700 bg-rose-50 border-rose-200/60'
                            }`}>
                              {item.statusSistema}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          item.tipoCausa === 'outra_turma'
                            ? 'bg-blue-50 text-blue-800 border-blue-200/70'
                            : item.tipoCausa === 'inativo'
                            ? 'bg-rose-50 text-rose-800 border-rose-200/70'
                            : 'bg-amber-50 text-amber-800 border-amber-200/70'
                        }`}>
                          {item.causa}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
          <p className="text-[11px] text-slate-500 font-medium">
            💡 Para incluir esses alunos, verifique se constam com a turma correta na Planilha de Tutoria Base ou no Mapão SED.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapaoAuditModal;
