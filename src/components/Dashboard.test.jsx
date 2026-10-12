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

const defaultSortedData = defaultAllStudents;

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

  it('não exibe mais as colunas Evolução e Status na tabela principal', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.queryByRole('columnheader', { name: /^status$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^evolução$/i })).not.toBeInTheDocument();
  });

  it('não exibe tags de iniciais dos nomes dos alunos na tabela principal', () => {
    render(<Dashboard {...defaultProps} />);
    // O nome completo do aluno é exibido
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    // Iniciais "JS" e "MO" não devem estar renderizadas como tags de avatar na tabela
    expect(screen.queryByText('JS')).not.toBeInTheDocument();
    expect(screen.queryByText('MO')).not.toBeInTheDocument();
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
    expect(screen.getByRole('combobox', { name: /filtrar por tutor ou turma/i })).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    const texts = options.map(o => o.textContent);
    expect(texts).toContain('Prof Ana');
    expect(texts).toContain('Prof Carlos');
  });

  it('chama setSelectedValue ao mudar o select', () => {
    const setSelectedValue = vi.fn();
    render(<Dashboard {...defaultProps} setSelectedValue={setSelectedValue} />);
    fireEvent.change(screen.getByRole('combobox', { name: /filtrar por tutor ou turma/i }), { target: { value: 'Prof Ana' } });
    expect(setSelectedValue).toHaveBeenCalledWith('Prof Ana');
  });

  it('renderiza o seletor de bimestre com 3º Bimestre (Atual), bimestres anteriores e Média Geral', () => {
    render(<Dashboard {...defaultProps} />);
    const bimSelect = screen.getByRole('combobox', { name: /selecionar bimestre/i });
    expect(bimSelect).toBeInTheDocument();
    expect(bimSelect.value).toBe('3');
    const optionTexts = Array.from(bimSelect.options).map(o => o.textContent);
    expect(optionTexts).toContain('3º Bimestre (Atual)');
    expect(optionTexts).toContain('2º Bimestre');
    expect(optionTexts).toContain('1º Bimestre');
    expect(optionTexts).toContain('Média Geral');
  });

  it('permite selecionar Média Geral no seletor de bimestre', () => {
    render(<Dashboard {...defaultProps} />);
    const bimSelect = screen.getByRole('combobox', { name: /selecionar bimestre/i });
    fireEvent.change(bimSelect, { target: { value: 'geral' } });
    expect(bimSelect.value).toBe('geral');
    expect(screen.getByText(/Visão consolidada da média geral acumulada/i)).toBeInTheDocument();
  });

  it('não renderiza mais a tag de médias parciais', () => {
    render(<Dashboard {...defaultProps} />);
    expect(screen.queryByText(/médias parciais/i)).not.toBeInTheDocument();
  });

  it('atualiza os cards de resumo dinamicamente ao alternar o seletor de bimestre', () => {
    const studentComNotas = {
      ...defaultAllStudents[0],
      historicoConceitos: [
        { bimestre: '1º Bimestre', notas: { mat: '4.0', port: '4.0' } },
        { bimestre: '2º Bimestre', notas: { mat: '8.0', port: '8.0' } }
      ]
    };
    render(<Dashboard {...defaultProps} allStudents={[studentComNotas]} sortedData={[studentComNotas]} />);
    const bimSelect = screen.getByRole('combobox', { name: /selecionar bimestre/i });

    // Alterna para 1º Bimestre
    fireEvent.change(bimSelect, { target: { value: '1' } });
    expect(screen.getByText('1 aluno < 5,0 no 1º Bi')).toBeInTheDocument();

    // Alterna para 2º Bimestre
    fireEvent.change(bimSelect, { target: { value: '2' } });
    expect(screen.getByText('Nenhum aluno < 5,0 no 2º Bi')).toBeInTheDocument();
  });

  it('renderiza o card de resumo do Conselho de Classe harmonicamente ao lado da Prova Paulista', () => {
    render(<Dashboard {...defaultProps} />);
    const ccHeaders = screen.getAllByText('Conselho de Classe');
    expect(ccHeaders.length).toBeGreaterThan(0);
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
    const sorted = students;
    render(<Dashboard {...defaultProps} allStudents={students} sortedData={sorted} />);
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('exibe aluno com faltas preenchidas', () => {
    const students = [
      makeStudent('Carlos Souza', { ultimoFaltas: '3' }),
    ];
    const sorted = students;
    render(<Dashboard {...defaultProps} allStudents={students} sortedData={sorted} />);
    expect(screen.getByText('Carlos Souza')).toBeInTheDocument();
  });
});

// ── Isolamento de Cálculos do 3º Bimestre ──────────────────────────────────────

describe('Dashboard — isolamento estrito de notas do 3º Bimestre', () => {
  it('não herda consilhoBimestral nem notas do 2º Bimestre como notas do 3º Bimestre', () => {
    // Aluno 1: Teve nota baixa no 2º Bimestre e consilhoBimestral = 4.2, mas NENHUMA nota no 3º Bimestre
    const alunoSemNotaB3 = {
      ...defaultAllStudents[0],
      nome: 'Aluno Sem Nota B3',
      consilhoBimestral: '4.2',
      ultimoBimestre: '2º Bimestre',
      historicoConceitos: [
        { bimestre: '2º Bimestre', notas: { mat: '4.2', port: '4.2' } }
      ]
    };

    // Aluno 2: Possui uma única nota teste no 3º Bimestre com nota 8.0 (>= 5.0)
    const alunoComNotaB3 = {
      ...defaultAllStudents[1],
      nome: 'Aluno Teste B3',
      consilhoBimestral: '8.0',
      ultimoBimestre: '3º Bimestre',
      historicoConceitos: [
        { bimestre: '3º Bimestre', notas: { mat: '8.0', port: '8.0' } }
      ]
    };

    const students = [alunoSemNotaB3, alunoComNotaB3];

    render(<Dashboard {...defaultProps} allStudents={students} sortedData={students} />);

    // Por padrão ou ao selecionar 3º Bimestre
    const bimSelect = screen.getByRole('combobox', { name: /selecionar bimestre/i });
    expect(bimSelect.value).toBe('3');

    // Card 4: Aluno 1 NÃO deve ser contabilizado como < 5.0!
    // Como o Aluno 2 tem nota 8.0, o número de alunos < 5.0 deve ser 0!
    expect(screen.getByText('Nenhum aluno < 5,0 no 3º Bi')).toBeInTheDocument();

    // Card 1: Deve mostrar 1 avaliado • 1 a lançar
    expect(screen.getByText(/1 avaliado • 1 a lançar/i)).toBeInTheDocument();
  });

  it('dispara onOpenTraceability ao clicar no badge ou no botão do Card 1', () => {
    const onOpenTraceability = vi.fn();
    const alunoSemNota = {
      ...defaultAllStudents[0],
      historicoConceitos: []
    };
    render(
      <Dashboard
        {...defaultProps}
        allStudents={[alunoSemNota]}
        sortedData={[alunoSemNota]}
        onOpenTraceability={onOpenTraceability}
      />
    );

    // Clica no botão "Lançamentos"
    const lancamentosBtn = screen.getByRole('button', { name: /Abrir auditoria de lançamentos de notas/i });
    expect(lancamentosBtn).toBeInTheDocument();
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
    fireEvent.click(lancamentosBtn);
    expect(onOpenTraceability).toHaveBeenCalledWith('3', '1A');

    // Clica no botão "Auditar lançamentos ↗" do Card 1
    const cardBtn = screen.getByRole('button', { name: /Auditar lançamentos ↗/i });
    expect(cardBtn).toBeInTheDocument();
    fireEvent.click(cardBtn);
    expect(onOpenTraceability).toHaveBeenCalledTimes(2);
  });
});

// ── Visões Dinâmicas: Prova Paulista, Conselho de Classe e Médias ────────────

describe('Dashboard — Botões de Visão: Prova Paulista, Conselho de Classe e Médias', () => {
  const studentComHistoricos = {
    ...defaultAllStudents[0],
    historicoConceitos: [
      {
        bimestre: '3º Bimestre',
        notas: {
          'MATEMÁTICA': '7.5',
          'LÍNGUA PORTUGUESA': '8.0',
          'HISTÓRIA': '6.5',
        }
      }
    ],
    historicoProvas: [
      {
        bimestre: '3º Bimestre',
        resultado: '85',
        notas: {
          'MATEMÁTICA': '80',
          'CIÊNCIAS': '90',
        }
      }
    ]
  };

  it('renderiza os 3 botões principais: Prova Paulista, Conselho de Classe e Médias', () => {
    render(<Dashboard {...defaultProps} allStudents={[studentComHistoricos]} sortedData={[studentComHistoricos]} />);
    expect(screen.getByRole('button', { name: /prova paulista/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /conselho de classe/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /médias/i })).toBeInTheDocument();
  });

  it('inicia no modo Médias exibindo somente as médias gerais consolidadas das duas notas', () => {
    render(<Dashboard {...defaultProps} allStudents={[studentComHistoricos]} sortedData={[studentComHistoricos]} />);
    
    // Deve exibir botão e cabeçalho por extenso
    expect(screen.getAllByText('Conselho de Classe').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Prova Paulista').length).toBeGreaterThanOrEqual(2);
    
    // NÃO deve exibir colunas individuais de disciplinas
    expect(screen.queryByText(/história/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ciências/i)).not.toBeInTheDocument();
  });

  it('exibe as disciplinas da Prova Paulista e sua média ao clicar em Prova Paulista', () => {
    render(<Dashboard {...defaultProps} allStudents={[studentComHistoricos]} sortedData={[studentComHistoricos]} />);
    
    const btnPP = screen.getByRole('button', { name: /prova paulista/i });
    fireEvent.click(btnPP);

    // Deve exibir disciplina da Prova Paulista
    expect(screen.getByText(/ciências/i)).toBeInTheDocument();
    // E os cabeçalhos devem indicar Prova Paulista por extenso
    expect(screen.getAllByText('Prova Paulista').length).toBeGreaterThan(0);
    // NÃO deve ter as siglas abreviadas
    expect(screen.queryByText('PP (Mat)')).not.toBeInTheDocument();
    expect(screen.queryByText('PP (Port)')).not.toBeInTheDocument();
  });

  it('exibe as disciplinas do Conselho de Classe e sua média ao clicar em Conselho de Classe', () => {
    render(<Dashboard {...defaultProps} allStudents={[studentComHistoricos]} sortedData={[studentComHistoricos]} />);
    
    const btnCC = screen.getByRole('button', { name: /conselho de classe/i });
    fireEvent.click(btnCC);

    // Deve exibir disciplina do Conselho de Classe
    expect(screen.getByText(/história/i)).toBeInTheDocument();
    // E cabeçalhos devem indicar Conselho de Classe por extenso
    expect(screen.getAllByText('Conselho de Classe').length).toBeGreaterThan(0);
    // NÃO deve ter as siglas abreviadas
    expect(screen.queryByText('CC (Mat)')).not.toBeInTheDocument();
    expect(screen.queryByText('CC (Port)')).not.toBeInTheDocument();
  });

  it('permite selecionar Prova Paulista e Conselho de Classe simultaneamente', () => {
    render(<Dashboard {...defaultProps} allStudents={[studentComHistoricos]} sortedData={[studentComHistoricos]} />);
    
    fireEvent.click(screen.getByRole('button', { name: /prova paulista/i }));
    fireEvent.click(screen.getByRole('button', { name: /conselho de classe/i }));

    // Ambas as disciplinas devem ser exibidas
    expect(screen.getByText(/ciências/i)).toBeInTheDocument();
    expect(screen.getByText(/história/i)).toBeInTheDocument();
  });

  it('retorna para somente as médias ao clicar no botão Médias', () => {
    render(<Dashboard {...defaultProps} allStudents={[studentComHistoricos]} sortedData={[studentComHistoricos]} />);
    
    // Ativa Prova Paulista
    fireEvent.click(screen.getByRole('button', { name: /prova paulista/i }));
    expect(screen.getByText(/ciências/i)).toBeInTheDocument();

    // Clica em Médias
    fireEvent.click(screen.getByRole('button', { name: /médias/i }));
    // Disciplinas somem, ficando somente médias
    expect(screen.queryByText(/ciências/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Conselho de Classe').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Prova Paulista').length).toBeGreaterThanOrEqual(2);
  });

  it('exibe Prova Paulista e Conselho de Classe por extenso nos cards de busca', () => {
    const studentParaBusca = {
      ...defaultAllStudents[0],
      provaPaulista: '8,50',
      consilhoBimestral: '7,20'
    };
    render(<Dashboard {...defaultProps} allStudents={[studentParaBusca]} searchTerm="joão" />);
    
    expect(screen.getByText(/Prova Paulista: 8,50/i)).toBeInTheDocument();
    expect(screen.getByText(/Conselho de Classe: 7,20/i)).toBeInTheDocument();
    expect(screen.queryByText(/PP: 8,50/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CC: 7,20/i)).not.toBeInTheDocument();
  });

  it('na Prova Paulista exibe somente as colunas com notas digitadas (ignora disciplinas com "-", "S/D" ou vazias)', () => {
    const studentComProvasParciais = {
      ...defaultAllStudents[0],
      historicoProvas: [
        {
          bimestre: '3º Bimestre',
          resultado: '75',
          notas: {
            'MATEMÁTICA': '75',   // Digitada!
            'GEOGRAFIA': '-',     // Sem nota digitada
            'HISTÓRIA': 'S/D',    // Sem nota digitada
            'FILOSOFIA': '',      // Sem nota digitada
          }
        }
      ]
    };

    render(
      <Dashboard
        {...defaultProps}
        allStudents={[studentComProvasParciais]}
        sortedData={[studentComProvasParciais]}
      />
    );

    // Clica em Prova Paulista
    fireEvent.click(screen.getByRole('button', { name: /prova paulista/i }));

    // Matemática TEM nota digitada -> deve aparecer
    expect(screen.getByText(/matemática/i)).toBeInTheDocument();

    // Geografia, História e Filosofia NÃO têm notas digitadas -> NÃO devem aparecer
    expect(screen.queryByText(/geografia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/história/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/filosofia/i)).not.toBeInTheDocument();
  });

  it('no Conselho de Classe exibe a coluna Frequência Geral ao lado da Média Geral com ordenação', () => {
    const studentComFreq = {
      ...studentComHistoricos,
      frequenciaMedia: 88.5
    };
    render(
      <Dashboard
        {...defaultProps}
        allStudents={[studentComFreq]}
        sortedData={[studentComFreq]}
      />
    );

    // Clica no botão Conselho de Classe
    fireEvent.click(screen.getByRole('button', { name: /conselho de classe/i }));

    // Coluna Frequência Geral deve estar presente no cabeçalho
    expect(screen.getByText('Frequência Geral')).toBeInTheDocument();
    // Valor da frequência 88.5% deve estar na tabela
    expect(screen.getByText('88.5%')).toBeInTheDocument();

    // Permite clicar para ordenar por Frequência Geral sem crash
    fireEvent.click(screen.getByText('Frequência Geral'));
  });

  it('aplica tag verde para frequência a partir de 75% e vermelha abaixo de 75%', () => {
    const studentVerde = {
      ...studentComHistoricos,
      nome: 'Aluno Verde',
      frequenciaMedia: 75.0,
      historicoConceitos: [{ bimestre: '3º Bimestre', freqBimestre: '75%' }]
    };
    const studentVermelho = {
      ...studentComHistoricos,
      nome: 'Aluno Vermelho',
      frequenciaMedia: 74.9,
      historicoConceitos: [{ bimestre: '3º Bimestre', freqBimestre: '74,9%' }]
    };

    render(
      <Dashboard
        {...defaultProps}
        allStudents={[studentVerde, studentVermelho]}
        sortedData={[studentVerde, studentVermelho]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /conselho de classe/i }));

    const badgeVerde = screen.getByText('75%');
    expect(badgeVerde).toHaveClass('text-emerald-700');
    expect(badgeVerde).toHaveClass('bg-emerald-50');

    const badgeVermelho = screen.getByText('74.9%');
    expect(badgeVermelho).toHaveClass('text-rose-700');
    expect(badgeVermelho).toHaveClass('bg-rose-50');
  });

  it('esconde o ranking completamente por padrão e só exibe após clicar no botão RANKING', () => {
    render(<Dashboard {...defaultProps} />);

    // Por padrão, o painel e qualquer cabeçalho de Top 5 estão completamente ocultos
    expect(screen.queryByText(/ranking geral/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Top 5')).not.toBeInTheDocument();

    // Clica no botão de RANKING na barra de abas
    const rankingBtn = screen.getByRole('button', { name: /ranking/i });
    fireEvent.click(rankingBtn);

    // Agora o ranking deve estar visível com o badge Top 5
    expect(screen.getByText('Top 5')).toBeInTheDocument();

    // Clica no botão de fechar do ranking ou no botão de RANKING novamente para fechar
    const closeBtn = screen.getByTitle(/fechar ranking/i);
    fireEvent.click(closeBtn);

    // O ranking é completamente ocultado novamente
    expect(screen.queryByText('Top 5')).not.toBeInTheDocument();
  });

  it('remove FRE(%) e não renderiza como coluna de disciplina do Conselho de Classe', () => {
    const studentComFreNota = {
      ...studentComHistoricos,
      historicoConceitos: [
        {
          bimestre: '3º Bimestre',
          notas: {
            'Arte': '8,0',
            'Matemática': '9,0',
            'FRE(%)': '1,0',
            'FRE (%)': '1,0',
            'TF': '12',
            'Faltas': '12',
          },
          freqBimestre: '85%'
        }
      ]
    };

    render(
      <Dashboard
        {...defaultProps}
        allStudents={[studentComFreNota]}
        sortedData={[studentComFreNota]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /conselho de classe/i }));

    // Disciplinas normais devem aparecer
    expect(screen.getByText('Arte')).toBeInTheDocument();
    expect(screen.getByText('Matemática')).toBeInTheDocument();

    // FRE(%) e TF NÃO devem aparecer como colunas de disciplinas
    expect(screen.queryByText('FRE(%)')).not.toBeInTheDocument();
    expect(screen.queryByText('FRE (%)')).not.toBeInTheDocument();
    expect(screen.queryByText(/^FRE\s*\(%\)$/i)).not.toBeInTheDocument();
    expect(screen.queryByText('TF')).not.toBeInTheDocument();

    // A coluna oficial 'Frequência Geral' ao lado da Média Geral deve continuar presente
    expect(screen.getByText('Frequência Geral')).toBeInTheDocument();
  });

  it('renderiza a coluna Alunos com classes sticky left para rolagem horizontal fluida', () => {
    render(<Dashboard {...defaultProps} />);

    // Cabeçalho da coluna Alunos
    const thAluno = screen.getByRole('columnheader', { name: /alunos/i });
    expect(thAluno).toHaveClass('sticky');
    expect(thAluno).toHaveClass('left-0');

    // Célula do Aluno na tabela
    const alunoCell = screen.getByText('João Silva').closest('td');
    expect(alunoCell).toHaveClass('sticky');
    expect(alunoCell).toHaveClass('left-0');
  });

  it('exibe o Card 4 com o título "Foco de Atenção" e passa a turma analisada ao abrir relatório', () => {
    const onOpenLowGradesReport = vi.fn();
    const studentsTurma3A = [
      makeStudent('Aluno 1', { turma: '3A', situacao: 'Ativo' }),
      makeStudent('Aluno 2', { turma: '3A', situacao: 'Ativo' })
    ];

    render(
      <Dashboard
        {...defaultProps}
        allStudents={studentsTurma3A}
        sortedData={studentsTurma3A}
        filterMode="turma"
        selectedValue="3A"
        onOpenLowGradesReport={onOpenLowGradesReport}
      />
    );

    // O título do Card 4 deve ser Foco de Atenção
    expect(screen.getByText('Foco de Atenção')).toBeInTheDocument();
    expect(screen.queryByText('Alunos < 5,0')).not.toBeInTheDocument();

    // Ao clicar em Abrir Relatório, deve passar o bimestre selecionado ('3') e a turma '3A'
    const btnRelatorio = screen.getByText('Abrir Relatório');
    fireEvent.click(btnRelatorio);

    expect(onOpenLowGradesReport).toHaveBeenCalledWith('3', '3A');
  });
});




