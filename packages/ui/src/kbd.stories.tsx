import type { Meta, StoryObj } from '@storybook/react';
import { Kbd } from './kbd';

const meta = { title: 'Kbd', component: Kbd } satisfies Meta<typeof Kbd>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { children: '⌘K' } };
