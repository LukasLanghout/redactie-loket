import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { config as loadEnv } from 'dotenv';

loadEnv();

function geminiDevApi(): Plugin {
  return {
    name: 'gemini-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405; res.end('Method Not Allowed'); return;
        }
        let body = '';
        for await (const chunk of req as AsyncIterable<Buffer>) body += chunk.toString();
        res.setHeader('Content-Type', 'application/json');
        try {
          // Dynamically import handler (avoids ESM issues in dev)
          const { default: handler } = await import('./api/gemini');
          // Fake VercelRequest/Response
          const fakeReq = { method: 'POST', body: JSON.parse(body || '{}') } as any;
          let statusCode = 200;
          let responseBody = '';
          const fakeRes = {
            status(code: number) { statusCode = code; return fakeRes; },
            json(data: unknown) { responseBody = JSON.stringify(data); }
          } as any;
          await handler(fakeReq, fakeRes);
          res.statusCode = statusCode;
          res.end(responseBody);
        } catch (e: any) {
          console.error('[api/gemini] error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e?.message ?? String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), geminiDevApi()],
  server: { port: 5173 },
});
