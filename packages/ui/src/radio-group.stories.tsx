import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup } from './radio-group';

const meta = { title: 'RadioGroup', component: RadioGroup } satisfies Meta<typeof RadioGroup>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: {
    label: 'Modo',
    defaultValue: 'card',
    options: [
      { value: 'card', label: 'Card oculto' },
      { value: 'edge', label: 'Conexão' },
    ],
  },
};
