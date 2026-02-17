const STORAGE_KEY = 'analisador_bimestral_data';
const VERSION = '1.0';

export const storageService = {
  // Salvar todos os dados
  salvarDados(turmas) {
    try {
      const dados = {
        versao: VERSION,
        dataAtualizacao: new Date().toISOString(),
        turmas: turmas
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
      return { sucesso: true };
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return { sucesso: false, erro: error.message };
    }
  },

  // Carregar todos os dados
  carregarDados() {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (!dados) return null;
      
      const parsed = JSON.parse(dados);
      return parsed.turmas || {};
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  },

  // Exportar backup JSON
  exportarBackup() {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (!dados) {
        throw new Error('Nenhum dado para exportar');
      }

      const parsed = JSON.parse(dados);
      const backup = {
        versao: VERSION,
        dataBackup: new Date().toISOString(),
        turmas: parsed.turmas,
        estatisticas: this.calcularEstatisticas(parsed.turmas)
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dataFormatada = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `backup_analisador_${dataFormatada}.json`;
      link.click();
      URL.revokeObjectURL(url);

      return { sucesso: true };
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      return { sucesso: false, erro: error.message };
    }
  },

  // Importar backup JSON
  async importarBackup(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          
          if (!backup.turmas) {
            throw new Error('Arquivo de backup inválido');
          }

          // Mesclar com dados existentes
          const dadosAtuais = this.carregarDados() || {};
          const dadosMesclados = { ...dadosAtuais, ...backup.turmas };

          const dados = {
            versao: VERSION,
            dataAtualizacao: new Date().toISOString(),
            turmas: dadosMesclados
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
          resolve({ sucesso: true, turmas: dadosMesclados });
        } catch (error) {
          reject({ sucesso: false, erro: error.message });
        }
      };

      reader.onerror = () => {
        reject({ sucesso: false, erro: 'Erro ao ler arquivo' });
      };

      reader.readAsText(file);
    });
  },

  // Calcular estatísticas
  calcularEstatisticas(turmas) {
    if (!turmas) return {};

    let totalTurmas = 0;
    let totalBimestres = 0;
    let totalAlunos = 0;

    Object.keys(turmas).forEach(nomeTurma => {
      totalTurmas++;
      const bimestres = turmas[nomeTurma].bimestres || {};
      totalBimestres += Object.keys(bimestres).length;
      
      Object.keys(bimestres).forEach(bim => {
        if (bimestres[bim].alunos) {
          totalAlunos += bimestres[bim].alunos.length;
        }
      });
    });

    return {
      totalTurmas,
      totalBimestres,
      totalAlunos: totalBimestres > 0 ? Math.round(totalAlunos / totalBimestres) : 0
    };
  },

  // Obter espaço usado
  obterEspacoUsado() {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (!dados) return { bytes: 0, kb: '0.00', mb: '0.00', percentual: '0.0' };
      
      const bytes = new Blob([dados]).size;
      const kb = bytes / 1024;
      const mb = kb / 1024;
      
      return {
        bytes,
        kb: kb.toFixed(2),
        mb: mb.toFixed(2),
        percentual: ((bytes / (5 * 1024 * 1024)) * 100).toFixed(1)
      };
    } catch (error) {
      return { bytes: 0, kb: '0.00', mb: '0.00', percentual: '0.0' };
    }
  },

  // Limpar todos os dados
  limparTudo() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return { sucesso: true };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  },

  // Exportar turma específica
  exportarTurma(nomeTurma, turmaData) {
    try {
      const exportData = {
        versao: VERSION,
        dataExportacao: new Date().toISOString(),
        turma: nomeTurma,
        dados: turmaData
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dataFormatada = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `${nomeTurma.replace(/\s+/g, '_')}_${dataFormatada}.json`;
      link.click();
      URL.revokeObjectURL(url);

      return { sucesso: true };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }
};
