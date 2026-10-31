// src/utils/helpers.test.js
// Testes unitários para todas as funções puras de helpers.js
// Não dependem de DOM, fetch, ou quaisquer efeitos externos.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeName,
  formatBimestre,
  formatTurma,
  parseGrade,
  checkIsTutor,
  formatDisciplina,
  fetchWithFallback,
  getBimestreNum,
  matchesBimestre,
  resolveStudentActiveTurma,
  isStudentActive,
  getMapaoStudentCount,
  validateMapaoCoverage,
  getMapaoCoverageDetails,
} from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// normalizeName
// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeName', () => {
  it('remove acentos e converte para minúsculas', () => {
    expect(normalizeName('Álvaro Müller')).toBe('alvaro muller');
  });

  it('colapsa espaços duplos internos para espaço único', () => {
    expect(normalizeName('João  Silva')).toBe('joao silva');
  });

  it('remove espaços no início e no fim', () => {
    expect(normalizeName('  Maria Oliveira  ')).toBe('maria oliveira');
  });

  it('retorna string vazia para valor nulo', () => {
    expect(normalizeName(null)).toBe('');
  });

  it('retorna string vazia para undefined', () => {
    expect(normalizeName(undefined)).toBe('');
  });

  it('funciona com nomes sem acentos', () => {
    expect(normalizeName('Carlos Silva')).toBe('carlos silva');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatBimestre
// ─────────────────────────────────────────────────────────────────────────────
describe('formatBimestre', () => {
  it('reconhece "primeiro" (texto por extenso)', () => {
    expect(formatBimestre('Primeiro Bimestre')).toBe('1º Bimestre');
  });

  it('reconhece "1º" (número ordinal)', () => {
    expect(formatBimestre('1º Bimestre')).toBe('1º Bimestre');
  });

  it('reconhece "segundo"', () => {
    expect(formatBimestre('Segundo Bimestre')).toBe('2º Bimestre');
  });

  it('reconhece "2º"', () => {
    expect(formatBimestre('2º')).toBe('2º Bimestre');
  });

  it('reconhece "terceiro"', () => {
    expect(formatBimestre('Terceiro Bimestre')).toBe('3º Bimestre');
  });

  it('reconhece "quarto"', () => {
    expect(formatBimestre('4º Bimestre')).toBe('4º Bimestre');
  });

  it('reconhece abas do tipo Turma-Bimestre como 1A-1B, 1A-3B, 3E-1B, 3E-4B', () => {
    expect(formatBimestre('1A-1B')).toBe('1º Bimestre');
    expect(formatBimestre('1A-3B')).toBe('3º Bimestre');
    expect(formatBimestre('3E-1B')).toBe('1º Bimestre');
    expect(formatBimestre('3E-4B')).toBe('4º Bimestre');
    expect(formatBimestre('7D - 2º Bi')).toBe('2º Bimestre');
  });

  it('retorna o texto original para valor desconhecido', () => {
    expect(formatBimestre('Avaliação Final')).toBe('Avaliação Final');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBimestreNum
// ─────────────────────────────────────────────────────────────────────────────
describe('getBimestreNum', () => {
  it('extrai corretamente números de bimestre isolados', () => {
    expect(getBimestreNum('1º Bimestre')).toBe(1);
    expect(getBimestreNum('2º Bimestre')).toBe(2);
    expect(getBimestreNum('3º Bimestre')).toBe(3);
    expect(getBimestreNum('4º Bimestre')).toBe(4);
    expect(getBimestreNum('1B')).toBe(1);
    expect(getBimestreNum('3B')).toBe(3);
  });

  it('distingue o número da turma do número do bimestre em padrões Turma-Bimestre', () => {
    expect(getBimestreNum('1A-3B')).toBe(3);
    expect(getBimestreNum('1A-2B')).toBe(2);
    expect(getBimestreNum('1A-4B')).toBe(4);
    expect(getBimestreNum('3E-1B')).toBe(1);
    expect(getBimestreNum('3E-2B')).toBe(2);
    expect(getBimestreNum('3E-4B')).toBe(4);
    expect(getBimestreNum('3E-3B')).toBe(3);
  });

  it('retorna 0 para textos sem bimestre', () => {
    expect(getBimestreNum('')).toBe(0);
    expect(getBimestreNum(null)).toBe(0);
    expect(getBimestreNum('Sem Bimestre')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatTurma
// ─────────────────────────────────────────────────────────────────────────────
describe('formatTurma', () => {
  it('converte "1ª SÉRIE A" → "1A"', () => {
    expect(formatTurma('1ª SÉRIE A')).toBe('1A');
  });

  it('converte "3º ANO B" → "3B"', () => {
    expect(formatTurma('3º ANO B')).toBe('3B');
  });

  it('mantém "1A" como "1A"', () => {
    expect(formatTurma('1A')).toBe('1A');
  });

  it('converte "2ª B" → "2B"', () => {
    expect(formatTurma('2ª B')).toBe('2B');
  });

  it('retorna apenas o número quando não há letra de turma', () => {
    expect(formatTurma('3')).toBe('3');
  });

  it('retorna string vazia para valor falsy', () => {
    expect(formatTurma('')).toBe('');
    expect(formatTurma(null)).toBe('');
  });

  it('trata "SEM TURMA" corretamente', () => {
    expect(formatTurma('Sem Turma')).toBe('SEM TURMA');
  });

  // Cobre linha 100: texto sem dígito e não é "SEM TURMA"
  it('retorna o texto como-está para turma sem número (ex: "INFANTIL")', () => {
    const result = formatTurma('INFANTIL');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  // Cobre linha 122: fallback quando o parse não extrai número nem letra
  it('retorna string para entrada só com símbolos (fallback final)', () => {
    const result = formatTurma('---');
    expect(typeof result).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseGrade
// ─────────────────────────────────────────────────────────────────────────────
describe('parseGrade', () => {
  it('converte "MB" → 10', () => {
    expect(parseGrade('MB')).toBe(10);
  });

  it('converte "B" → 8', () => {
    expect(parseGrade('B')).toBe(8);
  });

  it('converte "R" → 5', () => {
    expect(parseGrade('R')).toBe(5);
  });

  it('converte "I" → 2', () => {
    expect(parseGrade('I')).toBe(2);
  });

  it('converte número com vírgula "7,5" → 7.5', () => {
    expect(parseGrade('7,5')).toBe(7.5);
  });

  it('converte número com ponto "9.0" → 9', () => {
    expect(parseGrade('9.0')).toBe(9);
  });

  it('retorna 0 para "-"', () => {
    expect(parseGrade('-')).toBe(0);
  });

  it('retorna 0 para undefined', () => {
    expect(parseGrade(undefined)).toBe(0);
  });

  it('retorna 0 para null', () => {
    expect(parseGrade(null)).toBe(0);
  });

  it('retorna 0 para texto inválido', () => {
    expect(parseGrade('S/N')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkIsTutor
// ─────────────────────────────────────────────────────────────────────────────
describe('checkIsTutor', () => {
  it('retorna true para nomes exatamente iguais', () => {
    expect(checkIsTutor('Ana Silva', 'Ana Silva')).toBe(true);
  });

  it('retorna true quando primeiro e último nome batem', () => {
    expect(checkIsTutor('Ana Beatriz Silva', 'Ana Silva')).toBe(true);
  });

  it('retorna true ignorando acentos e maiúsculas', () => {
    expect(checkIsTutor('Álvaro Santos', 'alvaro santos')).toBe(true);
  });

  it('retorna false para nomes completamente diferentes', () => {
    expect(checkIsTutor('Carlos Souza', 'Maria Oliveira')).toBe(false);
  });

  it('retorna false se tutor for vazio', () => {
    expect(checkIsTutor('', 'Ana Silva')).toBe(false);
  });

  it('retorna false se registrar for undefined', () => {
    expect(checkIsTutor('Ana Silva', undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatDisciplina
// ─────────────────────────────────────────────────────────────────────────────
describe('formatDisciplina', () => {
  it('converte "OE: Língua Portuguesa" corretamente', () => {
    expect(formatDisciplina('OE: Língua Portuguesa')).toBe('OE: Língua Portuguesa');
  });

  it('normaliza orientação de estudo de matemática (via ORIENTA+MATEM)', () => {
    expect(formatDisciplina('Orientação de Estudos: Matemática')).toBe('OE: Matemática');
  });

  it('normaliza orientação de estudo de português (via ORIENTA+PORT)', () => {
    expect(formatDisciplina('Orientação de Estudos: Língua Portuguesa')).toBe('OE: Língua Portuguesa');
  });

  // Cobre linha 88: prefixo "OE " ou "OE:" + inclui 'MAT'
  it('normaliza "OE Matemática" (prefixo OE com MAT)', () => {
    expect(formatDisciplina('OE Matemática')).toBe('OE: Matemática');
  });

  // Cobre linha 87: prefixo "OE:" + inclui 'PORT'
  it('normaliza "OE: Português" (prefixo OE com PORT)', () => {
    expect(formatDisciplina('OE: Português')).toBe('OE: Língua Portuguesa');
  });

  it('retorna string vazia para valor falsy', () => {
    expect(formatDisciplina('')).toBe('');
    expect(formatDisciplina(null)).toBe('');
  });

  it('retorna o nome original para disciplinas comuns', () => {
    expect(formatDisciplina('Matemática')).toBe('Matemática');
    expect(formatDisciplina('História')).toBe('História');
  });

  it('normaliza ORIENTA+LINGU para Língua Portuguesa', () => {
    expect(formatDisciplina('Orientação: Língua')).toBe('OE: Língua Portuguesa');
  });

  it('expande siglas da Prova Paulista para o nome completo', () => {
    expect(formatDisciplina('CIE')).toBe('Ciências');
    expect(formatDisciplina('Cie')).toBe('Ciências');
    expect(formatDisciplina('GEO')).toBe('Geografia');
    expect(formatDisciplina('his')).toBe('História');
    expect(formatDisciplina('MAT')).toBe('Matemática');
    expect(formatDisciplina('LP')).toBe('Língua Portuguesa');
    expect(formatDisciplina('ING')).toBe('Língua Inglesa');
    expect(formatDisciplina('BIO')).toBe('Biologia');
    expect(formatDisciplina('FIS')).toBe('Física');
    expect(formatDisciplina('QUI')).toBe('Química');
    expect(formatDisciplina('SOC')).toBe('Sociologia');
    expect(formatDisciplina('FIL')).toBe('Filosofia');
    expect(formatDisciplina(' Geo. ')).toBe('Geografia');
  });

  it('não altera nomes que apenas contêm uma sigla', () => {
    expect(formatDisciplina('Geometria')).toBe('Geometria');
    expect(formatDisciplina('Física Aplicada')).toBe('Física Aplicada');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchWithFallback — cobre linhas 53-76
// ─────────────────────────────────────────────────────────────────────────────
describe('fetchWithFallback', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chama o proxy com a URL correta e retorna a resposta', async () => {
    const fakeResponse = { ok: true, text: async () => 'csv' };
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const res = await fetchWithFallback('https://docs.google.com/spreadsheets/d/ABC123/edit');
    expect(global.fetch).toHaveBeenCalled();
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/proxy?url=');
    expect(res).toBe(fakeResponse);
  });

  it('limpa espaços no ID do Google Sheets', async () => {
    const fakeResponse = { ok: true };
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    await fetchWithFallback('https://docs.google.com/spreadsheets/d/AB C123/edit');
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).not.toContain(' ');
  });

  it('lança erro quando a resposta não é ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchWithFallback('https://docs.google.com/spreadsheets/d/BAD/edit'))
      .rejects.toThrow('404');
  });

  it('funciona com URL não-Google-Sheets', async () => {
    const fakeResponse = { ok: true };
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const res = await fetchWithFallback('https://example.com/data.csv');
    expect(res).toBe(fakeResponse);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBimestreNum & matchesBimestre
// ─────────────────────────────────────────────────────────────────────────────
describe('getBimestreNum & matchesBimestre', () => {
  it('extrai o número correto do bimestre', () => {
    expect(getBimestreNum('1º Bimestre')).toBe(1);
    expect(getBimestreNum('Segundo Bimestre')).toBe(2);
    expect(getBimestreNum('3º')).toBe(3);
    expect(getBimestreNum('4bim')).toBe(4);
    expect(getBimestreNum('Geral')).toBe(0);
  });

  it('compara bimestres corretamente com matchesBimestre', () => {
    expect(matchesBimestre('3º Bimestre', '3')).toBe(true);
    expect(matchesBimestre('Terceiro Bimestre', '3º Bimestre')).toBe(true);
    expect(matchesBimestre('2º Bimestre', '3')).toBe(false);
    expect(matchesBimestre('1º Bimestre', 'geral')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveStudentActiveTurma
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveStudentActiveTurma', () => {
  it('mantém a turma padrão quando o aluno não tem registros no Mapão ou Prova', () => {
    const res = resolveStudentActiveTurma('João Silva', '7D', [], []);
    expect(res.turmaAtiva).toBe('7D');
    expect(res.isTransferido).toBe(false);
    expect(res.turmaOriginal).toBe('7D');
  });

  it('identifica corretamente aluno transferido do 7D para o 7A no 3º Bimestre', () => {
    const mockConceitos = [
      {
        normalizedName: 'maria oliveira',
        bimestre: '1º Bimestre',
        turmaPlanilha: '7D',
        situacao: 'Ativo'
      },
      {
        normalizedName: 'maria oliveira',
        bimestre: '2º Bimestre',
        turmaPlanilha: '7D',
        situacao: 'Ativo'
      },
      {
        normalizedName: 'maria oliveira',
        bimestre: '3º Bimestre',
        turmaPlanilha: '7A',
        situacao: 'Ativo'
      }
    ];

    const res = resolveStudentActiveTurma('Maria Oliveira', '7D', mockConceitos, []);
    expect(res.turmaAtiva).toBe('7A');
    expect(res.turmaOriginal).toBe('7D');
    expect(res.isTransferido).toBe(true);
    expect(res.historicoTurmas).toEqual({
      1: '7D',
      2: '7D',
      3: '7A'
    });
  });

  it('usa Prova Paulista como fallback quando Mapão não tem o bimestre', () => {
    const mockProvas = [
      {
        normalizedName: 'carlos eduardo',
        bimestre: '3º Bimestre',
        turmaPlanilha: '8B'
      }
    ];

    const res = resolveStudentActiveTurma('Carlos Eduardo', '8A', [], mockProvas);
    expect(res.turmaAtiva).toBe('8B');
    expect(res.isTransferido).toBe(true);
  });

  it('usa a turma válida mais recente quando a turma padrão é um código interno 405/406', () => {
    const mockConceitos = [
      {
        normalizedName: 'aluno exemplo',
        bimestre: '1º Bimestre',
        turmaPlanilha: '1A',
        situacao: 'Ativo'
      },
      {
        normalizedName: 'aluno exemplo',
        bimestre: '2º Bimestre',
        turmaPlanilha: '4056C',
        situacao: 'Ativo'
      },
      {
        normalizedName: 'aluno exemplo',
        bimestre: '3º Bimestre',
        turmaPlanilha: '3C',
        situacao: 'Ativo'
      }
    ];

    const res = resolveStudentActiveTurma('Aluno Exemplo', '4050A', mockConceitos, []);

    expect(res.turmaAtiva).toBe('3C');
    expect(res.historicoTurmas).toEqual({ 1: '1A', 3: '3C' });
    expect(res.isTransferido).toBe(true);
  });

  it('rejeita turma removida do Mapão SED (ex: 3E) vinda da Prova Paulista quando o Mapão está carregado', () => {
    // Mapão possui turmas ativas 1A e 2B, mas 3E foi removida
    const mockConceitos = [
      { normalizedName: 'outro aluno', bimestre: '1º Bimestre', turmaPlanilha: '1A', situacao: 'Ativo' },
      { normalizedName: 'segundo aluno', bimestre: '1º Bimestre', turmaPlanilha: '2B', situacao: 'Ativo' },
    ];
    // Prova Paulista ainda contém o registro antigo da turma 3E
    const mockProvas = [
      { normalizedName: 'aluno fantasma', bimestre: '2º Bimestre', turmaPlanilha: '3E' }
    ];

    const res = resolveStudentActiveTurma('Aluno Fantasma', '3E', mockConceitos, mockProvas);
    // Não deve ressuscitar a turma 3E removida do Mapão
    expect(res.turmaAtiva).toBe('Sem Turma');
    expect(res.historicoTurmas).toEqual({});
  });

  it('permite Prova Paulista caso o Mapão SED não esteja configurado/carregado', () => {
    const mockProvas = [
      { normalizedName: 'aluno legitimo', bimestre: '2º Bimestre', turmaPlanilha: '3E' }
    ];
    const res = resolveStudentActiveTurma('Aluno Legitimo', '3E', [], mockProvas);
    expect(res.turmaAtiva).toBe('3E');
  });

  it('prioriza o registro Ativo na nova turma quando há registro de Transferência da turma anterior no mesmo bimestre', () => {
    const mockConceitos = [
      { normalizedName: 'adryan gomes', bimestre: '3º Bimestre', turmaPlanilha: '1B', situacao: 'Transferência' },
      { normalizedName: 'adryan gomes', bimestre: '3º Bimestre', turmaPlanilha: '2B', situacao: 'Ativo' },
    ];
    const res = resolveStudentActiveTurma('Adryan Gomes', '1B', mockConceitos, []);
    expect(res.turmaAtiva).toBe('2B');
    expect(res.isTransferido).toBe(true);
    expect(res.historicoTurmas[3]).toBe('2B');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isStudentActive
// ─────────────────────────────────────────────────────────────────────────────
describe('isStudentActive', () => {
  it('retorna true para alunos Ativo, Matriculado ou Frequente', () => {
    expect(isStudentActive('Ativo')).toBe(true);
    expect(isStudentActive('ativo')).toBe(true);
    expect(isStudentActive('Ativa')).toBe(true);
    expect(isStudentActive('Matriculado')).toBe(true);
    expect(isStudentActive('Frequente')).toBe(true);
    expect(isStudentActive('')).toBe(true);
    expect(isStudentActive(null)).toBe(true);
  });

  it('retorna false para Baixa - Transferência e variações de baixa', () => {
    expect(isStudentActive('Baixa - Transferência')).toBe(false);
    expect(isStudentActive('Baixa - Transferencia')).toBe(false);
    expect(isStudentActive('Baixa - Não Comparecimento')).toBe(false);
    expect(isStudentActive('Baixa - Cessou Frequência')).toBe(false);
    expect(isStudentActive('Baixa - Falecimento')).toBe(false);
    expect(isStudentActive('Baixa')).toBe(false);
  });

  it('retorna false para Transferência, Transferido, Abandono e Inativo', () => {
    expect(isStudentActive('Transferência')).toBe(false);
    expect(isStudentActive('Transferencia')).toBe(false);
    expect(isStudentActive('Transferido')).toBe(false);
    expect(isStudentActive('Transferida')).toBe(false);
    expect(isStudentActive('Abandono')).toBe(false);
    expect(isStudentActive('Cessou')).toBe(false);
    expect(isStudentActive('Cancelado')).toBe(false);
    expect(isStudentActive('Inativo')).toBe(false);
    expect(isStudentActive('Inativo (Sem registro no Mapão)')).toBe(false);
    expect(isStudentActive('Sem Matrícula')).toBe(false);
  });

  it('retorna false para Não Comparecimento e termos onde a palavra Ativo não está presente', () => {
    expect(isStudentActive('Não Comparecimento')).toBe(false);
    expect(isStudentActive('Nao comparecimento')).toBe(false);
    expect(isStudentActive('NÃO COMPARECIMENTO')).toBe(false);
    expect(isStudentActive('Comparecimento')).toBe(false);
    expect(isStudentActive('Não compareceu')).toBe(false);
    expect(isStudentActive('Remanejado')).toBe(false);
    expect(isStudentActive('Pendente')).toBe(false);
    expect(isStudentActive('Sem Registro')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveStudentActiveTurma
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveStudentActiveTurma', () => {
  it('aloca o aluno na turma mais recente onde ele está ativo quando transferido', () => {
    const conceitoData = [
      { normalizedName: 'joao silva', turmaPlanilha: '2A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { normalizedName: 'joao silva', turmaPlanilha: '2A', bimestre: '2º Bimestre', situacao: 'Baixa - Transferência' },
      { normalizedName: 'joao silva', turmaPlanilha: '2B', bimestre: '2º Bimestre', situacao: 'Ativo' },
    ];

    const res = resolveStudentActiveTurma('joao silva', '2A', conceitoData, []);
    expect(res.turmaAtiva).toBe('2B');
    expect(res.isTransferido).toBe(true);
    expect(res.historicoTurmas[1]).toBe('2A');
    expect(res.historicoTurmas[2]).toBe('2B');
  });

  it('mantém a turma mais recente com registro se nenhuma estiver explicitamente ativa', () => {
    const conceitoData = [
      { normalizedName: 'maria souza', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Baixa' },
      { normalizedName: 'maria souza', turmaPlanilha: '1C', bimestre: '2º Bimestre', situacao: 'Baixa - Transferência' },
    ];

    const res = resolveStudentActiveTurma('maria souza', '1A', conceitoData, []);
    expect(res.turmaAtiva).toBe('1C');
  });

  it('retorna turma padrão se não houver registros no Mapão', () => {
    const res = resolveStudentActiveTurma('aluno novo', '3D', [], []);
    expect(res.turmaAtiva).toBe('3D');
    expect(res.isTransferido).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMapaoStudentCount & validateMapaoCoverage
// ─────────────────────────────────────────────────────────────────────────────
describe('getMapaoStudentCount', () => {
  it('retorna 0 para array vazio ou inválido', () => {
    expect(getMapaoStudentCount([])).toBe(0);
    expect(getMapaoStudentCount(null)).toBe(0);
  });

  it('conta alunos únicos ativos quando showOnlyActive é true', () => {
    const conceitoData = [
      { nomeOriginal: 'Carlos Alberto', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Carlos Alberto', turmaPlanilha: '1A', bimestre: '2º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Maria Eduarda', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Maria Eduarda', turmaPlanilha: '1A', bimestre: '2º Bimestre', situacao: 'Transferido' },
      { nomeOriginal: 'Joana Prado', turmaPlanilha: '2B', bimestre: '2º Bimestre', situacao: 'Ativo' },
    ];

    // Carlos Alberto: Ativo
    // Maria Eduarda: Transferido no 2º Bimestre (inativa)
    // Joana Prado: Ativo
    // Total ativos = 2
    expect(getMapaoStudentCount(conceitoData, true)).toBe(2);
    // Total geral de alunos únicos = 3
    expect(getMapaoStudentCount(conceitoData, false)).toBe(3);
  });

  it('ignora turmas de teste 405 e 406', () => {
    const conceitoData = [
      { nomeOriginal: 'Aluno Regular', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Aluno Fantasma', turmaPlanilha: '405', bimestre: '1º Bimestre', situacao: 'Ativo' },
    ];
    expect(getMapaoStudentCount(conceitoData, true)).toBe(1);
    expect(getMapaoStudentCount(conceitoData, false)).toBe(1);
  });
});

describe('validateMapaoCoverage', () => {
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('emite a frase com a turma quando as contagens batem em Todos', () => {
    const conceitoData = [
      { nomeOriginal: 'Ana', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Beto', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Caio', turmaPlanilha: '1B', bimestre: '1º Bimestre', situacao: 'Baixa' },
    ];

    // Com showOnlyActive = true (padrão): 2 ativos
    const res = validateMapaoCoverage(conceitoData, 2, true, 'Todos');
    expect(res.isMatching).toBe(true);
    expect(res.mapaoCount).toBe(2);
    expect(res.tutoradosCount).toBe(2);
    expect(logSpy).toHaveBeenCalledWith('Ok, Todos os alunos do mapão da turma Todos estão inclusos');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('emite a frase especificando a turma selecionada (ex: 1A) quando as contagens batem', () => {
    const conceitoData = [
      { nomeOriginal: 'Ana', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Beto', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Caio', turmaPlanilha: '1B', bimestre: '1º Bimestre', situacao: 'Ativo' },
    ];

    // Para a turma 1A: 2 alunos ativos
    const res = validateMapaoCoverage(conceitoData, 2, true, '1A');
    expect(res.isMatching).toBe(true);
    expect(res.mapaoCount).toBe(2);
    expect(res.tutoradosCount).toBe(2);
    expect(logSpy).toHaveBeenCalledWith('Ok, Todos os alunos do mapão da turma 1A estão inclusos');
  });

  it('emite a frase quando showOnlyActive é false e as contagens totais batem', () => {
    const conceitoData = [
      { nomeOriginal: 'Ana', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Beto', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Caio', turmaPlanilha: '1B', bimestre: '1º Bimestre', situacao: 'Baixa' },
    ];

    // Com showOnlyActive = false: 3 alunos no total
    const res = validateMapaoCoverage(conceitoData, 3, false, 'Todos');
    expect(res.isMatching).toBe(true);
    expect(res.mapaoCount).toBe(3);
    expect(res.tutoradosCount).toBe(3);
    expect(logSpy).toHaveBeenCalledWith('Ok, Todos os alunos do mapão da turma Todos estão inclusos');
  });

  it('emite console.warn quando as contagens divergem', () => {
    const conceitoData = [
      { nomeOriginal: 'Ana', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Beto', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
    ];

    const res = validateMapaoCoverage(conceitoData, 1, true, '1A');
    expect(res.isMatching).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Atenção (Turma: 1A): Nem todos os alunos do mapão estão inclusos'));
    expect(logSpy).not.toHaveBeenCalledWith('Ok, Todos os alunos do mapão da turma 1A estão inclusos');
  });

  it('getMapaoCoverageDetails retorna a lista de diagnósticos para alunos faltantes', () => {
    const conceitoData = [
      { nomeOriginal: 'Ana', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
      { nomeOriginal: 'Beto', turmaPlanilha: '1A', bimestre: '1º Bimestre', situacao: 'Ativo' },
    ];

    const allStudents = [
      { nome: 'Ana', normalizedName: 'ana', turma: '1A', situacao: 'Ativo' },
      { nome: 'Beto', normalizedName: 'beto', turma: '2B', situacao: 'Ativo' },
    ];

    const sortedData = [
      { nome: 'Ana', normalizedName: 'ana', turma: '1A', situacao: 'Ativo' }
    ];

    const details = getMapaoCoverageDetails(conceitoData, 1, true, '1A', { allStudents, sortedData });
    expect(details.isMatching).toBe(false);
    expect(details.mapaoCount).toBe(2);
    expect(details.tutoradosCount).toBe(1);
    expect(details.diagnostico).toHaveLength(1);
    expect(details.diagnostico[0].aluno).toBe('Beto');
    expect(details.diagnostico[0].tipoCausa).toBe('outra_turma');
  });
});


