import { useEffect, type ReactNode } from 'react';
import type { Preview } from '@storybook/react';
import './storybook.css';

function ThemeFrame({ theme, children }: { theme: string; children: ReactNode }) {
  const value = theme === 'dark' ? 'dark' : 'light';
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = value;
  useEffect(() => {
    document.documentElement.dataset.theme = value;
  }, [value]);
  return <div className="min-h-[280px] bg-canvas p-8 font-sans text-text">{children}</div>;
}

const preview: Preview = {
  initialGlobals: { theme: 'light' },
  globalTypes: {
    theme: {
      description: 'Tema do canvas',
      toolbar: {
        title: 'Tema',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Claro' },
          { value: 'dark', title: 'Escuro' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => (
      <ThemeFrame theme={String(context.globals.theme ?? 'light')}>
        <Story />
      </ThemeFrame>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
};

export default preview;
