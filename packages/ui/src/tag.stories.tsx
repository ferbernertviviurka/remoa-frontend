import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './tag';

const meta = { title: 'Torph/Tag', component: Tag } satisfies Meta<typeof Tag>;
export default meta;
type S = StoryObj<typeof meta>;
export const Brand: S = { args: { children: 'Sepse' } };
export const Review: S = { args: { tone: 'review', children: 'Revisitar' } };
export const Watch: S = { args: { tone: 'watch', children: 'Acompanhar' } };
export const Steady: S = { args: { tone: 'steady', children: 'Mais estável' } };
export const Unknown: S = { args: { tone: 'unknown', children: 'Sem revisões' } };
