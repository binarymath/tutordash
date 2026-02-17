import React from 'react';
import { BarChart3, User, FolderKanban, TrendingUp, UploadCloud, Database } from 'lucide-react';

const Navigation = ({ viewMode, onChange }) => {
    const tabs = [
        {
            id: 'progresso',
            label: 'Selecione Turma',
            icon: <TrendingUp size={18} />,
        },
        {
            id: 'upload-lote',
            label: 'Upload em Lote',
            icon: <UploadCloud size={18} />,
        },
        {
            id: 'turma',
            label: 'Análise da Turma',
            icon: <BarChart3 size={18} />,
        },
        {
            id: 'individual',
            label: 'Análise Individual',
            icon: <User size={18} />,
        },
        {
            id: 'backup',
            label: 'Backup',
            icon: <Database size={18} />,
        },
    ];

    return (
        <nav className="border-b border-brown-700 bg-brown-900/50 backdrop-blur-sm">
            <div className="max-w-[1800px] mx-auto px-4 md:px-6">
                <div className="flex gap-1">
                    {tabs.map((tab) => {
                        const isActive = viewMode === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onChange(tab.id)}
                                className={`
                  relative flex items-center gap-2 px-4 py-3
                  text-sm font-medium transition-all duration-standard
                  ${isActive
                                        ? 'text-accent-gold font-bold'
                                        : 'text-white/90 hover:text-white font-semibold'
                                    }
                `}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>

                                {/* Active indicator */}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-gold shadow-[0_0_8px_rgba(255,183,77,0.5)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
};

export default Navigation;
