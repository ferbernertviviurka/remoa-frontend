import type { Meta, StoryObj } from '@storybook/react';
import { Eyebrow } from './eyebrow';

const meta = { title: 'Torph/Eyebrow', component: Eyebrow } satisfies Meta<typeof Eyebrow>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { children: 'Revisar hoje' } };
