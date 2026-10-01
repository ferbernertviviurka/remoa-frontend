import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta = { title: 'Input', component: Input } satisfies Meta<typeof Input>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Nome', placeholder: 'Ana' } };
