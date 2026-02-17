import React, { useState } from 'react';
import { useTurma } from '../../contexts/TurmaContext';
import { BarChart3, CheckCircle2, Plus, X, School, GripHorizontal } from 'lucide-react';
import Card from '../Common/Card';
import Button from '../Common/Button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente sortable para cada card de turma
const SortableTurmaCard = ({ turma, onClick, isSelected, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: turma.nome });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        onClick={onClick}
        className={`w-full p-4 rounded-lg border transition-all text-left hover:scale-105 ${
          turma.completo 
            ? 'bg-green-900/20 border-green-500/40 hover:border-green-500/60' 
            : 'bg-brown-800/30 border-brown-700 hover:border-accent-gold/50'
        } ${
          isSelected 
            ? 'ring-2 ring-accent-gold ring-offset-2 ring-offset-brown-900' 
            : ''
        }`}
      >
        {/* Handle de arrastar */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-brown-700/50 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripHorizontal size={16} className="text-brown-400" />
        </div>

        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-white text-lg pr-6">{turma.nome}</h3>
          {turma.completo && (
            <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
          )}
        </div>

        {/* Indicadores dos 4 Bimestres */}
        <div className="flex gap-2 mb-3">
          {[1, 2, 3, 4].map(num => {
            const carregado = turma.bimestresCarregados.includes(num);
            return (
              <div
                key={num}
                className={`flex-1 h-2 rounded-full transition-all ${
                  carregado
                    ? 'bg-accent-gold shadow-glow-gold'
                    : 'bg-brown-700/50'
                }`}
                title={`${num}º Bimestre ${carregado ? 'carregado ✓' : 'pendente'}`}
              ></div>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-brown-300 font-medium">
            {turma.total}/4 bimestres
          </span>
          <span className={`font-bold ${
            turma.completo ? 'text-green-400' : 'text-accent-gold'
          }`}>
            {Math.round((turma.total / 4) * 100)}%
          </span>
        </div>
      </button>
      
      {/* Botão de remover */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
        title={`Remover turma ${turma.nome}`}
      >
        <X size={14} />
      </button>
    </div>
  );
};

// Componente sortable para cards do seletor de turma (seção inferior)
const SortableTurmaSelectorCard = ({ nomeTurma, bimestresCarregados, isSelected, onClick, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: nomeTurma });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        onClick={onClick}
        className={`w-full px-4 py-3 rounded-lg font-bold transition-all ${
          isSelected
            ? 'bg-accent-gold text-brown-900 shadow-lg scale-105'
            : 'bg-brown-800/50 text-white hover:bg-brown-700/50 border border-brown-700'
        }`}
      >
        {/* Handle de arrastar */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 hover:bg-brown-700/50 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripHorizontal size={12} className={isSelected ? 'text-brown-600' : 'text-brown-400'} />
        </div>

        <div className="text-center">
          <div className="text-lg">{nomeTurma}</div>
          <div className={`text-xs mt-1 ${isSelected ? 'text-brown-800' : 'text-brown-400'}`}>
            {bimestresCarregados}/4 bim
          </div>
        </div>
      </button>
      
      {/* Botão de remover */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
        title={`Remover turma ${nomeTurma}`}
      >
        <X size={14} />
      </button>
    </div>
  );
};

const DashboardProgresso = () => {
  const { 
    turmas, 
    obterProgressoUpload, 
    setTurmaSelecionada, 
    turmaSelecionada, 
    adicionarTurma, 
    removerTurma, 
    obterBimestres,
    reordenarTurmas,
    listaTurmas
  } = useTurma();
  const [novaTurma, setNovaTurma] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const progresso = obterProgressoUpload();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getTurmasComBimestres = () => {
    // Usar listaTurmas (ordem personalizada) em vez de Object.keys(turmas)
    return listaTurmas.map(nomeTurma => {
      const bimestres = turmas[nomeTurma]?.bimestres || {};
      const bimestresCarregados = [1, 2, 3, 4].map(num => 
        bimestres[num] ? num : null
      ).filter(Boolean);

      return {
        nome: nomeTurma,
        bimestresCarregados,
        total: bimestresCarregados.length,
        completo: bimestresCarregados.length === 4
      };
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = listaTurmas.indexOf(active.id);
      const newIndex = listaTurmas.indexOf(over.id);
      const novaOrdem = arrayMove(listaTurmas, oldIndex, newIndex);
      reordenarTurmas(novaOrdem);
    }
  };

  const turmasInfo = getTurmasComBimestres();
  const turmasCompletas = turmasInfo.filter(t => t.completo).length;

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
    return Object.keys(bimestres).filter(b => bimestres[b] !== null).length;
  };

  return (
    <Card className="bg-brown-900/50 border-brown-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 size={32} className="text-accent-gold" />
          <div>
            <h2 className="text-2xl font-bold text-white">Progresso Geral</h2>
            <p className="text-sm text-brown-400">Acompanhe o status de upload de todas as turmas</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-accent-gold">{progresso.percentual}%</div>
          <div className="text-sm text-brown-300 font-medium">
            {progresso.totalBimestresCarregados} / {progresso.totalBimestresEsperados} bimestres
          </div>
          <div className="text-xs text-brown-400 mt-1">
            {turmasCompletas} de {turmasInfo.length} turmas completas
          </div>
        </div>
      </div>

      {/* Barra de Progresso Geral */}
      <div className="mb-8">
        <div className="w-full bg-brown-800/50 rounded-full h-5 overflow-hidden border border-brown-700 shadow-inner">
          <div 
            className="bg-gradient-to-r from-accent-gold via-yellow-500 to-accent-gold h-full transition-all duration-500 rounded-full flex items-center justify-end pr-3 animate-gradient-x"
            style={{ 
              width: `${progresso.percentual}%`,
              backgroundSize: '200% 100%'
            }}
          >
            {progresso.percentual > 15 && (
              <span className="text-xs font-bold text-brown-900">{progresso.percentual}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Turmas com Drag and Drop */}
      {turmasInfo.length > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-2 text-brown-400 text-sm">
            <GripHorizontal size={16} />
            <span>Arraste as cards para reorganizar</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={turmasInfo.map(t => t.nome)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {turmasInfo.map(turma => (
                  <SortableTurmaCard
                    key={turma.nome}
                    turma={turma}
                    isSelected={turmaSelecionada === turma.nome}
                    onClick={() => setTurmaSelecionada(turma.nome)}
                    onRemove={(e) => handleRemoverTurma(turma.nome, e)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <div className="text-center py-12 px-4">
          <div className="text-6xl mb-4">📂</div>
          <p className="text-xl text-brown-300 font-semibold mb-2">
            Nenhuma turma carregada ainda
          </p>
          <p className="text-sm text-brown-400">
            Comece fazendo upload dos arquivos das turmas na aba "Upload" ou "Upload em Lote"
          </p>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-6 pt-6 border-t border-brown-700 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-gold"></div>
          <span className="text-brown-300">Bimestre Carregado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-brown-700/50"></div>
          <span className="text-brown-300">Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-green-400" />
          <span className="text-brown-300">Turma Completa (4/4)</span>
        </div>
      </div>

      {/* Seção de Gerenciar Turmas */}
      <div className="mt-8 pt-8 border-t border-brown-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <School size={24} className="text-accent-gold" />
            <h3 className="text-lg font-bold text-white">Gerenciar Turmas</h3>
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
          <>
            <div className="mb-3 flex items-center gap-2 text-brown-400 text-xs">
              <GripHorizontal size={14} />
              <span>Arraste para reorganizar</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={listaTurmas}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {listaTurmas.map((turma) => {
                    const bimestresCarregados = getBimestresCarregados(turma);
                    const isSelecionada = turmaSelecionada === turma;
                    
                    return (
                      <SortableTurmaSelectorCard
                        key={turma}
                        nomeTurma={turma}
                        bimestresCarregados={bimestresCarregados}
                        isSelected={isSelecionada}
                        onClick={() => setTurmaSelecionada(turma)}
                        onRemove={(e) => handleRemoverTurma(turma, e)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </>
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
      </div>

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
        .shadow-glow-gold {
          box-shadow: 0 0 8px rgba(255, 183, 77, 0.6);
        }
      `}</style>
    </Card>
  );
};

export default DashboardProgresso;
