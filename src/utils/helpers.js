// ─────────────────────────────────────────────────────────────
// utils/helpers.js — Funções puras reutilizáveis do TutorDash
// ─────────────────────────────────────────────────────────────

export const normalizeName = (name) => {
  if (!name) return '';
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
};

export const formatBimestre = (text) => {
  const t = String(text).toLowerCase();
  if (t.includes('primeiro') || t.includes('1º')) return '1º Bimestre';
  if (t.includes('segundo')  || t.includes('2º')) return '2º Bimestre';
  if (t.includes('terceiro') || t.includes('3º')) return '3º Bimestre';
  if (t.includes('quarto')   || t.includes('4º')) return '4º Bimestre';
  return text.trim();
};

export const parseGrade = (val) => {
  if (val === undefined || val === null || val === '-') return 0;
  const str = String(val).toUpperCase().trim();
  if (str === 'MB') return 10;
  if (str === 'B')  return 8;
  if (str === 'R')  return 5;
  if (str === 'I')  return 2;
  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

// Converte nota da Prova Paulista para escala 0–10.
// O XLSX armazena células de percentual como decimal (53,75% → 0.5375).
// Suporta: "53,75%" → 5.38 | "0.5375" → 5.38 | "5,37" → 5.37
export const toScale10 = (raw) => {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str || str === '-') return null;
  const isPercent = str.includes('%');
  const numeric = parseFloat(str.replace('%', '').replace(',', '.'));
  if (Number.isNaN(numeric)) return null;
  if (isPercent)    return numeric / 10;   // "53,75%" → 5.375
  if (numeric <= 1) return numeric * 10;   // "0.5375" → 5.375  (decimal XLSX)
  if (numeric > 10) return numeric / 10;   // "53,75"  → 5.375
  return numeric;                           // "5,37"   → 5.37
};

export const checkIsTutor = (tutor, registrar) => {
  if (!tutor || !registrar) return false;
  const t = normalizeName(tutor);
  const r = normalizeName(registrar);
  if (t === r) return true;
  const tParts = t.split(' ');
  const rParts = r.split(' ');
  if (tParts.length > 1 && rParts.length > 1) {
    const firstMatch  = tParts[0] === rParts[0];
    const lastMatch   = tParts[tParts.length - 1] === rParts[rParts.length - 1];
    const secondMatch = tParts[1] === rParts[1];
    if (firstMatch && (secondMatch || lastMatch)) return true;
  }
  return false;
};

export const fetchWithFallback = async (url) => {
  // Limpa espaços acidentais e sanitiza o ID do Google Sheets
  const cleanUrl = url.trim();
  let fetchUrl = cleanUrl;

  const idMatch = cleanUrl.match(/\/d\/([^/\s]+)/);
  if (idMatch) {
    const cleanId = idMatch[1].replace(/\s+/g, '');
    // Preserva o restante da URL original após o ID
    fetchUrl = cleanUrl.replace(idMatch[1], cleanId);
  }

  // Passa pela Vercel Edge sem cache-busting (_t ou cache:'no-store'):
  // o s-maxage definido no proxy permite que a CDN sirva da cache por 60 s,
  // reduzindo latência e evitando hits desnecessários ao Google.
  // Nota: NÃO adicionamos _t aqui — uma URL estável é condição obrigatória
  // para o cache de Edge funcionar.
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(fetchUrl)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(
      `Não foi possível carregar a planilha (status ${res.status}). ` +
      'Verifique se o link está correto e se a planilha está pública.'
    );
  }
  return res;
};

export const formatDisciplina = (nome) => {
  if (!nome) return '';
  const n = String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  
  if (n.includes('ORIENTA') && n.includes('LINGU')) return 'OE: Língua Portuguesa';
  if (n.includes('ORIENTA') && n.includes('MATEM')) return 'OE: Matemática';
  if (n.includes('ORIENTA') && n.includes('PORT'))  return 'OE: Língua Portuguesa';
  if (n.startsWith('OE ') || n.startsWith('OE:')) {
    if (n.includes('LINGU') || n.includes('PORT')) return 'OE: Língua Portuguesa';
    if (n.includes('MAT')) return 'OE: Matemática';
  }
  
  return nome;
};

export const formatTurma = (turma) => {
  if (!turma) return '';
  let str = String(turma).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  
  if (!/\d/.test(str)) {
      if (str.includes('SEM TURMA')) return 'SEM TURMA';
      return str.trim();
  }

  // Treat cases like "3A SERIE" vs "1A"
  str = str.replace(/(\d)[AO]\s+(SERIE|ANO)/g, '$1 $2');
  
  // Separate number and attached letter "1A" -> "1 A"
  str = str.replace(/(\d)([A-Z])/g, '$1 $2');
  
  let cleaned = str.replace(/[ºª°]/g, ' ')
                   .replace(/\b\d+H\b/g, ' ')
                   .replace(/\b[A-Z]{2,}\b/g, ' '); 

  const nMatch = cleaned.match(/\d+/);
  const lMatch = cleaned.match(/\b([A-Z])\b/);
  
  if (nMatch && lMatch) {
      return `${nMatch[0]}${lMatch[1]}`;
  } else if (nMatch) {
      return `${nMatch[0]}`;
  }
  
  return str.trim();
};

export const getSerieFromTurma = (turma) => {
  if (!turma) return 'Sem Nível';
  const str = String(turma).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const nMatch = str.match(/\d+/);
  if (!nMatch) {
    if (str.includes('SEM TURMA')) return 'Sem Nível';
    return str.trim();
  }
  const num = parseInt(nMatch[0], 10);
  if (num >= 6 && num <= 9) return `${num}º Ano`;
  if (num >= 1 && num <= 3) return `${num}ª Série`;
  return `${num}º Ano/Série`;
};

// ─────────────────────────────────────────────────────────────
// parseProvaPaulistaExcel
// Lê um ArrayBuffer de um .xlsx com abas no padrão "{Turma}-{Bimestre}"
// (ex: "6A-1Bim") e retorna dados comparativos Aluno vs Turma.
//
// @param {ArrayBuffer} arrayBuffer   - Bytes do arquivo .xlsx
// @param {string}      studentName   - Nome do aluno a pesquisar
// @param {Array}       allStudents   - Lista global de alunos [{nome, turma, ...}]
// @param {string}      targetBimestre - Ex: "1º Bimestre", "2Bim", "Primeiro", etc.
// @returns {Array} [{ subject, Aluno, Turma }, ...]  Aluno/Turma em escala 0–10
// ─────────────────────────────────────────────────────────────
export const parseProvaPaulistaExcel = (arrayBuffer, studentName, allStudents, targetBimestre) => {
  try {
    if (!arrayBuffer || !studentName || !allStudents?.length) return [];

    // 1. Encontrar a turma do aluno em allStudents
    const normalizedTarget = normalizeName(studentName);
    const foundStudent = allStudents.find(
      (s) => normalizeName(s.nome) === normalizedTarget
    );
    if (!foundStudent?.turma) return [];

    // 2. Normalizar turma → "6A", "7B", etc.
    const normalizedTurma = formatTurma(foundStudent.turma);
    if (!normalizedTurma) return [];

    // 3. Normalizar bimestre → "1Bim", "2Bim", "3Bim", "4Bim"
    const bimStr = String(targetBimestre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    let bimNum = null;
    if (bimStr.includes('1') || bimStr.includes('PRIMEIRO') || bimStr.includes('PRIMEIR')) bimNum = 1;
    else if (bimStr.includes('2') || bimStr.includes('SEGUNDO') || bimStr.includes('SEGUND')) bimNum = 2;
    else if (bimStr.includes('3') || bimStr.includes('TERCEIRO') || bimStr.includes('TERCEIR')) bimNum = 3;
    else if (bimStr.includes('4') || bimStr.includes('QUARTO') || bimStr.includes('QUART')) bimNum = 4;
    if (!bimNum) return [];

    const normalizedBimestre = `${bimNum}Bim`;
    const targetSheetName = `${normalizedTurma}-${normalizedBimestre}`;

    // 4. Ler workbook (importação dinâmica síncrona via require-style é inviável no ESM;
    //    quem chamar esta função deve importar XLSX e passá-lo, OU usamos o import global)
    //    A convenção do projeto é: o chamador importa XLSX e passa o arrayBuffer já lido.
    //    Aqui usamos a referência global window.XLSX ou o XLSX importado no topo do bundle.
    // eslint-disable-next-line no-undef
    const XLSX = (typeof globalThis !== 'undefined' && globalThis.XLSX)
      ? globalThis.XLSX
      // fallback: tenta require (só em ambientes CJS/test)
      // eslint-disable-next-line no-undef
      : (typeof require !== 'undefined' ? require('xlsx') : null);

    if (!XLSX) return [];

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // 4. Acesso O(1) à aba
    const sheet = workbook.Sheets[targetSheetName];
    if (!sheet) return [];

    // 5. Converte para JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (!rows.length) return [];

    // 6. Set de nomes dos alunos da mesma turma (normalizado)
    const turmaSet = new Set(
      allStudents
        .filter((s) => formatTurma(s.turma) === normalizedTurma)
        .map((s) => normalizeName(s.nome))
    );

    // Função para converter nota percentual ou decimal em escala 0–10
    const toScale10 = (val) => {
      if (val === undefined || val === null) return null;
      const str = String(val).trim();
      if (!str || str === '-') return null;
      const isPercent = str.includes('%');
      const numeric = parseFloat(str.replace('%', '').replace(',', '.'));
      if (Number.isNaN(numeric)) return null;
      if (isPercent) {
        // "48,8%" → 48.8 → escala 0-10: 4.88
        return numeric / 10;
      }
      if (numeric > 0 && numeric <= 1) {
        // decimal 0.488 → 4.88
        return numeric * 10;
      }
      // valor já em escala 0-10 ou 0-100
      if (numeric > 10) return numeric / 10;
      return numeric;
    };

    // Detecta automaticamente as colunas de disciplina
    // (ignora "Nome", colunas de presença, etc.)
    const IGNORE_KEYS_UPPER = new Set([
      'NOME', 'NAME', 'ALUNO', 'TURMA', 'CLASSE', 'CLASS',
      'F', 'AC', 'FTAN', 'FREAN', 'FREQUENCIA', 'FREQUÊNCIA',
      'SITUACAO', 'SITUAÇÃO', 'STATUS',
    ]);
    const firstRow = rows[0] || {};
    const subjectKeys = Object.keys(firstRow).filter((k) => {
      const upper = String(k).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      return !IGNORE_KEYS_UPPER.has(upper);
    });

    // 7. Acumula notas por disciplina
    const subjectData = {};
    subjectKeys.forEach((key) => {
      subjectData[key] = { somaTurma: 0, countTurma: 0, notaAluno: null };
    });

    const normalizedStudentName = normalizeName(studentName);

    rows.forEach((row) => {
      const rowName = normalizeName(String(row['Nome'] ?? row['NOME'] ?? row['Aluno'] ?? row['ALUNO'] ?? ''));
      if (!rowName) return;

      const isFromTurma = turmaSet.has(rowName);
      const isTargetStudent = rowName === normalizedStudentName;

      subjectKeys.forEach((key) => {
        const nota = toScale10(row[key]);
        if (nota === null) return;

        if (isFromTurma) {
          subjectData[key].somaTurma += nota;
          subjectData[key].countTurma += 1;
        }
        if (isTargetStudent) {
          subjectData[key].notaAluno = nota;
        }
      });
    });

    // 8. Monta resultado final
    const result = subjectKeys.map((key) => {
      const d = subjectData[key];
      const mediaTurma = d.countTurma > 0
        ? Math.round((d.somaTurma / d.countTurma) * 100) / 100
        : null;
      return {
        subject: String(key).trim(),
        Aluno: d.notaAluno !== null ? Math.round(d.notaAluno * 100) / 100 : null,
        Turma: mediaTurma,
      };
    }).filter((item) => item.Aluno !== null || item.Turma !== null);

    return result;
  } catch {
    return [];
  }
};
