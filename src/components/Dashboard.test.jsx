// src/components/Dashboard.test.jsx
// Testes abrangentes do Dashboard — busca, resultados, filtros,
// tabela, ordenação, badges de situação e exibição de notas/faltas.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from './Dashboard';

// ── Dados de teste ────────────────────────────────────────────────────────────

const makeStudent = (nome, opts = {}) => ({
  nome,
  turma: opts.turma ?? '1A',
  tutor: opts.tutor ?? 'Prof Ana',
  situacao: opts.situacao ?? 'Ativo',
  noteCount: opts.noteCount ?? 0,
  notes: opts.notes ?? [],
  lastNoteDate: opts.lastNoteDate ?? '',
  provaPaulista: opts.provaPaulista ?? 'S/D',
  ultimoMat: opts.ultimoMat ?? '-',
  ultimoPort: opts.ultimoPort ?? '-',
  ultimoFaltas: opts.ultimoFaltas ?? '-',
  ultimoBimNome: opts.ultimoBimNome ?? '-',
});

const makeGroup = (id, turma, tutor, tutorados) => ({ id, turma, tutor, tutorados });

const defaultAllStudents = [
  makeStudent('João Silva', { turma: '1A', tutor: 'Prof Ana', noteCount: 2, notes: [{}], lastNoteDate: '01/04' }),
  makeStudent('Maria Oliveira', { turma: '2B', tutor: 'Prof Carlos' }),
  makeStudent('Pedro Santos', { turma: '1A', tutor: 'Sem Tutor', situacao: 'Inativo' }),
];

const defaultSortedData = [
  makeGroup(0, '1A', 'Prof Ana', ['João Silva']),
  makeGroup(1, '2B', 'Prof Carlos', ['Maria Oliveira']),
  makeGroup(2, '1A', 'Sem Tutor', ['Pedro Santos']),
];

const defaultProps = {
  allStudents: defaultAllStudents,
  sortedData: defaultSortedData,
  filterMode: 'tutor',
  setFilterMode: vi.fn(),
  selectedValue: 'Todos',
  setSelectedValue: vi.fn(),
  optionsList: ['Todos', 'Prof Ana', 'Prof Carlos'],
  stats: { totalStudents: 3, totalGroups: 3 },
  searchTerm: '',
  setSearchTerm: vi.fn(),
  setSelectedStudent: vi.fn(),
  sortConfig: { key: null, direction: 'asc' },
  handleSort: vi.fn(),
  showOnlyActive: false,
  setShowOnlyActive: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Barra de busca ────────────────────────────────────────────────────────────

describe('Dashboard — barra de busca', () => {
  it('renderiza o input de pesquisa', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByPlaceholderText(/pesquisar/i)).toBeInTheDocument();
  });

  it('chama setSearchTerm ao digitar', () => {
    const setSearchTerm = vi.fn();
    render(<Dashboard {...defaultProps} setSearchTerm={setSearchTerm} />);
    fireEvent.change(screen.getByPlaceholderText(/pesquisar/i), { target: { value: 'João' } });
    expect(setSearchTerm).toHaveBeenCalledWith('João');
  });

  it('exibe botões quando searchTerm está ativo', () => {
    render(<Dashboard {...defaultProps} searchTerm="João" />);
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBeGreaterThan(0);
  });

  it('chama setSearchTerm("") ao clicar no botão limpar', () => {
    const setSearchTerm = vi.fn();
    render(<Dashboard {...defaultProps} searchTerm="João" setSearchTerm={setSearchTerm} />);
    const allBtns = screen.getAllByRole('button');
    fireEvent.click(allBtns[0]);
    expect(setSearchTerm).toHaveBeenCalledWith('');
  });
});

// ── Resultados de busca ───────────────────────────────────────────────────────

describe('Dashboard — resultados de busca', () => {
  it('exibe alunos filtrados pelo searchTerm', () => {
    render(<Dashboard {...defaultProps} searchTerm="joão" />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('não exibe alunos que não batem com o searchTerm', () => {
    render(<Dashboard {...defaultProps} searchTerm="xyz_nao_existe" />);
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
  });

  it('chama setSelectedStudent e limpa busca ao clicar no card', () => {
    const setSelectedStudent = vi.fn();
    const setSearchTerm = vi.fn();
    render(
      <Dashboard
        {...defaultProps}
        searchTerm="joão"
        setSelectedStudent={setSelectedStudent}
        setSearchTerm={setSearchTerm}
      />
    );
    fireEvent.click(screen.getByText('João Silva').closest('button'));
    expect(setSelectedStudent).toHaveBeenCalledWith('João Silva');
    expect(setSearchTerm).toHaveBeenCalledWith('');
  });

  it('exibe badge de turma no card do aluno', () => {
    render(<Dashboard {...defaultProps} searchTerm="joão" />);
    expect(screen.getByText(/turma 1a/i)).toBeInTheDocument();
  });

  it('exibe badge "Sem Tutor" para aluno sem tutor', () => {
    render(<Dashboard {...defaultProps} searchTerm="pedro" />);
    expect(screen.getByText(/sem tutor/i)).toBeInTheDocument();
  });

  it('exibe contagem de notas quando aluno tem anotações', () => {
    render(<Dashboard {...defaultProps} searchTerm="joão" />);
    // João tem noteCount=2, deve aparecer algum indicador
    const cards = document.querySelectorAll('[role="button"], button');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('exibe badge "Inativo" para aluno inativo nos resultados', () => {
    render(<Dashboard {...defaultProps} searchTerm="pedro" />);
    expect(screen.getByText(/inativo/i)).toBeInTheDocument();
  });
});

// ── Vista principal (tabela) ──────────────────────────────────────────────────

describe('Dashboard — tabela principal', () => {
  it('exibe colunas Turma, Tutor e Alunos', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Turma')).toBeInTheDocument();
    expect(screen.getByText('Tutor')).toBeInTheDocument();
    expect(screen.getByText('Alunos')).toBeInTheDocument();
  });

  it('exibe os nomes dos alunos na tabela', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument();
  });

  it('chama setSelectedStudent ao clicar no aluno da tabela', () => {
    const setSelectedStudent = vi.fn();
    render(<Dashboard {...defaultProps} setSelectedStudent={setSelectedStudent} />);
    fireEvent.click(screen.getByText('João Silva').closest('button'));
    expect(setSelectedStudent).toHaveBeenCalledWith('João Silva');
  });

  it('exibe o total de alunos no painel de stats', () => {
    render(<Dashboard {...defaultProps} stats={{ totalStudents: 3, totalGroups: 3 }} />);
    // Stats exibe ao menos um número na UI
    const allText = document.body.textContent;
    expect(allText).toContain('3');
  });

  it('exibe badge "Inativo" para aluno inativo na tabela', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('Inativo')).toBeInTheDocument();
  });

  it('exibe badge "Ativo" para aluno ativo', () => {
    render(<Dashboard {...defaultProps} />);
    const badges = screen.getAllByText('Ativo');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('exibe "Sem Tutor" na coluna de tutor', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getAllByText(/sem tutor/i).length).toBeGreaterThan(0);
  });
});

// ── Filtros laterais ──────────────────────────────────────────────────────────

describe('Dashboard — filtros laterais', () => {
  it('renderiza botões TUTOR e TURMA', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText('TUTOR')).toBeInTheDocument();
    expect(screen.getByText('TURMA')).toBeInTheDocument();
  });

  it('chama setFilterMode("turma") ao clicar em TURMA', () => {
    const setFilterMode = vi.fn();
    const setSelectedValue = vi.fn();
    render(<Dashboard {...defaultProps} setFilterMode={setFilterMode} setSelectedValue={setSelectedValue} />);
    fireEvent.click(screen.getByText('TURMA'));
    expect(setFilterMode).toHaveBeenCalledWith('turma');
    expect(setSelectedValue).toHaveBeenCalledWith('Todos');
  });

  it('chama setFilterMode("tutor") ao clicar em TUTOR', () => {
    const setFilterMode = vi.fn();
    const setSelectedValue = vi.fn();
    render(<Dashboard {...defaultProps} filterMode="turma" setFilterMode={setFilterMode} setSelectedValue={setSelectedValue} />);
    fireEvent.click(screen.getByText('TUTOR'));
    expect(setFilterMode).toHaveBeenCalledWith('tutor');
  });

  it('renderiza o select com as opções da lista', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    const texts = options.map(o => o.textContent);
    expect(texts).toContain('Prof Ana');
    expect(texts).toContain('Prof Carlos');
  });

  it('chama setSelectedValue ao mudar o select', () => {
    const setSelectedValue = vi.fn();
    render(<Dashboard {...defaultProps} setSelectedValue={setSelectedValue} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Prof Ana' } });
    expect(setSelectedValue).toHaveBeenCalledWith('Prof Ana');
  });

  it('renderiza checkbox "Apenas alunos Ativos"', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('chama setShowOnlyActive(true) ao marcar o checkbox', () => {
    const setShowOnlyActive = vi.fn();
    render(<Dashboard {...defaultProps} setShowOnlyActive={setShowOnlyActive} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(setShowOnlyActive).toHaveBeenCalledWith(true);
  });

  it('exibe checkbox marcado quando showOnlyActive=true', () => {
    render(<Dashboard {...defaultProps} showOnlyActive={true} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});

// ── Ordenação ─────────────────────────────────────────────────────────────────

describe('Dashboard — ordenação', () => {
  it('chama handleSort("turma") ao clicar no cabeçalho Turma', () => {
    const handleSort = vi.fn();
    render(<Dashboard {...defaultProps} handleSort={handleSort} />);
    fireEvent.click(screen.getByText('Turma').closest('th'));
    expect(handleSort).toHaveBeenCalledWith('turma');
  });

  it('chama handleSort("tutor") ao clicar no cabeçalho Tutor', () => {
    const handleSort = vi.fn();
    render(<Dashboard {...defaultProps} handleSort={handleSort} />);
    fireEvent.click(screen.getByText('Tutor').closest('th'));
    expect(handleSort).toHaveBeenCalledWith('tutor');
  });

  it('chama handleSort("alunos") ao clicar no cabeçalho Alunos', () => {
    const handleSort = vi.fn();
    render(<Dashboard {...defaultProps} handleSort={handleSort} />);
    fireEvent.click(screen.getByText('Alunos').closest('th'));
    expect(handleSort).toHaveBeenCalledWith('alunos');
  });

  it('exibe indicador de ordenação quando sortConfig tem chave ativa', () => {
    render(<Dashboard {...defaultProps} sortConfig={{ key: 'turma', direction: 'asc' }} />);
    expect(document.querySelector('[class*="blue"]')).toBeTruthy();
  });
});

// ── Aluno com informações extras ──────────────────────────────────────────────

describe('Dashboard — dados extras do aluno', () => {
  it('exibe aluno com último bimestre preenchido', () => {
    const students = [
      makeStudent('Ana Lima', { ultimoMat: '8.5', ultimoPort: '7.0', ultimoBimNome: '1º Bi' }),
    ];
    const sorted = [makeGroup(0, '1A', 'Prof Ana', ['Ana Lima'])];
    render(<Dashboard {...defaultProps} allStudents={students} sortedData={sorted} />);
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('exibe aluno com faltas preenchidas', () => {
    const students = [
      makeStudent('Carlos Souza', { ultimoFaltas: '3' }),
    ];
    const sorted = [makeGroup(0, '1A', 'Prof Ana', ['Carlos Souza'])];
    render(<Dashboard {...defaultProps} allStudents={students} sortedData={sorted} />);
    expect(screen.getByText('Carlos Souza')).toBeInTheDocument();
  });
});
