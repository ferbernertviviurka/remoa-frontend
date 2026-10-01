import type { Meta, StoryObj } from '@storybook/react';
import { Pill } from './pill';

const meta = { title: 'Pill', component: Pill } satisfies Meta<typeof Pill>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { children: 'Clínica Médica' } };
export const Review: S = { args: { tone: 'review', children: 'Revisitar' } };
export const Watch: S = { args: { tone: 'watch', children: 'Acompanhar' } };
export const Steady: S = { args: { tone: 'steady', children: 'Mais estável' } };
export const Unknown: S = { args: { tone: 'unknown', children: 'Sem revisões' } };
