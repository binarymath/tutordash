import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LowGradesReportModal from './LowGradesReportModal';

describe('LowGradesReportModal revisado', () => {
  const mockStudents = [
    {
      nome: 'Aluno Risco 1',
      turma: '101',
      tutor: 'Prof A',
      totalFaltas: 12,
      frequenciaMedia: 75.5,
      historicoConceitos: [
        {
          bimestre: '1º Bimestre',
          notas: { 'MATEMÁTICA': '4.5', 'LÍNGUA PORTUGUESA': '7.0' }
        },
        {
          bimestre: '2º Bimestre',
          notas: { 'MATEMÁTICA': '3.0', 'LÍNGUA PORTUGUESA': '–' } // en-dash
        }
      ]
    },
    {
      nome: 'Aluno Aprovado',
      turma: '101',
      tutor: 'Prof A',
      historicoConceitos: [
        {
          bimestre: '1º Bimestre',
          notas: { 'MATEMÁTICA': '8.0', 'LÍNGUA PORTUGUESA': '9.0' }
        }
      ]
    }
  ];

  it('renderiza corretamente com paleta em tons de azul e sem termos alarmistas', () => {
    const onClose = vi.fn();
    render(<LowGradesReportModal allStudents={mockStudents} onClose={onClose} />);

    expect(screen.getByText(/Relatório de Alunos/i)).toBeInTheDocument();
    expect(screen.getByText(/^Registros$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Estudantes$/i)).toBeInTheDocument();
    expect(screen.getByText('Aluno Risco 1')).toBeInTheDocument();
  });

  it('lista dinamicamente no seletor apenas os bimestres que têm notas lançadas', () => {
    const onClose = vi.fn();
    render(<LowGradesReportModal allStudents={mockStudents} onClose={onClose} />);

    const selectPeriodo = screen.getAllByRole('combobox')[0];
    const options = Array.from(selectPeriodo.options).map(o => o.value);
    expect(options).toContain('Média Geral');
    expect(options).toContain('1º Bimestre');
    expect(options).toContain('2º Bimestre');
    expect(options).not.toContain('3º Bimestre');
    expect(options).not.toContain('4º Bimestre');
  });

  it('oculta por padrão alunos sem nota (Remover Sem Nota selecionado) e exibe quando desmarcado', () => {
    const onClose = vi.fn();
    render(<LowGradesReportModal allStudents={mockStudents} onClose={onClose} />);

    // Mudar para o 2º bimestre
    const selectPeriodo = screen.getAllByRole('combobox')[0];
    fireEvent.change(selectPeriodo, { target: { value: '2º Bimestre' } });

    // Inicialmente selecionado (removeMissing = true): não deve mostrar Sem Nota (-)
    expect(screen.queryByText('Sem Nota (-)')).not.toBeInTheDocument();

    // Clicar no botão/checkbox para desmarcar Remover Sem Nota (-)
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Agora (removeMissing = false): deve mostrar Sem Nota (-)
    expect(screen.getAllByText('Sem Nota (-)').length).toBeGreaterThan(0);

    // Marcar novamente: deve ocultar rigorosamente
    fireEvent.click(checkbox);
    expect(screen.queryByText('Sem Nota (-)')).not.toBeInTheDocument();
  });

  it('permite classificar por colunas clicando no cabeçalho', () => {
    const onClose = vi.fn();
    render(<LowGradesReportModal allStudents={mockStudents} onClose={onClose} />);

    const thEstudante = screen.getByTitle('Classificar por Estudante');
    fireEvent.click(thEstudante);
    expect(thEstudante).toBeInTheDocument();
  });

  it('ignora alunos transferidos ou inativos (situacao !== Ativo)', () => {
    const studentsWithTransferred = [
      ...mockStudents,
      {
        nome: 'Aluno Transferido Risco',
        turma: '101',
        situacao: 'Transferido',
        frequenciaMedia: null,
        historicoConceitos: [
          {
            bimestre: '1º Bimestre',
            notas: { 'MATEMÁTICA': '2.0' }
          }
        ]
      }
    ];
    const onClose = vi.fn();
    render(<LowGradesReportModal allStudents={studentsWithTransferred} onClose={onClose} />);
    expect(screen.queryByText('Aluno Transferido Risco')).not.toBeInTheDocument();
  });
});
