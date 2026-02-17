import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTurma } from './TurmaContext';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const { turmaSelecionada, obterBimestres } = useTurma();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [incluirInativos, setIncluirInativos] = useState(false);
    const [viewMode, setViewMode] = useState('turma'); // 'turma' ou 'individual'

    // Dados dos bimestres da turma selecionada
    const dadosBimestres = turmaSelecionada ? obterBimestres(turmaSelecionada) : {};
    
    // Primeiro bimestre disponível ou null
    const bimestresDisponiveis = Object.keys(dadosBimestres).map(Number).sort();
    const dadosMapao = bimestresDisponiveis.length > 0 ? dadosBimestres[bimestresDisponiveis[0]] : null;

    // Retorna quantos bimestres foram carregados
    const bimestresCarregados = bimestresDisponiveis.length;

    const value = {
        dadosMapao, // Dados do primeiro bimestre disponível
        dadosBimestres, // Dados de todos os bimestres da turma
        bimestresCarregados,
        bimestresDisponiveis,
        loading,
        error,
        incluirInativos,
        viewMode,
        setLoading,
        setError,
        setIncluirInativos,
        setViewMode,
        turmaSelecionada
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
