import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    // Armazena dados de todos os bimestres
    const [dadosBimestres, setDadosBimestres] = useState({
        1: null,
        2: null,
        3: null,
        4: null
    });

    const [bimestreAtual, setBimestreAtual] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [incluirInativos, setIncluirInativos] = useState(false);
    const [viewMode, setViewMode] = useState('turma'); // 'turma' ou 'individual'

    // Dados do bimestre atual
    const dadosMapao = dadosBimestres[bimestreAtual];

    const carregarDadosBimestre = (bimestre, dados) => {
        setDadosBimestres(prev => ({
            ...prev,
            [bimestre]: dados
        }));
        setError(null);
    };

    const limparDados = () => {
        setDadosBimestres({
            1: null,
            2: null,
            3: null,
            4: null
        });
        setBimestreAtual(1);
        setError(null);
    };

    // Retorna quantos bimestres foram carregados
    const bimestresCarregados = Object.values(dadosBimestres).filter(d => d !== null).length;

    // Lista de bimestres com dados
    const bimestresDisponiveis = Object.keys(dadosBimestres)
        .filter(bim => dadosBimestres[bim] !== null)
        .map(Number);

    const value = {
        dadosMapao, // Dados do bimestre atual
        dadosBimestres, // Dados de todos os bimestres
        bimestreAtual,
        bimestresCarregados,
        bimestresDisponiveis,
        loading,
        error,
        incluirInativos,
        viewMode,
        setDadosBimestres,
        setBimestreAtual,
        setLoading,
        setError,
        setIncluirInativos,
        setViewMode,
        carregarDadosBimestre,
        limparDados
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
