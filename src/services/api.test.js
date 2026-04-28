// src/services/api.test.js
// Testes completos dos parsers e funções de fetch da api.js
// Usa mocks de fetch e do módulo xlsx para evitar acesso à rede.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock do módulo xlsx (deve vir antes das importações do módulo testado) ──
vi.mock('xlsx', () => {
  const utils = {
    sheet_to_json: vi.fn(),
  };
  return {
    default: { read: vi.fn(), utils },
    read: vi.fn(),
    utils,
  };
});

import {
  parsePlanilhaTutoriaMedio,
  fetchStudents,
  fetchNotes,
  fetchProvas,
  fetchConceitos,
  getXLSX,
} from './api';

import * as XLSX from 'xlsx';

// ── Helpers de mock ──────────────────────────────────────────────────────────

const mockFetch = (opts = {}) => {
  const {
    ok = true,
    status = 200,
    text = async () => 'csv-content',
    arrayBuffer = async () => new ArrayBuffer(8),
  } = opts;
  global.fetch = vi.fn().mockResolvedValue({ ok, status, text, arrayBuffer });
};

const mockXLSX = (rows, sheets = ['Sheet1']) => {
  const sheetsObj = {};
  sheets.forEach(name => { sheetsObj[name] = {}; });
  XLSX.read.mockReturnValue({ SheetNames: sheets, Sheets: sheetsObj });
  XLSX.utils.sheet_to_json.mockReturnValue(rows);
};

// ─────────────────────────────────────────────────────────────────────────────
// getXLSX — cobre linhas 7-10 (cache)
// ─────────────────────────────────────────────────────────────────────────────
describe('getXLSX', () => {
  it('retorna o módulo xlsx como promise', async () => {
    const mod = await getXLSX();
    expect(mod).toBeDefined();
    expect(mod.read).toBeDefined();
    expect(mod.utils).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parsePlanilhaTutoriaMedio
// ─────────────────────────────────────────────────────────────────────────────
describe('parsePlanilhaTutoriaMedio', () => {
  const csvComHeader = [
    ['TURMA', 'TUTOR', 'TUTORADO'],
    ['1A', 'Prof Ana', 'João Silva'],
    ['', '', 'Maria Oliveira'],
    ['2B', 'Prof Carlos', 'Pedro Santos'],
    ['', 'Prof Carlos', 'Lucia Ferreira'],
  ];

  it('agrupa tutorados por turma+tutor', () => {
    const result = parsePlanilhaTutoriaMedio(csvComHeader);
    const grupo1A = result.find(g => g.turma === '1A');
    expect(grupo1A).toBeDefined();
    expect(grupo1A.tutorados).toContain('João Silva');
    expect(grupo1A.tutorados).toContain('Maria Oliveira');
  });

  it('herda a turma da linha anterior quando célula vazia', () => {
    const result = parsePlanilhaTutoriaMedio(csvComHeader);
    const grupo1A = result.find(g => g.turma === '1A');
    expect(grupo1A.tutorados).toContain('Maria Oliveira');
  });

  it('herda o tutor da linha anterior quando célula vazia', () => {
    const result = parsePlanilhaTutoriaMedio(csvComHeader);
    const grupo1A = result.find(g => g.tutor === 'Prof Ana');
    expect(grupo1A.tutorados).toContain('Maria Oliveira');
  });

  it('não inclui linhas sem nome de tutorado', () => {
    const csvComLinhaVazia = [
      ['TURMA', 'TUTOR', 'TUTORADO'],
      ['1A', 'Prof Ana', ''],
      ['1A', 'Prof Ana', 'João Silva'],
    ];
    const result = parsePlanilhaTutoriaMedio(csvComLinhaVazia);
    expect(result[0].tutorados).toHaveLength(1);
    expect(result[0].tutorados[0]).toBe('João Silva');
  });

  it('não duplica tutorados no mesmo grupo', () => {
    const csvDuplicado = [
      ['TURMA', 'TUTOR', 'TUTORADO'],
      ['1A', 'Prof Ana', 'João Silva'],
      ['1A', 'Prof Ana', 'João Silva'],
    ];
    const result = parsePlanilhaTutoriaMedio(csvDuplicado);
    expect(result[0].tutorados).toHaveLength(1);
  });

  it('retorna array vazio se CSV tiver somente cabeçalho', () => {
    const result = parsePlanilhaTutoriaMedio([['TURMA', 'TUTOR', 'TUTORADO']]);
    expect(result).toHaveLength(0);
  });

  it('cada item tem id, turma, tutor e tutorados', () => {
    const result = parsePlanilhaTutoriaMedio(csvComHeader);
    result.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('turma');
      expect(item).toHaveProperty('tutor');
      expect(item).toHaveProperty('tutorados');
      expect(Array.isArray(item.tutorados)).toBe(true);
    });
  });

  it('turma formatada corretamente (ex: "1ª A" → "1A")', () => {
    const csvComFormatoLongo = [
      ['TURMA', 'TUTOR', 'TUTORADO'],
      ['1ª SÉRIE A', 'Prof Ana', 'João Silva'],
    ];
    const result = parsePlanilhaTutoriaMedio(csvComFormatoLongo);
    expect(result[0].turma).toBe('1A');
  });

  it('cria grupos separados para turmas diferentes', () => {
    const csv = [
      ['TURMA', 'TUTOR', 'TUTORADO'],
      ['1A', 'Prof Ana', 'Aluno 1'],
      ['2B', 'Prof Carlos', 'Aluno 2'],
      ['3C', 'Prof Maria', 'Aluno 3'],
    ];
    const result = parsePlanilhaTutoriaMedio(csv);
    expect(result).toHaveLength(3);
    const turmas = result.map(r => r.turma);
    expect(turmas).toContain('1A');
    expect(turmas).toContain('2B');
    expect(turmas).toContain('3C');
  });

  it('cria grupos separados para tutores diferentes na mesma turma', () => {
    const csv = [
      ['TURMA', 'TUTOR', 'TUTORADO'],
      ['1A', 'Prof Ana', 'Aluno 1'],
      ['1A', 'Prof Carlos', 'Aluno 2'],
    ];
    const result = parsePlanilhaTutoriaMedio(csv);
    expect(result).toHaveLength(2);
  });

  // Normalização de turma
  const casos = [
    { entrada: '1ª A', esperado: '1A' },
    { entrada: '2º B', esperado: '2B' },
    { entrada: '3ª SÉRIE C', esperado: '3C' },
    { entrada: '1A', esperado: '1A' },
  ];

  casos.forEach(({ entrada, esperado }) => {
    it(`normalização de turma: "${entrada}" → "${esperado}"`, () => {
      const csv = [['TURMA', 'TUTOR', 'TUTORADO'], [entrada, 'Prof X', 'Aluno Y']];
      const result = parsePlanilhaTutoriaMedio(csv);
      expect(result[0].turma).toBe(esperado);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchStudents — cobre linhas 147-183
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchStudents', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('processa formato Médio (TURMA/TUTOR/TUTORADO)', async () => {
    mockFetch();
    mockXLSX([
      ['TURMA', 'TUTOR', 'TUTORADO'],
      ['2A', 'Prof Beatriz', 'Carlos Souza'],
      ['', '', 'Ana Lima'],
    ]);
    const result = await fetchStudents('https://docs.google.com/spreadsheets/d/XYZ/edit');
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('turma');
    expect(result[0]).toHaveProperty('tutor');
  });

  it('processa formato antigo (colunas de índice fixo)', async () => {
    mockFetch();
    // Formato antigo: col[1]=turma, col[2..15]=tutorados, col[16]=tutor
    mockXLSX([
      ['Cabeçalho', 'TURMA', 'ALUNO1', '', '', '', '', '', '', '', '', '', '', '', '', '', 'TUTOR'],
      ['', '1A', 'Aluno A', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Prof X'],
    ]);
    const result = await fetchStudents('https://docs.google.com/spreadsheets/d/OLD/edit');
    expect(result).toBeInstanceOf(Array);
  });

  it('lança erro quando URL não é fornecida', async () => {
    await expect(fetchStudents('')).rejects.toThrow();
    await expect(fetchStudents(null)).rejects.toThrow();
  });

  it('lança erro quando o fetch falha (não-ok)', async () => {
    mockFetch({ ok: false, status: 403 });
    await expect(fetchStudents('https://docs.google.com/spreadsheets/d/FAIL/edit'))
      .rejects.toThrow();
  });

  it('lança erro quando nenhum dado válido é encontrado', async () => {
    mockFetch();
    // Planilha vazia (só cabeçalho, sem tutorados)
    mockXLSX([
      ['TURMA', 'TUTOR', 'TUTORADO'],
    ]);
    await expect(fetchStudents('https://docs.google.com/spreadsheets/d/EMPTY/edit'))
      .rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchNotes — cobre linhas 186-209
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchNotes', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('retorna array vazio quando URL não é fornecida', async () => {
    const result = await fetchNotes('');
    expect(result).toEqual([]);
  });

  it('retorna array vazio quando URL é null', async () => {
    const result = await fetchNotes(null);
    expect(result).toEqual([]);
  });

  it('processa anotações com campos preenchidos', async () => {
    mockFetch();
    // row[0]=data, row[2..17]=nome, row[18]=teacher, row[19]=tipo
    const header = ['Data', 'x', 'Nome', ...Array(15).fill(''), 'Professor', 'Tipo'];
    const row = ['10/04', '', 'João Silva', ...Array(15).fill(''), 'Prof Ana', 'Tutoria'];
    mockXLSX([header, row]);

    const result = await fetchNotes('https://docs.google.com/spreadsheets/d/NOTES/edit');
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('studentName');
    expect(result[0]).toHaveProperty('teacher');
  });

  it('ignora linhas sem nome de aluno', async () => {
    mockFetch();
    const header = ['Data', 'x', 'Nome', ...Array(15).fill(''), 'Professor', 'Tipo'];
    const rowSemNome = ['10/04', '', '', ...Array(15).fill(''), 'Prof Ana', 'Tutoria'];
    mockXLSX([header, rowSemNome]);

    const result = await fetchNotes('https://docs.google.com/spreadsheets/d/NOTES2/edit');
    expect(result).toEqual([]);
  });

  it('retorna array vazio quando planilha tem só 1 linha', async () => {
    mockFetch();
    mockXLSX([['Só cabeçalho']]);
    const result = await fetchNotes('https://docs.google.com/spreadsheets/d/NOTES3/edit');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchProvas — cobre linhas 213-244
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchProvas', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('retorna array vazio quando URL não é fornecida', async () => {
    const result = await fetchProvas('');
    expect(result).toEqual([]);
  });

  it('processa dados de prova com aluno e nota', async () => {
    mockFetch();
    const header = ['Aluno', 'Resultado', 'Matemática', 'Português'];
    const row = ['João Silva', '72%', '8', '7'];
    mockXLSX([header, row]);

    const result = await fetchProvas('https://docs.google.com/spreadsheets/d/PROVA/edit');
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('normalizedName');
    expect(result[0]).toHaveProperty('resultado');
    expect(result[0]).toHaveProperty('notas');
  });

  it('ignora linhas sem nome de aluno', async () => {
    mockFetch();
    const header = ['Aluno', 'Resultado'];
    const rowSemNome = ['', '80%'];
    mockXLSX([header, rowSemNome]);

    const result = await fetchProvas('https://docs.google.com/spreadsheets/d/PROVA2/edit');
    expect(result).toEqual([]);
  });

  it('retorna array vazio quando planilha tem só cabeçalho', async () => {
    mockFetch();
    mockXLSX([['Aluno', 'Resultado']]);
    const result = await fetchProvas('https://docs.google.com/spreadsheets/d/PROVA3/edit');
    expect(result).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchConceitos — cobre linhas 249-433
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchConceitos', () => {
  let origFetch;

  beforeEach(() => {
    origFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = origFetch;
  });

  it('retorna array vazio quando URL não é fornecida', async () => {
    const result = await fetchConceitos('');
    expect(result).toEqual([]);
  });

  it('lança erro quando o fetch retorna não-ok', async () => {
    mockFetch({ ok: false, status: 500 });
    await expect(fetchConceitos('https://docs.google.com/spreadsheets/d/CONC/edit'))
      .rejects.toThrow('500');
  });

  it('processa aba com cabeçalho ALUNO e dados de notas', async () => {
    mockFetch();
    const sheetData = [
      ['Turma:', '1A'],
      ['Tipo Fechamento:', 'Primeiro Bimestre'],
      ['ALUNO', 'SITUAÇÃO', 'Matemática', 'Português', 'TF', 'FRE%'],
      ['João Silva', 'Ativo', '8', '7', '2', '90%'],
    ];
    const sheetsObj = { 'Turma 1A': {} };
    XLSX.read.mockReturnValue({ SheetNames: ['Turma 1A'], Sheets: sheetsObj });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/CONC2/edit');
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('normalizedName');
    expect(result[0]).toHaveProperty('bimestre');
    expect(result[0]).toHaveProperty('notas');
  });

  it('processa múltiplas abas', async () => {
    mockFetch();
    const sheetData1 = [
      ['ALUNO', 'Matemática'],
      ['Aluno A', '9'],
    ];
    const sheetData2 = [
      ['ALUNO', 'Matemática'],
      ['Aluno B', '7'],
    ];
    const sheetsObj = { 'Aba1': {}, 'Aba2': {} };
    XLSX.read.mockReturnValue({ SheetNames: ['Aba1', 'Aba2'], Sheets: sheetsObj });
    XLSX.utils.sheet_to_json
      .mockReturnValueOnce(sheetData1)
      .mockReturnValueOnce(sheetData2);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/MULTI/edit');
    expect(result).toBeInstanceOf(Array);
  });

  it('ignora abas sem cabeçalho ALUNO', async () => {
    mockFetch();
    const sheetDataSemAluno = [
      ['Título', 'Valor'],
      ['Dado A', '1'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['SemAluno'], Sheets: { SemAluno: {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetDataSemAluno);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/NOALUNO/edit');
    expect(result).toEqual([]);
  });

  it('para de processar linhas quando encontra LEGENDA', async () => {
    mockFetch();
    const sheetData = [
      ['ALUNO', 'Matemática'],
      ['João Silva', '8'],
      ['LEGENDA: MB = Muito Bom', ''],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['Aba1'], Sheets: { Aba1: {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/LEG/edit');
    // Só João Silva deve ser processado (para antes de LEGENDA)
    expect(result.length).toBe(1);
  });

  it('processa aba com sub-cabeçalho (segunda linha vazia)', async () => {
    mockFetch();
    const sheetData = [
      ['ALUNO', 'Mat\nBimestre', 'Port\nBimestre'],
      ['', 'B1', 'B1'],  // segunda linha de sub-header (col 0 vazio)
      ['João Silva', '8', '7'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['Aba1'], Sheets: { Aba1: {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/SUB/edit');
    expect(result).toBeInstanceOf(Array);
  });
});
