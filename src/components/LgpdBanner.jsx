import React, { useState, useEffect } from 'react';
import PrivacyPolicyModal from './PrivacyPolicyModal';

const LgpdBanner = ({ onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleAccept = () => {
    setIsFadingOut(true);
    try {
      localStorage.setItem('tutordash_lgpd_consent', 'true');
    } catch (e) {
      console.warn('Falha ao salvar o consentimento da LGPD', e);
    }
    
    setTimeout(() => {
      onAccept();
    }, 500);
  };

  return (
    <>
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] transition-opacity duration-500 ease-in-out ${
          isVisible && !isFadingOut ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-full px-6 md:px-8 py-5 md:py-6 flex flex-col md:flex-row items-center gap-5">
          <p className="flex-1 text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
            O TutorDash utiliza armazenamento local do seu navegador para guardar configurações de planilhas e garantir seu funcionamento pedagógico sem enviar dados pessoais a servidores próprios, em respeito à LGPD.{' '}
            <button
              onClick={() => setShowPolicyModal(true)}
              className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-semibold transition-colors cursor-pointer"
            >
              Ver termos de uso e privacidade
            </button>
            .
          </p>
          <button 
            onClick={handleAccept}
            className="shrink-0 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer"
          >
            Ciente e Aceito
          </button>
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
      />
    </>
  );
};

export default LgpdBanner;
