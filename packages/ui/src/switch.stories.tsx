import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';

const meta = { title: 'Torph/Switch', component: Switch } satisfies Meta<typeof Switch>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Lembrança estimada' } };
