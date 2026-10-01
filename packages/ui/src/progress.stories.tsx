import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';

const meta = { title: 'Torph/Progress', component: Progress } satisfies Meta<typeof Progress>;
export default meta;
type S = StoryObj<typeof meta>;
export const Half: S = { args: { 'aria-label': 'Progresso', value: 50 } };
