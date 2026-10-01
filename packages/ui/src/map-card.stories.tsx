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
export const ConceptSummary: S = {
  args: { ...base, summary: 'Disfunção orgânica com risco de vida causada por resposta desregulada do hospedeiro à infecção.' },
};
export const Flow: S = { args: { ...base, label: 'Fluxograma: Pacote', typeLabel: 'Fluxograma', title: 'Pacote da primeira hora', meta: '5 passos' } };
export const Case: S = { args: { ...base, label: 'Caso: Idoso febril', typeLabel: 'Caso', title: 'Idoso febril e confuso', chips: ['Apresentação', 'Exames', 'Conduta'] } };
export const ImageLoading: S = { args: { ...base, label: 'Imagem: Coração', typeLabel: 'Imagem', title: 'Coração', meta: '3 máscaras', thumbnail: { src: null, alt: 'Imagem do card Coração' } } };
