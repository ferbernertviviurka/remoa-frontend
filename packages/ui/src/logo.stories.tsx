import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './logo';

const meta = { title: 'Torph/Logo', component: Logo } satisfies Meta<typeof Logo>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { title: 'remoa', size: 64 } };
