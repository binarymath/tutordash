import { normalizeName, formatBimestre } from '../utils/helpers';


let xlsxModulePromise = null;

export const getXLSX = async () => {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
};

// ─────────────────────────────────────────────────────────────────────────────────────
// Função central de fetch: SEMPRE usa o proxy interno /api/proxy.
// Isso contorna o CORS do browser e aceita URLs com espaços acidentais.
// ─────────────────────────────────────────────────────────────────────────────────────
const fetchAndParseCSV = async (url) => {
  if (!url) return [];

  // 1. Limpa espaços acidentais na URL inteira
  const cleanUrl = url.trim();

  // 2. Constrói a fetchUrl definitiva:
  //    - URLs do Google Sheets (contendo /d/<ID>) → converte para export CSV limpo
  //    - Qualquer outra URL → usa como está
  let fetchUrl;
  const idMatch = cleanUrl.match(/\/d\/([^/\s]+)/);
  if (idMatch) {
    const cleanId = idMatch[1].replace(/\s+/g, ''); // ex: "abc def" → "abcdef"
    fetchUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv`;
  } else {
    fetchUrl = cleanUrl;
  }

  // 3. Garante que a requisição passa SEMPRE pelo proxy interno —
  //    mesmo que fetchUrl já seja um URL /export ou genérico sem o prefixo proxy.
  //    Isso evita problemas de CORS e garante que cookies/sessão do browser
  //    nunca são enviados directamente ao Google.
  try {
    let proxyUrl;
    if (fetchUrl.includes('/api/proxy?url=')) {
      // Já está encaminhado pelo proxy — usa como está
      proxyUrl = fetchUrl;
    } else {
      proxyUrl = '/api/proxy?url=' + encodeURIComponent(fetchUrl);
    }

    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`Proxy respondeu com status ${res.status} para: ${fetchUrl}`);
    }
    const text = await res.text();
    const XLSX = await getXLSX();
    const wb = XLSX.read(text, { type: 'string' });
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  } catch (error) {
    console.error('[fetchAndParseCSV] Falhou:', error.message);
    throw new Error(
      'Não foi possível carregar a planilha. Verifique se o link está correto e se a planilha está pública.'
    );
  }
};


const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();


export const fetchStudents = async (url) => {
  if (!url) throw new Error("A URL de Tutores não foi configurada");
  const alunosArray = await fetchAndParseCSV(url);
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

  if (formattedAlunos.length === 0) throw new Error("Nenhum dado válido de tutoria encontrado.");
  return formattedAlunos;
};

export const fetchNotes = async (url) => {
  if (!url) return [];
  const notesArray = await fetchAndParseCSV(url);
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
    return parsedNotes.reverse();
  }
  return [];
};

export const fetchProvas = async (url) => {
  if (!url) return [];
  const provaArray = await fetchAndParseCSV(url);
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
    return parsedProva;
  }
  return [];
};


export const fetchConceitos = async (url) => {
  if (!url) return [];
  
  // Limpa e constrói a URL de exportação XLSX via proxy interno
  const cleanCUrl = url.trim();
  const idMatchC = cleanCUrl.match(/\/d\/([^/\s]+)/);
  let fetchCUrl;
  if (idMatchC) {
    const cleanId = idMatchC[1].replace(/\s+/g, '');
    fetchCUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=xlsx`;
  } else {
    fetchCUrl = cleanCUrl;
  }

  const proxyUrl = '/api/proxy?url=' + encodeURIComponent(fetchCUrl);
  const res         = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy respondeu ${res.status} ao carregar conceitos.`);
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
        
        const nextRow = jsonData[headerRowIdx + 1] || [];
        if (!nextRow[0] || String(nextRow[0]).trim() === '') {
        const maxLen = Math.max(headers.length, nextRow.length);
        headers = Array.from({ length: maxLen }).map((_, i) => {
            const h = headers[i];
            const subH = nextRow[i];
            if (h && subH) return `${h}\n${subH}`;
            return h || subH || '';
        });
        headerRowIdx++;
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
            faltas: tfBimestre
        };
        }).filter(Boolean);

        todosConceitos = [...todosConceitos, ...dadosDaGuia];
    }
  });
  return todosConceitos;
};
