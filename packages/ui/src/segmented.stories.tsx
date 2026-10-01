import type { Meta, StoryObj } from '@storybook/react';
import { Segmented } from './segmented';

const meta = { title: 'Segmented', component: Segmented } satisfies Meta<typeof Segmented>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { 'aria-label': 'Modo', defaultValue: 'a', options: [{ value: 'a', label: 'Card oculto' }, { value: 'b', label: 'Conexão' }] } };
