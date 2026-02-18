import { dbService } from './dbService';

const STORAGE_KEY = 'analisador_bimestral_data';
const VERSION = '1.0';

export const storageService = {
  // Inicializa e migra dados se necessário
  async inicializar() {
    try {
      // Verifica se há dados no LocalStorage para migrar
      const dadosLocais = localStorage.getItem(STORAGE_KEY);
      if (dadosLocais) {
        console.log('Migrando dados do LocalStorage para IndexedDB...');
        const parsed = JSON.parse(dadosLocais);
        await dbService.set(STORAGE_KEY, parsed);

        // Opcional: Limpar LocalStorage após migração bem-sucedida
        // localStorage.removeItem(STORAGE_KEY); 
        console.log('Migração concluída.');
      }
    } catch (error) {
      console.error('Erro na inicialização/migração:', error);
    }
  },

  // Salvar todos os dados
  async salvarDados(turmas) {
    try {
      const dados = {
        versao: VERSION,
        dataAtualizacao: new Date().toISOString(),
        turmas: turmas
      };
      await dbService.set(STORAGE_KEY, dados);
      return { sucesso: true };
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return { sucesso: false, erro: error.message };
    }
  },

  // Carregar todos os dados
  async carregarDados() {
    try {
      await this.inicializar(); // Garante que a migração ocorra antes de carregar

      const dados = await dbService.get(STORAGE_KEY);
      if (!dados) return null;

      return dados.turmas || {};
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return null;
    }
  },

  // Exportar backup JSON
  async exportarBackup(turmas = null) {
    try {
      let turmasData = turmas;

      // Se não foi passado via argumento, busca do DB
      if (!turmasData) {
        const dados = await dbService.get(STORAGE_KEY);
        if (!dados) {
          throw new Error('Nenhum dado para exportar');
        }
        turmasData = dados.turmas;
      }

      const backup = {
        versao: VERSION,
        dataBackup: new Date().toISOString(),
        turmas: turmasData,
        estatisticas: this.calcularEstatisticas(turmasData)
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dataFormatada = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `backup_analisador_${dataFormatada}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

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

      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);

          if (!backup.turmas) {
            throw new Error('Arquivo de backup inválido: formato incorreto ou sem turmas');
          }

          // Carrega dados atuais do DB
          const dadosAtuais = (await this.carregarDados()) || {};
          const dadosMesclados = { ...dadosAtuais, ...backup.turmas };

          const dados = {
            versao: VERSION,
            dataAtualizacao: new Date().toISOString(),
            turmas: dadosMesclados
          };

          await dbService.set(STORAGE_KEY, dados);
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
        if (bimestres[bim] && bimestres[bim].alunos) {
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
  async obterEspacoUsado() {
    try {
      const sizeInfo = await dbService.getSizeInfo();
      // Percentual baseado em quota estimada (ex: 500MB)
      const estimatedQuota = 500 * 1024 * 1024; // 500MB

      return {
        ...sizeInfo,
        percentual: ((sizeInfo.bytes / estimatedQuota) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Erro ao calcular espaço:', error);
      return { bytes: 0, kb: '0.00', mb: '0.00', percentual: '0.0' };
    }
  },

  // Limpar todos os dados
  async limparTudo() {
    try {
      await dbService.clear();
      localStorage.removeItem(STORAGE_KEY);
      return { sucesso: true };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  },

  // Exportar turma específica
  async exportarTurma(nomeTurma, turmaData) {
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

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      return { sucesso: true };
    } catch (error) {
      return { sucesso: false, erro: error.message };
    }
  }
};
