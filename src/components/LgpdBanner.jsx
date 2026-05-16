import React, { useState, useEffect } from 'react';

const LgpdBanner = ({ onAccept }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

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
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-slate-200 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] transition-opacity duration-500 ease-in-out ${
        isVisible && !isFadingOut ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="max-w-7xl mx-auto p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <p className="flex-1 text-sm text-slate-600 font-medium leading-relaxed">
          O TutorDash utiliza cookies e tecnologias de armazenamento local para salvar suas preferências de tutoria, filtros do painel e garantir o funcionamento seguro do sistema. Também processamos os dados de desempenho dos estudantes estritamente para a finalidade de gestão escolar e relatórios pedagógicos, em conformidade com a LGPD. Ao continuar e utilizar nossa plataforma, você está ciente e concorda com esses termos.
        </p>
        <button 
          onClick={handleAccept}
          className="shrink-0 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold transition-all shadow-md"
        >
          Ciente e Aceito
        </button>
      </div>
    </div>
  );
};

export default LgpdBanner;
