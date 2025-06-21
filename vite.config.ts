import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import fs from 'fs'

// Plugin personalizado para copiar apenas arquivos específicos da public
const selectivePublicCopy = (): Plugin => ({
  name: 'selective-public-copy',
  closeBundle() {
    // Lista de arquivos a copiar da public (excluindo uploads)
    const filesToCopy = [
      'favicon.svg',
      'vite.svg',
      'logo-pontocom.png',
      'LOGO_PONTOCOM_240X96 (BRANCA).png',
      'startt-logo.png', 
      'startt-logo-transp.png',
      'whatsapp.png'
    ];
    
    filesToCopy.forEach(file => {
      const src = path.join(__dirname, 'public', file);
      const dest = path.join(__dirname, 'dist', file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), selectivePublicCopy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'next-safe-action/react': path.resolve(__dirname, 'node_modules/next-safe-action/dist/hooks.mjs'),
    },
  },
  publicDir: false, // Desabilitar cópia automática da pasta public
  build: {
    rollupOptions: {
      output: {
        // Otimização de chunks
        manualChunks(id) {
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
      '/api': 'http://127.0.0.1:3001'
    }
  },
  ssr: {
    noExternal: ['path', 'fs', 'node:path', 'node:fs']
  }
})
