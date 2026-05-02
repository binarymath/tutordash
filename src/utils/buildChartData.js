import { formatDisciplina, parseGrade, toScale10 } from './helpers';

const getLatestConceitoBimestre = (studentProfile) => {
  const historico = studentProfile?.historicoConceitos || [];
  return historico.length > 0 ? historico[historico.length - 1] : null;
};

export const buildChartDataMapao = (studentProfile, conceitoData = [], provaData = [], allStudents = []) => {
  void provaData;
  void allStudents;

  const ultimoBimestre = getLatestConceitoBimestre(studentProfile);
  if (!ultimoBimestre?.notas) return [];

  const turmaAlunos = conceitoData.filter(
    (aluno) => aluno.bimestre === ultimoBimestre.bimestre && aluno.turmaPlanilha === ultimoBimestre.turmaPlanilha
  );

  return Object.entries(ultimoBimestre.notas).map(([disciplina, notaRaw]) => {
    const notaAluno = parseGrade(notaRaw);
    let soma = 0;
    let count = 0;

    turmaAlunos.forEach((aluno) => {
      if (aluno.notas?.[disciplina] !== undefined) {
        const nota = parseGrade(aluno.notas[disciplina]);
        if (nota > 0 || aluno.notas[disciplina] !== '-') {
          soma += nota;
          count += 1;
        }
      }
    });

    const displaySub = formatDisciplina(disciplina);
    const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;

    return {
      subject: shortName,
      fullSubject: displaySub,
      Aluno: notaAluno,
      Turma: count > 0 ? parseFloat((soma / count).toFixed(1)) : 0,
    };
  });
};

export const buildChartDataProva = (studentProfile, conceitoData = [], provaData = [], allStudents = []) => {
  void conceitoData;

  if (!studentProfile?.provaPaulistaNotas) return [];

  const studentsByName = new Map((allStudents || []).map((student) => [student.normalizedName, student]));
  const sameTurma = provaData.filter((provaAluno) => {
    const aluno = studentsByName.get(provaAluno.normalizedName);
    return aluno && aluno.turma === studentProfile.turma;
  });

  return Object.entries(studentProfile.provaPaulistaNotas)
    .map(([disciplina, notaRaw]) => {
      const notaAluno = toScale10(notaRaw);
      if (notaAluno === null) return null;

      let soma = 0;
      let count = 0;

      sameTurma.forEach((colega) => {
        const nota = toScale10(colega.notas?.[disciplina]);
        if (nota !== null) {
          soma += nota;
          count += 1;
        }
      });

      const displaySub = formatDisciplina(disciplina);
      const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;

      return {
        subject: shortName,
        fullSubject: displaySub,
        Aluno: Math.round(notaAluno * 100) / 100,
        Turma: count > 0 ? Math.round((soma / count) * 100) / 100 : 0,
      };
    })
    .filter(Boolean);
};

export const buildStudentChartData = (studentProfile, conceitoData = [], provaData = [], allStudents = []) => ({
  chartDataMapao: buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents),
  chartDataProva: buildChartDataProva(studentProfile, conceitoData, provaData, allStudents),
});