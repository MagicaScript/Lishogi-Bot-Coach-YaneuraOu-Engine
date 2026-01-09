
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In-memory store for the latest game data received from Lishogi
let sharedGameData: any = null;

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp',
          // Allow eval (required for WASM/Emscripten), inline styles, and specific external domains.
          // Note: https://esm.sh and https://generativelanguage.googleapis.com are trusted sources.
          'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://esm.sh https://cdnjs.cloudflare.com https://generativelanguage.googleapis.com;"
        },
        // Custom Middleware to act as a Bridge between Lishogi (Browser Console) and Local App
        configureServer: (server) => {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/bridge') {
              // Handle CORS Manually for this endpoint
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              // Allow Private Network Access for Chrome (Lishogi HTTPS -> Localhost HTTP)
              res.setHeader('Access-Control-Allow-Private-Network', 'true');

              if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                  try {
                    sharedGameData = JSON.parse(body);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ status: 'received' }));
                  } catch (e) {
                    res.statusCode = 400;
                    res.end('Invalid JSON');
                  }
                });
                return;
              }

              if (req.method === 'GET') {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(sharedGameData));
                return;
              }
            }
            next();
          });
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
