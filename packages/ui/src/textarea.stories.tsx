import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';

const meta = { title: 'Textarea', component: Textarea } satisfies Meta<typeof Textarea>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Notas' } };
