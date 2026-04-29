// src/components/StudentProfile.test.jsx
// Testes abrangentes do StudentProfile — cobre renderização, seções expansíveis,
// filtros de sessão, exports (PDF/DOCX), evolutivo e gráficos.

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

// ── Mocks de módulos externos ─────────────────────────────────────────────────

vi.mock('recharts', () => ({
  Radar: () => null,
  RadarChart: ({ children }) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockHtml2pdf = {
  set: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  toPdf: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue({
    internal: {
      getNumberOfPages: vi.fn().mockReturnValue(1),
      pageSize: {
        getWidth: vi.fn().mockReturnValue(210),
        getHeight: vi.fn().mockReturnValue(297),
      },
    },
    setPage: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
  }),
  save: vi.fn().mockResolvedValue(undefined),
};

vi.mock('html2pdf.js', () => ({
  default: vi.fn(() => mockHtml2pdf),
}));

vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('docx', () => ({
  Document:  class { constructor() {} },
  Paragraph: class { constructor() {} },
  Table:     class { constructor() {} },
  TableCell: class { constructor() {} },
  TableRow:  class { constructor() {} },
  TextRun:   class { constructor() {} },
  ImageRun:  class { constructor() {} },
  Packer: { toBlob: vi.fn().mockResolvedValue(new Blob(['fake'])) },
  HeadingLevel: { HEADING_1: 'H1', HEADING_2: 'H2' },
  WidthType: { PERCENTAGE: 'pct' },
}));

import StudentProfile from './StudentProfile';

// ── Dados base ───────────────────────────────────────────────────────────────

const makeProfile = (overrides = {}) => ({
  nome: 'João Silva',
  turma: '1A',
  tutor: 'Prof Ana',
  situacao: 'Ativo',
  provaPaulista: '72%',
  noteCount: 0,
  notes: [],
  ultimoMat: '-',
  ultimoPort: '-',
  ultimoFaltas: '-',
  ultimoBimNome: '1º Bimestre',
  historicoConceitos: [],
  ...overrides,
});

const makeNote = (overrides = {}) => ({
  id: Math.random().toString(),
  displayDate: '10/04/2024',
  studentName: 'João Silva',
  teacher: 'Prof Ana',
  note: 'Aluno muito participativo na sessão de hoje.',
  tipoSessao: 'Tutoria',
  normalizedName: 'joao silva',
  ...overrides,
});

const makeBimestre = (bimestre = '1º Bimestre', overrides = {}) => ({
  bimestre,
  notas: { 'Matemática': '8', 'Português': '7', 'História': '9' },
  faltas: '2',
  tfBimestre: '2',
  freqBimestre: '90%',
  attendanceIndexes: { 'AC': '85%' },
  situacao: 'Ativo',
  normalizedName: 'joao silva',
  nomeOriginal: 'João Silva',
  turmaPlanilha: '1A',
  ...overrides,
});

const defaultProps = {
  studentProfile: makeProfile(),
  filteredNotes: [],
  studentSessions: [],
  studentSessionCounts: {},
  selectedSessionFilters: [],
  setSelectedSessionFilters: vi.fn(),
  prevStudent: null,
  nextStudent: null,
  setSelectedStudent: vi.fn(),
  chartDataMapao: [],
  chartDataProva: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Testes de cabeçalho e informações básicas
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — cabeçalho', () => {
  it('exibe o nome do aluno', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0);
  });

  it('exibe a turma', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/turma: 1a/i)).toBeInTheDocument();
  });

  it('exibe o tutor', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getAllByText(/tutor: prof ana/i).length).toBeGreaterThan(0);
  });

  it('retorna null quando studentProfile é null', () => {
    const { container } = render(<StudentProfile {...defaultProps} studentProfile={null} />);
    expect(container.firstChild).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Navegação entre alunos
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — navegação', () => {
  it('botão Voltar chama setSelectedStudent(null)', () => {
    const setSelectedStudent = vi.fn();
    render(<StudentProfile {...defaultProps} setSelectedStudent={setSelectedStudent} />);
    fireEvent.click(screen.getByText(/voltar/i).closest('button'));
    expect(setSelectedStudent).toHaveBeenCalledWith(null);
  });

  it('botão Anterior desabilitado quando prevStudent é null', () => {
    render(<StudentProfile {...defaultProps} prevStudent={null} />);
    expect(screen.getByText('Anterior').closest('button')).toBeDisabled();
  });

  it('botão Próximo desabilitado quando nextStudent é null', () => {
    render(<StudentProfile {...defaultProps} nextStudent={null} />);
    expect(screen.getByText('Próximo').closest('button')).toBeDisabled();
  });

  it('clica em Próximo e chama setSelectedStudent com nextStudent', () => {
    const setSelectedStudent = vi.fn();
    const next = { nome: 'Maria' };
    render(<StudentProfile {...defaultProps} nextStudent={next} setSelectedStudent={setSelectedStudent} />);
    fireEvent.click(screen.getByText('Próximo').closest('button'));
    expect(setSelectedStudent).toHaveBeenCalledWith(next);
  });

  it('clica em Anterior e chama setSelectedStudent com prevStudent', () => {
    const setSelectedStudent = vi.fn();
    const prev = { nome: 'Carlos' };
    render(<StudentProfile {...defaultProps} prevStudent={prev} setSelectedStudent={setSelectedStudent} />);
    fireEvent.click(screen.getByText('Anterior').closest('button'));
    expect(setSelectedStudent).toHaveBeenCalledWith(prev);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seção de Anotações (toggle + conteúdo)
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — seção de anotações', () => {
  it('exibe o botão "Anotações e Sessões"', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/anotações e sessões/i)).toBeInTheDocument();
  });

  it('exibe mensagem "não possui anotações" quando notes é vazio e seção está aberta', () => {
    const profile = makeProfile({ notes: [] });
    render(<StudentProfile {...defaultProps} studentProfile={profile} filteredNotes={[]} />);
    expect(screen.getByText(/este aluno ainda não possui anotações/i)).toBeInTheDocument();
  });

  it('exibe notas quando filteredNotes está preenchido', () => {
    const note = makeNote();
    const profile = makeProfile({ notes: [note] });
    render(<StudentProfile {...defaultProps} studentProfile={profile} filteredNotes={[note]} />);
    expect(screen.getByText(/aluno muito participativo/i)).toBeInTheDocument();
  });

  it('exibe nota sem descrição quando note está vazio', () => {
    const note = makeNote({ note: '' });
    const profile = makeProfile({ notes: [note] });
    render(<StudentProfile {...defaultProps} studentProfile={profile} filteredNotes={[note]} />);
    expect(screen.getByText(/registo sem descrição/i)).toBeInTheDocument();
  });

  it('exibe badge de tipo de sessão na nota', () => {
    const note = makeNote({ tipoSessao: 'Orientação' });
    const profile = makeProfile({ notes: [note] });
    render(<StudentProfile {...defaultProps} studentProfile={profile} filteredNotes={[note]} />);
    expect(screen.getByText('Orientação')).toBeInTheDocument();
  });

  it('exibe mensagem "sem anotações para este filtro" quando notes tem dados mas filteredNotes está vazio', () => {
    const note = makeNote();
    const profile = makeProfile({ notes: [note] });
    render(<StudentProfile {...defaultProps} studentProfile={profile} filteredNotes={[]} />);
    expect(screen.getByText(/sem anotações registadas para este filtro/i)).toBeInTheDocument();
  });

  it('recolhe a seção ao clicar no botão toggle', () => {
    render(<StudentProfile {...defaultProps} />);
    // A seção começa aberta (showAnotacoes = true por padrão)
    const toggleBtn = screen.getAllByTitle(/recolher|expandir/i)[0];
    fireEvent.click(toggleBtn);
    // Após recolher, a mensagem de vazio não aparece mais
    expect(screen.queryByText(/este aluno ainda não possui anotações/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Filtros de sessão
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — filtros de sessão', () => {
  it('exibe filtros quando há notas e sessões', () => {
    const note = makeNote({ tipoSessao: 'Tutoria' });
    const profile = makeProfile({ notes: [note] });
    // studentSessions deve ser um array de strings (tipos de sessão únicos)
    render(
      <StudentProfile
        {...defaultProps}
        studentProfile={profile}
        filteredNotes={[note]}
        studentSessions={['Tutoria', 'Orientação']}
        studentSessionCounts={{ Tutoria: 1, 'Orientação': 0 }}
      />
    );
    // "Tutoria" aparece tanto no badge da nota quanto no filtro
    expect(screen.getAllByText('Tutoria').length).toBeGreaterThan(0);
  });

  it('exibe botão "Limpar filtros"', () => {
    const note = makeNote();
    const profile = makeProfile({ notes: [note] });
    render(
      <StudentProfile
        {...defaultProps}
        studentProfile={profile}
        filteredNotes={[note]}
        studentSessions={['Tutoria']}
        studentSessionCounts={{ Tutoria: 1 }}
      />
    );
    expect(screen.getByText(/limpar filtros/i)).toBeInTheDocument();
  });

  it('chama setSelectedSessionFilters([]) ao clicar em "Limpar filtros"', () => {
    const setSelectedSessionFilters = vi.fn();
    const note = makeNote();
    const profile = makeProfile({ notes: [note] });
    render(
      <StudentProfile
        {...defaultProps}
        studentProfile={profile}
        filteredNotes={[note]}
        studentSessions={['Tutoria']}
        studentSessionCounts={{ Tutoria: 1 }}
        setSelectedSessionFilters={setSelectedSessionFilters}
      />
    );
    fireEvent.click(screen.getByText(/limpar filtros/i));
    expect(setSelectedSessionFilters).toHaveBeenCalledWith([]);
  });

  it('exibe sessão com filtro ativo quando selectedSessionFilters tem a sessão', () => {
    const note = makeNote({ tipoSessao: 'Tutoria' });
    const profile = makeProfile({ notes: [note] });
    render(
      <StudentProfile
        {...defaultProps}
        studentProfile={profile}
        filteredNotes={[note]}
        studentSessions={['Tutoria']}
        studentSessionCounts={{ Tutoria: 1 }}
        selectedSessionFilters={['Tutoria']}
      />
    );
    // "Tutoria" aparece como filtro ativo
    expect(screen.getAllByText('Tutoria').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seção Prova Paulista (toggle)
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — Prova Paulista', () => {
  it('exibe o botão "Prova Paulista"', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/prova paulista/i)).toBeInTheDocument();
  });

  it('expande e exibe o valor ao clicar no toggle da Prova Paulista', () => {
    const profile = makeProfile({ provaPaulista: '85%' });
    render(<StudentProfile {...defaultProps} studentProfile={profile} />);
    // Procura o botão da Prova Paulista pelo texto
    const ppBtn = screen.getByText(/prova paulista/i).closest('button');
    fireEvent.click(ppBtn);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seção Evolutivo Numérico
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — Evolutivo Numérico', () => {
  it('exibe o botão de Evolutivo', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/evolutivo numérico/i)).toBeInTheDocument();
  });

  it('exibe mensagem "sem dados bimestrais" quando historicoConceitos é vazio', () => {
    render(<StudentProfile {...defaultProps} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    // O toggle do evolutivo é o 4º par (índices 4 e 5)
    fireEvent.click(allToggles[4]);
    expect(screen.getByText(/sem dados bimestrais disponíveis/i)).toBeInTheDocument();
  });

  it('renderiza EvolutivoNumerico quando há historicoConceitos', () => {
    const profile = makeProfile({
      historicoConceitos: [
        makeBimestre('1º Bimestre'),
        makeBimestre('2º Bimestre', { notas: { 'Matemática': '9', 'Português': '8' } }),
      ],
    });
    render(<StudentProfile {...defaultProps} studentProfile={profile} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[4]);
    // O componente EvolutivoNumerico é renderizado — tabela de notas aparece
    expect(screen.getByText(/pontos de atenção/i)).toBeInTheDocument();
  });

  it('renderiza EvolutivoNumerico com disciplinas de risco (< 5.0)', () => {
    const profile = makeProfile({
      historicoConceitos: [
        makeBimestre('1º Bimestre', { notas: { 'Matemática': '3', 'Português': '7' } }),
      ],
    });
    render(<StudentProfile {...defaultProps} studentProfile={profile} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[4]);
    expect(screen.getByText(/pontos de atenção/i)).toBeInTheDocument();
  });

  it('renderiza EvolutivoNumerico com faltas', () => {
    const profile = makeProfile({
      historicoConceitos: [
        makeBimestre('1º Bimestre', { tfBimestre: '5', freqBimestre: '80%' }),
      ],
    });
    render(<StudentProfile {...defaultProps} studentProfile={profile} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[4]);
    // "Total de Faltas" ou "Freqüencia" aparecem no EvolutivoNumerico
    const body = document.body.textContent;
    const hasAttendance = /faltas|frequ/i.test(body);
    expect(hasAttendance).toBe(true);
  });

  it('renderiza EvolutivoNumerico com diferentes áreas de conhecimento', () => {
    const profile = makeProfile({
      historicoConceitos: [
        makeBimestre('1º Bimestre', {
          notas: {
            'Matemática': '8',
            'Língua Portuguesa': '7',
            'História': '9',
            'Ciências': '8',
            'OE Matemática': '6',
            'Disciplina Nova': '7',
          },
        }),
      ],
    });
    render(<StudentProfile {...defaultProps} studentProfile={profile} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[4]);
    expect(screen.getByText(/pontos de atenção/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Seção de Gráficos
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — Análise Gráfica', () => {
  it('exibe o botão de Análise Gráfica', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/análise gráfica/i)).toBeInTheDocument();
  });

  it('expande a seção de gráficos ao clicar no toggle', () => {
    render(<StudentProfile {...defaultProps} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[6]);
    expect(screen.getByText(/sem dados numéricos suficientes/i)).toBeInTheDocument();
  });

  it('renderiza RadarChart quando chartDataMapao tem dados', () => {
    const chartData = [
      { subject: 'Mat', fullSubject: 'Matemática', Aluno: 8, Turma: 7 },
    ];
    render(<StudentProfile {...defaultProps} chartDataMapao={chartData} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[6]);
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
  });

  it('renderiza RadarChart da Prova Paulista quando chartDataProva tem dados', () => {
    const provaData = [
      { subject: 'Mat', fullSubject: 'Matemática', Desempenho: 8 },
    ];
    render(<StudentProfile {...defaultProps} chartDataProva={provaData} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[6]);
    expect(screen.getAllByTestId('radar-chart').length).toBeGreaterThan(0);
  });

  it('exibe mensagem "sem disciplinas" quando chartDataProva é vazio e gráfico está expandido', () => {
    render(<StudentProfile {...defaultProps} chartDataProva={[]} />);
    const allToggles = screen.getAllByTitle(/recolher|expandir/i);
    fireEvent.click(allToggles[6]);
    expect(screen.getByText(/sem disciplinas detalhadas na prova paulista/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Export PDF e DOCX
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — exportação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetar mock do html2pdf para cada teste
    mockHtml2pdf.set.mockReturnThis();
    mockHtml2pdf.from.mockReturnThis();
    mockHtml2pdf.toPdf.mockReturnThis();
    mockHtml2pdf.get.mockResolvedValue({
      internal: {
        getNumberOfPages: vi.fn().mockReturnValue(1),
        pageSize: { getWidth: vi.fn().mockReturnValue(210), getHeight: vi.fn().mockReturnValue(297) },
      },
      setPage: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
    });
    mockHtml2pdf.save.mockResolvedValue(undefined);
  });

  it('exibe botão "Baixar PDF"', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/baixar pdf/i)).toBeInTheDocument();
  });

  it('exibe botão "Baixar DOCX"', () => {
    render(<StudentProfile {...defaultProps} />);
    expect(screen.getByText(/baixar docx/i)).toBeInTheDocument();
  });

  it('clica em "Baixar PDF" sem lançar exceção', async () => {
    render(<StudentProfile {...defaultProps} />);
    const pdfBtn = screen.getByText(/baixar pdf/i).closest('button');
    await act(async () => {
      fireEvent.click(pdfBtn);
      // Aguarda async operations
      await new Promise(r => setTimeout(r, 50));
    });
    // Botão existe e não crasha
    expect(pdfBtn).toBeInTheDocument();
  });

  it('clica em "Baixar DOCX" sem lançar exceção', async () => {
    render(<StudentProfile {...defaultProps} />);
    const docxBtn = screen.getByText(/baixar docx/i).closest('button');
    await act(async () => {
      fireEvent.click(docxBtn);
      await new Promise(r => setTimeout(r, 50));
    });
    expect(docxBtn).toBeInTheDocument();
  });

  it('exporta PDF com notas e chartData preenchidos', async () => {
    const profile = makeProfile({
      nome: 'João Silva',
      notes: [makeNote()],
      historicoConceitos: [makeBimestre('1º Bimestre')],
    });
    render(
      <StudentProfile
        {...defaultProps}
        studentProfile={profile}
        filteredNotes={[makeNote()]}
        chartDataMapao={[{ subject: 'Mat', Aluno: 8, Turma: 7, fullSubject: 'Matemática' }]}
        chartDataProva={[{ subject: 'Mat', Desempenho: 8, fullSubject: 'Matemática' }]}
      />
    );
    const pdfBtn = screen.getByText(/baixar pdf/i).closest('button');
    await act(async () => {
      fireEvent.click(pdfBtn);
      await new Promise(r => setTimeout(r, 100));
    });
    expect(pdfBtn).toBeInTheDocument();
  });

  it('exporta DOCX com notas e chartData preenchidos', async () => {
    const profile = makeProfile({
      nome: 'João Silva',
      notes: [makeNote()],
    });
    render(
      <StudentProfile
        {...defaultProps}
        studentProfile={profile}
        filteredNotes={[makeNote()]}
        chartDataMapao={[{ subject: 'Mat', Aluno: 8, Turma: 7, fullSubject: 'Matemática' }]}
        chartDataProva={[{ subject: 'Mat', Desempenho: 8, fullSubject: 'Matemática' }]}
      />
    );
    const docxBtn = screen.getByText(/baixar docx/i).closest('button');
    await act(async () => {
      fireEvent.click(docxBtn);
      await new Promise(r => setTimeout(r, 100));
    });
    expect(docxBtn).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Casos especiais e robustez
// ─────────────────────────────────────────────────────────────────────────────
describe('StudentProfile — casos especiais', () => {
  it('renderiza sem erro com props mínimas', () => {
    expect(() => render(<StudentProfile {...defaultProps} />)).not.toThrow();
  });

  it('renderiza aluno com ultimoBimNome "Sem Dados"', () => {
    const profile = makeProfile({ ultimoBimNome: 'Sem Dados' });
    render(<StudentProfile {...defaultProps} studentProfile={profile} />);
    expect(document.querySelector('.max-w-5xl')).toBeTruthy();
  });

  it('renderiza com múltiplos bimestres de conceito', () => {
    const profile = makeProfile({
      historicoConceitos: [
        makeBimestre('1º Bimestre'),
        makeBimestre('2º Bimestre'),
        makeBimestre('3º Bimestre'),
        makeBimestre('4º Bimestre'),
      ],
    });
    expect(() => render(<StudentProfile {...defaultProps} studentProfile={profile} />)).not.toThrow();
  });
});
