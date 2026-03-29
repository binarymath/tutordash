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
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
    return res;
  } catch (err) {
    console.warn('Fetch direto falhou, tentando proxy...', err);
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const resProxy = await fetch(proxyUrl);
      if (!resProxy.ok) throw new Error(`Erro no Proxy ${resProxy.status}`);
      return resProxy;
    } catch {
      throw new Error("O Google bloqueou o acesso. Verifique as permissões de partilha do link.");
    }
  }
};
