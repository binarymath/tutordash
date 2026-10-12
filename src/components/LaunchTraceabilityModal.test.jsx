import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LaunchTraceabilityModal from './LaunchTraceabilityModal';

// Mock de getXLSX
vi.mock('../services/api', () => ({
  getXLSX: vi.fn(async () => ({
    utils: {
      book_new: vi.fn(() => ({})),
      json_to_sheet: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    writeFile: vi.fn(),
  })),
}));

describe('LaunchTraceabilityModal — Rastreabilidade e Auditoria de Lançamentos', () => {
  const mockStudents = [
    // Aluno 1 (1A, Ativo): tem nota de Matemática no 3º Bi
    {
      nome: 'Aluno Teste 1',
      turma: '1A',
      tutor: 'Prof Carlos',
      situacao: 'Ativo',
      historicoConceitos: [
        {
          bimestre: '1º Bimestre',
          notas: { 'MATEMÁTICA': '7.0', 'PORTUGUÊS': '8.0' },
        },
        {
          bimestre: '3º Bimestre',
          notas: { 'MATEMÁTICA': '8.5', 'PORTUGUÊS': '-' },
        },
      ],
    },
    // Aluno 2 (1A, Ativo): NÃO tem nota de Matemática no 3º Bi -> FURO DE DIGITAÇÃO!
    {
      nome: 'Aluno Omitido 2',
      turma: '1A',
      tutor: 'Prof Carlos',
      situacao: 'Ativo',
      historicoConceitos: [
        {
          bimestre: '1º Bimestre',
          notas: { 'MATEMÁTICA': '6.0', 'PORTUGUÊS': '7.0' },
        },
        {
          bimestre: '3º Bimestre',
          notas: { 'MATEMÁTICA': '-', 'PORTUGUÊS': '-' },
        },
      ],
    },
    // Aluno 3 (2B, Ativo): turma inteira sem nenhuma nota no 3º Bi
    {
      nome: 'Aluno Turma B 3',
      turma: '2B',
      tutor: 'Prof Ana',
      situacao: 'Ativo',
      historicoConceitos: [
        {
          bimestre: '1º Bimestre',
          notas: { 'HISTÓRIA': '9.0' },
        },
      ],
    },
    // Aluno 4 (1A, Inativo/Transferido): NÃO deve ser considerado na auditoria de ativos
    {
      nome: 'Aluno Transferido 4',
      turma: '1A',
      tutor: 'Prof Carlos',
      situacao: 'Transferido',
      historicoConceitos: [],
    },
  ];

  it('não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <LaunchTraceabilityModal
        isOpen={false}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza o cabeçalho, KPIs e informações do bimestre quando isOpen é true', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );

    expect(screen.getByText(/Rastreabilidade e Auditoria de Lançamentos/i)).toBeInTheDocument();
    expect(screen.getByText('3º Bimestre')).toBeInTheDocument();
    expect(screen.getByText('Alunos Ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendências no Grupo')).toBeInTheDocument();
    expect(screen.getByText('Turmas com Dados')).toBeInTheDocument();
  });

  it('identifica furos de digitação quando um aluno ativo não tem nota onde outro colega da turma já tem', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );

    // Deve exibir o Aluno Omitido 2 na lista de pendências
    expect(screen.getByText('Aluno Omitido 2')).toBeInTheDocument();

    // Deve mostrar a tag do furo de Matemática para o Aluno Omitido 2
    expect(screen.getByText('MATEMÁTICA')).toBeInTheDocument();
  });

  it('ignora alunos inativos/transferidos da auditoria', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );

    expect(screen.queryByText('Aluno Transferido 4')).not.toBeInTheDocument();
  });

  it('permite alternar entre as abas Alunos com Pendência, Visão por Turma e Disciplinas', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );

    // Clica na aba Visão por Turma
    fireEvent.click(screen.getByRole('button', { name: /Visão por Turma/i }));
    expect(screen.getAllByText(/Turma 1A/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Turma 2B/i).length).toBeGreaterThan(0);

    // Clica na aba Disciplinas
    fireEvent.click(screen.getByRole('button', { name: /Disciplinas/i }));
    expect(screen.getByText('MATEMÁTICA')).toBeInTheDocument();
  });

  it('filtra alunos pela barra de pesquisa', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar aluno, turma, tutor ou matéria/i);
    fireEvent.change(searchInput, { target: { value: 'Aluno Omitido' } });

    expect(screen.getByText('Aluno Omitido 2')).toBeInTheDocument();
    expect(screen.queryByText('Aluno Turma B 3')).not.toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    const onClose = vi.fn();
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={onClose}
        allStudents={mockStudents}
        selectedBimestre="3"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Fechar modal de rastreabilidade/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
