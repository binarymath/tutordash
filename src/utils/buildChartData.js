import { formatDisciplina, parseGrade, toScale10, getSerieFromTurma } from './helpers';

const getConceitoBimestre = (studentProfile, targetBimestre) => {
  const historico = studentProfile?.historicoConceitos || [];
  if (targetBimestre && targetBimestre !== 'ultimo') {
    return historico.find(h => h.bimestre === targetBimestre) || null;
  }
  return historico.length > 0 ? historico[historico.length - 1] : null;
};

const getProvaBimestre = (studentProfile, targetBimestre) => {
  const historico = studentProfile?.historicoProvas || [];
  if (targetBimestre && targetBimestre !== 'ultimo') {
    return historico.find(h => h.bimestre === targetBimestre) || null;
  }
  return historico.length > 0 ? historico[historico.length - 1] : null;
};

export const buildChartDataMapao = (studentProfile, conceitoData = [], provaData = [], allStudents = [], targetBimestre = 'ultimo') => {
  void provaData;
  void allStudents;

  if (targetBimestre === 'evolucao') {
    const historico = studentProfile?.historicoConceitos || [];
    if (historico.length === 0) return [];

    const discMap = new Map();
    const studentBims = new Set();
    historico.forEach(b => {
      studentBims.add(b.bimestre);
      Object.entries(b.notas || {}).forEach(([disc, notaRaw]) => {
        const notaAluno = parseGrade(notaRaw);
        if (notaAluno > 0 || (notaRaw && notaRaw !== '-')) {
          if (!discMap.has(disc)) discMap.set(disc, { alunoSum: 0, alunoCnt: 0 });
          const item = discMap.get(disc);
          if (notaAluno > 0) {
            item.alunoSum += notaAluno;
            item.alunoCnt += 1;
          }
        }
      });
    });

    const turmaPlanilha = historico[0]?.turmaPlanilha || studentProfile?.turma;
    const turmaAlunos = conceitoData.filter(aluno => studentBims.has(aluno.bimestre) && (aluno.turmaPlanilha === turmaPlanilha || aluno.turma === studentProfile?.turma));

    return Array.from(discMap.entries()).map(([disciplina, item]) => {
      let turmaSum = 0;
      let turmaCnt = 0;
      turmaAlunos.forEach(aluno => {
        if (aluno.notas?.[disciplina] !== undefined) {
          const nota = parseGrade(aluno.notas[disciplina]);
          if (nota > 0 || (aluno.notas[disciplina] && aluno.notas[disciplina] !== '-')) {
            if (nota > 0) {
              turmaSum += nota;
              turmaCnt += 1;
            }
          }
        }
      });
      const displaySub = formatDisciplina(disciplina);
      const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;
      const notaAlunoMed = item.alunoCnt > 0 ? parseFloat((item.alunoSum / item.alunoCnt).toFixed(1)) : null;
      return {
        subject: shortName,
        fullSubject: displaySub,
        Aluno: notaAlunoMed,
        Turma: turmaCnt > 0 ? parseFloat((turmaSum / turmaCnt).toFixed(1)) : 0,
      };
    }).sort((a, b) => a.fullSubject.localeCompare(b.fullSubject));
  }

  const bRegistro = getConceitoBimestre(studentProfile, targetBimestre);
  if (!bRegistro?.notas) return [];

  const turmaAlunos = conceitoData.filter(
    (aluno) => aluno.bimestre === bRegistro.bimestre && aluno.turmaPlanilha === bRegistro.turmaPlanilha
  );

  return Object.entries(bRegistro.notas).map(([disciplina, notaRaw]) => {
    const notaAluno = parseGrade(notaRaw);
    let soma = 0;
    let count = 0;

    turmaAlunos.forEach((aluno) => {
      if (aluno.notas?.[disciplina] !== undefined) {
        const nota = parseGrade(aluno.notas[disciplina]);
        if (nota > 0 || (aluno.notas[disciplina] && aluno.notas[disciplina] !== '-')) {
          soma += nota;
          count += 1;
        }
      }
    });

    if (count === 0 && notaAluno === null) return null;

    const displaySub = formatDisciplina(disciplina);
    const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;

    return {
      subject: shortName,
      fullSubject: displaySub,
      Aluno: notaAluno,
      Turma: count > 0 ? parseFloat((soma / count).toFixed(1)) : 0,
    };
  }).filter(Boolean);
};

export const buildChartDataProva = (studentProfile, conceitoData = [], provaData = [], allStudents = [], targetBimestre = 'ultimo') => {
  void conceitoData;

  if (targetBimestre === 'evolucao') {
    const historico = studentProfile?.historicoProvas || [];
    if (historico.length === 0) return [];

    const discMap = new Map();
    const studentBims = new Set();
    historico.forEach(p => {
      studentBims.add(p.bimestre);
      Object.entries(p.notas || {}).forEach(([disc, notaRaw]) => {
        const notaAluno = toScale10(notaRaw);
        if (notaAluno !== null || notaRaw) {
          if (!discMap.has(disc)) discMap.set(disc, { alunoSum: 0, alunoCnt: 0 });
          const item = discMap.get(disc);
          if (notaAluno !== null) {
            item.alunoSum += notaAluno;
            item.alunoCnt += 1;
          }
        }
      });
    });

    const studentsByName = new Map((allStudents || []).map((student) => [student.normalizedName, student]));
    const sameTurma = provaData.filter((provaAluno) => {
      if (provaAluno.bimestre && !studentBims.has(provaAluno.bimestre)) return false;
      const aluno = studentsByName.get(provaAluno.normalizedName);
      return aluno && aluno.turma === studentProfile.turma;
    });

    return Array.from(discMap.entries()).map(([disciplina, item]) => {
      let turmaSum = 0;
      let turmaCnt = 0;
      sameTurma.forEach(colega => {
        if (colega.notas?.[disciplina] !== undefined) {
          const nota = toScale10(colega.notas[disciplina]);
          if (nota !== null) {
            turmaSum += nota;
            turmaCnt += 1;
          }
        }
      });
      const displaySub = formatDisciplina(disciplina);
      const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;
      const notaAlunoMed = item.alunoCnt > 0 ? Math.round((item.alunoSum / item.alunoCnt) * 100) / 100 : null;
      return {
        subject: shortName,
        fullSubject: displaySub,
        Aluno: notaAlunoMed,
        Turma: turmaCnt > 0 ? Math.round((turmaSum / turmaCnt) * 100) / 100 : 0,
        naoEfetuou: notaAlunoMed === null
      };
    }).sort((a, b) => a.fullSubject.localeCompare(b.fullSubject));
  }

  const pRegistro = getProvaBimestre(studentProfile, targetBimestre);
  if (!pRegistro?.notas) return [];

  const studentsByName = new Map((allStudents || []).map((student) => [student.normalizedName, student]));
  
  // Filtra provas dos colegas da mesma turma E do mesmo bimestre
  const sameTurma = provaData.filter((provaAluno) => {
    if (provaAluno.bimestre && pRegistro.bimestre && provaAluno.bimestre !== pRegistro.bimestre) {
      return false;
    }
    const aluno = studentsByName.get(provaAluno.normalizedName);
    return aluno && aluno.turma === studentProfile.turma;
  });

  return Object.entries(pRegistro.notas)
    .map(([disciplina, notaRaw]) => {
      const notaAluno = toScale10(notaRaw);

      let soma = 0;
      let count = 0;

      sameTurma.forEach((colega) => {
        const nota = toScale10(colega.notas?.[disciplina]);
        if (nota !== null) {
          soma += nota;
          count += 1;
        }
      });

      if (count === 0 && notaAluno === null) return null;

      const displaySub = formatDisciplina(disciplina);
      const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;

      return {
        subject: shortName,
        fullSubject: displaySub,
        Aluno: notaAluno !== null ? Math.round(notaAluno * 100) / 100 : null,
        Turma: count > 0 ? Math.round((soma / count) * 100) / 100 : 0,
        naoEfetuou: notaAluno === null
      };
    })
    .filter(Boolean);
};

export const buildStudentChartData = (studentProfile, conceitoData = [], provaData = [], allStudents = [], targetBimestre = 'ultimo') => ({
  chartDataMapao: buildChartDataMapao(studentProfile, conceitoData, provaData, allStudents, targetBimestre),
  chartDataProva: buildChartDataProva(studentProfile, conceitoData, provaData, allStudents, targetBimestre),
});

export const buildTurmaChartDataMapao = (targetTurma, conceitoData = [], allStudents = [], targetBimestre = 'ultimo') => {
  if (!targetTurma) return [];
  const targetSerie = getSerieFromTurma(targetTurma);
  const studentsInTurma = allStudents.filter(s => s.turma === targetTurma);
  const studentsInSerie = allStudents.filter(s => getSerieFromTurma(s.turma) === targetSerie);

  const normNamesTurmaSet = new Set(studentsInTurma.map(s => s.normalizedName));
  const normNamesSerieSet = new Set(studentsInSerie.map(s => s.normalizedName));

  const bimsDisponiveis = Array.from(new Set(conceitoData.map(c => c.bimestre))).filter(Boolean).sort();
  const escolhido = targetBimestre === 'ultimo' ? (bimsDisponiveis[bimsDisponiveis.length - 1] || null) : targetBimestre;
  if (!escolhido) return [];

  const registrosBim = conceitoData.filter(c => c.bimestre === escolhido && c.notas);
  if (registrosBim.length === 0) return [];

  const discMapTurma = new Map();
  const discMapSerie = new Map();

  registrosBim.forEach(reg => {
    const isMinhaTurma = normNamesTurmaSet.has(reg.normalizedName) || reg.turmaPlanilha === targetTurma;
    const isMinhaSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === targetSerie;

    if (!isMinhaSerie) return;

    Object.entries(reg.notas || {}).forEach(([disc, valRaw]) => {
      const nota = parseGrade(valRaw);
      if (nota > 0 || (valRaw && valRaw !== '-')) {
        const val = nota > 0 ? nota : 0;
        if (!discMapSerie.has(disc)) discMapSerie.set(disc, { sum: 0, count: 0 });
        const ser = discMapSerie.get(disc);
        ser.sum += val; ser.count += 1;

        if (isMinhaTurma) {
          if (!discMapTurma.has(disc)) discMapTurma.set(disc, { sum: 0, count: 0 });
          const tur = discMapTurma.get(disc);
          tur.sum += val; tur.count += 1;
        }
      }
    });
  });

  return Array.from(discMapSerie.keys()).map(disc => {
    const ser = discMapSerie.get(disc) || { sum: 0, count: 0 };
    const tur = discMapTurma.get(disc) || { sum: 0, count: 0 };
    if (ser.count === 0 && tur.count === 0) return null;

    const displaySub = formatDisciplina(disc);
    const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;

    return {
      subject: shortName,
      fullSubject: displaySub,
      Turma: tur.count > 0 ? parseFloat((tur.sum / tur.count).toFixed(1)) : 0,
      Escola: ser.count > 0 ? parseFloat((ser.sum / ser.count).toFixed(1)) : 0,
    };
  }).filter(Boolean);
};

export const buildTurmaChartDataProva = (targetTurma, provaData = [], allStudents = [], targetBimestre = 'ultimo') => {
  if (!targetTurma) return [];
  const targetSerie = getSerieFromTurma(targetTurma);
  const studentsInTurma = allStudents.filter(s => s.turma === targetTurma);
  const studentsInSerie = allStudents.filter(s => getSerieFromTurma(s.turma) === targetSerie);

  const normNamesTurmaSet = new Set(studentsInTurma.map(s => s.normalizedName));
  const normNamesSerieSet = new Set(studentsInSerie.map(s => s.normalizedName));

  const bimsDisponiveis = Array.from(new Set(provaData.map(p => p.bimestre))).filter(Boolean).sort();
  const escolhido = targetBimestre === 'ultimo' ? (bimsDisponiveis[bimsDisponiveis.length - 1] || null) : targetBimestre;
  if (!escolhido) return [];

  const registrosBim = provaData.filter(p => p.bimestre === escolhido && p.notas);
  if (registrosBim.length === 0) return [];

  const discMapTurma = new Map();
  const discMapSerie = new Map();

  registrosBim.forEach(reg => {
    const isMinhaTurma = normNamesTurmaSet.has(reg.normalizedName) || reg.turmaPlanilha === targetTurma;
    const isMinhaSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === targetSerie;

    if (!isMinhaSerie) return;

    Object.entries(reg.notas || {}).forEach(([disc, valRaw]) => {
      const nota = toScale10(valRaw);
      if (nota !== null) {
        if (!discMapSerie.has(disc)) discMapSerie.set(disc, { sum: 0, count: 0 });
        const ser = discMapSerie.get(disc);
        ser.sum += nota; ser.count += 1;

        if (isMinhaTurma) {
          if (!discMapTurma.has(disc)) discMapTurma.set(disc, { sum: 0, count: 0 });
          const tur = discMapTurma.get(disc);
          tur.sum += nota; tur.count += 1;
        }
      }
    });
  });

  return Array.from(discMapSerie.keys()).map(disc => {
    const ser = discMapSerie.get(disc) || { sum: 0, count: 0 };
    const tur = discMapTurma.get(disc) || { sum: 0, count: 0 };
    if (ser.count === 0 && tur.count === 0) return null;

    const displaySub = formatDisciplina(disc);
    const shortName = displaySub.length > 12 ? `${displaySub.substring(0, 10)}.` : displaySub;

    return {
      subject: shortName,
      fullSubject: displaySub,
      Turma: tur.count > 0 ? parseFloat((tur.sum / tur.count).toFixed(2)) : 0,
      Escola: ser.count > 0 ? parseFloat((ser.sum / ser.count).toFixed(2)) : 0,
    };
  }).filter(Boolean);
};

export const buildTurmaEvolucaoData = (targetTurma, conceitoData = [], provaData = [], allStudents = []) => {
  if (!targetTurma) return [];
  const targetSerie = getSerieFromTurma(targetTurma);
  const studentsInTurma = allStudents.filter(s => s.turma === targetTurma);
  const studentsInSerie = allStudents.filter(s => getSerieFromTurma(s.turma) === targetSerie);

  const normNamesTurmaSet = new Set(studentsInTurma.map(s => s.normalizedName));
  const normNamesSerieSet = new Set(studentsInSerie.map(s => s.normalizedName));

  const bimsSet = new Set([
    ...conceitoData.map(c => c.bimestre),
    ...provaData.map(p => p.bimestre)
  ]);
  const bims = Array.from(bimsSet).filter(Boolean).sort();

  return bims.map(bim => {
    const ccBim = conceitoData.filter(c => c.bimestre === bim && c.notas);
    let ccTurmaSum = 0, ccTurmaCnt = 0, ccSerieSum = 0, ccSerieCnt = 0;
    ccBim.forEach(reg => {
      const isTurma = normNamesTurmaSet.has(reg.normalizedName) || reg.turmaPlanilha === targetTurma;
      const isSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === targetSerie;
      if (!isSerie) return;

      Object.values(reg.notas || {}).forEach(valRaw => {
        const n = parseGrade(valRaw);
        if (n > 0) {
          ccSerieSum += n; ccSerieCnt++;
          if (isTurma) { ccTurmaSum += n; ccTurmaCnt++; }
        }
      });
    });

    const ppBim = provaData.filter(p => p.bimestre === bim && p.notas);
    let ppTurmaSum = 0, ppTurmaCnt = 0, ppSerieSum = 0, ppSerieCnt = 0;
    ppBim.forEach(reg => {
      const isTurma = normNamesTurmaSet.has(reg.normalizedName) || reg.turmaPlanilha === targetTurma;
      const isSerie = normNamesSerieSet.has(reg.normalizedName) || getSerieFromTurma(reg.turmaPlanilha) === targetSerie;
      if (!isSerie) return;

      Object.values(reg.notas || {}).forEach(valRaw => {
        const n = toScale10(valRaw);
        if (n !== null) {
          ppSerieSum += n; ppSerieCnt++;
          if (isTurma) { ppTurmaSum += n; ppTurmaCnt++; }
        }
      });
    });

    return {
      bimestre: bim.replace('º Bimestre', 'º Bi'),
      ccTurma: ccTurmaCnt > 0 ? parseFloat((ccTurmaSum / ccTurmaCnt).toFixed(1)) : 0,
      ccEscola: ccSerieCnt > 0 ? parseFloat((ccSerieSum / ccSerieCnt).toFixed(1)) : 0,
      ppTurma: ppTurmaCnt > 0 ? parseFloat((ppTurmaSum / ppTurmaCnt).toFixed(2)) : 0,
      ppEscola: ppSerieCnt > 0 ? parseFloat((ppSerieSum / ppSerieCnt).toFixed(2)) : 0,
    };
  });
};