import type { Meta, StoryObj } from '@storybook/react';
import { Menu } from './menu';

const meta = { title: 'Menu', component: Menu } satisfies Meta<typeof Menu>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: {
    label: 'Ações',
    items: [
      { label: 'Duplicar' },
      { label: 'Excluir', tone: 'danger' },
    ],
  },
};
