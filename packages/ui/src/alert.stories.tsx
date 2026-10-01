import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './alert';

const meta = { title: 'Alert', component: Alert } satisfies Meta<typeof Alert>;
export default meta;
type S = StoryObj<typeof meta>;
export const Brand: S = { args: { title: 'Mapa salvo', children: 'As conexões foram atualizadas.' } };
export const Review: S = { args: { tone: 'review', title: 'Revisitar', children: 'Este card está vencido.' } };
