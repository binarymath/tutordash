import React from 'react';
import { GraduationCap, Upload, Plus } from 'lucide-react';
import Button from '../Common/Button';

const AppBar = ({
    onUploadClick,
    bimestresCarregados,
    children  // For additional controls like SeletorBimestre
}) => {
    return (
        <header className="sticky top-0 z-[var(--md-z-index-appbar)] bg-gradient-to-r from-brown-100 via-brown-200 to-brown-100 backdrop-blur-md border-b border-brown-300 shadow-elevation-4">
            <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-gold to-brown-600 flex items-center justify-center shadow-elevation-2">
                            <GraduationCap size={24} className="text-brown-950" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-xl md:text-2xl font-extrabold text-brown-900 tracking-tight">
                                Analisador Bimestral
                            </h1>
                            <p className="text-sm md:text-base text-brown-700 font-semibold">
                                Sistema de Inteligência Escolar
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {children}

                        <Button
                            variant="contained"
                            color="accent"
                            size="medium"
                            onClick={onUploadClick}
                            startIcon={<Plus size={18} />}
                            aria-label="Adicionar arquivo de bimestre"
                            className="shadow-elevation-2 hover:shadow-elevation-4"
                        >
                            <span className="hidden sm:inline">Adicionar</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AppBar;
