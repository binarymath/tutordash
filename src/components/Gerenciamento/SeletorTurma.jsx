import React, { useState } from 'react';
import { useTurma } from '../../contexts/TurmaContext';
import { Plus, X, School } from 'lucide-react';
import Card from '../Common/Card';
import Button from '../Common/Button';

const SeletorTurma = () => {
  const { listaTurmas, turmaSelecionada, setTurmaSelecionada, adicionarTurma, removerTurma, obterBimestres } = useTurma();
  const [novaTurma, setNovaTurma] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const handleAdicionarTurma = (e) => {
    e.preventDefault();
    if (novaTurma.trim()) {
      adicionarTurma(novaTurma.trim().toUpperCase());
      setNovaTurma('');
      setMostrarFormulario(false);
    }
  };

  const handleRemoverTurma = (nomeTurma, e) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja remover a turma "${nomeTurma}"?\n\nTodos os dados desta turma serão perdidos!`)) {
      removerTurma(nomeTurma);
    }
  };

  const getBimestresCarregados = (nomeTurma) => {
    const bimestres = obterBimestres(nomeTurma);
    return Object.keys(bimestres).length;
  };

  return (
    <Card className="bg-brown-900/50 border-brown-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <School size={24} className="text-accent-gold" />
          <h3 className="text-lg font-bold text-white">Selecionar Turma</h3>
        </div>
        <Button
          variant="contained"
          color="accent"
          size="small"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          startIcon={mostrarFormulario ? <X size={16} /> : <Plus size={16} />}
        >
          {mostrarFormulario ? 'Cancelar' : 'Nova Turma'}
        </Button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleAdicionarTurma} className="mb-4 p-4 bg-brown-800/30 rounded-lg border border-brown-700">
          <input
            type="text"
            value={novaTurma}
            onChange={(e) => setNovaTurma(e.target.value.toUpperCase())}
            placeholder="Nome da turma (ex: 9A, 1B, 3ANO)"
            className="w-full px-4 py-2 bg-brown-900/50 border border-brown-600 rounded-lg text-white placeholder-brown-400 focus:outline-none focus:border-accent-gold transition-colors"
            autoFocus
          />
          <Button
            type="submit"
            variant="contained"
            color="success"
            className="w-full mt-3"
            disabled={!novaTurma.trim()}
          >
            Adicionar Turma
          </Button>
        </form>
      )}

      {listaTurmas.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {listaTurmas.map((turma) => {
            const bimestresCarregados = getBimestresCarregados(turma);
            const isSelecionada = turmaSelecionada === turma;
            
            return (
              <div
                key={turma}
                className={`relative group`}
              >
                <button
                  onClick={() => setTurmaSelecionada(turma)}
                  className={`w-full px-4 py-3 rounded-lg font-bold transition-all ${
                    isSelecionada
                      ? 'bg-accent-gold text-brown-900 shadow-lg scale-105'
                      : 'bg-brown-800/50 text-white hover:bg-brown-700/50 border border-brown-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-lg">{turma}</div>
                    <div className={`text-xs mt-1 ${isSelecionada ? 'text-brown-800' : 'text-brown-400'}`}>
                      {bimestresCarregados}/4 bim
                    </div>
                  </div>
                </button>
                
                {/* Botão de remover */}
                <button
                  onClick={(e) => handleRemoverTurma(turma, e)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                  title={`Remover turma ${turma}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-brown-800/20 rounded-lg border-2 border-dashed border-brown-700">
          <p className="text-brown-400 mb-2">📚 Nenhuma turma cadastrada</p>
          <p className="text-sm text-brown-500">
            Clique em "Nova Turma" para começar
          </p>
        </div>
      )}

      {turmaSelecionada && (
        <div className="mt-4 p-3 bg-accent-gold/10 border border-accent-gold/30 rounded-lg">
          <p className="text-sm text-accent-gold font-semibold">
            ✓ Turma selecionada: <span className="text-white font-bold">{turmaSelecionada}</span>
          </p>
        </div>
      )}
    </Card>
  );
};

export default SeletorTurma;
