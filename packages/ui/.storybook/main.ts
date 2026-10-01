import tailwind from '@tailwindcss/postcss';
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (cfg) => {
    cfg.css = { ...cfg.css, postcss: { plugins: [tailwind()] } };
    return cfg;
  },
};
export default config;
