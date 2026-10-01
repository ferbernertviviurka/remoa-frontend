import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './select';

const meta = { title: 'Select', component: Select } satisfies Meta<typeof Select>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: {
    label: 'Especialidade',
    placeholder: 'Escolha',
    options: [
      { value: 'cm', label: 'Clínica Médica' },
      { value: 'cx', label: 'Cirurgia' },
    ],
  },
};
