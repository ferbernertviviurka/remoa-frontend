import type { Meta, StoryObj } from '@storybook/react';
import { MapCard } from './map-card';

const meta = { title: 'Torph/MapCard', component: MapCard } satisfies Meta<typeof MapCard>;
export default meta;
type S = StoryObj<typeof meta>;
const base = { label: 'Conceito: Sepse', typeLabel: 'Conceito', title: 'Sepse', openLabel: 'Abrir', openAriaLabel: 'Abrir Sepse' };
export const Default: S = { args: base };
export const Review: S = { args: { ...base, state: 'review', stateLabel: 'Revisitar' } };
export const Watch: S = { args: { ...base, state: 'watch', stateLabel: 'Acompanhar' } };
export const Steady: S = { args: { ...base, state: 'steady', stateLabel: 'Mais estável' } };
export const Unknown: S = { args: { ...base, state: 'unknown', stateLabel: 'Sem revisões' } };
export const Selected: S = { args: { ...base, selected: true } };
