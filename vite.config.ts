import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'next-safe-action/react': path.resolve(__dirname, 'node_modules/next-safe-action/dist/hooks.mjs'),
    },
  },
  ssr: {
    noExternal: ['path', 'fs', 'node:path', 'node:fs']
  }
})
