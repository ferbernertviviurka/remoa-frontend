import type { Meta, StoryObj } from '@storybook/react';
import { IconButton } from './icon-button';

const meta = { title: 'IconButton', component: IconButton } satisfies Meta<typeof IconButton>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { 'aria-label': 'Adicionar', children: '+' } };
export const Primary: S = { args: { 'aria-label': 'Adicionar', variant: 'primary', children: '+' } };
export const Secondary: S = { args: { 'aria-label': 'Adicionar', variant: 'secondary', children: '+' } };
export const Danger: S = { args: { 'aria-label': 'Excluir', variant: 'danger', children: '×' } };
export const Touch: S = { args: { 'aria-label': 'Adicionar', size: 'touch', children: '+' } };
