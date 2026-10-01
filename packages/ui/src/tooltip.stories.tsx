import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Tooltip } from './tooltip';

const meta = { title: 'Tooltip', component: Tooltip } satisfies Meta<typeof Tooltip>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {
  args: { label: 'Revisar este card', children: <Button>Revisar</Button> },
};
