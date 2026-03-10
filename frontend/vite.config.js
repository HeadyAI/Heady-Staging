import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3301',
      '/health': 'http://localhost:3301',
      '/mcp': 'http://localhost:3301',
      '/metrics': 'http://localhost:3301',
    },
  },
  build: {
    outDir: 'dist',
  },
  define: {
    // In production, VITE_API_BASE should be set to the manager URL
    // e.g. VITE_API_BASE=https://manager.headysystems.com
    // In dev, the proxy handles it (empty string = same origin)
  },
});
