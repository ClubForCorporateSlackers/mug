import type { Preview } from '@storybook/react-vite';
// 画面と同じ Tailwind CSS と shadcn/ui の色を読み込む
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
