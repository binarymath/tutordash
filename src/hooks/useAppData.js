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

const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

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
              let headers  = jsonData[headerRowIdx];
              
              // Verifica se a linha seguinte é um sub-header (comum quando a coluna ALUNO está mesclada verticalmente)
              const nextRow = jsonData[headerRowIdx + 1] || [];
              if (!nextRow[0] || String(nextRow[0]).trim() === '') {
                const maxLen = Math.max(headers.length, nextRow.length);
                headers = Array.from({ length: maxLen }).map((_, i) => {
                  const h = headers[i];
                  const subH = nextRow[i];
                  if (h && subH) return `${h}\n${subH}`;
                  return h || subH || '';
                });
                headerRowIdx++; // Avança um índice para que a leitura dos alunos comece corretamente
              }

              const subjects = [];
              let tfIdx = -1;
              let freqIdx = -1;

              headers.forEach((h, idx) => {
                if (typeof h === 'string') {
                  const upperH = normalizeHeader(h);
                  const compact = upperH.replace(/\s+/g, '');

                  const isTf = compact === 'TF' ||
                               compact === 'TOTALTF' ||
                               compact === 'TOTALFALTAS' ||
                               compact === 'TOTALFALTA' ||
                               compact.includes('TOTAL:TF') ||
                               compact.includes('TOTALDEFALTA') ||
                               (compact.includes('TOTAL') && compact.includes('FALTA'));

                  const isFreq = compact.includes('FREQ') ||
                                 compact.includes('FRE(') ||
                                 compact.includes('FRE%') ||
                                 compact === 'FRE' ||
                                 compact.includes('TOTAL:FRE');

                  if (tfIdx === -1 && isTf) {
                    tfIdx = idx;
                  }

                  if (freqIdx === -1 && isFreq) {
                    freqIdx = idx;
                  }

                  if (h.includes('\n')) {
                    const subjectName = h.split('\n')[0].trim();
                    if (!subjectName.toUpperCase().includes('TOTAL') && !isTf && !isFreq) {
                      subjects.push({ index: idx, name: subjectName });
                    }
                  }
                }
              });

              // Fallback resiliente para diferentes variações por série/ano.
              if (tfIdx === -1) {
                tfIdx = headers.findIndex((h) => {
                  const upperH = normalizeHeader(h);
                  const compact = upperH.replace(/\s+/g, '');
                  return compact === 'TF' || 
                         compact.includes('TOTAL:TF') || 
                         compact.includes('TOTALDEFALTA') || 
                         (compact.includes('TOTAL') && compact.includes('FALTA')) ||
                         ((compact.startsWith('TF') || compact.includes('TOTALFALTA')) && !compact.includes('AN'));
                });
              }

              if (freqIdx === -1) {
                freqIdx = headers.findIndex((h) => {
                  const upperH = normalizeHeader(h);
                  const compact = upperH.replace(/\s+/g, '');
                  return (compact.includes('FRE') || compact.includes('FREQ')) && !compact.includes('AN');
                });
              }

              console.debug('[Mapão] tf idx:', tfIdx, '| header:', headers[tfIdx]);
              console.debug('[Mapão] fre idx:', freqIdx, '| header:', headers[freqIdx]);

              const dadosDaGuia = jsonData.slice(headerRowIdx + 1).map(row => {
                const alunoNome = row[0];
                if (!alunoNome || String(alunoNome).trim() === '' || String(alunoNome).includes('Aulas Dadas')) return null;
                let notas = {};
                subjects.forEach(sub => {
                  notas[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
                });
                const tfBimestre = tfIdx !== -1 && row[tfIdx] !== undefined && row[tfIdx] !== null && String(row[tfIdx]).trim() !== ''
                  ? String(row[tfIdx]).trim()
                  : '-';
                const freqBimestre = freqIdx !== -1 && row[freqIdx] !== undefined && row[freqIdx] !== null && String(row[freqIdx]).trim() !== ''
                  ? String(row[freqIdx]).trim()
                  : '-';
                return {
                  normalizedName: normalizeName(alunoNome),
                  bimestre: formatBimestre(bimestreRaw),
                  turmaPlanilha: String(turmaPlanilha).trim(),
                  notas,
                  tfBimestre,
                  freqBimestre,
                  // Mantido por compatibilidade com telas antigas.
                  faltas: tfBimestre
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
