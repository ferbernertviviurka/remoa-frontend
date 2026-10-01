import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from './separator';

const meta = { title: 'Separator', component: Separator } satisfies Meta<typeof Separator>;
export default meta;
type S = StoryObj<typeof meta>;
export const Horizontal: S = { render: () => <div className="w-64"><Separator /></div> };
