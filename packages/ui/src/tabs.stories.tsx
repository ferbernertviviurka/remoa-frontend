import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './tabs';

const meta = { title: 'Tabs', component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: {
    label: 'Seções',
    tabs: [
      { value: 'mapa', label: 'Mapa', content: 'Cards e conexões deste mapa.' },
      { value: 'revisao', label: 'Revisão', content: 'O que vence hoje.' },
    ],
  },
};
