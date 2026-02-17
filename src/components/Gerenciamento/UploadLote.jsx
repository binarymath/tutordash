import React, { useState } from 'react';
import { useTurma } from '../../contexts/TurmaContext';
import { lerMapao } from '../../services/mapaoService';
import { Upload, X, CheckCircle, XCircle } from 'lucide-react';
import Card from '../Common/Card';
import Button from '../Common/Button';

const UploadLote = () => {
  const { adicionarTurma, adicionarBimestre } = useTurma();
  const [arquivos, setArquivos] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [resultados, setResultados] = useState([]);

  const detectarTurmaBimestre = (nomeArquivo) => {
    // Padrões: "9A_1BIM.xlsx", "9 A - 1 Bimestre.xlsx", "Turma 9A - 1º Bim.xlsx"
    const patterns = [
      /(\d+\s*[A-Z])[_\s-]*(\d)[^\d]*bim/i,
      /turma[:\s]*(\d+\s*[A-Z])[_\s-]*(\d)/i,
      /(\d+)º?\s*([A-Z])[_\s-]*(\d)/i,
      /([A-Z]\d+)[_\s-]*(\d)/i
    ];

    for (const pattern of patterns) {
      const match = nomeArquivo.match(pattern);
      if (match) {
        let turma = match[1];
        let bimestre = match[2];
        
        if (!bimestre && match[3]) {
          bimestre = match[3];
        }

        turma = turma.replace(/\s+/g, '').toUpperCase();
        return { turma, bimestre };
      }
    }

    return null;
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const arquivosComInfo = files.map(file => {
      const info = detectarTurmaBimestre(file.name);
      return {
        file,
        nome: file.name,
        turma: info?.turma || '',
        bimestre: info?.bimestre || '1',
        status: 'pendente'
      };
    });
    setArquivos(arquivosComInfo);
    setResultados([]);
  };

  const atualizarArquivo = (index, campo, valor) => {
    setArquivos(prev => {
      const novo = [...prev];
      novo[index][campo] = valor;
      return novo;
    });
  };

  const processarArquivos = async () => {
    if (arquivos.some(a => !a.turma || !a.bimestre)) {
      alert('⚠️ Preencha turma e bimestre para todos os arquivos');
      return;
    }

    setProcessando(true);
    setProgresso({ atual: 0, total: arquivos.length });
    const novosResultados = [];

    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      setProgresso({ atual: i + 1, total: arquivos.length });

      try {
        console.log(`Processando arquivo ${i + 1}/${arquivos.length}:`, arquivo.nome);
        const dados = await lerMapao(arquivo.file);
        console.log('Dados do mapão lidos:', dados);
        
        // Garantir que a turma existe antes de adicionar o bimestre
        adicionarTurma(arquivo.turma);
        console.log(`Turma ${arquivo.turma} criada/atualizada`);
        
        // Converter bimestre para número
        const numBimestre = parseInt(arquivo.bimestre);
        adicionarBimestre(arquivo.turma, numBimestre, dados);
        console.log(`Bimestre ${numBimestre} adicionado à turma ${arquivo.turma}`);

        novosResultados.push({
          nome: arquivo.nome,
          turma: arquivo.turma,
          bimestre: arquivo.bimestre,
          status: 'sucesso',
          alunos: dados.alunos.length
        });

        setArquivos(prev => {
          const novo = [...prev];
          novo[i].status = 'sucesso';
          return novo;
        });

      } catch (error) {
        console.error(`Erro ao processar arquivo ${arquivo.nome}:`, error);
        novosResultados.push({
          nome: arquivo.nome,
          turma: arquivo.turma,
          bimestre: arquivo.bimestre,
          status: 'erro',
          erro: error.message
        });

        setArquivos(prev => {
          const novo = [...prev];
          novo[i].status = 'erro';
          novo[i].mensagemErro = error.message;
          return novo;
        });
      }
    }

    setResultados(novosResultados);
    setProcessando(false);
    console.log('Processamento concluído. Resultados:', novosResultados);
  };

  const limparArquivos = () => {
    setArquivos([]);
    setResultados([]);
    setProgresso({ atual: 0, total: 0 });
  };

  const removerArquivo = (index) => {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="bg-brown-900/50 border-brown-700">
      <h2 className="text-2xl font-bold text-accent-gold mb-6 flex items-center gap-2">
        <Upload size={28} />
        Upload em Lote
      </h2>

      {/* Seletor de Arquivos */}
      <div className="mb-6">
        <label className="inline-flex items-center justify-center font-semibold rounded-lg px-6 py-3 text-base bg-accent-gold text-brown-900 hover:bg-amber-500 shadow-elevation-2 hover:shadow-elevation-4 transition-all duration-shorter cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <Upload size={18} className="mr-2" />
          Selecionar Múltiplos Arquivos
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFileSelect}
            disabled={processando}
            className="hidden"
          />
        </label>
        <p className="text-sm text-brown-400 mt-2">
          💡 Dica: Nomeie os arquivos como "9A_1BIM.xlsx" para detecção automática de turma e bimestre
        </p>
      </div>

      {/* Lista de Arquivos */}
      {arquivos.length > 0 && (
        <>
          <div className="mb-6 max-h-96 overflow-y-auto border border-brown-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-brown-800/50 sticky top-0 border-b border-brown-700">
                <tr>
                  <th className="p-3 text-left text-brown-300 font-semibold">Arquivo</th>
                  <th className="p-3 text-center text-brown-300 font-semibold">Turma</th>
                  <th className="p-3 text-center text-brown-300 font-semibold">Bimestre</th>
                  <th className="p-3 text-center text-brown-300 font-semibold">Status</th>
                  <th className="p-3 text-center text-brown-300 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {arquivos.map((arquivo, index) => (
                  <tr key={index} className="border-t border-brown-800/50 hover:bg-brown-800/30 transition-colors">
                    <td className="p-3 text-white max-w-xs truncate" title={arquivo.nome}>
                      {arquivo.nome}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="text"
                        value={arquivo.turma}
                        onChange={(e) => atualizarArquivo(index, 'turma', e.target.value.toUpperCase())}
                        disabled={processando || arquivo.status === 'sucesso'}
                        placeholder="9A"
                        className="w-20 px-2 py-1 bg-brown-800/50 border border-brown-600 rounded text-white text-center focus:border-accent-gold focus:outline-none disabled:opacity-50"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={arquivo.bimestre}
                        onChange={(e) => atualizarArquivo(index, 'bimestre', e.target.value)}
                        disabled={processando || arquivo.status === 'sucesso'}
                        className="w-20 px-2 py-1 bg-brown-800/50 border border-brown-600 rounded text-white text-center focus:border-accent-gold focus:outline-none disabled:opacity-50"
                      >
                        <option value="1">1º</option>
                        <option value="2">2º</option>
                        <option value="3">3º</option>
                        <option value="4">4º</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      {arquivo.status === 'pendente' && (
                        <span className="text-brown-400 flex items-center justify-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-brown-400"></div>
                          Pendente
                        </span>
                      )}
                      {arquivo.status === 'sucesso' && (
                        <span className="text-green-400 flex items-center justify-center gap-1">
                          <CheckCircle size={16} />
                          Sucesso
                        </span>
                      )}
                      {arquivo.status === 'erro' && (
                        <span className="text-red-400 flex items-center justify-center gap-1" title={arquivo.mensagemErro}>
                          <XCircle size={16} />
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {arquivo.status === 'pendente' && !processando && (
                        <button
                          onClick={() => removerArquivo(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Remover arquivo"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barra de Progresso */}
          {processando && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-brown-300 mb-2">
                <span className="font-medium">Processando arquivos...</span>
                <span className="font-bold">{progresso.atual} / {progresso.total}</span>
              </div>
              <div className="w-full bg-brown-800/50 rounded-full h-3 overflow-hidden border border-brown-700">
                <div 
                  className="bg-gradient-to-r from-accent-gold to-yellow-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <Button
              variant="contained"
              color="success"
              onClick={processarArquivos}
              disabled={processando}
              className="flex-1"
            >
              {processando ? '⏳ Processando...' : '🚀 Processar Todos'}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={limparArquivos}
              disabled={processando}
              startIcon={<X size={18} />}
            >
              Limpar
            </Button>
          </div>
        </>
      )}

      {/* Resultados */}
      {resultados.length > 0 && !processando && (
        <div className="mt-6 p-4 bg-brown-800/30 rounded-lg border border-brown-700">
          <h3 className="font-bold text-white mb-3">📊 Resultados do Processamento:</h3>
          <div className="space-y-2">
            {resultados.map((resultado, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-md border text-sm ${
                  resultado.status === 'sucesso' 
                    ? 'bg-green-900/20 border-green-500/30 text-green-400'
                    : 'bg-red-900/20 border-red-500/30 text-red-400'
                }`}
              >
                {resultado.status === 'sucesso' 
                  ? `✓ ${resultado.turma} - ${resultado.bimestre}º Bimestre: ${resultado.alunos} alunos carregados`
                  : `✗ ${resultado.nome}: ${resultado.erro}`
                }
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/30 rounded-md">
            <p className="text-accent-gold text-sm font-semibold">
              ✓ {resultados.filter(r => r.status === 'sucesso').length} de {resultados.length} arquivos processados com sucesso
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default UploadLote;
