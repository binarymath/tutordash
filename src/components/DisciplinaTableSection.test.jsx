import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DisciplinaTableSection from './DisciplinaTableSection';

const mockDisciplinaData = {
  hasData: true,
  rows: [
    {
      turma: '1A',
      disciplina: 'MATEMÁTICA',
      bimestre: '1º Bimestre',
      cells: [
        { header: 'Turma', value: '1A' },
        { header: 'Disciplina', value: 'MATEMÁTICA' },
        { header: 'Habilidade', value: 'Geometria' },
        { header: '% Acertos', value: '65%' }
      ],
      rawRow: ['1A', '1º Bimestre', '1º EM', 'MATEMÁTICA', '65%']
    },
    {
      turma: '1A',
      disciplina: 'BIOLOGIA',
      bimestre: '1º Bimestre',
      cells: [
        { header: 'Turma', value: '1A' },
        { header: 'Disciplina', value: 'BIOLOGIA' },
        { header: 'Habilidade', value: 'Ecologia' },
        { header: '% Acertos', value: '72%' }
      ],
      rawRow: ['1A', '1º Bimestre', '1º EM', 'BIOLOGIA', '72%']
    },
    {
      turma: '1A',
      disciplina: 'EDUCAÇÃO FINANCEIRA',
      bimestre: '2º Bimestre',
      cells: [
        { header: 'Turma', value: '1A' },
        { header: 'Disciplina', value: 'EDUCAÇÃO FINANCEIRA' },
        { header: 'Habilidade', value: 'Juros' },
        { header: '% Acertos', value: '80%' }
      ],
      rawRow: ['1A', '2º Bimestre', '1º EM', 'EDUCAÇÃO FINANCEIRA', '80%']
    }
  ]
};

describe('DisciplinaTableSection — Sincronização Automática com o Topo', () => {
  it('exibe Todas as Matérias quando selectedDisc for Geral', () => {
    render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Geral"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.getByText(/Todas as Matérias/i)).toBeInTheDocument();
    expect(screen.getByText('Geometria')).toBeInTheDocument();
    expect(screen.getByText('Ecologia')).toBeInTheDocument();
    expect(screen.getByText('Juros')).toBeInTheDocument();
  });

  it('segue automaticamente a disciplina selecionada no topo (Matemática -> MATEMÁTICA)', () => {
    render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Matemática"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.getAllByText('MATEMÁTICA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Geometria')).toBeInTheDocument();
    expect(screen.queryByText('Ecologia')).not.toBeInTheDocument();
    expect(screen.queryByText('Juros')).not.toBeInTheDocument();
  });

  it('segue sigla selecionada no topo (FIN -> EDUCAÇÃO FINANCEIRA)', () => {
    render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="FIN"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.getAllByText('EDUCAÇÃO FINANCEIRA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Juros')).toBeInTheDocument();
    expect(screen.queryByText('Geometria')).not.toBeInTheDocument();
    expect(screen.queryByText('Ecologia')).not.toBeInTheDocument();
  });

  it('atualiza dinamicamente quando a prop selectedDisc muda', () => {
    const { rerender } = render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Biologia"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.getAllByText('BIOLOGIA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Ecologia')).toBeInTheDocument();

    // Simula troca para Matemática no topo
    rerender(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Matemática"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.getAllByText('MATEMÁTICA').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Geometria')).toBeInTheDocument();
    expect(screen.queryByText('Ecologia')).not.toBeInTheDocument();
  });

  it('filtra dados via campo de busca textual no cabeçalho', () => {
    render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Geral"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    const input = screen.getByPlaceholderText(/Filtrar dados nesta tabela.../i);
    fireEvent.change(input, { target: { value: 'Ecologia' } });

    expect(screen.getByText('Ecologia')).toBeInTheDocument();
    expect(screen.queryByText('Geometria')).not.toBeInTheDocument();
    expect(screen.queryByText('Juros')).not.toBeInTheDocument();
  });

  it('NÃO exibe a seção quando a disciplina selecionada não tem dados na planilha (ex: Eletivas)', () => {
    const { container } = render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Eletivas"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.queryByText(/Registros e Acompanhamento por Disciplina/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Todas as Matérias/i)).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('NÃO exibe a seção quando a turma selecionada não tem registros na planilha', () => {
    const { container } = render(
      <DisciplinaTableSection
        selectedTurma="3C"
        selectedDisc="Geral"
        disciplinaData={mockDisciplinaData}
        hasUrl={true}
      />
    );

    expect(screen.queryByText(/Registros e Acompanhamento por Disciplina/i)).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('NÃO exibe a seção quando não houver URL e for uma disciplina específica', () => {
    const { container } = render(
      <DisciplinaTableSection
        selectedTurma="1A"
        selectedDisc="Matemática"
        disciplinaData={mockDisciplinaData}
        hasUrl={false}
      />
    );

    expect(screen.queryByText(/Registros e Acompanhamento por Disciplina/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Adicionar Planilha/i)).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });
});

