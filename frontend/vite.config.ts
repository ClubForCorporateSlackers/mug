import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 画面の背景（index.css の --background）と同じ色。ホーム画面から開いたときの上の帯と起動画面に使う
const themeColor = '#f5ecc3';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA（ホーム画面に追加・画面ファイルの保存）。詳しくは docs/adr/feature-pwa.md
    VitePWA({
      // 新しい版が出ても勝手に再読み込みしない（書きかけのメモが消えるため）。UpdateNotice で知らせる
      registerType: 'prompt',
      // 登録は main.tsx の useRegisterSW で行う
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'むふ',
        short_name: 'むふ',
        description: '蚊に刺された場所を地図で共有するアプリ',
        lang: 'ja',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: themeColor,
        background_color: themeColor,
        // アイコンは public/icon.svg から `npm run icons` で作る（pwa-assets.config.ts）
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Storybook はプレビュー環境だけに入るので保存しない
        globIgnores: ['storybook/**'],
        // 地図（maplibre-gl）を含むファイルが大きいので、上限を 5MB に上げる
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        // /api は保存しない（古いピンやログインの情報を残さない）。Storybook も画面に置き換えない
        navigateFallbackDenylist: [/^\/api\//, /^\/storybook/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // フォントの指定（CSS）。使いながら新しいものに入れ替える
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            // フォント本体。中身は変わらないので長く持つ
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 地図（スタイル・タイル・文字・アイコン）。一度見た場所は圏外でも出せるようにする
            urlPattern: ({ url }) => url.origin === 'https://tiles.openfreemap.org',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'openfreemap',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
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
        // 証明書は確かめる。プロキシ環境などで証明書のエラーになり転送できないときだけ、
        // MUG_PROXY_INSECURE=1 npm run dev で起動すると検証を外す（手元の転送だけ。本番の Worker には関係ない）
        secure: process.env.MUG_PROXY_INSECURE !== '1',
      },
    },
  },
});
