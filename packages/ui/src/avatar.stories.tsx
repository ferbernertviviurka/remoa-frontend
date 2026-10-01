import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './avatar';

const meta = { title: 'Torph/Avatar', component: Avatar } satisfies Meta<typeof Avatar>;
export default meta;
type S = StoryObj<typeof meta>;
export const Fallback: S = { args: { name: 'Ana Lima', fallback: 'AL' } };
