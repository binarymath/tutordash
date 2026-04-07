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
