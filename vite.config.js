import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plugin que emula o /api/proxy da Vercel em desenvolvimento local.
// Em produção (Vercel), este plugin é ignorado e a função serverless real toma controlo.
function localProxyPlugin() {
  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        // Headers CORS — enviados sempre, tal como na função Vercel
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const urlParam = new URL(req.url, 'http://localhost').searchParams.get('url');
        if (!urlParam) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        try {
          const targetUrl = decodeURIComponent(urlParam);

          // Usa o fetch global do Node 18+ (disponível no Vite 4+)
          const upstream = await fetch(targetUrl, {
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; TutorDash-Proxy/1.0)',
            },
          });

          if (!upstream.ok) {
            res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `O servidor de destino respondeu com ${upstream.status}` }));
            return;
          }

          const contentType = upstream.headers.get('content-type');
          if (contentType) res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-store');

          const buffer = await upstream.arrayBuffer();
          res.writeHead(200);
          res.end(Buffer.from(buffer));
        } catch (err) {
          console.error('[local-api-proxy] Erro:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erro interno no proxy local', details: err.message }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localProxyPlugin()],
});

