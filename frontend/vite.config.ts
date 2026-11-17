import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // 手元では /api/* を本番の Worker に転送する（README の「フロント」）。
    // 画面のコードは /api/... の相対パスで呼ぶだけでよい（AGENTS.md の約束2）
    proxy: {
      '/api': { target: 'https://mug.st2026ne.workers.dev', changeOrigin: true },
    },
  },
});
