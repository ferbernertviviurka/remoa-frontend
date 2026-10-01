import type { Meta, StoryObj } from '@storybook/react';
import { Pill } from './pill';

const meta = { title: 'Torph/Pill', component: Pill } satisfies Meta<typeof Pill>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { children: 'Clínica Médica' } };
export const Steady: S = { args: { tone: 'steady', children: 'Mais estável' } };
