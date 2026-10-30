import { normalizeName, formatBimestre, formatTurma, formatDisciplina, expandSiglaDisciplina } from '../utils/helpers';


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
  //    - Extrai o parâmetro gid se presente para baixar uma aba específica
  //    - Qualquer outra URL → usa como está
  let fetchUrl;
  const idMatch = cleanUrl.match(/\/d\/([^/\s]+)/);
  if (idMatch) {
    const cleanId = idMatch[1].replace(/\s+/g, ''); // ex: "abc def" → "abcdef"
    
    let gidParam = '';
    const gidMatch = cleanUrl.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch) {
      gidParam = `&gid=${gidMatch[1]}`;
    }
    
    fetchUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=csv${gidParam}`;
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
    compact === 'FRE' ||
    compact === 'FREQ' ||
    compact === 'FREAN' ||
    compact === 'FREANPERCENT' ||
    compact === 'FREAN%' ||
    compact === 'FREQUENCIAANUAL' ||
    compact === 'FREQUENCIAAN' ||
    compact === 'FREQUENCIA' ||
    compact.startsWith('FRE') ||
    compact.startsWith('FREQ') ||
    compact.includes('FALTA') ||
    compact.includes('FREQUEN');
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




export const parsePlanilhaTutoriaMedio = (csvArray, colIndices = {}) => {
  const grupos = new Map();
  let lastTurma = '';

  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(csvArray.length, 6); r++) {
    const rowHeaders = (csvArray[r] || []).map(normalizeHeaderToken);
    if (
      rowHeaders.some(h => h.includes('TURMA') || h.includes('SERIE') || h.includes('CLASSE')) &&
      rowHeaders.some(h => h.includes('TUTORADO') || h.includes('ALUNO') || h.includes('ESTUDANTE') || h === 'NOME' || h.includes('NOMEDOALUNO'))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const header = (csvArray[headerRowIdx] || []).map(normalizeHeaderToken);
  let turmaCol = colIndices.turmaCol ?? header.findIndex(h => h.includes('TURMA') || h.includes('SERIE') || h.includes('CLASSE'));
  let tutorCol = colIndices.tutorCol ?? header.findIndex(h => h.includes('TUTOR') || h.includes('PROFESSOR') || h.includes('DOCENTE'));
  let alunoCol = colIndices.alunoCol ?? header.findIndex(h => h.includes('TUTORADO') || h.includes('ALUNO') || h.includes('ESTUDANTE') || h === 'NOME' || h.includes('NOMEDOALUNO'));

  if (turmaCol === -1) turmaCol = 0;
  if (tutorCol === -1) tutorCol = 1;
  if (alunoCol === -1) alunoCol = 2;

  csvArray.slice(headerRowIdx + 1).forEach((row) => {
    const turmaSanitized = sanitizeCellText(row?.[turmaCol]);
    const turmaRaw = turmaSanitized ? formatTurma(turmaSanitized) : '';
    const tutorRaw = sanitizeCellText(row?.[tutorCol]);
    let tutorado = sanitizeCellText(row?.[alunoCol]);

    // Se a coluna de aluno apontou para número e a próxima coluna tem o nome
    if (/^\d+$/.test(tutorado) && row?.[alunoCol + 1]) {
      const nextVal = sanitizeCellText(row[alunoCol + 1]);
      if (nextVal && !/^\d+$/.test(nextVal)) {
        tutorado = nextVal;
      }
    }

    if (!tutorado) return;
    const normTut = tutorado.toUpperCase();
    if (normTut === 'ALUNO' || normTut === 'ALUNOS' || normTut.includes('NOME DO ALUNO') || normTut === 'TUTORADO') return;

    const turma = turmaRaw || lastTurma || 'Sem Turma';
    const tutor = tutorRaw || 'Sem Tutor';

    if (turmaRaw) lastTurma = turmaRaw;

    const key = `${formatTurma(turma)}__${tutor}`;
    if (!grupos.has(key)) {
      grupos.set(key, { turma: formatTurma(turma), tutor, tutorados: [] });
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
    const cleanUrl = url.trim();
    const idMatch = cleanUrl.match(/\/d\/([^/\s]+)/);
    let fetchUrl;
    if (idMatch) {
      const cleanId = idMatch[1].replace(/\s+/g, '');
      fetchUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=xlsx`;
    } else {
      fetchUrl = cleanUrl;
    }

    const proxyUrl = '/api/proxy?url=' + encodeURIComponent(fetchUrl);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy respondeu ${res.status} ao carregar tutores.`);
    const arrayBuffer = await res.arrayBuffer();
    const XLSX = await getXLSX();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    const baseNames = ['tutoria', 'tutores', 'base'];
    const exactBaseSheet = wb.SheetNames.find(sn => baseNames.includes(sn.toLowerCase().trim()));
    const sheetsToProcess = exactBaseSheet ? [exactBaseSheet] : wb.SheetNames;

    const allGruposMap = new Map(); // key: "turma__tutor"

    for (const sheetName of sheetsToProcess) {
      const ws = wb.Sheets[sheetName];
      const alunosArray = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (!alunosArray || alunosArray.length <= 1) continue;

      let headerIdx = 0;
      for (let r = 0; r < Math.min(alunosArray.length, 5); r++) {
        const rowTokens = (alunosArray[r] || []).map(normalizeHeaderToken);
        if (
          rowTokens.some(h => h.includes('TURMA') || h.includes('SERIE') || h.includes('CLASSE')) ||
          rowTokens.some(h => h.includes('TUTOR') || h.includes('PROFESSOR')) ||
          rowTokens.some(h => h.includes('ALUNO') || h.includes('TUTORADO') || h === 'NOME')
        ) {
          headerIdx = r;
          break;
        }
      }

      const header = alunosArray[headerIdx] || [];
      const normalizedHeader = header.map(normalizeHeaderToken);
      const hasStudentCol = normalizedHeader.some(h => 
        h.includes('TUTORADO') || h.includes('ALUNO') || h.includes('ESTUDANTE') || h === 'NOME' || h.includes('NOMEDOALUNO')
      );
      const hasTurmaCol = normalizedHeader.some(h => h.includes('TURMA') || h.includes('SERIE') || h.includes('CLASSE'));
      const isFormatoMedio =
        (normalizedHeader.includes('TURMA') && normalizedHeader.includes('TUTOR') && normalizedHeader.includes('TUTORADO')) ||
        (hasTurmaCol && hasStudentCol);

      const parsedSheetGrupos = isFormatoMedio
        ? parsePlanilhaTutoriaMedio(alunosArray.slice(headerIdx))
        : (() => {
            const tTurmaIdx = header.findIndex(h => h && String(h).toLowerCase().includes('turma'));
            const tTutorIdx = header.findIndex(h => h && ['tutor', 'professor'].some(kw => String(h).toLowerCase().includes(kw)));
            
            const colTurma = tTurmaIdx !== -1 ? tTurmaIdx : 1;
            const colTutor = tTutorIdx !== -1 ? tTutorIdx : 16;
            
            return alunosArray.slice(headerIdx + 1).map((row, idx) => {
              const startName = colTurma + 1;
              const endName = colTutor;
              const tutoradosRaw = row.slice(startName, endName) || [];
              const tutorados = tutoradosRaw
                .map(sanitizeCellText)
                .filter(t => t !== "" && !['ALUNO', 'NOME', 'SITUAÇÃO'].includes(t.toUpperCase()));
              
              const turmaSanitized = sanitizeCellText(row[colTurma]);
              const turmaRaw = turmaSanitized ? formatTurma(turmaSanitized) : formatTurma(sheetName);
              const tutorRaw = sanitizeCellText(row[colTutor]);
              
              return {
                id: idx,
                turma: turmaRaw || 'Sem Turma',
                tutorados,
                tutor: tutorRaw || 'Não Atribuído'
              };
            }).filter(item => item.tutorados.length > 0);
          })();

      parsedSheetGrupos.forEach(g => {
        const key = `${formatTurma(g.turma)}__${g.tutor}`;
        if (!allGruposMap.has(key)) {
          allGruposMap.set(key, { turma: formatTurma(g.turma), tutor: g.tutor, tutorados: [] });
        }
        const existing = allGruposMap.get(key);
        g.tutorados.forEach(nome => {
          if (!existing.tutorados.includes(nome)) {
            existing.tutorados.push(nome);
          }
        });
      });
    }

    const formattedAlunos = Array.from(allGruposMap.values()).map((g, idx) => ({
      id: idx,
      turma: g.turma,
      tutor: g.tutor,
      tutorados: g.tutorados
    }));

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

    // Encontra a coluna "Turma" para saber de onde os nomes começam
    const turmaIdx = headers.findIndex(h => h && String(h).toLowerCase().includes('turma'));
    const offset = (turmaIdx !== -1 && turmaIdx > 1) ? (turmaIdx - 1) : 0;

    // Encontra colunas de Professor e Tipo de forma dinâmica, com fallback pro offset
    let teacherIdx = headers.findIndex(h => 
      h && ['professor', 'tutor', 'educador', 'responsável'].some(kw => String(h).toLowerCase().includes(kw))
    );
    if (teacherIdx === -1) teacherIdx = 18 + offset;

    let tipoIdx = headers.findIndex(h => 
      h && ['tipo', 'sessão', 'motivo', 'assunto'].some(kw => String(h).toLowerCase().includes(kw))
    );
    if (tipoIdx === -1) tipoIdx = 19 + offset;

    // Os nomes dos alunos começam logo após a coluna da Turma
    const nameStart = turmaIdx !== -1 ? turmaIdx + 1 : (2 + offset);
    
    // O final do intervalo de nomes é antes da primeira coluna conhecida (Professor, Tipo, ou Anotação)
    const knownCols = [teacherIdx, tipoIdx, noteIdx].filter(idx => idx > nameStart);
    const nameEnd = knownCols.length > 0 ? Math.min(...knownCols) : (18 + offset);

    const parsedNotes = notesArray.slice(1).map(row => {
      const teacherRaw       = row[teacherIdx] ? String(row[teacherIdx]).trim() : '';
      const tipoAnotacaoRaw  = row[tipoIdx] ? String(row[tipoIdx]).trim() : '';
      const studentNameRaw   = row.slice(nameStart, nameEnd).find(name => name && String(name).trim() !== '') || '';
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

  // Removido o filtro de hiddenSheets genérico para permitir a leitura de abas ocultas do Ensino Fundamental

  // ── Parseador reutilizável por aba ─────────────────────────────────────────
  const parseSheet = (sheetName) => {
    // Extrai a turma e o bimestre do nome da aba (ex: "8A-2Bim" → turma: "8A", bim: "2º Bimestre")
    const parts = sheetName.split('-');
    const turmaDaAba = formatTurma(parts[0].trim());
    const bimRaw = parts[1] ? parts[1].trim() : sheetName;
    const bimestre = formatBimestre(bimRaw);

    const ws       = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (jsonData.length <= 1) return [];

    const headers  = jsonData[0] || [];
    const dataRows = jsonData.slice(1);

    // Coluna do nome: busca 'aluno'/'nome'
    const studentIdx = headers.findIndex(
      h => h && ['aluno', 'nome', 'tutorado'].some(kw => String(h).toLowerCase().includes(kw))
    );
    
    // Se não encontrou coluna de aluno, e a primeira coluna não parece ser aluno (ex: "Turma" ou "Tutor"), ignora
    if (studentIdx === -1 && headers.length > 0 && ['turma', 'tutor'].includes(String(headers[0]).toLowerCase().trim())) {
        return [];
    }
    const finalStudentIdx = studentIdx !== -1 ? studentIdx : 0;

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
      ppSubjects.push({ index: col, name: expandSiglaDisciplina(name) });
    }

    return dataRows
      .map(row => {
        const alunoNome = row[finalStudentIdx];
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
          bimestre,
        };
      })
      .filter(Boolean);
  };

  // ── Lê TODAS as abas e combina ────────────────────────────────────────────
  const allParsed = [];
  wb.SheetNames.forEach(sheetName => {
    // Ignora apenas se a aba se chamar EXATAMENTE "tutoria", "tutores", ou "base"
    const sn = sheetName.trim().toLowerCase();
    if (sn === 'tutoria' || sn === 'tutores' || sn === 'base') return;
    
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

  // Removido o filtro de hiddenSheets genérico para permitir a leitura de abas ocultas do Ensino Fundamental

  wb.SheetNames.forEach(nomeDaGuia => {
    // Ignora apenas se a aba se chamar EXATAMENTE "tutoria", "tutores", ou "base"
    const sn = nomeDaGuia.trim().toLowerCase();
    if (sn === 'tutoria' || sn === 'tutores' || sn === 'base') return;
    
    const ws       = wb.Sheets[nomeDaGuia];
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
    let turmaPlanilha = '';
    let bimestreRaw   = '';

    // Suporte ao padrão Turma-Bimestre (ex: "1A-1B", "3E-3B", "7A_2B", "1A - 1º Bi", "3E - 3º Bimestre")
    const bimMatch = nomeDaGuia.match(/^(.+?)[-_\s]+([1-4]\s*(?:º|o|ª|b\b|bim|bime|bimestre).*)$/i);
    if (bimMatch) {
      turmaPlanilha = formatTurma(bimMatch[1].trim());
      bimestreRaw = formatBimestre(bimMatch[2].trim());
    } else {
      turmaPlanilha = formatTurma(nomeDaGuia);
      bimestreRaw = formatBimestre(nomeDaGuia);
    }

    let headerRowIdx  = -1;
    let alunoColIdx   = -1;

    for (let i = 0; i < Math.min(jsonData.length, 35); i++) {
        const row = jsonData[i] || [];
        
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          const norm = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

          if (norm === 'TURMA' || norm === 'TURMA:' || norm.startsWith('TURMA:')) {
            const nextVal = row[c + 1] ? String(row[c + 1]).trim() : val.replace(/^TURMA\s*:?\s*/i, '').trim();
            if (nextVal) {
              const formatted = formatTurma(nextVal);
              if (formatted && formatted !== 'Desconhecida') {
                turmaPlanilha = formatted;
              }
            }
          }

          if (norm.startsWith('TIPO FECHAM') || norm.startsWith('TIPO DE FECHAM') || norm.includes('FECHAMENTO')) {
            const nextVal = row[c + 1] ? String(row[c + 1]).trim() : val;
            if (nextVal) {
              bimestreRaw = formatBimestre(nextVal);
            }
          }

          if (norm === 'ALUNO' || norm === 'ALUNOS' || norm === 'NOME' || norm === 'ESTUDANTE' || norm === 'TUTORADO' || norm.includes('NOME DO ALUNO') || norm.includes('NOMEDOALUNO')) {
            headerRowIdx = i;
            alunoColIdx = c;
            break;
          }
        }
        if (headerRowIdx !== -1) break;
    }

    // Aplica a formatação à turma
    turmaPlanilha = turmaPlanilha && turmaPlanilha !== 'Desconhecida' ? formatTurma(String(turmaPlanilha)) : 'Desconhecida';

    if (headerRowIdx !== -1) {
        if (alunoColIdx === -1) alunoColIdx = 0;
        let headers  = jsonData[headerRowIdx];
        
        const nextRow = jsonData[headerRowIdx + 1] || [];
        const isNextRowAStudent = nextRow[alunoColIdx] && 
          typeof nextRow[alunoColIdx] === 'string' && 
          String(nextRow[alunoColIdx]).trim().length > 3 &&
          !['DISCIPLINA', 'COMPONENTE', 'CH', 'AULAS'].some(w => String(nextRow[alunoColIdx]).toUpperCase().includes(w));

        if (!isNextRowAStudent && (!nextRow[0] || String(nextRow[0]).trim() === '' || (!nextRow[alunoColIdx] || String(nextRow[alunoColIdx]).trim() === ''))) {
          const maxLen = Math.max(headers.length, nextRow.length);
          headers = Array.from({ length: maxLen }).map((_, i) => {
              const h = headers[i];
              const subH = nextRow[i];
              if (h && subH) return `${h}\n${subH}`;
              return h || subH || '';
          });
          headerRowIdx++;
        }

        const rowsAfterHeader = jsonData.slice(headerRowIdx + 1);

        // A coluna de frequencia é a ultima coluna com dados da planilha do conselho de classe (mapão)
        let lastDataColIdx = -1;
        for (let i = headers.length - 1; i >= 0; i--) {
          if (headers[i] !== undefined && headers[i] !== null && String(headers[i]).trim() !== '') {
            lastDataColIdx = i;
            break;
          }
        }
        for (let r = 0; r < Math.min(rowsAfterHeader.length, 30); r++) {
          const row = rowsAfterHeader[r];
          if (!row || !row[0]) continue;
          const nomeTest = String(row[0]).trim().toUpperCase();
          if (nomeTest.includes('LEGENDA') || nomeTest.startsWith('C -')) break;
          for (let c = row.length - 1; c >= 0; c--) {
            if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
              if (c > lastDataColIdx) {
                lastDataColIdx = c;
              }
              break;
            }
          }
        }

        const subjects = [];
        const attendanceIndexColumns = [];
        let tfIdx = -1;
        let freqIdx = lastDataColIdx;
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

            if (tfIdx === -1 && isTf) {
              tfIdx = idx;
            }

            const isSituacaoH = compact === 'SITUACAO' || 
                               compact.includes('SITUACAO') || 
                               compact === 'CONDICAO' || 
                               compact.includes('CONDICAO') ||
                               compact === 'STATUS' || 
                               compact.includes('STATUS');
            if (situacaoIdx === -1 && isSituacaoH && idx !== alunoColIdx) {
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

            // A última coluna com dados é a coluna de frequência (não deve ser matéria)
            if (idx !== freqIdx && !isTf && !isExcluded && !isAttendanceIndex) {
              if (subjectName) {
                subjects.push({ index: idx, name: expandSiglaDisciplina(subjectName) });
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

        // Se situacaoIdx não foi localizada pelo cabeçalho, procura na frente do nome nas primeiras linhas de dados
        if (situacaoIdx === -1) {
          for (let r = 0; r < Math.min(rowsAfterHeader.length, 15); r++) {
            const rData = rowsAfterHeader[r];
            if (!rData) continue;
            for (let c = 0; c < Math.min(rData.length, 8); c++) {
              if (c === alunoColIdx || c === tfIdx) continue;
              const val = String(rData[c] || '').trim();
              if (/^(ativo|ativa|n[aã]o\s*comparec.*|baixa.*|transfer.*|remanej.*|abandono|cessou.*|cancelad.*)$/i.test(val)) {
                situacaoIdx = c;
                break;
              }
            }
            if (situacaoIdx !== -1) break;
          }
        }

        const validSubjects = subjects.filter(sub => sub.index !== alunoColIdx && sub.index !== situacaoIdx && sub.index !== tfIdx && sub.index !== freqIdx);
        const dadosDaGuia = [];

        for (const row of rowsAfterHeader) {
          if (!row || !row.length) continue;

          let alunoNome = '';
          let actualAlunoCol = alunoColIdx;
          const candidate = row[alunoColIdx];
          if (candidate !== undefined && candidate !== null) {
            const strVal = String(candidate).trim();
            if (!/^\d+$/.test(strVal) && strVal.length >= 2 && !/^\d{6,}/.test(strVal)) {
              alunoNome = strVal;
            }
          }

          // Se a coluna alunoColIdx era um número (Nº chamada) ou RA ou vazia, busca a coluna com o nome do aluno
          if (!alunoNome) {
            for (let c = 0; c < Math.min(row.length, 6); c++) {
              if (c === situacaoIdx || c === tfIdx) continue;
              const cellVal = String(row[c] || '').trim();
              if (
                cellVal.length >= 3 &&
                /[a-zA-ZÀ-ÿ]{2,}/.test(cellVal) &&
                !/^\d+/.test(cellVal) &&
                !/^(aluno|alunos|nome|ra|numero|nº|situacao|total|legenda|ch|faltas|freq|frequencia)$/i.test(cellVal)
              ) {
                alunoNome = cellVal;
                actualAlunoCol = c;
                break;
              }
            }
          }

          const nomeNormalizado = String(alunoNome || '').trim().toUpperCase();

          if (!nomeNormalizado) continue;

          // Se for cabeçalho repetido ou indicador de aulas/situação, pula a linha sem abortar a leitura da turma
          if (
            nomeNormalizado === 'ALUNO' || 
            nomeNormalizado === 'ALUNOS' || 
            nomeNormalizado === 'SITUAÇÃO' || 
            nomeNormalizado.includes('NOME DO ALUNO') ||
            nomeNormalizado.includes('AULAS DADAS') ||
            nomeNormalizado.includes('CARGA HORARIA') ||
            nomeNormalizado.startsWith('C -') ||
            nomeNormalizado.startsWith('NC -')
          ) {
            continue; 
          }

          // Apenas encerra se for de fato o rodapé da folha
          if (
            nomeNormalizado.startsWith('LEGENDA') || 
            nomeNormalizado.startsWith('TOTAL GERAL') || 
            nomeNormalizado.startsWith('TOTAL DE ALUNOS') ||
            nomeNormalizado.startsWith('DIRETOR DE ESCOLA') ||
            nomeNormalizado.startsWith('COORDENADOR')
          ) {
            break; 
          }

          let notas = {};
          validSubjects.forEach(sub => {
              notas[sub.name] = row[sub.index] ? String(row[sub.index]).trim() : '-';
          });

          const attendanceIndexes = {};
          attendanceIndexColumns.forEach((col) => {
            attendanceIndexes[col.name] = row[col.index] ? String(row[col.index]).trim() : '-';
          });
          
          const tfBimestre = tfIdx !== -1 && row[tfIdx] !== undefined && row[tfIdx] !== null && String(row[tfIdx]).trim() !== ''
              ? String(row[tfIdx]).trim()
              : '-';
          
          // A coluna de frequência é a última coluna com dados da planilha do conselho de classe (mapão)
          let freqBimestre = '-';
          if (freqIdx !== -1 && row[freqIdx] !== undefined && row[freqIdx] !== null && String(row[freqIdx]).trim() !== '') {
            freqBimestre = String(row[freqIdx]).trim();
          } else {
            for (let c = row.length - 1; c >= 1; c--) {
              if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
                freqBimestre = String(row[c]).trim();
                break;
              }
            }
          }
              
          let situacao = '';
          if (situacaoIdx !== -1 && situacaoIdx !== actualAlunoCol) {
            const situacaoRaw = row[situacaoIdx];
            if (situacaoRaw !== undefined && situacaoRaw !== null && String(situacaoRaw).trim() !== '') {
              situacao = String(situacaoRaw).trim();
            }
          }

          // Se não encontrou por situacaoIdx, verifica a célula imediatamente à frente do nome do aluno (actualAlunoCol + 1)
          if (!situacao && actualAlunoCol >= 0 && actualAlunoCol + 1 < row.length) {
            const nextCellVal = String(row[actualAlunoCol + 1] || '').trim();
            if (
              nextCellVal &&
              !/^\d+([.,]\d+)?$/.test(nextCellVal) &&
              !/^[MBRI]$/i.test(nextCellVal) &&
              nextCellVal !== '-'
            ) {
              situacao = nextCellVal;
            }
          }

          // Fallback: varre colunas adjacentes ao nome do aluno por termos conhecidos de status
          if (!situacao) {
            for (let c = 0; c < Math.min(row.length, 8); c++) {
              if (c === actualAlunoCol || c === tfIdx) continue;
              const cellVal = String(row[c] || '').trim();
              if (/^(ativo|ativa|n[aã]o\s*comparec.*|baixa.*|transfer.*|remanej.*|abandono|cessou.*|cancelad.*|desist.*|inativ.*)$/i.test(cellVal)) {
                situacao = cellVal;
                break;
              }
            }
          }

          if (!situacao) {
            situacao = 'Ativo';
          }

          dadosDaGuia.push({
              nomeOriginal: String(alunoNome).trim(),
              normalizedName: normalizeName(alunoNome),
              bimestre: formatBimestre(bimestreRaw),
              turmaPlanilha: turmaPlanilha,
              notas,
              attendanceIndexes,
              tfBimestre,
              freqBimestre,
              frequencia: freqBimestre,
              frequenciaGeral: freqBimestre,
              faltas: tfBimestre,
              situacao
          });
        }

        todosConceitos = [...todosConceitos, ...dadosDaGuia];
    }
  });
  return todosConceitos;
};

// ─────────────────────────────────────────────────────────────────────────────────────
// Lê e estrutura a planilha de acompanhamento por disciplinas
// Identifica Turma e Bimestre pelo nome da aba (ex: "6A-1B" -> Turma 6A, 1º Bimestre)
// e filtra os dados onde a Coluna D (índice 3) é a Disciplina.
// ─────────────────────────────────────────────────────────────────────────────────────
export const fetchDisciplinaSheet = async (url) => {
  if (!url) return null;

  try {
    const cleanUrl = url.trim();
    const idMatch = cleanUrl.match(/\/d\/([^/\s]+)/);
    let fetchUrl;
    if (idMatch) {
      const cleanId = idMatch[1].replace(/\s+/g, '');
      fetchUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/export?format=xlsx`;
    } else {
      fetchUrl = cleanUrl;
    }

    const proxyUrl = '/api/proxy?url=' + encodeURIComponent(fetchUrl);
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Proxy respondeu ${res.status} ao carregar planilha de disciplinas.`);
    const arrayBuffer = await res.arrayBuffer();
    const XLSX = await getXLSX();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    const parsedRows = [];
    const headersBySheet = {};

    wb.SheetNames.forEach(sheetName => {
      const snLower = sheetName.trim().toLowerCase();
      if (snLower === 'tutoria' || snLower === 'tutores' || snLower === 'base') return;

      // Extrai Turma e Bimestre pelo nome da aba (ex: "6A-1B", "7B-2Bim", "6A_1B")
      // O bimestre é identificado pelo primeiro dígito (1-4) após o separador,
      // tolerando erros de digitação como "6A-3C".
      let turma = '';
      let bimestre = '';
      const sepMatch = sheetName.match(/^(.+?)[-_\s]+(.+)$/);
      if (sepMatch) {
        turma = formatTurma(sepMatch[1].trim());
        const bimRaw = sepMatch[2].trim();
        const digit = bimRaw.match(/[1-4]/);
        bimestre = digit ? `${digit[0]}º Bimestre` : formatBimestre(bimRaw);
      } else {
        turma = formatTurma(sheetName);
        bimestre = formatBimestre(sheetName);
      }

      const ws = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!jsonData || jsonData.length <= 1) return;

      // Identifica a linha de cabeçalho
      let headerIdx = 0;
      if (
        jsonData[0] &&
        jsonData[0].filter(c => c !== '').length <= 1 &&
        jsonData[1] &&
        jsonData[1].filter(c => c !== '').length > 1
      ) {
        headerIdx = 1;
      }

      const rawHeaders = jsonData[headerIdx] || [];
      const headers = rawHeaders.map((h, colIdx) => {
        const val = String(h || '').trim();
        if (val) return val;
        if (colIdx === 3) return 'Disciplina';
        return `Coluna ${String.fromCharCode(65 + (colIdx % 26))}`;
      });

      headersBySheet[sheetName] = headers;
      const dataRows = jsonData.slice(headerIdx + 1);

      dataRows.forEach((row, rIdx) => {
        if (!row || !row.some(c => c !== undefined && c !== null && String(c).trim() !== '')) {
          return;
        }

        // Coluna D é a disciplina (índice 3: A=0, B=1, C=2, D=3)
        const disciplinaRaw = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
        if (!disciplinaRaw || isRefSpreadsheetError(disciplinaRaw)) return;

        // Remove o código numérico do final (ex: "CIÊNCIAS - 8468" → "CIÊNCIAS")
        // para unificar a mesma disciplina entre bimestres.
        const disciplina = formatDisciplina(disciplinaRaw.replace(/\s*-\s*\d+\s*$/, '').trim());

        const cells = headers.map((header, colIdx) => {
          const raw = row[colIdx];
          let value = raw !== undefined && raw !== null ? sanitizeCellText(raw) : '';
          // Colunas de porcentagem com valor decimal (0.1875 → 18.8%)
          if (header.includes('%') && typeof raw === 'number' && raw >= 0 && raw <= 1) {
            value = `${(raw * 100).toFixed(1).replace('.', ',')}%`;
          }
          return { header, value };
        });

        parsedRows.push({
          id: `${sheetName}_${rIdx}`,
          sheetName,
          turma: turma || 'Sem Turma',
          bimestre: bimestre || '1º Bimestre',
          disciplina,
          disciplinaRaw,
          cells,
          rawRow: row
        });
      });
    });

    return {
      rows: parsedRows,
      headersBySheet,
      turmas: Array.from(new Set(parsedRows.map(r => r.turma).filter(Boolean))),
      disciplinas: Array.from(new Set(parsedRows.map(r => r.disciplina).filter(Boolean))),
      bimestres: Array.from(new Set(parsedRows.map(r => r.bimestre).filter(Boolean))),
    };
  } catch (error) {
    console.error('[fetchDisciplinaSheet] Falhou:', error.message);
    throw new Error(
      'Não foi possível carregar a planilha de disciplinas. Verifique se o link está correto e se o arquivo está público.'
    );
  }
};

