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

export const getBimestreNum = (text) => {
  if (!text) return 0;
  const t = String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Se contiver separador (ex: "1A-3B", "3E - 2º Bimestre", "7B_4B"), analisa preferencialmente a parte do bimestre
  const parts = t.split(/[-_/]+/);
  if (parts.length > 1) {
    for (let i = parts.length - 1; i >= 1; i--) {
      const part = parts[i].trim();
      const match = part.match(/([1-4])\s*(?:º|o|ª|b\b|bim|bime|bimestre)?/);
      if (match) return parseInt(match[1], 10);
    }
  }

  // 2. Busca padrões explícitos como "1º Bimestre", "1B", "1 bim", "primeiro"
  if (t.match(/1\s*(?:º|o|ª|bim|b\b|bime|bimestre)/) || t.includes('primeiro')) return 1;
  if (t.match(/2\s*(?:º|o|ª|bim|b\b|bime|bimestre)/) || t.includes('segundo')) return 2;
  if (t.match(/3\s*(?:º|o|ª|bim|b\b|bime|bimestre)/) || t.includes('terceiro')) return 3;
  if (t.match(/4\s*(?:º|o|ª|bim|b\b|bime|bimestre)/) || t.includes('quarto')) return 4;

  // 3. Fallback para dígitos isolados
  const digitMatch = t.match(/\b([1-4])\b/);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  if (t.includes('1')) return 1;
  if (t.includes('2')) return 2;
  if (t.includes('3')) return 3;
  if (t.includes('4')) return 4;
  return 0;
};

export const formatBimestre = (text) => {
  if (!text) return '1º Bimestre';
  const t = String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Se for no formato Turma-Bimestre (ex: "1A-3B", "3E-1B"), extrai o bimestre da parte apropriada
  const parts = t.split(/[-_/]+/);
  let bimTarget = t;
  if (parts.length > 1) {
    const bimPart = parts.slice(1).reverse().find(p => /[1-4]/.test(p));
    if (bimPart) bimTarget = bimPart;
  }

  const num = getBimestreNum(bimTarget);
  if (num >= 1 && num <= 4) return `${num}º Bimestre`;

  return text.trim();
};

export const matchesBimestre = (bimName, selectedBim) => {
  if (!bimName) return false;
  const raw = String(bimName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const target = String(selectedBim || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (target === 'geral' || target.includes('media')) return true;

  const targetNum = getBimestreNum(target);
  const rawNum = getBimestreNum(raw);
  if (targetNum > 0 && rawNum > 0) {
    return targetNum === rawNum;
  }

  return raw === target;
};

export const isStudentActive = (situacao) => {
  if (!situacao) return true;
  const s = String(situacao).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Qualquer indicação de não comparecimento, baixa, transferência, abandono, cancelamento, etc. significa inativo
  if (
    s.includes('comparec') || // Cobre "nao comparecimento", "nao compareceu", etc.
    s.includes('baixa') ||
    s.includes('transferen') ||
    s.includes('transferid') ||
    s.includes('remanej') ||
    s.includes('abandono') ||
    s.includes('cessou') ||
    s.includes('cessad') ||
    s.includes('cancelad') ||
    s.includes('desist') ||
    s.includes('falec') ||
    s.includes('inativ') ||
    s.includes('sem matricula') ||
    s.includes('sem registro')
  ) {
    return false;
  }

  // Regra expressa do Mapão SED:
  // O aluno só é considerado ativo se na frente do nome constar expressamente a palavra "Ativo" / "Ativa"
  // (ou termos afins de matrícula regular como "Matriculado" / "Frequente")
  const hasAtivo = /\b(ativo|ativa)\b/i.test(s) || s.includes('matriculad') || s.includes('frequente');
  return hasAtivo;
};

export const resolveStudentActiveTurma = (normalizedName, defaultTurma = '', conceitoData = [], provaData = []) => {
  const norm = normalizeName(normalizedName);
  const def = formatTurma(defaultTurma) || defaultTurma;
  const historicoTurmas = {};

  const isValidTurma = (t) => {
    if (!t) return false;
    const s = String(t).trim();
    return s !== '' && !s.startsWith('405') && !s.startsWith('406') && s !== 'Sem Turma' && s !== 'Desconhecida';
  };

  const validMapaoTurmas = new Set();
  (conceitoData || []).forEach(c => {
    const t = formatTurma(c.turmaPlanilha);
    if (isValidTurma(t)) validMapaoTurmas.add(t);
  });
  const hasMapao = validMapaoTurmas.size > 0;

  // Coleta registros do Mapão
  (conceitoData || []).forEach(c => {
    if (c.normalizedName === norm && isValidTurma(c.turmaPlanilha)) {
      const bNum = getBimestreNum(c.bimestre);
      if (bNum > 0) {
        const current = historicoTurmas[bNum];
        if (!current) {
          historicoTurmas[bNum] = {
            turma: formatTurma(c.turmaPlanilha),
            situacao: c.situacao || 'Ativo',
            origem: 'mapao'
          };
        } else {
          const curActive = isStudentActive(current.situacao);
          const newActive = isStudentActive(c.situacao);
          // O registro Ativo prevalece sobre registro de Transferência/Baixa de turma anterior no mesmo bimestre
          if (!curActive && newActive) {
            historicoTurmas[bNum] = {
              turma: formatTurma(c.turmaPlanilha),
              situacao: c.situacao || 'Ativo',
              origem: 'mapao'
            };
          } else if (curActive === newActive) {
            const curHasGrades = current.notas && Object.keys(current.notas).length > 0;
            const newHasGrades = c.notas && Object.keys(c.notas).length > 0;
            if (!curHasGrades && newHasGrades) {
              historicoTurmas[bNum] = {
                turma: formatTurma(c.turmaPlanilha),
                situacao: c.situacao || 'Ativo',
                origem: 'mapao'
              };
            }
          }
        }
      }
    }
  });

  // Coleta registros da Prova Paulista como fallback para bimestres sem Mapão
  (provaData || []).forEach(p => {
    if (p.normalizedName === norm && isValidTurma(p.turmaPlanilha)) {
      const pTurma = formatTurma(p.turmaPlanilha);
      // Se há turmas no Mapão SED carregadas, só aceita a turma da Prova Paulista se ela existir no Mapão SED
      if (hasMapao && !validMapaoTurmas.has(pTurma)) {
        return;
      }
      const bNum = getBimestreNum(p.bimestre);
      if (bNum > 0 && !historicoTurmas[bNum]) {
        historicoTurmas[bNum] = {
          turma: pTurma,
          situacao: 'Ativo',
          origem: 'prova'
        };
      }
    }
  });

  // Identifica a turma do bimestre mais recente
  // 1. Prioriza o bimestre mais recente em que o aluno esteja expressamente ATIVO
  let highestActiveBim = 0;
  let turmaAtiva = '';
  [4, 3, 2, 1].forEach(b => {
    if (highestActiveBim === 0 && historicoTurmas[b]?.turma && isStudentActive(historicoTurmas[b].situacao)) {
      highestActiveBim = b;
      turmaAtiva = historicoTurmas[b].turma;
    }
  });

  // 2. Se não houver nenhum registro ativo, usa o bimestre mais recente registrado como fallback
  if (!turmaAtiva) {
    [4, 3, 2, 1].forEach(b => {
      if (!turmaAtiva && historicoTurmas[b]?.turma) {
        turmaAtiva = historicoTurmas[b].turma;
      }
    });
  }

  if (!turmaAtiva) {
    if (hasMapao && def && !validMapaoTurmas.has(def)) {
      turmaAtiva = 'Sem Turma';
    } else {
      turmaAtiva = def || 'Sem Turma';
    }
  }

  // Mapeia histórico simples { 1: "7D", 2: "7D", 3: "7A" }
  const turmasPorBimestre = {};
  [1, 2, 3, 4].forEach(b => {
    if (historicoTurmas[b]?.turma) {
      turmasPorBimestre[b] = historicoTurmas[b].turma;
    }
  });

  const isTransferido = (turmaAtiva && def && formatTurma(turmaAtiva) !== formatTurma(def)) ||
    Object.values(turmasPorBimestre).some(t => formatTurma(t) !== formatTurma(turmaAtiva));

  return {
    turmaAtiva: turmaAtiva || def || 'Sem Turma',
    turmaOriginal: def || 'Sem Turma',
    isTransferido,
    historicoTurmas: turmasPorBimestre
  };
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

// Função auxiliar ultra-robusta para verificar se um valor de célula é "Sem Nota"
export const checkIsMissing = (raw) => {
  if (raw === undefined || raw === null) return true;
  const str = String(raw).trim();
  if (!str) return true;
  
  // Apenas traços, pontos ou espaços (ex: "-", "–", "—", ".")
  if (/^[-–—_.\s]+$/.test(str)) return true;
  
  // Siglas ou palavras indicativas de ausência de nota
  if (/^(S\/N|S\/D|S\/C|FALTA|AUSENTE|NC|NA|N\/A|N\/C|SEM\s*NOTA|DISP|DISPENSADO)$/i.test(str)) return true;
  
  // Textos que contenham palavras de ausência
  if (/falta|sem\s*nota|ausente|dispensado/i.test(str)) return true;

  const val = parseGrade(raw);
  if (isNaN(val) || val <= 0) return true;
  return false;
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

// Siglas usadas nos cabeçalhos da planilha da Prova Paulista → nome completo.
// A chave é a sigla normalizada (sem acento, maiúscula, sem pontos/espaços).
const DISCIPLINA_SIGLAS = {
  CIE: 'Ciências',
  CIEN: 'Ciências',
  CIENC: 'Ciências',
  GEO: 'Geografia',
  GEOG: 'Geografia',
  HIS: 'História',
  HIST: 'História',
  MAT: 'Matemática',
  MATEM: 'Matemática',
  LP: 'Língua Portuguesa',
  POR: 'Língua Portuguesa',
  PORT: 'Língua Portuguesa',
  LPO: 'Língua Portuguesa',
  ING: 'Língua Inglesa',
  LI: 'Língua Inglesa',
  LIN: 'Língua Inglesa',
  ART: 'Arte',
  ARTE: 'Arte',
  EDF: 'Educação Física',
  EF: 'Educação Física',
  EDFIS: 'Educação Física',
  BIO: 'Biologia',
  BIOL: 'Biologia',
  FIS: 'Física',
  QUI: 'Química',
  QUIM: 'Química',
  FIL: 'Filosofia',
  FILO: 'Filosofia',
  SOC: 'Sociologia',
  SOCIO: 'Sociologia',
  TEC: 'Tecnologia',
  RED: 'Redação',
  PV: 'Projeto de Vida',
};

// Expande apenas siglas (CIE → Ciências). Qualquer outro nome é devolvido intacto.
// Usado na leitura das planilhas para que TODO o sistema receba o nome completo.
export const expandSiglaDisciplina = (nome) => {
  if (nome === null || nome === undefined) return nome;
  const original = String(nome).trim();
  const sigla = original
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s.]+/g, '');
  return DISCIPLINA_SIGLAS[sigla] || original;
};

export const formatDisciplina = (nome) => {
  if (!nome) return '';
  const n = String(nome).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  const sigla = n.replace(/[\s.]+/g, '');
  if (DISCIPLINA_SIGLAS[sigla]) return DISCIPLINA_SIGLAS[sigla];
  
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

export const isNonSubjectHeader = (header) => {
  if (!header) return true;
  const raw = String(header).trim();
  const compact = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\s():%._-]+/g, '')
    .trim();

  return (
    compact === 'F' ||
    compact === 'AC' ||
    compact === 'FTAN' ||
    compact === 'FRE' ||
    compact === 'FREQ' ||
    compact === 'FREAN' ||
    compact === 'FREANPERCENT' ||
    compact === 'FREQUENCIAANUAL' ||
    compact === 'FREQUENCIAAN' ||
    compact === 'FREQUENCIA' ||
    compact.startsWith('FRE') ||
    compact.startsWith('FREQ') ||
    compact.includes('FALTA') ||
    compact.includes('FREQUEN') ||
    compact === 'TF' ||
    compact === 'TOTALTF' ||
    compact === 'TOTALFALTA' ||
    compact === 'TOTALFALTAS' ||
    compact.includes('TOTALFALTA') ||
    compact.includes('TOTALDEFALTA') ||
    compact === 'SITUACAO' ||
    compact === 'CH' ||
    compact === 'RA' ||
    compact === 'ALUNO' ||
    compact === 'NUMERO' ||
    compact === 'N'
  );
};

export const getMapaoStudentCount = (conceitoData = [], showOnlyActive = true, targetTurma = 'Todos') => {
  if (!Array.isArray(conceitoData) || conceitoData.length === 0) return 0;

  const isValidTurma = (t) => {
    if (!t) return false;
    const s = String(t).trim();
    return s !== '' && !s.startsWith('405') && !s.startsWith('406') && s !== 'Sem Turma' && s !== 'Desconhecida';
  };

  const cleanTargetTurma = (targetTurma && targetTurma !== 'Todos') ? formatTurma(targetTurma) : null;

  const studentsMap = new Map();

  conceitoData.forEach(c => {
    const norm = normalizeName(c.normalizedName || c.nomeOriginal);
    if (!norm) return;
    
    const formattedTurma = formatTurma(c.turmaPlanilha);
    // Ignora registros de turmas sabidamente inválidas (ex: turmas de teste 405/406 ou sem turma)
    if (c.turmaPlanilha && !isValidTurma(formattedTurma)) return;

    const bNum = getBimestreNum(c.bimestre);
    const situacao = c.situacao || 'Ativo';

    if (!studentsMap.has(norm)) {
      studentsMap.set(norm, {
        nomeOriginal: c.nomeOriginal || c.normalizedName,
        maxBim: bNum,
        situacao: situacao,
        turma: formattedTurma || '',
      });
    } else {
      const existing = studentsMap.get(norm);
      if (bNum > existing.maxBim) {
        existing.maxBim = bNum;
        existing.situacao = situacao;
        if (formattedTurma) existing.turma = formattedTurma;
      } else if (bNum === existing.maxBim) {
        if (!isStudentActive(existing.situacao) && isStudentActive(situacao)) {
          existing.situacao = situacao;
          if (formattedTurma) existing.turma = formattedTurma;
        } else if (!existing.turma && formattedTurma) {
          existing.turma = formattedTurma;
        }
      }
    }
  });

  let count = 0;
  studentsMap.forEach(info => {
    // Se foi selecionada uma turma específica no seletor, filtra por ela
    if (cleanTargetTurma && info.turma !== cleanTargetTurma) {
      return;
    }

    if (showOnlyActive) {
      if (isStudentActive(info.situacao)) {
        count++;
      }
    } else {
      count++;
    }
  });

  return count;
};

export const getMapaoCoverageDetails = (conceitoData = [], tutoradosCount = 0, showOnlyActive = true, targetTurma = 'Todos', debugContext = {}) => {
  if (!Array.isArray(conceitoData) || conceitoData.length === 0) {
    return null;
  }

  const turmaStr = targetTurma || 'Todos';
  const cleanTargetTurma = (turmaStr && turmaStr !== 'Todos') ? formatTurma(turmaStr) : null;

  const isValidTurma = (t) => {
    if (!t) return false;
    const s = String(t).trim();
    return s !== '' && !s.startsWith('405') && !s.startsWith('406') && s !== 'Sem Turma' && s !== 'Desconhecida';
  };

  const studentsMap = new Map();

  conceitoData.forEach(c => {
    const norm = normalizeName(c.normalizedName || c.nomeOriginal);
    if (!norm) return;
    
    const formattedTurma = formatTurma(c.turmaPlanilha);
    if (c.turmaPlanilha && !isValidTurma(formattedTurma)) return;

    const bNum = getBimestreNum(c.bimestre);
    const situacao = c.situacao || 'Ativo';

    if (!studentsMap.has(norm)) {
      studentsMap.set(norm, {
        nomeOriginal: c.nomeOriginal || c.normalizedName,
        maxBim: bNum,
        situacao: situacao,
        turma: formattedTurma || '',
      });
    } else {
      const existing = studentsMap.get(norm);
      if (bNum > existing.maxBim) {
        existing.maxBim = bNum;
        existing.situacao = situacao;
        if (formattedTurma) existing.turma = formattedTurma;
      } else if (bNum === existing.maxBim) {
        if (!isStudentActive(existing.situacao) && isStudentActive(situacao)) {
          existing.situacao = situacao;
          if (formattedTurma) existing.turma = formattedTurma;
        } else if (!existing.turma && formattedTurma) {
          existing.turma = formattedTurma;
        }
      }
    }
  });

  const mapaoStudentsList = [];
  studentsMap.forEach(info => {
    if (cleanTargetTurma && info.turma !== cleanTargetTurma) return;
    if (showOnlyActive && !isStudentActive(info.situacao)) return;
    mapaoStudentsList.push(info);
  });

  const mapaoCount = mapaoStudentsList.length;
  const dashboardNorms = new Set((debugContext.sortedData || []).map(s => normalizeName(s.normalizedName || s.nome)));
  const missing = mapaoStudentsList.filter(m => !dashboardNorms.has(normalizeName(m.nomeOriginal)));
  const isMatching = debugContext.sortedData ? (missing.length === 0 && mapaoCount === tutoradosCount) : (mapaoCount === tutoradosCount);

  const diagnostico = missing.map(m => {
    const normM = normalizeName(m.nomeOriginal);
    const inAll = (debugContext.allStudents || []).find(s => s.normalizedName === normM || normalizeName(s.nome) === normM);

    if (!inAll) {
      return {
        aluno: m.nomeOriginal,
        turmaMapao: m.turma,
        statusMapao: m.situacao,
        turmaSistema: 'NÃO INCLUÍDO',
        statusSistema: '-',
        causa: 'Não foi inserido no sistema (descartado por turma inválida ou não alocado)',
        tipoCausa: 'nao_incluido'
      };
    }

    const turmaBate = formatTurma(inAll.turma) === (cleanTargetTurma || formatTurma(m.turma));
    const ativoNoSistema = isStudentActive(inAll.situacao);
    let causa = '';
    let tipoCausa = '';

    if (!turmaBate) {
      const origemTurma = (turmaStr !== 'Todos' && turmaStr) ? turmaStr : (m.turma || 'Mapão');
      causa = `Alocado da turma "${origemTurma}" para "${inAll.turma}"`;
      tipoCausa = 'outra_turma';
    } else if (!ativoNoSistema) {
      causa = `Classificado como inativo ("${inAll.situacao}") pelo sistema`;
      tipoCausa = 'inativo';
    } else {
      causa = 'Presente como ativo na turma, mas filtrado do dashboard';
      tipoCausa = 'filtrado';
    }

    return {
      aluno: m.nomeOriginal,
      turmaMapao: m.turma,
      statusMapao: m.situacao,
      turmaSistema: inAll.turma,
      statusSistema: inAll.situacao,
      causa,
      tipoCausa
    };
  });

  return {
    isMatching,
    mapaoCount,
    tutoradosCount,
    showOnlyActive,
    turma: turmaStr,
    diagnostico
  };
};

export const validateMapaoCoverage = (conceitoData = [], tutoradosCount = 0, showOnlyActive = true, targetTurma = 'Todos', debugContext = {}) => {
  const details = getMapaoCoverageDetails(conceitoData, tutoradosCount, showOnlyActive, targetTurma, debugContext);
  if (!details) {
    return { isMatching: false, mapaoCount: 0, tutoradosCount, message: 'Mapão não carregado' };
  }

  if (details.isMatching) {
    console.log(`Ok, Todos os alunos do mapão da turma ${details.turma} estão inclusos`);
  } else {
    console.warn(
      `Atenção (Turma: ${details.turma}): Nem todos os alunos do mapão estão inclusos (Mapão: ${details.mapaoCount} vs Tutorados: ${details.tutoradosCount})`
    );

    if (details.diagnostico && details.diagnostico.length > 0) {
      console.group(`[TutorDash Diagnóstico] Lista dos ${details.diagnostico.length} alunos divergentes da Turma ${details.turma}`);
      console.table(details.diagnostico.map(d => ({
        'Aluno': d.aluno,
        'Turma Mapão': d.turmaMapao,
        'Status Mapão': d.statusMapao,
        'Turma Sistema': d.turmaSistema,
        'Status Sistema': d.statusSistema,
        'Causa': d.causa
      })));
      console.groupEnd();
    }
  }

  return details;
};

