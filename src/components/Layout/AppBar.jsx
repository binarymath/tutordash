import React from 'react';
import { GraduationCap, Upload, Plus } from 'lucide-react';
import Button from '../Common/Button';

const AppBar = ({
    onUploadClick,
    bimestresCarregados,
    children  // For additional controls like SeletorBimestre
}) => {
    return (
        <header className="sticky top-0 z-[var(--md-z-index-appbar)] bg-gradient-to-r from-brown-900 via-brown-800 to-brown-900 backdrop-blur-md border-b border-brown-700 shadow-elevation-8">
            <div className="max-w-[1800px] mx-auto">
                <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4">
                    {/* Logo and Title */}
                    <div className="flex items-center gap-3 md:gap-4">
                        <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                            Analisador Bimestral
                        </h1>
                        <p className="text-sm md:text-base text-brown-300 font-semibold">
                            Sistema de Inteligência Escolar
                        </p>
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
