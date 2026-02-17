import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { useTurma } from '../../contexts/TurmaContext';
import { Download, Upload, Trash2 } from 'lucide-react';
import Card from '../Common/Card';
import Button from '../Common/Button';

const BackupManager = () => {
  const { substituirTurmas, obterEstatisticas, obterProgressoUpload } = useTurma();
  const [mensagem, setMensagem] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const espacoUsado = storageService.obterEspacoUsado();
  const estatisticas = obterEstatisticas();
  const progresso = obterProgressoUpload();

  const handleExportarBackup = () => {
    setCarregando(true);
    const resultado = storageService.exportarBackup();
    
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: '✓ Backup exportado com sucesso!' });
    } else {
      setMensagem({ tipo: 'erro', texto: `✗ Erro: ${resultado.erro}` });
    }
    
    setCarregando(false);
    setTimeout(() => setMensagem(null), 3000);
  };

  const handleImportarBackup = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setCarregando(true);
    
    try {
      const resultado = await storageService.importarBackup(file);
      
      if (resultado.sucesso) {
        substituirTurmas(resultado.turmas);
        setMensagem({ tipo: 'sucesso', texto: '✓ Backup importado com sucesso!' });
      } else {
        setMensagem({ tipo: 'erro', texto: `✗ Erro: ${resultado.erro}` });
      }
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: `✗ Erro ao importar: ${error.erro}` });
    }
    
    setCarregando(false);
    event.target.value = '';
    setTimeout(() => setMensagem(null), 3000);
  };

  const handleLimparDados = () => {
    if (window.confirm('⚠️ Tem certeza que deseja limpar TODOS os dados?\n\nEsta ação não pode ser desfeita!\n\nRecomendamos fazer backup antes de continuar.')) {
      const resultado = storageService.limparTudo();
      
      if (resultado.sucesso) {
        substituirTurmas({});
        setMensagem({ tipo: 'sucesso', texto: '✓ Todos os dados foram limpos!' });
      } else {
        setMensagem({ tipo: 'erro', texto: `✗ Erro: ${resultado.erro}` });
      }
      
      setTimeout(() => setMensagem(null), 3000);
    }
  };

  return (
    <Card className="bg-brown-900/50 border-brown-700">
      <h2 className="text-2xl font-bold text-accent-gold mb-6 flex items-center gap-2">
        <Download size={28} />
        Gerenciamento de Dados
      </h2>

      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-brown-800/50 p-4 rounded-lg border border-brown-700">
          <div className="text-brown-300 text-sm font-medium mb-1">Total de Turmas</div>
          <div className="text-3xl font-bold text-white">{estatisticas.totalTurmas || 0}</div>
        </div>
        
        <div className="bg-brown-800/50 p-4 rounded-lg border border-brown-700">
          <div className="text-brown-300 text-sm font-medium mb-1">Arquivos de Mapão</div>
          <div className="text-3xl font-bold text-white">
            {progresso.totalBimestresCarregados} / {progresso.totalBimestresEsperados}
          </div>
          <div className="text-xs text-brown-400 mt-1">
            {estatisticas.totalTurmas || 0} {estatisticas.totalTurmas === 1 ? 'turma' : 'turmas'} × 4 bimestres
          </div>
        </div>
        
        <div className="bg-brown-800/50 p-4 rounded-lg border border-brown-700">
          <div className="text-brown-300 text-sm font-medium mb-1">Espaço Usado</div>
          <div className="text-3xl font-bold text-white">{espacoUsado.mb} MB</div>
          <div className="text-xs text-brown-400 mt-1">{espacoUsado.percentual}% do limite</div>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-brown-300 mb-2">
          <span className="font-semibold">Progresso de Upload</span>
          <span className="font-bold">{progresso.percentual}%</span>
        </div>
        <div className="w-full bg-brown-800/50 rounded-full h-3 overflow-hidden border border-brown-700">
          <div 
            className="bg-gradient-to-r from-accent-gold to-yellow-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${progresso.percentual}%` }}
          ></div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="contained"
          color="success"
          onClick={handleExportarBackup}
          disabled={carregando || estatisticas.totalTurmas === 0}
          startIcon={<Download size={18} />}
          className="w-full"
        >
          Exportar Backup
        </Button>

        <label className={`inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-base bg-brown-600 text-white hover:bg-brown-700 shadow-elevation-2 hover:shadow-elevation-4 transition-all duration-shorter cursor-pointer w-full ${carregando ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Upload size={18} className="mr-2" />
          Importar Backup
          <input
            type="file"
            accept=".json"
            onChange={handleImportarBackup}
            disabled={carregando}
            className="hidden"
          />
        </label>

        <Button
          variant="contained"
          color="error"
          onClick={handleLimparDados}
          disabled={carregando || estatisticas.totalTurmas === 0}
          startIcon={<Trash2 size={18} />}
          className="w-full"
        >
          Limpar Dados
        </Button>
      </div>

      {/* Mensagens de Feedback */}
      {mensagem && (
        <div className={`mt-4 p-4 rounded-lg border font-semibold ${
          mensagem.tipo === 'sucesso' 
            ? 'bg-green-900/30 border-green-500/50 text-green-400'
            : 'bg-red-900/30 border-red-500/50 text-red-400'
        }`}>
          {mensagem.texto}
        </div>
      )}

      {/* Loading Indicator */}
      {carregando && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-accent-gold border-t-transparent"></div>
          <p className="text-brown-300 text-sm mt-2 font-medium">Processando...</p>
        </div>
      )}
    </Card>
  );
};

export default BackupManager;
