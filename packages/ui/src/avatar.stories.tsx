import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './avatar';

const meta = { title: 'Avatar', component: Avatar } satisfies Meta<typeof Avatar>;
export default meta;
type S = StoryObj<typeof meta>;
export const Fallback: S = { args: { name: 'Ana Lima', fallback: 'AL' } };
/** Com foto: o anel gira até a imagem carregar (rede lenta no DevTools para ver). */
export const WithPhoto: S = { args: { name: 'Ana Lima', fallback: 'AL', src: 'https://picsum.photos/seed/remoa/96' } };
