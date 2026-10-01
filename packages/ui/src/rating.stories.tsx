import type { Meta, StoryObj } from '@storybook/react';
import { Rating } from './rating';

const meta = { title: 'Rating', component: Rating } satisfies Meta<typeof Rating>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: {
    labels: { again: 'Não lembrei', hard: 'Difícil', good: 'Bom', easy: 'Fácil' },
    value: 'good',
  },
};
