import React from 'react';
import { BarChart3, User } from 'lucide-react';

const Navigation = ({ viewMode, onChange, bimestresCarregados }) => {
    if (!bimestresCarregados || bimestresCarregados === 0) return null;

    const tabs = [
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
    ];

    return (
        <nav className="border-b border-brown-300 bg-brown-200/50 backdrop-blur-sm">
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
                                        ? 'text-accent-gold'
                                        : 'text-brown-600 hover:text-brown-900'
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
