import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function groqDevApi(): Plugin {
  return {
    name: 'groq-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/groq', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        for await (const chunk of req as AsyncIterable<Buffer>) {
          body += chunk.toString();
        }
        res.setHeader('Content-Type', 'application/json');
        try {
          const { runGroq } = await import('./api/_handler');
          const parsed = JSON.parse(body || '{}');
          const result = await runGroq(parsed);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (e: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e?.message ?? String(e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), groqDevApi()],
  server: { port: 5173 },
});
