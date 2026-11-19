import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: '@storybook/react-vite',
  // vite.config.ts の PWA（Service Worker・マニフェスト）は Storybook では使わない
  viteFinal(config) {
    config.plugins = config.plugins?.flat().filter((plugin) => {
      const name = plugin && typeof plugin === 'object' && 'name' in plugin ? plugin.name : '';
      return !name.startsWith('vite-plugin-pwa');
    });
    return config;
  },
};
export default config;
