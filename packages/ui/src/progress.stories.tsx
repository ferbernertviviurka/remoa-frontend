import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';

const meta = { title: 'Progress', component: Progress } satisfies Meta<typeof Progress>;
export default meta;
type S = StoryObj<typeof meta>;
export const Empty: S = { args: { 'aria-label': 'Progresso', value: 0 } };
export const Half: S = { args: { 'aria-label': 'Progresso', value: 50 } };
export const Full: S = { args: { 'aria-label': 'Progresso', value: 100 } };
