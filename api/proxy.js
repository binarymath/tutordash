/* eslint-env node */
export default async function handler(req, res) {
  // ── CORS headers — sempre enviados, inclusive no preflight OPTIONS ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');

  // Responde ao preflight do browser e encerra
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const targetUrl = decodeURIComponent(url);

    // redirect:'follow' é obrigatório — o Google Sheets redireciona antes de servir o CSV
    // credentials:'omit' garante que cookies/sessão do utilizador NÃO são enviados ao Google
    const response = await fetch(targetUrl, {
      redirect: 'follow',
      credentials: 'omit',
      headers: {
        'User-Agent': 'TutorDash-Bot/1.0',
        'Accept': 'text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    // Bloco de verificação: respostas de redirecionamento ou acesso negado
    if (response.status === 302 || response.status === 401 || response.status === 403) {
      return res
        .status(403)
        .json({ error: 'Acesso Negado. Verifique se a planilha está partilhada com o link público.' });
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `O servidor de destino respondeu com ${response.status}` });
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Sem cache — evita guardar erros de permissão
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error('[TutorDash Proxy] Erro:', error);
    return res.status(500).json({
      error: 'Erro interno no proxy',
      details: error.message,
    });
  }
}
