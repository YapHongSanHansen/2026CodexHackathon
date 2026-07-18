import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Client dev server proxies /api and /g to the backend (port 8787), and aliases @shared
// to the shared/ contract folder so client + server share one set of types.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, '../shared') },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
      '/g': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
});
