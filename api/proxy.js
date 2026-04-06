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
    const response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        // Evita que o Google bloqueie por falta de User-Agent
        'User-Agent': 'Mozilla/5.0 (compatible; TutorDash-Proxy/1.0)',
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `O servidor de destino respondeu com ${response.status}` });
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Cache moderado: 60 s na CDN, revalidação silenciosa até 5 min
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

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
