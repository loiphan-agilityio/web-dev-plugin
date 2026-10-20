import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  framework: '@storybook/react-vite',
  // Serves public/mockServiceWorker.js, which the MSW worker in preview.tsx registers.
  staticDirs: ['../public'],
};

export default config;
