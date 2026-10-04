import type { Meta, StoryObj } from '@storybook/react';
import { Logo } from './logo';

const meta = { title: 'Logo', component: Logo } satisfies Meta<typeof Logo>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { title: 'remoa', size: 64 } };
export const Horizontal: S = { args: { withWordmark: true, size: 48 } };
export const OnDark: S = {
  args: { withWordmark: true, onDark: true, size: 48 },
  decorators: [(Story) => <div style={{ background: '#241A5C', padding: 24 }}><Story /></div>],
};
