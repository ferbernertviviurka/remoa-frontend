import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from './breadcrumb';

const meta = { title: 'Breadcrumb', component: Breadcrumb } satisfies Meta<typeof Breadcrumb>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Você está em', items: [{ label: 'Meus mapas' }, { label: 'Sepse' }, { label: 'Choque' }] } };
