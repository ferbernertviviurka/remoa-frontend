import type { Meta, StoryObj } from '@storybook/react';
import { Stat } from './stat';

const meta = { title: 'Stat', component: Stat } satisfies Meta<typeof Stat>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Revisar hoje', value: '12', hint: '3 atrasados' } };
