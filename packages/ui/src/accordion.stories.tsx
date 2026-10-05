import type { Meta, StoryObj } from '@storybook/react';
import { Accordion } from './accordion';

const meta = { title: 'Accordion', component: Accordion } satisfies Meta<typeof Accordion>;
export default meta;
type S = StoryObj<typeof meta>;
export const WithCallback: S = { args: { items: [{ value: 'a', title: 'Abrir', content: 'Corpo' }], onValueChange: () => {} } };
export const Default: S = {
  args: {
    items: [
      { value: 'a', title: 'O que é um mapa?', content: 'Um conjunto de cards ligados por conexões.' },
      { value: 'b', title: 'Quando revisar?', content: 'Na hora em que a lembrança estimada cair.' },
    ],
  },
};
