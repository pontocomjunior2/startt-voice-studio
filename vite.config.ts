import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import * as fs from 'fs';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // Expor a variável de ambiente para o código do cliente
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL)
    },
    plugins: [
      react(),
      // Plugin para copiar a pasta `public` para `dist`, mas excluindo a subpasta `uploads`.
      {
        name: 'copy-public-excluding-uploads',
        apply: 'build',
        closeBundle() {
          const publicDir = path.resolve(__dirname, 'public');
          const distDir = path.resolve(__dirname, 'dist');
          
          // Copia todos os arquivos e subdiretórios, exceto 'uploads'
          fs.readdirSync(publicDir).forEach(file => {
            const srcPath = path.join(publicDir, file);
            const destPath = path.join(distDir, file);

            if (file !== 'uploads') {
              fs.cpSync(srcPath, destPath, { recursive: true });
            }
          });
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
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('PROXY ERROR: ', err);
            });
            proxy.on('proxyReq', (_proxyReq, req, _res) => {
              console.log('PROXY REQ:', new Date().toLocaleTimeString(), req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
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
  }
})
