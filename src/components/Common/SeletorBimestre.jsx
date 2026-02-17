import React from 'react';
import { Calendar } from 'lucide-react';

const SeletorBimestre = ({ bimestreAtual, bimestresDisponiveis, onChange }) => {
    if (bimestresDisponiveis.length === 0) return null;

    return (
        <div className="flex items-center gap-2 px-1 py-1 rounded-xl bg-brown-900/50 text-brown-100 border border-white/5 ring-1 ring-white/5">
            <div className="flex items-center">
                {bimestresDisponiveis.sort().map(bim => {
                    const isAtual = bim === bimestreAtual;

                    return (
                        <button
                            key={bim}
                            className={`
                                relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300
                                ${isAtual
                                    ? 'bg-brown-100 text-brown-900 shadow-lg'
                                    : 'text-brown-400 hover:text-brown-100 hover:bg-white/5'}
                            `}
                            onClick={() => onChange(bim)}
                            title={`${bim}º Bimestre`}
                        >
                            {bim}º
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default SeletorBimestre;
