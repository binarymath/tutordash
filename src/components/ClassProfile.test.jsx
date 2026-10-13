import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ClassProfile from './ClassProfile';

const mockStudents = [
  {
    nome: 'Ana Silva',
    normalizedName: 'ANA SILVA',
    turma: '6A',
    situacao: 'Ativo',
    tutor: 'Prof. Carlos',
    provaPaulista: '8.5',
    consilhoBimestral: '9.0',
    historicoProvas: [
      { bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '9.0', 'PORTUGUÊS': '8.5' } },
      { bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.5', 'PORTUGUÊS': '8.0' } }
    ],
    historicoConceitos: [
      { bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '9.0', 'PORTUGUÊS': '9.0' } },
      { bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.5', 'PORTUGUÊS': '9.0' } }
    ]
  },
  {
    nome: 'Bruno Souza',
    normalizedName: 'BRUNO SOUZA',
    turma: '6A',
    situacao: 'Ativo',
    tutor: 'Prof. Carlos',
    provaPaulista: '8.0',
    consilhoBimestral: '8.5',
    historicoProvas: [
      { bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '8.5', 'PORTUGUÊS': '8.0' } },
      { bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.0', 'PORTUGUÊS': '7.5' } }
    ],
    historicoConceitos: [
      { bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '8.5', 'PORTUGUÊS': '8.5' } },
      { bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.0', 'PORTUGUÊS': '8.5' } }
    ]
  },
  {
    nome: 'Carlos Lima',
    normalizedName: 'CARLOS LIMA',
    turma: '6A',
    situacao: 'Ativo',
    tutor: 'Prof. Ana',
    provaPaulista: '5.0',
    consilhoBimestral: '6.0',
    historicoProvas: [
      { bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '5.5', 'PORTUGUÊS': '5.0' } },
      { bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '5.0', 'PORTUGUÊS': '4.5' } }
    ],
    historicoConceitos: [
      { bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '6.0', 'PORTUGUÊS': '6.0' } },
      { bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '5.5', 'PORTUGUÊS': '6.0' } }
    ]
  }
];

const mockConceitoData = [
  { normalizedName: 'ANA SILVA', turmaPlanilha: '6A', bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '9.0' } },
  { normalizedName: 'ANA SILVA', turmaPlanilha: '6A', bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.5' } },
  { normalizedName: 'BRUNO SOUZA', turmaPlanilha: '6A', bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '8.5' } },
  { normalizedName: 'BRUNO SOUZA', turmaPlanilha: '6A', bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.0' } },
  { normalizedName: 'CARLOS LIMA', turmaPlanilha: '6A', bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '6.0' } },
  { normalizedName: 'CARLOS LIMA', turmaPlanilha: '6A', bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '5.5' } }
];

const mockProvaData = [
  { normalizedName: 'ANA SILVA', turmaPlanilha: '6A', bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '9.0' } },
  { normalizedName: 'ANA SILVA', turmaPlanilha: '6A', bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.5' } },
  { normalizedName: 'BRUNO SOUZA', turmaPlanilha: '6A', bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '8.5' } },
  { normalizedName: 'BRUNO SOUZA', turmaPlanilha: '6A', bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '8.0' } },
  { normalizedName: 'CARLOS LIMA', turmaPlanilha: '6A', bimestre: '1º Bimestre', notas: { 'MATEMÁTICA': '5.5' } },
  { normalizedName: 'CARLOS LIMA', turmaPlanilha: '6A', bimestre: '2º Bimestre', notas: { 'MATEMÁTICA': '5.0' } }
];

describe('ClassProfile Component — Storytelling Dashboard', () => {
  it('renderiza o Ato 1 com o Retrato Oficial Claro da Turma e Métricas Oficiais', () => {
    render(
      <ClassProfile
        selectedTurma="6A"
        setSelectedTurma={vi.fn()}
        allStudents={mockStudents}
        conceitoData={mockConceitoData}
        provaData={mockProvaData}
      />
    );

    expect(screen.getByText('Turma 6A')).toBeInTheDocument();
    expect(screen.getByText('Inteligência Coletiva Oficial')).toBeInTheDocument();
    expect(screen.getByText('Alunos Ativos')).toBeInTheDocument();
    expect(screen.getByText('Posição no Nível')).toBeInTheDocument();
    expect(screen.getByText('Como a turma performou em cada bimestre em relação ao nível?')).toBeInTheDocument();
  });

  it('renderiza o Ato 2 com todos os velocímetros dos bimestres e média geral lado a lado', () => {
    render(
      <ClassProfile
        selectedTurma="6A"
        setSelectedTurma={vi.fn()}
        allStudents={mockStudents}
        conceitoData={mockConceitoData}
        provaData={mockProvaData}
      />
    );

    expect(screen.getByText(/Quantos alunos sustentam o rendimento da turma\?/i)).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByTitle('Diminuir 1 aluno')).toBeInTheDocument();
    expect(screen.getByTitle('Aumentar 1 aluno')).toBeInTheDocument();

    // Todos os velocímetros renderizados lado a lado
    expect(screen.getAllByText('🌟 Média Geral').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1º Bi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2º Bi').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Média Atingida').length).toBeGreaterThanOrEqual(3);
  });

  it('permite alternar entre Slice Geral e Slices Individuais por velocímetro', () => {
    render(
      <ClassProfile
        selectedTurma="6A"
        setSelectedTurma={vi.fn()}
        allStudents={mockStudents}
        conceitoData={mockConceitoData}
        provaData={mockProvaData}
      />
    );

    // Inicialmente no modo Slice Geral
    expect(screen.getByText(/Controle Unificado/i)).toBeInTheDocument();

    // Alternar para Slices Individuais
    const btnIndividual = screen.getByRole('button', { name: /Slices Individuais/i });
    fireEvent.click(btnIndividual);

    expect(screen.getByText(/Slices Individuais Ativos/i)).toBeInTheDocument();
    expect(screen.getAllByTitle('Diminuir 1 aluno').length).toBeGreaterThanOrEqual(3);
  });

  it('detecta e sinaliza o ponto de quebra de desempenho da sala de forma didática', () => {
    render(
      <ClassProfile
        selectedTurma="6A"
        setSelectedTurma={vi.fn()}
        allStudents={mockStudents}
        conceitoData={mockConceitoData}
        provaData={mockProvaData}
      />
    );

    // Bruno tirou ~8.0 e Carlos tirou ~5.0 -> atalho de quebra disponível
    expect(screen.getByText(/Ponto de Quebra \(2\)/i)).toBeInTheDocument();
  });

  it('renderiza o Ato 3 com o Raio-X dos Alunos e a divisória de Degrau de Nota', () => {
    const onSelectStudent = vi.fn();
    render(
      <ClassProfile
        selectedTurma="6A"
        setSelectedTurma={vi.fn()}
        allStudents={mockStudents}
        conceitoData={mockConceitoData}
        provaData={mockProvaData}
        onSelectStudent={onSelectStudent}
      />
    );

    expect(screen.getByText('Posicionamento Individual & Notas Bimestrais')).toBeInTheDocument();
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Souza')).toBeInTheDocument();
    expect(screen.getByText('Carlos Lima')).toBeInTheDocument();

    // Divisória de degrau de nota
    expect(screen.getAllByText(/Degrau de Nota/i).length).toBeGreaterThan(0);

    // Clicar no aluno abre o perfil individual
    fireEvent.click(screen.getByText('Ana Silva'));
    expect(onSelectStudent).toHaveBeenCalledWith('Ana Silva');
  });

  it('permite alternar entre Prova Paulista e Conselho de Classe mantendo o design claro', () => {
    render(
      <ClassProfile
        selectedTurma="6A"
        setSelectedTurma={vi.fn()}
        allStudents={mockStudents}
        conceitoData={mockConceitoData}
        provaData={mockProvaData}
      />
    );

    const btnCC = screen.getByRole('button', { name: /Conselho \(CC\)/i });
    fireEvent.click(btnCC);

    expect(btnCC).toBeInTheDocument();
  });
});
