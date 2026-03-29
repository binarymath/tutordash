// ─────────────────────────────────────────────────────────────
// hooks/useAppData.js — Carregamento e parsing de todas as planilhas
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { normalizeName, formatBimestre, fetchWithFallback } from '../utils/helpers';

let xlsxModulePromise = null;

const getXLSX = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
};

const fetchAndParseCSV = async (url) => {
  if (!url) return [];
  let fetchUrl = url;
  if (fetchUrl.includes('docs.google.com/spreadsheets')) {
    const idMatch = fetchUrl.match(/\/d\/(.*?)(\/|$)/);
    if (idMatch) fetchUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
  }
  const res = await fetchWithFallback(fetchUrl);
  const text = await res.text();
  const XLSX = await getXLSX();
  const wb = XLSX.read(text, { type: 'string' });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
};

export const useAppData = (config, setShowSettings) => {
  const [data, setData]               = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [provaData, setProvaData]     = useState([]);
  const [conceitoData, setConceitoData] = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [isSyncing, setIsSyncing]     = useState(false);
  const [error, setError]             = useState(null);

  // Polling automático a cada 5 minutos
  useEffect(() => {
    if (data.length > 0 && config.studentsUrl) {
      const interval = setInterval(() => loadAllData(true), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [data.length, config.studentsUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllData = async (silent = false) => {
    if (!config.studentsUrl) {
      if (!silent) {
        setError("O URL da Planilha de Tutoria (Base) é obrigatória.");
        setShowSettings(true);
      }
      return;
    }

    if (!silent) { setIsLoading(true); setError(null); }
    else setIsSyncing(true);

    let warnings    = [];
    let newAlunos   = null;
    let newNotes    = null;
    let newProva    = null;
    let newConceitos = null;

    try {
      // ── 1. TUTORIA ──────────────────────────────────────────
      try {
        const alunosArray = await fetchAndParseCSV(config.studentsUrl);
        const formattedAlunos = alunosArray.slice(1).map((row, idx) => {
          const tutoradosRaw = row.slice(2, 16) || [];
          const tutorados = tutoradosRaw.map(t => t ? String(t).trim() : "").filter(t => t !== "");
          return {
            id: idx,
            turma: String(row[1] || 'Sem Turma').trim(),
            tutorados,
            tutor: String(row[16] || 'Não Atribuído').trim()
          };
        }).filter(item => item.tutorados.length > 0);

        if (formattedAlunos.length === 0) throw new Error("Nenhum dado válido encontrado.");
        newAlunos = formattedAlunos;
      } catch (e) {
        throw new Error(`Base de Tutoria: ${e.message}`);
      }

      // ── 2. ANOTAÇÕES ────────────────────────────────────────
      if (config.notesUrl) {
        try {
          const notesArray = await fetchAndParseCSV(config.notesUrl);
          if (notesArray.length > 1) {
            const headers = notesArray[0] || [];
            const noteIdx = headers.findIndex(h =>
              h && ['nota', 'obs', 'texto', 'ocorrência', 'anotação'].some(kw => String(h).toLowerCase().includes(kw))
            );
            const parsedNotes = notesArray.slice(1).map(row => {
              const teacherRaw       = row[18] ? String(row[18]).trim() : '';
              const tipoAnotacaoRaw  = row[19] ? String(row[19]).trim() : '';
              const studentNameRaw   = row.slice(2, 18).find(name => name && String(name).trim() !== '') || '';
              return {
                id: Math.random().toString(),
                displayDate: row[0] ? String(row[0]) : 'S/ Data',
                studentName: studentNameRaw ? String(studentNameRaw).trim() : '',
                normalizedName: normalizeName(studentNameRaw ? String(studentNameRaw).trim() : ''),
                teacher: teacherRaw || 'Prof Desconhecido',
                note: noteIdx !== -1 && row[noteIdx] ? String(row[noteIdx]) : '',
                tipoSessao: tipoAnotacaoRaw
              };
            }).filter(n => n.studentName);
            newNotes = parsedNotes.reverse();
          } else {
            newNotes = [];
          }
        } catch (e) {
          warnings.push(`Anotações (${e.message})`);
        }
      }

      // ── 3. PROVA PAULISTA ───────────────────────────────────
      if (config.provaUrl) {
        try {
          const provaArray = await fetchAndParseCSV(config.provaUrl);
          if (provaArray.length > 1) {
            const headers    = provaArray[0] || [];
            const studentIdx = headers.findIndex(h => h && ['aluno', 'nome'].some(kw => String(h).toLowerCase().includes(kw)));
            const notaIdx    = headers.findIndex(h => h && ['nota', 'acerto', 'resultado', 'desempenho'].some(kw => String(h).toLowerCase().includes(kw)));
            const excludeWords = ['aluno', 'nome', 'turma', 'ra', 'situação', 'nota', 'resultado', 'desempenho', 'acerto', 'série'];
            const ppSubjects = [];
            headers.forEach((h, idx) => {
              if (typeof h === 'string' && h.trim() !== '') {
                const lowerH = h.toLowerCase().trim();
                if (!excludeWords.some(ew => lowerH.includes(ew)) && idx !== studentIdx && idx !== notaIdx) {
                  ppSubjects.push({ index: idx, name: h.trim() });
                }
              }
            });
            const parsedProva = provaArray.slice(1).map(row => {
              const alunoNome = studentIdx !== -1 ? row[studentIdx] : '';
              if (!alunoNome) return null;
              const notasIndividuais = {};
              ppSubjects.forEach(sub => {
                notasIndividuais[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
              });
              return {
                normalizedName: normalizeName(alunoNome),
                resultado: notaIdx !== -1 && row[notaIdx] ? String(row[notaIdx]) : 'S/N',
                notas: notasIndividuais
              };
            }).filter(p => p && p.normalizedName);
            newProva = parsedProva;
          } else {
            newProva = [];
          }
        } catch (e) {
          warnings.push(`Prova Paulista (${e.message})`);
        }
      }

      // ── 4. HISTÓRICO BIMESTRAL (MAPÃO SED) ─────────────────
      if (config.conceitoUrl) {
        try {
          let fetchCUrl = config.conceitoUrl;
          if (fetchCUrl.includes('docs.google.com/spreadsheets')) {
            const idMatch = fetchCUrl.match(/\/d\/(.*?)(\/|$)/);
            if (idMatch) fetchCUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=xlsx`;
          }
          const res         = await fetchWithFallback(fetchCUrl);
          const arrayBuffer = await res.arrayBuffer();
          const XLSX        = await getXLSX();
          const wb          = XLSX.read(arrayBuffer, { type: 'array' });
          let todosConceitos = [];

          wb.SheetNames.forEach(nomeDaGuia => {
            const ws       = wb.Sheets[nomeDaGuia];
            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
            let turmaPlanilha = nomeDaGuia;
            let bimestreRaw   = nomeDaGuia;
            let headerRowIdx  = -1;

            for (let i = 0; i < jsonData.length; i++) {
              const row = jsonData[i] || [];
              if (row[0] === 'Turma:')          turmaPlanilha = row[1];
              if (row[0] === 'Tipo Fechamento:') bimestreRaw   = row[1];
              if (row[0] === 'ALUNO') { headerRowIdx = i; break; }
            }

            if (headerRowIdx !== -1) {
              const headers  = jsonData[headerRowIdx];
              const subjects = [];
              let faltasIdx  = -1;

              headers.forEach((h, idx) => {
                if (typeof h === 'string') {
                  const upperH = h.toUpperCase().trim();
                  if (h.includes('\n')) {
                    const subjectName = h.split('\n')[0].trim();
                    if (!subjectName.toUpperCase().includes('TOTAL')) {
                      subjects.push({ index: idx, name: subjectName });
                    }
                  } else if (upperH.includes('FALTA') || upperH.includes('AUSÊN') || upperH.includes('AUSEN') || upperH === '% F' || upperH === 'F') {
                    // Prioriza coluna com nome exato "F" ou "TOTAL FALTAS"; caso já tenha um índice, só substitui se for mais específico
                    const isExact = (upperH === 'F' || upperH === 'TOTAL FALTAS' || upperH === 'FALTAS');
                    const isPercent = (upperH === '% F' || upperH.includes('%'));
                    if (faltasIdx === -1) {
                      faltasIdx = idx;
                    } else if (isExact) {
                      // coluna exata sempre vence
                      faltasIdx = idx;
                    } else if (!isPercent) {
                      // coluna sem % prefere sobre colunas de porcentagem anteriores
                      faltasIdx = idx;
                    }
                  }
                }
              });
              // Log para diagnóstico (pode ser removido após confirmação)
              console.debug('[Mapão] faltas col idx:', faltasIdx, '| header:', headers[faltasIdx]);

              const dadosDaGuia = jsonData.slice(headerRowIdx + 1).map(row => {
                const alunoNome = row[0];
                if (!alunoNome || String(alunoNome).trim() === '' || String(alunoNome).includes('Aulas Dadas')) return null;
                let notas = {};
                subjects.forEach(sub => {
                  notas[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
                });
                const faltas = faltasIdx !== -1 && row[faltasIdx] ? String(row[faltasIdx]).trim() : '-';
                return {
                  normalizedName: normalizeName(alunoNome),
                  bimestre: formatBimestre(bimestreRaw),
                  turmaPlanilha: String(turmaPlanilha).trim(),
                  notas,
                  faltas
                };
              }).filter(Boolean);

              todosConceitos = [...todosConceitos, ...dadosDaGuia];
            }
          });
          newConceitos = todosConceitos;
        } catch (e) {
          console.error("Erro no Mapão SED:", e);
          warnings.push(`Mapão/Histórico (${e.message})`);
        }
      }

      if (!silent && warnings.length > 0) {
        setError(`Aviso: Base carregada, mas houve falha ao importar: ${warnings.join(' | ')}.`);
      }
    } catch (err) {
      if (!silent) setError(`Erro crítico na importação: ${err.message}`);
      else console.error("Falha na sincronização silenciosa:", err.message);
    } finally {
      if (newAlunos)   setData(newAlunos);
      if (newNotes !== null)    setAnnotations(newNotes);
      if (newProva !== null)    setProvaData(newProva);
      if (newConceitos !== null) setConceitoData(newConceitos);
      if (!silent) setIsLoading(false);
      else setIsSyncing(false);
    }
  };

  return { data, annotations, provaData, conceitoData, isLoading, isSyncing, error, setError, loadAllData };
};
