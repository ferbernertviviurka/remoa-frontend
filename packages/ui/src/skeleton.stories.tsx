import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './skeleton';

const meta = { title: 'Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { lines: 3 }, render: (args) => <div className="max-w-sm"><Skeleton {...args} /></div> };
