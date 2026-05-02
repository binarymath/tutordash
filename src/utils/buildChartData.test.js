import { describe, it, expect } from 'vitest';

import { buildChartDataMapao, buildChartDataProva } from './buildChartData';

const studentProfile = {
  nome: 'João Silva',
  turma: '1A',
  historicoConceitos: [
    {
      bimestre: '1º Bimestre',
      turmaPlanilha: '1A',
      notas: {
        Matemática: '8',
        Português: '7',
      },
    },
  ],
  provaPaulistaNotas: {
    Matemática: '0.8',
    Português: '0.7',
  },
};

const conceitoData = [
  {
    bimestre: '1º Bimestre',
    turmaPlanilha: '1A',
    normalizedName: 'joao silva',
    notas: {
      Matemática: '8',
      Português: '7',
    },
  },
  {
    bimestre: '1º Bimestre',
    turmaPlanilha: '1A',
    normalizedName: 'maria oliveira',
    notas: {
      Matemática: '6',
      Português: '5',
    },
  },
];

const provaData = [
  {
    normalizedName: 'joao silva',
    notas: {
      Matemática: '0.8',
      Português: '0.7',
    },
  },
  {
    normalizedName: 'maria oliveira',
    notas: {
      Matemática: '0.6',
      Português: '0.5',
    },
  },
];

const allStudents = [
  { normalizedName: 'joao silva', turma: '1A' },
  { normalizedName: 'maria oliveira', turma: '1A' },
];

describe('buildChartData', () => {
  it('gera dados do Mapão com média da turma', () => {
    const result = buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      subject: 'Matemática',
      fullSubject: 'Matemática',
      Aluno: 8,
      Turma: 7,
    });
  });

  it('gera dados da Prova Paulista na escala 0-10', () => {
    const result = buildChartDataProva(studentProfile, conceitoData, provaData, allStudents);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      subject: 'Matemática',
      fullSubject: 'Matemática',
      Aluno: 8,
      Turma: 7,
    });
  });
});