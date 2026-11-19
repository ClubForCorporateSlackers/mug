import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // amazon-cognito-identity-js が Node の global を参照する
    global: 'globalThis',
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // 手元では /api/* を本番の Worker に転送する（README の「フロント」）。
    // 画面のコードは /api/... の相対パスで呼ぶだけでよい（AGENTS.md の約束2）
    proxy: {
      '/api': {
        target: 'https://mug.st2026ne.workers.dev',
        changeOrigin: true,
        // 証明書は確かめる。社内の通信が独自の証明書を挟んで転送できないときだけ、
        // MUG_PROXY_INSECURE=1 npm run dev で起動すると検証を外す（手元の転送だけ。本番の Worker には関係ない）
        secure: process.env.MUG_PROXY_INSECURE !== '1',
      },
    },
  },
});
