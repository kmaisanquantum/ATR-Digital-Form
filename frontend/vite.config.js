import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['atr.dspng.tech'],
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  preview: {
    port: 3000,
    host: true,
    allowedHosts: ['atr.dspng.tech']
  },
  build: {
    outDir: 'dist'
  }
});
