import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';

const meta = { title: 'Checkbox', component: Checkbox } satisfies Meta<typeof Checkbox>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = { args: { label: 'Aceito os termos' } };
export const WithLinks: S = { args: { label: <>Aceito os <a href="/termos" target="_blank" rel="noopener noreferrer">Termos</a></> } };
