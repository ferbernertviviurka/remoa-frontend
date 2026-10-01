import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './spinner';

const meta = { title: 'Spinner', component: Spinner } satisfies Meta<typeof Spinner>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Carregando' } };
