import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta = { title: 'Torph/Button', component: Button } satisfies Meta<typeof Button>;
export default meta;
type S = StoryObj<typeof meta>;
export const Primary: S = { args: { children: 'Revisar hoje' } };
export const Secondary: S = { args: { variant: 'secondary', children: 'Cancelar' } };
export const Quiet: S = { args: { variant: 'quiet', children: 'Ver mais' } };
export const Danger: S = { args: { variant: 'danger', children: 'Excluir' } };
export const Touch: S = { args: { size: 'touch', children: 'Responder' } };
