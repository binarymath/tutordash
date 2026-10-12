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

  it('inicializa com a turma passada em initialTurma', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
        initialTurma="1A"
      />
    );

    // O select de turma deve estar com 1A selecionado
    const selectTurma = screen.getByRole('combobox', { name: /Filtrar por Turma/i });
    expect(selectTurma.value).toBe('1A');
  });

  it('classifica turma sem mapão como Sem Mapão e não gera furos falsos para seus alunos', () => {
    const studentsWithUnstartedClass = [
      {
        nome: 'Aluno 7D Um',
        turma: '7D',
        situacao: 'Ativo',
        historicoConceitos: [],
      },
      {
        nome: 'Aluno 7D Dois',
        turma: '7D',
        situacao: 'Ativo',
        historicoConceitos: [],
      },
    ];

    const mockConceitoData = [
      // Apenas 7A possui mapão no 3º Bimestre
      {
        nomeOriginal: 'Outro Aluno',
        normalizedName: 'outro aluno',
        bimestre: '3º Bimestre',
        turmaPlanilha: '7A',
        notas: { 'MATEMÁTICA': '9.0' },
      },
    ];

    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={studentsWithUnstartedClass}
        conceitoData={mockConceitoData}
        selectedBimestre="3"
        initialTurma="7D"
      />
    );

    // Na aba Visão por Turma, 7D deve aparecer como Sem Mapão
    fireEvent.click(screen.getByRole('button', { name: /Visão por Turma/i }));
    expect(screen.getByText('Sem Mapão')).toBeInTheDocument();

    // Na aba Alunos com Pendência, filtrando por Furos, nenhum aluno do 7D deve ser apontado como furo
    fireEvent.click(screen.getByRole('button', { name: /Alunos com Pendência/i }));
    const selectFiltro = screen.getByRole('combobox', { name: /Tipo de Pendência/i });
    fireEvent.change(selectFiltro, { target: { value: 'furos' } });

    expect(screen.getByText(/Nenhuma pendência encontrada/i)).toBeInTheDocument();
  });

  it('isola notas de aluno transferido para que notas do 7A não contaminem o 7D no 3º Bimestre', () => {
    const studentsWithTransfer = [
      {
        nome: 'Aluna Transferida',
        turma: '7A', // turma ativa resolvida no 3º bimestre
        turmaOriginal: '7D',
        transferido: true,
        historicoTurmas: { 1: '7D', 2: '7D', 3: '7A' },
        situacao: 'Ativo',
        historicoConceitos: [
          {
            bimestre: '2º Bimestre',
            turmaPlanilha: '7D',
            notas: { 'MATEMÁTICA': '8.0' },
          },
          {
            bimestre: '3º Bimestre',
            turmaPlanilha: '7A',
            notas: { 'MATEMÁTICA': '9.0', 'PORTUGUÊS': '8.5' },
          },
        ],
      },
      {
        nome: 'Aluno Nativo 7D',
        turma: '7D',
        situacao: 'Ativo',
        historicoConceitos: [],
      },
    ];

    const mockConceitoData = [
      {
        nomeOriginal: 'Aluna Transferida',
        normalizedName: 'aluna transferida',
        bimestre: '3º Bimestre',
        turmaPlanilha: '7A',
        notas: { 'MATEMÁTICA': '9.0', 'PORTUGUÊS': '8.5' },
      },
    ];

    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={studentsWithTransfer}
        conceitoData={mockConceitoData}
        selectedBimestre="3"
        initialTurma="Todas"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Visão por Turma/i }));
    // 7A tem mapão
    expect(screen.getAllByText(/Turma 7A/i).length).toBeGreaterThan(0);
    // 7D continua como Sem Mapão e não é poluída
    expect(screen.getAllByText(/Turma 7D/i).length).toBeGreaterThan(0);
  });

  it('atualiza dinamicamente os 4 cards de KPIs ao selecionar uma turma específica', () => {
    render(
      <LaunchTraceabilityModal
        isOpen={true}
        onClose={vi.fn()}
        allStudents={mockStudents}
        selectedBimestre="3"
        initialTurma="Todas"
      />
    );

    // Em modo Global (Todas as Turmas):
    expect(screen.getByText('Alunos Ativos')).toBeInTheDocument();
    expect(screen.getByText('Pendências no Grupo')).toBeInTheDocument();
    expect(screen.getByText('Turmas com Dados')).toBeInTheDocument();
    expect(screen.getByText('Conclusão Global')).toBeInTheDocument();

    // Seleciona a Turma 1A no dropdown
    const selectTurma = screen.getByRole('combobox', { name: /Filtrar por Turma/i });
    fireEvent.change(selectTurma, { target: { value: '1A' } });

    // Em modo Turma Específica (1A):
    expect(screen.getByText('Alunos Ativos (1A)')).toBeInTheDocument();
    expect(screen.getByText('Pendências na Turma')).toBeInTheDocument();
    expect(screen.getByText('Disciplinas com Dados')).toBeInTheDocument();
    expect(screen.getByText('Conclusão da Turma')).toBeInTheDocument();
  });
});
