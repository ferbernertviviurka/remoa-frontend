import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';

const meta = { title: 'Checkbox', component: Checkbox } satisfies Meta<typeof Checkbox>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Aceito os termos' } };
