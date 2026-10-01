import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from './icon-button';

const meta = { title: 'Torph/IconButton', component: IconButton } satisfies Meta<typeof IconButton>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { 'aria-label': 'Adicionar', children: '+' } };
export const Primary: S = { args: { 'aria-label': 'Adicionar', variant: 'primary', children: '+' } };
