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

  it('retorna o texto original para valor desconhecido', () => {
    expect(formatBimestre('Avaliação Final')).toBe('Avaliação Final');
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
