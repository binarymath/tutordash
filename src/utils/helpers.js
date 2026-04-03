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
  // Adiciona anti-cache localmente para evitar cache de navegador/proxy
  let fetchUrl = url;
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.append('_t', Date.now().toString());
    fetchUrl = urlObj.toString();
  } catch {
    // se não for uma URL válida, ignora
  }

  try {
    const res = await fetch(fetchUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
    return res;
  } catch (err) {
    console.warn('Fetch direto falhou, tentando proxies...', err);
    
    // Tenta primeiro o Vercel Serverless Proxy oficial (imune a CORS e bloqueios de IP compartilhados)
    try {
      const vercelProxy = `/api/proxy?url=${encodeURIComponent(fetchUrl)}`;
      const resVercel = await fetch(vercelProxy, { cache: 'no-store' });
      // Ignoramos erro 404 porque no 'npm run dev' local o /api/proxy não existe na rota sem config adicional
      if (resVercel.ok) return resVercel;
      if (resVercel.status !== 404) throw new Error(`Vercel Proxy falhou: ${resVercel.status}`);
    } catch {
      // Falhou silenciosamente, passa para o próximo
    }

    // Tenta o corsproxy.io que suporta bem arquivos binários (XLSX)
    try {
      const proxy1 = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
      const resProxy1 = await fetch(proxy1, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!resProxy1.ok) throw new Error(`Erro no Proxy 1: ${resProxy1.status}`);
      return resProxy1;
    } catch {
      // Se falhar, tenta o allorigins como alternativa
      try {
        const proxy2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}&disableCache=true`;
        const resProxy2 = await fetch(proxy2, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (!resProxy2.ok) throw new Error(`Erro no Proxy 2: ${resProxy2.status}`);
        return resProxy2;
      } catch {
        throw new Error("O Google bloqueou o acesso. Verifique as permissões de partilha do link.");
      }
    }
  }
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
