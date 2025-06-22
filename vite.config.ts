import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import fs from 'fs'
import { cpSync, rmSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Plugin para copiar a pasta `public` para `dist` na produção, mas excluindo a subpasta `uploads`.
    // Isso é mais robusto que usar publicDir, que não suporta exclusões.
    {
      name: 'copy-public-excluding-uploads',
      apply: 'build', // Executar apenas durante o build de produção
      closeBundle() {
        const publicDir = path.resolve(__dirname, 'public');
        const distDir = path.resolve(__dirname, 'dist');
        const uploadsInPublic = path.join(publicDir, 'uploads');
        const uploadsInDist = path.join(distDir, 'uploads');

        // 1. Temporariamente move a pasta uploads para fora
        if (fs.existsSync(uploadsInPublic)) {
          fs.renameSync(uploadsInPublic, path.join(__dirname, 'temp_uploads'));
        }

        // 2. Copia o restante da pasta public
        fs.cpSync(publicDir, distDir, { recursive: true });

        // 3. Remove a pasta uploads que pode ter sido copiada para dist (se vazia)
        if (fs.existsSync(uploadsInDist)) {
          fs.rmSync(uploadsInDist, { recursive: true, force: true });
        }

        // 4. Move a pasta uploads de volta para o lugar original
        if (fs.existsSync(path.join(__dirname, 'temp_uploads'))) {
          fs.renameSync(path.join(__dirname, 'temp_uploads'), uploadsInPublic);
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'next-safe-action/react': path.resolve(__dirname, 'node_modules/next-safe-action/dist/hooks.mjs'),
    },
  },
  publicDir: 'public', // Usar a pasta public padrão do Vite para desenvolvimento
  build: {
    rollupOptions: {
      output: {
        // Otimização de chunks
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
  },
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('PROXY ERROR: ', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('PROXY REQ:', new Date().toLocaleTimeString(), req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('PROXY RES:', new Date().toLocaleTimeString(), proxyRes.statusCode, req.url);
          });
        }
      },
      '/uploads': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  ssr: {
    noExternal: ['path', 'fs', 'node:path', 'node:fs']
  }
})
