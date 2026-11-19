import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// ホーム画面などのアイコン（PNG）を public/icon.svg から作る設定。
// アイコンを変えたら `npm run icons` を実行し、できた PNG をコミットする（ビルドのたびには作らない）
const background = '#f9de86'; // favicon.svg の背景と同じ黄色

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Android は丸や角丸に切り抜くので、欠けないように余白を多めにする
    maskable: { ...minimal2023Preset.maskable, padding: 0.3, resizeOptions: { background } },
    // iPhone は透明な部分を黒く塗るので、背景を付ける
    apple: { ...minimal2023Preset.apple, padding: 0.2, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
});
