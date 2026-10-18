import React from 'react';
import { X, ShieldCheck, Database, Lock, EyeOff, UserCheck, RefreshCw } from 'lucide-react';

const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Top header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Termos de Uso e Privacidade</h3>
              <p className="text-xs text-slate-500 font-medium">Conformidade com a LGPD (Lei nº 13.709/2018)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-600 leading-relaxed">
          
          <div className="flex items-start gap-3.5 p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100/70">
            <EyeOff className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">Processamento Local em Memória</h4>
              <p className="text-xs text-slate-600">
                O TutorDash é uma aplicação de visualização pedagógica que processa dados escolares diretamente no seu navegador. Não possuímos banco de dados próprio para armazenar notas, faltas ou fichas de alunos em nossos servidores.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                1. Tratamento de Dados de Menores (Art. 14 da LGPD)
              </h4>
              <p className="text-xs text-slate-600">
                Os dados de rendimento e presença dos estudantes são processados exclusivamente para a finalidade legítima de tutoria acadêmica, acompanhamento pedagógico individualizado e gestão escolar interna, atendendo ao melhor interesse da criança e do adolescente.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                2. Armazenamento de Preferências (Cookies & LocalStorage)
              </h4>
              <p className="text-xs text-slate-600">
                O armazenamento local do seu navegador (LocalStorage) é utilizado única e exclusivamente para salvar as configurações de links das suas planilhas, perfis de turmas e seu consentimento. Nenhum cookie de rastreamento de terceiros ou publicidade é utilizado.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                3. Segurança da Conexão e Proxy
              </h4>
              <p className="text-xs text-slate-600">
                A requisição de planilhas públicas passa por um proxy seguro que remove cabeçalhos de autenticação e cookies do usuário (<code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">credentials: omit</code>), impedindo qualquer compartilhamento inadvertido de credenciais privadas.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1.5 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-rose-600" />
                4. Direitos do Usuário, Revogação e Computadores Compartilhados
              </h4>
              <p className="text-xs text-slate-600">
                Você pode revogar este consentimento e remover todos os links salvos neste navegador a qualquer momento no menu de Configurações do TutorDash. Em computadores públicos ou compartilhados da escola, lembre-se de usar a opção "Limpar dados locais" ao encerrar suas atividades.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-0.5">Canal de Atendimento & Dúvidas LGPD (Art. 41)</h4>
                <p className="text-xs text-slate-600">Para dúvidas sobre privacidade, suporte ou tratamento pedagógico de dados, entre em contato direto:</p>
              </div>
              <a
                href="https://wa.me/5515991497579"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
              >
                Falar via WhatsApp
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50/70 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
