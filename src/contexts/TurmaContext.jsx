import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { storageService } from '../services/storageService';

const TurmaContext = createContext();

export const useTurma = () => {
  const context = useContext(TurmaContext);
  if (!context) {
    throw new Error('useTurma deve ser usado dentro de TurmaProvider');
  }
  return context;
};

export const TurmaProvider = ({ children }) => {
  const [turmas, setTurmas] = useState({});
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [ordemTurmas, setOrdemTurmas] = useState([]);

  // Carregar dados ao iniciar
  useEffect(() => {
    const dadosSalvos = storageService.carregarDados();
    if (dadosSalvos) {
      setTurmas(dadosSalvos);
      
      // Carregar ordem salva ou criar ordem alfabética
      const ordemSalva = localStorage.getItem('ordemTurmas');
      if (ordemSalva) {
        const ordem = JSON.parse(ordemSalva);
        // Verificar se todas as turmas na ordem ainda existem
        const ordemValida = ordem.filter(nome => dadosSalvos[nome]);
        // Adicionar novas turmas que não estão na ordem
        const turmasNovas = Object.keys(dadosSalvos).filter(nome => !ordemValida.includes(nome));
        setOrdemTurmas([...ordemValida, ...turmasNovas.sort()]);
      } else {
        setOrdemTurmas(Object.keys(dadosSalvos).sort());
      }
      
      // Selecionar a primeira turma automaticamente
      const primeiraTurma = Object.keys(dadosSalvos).sort()[0];
      if (primeiraTurma) {
        setTurmaSelecionada(primeiraTurma);
      }
    }
  }, []);

  // Salvar automaticamente quando houver mudanças
  useEffect(() => {
    if (Object.keys(turmas).length > 0) {
      storageService.salvarDados(turmas);
    }
  }, [turmas]);

  // Salvar ordem das turmas
  useEffect(() => {
    if (ordemTurmas.length > 0) {
      localStorage.setItem('ordemTurmas', JSON.stringify(ordemTurmas));
    }
  }, [ordemTurmas]);

  const adicionarTurma = useCallback((nomeTurma) => {
    setTurmas(prev => {
      if (prev[nomeTurma]) {
        return prev; // Já existe
      }
      return {
        ...prev,
        [nomeTurma]: {
          nome: nomeTurma,
          bimestres: {},
          criadoEm: new Date().toISOString()
        }
      };
    });
    setOrdemTurmas(prev => {
      if (!prev.includes(nomeTurma)) {
        return [...prev, nomeTurma];
      }
      return prev;
    });
    setTurmaSelecionada(nomeTurma);
  }, []);

  const adicionarBimestre = useCallback((nomeTurma, numeroBimestre, dados) => {
    setTurmas(prev => {
      // Se a turma não existe, cria
      if (!prev[nomeTurma]) {
        return {
          ...prev,
          [nomeTurma]: {
            nome: nomeTurma,
            bimestres: {
              [numeroBimestre]: dados
            },
            criadoEm: new Date().toISOString()
          }
        };
      }

      // Turma existe, atualiza bimestre
      return {
        ...prev,
        [nomeTurma]: {
          ...prev[nomeTurma],
          bimestres: {
            ...prev[nomeTurma].bimestres,
            [numeroBimestre]: dados
          }
        }
      };
    });
  }, []);

  const obterDadosTurma = useCallback((nomeTurma) => {
    return turmas[nomeTurma] || null;
  }, [turmas]);

  const obterBimestres = useCallback((nomeTurma) => {
    return turmas[nomeTurma]?.bimestres || {};
  }, [turmas]);

  const removerTurma = useCallback((nomeTurma) => {
    setTurmas(prev => {
      const novasTurmas = { ...prev };
      delete novasTurmas[nomeTurma];
      return novasTurmas;
    });
    setOrdemTurmas(prev => prev.filter(t => t !== nomeTurma));
    if (turmaSelecionada === nomeTurma) {
      const turmasRestantes = Object.keys(turmas).filter(t => t !== nomeTurma).sort();
      setTurmaSelecionada(turmasRestantes[0] || null);
    }
  }, [turmaSelecionada, turmas]);

  const substituirTurmas = useCallback((novasTurmas) => {
    setTurmas(novasTurmas);
    // Selecionar primeira turma se houver
    const primeiraTurma = Object.keys(novasTurmas).sort()[0];
    if (primeiraTurma && !novasTurmas[turmaSelecionada]) {
      setTurmaSelecionada(primeiraTurma);
    }
  }, [turmaSelecionada]);

  const obterEstatisticas = useCallback(() => {
    return storageService.calcularEstatisticas(turmas);
  }, [turmas]);

  const obterProgressoUpload = useCallback(() => {
    const totalTurmas = Object.keys(turmas).length;
    const totalBimestresEsperados = totalTurmas * 4;
    let totalBimestresCarregados = 0;

    Object.keys(turmas).forEach(nomeTurma => {
      const bimestres = turmas[nomeTurma].bimestres || {};
      totalBimestresCarregados += Object.keys(bimestres).length;
    });

    return {
      totalTurmas,
      totalBimestresEsperados,
      totalBimestresCarregados,
      percentual: totalBimestresEsperados > 0 
        ? Math.round((totalBimestresCarregados / totalBimestresEsperados) * 100)
        : 0
    };
  }, [turmas]);

  const reordenarTurmas = useCallback((novaOrdem) => {
    setOrdemTurmas(novaOrdem);
  }, []);

  return (
    <TurmaContext.Provider
      value={{
        turmas,
        turmaSelecionada,
        setTurmaSelecionada,
        adicionarTurma,
        adicionarBimestre,
        obterDadosTurma,
        obterBimestres,
        removerTurma,
        substituirTurmas,
        obterEstatisticas,
        obterProgressoUpload,
        reordenarTurmas,
        listaTurmas: ordemTurmas
      }}
    >
      {children}
    </TurmaContext.Provider>
  );
};
