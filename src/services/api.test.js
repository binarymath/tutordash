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
    const grupo2B = result.find(g => g.turma === '2B' && g.tutor === 'Prof Carlos');
    expect(grupo2B).toBeDefined();
    expect(grupo2B.tutorados).toContain('Pedro Santos');
    expect(grupo2B.tutorados).toContain('Lucia Ferreira');
  });

  it('herda a turma da linha anterior quando célula vazia', () => {
    const result = parsePlanilhaTutoriaMedio(csvComHeader);
    const grupoHerdado = result.find(g => g.tutorados.includes('Maria Oliveira'));
    expect(grupoHerdado).toBeDefined();
    expect(grupoHerdado.turma).toBe('1A');
  });

  it('não herda o tutor da linha anterior quando célula vazia, atribuindo "Sem Tutor"', () => {
    const result = parsePlanilhaTutoriaMedio(csvComHeader);
    const grupoSemTutor = result.find(g => g.tutor === 'Sem Tutor');
    expect(grupoSemTutor).toBeDefined();
    expect(grupoSemTutor.tutorados).toContain('Maria Oliveira');
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

  it('processa abas com nome no padrão Turma-Bimestre (ex: 3E-1B e 3E-3B) e coluna Nº na col 0', async () => {
    mockFetch();
    const sheetData = [
      ['Nº', 'ALUNO', 'Matemática', 'Português', 'TF', 'Frequência'],
      ['1', 'Aluno Um', '8,0', '7,5', '0', '100%'],
      ['2', 'Aluno Dois', '6,5', '5,0', '2', '95%'],
      ['3', 'Aluno Tres', '9,0', '8,5', '1', '98%'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['3E-3B'], Sheets: { '3E-3B': {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/MAPAO/edit');
    expect(result).toHaveLength(3);
    expect(result[0].turmaPlanilha).toBe('3E');
    expect(result[0].bimestre).toBe('3º Bimestre');
    expect(result[0].nomeOriginal).toBe('Aluno Um');
    expect(result[0].situacao).toBe('Ativo');
    expect(result[1].nomeOriginal).toBe('Aluno Dois');
    expect(result[2].nomeOriginal).toBe('Aluno Tres');
  });

  it('não aborta a leitura se houver linha vazia intermediária e não mascara situacao com nota', async () => {
    mockFetch();
    const sheetData = [
      ['ALUNO', 'Matemática', 'Português'],
      ['Carlos Silva', '7,0', '6,0'],
      ['', '', ''], // linha vazia
      ['Mariana Souza', '8,5', '9,0'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['1A-1B'], Sheets: { '1A-1B': {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/BLANK/edit');
    expect(result).toHaveLength(2);
    expect(result[0].nomeOriginal).toBe('Carlos Silva');
    expect(result[0].situacao).toBe('Ativo');
    expect(result[1].nomeOriginal).toBe('Mariana Souza');
    expect(result[1].situacao).toBe('Ativo');
  });

  it('não aborta a leitura se houver linha intermediária com C - ou quebra de página', async () => {
    mockFetch();
    const sheetData = [
      ['Nº', 'ALUNO', 'RA', 'Matemática'],
      ['1', 'Aluno Um', '12345678-1', '8,0'],
      ['2', 'Aluno Dois', '12345678-2', '7,0'],
      ['3', 'Aluno Tres', '12345678-3', '9,0'],
      ['4', 'Aluno Quatro', '12345678-4', '6,0'],
      ['5', 'C - Cessou Frequência', '', ''],
      ['6', 'Aluno Seis', '12345678-6', '8,5'],
      ['7', 'Aluno Sete', '12345678-7', '7,5'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['3E-3B'], Sheets: { '3E-3B': {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/CLASS_WITH_C/edit');
    expect(result).toHaveLength(6);
    expect(result.map(r => r.nomeOriginal)).toEqual([
      'Aluno Um', 'Aluno Dois', 'Aluno Tres', 'Aluno Quatro', 'Aluno Seis', 'Aluno Sete'
    ]);
  });

  it('extrai corretamente Não Comparecimento ou Ativo na coluna à frente do nome do aluno', async () => {
    mockFetch();
    const sheetData = [
      ['Nº', 'ALUNO', 'SITUAÇÃO', 'Matemática', 'TF', 'Frequência'],
      ['1', 'Aluno Um', 'Ativo', '8,0', '0', '100%'],
      ['2', 'Aluno Ausente', 'Não Comparecimento', '-', '10', '0%'],
      ['3', 'Aluno Transferido', 'Baixa - Transferência', '-', '5', '50%'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['3E-3B'], Sheets: { '3E-3B': {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/MAPAO_SITUACOES/edit');
    expect(result).toHaveLength(3);
    expect(result[0].nomeOriginal).toBe('Aluno Um');
    expect(result[0].situacao).toBe('Ativo');
    expect(result[1].nomeOriginal).toBe('Aluno Ausente');
    expect(result[1].situacao).toBe('Não Comparecimento');
    expect(result[2].nomeOriginal).toBe('Aluno Transferido');
    expect(result[2].situacao).toBe('Baixa - Transferência');
    // Garante que SITUAÇÃO não virou disciplina
    expect(result[0].notas['SITUAÇÃO']).toBeUndefined();
    expect(result[1].notas['SITUAÇÃO']).toBeUndefined();
  });

  it('extrai corretamente a turma e notas quando o cabeçalho possui Turma: 3ª SERIE E INTEGRAL e Tipo Fechamer', async () => {
    mockFetch();
    const sheetData = [
      ['Registro e Controle do Rendimento Escolar'],
      ['Ano Letivo:', '', '', '', '2026'],
      ['Diretoria:', 'Sorocaba'],
      ['Escola:', 'Marco Antonio Mencacci Professor'],
      ['Tipo de Ensino', '101 - NOVO ENSINO MÉDIO'],
      ['Turma:', '3ª SERIE E INTEGRAL 7H T2 ANUAL'],
      ['Tipo Fechamer', 'Conselho Terceiro Bimestre'],
      ['Total de Aulas', '', '', '', '632'],
      ['Total de Aulas', '278 (Soma de todas as eletivas)'],
      [''],
      ['ALUNO', 'SITUAÇÃO', 'APROFUNDAMENTO DE FILOSOFIA 9921', '', '', 'APROFUNDAMENTO DE GEOGRAFIA 9920'],
      ['', '', 'M', 'F', 'AC', 'M', 'F'],
      ['ANA JULYA DINIZ SANTOS', 'Ativo', '5', '0', '0', '5', '0'],
      ['CARLA ELOISA SILVA', 'Ativo', '9', '0', '0', '10', '0'],
      ['MURILO OSMAR', 'Não Comparecimento', '-', '0', '0', '-', '0'],
    ];
    XLSX.read.mockReturnValue({ SheetNames: ['3ª SERIE E'], Sheets: { '3ª SERIE E': {} } });
    XLSX.utils.sheet_to_json.mockReturnValue(sheetData);

    const result = await fetchConceitos('https://docs.google.com/spreadsheets/d/SED_EXACT_LAYOUT/edit');
    expect(result).toHaveLength(3);
    expect(result[0].turmaPlanilha).toBe('3E');
    expect(result[0].bimestre).toBe('3º Bimestre');
    expect(result[0].nomeOriginal).toBe('ANA JULYA DINIZ SANTOS');
    expect(result[0].situacao).toBe('Ativo');
    expect(result[1].turmaPlanilha).toBe('3E');
    expect(result[1].bimestre).toBe('3º Bimestre');
    expect(result[1].nomeOriginal).toBe('CARLA ELOISA SILVA');
    expect(result[1].situacao).toBe('Ativo');
    expect(result[2].turmaPlanilha).toBe('3E');
    expect(result[2].nomeOriginal).toBe('MURILO OSMAR');
    expect(result[2].situacao).toBe('Não Comparecimento');
  });
});
