import { normalizeName, formatBimestre, formatTurma } from '../utils/helpers';


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

const normalizeHeaderToken = (value) =>
  normalizeHeader(value).replace(/\s+/g, '');

const normalizeCompact = (value) =>
  normalizeHeader(value)
    .replace(/[\s():%._-]+/g, '')
    .trim();

const isAttendanceIndexHeader = (value) => {
  const compact = normalizeCompact(value);
  return compact === 'F' ||
    compact === 'AC' ||
    compact === 'FTAN' ||
    compact === 'FREAN' ||
    compact === 'FREANPERCENT' ||
    compact === 'FREAN%' ||
    compact === 'FREQUENCIAANUAL' ||
    compact === 'FREQUENCIAAN';
};

const isRefSpreadsheetError = (value) => {
  const normalized = normalizeHeaderToken(value).replace(/!/g, '');
  return normalized === '#REF';
};

const sanitizeCellText = (value) => {
  const text = String(value || '').trim();
  return isRefSpreadsheetError(text) ? '' : text;
};

// Converte serial numérico do Excel (ex: 46027.54268518519) ou texto de data para
// 'dd/mm/aaaa HH:MM' no padrão brasileiro.
// A parte inteira do serial = data; a parte fracionária = horário local (fuso da planilha).
const excelSerialToDate = (value) => {
  if (value === undefined || value === null || value === '') return 'S/ Data';
  const str = String(value).trim();
  if (!str) return 'S/ Data';

  const pad = (n) => String(n).padStart(2, '0');

  // ── Caso 1: texto dd/mm/aaaa (com ou sem horário HH:MM) ──
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const datePart = `${pad(dmyMatch[1])}/${pad(dmyMatch[2])}/${dmyMatch[3]}`;
    if (dmyMatch[4] !== undefined) {
      return `${datePart} ${pad(dmyMatch[4])}:${pad(dmyMatch[5])}`;
    }
    return datePart;
  }

  // ── Caso 2: texto ISO aaaa-mm-dd (com ou sem horário T/espaço HH:MM) ──
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const datePart = `${pad(isoMatch[3])}/${pad(isoMatch[2])}/${isoMatch[1]}`;
    if (isoMatch[4] !== undefined) {
      return `${datePart} ${pad(isoMatch[4])}:${pad(isoMatch[5])}`;
    }
    return datePart;
  }

  // ── Caso 3: serial numérico do Excel ──
  // Parte inteira → data; parte fracionária → horário local da planilha (já em UTC-3).
  const serial = parseFloat(str);
  if (!isNaN(serial) && serial > 1000) {
    const intPart  = Math.floor(serial);
    const fracPart = serial - intPart;

    // Data via componentes UTC (a conversão intPart-25569 já mapeia para o calendário local)
    const utcMs = intPart * 86400 * 1000 - 25569 * 86400 * 1000;
    const date  = new Date(utcMs);
    if (isNaN(date.getTime())) return str;
    const datePart = `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;

    // Horário: parte fracionária × minutos do dia, arredondado ao minuto
    if (fracPart > 0) {
      const totalMin = Math.round(fracPart * 1440); // 1440 = 24 × 60
      const hh = Math.floor(totalMin / 60) % 24;
      const mm = totalMin % 60;
      return `${datePart} ${pad(hh)}:${pad(mm)}`;
    }

    return datePart;
  }

  return str; // fallback: devolve como está
};




export const parsePlanilhaTutoriaMedio = (csvArray) => {
  const grupos = new Map();
  let lastTurma = '';
  let lastTutor = '';

  csvArray.slice(1).forEach((row) => {
    const turmaSanitized = sanitizeCellText(row?.[0]);
    const turmaRaw = turmaSanitized ? formatTurma(turmaSanitized) : '';
    const tutorRaw = sanitizeCellText(row?.[1]);
    const tutorado = sanitizeCellText(row?.[2]);

    if (!tutorado) return;

    if (turmaRaw && turmaRaw !== lastTurma) {
      lastTutor = '';
    }

    const turma = turmaRaw || lastTurma || 'Sem Turma';
    const tutor = tutorRaw || lastTutor || 'Sem Tutor';

    if (turmaRaw) lastTurma = turmaRaw;
    if (tutorRaw) lastTutor = tutorRaw;

    const key = `${turma}__${tutor}`;
    if (!grupos.has(key)) {
      grupos.set(key, { turma, tutor, tutorados: [] });
    }

    const grupo = grupos.get(key);
    if (!grupo.tutorados.includes(tutorado)) {
      grupo.tutorados.push(tutorado);
    }
  });

  return Array.from(grupos.values()).map((item, idx) => ({
    id: idx,
    turma: item.turma,
    tutor: item.tutor,
    tutorados: item.tutorados
  }));
};


export const fetchStudents = async (url) => {
  if (!url) throw new Error("A URL de Tutores não foi configurada");
  try {
    const alunosArray = await fetchAndParseCSV(url);
    const header = alunosArray?.[0] || [];
    const normalizedHeader = header.map(normalizeHeaderToken);
    const isFormatoMedio =
      normalizedHeader.includes('TURMA') &&
      normalizedHeader.includes('TUTOR') &&
      normalizedHeader.includes('TUTORADO');

    const formattedAlunos = isFormatoMedio
      ? parsePlanilhaTutoriaMedio(alunosArray)
      : alunosArray.slice(1).map((row, idx) => {
          const tutoradosRaw = row.slice(2, 16) || [];
          const tutorados = tutoradosRaw
            .map(sanitizeCellText)
            .filter(t => t !== "");
          const turmaSanitized = sanitizeCellText(row[1]);
          const turmaRaw = turmaSanitized ? formatTurma(turmaSanitized) : '';
          const tutorRaw = sanitizeCellText(row[16]);
          return {
            id: idx,
            turma: turmaRaw || 'Sem Turma',
            tutorados,
            tutor: tutorRaw || 'Não Atribuído'
          };
        }).filter(item => item.tutorados.length > 0);

    if (formattedAlunos.length === 0) throw new Error("Nenhum dado válido de tutoria encontrado.");
    return formattedAlunos;
  } catch (error) {
    console.error('[fetchStudents] Falhou ao processar Tutoria:', error.message);
    throw new Error(
      'Não foi possível processar a planilha de Tutoria. Verifique o formato e os dados do arquivo.'
    );
  }
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
        displayDate: excelSerialToDate(row[0]),
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

  // ── Busca o arquivo como XLSX para ler TODAS as abas ──────────────────────
  // CSV (export?format=csv) só exporta a primeira aba — por isso usamos xlsx.
  const cleanUrl = url.trim();
  const idMatch  = cleanUrl.match(/\/d\/([^/\s]+)/);
  let fetchUrl;
  if (idMatch) {
    const cleanId = idMatch[1].replace(/\s+/g, '');
    fetchUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=xlsx`;
  } else {
    fetchUrl = cleanUrl;
  }

  const proxyUrl = '/api/proxy?url=' + encodeURIComponent(fetchUrl);
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Proxy respondeu ${res.status} ao carregar provas.`);
  const arrayBuffer = await res.arrayBuffer();
  const XLSX = await getXLSX();
  const wb   = XLSX.read(arrayBuffer, { type: 'array' });

  // ── Parseador reutilizável por aba ─────────────────────────────────────────
  const parseSheet = (sheetName) => {
    // Extrai a turma do nome da aba (ex: "6A-1Bim" → "6A", "6A" → "6A")
    const turmaDaAba = formatTurma(sheetName.split('-')[0].trim());
    const ws       = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (jsonData.length <= 1) return [];

    const headers  = jsonData[0] || [];
    const dataRows = jsonData.slice(1);

    // Coluna do nome: busca 'aluno'/'nome'; fallback col A (0)
    const studentIdx = (() => {
      const found = headers.findIndex(
        h => h && ['aluno', 'nome'].some(kw => String(h).toLowerCase().includes(kw))
      );
      return found !== -1 ? found : 0;
    })();

    const RESULT_IDX      = 3; // Coluna D → (%) de Acertos geral
    const SUBJECT_START   = 4; // Coluna E em diante → matérias

    // Matérias: todas as colunas a partir de SUBJECT_START que possuam um
    // cabeçalho não-vazio. Colunas sem cabeçalho encerram o intervalo, mas
    // colunas com cabeçalho e sem dados para uma turma específica são
    // mantidas (ex.: SOC/BIO/FIS vazios mas TEC preenchido).
    const ppSubjects = [];
    for (let col = SUBJECT_START; col < headers.length; col++) {
      const name = String(headers[col] || '').trim();
      if (!name) break; // cabeçalho vazio → fim real do bloco de matérias
      ppSubjects.push({ index: col, name });
    }

    return dataRows
      .map(row => {
        const alunoNome = row[studentIdx];
        if (!alunoNome || String(alunoNome).trim() === '') return null;

        const nomeStr = String(alunoNome).trim();
        const notas = {};
        ppSubjects.forEach(sub => {
          const raw = row[sub.index];
          notas[sub.name] = (raw !== undefined && raw !== null && String(raw).trim() !== '')
            ? String(raw).trim()
            : '-';
        });

        const resultadoRaw = row[RESULT_IDX];
        return {
          nomeOriginal:   nomeStr,
          normalizedName: normalizeName(nomeStr),
          resultado: (resultadoRaw !== undefined && resultadoRaw !== null && String(resultadoRaw).trim() !== '')
            ? String(resultadoRaw).trim()
            : 'S/N',
          notas,
          turmaPlanilha: turmaDaAba,
        };
      })
      .filter(Boolean);
  };

  // ── Lê TODAS as abas e combina ────────────────────────────────────────────
  const allParsed = [];
  wb.SheetNames.forEach(sheetName => {
    const rows = parseSheet(sheetName);
    allParsed.push(...rows);
  });

  return allParsed;
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

    // Aplica a formatação à turma
    turmaPlanilha = turmaPlanilha && turmaPlanilha !== 'Desconhecida' ? formatTurma(String(turmaPlanilha)) : 'Desconhecida';

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
        const attendanceIndexColumns = [];
        let tfIdx = -1;
        let freqIdx = -1;
        let situacaoIdx = -1;

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

            if (situacaoIdx === -1 && (compact === 'SITUACAO' || compact.includes('SITUACAO'))) {
            situacaoIdx = idx;
            }

            const nonSubjectKeywords = ['ALUNO', 'RA', 'NÚMERO', 'Nº', 'SITUAÇÃO', 'TOTAL', 'CH'];
            const excludeList = nonSubjectKeywords.map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase());
            const subjectName = h.includes('\n') ? h.split('\n')[0].trim() : String(h).trim();
            const isAttendanceIndex = isAttendanceIndexHeader(subjectName) || isAttendanceIndexHeader(h);
            
            const isExcluded = excludeList.some(w => {
              if (w === 'Nº') return upperH.includes('Nº');
              return new RegExp(`\\b${w}\\b`).test(upperH);
            });

            if (isAttendanceIndex) {
              attendanceIndexColumns.push({ index: idx, name: subjectName || String(h).trim() });
            }

            if (!isTf && !isFreq && !isExcluded && !isAttendanceIndex) {
              if (subjectName) {
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

        if (situacaoIdx === -1) situacaoIdx = 1;

        const dadosDaGuia = [];
        const rowsAfterHeader = jsonData.slice(headerRowIdx + 1);

        for (const row of rowsAfterHeader) {
          const alunoNome = row[0];
          const nomeNormalizado = String(alunoNome || '').trim().toUpperCase();

          if (!nomeNormalizado || nomeNormalizado.includes('LEGENDA') || nomeNormalizado === 'SITUAÇÃO' || nomeNormalizado.startsWith('C -')) {
              break; 
          }

          if (nomeNormalizado.includes('AULAS DADAS')) continue;

          let notas = {};
          subjects.forEach(sub => {
              notas[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
          });

          const attendanceIndexes = {};
          attendanceIndexColumns.forEach((col) => {
            attendanceIndexes[col.name] = row[col.index] ? String(row[col.index]).trim() : '-';
          });
          
          const tfBimestre = tfIdx !== -1 && row[tfIdx] !== undefined && row[tfIdx] !== null && String(row[tfIdx]).trim() !== ''
              ? String(row[tfIdx]).trim()
              : '-';
          const freqBimestre = freqIdx !== -1 && row[freqIdx] !== undefined && row[freqIdx] !== null && String(row[freqIdx]).trim() !== ''
              ? String(row[freqIdx]).trim()
              : '-';
              
          const situacaoRaw = row[situacaoIdx];
          const situacao = situacaoRaw && String(situacaoRaw).trim() !== '' ? String(situacaoRaw).trim() : 'Ativo';

          dadosDaGuia.push({
              nomeOriginal: String(alunoNome).trim(),
              normalizedName: normalizeName(alunoNome),
              bimestre: formatBimestre(bimestreRaw),
              turmaPlanilha: turmaPlanilha,
              notas,
              attendanceIndexes,
              tfBimestre,
              freqBimestre,
              faltas: tfBimestre,
              situacao
          });
        }

        todosConceitos = [...todosConceitos, ...dadosDaGuia];
    }
  });
  return todosConceitos;
};
